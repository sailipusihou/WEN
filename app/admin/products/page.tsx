'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { PlusCircle, Edit, Trash2, Search, Eye, EyeOff, Package, Upload, Download, FileSpreadsheet, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import type { Product } from '@/lib/db'
import OptimizedImage from '@/components/ui/OptimizedImage'
import { parseFile } from '@/lib/file-parser'

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showImport, setShowImport] = useState(false)
  const [importData, setImportData] = useState<any[]>([])
  const [importResults, setImportResults] = useState<any>(null)
  const [importing, setImporting] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importError, setImportError] = useState("")
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')

  const fetchProducts = useCallback(async () => {
    try {
      const r = await fetch('/api/products?activeOnly=false')
      if (r.ok) {
        const data = await r.json()
        setProducts(Array.isArray(data) ? data : (data.items || []))
      }
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchProducts() }, [fetchProducts])

  const toggleActive = async (id: string, current: boolean) => {
    try {
      const r = await fetch(`/api/products/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ active: !current }) })
      if (!r.ok) {
        const err = await r.json().catch(() => ({}))
        alert(err.error || `Failed to update product (HTTP ${r.status})`)
        return
      }
      fetchProducts()
    } catch (e: any) {
      alert(e.message || 'Network error while updating product')
    }
  }

  const deleteProduct = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return
    try {
      const r = await fetch(`/api/products/${id}`, { method: 'DELETE' })
      if (!r.ok) {
        const err = await r.json().catch(() => ({}))
        alert(err.error || `Failed to delete product (HTTP ${r.status})`)
        return
      }
      fetchProducts()
    } catch (e: any) {
      alert(e.message || 'Network error while deleting product')
    }
  }

  const filtered = useMemo(() => {
    return products.filter(p => {
      if (filter === 'active' && !p.active) return false
      if (filter === 'inactive' && p.active) return false
      if (categoryFilter !== 'all' && p.category !== categoryFilter) return false
      if (search) {
        const q = search.toLowerCase()
        return p.name.toLowerCase().includes(q) || (p.nameEn || '').toLowerCase().includes(q) || p.id.toLowerCase().includes(q) || (p.code || '').toLowerCase().includes(q)
      }
      return true
    })
  }, [products, filter, search, categoryFilter])

  const categories = useMemo(() => {
    const cats = new Set(products.map(p => p.category))
    return Array.from(cats)
  }, [products])

  
  // ---- Import Handlers ----
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImportFile(file)
    setImportError("")
    setImportResults(null)

    try {
      const rows = await parseFile(file)
      if (rows.length === 0) {
        setImportError("File is empty or missing header row")
        return
      }
      const products = rows.filter(row => row.name || row.nameEn || row.Name || row.name_en)
      if (products.length === 0) {
        setImportError("No valid products found in file. Make sure the file has a header row with column names.")
        return
      }
      setImportData(products)
    } catch (err: any) {
      setImportError(`Parse error: ${err.message}`)
    }
  }

  const handleImport = async () => {
    if (importData.length === 0) return
    setImporting(true)
    try {
      const res = await fetch('/api/products/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products: importData }),
      })
      if (res.ok) {
        const result = await res.json()
        setImportResults(result)
        fetchProducts()
      } else {
        const err = await res.json()
        setImportError(err.error || 'Import failed')
      }
    } catch (e: any) {
      setImportError(e.message || 'Network error')
    } finally {
      setImporting(false)
    }
  }

  const getCatLabel = (s: string) => ({ 'cultural-gifts': 'Cultural Gifts', 'home-decor': 'Home Decor', 'creative-gifts': 'Gift Ideas' }[s] || s)

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-serif text-2xl md:text-3xl adm-text-primary">Products</h1>
          <p className="font-sans text-xs adm-text-secondary mt-1">{products.length} total · {products.filter(p => p.active).length} active</p>
        </div>
        <button onClick={() => setShowImport(true)} className="inline-flex items-center gap-2 px-5 py-2.5 border border-indigo-400/30 text-indigo-400 font-serif text-sm tracking-wider hover:bg-indigo-500/10 transition-colors rounded-sm">
          <Upload size={16} /> Batch Import
        </button>
        <Link href="/admin/products/new" className="inline-flex items-center gap-2 px-5 py-2.5 bg-seal-red text-white font-serif text-sm tracking-wider hover:bg-zhu-red-dark transition-colors rounded-sm">
          <PlusCircle size={16} /> Add Product
        </Link>
      </div>

      {/* Search & Filters */}
      <div className="rounded-xl border p-4 mb-6 adm-card">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 adm-text-secondary" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products..."
              className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-sm text-sm adm-text-primary placeholder:text-white/50 focus:outline-none focus:border-gold/40 transition-colors font-sans" />
          </div>
          {/* Category Filter */}
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 bg-white/5 border border-white/10 rounded-sm text-sm adm-text-secondary focus:outline-none focus:border-gold/40 font-sans">
            <option value="all">All Categories</option>
            {categories.map(c => <option key={c} value={c}>{getCatLabel(c)}</option>)}
          </select>
        </div>
        {/* Status Filter */}
        <div className="flex gap-2 mt-3">
          {(['all', 'active', 'inactive'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1 text-xs font-sans rounded-sm border transition-colors ${filter === f ? 'adm-accent-bg adm-accent border-transparent' : 'bg-white/5 border-white/10 adm-text-secondary hover:border-white/30'}`}>
              {f === 'all' ? 'All' : f === 'active' ? 'Active' : 'Inactive'}
            </button>
          ))}
        </div>
      </div>

      {/* Products Table */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 adm-text-secondary">
          <Package size={40} className="mx-auto mb-4 opacity-30" />
          <p className="font-serif text-lg">{search || categoryFilter !== 'all' ? 'No matching products' : 'No products yet'}</p>
          <Link href="/admin/products/new" className="adm-accent hover:underline text-sm font-sans mt-2 inline-block">Add your first product</Link>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((product, i) => (
            <motion.div key={product.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
              className="adm-card border adm-border adm-hover-bg transition-colors rounded-xl">
              <div className="flex items-center gap-4 p-4">
                {/* Thumbnail */}
                <div className="w-12 h-12 rounded-sm shrink-0 overflow-hidden relative bg-gray-200 dark:bg-gray-700">
                  <OptimizedImage src={product.image} alt={product.nameEn || product.name} fill sizes="48px" objectFit="cover" />
                </div>
                
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {product.code && (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-sm" style={{ backgroundColor: "var(--adm-accent-bg)", color: "var(--adm-accent)" }} title="Product Code">{product.code}</span>
                    )}
                    <p className="font-sans text-sm adm-text-primary font-medium">{product.nameEn || product.name}</p>
                    {product.name && product.name !== (product.nameEn || product.name) && (
                      <span className="font-sans text-[10px] adm-text-secondary">{product.name}</span>
                    )}
                    <span className="text-[10px] font-sans adm-text-secondary bg-white/5 px-1.5 py-0.5 rounded-sm">{getCatLabel(product.category)}</span>
                  </div>
                  <p className="font-sans text-xs adm-text-secondary mt-0.5 truncate">{product.subtitleEn || product.subtitle}</p>
                </div>

                {/* Price (定价基线 USD) */}
                <div className="hidden sm:block text-right">
                  <p className="font-serif text-sm font-bold text-otb-gold dark:text-gold">${product.price.toFixed(2)}</p>
                  <p className="font-en text-[10px] adm-text-secondary">{product.price} USD</p>
                </div>

                {/* Status */}
                <button type="button" onClick={() => toggleActive(product.id, product.active)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-sm text-xs font-sans transition-colors shrink-0 ${
                    product.active ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}>
                  {product.active ? <Eye size={12} /> : <EyeOff size={12} />}
                  <span className="hidden sm:inline">{product.active ? 'Active' : 'Draft'}</span>
                </button>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <Link href={`/admin/products/${product.id}/edit`} className="p-1.5 adm-text-secondary hover:text-gold transition-colors" title="Edit">
                    <Edit size={15} />
                  </Link>
                  <button type="button" onClick={() => deleteProduct(product.id, product.name)} className="p-1.5 adm-text-secondary hover:text-red-400 transition-colors" title="Delete">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
      {/* ===== IMPORT MODAL ===== */}
      {showImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
          onClick={() => { if (!importing) setShowImport(false) }}>
          <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-2xl rounded-xl border overflow-hidden"
            style={{ backgroundColor: "var(--adm-card)", borderColor: "var(--adm-border)" }}
            onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: "var(--adm-border)" }}>
              <div className="flex items-center gap-3">
                <FileSpreadsheet size={20} style={{ color: "var(--adm-accent)" }} />
                <div>
                  <h2 className="text-base font-semibold" style={{ color: "var(--adm-text)" }}>Import Products from Excel</h2>
                  <p className="text-xs mt-0.5" style={{ color: "var(--adm-text-secondary)" }}>
                    Upload an Excel or CSV file to batch import products
                  </p>
                </div>
              </div>
              <button onClick={() => { if (!importing) setShowImport(false) }}
                className="p-1.5 rounded-lg transition-colors" style={{ color: "var(--adm-text-secondary)" }}>
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Step 1: Download Template */}
              <div className="rounded-lg p-4" style={{ backgroundColor: "var(--adm-input)" }}>
                <p className="text-sm font-medium mb-2" style={{ color: "var(--adm-text)" }}>Step 1: Download Template</p>
                <p className="text-xs mb-3" style={{ color: "var(--adm-text-secondary)" }}>
                  Start with our template to ensure correct formatting
                </p>
                <a href="/api/products/template" target="_blank"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  style={{ backgroundColor: "var(--adm-accent)", color: "white" }}>
                  <Download size={14} /> Download CSV Template
                </a>
              </div>

              {/* Step 2: Upload File */}
              <div className="rounded-lg p-4" style={{ backgroundColor: "var(--adm-input)" }}>
                <p className="text-sm font-medium mb-2" style={{ color: "var(--adm-text)" }}>Step 2: Upload Your File</p>
                <p className="text-xs mb-3" style={{ color: "var(--adm-text-secondary)" }}>
                  Columns: name, nameEn, subtitle, price, category, image, tags, featured, etc.
                </p>

                <label className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-8 cursor-pointer transition-colors hover:opacity-80"
                  style={{ borderColor: importFile ? "var(--adm-accent)" : "var(--adm-border)", backgroundColor: importFile ? "var(--adm-accent-bg)" : "transparent" }}>
                  {importFile ? (
                    <div className="flex items-center gap-3 w-full">
                      <div className="p-2.5 rounded-lg shrink-0" style={{ backgroundColor: "var(--adm-accent)", color: "var(--adm-accent-text)" }}>
                        <FileSpreadsheet size={24} />
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <p className="text-sm font-semibold truncate" style={{ color: "var(--adm-text)" }}>
                          {importFile.name}
                        </p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs" style={{ color: "var(--adm-text-secondary)" }}>
                            {(importFile.size / 1024).toFixed(1)} KB
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: "var(--adm-accent)", color: "var(--adm-accent-text)" }}>
                            {importData.length} rows
                          </span>
                        </div>
                      </div>
                      <CheckCircle size={20} style={{ color: "var(--adm-accent)" }} />
                    </div>
                  ) : (
                    <>
                      <Upload size={32} className="mb-2" style={{ color: "var(--adm-accent)" }} />
                      <p className="text-sm font-medium" style={{ color: "var(--adm-text)" }}>
                        Click to select file
                      </p>
                      <p className="text-xs mt-1" style={{ color: "var(--adm-text-secondary)" }}>
                        Supports .csv, .xlsx, .xls files
                      </p>
                    </>
                  )}
                  <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFileSelect} />
                </label>

                {importError && (
                  <p className="text-xs mt-2 flex items-center gap-1" style={{ color: "#ef4444" }}>
                    <AlertCircle size={12} /> {importError}
                  </p>
                )}
              </div>

              {/* Preview */}
              {importData.length > 0 && (
                <div className="rounded-lg p-4" style={{ backgroundColor: "var(--adm-input)" }}>
                  <p className="text-sm font-medium mb-2" style={{ color: "var(--adm-text)" }}>
                    Preview ({importData.length} products ready to import)
                  </p>
                  <div className="max-h-64 overflow-auto rounded border" style={{ borderColor: "var(--adm-border)" }}>
                    <table className="w-full text-xs" style={{ minWidth: "680px" }}>
                      <thead className="sticky top-0 z-10">
                        <tr style={{ backgroundColor: "var(--adm-card)" }}>
                          <th className="text-left px-2 py-1.5 font-medium" style={{ color: "var(--adm-text-secondary)" }}>Code</th>
                          <th className="text-left px-2 py-1.5 font-medium" style={{ color: "var(--adm-text-secondary)" }}>Name</th>
                          <th className="text-left px-2 py-1.5 font-medium" style={{ color: "var(--adm-text-secondary)" }}>Name (EN)</th>
                          <th className="text-right px-2 py-1.5 font-medium" style={{ color: "var(--adm-text-secondary)" }}>Price</th>
                          <th className="text-left px-2 py-1.5 font-medium" style={{ color: "var(--adm-text-secondary)" }}>Category</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importData.slice(0, 20).map((p, i) => (
                          <tr key={i} className="border-t" style={{ borderColor: "var(--adm-border)" }}>
                            <td className="px-2 py-1.5 font-mono" style={{ color: "var(--adm-accent)" }}>{p.code || <span style={{ color: "var(--adm-text-secondary)" }}>auto</span>}</td>
                            <td className="px-2 py-1.5" style={{ color: "var(--adm-text)" }}>{p.name || "-"}</td>
                            <td className="px-2 py-1.5" style={{ color: "var(--adm-text-secondary)" }}>{p.nameEn || "-"}</td>
                            <td className="px-2 py-1.5 text-right" style={{ color: "var(--adm-text)" }}>${p.price || 0}</td>
                            <td className="px-2 py-1.5" style={{ color: "var(--adm-text-secondary)" }}>{p.category || "-"}</td>
                          </tr>
                        ))}
                        {importData.length > 20 && (
                          <tr><td colSpan={5} className="px-2 py-1.5 text-center" style={{ color: "var(--adm-text-secondary)" }}>... and {importData.length - 20} more</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Results */}
              {importResults && (
                <div className="rounded-lg p-4" style={{ backgroundColor: "rgba(16,185,129,0.08)" }}>
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle size={16} style={{ color: "#10b981" }} />
                    <p className="text-sm font-medium" style={{ color: "#10b981" }}>Import Complete</p>
                  </div>
                  <p className="text-xs" style={{ color: "var(--adm-text-secondary)" }}>
                    New: <strong>{importResults.imported || 0}</strong>
                    {importResults.updated > 0 && <> · Updated: <strong>{importResults.updated}</strong></>}
                    {importResults.skipped > 0 && <> · Skipped: <strong>{importResults.skipped}</strong></>}
                  </p>
                  {importResults.errors?.length > 0 && (
                    <div className="mt-2 max-h-32 overflow-y-auto">
                      {importResults.errors.map((err: string, i: number) => (
                        <p key={i} className="text-[11px] flex items-start gap-1 mt-1" style={{ color: "#f59e0b" }}>
                          <AlertCircle size={10} className="shrink-0 mt-0.5" /> {err}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 p-4 border-t" style={{ borderColor: "var(--adm-border)" }}>
              <button onClick={() => setShowImport(false)} disabled={importing}
                className="px-4 py-2 rounded-lg text-sm transition-colors" style={{ color: "var(--adm-text-secondary)" }}>
                Close
              </button>
              <button
                onClick={() => {
                  if (importResults) {
                    // 导入完成后点击 "Done"：关闭弹窗并重置状态
                    setShowImport(false)
                    setImportResults(null)
                    setImportData([])
                    setImportFile(null)
                    setImportError("")
                  } else {
                    handleImport()
                  }
                }}
                disabled={importing || (!importResults && importData.length === 0)}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50"
                style={{ backgroundColor: importResults ? "#10b981" : "var(--adm-accent)" }}>
                {importing ? <><Loader2 size={15} className="animate-spin" /> Importing...</>
                  : importResults ? <><CheckCircle size={15} /> Done</>
                  : <><Upload size={15} /> Import {importData.length} Products</>}
              </button>
            </div>
          </motion.div>
        </div>
      )}

    </div>
  )
}

