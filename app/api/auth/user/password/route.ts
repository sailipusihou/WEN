import { NextRequest, NextResponse } from 'next/server'
import { hashPassword } from '@/lib/users'
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
  const { hash } = hashPassword(currentPassword, user.salt)
  if (hash !== user.passwordHash) {
    return NextResponse.json({ error: 'Current password is incorrect' }, { status: 401 })
  }
  const { hash: newHash, salt: newSalt } = hashPassword(newPassword)
  repo.users.update(user.id, { passwordHash: newHash, salt: newSalt })
  return NextResponse.json({ ok: true })
}
