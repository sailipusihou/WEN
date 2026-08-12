import { getRepository } from '../lib/repository'
import { getEffectivePermissions } from '../lib/permissions'

const repo = getRepository()
const settings = repo.settings.get()

console.log('=== 当前 settings 中的密码信息 ===')
console.log('adminUsername:', settings.adminUsername)
console.log('adminPasswordHash:', settings.adminPasswordHash ? '[exists]' : '[empty]')
console.log('adminPasswordSalt:', settings.adminPasswordSalt ? '[exists]' : '[empty]')
console.log('adminAvatar:', settings.adminAvatar || '[empty]')
console.log()

console.log('=== 员工权限信息 ===')
const staff = repo.staff.list()
staff.forEach(s => {
  const effective = getEffectivePermissions(s.role, s.permissions)
  console.log(`- ${s.name} (${s.role}):`)
  console.log(`  自定义权限: ${s.permissions?.length || 0} 个`)
  console.log(`  有效权限: ${effective.length} 个`)
  console.log(`  有 staff_manage: ${effective.includes('staff_manage')}`)
  console.log(`  有 orders_process: ${effective.includes('orders_process')}`)
})
