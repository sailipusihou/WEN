// VPS SSH 操作工具：执行命令 / 上传文件
//
// 认证方式二选一（**优先用密钥**）：
//   密钥：设置 SSH_KEY=私钥路径
//   密码：设置 SSH_PASS=密码
//
// 用法：
//   SSH_KEY=... node scripts/deploy/ssh-run.cjs run "命令"
//   SSH_KEY=... node scripts/deploy/ssh-run.cjs upload <本地路径> <远程路径>
//   SSH_KEY=... node scripts/deploy/ssh-run.cjs uploaddir <本地目录> <远程目录>
//
// ⚠️ 为什么推荐密钥：这台机器长期被人爆破密码。密码认证会让 sshd 处理大量
//    失败的认证请求；密钥认证失败得早、开销小，也更不容易被挤掉。
//
// ⚠️ 为什么带重试：这台机器的 sshd 未认证并发连接（MaxStartups）会被爆破流量
//    打满，表现为「TCP 连得上、banner 收得到、握手却卡死」；大文件上传也会被
//    **静默截断**（实测 13MB 只传到 4%，脚本却可能报成功）。
//    所以：连接失败自动重试；上传后**比对远端大小**，不一致就换新连接重传。
//
//    可用环境变量调整：SSH_RETRIES（默认 5）、SSH_RETRY_DELAY_MS（默认 5000）。
//
//    注意 `run` 只重试**建连**，不重试命令本身 —— 命令可能已经部分执行，
//    盲目重跑不安全（比如 git 操作）。上半部分失败请看输出自行判断。
const { Client } = require('ssh2')
const fs = require('fs')
const path = require('path')

const HOST = process.env.SSH_HOST || '43.110.46.49'
const PORT = Number(process.env.SSH_PORT || 22)
const USER = process.env.SSH_USER || 'root'
const PASS = process.env.SSH_PASS
/** 私钥路径。设了就优先用密钥认证，否则回退到密码。 */
const KEY = process.env.SSH_KEY

if (!PASS && !KEY) {
  console.error('❌ 请设置 SSH_KEY（私钥路径）或 SSH_PASS（密码）')
  process.exit(1)
}

const AUTH = KEY ? { privateKey: fs.readFileSync(KEY) } : { password: PASS }

const RETRIES = Number(process.env.SSH_RETRIES || 5)
const RETRY_DELAY_MS = Number(process.env.SSH_RETRY_DELAY_MS || 5000)
/** 单次建连超时。取 25s：够用，又不至于让多轮重试整体太慢（原来是 120s） */
const READY_TIMEOUT = Number(process.env.SSH_READY_TIMEOUT || 25000)

/** 值得重试的错误特征。认证失败**不在**其中 —— 重试多少次都没用 */
const RETRYABLE = /ECONNRESET|ECONNREFUSED|EPIPE|ETIMEDOUT|EAI_AGAIN|Socket error|Timed out while waiting|Handshake|keepalive|Cannot connect|大小不一致/i

const mode = process.argv[2]
const arg1 = process.argv[3]
const arg2 = process.argv[4]

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function connectOnce() {
  return new Promise((resolve, reject) => {
    const conn = new Client()
    conn.on('ready', () => resolve(conn))
    conn.on('error', reject)
    conn.connect({
      host: HOST, port: PORT, username: USER, ...AUTH,
      readyTimeout: READY_TIMEOUT,
      keepaliveInterval: 20000,
    })
  })
}

/** 重试执行 fn —— 只在「值得重试」的错误上重试 */
async function attempt(label, fn) {
  let lastErr
  for (let i = 1; i <= RETRIES; i++) {
    try {
      return await fn()
    } catch (e) {
      lastErr = e
      const msg = `${e.level || ''} ${e.message}`.trim()
      if (!RETRYABLE.test(msg)) throw e
      if (i < RETRIES) {
        console.error(`  [${label} 第 ${i}/${RETRIES} 次失败] ${msg} —— ${RETRY_DELAY_MS / 1000}s 后重试`)
        await sleep(RETRY_DELAY_MS)
      }
    }
  }
  throw lastErr
}

const connect = () => attempt('连接', connectOnce)

function exec(conn, command, { stream = false } = {}) {
  return new Promise((resolve, reject) => {
    conn.exec(command, (err, ch) => {
      if (err) return reject(err)
      let stdout = ''
      let stderr = ''
      const decoder = new TextDecoder('utf-8')
      ch.on('data', (d) => {
        const text = decoder.decode(d, { stream: true })
        stdout += text
        if (stream) process.stdout.write(text)
      })
      ch.stderr.on('data', (d) => {
        const text = decoder.decode(d, { stream: true })
        stderr += text
        if (stream) process.stderr.write(text)
      })
      ch.on('close', (code) => resolve({ code, stdout, stderr }))
    })
  })
}

