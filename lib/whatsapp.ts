/**
 * WhatsApp 联系方式。
 *
 * 为什么单独一个文件：站上有多处入口（页脚、商品页、联系页），
 * 号码清洗与建链规则必须一致，否则会出现「有的地方点得通、有的点不通」。
 *
 * ⚠️ 号码在后台「设置 → Brand & Identity」里填（国际格式，含国家码）。
 *    留空时**所有入口都不渲染** —— 这样还没注册 WhatsApp 的时候，
 *    站上不会出现一排点了没反应的按钮。
 */

/** 清洗成 wa.me 需要的纯数字：+86 183-3734-0646 → 8618337340646 */
export function waDigits(raw?: string | null): string {
  return String(raw ?? '').replace(/\D/g, '')
}

/** 号码是否可用（wa.me 至少 8 位数字，太短一定是填错了） */
export function hasWhatsApp(raw?: string | null): boolean {
  return waDigits(raw).length >= 8
}

/** 建链；带 text 时预填消息 */
export function waLink(raw?: string | null, text?: string): string {
  const base = `https://wa.me/${waDigits(raw)}`
  return text ? `${base}?text=${encodeURIComponent(text)}` : base
}

/**
 * 商品咨询的预填文案。
 * 客户点一下，消息里就带着是哪件商品 —— 比让客户自己描述强得多。
 */
export function waProductMessage(p: {
  name?: string
  nameEn?: string
  price?: number | string
  url?: string
  greeting?: string
}): string {
  const title = p.nameEn || p.name || 'this piece'
  const lines = [
    p.greeting?.trim() || 'Hello! I have a question about this piece:',
    '',
    `• ${title}`,
  ]
  if (p.price !== undefined && p.price !== '') lines.push(`• Price: $${p.price}`)
  if (p.url) lines.push('', p.url)
  return lines.join('\n')
}
