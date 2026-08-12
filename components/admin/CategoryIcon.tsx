'use client'

import { useState, useRef, useEffect } from 'react'
import { Upload, X, Image } from 'lucide-react'

export type IconType = 'tea' | 'incense' | 'ceramic' | 'living' | 'default'

export interface CategoryIconProps {
  icon?: string
  size?: number
  className?: string
}

const iconStyles: Record<string, { tea: boolean; incense: boolean; ceramic: boolean; living: boolean }> = {
  'tea': { tea: true, incense: false, ceramic: false, living: false },
  'incense': { tea: false, incense: true, ceramic: false, living: false },
  'ceramic': { tea: false, incense: false, ceramic: true, living: false },
  'living': { tea: false, incense: false, ceramic: false, living: true },
  'default': { tea: false, incense: false, ceramic: false, living: false },
}

const isUrl = (str: string) => /^https?:\/\//i.test(str) || str.startsWith('/api/uploads') || str.startsWith('/uploads/')

function DefaultIcon({ iconStyle, className }: { iconStyle: React.CSSProperties; className: string }) {
  return (
    <svg viewBox="0 0 64 64" style={iconStyle} className={className}>
      <rect x="14" y="20" width="36" height="30" rx="4" fill="#D8D0C0" />
      <rect x="20" y="26" width="24" height="18" fill="#E8E4D9" />
      <path d="M14 20 L32 10 L50 20" fill="#8BA8A0" />
      <circle cx="32" cy="32" r="4" fill="#8BA8A0" opacity="0.5" />
      <ellipse cx="32" cy="53" rx="15" ry="3" fill="#E0D8C8" opacity="0.3" />
    </svg>
  )
}

