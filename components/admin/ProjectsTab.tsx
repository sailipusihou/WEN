"use client"
import { useState, useMemo } from "react"
import {
  Plus, ExternalLink, Share2, X, Check,
  Globe, User, AtSign, RefreshCw, AlertCircle,
  Instagram, Facebook, Twitter, Youtube, Linkedin,
  MessageCircle, Target, ChevronDown, ChevronRight, ChevronUp,
} from "lucide-react"
import AccountSelector, { type AccountSelectorValue } from "./AccountSelector"

const PLATFORM_INFO: Record<string, { name: string; icon: any; color: string; bgColor: string }> = {
  instagram: { name: 'Instagram', icon: Instagram, color: '#E4405F', bgColor: '#FFF0F3' },
  facebook: { name: 'Facebook', icon: Facebook, color: '#1877F2', bgColor: '#EEF2FF' },
  twitter: { name: 'X / Twitter', icon: Twitter, color: '#1DA1F2', bgColor: '#E0F2FE' },
  linkedin: { name: 'LinkedIn', icon: Linkedin, color: '#0077B5', bgColor: '#E0F2FE' },
  youtube: { name: 'YouTube', icon: Youtube, color: '#FF0000', bgColor: '#FEF2F2' },
  pinterest: { name: 'Pinterest', icon: Target, color: '#E60023', bgColor: '#FEF2F2' },
  tiktok: { name: 'TikTok', icon: MessageCircle, color: '#000000', bgColor: '#F3F4F6' },
}

interface ProjectsTabProps {
  socialAccounts: any[]
  staffMembers: any[]
  currentUser: any
  isAdmin: boolean
  onLogin: (platform: string) => void
  onDisconnect: (accountId: string) => void
  onShare: (account: any) => void
  selectedAccount: AccountSelectorValue | null
  onAccountChange: (value: AccountSelectorValue | null) => void
}

