// 东方集市 · 公共类型与分类常量 — 客户端安全（无 Node.js 依赖）

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
   * 语义：购买本商品时，可以把 giftProductIds 里的商品**免费**拿走。
   *   - 绑 1 个   → 加购时自动带上该赠品（$0 行）
   *   - 绑多个    → 前台在商品页让客户选一个（参考站的 "Choose your free gift"）
   *   - 空 / 未设置 → 无赠品活动
   *
   * 存储位置：product_gifts 表（一行一个可赠商品）。这里由仓库层聚合出来，
   * 方便前台直接读 product.giftProductIds 判断要不要渲染赠品区。
   */
  giftProductIds?: string[]
  /** 一份主商品送几件赠品，默认 1 */
  giftQuantity?: number
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

export interface Category {
  slug: string
  name: string
  nameEn: string
  description: string
  descriptionEn: string
  icon: string
  productCount: number
  image: string
}
