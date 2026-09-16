#!/usr/bin/env node
/**
 * fast-deploy.cjs —— 本地构建 + 只上传运行时产物，服务器**完全不跑构建**。
 *
 * 为什么必须这样做：
 *   这台 2GB 的阿里云机器跑 next build 会疯狂 swap，磁盘 I/O 被打满 →
 *   sshd / nginx 都拿不到资源 → 机器假死，只能去控制台重启。已经发生三次。
 *   扩到 6GB swap 也没用 —— 杀死机器的是 I/O 风暴，不是 OOM。
 *
 * 做法：
 *   1. 本地 npm run build（本地机器内存充足）
 *   2. 只打包 .next 里运行真正需要的部分，**排除 .next/cache**（约 635MB 的构建缓存）
 *      → 产物约 20MB，一次就传完
 *   3. 上传到服务器解压，pm2 restart
 *   4. 逐页验证；失败自动回退到「服务器端构建」（并提示可能需要重启实例）
 *
 * 为什么产物可以跨平台传：构建产物里出现的本机绝对路径（D:\...）只是
 * 路由清单里的**可读标签**，真正加载模块用的是数字 module id
 * （s.bind(s, 53103)），因此不参与 require 解析。已实际核对过。
 *
 * 用法（本地）:
 *   $env:SSH_PASS='...'; node scripts/deploy/fast-deploy.cjs            # 用现有 .next
 *   $env:SSH_PASS='...'; node scripts/deploy/fast-deploy.cjs --build    # 先本地构建
 */
const path = require('path')
const fs = require('fs')
const https = require('https')
const { spawnSync } = require('child_process')

const ROOT = path.join(__dirname, '..', '..')
const RUNNER = path.join(__dirname, 'ssh-run.cjs')
const TARBALL = path.join(ROOT, 'next-build.tar.gz')
/** 静态资源包（public/，排除 uploads）—— 见下方第 2 步的说明 */
const PUBLIC_TARBALL = path.join(ROOT, 'public-assets.tar.gz')
const DO_BUILD = process.argv.includes('--build')

const sleep = ms => new Promise(r => setTimeout(r, ms))

function sh(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { encoding: 'utf8', cwd: opts.cwd || ROOT, timeout: opts.timeout || 600000 })
  return { out: (r.stdout || '') + (r.stderr || ''), code: r.status }
}
function remote(cmd, timeout) {
  const r = spawnSync(process.execPath, [RUNNER, 'run', cmd], { encoding: 'utf8', timeout: timeout || 180000 })
  return { out: (r.stdout || '') + (r.stderr || ''), code: r.status }
}
function upload(local, remotePath) {
  const r = spawnSync(process.execPath, [RUNNER, 'upload', local, remotePath], { encoding: 'utf8', timeout: 600000 })
  return { out: (r.stdout || '') + (r.stderr || ''), code: r.status }
}
function http(url) {
  return new Promise(resolve => {
    const req = https.get(url, { timeout: 20000, headers: { 'User-Agent': 'Mozilla/5.0' } }, r => {
      r.resume(); r.on('end', () => resolve(r.statusCode))
    })
    req.on('error', e => resolve('ERR:' + e.code))
    req.on('timeout', () => { req.destroy(); resolve('TIMEOUT') })
  })
}

