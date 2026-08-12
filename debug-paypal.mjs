import { getRepository } from './lib/repository'

const r = getRepository()
const s = r.settings.get()
const orders = r.orders.list()
const paypalOrders = orders.filter(o => o.paymentMethod === 'paypal')

console.log('=== Debug Info ===')
console.log('PayPal Client ID:', s.paypalClientId ? s.paypalClientId.substring(0, 20) + '...' : 'NOT SET')
console.log('PayPal Secret:', s.paypalClientSecret ? s.paypalClientSecret.substring(0, 20) + '...' : 'NOT SET')
console.log('PayPal Secret length:', s.paypalClientSecret ? s.paypalClientSecret.length : 0)
console.log('PayPal Enabled:', s.paypalEnabled)
console.log('PayPal Env:', s.paypalEnv)
console.log('')
console.log('Total orders:', orders.length)
console.log('PayPal orders:', paypalOrders.length)

if (paypalOrders.length > 0) {
  console.log('')
  paypalOrders.forEach(o => {
    console.log(`Order: ${o.id}`)
    console.log(`  status: ${o.status}`)
    console.log(`  total: $${o.total}`)
    console.log(`  paypalOrderId: ${o.paypalTransaction?.orderId || 'NOT SET'}`)
    console.log(`  paypalCaptureId: ${o.paypalTransaction?.captureId || 'NOT SET'}`)
    console.log(`  paypalStatus: ${o.paypalTransaction?.status || 'NOT SET'}`)
  })
}