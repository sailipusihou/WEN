"use client"
import { useState, useEffect, useCallback } from "react"
import {
  Truck, Search, Plus, ExternalLink, MapPin, Clock, Package, CheckCircle,
  Plane, FileText, Warehouse, AlertCircle, Undo, X,
  Navigation, Send, Settings, RefreshCw, ChevronDown, ChevronRight, Download
} from "lucide-react"

// 物流状态配置 (与 lib/shipping.ts 对应)
type TrackStatus =
  | 'pending' | 'picked_up' | 'in_transit' | 'export_customs' | 'international'
  | 'import_customs' | 'at_local_facility' | 'out_for_delivery' | 'delivered'
  | 'exception' | 'returned' | 'cancelled'

const STATUS_CONFIG: Record<TrackStatus, { label: string; color: string; bg: string; icon: any }> = {
  pending:           { label: 'Pending',            color: '#6b7280', bg: 'rgba(107,114,128,0.12)', icon: Clock },
  picked_up:         { label: 'Picked Up',          color: '#3b82f6', bg: 'rgba(59,130,246,0.12)',  icon: Package },
  in_transit:        { label: 'In Transit',         color: '#3b82f6', bg: 'rgba(59,130,246,0.12)',  icon: Truck },
  export_customs:    { label: 'Export Customs',     color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)',  icon: FileText },
  international:     { label: 'International',      color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)',  icon: Plane },
  import_customs:    { label: 'Import Customs',     color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  icon: FileText },
  at_local_facility: { label: 'At Local Facility',  color: '#10b981', bg: 'rgba(16,185,129,0.12)',  icon: Warehouse },
  out_for_delivery:  { label: 'Out for Delivery',   color: '#10b981', bg: 'rgba(16,185,129,0.12)',  icon: Truck },
  delivered:         { label: 'Delivered',          color: '#22c55e', bg: 'rgba(34,197,94,0.12)',   icon: CheckCircle },
  exception:         { label: 'Exception',          color: '#ef4444', bg: 'rgba(239,68,68,0.12)',   icon: AlertCircle },
  returned:          { label: 'Returned',           color: '#ef4444', bg: 'rgba(239,68,68,0.12)',   icon: Undo },
  cancelled:         { label: 'Cancelled',          color: '#6b7280', bg: 'rgba(107,114,128,0.12)', icon: X },
}

// 预设轨迹事件模板 (与 lib/shipping.ts TRACK_EVENT_PRESETS 对应)
const TRACK_PRESETS = [
  { status: 'picked_up' as TrackStatus,         description: 'Package picked up by carrier',           location: 'Shenzhen, China' },
  { status: 'export_customs' as TrackStatus,    description: 'Export customs declaration completed',   location: 'Shenzhen, China' },
  { status: 'international' as TrackStatus,     description: 'Departed from origin country',           location: 'China' },
  { status: 'international' as TrackStatus,     description: 'Arrived at destination country',         location: 'Destination' },
  { status: 'import_customs' as TrackStatus,    description: 'Import customs clearance in progress',   location: 'Destination' },
  { status: 'import_customs' as TrackStatus,    description: 'Import customs cleared',                 location: 'Destination' },
  { status: 'at_local_facility' as TrackStatus, description: 'Arrived at local sorting facility',      location: 'Destination' },
  { status: 'out_for_delivery' as TrackStatus,  description: 'Out for delivery',                       location: 'Destination' },
  { status: 'delivered' as TrackStatus,         description: 'Package delivered and signed',           location: 'Destination' },
]

