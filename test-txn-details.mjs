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
  
  const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const endDate = new Date().toISOString().split('T')[0]
  
  const res = await fetch(`${base}/v1/reporting/transactions?start_date=${startDate}T00:00:00Z&end_date=${endDate}T23:59:59Z&fields=all&page_size=5`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    signal: AbortSignal.timeout(15000),
  })
  
  const data = await res.json()
  
  console.log('=== Transaction Details ===')
  console.log('Total items:', data.total_items)
  console.log('Total pages:', data.total_pages)
  console.log('')
  
  if (data.transaction_details && data.transaction_details.length > 0) {
    data.transaction_details.forEach((txn, i) => {
      console.log(`--- Transaction ${i + 1} ---`)
      console.log('  ID:', txn.transaction_info?.transaction_id)
      console.log('  Status:', txn.transaction_info?.transaction_status)
      console.log('  Type:', txn.transaction_info?.transaction_event_code)
      console.log('  Amount:', txn.transaction_info?.transaction_amount?.value, txn.transaction_info?.transaction_amount?.currency_code)
      console.log('  Fee:', txn.transaction_info?.fee_amount?.value)
      console.log('  Net:', txn.transaction_info?.net_amount?.value)
      console.log('  Date:', txn.transaction_info?.transaction_initiation_date)
      console.log('  Payer Email:', txn.payer_info?.email_address)
      console.log('  Payer Name:', txn.payer_info?.payer_name?.given_name, txn.payer_info?.payer_name?.surname)
      console.log('  Order ID:', txn.transaction_info?.custom_field || txn.transaction_info?.invoice_id || 'N/A')
      console.log('')
    })
  }
}

test().catch(e => console.error('Error:', e))