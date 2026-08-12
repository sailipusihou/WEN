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

const jsonProducts = readJson("products.json")
const jsonCategories = readJson("categories.json")
const jsonOrders = readJson("orders.json")
const jsonUsers = readJson("users.json")
const jsonReviews = readJson("reviews.json")
const jsonMessages = readJson("messages.json")
const jsonSettings = readJson("settings.json")
const jsonWorkLog = readJson("work-log.json")

process.env.DATABASE_BACKEND = "sqlite"
import { getRepository } from "@/lib/repository"
const repo = getRepository()
const sqliteSettings = repo.settings.get()

console.log("=".repeat(60))
console.log("JSON vs SQLite 数据对比")
console.log("=".repeat(60))

function compare(name: string, jsonCount: number, sqliteCount: number) {
  const status = jsonCount === sqliteCount ? "✅" : (sqliteCount === 0 ? "❌" : "⚠️")
  console.log(`${status} ${name.padEnd(15)} JSON: ${jsonCount.toString().padEnd(5)} SQLite: ${sqliteCount}`)
}

compare("Products", Array.isArray(jsonProducts) ? jsonProducts.length : 0, repo.products.list().length)
compare("Categories", Array.isArray(jsonCategories) ? jsonCategories.length : 0, repo.categories.list().length)
compare("Orders", Array.isArray(jsonOrders) ? jsonOrders.length : 0, repo.orders.list().length)
compare("Users", Array.isArray(jsonUsers) ? jsonUsers.length : 0, repo.users.list().length)
compare("Reviews", Array.isArray(jsonReviews) ? jsonReviews.length : 0, repo.reviews.list().length)
compare("Messages", Array.isArray(jsonMessages) ? jsonMessages.length : 0, repo.messages.list().length)
compare("Staff", jsonSettings?.staffMembers?.length || 0, sqliteSettings?.staffMembers?.length || 0)
compare("Work Log", Array.isArray(jsonWorkLog) ? jsonWorkLog.length : 0, repo.workLogs?.list?.()?.length || 0)

console.log("\n" + "=".repeat(60))
console.log("当前后端: SQLite (DATABASE_BACKEND=sqlite)")
console.log("以后新增/修改的数据都会写入 SQLite 数据库")
console.log("=".repeat(60))
