import { NextRequest, NextResponse } from 'next/server'
import { getRepository } from '@/lib/repository'
import { requirePermission } from '@/lib/auth'

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const auth = requirePermission(req, 'categories_manage')
  if ('error' in auth) return auth.error
  
  const { slug } = await params
  try {
    const repo = getRepository()
    repo.categories.delete(slug)
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Delete failed' }, { status: 400 })
  }
}
