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
  console.log('[Facebook] Proxy enabled:', PROXY_URL)
}

function getFetchOptions(): RequestInit {
  if (undiciProxyAgent) {
    return { dispatcher: undiciProxyAgent } as any
  }
  return {}
}

export interface FacebookAuthResult {
  url: string
  state: string
  codeChallenge?: string
  codeVerifier?: string
}

export interface FacebookUserInfo {
  id: string
  name: string
  email?: string
  picture?: {
    data: {
      url: string
      width?: number
      height?: number
      is_silhouette?: boolean
    }
  }
  link?: string
}

export interface FacebookPageInfo {
  id: string
  name: string
  picture?: {
    data: {
      url: string
    }
  }
  followers_count?: number
  likes_count?: number
}

export interface FacebookPostResult {
  id: string
  message?: string
  created_time?: string
  permalink_url?: string
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

export async function generateFacebookAuthLink(
  callbackUrl: string,
  state?: string,
  codeChallenge?: string
): Promise<FacebookAuthResult> {
  const settings = getSettings()

  if (!settings.fbApiEnabled) {
    throw new Error('Facebook API is not enabled. Please enable Facebook API in settings.')
  }

  if (!settings.fbClientId) {
    throw new Error('Facebook API is not configured. Please set up Client ID in settings.')
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
    client_id: settings.fbClientId,
    redirect_uri: callbackUrl,
    state: finalState,
    scope: 'email,public_profile,pages_read_engagement,pages_show_list',
  })

  if (finalCodeChallenge) {
    params.set('code_challenge', finalCodeChallenge)
    params.set('code_challenge_method', 'S256')
  }

  const url = `https://www.facebook.com/v18.0/dialog/oauth?${params.toString()}`
  console.log('[Facebook] Auth link generated')

  return {
    url,
    state: finalState,
    codeChallenge: finalCodeChallenge,
    codeVerifier: finalCodeVerifier,
  }
}

export async function exchangeFacebookCode(
  code: string,
  redirectUri: string,
  codeVerifier?: string
): Promise<{ accessToken: string; refreshToken?: string; expiresIn: number }> {
  const settings = getSettings()
  if (!settings.fbClientId || !settings.fbClientSecret) {
    throw new Error('Facebook API is not configured. Please set up Client ID and Client Secret in settings.')
  }

  const tokenUrl = 'https://graph.facebook.com/v18.0/oauth/access_token'
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code: code,
    redirect_uri: redirectUri,
    client_id: settings.fbClientId,
    client_secret: settings.fbClientSecret,
  })

  if (codeVerifier) {
    params.set('code_verifier', codeVerifier)
  }

  const response = await fetch(`${tokenUrl}?${params.toString()}`, {
    method: 'GET',
    ...getFetchOptions(),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    console.error('[Facebook] Token exchange error:', errorData)
    const errMsg = errorData?.error?.message || 'Unknown error'
    throw new Error(`Facebook token exchange failed: ${errMsg}`)
  }

  const data = await response.json()
  console.log('[Facebook] Token exchanged successfully')

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in || 5183944,
  }
}

