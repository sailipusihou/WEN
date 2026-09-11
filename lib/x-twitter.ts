import { TwitterApi } from 'twitter-api-v2'
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
  console.log('[X Twitter] Proxy enabled:', PROXY_URL)
}

function getFetchOptions(): RequestInit {
  if (undiciProxyAgent) {
    return { dispatcher: undiciProxyAgent } as any
  }
  return {}
}

export interface XAuthResult {
  url: string
  oauthToken?: string
  oauthTokenSecret?: string
  codeChallenge?: string
  codeVerifier?: string
  state?: string
}

export interface XUserInfo {
  id: string
  username: string
  name: string
  profileImageUrl?: string
  description?: string
}

export interface XPublishResult {
  id: string
  text: string
  url: string
  createdAt: string
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

function getXClientOAuth1(accessToken?: string, accessTokenSecret?: string): TwitterApi | null {
  const settings = getSettings()
  if (!settings.xApiEnabled || !settings.xApiKey || !settings.xApiSecret) {
    return null
  }
  const config: any = {
    appKey: settings.xApiKey,
    appSecret: settings.xApiSecret,
  }
  if (accessToken && accessTokenSecret) {
    config.accessToken = accessToken
    config.accessSecret = accessTokenSecret
  }
  if (proxyAgent) {
    config.httpAgent = proxyAgent
    config.httpsAgent = proxyAgent
  }
  return new TwitterApi(config)
}

function getXClientOAuth2(accessToken?: string): TwitterApi | null {
  const settings = getSettings()
  if (!settings.xApiEnabled || !settings.xClientId || !settings.xClientSecret) {
    return null
  }
  const config: any = {}
  if (accessToken) {
    config.accessToken = accessToken
  }
  if (proxyAgent) {
    config.httpAgent = proxyAgent
    config.httpsAgent = proxyAgent
  }
  if (accessToken) {
    return new TwitterApi(accessToken, config)
  }
  return null
}

export async function generateXAuthLink(callbackUrl: string): Promise<XAuthResult> {
  const settings = getSettings()
  const authType = settings.xApiAuthType || 'oauth2'
  
  console.log('[X Twitter] Config:', {
    authType,
    hasClientId: !!settings.xClientId,
    clientIdLength: settings.xClientId?.length,
    hasClientSecret: !!settings.xClientSecret,
    clientSecretLength: settings.xClientSecret?.length,
    hasApiKey: !!settings.xApiKey,
    hasApiSecret: !!settings.xApiSecret,
    callbackUrl,
  })

  if (authType === 'oauth2') {
    if (!settings.xClientId || !settings.xClientSecret) {
      throw new Error('X API OAuth 2.0 is not configured. Please set up Client ID and Client Secret in settings.')
    }
    
    const codeVerifier = generateCodeVerifier()
    const codeChallenge = generateCodeChallenge(codeVerifier)
    const state = generateState()
    
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: settings.xClientId,
      redirect_uri: callbackUrl,
      scope: 'tweet.read tweet.write users.read follows.read follows.write dm.read dm.write offline.access',
      state: state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    })
    
    const url = `https://x.com/i/oauth2/authorize?${params.toString()}`
    console.log('[X Twitter] OAuth 2.0 auth link generated')
    
    return {
      url,
      codeVerifier,
      codeChallenge,
      state,
    }
  } else {
    if (!settings.xApiKey || !settings.xApiSecret) {
      throw new Error('X API OAuth 1.0a is not configured. Please set up API Key and API Secret in settings.')
    }
    
    const client = getXClientOAuth1()
    if (!client) {
      throw new Error('X API is not configured')
    }
    
    try {
      const authLink = await client.generateAuthLink(callbackUrl, { linkMode: 'authorize' })
      console.log('[X Twitter] OAuth 1.0a auth link generated:', authLink.url)
      return {
        url: authLink.url,
        oauthToken: authLink.oauth_token,
        oauthTokenSecret: authLink.oauth_token_secret,
      }
    } catch (error: any) {
      console.error('[X Twitter] generateAuthLink error:', error)
      const errorMsg = error?.message || error?.data?.errors?.[0]?.message || 'Unknown error'
      throw new Error(`X Auth Error: ${errorMsg}`)
    }
  }
}

