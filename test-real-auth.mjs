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

console.log('=== PayPal Auth Test ===')
console.log('Client ID (first 20):', clientId.substring(0, 20))
console.log('Secret (first 10):', clientSecret.substring(0, 10))
console.log('Base URL:', base)
console.log('')

const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

async function test() {
  try {
    const res = await fetch(`${base}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
      signal: AbortSignal.timeout(15000),
    })
    
    console.log('Status:', res.status)
    const data = await res.json()
    
    if (res.ok) {
      console.log('✅ Token obtained!')
      console.log('App ID:', data.app_id)
      console.log('Scope:', data.scope?.substring(0, 150))
      
      // Try Payments API
      console.log('')
      console.log('=== Payments API Test ===')
      const payRes = await fetch(`${base}/v1/payments/payment?count=5&sort_by=create_time&sort_order=desc`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${data.access_token}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(15000),
      })
      console.log('Status:', payRes.status)
      const payData = await payRes.json()
      if (payRes.ok) {
        console.log('Payments found:', payData.payments?.length || 0)
        if (payData.payments?.length > 0) {
          console.log('First payment:', payData.payments[0].id, payData.payments[0].state)
        }
      } else {
        console.log('Error:', JSON.stringify(payData).substring(0, 300))
      }
    } else {
      console.log('❌ Auth failed!')
      console.log('Error:', data.error)
      console.log('Description:', data.error_description)
      console.log('')
      console.log('Possible causes:')
      console.log('1. Wrong Client ID or Secret')
      console.log('2. Wrong environment (sandbox vs production)')
      console.log('3. App is disabled in PayPal Developer')
    }
  } catch (e) {
    console.log('Error:', e.message)
  }
}

test()