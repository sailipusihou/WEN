import { getRepository } from '../lib/repository'
import { calculateShipping, getShippingZoneForCountry } from '../lib/settings'

const repo = getRepository()

console.log('=== 验证修复效果 ===')
console.log()

// 测试 1: 从 repository 读取 settings
console.log('1. 测试从 repository 读取 settings:')
const settings = repo.settings.get()
console.log('   adminUsername:', settings.adminUsername)
console.log('   adminAvatar:', settings.adminAvatar || '(empty)')
console.log('   staffMembers 数量:', settings.staffMembers?.length || 0)
console.log()

// 测试 2: 员工权限读取
console.log('2. 测试员工权限读取:')
const staff = repo.staff.list()
staff.forEach(s => {
  console.log(`   - ${s.name} (${s.role}):`)
  console.log(`     permissions 数量: ${s.permissions?.length || 0}`)
  console.log(`     has staff_manage: ${s.permissions?.includes('staff_manage')}`)
})
console.log()

// 测试 3: 运费计算（从 repository 读取 shipping zones）
console.log('3. 测试运费计算 (使用 repository):')
const shipping = calculateShipping('United States', 100)
console.log('   US, $100 order:')
console.log('     cost:', shipping.cost)
console.log('     estimatedDays:', shipping.estimatedDays)
console.log('     zone:', shipping.zone?.name)
console.log()

// 测试 4: 验证保存和读取一致性
console.log('4. 测试保存和读取一致性:')
const testAvatar = '/api/uploads?file=test-avatar.png'
repo.settings.update({ adminAvatar: testAvatar })
const updatedSettings = repo.settings.get()
console.log('   保存后读取 adminAvatar:', updatedSettings.adminAvatar)
console.log('   一致:', updatedSettings.adminAvatar === testAvatar)

// 恢复
repo.settings.update({ adminAvatar: '' })
console.log()

console.log('=== 所有测试完成 ===')
