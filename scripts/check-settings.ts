import { getRepository } from '../lib/repository'

const repo = getRepository()
const settings = repo.settings.get()

console.log('=== Current Settings from DB ===')
console.log('adminUsername:', settings.adminUsername)
console.log('adminEmail:', settings.adminEmail)
console.log('adminAvatar:', settings.adminAvatar)
console.log('adminPhone:', settings.adminPhone)
console.log('adminBio:', settings.adminBio)
console.log()
console.log('=== Staff Members ===')
const staff = repo.staff.list()
staff.forEach(s => {
  console.log(`- ${s.name} (${s.email})`)
  console.log(`  role: ${s.role}`)
  console.log(`  active: ${s.active}`)
  console.log(`  avatar: ${s.avatar}`)
  console.log(`  permissions: ${JSON.stringify(s.permissions)}`)
  console.log()
})
