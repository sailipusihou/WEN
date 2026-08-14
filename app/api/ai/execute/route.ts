import { NextRequest, NextResponse } from 'next/server'
import { getRepository } from '@/lib/repository'
import { requirePermission } from '@/lib/auth'
import { executeWriteTool, AI_WRITE_TOOLS } from '@/lib/ai-tools'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// 修复 H21: AI 写工具按业务权限键细粒度校验 (原仅凭 ai_assistant 即可改价/改库存/批量发货)
const WRITE_TOOL_PERMISSIONS: Record<string, string> = {
  update_product_stock: 'products_manage',
  update_product_price: 'products_manage',
  batch_update_stock: 'products_manage',
  batch_update_price: 'products_manage',
  update_order_status: 'orders_process',
  batch_ship_orders: 'orders_process',
  reply_to_message: 'messages_reply',
}

export async function POST(req: NextRequest) {
  const auth = requirePermission(req, 'ai_assistant')
  if ('error' in auth) return auth.error

  try {
    const body = await req.json()
    const { action, args } = body as { action: string; args: any }

    if (!action) {
      return NextResponse.json({ error: 'Action is required' }, { status: 400 })
    }

    const toolDef = AI_WRITE_TOOLS.find(t => t.name === action)
    if (!toolDef) {
      return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
    }

    // 写工具需要对应的细粒度权限
    const requiredPerm = WRITE_TOOL_PERMISSIONS[action]
    if (requiredPerm && !auth.user.permissions.includes(requiredPerm)) {
      return NextResponse.json({ error: `Forbidden: missing permission ${requiredPerm}` }, { status: 403 })
    }

    const result = await executeWriteTool(action, args || {})

    return NextResponse.json(result)
  } catch (error) {
    console.error('[AI Execute] Error:', error)
    return NextResponse.json({ error: 'Failed to execute action' }, { status: 500 })
  }
}
