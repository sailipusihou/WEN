"use client"
import { useState, useEffect, useRef } from "react"
import { MessageCircle, X, Send, Minus, User, Bot } from "lucide-react"

export default function ChatWidget({ productContext }: { productContext?: string }) {
  const [open, setOpen] = useState(false)
  const [minimized, setMinimized] = useState(false)
  const [form, setForm] = useState({ name: "", email: "", message: "" })
  const [msgs, setMsgs] = useState<any[]>([])
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState("")
  const [userEmail, setUserEmail] = useState("")
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => { const e = localStorage.getItem("otm_chat_email"); if (e) setUserEmail(e) }, [])

  useEffect(() => {
    if (!open || !userEmail) return
    fetch("/api/messages?email=" + encodeURIComponent(userEmail))
      .then(r => r.ok ? r.json() : [])
      .then(d => { setMsgs(Array.isArray(d) ? d.reverse() : []); setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100) })
      .catch(() => {})
    const iv = setInterval(() => {
      fetch("/api/messages?email=" + encodeURIComponent(userEmail))
        .then(r => r.ok ? r.json() : [])
        .then(d => { setMsgs(Array.isArray(d) ? d.reverse() : []) })
    }, 15000)
    return () => clearInterval(iv)
  }, [open, userEmail])

  const handleSend = async () => {
    if (!form.name || !form.email || !form.message) { setError("Please fill in all fields"); return }
    setSending(true); setError("")
    try {
      const body: any = { name: form.name, email: form.email, message: form.message, source: "chat" }
      if (productContext) body.product = productContext
      const res = await fetch("/api/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      if (res.ok) {
        setSent(true); setUserEmail(form.email); localStorage.setItem("otm_chat_email", form.email)
        setForm({ name: "", email: "", message: "" })
      } else { setError("Failed") }
    } catch { setError("Connection error") }
    finally { setSending(false) }
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {open && !minimized && (
        <div className="bg-white rounded-xl shadow-2xl border border-gray-100 w-80 md:w-96 overflow-hidden">
          <div className="bg-otb-terracotta px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2"><MessageCircle size={16} className="text-white" /><span className="text-white font-serif text-sm font-medium">Customer Service</span></div>
            <div className="flex items-center gap-1">
              <button onClick={() => setMinimized(true)} className="text-white/70 hover:text-white p-1"><Minus size={14} /></button>
              <button onClick={() => { setOpen(false); setMinimized(false); setSent(false) }} className="text-white/70 hover:text-white p-1"><X size={14} /></button>
            </div>
          </div>
          <div className="p-4 max-h-96 overflow-y-auto">
            {productContext && !userEmail && (
              <div className="bg-otb-sand/10 px-3 py-2 rounded-lg text-xs font-sans text-otb-ink/50 mb-3">Inquiring about: <span className="text-otb-ink font-medium">{productContext}</span></div>
            )}
            {userEmail && msgs.length > 0 && (
              <div className="space-y-3 mb-4">
                {msgs.map((m, i) => (
                  <div key={i}>
                    <div className="flex justify-end mb-1">
                      <div className="bg-otb-terracotta text-white text-xs font-sans px-3 py-2 rounded-lg rounded-br-sm max-w-[80%]">{m.message}</div>
                    </div>
                    {m.adminReply && (
                      <div className="flex justify-start">
                        <div className="bg-gray-100 text-otb-ink text-xs font-sans px-3 py-2 rounded-lg rounded-bl-sm max-w-[80%]">{m.adminReply}</div>
                      </div>
                    )}
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>
            )}
            {userEmail && msgs.length === 0 && <p className="text-xs font-sans text-otb-ink/40 text-center py-4">No messages yet.</p>}
            {sent ? (
              <div className="text-center py-4"><MessageCircle size={24} className="mx-auto text-green-500 mb-1" /><p className="font-sans text-sm text-otb-ink font-medium">Sent!</p><p className="font-sans text-xs text-otb-ink/40">We will reply shortly.</p><button onClick={() => setSent(false)} className="text-xs text-otb-terracotta hover:underline mt-2">Send another</button></div>
            ) : (
              <div className="space-y-2.5">
                {userEmail && <p className="text-xs font-sans text-otb-ink/40 mb-1">Reply to: <span className="font-medium">{userEmail}</span></p>}
                {error && <p className="text-xs text-red-500 font-sans bg-red-50 p-2 rounded-lg">{error}</p>}
                {!userEmail && <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Your Name *" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-sans focus:outline-none focus:border-otb-terracotta/50" />}
                {!userEmail && <input value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="Your Email *" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-sans focus:outline-none focus:border-otb-terracotta/50" />}
                <textarea value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))} placeholder="Your message *" rows={3} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-sans focus:outline-none focus:border-otb-terracotta/50 resize-none" />
                <button onClick={handleSend} disabled={sending} className="w-full py-2.5 bg-otb-terracotta text-white text-sm font-serif rounded-lg hover:bg-otb-terracotta/90 disabled:opacity-50 flex items-center justify-center gap-1.5 transition-colors">{sending ? "Sending..." : <><Send size={14} /> Send Message</>}</button>
              </div>
            )}
          </div>
        </div>
      )}
      {minimized && <div className="bg-otb-terracotta text-white px-4 py-2 rounded-lg shadow-lg cursor-pointer text-sm font-serif flex items-center gap-2" onClick={() => setMinimized(false)}><MessageCircle size={16} /> Chat</div>}
      <button onClick={() => { setOpen(!open); setMinimized(false) }} className="w-12 h-12 rounded-full bg-otb-terracotta text-white shadow-lg hover:bg-otb-terracotta/90 transition-colors flex items-center justify-center">{open ? <X size={20} /> : <MessageCircle size={20} />}</button>
    </div>
  )
}
