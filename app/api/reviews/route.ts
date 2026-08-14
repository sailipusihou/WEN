import { NextRequest, NextResponse } from 'next/server'
import { requirePermission, rateLimit, getClientIp } from '@/lib/auth'
import { getRepository } from '@/lib/repository'
import { validateString, sanitizeString } from '@/lib/validation'
import { getDb } from '@/lib/db/sqlite'

const REVIEWABLE_STATUSES = ['delivered', 'completed']

function getUserEmailFromCookie(req: NextRequest): string {
  const token = req.cookies.get('user_token')?.value
  if (!token) return ''
  try {
    const repo = getRepository()
    const user = repo.users.getByToken(token)
    return user?.email || ''
  } catch {
    return ''
  }
}

function enrichReviews(reviews: any[]) {
  const repo = getRepository()
  const orders = repo.orders.list()
  return reviews.map(rev => {
    const product = rev.productId ? repo.products.getById(rev.productId) : undefined
    const order = rev.orderId ? orders.find(o => o.id === rev.orderId || o.orderNo === rev.orderId) : undefined
    return {
      ...rev,
      product: product ? { id: product.id, name: product.name, nameEn: product.nameEn, image: product.image } : undefined,
      order: order ? { orderNo: order.orderNo || order.id, customerEmail: order.customerEmail || order.userEmail || '', customerName: order.customerName || '' } : undefined,
    }
  })
}

export async function GET(req: NextRequest) {
  try {
    const repo = getRepository()
    const productId = req.nextUrl.searchParams.get('productId')
    const source = req.nextUrl.searchParams.get('source')

    // Public: only approved, visible reviews for one product
    if (productId) {
      const all = repo.reviews.getByProduct(productId).filter(r => r.approved && !r.hidden && !r.deleted)
      if (source === 'admin') {
        return NextResponse.json(all.filter(r => r.source === 'admin'))
      }
      return NextResponse.json(
        all
      )
    }

    // Admin: all non-deleted reviews, merged with product + order info
    // 修复 S4: 全量分支必须管理权限, 防止匿名泄露客户 PII 与未审核评论
    const auth = requirePermission(req, 'reviews_manage')
    if ('error' in auth) return auth.error
    const all = repo.reviews.list().filter(r => !r.deleted)
    return NextResponse.json(enrichReviews(all))
  } catch {
    return NextResponse.json([])
  }
}

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req)
    if (!rateLimit('review_post:' + ip, 20, 60 * 1000)) {
      return NextResponse.json({ error: 'Too many reviews, please try again later' }, { status: 429 })
    }

    const body = await req.json()

    if (!body.productId) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 })
    }

    // Admin base reviews: seeded from the product form, shown as initial reviews
    if (body.source === 'admin') {
      const perm = requirePermission(req, 'reviews_manage')
      if ('error' in perm) {
        const perm2 = requirePermission(req, 'products_manage')
        if ('error' in perm2) return perm2.error
      }
      if (!body.content || !validateString(body.content, 2000)) {
        return NextResponse.json({ error: 'Please write a review (max 2000 characters)' }, { status: 400 })
      }
      if (body.author && !validateString(body.author, 50)) {
        return NextResponse.json({ error: 'Author name too long' }, { status: 400 })
      }
      if (body.location && !validateString(body.location, 100)) {
        return NextResponse.json({ error: 'Location too long' }, { status: 400 })
      }
      if (body.avatar && !validateString(body.avatar, 200)) {
        return NextResponse.json({ error: 'Avatar too long' }, { status: 400 })
      }
      if (body.date && !validateString(body.date, 50)) {
        return NextResponse.json({ error: 'Date too long' }, { status: 400 })
      }
      const rating = Number(body.rating)
      if (Number.isNaN(rating) || rating < 1 || rating > 5) {
        return NextResponse.json({ error: 'Invalid rating' }, { status: 400 })
      }
      const repo = getRepository()
      const review = repo.reviews.add({
        productId: body.productId,
        author: body.author ? sanitizeString(body.author) : 'Anonymous',
        avatar: body.avatar ? sanitizeString(body.avatar) : undefined,
        rating,
        content: sanitizeString(body.content),
        location: body.location ? sanitizeString(body.location) : 'Verified Buyer',
        date: body.date ? sanitizeString(body.date) : undefined,
        approved: true,
        source: 'admin',
      })
      return NextResponse.json({ review, verified: true }, { status: 201 })
    }

    if (body.author && !validateString(body.author, 50)) {
      return NextResponse.json({ error: 'Author name too long' }, { status: 400 })
    }

    if (!body.content || !validateString(body.content, 2000)) {
      return NextResponse.json({ error: 'Please write a review (max 2000 characters)' }, { status: 400 })
    }

    if (body.location && !validateString(body.location, 100)) {
      return NextResponse.json({ error: 'Location too long' }, { status: 400 })
    }

    const rating = Number(body.rating)
    if (Number.isNaN(rating) || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Invalid rating' }, { status: 400 })
    }

    const repo = getRepository()
    const product = repo.products.getById(body.productId)
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // Order verification: a customer who completed an order can publish instantly
    const sessionEmail = getUserEmailFromCookie(req).trim().toLowerCase()
    const providedEmail = (body.email || '').trim().toLowerCase()
    const email = sessionEmail || providedEmail
    const orderNo = (body.orderId || '').trim()

    let verified = false
    let order: any = null
    let orderId: string | undefined

    if (orderNo && email) {
      order = repo.orders.list().find(o => (o.id === orderNo || o.orderNo === orderNo) && REVIEWABLE_STATUSES.includes(o.status)) || null
      if (order) {
        const orderEmail = (order.customerEmail || order.userEmail || '').trim().toLowerCase()
        const db = getDb()
        const itemRows = db.prepare('SELECT * FROM order_items WHERE orderId = ?').all(order.id) as any[]
        const hasItem = itemRows.some(it =>
          it.productId === body.productId ||
          it.id === body.productId ||
          (product.nameEn && it.nameEn === product.nameEn)
        )
        if (hasItem && orderEmail && orderEmail === email) {
          verified = true
          orderId = order.id
        }
      }
    }

    const review = repo.reviews.add({
      productId: body.productId,
      author: verified
        ? (order.customerName || 'Verified Buyer')
        : (body.author ? sanitizeString(body.author) : 'Anonymous'),
      rating,
      content: sanitizeString(body.content),
      location: 'Verified Buyer',
      approved: verified,
      orderId: orderId,
      customerEmail: verified ? email : undefined,
    })

    return NextResponse.json({ review, verified }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 400 })
  }
}

