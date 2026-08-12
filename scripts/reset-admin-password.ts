import { getRepository } from '../lib/repository'
import { hashAdminPassword } from '../lib/auth'
import fs from 'fs'
import path from 'path'

const repo = getRepository()
const sqliteSettings = repo.settings.get()

// 读取 JSON 文件中的设置
const jsonFile = path.join(process.cwd(), 'data', 'settings.json')
const raw = fs.readFileSync(jsonFile, 'utf-8').replace(/^\uFEFF/, '').trim()
const jsonSettings = JSON.parse(raw)

console.log('=== 比较 SQLite 和 JSON 中的密码哈希 ===')
console.log('SQLite adminPasswordHash:', sqliteSettings.adminPasswordHash?.substring(0, 30) + '...')
console.log('JSON   adminPasswordHash:', jsonSettings.adminPasswordHash?.substring(0, 30) + '...')
console.log('两者相同:', sqliteSettings.adminPasswordHash === jsonSettings.adminPasswordHash)
console.log()
console.log('SQLite adminPasswordSalt:', sqliteSettings.adminPasswordSalt?.substring(0, 30) + '...')
console.log('JSON   adminPasswordSalt:', jsonSettings.adminPasswordSalt?.substring(0, 30) + '...')
console.log('两者相同:', sqliteSettings.adminPasswordSalt === jsonSettings.adminPasswordSalt)
console.log()

// 重置密码为 admin123
console.log('=== 重置管理员密码为 admin123 ===')
const { hash, salt } = hashAdminPassword('admin123')
repo.settings.update({
  adminPassword: '',
  adminPasswordHash: hash,
  adminPasswordSalt: salt,
} as any)

// 验证重置后的密码
const updatedSettings = repo.settings.get()
console.log('重置后 adminPasswordHash:', updatedSettings.adminPasswordHash?.substring(0, 30) + '...')
console.log('重置后 adminPasswordSalt:', updatedSettings.adminPasswordSalt?.substring(0, 30) + '...')
console.log()
console.log('密码已重置为 admin123，请尝试登录。')
