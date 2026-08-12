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
    
    const { paypalOrderId } = await req.json()

    const authRes = await fetch(`${config.base}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(config.clientId + ':' + config.secret).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials',
      signal: AbortSignal.timeout(15000),
    })
    const auth = await authRes.json()
    const accessToken = auth.access_token

    const captureRes = await fetch(`${config.base}/v2/checkout/orders/${paypalOrderId}/capture`, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + accessToken,
        'Content-Type': 'application/json',
        'PayPal-Request-Id': 'capture-' + paypalOrderId + '-' + Date.now(),
      },
      body: JSON.stringify({}),
      signal: AbortSignal.timeout(30000),
    })
    const captureData = await captureRes.json()

    if (captureData.status === 'COMPLETED') {
      const capture = captureData.purchase_units?.[0]?.payments?.captures?.[0] || captureData
      const grossAmount = parseFloat(capture.amount?.value || '0')
      const feeAmount = parseFloat(capture.seller_receivable_breakdown?.paypal_fee?.value || '0')
      const netAmount = parseFloat(capture.seller_receivable_breakdown?.net_amount?.value || grossAmount - feeAmount)
      
      return NextResponse.json({
        status: 'COMPLETED',
        id: captureData.id,
        captureId: capture.id,
        transactionId: capture.id,
        amount: grossAmount,
        fee: feeAmount,
        netAmount: netAmount,
        currency: capture.amount?.currency_code || 'USD',
        createTime: capture.create_time || new Date().toISOString(),
        updateTime: capture.update_time || new Date().toISOString(),
        purchase_units: captureData.purchase_units,
      })
    } else {
      return NextResponse.json({ status: captureData.status, error: captureData.message || 'Capture not completed' }, { status: 400 })
    }
  } catch (e: any) {
    console.error('capture paypal error:', e)
    return NextResponse.json({ error: 'Capture failed: ' + e.message }, { status: 500 })
  }
}
