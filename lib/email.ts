import nodemailer from 'nodemailer'
import { getRepository } from './repository'

export interface EmailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

// 修复 L12: 邮件模板变量转义, 防止用户名/订单号注入 HTML
export function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export async function sendEmail(options: EmailOptions): Promise<{ success: boolean; error?: string }> {
  const repo = getRepository()
  const settings = repo.settings.get()
  if (!settings.smtpHost || !settings.smtpUser || !settings.smtpPass) {
    return { success: false, error: 'SMTP not configured' }
  }
  try {
    const transporter = nodemailer.createTransport({
      host: settings.smtpHost,
      port: Number(settings.smtpPort) || 587,
      secure: Number(settings.smtpPort) === 465,
      auth: { user: settings.smtpUser, pass: settings.smtpPass },
    })
    const fromAddress = settings.smtpFromEmail || settings.smtpUser
    // 回复地址: 客户点「回复」时应该发到对外公示邮箱 (如 hello@lowflame.store),
    // 而不是发信服务商的地址。未配置时回退到发件地址。
    const replyTo = (settings as any).smtpReplyTo || settings.smtpFromEmail || undefined
    await transporter.sendMail({
      from: `"${settings.siteName || 'Low Flame'}" <${fromAddress}>`,
      to: options.to,
      replyTo,
      subject: options.subject,
      text: options.text || options.html.replace(/<[^>]*>/g, ''),
      html: options.html,
    })
    return { success: true }
  } catch (err: any) {
    console.error('[Email] Send failed:', err)
    return { success: false, error: err.message }
  }
}

export function buildWelcomeEmail(name: string): { subject: string; html: string } {
  return {
    subject: 'Welcome to Low Flame!',
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:30px 20px">
        <div style="text-align:center;margin-bottom:30px">
          <span style="font-size:36px">🏮</span>
          <h1 style="font-size:24px;color:#1a1a2e;margin:10px 0 5px">Welcome, ${escapeHtml(name)}!</h1>
          <p style="color:#666;font-size:14px">Thank you for joining Low Flame</p>
        </div>
        <div style="background:#f9f5f0;border-radius:8px;padding:25px;margin-bottom:25px">
          <p style="color:#333;font-size:14px;line-height:1.6">Discover authentic Chinese craftsmanship — hand-selected ceramics, silk embroidery, bamboo weaving, and more, shipped directly to your door.</p>
          <div style="text-align:center;margin:25px 0">
            <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001'}/#products"
               style="display:inline-block;padding:12px 30px;background:#A83420;color:#fff;text-decoration:none;border-radius:4px;font-size:14px">
              Start Shopping
            </a>
          </div>
        </div>
        <p style="color:#999;font-size:11px;text-align:center">Low Flame &middot; Bringing the artistry of China to the world</p>
      </div>
    `.trim(),
  }
}

export function buildOrderConfirmationEmail(name: string, orderId: string, total: number, items: number): { subject: string; html: string } {
  return {
    subject: 'Order Confirmed - #' + orderId,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:30px 20px">
        <div style="text-align:center;margin-bottom:30px">
          <span style="font-size:48px">✅</span>
          <h1 style="font-size:24px;color:#1a1a2e;margin:10px 0 5px">Order Confirmed!</h1>
          <p style="color:#666;font-size:14px">Thank you, ${escapeHtml(name)}!</p>
        </div>
        <div style="background:#f0f9f0;border-radius:8px;padding:25px;margin-bottom:25px">
          <p style="margin:0 0 15px;color:#333"><strong>Order #${escapeHtml(orderId)}</strong></p>
          <p style="margin:0 0 5px;color:#666;font-size:14px">Items: ${items}</p>
          <p style="margin:0 0 5px;color:#666;font-size:14px">Total: $${total.toFixed(2)}</p>
          <p style="margin:0;color:#666;font-size:14px">Status: <strong style="color:#A83420">Processing</strong></p>
          <div style="text-align:center;margin:25px 0">
            <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001'}/account/orders"
               style="display:inline-block;padding:12px 30px;background:#A83420;color:#fff;text-decoration:none;border-radius:4px;font-size:14px">
              View Order
            </a>
          </div>
        </div>
        <p style="color:#999;font-size:11px;text-align:center">Low Flame &middot; We'll notify you when your order ships.</p>
      </div>
    `.trim(),
  }
}

