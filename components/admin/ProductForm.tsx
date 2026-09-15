'use client'

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Save, ArrowLeft, Upload, X, ImagePlus, Link as LinkIcon, Factory, RefreshCw, Plus, Video } from "lucide-react"
import type { Product } from "@/lib/db"

interface SupplierOption { id: string; name: string; region?: string }

interface ProductFormProps { initial?: Product | null; cnyRate?: number }

// 美元/人民币双向换算输入 (USD 为存储基准; 在 ¥ 框输入人民币自动换算成美元)
function UsdCnyField({ label, value, onUsdChange, required, placeholder, cnyRate = 7.2 }: {
  label: string
  value: string
  onUsdChange: (v: string) => void
  required?: boolean
  placeholder?: string
  cnyRate?: number
}) {
  const [cny, setCny] = useState(value ? String(Math.round(Number(value) * cnyRate * 100) / 100) : "")
  const [editing, setEditing] = useState<"usd" | "cny">("usd")
  useEffect(() => {
    if (editing !== "cny") setCny(value ? String(Math.round(Number(value) * cnyRate * 100) / 100) : "")
  }, [value, editing, cnyRate])
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
              if (!Number.isNaN(v) && v > 0) onUsdChange(String(Math.round((v / cnyRate) * 100) / 100))
            }}
            className={`${inputCls} pl-7`} style={inputStyle} placeholder="CNY" />
        </div>
      </div>
      <p className="text-[10px] opacity-40 mt-1">直接填美元，或在 ¥ 框输入人民币自动换算为美元（汇率 {cnyRate}，可在 系统设置 中修改）</p>
    </Field>
  )
}

