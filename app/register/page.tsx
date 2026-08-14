"use client"
import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Eye, EyeOff } from "lucide-react"

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", password: "" })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [showPw, setShowPw] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError("")
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      })
      if (res.ok) {
        const d = await res.json()
        localStorage.setItem("otm_user", "1")
        localStorage.setItem("otm_chat_email", form.email)
        // 修复 L8: 去掉重复的 window.location.reload (router.push 已足够)
        router.push("/account?welcome=1")
      } else {
        const d = await res.json()
        setError(d.error || "Registration failed")
      }
    } catch { setError("Connection error") }
    finally { setLoading(false) }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 bg-[#F8F5F0]">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-en text-3xl md:text-4xl text-[#2C2C2C] font-semibold tracking-tight mb-1">Create Account</h1>
          <p className="font-sans text-sm text-[#6B6B6B]/60">Join the Low Flame community</p>
        </div>
        <form onSubmit={handleSubmit} noValidate className="bg-white/80 border border-[#EDE8DC]/60 p-6 md:p-8 space-y-4">
          {error && <p className="text-sm text-red-500 font-sans bg-red-50 p-2.5">{error}</p>}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-sans text-[#6B6B6B]/60 tracking-wider uppercase mb-1.5">First Name</label>
              <input type="text" value={form.firstName} onChange={e => setForm(p => ({ ...p, firstName: e.target.value }))} required
                className="input-premium" placeholder="First" />
            </div>
            <div>
              <label className="block text-[10px] font-sans text-[#6B6B6B]/60 tracking-wider uppercase mb-1.5">Last Name</label>
              <input type="text" value={form.lastName} onChange={e => setForm(p => ({ ...p, lastName: e.target.value }))} required
                className="input-premium" placeholder="Last" />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-sans text-[#6B6B6B]/60 tracking-wider uppercase mb-1.5">Email</label>
            <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required
              className="input-premium" placeholder="you@example.com" />
          </div>
          <div>
            <label className="block text-[10px] font-sans text-[#6B6B6B]/60 tracking-wider uppercase mb-1.5">Password</label>
            <div className="relative">
              <input type={showPw ? "text" : "password"} value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} required minLength={6}
                className="input-premium pr-10" placeholder="At least 6 characters" />
              <button type="button" onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B6B6B]/30 hover:text-[#2C2C2C]/60 transition-colors">
                {showPw ? <EyeOff size={16} strokeWidth={1.5} /> : <Eye size={16} strokeWidth={1.5} />}
              </button>
            </div>
          </div>
          <button type="submit" disabled={loading}
            className="w-full py-3 bg-[#2C2C2C] text-white text-xs tracking-[0.08em] uppercase font-sans font-medium hover:bg-[#1A1A1A] disabled:opacity-50 transition-colors">
            {loading ? "Creating..." : "Create Account"}
          </button>
          <p className="text-center text-xs font-sans text-[#6B6B6B]/50 mt-2">
            Already registered? <Link href="/login" className="text-[#8B7D5C] hover:underline">Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  )
}
