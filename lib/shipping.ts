// 物流追踪数据模型与物流商预设

// 物流商类型
export interface Carrier {
  code: string                    // 物流商代码, 如 '4px', 'yunexpress'
  name: string                    // 显示名称, 如 '4PX Express'
  nameCn: string                  // 中文名称, 如 '递四方'
  trackingUrl: string             // 官方追踪链接模板, {trackingNumber} 为占位符
  trackingNumberPattern?: string  // 追踪号格式正则 (用于校验)
  apiEnabled: boolean             // 是否支持 API 自动追踪
  apiEndpoint?: string            // API 接口地址
  logo?: string                   // 物流商 Logo URL
  description?: string            // 物流商描述
}

// 物流轨迹节点
export interface TrackEvent {
  id: string
  timestamp: string               // ISO 时间
  location: string                // 节点位置, 如 'Shenzhen, China'
  description: string             // 事件描述, 如 'Package picked up'
  status: TrackStatus             // 节点状态
  carrier?: string                // 该节点对应的承运商 (末端派送可能换承运商)
}

// 物流状态枚举
export type TrackStatus =
  | 'pending'          // 待发货
  | 'picked_up'        // 已揽收
  | 'in_transit'       // 运输中
  | 'export_customs'   // 出口报关
  | 'international'    // 国际干线运输
  | 'import_customs'   // 目的国清关
  | 'at_local_facility'// 到达目的国本地设施
  | 'out_for_delivery' // 派送中
  | 'delivered'        // 已签收
  | 'exception'        // 异常
  | 'returned'         // 退回
  | 'cancelled'        // 已取消发货

// 发货记录
export interface Shipment {
  id: string
  orderId: string                 // 关联订单 ID
  orderNo?: string                // 订单号 (冗余存储, 方便查询)
  shipmentNo: string              // 发货批次号, 如 SHP-001
  carrierCode: string             // 物流商代码
  carrierName: string             // 物流商名称 (冗余)
  trackingNumber: string          // 物流追踪号
  status: TrackStatus             // 当前物流状态
  weight?: number                 // 重量 (kg)
  shippingCost?: number           // 物流费用
  shippedAt: string               // 发货时间
  estimatedDelivery?: string      // 预计送达时间
  deliveredAt?: string            // 实际签收时间
  events: TrackEvent[]            // 物流轨迹节点列表
  notes?: string                  // 备注
  createdBy?: string              // 操作人
  createdAt: string
  updatedAt: string
}

// 预设物流商列表 (国内主流跨境物流商 + 国际快递)
export const PRESET_CARRIERS: Carrier[] = [
  {
    code: '4px',
    name: '4PX Express',
    nameCn: '递四方',
    trackingUrl: 'https://www.4px.com/track?query={trackingNumber}',
    trackingNumberPattern: '^[A-Z0-9]{10,20}$',
    apiEnabled: true,
    apiEndpoint: 'https://open.4px.com/api/track',
    description: '递四方速递, 阿里巴巴投资, 中国最大跨境电商物流商',
  },
  {
    code: 'yunexpress',
    name: 'YunExpress',
    nameCn: '云途物流',
    trackingUrl: 'https://www.yunexpress.com/Tracking?trackingNumber={trackingNumber}',
    trackingNumberPattern: '^YT[0-9]{16}$',
    apiEnabled: true,
    apiEndpoint: 'https://oms.api.yunexpress.com/api/WayBill/GetTrackingInfo',
    description: '云途物流, 跨境B2C电商物流, 日处理70万+包裹',
  },
  {
    code: 'yanwen',
    name: 'Yanwen Express',
    nameCn: '燕文物流',
    trackingUrl: 'https://www.yw56.com.cn/track?trackingNumber={trackingNumber}',
    trackingNumberPattern: '^[A-Z]{2}[0-9]{9}[A-Z]{2}$|^[A-Z0-9]{12,20}$',
    apiEnabled: true,
    apiEndpoint: 'https://api.yw56.com.cn/track',
    description: '燕文物流, 中国领先跨境出口电商物流商',
  },
  {
    code: 'winit',
    name: 'WINIT',
    nameCn: '万邑通',
    trackingUrl: 'https://www.winit.com/track?trackingNumber={trackingNumber}',
    apiEnabled: true,
    apiEndpoint: 'https://api.winit.com/track',
    description: '万邑通, 全球跨境电商海外仓领域领先者',
  },
  {
    code: 'chukou1',
    name: 'Chukou1',
    nameCn: '出口易',
    trackingUrl: 'https://www.chukou1.com/track?trackingNumber={trackingNumber}',
    apiEnabled: true,
    apiEndpoint: 'https://api.chukou1.com/track',
    description: '出口易, 跨境物流综合解决方案',
  },
  {
    code: 'cainiao',
    name: 'Cainiao Global',
    nameCn: '菜鸟国际',
    trackingUrl: 'https://global.cainiao.com/detail.htm?mailNo={trackingNumber}',
    apiEnabled: true,
    apiEndpoint: 'https://api.cainiao.com/track',
    description: '菜鸟国际, 阿里巴巴旗下跨境物流网络',
  },
  {
    code: 'dhl',
    name: 'DHL Express',
    nameCn: 'DHL国际快递',
    trackingUrl: 'https://www.dhl.com/en/express/tracking.html?AWB={trackingNumber}',
    trackingNumberPattern: '^[0-9]{10}$',
    apiEnabled: true,
    apiEndpoint: 'https://api.dhl.com/track/shipments',
    description: 'DHL国际快递, 全球覆盖220+国家',
  },
  {
    code: 'fedex',
    name: 'FedEx',
    nameCn: '联邦快递',
    trackingUrl: 'https://www.fedex.com/fedextrack/?trknbr={trackingNumber}',
    trackingNumberPattern: '^[0-9]{12,15}$',
    apiEnabled: true,
    apiEndpoint: 'https://api.fedex.com/track',
    description: 'FedEx联邦快递, 全球快递物流',
  },
  {
    code: 'ups',
    name: 'UPS',
    nameCn: 'UPS快递',
    trackingUrl: 'https://www.ups.com/track?tracknum={trackingNumber}',
    trackingNumberPattern: '^1Z[A-Z0-9]{16}$|^[0-9]{9,18}$',
    apiEnabled: true,
    apiEndpoint: 'https://api.ups.com/track',
    description: 'UPS, 全球最大快递公司之一',
  },
  {
    code: 'usps',
    name: 'USPS',
    nameCn: '美国邮政',
    trackingUrl: 'https://tools.usps.com/go/TrackConfirmAction?tLabels={trackingNumber}',
    trackingNumberPattern: '^[A-Z0-9]{13,22}$',
    apiEnabled: true,
    apiEndpoint: 'https://api.usps.com/track',
    description: 'USPS美国邮政, 美国本土末端派送常用',
  },
  {
    code: 'ems',
    name: 'EMS',
    nameCn: '国际EMS',
    trackingUrl: 'https://www.ems.post/track/{trackingNumber}',
    trackingNumberPattern: '^[A-Z]{2}[0-9]{9}[A-Z]{2}$',
    apiEnabled: false,
    description: '国际EMS, 万国邮政联盟全球快递',
  },
  {
    code: 'other',
    name: 'Other',
    nameCn: '其他物流商',
    trackingUrl: '',
    apiEnabled: false,
    description: '其他物流商, 手动填写追踪链接',
  },
]

