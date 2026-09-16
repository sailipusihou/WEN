/**
 * lib/paypal-sdk.ts —— PayPal JS SDK 的共用加载器。
 *
 * 为什么抽出来：结算页和购物车页都要挂 PayPal / Apple Pay / Google Pay 按钮，
 * 两个页面各自复制一份加载逻辑迟早会分叉（之前就踩过 locale 用连字符导致 SDK 直接 400 的坑）。
 * 这里做成模块级单例：谁先调用谁触发加载，后来者复用同一个 Promise。
 *
 * ⚠️ locale 必须用下划线：navigator.language 在所有真实浏览器里返回连字符格式
 *    （en-US / zh-CN），而 PayPal SDK 只认下划线，传连字符会直接 400、SDK 不加载。
 */

export interface PayPalConfig {
  enabled: boolean
  clientId?: string
  env?: string
  wallets?: { enabled?: boolean; applePay?: boolean; googlePay?: boolean }
}

let loadPromise: Promise<{ ok: boolean; error?: string }> | null = null

/** 取 PayPal 配置（服务端读数据库，前端不持有密钥） */
export async function fetchPayPalConfig(): Promise<PayPalConfig> {
  try {
    const res = await fetch('/api/paypal/config')
    return await res.json()
  } catch {
    return { enabled: false }
  }
}

/**
 * 加载 PayPal SDK。重复调用复用同一个 Promise，不会重复插入 <script>。
 * 返回 { ok: true } 表示 window.paypal.Buttons 已可用。
 */
export function loadPayPalSdk(presetConfig?: PayPalConfig): Promise<{ ok: boolean; error?: string }> {
  if (loadPromise) return loadPromise

  loadPromise = (async () => {
    const config = presetConfig || await fetchPayPalConfig()
    if (!config?.enabled || !config?.clientId) {
      loadPromise = null
      return { ok: false, error: 'PayPal is not available at the moment.' }
    }

    const locale = (navigator.language || 'en_US').replace('-', '_')
    const walletParam = config.wallets?.enabled ? '&components=buttons,applepay,googlepay' : ''
    const buildSrc = (useLocale: boolean) =>
      `https://www.paypal.com/sdk/js?client-id=${config.clientId}&currency=USD&intent=capture` +
      `${useLocale ? `&locale=${locale}` : ''}${walletParam}`

    const mount = (useLocale: boolean, isRetry: boolean) =>
      new Promise<{ ok: boolean; error?: string }>(resolve => {
        const script = document.createElement('script')
        script.src = buildSrc(useLocale)
        script.onload = () => {
          if (typeof (window as any).paypal?.Buttons === 'function') {
            resolve({ ok: true })
          } else {
            loadPromise = null
            resolve({ ok: false, error: 'PayPal failed to initialize. Please try again.' })
          }
        }
        script.onerror = () => {
          script.remove()
          if (!isRetry) {
            // 去掉 locale 再试一次（有些地区不支持传入的 locale）
            mount(false, true).then(resolve)
          } else {
            loadPromise = null
            resolve({ ok: false, error: 'Failed to load PayPal. Please try again.' })
          }
        }
        document.body.appendChild(script)
      })

    return mount(true, false)
  })()

  return loadPromise
}

/** 取已加载的 window.paypal 实例（未加载则返回 null） */
export function getPayPalInstance(): any {
  if (typeof window === 'undefined') return null
  const pp = (window as any).paypal
  return typeof pp?.Buttons === 'function' ? pp : null
}
