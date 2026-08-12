import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import {
  createAdminSession,
  authenticateMainAdmin,
  authenticateStaff,
  COOKIE_OPTIONS,
  ADMIN_USER_COOKIE_OPTIONS,
  isSameOrigin,
  hashAdminPassword,
  type AdminUser,
} from "@/lib/auth"
import { getRepository } from "@/lib/repository"

// 简易速率限制: 每个 IP 每分钟最多 5 次失败登录
const loginAttempts = new Map<string, { count: number; firstAt: number }>()
const WINDOW_MS = 60 * 1000
const MAX_ATTEMPTS = 5

function rateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = loginAttempts.get(ip)
  if (!entry || now - entry.firstAt > WINDOW_MS) {
    loginAttempts.set(ip, { count: 1, firstAt: now })
    return true
  }
  if (entry.count >= MAX_ATTEMPTS) return false
  entry.count++
  return true
}

function recordFail(ip: string) {
  const now = Date.now()
  const entry = loginAttempts.get(ip)
  if (!entry || now - entry.firstAt > WINDOW_MS) {
    loginAttempts.set(ip, { count: 1, firstAt: now })
  } else {
    entry.count++
  }
}

function getClientIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
}

export async function POST(req: NextRequest) {
  // CSRF: 校验同源
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "Cross-origin request blocked" }, { status: 403 })
  }

  const ip = getClientIp(req)
  if (!rateLimit(ip)) {
    return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 })
  }

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }
  const { password, email, username } = body
  if (!password || typeof password !== "string") {
    return NextResponse.json({ error: "Password is required" }, { status: 400 })
  }

  let user: AdminUser | null = null

  // Mode 1: 主管理员 username + password
  if (username && typeof username === "string") {
    user = authenticateMainAdmin(username, password)
    // 首次登录或旧版明文: 自动迁移为哈希存储
    if (user && user.id === "main-admin") {
      const repo = getRepository()
      const settings = repo.settings.get()
      if (!settings.adminPasswordHash || !settings.adminPasswordSalt) {
        const { hash, salt } = hashAdminPassword(password)
        repo.settings.update({
          adminPassword: "",
          adminPasswordHash: hash,
          adminPasswordSalt: salt,
        } as any)
      }
    }
  } else if (email && typeof email === "string") {
    // Mode 2: 员工 email + password
    user = authenticateStaff(email, password)
  } else {
    // Mode 3 (向后兼容): 仅密码登录 — 已禁用, 强制使用 username + password
    return NextResponse.json(
      { error: "Username and password are required" },
      { status: 400 }
    )
  }

  if (!user) {
    recordFail(ip)
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
  }

  // 创建服务器端会话
  const token = createAdminSession(user.id, user.role)
  const cookieStore = await cookies()
  cookieStore.set("admin_token", token, COOKIE_OPTIONS)
  cookieStore.set("admin_user", JSON.stringify(user), ADMIN_USER_COOKIE_OPTIONS)

  return NextResponse.json({ ok: true, user })
}
