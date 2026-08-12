import { NextRequest, NextResponse } from 'next/server'
import { getRepository } from '@/lib/repository'

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') || ''
  const all = getRepository().products.listActive()
  if (!q) return NextResponse.json(all.slice(0, 50))
  const query = q.toLowerCase()
  const results = all.filter(p =>
    p.name.toLowerCase().includes(query) ||
    (p.nameEn || '').toLowerCase().includes(query) ||
    p.subtitle.toLowerCase().includes(query) ||
    (p.subtitleEn || '').toLowerCase().includes(query) ||
    p.tags.some(t => t.toLowerCase().includes(query)) ||
    (p.tagsEn || []).some(t => t.toLowerCase().includes(query)))
  return NextResponse.json(results.slice(0, 50))
}