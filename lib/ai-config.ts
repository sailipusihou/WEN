// AI 配置解析：所有 AI 路由统一从"模型库 + 当前选择"读取配置
import type { SiteSettings } from './settings'

const LLM_DEFAULTS: Record<string, { baseUrl: string; model: string }> = {
  deepseek: { baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
  siliconflow: { baseUrl: 'https://api.siliconflow.cn/v1', model: 'deepseek-ai/DeepSeek-V3' },
  openai: { baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
  qwen: { baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model: 'qwen-plus' },
  zhipu: { baseUrl: 'https://open.bigmodel.cn/api/paas/v4', model: 'glm-4-flash' },
  minimax: { baseUrl: 'https://api.minimaxi.com/v1', model: 'MiniMax-M2.5' },
}

const IMAGE_DEFAULTS: Record<string, { baseUrl: string; model: string }> = {
  siliconflow: { baseUrl: 'https://api.siliconflow.cn/v1', model: 'Tongyi-MAI/Z-Image-Turbo' },
  minimax: { baseUrl: 'https://api.minimaxi.com/v1', model: 'image-01' },
  ark: { baseUrl: 'https://ark.cn-beijing.volces.com/api/v3', model: 'doubao-seedream-4-0-250828' },
  openai: { baseUrl: 'https://api.openai.com/v1', model: 'gpt-image-1' },
}

const VIDEO_DEFAULTS: Record<string, { baseUrl: string; model: string }> = {
  ark: { baseUrl: 'https://ark.cn-beijing.volces.com/api/v3', model: 'doubao-seedance-2-0-260128' },
  // MiniMax 根域名（v1 旧接口会自动补 /v1，MiniMax-H3 v2 接口使用 /v2）
  minimax: { baseUrl: 'https://api.minimaxi.com', model: 'MiniMax-H3' },
}

const AUDIO_DEFAULTS: Record<string, { baseUrl: string; model: string }> = {
  minimax: { baseUrl: 'https://api.minimaxi.com', model: 'music-3.0-free' },
}

function cleanKey(k?: string): string {
  const s = k ? String(k).trim() : ''
  return s && !/•|configured|masked/i.test(s) ? s : ''
}

// 修复 H17 (SSRF): 仅允许公网 HTTP(S) 主机 — 拒绝 localhost/内网/链路本地/云元数据地址
export function isSafeHttpUrl(raw: string): boolean {
  if (!raw || typeof raw !== 'string') return false
  let u: URL
  try {
    u = new URL(raw)
  } catch {
    return false
  }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return false
  const host = u.hostname.toLowerCase()
  if (host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal')) return false
  if (host === '::1' || host === '[::1]') return false
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    const parts = host.split('.').map(Number)
    const [a, b] = parts
    if (a === 0 || a === 127 || a === 10) return false
    if (a === 169 && b === 254) return false // 云元数据 169.254.169.254
    if (a === 172 && b >= 16 && b <= 31) return false
    if (a === 192 && b === 168) return false
  }
  return true
}

function safeBaseUrl(raw: string, fallback: string): string {
  return isSafeHttpUrl(raw) ? raw.replace(/\/$/, '') : fallback
}

export interface LLMOverride {
  provider?: string
  model?: string
  apiKey?: string
  baseUrl?: string
}

export function resolveLLMConfig(settings: SiteSettings, overrides: LLMOverride = {}) {
  const provider = (overrides.provider || settings.aiProvider || 'deepseek').toLowerCase()
  const lib = settings.aiLLMProviders?.[provider] || { apiKey: '', baseUrl: '', models: [] }
  const def = LLM_DEFAULTS[provider] || { baseUrl: '', model: '' }
  const apiKey = cleanKey(overrides.apiKey) || cleanKey(lib.apiKey) || cleanKey(settings.aiApiKey) || cleanKey(settings.aiCopyApiKey)
  // 修复 H17: baseUrl 必须为公网主机, 非法时回退默认 (防止 SSRF + 已存 key 外发)
  const baseUrl = safeBaseUrl(
    overrides.baseUrl || lib.baseUrl || settings.aiBaseUrl || settings.aiCopyBaseUrl || def.baseUrl || 'https://api.deepseek.com/v1',
    def.baseUrl || 'https://api.deepseek.com/v1'
  )
  const settingsModel = settings.aiModel && settings.aiModel !== '__custom__' ? settings.aiModel : ''
  const settingsCopyModel = settings.aiCopyModel && settings.aiCopyModel !== '__custom__' ? settings.aiCopyModel : ''
  const model = (overrides.model && overrides.model !== '__custom__')
    ? overrides.model
    : (settingsModel || settingsCopyModel || def.model || 'deepseek-chat')
  return { provider, apiKey, baseUrl, model }
}

export interface ImageOverride {
  provider?: string
  model?: string
  apiKey?: string
  baseUrl?: string
}

export function resolveImageConfig(settings: SiteSettings, mode: 'text' | 'reference', overrides: ImageOverride = {}) {
  const isRef = mode === 'reference'
  const savedProvider = isRef ? (settings.aiImageRefProvider || settings.aiImageProvider) : settings.aiImageProvider
  const provider = (overrides.provider || savedProvider || 'siliconflow').toLowerCase()
  const lib = settings.aiImageProviders?.[provider] || { apiKey: '', baseUrl: '', models: [] }
  const def = IMAGE_DEFAULTS[provider] || { baseUrl: '', model: '' }
  const apiKey = cleanKey(overrides.apiKey)
    || cleanKey(lib.apiKey)
    || (isRef ? cleanKey(settings.aiImageRefApiKey) : '')
    || cleanKey(settings.aiImageApiKey)
  // 修复 H17: baseUrl 必须为公网主机
  const baseUrl = safeBaseUrl(
    overrides.baseUrl || lib.baseUrl
      || (isRef ? settings.aiImageRefBaseUrl : '')
      || settings.aiImageBaseUrl
      || def.baseUrl || 'https://api.siliconflow.cn/v1',
    def.baseUrl || 'https://api.siliconflow.cn/v1'
  )
  const savedModel = isRef ? settings.aiImageRefModel : settings.aiImageModel
  const model = (overrides.model && overrides.model !== '__custom__')
    ? overrides.model
    : (savedModel && savedModel !== '__custom__' ? savedModel : (def.model || 'Tongyi-MAI/Z-Image-Turbo'))
  return { provider, apiKey, baseUrl, model }
}

export function getLLMModelOptions(settings: SiteSettings, provider: string): { id: string; label: string }[] {
  return settings.aiLLMProviders?.[provider]?.models || []
}

export function getImageModelOptions(settings: SiteSettings, provider: string): { id: string; label: string }[] {
  return settings.aiImageProviders?.[provider]?.models || []
}

export interface VideoOverride {
  provider?: string
  model?: string
  apiKey?: string
  baseUrl?: string
}

export function resolveVideoConfig(settings: SiteSettings, overrides: VideoOverride = {}) {
  const provider = (overrides.provider || settings.aiVideoProvider || 'ark').toLowerCase()
  const lib = settings.aiVideoProviders?.[provider] || { apiKey: '', baseUrl: '', models: [] }
  const def = VIDEO_DEFAULTS[provider] || { baseUrl: '', model: '' }
  const apiKey = cleanKey(overrides.apiKey)
    || cleanKey(lib.apiKey)
    || cleanKey(settings.aiVideoApiKey)
  // 修复 H17: baseUrl 必须为公网主机
  const baseUrl = safeBaseUrl(
    overrides.baseUrl || lib.baseUrl || settings.aiVideoBaseUrl || def.baseUrl || 'https://ark.cn-beijing.volces.com/api/v3',
    def.baseUrl || 'https://ark.cn-beijing.volces.com/api/v3'
  )
  const savedModel = settings.aiVideoModel && settings.aiVideoModel !== '__custom__' ? settings.aiVideoModel : ''
  const libModel = lib.models?.[0]?.id || ''
  const model = (overrides.model && overrides.model !== '__custom__')
    ? overrides.model
    : (savedModel && (!lib.models?.length || lib.models.some(m => m.id === savedModel))
      ? savedModel
      : (libModel || def.model || 'doubao-seedance-2-0-260128'))
  return { provider, apiKey, baseUrl, model }
}

export function getVideoModelOptions(settings: SiteSettings, provider: string): { id: string; label: string }[] {
  return settings.aiVideoProviders?.[provider]?.models || []
}

export interface AudioOverride {
  provider?: string
  model?: string
  apiKey?: string
  baseUrl?: string
}

export function resolveAudioConfig(settings: SiteSettings, overrides: AudioOverride = {}) {
  const provider = (overrides.provider || settings.aiAudioProvider || 'minimax').toLowerCase()
  const lib = settings.aiAudioProviders?.[provider] || { apiKey: '', baseUrl: '', models: [] }
  const def = AUDIO_DEFAULTS[provider] || { baseUrl: '', model: '' }
  const apiKey = cleanKey(overrides.apiKey)
    || cleanKey(lib.apiKey)
    || cleanKey(settings.aiAudioApiKey)
    || cleanKey(settings.aiVideoProviders?.minimax?.apiKey)
    || cleanKey(settings.aiLLMProviders?.minimax?.apiKey)
    || cleanKey(settings.aiImageProviders?.minimax?.apiKey)
  // 修复 H17: baseUrl 必须为公网主机
  const baseUrl = safeBaseUrl(
    overrides.baseUrl || lib.baseUrl || settings.aiAudioBaseUrl || def.baseUrl || 'https://api.minimaxi.com',
    def.baseUrl || 'https://api.minimaxi.com'
  ).replace(/\/v1$/, '')
  const savedModel = settings.aiAudioModel && settings.aiAudioModel !== '__custom__' ? settings.aiAudioModel : ''
  const libModel = lib.models?.[0]?.id || ''
  const model = (overrides.model && overrides.model !== '__custom__')
    ? overrides.model
    : (savedModel && (!lib.models?.length || lib.models.some(m => m.id === savedModel))
      ? savedModel
      : (libModel || def.model || 'music-3.0-free'))
  return { provider, apiKey, baseUrl, model }
}

export function getAudioModelOptions(settings: SiteSettings, provider: string): { id: string; label: string }[] {
  return settings.aiAudioProviders?.[provider]?.models || []
}
