'use client'

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Save, ArrowLeft, Upload, X, ImagePlus, Link as LinkIcon, Factory, RefreshCw, Plus, Video } from "lucide-react"
import type { Product } from "@/lib/db"
import { CNY_TO_USD } from "@/lib/cart-types"

interface SupplierOption { id: string; name: string; region?: string }

interface ProductFormProps { initial?: Product | null }

// 美元/人民币双向换算输入 (USD 为存储基准; 在 ¥ 框输入人民币自动换算成美元)
function UsdCnyField({ label, value, onUsdChange, required, placeholder }: {
  label: string
  value: string
  onUsdChange: (v: string) => void
  required?: boolean
  placeholder?: string
}) {
  const [cny, setCny] = useState(value ? String(Math.round(Number(value) * CNY_TO_USD * 100) / 100) : "")
  const [editing, setEditing] = useState<"usd" | "cny">("usd")
  useEffect(() => {
    if (editing !== "cny") setCny(value ? String(Math.round(Number(value) * CNY_TO_USD * 100) / 100) : "")
  }, [value, editing])
  const inputCls = "w-full px-4 py-2.5 rounded-lg text-sm"
  const inputStyle = { backgroundColor: "var(--adm-input)", border: "1px solid var(--adm-input-border)", color: "var(--adm-text)" }
  return (
    <Field label={label}>
      <div className="flex items-center gap-2">
        <div className="flex-1 relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs opacity-40">$</span>
          <input type="number" step="0.01" required={required} value={value}
            onFocus={() => setEditing("usd")}
            onChange={e => onUsdChange(e.target.value)}
            className={`${inputCls} pl-7`} style={inputStyle} placeholder={placeholder || "USD"} />
        </div>
        <span className="text-xs opacity-40">≈</span>
        <div className="flex-1 relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs opacity-40">¥</span>
          <input type="number" step="0.01" value={cny}
            onFocus={() => setEditing("cny")}
            onChange={e => {
              setCny(e.target.value)
              const v = Number(e.target.value)
              if (!Number.isNaN(v) && v > 0) onUsdChange(String(Math.round((v / CNY_TO_USD) * 100) / 100))
            }}
            className={`${inputCls} pl-7`} style={inputStyle} placeholder="CNY" />
        </div>
      </div>
      <p className="text-[10px] opacity-40 mt-1">直接填美元，或在 ¥ 框输入人民币自动换算为美元</p>
    </Field>
  )
}

