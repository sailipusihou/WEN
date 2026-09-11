// 仅验证 SMTP 连接与认证（不发送邮件）
const fs = require('fs')
const path = require('path')

function getSettings() {
  try {
    const Database = require(path.join(__dirname, '..', 'node_modules', 'better-sqlite3'))
    const db = new Database(path.join(__dirname, '..', 'data', 'site.db'), { readonly: true })
    const row = db.prepare("SELECT value FROM settings WHERE key = 'site_settings'").get()
    db.close()
    if (row?.value) return JSON.parse(row.value)
  } catch (e) {}
  try {
    return JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'settings.json'), 'utf-8').replace(/^\uFEFF/, ''))
  } catch {}
  return {}
}

const nodemailer = require(path.join(__dirname, '..', 'node_modules', 'nodemailer'))

async function main() {
  const s = getSettings()
  console.log('=== 当前配置 ===')
  console.log('host:', s.smtpHost || '(空)')
  console.log('port:', s.smtpPort || '(空)')
  console.log('user:', s.smtpUser || '(空)')
  console.log('pass:', s.smtpPass ? s.smtpPass.slice(0, 8) + '...(' + s.smtpPass.length + '位)' : '(空)')
  console.log('from:', s.smtpFromEmail || '(空)')
  console.log('siteUrl:', s.siteUrl || '(空)')
  console.log('')

  if (!s.smtpHost || !s.smtpUser || !s.smtpPass) {
    console.log('❌ SMTP 配置不完整')
    process.exit(1)
  }

  const port = Number(s.smtpPort) || 587
  console.log(`正在连接 ${s.smtpHost}:${port} ...`)

  const transporter = nodemailer.createTransport({
    host: s.smtpHost,
    port,
    secure: port === 465,
    auth: { user: s.smtpUser, pass: s.smtpPass },
    connectionTimeout: 20000,
    greetTimeout: 20000,
  })

  try {
    await transporter.verify()
    console.log('✅ SMTP 连接与认证成功！配置正确。')
    console.log('   下一步：发一封真实测试邮件确认送达（需提供收件邮箱）')
  } catch (err) {
    console.log('❌ 验证失败:', err.message)
    if (/535|534|authentication|Invalid login/i.test(err.message)) {
      console.log('   原因：API Key 不正确或权限不足')
    }
    if (/ETIMEDOUT|ECONNREFUSED|ENOTFOUND|EAI_AGAIN/i.test(err.message)) {
      console.log('   原因：网络不通（检查 host/port，或服务器出网限制）')
    }
  }
}

main().catch(e => { console.error('ERR', e.message); process.exit(1) })
