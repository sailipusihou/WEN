interface CacheEntry<T> {
  data: T
  timestamp: number
  mtime: number
}

const cacheStore = new Map<string, CacheEntry<any>>()

// 默认缓存 TTL
const DEFAULT_TTL = 5 * 1000

// 不同数据类型的 TTL 配置（毫秒）
export const CACHE_TTL = {
  products: 10 * 1000,        // 10秒 — 商品数据变更相对频繁
  categories: 30 * 1000,      // 30秒 — 分类数据较稳定
  settings: 60 * 1000,        // 60秒 — 设置数据极少变更
  orders: 2 * 1000,           // 2秒 — 订单数据需要高实时性
  users: 10 * 1000,           // 10秒 — 用户数据
  reviews: 30 * 1000,         // 30秒 — 评论数据较稳定
  messages: 2 * 1000,         // 2秒 — 消息需要较高实时性
} as const

export function getCachedData<T>(
  key: string,
  filePath: string,
  readFn: () => T,
  ttl: number = DEFAULT_TTL
): T {
  const fs = require('fs')
  const now = Date.now()
  const entry = cacheStore.get(key)

  try {
    const stats = fs.statSync(filePath)
    const mtime = stats.mtimeMs

    // 文件未修改且在 TTL 内，直接返回缓存
    if (entry && entry.mtime === mtime && now - entry.timestamp < ttl) {
      return entry.data
    }

    const data = readFn()
    cacheStore.set(key, { data, timestamp: now, mtime })
    return data
  } catch {
    // 文件读取失败时，返回旧缓存
    if (entry) {
      return entry.data
    }
    return readFn()
  }
}

export function invalidateCache(key: string): void {
  cacheStore.delete(key)
}

export function invalidateAllCache(): void {
  cacheStore.clear()
}

// 获取缓存统计信息（用于调试）
export function getCacheStats() {
  return {
    size: cacheStore.size,
    keys: Array.from(cacheStore.keys()),
    entries: Array.from(cacheStore.entries()).map(([key, entry]) => ({
      key,
      age: Date.now() - entry.timestamp,
      mtime: entry.mtime,
    })),
  }
}
