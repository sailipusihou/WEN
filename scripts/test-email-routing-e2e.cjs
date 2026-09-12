// 端到端验证: 用站点自己的 Resend SMTP 发一封信到 hello@lowflame.store
// 链路: Resend(发) -> lowflame.store MX(Cloudflare) -> 转发 -> saih25271@gmail.com
const path = require('path')
const nodemailer = require('nodemailer')
const Database = require('better-sqlite3')

const db = new Database(path.join(process.cwd(), 'data', 'site.db'), { readonly: true })
const s = JSON.parse(db.prepare("SELECT value FROM settings WHERE key='site_settings'").get().value)
db.close()

console.log('SMTP host:', s.smtpHost, ' user:', s.smtpUser, ' from:', s.smtpFromEmail)

;(async () => {
  const t = nodemailer.createTransport({
    host: s.smtpHost,
    port: Number(s.smtpPort) || 587,
    secure: Number(s.smtpPort) === 465,
    auth: { user: s.smtpUser, pass: s.smtpPass },
  })

  const info = await t.sendMail({
    from: `"Low Flame" <${s.smtpFromEmail || s.smtpUser}>`,
    to: 'hello@lowflame.store',
    replyTo: 'hello@lowflame.store',
    subject: 'Low Flame Email Routing test ' + new Date().toISOString(),
    text: 'This is an end-to-end test: Resend -> Cloudflare Email Routing -> your Gmail.',
    html: `<div style="font-family:sans-serif">
      <h2>Email Routing 端到端测试</h2>
      <p>这封信的链路是：<b>Resend 发信</b> → <b>lowflame.store 的 MX（Cloudflare）</b> → <b>转发到 saih25271@gmail.com</b></p>
      <p>如果你在 Gmail 里看到这封邮件，说明两件事同时成立：</p>
      <ol>
        <li>Resend 发信没被根域新增的 SPF 影响</li>
        <li>Cloudflare Email Routing 收信 + 转发正常</li>
      </ol>
      <p style="color:#888;font-size:12px">发送时间：${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}</p>
    </div>`,
  })
  console.log('✅ 已发送:', info.messageId, info.accepted, info.response)

  // 顺便确认发信方 SPF/DKIM 是否仍完好
  const dns = await import('dns').then(m => m.promises)
  try {
    const spf = await dns.resolveTxt('send.lowflame.store')
    console.log('send.lowflame.store TXT:', spf.map(r => r.join('')))
    const mx = await dns.resolveMx('send.lowflame.store')
    console.log('send.lowflame.store MX:', mx.map(r => `${r.exchange}:${r.priority}`))
  } catch (e) { console.log('send 子域查询失败:', e.message) }
})()
