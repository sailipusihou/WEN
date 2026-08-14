// 4PX API 调试接口 — 查看完整请求/响应详情
// GET /api/shipping/4px/debug?action=create  (测试创建订单)
// GET /api/shipping/4px/debug?action=tracking&trackingNumber=xxx  (测试轨迹查询)
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { getCarrierConfig } from '@/lib/shipping-config'
import { FourPXClient } from '@/lib/integrations/fourpx'
import crypto from 'crypto'

export async function GET(req: NextRequest) {
  try {
    const auth = requireAdmin(req)
    if ('error' in auth) return auth.error

    const { searchParams } = new URL(req.url)
    const action = searchParams.get('action') || 'tracking'
    const trackingNumber = searchParams.get('trackingNumber') || 'TEST123456'

    const cfg = getCarrierConfig('4px')
    if (!cfg?.enabled || !cfg.credentials.appKey || !cfg.credentials.appSecret) {
      return NextResponse.json({
        error: '4PX not configured',
        config: cfg,
      }, { status: 400 })
    }

    const appKey = cfg.credentials.appKey
    const appSecret = cfg.credentials.appSecret
    const baseUrl = cfg.mode === 'sandbox'
      ? 'https://open-test.4px.com/router/api/service'
      : 'https://open.4px.com/router/api/service'

    const timestamp = Date.now().toString()

    let method = ''
    let bodyData: Record<string, any> = {}

    if (action === 'create') {
      method = 'ds.xms.order.create'
      const refNo = 'DEBUG-' + Date.now().toString(36).toUpperCase()
      bodyData = {
        ref_no: refNo,
        product_code: 'SZXB',
        country_code: 'US',
        currency_code: 'USD',
        parcel_list: [{
          weight: 200,
          length: 20,
          width: 15,
          height: 10,
          parcel_value: 10,
          currency: 'USD',
          include_battery: 'N',
          declare_product_info: [{
            name_cn: '工艺品',
            name_en: 'Craft Gift',
            quantity: 1,
            declared_value: 10,
            currency: 'USD',
            hs_code: '4421909090',
            weight: 200,
          }],
        }],
        recipient_info: {
          name: 'Test User',
          phone: '1234567890',
          email: 'test@example.com',
          country: 'US',
          state: 'CA',
          city: 'Los Angeles',
          street: '123 Main Street',
          postcode: '90001',
          mobile: '1234567890',
        },
        sender_info: {
          name: 'Test Sender',
          phone: '0755-12345678',
          country: 'CN',
          province: 'Guangdong',
          city: 'Shenzhen',
          address: 'Nanshan District, Shenzhen',
          zip: '518000',
        },
        attachment_info: {
          attachment_type: 'PDF',
        },
        remark: 'Debug test order',
      }
    } else {
      method = 'tr.order.tracking.get'
      bodyData = {
        deliveryOrderNo: trackingNumber,
      }
    }

    // 构建公共参数 (下划线命名)
    const commonParams: Record<string, string> = {
      method,
      app_key: appKey,
      v: 'V1.0.0',
      timestamp,
      format: 'json',
      sign: '',
    }

    const bodyStr = JSON.stringify(bodyData)

    // 计算签名
    const signParams: Record<string, string> = { ...commonParams }
    delete signParams.sign
    const keys = Object.keys(signParams).sort()
    let signStr = ''
    for (const key of keys) {
      signStr += key + signParams[key]
    }
    signStr += bodyStr + appSecret
    const sign = crypto.createHash('md5').update(signStr, 'utf8').digest('hex').toLowerCase()
    commonParams.sign = sign

    // 拼接URL
    const queryString = new URLSearchParams(commonParams).toString()
    const fullUrl = `${baseUrl}?${queryString}`

    // 发送请求
    let rawResponseText = ''
    let httpStatus = 0
    let httpStatusText = ''

    try {
      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: bodyStr,
      })

      httpStatus = response.status
      httpStatusText = response.statusText
      rawResponseText = await response.text()
    } catch (fetchError: any) {
      return NextResponse.json({
        error: 'Fetch request failed',
        fetchError: fetchError.message,
        requestDetails: {
          method: 'POST',
          url: fullUrl,
          headers: { 'Content-Type': 'application/json' },
          body: bodyData,
          bodyString: bodyStr,
        },
        signDetails: {
          paramsToSign: keys.map(k => `${k}=${signParams[k]}`),
          signStringPreview: signStr.slice(0, 200) + '...',
          signStringLength: signStr.length,
          computedSign: sign,
        },
        config: {
          appKey: appKey.slice(0, 6) + '****',
          appSecret: '****' + appSecret.slice(-4),
          mode: cfg.mode,
          baseUrl,
        },
      }, { status: 500 })
    }

    // 尝试解析JSON
    let parsedResponse: any = null
    try {
      parsedResponse = JSON.parse(rawResponseText)
    } catch {}

    return NextResponse.json({
      action,
      httpStatus,
      httpStatusText,
      request: {
        url: fullUrl,
        method: 'POST',
        commonParams: {
          ...commonParams,
          app_key: commonParams.app_key.slice(0, 6) + '****',
          sign: commonParams.sign.slice(0, 8) + '****',
        },
        body: bodyData,
        bodyLength: bodyStr.length,
      },
      // 安全修复 H9: 不再返回签名构造过程 (signString 含完整 appSecret, computedSign 可被离线爆破复用)
      signDebug: {
        sortedParamKeys: keys,
        signStringLength: signStr.length,
      },
      response: {
        rawText: rawResponseText,
        parsed: parsedResponse,
      },
      config: {
        mode: cfg.mode,
        baseUrl,
        appKeyMasked: appKey.slice(0, 6) + '****',
        appSecretMasked: '****' + appSecret.slice(-4),
      },
    })
  } catch (e: any) {
    return NextResponse.json({
      error: e.message || 'Debug failed',
      stack: e.stack,
    }, { status: 500 })
  }
}
