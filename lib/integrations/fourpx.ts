// 4PX递四方 API 客户端
// 文档: http://open.4px.com/apiInfo/partner
// 沙箱环境: SANDBOX_ADDRESS
// 正式环境: FORMAL_ADDRESS

import crypto from 'crypto'
import type { TrackStatus } from '@/lib/shipping'

export interface FourPXConfig {
  appKey: string
  appSecret: string
  accessToken?: string
  sandbox?: boolean
}

const SANDBOX_BASE = 'https://open-test.4px.com/router/api/service'
const FORMAL_BASE = 'https://open.4px.com/router/api/service'

// 物流轨迹查询接口方法名
const METHOD_TRACKING = 'tr.order.tracking.get'
// 创建订单接口方法名
const METHOD_CREATE_ORDER = 'ds.xms.order.create'
// 获取物流产品接口
const METHOD_GET_PRODUCTS = 'ds.xms.product.get'

export interface TrackEvent4PX {
  event_code: string
  event_name: string
  event_time: string
  location: string
  description: string
}

export interface TrackingResult4PX {
  tracking_number: string
  status: string
  events: TrackEvent4PX[]
  estimated_delivery?: string
}

export interface CreateOrderParams {
  ref_no: string                 // 客户参考号 (我们的订单号)
  product_code: string           // 物流产品代码
  country_code: string           // 国家二字代码
  currency_code: string          // 币种代码
  parcel_list: Array<{
    weight: number               // 重量 g
    length?: number
    width?: number
    height?: number
    parcel_value: number         // 包裹申报价值
    currency: string             // 币种
    include_battery: 'Y' | 'N'   // 是否含电池
    battery_type?: string
    declare_product_info: Array<{
      name_cn: string
      name_en: string
      quantity: number
      declared_value: number
      currency?: string
      hs_code?: string
      weight?: number
    }>
  }>
  recipient_info: {
    name: string
    phone?: string
    email?: string
    country: string
    state?: string
    city: string
    street: string
    postcode?: string
    mobile?: string
  }
  sender_info?: {
    name: string
    phone?: string
    country?: string
    province?: string
    city?: string
    address?: string
    zip?: string
  }
  attachment_info?: {
    attachment_type?: string     // PDF, LABEL, INVOICE 等
  }
  return_info?: {
    return_type?: string
    return_addr?: string
  }
  remark?: string
}

export class FourPXClient {
  private config: Required<FourPXConfig> & { baseUrl: string }

  constructor(config: FourPXConfig) {
    if (!config.appKey || !config.appSecret) {
      throw new Error('4PX appKey and appSecret are required')
    }
    this.config = {
      appKey: config.appKey,
      appSecret: config.appSecret,
      accessToken: config.accessToken || '',
      sandbox: config.sandbox !== false,
      baseUrl: config.sandbox !== false ? SANDBOX_BASE : FORMAL_BASE,
    }
  }

  // 生成签名 (MD5)
  // 签名规则: 按参数名首字母升序排序, key+value拼接, 最后拼app_secret, MD5 32位小写
  // 注意: sign 和 access_token 不参与签名
  private generateSign(params: Record<string, string>, body: string): string {
    const signParams: Record<string, string> = { ...params }
    delete signParams.sign

    const keys = Object.keys(signParams).sort()
    let signStr = ''
    for (const key of keys) {
      signStr += key + signParams[key]
    }
    signStr += body + this.config.appSecret

    return crypto.createHash('md5').update(signStr, 'utf8').digest('hex').toLowerCase()
  }

  // 构建公共请求参数
  private buildCommonParams(method: string): Record<string, string> {
    const timestamp = Date.now().toString()
    return {
      method,
      app_key: this.config.appKey,
      v: 'V1.0.0',
      timestamp,
      format: 'json',
      sign: '',
    }
  }

