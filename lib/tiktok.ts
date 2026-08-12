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
  console.log('[TikTok] Proxy enabled:', PROXY_URL)
}

function getFetchOptions(): RequestInit {
  if (undiciProxyAgent) {
    return { dispatcher: undiciProxyAgent } as any
  }
  return {}
}

export interface TikTokAuthResult {
  url: string
  state: string
  codeChallenge?: string
  codeVerifier?: string
}

export interface TikTokUserInfo {
  id: string
  username: string
  avatarUrl?: string
  nickname?: string
  bioDescription?: string
  followerCount?: number
  followingCount?: number
  likesCount?: number
  videoCount?: number
}

export interface TikTokVideoItem {
  id: string
  title?: string
  videoUrl?: string
  coverUrl?: string
  createTime?: string
  shareCount?: number
  viewCount?: number
  likeCount?: number
  commentCount?: number
}

export interface TikTokPublishResult {
  postId: string
  uploadUrl?: string
  status: string
}

function generateCodeVerifier(): string {
  const buffer = Buffer.alloc(32)
  for (let i = 0; i < 32; i++) {
    buffer[i] = Math.floor(Math.random() * 256)
  }
  return buffer.toString('base64url')
}

function generateCodeChallenge(verifier: string): string {
  const crypto = require('crypto')
  const hash = crypto.createHash('sha256').update(verifier).digest()
  return hash.toString('base64url')
}

function generateState(): string {
  return Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2)
}

export async function generateTikTokAuthLink(
  callbackUrl: string,
  state?: string,
  codeChallenge?: string
): Promise<TikTokAuthResult> {
  const settings = getSettings()

  if (!settings.tkApiEnabled) {
    throw new Error('TikTok API is not enabled. Please enable TikTok API in settings.')
  }

  if (!settings.tkClientId) {
    throw new Error('TikTok API is not configured. Please set up Client ID in settings.')
  }

  const finalState = state || generateState()
  let finalCodeVerifier: string | undefined
  let finalCodeChallenge: string | undefined

  if (codeChallenge) {
    finalCodeChallenge = codeChallenge
  } else {
    finalCodeVerifier = generateCodeVerifier()
    finalCodeChallenge = generateCodeChallenge(finalCodeVerifier)
  }

  const params = new URLSearchParams({
    client_key: settings.tkClientId,
    redirect_uri: callbackUrl,
    response_type: 'code',
    state: finalState,
    scope: 'user.info,video.list,video.publish',
  })

  if (finalCodeChallenge) {
    params.set('code_challenge', finalCodeChallenge)
    params.set('code_challenge_method', 'S256')
  }

  const url = `https://www.tiktok.com/open-apis/oauth2/authorize?${params.toString()}`
  console.log('[TikTok] Auth link generated')

  return {
    url,
    state: finalState,
    codeChallenge: finalCodeChallenge,
    codeVerifier: finalCodeVerifier,
  }
}

export async function exchangeTikTokCode(
  code: string,
  redirectUri: string,
  codeVerifier?: string
): Promise<{ accessToken: string; refreshToken?: string; expiresIn: number }> {
  const settings = getSettings()
  if (!settings.tkClientId || !settings.tkClientSecret) {
    throw new Error('TikTok API is not configured. Please set up Client ID and Client Secret in settings.')
  }

  const tokenUrl = 'https://open.tiktokapis.com/v2/oauth2/token/'
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code: code,
    redirect_uri: redirectUri,
    client_key: settings.tkClientId,
    client_secret: settings.tkClientSecret,
  })

  if (codeVerifier) {
    params.set('code_verifier', codeVerifier)
  }

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
    console.error('[TikTok] Token exchange error:', errorData)
    const errMsg = errorData?.error_description || errorData?.error || 'Unknown error'
    throw new Error(`TikTok token exchange failed: ${errMsg}`)
  }

  const data = await response.json()
  console.log('[TikTok] Token exchanged successfully')

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in || 86400,
  }
}

