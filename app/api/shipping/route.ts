import { NextRequest, NextResponse } from 'next/server'
import { calculateShipping } from '@/lib/settings'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const country = searchParams.get('country') || 'Other'
    const subtotal = Number(searchParams.get('subtotal') || '0')
    const result = calculateShipping(country, subtotal)
    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ cost: 250, estimatedDays: '14-21', zone: null }, { status: 500 })
  }
}
