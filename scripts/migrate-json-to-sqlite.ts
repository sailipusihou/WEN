// JSON → SQLite 数据迁移脚本
// 用法: npx tsx scripts/migrate-json-to-sqlite.ts  (或 node 配合 ts-node)
// 也可以在管理后台触发 API: POST /api/admin/migrate-to-sqlite

import fs from 'fs'
import path from 'path'
import { getDb, initDatabase } from '../lib/db/sqlite'
import { productRepo, categoryRepo, orderRepo, userRepo, reviewRepo } from '../lib/db/repository-sqlite'
import type { Product } from '../lib/db'
import type { Category } from '../lib/categories'
import type { Order } from '../lib/orders'
import type { User } from '../lib/users'
import type { Review } from '../lib/db'

const DATA_DIR = path.join(process.cwd(), 'data')

function readJson(file: string): any[] {
  const p = path.join(DATA_DIR, file)
  if (!fs.existsSync(p)) return []
  try {
    const raw = fs.readFileSync(p, 'utf-8').replace(/^\uFEFF/, '')
    return JSON.parse(raw)
  } catch {
    return []
  }
}

export interface MigrationResult {
  products: number
  categories: number
  orders: number
  users: number
  reviews: number
  messages: number
  workLogs: number
  newsletter: number
  errors: string[]
}

