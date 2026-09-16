'use client'

/**
 * 商品详情页的社交分享栏。
 *
 * 对照竞品 TeaTsy 复刻（实测见 site-audit/teatsy-share.json）：
 *   · 渠道与顺序一致：Share(Facebook) / Tweet / Pin it / LINE / Whatsapp / Tumblr
 *   · URL 模板照抄竞品实测值（注意它用的是 facebook.com/sharer.php 与
 *     twitter.com/share，不是 x.com 的 intent —— 保持一致，见下方注释）
 *   · 形态一致：图标 + 文字，小尺寸（高约 24px），新标签页打开
 *
 * 图标说明：lucide-react 只有 Facebook / Twitter 两个品牌图标，其余 4 个用内联
 * SVG 路径（Simple Icons 的 24×24 viewBox）。Logo 画错比画得朴素更糟，
 * 所以这些路径在实现后做了逐个目视核对（见 browser-automation/verify-share-row.js）。
 *
 * 分享链接只用当前页地址与商品名拼装，不涉及任何用户数据。
 */

import { useEffect, useState } from 'react'

const INK = '#241C12'
const LINE = 'rgba(74,58,36,0.22)'
const SOFT = 'rgba(74,58,36,0.66)'

/** Simple Icons 24×24 路径 */
const PATHS: Record<string, string> = {
  facebook: 'M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z',
  x: 'M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z',
  pinterest: 'M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.607 0 11.985-5.365 11.985-11.987C23.97 5.39 18.592.026 11.985.026L12.017 0z',
  whatsapp: 'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z',
  tumblr: 'M14.563 24c-5.093 0-7.031-3.756-7.031-6.411V9.747H5.116V6.648c3.63-1.313 4.512-4.596 4.71-6.469C9.84.051 9.941 0 9.999 0h3.517v6.114h4.801v3.633h-4.82v7.47c.016 1.001.375 2.371 2.207 2.371h.09c.631-.02 1.486-.205 1.936-.419l1.156 3.425c-.436.636-2.4 1.374-4.156 1.404h-.178l.04.002z',
  // LINE 品牌字标路径过长且难校验，这里用「对话气泡 + LINE 字样」表达，
  // 文字标签本身已写明是 LINE，识别不受影响
  line: 'M12 2C6.48 2 2 5.64 2 10.13c0 4.02 3.55 7.39 8.35 8.03.33.07.77.22.88.5.1.26.07.66.03.92l-.14.86c-.04.26-.2.99.87.54 1.07-.45 5.79-3.41 7.9-5.84 1.46-1.6 2.11-3.22 2.11-4.99C22 5.64 17.52 2 12 2z',
}

const CHANNELS: { key: string; label: string; icon: string }[] = [
  { key: 'facebook', label: 'Share', icon: 'facebook' },
  { key: 'twitter', label: 'Tweet', icon: 'x' },
  { key: 'pinterest', label: 'Pin it', icon: 'pinterest' },
  { key: 'line', label: 'LINE', icon: 'line' },
  { key: 'whatsapp', label: 'Whatsapp', icon: 'whatsapp' },
  { key: 'tumblr', label: 'Tumblr', icon: 'tumblr' },
]

export default function ShareRow({ title, image, initialUrl }: { title: string; image?: string; initialUrl?: string }) {
  /**
   * 先用服务端给的地址渲染（这样分享栏会出现在首屏 HTML 里，不会等水合才冒出来），
   * 挂载后再换成 window.location.href —— 目的是**带上 ?ref= 之类的推广参数**，
   * 客户分享出去时归因不会丢。两者都拿不到时整段不渲染。
   */
  const [url, setUrl] = useState(initialUrl || '')
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.href) setUrl(window.location.href)
  }, [])

  if (!url) return null

  const u = encodeURIComponent(url)
  const t = encodeURIComponent(title || '')
  const media = encodeURIComponent(image || '')

  // 模板照抄竞品实测值：它用的是 facebook.com/sharer.php 与 twitter.com/share
  // （不是 x.com/intent），保持一致以免出现意料外的跳转差异
  const hrefs: Record<string, string> = {
    facebook: `https://www.facebook.com/sharer.php?u=${u}`,
    twitter: `https://twitter.com/share?text=${t}&url=${u}`,
    pinterest: `https://pinterest.com/pin/create/button/?url=${u}&media=${media}`,
    line: `https://social-plugins.line.me/lineit/share?url=${u}`,
    whatsapp: `https://api.whatsapp.com/send/?text=${u}`,
    tumblr: `https://www.tumblr.com/widgets/share/tool?posttype=link&canonicalUrl=${u}`,
  }

  return (
    <div className="mt-7 pt-6 flex items-center gap-2 flex-wrap" data-share-row="1"
      style={{ borderTop: `1px solid ${LINE}` }}>
      <span className="font-sans text-[11px] tracking-[0.18em] uppercase mr-1" style={{ color: SOFT }}>
        Share
      </span>
      {CHANNELS.map(c => (
        <a
          key={c.key}
          href={hrefs[c.key]}
          target="_blank"
          rel="noreferrer"
          data-share={c.key}
          aria-label={`Share on ${c.label}`}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 transition-colors duration-200 hover:opacity-70"
          style={{ border: `1px solid ${LINE}`, borderRadius: 3, color: INK }}
        >
          <svg viewBox="0 0 24 24" width={13} height={13} fill={INK} aria-hidden="true">
            <path d={PATHS[c.icon]} />
          </svg>
          <span className="font-sans text-[11px]">{c.label}</span>
        </a>
      ))}
    </div>
  )
}
