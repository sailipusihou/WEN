import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth'
import { publishLinkedInPost } from '@/lib/linkedin'
import { getSocialAccountById } from '@/lib/social-accounts'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const auth = requirePermission(req, 'social_publish')
    if ('error' in auth) return auth.error

    const body = await req.json()
    const { accountId, content, authorUrn, visibility } = body

    if (!accountId || !content) {
      return NextResponse.json({ error: 'Missing required fields (accountId, content)' }, { status: 400 })
    }

    const account = getSocialAccountById(accountId)
    if (!account) {
      return NextResponse.json({ error: 'Social account not found' }, { status: 404 })
    }

    if (account.platform !== 'linkedin') {
      return NextResponse.json({ error: 'This API only supports LinkedIn' }, { status: 400 })
    }

    if (!account.accessToken) {
      return NextResponse.json({ error: 'Account not properly connected. Please reconnect.' }, { status: 400 })
    }

    const finalAuthorUrn = authorUrn || `urn:li:person:${account.username}`
    const result = await publishLinkedInPost(
      account.accessToken,
      finalAuthorUrn,
      content,
      visibility || 'PUBLIC'
    )

    return NextResponse.json({
      success: true,
      post: result,
    })
  } catch (e: any) {
    console.error('[LinkedIn Publish] POST error:', e)
    return NextResponse.json(
      { error: e.message || 'Failed to publish to LinkedIn' },
      { status: 500 }
    )
  }
}
