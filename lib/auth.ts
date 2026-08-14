import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { getSettings, verifyStaffPassword } from '@/lib/settings'
import { toPublicUser, type PublicUser } from '@/lib/users'
import { ROLE_DEFAULT_PERMISSIONS, getEffectivePermissions } from '@/lib/permissions'
import { getRepository } from '@/lib/repository'

// ---- 会话存储 (基于 JSON 文件, 生产环境建议改用 Redis/DB) ----

interface AdminSession {
  token: string
  userId: string
  role: string
  createdAt: number
  expiresAt: number
  // 短哈希(无法反推 token, 仅用于查询比对)
  tokenHash: string
}

const DATA_DIR = path.join(process.cwd(), 'data')
const SESSIONS_FILE = path.join(DATA_DIR, 'admin-sessions.json')
const SESSION_TTL_MS = 24 * 60 * 60 * 1000 // 24 小时

function ensureSessionsFile(): void {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
  if (!fs.existsSync(SESSIONS_FILE)) fs.writeFileSync(SESSIONS_FILE, '[]', 'utf-8')
}

function readSessions(): AdminSession[] {
  try {
    ensureSessionsFile()
    const raw = fs.readFileSync(SESSIONS_FILE, 'utf-8').replace(/^\uFEFF/, '').trim()
    const all: AdminSession[] = JSON.parse(raw)
    // 清理过期会话
    const now = Date.now()
    const valid = all.filter(s => s.expiresAt > now)
    if (valid.length !== all.length) {
      fs.writeFileSync(SESSIONS_FILE, JSON.stringify(valid, null, 2), 'utf-8')
    }
    return valid
  } catch {
    return []
  }
}

function writeSessions(sessions: AdminSession[]): void {
  ensureSessionsFile()
  // 修复 S1: 原始 token 只存在于 Cookie 与内存, 磁盘仅持久化 tokenHash,
  // 防止 data/admin-sessions.json 泄露导致会话被直接劫持
  const safeSessions = sessions.map(({ token: _token, ...rest }) => rest)
  fs.writeFileSync(SESSIONS_FILE, JSON.stringify(safeSessions, null, 2), 'utf-8')
}

// 常量时间比较, 防止时序攻击
function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ba.length !== bb.length) return false
  return crypto.timingSafeEqual(ba, bb)
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

// ---- 创建/撤销会话 ----

export function createAdminSession(userId: string, role: string): string {
  const token = crypto.randomBytes(32).toString('hex')
  const now = Date.now()
  const session: AdminSession = {
    token,
    userId,
    role,
    createdAt: now,
    expiresAt: now + SESSION_TTL_MS,
    tokenHash: hashToken(token),
  }
  const all = readSessions()
  // 同一用户最多保留 5 个会话
  const userSessions = all.filter(s => s.userId === userId)
  if (userSessions.length >= 5) {
    const toRemove = userSessions.slice(0, userSessions.length - 4).map(s => s.tokenHash)
    const remaining = all.filter(s => !toRemove.includes(s.tokenHash))
    remaining.push(session)
    writeSessions(remaining)
  } else {
    all.push(session)
    writeSessions(all)
  }
  return token
}

export function revokeAdminSession(token: string): void {
  if (!token) return
  const all = readSessions()
  const tokenHash = hashToken(token)
  const remaining = all.filter(s => !safeEqual(s.tokenHash, tokenHash))
  writeSessions(remaining)
}

// 吊销某用户除指定 token 外的全部会话 (改密时调用)
export function revokeAllSessionsExcept(userId: string, keepToken?: string): number {
  const all = readSessions()
  const keepHash = keepToken ? hashToken(keepToken) : ''
  const before = all.length
  const remaining = all.filter(s => s.userId !== userId || (keepHash && safeEqual(s.tokenHash, keepHash)))
  if (remaining.length !== before) writeSessions(remaining)
  return before - remaining.length
}

// ---- 校验会话 ----

export interface AdminUser {
  id: string
  name: string
  email: string
  role: string
  permissions: string[]
  avatar?: string
}

