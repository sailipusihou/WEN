'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCart } from '@/context/CartContext'
import { useCurrency } from '@/context/CurrencyContext'
import { convertPrice } from '@/lib/cart-types'
import WalletButtons, { type WalletContact } from '@/components/checkout/WalletButtons'
import { fetchPayPalConfig, loadPayPalSdk, getPayPalInstance, type PayPalConfig } from '@/lib/paypal-sdk'

/**
 * 购物车页的「直接支付」快捷结账（方案 A）。
 *
 * 对齐参考站：购物车右栏除 Checkout 外，还能直接用钱包/PayPal 付款，不用先跳结算页。
 *
 * 为什么购物车页**不需要**再要一个收货地址表单：
 *   PayPal / Apple Pay / Google Pay 的付款弹窗本身就会收集收货地址，
 *   而且比手填更可靠（地址来自买家账户）。所以这里只挂按钮。
 *   拿到地址的路径有两条：
 *     · Apple Pay / Google Pay：通过 requiredShippingContactFields 回传 contact
 *     · 普通 PayPal：由 PayPal 自己收集，我们在 capture 时把地址写回站内订单
 *   （这两条回填逻辑在已有的 capture-paypal-order 接口里实现，已有验证）
 *
 * 金额口径：和结算页完全一致 —— 运费/折扣都由**服务端**按订单重新核算，
 * 客户端传的 total 只作展示，服务端不采信（避免被改价）。
 */
