// 物流商配置管理
// 支持多物流商凭证管理, 环境切换 (沙箱/正式)
// 凭证存储在 SQLite 的 settings 表中, 不会硬编码到代码

import { getRepository } from '@/lib/repository'

export interface CarrierConfig {
  code: string           // 物流商代码, 如 '4px', 'yunexpress'
  enabled: boolean       // 是否启用
  mode: 'sandbox' | 'production'  // 环境模式
  credentials: Record<string, string>  // 凭证信息 (appKey, appSecret 等)
  lastSyncAt?: string    // 最后同步时间
  syncEnabled: boolean   // 是否启用自动轨迹同步
  syncInterval: number   // 同步间隔 (分钟)
}

const SETTINGS_KEY = 'shipping_carriers_config'

// 默认配置
const DEFAULT_CONFIGS: CarrierConfig[] = [
  {
    code: '4px',
    enabled: false,
    mode: 'sandbox',
    credentials: {
      appKey: '',
      appSecret: '',
      accessToken: '',
    },
    syncEnabled: false,
    syncInterval: 30,
  },
  {
    code: 'yunexpress',
    enabled: false,
    mode: 'sandbox',
    credentials: {
      appId: '',
      appSecret: '',
      sourceKey: '',
    },
    syncEnabled: false,
    syncInterval: 30,
  },
]

export function getCarrierConfigs(): CarrierConfig[] {
  try {
    const repo = getRepository()
    const settings = repo.settings.get() as any
    const stored = settings?.[SETTINGS_KEY]

    if (stored && typeof stored === 'string') {
      try {
        const parsed = JSON.parse(stored)
        // 合并默认值, 确保新增物流商也有默认配置
        return DEFAULT_CONFIGS.map(def => {
          const found = parsed.find((c: CarrierConfig) => c.code === def.code)
          return found ? { ...def, ...found } : def
        })
      } catch {}
    }
  } catch {}

  return DEFAULT_CONFIGS
}

export function getCarrierConfig(code: string): CarrierConfig | undefined {
  return getCarrierConfigs().find(c => c.code === code)
}

export function saveCarrierConfig(config: CarrierConfig): CarrierConfig {
  const configs = getCarrierConfigs()
  const idx = configs.findIndex(c => c.code === config.code)

  if (idx >= 0) {
    configs[idx] = { ...configs[idx], ...config }
  } else {
    configs.push(config)
  }

  try {
    const repo = getRepository()
    repo.settings.update({
      [SETTINGS_KEY]: JSON.stringify(configs),
    } as any)
  } catch {}

  return configs[idx >= 0 ? idx : configs.length - 1]
}

export function updateCarrierCredentials(code: string, credentials: Record<string, string>): CarrierConfig | null {
  const configs = getCarrierConfigs()
  const cfg = configs.find(c => c.code === code)
  if (!cfg) return null

  cfg.credentials = { ...cfg.credentials, ...credentials }
  saveCarrierConfig(cfg)
  return cfg
}

export function toggleCarrierEnabled(code: string, enabled: boolean): CarrierConfig | null {
  const configs = getCarrierConfigs()
  const cfg = configs.find(c => c.code === code)
  if (!cfg) return null

  cfg.enabled = enabled
  saveCarrierConfig(cfg)
  return cfg
}

export function setCarrierMode(code: string, mode: 'sandbox' | 'production'): CarrierConfig | null {
  const configs = getCarrierConfigs()
  const cfg = configs.find(c => c.code === code)
  if (!cfg) return null

  cfg.mode = mode
  saveCarrierConfig(cfg)
  return cfg
}
