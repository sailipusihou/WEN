"use client"
import { useState, useEffect } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { ArrowLeft, Package, MapPin, CheckCircle, Clock, CreditCard, FileText, Truck, User, ExternalLink, Info, X, Plane, Warehouse, Navigation, AlertCircle, Undo, Star } from "lucide-react"
import { findAvatarMeta } from "@/lib/avatars"

// 物流状态显示配置 (面向海外客户, 英文界面)
const TRACK_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  pending:           { label: 'Pending',            color: '#6b7280', bg: 'rgba(107,114,128,0.12)', icon: Clock },
  picked_up:         { label: 'Picked Up',          color: '#3b82f6', bg: 'rgba(59,130,246,0.12)',  icon: Package },
  in_transit:        { label: 'In Transit',         color: '#3b82f6', bg: 'rgba(59,130,246,0.12)',  icon: Truck },
  export_customs:    { label: 'Export Customs',     color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)',  icon: FileText },
  international:     { label: 'International',      color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)',  icon: Plane },
  import_customs:    { label: 'Import Customs',     color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  icon: FileText },
  at_local_facility: { label: 'At Local Facility',  color: '#10b981', bg: 'rgba(16,185,129,0.12)',  icon: Warehouse },
  out_for_delivery:  { label: 'Out for Delivery',   color: '#10b981', bg: 'rgba(16,185,129,0.12)',  icon: Truck },
  delivered:         { label: 'Delivered',          color: '#22c55e', bg: 'rgba(34,197,94,0.12)',   icon: CheckCircle },
  exception:         { label: 'Exception',          color: '#ef4444', bg: 'rgba(239,68,68,0.12)',   icon: AlertCircle },
  returned:          { label: 'Returned',           color: '#ef4444', bg: 'rgba(239,68,68,0.12)',   icon: Undo },
}

