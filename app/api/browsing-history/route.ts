import { NextRequest, NextResponse } from "next/server"
import { getRepository } from "@/lib/repository"
import { requireAdmin } from "@/lib/auth"

function getClientIP(req: NextRequest): string {
  // 生产环境: 通过反向代理头获取真实 IP
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  const proxyHeaders = ['x-real-ip', 'x-client-ip', 'cf-connecting-ip', 'x-forwarded', 'true-client-ip']
  for (const h of proxyHeaders) {
    const val = req.headers.get(h)
    if (val) return val.trim()
  }
  // 本地开发环境: 无反向代理, 请求头中没有 IP 信息
  // Next.js App Router 的 NextRequest 不暴露 socket 远程地址
  return '127.0.0.1'
}

function getSessionUser(req: NextRequest): { id: string; email: string; name: string } | null {
  const token = req.cookies.get('user_token')?.value
  if (!token || token.length < 16) return null
  const repo = getRepository()
  const user = repo.users.getByToken(token)
  if (!user) return null
  return { id: user.id, email: user.email, name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email }
}

export async function GET(req: NextRequest) {
  // 浏览历史包含邮箱/IP 等隐私信息，仅管理员可读取
  const auth = requireAdmin(req)
  if ('error' in auth) return auth.error

  const repo = getRepository()
  const email = req.nextUrl.searchParams.get('email')
  const visitorId = req.nextUrl.searchParams.get('visitorId')
  
  if (email) {
    const history = repo.browsingHistory.getByEmail(email)
    return NextResponse.json(history)
  }
  
  if (visitorId) {
    const history = repo.browsingHistory.getByVisitor(visitorId)
    return NextResponse.json(history)
  }
  
  const history = repo.browsingHistory.list()
  return NextResponse.json(history)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const repo = getRepository()
    const user = getSessionUser(req)
    const ip = getClientIP(req)

    // 安全：email/userId 一律以服务端会话为准，忽略客户端伪造值
    if (!user && (body.email || body.userId)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }
    
    const record = repo.browsingHistory.add({
      sessionId: body.sessionId || '',
      userId: user?.id || undefined,
      email: user?.email || '',
      visitorId: body.visitorId || '',
      productId: body.productId || '',
      productName: body.productName || '',
      productImage: body.productImage || '',
      productPrice: body.productPrice || 0,
      productCode: body.productCode || '',
      productCategory: body.productCategory || '',
      pageType: body.pageType || 'product',
      duration: body.duration || 0,
      ip,
    })
    
    return NextResponse.json(record, { status: 201 })
  } catch (error) {
    console.error('browsing-history POST error:', error)
    return NextResponse.json({ error: 'Failed to record browsing history' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const repo = getRepository()

    // 安全：只允许更新时长（匿名会话也需要上报时长），禁止通过 PUT 篡改邮箱/用户ID
    const duration = Math.max(0, Math.min(86400, Number(body.duration) || 0))
    if (!body.id) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

    const result = repo.browsingHistory.update(body.id, {
      duration,
    })
    
    return NextResponse.json(result || { error: 'Not found' }, { status: result ? 200 : 404 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update browsing history' }, { status: 500 })
  }
}
