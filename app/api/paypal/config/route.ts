import { NextResponse } from 'next/server'
import { getRepository } from '@/lib/repository'

export async function GET() {
  try {
    const repo = getRepository()
    const settings: any = repo.settings.get()

    // Apple Pay / Google Pay 开关。
    // 默认 false：这两个钱包必须先在 PayPal 后台开通（Google Pay 勾选、Apple Pay 上传域名验证文件
    // 并注册域名）才会真正可用；没开通就渲染按钮，用户点下去只会报错，比不显示更糟。
    // 所以做成显式开关，开通并验证通过后再打开。
    const wallets = {
      enabled: settings.paypalWalletsEnabled === true,
      applePay: settings.paypalApplePayEnabled !== false,
      googlePay: settings.paypalGooglePayEnabled !== false,
    }

    const dbEnabled = settings.paypalEnabled && settings.paypalClientId
    const envClientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || process.env.PAYPAL_CLIENT_ID || ''

    if (dbEnabled) {
      return NextResponse.json({
        enabled: settings.paypalEnabled,
        clientId: settings.paypalClientId,
        env: settings.paypalEnv || 'sandbox',
        wallets,
      })
    }

    return NextResponse.json({
      enabled: !!envClientId,
      clientId: envClientId,
      env: process.env.PAYPAL_ENV || 'sandbox',
      wallets,
    })
  } catch {
    return NextResponse.json({
      enabled: false,
      clientId: '',
      env: 'sandbox',
      wallets: { enabled: false, applePay: false, googlePay: false },
    })
  }
}