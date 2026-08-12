import { getRepository } from '../lib/repository'
import { authenticateMainAdmin, verifyAdminPassword } from '../lib/auth'

const repo = getRepository()
const settings = repo.settings.get()

console.log('=== 当前数据库中的密码信息 ===')
console.log('adminUsername:', settings.adminUsername)
console.log('adminPasswordHash (前30):', settings.adminPasswordHash?.substring(0, 30))
console.log('adminPasswordSalt (前30):', settings.adminPasswordSalt?.substring(0, 30))
console.log()

// 直接测试 verifyAdminPassword
console.log('=== 直接测试 verifyAdminPassword ===')
const result1 = verifyAdminPassword('admin123', settings.adminPasswordHash || '', settings.adminPasswordSalt || '')
console.log(`verifyAdminPassword("admin123"): ${result1 ? 'SUCCESS' : 'FAILED'}`)
console.log()

// 测试 authenticateMainAdmin
console.log('=== 测试 authenticateMainAdmin ===')
const result2 = authenticateMainAdmin('admin', 'admin123')
console.log(`authenticateMainAdmin("admin", "admin123"): ${result2 ? 'SUCCESS' : 'FAILED'}`)
if (result2) {
  console.log('  user:', JSON.stringify(result2, null, 2))
}