export default function OrderDetailPage() {
  const params = useParams()
  const [order, setOrder] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [avatarInfoOpen, setAvatarInfoOpen] = useState(false)
  const [shipments, setShipments] = useState<any[]>([])
  // staff 头像加载失败回退到首字母占位
  const [staffAvatarFailed, setStaffAvatarFailed] = useState(false)

  // ---- 订单完成后评价 (评论仅从订单入口发起, 核验后自动展示在商品页) ----
  const [userEmail, setUserEmail] = useState("")
  const [itemReviews, setItemReviews] = useState<Record<string, { rating: number; content: string; submitting: boolean; msg: string; ok: boolean }>>({})

  useEffect(() => {
    fetch("/api/auth/user").then(r => r.ok ? r.json() : null).then(d => { if (d?.user?.email) setUserEmail(d.user.email) }).catch(() => {})
  }, [])

  const submitItemReview = async (item: any) => {
    const rv = itemReviews[item.id] || { rating: 5, content: "", submitting: false, msg: "", ok: false }
    if (rv.submitting) return
    if (!rv.content.trim()) {
      setItemReviews(prev => ({ ...prev, [item.id]: { ...rv, msg: "Please write your review first.", ok: false } }))
      return
    }
    setItemReviews(prev => ({ ...prev, [item.id]: { ...rv, submitting: true, msg: "" } }))
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: item.productId || item.id,
          rating: rv.rating,
          content: rv.content,
          orderId: order.id,
          email: userEmail,
        }),
      })
      const d = await res.json()
      if (d.verified) {
        setItemReviews(prev => ({ ...prev, [item.id]: { ...rv, submitting: false, content: "", msg: "Thanks! Your review is now live on the product page.", ok: true } }))
      } else {
        setItemReviews(prev => ({ ...prev, [item.id]: { ...rv, submitting: false, msg: d.error || "Could not submit review. Please try again.", ok: false } }))
      }
    } catch {
      setItemReviews(prev => ({ ...prev, [item.id]: { ...rv, submitting: false, msg: "Connection error. Please try again.", ok: false } }))
    }
  }

  useEffect(() => {
    if (!params?.id) return
    fetch("/api/orders/" + params.id)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        setOrder(d); setLoading(false)
        // 获取物流追踪信息
        if (d) {
          fetch(`/api/orders/${params.id}/shipments`)
            .then(r => r.ok ? r.json() : [])
            .then(s => setShipments(Array.isArray(s) ? s : []))
            .catch(() => {})
        }
      })
      .catch(() => setLoading(false))
  }, [params?.id])

  function statusBadge(s: string) {
    const colors: any = { pending: "bg-yellow-100 text-yellow-700", confirmed: "bg-blue-100 text-blue-700", processing: "bg-indigo-100 text-indigo-700", shipped: "bg-purple-100 text-purple-700", delivered: "bg-green-100 text-green-700", cancelled: "bg-red-100 text-red-700" }
    return colors[s] || "bg-paper text-ink"
  }

  function statusLabel(s: string) {
    const labels: any = { pending: "Order Placed", confirmed: "Confirmed", processing: "Processing", shipped: "Shipped", delivered: "Delivered", cancelled: "Cancelled" }
    return labels[s] || s
  }

  if (loading) return <div className="min-h-[60vh] flex items-center justify-center"><div className="w-8 h-8 border-2 border-otb-terracotta border-t-transparent rounded-full animate-spin" /></div>
  if (!order) return <div className="min-h-[60vh] flex items-center justify-center"><p className="font-sans text-sm text-otb-ink/40">Order not found</p></div>

  const items = order.items || []
  const qty = items.reduce((s: number, i: any) => s + (i.quantity || 1), 0)
  const history = order.statusHistory || []

  function fmt(amount: number) { return "$" + (amount || 0).toFixed(2) }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      <Link href="/account/orders" className="inline-flex items-center gap-1 font-sans text-sm text-otb-ink/40 hover:text-otb-ink transition-colors mb-6"><ArrowLeft size={14} /> Back to Orders</Link>

      {/* Invoice Header */}
      <div className="bg-[#FFFCF7]/70 border border-otb-sand/50 rounded-sm p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <FileText size={20} className="text-otb-terracotta" />
              <h1 className="font-serif text-xl md:text-2xl text-otb-ink">INVOICE</h1>
            </div>
            <p className="font-sans text-sm text-otb-ink/60">Order #<span className="font-mono">{order.id}</span></p>
            <p className="font-sans text-xs text-otb-ink/40 mt-0.5">Date: {new Date(order.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
          </div>
          <span className={"text-xs font-sans font-medium px-3 py-1.5 rounded-full uppercase tracking-wider " + statusBadge(order.status)}>{statusLabel(order.status)}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">

          {/* Items Table */}
          <div className="bg-[#FFFCF7] border border-otb-sand/50 rounded-sm overflow-hidden">
            <div className="bg-otb-sand/10 px-5 py-3 border-b border-otb-sand/30">
              <h2 className="font-serif text-sm text-otb-ink font-medium">Order Items</h2>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-otb-sand/20 text-xs text-otb-ink/40 font-sans">
                  <th className="text-left px-5 py-2.5 font-medium">Item</th>
                  <th className="text-center px-3 py-2.5 font-medium">Qty</th>
                  <th className="text-right px-3 py-2.5 font-medium">Price</th>
                  <th className="text-right px-5 py-2.5 font-medium">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item: any, i: number) => {
                  const itemTotal = (item.price || 0) * (item.quantity || 1)
                  return (
                    <tr key={i} className="border-b border-otb-sand/10 hover:bg-otb-sand/5">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-otb-sand/20 rounded-sm overflow-hidden shrink-0 flex items-center justify-center">
                            {item.image ? <img src={item.image} className="w-full h-full object-cover" /> : <Package size={16} className="text-otb-ink/20" />}
                          </div>
                          <span className="font-sans text-sm text-otb-ink">{item.nameEn || item.name}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center font-sans text-sm text-otb-ink/60">{item.quantity}</td>
                      <td className="px-3 py-3 text-right font-sans text-sm text-otb-ink/60">{fmt(item.price)}</td>
                      <td className="px-5 py-3 text-right font-sans text-sm font-medium text-otb-ink">{fmt(itemTotal)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Detailed Timeline from statusHistory */}
          <div className="bg-[#FFFCF7]/70 border border-otb-sand/50 rounded-sm p-6">
            <h2 className="font-serif text-sm text-otb-ink font-medium mb-4">Order Timeline</h2>
            <div className="relative">
              {history.length > 0 ? (
                <div className="space-y-0">
                  {[...history].reverse().map((event: any, i: number) => (
                    <div key={i} className="flex items-start gap-3 pb-4 relative">
                      <div className="flex flex-col items-center">
                        <div className={"w-3 h-3 rounded-full border-2 shrink-0 mt-1.5 " + (event.status === "cancelled" ? "border-red-400 bg-red-100" : "border-otb-terracotta bg-otb-terracotta/20")} />
                        {i < history.length - 1 && <div className="w-0.5 flex-1 bg-otb-sand/30 mt-1" />}
                      </div>
                      <div className="flex-1 min-w-0 pt-0.5">
                        <p className="font-sans text-sm font-medium text-otb-ink">{statusLabel(event.status)}</p>
                        {event.note && <p className="font-sans text-xs text-otb-ink/50 mt-0.5">{event.note}</p>}
                        <p className="font-sans text-[10px] text-otb-ink/30 mt-0.5">{new Date(event.timestamp).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {["pending", "confirmed", "shipped", "delivered"].map((s, i) => {
                    const stepIdx = ["pending", "confirmed", "shipped", "delivered"].indexOf(order.status)
                    const done = i <= stepIdx
                    return (
                      <div key={i} className="flex items-start gap-3">
                        <div className={"w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 " + (done ? "bg-otb-terracotta text-white" : "bg-paper text-gray-300")}>
                          {done ? <CheckCircle size={14} /> : <Clock size={14} />}
                        </div>
                        <div className="pt-1.5">
                          <p className={"font-sans text-sm " + (done ? "text-otb-ink font-medium" : "text-otb-ink/30")}>{statusLabel(s)}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* 订单完成后评价 (仅 delivered/completed 可评论) */}
          {["delivered", "completed"].includes(order.status) && (
            <div className="bg-[#FFFCF7]/70 border border-otb-sand/50 rounded-sm p-6">
              <h2 className="font-serif text-sm text-otb-ink font-medium mb-1">Review Your Order</h2>
              <p className="font-sans text-xs text-otb-ink/50 mb-4">Share your experience — published reviews appear instantly on each product page.</p>
              <div className="space-y-5">
                {items.map((item: any) => {
                  const rv = itemReviews[item.id] || { rating: 5, content: "", submitting: false, msg: "", ok: false }
                  return (
                    <div key={item.id} className="border-t border-otb-sand/30 pt-4">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-9 h-9 bg-otb-sand/20 rounded-sm overflow-hidden shrink-0">
                          {item.image ? <img src={item.image} className="w-full h-full object-cover" alt={item.nameEn || item.name} /> : <Package size={14} className="text-otb-ink/20 m-auto mt-2.5" />}
                        </div>
                        <p className="font-sans text-sm text-otb-ink font-medium">{item.nameEn || item.name}</p>
                      </div>
                      <div className="flex items-center gap-1 mb-2">
                        {[1, 2, 3, 4, 5].map(n => (
                          <button key={n} type="button" onClick={() => setItemReviews(prev => ({ ...prev, [item.id]: { ...rv, rating: n } }))}
                            aria-label={`${n} star${n > 1 ? "s" : ""}`} className="p-0.5">
                            <Star size={16} className={n <= rv.rating ? "fill-[#A07C34] text-[#A07C34]" : "text-[#D8CFC0]"} />
                          </button>
                        ))}
                        <span className="font-sans text-[11px] text-otb-ink/50 ml-2">{rv.rating}/5</span>
                      </div>
                      <textarea value={rv.content} onChange={e => setItemReviews(prev => ({ ...prev, [item.id]: { ...rv, content: e.target.value } }))}
                        rows={2} placeholder="How was this piece? Craft, quality, packaging..."
                        className="w-full px-3 py-2.5 border border-otb-sand/50 rounded-sm bg-[#FFFCF7] text-sm font-sans focus:outline-none focus:border-otb-terracotta/50" />
                      <div className="flex items-center gap-3 mt-2">
                        <button type="button" onClick={() => submitItemReview(item)} disabled={rv.submitting}
                          className="px-4 py-2 bg-otb-terracotta text-white font-serif text-xs rounded-sm hover:bg-otb-terracotta/90 disabled:opacity-50 transition-colors">
                          {rv.submitting ? "Submitting..." : "Submit Review"}
                        </button>
                        {rv.msg && (
                          <p className={"font-sans text-[11px] " + (rv.ok ? "text-green-600" : "text-red-500")}>{rv.msg}</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">

          {/* Assigned Staff */}
          {order.assignedToName && (
            <div className="bg-[#FFFCF7]/70 border border-otb-sand/50 rounded-sm p-5">
              <h2 className="font-serif text-sm text-otb-ink font-medium mb-3">Assigned Staff</h2>
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold overflow-hidden cursor-pointer hover:ring-2 hover:ring-otb-terracotta/30 transition-all"
                  style={{ backgroundColor: 'var(--otb-terracotta)' }}
                  onClick={() => {
                    const meta = findAvatarMeta(order.assignedToAvatar || '')
                    if (meta) setAvatarInfoOpen(true)
                  }}
                >
                  {order.assignedToAvatar && !staffAvatarFailed ? (
                    <img src={order.assignedToAvatar} alt="" className="w-full h-full object-cover" onError={() => setStaffAvatarFailed(true)} />
                  ) : (
                    order.assignedToName.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-sans text-sm font-medium text-otb-ink">{order.assignedToName}</p>
                  <p className="font-sans text-xs text-otb-ink/40">Order handler</p>
                </div>
                {findAvatarMeta(order.assignedToAvatar || '') && (
                  <button
                    onClick={() => setAvatarInfoOpen(true)}
                    className="p-1 rounded-md hover:bg-otb-sand/20 transition-colors"
                    title="View avatar source info"
                  >
                    <Info size={14} className="text-otb-ink/40" />
                  </button>
                )}
              </div>
              {findAvatarMeta(order.assignedToAvatar || '')?.name && (
                <p className="font-sans text-[10px] text-otb-ink/40 mt-2">
                  Avatar: {findAvatarMeta(order.assignedToAvatar || '')?.name} · Click for details
                </p>
              )}

              {/* Avatar Info Expandable */}
              {avatarInfoOpen && (() => {
                const meta = findAvatarMeta(order.assignedToAvatar || '')
                if (!meta) return null
                return (
                  <div className="mt-4 pt-4 border-t border-otb-sand/30">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 border-2 border-otb-terracotta/20">
                        <img src={meta.url} alt={meta.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-sans text-sm font-bold text-otb-ink">{meta.name}</p>
                          <button
                            onClick={() => setAvatarInfoOpen(false)}
                            className="p-0.5 rounded hover:bg-otb-sand/20 transition-colors"
                          >
                            <X size={12} className="text-otb-ink/40" />
                          </button>
                        </div>
                        <div className="flex gap-1.5 mt-1">
                          {meta.era && (
                            <span className="font-sans text-[10px] px-1.5 py-0.5 rounded bg-otb-terracotta/10 text-otb-terracotta">
                              {meta.era}
                            </span>
                          )}
                          {meta.role && (
                            <span className="font-sans text-[10px] px-1.5 py-0.5 rounded bg-otb-sand/20 text-otb-ink/60">
                              {meta.role}
                            </span>
                          )}
                        </div>
                        {meta.intro && (
                          <p className="font-sans text-xs text-otb-ink/70 mt-2 leading-relaxed">{meta.intro}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })()}
            </div>
          )}

          {/* Payment Summary */}
          <div className="bg-[#FFFCF7] border border-otb-sand/50 rounded-sm overflow-hidden">
            <div className="bg-otb-sand/10 px-5 py-3 border-b border-otb-sand/30">
              <h2 className="font-serif text-sm text-otb-ink font-medium">Payment Summary</h2>
            </div>
            <div className="p-5 space-y-3">
              <div className="flex justify-between text-sm font-sans">
                <span className="text-otb-ink/60">Subtotal ({qty} items)</span>
                <span className="text-otb-ink">{fmt(order.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm font-sans">
                <span className="text-otb-ink/60">Shipping</span>
                <span>{order.shippingCost === 0 ? <span className="text-green-600 text-sm">Free</span> : <span className="text-otb-ink">{fmt(order.shippingCost)}</span>}</span>
              </div>
              <div className="border-t border-otb-sand/30 pt-3 flex justify-between items-baseline">
                <span className="font-sans text-sm font-medium text-otb-ink">Total</span>
                <span className="font-serif text-xl font-bold text-otb-terracotta">{fmt(order.total)}</span>
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div className="bg-[#FFFCF7]/70 border border-otb-sand/50 rounded-sm p-5">
            <h2 className="font-serif text-sm text-otb-ink font-medium mb-3">Payment Method</h2>
            <div className="flex items-center gap-2">
              <CreditCard size={16} className="text-blue-500" />
              <span className="font-sans text-sm text-otb-ink">{order.paymentMethod === 'payoneer' ? 'Payoneer' : 'PayPal'}</span>
              {/* 修复 M12: 仅实际已支付 (或服务端验证过) 的订单显示 Paid, 未支付订单不再误导 */}
              {order.status === "cancelled" ? (
                <span className="text-xs text-red-500 font-sans ml-auto">Cancelled</span>
              ) : (order.paymentStatus === 'paid' || order.paypalTransaction?.verified === true || order.payoneerTransaction?.status === 'COMPLETED') ? (
                <span className="text-xs text-green-600 font-sans ml-auto">Paid</span>
              ) : (
                <span className="text-xs text-amber-600 font-sans ml-auto">Payment pending</span>
              )}
            </div>
            {order.notes && <p className="font-sans text-xs text-otb-ink/40 mt-2">{order.notes}</p>}
          </div>

          {(order.referralCode || order.referredByStaffName || order._referralConversion) && (
            <div className="bg-[#FFFCF7]/70 border border-otb-sand/50 rounded-sm p-5">
              <h2 className="font-serif text-sm text-otb-ink font-medium mb-3">Marketing Attribution</h2>
              <div className="space-y-2 font-sans text-sm text-otb-ink/70">
                {order.referralCode && (
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-otb-ink/50">Referral Code</span>
                    <span className="font-mono text-otb-ink">{order.referralCode}</span>
                  </div>
                )}
                {order.referredByStaffName && (
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-otb-ink/50">Campaign Owner</span>
                    <span className="text-otb-ink">{order.referredByStaffName}</span>
                  </div>
                )}
                {order.attributionModel && (
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-otb-ink/50">Attribution Model</span>
                    <span className="text-otb-ink">{order.attributionModel === 'first_click' ? 'First Click' : 'Last Click'}</span>
                  </div>
                )}
                {order.attributionMatchedBy && (
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-otb-ink/50">Matched By</span>
                    <span className="text-otb-ink">
                      {order.attributionMatchedBy === 'visitor' ? 'Same visitor' : 'Referral fallback'}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between gap-3">
                  <span className="text-otb-ink/50">Attribution Status</span>
                  <span className={order._referralConversion?.converted ? 'text-green-600' : 'text-amber-600'}>
                    {order._referralConversion?.converted ? 'Recorded' : 'Pending'}
                  </span>
                </div>
                {order.attributionTouchpoints ? (
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-otb-ink/50">Eligible Touchpoints</span>
                    <span className="text-otb-ink">{order.attributionTouchpoints} in {order.attributionLookbackDays || 7} days</span>
                  </div>
                ) : null}
                <p className="pt-1 text-xs text-otb-ink/40">
                  This order keeps the social marketing attribution used before checkout, so the team can trace which content drove the purchase.
                </p>
              </div>
            </div>
          )}

          {/* Shipping Tracking — 详细物流轨迹时间轴 */}
          {shipments.length > 0 ? (
            <div className="bg-[#FFFCF7]/70 border border-otb-sand/50 rounded-sm p-5">
              <h2 className="font-serif text-sm text-otb-ink font-medium mb-3 flex items-center gap-1.5">
                <Navigation size={14} className="text-otb-terracotta" /> Shipping Tracking
              </h2>
              <div className="space-y-4">
                {shipments.map((shp: any, si: number) => {
                  const events: any[] = shp.events || []
                  const sc = TRACK_STATUS_CONFIG[shp.status as string] || TRACK_STATUS_CONFIG.pending
                  return (
                    <div key={shp.id || si} className={shipments.length > 1 ? "pb-4 border-b border-otb-sand/20 last:border-0 last:pb-0" : ""}>
                      {/* 物流商 + 追踪号 */}
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div>
                          <p className="font-sans text-sm font-medium text-otb-ink">{shp.carrierName || shp.carrierCode}</p>
                          <p className="font-mono text-xs text-otb-ink/50 break-all">{shp.trackingNumber}</p>
                          {shp.estimatedDelivery && <p className="font-sans text-[11px] text-otb-ink/40 mt-0.5">Est. delivery: {new Date(shp.estimatedDelivery).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ backgroundColor: sc.bg, color: sc.color }}>
                            <sc.icon size={10} /> {sc.label}
                          </span>
                          {shp.trackingUrl && (
                            <a href={shp.trackingUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-otb-terracotta hover:underline">
                              <ExternalLink size={11} /> Track
                            </a>
                          )}
                        </div>
                      </div>

                      {/* 轨迹时间轴 */}
                      {events.length > 0 && (
                        <div className="relative pl-1">
                          {[...events].reverse().map((evt: any, i: number) => {
                            const ec = TRACK_STATUS_CONFIG[evt.status as string] || TRACK_STATUS_CONFIG.pending
                            const isLatest = i === 0
                            return (
                              <div key={evt.id || i} className="flex gap-2.5 pb-3 relative">
                                <div className="flex flex-col items-center shrink-0">
                                  <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: ec.bg }}>
                                    <ec.icon size={10} style={{ color: ec.color }} />
                                  </div>
                                  {!isLatest && <div className="w-px flex-1 mt-0.5" style={{ backgroundColor: "rgba(0,0,0,0.1)" }} />}
                                </div>
                                <div className="flex-1 min-w-0 pt-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className={"font-sans text-xs " + (isLatest ? "font-medium text-otb-ink" : "text-otb-ink/60")}>{evt.description}</span>
                                    {isLatest && <span className="px-1 py-0.5 rounded-full text-[8px] font-medium" style={{ backgroundColor: ec.bg, color: ec.color }}>LATEST</span>}
                                  </div>
                                  {evt.location && (
                                    <p className="font-sans text-[10px] text-otb-ink/40 mt-0.5 flex items-center gap-0.5">
                                      <MapPin size={9} /> {evt.location}
                                    </p>
                                  )}
                                  <p className="font-sans text-[10px] text-otb-ink/30 mt-0.5">
                                    {new Date(evt.timestamp).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                                  </p>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ) : order.tracking && (
            <div className="bg-[#FFFCF7]/70 border border-otb-sand/50 rounded-sm p-5">
              <h2 className="font-serif text-sm text-otb-ink font-medium mb-3">Tracking</h2>
              <div className="flex items-start gap-2">
                <Truck size={14} className="text-otb-ink/30 mt-0.5 shrink-0" />
                <div className="font-sans text-sm text-otb-ink/60">
                  <p className="text-otb-ink font-medium">{order.tracking.carrier}</p>
                  <p className="text-xs break-all">{order.tracking.trackingNumber}</p>
                  {order.tracking.estimatedDelivery && <p className="text-xs mt-1">Est. delivery: {order.tracking.estimatedDelivery}</p>}
                  {order.tracking.url && (
                    <a href={order.tracking.url} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-otb-terracotta hover:underline mt-1">
                      Track Package <ExternalLink size={10} />
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Shipping Address */}
          <div className="bg-[#FFFCF7]/70 border border-otb-sand/50 rounded-sm p-5">
            <h2 className="font-serif text-sm text-otb-ink font-medium mb-3">Shipping Address</h2>
            <div className="flex items-start gap-2">
              <MapPin size={14} className="text-otb-ink/30 mt-0.5 shrink-0" />
              <div className="font-sans text-sm text-otb-ink/60 leading-relaxed">
                <p className="text-otb-ink font-medium">{order.shipping?.firstName || ""} {order.shipping?.lastName || ""}</p>
                <p>{order.shipping?.address || ""}</p>
                <p>{[order.shipping?.city, order.shipping?.state].filter(Boolean).join(", ")} {order.shipping?.zipCode || order.shipping?.zip || ""}</p>
                <p>{order.shipping?.country || ""}</p>
                <p className="mt-1 text-xs">{order.shipping?.email || ""}</p>
              </div>
            </div>
          </div>

          {/* Estimated Delivery */}
          {order.estimatedDeliveryDays && order.status !== "delivered" && order.status !== "cancelled" && (
            <div className="bg-otb-sand/10 border border-otb-sand/30 rounded-sm p-5">
              <h2 className="font-serif text-sm text-otb-ink font-medium mb-2">Estimated Delivery</h2>
              <p className="font-sans text-sm text-otb-ink/60">
                {order.estimatedDeliveryDays} business days
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