// ========== 发货通知 (后台手动点击发送) ==========

export interface ShipmentNotificationData {
  /** 客户称呼 (姓名) */
  customerName?: string
  orderNo: string
  carrierName?: string
  trackingNumber: string
  trackingUrl?: string
  estimatedDelivery?: string
  items?: { name: string; quantity?: number }[]
  /** 站点地址, 用于生成查看订单链接 */
  siteUrl?: string
}

export function buildShipmentNotificationEmail(data: ShipmentNotificationData): { subject: string; html: string } {
  const site = data.siteUrl || process.env.NEXT_PUBLIC_SITE_URL || 'https://lowflame.store'
  const items = data.items || []
  const itemRows = items.length
    ? `
        <table style="width:100%;border-collapse:collapse;margin:15px 0">
          ${items.map(it => `
            <tr>
              <td style="padding:6px 0;color:#333;font-size:13px">${escapeHtml(it.name)}</td>
              <td style="padding:6px 0;color:#666;font-size:13px;text-align:right">×&nbsp;${escapeHtml(String(it.quantity || 1))}</td>
            </tr>`).join('')}
        </table>`
    : ''

  const trackingBlock = data.trackingUrl
    ? `<div style="text-align:center;margin:22px 0">
         <a href="${escapeHtml(data.trackingUrl)}"
            style="display:inline-block;padding:12px 30px;background:#A83420;color:#fff;text-decoration:none;border-radius:4px;font-size:14px">
           Track Your Package
         </a>
       </div>`
    : ''

  const eta = data.estimatedDelivery
    ? `<p style="margin:0 0 5px;color:#666;font-size:14px">Estimated delivery: <strong style="color:#333">${escapeHtml(data.estimatedDelivery)}</strong></p>`
    : ''

  return {
    subject: 'Your order #' + data.orderNo + ' has shipped',
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:30px 20px">
        <div style="text-align:center;margin-bottom:30px">
          <span style="font-size:48px">📦</span>
          <h1 style="font-size:24px;color:#1a1a2e;margin:10px 0 5px">Your order is on its way!</h1>
          <p style="color:#666;font-size:14px">${data.customerName ? 'Thank you, ' + escapeHtml(data.customerName) + '!' : 'Thank you for your order!'}</p>
        </div>
        <div style="background:#f9f5f0;border-radius:8px;padding:25px;margin-bottom:25px">
          <p style="margin:0 0 12px;color:#333"><strong>Order #${escapeHtml(data.orderNo)}</strong></p>
          <p style="margin:0 0 5px;color:#666;font-size:14px">Carrier: <strong style="color:#333">${escapeHtml(data.carrierName || '-')}</strong></p>
          <p style="margin:0 0 5px;color:#666;font-size:14px">Tracking number: <strong style="color:#333;font-family:monospace">${escapeHtml(data.trackingNumber)}</strong></p>
          ${eta}
          ${itemRows}
          ${trackingBlock}
          <div style="text-align:center;margin-top:10px">
            <a href="${escapeHtml(site)}/account/orders"
               style="color:#A83420;font-size:13px;text-decoration:underline">View your order</a>
          </div>
        </div>
        <p style="color:#999;font-size:12px;line-height:1.6;text-align:center">
          If you have any questions, just reply to this email and we will get back to you.<br />
          Low Flame &middot; Bringing the artistry of China to the world
        </p>
      </div>
    `.trim(),
  }
}
