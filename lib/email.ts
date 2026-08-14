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
    await transporter.sendMail({
      from: `"${settings.siteName || 'Low Flame'}" <${settings.smtpFromEmail || settings.smtpUser}>`,
      to: options.to,
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
               style="display:inline-block;padding:12px 30px;background:#B8452E;color:#fff;text-decoration:none;border-radius:4px;font-size:14px">
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
          <p style="margin:0;color:#666;font-size:14px">Status: <strong style="color:#B8452E">Processing</strong></p>
          <div style="text-align:center;margin:25px 0">
            <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001'}/account/orders"
               style="display:inline-block;padding:12px 30px;background:#B8452E;color:#fff;text-decoration:none;border-radius:4px;font-size:14px">
              View Order
            </a>
          </div>
        </div>
        <p style="color:#999;font-size:11px;text-align:center">Low Flame &middot; We'll notify you when your order ships.</p>
      </div>
    `.trim(),
  }
}
