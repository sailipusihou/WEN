'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { ArrowUpLeft, ShoppingBag, CheckCircle, Loader2, ChevronDown, Lock, Truck, RotateCcw } from 'lucide-react'
import { useCart } from '@/context/CartContext'
import { useCurrency } from '@/context/CurrencyContext'
import { convertPrice, formatPrice } from '@/lib/cart-types'
import { getOrCreateVisitorId, getStoredReferralChannel, getStoredReferralCode } from '@/lib/referral-client'
import { useActivePromotions } from '@/lib/promotion-client'
import { computePromotionForProduct } from '@/lib/promotion-shared'
import WalletButtons, { type WalletContact } from '@/components/checkout/WalletButtons'
import CheckoutUrgency from '@/components/checkout/CheckoutUrgency'
import OrderSummaryLines from '@/components/cart/OrderSummaryLines'
import ShopWithConfidence from '@/components/cart/ShopWithConfidence'

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
  const [paypalLoading, setPaypalLoading] = useState(false)
  const [orderId, setOrderId] = useState('')

  // 修复 M13: 刷新后恢复订单确认页 (sessionStorage 持久化订单号)
  useEffect(() => {
    if (!submitted && items.length === 0) {
      const stored = sessionStorage.getItem('otm_last_order')
      if (stored) {
        setOrderId(stored)
        setSubmitted(true)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submitted, items.length])
  const [processing, setProcessing] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  // 登录态仅用于「预填邮箱 + 显示快捷登录入口」，不再作为下单前提
  const [authChecked, setAuthChecked] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [paypalError, setPaypalError] = useState('')
  const [payoneerError, setPayoneerError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [shippingCost, setShippingCost] = useState(0)
  const [estimatedDays, setEstimatedDays] = useState('')
  const [shippingZone, setShippingZone] = useState<any>(null)
  // 结算页 Contact 段的两个勾选（参考站同款）
  const [marketingOptIn, setMarketingOptIn] = useState(false)
  const [createAccount, setCreateAccount] = useState(false)
  /**
   * 客户是否真的碰过地址信息。
   *
   * 参考站在填地址之前，右侧 Shipping 显示的是 "Calculated in the next step"，
   * 而不是先拍一个运费数字上去 —— 那既不严谨也会在客户改国家后跳价。
   * 这里同样处理：没填地址前只显示小计，运费写「结算时计算」。
   */
  const [addressTouched, setAddressTouched] = useState(false)
  const [payoneerEnabled, setPayoneerEnabled] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<'paypal' | 'payoneer'>('paypal')
  // Apple Pay / Google Pay：额度开关来自 /api/paypal/config，默认关闭
  const [wallets, setWallets] = useState({ enabled: false, applePay: false, googlePay: false })
  const [paypalInstance, setPaypalInstance] = useState<any>(null)
  // 信任区用的真实评价数据（服务端聚合，没有就不显示那一行）
  const [reviewStats, setReviewStats] = useState<{ count: number; rating: number }>({ count: 0, rating: 0 })

  useEffect(() => {
    let cancelled = false
    fetch('/api/products/review-stats')
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (!cancelled && d) setReviewStats({ count: d.count || 0, rating: d.rating || 0 }) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])
  const [referralCode, setReferralCode] = useState('')
  const [referralInfo, setReferralInfo] = useState<any>(null)
  const [referralChannel, setReferralChannel] = useState('bio')
  const [couponCode, setCouponCode] = useState('')
  const [couponDiscount, setCouponDiscount] = useState(0)
  const [couponMsg, setCouponMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [couponApplying, setCouponApplying] = useState(false)
  const [couponAppliedCode, setCouponAppliedCode] = useState('')

  useEffect(() => {
    // 结算需登录：未登录时展示登录引导卡片。
    // 注意：user_token 是 httpOnly cookie，document.cookie 读不到，
    // 必须由服务端接口 /api/auth/user 判定登录态（200 = 已登录，401 = 未登录）。
    let cancelled = false
    fetch('/api/auth/user')
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (cancelled) return
        setIsLoggedIn(!!d?.user)
        if (d?.user?.email) setUserEmail(d.user.email)
      })
      .catch(() => { if (!cancelled) setIsLoggedIn(false) })
      .finally(() => { if (!cancelled) setAuthChecked(true) })
    return () => { cancelled = true }
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

  /**
   * 预加载 PayPal SDK。
   *
   * ⚠️ 这一段是「客户看不到 Apple Pay / Google Pay」的根治办法。
   * 原来 SDK 只在客户点了「Continue with PayPal」之后才加载，而那一行看起来像
   * PayPal 的一个付款选项、不像是个"加载按钮"，客户根本不会点 ——
   * 结果结算页上只有一堆卡片图标和一个按钮，PayPal / Apple Pay / Google Pay
   * 三个真正的付款按钮全被挡在后面。
   * 现在改成进页面就自动加载（和所有正常独立站一样），三个按钮直接铺出来。
   */
  const paypalLoadStartedRef = useRef(false)

  const ensurePayPalSdk = async (presetConfig?: any) => {
    if (paypalLoadStartedRef.current) return
    paypalLoadStartedRef.current = true

    try {
      let config = presetConfig
      if (!config) {
        const res = await fetch('/api/paypal/config')
        config = await res.json()
      }
      if (!config?.enabled || !config?.clientId) {
        paypalLoadStartedRef.current = false
        setPaypalLoading(false)
        setPaypalError('PayPal is not available at the moment.')
        return
      }

      // ⚠️ locale 必须用下划线。navigator.language 在所有真实浏览器里返回连字符格式
      // （en-US / zh-CN），而 PayPal SDK 只认下划线，传连字符会直接 400、SDK 不加载。
      const locale = (navigator.language || 'en_US').replace('-', '_')
      const walletParam = config.wallets?.enabled ? '&components=buttons,applepay,googlepay' : ''
      const buildSrc = (useLocale: boolean) =>
        `https://www.paypal.com/sdk/js?client-id=${config.clientId}&currency=USD&intent=capture` +
        `${useLocale ? `&locale=${locale}` : ''}${walletParam}`

      const mount = (useLocale: boolean, isRetry: boolean) => {
        const script = document.createElement('script')
        script.src = buildSrc(useLocale)
        script.onload = () => {
          if (typeof (window as any).paypal?.Buttons === 'function') {
            setPaypalReady(true)
          } else {
            // 加载成功但挂载失败：放开重试，让客户还能手动点一次
            paypalLoadStartedRef.current = false
            setPaypalLoading(false)
            setPaypalError('PayPal failed to initialize. Please try again.')
          }
        }
        script.onerror = () => {
          script.remove()
          if (!isRetry) mount(false, true)
          else {
            paypalLoadStartedRef.current = false
            setPaypalLoading(false)
            setPaypalError('Failed to load PayPal. Please try again.')
          }
        }
        document.body.appendChild(script)
      }
      mount(true, false)
    } catch {
      paypalLoadStartedRef.current = false
      setPaypalLoading(false)
      setPaypalError('PayPal configuration error.')
    }
  }

  useEffect(() => {
    Promise.all([
      fetch('/api/paypal/config').then(r => r.json()).catch(() => ({ enabled: false })),
      fetch('/api/payoneer/config').then(r => r.json()).catch(() => ({ enabled: false })),
    ]).then(([paypalConfig, payoneerConfig]) => {
      if (!paypalConfig.enabled && payoneerConfig.enabled) {
        setPaymentMethod('payoneer')
      }
      setPayoneerEnabled(payoneerConfig.enabled)
      if (paypalConfig.wallets) setWallets(paypalConfig.wallets)
      // 进页面就加载，不再等客户去点「Continue with PayPal」
      if (paypalConfig.enabled && paypalConfig.clientId) {
        setPaypalLoading(true)
        ensurePayPalSdk(paypalConfig)
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
  // 「省了多少」= 促销省的 + 优惠券省的。用原价小计(subtotal)对比促销后小计得出促销部分。
  const promoSaved = Math.max(0, Math.round((subtotal - discountedSubtotal) * 100) / 100)
  const savedTotal = Math.round((promoSaved + (couponDiscount || 0)) * 100) / 100

  // 免邮门槛：必须取「该国家所属分区」的 zone.freeThreshold（真正决定免邮的值），
  // 不能用全局 shippingFreeThreshold —— 两者对美加相同(416.67)，
  // 但欧洲 555.56 / 亚太 486.11 / 其他 694.44，用全局值会承诺不存在的免邮。
  const freeThreshold = Number(shippingZone?.freeThreshold) || 0

  // estimatedDays 是字符串（形如 "14-21"），这里解析出下限/上限算具体到达日期
  const checkoutEta = (() => {
    const nums = String(estimatedDays).match(/\d+/g)
    if (!nums || !nums.length) return ''
    const min = Number(nums[0])
    const max = nums.length > 1 ? Number(nums[1]) : min + 7
    const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    return `${fmt(new Date(Date.now() + min * 86400000))} – ${fmt(new Date(Date.now() + max * 86400000))}`
  })()

  // 修复 H5: PayPal 按钮回调闭包只捕获首次渲染的值, 用 ref 始终读取最新金额
  const totalPriceRef = useRef(totalPrice)
  totalPriceRef.current = totalPrice

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
    // 客户一碰地址相关字段，就认为「地址已知」，右侧才开始显示真实运费
    if (['country', 'address', 'city', 'state', 'zipCode'].includes(f) && String(v).trim() && f !== 'country') {
      setAddressTouched(true)
    }
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
    // 修复 M13: 订单号写入 sessionStorage, 刷新后仍显示确认页
    try { sessionStorage.setItem('otm_last_order', d.id) } catch { /* ignore */ }
    return d
  }

  // ==== PayPal 先建单后扣款 ====
  // 旧流程是「先 capture 扣款、再调用 /api/orders 建单」，一旦建单失败
  // （金额不符 / 限流 / 运费异常）钱已经扣了却没有订单，且无法自动退款——即孤儿扣款。
  // 新流程把顺序倒过来：先落一张 pending 订单（金额由服务端核算），
  // 再按这张订单的总额创建 PayPal 订单，最后 capture 并确认同一张订单。
  // 这样「找不到订单就拒绝 capture」，孤儿扣款在结构上不可能发生。
  const pendingOrderRef = useRef<string | null>(null)

  const createPendingOrder = async (contact?: WalletContact): Promise<string> => {
    // Express Checkout：钱包回传的收货信息覆盖表单里空着的字段。
    // 服务端按 shipping.country 重新核算运费与总价，所以国家名对得上就不会算错钱。
    const merged: typeof shipping = { ...shipping }
    if (contact) {
      for (const [k, v] of Object.entries(contact)) {
        const val = v == null ? '' : String(v).trim()
        if (val) (merged as any)[k] = val
      }
      // 同步到表单，让右侧 Order Summary 与地址栏立刻反映钱包地址
      setShipping(merged)
      if (merged.email) setUserEmail(merged.email)
      // 钱包给了地址就等于「地址已知」，右侧可以直接显示真实运费
      setAddressTouched(true)
      // 只有「钱包回传了联系方式但缺字段」才拦截。
      // ⚠️ 绝不能对普通 PayPal 流程也做这个断言：Express Checkout 在页面最顶部，
      // 客户还没填表就点 PayPal，地址必然是空的 —— 之前把断言放在公共路径上，
      // 直接把 PayPal / Google Pay 按钮全部拦死了（点了不弹窗、只报一句错误）。
      // 普通 PayPal 流程由 PayPal 自己收集地址，capture 时再写回站内订单。
      assertShippingComplete(merged)
    }

    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: discountedItems,
        shipping: merged,
        subtotal: discountedSubtotal,
        shippingCost,
        discount: couponDiscount,
        couponCode: couponAppliedCode || undefined,
        total: totalPrice,
        currency,
        notes: `Payment: PayPal`,
        userEmail: merged.email || userEmail,
        paymentMethod: 'paypal',
        paypalTransaction: null,
        referralCode: referralCode || undefined,
        referralVisitorId: referralCode ? getOrCreateVisitorId() : undefined,
      }),
    })
    const d = await res.json().catch(() => ({}))
    if (!res.ok || !d?.id) {
      throw new Error(d?.error || 'Could not start your order. Please try again.')
    }
    pendingOrderRef.current = d.id
    return d.id
  }

  /**
   * Express Checkout 的兜底校验。
   * 钱包（尤其 Apple Pay 在某些卡片上）可能不回传完整地址，此时不能拿一张
   * 缺地址的订单去扣款 —— 宁可在这里拦住，让客户把表单补完。
   */
  const assertShippingComplete = (s: typeof shipping) => {
    const missing: string[] = []
    if (!String(s.firstName || '').trim()) missing.push('first name')
    if (!String(s.lastName || '').trim()) missing.push('last name')
    if (!String(s.address || '').trim()) missing.push('address')
    if (!String(s.city || '').trim()) missing.push('city')
    if (!String(s.zipCode || '').trim()) missing.push('postal code')
    if (!String(s.email || '').trim()) missing.push('email')
    if (missing.length) {
      const err = new Error(
        `Your wallet didn’t share a complete address (missing: ${missing.join(', ')}). ` +
        `Please fill it in below and pay again.`
      )
      // 滚到地址表单，方便客户立刻补
      try {
        document.querySelector('.input-premium')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      } catch { /* ignore */ }
      throw err
    }
  }

  // 把「建单 → 创建 PayPal 订单」抽出来共用：PayPal 按钮、Google Pay、Apple Pay
  // 三条入口最后都汇到这一个函数，保证金额口径与订单落库逻辑只有一份实现。
  const createPayPalOrderId = async (contact?: WalletContact): Promise<string> => {
    // 1) 先建站内订单（服务端核价、落库为 unpaid）
    const orderId = await createPendingOrder(contact)
    // 2) 再按服务端确认的订单总额创建 PayPal 订单（金额不接受客户端指定）
    const res = await fetch('/api/create-paypal-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId }),
    })
    const d = await res.json().catch(() => ({}))
    if (!res.ok || !d?.id) throw new Error(d?.error || 'PayPal order creation failed')
    return d.id
  }

  // 「扣款 → 确认订单」同样共用一份
  const captureAndFinalize = async (paypalOrderId: string) => {
    const orderId = pendingOrderRef.current
    if (!orderId) throw new Error('Order reference lost. Please refresh and try again.')

    const capRes = await fetch('/api/capture-paypal-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, paypalOrderId }),
    })
    const capData = await capRes.json().catch(() => ({}))
    if (!capRes.ok || capData.status !== 'COMPLETED') {
      throw new Error(
        capData.error ||
          'Payment could not be confirmed. If you were charged, contact us with the reference and we will resolve it.'
      )
    }

    const finalOrderId = capData.orderId || orderId
    setOrderId(finalOrderId)
    try { sessionStorage.setItem('otm_last_order', finalOrderId) } catch { /* ignore */ }
    clearCart()
    setSubmitted(true)
  }

  /**
   * 渲染 PayPal 按钮。
   *
   * 渲染两处，和参考站一致：
   *   1) 顶部 Express Checkout 行 —— 精简单个 PayPal 按钮，与 Apple Pay / Google Pay 并排
   *   2) 底部 Payment 区 —— 完整那套（PayPal / Pay Later / 借记卡信用卡）
   * 两处共用同一份 createOrder / onApprove 逻辑（createPayPalOrderId / captureAndFinalize），
   * 金额口径与落库逻辑不会分叉。
   */
  useEffect(() => {
    if (!paypalReady) return
    const pp = (window as any).paypal
    if (!pp) return

    const handleApprove = async (data: any) => {
      setProcessing(true)
      setPaypalError('')
      try {
        await captureAndFinalize(data.orderID)
      } catch (e: any) {
        setPaypalError(e.message || 'Payment verification failed')
      } finally {
        setProcessing(false)
      }
    }

    // ---- 顶部 Express Checkout：只要一个 PayPal 按钮 ----
    const expressEl = document.getElementById('paypal-express-container')
    if (expressEl && !expressEl.dataset.rendered) {
      expressEl.dataset.rendered = '1'
      try {
        pp.Buttons({
          fundingSource: pp.FUNDING?.PAYPAL,
          style: { layout: 'horizontal', shape: 'rect', height: 48, tagline: false, label: 'pay' },
          createOrder: () => createPayPalOrderId(),
          onApprove: handleApprove,
          onError: () => setPaypalError('A PayPal error occurred. Please try again.'),
        }).render(expressEl)
      } catch (e) {
        console.warn('[paypal] express button render failed', e)
      }
    }

    // ---- 底部 Payment 区：完整按钮组 ----
    const container = document.getElementById('paypal-button-container')
    if (!container || container.dataset.rendered) return
    container.dataset.rendered = '1'
    pp.Buttons({
      createOrder: () => createPayPalOrderId(),
      onApprove: handleApprove,
      onError: () => {
        setPaypalError('A PayPal error occurred. Please try again.')
      },
    }).render(container)
  }, [paypalReady])

  // Apple Pay / Google Pay：三条入口共用上面两个函数，服务端接口零改动
  useEffect(() => {
    if (paypalReady && (window as any).paypal) setPaypalInstance((window as any).paypal)
  }, [paypalReady])

  const handlePayPalClick = async () => {
    if (!validateShipping()) return
    if (paypalReady) return
    setPaypalLoading(true)
    await ensurePayPalSdk()
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
          // 修复 M2: Payoneer 按 USD 实收金额下单 (原传 CNY 数值, 金额口径与订单/对账不一致)
          amount: convertPrice(totalPrice, 'USD'),
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
    return <div className="min-h-[70vh] flex items-center justify-center bg-[#FBFAF7]">
      <div className="text-center max-w-md mx-auto px-6">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-[#EFE7D4]/50 flex items-center justify-center">
          <ShoppingBag size={32} strokeWidth={1} className="text-[#5A4A36]/30" />
        </div>
        <h1 className="font-en text-2xl md:text-3xl text-[#2A2118] font-medium tracking-[0.005em] mb-2">Cart is empty</h1>
        <Link href="/" className="inline-flex items-center gap-2 px-8 py-3 bg-[#2A2118] text-white text-xs tracking-[0.08em] uppercase font-sans font-medium hover:bg-[#1A1A1A] transition-colors mt-4">Shop Now</Link>
      </div>
    </div>
  }

  // 未登录：结算前引导登录 / 注册（购物车内容保留，登录后回到本页继续）
  // 移除了「必须登录才能结算」的拦截：
  // 后端 POST /api/orders 本来就不要求登录（只做限频），表单也已收齐
  // firstName/lastName/email/address 等字段，所以访客可以直接下单。
  // 登录态现在只用于「预填邮箱 + 提供快捷登录入口」，不再作为下单前提。
  if (submitted) {
    return <div className="min-h-[70vh] flex items-center justify-center bg-[#FBFAF7]">
      <div className="w-full max-w-4xl mx-auto px-6 py-10">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-green-50 flex items-center justify-center">
          <CheckCircle size={32} strokeWidth={1} className="text-green-600" />
        </div>
        <div className="text-center max-w-2xl mx-auto">
          <h1 className="font-en text-2xl md:text-4xl text-[#2A2118] font-medium tracking-[0.005em] mb-2">Order Confirmed</h1>
          <p className="font-sans text-sm md:text-base text-[#5A4A36]/70 mb-3">
            Thank you for your order. Your payment and fulfillment request are now in our system.
          </p>
          {orderId && (
            <div className="mb-8">
              <p className="font-sans text-xs text-[#5A4A36]/40 mb-2">Order #{orderId}</p>
              <p className="font-sans text-xs text-[#5A4A36]/30">
                Bookmark this page or save your order ID to track shipping, support updates, and attribution status.
              </p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] gap-6">
          <div className="space-y-6">
            {referralInfo ? (
              <div className="rounded-[24px] border border-[#A07C34]/20 bg-[#FFFFFF]/80 p-6">
                <p className="font-sans text-[10px] uppercase tracking-[0.28em] text-[#8A6A2E]">Marketing Attribution Recorded</p>
                <p className="mt-2 font-sans text-sm leading-7 text-[#2A2118]">
                  This order is linked to your {referralInfo.platform} {referralInfo.platformUsername ? `@${referralInfo.platformUsername}` : ''} campaign.
                  Our team will connect it with the related social content, staff, and tracking metrics.
                </p>
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="rounded-2xl bg-[#FBFAF7] px-4 py-3">
                    <p className="font-sans text-[10px] uppercase tracking-[0.22em] text-[#8A6A2E]">Referral Code</p>
                    <p className="mt-1 font-sans text-sm text-[#2A2118]">{referralInfo.code}</p>
                  </div>
                  <div className="rounded-2xl bg-[#FBFAF7] px-4 py-3">
                    <p className="font-sans text-[10px] uppercase tracking-[0.22em] text-[#8A6A2E]">Source Channel</p>
                    <p className="mt-1 font-sans text-sm text-[#2A2118]">{referralInfo.platform}{referralInfo.platformUsername ? ` · @${referralInfo.platformUsername}` : ''}</p>
                  </div>
                  <div className="rounded-2xl bg-[#FBFAF7] px-4 py-3">
                    <p className="font-sans text-[10px] uppercase tracking-[0.22em] text-[#8A6A2E]">Promoted Product</p>
                    <p className="mt-1 font-sans text-sm text-[#2A2118]">{referralInfo.productName || 'General collection'}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-[24px] border border-[#EFE7D4] bg-[#FFFFFF]/80 p-6">
                <p className="font-sans text-[10px] uppercase tracking-[0.28em] text-[#8A6A2E]">Organic Checkout</p>
                <p className="mt-2 font-sans text-sm leading-7 text-[#2A2118]">
                  This order carries no marketing referral and will be treated as organic traffic.
                  Attribution info will appear automatically if you later enter through a social link.
                </p>
              </div>
            )}

            <div className="rounded-[24px] border border-[#EFE7D4] bg-[#FFFFFF]/80 p-6">
              <p className="font-sans text-[10px] uppercase tracking-[0.28em] text-[#8A6A2E]">What Happens Next</p>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                  'Order confirmation email is sent to your inbox.',
                  'Operations team receives order and attribution context together.',
                  'Tracking page and account order page keep this purchase visible end to end.',
                ].map(item => (
                  <div key={item} className="rounded-2xl bg-[#FBFAF7] px-4 py-4 font-sans text-sm leading-6 text-[#5A4A36]">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-[24px] border border-[#EFE7D4] bg-[#FFFFFF]/80 p-6">
              <p className="font-sans text-[10px] uppercase tracking-[0.28em] text-[#8A6A2E]">Fulfillment Snapshot</p>
              <div className="mt-4 space-y-3">
                <div className="rounded-2xl bg-[#FBFAF7] px-4 py-3">
                  <p className="font-sans text-[10px] uppercase tracking-[0.22em] text-[#8A6A2E]">Payment Method</p>
                  <p className="mt-1 font-sans text-sm text-[#2A2118]">{paymentMethod === 'payoneer' ? 'Payoneer' : 'PayPal'}</p>
                </div>
                <div className="rounded-2xl bg-[#FBFAF7] px-4 py-3">
                  <p className="font-sans text-[10px] uppercase tracking-[0.22em] text-[#8A6A2E]">Delivery Estimate</p>
                  <p className="mt-1 font-sans text-sm text-[#2A2118]">{estimatedDays} days</p>
                </div>
                <div className="rounded-2xl bg-[#FBFAF7] px-4 py-3">
                  <p className="font-sans text-[10px] uppercase tracking-[0.22em] text-[#8A6A2E]">Shipping Zone</p>
                  <p className="mt-1 font-sans text-sm text-[#2A2118]">{shippingZone?.name || shipping.country}</p>
                </div>
              </div>
            </div>

            <div className="rounded-[24px] border border-[#EFE7D4] bg-[#FFFFFF]/80 p-6">
              <p className="font-sans text-[10px] uppercase tracking-[0.28em] text-[#8A6A2E]">Next Actions</p>
              <div className="mt-4 flex flex-col gap-3">
                {orderId && (
                  <Link href={`/order-tracking?id=${orderId}`} className="px-6 py-3 bg-[#A07C34] text-white text-xs tracking-[0.08em] uppercase font-sans font-medium hover:bg-[#A08A5A] transition-colors text-center">
                    Track Order
                  </Link>
                )}
                <Link href={"/account/orders"} className="px-6 py-3 bg-[#2A2118] text-white text-xs tracking-[0.08em] uppercase font-sans font-medium hover:bg-[#1A1A1A] transition-colors text-center">
                  View Orders
                </Link>
                <Link href={referralCode ? `/link-in-bio?ref=${referralCode}${referralInfo?.productId ? `&product=${referralInfo.productId}` : ''}${referralChannel ? `&channel=${referralChannel}` : ''}` : "/"} className="px-6 py-3 border border-[#E0D6C2] text-[#2A2118] text-xs tracking-[0.08em] uppercase font-sans font-medium hover:border-[#A07C34] transition-colors text-center">
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
    <div className="bg-[#FBFAF7] min-h-screen">
      <div className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-12 py-8 md:py-12">
        {/* 结账页不放返回入口 —— 要退就用浏览器自带的返回按钮。
            页面上再放一个 Back to Cart 等于多给一个弃单出口。 */}
        <h1 className="font-en text-3xl md:text-4xl text-[#2A2118] font-medium tracking-[0.005em] mb-5">Checkout</h1>

        {/* 预留倒计时（对齐参考站顶部那条紧迫感提示） */}
        <CheckoutUrgency />

        {/* 参考站顶部没有步骤标签页 —— 这里也去掉编号步进条，
            页面直接进入支付区，减少视觉噪音 */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] gap-0 mt-2">
          <div className="lg:col-span-1 space-y-6 lg:pr-10 pb-10">
            {/* Express Checkout —— 放在最顶部，和参考站一致：
                客户可以一个点击用钱包里的卡付掉，跳过下面整张表单。
                组件自己判断有没有可用钱包；都不可用就整块不渲染。 */}
            {paymentMethod === 'paypal' && (
              paypalReady ? (
                <WalletButtons
                  paypal={paypalInstance}
                  masterEnabled={wallets.enabled}
                  allowApplePay={wallets.applePay !== false}
                  allowGooglePay={wallets.googlePay !== false}
                  amount={convertPrice(totalPrice, 'USD').toFixed(2)}
                  currency="USD"
                  layout="row"
                  title="Express Checkout"
                  subtitle="Skip the form — pay in one tap with a saved card or wallet."
                  leading={<div id="paypal-express-container" style={{ width: '100%', height: 48 }} />}
                  createOrderId={createPayPalOrderId}
                  captureOrder={captureAndFinalize}
                  onError={(m) => setPaypalError(m)}
                  setProcessing={setProcessing}
                />
              ) : paypalLoading ? (
                <div className="checkout-card p-6 md:p-8">
                  <h2 className="checkout-section-title mb-4">Express Checkout</h2>
                  <div className="flex items-center justify-center gap-2 py-3 font-sans text-xs tracking-[0.08em] uppercase text-[#5A4A36]/60">
                    <Loader2 size={14} className="animate-spin" /> Loading payment options...
                  </div>
                </div>
              ) : null
            )}
            {referralInfo && (
              <div className="checkout-card p-6 md:p-8">
                <p className="font-sans text-[10px] text-[#A07C34] tracking-[0.24em] uppercase font-medium mb-3">Attribution Active</p>
                <div className="space-y-2">
                  <p className="font-sans text-sm text-[#2A2118]">
                    This checkout is tied to a marketing campaign — the order will be linked to the related social content and staff member.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="rounded-xl bg-[#FBFAF7] px-4 py-3">
                      <p className="font-sans text-[10px] uppercase tracking-[0.22em] text-[#8A6A2E]">Referral Code</p>
                      <p className="mt-1 font-sans text-sm text-[#2A2118]">{referralInfo.code}</p>
                    </div>
                    <div className="rounded-xl bg-[#FBFAF7] px-4 py-3">
                      <p className="font-sans text-[10px] uppercase tracking-[0.22em] text-[#8A6A2E]">Source</p>
                      <p className="mt-1 font-sans text-sm text-[#2A2118]">{referralInfo.platform}{referralInfo.platformUsername ? ` · @${referralInfo.platformUsername}` : ''}{referralChannel ? ` · ${referralChannel}` : ''}</p>
                    </div>
                    <div className="rounded-xl bg-[#FBFAF7] px-4 py-3">
                      <p className="font-sans text-[10px] uppercase tracking-[0.22em] text-[#8A6A2E]">Promoted Product</p>
                      <p className="mt-1 font-sans text-sm text-[#2A2118]">{referralInfo.productName || 'General collection'}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {/* Contact —— 参考站把「邮箱」单独拎出来一段，右上角挂登录入口 */}
            <div className="checkout-card p-6 md:p-8">
              <div className="flex items-baseline justify-between gap-4 mb-5">
                <h2 className="checkout-section-title">Contact</h2>
                {!isLoggedIn && (
                  <Link
                    href="/login?redirect=/checkout"
                    className="font-sans text-[12px] underline underline-offset-4 transition-colors hover:opacity-70"
                    style={{ color: '#8A6A2E' }}
                  >
                    Already have an account? Log in
                  </Link>
                )}
                {isLoggedIn && (
                  <span className="font-sans text-[12px]" style={{ color: 'rgba(74,58,36,0.55)' }}>
                    Signed in{userEmail ? ` as ${userEmail}` : ''}
                  </span>
                )}
              </div>

              <input
                type="email"
                value={shipping.email}
                onChange={e => updateField('email', e.target.value)}
                placeholder="Email *"
                className={'input-premium ' + (fieldErrors.email ? 'border-red-400' : '')}
              />
              {fieldErrors.email && <p className="text-red-500 text-[10px] mt-1 font-sans">{fieldErrors.email}</p>}

              {/* 营销订阅（默认不勾，合规上更稳） */}
              <label className="mt-3 flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={marketingOptIn}
                  onChange={e => setMarketingOptIn(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-[#241C12] shrink-0"
                />
                <span className="font-sans text-[12px] leading-snug" style={{ color: 'rgba(74,58,36,0.7)' }}>
                  Receive exclusive offers and collection updates
                </span>
              </label>

              {/* 创建账户提示：未登录时给一个入口，邮箱已填就带过去 */}
              {!isLoggedIn && (
                <label className="mt-2 flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={createAccount}
                    onChange={e => setCreateAccount(e.target.checked)}
                    className="mt-0.5 w-4 h-4 accent-[#241C12] shrink-0"
                  />
                  <span className="font-sans text-[12px] leading-snug" style={{ color: 'rgba(74,58,36,0.7)' }}>
                    Create an account so you can track this order and check out faster next time
                  </span>
                </label>
              )}
            </div>

            {/* Shipping address —— 字段顺序对齐参考站：国家 → 姓名 → 地址 → 邮编 → 电话 */}
            <div className="checkout-card p-6 md:p-8">
              <h2 className="checkout-section-title mb-5">Shipping Address</h2>

              <div className="space-y-3">
                <div>
                  <select value={shipping.country} onChange={e => updateField('country', e.target.value)}
                    className="input-premium w-full">
                    <option>United States</option><option>Canada</option><option>United Kingdom</option>
                    <option>Germany</option><option>France</option><option>Italy</option>
                    <option>Spain</option><option>Netherlands</option><option>Australia</option>
                    <option>Japan</option><option>South Korea</option><option>Singapore</option>
                    <option>Other</option>
                  </select>
                  {/* 运费按所选国家实时算出来（服务端 calculateShipping，按国家匹配分区）。
                      但要等客户真的填了地址再显示 —— 否则一进页面就报一个运费数字，不严谨。 */}
                  <p className="mt-1.5 font-sans text-[11px]" style={{ color: 'rgba(74,58,36,0.55)' }}>
                    {!addressTouched
                      ? 'Shipping cost is calculated from your address'
                      : shippingCost > 0
                        ? `Shipping to ${shipping.country}: ${formatPrice(convertPrice(shippingCost, currency), currency)}`
                        : `Free shipping to ${shipping.country}`}
                    {addressTouched && estimatedDays ? ` · ${estimatedDays} business days` : ''}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { key: 'firstName', placeholder: 'First Name *', colSpan: false },
                    { key: 'lastName', placeholder: 'Last Name', colSpan: false },
                  ].map(({ key, placeholder, colSpan }) => (
                    <div key={key} className={colSpan ? 'sm:col-span-2' : ''}>
                      <input
                        value={(shipping as any)[key]}
                        onChange={e => updateField(key, e.target.value)}
                        placeholder={placeholder}
                        className={'input-premium ' + (fieldErrors[key] ? 'border-red-400' : '')}
                      />
                      {fieldErrors[key] && <p className="text-red-500 text-[10px] mt-1 font-sans">{fieldErrors[key]}</p>}
                    </div>
                  ))}
                </div>

                {[
                  { key: 'address', placeholder: 'Address *', type: 'text' },
                  { key: 'phone', placeholder: 'Phone', type: 'tel' },
                ].map(({ key, placeholder, type }) => (
                  <div key={key}>
                    <input
                      type={type}
                      value={(shipping as any)[key]}
                      onChange={e => updateField(key, e.target.value)}
                      placeholder={placeholder}
                      className={'input-premium ' + (fieldErrors[key] ? 'border-red-400' : '')}
                    />
                    {fieldErrors[key] && <p className="text-red-500 text-[10px] mt-1 font-sans">{fieldErrors[key]}</p>}
                  </div>
                ))}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { key: 'city', placeholder: 'City *' },
                    { key: 'state', placeholder: 'State' },
                    { key: 'zipCode', placeholder: 'ZIP Code *' },
                  ].map(({ key, placeholder }) => (
                    <div key={key}>
                      <input
                        value={(shipping as any)[key]}
                        onChange={e => updateField(key, e.target.value)}
                        placeholder={placeholder}
                        className={'input-premium ' + (fieldErrors[key] ? 'border-red-400' : '')}
                      />
                      {fieldErrors[key] && <p className="text-red-500 text-[10px] mt-1 font-sans">{fieldErrors[key]}</p>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {/* Payment */}
            <div className="checkout-card p-6 md:p-8">
              <h2 className="checkout-section-title mb-5">Payment</h2>
              <p className="font-sans text-sm text-[#5A4A36]/60 mb-4">Secure payment options available</p>
              
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
                      : 'border-[#EFE7D4]/50 hover:border-[#0070BA]/50'
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
                  <span className="text-sm font-medium text-[#2A2118]">Pay with PayPal or Credit Card</span>
                </button>
                
                {payoneerEnabled && (
                  <button
                    onClick={() => setPaymentMethod('payoneer')}
                    className={`w-full p-4 rounded-lg border flex items-center justify-center gap-3 transition-all ${
                      paymentMethod === 'payoneer'
                        ? 'border-[#0070BA] bg-[#0070BA]/5'
                        : 'border-[#EFE7D4]/50 hover:border-[#0070BA]/50'
                    }`}
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <rect x="2" y="2" width="20" height="20" rx="4" fill="#0070BA"/>
                      <path d="M8 17L11 12L8 7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M16 17L13 12L16 7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span className="text-sm font-medium text-[#2A2118]">Pay with Payoneer</span>
                  </button>
                )}
              </div>
              
              <p className="text-[10px] text-[#5A4A36]/40 mt-3 font-sans">
                Secure payment processing by PayPal. You can pay with PayPal account, Visa, MasterCard, American Express, Discover, or debit card.
              </p>

              {/* 可接受的支付方式图标（凭据感 / 降低支付页弃单） */}
              <div className="flex flex-wrap items-center gap-2 mt-4">
                {[
                  { label: 'VISA', bg: '#1A1F71', fg: '#fff', text: 'VISA' },
                  { label: 'Mastercard', bg: '#fff', fg: '#EB001B', circles: true },
                  { label: 'AMEX', bg: '#006FCF', fg: '#fff', text: 'AMEX' },
                  { label: 'Discover', bg: '#fff', fg: '#F76B1C', text: 'DISCOVER', border: true },
                  { label: 'PayPal', bg: '#fff', fg: '#003087', text: 'PayPal', border: true },
                ].map(c => (
                  <span
                    key={c.label}
                    title={c.label}
                    aria-label={c.label}
                    className="inline-flex items-center justify-center font-sans font-bold"
                    style={{
                      width: 46, height: 30, borderRadius: 4,
                      backgroundColor: c.bg, color: c.fg,
                      fontSize: c.text && c.text.length > 5 ? 7 : 9,
                      letterSpacing: '0.04em',
                      border: c.border ? '1px solid rgba(74,58,36,0.28)' : c.bg === '#fff' ? '1px solid rgba(74,58,36,0.24)' : 'none',
                    }}
                  >
                    {c.circles ? (
                      <span className="flex items-center">
                        <span style={{ width: 13, height: 13, borderRadius: 999, backgroundColor: '#EB001B', display: 'inline-block' }} />
                        <span style={{ width: 13, height: 13, borderRadius: 999, backgroundColor: '#F79E1B', display: 'inline-block', marginLeft: -5, opacity: 0.9 }} />
                      </span>
                    ) : c.text}
                  </span>
                ))}
              </div>

              {/* 结算信任行——跨境订单最关心的三件事 */}
              <div className="flex flex-wrap gap-x-5 gap-y-2 mt-5 pt-4" style={{ borderTop: '1px solid rgba(74,58,36,0.24)' }}>
                {[
                  { icon: Lock, text: 'Secure 256-bit checkout' },
                  { icon: Truck, text: 'Tracked worldwide shipping' },
                  { icon: RotateCcw, text: '30-day money back' },
                ].map(t => (
                  <span key={t.text} className="inline-flex items-center gap-1.5 font-sans text-[10px] font-semibold tracking-[0.08em] uppercase" style={{ color: 'rgba(74,58,36,0.65)' }}>
                    <t.icon size={12} strokeWidth={1.8} style={{ color: '#8A6A2E' }} /> {t.text}
                  </span>
                ))}
              </div>
              
              {paymentMethod === 'paypal' && (
                <div className="mt-4">
                  {!paypalReady ? (
                    paypalLoading ? (
                      <div className="w-full px-6 py-3 bg-[#FFFFFF] border border-[#EFE7D4] text-[#5A4A36]/70 text-xs tracking-[0.08em] uppercase font-sans flex items-center justify-center gap-2">
                        <Loader2 size={14} className="animate-spin" /> Loading payment options...
                      </div>
                    ) : (
                      <button onClick={handlePayPalClick} disabled={processing}
                        className="w-full px-6 py-3 bg-[#0070BA] text-white text-xs tracking-[0.08em] uppercase font-sans font-medium hover:bg-[#003087] disabled:opacity-50 transition-colors">
                        Continue with PayPal
                      </button>
                    )
                  ) : (
                    /* Apple Pay / Google Pay 已经提到页面顶部的 Express Checkout 区块，
                       这里只放 PayPal / Pay Later / 借记卡信用卡，避免同一页出现两套钱包按钮 */
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
          {/* Order Summary —— 右栏用暖米色底 + 左侧竖线，和左栏（净白卡片）形成明确分区 */}
          <div className="lg:col-span-1 checkout-zone-summary lg:pl-10 pt-8 lg:pt-0 pb-10 -mx-6 sm:-mx-8 lg:mx-0 px-6 sm:px-8 lg:px-0">
            <div className="bg-[#FFFFFF] border border-[#EFE7D4] rounded-xl shadow-[0_1px_2px_rgba(74,58,36,0.04),0_10px_30px_-22px_rgba(74,58,36,0.4)] p-6 md:p-8 lg:sticky lg:top-24">
              <h2 className="checkout-section-title mb-5">Order Summary</h2>
              <div className="space-y-3 text-sm font-sans">
                {/* 商品明细：缩略图 + 促销标签 + 赠品提示（对齐参考站右栏的信息密度）。
                    原来这里只有「名字 x 数量 …… 金额」一行文字，现在换成带图的明细。
                    金额口径不变：仍由本页的 discountedItems 计算，OrderSummaryLines
                    用的是同一个纯函数 computePromotionForProduct。 */}
                <OrderSummaryLines items={items} currency={currency} compact />
                <div style={{ borderTop: '1px solid rgba(74,58,36,0.14)' }} className="pt-1" />
                <div className="border-t border-[#EFE7D4]/30 pt-3 flex justify-between text-[#5A4A36]/60">
                  <span>Subtotal</span>
                  <span className="text-[#2A2118]">
                    {discountedSubtotal < subtotal && (
                      <span className="line-through text-[#5A4A36]/40 mr-2">{formatPrice(convertPrice(subtotal, currency), currency)}</span>
                    )}
                    {formatPrice(convertPrice(discountedSubtotal, currency), currency)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    value={couponCode}
                    onChange={e => { setCouponCode(e.target.value); setCouponMsg(null) }}
                    placeholder="Coupon code"
                    className="flex-1 min-w-0 px-3 py-2 border border-[#EFE7D4] bg-[#FFFFFF] text-xs font-sans text-[#2A2118] placeholder:text-[#5A4A36]/35 focus:outline-none focus:border-[#A07C34]/50 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={applyCoupon}
                    disabled={couponApplying || !couponCode.trim()}
                    className="px-4 py-2 text-[10px] tracking-[0.2em] uppercase font-sans font-medium border border-[#2A2118] text-[#2A2118] hover:bg-[#2A2118] hover:text-white transition-colors disabled:opacity-40"
                  >
                    {couponApplying ? '...' : 'Apply'}
                  </button>
                </div>
                {couponMsg && (
                  <p className={`text-[11px] ${couponMsg.type === 'ok' ? 'text-[#4A665D]' : 'text-red-500'}`}>{couponMsg.text}</p>
                )}
                {couponDiscount > 0 && (
                  <div className="flex justify-between text-[#4A665D]">
                    <span>Coupon ({couponAppliedCode})</span>
                    <span>-{formatPrice(convertPrice(couponDiscount, currency), currency)}</span>
                  </div>
                )}
                <div className="flex justify-between text-[#5A4A36]/60">
                  <span>Shipping</span>
                  <span>
                    {!addressTouched
                      ? <span className="italic" style={{ color: 'rgba(74,58,36,0.45)' }}>Calculated at checkout</span>
                      : shippingCost === 0
                        ? <span className="text-green-600">Free</span>
                        : formatPrice(convertPrice(shippingCost, currency), currency)}
                  </span>
                </div>
                <div className="border-t border-[#EFE7D4]/50 pt-3 flex justify-between font-medium">
                  <span className="text-[#2A2118]">Total</span>
                  <span className="font-en text-lg font-semibold text-[#2A2118]">
                    {formatPrice(convertPrice(addressTouched ? totalPrice : Math.max(0, Math.round((discountedSubtotal - couponDiscount) * 100) / 100), currency), currency)}
                  </span>
                </div>

                {/* You saved —— 参考站把「省了多少」单独列一行，是很有效的价格锚点 */}
                {savedTotal > 0 && (
                  <div className="flex justify-between font-sans text-[12px]" style={{ color: '#4A665D' }}>
                    <span>You saved</span>
                    <span className="font-semibold">−{formatPrice(convertPrice(savedTotal, currency), currency)}</span>
                  </div>
                )}

                {/* 预计到达日：跨境订单最大的疑虑就是「多久到」，这里给明确日期 */}
                {!!checkoutEta && (
                  <div className="border-t border-[#EFE7D4]/50 pt-3 space-y-1.5">
                    <div className="flex items-start gap-2 font-sans text-[11px] text-[#2A2118]">
                      <Truck size={13} strokeWidth={1.8} className="mt-0.5 shrink-0" style={{ color: '#8A6A2E' }} />
                      <span>
                        Arrives <strong className="font-semibold">{checkoutEta}</strong>
                        <span className="text-[#5A4A36]/50"> · {estimatedDays} business days</span>
                      </span>
                    </div>
                    <p className="font-sans text-[10px] text-[#5A4A36]/50 pl-[21px]">
                      Tracked shipping from the workshop · dispatched within 1–2 business days
                    </p>
                  </div>
                )}

                {/* 免邮进度：告诉客户还差多少，直接拉高客单价 */}
                {freeThreshold > 0 && (
                  <div className="border-t border-[#EFE7D4]/50 pt-3">
                    {shippingCost === 0 ? (
                      <p className="font-sans text-[11px] font-medium text-green-600 flex items-center gap-1.5">
                        <CheckCircle size={12} strokeWidth={2} /> You&apos;ve unlocked free shipping
                      </p>
                    ) : (
                      <>
                        <p className="font-sans text-[11px] text-[#5A4A36]/70 mb-2">
                          Add <strong className="text-[#2A2118]">{formatPrice(convertPrice(freeThreshold - discountedSubtotal, currency), currency)}</strong> more for free shipping
                        </p>
                        <div data-free-ship-bar="1" className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(74,58,36,0.20)' }}>
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(100, Math.round((discountedSubtotal / freeThreshold) * 100))}%`, backgroundColor: '#5F7D72' }}
                          />
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* 信任区：跨境客户在最后一步最需要确定性（真实要素，非媒体背书） */}
                <ShopWithConfidence reviewCount={reviewStats.count} rating={reviewStats.rating} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

