import { getRepository } from '../lib/repository'
import { verifyAdminPassword, hashAdminPassword } from '../lib/auth'
import fs from 'fs'
import path from 'path'

const repo = getRepository()
const settings = repo.settings.get()

console.log('=== SQLite 中的密码信息 ===')
console.log('adminUsername:', settings.adminUsername)
console.log('adminPasswordHash (前50字符):', settings.adminPasswordHash?.substring(0, 50))
console.log('adminPasswordSalt (前50字符):', settings.adminPasswordSalt?.substring(0, 50))
console.log('adminPasswordHash 长度:', settings.adminPasswordHash?.length)
console.log('adminPasswordSalt 长度:', settings.adminPasswordSalt?.length)
console.log()

// 检查 JSON 文件中的密码
const jsonFile = path.join(process.cwd(), 'data', 'settings.json')
if (fs.existsSync(jsonFile)) {
  const raw = fs.readFileSync(jsonFile, 'utf-8').replace(/^\uFEFF/, '').trim()
  const jsonSettings = JSON.parse(raw)
  console.log('=== JSON 文件中的密码信息 ===')
  console.log('adminUsername:', jsonSettings.adminUsername)
  console.log('adminPassword:', jsonSettings.adminPassword ? `[exists: ${jsonSettings.adminPassword.substring(0, 3)}...]` : '[empty]')
  console.log('adminPasswordHash:', jsonSettings.adminPasswordHash ? '[exists]' : '[empty]')
  console.log('adminPasswordSalt:', jsonSettings.adminPasswordSalt ? '[exists]' : '[empty]')
  
  // 如果 JSON 中有明文密码，测试一下
  if (jsonSettings.adminPassword) {
    console.log()
    console.log('=== 测试 JSON 中的明文密码 ===')
    const result = verifyAdminPassword(jsonSettings.adminPassword, settings.adminPasswordHash || '', settings.adminPasswordSalt || '')
    console.log(`验证结果: ${result ? 'SUCCESS' : 'FAILED'}`)
  }
} else {
  console.log('JSON settings file not found:', jsonFile)
}
