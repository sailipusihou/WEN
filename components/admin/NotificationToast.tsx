"use client"
import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Package, MessageSquare, X, ChevronRight, ShoppingCart, User } from "lucide-react"
import { AnimatePresence, motion } from "framer-motion"

function Avatar({ src, name, size = 36, bgColor, textColor, className = "", fallbackIcon = false }: { src?: string; name?: string; size?: number; bgColor?: string; textColor?: string; className?: string; fallbackIcon?: boolean }) {
  const [error, setError] = useState(false)
  const letter = (name || "?")[0]?.toUpperCase() || "?"
  const showImage = src && !error
  return (
    <div
      className={`rounded-lg overflow-hidden shrink-0 flex items-center justify-center font-bold ${showImage ? "" : ""} ${className}`}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.4,
        backgroundColor: showImage ? "transparent" : (bgColor || "var(--adm-accent-bg)"),
        color: showImage ? "transparent" : (textColor || "var(--adm-accent)"),
      }}
    >
      {showImage ? (
        <img src={src} alt="" className="w-full h-full object-cover" onError={() => setError(true)} />
      ) : fallbackIcon ? (
        <User size={size * 0.55} />
      ) : (
        <span>{letter}</span>
      )}
    </div>
  )
}

export interface ToastNotification {
  id: string
  type: "order" | "message"
  title: string
  subtitle: string
  amount?: string
  avatar?: string
  registered?: boolean
  time: string
  link: string
  read: boolean
}

