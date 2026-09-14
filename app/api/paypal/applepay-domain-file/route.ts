import { NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * 输出 Apple Pay 域名验证文件（Apple 抓取用）。
 *
 * 访问路径：https://lowflame.store/.well-known/apple-developer-merchantid-domain-association
 * （由 next.config.js 的 rewrites 转发到这里 —— 之所以不用 public/ 静态文件，是为了
 *   自己控制 Content-Type 与缓存头，并且能统一从多个来源兜底）
 *
 * 内容来源，按优先级：
 *   1. 环境变量 APPLE_PAY_DOMAIN_ASSOCIATION（内容直接贴进来）
 *   2. data/apple-developer-merchantid-domain-association（可热替换，换 PayPal 账号时用
 *      scripts/deploy/set-applepay-domain-file.cjs 覆盖，无需重新构建）
 *   3. assets/apple-pay/apple-developer-merchantid-domain-association（随仓库走，
 *      服务器重装/换机后依然能提供，不会因为 data/ 丢失而让 Apple Pay 静默失效）
 *
 * 这个文件不是密钥 —— 它是 PayPal 作为 PSP 在 Apple 注册的公开验证文件，
 * pspId 是 PayPal 的（不是每个商户一份），所以放进仓库没有安全问题。
 *
 * 注意：
 *  - 必须 200、无重定向（Apple 明确不支持 HTTP 跳转）
 *  - 必须逐字节一致，不能加 BOM、不能改写内容
 *  - 未配置时返回 404，避免把占位内容当成有效文件导致域名注册失败
 */
const CANDIDATES = [
  ['data', 'apple-developer-merchantid-domain-association'],
  ['assets', 'apple-pay', 'apple-developer-merchantid-domain-association'],
]

export async function GET() {
  const fromEnv = process.env.APPLE_PAY_DOMAIN_ASSOCIATION
  if (fromEnv && fromEnv.trim()) {
    return serve(fromEnv)
  }

  for (const parts of CANDIDATES) {
    try {
      const content = await fs.readFile(path.join(process.cwd(), ...parts), 'utf8')
      if (content.trim()) return serve(content)
    } catch {
      // 试下一个来源
    }
  }

  return new NextResponse('Apple Pay domain association file is not configured yet.', {
    status: 404,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
  })
}

function serve(content: string) {
  return new NextResponse(content.trim(), {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
