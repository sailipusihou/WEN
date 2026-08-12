"use client"
import { useState, useEffect, useCallback } from "react"
import {
  Boxes, Search, Download, Upload, Save, Check, AlertCircle,
  Package, TrendingDown, DollarSign, PackageX, X, FileSpreadsheet, CheckCircle, Loader2
} from "lucide-react"
import { parseFile } from "@/lib/file-parser"

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

interface Supplier {
  id: string
  name: string
}

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<'all' | 'low' | 'out' | 'instock'>('all')
  const [stockEdits, setStockEdits] = useState<Record<string, string>>({})
  const [costEdits, setCostEdits] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState("")
  const [showImportPreview, setShowImportPreview] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importData, setImportData] = useState<any[]>([])
  const [importing, setImporting] = useState(false)

  const loadData = useCallback(() => {
    setLoading(true)
    Promise.all([
      fetch("/api/products").then(r => r.ok ? r.json() : []).then(d => Array.isArray(d) ? d : (d.items || [])),
      fetch("/api/suppliers").then(r => r.ok ? r.json() : []).then(d => Array.isArray(d) ? d : []),
    ]).then(([prods, sups]) => {
      setProducts(prods)
      setSuppliers(sups)
      setLoading(false)
    })
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const supplierName = (id?: string) => suppliers.find(s => s.id === id)?.name || ""

  const filtered = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.nameEn || "").toLowerCase().includes(search.toLowerCase()) ||
      (p.category || "").toLowerCase().includes(search.toLowerCase()) ||
      (p.code || "").toLowerCase().includes(search.toLowerCase())
    if (!matchSearch) return false
    const stock = p.stock || 0
    if (filter === 'low') return stock > 0 && stock <= 5
    if (filter === 'out') return stock === 0
    if (filter === 'instock') return stock > 5
    return true
  })

  const handleSave = async () => {
    setSaving(true)
    setSaveMsg("")
    let updated = 0
    for (const p of products) {
      const updates: any = {}
      const st = stockEdits[p.id]
      if (st !== undefined && st !== (p.stock?.toString() || "0")) {
        updates.stock = Number(st) || 0
      }
      const cp = costEdits[p.id]
      if (cp !== undefined && cp !== (p.costPrice?.toString() || "")) {
        updates.costPrice = cp ? Number(cp) : null
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
    setStockEdits({})
    setCostEdits({})
    loadData()
  }

  const handleExport = () => {
    const headers = ["Code", "ID", "Name", "Category", "Price", "Cost Price", "Stock", "Stock Value (Cost)", "Stock Value (Retail)", "Supplier", "Origin", "Status"]
    const rows = products.map(p => {
      const stock = p.stock || 0
      const cost = p.costPrice || 0
      return [
        p.code || "", p.id, p.name, p.category || "", p.price, cost, stock,
        (cost * stock).toFixed(2), (p.price * stock).toFixed(2),
        supplierName(p.supplierId), p.origin || "",
        p.active !== false ? "active" : "inactive",
      ]
    })
    const csv = [headers, ...rows]
      .map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `inventory-${new Date().toISOString().slice(0, 10)}.csv`
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
    for (const obj of importData) {
      const id = obj.id || obj.ID || obj.Id
      if (!id) continue
      const updates: any = {}
      const costPrice = obj["cost price"] ?? obj["Cost Price"] ?? obj["costPrice"] ?? obj["CostPrice"]
      const stock = obj["stock"] ?? obj["Stock"] ?? obj["STOCK"]
      if (costPrice !== undefined) updates.costPrice = costPrice ? Number(costPrice) : null
      if (stock !== undefined) updates.stock = Number(stock) || 0
      if (Object.keys(updates).length === 0) continue
      const res = await fetch(`/api/products/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      })
      if (res.ok) imported++
    }
    setImporting(false)
    setShowImportPreview(false)
    setImportFile(null)
    setImportData([])
    alert(`Updated ${imported} product(s) from file`)
    loadData()
  }

  // 统计
  const totalProducts = products.length
  const outOfStock = products.filter(p => (p.stock || 0) === 0).length
  const lowStock = products.filter(p => { const s = p.stock || 0; return s > 0 && s <= 5 }).length
  const totalStockValue = products.reduce((sum, p) => sum + (p.costPrice || 0) * (p.stock || 0), 0)
  const totalRetailValue = products.reduce((sum, p) => sum + p.price * (p.stock || 0), 0)

  const hasEdits = Object.keys(stockEdits).length > 0 || Object.keys(costEdits).length > 0

  return (
    <div>
      {/* 标题栏 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--adm-text)" }}>Inventory</h1>
          <p className="text-sm mt-1" style={{ color: "var(--adm-text-secondary)" }}>Manage stock levels, cost prices, and inventory valuation</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium adm-hover-bg" style={{ color: "var(--adm-text-secondary)", border: "1px solid var(--adm-border)" }}>
            <Download size={16} /> Export
          </button>
          <label className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium adm-hover-bg cursor-pointer" style={{ color: "var(--adm-text-secondary)", border: "1px solid var(--adm-border)" }}>
            <Upload size={16} /> Import
            <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFileSelect} />
          </label>
          {hasEdits && (
            <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50" style={{ backgroundColor: "var(--adm-accent)" }}>
              <Save size={14} /> {saving ? "Saving..." : "Save Changes"}
            </button>
          )}
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="rounded-xl p-4 adm-card-card cursor-pointer" style={{ backgroundColor: "var(--adm-card)", border: "1px solid var(--adm-border)" }}>
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs" style={{ color: "var(--adm-text-secondary)" }}>Total Products</p>
            <Package size={16} style={{ color: "var(--adm-accent)" }} />
          </div>
          <p className="text-xl font-bold" style={{ color: "var(--adm-text)" }}>{totalProducts}</p>
        </div>
        <div className="rounded-xl p-4 adm-card-card cursor-pointer" style={{ backgroundColor: "var(--adm-card)", border: "1px solid var(--adm-border)" }}>
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs" style={{ color: "var(--adm-text-secondary)" }}>Out of Stock</p>
            <PackageX size={16} style={{ color: "#ef4444" }} />
          </div>
          <p className="text-xl font-bold" style={{ color: "#ef4444" }}>{outOfStock}</p>
          {lowStock > 0 && <p className="text-[10px] mt-0.5" style={{ color: "#f59e0b" }}>{lowStock} low stock</p>}
        </div>
        <div className="rounded-xl p-4 adm-card-card cursor-pointer" style={{ backgroundColor: "var(--adm-card)", border: "1px solid var(--adm-border)" }}>
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs" style={{ color: "var(--adm-text-secondary)" }}>Stock Value (Cost)</p>
            <DollarSign size={16} style={{ color: "var(--adm-text)" }} />
          </div>
          <p className="text-xl font-bold" style={{ color: "var(--adm-text)" }}>${totalStockValue.toFixed(0)}</p>
        </div>
        <div className="rounded-xl p-4 adm-card-card cursor-pointer" style={{ backgroundColor: "var(--adm-card)", border: "1px solid var(--adm-border)" }}>
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs" style={{ color: "var(--adm-text-secondary)" }}>Stock Value (Retail)</p>
            <TrendingDown size={16} style={{ color: "#22c55e" }} />
          </div>
          <p className="text-xl font-bold" style={{ color: "#22c55e" }}>${totalRetailValue.toFixed(0)}</p>
          <p className="text-[10px] mt-0.5" style={{ color: "var(--adm-text-secondary)" }}>Profit: ${(totalRetailValue - totalStockValue).toFixed(0)}</p>
        </div>
      </div>

      {/* 搜索和筛选 */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--adm-text-secondary)" }} />
          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-lg text-sm outline-none"
            style={{ backgroundColor: "var(--adm-card)", border: "1px solid var(--adm-border)", color: "var(--adm-text)" }}
          />
        </div>
        <div className="flex items-center gap-1">
          {([
            { key: 'all', label: 'All' },
            { key: 'instock', label: 'In Stock' },
            { key: 'low', label: 'Low' },
            { key: 'out', label: 'Out' },
          ] as const).map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className="px-3 py-2 rounded-lg text-xs font-medium transition-all"
              style={{
                backgroundColor: filter === f.key ? 'var(--adm-accent)' : 'transparent',
                color: filter === f.key ? '#fff' : 'var(--adm-text-secondary)',
                border: `1px solid ${filter === f.key ? 'var(--adm-accent)' : 'var(--adm-border)'}`,
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* 保存提示 */}
      {saveMsg && (
        <div className="mb-3 flex items-center gap-2 text-xs" style={{ color: "#22c55e" }}>
          <Check size={14} /> {saveMsg}
        </div>
      )}

      {/* 商品列表表格 */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: "var(--adm-border)", borderTopColor: "var(--adm-accent)" }} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <Boxes size={48} className="mx-auto mb-4 opacity-20" style={{ color: "var(--adm-text-secondary)" }} />
          <p style={{ color: "var(--adm-text-secondary)" }}>No products found</p>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ backgroundColor: "var(--adm-card)", border: "1px solid var(--adm-border)" }}>
          {/* 表头 */}
          <div className="grid grid-cols-12 gap-3 px-4 py-3 text-[10px] font-medium uppercase tracking-wider" style={{ backgroundColor: "var(--adm-bg)", color: "var(--adm-text-secondary)", borderBottom: "1px solid var(--adm-border)" }}>
            <div className="col-span-4">Product</div>
            <div className="col-span-2 text-right">Price</div>
            <div className="col-span-2 text-right">Cost</div>
            <div className="col-span-2 text-right">Stock</div>
            <div className="col-span-1 text-right">Margin</div>
            <div className="col-span-1 text-right">Value</div>
          </div>
          {/* 表格行 */}
          {filtered.map(p => {
            const stock = stockEdits[p.id] !== undefined ? stockEdits[p.id] : (p.stock?.toString() || "0")
            const cost = costEdits[p.id] !== undefined ? costEdits[p.id] : (p.costPrice?.toString() || "")
            const stockNum = Number(stock) || 0
            const costNum = Number(cost) || 0
            const margin = costNum > 0 && p.price > 0 ? ((p.price - costNum) / p.price * 100).toFixed(0) : null
            const stockValue = costNum * stockNum
            const isLow = stockNum > 0 && stockNum <= 5
            const isOut = stockNum === 0

            return (
              <div key={p.id} className="grid grid-cols-12 gap-3 px-4 py-2.5 items-center" style={{ borderBottom: "1px solid var(--adm-border)" }}>
                {/* 商品信息 */}
                <div className="col-span-4 flex items-center gap-3 min-w-0">
                  <img src={p.image} alt="" className="w-8 h-8 rounded object-cover shrink-0" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      {p.code && (
                        <span className="text-[9px] font-mono px-1 py-0.5 rounded-sm shrink-0" style={{ backgroundColor: "var(--adm-accent-bg)", color: "var(--adm-accent)" }} title="Product Code">{p.code}</span>
                      )}
                      <p className="text-xs font-medium truncate" style={{ color: "var(--adm-text)" }}>{p.name}</p>
                    </div>
                    <p className="text-[10px]" style={{ color: "var(--adm-text-secondary)" }}>
                      {p.category} {supplierName(p.supplierId) ? `· ${supplierName(p.supplierId)}` : ''}
                    </p>
                  </div>
                </div>
                {/* 价格 */}
                <div className="col-span-2 text-right">
                  <span className="text-xs font-medium" style={{ color: "var(--adm-text)" }}>${p.price.toFixed(2)}</span>
                </div>
                {/* 成本价（可编辑） */}
                <div className="col-span-2 text-right">
                  <input
                    type="number"
                    step="0.01"
                    value={cost}
                    onChange={e => setCostEdits({ ...costEdits, [p.id]: e.target.value })}
                    className="w-20 px-2 py-1 rounded text-xs outline-none text-right ml-auto block"
                    style={{ backgroundColor: "var(--adm-bg)", border: "1px solid var(--adm-border)", color: "var(--adm-text)" }}
                    placeholder="—"
                  />
                </div>
                {/* 库存（可编辑） */}
                <div className="col-span-2 text-right">
                  <input
                    type="number"
                    min="0"
                    value={stock}
                    onChange={e => setStockEdits({ ...stockEdits, [p.id]: e.target.value })}
                    className="w-16 px-2 py-1 rounded text-xs outline-none text-right ml-auto block"
                    style={{
                      backgroundColor: isOut ? 'rgba(239,68,68,0.1)' : isLow ? 'rgba(245,158,11,0.1)' : 'var(--adm-bg)',
                      border: `1px solid ${isOut ? '#ef4444' : isLow ? '#f59e0b' : 'var(--adm-border)'}`,
                      color: isOut ? '#ef4444' : isLow ? '#f59e0b' : 'var(--adm-text)',
                    }}
                  />
                </div>
                {/* 毛利率 */}
                <div className="col-span-1 text-right">
                  {margin ? (
                    <span className="text-xs font-semibold" style={{ color: Number(margin) > 30 ? '#22c55e' : Number(margin) > 15 ? 'var(--adm-accent)' : '#ef4444' }}>{margin}%</span>
                  ) : (
                    <span className="text-[10px]" style={{ color: "var(--adm-text-secondary)" }}>—</span>
                  )}
                </div>
                {/* 库存价值 */}
                <div className="col-span-1 text-right">
                  <span className="text-xs" style={{ color: "var(--adm-text-secondary)" }}>${stockValue.toFixed(0)}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* 底部提示 */}
      {!loading && filtered.length > 0 && (
        <p className="text-[10px] mt-3" style={{ color: "var(--adm-text-secondary)" }}>
          Showing {filtered.length} of {products.length} products. Edit stock and cost values inline, then click Save Changes to update.
        </p>
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
              {/* File Info */}
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

              {/* Preview Table */}
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


