import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth'
import { readCommentHistory, saveCommentHistory, deleteComment, clearCommentHistory } from '@/lib/comment-history'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const auth = requirePermission(req, 'messages_view')
    if ('error' in auth) return auth.error
    return NextResponse.json({ success: true, history: readCommentHistory() })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = requirePermission(req, 'messages_view')
    if ('error' in auth) return auth.error
    const body = await req.json()
    // 数组=覆盖，null=保留旧历史（前端失败平台传 null，避免空数据覆盖真实历史）
    const current = readCommentHistory()
    saveCommentHistory({
      ig: Array.isArray(body.ig) ? body.ig : current.ig,
      x: Array.isArray(body.x) ? body.x : current.x,
      fb: Array.isArray(body.fb) ? body.fb : current.fb,
      pt: Array.isArray(body.pt) ? body.pt : current.pt,
    })
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = requirePermission(req, 'messages_view')
    if ('error' in auth) return auth.error
    const body = await req.json().catch(() => ({}))
    if (body.all) {
      clearCommentHistory()
      return NextResponse.json({ success: true, removed: 'all' })
    }
    const { platform, commentId } = body
    if (!platform || !commentId) {
      return NextResponse.json({ error: 'Missing platform or commentId' }, { status: 400 })
    }
    const removed = deleteComment(platform, commentId)
    return NextResponse.json({ success: true, removed })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
