import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth'
import {
  createSocialContentRecord,
  getAllSocialContent,
  getSocialContentByAccountId,
  getSocialContentById,
  getSocialContentStats,
  updateSocialContentRecord,
} from '@/lib/social-content'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const auth = requirePermission(req, 'messages_view')
    if ('error' in auth) return auth.error
    const canViewAll = ['super_admin', 'admin'].includes(auth.user.role)

    const { searchParams } = req.nextUrl
    const id = searchParams.get('id')
    const accountId = searchParams.get('accountId')
    const stats = searchParams.get('stats')
    const scopeRecords = () => {
      const records = accountId ? getSocialContentByAccountId(accountId) : getAllSocialContent()
      return canViewAll ? records : records.filter(record => record.staffId === auth.user.id)
    }

    if (stats === 'true') {
      const records = scopeRecords()
      const published = records.filter((record) => record.status === 'published').length
      const manual = records.filter((record) => record.status === 'manual_action_required').length
      const failed = records.filter((record) => record.status === 'failed').length
      const byPlatform: Record<string, number> = {}
      records.forEach((record) => {
        byPlatform[record.platform] = (byPlatform[record.platform] || 0) + 1
      })
      return NextResponse.json({
        total: records.length,
        published,
        manualActionRequired: manual,
        failed,
        byPlatform,
      })
    }

    if (id) {
      const record = getSocialContentById(id)
      if (!record || (!canViewAll && record.staffId !== auth.user.id)) {
        return NextResponse.json({ error: 'Record not found' }, { status: 404 })
      }
      return NextResponse.json({ success: true, record })
    }

    const records = scopeRecords()
    return NextResponse.json({ success: true, records, total: records.length })
  } catch (e) {
    console.error('[Social Content API] GET error:', e)
    return NextResponse.json({ error: 'Failed to fetch social content records' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = requirePermission(req, 'social_publish')
    if ('error' in auth) return auth.error

    const body = await req.json()
    const requiredFields = [
      'accountId',
      'staffId',
      'staffName',
      'platform',
      'platformName',
      'status',
      'publishMode',
      'contentTitle',
      'contentBody',
    ]

    const missingField = requiredFields.find((field) => !body[field])
    if (missingField) {
      return NextResponse.json({ error: `Missing required field: ${missingField}` }, { status: 400 })
    }

    const record = createSocialContentRecord({
      accountId: body.accountId,
      staffId: body.staffId,
      staffName: body.staffName,
      staffAvatar: body.staffAvatar,
      platform: body.platform,
      platformName: body.platformName,
      platformUsername: body.platformUsername,
      status: body.status,
      publishMode: body.publishMode,
      contentTitle: body.contentTitle,
      contentBody: body.contentBody,
      hashtags: body.hashtags,
      contentType: body.contentType,
      tone: body.tone,
      mediaUrl: body.mediaUrl,
      mediaType: body.mediaType,
      productId: body.productId,
      productName: body.productName,
      referralLinkId: body.referralLinkId,
      referralCode: body.referralCode,
      referralUrl: body.referralUrl,
      platformPostId: body.platformPostId,
      platformPostUrl: body.platformPostUrl,
      note: body.note,
      errorMessage: body.errorMessage,
      publishedAt: body.publishedAt,
    })

    return NextResponse.json({ success: true, record }, { status: 201 })
  } catch (e) {
    console.error('[Social Content API] POST error:', e)
    return NextResponse.json({ error: 'Failed to create social content record' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = requirePermission(req, 'social_publish')
    if ('error' in auth) return auth.error

    const body = await req.json()
    if (!body.id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    // 修复 C5: 非管理员只能更新自己的发帖记录
    const existing = getSocialContentById(body.id)
    if (!existing) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 })
    }
    if (!['super_admin', 'admin'].includes(auth.user.role) && existing.staffId !== auth.user.id) {
      return NextResponse.json({ error: 'Forbidden: not your record' }, { status: 403 })
    }

    const updated = updateSocialContentRecord(body.id, body)
    if (!updated) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, record: updated })
  } catch (e) {
    console.error('[Social Content API] PUT error:', e)
    return NextResponse.json({ error: 'Failed to update social content record' }, { status: 500 })
  }
}
