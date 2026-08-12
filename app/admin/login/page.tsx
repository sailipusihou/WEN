'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Store, Lock, ArrowRight, Eye, EyeOff, Mail, User } from 'lucide-react'

export default function AdminLoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState('password')
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('')
  const [email, setEmail] = useState('')
  const [staffPassword, setStaffPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPw, setShowPw] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const body = mode === 'password'
        ? { username, password }
        : { email, password: staffPassword }
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) { router.push('/admin') }
      else { const data = await res.json(); setError(data.error || 'Login failed') }
    } catch { setError('Network error, please try again') }
    finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: 'var(--adm-bg)' }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md rounded-xl p-8" style={{ backgroundColor: 'var(--adm-card)', border: '1px solid var(--adm-border)' }}
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4" style={{ backgroundColor: 'var(--adm-accent-bg)' }}>
            <Store size={28} style={{ color: 'var(--adm-accent)' }} />
          </div>
          <h1 className="font-serif text-2xl tracking-wider" style={{ color: 'var(--adm-text)' }}>Admin Panel</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--adm-text-secondary)' }}>Manager Login</p>
        </div>

        {/* Login mode switch - Card style */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <button onClick={() => { setMode('password'); setError(''); setShowPw(false) }}
            className="rounded-xl p-4 border-2 transition-all"
            style={{
              backgroundColor: mode === 'password' ? 'var(--adm-accent-bg)' : 'transparent',
              borderColor: mode === 'password' ? 'var(--adm-accent)' : 'var(--adm-border)'
            }}>
            <div className="flex items-center justify-center w-10 h-10 rounded-full mx-auto mb-2"
              style={{ backgroundColor: mode === 'password' ? 'var(--adm-accent-bg)' : 'var(--adm-input)' }}>
              <Lock size={20} style={{ color: mode === 'password' ? 'var(--adm-accent)' : 'var(--adm-text-secondary)' }} />
            </div>
            <p className="text-xs font-semibold" style={{ color: mode === 'password' ? 'var(--adm-accent)' : 'var(--adm-text-secondary)' }}>Master Admin</p>
            <p className="text-[9px] mt-0.5" style={{ color: 'var(--adm-text-secondary)' }}>
              Full system control
            </p>
          </button>
          <button onClick={() => { setMode('staff'); setError(''); setShowPw(false) }}
            className="rounded-xl p-4 border-2 transition-all"
            style={{
              backgroundColor: mode === 'staff' ? 'rgba(16,185,129,0.1)' : 'transparent',
              borderColor: mode === 'staff' ? '#10b981' : 'var(--adm-border)'
            }}>
            <div className="flex items-center justify-center w-10 h-10 rounded-full mx-auto mb-2"
              style={{ backgroundColor: mode === 'staff' ? 'rgba(16,185,129,0.2)' : 'var(--adm-input)' }}>
              <User size={20} style={{ color: mode === 'staff' ? '#34d399' : 'var(--adm-text-secondary)' }} />
            </div>
            <p className="text-xs font-semibold" style={{ color: mode === 'staff' ? '#34d399' : 'var(--adm-text-secondary)' }}>Staff Login</p>
            <p className="text-[9px] mt-0.5" style={{ color: 'var(--adm-text-secondary)' }}>
              Role-based access
            </p>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {mode === 'password' ? (
            <>
              <div className="rounded-lg p-3 mb-4 border" style={{ backgroundColor: 'var(--adm-accent-bg)', borderColor: 'var(--adm-border)' }}>
                <p className="text-xs" style={{ color: 'var(--adm-text-secondary)' }}>
                  <span style={{ color: 'var(--adm-accent)' }} className="font-medium">Admin Credentials: </span>
                  Enter your admin username and password.
                </p>
              </div>
              <div>
                <label className="block text-sm mb-2" style={{ color: 'var(--adm-text-secondary)' }}>Admin Username</label>
                <div className="relative">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--adm-text-secondary)' }} />
                  <input type="text" value={username} onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter admin username" autoFocus
                    className="w-full pl-10 pr-4 py-3 rounded-lg text-sm adm-input transition-colors" />
                </div>
              </div>
              <div>
                <label className="block text-sm mb-2" style={{ color: 'var(--adm-text-secondary)' }}>Admin Password</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--adm-text-secondary)' }} />
                  <input type={showPw ? 'text' : 'password'} value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter admin password"
                    className="w-full pl-10 pr-10 py-3 rounded-lg text-sm adm-input transition-colors" />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--adm-text-secondary)' }}>
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="rounded-lg p-3 mb-4 border" style={{ backgroundColor: 'rgba(16,185,129,0.05)', borderColor: 'rgba(16,185,129,0.2)' }}>
                <p className="text-xs" style={{ color: 'var(--adm-text-secondary)' }}>
                  <span className="text-emerald-400 font-medium">Staff Credentials: </span>
                  Login with your staff email and password.
                </p>
              </div>
              <div>
                <label className="block text-sm mb-2" style={{ color: 'var(--adm-text-secondary)' }}>Staff Email</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--adm-text-secondary)' }} />
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder="staff@example.com" autoFocus
                    className="w-full pl-10 pr-4 py-3 rounded-lg text-sm adm-input transition-colors" />
                </div>
              </div>
              <div>
                <label className="block text-sm mb-2" style={{ color: 'var(--adm-text-secondary)' }}>Password</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--adm-text-secondary)' }} />
                  <input type={showPw ? 'text' : 'password'} value={staffPassword}
                    onChange={(e) => setStaffPassword(e.target.value)}
                    placeholder="Enter staff password"
                    className="w-full pl-10 pr-10 py-3 rounded-lg text-sm adm-input transition-colors" />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--adm-text-secondary)' }}>
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </>
          )}

          {error && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-red-400">{error}</motion.p>
          )}

          <button type="submit" disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 text-white"
            style={{ backgroundColor: 'var(--adm-accent)' }}>
            {loading ? 'Verifying...' : <><ArrowRight size={18} /> Enter Dashboard</>}
          </button>
        </form>

        <div className="mt-6 text-center">
          <a href="/" className="text-sm transition-colors" style={{ color: 'var(--adm-text-secondary)' }}>&larr; Back to Store</a>
        </div>
      </motion.div>
    </div>
  )
}


