import * as fs from "fs"
import * as path from "path"

const DATA_DIR = path.join(process.cwd(), "data")

function readJson(file: string) {
  try {
    const p = path.join(DATA_DIR, file)
    if (!fs.existsSync(p)) return null
    return JSON.parse(fs.readFileSync(p, "utf8"))
  } catch {
    return null
  }
}

const jsonOrders = readJson("orders.json") || []
const jsonWorkLog = readJson("work-log.json") || []

process.env.DATABASE_BACKEND = "sqlite"
import { getRepository } from "@/lib/repository"
const repo = getRepository()

console.log("迁移 Orders...")
console.log("  JSON 里有:", jsonOrders.length, "个")
console.log("  SQLite 里有:", repo.orders.list().length, "个")

if (jsonOrders.length > repo.orders.list().length) {
  const existingIds = new Set(repo.orders.list().map((o: any) => o.id))
  let added = 0
  for (const order of jsonOrders) {
    if (!existingIds.has(order.id)) {
      try {
        repo.orders.add(order)
        added++
      } catch (e: any) {
        console.log("  跳过:", order.id, "-", e.message)
      }
    }
  }
  console.log("  新增了:", added, "个订单")
} else {
  console.log("  订单数量一致，无需迁移")
}

console.log("\n迁移 Work Log...")
console.log("  JSON 里有:", jsonWorkLog.length, "条")
const sqliteWorkLog = repo.workLogs?.list?.() || []
console.log("  SQLite 里有:", sqliteWorkLog.length, "条")

if (jsonWorkLog.length > sqliteWorkLog.length) {
  const existingIds = new Set(sqliteWorkLog.map((l: any) => l.id))
  let added = 0
  for (const entry of jsonWorkLog) {
    if (!existingIds.has(entry.id)) {
      try {
        repo.workLogs?.add?.(entry)
        added++
      } catch (e: any) {
        console.log("  跳过:", entry.id, "-", e.message)
      }
    }
  }
  console.log("  新增了:", added, "条日志")
} else {
  console.log("  工作日志数量一致，无需迁移")
}

console.log("\n" + "=".repeat(50))
console.log("迁移完成！")
console.log("  订单总数:", repo.orders.list().length)
console.log("  工作日志总数:", repo.workLogs?.list?.()?.length || 0)
console.log("=".repeat(50))
