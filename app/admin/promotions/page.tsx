'use client'

import { useState, useEffect, useMemo } from 'react'
import { Percent, Ticket, Plus, Trash2, Eye, EyeOff, Package, Layers, Globe } from 'lucide-react'

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

export default function AdminPromotionsPage() {
  const [tab, setTab] = useState<'promos' | 'coupons'>('promos')
  const [promos, setPromos] = useState<any[]>([])
  const [coupons, setCoupons] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // New promotion form
  const [pForm, setPForm] = useState({ name: '', scope: 'all', targetId: '', discountType: 'percent', value: '', startAt: '', endAt: '', active: true })
  // New coupon form
  const [cForm, setCForm] = useState({ code: '', name: '', kind: 'manual', discountType: 'percent', value: '', minSpend: '', maxDiscount: '', validDays: '30', active: true })

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
  }
  useEffect(() => { loadAll() }, [])

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

  const savePromo = async () => {
    const value = Number(pForm.value)
    if (!pForm.name.trim() || !value) return
    const res = await fetch('/api/promotions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: pForm.name.trim(),
        scope: pForm.scope,
        targetId: (pForm.scope === 'all' ? '' : pForm.targetId) || undefined,
        discountType: pForm.discountType,
        value,
        startAt: pForm.startAt || undefined,
        endAt: pForm.endAt || undefined,
        active: pForm.active,
      }),
    })
    if (res.ok) {
      setPForm({ name: '', scope: 'all', targetId: '', discountType: 'percent', value: '', startAt: '', endAt: '', active: true })
      loadAll()
    }
  }

  const saveCoupon = async () => {
    if (!cForm.code.trim() || !Number(cForm.value)) return
    const res = await fetch('/api/coupons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: cForm.code.trim(),
        name: cForm.name.trim() || cForm.code.trim(),
        kind: cForm.kind,
        discountType: cForm.discountType,
        value: Number(cForm.value),
        minSpend: Number(cForm.minSpend) || 0,
        maxDiscount: cForm.maxDiscount ? Number(cForm.maxDiscount) : undefined,
        validDays: Number(cForm.validDays) || 30,
        active: cForm.active,
      }),
    })
    if (res.ok) {
      setCForm({ code: '', name: '', kind: 'manual', discountType: 'percent', value: '', minSpend: '', maxDiscount: '', validDays: '30', active: true })
      loadAll()
    }
  }

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
    loadAll()
  }
  const delCoupon = async (id: string) => {
    if (!confirm('Delete this coupon?')) return
    await fetch(`/api/coupons?id=${id}`, { method: 'DELETE' })
    loadAll()
  }

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--adm-text)' }}>Promotions & Coupons</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--adm-text-secondary)' }}>
            Product / category discount campaigns and customer coupons (including new-user welcome coupons).
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button onClick={() => setTab('promos')} className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
          style={{ backgroundColor: tab === 'promos' ? 'var(--adm-accent)' : 'var(--adm-input)', color: tab === 'promos' ? 'var(--adm-accent-text)' : 'var(--adm-text-secondary)' }}>
          <Percent size={15} /> Product Promotions
        </button>
        <button onClick={() => setTab('coupons')} className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
          style={{ backgroundColor: tab === 'coupons' ? 'var(--adm-accent)' : 'var(--adm-input)', color: tab === 'coupons' ? 'var(--adm-accent-text)' : 'var(--adm-text-secondary)' }}>
          <Ticket size={15} /> Coupons
        </button>
      </div>

      {tab === 'promos' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* List */}
          <div className="lg:col-span-2 space-y-3">
            {promos.length === 0 ? (
              <div className="rounded-xl border p-8 text-center text-sm" style={{ backgroundColor: 'var(--adm-card)', borderColor: 'var(--adm-border)', color: 'var(--adm-text-secondary)' }}>
                No promotions yet. Create one to discount products or categories on the storefront.
              </div>
            ) : promos.map(p => (
              <div key={p.id} className="rounded-xl border p-5" style={{ backgroundColor: 'var(--adm-card)', borderColor: 'var(--adm-border)' }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold" style={{ color: 'var(--adm-text)' }}>{p.name}</p>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                        style={{ backgroundColor: p.active ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)', color: p.active ? '#10B981' : '#F59E0B' }}>
                        {p.active ? 'Active' : 'Paused'}
                      </span>
                    </div>
                    <p className="text-xs mt-1" style={{ color: 'var(--adm-text-secondary)' }}>
                      {p.scope === 'product' && <><Package size={11} className="inline mr-1" />Product: </>}
                      {p.scope === 'category' && <><Layers size={11} className="inline mr-1" />Category: </>}
                      {p.scope === 'all' && <><Globe size={11} className="inline mr-1" />All products · </>}
                      {scopeLabel(p.scope, p.targetId)} · {p.discountType === 'percent' ? `${p.value}% off` : `$${p.value} off`}
                    </p>
                    {p.startAt || p.endAt ? (
                      <p className="text-[11px] mt-1" style={{ color: 'var(--adm-text-secondary)' }}>
                        {p.startAt ? `${p.startAt.slice(0, 10)} → ` : ''}{p.endAt ? p.endAt.slice(0, 10) : 'no end date'}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => togglePromo(p.id, !p.active)} className="p-1.5 rounded-lg" style={{ color: 'var(--adm-text-secondary)' }}>
                      {p.active ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                    <button onClick={() => delPromo(p.id)} className="p-1.5 rounded-lg hover:bg-red-500/10" style={{ color: 'var(--adm-text-secondary)' }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Create form */}
          <div className="rounded-xl border p-5 space-y-4 h-fit" style={{ backgroundColor: 'var(--adm-card)', borderColor: 'var(--adm-border)' }}>
            <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--adm-text)' }}>
              <Percent size={15} style={{ color: 'var(--adm-accent)' }} /> New Promotion
            </h3>
            <Field label="Name *">
              <input className={inputCls} style={inputStyle} value={pForm.name} onChange={e => setPForm(s => ({ ...s, name: e.target.value }))} placeholder="Summer Launch -20%" />
            </Field>
            <Field label="Scope">
              <select className={inputCls} style={inputStyle} value={pForm.scope} onChange={e => setPForm(s => ({ ...s, scope: e.target.value }))}>
                <option value="all">All Products</option>
                <option value="category">Category</option>
                <option value="product">Single Product</option>
              </select>
            </Field>
            {pForm.scope !== 'all' && (
              <Field label={pForm.scope === 'product' ? 'Product' : 'Category'}>
                <select className={inputCls} style={inputStyle} value={pForm.targetId} onChange={e => setPForm(s => ({ ...s, targetId: e.target.value }))}>
                  <option value="">Select...</option>
                  {pForm.scope === 'product'
                    ? products.map(p => <option key={p.id} value={p.id}>{p.nameEn || p.name}</option>)
                    : categories.map(c => <option key={c.slug} value={c.slug}>{c.nameEn || c.name}</option>)}
                </select>
              </Field>
            )}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Type">
                <select className={inputCls} style={inputStyle} value={pForm.discountType} onChange={e => setPForm(s => ({ ...s, discountType: e.target.value }))}>
                  <option value="percent">Percent %</option>
                  <option value="fixed">Fixed $</option>
                </select>
              </Field>
              <Field label="Value *">
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
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={pForm.active} onChange={e => setPForm(s => ({ ...s, active: e.target.checked }))} className="w-4 h-4" />
              <span className="text-sm" style={{ color: 'var(--adm-text)' }}>Active</span>
            </label>
            <button onClick={savePromo} className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium"
              style={{ backgroundColor: 'var(--adm-accent)', color: 'var(--adm-accent-text)' }}>
              <Plus size={14} /> Create Promotion
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* List */}
          <div className="lg:col-span-2 space-y-3">
            {coupons.length === 0 ? (
              <div className="rounded-xl border p-8 text-center text-sm" style={{ backgroundColor: 'var(--adm-card)', borderColor: 'var(--adm-border)', color: 'var(--adm-text-secondary)' }}>
                No coupons yet. Create a coupon; set kind to &quot;Welcome&quot; to auto-grant it to new registrations.
              </div>
            ) : coupons.map(c => (
              <div key={c.id} className="rounded-xl border p-5" style={{ backgroundColor: 'var(--adm-card)', borderColor: 'var(--adm-border)' }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <code className="text-xs font-mono px-2 py-0.5 rounded" style={{ backgroundColor: 'var(--adm-input)', color: 'var(--adm-accent)' }}>{c.code}</code>
                      <span className="text-sm font-semibold" style={{ color: 'var(--adm-text)' }}>{c.name}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                        style={{ backgroundColor: c.kind === 'welcome' ? 'rgba(139,92,246,0.12)' : 'rgba(59,130,246,0.12)', color: c.kind === 'welcome' ? '#8B5CF6' : '#3B82F6' }}>
                        {c.kind === 'welcome' ? 'Welcome' : 'Manual'}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                        style={{ backgroundColor: c.active ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)', color: c.active ? '#10B981' : '#F59E0B' }}>
                        {c.active ? 'Active' : 'Paused'}
                      </span>
                    </div>
                    <p className="text-xs mt-1" style={{ color: 'var(--adm-text-secondary)' }}>
                      {c.discountType === 'percent' ? `${c.value}% off` : `$${c.value} off`}
                      {c.minSpend > 0 ? ` · min spend $${c.minSpend}` : ''}
                      {c.maxDiscount ? ` · max discount $${c.maxDiscount}` : ''}
                      {` · valid ${c.validDays} days`}
                    </p>
                    <p className="text-[11px] mt-1" style={{ color: 'var(--adm-text-secondary)' }}>Used {c.usedCount} times</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => toggleCoupon(c.id, !c.active)} className="p-1.5 rounded-lg" style={{ color: 'var(--adm-text-secondary)' }}>
                      {c.active ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                    <button onClick={() => delCoupon(c.id)} className="p-1.5 rounded-lg hover:bg-red-500/10" style={{ color: 'var(--adm-text-secondary)' }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Create form */}
          <div className="rounded-xl border p-5 space-y-4 h-fit" style={{ backgroundColor: 'var(--adm-card)', borderColor: 'var(--adm-border)' }}>
            <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--adm-text)' }}>
              <Ticket size={15} style={{ color: 'var(--adm-accent)' }} /> New Coupon
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Code *">
                <input className={inputCls} style={inputStyle} value={cForm.code} onChange={e => setCForm(s => ({ ...s, code: e.target.value.toUpperCase() }))} placeholder="WELCOME10" />
              </Field>
              <Field label="Kind">
                <select className={inputCls} style={inputStyle} value={cForm.kind} onChange={e => setCForm(s => ({ ...s, kind: e.target.value }))}>
                  <option value="manual">Manual</option>
                  <option value="welcome">Welcome (new users)</option>
                </select>
              </Field>
            </div>
            <Field label="Name">
              <input className={inputCls} style={inputStyle} value={cForm.name} onChange={e => setCForm(s => ({ ...s, name: e.target.value }))} placeholder="Welcome Discount" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Type">
                <select className={inputCls} style={inputStyle} value={cForm.discountType} onChange={e => setCForm(s => ({ ...s, discountType: e.target.value }))}>
                  <option value="percent">Percent %</option>
                  <option value="fixed">Fixed $</option>
                </select>
              </Field>
              <Field label="Value *">
                <input className={inputCls} style={inputStyle} type="number" min="0" value={cForm.value} onChange={e => setCForm(s => ({ ...s, value: e.target.value }))} placeholder="10" />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Min spend $">
                <input className={inputCls} style={inputStyle} type="number" min="0" value={cForm.minSpend} onChange={e => setCForm(s => ({ ...s, minSpend: e.target.value }))} placeholder="0" />
              </Field>
              <Field label="Max discount $">
                <input className={inputCls} style={inputStyle} type="number" min="0" value={cForm.maxDiscount} onChange={e => setCForm(s => ({ ...s, maxDiscount: e.target.value }))} placeholder="Optional" />
              </Field>
            </div>
            <Field label="Valid days">
              <input className={inputCls} style={inputStyle} type="number" min="1" value={cForm.validDays} onChange={e => setCForm(s => ({ ...s, validDays: e.target.value }))} />
            </Field>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={cForm.active} onChange={e => setCForm(s => ({ ...s, active: e.target.checked }))} className="w-4 h-4" />
              <span className="text-sm" style={{ color: 'var(--adm-text)' }}>Active</span>
            </label>
            <button onClick={saveCoupon} className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium"
              style={{ backgroundColor: 'var(--adm-accent)', color: 'var(--adm-accent-text)' }}>
              <Plus size={14} /> Create Coupon
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
