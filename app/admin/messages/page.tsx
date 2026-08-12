"use client"
import { useState, useEffect, useRef } from "react"
import { MessageSquare, Mail, MailOpen, Send, Check, User, Inbox, ShoppingBag, ExternalLink, Paperclip, Image as ImageIcon, Smile, CheckCheck, Bell, Search, Users, MessageCircle, Plus, X, Package, Info } from "lucide-react"

function Avatar({ name, size = 24, bgColor, textColor, className = "", onClick }: {
  name?: string
  size?: number
  bgColor?: string
  textColor?: string
  className?: string
  onClick?: () => void
}) {
  const letter = (name || "?")[0]?.toUpperCase() || "?"
  return (
    <div
      className={`rounded-full shrink-0 flex items-center justify-center font-bold ${className} ${onClick ? "cursor-pointer hover:opacity-80 transition-opacity" : ""}`}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.4,
        backgroundColor: bgColor || "var(--adm-accent-bg)",
        color: textColor || "var(--adm-accent)",
      }}
      onClick={onClick}
    >
      <span>{letter}</span>
    </div>
  )
}

const EMOJI_LIST = [
  "😀", "😂", "🥰", "😎", "🤔", "😢", "😡", "👍", "👎", "❤️", "🎉",
  "🔥", "💯", "✨", "🙏", "👏", "💪", "😊", "🙂", "😉", "😌", "😍",
  "🤗", "😴", "🤯", "🥳", "😇", "🤝", "💡", "🎁", "⭐", "🌟", "💎",
]

export default function AdminMessagesPage() {
  const [activeTab, setActiveTab] = useState<'customer' | 'internal'>('customer')

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold adm-text-primary">Messages</h1>
        <div className="flex gap-2 mt-4">
          <button
            type="button"
            onClick={() => setActiveTab('customer')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all adm-hover-bg ${
              activeTab === 'customer'
                ? 'bg-[var(--adm-accent)] text-white'
                : 'text-[var(--adm-text-secondary)]'
            }`}
            style={{
              backgroundColor: activeTab === 'customer' ? 'var(--adm-accent)' : 'var(--adm-input)',
              color: activeTab === 'customer' ? 'white' : 'var(--adm-text-secondary)',
            }}
          >
            <div className="flex items-center gap-2">
              <Mail size={16} />
              Customer Messages
            </div>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('internal')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all adm-hover-bg ${
              activeTab === 'internal'
                ? 'bg-[var(--adm-accent)] text-white'
                : 'text-[var(--adm-text-secondary)]'
            }`}
            style={{
              backgroundColor: activeTab === 'internal' ? 'var(--adm-accent)' : 'var(--adm-input)',
              color: activeTab === 'internal' ? 'white' : 'var(--adm-text-secondary)',
            }}
          >
            <div className="flex items-center gap-2">
              <Users size={16} />
              Internal Chat
            </div>
          </button>
        </div>
      </div>

      {activeTab === 'customer' ? <CustomerMessages /> : <InternalChat />}
    </div>
  )
}

