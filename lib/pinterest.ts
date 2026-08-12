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
  console.log('[Pinterest] Proxy enabled:', PROXY_URL)
}

function getFetchOptions(): RequestInit {
  if (undiciProxyAgent) {
    return { dispatcher: undiciProxyAgent } as any
  }
  return {}
}

export interface PinterestAuthResult {
  url: string
  state: string
}

export interface PinterestUserInfo {
  username: string
  firstName?: string
  lastName?: string
  email?: string
  profileImage?: string
  website?: string
}

export interface PinterestBoard {
  id: string
  name: string
  description?: string
  privacy?: string
  pinCount?: number
  owner?: { username: string }
}

export interface PinterestPin {
  id: string
  title?: string
  description?: string
  link?: string
  imageUrl?: string
  boardId?: string
  createdAt?: string
  metrics?: {
    impressions?: number
    saves?: number
    comments?: number
  }
}

export interface PinterestPublishResult {
  id: string
  title?: string
  url?: string
  createdAt: string
}

function generateState(): string {
  return Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2)
}

export async function generatePinterestAuthLink(
  callbackUrl: string,
  state?: string
): Promise<PinterestAuthResult> {
  const settings = getSettings()

  if (!settings.ptApiEnabled) {
    throw new Error('Pinterest API is not enabled. Please enable Pinterest API in settings.')
  }

  if (!settings.ptClientId || !settings.ptClientSecret) {
    throw new Error('Pinterest API is not configured. Please set up Client ID and Client Secret in settings.')
  }

  const finalState = state || generateState()

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: settings.ptClientId,
    redirect_uri: callbackUrl,
    scope: 'read_public write_public read_boards',
    state: finalState,
  })

  const url = `https://www.pinterest.com/oauth/?${params.toString()}`
  console.log('[Pinterest] Auth link generated')

  return {
    url,
    state: finalState,
  }
}

export async function exchangePinterestCode(
  code: string,
  redirectUri: string
): Promise<{ accessToken: string; refreshToken?: string; expiresIn: number }> {
  const settings = getSettings()
  if (!settings.ptClientId || !settings.ptClientSecret) {
    throw new Error('Pinterest API is not configured. Please set up Client ID and Client Secret in settings.')
  }

  const tokenUrl = 'https://api.pinterest.com/v5/oauth/token'
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code: code,
    redirect_uri: redirectUri,
    client_id: settings.ptClientId,
    client_secret: settings.ptClientSecret,
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
    console.error('[Pinterest] Token exchange error:', errorData)
    const errMsg = errorData?.error || errorData?.message || 'Unknown error'
    throw new Error(`Pinterest token exchange failed: ${errMsg}`)
  }

  const data = await response.json()
  console.log('[Pinterest] Token exchanged successfully')

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in || 2700,
  }
}

export async function getPinterestUserInfo(accessToken: string): Promise<PinterestUserInfo> {
  const response = await fetch('https://api.pinterest.com/v5/account', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    ...getFetchOptions(),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    console.error('[Pinterest] User info error:', errorData)
    const errMsg = errorData?.message || errorData?.error || 'Unknown error'
    throw new Error(`Pinterest user info fetch failed: ${errMsg}`)
  }

  const data = await response.json()
  return {
    username: data.username,
    firstName: data.first_name,
    lastName: data.last_name,
    email: data.email,
    profileImage: data.profile_image,
    website: data.website,
  }
}

export async function getPinterestBoards(accessToken: string): Promise<PinterestBoard[]> {
  const params = new URLSearchParams({
    page_size: '25',
  })

  const response = await fetch(`https://api.pinterest.com/v5/boards?${params.toString()}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    ...getFetchOptions(),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    console.error('[Pinterest] Boards error:', errorData)
    return []
  }

  const data = await response.json()
  const items = data.items || []

  return items.map((board: any) => ({
    id: board.id,
    name: board.name,
    description: board.description,
    privacy: board.privacy,
    pinCount: board.pin_count,
    owner: board.owner ? { username: board.owner.username } : undefined,
  }))
}

export async function refreshPinterestToken(refreshToken?: string): Promise<{ accessToken: string; refreshToken?: string; expiresIn: number }> {
  const settings = getSettings()
  if (!settings.ptClientId || !settings.ptClientSecret) {
    throw new Error('Pinterest API is not configured.')
  }

  if (!refreshToken) {
    throw new Error('Refresh token is required')
  }

  const tokenUrl = 'https://api.pinterest.com/v5/oauth/token'
  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: settings.ptClientId,
    client_secret: settings.ptClientSecret,
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
    console.error('[Pinterest] Token refresh error:', errorData)
    const errMsg = errorData?.error || errorData?.message || 'Unknown error'
    throw new Error(`Pinterest token refresh failed: ${errMsg}`)
  }

  const data = await response.json()
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in || 2700,
  }
}

export async function createPinterestPin(
  accessToken: string,
  boardId: string,
  title: string,
  description?: string,
  imageUrl?: string,
  link?: string
): Promise<PinterestPublishResult> {
  const body: any = {
    board_id: boardId,
    title,
  }

  if (description) {
    body.description = description
  }

  if (link) {
    body.link = link
  }

  if (imageUrl) {
    body.media_source = {
      source_type: 'image_url',
      url: imageUrl,
      is_original: false,
    }
  } else {
    body.media_source = {
      source_type: 'image_url',
      url: '',
      is_original: false,
    }
  }

  const response = await fetch('https://api.pinterest.com/v5/pins', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    ...getFetchOptions(),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    console.error('[Pinterest] Publish error:', errorData)
    const errMsg = errorData?.message || errorData?.error || 'Unknown error'
    throw new Error(`Pinterest publish failed: ${errMsg}`)
  }

  const data = await response.json()
  return {
    id: data.id,
    title: data.title,
    url: data.link || `https://www.pinterest.com/pin/${data.id}/`,
    createdAt: new Date().toISOString(),
  }
}