export default function CartExpressCheckout({ onSuccess }: { onSuccess?: (orderId: string) => void }) {
  const { items, subtotal, clearCart } = useCart()
  const { currency } = useCurrency()
  const router = useRouter()

  const [paypal, setPaypal] = useState<any>(null)
  const [config, setConfig] = useState<PayPalConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [processing, setProcessing] = useState(false)

  // 本次 express 流程创建的站内订单 id：createOrderId 写入，captureOrder 读取。
  // ⚠️ 不能用 state —— WalletButtons 的 onApprove 回调里读到的会是旧值。
  const pendingOrderRef = useRef<string | null>(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      const cfg = await fetchPayPalConfig()
      if (!alive) return
      setConfig(cfg)
      if (!cfg.enabled || !cfg.clientId) { setLoading(false); return }
      const r = await loadPayPalSdk(cfg)
      if (!alive) return
      if (r.ok) setPaypal(getPayPalInstance())
      else setError(r.error || 'PayPal unavailable')
      setLoading(false)
    })()
    return () => { alive = false }
  }, [])

  /**
   * 渲染 PayPal 按钮。
   *
   * ⚠️ 关键：WalletButtons 自己**不渲染** PayPal 按钮 —— 它只负责 Apple Pay / Google Pay，
   *    PayPal 按钮由父组件通过 `leading` 容器传进去（结算页就是这么做的）。
   *    少了这一步，购物车右栏会只剩钱包按钮、没有 PayPal 主按钮。
   */
  useEffect(() => {
    if (!paypal) return
    const el = document.getElementById('cart-paypal-container')
    if (!el || el.dataset.rendered) return
    el.dataset.rendered = '1'
    try {
      paypal.Buttons({
        fundingSource: paypal.FUNDING?.PAYPAL,
        style: { layout: 'vertical', shape: 'rect', height: 44, tagline: false, label: 'paypal' },
        createOrder: () => createOrderId(),
        onApprove: async (data: any) => {
          setProcessing(true)
          setError('')
          try {
            await captureOrder(data.orderID)
          } catch (e: any) {
            setError(e.message || 'Payment verification failed')
          } finally {
            setProcessing(false)
          }
        },
        onError: () => setError('A PayPal error occurred. Please try again.'),
      }).render(el)
    } catch (e) {
      console.warn('[paypal] cart express render failed', e)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paypal])

  // 购物车为空时不渲染（避免客户点下去建出一张空单）
  if (!items.length) return null

  const subtotalUsd = convertPrice(subtotal, 'USD')

  /**
   * 第 1 步：建站内订单 → 第 2 步：按服务端确认的总额创建 PayPal 订单。
   * 钱包回传的 contact 会一并写入，服务端按 country 重新核算运费。
   */
  const createOrderId = async (contact?: WalletContact): Promise<string> => {
    setError('')

    // 购物车里的商品直接作为订单明细（赠品由服务端按额度决定免费/计价）
    const orderItems = items.map(i => ({
      id: i.id,
      productId: i.id,
      name: i.name,
      nameEn: i.nameEn || i.name,
      image: i.image,
      price: i.price,
      quantity: i.quantity,
      category: i.category,
      isGift: (i as any).isGift || false,
      giftFor: (i as any).giftFor || undefined,
    }))

    const shipping = {
      firstName: contact?.firstName || '',
      lastName: contact?.lastName || '',
      email: contact?.email || '',
      phone: contact?.phone || '',
      address: contact?.address || '',
      city: contact?.city || '',
      state: contact?.state || '',
      zipCode: contact?.zipCode || '',
      country: contact?.country || '',
    }

    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: orderItems,
        shipping,
        subtotal: subtotalUsd,
        total: subtotalUsd,          // 服务端会重算，这里只作兜底
        currency: 'USD',
        notes: 'Payment: PayPal (cart express)',
        userEmail: shipping.email || undefined,
        paymentMethod: 'paypal',
        paypalTransaction: null,
      }),
    })
    const d = await res.json().catch(() => ({}))
    if (!res.ok || !d?.id) {
      throw new Error(d?.error || 'Could not start your order. Please try again.')
    }
    pendingOrderRef.current = d.id

    const ppRes = await fetch('/api/create-paypal-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: d.id }),
    })
    const ppData = await ppRes.json().catch(() => ({}))
    if (!ppRes.ok || !ppData?.id) {
      throw new Error(ppData?.error || 'PayPal order creation failed')
    }
    return ppData.id
  }

  /** 扣款 → 确认订单 → 清空购物车 → 跳成功页 */
  const captureOrder = async (paypalOrderId: string) => {
    const orderId = pendingOrderRef.current
    if (!orderId) throw new Error('Order reference lost. Please refresh and try again.')

    const res = await fetch('/api/capture-paypal-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, paypalOrderId }),
    })
    const d = await res.json().catch(() => ({}))
    if (!res.ok || d.status !== 'COMPLETED') {
      throw new Error(d.error || 'Payment could not be confirmed. Please contact us if you were charged.')
    }

    const finalId = d.orderId || orderId
    try { sessionStorage.setItem('otm_last_order', finalId) } catch { /* ignore */ }
    clearCart()
    // ⚠️ 站内没有 /checkout/success 这个路由（结算页是用 setSubmitted(true) 切页内状态），
    //    所以这里不能 router.push 一个不存在的路径。改为回调让购物车页渲染成功面板。
    if (onSuccess) onSuccess(finalId)
    else router.push('/order-tracking')
  }

  return (
    <div className="mb-4" data-cart-express="1">
      <p className="font-sans text-[10px] font-semibold tracking-[0.2em] uppercase mb-2.5 text-center"
        style={{ color: 'rgba(74,58,36,0.55)' }}>
        Express checkout
      </p>

      {loading && (
        <div className="flex items-center justify-center gap-2 py-4 font-sans text-[12px]"
          style={{ color: 'rgba(74,58,36,0.6)' }} data-cart-express-loading="1">
          <span className="inline-block w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
          Preparing payment options…
        </div>
      )}

      {!loading && error && (
        <p className="font-sans text-[11px] text-center py-2" style={{ color: '#A83420' }} data-cart-express-error="1">
          {error}
        </p>
      )}

      {!loading && paypal && config?.enabled && (
        <WalletButtons
          paypal={paypal}
          masterEnabled={config.wallets?.enabled !== false}
          allowApplePay={config.wallets?.applePay !== false}
          allowGooglePay={config.wallets?.googlePay !== false}
          amount={subtotalUsd.toFixed(2)}
          currency="USD"
          layout="stack"
          // ⚠️ 必须提供 leading：PayPal 按钮挂在这个容器里，WalletButtons 自己不会渲染它
          leading={<div id="cart-paypal-container" data-cart-paypal="1" style={{ width: '100%', minHeight: 44 }} />}
          createOrderId={createOrderId}
          captureOrder={captureOrder}
          onError={m => setError(m)}
          setProcessing={setProcessing}
        />
      )}

      {!loading && paypal && !error && (
        <p className="font-sans text-[10px] text-center mt-2.5 leading-relaxed"
          style={{ color: 'rgba(74,58,36,0.5)' }}>
          Shipping address and payment details are collected securely by your wallet.
        </p>
      )}

      {processing && !loading && (
        <p className="font-sans text-[11px] text-center mt-2" style={{ color: 'rgba(74,58,36,0.7)' }}>
          Processing payment…
        </p>
      )}

      {/* 分隔线：快捷支付 / 常规结算 */}
      <div className="flex items-center gap-3 my-4" data-cart-express-divider="1">
        <span className="flex-1 h-px" style={{ backgroundColor: 'rgba(74,58,36,0.18)' }} />
        <span className="font-sans text-[10px] tracking-[0.18em] uppercase" style={{ color: 'rgba(74,58,36,0.45)' }}>or</span>
        <span className="flex-1 h-px" style={{ backgroundColor: 'rgba(74,58,36,0.18)' }} />
      </div>
    </div>
  )
}
