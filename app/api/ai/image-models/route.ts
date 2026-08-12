// 图片生成模型列表 - 供设置页「更新模型列表」按钮使用
// - 硅基流动 / MiniMax / OpenAI：调用各厂家 OpenAI 兼容 /models 接口，过滤图片模型
// - 火山方舟：返回官方 Seedream 系列模型（方舟 /models 只返回对话模型，图片模型按开通为准）
import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth'
import { getRepository } from '@/lib/repository'
import { resolveImageConfig } from '@/lib/ai-config'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// 官方预设模型列表（作为下拉候选 + 方舟/自定义厂家的刷新结果）
const PRESET_MODELS: Record<string, { id: string; label: string }[]> = {
  ark: [
    { id: 'doubao-seedream-4-0-250828', label: 'Seedream 4.0（1K/2K/4K）' },
    { id: 'doubao-seedream-4-5-251128', label: 'Seedream 4.5（2K/4K，细节更强）' },
    { id: 'doubao-seedream-5-0-260128', label: 'Seedream 5.0（2K/3K，旗舰）' },
  ],
  minimax: [
    { id: 'image-01', label: 'image-01（文生图/参考图）' },
    { id: 'image-01-live', label: 'image-01-live' },
  ],
  openai: [
    { id: 'gpt-image-1', label: 'gpt-image-1（推荐）' },
    { id: 'dall-e-3', label: 'DALL·E 3' },
    { id: 'dall-e-2', label: 'DALL·E 2' },
  ],
  siliconflow: [
    { id: 'Kwai-Kolors/Kolors', label: 'Kwai-Kolors/Kolors' },
    { id: 'Kwai-Kolors/Kolors-1.1', label: 'Kwai-Kolors/Kolors-1.1' },
    { id: 'Tongyi-MAI/Z-Image-Turbo', label: 'Tongyi-MAI/Z-Image-Turbo（免费）' },
    { id: 'Tongyi-MAI/Z-Image', label: 'Tongyi-MAI/Z-Image' },
    { id: 'Tongyi-MAI/Z-Image-Plus', label: 'Tongyi-MAI/Z-Image-Plus' },
    { id: 'baidu/ERNIE-Image-Turbo', label: 'baidu/ERNIE-Image-Turbo' },
    { id: 'BFL/FLUX.1-schnell', label: 'BFL/FLUX.1-schnell（免费）' },
    { id: 'BFL/FLUX.1-dev', label: 'BFL/FLUX.1-dev' },
    { id: 'Qwen/Qwen-Image', label: 'Qwen/Qwen-Image' },
  ],
}

function filterImageModels(models: any[], provider: string): string[] {
  return models
    .map((m: any) => {
      const id = m?.id || m?.name || ''
      const type = String(m?.type || m?.model_type || '').toLowerCase()
      const obj = m?.object || ''
      const usable = obj !== 'chat.completion' && obj !== 'chat.completions' && obj !== 'embedding'
      if (!id || !usable) return ''
      if (type && /image|text-to-image|image-to-image/i.test(type)) return id
      if (/seedream|kolors|z-image|image|flux|qwen-image|dall|ernie-image/i.test(id)) return id
      return ''
    })
    .filter((v: string) => v)
    .filter((v: string, i: number, arr: string[]) => arr.indexOf(v) === i)
}

function mergePreset(provider: string, fetched: string[]): { id: string; label: string }[] {
  const base = (PRESET_MODELS[provider] || []).slice()
  const known = new Set(base.map(m => m.id))
  for (const id of fetched) {
    if (!known.has(id)) base.push({ id, label: id })
  }
  return base
}

// 完全替换：官网拉取成功时只保留官网当前模型（外加当前已选模型，避免选择丢失）
function replaceWithFetched(fetched: string[], storedModels: { id: string; label: string }[]): { id: string; label: string }[] {
  const list = fetched.map(id => ({ id, label: id }))
  const known = new Set(fetched)
  for (const m of storedModels) {
    if (!known.has(m.id)) list.push(m)
  }
  return list
}

export async function POST(req: NextRequest) {
  const auth = requirePermission(req, 'ai_assistant_config')
  if ('error' in auth) return auth.error

  try {
    const body = await req.json()
    const { provider, baseUrl, apiKey } = body as {
      provider?: string
      baseUrl?: string
      apiKey?: string
    }
    const p = (provider || 'siliconflow').toLowerCase()
    const saved = getRepository().settings.get()
    const cfg = resolveImageConfig(saved, 'text', { provider: p, apiKey, baseUrl })
    const key = cfg.apiKey
    const storedModels = saved.aiImageProviders?.[p]?.models || []

    if (p === 'ark') {
      return NextResponse.json({ success: true, provider: p, models: PRESET_MODELS.ark, source: 'preset' })
    }
    if (p === 'custom') {
      return NextResponse.json({ success: true, provider: p, models: [], source: 'custom', message: '自定义厂家请手动填写模型名称' })
    }
    if (!key) {
      return NextResponse.json({ error: '请先填写该分区 API Key 再更新模型列表' }, { status: 400 })
    }

    const defaults: Record<string, string> = {
      siliconflow: 'https://api.siliconflow.cn/v1',
      minimax: 'https://api.minimaxi.com/v1',
      openai: 'https://api.openai.com/v1',
    }
    const base = (cfg.baseUrl || defaults[p] || '').replace(/\/$/, '')
    const res = await fetch(`${base}/models`, {
      headers: { 'Authorization': `Bearer ${key}` },
      signal: AbortSignal.timeout(20000),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      return NextResponse.json({ error: `模型列表获取失败 (${res.status})${text ? `: ${text.substring(0, 200)}` : ''}` }, { status: 400 })
    }
    const data = await res.json()
    const raw: any[] = Array.isArray(data?.data) ? data.data : []
    const fetched = filterImageModels(raw, p)
    return NextResponse.json({
      success: true,
      provider: p,
      models: fetched.length > 0
        ? replaceWithFetched(fetched, storedModels.map((m: any) => ({ id: m.id, label: m.label || m.id })))
        : mergePreset(p, []),
      source: 'live',
      message: fetched.length ? `已同步官网模型列表（${fetched.length} 个）` : '官网未返回图片模型，已保留预设列表',
    })
  } catch (e: any) {
    return NextResponse.json({ error: `模型列表获取失败: ${e?.message || '未知错误'}` }, { status: 500 })
  }
}
