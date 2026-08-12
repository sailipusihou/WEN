'use client'
import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Search, Filter, Download, Users, History, Star, Tag, Mail, Phone, Calendar, ShoppingBag, FileText, Plus, X, Check, Edit3, Trash2, ChevronRight, ExternalLink, User, MapPin, Clock, Settings2, ChevronDown } from "lucide-react"
import Link from "next/link"

export default function AdminUsersPage() {
  const [activeTab, setActiveTab] = useState<'customers' | 'browsing'>('customers')
  const [customers, setCustomers] = useState<any[]>([])
  const [browsingHistory, setBrowsingHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null)
  const [editingField, setEditingField] = useState<string | null>(null)
  const [editValue, setEditValue] = useState("")
  const [newTag, setNewTag] = useState("")
  const [newPreference, setNewPreference] = useState("")
  const [customerTiers, setCustomerTiers] = useState<any[]>([])
  const [showTierSettings, setShowTierSettings] = useState(false)
  const [tierSaving, setTierSaving] = useState(false)
  const [customerOrders, setCustomerOrders] = useState<any[]>([])
  const [ordersLoading, setOrdersLoading] = useState(false)

  useEffect(() => {
    if (activeTab === 'customers') {
      fetch("/api/customer-profiles", { credentials: 'include' })
        .then(r => r.ok ? r.json() : [])
        .then(d => { setCustomers(Array.isArray(d) ? d : []) })
        .catch(() => {})
        .finally(() => setLoading(false))
    } else {
      fetch("/api/browsing-history", { credentials: 'include' })
        .then(r => r.ok ? r.json() : [])
        .then(d => { setBrowsingHistory(Array.isArray(d) ? d : []) })
        .catch(() => {})
        .finally(() => setLoading(false))
    }
  }, [activeTab])

  useEffect(() => {
    fetch("/api/settings", { credentials: 'include' })
      .then(r => r.ok ? r.json() : {})
      .then(d => { setCustomerTiers((d as any).customerTiers || []) })
      .catch(() => {})
  }, [])

  const filteredCustomers = customers.filter(u =>
    (u.firstName || "").toLowerCase().includes(search.toLowerCase()) ||
    (u.lastName || "").toLowerCase().includes(search.toLowerCase()) ||
    (u.email || "").toLowerCase().includes(search.toLowerCase()) ||
    (u.tags || []).some((t: string) => t.toLowerCase().includes(search.toLowerCase()))
  )

  const filteredBrowsing = browsingHistory.filter(b =>
    (b.productName || "").toLowerCase().includes(search.toLowerCase()) ||
    (b.email || "").toLowerCase().includes(search.toLowerCase()) ||
    (b.productCategory || "").toLowerCase().includes(search.toLowerCase()) ||
    (b.productCode || "").toLowerCase().includes(search.toLowerCase()) ||
    (b.ip || "").toLowerCase().includes(search.toLowerCase()) ||
    (b.visitorId || "").toLowerCase().includes(search.toLowerCase())
  )

  const handleSaveField = async (field: string, value: any) => {
    if (!selectedCustomer) return
    const updates: any = { [field]: value }
    const res = await fetch("/api/customer-profiles", {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ id: selectedCustomer.id, ...updates }),
    })
    if (res.ok) {
      setSelectedCustomer({ ...selectedCustomer, [field]: value })
      setCustomers(prev => prev.map(c => c.id === selectedCustomer.id ? { ...c, [field]: value } : c))
    }
    setEditingField(null)
    setEditValue("")
  }

  const handleAddTag = async () => {
    if (!selectedCustomer || !newTag.trim()) return
    const tags = [...(selectedCustomer.tags || []), newTag.trim()]
    await handleSaveField('tags', tags)
    setNewTag("")
  }

  const handleRemoveTag = async (tag: string) => {
    if (!selectedCustomer) return
    const tags = (selectedCustomer.tags || []).filter((t: string) => t !== tag)
    await handleSaveField('tags', tags)
  }

  const handleAddPreference = async () => {
    if (!selectedCustomer || !newPreference.trim()) return
    const preferences = [...(selectedCustomer.preferences || []), newPreference.trim()]
    await handleSaveField('preferences', preferences)
    setNewPreference("")
  }

  const handleRemovePreference = async (pref: string) => {
    if (!selectedCustomer) return
    const preferences = (selectedCustomer.preferences || []).filter((p: string) => p !== pref)
    await handleSaveField('preferences', preferences)
  }

  const getTierColor = (customer: any) => {
    if (customerTiers.length === 0) {
      return { bg: 'rgba(156, 163, 175, 0.1)', color: 'var(--adm-text-secondary)', label: 'Standard', stars: 1 }
    }
    const orders = customer.totalOrders || 0
    let tierInfo = customerTiers.find(t => orders >= t.minOrders && orders <= t.maxOrders)
    if (!tierInfo) tierInfo = customerTiers.find(t => t.id === customer.tier)
    if (!tierInfo) tierInfo = customerTiers[0]
    return {
      bg: tierInfo.bgColor || 'rgba(156, 163, 175, 0.1)',
      color: tierInfo.color || '#6b7280',
      label: tierInfo.name || tierInfo.id,
      stars: tierInfo.stars || 1,
    }
  }

  const updateTier = (index: number, field: string, value: any) => {
    const newTiers = [...customerTiers]
    newTiers[index] = { ...newTiers[index], [field]: value }
    setCustomerTiers(newTiers)
  }

  const saveTierRules = async () => {
    setTierSaving(true)
    try {
      const saveRes = await fetch("/api/settings", {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ customerTiers }),
      })
      if (!saveRes.ok) { setTierSaving(false); return }
      const savedData = await saveRes.json()
      if (savedData.customerTiers) setCustomerTiers(savedData.customerTiers)

      await fetch("/api/customer-profiles?action=syncOrders", { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include' })
      const res = await fetch("/api/customer-profiles", { credentials: 'include' })
      if (res.ok) setCustomers(await res.json())
    } catch { }
    setTierSaving(false)
  }

  const fetchCustomerOrders = async (email: string) => {
    setOrdersLoading(true)
    setCustomerOrders([])
    try {
      const res = await fetch(`/api/orders?customerEmail=${encodeURIComponent(email)}&pageSize=100`, { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setCustomerOrders(data.items || data || [])
      }
    } catch { }
    setOrdersLoading(false)
  }

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--adm-text)" }}>Users</h1>
          <p className="text-sm" style={{ color: "var(--adm-text-secondary)" }}>
            {activeTab === 'customers' ? `${customers.length} customers` : `${browsingHistory.length} browsing records`}
          </p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--adm-text-secondary)" }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..."
              className="pl-9 pr-3 py-2 rounded-lg text-sm w-48" style={{ backgroundColor: "var(--adm-input)", border: "1px solid var(--adm-input-border)", color: "var(--adm-text)" }} />
          </div>
          <button onClick={() => setSearch("")} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors" style={{ backgroundColor: "var(--adm-accent-bg)", color: "var(--adm-accent)" }}>
            <Filter size={14} /> Clear
          </button>
          {activeTab === 'customers' && (
            <button onClick={() => fetch("/api/customer-profiles?action=syncOrders", { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include' }).then(() => window.location.reload())} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors" style={{ backgroundColor: "var(--adm-accent-bg)", color: "var(--adm-accent)" }}>
              <RefreshCw size={14} /> Sync Orders
            </button>
          )}
          <button onClick={exportCSV} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors" style={{ backgroundColor: "var(--adm-accent-bg)", color: "var(--adm-accent)" }}>
            <Download size={14} /> CSV
          </button>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => { setActiveTab('customers'); setLoading(true) }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'customers' ? '' : ''}`}
          style={activeTab === 'customers' ? { backgroundColor: "var(--adm-accent-bg)", color: "var(--adm-accent)" } : { backgroundColor: "var(--adm-card)", color: "var(--adm-text-secondary)", border: "1px solid var(--adm-border)" }}
        >
          <Users size={15} /> Customers
        </button>
        <button
          onClick={() => { setActiveTab('browsing'); setLoading(true) }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'browsing' ? '' : ''}`}
          style={activeTab === 'browsing' ? { backgroundColor: "var(--adm-accent-bg)", color: "var(--adm-accent)" } : { backgroundColor: "var(--adm-card)", color: "var(--adm-text-secondary)", border: "1px solid var(--adm-border)" }}
        >
          <History size={15} /> Browsing History
        </button>
      </div>

      {activeTab === 'customers' ? (
        <div className="space-y-3">
          {/* 客户分级规则设置面板 */}
          <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: "var(--adm-card)", borderColor: "var(--adm-border)" }}>
            <button
              onClick={() => setShowTierSettings(!showTierSettings)}
              className="w-full flex items-center justify-between px-4 py-3 transition-colors adm-hover-bg"
            >
              <div className="flex items-center gap-2">
                <Settings2 size={16} style={{ color: "var(--adm-accent)" }} />
                <span className="text-sm font-medium" style={{ color: "var(--adm-text)" }}>Customer Tier Rules</span>
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: "var(--adm-accent-bg)", color: "var(--adm-accent)" }}>{customerTiers.length} tiers</span>
              </div>
              <ChevronDown size={16} className={`transition-transform ${showTierSettings ? 'rotate-180' : ''}`} style={{ color: "var(--adm-text-secondary)" }} />
            </button>
            {showTierSettings && (
              <div className="px-4 pb-4 border-t" style={{ borderColor: "var(--adm-border)" }}>
                <p className="text-xs mt-3 mb-3" style={{ color: "var(--adm-text-secondary)" }}>
                  Set global rules for customer tiers based on order count. Changes apply to all customers after saving and syncing.
                </p>
                <div className="space-y-3">
                  {customerTiers.map((tier, index) => (
                    <div key={tier.id || index} className="rounded-lg border p-3" style={{ backgroundColor: "var(--adm-bg)", borderColor: "var(--adm-border)" }}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-0.5" style={{ color: tier.color }}>
                            {[...Array(5)].map((_, j) => (
                              <Star key={j} size={12} fill={j < tier.stars ? 'currentColor' : 'none'} />
                            ))}
                          </div>
                          <span className="text-xs font-medium px-2 py-0.5 rounded" style={{ backgroundColor: tier.bgColor, color: tier.color }}>{tier.name}</span>
                        </div>
                        <button
                          onClick={() => setCustomerTiers(customerTiers.filter((_, i) => i !== index))}
                          className="p-1 rounded transition-colors"
                          style={{ color: "var(--adm-text-secondary)" }}
                        >
                          <X size={12} />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        <div>
                          <label className="text-[10px] block mb-1" style={{ color: "var(--adm-text-secondary)" }}>Name</label>
                          <input
                            value={tier.name || ""}
                            onChange={e => updateTier(index, 'name', e.target.value)}
                            className="w-full px-2 py-1.5 rounded text-xs"
                            style={{ backgroundColor: "var(--adm-input)", border: "1px solid var(--adm-input-border)", color: "var(--adm-text)" }}
                          />
                        </div>
                        <div>
                          <label className="text-[10px] block mb-1" style={{ color: "var(--adm-text-secondary)" }}>Min Orders</label>
                          <input
                            type="number"
                            value={tier.minOrders ?? 0}
                            onChange={e => updateTier(index, 'minOrders', Number(e.target.value))}
                            className="w-full px-2 py-1.5 rounded text-xs"
                            style={{ backgroundColor: "var(--adm-input)", border: "1px solid var(--adm-input-border)", color: "var(--adm-text)" }}
                          />
                        </div>
                        <div>
                          <label className="text-[10px] block mb-1" style={{ color: "var(--adm-text-secondary)" }}>Max Orders</label>
                          <input
                            type="number"
                            value={tier.maxOrders ?? 9999}
                            onChange={e => updateTier(index, 'maxOrders', Number(e.target.value))}
                            className="w-full px-2 py-1.5 rounded text-xs"
                            style={{ backgroundColor: "var(--adm-input)", border: "1px solid var(--adm-input-border)", color: "var(--adm-text)" }}
                          />
                        </div>
                        <div>
                          <label className="text-[10px] block mb-1" style={{ color: "var(--adm-text-secondary)" }}>Stars (1-5)</label>
                          <input
                            type="number"
                            min={1}
                            max={5}
                            value={tier.stars ?? 1}
                            onChange={e => updateTier(index, 'stars', Math.min(5, Math.max(1, Number(e.target.value))))}
                            className="w-full px-2 py-1.5 rounded text-xs"
                            style={{ backgroundColor: "var(--adm-input)", border: "1px solid var(--adm-input-border)", color: "var(--adm-text)" }}
                          />
                        </div>
                        <div>
                          <label className="text-[10px] block mb-1" style={{ color: "var(--adm-text-secondary)" }}>Star Color</label>
                          <input
                            type="color"
                            value={tier.color || "#6b7280"}
                            onChange={e => updateTier(index, 'color', e.target.value)}
                            className="w-full h-8 rounded cursor-pointer"
                            style={{ border: "1px solid var(--adm-input-border)" }}
                          />
                        </div>
                        <div>
                          <label className="text-[10px] block mb-1" style={{ color: "var(--adm-text-secondary)" }}>Badge BG</label>
                          <input
                            type="color"
                            value={tier.bgColor || "#f3f4f6"}
                            onChange={e => updateTier(index, 'bgColor', e.target.value)}
                            className="w-full h-8 rounded cursor-pointer"
                            style={{ border: "1px solid var(--adm-input-border)" }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCustomerTiers([...customerTiers, { id: `tier-${Date.now()}`, name: 'New Tier', minOrders: 0, maxOrders: 9999, stars: 1, color: '#6b7280', bgColor: '#f3f4f6' }])}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                      style={{ backgroundColor: "var(--adm-accent-bg)", color: "var(--adm-accent)", border: "none", cursor: "pointer" }}
                    >
                      <Plus size={12} /> Add Tier
                    </button>
                    <button
                      onClick={saveTierRules}
                      disabled={tierSaving}
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium transition-colors ml-auto"
                      style={{ backgroundColor: "var(--adm-accent)", color: "var(--adm-accent-text)", border: "none", cursor: tierSaving ? "wait" : "pointer", opacity: tierSaving ? 0.6 : 1 }}
                    >
                      {tierSaving ? 'Saving...' : 'Save & Sync'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {filteredCustomers.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-sm" style={{ color: "var(--adm-text-secondary)" }}>No customers found.</p>
            </div>
          ) : (
            filteredCustomers.map((c, i) => {
              const tierInfo = getTierColor(c)
              return (
                <motion.div key={c.id || c.email || i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                  className="rounded-xl border p-4 cursor-pointer transition-all adm-hover-bg"
                  style={{ backgroundColor: "var(--adm-card)", borderColor: "var(--adm-border)" }}
                  onClick={() => { setSelectedCustomer(c); fetchCustomerOrders(c.email) }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold" style={{ backgroundColor: "var(--adm-accent-bg)", color: "var(--adm-accent)" }}>
                        {c.avatar ? <img src={c.avatar} className="w-full h-full rounded-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).parentElement!.innerText = (c.firstName || c.email || "U")[0].toUpperCase() }} /> : (c.firstName || c.email || "U")[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium" style={{ color: "var(--adm-text)" }}>{c.firstName || "Unknown"} {c.lastName || ""}</p>
                        <p className="text-xs" style={{ color: "var(--adm-text-secondary)" }}>{c.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1" style={{ color: tierInfo.color }}>
                        {[...Array(5)].map((_, j) => (
                          <Star key={j} size={12} fill={j < tierInfo.stars ? 'currentColor' : 'none'} />
                        ))}
                      </div>
                      <span className="text-[10px] px-2 py-1 rounded-full font-medium" style={{ backgroundColor: tierInfo.bg, color: tierInfo.color }}>{tierInfo.label}</span>
                      <span className="text-xs" style={{ color: "var(--adm-text-secondary)" }}>${(c.totalSpent || 0).toFixed(0)}</span>
                      <span className="text-xs" style={{ color: "var(--adm-text-secondary)" }}>{c.totalOrders} orders</span>
                      <ChevronRight size={16} className="text-gray-400" />
                    </div>
                  </div>
                  {c.tags && c.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {c.tags.slice(0, 3).map((tag: string) => (
                        <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: "var(--adm-input)", color: "var(--adm-text-secondary)" }}>{tag}</span>
                      ))}
                      {c.tags.length > 3 && <span className="text-[10px]" style={{ color: "var(--adm-text-secondary)" }}>+{c.tags.length - 3} more</span>}
                    </div>
                  )}
                </motion.div>
              )
            })
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredBrowsing.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-sm" style={{ color: "var(--adm-text-secondary)" }}>No browsing history found.</p>
            </div>
          ) : (
            filteredBrowsing.map((b, i) => (
              <motion.div key={b.id || i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
                className="rounded-xl border p-4 adm-hover-bg"
                style={{ backgroundColor: "var(--adm-card)", borderColor: "var(--adm-border)" }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0" style={{ backgroundColor: "var(--adm-accent-bg)", color: "var(--adm-accent)" }}>
                    {b.email ? (b.email[0] || 'U').toUpperCase() : <User size={16} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate" style={{ color: "var(--adm-text)" }}>
                        {b.email || 'Guest Visitor'}
                      </p>
                      {b.email ? (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: "var(--adm-accent-bg)", color: "var(--adm-accent)" }}>Registered</span>
                      ) : (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: "var(--adm-input)", color: "var(--adm-text-secondary)" }}>Guest</span>
                      )}
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: "var(--adm-text-secondary)" }}>
                      <span className="inline-flex items-center gap-1" title={b.visitorId || ''}>
                        <MapPin size={10} /> {b.ip || 'unknown'}
                      </span>
                      <span className="mx-1.5">·</span>
                      <span className="inline-flex items-center gap-1">
                        <Clock size={10} /> {b.duration > 60 ? `${Math.floor(b.duration / 60)}m ${b.duration % 60}s` : `${b.duration}s`}
                      </span>
                      <span className="mx-1.5">·</span>
                      <span>{new Date(b.timestamp).toLocaleString()}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0" style={{ backgroundColor: "var(--adm-input)" }}>
                      {b.productImage ? <img src={b.productImage} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><ShoppingBag size={12} style={{ color: "var(--adm-text-secondary)" }} /></div>}
                    </div>
                    <div className="text-right max-w-[160px]">
                      <div className="flex items-center gap-1 justify-end">
                        {b.productCode && (
                          <span className="text-[9px] font-mono px-1 py-0.5 rounded-sm shrink-0" style={{ backgroundColor: "var(--adm-accent-bg)", color: "var(--adm-accent)" }} title="Product Code">{b.productCode}</span>
                        )}
                        <p className="text-xs font-medium truncate" style={{ color: "var(--adm-text)" }}>{b.productName}</p>
                      </div>
                      <p className="text-[10px]" style={{ color: "var(--adm-text-secondary)" }}>${(b.productPrice || 0).toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      )}

      <AnimatePresence>
        {selectedCustomer && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setSelectedCustomer(null)}>
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              className="w-full max-w-3xl rounded-xl border max-h-[90vh] overflow-y-auto" style={{ backgroundColor: "var(--adm-card)", borderColor: "var(--adm-border)" }} onClick={e => e.stopPropagation()}>
              <div className="p-6 border-b" style={{ borderColor: "var(--adm-border)" }}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold" style={{ backgroundColor: "var(--adm-accent-bg)", color: "var(--adm-accent)" }}>
                      {selectedCustomer.avatar ? <img src={selectedCustomer.avatar} className="w-full h-full rounded-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).parentElement!.innerText = (selectedCustomer.firstName || selectedCustomer.email || "U")[0].toUpperCase() }} /> : (selectedCustomer.firstName || selectedCustomer.email || "U")[0].toUpperCase()}
                    </div>
                    <div>
                      <h2 className="text-lg font-bold" style={{ color: "var(--adm-text)" }}>{selectedCustomer.firstName || "Unknown"} {selectedCustomer.lastName || ""}</h2>
                      <p className="text-sm" style={{ color: "var(--adm-text-secondary)" }}>{selectedCustomer.email}</p>
                    </div>
                  </div>
                  <button onClick={() => setSelectedCustomer(null)} className="p-2 rounded-lg transition-colors" style={{ color: "var(--adm-text-secondary)" }}>
                    <X size={18} />
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  <div className="p-3 rounded-lg" style={{ backgroundColor: "var(--adm-bg)" }}>
                    <p className="text-xs" style={{ color: "var(--adm-text-secondary)" }}>Orders</p>
                    <p className="text-lg font-bold" style={{ color: "var(--adm-text)" }}>{selectedCustomer.totalOrders}</p>
                  </div>
                  <div className="p-3 rounded-lg" style={{ backgroundColor: "var(--adm-bg)" }}>
                    <p className="text-xs" style={{ color: "var(--adm-text-secondary)" }}>Total Spent</p>
                    <p className="text-lg font-bold" style={{ color: "var(--adm-text)" }}>${(selectedCustomer.totalSpent || 0).toFixed(0)}</p>
                  </div>
                  <div className="p-3 rounded-lg" style={{ backgroundColor: "var(--adm-bg)" }}>
                    <p className="text-xs" style={{ color: "var(--adm-text-secondary)" }}>Rating</p>
                    <div className="flex items-center gap-1 mt-1" style={{ color: getTierColor(selectedCustomer).color }}>
                      {[...Array(5)].map((_, j) => (
                        <Star key={j} size={14} fill={j < getTierColor(selectedCustomer).stars ? 'currentColor' : 'none'} />
                      ))}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg" style={{ backgroundColor: "var(--adm-bg)" }}>
                    <p className="text-xs" style={{ color: "var(--adm-text-secondary)" }}>Tier</p>
                    <p className="text-lg font-bold" style={{ color: getTierColor(selectedCustomer).color }}>
                      {getTierColor(selectedCustomer).label}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-6">
                <div>
                  <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--adm-text)" }}>Contact Info</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg" style={{ backgroundColor: "var(--adm-bg)" }}>
                      <div className="flex items-center gap-2 mb-1">
                        <Mail size={12} style={{ color: "var(--adm-accent)" }} />
                        <span className="text-xs" style={{ color: "var(--adm-text-secondary)" }}>Email</span>
                      </div>
                      <p className="text-sm" style={{ color: "var(--adm-text)" }}>{selectedCustomer.email}</p>
                    </div>
                    <div className="p-3 rounded-lg" style={{ backgroundColor: "var(--adm-bg)" }}>
                      <div className="flex items-center gap-2 mb-1">
                        <Phone size={12} style={{ color: "var(--adm-accent)" }} />
                        <span className="text-xs" style={{ color: "var(--adm-text-secondary)" }}>Phone</span>
                      </div>
                      <p className="text-sm" style={{ color: "var(--adm-text)" }}>{selectedCustomer.phone || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--adm-text)" }}>Tier & Rating</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg" style={{ backgroundColor: "var(--adm-bg)" }}>
                      <span className="text-xs" style={{ color: "var(--adm-text-secondary)" }}>Customer Tier</span>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-sm font-bold px-3 py-1.5 rounded-lg" style={{ backgroundColor: getTierColor(selectedCustomer).bg, color: getTierColor(selectedCustomer).color }}>
                          {getTierColor(selectedCustomer).label}
                        </span>
                      </div>
                    </div>
                    <div className="p-3 rounded-lg" style={{ backgroundColor: "var(--adm-bg)" }}>
                      <span className="text-xs" style={{ color: "var(--adm-text-secondary)" }}>Rating</span>
                      <div className="flex items-center gap-1 mt-2" style={{ color: getTierColor(selectedCustomer).color }}>
                        {[...Array(5)].map((_, j) => (
                          <Star key={j} size={16} fill={j < getTierColor(selectedCustomer).stars ? 'currentColor' : 'none'} />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--adm-text)" }}>Tags</h3>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {(selectedCustomer.tags || []).map((tag: string) => (
                      <span key={tag} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full" style={{ backgroundColor: "var(--adm-accent-bg)", color: "var(--adm-accent)" }}>
                        {tag}
                        <button onClick={() => handleRemoveTag(tag)} className="hover:opacity-70"><X size={10} /></button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newTag}
                      onChange={e => setNewTag(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleAddTag()}
                      placeholder="Add tag..."
                      className="flex-1 px-3 py-2 rounded-lg text-sm" style={{ backgroundColor: "var(--adm-input)", border: "1px solid var(--adm-input-border)", color: "var(--adm-text)" }} />
                    <button onClick={handleAddTag} className="px-3 py-2 rounded-lg text-sm font-medium transition-colors" style={{ backgroundColor: "var(--adm-accent-bg)", color: "var(--adm-accent)" }}>
                      <Plus size={14} />
                    </button>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--adm-text)" }}>Preferences</h3>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {(selectedCustomer.preferences || []).map((pref: string) => (
                      <span key={pref} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full" style={{ backgroundColor: "var(--adm-input)", color: "var(--adm-text-secondary)" }}>
                        {pref}
                        <button onClick={() => handleRemovePreference(pref)} className="hover:opacity-70"><X size={10} /></button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newPreference}
                      onChange={e => setNewPreference(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleAddPreference()}
                      placeholder="Add preference..."
                      className="flex-1 px-3 py-2 rounded-lg text-sm" style={{ backgroundColor: "var(--adm-input)", border: "1px solid var(--adm-input-border)", color: "var(--adm-text)" }} />
                    <button onClick={handleAddPreference} className="px-3 py-2 rounded-lg text-sm font-medium transition-colors" style={{ backgroundColor: "var(--adm-accent-bg)", color: "var(--adm-accent)" }}>
                      <Plus size={14} />
                    </button>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--adm-text)" }}>Notes</h3>
                  <textarea
                    value={selectedCustomer.notes || ""}
                    onChange={e => handleSaveField('notes', e.target.value)}
                    placeholder="Add notes about this customer..."
                    rows={3}
                    className="w-full px-3 py-2 rounded-lg text-sm resize-none" style={{ backgroundColor: "var(--adm-input)", border: "1px solid var(--adm-input-border)", color: "var(--adm-text)" }} />
                </div>

                <div>
                  <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--adm-text)" }}>Timeline</h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs" style={{ color: "var(--adm-text-secondary)" }}>
                      <Calendar size={12} />
                      <span>Created: {new Date(selectedCustomer.createdAt).toLocaleString()}</span>
                    </div>
                    {selectedCustomer.lastOrderAt && (
                      <div className="flex items-center gap-2 text-xs" style={{ color: "var(--adm-text-secondary)" }}>
                        <ShoppingBag size={12} />
                        <span>Last Order: {new Date(selectedCustomer.lastOrderAt).toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--adm-text)" }}>Order History</h3>
                  {ordersLoading ? (
                    <div className="flex items-center justify-center py-6">
                      <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : customerOrders.length === 0 ? (
                    <p className="text-xs py-4 text-center" style={{ color: "var(--adm-text-secondary)" }}>No orders found.</p>
                  ) : (
                    <div className="space-y-2">
                      {customerOrders.map(order => {
                        const statusColors: Record<string, { bg: string; color: string }> = {
                          pending: { bg: 'rgba(245, 158, 11, 0.15)', color: '#d97706' },
                          confirmed: { bg: 'rgba(59, 130, 246, 0.15)', color: '#2563eb' },
                          processing: { bg: 'rgba(99, 102, 241, 0.15)', color: '#4f46e5' },
                          shipped: { bg: 'rgba(168, 85, 247, 0.15)', color: '#9333ea' },
                          delivered: { bg: 'rgba(16, 185, 129, 0.15)', color: '#059669' },
                          cancelled: { bg: 'rgba(239, 68, 68, 0.15)', color: '#dc2626' },
                          return_requested: { bg: 'rgba(249, 115, 22, 0.15)', color: '#ea580c' },
                          return_approved: { bg: 'rgba(6, 182, 212, 0.15)', color: '#0891b2' },
                          return_shipped: { bg: 'rgba(139, 92, 246, 0.15)', color: '#7c3aed' },
                          return_delivered: { bg: 'rgba(20, 184, 166, 0.15)', color: '#0d9488' },
                          refunded: { bg: 'rgba(244, 63, 94, 0.15)', color: '#e11d48' },
                        }
                        const sc = statusColors[order.status] || { bg: 'rgba(156, 163, 175, 0.15)', color: '#6b7280' }
                        return (
                          <Link
                            key={order.id}
                            href={`/admin/orders?order=${order.id}`}
                            className="flex items-center justify-between gap-2 p-3 rounded-lg border transition-colors adm-hover-bg"
                            style={{ backgroundColor: "var(--adm-bg)", borderColor: "var(--adm-border)" }}
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <span className="font-mono text-xs font-bold" style={{ color: "var(--adm-text)" }}>{order.id}</span>
                              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: sc.bg, color: sc.color }}>
                                {order.status?.charAt(0).toUpperCase() + order.status?.slice(1).replace(/_/g, ' ')}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <span className="text-xs" style={{ color: "var(--adm-text-secondary)" }}>
                                {order.items?.length || 0} items
                              </span>
                              <span className="text-xs" style={{ color: "var(--adm-text-secondary)" }}>
                                {new Date(order.createdAt).toLocaleDateString()}
                              </span>
                              <span className="font-bold text-sm" style={{ color: "var(--adm-text)" }}>
                                ${(order.total || 0).toFixed(2)}
                              </span>
                              <ExternalLink size={12} style={{ color: "var(--adm-text-secondary)" }} />
                            </div>
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )

  function exportCSV() {
    let header = ""
    let rows = []
    if (activeTab === 'customers') {
      header = "Name,Email,Phone,Tier,Rating,Orders,TotalSpent,LastOrder,Notes\n"
      rows = customers.map(c => `${c.firstName} ${c.lastName},${c.email},${c.phone || ''},${c.tier},${c.rating},${c.totalOrders},${c.totalSpent},${c.lastOrderAt || ''},${c.notes || ''}`)
    } else {
      header = "Code,Product,Price,Category,Email,VisitorId,Duration,Timestamp\n"
      rows = browsingHistory.map(b => `${b.productCode || ''},${b.productName},${b.productPrice},${b.productCategory},${b.email || ''},${b.visitorId},${b.duration},${b.timestamp}`)
    }
    const blob = new Blob([header + rows.join("\n")], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url; a.download = `${activeTab === 'customers' ? 'customers' : 'browsing'}-${new Date().toISOString().slice(0, 10)}.csv`; a.click()
    URL.revokeObjectURL(url)
  }
}

function RefreshCw({ size = 16, className = "" }: { size?: number; className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  )
}

