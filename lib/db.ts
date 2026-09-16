// 东方集市 · 数据持久层 — JSON 文件读写
import fs from 'fs'
import path from 'path'
import { getCachedData, invalidateCache, CACHE_TTL } from '@/lib/cache'
import { categoryCodePrefix } from './product-code'

const DATA_DIR = path.join(process.cwd(), 'data')
const PRODUCTS_FILE = path.join(DATA_DIR, 'products.json')
const REVIEWS_FILE = path.join(DATA_DIR, 'reviews.json')

export interface Supplier {
  id: string
  name: string
  contact?: string
  phone?: string
  email?: string
  address?: string
  region?: string
  status: 'active' | 'inactive'
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface Product {
  id: string
  code?: string
  name: string
  nameEn?: string
  subtitle: string
  subtitleEn?: string
  description: string
  descriptionEn?: string
  story: string
  storyEn?: string
  price: number
  originalPrice?: number
  costPrice?: number
  stock?: number
  supplierId?: string
  supplier?: Supplier
  category: string
  tags: string[]
  tagsEn?: string[]
  image: string
  detailImages: string[]
  video?: string
  videoEnabled?: boolean
  craft: string
  craftEn?: string
  material: string
  origin: string
  rating: number
  reviewCount: number
  featured: boolean
  active: boolean
  /**
   * 赠品绑定（买一送一 / 免费搭配）。
   *
   * 购买本商品时，可以把 giftProductIds 里的商品**免费**拿走：
   *   - 绑 1 个   → 加购时自动带上该赠品（$0 行）
   *   - 绑多个    → 前台在商品页让客户自己选一个（参考站的 "Choose your free gift"）
   *   - 空 / 未设置 → 无赠品活动
   *
   * 存储：product_gifts 表（一行一个可赠商品），由仓库层聚合到这两个字段上。
   */
  giftProductIds?: string[]
  /** 一份主商品送几件赠品，默认 1 */
  giftQuantity?: number
  /**
   * 商品规格 / 款式。一个商品可以有多个款式，每个款式有自己的图片和价格。
   * 前台选不同款式时图片与价格联动切换；后台在商品编辑页维护。
   * 存储：product_variants 表，由仓库层聚合到这里。
   */
  variants?: ProductVariant[]
  /** 规格维度的名字，如 "Style" / "Color"（前台选择器上显示） */
  optionName?: string
  /**
   * 配套商品 / 搭配购买（bundle）。
   * 前台在商品页右侧展示「Frequently bought together」，
   * 勾选后实时算 单品价 / 组合优惠 / 总价，并可一键把多件一起加购。
   */
  bundles?: ProductBundle[]
  /**
   * 是否在商品列表（商店 / 搜索 / 分类页）中展示。默认 true。
   *
   * 与 active 的区别：
   *   active          = 是否可售（能下单、能当赠品/搭配）
   *   listingVisible  = 是否在列表里露出
   *
   * 用途：只在主商品编辑页里当赠品或搭配用的商品，设为 false 就不会出现在商店里，
   * 但它仍然可售、库存和价格照常参与计算。
   * ⚠️ 不能用 active=false 来做"隐藏" —— 那样会被赠品过滤逻辑排除掉
   *    （app/products/[id]/page.tsx 只收 active !== false 的赠品）。
   */
  listingVisible?: boolean
}

/** 一条搭配关系（对应 product_bundles 表一行） */
export interface ProductBundle {
  /** 被搭配的商品 id */
  bundleProductId: string
  /** 搭配标题，如 "Add a matching tray" */
  title?: string
  /** 搭配说明（为什么推荐一起买） */
  description?: string
  /** 搭配展示图；为空则用被搭配商品自己的主图 */
  image?: string
  /** 该商品在套餐里的价格；为空则用该商品原价 */
  price?: number
  /** 组合优惠金额（一起买能省多少） */
  discount?: number
  sortOrder?: number
  /** 仓库层聚合进来的被搭配商品完整信息（前台展示用，读取时才有） */
  product?: any
}

/** 单个商品款式（对应 product_variants 表一行） */
export interface ProductVariant {
  id: string
  productId: string
  /** 规格维度名，如 Style / Color */
  optionName?: string
  /** 款式名，如 "Zen Black" */
  label: string
  /** 供应商货号 / SKU（可选，对账用） */
  valueCode?: string
  /** 该款式价格；undefined = 沿用主商品价格 */
  price?: number
  /** 该款式主图；undefined = 沿用主商品图 */
  image?: string
  /** 该款式库存；undefined = 沿用主商品库存 */
  stock?: number
  sortOrder?: number
  active?: boolean
}

// 商品编码前缀推导已抽到 lib/product-code.ts —— 那是纯函数模块，
// 客户端组件（管理后台的商品表单）也要用它，而这个文件依赖 fs，不能进客户端包。
// 这里重新导出，保持服务端原有的 `import { categoryCodePrefix } from '@/lib/db'` 可用。
export { categoryCodePrefix }

// 根据分类生成规律性商品编码 (在该前缀下递增, 跳过已占用)
export function generateProductCode(category: string, existingCodes: Set<string>): string {
  const prefix = categoryCodePrefix(category)
  let maxNum = 0
  const re = new RegExp(`^${prefix}-(\\d+)$`)
  for (const code of existingCodes) {
    if (!code) continue
    const m = code.match(re)
    if (m) maxNum = Math.max(maxNum, parseInt(m[1], 10))
  }
  let num = maxNum + 1
  while (existingCodes.has(`${prefix}-${String(num).padStart(4, '0')}`)) num++
  return `${prefix}-${String(num).padStart(4, '0')}`
}

// 校验商品编码格式是否合法
export function isValidProductCode(code: string): boolean {
  return /^[A-Z]{2,4}-\d{3,6}$/.test(code)
}

export interface Review {
  id: string
  productId: string
  author: string
  avatar: string
  rating: number
  date: string
  content: string
  location: string
  orderId?: string
  customerEmail?: string
  source?: string
  approved?: boolean
  hidden?: boolean
  deleted?: boolean
  createdAt?: string
}

// ---- 读取 ----

export function getAllProducts(): Product[] {
  ensureFile(PRODUCTS_FILE)
  return getCachedData('products', PRODUCTS_FILE, () => {
    const raw = fs.readFileSync(PRODUCTS_FILE, 'utf-8').replace(/^\uFEFF/, '')
    return JSON.parse(raw) as Product[]
  }, CACHE_TTL.products)
}

export function getActiveProducts(): Product[] {
  return getAllProducts().filter((p) => p.active)
}

export function getProductById(id: string): Product | undefined {
  return getAllProducts().find((p) => p.id === id)
}

export function getProductsByCategory(slug: string): Product[] {
  return getActiveProducts().filter((p) => p.category === slug)
}

export function getFeaturedProducts(): Product[] {
  return getActiveProducts().filter((p) => p.featured)
}

// ---- 写入 ----

export function saveAllProducts(products: Product[]): void {
  fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(products, null, 2), 'utf-8')
  invalidateCache('products')
}

