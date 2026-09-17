"use client"
import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { User, Package, MapPin, Heart, LogOut, Ticket, Copy, Check } from "lucide-react"

export default function AccountPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [orders, setOrders] = useState<any[]>([])
  const [customer, setCustomer] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [copiedCoupon, setCopiedCoupon] = useState<string | null>(null)
  // 头像图片加载失败时回退到占位图标
  const [avatarFailed, setAvatarFailed] = useState(false)

  useEffect(() => { setAvatarFailed(false) }, [user?.avatar])

  useEffect(() => {
    Promise.all([
      fetch("/api/auth/user").then(r => r.ok ? r.json() : Promise.reject()),
      fetch("/api/orders").then(r => r.ok ? r.json() : []),
    ]).then(([userData, ordersData]) => {
      setUser(userData.user);
      setCustomer(userData.customer || null);
      setOrders(Array.isArray(ordersData) ? ordersData : []);
      setLoading(false);
    }).catch(() => { router.push("/login"); setLoading(false) })
  }, [])

  const handleLogout = async () => {
    await fetch("/api/auth/user-logout", { method: "POST" })
    localStorage.removeItem("otm_user"); router.push("/"); window.location.reload()
  }

  const copyCoupon = async (code: string) => {
    try { await navigator.clipboard.writeText(code) } catch { /* ignore */ }
    setCopiedCoupon(code)
    setTimeout(() => setCopiedCoupon(null), 2000)
  }

  if (loading) return <div className="min-h-[60vh] flex items-center justify-center"><div className="w-8 h-8 border-2 border-otb-terracotta border-t-transparent rounded-full animate-spin" /></div>
  if (!user) return null
  
  const totalOrders = customer?.totalOrders || orders.length
  const coupons = user.coupons || []
  const availableCoupons = coupons.filter((c: any) => !c.used && new Date(c.expiresAt).getTime() > Date.now())

  return <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-otb-terracotta/10 flex items-center justify-center text-xl">{(user.firstName?.[0] || "U").toUpperCase()}</div>
          <div>
            <h1 className="font-serif text-2xl md:text-3xl text-otb-ink">Hello, {user.firstName}!</h1>
            <div className="flex items-center gap-2 mt-1">
              <p className="font-sans text-sm text-otb-ink/50">{user.email}</p>
            </div>
          </div>
        </div>
        <button onClick={handleLogout} className="flex items-center gap-1.5 text-sm font-sans text-otb-ink/40 hover:text-red-500 transition-colors"><LogOut size={14} /> Sign Out</button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-[#FFFFFF]/70 border border-otb-sand/50 rounded-sm p-4">
          <p className="text-2xl font-serif font-bold text-otb-terracotta">{totalOrders}</p>
          <p className="text-xs font-sans text-otb-ink/40 mt-0.5">Total Orders</p>
        </div>
        <div className="bg-[#FFFFFF]/70 border border-otb-sand/50 rounded-sm p-4">
          <p className="text-2xl font-serif font-bold text-otb-ink">${(customer?.totalSpent || orders.reduce((s, o) => s + (o.total || 0), 0)).toFixed(2)}</p>
          <p className="text-xs font-sans text-otb-ink/40 mt-0.5">Total Spent</p>
        </div>
        <div className="bg-[#FFFFFF]/70 border border-otb-sand/50 rounded-sm p-4">
          <p className="text-2xl font-serif font-bold text-otb-ink">{availableCoupons.length}</p>
          <p className="text-xs font-sans text-otb-ink/40 mt-0.5">Available Coupons</p>
        </div>
        <div className="bg-[#FFFFFF]/70 border border-otb-sand/50 rounded-sm p-4">
          <p className="text-sm font-serif font-bold text-otb-ink">{new Date(user.createdAt).toLocaleDateString()}</p>
          <p className="text-xs font-sans text-otb-ink/40 mt-0.5">Member Since</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Link href="/account/orders" className="bg-[#FFFFFF]/70 border border-otb-sand/50 rounded-sm p-6 hover:shadow-sm transition-shadow group">
          <Package size={28} className="text-otb-terracotta mb-3" />
          <h3 className="font-serif text-base text-otb-ink group-hover:text-otb-terracotta transition-colors">My Orders</h3>
          <p className="font-sans text-xs text-otb-ink/40 mt-1">{orders.length} orders placed</p>
        </Link>
        <Link href="/account/profile" className="bg-[#FFFFFF]/70 border border-otb-sand/50 rounded-sm p-6 hover:shadow-sm transition-shadow group">
          <div className="w-14 h-14 rounded-full overflow-hidden flex items-center justify-center bg-otb-terracotta/10 mb-3">
          {user?.avatar && !avatarFailed ? (
            <img src={user.avatar} alt="" className="w-full h-full object-cover" onError={() => setAvatarFailed(true)} />
          ) : (
            <User size={28} className="text-otb-terracotta" />
          )}
        </div>
          <h3 className="font-serif text-base text-otb-ink group-hover:text-otb-terracotta transition-colors">Profile</h3>
          <p className="font-sans text-xs text-otb-ink/40 mt-1">Edit personal info & settings</p>
        </Link>
        <Link href="/account/addresses" className="bg-[#FFFFFF]/70 border border-otb-sand/50 rounded-sm p-6 hover:shadow-sm transition-shadow group">
          <MapPin size={28} className="text-otb-terracotta mb-3" />
          <h3 className="font-serif text-base text-otb-ink group-hover:text-otb-terracotta transition-colors">Addresses</h3>
          <p className="font-sans text-xs text-otb-ink/40 mt-1">{user.addresses?.length || 0} saved addresses</p>
        </Link>
        <Link href="/account/wishlist" className="bg-[#FFFFFF]/70 border border-otb-sand/50 rounded-sm p-6 hover:shadow-sm transition-shadow group">
          <Heart size={28} className="text-otb-terracotta mb-3" />
          <h3 className="font-serif text-base text-otb-ink group-hover:text-otb-terracotta transition-colors">Wishlist</h3>
          <p className="font-sans text-xs text-otb-ink/40 mt-1">{user.wishlist?.length || 0} saved items</p>
        </Link>
      </div>

      {/* My Coupons */}
      <div className="mt-10">
        <h2 className="font-serif text-xl text-otb-ink mb-4 flex items-center gap-2">
          <Ticket size={18} className="text-otb-terracotta" /> My Coupons
        </h2>
        {coupons.length === 0 ? (
          <div className="bg-[#FFFFFF]/70 border border-otb-sand/50 rounded-sm p-8 text-center">
            <p className="font-sans text-sm text-otb-ink/40">No coupons yet. New-user welcome coupons will appear here after you sign up.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {coupons.map((c: any) => {
              const status = c.used ? 'used' : new Date(c.expiresAt).getTime() < Date.now() ? 'expired' : 'active'
              const discountLabel = c.discountType === 'percent' ? `${c.value}% OFF` : `$${c.value} OFF`
              return (
                <div key={c.code + c.issuedAt}
                  className={`bg-[#FFFFFF]/70 border rounded-sm p-5 flex flex-col ${status === 'active' ? 'border-otb-terracotta/30' : 'border-otb-sand/50 opacity-60'}`}>
                  {/* 优惠券图 (后台 AI 生图生成) */}
                  {c.imageUrl && (
                    <div className="mb-3 overflow-hidden rounded-sm">
                      <img src={c.imageUrl} alt={c.name} className="w-full h-24 object-cover" />
                    </div>
                  )}
                  <div className="flex items-center justify-between mb-3">
                    <button onClick={() => copyCoupon(c.code)} className="inline-flex items-center gap-1.5 font-mono text-sm font-bold text-otb-terracotta hover:opacity-70 transition-opacity" title="Copy code">
                      {c.code}
                      {copiedCoupon === c.code ? <Check size={14} className="text-green-600" /> : <Copy size={13} className="text-otb-ink/40" />}
                    </button>
                    <span className="text-micro font-sans font-medium px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: status === 'active' ? 'rgba(194,120,84,0.12)' : status === 'used' ? 'rgba(107,114,128,0.14)' : 'rgba(245,158,11,0.14)',
                        color: status === 'active' ? '#C27854' : status === 'used' ? '#6B7280' : '#D97706',
                      }}>
                      {status === 'active' ? 'Available' : status === 'used' ? 'Used' : 'Expired'}
                    </span>
                  </div>
                  <p className="font-serif text-2xl font-bold text-otb-ink">{discountLabel}</p>
                  <p className="font-sans text-xs text-otb-ink/50 mt-1">{c.name}</p>
                  {c.minSpend > 0 && <p className="font-sans text-micro text-otb-ink/40 mt-2">Min spend ${c.minSpend}</p>}
                  <p className="font-sans text-micro text-otb-ink/40 mt-1">Valid until {new Date(c.expiresAt).toLocaleDateString()}</p>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
}
