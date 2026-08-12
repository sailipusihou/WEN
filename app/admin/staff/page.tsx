'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Shield, Plus, X, User, Mail, Lock, ChevronDown, ChevronUp, CheckCircle, XCircle, Search, Info, ImageIcon, MessageCircle, Send } from 'lucide-react'
import { ROLE_INFO, ALL_PERMISSIONS } from '@/lib/permissions'
import { findAvatarMeta } from '@/lib/avatars'
import AvatarPicker from '@/components/admin/AvatarPicker'

export default function AdminStaffPage() {
  const [staff, setStaff] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'order_processor', avatar: '' })
  const [search, setSearch] = useState('')
  const [editingPerms, setEditingPerms] = useState(null)
  const [editingStaff, setEditingStaff] = useState(null)
  const [systemAvatars, setSystemAvatars] = useState<any[]>([])
  const [editForm, setEditForm] = useState({ name: "", email: "", password: "", role: "", avatar: "" })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [expandedRole, setExpandedRole] = useState<string | null>(null)
  const [avatarInfoModal, setAvatarInfoModal] = useState<any>(null)
  const [chatModal, setChatModal] = useState<any>(null)
  const [chatMessage, setChatMessage] = useState("")
  const [chatSending, setChatSending] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  // 头像选择弹窗状态: target 决定写入 form 还是 editForm
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerTarget, setPickerTarget] = useState<'add' | 'edit'>('add')

  const fetchStaff = async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/staff')
      if (r.ok) setStaff(await r.json())
      else setError('Failed to load staff')
    } finally { setLoading(false) }
  }

  useEffect(() => { fetchStaff(); fetch("/api/avatars").then(r => r.ok ? r.json() : []).then(setSystemAvatars).catch(() => {}) }, [])
  useEffect(() => { fetch('/api/auth/check?_t=' + Date.now()).then(r => r.ok ? r.json() : null).then(d => { if (d?.user) setCurrentUser(d.user) }).catch(() => {}) }, [])

  const addStaff = async () => {
    if (!form.name || !form.email || !form.password) { setError('Name, email and password are required'); return }
    setError(''); setSaving(true)
    try {
      const r = await fetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add', ...form }),
      })
      if (r.ok) {
        setForm({ name: '', email: '', password: '', role: 'order_processor', avatar: '' })
        setShowForm(false)
        fetchStaff(); fetch("/api/avatars").then(r => r.ok ? r.json() : []).then(setSystemAvatars).catch(() => {})
      } else {
        const d = await r.json()
        setError(d.error || 'Failed to add staff')
      }
    } catch { setError('Network error') }
    finally { setSaving(false) }
  }

  const toggleStaff = async (id: string) => {
    try {
      const r = await fetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle', id }),
      })
      if (!r.ok) {
        const d = await r.json().catch(() => ({}))
        alert(d.error || 'Failed to toggle staff')
        return
      }
      fetchStaff(); fetch("/api/avatars").then(r => r.ok ? r.json() : []).then(setSystemAvatars).catch(() => {})
    } catch {
      alert('Network error')
    }
  }

  const removeStaff = async (id: string) => {
    try {
      const r = await fetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'remove', id }),
      })
      if (!r.ok) {
        const d = await r.json().catch(() => ({}))
        alert(d.error || 'Failed to remove staff')
        return
      }
      fetchStaff(); fetch("/api/avatars").then(r => r.ok ? r.json() : []).then(setSystemAvatars).catch(() => {})
    } catch {
      alert('Network error')
    }
  }


  const saveEdit = async () => {
    if (!editingStaff) return
    try {
      const r = await fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update", id: editingStaff, ...editForm }),
      })
      if (r.ok) {
        setEditingStaff(null)
        setEditForm({ name: "", email: "", password: "", role: "", avatar: "" })
        fetchStaff(); fetch("/api/avatars").then(r => r.ok ? r.json() : []).then(setSystemAvatars).catch(() => {})
      } else {
        const d = await r.json().catch(() => ({}))
        setError(d.error || "Failed to save")
      }
    } catch {
      setError('Network error')
    }
  }

  const savePermissions = async (id: string, permissions: string[]) => {
    const member = staff.find(s => s.id === id)
    if (!member) return
    try {
      const r = await fetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update', id, permissions, role: member.role }),
      })
      if (r.ok) {
        setEditingPerms(null)
        fetchStaff(); fetch("/api/avatars").then(r => r.ok ? r.json() : []).then(setSystemAvatars).catch(() => {})
      } else {
        const d = await r.json().catch(() => ({}))
        setError(d.error || 'Failed to save permissions')
      }
    } catch {
      setError('Network error')
    }
  }
  const updateRole = async (id: string, role: string) => {
    try {
      const r = await fetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_role', id, role }),
      })
      if (!r.ok) {
        const d = await r.json().catch(() => ({}))
        alert(d.error || 'Failed to update role')
        return
      }
      fetchStaff(); fetch("/api/avatars").then(r => r.ok ? r.json() : []).then(setSystemAvatars).catch(() => {})
    } catch {
      alert('Network error')
    }
  }

  const filtered = staff.filter(s =>
    !search || s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--adm-text)' }}>Staff Management</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--adm-text-secondary)' }}>
            {staff.length} staff accounts · Manage roles and permissions
          </p>
        </div>
        <button onClick={() => { setShowForm(!showForm); setError('') }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors text-white"
          style={{ backgroundColor: 'var(--adm-accent)' }}>
          <Plus size={16} /> {showForm ? 'Cancel' : 'Add Staff'}
        </button>
      </div>

      {/* Role Info Banner */}
      <div className="rounded-xl border p-4 mb-6" style={{ backgroundColor: 'var(--adm-card)', borderColor: 'var(--adm-border)' }}>
        <div className="flex items-center gap-2 mb-3">
          <Info size={16} style={{ color: 'var(--adm-accent)' }} />
          <span className="text-sm font-semibold" style={{ color: 'var(--adm-text)' }}>Role Permissions Guide</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {Object.entries(ROLE_INFO).map(([role, info]) => (
            <div key={role}
              onClick={() => setExpandedRole(expandedRole === role ? null : role)}
              className="rounded-lg p-3 cursor-pointer transition-colors border adm-hover-bg"
              style={{ backgroundColor: 'var(--adm-input)', borderColor: expandedRole === role ? 'var(--adm-accent)' : 'var(--adm-input-border)' }}>
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold ${info.color}`}>{info.label}</span>
                <span style={{ color: 'var(--adm-text-secondary)' }}>
                  {expandedRole === role ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </span>
              </div>
              <p className="text-[10px] mt-1" style={{ color: 'var(--adm-text-secondary)' }}>{info.description}</p>
              <p className="text-[9px] mt-1" style={{ color: 'var(--adm-text-secondary)' }}>
                {role === 'super_admin' ? 'Settings, Staff, All modules' :
                 role === 'admin' ? 'Products, Orders, Finance, Users, Work Log' :
                 role === 'manager' ? 'Orders, Analytics, Messages, Reviews' :
                 'Orders only'}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Add Staff Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mb-6">
            <div className="rounded-xl border p-5" style={{ backgroundColor: 'var(--adm-card)', borderColor: 'var(--adm-border)' }}>
              <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--adm-text)' }}>New Staff Account</h3>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-4">
                <div className="relative">
                  <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--adm-text-secondary)' }} />
                  <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                    placeholder="Full name" autoFocus
                    className="w-full pl-9 pr-3 py-2.5 text-sm rounded-lg"
                    style={{ backgroundColor: 'var(--adm-input)', border: '1px solid var(--adm-input-border)', color: 'var(--adm-text)' }} />
                </div>
                <div className="relative">
                  <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--adm-text-secondary)' }} />
                  <input value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                    placeholder="Email (login ID)"
                    className="w-full pl-9 pr-3 py-2.5 text-sm rounded-lg"
                    style={{ backgroundColor: 'var(--adm-input)', border: '1px solid var(--adm-input-border)', color: 'var(--adm-text)' }} />
                </div>
                <div className="relative">
                  <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--adm-text-secondary)' }} />
                  <input type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                    placeholder="Password"
                    className="w-full pl-9 pr-3 py-2.5 text-sm rounded-lg"
                    style={{ backgroundColor: 'var(--adm-input)', border: '1px solid var(--adm-input-border)', color: 'var(--adm-text)' }} />
                </div>
                <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
                  className="w-full px-3 py-2.5 text-sm rounded-lg"
                  style={{ backgroundColor: 'var(--adm-input)', border: '1px solid var(--adm-input-border)', color: 'var(--adm-text)' }}>
                  {Object.entries(ROLE_INFO).filter(([r]) => r !== 'super_admin').map(([r, info]) => (
                    <option key={r} value={r}>{info.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <p className="text-xs font-medium mb-2" style={{ color: "var(--adm-text)" }}>Avatar</p>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 flex items-center justify-center text-sm font-bold"
                    style={{ backgroundColor: form.avatar ? "transparent" : "var(--adm-accent)", color: "white" }}>
                    {form.avatar ? (
                      <img src={form.avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      (form.name?.[0] || "?").toUpperCase()
                    )}
                  </div>
                  <button type="button"
                    onClick={() => { setPickerTarget('add'); setPickerOpen(true) }}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs rounded-lg transition-colors"
                    style={{ backgroundColor: 'var(--adm-input)', color: 'var(--adm-text)', border: '1px solid var(--adm-input-border)' }}>
                    <ImageIcon size={14} /> Select Avatar
                  </button>
                  {form.avatar && (() => {
                    const meta = findAvatarMeta(form.avatar)
                    return meta ? (
                      <span className="text-xs" style={{ color: 'var(--adm-text-secondary)' }}>
                        {meta.name} · {meta.era} {meta.role}
                      </span>
                    ) : null
                  })()}
                </div>
              </div>
              {error && <p className="text-sm text-red-400 mb-3">{error}</p>}
              <div className="flex gap-2">
                <button onClick={addStaff} disabled={saving}
                  className="px-5 py-2 text-sm font-medium rounded-lg text-white transition-colors disabled:opacity-50"
                  style={{ backgroundColor: 'var(--adm-accent)' }}>
                  {saving ? 'Adding...' : 'Create Account'}
                </button>
                <button onClick={() => setShowForm(false)}
                  className="px-5 py-2 text-sm rounded-lg transition-colors"
                  style={{ backgroundColor: 'var(--adm-input)', color: 'var(--adm-text-secondary)' }}>
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search */}
      {staff.length > 0 && (
        <div className="relative mb-4 max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--adm-text-secondary)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search staff..."
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg"
            style={{ backgroundColor: 'var(--adm-input)', border: '1px solid var(--adm-input-border)', color: 'var(--adm-text)' }} />
        </div>
      )}

      {/* Staff List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <Shield size={40} className="mx-auto mb-3" style={{ color: 'var(--adm-text-secondary)' }} />
          <p className="text-sm" style={{ color: 'var(--adm-text-secondary)' }}>{search ? 'No matching staff found' : 'No staff accounts yet. Click "Add Staff" to create one.'}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(member => {
            const roleInfo = ROLE_INFO[member.role] || ROLE_INFO.order_processor
            return (
              <div key={member.id} className="rounded-xl border overflow-hidden transition-all"
                style={{ backgroundColor: 'var(--adm-card)', borderColor: 'var(--adm-border)' }}>
                <div className="p-4 flex items-center gap-4 adm-hover-bg transition-colors cursor-pointer">
                  {/* Avatar */}
                  <div
                    className={"w-10 h-10 rounded-full shrink-0 overflow-hidden flex items-center justify-center text-sm font-bold " + (findAvatarMeta(member.avatar || '') ? 'cursor-pointer hover:ring-2 hover:ring-offset-1 transition-all' : '')}
                    style={{ backgroundColor: member.avatar ? "transparent" : (member.active ? 'var(--adm-accent)' : 'var(--adm-input)'), color: member.active ? 'white' : 'var(--adm-text-secondary)' }}
                    onClick={() => {
                      const meta = findAvatarMeta(member.avatar || '')
                      if (meta) setAvatarInfoModal(meta)
                    }}
                  >
                    {member.avatar ? (
                      <img src={member.avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      member.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold" style={{ color: 'var(--adm-text)' }}>{member.name}</span>
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${roleInfo.color} ${roleInfo.color.replace('text-', 'bg-').replace('red-', 'red-').replace('purple-', 'purple-').replace('blue-', 'blue-').replace('green-', 'green-')}/10`}>
                        {roleInfo.label}
                      </span>
                      {!member.active && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-gray-500/10 text-gray-500">
                          Disabled
                        </span>
                      )}
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--adm-text-secondary)' }}>
                      {member.email}
                    </p>
                  </div>
                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Chat button */}
                    {member.id !== currentUser?.id && (
                      <button onClick={(e) => { e.stopPropagation(); setChatModal(member); setChatMessage("") }}
                        className="px-2 py-1.5 text-xs rounded-lg transition-colors adm-hover-bg flex items-center gap-1"
                        style={{ color: 'var(--adm-accent)', border: '1px solid var(--adm-accent)' }}
                        title="Send message">
                        <MessageCircle size={14} />
                        Chat
                      </button>
                    )}
                    {/* Role selector */}
                    <button onClick={(e) => { e.stopPropagation(); setEditingStaff(editingStaff === member.id ? null : member.id); if (editingStaff !== member.id) { setEditForm({ name: member.name || "", email: member.email || "", password: member.password || "", role: member.role || "", avatar: member.avatar || "" }) } }} className="px-2 py-1.5 text-xs rounded-lg transition-colors adm-hover-bg" style={{ backgroundColor: editingStaff === member.id ? "var(--adm-accent)" : "var(--adm-input)", color: editingStaff === member.id ? "white" : "var(--adm-text)", border: "1px solid var(--adm-input-border)" }}>{editingStaff === member.id ? "Done" : "Edit"}</button>
                      <button onClick={(e) => { e.stopPropagation(); setEditingPerms(editingPerms === member.id ? null : member.id) }} className="px-2 py-1.5 text-xs rounded-lg transition-colors adm-hover-bg" style={{ backgroundColor: editingPerms === member.id ? "var(--adm-accent)" : "var(--adm-input)", color: editingPerms === member.id ? "white" : "var(--adm-text)", border: "1px solid var(--adm-input-border)" }}>{editingPerms === member.id ? "Done" : "Permissions"}</button>
                      <select value={member.role} onChange={e => updateRole(member.id, e.target.value)}
                      onClick={e => e.stopPropagation()}
                      className="px-2 py-1.5 text-[11px] rounded-lg"
                      style={{ backgroundColor: 'var(--adm-input)', border: '1px solid var(--adm-input-border)', color: 'var(--adm-text)' }}>
                      {Object.entries(ROLE_INFO).map(([r, info]) => (
                        <option key={r} value={r}>{info.label}</option>
                      ))}
                    </select>
                    {/* Toggle active */}
                    <button onClick={() => toggleStaff(member.id)}
                      className="p-2 rounded-lg transition-colors adm-hover-bg"
                      style={{ color: member.active ? 'var(--adm-accent)' : 'var(--adm-text-secondary)' }}
                      title={member.active ? 'Disable account' : 'Enable account'}>
                      {member.active ? <CheckCircle size={16} /> : <XCircle size={16} />}
                    </button>
                    {/* Delete */}
                    <button onClick={() => { if (confirm(`Delete staff ${member.name}?`)) removeStaff(member.id) }}
                      className="p-2 rounded-lg transition-colors hover:bg-red-500/10"
                      style={{ color: 'var(--adm-text-secondary)' }}
                      title="Delete staff">
                      <X size={16} />
                    </button>
                  </div>
                </div>
                  
                  {/* Permission Editor Panel */}
                  {editingStaff === member.id && (
                    <div className="border-t px-4 py-4" style={{ borderColor: 'var(--adm-border)' }}>
                      <p className="text-xs font-semibold mb-3" style={{ color: 'var(--adm-text)' }}>Edit Staff Account</p>
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-3">
                        <input value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))}
                          placeholder="Name" className="px-3 py-2 text-sm rounded-lg" style={{ backgroundColor: 'var(--adm-input)', border: '1px solid var(--adm-input-border)', color: 'var(--adm-text)' }} />
                        <input value={editForm.email} onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))}
                          placeholder="Email" className="px-3 py-2 text-sm rounded-lg" style={{ backgroundColor: 'var(--adm-input)', border: '1px solid var(--adm-input-border)', color: 'var(--adm-text)' }} />
                        <input type="text" value={editForm.password} onChange={e => setEditForm(p => ({ ...p, password: e.target.value }))}
                          placeholder="Password" className="px-3 py-2 text-sm rounded-lg" style={{ backgroundColor: 'var(--adm-input)', border: '1px solid var(--adm-input-border)', color: 'var(--adm-text)' }} />
                        <select value={editForm.role} onChange={e => setEditForm(p => ({ ...p, role: e.target.value }))}
                          className="px-3 py-2 text-sm rounded-lg" style={{ backgroundColor: 'var(--adm-input)', border: '1px solid var(--adm-input-border)', color: 'var(--adm-text)' }}>
                          {Object.entries(ROLE_INFO).map(([r, info]) => <option key={r} value={r}>{info.label}</option>)}
                        </select>
                      </div>
                      <div className="mt-3">
                        <p className="text-xs font-medium mb-2" style={{ color: "var(--adm-text)" }}>Avatar</p>
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 flex items-center justify-center text-sm font-bold"
                            style={{ backgroundColor: editForm.avatar ? "transparent" : "var(--adm-accent)", color: "white" }}>
                            {editForm.avatar ? (
                              <img src={editForm.avatar} alt="" className="w-full h-full object-cover" />
                            ) : (
                              (editForm.name?.[0] || "?").toUpperCase()
                            )}
                          </div>
                          <button type="button"
                            onClick={() => { setPickerTarget('edit'); setPickerOpen(true) }}
                            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs rounded-lg transition-colors"
                            style={{ backgroundColor: 'var(--adm-input)', color: 'var(--adm-text)', border: '1px solid var(--adm-input-border)' }}>
                            <ImageIcon size={14} /> Select Avatar
                          </button>
                          {editForm.avatar && (() => {
                            const meta = findAvatarMeta(editForm.avatar)
                            return meta ? (
                              <span className="text-xs" style={{ color: 'var(--adm-text-secondary)' }}>
                                {meta.name} · {meta.era} {meta.role}
                              </span>
                            ) : null
                          })()}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={saveEdit} className="px-4 py-1.5 text-xs rounded-lg text-white transition-colors" style={{ backgroundColor: 'var(--adm-accent)' }}>Save Changes</button>
                        <button onClick={() => setEditingStaff(null)} className="px-4 py-1.5 text-xs rounded-lg" style={{ backgroundColor: 'var(--adm-input)', color: 'var(--adm-text-secondary)' }}>Cancel</button>
                      </div>
                    </div>
                  )}
                  {editingPerms === member.id && (
                    <div className="border-t px-4 py-4" style={{ borderColor: 'var(--adm-border)' }}>
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="text-xs font-semibold" style={{ color: 'var(--adm-text)' }}>Custom Permissions</p>
                          <p className="text-[10px] mt-0.5" style={{ color: 'var(--adm-text-secondary)' }}>Toggle individual permissions for this staff member</p>
                        </div>
                        <button onClick={() => savePermissions(member.id, member.permissions || [])}
                          className="px-3 py-1.5 text-xs rounded-lg text-white transition-colors"
                          style={{ backgroundColor: 'var(--adm-accent)' }}>
                          Save Permissions
                        </button>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                        {['General', 'Analytics', 'Products', 'Orders', 'Users', 'Finance', 'Messages', 'Reviews', 'System'].map(group => {
                          const groupPerms = ALL_PERMISSIONS.filter(p => p.group === group)
                          if (groupPerms.length === 0) return null
                          const currentPerms = member.permissions || []
                          return (
                            <div key={group} className="rounded-lg p-3" style={{ backgroundColor: 'var(--adm-input)' }}>
                              <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--adm-accent)' }}>{group}</p>
                              <div className="space-y-1.5">
                                {groupPerms.map(perm => {
                                  const checked = currentPerms.includes(perm.key)
                                  return (
                                    <label key={perm.key} className="flex items-center gap-2 py-0.5 cursor-pointer hover:opacity-80 transition-opacity">
                                      <input type="checkbox" checked={checked}
                                        onChange={() => {
                                          const newPerms = checked
                                            ? currentPerms.filter((k: string) => k !== perm.key)
                                            : [...currentPerms, perm.key]
                                          // Update member in local state
                                          setStaff((prev: any[]) => prev.map((s: any) => s.id === member.id ? { ...s, permissions: newPerms } : s))
                                        }}
                                        className="w-3.5 h-3.5 rounded"
                                        style={{ accentColor: 'var(--adm-accent)' }} />
                                      <span className="text-[11px]" style={{ color: checked ? 'var(--adm-text)' : 'var(--adm-text-secondary)' }}>{perm.label}</span>
                                    </label>
                                  )
                                })}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                      <div className="mt-3 pt-3 border-t flex justify-end gap-2" style={{ borderColor: 'var(--adm-border)' }}>
                        <button onClick={() => setEditingPerms(null)}
                          className="px-3 py-1.5 text-xs rounded-lg" style={{ backgroundColor: 'var(--adm-input)', color: 'var(--adm-text-secondary)' }}>
                          Cancel
                        </button>
                        <button onClick={() => savePermissions(member.id, member.permissions || [])}
                          className="px-4 py-1.5 text-xs rounded-lg text-white transition-colors"
                          style={{ backgroundColor: 'var(--adm-accent)' }}>
                          Save Permissions
                        </button>
                      </div>
                    </div>
                  )}
              </div>
            )
          })}
        </div>
      )}

      {/* 头像选择弹窗 - 点击按钮后弹出,框中显示所有文化人物头像及名称介绍 */}
      <AvatarPicker
        open={pickerOpen}
        currentAvatar={pickerTarget === 'add' ? form.avatar : editForm.avatar}
        onClose={() => setPickerOpen(false)}
        onSelect={(url) => {
          if (pickerTarget === 'add') {
            setForm(p => ({ ...p, avatar: url }))
          } else {
            setEditForm(p => ({ ...p, avatar: url }))
          }
        }}
      />

      {/* Avatar Info Modal */}
      <AnimatePresence>
        {avatarInfoModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
            onClick={() => setAvatarInfoModal(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-md rounded-2xl overflow-hidden shadow-2xl"
              style={{ backgroundColor: 'var(--adm-card)', border: '1px solid var(--adm-border)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative">
                <div className="h-24" style={{ backgroundColor: 'var(--adm-accent)', opacity: 0.15 }} />
                <div className="absolute -bottom-10 left-6">
                  <div className="w-20 h-20 rounded-full overflow-hidden border-4" style={{ borderColor: 'var(--adm-card)' }}>
                    <img src={avatarInfoModal.url} alt={avatarInfoModal.name} className="w-full h-full object-cover" />
                  </div>
                </div>
                <button
                  onClick={() => setAvatarInfoModal(null)}
                  className="absolute top-3 right-3 p-2 rounded-full transition-colors"
                  style={{ backgroundColor: 'rgba(0,0,0,0.2)', color: 'white' }}
                >
                  <X size={16} />
                </button>
              </div>
              <div className="pt-12 px-6 pb-6">
                <h3 className="text-xl font-bold" style={{ color: 'var(--adm-text)' }}>{avatarInfoModal.name}</h3>
                {(avatarInfoModal.era || avatarInfoModal.role) && (
                  <div className="flex gap-2 mt-2">
                    {avatarInfoModal.era && (
                      <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: 'var(--adm-accent-bg)', color: 'var(--adm-accent)' }}>
                        {avatarInfoModal.era}
                      </span>
                    )}
                    {avatarInfoModal.role && (
                      <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: 'var(--adm-input)', color: 'var(--adm-text-secondary)' }}>
                        {avatarInfoModal.role}
                      </span>
                    )}
                  </div>
                )}
                {avatarInfoModal.intro && (
                  <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--adm-border)' }}>
                    <p className="text-xs font-medium mb-2" style={{ color: 'var(--adm-text-secondary)' }}>Biography</p>
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--adm-text)' }}>{avatarInfoModal.intro}</p>
                  </div>
                )}
                <div className="mt-5 flex justify-end">
                  <button
                    onClick={() => setAvatarInfoModal(null)}
                    className="px-4 py-2 text-sm rounded-lg text-white transition-colors"
                    style={{ backgroundColor: 'var(--adm-accent)' }}
                  >
                    Got it
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Modal */}
      <AnimatePresence>
        {chatModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
            onClick={() => setChatModal(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-md rounded-2xl overflow-hidden shadow-2xl"
              style={{ backgroundColor: 'var(--adm-card)', border: '1px solid var(--adm-border)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-5 border-b" style={{ borderColor: 'var(--adm-border)' }}>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--adm-text)' }}>
                    <MessageCircle size={18} style={{ color: 'var(--adm-accent)' }} />
                    Send Message
                  </h3>
                  <button
                    onClick={() => setChatModal(null)}
                    className="p-1.5 rounded-lg transition-colors adm-hover-bg"
                    style={{ color: 'var(--adm-text-secondary)' }}
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              <div className="p-5 space-y-4">
                <div className="flex items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: 'var(--adm-input)' }}>
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold overflow-hidden shrink-0"
                    style={{ backgroundColor: 'var(--adm-accent)', color: 'white' }}
                  >
                    {chatModal.avatar ? (
                      <img src={chatModal.avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      (chatModal.name || '?')[0].toUpperCase()
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium" style={{ color: 'var(--adm-text)' }}>{chatModal.name}</p>
                    <p className="text-xs" style={{ color: 'var(--adm-text-secondary)' }}>
                      {(ROLE_INFO[chatModal.role] || {}).label || chatModal.role || 'Staff'}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--adm-text-secondary)' }}>
                    Message
                  </label>
                  <textarea
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    rows={4}
                    placeholder="Type your message..."
                    className="w-full px-3 py-2 rounded-lg border text-sm resize-none focus:outline-none focus:border-indigo-500/50"
                    style={{
                      backgroundColor: 'var(--adm-input)',
                      borderColor: 'var(--adm-input-border)',
                      color: 'var(--adm-text)',
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        if (chatMessage.trim() && !chatSending) {
                          setChatSending(true)
                          fetch('/api/internal-chat', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ toStaffId: chatModal.id, message: chatMessage })
                          }).then(r => {
                            if (r.ok) { setChatModal(null); setChatMessage('') }
                            else alert('Failed to send message')
                          }).catch(() => alert('Failed to send message')).finally(() => setChatSending(false))
                        }
                      }
                    }}
                  />
                </div>
              </div>

              <div className="p-5 pt-0 flex gap-2">
                <button
                  type="button"
                  onClick={() => setChatModal(null)}
                  className="flex-1 px-4 py-2.5 text-sm rounded-lg transition-colors adm-hover-bg"
                  style={{ color: 'var(--adm-text-secondary)', border: '1px solid var(--adm-border)' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (!chatMessage.trim() || chatSending) return
                    setChatSending(true)
                    try {
                      const res = await fetch('/api/internal-chat', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ toStaffId: chatModal.id, message: chatMessage })
                      })
                      if (res.ok) {
                        setChatModal(null)
                        setChatMessage('')
                      } else {
                        alert('Failed to send message')
                      }
                    } catch {
                      alert('Failed to send message')
                    }
                    setChatSending(false)
                  }}
                  disabled={chatSending || !chatMessage.trim()}
                  className="flex-1 px-4 py-2.5 text-sm rounded-lg text-white font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{ backgroundColor: 'var(--adm-accent)' }}
                >
                  {chatSending ? 'Sending...' : <><Send size={14} /> Send</>}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}