;(async () => {
  // ---------- 1. 本地构建 ----------
  if (DO_BUILD) {
    console.log('=== 1. 本地构建 ===')
    const b = sh('npm', ['run', 'build'], { timeout: 900000 })
    const ok = /Compiled successfully/.test(b.out)
    console.log(ok ? '  ✓ 本地构建成功' : '  ✗ 本地构建失败')
    if (!ok) { console.log(b.out.slice(-2500)); process.exit(1) }
  } else {
    console.log('=== 1. 使用现有本地构建产物（加 --build 可强制重建）===')
  }

  const buildIdPath = path.join(ROOT, '.next', 'BUILD_ID')
  if (!fs.existsSync(buildIdPath)) { console.error('  ✗ 本地没有 .next/BUILD_ID，请加 --build'); process.exit(1) }
  const localBuildId = fs.readFileSync(buildIdPath, 'utf8').trim()
  console.log('  本地 BUILD_ID:', localBuildId)

  // ---------- 2. 打包（排除 cache） ----------
  console.log('\n=== 2. 本地打包（排除 .next/cache）===')
  // 打包前先确认 commit 已经推送（避免服务器 git 与产物不一致）
  const st = sh('git', ['status', '--porcelain'])
  if (st.out.trim()) console.log('  ⚠ 工作区有未提交改动，建议先 commit + push')
  const gitHead = sh('git', ['rev-parse', '--short', 'HEAD']).out.trim()
  fs.writeFileSync(path.join(ROOT, '.next', 'DEPLOY_COMMIT'), gitHead)
  console.log('  产物对应 commit:', gitHead)

  if (fs.existsSync(TARBALL)) fs.unlinkSync(TARBALL)
  const t = sh('tar', ['-czf', TARBALL, '--exclude=.next/cache', '--exclude=.next/standalone', '.next'], { timeout: 300000 })
  if (!fs.existsSync(TARBALL)) { console.error('  ✗ 打包失败\n' + t.out.slice(-800)); process.exit(1) }
  const mb = fs.statSync(TARBALL).size / 1024 / 1024
  console.log(`  ✓ 产物包: ${mb.toFixed(1)} MB`)

  /*
   * 静态资源单独打包。
   *
   * 为什么必须单独做：原来的部署只 tar .next，**public/ 从来没被同步过** ——
   * 所以换 logo、改图片这类只动静态资源的改动根本不会上线
   * （实测：新 logo 已 commit 但线上仍是旧图 249×245）。
   *
   * ⚠️ 必须排除 public/uploads —— 那是服务器上的用户上传文件（本地那份是 117MB 的旧副本），
   *    同步过去会覆盖掉线上较新的商品图。
   * ⚠️ 服务器端只解压覆盖、**不删除** public 目录，避免误删 uploads。
   */
  let publicMb = 0
  if (fs.existsSync(PUBLIC_TARBALL)) fs.unlinkSync(PUBLIC_TARBALL)
  const pubDir = path.join(ROOT, 'public')
  if (fs.existsSync(pubDir)) {
    const pt = sh('tar', ['-czf', PUBLIC_TARBALL, '--exclude=public/uploads', 'public'], { timeout: 300000 })
    if (fs.existsSync(PUBLIC_TARBALL)) {
      publicMb = fs.statSync(PUBLIC_TARBALL).size / 1024 / 1024
      console.log(`  ✓ 静态资源包: ${publicMb.toFixed(1)} MB（已排除 public/uploads 用户上传目录）`)
    } else {
      console.log('  ⚠ 静态资源打包失败，跳过（不影响 .next 部署）\n' + pt.out.slice(-300))
    }
  }

  // ---------- 3. 上传 ----------
  console.log('\n=== 3. 上传到服务器 ===')
  const up = upload(TARBALL, '/root/next-build.tar.gz')
  console.log('  ' + up.out.trim().split('\n').slice(-2).join('\n  '))
  if (up.code !== 0) process.exit(1)
  if (publicMb > 0) {
    const up2 = upload(PUBLIC_TARBALL, '/root/public-assets.tar.gz')
    console.log('  ' + up2.out.trim().split('\n').slice(-2).join('\n  '))
    if (up2.code !== 0) console.log('  ⚠ 静态资源上传失败，本次只更新 .next')
  }

  // ---------- 4. 解压 + 重启 ----------
  console.log('\n=== 4. 服务器解压并重启（不跑构建）===')
  const dep = remote(
    'set -e; cd /var/www/lowflame; ' +
    'rm -rf .next.tmp; mkdir -p .next.tmp; ' +
    'tar -xzf /root/next-build.tar.gz -C .next.tmp; ' +
    'rm -rf .next; mv .next.tmp/.next .next; rmdir .next.tmp; ' +
    // 静态资源：覆盖式解压，**不删除** public 目录（保住 uploads 里的用户上传文件）
    'if [ -f /root/public-assets.tar.gz ]; then ' +
    '  tar -xzf /root/public-assets.tar.gz -C /var/www/lowflame; ' +
    '  echo "静态资源已同步: $(ls public/images | wc -l) 个 images 文件"; ' +
    'fi; ' +
    'echo "解压完成 BUILD_ID=$(cat .next/BUILD_ID)"; ' +
    'pm2 restart lowflame >/dev/null 2>&1; sleep 8; ' +
    'curl -s -o /dev/null -w "local=%{http_code}\\n" -m 25 http://localhost:3000/',
    300000
  )
  console.log(dep.out.trim())

  // ---------- 5. 验证 ----------
  console.log('\n=== 5. 线上验证 ===')
  await sleep(4000)
  let allOk = true
  for (const p of ['/', '/products', '/cart', '/checkout', '/api/paypal/config', '/admin/login']) {
    const code = await http('https://lowflame.store' + p)
    const ok = typeof code === 'number' && code < 400
    if (!ok) allOk = false
    console.log(`  ${ok ? 'OK ' : 'BAD'} ${String(code).padEnd(8)} ${p}`)
  }

  if (allOk) {
    console.log('\n✅ 部署成功（本地构建 → 上传 → 服务器零构建）')
    try { fs.unlinkSync(TARBALL) } catch { /* ignore */ }
    process.exit(0)
  }

  console.log('\n❌ 有页面异常。回退方案：在服务器上跑加固版 rebuild.sh（含扩 swap + nice/ionice）')
  console.log('   node scripts/deploy/safe-rebuild.cjs')
  process.exit(2)
})().catch(e => { console.error('脚本异常:', e); process.exit(1) })
