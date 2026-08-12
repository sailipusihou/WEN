import { getRepository } from '../lib/repository'
import { authenticateMainAdmin } from '../lib/auth'

const repo = getRepository()
const settings = repo.settings.get()

console.log('=== 检查管理员认证 ===')
console.log('adminUsername:', settings.adminUsername)
console.log('adminPassword:', settings.adminPassword ? '[exists]' : '[empty]')
console.log('adminPasswordHash:', settings.adminPasswordHash ? '[exists]' : '[empty]')
console.log('adminPasswordSalt:', settings.adminPasswordSalt ? '[exists]' : '[empty]')
console.log()

// 测试不同密码
const passwords = ['admin', 'admin123', 'password', 'Admin123!', 'admin1234']
passwords.forEach(pwd => {
  const result = authenticateMainAdmin('admin', pwd)
  console.log(`Password "${pwd}": ${result ? 'SUCCESS' : 'FAILED'}`)
})

console.log()
console.log('=== 尝试不同的用户名 ===')
const usernames = ['admin', 'Admin', 'ADMIN', 'administrator']
usernames.forEach(name => {
  const result = authenticateMainAdmin(name, 'admin')
  console.log(`Username "${name}": ${result ? 'SUCCESS' : 'FAILED'}`)
})
