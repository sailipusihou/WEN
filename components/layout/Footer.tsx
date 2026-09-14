"use client"
import { useState, useEffect } from "react"
import Link from "next/link"
import { ArrowUpRight, ArrowUp } from "lucide-react"
import { fetchCategories } from "@/lib/use-categories"
import type { Category } from "@/lib/products"

/* ---- 深色页脚的文字色阶（此前用 white/20~35，几乎看不见） ---- */
const ON_DARK = 'rgba(248,246,242,0.92)'      // 主
const ON_DARK_SOFT = 'rgba(248,246,242,0.68)' // 次（仍清晰）
const ON_DARK_FAINT = 'rgba(248,246,242,0.55)' // 弱但仍达 WCAG AA
const ACCENT = '#5F7D72'                       // jade 强调

/** 真实品牌图标（内联 SVG，替代此前的 X/IG/FB 文字圆圈） */
function SocialIcon({ label, size = 17 }: { label: string; size?: number }) {
  const p = { width: size, height: size, viewBox: '0 0 24 24', 'aria-hidden': true as const }
  const key = label.toLowerCase()
  if (key === 'x' || key === 'twitter') {
    return <svg {...p} fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
  }
  if (key === 'ig' || key === 'instagram') {
    return (
      <svg {...p} fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="2.5" y="2.5" width="19" height="19" rx="5.2" />
        <circle cx="12" cy="12" r="4.1" />
        <circle cx="17.4" cy="6.6" r="1.15" fill="currentColor" stroke="none" />
      </svg>
    )
  }
  if (key === 'fb' || key === 'facebook') {
    return <svg {...p} fill="currentColor"><path d="M13.5 21v-7.5h2.6l.4-3h-3V8.6c0-.87.24-1.46 1.5-1.46h1.6V4.4c-.28-.04-1.23-.12-2.34-.12-2.32 0-3.9 1.42-3.9 4.02v2.2H7.7v3h2.66V21z" /></svg>
  }
  if (key === 'pt' || key === 'pinterest') {
    return <svg {...p} fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12c0 4.1 2.46 7.6 6 9.17-.08-.78-.16-1.98.03-2.83l1.16-4.9s-.3-.6-.3-1.48c0-1.39.8-2.42 1.8-2.42.85 0 1.26.64 1.26 1.4 0 .86-.55 2.14-.83 3.33-.24 1 .5 1.8 1.48 1.8 1.78 0 3.14-1.87 3.14-4.57 0-2.39-1.72-4.06-4.17-4.06-2.84 0-4.5 2.13-4.5 4.33 0 .86.33 1.78.74 2.28.08.1.09.19.07.29l-.28 1.13c-.04.18-.15.22-.34.13-1.25-.58-2.03-2.4-2.03-3.86 0-3.14 2.28-6.02 6.58-6.02 3.45 0 6.14 2.46 6.14 5.75 0 3.43-2.16 6.19-5.16 6.19-1.01 0-1.96-.52-2.28-1.14l-.62 2.36c-.22.86-.83 1.94-1.24 2.6.93.29 1.92.44 2.95.44 5.52 0 10-4.48 10-10S17.52 2 12 2z" /></svg>
  }
  if (key === 'yt' || key === 'youtube') {
    return <svg {...p} fill="currentColor"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8zM9.6 15.6V8.4l6.2 3.6z" /></svg>
  }
  if (key === 'tiktok') {
    return <svg {...p} fill="currentColor"><path d="M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 0 1-2.59 2.5 2.59 2.59 0 1 1 .77-5.06V9.7a5.68 5.68 0 0 0-.77-.05A5.66 5.66 0 1 0 15.54 15.3V9.01a7.35 7.35 0 0 0 4.3 1.38V7.3a4.29 4.29 0 0 1-3.24-1.48z" /></svg>
  }
  return <svg {...p} fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="9" /><path d="M3.5 12h17M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18z" /></svg>
}

