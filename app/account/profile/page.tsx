"use client"
import { useState, useEffect } from "react"
import Link from "next/link"
import { ArrowLeft, Save, Camera, Eye, EyeOff, Upload, Check } from "lucide-react"

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null)
  const [form, setForm] = useState({ firstName: "", lastName: "", phone: "", dob: "", gender: "", bio: "", preferredCurrency: "USD", avatar: "" })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState({ type: "", text: "" })
  const [pwForm, setPwForm] = useState({ current: "", newPw: "", confirm: "" })
  const [pwSaving, setPwSaving] = useState(false)
  const [pwMsg, setPwMsg] = useState({ type: "", text: "" })
  const [showPw, setShowPw] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [systemAvatars, setSystemAvatars] = useState<any[]>([])
  const [showAvatarPicker, setShowAvatarPicker] = useState(false)
  // 头像图片加载失败时回退到首字母占位 (修复: 失效头像显示空白)
  const [avatarFailed, setAvatarFailed] = useState(false)

  useEffect(() => {
    setAvatarFailed(false)
  }, [form.avatar])

  useEffect(() => {
    fetch("/api/auth/user").then(r => r.ok ? r.json() : Promise.reject()).then(d => {
      const u = d.user; setUser(u);
      setForm({ firstName: u.firstName || "", lastName: u.lastName || "", phone: u.phone || "",
        dob: u.dob || "", gender: u.gender || "", bio: u.bio || "",
        preferredCurrency: u.preferredCurrency || "USD", avatar: u.avatar || "" })
    }).catch(() => {})
    fetch("/api/avatars").then(r => r.ok ? r.json() : []).then(setSystemAvatars).catch(() => {})
  }, [])

  const update = (f: string, v: string) => setForm(p => ({ ...p, [f]: v }))
  const pwUpdate = (f: string, v: string) => setPwForm(p => ({ ...p, [f]: v }))

  const handleSave = async () => {
    setSaving(true); setMsg({ type: "", text: "" })
    const res = await fetch("/api/auth/user", {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form)
    })
    if (res.ok) setMsg({ type: "success", text: "Profile updated" })
    else { const d = await res.json(); setMsg({ type: "error", text: d.error || "Failed" }) }
    setSaving(false)
  }

  const handlePwChange = async () => {
    setPwSaving(true); setPwMsg({ type: "", text: "" })
    if (pwForm.newPw !== pwForm.confirm) { setPwMsg({ type: "error", text: "Passwords do not match" }); setPwSaving(false); return }
    const res = await fetch("/api/auth/user/password", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: pwForm.current, newPassword: pwForm.newPw })
    })
    if (res.ok) { setPwMsg({ type: "success", text: "Password changed" }); setPwForm({ current: "", newPw: "", confirm: "" }) }
    else { const d = await res.json(); setPwMsg({ type: "error", text: d.error || "Failed" }) }
    setPwSaving(false)
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { setMsg({ type: "error", text: "File too large (max 2MB)" }); return }
    const fd = new FormData(); fd.append("file", file)
    const res = await fetch("/api/avatars", { method: "POST", body: fd })
    if (res.ok) { const d = await res.json(); update("avatar", d.url); setMsg({ type: "success", text: "Avatar uploaded" }) }
    else setMsg({ type: "error", text: "Upload failed" })
  }

  const selectSystemAvatar = (url: string) => {
    update("avatar", url)
    setShowAvatarPicker(false)
  }

  if (!user) return <div className="min-h-[60vh] flex items-center justify-center"><div className="w-8 h-8 border-2 border-otb-terracotta border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      <Link href="/account" className="inline-flex items-center gap-1 font-sans text-sm text-otb-ink/40 hover:text-otb-ink transition-colors mb-6"><ArrowLeft size={14} /> Back to Account</Link>
      <h1 className="font-serif text-2xl md:text-3xl text-otb-ink mb-6">My Profile</h1>

      {/* Avatar */}
      <div className="bg-[#FFFFFF]/70 border border-otb-sand/50 rounded-sm p-6 mb-6">
        <div className="flex items-center gap-6">
          <div className="relative group">
            <div className="w-20 h-20 rounded-full overflow-hidden bg-otb-sand/30 flex items-center justify-center">
              {form.avatar && !avatarFailed ? (
                <img src={form.avatar} className="w-full h-full object-cover" onError={() => setAvatarFailed(true)} />
              ) : (
                <span className="text-2xl font-bold text-otb-terracotta">{(user.firstName || user.email || "U").charAt(0).toUpperCase()}</span>
              )}
            </div>
            <label className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/30 flex items-center justify-center cursor-pointer transition-all">
              <Camera size={20} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
            </label>
          </div>
          <div>
            <p className="font-serif text-base text-otb-ink font-medium">{user.firstName || user.email}</p>
            <p className="font-sans text-xs text-otb-ink/40">{user.email}</p>
            <div className="flex items-center gap-2 mt-2">
              <button onClick={() => setShowAvatarPicker(!showAvatarPicker)}
                className="text-xs font-sans text-otb-terracotta hover:underline flex items-center gap-1">
                <Camera size={12} /> System Avatars
              </button>
              {form.avatar && (
                <button onClick={() => update("avatar", "")}
                  className="text-xs font-sans text-otb-ink/30 hover:text-red-500">Remove</button>
              )}
            </div>
          </div>
        </div>

        {/* System Avatar Picker */}
        {showAvatarPicker && (
          <div className="mt-4 pt-4 border-t border-otb-sand/30">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-sans text-otb-ink/60">Choose a system avatar</p>
              <label className="text-xs font-sans text-otb-terracotta hover:underline cursor-pointer flex items-center gap-1">
                <Upload size={12} /> Upload Custom
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
              </label>
            </div>
            <div className="grid grid-cols-6 sm:grid-cols-8 gap-3">
              {systemAvatars.map((a, i) => (
                <button key={i} onClick={() => selectSystemAvatar(a.url)}
                  className={"w-12 h-12 rounded-full overflow-hidden border-2 transition-all hover:scale-110 " + (form.avatar === a.url ? "border-otb-terracotta shadow-md" : "border-transparent hover:border-otb-sand/50")}>
                  <img src={a.url} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Profile Info */}
      <div className="bg-[#FFFFFF]/70 border border-otb-sand/50 rounded-sm p-6 space-y-4 mb-6">
        <h2 className="font-serif text-base text-otb-ink mb-2">Personal Information</h2>
        {msg.text && <p className={"text-sm font-sans p-2.5 rounded-sm " + (msg.type === "success" ? "bg-green-50 text-green-600" : "bg-red-50 text-red-500")}>{msg.text}</p>}
        <div><label className="block text-xs font-sans text-otb-ink/60 mb-1.5">Email</label>
          <p className="px-3 py-2.5 bg-otb-sand/10 rounded-sm text-sm font-sans text-otb-ink/50">{user.email}</p></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="block text-xs font-sans text-otb-ink/60 mb-1.5">First Name</label>
            <input value={form.firstName} onChange={e => update("firstName", e.target.value)} className="w-full px-3 py-2.5 border border-otb-sand/50 rounded-sm bg-[#FFFFFF] text-sm font-sans focus:outline-none focus:border-otb-terracotta/50" /></div>
          <div><label className="block text-xs font-sans text-otb-ink/60 mb-1.5">Last Name</label>
            <input value={form.lastName} onChange={e => update("lastName", e.target.value)} className="w-full px-3 py-2.5 border border-otb-sand/50 rounded-sm bg-[#FFFFFF] text-sm font-sans focus:outline-none focus:border-otb-terracotta/50" /></div>
        </div>
        <div><label className="block text-xs font-sans text-otb-ink/60 mb-1.5">Phone</label>
          <input value={form.phone} onChange={e => update("phone", e.target.value)} className="w-full px-3 py-2.5 border border-otb-sand/50 rounded-sm bg-[#FFFFFF] text-sm font-sans focus:outline-none focus:border-otb-terracotta/50" /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="block text-xs font-sans text-otb-ink/60 mb-1.5">Date of Birth</label>
            <input type="date" value={form.dob} onChange={e => update("dob", e.target.value)} className="w-full px-3 py-2.5 border border-otb-sand/50 rounded-sm bg-[#FFFFFF] text-sm font-sans focus:outline-none focus:border-otb-terracotta/50" /></div>
          <div><label className="block text-xs font-sans text-otb-ink/60 mb-1.5">Gender</label>
            <select value={form.gender} onChange={e => update("gender", e.target.value)} className="w-full px-3 py-2.5 border border-otb-sand/50 rounded-sm bg-[#FFFFFF] text-sm font-sans focus:outline-none focus:border-otb-terracotta/50">
              <option value="">Prefer not to say</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option>
            </select></div>
        </div>
        <div><label className="block text-xs font-sans text-otb-ink/60 mb-1.5">Bio / About</label>
          <textarea value={form.bio} onChange={e => update("bio", e.target.value)} rows={3} placeholder="Tell us a little about yourself..."
            className="w-full px-3 py-2.5 border border-otb-sand/50 rounded-sm bg-[#FFFFFF] text-sm font-sans focus:outline-none focus:border-otb-terracotta/50" /></div>
        <div><label className="block text-xs font-sans text-otb-ink/60 mb-1.5">Preferred Currency</label>
          <select value={form.preferredCurrency} onChange={e => update("preferredCurrency", e.target.value)} className="w-full px-3 py-2.5 border border-otb-sand/50 rounded-sm bg-[#FFFFFF] text-sm font-sans focus:outline-none focus:border-otb-terracotta/50">
            {/* 定价基线 USD: 前台固定美元显示 */}
            <option value="USD">USD ($)</option>
          </select></div>
        <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-6 py-2.5 bg-otb-terracotta text-white font-serif text-sm rounded-sm hover:bg-otb-terracotta/90 disabled:opacity-50 transition-colors">
          <Save size={14} /> {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      {/* Change Password */}
      <div className="bg-[#FFFFFF]/70 border border-otb-sand/50 rounded-sm p-6 space-y-4">
        <h2 className="font-serif text-base text-otb-ink mb-2">Change Password</h2>
        {pwMsg.text && <p className={"text-sm font-sans p-2.5 rounded-sm " + (pwMsg.type === "success" ? "bg-green-50 text-green-600" : "bg-red-50 text-red-500")}>{pwMsg.text}</p>}
        <div><label className="block text-xs font-sans text-otb-ink/60 mb-1.5">Current Password</label>
          <input type="password" value={pwForm.current} onChange={e => pwUpdate("current", e.target.value)} className="w-full px-3 py-2.5 border border-otb-sand/50 rounded-sm bg-[#FFFFFF] text-sm font-sans focus:outline-none focus:border-otb-terracotta/50" /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="block text-xs font-sans text-otb-ink/60 mb-1.5">New Password</label>
            <div className="relative"><input type={showPw ? "text" : "password"} value={pwForm.newPw} onChange={e => pwUpdate("newPw", e.target.value)} minLength={6}
              className="w-full px-3 py-2.5 pr-10 border border-otb-sand/50 rounded-sm bg-[#FFFFFF] text-sm font-sans focus:outline-none focus:border-otb-terracotta/50" />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-otb-ink/30 hover:text-otb-ink/60">
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></div>
          <div><label className="block text-xs font-sans text-otb-ink/60 mb-1.5">Confirm New Password</label>
            <div className="relative"><input type={showNew ? "text" : "password"} value={pwForm.confirm} onChange={e => pwUpdate("confirm", e.target.value)}
              className="w-full px-3 py-2.5 pr-10 border border-otb-sand/50 rounded-sm bg-[#FFFFFF] text-sm font-sans focus:outline-none focus:border-otb-terracotta/50" />
              <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-otb-ink/30 hover:text-otb-ink/60">
                {showNew ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></div>
        </div>
        <button onClick={handlePwChange} disabled={pwSaving} className="flex items-center gap-2 px-6 py-2.5 bg-gray-700 text-white font-serif text-sm rounded-sm hover:bg-gray-800 disabled:opacity-50 transition-colors">
          <Save size={14} /> {pwSaving ? "Changing..." : "Change Password"}
        </button>
      </div>
    </div>
  )
}