export function migrateJsonToSqlite(): MigrationResult {
  const result: MigrationResult = {
    products: 0, categories: 0, orders: 0, users: 0, reviews: 0,
    messages: 0, workLogs: 0, newsletter: 0, errors: [],
  }

  try {
    // 初始化数据库
    initDatabase()
    const db = getDb()

    // 清空所有表 (避免重复迁移)
    const tables = ['order_items', 'product_tags', 'product_images', 'wishlist', 'user_addresses',
      'products', 'categories', 'orders', 'users', 'reviews', 'messages', 'work_logs', 'newsletter_subscribers']
    tables.forEach(t => {
      try { db.prepare(`DELETE FROM ${t}`).run() } catch {}
    })

    // ========== 迁移分类 ==========
    try {
      const categories = readJson('categories.json') as Category[]
      categories.forEach(cat => {
        try {
          categoryRepo.add(cat)
          result.categories++
        } catch (e: any) {
          result.errors.push(`Category ${cat.slug}: ${e.message}`)
        }
      })
    } catch (e: any) {
      result.errors.push(`Categories migration: ${e.message}`)
    }

    // ========== 迁移商品 ==========
    try {
      const products = readJson('products.json') as Product[]
      products.forEach(product => {
        try {
          productRepo.add(product)
          result.products++
        } catch (e: any) {
          result.errors.push(`Product ${product.id}: ${e.message}`)
        }
      })
    } catch (e: any) {
      result.errors.push(`Products migration: ${e.message}`)
    }

    // ========== 迁移用户 ==========
    try {
      const users = readJson('users.json') as User[]
      users.forEach(user => {
        try {
          userRepo.add(user)
          result.users++
        } catch (e: any) {
          result.errors.push(`User ${user.id}: ${e.message}`)
        }
      })
    } catch (e: any) {
      result.errors.push(`Users migration: ${e.message}`)
    }

    // ========== 迁移订单 ==========
    try {
      const orders = readJson('orders.json') as Order[]
      orders.forEach(order => {
        try {
          orderRepo.add(order)
          result.orders++
        } catch (e: any) {
          result.errors.push(`Order ${order.id}: ${e.message}`)
        }
      })
    } catch (e: any) {
      result.errors.push(`Orders migration: ${e.message}`)
    }

    // ========== 迁移评论 ==========
    try {
      const reviews = readJson('reviews.json') as Review[]
      reviews.forEach(review => {
        try {
          // 直接插入数据库, 跳过计数更新以加快速度
          const db = getDb()
          db.prepare(`
            INSERT INTO reviews (id, productId, author, avatar, rating, date, content, location, approved, createdAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(review.id, review.productId, review.author, review.avatar || (review.author || 'A')[0].toUpperCase(),
            review.rating, review.date, review.content, review.location, review.approved ? 1 : 0, review.createdAt || new Date().toISOString())
          result.reviews++
        } catch (e: any) {
          result.errors.push(`Review ${review.id}: ${e.message}`)
        }
      })
      // 批量更新商品评论计数
      const db = getDb()
      db.prepare(`
        UPDATE products SET reviewCount = (SELECT COUNT(*) FROM reviews WHERE reviews.productId = products.id)
      `).run()
    } catch (e: any) {
      result.errors.push(`Reviews migration: ${e.message}`)
    }

    // ========== 迁移消息 ==========
    try {
      const messages = readJson('messages.json') as any[]
      const db = getDb()
      const stmt = db.prepare(`
        INSERT INTO messages (id, name, email, phone, subject, message, status, createdAt)
        VALUES (@id, @name, @email, @phone, @subject, @message, @status, @createdAt)
      `)
      messages.forEach(msg => {
        try {
          stmt.run({
            id: msg.id, name: msg.name || '', email: msg.email || '', phone: msg.phone || '',
            subject: msg.subject || msg.title || '', message: msg.message || msg.content || '',
            status: msg.status || 'unread', createdAt: msg.createdAt || msg.timestamp || new Date().toISOString(),
          })
          result.messages++
        } catch (e: any) {
          result.errors.push(`Message ${msg.id}: ${e.message}`)
        }
      })
    } catch (e: any) {
      result.errors.push(`Messages migration: ${e.message}`)
    }

    // ========== 迁移工作日志 ==========
    try {
      const logs = readJson('work-log.json') as any[]
      const db = getDb()
      const stmt = db.prepare(`
        INSERT INTO work_logs (id, timestamp, operatorId, operatorName, operatorRole, action, details, orderId, productId, category)
        VALUES (@id, @timestamp, @operatorId, @operatorName, @operatorRole, @action, @details, @orderId, @productId, @category)
      `)
      logs.forEach(log => {
        try {
          stmt.run({
            id: log.id, timestamp: log.timestamp, operatorId: log.operatorId || '',
            operatorName: log.operatorName || '', operatorRole: log.operatorRole || '',
            action: log.action || '', details: log.details || '', orderId: log.orderId || null,
            productId: log.productId || null, category: log.category || null,
          })
          result.workLogs++
        } catch (e: any) {
          result.errors.push(`WorkLog ${log.id}: ${e.message}`)
        }
      })
    } catch (e: any) {
      result.errors.push(`Work logs migration: ${e.message}`)
    }

    // ========== 迁移 Newsletter ==========
    try {
      const subs = readJson('newsletter.json') as any[]
      const db = getDb()
      const stmt = db.prepare(`
        INSERT OR IGNORE INTO newsletter_subscribers (id, email, status, createdAt)
        VALUES (@id, @email, @status, @createdAt)
      `)
      subs.forEach((sub: any) => {
        try {
          stmt.run({
            id: sub.id || 'NL-' + Date.now().toString(36),
            email: sub.email || sub,
            status: sub.status || 'active',
            createdAt: sub.createdAt || sub.subscribedAt || new Date().toISOString(),
          })
          result.newsletter++
        } catch (e: any) {
          result.errors.push(`Newsletter ${sub.email || sub}: ${e.message}`)
        }
      })
    } catch (e: any) {
      result.errors.push(`Newsletter migration: ${e.message}`)
    }

  } catch (e: any) {
    result.errors.push(`Migration failed: ${e.message}`)
  }

  return result
}

// 如果直接运行此脚本, 执行迁移
if (require.main === module) {
  console.log('Starting JSON → SQLite migration...')
  const result = migrateJsonToSqlite()
  console.log('\n=== Migration Result ===')
  console.log(`Products:    ${result.products}`)
  console.log(`Categories:  ${result.categories}`)
  console.log(`Orders:      ${result.orders}`)
  console.log(`Users:       ${result.users}`)
  console.log(`Reviews:     ${result.reviews}`)
  console.log(`Messages:    ${result.messages}`)
  console.log(`Work logs:   ${result.workLogs}`)
  console.log(`Newsletter:  ${result.newsletter}`)
  if (result.errors.length > 0) {
    console.log(`\nErrors (${result.errors.length}):`)
    result.errors.forEach(e => console.log(`  - ${e}`))
  } else {
    console.log('\nAll data migrated successfully!')
  }
}
