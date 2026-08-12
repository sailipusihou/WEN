import Database from 'better-sqlite3'
import path from 'path'

const dbPath = path.join(process.cwd(), 'data', 'site.db')
const db = new Database(dbPath)
const row = db.prepare("SELECT value FROM settings WHERE key = 'site_settings'").get()
const settings = JSON.parse(row.value)
db.close()

const clientId = settings.paypalClientId
const clientSecret = settings.paypalClientSecret
const base = settings.paypalEnv === 'production' 
  ? 'https://api-m.paypal.com' 
  : 'https://api-m.sandbox.paypal.com'

async function getToken() {
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
  const res = await fetch(`${base}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
    signal: AbortSignal.timeout(15000),
  })
  const data = await res.json()
  return data.access_token
}

async function test() {
  const token = await getToken()
  console.log('✅ Token obtained')
  console.log('')
  
  // Test 1: Transaction Search API (Reporting)
  console.log('=== Test 1: /v1/reporting/transactions ===')
  try {
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const endDate = new Date().toISOString().split('T')[0]
    const res = await fetch(`${base}/v1/reporting/transactions?start_date=${startDate}T00:00:00Z&end_date=${endDate}T23:59:59Z&fields=all`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(15000),
    })
    console.log('Status:', res.status)
    const data = await res.json()
    if (res.ok) {
      console.log('Transactions found:', data.total_items || data.transaction_details?.length || 0)
      if (data.transaction_details?.length > 0) {
        console.log('First txn:', data.transaction_details[0].transaction_info?.transaction_id)
      }
    } else {
      console.log('Error:', data.message || data.error || data.name)
      console.log('Issue:', data.issue || data.error_description || 'unknown')
    }
  } catch (e) {
    console.log('Error:', e.message)
  }
  console.log('')
  
  // Test 2: Payments API with different params
  console.log('=== Test 2: /v1/payments/payment (different params) ===')
  try {
    const res = await fetch(`${base}/v1/payments/payment?count=20&sort_by=update_time&sort_order=desc`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(15000),
    })
    console.log('Status:', res.status)
    const data = await res.json()
    console.log('Count:', data.count || data.payments?.length || 0)
    console.log('Total count:', data.total_count || 'N/A')
  } catch (e) {
    console.log('Error:', e.message)
  }
  console.log('')
  
  // Test 3: Sales API (for completed sales)
  console.log('=== Test 3: /v1/payments/sale (sale transactions) ===')
  try {
    const res = await fetch(`${base}/v1/payments/sale?count=20`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(15000),
    })
    console.log('Status:', res.status)
    const data = await res.json()
    if (res.ok) {
      console.log('Sales found:', data.sales?.length || 0)
    } else {
      console.log('Error:', data.message || JSON.stringify(data).substring(0, 200))
    }
  } catch (e) {
    console.log('Error:', e.message)
  }
  console.log('')
  
  // Test 4: Check Orders API
  console.log('=== Test 4: /v2/checkout/orders/{id} (needs order ID) ===')
  console.log('This requires a specific order ID. We have 0 PayPal orders in DB.')
  console.log('')
  
  console.log('=== Summary ===')
  console.log('None of the list APIs are returning Checkout Orders (v2) transactions.')
  console.log('This is a known PayPal limitation - Orders API does not have a list endpoint.')
  console.log('')
  console.log('Solutions:')
  console.log('1. Use Webhooks to receive payment notifications in real-time')
  console.log('2. Use Transaction Search API (if permissions are available)')
  console.log('3. Store PayPal order ID when creating order, then sync individually')
}

test().catch(e => console.error('Error:', e))