// ===== 评论相关 =====

export interface PinterestComment {
  id: string
  text: string
  createdAt: string
  commenter: {
    username: string
    id: string
    imageUrl?: string
  }
  pinId: string
}

export interface PinterestCommentResult {
  id: string
  text: string
  createdAt: string
}

/**
 * 获取 Pin 的评论列表
 */
export async function getPinterestComments(
  accessToken: string,
  pinId: string,
  pageSize: number = 25
): Promise<PinterestComment[]> {
  const params = new URLSearchParams({
    page_size: String(pageSize),
  })

  const response = await fetch(
    `https://api.pinterest.com/v5/pins/${encodeURIComponent(pinId)}/comments?${params.toString()}`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      ...getFetchOptions(),
    }
  )

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    console.error('[Pinterest] Comments fetch error:', errorData)
    return []
  }

  const data = await response.json()
  const items = data.items || []

  return items.map((c: any) => ({
    id: c.id,
    text: c.text,
    createdAt: c.created_at,
    commenter: {
      username: c.commenter?.username || '',
      id: c.commenter?.id || '',
      imageUrl: c.commenter?.image_small_url || c.commenter?.image_medium_url,
    },
    pinId,
  }))
}

/**
 * 回复 Pin 评论
 */
export async function replyPinterestComment(
  accessToken: string,
  pinId: string,
  text: string,
  parentCommentId?: string
): Promise<PinterestCommentResult> {
  const body: any = { text }
  if (parentCommentId) {
    body.parent_comment_id = parentCommentId
  }

  const response = await fetch(
    `https://api.pinterest.com/v5/pins/${encodeURIComponent(pinId)}/comments`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      ...getFetchOptions(),
    }
  )

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    console.error('[Pinterest] Reply comment error:', errorData)
    const errMsg = errorData?.message || errorData?.error || 'Unknown error'
    throw new Error(`Pinterest reply failed: ${errMsg}`)
  }

  const data = await response.json()
  return {
    id: data.id,
    text: data.text,
    createdAt: data.created_at || new Date().toISOString(),
  }
}

/**
 * 删除 Pin 评论
 */
export async function deletePinterestComment(
  accessToken: string,
  pinId: string,
  commentId: string
): Promise<boolean> {
  const response = await fetch(
    `https://api.pinterest.com/v5/pins/${encodeURIComponent(pinId)}/comments/${encodeURIComponent(commentId)}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      ...getFetchOptions(),
    }
  )

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    console.error('[Pinterest] Delete comment error:', errorData)
    const errMsg = errorData?.message || errorData?.error || 'Unknown error'
    throw new Error(`Pinterest delete comment failed: ${errMsg}`)
  }

  return true
}

export async function getPinterestPins(
  accessToken: string,
  limit: number = 10
): Promise<PinterestPin[]> {
  const params = new URLSearchParams({
    page_size: String(limit),
  })

  const response = await fetch(`https://api.pinterest.com/v5/pins?${params.toString()}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    ...getFetchOptions(),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    console.error('[Pinterest] Pins error:', errorData)
    const errMsg = errorData?.message || errorData?.error || 'Unknown error'
    throw new Error(`Pinterest pins fetch failed: ${errMsg}`)
  }

  const data = await response.json()
  const items = data.items || []

  return items.map((pin: any) => ({
    id: pin.id,
    title: pin.title,
    description: pin.description,
    link: pin.link,
    imageUrl: pin.media_source?.images?.['orig']?.url || pin.media_source?.images?.[0]?.url,
    boardId: pin.board_id,
    createdAt: pin.created_at,
    metrics: pin.metrics ? {
      impressions: pin.metrics.impression ?? pin.metrics.impressions,
      saves: pin.metrics.save ?? pin.metrics.saves,
      comments: pin.metrics.comment ?? pin.metrics.comments,
    } : undefined,
  }))
}