/**
 * 商品编码前缀推导 —— 纯函数，放在独立模块里。
 *
 * 为什么单独一个文件：`lib/db.ts` 依赖 `fs`（它还要读写 data/*.json），
 * 无法被打包进客户端组件。而管理后台的商品表单（ProductForm.tsx，'use client'）
 * 也需要算这个前缀（「Auto」按钮 + 输入框占位符）。以前从 lib/db 引的只是
 * `type Product`（编译期就擦掉了），所以没暴露；一旦按值引入整个 lib/db 就会
 * 报 "Module not found: Can't resolve 'fs'"。
 *
 * 服务端（lib/db.ts 的 generateProductCode）与客户端共用这里的实现，
 * 保证「Auto」按钮生成的前缀和保存时服务端自动生成的前缀一致。
 */

/**
 * 由分类 slug 推导商品编码前缀（2–4 位大写字母）。
 *
 *   tea-ceremony   → TC
 *   ceramic-art    → CA
 *   incense-rituals→ IR
 *   textile-lacquer→ TL
 *   lighting-decor → LD
 *
 * 原先是写死的 CG/HD/GI 三个旧品牌分类，后台一换分类就全部落到 'GEN'，
 * 而且新分类必须改代码才能拿到前缀。改成推导后，后台加分类无需动代码。
 */
export function categoryCodePrefix(slug?: string | null): string {
  const s = String(slug || '').trim().toLowerCase()
  if (!s) return 'GEN'

  const initials = s
    .replace(/[^a-z0-9-]/g, '')
    .split('-')
    .filter(Boolean)
    .map(w => w[0])
    .join('')

  if (initials.length >= 2) return initials.slice(0, 4).toUpperCase()

  // 单段 slug（如 "tea"）取前两个字符，保证满足 2–4 位的要求
  const compact = s.replace(/[^a-z0-9]/g, '')
  return (compact.length >= 2 ? compact.slice(0, 2) : 'GEN').toUpperCase()
}
