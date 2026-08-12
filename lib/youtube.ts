import { getSettings } from '@/lib/settings'
import { HttpsProxyAgent } from 'https-proxy-agent'
import https from 'https'
import http from 'http'
import { ProxyAgent } from 'undici'

const PROXY_URL = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || ''

let proxyAgent: HttpsProxyAgent<string> | null = null
let undiciProxyAgent: ProxyAgent | null = null

if (PROXY_URL) {
  proxyAgent = new HttpsProxyAgent(PROXY_URL)
  ;(https as any).globalAgent = proxyAgent
  ;(http as any).globalAgent = proxyAgent
  undiciProxyAgent = new ProxyAgent(PROXY_URL)
  console.log('[YouTube] Proxy enabled:', PROXY_URL)
}

function getFetchOptions(): RequestInit {
  if (undiciProxyAgent) {
    return { dispatcher: undiciProxyAgent } as any
  }
  return {}
}

export interface YouTubeChannelInfo {
  id: string
  title: string
  description: string
  thumbnailUrl?: string
  subscriberCount: string
  videoCount: string
  viewCount: string
  country?: string
  customUrl?: string
}

export interface YouTubeVideoItem {
  id: string
  title: string
  description: string
  thumbnailUrl?: string
  publishedAt: string
  viewCount: string
  likeCount: string
  commentCount: string
  duration: string
  url: string
}

export interface YouTubeUploadResult {
  uploadUrl: string
  videoId?: string
  title?: string
}

function generateState(): string {
  return Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2)
}

export async function generateYouTubeAuthLink(
  callbackUrl: string,
  state?: string
): Promise<{ url: string; state: string }> {
  const settings = getSettings()

  if (!settings.ytApiEnabled) {
    throw new Error('YouTube API is not enabled. Please enable YouTube API in settings.')
  }

  if (!settings.ytClientId || !settings.ytClientSecret) {
    throw new Error('YouTube API OAuth 2.0 is not configured. Please set up Client ID and Client Secret in settings.')
  }

  const authState = state || generateState()

  const scopes = [
    'https://www.googleapis.com/auth/youtube.readonly',
    'https://www.googleapis.com/auth/youtube',
    'https://www.googleapis.com/auth/youtube.upload',
    'openid',
    'email',
    'profile',
  ]

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: settings.ytClientId,
    redirect_uri: callbackUrl,
    scope: scopes.join(' '),
    state: authState,
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
  })

  const url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  console.log('[YouTube] Auth link generated')

  return { url, state: authState }
}

export async function exchangeYouTubeCode(
  code: string,
  redirectUri: string
): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
  const settings = getSettings()

  if (!settings.ytClientId || !settings.ytClientSecret) {
    throw new Error('YouTube API OAuth 2.0 is not configured')
  }

  const tokenUrl = 'https://oauth2.googleapis.com/token'
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code: code,
    redirect_uri: redirectUri,
    client_id: settings.ytClientId,
    client_secret: settings.ytClientSecret,
  })

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
    ...getFetchOptions(),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    console.error('[YouTube] Token exchange error:', errorData)
    throw new Error(`Token exchange failed: ${errorData.error_description || errorData.error || 'Unknown error'}`)
  }

  const data = await response.json()
  console.log('[YouTube] Token exchanged successfully')

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  }
}

