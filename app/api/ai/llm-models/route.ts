// 大模型（LLM）模型列表 - 设置页「刷新模型」按钮使用
// 从各厂商 OpenAI 兼容 /models 接口拉取对话类模型，合并预设列表
import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth'
import { getRepository } from '@/lib/repository'
import { resolveLLMConfig } from '@/lib/ai-config'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const PRESET_LLM: Record<string, { id: string; label: string }[]> = {
  deepseek: [
    { id: 'deepseek-chat', label: 'DeepSeek V3 (deepseek-chat)' },
    { id: 'deepseek-reasoner', label: 'DeepSeek R1 (deepseek-reasoner)' },
  ],
  siliconflow: [
    { id: 'deepseek-ai/DeepSeek-V3', label: 'DeepSeek V3' },
    { id: 'deepseek-ai/DeepSeek-R1', label: 'DeepSeek R1' },
    { id: 'Qwen/Qwen3-32B', label: 'Qwen3-32B' },
    { id: 'zai-org/GLM-4.5', label: 'GLM-4.5' },
  ],
  openai: [
    { id: 'gpt-4o-mini', label: 'GPT-4o mini' },
    { id: 'gpt-4o', label: 'GPT-4o' },
    { id: 'gpt-4.1-mini', label: 'GPT-4.1 mini' },
  ],
  qwen: [
    { id: 'qwen-plus', label: 'Qwen Plus' },
    { id: 'qwen-max', label: 'Qwen Max' },
    { id: 'qwen-turbo', label: 'Qwen Turbo' },
  ],
  zhipu: [
    { id: 'glm-4-plus', label: 'GLM-4 Plus' },
    { id: 'glm-4-air', label: 'GLM-4 Air' },
    { id: 'glm-4-flash', label: 'GLM-4 Flash' },
  ],
  minimax: [
    { id: 'MiniMax-M2.5', label: 'MiniMax M2.5' },
    { id: 'MiniMax-M2.5-highspeed', label: 'MiniMax M2.5 Highspeed' },
    { id: 'MiniMax-M2.1', label: 'MiniMax M2.1' },
  ],
}

function filterLLMModels(models: any[]): string[] {
  return models
    .map((m: any) => {
      const id = m?.id || m?.name || ''
      const obj = m?.object || ''
      if (!id || obj === 'embedding') return ''
      if (/embedding|rerank|image|tts|speech/i.test(id)) return ''
      return id
    })
    .filter((v: string) => v)
    .filter((v: string, i: number, arr: string[]) => arr.indexOf(v) === i)
}

function mergePreset(provider: string, fetched: string[]): { id: string; label: string }[] {
  const base = (PRESET_LLM[provider] || []).slice()
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
  // 保留当前已选择但官网列表未返回的模型（作为自定义项，防止下拉失配）
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
    const p = (provider || 'deepseek').toLowerCase()
    const saved = getRepository().settings.get()
    const cfg = resolveLLMConfig(saved, { provider: p, apiKey, baseUrl })
    const key = cfg.apiKey
    const storedModels = saved.aiLLMProviders?.[p]?.models || []

    if (!key) {
      return NextResponse.json({ error: '请先填写该厂商 API Key 再更新模型列表' }, { status: 400 })
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
    const fetched = filterLLMModels(raw)
    return NextResponse.json({
      success: true,
      provider: p,
      models: fetched.length > 0
        ? replaceWithFetched(fetched, storedModels)
        : mergePreset(p, []),
      source: 'live',
      message: fetched.length ? `已同步官网模型列表（${fetched.length} 个）` : '官网未返回对话模型，已保留预设列表',
    })
  } catch (e: any) {
    return NextResponse.json({ error: `模型列表获取失败: ${e?.message || '未知错误'}` }, { status: 500 })
  }
}