export async function getTikTokUserInfo(accessToken: string): Promise<TikTokUserInfo> {
  const params = new URLSearchParams({
    fields: 'id,username,avatar_url,nickname,bio_description,follower_count,following_count,likes_count,video_count',
  })

  const response = await fetch(`https://open.tiktokapis.com/v2/user/info/?${params.toString()}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
    ...getFetchOptions(),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    console.error('[TikTok] User info error:', errorData)
    const errMsg = errorData?.error?.message || 'Unknown error'
    throw new Error(`TikTok user info fetch failed: ${errMsg}`)
  }

  const data = await response.json()
  const user = data.data?.user || data.data || {}
  
  return {
    id: user.id || user.open_id || '',
    username: user.username || user.unique_id || '',
    avatarUrl: user.avatar_url || '',
    nickname: user.nickname || '',
    bioDescription: user.bio_description || '',
    followerCount: user.follower_count || 0,
    followingCount: user.following_count || 0,
    likesCount: user.likes_count || 0,
    videoCount: user.video_count || 0,
  }
}

export async function refreshTikTokToken(refreshToken?: string): Promise<{ accessToken: string; refreshToken?: string; expiresIn: number }> {
  const settings = getSettings()
  if (!settings.tkClientId || !settings.tkClientSecret) {
    throw new Error('TikTok API is not configured.')
  }

  const tokenUrl = 'https://open.tiktokapis.com/v2/oauth2/token/'
  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    client_key: settings.tkClientId,
    client_secret: settings.tkClientSecret,
    refresh_token: refreshToken || '',
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
    throw new Error(`TikTok token refresh failed: ${errorData?.error_description || errorData?.error || 'Unknown error'}`)
  }

  const data = await response.json()
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in || 86400,
  }
}

export async function createTikTokVideoPost(
  accessToken: string,
  videoSize: number,
  title?: string,
  description?: string,
  privacyLevel: string = 'SELF_ONLY'
): Promise<TikTokPublishResult> {
  const body = {
    post_info: {
      title: title || '',
      description: description || '',
      privacy_level: privacyLevel,
    },
    source_info: {
      type: 'FILE',
      video_size: videoSize,
      chunk_size: 4 * 1024 * 1024,
      video_url: '',
    },
  }

  const response = await fetch('https://open.tiktokapis.com/v2/video/publish/', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    ...getFetchOptions(),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    console.error('[TikTok] Create video post error:', errorData)
    const errMsg = errorData?.error?.message || 'Unknown error'
    throw new Error(`TikTok video post creation failed: ${errMsg}`)
  }

  const data = await response.json()
  const postId = data.data?.post_id || data.post_id || ''
  const uploadUrl = data.data?.upload_url || data.upload_url || ''

  return {
    postId,
    uploadUrl,
    status: 'created',
  }
}

export async function uploadTikTokVideoChunk(
  uploadUrl: string,
  videoBuffer: Buffer,
  chunkSize: number = 4 * 1024 * 1024
): Promise<void> {
  const totalSize = videoBuffer.length
  let offset = 0

  while (offset < totalSize) {
    const end = Math.min(offset + chunkSize, totalSize) - 1
    const chunk = videoBuffer.slice(offset, end + 1)
    const contentRange = `bytes ${offset}-${end}/${totalSize}`

    const response = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Range': contentRange,
        'Content-Length': String(chunk.length),
      },
      body: chunk,
      ...getFetchOptions(),
    })

    if (!response.ok && response.status !== 308) {
      const errorText = await response.text().catch(() => '')
      throw new Error(`TikTok video chunk upload failed at offset ${offset}: ${errorText}`)
    }

    offset = end + 1
  }
}

export async function getTikTokVideoStatus(
  accessToken: string,
  postId: string
): Promise<any> {
  const params = new URLSearchParams({
    post_id: postId,
  })

  const response = await fetch(`https://open.tiktokapis.com/v2/video/status/?${params.toString()}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
    ...getFetchOptions(),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(`TikTok video status check failed: ${errorData?.error?.message || 'Unknown error'}`)
  }

  const data = await response.json()
  return data.data || data
}

export async function getTikTokTimeline(
  accessToken: string,
  maxCount: number = 10,
  cursor?: string
): Promise<{ items: TikTokVideoItem[]; nextCursor?: string; hasMore?: boolean }> {
  const params = new URLSearchParams({
    max_count: String(maxCount),
  })

  if (cursor) {
    params.set('cursor', cursor)
  }

  const response = await fetch(`https://open.tiktokapis.com/v2/video/list/?${params.toString()}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
    ...getFetchOptions(),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    console.error('[TikTok] Timeline fetch error:', errorData)
    const errMsg = errorData?.error?.message || 'Unknown error'
    throw new Error(`TikTok timeline fetch failed: ${errMsg}`)
  }

  const data = await response.json()
  const videos = data.data?.videos || data.videos || []
  const nextCursor = data.data?.cursor || data.cursor
  const hasMore = data.data?.has_more ?? data.has_more ?? false

  const items: TikTokVideoItem[] = videos.map((v: any) => ({
    id: v.id || v.video_id || '',
    title: v.title || '',
    videoUrl: v.video_url || '',
    coverUrl: v.cover_url || '',
    createTime: v.create_time ? new Date(v.create_time).toISOString() : '',
    shareCount: v.share_count || 0,
    viewCount: v.view_count || 0,
    likeCount: v.like_count || 0,
    commentCount: v.comment_count || 0,
  }))

  return { items, nextCursor, hasMore }
}