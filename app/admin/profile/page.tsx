"use client"
import { useState, useEffect } from "react"
import { Save, User, Lock, Camera, UserCircle, Phone, FileText } from "lucide-react"
import { Section, Field, Input, Textarea, ImageUploader } from "@/components/admin/SettingsSection"

export default function AdminProfilePage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [activeTab, setActiveTab] = useState<"profile" | "password">("profile")
  const [form, setForm] = useState({
    name: "",
    email: "",
    avatar: "",
    phone: "",
    bio: "",
  })
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })
  const [error, setError] = useState("")

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/admin/profile?_t=" + Date.now())
        if (res.ok) {
          const data = await res.json()
          if (data.user) {
            setUser(data.user)
            setForm({
              name: data.user.name || "",
              email: data.user.email || "",
              avatar: data.user.avatar || "",
              phone: data.user.phone || "",
              bio: data.user.bio || "",
            })
          }
        }
      } catch (e) {
        console.error("Load profile error:", e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const updateForm = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const updatePasswordForm = (field: string, value: string) => {
    setPasswordForm(prev => ({ ...prev, [field]: value }))
  }

  const saveProfile = async () => {
    setSaving(true)
    setError("")
    try {
      const res = await fetch("/api/admin/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.user) {
          setUser(data.user)
          setSaved(true)
          setTimeout(() => {
            setSaved(false)
            window.location.reload()
          }, 800)
        }
      } else {
        const d = await res.json().catch(() => ({}))
        setError(d.error || "Save failed")
      }
    } catch (e) {
      setError("Save failed")
    } finally {
      setSaving(false)
    }
  }

  const savePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError("New passwords do not match")
      return
    }
    if (passwordForm.newPassword.length < 8) {
      setError("New password must be at least 8 characters")
      return
    }
    setSaving(true)
    setError("")
    try {
      const res = await fetch("/api/admin/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      })
      if (res.ok) {
        setSaved(true)
        setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" })
        setTimeout(() => {
          setSaved(false)
        }, 2000)
      } else {
        const d = await res.json().catch(() => ({}))
        setError(d.error || "Save failed")
      }
    } catch (e) {
      setError("Save failed")
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 rounded-full animate-spin" style={{ border: "2px solid var(--adm-accent)", borderTopColor: "transparent" }} />
    </div>
  )

  const displayName = user?.name || user?.email || "User"
  const userInitial = (user?.name?.[0] || user?.email?.[0] || "U").toUpperCase()

  return (
    <div className="space-y-6" style={{ color: "var(--adm-text)" }}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">My Profile</h1>
          <p className="text-sm mt-1" style={{ color: "var(--adm-text-secondary)" }}>Manage your account settings and preferences</p>
        </div>
        <button
          onClick={activeTab === "profile" ? saveProfile : savePassword}
          disabled={saving}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium"
          style={{ backgroundColor: "var(--adm-accent)", color: "var(--adm-accent-text)", border: "none", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}
        >
          <Save size={14} /> {saving ? "Saving..." : saved ? "Saved!" : "Save Changes"}
        </button>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-lg text-sm" style={{ backgroundColor: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444" }}>
          {error}
        </div>
      )}

      <div className="flex gap-1 pb-2 border-b" style={{ borderColor: "var(--adm-border)" }}>
        <button
          onClick={() => setActiveTab("profile")}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all adm-hover-bg"
          style={{
            backgroundColor: activeTab === "profile" ? "var(--adm-accent-bg)" : "transparent",
            color: activeTab === "profile" ? "var(--adm-accent)" : "var(--adm-text-secondary)",
            borderBottom: activeTab === "profile" ? "2px solid var(--adm-accent)" : "2px solid transparent",
            borderRadius: activeTab === "profile" ? "0.5rem 0.5rem 0 0" : "0.5rem 0.5rem 0 0",
          }}
        >
          <User size={15} /> Profile
        </button>
        <button
          onClick={() => setActiveTab("password")}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all adm-hover-bg"
          style={{
            backgroundColor: activeTab === "password" ? "var(--adm-accent-bg)" : "transparent",
            color: activeTab === "password" ? "var(--adm-accent)" : "var(--adm-text-secondary)",
            borderBottom: activeTab === "password" ? "2px solid var(--adm-accent)" : "2px solid transparent",
            borderRadius: activeTab === "password" ? "0.5rem 0.5rem 0 0" : "0.5rem 0.5rem 0 0",
          }}
        >
          <Lock size={15} /> Password
        </button>
      </div>

      {activeTab === "profile" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div className="rounded-xl p-6 text-center space-y-4" style={{ backgroundColor: "var(--adm-card)", border: "1px solid var(--adm-border)" }}>
              <div className="w-24 h-24 mx-auto rounded-full flex items-center justify-center text-2xl font-bold overflow-hidden" style={{ backgroundColor: "var(--adm-accent-bg)", color: "var(--adm-accent)" }}>
                {form.avatar ? (
                  <img src={form.avatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  userInitial
                )}
              </div>
              <div>
                <h3 className="text-lg font-semibold">{displayName}</h3>
                <p className="text-sm" style={{ color: "var(--adm-text-secondary)" }}>{user?.email}</p>
                <p className="text-xs mt-1 px-2 py-0.5 rounded-full inline-block" style={{ backgroundColor: "var(--adm-accent-bg)", color: "var(--adm-accent)" }}>
                  {user?.role === "super_admin" ? "Super Admin" : (user?.role || "Staff")}
                </p>
              </div>
              <div className="pt-4 border-t" style={{ borderColor: "var(--adm-border)" }}>
                <Field label="Avatar" desc="Upload a profile picture">
                  <ImageUploader value={form.avatar} onChange={v => updateForm("avatar", v)} label="Upload Avatar" />
                </Field>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <Section icon={UserCircle} title="Personal Information">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Full Name"><Input value={form.name} onChange={v => updateForm("name", v)} placeholder="Your name" /></Field>
                <Field label="Email"><Input value={form.email} onChange={v => updateForm("email", v)} placeholder="your@email.com" /></Field>
                <Field label="Phone"><Input value={form.phone} onChange={v => updateForm("phone", v)} placeholder="+1 234 567 8900" /></Field>
              </div>
            </Section>

            <Section icon={FileText} title="Bio">
              <Field label="About Me" desc="A short description about yourself">
                <Textarea value={form.bio} onChange={v => updateForm("bio", v)} placeholder="Write a little bit about yourself..." rows={4} />
              </Field>
            </Section>
          </div>
        </div>
      )}

      {activeTab === "password" && (
        <div className="max-w-xl">
          <Section icon={Lock} title="Change Password">
            <div className="space-y-4">
              <Field label="Current Password">
                <Input type="password" value={passwordForm.currentPassword} onChange={v => updatePasswordForm("currentPassword", v)} placeholder="Enter current password" />
              </Field>
              <Field label="New Password" desc="Must be at least 8 characters">
                <Input type="password" value={passwordForm.newPassword} onChange={v => updatePasswordForm("newPassword", v)} placeholder="Enter new password" />
              </Field>
              <Field label="Confirm New Password">
                <Input type="password" value={passwordForm.confirmPassword} onChange={v => updatePasswordForm("confirmPassword", v)} placeholder="Confirm new password" />
              </Field>
            </div>
          </Section>
        </div>
      )}
    </div>
  )
}

