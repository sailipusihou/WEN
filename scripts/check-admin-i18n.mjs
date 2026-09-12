// 验证中文字典对新文案的覆盖情况 (Node 24 直接支持 .ts 类型剥离)
const { translateAdminString } = await import('../lib/admin-i18n.ts')

const samples = [
  'Customer Notify',
  'Notify customer',
  'No email',
  'Emailed',
  'In-site',
  'This order has no customer email',
  'Notify Customer',
  'Notification Status',
  'Customer Email',
  'No email on this order',
  'Last Notified',
  'Not notified yet',
  'Sent to:',
  'What the customer will receive',
  'Order #',
  'Carrier:',
  'Tracking:',
  'Estimated delivery:',
  'This order has no customer email, so neither an email nor an in-site message can be delivered. Please contact the customer by phone or another channel.',
  'This shipment was already notified. Sending again will deliver a second copy to the customer.',
  'Send Shipping Email',
  'Resend Shipping Email',
  'Send In-site Message',
  'Resend In-site Message',
  'Sending…',
  "Emails are sent through the SMTP account configured in Settings → Email. The in-site message appears in the customer's Messages page when they sign in.",
  'SMTP not configured',
  'Failed to send email',
  'Failed to notify customer',
  'Email sent to',
  'In-site message delivered to',
  'Reply-To Email',
]

let missing = 0, partial = 0
for (const s of samples) {
  const out = translateAdminString(s)
  const changed = out !== s
  const leftover = (out.match(/[A-Za-z]{3,}/g) || []).filter(w => !['SMTP', 'DKIM', 'SPF'].includes(w))
  const full = changed && leftover.length === 0
  if (!changed) missing++
  if (changed && !full) partial++
  console.log(`${full ? 'FULL' : (changed ? 'PART' : 'MISS')} ${JSON.stringify(s)}`)
  console.log(`     -> ${JSON.stringify(out)}`)
  if (leftover.length) console.log(`     残留英文: ${leftover.join(', ')}`)
}
console.log(`\n===== 完全 ${samples.length - missing - partial} / 部分 ${partial} / 未翻译 ${missing} =====`)