function getSftp(conn) {
  return new Promise((res, rej) => conn.sftp((e, s) => (e ? rej(e) : res(s))))
}

function remoteSize(sftp, remote) {
  return new Promise((res, rej) => sftp.stat(remote, (e, st) => (e ? rej(e) : res(st.size))))
}

/**
 * 上传单个文件，并**校验远端大小**。
 * 不一致就抛错 —— 交给外层换一条新连接重传（截断通常意味着这条连接已经坏了）。
 */
async function uploadFile(sftp, local, remote, showProgress = false) {
  const total = fs.statSync(local).size
  let lastPct = -1
  await new Promise((resolve, reject) => {
    const opts = showProgress
      ? {
          step: (transferred) => {
            const pct = Math.floor((transferred / total) * 100)
            if (pct >= lastPct + 5) {
              lastPct = pct
              process.stdout.write(`\r  上传进度: ${pct}% (${(transferred / 1024 / 1024).toFixed(1)}/${(total / 1024 / 1024).toFixed(1)} MB)`)
            }
          },
        }
      : {}
    sftp.fastPut(local, remote, opts, (err) => (err ? reject(err) : resolve()))
  })
  if (showProgress) process.stdout.write('\r  上传进度: 100%                          \n')

  const got = await remoteSize(sftp, remote)
  if (got !== total) throw new Error(`大小不一致（本地 ${total} vs 远端 ${got}）`)
}

async function ensureRemoteDir(sftp, dir) {
  // 递归创建远程目录
  const parts = dir.split('/').filter(Boolean)
  let cur = ''
  for (const p of parts) {
    cur += '/' + p
    try {
      await new Promise((res, rej) => sftp.mkdir(cur, (e) => (e && e.code !== 4 ? rej(e) : res())))
    } catch {}
  }
}

async function walkDir(dir, base = dir) {
  const out = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    const rel = path.relative(base, full).split(path.sep).join('/')
    if (entry.isDirectory()) {
      out.push({ type: 'dir', remote: rel })
      out.push(...(await walkDir(full, base)))
    } else {
      out.push({ type: 'file', local: full, remote: rel, size: fs.statSync(full).size })
    }
  }
  return out
}

async function doRun() {
  const conn = await connect()
  try {
    const r = await exec(conn, arg1, { stream: true })
    process.exitCode = r.code
  } finally {
    conn.end()
  }
}

async function doUpload() {
  // 每次尝试都用**全新连接**：截断/握手失败往往说明这条连接已经不可用
  const conn = await connectOnce()
  try {
    const sftp = await getSftp(conn)
    await ensureRemoteDir(sftp, path.posix.dirname(arg2))
    console.log('开始上传（大文件请耐心等待）...')
    await uploadFile(sftp, arg1, arg2, true)
    console.log('✅ 已上传:', arg1, '->', arg2)
  } finally {
    conn.end()
  }
}

async function doUploadDir() {
  const conn = await connectOnce()
  try {
    const sftp = await getSftp(conn)
    const items = await walkDir(arg1)
    const files = items.filter((i) => i.type === 'file')
    const totalBytes = files.reduce((s, f) => s + f.size, 0)
    console.log(`准备上传 ${files.length} 个文件（${(totalBytes / 1024 / 1024).toFixed(1)} MB）...`)
    await ensureRemoteDir(sftp, arg2)
    let done = 0
    let bytes = 0
    for (const item of items) {
      if (item.type === 'dir') {
        await ensureRemoteDir(sftp, path.posix.join(arg2, item.remote))
      } else {
        await uploadFile(sftp, item.local, path.posix.join(arg2, item.remote))
        done++
        bytes += item.size
        if (done % 20 === 0 || done === files.length) {
          console.log(`  进度: ${done}/${files.length} 文件，${(bytes / 1024 / 1024).toFixed(1)}/${(totalBytes / 1024 / 1024).toFixed(1)} MB`)
        }
      }
    }
    console.log('✅ 目录上传完成')
  } finally {
    conn.end()
  }
}

async function main() {
  if (mode === 'run') return doRun()
  if (mode === 'upload') return attempt('上传', doUpload)
  if (mode === 'uploaddir') return attempt('目录上传', doUploadDir)
  console.log('用法: node scripts/deploy/ssh-run.cjs run "命令" | upload <本地> <远程> | uploaddir <本地目录> <远程目录>')
}

main().catch((e) => {
  console.error('❌ 失败:', e.message)
  process.exit(1)
})
