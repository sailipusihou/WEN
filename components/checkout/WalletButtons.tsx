'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Apple Pay / Google Pay 快捷支付按钮（Express Checkout）。
 *
 * 设计要点（改动前先读）：
 *
 * 1. 这两个钱包**不是**独立收款渠道，而是「用 Apple/Google 里存的卡来付这张卡单」。
 *    钱最终还是走同一个 PayPal 商户号、同一套 Orders v2 接口，所以服务端逻辑不用改：
 *    createOrderId 仍然打 /api/create-paypal-order，扣款仍然走 /api/capture-paypal-order。
 *
 * 2. 必须先在 PayPal 后台开通，否则 config() 会拒绝。因此这里全程「探测到可用才渲染」——
 *    没开通还硬渲染按钮，用户点下去只会报错，比不显示更伤转化。
 *
 * 3. ⚠️ 用户手势时序是这里最容易踩的坑：
 *    - Apple Pay：ApplePaySession 必须在点击回调里**同步**创建并 begin()，
 *      任何 await（config / 建单 / 商家校验）都要放进会话回调，否则 Safari 直接拒绝，
 *      表现为「点了没反应」。
 *    - Google Pay：loadPaymentData 必须是点击后的**第一个**动作，先 await 建单会被 Chrome 拒绝。
 *
 * 4. Express Checkout 的意义就是**跳过下面那张表单**，所以两个钱包都要主动索取收货信息：
 *    - Google Pay：shippingAddressRequired + emailRequired
 *    - Apple Pay：requiredShippingContactFields（地址/姓名/邮箱/电话）
 *    拿到后交给 createOrderId(contact)，服务端会按国家重新核算运费与总价。
 */

export interface WalletContact {
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  address?: string
  city?: string
  state?: string
  zipCode?: string
  /** 必须是**国家英文名**（例如 "Singapore"）—— 服务端的运费分区是按名字匹配的 */
  country?: string
}

interface Props {
  paypal: any
  masterEnabled: boolean
  allowApplePay: boolean
  allowGooglePay: boolean
  /** 用于 Apple Pay 支付单展示的金额（字符串，保留两位） */
  amount: string
  currency: string
  /** stack = 竖排（默认）；row = 并排两个按钮（Express Checkout 用） */
  layout?: 'stack' | 'row'
  /**
   * Express Checkout 卡片的标题。给了就用卡片包起来（带标题 + 说明 + "OR" 分隔线），
   * 一个钱包都不可用时整块不渲染，不会留下空卡片。
   */
  title?: string
  subtitle?: string
  /**
   * 并排显示在钱包前面的按钮（通常是精简版 PayPal 按钮的挂载容器）。
   * 参考站的 Express Checkout 里 PayPal 和两个钱包是排在一起的。
   */
  leading?: React.ReactNode
  /** 建站内订单 + PayPal 订单，返回 PayPal order id（服务端核价） */
  createOrderId: (contact?: WalletContact) => Promise<string>
  /** 用 PayPal order id 完成扣款（服务端 capture + 落库） */
  captureOrder: (paypalOrderId: string) => Promise<void>
  onError: (msg: string) => void
  setProcessing: (v: boolean) => void
}

/**
 * Google Pay 要求 shippingAddressRequired 时必须给出 allowedCountryCodes。
 * 这家店是按「Other = 全球其它地区」兜底发货的，所以这里放开绝大多数国家；
 * 服务端 calculateShipping 按国家名匹配分区，匹配不到就走 Rest of World，不会算错。
 */
