// 物流商列表 API
import { NextRequest, NextResponse } from 'next/server'
import { PRESET_CARRIERS } from '@/lib/shipping'

export async function GET(req: NextRequest) {
  return NextResponse.json(PRESET_CARRIERS)
}
