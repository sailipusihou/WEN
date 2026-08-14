// 网络错误识别 — 用于区分"平台网络不可达"与"token 失效"
// (修复: insights 等路由曾把网络错误误判为 token 过期返回 401)
export function isNetworkError(e: any): boolean {
  if (!e) return false
  const code = e?.cause?.code || e?.code || ''
  const name = e?.name || ''
  const message = String(e?.message || '')
  return (
    code === 'EACCES' ||
    code === 'ECONNREFUSED' ||
    code === 'ECONNRESET' ||
    code === 'ETIMEDOUT' ||
    code === 'ENOTFOUND' ||
    code === 'UND_ERR_SOCKET' ||
    code === 'UND_ERR_CONNECT_TIMEOUT' ||
    name === 'TypeError' ||
    name === 'AbortError' ||
    name === 'FetchError' ||
    /fetch failed|network|socket|timed? ?out|tls|tunnel|proxy/i.test(message)
  )
}
