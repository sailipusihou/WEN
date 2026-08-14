'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  Percent, Ticket, Plus, Trash2, Eye, EyeOff, Package, Layers, Globe,
  Copy, Check, Sparkles, Pencil, X, Clock, TrendingUp, Gift, Tag, CalendarClock, Wand2, ImageIcon,
} from 'lucide-react'
import { computePromotionForProduct } from '@/lib/promotion-shared'
import ImageCropper from '@/components/admin/ImageCropper'

const inputCls = 'w-full px-3 py-2 rounded-lg text-sm'
const inputStyle = { backgroundColor: 'var(--adm-input)', border: '1px solid var(--adm-input-border)', color: 'var(--adm-text)' } as React.CSSProperties
const labelCls = 'block text-xs font-medium mb-1.5'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className={labelCls} style={{ color: 'var(--adm-text-secondary)' }}>{label}</label>
      {children}
    </div>
  )
}

const now = () => Date.now()
const hasEnded = (endAt?: string) => !!endAt && new Date(endAt).getTime() < now()
const hasStarted = (startAt?: string) => !startAt || new Date(startAt).getTime() <= now()

function promoStatus(p: any): { label: string; bg: string; text: string } {
  if (!p.active) return { label: 'Paused', bg: 'rgba(245,158,11,0.12)', text: '#F59E0B' }
  if (hasEnded(p.endAt)) return { label: 'Expired', bg: 'rgba(107,114,128,0.14)', text: '#9CA3AF' }
  if (!hasStarted(p.startAt)) return { label: 'Scheduled', bg: 'rgba(59,130,246,0.12)', text: '#3B82F6' }
  return { label: 'Active', bg: 'rgba(16,185,129,0.12)', text: '#10B981' }
}

function Badge({ status }: { status: { label: string; bg: string; text: string } }) {
  return (
    <span className="text-[10px] px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1"
      style={{ backgroundColor: status.bg, color: status.text }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: status.text }} />
      {status.label}
    </span>
  )
}