export function CategoryIcon({ icon = 'default', size = 36, className = '' }: CategoryIconProps) {
  const iconStyle = {
    width: size,
    height: size,
    display: 'inline-block',
  }
  const [imgError, setImgError] = useState(false)

  if (isUrl(icon) && !imgError) {
    return (
      <div
        style={{
          ...iconStyle,
          borderRadius: '8px',
          backgroundColor: 'var(--adm-input, #f5f5f5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          padding: size * 0.1,
        }}
        className={className}
      >
        <img
          src={icon}
          alt="Custom Icon"
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: 'contain',
            display: 'block',
          }}
          onError={() => setImgError(true)}
        />
      </div>
    )
  }

  if (isUrl(icon) && imgError) {
    return <DefaultIcon iconStyle={iconStyle} className={className} />
  }

  const types = iconStyles[icon as keyof typeof iconStyles] || iconStyles['default']

  if (types.tea) {
    return (
      <svg viewBox="0 0 64 64" style={iconStyle} className={className}>
        <defs>
          <linearGradient id="teaGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8B6914" />
            <stop offset="100%" stopColor="#5D4E37" />
          </linearGradient>
          <linearGradient id="teaLight" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#A08030" />
            <stop offset="100%" stopColor="#6B5420" />
          </linearGradient>
        </defs>
        <ellipse cx="32" cy="56" rx="18" ry="4" fill="#E8E0D0" opacity="0.4" />
        <path d="M20 30 L20 42 Q20 46 24 46 L40 46 Q44 46 44 42 L44 30 L40 26 L24 26 Z" fill="url(#teaGradient)" />
        <ellipse cx="32" cy="28" rx="10" ry="4" fill="url(#teaLight)" />
        <path d="M44 30 L54 28 L54 22 Q54 20 52 20 L44 20" fill="url(#teaGradient)" />
        <ellipse cx="54" cy="21" rx="3" ry="4" fill="url(#teaLight)" />
        <path d="M32 26 L32 20 Q32 16 36 16 L40 16" stroke="#5D4E37" strokeWidth="2" fill="none" strokeLinecap="round" />
        <ellipse cx="38" cy="14" rx="4" ry="3" fill="#5D4E37" />
        <path d="M16 48 L22 42 L24 48" stroke="#8BA8A0" strokeWidth="1.5" fill="none" opacity="0.6" />
        <path d="M12 50 L20 43 L22 50" stroke="#8BA8A0" strokeWidth="1.5" fill="none" opacity="0.6" />
        <ellipse cx="28" cy="38" rx="4" ry="6" fill="#C4A45E" opacity="0.3" />
        <ellipse cx="36" cy="38" rx="4" ry="6" fill="#C4A45E" opacity="0.3" />
      </svg>
    )
  }

  if (types.incense) {
    return (
      <svg viewBox="0 0 64 64" style={iconStyle} className={className}>
        <defs>
          <linearGradient id="incenseStick" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#8B7355" />
            <stop offset="100%" stopColor="#5D4E37" />
          </linearGradient>
        </defs>
        <rect x="28" y="15" width="8" height="40" rx="2" fill="url(#incenseStick)" />
        <circle cx="32" cy="15" r="3" fill="#C49A5E" />
        <circle cx="32" cy="12" r="2" fill="#FF8C00" opacity="0.8">
          <animate attributeName="r" values="2;4;2" dur="2s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.8;0.4;0.8" dur="2s" repeatCount="indefinite" />
        </circle>
        <path d="M32 8 Q30 4 34 2 Q38 0 32 -2" stroke="#D4A574" strokeWidth="1.5" fill="none" opacity="0.7">
          <animate attributeName="d" values="M32 8 Q30 4 34 2 Q38 0 32 -2;M32 8 Q34 4 30 2 Q26 0 32 -2;M32 8 Q30 4 34 2 Q38 0 32 -2" dur="3s" repeatCount="indefinite" />
        </path>
        <path d="M32 6 Q33 2 31 0" stroke="#D4A574" strokeWidth="1" fill="none" opacity="0.5">
          <animate attributeName="d" values="M32 6 Q33 2 31 0;M32 6 Q29 2 33 0;M32 6 Q33 2 31 0" dur="2.5s" repeatCount="indefinite" />
        </path>
        <ellipse cx="32" cy="58" rx="12" ry="3" fill="#E8E0D0" opacity="0.3" />
        <rect x="22" y="52" width="20" height="4" rx="2" fill="#A0885A" />
      </svg>
    )
  }

  if (types.ceramic) {
    return (
      <svg viewBox="0 0 64 64" style={iconStyle} className={className}>
        <defs>
          <linearGradient id="ceramicBody" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#E8E4D9" />
            <stop offset="50%" stopColor="#D8D0C0" />
            <stop offset="100%" stopColor="#C8C0B0" />
          </linearGradient>
          <linearGradient id="ceramicGlaze" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#A8C4BC" />
            <stop offset="50%" stopColor="#8BA8A0" />
            <stop offset="100%" stopColor="#6E8B83" />
          </linearGradient>
        </defs>
        <ellipse cx="32" cy="56" rx="16" ry="3" fill="#E0D8C8" opacity="0.4" />
        <path d="M20 25 Q16 35 20 50 Q24 54 32 54 Q40 54 44 50 Q48 35 44 25 Q40 15 32 15 Q24 15 20 25 Z" fill="url(#ceramicBody)" />
        <path d="M22 28 Q18 38 22 48 Q26 52 32 52 Q38 52 42 48 Q46 38 42 28 Q38 20 32 20 Q26 20 22 28 Z" fill="url(#ceramicGlaze)" />
        <ellipse cx="32" cy="22" rx="8" ry="3" fill="url(#ceramicBody)" />
        <ellipse cx="32" cy="20" rx="6" ry="2" fill="#F0ECE6" />
        <circle cx="26" cy="35" r="3" fill="#8BA8A0" opacity="0.5" />
        <circle cx="38" cy="32" r="2" fill="#8BA8A0" opacity="0.4" />
        <circle cx="32" cy="42" r="2.5" fill="#8BA8A0" opacity="0.3" />
      </svg>
    )
  }

  if (types.living) {
    return (
      <svg viewBox="0 0 64 64" style={iconStyle} className={className}>
        <defs>
          <linearGradient id="houseRoof" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8B6914" />
            <stop offset="100%" stopColor="#5D4E37" />
          </linearGradient>
          <linearGradient id="houseWall" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#F5F0E8" />
            <stop offset="100%" stopColor="#E8E0D0" />
          </linearGradient>
        </defs>
        <path d="M12 35 L32 10 L52 35 Z" fill="url(#houseRoof)" />
        <path d="M12 35 L12 50 L52 50 L52 35 Z" fill="url(#houseWall)" />
        <path d="M32 10 L32 18" stroke="#5D4E37" strokeWidth="2" />
        <rect x="18" y="40" width="10" height="10" rx="1" fill="#8BA8A0" />
        <rect x="20" y="42" width="6" height="6" fill="#A8C4BC" />
        <circle cx="26" cy="45" r="1" fill="#6E8B83" />
        <rect x="36" y="38" width="8" height="12" rx="1" fill="#C49A5E" />
        <rect x="37" y="39" width="6" height="3" fill="#D8B88A" />
        <rect x="37" y="44" width="6" height="5" fill="#E0D4BE" />
        <ellipse cx="32" cy="53" rx="20" ry="3" fill="#E8E0D0" opacity="0.3" />
      </svg>
    )
  }

  return <DefaultIcon iconStyle={iconStyle} className={className} />
}

export interface CustomIcon {
  id: string
  name: string
  url: string
}

export const presetIcons = [
  { value: 'tea', label: '茶道', description: 'Tea Ceremony' },
  { value: 'incense', label: '香道', description: 'Incense Rituals' },
  { value: 'ceramic', label: '陶瓷', description: 'Ceramic Art' },
  { value: 'living', label: '东方生活', description: 'Oriental Living' },
]

