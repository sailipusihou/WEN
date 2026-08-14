// AI 图生视频生成 API
// - ark：火山方舟 Seedance（异步任务：创建任务 -> 轮询 -> 下载视频）
// - minimax：MiniMax Video-01（异步任务：创建任务 -> 轮询 -> 文件下载）
// 生成的视频保存到本地 public/uploads/ai/ 并返回本地 URL，可直接用于发布端
import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { ProxyAgent } from 'undici'
import { requirePermission, rateLimit, getClientIp } from '@/lib/auth'
import { getRepository } from '@/lib/repository'
import { resolveVideoConfig, isSafeHttpUrl } from '@/lib/ai-config'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// 与 lib/x-twitter.ts 等保持一致：若配置了 HTTP(S)_PROXY，外部厂商请求走代理
const PROXY_URL = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || ''
let proxyAgent: ProxyAgent | undefined
if (PROXY_URL) {
  proxyAgent = new ProxyAgent(PROXY_URL)
}

function proxyFetch(url: string, init: RequestInit = {}): Promise<Response> {
  return proxyAgent ? fetch(url, { ...init, dispatcher: proxyAgent } as RequestInit) : fetch(url, init)
}

function isNetworkError(e: any): boolean {
  const code = e?.cause?.code || e?.code || ''
  return !!e && (code === 'EACCES' || code === 'ECONNREFUSED' || code === 'ECONNRESET' || code === 'ETIMEDOUT' || code === 'UND_ERR_SOCKET' || e?.name === 'TypeError' || e?.name === 'AbortError')
}

// 直连优先；仅当直连因网络受限失败时退回代理
async function providerFetch(url: string, init: RequestInit = {}, timeoutMs = 30000): Promise<Response> {
  const withTimeout = { ...init, signal: AbortSignal.timeout(timeoutMs) }
  try {
    return await fetch(url, withTimeout)
  } catch (e: any) {
    if (!isNetworkError(e) || !proxyAgent) throw e
    console.log(`[Generate Video] direct fetch failed (${e?.cause?.code || e?.name}), retry via proxy: ${url.split('/').slice(0, 3).join('/')}/...`)
    return await proxyFetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) })
  }
}

function dataUrlToBuffer(dataUrl: string): Buffer {
  const m = /^data:image\/([a-z0-9+.-]+);base64,(.+)$/i.exec(dataUrl)
  if (!m) throw new Error('参考图格式无效，请上传 PNG/JPG/WebP 图片')
  return Buffer.from(m[2], 'base64')
}

function detectImageMime(buf: Buffer): string {
  // 用文件头魔数判断真实格式，避免扩展名与内容不一致（例如 .png 实际为 JPEG）
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpeg'
  if (buf.length > 8 && buf[0] === 0x89 && buf.toString('ascii', 1, 4) === 'PNG') return 'png'
  if (buf.length > 11 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'webp'
  if (buf.length > 5 && buf.toString('ascii', 0, 4) === 'GIF8') return 'gif'
  return ''
}

async function fetchImageBuffer(url: string, origin: string): Promise<Buffer> {
  const isRelative = url.startsWith('/')
  const abs = isRelative ? `${origin}${url}` : url
  // 修复 H17 (SSRF): 远程参考图仅允许公网主机
  if (!isRelative && !isSafeHttpUrl(abs)) {
    throw new Error('参考图 URL 不被允许 (仅支持公网图片地址)')
  }
  const res = await fetch(abs)
  if (!res.ok) throw new Error(`参考图下载失败 (${res.status})`)
  return Buffer.from(await res.arrayBuffer())
}

async function toDataUrl(input: string | undefined, origin: string): Promise<string> {
  if (!input) throw new Error('图生视频需要提供参考图：请上传图片或选择产品主图')
  if (input.startsWith('data:image/')) {
    dataUrlToBuffer(input)
    return input
  }
  const buf = await fetchImageBuffer(input, origin)
  const ext = /\.(jpe?g|png|webp|gif)(\?|$)/i.exec(input)?.[1]?.toLowerCase() || 'png'
  const detected = detectImageMime(buf)
  const mime = detected || (ext === 'jpg' ? 'jpeg' : ext)
  return `data:image/${mime};base64,${buf.toString('base64')}`
}

async function saveVideo(url: string): Promise<string> {
  let buf: Buffer | null = null
  let lastErr: any = null
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await providerFetch(url, {}, 60000)
      if (!res.ok) throw new Error(`视频下载失败 (${res.status})`)
      buf = Buffer.from(await res.arrayBuffer())
      break
    } catch (e: any) {
      lastErr = e
      console.log(`[Generate Video] download attempt ${attempt}/3 failed: ${e?.cause?.code || e?.message}`)
      await sleep(2000 * attempt)
    }
  }
  if (!buf) {
    throw new Error(lastErr?.message || '视频下载失败，请稍后重试')
  }
  const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'ai')
  fs.mkdirSync(uploadDir, { recursive: true })
  const file = `video_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.mp4`
  fs.writeFileSync(path.join(uploadDir, file), buf)
  return `/uploads/ai/${file}`
}

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms))
}

