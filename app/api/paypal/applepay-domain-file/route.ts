import { NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * 输出 Apple Pay 域名验证文件（Apple 抓取用）。
 *
 * 访问路径：https://lowflame.store/.well-known/apple-developer-merchantid-domain-association
 * （由 next.config.js 的 rewrites 转发到这里）
 *
 * 文件来源，按优先级：
 *   1. 环境变量 APPLE_PAY_DOMAIN_ASSOCIATION（内容直接贴进来）
 *   2. data/apple-developer-merchantid-domain-association（用 scripts/deploy/set-applepay-domain-file.cjs 写入）
 *
 * 内容不是密钥，是 Apple 用来确认「域名归你所有」的公开文件，但每个 PayPal 账号一份，
 * 所以不写进仓库，由 data/ 目录承载，换账号时替换即可、无需重新构建。
 *
 * 注意：
 *  - 必须 200、无重定向（Apple 明确不支持 HTTP 跳转）
 *  - 不能加 BOM，末尾换行可有可无
 *  - 未配置时返回 404，避免把占位内容当成有效文件导致注册失败
 */
export async function GET() {
  const fromEnv = process.env.APPLE_PAY_DOMAIN_ASSOCIATION
  if (fromEnv && fromEnv.trim()) {
    return new NextResponse(fromEnv.trim(), {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  }

  try {
    const filePath = path.join(process.cwd(), 'data', 'apple-developer-merchantid-domain-association')
    const content = await fs.readFile(filePath, 'utf8')
    if (!content.trim()) throw new Error('empty')
    return new NextResponse(content.trim(), {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch {
    return new NextResponse('Apple Pay domain association file is not configured yet.', {
      status: 404,
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
    })
  }
}