export function IconSelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [customIcons, setCustomIcons] = useState<CustomIcon[]>([])
  const [uploading, setUploading] = useState(false)
  const [iconName, setIconName] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const saved = localStorage.getItem('customIcons')
    if (saved) {
      try {
        setCustomIcons(JSON.parse(saved))
      } catch {}
    }
  }, [])

  const saveCustomIcons = (icons: CustomIcon[]) => {
    setCustomIcons(icons)
    localStorage.setItem('customIcons', JSON.stringify(icons))
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    if (file.size > 5 * 1024 * 1024) { alert("File too large (max 5MB)"); return }
    
    const name = iconName.trim() || file.name.replace(/\.[^/.]+$/, '')
    if (!name) {
      alert("请输入图标名称")
      return
    }

    setUploading(true)
    try {
      const fd = new FormData(); fd.append("file", file)
      const res = await fetch("/api/upload", { 
        method: "POST", 
        body: fd,
        credentials: 'include'
      })
      if (!res.ok) {
        let errMsg = `Upload failed (${res.status})`
        try { const d = await res.json(); errMsg = d.error || errMsg } catch {}
        alert(errMsg); setUploading(false); return
      }
      const d = await res.json()
      if (!d.url) { alert("Upload returned no URL"); setUploading(false); return }
      
      const newIcon: CustomIcon = {
        id: Date.now().toString(),
        name,
        url: d.url
      }
      saveCustomIcons([...customIcons, newIcon])
      setIconName('')
      onChange(d.url)
    } catch (e) {
      console.error("Upload error:", e)
      alert("Upload failed: " + (e instanceof Error ? e.message : String(e)))
    } finally { setUploading(false) }
    if (fileRef.current) fileRef.current.value = ""
  }

  const deleteCustomIcon = (id: string) => {
    if (!confirm("确定删除这个图标吗？")) return
    const updated = customIcons.filter(icon => icon.id !== id)
    saveCustomIcons(updated)
    if (value === customIcons.find(icon => icon.id === id)?.url) {
      onChange('')
    }
  }

  const isCustomImage = isUrl(value)

  return (
    <div className="space-y-3">
      <p className="text-xs" style={{ color: 'var(--adm-text-secondary)' }}>选择图标或上传自定义图片</p>
      
      <div className="flex gap-2 flex-wrap">
        {presetIcons.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className="flex flex-col items-center gap-1 p-2 rounded-lg border transition-all"
            style={{
              borderColor: value === opt.value ? 'var(--adm-accent)' : 'var(--adm-input-border)',
              backgroundColor: value === opt.value ? 'var(--adm-accent-bg)' : 'var(--adm-input)',
            }}
          >
            <CategoryIcon icon={opt.value} size={32} />
            <span className="text-[10px]" style={{ color: 'var(--adm-text)' }}>{opt.label}</span>
          </button>
        ))}

        {customIcons.map((icon) => (
          <button
            key={icon.id}
            type="button"
            onClick={() => onChange(icon.url)}
            className="flex flex-col items-center gap-1 p-2 rounded-lg border transition-all relative group"
            style={{
              borderColor: value === icon.url ? 'var(--adm-accent)' : 'var(--adm-input-border)',
              backgroundColor: value === icon.url ? 'var(--adm-accent-bg)' : 'var(--adm-input)',
            }}
          >
            <CategoryIcon icon={icon.url} size={32} />
            <span className="text-[10px]" style={{ color: 'var(--adm-text)' }}>{icon.name}</span>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); deleteCustomIcon(icon.id) }}
              className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X size={10} />
            </button>
          </button>
        ))}

        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex flex-col items-center gap-1 p-2 rounded-lg border border-dashed transition-all"
          style={{
            borderColor: 'var(--adm-input-border)',
            backgroundColor: 'var(--adm-input)',
          }}
        >
          {uploading ? (
            <>
              <div className="w-8 h-8 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
              <span className="text-[10px]" style={{ color: 'var(--adm-text-secondary)' }}>上传中...</span>
            </>
          ) : (
            <>
              <Upload size={20} style={{ color: 'var(--adm-text-secondary)' }} />
              <span className="text-[10px]" style={{ color: 'var(--adm-text-secondary)' }}>上传</span>
            </>
          )}
        </button>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={iconName}
          onChange={e => setIconName(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault()
              fileRef.current?.click()
            }
          }}
          placeholder="图标名称（回车选择文件上传）"
          className="flex-1 px-3 py-1.5 rounded-lg text-xs"
          style={{ backgroundColor: 'var(--adm-input)', borderColor: 'var(--adm-input-border)', color: 'var(--adm-text)' }}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-white"
          style={{ backgroundColor: 'var(--adm-accent)' }}
        >
          <Image size={14} /> 上传图标
        </button>
      </div>

      {isCustomImage && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="flex items-center gap-1 text-xs"
          style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          <X size={12} /> 移除自定义图标
        </button>
      )}

      <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={handleUpload} className="hidden" />
    </div>
  )
}
