import { NextRequest, NextResponse } from 'next/server'
import { getRepository } from '@/lib/repository'

function getPayPalConfig() {
  try {
    const repo = getRepository()
    const settings = repo.settings.get()
    
    const dbEnabled = settings.paypalEnabled && settings.paypalClientId && settings.paypalClientSecret
    const envClientId = process.env.PAYPAL_CLIENT_ID || ''
    const envSecret = process.env.PAYPAL_CLIENT_SECRET || ''
    const envEnv = process.env.PAYPAL_ENV || 'sandbox'
    
    if (dbEnabled) {
      return {
        clientId: settings.paypalClientId,
        secret: settings.paypalClientSecret,
        env: settings.paypalEnv || 'sandbox',
        base: settings.paypalEnv === 'production'
          ? 'https://api-m.paypal.com'
          : 'https://api-m.sandbox.paypal.com',
      }
    }
    
    return {
      clientId: envClientId,
      secret: envSecret,
      env: envEnv,
      base: envEnv === 'production'
        ? 'https://api-m.paypal.com'
        : 'https://api-m.sandbox.paypal.com',
    }
  } catch {
    const envClientId = process.env.PAYPAL_CLIENT_ID || ''
    const envSecret = process.env.PAYPAL_CLIENT_SECRET || ''
    const envEnv = process.env.PAYPAL_ENV || 'sandbox'
    return {
      clientId: envClientId,
      secret: envSecret,
      env: envEnv,
      base: envEnv === 'production'
        ? 'https://api-m.paypal.com'
        : 'https://api-m.sandbox.paypal.com',
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    const config = getPayPalConfig()
    if (!config.clientId || !config.secret) {
      return NextResponse.json({ error: 'PayPal not configured' }, { status: 500 })
    }
    
    const { amount } = await req.json()
    
    const res = await fetch(`${config.base}/v1/oauth2/token`, {
      method: 'POST',
      headers: { 
        'Authorization': 'Basic ' + Buffer.from(config.clientId + ':' + config.secret).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded' 
      },
      body: 'grant_type=client_credentials',
      signal: AbortSignal.timeout(15000),
    })
    const token = await res.json()

    const orderRes = await fetch(`${config.base}/v2/checkout/orders`, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token.access_token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ intent: 'CAPTURE', purchase_units: [{ amount: { currency_code: 'USD', value: amount.toString() } }] }),
      signal: AbortSignal.timeout(30000),
    })
    const order = await orderRes.json()
    return NextResponse.json({ id: order.id })
  } catch { return NextResponse.json({ error: 'Failed' }, { status: 500 }) }
}
