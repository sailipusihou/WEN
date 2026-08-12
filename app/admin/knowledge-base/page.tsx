"use client"
import { useState, useEffect } from "react"
import {
  BookOpen, Plus, Search, Edit3, Trash2, X, Save, Tag,
  AlertCircle, Loader2, FileText,
} from "lucide-react"

interface KBEntry {
  id: string
  title: string
  category: string
  content: string
  tags: string[]
  createdAt: string
  updatedAt: string
}

const CATEGORY_PRESETS = ['FAQ', '政策', 'SOP', '产品知识', '营销话术', '未分类']

export default function KnowledgeBasePage() {
  const [entries, setEntries] = useState<KBEntry[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState("")
  const [filterCategory, setFilterCategory] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<KBEntry | null>(null)
  const [error, setError] = useState("")
  const [form, setForm] = useState({
    title: "",
    category: "FAQ",
    content: "",
    tagsInput: "",
  })

  useEffect(() => {
    loadEntries()
  }, [])

  const loadEntries = async () => {
    setLoading(true)
    try {
      const r = await fetch("/api/knowledge-base")
      if (r.ok) {
        const d = await r.json()
        setEntries(d.entries || [])
        setCategories(d.categories || [])
      }
    } catch (e) {
      setError("Failed to load knowledge base")
    } finally {
      setLoading(false)
    }
  }

  const openNew = () => {
    setEditing(null)
    setForm({ title: "", category: "FAQ", content: "", tagsInput: "" })
    setShowForm(true)
  }

  const openEdit = (entry: KBEntry) => {
    setEditing(entry)
    setForm({
      title: entry.title,
      category: entry.category,
      content: entry.content,
      tagsInput: (entry.tags || []).join(", "),
    })
    setShowForm(true)
  }

  const save = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      setError("Title and content are required")
      return
    }
    setSaving(true)
    setError("")
    try {
      const tags = form.tagsInput.split(",").map(t => t.trim()).filter(Boolean)
      const body: any = {
        title: form.title.trim(),
        category: form.category.trim() || "未分类",
        content: form.content.trim(),
        tags,
      }
      const url = editing ? "/api/knowledge-base" : "/api/knowledge-base"
      const method = editing ? "PUT" : "POST"
      if (editing) body.id = editing.id

      const r = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!r.ok) {
        const d = await r.json().catch(() => ({}))
        throw new Error(d.error || "Save failed")
      }
      setShowForm(false)
      await loadEntries()
    } catch (e: any) {
      setError(e.message || "Save failed")
    } finally {
      setSaving(false)
    }
  }

  const remove = async (id: string) => {
    if (!confirm("Delete this knowledge base entry?")) return
    try {
      const r = await fetch(`/api/knowledge-base?id=${encodeURIComponent(id)}`, { method: "DELETE" })
      if (!r.ok) {
        const d = await r.json().catch(() => ({}))
        throw new Error(d.error || "Delete failed")
      }
      await loadEntries()
    } catch (e: any) {
      setError(e.message || "Delete failed")
      setTimeout(() => setError(""), 3000)
    }
  }

  const filtered = entries.filter(e => {
    if (filterCategory && e.category !== filterCategory) return false
    if (search) {
      const q = search.toLowerCase()
      return e.title.toLowerCase().includes(q)
        || e.content.toLowerCase().includes(q)
        || (e.tags || []).some(t => t.toLowerCase().includes(q))
    }
    return true
  })

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: 'var(--adm-bg)' }}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--adm-card)', border: '1px solid var(--adm-border)' }}>
              <BookOpen size={20} style={{ color: 'var(--adm-text)' }} />
            </div>
            <div>
              <h1 className="text-xl font-bold" style={{ color: 'var(--adm-text)' }}>Knowledge Base</h1>
              <p className="text-xs" style={{ color: 'var(--adm-text-secondary)' }}>
                {entries.length} entries · AI 自动学习此处内容回答政策/FAQ/SOP 类问题
              </p>
            </div>
          </div>
          <button
            onClick={openNew}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-90"
            style={{ backgroundColor: 'var(--adm-accent)', color: 'var(--adm-accent-text)' }}
          >
            <Plus size={16} />
            New Entry
          </button>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm" style={{ backgroundColor: 'var(--adm-card)', border: '1px solid #ef4444', color: '#ef4444' }}>
            <AlertCircle size={14} />
            {error}
          </div>
        )}

        {/* Filters */}
        <div className="flex items-center gap-3 mb-5 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg flex-1 min-w-[240px]" style={{ backgroundColor: 'var(--adm-card)', border: '1px solid var(--adm-border)' }}>
            <Search size={14} style={{ color: 'var(--adm-text-secondary)' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search title / content / tags..."
              className="flex-1 bg-transparent outline-none text-sm"
              style={{ color: 'var(--adm-text)' }}
            />
            {search && (
              <button onClick={() => setSearch("")} style={{ color: 'var(--adm-text-secondary)' }}>
                <X size={14} />
              </button>
            )}
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setFilterCategory("")}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity"
              style={{
                backgroundColor: !filterCategory ? 'var(--adm-accent)' : 'var(--adm-card)',
                color: !filterCategory ? 'var(--adm-accent-text)' : 'var(--adm-text-secondary)',
                border: `1px solid ${!filterCategory ? 'var(--adm-accent)' : 'var(--adm-border)'}`,
              }}
            >
              All
            </button>
            {categories.map(c => (
              <button
                key={c}
                onClick={() => setFilterCategory(c)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity"
                style={{
                  backgroundColor: filterCategory === c ? 'var(--adm-accent)' : 'var(--adm-card)',
                  color: filterCategory === c ? 'var(--adm-accent-text)' : 'var(--adm-text-secondary)',
                  border: `1px solid ${filterCategory === c ? 'var(--adm-accent)' : 'var(--adm-border)'}`,
                }}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="animate-spin" size={24} style={{ color: 'var(--adm-text-secondary)' }} />
            <p className="text-xs mt-2" style={{ color: 'var(--adm-text-secondary)' }}>Loading...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 rounded-xl" style={{ backgroundColor: 'var(--adm-card)', border: '1px dashed var(--adm-border)' }}>
            <FileText size={32} style={{ color: 'var(--adm-text-secondary)', margin: '0 auto' }} />
            <p className="text-sm mt-3" style={{ color: 'var(--adm-text)' }}>
              {entries.length === 0 ? "知识库为空" : "No matching entries"}
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--adm-text-secondary)' }}>
              {entries.length === 0 ? "添加退换货政策、FAQ、运营 SOP 等，AI 将自动学习并在对话中引用" : "Try a different search or filter"}
            </p>
            {entries.length === 0 && (
              <button
                onClick={openNew}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium"
                style={{ backgroundColor: 'var(--adm-accent)', color: 'var(--adm-accent-text)' }}
              >
                <Plus size={14} />
                Add First Entry
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-3">
            {filtered.map(entry => (
              <div
                key={entry.id}
                className="rounded-xl p-4 transition-shadow hover:shadow-md"
                style={{ backgroundColor: 'var(--adm-card)', border: '1px solid var(--adm-border)' }}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span
                        className="px-2 py-0.5 rounded text-[10px] font-medium"
                        style={{ backgroundColor: 'var(--adm-input)', color: 'var(--adm-text-secondary)' }}
                      >
                        {entry.category}
                      </span>
                      <h3 className="text-sm font-semibold truncate" style={{ color: 'var(--adm-text)' }}>
                        {entry.title}
                      </h3>
                    </div>
                    <p className="text-xs line-clamp-2 whitespace-pre-wrap" style={{ color: 'var(--adm-text-secondary)' }}>
                      {entry.content}
                    </p>
                    {entry.tags && entry.tags.length > 0 && (
                      <div className="flex items-center gap-1 mt-2 flex-wrap">
                        {entry.tags.map((t, i) => (
                          <span key={i} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px]" style={{ backgroundColor: 'var(--adm-input)', color: 'var(--adm-text-secondary)' }}>
                            <Tag size={8} />
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => openEdit(entry)}
                      className="p-1.5 rounded-lg transition-colors hover:bg-black/5"
                      style={{ color: 'var(--adm-text-secondary)' }}
                      title="Edit"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      onClick={() => remove(entry.id)}
                      className="p-1.5 rounded-lg transition-colors hover:bg-red-500/10"
                      style={{ color: 'var(--adm-text-secondary)' }}
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <p className="text-[10px]" style={{ color: 'var(--adm-text-secondary)' }}>
                  Updated {new Date(entry.updatedAt).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={() => !saving && setShowForm(false)}
        >
          <div
            className="w-full max-w-2xl rounded-xl max-h-[90vh] overflow-y-auto"
            style={{ backgroundColor: 'var(--adm-card)', border: '1px solid var(--adm-border)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b sticky top-0 z-10" style={{ borderColor: 'var(--adm-border)', backgroundColor: 'var(--adm-card)' }}>
              <h2 className="text-base font-semibold" style={{ color: 'var(--adm-text)' }}>
                {editing ? "Edit Entry" : "New Knowledge Base Entry"}
              </h2>
              <button onClick={() => !saving && setShowForm(false)} style={{ color: 'var(--adm-text-secondary)' }}>
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--adm-text-secondary)' }}>Title *</label>
                <input
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  placeholder="例：退换货政策 / 如何清洗青瓷茶具"
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                  style={{ backgroundColor: 'var(--adm-input)', border: '1px solid var(--adm-input-border)', color: 'var(--adm-text)' }}
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--adm-text-secondary)' }}>Category</label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {CATEGORY_PRESETS.map(c => (
                    <button
                      key={c}
                      onClick={() => setForm({ ...form, category: c })}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity"
                      style={{
                        backgroundColor: form.category === c ? 'var(--adm-accent)' : 'var(--adm-input)',
                        color: form.category === c ? 'var(--adm-accent-text)' : 'var(--adm-text-secondary)',
                        border: `1px solid ${form.category === c ? 'var(--adm-accent)' : 'var(--adm-input-border)'}`,
                      }}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--adm-text-secondary)' }}>Content *</label>
                <textarea
                  value={form.content}
                  onChange={e => setForm({ ...form, content: e.target.value })}
                  placeholder="详细内容。AI 会基于此内容回答用户问题，请尽量完整、清晰..."
                  rows={10}
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-y"
                  style={{ backgroundColor: 'var(--adm-input)', border: '1px solid var(--adm-input-border)', color: 'var(--adm-text)' }}
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--adm-text-secondary)' }}>Tags (comma separated)</label>
                <input
                  value={form.tagsInput}
                  onChange={e => setForm({ ...form, tagsInput: e.target.value })}
                  placeholder="退货, 换货, 7天无理由"
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                  style={{ backgroundColor: 'var(--adm-input)', border: '1px solid var(--adm-input-border)', color: 'var(--adm-text)' }}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 p-5 border-t sticky bottom-0" style={{ borderColor: 'var(--adm-border)', backgroundColor: 'var(--adm-card)' }}>
              <button
                onClick={() => setShowForm(false)}
                disabled={saving}
                className="px-4 py-2 rounded-lg text-sm font-medium"
                style={{ backgroundColor: 'var(--adm-input)', color: 'var(--adm-text-secondary)', border: '1px solid var(--adm-input-border)' }}
              >
                Cancel
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                style={{ backgroundColor: 'var(--adm-accent)', color: 'var(--adm-accent-text)' }}
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                {editing ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