const ALLOWED_COUNTRIES =
  ('AD,AE,AF,AG,AI,AL,AM,AO,AR,AT,AU,AW,AZ,BA,BB,BD,BE,BF,BG,BH,BI,BJ,BN,BO,BR,BS,BT,BW,BY,BZ,' +
   'CA,CD,CF,CG,CH,CI,CL,CM,CN,CO,CR,CU,CV,CY,CZ,DE,DJ,DK,DM,DO,DZ,EC,EE,EG,ER,ES,ET,FI,FJ,FM,FO,FR,GA,GB,GD,GE,GH,GI,GL,GM,GN,GP,GQ,GR,GT,GU,GW,GY,' +
   'HK,HN,HR,HT,HU,ID,IE,IL,IN,IQ,IR,IS,IT,JM,JO,JP,KE,KG,KH,KI,KM,KN,KR,KW,KZ,LA,LB,LC,LI,LK,LR,LS,LT,LU,LV,LY,' +
   'MA,MC,MD,ME,MG,MH,MK,ML,MM,MN,MO,MQ,MR,MT,MU,MV,MW,MX,MY,MZ,NA,NE,NG,NI,NL,NO,NP,NR,NZ,OM,PA,PE,PF,PG,PH,PK,PL,PR,PT,PW,PY,QA,RE,RO,RS,RU,RW,' +
   'SA,SB,SC,SD,SE,SG,SI,SK,SL,SM,SN,SO,SR,SV,SY,SZ,TC,TD,TG,TH,TJ,TL,TM,TN,TO,TR,TT,TV,TW,TZ,UA,UG,US,UY,UZ,VA,VC,VE,VG,VN,VU,WS,YE,ZA,ZM,ZW')
    .split(',')

/** ISO-3166 alpha-2 → 英文国家名（服务端运费分区按名字匹配，必须转） */
function countryNameFromCode(code: string): string {
  try {
    const dn = new Intl.DisplayNames(['en'], { type: 'region' })
    return dn.of(code.toUpperCase()) || code
  } catch {
    return code
  }
}

function splitName(full?: string): { firstName?: string; lastName?: string } {
  const s = (full || '').trim()
  if (!s) return {}
  const parts = s.split(/\s+/)
  if (parts.length === 1) return { firstName: parts[0] }
  return { firstName: parts.slice(0, -1).join(' '), lastName: parts[parts.length - 1] }
}

/**
 * 加载 Apple 官方的新版 Apple Pay JS SDK。
 *
 * ⚠️ 这是「Chrome / Edge 上 Apple Pay 不显示」的根因所在。
 *
 * 旧实现只判断 window.ApplePaySession —— 而这个对象**只在 Safari 里原生存在**，
 * 于是判断失败直接 return，Chrome/Edge 上按钮永远不出现。
 *
 * 但 Apple 现在提供了新版 SDK，它在**非 Safari 浏览器**里也会注册 ApplePaySession，
 * 并让 Windows 上的 Chrome/Edge 走「用 iPhone 扫描二维码」的跨设备付款流程（需 iOS 18+）。
 * PayPal 官方 v5 文档明确要求同时引入两个 SDK：
 *   <script src="https://applepay.cdn-apple.com/jsapi/1.latest/apple-pay-sdk.js">
 *
 * 实测（Windows + HTTPS + 有界面浏览器）：
 *   加载前 ApplePaySession=undefined → 加载后 =function，canMakePayments()=true
 */
const APPLE_PAY_SDK_URL = 'https://applepay.cdn-apple.com/jsapi/1.latest/apple-pay-sdk.js'

function loadApplePaySdk(): Promise<boolean> {
  const w = window as any
  if (typeof w.ApplePaySession === 'function') return Promise.resolve(true)
  return new Promise(resolve => {
    const existing = document.querySelector('script[data-apple-pay-sdk]') as HTMLScriptElement | null
    const done = () => resolve(typeof (window as any).ApplePaySession === 'function')
    if (existing) {
      existing.addEventListener('load', done)
      existing.addEventListener('error', () => resolve(false))
      return
    }
    const s = document.createElement('script')
    s.src = APPLE_PAY_SDK_URL
    s.async = true
    s.crossOrigin = 'anonymous'
    s.dataset.applePaySdk = '1'
    s.onload = () => setTimeout(done, 200)
    s.onerror = () => resolve(false)
    document.head.appendChild(s)
    setTimeout(() => resolve(typeof (window as any).ApplePaySession === 'function'), 12000)
  })
}

