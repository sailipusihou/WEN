"use client"
import { useMemo } from "react"
import {
  User, ChevronRight, Check, Globe,
  Instagram, Facebook, Youtube, Linkedin,
  MessageCircle, Target, AtSign
} from "lucide-react"
import XLogo from "@/components/ui/XLogo"

const PLATFORM_INFO: Record<string, { name: string; icon: any; color: string; bgColor: string }> = {
  instagram: { name: 'Instagram', icon: Instagram, color: '#E4405F', bgColor: '#FFF0F3' },
  facebook: { name: 'Facebook', icon: Facebook, color: '#1877F2', bgColor: '#EEF2FF' },
  twitter: { name: 'X', icon: XLogo, color: '#000000', bgColor: '#E0F2FE' },
  linkedin: { name: 'LinkedIn', icon: Linkedin, color: '#0077B5', bgColor: '#E0F2FE' },
  youtube: { name: 'YouTube', icon: Youtube, color: '#FF0000', bgColor: '#FEF2F2' },
  pinterest: { name: 'Pinterest', icon: Target, color: '#E60023', bgColor: '#FEF2F2' },
  tiktok: { name: 'TikTok', icon: MessageCircle, color: '#000000', bgColor: '#F3F4F6' },
}

export interface AccountSelectorValue {
  staffId: string
  staffName: string
  platform: string
  accountId: string
  accountUsername: string
}

interface AccountSelectorProps {
  socialAccounts: any[]
  staffMembers: any[]
  currentUser: any
  isAdmin: boolean
  value: AccountSelectorValue | null
  onChange: (value: AccountSelectorValue | null) => void
  compact?: boolean
  showAllOption?: boolean
}

