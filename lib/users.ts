import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { getCachedData, invalidateCache, CACHE_TTL } from '@/lib/cache'

export interface User {
  id: string
  email: string
  passwordHash: string
  salt: string
  firstName: string
  lastName: string
  phone: string
  avatar?: string
  dob?: string
  gender?: string
  bio?: string
  preferredCurrency?: string
  coupons?: Array<{
    code: string
    name: string
    discountType: 'percent' | 'fixed'
    value: number
    minSpend: number
    maxDiscount?: number
    issuedAt: string
    expiresAt: string
    used: boolean
  }>
  role?: string
  wishlist?: string[]
  addresses: UserAddress[]
  token?: string
  createdAt: string
  updatedAt: string
}

export interface UserAddress {
  id: string
  label: string
  firstName: string
  lastName: string
  phone: string
  address: string
  city: string
  state: string
  zip: string
  country: string
  isDefault: boolean
}

export interface PublicUser {
  id: string
  email: string
  firstName: string
  lastName: string
  phone: string
  avatar?: string
  dob?: string
  gender?: string
  bio?: string
  preferredCurrency?: string
  wishlist?: string[]
  addresses: UserAddress[]
  createdAt: string
}

const DATA_DIR = path.join(process.cwd(), 'data')
const USERS_FILE = path.join(DATA_DIR, 'users.json')

function ensureFile(): void {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
  if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, '[]', 'utf-8')
}

function stripBOM(s: string): string {
  return s.replace(/^\uFEFF/, '').trim()
}

function readUsers(): User[] {
  ensureFile()
  return getCachedData('users', USERS_FILE, () => {
    const raw = stripBOM(fs.readFileSync(USERS_FILE, 'utf-8'))
    return JSON.parse(raw)
  }, CACHE_TTL.users)
}

function writeUsers(users: User[]): void {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8')
  invalidateCache('users')
}

export function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const s = salt || crypto.randomBytes(16).toString('hex')
  // 从 1000 提升至 100000 次迭代 (OWASP 2023 推荐)
  const hash = crypto.pbkdf2Sync(password, s, 100000, 64, 'sha512').toString('hex')
  return { hash, salt: s }
}

// 常量时间比较, 防止时序攻击
function safeEqualStr(a: string, b: string): boolean {
  const ba = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ba.length !== bb.length) return false
  return crypto.timingSafeEqual(ba, bb)
}

export function createUser(data: { email: string; password: string; firstName: string; lastName: string }): User {
  const { hash, salt } = hashPassword(data.password)
  const token = generateToken()
  const user: User = {
    id: 'USR-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).slice(2, 6).toUpperCase(),
    email: data.email.toLowerCase().trim(),
    passwordHash: hash, salt,
    firstName: data.firstName, lastName: data.lastName,
    phone: '', addresses: [], token,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  }
  const users = readUsers()
  users.push(user)
  writeUsers(users)
  return user
}

export function findUserByEmail(email: string): User | undefined {
  return readUsers().find(u => u.email === email.toLowerCase().trim())
}

export function findUserById(id: string): User | undefined {
  return readUsers().find(u => u.id === id)
}

export function getAllUsers(): User[] {
  return readUsers()
}

export function updateUser(id: string, updates: Partial<User>): User | null {
  const users = readUsers()
  const idx = users.findIndex(u => u.id === id)
  if (idx === -1) return null
  users[idx] = { ...users[idx], ...updates, id: users[idx].id, updatedAt: new Date().toISOString() }
  writeUsers(users)
  return users[idx]
}

export function addUserAddress(userId: string, address: Omit<UserAddress, 'id'>): UserAddress | null {
  const users = readUsers()
  const idx = users.findIndex(u => u.id === userId)
  if (idx === -1) return null
  const newAddr: UserAddress = { ...address, id: 'ADDR-' + Date.now().toString(36).toUpperCase() }
  if (newAddr.isDefault) {
    users[idx].addresses.forEach(a => a.isDefault = false)
  }
  users[idx].addresses.push(newAddr)
  users[idx].updatedAt = new Date().toISOString()
  writeUsers(users)
  return newAddr
}

export function removeUserAddress(userId: string, addressId: string): boolean {
  const users = readUsers()
  const idx = users.findIndex(u => u.id === userId)
  if (idx === -1) return false
  const addrIdx = users[idx].addresses.findIndex(a => a.id === addressId)
  if (addrIdx === -1) return false
  users[idx].addresses.splice(addrIdx, 1)
  users[idx].updatedAt = new Date().toISOString()
  writeUsers(users)
  return true
}

export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id, email: user.email, firstName: user.firstName,
    lastName: user.lastName, phone: user.phone,
    avatar: user.avatar, dob: user.dob, gender: user.gender,
    bio: user.bio, preferredCurrency: user.preferredCurrency,
    addresses: user.addresses, createdAt: user.createdAt,
  }
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  // 优先尝试新版本 (100000 次迭代)
  if (safeEqualStr(hashPassword(password, salt).hash, hash)) return true
  // 兼容旧版本 (1000 次迭代)
  const legacyHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex')
  return safeEqualStr(legacyHash, hash)
}

// 检测并升级旧密码 hash (1000 -> 100000 次迭代)
export function needsPasswordRehash(hash: string): boolean {
  // 旧 hash 是 1000 次迭代生成的; 这里简单地总是返回 true, 让 verifyPassword 通过后自动升级
  // 实际判断需要存储迭代次数或版本字段, 这里采用保守策略
  return false // 升级逻辑在 login 路由中处理
}

export function generateToken(): string {
  return crypto.randomUUID()
}
export function findUserByToken(token: string): User | undefined {
  if (!token || token.length < 16) return undefined
  // 常量时间比较 token, 防止时序攻击
  return readUsers().find(u => u.token && safeEqualStr(u.token, token))
}

export function setUserToken(userId: string, token: string): void {
  const users = readUsers()
  const idx = users.findIndex(u => u.id === userId)
  if (idx !== -1) { users[idx].token = token; writeUsers(users) }
}
