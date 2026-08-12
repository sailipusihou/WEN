import fs from "fs"
import path from "path"
import { getCachedData, invalidateCache, CACHE_TTL } from "@/lib/cache"

export interface WorkLogEntry {
  id: string
  timestamp: string
  operatorId: string
  operatorName: string
  operatorRole: string
  action: string
  details: string
  orderId?: string
  productId?: string
  category?: string
}

const DATA_DIR = path.join(process.cwd(), "data")
const FILE = path.join(DATA_DIR, "work-log.json")

function ensureFile(): void {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
  if (!fs.existsSync(FILE)) fs.writeFileSync(FILE, "[]", "utf-8")
}

function stripBOM(s: string): string {
  return s.replace(/^\uFEFF/, "").trim()
}

export function getAllLogs(): WorkLogEntry[] {
  ensureFile()
  return getCachedData('work-log', FILE, () => {
    const raw = stripBOM(fs.readFileSync(FILE, "utf-8"))
    try { return JSON.parse(raw) } catch { return [] }
  }, CACHE_TTL.messages)
}

export function addLog(entry: Omit<WorkLogEntry, "id" | "timestamp">): WorkLogEntry {
  const all = getAllLogs()
  const log: WorkLogEntry = {
    id: "WL-" + Date.now().toString(36).toUpperCase() + "-" + Math.random().toString(36).slice(2, 6).toUpperCase(),
    timestamp: new Date().toISOString(),
    ...entry,
  }
  all.unshift(log)
  const trimmed = all.slice(0, 1000)
  fs.writeFileSync(FILE, JSON.stringify(trimmed, null, 2), "utf-8")
  invalidateCache('work-log')
  return log
}

export function getLogsByOperator(operatorId: string): WorkLogEntry[] {
  return getAllLogs().filter(l => l.operatorId === operatorId)
}

export function getLogsByOrder(orderId: string): WorkLogEntry[] {
  return getAllLogs().filter(l => l.orderId === orderId)
}

export function getLogStats() {
  const all = getAllLogs()
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
  return {
    total: all.length,
    operators: Array.from(operators.entries()).map(([id, data]) => ({ id, ...data })),
    actions: Array.from(actionCounts.entries()).map(([action, count]) => ({ action, count })),
  }
}