  // 发送请求
  async request(method: string, bodyData: Record<string, any> = {}): Promise<any> {
    const commonParams = this.buildCommonParams(method)

    const bodyStr = JSON.stringify(bodyData)

    // 计算签名
    const sign = this.generateSign(commonParams, bodyStr)
    commonParams.sign = sign

    // 拼接URL查询参数
    const queryString = new URLSearchParams(commonParams).toString()
    const url = `${this.config.baseUrl}?${queryString}`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: bodyStr,
    })

    if (!response.ok) {
      throw new Error(`4PX API HTTP error: ${response.status}`)
    }

    const result = await response.json()

    // 4PX 响应格式: { msg, result }
    // result 可能是错误码(字符串)或数据对象
    // 常见错误码: AT014002 = 未查询到相关物流轨迹
    if (result && typeof result.result === 'string' && result.result !== '0' && result.result !== '200') {
      // result 是错误码
      const errorCode = result.result
      const errorMsg = result.msg || 'Unknown error'
      // 特定错误码不抛异常, 由调用方处理
      if (errorCode === 'AT014002') {
        return null // 无轨迹数据
      }
      throw new Error(`4PX API error: ${errorCode} - ${errorMsg}`)
    }

    // 成功: 返回 result 字段 (可能是对象或数组)
    return result.result !== undefined ? result.result : result
  }

  // ========== 业务接口 ==========

  /**
   * 查询物流轨迹
   * @param trackingNumber 追踪号 (4PX单号/deliveryOrderNo)
   */
  async getTracking(trackingNumber: string): Promise<TrackingResult4PX | null> {
    const result = await this.request(METHOD_TRACKING, {
      deliveryOrderNo: trackingNumber,
    })

    if (!result) return null

    // 4PX 返回结构可能是直接数据或包裹在 data 里
    const data = result.data || result
    if (!data) return null

    const events = data.trackList || data.events || data.track_events || []

    return {
      tracking_number: data.deliveryOrderNo || data.tracking_number || data.waybill_no || trackingNumber,
      status: data.status || data.current_status || data.trackStatus || 'unknown',
      estimated_delivery: data.estimatedDelivery || data.estimated_delivery || data.eta || undefined,
      events: events.map((e: any) => ({
        event_code: e.eventCode || e.event_code || e.code || '',
        event_name: e.eventName || e.event_name || e.status_name || '',
        event_time: e.eventTime || e.event_time || e.time || e.occurTime || '',
        location: e.location || e.city || e.address || '',
        description: e.description || e.remark || e.content || e.eventName || '',
      })),
    }
  }

  /**
   * 创建物流订单 (直发委托单)
   * @param params 订单信息
   * @returns 追踪号等信息
   */
  async createOrder(params: CreateOrderParams): Promise<{
    deliveryOrderNo: string
    refNo: string
    trackingNumber?: string
    labelUrl?: string
    waybillNo?: string
    rawResult?: any
  }> {
    const result = await this.request(METHOD_CREATE_ORDER, params)

    return {
      deliveryOrderNo: result?.deliveryOrderNo || result?.delivery_order_no || result?.orderNo || '',
      refNo: result?.refNo || result?.ref_no || params.ref_no || '',
      trackingNumber: result?.trackingNumber || result?.tracking_number || result?.waybillNo || result?.waybill_no || undefined,
      labelUrl: result?.labelUrl || result?.label_url || result?.printUrl || result?.print_url || undefined,
      waybillNo: result?.waybillNo || result?.waybill_no || undefined,
      rawResult: result,
    }
  }

  /**
   * 获取可用物流产品列表
   */
  async getProducts(countryCode?: string, weight?: number): Promise<Array<{
    product_code: string
    product_name: string
    estimated_days?: string
    price?: number
  }>> {
    const params: Record<string, any> = {}
    if (countryCode) params.country_code = countryCode
    if (weight) params.weight = weight

    const result = await this.request(METHOD_GET_PRODUCTS, params)

    if (!result || !Array.isArray(result)) return []

    return result.map((item: any) => ({
      product_code: item.product_code || item.code || '',
      product_name: item.product_name || item.name || '',
      estimated_days: item.estimated_days || item.time_limit || undefined,
      price: item.price || item.fee || undefined,
    }))
  }
}

// 4PX 状态映射到我们的系统状态
export function map4PXStatus(eventCode: string, eventName: string): TrackStatus {
  const code = eventCode?.toLowerCase() || ''
  const name = eventName?.toLowerCase() || ''

  const statusMap: Array<{ match: RegExp; status: TrackStatus }> = [
    { match: /picked|pickup|揽收|收寄/, status: 'picked_up' },
    { match: /departed|transit|运输|离开|发往|转运/, status: 'in_transit' },
    { match: /export|customs|报关|出关/, status: 'export_customs' },
    { match: /import|clearance|清关|入关/, status: 'import_customs' },
    { match: /arrival|到达|抵达/, status: 'at_local_facility' },
    { match: /delivering|out.*delivery|派送中|投递/, status: 'out_for_delivery' },
    { match: /delivered|signed|签收|妥投/, status: 'delivered' },
    { match: /failed|失败|异常|退回/, status: 'exception' },
    { match: /returned|退回/, status: 'returned' },
  ]

  for (const { match, status } of statusMap) {
    if (match.test(code) || match.test(name)) {
      return status
    }
  }

  return 'in_transit'
}
