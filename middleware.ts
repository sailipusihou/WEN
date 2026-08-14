import { NextRequest, NextResponse } from 'next/server'

const adminPaths = ['/admin']
const adminApiPaths = ['/api/products', '/api/users', '/api/categories', '/api/settings', '/api/staff', '/api/work-log', '/api/reviews', '/api/messages', '/api/upload', '/api/avatars',
  // 修复 H19: 补全管理写接口兜底 (marketing/ai/shipping/coupons/promotions/支付/供应商/客户/推荐/知识库/内部私聊)
  '/api/marketing', '/api/ai', '/api/admin', '/api/suppliers', '/api/shipments', '/api/shipping',
  '/api/coupons', '/api/promotions', '/api/customers', '/api/customer-profiles',
  '/api/paypal', '/api/payoneer', '/api/referrals', '/api/knowledge-base', '/api/internal-chat']
const publicAdminPaths = ['/admin/login']
const publicAdminApiPaths = ['/api/products/template', '/api/settings'] // GET /api/settings 公开, route 内部按需脱敏
const userPaths = ['/account']
const userApiPaths = ['/api/auth/user']
const publicUserPaths = ['/login', '/register']
const publicUserApiPaths = ['/api/auth/user-login', '/api/auth/register']

// 公开写路径豁免: 路由内部自行处理鉴权/签名/限频, 中间件不拦截
const publicWritePaths: { path: string; methods?: string[] }[] = [
  { path: '/api/messages', methods: ['POST'] },      // 客户咨询留言 (公开)
  { path: '/api/coupons', methods: ['POST'] },       // 优惠券 apply (公开; 管理端创建由路由校验)
  { path: '/api/marketing/webhook' },                // 平台 webhook 回调 (签名校验在路由内, 平台无 cookie)
]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isUserPage = userPaths.some((p) => pathname === p || pathname.startsWith(p + '/')) &&
    !publicUserPaths.some((p) => pathname.startsWith(p))
  const isUserApi = userApiPaths.some((p) => pathname.startsWith(p)) &&
    !publicUserApiPaths.some((p) => pathname.startsWith(p))

  const isProtectedPage = adminPaths.some((p) => pathname === p || pathname.startsWith(p + '/')) &&
    !publicAdminPaths.some((p) => pathname.startsWith(p))
  const isPublicAdminApi = publicAdminApiPaths.some((p) => pathname === p || pathname.startsWith(p + '/'))
  const isProtectedApi = adminApiPaths.some((p) => pathname.startsWith(p)) && !isPublicAdminApi

  // 仅对需要写权限的方法在 middleware 拦截; GET 由 route 内部决定是否公开
  const method = request.method.toUpperCase()
  const isWriteMethod = method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS'
  // Customer review submission is public (route handles verification + rate limit);
  // admin review management (PUT) stays protected.
  const isCustomerReviewPost = pathname.startsWith('/api/reviews') && method === 'POST'
  // 修复: 公开写路径豁免 (客户咨询/优惠券 apply/平台 webhook 回调)
  const isPublicWrite = publicWritePaths.some(p =>
    pathname.startsWith(p.path) && (!p.methods || p.methods.includes(method))
  )

  if (isUserPage || isUserApi) {
    const token = request.cookies.get('user_token')?.value
    if (!token) {
      if (isUserApi) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  // 写操作的 admin API 在 middleware 层拦截 (兜底, route 内部仍会校验 token 有效性)
  if (isProtectedPage || (isProtectedApi && isWriteMethod && !isCustomerReviewPost && !isPublicWrite)) {
    const token = request.cookies.get('admin_token')?.value
    if (!token) {
      if (isProtectedApi) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      const loginUrl = new URL('/admin/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/admin',
    '/admin/:path*',
    '/account/:path*',
    '/messages/:path*',
    // 修复: 此前 matcher 缺少 /api/products /api/orders /api/categories /api/settings /api/staff /api/upload
    '/api/products/:path*',
    '/api/users/:path*',
    '/api/orders/:path*',
    '/api/categories/:path*',
    '/api/settings/:path*',
    '/api/staff/:path*',
    '/api/work-log/:path*',
    '/api/reviews/:path*',
    '/api/messages/:path*',
    '/api/upload',
    '/api/avatars/:path*',
    '/api/auth/user/:path*',
    // 修复 H19: 补全兜底 matcher
    '/api/marketing/:path*',
    '/api/ai/:path*',
    '/api/admin/:path*',
    '/api/suppliers/:path*',
    '/api/shipments/:path*',
    '/api/shipping/:path*',
    '/api/coupons/:path*',
    '/api/promotions/:path*',
    '/api/customers/:path*',
    '/api/customer-profiles/:path*',
    '/api/paypal/:path*',
    '/api/payoneer/:path*',
    '/api/referrals/:path*',
    '/api/knowledge-base/:path*',
    '/api/internal-chat/:path*',
  ],
}
