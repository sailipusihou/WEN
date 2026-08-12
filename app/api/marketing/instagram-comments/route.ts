import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth'
import { getSocialAccountById, updateSocialAccount } from '@/lib/social-accounts'
import { getInstagramComments, replyInstagramComment, deleteInstagramComment, refreshInstagramToken, getInstagramTimeline } from '@/lib/instagram'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const auth = requirePermission(req, 'messages_view')
    if ('error' in auth) return auth.error

    const { searchParams } = new URL(req.url)
    const accountId = searchParams.get('accountId')
    const mediaId = searchParams.get('mediaId')
    const mode = searchParams.get('mode') // 'single' | 'all'

    if (!accountId) {
      return NextResponse.json({ error: 'Missing accountId' }, { status: 400 })
    }

    const account = getSocialAccountById(accountId)
    if (!account || account.platform !== 'instagram' || !account.accessToken) {
      return NextResponse.json({ error: 'Invalid or disconnected account' }, { status: 400 })
    }

    // 校验账号归属：非管理员只能查看自己的账号
    const canViewAll = ['super_admin', 'admin'].includes(auth.user.role)
    if (!canViewAll && account.staffId !== auth.user.id) {
      return NextResponse.json({ error: 'Forbidden: you can only view your own accounts' }, { status: 403 })
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
        console.log('[Instagram Comments] Token refresh failed, using existing')
      }
    }

    if (mode === 'all') {
      // 获取该账号所有帖子的评论
      const timeline = await getInstagramTimeline(accessToken, 50)
      const allComments: any[] = []
      for (const media of timeline) {
        try {
          const comments = await getInstagramComments(accessToken, media.id)
          for (const comment of comments) {
            allComments.push({
              ...comment,
              mediaId: media.id,
              mediaCaption: media.caption?.substring(0, 80) || '',
              mediaPermalink: media.permalink || '',
              mediaType: media.media_type || '',
            })
          }
        } catch {
          // skip media with no comments or errors
        }
      }
      // 按时间倒序
      allComments.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      return NextResponse.json({ success: true, comments: allComments, total: allComments.length })
    }

    // 单条帖子评论
    if (!mediaId) {
      return NextResponse.json({ error: 'Missing mediaId (required when mode is not "all")' }, { status: 400 })
    }

    const comments = await getInstagramComments(accessToken, mediaId)
    return NextResponse.json({ success: true, comments, total: comments.length })
  } catch (err: any) {
    console.error('[Instagram Comments API] GET error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = requirePermission(req, 'messages_view')
    if ('error' in auth) return auth.error

    const body = await req.json()
    const { accountId, commentId, message } = body

    if (!accountId || !commentId || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const account = getSocialAccountById(accountId)
    if (!account || account.platform !== 'instagram' || !account.accessToken) {
      return NextResponse.json({ error: 'Invalid or disconnected account' }, { status: 400 })
    }

    // 校验账号归属：非管理员只能回复自己账号下的评论
    const canViewAll = ['super_admin', 'admin'].includes(auth.user.role)
    if (!canViewAll && account.staffId !== auth.user.id) {
      return NextResponse.json({ error: 'Forbidden: you can only reply on your own accounts' }, { status: 403 })
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
        console.log('[Instagram Comments] Token refresh failed, using existing')
      }
    }

    const result = await replyInstagramComment(accessToken, commentId, message)
    return NextResponse.json({ success: true, result })
  } catch (err: any) {
    console.error('[Instagram Comments API] POST error:', err)
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
    if (!account || account.platform !== 'instagram' || !account.accessToken) {
      return NextResponse.json({ error: 'Invalid or disconnected account' }, { status: 400 })
    }

    // 校验账号归属：非管理员只能删除自己账号下的评论
    const canViewAll = ['super_admin', 'admin'].includes(auth.user.role)
    if (!canViewAll && account.staffId !== auth.user.id) {
      return NextResponse.json({ error: 'Forbidden: you can only delete on your own accounts' }, { status: 403 })
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
        console.log('[Instagram Comments] Token refresh failed, using existing')
      }
    }

    const result = await deleteInstagramComment(accessToken, commentId)
    return NextResponse.json({ success: true, result })
  } catch (err: any) {
    console.error('[Instagram Comments API] DELETE error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
