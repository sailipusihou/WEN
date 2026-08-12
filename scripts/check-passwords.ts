import { getRepository } from '../lib/repository'

const repo = getRepository()
const settings = repo.settings.get()

console.log('=== Admin Settings ===')
console.log('adminUsername:', settings.adminUsername)
console.log('adminPassword (plain):', settings.adminPassword ? '[REDACTED - exists]' : '[empty]')
console.log('adminPasswordHash:', settings.adminPasswordHash ? '[exists]' : '[empty]')
console.log('adminPasswordSalt:', settings.adminPasswordSalt ? '[exists]' : '[empty]')
console.log()
console.log('=== Staff Members ===')
const staff = repo.staff.list()
staff.forEach(s => {
  console.log(`- ${s.name} (${s.email})`)
  console.log(`  role: ${s.role}`)
  console.log(`  active: ${s.active}`)
  console.log(`  password: ${s.password ? '[exists]' : '[empty]'}`)
  console.log(`  passwordHash: ${s.passwordHash ? '[exists]' : '[empty]'}`)
  console.log(`  salt: ${s.salt ? '[exists]' : '[empty]'}`)
  console.log()
})
