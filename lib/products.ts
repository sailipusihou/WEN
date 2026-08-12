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
