// AI 营销配图生成 API
// - text 模式: 通过 OpenAI 兼容 images/generations 文本生图（默认）
// - reference 模式: 通过 images/edits 以参考图 + 提示词生成（需模型支持）
// 生成的图片保存到本地 public/uploads/ai/ 并返回本地 URL
import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { requirePermission, rateLimit, getClientIp } from '@/lib/auth'
import { getRepository } from '@/lib/repository'
import { resolveImageConfig, isSafeHttpUrl } from '@/lib/ai-config'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ASPECT_MAP: Record<string, string> = {
  '1024x1024': '1:1',
  '768x1024': '3:4',
  '1024x768': '4:3',
  '512x512': '1:1',
}

// Seedream 4.5/5.0 不支持 1024 级分辨率，需要映射到其支持的分辨率
function arkSizeForModel(model: string, size: string): string {
  const isHiRes = /seedream-4[.\-]5|seedream-5/i.test(model)
  if (!isHiRes) return size
  const map: Record<string, string> = {
    '1024x1024': '2048x2048',
    '512x512': '2048x2048',
    '768x1024': '1440x2560',
    '1024x768': '2560x1440',
  }
  return map[size] || size
}

function buildPromptFromProduct(product: any, platform: string): string {
  const name = product?.name || product?.nameEn || 'a premium product'
  const desc = product?.description || product?.descriptionEn || ''
  const category = product?.category || ''
  const material = product?.material || ''
  const price = product?.price ? `$${product.price}` : ''
  return [
    `Professional e-commerce product photography for "${name}"${category ? ` (${category})` : ''}${price ? `, priced ${price}` : ''}.`,
    desc ? `Product details: ${desc}` : '',
    material ? `Materials: ${material}.` : '',
    'Cinematic studio lighting, premium advertising style, clean elegant background with subtle warm aesthetic, high detail, sharp focus, 4k quality, social media ready composition.',
  ].filter(Boolean).join(' ')
}

async function fetchImageBuffer(url: string, origin: string): Promise<Buffer> {
  const isRelative = url.startsWith('/')
  const abs = isRelative ? `${origin}${url}` : url
  // 修复 H17 (SSRF): 远程参考图仅允许公网主机, 相对路径仅限本站
  if (!isRelative && !isSafeHttpUrl(abs)) {
    throw new Error('参考图 URL 不被允许 (仅支持公网图片地址)')
  }
  const res = await fetch(abs)
  if (!res.ok) throw new Error(`参考图下载失败 (${res.status})`)
  return Buffer.from(await res.arrayBuffer())
}

function dataUrlToBuffer(dataUrl: string): Buffer {
  const m = /^data:image\/(png|jpe?g|webp|gif);base64,(.+)$/i.exec(dataUrl)
  if (!m) throw new Error('参考图格式无效，请上传 PNG/JPG/WebP 图片')
  return Buffer.from(m[2], 'base64')
}

async function downloadImage(url: string): Promise<{ buffer: Buffer; ext: string }> {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`图片下载失败 (${res.status})`)
  }
  const buf = Buffer.from(await res.arrayBuffer())
  const contentType = res.headers.get('content-type') || ''
  let ext = 'png'
  if (contentType.includes('jpeg') || contentType.includes('jpg')) ext = 'jpg'
  else if (contentType.includes('webp')) ext = 'webp'
  else if (contentType.includes('gif')) ext = 'gif'
  else if (url.includes('.jpg') || url.includes('.jpeg')) ext = 'jpg'
  else if (url.includes('.webp')) ext = 'webp'
  return { buffer: buf, ext }
}

async function saveImages(items: { buffer: Buffer; ext: string }[]): Promise<{ url: string; file: string }[]> {
  const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'ai')
  fs.mkdirSync(uploadDir, { recursive: true })
  const saved: { url: string; file: string }[] = []
  for (const item of items) {
    if (!item) continue
    const file = `img_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.${item.ext || 'png'}`
    fs.writeFileSync(path.join(uploadDir, file), item.buffer)
    saved.push({ url: `/uploads/ai/${file}`, file })
  }
  return saved
}

