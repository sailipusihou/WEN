import { NextRequest, NextResponse } from 'next/server'
import { hashPassword, verifyPassword, generateToken } from '@/lib/users'
import { getRepository } from '@/lib/repository'

export async function PUT(req: NextRequest) {
  const token = req.cookies.get('user_token')?.value
  if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  const repo = getRepository()
  const user = repo.users.getByToken(token)
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
  const { currentPassword, newPassword } = await req.json()
  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: 'Both current and new password are required' }, { status: 400 })
  }
  if (newPassword.length < 6) {
    return NextResponse.json({ error: 'New password must be at least 6 characters' }, { status: 400 })
  }
  // 修复: 使用 verifyPassword 兼容新旧迭代次数哈希 (原来直接用当前迭代数校验会误拒旧哈希)
  if (!verifyPassword(currentPassword, user.passwordHash, user.salt)) {
    return NextResponse.json({ error: 'Current password is incorrect' }, { status: 401 })
  }
  const { hash: newHash, salt: newSalt } = hashPassword(newPassword)
  // 修复 L16: 改密后吊销旧 token 并签发新 token (旧会话立即失效)
  const newToken = generateToken()
  const tokenExpiresAt = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString()
  repo.users.update(user.id, { passwordHash: newHash, salt: newSalt, token: newToken, tokenExpiresAt } as any)
  const res = NextResponse.json({ ok: true })
  res.cookies.set('user_token', newToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  })
  return res
}
