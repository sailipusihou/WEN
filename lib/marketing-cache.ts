// 短期内存缓存：平台 API 轮询时避免每次都打慢速 Graph API
// TTL 默认 8 秒：15s 轮询间隔下每两次轮询只打一次真实 API，其余命中缓存

const store = new Map<string, { value: any; expiresAt: number }>()

export function cachedFetch<T>(key: string, ttlMs: number, fetcher: () => Promise<T>): Promise<T> {
  const now = Date.now()
  const hit = store.get(key)
  if (hit && hit.expiresAt > now) {
    return Promise.resolve(hit.value)
  }
  return fetcher().then((value) => {
    store.set(key, { value, expiresAt: now + ttlMs })
    return value
  }).catch((err) => {
    // 抓取失败时回退旧缓存（若有），否则上抛由路由处理
    const stale = store.get(key)
    if (stale) {
      store.set(key, { value: stale.value, expiresAt: now + Math.min(ttlMs, 3000) })
      return stale.value
    }
    throw err
  })
}

export function invalidateCacheKey(prefix: string): void {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key)
  }
}
