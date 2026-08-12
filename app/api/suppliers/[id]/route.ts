// 单个供货商 API
import { NextRequest, NextResponse } from 'next/server'
import { getRepository } from '@/lib/repository'
import { requirePermission } from '@/lib/auth'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = requirePermission(req, 'products_manage')
    if ('error' in auth) return auth.error

    const { id } = await params
    const repo = getRepository()
    const supplier = repo.suppliers.getById(id)

    if (!supplier) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 })
    }

    const products = repo.products.list()
    const supplierProducts = products.filter((p: any) => p.supplierId === id)

    return NextResponse.json({
      ...supplier,
      products: supplierProducts,
      productCount: supplierProducts.length,
    })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to fetch supplier' }, { status: 500 })
  }
}