function CustomerMessages() {
  const [msgs, setMsgs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<any>(null)
  const [replyText, setReplyText] = useState("")
  const [sending, setSending] = useState(false)
  const [replySent, setReplySent] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [userMap, setUserMap] = useState<Record<string, any>>({})
  const imgRef = useRef<HTMLInputElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const emojiPickerRef = useRef<HTMLDivElement>(null)
  const [replyFile, setReplyFile] = useState<any>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [newMsgNotify, setNewMsgNotify] = useState<string | null>(null)
  const prevMsgIdsRef = useRef<Set<string>>(new Set())

  const loadMsgs = () => {
    fetch("/api/messages?_t=" + Date.now(), { credentials: 'include' }).then(r => r.ok && r.json()).then(d => {
      const arr = d || []
      const customerMsgs = arr.filter((m: any) => m.senderType !== 'admin')
      if (prevMsgIdsRef.current.size > 0) {
        const newOnes = customerMsgs.filter((m: any) => !prevMsgIdsRef.current.has(m.id))
        if (newOnes.length > 0) {
          const latest = newOnes[newOnes.length - 1]
          setNewMsgNotify(`New message from ${latest.name || latest.email}`)
          setTimeout(() => setNewMsgNotify(null), 5000)
        }
      }
      prevMsgIdsRef.current = new Set(customerMsgs.map((m: any) => m.id))
      setMsgs(arr)
      setLoading(false)
    })
  }
  useEffect(() => {
    loadMsgs()
    const iv = setInterval(loadMsgs, 10000)
    return () => clearInterval(iv)
  }, [])

  useEffect(() => {
    fetch("/api/auth/check", { credentials: 'include' }).then(r => r.ok ? r.json() : null).then(d => {
      if (d?.user) setCurrentUser(d.user)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    const emails = [...new Set(msgs.map(m => m.email).filter(Boolean))]
    if (emails.length === 0) return
    fetch("/api/users", { credentials: 'include' }).then(r => r.ok ? r.json() : []).then(d => {
      const map: Record<string, any> = {}
      for (const u of (d || [])) {
        map[u.email?.toLowerCase()] = u
      }
      setUserMap(map)
    }).catch(() => {})
  }, [msgs])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (!selected) return
    const timer = setTimeout(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollTop = messagesEndRef.current.scrollHeight
      }
    }, 50)
    return () => clearTimeout(timer)
  }, [msgs, selected])

  const markRead = async (email: string) => {
    const unreadMsgs = msgs.filter(m => m.email === email && m.senderType !== 'admin' && !m.read)
    for (const m of unreadMsgs) {
      await fetch("/api/messages", { method: "PUT", headers: { "Content-Type": "application/json" }, credentials: 'include', body: JSON.stringify({ id: m.id, read: true }) })
    }
    setMsgs(prev => prev.map(m => m.email === email && m.senderType !== 'admin' ? { ...m, read: true } : m))
    window.postMessage({ type: 'messageMarkedRead' })
  }

  const insertEmoji = (emoji: string) => {
    setReplyText(prev => prev + emoji)
    setShowEmojiPicker(false)
  }

  const sendReply = async () => {
    if (!replyText.trim() || !selected) return
    setSending(true)
    const customerMsg = msgs.find(m => m.email === selected.email && m.senderType !== 'admin')
    const targetId = customerMsg?.id || selected.id
    const res = await fetch("/api/messages", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: 'include',
      body: JSON.stringify({
        id: targetId,
        adminReply: replyText,
        adminName: currentUser?.name || "Customer Service",
        adminAvatar: currentUser?.avatar || "",
      })
    })
    if (res.ok) {
      setReplySent(true)
      setReplyText("")
      await loadMsgs()
      setTimeout(() => setReplySent(false), 3000)
    } else {
      alert("Failed to send reply")
    }
    setSending(false)
  }

  const conversations = msgs.filter((m, i, arr) => arr.findIndex(x => x.email === m.email) === i)

  function getCustomerAvatar(emailOrMsg: any) {
    const email = typeof emailOrMsg === "string" ? emailOrMsg : emailOrMsg?.email
    const convMsgs = msgs.filter(m => m.email === email && m.senderType !== 'admin')
    const latest = [...convMsgs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0] || emailOrMsg
    if (latest?.avatar) return { type: "image" as const, src: latest.avatar, name: latest.name }
    if (latest?.registered) return { type: "initial" as const, letter: (latest?.name || "?")[0]?.toUpperCase() || "?", name: latest.name }
    return { type: "icon" as const, name: latest?.name || "" }
  }

  function renderAttachments(atts: any[]) {
    if (!atts?.length) return null
    return atts.map((a: any, i: number) => {
      if (a.type === "product" || a.type === "product_card") {
        return (
          <a key={i} href={a.url || `/products/${a.productId}`} target="_blank" rel="noopener noreferrer" className="block mt-2 rounded-lg overflow-hidden border border-gray-600 bg-gray-900/50 hover:bg-gray-900 transition-colors">
            <div className="flex gap-2 p-2">
              {a.image && (
                <div className="w-14 h-14 rounded shrink-0 overflow-hidden bg-gray-700">
                  <img src={a.image} alt={a.name} className="w-full h-full object-cover" />
                </div>
              )}
              <div className="flex-1 min-w-0 flex flex-col justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-200 truncate">{a.name}</p>
                  {a.category && <p className="text-[10px] text-gray-500 mt-0.5">{a.category}</p>}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-indigo-400">${(a.price || 0).toFixed(2)}</span>
                  <span className="text-[10px] text-indigo-400 flex items-center gap-0.5"><ShoppingBag size={10} /> Open</span>
                </div>
              </div>
            </div>
          </a>
        )
      }
      if (a.type === "product_link") {
        return <a key={i} href={a.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-indigo-500/10 rounded-lg p-2 mt-1.5 text-xs hover:bg-indigo-500/20 transition-colors"><ShoppingBag size={12} className="text-indigo-400 shrink-0" /><span className="text-gray-300 truncate">{a.name || a.url}</span><ExternalLink size={10} className="text-gray-500 shrink-0" /></a>
      }
      if (a.type === "image") {
        return <img key={i} src={a.url} alt={a.name || ""} className="max-w-[200px] rounded-lg mt-1.5 border border-gray-600" />
      }
      return <a key={i} href={a.url} download className="flex items-center gap-2 bg-gray-700 rounded-lg p-2 mt-1.5 text-xs text-gray-400 hover:text-indigo-400 transition-colors"><Paperclip size={12} />{a.name || "File"}</a>
    })
  }

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div>
      {newMsgNotify && (
        <div className="fixed top-20 right-6 z-50 rounded-xl px-4 py-3 flex items-center gap-2 shadow-lg animate-in fade-in slide-in-from-top-2 duration-300" style={{ backgroundColor: "var(--adm-accent)", color: "white" }}>
          <Bell size={14} />
          <span className="text-sm font-medium">{newMsgNotify}</span>
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" style={{ height: "calc(100vh - 280px)" }}>
        <div className="lg:col-span-1 min-h-0 space-y-1 overflow-y-auto pr-1 rounded-xl border p-2" style={{ backgroundColor: "var(--adm-card)", borderColor: "var(--adm-border)" }}>
          {conversations.length === 0 ? (
            <div className="text-center py-8"><Inbox size={32} className="mx-auto text-gray-600 mb-2" /><p className="text-sm text-gray-500">No messages</p></div>
          ) : conversations.map((conv) => {
            const convMsgs = msgs.filter(m => m.email === conv.email)
            const sortedMsgs = [...convMsgs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            const latestMsg = sortedMsgs[0]
            const unreadCount = convMsgs.filter(m => !m.read && m.senderType !== 'admin').length
            const hasUnread = unreadCount > 0
            const avatar = getCustomerAvatar(conv.email)
            return (
              <div key={conv.email} onClick={() => { setSelected(latestMsg || conv); if (hasUnread) markRead(conv.email) }}
                className={"p-3 rounded-xl border cursor-pointer transition-all adm-hover-bg " + (selected?.email === conv.email ? "border-indigo-500/50 bg-indigo-500/10" : "border-transparent")}>
                <div className="flex items-center gap-2">
                  <Avatar name={avatar.type === "initial" ? avatar.letter : avatar.name || conv.name} size={24} />
                  <p className="text-sm font-medium adm-text-primary truncate flex-1">{avatar.name || conv.name}</p>
                  {hasUnread && (
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-[10px] font-bold uppercase" style={{ color: "var(--adm-accent)" }}>new</span>
                      <span className="w-5 h-5 flex items-center justify-center text-[10px] font-bold rounded-full text-white" style={{ backgroundColor: "var(--adm-accent)" }}>
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <div className="lg:col-span-2 min-h-0">
          {selected ? (
            <div className="rounded-xl border h-full flex flex-col" style={{ backgroundColor: "var(--adm-card)", borderColor: "var(--adm-border)" }}>
              <div className="p-5 border-b" style={{ borderColor: "var(--adm-border)" }}>
                <div className="flex items-center gap-3 mb-2">
                  {(() => {
                    const a = getCustomerAvatar(selected.email)
                    return (
                      <Avatar
                        name={a.type === "initial" ? a.letter : a.name || selected.name}
                        size={32}
                      />
                    )
                  })()}
                  <div>
                    <h2 className="text-base font-semibold adm-text-primary">{(getCustomerAvatar(selected.email).name) || selected.name}</h2>
                    <p className="text-xs text-gray-500">{selected.email}</p>
                  </div>
                </div>
              </div>

              <div ref={messagesEndRef} className="flex-1 overflow-y-auto p-5 space-y-4">
                {[...msgs]
                  .filter(m => m.email === selected.email)
                  .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
                  .map((m, i) => {
                    const isAdmin = m.senderType === 'admin'
                    const avatar = getCustomerAvatar(m)
                    if (isAdmin) {
                      return (
                        <div key={m.id || i} className="flex justify-end mb-2">
                          <div className="flex items-end gap-2 max-w-[85%]">
                            <div className="bg-indigo-500/20 text-gray-200 text-sm px-4 py-3 rounded-xl rounded-br-sm">
                              <div className="flex items-center gap-2 mb-1 justify-end">
                                <span className="text-[10px] text-indigo-400/80">{m.adminName || currentUser?.name || "Staff"}</span>
                              </div>
                              {m.message && <p className="leading-relaxed whitespace-pre-wrap">{m.message}</p>}
                              {renderAttachments(m.adminAttachments || m.attachments)}
                              <div className="flex items-center justify-end gap-1 mt-1">
                                <p className="text-[10px] text-gray-500">{new Date(m.createdAt).toLocaleString()}</p>
                                {m.adminRead ? (
                                  <span className="flex items-center gap-0.5 text-[10px] text-indigo-400/60" title="Read by customer">
                                    <CheckCheck size={11} /> Read
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-0.5 text-[10px] text-gray-600" title="Not yet read by customer">
                                    <Check size={11} /> Sent
                                  </span>
                                )}
                              </div>
                            </div>
                            <Avatar
                              name={m.adminName || currentUser?.name || "Staff"}
                              size={24}
                              bgColor="var(--adm-accent)"
                              textColor="white"
                              className="mb-1"
                            />
                          </div>
                        </div>
                      )
                    }
                    return (
                      <div key={m.id || i} className="flex justify-start mb-2">
                        <div className="flex items-end gap-2 max-w-[85%]">
                          <Avatar
                            name={avatar.type === "initial" ? avatar.letter : m.name}
                            size={24}
                            className="mb-1"
                          />
                          <div className="text-gray-200 text-sm px-4 py-3 rounded-xl rounded-bl-sm" style={{ backgroundColor: "var(--adm-input)" }}>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[10px] text-indigo-400/80">{m.name || "Customer"}</span>
                            </div>
                            {m.message && <p className="leading-relaxed whitespace-pre-wrap adm-text-primary">{m.message}</p>}
                            {renderAttachments(m.attachments)}
                            <p className="text-[10px] text-gray-500 mt-1">{new Date(m.createdAt).toLocaleString()}</p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
              </div>

              <div className="p-4 border-t" style={{ borderColor: "var(--adm-border)" }}>
                <textarea value={replyText} onChange={e => setReplyText(e.target.value)} rows={2} placeholder="Type your reply..."
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (replyText.trim() && !sending) sendReply() } }}
                  className="w-full px-4 py-3 rounded-xl border text-sm placeholder:text-gray-500 focus:outline-none focus:border-indigo-500/50 resize-none adm-text-primary"
                  style={{ backgroundColor: "var(--adm-input)", borderColor: "var(--adm-input-border)" }} />
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-2">
                    <div className="relative" ref={emojiPickerRef}>
                      <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="p-1.5 text-gray-500 hover:text-indigo-400 transition-colors" title="Emoji">
                        <Smile size={16} />
                      </button>
                      {showEmojiPicker && (
                        <div className="absolute bottom-full left-0 mb-2 w-64 border rounded-lg shadow-xl z-20 p-2 grid grid-cols-8 gap-1" style={{ backgroundColor: "var(--adm-card)", borderColor: "var(--adm-border)" }}>
                          {EMOJI_LIST.map((emoji, idx) => (
                            <button key={idx} onClick={() => insertEmoji(emoji)} className="w-7 h-7 flex items-center justify-center text-lg rounded transition-colors adm-hover-bg">
                              {emoji}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <button onClick={() => imgRef.current?.click()} className="p-1.5 text-gray-500 hover:text-indigo-400 transition-colors" title="Attach image"><ImageIcon size={16} /></button>
                    <button onClick={() => fileRef.current?.click()} className="p-1.5 text-gray-500 hover:text-indigo-400 transition-colors" title="Attach file"><Paperclip size={16} /></button>
                    <input ref={imgRef} type="file" accept="image/*" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if(!f)return; const fd=new FormData();fd.append("file",f); const r=await fetch("/api/upload",{method:"POST",credentials:'include',body:fd}); if(r.ok)setReplyFile(await r.json()); e.target.value="" }} />
                    <input ref={fileRef} type="file" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if(!f)return; const fd=new FormData();fd.append("file",f); const r=await fetch("/api/upload",{method:"POST",credentials:'include',body:fd}); if(r.ok)setReplyFile(await r.json()); e.target.value="" }} />
                    {replyFile && <span className="text-[10px] text-indigo-400">{replyFile.name || "File attached"}</span>}
                  </div>
                  <span className="text-xs text-gray-500">Press Send to reply</span>
                  <button onClick={sendReply} disabled={sending || !replyText.trim()}
                    className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-white text-sm font-medium disabled:opacity-50 transition-colors"
                    style={{ backgroundColor: "var(--adm-accent)" }}>
                    {sending ? "Sending..." : replySent ? <><Check size={15} /> Sent</> : <><Send size={15} /> Send Reply</>}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border p-12 text-center h-full flex items-center justify-center" style={{ backgroundColor: "var(--adm-card)", borderColor: "var(--adm-border)" }}>
              <div><MessageSquare size={48} className="mx-auto text-gray-600 mb-4" /><p className="text-gray-400 text-sm">Select a conversation to view messages</p></div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function InternalChat() {
  const [conversations, setConversations] = useState<any[]>([])
  const [staffList, setStaffList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedStaff, setSelectedStaff] = useState<any>(null)
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null)
  const [chatMessages, setChatMessages] = useState<any[]>([])
  const [messageText, setMessageText] = useState("")
  const [sending, setSending] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [showNewChat, setShowNewChat] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const emojiPickerRef = useRef<HTMLDivElement>(null)
  const [orderRef, setOrderRef] = useState<any>(null)
  const [showOrderPicker, setShowOrderPicker] = useState(false)
  const [orders, setOrders] = useState<any[]>([])
  const [orderSearch, setOrderSearch] = useState("")

  const loadConversations = () => {
    fetch("/api/internal-chat?_t=" + Date.now(), { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.conversations) {
          setConversations(d.conversations)
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  const loadStaff = () => {
    fetch("/api/internal-chat?action=staff", { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.staff) {
          setStaffList(d.staff)
        }
      })
      .catch(() => {})
  }

  const loadOrders = () => {
    fetch("/api/orders?_t=" + Date.now(), { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (Array.isArray(d)) {
          setOrders(d)
        }
      })
      .catch(() => {})
  }

  useEffect(() => {
    loadConversations()
    loadStaff()
    loadOrders()
    const iv = setInterval(loadConversations, 10000)
    return () => clearInterval(iv)
  }, [])

  useEffect(() => {
    fetch("/api/auth/check", { credentials: 'include' }).then(r => r.ok ? r.json() : null).then(d => {
      if (d?.user) setCurrentUser(d.user)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (!selectedStaff) return
    const timer = setTimeout(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollTop = messagesEndRef.current.scrollHeight
      }
    }, 50)
    return () => clearTimeout(timer)
  }, [chatMessages, selectedStaff])

  const openChatWithStaff = async (staff: any) => {
    setSelectedStaff(staff)
    setShowNewChat(false)
    setSearchQuery("")
    setOrderRef(null)

    const res = await fetch(`/api/internal-chat?action=messages_with&staffId=${staff.id}`, { credentials: 'include' })
    if (res.ok) {
      const data = await res.json()
      setChatMessages(data.messages || [])
      setSelectedConvId(data.conversationId)

      if (data.messages?.filter((m: any) => m.toStaffId === currentUser?.id && !m.read).length > 0) {
        fetch("/api/internal-chat", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: 'include',
          body: JSON.stringify({ action: "mark_read", conversationId: data.conversationId })
        })
        loadConversations()
      }
    }
  }

  const insertEmoji = (emoji: string) => {
    setMessageText(prev => prev + emoji)
    setShowEmojiPicker(false)
  }

  const sendMessage = async () => {
    if (!messageText.trim() || !selectedStaff) return
    if (selectedStaff.id === currentUser?.id) {
      alert("Cannot send message to yourself")
      return
    }
    setSending(true)

    const body: any = {
      toStaffId: selectedStaff.id,
      message: messageText,
    }
    if (orderRef) {
      body.orderRef = orderRef
    }

    try {
      const res = await fetch("/api/internal-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: 'include',
        body: JSON.stringify(body)
      })

      if (res.ok) {
        const sentMsg = await res.json().catch(() => null)
        setMessageText("")
        setOrderRef(null)
        // 立即将新消息添加到本地状态
        if (sentMsg && sentMsg.id) {
          setChatMessages((prev: any[]) => [...prev, sentMsg])
        }
        // 重新拉取以确保同步
        const updated = await fetch(`/api/internal-chat?action=messages_with&staffId=${selectedStaff.id}`, { credentials: 'include' })
        if (updated.ok) {
          const data = await updated.json()
          setChatMessages(data.messages || [])
          setSelectedConvId(data.conversationId)
        }
        loadConversations()
      } else {
        const errData = await res.json().catch(() => ({}))
        console.error("Send message error:", errData)
        alert("Failed to send message: " + (errData.error || res.statusText))
      }
    } catch (e: any) {
      console.error("Send message exception:", e)
      alert("Network error: " + (e?.message || 'Unknown error'))
    }
    setSending(false)
  }

  const filteredStaff = staffList.filter((s: any) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return s.name?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q)
  })

  const totalUnread = conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0)

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" style={{ height: "calc(100vh - 280px)" }}>
      <div className="lg:col-span-1 min-h-0 flex flex-col rounded-xl border" style={{ backgroundColor: "var(--adm-card)", borderColor: "var(--adm-border)" }}>
        <div className="p-3 border-b" style={{ borderColor: "var(--adm-border)" }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold adm-text-primary">
              Conversations
              {totalUnread > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs rounded-full" style={{ backgroundColor: "var(--adm-accent)", color: "white" }}>
                  {totalUnread}
                </span>
              )}
            </h3>
            <button
              type="button"
              onClick={() => setShowNewChat(!showNewChat)}
              className="p-1.5 rounded-lg transition-colors adm-hover-bg"
              style={{ color: "var(--adm-accent)" }}
              title="New Chat"
            >
              {showNewChat ? <X size={18} /> : <Plus size={18} />}
            </button>
          </div>

          {showNewChat && (
            <div className="mb-3">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search staff..."
                  className="w-full pl-9 pr-3 py-2 rounded-lg border text-sm focus:outline-none focus:border-indigo-500/50 adm-text-primary"
                  style={{ backgroundColor: "var(--adm-input)", borderColor: "var(--adm-input-border)" }}
                />
              </div>
              <div className="mt-2 max-h-48 overflow-y-auto space-y-1">
                {filteredStaff.length === 0 ? (
                  <p className="text-xs text-gray-500 text-center py-4">No staff found</p>
                ) : filteredStaff.map((staff: any) => (
                  <div
                    key={staff.id}
                    onClick={() => openChatWithStaff(staff)}
                    className="flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors adm-hover-bg"
                  >
                    <Avatar name={staff.name} size={28} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium adm-text-primary truncate">{staff.name}</p>
                      <p className="text-[10px] text-gray-500 truncate">{staff.role}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {conversations.length === 0 ? (
            <div className="text-center py-8">
              <MessageCircle size={32} className="mx-auto text-gray-600 mb-2" />
              <p className="text-sm text-gray-500">No conversations yet</p>
              <p className="text-xs text-gray-600 mt-1">Click + to start a new chat</p>
            </div>
          ) : conversations.map((conv: any) => (
            <div
              key={conv.conversationId}
              onClick={() => openChatWithStaff(conv.otherStaff)}
              className={"p-3 rounded-xl border cursor-pointer transition-all adm-hover-bg " + (selectedConvId === conv.conversationId ? "border-indigo-500/50 bg-indigo-500/10" : "border-transparent")}
            >
              <div className="flex items-center gap-2">
                <Avatar name={conv.otherStaff?.name} size={24} />
                <p className="text-sm font-medium adm-text-primary truncate flex-1">{conv.otherStaff?.name || 'Unknown'}</p>
                {conv.unreadCount > 0 && (
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-[10px] font-bold uppercase" style={{ color: "var(--adm-accent)" }}>new</span>
                    <span className="w-5 h-5 flex items-center justify-center text-[10px] font-bold rounded-full text-white" style={{ backgroundColor: "var(--adm-accent)" }}>
                      {conv.unreadCount > 9 ? "9+" : conv.unreadCount}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="lg:col-span-2 min-h-0">
        {selectedStaff ? (
          <div className="rounded-xl border h-full flex flex-col" style={{ backgroundColor: "var(--adm-card)", borderColor: "var(--adm-border)" }}>
            <div className="p-5 border-b" style={{ borderColor: "var(--adm-border)" }}>
              <div className="flex items-center gap-3">
                <Avatar name={selectedStaff.name} size={32} />
                <div>
                  <h2 className="text-base font-semibold adm-text-primary">{selectedStaff.name}</h2>
                  <p className="text-xs text-gray-500">{selectedStaff.role} &middot; {selectedStaff.email}</p>
                </div>
              </div>
            </div>

            <div ref={messagesEndRef} className="flex-1 overflow-y-auto p-5 space-y-4">
              {selectedStaff.id === currentUser?.id && (
                <div className="mb-2 p-2 rounded-lg text-xs flex items-center gap-2" style={{ backgroundColor: "rgba(239, 68, 68, 0.1)", color: "rgb(239, 68, 68)" }}>
                  <Info size={14} />
                  You cannot send messages to yourself
                </div>
              )}
              {chatMessages.length === 0 ? (
                <div className="text-center py-12">
                  <MessageCircle size={48} className="mx-auto text-gray-600 mb-4" />
                  <p className="text-gray-400 text-sm">No messages yet</p>
                  <p className="text-xs text-gray-500 mt-1">Say hello to start the conversation</p>
                </div>
              ) : chatMessages.map((m: any, i: number) => {
                const isMe = m.fromStaffId === currentUser?.id
                return (
                  <div key={m.id || i} className={`flex mb-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`flex items-end gap-2 max-w-[85%] ${isMe ? 'flex-row-reverse' : ''}`}>
                      {isMe ? (
                        <Avatar
                          name={m.fromName || currentUser?.name || "Me"}
                          size={24}
                          bgColor="var(--adm-accent)"
                          textColor="white"
                          className="mb-1"
                        />
                      ) : (
                        <Avatar
                          name={m.fromName || selectedStaff?.name}
                          size={24}
                          className="mb-1"
                        />
                      )}
                      <div
                        className={`text-sm px-4 py-3 rounded-xl ${isMe ? 'rounded-br-sm' : 'rounded-bl-sm'}`}
                        style={{
                          backgroundColor: isMe ? 'var(--adm-accent-bg)' : 'var(--adm-input)',
                          color: 'var(--adm-text-primary)',
                        }}
                      >
                        <div className={`flex items-center gap-2 mb-1 ${isMe ? 'justify-end' : ''}`}>
                          <span className="text-[10px]" style={{ color: 'var(--adm-accent)' }}>
                            {isMe ? (m.fromName || "You") : (m.fromName || selectedStaff.name)}
                          </span>
                        </div>
                        {m.orderRef && (() => {
                          const fullOrder = orders.find((o: any) => o.id === m.orderRef.id)
                          const ref = fullOrder
                            ? { ...m.orderRef, customerName: m.orderRef.customerName || fullOrder.customerName, email: m.orderRef.email || fullOrder.customerEmail, createdAt: m.orderRef.createdAt || fullOrder.createdAt, total: m.orderRef.total ?? fullOrder.total, status: m.orderRef.status || fullOrder.status }
                            : m.orderRef
                          return (
                          <a
                            href={`/admin/orders?order=${ref.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="mb-2 p-2 rounded-lg border block no-underline transition-colors adm-hover-bg"
                            style={{ borderColor: "var(--adm-border)", backgroundColor: "var(--adm-card)" }}
                          >
                            <div className="flex items-center gap-2">
                              <Package size={14} className="shrink-0" style={{ color: 'var(--adm-accent)' }} />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium truncate" style={{ color: 'var(--adm-accent)' }}>
                                  Order #{ref.orderNumber || ref.id}
                                </p>
                                <p className="text-[10px] adm-text-secondary">
                                  ${(ref.total || 0).toFixed(2)} &middot; {ref.status}
                                </p>
                                {(ref.customerName || ref.email) && (
                                  <p className="text-[10px] adm-text-secondary truncate">
                                    {ref.customerName || ref.email}
                                  </p>
                                )}
                                {ref.createdAt && (
                                  <p className="text-[10px] adm-text-secondary">
                                    {new Date(ref.createdAt).toLocaleString()}
                                  </p>
                                )}
                              </div>
                              <ExternalLink size={12} className="shrink-0 adm-text-secondary" />
                            </div>
                          </a>
                          )
                        })()}
                        {m.message && <p className="leading-relaxed whitespace-pre-wrap">{m.message}</p>}
                        <div className={`flex items-center gap-1 mt-1 ${isMe ? 'justify-end' : ''}`}>
                          <p className="text-[10px] adm-text-secondary">{new Date(m.createdAt).toLocaleString()}</p>
                          {isMe && (
                            m.read ? (
                              <span className="flex items-center gap-0.5 text-[10px]" style={{ color: 'var(--adm-accent)' }}>
                                <CheckCheck size={11} /> Read
                              </span>
                            ) : (
                              <span className="flex items-center gap-0.5 text-[10px] adm-text-secondary">
                                <Check size={11} /> Sent
                              </span>
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {orderRef && (
              <div className="px-4 pt-3">
                <div className="flex items-center justify-between p-2 rounded-lg border" style={{ borderColor: "var(--adm-border)", backgroundColor: "var(--adm-input)" }}>
                  <div className="flex items-center gap-2 min-w-0">
                    <Package size={14} className="shrink-0" style={{ color: 'var(--adm-accent)' }} />
                    <div className="min-w-0">
                      <p className="text-xs font-medium" style={{ color: 'var(--adm-accent)' }}>Order #{orderRef.orderNumber || orderRef.id}</p>
                      <p className="text-[10px] adm-text-secondary">
                        ${(orderRef.total || 0).toFixed(2)} &middot; {orderRef.status}
                        {(orderRef.customerName || orderRef.email) && ` · ${orderRef.customerName || orderRef.email}`}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOrderRef(null)}
                    className="p-1 rounded transition-colors adm-hover-bg shrink-0"
                  >
                    <X size={14} className="adm-text-secondary" />
                  </button>
                </div>
              </div>
            )}

            <div className="p-4 border-t" style={{ borderColor: "var(--adm-border)" }}>
              <textarea
                value={messageText}
                onChange={e => setMessageText(e.target.value)}
                rows={2}
                placeholder="Type a message..."
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    if (messageText.trim() && !sending) sendMessage()
                  }
                }}
                className="w-full px-4 py-3 rounded-xl border text-sm placeholder:text-gray-500 focus:outline-none focus:border-indigo-500/50 resize-none adm-text-primary"
                style={{ backgroundColor: "var(--adm-input)", borderColor: "var(--adm-input-border)" }}
              />
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-2">
                  <div className="relative" ref={emojiPickerRef}>
                    <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="p-1.5 text-gray-500 hover:text-indigo-400 transition-colors" title="Emoji">
                      <Smile size={16} />
                    </button>
                    {showEmojiPicker && (
                      <div className="absolute bottom-full left-0 mb-2 w-64 border rounded-lg shadow-xl z-20 p-2 grid grid-cols-8 gap-1" style={{ backgroundColor: "var(--adm-card)", borderColor: "var(--adm-border)" }}>
                        {EMOJI_LIST.map((emoji, idx) => (
                          <button key={idx} onClick={() => insertEmoji(emoji)} className="w-7 h-7 flex items-center justify-center text-lg rounded transition-colors adm-hover-bg">
                            {emoji}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="relative">
                    <button onClick={() => setShowOrderPicker(!showOrderPicker)} className="p-1.5 text-gray-500 hover:text-indigo-400 transition-colors flex items-center gap-1" title="Reference order">
                      <Package size={16} />
                      <span className="text-xs">Order</span>
                    </button>
                    {showOrderPicker && (
                      <div className="absolute bottom-full left-0 mb-2 w-80 border rounded-lg shadow-xl z-20" style={{ backgroundColor: "var(--adm-card)", borderColor: "var(--adm-border)" }}>
                        <div className="p-2 border-b" style={{ borderColor: "var(--adm-border)" }}>
                          <div className="relative">
                            <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500" />
                            <input
                              type="text"
                              value={orderSearch}
                              onChange={e => setOrderSearch(e.target.value)}
                              placeholder="Search orders..."
                              className="w-full pl-7 pr-2 py-1.5 rounded border text-xs focus:outline-none adm-text-primary"
                              style={{ backgroundColor: "var(--adm-input)", borderColor: "var(--adm-input-border)" }}
                            />
                          </div>
                        </div>
                        <div className="max-h-64 overflow-y-auto p-1">
                          {orders.length === 0 ? (
                            <p className="text-xs text-gray-500 text-center py-4">No orders found</p>
                          ) : (
                            orders
                              .filter((o: any) => {
                                if (!orderSearch.trim()) return true
                                const q = orderSearch.toLowerCase()
                                return o.id?.toLowerCase().includes(q) || o.orderNumber?.toLowerCase().includes(q) || o.email?.toLowerCase().includes(q)
                              })
                              .slice(0, 20)
                              .map((o: any) => (
                                <div
                                  key={o.id}
                                  onClick={() => {
                                    setOrderRef({
                                      id: o.id,
                                      orderNumber: o.orderNumber || o.id,
                                      total: o.total,
                                      status: o.status,
                                      email: o.customerEmail || o.email || '',
                                      customerName: o.customerName || '',
                                      createdAt: o.createdAt || '',
                                    })
                                    setShowOrderPicker(false)
                                    setOrderSearch("")
                                  }}
                                  className="p-2 rounded cursor-pointer transition-colors adm-hover-bg"
                                >
                                  <div className="flex items-center justify-between">
                                    <p className="text-xs font-medium adm-text-primary truncate">
                                      Order #{o.orderNumber || o.id}
                                    </p>
                                    <span className="text-xs font-bold" style={{ color: "var(--adm-accent)" }}>
                                      ${(o.total || 0).toFixed(2)}
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-gray-500 truncate">
                                    {o.email} &middot; {o.status}
                                  </p>
                                </div>
                              ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <span className="text-xs text-gray-500">Enter to send</span>
                <button
                  onClick={sendMessage}
                  disabled={sending || !messageText.trim() || selectedStaff?.id === currentUser?.id}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-white text-sm font-medium disabled:opacity-50 transition-colors"
                  style={{ backgroundColor: "var(--adm-accent)" }}
                >
                  {sending ? "Sending..." : <><Send size={15} /> Send</>}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border p-12 text-center h-full flex items-center justify-center" style={{ backgroundColor: "var(--adm-card)", borderColor: "var(--adm-border)" }}>
            <div>
              <Users size={48} className="mx-auto text-gray-600 mb-4" />
              <p className="text-gray-400 text-sm">Select a conversation or start a new chat</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

