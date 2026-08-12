import { NextRequest, NextResponse } from "next/server"
import { verifyPassword, toPublicUser, generateToken, hashPassword } from "@/lib/users"
import { getRepository } from "@/lib/repository"
import { rateLimit, getClientIp } from "@/lib/auth"
import { validateEmail } from "@/lib/validation"

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req)
    if (!rateLimit('user_login:' + ip, 10, 60 * 1000)) {
      return NextResponse.json({ error: "Too many attempts, please try again later" }, { status: 429 })
    }

    const { email, password } = await req.json()
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 })
    }
    if (!validateEmail(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 })
    }
    const repo = getRepository()
    const user = repo.users.getByEmail(email)
    if (!user || !verifyPassword(password, user.passwordHash, user.salt)) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 })
    }

    const newHash = hashPassword(password, user.salt).hash
    if (newHash !== user.passwordHash) {
      repo.users.update(user.id, { passwordHash: newHash })
    }

    const token = generateToken()
    repo.users.update(user.id, { token })
    const res = NextResponse.json({ user: toPublicUser(user) }, { status: 200 })
    res.cookies.set("user_token", token, { httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 7, path: "/" })
    return res
  } catch { return NextResponse.json({ error: "Login failed" }, { status: 500 }) }
}
