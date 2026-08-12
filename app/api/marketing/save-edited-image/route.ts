// 营销图片编辑器导出接口 - 保存合成图片到本地
import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { requirePermission } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const auth = requirePermission(req, 'settings_manage')
    if ('error' in auth) return auth.error

    const body = await req.json()
    const { image } = body as { image?: string }

    if (!image || !image.startsWith('data:image/')) {
      return NextResponse.json({ error: '缺少图片数据' }, { status: 400 })
    }

    const m = /^data:image\/(png|jpe?g|webp);base64,(.+)$/i.exec(image)
    if (!m) {
      return NextResponse.json({ error: '图片格式无效' }, { status: 400 })
    }
    const buffer = Buffer.from(m[2], 'base64')
    if (buffer.length > 15 * 1024 * 1024) {
      return NextResponse.json({ error: '图片过大（上限 15MB）' }, { status: 400 })
    }

    const ext = m[1].toLowerCase() === 'jpeg' ? 'jpg' : m[1].toLowerCase()
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'ai')
    fs.mkdirSync(uploadDir, { recursive: true })
    const file = `edit_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.${ext}`
    fs.writeFileSync(path.join(uploadDir, file), buffer)

    return NextResponse.json({ success: true, url: `/uploads/ai/${file}`, file })
  } catch (e: any) {
    console.error('[Save Edited Image] error:', e)
    return NextResponse.json(
      { error: `保存失败: ${e?.message || '未知错误'}` },
      { status: 500 }
    )
  }
}
