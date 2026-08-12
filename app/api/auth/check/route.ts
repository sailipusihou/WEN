// 修复: 实际校验 admin_token 服务器端会话, 不能仅检查 cookie 存在
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const result = requireAdmin(req)
  if ('error' in result) return result.error
  return NextResponse.json({ ok: true, user: result.user })
}
