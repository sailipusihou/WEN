import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth'
import { readDmHistory, saveDmHistory, deleteDmConversation, clearDmHistory } from '@/lib/dm-history'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET — 读取私信历史
export async function GET(req: NextRequest) {
  try {
    const auth = requirePermission(req, 'messages_view')
    if ('error' in auth) return auth.error
    return NextResponse.json({ success: true, history: readDmHistory() })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// POST — 合并保存私信历史（body: { ig, x, fb }）
export async function POST(req: NextRequest) {
  try {
    const auth = requirePermission(req, 'messages_view')
    if ('error' in auth) return auth.error
    const body = await req.json()
    // 数组=覆盖，null=保留旧历史（前端失败平台传 null，避免空数据覆盖真实历史）
    const current = readDmHistory()
    saveDmHistory({
      ig: Array.isArray(body.ig) ? body.ig : current.ig,
      x: Array.isArray(body.x) ? body.x : current.x,
      fb: Array.isArray(body.fb) ? body.fb : current.fb,
    })
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// DELETE — 删除某个会话（body: { platform, conversationId }）或全部（body: { all: true }）
export async function DELETE(req: NextRequest) {
  try {
    const auth = requirePermission(req, 'messages_view')
    if ('error' in auth) return auth.error
    const body = await req.json().catch(() => ({}))
    if (body.all) {
      clearDmHistory()
      return NextResponse.json({ success: true, removed: 'all' })
    }
    const { platform, conversationId } = body
    if (!platform || !conversationId) {
      return NextResponse.json({ error: 'Missing platform or conversationId' }, { status: 400 })
    }
    const removed = deleteDmConversation(platform, conversationId)
    return NextResponse.json({ success: true, removed })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
