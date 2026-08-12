// 营销 AI 对话 API — 对接设置中的 AI 配置
import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth'
import { getRepository } from '@/lib/repository'
import { resolveLLMConfig } from '@/lib/ai-config'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MODE_PROMPTS: Record<string, string> = {
  copywriting: `You are an expert e-commerce copywriter. Create compelling, conversion-focused marketing copy.
Specialties: product descriptions, taglines, brand stories, value propositions, urgency-driven sales copy.
Always provide: a headline, body copy, and a clear CTA. Use persuasive psychology principles (scarcity, social proof, reciprocity).`,

  ad_design: `You are a creative ad designer and art director. Design ad concepts that capture attention and drive clicks.
Specialties: Facebook/Instagram ads, Google ads, banner concepts, carousel ad sequences, video ad scripts.
Always provide: visual direction (colors, layout, imagery), headline, body text, CTA, and format specifications.
Describe the visual layout in detail so a designer can execute it.`,

  social_content: `You are a social media content strategist. Create platform-native content that drives engagement.
Specialties: Instagram posts/stories/reels, TikTok scripts, Twitter threads, LinkedIn posts, YouTube descriptions.
Adapt tone and format to each platform's best practices. Include hooks, hashtags, and engagement prompts.`,

  email_campaign: `You are an email marketing expert. Create email campaigns that get opened, read, and clicked.
Specialties: subject lines, preview text, email body, CTAs, drip sequences, abandoned cart emails.
Always provide: subject line, preview text, email body, and CTA. Focus on open rates and click-through rates.`,

  seo_content: `You are an SEO content specialist. Create content that ranks and converts.
Specialties: keyword optimization, meta tags, blog outlines, product page SEO, category descriptions.
Provide: target keywords, meta title, meta description, content outline, and optimized copy.`,

  general: `You are a versatile marketing assistant. Help with brainstorming, strategy, analysis, and any marketing-related questions.
Provide actionable, practical advice. Ask clarifying questions when needed. Always explain your reasoning.`,
}

// 图片生成工具：DeepSeek 识别到图片/海报/商品图编辑需求时调用，由后端路由到当前配置的图片 AI（硅基流动/MiniMax/方舟）
const IMAGE_TOOL = {
  type: 'function',
  function: {
    name: 'generate_marketing_image',
    description:
      'Generate or edit a marketing image (product photo, ad banner, poster, social media visual, background change, style transfer). Call this when the user asks to create, draw, edit, restyle, or generate an image, poster, banner, or ad visual. Do NOT call it for copywriting-only requests.',
    parameters: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description:
            'Detailed image description in the same language as the user. Include product, scene, lighting, style, composition. If the user wants to keep the product identical, say so explicitly.',
        },
        mode: {
          type: 'string',
          enum: ['name', 'reference'],
          description:
            '"name" = text-to-image using product name/description only. "reference" = image-to-image using the attached reference/product image; choose reference whenever a reference image or uploaded image is available and should be kept consistent.',
        },
        size: {
          type: 'string',
          enum: ['1024x1024', '768x1024', '1024x768', '512x512'],
          description: 'Output size. Default 1024x1024.',
        },
        count: {
          type: 'integer',
          minimum: 1,
          maximum: 4,
          description: 'Number of images to generate. Default 1.',
        },
      },
      required: ['prompt', 'mode'],
    },
  },
}