export async function PUT(req: NextRequest) {
  const auth = requirePermission(req, 'reviews_manage')
  if ('error' in auth) {
    const auth2 = requirePermission(req, 'products_manage')
    if ('error' in auth2) return auth2.error
  }

  try {
    const body = await req.json()
    if (!body.id) {
      return NextResponse.json({ error: 'Review ID is required' }, { status: 400 })
    }

    const updates: any = {}

    if (body.approved !== undefined) {
      updates.approved = Boolean(body.approved)
    }
    if (body.hidden !== undefined) {
      updates.hidden = Boolean(body.hidden)
    }
    if (body.deleted !== undefined) {
      updates.deleted = Boolean(body.deleted)
    }
    if (body.rating !== undefined) {
      const rating = Number(body.rating)
      if (Number.isNaN(rating) || rating < 1 || rating > 5) {
        return NextResponse.json({ error: 'Invalid rating' }, { status: 400 })
      }
      updates.rating = rating
    }
    if (body.content !== undefined) {
      if (!validateString(body.content, 2000)) {
        return NextResponse.json({ error: 'Content too long' }, { status: 400 })
      }
      updates.content = sanitizeString(body.content)
    }
    if (body.author !== undefined) {
      if (!validateString(body.author, 50)) {
        return NextResponse.json({ error: 'Author name too long' }, { status: 400 })
      }
      updates.author = sanitizeString(body.author)
    }
    if (body.location !== undefined) {
      if (!validateString(body.location, 100)) {
        return NextResponse.json({ error: 'Location too long' }, { status: 400 })
      }
      updates.location = sanitizeString(body.location)
    }
    if (body.avatar !== undefined) {
      if (!validateString(body.avatar, 200)) {
        return NextResponse.json({ error: 'Avatar too long' }, { status: 400 })
      }
      updates.avatar = sanitizeString(body.avatar)
    }
    if (body.date !== undefined) {
      if (!validateString(body.date, 50)) {
        return NextResponse.json({ error: 'Date too long' }, { status: 400 })
      }
      updates.date = sanitizeString(body.date)
    }

    const repo = getRepository()
    const updated = repo.reviews.update(body.id, updates)
    if (!updated) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const all = repo.reviews.list().filter(r => !r.deleted)
    return NextResponse.json(enrichReviews(all))
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 400 })
  }
}
