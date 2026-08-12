// AI 一键营销工作流：为商品依次生成 文案 → 配图 → 视频，并可自动发布到社交平台
import { getRepository } from './repository'
import { getAllSocialAccounts } from './social-accounts'
import { socialEventBus } from './social-event-bus'

export interface WorkflowStepEvent {
  step: string
  label: string
  status: 'running' | 'done' | 'error'
  detail?: string
}

export interface MarketingWorkflowOptions {
  productId?: string
  platform?: string
  publish?: boolean
  publishAccountId?: string
  prompt?: string
  cookie: string
  origin: string
  onStep?: (ev: WorkflowStepEvent) => void
}

async function callInternal(origin: string, cookie: string, path: string, body: any, timeoutMs = 600000) {
  const res = await fetch(`${origin}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      cookie: cookie || '',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  })
  const text = await res.text()
  let data: any = {}
  try {
    data = JSON.parse(text)
  } catch {}
  if (!res.ok) {
    throw new Error(data?.error || `请求失败 (HTTP ${res.status})`)
  }
  return data
}

export async function runMarketingWorkflow(opts: MarketingWorkflowOptions) {
  const repo = getRepository()
  const product = opts.productId ? repo.products.getById(opts.productId) : null
  if (!product) {
    return { success: false, error: '找不到商品，请先用 list_products 查询商品 ID' }
  }

  const platform = (opts.platform || 'instagram').toLowerCase()
  const results: Record<string, any> = { productId: product.id, productName: product.name || product.nameEn || '' }

  // 1. 推广文案
  opts.onStep?.({ step: 'copy', label: '生成推广文案', status: 'running' })
  const copyRes = await callInternal(opts.origin, opts.cookie, '/api/marketing/generate', {
    productId: product.id,
    platform,
    type: 'social_post',
    tone: 'professional',
    language: 'en',
    additionalContext: opts.prompt || '',
  })
  const copy = copyRes?.result || {}
  results.copy = {
    title: String(copy.title || ''),
    content: String(copy.content || ''),
    hashtags: Array.isArray(copy.hashtags) ? copy.hashtags.map(String) : [],
    hook: String(copy.hook || ''),
    cta: String(copy.cta || ''),
    imagePrompt: String(copy.imagePrompt || ''),
  }
  opts.onStep?.({ step: 'copy', label: '生成推广文案', status: 'done', detail: results.copy.title || '文案已生成' })

  // 2. 营销配图
  opts.onStep?.({ step: 'image', label: '生成营销配图', status: 'running' })
  const imagePrompt = results.copy.imagePrompt
    || `Professional e-commerce product photography for "${product.name || product.nameEn}", cinematic studio lighting, premium advertising style, clean elegant background with subtle warm aesthetic, high detail, sharp focus, social media ready.`
  const imageRes = await callInternal(opts.origin, opts.cookie, '/api/marketing/generate-image', {
    productId: product.id,
    prompt: imagePrompt,
    size: '1024x1024',
    count: 1,
    platform,
    mode: product.image ? 'reference' : 'text',
  })
  const imageUrl = imageRes?.images?.[0] || ''
  if (!imageUrl) throw new Error('图片生成失败：接口未返回图片地址')
  results.imageUrl = imageUrl
  opts.onStep?.({ step: 'image', label: '生成营销配图', status: 'done', detail: imageUrl })

  // 3. 图生视频（较慢，约 1-3 分钟）
  opts.onStep?.({ step: 'video', label: '生成产品视频（约 1-3 分钟）', status: 'running' })
  const videoRes = await callInternal(opts.origin, opts.cookie, '/api/marketing/generate-video', {
    referenceUrl: imageUrl,
    prompt: '镜头缓慢推进，产品在柔和灯光下自然展示，电影感运镜，画面稳定高清',
    duration: 5,
    ratio: 'adaptive',
    audio: true,
  })
  const videoUrl = videoRes?.video || ''
  if (!videoUrl) throw new Error('视频生成失败：接口未返回视频地址')
  results.videoUrl = videoUrl
  opts.onStep?.({ step: 'video', label: '生成产品视频', status: 'done', detail: videoUrl })

  // 4. 发布
  results.published = null
  if (opts.publish !== false) {
    opts.onStep?.({ step: 'publish', label: `发布到 ${platform}`, status: 'running' })
    const connected = getAllSocialAccounts().filter(a => a.status === 'connected')
    let accountId = opts.publishAccountId || ''
    if (!accountId) {
      const match = connected.find(a => a.platform === platform)
      accountId = match?.id || ''
    }
    if (!accountId) {
      const ig = connected.find(a => a.platform === 'instagram')
      accountId = ig?.id || ''
    }
    if (!accountId) {
      throw new Error(`没有已连接的社交账号可发布（${platform} 或 Instagram），请先到 营销 → 社交账号 连接账号`)
    }
    const caption = [results.copy.title, results.copy.content, (results.copy.hashtags || []).join(' ')]
      .filter(Boolean)
      .join('\n\n')
      .slice(0, 2200)
    const pubRes = await callInternal(opts.origin, opts.cookie, '/api/marketing/instagram-publish', {
      accountId,
      mediaUrl: videoUrl,
      caption,
      mediaType: 'VIDEO',
    })
    results.published = {
      accountId,
      mediaId: pubRes?.mediaId || '',
      message: pubRes?.message || '发布成功',
    }
    opts.onStep?.({ step: 'publish', label: `发布到 ${platform}`, status: 'done', detail: results.published.message })
  }

  // 把工作流结果实时推送给前端营销面板（面板自动展示/选中生成结果）
  try {
    socialEventBus.emit({
      id: `workflow_${Date.now()}`,
      type: 'workflow',
      platform: 'internal',
      accountId: results.published?.accountId || '',
      accountUsername: results.published?.accountId || '',
      timestamp: new Date().toISOString(),
      data: {
        productId: product.id,
        productName: product.name || product.nameEn || '',
        imageUrl: results.imageUrl,
        videoUrl: results.videoUrl,
        copy: results.copy,
        published: results.published,
      },
    })
  } catch {}

  return { success: true, ...results }
}
