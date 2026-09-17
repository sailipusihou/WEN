'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Heart, ShoppingBag, X } from 'lucide-react'
import { useCart } from '@/context/CartContext'
import { useCurrency } from '@/context/CurrencyContext'
import { useToast } from '@/context/ToastContext'
import { convertPrice, formatPrice } from '@/lib/cart-types'
import { useActivePromotions } from '@/lib/promotion-client'
import { computePromotionForProduct } from '@/lib/promotion-shared'
import { useCategories } from '@/lib/use-categories'
import { useWishlist } from '@/context/WishlistContext'

export default function WishlistPage() {
  const { labelFor } = useCategories()
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const { addItem } = useCart()
  const { currency } = useCurrency()
  const { addToast } = useToast()
  // 收藏 id 一律取自共享 context —— 这样在这里移除商品，页头角标会同步减少；
  // 也省掉了本页原先那次重复的 /api/wishlist 请求。
  const { ids, loaded, toggle: toggleWishlist } = useWishlist()
  // 促销价与全站一致 (修复: 原先收藏夹只显示原价)
  const promotions = useActivePromotions()

  useEffect(() => {
    if (!loaded) return                 // 还没取到收藏 id，保持 loading 态
    if (ids.length === 0) { setItems([]); setLoading(false); return }
    let alive = true
    fetch('/api/products')
      .then(r => (r.ok ? r.json() : []))
      .then((rawData: any) => {
        if (!alive) return
        const allProducts = Array.isArray(rawData) ? rawData : (rawData.items || [])
        setItems(allProducts.filter((p: any) => ids.includes(p.id)))
        setLoading(false)
      })
      .catch(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [ids, loaded])

  const removeFromWishlist = async (id: string) => {
    const r = await toggleWishlist(id)
    if (r.ok) setItems(prev => prev.filter(i => i.id !== id))
    else addToast('Could not update wishlist', 'error')
  }

  const addToCart = (product: any) => {
    addItem({
      id: product.id,
      name: product.name,
      nameEn: product.nameEn || product.name,
      image: product.image,
      price: product.price,
      category: product.category,
    })
  }

  if (loading) return <div className="min-h-[60vh] flex items-center justify-center"><div className="w-8 h-8 border-2 border-otb-terracotta border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      <Link href="/account" className="inline-flex items-center gap-1 font-sans text-sm text-otb-ink/40 hover:text-otb-ink transition-colors mb-6"><ArrowLeft size={14} /> Back to Account</Link>
      <div className="flex items-center gap-2 mb-6"><Heart size={22} className="text-otb-terracotta" /><h1 className="font-serif text-2xl md:text-3xl text-otb-ink">My Wishlist</h1></div>
      {items.length === 0 ? (
        <div className="text-center py-16"><Heart size={40} className="mx-auto text-otb-ink/20 mb-3" /><p className="font-sans text-sm text-otb-ink/40">Your wishlist is empty</p><Link href="/products" className="btn-primary mt-4 inline-flex">Browse Products</Link></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map(item => (
            <div key={item.id} className="bg-[#FFFFFF]/70 border border-otb-sand/50 rounded-sm overflow-hidden group relative">
              <button onClick={() => removeFromWishlist(item.id)} className="absolute top-2 right-2 w-7 h-7 bg-[#FFFFFF]/80 rounded-full flex items-center justify-center hover:bg-[#FFFFFF] transition-colors z-10"><X size={12} className="text-otb-ink/40" /></button>
              <Link href={"/products/" + item.id}>
                <div className="aspect-square bg-otb-sand/20 flex items-center justify-center p-4 overflow-hidden">
                  {item.image ? <img src={item.image} alt={item.nameEn || item.name} className="w-full h-full object-contain" /> : <Heart size={32} className="text-otb-ink/10" />}
                </div>
                <div className="p-3">
                  <p className="font-sans text-xs text-otb-ink/40 tracking-[0.18em] uppercase">{labelFor(item.category)}</p>
                  <p className="font-sans text-sm text-otb-ink truncate mt-0.5">{item.nameEn || item.name}</p>
                  <p className="font-en text-sm font-bold text-otb-terracotta mt-1">{formatPrice(convertPrice(computePromotionForProduct({ id: item.id, category: item.category || '', price: item.price }, promotions).price, currency), currency)}</p>
                </div>
              </Link>
              <div className="px-3 pb-3">
                <button
                  onClick={() => addToCart(item)}
                  className="w-full py-2 bg-otb-ink text-white text-micro tracking-[0.08em] uppercase font-sans font-medium hover:bg-otb-ink/90 transition-colors inline-flex items-center justify-center gap-1.5"
                >
                  <ShoppingBag size={12} /> Add to Cart
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
