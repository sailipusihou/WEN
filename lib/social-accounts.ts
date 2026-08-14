import fs from 'fs'
import path from 'path'

const DATA_DIR = path.join(process.cwd(), 'data')
const SOCIAL_FILE = path.join(DATA_DIR, 'social-accounts.json')

export interface SocialAccount {
  id: string
  staffId: string
  staffName: string
  staffAvatar?: string
  platform: string
  platformName: string
  username: string
  avatar?: string           // 社交平台账户头像
  profileUrl?: string
  accessToken?: string
  refreshToken?: string
  platformUserId?: string  // 平台侧用户/页面ID，用于 Webhook 事件匹配
  platformId?: string      // 平台侧业务账号ID（如 Instagram Business Account ID）
  lastSync?: string
  status: 'connected' | 'disconnected' | 'expired'
  isOnline?: boolean       // 在线状态：token 有效时为 true
  lastOnlineCheck?: string // 上次在线状态检查时间
  createdAt: string
  updatedAt: string
}

// 修复: 非管理员只能使用自己的社交账号 (super_admin/admin 可管理全部)
export function canUserManageAccount(
  user: { id: string; role: string },
  account: { staffId?: string } | null | undefined
): boolean {
  if (!account) return false
  if (['super_admin', 'admin'].includes(user.role)) return true
  return account.staffId === user.id
}

function ensureFile(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }
  if (!fs.existsSync(SOCIAL_FILE)) {
    fs.writeFileSync(SOCIAL_FILE, '[]', 'utf-8')
  }
}

export function getAllSocialAccounts(): SocialAccount[] {
  ensureFile()
  const raw = fs.readFileSync(SOCIAL_FILE, 'utf-8').replace(/^\uFEFF/, '')
  try {
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr.sort((a: SocialAccount, b: SocialAccount) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ) : []
  } catch {
    return []
  }
}

export function getSocialAccountById(id: string): SocialAccount | undefined {
  return getAllSocialAccounts().find(a => a.id === id)
}

export function getSocialAccountsByStaffId(staffId: string): SocialAccount[] {
  return getAllSocialAccounts().filter(a => a.staffId === staffId)
}

export function getSocialAccountByPlatform(staffId: string, platform: string): SocialAccount | undefined {
  return getAllSocialAccounts().find(a => a.staffId === staffId && a.platform === platform)
}

export function addSocialAccount(data: {
  staffId: string
  staffName: string
  staffAvatar?: string
  platform: string
  platformName: string
  username: string
  avatar?: string
  profileUrl?: string
  accessToken?: string
  refreshToken?: string
  platformUserId?: string
  platformId?: string
}): SocialAccount {
  ensureFile()
  const accounts = getAllSocialAccounts()
  const now = new Date().toISOString()
  const account: SocialAccount = {
    id: `sa_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    staffId: data.staffId,
    staffName: data.staffName,
    staffAvatar: data.staffAvatar,
    platform: data.platform,
    platformName: data.platformName,
    username: data.username,
    avatar: data.avatar,
    profileUrl: data.profileUrl,
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    platformUserId: data.platformUserId,
    platformId: data.platformId,
    status: 'connected',
    isOnline: true,
    lastOnlineCheck: now,
    createdAt: now,
    updatedAt: now,
  }
  accounts.unshift(account)
  fs.writeFileSync(SOCIAL_FILE, JSON.stringify(accounts, null, 2), 'utf-8')
  return account
}

export function updateSocialAccount(id: string, updates: Partial<SocialAccount>): SocialAccount | null {
  ensureFile()
  const accounts = getAllSocialAccounts()
  const idx = accounts.findIndex(a => a.id === id)
  if (idx < 0) return null
  accounts[idx] = {
    ...accounts[idx],
    ...updates,
    id: accounts[idx].id,
    createdAt: accounts[idx].createdAt,
    updatedAt: new Date().toISOString(),
  }
  fs.writeFileSync(SOCIAL_FILE, JSON.stringify(accounts, null, 2), 'utf-8')
  return accounts[idx]
}

export function deleteSocialAccount(id: string): boolean {
  ensureFile()
  const accounts = getAllSocialAccounts()
  const next = accounts.filter(a => a.id !== id)
  if (next.length === accounts.length) return false
  fs.writeFileSync(SOCIAL_FILE, JSON.stringify(next, null, 2), 'utf-8')
  return true
}

export function disconnectSocialAccount(id: string): SocialAccount | null {
  return updateSocialAccount(id, {
    status: 'disconnected',
    accessToken: undefined,
    refreshToken: undefined,
  })
}

export function getSocialAccountStats(): {
  totalAccounts: number
  connectedAccounts: number
  byPlatform: Record<string, number>
  byStaff: Record<string, { count: number; name: string; avatar?: string }>
} {
  const accounts = getAllSocialAccounts()
  const totalAccounts = accounts.length
  const connectedAccounts = accounts.filter(a => a.status === 'connected').length

  const byPlatform: Record<string, number> = {}
  const byStaff: Record<string, { count: number; name: string; avatar?: string }> = {}

  accounts.forEach(a => {
    byPlatform[a.platform] = (byPlatform[a.platform] || 0) + 1
    if (!byStaff[a.staffId]) {
      byStaff[a.staffId] = {
        count: 1,
        name: a.staffName,
        avatar: a.staffAvatar,
      }
    } else {
      byStaff[a.staffId].count++
    }
  })

  return {
    totalAccounts,
    connectedAccounts,
    byPlatform,
    byStaff,
  }
}
