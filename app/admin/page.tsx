"use client"
import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { Package, ShoppingCart, TrendingUp, MessageSquare, DollarSign, Users, BarChart3, User, MapPin, Truck, RotateCcw, Mail, Factory, MessageCircle } from "lucide-react"

function Avatar({ src, name, size = 32, bgColor, textColor, className = "", fallbackIcon = false }: { src?: string; name?: string; size?: number; bgColor?: string; textColor?: string; className?: string; fallbackIcon?: boolean }) {
  const [error, setError] = useState(false)
  const letter = (name || "?")[0]?.toUpperCase() || "?"
  const showImage = src && !error
  return (
    <div
      className={`rounded-full overflow-hidden shrink-0 flex items-center justify-center font-bold ${showImage ? "" : ""} ${className}`}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.4,
        backgroundColor: showImage ? "transparent" : (bgColor || "var(--adm-accent-bg)"),
        color: showImage ? "transparent" : (textColor || "var(--adm-accent)"),
      }}
    >
      {showImage ? (
        <img src={src} alt="" className="w-full h-full object-cover" onError={() => setError(true)} />
      ) : fallbackIcon ? (
        <User size={size * 0.55} />
      ) : (
        <span>{letter}</span>
      )}
    </div>
  )
}

export default function AdminDashboard() {
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [data, setData] = useState({ products: 0, active: 0, orders: 0, revenue: 0, messages: 0, unreadMsgs: 0, staffCount: 0, myOrders: 0, myRevenue: 0, returnsTotal: 0, refundedOrders: 0, refundTotal: 0, paypalRevenue: 0 })
  const [recentOrders, setRecentOrders] = useState<any[]>([])
  const [revenueDaily, setRevenueDaily] = useState<any[]>([])
  const [staffPerf, setStaffPerf] = useState<any[]>([])
  const [recentMessages, setRecentMessages] = useState<any[]>([])
  const [newMsgCount, setNewMsgCount] = useState(0)
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [supplierStats, setSupplierStats] = useState({ totalCost: 0, totalRevenue: 0, grossProfit: 0, avgMargin: 0, linkedProducts: 0 })
  const [loading, setLoading] = useState(true)
  const prevMsgIdsRef = useRef<Set<string>>(new Set())
  const isAdmin = currentUser?.role === "super_admin"

  const loadMessages = async (isInitial: boolean = false) => {
    try {
      const res = await fetch("/api/messages?_t=" + Date.now())
      if (!res.ok) return
      const m = await res.json()
      const arr = Array.isArray(m) ? m : []

      const conversations = arr.filter((msg: any, i: number, a: any[]) =>
        a.findIndex((x: any) => x.email === msg.email) === i
      )
      const sortedConversations = [...conversations].sort((a: any, b: any) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ).slice(0, 5)

      const msgWithLatest = sortedConversations.map((conv: any) => {
        const convMsgs = arr.filter((x: any) => x.email === conv.email)
        const customerMsgs = convMsgs.filter((x: any) => x.senderType !== 'admin')
        const latestCustomer = [...customerMsgs].sort((a: any, b: any) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )[0]
        const latest = [...convMsgs].sort((a: any, b: any) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )[0]
        const avatar = latestCustomer?.avatar || conv.avatar || undefined
        const name = latestCustomer?.name || conv.name || ''
        return {
          ...conv,
          ...latest,
          avatar,
          name,
          latestMsg: latest?.message || latest?.adminReply || '',
          hasUnread: convMsgs.some((x: any) => !x.read && x.senderType !== 'admin'),
        }
      })
      setRecentMessages(msgWithLatest)

      const customerMsgs = arr.filter((x: any) => x.senderType !== 'admin')
      if (!isInitial && prevMsgIdsRef.current.size > 0) {
        const newOnes = customerMsgs.filter((x: any) => !prevMsgIdsRef.current.has(x.id))
        if (newOnes.length > 0) {
          setNewMsgCount(prev => prev + newOnes.length)
        }
      }
      prevMsgIdsRef.current = new Set(customerMsgs.map((x: any) => x.id))

      setData(prev => ({
        ...prev,
        messages: arr.length,
        unreadMsgs: customerMsgs.filter((x: any) => !x.read).length,
      }))
    } catch (e) { console.error("Message load error:", e) }
  }

  useEffect(() => {
    const load = async () => {
      try {
        const authRes = await fetch("/api/auth/check")
        const authData = authRes.ok ? await authRes.json() : null
        if (authData?.user) setCurrentUser(authData.user)
        const userId = authData?.user?.id
        const isSuper = authData?.user?.role === "super_admin"
        const [products, orders, revenue, staff, orderStats, suppliersData] = await Promise.all([
          fetch("/api/products").then(r => r.ok ? r.json() : []).then(d => Array.isArray(d) ? d : (d.items || [])),
          fetch("/api/orders" + (!isSuper && userId ? "?staffId=" + userId : "")).then(r => r.ok ? r.json() : []),
          fetch("/api/orders?revenue=daily").then(r => r.ok ? r.json() : []),
          isSuper ? fetch("/api/staff").then(r => r.ok ? r.json() : []) : Promise.resolve([]),
          fetch("/api/orders?stats=true").then(r => r.ok ? r.json() : {}),
          isSuper ? fetch("/api/suppliers?withProducts=true").then(r => r.ok ? r.json() : []).then(d => Array.isArray(d) ? d : []) : Promise.resolve([]),
        ])
        const p = Array.isArray(products) ? products : (products.items || [])
        const o = Array.isArray(orders) ? orders : (orders.items || [])
        const r = Array.isArray(revenue) ? revenue : []
        const s = Array.isArray(staff) ? staff : []
        let allOrders = o
        if (!isSuper) {
          const allRes = await fetch("/api/orders")
          const allData = allRes.ok ? await allRes.json() : []
          allOrders = Array.isArray(allData) ? allData : (allData.items || [])
        }
        const stats = orderStats as any
        setData(prev => ({
          ...prev,
          products: p.length, active: p.filter((x: any) => x.active).length,
          orders: o.length, revenue: o.reduce((sum: number, x: any) => sum + (x.total || 0), 0),
          staffCount: s.length, myOrders: o.length,
          myRevenue: o.reduce((sum: number, x: any) => sum + (x.total || 0), 0),
          returnsTotal: stats.returnsTotal || 0,
          refundedOrders: stats.refunded || 0,
          refundTotal: stats.refundTotal || 0,
          paypalRevenue: stats.paypalRevenue || 0,
        }))
        setRecentOrders(o.slice(0, 5))
        setRevenueDaily(r)
        if (isSuper) {
          const staffOrders = Array.isArray(allOrders) ? allOrders.filter((x: any) => x.assignedTo) : []
          const perfMap = new Map()
          staffOrders.forEach((x: any) => {
            const key = x.assignedToName || x.assignedTo
            if (!perfMap.has(key)) perfMap.set(key, { name: key, id: x.assignedTo, orders: 0, total: 0 })
            perfMap.get(key).orders++
            perfMap.get(key).total += x.total || 0
          })
          setStaffPerf(Array.from(perfMap.values()).sort((a, b) => b.orders - a.orders))
          // Supplier stats
          const supList = Array.isArray(suppliersData) ? suppliersData : []
          setSuppliers(supList)
          const allLinkedProducts = supList.flatMap((sup: any) => sup.products || [])
          const withCost = allLinkedProducts.filter((prod: any) => prod.costPrice && prod.costPrice > 0 && prod.price > 0)
          const totalCost = withCost.reduce((sum: number, prod: any) => sum + (prod.costPrice || 0) * (prod.stock || 0), 0)
          const totalRevenue = withCost.reduce((sum: number, prod: any) => sum + (prod.price || 0) * (prod.stock || 0), 0)
          const grossProfit = totalRevenue - totalCost
          const avgMargin = withCost.length > 0
            ? withCost.reduce((sum: number, prod: any) => sum + ((prod.price - prod.costPrice) / prod.price * 100), 0) / withCost.length
            : 0
          setSupplierStats({
            totalCost,
            totalRevenue,
            grossProfit,
            avgMargin,
            linkedProducts: allLinkedProducts.length,
          })
        }
        await loadMessages(true)
      } catch (e) { console.error("Dashboard load error:", e) }
      finally { setLoading(false) }
    }
    load()
    const msgIv = setInterval(() => loadMessages(false), 10000)

    const handleMessage = (e: MessageEvent) => {
      if (e.data.type === 'messageMarkedRead') {
        setNewMsgCount(0)
        loadMessages(false)
      }
    }
    window.addEventListener('message', handleMessage)
    return () => { clearInterval(msgIv); window.removeEventListener('message', handleMessage) }
  }, [])
  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 rounded-full animate-spin" style={{ border: "2px solid var(--adm-accent)", borderTopColor: "transparent" }} /></div>
  const cards = [
    ...(isAdmin ? [{ label: "Total Products", value: data.products, sub: data.active + " active", icon: Package, link: "/admin/products" }] : []),
    { label: isAdmin ? "Total Orders" : "My Orders", value: data.orders, sub: isAdmin ? "All time" : data.myOrders + " assigned", icon: ShoppingCart, link: "/admin/orders" },
    { label: isAdmin ? "Total Revenue" : "My Revenue", value: "$" + data.revenue.toFixed(0), sub: isAdmin ? "All sales" : "$" + data.myRevenue.toFixed(0) + " processed", icon: TrendingUp, link: "/admin/finance" },
    ...(isAdmin ? [{ label: "Suppliers", value: suppliers.length, sub: supplierStats.linkedProducts + " linked products", icon: Factory, link: "/admin/suppliers" }] : []),
    { label: "Messages", value: data.unreadMsgs + "/" + data.messages, sub: data.unreadMsgs > 0 ? data.unreadMsgs + " unread" : "All read", icon: MessageSquare, link: "/admin/messages" },
  ]
  const statusBadge = (status: string) => {
    const colors: Record<string, { bg: string; text: string; label: string }> = {
      delivered: { bg: "rgba(16,185,129,0.1)", text: "#059669", label: "Delivered" },
      shipped: { bg: "rgba(139,92,246,0.1)", text: "#7C3AED", label: "Shipped" },
      cancelled: { bg: "rgba(239,68,68,0.1)", text: "#DC2626", label: "Cancelled" },
      pending: { bg: "rgba(245,158,11,0.1)", text: "#D97706", label: "Pending" },
      confirmed: { bg: "rgba(59,130,246,0.1)", text: "#3B82F6", label: "Confirmed" },
      processing: { bg: "rgba(99,102,241,0.1)", text: "#6366F1", label: "Processing" },
      return_requested: { bg: "rgba(249,115,22,0.1)", text: "#F97316", label: "Return Requested" },
      return_approved: { bg: "rgba(6,182,212,0.1)", text: "#06B6D4", label: "Return Approved" },
      return_shipped: { bg: "rgba(139,92,246,0.1)", text: "#8B5CF6", label: "Return Shipped" },
      return_delivered: { bg: "rgba(20,184,166,0.1)", text: "#14B8A6", label: "Return Delivered" },
      refunded: { bg: "rgba(244,63,94,0.1)", text: "#F43F5E", label: "Refunded" },
    }
    const c = colors[status] || { bg: "rgba(245,158,11,0.1)", text: "#D97706", label: status }
    return <span className="text-[11px] font-medium px-1.5 py-0.5 rounded" style={{ backgroundColor: c.bg, color: c.text }}>{c.label}</span>
  }
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: "var(--adm-text)" }}>{isAdmin ? "Dashboard" : "My Dashboard"}</h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--adm-text-secondary)" }}>
          {isAdmin ? "Overview of your store" : "Your personal overview"}
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {cards.map((c, i) => (
          <Link key={c.label} href={c.link}>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="adm-card-card rounded-xl p-5 transition-all cursor-pointer"
              style={{ backgroundColor: "var(--adm-card)", border: "1px solid var(--adm-border)" }}>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: "var(--adm-accent-bg)" }}>
                  <c.icon size={18} style={{ color: "var(--adm-accent)" }} />
                </div>
              </div>
              <p className="text-xs" style={{ color: "var(--adm-text-secondary)" }}>{c.label}</p>
              <p className="text-2xl font-bold mt-0.5" style={{ color: "var(--adm-text)" }}>{c.value}</p>
              <p className="text-xs mt-1" style={{ color: "var(--adm-text-secondary)" }}>{c.sub}</p>
            </motion.div>
          </Link>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          {isAdmin && revenueDaily.length > 0 && (
            <div className="rounded-xl p-5 adm-card-card cursor-pointer" style={{ backgroundColor: "var(--adm-card)", border: "1px solid var(--adm-border)" }}>
              <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--adm-text)" }}>Revenue Flow (7 days)</h2>
              <div className="space-y-2">
                {revenueDaily.map((d: any) => (
                  <div key={d.date} className="flex items-center justify-between text-xs py-1.5" style={{ borderBottom: "1px solid var(--adm-border)" }}>
                    <span style={{ color: "var(--adm-text-secondary)" }}>{d.date.slice(5)}</span>
                    <div className="flex items-center gap-4">
                      <span style={{ color: "var(--adm-text-secondary)" }}>{d.count} orders</span>
                      <span className="font-semibold" style={{ color: "#059669" }}>{"$"}{d.revenue.toFixed(0)}</span>
                    </div>
                  </div>
                ))}
                <div className="flex items-center justify-between text-xs font-bold pt-2" style={{ color: "var(--adm-text)" }}>
                  <span>Total (7d)</span>
                  <span>{"$"}{revenueDaily.reduce((s: number, d: any) => s + d.revenue, 0).toFixed(0)}</span>
                </div>
              </div>
            </div>
          )}
          {isAdmin && supplierStats.linkedProducts > 0 && (
            <div className="rounded-xl p-5 adm-card-card cursor-pointer" style={{ backgroundColor: "var(--adm-card)", border: "1px solid var(--adm-border)" }}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold" style={{ color: "var(--adm-text)" }}>Supplier Overview</h2>
                <Factory size={16} style={{ color: "var(--adm-text-secondary)" }} />
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span style={{ color: "var(--adm-text-secondary)" }}>Linked Products</span>
                  <span className="font-semibold" style={{ color: "var(--adm-text)" }}>{supplierStats.linkedProducts}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span style={{ color: "var(--adm-text-secondary)" }}>Inventory Value (Cost)</span>
                  <span className="font-semibold" style={{ color: "var(--adm-text)" }}>${supplierStats.totalCost.toFixed(0)}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span style={{ color: "var(--adm-text-secondary)" }}>Inventory Value (Retail)</span>
                  <span className="font-semibold" style={{ color: "#059669" }}>${supplierStats.totalRevenue.toFixed(0)}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span style={{ color: "var(--adm-text-secondary)" }}>Gross Profit</span>
                  <span className="font-semibold" style={{ color: supplierStats.grossProfit >= 0 ? "#059669" : "#ef4444" }}>${supplierStats.grossProfit.toFixed(0)}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span style={{ color: "var(--adm-text-secondary)" }}>Avg Margin</span>
                  <span className="font-semibold" style={{ color: "var(--adm-accent)" }}>{supplierStats.avgMargin.toFixed(1)}%</span>
                </div>
                <div className="pt-2 border-t" style={{ borderColor: "var(--adm-border)" }}>
                  <div className="flex items-center justify-between text-[10px] font-medium uppercase tracking-wider mb-1" style={{ color: "var(--adm-text-secondary)" }}>
                    <span>Supplier</span><span>Products</span>
                  </div>
                  {suppliers.slice(0, 5).map((sup: any) => (
                    <div key={sup.id} className="flex items-center justify-between py-1 text-xs">
                      <span className="truncate max-w-[120px]" style={{ color: "var(--adm-text)" }}>{sup.name}</span>
                      <span style={{ color: "var(--adm-text-secondary)" }}>{sup.productCount || 0}</span>
                    </div>
                  ))}
                </div>
                <Link href="/admin/suppliers" className="block text-xs text-center pt-1" style={{ color: "var(--adm-accent)" }}>View All Suppliers</Link>
              </div>
            </div>
          )}
          {recentMessages.length > 0 && (
            <div className="rounded-xl p-5 relative adm-card-card cursor-pointer" style={{ backgroundColor: "var(--adm-card)", border: "1px solid var(--adm-border)", boxShadow: newMsgCount > 0 ? "0 0 12px var(--adm-accent)" : "none", transition: "box-shadow 0.3s" }}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold" style={{ color: "var(--adm-text)" }}>Recent Messages</h2>
                  {newMsgCount > 0 && (
                    <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full text-white animate-pulse" style={{ backgroundColor: "var(--adm-accent)" }}>
                      {newMsgCount} NEW
                    </span>
                  )}
                </div>
                <Link href="/admin/messages" className="text-xs" style={{ color: "var(--adm-accent)" }} onClick={() => setNewMsgCount(0)}>View All</Link>
              </div>
              <div className="space-y-3">
                {recentMessages.map((msg: any) => {
                  return (
                    <Link key={msg.email} href="/admin/messages" className="flex items-center gap-3 p-2 rounded-lg adm-hover-bg transition-colors block" onClick={() => setNewMsgCount(0)}>
                      <div className="relative">
                        <Avatar
                          src={msg.avatar || undefined}
                          name={msg.name || msg.email || ""}
                          size={32}
                          fallbackIcon={!msg.registered}
                        />
                        {msg.hasUnread && (
                          <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-red-500"></span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <p className="text-xs font-medium truncate" style={{ color: "var(--adm-text)" }}>{msg.name || msg.email}</p>
                          {msg.hasUnread && <Mail size={10} style={{ color: "var(--adm-accent)" }} />}
                        </div>
                        <p className="text-[10px] truncate" style={{ color: "var(--adm-text-secondary)" }}>{msg.latestMsg}</p>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}
        </div>
        <div className="lg:col-span-2 space-y-4">
          {isAdmin && staffPerf.length > 0 && (
            <div className="rounded-xl p-5 adm-card-card cursor-pointer" style={{ backgroundColor: "var(--adm-card)", border: "1px solid var(--adm-border)" }}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold" style={{ color: "var(--adm-text)" }}>Staff Performance</h2>
                <BarChart3 size={16} style={{ color: "var(--adm-text-secondary)" }} />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[10px] font-medium uppercase tracking-wider px-1" style={{ color: "var(--adm-text-secondary)" }}>
                  <span>Staff</span><div className="flex gap-6"><span>Orders</span><span>Amount</span></div>
                </div>
                {staffPerf.map((s: any, i: number) => (
                  <div key={s.name} className="flex items-center justify-between py-2 px-3 rounded-lg text-xs" style={{ backgroundColor: i % 2 === 0 ? "var(--adm-input)" : "transparent" }}>
                    <div className="flex items-center gap-2">
                      <span className="font-medium" style={{ color: "var(--adm-text)" }}>{s.name}</span>
                      {s.id && s.id !== currentUser?.id && (
                        <Link href="/admin/messages" className="p-1 rounded transition-colors adm-hover-bg" style={{ color: "var(--adm-accent)" }} title={`Chat with ${s.name}`}>
                          <MessageCircle size={12} />
                        </Link>
                      )}
                    </div>
                    <div className="flex items-center gap-6">
                      <span className="font-mono" style={{ color: "var(--adm-text)" }}>{s.orders}</span>
                      <span className="font-mono" style={{ color: "#059669" }}>{"$"}{s.total.toFixed(0)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="rounded-xl p-5 adm-card-card cursor-pointer" style={{ backgroundColor: "var(--adm-card)", border: "1px solid var(--adm-border)" }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold" style={{ color: "var(--adm-text)" }}>{isAdmin ? "Recent Orders" : "My Recent Orders"}</h2>
              <Link href="/admin/orders" className="text-xs" style={{ color: "var(--adm-accent)" }}>View All</Link>
            </div>
            {recentOrders.length === 0 ? (
              <p className="text-sm text-center py-8" style={{ color: "var(--adm-text-secondary)" }}>No orders yet</p>
            ) : (
              <div className="space-y-4">
                {recentOrders.map((o) => (
                  <Link key={o.id} href={"/admin/orders"} className="block py-4 px-4 rounded-xl adm-hover-bg transition-colors border" style={{ borderColor: "var(--adm-border)" }}>
                    <div className="flex items-start gap-3">
                      {o.assignedToAvatar || o.assignedToName ? (
                        <Link href="/admin/messages" className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold shrink-0 overflow-hidden hover:ring-2 hover:ring-offset-1 transition-all" style={{ backgroundColor: "var(--adm-accent-bg)", color: "var(--adm-accent)" }} title={`Chat with ${o.assignedToName || 'staff'}`}>
                          {o.assignedToAvatar ? (
                            <img src={o.assignedToAvatar} alt="" className="w-full h-full object-cover" />
                          ) : (
                            (o.assignedToName?.[0] || "?").toUpperCase()
                          )}
                        </Link>
                      ) : (
                        <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: "var(--adm-input)" }}>
                          <Package size={16} style={{ color: "var(--adm-text-secondary)" }} />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <p className="text-sm font-semibold truncate" style={{ color: "var(--adm-text)" }}>{o.id}</p>
                          <p className="text-sm font-bold shrink-0" style={{ color: "#059669" }}>{"$"}{(o.total || 0).toFixed(2)}</p>
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          {statusBadge(o.status)}
                          <span className="text-xs" style={{ color: "var(--adm-text-secondary)" }}>
                            {new Date(o.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <User size={12} style={{ color: "var(--adm-text-secondary)", flexShrink: 0 }} />
                            <span className="truncate" style={{ color: "var(--adm-text)" }}>{o.customerName || o.shipping?.firstName + " " + (o.shipping?.lastName || "") || "Guest"}</span>
                          </div>
                          <div className="flex items-center gap-1.5 min-w-0">
                            <MapPin size={12} style={{ color: "var(--adm-text-secondary)", flexShrink: 0 }} />
                            <span className="truncate" style={{ color: "var(--adm-text)" }}>{o.shipping?.city || ""}{o.shipping?.country ? ", " + o.shipping.country : ""}</span>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="flex items-center gap-1.5">
                            <Truck size={12} style={{ color: "var(--adm-text-secondary)", flexShrink: 0 }} />
                            <span style={{ color: "var(--adm-text-secondary)" }}>Shipping: </span>
                            <span style={{ color: "var(--adm-text)" }}>{"$"}{(o.shippingCost || 0).toFixed(2)}</span>
                          </div>
                          {o.assignedToName && (
                            <div className="flex items-center gap-1.5 min-w-0">
                              <Users size={12} style={{ color: "var(--adm-text-secondary)", flexShrink: 0 }} />
                              <span className="truncate" style={{ color: "var(--adm-text)" }}>{o.assignedToName}</span>
                            </div>
                          )}
                        </div>
                        {o.notes && (
                          <div className="mt-2 pt-2 border-t flex items-start gap-1.5" style={{ borderColor: "var(--adm-border)" }}>
                            <MessageSquare size={12} style={{ color: "var(--adm-text-secondary)", flexShrink: 0, marginTop: 1 }} />
                            <p className="text-xs line-clamp-2" style={{ color: "var(--adm-text-secondary)" }}>{o.notes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
