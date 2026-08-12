import { getRepository } from '../lib/repository'
import { authenticateStaff, validateAdminToken, createAdminSession, requireAdmin } from '../lib/auth'
import { getEffectivePermissions } from '../lib/permissions'
import { NextRequest } from 'next/server'

const repo = getRepository()
const staff = repo.staff.list()

console.log('=== Testing Permission Flow ===')
console.log()

staff.forEach(s => {
  console.log(`--- Staff: ${s.name} (${s.role}) ---`)
  console.log(`Raw permissions from DB: ${JSON.stringify(s.permissions)}`)
  const effective = getEffectivePermissions(s.role, s.permissions)
  console.log(`Effective permissions: ${JSON.stringify(effective)}`)
  console.log(`Has staff_manage: ${effective.includes('staff_manage')}`)
  console.log(`Has users_view: ${effective.includes('users_view')}`)
  console.log(`Has finance_view: ${effective.includes('finance_view')}`)
  console.log()
})

console.log('=== Testing authenticateStaff ===')
// 用第一个员工测试
if (staff.length > 0) {
  const s = staff[0]
  console.log(`Staff: ${s.name}, email: ${s.email}`)
  console.log('(注意: 我们不知道密码, 所以只测试权限读取)')
  console.log()
}

console.log('=== Testing main admin settings ===')
const settings = repo.settings.get()
console.log('adminUsername:', settings.adminUsername)
console.log('adminAvatar:', settings.adminAvatar)
console.log('adminEmail:', settings.adminEmail)
