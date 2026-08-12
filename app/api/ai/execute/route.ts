import { NextRequest, NextResponse } from 'next/server'
import { getRepository } from '@/lib/repository'
import { requirePermission } from '@/lib/auth'
import { executeWriteTool, AI_WRITE_TOOLS } from '@/lib/ai-tools'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

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

    const result = await executeWriteTool(action, args || {})

    return NextResponse.json(result)
  } catch (error) {
    console.error('[AI Execute] Error:', error)
    return NextResponse.json({ error: 'Failed to execute action' }, { status: 500 })
  }
}