export default function Footer() {
  const [fc, setFc] = useState<any>(null)
  const [settings, setSettings] = useState<any>(null)
  const [categories, setCategories] = useState<Category[]>([])
  useEffect(() => {
    fetch("/api/frontend-content").then(r => r.ok ? r.json() : null).then(d => setFc(d)).catch(() => {})
    fetch("/api/settings").then(r => r.ok ? r.json() : null).then(d => setSettings(d)).catch(() => {})
    fetchCategories().then(setCategories).catch(() => {})
  }, [])

  const footer = fc?.footer || {}
  const brandDesc = footer.brandDesc || "Low Flame — contemporary craftsmanship. Each piece connects you to the artisan who made it."
  const copyright = footer.copyright || "All rights reserved."
  const socialLinks = (footer.socialLinks || [
    { label: "X", href: settings?.socialX || "" },
    { label: "IG", href: settings?.socialInstagram || "" },
    { label: "FB", href: settings?.socialFacebook || "" },
    { label: "PT", href: settings?.socialPinterest || "" },
    { label: "YT", href: settings?.socialYoutube || "" },
  ]).filter((s: any) => s.href && s.href.startsWith('http'))
  const collections = footer.collections || (categories.length > 0
    ? categories.map(c => ({ label: c.nameEn || c.name, href: `/category/${c.slug}` }))
    : [
        { label: "Tea Ceremony", href: "/category/tea-ceremony" },
        { label: "Ceramic Art", href: "/category/ceramic-art" },
        { label: "Incense Rituals", href: "/category/incense-rituals" },
      ])
  const companyLinks = footer.companyLinks || [
    { label: "About", href: "/#philosophy" },
    { label: "Journal", href: "/#journal" },
    { label: "Contact", href: "/contact" },
  ]
  const contacts = footer.contacts || [
    { label: "Email", value: "hello@lowflame.store" },
    { label: "Phone", value: "+86 400-888-8888" },
    { label: "Hours", value: "Mon-Sat 9:00-18:00 (CST)" },
  ]
  const bottomLinks = (footer.bottomLinks || [
    { label: "Privacy", href: settings?.footerPrivacyLink || "" },
    { label: "Terms", href: settings?.footerTermsLink || "" },
  ]).filter((l: any) => l.href && (l.href.startsWith('http') || l.href.startsWith('/')))

  return (
    <footer style={{ backgroundColor: '#211C17' }}>
      {/* ============ 主区 ============ */}
      <div className="max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-12 pt-20 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12 lg:gap-8">
          {/* 品牌列 */}
          <div className="lg:col-span-5">
            <Link href="/" className="inline-flex items-center gap-3 group mb-5">
              <div className="w-11 h-11 rounded-full overflow-hidden flex items-center justify-center shrink-0 transition-transform duration-500 group-hover:scale-105" style={{ backgroundColor: '#EDE3D2' }}>
                <img src="/images/low-flame-logo.png" alt="Low Flame" className="h-[70%] w-auto object-contain" />
              </div>
              <span className="font-en text-[22px] tracking-[0.02em] font-medium transition-colors" style={{ color: ON_DARK }}>Low Flame</span>
            </Link>
            <p className="font-sans text-[14px] leading-[1.8] max-w-sm" style={{ color: ON_DARK_SOFT }}>{brandDesc}</p>

            {socialLinks.length > 0 && (
              <div className="flex gap-2.5 mt-7">
                {socialLinks.map((s: any, i: number) => (
                  <a
                    key={i}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={s.label}
                    title={s.label}
                    className="w-10 h-10 flex items-center justify-center transition-all duration-300 hover:-translate-y-0.5"
                    style={{ border: '1px solid rgba(184,160,108,0.22)', color: '#C9BEAA', borderRadius: 3, backgroundColor: 'rgba(184,160,108,0.05)' }}
                    onMouseEnter={e => { e.currentTarget.style.color = '#211C17'; e.currentTarget.style.backgroundColor = ACCENT; e.currentTarget.style.borderColor = ACCENT }}
                    onMouseLeave={e => { e.currentTarget.style.color = '#C9BEAA'; e.currentTarget.style.backgroundColor = 'rgba(184,160,108,0.05)'; e.currentTarget.style.borderColor = 'rgba(184,160,108,0.22)' }}
                  >
                    <SocialIcon label={s.label} />
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* 三列导航 */}
          <div className="lg:col-span-2">
            <h4 className="font-sans text-[11px] tracking-[0.28em] uppercase font-semibold mb-6" style={{ color: ACCENT }}>Collections</h4>
            <ul className="space-y-3.5">
              {collections.map((item: any, i: number) => (
                <li key={i}>
                  <Link href={item.href || "/products"} className="font-sans text-[13px] transition-colors duration-200 hover:opacity-100" style={{ color: ON_DARK_SOFT }}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="lg:col-span-2">
            <h4 className="font-sans text-[11px] tracking-[0.28em] uppercase font-semibold mb-6" style={{ color: ACCENT }}>Company</h4>
            <ul className="space-y-3.5">
              {companyLinks.map((item: any, i: number) => (
                <li key={i}>
                  <Link href={item.href || "/contact"} className="font-sans text-[13px] transition-colors duration-200" style={{ color: ON_DARK_SOFT }}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="lg:col-span-3">
            <h4 className="font-sans text-[11px] tracking-[0.28em] uppercase font-semibold mb-6" style={{ color: ACCENT }}>Contact</h4>
            <ul className="space-y-3.5 font-sans text-[13px]" style={{ color: ON_DARK_SOFT }}>
              {contacts.map((c: any, i: number) => (
                <li key={i}>
                  {c.label === "Email" ? (
                    <a href={`mailto:${c.value}`} className="inline-flex items-center gap-1.5 transition-opacity hover:opacity-75">
                      {c.value} <ArrowUpRight size={12} strokeWidth={1.6} />
                    </a>
                  ) : c.value}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* ============ 最底层：放大成独立区间 + 质感处理 ============
          大面积深色纯平涂会显廉价，这里叠了三层：
          垂直渐变（体积感）+ 顶部径向金光（品牌晕染）+ 细腻噪点（去塑料感） */}
      <div className="footer-texture">
        <div className="footer-hairline" />
        <div className="max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-12 py-16 md:py-20">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-10">
            {/* 大字标 */}
            <div>
              <p
                className="footer-wordmark font-en italic leading-[1.05] tracking-[-0.01em]"
                style={{ fontSize: 'clamp(38px, 6vw, 72px)' }}
              >
                Low Flame
              </p>
              <p className="font-sans text-[13px] mt-4 tracking-[0.02em]" style={{ color: ON_DARK_FAINT }}>
                Contemporary craftsmanship · Shipped worldwide from China
              </p>
            </div>

            {/* 回到顶部 */}
            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="group inline-flex items-center gap-2.5 self-start lg:self-end font-sans text-[11px] tracking-[0.28em] uppercase font-semibold px-5 py-3 transition-all duration-300 hover:-translate-y-0.5"
              style={{ border: '1px solid rgba(184,160,108,0.35)', color: '#DCCBA8', borderRadius: 2, backgroundColor: 'rgba(184,160,108,0.06)' }}
            >
              Back to top
              <ArrowUp size={13} strokeWidth={2} className="transition-transform duration-300 group-hover:-translate-y-0.5" />
            </button>
          </div>

          {/* 版权 + 法务链接 */}
          <div className="mt-14 pt-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4" style={{ borderTop: '1px solid rgba(184,160,108,0.16)' }}>
            <p className="font-sans text-[12px] tracking-[0.02em]" style={{ color: ON_DARK_FAINT }}>
              &copy; 2026 Low Flame. {copyright}
            </p>
            <div className="flex flex-wrap gap-x-7 gap-y-2">
              {bottomLinks.map((item: any, i: number) => (
                <Link key={i} href={item.href} className="font-sans text-[12px] tracking-[0.02em] transition-opacity hover:opacity-75" style={{ color: ON_DARK_FAINT }}>
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
