import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth'
import { getSocialAccountById, updateSocialAccount } from '@/lib/social-accounts'
import {
  getPinterestComments,
  replyPinterestComment,
  deletePinterestComment,
  getPinterestPins,
  refreshPinterestToken,
} from '@/lib/pinterest'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const auth = requirePermission(req, 'messages_view')
    if ('error' in auth) return auth.error

    const { searchParams } = new URL(req.url)
    const accountId = searchParams.get('accountId')
    const pinId = searchParams.get('pinId')
    const mode = searchParams.get('mode') // 'single' | 'all'

    if (!accountId) {
      return NextResponse.json({ error: 'Missing accountId' }, { status: 400 })
    }

    const account = getSocialAccountById(accountId)
    if (!account || account.platform !== 'pinterest' || !account.accessToken) {
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
        const newTokens = await refreshPinterestToken(account.refreshToken)
        accessToken = newTokens.accessToken
        updateSocialAccount(accountId, {
          accessToken: newTokens.accessToken,
          refreshToken: newTokens.refreshToken,
          lastSync: new Date().toISOString(),
        })
      } catch {
        console.log('[Pinterest Comments] Token refresh failed, using existing')
      }
    }

    if (mode === 'all') {
      // 获取所有 Pins 的评论
      const pins = await getPinterestPins(accessToken, 50)
      const allComments: any[] = []
      for (const pin of pins) {
        try {
          const comments = await getPinterestComments(accessToken, pin.id)
          for (const comment of comments) {
            allComments.push({
              ...comment,
              pinTitle: pin.title || '',
              pinImageUrl: pin.imageUrl || '',
              pinLink: pin.link || '',
            })
          }
        } catch {
          // skip pins with no comments or errors
        }
      }
      allComments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      return NextResponse.json({ success: true, comments: allComments, total: allComments.length })
    }

    // 单个 Pin 评论
    if (!pinId) {
      return NextResponse.json({ error: 'Missing pinId (required when mode is not "all")' }, { status: 400 })
    }

    const comments = await getPinterestComments(accessToken, pinId)
    return NextResponse.json({ success: true, comments, total: comments.length })
  } catch (err: any) {
    console.error('[Pinterest Comments API] GET error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = requirePermission(req, 'messages_view')
    if ('error' in auth) return auth.error

    const body = await req.json()
    const { accountId, pinId, message, parentCommentId } = body

    if (!accountId || !pinId || !message) {
      return NextResponse.json({ error: 'Missing required fields (accountId, pinId, message)' }, { status: 400 })
    }

    const account = getSocialAccountById(accountId)
    if (!account || account.platform !== 'pinterest' || !account.accessToken) {
      return NextResponse.json({ error: 'Invalid or disconnected account' }, { status: 400 })
    }

    const canViewAll = ['super_admin', 'admin'].includes(auth.user.role)
    if (!canViewAll && account.staffId !== auth.user.id) {
      return NextResponse.json({ error: 'Forbidden: you can only reply on your own accounts' }, { status: 403 })
    }

    let accessToken = account.accessToken
    if (account.refreshToken) {
      try {
        const newTokens = await refreshPinterestToken(account.refreshToken)
        accessToken = newTokens.accessToken
        updateSocialAccount(accountId, {
          accessToken: newTokens.accessToken,
          refreshToken: newTokens.refreshToken,
          lastSync: new Date().toISOString(),
        })
      } catch {
        console.log('[Pinterest Comments] Token refresh failed, using existing')
      }
    }

    const result = await replyPinterestComment(accessToken, pinId, message, parentCommentId)
    return NextResponse.json({ success: true, result })
  } catch (err: any) {
    console.error('[Pinterest Comments API] POST error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = requirePermission(req, 'messages_view')
    if ('error' in auth) return auth.error

    const { searchParams } = new URL(req.url)
    const accountId = searchParams.get('accountId')
    const pinId = searchParams.get('pinId')
    const commentId = searchParams.get('commentId')

    if (!accountId || !pinId || !commentId) {
      return NextResponse.json({ error: 'Missing accountId, pinId, or commentId' }, { status: 400 })
    }

    const account = getSocialAccountById(accountId)
    if (!account || account.platform !== 'pinterest' || !account.accessToken) {
      return NextResponse.json({ error: 'Invalid or disconnected account' }, { status: 400 })
    }

    const canViewAll = ['super_admin', 'admin'].includes(auth.user.role)
    if (!canViewAll && account.staffId !== auth.user.id) {
      return NextResponse.json({ error: 'Forbidden: you can only delete on your own accounts' }, { status: 403 })
    }

    let accessToken = account.accessToken
    if (account.refreshToken) {
      try {
        const newTokens = await refreshPinterestToken(account.refreshToken)
        accessToken = newTokens.accessToken
        updateSocialAccount(accountId, {
          accessToken: newTokens.accessToken,
          refreshToken: newTokens.refreshToken,
          lastSync: new Date().toISOString(),
        })
      } catch {
        console.log('[Pinterest Comments] Token refresh failed, using existing')
      }
    }

    await deletePinterestComment(accessToken, pinId, commentId)
    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[Pinterest Comments API] DELETE error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}