import { NextRequest, NextResponse } from 'next/server'
import { getRepository } from '@/lib/repository'

export async function POST(req: NextRequest) {
  const token = req.cookies.get('user_token')?.value
  if (token) {
    try {
      const repo = getRepository()
      const user = repo.users.getByToken(token)
      if (user) {
        repo.users.update(user.id, { token: undefined } as any)
      }
    } catch {
    }
  }
  const res = NextResponse.json({ ok: true })
  res.cookies.set('user_token', '', { httpOnly: true, sameSite: 'lax', maxAge: 0, path: '/' })
  return res
}