export default function AccountSelector({
  socialAccounts,
  staffMembers,
  currentUser,
  isAdmin,
  value,
  onChange,
  compact = false,
  showAllOption = true,
}: AccountSelectorProps) {
  // Build the hierarchy: staff -> platform -> accounts
  const hierarchy = useMemo(() => {
    const visibleAccounts = isAdmin
      ? socialAccounts.filter(a => a.status === 'connected')
      : socialAccounts.filter(a => a.staffId === currentUser?.id && a.status === 'connected')

    const staffMap = new Map<string, {
      staffId: string
      staffName: string
      staffAvatar?: string
      platforms: Map<string, {
        platform: string
        platformName: string
        color: string
        bgColor: string
        accounts: any[]
      }>
    }>()

    for (const a of visibleAccounts) {
      if (!staffMap.has(a.staffId)) {
        staffMap.set(a.staffId, {
          staffId: a.staffId,
          staffName: a.staffName,
          staffAvatar: a.staffAvatar,
          platforms: new Map(),
        })
      }
      const staff = staffMap.get(a.staffId)!
      if (!staff.platforms.has(a.platform)) {
        const pInfo = PLATFORM_INFO[a.platform] || { name: a.platform, color: '#6366F1', bgColor: '#EEF2FF' }
        staff.platforms.set(a.platform, {
          platform: a.platform,
          platformName: pInfo.name,
          color: pInfo.color,
          bgColor: pInfo.bgColor,
          accounts: [],
        })
      }
      staff.platforms.get(a.platform)!.accounts.push(a)
    }

    return Array.from(staffMap.values()).map(s => ({
      ...s,
      platforms: Array.from(s.platforms.values()),
    }))
  }, [socialAccounts, staffMembers, isAdmin, currentUser])

  // Current selection state
  const selectedStaff = value?.staffId || ''
  const selectedPlatform = value?.platform || ''
  const selectedAccountId = value?.accountId || ''

  const handleStaffSelect = (staffId: string) => {
    const staff = hierarchy.find(s => s.staffId === staffId)
    if (!staff) return
    // Auto-select first platform and account
    const firstPlatform = staff.platforms[0]
    if (firstPlatform && firstPlatform.accounts.length > 0) {
      onChange({
        staffId: staff.staffId,
        staffName: staff.staffName,
        platform: firstPlatform.platform,
        accountId: firstPlatform.accounts[0].id,
        accountUsername: firstPlatform.accounts[0].username,
      })
    }
  }

  const handlePlatformSelect = (staffId: string, platform: string) => {
    const staff = hierarchy.find(s => s.staffId === staffId)
    if (!staff) return
    const plat = staff.platforms.find(p => p.platform === platform)
    if (plat && plat.accounts.length > 0) {
      onChange({
        staffId: staff.staffId,
        staffName: staff.staffName,
        platform: plat.platform,
        accountId: plat.accounts[0].id,
        accountUsername: plat.accounts[0].username,
      })
    }
  }

  const handleAccountSelect = (staffId: string, staffName: string, platform: string, accountId: string, accountUsername: string) => {
    onChange({
      staffId,
      staffName,
      platform,
      accountId,
      accountUsername,
    })
  }

  const handleClear = () => {
    onChange(null)
  }

  if (compact) {
    // Compact mode: single row of pills
    return (
      <div className="flex items-center gap-2 flex-wrap">
        {/* Staff selector */}
        <div className="flex items-center gap-1.5">
          <User size={14} style={{ color: 'var(--adm-text-secondary)' }} />
          <select
            value={selectedStaff}
            onChange={(e) => {
              const v = e.target.value
              if (v === 'all') { onChange(null); return }
              handleStaffSelect(v)
            }}
            className="text-xs rounded-lg px-2 py-1.5"
            style={{
              backgroundColor: 'var(--adm-input)',
              color: 'var(--adm-text)',
              border: '1px solid var(--adm-border)',
              outline: 'none',
            }}
          >
            {showAllOption && <option value="all">All Staff</option>}
            {hierarchy.map(s => (
              <option key={s.staffId} value={s.staffId}>{s.staffName}</option>
            ))}
          </select>
        </div>

        {selectedStaff && selectedStaff !== 'all' && (
          <>
            <ChevronRight size={12} style={{ color: 'var(--adm-text-secondary)' }} />
            <div className="flex items-center gap-1.5">
              <Globe size={14} style={{ color: 'var(--adm-text-secondary)' }} />
              <select
                value={selectedPlatform}
                onChange={(e) => handlePlatformSelect(selectedStaff, e.target.value)}
                className="text-xs rounded-lg px-2 py-1.5"
                style={{
                  backgroundColor: 'var(--adm-input)',
                  color: 'var(--adm-text)',
                  border: '1px solid var(--adm-border)',
                  outline: 'none',
                }}
              >
                {hierarchy.find(s => s.staffId === selectedStaff)?.platforms.map(p => (
                  <option key={p.platform} value={p.platform}>{p.platformName}</option>
                ))}
              </select>
            </div>

            {selectedPlatform && (
              <>
                <ChevronRight size={12} style={{ color: 'var(--adm-text-secondary)' }} />
                <div className="flex items-center gap-1.5">
                  <AtSign size={14} style={{ color: 'var(--adm-text-secondary)' }} />
                  <select
                    value={selectedAccountId}
                    onChange={(e) => {
                      const staff = hierarchy.find(s => s.staffId === selectedStaff)
                      const plat = staff?.platforms.find(p => p.platform === selectedPlatform)
                      const acc = plat?.accounts.find(a => a.id === e.target.value)
                      if (acc) {
                        handleAccountSelect(selectedStaff, staff!.staffName, selectedPlatform, acc.id, acc.username)
                      }
                    }}
                    className="text-xs rounded-lg px-2 py-1.5"
                    style={{
                      backgroundColor: 'var(--adm-input)',
                      color: 'var(--adm-text)',
                      border: '1px solid var(--adm-border)',
                      outline: 'none',
                    }}
                  >
                    {hierarchy.find(s => s.staffId === selectedStaff)?.platforms.find(p => p.platform === selectedPlatform)?.accounts.map(a => (
                      <option key={a.id} value={a.id}>@{a.username}</option>
                    ))}
                  </select>
                </div>
              </>
            )}
          </>
        )}
      </div>
    )
  }

  // Full mode: three-column selector
  return (
    <div className="space-y-4">
      {/* Top bar: selected summary */}
      {value && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ backgroundColor: 'var(--adm-input)' }}>
          <span className="text-xs font-medium" style={{ color: 'var(--adm-text-secondary)' }}>Selected:</span>
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--adm-card)', color: 'var(--adm-text)' }}>
            {value.staffName}
          </span>
          <ChevronRight size={12} style={{ color: 'var(--adm-text-secondary)' }} />
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--adm-card)', color: 'var(--adm-text)' }}>
            {PLATFORM_INFO[value.platform]?.name || value.platform}
          </span>
          <ChevronRight size={12} style={{ color: 'var(--adm-text-secondary)' }} />
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--adm-card)', color: 'var(--adm-text)' }}>
            @{value.accountUsername}
          </span>
          <button
            onClick={handleClear}
            className="ml-auto text-xs px-2 py-0.5 rounded"
            style={{ color: 'var(--adm-text-secondary)' }}
          >
            Clear
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Column 1: Staff */}
        <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--adm-card)', border: '1px solid var(--adm-border)' }}>
          <h4 className="text-xs font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--adm-text-secondary)' }}>
            <User size={14} /> Staff Member
          </h4>
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {showAllOption && (
              <button
                onClick={handleClear}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all"
                style={{
                  backgroundColor: !selectedStaff ? 'var(--adm-accent)' : 'var(--adm-input)',
                  color: !selectedStaff ? 'var(--adm-accent-text)' : 'var(--adm-text)',
                }}
              >
                <Globe size={16} />
                <span className="text-sm font-medium">All Accounts</span>
                {!selectedStaff && <Check size={14} className="ml-auto" />}
              </button>
            )}
            {hierarchy.map(staff => (
              <button
                key={staff.staffId}
                onClick={() => handleStaffSelect(staff.staffId)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all"
                style={{
                  backgroundColor: selectedStaff === staff.staffId ? 'var(--adm-accent)' : 'var(--adm-input)',
                  color: selectedStaff === staff.staffId ? 'var(--adm-accent-text)' : 'var(--adm-text)',
                }}
              >
                <div className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0" style={{ backgroundColor: 'var(--adm-card)' }}>
                  {staff.staffAvatar ? (
                    <img src={staff.staffAvatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <User size={16} style={{ color: 'var(--adm-text-secondary)' }} />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{staff.staffName}</p>
                  <p className="text-[10px]" style={{ color: 'var(--adm-text-secondary)' }}>
                    {staff.platforms.reduce((sum, p) => sum + p.accounts.length, 0)} accounts
                  </p>
                </div>
                {selectedStaff === staff.staffId && <Check size={14} className="ml-auto flex-shrink-0" />}
              </button>
            ))}
          </div>
        </div>

        {/* Column 2: Platform */}
        <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--adm-card)', border: '1px solid var(--adm-border)' }}>
          <h4 className="text-xs font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--adm-text-secondary)' }}>
            <Globe size={14} /> Platform
          </h4>
          {!selectedStaff ? (
            <p className="text-xs text-center py-8" style={{ color: 'var(--adm-text-secondary)' }}>Select a staff member first</p>
          ) : (
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {hierarchy.find(s => s.staffId === selectedStaff)?.platforms.map(plat => (
                <button
                  key={plat.platform}
                  onClick={() => handlePlatformSelect(selectedStaff, plat.platform)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all"
                  style={{
                    backgroundColor: selectedPlatform === plat.platform ? plat.color : 'var(--adm-input)',
                    color: selectedPlatform === plat.platform ? 'white' : 'var(--adm-text)',
                  }}
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'white' }}>
                    {(() => {
                      const IconComp = PLATFORM_INFO[plat.platform]?.icon || Globe
                      return <IconComp size={16} style={{ color: plat.color }} />
                    })()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{plat.platformName}</p>
                    <p className="text-[10px]" style={{ color: selectedPlatform === plat.platform ? 'rgba(255,255,255,0.7)' : 'var(--adm-text-secondary)' }}>
                      {plat.accounts.length} account{plat.accounts.length > 1 ? 's' : ''}
                    </p>
                  </div>
                  {selectedPlatform === plat.platform && <Check size={14} className="ml-auto flex-shrink-0" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Column 3: Account */}
        <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--adm-card)', border: '1px solid var(--adm-border)' }}>
          <h4 className="text-xs font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--adm-text-secondary)' }}>
            <AtSign size={14} /> Account
          </h4>
          {!selectedPlatform ? (
            <p className="text-xs text-center py-8" style={{ color: 'var(--adm-text-secondary)' }}>Select a platform first</p>
          ) : (
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {hierarchy.find(s => s.staffId === selectedStaff)?.platforms.find(p => p.platform === selectedPlatform)?.accounts.map(account => {
                const pInfo = PLATFORM_INFO[account.platform] || { name: account.platform, color: '#6366F1', bgColor: '#EEF2FF' }
                const isSelected = selectedAccountId === account.id
                return (
                  <button
                    key={account.id}
                    onClick={() => handleAccountSelect(selectedStaff, account.staffName, selectedPlatform, account.id, account.username)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all"
                    style={{
                      backgroundColor: isSelected ? pInfo.bgColor : 'var(--adm-input)',
                      border: isSelected ? `1.5px solid ${pInfo.color}` : '1px solid transparent',
                    }}
                  >
                    <div className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0" style={{ border: `1.5px solid ${pInfo.color}`, backgroundColor: 'var(--adm-card)' }}>
                      {account.staffAvatar ? (
                        <img src={account.staffAvatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-white" style={{ backgroundColor: pInfo.color }}>
                          {(account.username || '?')[0].toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">@{account.username}</p>
                      <p className="text-[10px]" style={{ color: 'var(--adm-text-secondary)' }}>{account.staffName}</p>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-5 h-5 rounded flex items-center justify-center" style={{ backgroundColor: 'white' }}>
                        {(() => {
                          const IconComp = PLATFORM_INFO[account.platform]?.icon || Globe
                          return <IconComp size={10} style={{ color: pInfo.color }} />
                        })()}
                      </div>
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#22c55e' }} title="Connected" />
                    </div>
                    {isSelected && <Check size={14} style={{ color: pInfo.color }} />}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}