export function validateAdminToken(token: string | undefined | null): AdminUser | null {
  if (!token || token.length < 16) return null
  const all = readSessions()
  const tokenHash = hashToken(token)
  const session = all.find(s => safeEqual(s.tokenHash, tokenHash))
  if (!session) return null
  if (session.expiresAt <= Date.now()) {
    revokeAdminSession(token)
    return null
  }
  const repo = getRepository()
  const settings = repo.settings.get() || { staffMembers: [] }
  // 主管理员: 从 settings 读取最新信息
  if (session.userId === 'main-admin') {
    return {
      id: 'main-admin',
      name: settings.adminUsername || 'Admin',
      email: settings.adminEmail || 'admin@lowflame.com',
      role: 'super_admin',
      permissions: [],
      avatar: settings.adminAvatar || '',
    }
  }
  // 员工: 从 staffMembers 读取最新信息
  const staff = settings.staffMembers || []
  const member = staff.find(s => s.id === session.userId)
  if (member) {
    return {
      id: member.id,
      name: member.name,
      email: member.email,
      role: member.role,
      permissions: member.permissions || [],
      avatar: member.avatar || '',
    }
  }
  // fallback
  return {
    id: session.userId,
    name: session.userId,
    email: '',
    role: session.role,
    permissions: [],
  }
}

// 从 admin_user cookie 安全读取 (仅供前端展示用, 不能作为鉴权依据)
function readAdminUserCookie(req: NextRequest): AdminUser | null {
  const raw = req.cookies.get('admin_user')?.value
  if (!raw) return null
  try {
    const u = JSON.parse(raw)
    return {
      id: String(u.id || ''),
      name: String(u.name || ''),
      email: String(u.email || ''),
      role: String(u.role || ''),
      permissions: Array.isArray(u.permissions) ? u.permissions : [],
      avatar: u.avatar ? String(u.avatar) : undefined,
    }
  } catch {
    return null
  }
}

// ---- 路由守卫 ----

function getStaffPermissionsById(userId: string): string[] {
  try {
    const repo = getRepository()
    const settings = repo.settings.get() || { staffMembers: [] }
    const staff = settings.staffMembers?.find((s: any) => s.id === userId)
    if (staff) {
      return getEffectivePermissions(staff.role, staff.permissions)
    }
  } catch {}
  return []
}

export function requireAdmin(req: NextRequest): { user: AdminUser } | { error: import('next/server').NextResponse } {
  const token = req.cookies.get('admin_token')?.value
  const sessionUser = validateAdminToken(token)
  if (!sessionUser) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }
  const cookieUser = readAdminUserCookie(req)
  const role = sessionUser.role || cookieUser?.role || ''
  let permissions: string[] = []
  if (role === 'super_admin') {
    permissions = ROLE_DEFAULT_PERMISSIONS.super_admin
  } else if (sessionUser.id !== 'main-admin') {
    permissions = getStaffPermissionsById(sessionUser.id)
  } else {
    permissions = ROLE_DEFAULT_PERMISSIONS.admin
  }
  const user: AdminUser = {
    id: sessionUser.id,
    name: sessionUser.name || cookieUser?.name || '',
    email: sessionUser.email || cookieUser?.email || '',
    role,
    permissions,
    avatar: sessionUser.avatar || cookieUser?.avatar || '',
  }
  return { user }
}

export function requirePermission(req: NextRequest, permissionKey: string): { user: AdminUser } | { error: import('next/server').NextResponse } {
  const result = requireAdmin(req)
  if ('error' in result) return result
  if (!result.user.permissions.includes(permissionKey)) {
    return { error: NextResponse.json({ error: 'Forbidden: missing permission ' + permissionKey }, { status: 403 }) }
  }
  return result
}

export function requireSuperAdmin(req: NextRequest): { user: AdminUser } | { error: import('next/server').NextResponse } {
  const result = requireAdmin(req)
  if ('error' in result) return result
  if (result.user.role !== 'super_admin') {
    return { error: NextResponse.json({ error: 'Forbidden: super_admin only' }, { status: 403 }) }
  }
  return result
}

