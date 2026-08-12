// 媒体转码 API（Content Studio）
// 将浏览器端合成的 WebM（带视频效果/文字/配乐）转码为 MP4，便于各平台发布
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

export async function POST(req: NextRequest) {
  try {
    const auth = requirePermission(req, 'settings_manage')
    if ('error' in auth) return auth.error

    const ffmpeg = findFfmpeg()
    if (!ffmpeg) {
      return NextResponse.json({ error: 'FFMPEG_NOT_FOUND', message: '服务器未安装 ffmpeg' }, { status: 501 })
    }

    const body = await req.json()
    const inputPath = resolveLocalFile(String(body?.url || ''))
    if (!inputPath) {
      return NextResponse.json({ error: '源文件无效，请选择本地已上传的媒体文件' }, { status: 400 })
    }

    const outDir = path.join(UPLOAD_ROOT, 'ai')
    fs.mkdirSync(outDir, { recursive: true })
    const outFile = path.join(outDir, `transcoded_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.mp4`)

    const r = spawnSync(ffmpeg, [
      '-y', '-hide_banner', '-loglevel', 'error',
      '-i', inputPath,
      '-c:v', 'libx264', '-preset', 'veryfast', '-pix_fmt', 'yuv420p',
      '-c:a', 'aac', '-b:a', '192k',
      '-movflags', '+faststart',
      outFile,
    ], { encoding: 'utf8', timeout: 300000, windowsHide: true, maxBuffer: 32 * 1024 * 1024 })

    if (r.status !== 0 || !fs.existsSync(outFile)) {
      console.error('[Transcode Media] ffmpeg failed:', r.stderr || r.error)
      return NextResponse.json(
        { error: `转码失败：${(r.stderr || r.error?.message || 'ffmpeg error').substring(0, 300)}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      url: `/uploads/ai/${path.basename(outFile)}`,
    })
  } catch (e: any) {
    console.error('[Transcode Media] error:', e)
    return NextResponse.json({ error: `转码失败: ${e?.message || '未知错误'}` }, { status: 500 })
  }
}
