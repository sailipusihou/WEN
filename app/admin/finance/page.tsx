'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { DollarSign, TrendingUp, ArrowUp, ArrowDown, Wallet, RotateCcw, X, PackageCheck, RefreshCw, ExternalLink, Settings, Eye, EyeOff, Download, Calendar, Search, Filter } from 'lucide-react'

// PayPal Logo SVG Component
function PayPalLogo({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size * 0.26} viewBox="0 0 100 26" xmlns="http://www.w3.org/2000/svg">
      <path d="M11.2 0H4.8C4.4 0 4 0.3 3.9 0.7L1.3 17.2C1.2 17.5 1.4 17.8 1.7 17.8H4.8C5.2 17.8 5.6 17.5 5.7 17.1L6.4 12.4C6.5 11.9 6.9 11.6 7.4 11.6H9.4C13.5 11.6 15.9 9.6 16.5 5.7C16.8 4 16.5 2.7 15.7 1.8C14.7 0.7 13.2 0 11.2 0ZM11.9 5.9C11.6 8.1 9.9 8.1 8.3 8.1H7.4L8 4.2C8 3.9 8.3 3.7 8.6 3.7H9C10.1 3.7 11.1 3.7 11.7 4.3C11.9 4.7 12 5.2 11.9 5.9Z" fill="#003087"/>
      <path d="M30.6 5.8H27.5C27.2 5.8 26.9 6 26.9 6.3L26.7 7.4L26.4 7C25.7 6 24.2 5.7 22.7 5.7C19.2 5.7 16.3 8.3 15.7 12.1C15.4 14 15.8 15.7 16.9 16.9C17.8 17.9 19.2 18.3 20.7 18.3C23.4 18.3 24.9 16.6 24.9 16.6L24.7 17.6C24.6 17.9 24.8 18.2 25.1 18.2H27.9C28.3 18.2 28.7 17.9 28.8 17.5L30.6 6.4C30.7 6.1 30.5 5.8 30.6 5.8ZM25.8 12.3C25.5 14.1 24.1 15.4 22.2 15.4C21.3 15.4 20.6 15.1 20.1 14.6C19.6 14.1 19.5 13.4 19.6 12.7C19.9 10.9 21.3 9.7 23.2 9.7C24.1 9.7 24.8 10 25.3 10.5C25.7 11 25.9 11.6 25.8 12.3Z" fill="#003087"/>
      <path d="M48 5.8H44.9C44.6 5.8 44.3 6 44.1 6.3L39.8 12.7L38 6.6C37.9 6.2 37.5 5.9 37.1 5.9H34.1C33.8 5.9 33.5 6.2 33.6 6.6L36.9 16.4L33.7 21C33.5 21.3 33.7 21.7 34 21.7H37.1C37.4 21.7 37.7 21.5 37.9 21.2L48.4 6.5C48.6 6.2 48.4 5.8 48 5.8Z" fill="#003087"/>
      <path d="M58.6 0H52.2C51.8 0 51.4 0.3 51.3 0.7L48.7 17.2C48.6 17.5 48.8 17.8 49.1 17.8H52.3C52.6 17.8 52.9 17.6 52.9 17.3L53.6 12.4C53.7 11.9 54.1 11.6 54.6 11.6H56.6C60.7 11.6 63.1 9.6 63.7 5.7C64 4 63.7 2.7 62.9 1.8C62 0.7 60.5 0 58.6 0ZM59.3 5.9C59 8.1 57.3 8.1 55.7 8.1H54.7L55.4 4.2C55.4 3.9 55.7 3.7 56 3.7H56.4C57.5 3.7 58.5 3.7 59.1 4.3C59.3 4.7 59.4 5.2 59.3 5.9Z" fill="#009CDE"/>
      <path d="M78 5.8H74.9C74.6 5.8 74.3 6 74.3 6.3L74.1 7.4L73.8 7C73.1 6 71.6 5.7 70.1 5.7C66.6 5.7 63.7 8.3 63.1 12.1C62.8 14 63.2 15.7 64.3 16.9C65.2 17.9 66.6 18.3 68.1 18.3C70.8 18.3 72.3 16.6 72.3 16.6L72.1 17.6C72 17.9 72.2 18.2 72.5 18.2H75.3C75.7 18.2 76.1 17.9 76.2 17.5L78 6.4C78.1 6.1 78.3 5.8 78 5.8ZM73.2 12.3C72.9 14.1 71.5 15.4 69.6 15.4C68.7 15.4 68 15.1 67.5 14.6C67 14.1 66.9 13.4 67 12.7C67.3 10.9 68.7 9.7 70.6 9.7C71.5 9.7 72.2 10 72.7 10.5C73.2 11 73.3 11.6 73.2 12.3Z" fill="#009CDE"/>
      <path d="M81.6 0.4L78.9 17.2C78.8 17.5 79 17.8 79.3 17.8H82.1C82.5 17.8 82.9 17.5 83 17.1L85.7 0.6C85.8 0.3 85.6 0 85.3 0H81.9C81.6 0 81.6 0.2 81.6 0.4Z" fill="#009CDE"/>
    </svg>
  )
}

