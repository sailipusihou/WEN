import { NextRequest, NextResponse } from 'next/server'

/**
 * 路由保护 —— **默认拒绝**。
 *
 * 为什么改成默认拒绝：
 *   原来是「手工维护一份受保护的路径前缀列表」（adminApiPaths）。新接口只要路径
 *   不匹配列表里的前缀，就**默认是公开的** —— `/api/create-payoneer-order` 正是
 *   这样漏掉的（无认证、金额由客户端决定）。上次修 PayPal 时往列表加了
 *   `/api/payoneer`，却没覆盖 `create-payoneer-order`，同一个错误换个写法又回来了。
 *
 *   改成默认拒绝后：`/api/**` 一律要求登录，**只有这里显式列出的才是公开的**。
 *   新接口默认受保护，忘记声明的后果是「多要一次登录」而不是「对外开放」。
 *
 * 边界说明：
 *   中间件运行在 Edge 运行时，读不到会话存储，所以只检查 cookie 的**存在性**。
 *   真正的签名/有效期校验仍在各 route 内部（`requireAdmin` / `requireUser`）。
 *   这里是「默认关着」的兜底，不是唯一防线。
 *
 * 规则匹配：
 *   · 路径按段（segment）匹配，`*` 匹配任意一段，且是**前缀**语义
 *     （`/api/products` 能匹配 `/api/products/123`）。
 *   · 多条命中时取**最深**（最具体）的那条；同深度时取**最严格**的那条。
 *   · `methods` 省略 = 该路径的所有方法。
 */

type Kind = 'admin' | 'user' | 'public'
interface Rule {
  path: string
  methods?: string[]
  kind: Kind
}

const KIND_RANK: Record<Kind, number> = { admin: 3, user: 2, public: 1 }

// ── 公开（无需登录）────────────────────────────────────────────────
// 每一条都对应线上真实存在的公开流量；少列一条 = 那个功能 401。
const PUBLIC_RULES: Rule[] = [
  // 站点 / 商品信息（公开读）
  { path: '/api/products', methods: ['GET'], kind: 'public' },
  { path: '/api/products/*', methods: ['GET'], kind: 'public' },
  { path: '/api/categories', methods: ['GET'], kind: 'public' },
  { path: '/api/categories/*', methods: ['GET'], kind: 'public' },
  { path: '/api/settings', methods: ['GET'], kind: 'public' },
  { path: '/api/frontend-content', methods: ['GET'], kind: 'public' },
  { path: '/api/search', methods: ['GET'], kind: 'public' },
  { path: '/api/search/*', methods: ['GET'], kind: 'public' },
  { path: '/api/promotions', methods: ['GET'], kind: 'public' },
  { path: '/api/uploads', methods: ['GET'], kind: 'public' },
  { path: '/api/avatars', methods: ['GET'], kind: 'public' },
  { path: '/api/shipping', methods: ['GET'], kind: 'public' },
  { path: '/api/shipping/carriers', methods: ['GET'], kind: 'public' },

  // 支付配置（结算页要读 clientId）
  { path: '/api/paypal/config', methods: ['GET'], kind: 'public' },
  { path: '/api/paypal/applepay-domain-file', methods: ['GET'], kind: 'public' },
  { path: '/api/payoneer/config', methods: ['GET'], kind: 'public' },

  // 登录 / 登出 / 查登录态
  { path: '/api/auth', methods: ['POST'], kind: 'public' },
  { path: '/api/auth/check', methods: ['GET'], kind: 'public' },
  { path: '/api/auth/logout', methods: ['POST'], kind: 'public' },
  { path: '/api/auth/register', methods: ['POST'], kind: 'public' },
  { path: '/api/auth/user-login', methods: ['POST'], kind: 'public' },
  { path: '/api/auth/user-logout', methods: ['POST'], kind: 'public' },

  // 游客下单 / 支付（金额由服务端订单核价，路由内另有限频与幂等）
  { path: '/api/orders', methods: ['POST'], kind: 'public' },
  { path: '/api/orders/tracking/*', methods: ['GET'], kind: 'public' },
  { path: '/api/orders/*/shipments', methods: ['GET'], kind: 'public' },
  { path: '/api/create-paypal-order', methods: ['POST'], kind: 'public' },
  { path: '/api/capture-paypal-order', methods: ['POST'], kind: 'public' },

  // 公开写（路由内部各自校验/限频）
  { path: '/api/messages', methods: ['POST'], kind: 'public' },
  { path: '/api/messages/upload', methods: ['POST'], kind: 'public' },
  { path: '/api/reviews', methods: ['POST'], kind: 'public' },
  { path: '/api/coupons', methods: ['POST'], kind: 'public' },
  { path: '/api/newsletter', methods: ['POST'], kind: 'public' },
  { path: '/api/web-vitals', methods: ['POST'], kind: 'public' },
  { path: '/api/cart-reminder', methods: ['POST'], kind: 'public' },
  { path: '/api/referrals', methods: ['GET'], kind: 'public' },
  { path: '/api/referrals', methods: ['POST'], kind: 'public' },
  { path: '/api/browsing-history', methods: ['POST'], kind: 'public' },
  { path: '/api/browsing-history', methods: ['PUT'], kind: 'public' },

  // 平台 webhook（签名校验在路由内部；平台不带 cookie）
  { path: '/api/paypal/webhook', methods: ['POST'], kind: 'public' },
  { path: '/api/marketing/webhook/meta', kind: 'public' },
  { path: '/api/marketing/webhook/pinterest', kind: 'public' },
  { path: '/api/marketing/webhook/x', kind: 'public' },

  // OAuth 回调（服务商跳回来时不带 cookie）—— 必须逐条列出，不能用通配前缀，
  // 否则会把 /api/marketing/webhook/manage 之类也放行
  { path: '/api/marketing/facebook-oauth/callback', methods: ['GET'], kind: 'public' },
  { path: '/api/marketing/instagram-oauth/callback', methods: ['GET'], kind: 'public' },
  { path: '/api/marketing/linkedin-oauth/callback', methods: ['GET'], kind: 'public' },
  { path: '/api/marketing/pinterest-oauth/callback', methods: ['GET'], kind: 'public' },
  { path: '/api/marketing/x-oauth/callback', methods: ['GET'], kind: 'public' },
  { path: '/api/marketing/youtube-oauth/callback', methods: ['GET'], kind: 'public' },
  { path: '/api/marketing/social-oauth/callback', methods: ['GET'], kind: 'public' },
]