export default function ProductForm({ initial }: ProductFormProps) {
  const router = useRouter()
  const isEdit = !!initial
  const [saving, setSaving] = useState(false)
  const [catOptions, setCatOptions] = useState([])
  const [supplierOptions, setSupplierOptions] = useState<SupplierOption[]>([])
  const [error, setError] = useState("")
  const [uploading, setUploading] = useState(false)
  const [detailUploading, setDetailUploading] = useState(false)
  const [videoUploading, setVideoUploading] = useState(false)
  const [showUrlInput, setShowUrlInput] = useState(false)
  const [urlValue, setUrlValue] = useState("")
  const [seedReviews, setSeedReviews] = useState<any[]>([])
  const [pendingSeeds, setPendingSeeds] = useState<any[]>([])
  const [seedSaving, setSeedSaving] = useState(false)
  const [seedAvatarUploading, setSeedAvatarUploading] = useState(false)
  const [seedForm, setSeedForm] = useState({
    author: "",
    avatar: "",
    location: "",
    rating: 5,
    content: "",
    date: new Date().toISOString().slice(0, 10),
  })

  useEffect(() => {
    if (!initial?.id) return
    fetch(`/api/reviews?productId=${encodeURIComponent(initial.id)}&source=admin`)
      .then(r => (r.ok ? r.json() : []))
      .then(d => { if (Array.isArray(d)) setSeedReviews(d) })
      .catch(() => {})
  }, [initial?.id])

  const saveSeedReview = async (seed: any, productId: string) => {
    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source: "admin", productId, ...seed }),
    })
    if (!res.ok) return false
    const data = await res.json()
    if (data.review) {
      setSeedReviews(prev => [...prev.filter(r => r.id !== data.review.id), data.review])
    }
    return true
  }

  const addSeedReview = async () => {
    if (!seedForm.content.trim()) return
    setSeedSaving(true)
    try {
      const seed = {
        author: seedForm.author.trim() || "Anonymous",
        avatar: seedForm.avatar.trim() || undefined,
        location: seedForm.location.trim() || "Verified Buyer",
        rating: Number(seedForm.rating) || 5,
        content: seedForm.content.trim(),
        date: seedForm.date || undefined,
      }
      if (isEdit && initial?.id) {
        await saveSeedReview(seed, initial.id)
      } else {
        setPendingSeeds(prev => [...prev, seed])
        setSeedReviews(prev => [...prev, { ...seed, id: "PENDING-" + prev.length, pending: true }])
      }
      setSeedForm({ author: "", avatar: "", location: "", rating: 5, content: "", date: new Date().toISOString().slice(0, 10) })
    } finally {
      setSeedSaving(false)
    }
  }

  const deleteSeedReview = async (id: string) => {
    if (id.startsWith("PENDING-")) {
      const idx = Number(id.replace("PENDING-", ""))
      setPendingSeeds(prev => prev.filter((_, i) => i !== idx))
      setSeedReviews(prev => prev.filter(r => r.id !== id))
      return
    }
    await fetch("/api/reviews", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, deleted: true }),
    })
    setSeedReviews(prev => prev.filter(r => r.id !== id))
  }

  const handleSeedAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) return
    setSeedAvatarUploading(true)
    try {
      const fd = new FormData()
      fd.append("file", file)
      fd.append("type", "avatar")
      const res = await fetch("/api/upload", { method: "POST", body: fd })
      if (res.ok) {
        const d = await res.json()
        if (d.url) setSeedForm(s => ({ ...s, avatar: d.url }))
      }
    } catch {}
    finally {
      setSeedAvatarUploading(false)
      e.target.value = ""
    }
  }

  useEffect(() => {
    fetch("/api/categories").then(r => r.ok && r.json()).then(d => { if (d) setCatOptions(d) })
    fetch("/api/suppliers").then(r => r.ok && r.json()).then(d => {
      if (Array.isArray(d)) setSupplierOptions(d.map((s: any) => ({ id: s.id, name: s.name, region: s.region })))
    })
  }, [])

  const [form, setForm] = useState({
    code: initial?.code || "",
    name: initial?.name || "",
    nameEn: initial?.nameEn || "",
    subtitle: initial?.subtitle || "",
    subtitleEn: initial?.subtitleEn || "",
    description: initial?.description || "",
    descriptionEn: initial?.descriptionEn || "",
    story: initial?.story || "",
    storyEn: initial?.storyEn || "",
    price: initial?.price?.toString() || "",
    originalPrice: initial?.originalPrice?.toString() || "",
    costPrice: initial?.costPrice?.toString() || "",
    stock: initial?.stock?.toString() || "0",
    supplierId: initial?.supplierId || "",
    category: initial?.category || "cultural-gifts",
    tags: initial?.tags?.join(", ") || "",
    tagsEn: initial?.tagsEn?.join(", ") || "",
    image: initial?.image || "",
    detailImages: initial?.detailImages || [],
    video: initial?.video || "",
    videoEnabled: initial?.videoEnabled || false,
    craft: initial?.craft || "",
    craftEn: initial?.craftEn || "",
    material: initial?.material || "",
    origin: initial?.origin || "",
    rating: initial?.rating?.toString() || "0",
    reviewCount: initial?.reviewCount?.toString() || "0",
    featured: initial?.featured || false,
    active: initial?.active !== false,
  })

  function update(field: string, value: any) { setForm(prev => ({ ...prev, [field]: value })) }

  // 调用后端生成下一个规律性编码 (基于当前分类)
  const handleGenerateCode = async () => {
    try {
      // 复用 GET /api/products 拉取已用编码, 前端按规则生成
      const res = await fetch("/api/products?activeOnly=false")
      if (!res.ok) return
      const data = await res.json()
      const all = Array.isArray(data) ? data : (data.items || [])
      const existingCodes = new Set<string>(all.map((p: any) => p.code).filter(Boolean))
      const prefixMap: Record<string, string> = {
        'cultural-gifts': 'CG',
        'home-decor': 'HD',
        'creative-gifts': 'GI',
      }
      const prefix = prefixMap[form.category] || 'GEN'
      let maxNum = 0
      const re = new RegExp(`^${prefix}-(\\d+)$`)
      existingCodes.forEach((c: string) => {
        const m = c.match(re)
        if (m) maxNum = Math.max(maxNum, parseInt(m[1], 10))
      })
      let num = maxNum + 1
      let candidate = `${prefix}-${String(num).padStart(4, '0')}`
      while (existingCodes.has(candidate)) {
        num++
        candidate = `${prefix}-${String(num).padStart(4, '0')}`
      }
      update("code", candidate.toUpperCase())
    } catch {
      // 静默失败
    }
  }

  // Upload main product image
  const handleMainUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { setError("File too large (max 5MB)"); return }
    setError(""); setUploading(true)
    try {
      const fd = new FormData()
      fd.append("file", file)
      fd.append("type", "product")
      const res = await fetch("/api/upload", { method: "POST", body: fd })
      if (res.ok) { const d = await res.json(); update("image", d.url) }
      else { const d = await res.json(); setError(d.error || "Upload failed") }
    } catch { setError("Upload failed") }
    finally { setUploading(false); e.target.value = "" }
  }

  // Upload detail image
  const handleDetailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { setError("File too large (max 5MB)"); return }
    setError(""); setDetailUploading(true)
    try {
      const fd = new FormData()
      fd.append("file", file)
      fd.append("type", "product")
      const res = await fetch("/api/upload", { method: "POST", body: fd })
      if (res.ok) { const d = await res.json(); update("detailImages", [...form.detailImages, d.url]) }
      else { const d = await res.json(); setError(d.error || "Upload failed") }
    } catch { setError("Upload failed") }
    finally { setDetailUploading(false); e.target.value = "" }
  }

  // Upload product video
  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 50 * 1024 * 1024) { setError("Video too large (max 50MB)"); return }
    setError("")
    setVideoUploading(true)
    try {
      const fd = new FormData()
      fd.append("file", file)
      fd.append("type", "video")
      const res = await fetch("/api/upload", { method: "POST", body: fd })
      if (res.ok) {
        const d = await res.json()
        if (d.url) {
          update("video", d.url)
          update("videoEnabled", true)
        }
      } else {
        const d = await res.json()
        setError(d.error || "Upload failed")
      }
    } catch { setError("Upload failed") }
    finally { setVideoUploading(false); e.target.value = "" }
  }

  const addUrlImage = () => {
    if (!urlValue.trim()) return
    update("detailImages", [...form.detailImages, urlValue.trim()])
    setUrlValue(""); setShowUrlInput(false)
  }

  const removeDetailImage = (idx: number) => {
    update("detailImages", form.detailImages.filter((_: any, i: number) => i !== idx))
  }

  const removeMainImage = () => {
    update("image", "")
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError("")
    const body = {
      ...form,
      code: form.code.trim() || undefined,
      price: Number(form.price) || 0,
      originalPrice: form.originalPrice ? Number(form.originalPrice) : undefined,
      costPrice: form.costPrice ? Number(form.costPrice) : undefined,
      stock: Number(form.stock) || 0,
      supplierId: form.supplierId || undefined,
      tags: form.tags.split(/[,，、|]/).map(t => t.trim()).filter(Boolean),
      tagsEn: form.tagsEn.split(/[,，、|]/).map(t => t.trim()).filter(Boolean),
      detailImages: form.detailImages,
      video: form.video.trim() || undefined,
      videoEnabled: Boolean(form.videoEnabled),
      rating: Number(form.rating) || 0,
      reviewCount: Number(form.reviewCount) || 0,
    }
    try {
      const url = isEdit ? `/api/products/${initial!.id}` : "/api/products"
      const method = isEdit ? "PUT" : "POST"
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        // For new products, attach the base reviews entered in the form
        if (!isEdit && data?.id && pendingSeeds.length > 0) {
          for (const seed of pendingSeeds) {
            try { await saveSeedReview(seed, data.id) } catch {}
          }
        }
        router.push("/admin/products")
        router.refresh()
      } else {
        setError(data.error || "Save failed")
      }
    } catch { setError("Network error") }
    finally { setSaving(false) }
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => router.back()} className="text-gray-500 hover:text-gray-300 transition-colors"><ArrowLeft size={20} /></button>
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--adm-text)" }}>{isEdit ? "Edit Product" : "New Product"}</h1>
          {isEdit && initial?.nameEn && <p className="text-xs text-gray-500 mt-0.5">{initial.nameEn}</p>}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Info */}
        <Section title="Basic Info">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Product Code">
              <div className="flex gap-2">
                <input type="text" value={form.code} onChange={e => update("code", e.target.value.toUpperCase())} placeholder="CG-0001" className="flex-1 px-4 py-2.5 rounded-lg text-sm font-mono" style={{ backgroundColor: "var(--adm-input)", border: "1px solid var(--adm-input-border)", color: "var(--adm-text)" }} />
                <button type="button" onClick={handleGenerateCode} className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-medium whitespace-nowrap" style={{ backgroundColor: "var(--adm-accent-bg)", color: "var(--adm-accent)", border: "1px solid var(--adm-input-border)" }} title="Auto generate next code">
                  <RefreshCw size={13} /> Auto
                </button>
              </div>
              <p className="text-[11px] mt-1" style={{ color: "var(--adm-text-secondary)" }}>Unique code by category: CG (Cultural Gifts), HD (Home Decor), GI (Gift Ideas) + 4-digit number. Leave empty to auto-generate on save.</p>
            </Field>
            <Field label="Product Name *">
              <input type="text" value={form.name} onChange={e => update("name", e.target.value)} className="w-full px-4 py-2.5 rounded-lg text-sm" style={{ backgroundColor: "var(--adm-input)", border: "1px solid var(--adm-input-border)", color: "var(--adm-text)" }} required />
            </Field>
            <Field label="Name (English)">
              <input type="text" value={form.nameEn} onChange={e => update("nameEn", e.target.value)} className="w-full px-4 py-2.5 rounded-lg text-sm" style={{ backgroundColor: "var(--adm-input)", border: "1px solid var(--adm-input-border)", color: "var(--adm-text)" }} placeholder="Celadon Tea Set" />
            </Field>
            <Field label="Subtitle">
              <input type="text" value={form.subtitle} onChange={e => update("subtitle", e.target.value)} className="w-full px-4 py-2.5 rounded-lg text-sm" style={{ backgroundColor: "var(--adm-input)", border: "1px solid var(--adm-input-border)", color: "var(--adm-text)" }} />
            </Field>
            <Field label="Subtitle (English)">
              <input type="text" value={form.subtitleEn} onChange={e => update("subtitleEn", e.target.value)} className="w-full px-4 py-2.5 rounded-lg text-sm" style={{ backgroundColor: "var(--adm-input)", border: "1px solid var(--adm-input-border)", color: "var(--adm-text)" }} />
            </Field>
            <Field label="Category">
              <select value={form.category} onChange={e => update("category", e.target.value)} className="w-full px-4 py-2.5 rounded-lg text-sm" style={{ backgroundColor: "var(--adm-input)", border: "1px solid var(--adm-input-border)", color: "var(--adm-text)" }}>
                {catOptions.map((c: any) => <option key={c.slug} value={c.slug}>{c.nameEn} ({c.name})</option>)}
              </select>
            </Field>
            <Field label="Tags (comma separated)">
              <input type="text" value={form.tags} onChange={e => update("tags", e.target.value)} className="w-full px-4 py-2.5 rounded-lg text-sm" style={{ backgroundColor: "var(--adm-input)", border: "1px solid var(--adm-input-border)", color: "var(--adm-text)" }} placeholder="handmade, ceramic" />
            </Field>
          </div>
        </Section>

        {/* Pricing */}
        <Section title="Pricing">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <UsdCnyField label="Price (USD) *" value={form.price} onUsdChange={v => update("price", v)} required />
            <UsdCnyField label="Original Price (划线价)" value={form.originalPrice} onUsdChange={v => update("originalPrice", v)} />
            <Field label="Rating (0-5)">
              <input type="number" step="0.1" min="0" max="5" value={form.rating} onChange={e => update("rating", e.target.value)} className="w-full px-4 py-2.5 rounded-lg text-sm" style={{ backgroundColor: "var(--adm-input)", border: "1px solid var(--adm-input-border)", color: "var(--adm-text)" }} />
            </Field>
          </div>
        </Section>

        {/* Supplier & Inventory */}
        <Section title="Supplier & Inventory">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Supplier">
              <select value={form.supplierId} onChange={e => update("supplierId", e.target.value)} className="w-full px-4 py-2.5 rounded-lg text-sm" style={{ backgroundColor: "var(--adm-input)", border: "1px solid var(--adm-input-border)", color: "var(--adm-text)" }}>
                <option value="">-- No Supplier --</option>
                {supplierOptions.map((s: SupplierOption) => (
                  <option key={s.id} value={s.id}>{s.name}{s.region ? ` (${s.region})` : ''}</option>
                ))}
              </select>
            </Field>
            <UsdCnyField label="Cost Price (USD)" value={form.costPrice} onUsdChange={v => update("costPrice", v)} placeholder="Supplier cost" />
            <Field label="Stock Quantity">
              <input type="number" min="0" value={form.stock} onChange={e => update("stock", e.target.value)} className="w-full px-4 py-2.5 rounded-lg text-sm" style={{ backgroundColor: "var(--adm-input)", border: "1px solid var(--adm-input-border)", color: "var(--adm-text)" }} />
            </Field>
          </div>
          {form.costPrice && form.price && Number(form.price) > 0 && (
            <div className="mt-3 flex items-center gap-4 text-xs">
              <span style={{ color: "var(--adm-text-secondary)" }}>Margin: <strong style={{ color: "var(--adm-accent)" }}>{(((Number(form.price) - Number(form.costPrice)) / Number(form.price)) * 100).toFixed(1)}%</strong></span>
              <span style={{ color: "var(--adm-text-secondary)" }}>Profit: <strong style={{ color: "#059669" }}>${(Number(form.price) - Number(form.costPrice)).toFixed(2)}</strong></span>
            </div>
          )}
        </Section>

        {/* Description & Story */}
        <Section title="Description & Story">
          <Field label="Description">
            <textarea value={form.description} onChange={e => update("description", e.target.value)} rows={3} className="w-full px-4 py-2.5 rounded-lg text-sm" style={{ backgroundColor: "var(--adm-input)", border: "1px solid var(--adm-input-border)", color: "var(--adm-text)" }} />
          </Field>
          <Field label="Description (English)">
            <textarea value={form.descriptionEn} onChange={e => update("descriptionEn", e.target.value)} rows={3} className="w-full px-4 py-2.5 rounded-lg text-sm" style={{ backgroundColor: "var(--adm-input)", border: "1px solid var(--adm-input-border)", color: "var(--adm-text)" }} />
          </Field>
          <Field label="Cultural Story">
            <textarea value={form.story} onChange={e => update("story", e.target.value)} rows={4} className="w-full px-4 py-2.5 rounded-lg text-sm" style={{ backgroundColor: "var(--adm-input)", border: "1px solid var(--adm-input-border)", color: "var(--adm-text)" }} />
          </Field>
          <Field label="Cultural Story (English)">
            <textarea value={form.storyEn} onChange={e => update("storyEn", e.target.value)} rows={4} className="w-full px-4 py-2.5 rounded-lg text-sm" style={{ backgroundColor: "var(--adm-input)", border: "1px solid var(--adm-input-border)", color: "var(--adm-text)" }} />
          </Field>
        </Section>

        {/* Craft & Origin */}
        <Section title="Craft & Origin">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Craft"><input type="text" value={form.craft} onChange={e => update("craft", e.target.value)} className="w-full px-4 py-2.5 rounded-lg text-sm adm-input" style={{ backgroundColor: "var(--adm-input)", border: "1px solid var(--adm-input-border)", color: "var(--adm-text)" }} /></Field>
            <Field label="Craft (English)"><input type="text" value={form.craftEn} onChange={e => update("craftEn", e.target.value)} className="w-full px-4 py-2.5 rounded-lg text-sm adm-input" style={{ backgroundColor: "var(--adm-input)", border: "1px solid var(--adm-input-border)", color: "var(--adm-text)" }} /></Field>
            <Field label="Material"><input type="text" value={form.material} onChange={e => update("material", e.target.value)} className="w-full px-4 py-2.5 rounded-lg text-sm adm-input" style={{ backgroundColor: "var(--adm-input)", border: "1px solid var(--adm-input-border)", color: "var(--adm-text)" }} /></Field>
            <Field label="Origin"><input type="text" value={form.origin} onChange={e => update("origin", e.target.value)} className="w-full px-4 py-2.5 rounded-lg text-sm adm-input" style={{ backgroundColor: "var(--adm-input)", border: "1px solid var(--adm-input-border)", color: "var(--adm-text)" }} /></Field>
          </div>
        </Section>

        {/* Main Product Image */}
        <Section title="Main Product Image">
          <div className="flex items-start gap-4">
            {form.image ? (
              <div className="relative w-32 h-32 rounded-lg overflow-hidden border" style={{ borderColor: "var(--adm-border)" }}>
                <img src={form.image} alt="Product" className="w-full h-full object-cover" />
                <button type="button" onClick={removeMainImage}
                  className="absolute top-1 right-1 bg-black/50 text-white rounded-full w-5 h-5 flex items-center justify-center hover:bg-black/70">
                  <X size={12} />
                </button>
              </div>
            ) : (
              <div className="w-32 h-32 rounded-lg border-2 border-dashed flex items-center justify-center" style={{ borderColor: "var(--adm-border)" }}>
                <ImagePlus size={24} className="text-gray-500" />
              </div>
            )}
            <div className="space-y-2">
              <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm cursor-pointer" style={{ backgroundColor: "var(--adm-accent)", color: "var(--adm-accent-text)" }}>
                <Upload size={14} />
                {uploading ? "Uploading..." : "Upload Image"}
                <input type="file" accept="image/*" onChange={handleMainUpload} className="hidden" disabled={uploading} />
              </label>
              <div className="flex items-center gap-2">
                <div className="h-px flex-1" style={{ backgroundColor: "var(--adm-border)" }} />
                <span className="text-xs" style={{ color: "var(--adm-text-secondary)" }}>or</span>
                <div className="h-px flex-1" style={{ backgroundColor: "var(--adm-border)" }} />
              </div>
              <div className="flex items-center gap-2">
                <input type="text" value={form.image} onChange={e => update("image", e.target.value)}
                  placeholder="Paste image URL..." className="flex-1 px-3 py-2 rounded-lg text-xs" style={{ backgroundColor: "var(--adm-input)", border: "1px solid var(--adm-input-border)", color: "var(--adm-text)" }} />
              </div>
              <p className="text-xs" style={{ color: "var(--adm-text-secondary)" }}>Supported: JPG, PNG, WebP (max 5MB)</p>
            </div>
          </div>
        </Section>

        {/* Product Video */}
        <Section title="Product Video (Optional)">
          <p className="text-xs mb-4" style={{ color: "var(--adm-text-secondary)" }}>
            Upload a product video. When enabled, product cards on the storefront start with the static image and play this video on hover.
          </p>
          <div className="flex items-start gap-4">
            {form.video ? (
              <div className="relative w-44 h-28 rounded-lg overflow-hidden border" style={{ borderColor: "var(--adm-border)" }}>
                <video src={form.video} muted loop playsInline className="w-full h-full object-cover" />
                <button type="button" onClick={() => { update("video", ""); update("videoEnabled", false) }}
                  className="absolute top-1 right-1 bg-black/50 text-white rounded-full w-5 h-5 flex items-center justify-center hover:bg-black/70">
                  <X size={12} />
                </button>
              </div>
            ) : (
              <div className="w-44 h-28 rounded-lg border-2 border-dashed flex items-center justify-center" style={{ borderColor: "var(--adm-border)" }}>
                <Video size={24} className="text-gray-500" />
              </div>
            )}
            <div className="space-y-2 flex-1">
              <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm cursor-pointer" style={{ backgroundColor: "var(--adm-accent)", color: "var(--adm-accent-text)" }}>
                <Upload size={14} />
                {videoUploading ? "Uploading..." : "Upload Video"}
                <input type="file" accept="video/*" onChange={handleVideoUpload} className="hidden" disabled={videoUploading} />
              </label>
              <div className="flex items-center gap-2">
                <div className="h-px flex-1" style={{ backgroundColor: "var(--adm-border)" }} />
                <span className="text-xs" style={{ color: "var(--adm-text-secondary)" }}>or</span>
                <div className="h-px flex-1" style={{ backgroundColor: "var(--adm-border)" }} />
              </div>
              <input type="text" value={form.video} onChange={e => update("video", e.target.value)}
                placeholder="Paste video URL..." className="w-full px-3 py-2 rounded-lg text-xs" style={{ backgroundColor: "var(--adm-input)", border: "1px solid var(--adm-input-border)", color: "var(--adm-text)" }} />
              <label className="flex items-center gap-2 cursor-pointer mt-2">
                <input type="checkbox" checked={form.videoEnabled} onChange={e => update("videoEnabled", e.target.checked)} className="w-4 h-4" />
                <span className="text-sm" style={{ color: "var(--adm-text)" }}>Enable hover video on product cards</span>
              </label>
              <p className="text-xs" style={{ color: "var(--adm-text-secondary)" }}>Supported: MP4, WebM, MOV (max 50MB)</p>
            </div>
          </div>
        </Section>

        {/* Detail Images */}
        <Section title="Detail Images (Optional)">
          <div className="flex flex-wrap gap-3 mb-3">
            {form.detailImages.map((url: string, idx: number) => (
              <div key={idx} className="relative w-24 h-24 rounded-lg overflow-hidden border" style={{ borderColor: "var(--adm-border)" }}>
                <img src={url} alt={`Detail ${idx + 1}`} className="w-full h-full object-cover" />
                <button type="button" onClick={() => removeDetailImage(idx)}
                  className="absolute top-1 right-1 bg-black/50 text-white rounded-full w-5 h-5 flex items-center justify-center hover:bg-black/70">
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm cursor-pointer" style={{ backgroundColor: "var(--adm-accent)", color: "white" }}>
              {detailUploading ? <span className="animate-spin">...</span> : <Upload size={14} />}
              {detailUploading ? "Uploading..." : "Add Image"}
              <input type="file" accept="image/*" onChange={handleDetailUpload} className="hidden" disabled={detailUploading} />
            </label>
            <button type="button" onClick={() => setShowUrlInput(!showUrlInput)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm" style={{ backgroundColor: "var(--adm-accent)", color: "white" }}>
              <LinkIcon size={14} /> Add URL
            </button>
          </div>
          {showUrlInput && (
            <div className="flex items-center gap-2 mt-2">
              <input type="text" value={urlValue} onChange={e => setUrlValue(e.target.value)}
                placeholder="https://example.com/image.jpg" onKeyDown={e => e.key === "Enter" && addUrlImage()}
                className="flex-1 px-3 py-2 rounded-lg text-sm" style={{ backgroundColor: "var(--adm-input)", border: "1px solid var(--adm-input-border)", color: "var(--adm-text)" }} />
              <button type="button" onClick={addUrlImage} className="px-3 py-2 rounded-lg text-sm" style={{ backgroundColor: "var(--adm-accent)", color: "white" }}>Add</button>
            </div>
          )}
        </Section>

        {/* Status */}
        <Section title="Status">
          <div className="flex gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.active} onChange={e => update("active", e.target.checked)} className="w-4 h-4" />
              <span className="text-sm" style={{ color: "var(--adm-text)" }}>Active (Listed)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.featured} onChange={e => update("featured", e.target.checked)} className="w-4 h-4" />
              <span className="text-sm" style={{ color: "var(--adm-text)" }}>Featured on Homepage</span>
            </label>
          </div>
        </Section>

        {/* Base Reviews */}
        <Section title="Base Reviews (初始评论)">
          <p className="text-[11px] mb-4" style={{ color: "var(--adm-text-secondary)" }}>
            Seed reviews shown on the product page as initial reviews. These are set by the admin and do not affect customer order reviews.
          </p>
          {seedReviews.length > 0 && (
            <div className="space-y-2 mb-4">
              {seedReviews.map((r, i) => (
                <div key={r.id || i} className="flex items-start justify-between gap-3 rounded-lg border p-3" style={{ borderColor: "var(--adm-border)", backgroundColor: "var(--adm-input)" }}>
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-base shrink-0 overflow-hidden" style={{ backgroundColor: "var(--adm-card)", border: "1px solid var(--adm-input-border)" }}>
                      {r.avatar && (r.avatar.startsWith("http") || r.avatar.startsWith("/api/uploads") || r.avatar.startsWith("/images/")) ? (
                        <img src={r.avatar} alt={r.author || "avatar"} className="w-full h-full object-cover" />
                      ) : (r.avatar || "👤")}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium truncate" style={{ color: "var(--adm-text)" }}>{r.author}</p>
                        <span className="text-[10px]" style={{ color: "var(--adm-text-secondary)" }}>{r.location} · {r.date} · {r.rating}★</span>
                      </div>
                      <p className="text-xs mt-1 leading-relaxed" style={{ color: "var(--adm-text-secondary)" }}>{r.content}</p>
                    </div>
                  </div>
                  <button type="button" onClick={() => deleteSeedReview(r.id)} className="p-1.5 rounded hover:bg-red-500/10 shrink-0" style={{ color: "var(--adm-text-secondary)" }} title="Delete">
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Field label="Customer Avatar (emoji or URL)">
              <div className="flex gap-2">
                <input type="text" value={seedForm.avatar} onChange={e => setSeedForm(s => ({ ...s, avatar: e.target.value }))} placeholder="🧑‍🎨 or image URL" className="flex-1 px-3 py-2 rounded-lg text-sm min-w-0" style={{ backgroundColor: "var(--adm-input)", border: "1px solid var(--adm-input-border)", color: "var(--adm-text)" }} />
                <label className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium cursor-pointer transition-colors disabled:opacity-50"
                  style={{ backgroundColor: "var(--adm-accent-bg)", color: "var(--adm-accent)", border: "1px solid var(--adm-input-border)" }}>
                  <ImagePlus size={13} /> {seedAvatarUploading ? "..." : "Upload"}
                  <input type="file" accept="image/*" className="hidden" onChange={handleSeedAvatarUpload} disabled={seedAvatarUploading} />
                </label>
              </div>
            </Field>
            <Field label="Customer Name *">
              <input type="text" value={seedForm.author} onChange={e => setSeedForm(s => ({ ...s, author: e.target.value }))} placeholder="Lily Chen" className="w-full px-3 py-2 rounded-lg text-sm" style={{ backgroundColor: "var(--adm-input)", border: "1px solid var(--adm-input-border)", color: "var(--adm-text)" }} />
            </Field>
            <Field label="Customer Address">
              <input type="text" value={seedForm.location} onChange={e => setSeedForm(s => ({ ...s, location: e.target.value }))} placeholder="Shanghai, China" className="w-full px-3 py-2 rounded-lg text-sm" style={{ backgroundColor: "var(--adm-input)", border: "1px solid var(--adm-input-border)", color: "var(--adm-text)" }} />
            </Field>
            <Field label="Rating">
              <select value={seedForm.rating} onChange={e => setSeedForm(s => ({ ...s, rating: Number(e.target.value) }))} className="w-full px-3 py-2 rounded-lg text-sm" style={{ backgroundColor: "var(--adm-input)", border: "1px solid var(--adm-input-border)", color: "var(--adm-text)" }}>
                {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n} star{n > 1 ? "s" : ""}</option>)}
              </select>
            </Field>
            <Field label="Date">
              <input type="date" value={seedForm.date} onChange={e => setSeedForm(s => ({ ...s, date: e.target.value }))} className="w-full px-3 py-2 rounded-lg text-sm" style={{ backgroundColor: "var(--adm-input)", border: "1px solid var(--adm-input-border)", color: "var(--adm-text)" }} />
            </Field>
          </div>
          <div className="mt-3">
            <Field label="Review Content *">
              <textarea value={seedForm.content} onChange={e => setSeedForm(s => ({ ...s, content: e.target.value }))} rows={3} maxLength={2000} placeholder="What did this customer say about the product?" className="w-full px-3 py-2 rounded-lg text-sm" style={{ backgroundColor: "var(--adm-input)", border: "1px solid var(--adm-input-border)", color: "var(--adm-text)" }} />
            </Field>
          </div>
          <button type="button" onClick={addSeedReview} disabled={seedSaving}
            className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
            style={{ backgroundColor: "var(--adm-accent-bg)", color: "var(--adm-accent)", border: "1px solid var(--adm-input-border)" }}>
            <Plus size={13} /> {seedSaving ? "Adding..." : "Add Base Review"}
          </button>
        </Section>

        {error && <p className="text-sm text-red-500" style={{ color: "var(--adm-accent)" }}>{error}</p>}

        {/* Submit */}
        <div className="flex items-center gap-4 pt-4 border-t" style={{ borderColor: "var(--adm-border)" }}>
          <button type="submit" disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            style={{ backgroundColor: "var(--adm-accent)", color: "var(--adm-accent-text)" }}>
            <Save size={16} /> {saving ? "Saving..." : isEdit ? "Save Changes" : "Publish Product"}
          </button>
          <button type="button" onClick={() => router.back()} className="text-sm" style={{ color: "var(--adm-text-secondary)" }}>Cancel</button>
        </div>
      </form>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl p-5 border" style={{ backgroundColor: "var(--adm-card)", borderColor: "var(--adm-border)" }}>
      <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--adm-text)" }}>{title}</h3>
      {children}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--adm-text-secondary)" }}>{label}</label>
      {children}
    </div>
  )
}
