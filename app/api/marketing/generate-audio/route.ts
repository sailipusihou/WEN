// AI 音频生成 API（Content Studio）
// - music：MiniMax Music 系列，输入风格/情绪/场景提示词，生成纯音乐 MP3
// - speech：MiniMax Speech 系列（t2a_v2），输入文案，生成配音 MP3
// 生成的音频保存到本地 public/uploads/ai/ 并返回本地 URL
import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { ProxyAgent } from 'undici'
import { requirePermission } from '@/lib/auth'
import { getRepository } from '@/lib/repository'
import { resolveAudioConfig } from '@/lib/ai-config'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const PROXY_URL = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || ''
let proxyAgent: ProxyAgent | undefined
if (PROXY_URL) {
  proxyAgent = new ProxyAgent(PROXY_URL)
}

function isNetworkError(e: any): boolean {
  const code = e?.cause?.code || e?.code || ''
  return !!e && (code === 'EACCES' || code === 'ECONNREFUSED' || code === 'ECONNRESET' || code === 'ETIMEDOUT' || code === 'UND_ERR_SOCKET' || e?.name === 'TypeError' || e?.name === 'AbortError')
}

async function providerFetch(url: string, init: RequestInit = {}, timeoutMs = 120000): Promise<Response> {
  const withTimeout = { ...init, signal: AbortSignal.timeout(timeoutMs) }
  try {
    return await fetch(url, withTimeout)
  } catch (e: any) {
    if (!isNetworkError(e) || !proxyAgent) throw e
    console.log(`[Generate Audio] direct fetch failed (${e?.cause?.code || e?.name}), retry via proxy: ${url.split('/').slice(0, 3).join('/')}/...`)
    return await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs), dispatcher: proxyAgent } as RequestInit)
  }
}

function extractError(res: Response, text: string): string {
  try {
    const d = JSON.parse(text)
    return d?.base_resp?.status_msg
      || d?.error?.message
      || d?.error
      || d?.message
      || text.substring(0, 300)
  } catch {
    return text ? text.substring(0, 300) : `HTTP ${res.status}`
  }
}

async function saveAudio(buf: Buffer, ext = 'mp3'): Promise<string> {
  const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'ai')
  fs.mkdirSync(uploadDir, { recursive: true })
  const file = `audio_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.${ext}`
  fs.writeFileSync(path.join(uploadDir, file), buf)
  return `/uploads/ai/${file}`
}

async function downloadAudio(url: string): Promise<Buffer> {
  let buf: Buffer | null = null
  let lastErr: any = null
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await providerFetch(url, {}, 60000)
      if (!res.ok) throw new Error(`音频下载失败 (${res.status})`)
      buf = Buffer.from(await res.arrayBuffer())
      break
    } catch (e: any) {
      lastErr = e
      await new Promise(r => setTimeout(r, 1500 * attempt))
    }
  }
  if (!buf) throw new Error(lastErr?.message || '音频下载失败，请稍后重试')
  return buf
}

