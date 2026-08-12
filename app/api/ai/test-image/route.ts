// 图片生成 AI 连接测试 - 通过 /models 端点校验 API Key 与模型可用性（不消耗生图额度）
import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth'
import { getRepository } from '@/lib/repository'
import { resolveImageConfig } from '@/lib/ai-config'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const auth = requirePermission(req, 'ai_assistant_config')
  if ('error' in auth) return auth.error

  try {
    const body = await req.json()
    const { apiKey, baseUrl, model, provider, mode } = body as {
      apiKey: string
      baseUrl?: string
      model?: string
      provider?: string
      mode?: 'text' | 'reference'
    }

    // 前端拿不到已保存的 Key（接口脱敏），未传入时自动使用已保存配置
    const saved = getRepository().settings.get()
    const cfg = resolveImageConfig(saved, mode === 'reference' ? 'reference' : 'text', { provider, model, apiKey, baseUrl })
    const useProvider = cfg.provider
    const useKey = cfg.apiKey
    const useBaseUrl = cfg.baseUrl
    const useModel = cfg.model
    console.error('[AI Image Test] request:', JSON.stringify({
      provider: useProvider,
      baseUrl: useBaseUrl,
      model: useModel,
      keyFromBody: !!(apiKey && !/•|configured|masked/i.test(apiKey)),
      keyFromLib: !!saved.aiImageProviders?.[useProvider]?.apiKey,
      keyFromMain: !!saved.aiImageApiKey,
      keyPreview: useKey ? `${useKey.slice(0, 6)}...${useKey.slice(-4)}` : '(empty)',
    }))

    if (!useKey) {
      return NextResponse.json({ error: 'API Key is required' }, { status: 400 })
    }

    const url = useBaseUrl.replace(/\/$/, '')
    const res = await fetch(`${url}/models`, {
      headers: { 'Authorization': `Bearer ${useKey}` },
    })

    if (!res.ok) {
      const errorText = await res.text()
      let errorMsg = `Connection failed (${res.status})`
      try {
        const err = JSON.parse(errorText)
        errorMsg = err.error?.message || err.message || err.error || errorMsg
      } catch {
        if (errorText) errorMsg = errorText.substring(0, 200)
      }
      return NextResponse.json({
        error: `${errorMsg}（测试参数：Provider=${useProvider}，BaseURL=${useBaseUrl}，模型=${useModel || '默认'}，Key=${useKey ? `${useKey.slice(0, 6)}...${useKey.slice(-4)}` : '(未配置)'}）`,
      }, { status: 400 })
    }

    const data = await res.json()
    const models: any[] = Array.isArray(data?.data) ? data.data : []
    const wanted = useModel
    const found = wanted
      ? models.some((m: any) => {
          const id = m?.id || m?.name || ''
          return id === wanted || id.toLowerCase().includes(wanted.toLowerCase())
        })
      : true

    return NextResponse.json({
      success: true,
      message: found
        ? `Connection successful! Model "${wanted || 'default'}" is available.`
        : `Connection successful, but model "${wanted}" was not found in the provider's model list.`,
      availableModels: models.map((m: any) => m?.id || m?.name).slice(0, 20),
    })
  } catch (error: any) {
    console.error('[AI Image Test] Error:', error)
    return NextResponse.json(
      { error: `Connection error: ${error.message || 'Unknown error'}` },
      { status: 500 }
    )
  }
}
