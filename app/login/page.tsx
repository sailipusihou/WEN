"use client"
import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Eye, EyeOff } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [showPw, setShowPw] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError("")
    try {
      const res = await fetch("/api/auth/user-login", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      })
      if (res.ok) {
        localStorage.setItem("otm_user", "1")
        // 修复 M8: 登录后跳回 middleware 传来的目标页 (如 /account/orders)
        const params = new URLSearchParams(window.location.search)
        const redirect = params.get('redirect')
        window.location.href = redirect && redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : '/account'
      }
      else { const d = await res.json(); setError(d.error || "Login failed") }
    } catch { setError("Connection error. Please try again.") }
    finally { setLoading(false) }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 bg-[#F8F5F0]">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-en text-3xl md:text-4xl text-[#2C2C2C] font-semibold tracking-tight mb-1">Sign In</h1>
          <p className="font-sans text-sm text-[#6B6B6B]/60">Welcome back</p>
        </div>
        <form onSubmit={handleSubmit} noValidate className="bg-white/80 border border-[#EDE8DC]/60 p-6 md:p-8 space-y-4">
          {error && <p className="text-sm text-red-500 font-sans bg-red-50 p-2.5">{error}</p>}
          <div>
            <label className="block text-[10px] font-sans text-[#6B6B6B]/60 tracking-wider uppercase mb-1.5">Email</label>
            <input type="text" inputMode="email" value={email} onChange={e => setEmail(e.target.value)} required
              className="input-premium"
              placeholder="yourname@example.com" />
          </div>
          <div>
            <label className="block text-[10px] font-sans text-[#6B6B6B]/60 tracking-wider uppercase mb-1.5">Password</label>
            <div className="relative">
              <input type={showPw ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} required
                className="input-premium pr-10"
                placeholder="&#x2022;&#x2022;&#x2022;&#x2022;&#x2022;&#x2022;&#x2022;&#x2022;" />
              <button type="button" onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B6B6B]/30 hover:text-[#2C2C2C]/60 transition-colors">
                {showPw ? <EyeOff size={16} strokeWidth={1.5} /> : <Eye size={16} strokeWidth={1.5} />}
              </button>
            </div>
          </div>
          <button type="submit" disabled={loading}
            className="w-full py-3 bg-[#2C2C2C] text-white text-xs tracking-[0.08em] uppercase font-sans font-medium hover:bg-[#1A1A1A] disabled:opacity-50 transition-colors">
            {loading ? "Signing in..." : "Sign In"}
          </button>
          <p className="text-center text-xs font-sans text-[#6B6B6B]/50 mt-2">
            No account? <Link href="/register" className="text-[#8B7D5C] hover:underline">Create one</Link>
          </p>
        </form>
      </div>
    </div>
  )
}
