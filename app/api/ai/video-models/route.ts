// 视频生成模型列表 - 供设置页「刷新模型」按钮使用
// - 方舟（Seedance）：返回官方 Seedance 系列模型（异步任务接口，模型需在控制台开通）
// - MiniMax：返回 video-01 系列模型
// - 其他厂家：尝试 OpenAI 兼容 /models 接口并按视频关键词过滤
import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth'
import { getRepository } from '@/lib/repository'
import { resolveVideoConfig } from '@/lib/ai-config'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const PRESET_MODELS: Record<string, { id: string; label: string }[]> = {
  ark: [
    { id: 'doubao-seedance-2-0-260128', label: 'Seedance 2.0（旗舰，图生视频/原生音频）' },
    { id: 'doubao-seedance-2-0-fast-260128', label: 'Seedance 2.0 Fast（快速）' },
    { id: 'doubao-seedance-1-5-pro-251215', label: 'Seedance 1.5 Pro（图生视频）' },
    { id: 'doubao-seedance-1-0-pro-250528', label: 'Seedance 1.0 Pro（图生视频）' },
    { id: 'doubao-seedance-1-0-lite-i2v-250428', label: 'Seedance 1.0 Lite i2v' },
  ],
  minimax: [
    { id: 'MiniMax-H3', label: 'MiniMax H3（旗舰，图生/文生/多模态参考，原生音频）' },
    { id: 'video-01', label: 'Video-01（图生视频）' },
    { id: 'video-01-live', label: 'Video-01 Live' },
  ],
}

function filterVideoModels(models: any[]): string[] {
  return models
    .map((m: any) => {
      const id = m?.id || m?.name || ''
      if (!id) return ''
      if (/seedance|minimax|video-01|h3|sora|kling|runway|veo|pika|luma/i.test(id)) return id
      const type = String(m?.type || m?.model_type || '').toLowerCase()
      if (/video|image-to-video|text-to-video/i.test(type)) return id
      return ''
    })
    .filter((v: string) => v)
    .filter((v: string, i: number, arr: string[]) => arr.indexOf(v) === i)
}

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
    const p = (provider || 'ark').toLowerCase()
    const saved = getRepository().settings.get()
    const cfg = resolveVideoConfig(saved, { provider: p, apiKey, baseUrl })
    const key = cfg.apiKey
    const storedModels = saved.aiVideoProviders?.[p]?.models || []

    if (p === 'ark') {
      return NextResponse.json({ success: true, provider: p, models: PRESET_MODELS.ark, source: 'preset' })
    }
    if (p === 'minimax') {
      return NextResponse.json({ success: true, provider: p, models: PRESET_MODELS.minimax, source: 'preset' })
    }
    if (p === 'custom') {
      return NextResponse.json({ success: true, provider: p, models: [], source: 'custom', message: '自定义厂家请手动填写模型名称' })
    }
    if (!key) {
      return NextResponse.json({ error: '请先填写该分区 API Key 再刷新模型列表' }, { status: 400 })
    }

    const res = await fetch(`${cfg.baseUrl}/models`, {
      headers: { 'Authorization': `Bearer ${key}` },
      signal: AbortSignal.timeout(20000),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      return NextResponse.json({ error: `模型列表获取失败 (${res.status})${text ? `: ${text.substring(0, 200)}` : ''}` }, { status: 400 })
    }
    const data = await res.json()
    const raw: any[] = Array.isArray(data?.data) ? data.data : []
    const fetched = filterVideoModels(raw)
    return NextResponse.json({
      success: true,
      provider: p,
      models: fetched.length > 0
        ? replaceWithFetched(fetched, storedModels)
        : PRESET_MODELS[p] || [],
      source: fetched.length > 0 ? 'live' : 'preset',
      message: fetched.length ? `已同步官网模型列表（${fetched.length} 个）` : '官网未返回视频模型，已保留预设列表',
    })
  } catch (e: any) {
    return NextResponse.json({ error: `模型列表获取失败: ${e?.message || '未知错误'}` }, { status: 500 })
  }
}
