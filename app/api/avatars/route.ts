import { NextRequest, NextResponse } from "next/server"
import fs from "fs"
import path from "path"
import { requireAdmin } from "@/lib/auth"

const AVATAR_DIR = path.join(process.cwd(), "public", "avatars")
const MAX_AVATAR_BYTES = 5 * 1024 * 1024   // 与 /api/upload 的图片上限保持一致

/** 按文件头判断真实图片类型；不依赖客户端文件名 */
function detectImageType(buf: Buffer): "png" | "jpg" | "webp" | null {
  if (buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "png"
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpg"
  if (
    buf.length >= 12 &&
    buf.toString("ascii", 0, 4) === "RIFF" &&
    buf.toString("ascii", 8, 12) === "WEBP"
  ) return "webp"
  return null
}

/** 头像文件名必须是服务端生成的 avatar-xxxx 形式 */
const AVATAR_NAME_RE = /^avatar-[a-z0-9]+$/i

export async function GET() {
  try {
    if (!fs.existsSync(AVATAR_DIR)) fs.mkdirSync(AVATAR_DIR, { recursive: true })
    const files = fs.readdirSync(AVATAR_DIR).filter(f => /\.(png|jpg|jpeg|webp)$/i.test(f))
    return NextResponse.json(files.map(f => ({ name: f.replace(/\.\w+$/, ""), url: "/avatars/" + f })))
  } catch { return NextResponse.json({ error: "Failed" }, { status: 500 }) }
}

export async function POST(req: NextRequest) {
  // 上传头像需管理员权限
  const auth = await requireAdmin(req)
  if ('error' in auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const formData = await req.formData()
    const file = formData.get("file") as File
    if (!file) return NextResponse.json({ error: "No file" }, { status: 400 })

    // 修复 S2: 旧代码只看 file.name 的扩展名就落盘，没有大小上限、没有内容校验，
    // 任意内容都能写进公开静态目录（且单次请求可写满磁盘）。
    if (file.size > MAX_AVATAR_BYTES) {
      return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 400 })
    }
    const buffer = Buffer.from(await file.arrayBuffer())

    // 以文件头为准判断类型，扩展名由服务端按真实类型决定
    const detected = detectImageType(buffer)
    if (!detected) {
      return NextResponse.json({ error: "Invalid image file" }, { status: 400 })
    }
    const ext = detected

    const filename = "avatar-" + Date.now().toString(36) + "." + ext
    if (!fs.existsSync(AVATAR_DIR)) fs.mkdirSync(AVATAR_DIR, { recursive: true })
    fs.writeFileSync(path.join(AVATAR_DIR, filename), buffer)
    return NextResponse.json({ url: "/avatars/" + filename }, { status: 201 })
  } catch { return NextResponse.json({ error: "Upload failed" }, { status: 500 }) }
}

export async function DELETE(req: NextRequest) {
  // 删除头像需管理员权限
  const auth = await requireAdmin(req)
  if ('error' in auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { name } = await req.json()
    if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 })

    // 修复 S1: 旧代码用 startsWith 前缀匹配删除，传入 name=".png" 时
    // name.replace(/\.[^.]+$/, "") 得到空串，startsWith("") 对所有文件名成立
    // → 一次请求清空整个头像目录；传 "avatar-1" 还会误删 avatar-10 / avatar-100。
    // 现在改为：严格校验名字格式 + 精确相等匹配。
    const base = String(name).trim().replace(/\.[^.]+$/, "")
    if (!AVATAR_NAME_RE.test(base)) {
      return NextResponse.json({ error: "Invalid avatar name" }, { status: 400 })
    }

    const targets = fs.readdirSync(AVATAR_DIR).filter(
      (f) => f.replace(/\.[^.]+$/, "") === base
    )
    if (targets.length === 0) {
      return NextResponse.json({ error: "Avatar not found" }, { status: 404 })
    }

    for (const f of targets) {
      // basename + 前缀校验，防止任何形式的路径穿越
      const safe = path.basename(f)
      const fp = path.resolve(AVATAR_DIR, safe)
      if (!fp.startsWith(path.resolve(AVATAR_DIR) + path.sep)) continue
      if (fs.existsSync(fp)) fs.unlinkSync(fp)
    }
    // 一次请求最多删除这一个名字对应的文件（同名不同扩展名）
    return NextResponse.json({ success: true, deleted: targets.length })
  } catch { return NextResponse.json({ error: "Delete failed" }, { status: 500 }) }
}