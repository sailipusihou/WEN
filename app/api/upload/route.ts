// 修复:
// 1) 仅校验 client 提供的 file.type — 改为校验 magic bytes
// 2) 无扩展名白名单 — 增加白名单 (拒绝 .svg/.html/.exe 等 XSS/恶意文件)
// 3) 无认证 — 上传需要管理员认证 (公开前端不会上传 hero/avatar)
import { NextRequest, NextResponse } from "next/server"
import { writeFile, mkdir } from "fs/promises"
import path from "path"
import { requireAdmin } from "@/lib/auth"
import { getRepository } from "@/lib/repository"

// 允许的扩展名 (不含 .)
const ALLOWED_EXTS = new Set(["png", "jpg", "jpeg", "gif", "webp"])
// 允许的视频扩展名
const ALLOWED_VIDEO_EXTS = new Set(["mp4", "webm", "mov", "ogg", "ogv"])
// 允许的音频扩展名
const ALLOWED_AUDIO_EXTS = new Set(["mp3", "wav", "m4a", "aac", "ogg", "flac", "webm"])
// 视频最大 50MB (浏览器自动播放的背景视频建议 < 10MB)
const MAX_VIDEO_SIZE = 50 * 1024 * 1024
// 音频最大 50MB
const MAX_AUDIO_SIZE = 50 * 1024 * 1024

// 通过 magic bytes 校验真实文件类型 (不信任 client 提供的 MIME)
function detectImageType(buf: Buffer): string | null {
  if (buf.length < 4) return null
  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpeg"
  // PNG: 89 50 4E 47
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "png"
  // GIF: 47 49 46 38
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38) return "gif"
  // WebP: RIFF....WEBP
  if (
    buf.length >= 12 &&
    buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
    buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
  ) return "webp"
  return null
}

// 视频文件 magic bytes 检测 (返回标准化扩展名, 不匹配返回 null)
function detectVideoType(buf: Buffer): string | null {
  if (buf.length < 12) return null
  // MP4: ftyp box at offset 4 — "00 00 00 XX 66 74 79 70"
  if (buf[4] === 0x66 && buf[5] === 0x74 && buf[6] === 0x79 && buf[7] === 0x70) return "mp4"
  // WebM: 1A 45 DF A3
  if (buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3) return "webm"
  // MOV/QuickTime: 00 00 00 XX 6D 6F 6F 76 (或 free/mdat 等 ftyp 前的旧格式)
  if (buf[4] === 0x6d && buf[5] === 0x6f && buf[6] === 0x6f && buf[7] === 0x76) return "mov"
  if (buf[4] === 0x66 && buf[5] === 0x72 && buf[6] === 0x65 && buf[7] === 0x65) return "mov"
  if (buf[4] === 0x6d && buf[5] === 0x64 && buf[6] === 0x61 && buf[7] === 0x74) return "mov"
  // OGG: 4F 67 67 53
  if (buf[0] === 0x4f && buf[1] === 0x67 && buf[2] === 0x67 && buf[3] === 0x53) return "ogg"
  return null
}

// 音频文件 magic bytes 检测 (返回标准化扩展名, 不匹配返回 null)
function detectAudioType(buf: Buffer): string | null {
  if (buf.length < 4) return null
  // MP3: ID3 标签或 MPEG 帧同步 (FF FB / FF F3 / FF F2 / FF FA)
  if (buf[0] === 0x49 && buf[1] === 0x44 && buf[2] === 0x33) return "mp3"
  if (buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0) return "mp3"
  // WAV: RIFF....WAVE
  if (buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
      buf[8] === 0x57 && buf[9] === 0x41 && buf[10] === 0x56 && buf[11] === 0x45) return "wav"
  // M4A / MP4 容器: ftyp box at offset 4
  if (buf[4] === 0x66 && buf[5] === 0x74 && buf[6] === 0x79 && buf[7] === 0x70) {
    return "m4a"
  }
  // AAC (ADTS): FF F1 / FF F9
  if (buf[0] === 0xff && (buf[1] === 0xf1 || buf[1] === 0xf9)) return "aac"
  // OGG: OggS
  if (buf[0] === 0x4f && buf[1] === 0x67 && buf[2] === 0x67 && buf[3] === 0x53) return "ogg"
  // FLAC: fLaC
  if (buf[0] === 0x66 && buf[1] === 0x4c && buf[2] === 0x61 && buf[3] === 0x43) return "flac"
  // WebM / WebAudio (EBML): 1A 45 DF A3
  if (buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3) return "webm"
  return null
}

