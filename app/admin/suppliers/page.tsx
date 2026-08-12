"use client"
import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
  Factory, Plus, Search, ArrowLeft, Save, Trash2, X, Edit3, ChevronDown, ChevronUp,
  Package, DollarSign, TrendingUp, Download, Upload, MapPin, Phone, Mail, UserCircle,
  Check, AlertCircle, FileSpreadsheet, CheckCircle, Loader2
} from "lucide-react"
import { parseFile } from "@/lib/file-parser"

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
  createdAt: string
  updatedAt: string
  productCount?: number
  products?: any[]
}

export default function SuppliersPage() {
  const router = useRouter()
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Supplier | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [showImportPreview, setShowImportPreview] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importData, setImportData] = useState<any[]>([])
  const [importing, setImporting] = useState(false)
  const [form, setForm] = useState({
    name: "",
    contact: "",
    phone: "",
    email: "",
    address: "",
    region: "",
    status: "active" as 'active' | 'inactive',
    notes: "",
  })

  useEffect(() => {
    fetch("/api/auth/check").then(r => r.ok && r.json()).then(d => {
      if (d?.user) setCurrentUser(d.user)
    })
    loadSuppliers()
  }, [])

  const loadSuppliers = () => {
    setLoading(true)
    fetch("/api/suppliers?withProducts=true").then(r => r.ok && r.json()).then(data => {
      setSuppliers(data || [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }

  const filtered = suppliers.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.contact || "").toLowerCase().includes(search.toLowerCase()) ||
    (s.region || "").toLowerCase().includes(search.toLowerCase()) ||
    (s.email || "").toLowerCase().includes(search.toLowerCase())
  )

  const resetForm = () => {
    setForm({ name: "", contact: "", phone: "", email: "", address: "", region: "", status: "active", notes: "" })
    setEditing(null)
  }

  const handleEdit = (s: Supplier) => {
    setEditing(s)
    setForm({
      name: s.name,
      contact: s.contact || "",
      phone: s.phone || "",
      email: s.email || "",
      address: s.address || "",
      region: s.region || "",
      status: s.status,
      notes: s.notes || "",
    })
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) return
    const body = editing
      ? { id: editing.id, ...form }
      : { ...form }
    const res = await fetch("/api/suppliers", {
      method: editing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    if (res.ok) {
      resetForm()
      setShowForm(false)
      loadSuppliers()
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this supplier? This will not delete associated products.")) return
    const res = await fetch("/api/suppliers?id=" + id, { method: "DELETE" })
    if (res.ok) loadSuppliers()
  }

  const handleExport = () => {
    const data = suppliers.map(s => ({
      name: s.name,
      contact: s.contact || "",
      phone: s.phone || "",
      email: s.email || "",
      address: s.address || "",
      region: s.region || "",
      status: s.status,
      notes: s.notes || "",
    }))
    const csv = [
      ["Name", "Contact", "Phone", "Email", "Address", "Region", "Status", "Notes"],
      ...data.map(d => [d.name, d.contact, d.phone, d.email, d.address, d.region, d.status, d.notes]),
    ].map(row => row.map(v => `"${(v || "").replace(/"/g, '""')}"`).join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `suppliers-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const rows = await parseFile(file)
      if (rows.length === 0) { alert("File is empty or missing header row"); e.target.value = ""; return }
      setImportFile(file)
      setImportData(rows)
      setShowImportPreview(true)
    } catch (err) {
      alert(`Failed to read file: ${(err as Error).message}`)
    }
    e.target.value = ""
  }

  const handleConfirmImport = async () => {
    if (importData.length === 0) return
    setImporting(true)
    let imported = 0
    for (const row of importData) {
      const obj: any = {}
      Object.keys(row).forEach(k => { obj[k.toLowerCase()] = row[k] })
      if (!obj.name) continue
      const res = await fetch("/api/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: obj.name,
          contact: obj.contact || "",
          phone: obj.phone || "",
          email: obj.email || "",
          address: obj.address || "",
          region: obj.region || "",
          status: obj.status === 'inactive' ? 'inactive' : 'active',
          notes: obj.notes || "",
        }),
      })
      if (res.ok) imported++
    }
    setImporting(false)
    setShowImportPreview(false)
    setImportFile(null)
    setImportData([])
    alert(`Imported ${imported} suppliers`)
    loadSuppliers()
  }

  // 统计
  const totalProducts = suppliers.reduce((sum, s) => sum + (s.productCount || 0), 0)
  const activeSuppliers = suppliers.filter(s => s.status === 'active').length
  const avgProducts = suppliers.length > 0 ? (totalProducts / suppliers.length).toFixed(1) : "0"

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--adm-text)" }}>Suppliers</h1>
          <p className="text-sm mt-1" style={{ color: "var(--adm-text-secondary)" }}>Manage product suppliers, pricing, and margins</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium adm-hover-bg" style={{ color: "var(--adm-text-secondary)", border: "1px solid var(--adm-border)" }}>
            <Download size={16} /> Export
          </button>
          <label className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium adm-hover-bg cursor-pointer" style={{ color: "var(--adm-text-secondary)", border: "1px solid var(--adm-border)" }}>
            <Upload size={16} /> Import
            <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFileSelect} />
          </label>
          <button onClick={() => { resetForm(); setShowForm(true) }} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: "var(--adm-accent)" }}>
            <Plus size={16} /> Add Supplier
          </button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="rounded-xl p-4" style={{ backgroundColor: "var(--adm-card)", border: "1px solid var(--adm-border)" }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs" style={{ color: "var(--adm-text-secondary)" }}>Total Suppliers</p>
              <p className="text-2xl font-bold" style={{ color: "var(--adm-text)" }}>{suppliers.length}</p>
            </div>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: "var(--adm-accent-bg)" }}>
              <Factory size={18} style={{ color: "var(--adm-accent)" }} />
            </div>
          </div>
          <p className="text-xs mt-2" style={{ color: "var(--adm-text-secondary)" }}>{activeSuppliers} active</p>
        </div>
        <div className="rounded-xl p-4" style={{ backgroundColor: "var(--adm-card)", border: "1px solid var(--adm-border)" }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs" style={{ color: "var(--adm-text-secondary)" }}>Linked Products</p>
              <p className="text-2xl font-bold" style={{ color: "var(--adm-text)" }}>{totalProducts}</p>
            </div>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: "var(--adm-accent-bg)" }}>
              <Package size={18} style={{ color: "var(--adm-accent)" }} />
            </div>
          </div>
          <p className="text-xs mt-2" style={{ color: "var(--adm-text-secondary)" }}>{avgProducts} avg per supplier</p>
        </div>
        <div className="rounded-xl p-4" style={{ backgroundColor: "var(--adm-card)", border: "1px solid var(--adm-border)" }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs" style={{ color: "var(--adm-text-secondary)" }}>Avg Margin</p>
              <p className="text-2xl font-bold" style={{ color: "var(--adm-accent)" }}>
                {(() => {
                  const prods = suppliers.flatMap(s => s.products || [])
                  const withCost = prods.filter((p: any) => p.costPrice && p.costPrice > 0 && p.price > 0)
                  if (withCost.length === 0) return "N/A"
                  const avgMargin = withCost.reduce((sum: number, p: any) => sum + ((p.price - p.costPrice) / p.price * 100), 0) / withCost.length
                  return avgMargin.toFixed(1) + "%"
                })()}
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: "var(--adm-accent-bg)" }}>
              <TrendingUp size={18} style={{ color: "var(--adm-accent)" }} />
            </div>
          </div>
          <p className="text-xs mt-2" style={{ color: "var(--adm-text-secondary)" }}>Based on linked products</p>
        </div>
      </div>

      {/* 搜索 */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--adm-text-secondary)" }} />
          <input
            type="text"
            placeholder="Search suppliers..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-lg text-sm outline-none"
            style={{ backgroundColor: "var(--adm-card)", border: "1px solid var(--adm-border)", color: "var(--adm-text)" }}
          />
        </div>
      </div>

      {/* 供货商表单 */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mb-6 overflow-hidden">
            <div className="rounded-xl p-5" style={{ backgroundColor: "var(--adm-card)", border: "1px solid var(--adm-border)" }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold" style={{ color: "var(--adm-text)" }}>{editing ? "Edit Supplier" : "Add Supplier"}</h3>
                <button onClick={() => { setShowForm(false); resetForm() }} className="p-1 rounded-lg hover:bg-black/5">
                  <X size={16} style={{ color: "var(--adm-text-secondary)" }} />
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--adm-text-secondary)" }}>Name *</label>
                  <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={{ backgroundColor: "var(--adm-bg)", border: "1px solid var(--adm-border)", color: "var(--adm-text)" }} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--adm-text-secondary)" }}>Contact Person</label>
                  <input value={form.contact} onChange={e => setForm({ ...form, contact: e.target.value })} className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={{ backgroundColor: "var(--adm-bg)", border: "1px solid var(--adm-border)", color: "var(--adm-text)" }} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--adm-text-secondary)" }}>Phone</label>
                  <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={{ backgroundColor: "var(--adm-bg)", border: "1px solid var(--adm-border)", color: "var(--adm-text)" }} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--adm-text-secondary)" }}>Email</label>
                  <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={{ backgroundColor: "var(--adm-bg)", border: "1px solid var(--adm-border)", color: "var(--adm-text)" }} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--adm-text-secondary)" }}>Region</label>
                  <input value={form.region} onChange={e => setForm({ ...form, region: e.target.value })} className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={{ backgroundColor: "var(--adm-bg)", border: "1px solid var(--adm-border)", color: "var(--adm-text)" }} placeholder="e.g. Zhejiang, China" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--adm-text-secondary)" }}>Status</label>
                  <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as 'active' | 'inactive' })} className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={{ backgroundColor: "var(--adm-bg)", border: "1px solid var(--adm-border)", color: "var(--adm-text)" }}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                <div className="md:col-span-2 lg:col-span-3">
                  <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--adm-text-secondary)" }}>Address</label>
                  <input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={{ backgroundColor: "var(--adm-bg)", border: "1px solid var(--adm-border)", color: "var(--adm-text)" }} />
                </div>
                <div className="md:col-span-2 lg:col-span-3">
                  <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--adm-text-secondary)" }}>Notes</label>
                  <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none" style={{ backgroundColor: "var(--adm-bg)", border: "1px solid var(--adm-border)", color: "var(--adm-text)" }} />
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 mt-4">
                <button onClick={() => { setShowForm(false); resetForm() }} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ color: "var(--adm-text-secondary)" }}>Cancel</button>
                <button onClick={handleSave} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: "var(--adm-accent)" }}>
                  <Save size={14} /> {editing ? "Update" : "Save"}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 供货商列表 */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: "var(--adm-border)", borderTopColor: "var(--adm-accent)" }} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <Factory size={48} className="mx-auto mb-4 opacity-20" style={{ color: "var(--adm-text-secondary)" }} />
          <p style={{ color: "var(--adm-text-secondary)" }}>No suppliers found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(s => (
            <div key={s.id} className="rounded-xl overflow-hidden transition-all hover:shadow-md" style={{ backgroundColor: "var(--adm-card)", border: "1px solid var(--adm-border)" }}>
              <div className="p-4 flex items-center gap-4 cursor-pointer adm-hover-bg transition-all" onClick={() => router.push(`/admin/suppliers/${s.id}`)}>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: s.status === 'active' ? 'var(--adm-accent-bg)' : 'var(--adm-bg)', color: s.status === 'active' ? 'var(--adm-accent)' : 'var(--adm-text-secondary)' }}>
                  <Factory size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium" style={{ color: "var(--adm-text)" }}>{s.name}</p>
                    <span className="px-1.5 py-0.5 text-[10px] font-medium rounded-full" style={{ backgroundColor: s.status === 'active' ? 'rgba(34,197,94,0.15)' : 'var(--adm-bg)', color: s.status === 'active' ? '#22c55e' : 'var(--adm-text-secondary)' }}>
                      {s.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    {s.region && <span className="flex items-center gap-1 text-[10px]" style={{ color: "var(--adm-text-secondary)" }}><MapPin size={10} /> {s.region}</span>}
                    {s.contact && <span className="flex items-center gap-1 text-[10px]" style={{ color: "var(--adm-text-secondary)" }}><UserCircle size={10} /> {s.contact}</span>}
                    {s.phone && <span className="flex items-center gap-1 text-[10px]" style={{ color: "var(--adm-text-secondary)" }}><Phone size={10} /> {s.phone}</span>}
                    {s.email && <span className="flex items-center gap-1 text-[10px]" style={{ color: "var(--adm-text-secondary)" }}><Mail size={10} /> {s.email}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-4 shrink-0" onClick={e => e.stopPropagation()}>
                  <div className="text-right">
                    <p className="text-lg font-bold" style={{ color: "var(--adm-text)" }}>{s.productCount || 0}</p>
                    <p className="text-[10px]" style={{ color: "var(--adm-text-secondary)" }}>Products</p>
                  </div>
                  <button onClick={() => setExpanded(expanded === s.id ? null : s.id)} className="p-1.5 rounded-lg adm-hover-bg">
                    {expanded === s.id ? <ChevronUp size={16} style={{ color: "var(--adm-text-secondary)" }} /> : <ChevronDown size={16} style={{ color: "var(--adm-text-secondary)" }} />}
                  </button>
                  <button onClick={() => handleEdit(s)} className="p-1.5 rounded-lg adm-hover-bg">
                    <Edit3 size={14} style={{ color: "var(--adm-accent)" }} />
                  </button>
                  <button onClick={() => handleDelete(s.id)} className="p-1.5 rounded-lg adm-hover-bg">
                    <Trash2 size={14} style={{ color: "var(--adm-text-secondary)" }} />
                  </button>
                </div>
              </div>
              {expanded === s.id && s.products && s.products.length > 0 && (
                <div className="border-t px-4 py-3 space-y-2" style={{ borderColor: "var(--adm-border)" }}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-medium" style={{ color: "var(--adm-text-secondary)" }}>Linked Products</p>
                    <Link href={`/admin/suppliers/${s.id}`} className="text-[10px] flex items-center gap-1" style={{ color: "var(--adm-accent)" }}>
                      View Detail <ArrowLeft size={10} className="rotate-180" />
                    </Link>
                  </div>
                  {s.products.map((p: any) => {
                    const margin = p.costPrice && p.price > 0 ? ((p.price - p.costPrice) / p.price * 100).toFixed(1) : null
                    return (
                      <div key={p.id} className="flex items-center gap-3 p-2 rounded-lg" style={{ backgroundColor: "var(--adm-bg)" }}>
                        <img src={p.image} alt="" className="w-10 h-10 rounded object-cover shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            {p.code && (
                              <span className="text-[9px] font-mono px-1 py-0.5 rounded-sm shrink-0" style={{ backgroundColor: "var(--adm-accent-bg)", color: "var(--adm-accent)" }} title="Product Code">{p.code}</span>
                            )}
                            <p className="text-xs font-medium truncate" style={{ color: "var(--adm-text)" }}>{p.name}</p>
                          </div>
                          <div className="flex items-center gap-3 mt-0.5">
                            <span className="text-[10px]" style={{ color: "var(--adm-text-secondary)" }}>${p.price?.toFixed(2)}</span>
                            {p.costPrice && <span className="text-[10px]" style={{ color: "var(--adm-text-secondary)" }}>Cost: ${p.costPrice?.toFixed(2)}</span>}
                            {margin && <span className="text-[10px]" style={{ color: Number(margin) > 30 ? '#22c55e' : Number(margin) > 15 ? 'var(--adm-accent)' : '#ef4444' }}>Margin: {margin}%</span>}
                            <span className="text-[10px]" style={{ color: "var(--adm-text-secondary)" }}>Stock: {p.stock || 0}</span>
                          </div>
                        </div>
                        <Link href={`/admin/products/${p.id}/edit`} className="text-[10px] px-2 py-1 rounded" style={{ color: "var(--adm-accent)", backgroundColor: "var(--adm-accent-bg)" }}>Edit</Link>
                      </div>
                    )
                  })}
                </div>
              )}
              {expanded === s.id && (!s.products || s.products.length === 0) && (
                <div className="border-t px-4 py-3 text-center" style={{ borderColor: "var(--adm-border)" }}>
                  <p className="text-xs" style={{ color: "var(--adm-text-secondary)" }}>No products linked to this supplier</p>
                  <Link href={`/admin/suppliers/${s.id}`} className="text-xs mt-1 inline-block" style={{ color: "var(--adm-accent)" }}>Click to bind products</Link>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Import Preview Modal */}
      {showImportPreview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => { if (!importing) setShowImportPreview(false) }}>
          <div className="rounded-xl w-full max-w-2xl max-h-[85vh] flex flex-col" style={{ backgroundColor: "var(--adm-card)", border: "1px solid var(--adm-border)" }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: "var(--adm-border)" }}>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg" style={{ backgroundColor: "var(--adm-accent-bg)" }}>
                  <Upload size={20} style={{ color: "var(--adm-accent)" }} />
                </div>
                <div>
                  <h2 className="text-base font-semibold" style={{ color: "var(--adm-text)" }}>Import Preview</h2>
                  <p className="text-xs mt-0.5" style={{ color: "var(--adm-text-secondary)" }}>
                    Review the file before importing
                  </p>
                </div>
              </div>
              <button onClick={() => { if (!importing) setShowImportPreview(false) }}
                className="p-1.5 rounded-lg transition-colors" style={{ color: "var(--adm-text-secondary)" }}>
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              <div className="rounded-xl p-4 border-2 border-dashed" style={{ borderColor: "var(--adm-accent)", backgroundColor: "var(--adm-accent-bg)" }}>
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg" style={{ backgroundColor: "var(--adm-accent)", color: "var(--adm-accent-text)" }}>
                    <FileSpreadsheet size={24} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: "var(--adm-text)" }}>
                      {importFile?.name}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs" style={{ color: "var(--adm-text-secondary)" }}>
                        {importFile ? `${(importFile.size / 1024).toFixed(1)} KB` : ""}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: "var(--adm-accent)", color: "var(--adm-accent-text)" }}>
                        {importData.length} rows
                      </span>
                    </div>
                  </div>
                  <CheckCircle size={20} style={{ color: "var(--adm-accent)" }} />
                </div>
              </div>

              <div>
                <p className="text-xs font-medium mb-2" style={{ color: "var(--adm-text-secondary)" }}>
                  Preview (first 10 rows)
                </p>
                <div className="rounded-lg border overflow-hidden" style={{ borderColor: "var(--adm-border)" }}>
                  <div className="overflow-x-auto max-h-64 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="sticky top-0 z-10" style={{ backgroundColor: "var(--adm-bg)" }}>
                        <tr>
                          {importData.length > 0 && Object.keys(importData[0]).map(key => (
                            <th key={key} className="px-3 py-2 text-left font-medium whitespace-nowrap" style={{ color: "var(--adm-text-secondary)", borderBottom: "1px solid var(--adm-border)" }}>
                              {key}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {importData.slice(0, 10).map((row, idx) => (
                          <tr key={idx} className="adm-hover-bg">
                            {Object.keys(importData[0]).map(key => (
                              <td key={key} className="px-3 py-2 whitespace-nowrap" style={{ color: "var(--adm-text)", borderBottom: "1px solid var(--adm-border)" }}>
                                {String(row[key] ?? '')}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                {importData.length > 10 && (
                  <p className="text-xs mt-2 text-center" style={{ color: "var(--adm-text-secondary)" }}>
                    ... and {importData.length - 10} more rows
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-5 border-t" style={{ borderColor: "var(--adm-border)" }}>
              <button onClick={() => { if (!importing) setShowImportPreview(false) }} disabled={importing}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors" style={{ color: "var(--adm-text-secondary)", border: "1px solid var(--adm-border)" }}>
                Cancel
              </button>
              <button onClick={handleConfirmImport} disabled={importing || importData.length === 0}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50" style={{ backgroundColor: "var(--adm-accent)" }}>
                {importing ? (
                  <span className="flex items-center gap-2">
                    <Loader2 size={14} className="animate-spin" /> Importing...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <CheckCircle size={14} /> Confirm Import
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

