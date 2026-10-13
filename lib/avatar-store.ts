import fs from 'fs'
import path from 'path'
import { ProxyAgent } from 'undici'

/**
 * 把远程头像**下载到本站**再使用。
 *
 * 为什么不直接存第三方 URL（这是原来的做法，踩了两个坑）：
 *   ① **链接会过期** —— Instagram / Facebook 给的是带签名的临时链接。
 *      实测存量数据：instagram 返回 403、facebook 返回 404，浏览器里就是一张裂图。
 *   ② **域名在境内被屏蔽** —— scontent-*.cdninstagram.com / pbs.twimg.com /
 *      platform-lookaside.fbsbx.com 都打不开。管理员在国内访问后台，头像永远出不来。
 * 存成站内文件后两个问题一起消失：不过期、跟着站点走。
 *
 * 服务器在美国，下载这些 CDN 是直连的；本地开发环境（在国内）走
 * HTTPS_PROXY/HTTP_PROXY 的代理，与 lib/facebook.ts 等保持同一套做法。
 */

const PROXY_URL = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || ''
let agent: ProxyAgent | null = null
if (PROXY_URL) {
  try {
    agent = new ProxyAgent(PROXY_URL)
  } catch {
    // 代理地址不合法就当没有代理，别让头像同步整体挂掉
  }
}

const MIME_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

/** 头像不该超过这个大小（各平台的都在几十 KB，超出多半是取错了东西） */
const MAX_BYTES = 2 * 1024 * 1024

/**
 * 下载并落地到 public/uploads，返回站内地址；失败返回 null（调用方保留原值）。
 *
 * @param platform  平台标识，只用于拼文件名
 * @param accountId 账号 id，只用于拼文件名
 * @param remoteUrl 远程头像地址；已经是站内地址时原样返回
 */
export async function storeAvatarLocally(
  platform: string,
  accountId: string,
  remoteUrl?: string | null
): Promise<string | null> {
  if (!remoteUrl) return null
  // 已经是站内的就别重复下载
  if (remoteUrl.startsWith('/api/uploads') || remoteUrl.startsWith('/uploads/')) return remoteUrl
  if (!/^https?:\/\//i.test(remoteUrl)) return null

  try {
    const res = await fetch(remoteUrl, {
      ...(agent ? ({ dispatcher: agent } as any) : {}),
      signal: AbortSignal.timeout(20000),
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LowFlame/1.0)' },
    })
    if (!res.ok) return null

    const mime = (res.headers.get('content-type') || '').split(';')[0].trim().toLowerCase()
    const ext = MIME_EXT[mime]
    // 认不出图片类型就放弃 —— 宁可保留原图，也不要把 HTML 错误页当头像存下来
    if (!ext) return null

    const buf = Buffer.from(await res.arrayBuffer())
    if (!buf.length || buf.length > MAX_BYTES) return null

    const dir = path.join(process.cwd(), 'public', 'uploads')
    await fs.promises.mkdir(dir, { recursive: true })

    const safe = `${platform}-${accountId}`.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 60)
    const name = `avatar-${safe}-${Date.now()}.${ext}`
    await fs.promises.writeFile(path.join(dir, name), buf)

    return `/api/uploads?file=${encodeURIComponent(name)}`
  } catch {
    return null
  }
}

/** 这个头像是远程地址吗（远程的才需要本地化） */
export function isRemoteAvatar(url?: string | null): boolean {
  return !!url && /^https?:\/\//i.test(url)
}
