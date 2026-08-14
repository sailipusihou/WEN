import { NextRequest, NextResponse } from 'next/server'
import { toPublicUser } from '@/lib/users'
import { getRepository } from '@/lib/repository'
import { requirePermission } from '@/lib/auth'
import { validateString, sanitizeString, validateId } from '@/lib/validation'

export async function GET(req: NextRequest) {
  const auth = requirePermission(req, 'users_view')
  if ('error' in auth) return auth.error
  const id = req.nextUrl.pathname.split('/').pop() || ''
  if (!validateId(id)) return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 })
  const repo = getRepository()
  const user = repo.users.getById(id)
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
  return NextResponse.json(toPublicUser(user))
}

export async function PUT(req: NextRequest) {
  // 修复 H7: 写操作改用 users_edit (原 users_view 是只读权限)
  const auth = requirePermission(req, 'users_edit')
  if ('error' in auth) return auth.error
  const id = req.nextUrl.pathname.split('/').pop() || ''
  if (!validateId(id)) return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 })

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // 防止越权: 不允许通过此接口修改 passwordHash/salt/token/id/email
  const forbidden = ['passwordHash', 'salt', 'token', 'id', 'email']
  for (const k of forbidden) delete body[k]

  // 输入验证与清理
  const cleanBody: any = {}
  if (body.firstName !== undefined) {
    if (!validateString(body.firstName, 50)) return NextResponse.json({ error: 'First name too long' }, { status: 400 })
    cleanBody.firstName = sanitizeString(body.firstName)
  }
  if (body.lastName !== undefined) {
    if (!validateString(body.lastName, 50)) return NextResponse.json({ error: 'Last name too long' }, { status: 400 })
    cleanBody.lastName = sanitizeString(body.lastName)
  }
  if (body.phone !== undefined) {
    if (!validateString(body.phone, 30)) return NextResponse.json({ error: 'Phone too long' }, { status: 400 })
    cleanBody.phone = sanitizeString(body.phone)
  }
  if (body.bio !== undefined) {
    if (!validateString(body.bio, 500)) return NextResponse.json({ error: 'Bio too long' }, { status: 400 })
    cleanBody.bio = sanitizeString(body.bio)
  }
  if (body.avatar !== undefined) {
    if (!validateString(body.avatar, 500)) return NextResponse.json({ error: 'Avatar URL too long' }, { status: 400 })
    cleanBody.avatar = sanitizeString(body.avatar)
  }
  if (body.preferredCurrency !== undefined) {
    if (!validateString(body.preferredCurrency, 10)) return NextResponse.json({ error: 'Invalid currency' }, { status: 400 })
    cleanBody.preferredCurrency = sanitizeString(body.preferredCurrency)
  }
  if (body.gender !== undefined) {
    if (!validateString(body.gender, 20)) return NextResponse.json({ error: 'Invalid gender' }, { status: 400 })
    cleanBody.gender = sanitizeString(body.gender)
  }
  if (body.addresses !== undefined && Array.isArray(body.addresses)) {
    cleanBody.addresses = body.addresses
  }
  if (body.wishlist !== undefined && Array.isArray(body.wishlist)) {
    cleanBody.wishlist = body.wishlist
  }

  const repo = getRepository()
  const updated = repo.users.update(id, cleanBody)
  if (!updated) return NextResponse.json({ error: 'User not found' }, { status: 404 })
  return NextResponse.json(toPublicUser(updated))
}