export async function exchangeOAuth2Code(
  code: string,
  redirectUri: string,
  codeVerifier: string
): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
  const settings = getSettings()
  if (!settings.xClientId || !settings.xClientSecret) {
    throw new Error('X API OAuth 2.0 is not configured')
  }
  
  const tokenUrl = 'https://api.x.com/2/oauth2/token'
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code: code,
    redirect_uri: redirectUri,
    client_id: settings.xClientId,
    code_verifier: codeVerifier,
  })
  
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${Buffer.from(`${settings.xClientId}:${settings.xClientSecret}`).toString('base64')}`,
    },
    body: params.toString(),
    ...getFetchOptions(),
  })
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    console.error('[X Twitter] Token exchange error:', errorData)
    throw new Error(`Token exchange failed: ${errorData.error || 'Unknown error'}`)
  }
  
  const data = await response.json()
  console.log('[X Twitter] Token exchanged successfully')
  
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  }
}

export async function refreshOAuth2Token(refreshToken: string): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
  const settings = getSettings()
  if (!settings.xClientId || !settings.xClientSecret) {
    throw new Error('X API OAuth 2.0 is not configured')
  }
  
  const tokenUrl = 'https://api.x.com/2/oauth2/token'
  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: settings.xClientId,
  })
  
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${Buffer.from(`${settings.xClientId}:${settings.xClientSecret}`).toString('base64')}`,
    },
    body: params.toString(),
    ...getFetchOptions(),
  })
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(`Token refresh failed: ${errorData.error || 'Unknown error'}`)
  }
  
  const data = await response.json()
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  }
}

export async function loginXWithCallback(
  oauthToken: string,
  oauthVerifier: string,
  oauthTokenSecret: string
): Promise<{ accessToken: string; accessTokenSecret: string; user: XUserInfo }> {
  const client = getXClientOAuth1(oauthToken, oauthTokenSecret)
  if (!client) {
    throw new Error('X API is not configured')
  }
  const { client: loggedClient, accessToken, accessSecret, userId, screenName } =
    await client.login(oauthVerifier)

  const me = await loggedClient.v2.me({ 'user.fields': ['profile_image_url', 'description', 'name'] })

  return {
    accessToken,
    accessTokenSecret: accessSecret,
    user: {
      id: me.data.id,
      username: me.data.username,
      name: me.data.name || screenName,
      profileImageUrl: (me.data as any).profile_image_url,
      description: (me.data as any).description,
    },
  }
}

export async function getXUserInfoOAuth2(accessToken: string): Promise<XUserInfo> {
  const client = getXClientOAuth2(accessToken)
  if (!client) {
    throw new Error('X API is not configured')
  }
  const me = await client.v2.me({ 'user.fields': ['profile_image_url', 'description', 'name', 'username'] })
  return {
    id: me.data.id,
    username: me.data.username,
    name: me.data.name,
    profileImageUrl: (me.data as any).profile_image_url,
    description: (me.data as any).description,
  }
}

export async function publishXTweet(
  accessToken: string,
  accessTokenSecret: string,
  text: string
): Promise<XPublishResult> {
  const client = getXClientOAuth1(accessToken, accessTokenSecret)
  if (!client) {
    throw new Error('X API is not configured')
  }
  const result = await client.v2.tweet(text)
  return {
    id: result.data.id,
    text: result.data.text,
    url: `https://twitter.com/i/web/status/${result.data.id}`,
    createdAt: new Date().toISOString(),
  }
}

export async function publishXTweetOAuth2(
  accessToken: string,
  text: string
): Promise<XPublishResult> {
  const client = getXClientOAuth2(accessToken)
  if (!client) {
    throw new Error('X API is not configured')
  }
  const result = await client.v2.tweet(text)
  return {
    id: result.data.id,
    text: result.data.text,
    url: `https://x.com/i/web/status/${result.data.id}`,
    createdAt: new Date().toISOString(),
  }
}

export async function getXUserInfo(
  accessToken: string,
  accessTokenSecret: string
): Promise<XUserInfo> {
  const client = getXClientOAuth1(accessToken, accessTokenSecret)
  if (!client) {
    throw new Error('X API is not configured')
  }
  const me = await client.v2.me({ 'user.fields': ['profile_image_url', 'description', 'name'] })
  return {
    id: me.data.id,
    username: me.data.username,
    name: me.data.name,
    profileImageUrl: (me.data as any).profile_image_url,
    description: (me.data as any).description,
  }
}

export interface XCommentItem {
  id: string
  text: string
  username: string
  authorId: string
  createdAt: string
  tweetId: string
  tweetText?: string
  inReplyToUserId?: string
  likes: number
  retweets: number
}

