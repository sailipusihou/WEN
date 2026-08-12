import { NextResponse } from 'next/server'
import { getPayoneerConfig } from '@/lib/payoneer-config'

export async function GET() {
  const config = getPayoneerConfig()
  return NextResponse.json({
    enabled: config.enabled,
    clientId: config.clientId,
    env: config.env,
  })
}