function extractError(res: Response, text: string): string {
  try {
    const d = JSON.parse(text)
    return d?.error?.message
      || d?.error
      || d?.message
      || d?.base_resp?.status_msg
      || text.substring(0, 300)
  } catch {
    return text ? text.substring(0, 300) : `HTTP ${res.status}`
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = requirePermission(req, 'settings_manage')
    if ('error' in auth) return auth.error
    // 修复 H17: 生成接口限频
    const ip = getClientIp(req)
    if (!rateLimit('ai_generate_video:' + ip, 10, 60 * 1000)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const body = await req.json()
    const {
      referenceImage,      // data URL（上传的参考图）
      referenceUrl,        // 本地/远程图片 URL（产品主图或生成的营销图）
      prompt = '镜头缓慢推进，产品在柔和灯光下自然展示，电影感运镜，画面稳定高清',
      model: modelOverride,
      provider: providerOverride,
      duration = 5,
      ratio = '16:9',
      audio = false,
    } = body

    const repo = getRepository()
    const settings = repo.settings.get()
    if (settings.aiVideoEnabled === false) {
      return NextResponse.json(
        { error: '视频生成 AI 未启用。请到 设置 → AI Assistant → 视频生成 AI（Content Studio）打开开关。' },
        { status: 400 }
      )
    }

    const { provider, apiKey, baseUrl, model } = resolveVideoConfig(settings, {
      provider: providerOverride,
      model: modelOverride,
    })
    if (!apiKey) {
      return NextResponse.json(
        { error: '视频生成 AI 未配置 API Key。请到 设置 → AI Assistant → 视频生成 AI（Content Studio）填写。' },
        { status: 400 }
      )
    }
    if (!referenceImage && !referenceUrl) {
      return NextResponse.json(
        { error: '图生视频需要一张起始帧图片：请上传自定义图片，或选择产品主图 / 已生成的营销图。' },
        { status: 400 }
      )
    }

    const origin = req.nextUrl.origin
    const imageDataUrl = await toDataUrl(String(referenceImage || referenceUrl), origin)
    const finalPrompt = String(prompt).trim()
      || '镜头缓慢推进，产品在柔和灯光下自然展示，电影感运镜，画面稳定高清'

    let videoUrl = ''
    let taskId = ''

    if (provider === 'ark') {
      const isLegacy = /seedance-1[.-]/.test(model)
      const content: any[] = [
        { type: 'text', text: finalPrompt },
        { type: 'image_url', image_url: { url: imageDataUrl }, ...(isLegacy ? { role: 'first_frame' } : {}) },
      ]
      const payload: any = {
        model,
        content,
        resolution: '720p',
        ratio: isLegacy && ratio === 'adaptive' ? '16:9' : ratio,
        duration: Number(duration) || 5,
        watermark: false,
      }
      if (audio) payload.generate_audio = true

      const createRes = await providerFetch(`${baseUrl}/contents/generations/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
      })
      const createText = await createRes.text()
      if (!createRes.ok) {
        console.error('[Generate Video] Ark create error:', createRes.status, createText)
        return NextResponse.json(
          { error: `视频任务创建失败：${extractError(createRes, createText)}` },
          { status: 500 }
        )
      }
      const createData = JSON.parse(createText)
      taskId = createData?.id || ''
      if (!taskId) {
        return NextResponse.json({ error: '视频任务创建成功但未返回 task_id，请稍后重试' }, { status: 500 })
      }

      const deadline = Date.now() + 180000
      let lastStatus = ''
      while (Date.now() < deadline) {
        await sleep(8000)
        const queryRes = await providerFetch(`${baseUrl}/contents/generations/tasks/${taskId}`, {
          headers: { 'Authorization': `Bearer ${apiKey}` },
        })
        const queryText = await queryRes.text()
        if (!queryRes.ok) {
          console.error('[Generate Video] Ark query error:', queryRes.status, queryText)
          return NextResponse.json(
            { error: `视频任务查询失败：${extractError(queryRes, queryText)}` },
            { status: 500 }
          )
        }
        const d = JSON.parse(queryText)
        lastStatus = d?.status || ''
        if (lastStatus === 'succeeded') {
          videoUrl = d?.content?.video_url || d?.content?.videoUrl || ''
          break
        }
        if (['failed', 'expired', 'cancelled'].includes(lastStatus)) {
          const errMsg = d?.error?.message || d?.error || `任务状态：${lastStatus}`
          return NextResponse.json({ error: `视频生成失败：${errMsg}` }, { status: 500 })
        }
      }
      if (!videoUrl) {
        return NextResponse.json(
          { error: `视频生成超时（180 秒），最后状态：${lastStatus || 'unknown'}。请稍后重试或切换更快的模型。` },
          { status: 504 }
        )
      }
    } else if (provider === 'minimax') {
      // 兼容历史配置：baseUrl 可能是根域名（https://api.minimaxi.com）或带 /v1 的旧值
      const apiRoot = baseUrl.replace(/\/v1$/, '')
      const isH3 = /MiniMax-H3|H3/i.test(model)

      if (isH3) {
        // MiniMax-H3：新版 v2 接口（多模态 content 数组）
        const payload: any = {
          model,
          content: [
            { type: 'text', text: finalPrompt },
            { type: 'image_url', image_url: { url: imageDataUrl }, role: 'first_frame' },
          ],
          duration: Math.min(15, Math.max(4, Number(duration) || 5)),
          resolution: '768P',
          // 图生视频场景下宽高比由输入图片决定，官方要求恒为 adaptive
          ratio: 'adaptive',
        }
        const createRes = await providerFetch(`${apiRoot}/v2/video_generation`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify(payload),
        })
        const createText = await createRes.text()
        if (!createRes.ok) {
          console.error('[Generate Video] MiniMax H3 create error:', createRes.status, createText)
          return NextResponse.json(
            { error: `视频任务创建失败：${extractError(createRes, createText)}` },
            { status: 500 }
          )
        }
        const createData = JSON.parse(createText)
        taskId = createData?.task_id || ''
        if (!taskId) {
          return NextResponse.json({ error: '视频任务创建成功但未返回 task_id，请稍后重试' }, { status: 500 })
        }

        const deadline = Date.now() + 180000
        let lastStatus = ''
        while (Date.now() < deadline) {
          await sleep(10000)
          const queryRes = await providerFetch(`${apiRoot}/v2/query/video_generation/${encodeURIComponent(taskId)}`, {
            headers: { 'Authorization': `Bearer ${apiKey}` },
          })
          const queryText = await queryRes.text()
          if (!queryRes.ok) {
            console.error('[Generate Video] MiniMax H3 query error:', queryRes.status, queryText)
            return NextResponse.json(
              { error: `视频任务查询失败：${extractError(queryRes, queryText)}` },
              { status: 500 }
            )
          }
          const d = JSON.parse(queryText)
          lastStatus = d?.task?.status || d?.status || ''
          if (lastStatus === 'succeeded' || /success/i.test(lastStatus)) {
            videoUrl = d?.task?.content?.url || d?.content?.url || ''
            break
          }
          if (lastStatus === 'failed' || lastStatus === 'cancelled' || d?.error?.code) {
            const errMsg = d?.error?.message
              || d?.task?.error?.message
              || d?.task?.error
              || `任务状态：${lastStatus}`
            return NextResponse.json({ error: `视频生成失败：${errMsg}` }, { status: 500 })
          }
        }
        if (!videoUrl) {
          return NextResponse.json(
            { error: `视频生成超时（180 秒），最后状态：${lastStatus || 'unknown'}。请稍后重试。` },
            { status: 504 }
          )
        }
      } else {
        // video-01 等旧版 v1 接口（异步任务 -> 轮询 -> 文件下载）
        const payload: any = {
          model,
          prompt: finalPrompt,
          first_frame_image: imageDataUrl,
          aspect_ratio: ratio === 'adaptive' ? '16:9' : ratio,
          duration: 6,
        }
        const createRes = await providerFetch(`${apiRoot}/v1/video_generation`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify(payload),
        })
        const createText = await createRes.text()
        if (!createRes.ok) {
          console.error('[Generate Video] MiniMax create error:', createRes.status, createText)
          return NextResponse.json(
            { error: `视频任务创建失败：${extractError(createRes, createText)}` },
            { status: 500 }
          )
        }
        const createData = JSON.parse(createText)
        taskId = createData?.task_id || ''
        if (!taskId) {
          return NextResponse.json({ error: '视频任务创建成功但未返回 task_id，请稍后重试' }, { status: 500 })
        }

        const deadline = Date.now() + 180000
        let fileId = ''
        let lastStatus = ''
        while (Date.now() < deadline) {
          await sleep(8000)
          const queryRes = await providerFetch(`${apiRoot}/v1/query/video_generation?task_id=${encodeURIComponent(taskId)}`, {
            headers: { 'Authorization': `Bearer ${apiKey}` },
          })
          const queryText = await queryRes.text()
          if (!queryRes.ok) {
            console.error('[Generate Video] MiniMax query error:', queryRes.status, queryText)
            return NextResponse.json(
              { error: `视频任务查询失败：${extractError(queryRes, queryText)}` },
              { status: 500 }
            )
          }
          const d = JSON.parse(queryText)
          lastStatus = d?.status || d?.base_resp?.status_msg || ''
          if (/success/i.test(lastStatus)) {
            fileId = d?.file_id || ''
            break
          }
          if (/fail/i.test(lastStatus) || d?.error?.code) {
            return NextResponse.json(
              { error: `视频生成失败：${d?.error?.message || d?.base_resp?.status_msg || lastStatus}` },
              { status: 500 }
            )
          }
        }
        if (!fileId) {
          return NextResponse.json(
            { error: `视频生成超时（180 秒），最后状态：${lastStatus || 'unknown'}。请稍后重试。` },
            { status: 504 }
          )
        }
        const fileRes = await providerFetch(`${apiRoot}/v1/files/${fileId}/content`, {
          headers: { 'Authorization': `Bearer ${apiKey}` },
        })
        if (!fileRes.ok) {
          const text = await fileRes.text().catch(() => '')
          return NextResponse.json({ error: `视频文件下载失败：${extractError(fileRes, text)}` }, { status: 500 })
        }
        const buf = Buffer.from(await fileRes.arrayBuffer())
        const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'ai')
        fs.mkdirSync(uploadDir, { recursive: true })
        const file = `video_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.mp4`
        fs.writeFileSync(path.join(uploadDir, file), buf)
        videoUrl = `/uploads/ai/${file}`
      }
    } else {
      return NextResponse.json(
        { error: `暂不支持该视频厂商：${provider}。当前支持方舟 Seedance 与 MiniMax（H3 / Video-01）。` },
        { status: 400 }
      )
    }

    if (!videoUrl) {
      return NextResponse.json({ error: '视频生成接口未返回有效结果，请稍后重试' }, { status: 500 })
    }

    let localVideo = videoUrl
    if (!videoUrl.startsWith('/uploads/')) {
      localVideo = await saveVideo(videoUrl)
    }

    return NextResponse.json({
      success: true,
      video: localVideo,
      model,
      provider,
      taskId,
      prompt: finalPrompt,
    })
  } catch (e: any) {
    console.error('[Marketing Video AI] Generate error:', e)
    return NextResponse.json(
      { error: `视频生成失败: ${e?.message || '未知错误'}` },
      { status: 500 }
    )
  }
}
