import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth'
import { publishXTweetOAuth2 } from '@/lib/x-twitter'
import { getSocialAccountById, canUserManageAccount } from '@/lib/social-accounts'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const auth = requirePermission(req, 'social_publish')
    if ('error' in auth) return auth.error

    const body = await req.json()
    const { accountId, text } = body

    if (!accountId || !text) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const account = getSocialAccountById(accountId)
    if (!account) {
      return NextResponse.json({ error: 'Social account not found' }, { status: 404 })
    }

    if (account.platform !== 'twitter' && account.platform !== 'x') {
      return NextResponse.json({ error: 'This API only supports X (Twitter)' }, { status: 400 })
    }

    // 修复: 非管理员不能使用他人的社交账号发布
    if (!canUserManageAccount(auth.user, account)) {
      return NextResponse.json({ error: 'Forbidden: not your account' }, { status: 403 })
    }

    if (!account.accessToken) {
      return NextResponse.json({ error: 'Account not properly connected. Please reconnect.' }, { status: 400 })
    }

    const result = await publishXTweetOAuth2(account.accessToken, text)

    return NextResponse.json({
      success: true,
      tweet: result,
    })
  } catch (e: any) {
    console.error('[X Publish] POST error:', e)
    return NextResponse.json(
      { error: e.message || 'Failed to publish tweet' },
      { status: 500 }
    )
  }
}
