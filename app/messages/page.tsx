"use client"
import { useState, useEffect, useRef, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { MessageCircle, Send, Image as ImageIcon, Link as LinkIcon, Paperclip, ExternalLink, User, Bot, ArrowLeft, ShoppingBag, Smile, X, Search, Check, CheckCheck } from "lucide-react"

const EMOJI_CATEGORIES = [
  {
    name: "Smileys",
    emojis: ["😀", "😃", "😄", "😁", "😅", "😂", "🤣", "😊", "😇", "🙂", "😉", "😌", "😍", "🥰", "😘", "😗", "😙", "😚", "😋", "😛", "😜", "🤪", "😝", "🤑", "🤗", "🤭", "🤫", "🤔", "🤐", "🤨", "😐", "😑", "😶", "😏", "😒", "🙄", "😬", "🤥", "😔", "😪", "🤤", "😴", "😷", "🤒", "🤕", "🤢", "🤮", "🤧", "🥵", "🥶", "🥴", "😵", "🤯", "🤠", "🥳", "😎", "🤓", "🧐", "😕", "😟", "🙁", "☹️", "😮", "😯", "😲", "😳", "🥺", "😦", "😧", "😨", "😰", "😥", "😢", "😭", "😱", "😖", "😣", "😞", "😓", "😩", "😫", "🥱", "😤", "😡", "😠", "🤬", "😈", "👿", "💀", "☠️", "💩", "🤡", "👹", "👺", "👻", "👽", "👾", "🤖", "🎃"]
  },
  {
    name: "Gestures",
    emojis: ["👍", "👎", "👌", "🤌", "🤏", "✌️", "🤞", "🤟", "🤘", "🤙", "👈", "👉", "👆", "🖕", "👇", "☝️", "👏", "🙌", "👐", "🤲", "🤝", "🙏", "✍️", "💪", "🦾", "🦿", "🦵", "🦶", "👂", "🦻", "👃", "🧠", "🦷", "🦴", "👀", "👁️", "👅", "👄", "💋", "🩸", "💔", "❤️", "🧡", "💛", "💚", "💙", "💜", "🤎", "🖤", "🤍"]
  },
  {
    name: "Objects",
    emojis: ["💯", "💢", "💥", "💫", "💦", "💨", "🕳️", "💣", "💬", "👁️‍🗨️", "🗯️", "💭", "💤", "🎉", "🎊", "🎈", "🎁", "🎀", "🎗️", "🎟️", "🎫", "🎖️", "🏆", "🏅", "🥇", "🥈", "🥉", "⚽", "🏀", "🏈", "⚾", "🥎", "🎾", "🏐", "🏉", "🥏", "🎱", "🪀", "🏓", "🏸", "🏒", "🏑", "🥍", "🏏", "🪃", "🥅", "⛳", "🪁", "🏹", "🎣", "🤿", "🥊", "🥋", "🎽", "🛹", "🛼", "🛷", "⛸️", "🥌", "🎿", "⛷️", "🏂", "🪂"]
  },
]

function Avatar({ src, name, size = 24, className = "", fallbackIcon = false, bgColor = "bg-otb-terracotta/20", textColor = "text-otb-terracotta" }: { src?: string; name?: string; size?: number; className?: string; fallbackIcon?: boolean; bgColor?: string; textColor?: string }) {
  const [error, setError] = useState(false)
  const letter = (name || "?")[0]?.toUpperCase() || "?"
  const showImage = src && !error
  return (
    <div className={`rounded-full overflow-hidden shrink-0 flex items-center justify-center font-bold ${showImage ? "" : bgColor + " " + textColor} ${className}`} style={{ width: size, height: size, fontSize: size * 0.4 }}>
      {showImage ? (
        <img src={src} alt="" className="w-full h-full object-cover" onError={() => setError(true)} />
      ) : fallbackIcon ? (
        <User size={size * 0.5} />
      ) : (
        <span>{letter}</span>
      )}
    </div>
  )
}

function MessagesPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [user, setUser] = useState<any>(null)
  const [msgs, setMsgs] = useState<any[]>([])
  const [text, setText] = useState("")
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showLinkInput, setShowLinkInput] = useState(false)
  const [linkUrl, setLinkUrl] = useState("")
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [emojiCategory, setEmojiCategory] = useState(0)
  const [showProductPicker, setShowProductPicker] = useState(false)
  const [productSearch, setProductSearch] = useState("")
  const [productList, setProductList] = useState<any[]>([])
  const [productSent, setProductSent] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const imgRef = useRef<HTMLInputElement>(null)
  const emojiPickerRef = useRef<HTMLDivElement>(null)
  const productPickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch("/api/auth/user").then(r => r.ok ? r.json() : Promise.reject()).then(d => { setUser(d.user); setLoading(false) }).catch(() => { router.push("/login"); setLoading(false) })
  }, [router])

  useEffect(() => {
    if (!user?.email) return
    const load = () => fetch("/api/messages?email=" + encodeURIComponent(user.email)).then(r => r.ok ? r.json() : []).then(d => {
      const sorted = Array.isArray(d) ? [...d].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) : []
      setMsgs(sorted)
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100)
      const hasUnreadAdmin = sorted.some(m => m.senderType === 'admin' && !m.adminRead)
      if (hasUnreadAdmin) {
        fetch("/api/messages", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ markAdminRead: true, email: user.email }) }).catch(() => {})
      }
    }).catch(() => {})
    load()
    const iv = setInterval(load, 15000)
    return () => clearInterval(iv)
  }, [user?.email])

  useEffect(() => {
    fetch("/api/products?limit=50&active=true").then(r => r.ok ? r.json() : { items: [] }).then(d => setProductList(d.items || d || [])).catch(() => {})
  }, [])

  useEffect(() => {
    const productId = searchParams?.get('product')
    if (!productId || productSent || !user?.email || productList.length === 0) return
    const product = productList.find((p: any) => p.id === productId)
    if (product) {
      const productAtt = {
        type: "product",
        productId: product.id,
        name: product.nameEn || product.name,
        price: product.price,
        image: product.image,
        url: `/products/${product.id}`,
        category: product.category,
      }
      fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: user.firstName + " " + user.lastName,
          email: user.email,
          message: "Hi, I'm interested in this product.",
          source: "inbox",
          attachments: [productAtt],
        }),
      }).then(() => {
        setProductSent(true)
        const load = () => fetch("/api/messages?email=" + encodeURIComponent(user.email)).then(r => r.ok ? r.json() : []).then(d => { 
          const sorted = Array.isArray(d) ? [...d].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) : []
          setMsgs(sorted)
        })
        load()
      }).catch(() => {})
    }
  }, [searchParams, productList, user?.email, productSent])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false)
      }
      if (productPickerRef.current && !productPickerRef.current.contains(e.target as Node)) {
        setShowProductPicker(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const sendMsg = async (content: string, extra: any = {}) => {
    if (!content.trim() && !extra.attachments) return
    setSending(true)
    try {
      await fetch("/api/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: user.firstName + " " + user.lastName, email: user.email, message: content, source: "inbox", avatar: user.avatar, ...extra }) })
      setText("")
      const load = () => fetch("/api/messages?email=" + encodeURIComponent(user.email)).then(r => r.ok ? r.json() : []).then(d => { 
        const sorted = Array.isArray(d) ? [...d].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) : []
        setMsgs(sorted)
      })
      load()
    } catch {}
    finally { setSending(false) }
  }

  const insertEmoji = (emoji: string) => {
    setText(prev => prev + emoji)
    setShowEmojiPicker(false)
  }

  const sendProduct = (product: any) => {
    const productAtt = {
      type: "product",
      productId: product.id,
      name: product.nameEn || product.name,
      price: product.price,
      image: product.image,
      url: `/products/${product.id}`,
      category: product.category,
    }
    sendMsg("", { attachments: [productAtt] })
    setShowProductPicker(false)
    setProductSearch("")
  }

  const handleAddLink = () => {
    if (!linkUrl.trim()) return
    const name = linkUrl.split("/").pop()?.replace(/-/g, " ") || "Product"
    sendMsg("", { attachments: [{ type: "product_link", url: linkUrl, name }] })
    setLinkUrl(""); setShowLinkInput(false)
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: "image" | "file") => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) return alert("File too large (max 5MB)")
    const fd = new FormData(); fd.append("file", file)
    const res = await fetch("/api/upload", { method: "POST", body: fd })
    if (res.ok) { const d = await res.json(); sendMsg("", { attachments: [{ type, url: d.url, name: file.name }] }) }
    e.target.value = ""
  }

  const filteredProducts = productList.filter((p: any) => {
    if (!productSearch.trim()) return true
    const q = productSearch.toLowerCase()
    return (p.nameEn || p.name || '').toLowerCase().includes(q) || (p.category || '').toLowerCase().includes(q)
  }).slice(0, 12)

  if (loading) return <div className="min-h-[80vh] flex items-center justify-center"><div className="w-8 h-8 border-2 border-otb-terracotta border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10">
      <div className="flex items-center gap-3 mb-6">
        <MessageCircle size={22} className="text-otb-terracotta" />
        <h1 className="font-serif text-2xl md:text-3xl text-otb-ink">My Messages</h1>
        {msgs.filter(m => m.senderType === 'admin').length > 0 && <span className="bg-green-500 text-white text-[10px] px-2 py-0.5 rounded-full font-sans">{msgs.filter(m => m.senderType === 'admin').length} replies</span>}
      </div>

      <div className="bg-white/70 border border-otb-sand/50 rounded-sm overflow-hidden" style={{ height: "calc(100vh - 240px)", minHeight: "400px" }}>
        {msgs.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center p-8">
              <MessageCircle size={48} className="mx-auto text-otb-ink/10 mb-4" />
              <h2 className="font-serif text-lg text-otb-ink mb-1">No messages yet</h2>
              <p className="font-sans text-sm text-otb-ink/40 mb-6">Send us a message and we will get back to you.</p>
              <div className="flex items-center gap-2 max-w-md mx-auto">
                <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === "Enter" && sendMsg(text)} placeholder="Type your message..." className="flex-1 px-4 py-2.5 border border-otb-sand/50 rounded-sm bg-white text-sm font-sans focus:outline-none focus:border-otb-terracotta/50" />
                <button onClick={() => sendMsg(text)} disabled={sending || !text.trim()} className="px-4 py-2.5 bg-otb-terracotta text-white text-sm font-serif rounded-sm hover:bg-otb-terracotta/90 disabled:opacity-50 transition-colors"><Send size={14} /></button>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col">
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
              {msgs.map((m, i) => {
                const isAdmin = m.senderType === 'admin'
                if (isAdmin) {
                  return (
                    <div key={m.id || i} className="flex justify-start mb-2">
                      <div className="flex items-end gap-2 max-w-[80%]">
                        <Avatar
                          src={m.adminAvatar || undefined}
                          name={m.adminName || "Staff"}
                          size={28}
                          className="mb-1"
                        />
                        <div className="bg-gray-100 text-otb-ink text-sm px-4 py-3 rounded-xl rounded-bl-sm">
                          <div className="flex items-center gap-1.5 mb-1"><Bot size={12} className="text-otb-terracotta" /><span className="text-[10px] text-otb-terracotta/70 font-medium">{m.adminName || "Customer Service"}</span></div>
                          {m.message && <p className="leading-relaxed whitespace-pre-wrap">{m.message}</p>}
                          {(m.adminAttachments || m.attachments)?.map((a: any, ai: number) => {
                            if (a.type === "product" || a.type === "product_card") {
                              return (
                                <Link key={ai} href={a.url || `/products/${a.productId}`} className="block mt-2 rounded-lg overflow-hidden border border-otb-sand/40 bg-white/80 hover:shadow-md transition-shadow">
                                  <div className="flex gap-2 p-2">
                                    {a.image && <div className="w-14 h-14 rounded shrink-0 overflow-hidden bg-otb-sand/20"><img src={a.image} alt={a.name} className="w-full h-full object-cover" /></div>}
                                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                                      <div>
                                        <p className="text-xs font-medium text-otb-ink truncate">{a.name}</p>
                                        {a.category && <p className="text-[10px] text-otb-ink/50 mt-0.5">{a.category}</p>}
                                      </div>
                                      <div className="flex items-center justify-between">
                                        <span className="text-sm font-serif font-bold text-otb-terracotta">${(a.price || 0).toFixed(2)}</span>
                                        <span className="text-[10px] text-otb-terracotta flex items-center gap-0.5"><ShoppingBag size={10} /> View</span>
                                      </div>
                                    </div>
                                  </div>
                                </Link>
                              )
                            }
                            if (a.type === "image") return <img key={ai} src={a.url} alt={a.name || ""} className="max-w-[200px] rounded-lg mt-1.5 border border-otb-sand/30" />
                            return <a key={ai} href={a.url} download className="flex items-center gap-2 bg-otb-sand/20 rounded-lg p-2 mt-1.5 text-xs text-otb-ink/60 hover:text-otb-terracotta transition-colors"><Paperclip size={12} />{a.name || "File"}</a>
                          })}
                          <div className="flex items-center gap-1 mt-1">
                            <p className="text-[10px] text-otb-ink/30">{new Date(m.createdAt).toLocaleString()}</p>
                            {m.adminRead ? (
                              <span className="flex items-center gap-0.5 text-[10px] text-green-500" title="You've read this">
                                <CheckCheck size={11} />
                              </span>
                            ) : (
                              <span className="flex items-center gap-0.5 text-[10px] text-otb-ink/20" title="Unread">
                                <Check size={11} />
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                }
                return (
                  <div key={m.id || i} className="flex justify-end mb-2">
                    <div className="flex items-end gap-2 max-w-[80%]">
                      <div className="bg-otb-terracotta text-white text-sm px-4 py-3 rounded-xl rounded-br-sm">
                        {m.message && <p className="leading-relaxed">{m.message}</p>}
                        {m.attachments?.map((a: any, ai: number) => {
                          if (a.type === "product" || a.type === "product_card") {
                            return (
                              <Link key={ai} href={a.url || `/products/${a.productId}`} className="block mt-2 rounded-lg overflow-hidden border border-white/20 bg-white/10 hover:bg-white/20 transition-colors">
                                <div className="flex gap-2 p-2">
                                  {a.image && <div className="w-14 h-14 rounded shrink-0 overflow-hidden bg-white/20"><img src={a.image} alt={a.name} className="w-full h-full object-cover" /></div>}
                                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                                    <div>
                                      <p className="text-xs font-medium text-white truncate">{a.name}</p>
                                      {a.category && <p className="text-[10px] text-white/60 mt-0.5">{a.category}</p>}
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <span className="text-sm font-serif font-bold text-white">${(a.price || 0).toFixed(2)}</span>
                                      <span className="text-[10px] text-white/80 flex items-center gap-0.5"><ShoppingBag size={10} /> View</span>
                                    </div>
                                  </div>
                                </div>
                              </Link>
                            )
                          }
                          if (a.type === "product_link") {
                            return <Link key={ai} href={a.url} className="flex items-center gap-2 bg-white/10 rounded-lg p-2 mt-1.5 text-xs hover:bg-white/20 transition-colors"><ShoppingBag size={12} className="text-white shrink-0" /><span className="text-white truncate">{a.name || a.url}</span><ExternalLink size={10} className="text-white/50 shrink-0" /></Link>
                          }
                          if (a.type === "image") {
                            return <img key={ai} src={a.url} alt={a.name || ""} className="max-w-[200px] rounded-lg mt-1.5 border border-white/20" />
                          }
                          return <a key={ai} href={a.url} download className="flex items-center gap-2 bg-white/10 rounded-lg p-2 mt-1.5 text-xs text-white/80 hover:text-white transition-colors"><Paperclip size={12} />{a.name || "File"}</a>
                        })}
                        <div className="flex items-center justify-end gap-1 mt-1">
                          <p className="text-[10px] text-white/50">{new Date(m.createdAt).toLocaleTimeString()}</p>
                          {m.read ? (
                            <span className="flex items-center gap-0.5 text-[10px] text-white/60" title="Read by admin">
                              <CheckCheck size={11} />
                            </span>
                          ) : (
                            <span className="flex items-center gap-0.5 text-[10px] text-white/40" title="Not yet read by admin">
                              <Check size={11} />
                            </span>
                          )}
                        </div>
                      </div>
                      <Avatar
                        src={m.avatar || user?.avatar || undefined}
                        name={m.name || user?.firstName || user?.name || ""}
                        size={28}
                        bgColor="bg-otb-sand/30"
                        textColor="text-otb-ink/40"
                        className="mb-1"
                      />
                    </div>
                  </div>
                )
              })}
              <div ref={bottomRef} />
            </div>
            <div className="border-t border-otb-sand/30 p-3 md:p-4">
              {showLinkInput && (
                <div className="flex items-center gap-2 mb-2 bg-otb-sand/10 p-2 rounded-sm">
                  <LinkIcon size={12} className="text-otb-ink/30 shrink-0" />
                  <input value={linkUrl} onChange={e => setLinkUrl(e.target.value)} placeholder="Paste product URL..." className="flex-1 px-2 py-1.5 text-sm bg-white border border-otb-sand/50 rounded-sm font-sans focus:outline-none focus:border-otb-terracotta/50" />
                  <button onClick={handleAddLink} className="px-3 py-1.5 bg-otb-terracotta text-white text-xs font-serif rounded-sm hover:bg-otb-terracotta/90">Add</button>
                  <button onClick={() => setShowLinkInput(false)} className="px-2 py-1.5 text-xs text-otb-ink/40 hover:text-otb-ink">Cancel</button>
                </div>
              )}
              <div className="flex items-center gap-2 relative">
                <div className="relative" ref={emojiPickerRef}>
                  <button onClick={() => { setShowEmojiPicker(!showEmojiPicker); setShowProductPicker(false); }} className="p-2 text-otb-ink/30 hover:text-otb-terracotta transition-colors" title="Emoji">
                    <Smile size={16} />
                  </button>
                  {showEmojiPicker && (
                    <div className="absolute bottom-full left-0 mb-2 w-72 bg-white border border-otb-sand/50 rounded-lg shadow-xl z-20 overflow-hidden">
                      <div className="flex border-b border-otb-sand/30">
                        {EMOJI_CATEGORIES.map((cat, idx) => (
                          <button key={cat.name} onClick={() => setEmojiCategory(idx)} className={`flex-1 py-1.5 text-[10px] transition-colors ${emojiCategory === idx ? 'bg-otb-terracotta/10 text-otb-terracotta' : 'text-otb-ink/50 hover:bg-otb-sand/20'}`}>
                            {cat.name}
                          </button>
                        ))}
                      </div>
                      <div className="p-2 max-h-48 overflow-y-auto grid grid-cols-8 gap-0.5">
                        {EMOJI_CATEGORIES[emojiCategory].emojis.map((emoji, idx) => (
                          <button key={idx} onClick={() => insertEmoji(emoji)} className="w-7 h-7 flex items-center justify-center text-lg hover:bg-otb-sand/20 rounded transition-colors">
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="relative" ref={productPickerRef}>
                  <button onClick={() => { setShowProductPicker(!showProductPicker); setShowEmojiPicker(false); }} className="p-2 text-otb-ink/30 hover:text-otb-terracotta transition-colors" title="Send product">
                    <ShoppingBag size={16} />
                  </button>
                  {showProductPicker && (
                    <div className="absolute bottom-full left-0 mb-2 w-80 bg-white border border-otb-sand/50 rounded-lg shadow-xl z-20 overflow-hidden">
                      <div className="p-2 border-b border-otb-sand/30">
                        <div className="relative">
                          <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-otb-ink/30" />
                          <input value={productSearch} onChange={e => setProductSearch(e.target.value)} placeholder="Search products..." className="w-full pl-6 pr-2 py-1.5 text-xs bg-otb-sand/10 border border-otb-sand/30 rounded font-sans focus:outline-none focus:border-otb-terracotta/50" />
                        </div>
                      </div>
                      <div className="max-h-64 overflow-y-auto">
                        {filteredProducts.length === 0 ? (
                          <div className="p-4 text-center text-xs text-otb-ink/40">No products found</div>
                        ) : (
                          filteredProducts.map((product: any) => (
                            <button key={product.id} onClick={() => sendProduct(product)} className="w-full flex items-center gap-2 p-2 hover:bg-otb-sand/10 transition-colors text-left border-b border-otb-sand/20 last:border-b-0">
                              {product.image && <div className="w-10 h-10 rounded shrink-0 overflow-hidden bg-otb-sand/20"><img src={product.image} alt="" className="w-full h-full object-cover" /></div>}
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-otb-ink truncate">{product.nameEn || product.name}</p>
                                <p className="text-[10px] text-otb-terracotta font-serif">${(product.price || 0).toFixed(2)}</p>
                              </div>
                              <Send size={12} className="text-otb-terracotta shrink-0" />
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <button onClick={() => imgRef.current?.click()} className="p-2 text-otb-ink/30 hover:text-otb-terracotta transition-colors" title="Send image"><ImageIcon size={16} /></button>
                <button onClick={() => fileRef.current?.click()} className="p-2 text-otb-ink/30 hover:text-otb-terracotta transition-colors" title="Send file"><Paperclip size={16} /></button>
                <input ref={imgRef} type="file" accept="image/*" className="hidden" onChange={e => handleFileUpload(e, "image")} />
                <input ref={fileRef} type="file" className="hidden" onChange={e => handleFileUpload(e, "file")} />
                <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === "Enter" && sendMsg(text)} placeholder="Type a message..." className="flex-1 px-3 py-2 border border-otb-sand/50 rounded-sm bg-white text-sm font-sans focus:outline-none focus:border-otb-terracotta/50" />
                <button onClick={() => sendMsg(text)} disabled={sending} className="px-4 py-2 bg-otb-terracotta text-white text-sm font-serif rounded-sm hover:bg-otb-terracotta/90 disabled:opacity-50 transition-colors flex items-center gap-1.5">{sending ? "..." : <><Send size={14} /> Send</>}</button>
              </div>
            </div>
          </div>
        )}
      </div>
      <p className="text-xs font-sans text-otb-ink/30 mt-3 text-center">Messages are monitored during business hours. We typically respond within 24 hours.</p>
    </div>
  )
}

export default function MessagesPageWrapper() {
  return (
    <Suspense fallback={<div className="min-h-[80vh] flex items-center justify-center"><div className="w-8 h-8 border-2 border-otb-terracotta border-t-transparent rounded-full animate-spin" /></div>}>
      <MessagesPage />
    </Suspense>
  )
}
