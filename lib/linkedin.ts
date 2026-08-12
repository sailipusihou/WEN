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
  console.log('[LinkedIn] Proxy enabled:', PROXY_URL)
}

function getFetchOptions(): RequestInit {
  if (undiciProxyAgent) {
    return { dispatcher: undiciProxyAgent } as any
  }
  return {}
}

export interface LinkedInAuthResult {
  url: string
  state: string
}

export interface LinkedInUserInfo {
  id: string
  firstName?: string
  lastName?: string
  name?: string
  email?: string
  picture?: string
  locale?: string
}

export interface LinkedInCompanyInfo {
  id: string
  name: string
  logoUrl?: string
  description?: string
  followersCount?: number
}

export interface LinkedInPostResult {
  id: string
  content?: string
  createdAt?: string
  url?: string
}

export interface LinkedInTimelinePost {
  id: string
  content?: string
  createdAt?: string
  author?: string
  url?: string
  metrics?: {
    likes: number
    comments: number
    shares: number
    impressions: number
  }
}

function generateState(): string {
  return Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2)
}

export async function generateLinkedInAuthLink(
  callbackUrl: string,
  state?: string
): Promise<LinkedInAuthResult> {
  const settings = getSettings()

  if (!settings.liApiEnabled) {
    throw new Error('LinkedIn API is not enabled. Please enable LinkedIn API in settings.')
  }

  if (!settings.liClientId || !settings.liClientSecret) {
    throw new Error('LinkedIn API is not configured. Please set up Client ID and Client Secret in settings.')
  }

  const finalState = state || generateState()

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: settings.liClientId,
    redirect_uri: callbackUrl,
    scope: 'r_liteprofile r_emailaddress w_member_social',
    state: finalState,
  })

  const url = `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`
  console.log('[LinkedIn] Auth link generated')

  return {
    url,
    state: finalState,
  }
}

export async function exchangeLinkedInCode(
  code: string,
  redirectUri: string
): Promise<{ accessToken: string; refreshToken?: string; expiresIn: number }> {
  const settings = getSettings()
  if (!settings.liClientId || !settings.liClientSecret) {
    throw new Error('LinkedIn API is not configured. Please set up Client ID and Client Secret in settings.')
  }

  const tokenUrl = 'https://www.linkedin.com/oauth/v2/accessToken'
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code: code,
    redirect_uri: redirectUri,
    client_id: settings.liClientId,
    client_secret: settings.liClientSecret,
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
    console.error('[LinkedIn] Token exchange error:', errorData)
    const errMsg = errorData?.error_description || errorData?.error || 'Unknown error'
    throw new Error(`LinkedIn token exchange failed: ${errMsg}`)
  }

  const data = await response.json()
  console.log('[LinkedIn] Token exchanged successfully')

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in || 5183944,
  }
}

export async function getLinkedInUserInfo(accessToken: string): Promise<LinkedInUserInfo> {
  const response = await fetch('https://api.linkedin.com/v2/userinfo', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    ...getFetchOptions(),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    console.error('[LinkedIn] User info error:', errorData)
    const errMsg = errorData?.message || errorData?.error_description || 'Unknown error'
    throw new Error(`LinkedIn user info fetch failed: ${errMsg}`)
  }

  const data = await response.json()
  return {
    id: data.sub || data.id,
    firstName: data.given_name,
    lastName: data.family_name,
    name: data.name,
    email: data.email,
    picture: data.picture,
    locale: data.locale,
  }
}

export async function refreshLinkedInToken(refreshToken?: string): Promise<{ accessToken: string; refreshToken?: string; expiresIn: number }> {
  const settings = getSettings()
  if (!settings.liClientId || !settings.liClientSecret) {
    throw new Error('LinkedIn API is not configured.')
  }

  if (!refreshToken) {
    throw new Error('Refresh token is required')
  }

  const tokenUrl = 'https://www.linkedin.com/oauth/v2/accessToken'
  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: settings.liClientId,
    client_secret: settings.liClientSecret,
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
    console.error('[LinkedIn] Token refresh error:', errorData)
    const errMsg = errorData?.error_description || errorData?.error || 'Unknown error'
    throw new Error(`LinkedIn token refresh failed: ${errMsg}`)
  }

  const data = await response.json()
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in || 5183944,
  }
}