export async function getFacebookUserInfo(accessToken: string): Promise<FacebookUserInfo> {
  const params = new URLSearchParams({
    fields: 'id,name,email,picture.type(large),link',
    access_token: accessToken,
  })

  const response = await fetch(`https://graph.facebook.com/v18.0/me?${params.toString()}`, {
    method: 'GET',
    ...getFetchOptions(),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    console.error('[Facebook] User info error:', errorData)
    const errMsg = errorData?.error?.message || 'Unknown error'
    throw new Error(`Facebook user info fetch failed: ${errMsg}`)
  }

  const data = await response.json()
  return {
    id: data.id,
    name: data.name,
    email: data.email,
    picture: data.picture,
    link: data.link,
  }
}

export async function refreshFacebookToken(refreshToken?: string): Promise<{ accessToken: string; refreshToken?: string; expiresIn: number }> {
  const settings = getSettings()
  if (!settings.fbClientId || !settings.fbClientSecret) {
    throw new Error('Facebook API is not configured.')
  }

  const tokenUrl = 'https://graph.facebook.com/v18.0/oauth/access_token'
  const params = new URLSearchParams({
    grant_type: 'fb_exchange_token',
    client_id: settings.fbClientId,
    client_secret: settings.fbClientSecret,
    fb_exchange_token: refreshToken || '',
  })

  const response = await fetch(`${tokenUrl}?${params.toString()}`, {
    method: 'GET',
    ...getFetchOptions(),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(`Facebook token refresh failed: ${errorData?.error?.message || 'Unknown error'}`)
  }

  const data = await response.json()
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in || 5183944,
  }
}

export async function getFacebookPageInfo(accessToken: string, pageId?: string): Promise<FacebookPageInfo[]> {
  // Page 端点无 likes_count 字段（用 fan_count）；me/accounts 用 likes_count
  const params = new URLSearchParams({
    fields: pageId ? 'id,name,picture,followers_count,fan_count' : 'id,name,picture,followers_count,likes_count',
    access_token: accessToken,
  })

  const url = pageId
    ? `https://graph.facebook.com/v18.0/${pageId}?${params.toString()}`
    : `https://graph.facebook.com/v18.0/me/accounts?${params.toString()}`

  const response = await fetch(url, {
    method: 'GET',
    ...getFetchOptions(),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(`Facebook page info fetch failed: ${errorData?.error?.message || 'Unknown error'}`)
  }

  const data = await response.json()
  // pageId 模式: 返回单对象 {id,name,...}; me/accounts 模式: 返回 {data:[...]}
  const pages = pageId ? [data] : (data.data ? (Array.isArray(data.data) ? data.data : [data.data]) : [])
  return pages.map((p: any) => ({
    id: p.id,
    name: p.name,
    picture: p.picture,
    followers_count: p.followers_count,
    likes_count: p.likes_count ?? p.fan_count ?? 0,
  }))
}

export async function publishFacebookPost(
  accessToken: string,
  message: string,
  pageId?: string
): Promise<FacebookPostResult> {
  const params = new URLSearchParams({
    message: message,
    access_token: accessToken,
  })

  const endpoint = pageId || 'me'
  const response = await fetch(`https://graph.facebook.com/v18.0/${endpoint}/feed?${params.toString()}`, {
    method: 'POST',
    ...getFetchOptions(),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    console.error('[Facebook] Publish error:', errorData)
    const errMsg = errorData?.error?.message || 'Unknown error'
    throw new Error(`Facebook publish failed: ${errMsg}`)
  }

  const data = await response.json()
  return {
    id: data.id,
    message,
    created_time: new Date().toISOString(),
    permalink_url: data.permalink_url,
  }
}

export async function getFacebookTimeline(
  accessToken: string,
  pageId?: string,
  limit: number = 10
): Promise<FacebookPostResult[]> {
  const params = new URLSearchParams({
    fields: 'id,message,created_time,permalink_url',
    limit: String(limit),
    access_token: accessToken,
  })

  const endpoint = pageId || 'me'
  const response = await fetch(`https://graph.facebook.com/v18.0/${endpoint}/feed?${params.toString()}`, {
    method: 'GET',
    ...getFetchOptions(),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(`Facebook timeline fetch failed: ${errorData?.error?.message || 'Unknown error'}`)
  }

  const data = await response.json()
  const posts = data.data || []
  return posts.map((post: any) => ({
    id: post.id,
    message: post.message,
    created_time: post.created_time,
    permalink_url: post.permalink_url,
  }))
}

export interface FBCommentItem {
  id: string
  text: string
  username: string
  fromId: string
  createdAt: string
  postId: string
  postMessage?: string
  likeCount: number
  replies?: FBCommentItem[]
}

export async function getFacebookComments(
  accessToken: string,
  postId: string
): Promise<FBCommentItem[]> {
  const params = new URLSearchParams({
    fields: 'id,message,from,created_time,like_count,comments{id,message,from,created_time,like_count}',
    access_token: accessToken,
  })

  const response = await fetch(`https://graph.facebook.com/v18.0/${postId}/comments?${params.toString()}`, {
    method: 'GET',
    ...getFetchOptions(),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(`Facebook comments fetch failed: ${errorData?.error?.message || 'Unknown error'}`)
  }

  const data = await response.json()
  const comments = data.data || []
  return comments.map((c: any) => ({
    id: c.id,
    text: c.message || '',
    username: c.from?.name || 'Unknown',
    fromId: c.from?.id || '',
    createdAt: c.created_time || '',
    postId,
    likeCount: c.like_count || 0,
    replies: (c.comments?.data || []).map((r: any) => ({
      id: r.id,
      text: r.message || '',
      username: r.from?.name || 'Unknown',
      fromId: r.from?.id || '',
      createdAt: r.created_time || '',
      postId,
      likeCount: r.like_count || 0,
    })),
  }))
}

export async function getAllFacebookComments(
  accessToken: string,
  pageId?: string,
  postLimit: number = 50
): Promise<FBCommentItem[]> {
  // 先获取帖子列表
  let posts: any[] = []
  try {
    posts = await getFacebookTimeline(accessToken, pageId, postLimit)
  } catch (err: any) {
    // pages_read_engagement 未授权（高级访问）时静默返回空，避免前端误报"同步失败"
    const msg = String(err?.message || '')
    if (msg.includes('pages_read_engagement') || msg.includes('Page Public Content Access') || msg.includes('#10')) {
      console.warn('[Facebook] Timeline unavailable (needs pages_read_engagement):', msg)
      return []
    }
    throw err
  }
  const allComments: FBCommentItem[] = []

  for (const post of posts) {
    if (!post.id) continue
    try {
      const comments = await getFacebookComments(accessToken, post.id)
      for (const c of comments) {
        allComments.push({
          ...c,
          postMessage: post.message?.substring(0, 80) || '',
        })
      }
    } catch {
      // skip posts with no comments or errors
    }
  }

  return allComments
}

export async function replyFacebookComment(
  accessToken: string,
  commentId: string,
  message: string
): Promise<{ id: string }> {
  const params = new URLSearchParams({
    message,
    access_token: accessToken,
  })

  const response = await fetch(`https://graph.facebook.com/v18.0/${commentId}/comments?${params.toString()}`, {
    method: 'POST',
    ...getFetchOptions(),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(`Facebook comment reply failed: ${errorData?.error?.message || 'Unknown error'}`)
  }

  const data = await response.json()
  return { id: data.id }
}

export async function deleteFacebookComment(
  accessToken: string,
  commentId: string
): Promise<boolean> {
  const params = new URLSearchParams({
    access_token: accessToken,
  })

  const response = await fetch(`https://graph.facebook.com/v18.0/${commentId}?${params.toString()}`, {
    method: 'DELETE',
    ...getFetchOptions(),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(`Facebook comment delete failed: ${errorData?.error?.message || 'Unknown error'}`)
  }

  return true
}

export async function hideFacebookComment(
  accessToken: string,
  commentId: string,
  hidden: boolean = true
): Promise<boolean> {
  const params = new URLSearchParams({
    is_hidden: String(hidden),
    access_token: accessToken,
  })

  const response = await fetch(`https://graph.facebook.com/v18.0/${commentId}?${params.toString()}`, {
    method: 'POST',
    ...getFetchOptions(),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(`Facebook comment hide failed: ${errorData?.error?.message || 'Unknown error'}`)
  }

  return true
}