import { getSettings } from '@/lib/settings'
import { HttpsProxyAgent } from 'https-proxy-agent'
import https from 'https'
import http from 'http'
import { ProxyAgent } from 'undici'

const PROXY_URL = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || ''
const API_BASE = 'https://graph.instagram.com'
const AUTH_BASE = 'https://www.instagram.com'
const TOKEN_BASE = 'https://api.instagram.com'

let proxyAgent: HttpsProxyAgent<string> | null = null
let undiciProxyAgent: ProxyAgent | null = null

if (PROXY_URL) {
  proxyAgent = new HttpsProxyAgent(PROXY_URL)
  ;(https as any).globalAgent = proxyAgent
  ;(http as any).globalAgent = proxyAgent
  undiciProxyAgent = new ProxyAgent(PROXY_URL)
  console.log('[Instagram] Proxy enabled:', PROXY_URL)
}

async function fetchWithProxy(url: string, options: RequestInit = {}): Promise<Response> {
  if (PROXY_URL) {
    const agent = new ProxyAgent(PROXY_URL)
    return fetch(url, { ...options, dispatcher: agent as any } as any)
  }
  return fetch(url, options)
}

const MEDIA_INSIGHT_CANDIDATE_METRICS = [
  'reach',
  'saved',
  'total_interactions',
  'likes',
  'comments',
  'shares',
  'views',
  'profile_visits',
  'follows',
  'impressions',
  'replies',
  'navigation',
]

async function readInstagramResponse(response: Response, errorPrefix: string) {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    const errMsg = errorData?.error?.message || 'Unknown error'
    throw new Error(`${errorPrefix}: ${errMsg}`)
  }

  return response.json()
}

export interface InstagramAuthResult {
  url: string
  state: string
}

export interface InstagramUserInfo {
  id: string
  username: string
  name?: string
  biography?: string
  website?: string
  followers_count?: number
  follows_count?: number
  media_count?: number
  profile_picture_url?: string
}

export interface InstagramMediaItem {
  id: string
  caption?: string
  media_type: string
  media_url?: string
  thumbnail_url?: string
  timestamp?: string
  permalink?: string
}

export interface InstagramMediaInsight {
  mediaId: string
  title?: string
  permalink?: string
  mediaType?: string
  mediaProductType?: string
  supportedMetrics: string[]
  unsupportedMetrics: Array<{ metric: string; message: string }>
  metrics: Record<string, number>
  impressions: number
  reach: number
  saved: number
  totalInteractions: number
  likes: number
  comments: number
  shares: number
  views: number
  profileVisits: number
  follows: number
}

export interface InstagramTokenResult {
  accessToken: string
  expiresIn: number
  tokenType: string
  permissions: string[]
  userId: string
}

export async function generateInstagramAuthLink(
  callbackUrl: string,
  state?: string
): Promise<InstagramAuthResult> {
  const settings = getSettings()

  if (!settings.igApiEnabled) {
    throw new Error('Instagram API is not enabled. Please enable Instagram API in settings.')
  }

  if (!settings.igClientId) {
    throw new Error('Instagram API is not configured. Please set up Instagram App ID in settings.')
  }

  const finalState = state || Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2)

  const scopes = ['instagram_business_basic']
  if (settings.igContentPublishEnabled) {
    scopes.push('instagram_business_content_publish')
  }
  if (settings.igManageMessagesEnabled) {
    scopes.push('instagram_business_manage_messages')
  }
  if (settings.igManageCommentsEnabled) {
    scopes.push('instagram_business_manage_comments')
  }

  const params = new URLSearchParams({
    client_id: settings.igClientId,
    redirect_uri: callbackUrl,
    response_type: 'code',
    state: finalState,
    scope: scopes.join(','),
  })

  if (settings.igForceReauth) {
    params.set('force_reauth', 'true')
  }

  const url = `${AUTH_BASE}/oauth/authorize?${params.toString()}`
  console.log('[Instagram] Auth link generated using Instagram Login (new API)')

  return {
    url,
    state: finalState,
  }
}

