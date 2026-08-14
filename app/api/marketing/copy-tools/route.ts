// 文案微调工具 API - 基于已生成文案做扩写/精简/改写/翻译/换语气，不重新走完整生成流程
import { NextRequest, NextResponse } from 'next/server'
import { requirePermission, rateLimit, getClientIp } from '@/lib/auth'
import { getRepository } from '@/lib/repository'
import { resolveLLMConfig } from '@/lib/ai-config'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ACTIONS: Record<string, string> = {
  expand: 'Expand the copy with more detail while keeping the same structure and tone. Return only the new copy, no commentary.',
  shorten: 'Shorten the copy to about 60% of its length, keep the key selling points and tone. Return only the new copy, no commentary.',
  rewrite: 'Rewrite the copy with fresh wording, keep the same message and length. Return only the new copy, no commentary.',
  translate_en: 'Translate the copy into natural English marketing language. Return only the translated copy, no commentary.',
  translate_zh: 'Translate the copy into natural Chinese marketing language. Return only the translated copy, no commentary.',
  playful: 'Rewrite in a playful, energetic tone. Keep the message. Return only the new copy, no commentary.',
  luxury: 'Rewrite in a premium, sophisticated luxury tone. Keep the message. Return only the new copy, no commentary.',
  minimal: 'Rewrite in a clean, minimal tone. Keep the message. Return only the new copy, no commentary.',
  storytelling: 'Rewrite as an emotional storytelling style. Keep the message. Return only the new copy, no commentary.',
}

export async function POST(req: NextRequest) {
  try {
    const auth = requirePermission(req, 'settings_manage')
    if ('error' in auth) return auth.error
    // 修复 H17: 文案生成限频
    const ip = getClientIp(req)
    if (!rateLimit('ai_copy_tools:' + ip, 30, 60 * 1000)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const body = await req.json()
    const { text, action, platform } = body as {
      text?: string
      action?: string
      platform?: string
    }

    if (!text || !String(text).trim()) {
      return NextResponse.json({ error: '文案内容为空' }, { status: 400 })
    }
    const instruction = ACTIONS[String(action || '')]
    if (!instruction) {
      return NextResponse.json({ error: '不支持的微调操作' }, { status: 400 })
    }

    const repo = getRepository()
    const settings = repo.settings.get()
    const llm = resolveLLMConfig(settings, {
      provider: body.provider,
      model: body.model,
      apiKey: body.apiKey,
      baseUrl: body.baseUrl,
    })
    if (!llm.apiKey) {
      return NextResponse.json({ error: '文案 AI 未配置，无法执行微调。' }, { status: 400 })
    }

    const platformName = platform || 'social media'

    const res = await fetch(`${llm.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${llm.apiKey}`,
      },
      body: JSON.stringify({
        model: llm.model,
        messages: [
          {
            role: 'system',
            content: `You are a professional social media copywriter for a premium contemporary lifestyle brand publishing on ${platformName}. You reply with the finished copy only, no explanations, no markdown.`,
          },
          { role: 'user', content: `${instruction}\n\nCOPY:\n${String(text)}` },
        ],
        stream: false,
        temperature: 0.85,
        max_tokens: 1200,
      }),
    })

    if (!res.ok) {
      const errorText = await res.text()
      console.error('[Copy Tools] API error:', res.status, errorText)
      return NextResponse.json({ error: '文案 AI 服务暂时不可用，请稍后重试' }, { status: 500 })
    }

    const data = await res.json()
    const result = String(data.choices?.[0]?.message?.content || '').trim()
    if (!result) {
      return NextResponse.json({ error: 'AI 未返回有效文案，请重试' }, { status: 500 })
    }

    return NextResponse.json({ success: true, text: result })
  } catch (e: any) {
    console.error('[Copy Tools] error:', e)
    return NextResponse.json({ error: '文案微调失败' }, { status: 500 })
  }
}