export default function AdminShippingPage() {
  const [shipments, setShipments] = useState<any[]>([])
  const [carriers, setCarriers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [detailShipment, setDetailShipment] = useState<any>(null)
  const [orderDetailShipment, setOrderDetailShipment] = useState<any>(null)
  const [showConfigPanel, setShowConfigPanel] = useState(false)
  const [carrierConfigs, setCarrierConfigs] = useState<any[]>([])
  const [syncResult, setSyncResult] = useState<any>(null)
  const [showSyncResult, setShowSyncResult] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [testTrackingInput, setTestTrackingInput] = useState('')
  const [testTrackingLoading, setTestTrackingLoading] = useState(false)
  // 发货通知客户 (手动点击发送: 邮件 / 站内消息)
  const [notifyShipment, setNotifyShipment] = useState<any>(null)

  // 创建发货表单
  const [orders, setOrders] = useState<any[]>([])
  const [orderSearch, setOrderSearch] = useState('')
  const [showOrderDropdown, setShowOrderDropdown] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<any>(null)
  const [createForm, setCreateForm] = useState({
    carrierCode: '',
    trackingNumber: '',
    weight: '',
    shippingCost: '',
    estimatedDelivery: '',
    pickupLocation: 'Shenzhen, China',
    notes: '',
  })
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')

  // 轨迹录入表单
  const [eventForm, setEventForm] = useState({
    status: '' as TrackStatus | '',
    description: '',
    location: '',
    timestamp: '',
  })
  const [addingEvent, setAddingEvent] = useState(false)

  const fetchShipments = useCallback(async () => {
    try {
      const r = await fetch('/api/shipments')
      if (r.ok) {
        const data = await r.json()
        setShipments(Array.isArray(data) ? data : [])
      }
    } finally { setLoading(false) }
  }, [])

  const fetchCarriers = useCallback(async () => {
    try {
      const r = await fetch('/api/shipping/carriers')
      if (r.ok) setCarriers(await r.json())
    } catch {}
  }, [])

  const fetchCarrierConfigs = useCallback(async () => {
    try {
      const r = await fetch('/api/shipping/config')
      if (r.ok) setCarrierConfigs(await r.json())
    } catch {}
  }, [])

  const triggerSync = async () => {
    try {
      setSyncing(true)
      const r = await fetch('/api/shipments/sync', { method: 'POST' })
      const data = await r.json()
      if (r.ok) {
        setSyncResult(data)
        setShowSyncResult(true)
        fetchShipments()
        if (detailShipment) {
          // 刷新当前查看的详情
          const refreshed = shipments.find((s: any) => s.id === detailShipment.id)
          if (refreshed) setDetailShipment(refreshed)
        }
      } else {
        setSyncResult({ error: data.error || 'Sync failed' })
        setShowSyncResult(true)
      }
    } catch (e: any) {
      setSyncResult({ error: e.message || 'Network error' })
      setShowSyncResult(true)
    } finally { setSyncing(false) }
  }

  // 导出 Excel (CSV 格式, 兼容 Excel 打开)
  const handleExportExcel = () => {
    if (shipments.length === 0) return

    const headers = [
      'Shipment No', 'Order No', 'Carrier', 'Tracking Number', 'Status',
      'Customer Name', 'Customer Email', 'Customer Phone',
      'Shipping Address', 'City', 'State', 'Country', 'Postcode',
      'Order Total', 'Items', 'Weight (kg)', 'Shipping Cost',
      'Shipped At', 'Est. Delivery', 'Delivered At', 'Notes',
    ]

    const rows = shipments.map((s: any) => {
      const order = s._orderInfo
      const addr = order?.shippingAddress || {}
      const itemsText = order?.items?.map((it: any) => `${it.name} x${it.quantity}`).join('; ') || ''
      const statusLabel = STATUS_CONFIG[s.status as TrackStatus]?.label || s.status
      return [
        s.shipmentNo || '',
        order?.orderNo || s.orderNo || s.orderId?.slice(0, 12) || '',
        s.carrierName || s.carrierCode || '',
        s.trackingNumber || '',
        statusLabel,
        order?.customerName || '',
        order?.customerEmail || '',
        order?.customerPhone || '',
        addr.address || '',
        addr.city || '',
        addr.state || '',
        addr.country || '',
        addr.postcode || '',
        order ? `$${(order.total || 0).toFixed(2)}` : '',
        itemsText,
        s.weight || '',
        s.shippingCost || '',
        s.shippedAt || '',
        s.estimatedDelivery || '',
        s.deliveredAt || '',
        (s.notes || '').replace(/\n/g, ' '),
      ]
    })

    // 生成 CSV
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => {
        const str = String(cell)
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return '"' + str.replace(/"/g, '""') + '"'
        }
        return str
      }).join(','))
    ].join('\n')

    // 添加 BOM 以支持 Excel 正确识别 UTF-8
    const bom = '\uFEFF'
    const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    const now = new Date()
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
    link.download = `shipments_${dateStr}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  // 获取可发货订单 (confirmed/processing 状态)
  const fetchOrders = useCallback(async () => {
    try {
      const r = await fetch('/api/orders?pageSize=100')
      if (r.ok) {
        const data = await r.json()
        const arr = data.items || data || []
        setOrders(arr.filter((o: any) => ['confirmed', 'processing'].includes(o.status)))
      }
    } catch {}
  }, [])

  useEffect(() => {
    fetchShipments()
    fetchCarriers()
    fetchOrders()
    fetchCarrierConfigs()
  }, [fetchShipments, fetchCarriers, fetchOrders, fetchCarrierConfigs])

  // 自动同步: 页面加载后延迟3秒触发一次同步 (避免阻塞页面加载)
  // 如果 Auto Sync 开启，之后每5分钟自动同步一次
  useEffect(() => {
    const autoSyncEnabled = carrierConfigs.find((c: any) => c.code === '4px')?.autoSync
    if (!autoSyncEnabled) return

    // 延迟3秒后首次同步
    const initialTimer = setTimeout(() => {
      if (!syncing) triggerSync()
    }, 3000)

    // 每5分钟定时同步
    const intervalTimer = setInterval(() => {
      if (!syncing) triggerSync()
    }, 5 * 60 * 1000)

    return () => {
      clearTimeout(initialTimer)
      clearInterval(intervalTimer)
    }
  }, [carrierConfigs, syncing])

  // 统计
  const stats = {
    total: shipments.length,
    inTransit: shipments.filter(s => ['picked_up', 'in_transit', 'export_customs', 'international', 'import_customs', 'at_local_facility', 'out_for_delivery'].includes(s.status)).length,
    delivered: shipments.filter(s => s.status === 'delivered').length,
    pending: shipments.filter(s => s.status === 'pending' || s.status === 'exception' || s.status === 'returned').length,
  }

  // 待发货订单: confirmed/processing 状态 且 没有活跃物流单
  const pendingOrders = orders.filter(o =>
    !shipments.some(s => s.orderId === o.id && !['cancelled', 'delivered', 'returned'].includes(s.status))
  )

  // 筛选
  let filtered = shipments
  if (statusFilter !== 'all') {
    filtered = filtered.filter(s => s.status === statusFilter)
  }
  if (search.trim()) {
    const q = search.trim().toLowerCase()
    filtered = filtered.filter(s =>
      s.trackingNumber?.toLowerCase().includes(q) ||
      s.orderNo?.toLowerCase().includes(q) ||
      s.shipmentNo?.toLowerCase().includes(q) ||
      s.carrierName?.toLowerCase().includes(q)
    )
  }

  // 打开发货详情时, 重置轨迹表单
  function openDetail(s: any) {
    setDetailShipment(s)
    setEventForm({ status: '', description: '', location: '', timestamp: '' })
  }

  // 重新拉取详情
  async function refreshDetail(id: string) {
    try {
      const r = await fetch(`/api/shipments/${id}`)
      if (r.ok) {
        const updated = await r.json()
        setDetailShipment(updated)
        // 同步更新列表
        setShipments(prev => prev.map(s => s.id === id ? updated : s))
      }
    } catch {}
  }

  // 创建发货
  async function handleCreate() {
    setCreateError('')
    if (!selectedOrder) { setCreateError('Please select an order'); return }
    if (!createForm.carrierCode) { setCreateError('Please select a carrier'); return }
    if (!createForm.trackingNumber.trim()) { setCreateError('Tracking number is required'); return }
    setCreating(true)
    try {
      const r = await fetch('/api/shipments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: selectedOrder.id,
          carrierCode: createForm.carrierCode,
          trackingNumber: createForm.trackingNumber.trim(),
          weight: createForm.weight || undefined,
          shippingCost: createForm.shippingCost || undefined,
          estimatedDelivery: createForm.estimatedDelivery || undefined,
          pickupLocation: createForm.pickupLocation || undefined,
          notes: createForm.notes || undefined,
        }),
      })
      const data = await r.json()
      if (!r.ok) { setCreateError(data.error || 'Failed to create shipment'); return }
      // 重置
      setShowCreateModal(false)
      setSelectedOrder(null)
      setOrderSearch('')
      setCreateForm({ carrierCode: '', trackingNumber: '', weight: '', shippingCost: '', estimatedDelivery: '', pickupLocation: 'Shenzhen, China', notes: '' })
      await fetchShipments()
      await fetchOrders()  // 刷新待发货列表 (已发货的订单会从列表消失)
    } catch (e: any) {
      setCreateError(e.message || 'Network error')
    } finally { setCreating(false) }
  }

  // 添加轨迹节点
  async function handleAddEvent() {
    if (!detailShipment) return
    if (!eventForm.status || !eventForm.description) return
    setAddingEvent(true)
    try {
      const r = await fetch(`/api/shipments/${detailShipment.id}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: eventForm.status,
          description: eventForm.description,
          location: eventForm.location || undefined,
          timestamp: eventForm.timestamp || undefined,
        }),
      })
      if (r.ok) {
        setEventForm({ status: '', description: '', location: '', timestamp: '' })
        await refreshDetail(detailShipment.id)
      }
    } catch {} finally { setAddingEvent(false) }
  }

  // 使用预设模板快速填充
  function applyPreset(preset: typeof TRACK_PRESETS[0]) {
    setEventForm({
      status: preset.status,
      description: preset.description,
      location: preset.location,
      timestamp: new Date().toISOString().slice(0, 16),
    })
  }

  // 一键生成完整模拟轨迹
  const [generatingSample, setGeneratingSample] = useState(false)
  const [cancellingShipment, setCancellingShipment] = useState(false)
  async function generateSampleTracking() {
    if (!detailShipment) return
    setGeneratingSample(true)
    try {
      const now = new Date()
      const events = [
        { status: 'picked_up', description: 'Package picked up by carrier', location: 'Shenzhen, China', hoursAgo: 168 },
        { status: 'export_customs', description: 'Export customs declaration completed', location: 'Shenzhen Customs, China', hoursAgo: 144 },
        { status: 'in_transit', description: 'Departed from origin country', location: 'Hong Kong International Hub', hoursAgo: 120 },
        { status: 'international', description: 'In transit to destination country', location: 'International Air / Ocean Freight', hoursAgo: 72 },
        { status: 'import_customs', description: 'Import customs clearance in progress', location: 'Los Angeles Customs, USA', hoursAgo: 24 },
        { status: 'at_local_facility', description: 'Arrived at local sorting facility', location: 'Los Angeles, CA', hoursAgo: 6 },
        { status: 'out_for_delivery', description: 'Out for delivery', location: 'Los Angeles, CA', hoursAgo: 2 },
      ]

      for (const evt of events) {
        const ts = new Date(now.getTime() - evt.hoursAgo * 60 * 60 * 1000)
        await fetch(`/api/shipments/${detailShipment.id}/events`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: evt.status,
            description: evt.description,
            location: evt.location,
            timestamp: ts.toISOString(),
          }),
        })
      }
      await refreshDetail(detailShipment.id)
      fetchShipments()
    } catch {} finally { setGeneratingSample(false) }
  }

  // 取消发货
  async function handleCancelShipment() {
    if (!detailShipment) return
    if (!confirm('Are you sure you want to cancel this shipment?\n\nIf no other active shipments exist for this order, the order status will be reverted to "Processing".')) return

    setCancellingShipment(true)
    try {
      const res = await fetch(`/api/shipments/${detailShipment.id}/cancel`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Manually cancelled by admin' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to cancel shipment')

      // 显示成功消息
      alert(data.message || 'Shipment cancelled successfully')

      // 刷新详情和列表
      await refreshDetail(detailShipment.id)
      fetchShipments()
      if (typeof fetchOrders === 'function') fetchOrders()
    } catch (e: any) {
      alert('Failed to cancel shipment: ' + e.message)
    } finally {
      setCancellingShipment(false)
    }
  }

  // 构建追踪链接
  function buildTrackingUrl(carrierCode: string, trackingNumber: string): string {
    const carrier = carriers.find(c => c.code === carrierCode)
    if (!carrier || !carrier.trackingUrl) return ''
    return carrier.trackingUrl.replace('{trackingNumber}', encodeURIComponent(trackingNumber))
  }

  function fmtDate(s: string) {
    if (!s) return '-'
    try { return new Date(s).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) } catch { return s }
  }

  function fmtMoney(v: any) {
    if (v === undefined || v === null || v === '') return '-'
    return '$' + Number(v).toFixed(2)
  }

  const filteredOrders = orders.filter(o => {
    if (!orderSearch.trim()) return true
    const q = orderSearch.toLowerCase()
    return o.id?.toLowerCase().includes(q) || o.customerName?.toLowerCase().includes(q) || o.customerEmail?.toLowerCase().includes(q)
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--adm-accent)', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* 页头 */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2" style={{ color: 'var(--adm-text)' }}>
            <Truck size={22} className="adm-accent" /> Shipping Management
          </h1>
          <p className="text-xs mt-1" style={{ color: 'var(--adm-text-secondary)' }}>
            Track cross-border shipments from pickup to delivery
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={triggerSync}
            disabled={syncing}
            className="px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all adm-hover-bg"
            style={{ backgroundColor: 'var(--adm-input)', color: 'var(--adm-text)', border: '1px solid var(--adm-border)' }}
            title="Sync tracking info from carriers"
          >
            <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} /> Sync
          </button>
          <button
            type="button"
            onClick={handleExportExcel}
            disabled={shipments.length === 0}
            className="px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all adm-hover-bg"
            style={{ backgroundColor: 'var(--adm-input)', color: 'var(--adm-text)', border: '1px solid var(--adm-border)' }}
            title="Export shipments to Excel"
          >
            <Download size={16} /> Export
          </button>
          <button
            type="button"
            onClick={() => { fetchCarrierConfigs(); setShowConfigPanel(true) }}
            className="px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all adm-hover-bg"
            style={{ backgroundColor: 'var(--adm-input)', color: 'var(--adm-text)', border: '1px solid var(--adm-border)' }}
            title="Carrier settings"
          >
            <Settings size={16} /> Carriers
          </button>
          <button
            type="button"
            onClick={() => { fetchOrders(); setShowCreateModal(true); setCreateError('') }}
            className="adm-accent-bg text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all hover:opacity-90"
          >
            <Plus size={16} /> Create Shipment
          </button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Shipments', value: stats.total, icon: Truck, color: '#6366f1' },
          { label: 'In Transit', value: stats.inTransit, icon: Navigation, color: '#3b82f6' },
          { label: 'Delivered', value: stats.delivered, icon: CheckCircle, color: '#22c55e' },
          { label: 'Pending / Exception', value: stats.pending, icon: AlertCircle, color: '#f59e0b' },
        ].map((s, i) => (
          <div key={i} className="adm-card-card rounded-xl p-4 border" style={{ backgroundColor: 'var(--adm-card)', borderColor: 'var(--adm-border)' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium" style={{ color: 'var(--adm-text-secondary)' }}>{s.label}</p>
                <p className="text-2xl font-bold mt-1" style={{ color: 'var(--adm-text)' }}>{s.value}</p>
              </div>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: s.color + '20' }}>
                <s.icon size={18} style={{ color: s.color }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 待发货订单 (confirmed/processing 状态) */}
      {pendingOrders.length > 0 && (
        <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: 'var(--adm-card)', borderColor: 'var(--adm-border)' }}>
          <div className="px-4 py-2.5 flex items-center justify-between" style={{ backgroundColor: 'var(--adm-accent-bg)' }}>
            <h3 className="text-xs font-semibold flex items-center gap-1.5" style={{ color: 'var(--adm-accent)' }}>
              <Package size={14} /> Pending Shipments ({pendingOrders.length})
            </h3>
            <span className="text-[10px]" style={{ color: 'var(--adm-accent)' }}>Orders ready for shipping</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--adm-input)' }}>
                  <th className="text-left px-2 py-2 text-xs font-medium" style={{ color: 'var(--adm-text-secondary)', width: '48px' }}>Avatar</th>
                  <th className="text-left px-4 py-2 text-xs font-medium" style={{ color: 'var(--adm-text-secondary)' }}>Order #</th>
                  <th className="text-left px-4 py-2 text-xs font-medium" style={{ color: 'var(--adm-text-secondary)' }}>Customer</th>
                  <th className="text-left px-4 py-2 text-xs font-medium" style={{ color: 'var(--adm-text-secondary)' }}>Items</th>
                  <th className="text-left px-4 py-2 text-xs font-medium" style={{ color: 'var(--adm-text-secondary)' }}>Total</th>
                  <th className="text-left px-4 py-2 text-xs font-medium" style={{ color: 'var(--adm-text-secondary)' }}>Status</th>
                  <th className="text-right px-4 py-2 text-xs font-medium" style={{ color: 'var(--adm-text-secondary)' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {pendingOrders.map(o => (
                  <tr
                    key={o.id}
                    className="border-t transition-colors adm-hover-bg cursor-pointer"
                    style={{ borderColor: 'var(--adm-border)' }}
                    onClick={() => setOrderDetailShipment({
                      _orderInfo: {
                        id: o.id,
                        orderNo: o.orderNo || o.id,
                        status: o.status,
                        total: o.total,
                        customerName: o.customerName || (o.shipping ? `${o.shipping.firstName || ''} ${o.shipping.lastName || ''}`.trim() : '') || 'Guest',
                        customerEmail: o.customerEmail || o.shipping?.email || o.userEmail || '',
                        customerPhone: o.shipping?.phone || o.billing?.phone || '',
                        shippingAddress: o.shipping ? {
                          name: `${o.shipping.firstName || ''} ${o.shipping.lastName || ''}`.trim(),
                          address: o.shipping.address || o.shipping.street || '',
                          city: o.shipping.city || '',
                          state: o.shipping.state || '',
                          country: o.shipping.country || '',
                          postcode: o.shipping.postcode || o.shipping.zip || '',
                        } : null,
                        items: (o.items || []).map((it: any) => ({
                          name: it.name || it.productName || '',
                          quantity: it.quantity || 1,
                          price: it.price || 0,
                          productCode: it.productCode || '',
                        })),
                        createdAt: o.createdAt,
                      },
                      orderNo: o.orderNo || o.id,
                      orderId: o.id,
                      status: 'pending',
                      carrierName: '-',
                      trackingNumber: '-',
                      shippedAt: '',
                    })}
                  >
                    <td className="px-2 py-2.5">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold overflow-hidden"
                        style={{ backgroundColor: 'var(--adm-accent-bg)', color: 'var(--adm-accent)' }}>
                        {o.avatar ? (
                          <img src={o.avatar} alt="" className="w-full h-full object-cover" onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none'
                            ;(e.target as HTMLImageElement).parentElement!.innerHTML = (o.customerName || 'G').charAt(0).toUpperCase()
                          }} />
                        ) : (
                          (o.customerName || 'G').charAt(0).toUpperCase()
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="font-mono text-xs font-medium" style={{ color: 'var(--adm-accent)' }}>{o.id}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <div>
                        <p className="text-xs" style={{ color: 'var(--adm-text)' }}>{o.customerName || 'N/A'}</p>
                        <p className="text-[10px]" style={{ color: 'var(--adm-text-secondary)' }}>{o.customerEmail || ''}</p>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="text-xs" style={{ color: 'var(--adm-text-secondary)' }}>{o.items?.length || 0} item(s)</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="text-xs font-medium" style={{ color: 'var(--adm-text)' }}>${(o.total || 0).toFixed(2)}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
                        style={{ backgroundColor: o.status === 'processing' ? 'rgba(59,130,246,0.12)' : 'rgba(245,158,11,0.12)', color: o.status === 'processing' ? '#3b82f6' : '#f59e0b' }}>
                        {o.status === 'processing' ? 'Processing' : 'Confirmed'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedOrder(o)
                          setOrderSearch('')
                          setShowCreateModal(true)
                          setCreateError('')
                          setCreateForm({ carrierCode: '', trackingNumber: '', weight: '', shippingCost: '', estimatedDelivery: '', pickupLocation: 'Shenzhen, China', notes: '' })
                        }}
                        className="text-xs px-3 py-1 rounded-md font-medium text-white transition-all hover:opacity-90 inline-flex items-center gap-1"
                        style={{ backgroundColor: 'var(--adm-accent)' }}
                      >
                        <Plus size={12} /> Ship
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 发货记录标题 */}
      <div className="flex items-center gap-2 pt-2">
        <h2 className="text-sm font-semibold" style={{ color: 'var(--adm-text)' }}>Shipment Records</h2>
        <span className="text-xs" style={{ color: 'var(--adm-text-secondary)' }}>({filtered.length})</span>
      </div>

      {/* 筛选栏 */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--adm-text-secondary)' }} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search tracking #, order #, carrier..."
            className="w-full pl-9 pr-3 py-2 rounded-lg text-sm outline-none transition-colors"
            style={{ backgroundColor: 'var(--adm-input)', color: 'var(--adm-text)', border: '1px solid var(--adm-border)' }}
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-lg text-sm outline-none cursor-pointer"
          style={{ backgroundColor: 'var(--adm-input)', color: 'var(--adm-text)', border: '1px solid var(--adm-border)' }}
        >
          <option value="all">All Status</option>
          {Object.entries(STATUS_CONFIG).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
      </div>

      {/* 发货列表 */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 rounded-xl border" style={{ backgroundColor: 'var(--adm-card)', borderColor: 'var(--adm-border)' }}>
          <Truck size={40} className="mx-auto mb-3 opacity-30" style={{ color: 'var(--adm-text-secondary)' }} />
          <p className="text-sm" style={{ color: 'var(--adm-text-secondary)' }}>
            {shipments.length === 0 ? 'No shipments yet. Create your first shipment to start tracking.' : 'No shipments match your filters.'}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: 'var(--adm-card)', borderColor: 'var(--adm-border)' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--adm-input)' }}>
                  <th className="text-left px-3 py-2.5 text-xs font-medium" style={{ color: 'var(--adm-text-secondary)', width: '60px' }}>Avatar</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium" style={{ color: 'var(--adm-text-secondary)', width: '120px' }}>Shipment #</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium" style={{ color: 'var(--adm-text-secondary)', width: '140px' }}>Order</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium" style={{ color: 'var(--adm-text-secondary)', width: '100px' }}>Carrier</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium" style={{ color: 'var(--adm-text-secondary)', width: '160px' }}>Tracking #</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium" style={{ color: 'var(--adm-text-secondary)', width: '110px' }}>Status</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium" style={{ color: 'var(--adm-text-secondary)', width: '120px' }}>Shipped</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium" style={{ color: 'var(--adm-text-secondary)', width: '150px' }}>Customer Notify</th>
                  <th className="text-right px-3 py-2.5 text-xs font-medium" style={{ color: 'var(--adm-text-secondary)', width: '80px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => {
                  const sc = STATUS_CONFIG[s.status as TrackStatus] || STATUS_CONFIG.pending
                  const trackingUrl = buildTrackingUrl(s.carrierCode, s.trackingNumber)
                  const order = s._orderInfo
                  const avatarInitial = (order?.customerName || 'G').charAt(0).toUpperCase()
                  return (
                    <tr
                      key={s.id}
                      className="border-t transition-colors adm-hover-bg cursor-pointer"
                      style={{ borderColor: 'var(--adm-border)' }}
                      onClick={() => setOrderDetailShipment(s)}
                    >
                      <td className="px-3 py-3" style={{ width: '60px' }}>
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold overflow-hidden"
                          style={{ backgroundColor: 'var(--adm-accent-bg)', color: 'var(--adm-accent)' }}>
                          {order?.avatar ? (
                            <img src={order.avatar} alt="" className="w-full h-full object-cover" onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none'
                              ;(e.target as HTMLImageElement).parentElement!.innerHTML = avatarInitial
                            }} />
                          ) : (
                            avatarInitial
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3" style={{ width: '120px' }}>
                        <span className="font-mono text-xs font-medium" style={{ color: 'var(--adm-text)' }}>{s.shipmentNo || s.id.slice(0, 12)}</span>
                      </td>
                      <td className="px-4 py-3" style={{ width: '140px' }}>
                        <span className="font-mono text-xs" style={{ color: 'var(--adm-accent)' }}>{s.orderNo || s.orderId}</span>
                      </td>
                      <td className="px-4 py-3" style={{ width: '100px' }}>
                        <span className="text-xs" style={{ color: 'var(--adm-text)' }}>{s.carrierName || s.carrierCode}</span>
                      </td>
                      <td className="px-4 py-3" style={{ width: '160px' }}>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs" style={{ color: 'var(--adm-text)' }}>{s.trackingNumber}</span>
                          {trackingUrl && (
                            <a
                              href={trackingUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="shrink-0"
                              title="Track on carrier website"
                              onClick={e => e.stopPropagation()}
                            >
                              <ExternalLink size={12} className="adm-accent" />
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3" style={{ width: '110px' }}>
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium" style={{ backgroundColor: sc.bg, color: sc.color }}>
                          <sc.icon size={11} /> {sc.label}
                        </span>
                      </td>
                      <td className="px-4 py-3" style={{ width: '120px' }}>
                        <span className="text-xs" style={{ color: 'var(--adm-text-secondary)' }}>{fmtDate(s.shippedAt)}</span>
                      </td>
                      <td className="px-4 py-3" style={{ width: '150px' }}>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setNotifyShipment(s) }}
                          className="text-left w-full"
                          title={order?.customerEmail ? `Notify ${order.customerEmail}` : 'This order has no customer email'}
                        >
                          {s.notifiedAt ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium" style={{ color: '#22c55e' }}>
                              <CheckCircle size={11} />
                              {s.notifiedChannel === 'email' ? 'Emailed' : 'In-site'} · {fmtDate(s.notifiedAt)}
                            </span>
                          ) : order?.customerEmail ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium" style={{ color: 'var(--adm-accent)' }}>
                              <Send size={11} /> Notify customer
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium" style={{ color: '#f59e0b' }}>
                              <AlertCircle size={11} /> No email
                            </span>
                          )}
                        </button>
                      </td>
                      <td className="px-3 py-3 text-right" style={{ width: '80px' }}>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); openDetail(s) }}
                          className="text-xs px-3 py-1 rounded-md font-medium adm-hover-bg transition-colors"
                          style={{ color: 'var(--adm-accent)', border: '1px solid var(--adm-border)' }}
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 创建发货弹窗 */}
      {showCreateModal && (
        <Modal title="Create Shipment" onClose={() => setShowCreateModal(false)} wide>
          <div className="space-y-4">
            {createError && (
              <div className="px-3 py-2 rounded-lg text-xs flex items-center gap-2" style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
                <AlertCircle size={14} /> {createError}
              </div>
            )}

            {/* 选择订单 */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--adm-text-secondary)' }}>Order *</label>
              <div className="relative">
                <input
                  type="text"
                  value={selectedOrder ? `#${selectedOrder.id} · ${selectedOrder.customerName || 'N/A'} · ${selectedOrder.customerEmail || ''}` : orderSearch}
                  onChange={e => { setOrderSearch(e.target.value); setSelectedOrder(null); setShowOrderDropdown(true) }}
                  onFocus={() => { fetchOrders(); setShowOrderDropdown(true) }}
                  placeholder="Search order by ID, customer name or email..."
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                  style={{ backgroundColor: 'var(--adm-input)', color: 'var(--adm-text)', border: '1px solid var(--adm-border)' }}
                />
                {showOrderDropdown && (
                  <div className="absolute z-10 left-0 right-0 mt-1 max-h-60 overflow-y-auto rounded-lg shadow-xl" style={{ backgroundColor: 'var(--adm-sidebar)', border: '1px solid var(--adm-border)' }}>
                    {filteredOrders.length === 0 ? (
                      <div className="px-3 py-4 text-center text-xs" style={{ color: 'var(--adm-text-secondary)' }}>No shippable orders found</div>
                    ) : filteredOrders.slice(0, 20).map(o => (
                      <button
                        key={o.id}
                        type="button"
                        onClick={() => { setSelectedOrder(o); setOrderSearch(''); setShowOrderDropdown(false) }}
                        className="w-full text-left px-3 py-2 text-xs adm-hover-bg transition-colors flex items-center justify-between gap-2"
                        style={{ color: 'var(--adm-text)' }}
                      >
                        <div className="min-w-0">
                          <span className="font-mono" style={{ color: 'var(--adm-accent)' }}>#{o.id.slice(0, 12)}</span>
                          <span className="ml-2">{o.customerName || 'N/A'}</span>
                        </div>
                        <span className="text-[10px] shrink-0" style={{ color: 'var(--adm-text-secondary)' }}>${(o.total || 0).toFixed(2)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {selectedOrder && (
                <div className="mt-2 px-3 py-2 rounded-lg text-xs flex items-center justify-between" style={{ backgroundColor: 'var(--adm-accent-bg)', color: 'var(--adm-accent)' }}>
                  <span>Selected: #{selectedOrder.id.slice(0, 12)} · {selectedOrder.customerName || 'N/A'}</span>
                  <button type="button" onClick={() => setSelectedOrder(null)} className="p-0.5"><X size={13} /></button>
                </div>
              )}
            </div>

            {/* 选择物流商 */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--adm-text-secondary)' }}>Carrier *</label>
              <select
                value={createForm.carrierCode}
                onChange={e => setCreateForm({ ...createForm, carrierCode: e.target.value })}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none cursor-pointer"
                style={{ backgroundColor: 'var(--adm-input)', color: 'var(--adm-text)', border: '1px solid var(--adm-border)' }}
              >
                <option value="">Select carrier...</option>
                {carriers.map(c => (
                  <option key={c.code} value={c.code}>{c.name} ({c.nameCn})</option>
                ))}
              </select>
              {createForm.carrierCode && (() => {
                const c = carriers.find(x => x.code === createForm.carrierCode)
                return c?.description ? <p className="text-[10px] mt-1" style={{ color: 'var(--adm-text-secondary)' }}>{c.description}</p> : null
              })()}
            </div>

            {/* 追踪号 */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--adm-text-secondary)' }}>Tracking Number *</label>
              <input
                type="text"
                value={createForm.trackingNumber}
                onChange={e => setCreateForm({ ...createForm, trackingNumber: e.target.value })}
                placeholder="Enter tracking number..."
                className="w-full px-3 py-2 rounded-lg text-sm font-mono outline-none"
                style={{ backgroundColor: 'var(--adm-input)', color: 'var(--adm-text)', border: '1px solid var(--adm-border)' }}
              />
            </div>

            {/* 网格: 重量 / 费用 */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--adm-text-secondary)' }}>Weight (kg)</label>
                <input
                  type="number"
                  step="0.01"
                  value={createForm.weight}
                  onChange={e => setCreateForm({ ...createForm, weight: e.target.value })}
                  placeholder="0.00"
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                  style={{ backgroundColor: 'var(--adm-input)', color: 'var(--adm-text)', border: '1px solid var(--adm-border)' }}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--adm-text-secondary)' }}>Shipping Cost ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={createForm.shippingCost}
                  onChange={e => setCreateForm({ ...createForm, shippingCost: e.target.value })}
                  placeholder="0.00"
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                  style={{ backgroundColor: 'var(--adm-input)', color: 'var(--adm-text)', border: '1px solid var(--adm-border)' }}
                />
              </div>
            </div>

            {/* 揽收地点 + 预计送达 */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--adm-text-secondary)' }}>Pickup Location</label>
                <input
                  type="text"
                  value={createForm.pickupLocation}
                  onChange={e => setCreateForm({ ...createForm, pickupLocation: e.target.value })}
                  placeholder="Shenzhen, China"
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                  style={{ backgroundColor: 'var(--adm-input)', color: 'var(--adm-text)', border: '1px solid var(--adm-border)' }}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--adm-text-secondary)' }}>Est. Delivery Date</label>
                <input
                  type="date"
                  value={createForm.estimatedDelivery}
                  onChange={e => setCreateForm({ ...createForm, estimatedDelivery: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none cursor-pointer"
                  style={{ backgroundColor: 'var(--adm-input)', color: 'var(--adm-text)', border: '1px solid var(--adm-border)' }}
                />
              </div>
            </div>

            {/* 备注 */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--adm-text-secondary)' }}>Notes</label>
              <textarea
                value={createForm.notes}
                onChange={e => setCreateForm({ ...createForm, notes: e.target.value })}
                placeholder="Optional notes..."
                rows={2}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none"
                style={{ backgroundColor: 'var(--adm-input)', color: 'var(--adm-text)', border: '1px solid var(--adm-border)' }}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 rounded-lg text-sm adm-hover-bg transition-colors" style={{ color: 'var(--adm-text-secondary)' }}>Cancel</button>
              <button type="button" onClick={handleCreate} disabled={creating} className="adm-accent-bg text-white px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-90 disabled:opacity-50">
                {creating ? 'Creating...' : 'Create & Mark Shipped'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* 物流详情弹窗 */}
      {detailShipment && (
        <Modal title={`Shipment ${detailShipment.shipmentNo || detailShipment.id.slice(0, 12)}`} onClose={() => setDetailShipment(null)} wide>
          <ShipmentDetail
            shipment={detailShipment}
            carriers={carriers}
            eventForm={eventForm}
            setEventForm={setEventForm}
            addingEvent={addingEvent}
            onAddEvent={handleAddEvent}
            applyPreset={applyPreset}
            buildTrackingUrl={buildTrackingUrl}
            fmtDate={fmtDate}
            fmtMoney={fmtMoney}
            onGenerateSample={generateSampleTracking}
            generatingSample={generatingSample}
            onCancel={handleCancelShipment}
            cancelling={cancellingShipment}
          />
        </Modal>
      )}

      {/* 订单信息弹窗 — 点击发货单列表行时弹出 */}
      {orderDetailShipment && (
        <Modal
          title={`Order Info · ${orderDetailShipment._orderInfo?.orderNo || orderDetailShipment.orderNo || orderDetailShipment.orderId?.slice(0, 12)}`}
          onClose={() => setOrderDetailShipment(null)}
          wide
        >
          <OrderDetailPanel shipment={orderDetailShipment} fmtDate={fmtDate} fmtMoney={fmtMoney} />
        </Modal>
      )}

      {/* 发货通知客户弹窗 */}
      {notifyShipment && (
        <NotifyCustomerModal
          shipment={notifyShipment}
          fmtDate={fmtDate}
          onClose={() => setNotifyShipment(null)}
          onSent={() => { fetchShipments() }}
        />
      )}

      {/* 物流商配置面板 */}
      {showConfigPanel && (
        <Modal title="Carrier Settings" onClose={() => setShowConfigPanel(false)} wide>
        <div className="space-y-4">
          {carrierConfigs.map(cfg => {
            const carrier = carriers.find((c: any) => c.code === cfg.code)
            return (
              <div key={cfg.code} className="rounded-lg border p-4 space-y-3" style={{ borderColor: 'var(--adm-border)', backgroundColor: 'var(--adm-card)' }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--adm-accent-bg)' }}>
                      <Truck size={16} style={{ color: 'var(--adm-accent)' }} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: 'var(--adm-text)' }}>
                        {carrier?.name || cfg.code.toUpperCase()}
                        <span className="text-[10px] ml-2 font-normal" style={{ color: 'var(--adm-text-secondary)' }}>
                          {carrier?.nameCn || ''}
                        </span>
                      </p>
                      <p className="text-[10px]" style={{ color: 'var(--adm-text-secondary)' }}>
                        {carrier?.description || ''}
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={cfg.enabled}
                      onChange={async e => {
                        try {
                          await fetch('/api/shipping/config', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ code: cfg.code, enabled: e.target.checked }),
                          })
                          fetchCarrierConfigs()
                        } catch {}
                      }}
                      className="sr-only peer"
                    />
                    <div
                      className="w-9 h-5 rounded-full peer"
                      style={{
                        backgroundColor: cfg.enabled ? 'var(--adm-accent)' : 'var(--adm-border)',
                        position: 'relative',
                      }}
                    >
                      <div
                        style={{
                          position: 'absolute',
                          top: '2px',
                          left: cfg.enabled ? '18px' : '2px',
                          width: '16px',
                          height: '16px',
                          borderRadius: '50%',
                          backgroundColor: 'white',
                          transition: 'left 0.2s',
                        }}
                      />
                    </div>
                  </label>
                </div>

                {cfg.enabled && (
                  <div className="space-y-3 pt-2 border-t" style={{ borderColor: 'var(--adm-border)' }}>
                    {/* 环境切换 */}
                    <div>
                      <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--adm-text-secondary)' }}>Environment</label>
                      <div className="flex gap-2">
                        {['sandbox', 'production'].map(mode => (
                          <button
                            key={mode}
                            type="button"
                            onClick={async () => {
                              await fetch('/api/shipping/config', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ code: cfg.code, mode }),
                              })
                              fetchCarrierConfigs()
                            }}
                            className="flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                            style={{
                              backgroundColor: cfg.mode === mode ? 'var(--adm-accent-bg)' : 'var(--adm-input)',
                              color: cfg.mode === mode ? 'var(--adm-accent)' : 'var(--adm-text-secondary)',
                              border: cfg.mode === mode ? '1px solid var(--adm-accent)' : '1px solid var(--adm-border)',
                            }}
                          >
                            {mode === 'sandbox' ? 'Sandbox (Test)' : 'Production (Live)'}
                          </button>
                        ))}
                      </div>
                      {cfg.mode === 'sandbox' && (
                        <p className="text-[10px] mt-1" style={{ color: '#f59e0b' }}>
                          ⚠ Sandbox mode - no real shipments will be created
                        </p>
                      )}
                    </div>

                    {/* 凭证输入 */}
                    {cfg.code === '4px' && (
                      <>
                        <CredentialField
                          label="App Key"
                          value={cfg.credentials.appKey}
                          onSave={async (val) => {
                            await fetch('/api/shipping/config', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ code: cfg.code, credentials: { appKey: val } }),
                            })
                            fetchCarrierConfigs()
                          }}
                        />
                        <CredentialField
                          label="App Secret"
                          value={cfg.credentials.appSecret}
                          onSave={async (val) => {
                            await fetch('/api/shipping/config', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ code: cfg.code, credentials: { appSecret: val } }),
                            })
                            fetchCarrierConfigs()
                          }}
                        />
                        <CredentialField
                          label="Access Token (可选)"
                          value={cfg.credentials.accessToken}
                          onSave={async (val) => {
                            await fetch('/api/shipping/config', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ code: cfg.code, credentials: { accessToken: val } }),
                            })
                            fetchCarrierConfigs()
                          }}
                        />

                        <div className="pt-3 border-t" style={{ borderColor: 'var(--adm-border)' }}>
                          <p className="text-xs font-medium mb-2" style={{ color: 'var(--adm-text)' }}>Test Tools</p>
                          <div className="flex gap-2 mb-2">
                            <button
                              type="button"
                              onClick={async () => {
                                if (!confirm('Create a test order in 4PX sandbox? This will use the first pending order in your system.')) return
                                try {
                                  const r = await fetch('/api/shipping/4px/create-test-order', { method: 'POST' })
                                  const data = await r.json()
                                  if (r.ok) {
                                    setTestTrackingInput(data.refNo || data.trackingNumber || '')
                                    alert(`Test order created!\n\nTracking #: ${data.trackingNumber}\nRef No: ${data.refNo}`)
                                    fetchShipments()
                                  } else {
                                    alert('Failed: ' + (data.error || 'Unknown error'))
                                  }
                                } catch (e: any) {
                                  alert('Error: ' + e.message)
                                }
                              }}
                              disabled={cfg.mode !== 'sandbox'}
                              className="flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors adm-hover-bg disabled:opacity-50 disabled:cursor-not-allowed"
                              style={{
                                backgroundColor: cfg.mode === 'sandbox' ? 'var(--adm-accent-bg)' : 'var(--adm-input)',
                                color: cfg.mode === 'sandbox' ? 'var(--adm-accent)' : 'var(--adm-text-secondary)',
                                border: '1px solid var(--adm-border)',
                              }}
                            >
                              🧪 Create Test Order
                            </button>
                          </div>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={testTrackingInput}
                              onChange={(e) => setTestTrackingInput(e.target.value)}
                              placeholder="Enter tracking / ref number"
                              className="flex-1 px-3 py-2 rounded-lg text-xs outline-none"
                              style={{
                                backgroundColor: 'var(--adm-input)',
                                color: 'var(--adm-text)',
                                border: '1px solid var(--adm-border)',
                              }}
                            />
                            <button
                              type="button"
                              disabled={testTrackingLoading || !testTrackingInput.trim()}
                              onClick={async () => {
                                const tn = testTrackingInput.trim()
                                if (!tn) return
                                setTestTrackingLoading(true)
                                try {
                                  const r = await fetch(`/api/shipping/4px/test?trackingNumber=${encodeURIComponent(tn)}`)
                                  const data = await r.json()
                                  if (r.ok && data.success) {
                                    const events = data.events || []
                                    const eventList = events.length > 0
                                      ? events.slice(0, 3).map((e: any, i: number) => `${i + 1}. ${e.description || e.status} - ${e.location || ''}`).join('\n')
                                      : 'No tracking events found'
                                    const total = events.length
                                    alert(`Tracking test success!\n\nEvents found: ${total}\n\n${eventList}${total > 3 ? '\n...' : ''}`)
                                    fetchShipments()
                                  } else {
                                    alert('Failed: ' + (data.error || 'Unknown error'))
                                  }
                                } catch (e: any) {
                                  alert('Error: ' + e.message)
                                } finally {
                                  setTestTrackingLoading(false)
                                }
                              }}
                              className="px-3 py-2 rounded-lg text-xs font-medium transition-colors adm-hover-bg disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                              style={{
                                backgroundColor: 'var(--adm-input)',
                                color: 'var(--adm-text)',
                                border: '1px solid var(--adm-border)',
                              }}
                            >
                              {testTrackingLoading ? '...' : '🔍 Test'}
                            </button>
                          </div>
                          {cfg.mode !== 'sandbox' && (
                            <p className="text-[10px] mt-1.5" style={{ color: '#f59e0b' }}>
                              ⚠ Switch to Sandbox mode to create test orders
                            </p>
                          )}
                        </div>
                      </>
                    )}

                    {cfg.code === 'yunexpress' && (
                      <>
                        <CredentialField
                          label="App ID"
                          value={cfg.credentials.appId}
                          onSave={async (val) => {
                            await fetch('/api/shipping/config', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ code: cfg.code, credentials: { appId: val } }),
                            })
                            fetchCarrierConfigs()
                          }}
                        />
                        <CredentialField
                          label="App Secret"
                          value={cfg.credentials.appSecret}
                          onSave={async (val) => {
                            await fetch('/api/shipping/config', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ code: cfg.code, credentials: { appSecret: val } }),
                            })
                            fetchCarrierConfigs()
                          }}
                        />
                        <CredentialField
                          label="Source Key"
                          value={cfg.credentials.sourceKey}
                          onSave={async (val) => {
                            await fetch('/api/shipping/config', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ code: cfg.code, credentials: { sourceKey: val } }),
                            })
                            fetchCarrierConfigs()
                          }}
                        />
                      </>
                    )}

                    {/* 自动同步设置 */}
                    <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: 'var(--adm-border)' }}>
                      <div>
                        <p className="text-xs font-medium" style={{ color: 'var(--adm-text)' }}>Auto Sync Tracking</p>
                        <p className="text-[10px]" style={{ color: 'var(--adm-text-secondary)' }}>Automatically pull tracking updates</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={cfg.syncEnabled}
                          onChange={async e => {
                            await fetch('/api/shipping/config', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ code: cfg.code, syncEnabled: e.target.checked }),
                            })
                            fetchCarrierConfigs()
                          }}
                          className="sr-only peer"
                        />
                        <div
                          className="w-9 h-5 rounded-full"
                          style={{
                            backgroundColor: cfg.syncEnabled ? 'var(--adm-accent)' : 'var(--adm-border)',
                            position: 'relative',
                          }}
                        >
                          <div
                            style={{
                              position: 'absolute',
                              top: '2px',
                              left: cfg.syncEnabled ? '18px' : '2px',
                              width: '16px',
                              height: '16px',
                              borderRadius: '50%',
                              backgroundColor: 'white',
                              transition: 'left 0.2s',
                            }}
                          />
                        </div>
                      </label>
                    </div>
                    {cfg.syncEnabled && (
                      <div>
                        <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--adm-text-secondary)' }}>Sync Interval (minutes)</label>
                        <input
                          type="number"
                          value={cfg.syncInterval}
                          min={5}
                          onChange={async e => {
                            await fetch('/api/shipping/config', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ code: cfg.code, syncInterval: parseInt(e.target.value) }),
                            })
                            fetchCarrierConfigs()
                          }}
                          className="w-full px-3 py-1.5 rounded-lg text-sm outline-none"
                          style={{ backgroundColor: 'var(--adm-input)', color: 'var(--adm-text)', border: '1px solid var(--adm-border)' }}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}

          <div className="text-[10px] p-3 rounded-lg" style={{ backgroundColor: 'var(--adm-input)', color: 'var(--adm-text-secondary)' }}>
            <p className="font-medium mb-1">💡 Setup Guide:</p>
            <ol className="list-decimal list-inside space-y-0.5">
              <li>Register an account on the carrier&apos;s official website</li>
              <li>Complete enterprise authentication</li>
              <li>Apply for API access in the developer console</li>
              <li>Enter the App Key / Secret here</li>
              <li>Use Sandbox mode first to test, then switch to Production</li>
            </ol>
          </div>
        </div>
      </Modal>
      )}

      {/* 同步结果弹窗 */}
      {showSyncResult && syncResult && (
        <Modal title="Sync Result" onClose={() => setShowSyncResult(false)}>
          <div className="space-y-4">
            {syncResult.error ? (
              <div className="rounded-lg p-4" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}>
                <p className="text-sm font-medium" style={{ color: 'rgb(239, 68, 68)' }}>Sync Failed</p>
                <p className="text-xs mt-1" style={{ color: 'var(--adm-text-secondary)' }}>{syncResult.error}</p>
              </div>
            ) : (
              <>
                {Object.entries(syncResult).map(([carrier, result]: [string, any]) => {
                  if (result.error) {
                    return (
                      <div key={carrier} className="rounded-lg p-3" style={{ backgroundColor: 'rgba(239, 68, 68, 0.08)' }}>
                        <p className="text-xs font-semibold" style={{ color: 'rgb(239, 68, 68)' }}>
                          {carrier.toUpperCase()}
                        </p>
                        <p className="text-[11px] mt-0.5" style={{ color: 'var(--adm-text-secondary)' }}>
                          Error: {result.error}
                        </p>
                      </div>
                    )
                  }
                  return (
                    <div key={carrier} className="rounded-lg p-3" style={{ backgroundColor: 'var(--adm-input)' }}>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold" style={{ color: 'var(--adm-text)' }}>
                          {carrier.toUpperCase()}
                        </p>
                        {result.updated > 0 ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(34, 197, 94, 0.15)', color: 'rgb(34, 197, 94)' }}>
                            {result.updated} updated
                          </span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--adm-border)', color: 'var(--adm-text-secondary)' }}>
                            No new events
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-[11px]" style={{ color: 'var(--adm-text-secondary)' }}>
                        <span>Total: {result.total}</span>
                        <span>Updated: {result.updated}</span>
                      </div>
                    </div>
                  )
                })}
                <p className="text-[10px] text-center" style={{ color: 'var(--adm-text-secondary)' }}>
                  Tracking timelines have been refreshed with the latest carrier data.
                </p>
              </>
            )}
            <button
              type="button"
              onClick={() => setShowSyncResult(false)}
              className="w-full py-2 rounded-lg text-sm font-medium transition-colors adm-hover-bg"
              style={{ backgroundColor: 'var(--adm-accent)', color: 'white' }}
            >
              OK
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

// 凭证字段组件
function CredentialField({ label, value, onSave }: { label: string; value: string; onSave: (val: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [tempVal, setTempVal] = useState('')
  const inputRef = useCallback((el: HTMLInputElement | null) => {
    if (el && editing) el.focus()
  }, [editing])

  const isMasked = value?.includes('****')
  const hasValue = value && !isMasked

  return (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--adm-text-secondary)' }}>{label}</label>
      {editing ? (
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="password"
            value={tempVal}
            onChange={e => setTempVal(e.target.value)}
            placeholder={`Enter ${label.toLowerCase()}`}
            className="flex-1 px-3 py-1.5 rounded-lg text-sm outline-none"
            style={{ backgroundColor: 'var(--adm-input)', color: 'var(--adm-text)', border: '1px solid var(--adm-border)' }}
          />
          <button
            type="button"
            onClick={() => { onSave(tempVal); setEditing(false); setTempVal('') }}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-white"
            style={{ backgroundColor: 'var(--adm-accent)' }}
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => { setEditing(false); setTempVal('') }}
            className="px-3 py-1.5 rounded-lg text-xs font-medium adm-hover-bg"
            style={{ backgroundColor: 'var(--adm-input)', color: 'var(--adm-text-secondary)', border: '1px solid var(--adm-border)' }}
          >
            Cancel
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <div className="flex-1 px-3 py-1.5 rounded-lg text-sm font-mono" style={{ backgroundColor: 'var(--adm-input)', color: hasValue ? 'var(--adm-text)' : 'var(--adm-text-secondary)', border: '1px solid var(--adm-border)' }}>
            {value || 'Not configured'}
          </div>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium adm-hover-bg"
            style={{ backgroundColor: 'var(--adm-input)', color: 'var(--adm-text)', border: '1px solid var(--adm-border)' }}
          >
            {hasValue || isMasked ? 'Update' : 'Set'}
          </button>
        </div>
      )}
    </div>
  )
}

// 通用弹窗组件
function Modal({ title, children, onClose, wide }: { title: string; children: React.ReactNode; onClose: () => void; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={onClose}>
      <div
        className="rounded-xl shadow-2xl w-full max-h-[90vh] overflow-y-auto"
        style={{ backgroundColor: 'var(--adm-sidebar)', border: '1px solid var(--adm-border)', maxWidth: wide ? '640px' : '480px' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3.5 border-b sticky top-0 z-10" style={{ borderColor: 'var(--adm-border)', backgroundColor: 'var(--adm-sidebar)' }}>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--adm-text)' }}>{title}</h3>
          <button type="button" onClick={onClose} className="p-1 rounded-lg adm-hover-bg transition-colors" style={{ color: 'var(--adm-text-secondary)' }}>
            <X size={16} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

// 物流详情组件 — 信息卡 + 轨迹时间轴 + 添加节点
function ShipmentDetail({
  shipment, carriers, eventForm, setEventForm, addingEvent, onAddEvent, applyPreset, buildTrackingUrl, fmtDate, fmtMoney,
  onGenerateSample, generatingSample, onCancel, cancelling
}: any) {
  const sc = STATUS_CONFIG[shipment.status as TrackStatus] || STATUS_CONFIG.pending
  const events: any[] = shipment.events || []
  const trackingUrl = buildTrackingUrl(shipment.carrierCode, shipment.trackingNumber)
  const [showManualEvent, setShowManualEvent] = useState(false)
  const orderInfo = shipment._orderInfo

  // 是否可以取消 (非 delivered/returned/cancelled 状态)
  const canCancel = !['delivered', 'returned', 'cancelled'].includes(shipment.status)

  return (
    <div className="space-y-5">
      {/* 状态横幅 */}
      <div className="rounded-lg p-4 flex items-center justify-between" style={{ backgroundColor: sc.bg }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: sc.color + '30' }}>
            <sc.icon size={20} style={{ color: sc.color }} />
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: sc.color }}>{sc.label}</p>
            <p className="text-[11px]" style={{ color: 'var(--adm-text-secondary)' }}>
              {shipment.carrierName} · {shipment.trackingNumber}
            </p>
          </div>
        </div>
        {trackingUrl && (
          <a href={trackingUrl} target="_blank" rel="noopener noreferrer" className="text-xs px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition-colors adm-hover-bg" style={{ color: 'var(--adm-accent)', border: '1px solid var(--adm-border)' }}>
            <ExternalLink size={13} /> Track
          </a>
        )}
      </div>

      {/* 信息网格 */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Order #', value: shipment.orderNo || shipment.orderId.slice(0, 12), mono: true },
          { label: 'Shipped At', value: fmtDate(shipment.shippedAt) },
          { label: 'Weight', value: shipment.weight ? shipment.weight + ' kg' : '-' },
          { label: 'Shipping Cost', value: fmtMoney(shipment.shippingCost) },
          { label: 'Est. Delivery', value: shipment.estimatedDelivery || '-' },
          { label: 'Delivered At', value: shipment.deliveredAt ? fmtDate(shipment.deliveredAt) : '-' },
        ].map((item, i) => (
          <div key={i} className="px-3 py-2 rounded-lg" style={{ backgroundColor: 'var(--adm-input)' }}>
            <p className="text-[10px] font-medium" style={{ color: 'var(--adm-text-secondary)' }}>{item.label}</p>
            <p className={`text-xs mt-0.5 ${item.mono ? 'font-mono' : ''}`} style={{ color: 'var(--adm-text)' }}>{item.value}</p>
          </div>
        ))}
      </div>

      {shipment.notes && (
        <div className="px-3 py-2 rounded-lg text-xs" style={{ backgroundColor: 'var(--adm-input)', color: 'var(--adm-text-secondary)' }}>
          <span className="font-medium">Notes: </span>{shipment.notes}
        </div>
      )}

      {/* 关联订单信息 */}
      {orderInfo && (
        <div className="rounded-lg border p-4" style={{ borderColor: 'var(--adm-border)', backgroundColor: 'var(--adm-card)' }}>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-semibold flex items-center gap-1.5" style={{ color: 'var(--adm-text)' }}>
              <Package size={13} className="adm-accent" /> Order Information
            </h4>
            <a
              href={`/admin/orders`}
              className="text-[10px] px-2 py-1 rounded-md transition-colors adm-hover-bg"
              style={{ color: 'var(--adm-accent)', border: '1px solid var(--adm-border)' }}
            >
              View in Orders
            </a>
          </div>

          {/* 订单基本信息 */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="px-2.5 py-2 rounded-lg" style={{ backgroundColor: 'var(--adm-input)' }}>
              <p className="text-[10px] font-medium" style={{ color: 'var(--adm-text-secondary)' }}>Order No.</p>
              <p className="text-xs mt-0.5 font-mono" style={{ color: 'var(--adm-text)' }}>{orderInfo.orderNo}</p>
            </div>
            <div className="px-2.5 py-2 rounded-lg" style={{ backgroundColor: 'var(--adm-input)' }}>
              <p className="text-[10px] font-medium" style={{ color: 'var(--adm-text-secondary)' }}>Order Total</p>
              <p className="text-xs mt-0.5 font-serif font-bold" style={{ color: 'var(--adm-text)' }}>${(orderInfo.total || 0).toFixed(2)}</p>
            </div>
            <div className="px-2.5 py-2 rounded-lg" style={{ backgroundColor: 'var(--adm-input)' }}>
              <p className="text-[10px] font-medium" style={{ color: 'var(--adm-text-secondary)' }}>Order Date</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--adm-text)' }}>{fmtDate(orderInfo.createdAt)}</p>
            </div>
            <div className="px-2.5 py-2 rounded-lg" style={{ backgroundColor: 'var(--adm-input)' }}>
              <p className="text-[10px] font-medium" style={{ color: 'var(--adm-text-secondary)' }}>Order Status</p>
              <p className="text-xs mt-0.5 capitalize" style={{ color: 'var(--adm-text)' }}>{orderInfo.status}</p>
            </div>
          </div>

          {/* 客户信息 */}
          <div className="px-3 py-2.5 rounded-lg mb-3" style={{ backgroundColor: 'var(--adm-input)' }}>
            <p className="text-[10px] font-medium mb-1.5" style={{ color: 'var(--adm-text-secondary)' }}>Customer</p>
            <div className="space-y-1">
              <p className="text-xs font-medium" style={{ color: 'var(--adm-text)' }}>
                {orderInfo.customerName}
              </p>
              {orderInfo.customerEmail && (
                <p className="text-[11px]" style={{ color: 'var(--adm-text-secondary)' }}>{orderInfo.customerEmail}</p>
              )}
              {orderInfo.customerPhone && (
                <p className="text-[11px]" style={{ color: 'var(--adm-text-secondary)' }}>{orderInfo.customerPhone}</p>
              )}
            </div>
          </div>

          {/* 收货地址 */}
          {orderInfo.shippingAddress && (
            <div className="px-3 py-2.5 rounded-lg mb-3" style={{ backgroundColor: 'var(--adm-input)' }}>
              <p className="text-[10px] font-medium mb-1.5 flex items-center gap-1" style={{ color: 'var(--adm-text-secondary)' }}>
                <MapPin size={11} /> Shipping Address
              </p>
              <div className="text-[11px] space-y-0.5" style={{ color: 'var(--adm-text)' }}>
                {orderInfo.shippingAddress.name && <p>{orderInfo.shippingAddress.name}</p>}
                {orderInfo.shippingAddress.address && <p>{orderInfo.shippingAddress.address}</p>}
                <p>
                  {[
                    orderInfo.shippingAddress.city,
                    orderInfo.shippingAddress.state,
                    orderInfo.shippingAddress.postcode,
                  ].filter(Boolean).join(', ')}
                </p>
                {orderInfo.shippingAddress.country && <p>{orderInfo.shippingAddress.country}</p>}
              </div>
            </div>
          )}

          {/* 商品列表 */}
          {orderInfo.items && orderInfo.items.length > 0 && (
            <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--adm-border)' }}>
              <div className="px-3 py-2 text-[10px] font-medium" style={{ backgroundColor: 'var(--adm-input)', color: 'var(--adm-text-secondary)' }}>
                Items ({orderInfo.items.length})
              </div>
              <div className="divide-y" style={{ borderColor: 'var(--adm-border)' }}>
                {orderInfo.items.map((item: any, i: number) => (
                  <div key={i} className="px-3 py-2 flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium truncate" style={{ color: 'var(--adm-text)' }}>{item.name}</p>
                      {item.productCode && (
                        <span className="text-[9px] font-mono px-1 py-0.5 rounded-sm" style={{ backgroundColor: 'var(--adm-accent-bg)', color: 'var(--adm-accent)' }}>
                          {item.productCode}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-[11px]" style={{ color: 'var(--adm-text-secondary)' }}>x{item.quantity}</span>
                      <span className="text-xs font-medium" style={{ color: 'var(--adm-text)' }}>${(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 物流轨迹时间轴 */}
      <div>
        <h4 className="text-xs font-semibold mb-3 flex items-center gap-1.5" style={{ color: 'var(--adm-text)' }}>
          <Navigation size={13} className="adm-accent" /> Tracking Timeline
        </h4>
        {events.length === 0 ? (
          <p className="text-xs text-center py-6" style={{ color: 'var(--adm-text-secondary)' }}>No tracking events yet</p>
        ) : (
          <div className="relative pl-2">
            {[...events].reverse().map((evt: any, i: number) => {
              const ec = STATUS_CONFIG[evt.status as TrackStatus] || STATUS_CONFIG.pending
              const isLast = i === 0
              return (
                <div key={evt.id || i} className="flex gap-3 pb-4 relative">
                  <div className="flex flex-col items-center shrink-0">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ backgroundColor: ec.bg }}>
                      <ec.icon size={13} style={{ color: ec.color }} />
                    </div>
                    {!isLast && <div className="w-0.5 flex-1 mt-1" style={{ backgroundColor: 'var(--adm-border)' }} />}
                  </div>
                  <div className="flex-1 min-w-0 pt-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-medium" style={{ color: 'var(--adm-text)' }}>{evt.description}</span>
                      {isLast && (
                        <span className="px-1.5 py-0.5 rounded-full text-[9px] font-medium" style={{ backgroundColor: ec.bg, color: ec.color }}>LATEST</span>
                      )}
                    </div>
                    {evt.location && (
                      <p className="text-[11px] mt-0.5 flex items-center gap-1" style={{ color: 'var(--adm-text-secondary)' }}>
                        <MapPin size={10} /> {evt.location}
                      </p>
                    )}
                    <p className="text-[10px] mt-0.5" style={{ color: 'var(--adm-text-secondary)' }}>{fmtDate(evt.timestamp)}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 手动添加轨迹节点 (可折叠) */}
      <div className="rounded-lg p-4 border" style={{ borderColor: 'var(--adm-border)', backgroundColor: 'var(--adm-input)' }}>
        <div className="flex items-center justify-between mb-3">
          <button
            type="button"
            onClick={() => setShowManualEvent(!showManualEvent)}
            className="text-xs font-semibold flex items-center gap-1.5 transition-colors adm-hover-bg rounded-md"
            style={{ color: 'var(--adm-text)' }}
          >
            {showManualEvent ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
            <Plus size={13} className="adm-accent" /> Manual Tracking Event
          </button>
          {events.length === 0 && onGenerateSample && (
            <button
              type="button"
              onClick={onGenerateSample}
              disabled={generatingSample}
              className="text-[10px] px-2.5 py-1 rounded-md font-medium transition-colors adm-hover-bg"
              style={{
                backgroundColor: 'var(--adm-accent)',
                color: 'white',
                opacity: generatingSample ? 0.6 : 1,
              }}
            >
              {generatingSample ? 'Generating...' : 'Generate Sample'}
            </button>
          )}
        </div>

        {!showManualEvent && (
          <p className="text-[11px]" style={{ color: 'var(--adm-text-secondary)' }}>
            Tracking events are auto-synced via the Sync button for API-connected carriers (e.g. 4PX). Use this section only for manual entry or carriers without API support.
          </p>
        )}

        {showManualEvent && (
          <>
            {/* 快速预设 */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {TRACK_PRESETS.map((p, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => applyPreset(p)}
                  className="text-[10px] px-2 py-1 rounded-md transition-colors adm-hover-bg"
                  style={{ color: 'var(--adm-text-secondary)', border: '1px solid var(--adm-border)' }}
                  title={p.description}
                >
                  {p.description.length > 28 ? p.description.slice(0, 28) + '...' : p.description}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2 mb-2">
              <select
                value={eventForm.status}
                onChange={e => setEventForm({ ...eventForm, status: e.target.value as TrackStatus })}
                className="px-2.5 py-1.5 rounded-lg text-xs outline-none cursor-pointer"
                style={{ backgroundColor: 'var(--adm-sidebar)', color: 'var(--adm-text)', border: '1px solid var(--adm-border)' }}
              >
                <option value="">Status *</option>
                {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
              <input
                type="datetime-local"
                value={eventForm.timestamp}
                onChange={e => setEventForm({ ...eventForm, timestamp: e.target.value })}
                className="px-2.5 py-1.5 rounded-lg text-xs outline-none cursor-pointer"
                style={{ backgroundColor: 'var(--adm-sidebar)', color: 'var(--adm-text)', border: '1px solid var(--adm-border)' }}
              />
            </div>
            <input
              type="text"
              value={eventForm.description}
              onChange={e => setEventForm({ ...eventForm, description: e.target.value })}
              placeholder="Event description *"
              className="w-full px-2.5 py-1.5 rounded-lg text-xs outline-none mb-2"
              style={{ backgroundColor: 'var(--adm-sidebar)', color: 'var(--adm-text)', border: '1px solid var(--adm-border)' }}
            />
            <input
              type="text"
              value={eventForm.location}
              onChange={e => setEventForm({ ...eventForm, location: e.target.value })}
              placeholder="Location (e.g. Shenzhen, China)"
              className="w-full px-2.5 py-1.5 rounded-lg text-xs outline-none mb-3"
              style={{ backgroundColor: 'var(--adm-sidebar)', color: 'var(--adm-text)', border: '1px solid var(--adm-border)' }}
            />
            <button
              type="button"
              onClick={onAddEvent}
              disabled={addingEvent || !eventForm.status || !eventForm.description}
              className="w-full adm-accent-bg text-white py-2 rounded-lg text-xs font-medium transition-all hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              <Send size={13} /> {addingEvent ? 'Adding...' : 'Add Event'}
            </button>
          </>
        )}
      </div>

      {/* 取消发货 */}
      {canCancel && onCancel && (
        <div className="rounded-lg p-4 border" style={{ borderColor: 'rgba(239, 68, 68, 0.3)', backgroundColor: 'rgba(239, 68, 68, 0.05)' }}>
          <h4 className="text-xs font-semibold mb-2 flex items-center gap-1.5" style={{ color: '#ef4444' }}>
            <X size={13} /> Cancel Shipment
          </h4>
          <p className="text-[11px] mb-3" style={{ color: 'var(--adm-text-secondary)' }}>
            Cancelling this shipment will revert the order status back to &quot;Processing&quot; and clear tracking info. This action cannot be undone.
          </p>
          <button
            type="button"
            onClick={onCancel}
            disabled={cancelling}
            className="w-full py-2 rounded-lg text-xs font-medium transition-all hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-1.5"
            style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)' }}
          >
            <X size={13} /> {cancelling ? 'Cancelling...' : 'Cancel Shipment'}
          </button>
        </div>
      )}
    </div>
  )
}

// 订单详情弹窗组件 — 点击发货单行时弹出
function OrderDetailPanel({ shipment, fmtDate, fmtMoney }: { shipment: any; fmtDate: (s: string) => string; fmtMoney: (v: any) => string }) {
  const orderInfo = shipment._orderInfo
  if (!orderInfo) {
    return (
      <div className="text-center py-8">
        <Package size={32} className="mx-auto mb-3 opacity-30" style={{ color: 'var(--adm-text-secondary)' }} />
        <p className="text-sm" style={{ color: 'var(--adm-text-secondary)' }}>Order information not available</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* 订单基本信息 */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Order No.', value: orderInfo.orderNo, mono: true },
          { label: 'Order Total', value: `$${(orderInfo.total || 0).toFixed(2)}` },
          { label: 'Order Date', value: fmtDate(orderInfo.createdAt) },
          { label: 'Order Status', value: orderInfo.status ? orderInfo.status.charAt(0).toUpperCase() + orderInfo.status.slice(1) : '-' },
        ].map((item, i) => (
          <div key={i} className="px-3 py-2 rounded-lg" style={{ backgroundColor: 'var(--adm-input)' }}>
            <p className="text-[10px] font-medium" style={{ color: 'var(--adm-text-secondary)' }}>{item.label}</p>
            <p className={`text-xs mt-0.5 ${item.mono ? 'font-mono' : 'font-medium'}`} style={{ color: 'var(--adm-text)' }}>{item.value}</p>
          </div>
        ))}
      </div>

      {/* 客户信息 */}
      <div className="rounded-lg border p-4" style={{ borderColor: 'var(--adm-border)', backgroundColor: 'var(--adm-card)' }}>
        <h4 className="text-xs font-semibold mb-3 flex items-center gap-1.5" style={{ color: 'var(--adm-text)' }}>
          <Package size={13} className="adm-accent" /> Customer Information
        </h4>
        <div className="px-3 py-2.5 rounded-lg" style={{ backgroundColor: 'var(--adm-input)' }}>
          <div className="space-y-1">
            <p className="text-xs font-medium" style={{ color: 'var(--adm-text)' }}>{orderInfo.customerName || 'N/A'}</p>
            {orderInfo.customerEmail && (
              <p className="text-[11px]" style={{ color: 'var(--adm-text-secondary)' }}>{orderInfo.customerEmail}</p>
            )}
            {orderInfo.customerPhone && (
              <p className="text-[11px]" style={{ color: 'var(--adm-text-secondary)' }}>{orderInfo.customerPhone}</p>
            )}
          </div>
        </div>
      </div>

      {/* 收货地址 */}
      {orderInfo.shippingAddress && (
        <div className="rounded-lg border p-4" style={{ borderColor: 'var(--adm-border)', backgroundColor: 'var(--adm-card)' }}>
          <h4 className="text-xs font-semibold mb-3 flex items-center gap-1.5" style={{ color: 'var(--adm-text)' }}>
            <MapPin size={13} className="adm-accent" /> Shipping Address
          </h4>
          <div className="px-3 py-2.5 rounded-lg" style={{ backgroundColor: 'var(--adm-input)' }}>
            <div className="text-[11px] space-y-0.5" style={{ color: 'var(--adm-text)' }}>
              {orderInfo.shippingAddress.name && <p className="font-medium">{orderInfo.shippingAddress.name}</p>}
              {orderInfo.shippingAddress.address && <p>{orderInfo.shippingAddress.address}</p>}
              <p>
                {[
                  orderInfo.shippingAddress.city,
                  orderInfo.shippingAddress.state,
                  orderInfo.shippingAddress.postcode,
                ].filter(Boolean).join(', ')}
              </p>
              {orderInfo.shippingAddress.country && <p>{orderInfo.shippingAddress.country}</p>}
            </div>
          </div>
        </div>
      )}

      {/* 商品列表 */}
      {orderInfo.items && orderInfo.items.length > 0 && (
        <div className="rounded-lg border p-4" style={{ borderColor: 'var(--adm-border)', backgroundColor: 'var(--adm-card)' }}>
          <h4 className="text-xs font-semibold mb-3 flex items-center gap-1.5" style={{ color: 'var(--adm-text)' }}>
            <Package size={13} className="adm-accent" /> Items ({orderInfo.items.length})
          </h4>
          <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--adm-border)' }}>
            <div className="divide-y" style={{ borderColor: 'var(--adm-border)' }}>
              {orderInfo.items.map((item: any, i: number) => (
                <div key={i} className="px-3 py-2.5 flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate" style={{ color: 'var(--adm-text)' }}>{item.name}</p>
                    {item.productCode && (
                      <span className="inline-block mt-0.5 text-[9px] font-mono px-1 py-0.5 rounded-sm" style={{ backgroundColor: 'var(--adm-accent-bg)', color: 'var(--adm-accent)' }}>
                        {item.productCode}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-[11px]" style={{ color: 'var(--adm-text-secondary)' }}>x{item.quantity}</span>
                    <span className="text-xs font-medium" style={{ color: 'var(--adm-text)' }}>${(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 物流信息摘要 */}
      <div className="rounded-lg border p-4" style={{ borderColor: 'var(--adm-border)', backgroundColor: 'var(--adm-card)' }}>
        <h4 className="text-xs font-semibold mb-3 flex items-center gap-1.5" style={{ color: 'var(--adm-text)' }}>
          <Truck size={13} className="adm-accent" /> Shipment Summary
        </h4>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Carrier', value: shipment.carrierName || shipment.carrierCode || '-' },
            { label: 'Tracking #', value: shipment.trackingNumber || '-', mono: true },
            { label: 'Shipped At', value: fmtDate(shipment.shippedAt) },
            { label: 'Status', value: (STATUS_CONFIG[shipment.status as TrackStatus]?.label || shipment.status) },
          ].map((item, i) => (
            <div key={i} className="px-3 py-2 rounded-lg" style={{ backgroundColor: 'var(--adm-input)' }}>
              <p className="text-[10px] font-medium" style={{ color: 'var(--adm-text-secondary)' }}>{item.label}</p>
              <p className={`text-xs mt-0.5 ${item.mono ? 'font-mono' : ''}`} style={{ color: 'var(--adm-text)' }}>{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 查看详情按钮 */}
      <div className="flex justify-end">
        <a
          href={`/admin/orders`}
          className="text-xs px-4 py-2 rounded-lg font-medium transition-colors adm-hover-bg inline-flex items-center gap-1.5"
          style={{ color: 'var(--adm-accent)', border: '1px solid var(--adm-border)' }}
        >
          <ExternalLink size={13} /> View in Orders
        </a>
      </div>
    </div>
  )
}

// 发货通知客户弹窗
// 需求: 只有订单已发货才通知; 手动点击发送 (邮件 / 站内消息);
//       后台要明确显示「有邮箱 / 无邮箱 / 已发送·时间」。
function NotifyCustomerModal({
  shipment, fmtDate, onClose, onSent,
}: { shipment: any; fmtDate: (s: string) => string; onClose: () => void; onSent: () => void }) {
  const order = shipment._orderInfo
  const email: string = order?.customerEmail || ''
  const [sending, setSending] = useState<'' | 'email' | 'message'>('')
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null)

  const alreadySent = !!shipment.notifiedAt
  const channelLabel = shipment.notifiedChannel === 'email' ? 'Email' : shipment.notifiedChannel === 'message' ? 'In-site message' : ''

  const send = async (channel: 'email' | 'message') => {
    if (alreadySent && !confirm(`This shipment was already notified via ${channelLabel} at ${fmtDate(shipment.notifiedAt)}.\n\nSend again?`)) return
    setSending(channel)
    setResult(null)
    try {
      const r = await fetch('/api/shipments/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shipmentId: shipment.id, channel }),
      })
      const d = await r.json().catch(() => ({}))
      if (r.ok) {
        setResult({ ok: true, text: channel === 'email' ? `Email sent to ${d.sentTo}` : `In-site message delivered to ${d.sentTo}` })
        onSent()
      } else {
        setResult({ ok: false, text: d.error || 'Failed to notify customer' })
      }
    } catch (e: any) {
      setResult({ ok: false, text: e?.message || 'Failed to notify customer' })
    } finally {
      setSending('')
    }
  }

  return (
    <Modal title="Notify Customer" onClose={onClose} wide>
      <div className="space-y-4">
        {/* 当前通知状态 */}
        <div className="rounded-lg border p-4" style={{ borderColor: 'var(--adm-border)', backgroundColor: 'var(--adm-card)' }}>
          <h4 className="text-xs font-semibold mb-3 flex items-center gap-1.5" style={{ color: 'var(--adm-text)' }}>
            <Send size={13} className="adm-accent" /> Notification Status
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="px-3 py-2 rounded-lg" style={{ backgroundColor: 'var(--adm-input)' }}>
              <p className="text-[10px] font-medium" style={{ color: 'var(--adm-text-secondary)' }}>Customer Email</p>
              {email ? (
                <p className="text-xs mt-0.5 font-mono break-all" style={{ color: 'var(--adm-text)' }}>{email}</p>
              ) : (
                <p className="text-xs mt-0.5 font-medium flex items-center gap-1" style={{ color: '#f59e0b' }}>
                  <AlertCircle size={11} /> No email on this order
                </p>
              )}
            </div>
            <div className="px-3 py-2 rounded-lg" style={{ backgroundColor: 'var(--adm-input)' }}>
              <p className="text-[10px] font-medium" style={{ color: 'var(--adm-text-secondary)' }}>Last Notified</p>
              {alreadySent ? (
                <p className="text-xs mt-0.5 font-medium flex items-center gap-1" style={{ color: '#22c55e' }}>
                  <CheckCircle size={11} /> {channelLabel} · {fmtDate(shipment.notifiedAt)}
                </p>
              ) : (
                <p className="text-xs mt-0.5" style={{ color: 'var(--adm-text-secondary)' }}>Not notified yet</p>
              )}
            </div>
          </div>
          {alreadySent && shipment.notifiedTo && (
            <p className="text-[10px] mt-2" style={{ color: 'var(--adm-text-secondary)' }}>Sent to: {shipment.notifiedTo}</p>
          )}
        </div>

        {/* 发货信息预览 */}
        <div className="rounded-lg border p-4" style={{ borderColor: 'var(--adm-border)', backgroundColor: 'var(--adm-card)' }}>
          <h4 className="text-xs font-semibold mb-3 flex items-center gap-1.5" style={{ color: 'var(--adm-text)' }}>
            <Truck size={13} className="adm-accent" /> What the customer will receive
          </h4>
          <div className="text-[11px] space-y-1 px-3 py-2.5 rounded-lg" style={{ backgroundColor: 'var(--adm-input)', color: 'var(--adm-text)' }}>
            <p>Order #{order?.orderNo || shipment.orderNo || shipment.orderId}</p>
            <p>Carrier: {shipment.carrierName || shipment.carrierCode || '-'}</p>
            <p className="font-mono">Tracking: {shipment.trackingNumber}</p>
            {shipment.estimatedDelivery && <p>Estimated delivery: {shipment.estimatedDelivery}</p>}
          </div>
        </div>

        {!email && (
          <div className="px-3 py-2 rounded-lg text-xs flex items-start gap-2" style={{ backgroundColor: 'rgba(245,158,11,0.1)', color: '#b45309' }}>
            <AlertCircle size={14} className="mt-0.5 shrink-0" />
            <span>
              This order has no customer email, so neither an email nor an in-site message can be delivered.
              Please contact the customer by phone or another channel.
            </span>
          </div>
        )}

        {result && (
          <div className="px-3 py-2 rounded-lg text-xs flex items-center gap-2"
            style={{ backgroundColor: result.ok ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', color: result.ok ? '#16a34a' : '#ef4444' }}>
            {result.ok ? <CheckCircle size={14} /> : <AlertCircle size={14} />} {result.text}
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={!email || sending !== ''}
            onClick={() => send('email')}
            className="text-xs px-4 py-2 rounded-lg font-medium inline-flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ backgroundColor: 'var(--adm-accent)', color: '#fff' }}
          >
            <Send size={13} /> {sending === 'email' ? 'Sending…' : 'Send Shipping Email'}
          </button>
          <button
            type="button"
            disabled={!email || sending !== ''}
            onClick={() => send('message')}
            className="text-xs px-4 py-2 rounded-lg font-medium inline-flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ color: 'var(--adm-accent)', border: '1px solid var(--adm-border)' }}
          >
            <Package size={13} /> {sending === 'message' ? 'Sending…' : 'Send In-site Message'}
          </button>
        </div>
        <p className="text-[10px]" style={{ color: 'var(--adm-text-secondary)' }}>
          Emails are sent through the SMTP account configured in Settings → Email. The in-site message appears in the
          customer&apos;s Messages page when they sign in.
        </p>
      </div>
    </Modal>
  )
}

