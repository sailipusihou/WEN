import { getRepository } from '../lib/repository'

const repo = getRepository()

console.log('=== Before update ===')
let settings = repo.settings.get()
console.log('adminAvatar:', settings.adminAvatar)
console.log('adminUsername:', settings.adminUsername)

console.log()
console.log('=== Updating adminAvatar... ===')
const testAvatar = 'https://example.com/test-avatar.png'
const updated = repo.settings.update({ adminAvatar: testAvatar })
console.log('Updated adminAvatar:', updated.adminAvatar)

console.log()
console.log('=== Reading again... ===')
settings = repo.settings.get()
console.log('adminAvatar:', settings.adminAvatar)

console.log()
console.log('=== Updating staff permissions for first staff... ===')
const staff = repo.staff.list()
if (staff.length > 0) {
  const s = staff[0]
  console.log(`Before: ${s.name} permissions: ${JSON.stringify(s.permissions)}`)
  
  // 移除 staff_manage 权限
  const newPerms = s.permissions.filter(p => p !== 'staff_manage')
  const updatedStaff = repo.staff.update(s.id, { permissions: newPerms })
  console.log(`After: ${updatedStaff?.name} permissions: ${JSON.stringify(updatedStaff?.permissions)}`)
  
  // 再读一次确认
  const freshStaff = repo.staff.getById(s.id)
  console.log(`Fresh read: ${freshStaff?.name} permissions: ${JSON.stringify(freshStaff?.permissions)}`)
}

// 恢复测试数据
console.log()
console.log('=== Restoring original data... ===')
