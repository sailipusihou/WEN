'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Check, Upload, Search } from 'lucide-react'
import { CULTURAL_AVATARS, LEGACY_STAFF_AVATARS, findAvatarMeta, type CulturalAvatar } from '@/lib/avatars'

interface AvatarPickerProps {
  open: boolean
  currentAvatar: string
  onClose: () => void
  onSelect: (url: string) => void
}

export default function AvatarPicker({ open, currentAvatar, onClose, onSelect }: AvatarPickerProps) {
  const [tab, setTab] = useState<'cultural' | 'legacy' | 'upload'>('cultural')
  const [search, setSearch] = useState('')
  const [uploadedAvatars, setUploadedAvatars] = useState<CulturalAvatar[]>([])
  const [uploading, setUploading] = useState(false)

  // 加载用户上传的头像 (/api/avatars 返回 public/avatars 下所有文件,排除 cultural/staff 前缀的)
  useEffect(() => {
    if (!open) return
    fetch('/api/avatars')
      .then(r => r.ok ? r.json() : [])
      .then((files: any[]) => {
        const known = new Set([...CULTURAL_AVATARS, ...LEGACY_STAFF_AVATARS].map(a => a.url))
        const extras = files
          .filter((f: any) => !known.has(f.url))
          .map((f: any) => ({
            url: f.url,
            name: f.name || 'Custom Avatar',
            era: '',
            role: 'Upload',
            intro: 'User uploaded avatar',
          }))
        setUploadedAvatars(extras)
      })
      .catch(() => {})
  }, [open])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { alert('Max 5MB'); return }
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const r = await fetch('/api/avatars', { method: 'POST', body: fd })
      if (r.ok) {
        const d = await r.json()
        onSelect(d.url)
        onClose()
      } else {
        alert('Upload failed')
      }
    } catch {
      alert('Upload failed')
    } finally {
      setUploading(false)
    }
  }

  // 过滤文化人物
  const filteredCultural = CULTURAL_AVATARS.filter(a => {
    if (!search) return true
    const q = search.toLowerCase()
    return a.name.includes(search) || a.era.includes(search) || a.role.includes(search) || a.intro.includes(search)
  })

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-4xl max-h-[85vh] flex flex-col rounded-2xl overflow-hidden shadow-2xl"
            style={{ backgroundColor: 'var(--adm-bg)', border: '1px solid var(--adm-border)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 头部 */}
            <div className="flex items-center justify-between p-5 border-b shrink-0" style={{ borderColor: 'var(--adm-border)' }}>
              <div>
                <h3 className="text-lg font-bold" style={{ color: 'var(--adm-text)' }}>Select Staff Avatar</h3>
                <p className="text-xs mt-0.5" style={{ color: 'var(--adm-text-secondary)' }}>
                  Click an avatar to select · {CULTURAL_AVATARS.length} cultural figures available
                </p>
              </div>
              <button onClick={onClose}
                className="p-2 rounded-lg transition-colors"
                style={{ color: 'var(--adm-text-secondary)' }}>
                <X size={18} />
              </button>
            </div>

            {/* 标签切换 + 搜索 */}
            <div className="flex items-center gap-3 p-4 border-b shrink-0" style={{ borderColor: 'var(--adm-border)' }}>
              <div className="flex gap-1">
                <button onClick={() => setTab('cultural')}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"
                  style={{
                    backgroundColor: tab === 'cultural' ? 'var(--adm-accent)' : 'var(--adm-input)',
                    color: tab === 'cultural' ? 'white' : 'var(--adm-text-secondary)',
                  }}>
                  Cultural Figures ({CULTURAL_AVATARS.length})
                </button>
                {uploadedAvatars.length > 0 && (
                  <button onClick={() => setTab('legacy')}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"
                    style={{
                      backgroundColor: tab === 'legacy' ? 'var(--adm-accent)' : 'var(--adm-input)',
                      color: tab === 'legacy' ? 'white' : 'var(--adm-text-secondary)',
                    }}>
                    Uploaded ({uploadedAvatars.length})
                  </button>
                )}
                <button onClick={() => setTab('upload')}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg transition-colors inline-flex items-center gap-1"
                  style={{
                    backgroundColor: tab === 'upload' ? 'var(--adm-accent)' : 'var(--adm-input)',
                    color: tab === 'upload' ? 'white' : 'var(--adm-text-secondary)',
                  }}>
                  <Upload size={12} /> Upload
                </button>
              </div>
              {tab === 'cultural' && (
                <div className="relative flex-1 max-w-xs ml-auto">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--adm-text-secondary)' }} />
                  <input value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Search by name / era / role"
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg"
                    style={{ backgroundColor: 'var(--adm-input)', border: '1px solid var(--adm-input-border)', color: 'var(--adm-text)' }} />
                </div>
              )}
            </div>

            {/* 内容区 */}
            <div className="flex-1 overflow-y-auto p-4">
              {tab === 'upload' ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <label className="cursor-pointer">
                    <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
                    <div className="w-24 h-24 rounded-full flex items-center justify-center border-2 border-dashed"
                      style={{ borderColor: 'var(--adm-input-border)', color: 'var(--adm-text-secondary)' }}>
                      <Upload size={32} />
                    </div>
                    <p className="text-sm text-center mt-3" style={{ color: 'var(--adm-text)' }}>
                      {uploading ? 'Uploading...' : 'Click to upload avatar'}
                    </p>
                    <p className="text-xs text-center mt-1" style={{ color: 'var(--adm-text-secondary)' }}>
                      Supports PNG/JPG/SVG/WebP, max 5MB
                    </p>
                  </label>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {(tab === 'cultural' ? filteredCultural : uploadedAvatars).map((av) => {
                    const selected = currentAvatar === av.url
                    return (
                      <motion.button
                        key={av.url}
                        whileHover={{ y: -2 }}
                        onClick={() => { onSelect(av.url); onClose() }}
                        className="relative text-left rounded-xl overflow-hidden border-2 transition-all p-3 flex gap-3 items-start"
                        style={{
                          borderColor: selected ? 'var(--adm-accent)' : 'var(--adm-border)',
                          backgroundColor: selected ? 'var(--adm-accent-bg)' : 'var(--adm-card)',
                        }}
                      >
                        {/* 头像 */}
                        <div className="w-14 h-14 rounded-full overflow-hidden shrink-0 border-2"
                          style={{ borderColor: selected ? 'var(--adm-accent)' : 'var(--adm-input-border)' }}>
                          <img src={av.url} alt={av.name} className="w-full h-full object-cover" />
                        </div>
                        {/* 名称介绍 */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-sm font-bold" style={{ color: 'var(--adm-text)' }}>{av.name}</span>
                            {selected && <Check size={14} style={{ color: 'var(--adm-accent)' }} />}
                          </div>
                          {av.era && (
                            <span className="text-[10px] inline-block mt-0.5 px-1.5 py-0.5 rounded"
                              style={{ backgroundColor: 'var(--adm-accent-bg)', color: 'var(--adm-accent)' }}>
                              {av.era} · {av.role}
                            </span>
                          )}
                          <p className="text-[11px] mt-1.5 leading-relaxed line-clamp-3"
                            style={{ color: 'var(--adm-text-secondary)' }}>
                            {av.intro}
                          </p>
                        </div>
                      </motion.button>
                    )
                  })}
                  {tab === 'cultural' && filteredCultural.length === 0 && (
                    <div className="col-span-full text-center py-16" style={{ color: 'var(--adm-text-secondary)' }}>
                      No matching figures found
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 底部 - 当前选中预览 */}
            {currentAvatar && (
              <div className="flex items-center gap-3 p-4 border-t" style={{ borderColor: 'var(--adm-border)', backgroundColor: 'var(--adm-input)' }}>
                <span className="text-xs" style={{ color: 'var(--adm-text-secondary)' }}>Current:</span>
                <div className="w-8 h-8 rounded-full overflow-hidden border" style={{ borderColor: 'var(--adm-input-border)' }}>
                  <img src={currentAvatar} alt="" className="w-full h-full object-cover" />
                </div>
                {(() => {
                  const meta = findAvatarMeta(currentAvatar)
                  return meta ? (
                    <span className="text-xs" style={{ color: 'var(--adm-text)' }}>
                      {meta.name} {meta.era && `· ${meta.era}`} {meta.role && `· ${meta.role}`}
                    </span>
                  ) : (
                    <span className="text-xs" style={{ color: 'var(--adm-text)' }}>Custom Avatar</span>
                  )
                })()}
                <button onClick={() => { onSelect(''); }}
                  className="ml-auto text-xs px-3 py-1.5 rounded-lg transition-colors"
                  style={{ backgroundColor: 'var(--adm-card)', color: 'var(--adm-text-secondary)', border: '1px solid var(--adm-input-border)' }}>
                  Clear Avatar
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