export default function AdminPromotionsPage() {
  const [tab, setTab] = useState<'promos' | 'coupons' | 'history'>('promos')
  const [promos, setPromos] = useState<any[]>([])
  const [coupons, setCoupons] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [discountTotal, setDiscountTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  // New / edit promotion form
  const emptyPromo = { name: '', scope: 'all', targetId: '', discountType: 'percent', value: '', startAt: '', endAt: '', active: true }
  const [pForm, setPForm] = useState({ ...emptyPromo })
  const [editingPromoId, setEditingPromoId] = useState<string | null>(null)
  // New / edit coupon form
  const emptyCoupon = { code: '', name: '', kind: 'manual', discountType: 'percent', value: '', minSpend: '', maxDiscount: '', validDays: '30', active: true, imageUrl: '' }
  const [cForm, setCForm] = useState({ ...emptyCoupon })
  const [editingCouponId, setEditingCouponId] = useState<string | null>(null)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  // ---- 优惠券图生成: 厂商/模型/裁剪/模板 ----
  const [imageProviders, setImageProviders] = useState<Record<string, any>>({})
  const [selProvider, setSelProvider] = useState('')
  const [selModel, setSelModel] = useState('')
  const [cropSrc, setCropSrc] = useState('')
  const [savingCrop, setSavingCrop] = useState(false)
  const [templates, setTemplates] = useState<any[]>([])

  // 加载 AI 生图厂商配置与券图模板
  useEffect(() => {
    fetch('/api/settings').then(r => r.ok ? r.json() : null).then(d => {
      const providers = d?.aiImageProviders || {}
      const keys = Object.keys(providers)
      if (keys.length > 0) {
        setImageProviders(providers)
        setSelProvider(keys[0])
        const firstModels = providers[keys[0]]?.models || []
        setSelModel(firstModels[0]?.id || '')
      }
    }).catch(() => {})
    fetch('/api/coupon-templates').then(r => r.ok ? r.json() : { templates: [] }).then(d => {
      setTemplates(Array.isArray(d.templates) ? d.templates : [])
    }).catch(() => {})
    fetch('/api/coupon-image-history').then(r => r.ok ? r.json() : { history: [] }).then(d => {
      setHistory(Array.isArray(d.history) ? d.history : [])
    }).catch(() => {})
  }, [])

  const providerModels = (imageProviders[selProvider]?.models as any[]) || []

  const loadAll = async () => {
    try {
      const [pr, cp, pd, ct] = await Promise.all([
        fetch('/api/promotions').then(r => r.ok ? r.json() : []),
        fetch('/api/coupons').then(r => r.ok ? r.json() : []),
        fetch('/api/products?pageSize=100').then(r => r.json()).catch(() => ({ items: [] })),
        fetch('/api/categories').then(r => r.ok ? r.json() : []),
      ])
      setPromos(Array.isArray(pr) ? pr : [])
      setCoupons(Array.isArray(cp) ? cp : [])
      const items = Array.isArray(pd) ? pd : (pd.items || [])
      setProducts(items)
      setCategories(Array.isArray(ct) ? ct : [])
    } finally {
      setLoading(false)
    }
    // Total discount given — best-effort (requires admin). Non-blocking.
    fetch('/api/orders?pageSize=0')
      .then(r => r.ok ? r.json() : [])
      .then((list: any[]) => {
        if (Array.isArray(list)) setDiscountTotal(list.reduce((s, o) => s + (Number(o.discount) || 0), 0))
      })
      .catch(() => {})
  }
  useEffect(() => { loadAll() }, [])

  // ---- KPI ----
  const kpi = useMemo(() => {
    const activePromos = promos.filter(p => p.active && hasStarted(p.startAt) && !hasEnded(p.endAt)).length
    const activeCoupons = coupons.filter(c => c.active).length
    const redemptions = coupons.reduce((s, c) => s + (Number(c.usedCount) || 0), 0)
    return { activePromos, activeCoupons, redemptions, discountTotal }
  }, [promos, coupons, discountTotal])

  const kpiCards = [
    { icon: Tag, label: 'Active Promotions', value: String(kpi.activePromos), sub: 'running now', color: '#10B981' },
    { icon: Ticket, label: 'Active Coupons', value: String(kpi.activeCoupons), sub: 'available to customers', color: '#3B82F6' },
    { icon: TrendingUp, label: 'Total Redemptions', value: String(kpi.redemptions), sub: 'coupon uses', color: '#8B5CF6' },
    { icon: Gift, label: 'Total Discount Given', value: `$${kpi.discountTotal.toFixed(0)}`, sub: 'saved by customers', color: '#F59E0B' },
  ]

  const scopeLabel = (scope: string, targetId?: string) => {
    if (scope === 'product') {
      const p = products.find(x => x.id === targetId)
      return p?.nameEn || p?.name || targetId
    }
    if (scope === 'category') {
      const c = categories.find(x => x.slug === targetId)
      return c?.nameEn || c?.name || targetId
    }
    return 'All Products'
  }

  const scopeIcon = (scope: string) => scope === 'product' ? Package : scope === 'category' ? Layers : Globe

  // ---- Promotion create / edit ----
  const startEditPromo = (p: any) => {
    setEditingPromoId(p.id)
    setPForm({
      name: p.name || '', scope: p.scope || 'all', targetId: p.targetId || '',
      discountType: p.discountType || 'percent', value: String(p.value ?? ''),
      startAt: p.startAt?.slice(0, 10) || '', endAt: p.endAt?.slice(0, 10) || '', active: p.active !== false,
    })
  }
  const resetPromoForm = () => { setPForm({ ...emptyPromo }); setEditingPromoId(null) }

  const savePromo = async () => {
    const value = Number(pForm.value)
    if (!pForm.name.trim() || !value) return
    const payload = {
      name: pForm.name.trim(),
      scope: pForm.scope,
      targetId: (pForm.scope === 'all' ? '' : pForm.targetId) || undefined,
      discountType: pForm.discountType,
      value,
      startAt: pForm.startAt || undefined,
      endAt: pForm.endAt || undefined,
      active: pForm.active,
    }
    const res = await fetch('/api/promotions', {
      method: editingPromoId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editingPromoId ? { ...payload, id: editingPromoId } : payload),
    })
    if (res.ok) { resetPromoForm(); loadAll() }
  }

  // ---- Coupon create / edit ----
  const startEditCoupon = (c: any) => {
    setEditingCouponId(c.id)
    setCForm({
      code: c.code || '', name: c.name || '', kind: c.kind || 'manual', discountType: c.discountType || 'percent',
      value: String(c.value ?? ''), minSpend: String(c.minSpend ?? ''), maxDiscount: c.maxDiscount ? String(c.maxDiscount) : '',
      validDays: String(c.validDays ?? 30), active: c.active !== false, imageUrl: c.imageUrl || '',
    })
  }
  const resetCouponForm = () => { setCForm({ ...emptyCoupon }); setEditingCouponId(null) }

  // ---- 优惠券图生成 (复用后台已配置的 AI 生图, 可选厂商/模型, 固定 1024x1024) ----
  const [couponImgGenerating, setCouponImgGenerating] = useState(false)
  const [couponImgError, setCouponImgError] = useState('')
  // 对话框模式: 自然语言描述想要的券效果; 按商品生成: 选择商品后券图带商品图案
  const [promptDesc, setPromptDesc] = useState('')
  const [selProductId, setSelProductId] = useState('')
  // 尺寸选项 (含细长/小尺寸); 商品范围: 全部 / 品类 / 单品 (品类与前端商品分类一致)
  const SIZE_OPTIONS = [
    { id: '1024x1024', label: '1024×1024 方形', ratio: 1 },
    { id: '768x1024', label: '768×1024 竖版 3:4', ratio: 0.75 },
    { id: '512x1024', label: '512×1024 细长 1:2', ratio: 0.5 },
    { id: '512x512', label: '512×512 小方', ratio: 1 },
    { id: '384x512', label: '384×512 小竖版 3:4', ratio: 0.75 },
  ]
  const [selSize, setSelSize] = useState('1024x1024')
  const [selCategory, setSelCategory] = useState('')
  // 商品搜索: 按名称/编码/ID 过滤
  const [productSearch, setProductSearch] = useState('')
  const [showProductList, setShowProductList] = useState(false)
  const productCategories = useMemo(() => {
    const set = new Set<string>()
    products.forEach((p: any) => { if (p.category) set.add(p.category) })
    return Array.from(set)
  }, [products])
  const categoryProducts = useMemo(
    () => (selCategory ? products.filter((p: any) => p.category === selCategory) : []),
    [selCategory, products]
  )
  // 搜索范围: 选了分类则限定该分类, 否则全商品
  const productFiltered = useMemo(() => {
    const base = selCategory ? categoryProducts : products
    const q = productSearch.trim().toLowerCase()
    if (!q) return base.slice(0, 30)
    return base.filter((p: any) =>
      (p.nameEn || '').toLowerCase().includes(q) ||
      (p.name || '').toLowerCase().includes(q) ||
      (p.code || '').toLowerCase().includes(q) ||
      String(p.id).toLowerCase().includes(q)
    ).slice(0, 30)
  }, [products, categoryProducts, selCategory, productSearch])
  const selProductInfo = useMemo(
    () => products.find((p: any) => p.id === selProductId) || null,
    [products, selProductId]
  )
  const currentRatio = (SIZE_OPTIONS.find(s => s.id === selSize) || SIZE_OPTIONS[0]).ratio
  // 历史图片 (生成/裁剪确认后自动记录, 可加入模板)
  const [history, setHistory] = useState<any[]>([])
  const [historyPreview, setHistoryPreview] = useState<any>(null)
  const generateCouponImage = async () => {
    const code = cForm.code.trim() || 'COUPON'
    const name = cForm.name.trim() || code
    const value = Number(cForm.value) || 0
    const discountLabel = value > 0 ? (cForm.discountType === 'percent' ? `${value}% OFF` : `$${value} OFF`) : 'SPECIAL OFFER'
    // 商品范围: 全部(无图案) / 品类代表图 / 具体商品
    let refUrl: string | undefined
    let productName = ''
    if (selCategory && !selProductId) {
      const rep = categoryProducts[0]
      if (rep) { refUrl = rep.image; productName = selCategory }
    } else if (selProductId) {
      const p = products.find((x: any) => x.id === selProductId)
      if (p) { refUrl = p.image; productName = p.nameEn || p.name }
    }
    // 对话框模式: 用户描述优先, 再叠加券基础信息
    const userDesc = promptDesc.trim()
    const descPart = userDesc ? `${userDesc}. ` : ''
    const productPart = productName ? ` featuring product/category "${productName}". ` : ''
    const prompt = `${descPart}Elegant e-commerce discount coupon design for "${name}" (code ${code}), large "${discountLabel}" in the center${productPart}luxurious oriental aesthetic with warm gold and deep red tones, subtle traditional Chinese pattern background, clean premium layout, high detail, vector style`
    setCouponImgGenerating(true)
    setCouponImgError('')
    try {
      const res = await fetch('/api/marketing/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // 选了商品/品类: 用其主图作参考图生成 (需模型支持 reference); 否则纯文字生成
          mode: refUrl ? 'reference' : 'text',
          prompt,
          size: selSize, // 尺寸可调 (含细长/小尺寸)
          count: 1,
          platform: 'general',
          provider: selProvider || undefined,
          model: selModel || undefined,
          referenceUrl: refUrl || undefined,
        }),
      })
      const d = await res.json()
      if (res.ok && d.images && d.images.length > 0) {
        setCropSrc(d.images[0]) // 生成后进入裁剪确认
        // 记录生成历史
        try {
          await fetch('/api/coupon-image-history', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: d.images[0], size: selSize, mode: refUrl ? 'reference' : 'text' }),
          })
        } catch { /* ignore */ }
      } else {
        setCouponImgError(d.error || 'Image generation failed')
      }
    } catch {
      setCouponImgError('Connection error')
    } finally {
      setCouponImgGenerating(false)
    }
  }

  // 记录生成/裁剪历史
  const recordHistory = async (url: string, size?: string, mode?: string) => {
    try {
      const res = await fetch('/api/coupon-image-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, size, mode }),
      })
      if (res.ok) {
        const d = await res.json()
        setHistory(prev => [d.entry, ...prev].slice(0, 100))
      }
    } catch { /* ignore */ }
  }

  // 裁剪确认: 上传裁剪结果作为券图
  const confirmCrop = async (blob: Blob) => {
    setSavingCrop(true)
    setCouponImgError('')
    try {
      const fd = new FormData()
      fd.append('file', blob, 'coupon.png')
      fd.append('type', 'image')
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const d = await res.json()
      if (res.ok && d.url) {
        setCForm(s => ({ ...s, imageUrl: d.url }))
        setCropSrc('')
        recordHistory(d.url, selSize, 'crop')
      } else {
        setCouponImgError(d.error || 'Upload failed')
      }
    } catch {
      setCouponImgError('Upload failed')
    } finally {
      setSavingCrop(false)
    }
  }

  // 保存为常用模板 (以后所有券可复用)
  const saveAsTemplate = async () => {
    if (!cForm.imageUrl) return
    try {
      const res = await fetch('/api/coupon-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: cForm.name || cForm.code, imageUrl: cForm.imageUrl }),
      })
      if (res.ok) {
        const d = await res.json()
        setTemplates(prev => [d.template, ...prev].slice(0, 30))
        setCouponImgError('')
      } else {
        const d = await res.json()
        setCouponImgError(d.error || 'Failed to save template')
      }
    } catch {
      setCouponImgError('Failed to save template')
    }
  }

  const removeTemplate = async (id: string) => {
    try {
      await fetch(`/api/coupon-templates?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
      setTemplates(prev => prev.filter(t => t.id !== id))
    } catch { /* ignore */ }
  }

  const generateCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let code = ''
    for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)]
    setCForm(s => ({ ...s, code }))
  }

  const saveCoupon = async () => {
    if (!cForm.code.trim() || !Number(cForm.value)) return
    const payload = {
      code: cForm.code.trim(),
      name: cForm.name.trim() || cForm.code.trim(),
      kind: cForm.kind,
      discountType: cForm.discountType,
      value: Number(cForm.value),
      minSpend: Number(cForm.minSpend) || 0,
      maxDiscount: cForm.maxDiscount ? Number(cForm.maxDiscount) : undefined,
      validDays: Number(cForm.validDays) || 30,
      active: cForm.active,
      imageUrl: cForm.imageUrl || undefined,
    }
    const res = await fetch('/api/coupons', {
      method: editingCouponId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editingCouponId ? { ...payload, id: editingCouponId } : payload),
    })
    if (res.ok) { resetCouponForm(); loadAll() }
  }

  // ---- toggles & delete ----
  const togglePromo = async (id: string, active: boolean) => {
    await fetch('/api/promotions', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, active }) })
    loadAll()
  }
  const toggleCoupon = async (id: string, active: boolean) => {
    await fetch('/api/coupons', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, active }) })
    loadAll()
  }
  const delPromo = async (id: string) => {
    if (!confirm('Delete this promotion?')) return
    await fetch(`/api/promotions?id=${id}`, { method: 'DELETE' })
    if (editingPromoId === id) resetPromoForm()
    loadAll()
  }
  const delCoupon = async (id: string) => {
    if (!confirm('Delete this coupon?')) return
    await fetch(`/api/coupons?id=${id}`, { method: 'DELETE' })
    if (editingCouponId === id) resetCouponForm()
    loadAll()
  }
  const copyCode = async (code: string) => {
    try { await navigator.clipboard.writeText(code) } catch { /* clipboard unavailable */ }
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  // ---- live discount preview for the promotion form ----
  const preview = useMemo(() => {
    const value = Number(pForm.value)
    if (!value || value <= 0) return null
    let sample: any = null
    if (pForm.scope === 'product') sample = products.find(x => x.id === pForm.targetId)
    else if (pForm.scope === 'category') sample = products.find(x => x.category === pForm.targetId)
    else sample = products[0]
    if (!sample) return null
    const eff = computePromotionForProduct(
      { id: sample.id, category: sample.category || '', price: sample.price },
      [{ id: 'preview', name: pForm.name || 'Preview', scope: pForm.scope as 'all' | 'category' | 'product', targetId: pForm.targetId || undefined, discountType: pForm.discountType as 'percent' | 'fixed', value, active: true, createdAt: '' }],
    )
    return { name: sample.nameEn || sample.name, original: sample.price, final: eff.price, discount: eff.discount }
  }, [pForm, products])

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" /></div>
  }

  const discountText = (t: string, v: number) => t === 'percent' ? `${v}% off` : `$${v} off`

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--adm-text)' }}>
          <Sparkles size={18} style={{ color: 'var(--adm-accent)' }} />
          Promotions & Coupons
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--adm-text-secondary)' }}>
          Product / category discount campaigns and customer coupons (including new-user welcome coupons).
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {kpiCards.map((c, i) => (
          <motion.div key={c.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="rounded-xl p-5" style={{ backgroundColor: 'var(--adm-card)', border: '1px solid var(--adm-border)' }}>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--adm-accent-bg)' }}>
                <c.icon size={18} style={{ color: c.color }} />
              </div>
            </div>
            <p className="text-2xl font-bold" style={{ color: 'var(--adm-text)' }}>{c.value}</p>
            <p className="text-xs mt-1" style={{ color: 'var(--adm-text-secondary)' }}>{c.label}</p>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--adm-text-secondary)', opacity: 0.7 }}>{c.sub}</p>
          </motion.div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <button onClick={() => setTab('promos')} className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all"
          style={{ backgroundColor: tab === 'promos' ? 'var(--adm-accent)' : 'var(--adm-input)', color: tab === 'promos' ? 'var(--adm-accent-text)' : 'var(--adm-text-secondary)' }}>
          <Percent size={15} /> Product Promotions
        </button>
        <button onClick={() => setTab('coupons')} className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all"
          style={{ backgroundColor: tab === 'coupons' ? 'var(--adm-accent)' : 'var(--adm-input)', color: tab === 'coupons' ? 'var(--adm-accent-text)' : 'var(--adm-text-secondary)' }}>
          <Ticket size={15} /> Coupons
        </button>
        <button onClick={() => setTab('history')} className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all"
          style={{ backgroundColor: tab === 'history' ? 'var(--adm-accent)' : 'var(--adm-input)', color: tab === 'history' ? 'var(--adm-accent-text)' : 'var(--adm-text-secondary)' }}>
          <ImageIcon size={15} /> Image History
        </button>
      </div>

      {tab === 'history' ? (
        /* ===== 历史图库: 每次生成的图片自动保存, 可查看/删除/加入模板 ===== */
        <div className="rounded-xl border p-5" style={{ backgroundColor: 'var(--adm-card)', borderColor: 'var(--adm-border)' }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--adm-text)' }}>
                <ImageIcon size={15} style={{ color: 'var(--adm-accent)' }} /> Coupon Image History
              </h3>
              <p className="text-xs mt-1" style={{ color: 'var(--adm-text-secondary)' }}>
                每次生成的券图自动保存在此 · 点击图片查看大图 · 可加入模板或删除
              </p>
            </div>
            {history.length > 0 && (
              <button onClick={() => setHistory([])} className="text-xs px-3 py-1.5 rounded-lg hover:bg-red-500/10"
                style={{ color: 'var(--adm-text-secondary)' }} title="Clear local view (server history remains)">
                Refresh
              </button>
            )}
          </div>
          {history.length === 0 ? (
            <div className="p-10 text-center">
              <ImageIcon size={28} style={{ color: 'var(--adm-text-secondary)', opacity: 0.4 }} className="mx-auto mb-3" />
              <p className="text-sm" style={{ color: 'var(--adm-text-secondary)' }}>暂无历史图片 — 在优惠券 Tab 生成图片后会自动出现在这里</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
              {history.map(h => (
                <div key={h.id} className="group relative aspect-square rounded-lg overflow-hidden border cursor-pointer"
                  style={{ borderColor: 'var(--adm-border)' }} onClick={() => setHistoryPreview(h)}>
                  <img src={h.url} alt="coupon history" className="w-full h-full object-cover" />
                  <div className="absolute inset-x-0 bottom-0 flex items-center justify-between px-1.5 py-1 bg-black/50 opacity-0 group-hover:opacity-100 transition-all">
                    <button onClick={async (e) => {
                      e.stopPropagation()
                      try {
                        const res = await fetch('/api/coupon-templates', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ name: 'History ' + h.id, imageUrl: h.url }),
                        })
                        if (res.ok) {
                          const d = await res.json()
                          setTemplates(prev => [d.template, ...prev].slice(0, 30))
                        }
                      } catch { /* ignore */ }
                    }} title="Add to templates"
                      className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center hover:scale-110 transition-transform">
                      <Plus size={11} />
                    </button>
                    <button onClick={async (e) => {
                      e.stopPropagation()
                      try {
                        await fetch(`/api/coupon-image-history?id=${encodeURIComponent(h.id)}`, { method: 'DELETE' })
                        setHistory(prev => prev.filter(x => x.id !== h.id))
                        if (historyPreview?.id === h.id) setHistoryPreview(null)
                      } catch { /* ignore */ }
                    }} title="Delete"
                      className="w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center hover:scale-110 transition-transform">
                      <Trash2 size={10} />
                    </button>
                  </div>
                  {h.size && (
                    <span className="absolute top-1 left-1 text-[9px] px-1 py-0.5 rounded bg-black/50 text-white/80">{h.size}</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* 大图预览 */}
          {historyPreview && (
            <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-6" onClick={() => setHistoryPreview(null)}>
              <div className="max-w-2xl w-full bg-white rounded-xl overflow-hidden" onClick={e => e.stopPropagation()}>
                <img src={historyPreview.url} alt="preview" className="w-full max-h-[70vh] object-contain bg-black/5" />
                <div className="p-4 flex items-center justify-between gap-3">
                  <p className="text-xs font-sans" style={{ color: 'var(--adm-text-secondary)' }}>
                    {historyPreview.size ? `Size: ${historyPreview.size} · ` : ''}{new Date(historyPreview.createdAt).toLocaleString()}
                  </p>
                  <div className="flex items-center gap-2">
                    <button onClick={async () => {
                      try {
                        const res = await fetch('/api/coupon-templates', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ name: 'History ' + historyPreview.id, imageUrl: historyPreview.url }),
                        })
                        if (res.ok) {
                          const d = await res.json()
                          setTemplates(prev => [d.template, ...prev].slice(0, 30))
                          setHistoryPreview(null)
                        }
                      } catch { /* ignore */ }
                    }}
                      className="px-4 py-2 rounded-lg text-xs font-medium inline-flex items-center gap-1.5"
                      style={{ backgroundColor: 'var(--adm-accent)', color: 'var(--adm-accent-text)' }}>
                      <Plus size={13} /> Add to Templates
                    </button>
                    <button onClick={async () => {
                      try {
                        await fetch(`/api/coupon-image-history?id=${encodeURIComponent(historyPreview.id)}`, { method: 'DELETE' })
                        setHistory(prev => prev.filter(x => x.id !== historyPreview.id))
                        setHistoryPreview(null)
                      } catch { /* ignore */ }
                    }}
                      className="px-4 py-2 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 bg-red-500 text-white">
                      <Trash2 size={13} /> Delete
                    </button>
                    <button onClick={() => setHistoryPreview(null)}
                      className="px-4 py-2 rounded-lg text-xs font-medium" style={{ backgroundColor: 'var(--adm-input)', color: 'var(--adm-text-secondary)' }}>
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : tab === 'promos' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Promotion list */}
          <div className="lg:col-span-2 space-y-3">
            {promos.length === 0 ? (
              <div className="rounded-xl border p-10 text-center" style={{ backgroundColor: 'var(--adm-card)', borderColor: 'var(--adm-border)' }}>
                <div className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: 'var(--adm-accent-bg)' }}>
                  <Percent size={24} style={{ color: 'var(--adm-accent)' }} />
                </div>
                <p className="text-sm font-medium" style={{ color: 'var(--adm-text)' }}>No promotions yet</p>
                <p className="text-xs mt-1 mb-4" style={{ color: 'var(--adm-text-secondary)' }}>Create your first promotion to discount products or categories</p>
              </div>
            ) : promos.map((p, i) => {
              const st = promoStatus(p)
              const ScopeIcon = scopeIcon(p.scope)
              return (
                <motion.div key={p.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.04, 0.4) }}
                  className="rounded-xl border p-5 group" style={{ backgroundColor: 'var(--adm-card)', borderColor: 'var(--adm-border)' }}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <Badge status={st} />
                        <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium"
                          style={{ backgroundColor: 'var(--adm-input)', color: 'var(--adm-text-secondary)' }}>
                          <ScopeIcon size={10} /> {p.scope === 'product' ? 'Single Product' : p.scope === 'category' ? 'Category' : 'All Products'}
                        </span>
                      </div>
                      <p className="text-sm font-semibold truncate" style={{ color: 'var(--adm-text)' }}>{p.name}</p>
                      <p className="text-xs mt-1" style={{ color: 'var(--adm-text-secondary)' }}>
                        {scopeLabel(p.scope, p.targetId)}
                      </p>
                      {p.startAt || p.endAt ? (
                        <p className="text-[11px] mt-1.5 flex items-center gap-1" style={{ color: 'var(--adm-text-secondary)' }}>
                          <Clock size={11} />
                          {p.startAt ? p.startAt.slice(0, 10) : '—'} → {p.endAt ? p.endAt.slice(0, 10) : 'No end date'}
                        </p>
                      ) : null}
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-lg font-bold" style={{ color: 'var(--adm-accent)' }}>{discountText(p.discountType, p.value)}</p>
                      <div className="flex items-center gap-1 justify-end mt-2">
                        <button onClick={() => startEditPromo(p)} className="p-1.5 rounded-lg hover:bg-cyan-500/10 transition-colors" style={{ color: 'var(--adm-text-secondary)' }} title="Edit">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => togglePromo(p.id, !p.active)} className="p-1.5 rounded-lg hover:bg-amber-500/10 transition-colors" style={{ color: 'var(--adm-text-secondary)' }} title="Toggle">
                          {/* 修复: 启用中显示睁眼(正在展示), 停用时显示闭眼(已隐藏) — 原图标语义反了 */}
                          {p.active ? <Eye size={14} /> : <EyeOff size={14} />}
                        </button>
                        <button onClick={() => delPromo(p.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors" style={{ color: 'var(--adm-text-secondary)' }} title="Delete">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>

          {/* Promotion form */}
          <div className="rounded-xl border p-5 space-y-4 h-fit" style={{ backgroundColor: 'var(--adm-card)', borderColor: 'var(--adm-border)' }}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--adm-text)' }}>
                <Percent size={15} style={{ color: 'var(--adm-accent)' }} /> {editingPromoId ? 'Edit Promotion' : 'New Promotion'}
              </h3>
              {editingPromoId && (
                <button onClick={resetPromoForm} className="p-1 rounded hover:bg-red-500/10" style={{ color: 'var(--adm-text-secondary)' }} title="Cancel">
                  <X size={14} />
                </button>
              )}
            </div>
            <Field label="Name *">
              <input className={inputCls} style={inputStyle} value={pForm.name} onChange={e => setPForm(s => ({ ...s, name: e.target.value }))} placeholder="Summer Launch -20%" />
            </Field>
            <Field label="Scope">
              <select className={inputCls} style={inputStyle} value={pForm.scope} onChange={e => setPForm(s => ({ ...s, scope: e.target.value, targetId: '' }))}>
                <option value="all">All Products</option>
                <option value="category">Category</option>
                <option value="product">Single Product</option>
              </select>
            </Field>
            {pForm.scope !== 'all' && (
              <Field label={pForm.scope === 'product' ? 'Single Product' : 'Category'}>
                <select className={inputCls} style={inputStyle} value={pForm.targetId} onChange={e => setPForm(s => ({ ...s, targetId: e.target.value }))}>
                  <option value="">Select...</option>
                  {pForm.scope === 'product'
                    ? products.map(p => <option key={p.id} value={p.id}>{p.nameEn || p.name}</option>)
                    : categories.map(c => <option key={c.slug} value={c.slug}>{c.nameEn || c.name}</option>)}
                </select>
              </Field>
            )}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Discount Type">
                <select className={inputCls} style={inputStyle} value={pForm.discountType} onChange={e => setPForm(s => ({ ...s, discountType: e.target.value }))}>
                  <option value="percent">Percent</option>
                  <option value="fixed">Fixed</option>
                </select>
              </Field>
              <Field label="Discount Value *">
                <input className={inputCls} style={inputStyle} type="number" min="0" value={pForm.value} onChange={e => setPForm(s => ({ ...s, value: e.target.value }))} placeholder="20" />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Start date">
                <input className={inputCls} style={inputStyle} type="date" value={pForm.startAt} onChange={e => setPForm(s => ({ ...s, startAt: e.target.value }))} />
              </Field>
              <Field label="End date">
                <input className={inputCls} style={inputStyle} type="date" value={pForm.endAt} onChange={e => setPForm(s => ({ ...s, endAt: e.target.value }))} />
              </Field>
            </div>

            {/* Live preview */}
            {preview && (
              <div className="rounded-lg p-3" style={{ backgroundColor: 'var(--adm-input)' }}>
                <p className="text-[11px] font-medium mb-1.5 flex items-center gap-1" style={{ color: 'var(--adm-text-secondary)' }}>
                  <Sparkles size={11} style={{ color: 'var(--adm-accent)' }} /> Discount Preview
                </p>
                <p className="text-xs truncate" style={{ color: 'var(--adm-text)' }}>{preview.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs line-through" style={{ color: 'var(--adm-text-secondary)' }}>${preview.original.toFixed(2)}</span>
                  <span className="text-base font-bold" style={{ color: '#10B981' }}>${preview.final.toFixed(2)}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ backgroundColor: 'rgba(16,185,129,0.12)', color: '#10B981' }}>
                    -${preview.discount.toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={pForm.active} onChange={e => setPForm(s => ({ ...s, active: e.target.checked }))} className="w-4 h-4" />
              <span className="text-sm" style={{ color: 'var(--adm-text)' }}>Active</span>
            </label>
            <button onClick={savePromo} className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium transition-opacity hover:opacity-90"
              style={{ backgroundColor: 'var(--adm-accent)', color: 'var(--adm-accent-text)' }}>
              <Plus size={14} /> {editingPromoId ? 'Save Changes' : 'Create Promotion'}
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Coupon list */}
          <div className="lg:col-span-2 space-y-3">
            {coupons.length === 0 ? (
              <div className="rounded-xl border p-10 text-center" style={{ backgroundColor: 'var(--adm-card)', borderColor: 'var(--adm-border)' }}>
                <div className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: 'var(--adm-accent-bg)' }}>
                  <Ticket size={24} style={{ color: 'var(--adm-accent)' }} />
                </div>
                <p className="text-sm font-medium" style={{ color: 'var(--adm-text)' }}>No coupons yet</p>
                <p className="text-xs mt-1 mb-4" style={{ color: 'var(--adm-text-secondary)' }}>Create a coupon to offer discounts to customers</p>
              </div>
            ) : coupons.map((c, i) => (
              <motion.div key={c.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.04, 0.4) }}
                className="rounded-xl border p-5" style={{ backgroundColor: 'var(--adm-card)', borderColor: 'var(--adm-border)' }}>
                <div className="flex items-start justify-between gap-3">
                  {c.imageUrl && (
                    <img src={c.imageUrl} alt={c.name} className="w-14 h-14 object-cover rounded-lg shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <button onClick={() => copyCode(c.code)} className="inline-flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded-lg transition-colors"
                        style={{ backgroundColor: 'var(--adm-input)', color: 'var(--adm-accent)' }} title="Copy Code">
                        {c.code}
                        {copiedCode === c.code ? <Check size={12} style={{ color: '#10B981' }} /> : <Copy size={12} />}
                      </button>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                        style={{ backgroundColor: c.kind === 'welcome' ? 'rgba(139,92,246,0.12)' : 'rgba(59,130,246,0.12)', color: c.kind === 'welcome' ? '#8B5CF6' : '#3B82F6' }}>
                        {c.kind === 'welcome' ? 'Welcome' : 'Manual'}
                      </span>
                      <Badge status={c.active
                        ? { label: 'Active', bg: 'rgba(16,185,129,0.12)', text: '#10B981' }
                        : { label: 'Paused', bg: 'rgba(245,158,11,0.12)', text: '#F59E0B' }} />
                    </div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--adm-text)' }}>{c.name}</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--adm-text-secondary)' }}>
                      {discountText(c.discountType, c.value)}
                      {c.minSpend > 0 ? ` · Min Spend $${c.minSpend}` : ''}
                      {c.maxDiscount ? ` · Max Discount $${c.maxDiscount}` : ''}
                      {` · Valid Days ${c.validDays}`}
                    </p>
                    <p className="text-[11px] mt-1.5 flex items-center gap-1" style={{ color: 'var(--adm-text-secondary)' }}>
                      <Clock size={11} /> Used {c.usedCount} times
                    </p>
                  </div>
                  <div className="shrink-0 flex items-center gap-1">
                    <button onClick={() => startEditCoupon(c)} className="p-1.5 rounded-lg hover:bg-cyan-500/10 transition-colors" style={{ color: 'var(--adm-text-secondary)' }} title="Edit">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => toggleCoupon(c.id, !c.active)} className="p-1.5 rounded-lg hover:bg-amber-500/10 transition-colors" style={{ color: 'var(--adm-text-secondary)' }} title="Toggle">
                      {/* 修复: 启用中显示睁眼, 停用时显示闭眼 — 原图标语义反了 */}
                      {c.active ? <Eye size={14} /> : <EyeOff size={14} />}
                    </button>
                    <button onClick={() => delCoupon(c.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors" style={{ color: 'var(--adm-text-secondary)' }} title="Delete">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Coupon form */}
          <div className="rounded-xl border p-5 space-y-4 h-fit" style={{ backgroundColor: 'var(--adm-card)', borderColor: 'var(--adm-border)' }}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--adm-text)' }}>
                <Ticket size={15} style={{ color: 'var(--adm-accent)' }} /> {editingCouponId ? 'Edit Coupon' : 'New Coupon'}
              </h3>
              {editingCouponId && (
                <button onClick={resetCouponForm} className="p-1 rounded hover:bg-red-500/10" style={{ color: 'var(--adm-text-secondary)' }} title="Cancel">
                  <X size={14} />
                </button>
              )}
            </div>
            <Field label="Coupon code *">
              <div className="flex gap-2">
                <input className={inputCls} style={inputStyle} value={cForm.code} onChange={e => setCForm(s => ({ ...s, code: e.target.value.toUpperCase() }))} placeholder="WELCOME10" />
                <button onClick={generateCode} className="shrink-0 px-3 rounded-lg text-xs font-medium flex items-center gap-1.5"
                  style={{ backgroundColor: 'var(--adm-input)', border: '1px solid var(--adm-input-border)', color: 'var(--adm-text-secondary)' }} title="Generate Code">
                  <Wand2 size={13} /> Generate Code
                </button>
              </div>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Coupon Kind">
                <select className={inputCls} style={inputStyle} value={cForm.kind} onChange={e => setCForm(s => ({ ...s, kind: e.target.value }))}>
                  <option value="manual">Manual</option>
                  <option value="welcome">Welcome (new users)</option>
                </select>
              </Field>
              <Field label="Name">
                <input className={inputCls} style={inputStyle} value={cForm.name} onChange={e => setCForm(s => ({ ...s, name: e.target.value }))} placeholder="Welcome Discount" />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Discount Type">
                <select className={inputCls} style={inputStyle} value={cForm.discountType} onChange={e => setCForm(s => ({ ...s, discountType: e.target.value }))}>
                  <option value="percent">Percent</option>
                  <option value="fixed">Fixed</option>
                </select>
              </Field>
              <Field label="Discount Value *">
                <input className={inputCls} style={inputStyle} type="number" min="0" value={cForm.value} onChange={e => setCForm(s => ({ ...s, value: e.target.value }))} placeholder="10" />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Min Spend">
                <input className={inputCls} style={inputStyle} type="number" min="0" value={cForm.minSpend} onChange={e => setCForm(s => ({ ...s, minSpend: e.target.value }))} placeholder="0" />
              </Field>
              <Field label="Max Discount">
                <input className={inputCls} style={inputStyle} type="number" min="0" value={cForm.maxDiscount} onChange={e => setCForm(s => ({ ...s, maxDiscount: e.target.value }))} placeholder="Optional" />
              </Field>
            </div>
            <Field label="Valid Days">
              <div className="flex items-center gap-2">
                <input className={inputCls} style={inputStyle} type="number" min="1" value={cForm.validDays} onChange={e => setCForm(s => ({ ...s, validDays: e.target.value }))} />
                <CalendarClock size={16} style={{ color: 'var(--adm-text-secondary)' }} className="shrink-0" />
              </div>
            </Field>

            {/* 优惠券图生成 (复用后台 AI 生图) */}
            <div className="rounded-lg border p-3 space-y-2" style={{ borderColor: 'var(--adm-border)' }}>
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium" style={{ color: 'var(--adm-text)' }}>Coupon Image ({selSize})</p>
              </div>

              {/* 对话框模式: 自然语言描述想要的效果 */}
              <div>
                <p className="text-[10px] mb-1" style={{ color: 'var(--adm-text-secondary)' }}>
                  Describe the coupon style (optional) — e.g. "red & gold festive, big SALE banner, elegant"
                </p>
                <div className="flex gap-2">
                  <input
                    className={inputCls}
                    style={inputStyle}
                    value={promptDesc}
                    onChange={e => setPromptDesc(e.target.value)}
                    placeholder="用一句话形容想要的优惠券效果…"
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); generateCouponImage() } }}
                  />
                  <button onClick={generateCouponImage} disabled={couponImgGenerating}
                    className="shrink-0 px-3 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 transition-opacity hover:opacity-90 disabled:opacity-50"
                    style={{ backgroundColor: 'var(--adm-accent)', color: 'var(--adm-accent-text)' }}>
                    <ImageIcon size={13} /> {couponImgGenerating ? '...' : 'Generate'}
                  </button>
                </div>
              </div>

              {/* 按商品生成: 全部 / 品类 / 单品 (品类与前端商品分类一致; 商品可按名称/编码搜索) */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-[10px] mb-1" style={{ color: 'var(--adm-text-secondary)' }}>Product range</p>
                  <select className={inputCls} style={inputStyle} value={selCategory}
                    onChange={e => {
                      setSelCategory(e.target.value)
                      setSelProductId('') // 切换分类后重新选择商品; 留空 = 只针对分类
                      setProductSearch('')
                    }}>
                    <option value="">All products (text only)</option>
                    {productCategories.map(cat => (
                      <option key={cat} value={cat}>Category: {cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <p className="text-[10px] mb-1" style={{ color: 'var(--adm-text-secondary)' }}>Product (search by name / code)</p>
                  <div className="relative">
                    <input
                      className={inputCls}
                      style={inputStyle}
                      value={productSearch}
                      onChange={e => { setProductSearch(e.target.value); setShowProductList(true) }}
                      onFocus={() => setShowProductList(true)}
                      onBlur={() => setTimeout(() => setShowProductList(false), 150)}
                      placeholder={selCategory ? '搜索该分类商品…' : '先选分类, 或直接搜索商品…'}
                    />
                    {showProductList && productFiltered.length > 0 && (
                      <div className="absolute z-20 mt-1 w-full max-h-48 overflow-auto rounded-lg border shadow-lg"
                        style={{ backgroundColor: 'var(--adm-card)', borderColor: 'var(--adm-border)' }}>
                        {productFiltered.map((p: any) => (
                          <button key={p.id} type="button"
                            onMouseDown={() => {
                              setSelProductId(p.id)
                              setProductSearch(p.nameEn || p.name)
                              setShowProductList(false)
                            }}
                            className="w-full text-left px-3 py-2 text-xs flex items-center gap-2 hover:opacity-80 transition-opacity"
                            style={{ color: 'var(--adm-text)', borderBottom: '1px solid var(--adm-border)' }}>
                            <img src={p.image} alt="" className="w-6 h-6 rounded object-cover" />
                            <span className="truncate flex-1">{p.nameEn || p.name}</span>
                            {p.code && <span className="font-mono text-[10px] shrink-0" style={{ color: 'var(--adm-accent)' }}>{p.code}</span>}
                          </button>
                        ))}
                      </div>
                    )}
                    {selProductInfo && (
                      <div className="mt-1.5 flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs"
                        style={{ backgroundColor: 'var(--adm-accent-bg)', color: 'var(--adm-text)' }}>
                        <img src={selProductInfo.image} alt="" className="w-6 h-6 rounded object-cover" />
                        <span className="truncate flex-1">{selProductInfo.nameEn || selProductInfo.name}</span>
                        {selProductInfo.code && <span className="font-mono text-[10px]" style={{ color: 'var(--adm-accent)' }}>{selProductInfo.code}</span>}
                        <button type="button" onClick={() => { setSelProductId(''); setProductSearch('') }}
                          className="p-0.5 hover:text-red-500" title="Clear product">
                          <X size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 尺寸选项 (含细长/小尺寸) */}
              <div>
                <p className="text-[10px] mb-1" style={{ color: 'var(--adm-text-secondary)' }}>Image size</p>
                <select className={inputCls} style={inputStyle} value={selSize} onChange={e => setSelSize(e.target.value)}>
                  {SIZE_OPTIONS.map(s => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </select>
              </div>

              {/* 厂商与模型选择 */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-[10px] mb-1" style={{ color: 'var(--adm-text-secondary)' }}>Provider</p>
                  <select className={inputCls} style={inputStyle} value={selProvider}
                    onChange={e => {
                      setSelProvider(e.target.value)
                      const models = imageProviders[e.target.value]?.models || []
                      setSelModel(models[0]?.id || '')
                    }}>
                    {Object.keys(imageProviders).map(k => (
                      <option key={k} value={k}>{imageProviders[k]?.label || k}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <p className="text-[10px] mb-1" style={{ color: 'var(--adm-text-secondary)' }}>Model</p>
                  <select className={inputCls} style={inputStyle} value={selModel} onChange={e => setSelModel(e.target.value)}>
                    {providerModels.map((m: any) => (
                      <option key={m.id} value={m.id}>{m.label || m.id}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 生成后裁剪确认 */}
              {cropSrc && (
                <ImageCropper
                  src={cropSrc}
                  aspectRatio={currentRatio}
                  onConfirm={async blob => { await confirmCrop(blob) }}
                  onCancel={() => setCropSrc('')}
                />
              )}
              {savingCrop && <p className="text-[11px]" style={{ color: 'var(--adm-text-secondary)' }}>Saving cropped image...</p>}

              {/* 已确认的券图 */}
              {cForm.imageUrl && !cropSrc ? (
                <div className="relative">
                  <img src={cForm.imageUrl} alt="Coupon preview" className="w-full max-h-48 object-cover rounded-md" />
                  <div className="absolute top-1.5 right-1.5 flex items-center gap-1">
                    <button onClick={saveAsTemplate} title="Save as reusable template"
                      className="p-1.5 rounded-full bg-black/50 text-white hover:bg-black/70">
                      <Sparkles size={12} />
                    </button>
                    <button onClick={() => setCForm(s => ({ ...s, imageUrl: '' }))}
                      className="p-1.5 rounded-full bg-black/50 text-white hover:bg-black/70" title="Remove image">
                      <X size={12} />
                    </button>
                  </div>
                  <p className="text-[10px] mt-1" style={{ color: 'var(--adm-text-secondary)' }}>点击 ✦ 保存为常用模板，之后所有优惠券可复用</p>
                </div>
              ) : !cropSrc ? (
                <p className="text-[11px]" style={{ color: 'var(--adm-text-secondary)' }}>选择厂商/模型后生成，可裁剪确认；保存后关联到该券并在前端展示</p>
              ) : null}
              {couponImgError && <p className="text-[11px] text-red-500">{couponImgError}</p>}

              {/* 常用模板 */}
              {templates.length > 0 && (
                <div className="pt-1">
                  <p className="text-[10px] mb-1.5" style={{ color: 'var(--adm-text-secondary)' }}>Templates (click to use · hover to delete)</p>
                  <div className="flex flex-wrap gap-2">
                    {templates.map(t => (
                      <div key={t.id} className="relative group">
                        <button onClick={() => { setCForm(s => ({ ...s, imageUrl: t.imageUrl })); setCropSrc('') }}
                          className={"w-14 h-14 rounded-md overflow-hidden border-2 transition-all hover:scale-105 " + (cForm.imageUrl === t.imageUrl ? "border-otb-terracotta" : "border-transparent")}
                          title={t.name}>
                          <img src={t.imageUrl} alt={t.name} className="w-full h-full object-cover" />
                        </button>
                        <button onClick={() => removeTemplate(t.id)}
                          className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 text-white hidden group-hover:flex items-center justify-center" title="Delete template">
                          <X size={9} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 生成历史已移至独立的 "Image History" Tab (每次生成/裁剪自动记录) */}
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={cForm.active} onChange={e => setCForm(s => ({ ...s, active: e.target.checked }))} className="w-4 h-4" />
              <span className="text-sm" style={{ color: 'var(--adm-text)' }}>Active</span>
            </label>
            <button onClick={saveCoupon} className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium transition-opacity hover:opacity-90"
              style={{ backgroundColor: 'var(--adm-accent)', color: 'var(--adm-accent-text)' }}>
              <Plus size={14} /> {editingCouponId ? 'Save Changes' : 'Create Coupon'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
