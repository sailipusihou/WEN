'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowUpLeft, ShoppingBag, CheckCircle, Loader2, ChevronDown } from 'lucide-react'
import { useCart } from '@/context/CartContext'
import { useCurrency } from '@/context/CurrencyContext'
import { convertPrice, formatPrice } from '@/lib/cart-types'
import { getOrCreateVisitorId, getStoredReferralChannel, getStoredReferralCode } from '@/lib/referral-client'
import { useActivePromotions } from '@/lib/promotion-client'
import { computePromotionForProduct } from '@/lib/promotion-shared'

export default function CheckoutPage() {
  const { items, subtotal, clearCart } = useCart()
  const { currency } = useCurrency()
  const promotions = useActivePromotions()
  const discountedItems = items.map(item => {
    const eff = computePromotionForProduct({ id: item.id, category: item.category || '', price: item.price }, promotions)
    return { ...item, price: eff.price }
  })
  const discountedSubtotal = Math.round(discountedItems.reduce((s, i) => s + i.price * i.quantity, 0) * 100) / 100
  const [submitted, setSubmitted] = useState(false)
  const [shipping, setShipping] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    address: '', city: '', state: '', zipCode: '', country: 'United States',
  })
  const [paypalReady, setPaypalReady] = useState(false)
  const [orderId, setOrderId] = useState('')
  const [processing, setProcessing] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const [paypalError, setPaypalError] = useState('')
  const [payoneerError, setPayoneerError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [shippingCost, setShippingCost] = useState(0)
  const [estimatedDays, setEstimatedDays] = useState('')
  const [shippingZone, setShippingZone] = useState<any>(null)
  const [payoneerEnabled, setPayoneerEnabled] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<'paypal' | 'payoneer'>('paypal')
  const [referralCode, setReferralCode] = useState('')
  const [referralInfo, setReferralInfo] = useState<any>(null)
  const [referralChannel, setReferralChannel] = useState('bio')
  const [couponCode, setCouponCode] = useState('')
  const [couponDiscount, setCouponDiscount] = useState(0)
  const [couponMsg, setCouponMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [couponApplying, setCouponApplying] = useState(false)
  const [couponAppliedCode, setCouponAppliedCode] = useState('')

  useEffect(() => {
    fetch('/api/auth/user').then(r => r.ok ? r.json() : null).then(d => { if (d?.user?.email) setUserEmail(d.user.email) }).catch(() => {})
  }, [])

  useEffect(() => {
    const storedCode = getStoredReferralCode()
    const storedChannel = getStoredReferralChannel()
    if (!storedCode) return
    setReferralCode(storedCode)
    if (storedChannel) setReferralChannel(storedChannel)
    fetch(`/api/referrals?code=${encodeURIComponent(storedCode)}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.link) setReferralInfo(d.link)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    Promise.all([
      fetch('/api/paypal/config').then(r => r.json()).catch(() => ({ enabled: false })),
      fetch('/api/payoneer/config').then(r => r.json()).catch(() => ({ enabled: false })),
    ]).then(([paypalConfig, payoneerConfig]) => {
      if (!paypalConfig.enabled && payoneerConfig.enabled) {
        setPaymentMethod('payoneer')
      }
      setPayoneerEnabled(payoneerConfig.enabled)
    })
  }, [])

  useEffect(() => {
    let cancelled = false
    fetch(`/api/shipping?country=${encodeURIComponent(shipping.country)}&subtotal=${discountedSubtotal}`)
      .then(r => r.ok ? r.json() : { cost: 250, estimatedDays: '14-21', zone: null })
      .then(d => {
        if (cancelled) return
        setShippingCost(Number(d.cost) || 0)
        setEstimatedDays(d.estimatedDays || '14-21')
        setShippingZone(d.zone || null)
      }).catch(() => {
        if (cancelled) return
        setShippingCost(250)
        setEstimatedDays('14-21')
        setShippingZone(null)
      })
    return () => { cancelled = true }
  }, [shipping.country, discountedSubtotal])

  const totalPrice = Math.round((discountedSubtotal - couponDiscount + shippingCost) * 100) / 100

  const applyCoupon = async () => {
    const code = couponCode.trim()
    if (!code) return
    setCouponApplying(true)
    setCouponMsg(null)
    try {
      const res = await fetch('/api/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'apply', code, subtotal: discountedSubtotal }),
      })
      const d = await res.json()
      if (d.ok) {
        setCouponDiscount(d.discount)
        setCouponAppliedCode(code.toUpperCase())
        setCouponMsg({ type: 'ok', text: `Coupon applied: -${formatPrice(convertPrice(d.discount, currency), currency)}` })
      } else {
        setCouponDiscount(0)
        setCouponAppliedCode('')
        setCouponMsg({ type: 'err', text: d.error || 'Invalid coupon code' })
      }
    } catch {
      setCouponMsg({ type: 'err', text: 'Could not apply coupon' })
    } finally {
      setCouponApplying(false)
    }
  }

  const updateField = (f: string, v: string) => {
    setShipping(prev => ({ ...prev, [f]: v }))
    if (fieldErrors[f]) setFieldErrors(prev => ({ ...prev, [f]: '' }))
  }

  const validateShipping = () => {
    const errs: Record<string, string> = {}
    if (!shipping.firstName.trim()) errs.firstName = 'Required'
    if (!shipping.lastName.trim()) errs.lastName = 'Required'
    if (!shipping.email.trim()) errs.email = 'Required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(shipping.email)) errs.email = 'Invalid email'
    if (!shipping.address.trim()) errs.address = 'Required'
    if (!shipping.city.trim()) errs.city = 'Required'
    if (!shipping.zipCode.trim()) errs.zipCode = 'Required'
    setFieldErrors(errs)
    return Object.keys(errs).length === 0
  }

  const submitOrder = async (paypalTransaction?: any) => {
    const res = await fetch('/api/orders', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: discountedItems, shipping, subtotal: discountedSubtotal, shippingCost,
        discount: couponDiscount, couponCode: couponAppliedCode || undefined,
        total: totalPrice, currency, notes: `Payment: ${paymentMethod === 'payoneer' ? 'Payoneer' : 'PayPal'}`, userEmail,
        paymentMethod,
        paypalTransaction: paypalTransaction || null,
        referralCode: referralCode || undefined,
        referralVisitorId: referralCode ? getOrCreateVisitorId() : undefined,
      }),
    })
    if (!res.ok) throw new Error('Order creation failed')
    const d = await res.json()
    setOrderId(d.id)
    return d
  }

  useEffect(() => {
    if (!paypalReady) return
    const container = document.getElementById('paypal-button-container')
    if (!container || !(window as any).paypal) return
    ;(window as any).paypal.Buttons({
      createOrder: () =>
        fetch('/api/create-paypal-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: convertPrice(totalPrice, 'USD') }),
        }).then(r => r.json()).then(d => { if (d.error) throw new Error(d.error); return d.id }),
      onApprove: async (data: any) => {
        setProcessing(true)
        setPaypalError('')
        try {
          const capRes = await fetch('/api/capture-paypal-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ paypalOrderId: data.orderID }),
          })
          const capData = await capRes.json()
          if (!capRes.ok || capData.status !== 'COMPLETED')
            throw new Error(capData.error || 'Capture failed')
          
          const paypalTransaction = {
            orderId: data.orderID,
            captureId: capData.captureId,
            transactionId: capData.transactionId,
            amount: capData.amount,
            fee: capData.fee,
            netAmount: capData.netAmount,
            currency: capData.currency,
            status: capData.status,
            createdAt: capData.createTime,
            updatedAt: capData.updateTime,
          }
          
          await submitOrder(paypalTransaction)
          clearCart()
          setSubmitted(true)
        } catch (e: any) {
          setPaypalError(e.message || 'Payment verification failed')
        } finally {
          setProcessing(false)
        }
      },
      onError: () => {
        setPaypalError('A PayPal error occurred. Please try again.')
      },
    }).render(container)
  }, [paypalReady])

  const handlePayPalClick = async () => {
    if (!validateShipping()) return
    if (paypalReady) return
    try {
      const res = await fetch('/api/paypal/config')
      const config = await res.json()
      if (!config.enabled || !config.clientId) {
        setPaypalError('PayPal is not available at the moment.')
        return
      }
      const locale = navigator.language || 'en_US'
      const script = document.createElement('script')
      script.src = `https://www.paypal.com/sdk/js?client-id=${config.clientId}&currency=USD&intent=capture&locale=${locale}`
      script.onload = () => setPaypalReady(true)
      script.onerror = () => setPaypalError('Failed to load PayPal. Please try again.')
      document.body.appendChild(script)
    } catch {
      setPaypalError('PayPal configuration error.')
    }
  }

  const handlePayoneerClick = async () => {
    if (!validateShipping()) return
    if (processing) return
    try {
      setProcessing(true)
      const res = await fetch('/api/payoneer/config')
      const config = await res.json()
      if (!config.enabled || !config.clientId) {
        setPayoneerError('Payoneer is not available at the moment.')
        setProcessing(false)
        return
      }
      
      const orderData = await submitOrder(null)
      if (!orderData) {
        setProcessing(false)
        return
      }
      
      const createRes = await fetch('/api/create-payoneer-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: totalPrice,
          orderId: orderData.id,
          customerEmail: shipping.email || userEmail,
        }),
      })
      
      const payoneerOrder = await createRes.json()
      if (payoneerOrder.id) {
        window.location.href = payoneerOrder.redirectUrl || ''
      } else {
        setPayoneerError(payoneerOrder.error || 'Failed to create Payoneer order')
      }
    } catch (e) {
      setPayoneerError('Payoneer configuration error: ' + (e as Error).message)
    } finally {
      setProcessing(false)
    }
  }

  if (items.length === 0 && !submitted) {
    return <div className="min-h-[70vh] flex items-center justify-center bg-[#F8F5F0]">
      <div className="text-center max-w-md mx-auto px-6">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-[#EDE8DC]/50 flex items-center justify-center">
          <ShoppingBag size={32} strokeWidth={1} className="text-[#6B6B6B]/30" />
        </div>
        <h1 className="font-en text-2xl md:text-3xl text-[#2C2C2C] font-semibold tracking-tight mb-2">Cart is empty</h1>
        <Link href="/" className="inline-flex items-center gap-2 px-8 py-3 bg-[#2C2C2C] text-white text-xs tracking-[0.08em] uppercase font-sans font-medium hover:bg-[#1A1A1A] transition-colors mt-4">Shop Now</Link>
      </div>
    </div>
  }

  if (submitted) {
    return <div className="min-h-[70vh] flex items-center justify-center bg-[#F8F5F0]">
      <div className="w-full max-w-4xl mx-auto px-6 py-10">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-green-50 flex items-center justify-center">
          <CheckCircle size={32} strokeWidth={1} className="text-green-600" />
        </div>
        <div className="text-center max-w-2xl mx-auto">
          <h1 className="font-en text-2xl md:text-4xl text-[#2C2C2C] font-semibold tracking-tight mb-2">Order Confirmed</h1>
          <p className="font-sans text-sm md:text-base text-[#6B6B6B]/70 mb-3">
            Thank you for your order. Your payment and fulfillment request are now in our system.
          </p>
          {orderId && (
            <div className="mb-8">
              <p className="font-sans text-xs text-[#6B6B6B]/40 mb-2">Order #{orderId}</p>
              <p className="font-sans text-xs text-[#6B6B6B]/30">
                Bookmark this page or save your order ID to track shipping, support updates, and attribution status.
              </p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] gap-6">
          <div className="space-y-6">
            {referralInfo ? (
              <div className="rounded-[24px] border border-[#B8A06C]/20 bg-white/80 p-6">
                <p className="font-sans text-[10px] uppercase tracking-[0.16em] text-[#8B7D5C]">Marketing Attribution Recorded</p>
                <p className="mt-2 font-sans text-sm leading-7 text-[#2C2C2C]">
                  本次订单已保留来自 {referralInfo.platform} {referralInfo.platformUsername ? `@${referralInfo.platformUsername}` : ''} 的营销链路，
                  后台会继续把订单和社交内容、staff、tracking 统计关联起来。
                </p>
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="rounded-2xl bg-[#F8F5F0] px-4 py-3">
                    <p className="font-sans text-[10px] uppercase tracking-[0.12em] text-[#8B7D5C]">Referral Code</p>
                    <p className="mt-1 font-sans text-sm text-[#2C2C2C]">{referralInfo.code}</p>
                  </div>
                  <div className="rounded-2xl bg-[#F8F5F0] px-4 py-3">
                    <p className="font-sans text-[10px] uppercase tracking-[0.12em] text-[#8B7D5C]">Source Channel</p>
                    <p className="mt-1 font-sans text-sm text-[#2C2C2C]">{referralInfo.platform}{referralInfo.platformUsername ? ` · @${referralInfo.platformUsername}` : ''}</p>
                  </div>
                  <div className="rounded-2xl bg-[#F8F5F0] px-4 py-3">
                    <p className="font-sans text-[10px] uppercase tracking-[0.12em] text-[#8B7D5C]">Promoted Product</p>
                    <p className="mt-1 font-sans text-sm text-[#2C2C2C]">{referralInfo.productName || 'General collection'}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-[24px] border border-[#EDE8DC] bg-white/80 p-6">
                <p className="font-sans text-[10px] uppercase tracking-[0.16em] text-[#8B7D5C]">Organic Checkout</p>
                <p className="mt-2 font-sans text-sm leading-7 text-[#2C2C2C]">
                  本次订单未带营销 referral，系统会按自然流量订单处理。后续如果从社交入口进入再下单，订单页会自动显示归因信息。
                </p>
              </div>
            )}

            <div className="rounded-[24px] border border-[#EDE8DC] bg-white/80 p-6">
              <p className="font-sans text-[10px] uppercase tracking-[0.16em] text-[#8B7D5C]">What Happens Next</p>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                  'Order confirmation email is sent to your inbox.',
                  'Operations team receives order and attribution context together.',
                  'Tracking page and account order page keep this purchase visible end to end.',
                ].map(item => (
                  <div key={item} className="rounded-2xl bg-[#F8F5F0] px-4 py-4 font-sans text-sm leading-6 text-[#6B6B6B]">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-[24px] border border-[#EDE8DC] bg-white/80 p-6">
              <p className="font-sans text-[10px] uppercase tracking-[0.16em] text-[#8B7D5C]">Fulfillment Snapshot</p>
              <div className="mt-4 space-y-3">
                <div className="rounded-2xl bg-[#F8F5F0] px-4 py-3">
                  <p className="font-sans text-[10px] uppercase tracking-[0.12em] text-[#8B7D5C]">Payment Method</p>
                  <p className="mt-1 font-sans text-sm text-[#2C2C2C]">{paymentMethod === 'payoneer' ? 'Payoneer' : 'PayPal'}</p>
                </div>
                <div className="rounded-2xl bg-[#F8F5F0] px-4 py-3">
                  <p className="font-sans text-[10px] uppercase tracking-[0.12em] text-[#8B7D5C]">Delivery Estimate</p>
                  <p className="mt-1 font-sans text-sm text-[#2C2C2C]">{estimatedDays} days</p>
                </div>
                <div className="rounded-2xl bg-[#F8F5F0] px-4 py-3">
                  <p className="font-sans text-[10px] uppercase tracking-[0.12em] text-[#8B7D5C]">Shipping Zone</p>
                  <p className="mt-1 font-sans text-sm text-[#2C2C2C]">{shippingZone?.name || shipping.country}</p>
                </div>
              </div>
            </div>

            <div className="rounded-[24px] border border-[#EDE8DC] bg-white/80 p-6">
              <p className="font-sans text-[10px] uppercase tracking-[0.16em] text-[#8B7D5C]">Next Actions</p>
              <div className="mt-4 flex flex-col gap-3">
                {orderId && (
                  <Link href={`/order-tracking?id=${orderId}`} className="px-6 py-3 bg-[#B8A06C] text-white text-xs tracking-[0.08em] uppercase font-sans font-medium hover:bg-[#A08A5A] transition-colors text-center">
                    Track Order
                  </Link>
                )}
                <Link href={"/account/orders"} className="px-6 py-3 bg-[#2C2C2C] text-white text-xs tracking-[0.08em] uppercase font-sans font-medium hover:bg-[#1A1A1A] transition-colors text-center">
                  View Orders
                </Link>
                <Link href={referralCode ? `/link-in-bio?ref=${referralCode}${referralInfo?.productId ? `&product=${referralInfo.productId}` : ''}${referralChannel ? `&channel=${referralChannel}` : ''}` : "/"} className="px-6 py-3 border border-[#E0D6C2] text-[#2C2C2C] text-xs tracking-[0.08em] uppercase font-sans font-medium hover:border-[#B8A06C] transition-colors text-center">
                  {referralCode ? 'Back To Campaign Landing' : 'Continue Shopping'}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  }

  return (
    <div className="bg-[#F8F5F0] min-h-screen">
      <div className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-12 py-8 md:py-12">
        <Link href="/cart" className="inline-flex items-center gap-1 font-sans text-xs text-[#6B6B6B]/50 hover:text-[#2C2C2C] transition-colors mb-8 tracking-wider uppercase">
          <ArrowUpLeft size={12} strokeWidth={1.5} /> Back to Cart
        </Link>
        <h1 className="font-en text-3xl md:text-4xl text-[#2C2C2C] font-semibold tracking-tight mb-10">Checkout</h1>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {referralInfo && (
              <div className="bg-white/80 border border-[#EDE8DC]/50 p-6 md:p-8">
                <p className="font-sans text-[10px] text-[#B8A06C] tracking-[0.15em] uppercase font-medium mb-3">Attribution Active</p>
                <div className="space-y-2">
                  <p className="font-sans text-sm text-[#2C2C2C]">
                    本次结账已绑定营销归因，订单会关联到对应社交内容与 staff。
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="rounded-xl bg-[#F8F5F0] px-4 py-3">
                      <p className="font-sans text-[10px] uppercase tracking-[0.12em] text-[#8B7D5C]">Referral Code</p>
                      <p className="mt-1 font-sans text-sm text-[#2C2C2C]">{referralInfo.code}</p>
                    </div>
                    <div className="rounded-xl bg-[#F8F5F0] px-4 py-3">
                      <p className="font-sans text-[10px] uppercase tracking-[0.12em] text-[#8B7D5C]">Source</p>
                      <p className="mt-1 font-sans text-sm text-[#2C2C2C]">{referralInfo.platform}{referralInfo.platformUsername ? ` · @${referralInfo.platformUsername}` : ''}{referralChannel ? ` · ${referralChannel}` : ''}</p>
                    </div>
                    <div className="rounded-xl bg-[#F8F5F0] px-4 py-3">
                      <p className="font-sans text-[10px] uppercase tracking-[0.12em] text-[#8B7D5C]">Promoted Product</p>
                      <p className="mt-1 font-sans text-sm text-[#2C2C2C]">{referralInfo.productName || 'General collection'}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {/* Shipping */}
            <div className="bg-white/80 border border-[#EDE8DC]/50 p-6 md:p-8">
              <h2 className="font-sans text-[10px] text-[#B8A06C] tracking-[0.15em] uppercase font-medium mb-5">Shipping Information</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { key: 'firstName', placeholder: 'First Name *', colSpan: false },
                  { key: 'lastName', placeholder: 'Last Name *', colSpan: false },
                  { key: 'email', placeholder: 'Email *', type: 'email', colSpan: true },
                  { key: 'phone', placeholder: 'Phone', type: 'tel', colSpan: true },
                  { key: 'address', placeholder: 'Address *', colSpan: true },
                  { key: 'city', placeholder: 'City *', colSpan: false },
                  { key: 'state', placeholder: 'State', colSpan: false },
                  { key: 'zipCode', placeholder: 'ZIP Code *', colSpan: false },
                ].map(({ key, placeholder, type, colSpan }) => (
                  <div key={key} className={colSpan ? 'sm:col-span-2' : ''}>
                    <input
                      type={type || 'text'}
                      value={(shipping as any)[key]}
                      onChange={e => updateField(key, e.target.value)}
                      placeholder={placeholder}
                      className={'input-premium ' + (fieldErrors[key] ? 'border-red-400' : '')}
                    />
                    {fieldErrors[key] && <p className="text-red-500 text-[10px] mt-1 font-sans">{fieldErrors[key]}</p>}
                  </div>
                ))}
                <select value={shipping.country} onChange={e => updateField('country', e.target.value)}
                  className="input-premium sm:col-span-2">
                  <option>United States</option><option>Canada</option><option>United Kingdom</option>
                  <option>Germany</option><option>France</option><option>Italy</option>
                  <option>Spain</option><option>Netherlands</option><option>Australia</option>
                  <option>Japan</option><option>South Korea</option><option>Singapore</option>
                  <option>Other</option>
                </select>
                {shippingZone && (
                  <p className="sm:col-span-2 font-sans text-[10px] text-[#6B6B6B]/50">
                    Estimated delivery: {estimatedDays} business days
                  </p>
                )}
              </div>
            </div>
            {/* Payment */}
            <div className="bg-white/80 border border-[#EDE8DC]/50 p-6 md:p-8">
              <h2 className="font-sans text-[10px] text-[#B8A06C] tracking-[0.15em] uppercase font-medium mb-5">Payment</h2>
              <p className="font-sans text-sm text-[#6B6B6B]/60 mb-4">Secure payment options available</p>
              
              {(paypalError || payoneerError) && (
                <p className="text-sm text-red-500 font-sans mb-3 bg-red-50 p-2">
                  {paypalError || payoneerError}
                </p>
              )}
              
              {processing && (
                <div className="flex items-center gap-2 text-sm text-green-600 font-sans mb-3">
                  <Loader2 size={16} className="animate-spin" /> Processing payment...
                </div>
              )}
              
              <div className="space-y-3">
                <button
                  onClick={() => setPaymentMethod('paypal')}
                  className={`w-full p-4 rounded-lg border flex items-center justify-center gap-3 transition-all ${
                    paymentMethod === 'paypal'
                      ? 'border-[#0070BA] bg-[#0070BA]/5'
                      : 'border-[#EDE8DC]/50 hover:border-[#0070BA]/50'
                  }`}
                >
                  <svg width="24" height="6" viewBox="0 0 100 26" className="w-8 h-auto">
                    <path d="M11.2 0H4.8C4.4 0 4 0.3 3.9 0.7L1.3 17.2C1.2 17.5 1.4 17.8 1.7 17.8H4.8C5.2 17.8 5.6 17.5 5.7 17.1L6.4 12.4C6.5 11.9 6.9 11.6 7.4 11.6H9.4C13.5 11.6 15.9 9.6 16.5 5.7C16.8 4 16.5 2.7 15.7 1.8C14.7 0.7 13.2 0 11.2 0ZM11.9 5.9C11.6 8.1 9.9 8.1 8.3 8.1H7.4L8 4.2C8 3.9 8.3 3.7 8.6 3.7H9C10.1 3.7 11.1 3.7 11.7 4.3C11.9 4.7 12 5.2 11.9 5.9Z" fill="#003087"/>
                    <path d="M30.6 5.8H27.5C27.2 5.8 26.9 6 26.9 6.3L26.7 7.4L26.4 7C25.7 6 24.2 5.7 22.7 5.7C19.2 5.7 16.3 8.3 15.7 12.1C15.4 14 15.8 15.7 16.9 16.9C17.8 17.9 19.2 18.3 20.7 18.3C23.4 18.3 24.9 16.6 24.9 16.6L24.7 17.6C24.6 17.9 24.8 18.2 25.1 18.2H27.9C28.3 18.2 28.7 17.9 28.8 17.5L30.6 6.4C30.7 6.1 30.5 5.8 30.6 5.8ZM25.8 12.3C25.5 14.1 24.1 15.4 22.2 15.4C21.3 15.4 20.6 15.1 20.1 14.6C19.6 14.1 19.5 13.4 19.6 12.7C19.9 10.9 21.3 9.7 23.2 9.7C24.1 9.7 24.8 10 25.3 10.5C25.7 11 25.9 11.6 25.8 12.3Z" fill="#003087"/>
                    <path d="M48 5.8H44.9C44.6 5.8 44.3 6 44.1 6.3L39.8 12.7L38 6.6C37.9 6.2 37.5 5.9 37.1 5.9H34.1C33.8 5.9 33.5 6.2 33.6 6.6L36.9 16.4L33.7 21C33.5 21.3 33.7 21.7 34 21.7H37.1C37.4 21.7 37.7 21.5 37.9 21.2L48.4 6.5C48.6 6.2 48.4 5.8 48 5.8Z" fill="#003087"/>
                    <path d="M58.6 0H52.2C51.8 0 51.4 0.3 51.3 0.7L48.7 17.2C48.6 17.5 48.8 17.8 49.1 17.8H52.3C52.6 17.8 52.9 17.6 52.9 17.3L53.6 12.4C53.7 11.9 54.1 11.6 54.6 11.6H56.6C60.7 11.6 63.1 9.6 63.7 5.7C64 4 63.7 2.7 62.9 1.8C62 0.7 60.5 0 58.6 0ZM59.3 5.9C59 8.1 57.3 8.1 55.7 8.1H54.7L55.4 4.2C55.4 3.9 55.7 3.7 56 3.7H56.4C57.5 3.7 58.5 3.7 59.1 4.3C59.3 4.7 59.4 5.2 59.3 5.9Z" fill="#009CDE"/>
                    <path d="M78 5.8H74.9C74.6 5.8 74.3 6 74.3 6.3L74.1 7.4L73.8 7C73.1 6 71.6 5.7 70.1 5.7C66.6 5.7 63.7 8.3 63.1 12.1C62.8 14 63.2 15.7 64.3 16.9C65.2 17.9 66.6 18.3 68.1 18.3C70.8 18.3 72.3 16.6 72.3 16.6L72.1 17.6C72 17.9 72.2 18.2 72.5 18.2H75.3C75.7 18.2 76.1 17.9 76.2 17.5L78 6.4C78.1 6.1 78.3 5.8 78 5.8ZM73.2 12.3C72.9 14.1 71.5 15.4 69.6 15.4C68.7 15.4 68 15.1 67.5 14.6C67 14.1 66.9 13.4 67 12.7C67.3 10.9 68.7 9.7 70.6 9.7C71.5 9.7 72.2 10 72.7 10.5C73.2 11 73.3 11.6 73.2 12.3Z" fill="#009CDE"/>
                    <path d="M81.6 0.4L78.9 17.2C78.8 17.5 79 17.8 79.3 17.8H82.1C82.5 17.8 82.9 17.5 83 17.1L85.7 0.6C85.8 0.3 85.6 0 85.3 0H81.9C81.6 0 81.6 0.2 81.6 0.4Z" fill="#009CDE"/>
                  </svg>
                  <span className="text-sm font-medium text-[#2C2C2C]">Pay with PayPal or Credit Card</span>
                </button>
                
                {payoneerEnabled && (
                  <button
                    onClick={() => setPaymentMethod('payoneer')}
                    className={`w-full p-4 rounded-lg border flex items-center justify-center gap-3 transition-all ${
                      paymentMethod === 'payoneer'
                        ? 'border-[#0070BA] bg-[#0070BA]/5'
                        : 'border-[#EDE8DC]/50 hover:border-[#0070BA]/50'
                    }`}
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <rect x="2" y="2" width="20" height="20" rx="4" fill="#0070BA"/>
                      <path d="M8 17L11 12L8 7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M16 17L13 12L16 7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span className="text-sm font-medium text-[#2C2C2C]">Pay with Payoneer</span>
                  </button>
                )}
              </div>
              
              <p className="text-[10px] text-[#6B6B6B]/40 mt-3 font-sans">
                Secure payment processing by PayPal. You can pay with PayPal account, Visa, MasterCard, American Express, Discover, or debit card.
              </p>
              
              {paymentMethod === 'paypal' && (
                <div className="mt-4">
                  {!paypalReady ? (
                    <button onClick={handlePayPalClick} disabled={processing}
                      className="w-full px-6 py-3 bg-[#0070BA] text-white text-xs tracking-[0.08em] uppercase font-sans font-medium hover:bg-[#003087] disabled:opacity-50 transition-colors">
                      Continue with PayPal
                    </button>
                  ) : (
                    <div id="paypal-button-container" className="mt-4"></div>
                  )}
                </div>
              )}
              
              {paymentMethod === 'payoneer' && payoneerEnabled && (
                <button onClick={handlePayoneerClick} disabled={processing}
                  className="w-full mt-4 px-6 py-3 bg-[#0070BA] text-white text-xs tracking-[0.08em] uppercase font-sans font-medium hover:bg-[#003087] disabled:opacity-50 transition-colors">
                  Continue with Payoneer
                </button>
              )}
            </div>
          </div>
          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white/80 border border-[#EDE8DC]/50 p-6 md:p-8 sticky top-24">
              <h2 className="font-sans text-[10px] text-[#B8A06C] tracking-[0.15em] uppercase font-medium mb-5">Order Summary</h2>
              <div className="space-y-3 text-sm font-sans">
                {discountedItems.map((item: any) => (
                  <div key={item.id} className="flex justify-between text-[#6B6B6B]/70">
                    <span className="truncate max-w-[180px]">{item.nameEn || item.name} x{item.quantity}</span>
                    <span>{formatPrice(convertPrice((item.price || 0) * item.quantity, currency), currency)}</span>
                  </div>
                ))}
                <div className="border-t border-[#EDE8DC]/30 pt-3 flex justify-between text-[#6B6B6B]/60">
                  <span>Subtotal</span>
                  <span className="text-[#2C2C2C]">
                    {discountedSubtotal < subtotal && (
                      <span className="line-through text-[#6B6B6B]/40 mr-2">{formatPrice(convertPrice(subtotal, currency), currency)}</span>
                    )}
                    {formatPrice(convertPrice(discountedSubtotal, currency), currency)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    value={couponCode}
                    onChange={e => { setCouponCode(e.target.value); setCouponMsg(null) }}
                    placeholder="Coupon code"
                    className="flex-1 min-w-0 px-3 py-2 border border-[#EDE8DC] bg-white text-xs font-sans text-[#2C2C2C] placeholder:text-[#6B6B6B]/35 focus:outline-none focus:border-[#B8A06C]/50 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={applyCoupon}
                    disabled={couponApplying || !couponCode.trim()}
                    className="px-4 py-2 text-[10px] tracking-[0.1em] uppercase font-sans font-medium border border-[#2C2C2C] text-[#2C2C2C] hover:bg-[#2C2C2C] hover:text-white transition-colors disabled:opacity-40"
                  >
                    {couponApplying ? '...' : 'Apply'}
                  </button>
                </div>
                {couponMsg && (
                  <p className={`text-[11px] ${couponMsg.type === 'ok' ? 'text-[#6E8B83]' : 'text-red-500'}`}>{couponMsg.text}</p>
                )}
                {couponDiscount > 0 && (
                  <div className="flex justify-between text-[#6E8B83]">
                    <span>Coupon ({couponAppliedCode})</span>
                    <span>-{formatPrice(convertPrice(couponDiscount, currency), currency)}</span>
                  </div>
                )}
                <div className="flex justify-between text-[#6B6B6B]/60">
                  <span>Shipping</span>
                  <span>{shippingCost === 0 ? <span className="text-green-600">Free</span> : formatPrice(convertPrice(shippingCost, currency), currency)}</span>
                </div>
                <div className="border-t border-[#EDE8DC]/50 pt-3 flex justify-between font-medium">
                  <span className="text-[#2C2C2C]">Total</span>
                  <span className="font-en text-lg font-semibold text-[#2C2C2C]">{formatPrice(convertPrice(totalPrice, currency), currency)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
