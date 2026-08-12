import { NextRequest, NextResponse } from 'next/server'
import { requirePermission, requireAdmin, getClientIp } from '@/lib/auth'
import {
  getAllReferralLinks,
  createReferralLink,
  updateReferralLink,
  deleteReferralLink,
  getReferralLinkById,
  getReferralLinkByCode,
  recordReferralClick,
  getReferralStats,
  getStaffReferralStats,
  type ReferralLink,
} from '@/lib/referral-tracking'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const id = searchParams.get('id')
    const code = searchParams.get('code')
    const staffId = searchParams.get('staffId')
    const stats = searchParams.get('stats')
    const staffStats = searchParams.get('staffStats')

    if (code) {
      const link = getReferralLinkByCode(code)
      if (!link) {
        return NextResponse.json({ error: 'Referral code not found' }, { status: 404 })
      }
      return NextResponse.json({ success: true, link })
    }

    if (stats === 'true') {
      const auth = requirePermission(req, 'messages_view')
      if ('error' in auth) return auth.error
      const result = getReferralStats()
      return NextResponse.json(result)
    }

    if (staffStats && staffId) {
      const auth = requirePermission(req, 'messages_view')
      if ('error' in auth) return auth.error
      const result = getStaffReferralStats(staffId)
      return NextResponse.json(result)
    }

    if (id) {
      const auth = requirePermission(req, 'messages_view')
      if ('error' in auth) return auth.error
      const link = getReferralLinkById(id)
      if (!link) {
        return NextResponse.json({ error: 'Referral link not found' }, { status: 404 })
      }
      return NextResponse.json(link)
    }

    const auth = requirePermission(req, 'messages_view')
    if ('error' in auth) return auth.error

    const links = getAllReferralLinks()
    return NextResponse.json({ links, total: links.length })
  } catch (e) {
    console.error('[Referral API] GET error:', e)
    return NextResponse.json({ error: 'Failed to fetch referral data' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const action = body.action

    if (action === 'click') {
      const { code, page, query, sourceChannel } = body
      if (!code) {
        return NextResponse.json({ error: 'Referral code is required' }, { status: 400 })
      }

      const link = getReferralLinkByCode(code)
      if (!link) {
        return NextResponse.json({ error: 'Invalid referral code' }, { status: 404 })
      }

      const ip = getClientIp(req) || ''
      const userAgent = req.headers.get('user-agent') || ''
      const visitorId = body.visitorId || `v_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

      const click = recordReferralClick({
        referralId: link.id,
        referralCode: link.code,
        staffId: link.staffId,
        platform: link.platform,
        visitorId,
        ip,
        userAgent,
        page: page || '/',
        query,
        sourceChannel: sourceChannel || link.preferredSourceChannel || 'direct',
      })

      return NextResponse.json({ success: true, click, visitorId }, { status: 201 })
    }

    // 其他操作需要权限
    const auth = requirePermission(req, 'messages_view')
    if ('error' in auth) return auth.error

    if (action === 'create') {
      if (!body.staffId || !body.staffName || !body.platform) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
      }

      const link = createReferralLink({
        staffId: body.staffId,
        staffName: body.staffName,
        staffAvatar: body.staffAvatar,
        platform: body.platform,
        platformUsername: body.platformUsername,
        productId: body.productId,
        productName: body.productName,
        contentTitle: body.contentTitle,
        contentBody: body.contentBody,
        hashtags: body.hashtags,
        contentType: body.contentType,
        tone: body.tone,
        publishedAt: body.publishedAt,
        preferredSourceChannel: body.preferredSourceChannel,
      })

      return NextResponse.json({ success: true, link }, { status: 201 })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (e) {
    console.error('[Referral API] POST error:', e)
    return NextResponse.json({ error: 'Failed to process referral action' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = requirePermission(req, 'messages_view')
    if ('error' in auth) return auth.error

    const body = await req.json()
    if (!body.id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    const updates: Partial<ReferralLink> = {}
    if (body.status !== undefined) updates.status = body.status as 'active' | 'inactive'
    if (body.platformUsername !== undefined) updates.platformUsername = body.platformUsername
    if (body.productId !== undefined) updates.productId = body.productId
    if (body.productName !== undefined) updates.productName = body.productName

    const updated = updateReferralLink(body.id, updates)
    if (!updated) {
      return NextResponse.json({ error: 'Referral link not found' }, { status: 404 })
    }
    return NextResponse.json({ success: true, link: updated })
  } catch (e) {
    console.error('[Referral API] PUT error:', e)
    return NextResponse.json({ error: 'Failed to update referral link' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = requirePermission(req, 'messages_view')
    if ('error' in auth) return auth.error

    const { searchParams } = req.nextUrl
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    const success = deleteReferralLink(id)
    if (!success) {
      return NextResponse.json({ error: 'Referral link not found' }, { status: 404 })
    }
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[Referral API] DELETE error:', e)
    return NextResponse.json({ error: 'Failed to delete referral link' }, { status: 500 })
  }
}
