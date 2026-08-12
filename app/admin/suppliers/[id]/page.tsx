"use client"
import { useState, useEffect, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft, Factory, Save, Search, Package, DollarSign, TrendingUp,
  Check, X, Edit3, MapPin, Phone, Mail, UserCircle, Boxes, AlertCircle
} from "lucide-react"

interface Supplier {
  id: string
  name: string
  contact?: string
  phone?: string
  email?: string
  address?: string
  region?: string
  status: 'active' | 'inactive'
  notes?: string
}

interface Product {
  id: string
  code?: string
  name: string
  nameEn?: string
  image: string
  price: number
  costPrice?: number
  stock?: number
  supplierId?: string
  origin?: string
  active?: boolean
  category?: string
}

export default function SupplierDetailPage() {
  const router = useRouter()
  const params = useParams()
  const supplierId = params.id as string

  const [supplier, setSupplier] = useState<Supplier | null>(null)
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [linkedIds, setLinkedIds] = useState<Set<string>>(new Set())
  const [costPrices, setCostPrices] = useState<Record<string, string>>({})
  const [stocks, setStocks] = useState<Record<string, string>>({})
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState(false)
  const [supplierForm, setSupplierForm] = useState<Supplier | null>(null)
  const [saveMsg, setSaveMsg] = useState("")

  const loadData = useCallback(() => {
    setLoading(true)
    Promise.all([
      fetch(`/api/suppliers/${supplierId}`).then(r => r.ok ? r.json() : null),
      fetch("/api/products").then(r => r.ok ? r.json() : []).then(d => Array.isArray(d) ? d : (d.items || [])),
    ]).then(([sup, prods]) => {
      if (!sup) { router.push("/admin/suppliers"); return }
      setSupplier(sup)
      setSupplierForm(sup)
      setAllProducts(prods)
      const linked = new Set<string>()
      const cp: Record<string, string> = {}
      const st: Record<string, string> = {}
      prods.forEach((p: Product) => {
        if (p.supplierId === supplierId) {
          linked.add(p.id)
          if (p.costPrice) cp[p.id] = p.costPrice.toString()
          if (p.stock !== undefined) st[p.id] = p.stock.toString()
        }
      })
      setLinkedIds(linked)
      setCostPrices(cp)
      setStocks(st)
      setLoading(false)
    })
  }, [supplierId, router])

  useEffect(() => { loadData() }, [loadData])

  const toggleLink = (productId: string) => {
    const next = new Set(linkedIds)
    if (next.has(productId)) {
      next.delete(productId)
    } else {
      next.add(productId)
    }
    setLinkedIds(next)
  }

  const handleSaveAll = async () => {
    setSaving(true)
    setSaveMsg("")
    let updated = 0
    // 解绑不再关联的产品
    for (const p of allProducts) {
      const wasLinked = p.supplierId === supplierId
      const isLinked = linkedIds.has(p.id)
      const updates: any = {}

      if (wasLinked && !isLinked) {
        updates.supplierId = null
        updates.costPrice = null
      } else if (isLinked) {
        if (!wasLinked) updates.supplierId = supplierId
        const cp = costPrices[p.id]
        if (cp !== undefined && cp !== (p.costPrice?.toString() || "")) {
          updates.costPrice = cp ? Number(cp) : null
        }
        const st = stocks[p.id]
        if (st !== undefined && st !== (p.stock?.toString() || "0")) {
          updates.stock = Number(st) || 0
        }
      }

      if (Object.keys(updates).length > 0) {
        const res = await fetch(`/api/products/${p.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        })
        if (res.ok) updated++
      }
    }
    setSaving(false)
    setSaveMsg(`Updated ${updated} product(s)`)
    setTimeout(() => setSaveMsg(""), 3000)
    loadData()
  }

  const handleSaveSupplier = async () => {
    if (!supplierForm) return
    const res = await fetch("/api/suppliers", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(supplierForm),
    })
    if (res.ok) {
      setSupplier(supplierForm)
      setEditingSupplier(false)
    }
  }

  const filteredProducts = allProducts.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.nameEn || "").toLowerCase().includes(search.toLowerCase()) ||
    (p.category || "").toLowerCase().includes(search.toLowerCase()) ||
    (p.code || "").toLowerCase().includes(search.toLowerCase())
  )

  // 统计
  const linkedProducts = allProducts.filter(p => linkedIds.has(p.id))
  const withCost = linkedProducts.filter(p => {
    const cp = Number(costPrices[p.id] || 0)
    return cp > 0 && p.price > 0
  })
  const totalCostValue = linkedProducts.reduce((sum, p) => {
    const cp = Number(costPrices[p.id] || 0)
    const st = Number(stocks[p.id] || 0)
    return sum + cp * st
  }, 0)
  const totalRetailValue = linkedProducts.reduce((sum, p) => {
    const st = Number(stocks[p.id] || 0)
    return sum + p.price * st
  }, 0)
  const grossProfit = totalRetailValue - totalCostValue
  const avgMargin = withCost.length > 0
    ? withCost.reduce((sum, p) => {
        const cp = Number(costPrices[p.id] || 0)
        return sum + ((p.price - cp) / p.price * 100)
      }, 0) / withCost.length
    : 0

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: "var(--adm-border)", borderTopColor: "var(--adm-accent)" }} />
      </div>
    )
  }

  return (
    <div>
      {/* 顶部导航 */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push("/admin/suppliers")} className="p-2 rounded-lg adm-hover-bg" style={{ color: "var(--adm-text-secondary)" }}>
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold" style={{ color: "var(--adm-text)" }}>{supplier?.name}</h1>
            <span className="px-2 py-0.5 text-[10px] font-medium rounded-full" style={{
              backgroundColor: supplier?.status === 'active' ? 'rgba(34,197,94,0.15)' : 'var(--adm-bg)',
              color: supplier?.status === 'active' ? '#22c55e' : 'var(--adm-text-secondary)'
            }}>
              {supplier?.status}
            </span>
          </div>
          <p className="text-sm mt-0.5" style={{ color: "var(--adm-text-secondary)" }}>Supplier detail & product binding</p>
        </div>
        <button onClick={() => setEditingSupplier(!editingSupplier)} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium adm-hover-bg" style={{ color: "var(--adm-accent)", border: "1px solid var(--adm-border)" }}>
          <Edit3 size={14} /> Edit Info
        </button>
      </div>

      {/* 供货商信息 */}
      <div className="rounded-xl p-5 mb-6" style={{ backgroundColor: "var(--adm-card)", border: "1px solid var(--adm-border)" }}>
        {editingSupplier ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { key: "name", label: "Name" },
              { key: "contact", label: "Contact" },
              { key: "phone", label: "Phone" },
              { key: "email", label: "Email" },
              { key: "region", label: "Region" },
              { key: "address", label: "Address" },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--adm-text-secondary)" }}>{f.label}</label>
                <input
                  value={(supplierForm as any)?.[f.key] || ""}
                  onChange={e => setSupplierForm({ ...supplierForm!, [f.key]: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                  style={{ backgroundColor: "var(--adm-bg)", border: "1px solid var(--adm-border)", color: "var(--adm-text)" }}
                />
              </div>
            ))}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--adm-text-secondary)" }}>Status</label>
              <select
                value={supplierForm?.status || "active"}
                onChange={e => setSupplierForm({ ...supplierForm!, status: e.target.value as 'active' | 'inactive' })}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={{ backgroundColor: "var(--adm-bg)", border: "1px solid var(--adm-border)", color: "var(--adm-text)" }}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div className="md:col-span-3">
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--adm-text-secondary)" }}>Notes</label>
              <textarea
                value={supplierForm?.notes || ""}
                onChange={e => setSupplierForm({ ...supplierForm!, notes: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none"
                style={{ backgroundColor: "var(--adm-bg)", border: "1px solid var(--adm-border)", color: "var(--adm-text)" }}
              />
            </div>
            <div className="md:col-span-3 flex items-center gap-3">
              <button onClick={handleSaveSupplier} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: "var(--adm-accent)" }}>
                <Save size={14} /> Save
              </button>
              <button onClick={() => { setEditingSupplier(false); setSupplierForm(supplier) }} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ color: "var(--adm-text-secondary)" }}>Cancel</button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {supplier?.contact && <InfoItem icon={<UserCircle size={14} />} label="Contact" value={supplier.contact} />}
            {supplier?.phone && <InfoItem icon={<Phone size={14} />} label="Phone" value={supplier.phone} />}
            {supplier?.email && <InfoItem icon={<Mail size={14} />} label="Email" value={supplier.email} />}
            {supplier?.region && <InfoItem icon={<MapPin size={14} />} label="Region" value={supplier.region} />}
            {supplier?.address && <InfoItem icon={<MapPin size={14} />} label="Address" value={supplier.address} />}
            {supplier?.notes && <InfoItem icon={<Edit3 size={14} />} label="Notes" value={supplier.notes} />}
          </div>
        )}
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard icon={<Package size={16} />} label="Linked Products" value={linkedIds.size.toString()} color="var(--adm-accent)" />
        <StatCard icon={<DollarSign size={16} />} label="Inventory Cost" value={`$${totalCostValue.toFixed(0)}`} color="var(--adm-text)" />
        <StatCard icon={<TrendingUp size={16} />} label="Gross Profit" value={`$${grossProfit.toFixed(0)}`} color={grossProfit >= 0 ? "#22c55e" : "#ef4444"} />
        <StatCard icon={<Boxes size={16} />} label="Avg Margin" value={`${avgMargin.toFixed(1)}%`} color="var(--adm-accent)" />
      </div>

      {/* 保存按钮和提示 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold" style={{ color: "var(--adm-text)" }}>Product Binding & Pricing</h2>
          {saveMsg && (
            <span className="flex items-center gap-1 text-xs" style={{ color: "#22c55e" }}>
              <Check size={12} /> {saveMsg}
            </span>
          )}
        </div>
        <button
          onClick={handleSaveAll}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
          style={{ backgroundColor: "var(--adm-accent)" }}
        >
          <Save size={14} /> {saving ? "Saving..." : "Save All Changes"}
        </button>
      </div>

      {/* 搜索 */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--adm-text-secondary)" }} />
          <input
            type="text"
            placeholder="Search products to bind..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-lg text-sm outline-none"
            style={{ backgroundColor: "var(--adm-card)", border: "1px solid var(--adm-border)", color: "var(--adm-text)" }}
          />
        </div>
        <span className="text-xs" style={{ color: "var(--adm-text-secondary)" }}>
          {linkedIds.size} / {allProducts.length} linked
        </span>
      </div>

      {/* 商品列表 */}
      <div className="space-y-2">
        {filteredProducts.map(p => {
          const isLinked = linkedIds.has(p.id)
          const cp = costPrices[p.id] || ""
          const st = stocks[p.id] || ""
          const margin = cp && p.price > 0 ? ((p.price - Number(cp)) / p.price * 100).toFixed(1) : null
          const profit = cp ? (p.price - Number(cp)).toFixed(2) : null

          return (
            <div key={p.id} onClick={() => toggleLink(p.id)} className="rounded-xl p-3 flex items-center gap-3 cursor-pointer adm-card-card" style={{
              backgroundColor: "var(--adm-card)",
              border: `1px solid ${isLinked ? 'var(--adm-accent)' : 'var(--adm-border)'}`,
              opacity: isLinked ? 1 : 0.7,
            }}>
              {/* 绑定复选框 */}
              <button
                onClick={() => toggleLink(p.id)}
                className="w-5 h-5 rounded flex items-center justify-center shrink-0 transition-all"
                style={{
                  backgroundColor: isLinked ? 'var(--adm-accent)' : 'transparent',
                  border: `1.5px solid ${isLinked ? 'var(--adm-accent)' : 'var(--adm-border)'}`,
                }}
              >
                {isLinked && <Check size={12} className="text-white" />}
              </button>

              {/* 商品图片和名称 */}
              <img src={p.image} alt="" className="w-10 h-10 rounded object-cover shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  {p.code && (
                    <span className="text-[9px] font-mono px-1 py-0.5 rounded-sm shrink-0" style={{ backgroundColor: "var(--adm-accent-bg)", color: "var(--adm-accent)" }} title="Product Code">{p.code}</span>
                  )}
                  <p className="text-sm font-medium truncate" style={{ color: "var(--adm-text)" }}>{p.name}</p>
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-[10px]" style={{ color: "var(--adm-text-secondary)" }}>Price: ${p.price.toFixed(2)}</span>
                  {p.origin && <span className="text-[10px]" style={{ color: "var(--adm-text-secondary)" }}>{p.origin}</span>}
                  {!p.active && <span className="text-[10px] px-1 rounded" style={{ color: "#ef4444", backgroundColor: "rgba(239,68,68,0.1)" }}>inactive</span>}
                </div>
              </div>

              {/* 成本价和库存输入（仅绑定时可编辑） */}
              {isLinked && (
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <label className="block text-[9px] font-medium mb-0.5" style={{ color: "var(--adm-text-secondary)" }}>Cost ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={cp}
                      onChange={e => setCostPrices({ ...costPrices, [p.id]: e.target.value })}
                      className="w-20 px-2 py-1 rounded text-xs outline-none"
                      style={{ backgroundColor: "var(--adm-bg)", border: "1px solid var(--adm-border)", color: "var(--adm-text)" }}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="text-right">
                    <label className="block text-[9px] font-medium mb-0.5" style={{ color: "var(--adm-text-secondary)" }}>Stock</label>
                    <input
                      type="number"
                      min="0"
                      value={st}
                      onChange={e => setStocks({ ...stocks, [p.id]: e.target.value })}
                      className="w-16 px-2 py-1 rounded text-xs outline-none"
                      style={{ backgroundColor: "var(--adm-bg)", border: "1px solid var(--adm-border)", color: "var(--adm-text)" }}
                      placeholder="0"
                    />
                  </div>
                  {margin && (
                    <div className="text-right w-16">
                      <p className="text-[9px]" style={{ color: "var(--adm-text-secondary)" }}>Margin</p>
                      <p className="text-xs font-semibold" style={{ color: Number(margin) > 30 ? '#22c55e' : Number(margin) > 15 ? 'var(--adm-accent)' : '#ef4444' }}>{margin}%</p>
                    </div>
                  )}
                  {profit && (
                    <div className="text-right w-16">
                      <p className="text-[9px]" style={{ color: "var(--adm-text-secondary)" }}>Profit</p>
                      <p className="text-xs font-semibold" style={{ color: "#22c55e" }}>${profit}</p>
                    </div>
                  )}
                  <Link href={`/admin/products/${p.id}/edit`} className="text-[10px] px-2 py-1 rounded shrink-0" style={{ color: "var(--adm-accent)", backgroundColor: "var(--adm-accent-bg)" }}>
                    Edit
                  </Link>
                </div>
              )}

              {!isLinked && (
                <div className="text-right shrink-0">
                  <span className="text-[10px]" style={{ color: "var(--adm-text-secondary)" }}>
                    {p.supplierId ? "Bound to other" : "Unbound"}
                  </span>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function InfoItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-medium mb-1 flex items-center gap-1" style={{ color: "var(--adm-text-secondary)" }}>
        {icon} {label}
      </p>
      <p className="text-sm" style={{ color: "var(--adm-text)" }}>{value}</p>
    </div>
  )
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl p-4" style={{ backgroundColor: "var(--adm-card)", border: "1px solid var(--adm-border)" }}>
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs" style={{ color: "var(--adm-text-secondary)" }}>{label}</p>
        <span style={{ color }}>{icon}</span>
      </div>
      <p className="text-xl font-bold" style={{ color }}>{value}</p>
    </div>
  )
}