export async function exchangeInstagramCode(
  code: string,
  redirectUri: string
): Promise<InstagramTokenResult> {
  const settings = getSettings()
  if (!settings.igClientId || !settings.igClientSecret) {
    throw new Error('Instagram API is not configured. Please set up Instagram App ID and Instagram App Secret in settings.')
  }

  const tokenUrl = `${TOKEN_BASE}/oauth/access_token`
  const params = new URLSearchParams({
    client_id: settings.igClientId,
    client_secret: settings.igClientSecret,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri,
    code,
  })

  const response = await fetchWithProxy(`${tokenUrl}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    console.error('[Instagram] Short-lived token exchange error:', errorData)
    const errMsg = errorData?.error_message || errorData?.error_type || 'Unknown error'
    throw new Error(`Instagram token exchange failed: ${errMsg}`)
  }

  const data = await response.json()
  const tokenData = data?.data?.[0] || data
  const permissions = Array.isArray(tokenData.permissions)
    ? tokenData.permissions.filter(Boolean)
    : typeof tokenData.permissions === 'string'
      ? tokenData.permissions.split(',').filter(Boolean)
      : []

  console.log('[Instagram] Short-lived token exchanged successfully')

  return {
    accessToken: tokenData.access_token,
    expiresIn: tokenData.expires_in || 3600,
    tokenType: tokenData.token_type || 'bearer',
    permissions,
    userId: tokenData.user_id || tokenData.id || '',
  }
}

export async function exchangeInstagramLongLivedToken(
  shortLivedToken: string
): Promise<{ accessToken: string; expiresIn: number }> {
  const settings = getSettings()
  if (!settings.igClientSecret) {
    throw new Error('Instagram App Secret not configured.')
  }

  const url = `${API_BASE}/access_token`
  const params = new URLSearchParams({
    grant_type: 'ig_exchange_token',
    client_secret: settings.igClientSecret,
    access_token: shortLivedToken,
  })

  const response = await fetchWithProxy(`${url}?${params.toString()}`)

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    console.error('[Instagram] Long-lived token exchange error:', errorData)
    const errMsg = errorData?.error?.message || 'Unknown error'
    throw new Error(`Instagram long-lived token exchange failed: ${errMsg}`)
  }

  const data = await response.json()
  console.log('[Instagram] Long-lived token exchanged successfully')

  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in || 5183944,
  }
}

export async function refreshInstagramToken(
  longLivedToken: string
): Promise<{ accessToken: string; expiresIn: number }> {
  const url = `${API_BASE}/refresh_access_token`
  const params = new URLSearchParams({
    grant_type: 'ig_refresh_token',
    access_token: longLivedToken,
  })

  const response = await fetchWithProxy(`${url}?${params.toString()}`)

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    console.error('[Instagram] Token refresh error:', errorData)
    const errMsg = errorData?.error?.message || 'Unknown error'
    throw new Error(`Instagram token refresh failed: ${errMsg}`)
  }

  const data = await response.json()
  console.log('[Instagram] Token refreshed successfully')

  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in || 5183944,
  }
}

export async function getInstagramUserInfo(accessToken: string): Promise<InstagramUserInfo> {
  const fields = 'id,username,name,biography,website,followers_count,follows_count,media_count,profile_picture_url'
  const url = `${API_BASE}/me?fields=${fields}&access_token=${accessToken}`

  const response = await fetchWithProxy(url)

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    console.error('[Instagram] User info error:', errorData)
    const errMsg = errorData?.error?.message || 'Unknown error'
    throw new Error(`Instagram user info fetch failed: ${errMsg}`)
  }

  const data = await response.json()
  return {
    id: data.id,
    username: data.username,
    name: data.name,
    biography: data.biography,
    website: data.website,
    followers_count: data.followers_count,
    follows_count: data.follows_count,
    media_count: data.media_count,
    profile_picture_url: data.profile_picture_url,
  }
}

export async function getInstagramTimeline(
  accessToken: string,
  limit: number = 10
): Promise<InstagramMediaItem[]> {
  const url = `${API_BASE}/me/media?fields=id,caption,media_type,media_url,thumbnail_url,timestamp,permalink&limit=${limit}&access_token=${accessToken}`

  const response = await fetchWithProxy(url)

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(`Instagram timeline fetch failed: ${errorData?.error?.message || 'Unknown error'}`)
  }

  const data = await response.json()
  const items = data.data || []
  return items.map((item: any) => ({
    id: item.id,
    caption: item.caption,
    media_type: item.media_type,
    media_url: item.media_url,
    thumbnail_url: item.thumbnail_url,
    timestamp: item.timestamp,
    permalink: item.permalink,
  }))
}

export async function getInstagramMediaInsights(
  accessToken: string,
  mediaId: string
): Promise<InstagramMediaInsight> {
  const metaUrl = `${API_BASE}/${mediaId}?fields=id,media_type,media_product_type,permalink,timestamp&access_token=${accessToken}`
  const metaResponse = await fetchWithProxy(metaUrl)
  const meta = await readInstagramResponse(metaResponse, 'Instagram media detail fetch failed')

  const map: Record<string, number> = {}
  const supportedMetrics: string[] = []
  const unsupportedMetrics: Array<{ metric: string; message: string }> = []

  for (const metric of MEDIA_INSIGHT_CANDIDATE_METRICS) {
    const url = `${API_BASE}/${mediaId}/insights?metric=${metric}&access_token=${accessToken}`
    const response = await fetchWithProxy(url)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const errMsg = errorData?.error?.message || 'Unknown error'
      const normalized = errMsg.toLowerCase()

      if (normalized.includes('does not support') || normalized.includes('must be one of')) {
        unsupportedMetrics.push({ metric, message: errMsg })
        continue
      }

      throw new Error(`Instagram insights fetch failed: ${errMsg}`)
    }

    const data = await response.json()
    const item = Array.isArray(data?.data) ? data.data[0] : undefined
    const value = Array.isArray(item?.values) ? item.values[0]?.value : item?.value
    map[metric] = Number(value || 0)
    supportedMetrics.push(metric)
  }

  if (supportedMetrics.length === 0) {
    throw new Error(
      unsupportedMetrics[0]?.message || 'Instagram insights fetch failed: no supported metrics for this media item.'
    )
  }

  return {
    mediaId,
    permalink: meta?.permalink,
    mediaType: meta?.media_type,
    mediaProductType: meta?.media_product_type,
    supportedMetrics,
    unsupportedMetrics,
    metrics: map,
    impressions: map.impressions || 0,
    reach: map.reach || 0,
    saved: map.saved || 0,
    totalInteractions: map.total_interactions || 0,
    likes: map.likes || 0,
    comments: map.comments || 0,
    shares: map.shares || 0,
    views: map.views || 0,
    profileVisits: map.profile_visits || 0,
    follows: map.follows || 0,
  }
}

export async function publishInstagramMedia(
  accessToken: string,
  mediaUrls: string | string[],
  caption?: string,
  type: 'IMAGE' | 'VIDEO' | 'CAROUSEL' = 'IMAGE'
): Promise<{ containerId: string }> {
  const settings = getSettings()
  const url = `${API_BASE}/me/media`

  if (type === 'CAROUSEL') {
    const urls = Array.isArray(mediaUrls) ? mediaUrls : [mediaUrls]
    if (urls.length < 2) {
      throw new Error('Instagram CAROUSEL requires at least 2 media URLs')
    }

    const childrenIds: string[] = []
    
    // 1. Create item containers
    for (const itemUrl of urls) {
      const itemParams = new URLSearchParams()
      itemParams.set('access_token', accessToken)
      itemParams.set('is_carousel_item', 'true')
      
      // Basic extension check for video
      const isVideo = itemUrl.toLowerCase().match(/\.(mp4|mov)(\?.*)?$/)
      if (isVideo) {
        itemParams.set('media_type', 'VIDEO')
        itemParams.set('video_url', itemUrl)
      } else {
        itemParams.set('image_url', itemUrl)
      }

      const res = await fetchWithProxy(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: itemParams.toString(),
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(`Instagram carousel item creation failed: ${errorData?.error?.message || 'Unknown error'}`)
      }
      const data = await res.json()
      childrenIds.push(data.id)
    }

    // 2. Create carousel container
    const carouselParams = new URLSearchParams()
    carouselParams.set('access_token', accessToken)
    carouselParams.set('media_type', 'CAROUSEL')
    carouselParams.set('children', childrenIds.join(','))
    if (caption) carouselParams.set('caption', caption)

    const res = await fetchWithProxy(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: carouselParams.toString(),
    })

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}))
      throw new Error(`Instagram carousel container creation failed: ${errorData?.error?.message || 'Unknown error'}`)
    }
    const data = await res.json()
    return { containerId: data.id }

  } else {
    const singleUrl = Array.isArray(mediaUrls) ? mediaUrls[0] : mediaUrls
    const params = new URLSearchParams()
    params.set('access_token', accessToken)
    params.set('caption', caption || '')

    if (type === 'IMAGE') {
      params.set('image_url', singleUrl)
    } else if (type === 'VIDEO') {
      params.set('video_url', singleUrl)
    }

    const response = await fetchWithProxy(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('[Instagram] Media container creation error:', errorData)
      const errMsg = errorData?.error?.message || 'Unknown error'
      throw new Error(`Instagram media creation failed: ${errMsg}`)
    }

    const data = await response.json()
    const containerId = data.id

    if (!containerId) {
      throw new Error('Failed to create Instagram media container')
    }

    return { containerId }
  }
}

export async function getInstagramComments(
  accessToken: string,
  mediaId: string
) {
  const url = `${API_BASE}/${mediaId}/comments?fields=id,text,timestamp,username,replies{id,text,timestamp,username}&access_token=${accessToken}`
  const response = await fetchWithProxy(url)

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(`Instagram comments fetch failed: ${errorData?.error?.message || 'Unknown error'}`)
  }

  const data = await response.json()
  return data.data || []
}

export async function replyInstagramComment(
  accessToken: string,
  commentId: string,
  message: string
) {
  const url = `${API_BASE}/${commentId}/replies`
  const params = new URLSearchParams()
  params.set('access_token', accessToken)
  params.set('message', message)

  const response = await fetchWithProxy(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(`Instagram comment reply failed: ${errorData?.error?.message || 'Unknown error'}`)
  }

  return response.json()
}

export async function deleteInstagramComment(
  accessToken: string,
  commentId: string
) {
  const url = `${API_BASE}/${commentId}`
  const params = new URLSearchParams()
  params.set('access_token', accessToken)

  const response = await fetchWithProxy(url, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(`Instagram comment delete failed: ${errorData?.error?.message || 'Unknown error'}`)
  }

  return response.json()
}

export async function getAllInstagramComments(
  accessToken: string,
  mediaIds: string[]
) {
  const allComments: any[] = []
  for (const mediaId of mediaIds) {
    try {
      const comments = await getInstagramComments(accessToken, mediaId)
      for (const comment of comments) {
        allComments.push({ ...comment, mediaId })
      }
    } catch (err) {
      console.error(`[Instagram] Failed to fetch comments for media ${mediaId}:`, err)
    }
  }
  return allComments
}

export async function publishInstagramContainer(
  accessToken: string,
  containerId: string
): Promise<{ mediaId: string }> {
  const url = `${API_BASE}/me/media_publish`

  const params = new URLSearchParams({
    creation_id: containerId,
    access_token: accessToken,
  })

  const response = await fetchWithProxy(`${url}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    console.error('[Instagram] Media publish error:', errorData)
    const errMsg = errorData?.error?.message || 'Unknown error'
    throw new Error(`Instagram media publish failed: ${errMsg}`)
  }

  const data = await response.json()
  console.log('[Instagram] Media published successfully:', data)

  return { mediaId: data.id }
}

