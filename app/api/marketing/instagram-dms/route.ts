import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth'
import { getSocialAccountById, updateSocialAccount } from '@/lib/social-accounts'
import { getInstagramConversations, sendInstagramDM, refreshInstagramToken } from '@/lib/instagram'

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
        const newTokens = await refreshInstagramToken(account.refreshToken)
        accessToken = newTokens.accessToken
        updateSocialAccount(accountId, {
          accessToken: newTokens.accessToken,
          lastSync: new Date().toISOString(),
        })
      } catch {
        console.log('[Instagram DMs] Token refresh failed, using existing')
      }
    }

    const conversations = await getInstagramConversations(accessToken)
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
    const { accountId, recipientId, message } = body

    if (!accountId || !recipientId || !message) {
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
        const newTokens = await refreshInstagramToken(account.refreshToken)
        accessToken = newTokens.accessToken
        updateSocialAccount(accountId, {
          accessToken: newTokens.accessToken,
          lastSync: new Date().toISOString(),
        })
      } catch {
        console.log('[Instagram DMs] Token refresh failed, using existing')
      }
    }

    const result = await sendInstagramDM(accessToken, recipientId, message)
    return NextResponse.json({ success: true, result })
  } catch (err: any) {
    console.error('[Instagram DMs API] POST error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