export function requireUser(req: NextRequest): { user: PublicUser } | { error: import('next/server').NextResponse } {
  const token = req.cookies.get('user_token')?.value
  if (!token || token.length < 16) {
    return { error: NextResponse.json({ error: 'Not authenticated' }, { status: 401 }) }
  }
  const repo = getRepository()
  const user = repo.users.getByToken(token)
  if (!user) {
    return { error: NextResponse.json({ error: 'User not found' }, { status: 404 }) }
  }
  return { user: toPublicUser(user) }
}

// ---- 管理员密码哈希 (替代明文存储) ----

const ADMIN_ITERATIONS = 210000
// 兼容旧哈希 (100000 次迭代)
const ADMIN_LEGACY_ITERATIONS = 100000

export function hashAdminPassword(password: string, salt?: string): { hash: string; salt: string } {
  const s = salt || crypto.randomBytes(16).toString('hex')
  const hash = crypto.pbkdf2Sync(password, s, ADMIN_ITERATIONS, 64, 'sha512').toString('hex')
  return { hash, salt: s }
}

export function verifyAdminPassword(password: string, stored: string, salt: string): boolean {
  // 优先 210k, 兼容旧 100k 与更旧 1000 次迭代
  const { hash } = hashAdminPassword(password, salt)
  if (safeEqual(hash, stored)) return true
  const legacyHash = crypto.pbkdf2Sync(password, salt, ADMIN_LEGACY_ITERATIONS, 64, 'sha512').toString('hex')
  if (safeEqual(legacyHash, stored)) return true
  const legacyHash2 = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex')
  return safeEqual(legacyHash2, stored)
}

// ---- 安全 cookie 选项 ----

export const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 60 * 60 * 24, // 1 天
  path: '/',
}

// admin_user cookie 需要 JS 可读(前端展示用户名), 不能 httpOnly
export const ADMIN_USER_COOKIE_OPTIONS = {
  httpOnly: false,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 60 * 60 * 24,
  path: '/',
}

// 鉴权辅助: 校验 username + password 是否为合法管理员
export function authenticateMainAdmin(username: string, password: string): AdminUser | null {
  const repo = getRepository()
  const settings = repo.settings.get() || {} as any
  if (username !== settings.adminUsername) return null
  // 兼容: 已迁移到 hash, 否则明文校验并自动迁移
  if (settings.adminPasswordHash && settings.adminPasswordSalt) {
    if (!verifyAdminPassword(password, settings.adminPasswordHash, settings.adminPasswordSalt)) return null
  } else {
    // 兼容旧版明文 (常量时间比较)
    if (!safeEqual(password, settings.adminPassword || '')) return null
  }
  return {
    id: 'main-admin',
    name: settings.adminUsername || 'Admin',
    email: settings.adminEmail || 'admin@lowflame.com',
    role: 'super_admin',
    permissions: [],
    avatar: settings.adminAvatar || '',
  }
}

export function authenticateStaff(email: string, password: string): AdminUser | null {
  const repo = getRepository()
  const settings = repo.settings.get() || { staffMembers: [] }
  const staff = settings.staffMembers || []
  const member = staff.find(s => s.email.toLowerCase() === email.toLowerCase())
  if (!member) return null
  if (!member.active) return null
  if (!verifyStaffPassword(password, member)) return null
  return {
    id: member.id,
    name: member.name,
    email: member.email,
    role: member.role,
    permissions: member.permissions || [],
    avatar: member.avatar || '',
  }
}

// 检查请求来源是否同源 (轻量 CSRF 防御)
export function isSameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get('origin')
  const host = req.headers.get('host')
  if (!origin) return true // 非浏览器请求 (如 curl) 跳过
  if (!host) return false
  try {
    const u = new URL(origin)
    return u.host === host
  } catch {
    return false
  }
}

// ---- 速率限制 (内存存储, 重启后清零; 生产环境建议改用 Redis) ----

interface RateLimitEntry {
  count: number
  resetAt: number
}

const rateLimitStore = new Map<string, RateLimitEntry>()

export function rateLimit(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now()
  const entry = rateLimitStore.get(key)
  if (!entry || entry.resetAt < now) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }
  if (entry.count >= maxRequests) {
    return false
  }
  entry.count += 1
  return true
}

export function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return req.headers.get('x-real-ip') || 'unknown'
}
