'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Package, ExternalLink, Search, Filter } from 'lucide-react'

export default function AccountOrdersPage() {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  useEffect(() => {
    fetch("/api/auth/user/orders")
      .then(r => r.ok ? r.json() : [])
      .then(d => { setOrders(Array.isArray(d) ? d : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  function statusBadge(s: string) {
    const m: any = { pending: "bg-yellow-100 text-yellow-700", confirmed: "bg-blue-100 text-blue-700", shipped: "bg-purple-100 text-purple-700", delivered: "bg-green-100 text-green-700", cancelled: "bg-red-100 text-red-700" }
    return m[s] || "bg-gray-100 text-gray-700"
  }

  const filtered = orders.filter(o => {
    const matchesSearch = search === "" || o.id.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === "all" || o.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const tabs = [
    { id: "all", label: "All", count: orders.length },
    { id: "pending", label: "Pending", count: orders.filter(o => o.status === "pending").length },
    { id: "confirmed", label: "Confirmed", count: orders.filter(o => o.status === "confirmed").length },
    { id: "shipped", label: "Shipped", count: orders.filter(o => o.status === "shipped").length },
    { id: "delivered", label: "Delivered", count: orders.filter(o => o.status === "delivered").length },
  ].filter(t => t.count > 0 || t.id === "all")

  if (loading) return <div className="min-h-[60vh] flex items-center justify-center"><div className="w-8 h-8 border-2 border-otb-terracotta border-t-transparent rounded-full animate-spin" /></div>

  function fmt(amount: number) { return "$" + (amount || 0).toFixed(2) }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      <Link href="/account" className="inline-flex items-center gap-1 font-sans text-sm text-otb-ink/40 hover:text-otb-ink transition-colors mb-6"><ArrowLeft size={14} /> Back to Account</Link>

      <div className="flex items-center justify-between mb-4">
        <h1 className="font-serif text-2xl md:text-3xl text-otb-ink">My Orders</h1>
        {orders.length > 0 && <p className="font-sans text-xs text-otb-ink/40">{orders.length} total orders</p>}
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-otb-ink/30" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by order ID..."
          className="w-full pl-8 pr-3 py-2 border border-otb-sand/50 rounded-sm bg-white text-sm font-sans focus:outline-none focus:border-otb-terracotta/50" />
      </div>

      {/* Status Tabs */}
      <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-1">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setStatusFilter(tab.id)}
            className={"px-3 py-1.5 text-xs font-sans rounded-sm whitespace-nowrap transition-colors " + (statusFilter === tab.id ? "bg-otb-terracotta text-white" : "bg-otb-sand/20 text-otb-ink/50 hover:bg-otb-sand/30")}>
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <Package size={40} className="mx-auto text-otb-ink/20 mb-4" />
          <p className="font-sans text-sm text-otb-ink/40">{orders.length === 0 ? "No orders yet" : "No matching orders"}</p>
          {orders.length === 0 && <Link href="/" className="btn-primary mt-4 inline-flex">Start Shopping</Link>}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(order => (
            <Link key={order.id} href={"/account/orders/" + order.id} className="bg-white/70 border border-otb-sand/50 rounded-sm p-4 flex items-center justify-between hover:shadow-sm transition-shadow group">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-sans text-sm font-medium text-otb-ink truncate group-hover:text-otb-terracotta transition-colors">Order #{order.id}</p>
                  <ExternalLink size={12} className="text-otb-ink/20 group-hover:text-otb-terracotta transition-colors shrink-0" />
                </div>
                <p className="font-sans text-xs text-otb-ink/40 mt-0.5">
                  {new Date(order.createdAt).toLocaleDateString()} &middot; {order.items?.length || 0} items
                </p>
              </div>
              <div className="text-right shrink-0 ml-4">
                <p className="font-serif text-sm font-bold text-otb-ink">{fmt(order.total)}</p>
                <span className={"inline-block text-[10px] font-sans px-2 py-0.5 rounded-full mt-1 " + statusBadge(order.status)}>
                  {order.status || "pending"}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}