export async function POST(req: NextRequest) {
  // 认证: 上传需要管理员
  const auth = requireAdmin(req)
  if ('error' in auth) return auth.error

  try {
    const formData = await req.formData()
    const file = formData.get("file") as File
    if (!file) return NextResponse.json({ error: "No file" }, { status: 400 })

    const type = (formData.get("type") as string) || "general"
    const isVideoUpload = type === "video" || type === "hero-video"

    // 音频分支: 支持 mp3/wav/m4a/aac/ogg/flac，供营销页音频库与视频配音使用
    if (type === "audio") {
      if (file.size > MAX_AUDIO_SIZE) {
        return NextResponse.json({ error: "Audio too large (max 50MB)" }, { status: 400 })
      }
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)
      const detected = detectAudioType(buffer)
      if (!detected) {
        return NextResponse.json({ error: "Invalid audio file (only MP3/WAV/M4A/AAC/OGG/FLAC/WebM)" }, { status: 400 })
      }
      const fileExt = (file.name.split(".").pop() || "").toLowerCase()
      if (!ALLOWED_AUDIO_EXTS.has(fileExt)) {
        return NextResponse.json({ error: "Audio extension not allowed" }, { status: 400 })
      }
      if (detected !== fileExt) {
        return NextResponse.json({ error: "Audio extension does not match content" }, { status: 400 })
      }

      const uploadDir = path.join(process.cwd(), "public", "uploads")
      await mkdir(uploadDir, { recursive: true })
      const ts = Date.now()
      const rand = Math.random().toString(36).slice(2, 8)
      const filename = path.basename(`aud-${ts}-${rand}.${fileExt}`)
      const filepath = path.join(uploadDir, filename)
      const resolvedPath = path.resolve(filepath)
      const resolvedDir = path.resolve(uploadDir)
      if (!resolvedPath.startsWith(resolvedDir + path.sep) && resolvedPath !== resolvedDir) {
        return NextResponse.json({ error: "Invalid file path" }, { status: 400 })
      }
      await writeFile(resolvedPath, buffer)
      return NextResponse.json({ url: `/api/uploads?file=${encodeURIComponent(filename)}`, type: "audio" })
    }

    // 视频分支: 大文件上限 + 单独校验逻辑
    if (isVideoUpload) {
      if (file.size > MAX_VIDEO_SIZE) {
        return NextResponse.json({ error: "Video too large (max 50MB)" }, { status: 400 })
      }
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)
      const detected = detectVideoType(buffer)
      if (!detected) {
        return NextResponse.json({ error: "Invalid video file (only MP4/WebM/MOV/OGG)" }, { status: 400 })
      }
      const fileExt = (file.name.split(".").pop() || "").toLowerCase()
      // ogv 与 ogg 互通
      const normalizedFileExt = fileExt === "ogv" ? "ogg" : fileExt
      const normalizedDetected = detected === "ogv" ? "ogg" : detected
      if (!ALLOWED_VIDEO_EXTS.has(fileExt)) {
        return NextResponse.json({ error: "Video extension not allowed" }, { status: 400 })
      }
      if (normalizedDetected !== normalizedFileExt) {
        return NextResponse.json({ error: "Video extension does not match content" }, { status: 400 })
      }

      const uploadDir = path.join(process.cwd(), "public", "uploads")
      await mkdir(uploadDir, { recursive: true })
      const ts = Date.now()
      const rand = Math.random().toString(36).slice(2, 8)
      const filename = path.basename(`vid-${ts}-${rand}.${fileExt}`)
      const filepath = path.join(uploadDir, filename)
      const resolvedPath = path.resolve(filepath)
      const resolvedDir = path.resolve(uploadDir)
      if (!resolvedPath.startsWith(resolvedDir + path.sep) && resolvedPath !== resolvedDir) {
        return NextResponse.json({ error: "Invalid file path" }, { status: 400 })
      }
      await writeFile(resolvedPath, buffer)
      return NextResponse.json({ url: `/api/uploads?file=${encodeURIComponent(filename)}`, type: "video" })
    }

    // 图片分支 (原有逻辑)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // 校验真实文件类型 (magic bytes), 不信任 client MIME
    const detected = detectImageType(buffer)
    if (!detected) {
      return NextResponse.json({ error: "Invalid image file (only PNG/JPEG/GIF/WebP)" }, { status: 400 })
    }

    // 文件名扩展名白名单 + 与 magic bytes 一致性检查
    const fileExt = (file.name.split(".").pop() || "").toLowerCase()
    if (!ALLOWED_EXTS.has(fileExt)) {
      return NextResponse.json({ error: "File extension not allowed" }, { status: 400 })
    }
    // JPEG/JPG 互通
    const normalizedDetected = detected === "jpeg" ? "jpg" : detected
    const normalizedFileExt = fileExt === "jpeg" ? "jpg" : fileExt
    if (normalizedDetected !== normalizedFileExt) {
      return NextResponse.json({ error: "File extension does not match content" }, { status: 400 })
    }

    const uploadDir = path.join(process.cwd(), "public", "uploads")
    await mkdir(uploadDir, { recursive: true })

    const ts = Date.now()
    const rand = Math.random().toString(36).slice(2, 8)

    let filename: string
    let url: string

    if (type === "hero") {
      filename = `hero-bg.${fileExt}`
      url = `/api/uploads?file=${encodeURIComponent(filename)}`
      try {
        const repo = getRepository()
        const current = repo.settings.get()
        if (current.frontendContent?.hero) {
          current.frontendContent.hero.backgroundImage = url
          repo.settings.update({ frontendContent: current.frontendContent, heroBackgroundImage: url } as any)
        }
      } catch {}
    } else if (type === "avatar") {
      filename = `avatar-${ts}-${rand}.${fileExt}`
      url = `/api/uploads?file=${encodeURIComponent(filename)}`
    } else {
      filename = `img-${ts}-${rand}.${fileExt}`
      url = `/api/uploads?file=${encodeURIComponent(filename)}`
    }

    // 二次防护: 确保最终文件名无路径分隔符
    filename = path.basename(filename)
    const filepath = path.join(uploadDir, filename)

    // 防止路径穿越 (虽然 basename 已处理, 但兜底)
    const resolvedPath = path.resolve(filepath)
    const resolvedDir = path.resolve(uploadDir)
    if (!resolvedPath.startsWith(resolvedDir + path.sep) && resolvedPath !== resolvedDir) {
      return NextResponse.json({ error: "Invalid file path" }, { status: 400 })
    }

    await writeFile(resolvedPath, buffer)

    return NextResponse.json({ url })
  } catch (e) {
    console.error("Upload error:", e)
    return NextResponse.json({ error: "Upload failed" }, { status: 500 })
  }
}
