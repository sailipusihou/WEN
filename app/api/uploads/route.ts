// 修复:
// 1) 之前支持 .svg (XSS 载体, 上传恶意 SVG 可在站点上下文执行 JS)
// 2) Access-Control-Allow-Origin: * 配合 x-robots-tag, 限制为同源或图片展示用
// 3) 新增视频扩展名支持 + Range 请求 (视频流式播放必需)
import { NextRequest, NextResponse } from "next/server"
import path from "path"
import fs from "fs"

const IMAGE_EXTS = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp"])
const VIDEO_EXTS = new Set([".mp4", ".webm", ".mov", ".ogg", ".ogv"])

const MIME: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".ogg": "video/ogg",
  ".ogv": "video/ogg",
}

export async function GET(req: NextRequest) {
  try {
    const filename = req.nextUrl.searchParams.get("file")
    if (!filename) return NextResponse.json({ error: "No file" }, { status: 400 })

    const safeName = path.basename(filename)
    const ext = path.extname(safeName).toLowerCase()
    const isImage = IMAGE_EXTS.has(ext)
    const isVideo = VIDEO_EXTS.has(ext)
    if (!isImage && !isVideo) {
      return NextResponse.json({ error: "Unsupported file type" }, { status: 400 })
    }

    const filepath = path.join(process.cwd(), "public", "uploads", safeName)

    // 路径穿越兜底
    const resolvedPath = path.resolve(filepath)
    const resolvedDir = path.resolve(process.cwd(), "public", "uploads")
    if (!resolvedPath.startsWith(resolvedDir + path.sep) && resolvedPath !== resolvedDir) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 })
    }

    if (!fs.existsSync(filepath)) {
      return NextResponse.json({ error: "File not found" }, { status: 404 })
    }

    const contentType = MIME[ext] || "application/octet-stream"

    // 视频支持 Range 请求 (拖动进度条 / 流式播放)
    if (isVideo) {
      const stat = fs.statSync(filepath)
      const fileSize = stat.size
      const range = req.headers.get("range")
      if (range) {
        // 解析 bytes=start-end
        const m = /bytes=(\d*)-(\d*)/.exec(range)
        if (m) {
          const start = m[1] ? parseInt(m[1], 10) : 0
          const end = m[2] ? parseInt(m[2], 10) : fileSize - 1
          const clampedStart = Math.max(0, Math.min(start, fileSize - 1))
          const clampedEnd = Math.max(clampedStart, Math.min(end, fileSize - 1))
          const chunkSize = clampedEnd - clampedStart + 1
          const stream = fs.createReadStream(filepath, { start: clampedStart, end: clampedEnd })
          // ReadableStream polyfill: Node stream 转 Web ReadableStream
          const webStream = new ReadableStream({
            start(controller) {
              // 修复: 客户端中断/取消请求后 controller 已关闭, 再 enqueue 会抛
              // ERR_INVALID_STATE 并成为 uncaughtException (生产模式会崩进程)
              let closed = false
              const safeEnqueue = (chunk: Uint8Array) => {
                if (closed) return
                try {
                  controller.enqueue(chunk)
                } catch {
                  closed = true
                }
              }
              const safeClose = () => {
                if (closed) return
                closed = true
                try {
                  controller.close()
                } catch {
                  /* 已关闭, 忽略 */
                }
              }
              const safeError = (e: unknown) => {
                if (closed) return
                closed = true
                try {
                  controller.error(e)
                } catch {
                  /* 已关闭, 忽略 */
                }
              }
              stream.on("data", (chunk) => {
                const buf = typeof chunk === "string" ? Buffer.from(chunk) : chunk
                safeEnqueue(new Uint8Array(buf))
              })
              stream.on("end", safeClose)
              stream.on("error", safeError)
              stream.on("close", () => { closed = true })
            },
          })
          return new NextResponse(webStream as any, {
            status: 206,
            statusText: "Partial Content",
            headers: {
              "Content-Type": contentType,
              "Content-Range": `bytes ${clampedStart}-${clampedEnd}/${fileSize}`,
              "Content-Length": String(chunkSize),
              "Accept-Ranges": "bytes",
              "Cache-Control": "public, max-age=31536000, immutable",
              "x-robots-tag": "noindex",
              "Access-Control-Allow-Origin": "null",
              "X-Content-Type-Options": "nosniff",
            },
          })
        }
      }
      // 无 Range 头: 返回整个文件
      const buffer = fs.readFileSync(filepath)
      return new NextResponse(buffer, {
        status: 200,
        statusText: "OK",
        headers: {
          "Content-Type": contentType,
          "Content-Length": String(fileSize),
          "Accept-Ranges": "bytes",
          "Cache-Control": "public, max-age=31536000, immutable",
          "x-robots-tag": "noindex",
          "Access-Control-Allow-Origin": "null",
          "X-Content-Type-Options": "nosniff",
        },
      })
    }

    // 图片分支 (原有逻辑)
    const buffer = fs.readFileSync(filepath)
    return new NextResponse(buffer, {
      status: 200,
      statusText: "OK",
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
        "x-robots-tag": "noindex",
        // 图片可被任意站点 <img> 加载 (不影响业务), 但禁止跨域读取 (无 CORS 凭证)
        "Access-Control-Allow-Origin": "null",
        "X-Content-Type-Options": "nosniff",
      },
    })
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}
