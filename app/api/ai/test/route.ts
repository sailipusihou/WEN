import { NextRequest, NextResponse } from 'next/server'
import { getRepository } from '@/lib/repository'
import { requirePermission } from '@/lib/auth'
import { resolveLLMConfig } from '@/lib/ai-config'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const PROVIDER_URLS: Record<string, string> = {
  openai: 'https://api.openai.com/v1',
  deepseek: 'https://api.deepseek.com/v1',
  anthropic: 'https://api.anthropic.com/v1',
  qwen: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  zhipu: 'https://open.bigmodel.cn/api/paas/v4',
  custom: '',
}

const PROVIDER_MODELS: Record<string, string> = {
  openai: 'gpt-4o-mini',
  deepseek: 'deepseek-chat',
  anthropic: 'claude-3-5-sonnet-20241022',
  qwen: 'qwen-plus',
  zhipu: 'glm-4-flash',
  custom: 'gpt-4o-mini',
}

export async function POST(req: NextRequest) {
  const auth = requirePermission(req, 'ai_assistant_config')
  if ('error' in auth) return auth.error

  try {
    const body = await req.json()
    const { provider, apiKey, model, baseUrl } = body as {
      provider: string
      apiKey: string
      model?: string
      baseUrl?: string
    }

    // 前端拿不到已保存的 Key（接口脱敏），未传入时自动使用已保存配置
    const saved = getRepository().settings.get()
    const cfg = resolveLLMConfig(saved, { provider, model, apiKey, baseUrl })
    const useKey = cfg.apiKey
    const useModel = cfg.model
    const useBaseUrl = cfg.baseUrl

    if (!useKey) {
      return NextResponse.json({ error: 'API Key is required' }, { status: 400 })
    }

    // Send a minimal test request
    const testResponse = await fetch(`${useBaseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${useKey}`,
      },
      body: JSON.stringify({
        model: useModel,
        messages: [{ role: 'user', content: 'Hi' }],
        max_tokens: 5,
      }),
    })

    if (!testResponse.ok) {
      const errorText = await testResponse.text()
      let errorMsg = `Connection failed (${testResponse.status})`
      try {
        const errorJson = JSON.parse(errorText)
        errorMsg = errorJson.error?.message || errorJson.message || errorMsg
      } catch {
        if (errorText) errorMsg = errorText.substring(0, 200)
      }
      return NextResponse.json({ error: errorMsg }, { status: 400 })
    }

    const data = await testResponse.json()
    const reply = data.choices?.[0]?.message?.content || ''

    return NextResponse.json({
      success: true,
      message: `Connection successful! Model "${useModel}" responded.`,
      reply: reply.substring(0, 50),
    })
  } catch (error: any) {
    console.error('[AI Test] Error:', error)
    return NextResponse.json(
      { error: `Connection error: ${error.message || 'Unknown error'}` },
      { status: 500 }
    )
  }
}
