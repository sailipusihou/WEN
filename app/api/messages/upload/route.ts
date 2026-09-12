// 客户聊天附件上传 (前台 /messages 页面使用)
//
// 背景: 之前前台聊天调用的是 /api/upload, 而该路由要求管理员权限,
// 普通客户上传附件一律 401 —— 功能等于完全不可用。
// 这里单独开一个面向「已登录客户(或管理员)」的受限上传入口:
//   1) 仅允许图片 (png/jpg/gif/webp) 与 PDF / TXT —— 统一按 magic bytes 判断,
//      不信任客户端文件名; 因而无法上传 .html/.svg/.js 等在站点同源下可执行的载体。
//   2) 单文件 5MB 上限 (与前端提示一致)
//   3) 文件名由服务端生成 (chat-xxxx.ext), 扩展名以真实内容为准
//   4) 按 IP 限频, 防止被当成免费图床滥用
import { NextRequest, NextResponse } from "next/server"
import { writeFile, mkdir } from "fs/promises"
import path from "path"
import { requireAdmin, requireUser, rateLimit, getClientIp } from "@/lib/auth"

const MAX_BYTES = 5 * 1024 * 1024
const ALLOWED_EXTS = new Set(["png", "jpg", "jpeg", "gif", "webp", "pdf", "txt"])

type Detected = "png" | "jpg" | "gif" | "webp" | "pdf" | "txt" | null

function detectType(buf: Buffer): Detected {
  if (buf.length < 4) return null
  // PNG: 89 50 4E 47
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "png"
  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpg"
  // GIF: 47 49 46 38
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38) return "gif"
  // WebP: RIFF....WEBP
  if (
    buf.length >= 12 &&
    buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
    buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
  ) return "webp"
  // PDF: %PDF
  if (buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46) return "pdf"
  // TXT: 无文件头, 用「合法 UTF-8 且不含 NUL / 控制字符」判定
  if (isPlainText(buf)) return "txt"
  return null
}

function isPlainText(buf: Buffer): boolean {
  if (buf.length === 0) return false
  if (buf.includes(0x00)) return false
  // 控制字符 (除 \t \n \r) 视为二进制
  for (const b of buf) {
    if (b < 0x09) return false
    if (b > 0x0d && b < 0x20) return false
  }
  try {
    new TextDecoder("utf-8", { fatal: true }).decode(buf)
    return true
  } catch {
    return false
  }
}

export async function POST(req: NextRequest) {
  // 鉴权: 已登录客户 或 管理员 (管理员在后台聊天里也会走这里)
  const userAuth = requireUser(req)
  const adminAuth = requireAdmin(req)
  if ("error" in userAuth && "error" in adminAuth) {
    return NextResponse.json({ error: "Please sign in to send attachments" }, { status: 401 })
  }

  try {
    const ip = getClientIp(req)
    if (!rateLimit("chat_upload:" + ip, 30, 10 * 60 * 1000)) {
      return NextResponse.json({ error: "Too many uploads, please try again later" }, { status: 429 })
    }

    const formData = await req.formData()
    const file = formData.get("file") as File | null
    if (!file) return NextResponse.json({ error: "No file" }, { status: 400 })

    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const detected = detectType(buffer)
    if (!detected) {
      return NextResponse.json(
        { error: "Unsupported file. Please send an image (PNG/JPG/GIF/WebP), PDF or TXT." },
        { status: 400 }
      )
    }

    // 客户端扩展名仅作参考: 允许 jpeg/jpg 互换, 其余必须与真实内容一致
    const rawExt = (file.name.split(".").pop() || "").toLowerCase()
    if (!ALLOWED_EXTS.has(rawExt)) {
      return NextResponse.json({ error: "File extension not allowed" }, { status: 400 })
    }
    const normalizedName = rawExt === "jpeg" ? "jpg" : rawExt
    if (normalizedName !== detected) {
      return NextResponse.json({ error: "File extension does not match content" }, { status: 400 })
    }

    const uploadDir = path.join(process.cwd(), "public", "uploads")
    await mkdir(uploadDir, { recursive: true })

    const ext = detected === "jpg" ? "jpg" : detected
    const filename = path.basename(
      `chat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
    )
    const resolvedDir = path.resolve(uploadDir)
    const resolvedPath = path.resolve(path.join(uploadDir, filename))
    if (!resolvedPath.startsWith(resolvedDir + path.sep)) {
      return NextResponse.json({ error: "Invalid file path" }, { status: 400 })
    }

    await writeFile(resolvedPath, buffer)

    const isImage = ["png", "jpg", "gif", "webp"].includes(ext)
    return NextResponse.json({
      url: `/api/uploads?file=${encodeURIComponent(filename)}`,
      kind: isImage ? "image" : "file",
      name: path.basename(file.name || filename).slice(0, 120),
    }, { status: 201 })
  } catch (e) {
    console.error("[messages/upload] failed:", e)
    return NextResponse.json({ error: "Upload failed" }, { status: 500 })
  }
}