export interface InstagramConversation {
  id: string
  participants: Array<{
    id: string
    username?: string
  }>
  messages: InstagramDM[]
  updatedAt: string
}

export interface InstagramDM {
  id: string
  text: string
  fromId: string
  fromUsername?: string
  timestamp: string
  isRead: boolean
}

export async function getInstagramConversations(
  accessToken: string,
  limit: number = 25
): Promise<InstagramConversation[]> {
  const url = `${API_BASE}/me/conversations?fields=id,participants,updated_time&limit=${limit}&access_token=${accessToken}`
  const response = await fetchWithProxy(url)

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(`Instagram conversations fetch failed: ${errorData?.error?.message || 'Unknown error'}`)
  }

  const data = await response.json()
  const conversations = data.data || []

  // Fetch messages for each conversation
  const result: InstagramConversation[] = []
  for (const conv of conversations) {
    try {
      const msgUrl = `${API_BASE}/${conv.id}/messages?fields=id,text,from,timestamp&limit=20&access_token=${accessToken}`
      const msgResponse = await fetchWithProxy(msgUrl)
      if (msgResponse.ok) {
        const msgData = await msgResponse.json()
        const messages = (msgData.data || []).map((m: any) => ({
          id: m.id,
          text: m.message || m.text || '',
          fromId: m.from?.id || '',
          fromUsername: m.from?.username || '',
          timestamp: m.timestamp || m.created_time || '',
          isRead: true,
        }))
        result.push({
          id: conv.id,
          participants: conv.participants?.data || [],
          messages: messages.reverse(),
          updatedAt: conv.updated_time || '',
        })
      }
    } catch {
      // skip conversations with message fetch errors
    }
  }
  return result
}

export async function sendInstagramDM(
  accessToken: string,
  recipientId: string,
  message: string
): Promise<{ id: string }> {
  const url = `${API_BASE}/me/messages`
  const body = {
    recipient: { id: recipientId },
    message: { text: message },
    access_token: accessToken,
  }

  const response = await fetchWithProxy(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(`Instagram DM send failed: ${errorData?.error?.message || 'Unknown error'}`)
  }

  const data = await response.json()
  return { id: data.id }
}
