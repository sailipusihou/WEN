"use client"
import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { User, Package, MapPin, Heart, LogOut, Star } from "lucide-react"

export default function AccountPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [orders, setOrders] = useState<any[]>([])
  const [customer, setCustomer] = useState<any>(null)
  const [customerTiers, setCustomerTiers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch("/api/auth/user").then(r => r.ok ? r.json() : Promise.reject()),
      fetch("/api/orders").then(r => r.ok ? r.json() : []),
    ]).then(([userData, ordersData]) => {
      setUser(userData.user);
      setCustomer(userData.customer || null);
      setCustomerTiers(userData.customerTiers || []);
      setOrders(Array.isArray(ordersData) ? ordersData : []);
      setLoading(false);
    }).catch(() => { router.push("/login"); setLoading(false) })
  }, [])

  const handleLogout = async () => {
    await fetch("/api/auth/user-logout", { method: "POST" })
    localStorage.removeItem("otm_user"); router.push("/"); window.location.reload()
  }

  if (loading) return <div className="min-h-[60vh] flex items-center justify-center"><div className="w-8 h-8 border-2 border-otb-terracotta border-t-transparent rounded-full animate-spin" /></div>
  if (!user) return null
  
  const totalOrders = customer?.totalOrders || orders.length
  const tierInfo = customerTiers.length > 0
    ? (customerTiers.find(t => totalOrders >= t.minOrders && totalOrders <= t.maxOrders)
       || customerTiers.find(t => t.id === customer?.tier)
       || customerTiers[0])
    : null

  return <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-otb-terracotta/10 flex items-center justify-center text-xl">{(user.firstName?.[0] || "U").toUpperCase()}</div>
          <div>
            <h1 className="font-serif text-2xl md:text-3xl text-otb-ink">Hello, {user.firstName}!</h1>
            <div className="flex items-center gap-2 mt-1">
              <p className="font-sans text-sm text-otb-ink/50">{user.email}</p>
              {tierInfo && (
                <>
                  <div className="flex items-center gap-0.5" style={{ color: tierInfo.color }}>
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={12} fill={i < tierInfo.stars ? 'currentColor' : 'none'} strokeWidth={2} />
                    ))}
                  </div>
                  <span className="text-xs font-sans px-2 py-0.5 rounded-sm" style={{ backgroundColor: tierInfo.bgColor, color: tierInfo.color }}>
                    {tierInfo.name}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
        <button onClick={handleLogout} className="flex items-center gap-1.5 text-sm font-sans text-otb-ink/40 hover:text-red-500 transition-colors"><LogOut size={14} /> Sign Out</button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white/70 border border-otb-sand/50 rounded-sm p-4">
          <p className="text-2xl font-serif font-bold text-otb-terracotta">{totalOrders}</p>
          <p className="text-xs font-sans text-otb-ink/40 mt-0.5">Total Orders</p>
        </div>
        <div className="bg-white/70 border border-otb-sand/50 rounded-sm p-4">
          <p className="text-2xl font-serif font-bold text-otb-ink">${(customer?.totalSpent || orders.reduce((s, o) => s + (o.total || 0), 0)).toFixed(2)}</p>
          <p className="text-xs font-sans text-otb-ink/40 mt-0.5">Total Spent</p>
        </div>
        <div className="bg-white/70 border border-otb-sand/50 rounded-sm p-4">
          <p className="text-sm font-serif font-bold text-otb-ink">{new Date(user.createdAt).toLocaleDateString()}</p>
          <p className="text-xs font-sans text-otb-ink/40 mt-0.5">Member Since</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Link href="/account/orders" className="bg-white/70 border border-otb-sand/50 rounded-sm p-6 hover:shadow-sm transition-shadow group">
          <Package size={28} className="text-otb-terracotta mb-3" />
          <h3 className="font-serif text-base text-otb-ink group-hover:text-otb-terracotta transition-colors">My Orders</h3>
          <p className="font-sans text-xs text-otb-ink/40 mt-1">{orders.length} orders placed</p>
        </Link>
        <Link href="/account/profile" className="bg-white/70 border border-otb-sand/50 rounded-sm p-6 hover:shadow-sm transition-shadow group">
          <div className="w-14 h-14 rounded-full overflow-hidden flex items-center justify-center bg-otb-terracotta/10 mb-3">
          {user?.avatar ? (
            <img src={user.avatar} alt="" className="w-full h-full object-cover" />
          ) : (
            <User size={28} className="text-otb-terracotta" />
          )}
        </div>
          <h3 className="font-serif text-base text-otb-ink group-hover:text-otb-terracotta transition-colors">Profile</h3>
          <p className="font-sans text-xs text-otb-ink/40 mt-1">Edit personal info & settings</p>
        </Link>
        <Link href="/account/addresses" className="bg-white/70 border border-otb-sand/50 rounded-sm p-6 hover:shadow-sm transition-shadow group">
          <MapPin size={28} className="text-otb-terracotta mb-3" />
          <h3 className="font-serif text-base text-otb-ink group-hover:text-otb-terracotta transition-colors">Addresses</h3>
          <p className="font-sans text-xs text-otb-ink/40 mt-1">{user.addresses?.length || 0} saved addresses</p>
        </Link>
        <Link href="/account/wishlist" className="bg-white/70 border border-otb-sand/50 rounded-sm p-6 hover:shadow-sm transition-shadow group">
          <Heart size={28} className="text-otb-terracotta mb-3" />
          <h3 className="font-serif text-base text-otb-ink group-hover:text-otb-terracotta transition-colors">Wishlist</h3>
          <p className="font-sans text-xs text-otb-ink/40 mt-1">{user.wishlist?.length || 0} saved items</p>
        </Link>
      </div>
    </div>
}