export async function getLinkedInCompanyInfo(
  accessToken: string,
  companyId?: string
): Promise<LinkedInCompanyInfo[]> {
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'LinkedIn-Version': '20230801',
  }

  const url = companyId
    ? `https://api.linkedin.com/v2/organizations/${companyId}?projection=(id,name,logoV2,description)`
    : 'https://api.linkedin.com/v2/organizationalEntityShareStatistics?q=organizationalEntity&organizationalEntity=urn:li:organization:0&projection=(organizationalEntity~(id,name,logoV2,description),totalShareStatistics)'

  const response = await fetch(url, {
    method: 'GET',
    headers,
    ...getFetchOptions(),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    console.error('[LinkedIn] Company info error:', errorData)
    throw new Error(`LinkedIn company info fetch failed: ${errorData?.message || 'Unknown error'}`)
  }

  const data = await response.json()
  const elements = data.elements || (data as any)['results'] || (data as any).organization ? [data] : []

  if (data.elements && Array.isArray(data.elements)) {
    return data.elements.map((e: any) => ({
      id: e.organizationalEntity?.id || e.id || '',
      name: e.organizationalEntity?.name || e.name || '',
      logoUrl: e.organizationalEntity?.logoV2?.['com.linkedin.images.profile']?.url || e.logoV2?.['com.linkedin.images.profile']?.url,
      description: e.organizationalEntity?.description || e.description,
      followersCount: e.totalShareStatistics?.impressionCount || 0,
    }))
  }

  if (data.id) {
    return [{
      id: data.id,
      name: data.name || '',
      logoUrl: data.logoV2?.['com.linkedin.images.profile']?.url,
      description: data.description,
    }]
  }

  return []
}

export async function publishLinkedInPost(
  accessToken: string,
  authorUrn: string,
  content: string,
  visibility: 'PUBLIC' | 'CONNECTIONS' = 'PUBLIC'
): Promise<LinkedInPostResult> {
  const body = {
    author: authorUrn,
    commentary: content,
    visibility: visibility,
    distribution: {
      mainFeed: true,
    },
  }

  const response = await fetch('https://api.linkedin.com/v2/posts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'LinkedIn-Version': '20230801',
    },
    body: JSON.stringify(body),
    ...getFetchOptions(),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    console.error('[LinkedIn] Publish error:', errorData)
    const errMsg = errorData?.message || errorData?.error_description || 'Unknown error'
    throw new Error(`LinkedIn publish failed: ${errMsg}`)
  }

  const data = await response.json()
  const postId = data.id || data.$id

  return {
    id: postId,
    content,
    createdAt: new Date().toISOString(),
    url: `https://www.linkedin.com/feed/update/${postId}`,
  }
}

export async function getLinkedInTimeline(
  accessToken: string,
  authorUrn: string,
  limit: number = 10
): Promise<LinkedInTimelinePost[]> {
  const params = new URLSearchParams({
    q: 'author',
    author: authorUrn,
    count: String(limit),
    start: '0',
    projection: '(id,commentary,createdAt,author,distribution,totalShareStatistics)',
  })

  const response = await fetch(`https://api.linkedin.com/v2/posts?${params.toString()}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'LinkedIn-Version': '20230801',
    },
    ...getFetchOptions(),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    console.error('[LinkedIn] Timeline error:', errorData)
    const errMsg = errorData?.message || errorData?.error_description || 'Unknown error'
    throw new Error(`LinkedIn timeline fetch failed: ${errMsg}`)
  }

  const data = await response.json()
  const posts = data.elements || []

  return posts.map((post: any) => ({
    id: post.id,
    content: post.commentary,
    createdAt: post.createdAt ? new Date(post.createdAt).toISOString() : undefined,
    author: post.author,
    url: `https://www.linkedin.com/feed/update/${post.id}`,
    metrics: {
      likes: post.totalShareStatistics?.likeCount || 0,
      comments: post.totalShareStatistics?.commentCount || 0,
      shares: post.totalShareStatistics?.shareCount || 0,
      impressions: post.totalShareStatistics?.impressionCount || 0,
    },
  }))
}