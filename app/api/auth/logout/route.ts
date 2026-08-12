// 修复: 注销时撤销服务器端会话, 不能仅删除 cookie
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { revokeAdminSession } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const token = req.cookies.get('admin_token')?.value
  if (token) revokeAdminSession(token)
  const cookieStore = await cookies()
  cookieStore.delete('admin_token')
  cookieStore.delete('admin_user')
  return NextResponse.json({ ok: true })
}
