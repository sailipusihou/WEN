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
// ⚠️ 为什么推荐密钥：这台机器长期被人爆破密码。用密码登录意味着 sshd 每次都要
//    处理大量失败的认证请求；密钥认证失败得早、开销小，也更不容易被挤掉。
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

const mode = process.argv[2]
const arg1 = process.argv[3]
const arg2 = process.argv[4]

function connect() {
  return new Promise((resolve, reject) => {
    const conn = new Client()
    conn.on('ready', () => resolve(conn))
    conn.on('error', reject)
    conn.connect({
      host: HOST, port: PORT, username: USER, ...AUTH,
      readyTimeout: 120000,
      keepaliveInterval: 20000,
    })
  })
}

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

async function uploadFile(sftp, local, remote, showProgress = false) {
  return new Promise((resolve, reject) => {
    const total = fs.statSync(local).size
    let lastPct = -1
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
    sftp.fastPut(local, remote, opts, (err) => {
      if (showProgress) process.stdout.write('\r  上传进度: 100%                          \n')
      err ? reject(err) : resolve()
    })
  })
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

async function main() {
  const conn = await connect()
  try {
    if (mode === 'run') {
      const r = await exec(conn, arg1, { stream: true })
      process.exitCode = r.code
    } else if (mode === 'upload') {
      const sftp = await new Promise((res, rej) => conn.sftp((e, s) => (e ? rej(e) : res(s))))
      const remoteDir = path.posix.dirname(arg2)
      await ensureRemoteDir(sftp, remoteDir)
      console.log('开始上传（大文件请耐心等待）...')
      await uploadFile(sftp, arg1, arg2, true)
      console.log('✅ 已上传:', arg1, '->', arg2)
    } else if (mode === 'uploaddir') {
      const sftp = await new Promise((res, rej) => conn.sftp((e, s) => (e ? rej(e) : res(s))))
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
    } else {
      console.log('用法: node scripts/deploy/ssh-run.cjs run "命令" | upload <本地> <远程> | uploaddir <本地目录> <远程目录>')
    }
  } finally {
    conn.end()
  }
}

main().catch((e) => {
  console.error('❌ 失败:', e.message)
  process.exit(1)
})
