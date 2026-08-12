// AI 营销文案生成 API
import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth'
import { getRepository } from '@/lib/repository'
import { resolveLLMConfig } from '@/lib/ai-config'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const PLATFORM_GUIDELINES: Record<string, { maxLength: number; tone: string; features: string[] }> = {
  instagram: {
    maxLength: 2200,
    tone: 'visual, engaging, lifestyle-oriented',
    features: ['emojis', 'hashtags', 'story hooks', 'call to action'],
  },
  facebook: {
    maxLength: 5000,
    tone: 'conversational, community-focused, trustworthy',
    features: ['emojis', 'hashtags', 'storytelling', 'social proof'],
  },
  twitter: {
    maxLength: 280,
    tone: 'concise, punchy, newsworthy',
    features: ['hashtags', 'mentions', 'urgency', 'CTA link'],
  },
  pinterest: {
    maxLength: 500,
    tone: 'inspirational, aspirational, discoverable',
    features: ['keywords', 'rich pins', 'how-to format', 'lifestyle context'],
  },
  tiktok: {
    maxLength: 2200,
    tone: 'casual, trend-aware, authentic, energetic',
    features: ['trending sounds', 'hashtags', 'hook first 3s', 'duet ideas'],
  },
  email: {
    maxLength: 2000,
    tone: 'personal, value-driven, clear CTA',
    features: ['subject line', 'preview text', 'personalization', 'urgency'],
  },
  general: {
    maxLength: 1000,
    tone: 'professional, versatile',
    features: ['key selling points', 'CTA', 'brand voice'],
  },
}

export async function POST(req: NextRequest) {
  try {
    const auth = requirePermission(req, 'settings_manage')
    if ('error' in auth) return auth.error

    const body = await req.json()
    const repo = getRepository()
    const settings = repo.settings.get()

    // 文案通道：优先使用独立的 Content Studio 文案 AI 配置，未配置时回退到对话助手配置
    const llm = resolveLLMConfig(settings, {
      provider: body.provider,
      model: body.model,
      apiKey: body.apiKey,
      baseUrl: body.baseUrl,
    })

    if (!llm.apiKey) {
      return NextResponse.json({ error: '文案 AI 未配置。请到 设置 → AI Assistant → 文案生成 AI 填写 API Key。' }, { status: 400 })
    }

    const {
      productId,
      product,
      platform = 'general',
      type = 'social_post',
      tone = 'professional',
      template,
      additionalContext = '',
      language = 'en',
    } = body

    let productData = product
    if (productId && !productData) {
      productData = repo.products.getById(productId)
    }

    if (!productData && type !== 'general') {
      return NextResponse.json({ error: 'Product information is required' }, { status: 400 })
    }

    const guidelines = PLATFORM_GUIDELINES[platform] || PLATFORM_GUIDELINES.general

    const productInfo = productData ? `
Product Name: ${productData.name || productData.nameEn}
Product Description: ${productData.description || productData.descriptionEn || ''}
Price: $${productData.price || 'N/A'}
Category: ${productData.category || ''}
Key Features: ${productData.features || productData.highlights || ''}
Materials: ${productData.material || ''}
Dimensions: ${productData.dimensions || ''}
` : 'No specific product - general brand content'

    const templateContext = template ? `
Use this content template/style: "${template}"
` : ''

    const languagePrompt = language === 'zh' ? 'Respond in Chinese (Simplified).' : 'Respond in English.'

    const prompt = `You are an expert e-commerce marketing copywriter specializing in ${platform} content.

${languagePrompt}

PLATFORM GUIDELINES for ${platform}:
- Max length: ~${guidelines.maxLength} characters
- Tone: ${guidelines.tone}
- Key features to include: ${guidelines.features.join(', ')}

CONTENT TYPE: ${type}
BRAND TONE: ${tone}

${templateContext}

PRODUCT INFORMATION:
${productInfo}

ADDITIONAL CONTEXT:
${additionalContext || 'None provided'}

INSTRUCTIONS:
Generate compelling marketing copy that:
1. Hooks the reader immediately
2. Highlights key product benefits (not just features)
3. Creates desire and urgency where appropriate
4. Includes a clear call-to-action
5. Matches the ${platform} platform style and best practices
6. Uses the "${tone}" tone of voice
7. Includes relevant hashtags (3-7 for social platforms)
8. Has an engaging headline/title

Return your response in JSON format with these fields:
- "title": a catchy title/headline for the content
- "content": the main marketing copy
- "hashtags": array of relevant hashtags (empty array if not applicable)
- "suggestedHashtags": array of additional hashtag ideas
- "hook": the attention-grabbing opening line
- "cta": the call to action text
- "tips": array of 2-3 posting tips specific to this platform
- "imagePrompt": a detailed English visual prompt (50-120 words) for an AI image generator. Describe the product, composition, lighting, mood, style, and platform-appropriate aspect ratio hints. It should be usable directly as a text-to-image prompt.

Respond ONLY with valid JSON, no markdown code blocks.`

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
            content: 'You are a senior marketing copywriter for premium e-commerce brands. You write persuasive, platform-optimized content that drives engagement and sales.',
          },
          { role: 'user', content: prompt },
        ],
        stream: false,
        temperature: 0.8,
        max_tokens: 1500,
      }),
    })

    if (!res.ok) {
      const errorText = await res.text()
      console.error('[Marketing AI] API error:', res.status, errorText)
      return NextResponse.json({ error: 'AI service error. Please try again.' }, { status: 500 })
    }

    const data = await res.json()
    let content = data.choices?.[0]?.message?.content || ''

    content = content.replace(/^```json\s*/i, '').replace(/\s*```$/, '').trim()

    let result
    try {
      result = JSON.parse(content)
    } catch {
      result = {
        title: `${productData?.name || 'Marketing'} - ${platform}`,
        content: content,
        hashtags: [],
        suggestedHashtags: [],
        hook: '',
        cta: '',
        tips: [],
      }
    }

    // 数据格式安全处理 — 确保返回给前端的数据类型正确
    const safeResult = {
      title: String(result.title || result.headline || 'Marketing Content'),
      content: String(result.content || result.body || ''),
      hashtags: Array.isArray(result.hashtags) ? result.hashtags.map((h: any) => String(h)) : [],
      suggestedHashtags: Array.isArray(result.suggestedHashtags) ? result.suggestedHashtags.map((h: any) => String(h)) : [],
      hook: String(result.hook || ''),
      cta: String(result.cta || ''),
      tips: Array.isArray(result.tips) ? result.tips.map((t: any) => String(t)) : [],
      imagePrompt: String(result.imagePrompt || ''),
    }

    return NextResponse.json({
      success: true,
      result: safeResult,
      platform,
      type,
    })
  } catch (e) {
    console.error('[Marketing AI] Generate error:', e)
    return NextResponse.json({ error: 'Failed to generate marketing content' }, { status: 500 })
  }
}