// 物流状态显示文案 (英文, 面向海外用户)
export const TRACK_STATUS_LABELS: Record<TrackStatus, { label: string; labelCn: string; color: string; icon: string }> = {
  pending: { label: 'Pending', labelCn: '待发货', color: '#6b7280', icon: 'clock' },
  picked_up: { label: 'Picked Up', labelCn: '已揽收', color: '#3b82f6', icon: 'package' },
  in_transit: { label: 'In Transit', labelCn: '运输中', color: '#3b82f6', icon: 'truck' },
  export_customs: { label: 'Export Customs', labelCn: '出口报关', color: '#8b5cf6', icon: 'file' },
  international: { label: 'International Shipping', labelCn: '国际运输', color: '#8b5cf6', icon: 'plane' },
  import_customs: { label: 'Import Customs', labelCn: '清关中', color: '#f59e0b', icon: 'file' },
  at_local_facility: { label: 'At Local Facility', labelCn: '到达本地', color: '#10b981', icon: 'warehouse' },
  out_for_delivery: { label: 'Out for Delivery', labelCn: '派送中', color: '#10b981', icon: 'truck' },
  delivered: { label: 'Delivered', labelCn: '已签收', color: '#22c55e', icon: 'check' },
  exception: { label: 'Exception', labelCn: '异常', color: '#ef4444', icon: 'alert' },
  returned: { label: 'Returned', labelCn: '已退回', color: '#ef4444', icon: 'undo' },
  cancelled: { label: 'Cancelled', labelCn: '已取消', color: '#6b7280', icon: 'x' },
}

// 跨境物流标准时间轴节点 (用于手动录入时的预设选项)
export const TRACK_EVENT_PRESETS = [
  { status: 'picked_up' as TrackStatus, description: 'Package picked up by carrier', locationCn: '中国' },
  { status: 'export_customs' as TrackStatus, description: 'Export customs declaration completed', locationCn: '中国' },
  { status: 'international' as TrackStatus, description: 'Departed from origin country', locationCn: '中国' },
  { status: 'international' as TrackStatus, description: 'Arrived at destination country', locationCn: '目的国' },
  { status: 'import_customs' as TrackStatus, description: 'Import customs clearance in progress', locationCn: '目的国' },
  { status: 'import_customs' as TrackStatus, description: 'Import customs cleared', locationCn: '目的国' },
  { status: 'at_local_facility' as TrackStatus, description: 'Arrived at local sorting facility', locationCn: '目的国' },
  { status: 'out_for_delivery' as TrackStatus, description: 'Out for delivery', locationCn: '目的国' },
  { status: 'delivered' as TrackStatus, description: 'Package delivered and signed', locationCn: '目的国' },
]

// 获取物流商 by code
export function getCarrierByCode(code: string): Carrier | undefined {
  return PRESET_CARRIERS.find(c => c.code === code)
}

// 生成追踪链接
export function buildTrackingUrl(carrierCode: string, trackingNumber: string): string {
  const carrier = getCarrierByCode(carrierCode)
  if (!carrier || !carrier.trackingUrl) return ''
  return carrier.trackingUrl.replace('{trackingNumber}', encodeURIComponent(trackingNumber))
}

// 生成发货批次号
export function generateShipmentNo(index: number): string {
  return `SHP-${String(index).padStart(4, '0')}`
}
