import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/auth'
import { getDatabaseBackend } from '@/lib/repository'
import { migrateJsonToSqlite } from '@/scripts/migrate-json-to-sqlite'
import { getDb, initDatabase } from '@/lib/db/sqlite'

// GET - 查看数据库状态
export async function GET(req: NextRequest) {
  const auth = requireSuperAdmin(req)
  if ('error' in auth) return auth.error

  const backend = getDatabaseBackend()

  try {
    if (backend === 'sqlite') {
      initDatabase()
      const db = getDb()
      const stats = {
        backend,
        dbFile: 'data/site.db',
        counts: {
          products: (db.prepare('SELECT COUNT(*) as c FROM products').get() as any).c,
          categories: (db.prepare('SELECT COUNT(*) as c FROM categories').get() as any).c,
          orders: (db.prepare('SELECT COUNT(*) as c FROM orders').get() as any).c,
          users: (db.prepare('SELECT COUNT(*) as c FROM users').get() as any).c,
          reviews: (db.prepare('SELECT COUNT(*) as c FROM reviews').get() as any).c,
          messages: (db.prepare('SELECT COUNT(*) as c FROM messages').get() as any).c,
        }
      }
      return NextResponse.json(stats)
    } else {
      return NextResponse.json({
        backend: 'json',
        message: 'Currently using JSON file backend',
        migrateUrl: '/api/admin/database/migrate',
      })
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// POST - 执行 JSON → SQLite 迁移
export async function POST(req: NextRequest) {
  const auth = requireSuperAdmin(req)
  if ('error' in auth) return auth.error

  try {
    const result = migrateJsonToSqlite()
    return NextResponse.json({
      success: result.errors.length === 0,
      ...result,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
