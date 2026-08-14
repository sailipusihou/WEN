'use client'
import { useState, useEffect } from 'react'
import { Plus, Edit3, Trash2, Save, X, ChevronDown, ChevronRight } from 'lucide-react'
import { CategoryIcon, IconSelector } from '@/components/admin/CategoryIcon'

export default function AdminCategoriesPage() {
  const [cats, setCats] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ name: '', nameEn: '', icon: '', image: '' })
  const [showAdd, setShowAdd] = useState(false)
  const [newForm, setNewForm] = useState({ slug: '', name: '', nameEn: '', icon: '', image: '' })
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [expandedCat, setExpandedCat] = useState<string | null>(null)
  const [categoryProducts, setCategoryProducts] = useState<Record<string, any[]>>({})

  const fetchCats = async () => {
    setLoading(true)
    try { 
      const r = await fetch('/api/categories')
      if (r.ok) {
        const data = await r.json()
        setCats(data)
      }
    } catch (e) {
      console.error('Failed to fetch categories:', e)
    } finally { 
      setLoading(false) 
    }
  }

  useEffect(() => { 
    fetchCats() 
  }, [])

  const fetchProductsForCategory = async (slug: string) => {
    if (categoryProducts[slug]) return
    try {
      const res = await fetch(`/api/products?category=${slug}`)
      if (res.ok) {
        const data = await res.json()
        setCategoryProducts(prev => ({ ...prev, [slug]: data }))
      }
    } catch (e) {
      console.error('Failed to fetch products:', e)
    }
  }

  const toggleExpand = (slug: string) => {
    if (expandedCat === slug) {
      setExpandedCat(null)
    } else {
      setExpandedCat(slug)
      fetchProductsForCategory(slug)
    }
  }

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 3000)
  }

  const saveEdit = async (slug: string) => {
    const res = await fetch('/api/categories', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug, ...editForm }),
      credentials: 'include'
    })
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      showMessage('error', d.error || `保存失败 (${res.status})`)
      return
    }
    setEditing(null)
    fetchCats()
    showMessage('success', '分类更新成功')
  }

  const addNew = async () => {
    if (!newForm.slug?.trim()) { 
      showMessage('error', '请输入 Slug（分类英文标识，如 home-decor）')
      return 
    }
    const res = await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newForm),
      credentials: 'include'
    })
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      showMessage('error', d.error || `添加失败 (${res.status})`)
      return
    }
    setShowAdd(false)
    setNewForm({ slug: '', name: '', nameEn: '', icon: '', image: '' })
    fetchCats()
    showMessage('success', '分类添加成功')
  }

  const deleteCat = async (slug: string) => {
    const catName = cats.find(c => c.slug === slug)?.nameEn || slug
    if (!confirm(`确定删除 "${catName}" 吗？此操作无法撤销。`)) return
    const res = await fetch('/api/categories/' + slug, { method: 'DELETE', credentials: 'include' })
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      showMessage('error', d.error || `删除失败 (${res.status})`)
      return
    }
    fetchCats()
    showMessage('success', '分类删除成功')
  }

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div>
      {message && (
        <div className={`mb-4 px-4 py-3 rounded-lg text-sm font-medium flex items-center gap-2 ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {message.type === 'success' ? '✓' : '✗'} {message.text}
        </div>
      )}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--adm-text)' }}>Categories</h1>
          <p className="text-sm" style={{ color: 'var(--adm-text-secondary)' }}>{cats.length} total</p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: 'var(--adm-accent)' }}>
          <Plus size={15} /> Add Category
        </button>
      </div>

      {showAdd && (
        <div className="rounded-xl border p-5 mb-6" style={{ backgroundColor: 'var(--adm-card)', borderColor: 'var(--adm-border)' }}>
          <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--adm-text)' }}>New Category</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--adm-text-secondary)' }}>Slug *</label>
              <input
                value={newForm.slug}
                onChange={e => setNewForm(p => ({ ...p, slug: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && e.preventDefault()}
                placeholder="e.g. home-decor"
                className="w-full px-3 py-2 rounded-lg text-sm border"
                style={{ backgroundColor: 'var(--adm-input)', borderColor: 'var(--adm-input-border)', color: 'var(--adm-text)' }}
              />
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--adm-text-secondary)' }}>Chinese name</label>
              <input
                value={newForm.name}
                onChange={e => setNewForm(p => ({ ...p, name: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && e.preventDefault()}
                placeholder="中文名"
                className="w-full px-3 py-2 rounded-lg text-sm border"
                style={{ backgroundColor: 'var(--adm-input)', borderColor: 'var(--adm-input-border)', color: 'var(--adm-text)' }}
              />
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--adm-text-secondary)' }}>English name</label>
              <input
                value={newForm.nameEn}
                onChange={e => setNewForm(p => ({ ...p, nameEn: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && e.preventDefault()}
                placeholder="英文名"
                className="w-full px-3 py-2 rounded-lg text-sm border"
                style={{ backgroundColor: 'var(--adm-input)', borderColor: 'var(--adm-input-border)', color: 'var(--adm-text)' }}
              />
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--adm-text-secondary)' }}>Image URL</label>
              <input
                value={newForm.image}
                onChange={e => setNewForm(p => ({ ...p, image: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && e.preventDefault()}
                placeholder="封面图链接"
                className="w-full px-3 py-2 rounded-lg text-sm border"
                style={{ backgroundColor: 'var(--adm-input)', borderColor: 'var(--adm-input-border)', color: 'var(--adm-text)' }}
              />
            </div>
          </div>
          <IconSelector value={newForm.icon} onChange={v => setNewForm(p => ({ ...p, icon: v }))} />
          <div className="flex gap-2 mt-3">
            <button type="button" onClick={addNew} className="px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: 'var(--adm-accent)' }}>Save</button>
            <button type="button" onClick={() => { setShowAdd(false); setNewForm({ slug: '', name: '', nameEn: '', icon: '', image: '' }) }} className="px-4 py-2 rounded-lg text-sm" style={{ color: 'var(--adm-text-secondary)' }}>Cancel</button>
          </div>
        </div>
      )}

      {cats.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-sm" style={{ color: 'var(--adm-text-secondary)' }}>No categories yet. Add one above.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {cats.map((cat) => (
            <div key={cat.slug} className="rounded-xl border p-4 cursor-pointer adm-card-card" onClick={() => !editing && toggleExpand(cat.slug)} style={{ backgroundColor: 'var(--adm-card)', borderColor: 'var(--adm-border)' }}>
              {editing === cat.slug ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs mb-1 block" style={{ color: 'var(--adm-text-secondary)' }}>Chinese name</label>
                      <input
                        value={editForm.name}
                        onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))}
                        onKeyDown={e => e.key === 'Enter' && e.preventDefault()}
                        className="w-full px-3 py-2 rounded-lg text-sm border"
                        style={{ backgroundColor: 'var(--adm-input)', borderColor: 'var(--adm-input-border)', color: 'var(--adm-text)' }}
                      />
                    </div>
                    <div>
                      <label className="text-xs mb-1 block" style={{ color: 'var(--adm-text-secondary)' }}>English name</label>
                      <input
                        value={editForm.nameEn}
                        onChange={e => setEditForm(p => ({ ...p, nameEn: e.target.value }))}
                        onKeyDown={e => e.key === 'Enter' && e.preventDefault()}
                        className="w-full px-3 py-2 rounded-lg text-sm border"
                        style={{ backgroundColor: 'var(--adm-input)', borderColor: 'var(--adm-input-border)', color: 'var(--adm-text)' }}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-xs mb-1 block" style={{ color: 'var(--adm-text-secondary)' }}>Image URL</label>
                      <input
                        value={editForm.image}
                        onChange={e => setEditForm(p => ({ ...p, image: e.target.value }))}
                        onKeyDown={e => e.key === 'Enter' && e.preventDefault()}
                        className="w-full px-3 py-2 rounded-lg text-sm border"
                        style={{ backgroundColor: 'var(--adm-input)', borderColor: 'var(--adm-input-border)', color: 'var(--adm-text)' }}
                      />
                    </div>
                  </div>
                  <IconSelector value={editForm.icon} onChange={v => setEditForm(p => ({ ...p, icon: v }))} />
                  <div className="flex gap-2">
                    <button type="button" onClick={() => saveEdit(cat.slug)} className="px-3 py-1.5 rounded-lg text-xs font-medium text-white" style={{ backgroundColor: 'var(--adm-accent)' }}><Save size={12} /> Save</button>
                    <button type="button" onClick={() => setEditing(null)} className="px-3 py-1.5 rounded-lg text-xs" style={{ color: 'var(--adm-text-secondary)' }}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <button onClick={() => toggleExpand(cat.slug)} className="p-1 rounded-lg transition-colors adm-hover-bg" style={{ color: 'var(--adm-text-secondary)' }}>
                        {expandedCat === cat.slug ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </button>
                      <CategoryIcon icon={cat.icon} size={40} />
                      <div>
                        <p className="text-sm font-medium" style={{ color: 'var(--adm-text)' }}>{cat.nameEn} ({cat.name})</p>
                        <p className="text-xs" style={{ color: 'var(--adm-text-secondary)' }}>slug: {cat.slug} - {cat.productCount} products</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={(e) => { e.stopPropagation(); setEditing(cat.slug); setEditForm({ name: cat.name, nameEn: cat.nameEn, icon: cat.icon, image: cat.image }) }}
                        className="p-2 rounded-lg transition-colors adm-hover-bg" style={{ color: 'var(--adm-text-secondary)' }}><Edit3 size={14} /></button>
                      <button onClick={(e) => { e.stopPropagation(); deleteCat(cat.slug) }} className="p-2 rounded-lg transition-colors hover:bg-red-500/10" style={{ color: 'var(--adm-text-secondary)' }}><Trash2 size={14} /></button>
                    </div>
                  </div>

                  {expandedCat === cat.slug && (
                    <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--adm-border)' }}>
                      <p className="text-xs font-medium mb-3" style={{ color: 'var(--adm-text-secondary)' }}>包含商品 ({(categoryProducts[cat.slug] || []).length}件)</p>
                      {(categoryProducts[cat.slug] || []).length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {(categoryProducts[cat.slug] || []).map((product: any) => (
                            <div key={product.id} className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: 'var(--adm-bg)' }}>
                              <img src={product.image} alt={product.name} className="w-12 h-12 object-cover rounded-lg" />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  {product.code && (
                                    <span className="text-[9px] font-mono px-1 py-0.5 rounded-sm shrink-0" style={{ backgroundColor: "var(--adm-accent-bg)", color: "var(--adm-accent)" }} title="Product Code">{product.code}</span>
                                  )}
                                  <p className="text-sm font-medium truncate" style={{ color: 'var(--adm-text)' }}>{product.name}</p>
                                </div>
                                <p className="text-xs" style={{ color: 'var(--adm-text-secondary)' }}>${product.price.toFixed(2)} USD</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-center py-4" style={{ color: 'var(--adm-text-secondary)' }}>暂无商品</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
