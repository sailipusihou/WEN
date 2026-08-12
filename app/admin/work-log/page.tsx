'use client'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { FileText, Search, Filter, ChevronDown, ChevronUp, Clock, User, Package, EyeOff, RefreshCw, Calendar } from 'lucide-react'

export default function AdminWorkLogPage() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<any>(null)
  const [search, setSearch] = useState('')
  const [filterAction, setFilterAction] = useState('all')
  const [filterOperator, setFilterOperator] = useState('all')
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [expanded, setExpanded] = useState<string | null>(null)

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const [r, s] = await Promise.all([
        fetch('/api/work-log'),
        fetch('/api/work-log?stats=true'),
      ])
      if (r.ok) setLogs(await r.json())
      if (s.ok) setStats(await s.json())
    } finally { setLoading(false) }
  }

  useEffect(() => {
    fetch("/api/auth/check").then(r => r.ok ? r.json() : null).then(d => {
      if (d?.user) {
        setCurrentUser(d.user)
        if (d.user.role !== "super_admin") {
          setFilterOperator(d.user.id)
        }
      }
    }).catch(() => {})
    fetchLogs()
  }, [])

  const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })

  const actionLabels: Record<string, string> = {
    order_status_update: 'Order Status Update',
    order_tracking_added: 'Tracking Added',
    order_staff_assignment: 'Staff Assignment',
    order_notes_updated: 'Notes Updated',
  }

  const actionColors: Record<string, string> = {
    order_status_update: 'text-blue-600',
    order_tracking_added: 'text-purple-600',
    order_staff_assignment: 'text-amber-600',
    order_notes_updated: 'text-gray-600',
  }

  const actionBgs: Record<string, string> = {
    order_status_update: 'bg-blue-100 dark:bg-blue-500/10',
    order_tracking_added: 'bg-purple-100 dark:bg-purple-500/10',
    order_staff_assignment: 'bg-amber-100 dark:bg-amber-500/10',
    order_notes_updated: 'bg-gray-100 dark:bg-gray-500/10',
  }

  const filtered = logs.filter(l => {
    if (filterAction !== 'all' && l.action !== filterAction) return false
    if (filterOperator !== 'all' && l.operatorId !== filterOperator && l.operatorName !== filterOperator) return false
    if (search) {
      const q = search.toLowerCase()
      return l.operatorName.toLowerCase().includes(q) ||
        l.details.toLowerCase().includes(q) ||
        (l.orderId || '').toLowerCase().includes(q) ||
        l.action.toLowerCase().includes(q)
    }
    return true
  })

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--adm-text)' }}>Work Log</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--adm-text-secondary)' }}>
            {stats?.total || 0} total operations logged
          </p>
        </div>
        <button onClick={fetchLogs}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          style={{ backgroundColor: 'var(--adm-accent)', color: 'white' }}>
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="rounded-xl p-4 border" style={{ backgroundColor: 'var(--adm-card)', borderColor: 'var(--adm-border)' }}>
            <p className="text-2xl font-bold" style={{ color: 'var(--adm-text)' }}>{stats.total}</p>
            <p className="text-xs mt-1" style={{ color: 'var(--adm-text-secondary)' }}>Total Operations</p>
          </div>
          <div className="rounded-xl p-4 border" style={{ backgroundColor: 'var(--adm-card)', borderColor: 'var(--adm-border)' }}>
            <p className="text-2xl font-bold" style={{ color: 'var(--adm-text)' }}>{stats.operators?.length || 0}</p>
            <p className="text-xs mt-1" style={{ color: 'var(--adm-text-secondary)' }}>Active Operators</p>
          </div>
          <div className="rounded-xl p-4 border" style={{ backgroundColor: 'var(--adm-card)', borderColor: 'var(--adm-border)' }}>
            <p className="text-2xl font-bold" style={{ color: 'var(--adm-text)' }}>{stats.actions?.length || 0}</p>
            <p className="text-xs mt-1" style={{ color: 'var(--adm-text-secondary)' }}>Action Types</p>
          </div>
          <div className="rounded-xl p-4 border" style={{ backgroundColor: 'var(--adm-card)', borderColor: 'var(--adm-border)' }}>
            <p className="text-2xl font-bold" style={{ color: 'var(--adm-text)' }}>{logs.length > 0 ? (() => { const first = new Date(logs[0]?.timestamp).getTime(); const last = new Date(logs[logs.length-1]?.timestamp).getTime(); const hrs = Math.round((first - last) / 3600000); return hrs > 24 ? Math.round(hrs/24) + 'd' : hrs + 'h' })() : '-'}</p>
            <p className="text-xs mt-1" style={{ color: 'var(--adm-text-secondary)' }}>Time Span</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--adm-text-secondary)' }} />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by operator, order ID, or details..."
            className="w-full pl-9 pr-4 py-2.5 rounded-lg text-sm"
            style={{ backgroundColor: 'var(--adm-input)', border: '1px solid var(--adm-input-border)', color: 'var(--adm-text)' }} />
        </div>
        <select value={filterAction} onChange={e => setFilterAction(e.target.value)}
          className="px-3 py-2.5 rounded-lg text-sm"
          style={{ backgroundColor: 'var(--adm-input)', border: '1px solid var(--adm-input-border)', color: 'var(--adm-text)' }}>
          <option value="all">All Actions</option>
          {stats?.actions?.map((a: any) => (
            <option key={a.action} value={a.action}>{actionLabels[a.action] || a.action} ({a.count})</option>
          ))}
        </select>
        {currentUser?.role === "super_admin" ? (
          <select value={filterOperator} onChange={e => setFilterOperator(e.target.value)}
            className="px-3 py-2.5 rounded-lg text-sm"
            style={{ backgroundColor: 'var(--adm-input)', border: '1px solid var(--adm-input-border)', color: 'var(--adm-text)' }}>
            <option value="all">All Operators</option>
            {stats?.operators?.map((o: any) => (
              <option key={o.id} value={o.id}>{o.name} ({o.role}) - {o.count} ops</option>
            ))}
          </select>
        ) : (
          <div className="px-3 py-2.5 rounded-lg text-sm" style={{ backgroundColor: 'var(--adm-input)', color: 'var(--adm-text-secondary)' }}>
            My logs only
          </div>
        )}
      </div>

      {/* Log List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <FileText size={40} className="mx-auto mb-3" style={{ color: 'var(--adm-text-secondary)' }} />
          <p className="text-sm" style={{ color: 'var(--adm-text-secondary)' }}>No work log entries found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((entry) => (
            <div key={entry.id} className="rounded-xl border overflow-hidden transition-all"
              style={{ backgroundColor: 'var(--adm-card)', borderColor: 'var(--adm-border)' }}>
              <div onClick={() => setExpanded(expanded === entry.id ? null : entry.id)}
                className="p-4 flex items-center justify-between cursor-pointer transition-all adm-hover-bg">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {/* Operator avatar */}
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                    style={{ backgroundColor: 'var(--adm-accent)', color: 'white' }}>
                    {entry.operatorName?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium truncate" style={{ color: 'var(--adm-text)' }}>
                        {entry.operatorName}
                      </span>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${actionBgs[entry.action] || 'bg-gray-100 dark:bg-gray-500/10'} ${actionColors[entry.action] || 'text-gray-600'}`}>
                        {actionLabels[entry.action] || entry.action}
                      </span>
                    </div>
                    <p className="text-xs truncate mt-0.5" style={{ color: 'var(--adm-text-secondary)' }}>
                      {entry.details || 'No details'}
                      {entry.orderId ? ` - Order: ${entry.orderId}` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-3">
                  <span className="text-xs whitespace-nowrap" style={{ color: 'var(--adm-text-secondary)' }}>
                    {fmtDate(entry.timestamp)}
                  </span>
                  <span style={{ color: 'var(--adm-text-secondary)' }}>
                    {expanded === entry.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </span>
                </div>
              </div>
              {expanded === entry.id && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                  className="border-t overflow-hidden" style={{ borderColor: 'var(--adm-border)' }}>
                  <div className="p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <p className="font-medium mb-1" style={{ color: 'var(--adm-text)' }}>Operation ID</p>
                        <p style={{ color: 'var(--adm-text-secondary)' }} className="font-mono">{entry.id}</p>
                      </div>
                      <div>
                        <p className="font-medium mb-1" style={{ color: 'var(--adm-text)' }}>Operator</p>
                        <p style={{ color: 'var(--adm-text-secondary)' }}>{entry.operatorName} ({entry.operatorRole})</p>
                      </div>
                      <div>
                        <p className="font-medium mb-1" style={{ color: 'var(--adm-text)' }}>Timestamp</p>
                        <p style={{ color: 'var(--adm-text-secondary)' }}>{fmtDate(entry.timestamp)}</p>
                      </div>
                      <div>
                        <p className="font-medium mb-1" style={{ color: 'var(--adm-text)' }}>Category</p>
                        <p style={{ color: 'var(--adm-text-secondary)' }}>{entry.category || 'general'}</p>
                      </div>
                      {entry.orderId && (
                        <div>
                          <p className="font-medium mb-1" style={{ color: 'var(--adm-text)' }}>Order ID</p>
                          <p style={{ color: 'var(--adm-text-secondary)' }} className="font-mono">{entry.orderId}</p>
                        </div>
                      )}
                      <div>
                        <p className="font-medium mb-1" style={{ color: 'var(--adm-text)' }}>Action</p>
                        <p style={{ color: 'var(--adm-text-secondary)' }}>{actionLabels[entry.action] || entry.action}</p>
                      </div>
                    </div>
                    <div>
                      <p className="font-medium mb-1 text-xs" style={{ color: 'var(--adm-text)' }}>Details</p>
                      <p className="text-xs p-3 rounded-lg" style={{ backgroundColor: 'var(--adm-input)', color: 'var(--adm-text-secondary)' }}>
                        {entry.details || 'No details provided'}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}



