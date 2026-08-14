import { NextRequest, NextResponse } from 'next/server'
import { getRepository } from '@/lib/repository'
import { requirePermission } from '@/lib/auth'
import { ReturnInfo } from '@/lib/orders'

function escapeCsv(value: any): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return '"' + str.replace(/"/g, '""') + '"'
  }
  return str
}

export async function GET(req: NextRequest) {
  // 修复: 导出全量客户 PII 需 finance_view (原 requireAdmin 连 order_processor 都可导出)
  const auth = requirePermission(req, 'finance_view')
  if ('error' in auth) return auth.error

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const search = searchParams.get('search') || searchParams.get('q')
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')
  const assignedTo = searchParams.get('assignedTo')
  const paymentMethod = searchParams.get('paymentMethod')
  const customerEmail = searchParams.get('customerEmail')

  const repo = getRepository()
  let orders = repo.orders.list()

  if (status && status !== 'all') {
    orders = orders.filter(o => o.status === status)
  }

  if (search) {
    const q = search.toLowerCase().trim()
    orders = orders.filter(o =>
      (o.id || '').toLowerCase().includes(q) ||
      (o.customerName || '').toLowerCase().includes(q) ||
      (o.customerEmail || '').toLowerCase().includes(q) ||
      (o.userEmail || '').toLowerCase().includes(q)
    )
  }

  if (startDate) {
    const start = new Date(startDate + 'T00:00:00Z').getTime()
    orders = orders.filter(o => new Date(o.createdAt || 0).getTime() >= start)
  }
  if (endDate) {
    const end = new Date(endDate + 'T23:59:59Z').getTime()
    orders = orders.filter(o => new Date(o.createdAt || 0).getTime() <= end)
  }

  if (assignedTo) {
    if (assignedTo === 'unassigned') {
      orders = orders.filter(o => !o.assignedTo)
    } else {
      orders = orders.filter(o => o.assignedTo === assignedTo)
    }
  }

  if (paymentMethod) {
    if (paymentMethod === 'paypal') {
      orders = orders.filter(o => o.paymentMethod === 'paypal' || o.paypalTransaction)
    } else if (paymentMethod === 'other') {
      orders = orders.filter(o => o.paymentMethod !== 'paypal' && !o.paypalTransaction)
    }
  }

  if (customerEmail) {
    const ce = customerEmail.toLowerCase().trim()
    orders = orders.filter(o =>
      (o.customerEmail || '').toLowerCase() === ce ||
      (o.userEmail || '').toLowerCase() === ce ||
      (o.shipping?.email || '').toLowerCase() === ce
    )
  }

  orders = [...orders].sort((a, b) =>
    new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
  )

  const headers = [
    'Order ID',
    'Status',
    'Customer Name',
    'Customer Email',
    'Customer Phone',
    'Shipping First Name',
    'Shipping Last Name',
    'Shipping Email',
    'Shipping Phone',
    'Shipping Address',
    'City',
    'State',
    'Zip Code',
    'Country',
    'Items Count',
    'Items Summary',
    'Subtotal',
    'Shipping Cost',
    'Total',
    'Currency',
    'Payment Method',
    'PayPal Transaction ID',
    'PayPal Capture ID',
    'PayPal Order ID',
    'PayPal Amount',
    'PayPal Fee',
    'PayPal Net Amount',
    'PayPal Status',
    'PayPal Settlement Status',
    'Created At',
    'Assigned To ID',
    'Assigned To Name',
    'Tracking Carrier',
    'Tracking Number',
    'Tracking URL',
    'Estimated Delivery',
    'Actual Delivery',
    'Estimated Delivery Days',
    'Notes',
    'Return Reason',
    'Return Status',
    'Return Requested At',
    'Return Approved At',
    'Return Tracking Carrier',
    'Return Tracking Number',
    'Return Delivered At',
    'Refund Amount',
    'Refunded At',
    'Status History',
  ]

  const rows = orders.map(order => {
    const items = order.items || []
    const itemsSummary = items.map((i: any) => `${i.nameEn || i.name} x${i.quantity} ($${((i.price || 0) * (i.quantity || 1)).toFixed(2)})`).join('; ')
    const history = (order.statusHistory || []).map((h: any) => `${h.status}@${h.timestamp}${h.note ? ':' + h.note : ''}`).join('; ')
    const ret = order.returnInfo as ReturnInfo || { reason: '', requestedAt: '', approvedAt: '', carrier: '', trackingNumber: '', deliveredAt: '', refundAmount: 0, refundedAt: '' }

    return [
      order.id,
      order.status,
      order.customerName || order.shipping?.firstName + ' ' + (order.shipping?.lastName || ''),
      order.customerEmail || order.shipping?.email || order.userEmail || '',
      order.shipping?.phone || '',
      order.shipping?.firstName || '',
      order.shipping?.lastName || '',
      order.shipping?.email || '',
      order.shipping?.phone || '',
      order.shipping?.address || '',
      order.shipping?.city || '',
      order.shipping?.state || '',
      order.shipping?.zipCode || '',
      order.shipping?.country || '',
      items.length,
      itemsSummary,
      order.subtotal || 0,
      order.shippingCost || 0,
      order.total || 0,
      order.currency || 'USD',
      order.paymentMethod || (order.paypalTransaction ? 'paypal' : 'other'),
      order.paypalTransaction?.transactionId || '',
      order.paypalTransaction?.captureId || '',
      order.paypalTransaction?.orderId || '',
      order.paypalTransaction?.amount ?? '',
      order.paypalTransaction?.fee ?? '',
      order.paypalTransaction?.netAmount ?? '',
      order.paypalTransaction?.status || '',
      order.paypalTransaction?.settlementStatus || '',
      order.createdAt,
      order.assignedTo || '',
      order.assignedToName || '',
      order.tracking?.carrier || '',
      order.tracking?.trackingNumber || '',
      order.tracking?.url || '',
      order.tracking?.estimatedDelivery || '',
      order.tracking?.actualDelivery || '',
      order.estimatedDeliveryDays || '',
      order.notes || '',
      ret.reason || '',
      order.status?.startsWith('return') || order.status === 'refunded' ? order.status : '',
      ret.requestedAt || '',
      ret.approvedAt || '',
      ret.carrier || '',
      ret.trackingNumber || '',
      ret.deliveredAt || '',
      ret.refundAmount ?? '',
      ret.refundedAt || '',
      history,
    ].map(escapeCsv).join(',')
  })

  const csvContent = [headers.join(','), ...rows].join('\n')
  const BOM = '\uFEFF'

  return new NextResponse(BOM + csvContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="orders-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
}
