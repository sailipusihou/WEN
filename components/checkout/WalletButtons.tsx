'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Apple Pay / Google Pay 快捷支付按钮。
 *
 * 设计要点（重要，改动前先读）：
 *
 * 1. 这两个钱包**不是**独立的收款渠道，而是「用 Apple/Google 里存的卡来付这张卡单」。
 *    钱最终还是走同一个 PayPal 商户号、同一套 Orders v2 接口，所以服务端一行都不用改：
 *    createOrder 仍然打 /api/create-paypal-order，扣款仍然走 /api/capture-paypal-order。
 *
 * 2. 必须先在 PayPal 后台开通，否则 config() 会拒绝：
 *    - Google Pay：开发者后台 Apps & Credentials → Features → 勾选 Google Pay
 *    - Apple Pay：需要 ACDC（高级信用卡）权限 + 勾选 Apple Pay +
 *      托管域名验证文件 /.well-known/apple-developer-merchantid-domain-association +
 *      在后台把 lowflame.store 注册进 Apple Pay 域名列表（不需要 Apple 开发者账号）
 *
 * 3. 因此这里全程「探测到可用才渲染」。config() 失败或 isEligible 为 false 就什么都不显示 ——
 *    没开通还硬渲染按钮，用户点下去只会看到报错，比不显示更伤转化。
 *
 * 4. masterEnabled 是总开关（settings.paypalWalletsEnabled），默认关闭。
 *    开通流程走完、真机验证过之后再打开。
 */

interface Props {
  paypal: any
  masterEnabled: boolean
  allowApplePay: boolean
  allowGooglePay: boolean
  /** 用于 Apple Pay 支付单展示的金额（字符串，保留两位） */
  amount: string
  currency: string
  /** 建站内订单 + PayPal 订单，返回 PayPal order id（服务端核价） */
  createOrderId: () => Promise<string>
  /** 用 PayPal order id 完成扣款（服务端 capture + 落库） */
  captureOrder: (paypalOrderId: string) => Promise<void>
  onError: (msg: string) => void
  setProcessing: (v: boolean) => void
}

/**
 * 懒加载 Google 的 pay.js —— 只有真正要渲染 Google Pay 时才拉，避免拖慢普通结算页。
 */
function loadGooglePaySdk(): Promise<any> {
  const w = window as any
  if (w.google?.payments?.api?.PaymentsClient) return Promise.resolve(w.google)
  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-google-pay-sdk]') as HTMLScriptElement | null
    const done = () => (w.google?.payments?.api?.PaymentsClient ? resolve(w.google) : reject(new Error('Google Pay SDK unavailable')))
    if (existing) { existing.addEventListener('load', done); existing.addEventListener('error', () => reject(new Error('Google Pay SDK failed'))); return }
    const s = document.createElement('script')
    s.src = 'https://pay.google.com/gp/p/js/pay.js'
    s.async = true
    s.dataset.googlePaySdk = '1'
    s.onload = done
    s.onerror = () => reject(new Error('Google Pay SDK failed'))
    document.head.appendChild(s)
  })
}

