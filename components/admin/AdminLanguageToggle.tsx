'use client'

import { useEffect, useState } from 'react'
import { Languages } from 'lucide-react'
import { applyAdminChinese } from '@/lib/admin-i18n'

type Lang = 'en' | 'zh'

export default function AdminLanguageToggle({
  collapsed = false,
  floating = false,
}: {
  collapsed?: boolean
  floating?: boolean
}) {
  const [lang, setLang] = useState<Lang>('en')

  useEffect(() => {
    try {
      setLang(localStorage.getItem('admin_lang') === 'zh' ? 'zh' : 'en')
    } catch {}
  }, [])

  useEffect(() => {
    if (lang !== 'zh') return
    applyAdminChinese()
    const observer = new MutationObserver(() => applyAdminChinese())
    observer.observe(document.body, { childList: true, subtree: true, characterData: true })
    return () => observer.disconnect()
  }, [lang])

  const toggle = () => {
    if (lang === 'zh') {
      try { localStorage.setItem('admin_lang', 'en') } catch {}
      window.location.reload()
    } else {
      try { localStorage.setItem('admin_lang', 'zh') } catch {}
      setLang('zh')
    }
  }

  if (floating) {
    return (
      <button
        type="button"
        onClick={toggle}
        data-admin-lang-ignore
        className="fixed bottom-4 right-4 z-[300] flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium shadow-lg transition-colors"
        style={{ backgroundColor: 'var(--adm-accent)', color: 'var(--adm-accent-text)' }}
        title={lang === 'zh' ? '切换为英文' : '切换到中文'}
      >
        <Languages size={14} /> {lang === 'zh' ? '英文' : '中文'}
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={toggle}
      data-admin-lang-ignore
      className={
        collapsed
          ? 'w-full flex items-center justify-center px-3 py-2.5 rounded-lg transition-all adm-hover-bg'
          : 'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all adm-hover-bg'
      }
      style={{ color: 'var(--adm-text-secondary)' }}
      title={lang === 'zh' ? '切换为英文' : '切换到中文'}
    >
      <Languages size={collapsed ? 18 : 16} />
      {!collapsed && <span>{lang === 'zh' ? '英文' : '中文'}</span>}
    </button>
  )
}