export async function POST(req: NextRequest) {
  try {
    const auth = requirePermission(req, 'settings_manage')
    if ('error' in auth) return auth.error

    const body = await req.json()
    const { messages, mode = 'general', modeName = 'General', product, uploads, extraContext = '', provider, model, apiKey, baseUrl } = body

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Messages are required' }, { status: 400 })
    }

    const repo = getRepository()
    const settings = repo.settings.get()

    const llm = resolveLLMConfig(settings, { provider, model, apiKey, baseUrl })
    if (!settings.aiEnabled || !llm.apiKey) {
      return NextResponse.json(
        { error: 'AI is not configured. Please enable AI and set API key in Settings → System → AI Assistant.' },
        { status: 400 }
      )
    }
    const modePrompt = MODE_PROMPTS[mode] || MODE_PROMPTS.general

    const systemContent = `${modePrompt}

You are integrated into the Marketing Center of ${settings.siteName || 'Low Flame'}.
Your job is to help the marketing team create amazing content, design ads, and plan campaigns.

IMPORTANT RULES:
1. Always respond in the SAME language the user uses (Chinese or English).
2. Be creative, specific, and actionable — avoid generic advice.
3. When a product is attached, use its real information (name, price, description) in your content.
4. When files are uploaded, acknowledge them and incorporate relevant context.
5. Format responses with clear sections, bullet points, and examples where appropriate.
6. If the user asks for multiple variations, provide at least 2-3 options.
7. For ad designs, describe visual elements clearly (layout, colors, fonts, imagery).
8. For copy, always include a headline, body, and CTA unless specified otherwise.

IMAGE GENERATION ROUTING:
- If the user asks to CREATE or EDIT an image (poster, banner, ad visual, product photo scene change, background change, style/artistic restyle, image with text overlay), you MUST call the "generate_marketing_image" tool with a detailed prompt.
- If a product is attached or an image is uploaded, use mode="reference" and describe how to adjust the scene/style while keeping the product identical.
- If no reference is available and the user just wants a new image from description, use mode="name".
- Never call the tool for pure copywriting, strategy, or text-only requests — answer directly.
- After the tool runs, briefly summarize what was generated and mention the image.

${extraContext}`

    const chatMessages = [
      { role: 'system', content: systemContent },
      ...messages.map((m: { role: string; content: string }) => ({
        role: m.role,
        content: m.content,
      })),
    ]

    const res = await fetch(`${llm.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${llm.apiKey}`,
      },
      body: JSON.stringify({
        model: llm.model,
        messages: chatMessages,
        stream: false,
        temperature: 0.8,
        max_tokens: 2000,
        tools: [IMAGE_TOOL],
        tool_choice: 'auto',
      }),
    })

    if (!res.ok) {
      const errorText = await res.text()
      console.error('[Marketing AI Chat] API error:', res.status, errorText)
      return NextResponse.json(
        { error: `AI service error (${res.status}). Please check your AI configuration in Settings.` },
        { status: 500 }
      )
    }

    const data = await res.json()
    const msg = data.choices?.[0]?.message || {}
    const toolCalls = msg.tool_calls || []

    let reply = msg.content || ''
    let images: string[] = []
    let imageModel = ''

    if (toolCalls.length > 0) {
      // 用户要求生成图片：解析工具参数，自动路由到图片生成通道
      const toolArgs = toolCalls[0]?.function?.arguments
      try {
        const args = JSON.parse(toolArgs || '{}')
        const genPrompt = String(args.prompt || '').trim()
        const genMode = args.mode === 'reference' ? 'reference' : 'name'
        if (!genPrompt) {
          reply = '请告诉我你想生成什么样的图片（例如：把产品放在木质餐桌上、换成暖色背景、制作一张节日海报）。'
        } else {
          // 组合参考信息：上传图优先作为参考图，其次用附加商品主图
          const uploadsArr = Array.isArray(uploads) ? uploads : []
          const firstUpload = uploadsArr.find((u: any) => u && u.dataUrl)
          const genBody: any = {
            productId: product?.id,
            product,
            prompt: genPrompt,
            size: ['768x1024', '1024x768', '512x512'].includes(args.size) ? args.size : '1024x1024',
            count: Math.max(1, Math.min(4, Number(args.count) || 1)),
            mode: genMode,
            platform: 'general',
          }
          if (genMode === 'reference') {
            if (firstUpload?.dataUrl) {
              genBody.referenceImage = firstUpload.dataUrl
            } else if (product?.image) {
              genBody.referenceUrl = product.image
            }
          }
          const genRes = await fetch(`${req.nextUrl.origin}/api/marketing/generate-image`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(req.headers.get('cookie') ? { Cookie: req.headers.get('cookie') || '' } : {}),
            },
            body: JSON.stringify(genBody),
            signal: AbortSignal.timeout(200000),
          })
          const genData = await genRes.json().catch(() => ({}))
          if (genRes.ok && genData.success && Array.isArray(genData.images) && genData.images.length > 0) {
            images = genData.images
            imageModel = genData.model || ''
            const modeLabel = genMode === 'reference' ? '参考图模式' : '按名称生成'
            const imageMd = images.map((u: string) => `![生成图片](${u})`).join('\n')
            reply = `已用 ${imageModel || '图片模型'}（${modeLabel}）生成 ${images.length} 张图片：\n\n${imageMd}\n\n${msg.content || '你可以把图片加入工作区继续编辑，或直接用于发布。'}`
          } else {
            reply = `图片生成没有成功：${genData.error || '请检查图片 AI 配置（设置 → AI Assistant → 图片生成 AI）。'}`
          }
        }
      } catch (e: any) {
        console.error('[Marketing AI Chat] Tool call error:', e)
        reply = `图片生成参数解析失败：${e?.message || '未知错误'}`
      }
    } else if (!reply) {
      reply = 'Sorry, I could not generate a response. Please try again.'
    }

    return NextResponse.json({ reply, images, imageModel, mode, modeName })
  } catch (e) {
    console.error('[Marketing AI Chat] Error:', e)
    return NextResponse.json({ error: 'Failed to process AI request' }, { status: 500 })
  }
}
