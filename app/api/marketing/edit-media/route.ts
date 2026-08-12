// 视频 & 音频编辑 API（Content Studio）
// 基于 ffmpeg：视频裁剪 + 附加/替换音频轨道（裁剪、延迟、音量）并输出 MP4
// 若服务器未安装 ffmpeg，返回 501（前端自动降级为浏览器端 WebM 合成）
import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { spawnSync } from 'child_process'
import { requirePermission } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const UPLOAD_ROOT = path.join(process.cwd(), 'public', 'uploads')

function findFfmpeg(): string | null {
  if (process.env.FFMPEG_PATH && fs.existsSync(process.env.FFMPEG_PATH)) {
    return process.env.FFMPEG_PATH
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('ffmpeg-static')
    const bin = typeof mod === 'string' ? mod : (mod?.default || '')
    if (bin && fs.existsSync(bin)) return bin
  } catch {}
  try {
    const r = spawnSync('ffmpeg', ['-version'], { encoding: 'utf8', timeout: 5000, windowsHide: true })
    if (r.status === 0 && /ffmpeg version/i.test(r.stdout || '')) return 'ffmpeg'
  } catch {}
  return null
}

function resolveLocalFile(url: string): string | null {
  if (!url || !url.startsWith('/')) return null
  let rel = ''
  if (url.startsWith('/uploads/')) {
    rel = url.replace(/^\//, '')
  } else if (url.startsWith('/api/uploads?file=')) {
    try {
      const q = new URL(url, 'http://localhost').searchParams
      rel = path.join('uploads', q.get('file') || '')
    } catch {
      return null
    }
  } else {
    return null
  }
  const resolved = path.resolve(UPLOAD_ROOT, rel.replace(/^uploads[\\/]/, ''))
  const rootResolved = path.resolve(UPLOAD_ROOT)
  if (resolved !== rootResolved && !resolved.startsWith(rootResolved + path.sep)) return null
  return fs.existsSync(resolved) ? resolved : null
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v))
}

export async function POST(req: NextRequest) {
  try {
    const auth = requirePermission(req, 'settings_manage')
    if ('error' in auth) return auth.error

    const ffmpeg = findFfmpeg()
    if (!ffmpeg) {
      return NextResponse.json(
        { error: 'FFMPEG_NOT_FOUND', message: '服务器未安装 ffmpeg，已自动降级为浏览器端合成（WebM 格式）' },
        { status: 501 }
      )
    }

    const body = await req.json()
    const {
      videoUrl,
      audioUrl = '',
      videoStart = 0,
      videoEnd = 0,
      audioStart = 0,
      audioEnd = 0,
      audioDelayMs = 0,
      volume = 1,
    } = body

    const videoPath = resolveLocalFile(String(videoUrl || ''))
    if (!videoPath) {
      return NextResponse.json({ error: '视频文件无效，请选择本地已生成的视频' }, { status: 400 })
    }

    const hasAudio = !!String(audioUrl || '')
    const audioPath = hasAudio ? resolveLocalFile(String(audioUrl)) : null
    if (hasAudio && !audioPath) {
      return NextResponse.json({ error: '音频文件无效，请从音频库选择' }, { status: 400 })
    }

    const vs = clamp(Number(videoStart) || 0, 0, 600)
    const ve = clamp(Number(videoEnd) || 0, 0, 600)
    const dur = ve - vs
    if (dur <= 0.1) {
      return NextResponse.json({ error: '请设置有效的视频起止时间（结束需大于开始）' }, { status: 400 })
    }
    const as = clamp(Number(audioStart) || 0, 0, 600)
    const ae = clamp(Number(audioEnd) || 0, 0, 600)
    const delayMs = clamp(Number(audioDelayMs) || 0, 0, 60000)
    const vol = clamp(Number(volume) || 1, 0.05, 3)

    const outDir = path.join(UPLOAD_ROOT, 'ai')
    fs.mkdirSync(outDir, { recursive: true })
    const outFile = path.join(outDir, `edited_video_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.mp4`)

    const args = ['-y', '-hide_banner', '-loglevel', 'error']

    if (!hasAudio) {
      // 仅裁剪视频（保留原声，重新编码保证时间轴准确）
      args.push('-ss', String(vs), '-to', String(ve), '-i', videoPath)
      args.push(
        '-map', '0:v:0',
        '-map', '0:a?',
        '-c:v', 'libx264', '-preset', 'veryfast', '-pix_fmt', 'yuv420p',
        '-c:a', 'aac', '-b:a', '192k',
        '-movflags', '+faststart',
        outFile
      )
    } else {
      args.push('-i', videoPath, '-i', audioPath!)
      const vf = dur > 0
        ? `[0:v]trim=start=${vs}:end=${ve},setpts=PTS-STARTPTS[v]`
        : '[0:v]null[v]'
      let af = '[1:a]'
      if (ae > as + 0.05) {
        af += `atrim=start=${as}:end=${ae},asetpts=PTS-STARTPTS,`
      }
      af += `volume=${vol},adelay=${delayMs}:all=1[a]`
      args.push(
        '-filter_complex', `${vf};${af}`,
        '-map', '[v]', '-map', '[a]',
        '-c:v', 'libx264', '-preset', 'veryfast', '-pix_fmt', 'yuv420p',
        '-c:a', 'aac', '-b:a', '192k',
        '-t', String(dur),
        '-movflags', '+faststart',
        outFile
      )
    }

    const r = spawnSync(ffmpeg, args, { encoding: 'utf8', timeout: 300000, windowsHide: true, maxBuffer: 32 * 1024 * 1024 })
    if (r.status !== 0 || !fs.existsSync(outFile)) {
      console.error('[Edit Media] ffmpeg failed:', r.stderr || r.error)
      return NextResponse.json(
        { error: `视频合成失败：${(r.stderr || r.error?.message || 'ffmpeg error').substring(0, 300)}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      url: `/uploads/ai/${path.basename(outFile)}`,
      duration: Number(dur.toFixed(2)),
    })
  } catch (e: any) {
    console.error('[Edit Media] error:', e)
    return NextResponse.json({ error: `视频合成失败: ${e?.message || '未知错误'}` }, { status: 500 })
  }
}
