/**
 * 商品详情页的「可编辑内容」。
 *
 * 为什么四项内容放在**一个 JSON 列**（products.pdpContent）而不是五个独立列：
 *   这些都是纯展示内容 —— 不参与查询、筛选、排序，也不会被 SQL 拿来做条件。
 *   而本项目的加字段要同时改三处（sqlite.ts 迁移、rowToProduct 映射、update 白名单），
 *   漏一处就会出现「读了是 undefined / 写了不生效」的静默 bug（HANDOVER §4.2 记过
 *   一次 orderNo 就是这么丢的）。一个列只有一处映射，把这类风险压到最小。
 *
 * 空值一律表示「用默认」：详情页在字段缺失时会退回原来的通用文案，
 * 所以老商品不需要补数据也能正常显示。
 */

export interface PdpSpec { label: string; value: string }
export interface PdpFaq { q: string; a: string }
export interface PdpShare { enabled?: boolean; caption?: string }

export interface PdpContent {
  /** 卖点要点：标题下方一行一条 */
  highlights?: string[]
  /** 自由规格：后台可任意增删，替代原来固定的 工艺/材质/产地 */
  specs?: PdpSpec[]
  /** 常见问题：代替写死的三条问答 */
  faqs?: PdpFaq[]
  /** 配送与退货：一行一条；留空用通用文案 */
  shippingNotes?: string[]
  /** 分享栏：enabled 设为 false 可单独关掉；caption 自定义分享文案（默认用商品名） */
  share?: PdpShare
}

/** 详情页在字段缺失时使用的通用文案（与改造前完全一致，保证老商品观感不变） */
export const DEFAULT_FAQS: PdpFaq[] = [
  {
    q: 'Is this piece genuinely handmade?',
    a: 'Yes. Each piece is made by hand in the workshop named above — small variations in glaze and finish are the signature of handmade work, not defects.',
  },
  {
    q: 'Will it arrive safely?',
    a: 'Every order ships double-boxed with padding. If anything arrives damaged, send us a photo and we will replace it at no cost.',
  },
  {
    q: 'Can I ask before ordering?',
    a: 'Of course — use “Ask about this piece” above and we will reply within 24 hours.',
  },
]

export const DEFAULT_SHIPPING_NOTES: string[] = [
  'Dispatched from the workshop within 1–2 business days.',
  'Every piece is packed in protective, gift-ready packaging. Damaged in transit? We replace it free.',
  '30-day money-back guarantee — return it unused in original packaging.',
]

/**
 * 宽松解析：字段可以是 JSON 字符串（数据库存的），也可能是已经解析好的对象。
 * 任何异常都返回空对象，让调用方走默认文案 —— 详情页不能因为一段坏数据整页挂掉。
 */
export function parsePdpContent(raw: unknown): PdpContent {
  if (!raw) return {}
  if (typeof raw === 'object') return raw as PdpContent
  if (typeof raw !== 'string') return {}
  try {
    const o = JSON.parse(raw)
    return o && typeof o === 'object' ? (o as PdpContent) : {}
  } catch {
    return {}
  }
}

/** 只保留非空的要点（后台常见：编辑时留下一堆空行） */
export function cleanLines(v: unknown): string[] {
  if (!Array.isArray(v)) return []
  return v.map(x => String(x ?? '').trim()).filter(Boolean)
}

/** 规格：丢掉 label 与 value 都空的项 */
export function cleanSpecs(v: unknown): PdpSpec[] {
  if (!Array.isArray(v)) return []
  return v
    .map(x => ({ label: String(x?.label ?? '').trim(), value: String(x?.value ?? '').trim() }))
    .filter(s => s.label || s.value)
}

/** 问答：问题和答案都非空才保留 */
export function cleanFaqs(v: unknown): PdpFaq[] {
  if (!Array.isArray(v)) return []
  return v
    .map(x => ({ q: String(x?.q ?? '').trim(), a: String(x?.a ?? '').trim() }))
    .filter(f => f.q && f.a)
}
