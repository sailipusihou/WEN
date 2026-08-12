// 营销内容管理 API
import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth'
import { getAllMarketingContent, addMarketingContent, updateMarketingContent, deleteMarketingContent, searchMarketingContent } from '@/lib/marketing-content'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const auth = requirePermission(req, 'settings_view')
    if ('error' in auth) return auth.error

    const { searchParams } = req.nextUrl
    const q = searchParams.get('q') || ''
    const type = searchParams.get('type') || ''
    const platform = searchParams.get('platform') || ''
    const limit = parseInt(searchParams.get('limit') || '50', 10)

    if (q) {
      const results = searchMarketingContent(q, limit)
      return NextResponse.json({ results, total: results.length, query: q })
    }

    let entries = getAllMarketingContent()
    if (type) {
      entries = entries.filter(e => e.type === type)
    }
    if (platform) {
      entries = entries.filter(e => e.platform === platform)
    }

    const stats = {
      total: entries.length,
      drafts: entries.filter(e => e.status === 'draft').length,
      published: entries.filter(e => e.status === 'published').length,
      byPlatform: {} as Record<string, number>,
      byType: {} as Record<string, number>,
    }
    entries.forEach(e => {
      stats.byPlatform[e.platform] = (stats.byPlatform[e.platform] || 0) + 1
      stats.byType[e.type] = (stats.byType[e.type] || 0) + 1
    })

    return NextResponse.json({
      entries: entries.slice(0, limit),
      total: entries.length,
      stats,
    })
  } catch (e) {
    console.error('[Marketing API] GET error:', e)
    return NextResponse.json({ error: 'Failed to fetch marketing content' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = requirePermission(req, 'settings_manage')
    if ('error' in auth) return auth.error

    const body = await req.json()

    if (!body.title || !body.title.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }
    if (!body.content || !body.content.trim()) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 })
    }

    const entry = addMarketingContent({
      title: body.title.trim(),
      type: body.type || 'social_post',
      platform: body.platform || 'general',
      productId: body.productId,
      productName: body.productName,
      content: body.content.trim(),
      hashtags: Array.isArray(body.hashtags) ? body.hashtags : [],
      mediaUrls: Array.isArray(body.mediaUrls) ? body.mediaUrls : [],
      imagePrompt: body.imagePrompt || '',
      tone: body.tone || 'professional',
      status: body.status || 'draft',
    })

    return NextResponse.json(entry, { status: 201 })
  } catch (e) {
    console.error('[Marketing API] POST error:', e)
    return NextResponse.json({ error: 'Failed to create marketing content' }, { status: 400 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = requirePermission(req, 'settings_manage')
    if ('error' in auth) return auth.error

    const body = await req.json()
    if (!body.id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    const updates: any = {}
    if (body.title !== undefined) updates.title = body.title.trim()
    if (body.content !== undefined) updates.content = body.content.trim()
    if (body.type !== undefined) updates.type = body.type
    if (body.platform !== undefined) updates.platform = body.platform
    if (body.productId !== undefined) updates.productId = body.productId
    if (body.productName !== undefined) updates.productName = body.productName
    if (body.hashtags !== undefined) updates.hashtags = Array.isArray(body.hashtags) ? body.hashtags : []
    if (body.mediaUrls !== undefined) updates.mediaUrls = Array.isArray(body.mediaUrls) ? body.mediaUrls : []
    if (body.imagePrompt !== undefined) updates.imagePrompt = body.imagePrompt
    if (body.tone !== undefined) updates.tone = body.tone
    if (body.status !== undefined) updates.status = body.status

    const updated = updateMarketingContent(body.id, updates)
    if (!updated) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 })
    }
    return NextResponse.json(updated)
  } catch (e) {
    console.error('[Marketing API] PUT error:', e)
    return NextResponse.json({ error: 'Failed to update marketing content' }, { status: 400 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = requirePermission(req, 'settings_manage')
    if ('error' in auth) return auth.error

    const { searchParams } = req.nextUrl
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    const success = deleteMarketingContent(id)
    if (!success) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 })
    }
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[Marketing API] DELETE error:', e)
    return NextResponse.json({ error: 'Failed to delete marketing content' }, { status: 500 })
  }
}
