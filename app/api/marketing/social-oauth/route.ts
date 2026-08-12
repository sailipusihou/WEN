import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth'
import { getSettings } from '@/lib/settings'
import { savePendingSocialOAuth, generateOAuthState, generateCodeVerifier, generateCodeChallenge } from '@/lib/social-oauth-store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const PLATFORM_CONFIG: Record<string, {
  enabledKey: string
  clientIdKey: string
  clientSecretKey: string
  callbackUrlKey: string
  authUrl: string
  tokenUrl: string
  scope: string
}> = {
  facebook: {
    enabledKey: 'fbApiEnabled',
    clientIdKey: 'fbClientId',
    clientSecretKey: 'fbClientSecret',
    callbackUrlKey: 'fbCallbackUrl',
    authUrl: 'https://www.facebook.com/v18.0/dialog/oauth',
    tokenUrl: 'https://graph.facebook.com/v18.0/oauth/access_token',
    scope: 'pages_show_list,pages_read_engagement,pages_messaging',
  },
  instagram: {
    enabledKey: 'igApiEnabled',
    clientIdKey: 'igClientId',
    clientSecretKey: 'igClientSecret',
    callbackUrlKey: 'igCallbackUrl',
    authUrl: 'https://www.instagram.com/oauth/authorize',
    tokenUrl: 'https://api.instagram.com/oauth/access_token',
    scope: 'instagram_business_basic',
  },
  linkedin: {
    enabledKey: 'liApiEnabled',
    clientIdKey: 'liClientId',
    clientSecretKey: 'liClientSecret',
    callbackUrlKey: 'liCallbackUrl',
    authUrl: 'https://www.linkedin.com/oauth/v2/authorization',
    tokenUrl: 'https://www.linkedin.com/oauth/v2/accessToken',
    scope: 'openid,profile,email,w_member_social',
  },
  youtube: {
    enabledKey: 'ytApiEnabled',
    clientIdKey: 'ytClientId',
    clientSecretKey: 'ytClientSecret',
    callbackUrlKey: 'ytCallbackUrl',
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scope: 'https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/youtube https://www.googleapis.com/auth/youtube.openid',
  },
  pinterest: {
    enabledKey: 'ptApiEnabled',
    clientIdKey: 'ptClientId',
    clientSecretKey: 'ptClientSecret',
    callbackUrlKey: 'ptCallbackUrl',
    authUrl: 'https://www.pinterest.com/oauth/',
    tokenUrl: 'https://api.pinterest.com/v5/oauth/token',
    scope: 'user_accounts:read boards:read pins:read pins:write',
  },
  tiktok: {
    enabledKey: 'tkApiEnabled',
    clientIdKey: 'tkClientId',
    clientSecretKey: 'tkClientSecret',
    callbackUrlKey: 'tkCallbackUrl',
    authUrl: 'https://www.tiktok.com/open-apis/oauth2/authorize',
    tokenUrl: 'https://open.tiktokapis.com/v2/oauth2/token/',
    scope: 'user.info.basic,video.publish,video.list',
  },
}

export async function GET(req: NextRequest) {
  try {
    const auth = requirePermission(req, 'messages_view')
    if ('error' in auth) return auth.error

    const { searchParams } = req.nextUrl
    const platform = searchParams.get('platform')
    const staffId = searchParams.get('staffId')
    const staffName = searchParams.get('staffName')
    const staffAvatar = searchParams.get('staffAvatar')

    if (!platform || !PLATFORM_CONFIG[platform]) {
      return NextResponse.json({ error: 'Invalid platform' }, { status: 400 })
    }

    if (!staffId) {
      return NextResponse.json({ error: 'Staff ID required' }, { status: 400 })
    }

    const config = PLATFORM_CONFIG[platform]
    const settings = getSettings()

    if (!settings[config.enabledKey as keyof typeof settings]) {
      return NextResponse.json({ error: `${platform.toUpperCase()} API is not enabled in settings` }, { status: 400 })
    }

    const clientId = settings[config.clientIdKey as keyof typeof settings] as string
    if (!clientId) {
      return NextResponse.json({ error: `${platform.toUpperCase()} Client ID not configured` }, { status: 400 })
    }

    let callbackUrl = settings[config.callbackUrlKey as keyof typeof settings] as string
    if (!callbackUrl) {
      callbackUrl = `${req.nextUrl.origin}/api/marketing/social-oauth/callback?platform=${platform}`
    }

    const state = generateOAuthState()
    const codeVerifier = generateCodeVerifier()
    const codeChallenge = generateCodeChallenge(codeVerifier)

    savePendingSocialOAuth(platform, state, {
      platform,
      staffId,
      staffName: staffName || staffId,
      staffAvatar: staffAvatar || undefined,
      state,
      codeVerifier,
      extraData: {
        callbackUrl,
      },
    })

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: callbackUrl,
      state,
    })

    if (config.scope) {
      params.set('scope', config.scope)
    }

    if (platform === 'instagram') {
      const settings = getSettings()
      const igScopes = ['instagram_business_basic']
      if (settings.igContentPublishEnabled) {
        igScopes.push('instagram_business_content_publish')
      }
      if (settings.igManageMessagesEnabled) {
        igScopes.push('instagram_business_manage_messages')
      }
      if (settings.igManageCommentsEnabled) {
        igScopes.push('instagram_business_manage_comments')
      }
      params.set('scope', igScopes.join(','))
      if (settings.igForceReauth) {
        params.set('force_reauth', 'true')
      }
    } else if (platform !== 'facebook') {
      params.set('code_challenge', codeChallenge)
      params.set('code_challenge_method', 'S256')
    }

    const authUrl = `${config.authUrl}?${params.toString()}`

    return NextResponse.json({
      success: true,
      authUrl,
    })
  } catch (e) {
    console.error('[Social OAuth] GET error:', e)
    return NextResponse.json({ error: 'Failed to initiate OAuth' }, { status: 500 })
  }
}