export async function POST(req: NextRequest) {
  try {
    const auth = requirePermission(req, 'settings_manage')
    if ('error' in auth) return auth.error
    // 修复 H17: 生成接口限频, 防止刷爆第三方 API 配额
    const ip = getClientIp(req)
    if (!rateLimit('ai_generate_image:' + ip, 20, 60 * 1000)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const body = await req.json()
    const repo = getRepository()
    const settings = repo.settings.get()

    const {
      productId,
      product,
      prompt,
      size = settings.aiImageSize || '1024x1024',
      count = 1,
      platform = 'general',
      mode = 'text',
      referenceImage,   // data URL（上传的参考图）
      referenceUrl,     // 远程/本地 URL（商品主图）
      model: modelOverride, // 生图区模型切换器传入的模型（优先于设置）
      provider: providerOverride, // 可选：手动覆盖 Provider（营销页不传，仅用于测试/多 Provider 场景）
      refProvider: refProviderOverride, // 参考图分区独立厂家（来自营销页/设置）
      refApiKey: refApiKeyOverride,
      refBaseUrl: refBaseUrlOverride,
    } = body

    if (settings.aiImageEnabled === false) {
      return NextResponse.json(
        { error: '图片生成 AI 未启用。请到 设置 → AI Assistant → 图片生成 AI 打开开关。' },
        { status: 400 }
      )
    }

    let productData = product
    if (productId && !productData) {
      productData = repo.products.getById(productId)
    }
    if (productData && !(productData as any)?.image && productId) {
      const fromRepo = repo.products.getById(productId)
      if (fromRepo) productData = fromRepo
    }

    const isRef = mode === 'reference'
    // 从图片模型库解析配置：文生图用主选择，参考图用参考选择（可被请求体覆盖）
    const { provider, apiKey, baseUrl: cleanBaseUrl, model } = resolveImageConfig(settings, isRef ? 'reference' : 'text', {
      provider: isRef ? (refProviderOverride || providerOverride) : providerOverride,
      model: modelOverride,
      apiKey: isRef ? refApiKeyOverride : undefined,
      baseUrl: isRef ? refBaseUrlOverride : undefined,
    })
    if (!apiKey) {
      return NextResponse.json(
        { error: isRef ? '参考图生成 AI 未配置 API Key。请到 设置 → AI Assistant → 参考图生成（图生图）填写，或先配置主图片生成 AI。' : '图片 AI 未配置。请到 设置 → AI Assistant → 图片生成 AI 填写 API Key。' },
        { status: 400 }
      )
    }
    const arkSize = arkSizeForModel(model, size)
    const finalPrompt = (prompt && String(prompt).trim())
      ? String(prompt).trim()
      : buildPromptFromProduct(productData, platform)
    const productImage = productData?.image ? String(productData.image) : ''
    const batch = Math.max(1, Math.min(4, Number(count) || 1))
    const origin = req.nextUrl.origin

    let res: Response
    if (provider === 'ark') {
      // 火山方舟 Seedream：OpenAI 兼容 /images/generations，image 支持 URL 或 data URL
      const payload: any = {
        model,
        prompt: finalPrompt,
        size: arkSize,
        n: batch,
        response_format: 'b64_json',
      }
      if (mode === 'reference') {
        let refImage: string
        if (referenceImage) {
          refImage = String(referenceImage)
        } else if (referenceUrl || productImage) {
          const refBuffer = await fetchImageBuffer(String(referenceUrl || productImage), origin)
          refImage = `data:image/png;base64,${refBuffer.toString('base64')}`
        } else {
          return NextResponse.json(
            { error: '参考图模式需要提供参考图（上传图片或选择商品主图）' },
            { status: 400 }
          )
        }
        payload.image = refImage
        payload.prompt = `${finalPrompt}\n\nIMPORTANT: Use the reference image as the exact subject. Keep the product's shape, colors, materials and details identical; only change the scene, background, lighting or composition as described in the prompt. Do not redesign or replace the product.`
      }
      res = await fetch(`${cleanBaseUrl}/images/generations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
      })
    } else if (provider === 'minimax') {
      const aspect = ASPECT_MAP[size] || '1:1'
      const payload: any = {
        model,
        prompt: finalPrompt,
        aspect_ratio: aspect,
        response_format: 'base64',
      }
      if (mode === 'reference') {
        let refBuffer: Buffer
        if (referenceImage) {
          refBuffer = dataUrlToBuffer(String(referenceImage))
        } else if (referenceUrl || productImage) {
          refBuffer = await fetchImageBuffer(String(referenceUrl || productImage), origin)
        } else {
          return NextResponse.json(
            { error: '参考图模式需要提供参考图（上传图片或选择商品主图）' },
            { status: 400 }
          )
        }
        payload.subject_reference = [
          {
            type: 'character',
            image_file: `data:image/png;base64,${refBuffer.toString('base64')}`,
          },
        ]
        payload.prompt = `${finalPrompt}\n\nIMPORTANT: Use the reference image as the exact subject. Keep the product's shape, colors, materials and details identical; only change the scene, background, lighting or composition as described in the prompt. Do not redesign or replace the product.`
      }
      res = await fetch(`${cleanBaseUrl}/image_generation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
      })
    } else if (mode === 'reference') {
      let refBuffer: Buffer
      if (referenceImage) {
        refBuffer = dataUrlToBuffer(String(referenceImage))
      } else if (referenceUrl) {
        refBuffer = await fetchImageBuffer(String(referenceUrl), origin)
      } else {
        return NextResponse.json(
          { error: '参考图模式需要提供参考图（上传图片或选择商品主图）' },
          { status: 400 }
        )
      }

      const form = new FormData()
      form.append('model', model)
      form.append('prompt', finalPrompt)
      form.append('image_size', size)
      form.append('batch_size', String(batch))
      form.append('image', new Blob([new Uint8Array(refBuffer)], { type: 'image/png' }), 'reference.png')

      res = await fetch(`${cleanBaseUrl}/images/edits`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}` },
        body: form,
      })
    } else {
      res = await fetch(`${cleanBaseUrl}/images/generations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          prompt: finalPrompt,
          image_size: size,
          batch_size: batch,
        }),
      })
    }

    if (!res.ok) {
      const errorText = await res.text()
      let errorMsg = `图片生成失败 (${res.status})`
      try {
        const err = JSON.parse(errorText)
        errorMsg = err.error?.message || err.message || err.error || errorMsg
      } catch {
        if (errorText) errorMsg = errorText.substring(0, 300)
      }
      if (mode === 'reference' && provider !== 'ark' && provider !== 'minimax' && (res.status === 404 || /not found/i.test(errorMsg))) {
        errorMsg = '当前账号的图片模型不支持「参考图重绘」（需要 Qwen-Image-Edit 等编辑类模型）。建议切换到「按产品名称生成」，或用营销编辑器直接以产品图制作。'
      }
      console.error('[Marketing Image AI] API error:', res.status, errorText)
      return NextResponse.json({ error: errorMsg }, { status: 500 })
    }

    const data = await res.json()
    let normalized: { buffer: Buffer; ext: string }[] = []
    if (provider === 'minimax') {
      const b64s: any[] = data?.data?.image_base64 || data?.data?.images || []
      normalized = b64s.map((b: any) => ({ buffer: Buffer.from(String(b), 'base64'), ext: 'jpg' }))
    } else {
      const items: any[] = data?.data || data?.images || []
      for (const item of items) {
        if (!item) continue
        if (item.b64_json) {
          normalized.push({ buffer: Buffer.from(item.b64_json, 'base64'), ext: 'png' })
        } else if (item.url) {
          const dl = await downloadImage(item.url)
          normalized.push({ buffer: dl.buffer, ext: dl.ext })
        }
      }
    }
    if (normalized.length === 0) {
      if (provider === 'ark') {
        return NextResponse.json({
          error: '图片生成接口未返回有效结果：请确认已开通火山方舟对应 Seedream 模型（模型 ID 需与设置一致）',
        }, { status: 500 })
      }
      return NextResponse.json({ error: '图片生成接口未返回有效结果' }, { status: 500 })
    }

    const saved = await saveImages(normalized)
    if (saved.length === 0) {
      return NextResponse.json({ error: '图片生成成功但无法保存' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      images: saved.map(s => s.url),
      files: saved.map(s => s.file),
      prompt: finalPrompt,
      model,
      size: provider === 'ark' ? arkSize : size,
      mode,
    })
  } catch (e: any) {
    console.error('[Marketing Image AI] Generate error:', e)
    return NextResponse.json(
      { error: `图片生成失败: ${e?.message || '未知错误'}` },
      { status: 500 }
    )
  }
}