export default function WalletButtons({
  paypal,
  masterEnabled,
  allowApplePay,
  allowGooglePay,
  amount,
  currency,
  createOrderId,
  captureOrder,
  onError,
  setProcessing,
}: Props) {
  const [showGooglePay, setShowGooglePay] = useState(false)
  const [showApplePay, setShowApplePay] = useState(false)
  const googleBtnRef = useRef<HTMLDivElement | null>(null)
  const probedRef = useRef(false)
  // Apple Pay 的 config 结果：必须在渲染探测阶段就取好缓存起来，
  // 点击时要同步建 session + begin()，不能等到点击后再 await。
  const appleCfgRef = useRef<any>(null)

  // ---------------- 探测 + 渲染 ----------------
  useEffect(() => {
    if (!masterEnabled || !paypal) return
    if (probedRef.current) return
    probedRef.current = true

    let cancelled = false

    // ---- Google Pay ----
    if (allowGooglePay && typeof paypal.Googlepay === 'function') {
      ;(async () => {
        try {
          const cfg = await paypal.Googlepay().config()
          if (cancelled) return
          setShowGooglePay(true)
          await loadGooglePaySdk()
          if (cancelled) return
          // 等 React 把容器挂上
          await new Promise(r => setTimeout(r, 0))
          const host = googleBtnRef.current
          if (!host) return

          const paymentsClient = new (window as any).google.payments.api.PaymentsClient({
            environment: (paypal.version && String(paypal.version).includes('sandbox')) ? 'TEST' : 'PRODUCTION',
          })

          const paymentDataRequest = {
            ...cfg,
            transactionInfo: {
              totalPriceStatus: 'FINAL',
              totalPrice: amount,
              currencyCode: currency,
              countryCode: cfg.countryCode || 'US',
            },
            emailRequired: true,
          }

          const button = paymentsClient.createButton({
            buttonType: 'buy',
            buttonColor: 'black',
            buttonLocale: 'en',
            onClick: async () => {
              try {
                setProcessing(true)
                // ⚠️ 顺序很重要：loadPaymentData 必须在用户手势里「第一件事」做。
                // 如果先 await 建单再去拉支付面板，手势上下文已经过期，
                // Chrome 会直接拒绝弹出（表现为点了没反应）。
                // 而且先弹面板再建单还有个好处：用户取消时不会留下孤儿订单。
                const paymentData = await paymentsClient.loadPaymentData(paymentDataRequest)
                const paypalOrderId = await createOrderId()
                const { orderId } = await paypal.Googlepay().confirmOrder({
                  orderId: paypalOrderId,
                  paymentSource: paymentData.paymentMethodData,
                })
                await captureOrder(orderId || paypalOrderId)
              } catch (e: any) {
                // 用户主动关掉面板不算错误
                const msg = String(e?.message || e)
                if (!/cancel/i.test(msg)) onError(msg || 'Google Pay failed. Please try another method.')
              } finally {
                setProcessing(false)
              }
            },
          })
          host.innerHTML = ''
          host.appendChild(button)
        } catch (e: any) {
          // 账号还没开通 Google Pay、或 Google 端判定不可用 —— 静默不显示按钮。
          // 打一条 warn 便于排查「按钮没出来」到底是哪一步断的。
          console.warn('[wallet] Google Pay unavailable:', e?.message || e)
          if (!cancelled) setShowGooglePay(false)
        }
      })()
    }

    // ---- Apple Pay ----
    const ApplePaySessionCtor = (window as any).ApplePaySession
    const applePayClient = paypal.ApplePay || paypal.Applepay
    if (allowApplePay && typeof applePayClient === 'function' && ApplePaySessionCtor) {
      ;(async () => {
        try {
          const cfg = await applePayClient().config()
          if (cancelled) return
          // 域名没注册 / 设备不支持时 isEligible 为 false
          if (cfg && cfg.isEligible === false) return
          // 配置先缓存起来：点击时必须「同步」建 session 并 begin()，
          // 不能等到点击后再 await 一次 config()，否则用户手势已经过期。
          appleCfgRef.current = cfg
          setShowApplePay(true)
        } catch {
          if (!cancelled) setShowApplePay(false)
        }
      })()
    }

    return () => { cancelled = true }
    // amount/currency 在结算页是稳定的；换金额时 React 会重建按钮容器
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [masterEnabled, paypal, allowApplePay, allowGooglePay])

  /**
   * Apple Pay 点击处理。
   *
   * ⚠️ 时序是这里最容易踩的坑（Apple 官方明确要求）：
   *   1. 在用户手势里**同步**创建 ApplePaySession 并立刻 begin()；
   *   2. 任何 await（config / 建单 / 商家校验）都必须放到会话回调里面。
   * 之前的写法是在 begin() 之前先 await 了 config() 和建单，
   * 手势上下文过期后 Safari 会直接报
   * "Attempting to start a new Apple Pay session without a user gesture"，
   * 表现为「点了 Apple Pay 按钮没反应」。
   */
  const startApplePay = () => {
    const applePayClient = paypal.ApplePay || paypal.Applepay
    const cfg = appleCfgRef.current
    if (!cfg) {
      onError('Apple Pay is unavailable right now. Please try another method.')
      return
    }

    setProcessing(true)
    // 订单号在 onvalidatemerchant 里异步建好后存这里，供 onpaymentauthorized 使用
    let paypalOrderId: string | null = null

    let session: any
    try {
      session = new (window as any).ApplePaySession(4, {
        countryCode: cfg.countryCode || 'US',
        currencyCode: cfg.currencyCode || currency,
        merchantCapabilities: cfg.merchantCapabilities || ['supports3DS'],
        supportedNetworks: cfg.supportedNetworks || ['visa', 'masterCard'],
        total: { label: 'Low Flame', amount },
        requiredBillingContactFields: ['postalAddress'],
      })
    } catch (e: any) {
      setProcessing(false)
      onError(e?.message || 'Apple Pay could not start.')
      return
    }

    // 商家校验 + 建单并行做，都在会话回调里，不占用手势
    session.onvalidatemerchant = async (event: any) => {
      try {
        const [validated, orderId] = await Promise.all([
          applePayClient().validateMerchant({ validationUrl: event.validationURL, displayName: 'Low Flame' }),
          createOrderId(),
        ])
        paypalOrderId = orderId
        session.completeMerchantValidation(validated.merchantSession)
      } catch (e: any) {
        try { session.abort() } catch { /* ignore */ }
        setProcessing(false)
        onError(e?.message || 'Apple Pay validation failed. Please try another method.')
      }
    }

    session.onpaymentauthorized = async (event: any) => {
      try {
        if (!paypalOrderId) throw new Error('Order reference lost. Please refresh and try again.')
        const { status } = await applePayClient().confirmOrder({
          orderId: paypalOrderId,
          paymentSource: event.payment,
        })
        if (status === 'APPROVED' || status === 'COMPLETED') {
          session.completePayment((window as any).ApplePaySession.STATUS_SUCCESS)
          await captureOrder(paypalOrderId)
        } else {
          session.completePayment((window as any).ApplePaySession.STATUS_FAILURE)
          onError('Apple Pay could not be completed. Please try another method.')
        }
      } catch (e: any) {
        try { session.completePayment((window as any).ApplePaySession.STATUS_FAILURE) } catch { /* ignore */ }
        onError(e?.message || 'Apple Pay payment failed.')
      } finally {
        setProcessing(false)
      }
    }

    session.oncancel = () => setProcessing(false)

    // 同步 begin —— 关键的一行
    session.begin()
  }

  if (!masterEnabled || (!showGooglePay && !showApplePay)) return null

  return (
    <div className="mt-3 space-y-2">
      {showApplePay && (
        <button
          type="button"
          data-wallet="applepay"
          onClick={startApplePay}
          className="apple-pay-button w-full h-11 rounded"
          aria-label="Pay with Apple Pay"
        />
      )}
      {showGooglePay && <div ref={googleBtnRef} data-wallet="googlepay" className="w-full" />}
    </div>
  )
}