export function addProduct(product: Product): Product {
  const all = getAllProducts()
  all.push(product)
  saveAllProducts(all)
  return product
}

export function updateProduct(id: string, data: Partial<Product>): Product | null {
  const all = getAllProducts()
  const idx = all.findIndex((p) => p.id === id)
  if (idx === -1) return null
  all[idx] = { ...all[idx], ...data }
  saveAllProducts(all)
  return all[idx]
}

export function deleteProduct(id: string): boolean {
  const all = getAllProducts()
  const idx = all.findIndex((p) => p.id === id)
  if (idx === -1) return false
  all.splice(idx, 1)
  saveAllProducts(all)
  return true
}

// ---- 评价 ----

export function getAllReviews(): Review[] {
  ensureFile(REVIEWS_FILE)
  return getCachedData('reviews', REVIEWS_FILE, () => {
    const raw = fs.readFileSync(REVIEWS_FILE, 'utf-8').replace(/^\uFEFF/, '')
    return JSON.parse(raw) as Review[]
  }, CACHE_TTL.reviews)
}

export function getReviewsByProduct(productId: string): Review[] {
  return getAllReviews().filter((r) => r.productId === productId)
}

export function addReview(data: Omit<Review, 'id' | 'date' | 'avatar' | 'approved' | 'createdAt'> & { approved?: boolean }): Review {
  const all = getAllReviews()
  const review: Review = {
    id: 'REV-' + Date.now().toString(36).toUpperCase(),
    productId: data.productId,
    author: data.author || 'Anonymous',
    avatar: (data.author || 'A')[0].toUpperCase(),
    rating: data.rating,
    date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    content: data.content || '',
    location: data.location || 'Verified Buyer',
    approved: data.approved !== undefined ? data.approved : false,
    createdAt: new Date().toISOString(),
  }
  all.unshift(review as any)
  fs.writeFileSync(REVIEWS_FILE, JSON.stringify(all, null, 2), 'utf-8')
  invalidateCache('reviews')
  return review
}

export function updateReview(id: string, updates: Partial<Review>): Review | null {
  const all = getAllReviews()
  const idx = all.findIndex((r) => r.id === id)
  if (idx === -1) return null
  all[idx] = { ...all[idx], ...updates }
  fs.writeFileSync(REVIEWS_FILE, JSON.stringify(all, null, 2), 'utf-8')
  invalidateCache('reviews')
  return all[idx]
}

// ---- 辅助 ----

function ensureFile(filePath: string): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, '[]', 'utf-8')
  }
}