export default function NotificationToast() {
  const [toasts, setToasts] = useState<ToastNotification[]>([])
  const [settings, setSettings] = useState<any>(null)
  const seenOrdersRef = useRef<Set<string>>(new Set())
  const seenMessagesRef = useRef<Set<string>>(new Set())
  const seenInternalMsgsRef = useRef<Set<string>>(new Set())
  const router = useRouter()
  const pathname = usePathname()

  const duration = settings?.notifyDuration ?? 8

  useEffect(() => {
    fetch("/api/settings").then(r => r.ok && r.json()).then(d => setSettings(d)).catch(() => {})
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const addToast = useCallback((toast: Omit<ToastNotification, "time" | "read">) => {
    const id = toast.id
    setToasts(prev => {
      if (prev.find(t => t.id === id)) return prev
      const newToast: ToastNotification = {
        ...toast,
        time: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
        read: false,
      }
      const next = [newToast, ...prev].slice(0, 3)
      setTimeout(() => {
        setToasts(p => p.filter(t => t.id !== id))
      }, duration * 1000)
      return next
    })
  }, [duration])

  // 检测新订单
  useEffect(() => {
    if (pathname === "/admin/login") return
    if (settings && settings.notifyNewOrders === false) return
    let initialized = false

    const checkOrders = async () => {
      try {
        const res = await fetch("/api/orders?pageSize=20&page=1&_t=" + Date.now())
        if (!res.ok) return
        const data = await res.json()
        const items = data.items || data || []
        const pendingUnassigned = items.filter((o: any) => o.status === "pending" && !o.assignedTo)
        for (const order of pendingUnassigned) {
          if (!seenOrdersRef.current.has(order.id)) {
            if (initialized) {
              addToast({
                id: "order-" + order.id,
                type: "order",
                title: "New Order",
                subtitle: `${order.customerName || order.shipping?.firstName + " " + (order.shipping?.lastName || "") || "Guest"} · ${order.items?.length || 0} items`,
                amount: `$${(order.total || 0).toFixed(2)}`,
                link: "/admin/orders",
              })
            }
            seenOrdersRef.current.add(order.id)
          }
        }
        initialized = true
      } catch { /* ignore */ }
    }

    checkOrders()
    const iv = setInterval(checkOrders, 15000)
    return () => clearInterval(iv)
  }, [pathname, addToast, settings?.notifyNewOrders])

  // 检测新消息
  useEffect(() => {
    if (pathname === "/admin/login") return
    if (settings && settings.notifyNewMessages === false) return
    let initialized = false

    const checkMessages = async () => {
      try {
        const res = await fetch("/api/messages?_t=" + Date.now())
        if (!res.ok) return
        const data = await res.json()
        const all = Array.isArray(data) ? data : (data.items || [])
        const unreadCustomer = all.filter((m: any) => !m.read && m.senderType !== "admin")
        for (const msg of unreadCustomer) {
          const msgId = msg.id || msg.timestamp
          if (!seenMessagesRef.current.has(msgId)) {
            if (initialized) {
              // 查找该会话中最新的客户消息以获取正确的头像和名称
              const convCustomerMsgs = all.filter((m: any) => m.email === msg.email && m.senderType !== "admin")
              const latestCust = [...convCustomerMsgs].sort((a: any, b: any) =>
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
              )[0] || msg
              addToast({
                id: "msg-" + msgId,
                type: "message",
                title: latestCust.name || latestCust.customerName || msg.name || "New Message",
                subtitle: (msg.message || msg.content || "").slice(0, 60) + ((msg.message || msg.content || "").length > 60 ? "..." : ""),
                avatar: latestCust.avatar || "",
                registered: latestCust.registered || false,
                link: "/admin/messages",
              })
            }
            seenMessagesRef.current.add(msgId)
          }
        }
        initialized = true
      } catch { /* ignore */ }
    }

    checkMessages()
    const iv = setInterval(checkMessages, 10000)
    return () => clearInterval(iv)
  }, [pathname, addToast, settings?.notifyNewMessages])

  // 检测内部新消息
  useEffect(() => {
    if (pathname === "/admin/login") return
    if (settings && settings.notifyNewMessages === false) return
    let initialized = false

    const checkInternal = async () => {
      try {
        const res = await fetch("/api/internal-chat?_t=" + Date.now(), { credentials: "include" })
        if (!res.ok) return
        const data = await res.json()
        const convs = data.conversations || []
        for (const conv of convs) {
          if (conv.unreadCount > 0 && conv.latestMessage) {
            const msgId = conv.latestMessage.id || conv.latestMessage.timestamp
            if (!seenInternalMsgsRef.current.has(msgId)) {
              if (initialized) {
                const otherName = conv.otherStaff?.name || "Staff"
                addToast({
                  id: "internal-" + msgId,
                  type: "message",
                  title: otherName,
                  subtitle: (conv.latestMessage.message || conv.latestMessage.content || "").slice(0, 60) + ((conv.latestMessage.message || conv.latestMessage.content || "").length > 60 ? "..." : ""),
                  avatar: conv.otherStaff?.avatar || "",
                  link: "/admin/messages",
                })
              }
              seenInternalMsgsRef.current.add(msgId)
            }
          }
        }
        initialized = true
      } catch { /* ignore */ }
    }

    checkInternal()
    const iv = setInterval(checkInternal, 10000)
    return () => clearInterval(iv)
  }, [pathname, addToast, settings?.notifyNewMessages])

  const handleClick = (toast: ToastNotification) => {
    removeToast(toast.id)
    router.push(toast.link)
  }

  if (toasts.length === 0) return null

  return (
    <div className="fixed top-16 right-4 z-[100] space-y-2 w-80 pointer-events-none">
      <AnimatePresence>
        {toasts.map(toast => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 100, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="rounded-xl shadow-2xl overflow-hidden cursor-pointer pointer-events-auto"
            style={{ backgroundColor: "var(--adm-card)", border: `1px solid ${toast.type === "order" ? "var(--adm-accent)" : "var(--adm-border)"}` }}
            onClick={() => handleClick(toast)}
          >
            <div className="p-3 flex items-start gap-3">
              {/* 图标 */}
              <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{
                backgroundColor: toast.type === "order" ? "var(--adm-accent-bg)" : "var(--adm-accent-bg)",
              }}>
                {toast.type === "order" ? (
                  <ShoppingCart size={18} style={{ color: "var(--adm-accent)" }} />
                ) : (
                  <Avatar
                    src={toast.avatar || undefined}
                    name={toast.title || ""}
                    size={40}
                    bgColor="var(--adm-accent-bg)"
                    textColor="var(--adm-accent)"
                    fallbackIcon={!toast.registered}
                  />
                )}
              </div>

              {/* 内容 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold truncate" style={{ color: "var(--adm-text)" }}>{toast.title}</p>
                  <span className="text-[10px] shrink-0" style={{ color: "var(--adm-text-secondary)" }}>{toast.time}</span>
                </div>
                <p className="text-xs mt-0.5 truncate" style={{ color: "var(--adm-text-secondary)" }}>{toast.subtitle}</p>
                {toast.amount && (
                  <p className="text-xs font-bold mt-1" style={{ color: "var(--adm-accent)" }}>{toast.amount}</p>
                )}
              </div>

              {/* 关闭按钮 */}
              <button
                onClick={(e) => { e.stopPropagation(); removeToast(toast.id) }}
                className="p-1 rounded shrink-0 transition-colors hover:opacity-80"
                style={{ color: "var(--adm-text-secondary)" }}
              >
                <X size={14} />
              </button>
            </div>

            {/* 底部指示条 */}
            <div className="h-0.5 w-full" style={{ backgroundColor: toast.type === "order" ? "var(--adm-accent)" : "var(--adm-accent)" }} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
