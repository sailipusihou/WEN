// 营销图片设计建议 API - 由文案 LLM 生成图上文案与画风建议（供图片编辑器使用）
import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth'
import { getRepository } from '@/lib/repository'
import { resolveLLMConfig } from '@/lib/ai-config'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const auth = requirePermission(req, 'settings_manage')
    if ('error' in auth) return auth.error

    const body = await req.json()
    const { productName, productDesc, caption, imagePrompt, style, extraNotes, tone } = body as {
      productName?: string
      productDesc?: string
      caption?: string
      imagePrompt?: string
      style?: string
      extraNotes?: string
      tone?: string
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
      return NextResponse.json({ error: '文案 AI 未配置，无法生成设计建议。' }, { status: 400 })
    }


    const prompt = `You are a senior social media ad designer. Based on the product and content below, produce a design brief for a marketing image overlay.

PRODUCT: ${productName || 'N/A'}
PRODUCT DESCRIPTION: ${productDesc || 'N/A'}
EXISTING COPY: ${caption || 'N/A'}
IMAGE PROMPT: ${imagePrompt || 'N/A'}
STYLE PREFERENCE: ${style || 'auto (match brand: premium contemporary lifestyle)'}
EXTRA NOTES / SELLING POINTS: ${extraNotes || 'N/A'}
MOOD / TONE: ${tone || 'premium, elegant'}

Return ONLY valid JSON with these fields:
- "headline": a short punchy headline for the image (max 6 words, no emoji)
- "subheadline": one supporting line (max 12 words, no emoji)
- "badge": a promo badge text like "NEW", "SALE", "LIMITED", "5% OFF" or "" if not appropriate
- "cta": a short call to action (max 4 words, no emoji)
- "style": one of ["luxury", "minimal", "vibrant", "retro", "neon", "warm", "cool", "mono"]
- "styleDesc": one sentence describing the visual treatment (lighting, color mood, typography feel)
- "colors": array of 2-3 hex colors that work for this ad (text/accent/background)

Keep the overlay text minimal and legible - the image itself stays the hero. No markdown, JSON only.`

    const res = await fetch(`${llm.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${llm.apiKey}`,
      },
      body: JSON.stringify({
        model: llm.model,
        messages: [
          { role: 'system', content: 'You are a senior social media ad designer. You reply with valid JSON only.' },
          { role: 'user', content: prompt },
        ],
        stream: false,
        temperature: 0.8,
        max_tokens: 800,
      }),
    })

    if (!res.ok) {
      const errorText = await res.text()
      console.error('[Design Assist] API error:', res.status, errorText)
      return NextResponse.json({ error: 'AI 设计服务暂时不可用，请稍后重试' }, { status: 500 })
    }

    const data = await res.json()
    let content = data.choices?.[0]?.message?.content || ''
    content = content.replace(/^```json\s*/i, '').replace(/\s*```$/, '').trim()
    let result: any = {}
    try {
      result = JSON.parse(content)
    } catch {
      return NextResponse.json({ error: 'AI 返回格式异常，请重试' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      design: {
        headline: String(result.headline || ''),
        subheadline: String(result.subheadline || ''),
        badge: String(result.badge || ''),
        cta: String(result.cta || ''),
        style: String(result.style || 'luxury'),
        styleDesc: String(result.styleDesc || ''),
        colors: Array.isArray(result.colors) ? result.colors.map(String).slice(0, 3) : [],
      },
    })
  } catch (e: any) {
    console.error('[Design Assist] error:', e)
    return NextResponse.json({ error: '设计建议生成失败' }, { status: 500 })
  }
}
