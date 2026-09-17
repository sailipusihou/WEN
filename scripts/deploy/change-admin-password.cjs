/**
 * change-admin-password.cjs —— 更换后台管理员密码
 *
 * 背景：服务器被 root 级入侵，site.db 里存的密码哈希已泄露（虽然哈希本身不可逆，
 *      但旧密码是那种容易被爆破的弱密码，攻击面太大）。
 *      ⚠️ 本文件**不写任何真实密码** —— 旧值曾被硬编码在这里（连注释一起），
 *      等于把弱口令提交进版本库，已清理。
 *
 * 机制（读自 lib/auth.ts）：
 *   hashAdminPassword(pw, salt) = pbkdf2Sync(pw, salt, 210000, 64, 'sha512').hex
 *   salt = crypto.randomBytes(16).toString('hex')
 *   存在 settings.site_settings 的 adminPasswordHash / adminPasswordSalt
 *   同时把废弃的明文字段 adminPassword 清空
 *
 * 用法（服务器上从 /var/www/lowflame）：
 *   NEW_ADMIN_PASS='xxx' NODE_PATH=... node /root/chpw.cjs run
 *   不加 run 为 dry-run
 */
const Database = require('better-sqlite3')
const path = require('path')
const fs = require('fs')
const crypto = require('crypto')

const db = new Database(path.join(process.cwd(), 'data', 'site.db'))
const mode = process.argv[2] || 'dry'

const NEW_PASS = process.env.NEW_ADMIN_PASS || ''
if (!NEW_PASS || NEW_PASS.length < 8) {
  console.error('❌ 请通过 NEW_ADMIN_PASS 提供新密码（至少 8 位）')
  process.exit(1)
}

// 与 lib/auth.ts 完全一致的算法
const ADMIN_ITERATIONS = 210000
const ADMIN_LEGACY_ITERATIONS = 100000

function hashAdminPassword(password, salt) {
  const s = salt || crypto.randomBytes(16).toString('hex')
  const hash = crypto.pbkdf2Sync(password, s, ADMIN_ITERATIONS, 64, 'sha512').toString('hex')
  return { hash, salt: s }
}

function verifyAdminPassword(password, stored, salt) {
  const { hash } = hashAdminPassword(password, salt)
  if (hash === stored) return true
  const legacy = crypto.pbkdf2Sync(password, salt, ADMIN_LEGACY_ITERATIONS, 64, 'sha512').toString('hex')
  return legacy === stored
}

const row = db.prepare("SELECT value FROM settings WHERE key = 'site_settings'").get()
if (!row) { console.error('读不到 site_settings'); process.exit(1) }
const cfg = JSON.parse(row.value)

console.log('======================================================================')
console.log(' 更换后台管理员密码')
console.log('======================================================================')
console.log()
console.log('### 1. 当前状态')
console.log('  adminUsername     :', JSON.stringify(cfg.adminUsername))
console.log('  adminPasswordHash :', cfg.adminPasswordHash ? cfg.adminPasswordHash.slice(0, 16) + '…（' + cfg.adminPasswordHash.length + ' 字符）' : '(空)')
console.log('  adminPasswordSalt :', cfg.adminPasswordSalt ? cfg.adminPasswordSalt.slice(0, 12) + '…' : '(空)')
console.log('  明文 adminPassword:', cfg.adminPassword ? '⚠️ 有值（应清空）' : '✅ 已空')

// 旧密码只用于「验证它确实失效了」这一步，不影响新密码，**不设任何默认值**。
const OLD_PASS = process.env.OLD_ADMIN_PASS || ''
if (OLD_PASS && cfg.adminPasswordHash && cfg.adminPasswordSalt) {
  const oldWorks = verifyAdminPassword(OLD_PASS, cfg.adminPasswordHash, cfg.adminPasswordSalt)
  console.log('  旧密码是否仍可登录  :', oldWorks ? '是（即将失效）' : '否')
} else if (!OLD_PASS) {
  console.log('  旧密码是否仍可登录  : （未提供 OLD_ADMIN_PASS，跳过检查）')
}

console.log()
console.log('### 2. 生成新哈希')
const { hash, salt } = hashAdminPassword(NEW_PASS)
console.log('  新 salt :', salt)
console.log('  新 hash :', hash.slice(0, 24) + '…（' + hash.length + ' 字符）')
console.log('  迭代次数:', ADMIN_ITERATIONS)
console.log('  算法    : PBKDF2-SHA512')

// 自校验：新哈希必须能用新密码验证通过
const selfCheck = verifyAdminPassword(NEW_PASS, hash, salt)
console.log('  自校验  :', selfCheck ? '✅ 新密码可通过验证' : '❌ 算法有问题，中止')
if (!selfCheck) process.exit(1)

if (mode !== 'run') {
  console.log()
  console.log('[dry run] 加参数 run 才写入')
  process.exit(0)
}

console.log()
console.log('### 3. 写入数据库')
const bk = '/root/settings-backup-adminpw-' + Date.now() + '.json'
fs.writeFileSync(bk, JSON.stringify({ value: row.value }, null, 2))
console.log('  原配置已备份:', bk)

cfg.adminPasswordHash = hash
cfg.adminPasswordSalt = salt
cfg.adminPassword = ''   // 清空废弃的明文字段

db.prepare("UPDATE settings SET value = ? WHERE key = 'site_settings'").run(JSON.stringify(cfg))

console.log()
console.log('### 4. 写入后复核')
const after = JSON.parse(db.prepare("SELECT value FROM settings WHERE key = 'site_settings'").get().value)
console.log('  adminPasswordHash :', after.adminPasswordHash.slice(0, 16) + '…')
console.log('  adminPasswordSalt :', after.adminPasswordSalt.slice(0, 12) + '…')
console.log('  明文字段          :', after.adminPassword ? '⚠️ 仍有值' : '✅ 已清空')

const newWorks = verifyAdminPassword(NEW_PASS, after.adminPasswordHash, after.adminPasswordSalt)
const oldWorksAfter = verifyAdminPassword(OLD_PASS, after.adminPasswordHash, after.adminPasswordSalt)
console.log()
console.log('  新密码能登录 :', newWorks ? '✅' : '❌')
console.log('  旧密码能登录 :', oldWorksAfter ? '❌ 仍然可以（异常）' : '✅ 已失效')

console.log()
console.log('======================================================================')
console.log(' 下一步：pm2 restart lowflame   （让设置缓存失效）')
console.log('======================================================================')
