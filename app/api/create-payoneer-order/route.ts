import { NextRequest, NextResponse } from 'next/server'
import { getPayoneerConfig, getPayoneerAccessToken } from '@/lib/payoneer-config'

export async function POST(req: NextRequest) {
  try {
    const config = getPayoneerConfig()
    if (!config.clientId || !config.secret) {
      return NextResponse.json({ error: 'Payoneer not configured' }, { status: 500 })
    }
    
    const { amount, orderId, customerEmail } = await req.json()
    
    const accessToken = await getPayoneerAccessToken()
    if (!accessToken) {
      return NextResponse.json({ error: 'Failed to get Payoneer access token' }, { status: 500 })
    }

    const orderRes = await fetch(`${config.base}/v1/orders`, {
      method: 'POST',
      headers: { 
        'Authorization': 'Bearer ' + accessToken, 
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: {
          currency_code: 'USD',
          value: amount.toString(),
        },
        merchant_reference_id: orderId,
        payer: {
          email: customerEmail,
        },
        description: `Order ${orderId} payment`,
      }),
      signal: AbortSignal.timeout(30000),
    })
    
    const order = await orderRes.json()
    
    if (order.id) {
      return NextResponse.json({ 
        id: order.id, 
        redirectUrl: order.approval_url || order.redirect_url || '',
      })
    }
    
    return NextResponse.json({ error: order.message || 'Failed to create Payoneer order' }, { status: 500 })
  } catch (e) {
    console.error('Create Payoneer order error:', e)
    return NextResponse.json({ error: 'Failed to create Payoneer order' }, { status: 500 })
  }
}