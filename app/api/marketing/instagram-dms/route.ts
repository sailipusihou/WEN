import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth'
import { getSocialAccountById, updateSocialAccount } from '@/lib/social-accounts'
import { getInstagramConversations, sendInstagramDM, sendInstagramDMAttachment, refreshInstagramToken } from '@/lib/instagram'
import { cachedFetch, invalidateCacheKey } from '@/lib/marketing-cache'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const auth = requirePermission(req, 'messages_view')
    if ('error' in auth) return auth.error

    const { searchParams } = new URL(req.url)
    const accountId = searchParams.get('accountId')

    if (!accountId) {
      return NextResponse.json({ error: 'Missing accountId' }, { status: 400 })
    }

    const account = getSocialAccountById(accountId)
    if (!account || account.platform !== 'instagram' || !account.accessToken) {
      return NextResponse.json({ error: 'Invalid or disconnected account' }, { status: 400 })
    }

    const canViewAll = ['super_admin', 'admin'].includes(auth.user.role)
    if (!canViewAll && account.staffId !== auth.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    let accessToken = account.accessToken
    if (account.refreshToken) {
      try {
        const newTokens = await cachedFetch(`ig-refresh:${accountId}`, 10 * 60 * 1000, () => refreshInstagramToken(account.refreshToken as string))
        accessToken = newTokens.accessToken
        updateSocialAccount(accountId, {
          accessToken: newTokens.accessToken,
          refreshToken: newTokens.accessToken, // IG 长令牌刷新后滚动更新 (原缺陷: 60天窗口后永久失效)
          lastSync: new Date().toISOString(),
        })
      } catch {
        console.log('[Instagram DMs] Token refresh failed, using existing')
      }
    }

    const conversations = await cachedFetch(`ig-dms:${accountId}`, 8000, () => getInstagramConversations(accessToken))
    return NextResponse.json({ success: true, conversations, total: conversations.length })
  } catch (err: any) {
    console.error('[Instagram DMs API] GET error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = requirePermission(req, 'messages_view')
    if ('error' in auth) return auth.error

    const body = await req.json()
    const { accountId, recipientId, message, attachmentUrl, attachmentType } = body

    if (!accountId || !recipientId || (!message && !attachmentUrl)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const account = getSocialAccountById(accountId)
    if (!account || account.platform !== 'instagram' || !account.accessToken) {
      return NextResponse.json({ error: 'Invalid or disconnected account' }, { status: 400 })
    }

    const canViewAll = ['super_admin', 'admin'].includes(auth.user.role)
    if (!canViewAll && account.staffId !== auth.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    let accessToken = account.accessToken
    if (account.refreshToken) {
      try {
        const newTokens = await cachedFetch(`ig-refresh:${accountId}`, 10 * 60 * 1000, () => refreshInstagramToken(account.refreshToken as string))
        accessToken = newTokens.accessToken
        updateSocialAccount(accountId, {
          accessToken: newTokens.accessToken,
          refreshToken: newTokens.accessToken, // IG 长令牌刷新后滚动更新 (原缺陷: 60天窗口后永久失效)
          lastSync: new Date().toISOString(),
        })
      } catch {
        console.log('[Instagram DMs] Token refresh failed, using existing')
      }
    }

    if (attachmentUrl && attachmentType === 'image') {
      // IG 支持图片附件
      const result = await sendInstagramDMAttachment(accessToken, recipientId, attachmentUrl, message)
      invalidateCacheKey(`ig-dms:${accountId}`)
      return NextResponse.json({ success: true, result })
    }

    const result = await sendInstagramDM(accessToken, recipientId, message)
    invalidateCacheKey(`ig-dms:${accountId}`)
    return NextResponse.json({ success: true, result })
  } catch (err: any) {
    console.error('[Instagram DMs API] POST error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
