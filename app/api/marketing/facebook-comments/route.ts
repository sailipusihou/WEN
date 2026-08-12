import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth'
import { getSocialAccountById, updateSocialAccount } from '@/lib/social-accounts'
import { getAllFacebookComments, getFacebookComments, replyFacebookComment, deleteFacebookComment, hideFacebookComment, refreshFacebookToken } from '@/lib/facebook'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const auth = requirePermission(req, 'messages_view')
    if ('error' in auth) return auth.error

    const { searchParams } = new URL(req.url)
    const accountId = searchParams.get('accountId')
    const postId = searchParams.get('postId')
    const mode = searchParams.get('mode') // 'single' | 'all'

    if (!accountId) {
      return NextResponse.json({ error: 'Missing accountId' }, { status: 400 })
    }

    const account = getSocialAccountById(accountId)
    if (!account || account.platform !== 'facebook' || !account.accessToken) {
      return NextResponse.json({ error: 'Invalid or disconnected account' }, { status: 400 })
    }

    const canViewAll = ['super_admin', 'admin'].includes(auth.user.role)
    if (!canViewAll && account.staffId !== auth.user.id) {
      return NextResponse.json({ error: 'Forbidden: you can only view your own accounts' }, { status: 403 })
    }

    let accessToken = account.accessToken
    const shouldRefresh = !account.lastSync || (Date.now() - new Date(account.lastSync).getTime() > 55 * 60 * 1000)
    if (account.refreshToken && shouldRefresh) {
      try {
        const newTokens = await refreshFacebookToken(account.refreshToken)
        accessToken = newTokens.accessToken
        updateSocialAccount(accountId, {
          accessToken: newTokens.accessToken,
          refreshToken: newTokens.refreshToken,
          lastSync: new Date().toISOString(),
        })
      } catch {
        console.log('[Facebook Comments] Token refresh failed, using existing')
      }
    }

    if (mode === 'all') {
      const comments = await getAllFacebookComments(accessToken)
      comments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      return NextResponse.json({ success: true, comments, total: comments.length })
    }

    if (!postId) {
      return NextResponse.json({ error: 'Missing postId (required when mode is not "all")' }, { status: 400 })
    }

    const comments = await getFacebookComments(accessToken, postId)
    return NextResponse.json({ success: true, comments, total: comments.length })
  } catch (err: any) {
    console.error('[Facebook Comments API] GET error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = requirePermission(req, 'messages_view')
    if ('error' in auth) return auth.error

    const body = await req.json()
    const { accountId, commentId, message, action } = body

    if (!accountId || !commentId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const account = getSocialAccountById(accountId)
    if (!account || account.platform !== 'facebook' || !account.accessToken) {
      return NextResponse.json({ error: 'Invalid or disconnected account' }, { status: 400 })
    }

    const canViewAll = ['super_admin', 'admin'].includes(auth.user.role)
    if (!canViewAll && account.staffId !== auth.user.id) {
      return NextResponse.json({ error: 'Forbidden: you can only reply on your own accounts' }, { status: 403 })
    }

    let accessToken = account.accessToken
    if (account.refreshToken) {
      try {
        const newTokens = await refreshFacebookToken(account.refreshToken)
        accessToken = newTokens.accessToken
        updateSocialAccount(accountId, {
          accessToken: newTokens.accessToken,
          refreshToken: newTokens.refreshToken,
          lastSync: new Date().toISOString(),
        })
      } catch {
        console.log('[Facebook Comments] Token refresh failed, using existing')
      }
    }

    // hide/unhide action
    if (action === 'hide' || action === 'unhide') {
      const result = await hideFacebookComment(accessToken, commentId, action === 'hide')
      return NextResponse.json({ success: true, result })
    }

    // default: reply
    if (!message) {
      return NextResponse.json({ error: 'Missing message' }, { status: 400 })
    }
    const result = await replyFacebookComment(accessToken, commentId, message)
    return NextResponse.json({ success: true, result })
  } catch (err: any) {
    console.error('[Facebook Comments API] POST error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = requirePermission(req, 'messages_view')
    if ('error' in auth) return auth.error

    const { searchParams } = new URL(req.url)
    const accountId = searchParams.get('accountId')
    const commentId = searchParams.get('commentId')

    if (!accountId || !commentId) {
      return NextResponse.json({ error: 'Missing accountId or commentId' }, { status: 400 })
    }

    const account = getSocialAccountById(accountId)
    if (!account || account.platform !== 'facebook' || !account.accessToken) {
      return NextResponse.json({ error: 'Invalid or disconnected account' }, { status: 400 })
    }

    const canViewAll = ['super_admin', 'admin'].includes(auth.user.role)
    if (!canViewAll && account.staffId !== auth.user.id) {
      return NextResponse.json({ error: 'Forbidden: you can only delete on your own accounts' }, { status: 403 })
    }

    let accessToken = account.accessToken
    if (account.refreshToken) {
      try {
        const newTokens = await refreshFacebookToken(account.refreshToken)
        accessToken = newTokens.accessToken
        updateSocialAccount(accountId, {
          accessToken: newTokens.accessToken,
          refreshToken: newTokens.refreshToken,
          lastSync: new Date().toISOString(),
        })
      } catch {
        console.log('[Facebook Comments] Token refresh failed, using existing')
      }
    }

    await deleteFacebookComment(accessToken, commentId)
    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[Facebook Comments API] DELETE error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
