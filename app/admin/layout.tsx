"use client"
import { useState, useEffect, useRef } from "react"
import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import { LayoutDashboard, Package, PlusCircle, List, ClipboardList, Star, BarChart3, MessageSquare, Wallet, Settings, Eye, LogOut, Menu, X, Store, Sun, Moon, Users, FileText, Shield, ChevronDown, ChevronsLeft, ChevronsRight, User as UserIcon, Factory, Boxes, Truck, Mail, Users as UsersIcon, Send, Check, Inbox, ShoppingBag, ExternalLink, Paperclip, Smile, CheckCheck, Bell, Search, Plus, Info, Layers, Columns, Bot, Clock, Palette, Image as ImageIcon, ToggleLeft, ToggleRight, BookOpen, Megaphone, Percent, Music2 } from "lucide-react"
import { AdminThemeProvider, useAdminTheme } from "@/context/AdminThemeContext"
import { canAccessNavItem } from "@/lib/permissions"
import ScrollProgress from "@/components/ScrollProgress"
import VoiceAgentButton from "@/components/admin/VoiceAgentButton"
import NotificationToast from "@/components/admin/NotificationToast"
import AdminLanguageToggle from "@/components/admin/AdminLanguageToggle"
import { AIAssistantWidget } from "@/components/AIAssistantWidget"
import { ErrorBoundary } from "@/components/ErrorBoundary"

const navItems: Array<{ href: string; icon: any; label: string; match: (p: string) => boolean }> = [
  { href: "/admin", icon: LayoutDashboard, label: "Dashboard", match: (p: string) => p === "/admin" },
  { href: "/admin/analytics", icon: BarChart3, label: "Analytics", match: (p: string) => p.startsWith("/admin/analytics") },
  { href: "/admin/products", icon: Package, label: "Products", match: (p: string) => p.startsWith("/admin/products") && p !== "/admin/products/new" },
  { href: "/admin/products/new", icon: PlusCircle, label: "Add Product", match: (p: string) => p === "/admin/products/new" },
  { href: "/admin/suppliers", icon: Factory, label: "Suppliers", match: (p: string) => p.startsWith("/admin/suppliers") },
  { href: "/admin/inventory", icon: Boxes, label: "Inventory", match: (p: string) => p.startsWith("/admin/inventory") },
  { href: "/admin/categories", icon: List, label: "Categories", match: (p: string) => p.startsWith("/admin/categories") },
  { href: "/admin/orders", icon: ClipboardList, label: "Orders", match: (p: string) => p.startsWith("/admin/orders") },
  { href: "/admin/shipping", icon: Truck, label: "Shipping", match: (p: string) => p.startsWith("/admin/shipping") },
  { href: "/admin/staff", icon: Shield, label: "Staff", match: (p: string) => p.startsWith("/admin/staff") },
  { href: "/admin/users", icon: Users, label: "Users", match: (p: string) => p.startsWith("/admin/users") },
  { href: "/admin/finance", icon: Wallet, label: "Finance", match: (p: string) => p.startsWith("/admin/finance") },
  { href: "/admin/messages", icon: MessageSquare, label: "Messages", match: (p: string) => p.startsWith("/admin/messages") },
  { href: "/admin/reviews", icon: Star, label: "Reviews", match: (p: string) => p.startsWith("/admin/reviews") },
  { href: "/admin/work-log", icon: FileText, label: "Work Log", match: (p: string) => p.startsWith("/admin/work-log") },
  { href: "/admin/knowledge-base", icon: BookOpen, label: "Knowledge Base", match: (p: string) => p.startsWith("/admin/knowledge-base") },
  { href: "/admin/marketing", icon: Megaphone, label: "Marketing", match: (p: string) => p.startsWith("/admin/marketing") },
  { href: "/admin/tiktok", icon: Music2, label: "TikTok", match: (p: string) => p.startsWith("/admin/tiktok") },
  { href: "/admin/promotions", icon: Percent, label: "Promotions", match: (p: string) => p.startsWith("/admin/promotions") },
  { href: "/admin/settings", icon: Settings, label: "Settings", match: (p: string) => p.startsWith("/admin/settings") },
]

function AdminContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [authed, setAuthed] = useState<boolean | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [internalUnreadCount, setInternalUnreadCount] = useState(0)
  const [newOrdersCount, setNewOrdersCount] = useState(0)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [siteSettings, setSiteSettings] = useState<any>(null)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [showMessagesPanel, setShowMessagesPanel] = useState(false)
  const [messagesPanelMode, setMessagesPanelMode] = useState<'overlay' | 'push'>('overlay')
  const [showAIAssistant, setShowAIAssistant] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const sidebarNavRef = useRef<HTMLElement | null>(null)
  const sidebarScrollTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const aiBtnRef = useRef<HTMLButtonElement | null>(null)
  const aiDragRef = useRef<{ startX: number; startY: number; origLeft: number; origTop: number } | null>(null)
  const aiDragMovedRef = useRef(false)
  const [aiBtnPos, setAiBtnPos] = useState<{ left: number; top: number } | null>(null)
  const { theme, toggle } = useAdminTheme()
  const isLoginPage = pathname === "/admin/login"

  // 恢复 AI 按钮上次拖拽位置
  useEffect(() => {
    try {
      const raw = localStorage.getItem('admin_ai_button_pos')
      if (raw) {
        const p = JSON.parse(raw)
        if (typeof p.left === 'number' && typeof p.top === 'number') {
          setAiBtnPos(p)
        }
      }
    } catch {}
  }, [])

  // 侧边栏滚动位置：保存 + 刷新后恢复（锁定在点击的功能列位置）
  useEffect(() => {
    try {
      const saved = parseFloat(localStorage.getItem('admin_sidebar_scroll') || '0')
      if (!saved || saved <= 0) return
      let raf = 0
      let lastHeight = -1
      let stableFrames = 0
      let applied = false
      const start = Date.now()
      const tick = () => {
        if (applied) return
        const el = sidebarNavRef.current
        if (el) {
          const h = el.scrollHeight
          if (h === lastHeight) stableFrames++
          else { stableFrames = 0; lastHeight = h }
          // 布局稳定（连续 3 帧高度不变）或超过 2.5s 上限后，一次性恢复
          if (stableFrames >= 3 || Date.now() - start > 2500) {
            applied = true
            el.scrollTop = Math.min(saved, h - el.clientHeight)
            return
          }
        }
        raf = requestAnimationFrame(tick)
      }
      const t = setTimeout(() => { raf = requestAnimationFrame(tick) }, 100)
      return () => { clearTimeout(t); cancelAnimationFrame(raf) }
    } catch {}
  }, [sidebarCollapsed, currentUser?.id, pathname])

  useEffect(() => {
    try {
      const saved = localStorage.getItem('admin_sidebar_collapsed')
      if (saved === '1') setSidebarCollapsed(true)
    } catch {}
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem('admin_sidebar_collapsed', sidebarCollapsed ? '1' : '0')
    } catch {}
  }, [sidebarCollapsed])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (isLoginPage) { setAuthed(true); return }
    fetch("/api/auth/check?_t=" + Date.now())
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.ok) { setAuthed(true); if (d?.user) setCurrentUser(d.user) }
        else { router.push("/admin/login") }
      })
      .catch(() => router.push("/admin/login"))
  }, [pathname, isLoginPage, router])

  useEffect(() => {
    if (!authed || currentUser || isLoginPage) return
    fetch("/api/auth/check?_t=" + Date.now())
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.user) setCurrentUser(d.user) })
      .catch(() => {})
  }, [authed])

  useEffect(() => {
    if (!authed || isLoginPage) return
    fetch("/api/settings?_t=" + Date.now())
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setSiteSettings(d) })
      .catch(() => {})
  }, [authed, isLoginPage])

  // 设置页保存后：重新拉取设置并一起应用所有显示效果
  useEffect(() => {
    const refetch = () => {
      fetch("/api/settings?_t=" + Date.now())
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (d) setSiteSettings(d) })
        .catch(() => {})
    }
    window.addEventListener('admin-settings-saved', refetch)
    return () => window.removeEventListener('admin-settings-saved', refetch)
  }, [])

  useEffect(() => {
    const style = siteSettings?.adminPanelStyle || "solid"
    if (style === "solid") {
      document.documentElement.removeAttribute('data-admin-panel-style')
    } else {
      document.documentElement.setAttribute('data-admin-panel-style', style)
    }
  }, [siteSettings?.adminPanelStyle])

  useEffect(() => {
    if (siteSettings?.glassLayered) {
      document.documentElement.setAttribute('data-glass-layered', 'true')
    } else {
      document.documentElement.removeAttribute('data-glass-layered')
    }
  }, [siteSettings?.glassLayered])

  useEffect(() => {
    if (siteSettings?.glassSidebar) document.documentElement.setAttribute('data-glass-sidebar', 'true')
    else document.documentElement.removeAttribute('data-glass-sidebar')
    if (siteSettings?.glassTopbar) document.documentElement.setAttribute('data-glass-topbar', 'true')
    else document.documentElement.removeAttribute('data-glass-topbar')
    if (siteSettings?.glassMenus) document.documentElement.setAttribute('data-glass-menus', 'true')
    else document.documentElement.removeAttribute('data-glass-menus')
    if (siteSettings?.glassLists) document.documentElement.setAttribute('data-glass-lists', 'true')
    else document.documentElement.removeAttribute('data-glass-lists')
  }, [siteSettings?.glassSidebar, siteSettings?.glassTopbar, siteSettings?.glassMenus, siteSettings?.glassLists])

  useEffect(() => {
    const effect = siteSettings?.sidebarHoverStyle || "default"
    if (effect === "default") {
      document.documentElement.removeAttribute('data-sidebar-hover')
    } else {
      document.documentElement.setAttribute('data-sidebar-hover', effect)
    }
  }, [siteSettings?.sidebarHoverStyle])

  useEffect(() => {
    if (!authed || isLoginPage) return
    const check = () => {
      fetch("/api/orders?stats=true").then(r => r.ok ? r.json() : null).then(d => {
        if (d?.newOrders !== undefined) setNewOrdersCount(d.newOrders)
      }).catch(() => {})
    }
    check(); const iv = setInterval(check, 30000)
    const handleOrderUpdate = () => { check() }
    window.addEventListener('orderAssigned', handleOrderUpdate)
    return () => { clearInterval(iv); window.removeEventListener('orderAssigned', handleOrderUpdate) }
  }, [authed, isLoginPage])

  useEffect(() => {
    if (!authed || isLoginPage) return
    const check = () => {
      fetch("/api/messages?_t=" + Date.now())
        .then(r => r.ok ? r.json() : []).then(d => {
          const arr = Array.isArray(d) ? d : []
          setUnreadCount(arr.filter((m: any) => !m.read && m.senderType !== 'admin').length)
        }).catch(() => {})
      fetch("/api/internal-chat?_t=" + Date.now())
        .then(r => r.ok ? r.json() : null).then(d => {
          if (d?.conversations) {
            const internalUnread = d.conversations.reduce((sum: number, c: any) => sum + (c.unreadCount || 0), 0)
            setInternalUnreadCount(internalUnread)
          }
        }).catch(() => {})
    }
    check(); const iv = setInterval(check, 15000)
    
    const handleMessage = (e: MessageEvent) => {
      if (e.data.type === 'messageMarkedRead') {
        check()
      }
    }
    window.addEventListener('message', handleMessage)
    
    return () => { clearInterval(iv); window.removeEventListener('message', handleMessage) }
  }, [authed, isLoginPage])

  if (authed === null) return <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "var(--adm-bg)" }}><div className="w-8 h-8 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" /></div>
  if (isLoginPage) return <><AdminLanguageToggle floating />{children}</>

  const siteName = siteSettings?.siteName || "Admin Panel"
  const siteLogo = siteSettings?.siteLogo || ""
  const displayName = currentUser?.role === "super_admin" ? "Master Admin" : (currentUser?.name || currentUser?.email || "User")
  const userInitial = (currentUser?.name?.[0] || currentUser?.email?.[0] || "A").toUpperCase()

  const bgImage = siteSettings?.adminBgImage || ""
  const bgBrightness = siteSettings?.adminBgBrightness ?? 100
  const bgContrast = siteSettings?.adminBgContrast ?? 100
  const bgSaturation = siteSettings?.adminBgSaturation ?? 100
  const bgBlur = siteSettings?.adminBgBlur ?? 0
  const bgWarmth = siteSettings?.adminBgWarmth ?? 50
  const bgOverlay = siteSettings?.adminBgOverlay ?? 60
  const bgSidebar = siteSettings?.adminBgSidebar !== false

  const bgFilter = `brightness(${bgBrightness}%) contrast(${bgContrast}%) saturate(${bgSaturation}%) blur(${bgBlur}px)`
  const warmthValue = (bgWarmth - 50) * 2
  const warmthColor = warmthValue > 0
    ? `rgba(255, ${180 - warmthValue * 0.8}, ${100 - warmthValue * 0.5}, ${Math.abs(warmthValue) * 0.003})`
    : `rgba(${100 + warmthValue * -0.5}, ${150 + warmthValue * -0.3}, 255, ${Math.abs(warmthValue) * 0.003})`
  const overlayColor = theme === "dark"
    ? `rgba(0, 0, 0, ${bgOverlay / 100})`
    : `rgba(255, 255, 255, ${bgOverlay / 100})`

  const outerContainerStyle: React.CSSProperties = bgImage ? {
    backgroundImage: `url(${bgImage})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    backgroundAttachment: "fixed",
    position: "relative",
  } : {
    backgroundColor: "var(--adm-bg)",
  }

  const Sidebar = () => (
    <div className="h-full flex flex-col">
      <div className="h-16 flex items-center justify-between px-4 border-b" style={{ borderColor: "var(--adm-border)" }}>
        <Link href="/admin" className={`flex items-center min-w-0 ${sidebarCollapsed ? 'flex-1 justify-center' : 'gap-2.5'}`} title={sidebarCollapsed ? siteName : undefined}>
          {siteLogo ? (
            <div className="w-8 h-8 shrink-0 flex items-center justify-center overflow-hidden rounded-lg">
              <img src={siteLogo} alt={siteName} className="w-full h-full object-contain" />
            </div>
          ) : (
            <Store size={20} className="adm-accent shrink-0" />
          )}
          {!sidebarCollapsed && <span className="text-sm font-semibold truncate" style={{ color: "var(--adm-text)" }}>{siteName}</span>}
        </Link>
        {!sidebarCollapsed && (
          <button
            onClick={() => setSidebarCollapsed(true)}
            className="p-1.5 rounded-lg adm-hover-bg transition-colors"
            style={{ color: "var(--adm-text-secondary)" }}
            title="Collapse sidebar"
          >
            <ChevronsLeft size={16} />
          </button>
        )}
      </div>
      <nav
        ref={sidebarNavRef as any}
        className={"flex-1 overflow-y-auto adm-sidebar-nav " + (sidebarCollapsed ? "py-4 px-2 space-y-1.5" : "py-3 px-2 space-y-0.5")}
        onScroll={() => {
          if (sidebarScrollTimer.current) clearTimeout(sidebarScrollTimer.current)
          sidebarScrollTimer.current = setTimeout(() => {
            const el = sidebarNavRef.current
            if (el) {
              try { localStorage.setItem('admin_sidebar_scroll', String(el.scrollTop)) } catch {}
            }
          }, 120)
        }}
      >
        {navItems.filter(item => canAccessNavItem(currentUser?.role, currentUser?.permissions, item.href)).map(item => (
          <Link key={item.href} href={item.href}
            className={"adm-nav-item flex items-center rounded-lg text-sm font-medium transition-all " + (sidebarCollapsed ? "justify-center w-12 mx-auto py-3 " : "gap-3 px-3 py-2.5 ") + (item.match(pathname) ? "adm-accent-bg adm-accent" : "adm-hover-bg")}
            style={{ color: item.match(pathname) ? "" : "var(--adm-text-secondary)" }}>
            <item.icon size={sidebarCollapsed ? 19 : 17} />
            {!sidebarCollapsed && <span className="flex-1">{item.label}</span>}
            {!sidebarCollapsed && item.label === "Orders" && newOrdersCount > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full text-white" style={{ backgroundColor: "var(--adm-accent)" }}>{newOrdersCount > 9 ? "9+" : newOrdersCount}</span>
            )}
            {!sidebarCollapsed && item.label === "Messages" && (unreadCount + internalUnreadCount) > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full text-white" style={{ backgroundColor: "var(--adm-accent)" }}>{(unreadCount + internalUnreadCount) > 9 ? "9+" : (unreadCount + internalUnreadCount)}</span>
            )}
          </Link>
        ))}
      </nav>
      <div className={"p-2 border-t " + (sidebarCollapsed ? "space-y-1.5" : "space-y-0.5")} style={{ borderColor: "var(--adm-border)" }}>
        {sidebarCollapsed ? (
          <>
            <button onClick={() => router.push("/admin/profile")} className="w-full flex items-center justify-center py-2.5 mb-1 rounded-lg transition-all adm-hover-bg" title={displayName}>
              <div className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold overflow-hidden" style={{ backgroundColor: "var(--adm-accent-bg)", color: "var(--adm-accent)" }}>
                {currentUser?.avatar ? (
                  <img src={currentUser.avatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  userInitial
                )}
              </div>
            </button>
            <a href="/" target="_blank" className="flex items-center justify-center px-3 py-2.5 rounded-lg transition-all adm-hover-bg" style={{ color: "var(--adm-text-secondary)" }} title="View Store">
              <Eye size={18} />
            </a>
            <button onClick={async () => { await fetch("/api/auth/logout", { method: "POST" }); router.push("/admin/login") }}
              className="flex items-center justify-center px-3 py-2.5 rounded-lg transition-all hover:bg-red-500/10 w-full" style={{ color: "var(--adm-text-secondary)" }} title="Logout">
              <LogOut size={18} />
            </button>
            <button onClick={() => setSidebarCollapsed(false)} className="w-full flex items-center justify-center py-2.5 rounded-lg transition-all adm-hover-bg" style={{ color: "var(--adm-text-secondary)" }} title="Expand sidebar">
              <ChevronsRight size={18} />
            </button>
            <AdminLanguageToggle collapsed />
          </>
        ) : (
          <>
            <button
              onClick={() => router.push("/admin/profile")}
              className="w-full px-3 py-2 mb-1 text-xs rounded-lg flex items-center gap-2 transition-all adm-hover-bg text-left"
              style={{ backgroundColor: "var(--adm-input)", color: "var(--adm-text-secondary)" }}
            >
              <div className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold overflow-hidden" style={{ backgroundColor: "var(--adm-accent-bg)", color: "var(--adm-accent)" }}>
                {currentUser?.avatar ? (
                  <img src={currentUser.avatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  userInitial
                )}
              </div>
              <div className="truncate text-left">
                <p className="font-medium text-[11px] truncate">{displayName}</p>
                <p className="text-[10px] opacity-60 truncate">{currentUser?.email || ""}</p>
              </div>
            </button>
            <a href="/" target="_blank" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all adm-hover-bg" style={{ color: "var(--adm-text-secondary)" }}>
              <Eye size={16} /> View Store
            </a>
            <button onClick={async () => { await fetch("/api/auth/logout", { method: "POST" }); router.push("/admin/login") }}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all hover:bg-red-500/10 w-full text-left" style={{ color: "var(--adm-text-secondary)" }}>
              <LogOut size={16} /> Logout
            </button>
            <AdminLanguageToggle />
          </>
        )}
      </div>
    </div>
  )

  const Topbar = () => (
    <div className="h-14 flex items-center justify-between px-6 border-b adm-topbar" style={{ backgroundColor: bgImage && bgSidebar ? (theme === "dark" ? "rgba(15, 23, 42, 0.7)" : "rgba(255, 255, 255, 0.7)") : "var(--adm-sidebar)", borderColor: "var(--adm-border)", backdropFilter: bgImage && bgSidebar ? "blur(10px)" : "none" }}>
      <span key={pathname} className="adm-load-comet" aria-hidden />
      <div className="flex items-center gap-4">
        <h2 className="text-sm font-medium" style={{ color: "var(--adm-text-secondary)" }}>
          {(() => {
            const item = navItems.find(n => n.match(pathname))
            return item?.label || "Dashboard"
          })()}
        </h2>
      </div>
      <div className="flex items-center gap-3">
        <VoiceAgentButton />
        <button onClick={toggle} className="p-2 rounded-lg adm-hover-bg transition-colors" style={{ color: "var(--adm-text-secondary)" }}>
          {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        <button
          onClick={() => setShowMessagesPanel(!showMessagesPanel)}
          className="p-2 rounded-lg adm-hover-bg transition-colors relative"
          style={{ color: "var(--adm-text-secondary)" }}
          title="Messages"
        >
          <MessageSquare size={16} />
          {(unreadCount + internalUnreadCount) > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-5 h-5 flex items-center justify-center text-[10px] font-bold rounded-full text-white" style={{ backgroundColor: "var(--adm-accent)" }}>
              {(unreadCount + internalUnreadCount) > 9 ? "9+" : (unreadCount + internalUnreadCount)}
            </span>
          )}
        </button>
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg transition-all adm-hover-bg"
            style={{ color: "var(--adm-text)" }}
          >
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold overflow-hidden" style={{ backgroundColor: "var(--adm-accent-bg)", color: "var(--adm-accent)" }}>
              {currentUser?.avatar ? (
                <img src={currentUser.avatar} alt="" className="w-full h-full object-cover" />
              ) : (
                userInitial
              )}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-xs font-medium leading-tight">{displayName}</p>
              <p className="text-[10px] opacity-60 leading-tight">{currentUser?.role === "super_admin" ? "Super Admin" : (currentUser?.role || "Staff")}</p>
            </div>
            <ChevronDown size={14} style={{ color: "var(--adm-text-secondary)" }} />
          </button>
          {userMenuOpen && (
            <div className="adm-dropdown-menu absolute right-0 top-full mt-2 w-56 rounded-xl shadow-xl overflow-hidden z-50" style={{ backgroundColor: "var(--adm-sidebar)", border: "1px solid var(--adm-border)" }}>
              <div className="px-4 py-3 border-b" style={{ borderColor: "var(--adm-border)" }}>
                <p className="text-sm font-medium" style={{ color: "var(--adm-text)" }}>{displayName}</p>
                <p className="text-xs opacity-60" style={{ color: "var(--adm-text-secondary)" }}>{currentUser?.email || ""}</p>
              </div>
              <div className="py-1">
                <button
                  onClick={() => { setUserMenuOpen(false); router.push("/admin/profile") }}
                  className="adm-dropdown-item w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors adm-hover-bg text-left"
                  style={{ color: "var(--adm-text-secondary)" }}
                >
                  <UserIcon size={15} /> My Profile
                </button>
                {currentUser?.role === "super_admin" && (
                  <button
                    onClick={() => { setUserMenuOpen(false); router.push("/admin/settings") }}
                    className="adm-dropdown-item w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors adm-hover-bg text-left"
                    style={{ color: "var(--adm-text-secondary)" }}
                  >
                    <Settings size={15} /> Settings
                  </button>
                )}
              </div>
              <div className="py-1 border-t" style={{ borderColor: "var(--adm-border)" }}>
                <button
                  onClick={async () => { setUserMenuOpen(false); await fetch("/api/auth/logout", { method: "POST" }); router.push("/admin/login") }}
                  className="adm-dropdown-item w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-red-500/10 text-left"
                  style={{ color: "#ef4444" }}
                >
                  <LogOut size={15} /> Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <div className="h-screen flex overflow-hidden" style={outerContainerStyle}>
      {bgImage && (
        <>
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: `url(${bgImage})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
              backgroundAttachment: "fixed",
              filter: bgFilter,
              zIndex: 0,
            }}
          />
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundColor: overlayColor,
              zIndex: 1,
            }}
          />
          {bgWarmth !== 50 && (
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundColor: warmthColor,
                zIndex: 2,
              }}
            />
          )}
        </>
      )}
      <aside className={"hidden lg:flex flex-col shrink-0 h-full relative z-10 transition-all duration-300 " + (sidebarCollapsed ? "w-20" : "w-60")} style={{ backgroundColor: bgImage && bgSidebar ? (theme === "dark" ? "rgba(15, 23, 42, 0.75)" : "rgba(255, 255, 255, 0.75)") : "var(--adm-sidebar)", borderRight: bgImage && bgSidebar ? "none" : "1px solid var(--adm-border)", backdropFilter: bgImage && bgSidebar ? "blur(12px)" : "none" }}>
        <Sidebar />
      </aside>
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 h-14 flex items-center justify-between px-4 adm-topbar" style={{ backgroundColor: bgImage && bgSidebar ? "rgba(0,0,0,0.5)" : "var(--adm-sidebar)", borderBottom: "1px solid var(--adm-border)", backdropFilter: bgImage && bgSidebar ? "blur(10px)" : "none" }}>
        <span key={pathname} className="adm-load-comet" aria-hidden />
        <button onClick={() => setMobileOpen(!mobileOpen)} style={{ color: "var(--adm-text-secondary)" }}>{mobileOpen ? <X size={18} /> : <Menu size={18} />}</button>
        <div className="flex items-center gap-2">
          {siteLogo ? (
            <div className="w-6 h-6 overflow-hidden">
              <img src={siteLogo} alt="" className="w-full h-full object-contain" />
            </div>
          ) : (
            <Store size={16} className="adm-accent" />
          )}
          <span className="text-sm font-semibold" style={{ color: "var(--adm-text)" }}>{siteName}</span>
        </div>
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold overflow-hidden"
            style={{ backgroundColor: "var(--adm-accent-bg)", color: "var(--adm-accent)" }}
          >
            {currentUser?.avatar ? (
              <img src={currentUser.avatar} alt="" className="w-full h-full object-cover" />
            ) : (
              userInitial
            )}
          </button>
          {userMenuOpen && (
            <div className="adm-dropdown-menu absolute right-0 top-full mt-2 w-52 rounded-xl shadow-xl overflow-hidden z-50" style={{ backgroundColor: "var(--adm-sidebar)", border: "1px solid var(--adm-border)" }}>
              <div className="px-4 py-3 border-b" style={{ borderColor: "var(--adm-border)" }}>
                <p className="text-sm font-medium" style={{ color: "var(--adm-text)" }}>{displayName}</p>
                <p className="text-xs opacity-60" style={{ color: "var(--adm-text-secondary)" }}>{currentUser?.email || ""}</p>
              </div>
              <div className="py-1">
                <button
                  onClick={() => { setUserMenuOpen(false); router.push("/admin/profile") }}
                  className="adm-dropdown-item w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors adm-hover-bg text-left"
                  style={{ color: "var(--adm-text-secondary)" }}
                >
                  <UserIcon size={15} /> My Profile
                </button>
              </div>
              <div className="py-1 border-t" style={{ borderColor: "var(--adm-border)" }}>
                <button
                  onClick={async () => { setUserMenuOpen(false); await fetch("/api/auth/logout", { method: "POST" }); router.push("/admin/login") }}
                  className="adm-dropdown-item w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-red-500/10 text-left"
                  style={{ color: "#ef4444" }}
                >
                  <LogOut size={15} /> Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      {mobileOpen && <div className="lg:hidden fixed top-14 left-0 right-0 z-40 overflow-y-auto max-h-[70vh]" style={{ backgroundColor: bgImage && bgSidebar ? "rgba(0,0,0,0.6)" : "var(--adm-sidebar)", borderBottom: "1px solid var(--adm-border)", backdropFilter: bgImage && bgSidebar ? "blur(10px)" : "none" }} onClick={() => setMobileOpen(false)}><Sidebar /></div>}
      <main
        className="flex-1 min-w-0 adm-content flex flex-col h-full overflow-hidden relative z-10 transition-all duration-300"
        style={{
          backgroundColor: bgImage ? "transparent" : "var(--adm-bg)",
          color: "var(--adm-text)",
          marginRight: showMessagesPanel && messagesPanelMode === 'push' ? '33.33%' : 0,
        }}
      >
        <div className="hidden lg:block shrink-0"><Topbar /></div>
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div
            className={pathname?.startsWith('/admin/marketing') ? 'w-full mx-auto' : 'max-w-7xl mx-auto'}
            style={{ padding: pathname?.startsWith('/admin/marketing') ? '0' : '1.5rem' }}
          >
            <ErrorBoundary>{children}</ErrorBoundary>
          </div>
        </div>
        <NotificationToast />
      </main>
      <MessagesPanel
        isOpen={showMessagesPanel}
        mode={messagesPanelMode}
        onModeChange={setMessagesPanelMode}
        onClose={() => setShowMessagesPanel(false)}
        currentUser={currentUser}
        unreadCount={unreadCount}
        internalUnreadCount={internalUnreadCount}
        bgImage={bgImage}
        theme={theme}
        onUnreadUpdate={() => {
          fetch("/api/messages?_t=" + Date.now())
            .then(r => r.ok ? r.json() : []).then(d => {
              const arr = Array.isArray(d) ? d : []
              setUnreadCount(arr.filter((m: any) => !m.read && m.senderType !== 'admin').length)
            }).catch(() => {})
          fetch("/api/internal-chat?_t=" + Date.now())
            .then(r => r.ok ? r.json() : null).then(d => {
              if (d?.conversations) {
                const internalUnread = d.conversations.reduce((sum: number, c: any) => sum + (c.unreadCount || 0), 0)
                setInternalUnreadCount(internalUnread)
              }
            }).catch(() => {})
        }}
      />
      <ScrollProgress />

      {/* AI Assistant Floating Button */}
      {currentUser && !isLoginPage && (currentUser.role === 'super_admin' || currentUser.role === 'admin') && siteSettings?.aiEnabled !== false && (
        <button
          ref={aiBtnRef}
          onClick={() => {
            if (aiDragMovedRef.current) {
              aiDragMovedRef.current = false
              return
            }
            setShowAIAssistant(!showAIAssistant)
          }}
          onPointerDown={(e) => {
            const btn = aiBtnRef.current
            if (!btn) return
            const rect = btn.getBoundingClientRect()
            aiDragRef.current = { startX: e.clientX, startY: e.clientY, origLeft: rect.left, origTop: rect.top }
            aiDragMovedRef.current = false
            ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
          }}
          onPointerMove={(e) => {
            const d = aiDragRef.current
            if (!d) return
            const dx = e.clientX - d.startX
            const dy = e.clientY - d.startY
            if (Math.abs(dx) + Math.abs(dy) > 4) aiDragMovedRef.current = true
            const btn = aiBtnRef.current
            if (btn) {
              btn.style.left = `${Math.max(8, Math.min(window.innerWidth - 60, d.origLeft + dx))}px`
              btn.style.top = `${Math.max(8, Math.min(window.innerHeight - 60, d.origTop + dy))}px`
              btn.style.right = 'auto'
              btn.style.bottom = 'auto'
            }
          }}
          onPointerUp={() => {
            const d = aiDragRef.current
            if (d) {
              const btn = aiBtnRef.current
              if (btn && aiDragMovedRef.current) {
                const left = Math.round(parseFloat(btn.style.left || '0'))
                const top = Math.round(parseFloat(btn.style.top || '0'))
                setAiBtnPos({ left, top })
                try { localStorage.setItem('admin_ai_button_pos', JSON.stringify({ left, top })) } catch {}
              }
              aiDragRef.current = null
            }
          }}
          className="fixed z-[150] flex items-center justify-center transition-all hover:scale-110"
          style={{
            ...(aiBtnPos ? { left: `${aiBtnPos.left}px`, top: `${aiBtnPos.top}px`, right: 'auto', bottom: 'auto' } : { right: "24px", bottom: "24px" }),
            width: "52px",
            height: "52px",
            borderRadius: "50%",
            backgroundColor: "var(--adm-accent)",
            color: "var(--adm-accent-text)",
            border: "2px solid var(--adm-card)",
            boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
            cursor: "grab",
            touchAction: "none",
          }}
          title="AI Assistant"
        >
          <Bot size={22} />
          {!showAIAssistant && (
            <span
              className="absolute -top-1 -right-1 w-3 h-3 rounded-full"
              style={{ backgroundColor: "#22c55e", border: "2px solid var(--adm-card)" }}
            />
          )}
        </button>
      )}

      {/* AI Assistant Panel */}
      <AIAssistantWidget
        isOpen={showAIAssistant}
        onClose={() => setShowAIAssistant(false)}
        assistantName={siteSettings?.aiAssistantName || "Aria"}
        avatar={siteSettings?.aiAvatar || "bot"}
        theme={theme}
      />

    </div>
  )
}