export async function getYouTubeUserInfo(accessToken: string): Promise<YouTubeChannelInfo> {
  const settings = getSettings()

  const params = new URLSearchParams({
    part: 'snippet,statistics,brandingSettings',
    mine: 'true',
    key: settings.ytApiKey || '',
  })

  const response = await fetch(
    `https://www.googleapis.com/youtube/v3/channels?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      ...getFetchOptions(),
    }
  )

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    console.error('[YouTube] User info error:', errorData)
    throw new Error(`Failed to get YouTube user info: ${errorData.error?.message || 'Unknown error'}`)
  }

  const data = await response.json()

  if (!data.items || data.items.length === 0) {
    throw new Error('No YouTube channel found for this account')
  }

  const channel = data.items[0]
  const snippet = channel.snippet || {}
  const statistics = channel.statistics || {}
  const brandingSettings = channel.brandingSettings || {}

  return {
    id: channel.id,
    title: snippet.title || '',
    description: snippet.description || '',
    thumbnailUrl: snippet.thumbnails?.default?.url || '',
    subscriberCount: statistics.subscriberCount || '0',
    videoCount: statistics.videoCount || '0',
    viewCount: statistics.viewCount || '0',
    country: brandingSettings.channel?.country || '',
    customUrl: snippet.customUrl || '',
  }
}

export async function refreshYouTubeToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
  const settings = getSettings()

  if (!settings.ytClientId || !settings.ytClientSecret) {
    throw new Error('YouTube API OAuth 2.0 is not configured')
  }

  const tokenUrl = 'https://oauth2.googleapis.com/token'
  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: settings.ytClientId,
    client_secret: settings.ytClientSecret,
  })

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
    ...getFetchOptions(),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    console.error('[YouTube] Token refresh error:', errorData)
    throw new Error(`Token refresh failed: ${errorData.error_description || errorData.error || 'Unknown error'}`)
  }

  const data = await response.json()

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || refreshToken,
    expiresIn: data.expires_in,
  }
}

export async function getYouTubeChannelVideos(
  accessToken: string,
  maxResults: number = 10
): Promise<YouTubeVideoItem[]> {
  const settings = getSettings()

  const channelInfo = await getYouTubeUserInfo(accessToken)

  const searchParams = new URLSearchParams({
    part: 'snippet,contentDetails,statistics',
    channelId: channelInfo.id,
    order: 'date',
    type: 'video',
    maxResults: String(maxResults),
    key: settings.ytApiKey || '',
  })

  const searchResponse = await fetch(
    `https://www.googleapis.com/youtube/v3/search?${searchParams.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      ...getFetchOptions(),
    }
  )

  if (!searchResponse.ok) {
    const errorData = await searchResponse.json().catch(() => ({}))
    console.error('[YouTube] Timeline search error:', errorData)
    throw new Error(`Failed to fetch YouTube videos: ${errorData.error?.message || 'Unknown error'}`)
  }

  const searchData = await searchResponse.json()
  const videoIds: string[] = (searchData.items || []).map((item: any) => item.id.videoId)

  if (videoIds.length === 0) {
    return []
  }

  const videoParams = new URLSearchParams({
    part: 'snippet,statistics,contentDetails',
    id: videoIds.join(','),
    key: settings.ytApiKey || '',
  })

  const videoResponse = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?${videoParams.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      ...getFetchOptions(),
    }
  )

  if (!videoResponse.ok) {
    const errorData = await videoResponse.json().catch(() => ({}))
    console.error('[YouTube] Video details error:', errorData)
    throw new Error(`Failed to fetch video details: ${errorData.error?.message || 'Unknown error'}`)
  }

  const videoData = await videoResponse.json()

  return (videoData.items || []).map((video: any) => {
    const snippet = video.snippet || {}
    const statistics = video.statistics || {}
    const contentDetails = video.contentDetails || {}

    return {
      id: video.id,
      title: snippet.title || '',
      description: snippet.description || '',
      thumbnailUrl: snippet.thumbnails?.medium?.url || snippet.thumbnails?.default?.url || '',
      publishedAt: snippet.publishedAt || '',
      viewCount: statistics.viewCount || '0',
      likeCount: statistics.likeCount || '0',
      commentCount: statistics.commentCount || '0',
      duration: contentDetails.duration || '',
      url: `https://www.youtube.com/watch?v=${video.id}`,
    }
  })
}

export async function createYouTubeUpload(
  accessToken: string,
  metadata: {
    title: string
    description?: string
    tags?: string[]
    categoryId?: string
    privacyStatus?: 'private' | 'unlisted' | 'public'
  }
): Promise<YouTubeUploadResult> {
  const settings = getSettings()

  const body = {
    snippet: {
      title: metadata.title,
      description: metadata.description || '',
      tags: metadata.tags || [],
      categoryId: metadata.categoryId || '22',
    },
    status: {
      privacyStatus: metadata.privacyStatus || 'private',
    },
  }

  const boundary = 'boundary' + Math.random().toString(36).substring(2)

  const response = await fetch(
    `https://youtubeuploads.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status&key=${settings.ytApiKey || ''}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `application/json; charset=UTF-8`,
        'X-Upload-Content-Type': 'video/*',
        'X-Upload-Content-Length': '0',
      },
      body: JSON.stringify(body),
      ...getFetchOptions(),
    }
  )

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    console.error('[YouTube] Upload creation error:', errorData)
    throw new Error(`Failed to create YouTube upload: ${errorData.error?.message || 'Unknown error'}`)
  }

  const uploadUrl = response.headers.get('Location') || ''
  const data = await response.json().catch(() => ({}))

  return {
    uploadUrl,
    videoId: data.id,
    title: metadata.title,
  }
}