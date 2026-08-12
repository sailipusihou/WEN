import { NextRequest, NextResponse } from "next/server"
import { getRepository } from "@/lib/repository"
import { requirePermission } from "@/lib/auth"

export async function GET(req: NextRequest) {
  const auth = requirePermission(req, 'worklog_view')
  if ('error' in auth) return auth.error

  const { searchParams } = new URL(req.url)
  const stats = searchParams.get("stats")
  const operator = searchParams.get("operator")
  const orderId = searchParams.get("orderId")
  const action = searchParams.get("action")

  const repo = getRepository()

  if (stats === "true") {
    const all = repo.workLogs.list()
    const operators = new Map<string, { name: string; count: number; role: string }>()
    all.forEach(l => {
      const key = l.operatorId
      if (!operators.has(key)) operators.set(key, { name: l.operatorName, count: 0, role: l.operatorRole })
      operators.get(key)!.count++
    })
    const actionCounts = new Map<string, number>()
    all.forEach(l => {
      actionCounts.set(l.action, (actionCounts.get(l.action) || 0) + 1)
    })
    return NextResponse.json({
      total: all.length,
      operators: Array.from(operators.entries()).map(([id, data]) => ({ id, ...data })),
      actions: Array.from(actionCounts.entries()).map(([action, count]) => ({ action, count })),
    })
  }

  let logs = repo.workLogs.list()

  if (operator) logs = logs.filter(l => l.operatorId === operator || l.operatorName === operator)
  if (orderId) logs = logs.filter(l => l.orderId === orderId)
  if (action) logs = logs.filter(l => l.action === action)

  return NextResponse.json(logs)
}

export async function POST(req: NextRequest) {
  const auth = requirePermission(req, 'worklog_view')
  if ('error' in auth) return auth.error

  try {
    const body = await req.json()
    const repo = getRepository()
    const entry = repo.workLogs.add(body)
    return NextResponse.json(entry, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Failed to log entry" }, { status: 400 })
  }
}
