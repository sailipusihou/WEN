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
import { storeAvatarLocally } from '@/lib/avatar-store'
import { ProxyAgent } from 'undici'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * 本机需要走代理才能访问境外平台时（国内开发环境）用它；
 * 服务器在美国是直连，PROXY_INIT 为空对象。与 lib/facebook.ts 同一套做法。
 */
const PROXY_URL = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || ''
let proxyAgent: ProxyAgent | null = null
if (PROXY_URL) {
  try { proxyAgent = new ProxyAgent(PROXY_URL) } catch { /* 地址不合法就当没有代理 */ }
}
const PROXY_INIT: RequestInit = proxyAgent ? ({ dispatcher: proxyAgent } as any) : {}

// 修复 C5: 非管理员只能管理自己的账号 (super_admin/admin 可管理全部)
function canManageAccount(auth: any, account: any): boolean {
  if (!account) return false
  if (['super_admin', 'admin'].includes(auth.user.role)) return true
  return account.staffId === auth.user.id
}

function assertCanManage(auth: any, account: any): NextResponse | null {
  if (!canManageAccount(auth, account)) {
    return NextResponse.json({ error: 'Forbidden: not your account' }, { status: 403 })
  }
  return null
}

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

    // 修复 H7: 返回账号列表时脱敏 token, 防止前端/日志泄露平台访问凭证
    const safeAccounts = accounts.map(({ accessToken, refreshToken, ...safe }: any) => ({
      ...safe,
      hasAccessToken: !!accessToken,
      hasRefreshToken: !!refreshToken,
    }))
    return NextResponse.json({ accounts: safeAccounts, total: safeAccounts.length })
  } catch (e) {
    console.error('[Social Accounts API] GET error:', e)
    return NextResponse.json({ error: 'Failed to fetch social accounts' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    // 修复 H7: 社媒账号管理 (连接/断开/验证/同步) 需 settings_manage
    const auth = requirePermission(req, 'settings_manage')
    if ('error' in auth) return auth.error

    const body = await req.json()
    const action = body.action

    if (action === 'connect') {
      const { staffId, staffName, staffAvatar, platform, platformName, username, avatar, profileUrl } = body

      if (!staffId || !staffName || !platform || !platformName || !username) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
      }

      // 修复 C5: 非管理员只能为自己连接账号, 不能指定任意 staffId
      const targetStaffId = ['super_admin', 'admin'].includes(auth.user.role) ? staffId : auth.user.id

      // 头像落到本站再存 —— 第三方链接会过期，且域名在境内被屏蔽
      const localAvatar = await storeAvatarLocally(platform, `${targetStaffId}-${username}`, avatar)

      const account = addSocialAccount({
        staffId: targetStaffId,
        staffName,
        staffAvatar,
        platform,
        platformName,
        username,
        avatar: localAvatar || avatar,
        profileUrl,
      })

      return NextResponse.json({ success: true, account }, { status: 201 })
    }

    if (action === 'disconnect') {
      const { id } = body
      if (!id) {
        return NextResponse.json({ error: 'ID is required' }, { status: 400 })
      }

      // 修复 C5: 归属校验
      const target = getSocialAccountById(id)
      const denied = assertCanManage(auth, target)
      if (denied) return denied

      const updated = disconnectSocialAccount(id)
      if (!updated) {
        return NextResponse.json({ error: 'Account not found' }, { status: 404 })
      }

      return NextResponse.json({ success: true, account: updated })
    }

    if (action === 'check-status') {
      // 修复 C5: 非管理员只能检查自己的账号
      const accounts = getAllSocialAccounts().filter(a => canManageAccount(auth, a))
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
      // 修复 C5: 归属校验
      const denied = assertCanManage(auth, account)
      if (denied) return denied

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
      // 修复 C5: 非管理员只能同步自己的账号
      const accounts = getAllSocialAccounts().filter(a => canManageAccount(auth, a))
      const results: { id: string; username: string; platform: string; synced: boolean; error?: string }[] = []

      for (const account of accounts) {
        try {
          let avatarUrl = account.avatar || ''
          const platform = account.platform

          // ── 1. 有 token 就向平台要**最新的**头像地址 ──────────────────
          // 老地址可能已经过期（实测 instagram 403 / facebook 404），必须重新取。
          if (account.accessToken) {
            try {
              if (platform === 'facebook') {
                const res = await fetch(`https://graph.facebook.com/v18.0/me?fields=picture.type(large)&access_token=${account.accessToken}`, PROXY_INIT)
                if (res.ok) avatarUrl = (await res.json()).picture?.data?.url || avatarUrl
              } else if (platform === 'instagram') {
                const res = await fetch(`https://graph.instagram.com/me?fields=profile_picture_url&access_token=${account.accessToken}`, PROXY_INIT)
                if (res.ok) avatarUrl = (await res.json()).profile_picture_url || avatarUrl
              } else if (platform === 'pinterest') {
                const res = await fetch('https://api.pinterest.com/v5/account', { ...PROXY_INIT, headers: { Authorization: `Bearer ${account.accessToken}` } })
                if (res.ok) avatarUrl = (await res.json()).profile_image || avatarUrl
              }
              // twitter/x 走 OAuth 1.0a，没有对应的取头像接口 —— 直接本地化现有地址
            } catch {
              // 平台取不到就用现有的地址，别中断
            }
          }

          // ── 2. 把远程头像**下载到本站** ────────────────────────────────
          // 这一步同时解决「链接过期」与「域名在境内被屏蔽」——
          // 存成站内文件后不再依赖第三方 CDN。详见 lib/avatar-store.ts
          const local = await storeAvatarLocally(platform, account.id, avatarUrl)
          if (local && local !== account.avatar) {
            updateSocialAccount(account.id, { avatar: local })
            results.push({ id: account.id, username: account.username, platform, synced: true })
          } else if (local) {
            results.push({ id: account.id, username: account.username, platform, synced: false, error: '本地头像已是最新' })
          } else {
            results.push({
              id: account.id, username: account.username, platform, synced: false,
              error: avatarUrl ? '头像下载失败（原链接可能已失效，且平台未返回新地址）' : '没有头像地址',
            })
          }
        } catch (e: any) {
          results.push({ id: account.id, username: account.username, platform: account.platform, synced: false, error: e.message })
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
      // 修复 C5: 归属校验
      const denied = assertCanManage(auth, account)
      if (denied) return denied

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
          // 头像一律落到本站再存 —— 第三方链接会过期、且域名在境内被屏蔽
          const localAvatar = await storeAvatarLocally(account.platform, account.id, updatedAvatar)
          updateSocialAccount(account.id, {
            username: updatedUsername,
            avatar: localAvatar || updatedAvatar,
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
      // 修复 C5: 归属校验
      const denied = assertCanManage(auth, account)
      if (denied) return denied

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
    // 修复 H7/C5: 账号编辑需 settings_manage + 归属校验
    const auth = requirePermission(req, 'settings_manage')
    if ('error' in auth) return auth.error

    const body = await req.json()
    if (!body.id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    const existing = getSocialAccountById(body.id)
    const denied = assertCanManage(auth, existing)
    if (denied) return denied

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
    // 修复 H7/C5: 删除账号需 settings_manage + 归属校验
    const auth = requirePermission(req, 'settings_manage')
    if ('error' in auth) return auth.error

    const { searchParams } = req.nextUrl
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    const existing = getSocialAccountById(id)
    const denied = assertCanManage(auth, existing)
    if (denied) return denied

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