// Payoneer Logo SVG Component
function PayoneerLogo({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="2" width="20" height="20" rx="4" fill="#0070BA"/>
      <path d="M8 17L11 12L8 7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M16 17L13 12L16 7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

export default function AdminFinancePage() {
  const [data, setData] = useState({
    revenue: 0, orders: 0, pending: 0, settled: 0, fees: 0,
    refundedOrders: 0, refundTotal: 0, returnsTotal: 0,
    paypalOrders: 0, paypalRevenue: 0, paypalFees: 0,
    payoneerOrders: 0, payoneerRevenue: 0, payoneerFees: 0,
    netRevenue: 0,
  })
  const [paypalTransactions, setPaypalTransactions] = useState<any[]>([])
  const [paypalStats, setPaypalStats] = useState<any>(null)
  const [payoneerTransactions, setPayoneerTransactions] = useState<any[]>([])
  const [payoneerStats, setPayoneerStats] = useState<any>(null)
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null)
  const [refundModal, setRefundModal] = useState<any>(null)
  const [refundAmount, setRefundAmount] = useState('')
  const [paypalSettingsModal, setPaypalSettingsModal] = useState(false)
  const [payoneerSettingsModal, setPayoneerSettingsModal] = useState(false)
  const [paypalSettings, setPaypalSettings] = useState({
    enabled: false,
    env: 'sandbox' as 'sandbox' | 'production',
    clientId: '',
    clientSecret: '',
    hasSecret: false,
  })
  const [payoneerSettings, setPayoneerSettings] = useState({
    enabled: false,
    env: 'sandbox' as 'sandbox' | 'production',
    clientId: '',
    clientSecret: '',
    hasSecret: false,
  })
  const [showSecret, setShowSecret] = useState(false)
  const [showPayoneerSecret, setShowPayoneerSecret] = useState(false)
  const [savingSettings, setSavingSettings] = useState(false)
  const [syncingAll, setSyncingAll] = useState(false)
  const [pullingFromPayPal, setPullingFromPayPal] = useState(false)
  const [pullingFromPayoneer, setPullingFromPayoneer] = useState(false)
  
  // 日期范围和筛选状态
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: '',
  })
  const [dateRangePayoneer, setDateRangePayoneer] = useState({
    startDate: '',
    endDate: '',
  })
  const [statusFilter, setStatusFilter] = useState('all')
  const [statusFilterPayoneer, setStatusFilterPayoneer] = useState('all')
  const [filtering, setFiltering] = useState(false)
  const [filteringPayoneer, setFilteringPayoneer] = useState(false)

  const fetchPayPalTransactions = async (start?: string, end?: string, status?: string) => {
    setFiltering(true)
    try {
      const params = new URLSearchParams()
      if (start) params.set('startDate', start)
      if (end) params.set('endDate', end)
      if (status && status !== 'all') params.set('status', status)
      const query = params.toString() ? `?${params.toString()}` : ''
      const r = await fetch(`/api/paypal/transactions${query}`)
      if (r.ok) {
        const data = await r.json()
        setPaypalTransactions(data.transactions || [])
        setPaypalStats(data.stats || {})
      }
    } catch (e) {
      console.error('Failed to fetch PayPal transactions:', e)
    } finally {
      setFiltering(false)
    }
  }

  const fetchPayoneerTransactions = async (start?: string, end?: string, status?: string) => {
    setFilteringPayoneer(true)
    try {
      const params = new URLSearchParams()
      if (start) params.set('startDate', start)
      if (end) params.set('endDate', end)
      if (status && status !== 'all') params.set('status', status)
      const query = params.toString() ? `?${params.toString()}` : ''
      const r = await fetch(`/api/payoneer/transactions${query}`)
      if (r.ok) {
        const data = await r.json()
        setPayoneerTransactions(data.transactions || [])
        setPayoneerStats(data.stats || {})
      }
    } catch (e) {
      console.error('Failed to fetch Payoneer transactions:', e)
    } finally {
      setFilteringPayoneer(false)
    }
  }

  useEffect(() => {
    Promise.all([
          fetch('/api/orders?stats=true').then(r => r.ok ? r.json() : {}),
          fetch('/api/paypal/transactions').then(r => r.ok ? r.json() : { transactions: [], stats: {} }),
          fetch('/api/payoneer/transactions').then(r => r.ok ? r.json() : { transactions: [], stats: {} }),
          fetch('/api/settings').then(r => r.ok ? r.json() : {}),
        ]).then(([orderStats, paypalData, payoneerData, settings]) => {
          const stats = orderStats as any
          const s = settings as any
          const grossRev = stats.grossRevenue || stats.revenue || 0
          const actualRev = stats.revenue || grossRev
          const ppFees = (paypalData as any).stats?.totalFees || stats.paypalFees || 0
          const poFees = (payoneerData as any).stats?.totalFees || 0
          const otherFees = grossRev * 0.029 - ppFees - poFees
          setData({
            revenue: actualRev,
            orders: stats.total || 0,
            pending: stats.pending + stats.confirmed + stats.processing + stats.shipped || 0,
            settled: stats.delivered || 0,
            fees: ppFees + poFees + Math.max(0, otherFees),
            refundedOrders: stats.refunded || 0,
            refundTotal: stats.refundTotal || 0,
            returnsTotal: stats.returnsTotal || 0,
            paypalOrders: (paypalData as any).stats?.total || stats.paypalOrders || 0,
            paypalRevenue: (paypalData as any).stats?.totalAmount || stats.paypalRevenue || 0,
            paypalFees: ppFees,
            payoneerOrders: (payoneerData as any).stats?.total || 0,
            payoneerRevenue: (payoneerData as any).stats?.totalAmount || 0,
            payoneerFees: poFees,
            netRevenue: actualRev - (ppFees + poFees + Math.max(0, otherFees)),
          })
          setPaypalTransactions((paypalData as any).transactions || [])
          setPaypalStats((paypalData as any).stats || {})
          setPayoneerTransactions((payoneerData as any).transactions || [])
          setPayoneerStats((payoneerData as any).stats || {})
          if (s.paypalEnabled !== undefined) {
            setPaypalSettings({
              enabled: !!s.paypalEnabled,
              env: s.paypalEnv || 'sandbox',
              clientId: s.paypalClientId || '',
              clientSecret: '',
              hasSecret: !!s.hasPaypalSecret,
            })
          }
          if (s.payoneerEnabled !== undefined) {
            setPayoneerSettings({
              enabled: !!s.payoneerEnabled,
              env: s.payoneerEnv || 'sandbox',
              clientId: s.payoneerClientId || '',
              clientSecret: '',
              hasSecret: !!s.hasPayoneerSecret,
            })
          }
        })
  }, [])

  const handleDateFilter = () => {
    fetchPayPalTransactions(dateRange.startDate, dateRange.endDate, statusFilter)
  }

  const handleDateFilterPayoneer = () => {
    fetchPayoneerTransactions(dateRangePayoneer.startDate, dateRangePayoneer.endDate, statusFilterPayoneer)
  }

  const handleResetFilter = () => {
    setDateRange({ startDate: '', endDate: '' })
    setStatusFilter('all')
    fetchPayPalTransactions()
  }

  const handleResetFilterPayoneer = () => {
    setDateRangePayoneer({ startDate: '', endDate: '' })
    setStatusFilterPayoneer('all')
    fetchPayoneerTransactions()
  }

  const handleQuickDate = (days: number) => {
    const end = new Date()
    const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000)
    const range = {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
    }
    setDateRange(range)
    fetchPayPalTransactions(range.startDate, range.endDate, statusFilter)
  }

  const handlePayPalRefund = async () => {
    if (!refundModal) return
    const amount = parseFloat(refundAmount)
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid refund amount')
      return
    }
    try {
      const r = await fetch('/api/paypal/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'refund',
          orderId: refundModal.orderId,
          // 一并带上 captureId：历史交易记录的 orderId 常为空，
          // 后端会用 captureId 反查站内订单，避免报 Order not found
          captureId: refundModal.transactionId || refundModal.captureId || '',
          amount,
        }),
      })
      if (!r.ok) {
        const err = await r.json().catch(() => ({}))
        alert('Refund failed: ' + (err.error || r.statusText))
        return
      }
      setRefundModal(null)
      setRefundAmount('')
      window.location.reload()
    } catch (e) {
      alert('Network error: ' + (e as Error).message)
    }
  }

  const handleSyncTransaction = async (orderId: string) => {
    try {
      const r = await fetch('/api/paypal/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync', orderId }),
      })
      if (!r.ok) {
        const err = await r.json().catch(() => ({}))
        alert('Sync failed: ' + (err.error || r.statusText))
        return
      }
      window.location.reload()
    } catch (e) {
      alert('Network error: ' + (e as Error).message)
    }
  }

  const handleSyncAllTransactions = async () => {
    setSyncingAll(true)
    try {
      const r = await fetch('/api/paypal/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync_all' }),
      })
      if (!r.ok) {
        const err = await r.json().catch(() => ({}))
        alert('Sync failed: ' + (err.error || r.statusText))
        return
      }
      const result = await r.json()
      alert(`Sync completed! ${result.synced} transactions updated, ${result.failed} failed.`)
      window.location.reload()
    } catch (e) {
      alert('Network error: ' + (e as Error).message)
    } finally {
      setSyncingAll(false)
    }
  }

  const handleExportTransactions = () => {
    window.open('/api/paypal/transactions?export=true', '_blank')
  }

  const handlePullFromPayPal = async () => {
    if (!paypalSettings.enabled || !paypalSettings.hasSecret) {
      alert('Please configure PayPal settings first (enable PayPal and add Client ID + Secret)')
      return
    }
    setPullingFromPayPal(true)
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 60000)
      
      const requestBody: any = { action: 'pull_from_paypal' }
      if (dateRange.startDate) requestBody.startDate = dateRange.startDate
      if (dateRange.endDate) requestBody.endDate = dateRange.endDate
      
      const r = await fetch('/api/paypal/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      })
      
      clearTimeout(timeoutId)
      
      if (!r.ok) {
        const err = await r.json().catch(() => ({}))
        let message = err.error || r.statusText
        
        if (message.includes('timeout') || message.includes('Timeout')) {
          message = 'Network timeout. Please check your internet connection or try again later.'
        } else if (message.includes('connect') || message.includes('Connect')) {
          message = 'Cannot connect to PayPal. Please check your network settings or firewall.'
        } else if (message.includes('401') || message.includes('unauthorized')) {
          message = 'Invalid PayPal credentials. Please check your Client ID and Secret.'
        } else if (message.includes('403') || message.includes('permission')) {
          message = 'PayPal account does not have permission to access transactions.'
        }
        
        alert('Pull failed: ' + message)
        return
      }
      const result = await r.json()
      alert(
        `Pulled from PayPal!\n` +
        `API Method: ${result.apiMethod || 'unknown'}\n` +
        `Date Range: ${dateRange.startDate || 'default'} to ${dateRange.endDate || 'default'}\n` +
        `Total fetched: ${result.totalFetched}\n` +
        `Completed sales: ${result.completedSales}\n` +
        `Updated orders: ${result.updatedOrders}\n` +
        `Saved transactions: ${result.savedTransactions}\n` +
        `(Added: ${result.addedTransactions}, Updated: ${result.updatedTransactions})\n` +
        `Unmatched: ${result.unmatchedTransactions}\n` +
        `Total amount: $${(result.totalAmount || 0).toFixed(2)}\n` +
        `Total fees: $${(result.totalFees || 0).toFixed(2)}\n` +
        `Net amount: $${(result.totalNet || 0).toFixed(2)}`
      )
      window.location.reload()
    } catch (e) {
      alert('Network error: ' + (e as Error).message)
    } finally {
      setPullingFromPayPal(false)
    }
  }

  const savePayPalSettings = async () => {
    setSavingSettings(true)
    try {
      const body: any = {
        paypalEnabled: paypalSettings.enabled,
        paypalEnv: paypalSettings.env,
        paypalClientId: paypalSettings.clientId,
      }
      if (paypalSettings.clientSecret) {
        body.paypalClientSecret = paypalSettings.clientSecret
      }
      const r = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!r.ok) {
        const err = await r.json().catch(() => ({}))
        alert('Save failed: ' + (err.error || r.statusText))
        return
      }
      const data = await r.json()
      setPaypalSettings(prev => ({
        ...prev,
        hasSecret: data.hasPaypalSecret || prev.hasSecret,
        clientSecret: '',
      }))
      setShowSecret(false)
      alert('PayPal settings saved successfully!')
      setPaypalSettingsModal(false)
    } catch (e) {
      alert('Network error: ' + (e as Error).message)
    } finally {
      setSavingSettings(false)
    }
  }

  const handlePullFromPayoneer = async () => {
    if (!payoneerSettings.enabled || !payoneerSettings.hasSecret) {
      alert('Please configure Payoneer settings first (enable Payoneer and add Client ID + Secret)')
      return
    }
    setPullingFromPayoneer(true)
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 60000)
      
      const requestBody: any = { action: 'pull_from_payoneer' }
      if (dateRangePayoneer.startDate) requestBody.startDate = dateRangePayoneer.startDate
      if (dateRangePayoneer.endDate) requestBody.endDate = dateRangePayoneer.endDate
      
      const r = await fetch('/api/payoneer/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      })
      
      clearTimeout(timeoutId)
      
      if (!r.ok) {
        const err = await r.json().catch(() => ({}))
        let message = err.error || r.statusText
        
        if (message.includes('timeout') || message.includes('Timeout')) {
          message = 'Network timeout. Please check your internet connection or try again later.'
        } else if (message.includes('connect') || message.includes('Connect')) {
          message = 'Cannot connect to Payoneer. Please check your network settings or firewall.'
        } else if (message.includes('401') || message.includes('unauthorized')) {
          message = 'Invalid Payoneer credentials. Please check your Client ID and Secret.'
        } else if (message.includes('403') || message.includes('permission')) {
          message = 'Payoneer account does not have permission to access transactions.'
        }
        
        alert('Pull failed: ' + message)
        return
      }
      const result = await r.json()
      alert(
        `Pulled from Payoneer!\n` +
        `Date Range: ${dateRangePayoneer.startDate || 'default'} to ${dateRangePayoneer.endDate || 'default'}\n` +
        `Total fetched: ${result.totalFetched}\n` +
        `Completed sales: ${result.completedSales}\n` +
        `Updated orders: ${result.updatedOrders}\n` +
        `Saved transactions: ${result.savedTransactions}\n` +
        `(Added: ${result.addedTransactions}, Updated: ${result.updatedTransactions})\n` +
        `Unmatched: ${result.unmatchedTransactions}\n` +
        `Total amount: $${(result.totalAmount || 0).toFixed(2)}\n` +
        `Total fees: $${(result.totalFees || 0).toFixed(2)}\n` +
        `Net amount: $${(result.totalNet || 0).toFixed(2)}`
      )
      window.location.reload()
    } catch (e) {
      alert('Network error: ' + (e as Error).message)
    } finally {
      setPullingFromPayoneer(false)
    }
  }

  const savePayoneerSettings = async () => {
    setSavingSettings(true)
    try {
      const body: any = {
        payoneerEnabled: payoneerSettings.enabled,
        payoneerEnv: payoneerSettings.env,
        payoneerClientId: payoneerSettings.clientId,
      }
      if (payoneerSettings.clientSecret) {
        body.payoneerClientSecret = payoneerSettings.clientSecret
      }
      const r = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!r.ok) {
        const err = await r.json().catch(() => ({}))
        alert('Save failed: ' + (err.error || r.statusText))
        return
      }
      const data = await r.json()
      setPayoneerSettings(prev => ({
        ...prev,
        hasSecret: data.hasPayoneerSecret || prev.hasSecret,
        clientSecret: '',
      }))
      setShowPayoneerSecret(false)
      alert('Payoneer settings saved successfully!')
      setPayoneerSettingsModal(false)
    } catch (e) {
      alert('Network error: ' + (e as Error).message)
    } finally {
      setSavingSettings(false)
    }
  }

  const cards = [
    { label: 'Gross Revenue', value: `$${data.revenue.toFixed(0)}`, sub: `${data.orders} orders`, icon: DollarSign, color: 'from-emerald-500 to-emerald-600' },
    { label: 'Platform Fees', value: `-$${data.fees.toFixed(0)}`, sub: 'PayPal + processing', icon: TrendingUp, color: 'from-amber-500 to-amber-600' },
    { label: 'Net Revenue', value: `$${(data.revenue - data.fees).toFixed(0)}`, sub: 'After fees', icon: Wallet, color: 'from-indigo-500 to-indigo-600' },
    { label: 'Pending Settlement', value: `$${(data.revenue * (data.pending / Math.max(data.orders, 1))).toFixed(0)}`, sub: `${data.pending} orders pending`, icon: ArrowUp, color: 'from-violet-500 to-violet-600' },
  ]

  const returnCards = [
    { label: 'Return Requests', value: data.returnsTotal, sub: 'Total return cases', icon: RotateCcw, color: 'text-orange-500' },
    { label: 'Refunded Orders', value: data.refundedOrders, sub: 'Completed refunds', icon: PackageCheck, color: 'text-rose-500' },
    { label: 'Total Refunded', value: `$${data.refundTotal.toFixed(0)}`, sub: 'Refund amount', icon: DollarSign, color: 'text-red-500' },
  ]

  const paypalCards = [
    { label: 'PayPal Orders', value: data.paypalOrders, sub: 'Completed via PayPal', icon: Wallet, color: 'text-blue-500' },
    { label: 'PayPal Revenue', value: `$${data.paypalRevenue.toFixed(0)}`, sub: 'Total PayPal sales', icon: DollarSign, color: 'text-blue-600' },
    { label: 'PayPal Fees', value: `-$${data.paypalFees.toFixed(0)}`, sub: 'PayPal processing fees', icon: TrendingUp, color: 'text-amber-500' },
    { label: 'PayPal Net', value: `$${(data.paypalRevenue - data.paypalFees).toFixed(0)}`, sub: 'After PayPal fees', icon: ArrowDown, color: 'text-emerald-500' },
  ]

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--adm-text)' }}>Finance</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--adm-text-secondary)' }}>Revenue, settlements, and reconciliation</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map((c, i) => (
          <motion.div key={c.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
            className="relative overflow-hidden rounded-xl p-5 adm-card-card cursor-pointer"
            style={{ backgroundColor: 'var(--adm-card)', border: '1px solid var(--adm-border)' }}>
            <div className={`absolute inset-0 bg-gradient-to-br ${c.color} opacity-5`} />
            <div className="relative">
              <p className="text-sm" style={{ color: 'var(--adm-text-secondary)' }}>{c.label}</p>
              <p className="text-2xl font-bold mt-1" style={{ color: 'var(--adm-text)' }}>{c.value}</p>
              <p className="text-xs mt-1" style={{ color: 'var(--adm-text-secondary)' }}>{c.sub}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="rounded-xl p-5 adm-card-card cursor-pointer" style={{ backgroundColor: 'var(--adm-card)', border: '1px solid var(--adm-border)' }}>
          <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--adm-text)' }}>Return & Refund Summary</h2>
          <div className="space-y-3">
            {returnCards.map((card) => (
              <div key={card.label} className="flex items-center justify-between py-2.5 px-3 rounded-lg" style={{ backgroundColor: 'var(--adm-input)' }}>
                <div className="flex items-center gap-2">
                  <card.icon size={14} style={{ color: card.color }} />
                  <span className="text-sm" style={{ color: 'var(--adm-text-secondary)' }}>{card.label}</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-semibold" style={{ color: 'var(--adm-text)' }}>{card.value}</span>
                  <p className="text-[10px]" style={{ color: 'var(--adm-text-secondary)' }}>{card.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl p-5 adm-card-card cursor-pointer" style={{ backgroundColor: 'var(--adm-card)', border: '1px solid var(--adm-border)' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <PayPalLogo size={20} />
              <h2 className="text-sm font-semibold" style={{ color: 'var(--adm-text)' }}>Performance</h2>
            </div>
            <button
              onClick={() => setPaypalSettingsModal(true)}
              className="p-1.5 rounded-lg transition-colors hover:opacity-80"
              style={{ color: 'var(--adm-text-secondary)' }}
              title="PayPal Settings"
            >
              <Settings size={16} />
            </button>
          </div>
          <div className="space-y-3">
            {paypalCards.map((card) => (
              <div key={card.label} className="flex items-center justify-between py-2.5 px-3 rounded-lg" style={{ backgroundColor: 'var(--adm-input)' }}>
                <div className="flex items-center gap-2">
                  <card.icon size={14} style={{ color: card.color }} />
                  <span className="text-sm" style={{ color: 'var(--adm-text-secondary)' }}>{card.label}</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-semibold" style={{ color: 'var(--adm-text)' }}>{card.value}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl p-5 adm-card-card cursor-pointer" style={{ backgroundColor: 'var(--adm-card)', border: '1px solid var(--adm-border)' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <PayoneerLogo size={20} />
              <h2 className="text-sm font-semibold" style={{ color: 'var(--adm-text)' }}>Performance</h2>
            </div>
            <button
              onClick={() => setPayoneerSettingsModal(true)}
              className="p-1.5 rounded-lg transition-colors hover:opacity-80"
              style={{ color: 'var(--adm-text-secondary)' }}
              title="Payoneer Settings"
            >
              <Settings size={16} />
            </button>
          </div>
          <div className="space-y-3">
            {[
              { label: 'Payoneer Orders', value: data.payoneerOrders, sub: 'Completed via Payoneer', icon: Wallet, color: 'text-blue-500' },
              { label: 'Payoneer Revenue', value: `$${data.payoneerRevenue.toFixed(0)}`, sub: 'Total Payoneer sales', icon: DollarSign, color: 'text-blue-600' },
              { label: 'Payoneer Fees', value: `-$${data.payoneerFees.toFixed(0)}`, sub: 'Payoneer processing fees', icon: TrendingUp, color: 'text-amber-500' },
              { label: 'Payoneer Net', value: `$${(data.payoneerRevenue - data.payoneerFees).toFixed(0)}`, sub: 'After Payoneer fees', icon: ArrowDown, color: 'text-emerald-500' },
            ].map((card) => (
              <div key={card.label} className="flex items-center justify-between py-2.5 px-3 rounded-lg" style={{ backgroundColor: 'var(--adm-input)' }}>
                <div className="flex items-center gap-2">
                  <card.icon size={14} style={{ color: card.color }} />
                  <span className="text-sm" style={{ color: 'var(--adm-text-secondary)' }}>{card.label}</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-semibold" style={{ color: 'var(--adm-text)' }}>{card.value}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl p-5 adm-card-card cursor-pointer" style={{ backgroundColor: 'var(--adm-card)', border: '1px solid var(--adm-border)' }}>
          <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--adm-text)' }}>Transaction Summary</h2>
          <div className="space-y-3">
            {[
              { label: 'Total Orders', value: data.orders, change: '' },
              { label: 'Average Order Value', value: `$${data.orders > 0 ? (data.revenue / data.orders).toFixed(0) : '0'}`, change: '' },
              { label: 'Settled Orders', value: data.settled, change: `${((data.settled / Math.max(data.orders, 1)) * 100).toFixed(0)}%` },
              { label: 'Pending Settlement', value: data.pending, change: `${((data.pending / Math.max(data.orders, 1)) * 100).toFixed(0)}%` },
            ].map((s) => (
              <div key={s.label} className="flex items-center justify-between py-2.5 px-3 rounded-lg" style={{ backgroundColor: 'var(--adm-input)' }}>
                <span className="text-sm" style={{ color: 'var(--adm-text-secondary)' }}>{s.label}</span>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold" style={{ color: 'var(--adm-text)' }}>{s.value}</span>
                  {s.change && <span className="text-xs" style={{ color: 'var(--adm-text-secondary)' }}>{s.change}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-xl p-5 mb-8" style={{ backgroundColor: 'var(--adm-card)', border: '1px solid var(--adm-border)' }}>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <PayPalLogo size={20} />
            <h2 className="text-sm font-semibold" style={{ color: 'var(--adm-text)' }}>Transactions</h2>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {paypalStats && (
              <div className="hidden sm:flex items-center gap-4 text-xs">
                <span style={{ color: 'var(--adm-text-secondary)' }}>
                  Total: <span className="font-semibold" style={{ color: 'var(--adm-text)' }}>{paypalStats.count}</span>
                </span>
                <span style={{ color: 'var(--adm-text-secondary)' }}>
                  Completed: <span className="font-semibold text-emerald-500">{paypalStats.completed}</span>
                </span>
                <span style={{ color: 'var(--adm-text-secondary)' }}>
                  Refunded: <span className="font-semibold text-rose-500">{paypalStats.refunded}</span>
                </span>
                <span style={{ color: 'var(--adm-text-secondary)' }}>
                  Unmatched: <span className="font-semibold text-amber-500">{paypalStats.unmatched}</span>
                </span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <button
                onClick={handlePullFromPayPal}
                disabled={pullingFromPayPal}
                className="px-3 py-1.5 text-xs rounded-lg border flex items-center gap-1.5 transition-colors"
                style={{ borderColor: 'var(--adm-border)', color: 'var(--adm-text-secondary)' }}
              >
                <RefreshCw size={12} className={pullingFromPayPal ? 'animate-spin' : ''} />
                {pullingFromPayPal ? 'Pulling...' : 'Pull from PayPal'}
              </button>
              <button
                onClick={handleSyncAllTransactions}
                disabled={syncingAll}
                className="hidden sm:flex px-3 py-1.5 text-xs rounded-lg border items-center gap-1.5 transition-colors"
                style={{ borderColor: 'var(--adm-border)', color: 'var(--adm-text-secondary)' }}
              >
                <RefreshCw size={12} className={syncingAll ? 'animate-spin' : ''} />
                {syncingAll ? 'Syncing...' : 'Sync All'}
              </button>
              <button
                onClick={handleExportTransactions}
                className="px-3 py-1.5 text-xs rounded-lg text-white flex items-center gap-1.5 transition-colors"
                style={{ backgroundColor: 'var(--adm-accent)' }}
              >
                <Download size={12} />
                Export CSV
              </button>
            </div>
          </div>
        </div>
        
        {/* 日期范围筛选器 */}
        <div className="mb-4 p-3 rounded-lg" style={{ backgroundColor: 'var(--adm-input)', border: '1px solid var(--adm-border)' }}>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5">
              <Calendar size={14} style={{ color: 'var(--adm-text-secondary)' }} />
              <span className="text-xs font-medium" style={{ color: 'var(--adm-text)' }}>Date Range:</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={dateRange.startDate}
                onChange={e => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                className="px-2 py-1 text-xs rounded border"
                style={{ backgroundColor: 'var(--adm-card)', border: '1px solid var(--adm-border)', color: 'var(--adm-text)' }}
              />
              <span className="text-xs" style={{ color: 'var(--adm-text-secondary)' }}>to</span>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={e => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                className="px-2 py-1 text-xs rounded border"
                style={{ backgroundColor: 'var(--adm-card)', border: '1px solid var(--adm-border)', color: 'var(--adm-text)' }}
              />
            </div>
            
            {/* 快速日期选择 */}
            <div className="flex items-center gap-1">
              {[
                { label: '7D', days: 7 },
                { label: '30D', days: 30 },
                { label: '90D', days: 90 },
              ].map(q => (
                <button
                  key={q.label}
                  onClick={() => handleQuickDate(q.days)}
                  className="px-2 py-1 text-[10px] rounded border transition-colors hover:opacity-80"
                  style={{ borderColor: 'var(--adm-border)', color: 'var(--adm-text-secondary)' }}
                >
                  {q.label}
                </button>
              ))}
            </div>
            
            {/* 状态筛选 */}
            <div className="flex items-center gap-1.5">
              <Filter size={12} style={{ color: 'var(--adm-text-secondary)' }} />
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="px-2 py-1 text-xs rounded border"
                style={{ backgroundColor: 'var(--adm-card)', border: '1px solid var(--adm-border)', color: 'var(--adm-text)' }}
              >
                <option value="all">All Status</option>
                <option value="completed">Completed</option>
                <option value="refunded">Refunded</option>
                <option value="unmatched">Unmatched</option>
              </select>
            </div>
            
            <button
              onClick={handleDateFilter}
              disabled={filtering}
              className="px-3 py-1 text-xs rounded text-white flex items-center gap-1 transition-colors disabled:opacity-50"
              style={{ backgroundColor: 'var(--adm-accent)' }}
            >
              <Search size={12} />
              {filtering ? 'Filtering...' : 'Filter'}
            </button>
            <button
              onClick={handleResetFilter}
              className="px-3 py-1 text-xs rounded border transition-colors"
              style={{ borderColor: 'var(--adm-border)', color: 'var(--adm-text-secondary)' }}
            >
              Reset
            </button>
          </div>
        </div>
        
        {paypalTransactions.length === 0 ? (
          <p className="text-sm text-center py-8" style={{ color: 'var(--adm-text-secondary)' }}>No PayPal transactions found. Click "Pull from PayPal" to fetch transactions from your PayPal account.</p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {paypalTransactions.map((t, i) => (
              <div
                key={i}
                onClick={() => setSelectedTransaction(t)}
                className="flex items-center justify-between py-3 px-4 rounded-lg cursor-pointer transition-colors adm-hover-bg"
                style={{ backgroundColor: 'var(--adm-input)', border: t.matched ? '1px solid var(--adm-border)' : '1px dashed #f59e0b' }}
              >
                <div className="flex items-center gap-3">
                  <PayPalLogo size={14} />
                  <div className={`w-2 h-2 rounded-full`} style={{ backgroundColor: t.status === 'COMPLETED' ? '#059669' : t.status === 'REFUNDED' ? '#f43f5e' : '#f59e0b' }} />
                  {!t.matched && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">UNMATCHED</span>
                  )}
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--adm-text)' }}>
                      {t.transactionId ? t.transactionId.slice(0, 12) + '...' : 'Unknown'}
                    </p>
                    <p className="text-[10px]" style={{ color: 'var(--adm-text-secondary)' }}>
                      {t.status} · {new Date(t.createdAt).toLocaleDateString()} · {new Date(t.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      {t.payerEmail && ` · ${t.payerEmail}`}
                      {t.matchedOrder && t.matchedOrder.id && ` · Order: ${t.matchedOrder.id.slice(-8)}`}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold" style={{ color: 'var(--adm-text)' }}>${t.amount?.toFixed(2) || '0.00'}</p>
                  <p className="text-[10px] text-amber-500">-${t.fee?.toFixed(2) || '0.00'} fee</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Payoneer Transactions Section */}
      <div className="rounded-xl p-5 mb-8" style={{ backgroundColor: 'var(--adm-card)', border: '1px solid var(--adm-border)' }}>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <PayoneerLogo size={20} />
            <h2 className="text-sm font-semibold" style={{ color: 'var(--adm-text)' }}>Transactions</h2>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {payoneerStats && (
              <div className="hidden sm:flex items-center gap-4 text-xs">
                <span style={{ color: 'var(--adm-text-secondary)' }}>
                  Total: <span className="font-semibold" style={{ color: 'var(--adm-text)' }}>{payoneerStats.count}</span>
                </span>
                <span style={{ color: 'var(--adm-text-secondary)' }}>
                  Completed: <span className="font-semibold text-emerald-500">{payoneerStats.completed}</span>
                </span>
                <span style={{ color: 'var(--adm-text-secondary)' }}>
                  Refunded: <span className="font-semibold text-rose-500">{payoneerStats.refunded}</span>
                </span>
                <span style={{ color: 'var(--adm-text-secondary)' }}>
                  Unmatched: <span className="font-semibold text-amber-500">{payoneerStats.unmatched}</span>
                </span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <button
                onClick={handlePullFromPayoneer}
                disabled={pullingFromPayoneer}
                className="px-3 py-1.5 text-xs rounded-lg border flex items-center gap-1.5 transition-colors"
                style={{ borderColor: 'var(--adm-border)', color: 'var(--adm-text-secondary)' }}
              >
                <RefreshCw size={12} className={pullingFromPayoneer ? 'animate-spin' : ''} />
                {pullingFromPayoneer ? 'Pulling...' : 'Pull from Payoneer'}
              </button>
              <button
                onClick={handleSyncAllTransactions}
                disabled={syncingAll}
                className="hidden sm:flex px-3 py-1.5 text-xs rounded-lg border items-center gap-1.5 transition-colors"
                style={{ borderColor: 'var(--adm-border)', color: 'var(--adm-text-secondary)' }}
              >
                <RefreshCw size={12} className={syncingAll ? 'animate-spin' : ''} />
                {syncingAll ? 'Syncing...' : 'Sync All'}
              </button>
              <button
                onClick={() => window.open('/api/payoneer/transactions?export=true', '_blank')}
                className="px-3 py-1.5 text-xs rounded-lg text-white flex items-center gap-1.5 transition-colors"
                style={{ backgroundColor: 'var(--adm-accent)' }}
              >
                <Download size={12} />
                Export CSV
              </button>
            </div>
          </div>
        </div>
        
        {/* 日期范围筛选器 */}
        <div className="mb-4 p-3 rounded-lg" style={{ backgroundColor: 'var(--adm-input)', border: '1px solid var(--adm-border)' }}>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5">
              <Calendar size={14} style={{ color: 'var(--adm-text-secondary)' }} />
              <span className="text-xs font-medium" style={{ color: 'var(--adm-text)' }}>Date Range:</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={dateRangePayoneer.startDate}
                onChange={e => setDateRangePayoneer(prev => ({ ...prev, startDate: e.target.value }))}
                className="px-2 py-1 text-xs rounded border"
                style={{ backgroundColor: 'var(--adm-card)', border: '1px solid var(--adm-border)', color: 'var(--adm-text)' }}
              />
              <span className="text-xs" style={{ color: 'var(--adm-text-secondary)' }}>to</span>
              <input
                type="date"
                value={dateRangePayoneer.endDate}
                onChange={e => setDateRangePayoneer(prev => ({ ...prev, endDate: e.target.value }))}
                className="px-2 py-1 text-xs rounded border"
                style={{ backgroundColor: 'var(--adm-card)', border: '1px solid var(--adm-border)', color: 'var(--adm-text)' }}
              />
            </div>
            
            {/* 快速日期选择 */}
            <div className="flex items-center gap-1">
              {[
                { label: '7D', days: 7 },
                { label: '30D', days: 30 },
                { label: '90D', days: 90 },
              ].map(q => (
                <button
                  key={q.label}
                  onClick={() => {
                    const end = new Date()
                    const start = new Date(end.getTime() - q.days * 24 * 60 * 60 * 1000)
                    const range = {
                      startDate: start.toISOString().split('T')[0],
                      endDate: end.toISOString().split('T')[0],
                    }
                    setDateRangePayoneer(range)
                    fetchPayoneerTransactions(range.startDate, range.endDate, statusFilterPayoneer)
                  }}
                  className="px-2 py-1 text-[10px] rounded border transition-colors hover:opacity-80"
                  style={{ borderColor: 'var(--adm-border)', color: 'var(--adm-text-secondary)' }}
                >
                  {q.label}
                </button>
              ))}
            </div>
            
            {/* 状态筛选 */}
            <div className="flex items-center gap-1.5">
              <Filter size={12} style={{ color: 'var(--adm-text-secondary)' }} />
              <select
                value={statusFilterPayoneer}
                onChange={e => setStatusFilterPayoneer(e.target.value)}
                className="px-2 py-1 text-xs rounded border"
                style={{ backgroundColor: 'var(--adm-card)', border: '1px solid var(--adm-border)', color: 'var(--adm-text)' }}
              >
                <option value="all">All Status</option>
                <option value="completed">Completed</option>
                <option value="refunded">Refunded</option>
                <option value="unmatched">Unmatched</option>
              </select>
            </div>
            
            <button
              onClick={handleDateFilterPayoneer}
              disabled={filteringPayoneer}
              className="px-3 py-1 text-xs rounded text-white flex items-center gap-1 transition-colors disabled:opacity-50"
              style={{ backgroundColor: 'var(--adm-accent)' }}
            >
              <Search size={12} />
              {filteringPayoneer ? 'Filtering...' : 'Filter'}
            </button>
            <button
              onClick={handleResetFilterPayoneer}
              className="px-3 py-1 text-xs rounded border transition-colors"
              style={{ borderColor: 'var(--adm-border)', color: 'var(--adm-text-secondary)' }}
            >
              Reset
            </button>
          </div>
        </div>
        
        {payoneerTransactions.length === 0 ? (
          <p className="text-sm text-center py-8" style={{ color: 'var(--adm-text-secondary)' }}>No Payoneer transactions found. Click "Pull from Payoneer" to fetch transactions from your Payoneer account.</p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {payoneerTransactions.map((t, i) => (
              <div
                key={i}
                onClick={() => setSelectedTransaction(t)}
                className="flex items-center justify-between py-3 px-4 rounded-lg cursor-pointer transition-colors adm-hover-bg"
                style={{ backgroundColor: 'var(--adm-input)', border: t.matched ? '1px solid var(--adm-border)' : '1px dashed #f59e0b' }}
              >
                <div className="flex items-center gap-3">
                  <PayoneerLogo size={14} />
                  <div className={`w-2 h-2 rounded-full`} style={{ backgroundColor: t.status === 'COMPLETED' ? '#059669' : t.status === 'REFUNDED' ? '#f43f5e' : '#f59e0b' }} />
                  {!t.matched && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">UNMATCHED</span>
                  )}
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--adm-text)' }}>
                      {t.transactionId ? t.transactionId.slice(0, 12) + '...' : 'Unknown'}
                    </p>
                    <p className="text-[10px]" style={{ color: 'var(--adm-text-secondary)' }}>
                      {t.status} · {new Date(t.createdAt).toLocaleDateString()} · {new Date(t.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      {t.payerEmail && ` · ${t.payerEmail}`}
                      {t.matchedOrder && t.matchedOrder.id && ` · Order: ${t.matchedOrder.id.slice(-8)}`}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold" style={{ color: 'var(--adm-text)' }}>${t.amount?.toFixed(2) || '0.00'}</p>
                  <p className="text-[10px] text-amber-500">-${t.fee?.toFixed(2) || '0.00'} fee</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedTransaction && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
            onClick={() => setSelectedTransaction(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto"
              style={{ backgroundColor: 'var(--adm-card)', border: '1px solid var(--adm-border)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-5 border-b sticky top-0 z-10" style={{ backgroundColor: 'var(--adm-card)', borderColor: 'var(--adm-border)' }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <PayPalLogo size={24} />
                    <div>
                      <h3 className="text-lg font-bold" style={{ color: 'var(--adm-text)' }}>Transaction Details</h3>
                      <p className="text-xs font-mono" style={{ color: 'var(--adm-text-secondary)' }}>
                        {selectedTransaction.transactionId || 'No Transaction ID'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedTransaction(null)}
                    className="p-2 rounded-lg transition-colors"
                    style={{ color: 'var(--adm-text-secondary)' }}
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
              
              <div className="p-5 space-y-4">
                {/* 状态和基本信息 */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg p-3" style={{ backgroundColor: 'var(--adm-input)' }}>
                    <p className="text-xs" style={{ color: 'var(--adm-text-secondary)' }}>Status</p>
                    <p className={`text-sm font-semibold mt-1 ${
                      selectedTransaction.status === 'COMPLETED' ? 'text-emerald-500' :
                      selectedTransaction.status === 'REFUNDED' ? 'text-rose-500' : 'text-amber-500'
                    }`}>
                      {selectedTransaction.status}
                    </p>
                  </div>
                  <div className="rounded-lg p-3" style={{ backgroundColor: 'var(--adm-input)' }}>
                    <p className="text-xs" style={{ color: 'var(--adm-text-secondary)' }}>Currency</p>
                    <p className="text-sm font-semibold mt-1" style={{ color: 'var(--adm-text)' }}>
                      {selectedTransaction.currency || 'USD'}
                    </p>
                  </div>
                </div>

                {/* 金额明细 */}
                <div>
                  <p className="text-xs font-semibold mb-2" style={{ color: 'var(--adm-text)' }}>Amount Breakdown</p>
                  <div className="space-y-2">
                    <div className="flex justify-between py-2 px-3 rounded-lg" style={{ backgroundColor: 'var(--adm-input)' }}>
                      <span className="text-sm" style={{ color: 'var(--adm-text-secondary)' }}>Gross Amount</span>
                      <span className="text-sm font-semibold" style={{ color: 'var(--adm-text)' }}>${selectedTransaction.amount?.toFixed(2) || '0.00'}</span>
                    </div>
                    <div className="flex justify-between py-2 px-3 rounded-lg" style={{ backgroundColor: 'var(--adm-input)' }}>
                      <span className="text-sm" style={{ color: 'var(--adm-text-secondary)' }}>PayPal Fee</span>
                      <span className="text-sm font-semibold text-amber-500">-${selectedTransaction.fee?.toFixed(2) || '0.00'}</span>
                    </div>
                    <div className="flex justify-between py-2 px-3 rounded-lg" style={{ borderTop: '1px solid var(--adm-border)' }}>
                      <span className="text-sm font-semibold" style={{ color: 'var(--adm-text)' }}>Net Amount</span>
                      <span className="text-sm font-semibold text-emerald-500">${selectedTransaction.netAmount?.toFixed(2) || '0.00'}</span>
                    </div>
                    {selectedTransaction.fee && selectedTransaction.amount && (
                      <div className="flex justify-between py-1.5 px-3 rounded-lg" style={{ backgroundColor: 'var(--adm-input)' }}>
                        <span className="text-xs" style={{ color: 'var(--adm-text-secondary)' }}>Fee Rate</span>
                        <span className="text-xs font-medium" style={{ color: 'var(--adm-text-secondary)' }}>
                          {((selectedTransaction.fee / selectedTransaction.amount) * 100).toFixed(2)}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 交易时间信息 */}
                <div>
                  <p className="text-xs font-semibold mb-2" style={{ color: 'var(--adm-text)' }}>Timeline</p>
                  <div className="space-y-2">
                    <div className="flex justify-between py-2 px-3 rounded-lg" style={{ backgroundColor: 'var(--adm-input)' }}>
                      <span className="text-sm" style={{ color: 'var(--adm-text-secondary)' }}>Created At</span>
                      <span className="text-sm" style={{ color: 'var(--adm-text)' }}>
                        {selectedTransaction.createdAt ? new Date(selectedTransaction.createdAt).toLocaleString() : '-'}
                      </span>
                    </div>
                    <div className="flex justify-between py-2 px-3 rounded-lg" style={{ backgroundColor: 'var(--adm-input)' }}>
                      <span className="text-sm" style={{ color: 'var(--adm-text-secondary)' }}>Updated At</span>
                      <span className="text-sm" style={{ color: 'var(--adm-text)' }}>
                        {selectedTransaction.updatedAt ? new Date(selectedTransaction.updatedAt).toLocaleString() : '-'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 付款人信息 */}
                {selectedTransaction.payerEmail && (
                  <div>
                    <p className="text-xs font-semibold mb-2" style={{ color: 'var(--adm-text)' }}>Payer Information</p>
                    <div className="space-y-2">
                      <div className="flex justify-between py-2 px-3 rounded-lg" style={{ backgroundColor: 'var(--adm-input)' }}>
                        <span className="text-sm" style={{ color: 'var(--adm-text-secondary)' }}>Email</span>
                        <span className="text-sm font-medium" style={{ color: 'var(--adm-text)' }}>{selectedTransaction.payerEmail}</span>
                      </div>
                      {selectedTransaction.payerName && (
                        <div className="flex justify-between py-2 px-3 rounded-lg" style={{ backgroundColor: 'var(--adm-input)' }}>
                          <span className="text-sm" style={{ color: 'var(--adm-text-secondary)' }}>Name</span>
                          <span className="text-sm" style={{ color: 'var(--adm-text)' }}>{selectedTransaction.payerName}</span>
                        </div>
                      )}
                      {selectedTransaction.payerId && (
                        <div className="flex justify-between py-2 px-3 rounded-lg" style={{ backgroundColor: 'var(--adm-input)' }}>
                          <span className="text-sm" style={{ color: 'var(--adm-text-secondary)' }}>Payer ID</span>
                          <span className="text-sm font-mono" style={{ color: 'var(--adm-text)' }}>{selectedTransaction.payerId}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 结算信息 */}
                {selectedTransaction.settlementStatus && (
                  <div>
                    <p className="text-xs font-semibold mb-2" style={{ color: 'var(--adm-text)' }}>Settlement</p>
                    <div className="rounded-lg p-3" style={{ backgroundColor: 'var(--adm-input)' }}>
                      <div className="flex justify-between">
                        <span className="text-sm" style={{ color: 'var(--adm-text-secondary)' }}>Status</span>
                        <span className={`text-sm font-semibold ${
                          selectedTransaction.settlementStatus === 'settled' ? 'text-emerald-500' : 'text-amber-500'
                        }`}>
                          {selectedTransaction.settlementStatus === 'settled' ? 'Settled' : 'Pending'}
                        </span>
                      </div>
                      {selectedTransaction.settlementDate && (
                        <p className="text-xs mt-1" style={{ color: 'var(--adm-text-secondary)' }}>
                          Settlement Date: {new Date(selectedTransaction.settlementDate).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* 匹配订单信息 */}
                {selectedTransaction.matchedOrder ? (
                  <div>
                    <p className="text-xs font-semibold mb-2" style={{ color: 'var(--adm-text)' }}>Matched Order</p>
                    <div className="space-y-2">
                      <div className="flex justify-between py-2 px-3 rounded-lg" style={{ backgroundColor: 'var(--adm-input)' }}>
                        <span className="text-sm" style={{ color: 'var(--adm-text-secondary)' }}>Order ID</span>
                        <span className="text-sm font-mono" style={{ color: 'var(--adm-text)' }}>{selectedTransaction.matchedOrder.id}</span>
                      </div>
                      <div className="flex justify-between py-2 px-3 rounded-lg" style={{ backgroundColor: 'var(--adm-input)' }}>
                        <span className="text-sm" style={{ color: 'var(--adm-text-secondary)' }}>Order Status</span>
                        <span className="text-sm" style={{ color: 'var(--adm-text)' }}>{selectedTransaction.matchedOrder.status}</span>
                      </div>
                      <div className="flex justify-between py-2 px-3 rounded-lg" style={{ backgroundColor: 'var(--adm-input)' }}>
                        <span className="text-sm" style={{ color: 'var(--adm-text-secondary)' }}>Order Total</span>
                        <span className="text-sm font-semibold" style={{ color: 'var(--adm-text)' }}>${selectedTransaction.matchedOrder.total?.toFixed(2) || '0.00'}</span>
                      </div>
                      {selectedTransaction.matchedOrder.customerName && (
                        <div className="flex justify-between py-2 px-3 rounded-lg" style={{ backgroundColor: 'var(--adm-input)' }}>
                          <span className="text-sm" style={{ color: 'var(--adm-text-secondary)' }}>Customer</span>
                          <span className="text-sm" style={{ color: 'var(--adm-text)' }}>{selectedTransaction.matchedOrder.customerName}</span>
                        </div>
                      )}
                      <div className="flex justify-between py-2 px-3 rounded-lg" style={{ backgroundColor: 'var(--adm-input)' }}>
                        <span className="text-sm" style={{ color: 'var(--adm-text-secondary)' }}>Amount Match</span>
                        <span className={`text-sm font-semibold ${
                          Math.abs(selectedTransaction.matchedOrder.total - selectedTransaction.amount) < 0.01
                            ? 'text-emerald-500' : 'text-rose-500'
                        }`}>
                          {Math.abs(selectedTransaction.matchedOrder.total - selectedTransaction.amount) < 0.01
                            ? '✓ Match' : `✗ Diff: $${Math.abs(selectedTransaction.matchedOrder.total - selectedTransaction.amount).toFixed(2)}`}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg p-3" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', border: '1px dashed #f59e0b' }}>
                    <p className="text-sm font-medium text-amber-600">⚠ Unmatched Transaction</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--adm-text-secondary)' }}>
                      This PayPal transaction is not linked to any local order. Please verify the payment manually.
                    </p>
                  </div>
                )}

                {/* 退款信息 */}
                {selectedTransaction.refundId && (
                  <div className="rounded-lg p-3" style={{ backgroundColor: 'rgba(244,63,94,0.1)' }}>
                    <p className="text-xs font-semibold mb-2 text-rose-500">Refund Information</p>
                    <div className="flex justify-between">
                      <span className="text-sm" style={{ color: 'var(--adm-text-secondary)' }}>Refund Amount</span>
                      <span className="text-sm font-semibold text-rose-500">-${selectedTransaction.refundAmount?.toFixed(2) || '0.00'}</span>
                    </div>
                    <p className="text-xs mt-1 font-mono" style={{ color: 'var(--adm-text-secondary)' }}>
                      Refund ID: {selectedTransaction.refundId}
                    </p>
                  </div>
                )}

                {/* 操作按钮 */}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => handleSyncTransaction(selectedTransaction.orderId || selectedTransaction.matchedOrderId)}
                    className="flex-1 px-4 py-2 text-sm rounded-lg border flex items-center justify-center gap-2 transition-colors"
                    style={{ borderColor: 'var(--adm-border)', color: 'var(--adm-text-secondary)' }}
                  >
                    <RefreshCw size={14} /> Sync
                  </button>
                  {selectedTransaction.status === 'COMPLETED' && !selectedTransaction.refundId && (
                    <button
                      onClick={() => {
                        setRefundModal(selectedTransaction)
                        setRefundAmount(String(selectedTransaction.amount || 0))
                        setSelectedTransaction(null)
                      }}
                      className="flex-1 px-4 py-2 text-sm rounded-lg text-white transition-colors"
                      style={{ backgroundColor: '#f43f5e' }}
                    >
                      <RotateCcw size={14} className="inline mr-1" /> Refund
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
                <div>
                  <h3 className="text-lg font-bold" style={{ color: 'var(--adm-text)' }}>Process PayPal Refund</h3>
                  <p className="text-xs" style={{ color: 'var(--adm-text-secondary)' }}>
                    Transaction: {refundModal.transactionId?.slice(0, 12)}...
                  </p>
                </div>
                <button
                  onClick={() => setRefundModal(null)}
                  className="p-2 rounded-lg transition-colors"
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
                <div className="rounded-lg p-3 text-xs space-y-1" style={{ backgroundColor: 'var(--adm-input)' }}>
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--adm-text-secondary)' }}>Original Amount:</span>
                    <span style={{ color: 'var(--adm-text)' }}>${refundModal.amount?.toFixed(2) || '0.00'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--adm-text-secondary)' }}>Order ID:</span>
                    <span style={{ color: 'var(--adm-text)' }}>{refundModal.orderId}</span>
                  </div>
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
                    onClick={handlePayPalRefund}
                    disabled={!refundAmount || parseFloat(refundAmount) <= 0}
                    className="flex-1 px-4 py-2 text-sm rounded-lg text-white transition-colors disabled:opacity-50"
                    style={{ backgroundColor: '#f43f5e' }}
                  >
                    Confirm Refund
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {paypalSettingsModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
            onClick={() => setPaypalSettingsModal(false)}
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
                <div>
                  <h3 className="text-lg font-bold" style={{ color: 'var(--adm-text)' }}>PayPal Settings</h3>
                  <p className="text-xs" style={{ color: 'var(--adm-text-secondary)' }}>
                    Configure your PayPal business account
                  </p>
                </div>
                <button
                  onClick={() => setPaypalSettingsModal(false)}
                  className="p-2 rounded-lg transition-colors"
                  style={{ color: 'var(--adm-text-secondary)' }}
                >
                  <X size={18} />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <div className="flex items-center justify-between py-2 px-3 rounded-lg" style={{ backgroundColor: 'var(--adm-input)' }}>
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--adm-text)' }}>Enable PayPal</p>
                    <p className="text-xs" style={{ color: 'var(--adm-text-secondary)' }}>Show PayPal at checkout</p>
                  </div>
                  <button
                    onClick={() => setPaypalSettings(p => ({ ...p, enabled: !p.enabled }))}
                    className="relative w-12 h-6 rounded-full transition-colors"
                    style={{ backgroundColor: paypalSettings.enabled ? '#059669' : 'var(--adm-input-border)' }}
                  >
                    <div
                      className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform shadow"
                      style={{ transform: paypalSettings.enabled ? 'translateX(26px)' : 'translateX(2px)' }}
                    />
                  </button>
                </div>

                <div>
                  <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--adm-text)' }}>Environment</label>
                  <div className="flex gap-2">
                    {(['sandbox', 'production'] as const).map(env => (
                      <button
                        key={env}
                        onClick={() => setPaypalSettings(p => ({ ...p, env }))}
                        className="flex-1 px-3 py-2 text-sm rounded-lg border transition-colors font-medium"
                        style={{
                          backgroundColor: paypalSettings.env === env ? 'var(--adm-accent)' : 'transparent',
                          borderColor: paypalSettings.env === env ? 'var(--adm-accent)' : 'var(--adm-border)',
                          color: paypalSettings.env === env ? 'white' : 'var(--adm-text-secondary)',
                        }}
                      >
                        {env === 'sandbox' ? 'Sandbox (Test)' : 'Production (Live)'}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--adm-text)' }}>Client ID</label>
                  <input
                    type="text"
                    value={paypalSettings.clientId}
                    onChange={e => setPaypalSettings(p => ({ ...p, clientId: e.target.value }))}
                    placeholder="Enter your PayPal Client ID"
                    className="w-full px-3 py-2 text-sm rounded-lg"
                    style={{ backgroundColor: 'var(--adm-input)', border: '1px solid var(--adm-input-border)', color: 'var(--adm-text)' }}
                  />
                </div>

                <div>
                  <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--adm-text)' }}>Secret Key</label>
                  <div className="relative">
                    <input
                      type={showSecret ? 'text' : 'password'}
                      value={paypalSettings.clientSecret}
                      onChange={e => setPaypalSettings(p => ({ ...p, clientSecret: e.target.value }))}
                      placeholder={paypalSettings.hasSecret ? '•••••••• (already saved)' : 'Enter your PayPal Secret'}
                      className="w-full px-3 py-2 pr-10 text-sm rounded-lg"
                      style={{ backgroundColor: 'var(--adm-input)', border: '1px solid var(--adm-input-border)', color: 'var(--adm-text)' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecret(!showSecret)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded transition-colors"
                      style={{ color: 'var(--adm-text-secondary)' }}
                    >
                      {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {paypalSettings.hasSecret && !paypalSettings.clientSecret && (
                    <p className="text-xs mt-1.5" style={{ color: 'var(--adm-text-secondary)' }}>
                      Leave blank to keep the existing secret key
                    </p>
                  )}
                </div>

                <div className="rounded-lg p-3 text-xs space-y-2" style={{ backgroundColor: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)' }}>
                  <p className="font-medium" style={{ color: '#3B82F6' }}>💡 How to get PayPal credentials</p>
                  <ol className="list-decimal list-inside space-y-1" style={{ color: 'var(--adm-text-secondary)' }}>
                    <li>Go to <a href="https://developer.paypal.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-500">developer.paypal.com</a></li>
                    <li>Create a Business account or log in</li>
                    <li>Go to "My Apps & Credentials"</li>
                    <li>Create an app and copy Client ID + Secret</li>
                  </ol>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setPaypalSettingsModal(false)}
                    className="flex-1 px-4 py-2.5 text-sm rounded-lg border transition-colors font-medium"
                    style={{ borderColor: 'var(--adm-border)', color: 'var(--adm-text-secondary)' }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={savePayPalSettings}
                    disabled={savingSettings}
                    className="flex-1 px-4 py-2.5 text-sm rounded-lg text-white transition-colors disabled:opacity-50 font-medium"
                    style={{ backgroundColor: 'var(--adm-accent)' }}
                  >
                    {savingSettings ? 'Saving...' : 'Save Settings'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {payoneerSettingsModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
            onClick={() => setPayoneerSettingsModal(false)}
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
                <div>
                  <h3 className="text-lg font-bold" style={{ color: 'var(--adm-text)' }}>Payoneer Settings</h3>
                  <p className="text-xs" style={{ color: 'var(--adm-text-secondary)' }}>
                    Configure your Payoneer business account
                  </p>
                </div>
                <button
                  onClick={() => setPayoneerSettingsModal(false)}
                  className="p-2 rounded-lg transition-colors"
                  style={{ color: 'var(--adm-text-secondary)' }}
                >
                  <X size={18} />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <div className="flex items-center justify-between py-2 px-3 rounded-lg" style={{ backgroundColor: 'var(--adm-input)' }}>
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--adm-text)' }}>Enable Payoneer</p>
                    <p className="text-xs" style={{ color: 'var(--adm-text-secondary)' }}>Show Payoneer at checkout</p>
                  </div>
                  <button
                    onClick={() => setPayoneerSettings(p => ({ ...p, enabled: !p.enabled }))}
                    className="relative w-12 h-6 rounded-full transition-colors"
                    style={{ backgroundColor: payoneerSettings.enabled ? '#059669' : 'var(--adm-input-border)' }}
                  >
                    <div
                      className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform shadow"
                      style={{ transform: payoneerSettings.enabled ? 'translateX(26px)' : 'translateX(2px)' }}
                    />
                  </button>
                </div>

                <div>
                  <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--adm-text)' }}>Environment</label>
                  <div className="flex gap-2">
                    {(['sandbox', 'production'] as const).map(env => (
                      <button
                        key={env}
                        onClick={() => setPayoneerSettings(p => ({ ...p, env }))}
                        className="flex-1 px-3 py-2 text-sm rounded-lg border transition-colors font-medium"
                        style={{
                          backgroundColor: payoneerSettings.env === env ? 'var(--adm-accent)' : 'transparent',
                          borderColor: payoneerSettings.env === env ? 'var(--adm-accent)' : 'var(--adm-border)',
                          color: payoneerSettings.env === env ? 'white' : 'var(--adm-text-secondary)',
                        }}
                      >
                        {env === 'sandbox' ? 'Sandbox (Test)' : 'Production (Live)'}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--adm-text)' }}>Client ID</label>
                  <input
                    type="text"
                    value={payoneerSettings.clientId}
                    onChange={e => setPayoneerSettings(p => ({ ...p, clientId: e.target.value }))}
                    placeholder="Enter your Payoneer Client ID"
                    className="w-full px-3 py-2 text-sm rounded-lg"
                    style={{ backgroundColor: 'var(--adm-input)', border: '1px solid var(--adm-input-border)', color: 'var(--adm-text)' }}
                  />
                </div>

                <div>
                  <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--adm-text)' }}>Secret Key</label>
                  <div className="relative">
                    <input
                      type={showPayoneerSecret ? 'text' : 'password'}
                      value={payoneerSettings.clientSecret}
                      onChange={e => setPayoneerSettings(p => ({ ...p, clientSecret: e.target.value }))}
                      placeholder={payoneerSettings.hasSecret ? '•••••••• (already saved)' : 'Enter your Payoneer Secret'}
                      className="w-full px-3 py-2 pr-10 text-sm rounded-lg"
                      style={{ backgroundColor: 'var(--adm-input)', border: '1px solid var(--adm-input-border)', color: 'var(--adm-text)' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPayoneerSecret(!showPayoneerSecret)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded transition-colors"
                      style={{ color: 'var(--adm-text-secondary)' }}
                    >
                      {showPayoneerSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {payoneerSettings.hasSecret && !payoneerSettings.clientSecret && (
                    <p className="text-xs mt-1.5" style={{ color: 'var(--adm-text-secondary)' }}>
                      Leave blank to keep the existing secret key
                    </p>
                  )}
                </div>

                <div className="rounded-lg p-3 text-xs space-y-2" style={{ backgroundColor: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)' }}>
                  <p className="font-medium" style={{ color: '#3B82F6' }}>💡 How to get Payoneer credentials</p>
                  <ol className="list-decimal list-inside space-y-1" style={{ color: 'var(--adm-text-secondary)' }}>
                    <li>Go to <a href="https://developer.payoneer.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-500">developer.payoneer.com</a></li>
                    <li>Create a developer account or log in</li>
                    <li>Create an application</li>
                    <li>Copy Client ID + Secret from app settings</li>
                  </ol>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setPayoneerSettingsModal(false)}
                    className="flex-1 px-4 py-2.5 text-sm rounded-lg border transition-colors font-medium"
                    style={{ borderColor: 'var(--adm-border)', color: 'var(--adm-text-secondary)' }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={savePayoneerSettings}
                    disabled={savingSettings}
                    className="flex-1 px-4 py-2.5 text-sm rounded-lg text-white transition-colors disabled:opacity-50 font-medium"
                    style={{ backgroundColor: 'var(--adm-accent)' }}
                  >
                    {savingSettings ? 'Saving...' : 'Save Settings'}
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

