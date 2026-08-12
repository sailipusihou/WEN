// 数据访问层统一入口
// 支持 JSON 文件 (默认) 和 SQLite 两种后端
// 通过环境变量 DATABASE_BACKEND 切换: 'json' | 'sqlite'
//
// 迁移指南:
// 1. 先运行迁移脚本: npx tsx scripts/migrate-json-to-sqlite.ts
// 2. 设置环境变量: DATABASE_BACKEND=sqlite
// 3. 重启服务即可切换到 SQLite
// 4. 回退只需去掉环境变量或设为 'json'

import type { Product, Review } from '@/lib/db'
import type { Order } from '@/lib/orders'
import type { User } from '@/lib/users'
import type { Category } from '@/lib/categories'
import type { SiteSettings, StaffMember } from '@/lib/settings'
import type { WorkLogEntry } from '@/lib/work-log'

export interface Message {
  id: string
  name: string
  email: string
  phone?: string
  subject?: string
  message: string
  status?: string
  createdAt: string
  read?: boolean
  replied?: boolean
  reply?: string
  replyText?: string
  attachments?: any[]
  adminReply?: string
  adminAttachments?: any[]
  adminName?: string
  adminAvatar?: string
  avatar?: string
  repliedAt?: string
  source?: string
  senderType?: 'customer' | 'admin'
  adminRead?: boolean
  chatType?: 'internal' | string
  fromStaffId?: string
  toStaffId?: string
  fromAvatar?: string
  fromName?: string
  toAvatar?: string
  toName?: string
  orderRef?: any
}

export interface NewsletterSubscriber {
  id: string
  email: string
  status: string
  createdAt: string
  subscribedAt?: string
  source?: string
}

// ========== 数据访问接口 ==========

import type { Supplier } from '@/lib/db'