// ── 需要客户登录（user_token）──────────────────────────────────────
// ⚠️ 这些不能被「仅 admin_token」的兜底挡住，否则已登录的客户会 401
const USER_RULES: Rule[] = [
  { path: '/api/auth/user', kind: 'user' },
  { path: '/api/auth/user/orders', methods: ['GET'], kind: 'user' },
  { path: '/api/auth/user/password', methods: ['PUT'], kind: 'user' },
  { path: '/api/wishlist', kind: 'user' },
  { path: '/api/browsing-history', methods: ['GET'], kind: 'user' },
]

// ── 落在公开前缀之下、但必须管理员才行的方法 ────────────────────────
// 靠「更深 = 更具体」压过上面的公开规则（例：/api/products/export 比 /api/products 深）
const ADMIN_OVERRIDES: Rule[] = [
  { path: '/api/products/export', methods: ['GET'], kind: 'admin' },
  { path: '/api/products/batch', methods: ['POST'], kind: 'admin' },
  { path: '/api/uploads', methods: ['POST'], kind: 'admin' },
  { path: '/api/avatars', methods: ['POST', 'PUT', 'DELETE'], kind: 'admin' },
  { path: '/api/shipping/config', kind: 'admin' },
  { path: '/api/shipping/4px', kind: 'admin' },
  { path: '/api/paypal/transactions', kind: 'admin' },
  { path: '/api/marketing/webhook/manage', kind: 'admin' },
]

const ALL_RULES = [...PUBLIC_RULES, ...USER_RULES, ...ADMIN_OVERRIDES]

/** 返回匹配深度（段数）；不匹配返回 -1 */
function matchDepth(pathname: string, pattern: string): number {
  const p = pattern.split('/').filter(Boolean)
  const t = pathname.split('/').filter(Boolean)
  if (p.length > t.length) return -1
  for (let i = 0; i < p.length; i++) {
    if (p[i] !== '*' && p[i] !== t[i]) return -1
  }
  return p.length
}

/** 选出最具体的一条规则；同深度取最严格的 */
function pickRule(pathname: string, method: string): Rule | null {
  let best: Rule | null = null
  let bestDepth = -1
  for (const r of ALL_RULES) {
    const d = matchDepth(pathname, r.path)
    if (d < 0) continue
    if (r.methods && !r.methods.includes(method)) continue
    if (d > bestDepth || (d === bestDepth && best && KIND_RANK[r.kind] > KIND_RANK[best.kind])) {
      best = r
      bestDepth = d
    }
  }
  return best
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const method = request.method.toUpperCase()

  // ── 页面 ────────────────────────────────────────────────────────
  const isAdminLogin = pathname === '/admin/login' || pathname.startsWith('/admin/login/')
  const isAdminPage = (pathname === '/admin' || pathname.startsWith('/admin/')) && !isAdminLogin
  if (isAdminPage) {
    if (!request.cookies.get('admin_token')?.value) {
      const url = new URL('/admin/login', request.url)
      url.searchParams.set('redirect', pathname)
      return NextResponse.redirect(url)
    }
    return NextResponse.next()
  }

  const isPublicUserPage = pathname === '/login' || pathname.startsWith('/login/') ||
    pathname === '/register' || pathname.startsWith('/register/')
  const isUserPage = (pathname === '/account' || pathname.startsWith('/account/') ||
    pathname === '/messages' || pathname.startsWith('/messages/')) && !isPublicUserPage
  if (isUserPage) {
    if (!request.cookies.get('user_token')?.value) {
      const url = new URL('/login', request.url)
      url.searchParams.set('redirect', pathname)
      return NextResponse.redirect(url)
    }
    return NextResponse.next()
  }

  // ── API：默认拒绝 ────────────────────────────────────────────────
  if (!pathname.startsWith('/api/')) return NextResponse.next()

  const rule = pickRule(pathname, method)
  if (rule?.kind === 'public') return NextResponse.next()

  const cookieName = rule?.kind === 'user' ? 'user_token' : 'admin_token'
  if (request.cookies.get(cookieName)?.value) return NextResponse.next()

  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

export const config = {
  matcher: [
    '/admin',
    '/admin/:path*',
    '/account',
    '/account/:path*',
    '/messages',
    '/messages/:path*',
    // 不再逐条列举 API 前缀 —— 整个 /api 都交给「默认拒绝」逻辑
    '/api/:path*',
  ],
}
