import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth'
import {
  getAllSocialAccounts,
  getSocialAccountById,
  addSocialAccount,
  updateSocialAccount,
  deleteSocialAccount,
  disconnectSocialAccount,
  getSocialAccountStats,
} from '@/lib/social-accounts'
import { refreshInstagramToken, getInstagramUserInfo } from '@/lib/instagram'
import { refreshFacebookToken, getFacebookUserInfo } from '@/lib/facebook'
import { refreshLinkedInToken, getLinkedInUserInfo } from '@/lib/linkedin'
import { refreshPinterestToken, getPinterestUserInfo } from '@/lib/pinterest'
import { refreshYouTubeToken, getYouTubeUserInfo } from '@/lib/youtube'
import { refreshTikTokToken, getTikTokUserInfo } from '@/lib/tiktok'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const auth = requirePermission(req, 'messages_view')
    if ('error' in auth) return auth.error

    const { searchParams } = req.nextUrl
    const stats = searchParams.get('stats')
    const staffId = searchParams.get('staffId')

    if (stats === 'true') {
      const result = getSocialAccountStats()
      return NextResponse.json(result)
    }

    const canViewAll = ['super_admin', 'admin'].includes(auth.user.role)

    let accounts = getAllSocialAccounts()
    if (canViewAll && staffId) {
      // 管理员可按 staffId 筛选查看特定员工
      accounts = accounts.filter(a => a.staffId === staffId)
    } else if (!canViewAll) {
      // 非管理员只能看到自己的账号
      accounts = accounts.filter(a => a.staffId === auth.user.id)
    }

    return NextResponse.json({ accounts, total: accounts.length })
  } catch (e) {
    console.error('[Social Accounts API] GET error:', e)
    return NextResponse.json({ error: 'Failed to fetch social accounts' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = requirePermission(req, 'messages_view')
    if ('error' in auth) return auth.error

    const body = await req.json()
    const action = body.action

    if (action === 'connect') {
      const { staffId, staffName, staffAvatar, platform, platformName, username, avatar, profileUrl } = body

      if (!staffId || !staffName || !platform || !platformName || !username) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
      }

      const account = addSocialAccount({
        staffId,
        staffName,
        staffAvatar,
        platform,
        platformName,
        username,
        avatar,
        profileUrl,
      })

      return NextResponse.json({ success: true, account }, { status: 201 })
    }

    if (action === 'disconnect') {
      const { id } = body
      if (!id) {
        return NextResponse.json({ error: 'ID is required' }, { status: 400 })
      }

      const updated = disconnectSocialAccount(id)
      if (!updated) {
        return NextResponse.json({ error: 'Account not found' }, { status: 404 })
      }

      return NextResponse.json({ success: true, account: updated })
    }

    if (action === 'check-status') {
      const accounts = getAllSocialAccounts()
      const now = new Date().toISOString()
      const nowMs = Date.now()
      const results: { id: string; username: string; platform: string; online: boolean }[] = []

      for (const account of accounts) {
        if (account.status !== 'connected' || !account.accessToken) {
          updateSocialAccount(account.id, { isOnline: false, lastOnlineCheck: now })
          results.push({ id: account.id, username: account.username, platform: account.platform, online: false })
          continue
        }

        // 对于最近 2 分钟内创建/更新的账户，信任其 isOnline 状态，避免刚登录就被覆盖
        const updatedAt = account.updatedAt ? new Date(account.updatedAt).getTime() : 0
        const isRecent = (nowMs - updatedAt) < 2 * 60 * 1000
        if (isRecent && account.isOnline === true) {
          results.push({ id: account.id, username: account.username, platform: account.platform, online: true })
          continue
        }

        try {
          let online = false
          const platform = account.platform
          let isAuthError = false

          if (platform === 'facebook') {
            const res = await fetch(`https://graph.facebook.com/v18.0/me?fields=id&access_token=${account.accessToken}`)
            online = res.ok
            if (res.status === 401 || res.status === 403) isAuthError = true
          } else if (platform === 'instagram') {
            const res = await fetch(`https://graph.instagram.com/me?fields=id&access_token=${account.accessToken}`)
            online = res.ok
            if (res.status === 401 || res.status === 403) isAuthError = true
          } else if (platform === 'pinterest') {
            const res = await fetch('https://api.pinterest.com/v5/account', {
              headers: { Authorization: `Bearer ${account.accessToken}` },
            })
            online = res.ok
            if (res.status === 401 || res.status === 403) isAuthError = true
          } else if (platform === 'twitter') {
            online = true // Twitter/X OAuth 1.0a tokens don't expire easily
          } else if (platform === 'linkedin') {
            const res = await fetch('https://api.linkedin.com/v2/userinfo', {
              headers: { Authorization: `Bearer ${account.accessToken}` },
            })
            online = res.ok
            if (res.status === 401 || res.status === 403) isAuthError = true
          } else if (platform === 'youtube') {
            const res = await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true', {
              headers: { Authorization: `Bearer ${account.accessToken}` },
            })
            online = res.ok
            if (res.status === 401 || res.status === 403) isAuthError = true
          } else if (platform === 'tiktok') {
            online = true // TikTok tokens are long-lived
          } else {
            online = true
          }

          // 核心逻辑：区分网络错误和认证错误
          // - 认证错误（401/403）→ token无效，标记为离线
          // - 网络错误（fetch异常）→ 保持上次状态，不做变更
          if (isAuthError) {
            updateSocialAccount(account.id, { isOnline: false, lastOnlineCheck: now })
            results.push({ id: account.id, username: account.username, platform: account.platform, online: false })
          } else {
            updateSocialAccount(account.id, { isOnline: online, lastOnlineCheck: now })
            results.push({ id: account.id, username: account.username, platform: account.platform, online })
          }
        } catch {
          // 网络错误（超时、断网等）→ 保持上次在线状态，不做变更
          results.push({ id: account.id, username: account.username, platform: account.platform, online: account.isOnline === true })
        }
      }

      return NextResponse.json({ success: true, results })
    }

    if (action === 'verify-token') {
      // 验证单个账户的token有效性（用于离线头像点击时验证）
      const { accountId } = body
      if (!accountId) {
        return NextResponse.json({ error: 'accountId is required' }, { status: 400 })
      }

      const account = getSocialAccountById(accountId)
      if (!account) {
        return NextResponse.json({ error: 'Account not found' }, { status: 404 })
      }

      if (account.status !== 'connected' || !account.accessToken) {
        updateSocialAccount(account.id, { isOnline: false, lastOnlineCheck: new Date().toISOString() })
        return NextResponse.json({ success: true, online: false, reason: 'no_token' })
      }

      try {
        let online = false
        let tokenRefreshed = false
        const platform = account.platform
        let newAccessToken = account.accessToken
        let newRefreshToken = account.refreshToken

        // 检查token有效性
        if (platform === 'facebook') {
          const res = await fetch(`https://graph.facebook.com/v18.0/me?fields=id&access_token=${account.accessToken}`)
          online = res.ok
          if (!online && account.refreshToken) {
            // token过期，尝试刷新
            try {
              const refreshed = await refreshFacebookToken(account.refreshToken)
              newAccessToken = refreshed.accessToken
              newRefreshToken = refreshed.refreshToken || account.refreshToken
              online = true
              tokenRefreshed = true
            } catch { /* refresh failed */ }
          }
        } else if (platform === 'instagram') {
          const res = await fetch(`https://graph.instagram.com/me?fields=id&access_token=${account.accessToken}`)
          online = res.ok
          if (!online && account.refreshToken) {
            // token过期，尝试刷新（直接fetch，不走代理）
            try {
              const refreshUrl = `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${account.refreshToken}`
              const refreshRes = await fetch(refreshUrl)
              if (refreshRes.ok) {
                const refreshData = await refreshRes.json()
                newAccessToken = refreshData.access_token
                online = true
                tokenRefreshed = true
              }
            } catch { /* refresh failed */ }
          }
        } else if (platform === 'pinterest') {
          const res = await fetch('https://api.pinterest.com/v5/account', {
            headers: { Authorization: `Bearer ${account.accessToken}` },
          })
          online = res.ok
          if (!online && account.refreshToken) {
            try {
              const refreshed = await refreshPinterestToken(account.refreshToken)
              newAccessToken = refreshed.accessToken
              newRefreshToken = refreshed.refreshToken || account.refreshToken
              online = true
              tokenRefreshed = true
            } catch { /* refresh failed */ }
          }
        } else if (platform === 'twitter') {
          online = true // Twitter/X OAuth 1.0a tokens don't expire easily
        } else if (platform === 'linkedin') {
          const res = await fetch('https://api.linkedin.com/v2/userinfo', {
            headers: { Authorization: `Bearer ${account.accessToken}` },
          })
          online = res.ok
          if (!online && account.refreshToken) {
            try {
              const refreshed = await refreshLinkedInToken(account.refreshToken)
              newAccessToken = refreshed.accessToken
              newRefreshToken = refreshed.refreshToken || account.refreshToken
              online = true
              tokenRefreshed = true
            } catch { /* refresh failed */ }
          }
        } else if (platform === 'youtube') {
          const res = await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true', {
            headers: { Authorization: `Bearer ${account.accessToken}` },
          })
          online = res.ok
          if (!online && account.refreshToken) {
            try {
              const refreshed = await refreshYouTubeToken(account.refreshToken)
              newAccessToken = refreshed.accessToken
              newRefreshToken = refreshed.refreshToken || account.refreshToken
              online = true
              tokenRefreshed = true
            } catch { /* refresh failed */ }
          }
        } else if (platform === 'tiktok') {
          online = true // TikTok tokens are long-lived
          if (!online && account.refreshToken) {
            try {
              const refreshed = await refreshTikTokToken(account.refreshToken)
              newAccessToken = refreshed.accessToken
              newRefreshToken = refreshed.refreshToken || account.refreshToken
              online = true
              tokenRefreshed = true
            } catch { /* refresh failed */ }
          }
        } else {
          online = true
        }

        const now = new Date().toISOString()
        const updates: any = { isOnline: online, lastOnlineCheck: now }
        if (tokenRefreshed) {
          updates.accessToken = newAccessToken
          if (newRefreshToken) updates.refreshToken = newRefreshToken
          updates.updatedAt = now
        }
        updateSocialAccount(account.id, updates)

        return NextResponse.json({
          success: true,
          online,
          refreshed: tokenRefreshed,
          account: {
            id: account.id,
            username: account.username,
            platform: account.platform,
            profileUrl: account.profileUrl,
          },
        })
      } catch {
        // 网络错误 → 保持上次状态
        return NextResponse.json({
          success: true,
          online: account.isOnline === true,
          reason: 'network_error',
        })
      }
    }

    if (action === 'sync-avatars') {
      const accounts = getAllSocialAccounts()
      const results: { id: string; username: string; platform: string; synced: boolean; error?: string }[] = []

      for (const account of accounts) {
        if (!account.avatar && account.accessToken) {
          try {
            let avatarUrl = ''
            const platform = account.platform

            if (platform === 'facebook') {
              const res = await fetch(`https://graph.facebook.com/v18.0/me?fields=picture.type(large)&access_token=${account.accessToken}`)
              if (res.ok) {
                const data = await res.json()
                avatarUrl = data.picture?.data?.url || ''
              }
            } else if (platform === 'instagram') {
              const res = await fetch(`https://graph.instagram.com/me?fields=profile_picture_url&access_token=${account.accessToken}`)
              if (res.ok) {
                const data = await res.json()
                avatarUrl = data.profile_picture_url || ''
              }
            } else if (platform === 'pinterest') {
              const res = await fetch('https://api.pinterest.com/v5/account', {
                headers: { Authorization: `Bearer ${account.accessToken}` },
              })
              if (res.ok) {
                const data = await res.json()
                avatarUrl = data.profile_image || ''
              }
            } else if (platform === 'twitter') {
              // Twitter/X uses OAuth 1.0a - avatar is already saved in callback
            }

            if (avatarUrl) {
              updateSocialAccount(account.id, { avatar: avatarUrl })
              results.push({ id: account.id, username: account.username, platform: account.platform, synced: true })
            } else {
              results.push({ id: account.id, username: account.username, platform: account.platform, synced: false, error: 'No avatar URL returned' })
            }
          } catch (e: any) {
            results.push({ id: account.id, username: account.username, platform: account.platform, synced: false, error: e.message })
          }
        } else {
          results.push({ id: account.id, username: account.username, platform: account.platform, synced: false, error: account.avatar ? 'Already has avatar' : 'No access token' })
        }
      }

      return NextResponse.json({ success: true, results })
    }

    if (action === 'sync-user-info') {
      // 同步用户信息：从各平台API拉取最新的头像、名称、主页链接
      const { accountId } = body
      if (!accountId) {
        return NextResponse.json({ error: 'accountId is required' }, { status: 400 })
      }

      const account = getSocialAccountById(accountId)
      if (!account) {
        return NextResponse.json({ error: 'Account not found' }, { status: 404 })
      }

      if (account.status !== 'connected' || !account.accessToken) {
        return NextResponse.json({
          success: true,
          synced: false,
          reason: 'no_token',
          account: { id: account.id, username: account.username, platform: account.platform },
        })
      }

      try {
        let updatedUsername = account.username
        let updatedAvatar = account.avatar
        let updatedProfileUrl = account.profileUrl
        let synced = false
        const platform = account.platform

        if (platform === 'facebook') {
          const userInfo = await getFacebookUserInfo(account.accessToken)
          updatedUsername = userInfo.name || userInfo.id || account.username
          updatedAvatar = userInfo.picture?.data?.url || account.avatar || ''
          updatedProfileUrl = userInfo.link || account.profileUrl || ''
          synced = true
        } else if (platform === 'instagram') {
          const userInfo = await getInstagramUserInfo(account.accessToken)
          updatedUsername = userInfo.username || userInfo.id || account.username
          updatedAvatar = userInfo.profile_picture_url || account.avatar || ''
          updatedProfileUrl = `https://instagram.com/${userInfo.username}` || account.profileUrl || ''
          synced = true
        } else if (platform === 'linkedin') {
          const userInfo = await getLinkedInUserInfo(account.accessToken)
          updatedUsername = userInfo.name || account.username
          updatedAvatar = userInfo.picture || account.avatar || ''
          updatedProfileUrl = account.profileUrl || `https://www.linkedin.com/in/${userInfo.id || ''}`
          synced = true
        } else if (platform === 'pinterest') {
          const userInfo = await getPinterestUserInfo(account.accessToken)
          const displayName = userInfo.username || `${userInfo.firstName || ''} ${userInfo.lastName || ''}`.trim()
          updatedUsername = displayName || account.username
          updatedAvatar = userInfo.profileImage || account.avatar || ''
          updatedProfileUrl = `https://www.pinterest.com/${userInfo.username}/` || account.profileUrl || ''
          synced = true
        } else if (platform === 'youtube') {
          const userInfo = await getYouTubeUserInfo(account.accessToken)
          updatedUsername = userInfo.title || account.username
          updatedAvatar = userInfo.thumbnailUrl || account.avatar || ''
          updatedProfileUrl = `https://www.youtube.com/channel/${userInfo.id}` || account.profileUrl || ''
          synced = true
        } else if (platform === 'tiktok') {
          const userInfo = await getTikTokUserInfo(account.accessToken)
          updatedUsername = userInfo.username || account.username
          updatedAvatar = userInfo.avatarUrl || account.avatar || ''
          updatedProfileUrl = `https://www.tiktok.com/@${userInfo.username}` || account.profileUrl || ''
          synced = true
        } else if (platform === 'twitter') {
          // Twitter/X OAuth 1.0a - 头像和名称已在回调中保存
          synced = true
        }

        if (synced) {
          const now = new Date().toISOString()
          updateSocialAccount(account.id, {
            username: updatedUsername,
            avatar: updatedAvatar,
            profileUrl: updatedProfileUrl,
            updatedAt: now,
          })
        }

        return NextResponse.json({
          success: true,
          synced,
          account: {
            id: account.id,
            username: updatedUsername,
            platform: account.platform,
            profileUrl: updatedProfileUrl,
          },
        })
      } catch (e: any) {
        console.error(`[Sync User Info] Failed for ${account.platform}/${account.id}:`, e)
        return NextResponse.json({
          success: true,
          synced: false,
          error: e.message,
          account: { id: account.id, username: account.username, platform: account.platform },
        })
      }
    }

    if (action === 'force-online') {
      // 强制将账户设为在线状态（用于离线头像点击时）
      const { accountId } = body
      if (!accountId) {
        return NextResponse.json({ error: 'accountId is required' }, { status: 400 })
      }

      const account = getSocialAccountById(accountId)
      if (!account) {
        return NextResponse.json({ error: 'Account not found' }, { status: 404 })
      }

      const now = new Date().toISOString()
      updateSocialAccount(account.id, { isOnline: true, lastOnlineCheck: now, updatedAt: now })

      return NextResponse.json({
        success: true,
        online: true,
        account: {
          id: account.id,
          username: account.username,
          platform: account.platform,
          profileUrl: account.profileUrl,
        },
      })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (e) {
    console.error('[Social Accounts API] POST error:', e)
    return NextResponse.json({ error: 'Failed to process social account action' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = requirePermission(req, 'messages_view')
    if ('error' in auth) return auth.error

    const body = await req.json()
    if (!body.id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    const updates: any = {}
    if (body.username !== undefined) updates.username = body.username
    if (body.avatar !== undefined) updates.avatar = body.avatar
    if (body.profileUrl !== undefined) updates.profileUrl = body.profileUrl
    if (body.status !== undefined) updates.status = body.status

    const updated = updateSocialAccount(body.id, updates)
    if (!updated) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, account: updated })
  } catch (e) {
    console.error('[Social Accounts API] PUT error:', e)
    return NextResponse.json({ error: 'Failed to update social account' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = requirePermission(req, 'messages_view')
    if ('error' in auth) return auth.error

    const { searchParams } = req.nextUrl
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    const success = deleteSocialAccount(id)
    if (!success) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[Social Accounts API] DELETE error:', e)
    return NextResponse.json({ error: 'Failed to delete social account' }, { status: 500 })
  }
}