import { NextRequest, NextResponse } from "next/server"
import { getRepository } from "@/lib/repository"
import { requirePermission } from "@/lib/auth"

export async function GET(req: NextRequest) {
  const auth = requirePermission(req, 'users_view')
  if ('error' in auth) return auth.error

  const repo = getRepository()
  const email = req.nextUrl.searchParams.get('email')
  const sync = req.nextUrl.searchParams.get('sync')

  try {
    // 修复 M19: 读取操作不再隐式写库 — 仅当显式传 sync=true 时同步订单数据
    if (sync === 'true') {
      repo.customers.syncFromOrders()
    }
  } catch (e) {
    console.error('syncFromOrders error:', e)
  }
  
  if (email) {
    const customer = repo.customers.getByEmail(email)
    if (!customer) return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    return NextResponse.json(customer)
  }
  
  const customers = repo.customers.list()
  return NextResponse.json(customers)
}

export async function POST(req: NextRequest) {
  const auth = requirePermission(req, 'users_edit')
  if ('error' in auth) return auth.error

  try {
    const body = await req.json()
    const repo = getRepository()
    
    const customer = repo.customers.add({
      email: body.email || '',
      firstName: body.firstName || '',
      lastName: body.lastName || '',
      phone: body.phone || '',
      avatar: body.avatar || undefined,
      rating: body.rating || 0,
      tier: body.tier || 'standard',
      notes: body.notes || '',
      preferences: body.preferences || [],
      tags: body.tags || [],
      totalOrders: body.totalOrders || 0,
      totalSpent: body.totalSpent || 0,
      lastOrderAt: body.lastOrderAt || '',
    })
    
    return NextResponse.json(customer, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create customer' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  const auth = requirePermission(req, 'users_edit')
  if ('error' in auth) return auth.error

  try {
    const body = await req.json()
    const repo = getRepository()
    
    const customer = repo.customers.update(body.id, {
      firstName: body.firstName,
      lastName: body.lastName,
      phone: body.phone,
      avatar: body.avatar,
      rating: body.rating,
      tier: body.tier,
      notes: body.notes,
      preferences: body.preferences,
      tags: body.tags,
      totalOrders: body.totalOrders,
      totalSpent: body.totalSpent,
      lastOrderAt: body.lastOrderAt,
    })
    
    if (!customer) return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    return NextResponse.json(customer)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update customer' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const auth = requirePermission(req, 'users_delete')
  if ('error' in auth) return auth.error

  try {
    const id = req.nextUrl.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })
    
    const repo = getRepository()
    const customer = repo.customers.getById(id)
    if (!customer) return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    
    return NextResponse.json({ message: 'Customer deleted' })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete customer' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const auth = requirePermission(req, 'users_edit')
  if ('error' in auth) return auth.error

  try {
    const action = req.nextUrl.searchParams.get('action')
    let body: any = {}
    try { body = await req.json() } catch (e) {}
    const repo = getRepository()
    
    if (action === 'syncOrders' || body.action === 'syncOrders') {
      repo.customers.syncFromOrders()
      return NextResponse.json({ message: 'Customers synced from orders' })
    }
    
    if (action === 'upsertByEmail' || body.action === 'upsertByEmail') {
      const customer = repo.customers.upsertByEmail(body.email, body.updates)
      return NextResponse.json(customer)
    }
    
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('PATCH error:', error)
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 })
  }
}
