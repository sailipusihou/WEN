'use client'

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ArrowUpLeft, Star, ShoppingBag, Plus, Minus, Check, ShieldCheck, Truck, RotateCcw, MessageCircle, Heart } from 'lucide-react'
import { useToast } from '@/context/ToastContext'
import { useCart } from '@/context/CartContext'
import { useCurrency } from '@/context/CurrencyContext'
import { convertPrice, formatPrice } from '@/lib/cart-types'
import type { Product, Review } from '@/lib/products'
import OptimizedImage from '@/components/ui/OptimizedImage'
import { useProductPrice } from '@/lib/promotion-client'
import { buildReferralBioLandingUrl } from '@/lib/referral-links'
import { trackReferralVisit } from '@/lib/referral-client'

function getVisitorId() {
  let id = localStorage.getItem('visitor_id')
  if (!id) {
    id = 'VIS-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).slice(2, 8).toUpperCase()
    localStorage.setItem('visitor_id', id)
  }
  return id
}

function getSessionId() {
  let id = sessionStorage.getItem('session_id')
  if (!id) {
    id = 'SES-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).slice(2, 6).toUpperCase()
    sessionStorage.setItem('session_id', id)
  }
  return id
}

export default function ProductDetailClient({
  product,
  reviews: reviewsProp,
}: {
  product: Product | null
  reviews: Review[]
}) {
  const { addItem } = useCart()
  const { currency } = useCurrency()
  const { addToast } = useToast()
  const eff = useProductPrice(product)
  const searchParams = useSearchParams()
  const [qty, setQty] = useState(1)
  const [added, setAdded] = useState(false)
  const [selectedImage, setSelectedImage] = useState(0)
  const [isWishlisted, setIsWishlisted] = useState(false)
  const [wishlistLoading, setWishlistLoading] = useState(false)
  const [visitRecord, setVisitRecord] = useState<string | null>(null)
  const pageStartTime = useRef(Date.now())
  const recordedRef = useRef<string | null>(null)
  const referralCode = searchParams.get('ref')
  const sourceChannel = searchParams.get('channel') || 'direct'

  // ---- Reviews ----
  const [reviews, setReviews] = useState<Review[]>(reviewsProp)
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewContent, setReviewContent] = useState('')
  const [reviewOrderNo, setReviewOrderNo] = useState('')
  const [reviewEmail, setReviewEmail] = useState('')
  const [reviewSubmitting, setReviewSubmitting] = useState(false)
  const [reviewMsg, setReviewMsg] = useState<{ type: 'success' | 'info' | 'error'; text: string } | null>(null)

  const fetchReviews = async () => {
    if (!product) return
    try {
      const r = await fetch(`/api/reviews?productId=${encodeURIComponent(product.id)}`)
      if (r.ok) setReviews(await r.json())
    } catch {}
  }

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!product || reviewSubmitting) return
    if (!reviewContent.trim()) {
      setReviewMsg({ type: 'error', text: 'Please write your review first.' })
      return
    }
    setReviewSubmitting(true)
    setReviewMsg(null)
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          rating: reviewRating,
          content: reviewContent,
          orderId: reviewOrderNo.trim() || undefined,
          email: reviewEmail.trim() || undefined,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        if (data.verified) {
          setReviewMsg({ type: 'success', text: 'Thanks! Your review is now live below.' })
          setReviewContent('')
          setReviewOrderNo('')
          fetchReviews()
        } else {
          setReviewMsg({ type: 'info', text: 'Review submitted. It will appear after approval. For instant publishing, add a completed order number and its email.' })
          setReviewContent('')
        }
      } else {
        setReviewMsg({ type: 'error', text: data.error || 'Could not submit review. Please try again.' })
      }
    } catch {
      setReviewMsg({ type: 'error', text: 'Connection error. Please try again.' })
    } finally {
      setReviewSubmitting(false)
    }
  }

  // Refresh reviews on the client so newly published reviews appear immediately
  useEffect(() => {
    if (!product) return
    fetchReviews()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id])

  useEffect(() => {
    if (!referralCode) return
    trackReferralVisit({
      refCode: referralCode,
      page: window.location.pathname,
      query: window.location.search,
      sourceChannel,
    })
  }, [referralCode, sourceChannel])

  useEffect(() => {
    if (!product) return
    if (recordedRef.current === product.id) return
    recordedRef.current = product.id
    
    const visitorId = getVisitorId()
    const sessionId = getSessionId()
    
    fetch('/api/browsing-history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        sessionId,
        visitorId,
        productId: product.id,
        productName: product.nameEn || product.name,
        productImage: product.image,
        productPrice: product.price,
        productCode: product.code || '',
        productCategory: product.category,
        pageType: 'product',
      }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.id) {
          setVisitRecord(data.id)
        }
      })
      .catch(() => {})
  }, [product])

  useEffect(() => {
    const handleUnload = () => {
      if (visitRecord) {
        const duration = Math.floor((Date.now() - pageStartTime.current) / 1000)
        fetch('/api/browsing-history', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            id: visitRecord,
            duration,
          }),
        }).catch(() => {})
      }
    }

    window.addEventListener('beforeunload', handleUnload)
    return () => {
      window.removeEventListener('beforeunload', handleUnload)
      handleUnload()
    }
  }, [visitRecord])

  const handleToggleWishlist = async () => {
    if (!product || wishlistLoading) return
    setWishlistLoading(true)
    try {
      const res = await fetch('/api/wishlist', {
        method: isWishlisted ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: product.id }),
      })
      if (res.ok) {
        setIsWishlisted(!isWishlisted)
        addToast(isWishlisted ? 'Removed from wishlist' : 'Saved to wishlist', 'success')
      } else if (res.status === 401) {
        addToast('Please sign in to save items', 'error')
      } else {
        addToast('Could not update wishlist', 'error')
      }
    } catch {
      addToast('Connection error', 'error')
    } finally {
      setWishlistLoading(false)
    }
  }

  if (!product) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-[#F8F5F0]">
        <p className="font-en text-2xl text-[#6B6B6B]">Piece not found</p>
      </div>
    )
  }

  const images = [product.image, ...(product.detailImages || [])]

  const handleAddToCart = () => {
    for (let i = 0; i < qty; i++) {
      addItem({
        id: product.id, name: product.name,
        nameEn: product.nameEn || product.name,
        image: product.image, price: eff.price,
        category: product.category,
      })
    }
    setAdded(true)
    addToast(`Added to cart`, 'success')
    setTimeout(() => setAdded(false), 2000)
  }

  return (
    <div className="bg-[#F8F5F0] min-h-screen">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-8 md:py-12">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 font-sans text-[10px] text-[#6B6B6B]/50 tracking-wider uppercase mb-10">
          <Link href="/" className="hover:text-[#2C2C2C] transition-colors">Home</Link>
          <span>/</span>
          <Link href="/products" className="hover:text-[#2C2C2C] transition-colors">All Objects</Link>
          <span>/</span>
          <span className="text-[#8B7D5C]">{product.nameEn || product.name}</span>
        </nav>

        {referralCode && (
          <div className="mb-8 rounded-2xl border border-[#B8A06C]/20 bg-white/70 px-5 py-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-sans text-[10px] uppercase tracking-[0.18em] text-[#8B7D5C]">
                  Social Attribution Active
                </p>
                <p className="mt-1 font-sans text-sm text-[#2C2C2C]">
                  当前商品详情页已承接来自社交流量的追踪参数，后续下单可继续归因。
                </p>
              </div>
              <Link
                href={buildReferralBioLandingUrl({ code: referralCode, productId: product.id, sourceChannel })}
                className="inline-flex items-center justify-center px-4 py-2 text-xs tracking-[0.08em] uppercase font-sans font-medium border border-[#EDE8DC] hover:border-[#8B7D5C]/40 hover:bg-[#8B7D5C]/5 transition-colors"
              >
                Back to Link in Bio
              </Link>
            </div>
          </div>
        )}

        {/* Product Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-16">
          {/* Gallery */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="relative aspect-[4/5] bg-[#EDE8DC]/30 overflow-hidden mb-3 group">
              <OptimizedImage
                src={images[selectedImage]}
                alt={product.nameEn || product.name}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="transition-transform duration-700 group-hover:scale-105"
                objectFit="cover"
                placeholder="blur"
              />
            </div>
            {images.length > 1 && (
              <div className="flex gap-2">
                {images.map((img, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setSelectedImage(i)}
                    className={`relative w-16 h-16 overflow-hidden border transition-colors ${i === selectedImage ? 'border-[#2C2C2C]' : 'border-[#EDE8DC] hover:border-[#B8A06C]/50'}`}
                    aria-label={`View image ${i + 1}`}
                  >
                    <OptimizedImage
                      src={img}
                      alt={`${product.nameEn || product.name} thumbnail ${i + 1}`}
                      fill
                      sizes="64px"
                      objectFit="cover"
                      placeholder="blur"
                    />
                  </button>
                ))}
              </div>
            )}
          </motion.div>

          {/* Info */}
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.15 }}>
            <span className="font-sans text-[10px] text-[#B8A06C] tracking-[0.15em] uppercase font-medium">
              {product.category === 'cultural-gifts' ? 'Cultural Gifts' : product.category === 'home-decor' ? 'Home Decor' : 'Creative Gifts'}
            </span>
            <h1 className="font-en text-3xl md:text-4xl text-[#2C2C2C] font-semibold mt-2 tracking-tight">
              {product.nameEn || product.name}
            </h1>
            <p className="font-sans text-sm text-[#6B6B6B]/60 mt-2 leading-relaxed">{product.subtitleEn || product.subtitle}</p>

            {/* Price */}
            <div className="flex items-baseline gap-3 mt-6">
              <span className="font-en text-3xl font-semibold text-[#2C2C2C]">{formatPrice(convertPrice(eff.price, currency), currency)}</span>
              {(eff.originalPrice || product.originalPrice) && (
                <span className="font-sans text-sm text-[#6B6B6B]/40 line-through">{formatPrice(convertPrice(eff.originalPrice || product.originalPrice || 0, currency), currency)}</span>
              )}
            </div>

            {/* Craft details */}
            <div className="grid grid-cols-2 gap-4 mt-8 py-6 border-t border-[#EDE8DC]/60">
              <div>
                <span className="font-sans text-[9px] text-[#6B6B6B]/40 tracking-wider uppercase">Craft</span>
                <p className="font-sans text-sm text-[#2C2C2C] mt-0.5">{product.craftEn || product.craft}</p>
              </div>
              <div>
                <span className="font-sans text-[9px] text-[#6B6B6B]/40 tracking-wider uppercase">Material</span>
                <p className="font-sans text-sm text-[#2C2C2C] mt-0.5">{product.material}</p>
              </div>
              <div>
                <span className="font-sans text-[9px] text-[#6B6B6B]/40 tracking-wider uppercase">Origin</span>
                <p className="font-sans text-sm text-[#2C2C2C] mt-0.5">{product.origin}</p>
              </div>
              <div>
                <span className="font-sans text-[9px] text-[#6B6B6B]/40 tracking-wider uppercase">Rating</span>
                <div className="flex items-center gap-1 mt-0.5">
                  <Star size={12} className="fill-[#B8A06C] text-[#B8A06C]" />
                  <span className="font-sans text-sm text-[#2C2C2C]">{product.rating}</span>
                  <span className="font-sans text-xs text-[#6B6B6B]/40">({product.reviewCount})</span>
                </div>
              </div>
            </div>

            {/* Description */}
            <p className="font-sans text-sm text-[#6B6B6B]/70 leading-relaxed mt-6">
              {product.descriptionEn || product.description}
            </p>

            {/* Tags */}
            <div className="flex flex-wrap gap-2 mt-4">
              {(product.tagsEn || product.tags).map((tag, i) => (
                <span key={i} className="font-sans text-[10px] text-[#8B7D5C] bg-[#8B7D5C]/5 border border-[#B8A06C]/20 px-2.5 py-1 tracking-wider uppercase">{tag}</span>
              ))}
            </div>

            {/* Quantity + Add to Cart */}
            <div className="flex items-center gap-3 mt-8">
              <div className="flex items-center border border-[#EDE8DC]">
                <button type="button" onClick={() => setQty(Math.max(1, qty - 1))} className="p-3 text-[#6B6B6B] hover:text-[#2C2C2C] transition-colors"><Minus size={14} strokeWidth={1.5} /></button>
                <span className="px-4 font-sans text-sm text-[#2C2C2C] min-w-[2rem] text-center">{qty}</span>
                <button type="button" onClick={() => setQty(qty + 1)} className="p-3 text-[#6B6B6B] hover:text-[#2C2C2C] transition-colors"><Plus size={14} strokeWidth={1.5} /></button>
              </div>
              <button type="button" onClick={handleAddToCart}
                className={`flex-1 flex items-center justify-center gap-2 px-8 py-3.5 text-xs tracking-[0.08em] uppercase font-sans font-medium transition-all duration-300 ${added ? 'bg-[#8B7D5C] text-white' : 'bg-[#2C2C2C] text-white hover:bg-[#1A1A1A]'}`}>
                {added ? <><Check size={14} strokeWidth={1.5} /> Added to Cart</> : <><ShoppingBag size={14} strokeWidth={1.5} /> Add to Cart</>}
              </button>
              <button
                type="button"
                onClick={handleToggleWishlist}
                disabled={wishlistLoading}
                className={`p-3.5 border transition-all duration-300 ${
                  isWishlisted
                    ? 'border-[#B85450] bg-[#B85450]/5 text-[#B85450]'
                    : 'border-[#EDE8DC] text-[#6B6B6B] hover:text-[#2C2C2C] hover:border-[#2C2C2C]'
                } ${wishlistLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
              >
                <Heart size={16} strokeWidth={1.5} fill={isWishlisted ? 'currentColor' : 'none'} />
              </button>
            </div>

            {/* Customer service link */}
            <Link href={"/messages?product=" + product.id}
              className="inline-flex items-center gap-2 mt-4 px-4 py-2 text-xs border border-[#EDE8DC] rounded-sm hover:border-[#8B7D5C]/40 hover:bg-[#8B7D5C]/5 transition-colors font-sans">
              <MessageCircle size={14} strokeWidth={1.5} className="text-[#8B7D5C]" />
              <span className="text-[#6B6B6B]">Ask about this piece</span>
              <span className="text-[10px] text-[#8B7D5C]/60">→</span>
            </Link>

            {/* Trust */}
            <div className="flex flex-wrap gap-5 mt-8 pt-6 border-t border-[#EDE8DC]/60">
              {[
                { icon: ShieldCheck, text: 'Authenticity Guaranteed' },
                { icon: Truck, text: 'Worldwide Shipping' },
                { icon: RotateCcw, text: '30-Day Returns' },
              ].map((item) => (
                <div key={item.text} className="flex items-center gap-1.5 text-[10px] text-[#6B6B6B]/50 font-sans tracking-wider uppercase">
                  <item.icon size={12} strokeWidth={1.5} /> {item.text}
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Cultural Story */}
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mt-20 max-w-3xl mx-auto">
          <div className="divider-premium" />
          <h2 className="font-en text-2xl md:text-3xl text-[#2C2C2C] font-semibold mt-10 text-center tracking-tight">The Story Behind This Piece</h2>
          <div className="mt-8 bg-white/70 border border-[#EDE8DC]/50 p-8 md:p-12">
            <p className="font-sans text-[#6B6B6B]/70 leading-loose text-sm md:text-base">{product.storyEn || product.story}</p>
          </div>
        </motion.div>

        {/* Reviews */}
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mt-20 max-w-3xl mx-auto">
          <div className="divider-premium" />
          <h2 className="font-en text-2xl md:text-3xl text-[#2C2C2C] font-semibold mt-10 text-center tracking-tight">Reviews</h2>

          {/* Write a review */}
          <form onSubmit={handleSubmitReview} className="mt-8 bg-white/70 border border-[#EDE8DC]/50 p-6 md:p-8">
            <h3 className="font-en text-lg text-[#2C2C2C] font-semibold">Write a Review</h3>
            <p className="font-sans text-[11px] text-[#6B6B6B]/60 mt-1 leading-relaxed">
              Finished your order? Enter the order number and email used at checkout to publish your review instantly.
            </p>
            <div className="flex items-center gap-1 mt-4">
              {[1, 2, 3, 4, 5].map(n => (
                <button key={n} type="button" onClick={() => setReviewRating(n)} aria-label={`${n} star${n > 1 ? 's' : ''}`} className="p-0.5">
                  <Star size={20} className={n <= reviewRating ? 'fill-[#B8A06C] text-[#B8A06C]' : 'text-[#D8CFC0]'} />
                </button>
              ))}
              <span className="font-sans text-[11px] text-[#6B6B6B]/50 ml-2">{reviewRating}/5</span>
            </div>
            <textarea
              value={reviewContent}
              onChange={e => setReviewContent(e.target.value)}
              rows={3}
              maxLength={2000}
              placeholder="Share your experience with this piece..."
              className="mt-3 w-full px-4 py-3 border border-[#EDE8DC] bg-white text-sm font-sans text-[#2C2C2C] placeholder:text-[#6B6B6B]/35 focus:outline-none focus:border-[#B8A06C]/50 transition-colors"
            />
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                value={reviewOrderNo}
                onChange={e => setReviewOrderNo(e.target.value)}
                placeholder="Order number (e.g. OTM-XXXX)"
                className="px-4 py-2.5 border border-[#EDE8DC] bg-white text-sm font-sans text-[#2C2C2C] placeholder:text-[#6B6B6B]/35 focus:outline-none focus:border-[#B8A06C]/50 transition-colors"
              />
              <input
                value={reviewEmail}
                onChange={e => setReviewEmail(e.target.value)}
                type="email"
                placeholder="Email used at checkout (optional)"
                className="px-4 py-2.5 border border-[#EDE8DC] bg-white text-sm font-sans text-[#2C2C2C] placeholder:text-[#6B6B6B]/35 focus:outline-none focus:border-[#B8A06C]/50 transition-colors"
              />
            </div>
            {reviewMsg && (
              <p className={`font-sans text-[11px] mt-3 ${reviewMsg.type === 'error' ? 'text-red-500' : reviewMsg.type === 'success' ? 'text-[#6E8B83]' : 'text-[#6B6B6B]/60'}`}>
                {reviewMsg.text}
              </p>
            )}
            <button
              type="submit"
              disabled={reviewSubmitting}
              className="mt-4 px-6 py-3 bg-[#2C2C2C] text-white text-[10px] tracking-[0.12em] uppercase font-sans font-medium hover:bg-[#4A4D52] transition-colors disabled:opacity-50"
            >
              {reviewSubmitting ? 'Submitting...' : 'Submit Review'}
            </button>
          </form>

          {/* Review list */}
          <div className="mt-8 space-y-4">
            {reviews.length === 0 ? (
              <p className="text-center font-sans text-sm text-[#6B6B6B]/50 py-8">No reviews yet — be the first to share your experience.</p>
            ) : (
              reviews.map((review, i) => (
                <motion.div key={review.id} initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                  className="bg-white/70 border border-[#EDE8DC]/50 p-6 md:p-8">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#EDE8DC]/50 flex items-center justify-center font-sans text-sm text-[#6B6B6B] overflow-hidden">
                        {review.avatar && (review.avatar.startsWith("http") || review.avatar.startsWith("/api/uploads") || review.avatar.startsWith("/images/")) ? (
                          <img src={review.avatar} alt={review.author} className="w-full h-full object-cover" />
                        ) : (review.avatar)}
                      </div>
                      <div>
                        <p className="font-sans text-sm text-[#2C2C2C] font-medium">{review.author}</p>
                        <p className="font-sans text-[10px] text-[#6B6B6B]/40">{review.location} · {review.date}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5">
                      {Array(review.rating).fill(0).map((_, j) => (<Star key={j} size={11} className="fill-[#B8A06C] text-[#B8A06C]" />))}
                    </div>
                  </div>
                  <p className="mt-3 font-sans text-sm text-[#6B6B6B]/70 leading-relaxed">{review.content}</p>
                </motion.div>
              ))
            )}
          </div>
        </motion.div>

        <div className="mt-16 text-center">
          <Link href="/#products" className="inline-flex items-center gap-1.5 text-xs text-[#6B6B6B] hover:text-[#2C2C2C] transition-colors tracking-wider uppercase font-sans font-medium">
            <ArrowUpLeft size={12} strokeWidth={1.5} /> Back to Collection
          </Link>
        </div>
      </div>
    </div>
  )
}
