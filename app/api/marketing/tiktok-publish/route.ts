import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth'
import { getSocialAccountById, updateSocialAccount } from '@/lib/social-accounts'
import { createTikTokVideoPost, uploadTikTokVideoChunk, refreshTikTokToken } from '@/lib/tiktok'
import fs from 'fs'
import path from 'path'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const auth = requirePermission(req, 'social_publish')
    if ('error' in auth) return auth.error

    const body = await req.json()
    const { accountId, title, description, privacyLevel, videoPath } = body

    if (!accountId) {
      return NextResponse.json({ error: 'Missing required field: accountId' }, { status: 400 })
    }

    if (!videoPath) {
      return NextResponse.json({ error: 'Missing required field: videoPath' }, { status: 400 })
    }

    const account = getSocialAccountById(accountId)
    if (!account) {
      return NextResponse.json({ error: 'Social account not found' }, { status: 404 })
    }

    if (account.platform !== 'tiktok') {
      return NextResponse.json({ error: 'This API only supports TikTok' }, { status: 400 })
    }

    if (!account.accessToken) {
      return NextResponse.json({ error: 'Account not properly connected. Please reconnect.' }, { status: 400 })
    }

    let accessToken = account.accessToken

    const shouldRefresh = !account.lastSync || (Date.now() - new Date(account.lastSync).getTime() > 55 * 60 * 1000)
    if (account.refreshToken && shouldRefresh) {
      try {
        const newTokens = await refreshTikTokToken(account.refreshToken)
        accessToken = newTokens.accessToken
        updateSocialAccount(accountId, {
          accessToken: newTokens.accessToken,
          refreshToken: newTokens.refreshToken,
          lastSync: new Date().toISOString(),
        })
      } catch {
        console.log('[TikTok Publish] Token refresh failed, using existing token')
      }
    }

    const resolvedPath = path.resolve(
      path.isAbsolute(videoPath) ? videoPath : path.join(process.cwd(), videoPath)
    )

    // 安全修复: 仅允许读取站点上传目录内的文件, 防止任意文件读取并外传
    const uploadsDir = path.resolve(process.cwd(), 'public', 'uploads')
    if (!resolvedPath.startsWith(uploadsDir + path.sep)) {
      return NextResponse.json({ error: 'Invalid video path: file must be inside the uploads directory' }, { status: 400 })
    }

    if (!fs.existsSync(resolvedPath)) {
      return NextResponse.json({ error: `Video file not found: ${videoPath}` }, { status: 400 })
    }

    const videoBuffer = fs.readFileSync(resolvedPath)
    const videoSize = videoBuffer.length

    if (videoSize > 1024 * 1024 * 102) {
      return NextResponse.json({ error: 'TikTok video exceeds 100MB limit' }, { status: 400 })
    }

    const privacy = privacyLevel || 'SELF_ONLY'

    const createResult = await createTikTokVideoPost(
      accessToken,
      videoSize,
      title,
      description,
      privacy
    )

    if (!createResult.uploadUrl) {
      return NextResponse.json({ error: 'Failed to get upload URL from TikTok' }, { status: 500 })
    }

    await uploadTikTokVideoChunk(createResult.uploadUrl, videoBuffer)

    return NextResponse.json({
      success: true,
      postId: createResult.postId,
      title: title || '',
      status: 'uploaded',
      message: 'Video uploaded successfully. TikTok is processing your video.',
    })
  } catch (e: any) {
    console.error('[TikTok Publish] POST error:', e)
    return NextResponse.json(
      { error: e.message || 'Failed to publish video to TikTok' },
      { status: 500 }
    )
  }
}
