import { NextRequest, NextResponse } from "next/server"
import fs from "fs"
import path from "path"
import { requireAdmin } from "@/lib/auth"

const AVATAR_DIR = path.join(process.cwd(), "public", "avatars")

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
    const ext = file.name.split(".").pop()?.toLowerCase() || "png"
    // 修复 H6: 移除 svg (同源静态路径下的存储型 XSS 载体), 仅允许光栅图片
    if (!["png","jpg","jpeg","webp"].includes(ext)) return NextResponse.json({ error: "Invalid format" }, { status: 400 })
    const buffer = Buffer.from(await file.arrayBuffer())
    const filename = "avatar-" + Date.now().toString(36) + "." + ext
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
    fs.readdirSync(AVATAR_DIR).filter(f => f.startsWith(name.replace(/\.[^.]+$/, ""))).forEach(f => {
      const fp = path.join(AVATAR_DIR, f)
      if (fs.existsSync(fp)) fs.unlinkSync(fp)
    })
    return NextResponse.json({ success: true })
  } catch { return NextResponse.json({ error: "Delete failed" }, { status: 500 }) }
}