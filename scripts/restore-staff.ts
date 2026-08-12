process.env.DATABASE_BACKEND = "sqlite"
import { getRepository } from "@/lib/repository"

const repo = getRepository()
console.log("Backend:", process.env.DATABASE_BACKEND || "json")

const settingsFromRepo = repo.settings.get()
console.log("Settings keys count:", Object.keys(settingsFromRepo || {}).length)
console.log("staffMembers from repo:", settingsFromRepo?.staffMembers?.length || 0)
if (settingsFromRepo?.staffMembers) {
  console.log("Staff names:", settingsFromRepo.staffMembers.map((s: any) => s.name).join(", "))
}

const fs = require("fs")
const path = require("path")
const jsonPath = path.join(process.cwd(), "data", "settings.json")
const jsonSettings = JSON.parse(fs.readFileSync(jsonPath, "utf8"))
console.log("\nJSON staffMembers count:", jsonSettings.staffMembers?.length || 0)

if (jsonSettings.staffMembers?.length && (!settingsFromRepo?.staffMembers || settingsFromRepo.staffMembers.length === 0)) {
  console.log("\nMigrating staff from JSON to SQLite...")
  repo.settings.update({ staffMembers: jsonSettings.staffMembers })
  const updated = repo.settings.get()
  console.log("After migration, staff count:", updated?.staffMembers?.length || 0)
  console.log("Staff names:", updated?.staffMembers?.map((s: any) => s.name).join(", "))
}
