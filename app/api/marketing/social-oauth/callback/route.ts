import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth'
import { getSettings, saveSettings } from '@/lib/settings'
import { getPendingSocialOAuth, removePendingSocialOAuth } from '@/lib/social-oauth-store'
import { addSocialAccount, getSocialAccountByPlatform, updateSocialAccount } from '@/lib/social-accounts'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const PLATFORM_CONFIG: Record<string, {
  enabledKey: string
  clientIdKey: string
  clientSecretKey: string
  callbackUrlKey: string
  tokenUrl: string
  userInfoUrl: string
  userInfoMethod: 'token' | 'header'
  userInfoFields: string[]
}> = {
  facebook: {
    enabledKey: 'fbApiEnabled',
    clientIdKey: 'fbClientId',
    clientSecretKey: 'fbClientSecret',
    callbackUrlKey: 'fbCallbackUrl',
    tokenUrl: 'https://graph.facebook.com/v18.0/oauth/access_token',
    userInfoUrl: 'https://graph.facebook.com/v18.0/me',
    userInfoMethod: 'token',
    userInfoFields: ['id', 'name', 'picture.type(large)', 'link'],
  },
  instagram: {
    enabledKey: 'igApiEnabled',
    clientIdKey: 'igClientId',
    clientSecretKey: 'igClientSecret',
    callbackUrlKey: 'igCallbackUrl',
    tokenUrl: 'https://api.instagram.com/oauth/access_token',
    userInfoUrl: 'https://graph.instagram.com/me',
    userInfoMethod: 'token',
    userInfoFields: ['id', 'username', 'name', 'biography', 'website', 'followers_count', 'follows_count', 'media_count', 'profile_picture_url'],
  },
  linkedin: {
    enabledKey: 'liApiEnabled',
    clientIdKey: 'liClientId',
    clientSecretKey: 'liClientSecret',
    callbackUrlKey: 'liCallbackUrl',
    tokenUrl: 'https://www.linkedin.com/oauth/v2/accessToken',
    userInfoUrl: 'https://api.linkedin.com/v2/userinfo',
    userInfoMethod: 'header',
    userInfoFields: [],
  },
  youtube: {
    enabledKey: 'ytApiEnabled',
    clientIdKey: 'ytClientId',
    clientSecretKey: 'ytClientSecret',
    callbackUrlKey: 'ytCallbackUrl',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    userInfoUrl: 'https://www.googleapis.com/youtube/v3/channels',
    userInfoMethod: 'header',
    userInfoFields: [],
  },
  pinterest: {
    enabledKey: 'ptApiEnabled',
    clientIdKey: 'ptClientId',
    clientSecretKey: 'ptClientSecret',
    callbackUrlKey: 'ptCallbackUrl',
    tokenUrl: 'https://api.pinterest.com/v5/oauth/token',
    userInfoUrl: 'https://api.pinterest.com/v5/account',
    userInfoMethod: 'header',
    userInfoFields: [],
  },
  tiktok: {
    enabledKey: 'tkApiEnabled',
    clientIdKey: 'tkClientId',
    clientSecretKey: 'tkClientSecret',
    callbackUrlKey: 'tkCallbackUrl',
    tokenUrl: 'https://open.tiktokapis.com/v2/oauth2/token/',
    userInfoUrl: 'https://open.tiktokapis.com/v2/user/info/',
    userInfoMethod: 'header',
    userInfoFields: [],
  },
}

const PROXY_URL = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || ''

