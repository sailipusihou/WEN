'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { Send, ArrowUpLeft, Mail, MapPin, Clock } from 'lucide-react'
import Link from 'next/link'

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' })
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSending(true)
    try {
      const res = await fetch('/api/messages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      if (res.ok) { setSent(true); setForm({ name: '', email: '', subject: '', message: '' }) }
    } finally { setSending(false) }
  }

  if (sent) return (
    <div className="min-h-[70vh] flex items-center justify-center bg-[#FBFAF7]">
      <div className="text-center max-w-md mx-auto px-6">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-[#EFE7D4]/50 flex items-center justify-center">
          <Mail size={28} strokeWidth={1} className="text-[#8A6A2E]" />
        </div>
        <h1 className="font-en text-2xl md:text-3xl text-[#2A2118] font-medium tracking-[0.005em] mb-2">Message Sent</h1>
        <p className="font-sans text-sm text-[#5A4A36]/60 mb-8">Thank you for reaching out. We will respond within 24 hours.</p>
        <Link href="/" className="inline-flex items-center gap-2 px-8 py-3 bg-[#2A2118] text-white text-xs tracking-[0.08em] uppercase font-sans font-medium hover:bg-[#1A1A1A] transition-colors">Back to Home</Link>
      </div>
    </div>
  )

  return (
    <div className="bg-[#FBFAF7] min-h-screen">
      <div className="max-w-4xl mx-auto px-6 sm:px-8 lg:px-12 py-12 md:py-20">
        <Link href="/" className="inline-flex items-center gap-1 font-sans text-xs text-[#5A4A36]/50 hover:text-[#2A2118] transition-colors mb-8 tracking-[0.18em] uppercase">
          <ArrowUpLeft size={12} strokeWidth={1.5} /> Back to Home
        </Link>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 md:gap-16">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <span className="font-sans text-micro text-[#A07C34] tracking-[0.24em] uppercase font-medium">Get in Touch</span>
            <h1 className="font-en text-3xl md:text-5xl text-[#2A2118] font-medium mt-2 tracking-[0.005em]">Contact</h1>
            <p className="font-sans text-sm text-[#5A4A36]/60 mt-3 leading-relaxed max-w-sm">
              Questions about a piece, need help with an order, or want to learn more about our artisans? We would love to hear from you.
            </p>
            <div className="space-y-3 mt-8">
              <div className="flex items-center gap-3 text-sm font-sans text-[#5A4A36]/60">
                <Mail size={14} strokeWidth={1.5} className="text-[#8A6A2E] shrink-0" /> hello@lowflame.store
              </div>
              <div className="flex items-center gap-3 text-sm font-sans text-[#5A4A36]/60">
                <MapPin size={14} strokeWidth={1.5} className="text-[#8A6A2E] shrink-0" /> Shanghai, China
              </div>
              <div className="flex items-center gap-3 text-sm font-sans text-[#5A4A36]/60">
                <Clock size={14} strokeWidth={1.5} className="text-[#8A6A2E] shrink-0" /> Mon-Sat 9:00-18:00 CST
              </div>
            </div>
          </motion.div>
          <motion.form initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} onSubmit={handleSubmit} className="space-y-3">
            <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Your Name *" required className="input-premium" />
            <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="Your Email *" required className="input-premium" />
            <input type="text" value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} placeholder="Subject *" required className="input-premium" />
            <textarea value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))} placeholder="Your Message *" required rows={5} className="input-premium resize-none" />
            <button type="submit" disabled={sending}
              className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-[#2A2118] text-white text-xs tracking-[0.08em] uppercase font-sans font-medium hover:bg-[#1A1A1A] transition-colors disabled:opacity-50">
              <Send size={14} strokeWidth={1.5} /> {sending ? 'Sending...' : 'Send Message'}
            </button>
          </motion.form>
        </div>
      </div>
    </div>
  )
}
