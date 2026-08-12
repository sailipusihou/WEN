"use client"
import { useState, useEffect } from "react"
import Link from "next/link"
import { ArrowUpRight } from "lucide-react"

export default function Footer() {
  const [fc, setFc] = useState<any>(null)
  useEffect(() => {
    fetch("/api/frontend-content").then(r => r.ok ? r.json() : null).then(d => setFc(d)).catch(() => {})
  }, [])

  const footer = fc?.footer || {}
  const brandDesc = footer.brandDesc || "Low Flame — contemporary craftsmanship. Each piece connects you to the artisan who made it."
  const copyright = footer.copyright || "All rights reserved."
  const bottomLinks = footer.bottomLinks || ["Privacy", "Terms", "Cookie Policy"]
  const socialLinks = footer.socialLinks || [
    { label: "X", href: "#", color: "hover:text-white" },
    { label: "IG", href: "#", color: "hover:text-[#E4405F]" },
    { label: "FB", href: "#", color: "hover:text-[#1877F2]" },
    { label: "PT", href: "#", color: "hover:text-[#E60023]" },
    { label: "YT", href: "#", color: "hover:text-[#FF0000]" },
  ]
  const collections = footer.collections || [
    { label: "Tea Ceremony", href: "/products" },
    { label: "Ceramic Living", href: "/products" },
    { label: "Silk & Embroidery", href: "/products" },
    { label: "Bamboo Craft", href: "/products" },
    { label: "Natural Incense", href: "/products" },
    { label: "Scholar's Desk", href: "/products" },
  ]
  const companyLinks = footer.companyLinks || [
    { label: "About", href: "/#philosophy" },
    { label: "Journal", href: "/#journal" },
    { label: "Contact", href: "/contact" },
    { label: "Shipping", href: "/contact" },
    { label: "Returns", href: "/contact" },
  ]
  const contacts = footer.contacts || [
    { label: "Email", value: "hello@lowflame.com" },
    { label: "Phone", value: "+86 400-888-8888" },
    { label: "Hours", value: "Mon-Sat 9:00-18:00 (CST)" },
  ]

  return (
    <footer className="bg-[#2D2F33]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-8">
          <div className="lg:col-span-2">
            <Link href="/" className="inline-flex items-center gap-2.5 group mb-4">
              <div className="w-10 h-10 rounded-full bg-[#F5F1EA] shadow-soft overflow-hidden flex items-center justify-center shrink-0">
                <img
                  src="/images/low-flame-logo.png"
                  alt="Low Flame"
                  className="h-[70%] w-auto object-contain"
                />
              </div>
              <span className="font-en text-base md:text-lg text-white/85 tracking-[0.08em] font-medium group-hover:text-[#8BA8A0] transition-colors">LOW FLAME</span>
            </Link>
            <p className="font-sans text-[11px] text-white/35 leading-relaxed max-w-xs mt-3">{brandDesc}</p>
            <div className="flex gap-3 mt-6">
              {socialLinks.map((s: any, i: number) => (
                <a key={i} href={s.href} target="_blank" rel="noopener noreferrer"
                  className={`w-7 h-7 rounded-full bg-white/5 flex items-center justify-center text-[9px] font-sans font-medium tracking-wider text-white/35 transition-all hover:bg-white/10 ${s.color || "hover:text-white"}`}
                >{s.label}</a>
              ))}
            </div>
          </div>
          <div>
            <h4 className="font-sans text-[9px] text-[#8BA8A0] tracking-[0.15em] uppercase font-medium mb-5">Collections</h4>
            <ul className="space-y-2.5">
              {collections.map((item: any, i: number) => (
                <li key={i}><Link href={item.href || "/products"} className="font-sans text-[11px] text-white/35 hover:text-white/60 transition-colors">{item.label}</Link></li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-sans text-[9px] text-[#8BA8A0] tracking-[0.15em] uppercase font-medium mb-5">Company</h4>
            <ul className="space-y-2.5">
              {companyLinks.map((item: any, i: number) => (
                <li key={i}><Link href={item.href || "/contact"} className="font-sans text-[11px] text-white/35 hover:text-white/60 transition-colors">{item.label}</Link></li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-sans text-[9px] text-[#8BA8A0] tracking-[0.15em] uppercase font-medium mb-5">Contact</h4>
            <ul className="space-y-2.5 font-sans text-[11px] text-white/35">
              {contacts.map((c: any, i: number) => (
                <li key={i}>{c.label === "Email" ? <a href={`mailto:${c.value}`} className="flex items-center gap-1 hover:text-white/60 transition-colors">{c.value} <ArrowUpRight size={9} strokeWidth={1} /></a> : c.value}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      <div className="border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="font-sans text-[9px] text-white/20 tracking-wider">&copy; 2026 Low Flame. {copyright}</p>
          <div className="flex gap-6">
            {bottomLinks.map((item: string, i: number) => (
              <Link key={i} href="/contact" className="font-sans text-[9px] text-white/20 hover:text-white/40 transition-colors tracking-wider">{item}</Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