export async function getXMentionsAndReplies(
  accessToken: string,
  userId: string,
  maxResults: number = 100
): Promise<XCommentItem[]> {
  const client = getXClientOAuth2(accessToken)
  if (!client) throw new Error('X API is not configured')

  try {
    // 获取 mentioning 该用户的推文
    const mentions = await client.v2.userMentionTimeline(userId, {
      max_results: Math.min(maxResults, 100),
      'tweet.fields': ['created_at', 'text', 'author_id', 'in_reply_to_user_id', 'public_metrics', 'referenced_tweets'],
      'user.fields': ['username', 'name'],
      expansions: ['author_id', 'referenced_tweets.id'],
    })

    const usersMap: Record<string, string> = {}
    if (mentions.includes?.users) {
      for (const u of mentions.includes.users) {
        usersMap[u.id] = u.username
      }
    }

    const tweetsMap: Record<string, string> = {}
    if (mentions.includes?.tweets) {
      for (const t of mentions.includes.tweets) {
        tweetsMap[t.id] = t.text
      }
    }

    const items: XCommentItem[] = []
    if (mentions.data) {
      const mentionTweets = (mentions.data as any) as Array<any>
      for (const tweet of mentionTweets) {
        const metrics = (tweet as any).public_metrics || {}
        items.push({
          id: tweet.id,
          text: tweet.text,
          username: usersMap[tweet.author_id || ''] || 'unknown',
          authorId: tweet.author_id || '',
          createdAt: tweet.created_at || '',
          tweetId: tweet.id,
          tweetText: (tweet as any).referenced_tweets?.[0]?.id
            ? tweetsMap[(tweet as any).referenced_tweets[0].id] || ''
            : '',
          inReplyToUserId: (tweet as any).in_reply_to_user_id,
          likes: metrics.like_count || 0,
          retweets: metrics.retweet_count || 0,
        })
      }
    }
    return items
  } catch (error: any) {
    const code = error?.code || error?.statusCode || error?.status || ''
    const msg = String(error?.message || '')
    // 402(需充值 credits)/403(权限不足)/404(层级不支持) 是预期状态：静默返回空
    if (code === 402 || code === 403 || code === 404 || msg.includes('402') || msg.includes('403') || msg.includes('404')) {
      console.warn('[X] Mention timeline unavailable (needs credits/permission):', msg)
      return []
    }
    throw error
  }
}

export async function replyToXTweet(
  accessToken: string,
  tweetId: string,
  text: string
): Promise<{ id: string; text: string; url: string }> {
  const client = getXClientOAuth2(accessToken)
  if (!client) throw new Error('X API is not configured')

  const result = await client.v2.reply(text, tweetId)
  return {
    id: result.data.id,
    text: result.data.text,
    url: `https://x.com/i/web/status/${result.data.id}`,
  }
}

export async function deleteXTweet(
  accessToken: string,
  tweetId: string
): Promise<boolean> {
  const client = getXClientOAuth2(accessToken)
  if (!client) throw new Error('X API is not configured')

  await client.v2.deleteTweet(tweetId)
  return true
}

// ===== X/Twitter Direct Messages =====

export interface XDMConversation {
  id: string
  participantIds: string[]
  participantNames: Record<string, string>
  participantAvatars: Record<string, string>
  participantProfileUrls: Record<string, string>
  lastMessageText: string
  lastMessageTimestamp: string
  unreadCount: number
  messages: XDMMessage[]
}

export interface XDMMessage {
  id: string
  text: string
  senderId: string
  senderName: string
  recipientId: string
  createdAt: string
}

/**
 * 获取 X/Twitter 私信会话列表
 * 注意：X API v2 DM 功能需要 OAuth 2.0 with dm.read 和 dm.write 权限
 */
