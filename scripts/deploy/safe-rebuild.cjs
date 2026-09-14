#!/usr/bin/env node
/**
 * safe-rebuild.cjs —— 一条命令完成「部署 + 构建 + 验证」，并且对这台 2GB 机器做了防护。
 *
 * 为什么需要它：
 *   直接用 nohup 起 rebuild.sh 时，构建会把机器压到 swap 死锁（内核活着、sshd 和
 *   node 全 fork 不出来），已经发生两次。这个脚本会：
 *     1. 先上传改进版 rebuild 脚本（含扩 swap、压堆上限、关 lint、失败不启服务）
 *     2. 先用 SSH 做一次「内存体检」，可用内存过低就告警并中止
 *     3. 构建全程轮询，一旦发现 SSH 或站点连续失联就立刻报告，不再盲等
 *     4. 构建结束后校验 .next/BUILD_ID、pm2 状态、站点 HTTP
 *
 * 用法（本地）:
 *   $env:SSH_PASS='...'; node scripts/deploy/safe-rebuild.cjs
 *   node scripts/deploy/safe-rebuild.cjs --no-pull   跳过 git 拉取
 */
const path = require('path')
const fs = require('fs')
const https = require('https')
const { execFileSync, spawnSync } = require('child_process')

const ROOT = path.join(__dirname, '..', '..')
const RUNNER = path.join(__dirname, 'ssh-run.cjs')
const NO_PULL = process.argv.includes('--no-pull')

function run(remoteCmd, opts = {}) {
  const args = ['run', remoteCmd]
  const r = spawnSync(process.execPath, [RUNNER, ...args], { encoding: 'utf8', timeout: opts.timeout || 120000 })
  return { out: (r.stdout || '') + (r.stderr || ''), code: r.status }
}

function upload(local, remote) {
  const r = spawnSync(process.execPath, [RUNNER, 'upload', local, remote], { encoding: 'utf8', timeout: 180000 })
  return { out: (r.stdout || '') + (r.stderr || ''), code: r.status }
}

function http(url) {
  return new Promise(resolve => {
    const req = https.get(url, { timeout: 20000, headers: { 'User-Agent': 'Mozilla/5.0' } }, r => {
      r.resume()
      r.on('end', () => resolve(r.statusCode))
    })
    req.on('error', e => resolve('ERR:' + e.code))
    req.on('timeout', () => { req.destroy(); resolve('TIMEOUT') })
  })
}

const sleep = ms => new Promise(r => setTimeout(r, ms))

;(async () => {
  console.log('=== 1. 上传安全版重建脚本 ===')
  const up = upload(path.join(__dirname, 'rebuild-remote.sh'), '/root/rebuild.sh')
  console.log('  ', up.out.trim().split('\n').pop())

  console.log('\n=== 2. 服务器内存体检 ===')
  const probe = run('free -m | head -3; df -m / | tail -1; pm2 list 2>/dev/null | grep -E "lowflame" || echo "(pm2 无 lowflame)"')
  console.log(probe.out.trim())
  const availMatch = /Mem:\s+\d+\s+\d+\s+\d+.*?\s+(\d+)\s*$/.exec(probe.out.split('\n').find(l => l.startsWith('Mem:')) || '')
  const avail = availMatch ? Number(availMatch[1]) : null
  if (avail !== null && avail < 250) {
    console.log(`\n⚠️ 可用内存仅 ${avail}MB，构建很可能再次压死机器。`)
    console.log('   建议先在阿里云控制台重启实例，或先把网站停掉再构建。')
    console.log('   如仍要继续：node scripts/deploy/safe-rebuild.cjs --force')
    if (!process.argv.includes('--force')) process.exit(2)
  }

  if (!NO_PULL) {
    console.log('\n=== 3. 拉取最新代码 ===')
    const pull = run('cd /var/www/lowflame && git fetch origin master 2>&1 | tail -1 && git reset --hard origin/master 2>&1 | tail -1 && git log --oneline -1')
    console.log(pull.out.trim())
  }

  console.log('\n=== 4. 启动构建（宿主机已加固：先扩 swap，再压堆上限）===')
  run('rm -f /tmp/build.log; cd /root && setsid nohup bash /root/rebuild.sh > /dev/null 2>&1 < /dev/null & disown; sleep 2; echo launched')

  // ---------- 轮询：构建 + 存活监控 ----------
  let downStreak = 0
  for (let i = 1; i <= 40; i++) {
    await sleep(20000)
    const code = await http('https://lowflame.store/')
    const alive = typeof code === 'number'
    if (!alive) downStreak++

    // 构建期间 pm2 是停的，站点本就不可用；用 SSH 探构建进度。
    // 注意：判定必须直接看「DONE」标记 —— 早先版本用 tail -2 + grep -c，
    // 日志尾部多几行就采不到标记，导致明明构建成功却一直轮询到超时（误报）。
    const t = run('tail -1 /tmp/build.log 2>/dev/null; echo "|"; grep -o "BUILD_EXIT=[0-9]*" /tmp/build.log 2>/dev/null | tail -1', { timeout: 60000 })
    const sshOk = t.out.includes('|')
    const exitMatch = /BUILD_EXIT=(\d+)/.exec(t.out)
    const done = /===DONE===/.test(t.out)
    console.log(`  [${String(i).padStart(2)}] ssh=${sshOk ? 'OK ' : 'FAIL'} site=${alive ? code : String(code).padEnd(4)}  ${t.out.replace(/\s+/g, ' ').trim().slice(0, 120)}`)

    if (!sshOk) {
      downStreak++
      if (downStreak >= 5) {
        console.log('\n❌ 服务器连续失联（SSH 与站点同时不可达）—— 很可能又 swap 死锁了。')
        console.log('   请到阿里云控制台重启实例，然后重跑本脚本。')
        process.exit(3)
      }
    }

    if (done || (exitMatch && !alive)) {
      console.log('\n=== 5. 构建结束，校验 ===')
      console.log(run('grep -o "BUILD_EXIT=[0-9]*" /tmp/build.log | tail -1; ls -la /var/www/lowflame/.next/BUILD_ID && cat /var/www/lowflame/.next/BUILD_ID; echo; free -m | head -2; pm2 list | grep lowflame; tail -2 /tmp/build.log').out.trim())
      await sleep(8000)
      const final = await http('https://lowflame.store/')
      const cfg = await http('https://lowflame.store/api/paypal/config')
      const buildOk = exitMatch ? exitMatch[1] === '0' : false
      console.log(`\n构建退出码: ${exitMatch ? exitMatch[1] : '未捕获'}`)
      console.log(`站点 / → ${final}`)
      console.log(`/api/paypal/config → ${cfg}`)
      process.exit(buildOk && typeof final === 'number' && final < 400 ? 0 : 1)
    }
  }

  console.log('\n⚠️ 轮询超时（约 13 分钟）仍未看到 BUILD_EXIT，请手动查看 /tmp/build.log')
  process.exit(4)
})().catch(e => { console.error('脚本异常:', e); process.exit(1) })
