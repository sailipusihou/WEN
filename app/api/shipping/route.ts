import { NextRequest, NextResponse } from 'next/server'
import { calculateShipping, getSettings } from '@/lib/settings'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const country = searchParams.get('country') || 'Other'
    const subtotal = Number(searchParams.get('subtotal') || '0')
    const result = calculateShipping(country, subtotal)
    return NextResponse.json({ ...result, countries: getSelectableCountries() })
  } catch {
    return NextResponse.json({ cost: 250, estimatedDays: '14-21', zone: null, countries: [] }, { status: 500 })
  }
}

/**
 * 供前台「运费估算」下拉框使用的国家列表。
 * 从后台各分区的 countries 汇总去重，排除兜底项 "Other"（它在分区里是通配符语义，
 * 不是真实国家名），最后补一个 "Other" 作为「其它地区」选项。
 */
function getSelectableCountries(): string[] {
  const zones = getSettings().shippingZones || []
  const set = new Set<string>()
  for (const z of zones) {
    for (const c of z.countries || []) {
      if (c && c.toLowerCase() !== 'other') set.add(c)
    }
  }
  return [...set].sort().concat('Other')
}