async function fetchWithProxy(url: string, options: RequestInit = {}): Promise<Response> {
  if (PROXY_URL) {
    const { ProxyAgent } = await import('undici')
    const agent = new ProxyAgent(PROXY_URL)
    return fetch(url, { ...options, dispatcher: agent as any } as any)
  }
  return fetch(url, options)
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const platform = searchParams.get('platform')
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    const hubMode = searchParams.get('hub.mode')
    const hubChallenge = searchParams.get('hub.challenge')
    const hubVerifyToken = searchParams.get('hub.verify_token')

    if (hubMode === 'subscribe' && hubChallenge) {
      return new NextResponse(hubChallenge, {
        headers: { 'Content-Type': 'text/plain' },
      })
    }

    if (!platform || !PLATFORM_CONFIG[platform]) {
      return NextResponse.redirect(new URL('/admin/marketing?oauth=error&msg=Invalid+platform', req.nextUrl.origin))
    }

    if (error) {
      return NextResponse.redirect(new URL(`/admin/marketing?oauth=error&msg=${encodeURIComponent(error)}`, req.nextUrl.origin))
    }

    if (!code) {
      return NextResponse.redirect(new URL('/admin/marketing?oauth=error&msg=No+authorization+code', req.nextUrl.origin))
    }

    const pending = getPendingSocialOAuth(platform, state || '') || getPendingSocialOAuth(platform, 'pending')
    if (!pending) {
      return NextResponse.redirect(new URL('/admin/marketing?oauth=expired', req.nextUrl.origin))
    }

    const config = PLATFORM_CONFIG[platform]
    const settings = getSettings()

    const clientId = settings[config.clientIdKey as keyof typeof settings] as string
    const clientSecret = settings[config.clientSecretKey as keyof typeof settings] as string

    let callbackUrl = pending.extraData?.callbackUrl as string | undefined
    if (!callbackUrl) {
      callbackUrl = settings[config.callbackUrlKey as keyof typeof settings] as string
    }
    if (!callbackUrl) {
      callbackUrl = `${req.nextUrl.origin}/api/marketing/social-oauth/callback?platform=${platform}`
    }

    let accessToken: string
    let refreshToken: string | undefined

    if (platform === 'facebook') {
      const tokenParams = new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: callbackUrl,
        code,
      })

      // 如果 pending 中有 codeVerifier，使用 PKCE 验证
      if (pending.codeVerifier) {
        tokenParams.set('code_verifier', pending.codeVerifier)
      }

      const tokenRes = await fetchWithProxy(`${config.tokenUrl}?${tokenParams.toString()}`)
      if (!tokenRes.ok) {
        const errData = await tokenRes.json().catch(() => ({}))
        throw new Error(errData.error?.message || 'Token exchange failed')
      }
      const tokenData = await tokenRes.json()
      accessToken = tokenData.access_token
      refreshToken = tokenData.refresh_token || undefined
    } else if (platform === 'instagram') {
      const tokenParams = new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        redirect_uri: callbackUrl,
        code,
      })

      const tokenRes = await fetchWithProxy(config.tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: tokenParams.toString(),
      })
      if (!tokenRes.ok) {
        const errData = await tokenRes.json().catch(() => ({}))
        throw new Error(errData.error_message || errData.error_type || 'Instagram token exchange failed')
      }
      const tokenData = await tokenRes.json()
      const tokenEntry = tokenData?.data?.[0] || tokenData
      accessToken = tokenEntry.access_token
      const igUserId = tokenEntry.user_id || ''

      const settings = getSettings()
      if (settings.igClientSecret) {
        try {
          const longLivedParams = new URLSearchParams({
            grant_type: 'ig_exchange_token',
            client_secret: settings.igClientSecret,
            access_token: accessToken,
          })
          const longLivedRes = await fetchWithProxy(`https://graph.instagram.com/access_token?${longLivedParams.toString()}`)
          if (longLivedRes.ok) {
            const longLivedData = await longLivedRes.json()
            accessToken = longLivedData.access_token
            refreshToken = longLivedData.access_token
          }
        } catch {
          console.log('[Social OAuth] Long-lived token exchange failed, using short-lived token')
        }
      }
    } else if (platform === 'linkedin') {
      const tokenParams = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: callbackUrl,
      })

      const tokenRes = await fetchWithProxy(config.tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: tokenParams.toString(),
      })
      if (!tokenRes.ok) throw new Error('LinkedIn token exchange failed')
      const tokenData = await tokenRes.json()
      accessToken = tokenData.access_token
      refreshToken = tokenData.refresh_token
    } else if (platform === 'youtube') {
      const tokenParams = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: callbackUrl,
        client_id: clientId,
        client_secret: clientSecret,
      })

      const tokenRes = await fetchWithProxy(config.tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: tokenParams.toString(),
      })
      if (!tokenRes.ok) throw new Error('YouTube token exchange failed')
      const tokenData = await tokenRes.json()
      accessToken = tokenData.access_token
      refreshToken = tokenData.refresh_token
    } else if (platform === 'pinterest') {
      const tokenParams = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: callbackUrl,
      })

      const tokenRes = await fetchWithProxy(config.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        },
        body: tokenParams.toString(),
      })
      if (!tokenRes.ok) throw new Error('Pinterest token exchange failed')
      const tokenData = await tokenRes.json()
      accessToken = tokenData.access_token
      refreshToken = tokenData.refresh_token
    } else if (platform === 'tiktok') {
      const tokenParams = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: callbackUrl,
      })

      const tokenRes = await fetchWithProxy(config.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        },
        body: tokenParams.toString(),
      })
      if (!tokenRes.ok) throw new Error('TikTok token exchange failed')
      const tokenData = await tokenRes.json()
      accessToken = tokenData.access_token
      refreshToken = tokenData.refresh_token
    } else {
      throw new Error('Unsupported platform')
    }

    let userInfo: any = {}

    if (platform === 'facebook') {
      const fields = config.userInfoFields.join(',')
      const userRes = await fetchWithProxy(`${config.userInfoUrl}?fields=${fields}&access_token=${accessToken}`)
      if (userRes.ok) userInfo = await userRes.json()
    } else if (platform === 'instagram') {
      const fields = config.userInfoFields.join(',')
      const userRes = await fetchWithProxy(`${config.userInfoUrl}?fields=${fields}&access_token=${accessToken}`)
      if (userRes.ok) userInfo = await userRes.json()
    } else if (platform === 'linkedin') {
      const userRes = await fetchWithProxy(config.userInfoUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (userRes.ok) userInfo = await userRes.json()
    } else if (platform === 'youtube') {
      const userRes = await fetchWithProxy(`${config.userInfoUrl}?mine=true&part=snippet,statistics`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (userRes.ok) {
        const data = await userRes.json()
        const channel = data.items?.[0]
        if (channel) {
          userInfo = {
            id: channel.id,
            name: channel.snippet?.title || '',
            username: channel.snippet?.customUrl || '',
            picture: channel.snippet?.thumbnails?.default?.url,
            subscribers: channel.statistics?.subscriberCount || '0',
            videos: channel.statistics?.videoCount || '0',
            views: channel.statistics?.viewCount || '0',
          }
        }
      }
    } else if (platform === 'pinterest') {
      const userRes = await fetchWithProxy(config.userInfoUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (userRes.ok) {
        const data = await userRes.json()
        userInfo = {
          id: data.username || data.id,
          name: data.full_name || data.username || '',
          username: data.username || '',
          picture: data.profile_image || '',
        }
      }
    } else if (platform === 'tiktok') {
      const userRes = await fetchWithProxy(config.userInfoUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (userRes.ok) {
        const data = await userRes.json()
        const userData = data.data?.user || {}
        userInfo = {
          id: userData.id || '',
          name: userData.display_name || '',
          username: userData.username || '',
          picture: userData.avatar_url || '',
          followers: userData.follower_count || 0,
          videos: userData.video_count || 0,
        }
      }
    }

    const profileUrl = userInfo.link ||
      (platform === 'facebook' ? `https://facebook.com/${userInfo.id}` : '') ||
      (platform === 'instagram' ? `https://instagram.com/${userInfo.username}` : '') ||
      (platform === 'linkedin' ? `https://linkedin.com/in/${userInfo.sub}` : '') ||
      (platform === 'youtube' ? `https://youtube.com/@${userInfo.username}` : '') ||
      (platform === 'pinterest' ? `https://pinterest.com/${userInfo.username}` : '') ||
      (platform === 'tiktok' ? `https://tiktok.com/@${userInfo.username}` : '') ||
      ''

    const displayName = userInfo.name || userInfo.display_name || pending.staffName
    const displayUsername = userInfo.username || userInfo.sub || displayName || (userInfo.id ? String(userInfo.id).substring(0, 30) : '')
    const displayAvatar = 
      (platform === 'facebook' ? userInfo.picture?.data?.url : '') ||
      (platform === 'instagram' ? userInfo.profile_picture_url : '') ||
      userInfo.picture || userInfo.avatar_url || userInfo.profileImage || userInfo.thumbnailUrl || ''

    const now = new Date().toISOString()
    const mode = pending.extraData?.mode as string | undefined
    // 当 mode=add 时，跳过已有账户检查，始终添加新账户
    const existing = mode === 'add' ? null : getSocialAccountByPlatform(pending.staffId, platform)
    if (existing) {
      updateSocialAccount(existing.id, {
        username: displayUsername || existing.username,
        avatar: displayAvatar || existing.avatar,
        profileUrl: profileUrl || existing.profileUrl,
        accessToken,
        refreshToken,
        status: 'connected',
        isOnline: true,
        lastOnlineCheck: now,
        lastSync: now,
      })
    } else {
      addSocialAccount({
        staffId: pending.staffId,
        staffName: pending.staffName,
        staffAvatar: pending.staffAvatar,
        platform,
        platformName: platform.charAt(0).toUpperCase() + platform.slice(1),
        username: displayUsername,
        avatar: displayAvatar,
        profileUrl,
        accessToken,
        refreshToken,
      })
    }

    // 清理 pending 状态，同时尝试 state 和 'pending' 键
    removePendingSocialOAuth(platform, state || '')
    if (state) {
      removePendingSocialOAuth(platform, 'pending')
    }

    return NextResponse.redirect(new URL(`/admin/marketing?oauth=success&platform=${platform}`, req.nextUrl.origin))
  } catch (e: any) {
    console.error('[Social OAuth Callback] error:', e)
    return NextResponse.redirect(
      new URL(`/admin/marketing?oauth=error&msg=${encodeURIComponent(e.message || 'Unknown error')}`, req.nextUrl.origin)
    )
  }
}