function MessagesPanel({ isOpen, mode, onModeChange, onClose, currentUser, unreadCount, internalUnreadCount, bgImage, theme, onUnreadUpdate }: {
  isOpen: boolean
  mode: 'overlay' | 'push'
  onModeChange: (mode: 'overlay' | 'push') => void
  onClose: () => void
  currentUser: any
  unreadCount: number
  internalUnreadCount: number
  bgImage: string
  theme: string
  onUnreadUpdate: () => void
}) {
  const [activeTab, setActiveTab] = useState<'customer' | 'internal'>('customer')
  const [customerMsgs, setCustomerMsgs] = useState<any[]>([])
  const [internalConversations, setInternalConversations] = useState<any[]>([])
  const [internalStaff, setInternalStaff] = useState<any[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null)
  const [selectedStaff, setSelectedStaff] = useState<any>(null)
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null)
  const [customerReplyText, setCustomerReplyText] = useState("")
  const [internalMessageText, setInternalMessageText] = useState("")
  const [customerSending, setCustomerSending] = useState(false)
  const [internalSending, setInternalSending] = useState(false)
  const [internalChatMessages, setInternalChatMessages] = useState<any[]>([])
  const [showNewInternalChat, setShowNewInternalChat] = useState(false)
  const [internalSearch, setInternalSearch] = useState("")
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const emojiPickerRef = useRef<HTMLDivElement>(null)
  const settingsRef = useRef<HTMLDivElement>(null)
  const [replySent, setReplySent] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const internalMessagesEndRef = useRef<HTMLDivElement>(null)

  const [botAutoReplyEnabled, setBotAutoReplyEnabled] = useState(false)
  const [botReplyDelay, setBotReplyDelay] = useState(5)
  const [botReplyContent, setBotReplyContent] = useState("Thank you for your message! Our team will get back to you shortly.")
  const [chatTheme, setChatTheme] = useState<'light' | 'dark' | 'system'>('system')
  const [chatBackgroundImage, setChatBackgroundImage] = useState("")
  const [bgBrightness, setBgBrightness] = useState(100)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [leftPanelWidth, setLeftPanelWidth] = useState(50)
  const [isDragging, setIsDragging] = useState(false)
  const panelContainerRef = useRef<HTMLDivElement>(null)

  const startDrag = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      if (!panelContainerRef.current) return
      const rect = panelContainerRef.current.getBoundingClientRect()
      const newWidth = ((e.clientX - rect.left) / rect.width) * 100
      setLeftPanelWidth(Math.min(Math.max(newWidth, 25), 75))
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging])

  const EMOJI_LIST = [
    "😀", "😂", "🥰", "😎", "🤔", "😢", "😡", "👍", "👎", "❤️", "🎉",
    "🔥", "💯", "✨", "🙏", "👏", "💪", "😊", "🙂", "😉", "😌", "😍",
    "🤗", "😴", "🤯", "🥳", "😇", "🤝", "💡", "🎁", "⭐", "🌟", "💎",
  ]

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      setChatBackgroundImage(event.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  useEffect(() => {
    if (!isOpen) return
    loadCustomerMessages()
    loadInternalChat()
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const iv = setInterval(() => {
      loadCustomerMessages()
      loadInternalChat()
    }, 15000)
    return () => clearInterval(iv)
  }, [isOpen])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false)
      }
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setShowSettings(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (!selectedCustomer || !messagesEndRef.current) return
    messagesEndRef.current.scrollTop = messagesEndRef.current.scrollHeight
  }, [customerMsgs, selectedCustomer])

  useEffect(() => {
    if (!selectedStaff || !internalMessagesEndRef.current) return
    internalMessagesEndRef.current.scrollTop = internalMessagesEndRef.current.scrollHeight
  }, [internalChatMessages, selectedStaff])

  const loadCustomerMessages = () => {
    fetch("/api/messages?_t=" + Date.now(), { credentials: 'include' })
      .then(r => r.ok ? r.json() : [])
      .then(d => setCustomerMsgs(Array.isArray(d) ? d : []))
      .catch(() => {})
  }

  const loadInternalChat = () => {
    fetch("/api/internal-chat?_t=" + Date.now(), { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.conversations) setInternalConversations(d.conversations)
      })
      .catch(() => {})
    fetch("/api/internal-chat?action=staff", { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.staff) setInternalStaff(d.staff)
      })
      .catch(() => {})
  }

  const markCustomerRead = async (email: string) => {
    const unread = customerMsgs.filter(m => m.email === email && m.senderType !== 'admin' && !m.read)
    for (const m of unread) {
      await fetch("/api/messages", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: 'include',
        body: JSON.stringify({ id: m.id, read: true })
      })
    }
    setCustomerMsgs(prev => prev.map(m => m.email === email && m.senderType !== 'admin' ? { ...m, read: true } : m))
    onUnreadUpdate()
  }

  const autoReplyToCustomer = async (email: string) => {
    if (!botAutoReplyEnabled || !botReplyContent.trim()) return
    const convMsgs = customerMsgs.filter(m => m.email === email)
    const latestMsg = [...convMsgs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
    if (!latestMsg || latestMsg.senderType === 'admin') return
    if (latestMsg.adminReply) return

    setTimeout(async () => {
      const targetId = latestMsg.id
      const res = await fetch("/api/messages", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: 'include',
        body: JSON.stringify({
          id: targetId,
          adminReply: botReplyContent,
          adminName: "Auto Reply",
          adminAvatar: "",
        })
      })
      if (res.ok) {
        await loadCustomerMessages()
      }
    }, botReplyDelay * 1000)
  }

  useEffect(() => {
    if (!botAutoReplyEnabled) return
    const checkNewMessages = () => {
      customerConversations.forEach(conv => {
        const convMsgs = customerMsgs.filter(m => m.email === conv.email)
        const latestMsg = [...convMsgs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
        if (latestMsg && latestMsg.senderType !== 'admin' && !latestMsg.adminReply) {
          const msgTime = new Date(latestMsg.createdAt).getTime()
          const now = Date.now()
          if (now - msgTime < botReplyDelay * 2000) {
            autoReplyToCustomer(conv.email)
          }
        }
      })
    }
    checkNewMessages()
  }, [customerMsgs, botAutoReplyEnabled, botReplyDelay, botReplyContent])

  const sendCustomerReply = async () => {
    if (!customerReplyText.trim() || !selectedCustomer) return
    setCustomerSending(true)
    const customerMsg = customerMsgs.find(m => m.email === selectedCustomer.email && m.senderType !== 'admin')
    const targetId = customerMsg?.id || selectedCustomer.id
    const res = await fetch("/api/messages", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: 'include',
      body: JSON.stringify({
        id: targetId,
        adminReply: customerReplyText,
        adminName: currentUser?.name || "Customer Service",
        adminAvatar: currentUser?.avatar || "",
      })
    })
    if (res.ok) {
      setReplySent(true)
      setCustomerReplyText("")
      await loadCustomerMessages()
      setTimeout(() => setReplySent(false), 3000)
    }
    setCustomerSending(false)
  }

  const openInternalChat = async (staff: any) => {
    setSelectedStaff(staff)
    setShowNewInternalChat(false)
    setInternalSearch("")
    const res = await fetch(`/api/internal-chat?action=messages_with&staffId=${staff.id}`, { credentials: 'include' })
    if (res.ok) {
      const data = await res.json()
      setInternalChatMessages(data.messages || [])
      setSelectedConvId(data.conversationId)
      if (data.messages?.filter((m: any) => m.toStaffId === currentUser?.id && !m.read).length > 0) {
        fetch("/api/internal-chat", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: 'include',
          body: JSON.stringify({ action: "mark_read", conversationId: data.conversationId })
        })
        loadInternalChat()
        onUnreadUpdate()
      }
    }
  }

  const sendInternalMessage = async () => {
    if (!internalMessageText.trim() || !selectedStaff) return
    if (selectedStaff.id === currentUser?.id) {
      alert("Cannot send message to yourself")
      return
    }
    setInternalSending(true)
    const res = await fetch("/api/internal-chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: 'include',
      body: JSON.stringify({
        toStaffId: selectedStaff.id,
        message: internalMessageText,
      })
    })
    if (res.ok) {
      setInternalMessageText("")
      const updated = await fetch(`/api/internal-chat?action=messages_with&staffId=${selectedStaff.id}`, { credentials: 'include' })
      if (updated.ok) {
        const data = await updated.json()
        setInternalChatMessages(data.messages || [])
        setSelectedConvId(data.conversationId)
      }
      loadInternalChat()
    }
    setInternalSending(false)
  }

  const insertEmoji = (emoji: string) => {
    if (activeTab === 'customer') {
      setCustomerReplyText(prev => prev + emoji)
    } else {
      setInternalMessageText(prev => prev + emoji)
    }
    setShowEmojiPicker(false)
  }

  const customerConversations = customerMsgs.filter((m, i, arr) => arr.findIndex(x => x.email === m.email) === i)

  const getCustomerAvatar = (emailOrMsg: any) => {
    const email = typeof emailOrMsg === "string" ? emailOrMsg : emailOrMsg?.email
    const convMsgs = customerMsgs.filter(m => m.email === email)
    const latest = [...convMsgs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0] || emailOrMsg
    const name = (latest?.name || emailOrMsg?.name || "")
    const displayName = name || email?.split('@')[0] || email || "?"
    return { type: "initial" as const, letter: displayName[0]?.toUpperCase() || "?", name: name || "" }
  }

  const RenderAvatar = ({ name, size = 20, bgColor, textColor }: {
    name?: string
    size?: number
    bgColor?: string
    textColor?: string
  }) => {
    const letter = (name || "?")[0]?.toUpperCase() || "?"
    return (
      <div
        className="rounded-full shrink-0 flex items-center justify-center font-bold"
        style={{
          width: size,
          height: size,
          fontSize: size * 0.4,
          backgroundColor: bgColor || "var(--adm-accent-bg)",
          color: textColor || "var(--adm-accent)",
        }}
      >
        <span>{letter}</span>
      </div>
    )
  }

  const filteredInternalStaff = internalStaff.filter((s: any) => {
    if (!internalSearch.trim()) return true
    const q = internalSearch.toLowerCase()
    return s.name?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q)
  })

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      <div
        className={`adm-messages-panel fixed top-0 right-0 h-full w-[33.33%] max-w-md lg:max-w-none z-50 transition-transform duration-300 ease-out flex flex-col ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{
          backgroundColor: chatBackgroundImage ? "transparent" : (chatTheme === 'dark' ? "#0f172a" : chatTheme === 'light' ? "#ffffff" : "var(--adm-sidebar)"),
          borderLeft: `1px solid var(--adm-border)`,
          boxShadow: mode === 'overlay' ? '-4px 0 20px rgba(0,0,0,0.15)' : 'none',
        }}
      >
        {chatBackgroundImage && (
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url(${chatBackgroundImage})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              filter: `brightness(${bgBrightness}%)`,
              zIndex: -1,
            }}
          />
        )}
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: "var(--adm-border)" }}>
          <h3 className="text-sm font-semibold" style={{ color: "var(--adm-text)" }}>Messages</h3>
          <div className="flex items-center gap-1">
            <div className="relative" ref={settingsRef}>
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-1.5 rounded-lg adm-hover-bg transition-colors"
                style={{ color: "var(--adm-text-secondary)" }}
              >
                <Settings size={16} />
              </button>
              {showSettings && (
                <div
                  className="absolute right-0 top-full mt-1 w-80 rounded-lg shadow-xl overflow-hidden z-50"
                  style={{ backgroundColor: "var(--adm-sidebar)", border: "1px solid var(--adm-border)" }}
                >
                  <div className="p-3 border-b" style={{ borderColor: "var(--adm-border)" }}>
                    <p className="text-xs font-semibold" style={{ color: "var(--adm-text)" }}>Settings</p>
                  </div>

                  <div className="p-3 space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Bot size={14} style={{ color: "var(--adm-accent)" }} />
                          <span className="text-xs font-medium" style={{ color: "var(--adm-text)" }}>Auto Reply</span>
                        </div>
                        <button
                          onClick={() => setBotAutoReplyEnabled(!botAutoReplyEnabled)}
                          className="p-1 rounded transition-colors"
                          style={{ backgroundColor: botAutoReplyEnabled ? "var(--adm-accent)" : "var(--adm-border)" }}
                        >
                          {botAutoReplyEnabled ? <ToggleRight size={14} style={{ color: "white" }} /> : <ToggleLeft size={14} style={{ color: "var(--adm-text-secondary)" }} />}
                        </button>
                      </div>
                      {botAutoReplyEnabled && (
                        <div className="space-y-2 pl-2">
                          <div className="flex items-center gap-2">
                            <Clock size={12} style={{ color: "var(--adm-text-secondary)" }} />
                            <input
                              type="number"
                              min="1"
                              max="60"
                              value={botReplyDelay}
                              onChange={(e) => setBotReplyDelay(Number(e.target.value))}
                              className="flex-1 px-2 py-1 text-xs rounded border"
                              style={{ borderColor: "var(--adm-border)", backgroundColor: "var(--adm-bg)", color: "var(--adm-text)" }}
                              placeholder="Delay (seconds)"
                            />
                            <span className="text-[10px]" style={{ color: "var(--adm-text-secondary)" }}>seconds</span>
                          </div>
                          <textarea
                            value={botReplyContent}
                            onChange={(e) => setBotReplyContent(e.target.value)}
                            className="w-full px-2 py-1.5 text-xs rounded border resize-none"
                            style={{ borderColor: "var(--adm-border)", backgroundColor: "var(--adm-bg)", color: "var(--adm-text)" }}
                            placeholder="Auto reply content..."
                            rows={3}
                          />
                        </div>
                      )}
                    </div>

                    <div className="border-t pt-3" style={{ borderColor: "var(--adm-border)" }}>
                      <div className="flex items-center gap-2 mb-2">
                        <Palette size={14} style={{ color: "var(--adm-accent)" }} />
                        <span className="text-xs font-medium" style={{ color: "var(--adm-text)" }}>Chat Theme</span>
                      </div>
                      <div className="grid grid-cols-3 gap-1">
                        {(['light', 'dark', 'system'] as const).map((t) => (
                          <button
                            key={t}
                            onClick={() => setChatTheme(t)}
                            className={`px-2 py-1.5 text-[10px] rounded transition-colors capitalize ${chatTheme === t ? 'adm-accent-bg' : 'adm-hover-bg'}`}
                            style={{ color: chatTheme === t ? 'var(--adm-accent)' : 'var(--adm-text-secondary)' }}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="border-t pt-3" style={{ borderColor: "var(--adm-border)" }}>
                      <div className="flex items-center gap-2 mb-2">
                        <ImageIcon size={14} style={{ color: "var(--adm-accent)" }} />
                        <span className="text-xs font-medium" style={{ color: "var(--adm-text)" }}>Background Image</span>
                      </div>
                      <div className="space-y-2">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="w-full px-2 py-1.5 text-xs rounded border transition-colors adm-hover-bg flex items-center justify-center gap-1.5"
                          style={{ borderColor: "var(--adm-border)", color: "var(--adm-text-secondary)" }}
                        >
                          <Plus size={12} />
                          Upload from computer
                        </button>
                        <input
                          type="url"
                          value={chatBackgroundImage && chatBackgroundImage.startsWith('data:') ? '' : chatBackgroundImage}
                          onChange={(e) => setChatBackgroundImage(e.target.value)}
                          className="w-full px-2 py-1.5 text-xs rounded border"
                          style={{ borderColor: "var(--adm-border)", backgroundColor: "var(--adm-bg)", color: "var(--adm-text)" }}
                          placeholder="Or enter image URL..."
                        />
                        {chatBackgroundImage && (
                          <>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] shrink-0" style={{ color: "var(--adm-text-secondary)" }}>Brightness</span>
                              <input
                                type="range"
                                min="10"
                                max="150"
                                value={bgBrightness}
                                onChange={(e) => setBgBrightness(Number(e.target.value))}
                                className="flex-1 h-1 rounded appearance-none cursor-pointer"
                                style={{ accentColor: "var(--adm-accent)" }}
                              />
                              <span className="text-[10px] shrink-0 w-8 text-right" style={{ color: "var(--adm-text-secondary)" }}>{bgBrightness}%</span>
                            </div>
                            <button
                              onClick={() => { setChatBackgroundImage(""); setBgBrightness(100) }}
                              className="text-[10px] text-red-500 hover:text-red-600 transition-colors"
                            >
                              Remove background image
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="border-t pt-3" style={{ borderColor: "var(--adm-border)" }}>
                      <span className="text-[10px] font-medium" style={{ color: "var(--adm-text-secondary)" }}>Panel Display Mode</span>
                      <div className="mt-1.5 space-y-1">
                        <button
                          onClick={() => { onModeChange('overlay'); setShowSettings(false) }}
                          className={`w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded transition-colors ${mode === 'overlay' ? 'adm-accent-bg' : 'adm-hover-bg'}`}
                          style={{ color: mode === 'overlay' ? 'var(--adm-accent)' : 'var(--adm-text-secondary)' }}
                        >
                          <Layers size={12} />
                          <span>Overlay</span>
                          {mode === 'overlay' && <Check size={10} className="ml-auto" />}
                        </button>
                        <button
                          onClick={() => { onModeChange('push'); setShowSettings(false) }}
                          className={`w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded transition-colors ${mode === 'push' ? 'adm-accent-bg' : 'adm-hover-bg'}`}
                          style={{ color: mode === 'push' ? 'var(--adm-accent)' : 'var(--adm-text-secondary)' }}
                        >
                          <Columns size={12} />
                          <span>Push Content</span>
                          {mode === 'push' && <Check size={10} className="ml-auto" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg adm-hover-bg transition-colors"
              style={{ color: "var(--adm-text-secondary)" }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="flex border-b" style={{ borderColor: "var(--adm-border)" }}>
          <button
            onClick={() => { setActiveTab('customer'); setSelectedCustomer(null) }}
            className={`flex-1 px-3 py-2.5 text-xs font-medium transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'customer' ? '' : 'adm-hover-bg'
            }`}
            style={{
              backgroundColor: activeTab === 'customer' ? 'var(--adm-accent-bg)' : 'transparent',
              color: activeTab === 'customer' ? 'var(--adm-accent)' : 'var(--adm-text-secondary)',
            }}
          >
            <Mail size={14} />
            Customer
            {unreadCount > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full text-white" style={{ backgroundColor: "var(--adm-accent)" }}>
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
          <button
            onClick={() => { setActiveTab('internal'); setSelectedStaff(null) }}
            className={`flex-1 px-3 py-2.5 text-xs font-medium transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'internal' ? '' : 'adm-hover-bg'
            }`}
            style={{
              backgroundColor: activeTab === 'internal' ? 'var(--adm-accent-bg)' : 'transparent',
              color: activeTab === 'internal' ? 'var(--adm-accent)' : 'var(--adm-text-secondary)',
            }}
          >
            <UsersIcon size={14} />
            Internal
            {internalUnreadCount > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full text-white" style={{ backgroundColor: "var(--adm-accent)" }}>
                {internalUnreadCount > 9 ? "9+" : internalUnreadCount}
              </span>
            )}
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col">
          {activeTab === 'customer' ? (
            <div className="flex-1 overflow-hidden flex" ref={panelContainerRef}>
              <div
                className="overflow-y-auto p-2 space-y-1"
                style={{
                  width: `${leftPanelWidth}%`,
                  borderRight: "1px solid var(--adm-border)",
                }}
              >
                {customerConversations.length === 0 ? (
                  <div className="text-center py-8">
                    <Inbox size={24} className="mx-auto" style={{ color: "var(--adm-text-secondary)" }} />
                    <p className="text-xs mt-2" style={{ color: "var(--adm-text-secondary)" }}>No messages</p>
                  </div>
                ) : customerConversations.map((conv) => {
                  const convMsgs = customerMsgs.filter(m => m.email === conv.email)
                  const sortedMsgs = [...convMsgs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  const latestMsg = sortedMsgs[0]
                  const unreadCount = convMsgs.filter(m => !m.read && m.senderType !== 'admin').length
                  const hasUnread = unreadCount > 0
                  const avatar = getCustomerAvatar(conv)
                  return (
                    <div
                      key={conv.email}
                      onClick={() => { setSelectedCustomer(latestMsg || conv); if (hasUnread) markCustomerRead(conv.email) }}
                      className={`p-2 rounded-lg cursor-pointer transition-all adm-hover-bg ${
                        selectedCustomer?.email === conv.email ? "bg-indigo-500/10" : ""
                      }`}
                      style={{ borderLeft: selectedCustomer?.email === conv.email ? "2px solid var(--adm-accent)" : "2px solid transparent" }}
                    >
                      <div className="flex items-center gap-2">
                        <RenderAvatar name={avatar.letter} size={20} />
                        <p className="text-xs font-medium truncate flex-1" style={{ color: "var(--adm-text)" }}>{avatar.name || conv.name}</p>
                        {hasUnread && (
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="text-[9px] font-bold uppercase" style={{ color: "var(--adm-accent)" }}>new</span>
                            <span className="w-4 h-4 flex items-center justify-center text-[9px] font-bold rounded-full text-white" style={{ backgroundColor: "var(--adm-accent)" }}>
                              {unreadCount > 9 ? "9+" : unreadCount}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              <div
                onMouseDown={startDrag}
                className="w-1 cursor-col-resize shrink-0 relative group"
                style={{
                  backgroundColor: isDragging ? "var(--adm-accent)" : "var(--adm-border)",
                }}
              >
                <div
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-6 rounded opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-0.5"
                  style={{ backgroundColor: "var(--adm-accent)" }}
                >
                  <div className="w-0.5 h-0.5 rounded-full" style={{ backgroundColor: "white" }} />
                  <div className="w-0.5 h-0.5 rounded-full" style={{ backgroundColor: "white" }} />
                  <div className="w-0.5 h-0.5 rounded-full" style={{ backgroundColor: "white" }} />
                </div>
              </div>

              <div className="flex-1 flex flex-col">
                {selectedCustomer ? (
                  <>
                    <div className="p-3 border-b" style={{ borderColor: "var(--adm-border)" }}>
                      <div className="flex items-center gap-2">
                        <RenderAvatar name={getCustomerAvatar(selectedCustomer).letter} size={24} />
                        <div>
                          <p className="text-xs font-medium" style={{ color: "var(--adm-text)" }}>{getCustomerAvatar(selectedCustomer).name || selectedCustomer.name}</p>
                          <p className="text-[10px]" style={{ color: "var(--adm-text-secondary)" }}>{selectedCustomer.email}</p>
                        </div>
                      </div>
                    </div>

                    <div ref={messagesEndRef} className="flex-1 overflow-y-auto p-3 space-y-3">
                      {[...customerMsgs]
                        .filter(m => m.email === selectedCustomer.email)
                        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
                        .map((m, i) => {
                          const isAdmin = m.senderType === 'admin'
                          const avatar = getCustomerAvatar(m)
                          return (
                            <div key={m.id || i} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                              <div className={`flex items-end gap-1.5 max-w-[90%] ${isAdmin ? 'flex-row-reverse' : ''}`}>
                                {isAdmin ? (
                                  <RenderAvatar
                                    name={m.adminName || currentUser?.name || "Staff"}
                                    size={18}
                                    bgColor="var(--adm-accent)"
                                    textColor="white"
                                  />
                                ) : (
                                  <RenderAvatar name={avatar.letter} size={18} />
                                )}
                                <div
                                  className={`text-xs px-2.5 py-2 rounded-lg ${isAdmin ? 'rounded-br-sm' : 'rounded-bl-sm'}`}
                                  style={{
                                    backgroundColor: isAdmin ? 'var(--adm-accent-bg)' : 'var(--adm-input)',
                                    color: 'var(--adm-text)',
                                  }}
                                >
                                  <div className={`flex items-center gap-1 mb-1 ${isAdmin ? 'justify-end' : ''}`}>
                                    <span className="text-[9px]" style={{ color: "var(--adm-accent)" }}>
                                      {isAdmin ? (m.adminName || "Staff") : (m.name || "Customer")}
                                    </span>
                                  </div>
                                  <p className="whitespace-pre-wrap">{m.message || m.adminReply}</p>
                                  <p className="text-[9px] mt-1" style={{ color: "var(--adm-text-secondary)" }}>
                                    {new Date(m.createdAt).toLocaleString()}
                                  </p>
                                  {isAdmin && (
                                    m.adminRead ? (
                                      <span className="flex items-center gap-0.5 text-[9px]" style={{ color: "var(--adm-accent)" }}>
                                        <CheckCheck size={10} /> Read
                                      </span>
                                    ) : (
                                      <span className="flex items-center gap-0.5 text-[9px]" style={{ color: "var(--adm-text-secondary)" }}>
                                        <Check size={10} /> Sent
                                      </span>
                                    )
                                  )}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                    </div>

                    <div className="p-3 border-t" style={{ borderColor: "var(--adm-border)" }}>
                      <textarea
                        value={customerReplyText}
                        onChange={e => setCustomerReplyText(e.target.value)}
                        rows={2}
                        placeholder="Type reply..."
                        onKeyDown={e => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            if (customerReplyText.trim() && !customerSending) sendCustomerReply()
                          }
                        }}
                        className="w-full px-3 py-2 rounded-lg border text-xs placeholder:text-gray-500 focus:outline-none resize-none"
                        style={{ backgroundColor: "var(--adm-input)", borderColor: "var(--adm-border)", color: "var(--adm-text)" }}
                      />
                      <div className="flex items-center justify-between mt-2">
                        <div className="relative" ref={emojiPickerRef}>
                          <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="p-1 text-gray-500 hover:text-indigo-400 transition-colors">
                            <Smile size={14} />
                          </button>
                          {showEmojiPicker && (
                            <div className="absolute bottom-full right-0 mb-2 w-48 border rounded-lg shadow-xl z-20 p-1.5 grid grid-cols-8 gap-0.5" style={{ backgroundColor: "var(--adm-card)", borderColor: "var(--adm-border)" }}>
                              {EMOJI_LIST.map((emoji, idx) => (
                                <button key={idx} onClick={() => insertEmoji(emoji)} className="w-5 h-5 flex items-center justify-center text-base rounded transition-colors adm-hover-bg">
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={sendCustomerReply}
                          disabled={customerSending || !customerReplyText.trim()}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-medium disabled:opacity-50 transition-colors"
                          style={{ backgroundColor: "var(--adm-accent)" }}
                        >
                          {customerSending ? "Sending..." : replySent ? <><Check size={12} /> Sent</> : <><Send size={12} /> Send</>}
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                      <MessageSquare size={32} style={{ color: "var(--adm-text-secondary)" }} />
                      <p className="text-xs mt-2" style={{ color: "var(--adm-text-secondary)" }}>Select a conversation</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-hidden flex">
              <div
                className="overflow-y-auto"
                style={{
                  width: `${leftPanelWidth}%`,
                  borderRight: "1px solid var(--adm-border)",
                }}
              >
                <div className="p-2 border-b" style={{ borderColor: "var(--adm-border)" }}>
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium" style={{ color: "var(--adm-text)" }}>Conversations</p>
                    <button
                      onClick={() => setShowNewInternalChat(!showNewInternalChat)}
                      className="p-1 rounded transition-colors adm-hover-bg"
                      style={{ color: "var(--adm-accent)" }}
                    >
                      {showNewInternalChat ? <X size={14} /> : <Plus size={14} />}
                    </button>
                  </div>
                  {showNewInternalChat && (
                    <div className="mt-2">
                      <input
                        type="text"
                        value={internalSearch}
                        onChange={e => setInternalSearch(e.target.value)}
                        placeholder="Search staff..."
                        className="w-full px-2 py-1.5 rounded border text-xs focus:outline-none"
                        style={{ backgroundColor: "var(--adm-input)", borderColor: "var(--adm-border)", color: "var(--adm-text)" }}
                      />
                      <div className="mt-1 max-h-32 overflow-y-auto space-y-0.5">
                        {filteredInternalStaff.map((staff: any) => (
                          <div
                            key={staff.id}
                            onClick={() => openInternalChat(staff)}
                            className="flex items-center gap-2 p-1.5 rounded cursor-pointer transition-colors adm-hover-bg"
                          >
                            <RenderAvatar name={staff.name} size={18} />
                            <div className="min-w-0">
                              <p className="text-xs font-medium truncate" style={{ color: "var(--adm-text)" }}>{staff.name}</p>
                              <p className="text-[9px]" style={{ color: "var(--adm-text-secondary)" }}>{staff.role}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className="p-2 space-y-1">
                  {internalConversations.length === 0 ? (
                    <div className="text-center py-8">
                      <MessageSquare size={24} style={{ color: "var(--adm-text-secondary)" }} />
                      <p className="text-xs mt-2" style={{ color: "var(--adm-text-secondary)" }}>No conversations</p>
                    </div>
                  ) : internalConversations.map((conv: any) => (
                    <div
                      key={conv.conversationId}
                      onClick={() => openInternalChat(conv.otherStaff)}
                      className={`p-2 rounded-lg cursor-pointer transition-all adm-hover-bg ${
                        selectedConvId === conv.conversationId ? "bg-indigo-500/10" : ""
                      }`}
                      style={{ borderLeft: selectedConvId === conv.conversationId ? "2px solid var(--adm-accent)" : "2px solid transparent" }}
                    >
                      <div className="flex items-center gap-2">
                        <RenderAvatar name={conv.otherStaff?.name || 'Unknown'} size={20} />
                        <p className="text-xs font-medium truncate flex-1" style={{ color: "var(--adm-text)" }}>{conv.otherStaff?.name || 'Unknown'}</p>
                        {conv.unreadCount > 0 && (
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="text-[9px] font-bold uppercase" style={{ color: "var(--adm-accent)" }}>new</span>
                            <span className="w-4 h-4 flex items-center justify-center text-[9px] font-bold rounded-full text-white" style={{ backgroundColor: "var(--adm-accent)" }}>
                              {conv.unreadCount > 9 ? "9+" : conv.unreadCount}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div
                onMouseDown={startDrag}
                className="w-1 cursor-col-resize shrink-0 relative group"
                style={{
                  backgroundColor: isDragging ? "var(--adm-accent)" : "var(--adm-border)",
                }}
              >
                <div
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-6 rounded opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-0.5"
                  style={{ backgroundColor: "var(--adm-accent)" }}
                >
                  <div className="w-0.5 h-0.5 rounded-full" style={{ backgroundColor: "white" }} />
                  <div className="w-0.5 h-0.5 rounded-full" style={{ backgroundColor: "white" }} />
                  <div className="w-0.5 h-0.5 rounded-full" style={{ backgroundColor: "white" }} />
                </div>
              </div>

              <div className="flex-1 flex flex-col">
                {selectedStaff ? (
                  <>
                    <div className="p-3 border-b" style={{ borderColor: "var(--adm-border)" }}>
                      <div className="flex items-center gap-2">
                        <RenderAvatar name={selectedStaff.name} size={24} />
                        <div>
                          <p className="text-xs font-medium" style={{ color: "var(--adm-text)" }}>{selectedStaff.name}</p>
                          <p className="text-[10px]" style={{ color: "var(--adm-text-secondary)" }}>{selectedStaff.role} &middot; {selectedStaff.email}</p>
                        </div>
                      </div>
                    </div>

                    <div ref={internalMessagesEndRef} className="flex-1 overflow-y-auto p-3 space-y-3">
                      {selectedStaff.id === currentUser?.id && (
                        <div className="p-2 rounded-lg text-xs flex items-center gap-1.5" style={{ backgroundColor: "rgba(239, 68, 68, 0.1)", color: "rgb(239, 68, 68)" }}>
                          <Info size={12} /> You cannot send messages to yourself
                        </div>
                      )}
                      {internalChatMessages.length === 0 ? (
                        <div className="text-center py-8">
                          <MessageSquare size={24} style={{ color: "var(--adm-text-secondary)" }} />
                          <p className="text-xs mt-2" style={{ color: "var(--adm-text-secondary)" }}>No messages yet</p>
                        </div>
                      ) : internalChatMessages.map((m: any, i: number) => {
                        const isMe = m.fromStaffId === currentUser?.id
                        return (
                          <div key={m.id || i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <div className={`flex items-end gap-1.5 max-w-[90%] ${isMe ? 'flex-row-reverse' : ''}`}>
                              {isMe ? (
                                <RenderAvatar
                                  name={m.fromName || currentUser?.name || "Me"}
                                  size={18}
                                  bgColor="var(--adm-accent)"
                                  textColor="white"
                                />
                              ) : (
                                <RenderAvatar
                                  name={m.fromName || selectedStaff?.name}
                                  size={18}
                                />
                              )}
                              <div
                                className={`text-xs px-2.5 py-2 rounded-lg ${isMe ? 'rounded-br-sm' : 'rounded-bl-sm'}`}
                                style={{
                                  backgroundColor: isMe ? 'var(--adm-accent-bg)' : 'var(--adm-input)',
                                  color: 'var(--adm-text)',
                                }}
                              >
                                <div className={`flex items-center gap-1 mb-1 ${isMe ? 'justify-end' : ''}`}>
                                  <span className="text-[9px]" style={{ color: "var(--adm-accent)" }}>
                                    {isMe ? (m.fromName || "You") : (m.fromName || selectedStaff.name)}
                                  </span>
                                </div>
                                <p className="whitespace-pre-wrap">{m.message}</p>
                                <p className="text-[9px] mt-1" style={{ color: "var(--adm-text-secondary)" }}>
                                  {new Date(m.createdAt).toLocaleString()}
                                </p>
                                {isMe && (
                                  m.read ? (
                                    <span className="flex items-center gap-0.5 text-[9px]" style={{ color: "var(--adm-accent)" }}>
                                      <CheckCheck size={10} /> Read
                                    </span>
                                  ) : (
                                    <span className="flex items-center gap-0.5 text-[9px]" style={{ color: "var(--adm-text-secondary)" }}>
                                      <Check size={10} /> Sent
                                    </span>
                                  )
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    <div className="p-3 border-t" style={{ borderColor: "var(--adm-border)" }}>
                      <textarea
                        value={internalMessageText}
                        onChange={e => setInternalMessageText(e.target.value)}
                        rows={2}
                        placeholder="Type message..."
                        onKeyDown={e => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            if (internalMessageText.trim() && !internalSending && selectedStaff.id !== currentUser?.id) sendInternalMessage()
                          }
                        }}
                        className="w-full px-3 py-2 rounded-lg border text-xs placeholder:text-gray-500 focus:outline-none resize-none"
                        style={{ backgroundColor: "var(--adm-input)", borderColor: "var(--adm-border)", color: "var(--adm-text)" }}
                      />
                      <div className="flex items-center justify-between mt-2">
                        <div className="relative" ref={emojiPickerRef}>
                          <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="p-1 text-gray-500 hover:text-indigo-400 transition-colors">
                            <Smile size={14} />
                          </button>
                          {showEmojiPicker && (
                            <div className="absolute bottom-full right-0 mb-2 w-48 border rounded-lg shadow-xl z-20 p-1.5 grid grid-cols-8 gap-0.5" style={{ backgroundColor: "var(--adm-card)", borderColor: "var(--adm-border)" }}>
                              {EMOJI_LIST.map((emoji, idx) => (
                                <button key={idx} onClick={() => insertEmoji(emoji)} className="w-5 h-5 flex items-center justify-center text-base rounded transition-colors adm-hover-bg">
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={sendInternalMessage}
                          disabled={internalSending || !internalMessageText.trim() || selectedStaff?.id === currentUser?.id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-medium disabled:opacity-50 transition-colors"
                          style={{ backgroundColor: "var(--adm-accent)" }}
                        >
                          {internalSending ? "Sending..." : <><Send size={12} /> Send</>}
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                      <UsersIcon size={32} style={{ color: "var(--adm-text-secondary)" }} />
                      <p className="text-xs mt-2" style={{ color: "var(--adm-text-secondary)" }}>Select a conversation</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminThemeProvider><AdminContent>{children}</AdminContent></AdminThemeProvider>
}