function loadGooglePaySdk(): Promise<any> {
  const w = window as any
  if (w.google?.payments?.api?.PaymentsClient) return Promise.resolve(w.google)
  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-google-pay-sdk]') as HTMLScriptElement | null
    const done = () => (w.google?.payments?.api?.PaymentsClient ? resolve(w.google) : reject(new Error('Google Pay SDK unavailable')))
    if (existing) {
      existing.addEventListener('load', done)
      existing.addEventListener('error', () => reject(new Error('Google Pay SDK failed')))
      return
    }
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
  layout = 'stack',
  title,
  subtitle,
  leading,
  createOrderId,
  captureOrder,
  onError,
  setProcessing,
}: Props) {
  const [showGooglePay, setShowGooglePay] = useState(false)
  const [showApplePay, setShowApplePay] = useState(false)
  /** ?debugpay=1 时把探测过程记录下来，用于在真实设备上排查「按钮不出来」 */
  const [debugLines, setDebugLines] = useState<string[]>([])
  const googleBtnRef = useRef<HTMLDivElement | null>(null)
  const probedRef = useRef(false)
  // Apple Pay 的 config：必须在渲染探测阶段就缓存好，点击时要同步建 session + begin()
  const appleCfgRef = useRef<any>(null)
  // Apple 新版 SDK 是否注册了 <apple-pay-button> 自定义元素（决定用新元素还是旧 CSS 按钮）
  const appleHasElementRef = useRef(false)
  // 原生 click 监听器要拿到最新的 startApplePay 闭包
  const startApplePayRef = useRef<() => void>(() => {})

  /** 只在 URL 带 ?debugpay=1 时收集诊断信息（对真实客户完全不可见） */
  const debugOn = (() => {
    try { return new URLSearchParams(window.location.search).get('debugpay') === '1' } catch { return false }
  })()
  const dlog = (msg: string) => {
    if (!debugOn) return
    console.log('[wallet-debug]', msg)
    setDebugLines(prev => [...prev, msg])
  }

  useEffect(() => {
    if (debugOn) {
      const w = window as any
      dlog(`UA: ${navigator.userAgent.slice(0, 110)}`)
      dlog(`ApplePaySession: ${typeof w.ApplePaySession}`)
      if (typeof w.ApplePaySession === 'function') {
        try { dlog(`canMakePayments: ${w.ApplePaySession.canMakePayments()}`) } catch (e: any) { dlog(`canMakePayments ERR: ${e?.message}`) }
        try { dlog(`supportsVersion(4): ${w.ApplePaySession.supportsVersion(4)}`) } catch (e: any) { dlog(`supportsVersion ERR: ${e?.message}`) }
      }
      dlog(`masterEnabled: ${masterEnabled}, paypalGlobal: ${!!paypal}`)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debugOn, masterEnabled, paypal])

  useEffect(() => {
    if (!masterEnabled || !paypal) return
    if (probedRef.current) return
    probedRef.current = true

    let cancelled = false

    // ---------------- Google Pay ----------------
    if (allowGooglePay && typeof paypal.Googlepay === 'function') {
      ;(async () => {
        try {
          const cfg = await paypal.Googlepay().config()
          if (cancelled) return
          setShowGooglePay(true)
          await loadGooglePaySdk()
          if (cancelled) return
          await new Promise(r => setTimeout(r, 0)) // 等 React 把容器挂上
          const host = googleBtnRef.current
          if (!host) return

          const paymentsClient = new (window as any).google.payments.api.PaymentsClient({ environment: 'PRODUCTION' })

          const paymentDataRequest = {
            ...cfg,
            transactionInfo: {
              totalPriceStatus: 'FINAL',
              totalPrice: amount,
              currencyCode: currency,
              countryCode: cfg.countryCode || 'US',
            },
            // Express Checkout：主动索取邮箱 + 收货地址，拿到的地址直接用于建单
            emailRequired: true,
            shippingAddressRequired: true,
            shippingAddressParameters: {
              allowedCountryCodes: ALLOWED_COUNTRIES,
              phoneNumberRequired: true,
            },
          }

          const button = paymentsClient.createButton({
            buttonType: 'buy',
            buttonColor: 'black',
            buttonLocale: 'en',
            buttonSizeMode: 'fill',
            onClick: async () => {
              try {
                setProcessing(true)
                // ⚠️ loadPaymentData 必须是点击后的第一个动作，否则手势上下文过期被 Chrome 拒绝
                const paymentData = await paymentsClient.loadPaymentData(paymentDataRequest)

                const sa = paymentData.shippingAddress || {}
                const nm = splitName(sa.name)
                const contact: WalletContact = {
                  firstName: nm.firstName,
                  lastName: nm.lastName,
                  email: paymentData.email || undefined,
                  phone: sa.phoneNumber || undefined,
                  address: sa.address1 || undefined,
                  city: sa.locality || undefined,
                  state: sa.administrativeArea || undefined,
                  zipCode: sa.postalCode || undefined,
                  country: sa.countryCode ? countryNameFromCode(sa.countryCode) : undefined,
                }

                const paypalOrderId = await createOrderId(contact)
                const { orderId } = await paypal.Googlepay().confirmOrder({
                  orderId: paypalOrderId,
                  paymentSource: paymentData.paymentMethodData,
                })
                await captureOrder(orderId || paypalOrderId)
              } catch (e: any) {
                const msg = String(e?.message || e)
                // 用户主动关掉支付面板不算错误
                if (!/cancel/i.test(msg)) onError(msg || 'Google Pay failed. Please try another method.')
              } finally {
                setProcessing(false)
              }
            },
          })
          host.innerHTML = ''
          host.appendChild(button)
        } catch (e: any) {
          console.warn('[wallet] Google Pay unavailable:', e?.message || e)
          if (!cancelled) setShowGooglePay(false)
        }
      })()
    }

    // ---------------- Apple Pay ----------------
    // ⚠️ 必须先加载 Apple 新版 SDK —— 它在非 Safari 浏览器（Chrome/Edge on Windows）
    // 里注册 ApplePaySession，从而支持「用 iPhone 扫码」的跨设备付款。
    // 不加载的话 ApplePaySession 在 Chrome/Edge 里是 undefined，按钮永远不会出现。
    const applePayClient = paypal.ApplePay || paypal.Applepay
    if (!allowApplePay) {
      dlog('Apple Pay: 被开关关闭 (allowApplePay=false)')
    } else if (typeof applePayClient !== 'function') {
      dlog(`Apple Pay: SDK 未提供 Applepay 组件 (typeof=${typeof applePayClient})`)
    } else {
      ;(async () => {
        try {
          const sdkOk = await loadApplePaySdk()
          if (cancelled) return
          const Ctor = (window as any).ApplePaySession
          dlog(`Apple Pay: Apple SDK 加载=${sdkOk}, ApplePaySession=${typeof Ctor}`)
          if (typeof Ctor !== 'function') {
            dlog('Apple Pay: 本环境不支持（需要 Safari，或 iOS 18+ 的跨设备扫码）')
            return
          }
          try {
            dlog(`Apple Pay: canMakePayments=${Ctor.canMakePayments()}`)
          } catch (e: any) {
            dlog(`Apple Pay: canMakePayments 报错 ${e?.message}`)
          }
          const cfg = await applePayClient().config()
          if (cancelled) return
          dlog(`Apple Pay config(): isEligible=${cfg?.isEligible} country=${cfg?.countryCode}`)
          if (cfg && cfg.isEligible === false) return
          appleCfgRef.current = cfg
          // 新版 SDK 会注册 <apple-pay-button> 自定义元素；没有就退回旧的 CSS 按钮
          appleHasElementRef.current = !!(window as any).customElements?.get?.('apple-pay-button')
          dlog(`Apple Pay: <apple-pay-button> 元素=${appleHasElementRef.current}`)
          setShowApplePay(true)
        } catch (e: any) {
          dlog(`Apple Pay 探测失败: ${e?.message || e}`)
          if (!cancelled) setShowApplePay(false)
        }
      })()
    }

    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [masterEnabled, paypal, allowApplePay, allowGooglePay])

  /**
   * Apple Pay 点击处理。
   * 时序：同步建 session 并 begin()，所有 await 都放进会话回调（Apple 官方硬性要求）。
   * 建单挪到 onpaymentauthorized 里做 —— 那时才拿得到 shippingContact（Express Checkout 需要地址）。
   */
  const startApplePay = () => {
    const applePayClient = paypal.ApplePay || paypal.Applepay
    const cfg = appleCfgRef.current
    if (!cfg) {
      onError('Apple Pay is unavailable right now. Please try another method.')
      return
    }

    setProcessing(true)

    let session: any
    try {
      session = new (window as any).ApplePaySession(4, {
        countryCode: cfg.countryCode || 'US',
        currencyCode: cfg.currencyCode || currency,
        merchantCapabilities: cfg.merchantCapabilities || ['supports3DS'],
        supportedNetworks: cfg.supportedNetworks || ['visa', 'masterCard'],
        total: { label: 'Low Flame', amount },
        // Express Checkout：索取收货信息，用来直接建单、跳过下面的表单
        requiredShippingContactFields: ['postalAddress', 'name', 'email', 'phone'],
      })
    } catch (e: any) {
      setProcessing(false)
      onError(e?.message || 'Apple Pay could not start.')
      return
    }

    session.onvalidatemerchant = async (event: any) => {
      try {
        const validated = await applePayClient().validateMerchant({
          validationUrl: event.validationURL,
          displayName: 'Low Flame',
        })
        session.completeMerchantValidation(validated.merchantSession)
      } catch (e: any) {
        try { session.abort() } catch { /* ignore */ }
        setProcessing(false)
        onError(e?.message || 'Apple Pay validation failed. Please try another method.')
      }
    }

    session.onpaymentauthorized = async (event: any) => {
      try {
        const sc = event.payment?.shippingContact || {}
        const pa = sc.postalAddress || {}
        const contact: WalletContact = {
          firstName: sc.givenName || undefined,
          lastName: sc.familyName || undefined,
          email: sc.emailAddress || undefined,
          phone: sc.phoneNumber || undefined,
          address: (pa.street || []).join(' ') || undefined,
          city: pa.city || undefined,
          state: pa.state || undefined,
          zipCode: pa.postalCode || undefined,
          country: pa.country ? countryNameFromCode(pa.country) : (pa.countryCode ? countryNameFromCode(pa.countryCode) : undefined),
        }

        const paypalOrderId = await createOrderId(contact)
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

    // 同步 begin() —— 关键的一行，不能有任何 await 挡在前面
    session.begin()
  }

  // 让原生事件监听器始终拿到最新一次的 startApplePay 闭包
  startApplePayRef.current = startApplePay

  /**
   * 把 Apple 的 <apple-pay-button> 挂进容器，并**直接**在它身上绑原生 click。
   *
   * 为什么不能靠 React 的 onClick：
   *   Apple 这个自定义元素内部会吞掉 click（不冒泡到外层），
   *   套一层 <button> 或在容器上挂 onClick 都收不到事件 —— 实测 ApplePaySession
   *   构造函数根本不会被调用，页面表现就是「点了没反应」。
   */
  const bindAppleButton = (el: HTMLDivElement | null) => {
    if (!el) return
    if (!el.querySelector('apple-pay-button')) {
      const btn = document.createElement('apple-pay-button') as any
      btn.setAttribute('buttonstyle', 'black')
      btn.setAttribute('type', 'buy')
      btn.setAttribute('locale', 'en-US')
      btn.setAttribute('data-wallet-btn', 'applepay')
      btn.style.setProperty('--apple-pay-button-width', '100%')
      btn.style.setProperty('--apple-pay-button-height', '44px')
      btn.style.setProperty('--apple-pay-button-border-radius', '4px')
      btn.style.setProperty('--apple-pay-button-padding', '0px')
      btn.style.cursor = 'pointer'
      // 原生监听器直接绑在元素本身（合成事件收不到）
      btn.addEventListener('click', (ev: Event) => {
        ev.preventDefault()
        try { startApplePayRef.current() } catch (e) { console.error('[wallet] apple pay click failed', e) }
      })
      el.appendChild(btn)
    }
  }

  const hasAny = masterEnabled && (showGooglePay || showApplePay)
  const hasContent = hasAny || !!leading

  // 诊断模式下即使没有可用钱包也要把面板显示出来，否则没法看原因
  if (!hasContent && !debugOn) return null
  if (!masterEnabled && !leading && !debugOn) return null

  const items = [
    // PayPal 精简按钮（由结算页渲染进这个容器）排在最左，和参考站一致
    leading ? <div key="leading" className="express-leading">{leading}</div> : null,
    showApplePay
      ? (
        // Apple 新版 SDK 注册了 <apple-pay-button> 自定义元素时优先用它
        // （Chrome/Edge 上旧的 -apple-pay-button CSS 按钮不会渲染）
        //
        // ⚠️ 点击必须挂在**元素自身**上，而且用原生 addEventListener：
        //   Apple 的这个自定义元素会自己吞掉 click（不冒泡），套在外面的 <button>
        //   onClick 以及 React 的合成事件都收不到，表现就是「点了没反应」。
        //   实测：包一层观测后发现 ApplePaySession 构造函数一次都没被调用。
        appleHasElementRef.current
          ? (
            <div
              key="applepay"
              data-wallet="applepay"
              className="w-full"
              style={{ display: 'block', cursor: 'pointer' }}
              ref={bindAppleButton}
            />
          )
          : (
            <button
              key="applepay"
              type="button"
              data-wallet="applepay"
              onClick={startApplePay}
              className="apple-pay-button h-11 rounded w-full"
              aria-label="Pay with Apple Pay"
            />
          )
      )
      : null,
    showGooglePay
      ? <div key="googlepay" ref={googleBtnRef} data-wallet="googlepay" className="w-full" />
      : null,
  ].filter(Boolean)

  const debugPanel = debugOn ? (
    <div
      data-wallet-debug="1"
      className="mt-4 p-3 font-mono text-[11px] leading-relaxed"
      style={{ backgroundColor: '#111', color: '#7ee787', borderRadius: 4, whiteSpace: 'pre-wrap' }}
    >
      {'— wallet debug —\n' + (debugLines.length ? debugLines.join('\n') : '(暂无记录)')}
      {'\n显示结果: applePay=' + showApplePay + ' googlePay=' + showGooglePay}
    </div>
  ) : null

  if (!hasAny && !leading && debugOn) {
    return <div className="bg-[#FFFFFF]/80 border border-[#EFE7D4]/50 p-6 md:p-8">{debugPanel}</div>
  }

  return (
    <div className={title ? 'bg-[#FFFFFF]/80 border border-[#EFE7D4]/50 p-6 md:p-8' : ''}>
      {title && (
        <>
          <h2 className="font-sans text-[10px] text-[#A07C34] tracking-[0.24em] uppercase font-medium mb-2">{title}</h2>
          <p className="font-sans text-sm text-[#5A4A36]/60 mb-4">
            {subtitle || 'Skip the form — pay in one tap with a saved card.'}
          </p>
        </>
      )}
      <div className={`wallet-buttons ${layout === 'row' ? 'wallet-buttons-row' : 'wallet-buttons-stack'}`}>
        {items}
      </div>
      {title && (
        <div className="flex items-center gap-3 mt-5">
          <span className="flex-1 h-px" style={{ backgroundColor: 'rgba(74,58,36,0.18)' }} />
          <span className="font-sans text-[10px] tracking-[0.24em] uppercase" style={{ color: 'rgba(74,58,36,0.45)' }}>or</span>
          <span className="flex-1 h-px" style={{ backgroundColor: 'rgba(74,58,36,0.18)' }} />
        </div>
      )}
      {debugPanel}
    </div>
  )
}