export async function POST(req: NextRequest) {
  try {
    const auth = requirePermission(req, 'settings_manage')
    if ('error' in auth) return auth.error

    const body = await req.json()
    const {
      prompt = '',
      type = 'music',
      voiceId = '',
      model: modelOverride,
      provider: providerOverride,
    } = body

    const text = String(prompt).trim()
    if (!text) {
      return NextResponse.json({ error: '请输入音频提示词（音乐风格描述或配音文案）' }, { status: 400 })
    }

    const repo = getRepository()
    const settings = repo.settings.get()
    const cfg = resolveAudioConfig(settings, { provider: providerOverride, model: modelOverride })
    if (!cfg.apiKey) {
      return NextResponse.json(
        { error: '音频生成 AI 未配置 API Key。请在 设置 → AI Assistant → 音频生成 AI 填写，或先配置 MiniMax 视频/图片 Key。' },
        { status: 400 }
      )
    }
    if (cfg.provider !== 'minimax') {
      return NextResponse.json({ error: `暂不支持该音频厂商：${cfg.provider}。当前支持 MiniMax。` }, { status: 400 })
    }

    let audioUrl = ''
    let usedModel = cfg.model

    if (/music/i.test(usedModel) || type === 'music') {
      usedModel = /music/i.test(usedModel) ? usedModel : 'music-3.0-free'
      const payload: any = {
        model: usedModel,
        prompt: text,
        is_instrumental: true,
        stream: false,
        output_format: 'url',
        audio_setting: { format: 'mp3', sample_rate: 44100, bitrate: 128000 },
      }
      // 音乐生成为同步长任务（免费模型实测约 1-3 分钟），使用较长超时
      const res = await providerFetch(`${cfg.baseUrl}/v1/music_generation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${cfg.apiKey}`,
        },
        body: JSON.stringify(payload),
      }, 420000)
      const textBody = await res.text()
      if (!res.ok) {
        console.error('[Generate Audio] MiniMax music error:', res.status, textBody)
        return NextResponse.json({ error: `音乐生成失败：${extractError(res, textBody)}` }, { status: 500 })
      }
      const d = JSON.parse(textBody)
      if (d?.base_resp?.status_code !== 0) {
        return NextResponse.json(
          { error: `音乐生成失败：${d?.base_resp?.status_msg || d?.base_resp?.status_code || '未知错误'}` },
          { status: 500 }
        )
      }
      if (d?.data?.status === 1) {
        return NextResponse.json({ error: '音乐仍在生成中，请稍后重试一次' }, { status: 202 })
      }
      audioUrl = d?.data?.audio || ''
    } else {
      usedModel = /speech/i.test(usedModel) ? usedModel : 'speech-02-hd'
      const payload: any = {
        model: usedModel,
        text,
        stream: false,
        output_format: 'url',
        voice_setting: {
          voice_id: voiceId || 'male-qn-qingse',
          speed: 1,
          vol: 1,
        },
        audio_setting: { format: 'mp3', sample_rate: 44100, bitrate: 128000, channel: 2 },
      }
      const res = await providerFetch(`${cfg.baseUrl}/v1/t2a_v2`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${cfg.apiKey}`,
        },
        body: JSON.stringify(payload),
      })
      const textBody = await res.text()
      if (!res.ok) {
        console.error('[Generate Audio] MiniMax speech error:', res.status, textBody)
        return NextResponse.json({ error: `配音生成失败：${extractError(res, textBody)}` }, { status: 500 })
      }
      const d = JSON.parse(textBody)
      if (d?.base_resp?.status_code !== 0) {
        return NextResponse.json(
          { error: `配音生成失败：${d?.base_resp?.status_msg || d?.base_resp?.status_code || '未知错误'}` },
          { status: 500 }
        )
      }
      audioUrl = d?.data?.audio || ''
      // 部分账号未开通配音权限时会返回极短的空音频，提前拦截
      const audioLenMs = Number(d?.extra_info?.audio_length || 0)
      if (audioLenMs > 0 && audioLenMs < 300) {
        return NextResponse.json(
          { error: '配音接口返回空音频（可能未开通 MiniMax Speech 权限），请检查账号权限或改用背景音乐' },
          { status: 400 }
        )
      }
    }

    if (!audioUrl) {
      return NextResponse.json({ error: '音频生成接口未返回有效结果，请稍后重试' }, { status: 500 })
    }

    const buf = await downloadAudio(audioUrl)
    const localUrl = await saveAudio(buf, 'mp3')

    return NextResponse.json({
      success: true,
      url: localUrl,
      kind: type === 'music' ? 'music' : 'speech',
      model: usedModel,
      provider: cfg.provider,
    })
  } catch (e: any) {
    console.error('[Marketing Audio AI] Generate error:', e)
    return NextResponse.json(
      { error: `音频生成失败: ${e?.message || '未知错误'}` },
      { status: 500 }
    )
  }
}
