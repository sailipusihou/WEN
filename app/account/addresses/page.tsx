"use client"
import { useState, useEffect } from "react"
import Link from "next/link"
import { ArrowLeft, MapPin, Plus, Trash2, Star } from "lucide-react"

export default function AddressesPage() {
  const [user, setUser] = useState<any>(null)
  const [addresses, setAddresses] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ label: "Home", firstName: "", lastName: "", phone: "", address: "", city: "", state: "", zip: "", country: "United States", isDefault: false })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState({ type: "", text: "" })

  const loadUser = () => {
    fetch("/api/auth/user").then(r => r.ok ? r.json() : Promise.reject()).then(d => { setUser(d.user); setAddresses(d.user.addresses || []) }).catch(() => {})
  }
  useEffect(loadUser, [])

  const addAddress = async () => {
    setSaving(true); setMsg({ type: "", text: "" })
    const res = await fetch("/api/auth/user", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })
    if (res.ok) { const d = await res.json(); setAddresses(d.addresses || []); setShowForm(false) }
    else { const d = await res.json(); setMsg({ type: "error", text: d.error || "Failed" }) }
    setSaving(false)
  }

  const deleteAddress = async (id: string) => {
    const res = await fetch("/api/auth/user", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ addressId: id }) })
    if (res.ok) { const d = await res.json(); setAddresses(d.addresses || []) }
  }

  if (!user) return <div className="min-h-[60vh] flex items-center justify-center"><div className="w-8 h-8 border-2 border-otb-terracotta border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      <Link href="/account" className="inline-flex items-center gap-1 font-sans text-sm text-otb-ink/40 hover:text-otb-ink transition-colors mb-6"><ArrowLeft size={14} /> Back to Account</Link>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-2xl md:text-3xl text-otb-ink">My Addresses</h1>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1.5 px-4 py-2 bg-otb-terracotta text-white font-serif text-sm rounded-sm hover:bg-otb-terracotta/90 transition-colors"><Plus size={14} /> {showForm ? "Cancel" : "Add"}</button>
      </div>
      {msg.text && <p className={"text-sm font-sans p-2.5 rounded-sm mb-4 " + (msg.type === "success" ? "bg-green-50 text-green-600" : "bg-red-50 text-red-500")}>{msg.text}</p>}
      {showForm && (
        <div className="bg-[#FFFFFF]/70 border border-otb-sand/50 rounded-sm p-6 space-y-3 mb-6">
          <select value={form.label} onChange={e => setForm(p=>({...p,label:e.target.value}))} className="w-full px-3 py-2 border border-otb-sand/50 rounded-sm bg-[#FFFFFF] text-sm font-sans"><option>Home</option><option>Work</option><option>Other</option></select>
          <div className="grid grid-cols-2 gap-3">
            <input value={form.firstName} onChange={e => setForm(p=>({...p,firstName:e.target.value}))} placeholder="First Name *" className="w-full px-3 py-2 border border-otb-sand/50 rounded-sm bg-[#FFFFFF] text-sm font-sans" />
            <input value={form.lastName} onChange={e => setForm(p=>({...p,lastName:e.target.value}))} placeholder="Last Name *" className="w-full px-3 py-2 border border-otb-sand/50 rounded-sm bg-[#FFFFFF] text-sm font-sans" />
          </div>
          <input value={form.phone} onChange={e => setForm(p=>({...p,phone:e.target.value}))} placeholder="Phone" className="w-full px-3 py-2 border border-otb-sand/50 rounded-sm bg-[#FFFFFF] text-sm font-sans" />
          <input value={form.address} onChange={e => setForm(p=>({...p,address:e.target.value}))} placeholder="Address *" className="w-full px-3 py-2 border border-otb-sand/50 rounded-sm bg-[#FFFFFF] text-sm font-sans" />
          <div className="grid grid-cols-2 gap-3">
            <input value={form.city} onChange={e => setForm(p=>({...p,city:e.target.value}))} placeholder="City *" className="w-full px-3 py-2 border border-otb-sand/50 rounded-sm bg-[#FFFFFF] text-sm font-sans" />
            <input value={form.state} onChange={e => setForm(p=>({...p,state:e.target.value}))} placeholder="State" className="w-full px-3 py-2 border border-otb-sand/50 rounded-sm bg-[#FFFFFF] text-sm font-sans" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input value={form.zip} onChange={e => setForm(p=>({...p,zip:e.target.value}))} placeholder="ZIP Code *" className="w-full px-3 py-2 border border-otb-sand/50 rounded-sm bg-[#FFFFFF] text-sm font-sans" />
            <select value={form.country} onChange={e => setForm(p=>({...p,country:e.target.value}))} className="w-full px-3 py-2 border border-otb-sand/50 rounded-sm bg-[#FFFFFF] text-sm font-sans">
              <option>United States</option><option>United Kingdom</option><option>Canada</option><option>Australia</option><option>Germany</option><option>China</option><option>Other</option></select>
          </div>
          <label className="flex items-center gap-2 text-sm font-sans"><input type="checkbox" checked={form.isDefault} onChange={e => setForm(p=>({...p,isDefault:e.target.checked}))} /> Set as default</label>
          <button onClick={addAddress} disabled={saving} className="px-5 py-2 bg-otb-terracotta text-white font-serif text-sm rounded-sm hover:bg-otb-terracotta/90 disabled:opacity-50">{saving ? "Saving..." : "Save"}</button>
        </div>
      )}
      {addresses.length === 0 && !showForm ? (
        <div className="text-center py-16"><MapPin size={40} className="mx-auto text-otb-ink/20 mb-3" /><p className="font-sans text-sm text-otb-ink/40">No saved addresses</p></div>
      ) : (
        addresses.map((addr: any) => (
          <div key={addr.id} className="bg-[#FFFFFF]/70 border border-otb-sand/50 rounded-sm p-4 flex items-start justify-between mb-3">
            <div><div className="flex items-center gap-2 mb-1"><span className="text-xs font-sans font-medium text-otb-terracotta bg-otb-terracotta/5 px-2 py-0.5 rounded-sm uppercase">{addr.label}</span>{addr.isDefault && <Star size={12} className="text-yellow-500 fill-yellow-500" />}</div>
            <p className="font-sans text-sm text-otb-ink">{addr.firstName} {addr.lastName}</p><p className="font-sans text-xs text-otb-ink/50">{addr.address}, {addr.city}, {addr.state} {addr.zip}</p><p className="font-sans text-xs text-otb-ink/40">{addr.country}</p></div>
            <button onClick={() => deleteAddress(addr.id)} className="p-1.5 text-otb-ink/20 hover:text-red-500"><Trash2 size={14} /></button>
          </div>
        ))
      )}
    </div>
  )
}
