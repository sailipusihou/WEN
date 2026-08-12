import { getRepository } from '../lib/repository'

const repo = getRepository()

// 恢复 adminAvatar 为空
repo.settings.update({ adminAvatar: '' })

// 恢复第一个员工的 staff_manage 权限
const staff = repo.staff.list()
if (staff.length > 0) {
  const s = staff[0]
  if (!s.permissions.includes('staff_manage')) {
    const newPerms = [...s.permissions, 'staff_manage']
    repo.staff.update(s.id, { permissions: newPerms })
    console.log(`Restored staff_manage permission for ${s.name}`)
  }
}

console.log('Data restored.')
const settings = repo.settings.get()
console.log('adminAvatar:', settings.adminAvatar)
const freshStaff = repo.staff.list()
freshStaff.forEach(s => {
  console.log(`${s.name}: has staff_manage = ${s.permissions.includes('staff_manage')}`)
})
