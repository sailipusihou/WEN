'use client'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, DollarSign, ShoppingCart, Eye, ArrowUp, ArrowDown, RotateCcw, PackageCheck, BarChart2 } from 'lucide-react'

export default function AdminAnalyticsPage() {
  const [data, setData] = useState({ orders: 0, revenue: 0, products: 0, active: 0, returnsTotal: 0, refundedOrders: 0, refundTotal: 0, paypalOrders: 0, paypalRevenue: 0, paypalFees: 0 })
  const [months] = useState([...Array(6)].map((_, i) => {
    const d = new Date(); d.setMonth(d.getMonth() - 5 + i)
    return d.toLocaleDateString('en-US', { month: 'short' })
  }))

  useEffect(() => {
    Promise.all([
          fetch('/api/products').then(r => r.ok ? r.json() : []),
          fetch('/api/orders?stats=true').then(r => r.ok ? r.json() : {}),
        ]).then(async ([rawProds, orderStats]) => {
          const prods = Array.isArray(rawProds) ? rawProds : (rawProds.items || [])
          const stats = orderStats as any
          setData({
            orders: stats.total || 0,
            revenue: stats.revenue || stats.grossRevenue || 0,
            products: prods.length,
            active: prods.filter((x: any) => x.active).length,
            returnsTotal: stats.returnsTotal || 0,
            refundedOrders: stats.refunded || 0,
            refundTotal: stats.refundTotal || 0,
            paypalOrders: stats.paypalOrders || 0,
            paypalRevenue: stats.paypalRevenue || 0,
            paypalFees: stats.paypalFees || 0,
          })
        })
  }, [])

  const returnRate = data.orders > 0 ? ((data.returnsTotal / data.orders) * 100).toFixed(1) : '0.0'
  const refundRate = data.orders > 0 ? ((data.refundedOrders / data.orders) * 100).toFixed(1) : '0.0'
  const avgRefundAmount = data.refundedOrders > 0 ? (data.refundTotal / data.refundedOrders).toFixed(0) : '0'

  const stats = [
    { label: 'Total Revenue', value: `$${data.revenue.toFixed(0)}`, change: '+12.5%', up: true, icon: DollarSign },
    { label: 'Orders', value: data.orders.toString(), change: '+8.3%', up: true, icon: ShoppingCart },
    { label: 'Active Products', value: data.active.toString(), change: '+2.1%', up: true, icon: Eye },
    { label: 'Conversion Rate', value: '3.2%', change: '-0.4%', up: false, icon: TrendingUp },
  ]

  const returnStats = [
    { label: 'Return Rate', value: `${returnRate}%`, change: '+1.2%', up: false, icon: RotateCcw, color: 'text-orange-500' },
    { label: 'Refund Rate', value: `${refundRate}%`, change: '+0.8%', up: false, icon: PackageCheck, color: 'text-rose-500' },
    { label: 'Avg Refund Amount', value: `$${avgRefundAmount}`, change: '-5.3%', up: true, icon: DollarSign, color: 'text-red-500' },
    { label: 'PayPal Revenue', value: `$${data.paypalRevenue.toFixed(0)}`, change: '+15.2%', up: true, icon: BarChart2, color: 'text-blue-500' },
  ]

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--adm-text)' }}>Analytics</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--adm-text-secondary)' }}>Sales, traffic, and performance metrics</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
            className="rounded-xl p-5 adm-card-card cursor-pointer"
            style={{ backgroundColor: 'var(--adm-card)', border: '1px solid var(--adm-border)' }}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm" style={{ color: 'var(--adm-text-secondary)' }}>{s.label}</p>
              <div className="p-2 rounded-lg" style={{ backgroundColor: 'var(--adm-input)' }}>
                <s.icon size={16} style={{ color: 'var(--adm-text-secondary)' }} />
              </div>
            </div>
            <p className="text-2xl font-bold" style={{ color: 'var(--adm-text)' }}>{s.value}</p>
            <div className="flex items-center gap-1 mt-1">
              {s.up ? <ArrowUp size={14} className="text-emerald-400" /> : <ArrowDown size={14} className="text-red-400" />}
              <span className={`text-xs font-medium ${s.up ? 'text-emerald-400' : 'text-red-400'}`}>{s.change}</span>
              <span className="text-xs" style={{ color: 'var(--adm-text-secondary)' }}>vs last month</span>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {returnStats.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
            className="rounded-xl p-5 adm-card-card cursor-pointer"
            style={{ backgroundColor: 'var(--adm-card)', border: '1px solid var(--adm-border)' }}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm" style={{ color: 'var(--adm-text-secondary)' }}>{s.label}</p>
              <div className="p-2 rounded-lg" style={{ backgroundColor: 'var(--adm-input)' }}>
                <s.icon size={16} style={{ color: s.color }} />
              </div>
            </div>
            <p className="text-2xl font-bold" style={{ color: 'var(--adm-text)' }}>{s.value}</p>
            <div className="flex items-center gap-1 mt-1">
              {s.up ? <ArrowUp size={14} className="text-emerald-400" /> : <ArrowDown size={14} className="text-red-400" />}
              <span className={`text-xs font-medium ${s.up ? 'text-emerald-400' : 'text-red-400'}`}>{s.change}</span>
              <span className="text-xs" style={{ color: 'var(--adm-text-secondary)' }}>vs last month</span>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl p-5 adm-card-card cursor-pointer" style={{ backgroundColor: 'var(--adm-card)', border: '1px solid var(--adm-border)' }}>
          <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--adm-text)' }}>Revenue Trend</h2>
          <div className="flex items-end gap-2 h-40 pt-4">
            {months.map((m, i) => (
              <div key={m} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full rounded-t transition-colors cursor-pointer"
                  style={{ backgroundColor: 'rgba(99,102,241,0.3)', height: `${30 + Math.random() * 70}%` }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(99,102,241,0.5)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(99,102,241,0.3)'}
                />
                <span className="text-[10px]" style={{ color: 'var(--adm-text-secondary)' }}>{m}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl p-5 adm-card-card cursor-pointer" style={{ backgroundColor: 'var(--adm-card)', border: '1px solid var(--adm-border)' }}>
          <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--adm-text)' }}>Order Status Breakdown</h2>
          <div className="space-y-3">
            {[
              { label: 'Delivered', count: Math.floor(data.orders * 0.45), color: '#059669' },
              { label: 'Shipped', count: Math.floor(data.orders * 0.2), color: '#7C3AED' },
              { label: 'Pending', count: Math.floor(data.orders * 0.25), color: '#D97706' },
              { label: 'Cancelled', count: Math.floor(data.orders * 0.05), color: '#DC2626' },
              { label: 'Return Requested', count: Math.floor(data.orders * 0.03), color: '#F97316' },
              { label: 'Refunded', count: Math.floor(data.orders * 0.02), color: '#F43F5E' },
            ].map((s) => (
              <div key={s.label}>
                <div className="flex justify-between text-sm mb-1">
                  <span style={{ color: 'var(--adm-text-secondary)' }}>{s.label}</span>
                  <span style={{ color: 'var(--adm-text)' }}>{s.count}</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--adm-input)' }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${data.orders > 0 ? (s.count / data.orders) * 100 : 0}%`, backgroundColor: s.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl p-5 adm-card-card cursor-pointer" style={{ backgroundColor: 'var(--adm-card)', border: '1px solid var(--adm-border)' }}>
          <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--adm-text)' }}>Return & Refund Analysis</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg p-3 text-center" style={{ backgroundColor: 'rgba(249,115,22,0.1)' }}>
                <p className="text-xs" style={{ color: 'var(--adm-text-secondary)' }}>Total Returns</p>
                <p className="text-xl font-bold text-orange-500 mt-1">{data.returnsTotal}</p>
              </div>
              <div className="rounded-lg p-3 text-center" style={{ backgroundColor: 'rgba(244,63,94,0.1)' }}>
                <p className="text-xs" style={{ color: 'var(--adm-text-secondary)' }}>Refunded Orders</p>
                <p className="text-xl font-bold text-rose-500 mt-1">{data.refundedOrders}</p>
              </div>
            </div>
            <div className="rounded-lg p-3" style={{ backgroundColor: 'var(--adm-input)' }}>
              <div className="flex justify-between mb-2">
                <span className="text-xs" style={{ color: 'var(--adm-text-secondary)' }}>Total Refunded Amount</span>
                <span className="text-sm font-bold text-red-500">${data.refundTotal.toFixed(0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs" style={{ color: 'var(--adm-text-secondary)' }}>Refund % of Revenue</span>
                <span className="text-sm font-medium" style={{ color: 'var(--adm-text)' }}>
                  {data.revenue > 0 ? ((data.refundTotal / data.revenue) * 100).toFixed(1) : '0.0'}%
                </span>
              </div>
            </div>
            <div className="text-xs space-y-2" style={{ color: 'var(--adm-text-secondary)' }}>
              <p><strong style={{ color: 'var(--adm-text)' }}>Return Rate:</strong> {returnRate}% of all orders</p>
              <p><strong style={{ color: 'var(--adm-text)' }}>Approval Rate:</strong> {data.returnsTotal > 0 ? ((data.refundedOrders / data.returnsTotal) * 100).toFixed(0) : '0'}% of returns approved</p>
              <p><strong style={{ color: 'var(--adm-text)' }}>Average Refund:</strong> ${avgRefundAmount} per order</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl p-5 adm-card-card cursor-pointer" style={{ backgroundColor: 'var(--adm-card)', border: '1px solid var(--adm-border)' }}>
          <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--adm-text)' }}>Payment Method Analysis</h2>
          <div className="space-y-4">
            <div className="rounded-lg p-3" style={{ backgroundColor: 'rgba(59,130,246,0.1)' }}>
              <div className="flex justify-between mb-2">
                <span className="text-xs" style={{ color: 'var(--adm-text-secondary)' }}>PayPal Orders</span>
                <span className="text-sm font-bold text-blue-500">{data.paypalOrders}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs" style={{ color: 'var(--adm-text-secondary)' }}>PayPal Revenue</span>
                <span className="text-sm font-bold text-blue-600">${data.paypalRevenue.toFixed(0)}</span>
              </div>
            </div>
            <div className="rounded-lg p-3" style={{ backgroundColor: 'var(--adm-input)' }}>
              <div className="flex justify-between mb-2">
                <span className="text-xs" style={{ color: 'var(--adm-text-secondary)' }}>PayPal Fees</span>
                <span className="text-sm font-semibold text-amber-500">-${data.paypalFees.toFixed(0)}</span>
              </div>
              <div className="flex justify-between pt-2" style={{ borderTop: '1px solid var(--adm-border)' }}>
                <span className="text-xs font-bold" style={{ color: 'var(--adm-text)' }}>PayPal Net</span>
                <span className="text-sm font-bold text-emerald-500">${(data.paypalRevenue - data.paypalFees).toFixed(0)}</span>
              </div>
            </div>
            <div className="text-xs space-y-2" style={{ color: 'var(--adm-text-secondary)' }}>
              <p><strong style={{ color: 'var(--adm-text)' }}>PayPal Share:</strong> {data.orders > 0 ? ((data.paypalOrders / data.orders) * 100).toFixed(0) : '0'}% of orders</p>
              <p><strong style={{ color: 'var(--adm-text)' }}>Fee Rate:</strong> {data.paypalRevenue > 0 ? ((data.paypalFees / data.paypalRevenue) * 100).toFixed(1) : '0.0'}%</p>
              <p><strong style={{ color: 'var(--adm-text)' }}>Other Methods:</strong> {(data.orders - data.paypalOrders)} orders</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