export default function ProductForm({ initial, cnyRate = 7.2 }: ProductFormProps) {
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
  // 赠品绑定：候选商品列表 + 搜索词
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [giftSearch, setGiftSearch] = useState("")
  // 配套商品搜索词
  const [bundleSearch, setBundleSearch] = useState("")
  // 快速新建赠品/搭配商品时的 loading
  const [quickCreating, setQuickCreating] = useState(false)
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

  // 赠品候选：拉全部商品（含下架的，可能就是想拿它当赠品）
  useEffect(() => {
    fetch('/api/products?activeOnly=false')
      .then(r => (r.ok ? r.json() : []))
      .then(d => {
        const list = Array.isArray(d) ? d : (d.items || [])
        setAllProducts(Array.isArray(list) ? list : [])
      })
      .catch(() => setAllProducts([]))
  }, [])

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
    // 是否在商店列表展示。关掉后不出现在商店/搜索/分类页，但仍可售、仍能当赠品。
    listingVisible: (initial as any)?.listingVisible !== false,
    // 赠品绑定：存 product_gifts 表，这里只放在表单状态里，保存时单独提交
    giftProductIds: initial?.giftProductIds || [] as string[],
    giftQuantity: initial?.giftQuantity?.toString() || "1",
    // 规格款式：存 product_variants 表，同样单独提交。
    // 每个款式可有自己的价格 / 图片 / 库存；留空表示沿用主商品的值。
    optionName: (initial as any)?.optionName || "Style",
    // 配套商品 / 搭配购买：存 product_bundles 表，单独提交
    bundleTitle: (initial as any)?.bundleTitle || "Frequently bought together",
    bundles: ((initial as any)?.bundles || []).map((b: any) => ({
      bundleProductId: b.bundleProductId,
      title: b.title || "",
      description: b.description || "",
      image: b.image || "",
      price: b.price === undefined || b.price === null ? "" : String(b.price),
      discount: b.discount === undefined || b.discount === null ? "" : String(b.discount),
    })) as any[],
    variants: ((initial as any)?.variants || []).map((v: any) => ({
      id: v.id,
      label: v.label || "",
      valueCode: v.valueCode || "",
      price: v.price === undefined || v.price === null ? "" : String(v.price),
      image: v.image || "",
      stock: v.stock === undefined || v.stock === null ? "" : String(v.stock),
      active: v.active !== false,
    })) as any[],
  })

  function update(field: string, value: any) { setForm(prev => ({ ...prev, [field]: value })) }

  /**
   * 快速新建一个「隐藏商品」并直接绑定为赠品/搭配。
   *
   * 为什么这样做（而不是把赠品存成附属品副本）：
   *   赠品/搭配是真实商品，价格、图片、库存应该有唯一来源。复制一份会导致
   *   库存分裂（超卖）和同一个东西两份数据打架。
   *   但"先去商品管理建好再回来绑定"确实来回跑，所以这里给一键新建：
   *   建出来的商品 listingVisible = false（不出现在商店），但 active = true，
   *   所以库存/价格照常参与计算，也能被多个主商品复用。
   */
  const createHiddenProduct = async (kind: 'gift' | 'bundle') => {
    const label = kind === 'gift' ? '赠品' : '搭配商品'
    const name = window.prompt(`新建${label}的名称（建好后不会出现在商店列表，只作${label}用，可随时改）：`)
    if (!name || !name.trim()) return
    const priceStr = window.prompt(`「${name.trim()}」的价格（USD，可留空=0）：`, '0')
    if (priceStr === null) return
    setQuickCreating(true)
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          nameEn: name.trim(),
          subtitle: '',
          description: '',
          story: '',
          price: Number(priceStr) || 0,
          category: form.category || 'cultural-gifts',
          image: '',
          craft: '', material: '', origin: '',
          rating: 0, reviewCount: 0,
          featured: false,
          active: true,          // 可售：能参与库存/价格计算
          listingVisible: false, // 关键：不出现在商店列表
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.id) {
        setError(data.error || `新建${label}失败`)
        return
      }
      // 刷新候选列表，并直接绑定
      setAllProducts(prev => [...prev, data])
      if (kind === 'gift') {
        update('giftProductIds', [...form.giftProductIds, data.id])
      } else {
        update('bundles', [...form.bundles, {
          bundleProductId: data.id, title: '', description: '', image: '', price: '', discount: '',
        }])
      }
    } finally {
      setQuickCreating(false)
    }
  }

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
        // 赠品绑定单独提交（存 product_gifts 表，不走商品主表的更新接口）
        const targetId = isEdit ? initial!.id : data?.id
        if (targetId) {
          // 规格款式：先提交（失败不阻断商品本身已保存的事实，只提示）
          const cleanVariants = (form.variants || [])
            .filter((v: any) => String(v.label || '').trim())
            .map((v: any) => ({
              id: v.id,
              label: String(v.label).trim(),
              valueCode: v.valueCode || '',
              price: v.price === '' ? undefined : Number(v.price),
              image: v.image || undefined,
              stock: v.stock === '' ? undefined : Number(v.stock),
              active: v.active !== false,
            }))
          try {
            const vres = await fetch("/api/products/variants", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                productId: targetId,
                optionName: form.optionName || 'Style',
                variants: cleanVariants,
              }),
            })
            if (!vres.ok) {
              const verr = await vres.json().catch(() => ({}))
              setError(`Product saved, but variants failed: ${verr.error || vres.status}`)
              setSaving(false)
              return
            }
          } catch {
            setError("Product saved, but variants could not be reached.")
            setSaving(false)
            return
          }

          // 配套商品 / 搭配购买
          const cleanBundles = (form.bundles || [])
            .filter((b: any) => String(b.bundleProductId || '').trim())
            .map((b: any) => ({
              bundleProductId: String(b.bundleProductId).trim(),
              title: b.title || '',
              description: b.description || '',
              image: b.image || undefined,
              price: b.price === '' || b.price === undefined ? undefined : Number(b.price),
              discount: b.discount === '' || b.discount === undefined ? 0 : Number(b.discount),
            }))
          try {
            const bres = await fetch("/api/products/bundles", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                productId: targetId,
                bundleTitle: form.bundleTitle || '',
                bundles: cleanBundles,
              }),
            })
            if (!bres.ok) {
              const berr = await bres.json().catch(() => ({}))
              setError(`Product saved, but bundles failed: ${berr.error || bres.status}`)
              setSaving(false)
              return
            }
          } catch {
            setError("Product saved, but bundles could not be reached.")
            setSaving(false)
            return
          }

          try {
            const gres = await fetch("/api/products/gifts", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                productId: targetId,
                giftProductIds: form.giftProductIds,
                giftQuantity: Number(form.giftQuantity) || 1,
              }),
            })
            if (!gres.ok) {
              const gerr = await gres.json().catch(() => ({}))
              // 商品本身已保存成功，赠品保存失败就提示但不阻断
              setError(`Product saved, but gift bindings failed: ${gerr.error || gres.status}`)
              setSaving(false)
              return
            }
          } catch {
            setError("Product saved, but gift bindings could not be reached.")
            setSaving(false)
            return
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
            <UsdCnyField label="Price (USD) *" value={form.price} onUsdChange={v => update("price", v)} required cnyRate={cnyRate} />
            <UsdCnyField label="Original Price (划线价)" value={form.originalPrice} onUsdChange={v => update("originalPrice", v)} cnyRate={cnyRate} />
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
            <UsdCnyField label="Cost Price (USD)" value={form.costPrice} onUsdChange={v => update("costPrice", v)} placeholder="Supplier cost" cnyRate={cnyRate} />
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

        {/* Free Gift（赠品绑定）—— 买一送一 / 免费搭配 */}
        <Section title="Free Gift（赠品绑定）">
          <p className="text-xs mb-3" style={{ color: "var(--adm-text-secondary, rgba(255,255,255,0.6))" }}>
            选择「购买本商品时可以免费拿走的商品」。绑 1 个 → 加购时自动带上；
            绑多个 → 前台会让客户自己挑一个。留空 = 没有赠品活动。
          </p>

          {/* 已绑定的赠品 */}
          {form.giftProductIds.length > 0 && (
            <div className="space-y-2 mb-3">
              {form.giftProductIds.map(gid => {
                const gp = allProducts.find(p => p.id === gid)
                return (
                  <div key={gid} className="flex items-center gap-3 px-3 py-2 rounded-lg"
                    style={{ backgroundColor: "var(--adm-input)", border: "1px solid var(--adm-input-border)" }}>
                    {gp?.image && (
                      <img src={gp.image} alt="" className="w-9 h-9 rounded object-cover shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate" style={{ color: "var(--adm-text)" }}>{gp ? (gp.nameEn || gp.name) : gid}</p>
                      <p className="text-[11px] opacity-50" style={{ color: "var(--adm-text)" }}>
                        {gp ? `$${gp.price}` : "商品不存在（保存时会自动剔除）"}
                      </p>
                    </div>
                    <button type="button"
                      onClick={() => update("giftProductIds", form.giftProductIds.filter(x => x !== gid))}
                      className="px-2 py-1 rounded text-xs shrink-0"
                      style={{ backgroundColor: "rgba(220,38,38,0.15)", color: "#f87171" }}>
                      移除
                    </button>
                  </div>
                )
              })}
            </div>
          )}

          <button type="button"
            onClick={() => createHiddenProduct('gift')}
            disabled={quickCreating}
            className="mt-3 mr-2 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
            style={{ backgroundColor: "var(--adm-accent)", color: "var(--adm-accent-text)" }}>
            {quickCreating ? "创建中…" : "＋ 新建赠品商品"}
          </button>

          <p className="text-[11px] opacity-50 mt-2" style={{ color: "var(--adm-text)" }}>
            新建的赠品商品会自动设为「不在商店列表展示」，但仍可售、库存与价格照常参与计算，
            也能被多个主商品共用为赠品。想让它同时在商店上架，去商品管理打开「列表展示」即可。
          </p>

          {/* 添加赠品：按名字/编码搜，避免商品多时找不到 */}
          <div className="flex flex-col sm:flex-row gap-2 mt-3">
            <input
              type="text"
              value={giftSearch}
              onChange={e => setGiftSearch(e.target.value)}
              placeholder="搜索商品名称或编码，然后从下方选择"
              className="flex-1 px-4 py-2.5 rounded-lg text-sm"
              style={{ backgroundColor: "var(--adm-input)", border: "1px solid var(--adm-input-border)", color: "var(--adm-text)" }}
            />
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg shrink-0"
              style={{ backgroundColor: "var(--adm-input)", border: "1px solid var(--adm-input-border)" }}>
              <span className="text-xs whitespace-nowrap" style={{ color: "var(--adm-text)" }}>每份送</span>
              <input type="number" min={1} max={20} value={form.giftQuantity}
                onChange={e => update("giftQuantity", e.target.value)}
                className="w-14 px-2 py-1 rounded text-sm text-center"
                style={{ backgroundColor: "var(--adm-bg)", border: "1px solid var(--adm-input-border)", color: "var(--adm-text)" }} />
              <span className="text-xs" style={{ color: "var(--adm-text)" }}>件</span>
            </div>
          </div>

          {/* 候选列表：排除自己、已绑定的 */}
          <div className="mt-2 max-h-56 overflow-y-auto rounded-lg"
            style={{ border: "1px solid var(--adm-input-border)" }}>
            {allProducts
              .filter(p => p.id !== initial?.id && !form.giftProductIds.includes(p.id))
              .filter(p => {
                const q = giftSearch.trim().toLowerCase()
                if (!q) return true
                return (p.name || "").toLowerCase().includes(q)
                  || (p.nameEn || "").toLowerCase().includes(q)
                  || (p.code || "").toLowerCase().includes(q)
              })
              .slice(0, 40)
              .map(p => (
                <button key={p.id} type="button"
                  onClick={() => update("giftProductIds", [...form.giftProductIds, p.id])}
                  className="w-full flex items-center gap-3 px-3 py-2 text-left transition-colors"
                  style={{ borderBottom: "1px solid var(--adm-input-border)" }}>
                  {p.image && <img src={p.image} alt="" className="w-8 h-8 rounded object-cover shrink-0" />}
                  <span className="flex-1 min-w-0 text-sm truncate" style={{ color: "var(--adm-text)" }}>
                    {p.nameEn || p.name}
                    {(p as any).listingVisible === false && (
                      <span className="ml-2 px-1.5 py-0.5 rounded text-[9px] align-middle"
                        style={{ backgroundColor: "rgba(138,106,46,0.2)", color: "#C4A059" }}>
                        隐藏
                      </span>
                    )}
                  </span>
                  <span className="text-xs opacity-50 shrink-0" style={{ color: "var(--adm-text)" }}>${p.price}</span>
                  <Plus size={14} className="shrink-0 opacity-60" style={{ color: "var(--adm-text)" }} />
                </button>
              ))}
            {allProducts.filter(p => p.id !== initial?.id && !form.giftProductIds.includes(p.id)).length === 0 && (
              <p className="px-3 py-4 text-xs opacity-50" style={{ color: "var(--adm-text)" }}>
                没有其它可选商品（先把其它商品建好）
              </p>
            )}
          </div>
        </Section>

        {/* ===== 规格款式（variants）=====
            一个商品可以有多个款式，每个款式有自己的图片和价格，
            前台选不同款式时图片与价格联动切换。 */}
        <Section title="规格款式（Variants）">
          <p className="text-xs mb-3" style={{ color: "var(--adm-text-secondary, rgba(255,255,255,0.6))" }}>
            给同一件商品设置多个款式 / 型号（如颜色、尺寸、版本）。客户在前台切换款式时，
            下方填的图片和价格会跟着变。价格留空 = 用主商品价格；图片留空 = 用主商品主图。
          </p>

          {/* 规格维度名 */}
          <div className="mb-4">
            <label className="block text-xs mb-1.5" style={{ color: "var(--adm-text)" }}>
              规格名称（前台选择器上显示，如 Style / Color / Size）
            </label>
            <input
              type="text"
              value={form.optionName}
              onChange={e => update("optionName", e.target.value)}
              placeholder="Style"
              className="w-full sm:w-64 px-4 py-2.5 rounded-lg text-sm"
              style={{ backgroundColor: "var(--adm-input)", border: "1px solid var(--adm-input-border)", color: "var(--adm-text)" }}
            />
          </div>

          {/* 款式列表 */}
          <div className="space-y-3">
            {form.variants.map((v: any, idx: number) => (
              <div key={idx} className="rounded-lg p-3"
                style={{ backgroundColor: "var(--adm-input)", border: "1px solid var(--adm-input-border)" }}>
                <div className="flex items-center gap-3 mb-2.5">
                  {/* 缩略图预览 */}
                  <div className="shrink-0 rounded overflow-hidden flex items-center justify-center"
                    style={{ width: 44, height: 52, backgroundColor: "var(--adm-bg)" }}>
                    {v.image
                      ? <img src={v.image} alt="" className="w-full h-full object-cover" />
                      : <span className="text-[9px] opacity-40" style={{ color: "var(--adm-text)" }}>用主图</span>}
                  </div>
                  <input
                    type="text"
                    value={v.label}
                    onChange={e => {
                      const next = [...form.variants]
                      next[idx] = { ...next[idx], label: e.target.value }
                      update("variants", next)
                    }}
                    placeholder="款式名，如 Zen Black"
                    className="flex-1 px-3 py-2 rounded text-sm"
                    style={{ backgroundColor: "var(--adm-bg)", border: "1px solid var(--adm-input-border)", color: "var(--adm-text)" }}
                  />
                  <label className="flex items-center gap-1.5 shrink-0 cursor-pointer">
                    <input type="checkbox" checked={v.active !== false}
                      onChange={e => {
                        const next = [...form.variants]
                        next[idx] = { ...next[idx], active: e.target.checked }
                        update("variants", next)
                      }}
                      className="w-4 h-4" />
                    <span className="text-xs" style={{ color: "var(--adm-text)" }}>启用</span>
                  </label>
                  <button type="button"
                    onClick={() => update("variants", form.variants.filter((_: any, i: number) => i !== idx))}
                    className="px-2 py-1 rounded text-xs shrink-0"
                    style={{ backgroundColor: "rgba(220,38,38,0.15)", color: "#f87171" }}>
                    删除
                  </button>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                  <div>
                    <label className="block text-[10px] mb-1 opacity-60" style={{ color: "var(--adm-text)" }}>价格（留空=主价）</label>
                    <input type="number" step="0.01" value={v.price}
                      onChange={e => {
                        const next = [...form.variants]
                        next[idx] = { ...next[idx], price: e.target.value }
                        update("variants", next)
                      }}
                      placeholder="USD"
                      className="w-full px-3 py-2 rounded text-sm"
                      style={{ backgroundColor: "var(--adm-bg)", border: "1px solid var(--adm-input-border)", color: "var(--adm-text)" }} />
                  </div>
                  <div>
                    <label className="block text-[10px] mb-1 opacity-60" style={{ color: "var(--adm-text)" }}>库存（留空=主库存）</label>
                    <input type="number" value={v.stock}
                      onChange={e => {
                        const next = [...form.variants]
                        next[idx] = { ...next[idx], stock: e.target.value }
                        update("variants", next)
                      }}
                      className="w-full px-3 py-2 rounded text-sm"
                      style={{ backgroundColor: "var(--adm-bg)", border: "1px solid var(--adm-input-border)", color: "var(--adm-text)" }} />
                  </div>
                  <div>
                    <label className="block text-[10px] mb-1 opacity-60" style={{ color: "var(--adm-text)" }}>货号 / SKU</label>
                    <input type="text" value={v.valueCode}
                      onChange={e => {
                        const next = [...form.variants]
                        next[idx] = { ...next[idx], valueCode: e.target.value }
                        update("variants", next)
                      }}
                      className="w-full px-3 py-2 rounded text-sm"
                      style={{ backgroundColor: "var(--adm-bg)", border: "1px solid var(--adm-input-border)", color: "var(--adm-text)" }} />
                  </div>
                  <div>
                    <label className="block text-[10px] mb-1 opacity-60" style={{ color: "var(--adm-text)" }}>图片 URL</label>
                    <input type="text" value={v.image}
                      onChange={e => {
                        const next = [...form.variants]
                        next[idx] = { ...next[idx], image: e.target.value }
                        update("variants", next)
                      }}
                      placeholder="https://…"
                      className="w-full px-3 py-2 rounded text-sm"
                      style={{ backgroundColor: "var(--adm-bg)", border: "1px solid var(--adm-input-border)", color: "var(--adm-text)" }} />
                  </div>
                </div>
              </div>
            ))}

            {form.variants.length === 0 && (
              <p className="text-xs opacity-50 px-1" style={{ color: "var(--adm-text)" }}>
                还没有款式。没有款式时前台按普通商品展示，不显示规格选择器。
              </p>
            )}
          </div>

          <button type="button"
            onClick={() => update("variants", [
              ...form.variants,
              { label: "", valueCode: "", price: "", image: "", stock: "", active: true },
            ])}
            className="mt-3 px-4 py-2 rounded-lg text-sm font-medium"
            style={{ backgroundColor: "var(--adm-accent)", color: "var(--adm-accent-text)" }}>
            + 添加款式
          </button>
        </Section>

        {/* ===== 配套商品 / 搭配购买 =====
            和赠品的区别：赠品是免费送；搭配仍然计价，只是组合起来有个优惠。
            前台在商品页右侧展示「Frequently bought together」。 */}
        <Section title="配套商品 / 搭配购买（Bundle）">
          <p className="text-xs mb-3" style={{ color: "var(--adm-text-secondary, rgba(255,255,255,0.6))" }}>
            给这件商品设置可以一起买的搭配商品（比如茶具配托盘）。客户在前台勾选后，
            页面会实时算出「单品价 / 组合优惠 / 总价」，并能一键把多件一起加购。
            <strong>注意：搭配商品仍然计价</strong>，优惠金额填在「优惠」里；如果要是免费赠品，用上面的赠品绑定。
          </p>

          {/* 搭配标题（前台区块的小标题） */}
          <div className="mb-4">
            <label className="block text-xs mb-1.5" style={{ color: "var(--adm-text)" }}>
              搭配区块标题（前台显示，如 "Complete the set"）
            </label>
            <input
              type="text"
              value={form.bundleTitle}
              onChange={e => update("bundleTitle", e.target.value)}
              placeholder="Frequently bought together"
              className="w-full sm:w-80 px-4 py-2.5 rounded-lg text-sm"
              style={{ backgroundColor: "var(--adm-input)", border: "1px solid var(--adm-input-border)", color: "var(--adm-text)" }}
            />
          </div>

          {/* 已选搭配 */}
          {form.bundles.length > 0 && (
            <div className="space-y-3 mb-3">
              {form.bundles.map((b: any, idx: number) => {
                const bp = allProducts.find(p => p.id === b.bundleProductId)
                return (
                  <div key={b.bundleProductId} className="rounded-lg p-3"
                    style={{ backgroundColor: "var(--adm-input)", border: "1px solid var(--adm-input-border)" }}>
                    <div className="flex items-center gap-3 mb-2.5">
                      <div className="shrink-0 rounded overflow-hidden flex items-center justify-center"
                        style={{ width: 44, height: 52, backgroundColor: "var(--adm-bg)" }}>
                        {b.image
                          ? <img src={b.image} alt="" className="w-full h-full object-cover" />
                          : bp?.image
                            ? <img src={bp.image} alt="" className="w-full h-full object-cover" />
                            : <span className="text-[9px] opacity-40" style={{ color: "var(--adm-text)" }}>无图</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate" style={{ color: "var(--adm-text)" }}>
                          {bp ? (bp.nameEn || bp.name) : b.bundleProductId}
                        </p>
                        <p className="text-[11px] opacity-50" style={{ color: "var(--adm-text)" }}>
                          原价 ${bp ? bp.price : '?'}
                          {b.price !== '' && b.price !== undefined
                            ? ` → 套餐价 $${b.price}`
                            : ' （套餐价留空 = 用原价）'}
                        </p>
                      </div>
                      <button type="button"
                        onClick={() => update("bundles", form.bundles.filter((x: any) => x.bundleProductId !== b.bundleProductId))}
                        className="px-2 py-1 rounded text-xs shrink-0"
                        style={{ backgroundColor: "rgba(220,38,38,0.15)", color: "#f87171" }}>
                        删除
                      </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] mb-1 opacity-60" style={{ color: "var(--adm-text)" }}>搭配标题</label>
                        <input type="text" value={b.title}
                          onChange={e => {
                            const next = [...form.bundles]
                            next[idx] = { ...next[idx], title: e.target.value }
                            update("bundles", next)
                          }}
                          placeholder="Add a matching tray"
                          className="w-full px-3 py-2 rounded text-sm"
                          style={{ backgroundColor: "var(--adm-bg)", border: "1px solid var(--adm-input-border)", color: "var(--adm-text)" }} />
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="block text-[10px] mb-1 opacity-60" style={{ color: "var(--adm-text)" }}>套餐价</label>
                          <input type="number" step="0.01" value={b.price}
                            onChange={e => {
                              const next = [...form.bundles]
                              next[idx] = { ...next[idx], price: e.target.value }
                              update("bundles", next)
                            }}
                            placeholder="原价"
                            className="w-full px-3 py-2 rounded text-sm"
                            style={{ backgroundColor: "var(--adm-bg)", border: "1px solid var(--adm-input-border)", color: "var(--adm-text)" }} />
                        </div>
                        <div>
                          <label className="block text-[10px] mb-1 opacity-60" style={{ color: "var(--adm-text)" }}>组合优惠</label>
                          <input type="number" step="0.01" value={b.discount}
                            onChange={e => {
                              const next = [...form.bundles]
                              next[idx] = { ...next[idx], discount: e.target.value }
                              update("bundles", next)
                            }}
                            placeholder="0"
                            className="w-full px-3 py-2 rounded text-sm"
                            style={{ backgroundColor: "var(--adm-bg)", border: "1px solid var(--adm-input-border)", color: "var(--adm-text)" }} />
                        </div>
                        <div>
                          <label className="block text-[10px] mb-1 opacity-60" style={{ color: "var(--adm-text)" }}>图片 URL</label>
                          <input type="text" value={b.image}
                            onChange={e => {
                              const next = [...form.bundles]
                              next[idx] = { ...next[idx], image: e.target.value }
                              update("bundles", next)
                            }}
                            placeholder="用对方主图"
                            className="w-full px-3 py-2 rounded text-sm"
                            style={{ backgroundColor: "var(--adm-bg)", border: "1px solid var(--adm-input-border)", color: "var(--adm-text)" }} />
                        </div>
                      </div>
                    </div>

                    <div className="mt-2">
                      <label className="block text-[10px] mb-1 opacity-60" style={{ color: "var(--adm-text)" }}>搭配说明（前台显示，可选）</label>
                      <input type="text" value={b.description}
                        onChange={e => {
                          const next = [...form.bundles]
                          next[idx] = { ...next[idx], description: e.target.value }
                          update("bundles", next)
                        }}
                        placeholder="Why they go well together"
                        className="w-full px-3 py-2 rounded text-sm"
                        style={{ backgroundColor: "var(--adm-bg)", border: "1px solid var(--adm-input-border)", color: "var(--adm-text)" }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* 添加搭配商品：搜索后从候选里点选 */}
          <button type="button"
            onClick={() => createHiddenProduct('bundle')}
            disabled={quickCreating}
            className="mt-3 mb-2 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
            style={{ backgroundColor: "var(--adm-accent)", color: "var(--adm-accent-text)" }}>
            {quickCreating ? "创建中…" : "＋ 新建搭配商品"}
          </button>

          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={bundleSearch}
              onChange={e => setBundleSearch(e.target.value)}
              placeholder="搜索商品名称或编码，然后从下方选择要搭配的商品"
              className="flex-1 px-4 py-2.5 rounded-lg text-sm"
              style={{ backgroundColor: "var(--adm-input)", border: "1px solid var(--adm-input-border)", color: "var(--adm-text)" }}
            />
          </div>

          <div className="mt-2 max-h-56 overflow-y-auto rounded-lg" style={{ border: "1px solid var(--adm-input-border)" }}>
            {allProducts
              .filter(p => p.id !== initial?.id && !form.bundles.some((b: any) => b.bundleProductId === p.id))
              .filter(p => {
                const q = bundleSearch.trim().toLowerCase()
                if (!q) return true
                return (p.name || "").toLowerCase().includes(q)
                  || (p.nameEn || "").toLowerCase().includes(q)
                  || (p.code || "").toLowerCase().includes(q)
              })
              .slice(0, 40)
              .map(p => (
                <button key={p.id} type="button"
                  onClick={() => update("bundles", [...form.bundles, {
                    bundleProductId: p.id, title: "", description: "", image: "", price: "", discount: "",
                  }])}
                  className="w-full flex items-center gap-3 px-3 py-2 text-left transition-colors"
                  style={{ borderBottom: "1px solid var(--adm-input-border)" }}>
                  {p.image && <img src={p.image} alt="" className="w-8 h-8 rounded object-cover shrink-0" />}
                  <span className="flex-1 min-w-0 text-sm truncate" style={{ color: "var(--adm-text)" }}>
                    {p.nameEn || p.name}
                    {/* 标出不在商店列表展示的商品，避免误选 */}
                    {(p as any).listingVisible === false && (
                      <span className="ml-2 px-1.5 py-0.5 rounded text-[9px] align-middle"
                        style={{ backgroundColor: "rgba(138,106,46,0.2)", color: "#C4A059" }}>
                        隐藏
                      </span>
                    )}
                  </span>
                  <span className="text-xs opacity-50 shrink-0" style={{ color: "var(--adm-text)" }}>${p.price}</span>
                  <Plus size={14} className="shrink-0 opacity-60" style={{ color: "var(--adm-text)" }} />
                </button>
              ))}
            {allProducts.filter(p => p.id !== initial?.id && !form.bundles.some((b: any) => b.bundleProductId === p.id)).length === 0 && (
              <p className="px-3 py-4 text-xs opacity-50" style={{ color: "var(--adm-text)" }}>
                没有其它可选商品（先把其它商品建好）
              </p>
            )}
          </div>
        </Section>

        {/* Status */}
        <Section title="Status">
          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.active} onChange={e => update("active", e.target.checked)} className="w-4 h-4" />
              <span className="text-sm" style={{ color: "var(--adm-text)" }}>Active (可售)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer" title="关闭后不出现在商店列表、搜索与分类页，但仍可售、仍能作为赠品/搭配使用">
              <input type="checkbox" checked={form.listingVisible} onChange={e => update("listingVisible", e.target.checked)} className="w-4 h-4" />
              <span className="text-sm" style={{ color: "var(--adm-text)" }}>Show in shop listing (列表展示)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.featured} onChange={e => update("featured", e.target.checked)} className="w-4 h-4" />
              <span className="text-sm" style={{ color: "var(--adm-text)" }}>Featured on Homepage</span>
            </label>
          </div>
          <p className="text-[11px] opacity-50 mt-3" style={{ color: "var(--adm-text)" }}>
            这两个开关的区别：<strong>可售</strong>决定能不能下单（也决定能不能当赠品/搭配）；
            <strong>列表展示</strong>只决定会不会出现在商店里。
            只作为赠品或配套商品用的商品，把「列表展示」关掉即可 —— 它不会出现在商店，但功能一切正常。
          </p>
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
