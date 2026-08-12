import { NextResponse } from 'next/server'
import { getRepository } from '@/lib/repository'

export async function GET() {
  try {
    const repo = getRepository()
    const settings = repo.settings.get()
    
    const dbEnabled = settings.paypalEnabled && settings.paypalClientId
    const envClientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || process.env.PAYPAL_CLIENT_ID || ''
    
    if (dbEnabled) {
      return NextResponse.json({
        enabled: settings.paypalEnabled,
        clientId: settings.paypalClientId,
        env: settings.paypalEnv || 'sandbox',
      })
    }
    
    return NextResponse.json({
      enabled: !!envClientId,
      clientId: envClientId,
      env: process.env.PAYPAL_ENV || 'sandbox',
    })
  } catch {
    return NextResponse.json({
      enabled: false,
      clientId: '',
      env: 'sandbox',
    })
  }
}