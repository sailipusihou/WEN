'use client'
import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Star, Trash2, Eye, EyeOff, CheckCheck, Package, Sparkles } from 'lucide-react'

const MONTHS: Record<string, string> = {
  January: '01', February: '02', March: '03', April: '04', May: '05', June: '06',
  July: '07', August: '08', September: '09', October: '10', November: '11', December: '12',
}

function normalizeDate(s: string): string {
  const m = s.match(/([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})/)
  if (m) return `${m[3]}-${MONTHS[m[1]] || '01'}-${String(Number(m[2])).padStart(2, '0')}`
  const d = new Date(s)
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10)
  return s
}

const selectStyle = {
  backgroundColor: 'var(--adm-input)',
  border: '1px solid var(--adm-input-border)',
  color: 'var(--adm-text)',
} as React.CSSProperties

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filterProduct, setFilterProduct] = useState('')
  const [filterDate, setFilterDate] = useState('')
  const [filterApproved, setFilterApproved] = useState('all')
  const [filterHidden, setFilterHidden] = useState('all')
  const [filterSource, setFilterSource] = useState('all')

  const fetchReviews = async () => {
    try {
      const r = await fetch('/api/reviews')
      if (r.ok) setReviews(await r.json())
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { fetchReviews() }, [])

  const updateReview = async (id: string, updates: any) => {
    const r = await fetch('/api/reviews', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...updates }),
    })
    if (r.ok) setReviews(await r.json())
  }

  const productOptions = useMemo(() => {
    const map = new Map<string, string>()
    reviews.forEach(r => { if (r.product) map.set(r.product.id, r.product.nameEn || r.product.name) })
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]))
  }, [reviews])

  const filtered = useMemo(() => reviews.filter(r => {
    if (filterProduct && r.product?.id !== filterProduct) return false
    if (filterDate && normalizeDate(r.date || '') !== filterDate) return false
    if (filterApproved === 'approved' && !r.approved) return false
    if (filterApproved === 'pending' && r.approved) return false
    if (filterHidden === 'hidden' && !r.hidden) return false
    if (filterHidden === 'visible' && r.hidden) return false
    if (filterSource === 'admin' && r.source !== 'admin') return false
    if (filterSource === 'customer' && r.source !== 'customer') return false
    return true
  }), [reviews, filterProduct, filterDate, filterApproved, filterHidden, filterSource])

  const hasFilter = filterProduct || filterDate || filterApproved !== 'all' || filterHidden !== 'all' || filterSource !== 'all'

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold" style={{ color: 'var(--adm-text)' }}>Reviews</h1>
        <p className="text-sm" style={{ color: 'var(--adm-text-secondary)' }}>
          {reviews.length} total{hasFilter ? ` · ${filtered.length} shown` : ''} · {reviews.filter(r => r.approved).length} approved · {reviews.filter(r => !r.approved).length} pending
        </p>
        <p className="text-[11px] mt-1" style={{ color: 'var(--adm-text-secondary)' }}>
          Includes frontend customer reviews and admin base reviews (from product forms) — both feed the product pages.
        </p>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
        <select value={filterProduct} onChange={e => setFilterProduct(e.target.value)} style={selectStyle} className="px-3 py-2 rounded-lg text-xs">
          <option value="">All Products</option>
          {productOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
        </select>
        <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} style={selectStyle} className="px-3 py-2 rounded-lg text-xs" title="Filter by review date" />
        <select value={filterApproved} onChange={e => setFilterApproved(e.target.value)} style={selectStyle} className="px-3 py-2 rounded-lg text-xs">
          <option value="all">Approval: All</option>
          <option value="approved">Approved</option>
          <option value="pending">Pending</option>
        </select>
        <select value={filterHidden} onChange={e => setFilterHidden(e.target.value)} style={selectStyle} className="px-3 py-2 rounded-lg text-xs">
          <option value="all">Hidden: All</option>
          <option value="visible">Visible</option>
          <option value="hidden">Hidden</option>
        </select>
        <select value={filterSource} onChange={e => setFilterSource(e.target.value)} style={selectStyle} className="px-3 py-2 rounded-lg text-xs">
          <option value="all">Type: All</option>
          <option value="customer">Customer Reviews</option>
          <option value="admin">Base Reviews (Admin)</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16"><p className="text-sm" style={{ color: 'var(--adm-text-secondary)' }}>No reviews match the filters</p></div>
      ) : (
        <div className="space-y-3">
          {filtered.map((rev) => (
            <motion.div key={rev.id} layout className="rounded-xl border p-5" style={{ backgroundColor: 'var(--adm-card)', borderColor: 'var(--adm-border)' }}>
              <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-lg overflow-hidden shrink-0 flex items-center justify-center" style={{ backgroundColor: 'var(--adm-input)' }}>
                    {rev.product?.image ? (
                      <img src={rev.product.image} alt={rev.product.nameEn || rev.product.name || ''} className="w-full h-full object-cover" />
                    ) : (
                      <Package size={18} style={{ color: 'var(--adm-text-secondary)' }} />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--adm-text)' }}>
                      {rev.product?.nameEn || rev.product?.name || rev.productId}
                    </p>
                    <p className="text-xs truncate" style={{ color: 'var(--adm-text-secondary)' }}>Product: {rev.productId}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: rev.source === 'admin' ? 'rgba(139,92,246,0.12)' : 'rgba(59,130,246,0.12)', color: rev.source === 'admin' ? '#8B5CF6' : '#3B82F6' }}>
                    {rev.source === 'admin' ? <><Sparkles size={9} className="inline mr-0.5" />Base</> : 'Customer'}
                  </span>
                  {rev.order && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: 'var(--adm-accent-bg)', color: 'var(--adm-accent)' }}>
                      Order {rev.order.orderNo}
                    </span>
                  )}
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                    style={{
                      backgroundColor: rev.approved ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)',
                      color: rev.approved ? '#10B981' : '#F59E0B',
                    }}>
                    {rev.hidden ? 'Hidden' : rev.approved ? 'Approved' : 'Pending'}
                  </span>
                </div>
              </div>

              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-base shrink-0 overflow-hidden" style={{ backgroundColor: 'var(--adm-input)' }}>
                    {rev.avatar && (rev.avatar.startsWith('http') || rev.avatar.startsWith('/api/uploads') || rev.avatar.startsWith('/images/')) ? (
                      <img src={rev.avatar} alt={rev.author || 'avatar'} className="w-full h-full object-cover" />
                    ) : (rev.avatar || '👤')}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--adm-text)' }}>{rev.author}</p>
                    <p className="text-xs truncate" style={{ color: 'var(--adm-text-secondary)' }}>
                      {rev.order?.customerEmail || rev.customerEmail || rev.location} · {rev.date}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                  {Array(rev.rating).fill(0).map((_, j) => (<Star key={j} size={13} className="fill-amber-400 text-amber-400" />))}
                </div>
              </div>

              <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--adm-text)' }}>{rev.content}</p>

              <div className="flex items-center gap-2 flex-wrap">
                {!rev.approved && (
                  <button onClick={() => updateReview(rev.id, { approved: true })}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                    style={{ backgroundColor: 'rgba(16,185,129,0.12)', color: '#10B981' }}>
                    <CheckCheck size={13} /> Approve
                  </button>
                )}
                {rev.approved && (
                  <button onClick={() => updateReview(rev.id, { approved: false })}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                    style={{ backgroundColor: 'var(--adm-input)', color: 'var(--adm-text-secondary)' }}>
                    <CheckCheck size={13} /> Unapprove
                  </button>
                )}
                <button onClick={() => updateReview(rev.id, { hidden: !rev.hidden })}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                  style={{ backgroundColor: 'var(--adm-input)', color: 'var(--adm-text-secondary)' }}>
                  {rev.hidden ? <Eye size={13} /> : <EyeOff size={13} />} {rev.hidden ? 'Show' : 'Hide'}
                </button>
                <button onClick={async () => { if (confirm('Delete this review?')) updateReview(rev.id, { deleted: true }) }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-red-500/10"
                  style={{ color: 'var(--adm-text-secondary)' }}>
                  <Trash2 size={13} /> Delete
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
