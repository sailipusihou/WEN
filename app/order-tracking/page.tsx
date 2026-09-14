'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Package, ArrowLeft, Search, Loader2 } from 'lucide-react'

export default function OrderTrackingPage() {
  const [orderId, setOrderId] = useState('')
  const [email, setEmail] = useState('')
  const [order, setOrder] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searched, setSearched] = useState(false)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!orderId.trim()) {
      setError('Please enter your order ID')
      return
    }
    
    setLoading(true)
    setError('')
    setOrder(null)
    setSearched(true)
    
    try {
      let url = `/api/orders/tracking/${orderId.trim()}`
      if (email.trim()) {
        url += `?email=${encodeURIComponent(email.trim())}`
      }
      
      const res = await fetch(url)
      const data = await res.json()
      
      if (!res.ok) {
        setError(data.error || 'Order not found')
      } else {
        setOrder(data)
      }
    } catch {
      setError('Failed to look up order. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const statusLabels: Record<string, string> = {
    pending: 'Pending',
    confirmed: 'Confirmed',
    processing: 'Processing',
    shipped: 'Shipped',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
    return_requested: 'Return Requested',
    return_approved: 'Return Approved',
    return_shipped: 'Return Shipped',
    return_delivered: 'Return Delivered',
    refunded: 'Refunded',
  }

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700',
    confirmed: 'bg-blue-100 text-blue-700',
    processing: 'bg-indigo-100 text-indigo-700',
    shipped: 'bg-purple-100 text-purple-700',
    delivered: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
    return_requested: 'bg-orange-100 text-orange-700',
    return_approved: 'bg-amber-100 text-amber-700',
    return_shipped: 'bg-cyan-100 text-cyan-700',
    return_delivered: 'bg-teal-100 text-teal-700',
    refunded: 'bg-rose-100 text-rose-700',
  }

  return (
    <div className="bg-[#F1E9DC] min-h-screen">
      <div className="max-w-3xl mx-auto px-6 sm:px-8 py-12 md:py-16">
        <Link href="/" className="inline-flex items-center gap-1 font-sans text-xs text-[#57503F]/50 hover:text-[#221E1A] transition-colors mb-8 tracking-wider uppercase">
          <ArrowLeft size={12} strokeWidth={1.5} /> Back to Home
        </Link>

        <div className="text-center mb-10">
          <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-[#DDCEB4]/50 flex items-center justify-center">
            <Package size={28} strokeWidth={1} className="text-[#57503F]/40" />
          </div>
          <h1 className="font-en text-3xl md:text-4xl text-[#221E1A] font-semibold tracking-tight mb-2">Track Your Order</h1>
          <p className="font-sans text-sm text-[#57503F]/60 max-w-md mx-auto">
            Enter your order ID to check the status and details of your purchase.
          </p>
        </div>

        <form onSubmit={handleSearch} className="bg-white/80 border border-[#DDCEB4]/50 p-6 md:p-8 mb-8">
          <div className="space-y-4">
            <div>
              <label className="font-sans text-[10px] text-[#A07C34] tracking-[0.15em] uppercase font-medium block mb-2">
                Order ID *
              </label>
              <input
                type="text"
                value={orderId}
                onChange={e => setOrderId(e.target.value)}
                placeholder="e.g. OTM-MRU9Z7RU-PCD9"
                className="w-full px-4 py-3 border border-[#E5DED1] rounded-sm bg-white text-sm font-sans focus:outline-none focus:border-[#A07C34]/50 transition-colors"
              />
            </div>
            <div>
              <label className="font-sans text-[10px] text-[#A07C34] tracking-[0.15em] uppercase font-medium block mb-2">
                Email (optional, for verification)
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full px-4 py-3 border border-[#E5DED1] rounded-sm bg-white text-sm font-sans focus:outline-none focus:border-[#A07C34]/50 transition-colors"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#221E1A] text-white text-xs tracking-[0.08em] uppercase font-sans font-medium hover:bg-[#1A1A1A] disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search size={14} />
                  Track Order
                </>
              )}
            </button>
          </div>
        </form>

        {error && searched && (
          <div className="bg-red-50 border border-red-100 p-4 text-center">
            <p className="font-sans text-sm text-red-600">{error}</p>
            <p className="font-sans text-xs text-red-400 mt-1">
              Please check your order ID and try again.
            </p>
          </div>
        )}

        {order && (
          <div className="space-y-6">
            <div className="bg-white/80 border border-[#DDCEB4]/50 p-6 md:p-8">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <p className="font-sans text-[10px] text-[#57503F]/40 tracking-[0.15em] uppercase mb-1">Order</p>
                  <h2 className="font-en text-xl font-semibold text-[#221E1A]">#{order.id}</h2>
                </div>
                <span className={`font-sans text-[10px] px-3 py-1 rounded-full ${statusColors[order.status] || 'bg-gray-100 text-gray-700'}`}>
                  {statusLabels[order.status] || order.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6 text-sm font-sans">
                <div>
                  <p className="text-[#57503F]/40 text-[10px] uppercase tracking-wider mb-1">Date</p>
                  <p className="text-[#221E1A]">{new Date(order.createdAt).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-[#57503F]/40 text-[10px] uppercase tracking-wider mb-1">Total</p>
                  <p className="text-[#221E1A] font-medium">${order.total?.toFixed(2)}</p>
                </div>
              </div>

              {order.items && order.items.length > 0 && (
                <div className="border-t border-[#DDCEB4]/50 pt-5">
                  <p className="font-sans text-[10px] text-[#57503F]/40 tracking-[0.15em] uppercase mb-3">Items ({order.items.length})</p>
                  <div className="space-y-3">
                    {order.items.map((item: any, idx: number) => (
                      <div key={idx} className="flex items-center gap-3">
                        {item.image && (
                          <img src={item.image} alt={item.name} className="w-12 h-12 object-cover rounded-sm" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-sans text-sm text-[#221E1A] truncate">
                            {item.nameEn || item.name}
                          </p>
                          <p className="font-sans text-xs text-[#57503F]/50">
                            Qty: {item.quantity}
                          </p>
                        </div>
                        <p className="font-sans text-sm font-medium text-[#221E1A]">
                          ${(item.price * item.quantity).toFixed(2)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {order.shipping && (
                <div className="border-t border-[#DDCEB4]/50 pt-5 mt-5">
                  <p className="font-sans text-[10px] text-[#57503F]/40 tracking-[0.15em] uppercase mb-3">Shipping Address</p>
                  <p className="font-sans text-sm text-[#221E1A]">
                    {order.shipping.firstName} {order.shipping.lastName}
                  </p>
                  <p className="font-sans text-sm text-[#57503F]/70">
                    {order.shipping.address}
                    {order.shipping.city && `, ${order.shipping.city}`}
                    {order.shipping.state && `, ${order.shipping.state}`}
                    {order.shipping.zipCode && ` ${order.shipping.zipCode}`}
                  </p>
                  <p className="font-sans text-sm text-[#57503F]/70">{order.shipping.country}</p>
                </div>
              )}

              {order.tracking && (
                <div className="border-t border-[#DDCEB4]/50 pt-5 mt-5">
                  <p className="font-sans text-[10px] text-[#57503F]/40 tracking-[0.15em] uppercase mb-3">Tracking</p>
                  <p className="font-sans text-sm text-[#221E1A]">
                    Carrier: {order.tracking.carrier}
                  </p>
                  <p className="font-sans text-sm text-[#221E1A] font-medium">
                    {order.tracking.trackingNumber}
                  </p>
                  {order.tracking.trackingUrl && (
                    <a href={order.tracking.trackingUrl} target="_blank" rel="noopener noreferrer"
                      className="font-sans text-xs text-[#A07C34] hover:underline">
                      Track Package →
                    </a>
                  )}
                </div>
              )}
            </div>

            {order.statusHistory && order.statusHistory.length > 0 && (
              <div className="bg-white/80 border border-[#DDCEB4]/50 p-6 md:p-8">
                <p className="font-sans text-[10px] text-[#57503F]/40 tracking-[0.15em] uppercase mb-4">Status History</p>
                <div className="space-y-3">
                  {[...order.statusHistory].reverse().map((h: any, idx: number) => (
                    <div key={idx} className="flex items-start gap-3">
                      <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                        ['delivered', 'refunded', 'return_delivered'].includes(h.status)
                          ? 'bg-green-500'
                          : ['cancelled'].includes(h.status)
                            ? 'bg-red-500'
                            : 'bg-[#A07C34]'
                      }`} />
                      <div>
                        <p className="font-sans text-sm text-[#221E1A]">
                          {statusLabels[h.status] || h.status}
                        </p>
                        <p className="font-sans text-xs text-[#57503F]/50">
                          {new Date(h.timestamp).toLocaleString()}
                        </p>
                        {h.note && (
                          <p className="font-sans text-xs text-[#57503F]/70 mt-0.5">{h.note}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