export async function getXConversations(
  accessToken: string,
  userId: string,
  maxResults: number = 50
): Promise<XDMConversation[]> {
  const client = getXClientOAuth2(accessToken)
  if (!client) throw new Error('X API is not configured')

  try {
    // 使用 twitter-api-v2 的 DM events API
    // v1 DM API: 获取收到和发出的 DM 事件
    const dmEventsUrl = `https://api.x.com/2/dm_conversations?dm_conversation.fields=conversation_type,created_at&dm_event.fields=created_at,text_attachments,event_type&expansions=participant_ids&user.fields=username,name,profile_image_url&max_results=${maxResults}`
    
    const response = await fetch(dmEventsUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      ...getFetchOptions(),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      // 402(需充值)/403(权限不足)/404(层级不支持) 是预期状态：静默返回空，避免前端误报"同步失败"
      if (response.status === 402 || response.status === 403 || response.status === 404) {
        console.warn('[X] DM conversations unavailable (status ' + response.status + '): ' + (errorData?.errors?.[0]?.message || 'requires credits/permission'))
        return []
      }
      throw new Error(`X DM conversations fetch failed: ${errorData?.errors?.[0]?.message || errorData?.error || 'Unknown error'}`)
    }

    const data = await response.json()
    const conversations = data.data || []
    const usersMap: Record<string, { username: string; name: string; avatar: string }> = {}
    
    if (data.includes?.users) {
      for (const u of data.includes.users) {
        usersMap[u.id] = { username: u.username, name: u.name, avatar: u.profile_image_url || '' }
      }
    }

    const result: XDMConversation[] = []
    for (const conv of conversations) {
      const participantIds = conv.participant_ids || []
      const participantNames: Record<string, string> = {}
      const participantAvatars: Record<string, string> = {}
      const participantProfileUrls: Record<string, string> = {}
      for (const pid of participantIds) {
        const userInfo = usersMap[pid]
        participantNames[pid] = userInfo ? `@${userInfo.username}` : pid
        participantAvatars[pid] = userInfo?.avatar || ''
        participantProfileUrls[pid] = userInfo?.username ? `https://x.com/${userInfo.username}` : ''
      }

      // 获取每个会话的消息详情
      let messages: XDMMessage[] = []
      try {
        const msgUrl = `https://api.x.com/2/dm_conversations/${conv.id}/messages?dm_event.fields=created_at,text_attachments,event_type&expansions=sender_id&user.fields=username,name&max_results=20`
        const msgResponse = await fetch(msgUrl, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          ...getFetchOptions(),
        })
        if (msgResponse.ok) {
          const msgData = await msgResponse.json()
          const events = msgData.data || []
          const msgUsersMap: Record<string, { username: string; name: string }> = {}
          if (msgData.includes?.users) {
            for (const u of msgData.includes.users) {
              msgUsersMap[u.id] = { username: u.username, name: u.name }
            }
          }
          for (const ev of events) {
            const senderId = ev.sender_id || ''
            const senderInfo = msgUsersMap[senderId]
            messages.push({
              id: ev.id,
              text: ev.text || (ev.text_attachments?.[0]?.text || ''),
              senderId,
              senderName: senderInfo ? `@${senderInfo.username}` : senderId,
              recipientId: senderId === userId ? (participantIds.find((p: string) => p !== userId) || '') : userId,
              createdAt: ev.created_at || '',
            })
          }
          messages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        }
      } catch {
        // 跳过无法获取消息的会话
      }

      // 未读数：来自非自己用户的消息数
      const unreadCount = messages.filter(m => m.senderId !== userId).length

      result.push({
        id: conv.id,
        participantIds,
        participantNames,
        participantAvatars,
        participantProfileUrls,
        lastMessageText: messages.length > 0 ? messages[messages.length - 1].text : '',
        lastMessageTimestamp: messages.length > 0 ? messages[messages.length - 1].createdAt : conv.created_at || '',
        unreadCount,
        messages,
      })
    }

    // 按最新消息时间排序
    result.sort((a, b) => new Date(b.lastMessageTimestamp).getTime() - new Date(a.lastMessageTimestamp).getTime())
    return result
  } catch (error: any) {
    console.error('[X Twitter DM] Error fetching conversations:', error)
    throw error
  }
}

/**
 * 发送 X/Twitter 私信
 */
export async function sendXDM(
  accessToken: string,
  recipientId: string,
  message: string
): Promise<{ id: string }> {
  const client = getXClientOAuth2(accessToken)
  if (!client) throw new Error('X API is not configured')

  try {
    const dmUrl = `https://api.x.com/2/dm_conversations/with/${recipientId}/messages`
    const body = {
      text: message,
    }

    const response = await fetch(dmUrl, {
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
      if (response.status === 403) {
        throw new Error('X DM send requires OAuth 2.0 scope: dm.write. Please re-authenticate with DM permissions.')
      }
      throw new Error(`X DM send failed: ${errorData?.errors?.[0]?.message || errorData?.error || 'Unknown error'}`)
    }

    const data = await response.json()
    return { id: data.data?.dm_event_id || data.data?.id || '' }
  } catch (error: any) {
    console.error('[X Twitter DM] Error sending message:', error)
    throw error
  }
}
