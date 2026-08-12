// 供货商管理 API
import { NextRequest, NextResponse } from 'next/server'
import { getRepository } from '@/lib/repository'
import { requirePermission } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const auth = requirePermission(req, 'products_manage')
    if ('error' in auth) return auth.error

    const repo = getRepository()
    const suppliers = repo.suppliers.list()

    const { searchParams } = req.nextUrl
    const withProducts = searchParams.get('withProducts') === 'true'

    if (withProducts) {
      const products = repo.products.list()
      return NextResponse.json(suppliers.map(s => {
        const linked = products.filter((p: any) => p.supplierId === s.id)
        return {
          ...s,
          productCount: linked.length,
          products: linked.map((p: any) => ({
            id: p.id,
            name: p.name,
            image: p.image,
            price: p.price,
            costPrice: p.costPrice,
            stock: p.stock,
          })),
        }
      }))
    }

    return NextResponse.json(suppliers)
  } catch (e) {
    return NextResponse.json({ error: 'Failed to fetch suppliers' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = requirePermission(req, 'products_manage')
    if ('error' in auth) return auth.error

    const body = await req.json()
    const repo = getRepository()

    if (!body.name || body.name.trim().length === 0) {
      return NextResponse.json({ error: 'Supplier name is required' }, { status: 400 })
    }

    const supplier = repo.suppliers.add({
      name: body.name.trim(),
      contact: body.contact?.trim(),
      phone: body.phone?.trim(),
      email: body.email?.trim(),
      address: body.address?.trim(),
      region: body.region?.trim(),
      status: body.status || 'active',
      notes: body.notes?.trim(),
    })

    return NextResponse.json(supplier, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to create supplier' }, { status: 400 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = requirePermission(req, 'products_manage')
    if ('error' in auth) return auth.error

    const body = await req.json()
    const repo = getRepository()

    if (!body.id) {
      return NextResponse.json({ error: 'Supplier ID is required' }, { status: 400 })
    }

    const updates: any = {}
    if (body.name !== undefined) updates.name = body.name.trim()
    if (body.contact !== undefined) updates.contact = body.contact?.trim()
    if (body.phone !== undefined) updates.phone = body.phone?.trim()
    if (body.email !== undefined) updates.email = body.email?.trim()
    if (body.address !== undefined) updates.address = body.address?.trim()
    if (body.region !== undefined) updates.region = body.region?.trim()
    if (body.status !== undefined) updates.status = body.status
    if (body.notes !== undefined) updates.notes = body.notes?.trim()

    const updated = repo.suppliers.update(body.id, updates)
    if (!updated) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 })
    }

    return NextResponse.json(updated)
  } catch (e) {
    return NextResponse.json({ error: 'Failed to update supplier' }, { status: 400 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = requirePermission(req, 'products_manage')
    if ('error' in auth) return auth.error

    const { searchParams } = req.nextUrl
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Supplier ID is required' }, { status: 400 })
    }

    const repo = getRepository()
    const success = repo.suppliers.delete(id)
    if (!success) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to delete supplier' }, { status: 500 })
  }
}