export interface DataRepository {
  products: {
    list(): Product[]
    listActive(): Product[]
    getById(id: string): Product | undefined
    getByCategory(slug: string): Product[]
    add(product: Product): Product
    update(id: string, updates: Partial<Product>): Product | null
    delete(id: string): boolean
  }
  suppliers: {
    list(): Supplier[]
    getById(id: string): Supplier | undefined
    add(data: Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Supplier
    update(id: string, updates: Partial<Supplier>): Supplier | null
    delete(id: string): boolean
    getProductCount(id: string): number
  }
  reviews: {
    list(): Review[]
    getByProduct(productId: string): Review[]
    add(data: Omit<Review, 'id' | 'createdAt' | 'date' | 'avatar'> & { approved?: boolean; date?: string; avatar?: string }): Review
    update(id: string, updates: Partial<Review>): Review | null
  }
  orders: {
    list(): Order[]
    getById(id: string): Order | undefined
    add(order: Order): Order
    update(id: string, updates: Partial<Order>): Order | null
  }
  users: {
    list(): User[]
    getById(id: string): User | undefined
    getByEmail(email: string): User | undefined
    getByToken(token: string): User | undefined
    add(user: User): User
    update(id: string, updates: Partial<User>): User | null
  }
  categories: {
    list(): Category[]
    getBySlug(slug: string): Category | undefined
    add(category: Category): Category
    update(slug: string, updates: Partial<Category>): Category | null
    delete(slug: string): boolean
  }
  messages: {
    list(): Message[]
    getById(id: string): Message | undefined
    add(data: Omit<Message, 'id' | 'createdAt'> & Partial<Message>): Message
    update(id: string, updates: Partial<Message>): Message | null
  }
  settings: {
    get(): SiteSettings
    update(updates: Partial<SiteSettings>): SiteSettings
  }
  staff: {
    list(): StaffMember[]
    getById(id: string): StaffMember | undefined
    getByEmail(email: string): StaffMember | undefined
    add(data: Omit<StaffMember, 'id' | 'createdAt'> & Partial<StaffMember>): StaffMember
    update(id: string, updates: Partial<StaffMember>): StaffMember | null
    delete(id: string): boolean
  }
  newsletter: {
    list(): NewsletterSubscriber[]
    getByEmail(email: string): NewsletterSubscriber | undefined
    add(email: string, source?: string): NewsletterSubscriber
    delete(id: string): boolean
  }
  workLogs: {
    list(): WorkLogEntry[]
    add(data: Omit<WorkLogEntry, 'id' | 'timestamp'> & Partial<WorkLogEntry>): WorkLogEntry
  }
  browsingHistory: any
  customers: any
  shipments: any
}

// ========== JSON 后端 ==========
// 懒加载以避免 SQLite 不可用时出错

let jsonRepo: DataRepository | null = null

function getJsonRepository(): DataRepository {
  if (jsonRepo) return jsonRepo

  // 动态导入 JSON 模块, 避免在只用 SQLite 时加载不必要的文件
  const {
    getAllProducts: _getAllProducts,
    getProductById: _getProductById,
    getProductsByCategory: _getProductsByCategory,
    addProduct: _addProduct,
    updateProduct: _updateProduct,
    deleteProduct: _deleteProduct,
  } = require('@/lib/db')

  const {
    getAllReviews: _getAllReviews,
    getReviewsByProduct: _getReviewsByProduct,
    addReview: _addReview,
    updateReview: _updateReview,
  } = require('@/lib/db')

  const {
    getAllOrders: _getAllOrders,
    getOrderById: _getOrderById,
    addOrder: _addOrder,
    updateOrder: _updateOrder,
  } = require('@/lib/orders')

  const {
    getAllUsers: _getAllUsers,
    findUserById: _findUserById,
    findUserByEmail: _findUserByEmail,
    addUser: _addUser,
    updateUser: _updateUser,
  } = require('@/lib/users')

  const {
    getAllCategories: _getAllCategories,
    getCategoryBySlug: _getCategoryBySlug,
    addCategory: _addCategory,
    updateCategory: _updateCategory,
    deleteCategory: _deleteCategory,
  } = require('@/lib/categories')

  const {
    getSettings: _getSettings,
    saveSettings: _saveSettings,
  } = require('@/lib/settings')

  const {
    getAllLogs: _getAllLogs,
    addLog: _addLog,
  } = require('@/lib/work-log')

  const fs = require('fs')
  const path = require('path')
  const DATA_DIR = path.join(process.cwd(), 'data')
  const MESSAGES_FILE = path.join(DATA_DIR, 'messages.json')
  const NEWSLETTER_FILE = path.join(DATA_DIR, 'newsletter.json')

  function _readMessages(): Message[] {
    try {
      if (fs.existsSync(MESSAGES_FILE)) {
        const raw = fs.readFileSync(MESSAGES_FILE, 'utf-8').replace(/^\uFEFF/, '').trim()
        return JSON.parse(raw) || []
      }
    } catch {}
    return []
  }

  function _writeMessages(msgs: Message[]) {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
    fs.writeFileSync(MESSAGES_FILE, JSON.stringify(msgs, null, 2), 'utf-8')
  }

  function _readNewsletter(): NewsletterSubscriber[] {
    try {
      if (fs.existsSync(NEWSLETTER_FILE)) {
        const raw = fs.readFileSync(NEWSLETTER_FILE, 'utf-8').replace(/^\uFEFF/, '').trim()
        const arr = JSON.parse(raw) || []
        return arr.map((item: any, idx: number) => ({
          id: item.id || ('NL-' + (idx + 1)),
          email: item.email,
          status: item.status || 'active',
          createdAt: item.subscribedAt || item.createdAt || new Date().toISOString(),
          subscribedAt: item.subscribedAt || item.createdAt || new Date().toISOString(),
          source: item.source || 'footer',
        }))
      }
    } catch {}
    return []
  }

  function _writeNewsletter(list: NewsletterSubscriber[]) {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
    fs.writeFileSync(NEWSLETTER_FILE, JSON.stringify(list.map(item => ({
      email: item.email,
      subscribedAt: item.subscribedAt || item.createdAt,
      source: item.source || 'footer',
    })), null, 2), 'utf-8')
  }

  jsonRepo = {
    products: {
      list: _getAllProducts,
      listActive: () => _getAllProducts().filter((p: Product) => p.active !== false),
      getById: _getProductById,
      getByCategory: _getProductsByCategory,
      add: _addProduct,
      update: _updateProduct,
      delete: _deleteProduct,
    },
    suppliers: {
      list: () => [],
      getById: () => undefined,
      add: (data: any) => data,
      update: () => null,
      delete: () => false,
      getProductCount: () => 0,
    },
    reviews: {
      list: _getAllReviews,
      getByProduct: _getReviewsByProduct,
      add: _addReview,
      update: _updateReview,
    },
    orders: {
      list: _getAllOrders,
      getById: _getOrderById,
      add: _addOrder,
      update: _updateOrder,
    },
    users: {
      list: _getAllUsers,
      getById: _findUserById,
      getByEmail: _findUserByEmail,
      getByToken: (token: string) => _getAllUsers().find((u: User) => u.token === token),
      add: _addUser,
      update: _updateUser,
    },
    categories: {
      list: _getAllCategories,
      getBySlug: _getCategoryBySlug,
      add: (cat: Category) => {
        _addCategory(cat.slug, cat)
        return cat
      },
      update: (slug: string, updates: Partial<Category>) => {
        _updateCategory(slug, updates)
        return _getCategoryBySlug(slug) || null
      },
      delete: (slug: string) => {
        const before = _getAllCategories().length
        _deleteCategory(slug)
        const after = _getAllCategories().length
        return after < before
      },
    },
    messages: {
      list: _readMessages,
      getById: (id: string) => _readMessages().find((m: Message) => m.id === id),
      add: (data: Omit<Message, 'id' | 'createdAt'> & Partial<Message>) => {
        const all = _readMessages()
        const msg: Message = {
          ...data,
          id: data.id || ('MSG-' + Date.now().toString(36).toUpperCase()),
          createdAt: data.createdAt || new Date().toISOString(),
          read: data.read !== undefined ? data.read : false,
          replied: data.replied !== undefined ? data.replied : false,
          name: data.name || '',
          email: data.email || '',
          message: data.message || '',
          senderType: data.senderType || 'customer',
          chatType: data.chatType || undefined,
          fromStaffId: data.fromStaffId || undefined,
          toStaffId: data.toStaffId || undefined,
          fromAvatar: data.fromAvatar || undefined,
          fromName: data.fromName || undefined,
          toAvatar: data.toAvatar || undefined,
          toName: data.toName || undefined,
          orderRef: data.orderRef || undefined,
        } as Message
        all.unshift(msg)
        _writeMessages(all)
        return msg
      },
      update: (id: string, updates: Partial<Message>) => {
        const all = _readMessages()
        const idx = all.findIndex((m: Message) => m.id === id)
        if (idx === -1) return null
        all[idx] = { ...all[idx], ...updates }
        _writeMessages(all)
        return all[idx]
      },
    },
    settings: {
      get: _getSettings,
      update: (updates: Partial<SiteSettings>) => _saveSettings(updates),
    },
    staff: {
      list: () => _getSettings().staffMembers || [],
      getById: (id: string) => (_getSettings().staffMembers || []).find((s: StaffMember) => s.id === id),
      getByEmail: (email: string) => (_getSettings().staffMembers || []).find((s: StaffMember) => s.email.toLowerCase() === email.toLowerCase()),
      add: (data: Omit<StaffMember, 'id' | 'createdAt'> & Partial<StaffMember>) => {
        const settings = _getSettings()
        const staff = settings.staffMembers || []
        const member: StaffMember = {
          ...data,
          id: data.id || ('STF-' + Date.now().toString(36).toUpperCase()),
          createdAt: data.createdAt || new Date().toISOString(),
        } as StaffMember
        staff.push(member)
        _saveSettings({ staffMembers: staff })
        return member
      },
      update: (id: string, updates: Partial<StaffMember>) => {
        const settings = _getSettings()
        const staff = settings.staffMembers || []
        const idx = staff.findIndex((s: StaffMember) => s.id === id)
        if (idx === -1) return null
        staff[idx] = { ...staff[idx], ...updates }
        _saveSettings({ staffMembers: staff })
        return staff[idx]
      },
      delete: (id: string) => {
        const settings = _getSettings()
        const staff = settings.staffMembers || []
        const before = staff.length
        const filtered = staff.filter((s: StaffMember) => s.id !== id)
        if (filtered.length === before) return false
        _saveSettings({ staffMembers: filtered })
        return true
      },
    },
    newsletter: {
      list: _readNewsletter,
      getByEmail: (email: string) => _readNewsletter().find((s: NewsletterSubscriber) => s.email.toLowerCase() === email.toLowerCase()),
      add: (email: string, source = 'footer') => {
        const list = _readNewsletter()
        const normalized = email.toLowerCase().trim()
        const existing = list.find((s: NewsletterSubscriber) => s.email === normalized)
        if (existing) return existing
        const subscriber: NewsletterSubscriber = {
          id: 'NL-' + Date.now().toString(36).toUpperCase(),
          email: normalized,
          status: 'active',
          createdAt: new Date().toISOString(),
          subscribedAt: new Date().toISOString(),
          source,
        }
        list.push(subscriber)
        _writeNewsletter(list)
        return subscriber
      },
      delete: (id: string) => {
        const list = _readNewsletter()
        const before = list.length
        const filtered = list.filter((s: NewsletterSubscriber) => s.id !== id)
        if (filtered.length === before) return false
        _writeNewsletter(filtered)
        return true
      },
    },
    workLogs: {
      list: _getAllLogs,
      add: (data: Omit<WorkLogEntry, 'id' | 'timestamp'> & Partial<WorkLogEntry>) => _addLog(data),
    },
    shipments: {
      list: () => [],
      getByOrderId: () => [],
      getByTrackingNumber: () => null,
      getById: () => null,
      add: (data: any) => data,
      update: () => null,
      addTrackEvent: () => null,
      delete: () => false,
      getStats: () => ({ total: 0, inTransit: 0, delivered: 0, pending: 0 }),
    },
    browsingHistory: {},
    customers: {},
  }

  return jsonRepo
}

// ========== SQLite 后端 ==========

let sqliteRepo: DataRepository | null = null

function getSqliteRepository(): DataRepository {
  if (sqliteRepo) return sqliteRepo
  const {
    productRepo,
    supplierRepo,
    reviewRepo,
    orderRepo,
    userRepo,
    categoryRepo,
    messageRepo,
    settingsRepo,
    staffRepo,
    newsletterRepo,
    workLogRepo,
    browsingHistoryRepo,
    customerRepo,
    shipmentRepo,
  } = require('@/lib/db/repository-sqlite')

  sqliteRepo = {
    products: productRepo,
    suppliers: supplierRepo,
    reviews: reviewRepo,
    orders: orderRepo,
    users: userRepo,
    categories: categoryRepo,
    messages: messageRepo,
    settings: settingsRepo,
    staff: staffRepo,
    newsletter: newsletterRepo,
    workLogs: workLogRepo,
    browsingHistory: browsingHistoryRepo,
    customers: customerRepo,
    shipments: shipmentRepo,
  }

  return sqliteRepo
}

// ========== 获取当前后端 ==========

export type DatabaseBackend = 'json' | 'sqlite'

export function getDatabaseBackend(): DatabaseBackend {
  const backend = process.env.DATABASE_BACKEND || 'json'
  return backend === 'sqlite' ? 'sqlite' : 'json'
}

// 当前使用的 repository
let currentRepo: DataRepository | null = null

export function getRepository(): DataRepository {
  if (currentRepo) return currentRepo
  const backend = getDatabaseBackend()
  currentRepo = backend === 'sqlite' ? getSqliteRepository() : getJsonRepository()
  return currentRepo
}

// 供外部调用的便捷导出
export const repository = new Proxy({} as DataRepository, {
  get(_target, prop) {
    const repo = getRepository()
    return (repo as any)[prop]
  },
})
