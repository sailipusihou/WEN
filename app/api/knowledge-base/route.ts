// AI 知识库管理 API
import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth'
import { getAllKBEntries, addKBEntry, updateKBEntry, deleteKBEntry, searchKB } from '@/lib/knowledge-base'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET: 列出全部 / 搜索
export async function GET(req: NextRequest) {
  try {
    const auth = requirePermission(req, 'ai_assistant')
    if ('error' in auth) return auth.error

    const { searchParams } = req.nextUrl
    const q = searchParams.get('q') || ''
    const category = searchParams.get('category') || ''
    const limit = parseInt(searchParams.get('limit') || '50', 10)

    if (q) {
      const results = searchKB(q, limit)
      return NextResponse.json({ results, total: results.length, query: q })
    }

    let entries = getAllKBEntries()
    if (category) {
      entries = entries.filter(e => e.category === category)
    }
    return NextResponse.json({
      entries: entries.slice(0, limit),
      total: entries.length,
      categories: Array.from(new Set(getAllKBEntries().map(e => e.category))),
    })
  } catch (e) {
    console.error('[KB API] GET error:', e)
    return NextResponse.json({ error: 'Failed to fetch knowledge base' }, { status: 500 })
  }
}

// POST: 新增
export async function POST(req: NextRequest) {
  try {
    const auth = requirePermission(req, 'ai_assistant_config')
    if ('error' in auth) return auth.error

    const body = await req.json()

    if (!body.title || !body.title.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }
    if (!body.content || !body.content.trim()) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 })
    }

    const entry = addKBEntry({
      title: body.title.trim(),
      category: body.category?.trim() || '未分类',
      content: body.content.trim(),
      tags: Array.isArray(body.tags) ? body.tags : [],
    })

    return NextResponse.json(entry, { status: 201 })
  } catch (e) {
    console.error('[KB API] POST error:', e)
    return NextResponse.json({ error: 'Failed to create knowledge base entry' }, { status: 400 })
  }
}

// PUT: 更新
export async function PUT(req: NextRequest) {
  try {
    const auth = requirePermission(req, 'ai_assistant_config')
    if ('error' in auth) return auth.error

    const body = await req.json()
    if (!body.id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    const updates: any = {}
    if (body.title !== undefined) updates.title = body.title.trim()
    if (body.content !== undefined) updates.content = body.content.trim()
    if (body.category !== undefined) updates.category = body.category.trim() || '未分类'
    if (body.tags !== undefined) updates.tags = Array.isArray(body.tags) ? body.tags : []

    const updated = updateKBEntry(body.id, updates)
    if (!updated) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
    }
    return NextResponse.json(updated)
  } catch (e) {
    console.error('[KB API] PUT error:', e)
    return NextResponse.json({ error: 'Failed to update knowledge base entry' }, { status: 400 })
  }
}

// DELETE: 删除
export async function DELETE(req: NextRequest) {
  try {
    const auth = requirePermission(req, 'ai_assistant_config')
    if ('error' in auth) return auth.error

    const { searchParams } = req.nextUrl
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    const success = deleteKBEntry(id)
    if (!success) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
    }
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[KB API] DELETE error:', e)
    return NextResponse.json({ error: 'Failed to delete knowledge base entry' }, { status: 500 })
  }
}
