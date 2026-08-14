"use client"
import { useState, useEffect, useCallback, useRef } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import {
  Package, Search, ChevronDown, ChevronUp, Truck, MapPin, Users,
  Clock, CheckCircle, XCircle, Send, ExternalLink, Info, X, Download,
  RotateCcw, DollarSign, Shield, PackageCheck, Calendar, Filter, MessageCircle, Star, Navigation, Lock,
  Plus, Minus, ShoppingBag, Trash2
} from "lucide-react"
import { findAvatarMeta } from "@/lib/avatars"
import OptimizedImage from "@/components/ui/OptimizedImage"

type OrderStatus = "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled" | "return_requested" | "return_approved" | "return_shipped" | "return_delivered" | "refunded"

// 订单端可手动操作的状态流转 (shipped/delivered 由物流端自动触发)
const STATUS_FLOW: OrderStatus[] = ["pending", "confirmed", "processing"]
// 完整订单时间轴 (含物流端自动触发的 shipped/delivered, 用于进度条显示)
const ORDER_TIMELINE: OrderStatus[] = ["pending", "confirmed", "processing", "shipped", "delivered"]

const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; bg: string; dot: string }> = {
  pending:    { label: "Pending",    color: "text-amber-600", bg: "bg-amber-100 dark:bg-amber-900/20", dot: "bg-amber-500" },
  confirmed:  { label: "Confirmed",  color: "text-blue-600",  bg: "bg-blue-100 dark:bg-blue-900/20",  dot: "bg-blue-500" },
  processing: { label: "Processing", color: "text-indigo-600",bg: "bg-indigo-100 dark:bg-indigo-900/20",dot: "bg-indigo-500" },
  shipped:    { label: "Shipped",    color: "text-purple-600",bg: "bg-purple-100 dark:bg-purple-900/20",dot: "bg-purple-500" },
  delivered:  { label: "Delivered",  color: "text-emerald-600",bg: "bg-emerald-100 dark:bg-emerald-900/20",dot: "bg-emerald-500" },
  cancelled:  { label: "Cancelled",  color: "text-red-600",   bg: "bg-red-100 dark:bg-red-900/20",   dot: "bg-red-500" },
  return_requested: { label: "Return Requested", color: "text-orange-600", bg: "bg-orange-100 dark:bg-orange-900/20", dot: "bg-orange-500" },
  return_approved:  { label: "Return Approved",  color: "text-cyan-600",   bg: "bg-cyan-100 dark:bg-cyan-900/20",   dot: "bg-cyan-500" },
  return_shipped:   { label: "Return Shipped",   color: "text-violet-600", bg: "bg-violet-100 dark:bg-violet-900/20", dot: "bg-violet-500" },
  return_delivered: { label: "Return Delivered", color: "text-teal-600",   bg: "bg-teal-100 dark:bg-teal-900/20",   dot: "bg-teal-500" },
  refunded:         { label: "Refunded",         color: "text-rose-600",   bg: "bg-rose-100 dark:bg-rose-900/20",   dot: "bg-rose-500" },
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [filter, setFilter] = useState<OrderStatus | "all">("all")
  const [search, setSearch] = useState("")
  const [stats, setStats] = useState<any>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' })
  const [assignedFilter, setAssignedFilter] = useState('all')
  const [paymentFilter, setPaymentFilter] = useState('all')
  const [customerFilter, setCustomerFilter] = useState('')
  const [customerList, setCustomerList] = useState<any[]>([])
  const [customerSearch, setCustomerSearch] = useState('')
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)
  const customerDropdownRef = useRef<HTMLDivElement>(null)
  const customerInputRef = useRef<HTMLInputElement>(null)
  const [showAllCustomerDropdown, setShowAllCustomerDropdown] = useState(false)
  const allCustomerDropdownRef = useRef<HTMLDivElement>(null)
  const allCustomerBtnRef = useRef<HTMLButtonElement>(null)
  const [customerTiers, setCustomerTiers] = useState<any[]>([])
  const [trackingSearch, setTrackingSearch] = useState('')
  const [shipmentNoSearch, setShipmentNoSearch] = useState('')

  // 创建订单模态框
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [allProducts, setAllProducts] = useState<any[]>([])
  const [productSearch, setProductSearch] = useState('')
  const [orderItems, setOrderItems] = useState<any[]>([])
  const [createOrderForm, setCreateOrderForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    country: 'United States',
    paymentMethod: 'other',
    notes: '',
  })
  const [creating, setCreating] = useState(false)

  const fetchOrders = useCallback(async () => {
    try {
      const statsPromise = fetch("/api/orders?stats=true")
      const params = new URLSearchParams({ pageSize: '20', page: String(page) })
      if (filter !== "all") params.set('status', filter)
      if (search.trim()) params.set('search', search.trim())
      if (dateRange.startDate) params.set('startDate', dateRange.startDate)
      if (dateRange.endDate) params.set('endDate', dateRange.endDate)
      if (assignedFilter !== 'all') params.set('assignedTo', assignedFilter)
      if (paymentFilter !== 'all') params.set('paymentMethod', paymentFilter)
      if (customerFilter.trim()) params.set('customerEmail', customerFilter.trim())
      if (trackingSearch.trim()) params.set('trackingNumber', trackingSearch.trim())
      if (shipmentNoSearch.trim()) params.set('shipmentNo', shipmentNoSearch.trim())
      const ordersPromise = fetch(`/api/orders?${params}`)
      const [r, s] = await Promise.all([ordersPromise, statsPromise])
      if (r.ok) {
        const data = await r.json()
        if (data.items) {
          setOrders(data.items)
          setTotalPages(data.pagination.totalPages)
          setTotal(data.pagination.total)
        } else {
          setOrders(data)
          setTotalPages(1)
          setTotal(data.length)
        }
      }
      if (s.ok) setStats(await s.json())
    } finally { setLoading(false) }
  }, [page, filter, search, dateRange.startDate, dateRange.endDate, assignedFilter, paymentFilter, customerFilter, trackingSearch, shipmentNoSearch])

  const [currentUser, setCurrentUser] = useState<any>(null)
  const [staffMembers, setStaffMembers] = useState<any[]>([])
  const [assigning, setAssigning] = useState<string | null>(null)
  const [avatarInfoModal, setAvatarInfoModal] = useState<any>(null)
  const [returnModal, setReturnModal] = useState<any>(null)
  const [returnShippingModal, setReturnShippingModal] = useState<any>(null)
  const [refundModal, setRefundModal] = useState<any>(null)
  const [returnReason, setReturnReason] = useState("")
  // 订单物流信息缓存 (orderId -> shipments[])
  const [orderShipments, setOrderShipments] = useState<Record<string, any[]>>({})
  const [returnCarrier, setReturnCarrier] = useState("")
  const [returnTrackingNumber, setReturnTrackingNumber] = useState("")
  const [refundAmount, setRefundAmount] = useState("")
  const [chatModal, setChatModal] = useState<{ order: any; staff: any } | null>(null)
  const [chatMessage, setChatMessage] = useState("")
  const [chatSending, setChatSending] = useState(false)

  useEffect(() => { fetch('/api/auth/check?_t=' + Date.now()).then(r => r.ok ? r.json() : { user: { name: 'Admin', role: 'super_admin', id: 'main-admin' } }).then(d => setCurrentUser(d.user)).catch(() => setCurrentUser({ name: 'Admin', role: 'super_admin', id: 'main-admin' })) }, [])
  useEffect(() => { fetch('/api/staff').then(r => r.ok ? r.json() : []).then(setStaffMembers).catch(() => {}) }, [])

  // 打开创建订单弹窗时加载商品列表
  useEffect(() => {
    if (!showCreateModal) return
    fetch('/api/products?pageSize=200&page=1').then(r => r.ok ? r.json() : { items: [] }).then(d => {
      const items = d.items || d || []
      setAllProducts(items.filter((p: any) => p.active))
    }).catch(() => {})
  }, [showCreateModal])

  const addOrderItem = (product: any) => {
    setOrderItems(prev => {
      const existing = prev.find((i: any) => i.productId === product.id)
      if (existing) {
        return prev.map((i: any) => i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i)
      }
      return [...prev, {
        productId: product.id,
        name: product.name,
        price: Number(product.price) || 0,
        quantity: 1,
        image: product.image,
        stock: product.stock ?? null,
      }]
    })
  }

  const updateItemQty = (productId: string, qty: number) => {
    if (qty < 1) return
    setOrderItems(prev => prev.map((i: any) => i.productId === productId ? { ...i, quantity: qty } : i))
  }

  const removeOrderItem = (productId: string) => {
    setOrderItems(prev => prev.filter((i: any) => i.productId !== productId))
  }

  const orderSubtotal = orderItems.reduce((sum: number, i: any) => sum + i.price * i.quantity, 0)
  const orderShippingCost = orderItems.length > 0 ? (createOrderForm.country === 'United States' ? (orderSubtotal >= 50 ? 0 : 5.99) : 12.99) : 0
  const orderTotal = orderSubtotal + orderShippingCost

  const handleCreateOrder = async () => {
    if (orderItems.length === 0) { alert('Please add at least one product') ; return }
    if (!createOrderForm.firstName || !createOrderForm.lastName) { alert('Please enter customer name') ; return }
    if (!createOrderForm.email) { alert('Please enter customer email') ; return }
    if (!createOrderForm.address || !createOrderForm.city || !createOrderForm.country) { alert('Please enter shipping address') ; return }

    setCreating(true)
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: orderItems.map((i: any) => ({ productId: i.productId, quantity: i.quantity })),
          shipping: {
            firstName: createOrderForm.firstName,
            lastName: createOrderForm.lastName,
            email: createOrderForm.email,
            phone: createOrderForm.phone,
            address: createOrderForm.address,
            city: createOrderForm.city,
            state: createOrderForm.state,
            zip: createOrderForm.zip,
            country: createOrderForm.country,
          },
          paymentMethod: createOrderForm.paymentMethod,
          notes: createOrderForm.notes,
        }),
      })

      if (res.ok) {
        const order = await res.json()
        setShowCreateModal(false)
        setOrderItems([])
        setCreateOrderForm({
          firstName: '', lastName: '', email: '', phone: '',
          address: '', city: '', state: '', zip: '',
          country: 'United States', paymentMethod: 'other', notes: '',
        })
        fetchOrders()
        setExpanded(order.id)
        setTimeout(() => {
          const el = document.getElementById(`order-${order.id}`)
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }, 200)
      } else {
        const d = await res.json().catch(() => ({}))
        alert(d.error || 'Failed to create order')
      }
    } catch (e) {
      alert('Failed to create order')
    } finally {
      setCreating(false)
    }
  }

  // 获取去重客户列表用于客户筛选下拉，含订单次数和星级评定
  useEffect(() => {
    Promise.all([
      fetch('/api/orders?pageSize=100&page=1').then(r => r.ok ? r.json() : { items: [] }),
      fetch("/api/settings", { credentials: 'include' }).then(r => r.ok ? r.json() : {}),
    ]).then(([orderData, settingsData]) => {
      const tiers = (settingsData as any).customerTiers || []
      setCustomerTiers(tiers)

        const items = orderData.items || orderData || []
        const customerMap = new Map<string, { email: string; name: string; orderCount: number; totalSpent: number }>()
        for (const o of items) {
          const email = (o.customerEmail || o.shipping?.email || o.userEmail || '').toLowerCase().trim()
          if (!email) continue
          const existing = customerMap.get(email)
          if (existing) {
            existing.orderCount++
            existing.totalSpent += o.total || 0
          } else {
            customerMap.set(email, {
              email,
              name: o.customerName || (o.shipping?.firstName + ' ' + (o.shipping?.lastName || '')).trim() || email,
              orderCount: 1,
              totalSpent: o.total || 0,
            })
          }
        }
        const customers = Array.from(customerMap.values()).map(c => {
          const tier = tiers.find((t: any) => c.orderCount >= t.minOrders && c.orderCount <= t.maxOrders) || tiers[0] || { id: 'New', name: 'New', stars: 1 }
          return {
            ...c,
            stars: tier.stars || 1,
            tier: tier.id || 'New',
            tierName: tier.name || tier.id || 'New',
            tierColor: tier.color || '#6b7280',
            tierBgColor: tier.bgColor || '#f3f4f6',
          }
        })
        customers.sort((a, b) => b.orderCount - a.orderCount)
        setCustomerList(customers)
      })
      .catch(() => {})
  }, [])

  useEffect(() => { fetchOrders() }, [fetchOrders])

  // 从 URL 参数自动展开对应订单
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const orderId = params.get('order')
    if (orderId && orders.length > 0) {
      const exists = orders.find(o => o.id === orderId)
      if (exists) {
        setExpanded(orderId)
        setTimeout(() => {
          const el = document.getElementById(`order-${orderId}`)
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }, 100)
      }
    }
  }, [orders])

  // 更新下拉菜单位置 (fixed 定位，避免撑开父容器)
  const updateDropdownPosition = useCallback(() => {
    if (showCustomerDropdown && customerDropdownRef.current && customerInputRef.current) {
      const rect = customerInputRef.current.getBoundingClientRect()
      customerDropdownRef.current.style.top = `${rect.bottom + 4}px`
      customerDropdownRef.current.style.left = `${rect.left}px`
    }
    if (showAllCustomerDropdown && allCustomerDropdownRef.current && allCustomerBtnRef.current) {
      const rect = allCustomerBtnRef.current.getBoundingClientRect()
      allCustomerDropdownRef.current.style.top = `${rect.bottom + 4}px`
      allCustomerDropdownRef.current.style.left = `${rect.left}px`
    }
  }, [showCustomerDropdown, showAllCustomerDropdown])

  useEffect(() => {
    updateDropdownPosition()
    if (!showCustomerDropdown && !showAllCustomerDropdown) return
    window.addEventListener('scroll', updateDropdownPosition, true)
    window.addEventListener('resize', updateDropdownPosition)
    return () => {
      window.removeEventListener('scroll', updateDropdownPosition, true)
      window.removeEventListener('resize', updateDropdownPosition)
    }
  }, [showCustomerDropdown, showAllCustomerDropdown, updateDropdownPosition])

  // 点击外部关闭客户下拉
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(e.target as Node) && customerInputRef.current && !customerInputRef.current.contains(e.target as Node)) {
        setShowCustomerDropdown(false)
      }
      if (allCustomerDropdownRef.current && !allCustomerDropdownRef.current.contains(e.target as Node) && allCustomerBtnRef.current && !allCustomerBtnRef.current.contains(e.target as Node)) {
        setShowAllCustomerDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // 当筛选或搜索变化时重置到第一页
  useEffect(() => { setPage(1) }, [filter, search, dateRange.startDate, dateRange.endDate, assignedFilter, paymentFilter, customerFilter])

    const assignStaff = async (orderId: string, staffId: string | null) => {
    if (!staffId) {
      try {
        const r = await fetch("/api/orders", {
          method: "PUT", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: orderId, assignedTo: null, assignedToName: "", assignedToAvatar: "", operatorName: currentUser?.name || "Admin", operatorRole: currentUser?.role || "super_admin", operatorId: currentUser?.id || "main-admin" }),
        })
        if (!r.ok) {
          const err = await r.json().catch(() => ({}))
          alert("Failed to unassign staff: " + (err.error || r.statusText))
          return
        }
        fetchOrders()
      window.dispatchEvent(new Event('orderAssigned'))
    } catch (e) {
        alert("Network error: " + (e as Error).message)
      } finally {
        setAssigning(null)
      }
      return
    }
    const member = staffMembers.find(s => s.id === staffId)
    if (!member) return
    try {
      const r = await fetch("/api/orders", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: orderId, assignedTo: staffId, assignedToName: member.name, assignedToAvatar: member.avatar || "", operatorName: currentUser?.name || "Admin", operatorRole: currentUser?.role || "super_admin", operatorId: currentUser?.id || "main-admin" }),
      })
      if (!r.ok) {
        const err = await r.json().catch(() => ({}))
        alert("Failed to assign staff: " + (err.error || r.statusText))
        return
      }
      fetchOrders()
      window.dispatchEvent(new Event('orderAssigned'))
    } catch (e) {
      alert("Network error: " + (e as Error).message)
    } finally {
      setAssigning(null)
    }
  }

  const updateStatus = async (id: string, status: OrderStatus) => {
    try {
      const r = await fetch("/api/orders", {
        method: "PUT",
        credentials: 'include',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status, operatorName: currentUser?.name || 'Admin', operatorRole: currentUser?.role || 'super_admin', operatorId: currentUser?.id || 'main-admin' }),
      })
      if (!r.ok) {
        const err = await r.json().catch(() => ({}))
        if (err.errorCode === 'SHIPMENT_ACTIVE') {
          alert("Cannot change order status:\n\nActive shipment exists. Please go to Shipping Management to cancel the shipment first.")
        } else {
          alert("Failed to update status: " + (err.error || r.statusText))
        }
        return
      }
      fetchOrders()
    } catch (e) {
      alert("Network error: " + (e as Error).message)
    }
  }

  // 获取订单的物流发货记录
  const fetchOrderShipments = async (orderId: string) => {
    try {
      const r = await fetch(`/api/shipments?orderId=${orderId}`, {
        credentials: 'include',
      })
      if (r.ok) {
        const data = await r.json()
        setOrderShipments(prev => ({ ...prev, [orderId]: Array.isArray(data) ? data : [] }))
      }
    } catch {}
  }

  // 展开订单时自动获取物流信息, 并对 shipped 状态定时刷新以同步物流端更新
  useEffect(() => {
    if (!expanded) return
    const order = orders.find(o => o.id === expanded)
    if (order) {
      // 所有状态下都获取物流信息 (用于判断是否有活跃发货单)
      fetchOrderShipments(expanded)
      // shipped 状态下每 15 秒刷新一次物流轨迹 (delivered 不需要持续刷新)
      if (order.status === 'shipped') {
        const timer = setInterval(() => fetchOrderShipments(expanded), 15000)
        return () => clearInterval(timer)
      }
    }
  }, [expanded, orders])

  const updateTracking = async (id: string, tracking: any) => {
    try {
      const r = await fetch("/api/orders", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, tracking, operatorName: currentUser?.name || 'Admin', operatorRole: currentUser?.role || 'super_admin', operatorId: currentUser?.id || 'main-admin' }),
      })
      if (!r.ok) {
        const err = await r.json().catch(() => ({}))
        alert("Failed to update tracking: " + (err.error || r.statusText))
        return
      }
      fetchOrders()
    } catch (e) {
      alert("Network error: " + (e as Error).message)
    }
  }

  const openReturnModal = (order: any) => {
    setReturnReason("")
    setReturnModal(order)
  }

  const openReturnShippingModal = (order: any) => {
    setReturnCarrier("")
    setReturnTrackingNumber("")
    setReturnShippingModal(order)
  }

  const openRefundModal = (order: any) => {
    setRefundAmount(String(order.total || 0))
    setRefundModal(order)
  }

  const handleReturnRequest = async () => {
    if (!returnModal || !returnReason.trim()) {
      alert("Please enter a return reason")
      return
    }
    try {
      const r = await fetch("/api/orders/return", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: returnModal.id,
          reason: returnReason.trim(),
        }),
      })
      if (!r.ok) {
        const err = await r.json().catch(() => ({}))
        alert("Failed to request return: " + (err.error || r.statusText))
        return
      }
      setReturnModal(null)
      fetchOrders()
    } catch (e) {
      alert("Network error: " + (e as Error).message)
    }
  }

  const handleReturnAction = async (orderId: string, action: string, notes?: string) => {
    try {
      const r = await fetch("/api/orders/return", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          action,
          notes,
          operatorName: currentUser?.name || 'Admin',
          operatorRole: currentUser?.role || 'super_admin',
          operatorId: currentUser?.id || 'main-admin',
        }),
      })
      if (!r.ok) {
        const err = await r.json().catch(() => ({}))
        alert("Failed to process return: " + (err.error || r.statusText))
        return
      }
      fetchOrders()
    } catch (e) {
      alert("Network error: " + (e as Error).message)
    }
  }

  const handleReturnShipping = async () => {
    if (!returnShippingModal || !returnCarrier.trim() || !returnTrackingNumber.trim()) {
      alert("Please enter carrier and tracking number")
      return
    }
    try {
      const r = await fetch("/api/orders/return", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: returnShippingModal.id,
          action: "shipped",
          trackingNumber: returnTrackingNumber.trim(),
          carrier: returnCarrier.trim(),
        }),
      })
      if (!r.ok) {
        const err = await r.json().catch(() => ({}))
        alert("Failed to mark return shipped: " + (err.error || r.statusText))
        return
      }
      setReturnShippingModal(null)
      fetchOrders()
    } catch (e) {
      alert("Network error: " + (e as Error).message)
    }
  }

  const handleRefund = async () => {
    if (!refundModal) return
    const amount = parseFloat(refundAmount)
    if (isNaN(amount) || amount <= 0) {
      alert("Please enter a valid refund amount")
      return
    }
    try {
      const r = await fetch("/api/orders/return", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: refundModal.id,
          action: "refund",
          refundAmount: amount,
        }),
      })
      if (!r.ok) {
        const err = await r.json().catch(() => ({}))
        alert("Failed to process refund: " + (err.error || r.statusText))
        return
      }
      setRefundModal(null)
      fetchOrders()
    } catch (e) {
      alert("Network error: " + (e as Error).message)
    }
  }

  const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  })

  // 服务端已处理过滤和搜索，直接使用 orders
  const filtered = orders

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" /></div>

  const normalStatuses: OrderStatus[] = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"]
  const returnStatuses: OrderStatus[] = ["return_requested", "return_approved", "return_shipped", "return_delivered", "refunded"]

  const activeTab = returnStatuses.includes(filter as OrderStatus) ? "returns" : "all"
  const setActiveTab = (tab: "all" | "returns") => {
    if (tab === "returns" && !returnStatuses.includes(filter as OrderStatus)) {
      setFilter("return_requested")
    } else if (tab === "all" && returnStatuses.includes(filter as OrderStatus)) {
      setFilter("all")
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--adm-text)" }}>Orders</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--adm-text-secondary)" }}>{total} total orders</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 text-sm rounded-lg transition-colors font-medium inline-flex items-center gap-2"
            style={{
              backgroundColor: "var(--adm-accent)",
              color: "var(--adm-accent-text)",
            }}
          >
            <Plus size={14} /> Create Order
          </button>
          <button
            type="button"
            onClick={() => {
              const params = new URLSearchParams()
              if (filter !== "all") params.set('status', filter)
              if (search.trim()) params.set('search', search.trim())
              if (dateRange.startDate) params.set('startDate', dateRange.startDate)
              if (dateRange.endDate) params.set('endDate', dateRange.endDate)
              if (assignedFilter !== 'all') params.set('assignedTo', assignedFilter)
              if (paymentFilter !== 'all') params.set('paymentMethod', paymentFilter)
              if (customerFilter.trim()) params.set('customerEmail', customerFilter.trim())
              window.location.href = `/api/orders/export?${params.toString()}`
            }}
            className="px-4 py-2 text-sm rounded-lg transition-colors font-medium inline-flex items-center gap-2"
            style={{
              backgroundColor: "var(--adm-card)",
              border: "1px solid var(--adm-border)",
              color: "var(--adm-text)",
            }}
          >
            <Download size={14} /> Export
          </button>
        </div>
      </div>

      {/* Status Overview Bar */}
      {stats && (
        <div className="rounded-xl border mb-5 overflow-hidden" style={{ backgroundColor: "var(--adm-card)", borderColor: "var(--adm-border)" }}>
          <div className="flex border-b" style={{ borderColor: "var(--adm-border)" }}>
            <button
              onClick={() => setActiveTab("all")}
              className="flex-1 px-4 py-2.5 text-sm font-medium transition-colors text-center"
              style={{
                color: activeTab === "all" ? "var(--adm-accent)" : "var(--adm-text-secondary)",
                borderBottom: activeTab === "all" ? "2px solid var(--adm-accent)" : "2px solid transparent",
              }}
            >
              Order Status
            </button>
            <button
              onClick={() => setActiveTab("returns")}
              className="flex-1 px-4 py-2.5 text-sm font-medium transition-colors text-center"
              style={{
                color: activeTab === "returns" ? "var(--adm-accent)" : "var(--adm-text-secondary)",
                borderBottom: activeTab === "returns" ? "2px solid var(--adm-accent)" : "2px solid transparent",
              }}
            >
              Returns & Refunds
            </button>
          </div>

          <div className="p-4">
            {activeTab === "all" ? (
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                {normalStatuses.map(s => {
                  const count = (stats as any)[s] || 0
                  const isActive = filter === s
                  return (
                    <button
                      key={s}
                      onClick={() => setFilter(isActive ? "all" : s)}
                      className="rounded-lg p-3 text-left border transition-all hover:scale-[1.02]"
                      style={{
                        backgroundColor: isActive ? STATUS_CONFIG[s].bg : "var(--adm-input)",
                        borderColor: isActive ? "var(--adm-accent)" : "var(--adm-border)",
                        opacity: isActive ? 1 : 0.85,
                      }}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <div className={"w-2 h-2 rounded-full " + STATUS_CONFIG[s].dot} />
                        <span className="text-xs font-medium" style={{ color: "var(--adm-text-secondary)" }}>
                          {STATUS_CONFIG[s].label}
                        </span>
                      </div>
                      <p className="text-xl font-bold" style={{ color: "var(--adm-text)" }}>{count}</p>
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                {returnStatuses.map(s => {
                  const count = (stats as any)[s] || 0
                  const isActive = filter === s
                  return (
                    <button
                      key={s}
                      onClick={() => setFilter(isActive ? "all" : s)}
                      className="rounded-lg p-3 text-left border transition-all hover:scale-[1.02]"
                      style={{
                        backgroundColor: isActive ? STATUS_CONFIG[s].bg : "var(--adm-input)",
                        borderColor: isActive ? "var(--adm-accent)" : "var(--adm-border)",
                        opacity: isActive ? 1 : 0.85,
                      }}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <div className={"w-2 h-2 rounded-full " + STATUS_CONFIG[s].dot} />
                        <span className="text-xs font-medium" style={{ color: "var(--adm-text-secondary)" }}>
                          {STATUS_CONFIG[s].label.replace('Return ', '')}
                        </span>
                      </div>
                      <p className="text-xl font-bold" style={{ color: "var(--adm-text)" }}>{count}</p>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Search + Quick Filters + Date Range */}
      <div className="flex flex-col gap-3 mb-5">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--adm-text-secondary)" }} />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by order ID, customer name or email..."
              className="w-full pl-10 pr-4 py-2.5 rounded-lg text-sm" style={{ backgroundColor: "var(--adm-input)", border: "1px solid var(--adm-input-border)", color: "var(--adm-text)" }} />
          </div>
          <div className="flex gap-1.5 flex-wrap items-center">
            {(activeTab === "all" ? ["all", ...normalStatuses] : ["all", ...returnStatuses] as const).map(f => {
              const key = f as OrderStatus | "all"
              const isActive = filter === key
              const label = key === "all" ? "All" : STATUS_CONFIG[key]?.label || key
              return (
                <button key={key} onClick={() => setFilter(key)}
                  className={"px-3 py-2 text-xs rounded-lg transition-colors font-medium " + (isActive ? "text-white" : "")}
                  style={{
                    backgroundColor: isActive ? "var(--adm-accent)" : "var(--adm-card)",
                    border: isActive ? "none" : "1px solid var(--adm-border)",
                    color: isActive ? "white" : "var(--adm-text-secondary)",
                  }}>
                  {label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Advanced Filters: Date Range + Customer + Staff + Payment */}
        <div className="p-3 rounded-lg space-y-3" style={{ backgroundColor: "var(--adm-input)", border: "1px solid var(--adm-border)" }}>
          {/* Row 1: Date Range */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 shrink-0">
              <Calendar size={14} style={{ color: "var(--adm-text-secondary)" }} />
              <span className="text-xs font-medium w-8" style={{ color: "var(--adm-text)" }}>Date:</span>
            </div>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={e => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
              className="px-2 py-1 text-xs rounded border"
              style={{ backgroundColor: "var(--adm-card)", border: "1px solid var(--adm-border)", color: "var(--adm-text)" }}
            />
            <span className="text-xs" style={{ color: "var(--adm-text-secondary)" }}>to</span>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={e => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
              className="px-2 py-1 text-xs rounded border"
              style={{ backgroundColor: "var(--adm-card)", border: "1px solid var(--adm-border)", color: "var(--adm-text)" }}
            />
            <div className="flex items-center gap-1">
              {[
                { label: 'Today', days: 0 },
                { label: '7D', days: 7 },
                { label: '30D', days: 30 },
                { label: '90D', days: 90 },
              ].map(q => (
                <button
                  key={q.label}
                  onClick={() => {
                    const end = new Date()
                    const start = new Date(end.getTime() - q.days * 24 * 60 * 60 * 1000)
                    setDateRange({
                      startDate: start.toISOString().split('T')[0],
                      endDate: end.toISOString().split('T')[0],
                    })
                  }}
                  className="px-2 py-1 text-[10px] rounded border transition-colors hover:opacity-80"
                  style={{ borderColor: "var(--adm-border)", color: "var(--adm-text-secondary)" }}
                >
                  {q.label}
                </button>
              ))}
            </div>
          </div>

          {/* Row 2: Customer + Staff + Payment + Tracking + Shipment */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 shrink-0">
              <Users size={14} style={{ color: "var(--adm-text-secondary)" }} />
              <span className="text-xs font-medium w-[52px]" style={{ color: "var(--adm-text)" }}>Customer:</span>
            </div>
            {/* 客户自动补全搜索 */}
            <div className="relative shrink-0">
              <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 z-10" style={{ color: "var(--adm-text-secondary)" }} />
              <input
                ref={customerInputRef}
                type="text"
                value={customerFilter ? (() => {
                  const c = customerList.find(c => c.email === customerFilter)
                  return c ? c.name : customerSearch
                })() : customerSearch}
                onChange={e => {
                  setCustomerSearch(e.target.value)
                  setCustomerFilter('')
                  setShowCustomerDropdown(true)
                }}
                onFocus={() => setShowCustomerDropdown(true)}
                placeholder="Search customer..."
                className="pl-7 pr-7 py-1 text-xs rounded border w-[220px]"
                style={{ backgroundColor: "var(--adm-card)", border: "1px solid var(--adm-border)", color: "var(--adm-text)" }}
              />
              {customerFilter && (
                <button
                  onClick={() => { setCustomerFilter(''); setCustomerSearch('') }}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2"
                  style={{ color: "var(--adm-text-secondary)" }}
                >
                  <X size={12} />
                </button>
              )}
            </div>
            {/* 自动补全下拉 (fixed 定位，避免撑开父容器) */}
            {showCustomerDropdown && customerSearch.trim() && (
              <div
                ref={(el) => {
                  customerDropdownRef.current = el
                  if (el && customerInputRef.current) {
                    const rect = customerInputRef.current.getBoundingClientRect()
                    el.style.top = `${rect.bottom + 4}px`
                    el.style.left = `${rect.left}px`
                  }
                }}
                className="adm-dropdown-menu z-[1000] rounded-lg shadow-lg max-h-64 overflow-y-auto"
                style={{ position: 'fixed', backgroundColor: "var(--adm-card)", border: "1px solid var(--adm-border)", width: '280px' }}
              >
                  {customerList
                    .filter(c => {
                      const q = customerSearch.toLowerCase().trim()
                      return c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)
                    })
                    .slice(0, 20)
                    .map(c => {
                      return (
                        <div
                          key={c.email}
                          onClick={() => {
                            setCustomerFilter(c.email)
                            setCustomerSearch('')
                            setShowCustomerDropdown(false)
                          }}
                          className="adm-dropdown-item px-3 py-2 cursor-pointer flex items-center justify-between gap-2 transition-colors"
                          style={{ borderBottom: '1px solid var(--adm-border)' }}
                        >
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs font-medium truncate" style={{ color: "var(--adm-text)" }}>
                              {c.name}
                            </span>
                            <span className="text-[10px] truncate" style={{ color: "var(--adm-text-secondary)" }}>
                              {c.email}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <div className="flex items-center gap-0.5" style={{ color: c.tierColor || '#6b7280' }}>
                              {[...Array(5)].map((_, j) => (
                                <Star key={j} size={10} fill={j < c.stars ? 'currentColor' : 'none'} strokeWidth={2} />
                              ))}
                            </div>
                            <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: c.tierBgColor || '#f3f4f6', color: c.tierColor || '#6b7280' }}>
                              {c.tierName || c.tier}
                            </span>
                            <span className="text-[10px]" style={{ color: "var(--adm-text-secondary)" }}>
                              {c.orderCount} orders
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  {customerList.filter(c => {
                    const q = customerSearch.toLowerCase().trim()
                    return c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)
                  }).length === 0 && (
                    <div className="px-3 py-2 text-xs" style={{ color: "var(--adm-text-secondary)" }}>
                      No customers found
                    </div>
                  )}
                </div>
              )}

            {/* 客户全量自定义下拉框（带彩色星级） */}
            <div className="shrink-0 relative">
              <button
                ref={allCustomerBtnRef}
                onClick={() => setShowAllCustomerDropdown(!showAllCustomerDropdown)}
                className="px-2 py-1 text-xs rounded border w-[280px] flex items-center justify-between gap-1"
                style={{ backgroundColor: "var(--adm-card)", border: "1px solid var(--adm-border)", color: "var(--adm-text)" }}
              >
                <span className="truncate">
                  {customerFilter ? (() => {
                    const c = customerList.find(c => c.email === customerFilter)
                    return c ? `${c.name} (${c.orderCount} orders)` : 'All Customers'
                  })() : `All Customers (${customerList.length})`}
                </span>
                <ChevronDown size={12} className="shrink-0" style={{ color: "var(--adm-text-secondary)" }} />
              </button>
            </div>
            {/* 全量客户下拉菜单 (fixed 定位，避免撑开父容器) */}
            {showAllCustomerDropdown && (
              <div
                ref={(el) => {
                  allCustomerDropdownRef.current = el
                  if (el && allCustomerBtnRef.current) {
                    const rect = allCustomerBtnRef.current.getBoundingClientRect()
                    el.style.top = `${rect.bottom + 4}px`
                    el.style.left = `${rect.left}px`
                  }
                }}
                className="adm-dropdown-menu z-[1000] rounded-lg shadow-lg max-h-72 overflow-y-auto"
                style={{ position: 'fixed', backgroundColor: "var(--adm-card)", border: "1px solid var(--adm-border)", width: '280px' }}
              >
                  <div
                    onClick={() => { setCustomerFilter(''); setCustomerSearch(''); setShowAllCustomerDropdown(false) }}
                    className="adm-dropdown-item px-3 py-2 cursor-pointer text-xs font-medium transition-colors"
                    style={{ borderBottom: '1px solid var(--adm-border)', color: !customerFilter ? "var(--adm-accent)" : "var(--adm-text)" }}
                  >
                    All Customers ({customerList.length})
                  </div>
                  {customerList.map(c => {
                    const isSelected = customerFilter === c.email
                    return (
                      <div
                        key={c.email}
                        onClick={() => { setCustomerFilter(c.email); setCustomerSearch(''); setShowAllCustomerDropdown(false) }}
                        className="adm-dropdown-item px-3 py-2 cursor-pointer flex items-center justify-between gap-2 transition-colors"
                        style={{ borderBottom: '1px solid var(--adm-border)', backgroundColor: isSelected ? 'var(--adm-input)' : 'transparent' }}
                      >
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-medium truncate" style={{ color: isSelected ? "var(--adm-accent)" : "var(--adm-text)" }}>
                            {c.name}
                          </span>
                          <span className="text-[10px] truncate" style={{ color: "var(--adm-text-secondary)" }}>
                            {c.email}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <div className="flex items-center gap-0.5" style={{ color: c.tierColor || '#6b7280' }}>
                              {[...Array(5)].map((_, j) => (
                                <Star key={j} size={10} fill={j < c.stars ? 'currentColor' : 'none'} strokeWidth={2} />
                              ))}
                            </div>
                            <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: c.tierBgColor || '#f3f4f6', color: c.tierColor || '#6b7280' }}>
                              {c.tierName || c.tier}
                            </span>
                            <span className="text-[10px]" style={{ color: "var(--adm-text-secondary)" }}>
                              {c.orderCount} orders
                            </span>
                          </div>
                      </div>
                    )
                  })}
                </div>
              )}

            <div className="w-px h-5" style={{ backgroundColor: "var(--adm-border)" }} />

            <div className="flex items-center gap-1.5 shrink-0">
              <Shield size={14} style={{ color: "var(--adm-text-secondary)" }} />
              <span className="text-xs font-medium w-[32px]" style={{ color: "var(--adm-text)" }}>Staff:</span>
            </div>
            <select
              value={assignedFilter}
              onChange={e => setAssignedFilter(e.target.value)}
              className="px-2 py-1 text-xs rounded border"
              style={{ backgroundColor: "var(--adm-card)", border: "1px solid var(--adm-border)", color: "var(--adm-text)" }}
            >
              <option value="all">All Staff</option>
              <option value="unassigned">Unassigned</option>
              {staffMembers.filter(s => s.active !== false).map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.role})</option>
              ))}
            </select>

            <div className="w-px h-5" style={{ backgroundColor: "var(--adm-border)" }} />

            <div className="flex items-center gap-1.5 shrink-0">
              <DollarSign size={14} style={{ color: "var(--adm-text-secondary)" }} />
              <span className="text-xs font-medium w-[46px]" style={{ color: "var(--adm-text)" }}>Payment:</span>
            </div>
            <select
              value={paymentFilter}
              onChange={e => setPaymentFilter(e.target.value)}
              className="px-2 py-1 text-xs rounded border"
              style={{ backgroundColor: "var(--adm-card)", border: "1px solid var(--adm-border)", color: "var(--adm-text)" }}
            >
              <option value="all">All Methods</option>
              <option value="paypal">PayPal</option>
              <option value="other">Non-PayPal</option>
            </select>

            <div className="w-px h-5" style={{ backgroundColor: "var(--adm-border)" }} />

            <div className="flex items-center gap-1.5 shrink-0">
              <Truck size={14} style={{ color: "var(--adm-text-secondary)" }} />
              <span className="text-xs font-medium w-[48px]" style={{ color: "var(--adm-text)" }}>Tracking:</span>
            </div>
            <div className="relative">
              <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 z-10" style={{ color: "var(--adm-text-secondary)" }} />
              <input
                type="text"
                placeholder="Search tracking..."
                value={trackingSearch}
                onChange={e => setTrackingSearch(e.target.value)}
                className="pl-7 pr-2 py-1 text-xs rounded border w-[140px]"
                style={{ backgroundColor: "var(--adm-card)", border: "1px solid var(--adm-border)", color: "var(--adm-text)" }}
              />
            </div>

            <div className="w-px h-5" style={{ backgroundColor: "var(--adm-border)" }} />

            <div className="flex items-center gap-1.5 shrink-0">
              <Package size={14} style={{ color: "var(--adm-text-secondary)" }} />
              <span className="text-xs font-medium w-[52px]" style={{ color: "var(--adm-text)" }}>Shipment:</span>
            </div>
            <div className="relative">
              <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 z-10" style={{ color: "var(--adm-text-secondary)" }} />
              <input
                type="text"
                placeholder="Search shipment no..."
                value={shipmentNoSearch}
                onChange={e => setShipmentNoSearch(e.target.value)}
                className="pl-7 pr-2 py-1 text-xs rounded border w-[140px]"
                style={{ backgroundColor: "var(--adm-card)", border: "1px solid var(--adm-border)", color: "var(--adm-text)" }}
              />
            </div>

            {(dateRange.startDate || dateRange.endDate || assignedFilter !== 'all' || paymentFilter !== 'all' || customerFilter || customerSearch || trackingSearch || shipmentNoSearch) && (
              <button
                onClick={() => {
                  setDateRange({ startDate: '', endDate: '' })
                  setAssignedFilter('all')
                  setPaymentFilter('all')
                  setCustomerFilter('')
                  setCustomerSearch('')
                  setTrackingSearch('')
                  setShipmentNoSearch('')
                }}
                className="px-2 py-1 text-[10px] rounded border transition-colors hover:opacity-80"
                style={{ borderColor: "var(--adm-border)", color: "var(--adm-text-secondary)" }}
              >
                Clear All
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Order List */}
      {filtered.length === 0 ? (
        <div className="text-center py-20" style={{ color: "var(--adm-text-secondary)" }}>
          <Package size={40} className="mx-auto mb-4 opacity-30" />
          <p className="text-lg">No orders found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(order => {
            const sConfig = STATUS_CONFIG[order.status as OrderStatus] || STATUS_CONFIG.pending
            const statusIdx = ORDER_TIMELINE.indexOf(order.status as OrderStatus)
            const timelineIdx = statusIdx === -1 ? 0 : statusIdx
            const history = order.statusHistory || []
            const tracking = order.tracking
            const isNewOrder = order.status === "pending" && !order.assignedTo

            return (
              <div key={order.id} id={`order-${order.id}`} className="rounded-xl border overflow-hidden transition-all hover:shadow-md" style={{ backgroundColor: "var(--adm-card)", borderColor: isNewOrder ? "var(--adm-accent)" : "var(--adm-border)" }}>
                {/* Order header — clickable */}
                <div
                  onClick={() => setExpanded(expanded === order.id ? null : order.id)}
                  className="px-4 py-3.5 flex items-center justify-between cursor-pointer transition-all adm-hover-bg"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* 客户头像 */}
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold overflow-hidden shrink-0"
                      style={{ backgroundColor: 'var(--adm-accent-bg)', color: 'var(--adm-accent)' }}>
                      {order.avatar ? (
                        <img src={order.avatar} alt="" className="w-full h-full object-cover" onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none'
                          ;(e.target as HTMLImageElement).parentElement!.innerHTML = (order.customerName || 'G').charAt(0).toUpperCase()
                        }} />
                      ) : (
                        (order.customerName || 'G').charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="w-1 h-10 rounded-full flex items-center justify-center shrink-0">
                      <div className={"w-2.5 h-2.5 rounded-full " + sConfig.dot} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-sm font-bold" style={{ color: "var(--adm-text)" }}>{order.id}</span>
                        {isNewOrder && (
                          <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: "var(--adm-accent)" }}>
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> NEW
                          </span>
                        )}
                        <span className={"text-[10px] font-medium px-2 py-0.5 rounded-full " + sConfig.bg + " " + sConfig.color}>
                          {sConfig.label}
                        </span>
                        {order.paypalTransaction && (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/20 text-blue-600">
                            PayPal
                          </span>
                        )}
                        {order.returnInfo && (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900/20 text-orange-600">
                            Return
                          </span>
                        )}
                        {/* 物流单号显示 */}
                        {(order as any)._shipmentSummary && (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
                            <Truck size={10} />
                            {(order as any)._shipmentSummary.trackingNumber}
                          </span>
                        )}
                      </div>
                      <p className="text-xs mt-0.5 truncate" style={{ color: "var(--adm-text-secondary)" }}>
                        {(() => {
                          const email = (order.customerEmail || order.shipping?.email || order.userEmail || '').toLowerCase().trim()
                          const cust = customerList.find(c => c.email === email)
                          if (cust && cust.stars >= 1) {
                            return (
                              <>
                                <span className="inline-flex items-center gap-0.5 align-middle" style={{ color: cust.tierColor || '#6b7280', marginRight: '4px' }} title={`${cust.tierName || cust.tier} customer - ${cust.orderCount} orders`}>
                                  {[...Array(cust.stars)].map((_, j) => (
                                    <Star key={j} size={10} fill="currentColor" strokeWidth={2} />
                                  ))}
                                </span>
                              </>
                            )
                          }
                          return null
                        })()}
                        {order.customerName || order.shipping?.firstName + " " + (order.shipping?.lastName || "") || "Guest"}
                        {" · "}{order.items?.length || 0} items
                        {" · "}{fmtDate(order.createdAt)}
                        {order.assignedToName ? " · " + order.assignedToName : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-2">
                    <span className="font-serif font-bold text-base" style={{ color: "var(--adm-text)" }}>
                      ${(order.total || 0).toFixed(2)}
                    </span>
                    {expanded === order.id ? <ChevronUp size={18} style={{ color: "var(--adm-text-secondary)" }} /> : <ChevronDown size={18} style={{ color: "var(--adm-text-secondary)" }} />}
                  </div>
                </div>

                {/* Expanded detail */}
                <AnimatePresence>
                  {expanded === order.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t overflow-hidden" style={{ borderColor: "var(--adm-border)" }}
                    >
                      <div className="p-4 md:p-6 space-y-6">
                        {/* Status Flow Timeline — 完整 5 步进度条 (含物流端自动触发的 shipped/delivered) */}
                        <div>
                          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: "var(--adm-text)" }}>
                            <Clock size={14} /> Order Timeline
                          </h4>
                          <div className="flex items-center gap-0">
                            {(() => {
                              // 获取发货单信息用于判断物流进度
                              const shipments = orderShipments[order.id] || []
                              const activeShipment = shipments.find((s: any) =>
                                !['cancelled', 'delivered', 'returned'].includes(s.status)
                              )
                              const shipmentStatus = activeShipment?.status || null
                              const hasActiveShipment = !!activeShipment

                              return ORDER_TIMELINE.map((s, i) => {
                                const done = i <= timelineIdx
                                const isCurrent = i === timelineIdx
                                const cancelled = order.status === "cancelled"
                                const isShippingStep = s === "shipped" || s === "delivered"
                                const cfg = STATUS_CONFIG[s]

                                // 物流端状态同步: 如果有活跃发货单, shipped 步骤视为已完成
                                const shippedDoneByShipment = s === "shipped" && hasActiveShipment
                                const effectiveDone = done || shippedDoneByShipment
                                const effectiveIsCurrent = isCurrent && !shippedDoneByShipment

                                // delivered 判断: 如果发货单状态是 delivered, 则 delivered 步骤视为已完成
                                const deliveredDoneByShipment = s === "delivered" && shipmentStatus === "delivered"
                                const finalDone = effectiveDone || deliveredDoneByShipment

                                return (
                                  <div key={s} className="flex-1 relative">
                                    <div className="flex items-center">
                                      <div className={"flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold z-10 " +
                                        (cancelled && i === timelineIdx ? "bg-red-500 text-white" :
                                         finalDone ? "text-white" : "")}
                                        style={{
                                          backgroundColor: cancelled && i === timelineIdx ? "#ef4444"
                                            : finalDone ? "var(--adm-accent)"
                                            : effectiveIsCurrent ? "var(--adm-accent-bg)"
                                            : "var(--adm-border)",
                                          color: finalDone ? "white" : "var(--adm-text-secondary)",
                                          border: effectiveIsCurrent && !finalDone ? "1px solid var(--adm-accent)" : "none",
                                        }}>
                                        {cancelled && i === timelineIdx ? <XCircle size={14} />
                                         : finalDone ? <CheckCircle size={14} />
                                         : isShippingStep ? <Truck size={13} />
                                         : i + 1}
                                      </div>
                                      {i < ORDER_TIMELINE.length - 1 && (
                                        <div className="flex-1 h-0.5" style={{ backgroundColor: i < timelineIdx || (i === 3 && hasActiveShipment) ? "var(--adm-accent)" : "var(--adm-border)" }} />
                                      )}
                                    </div>
                                    <p className={"text-[9px] mt-1 font-medium " + (finalDone ? "" : "")}
                                      style={{ color: finalDone ? "var(--adm-text)" : "var(--adm-text-secondary)" }}>
                                      {cfg.label}
                                    </p>
                                    {/* 物流端触发步骤的提示 */}
                                    {isShippingStep && !finalDone && (
                                      <p className="text-[8px] mt-0.5" style={{ color: "var(--adm-text-secondary)" }}>
                                        {s === "shipped" ? "Awaiting shipment" : "After delivery"}
                                      </p>
                                    )}
                                    {/* 物流端已完成的提示 */}
                                    {s === "shipped" && shippedDoneByShipment && (
                                      <p className="text-[8px] mt-0.5" style={{ color: "var(--adm-accent)" }}>
                                        {activeShipment?.carrierName || 'Shipping'}
                                      </p>
                                    )}
                                  </div>
                                )
                              })
                            })()}
                          </div>

                          {/* 物流端自动流转提示 (当处于 processing 但有发货单时) */}
                          {order.status === "processing" && (() => {
                            const shipments = orderShipments[order.id] || []
                            const activeShipment = shipments.find((s: any) =>
                              !['cancelled', 'delivered', 'returned'].includes(s.status)
                            )
                            if (activeShipment) {
                              const latestEvent = activeShipment.events?.slice(-1)[0]
                              return (
                                <div className="mt-3 px-3 py-2 rounded-lg flex items-center gap-2 text-[11px]"
                                  style={{ backgroundColor: "rgba(59,130,246,0.08)", color: "#3b82f6" }}>
                                  <Navigation size={12} />
                                  <span>
                                    {latestEvent
                                      ? `${activeShipment.carrierName} · ${latestEvent.description}${latestEvent.location ? " · " + latestEvent.location : ""}`
                                      : `${activeShipment.carrierName} · Shipment created`}
                                  </span>
                                </div>
                              )
                            }
                            return (
                              <div className="mt-3 px-3 py-2 rounded-lg flex items-center gap-2 text-[11px]"
                                style={{ backgroundColor: "var(--adm-accent-bg)", color: "var(--adm-accent)" }}>
                                <Truck size={12} />
                                <span>Shipped status will be set automatically when a shipment is created in the Shipping page</span>
                              </div>
                            )
                          })()}

                          {/* 物流实时进度提示 (当处于 shipped 时) */}
                          {order.status === "shipped" && (() => {
                            const shp = orderShipments[order.id] || []
                            const latest = shp[0]
                            const latestEvent = latest?.events?.slice(-1)[0]
                            return (
                              <div className="mt-3 px-3 py-2 rounded-lg flex items-center gap-2 text-[11px]"
                                style={{ backgroundColor: "rgba(59,130,246,0.08)", color: "#3b82f6" }}>
                                <Navigation size={12} />
                                <span>
                                  {latestEvent
                                    ? `In transit · ${latestEvent.description}${latestEvent.location ? " · " + latestEvent.location : ""}`
                                    : "Shipment created · awaiting tracking updates"}
                                </span>
                              </div>
                            )
                          })()}

                          {/* 已签收提示 (当处于 delivered 时) */}
                          {order.status === "delivered" && (
                            <div className="mt-3 px-3 py-2 rounded-lg flex items-center gap-2 text-[11px]"
                              style={{ backgroundColor: "rgba(34,197,94,0.08)", color: "#22c55e" }}>
                              <CheckCircle size={12} />
                              <span>Package delivered · order completed</span>
                            </div>
                          )}

                          {/* Status History Details (合并物流事件) */}
                          {(() => {
                            const shipments = orderShipments[order.id] || []
                            const activeShipment = shipments.find((s: any) =>
                              !['cancelled', 'delivered', 'returned'].includes(s.status)
                            )
                            const shipmentEvents = activeShipment?.events || []

                            // 合并订单状态历史和物流事件, 按时间排序
                            const allEvents = [
                              ...history.map((h: any) => ({
                                ...h,
                                type: 'order',
                                timestamp: h.timestamp,
                              })),
                              ...shipmentEvents.map((e: any) => ({
                                ...e,
                                type: 'shipment',
                                status: e.status || 'picked_up',
                                label: e.description || 'Shipment event',
                              })),
                            ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

                            if (allEvents.length === 0) return null

                            return (
                              <div className="mt-4 space-y-2">
                                {allEvents.map((evt: any, i: number) => {
                                  const isShipment = evt.type === 'shipment'
                                  const ecfg = isShipment
                                    ? ((STATUS_CONFIG as Record<string, any>)[evt.status] || STATUS_CONFIG.pending)
                                    : (STATUS_CONFIG[evt.status as OrderStatus] || STATUS_CONFIG.pending)

                                  return (
                                    <div key={i} className="flex items-start gap-3 text-xs">
                                      <div className={"w-2 h-2 rounded-full mt-1.5 shrink-0 " +
                                        (isShipment ? "bg-blue-500" : ecfg.dot)} />
                                      <div>
                                        <div className="flex items-center gap-2">
                                          <p className="font-medium" style={{ color: "var(--adm-text)" }}>
                                            {isShipment ? (
                                              <span className="flex items-center gap-1">
                                                <Truck size={10} style={{ color: '#3b82f6' }} />
                                                {evt.label}
                                              </span>
                                            ) : (
                                              <span>{ecfg.label}{evt.note ? " · " + evt.note : ""}</span>
                                            )}
                                          </p>
                                          {isShipment && activeShipment && (
                                            <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ backgroundColor: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}>
                                              {activeShipment.carrierName}
                                            </span>
                                          )}
                                        </div>
                                        <p style={{ color: "var(--adm-text-secondary)" }}>
                                          {fmtDate(evt.timestamp)}
                                          {evt.location && isShipment && ` · ${evt.location}`}
                                        </p>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            )
                          })()}
                        </div>

                        {/* Status Actions */}
                        <div>
                          <h4 className="text-sm font-semibold mb-2" style={{ color: "var(--adm-text)" }}>Update Status</h4>

                          {/* 发货锁定提示: 只要有活跃发货单就锁定 */}
                          {(() => {
                            const shipments = orderShipments[order.id] || []
                            const activeShipment = shipments.find((s: any) =>
                              !['cancelled', 'delivered', 'returned'].includes(s.status)
                            )
                            if (!activeShipment) return null
                            return (
                              <div className="mb-3 p-3 rounded-lg border text-xs flex items-start gap-2"
                                style={{
                                  backgroundColor: 'rgba(251, 191, 36, 0.08)',
                                  borderColor: 'rgba(251, 191, 36, 0.3)',
                                  color: 'var(--adm-text-secondary)',
                                }}>
                                <Lock size={14} style={{ color: '#f59e0b', marginTop: 1, flexShrink: 0 }} />
                                <div>
                                  <p className="font-medium mb-0.5" style={{ color: '#f59e0b' }}>Order locked by active shipment</p>
                                  <p>
                                    Order is in shipping flow (shipment <span className="font-mono">{activeShipment.shipmentNo || activeShipment.id.slice(0,12)}</span> · {activeShipment.carrierName} · {activeShipment.trackingNumber}).
                                    All status changes are blocked. To revert, cancel the shipment in{' '}
                                    <a href="/admin/shipping" className="underline" style={{ color: 'var(--adm-accent)' }}>Shipping Management</a>{' '}
                                    first.
                                  </p>
                                </div>
                              </div>
                            )
                          })()}

                          <div className="flex flex-wrap gap-1.5">
                            {(() => {
                              // 统一计算锁定状态
                              const shipments = orderShipments[order.id] || []
                              const activeShipment = shipments.find((s: any) =>
                                !['cancelled', 'delivered', 'returned'].includes(s.status)
                              )
                              const hasActiveShipment = !!activeShipment

                              return STATUS_FLOW.map(s => {
                                // 有活跃发货单时, 禁止所有状态变更按钮
                                const disabled = order.status === "cancelled" || order.status === "delivered" || hasActiveShipment
                                const active = order.status === s
                                return (
                                  <button key={s} onClick={() => updateStatus(order.id, s)}
                                    disabled={disabled}
                                    title={hasActiveShipment ? "Cannot change status: active shipment exists" : ""}
                                    className={"px-3 py-1.5 text-xs rounded-lg transition-colors font-medium " +
                                      (active ? "text-white" : "hover:opacity-80") + (disabled ? " opacity-40 cursor-not-allowed" : " cursor-pointer")}
                                    style={{
                                      backgroundColor: active ? "var(--adm-accent)" : "var(--adm-input)",
                                      border: active ? "none" : "1px solid var(--adm-input-border)",
                                      color: active ? "white" : "var(--adm-text-secondary)",
                                    }}>
                                    {STATUS_CONFIG[s].label}
                                  </button>
                                )
                              })
                            })()}
                            {order.status !== "cancelled" && !["return_requested", "return_approved", "return_shipped", "return_delivered", "refunded"].includes(order.status) && (() => {
                              const shipments = orderShipments[order.id] || []
                              const activeShipment = shipments.find((s: any) =>
                                !['cancelled', 'delivered', 'returned'].includes(s.status)
                              )
                              const disabled = !!activeShipment
                              return (
                                <button onClick={() => {
                                  if (disabled) {
                                    alert("Cannot cancel order: active shipment exists. Cancel the shipment first in Shipping Management.")
                                    return
                                  }
                                  updateStatus(order.id, "cancelled")
                                }}
                                  disabled={disabled}
                                  title={disabled ? "Cannot cancel: active shipment exists" : ""}
                                  className={"px-3 py-1.5 text-xs rounded-lg border transition-colors font-medium " +
                                    (disabled ? "opacity-40 cursor-not-allowed" : "hover:bg-red-500/20 cursor-pointer")}
                                  style={{
                                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                    color: '#ef4444',
                                    borderColor: 'rgba(239, 68, 68, 0.3)',
                                  }}>
                                  Cancel Order
                                </button>
                              )
                            })()}
                            {["delivered", "shipped"].includes(order.status) && (
                              <button onClick={() => openReturnModal(order)}
                                className="px-3 py-1.5 text-xs rounded-lg bg-orange-500/10 text-orange-500 border border-orange-500/30 hover:bg-orange-500/20 transition-colors font-medium inline-flex items-center gap-1">
                                <RotateCcw size={12} /> Request Return
                              </button>
                            )}
                            {order.status === "return_requested" && (
                              <>
                                <button onClick={() => handleReturnAction(order.id, "approve")}
                                  className="px-3 py-1.5 text-xs rounded-lg bg-cyan-500/10 text-cyan-500 border border-cyan-500/30 hover:bg-cyan-500/20 transition-colors font-medium inline-flex items-center gap-1">
                                  <CheckCircle size={12} /> Approve
                                </button>
                                <button onClick={() => handleReturnAction(order.id, "reject")}
                                  className="px-3 py-1.5 text-xs rounded-lg bg-red-500/10 text-red-500 border border-red-500/30 hover:bg-red-500/20 transition-colors font-medium inline-flex items-center gap-1">
                                  <XCircle size={12} /> Reject
                                </button>
                              </>
                            )}
                            {order.status === "return_approved" && (
                              <button onClick={() => openReturnShippingModal(order)}
                                className="px-3 py-1.5 text-xs rounded-lg bg-violet-500/10 text-violet-500 border border-violet-500/30 hover:bg-violet-500/20 transition-colors font-medium inline-flex items-center gap-1">
                                <Truck size={12} /> Mark Return Shipped
                              </button>
                            )}
                            {order.status === "return_shipped" && (
                              <button onClick={() => handleReturnAction(order.id, "delivered")}
                                className="px-3 py-1.5 text-xs rounded-lg bg-teal-500/10 text-teal-500 border border-teal-500/30 hover:bg-teal-500/20 transition-colors font-medium inline-flex items-center gap-1">
                                <PackageCheck size={12} /> Mark Return Delivered
                              </button>
                            )}
                            {order.status === "return_delivered" && (
                              <button onClick={() => openRefundModal(order)}
                                className="px-3 py-1.5 text-xs rounded-lg bg-rose-500/10 text-rose-500 border border-rose-500/30 hover:bg-rose-500/20 transition-colors font-medium inline-flex items-center gap-1">
                                <DollarSign size={12} /> Process Refund
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Tracking / Logistics — 物流信息由物流端管理 */}
                        <div>
                          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2" style={{ color: "var(--adm-text)" }}>
                            <Truck size={14} /> Logistics & Tracking
                          </h4>

                          {(() => {
                            // 只要已有发货单就显示物流信息, 不管订单状态
                            const shipments = orderShipments[order.id] || []
                            const hasShipments = shipments.length > 0

                            if (!hasShipments) {
                              // 没有发货单时, 根据状态显示提示
                              if (order.status === "processing") {
                                return (
                                  <div className="rounded-lg p-3 flex items-center justify-between gap-2" style={{ backgroundColor: "var(--adm-accent-bg)", border: "1px solid var(--adm-accent)" }}>
                                    <div className="flex items-center gap-2">
                                      <Truck size={14} style={{ color: "var(--adm-accent)" }} />
                                      <span className="text-xs font-medium" style={{ color: "var(--adm-accent)" }}>
                                        Ready for shipping — create shipment in Shipping page
                                      </span>
                                    </div>
                                    <Link href="/admin/shipping" className="text-xs px-2.5 py-1 rounded-md text-white shrink-0" style={{ backgroundColor: "var(--adm-accent)" }}>
                                      Go to Shipping
                                    </Link>
                                  </div>
                                )
                              }
                              if (["pending", "confirmed"].includes(order.status)) {
                                return (
                                  <p className="text-xs" style={{ color: "var(--adm-text-secondary)" }}>
                                    Shipping will be available after order is processed
                                  </p>
                                )
                              }
                              return (
                                <div className="rounded-lg p-3 text-center" style={{ backgroundColor: "var(--adm-input)" }}>
                                  <p className="text-xs" style={{ color: "var(--adm-text-secondary)" }}>No shipping info</p>
                                </div>
                              )
                            }

                            // 有发货单: 显示物流轨迹
                            return (
                              <div className="space-y-3">
                                {shipments.map((shp: any, si: number) => {
                                  const events: any[] = shp.events || []
                                  return (
                                    <div key={shp.id || si} className="rounded-lg p-3 space-y-2" style={{ backgroundColor: "var(--adm-input)" }}>
                                      {/* 物流商 + 追踪号 */}
                                      <div className="flex items-center justify-between gap-2">
                                        <div className="min-w-0">
                                          <span className="text-xs font-medium" style={{ color: "var(--adm-text)" }}>
                                            {shp.carrierName || shp.carrierCode}
                                          </span>
                                          <span className="font-mono text-xs ml-2" style={{ color: "var(--adm-text-secondary)" }}>
                                            {shp.trackingNumber}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-1.5 shrink-0">
                                          {shp.status && (
                                            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ backgroundColor: "var(--adm-accent-bg)", color: "var(--adm-accent)" }}>
                                              {shp.status.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}
                                            </span>
                                          )}
                                          {shp.trackingNumber && shp.carrierCode && (
                                            <a
                                              href={(() => {
                                                const url = shp.carrierCode === '4px' ? `https://www.4px.com/track?query=${shp.trackingNumber}`
                                                  : shp.carrierCode === 'yunexpress' ? `https://www.yunexpress.com/Tracking?trackingNumber=${shp.trackingNumber}`
                                                  : shp.carrierCode === 'dhl' ? `https://www.dhl.com/en/express/tracking.html?AWB=${shp.trackingNumber}`
                                                  : shp.carrierCode === 'fedex' ? `https://www.fedex.com/fedextrack/?trknbr=${shp.trackingNumber}`
                                                  : shp.carrierCode === 'ups' ? `https://www.ups.com/track?tracknum=${shp.trackingNumber}`
                                                  : shp.carrierCode === 'usps' ? `https://tools.usps.com/go/TrackConfirmAction?tLabels=${shp.trackingNumber}`
                                                  : ''
                                                return url
                                              })()}
                                              target="_blank" rel="noopener noreferrer"
                                              className="text-xs flex items-center gap-1 hover:underline"
                                              style={{ color: "var(--adm-accent)" }}
                                            >
                                              Track <ExternalLink size={10} />
                                            </a>
                                          )}
                                        </div>
                                      </div>
                                      {shp.estimatedDelivery && (
                                        <p className="text-xs" style={{ color: "var(--adm-text-secondary)" }}>
                                          Estimated delivery: {new Date(shp.estimatedDelivery).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                        </p>
                                      )}
                                      {shp.deliveredAt && (
                                        <p className="text-xs text-emerald-500">Delivered: {new Date(shp.deliveredAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                                      )}
                                      {/* 物流轨迹时间轴 */}
                                      {events.length > 0 && (
                                        <div className="relative pt-1">
                                          {[...events].reverse().map((evt: any, i: number) => (
                                            <div key={evt.id || i} className="flex gap-2 pb-2 relative">
                                              <div className="flex flex-col items-center shrink-0">
                                                <div className="w-2 h-2 rounded-full mt-1" style={{ backgroundColor: i === 0 ? "var(--adm-accent)" : "var(--adm-border)" }} />
                                                {i < events.length - 1 && <div className="w-px flex-1" style={{ backgroundColor: "var(--adm-border)" }} />}
                                              </div>
                                              <div className="flex-1 min-w-0 pb-1">
                                                <p className={"text-xs " + (i === 0 ? "font-medium" : "")} style={{ color: i === 0 ? "var(--adm-text)" : "var(--adm-text-secondary)" }}>
                                                  {evt.description}
                                                </p>
                                                {evt.location && (
                                                  <p className="text-[10px] flex items-center gap-0.5" style={{ color: "var(--adm-text-secondary)" }}>
                                                    <MapPin size={9} /> {evt.location}
                                                  </p>
                                                )}
                                                <p className="text-[10px]" style={{ color: "var(--adm-text-secondary)" }}>
                                                  {new Date(evt.timestamp).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                                                </p>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  )
                                })}
                              </div>
                            )
                          })()}
                        </div>

                        {/* Return Info */}
                        {order.returnInfo && (
                          <div>
                            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2" style={{ color: "var(--adm-text)" }}>
                              <RotateCcw size={14} /> Return Information
                            </h4>
                            <div className="rounded-lg p-3 space-y-2" style={{ backgroundColor: "var(--adm-input)" }}>
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-medium" style={{ color: "var(--adm-text-secondary)" }}>Reason:</span>
                                <span className="text-xs" style={{ color: "var(--adm-text)" }}>{order.returnInfo.reason}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-medium" style={{ color: "var(--adm-text-secondary)" }}>Requested:</span>
                                <span className="text-xs" style={{ color: "var(--adm-text)" }}>{fmtDate(order.returnInfo.requestedAt)}</span>
                              </div>
                              {order.returnInfo.approvedAt && (
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-medium" style={{ color: "var(--adm-text-secondary)" }}>Approved:</span>
                                  <span className="text-xs" style={{ color: "var(--adm-text)" }}>{fmtDate(order.returnInfo.approvedAt)}</span>
                                </div>
                              )}
                              {order.returnInfo.shippedAt && order.returnInfo.trackingNumber && (
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-medium" style={{ color: "var(--adm-text-secondary)" }}>Return Tracking:</span>
                                  <span className="text-xs" style={{ color: "var(--adm-text)" }}>{order.returnInfo.carrier}: {order.returnInfo.trackingNumber}</span>
                                </div>
                              )}
                              {order.returnInfo.deliveredAt && (
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-medium" style={{ color: "var(--adm-text-secondary)" }}>Return Delivered:</span>
                                  <span className="text-xs text-teal-500">{fmtDate(order.returnInfo.deliveredAt)}</span>
                                </div>
                              )}
                              {order.returnInfo.refundedAt && order.returnInfo.refundAmount !== undefined && (
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-medium" style={{ color: "var(--adm-text-secondary)" }}>Refund Amount:</span>
                                  <span className="text-xs font-bold text-rose-500">${order.returnInfo.refundAmount.toFixed(2)}</span>
                                </div>
                              )}
                              {order.returnInfo.notes && (
                                <div>
                                  <span className="text-xs font-medium" style={{ color: "var(--adm-text-secondary)" }}>Notes:</span>
                                  <p data-admin-lang-ignore className="text-xs mt-1" style={{ color: "var(--adm-text)" }}>{order.returnInfo.notes}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* PayPal Transaction */}
                        {order.paypalTransaction && (
                          <div>
                            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2" style={{ color: "var(--adm-text)" }}>
                              <DollarSign size={14} /> PayPal Transaction
                            </h4>
                            <div className="rounded-lg p-3 space-y-2" style={{ backgroundColor: "var(--adm-input)" }}>
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-medium" style={{ color: "var(--adm-text-secondary)" }}>Status:</span>
                                <span className="text-xs font-medium" style={{ color: order.paypalTransaction.status === "COMPLETED" ? "rgb(5, 150, 105)" : "rgb(245, 158, 11)" }}>
                                  {order.paypalTransaction.status}
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-medium" style={{ color: "var(--adm-text-secondary)" }}>Gross Amount:</span>
                                <span className="text-xs" style={{ color: "var(--adm-text)" }}>${order.paypalTransaction.amount.toFixed(2)}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-medium" style={{ color: "var(--adm-text-secondary)" }}>PayPal Fee:</span>
                                <span className="text-xs text-amber-500">-${order.paypalTransaction.fee.toFixed(2)}</span>
                              </div>
                              <div className="flex items-center justify-between pt-1" style={{ borderTop: "1px solid var(--adm-border)" }}>
                                <span className="text-xs font-bold" style={{ color: "var(--adm-text)" }}>Net Amount:</span>
                                <span className="text-xs font-bold" style={{ color: "rgb(5, 150, 105)" }}>${order.paypalTransaction.netAmount.toFixed(2)}</span>
                              </div>
                              {order.paypalTransaction.transactionId && (
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-medium" style={{ color: "var(--adm-text-secondary)" }}>Transaction ID:</span>
                                  <span className="text-xs font-mono" style={{ color: "var(--adm-text)" }}>{order.paypalTransaction.transactionId.slice(0, 12)}...</span>
                                </div>
                              )}
                              {order.paypalTransaction.settlementStatus && (
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-medium" style={{ color: "var(--adm-text-secondary)" }}>Settlement:</span>
                                  <span className="text-xs" style={{ color: order.paypalTransaction.settlementStatus === "settled" ? "rgb(5, 150, 105)" : "rgb(245, 158, 11)" }}>
                                    {order.paypalTransaction.settlementStatus === "settled" ? "Settled" : "Pending"}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {(order.referralCode || order.referredByStaffName || order._referralConversion) && (
                          <div>
                            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2" style={{ color: "var(--adm-text)" }}>
                              <ShoppingBag size={14} /> Marketing Attribution
                            </h4>
                            <div className="rounded-lg p-3 space-y-2" style={{ backgroundColor: "var(--adm-input)" }}>
                              {order.referralCode && (
                                <div className="flex items-center justify-between gap-3">
                                  <span className="text-xs font-medium" style={{ color: "var(--adm-text-secondary)" }}>Referral Code:</span>
                                  <span className="text-xs font-mono" style={{ color: "var(--adm-text)" }}>{order.referralCode}</span>
                                </div>
                              )}
                              {order.referredByStaffName && (
                                <div className="flex items-center justify-between gap-3">
                                  <span className="text-xs font-medium" style={{ color: "var(--adm-text-secondary)" }}>Attributed Staff:</span>
                                  <span className="text-xs" style={{ color: "var(--adm-text)" }}>
                                    {order.referredByStaffName}{order.referredByStaffId ? ` (${order.referredByStaffId})` : ""}
                                  </span>
                                </div>
                              )}
                              {order.attributionModel && (
                                <div className="flex items-center justify-between gap-3">
                                  <span className="text-xs font-medium" style={{ color: "var(--adm-text-secondary)" }}>Attribution Model:</span>
                                  <span className="text-xs" style={{ color: "var(--adm-text)" }}>
                                    {order.attributionModel === "first_click" ? "First Click" : "Last Click"}
                                  </span>
                                </div>
                              )}
                              {order.attributionMatchedBy && (
                                <div className="flex items-center justify-between gap-3">
                                  <span className="text-xs font-medium" style={{ color: "var(--adm-text-secondary)" }}>Matched By:</span>
                                  <span className="text-xs" style={{ color: "var(--adm-text)" }}>
                                    {order.attributionMatchedBy === "visitor" ? "Same visitor" : "Referral fallback"}
                                    {order.attributionFallbackUsed ? " · fallback used" : ""}
                                  </span>
                                </div>
                              )}
                              {order.attributionTouchpoints ? (
                                <div className="flex items-center justify-between gap-3">
                                  <span className="text-xs font-medium" style={{ color: "var(--adm-text-secondary)" }}>Eligible Touchpoints:</span>
                                  <span className="text-xs" style={{ color: "var(--adm-text)" }}>
                                    {order.attributionTouchpoints} within {order.attributionLookbackDays || 7}d
                                  </span>
                                </div>
                              ) : null}
                              <div className="flex items-center justify-between gap-3">
                                <span className="text-xs font-medium" style={{ color: "var(--adm-text-secondary)" }}>Conversion Status:</span>
                                <span
                                  className="text-xs font-medium"
                                  style={{ color: order._referralConversion?.converted ? "rgb(5, 150, 105)" : "rgb(245, 158, 11)" }}
                                >
                                  {order._referralConversion?.converted ? "Attributed" : "Awaiting attribution"}
                                </span>
                              </div>
                              <p className="text-[11px]" style={{ color: "var(--adm-text-secondary)" }}>
                                已支付订单会优先按 visitor + referral code 自动回写 conversion，后台手动确认时也会补一次兜底归因。
                              </p>
                            </div>
                          </div>
                        )}


                          {/* Staff Assignment */}
                          <div>
                            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2" style={{ color: "var(--adm-text)" }}>
                              <Users size={14} /> Staff Assignment
                            </h4>
                            {order.assignedToName ? (
                              <div className="rounded-lg p-3" style={{ backgroundColor: "var(--adm-input)" }}>
                                <div className="flex items-center gap-2">
                                  <div
                                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold overflow-hidden cursor-pointer hover:ring-2 hover:ring-offset-1 transition-all"
                                    style={{ backgroundColor: "var(--adm-accent)", color: "white" }}
                                    onClick={() => {
                                      const staff = staffMembers.find(s => s.id === order.assignedTo)
                                      const avatar = order.assignedToAvatar || staff?.avatar
                                      const meta = findAvatarMeta(avatar || '')
                                      if (meta) {
                                        setAvatarInfoModal(meta)
                                      }
                                    }}
                                  >
                                    {(() => {
                                      const staff = staffMembers.find(s => s.id === order.assignedTo)
                                      const avatar = order.assignedToAvatar || staff?.avatar
                                      const meta = findAvatarMeta(avatar || '')
                                      if (avatar) {
                                        return <img src={avatar} alt="" className="w-full h-full object-cover" />
                                      }
                                      return order.assignedToName.charAt(0).toUpperCase()
                                    })()}
                                  </div>
                                  <div className="flex-1">
                                    <p className="text-sm font-medium" style={{ color: "var(--adm-text)" }}>{order.assignedToName}</p>
                                    <p className="text-[11px]" style={{ color: "var(--adm-text-secondary)" }}>ID: {order.assignedTo}</p>
                                  </div>
                                  {(() => {
                                    const staff = staffMembers.find(s => s.id === order.assignedTo)
                                    const avatar = order.assignedToAvatar || staff?.avatar
                                    const meta = findAvatarMeta(avatar || '')
                                    if (meta) {
                                      return (
                                        <button
                                          onClick={() => setAvatarInfoModal(meta)}
                                          className="p-1 rounded-lg transition-colors hover:opacity-80"
                                          style={{ color: "var(--adm-text-secondary)" }}
                                          title="View avatar source info"
                                        >
                                          <Info size={14} />
                                        </button>
                                      )
                                    }
                                    return null
                                  })()}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const staff = staffMembers.find(s => s.id === order.assignedTo)
                                      setChatModal({
                                        order,
                                        staff: staff || {
                                          id: order.assignedTo,
                                          name: order.assignedToName,
                                          avatar: order.assignedToAvatar,
                                        }
                                      })
                                      setChatMessage(`Hi, could you look into order #${order.orderNumber || order.id}?`)
                                    }}
                                    className="text-xs px-2 py-1 rounded-lg transition-colors flex items-center gap-1 adm-hover-bg"
                                    style={{ color: "var(--adm-accent)", border: "1px solid var(--adm-accent)" }}
                                    title="Send message to staff about this order"
                                  >
                                    <MessageCircle size={12} />
                                    Message
                                  </button>
                                  <button onClick={() => { assignStaff(order.id, null); fetchOrders() }}
                                    className="text-xs px-2 py-1 rounded-lg transition-colors" style={{ color: "var(--adm-text-secondary)", border: "1px solid var(--adm-border)" }}>
                                    Unassign
                                  </button>
                                </div>
                                {(() => {
                                  const staff = staffMembers.find(s => s.id === order.assignedTo)
                                  const avatar = order.assignedToAvatar || staff?.avatar
                                  const meta = findAvatarMeta(avatar || '')
                                  if (meta && (meta.era || meta.role)) {
                                    return (
                                      <p className="text-[10px] mt-2" style={{ color: "var(--adm-text-secondary)" }}>
                                        Avatar: {meta.name} · {meta.era} {meta.role} · Click avatar for details
                                      </p>
                                    )
                                  }
                                  return null
                                })()}
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <select onChange={e => e.target.value && assignStaff(order.id, e.target.value)}
                                  className="flex-1 px-3 py-2 text-xs rounded-lg" style={{ backgroundColor: "var(--adm-input)", border: "1px solid var(--adm-input-border)", color: "var(--adm-text)" }}>
                                  <option value="">Assign to staff...</option>
                                  {staffMembers.filter(s => s.active !== false).map(s => (
                                    <option key={s.id} value={s.id}>{s.name} ({s.role})</option>
                                  ))}
                                </select>
                              </div>
                            )}
                          </div>
                        {/* Order Info Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Shipping */}
                          <div>
                            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2" style={{ color: "var(--adm-text)" }}>
                              <MapPin size={14} /> Shipping Address
                            </h4>
                            <div className="text-xs space-y-0.5" style={{ color: "var(--adm-text-secondary)" }}>
                              <p className="font-medium" style={{ color: "var(--adm-text)" }}>
                                {order.shipping?.firstName || ""} {order.shipping?.lastName || ""}
                              </p>
                              <p>{order.shipping?.email}</p>
                              <p>{order.shipping?.address}</p>
                              <p>{[order.shipping?.city, order.shipping?.state].filter(Boolean).join(", ")} {order.shipping?.zipCode || order.shipping?.zip || ""}</p>
                              <p>{order.shipping?.country}</p>
                            </div>
                          </div>

                          {/* Items */}
                          <div>
                            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2" style={{ color: "var(--adm-text)" }}>
                              <Package size={14} /> Items ({order.items?.length || 0})
                            </h4>
                            <div className="space-y-2">
                              {(order.items || []).map((item: any) => (
                                <div key={item.id} className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded shrink-0 overflow-hidden relative" style={{ backgroundColor: "var(--adm-input)" }}>
                                    <OptimizedImage src={item.image} alt={item.nameEn || item.name || ''} fill sizes="32px" objectFit="cover" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      {item.productCode && (
                                        <span className="text-[9px] font-mono px-1 py-0.5 rounded-sm shrink-0" style={{ backgroundColor: "var(--adm-accent-bg)", color: "var(--adm-accent)" }} title="Product Code">{item.productCode}</span>
                                      )}
                                      <p className="text-xs truncate font-medium" style={{ color: "var(--adm-text)" }}>{item.nameEn || item.name}</p>
                                    </div>
                                    <p className="text-[10px]" style={{ color: "var(--adm-text-secondary)" }}>x{item.quantity}</p>
                                  </div>
                                  <p className="text-xs font-medium" style={{ color: "var(--adm-text)" }}>${((item.price || 0) * (item.quantity || 1)).toFixed(2)}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Payment Summary */}
                        <div className="border-t pt-4 flex justify-end" style={{ borderColor: "var(--adm-border)" }}>
                          <div className="space-y-1 text-sm w-48">
                            <div className="flex justify-between" style={{ color: "var(--adm-text-secondary)" }}>
                              <span>Subtotal</span><span>${(order.subtotal || 0).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between" style={{ color: "var(--adm-text-secondary)" }}>
                              <span>Shipping</span><span>{order.shippingCost === 0 ? "Free" : "$" + (order.shippingCost || 0).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between font-bold border-t pt-1" style={{ borderColor: "var(--adm-border)", color: "var(--adm-text)" }}>
                              <span>Total</span><span>${(order.total || 0).toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            type="button"
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 text-sm rounded-lg border disabled:opacity-40"
            style={{ borderColor: 'var(--adm-border)', color: 'var(--adm-text)', backgroundColor: 'var(--adm-card)' }}
          >
            Prev
          </button>
          {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
            let p: number
            if (totalPages <= 7) {
              p = i + 1
            } else if (page <= 4) {
              p = i + 1
            } else if (page >= totalPages - 3) {
              p = totalPages - 6 + i
            } else {
              p = page - 3 + i
            }
            return (
              <button
                key={p}
                type="button"
                onClick={() => setPage(p)}
                className="w-8 h-8 text-sm rounded-lg border transition-colors"
                style={{
                  borderColor: p === page ? 'var(--adm-accent)' : 'var(--adm-border)',
                  backgroundColor: p === page ? 'var(--adm-accent)' : 'var(--adm-card)',
                  color: p === page ? 'white' : 'var(--adm-text)',
                }}
              >
                {p}
              </button>
            )
          })}
          <button
            type="button"
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="px-3 py-1.5 text-sm rounded-lg border disabled:opacity-40"
            style={{ borderColor: 'var(--adm-border)', color: 'var(--adm-text)', backgroundColor: 'var(--adm-card)' }}
          >
            Next
          </button>
        </div>
      )}

      {/* Create Order Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-4xl max-h-[90vh] rounded-2xl overflow-hidden shadow-2xl flex flex-col"
              style={{ backgroundColor: 'var(--adm-card)', border: '1px solid var(--adm-border)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-5 border-b flex items-center justify-between shrink-0" style={{ borderColor: 'var(--adm-border)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--adm-accent-bg)' }}>
                    <ShoppingBag size={20} style={{ color: 'var(--adm-accent)' }} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold" style={{ color: 'var(--adm-text)' }}>Create New Order</h3>
                    <p className="text-xs" style={{ color: 'var(--adm-text-secondary)' }}>Manually create an order for a customer</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-2 rounded-lg transition-colors hover:opacity-80"
                  style={{ color: 'var(--adm-text-secondary)' }}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-6">
                <div>
                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--adm-text)' }}>
                    <Users size={14} style={{ color: 'var(--adm-accent)' }} />
                    Customer Information
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--adm-text-secondary)' }}>First Name *</label>
                      <input
                        type="text"
                        value={createOrderForm.firstName}
                        onChange={e => setCreateOrderForm(prev => ({ ...prev, firstName: e.target.value }))}
                        placeholder="John"
                        className="w-full px-3 py-2 text-sm rounded-lg"
                        style={{ backgroundColor: 'var(--adm-input)', border: '1px solid var(--adm-input-border)', color: 'var(--adm-text)' }}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--adm-text-secondary)' }}>Last Name *</label>
                      <input
                        type="text"
                        value={createOrderForm.lastName}
                        onChange={e => setCreateOrderForm(prev => ({ ...prev, lastName: e.target.value }))}
                        placeholder="Doe"
                        className="w-full px-3 py-2 text-sm rounded-lg"
                        style={{ backgroundColor: 'var(--adm-input)', border: '1px solid var(--adm-input-border)', color: 'var(--adm-text)' }}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--adm-text-secondary)' }}>Email *</label>
                      <input
                        type="email"
                        value={createOrderForm.email}
                        onChange={e => setCreateOrderForm(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="john@example.com"
                        className="w-full px-3 py-2 text-sm rounded-lg"
                        style={{ backgroundColor: 'var(--adm-input)', border: '1px solid var(--adm-input-border)', color: 'var(--adm-text)' }}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--adm-text-secondary)' }}>Phone</label>
                      <input
                        type="tel"
                        value={createOrderForm.phone}
                        onChange={e => setCreateOrderForm(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="+1 234 567 8900"
                        className="w-full px-3 py-2 text-sm rounded-lg"
                        style={{ backgroundColor: 'var(--adm-input)', border: '1px solid var(--adm-input-border)', color: 'var(--adm-text)' }}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--adm-text)' }}>
                    <MapPin size={14} style={{ color: 'var(--adm-accent)' }} />
                    Shipping Address
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--adm-text-secondary)' }}>Street Address *</label>
                      <input
                        type="text"
                        value={createOrderForm.address}
                        onChange={e => setCreateOrderForm(prev => ({ ...prev, address: e.target.value }))}
                        placeholder="123 Main St"
                        className="w-full px-3 py-2 text-sm rounded-lg"
                        style={{ backgroundColor: 'var(--adm-input)', border: '1px solid var(--adm-input-border)', color: 'var(--adm-text)' }}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--adm-text-secondary)' }}>City *</label>
                      <input
                        type="text"
                        value={createOrderForm.city}
                        onChange={e => setCreateOrderForm(prev => ({ ...prev, city: e.target.value }))}
                        placeholder="New York"
                        className="w-full px-3 py-2 text-sm rounded-lg"
                        style={{ backgroundColor: 'var(--adm-input)', border: '1px solid var(--adm-input-border)', color: 'var(--adm-text)' }}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--adm-text-secondary)' }}>State / Province</label>
                      <input
                        type="text"
                        value={createOrderForm.state}
                        onChange={e => setCreateOrderForm(prev => ({ ...prev, state: e.target.value }))}
                        placeholder="NY"
                        className="w-full px-3 py-2 text-sm rounded-lg"
                        style={{ backgroundColor: 'var(--adm-input)', border: '1px solid var(--adm-input-border)', color: 'var(--adm-text)' }}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--adm-text-secondary)' }}>ZIP / Postal Code</label>
                      <input
                        type="text"
                        value={createOrderForm.zip}
                        onChange={e => setCreateOrderForm(prev => ({ ...prev, zip: e.target.value }))}
                        placeholder="10001"
                        className="w-full px-3 py-2 text-sm rounded-lg"
                        style={{ backgroundColor: 'var(--adm-input)', border: '1px solid var(--adm-input-border)', color: 'var(--adm-text)' }}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--adm-text-secondary)' }}>Country *</label>
                      <select
                        value={createOrderForm.country}
                        onChange={e => setCreateOrderForm(prev => ({ ...prev, country: e.target.value }))}
                        className="w-full px-3 py-2 text-sm rounded-lg"
                        style={{ backgroundColor: 'var(--adm-input)', border: '1px solid var(--adm-input-border)', color: 'var(--adm-text)' }}
                      >
                        <option value="United States">United States</option>
                        <option value="Canada">Canada</option>
                        <option value="United Kingdom">United Kingdom</option>
                        <option value="Australia">Australia</option>
                        <option value="Germany">Germany</option>
                        <option value="France">France</option>
                        <option value="Japan">Japan</option>
                        <option value="China">China</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--adm-text)' }}>
                    <Package size={14} style={{ color: 'var(--adm-accent)' }} />
                    Products
                  </h4>
                  <div className="mb-3">
                    <div className="relative">
                      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--adm-text-secondary)' }} />
                      <input
                        type="text"
                        value={productSearch}
                        onChange={e => setProductSearch(e.target.value)}
                        placeholder="Search products..."
                        className="w-full pl-10 pr-4 py-2.5 text-sm rounded-lg"
                        style={{ backgroundColor: 'var(--adm-input)', border: '1px solid var(--adm-input-border)', color: 'var(--adm-text)' }}
                      />
                    </div>
                    {productSearch.trim() && (
                      <div className="mt-2 rounded-lg border max-h-48 overflow-y-auto" style={{ backgroundColor: 'var(--adm-card)', borderColor: 'var(--adm-border)' }}>
                        {allProducts
                          .filter((p: any) => p.name.toLowerCase().includes(productSearch.toLowerCase()))
                          .slice(0, 10)
                          .map((product: any) => (
                            <div
                              key={product.id}
                              onClick={() => { addOrderItem(product); setProductSearch('') }}
                              className="flex items-center gap-3 p-3 cursor-pointer transition-colors adm-hover-bg"
                              style={{ borderBottom: '1px solid var(--adm-border)' }}
                            >
                              {product.image && (
                                <img src={product.image} alt="" className="w-10 h-10 rounded object-cover shrink-0" />
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate" style={{ color: 'var(--adm-text)' }}>{product.name}</p>
                                <p className="text-xs" style={{ color: 'var(--adm-text-secondary)' }}>
                                  ${Number(product.price).toFixed(2)}
                                  {product.stock !== null && product.stock !== undefined && ` · Stock: ${product.stock}`}
                                </p>
                              </div>
                              <Plus size={16} style={{ color: 'var(--adm-accent)' }} />
                            </div>
                          ))}
                        {allProducts.filter((p: any) => p.name.toLowerCase().includes(productSearch.toLowerCase())).length === 0 && (
                          <div className="p-4 text-center text-sm" style={{ color: 'var(--adm-text-secondary)' }}>
                            No products found
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {orderItems.length === 0 ? (
                    <div className="rounded-lg border-2 border-dashed p-8 text-center" style={{ borderColor: 'var(--adm-border)' }}>
                      <Package size={32} className="mx-auto mb-3 opacity-30" style={{ color: 'var(--adm-text-secondary)' }} />
                      <p className="text-sm" style={{ color: 'var(--adm-text-secondary)' }}>No products added yet</p>
                      <p className="text-xs mt-1" style={{ color: 'var(--adm-text-secondary)' }}>Search and add products above</p>
                    </div>
                  ) : (
                    <div className="rounded-lg border overflow-hidden" style={{ borderColor: 'var(--adm-border)' }}>
                      <div className="grid grid-cols-12 gap-2 p-3 text-xs font-medium" style={{ backgroundColor: 'var(--adm-input)', color: 'var(--adm-text-secondary)' }}>
                        <div className="col-span-6">Product</div>
                        <div className="col-span-2 text-center">Price</div>
                        <div className="col-span-2 text-center">Qty</div>
                        <div className="col-span-1 text-center">Subtotal</div>
                        <div className="col-span-1"></div>
                      </div>
                      {orderItems.map((item: any) => (
                        <div key={item.productId} className="grid grid-cols-12 gap-2 p-3 items-center" style={{ borderTop: '1px solid var(--adm-border)' }}>
                          <div className="col-span-6 flex items-center gap-2 min-w-0">
                            {item.image && <img src={item.image} alt="" className="w-8 h-8 rounded object-cover shrink-0" />}
                            <span className="text-sm truncate" style={{ color: 'var(--adm-text)' }}>{item.name}</span>
                          </div>
                          <div className="col-span-2 text-center text-sm" style={{ color: 'var(--adm-text)' }}>${item.price.toFixed(2)}</div>
                          <div className="col-span-2 flex items-center justify-center gap-1">
                            <button
                              onClick={() => updateItemQty(item.productId, item.quantity - 1)}
                              className="w-7 h-7 rounded flex items-center justify-center transition-colors adm-hover-bg"
                              style={{ border: '1px solid var(--adm-border)', color: 'var(--adm-text-secondary)' }}
                            >
                              <Minus size={12} />
                            </button>
                            <input
                              type="number"
                              min="1"
                              max="99"
                              value={item.quantity}
                              onChange={e => updateItemQty(item.productId, Math.max(1, Math.min(99, parseInt(e.target.value) || 1)))}
                              className="w-10 h-7 text-center text-sm rounded"
                              style={{ backgroundColor: 'var(--adm-input)', border: '1px solid var(--adm-input-border)', color: 'var(--adm-text)' }}
                            />
                            <button
                              onClick={() => updateItemQty(item.productId, item.quantity + 1)}
                              className="w-7 h-7 rounded flex items-center justify-center transition-colors adm-hover-bg"
                              style={{ border: '1px solid var(--adm-border)', color: 'var(--adm-text-secondary)' }}
                            >
                              <Plus size={12} />
                            </button>
                          </div>
                          <div className="col-span-1 text-center text-sm font-medium" style={{ color: 'var(--adm-text)' }}>
                            ${(item.price * item.quantity).toFixed(2)}
                          </div>
                          <div className="col-span-1 flex justify-center">
                            <button
                              onClick={() => removeOrderItem(item.productId)}
                              className="p-1.5 rounded transition-colors hover:bg-red-100 dark:hover:bg-red-900/20"
                              style={{ color: '#ef4444' }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--adm-text)' }}>
                    <DollarSign size={14} style={{ color: 'var(--adm-accent)' }} />
                    Order Summary
                  </h4>
                  <div className="rounded-lg p-4 space-y-2" style={{ backgroundColor: 'var(--adm-input)' }}>
                    <div className="flex justify-between text-sm">
                      <span style={{ color: 'var(--adm-text-secondary)' }}>Subtotal</span>
                      <span style={{ color: 'var(--adm-text)' }}>${orderSubtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span style={{ color: 'var(--adm-text-secondary)' }}>Shipping</span>
                      <span style={{ color: 'var(--adm-text)' }}>
                        {orderShippingCost === 0 && orderItems.length > 0 ? 'Free' : `$${orderShippingCost.toFixed(2)}`}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm pt-2 border-t" style={{ borderColor: 'var(--adm-border)' }}>
                      <span className="font-semibold" style={{ color: 'var(--adm-text)' }}>Total</span>
                      <span className="font-bold text-lg" style={{ color: 'var(--adm-accent)' }}>${orderTotal.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--adm-text)' }}>
                    <Shield size={14} style={{ color: 'var(--adm-accent)' }} />
                    Payment & Notes
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--adm-text-secondary)' }}>Payment Method</label>
                      <select
                        value={createOrderForm.paymentMethod}
                        onChange={e => setCreateOrderForm(prev => ({ ...prev, paymentMethod: e.target.value }))}
                        className="w-full px-3 py-2 text-sm rounded-lg"
                        style={{ backgroundColor: 'var(--adm-input)', border: '1px solid var(--adm-input-border)', color: 'var(--adm-text)' }}
                      >
                        <option value="other">Other / Manual</option>
                        <option value="paypal">PayPal</option>
                        <option value="bank_transfer">Bank Transfer</option>
                        <option value="cash">Cash on Delivery</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--adm-text-secondary)' }}>Order Notes (Optional)</label>
                      <textarea
                        value={createOrderForm.notes}
                        onChange={e => setCreateOrderForm(prev => ({ ...prev, notes: e.target.value }))}
                        rows={2}
                        placeholder="Special instructions, customer preferences..."
                        className="w-full px-3 py-2 text-sm rounded-lg resize-none"
                        style={{ backgroundColor: 'var(--adm-input)', border: '1px solid var(--adm-input-border)', color: 'var(--adm-text)' }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-5 border-t flex gap-3 shrink-0" style={{ borderColor: 'var(--adm-border)' }}>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2.5 text-sm rounded-lg border transition-colors font-medium"
                  style={{ borderColor: 'var(--adm-border)', color: 'var(--adm-text-secondary)' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateOrder}
                  disabled={creating || orderItems.length === 0}
                  className="flex-1 px-4 py-2.5 text-sm rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{ backgroundColor: 'var(--adm-accent)', color: 'var(--adm-accent-text)' }}
                >
                  {creating ? (
                    <>Creating...</>
                  ) : (
                    <><Plus size={16} /> Create Order</>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Return Request Modal */}
      <AnimatePresence>
        {returnModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
            onClick={() => setReturnModal(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-md rounded-2xl overflow-hidden shadow-2xl"
              style={{ backgroundColor: 'var(--adm-card)', border: '1px solid var(--adm-border)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-5 border-b flex items-center justify-between" style={{ borderColor: 'var(--adm-border)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(249,115,22,0.1)' }}>
                    <RotateCcw size={20} style={{ color: '#f97316' }} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold" style={{ color: 'var(--adm-text)' }}>Request Return</h3>
                    <p className="text-xs" style={{ color: 'var(--adm-text-secondary)' }}>Order: {returnModal.id}</p>
                  </div>
                </div>
                <button
                  onClick={() => setReturnModal(null)}
                  className="p-2 rounded-lg transition-colors hover:opacity-80"
                  style={{ color: 'var(--adm-text-secondary)' }}
                >
                  <X size={18} />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--adm-text)' }}>Return Reason</label>
                  <select
                    value={returnReason}
                    onChange={e => setReturnReason(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg"
                    style={{ backgroundColor: 'var(--adm-input)', border: '1px solid var(--adm-input-border)', color: 'var(--adm-text)' }}
                  >
                    <option value="">Select a reason...</option>
                    <option value="Defective product">Defective product</option>
                    <option value="Wrong item received">Wrong item received</option>
                    <option value="Not as described">Not as described</option>
                    <option value="Changed mind">Changed mind</option>
                    <option value="Damaged in shipping">Damaged in shipping</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="rounded-lg p-3 text-xs space-y-1" style={{ backgroundColor: 'var(--adm-input)' }}>
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--adm-text-secondary)' }}>Order Total:</span>
                    <span className="font-semibold" style={{ color: 'var(--adm-text)' }}>${(returnModal.total || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--adm-text-secondary)' }}>Items:</span>
                    <span style={{ color: 'var(--adm-text)' }}>{returnModal.items?.length || 0} items</span>
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setReturnModal(null)}
                    className="flex-1 px-4 py-2 text-sm rounded-lg border transition-colors"
                    style={{ borderColor: 'var(--adm-border)', color: 'var(--adm-text-secondary)' }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleReturnRequest}
                    disabled={!returnReason.trim()}
                    className="flex-1 px-4 py-2 text-sm rounded-lg text-white transition-colors disabled:opacity-50"
                    style={{ backgroundColor: '#f97316' }}
                  >
                    Submit Return
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Return Shipping Modal */}
      <AnimatePresence>
        {returnShippingModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
            onClick={() => setReturnShippingModal(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-md rounded-2xl overflow-hidden shadow-2xl"
              style={{ backgroundColor: 'var(--adm-card)', border: '1px solid var(--adm-border)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-5 border-b flex items-center justify-between" style={{ borderColor: 'var(--adm-border)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(139,92,246,0.1)' }}>
                    <Truck size={20} style={{ color: '#8b5cf6' }} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold" style={{ color: 'var(--adm-text)' }}>Mark Return Shipped</h3>
                    <p className="text-xs" style={{ color: 'var(--adm-text-secondary)' }}>Order: {returnShippingModal.id}</p>
                  </div>
                </div>
                <button
                  onClick={() => setReturnShippingModal(null)}
                  className="p-2 rounded-lg transition-colors hover:opacity-80"
                  style={{ color: 'var(--adm-text-secondary)' }}
                >
                  <X size={18} />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--adm-text)' }}>Carrier</label>
                  <select
                    value={returnCarrier}
                    onChange={e => setReturnCarrier(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg"
                    style={{ backgroundColor: 'var(--adm-input)', border: '1px solid var(--adm-input-border)', color: 'var(--adm-text)' }}
                  >
                    <option value="">Select carrier...</option>
                    <option value="DHL">DHL</option>
                    <option value="FedEx">FedEx</option>
                    <option value="UPS">UPS</option>
                    <option value="USPS">USPS</option>
                    <option value="EMS">EMS</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--adm-text)' }}>Tracking Number</label>
                  <input
                    type="text"
                    value={returnTrackingNumber}
                    onChange={e => setReturnTrackingNumber(e.target.value)}
                    placeholder="Enter tracking number..."
                    className="w-full px-3 py-2 text-sm rounded-lg"
                    style={{ backgroundColor: 'var(--adm-input)', border: '1px solid var(--adm-input-border)', color: 'var(--adm-text)' }}
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setReturnShippingModal(null)}
                    className="flex-1 px-4 py-2 text-sm rounded-lg border transition-colors"
                    style={{ borderColor: 'var(--adm-border)', color: 'var(--adm-text-secondary)' }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleReturnShipping}
                    disabled={!returnCarrier.trim() || !returnTrackingNumber.trim()}
                    className="flex-1 px-4 py-2 text-sm rounded-lg text-white transition-colors disabled:opacity-50"
                    style={{ backgroundColor: '#8b5cf6' }}
                  >
                    Confirm Shipped
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Refund Modal */}
      <AnimatePresence>
        {refundModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
            onClick={() => setRefundModal(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-md rounded-2xl overflow-hidden shadow-2xl"
              style={{ backgroundColor: 'var(--adm-card)', border: '1px solid var(--adm-border)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-5 border-b flex items-center justify-between" style={{ borderColor: 'var(--adm-border)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(244,63,94,0.1)' }}>
                    <DollarSign size={20} style={{ color: '#f43f5e' }} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold" style={{ color: 'var(--adm-text)' }}>Process Refund</h3>
                    <p className="text-xs" style={{ color: 'var(--adm-text-secondary)' }}>Order: {refundModal.id}</p>
                  </div>
                </div>
                <button
                  onClick={() => setRefundModal(null)}
                  className="p-2 rounded-lg transition-colors hover:opacity-80"
                  style={{ color: 'var(--adm-text-secondary)' }}
                >
                  <X size={18} />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--adm-text)' }}>Refund Amount (USD)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'var(--adm-text-secondary)' }}>$</span>
                    <input
                      type="number"
                      value={refundAmount}
                      onChange={e => setRefundAmount(e.target.value)}
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                      className="w-full pl-7 pr-3 py-2 text-sm rounded-lg"
                      style={{ backgroundColor: 'var(--adm-input)', border: '1px solid var(--adm-input-border)', color: 'var(--adm-text)' }}
                    />
                  </div>
                </div>
                <div className="rounded-lg p-3 text-xs space-y-1.5" style={{ backgroundColor: 'var(--adm-input)' }}>
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--adm-text-secondary)' }}>Order Total:</span>
                    <span style={{ color: 'var(--adm-text)' }}>${(refundModal.total || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--adm-text-secondary)' }}>Payment Method:</span>
                    <span style={{ color: 'var(--adm-text)' }}>{refundModal.paymentMethod || 'Unknown'}</span>
                  </div>
                  {refundModal.paypalTransaction && (
                    <div className="flex justify-between">
                      <span style={{ color: 'var(--adm-text-secondary)' }}>PayPal Transaction:</span>
                      <span className="text-emerald-500">Connected</span>
                    </div>
                  )}
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setRefundModal(null)}
                    className="flex-1 px-4 py-2 text-sm rounded-lg border transition-colors"
                    style={{ borderColor: 'var(--adm-border)', color: 'var(--adm-text-secondary)' }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleRefund}
                    disabled={!refundAmount || parseFloat(refundAmount) <= 0}
                    className="flex-1 px-4 py-2 text-sm rounded-lg text-white transition-colors disabled:opacity-50"
                    style={{ backgroundColor: '#f43f5e' }}
                  >
                    Process Refund
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Avatar Info Modal */}
      <AnimatePresence>
        {chatModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
            onClick={() => setChatModal(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl"
              style={{ backgroundColor: 'var(--adm-card)', border: '1px solid var(--adm-border)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-5 border-b" style={{ borderColor: 'var(--adm-border)' }}>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--adm-text)' }}>
                    <MessageCircle size={18} style={{ color: 'var(--adm-accent)' }} />
                    Send Message
                  </h3>
                  <button
                    onClick={() => setChatModal(null)}
                    className="p-1.5 rounded-lg transition-colors adm-hover-bg"
                    style={{ color: 'var(--adm-text-secondary)' }}
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              <div className="p-5 space-y-4">
                <div className="flex items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: 'var(--adm-input)' }}>
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold overflow-hidden shrink-0"
                    style={{ backgroundColor: 'var(--adm-accent)', color: 'white' }}
                  >
                    {chatModal.staff.avatar ? (
                      <img src={chatModal.staff.avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      (chatModal.staff.name || '?')[0].toUpperCase()
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium" style={{ color: 'var(--adm-text)' }}>{chatModal.staff.name}</p>
                    <p className="text-xs" style={{ color: 'var(--adm-text-secondary)' }}>{chatModal.staff.role || 'Staff'}</p>
                  </div>
                </div>

                <div className="p-3 rounded-xl border" style={{ borderColor: 'var(--adm-border)' }}>
                  <p className="text-xs font-medium mb-2 flex items-center gap-1.5" style={{ color: 'var(--adm-text-secondary)' }}>
                    <Package size={12} />
                    Order Reference
                  </p>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'var(--adm-text)' }}>
                        Order #{chatModal.order.orderNumber || chatModal.order.id}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--adm-text-secondary)' }}>
                        ${(chatModal.order.total || 0).toFixed(2)} &middot; {chatModal.order.status}
                      </p>
                    </div>
                    <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: 'var(--adm-accent-bg)', color: 'var(--adm-accent)' }}>
                      {chatModal.order.items?.length || 0} items
                    </span>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--adm-text-secondary)' }}>
                    Message
                  </label>
                  <textarea
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    rows={4}
                    placeholder="Type your message..."
                    className="w-full px-3 py-2 rounded-lg border text-sm resize-none focus:outline-none focus:border-indigo-500/50"
                    style={{
                      backgroundColor: 'var(--adm-input)',
                      borderColor: 'var(--adm-input-border)',
                      color: 'var(--adm-text)',
                    }}
                  />
                </div>
              </div>

              <div className="p-5 pt-0 flex gap-2">
                <button
                  type="button"
                  onClick={() => setChatModal(null)}
                  className="flex-1 px-4 py-2.5 text-sm rounded-lg transition-colors adm-hover-bg"
                  style={{ color: 'var(--adm-text-secondary)', border: '1px solid var(--adm-border)' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (!chatMessage.trim() || chatSending) return
                    setChatSending(true)
                    try {
                      const res = await fetch('/api/internal-chat', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          toStaffId: chatModal.staff.id,
                          message: chatMessage,
                          orderRef: {
                            id: chatModal.order.id,
                            orderNumber: chatModal.order.orderNumber,
                            total: chatModal.order.total,
                            status: chatModal.order.status,
                          },
                        })
                      })
                      if (res.ok) {
                        setChatModal(null)
                        setChatMessage('')
                      } else {
                        alert('Failed to send message')
                      }
                    } catch {
                      alert('Failed to send message')
                    }
                    setChatSending(false)
                  }}
                  disabled={chatSending || !chatMessage.trim()}
                  className="flex-1 px-4 py-2.5 text-sm rounded-lg text-white font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{ backgroundColor: 'var(--adm-accent)' }}
                >
                  {chatSending ? (
                    <>Sending...</>
                  ) : (
                    <><Send size={14} /> Send Message</>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {avatarInfoModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
            onClick={() => setAvatarInfoModal(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-md rounded-2xl overflow-hidden shadow-2xl"
              style={{ backgroundColor: 'var(--adm-card)', border: '1px solid var(--adm-border)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative">
                <div className="h-24" style={{ backgroundColor: 'var(--adm-accent)', opacity: 0.15 }} />
                <div className="absolute -bottom-10 left-6">
                  <div className="w-20 h-20 rounded-full overflow-hidden border-4" style={{ borderColor: 'var(--adm-card)' }}>
                    <img src={avatarInfoModal.url} alt={avatarInfoModal.name} className="w-full h-full object-cover" />
                  </div>
                </div>
                <button
                  onClick={() => setAvatarInfoModal(null)}
                  className="absolute top-3 right-3 p-2 rounded-full transition-colors"
                  style={{ backgroundColor: 'rgba(0,0,0,0.2)', color: 'white' }}
                >
                  <X size={16} />
                </button>
              </div>
              <div className="pt-12 px-6 pb-6">
                <h3 className="text-xl font-bold" style={{ color: 'var(--adm-text)' }}>{avatarInfoModal.name}</h3>
                {(avatarInfoModal.era || avatarInfoModal.role) && (
                  <div className="flex gap-2 mt-2">
                    {avatarInfoModal.era && (
                      <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: 'var(--adm-accent-bg)', color: 'var(--adm-accent)' }}>
                        {avatarInfoModal.era}
                      </span>
                    )}
                    {avatarInfoModal.role && (
                      <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: 'var(--adm-input)', color: 'var(--adm-text-secondary)' }}>
                        {avatarInfoModal.role}
                      </span>
                    )}
                  </div>
                )}
                {avatarInfoModal.intro && (
                  <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--adm-border)' }}>
                    <p className="text-xs font-medium mb-2" style={{ color: 'var(--adm-text-secondary)' }}>Biography</p>
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--adm-text)' }}>{avatarInfoModal.intro}</p>
                  </div>
                )}
                <div className="mt-5 flex justify-end">
                  <button
                    onClick={() => setAvatarInfoModal(null)}
                    className="px-4 py-2 text-sm rounded-lg text-white transition-colors"
                    style={{ backgroundColor: 'var(--adm-accent)' }}
                  >
                    Got it
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}






