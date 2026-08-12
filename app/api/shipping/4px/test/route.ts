// 4PX API 测试接口 — 验证凭证和连通性
// GET /api/shipping/4px/test?trackingNumber=xxx
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { getCarrierConfig } from '@/lib/shipping-config'
import { FourPXClient } from '@/lib/integrations/fourpx'

export async function GET(req: NextRequest) {
  try {
    const auth = requireAdmin(req)
    if ('error' in auth) return auth.error

    const { searchParams } = new URL(req.url)
    const trackingNumber = searchParams.get('trackingNumber') || '1Z8E26Y00366094077'

    const cfg = getCarrierConfig('4px')
    if (!cfg?.enabled || !cfg.credentials.appKey || !cfg.credentials.appSecret) {
      return NextResponse.json({
        error: '4PX not configured. Please set appKey and appSecret in carrier settings.',
      }, { status: 400 })
    }

    const client = new FourPXClient({
      appKey: cfg.credentials.appKey,
      appSecret: cfg.credentials.appSecret,
      accessToken: cfg.credentials.accessToken,
      sandbox: cfg.mode === 'sandbox',
    })

    const result = await client.getTracking(trackingNumber)

    return NextResponse.json({
      success: true,
      mode: cfg.mode,
      trackingNumber,
      result,
      eventCount: result?.events?.length || 0,
    })
  } catch (e: any) {
    return NextResponse.json({
      error: e.message || 'Test failed',
      stack: e.stack,
    }, { status: 500 })
  }
}
