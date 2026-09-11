// SMTP 发信测试：读取当前配置并发送一封测试邮件
// 用法：node scripts/test-smtp.cjs 收件人邮箱
const path = require('path')
const { getRepository } = (() => {
  // 直接用底层数据源读取配置（避免 TS 模块加载）
  const fs = require('fs')
  return {
    getRepository: () => ({
      settings: {
        get: () => {
          try {
            // 优先 SQLite
            const Database = require(path.join(__dirname, '..', 'node_modules', 'better-sqlite3'))
            const db = new Database(path.join(__dirname, '..', 'data', 'site.db'), { readonly: true })
            const row = db.prepare("SELECT value FROM settings WHERE key = 'site_settings'").get()
            db.close()
            if (row?.value) return JSON.parse(row.value)
          } catch {}
          try {
            const raw = fs.readFileSync(path.join(__dirname, '..', 'data', 'settings.json'), 'utf-8').replace(/^\uFEFF/, '')
            return JSON.parse(raw)
          } catch {}
          return {}
        },
      },
    }),
  }
})()

const nodemailer = require(path.join(__dirname, '..', 'node_modules', 'nodemailer'))

async function main() {
  const to = process.argv[2]
  if (!to) {
    console.log('用法: node scripts/test-smtp.cjs 收件人邮箱')
    process.exit(1)
  }

  const s = getRepository().settings.get()
  console.log('=== 当前 SMTP 配置 ===')
  console.log('host:', s.smtpHost || '(空)')
  console.log('port:', s.smtpPort || '(空)')
  console.log('user:', s.smtpUser || '(空)')
  console.log('pass:', s.smtpPass ? '已配置(' + s.smtpPass.length + '位)' : '(空)')
  console.log('from:', s.smtpFromEmail || '(空)')
  console.log('')

  if (!s.smtpHost || !s.smtpUser || !s.smtpPass) {
    console.log('❌ SMTP 未完整配置，无法测试')
    process.exit(1)
  }

  const port = Number(s.smtpPort) || 587
  console.log('正在连接 SMTP 服务器...')

  const transporter = nodemailer.createTransport({
    host: s.smtpHost,
    port,
    secure: port === 465,
    auth: { user: s.smtpUser, pass: s.smtpPass },
  })

  try {
    await transporter.verify()
    console.log('✅ SMTP 连接与认证成功')

    const info = await transporter.sendMail({
      from: `"${s.siteName || 'Low Flame'}" <${s.smtpFromEmail || s.smtpUser}>`,
      to,
      subject: 'Low Flame 邮件配置测试',
      text: 'SMTP 配置测试成功！这封邮件证明你的商城可以正常发送邮件（订单确认、发货通知等）。',
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:30px 20px">
          <div style="text-align:center;margin-bottom:24px">
            <span style="font-size:40px">🏮</span>
            <h1 style="font-size:22px;color:#1a1a2e;margin:12px 0 6px">邮件配置测试成功</h1>
            <p style="color:#666;font-size:14px">Low Flame 商城 SMTP 已正常工作</p>
          </div>
          <div style="background:#f9f5f0;border-radius:8px;padding:22px">
            <p style="color:#333;font-size:14px;line-height:1.7;margin:0">
              如果你收到这封邮件，说明订单确认邮件、发货通知、欢迎邮件等功能均可正常发送。
            </p>
          </div>
          <p style="color:#999;font-size:11px;text-align:center;margin-top:20px">
            发送时间：${new Date().toLocaleString('zh-CN')}
          </p>
        </div>
      `,
    })
    console.log('✅ 测试邮件已发送:', info.messageId)
  } catch (err) {
    console.log('❌ 发送失败:', err.message)
    if (/535|534|authentication/i.test(err.message)) {
      console.log('   提示：认证失败通常是授权码/应用专用密码不正确')
    }
    if (/ETIMEDOUT|ECONNREFUSED|ENOTFOUND/i.test(err.message)) {
      console.log('   提示：网络不通，检查 host/port 或服务器防火墙')
    }
  }
}

main().catch(e => { console.error('ERR', e.message); process.exit(1) })