export default function ProjectsTab({
  socialAccounts,
  staffMembers,
  currentUser,
  isAdmin,
  onLogin,
  onDisconnect,
  onShare,
  selectedAccount,
  onAccountChange,
}: ProjectsTabProps) {
  // Build staff -> platform -> accounts hierarchy
  const hierarchy = useMemo(() => {
    const visibleAccounts = isAdmin
      ? socialAccounts
      : socialAccounts.filter(a => a.staffId === currentUser?.id)

    const staffMap = new Map<string, {
      staffId: string
      staffName: string
      staffAvatar?: string
      staffEmail?: string
      staffRole?: string
      platforms: Map<string, {
        platform: string
        platformName: string
        color: string
        bgColor: string
        Icon: any
        accounts: any[]
      }>
    }>()

    for (const a of visibleAccounts) {
      if (!staffMap.has(a.staffId)) {
        staffMap.set(a.staffId, {
          staffId: a.staffId,
          staffName: a.staffName,
          staffAvatar: a.staffAvatar,
          staffEmail: a.staffEmail,
          staffRole: a.staffRole,
          platforms: new Map(),
        })
      }
      const staff = staffMap.get(a.staffId)!
      if (!staff.platforms.has(a.platform)) {
        const pInfo = PLATFORM_INFO[a.platform] || { name: a.platform, color: '#6366F1', bgColor: '#EEF2FF', icon: Globe }
        staff.platforms.set(a.platform, {
          platform: a.platform,
          platformName: pInfo.name,
          color: pInfo.color,
          bgColor: pInfo.bgColor,
          Icon: pInfo.icon,
          accounts: [],
        })
      }
      staff.platforms.get(a.platform)!.accounts.push(a)
    }

    return Array.from(staffMap.values()).map(s => ({
      ...s,
      platforms: Array.from(s.platforms.values()),
      totalAccounts: Array.from(s.platforms.values()).reduce((sum, p) => sum + p.accounts.length, 0),
      connectedAccounts: Array.from(s.platforms.values()).reduce((sum, p) => sum + p.accounts.filter(a => a.status === 'connected').length, 0),
    }))
  }, [socialAccounts, staffMembers, isAdmin, currentUser])

  const totalAccounts = hierarchy.reduce((sum, s) => sum + s.totalAccounts, 0)
  const totalConnected = hierarchy.reduce((sum, s) => sum + s.connectedAccounts, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold" style={{ color: 'var(--adm-text)' }}>Social Account Projects</h2>
          <p className="text-sm" style={{ color: 'var(--adm-text-secondary)' }}>
            Manage all social accounts across staff and platforms
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ backgroundColor: 'var(--adm-input)' }}>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#22c55e' }} />
              <span className="text-xs font-medium" style={{ color: 'var(--adm-text)' }}>{totalConnected} connected</span>
            </div>
            <span className="text-xs" style={{ color: 'var(--adm-text-secondary)' }}>/ {totalAccounts} total</span>
          </div>
        </div>
      </div>

      {/* Account Selector */}
      <div className="rounded-2xl p-5" style={{ backgroundColor: 'var(--adm-card)', border: '1px solid var(--adm-border)' }}>
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--adm-text)' }}>
          <User size={16} style={{ color: 'var(--adm-accent)' }} />
          Select Staff → Platform → Account
        </h3>
        <AccountSelector
          socialAccounts={socialAccounts}
          staffMembers={staffMembers}
          currentUser={currentUser}
          isAdmin={isAdmin}
          value={selectedAccount}
          onChange={onAccountChange}
        />
      </div>

      {/* Account Cards by Staff */}
      {hierarchy.length === 0 ? (
        <div className="rounded-2xl p-12 text-center" style={{ backgroundColor: 'var(--adm-card)', border: '1px solid var(--adm-border)' }}>
          <Globe size={48} className="mx-auto mb-4 opacity-30" style={{ color: 'var(--adm-text-secondary)' }} />
          <p className="text-lg font-medium" style={{ color: 'var(--adm-text)' }}>No social accounts connected</p>
          <p className="text-sm mt-2" style={{ color: 'var(--adm-text-secondary)' }}>
            Go to the Social tab to connect accounts for your team
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {hierarchy.map(staff => (
            <StaffAccountGroup
              key={staff.staffId}
              staff={staff}
              isAdmin={isAdmin}
              selectedAccount={selectedAccount}
              onLogin={onLogin}
              onDisconnect={onDisconnect}
              onShare={onShare}
              onAccountChange={onAccountChange}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function StaffAccountGroup({
  staff,
  isAdmin,
  selectedAccount,
  onLogin,
  onDisconnect,
  onShare,
  onAccountChange,
}: {
  staff: any
  isAdmin: boolean
  selectedAccount: AccountSelectorValue | null
  onLogin: (platform: string) => void
  onDisconnect: (accountId: string) => void
  onShare: (account: any) => void
  onAccountChange: (value: AccountSelectorValue | null) => void
}) {
  const [expanded, setExpanded] = useState(true)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Flatten all accounts into a single list
  const allAccounts = useMemo(() => {
    const result: any[] = []
    for (const platform of staff.platforms) {
      for (const account of platform.accounts) {
        result.push({ ...account, _platform: platform })
      }
    }
    return result
  }, [staff.platforms])

  return (
    <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--adm-card)', border: '1px solid var(--adm-border)' }}>
      {/* Staff Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-4 px-5 py-4 transition-all"
        style={{ backgroundColor: 'var(--adm-card)' }}
      >
        <div className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0" style={{ backgroundColor: 'var(--adm-input)' }}>
          {staff.staffAvatar ? (
            <img src={staff.staffAvatar} alt="" className="w-full h-full object-cover" />
          ) : (
            <User size={20} style={{ color: 'var(--adm-text-secondary)' }} />
          )}
        </div>
        <div className="min-w-0 flex-1 text-left">
          <p className="text-sm font-semibold" style={{ color: 'var(--adm-text)' }}>{staff.staffName}</p>
          {isAdmin && staff.staffEmail && (
            <p className="text-xs" style={{ color: 'var(--adm-text-secondary)' }}>{staff.staffEmail} · {staff.staffRole}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex -space-x-1.5">
            {staff.platforms.slice(0, 4).map((p: any) => (
              <div
                key={p.platform}
                className="w-6 h-6 rounded-full flex items-center justify-center"
                style={{ backgroundColor: p.bgColor, border: '1.5px solid var(--adm-card)' }}
                title={p.platformName}
              >
                <p.Icon size={10} style={{ color: p.color }} />
              </div>
            ))}
            {staff.platforms.length > 4 && (
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-medium" style={{ backgroundColor: 'var(--adm-input)', border: '1.5px solid var(--adm-card)', color: 'var(--adm-text-secondary)' }}>
                +{staff.platforms.length - 4}
              </div>
            )}
          </div>
          <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: 'var(--adm-input)', color: 'var(--adm-text)' }}>
            {staff.connectedAccounts}/{staff.totalAccounts} accounts
          </span>
          {expanded ? <ChevronDown size={16} style={{ color: 'var(--adm-text-secondary)' }} /> : <ChevronRight size={16} style={{ color: 'var(--adm-text-secondary)' }} />}
        </div>
      </button>

      {/* Account Data Rows */}
      {expanded && (
        <div style={{ backgroundColor: 'var(--adm-input)' }}>
          {/* Table Header */}
          <div className="px-5 py-2 grid grid-cols-12 gap-2 items-center text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--adm-text-secondary)', borderBottom: '1px solid var(--adm-border)' }}>
            <div className="col-span-4">Account</div>
            <div className="col-span-2">Platform</div>
            <div className="col-span-1 text-center">Status</div>
            <div className="col-span-2 text-right">Clicks</div>
            <div className="col-span-1 text-right">Conv.</div>
            <div className="col-span-2 text-right">Actions</div>
          </div>

          {/* Data Rows */}
          <div className="divide-y" style={{ borderColor: 'var(--adm-border)' }}>
            {allAccounts.map((account: any) => {
              const isSelected = selectedAccount?.accountId === account.id
              const isConnected = account.status === 'connected'
              const isRowExpanded = expandedRows.has(account.id)
              const pInfo = account._platform

              return (
                <div key={account.id}>
                  {/* Main Row */}
                  <div
                    onClick={() => {
                      onAccountChange({
                        staffId: staff.staffId,
                        staffName: staff.staffName,
                        platform: account.platform,
                        accountId: account.id,
                        accountUsername: account.username,
                      })
                    }}
                    className="px-5 py-3 grid grid-cols-12 gap-2 items-center cursor-pointer transition-all hover:opacity-80"
                    style={{
                      backgroundColor: isSelected ? pInfo.bgColor : 'transparent',
                      borderLeft: isSelected ? `3px solid ${pInfo.color}` : '3px solid transparent',
                    }}
                  >
                    {/* Account info */}
                    <div className="col-span-4 flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0 relative" style={{ border: `2px solid ${pInfo.color}`, backgroundColor: 'var(--adm-card)' }}>
                        {account.avatar ? (
                          <img src={account.avatar} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center font-bold text-white text-xs" style={{ backgroundColor: pInfo.color }}>
                            {(account.username || '?')[0].toUpperCase()}
                          </div>
                        )}
                        {isConnected && (
                          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full" style={{ backgroundColor: '#22c55e', border: '1.5px solid var(--adm-card)' }} />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: 'var(--adm-text)' }}>@{account.username}</p>
                        <p className="text-[10px] truncate" style={{ color: 'var(--adm-text-secondary)' }}>{account.staffName}</p>
                      </div>
                    </div>

                    {/* Platform */}
                    <div className="col-span-2 flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0" style={{ backgroundColor: pInfo.bgColor }}>
                        <pInfo.Icon size={10} style={{ color: pInfo.color }} />
                      </div>
                      <span className="text-xs truncate" style={{ color: 'var(--adm-text-secondary)' }}>{pInfo.platformName}</span>
                    </div>

                    {/* Status */}
                    <div className="col-span-1 flex justify-center">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: isConnected ? '#22c55e' : '#F59E0B' }} title={isConnected ? 'Connected' : 'Expired'} />
                    </div>

                    {/* Clicks */}
                    <div className="col-span-2 text-right">
                      <span className="text-sm font-semibold" style={{ color: 'var(--adm-text)' }}>{(account.clicks || 0).toLocaleString()}</span>
                    </div>

                    {/* Conversions */}
                    <div className="col-span-1 text-right">
                      <span className="text-sm font-semibold" style={{ color: 'var(--adm-text)' }}>{(account.conversions || 0).toLocaleString()}</span>
                    </div>

                    {/* Actions */}
                    <div className="col-span-2 flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => toggleRow(account.id)}
                        className="p-1.5 rounded-lg transition-all"
                        style={{ backgroundColor: 'var(--adm-card)', color: 'var(--adm-text-secondary)' }}
                        title={isRowExpanded ? 'Collapse' : 'Expand'}
                      >
                        {isRowExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                      <button
                        onClick={() => onLogin(account.platform)}
                        className="p-1.5 rounded-lg transition-all"
                        style={{ backgroundColor: pInfo.color, color: 'white' }}
                        title="Open"
                      >
                        <ExternalLink size={12} />
                      </button>
                      <button
                        onClick={() => onShare(account)}
                        className="p-1.5 rounded-lg transition-all"
                        style={{ backgroundColor: 'var(--adm-card)', color: 'var(--adm-text-secondary)' }}
                        title="Share"
                      >
                        <Share2 size={12} />
                      </button>
                      <button
                        onClick={() => onDisconnect(account.id)}
                        className="p-1.5 rounded-lg transition-all"
                        style={{ backgroundColor: 'var(--adm-card)', color: '#EF4444' }}
                        title="Disconnect"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  </div>

                  {/* Expanded Row Detail */}
                  {isRowExpanded && (
                    <div className="px-5 py-4" style={{ backgroundColor: 'var(--adm-card)', borderTop: '1px solid var(--adm-border)' }}>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className="rounded-xl p-3" style={{ backgroundColor: 'var(--adm-input)' }}>
                          <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--adm-text-secondary)' }}>Total Clicks</p>
                          <p className="text-lg font-bold mt-0.5" style={{ color: 'var(--adm-text)' }}>{(account.clicks || 0).toLocaleString()}</p>
                        </div>
                        <div className="rounded-xl p-3" style={{ backgroundColor: 'var(--adm-input)' }}>
                          <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--adm-text-secondary)' }}>Conversions</p>
                          <p className="text-lg font-bold mt-0.5" style={{ color: '#166534' }}>{(account.conversions || 0).toLocaleString()}</p>
                        </div>
                        <div className="rounded-xl p-3" style={{ backgroundColor: 'var(--adm-input)' }}>
                          <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--adm-text-secondary)' }}>Revenue</p>
                          <p className="text-lg font-bold mt-0.5" style={{ color: '#166534' }}>${(account.revenue || 0).toLocaleString()}</p>
                        </div>
                        <div className="rounded-xl p-3" style={{ backgroundColor: 'var(--adm-input)' }}>
                          <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--adm-text-secondary)' }}>Rate</p>
                          <p className="text-lg font-bold mt-0.5" style={{ color: 'var(--adm-text)' }}>
                            {account.clicks > 0 ? `${((account.conversions / account.clicks) * 100).toFixed(1)}%` : '0%'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-3 pt-3" style={{ borderTop: '1px solid var(--adm-border)' }}>
                        <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--adm-text-secondary)' }}>Quick Actions:</span>
                        <button
                          onClick={() => onLogin(account.platform)}
                          className="px-3 py-1.5 text-xs rounded-lg font-medium flex items-center gap-1.5"
                          style={{ backgroundColor: pInfo.color, color: 'white' }}
                        >
                          <ExternalLink size={12} /> Open {pInfo.platformName}
                        </button>
                        <button
                          onClick={() => onShare(account)}
                          className="px-3 py-1.5 text-xs rounded-lg font-medium flex items-center gap-1.5"
                          style={{ backgroundColor: 'var(--adm-input)', color: 'var(--adm-text)' }}
                        >
                          <Share2 size={12} /> Share
                        </button>
                        <button
                          onClick={() => onDisconnect(account.id)}
                          className="px-3 py-1.5 text-xs rounded-lg font-medium flex items-center gap-1.5"
                          style={{ backgroundColor: 'var(--adm-input)', color: '#EF4444' }}
                        >
                          <X size={12} /> Disconnect
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {allAccounts.length === 0 && (
            <div className="px-5 py-8 text-center">
              <p className="text-sm" style={{ color: 'var(--adm-text-secondary)' }}>No accounts connected</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

