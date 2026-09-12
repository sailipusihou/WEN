'use client'
import { useState, useEffect, useRef } from 'react'
import {
  Save, Palette, Layout, BookOpen, Globe, Eye, Quote,
  Settings, ShoppingCart, Truck, Mail, Plus, X, Users,
  GalleryHorizontalEnd, Video, ArrowLeft, Type, Sparkles,
  Mailbox, Footprints, Cloud, Bell, Image as ImageIcon, Sun, Contrast, Star,
  ChevronDown, Store, Monitor, Shield, Bot,
  Facebook, Instagram, Linkedin, Youtube, Pin, MessageCircle, PenTool, Music,
} from 'lucide-react'
import XLogo from "@/components/ui/XLogo"
import { Section, Field, Input, Textarea, ImageUploader, CollectionEditor, JournalEditor, QuoteEditor, RangeSlider } from '@/components/admin/SettingsSection'
import HeroSlideshowEditor from '@/components/admin/HeroSlideshowEditor'
import HeroVideoEditor from '@/components/admin/HeroVideoEditor'

type MainTab = "storefront" | "system"
type SubTab = "editor" | "brand" | "social" | "customers" | "general" | "orders" | "shipping" | "smtp" | "admin-ui" | "notifications" | "ai-assistant" | "social-apis"

// editor tab 下可用的子面板 id
type EditorPanelId =
  | "hero-text"
  | "hero-slideshow"
  | "hero-video"
  | "philosophy-strip"
  | "collections"
  | "artisan-story"
  | "philosophy"
  | "journal"
  | "seasonal"
  | "newsletter"
  | "footer"

const storefrontTabs: { id: SubTab; label: string; icon: any; desc: string }[] = [
  { id: "editor", label: "Visual Editor", icon: Palette, desc: "Design homepage content" },
  { id: "brand", label: "Brand & Identity", icon: Sparkles, desc: "Logo, name, colors, about" },
  { id: "social", label: "Social & Footer", icon: Globe, desc: "Social links, footer info" },
  { id: "customers", label: "Customer Tiers", icon: Users, desc: "Loyalty tiers and star rules" },
]

const systemTabs: { id: SubTab; label: string; icon: any; desc: string }[] = [
  { id: "general", label: "General", icon: Settings, desc: "Currency, admin accounts" },
  { id: "orders", label: "Orders", icon: ShoppingCart, desc: "Auto-confirm, staff assignment" },
  { id: "shipping", label: "Shipping", icon: Truck, desc: "Zones, carriers, tracking" },
  { id: "smtp", label: "Email (SMTP)", icon: Mail, desc: "Mail server configuration" },
  { id: "admin-ui", label: "Admin UI", icon: Monitor, desc: "Background, panel style, effects" },
  { id: "notifications", label: "Notifications", icon: Bell, desc: "Desktop push notifications" },
  { id: "ai-assistant", label: "AI Assistant", icon: Bot, desc: "Configure AI model and behavior" },
  { id: "social-apis", label: "Social APIs", icon: XLogo, desc: "X API integration" },
]

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [mainTab, setMainTab] = useState<MainTab>("storefront")
  const [subTab, setSubTab] = useState<SubTab>("editor")
  // 当前展开的子面板 (null = 显示卡片列表)
  const [activePanel, setActivePanel] = useState<EditorPanelId | null>(null)
  const [fc, setFc] = useState<any>(null)
  const [panelStyleGroups, setPanelStyleGroups] = useState<Record<string, boolean>>({ light: true, dark: true })
  const [aiTesting, setAiTesting] = useState(false)
  const [aiTestResult, setAiTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [aiCopyTesting, setAiCopyTesting] = useState(false)
  const [aiCopyTestResult, setAiCopyTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [aiImageTesting, setAiImageTesting] = useState(false)
  const [aiImageTestResult, setAiImageTestResult] = useState<{ success: boolean; message: string } | null>(null)
const [aiImageRefTesting, setAiImageRefTesting] = useState(false)
const [aiImageRefTestResult, setAiImageRefTestResult] = useState<{ success: boolean; message: string } | null>(null)
const [imageModelsList, setImageModelsList] = useState<Record<string, { id: string; label: string }[]>>({})
const [refImageModelsList, setRefImageModelsList] = useState<Record<string, { id: string; label: string }[]>>({})
const [imageModelsLoading, setImageModelsLoading] = useState(false)
const [refImageModelsLoading, setRefImageModelsLoading] = useState(false)
  const [imageModelsMsg, setImageModelsMsg] = useState('')
  const [refImageModelsMsg, setRefImageModelsMsg] = useState('')
const [customModelInput, setCustomModelInput] = useState('')
const [customRefModelInput, setCustomRefModelInput] = useState('')
  const [showImageKey, setShowImageKey] = useState(false)
  const [showImageRefKey, setShowImageRefKey] = useState(false)
  const [llmProviderOpen, setLlmProviderOpen] = useState<Record<string, boolean>>({})
  const [imgProviderOpen, setImgProviderOpen] = useState<Record<string, boolean>>({})
  const [videoProviderOpen, setVideoProviderOpen] = useState<Record<string, boolean>>({})
  const [llmLibLoading, setLlmLibLoading] = useState<Record<string, boolean>>({})
  const [imgLibLoading, setImgLibLoading] = useState<Record<string, boolean>>({})
  const [videoLibLoading, setVideoLibLoading] = useState<Record<string, boolean>>({})
  const [llmLibMsg, setLlmLibMsg] = useState<Record<string, string>>({})
  const [imgLibMsg, setImgLibMsg] = useState<Record<string, string>>({})
  const [videoLibMsg, setVideoLibMsg] = useState<Record<string, string>>({})
  const [aiVideoTesting, setAiVideoTesting] = useState(false)
  const [aiVideoTestResult, setAiVideoTestResult] = useState<{ success: boolean; message: string } | null>(null)

  const IMAGE_PRESET_MODELS: Record<string, { id: string; label: string }[]> = {
    ark: [
      { id: 'doubao-seedream-4-0-250828', label: 'Seedream 4.0（1K/2K/4K）' },
      { id: 'doubao-seedream-4-5-251128', label: 'Seedream 4.5（2K/4K，细节更强）' },
      { id: 'doubao-seedream-5-0-260128', label: 'Seedream 5.0（2K/3K，旗舰）' },
    ],
    minimax: [
      { id: 'image-01', label: 'image-01（文生图/参考图）' },
      { id: 'image-01-live', label: 'image-01-live' },
    ],
    openai: [
      { id: 'gpt-image-1', label: 'gpt-image-1（推荐）' },
      { id: 'dall-e-3', label: 'DALL·E 3' },
      { id: 'dall-e-2', label: 'DALL·E 2' },
    ],
    siliconflow: [
      { id: 'Kwai-Kolors/Kolors', label: 'Kwai-Kolors/Kolors' },
      { id: 'Kwai-Kolors/Kolors-1.1', label: 'Kwai-Kolors/Kolors-1.1' },
      { id: 'Tongyi-MAI/Z-Image-Turbo', label: 'Tongyi-MAI/Z-Image-Turbo（免费）' },
      { id: 'Tongyi-MAI/Z-Image', label: 'Tongyi-MAI/Z-Image' },
      { id: 'Tongyi-MAI/Z-Image-Plus', label: 'Tongyi-MAI/Z-Image-Plus' },
      { id: 'baidu/ERNIE-Image-Turbo', label: 'baidu/ERNIE-Image-Turbo' },
      { id: 'BFL/FLUX.1-schnell', label: 'BFL/FLUX.1-schnell（免费）' },
      { id: 'BFL/FLUX.1-dev', label: 'BFL/FLUX.1-dev' },
      { id: 'Qwen/Qwen-Image', label: 'Qwen/Qwen-Image' },
    ],
  }
  const getImageModelOptions = (providerKey: string, extraList: Record<string, { id: string; label: string }[]> | undefined, current: string): { id: string; label: string }[] => {
    const base = (extraList && extraList[providerKey]) || (IMAGE_PRESET_MODELS[providerKey] || [])
    if (current && !base.some(m => m.id === current)) {
      return [...base, { id: current, label: `自定义：${current}` }]
    }
    return base
  }
  const realKeyOrEmpty = (k: any) => {
    const s = k ? String(k) : ''
    return s && !/•|configured|masked/i.test(s) ? s : ''
  }
  const LLM_PROVIDER_LABELS: Record<string, string> = {
    deepseek: "DeepSeek",
    siliconflow: "硅基流动",
    openai: "OpenAI",
    qwen: "通义千问",
    zhipu: "智谱 GLM",
    minimax: "MiniMax",
    custom: "Custom",
  }
  const IMG_PROVIDER_LABELS: Record<string, string> = {
    siliconflow: "硅基流动",
    minimax: "MiniMax",
    ark: "火山方舟",
    openai: "OpenAI",
    custom: "Custom",
  }
  const VIDEO_PROVIDER_LABELS: Record<string, string> = {
    ark: "火山方舟（Seedance）",
    minimax: "MiniMax（H3 / Video-01）",
    custom: "Custom",
  }
  const VIDEO_PRESET_MODELS: Record<string, { id: string; label: string }[]> = {
    ark: [
      { id: 'doubao-seedance-2-0-260128', label: 'Seedance 2.0（旗舰，图生视频/原生音频）' },
      { id: 'doubao-seedance-2-0-fast-260128', label: 'Seedance 2.0 Fast（快速）' },
      { id: 'doubao-seedance-1-5-pro-251215', label: 'Seedance 1.5 Pro（图生视频）' },
      { id: 'doubao-seedance-1-0-pro-250528', label: 'Seedance 1.0 Pro（图生视频）' },
      { id: 'doubao-seedance-1-0-lite-i2v-250428', label: 'Seedance 1.0 Lite i2v' },
    ],
    minimax: [
      { id: 'MiniMax-H3', label: 'MiniMax H3（旗舰，图生/文生/多模态参考，原生音频）' },
      { id: 'video-01', label: 'Video-01（图生视频）' },
      { id: 'video-01-live', label: 'Video-01 Live' },
    ],
  }
  const AUDIO_PROVIDER_LABELS: Record<string, string> = {
    minimax: "MiniMax（音乐 / 配音）",
  }
  const AUDIO_PRESET_MODELS: Record<string, { id: string; label: string }[]> = {
    minimax: [
      { id: 'music-3.0-free', label: 'Music 3.0 Free（纯音乐，免费额度）' },
      { id: 'music-2.6-free', label: 'Music 2.6 Free（纯音乐，免费额度）' },
      { id: 'music-3.0', label: 'Music 3.0（付费，效果最佳）' },
      { id: 'speech-02-hd', label: 'Speech 02 HD（高清配音）' },
      { id: 'speech-02-turbo', label: 'Speech 02 Turbo（快速配音）' },
    ],
  }
  const updateLLMProvider = (p: string, field: string, value: any) => {
    setSettings((prev: any) => {
      const next = {
        ...prev,
        aiLLMProviders: {
          ...(prev.aiLLMProviders || {}),
          [p]: { ...(prev.aiLLMProviders?.[p] || { apiKey: "", baseUrl: "", models: [] }), [field]: value },
        },
      }
      settingsRef.current = next
      return next
    })
    if (aiSaveTimer.current) clearTimeout(aiSaveTimer.current)
    aiSaveTimer.current = setTimeout(() => { autoSaveAI() }, 1000)
  }
  const updateImageProviderLib = (p: string, field: string, value: any) => {
    setSettings((prev: any) => {
      const next = {
        ...prev,
        aiImageProviders: {
          ...(prev.aiImageProviders || {}),
          [p]: { ...(prev.aiImageProviders?.[p] || { apiKey: "", baseUrl: "", models: [] }), [field]: value },
        },
      }
      settingsRef.current = next
      return next
    })
    if (aiSaveTimer.current) clearTimeout(aiSaveTimer.current)
    aiSaveTimer.current = setTimeout(() => { autoSaveAI() }, 1000)
  }
  const updateVideoProviderLib = (p: string, field: string, value: any) => {
    setSettings((prev: any) => {
      const next = {
        ...prev,
        aiVideoProviders: {
          ...(prev.aiVideoProviders || {}),
          [p]: { ...(prev.aiVideoProviders?.[p] || { apiKey: "", baseUrl: "", models: [] }), [field]: value },
        },
      }
      settingsRef.current = next
      return next
    })
    if (aiSaveTimer.current) clearTimeout(aiSaveTimer.current)
    aiSaveTimer.current = setTimeout(() => { autoSaveAI() }, 1000)
  }
  const updateAudioProviderLib = (p: string, field: string, value: any) => {
    setSettings((prev: any) => {
      const next = {
        ...prev,
        aiAudioProviders: {
          ...(prev.aiAudioProviders || {}),
          [p]: { ...(prev.aiAudioProviders?.[p] || { apiKey: "", baseUrl: "", models: [] }), [field]: value },
        },
      }
      settingsRef.current = next
      return next
    })
    if (aiSaveTimer.current) clearTimeout(aiSaveTimer.current)
    aiSaveTimer.current = setTimeout(() => { autoSaveAI() }, 1000)
  }
  const llmProviderKeys = Object.keys(settings?.aiLLMProviders || {})
  const imgProviderKeys = Object.keys(settings?.aiImageProviders || {})
  const videoProviderKeys = Object.keys(settings?.aiVideoProviders || {})
  const audioProviderKeys = Object.keys(settings?.aiAudioProviders || {})
  const currentLLMModelOptions = settings?.aiLLMProviders?.[settings?.aiProvider || "deepseek"]?.models || []
  const currentImgModelOptions = settings?.aiImageProviders?.[settings?.aiImageProvider || "siliconflow"]?.models || []
  const currentRefImgModelOptions = settings?.aiImageProviders?.[settings?.aiImageRefProvider || settings?.aiImageProvider || "siliconflow"]?.models || []
  const currentVideoModelOptions = settings?.aiVideoProviders?.[settings?.aiVideoProvider || "ark"]?.models || []
  const currentAudioModelOptions = settings?.aiAudioProviders?.[settings?.aiAudioProvider || "minimax"]?.models || []

  useEffect(() => {
    fetch('/api/settings').then(r => r.ok && r.json()).then(d => {
      if (d) {
        setSettings(d)
        settingsRef.current = d
        if (d.frontendContent) setFc(d.frontendContent)
        else {
          setFc({
            hero: { eyebrow: "Contemporary", headline: "Objects That Carry Stories", headlineAccent: "Carry Stories", subtitle: "Celadon, silk, bamboo", buttonText: "Explore", buttonLink: "/products", secondaryText: "Our Philosophy", secondaryLink: "/#philosophy", backgroundImage: "", overlayOpacity: 55 },
            philosophyStrip: [{ number: "01", label: "Hand-Selected", desc: "Curated" }, { number: "02", label: "Authentic Craft", desc: "Direct from artisans" }, { number: "03", label: "Ethical Sourcing", desc: "Fair partnerships" }, { number: "04", label: "Timeless Design", desc: "Made to last" }],
            collections: [], featuredSection: { eyebrow: "", headline: "" },
            artisanStory: { image: "", badgeNumber: "45+", badgeText: "Master artisans", eyebrow: "Behind the Craft", headline: "Every Object Has a Maker", headlineAccent: "Maker", paragraph1: "", paragraph2: "", buttonText: "Meet the Artisans", buttonLink: "/products" },
            philosophySection: { eyebrow: "Our Philosophy", headline: "Beauty Lives in the Details", headlineAccent: "Details", body: "Everyday objects carry cultural memory.", quotes: [] },
            journal: { eyebrow: "Stories & Essays", headline: "The Journal", body: "", entries: [] },
            seasonal: { eyebrow: "Seasonal Edition", headline: "Summer", body: "", buttonText: "Explore", buttonLink: "/products", secondaryText: "Lookbook", secondaryLink: "/contact", backgroundImage: "" },
            newsletter: { eyebrow: "Stay Connected", headline: "Receive Stories", body: "", buttonText: "Subscribe", disclaimer: "No spam." },
            footer: { brandDesc: "", collections: [], companyLinks: [], contacts: [], socialLinks: [], bottomLinks: ["Privacy", "Terms", "Cookie Policy"], copyright: "" },
          })
        }
      }
      setLoading(false)
    })
  }, [])

  // 切换主 tab
  const switchMainTab = (t: MainTab) => {
    setMainTab(t)
    setActivePanel(null)
    if (t === "storefront") setSubTab("editor")
    else setSubTab("general")
  }

  // 切换子 tab
  const switchSubTab = (t: SubTab) => {
    setSubTab(t)
    setActivePanel(null)
  }

  const settingsRef = useRef<any>(null)
  const aiSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [aiAutoSaved, setAiAutoSaved] = useState(false)

  const autoSaveAI = async () => {
    const latest = settingsRef.current
    if (!latest) return
    try {
      const body = { ...latest, frontendContent: fc }
      const r = await fetch('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (r.ok) {
        setAiAutoSaved(true)
        setTimeout(() => setAiAutoSaved(false), 2500)
        window.dispatchEvent(new Event('admin-settings-saved'))
      }
    } catch (e) {
      console.error('AI auto-save error:', e)
    }
  }

  const update = (field: string, value: any) => {
    setSettings((prev: any) => {
      const next = { ...prev, [field]: value }
      settingsRef.current = next
      return next
    })
    // AI 相关字段自动保存，无需手动点 Save Changes
    if (field.startsWith('ai')) {
      if (aiSaveTimer.current) clearTimeout(aiSaveTimer.current)
      aiSaveTimer.current = setTimeout(() => { autoSaveAI() }, 1000)
    }
  }

  const updateFC = (s: string, f: string, v: any) => {
    setFc((prev: any) => {
      if (!prev) return prev
      const n = { ...prev }
      if (!n[s] || typeof n[s] !== 'object') n[s] = {}
      n[s] = { ...n[s], [f]: v }
      return n
    })
  }

  // 整体替换 hero (供子组件 onChange 使用)
  const patchHero = (patch: any) => {
    setFc((prev: any) => {
      if (!prev) return prev
      return { ...prev, hero: { ...(prev.hero || {}), ...patch } }
    })
  }

  const save = async () => {
    if (!settings) return
    setSaving(true)
    try {
      const body = fc ? { ...settings, frontendContent: fc } : settings
      const r = await fetch('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (r.ok) {
        setSaved(true); setTimeout(() => setSaved(false), 3000)
        window.dispatchEvent(new Event('admin-settings-saved'))
      }
      else { try { const d = await r.json(); alert('Save failed: ' + (d.error || 'Unknown')) } catch { alert('Save failed') } }
    } catch (e) { console.error('Save error:', e); alert('Save failed') }
    finally { setSaving(false) }
  }

  const currentSubTabs = mainTab === "storefront" ? storefrontTabs : systemTabs

  // === editor tab 子面板元数据 ===
  const heroImgCount = Array.isArray(fc?.hero?.backgroundImages) ? fc.hero.backgroundImages.filter(Boolean).length : 0
  const videoCount = Array.isArray(fc?.hero?.backgroundVideos) ? fc.hero.backgroundVideos.filter(Boolean).length : (fc?.hero?.backgroundVideo ? 1 : 0)
  const videoEnabled = !!fc?.hero?.videoEnabled && videoCount > 0

  const editorPanels: {
    id: EditorPanelId
    title: string
    icon: any
    desc: string
    badge?: { text: string; tone: 'active' | 'muted' }
  }[] = [
    {
      id: "hero-text",
      title: "Hero 文本内容",
      icon: Type,
      desc: "标题、副标题、按钮、遮罩透明度",
    },
    {
      id: "hero-slideshow",
      title: "Hero 图片轮播",
      icon: GalleryHorizontalEnd,
      desc: "多图上传、拖拽排序、Ken Burns 缩放动效",
      badge: videoEnabled
        ? { text: "已被视频覆盖", tone: 'muted' }
        : heroImgCount > 1
          ? { text: `${heroImgCount} 张轮播`, tone: 'active' }
          : heroImgCount === 1 ? { text: "单图", tone: 'muted' } : { text: "未配置", tone: 'muted' },
    },
    {
      id: "hero-video",
      title: "Hero 动态视频背景",
      icon: Video,
      desc: "多视频轮播、颜色叠层、亮度/对比度调节",
      badge: videoEnabled
        ? videoCount > 1
          ? { text: `${videoCount} 个视频轮播`, tone: 'active' }
          : { text: "运行中", tone: 'active' }
        : { text: "未启用", tone: 'muted' },
    },
    {
      id: "philosophy-strip",
      title: "Philosophy Strip",
      icon: Sparkles,
      desc: "首页四个支柱条目 (编号 + 标题 + 描述)",
      badge: { text: `${fc?.philosophyStrip?.length || 0} 项`, tone: 'muted' },
    },
    {
      id: "collections",
      title: "Collections",
      icon: Layout,
      desc: "首页精选集合卡片",
      badge: { text: `${fc?.collections?.length || 0} 项`, tone: 'muted' },
    },
    {
      id: "artisan-story",
      title: "Artisan Story",
      icon: Eye,
      desc: "工匠故事区,包含图片、徽章、标题、段落",
    },
    {
      id: "philosophy",
      title: "Philosophy",
      icon: Quote,
      desc: "哲学引用区,正文 + 多条名言",
      badge: { text: `${fc?.philosophySection?.quotes?.length || 0} 条名言`, tone: 'muted' },
    },
    {
      id: "journal",
      title: "Journal",
      icon: BookOpen,
      desc: "日志/杂志条目",
      badge: { text: `${fc?.journal?.entries?.length || 0} 条`, tone: 'muted' },
    },
    {
      id: "seasonal",
      title: "Seasonal",
      icon: Cloud,
      desc: "季节性推荐区,含背景图、按钮",
    },
    {
      id: "newsletter",
      title: "Newsletter",
      icon: Mailbox,
      desc: "邮件订阅区,标题、按钮文案、声明",
    },
    {
      id: "footer",
      title: "Footer",
      icon: Footprints,
      desc: "页脚品牌描述、版权信息",
    },
  ]

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 rounded-full animate-spin" style={{ border: "2px solid var(--adm-accent)", borderTopColor: "transparent" }} /></div>

  return (
    <div style={{ minHeight: "100vh", color: "var(--adm-text)" }}>
      <div className="sticky top-0 z-50" style={{ backgroundColor: "var(--adm-bg)", borderBottom: "1px solid var(--adm-border)" }}>
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div>
              <h1 className="text-lg font-semibold" style={{ color: "var(--adm-text)" }}>Settings</h1>
              <p className="text-xs mt-0.5" style={{ color: "var(--adm-text-secondary)" }}>{(currentSubTabs.find(t => t.id === subTab) || {}).desc || ""}</p>
            </div>
            <div className="flex items-center gap-2">
              {aiAutoSaved && (
                <span className="text-[11px] px-2 py-1 rounded-full" style={{ backgroundColor: "rgba(34,197,94,0.12)", color: "#22c55e" }}>
                  AI 设置已自动保存
                </span>
              )}
              <button onClick={save} disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium"
                style={{ backgroundColor: "var(--adm-accent)", color: "var(--adm-accent-text)", border: "none", cursor: "pointer" }}>
                <Save size={14} /> {saving ? "Saving..." : saved ? "Saved!" : "Save Changes"}
              </button>
            </div>
          </div>
          {/* 一级主分类: Storefront / System */}
          <div className="flex gap-1 pt-1 overflow-x-auto">
            {[
              { id: "storefront" as MainTab, label: "🌐 Storefront", desc: "Frontend display settings" },
              { id: "system" as MainTab, label: "⚙️ System", desc: "Backend system settings" },
            ].map(mt => (
              <button key={mt.id} onClick={() => switchMainTab(mt.id)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-t-lg text-sm font-semibold whitespace-nowrap transition-all"
                style={{
                  backgroundColor: mainTab === mt.id ? "var(--adm-card)" : "transparent",
                  color: mainTab === mt.id ? "var(--adm-text)" : "var(--adm-text-secondary)",
                  border: mainTab === mt.id ? "1px solid var(--adm-border)" : "1px solid transparent",
                  borderBottom: mainTab === mt.id ? "none" : "1px solid var(--adm-border)",
                  marginBottom: mainTab === mt.id ? "-1px" : "0",
                  cursor: "pointer",
                }}>
                {mt.label}
              </button>
            ))}
          </div>
          {/* 二级子分类 */}
          <div className="relative" style={{ borderTop: "1px solid var(--adm-border)", backgroundColor: "var(--adm-card)" }}>
            <div
              className="absolute left-0 top-0 bottom-0 w-8 pointer-events-none z-10"
              style={{
                background: "linear-gradient(to right, var(--adm-card), transparent)",
                opacity: 0.8,
              }}
            />
            <div
              className="absolute right-0 top-0 bottom-0 w-8 pointer-events-none z-10"
              style={{
                background: "linear-gradient(to left, var(--adm-card), transparent)",
                opacity: 0.8,
              }}
            />
            <div className="flex gap-1 py-2.5 overflow-x-auto scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {currentSubTabs.map(t => (
              <button key={t.id} onClick={() => switchSubTab(t.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all adm-hover-bg flex-shrink-0 relative"
                style={{
                  backgroundColor: subTab === t.id ? "var(--adm-accent-bg)" : "transparent",
                  color: subTab === t.id ? "var(--adm-accent)" : "var(--adm-text-secondary)",
                  border: subTab === t.id ? "1px solid var(--adm-border)" : "1px solid transparent",
                }}>
                <t.icon size={13} /> {t.label}
                {t.id === "social-apis" && (
                  <span
                    className="absolute -top-1 -right-1 text-[9px] px-1 rounded font-bold"
                    style={{
                      backgroundColor: "#ef4444",
                      color: "white",
                    }}
                  >
                    NEW
                  </span>
                )}
              </button>
            ))}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* ============ Visual Editor tab ============ */}
        {subTab === "editor" && fc && (
          <>
            {/* 子面板视图: activePanel !== null */}
            {activePanel !== null && (
              <div className="space-y-4">
                {/* 返回按钮 */}
                <button
                  onClick={() => setActivePanel(null)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                  style={{
                    backgroundColor: "var(--adm-input)",
                    color: "var(--adm-text-secondary)",
                    border: "1px solid var(--adm-input-border)",
                    cursor: "pointer",
                  }}
                >
                  <ArrowLeft size={13} /> 返回选项列表
                </button>

                {/* 各子面板内容 */}
                {activePanel === "hero-text" && (
                  <Section icon={Type} title="Hero 文本内容">
                    <p className="text-xs mb-4" style={{ color: "var(--adm-text-secondary)" }}>
                      首页 Hero 区的标题、副标题、按钮文案。背景图/视频请在"Hero 图片轮播"和"Hero 动态视频背景"中单独配置。
                    </p>
                    <Field label="Eyebrow (小标签)"><Input value={fc.hero?.eyebrow || ""} onChange={v => updateFC("hero", "eyebrow", v)} /></Field>
                    <Field label="Headline (主标题, 支持 \n 换行)"><Textarea value={fc.hero?.headline || ""} onChange={v => updateFC("hero", "headline", v)} /></Field>
                    <Field label="Subtitle (副标题)"><Textarea value={fc.hero?.subtitle || ""} onChange={v => updateFC("hero", "subtitle", v)} /></Field>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Field label="主按钮文案"><Input value={fc.hero?.buttonText || ""} onChange={v => updateFC("hero", "buttonText", v)} /></Field>
                      <Field label="主按钮链接"><Input value={fc.hero?.buttonLink || ""} onChange={v => updateFC("hero", "buttonLink", v)} /></Field>
                      <Field label="次按钮文案"><Input value={fc.hero?.secondaryText || ""} onChange={v => updateFC("hero", "secondaryText", v)} /></Field>
                      <Field label="次按钮链接"><Input value={fc.hero?.secondaryLink || ""} onChange={v => updateFC("hero", "secondaryLink", v)} /></Field>
                    </div>
                    <Field label={`遮罩透明度 (${fc.hero?.overlayOpacity ?? 55}%)`}>
                      <input type="range" min={0} max={100} value={fc.hero?.overlayOpacity ?? 55} onChange={e => updateFC("hero", "overlayOpacity", Number(e.target.value))} className="w-full h-1.5 rounded-full cursor-pointer" style={{ backgroundColor: "var(--adm-input-border)", accentColor: "var(--adm-accent)" }} />
                    </Field>
                  </Section>
                )}

                {activePanel === "hero-slideshow" && (
                  <Section icon={GalleryHorizontalEnd} title="Hero 图片轮播">
                    <p className="text-xs mb-4" style={{ color: "var(--adm-text-secondary)" }}>
                      管理首页 Hero 区的背景轮播图。可上传多张图片,支持拖拽排序,启用 Ken Burns 电影感缩放动效。
                      {videoEnabled && (
                        <span className="ml-1 px-1.5 py-0.5 rounded" style={{ backgroundColor: "var(--adm-accent-bg)", color: "var(--adm-accent)" }}>
                          注意: 当前视频背景已启用,图片层被覆盖
                        </span>
                      )}
                    </p>
                    <HeroSlideshowEditor
                      images={fc.hero?.backgroundImages || []}
                      enabled={fc.hero?.slideshowEnabled !== false}
                      interval={fc.hero?.slideshowInterval ?? 6}
                      transition={fc.hero?.slideshowTransition ?? 1500}
                      kenBurns={fc.hero?.kenBurnsEnabled !== false}
                      onChange={(patch) => {
                        setFc((prev: any) => {
                          if (!prev) return prev
                          const hero = { ...(prev.hero || {}), ...patch }
                          // 同步 backgroundImage 为第一张,兼容旧代码
                          if (patch.backgroundImages && patch.backgroundImages.length > 0) {
                            hero.backgroundImage = patch.backgroundImages[0]
                          }
                          return { ...prev, hero }
                        })
                      }}
                    />
                  </Section>
                )}

                {activePanel === "hero-video" && (
                  <Section icon={Video} title="Hero 动态视频背景">
                    <p className="text-xs mb-4" style={{ color: "var(--adm-text-secondary)" }}>
                      上传多个 MP4/WebM/MOV/OGG 视频作为 Hero 区背景,支持轮播切换。
                      启用颜色叠层和对比度调节,让背景与文字更协调,视觉层次更丰富。
                    </p>
                    <HeroVideoEditor
                      videos={Array.isArray(fc.hero?.backgroundVideos)
                        ? fc.hero.backgroundVideos
                        : fc.hero?.backgroundVideo
                          ? [fc.hero.backgroundVideo]
                          : []}
                      enabled={!!fc.hero?.videoEnabled}
                      slideshowEnabled={fc.hero?.videoSlideshowEnabled !== false}
                      slideshowInterval={fc.hero?.videoSlideshowInterval ?? 8}
                      loop={fc.hero?.videoLoop !== false}
                      muted={fc.hero?.videoMuted !== false}
                      autoplay={fc.hero?.videoAutoplay !== false}
                      controls={!!fc.hero?.videoControls}
                      fit={fc.hero?.videoFit === 'contain' ? 'contain' : 'cover'}
                      colorTint={fc.hero?.heroColorTint || ""}
                      colorTintOpacity={fc.hero?.heroColorTintOpacity ?? 40}
                      brightness={fc.hero?.heroBrightness ?? 100}
                      contrast={fc.hero?.heroContrast ?? 100}
                      saturation={fc.hero?.heroSaturation ?? 100}
                      blur={fc.hero?.heroBlur ?? 0}
                      temperature={fc.hero?.heroTemperature ?? 50}
                      onChange={(patch) => patchHero(patch)}
                    />
                  </Section>
                )}

                {activePanel === "philosophy-strip" && (
                  <Section icon={Sparkles} title="Philosophy Strip">
                    <p className="text-xs mb-4" style={{ color: "var(--adm-text-secondary)" }}>
                      首页第二屏的四个支柱条目,每项包含编号、标题、描述。
                    </p>
                    {(fc.philosophyStrip || []).map((item: any, i: number) => (
                      <div key={i} className="grid grid-cols-3 gap-3 p-3 rounded-lg mb-3" style={{ backgroundColor: "var(--adm-bg)", border: "1px solid var(--adm-border)" }}>
                        <Input value={item.number} onChange={v => { const n = [...(fc.philosophyStrip || [])]; n[i] = { ...n[i], number: v }; setFc((p: any) => ({ ...p, philosophyStrip: n })) }} />
                        <Input value={item.label} onChange={v => { const n = [...(fc.philosophyStrip || [])]; n[i] = { ...n[i], label: v }; setFc((p: any) => ({ ...p, philosophyStrip: n })) }} />
                        <Input value={item.desc} onChange={v => { const n = [...(fc.philosophyStrip || [])]; n[i] = { ...n[i], desc: v }; setFc((p: any) => ({ ...p, philosophyStrip: n })) }} />
                      </div>
                    ))}
                  </Section>
                )}

                {activePanel === "collections" && (
                  <Section icon={Layout} title="Collections">
                    <CollectionEditor 
                      items={fc.collections || []} 
                      onChange={v => setFc((p: any) => ({ ...p, collections: v }))}
                      slideshowEnabled={fc.collectionsSlideshowEnabled}
                      slideshowInterval={fc.collectionsSlideshowInterval}
                      onSlideshowChange={(key, value) => setFc((p: any) => ({ ...p, [key]: value }))}
                    />
                  </Section>
                )}

                {activePanel === "artisan-story" && (
                  <Section icon={Eye} title="Artisan Story">
                    <Field label="Image"><ImageUploader value={fc.artisanStory?.image || ""} onChange={v => updateFC("artisanStory", "image", v)} /></Field>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Field label="Badge Number"><Input value={fc.artisanStory?.badgeNumber || ""} onChange={v => updateFC("artisanStory", "badgeNumber", v)} /></Field>
                      <Field label="Badge Text"><Input value={fc.artisanStory?.badgeText || ""} onChange={v => updateFC("artisanStory", "badgeText", v)} /></Field>
                      <Field label="Eyebrow"><Input value={fc.artisanStory?.eyebrow || ""} onChange={v => updateFC("artisanStory", "eyebrow", v)} /></Field>
                      <Field label="Headline"><Input value={fc.artisanStory?.headline || ""} onChange={v => updateFC("artisanStory", "headline", v)} /></Field>
                      <Field label="Button Text"><Input value={fc.artisanStory?.buttonText || ""} onChange={v => updateFC("artisanStory", "buttonText", v)} /></Field>
                      <Field label="Button Link"><Input value={fc.artisanStory?.buttonLink || ""} onChange={v => updateFC("artisanStory", "buttonLink", v)} /></Field>
                    </div>
                    <Field label="Paragraph 1"><Textarea value={fc.artisanStory?.paragraph1 || ""} onChange={v => updateFC("artisanStory", "paragraph1", v)} /></Field>
                    <Field label="Paragraph 2"><Textarea value={fc.artisanStory?.paragraph2 || ""} onChange={v => updateFC("artisanStory", "paragraph2", v)} /></Field>
                  </Section>
                )}

                {activePanel === "philosophy" && (
                  <Section icon={Quote} title="Philosophy">
                    <Field label="Eyebrow"><Input value={fc.philosophySection?.eyebrow || ""} onChange={v => updateFC("philosophySection", "eyebrow", v)} /></Field>
                    <Field label="Headline (支持 \n 换行)"><Textarea value={fc.philosophySection?.headline || ""} onChange={v => updateFC("philosophySection", "headline", v)} /></Field>
                    <Field label="Body"><Textarea value={fc.philosophySection?.body || ""} onChange={v => updateFC("philosophySection", "body", v)} /></Field>
                    <Field label="Quotes"><QuoteEditor quotes={fc.philosophySection?.quotes || []} onChange={v => updateFC("philosophySection", "quotes", v)} /></Field>
                  </Section>
                )}

                {activePanel === "journal" && (
                  <Section icon={BookOpen} title="Journal">
                    <Field label="Eyebrow"><Input value={fc.journal?.eyebrow || ""} onChange={v => updateFC("journal", "eyebrow", v)} /></Field>
                    <Field label="Headline"><Input value={fc.journal?.headline || ""} onChange={v => updateFC("journal", "headline", v)} /></Field>
                    <Field label="Body"><Textarea value={fc.journal?.body || ""} onChange={v => updateFC("journal", "body", v)} /></Field>
                    <Field label="Entries"><JournalEditor entries={fc.journal?.entries || []} onChange={v => setFc((p: any) => ({ ...p, journal: { ...p.journal, entries: v } }))} /></Field>
                  </Section>
                )}

                {activePanel === "seasonal" && (
                  <Section icon={Cloud} title="Seasonal">
                    <Field label="Eyebrow"><Input value={fc.seasonal?.eyebrow || ""} onChange={v => updateFC("seasonal", "eyebrow", v)} /></Field>
                    <Field label="Headline"><Input value={fc.seasonal?.headline || ""} onChange={v => updateFC("seasonal", "headline", v)} /></Field>
                    <Field label="Body"><Textarea value={fc.seasonal?.body || ""} onChange={v => updateFC("seasonal", "body", v)} /></Field>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Field label="Button Text"><Input value={fc.seasonal?.buttonText || ""} onChange={v => updateFC("seasonal", "buttonText", v)} /></Field>
                      <Field label="Button Link"><Input value={fc.seasonal?.buttonLink || ""} onChange={v => updateFC("seasonal", "buttonLink", v)} /></Field>
                      <Field label="Secondary Text"><Input value={fc.seasonal?.secondaryText || ""} onChange={v => updateFC("seasonal", "secondaryText", v)} /></Field>
                      <Field label="Secondary Link"><Input value={fc.seasonal?.secondaryLink || ""} onChange={v => updateFC("seasonal", "secondaryLink", v)} /></Field>
                    </div>
                    <Field label="Background Image"><ImageUploader value={fc.seasonal?.backgroundImage || ""} onChange={v => updateFC("seasonal", "backgroundImage", v)} /></Field>
                  </Section>
                )}

                {activePanel === "newsletter" && (
                  <Section icon={Mailbox} title="Newsletter">
                    <Field label="Eyebrow"><Input value={fc.newsletter?.eyebrow || ""} onChange={v => updateFC("newsletter", "eyebrow", v)} /></Field>
                    <Field label="Headline"><Input value={fc.newsletter?.headline || ""} onChange={v => updateFC("newsletter", "headline", v)} /></Field>
                    <Field label="Body"><Textarea value={fc.newsletter?.body || ""} onChange={v => updateFC("newsletter", "body", v)} /></Field>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Field label="Button Text"><Input value={fc.newsletter?.buttonText || ""} onChange={v => updateFC("newsletter", "buttonText", v)} /></Field>
                      <Field label="Disclaimer"><Input value={fc.newsletter?.disclaimer || ""} onChange={v => updateFC("newsletter", "disclaimer", v)} /></Field>
                    </div>
                  </Section>
                )}

                {activePanel === "footer" && (
                  <Section icon={Footprints} title="Footer">
                    <Field label="Brand Desc"><Textarea value={fc.footer?.brandDesc || ""} onChange={v => updateFC("footer", "brandDesc", v)} /></Field>
                    <Field label="Copyright"><Input value={fc.footer?.copyright || ""} onChange={v => updateFC("footer", "copyright", v)} /></Field>
                  </Section>
                )}
              </div>
            )}

            {/* 卡片列表视图: activePanel === null */}
            {activePanel === null && (
              <div>
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-semibold" style={{ color: "var(--adm-text)" }}>可视化编辑器</h2>
                    <p className="text-xs mt-1" style={{ color: "var(--adm-text-secondary)" }}>
                      点击任一选项卡片进入该模块的编辑界面。所有修改在点击右上角"Save Changes"后生效。
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {editorPanels.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setActivePanel(p.id)}
                      className="group text-left p-5 rounded-xl transition-all adm-card-card"
                      style={{
                        backgroundColor: "var(--adm-card)",
                        border: "1px solid var(--adm-border)",
                        cursor: "pointer",
                      }}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: "var(--adm-accent-bg)", color: "var(--adm-accent)" }}>
                          <p.icon size={18} />
                        </div>
                        {p.badge && (
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                            style={{
                              backgroundColor: p.badge.tone === 'active'
                                ? "var(--adm-accent-bg)"
                                : "var(--adm-input)",
                              color: p.badge.tone === 'active'
                                ? "var(--adm-accent)"
                                : "var(--adm-text-secondary)",
                            }}
                          >
                            {p.badge.text}
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-semibold mb-1" style={{ color: "var(--adm-text)" }}>
                        {p.title}
                      </h3>
                      <p className="text-xs leading-relaxed" style={{ color: "var(--adm-text-secondary)" }}>
                        {p.desc}
                      </p>
                      <div className="mt-3 flex items-center gap-1 text-xs font-medium"
                        style={{ color: "var(--adm-accent)" }}>
                        进入编辑
                        <ArrowLeft size={11} className="rotate-180 transition-transform group-hover:translate-x-0.5" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* ============ General tab ============ */}
        {/* ============ Brand & Identity tab (Storefront) ============ */}
        {subTab === "brand" && settings && (
          <Section icon={Sparkles} title="Brand & Identity">
            <p className="text-xs mb-4" style={{ color: "var(--adm-text-secondary)" }}>
              Your storefront brand identity and visual style.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Site Logo" desc="Upload your brand logo (recommended: PNG, 200x60px)">
                <ImageUploader value={settings.siteLogo || ""} onChange={v => update("siteLogo", v)} />
              </Field>
              <Field label="Site Name"><Input value={settings.siteName || ""} onChange={v => update("siteName", v)} /></Field>
              <Field label="Tagline"><Input value={settings.siteTagline || ""} onChange={v => update("siteTagline", v)} /></Field>
              <Field label="Site URL"><Input value={settings.siteUrl || ""} onChange={v => update("siteUrl", v)} placeholder="https://yourdomain.com" /></Field>
              <Field label="About"><Textarea value={settings.aboutText || ""} onChange={v => update("aboutText", v)} /></Field>
              <Field label="Primary Color"><Input value={settings.primaryColor || ""} onChange={v => update("primaryColor", v)} /></Field>
              <Field label="Accent Color"><Input value={settings.accentColor || ""} onChange={v => update("accentColor", v)} /></Field>
            </div>
          </Section>
        )}

        {/* ============ General tab (System) ============ */}
        {subTab === "general" && settings && (
          <Section icon={Settings} title="General System Settings">
            <p className="text-xs mb-4" style={{ color: "var(--adm-text-secondary)" }}>
              Core system configuration and admin accounts.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Currency"><Input value={settings.currency || "USD"} onChange={v => update("currency", v)} /></Field>
              <Field label="CNY/USD Rate (人民币换算汇率)" desc="商品编辑表单中 ¥↔$ 辅助换算使用; 修改后重新打开商品编辑页生效">
                <Input type="number" value={String(settings.cnyUsdRate ?? 7.2)} onChange={v => update("cnyUsdRate", Number(v))} />
              </Field>
              <Field label="Admin Username"><Input value={settings.adminUsername || ""} onChange={v => update("adminUsername", v)} /></Field>
              <Field label="Admin Password（留空则不修改，填写后保存即生效，至少 8 位）">
                <Input
                  type="password"
                  value={settings.adminPassword || ""}
                  placeholder="留空表示保持当前密码不变"
                  onChange={v => update("adminPassword", v)}
                />
              </Field>
            </div>
          </Section>
        )}

        {/* ============ Admin UI tab (System) ============ */}
        {subTab === "admin-ui" && settings && (
          <>
            <Section icon={ImageIcon} title="Admin Background">
              <p className="text-xs mb-4" style={{ color: "var(--adm-text-secondary)" }}>
                Customize the admin panel background with an image and adjust tone/color filters.
              </p>
              <Field label="Background Image" desc="Upload an image to use as admin panel background">
                <ImageUploader
                  value={settings.adminBgImage || ""}
                  onChange={v => update("adminBgImage", v)}
                  label="Upload"
                  previewFilter={`brightness(${settings.adminBgBrightness ?? 100}%) contrast(${settings.adminBgContrast ?? 100}%) saturate(${settings.adminBgSaturation ?? 100}%) blur(${settings.adminBgBlur ?? 0}px)`}
                  previewOverlay={settings.adminBgOverlay !== undefined ? `rgba(0, 0, 0, ${settings.adminBgOverlay / 100})` : undefined}
                  previewWarmth={settings.adminBgWarmth !== undefined && settings.adminBgWarmth !== 50 ? (() => {
                    const warmthValue = (settings.adminBgWarmth! - 50) * 2
                    return warmthValue > 0
                      ? `rgba(255, ${Math.max(0, 180 - warmthValue * 0.8)}, ${Math.max(0, 100 - warmthValue * 0.5)}, ${Math.abs(warmthValue) * 0.003})`
                      : `rgba(${Math.max(0, 100 + warmthValue * -0.5)}, ${Math.max(0, 150 + warmthValue * -0.3)}, 255, ${Math.abs(warmthValue) * 0.003})`
                  })() : undefined}
                />
              </Field>
              {settings.adminBgImage && (
                <>
                  <Field label="Apply to Sidebar" desc="Show background image effect on left sidebar (translucent glass effect)">
                    <button
                      type="button"
                      onClick={() => update("adminBgSidebar", !(settings.adminBgSidebar !== false))}
                      className="relative w-12 h-7 rounded-full transition-all"
                      style={{
                        backgroundColor: settings.adminBgSidebar !== false ? "var(--adm-accent)" : "var(--adm-border)",
                      }}
                    >
                      <span
                        className="absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-all"
                        style={{ left: settings.adminBgSidebar !== false ? "22px" : "2px" }}
                      />
                    </button>
                  </Field>
                  <Field label={`Overlay Opacity (${settings.adminBgOverlay ?? 60}%)`} desc="Dark/light overlay to make text more readable">
                    <input type="range" min={0} max={100} value={settings.adminBgOverlay ?? 60} onChange={e => update("adminBgOverlay", Number(e.target.value))} className="w-full h-1.5 rounded-full cursor-pointer" style={{ backgroundColor: "var(--adm-input-border)", accentColor: "var(--adm-accent)" }} />
                  </Field>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Brightness">
                      <RangeSlider value={settings.adminBgBrightness ?? 100} onChange={v => update("adminBgBrightness", v)} label="Brightness" icon={Sun} min={20} max={200} />
                    </Field>
                    <Field label="Contrast">
                      <RangeSlider value={settings.adminBgContrast ?? 100} onChange={v => update("adminBgContrast", v)} label="Contrast" icon={Contrast} min={50} max={200} />
                    </Field>
                    <Field label="Saturation">
                      <RangeSlider value={settings.adminBgSaturation ?? 100} onChange={v => update("adminBgSaturation", v)} label="Saturation" icon={Palette} min={0} max={200} />
                    </Field>
                    <Field label="Blur">
                      <RangeSlider value={settings.adminBgBlur ?? 0} onChange={v => update("adminBgBlur", v)} label="Blur (px)" icon={ImageIcon} min={0} max={30} />
                    </Field>
                  </div>
                  <Field label="Warmth / Hue Tint" desc="Add a warm or cool color tint to the background">
                    <RangeSlider value={settings.adminBgWarmth ?? 50} onChange={v => update("adminBgWarmth", v)} label="Warmth" icon={Sun} min={0} max={100} />
                  </Field>
                </>
              )}
            </Section>

            <Section icon={Palette} title="Panel Style">
              <p className="text-xs mb-4" style={{ color: "var(--adm-text-secondary)" }}>
                Change how all panels/cards look across the admin panel.
              </p>
              <div className="space-y-3">
                {[
                  {
                    id: "light",
                    label: "☀️ Light Themes",
                    styles: [
                      { id: "solid", label: "Solid", desc: "Opaque cards" },
                      { id: "glass", label: "Glass", desc: "Frosted glass" },
                      { id: "mono", label: "Mono", desc: "White + thick black border" },
                      { id: "gold", label: "Gold", desc: "Metallic gold border" },
                    ],
                  },
                  {
                    id: "dark",
                    label: "🌙 Dark Themes",
                    styles: [
                      { id: "cyber", label: "Cyber", desc: "Neon glow grid" },
                      { id: "brutalist", label: "Brutalist", desc: "Hard border + offset shadow" },
                      { id: "matrix", label: "Matrix", desc: "Green terminal" },
                      { id: "holo", label: "Holo", desc: "Rainbow holographic" },
                      { id: "midnight", label: "Midnight", desc: "Deep blue with stars" },
                      { id: "obsidian", label: "Obsidian", desc: "Pure black high contrast" },
                      { id: "noir", label: "Noir", desc: "Film noir B&W" },
                      { id: "slate", label: "Slate", desc: "Refined gray" },
                      { id: "aurora", label: "Aurora", desc: "Violet neon space" },
                      { id: "ocean", label: "Ocean", desc: "Deep teal cyan" },
                      { id: "sunset", label: "Sunset", desc: "Warm plum orange" },
                    ],
                  },
                ].map((group: any) => {
                  const open = panelStyleGroups[group.id] !== false
                  return (
                    <div key={group.id} className="border rounded-lg overflow-hidden" style={{ borderColor: "var(--adm-border)" }}>
                      <button
                        type="button"
                        onClick={() => setPanelStyleGroups((prev: any) => ({ ...prev, [group.id]: !prev[group.id] }))}
                        className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold transition-all adm-hover-bg"
                        style={{
                          color: "var(--adm-text)",
                          cursor: "pointer",
                          border: "none",
                        }}
                      >
                        <span>{group.label}</span>
                        <ChevronDown size={14} style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }} />
                      </button>
                      {open && (
                        <div className="p-2 grid grid-cols-4 gap-2" style={{ backgroundColor: "var(--adm-card)" }}>
                          {group.styles.map((style: any) => (
                            <button
                              key={style.id}
                              type="button"
                              onClick={() => update("adminPanelStyle", style.id)}
                              className="p-2.5 rounded-lg text-xs font-medium transition-all text-left"
                              style={{
                                backgroundColor: (settings.adminPanelStyle || "solid") === style.id ? "var(--adm-accent-bg)" : "var(--adm-input)",
                                color: (settings.adminPanelStyle || "solid") === style.id ? "var(--adm-accent)" : "var(--adm-text-secondary)",
                                border: "1px solid " + ((settings.adminPanelStyle || "solid") === style.id ? "var(--adm-accent)" : "var(--adm-input-border)"),
                                cursor: "pointer",
                              }}
                            >
                              <div className="font-semibold">{style.label}</div>
                              <div className="text-[10px] opacity-70 mt-0.5">{style.desc}</div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </Section>

            <Section icon={Sparkles} title="Hover Effect">
              <p className="text-xs mb-4" style={{ color: "var(--adm-text-secondary)" }}>
                Subtle animation when hovering over buttons, cards, and menu items.
              </p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "default", label: "Default", desc: "Soft fade" },
                  { id: "glass", label: "Glass", desc: "Frosted glow" },
                  { id: "apple", label: "Apple", desc: "Smooth scale" },
                  { id: "shimmer", label: "Shimmer", desc: "Light sweep" },
                  { id: "indicator", label: "Bar", desc: "Side indicator" },
                  { id: "pulse", label: "Pulse", desc: "Soft glow" },
                ].map(effect => (
                  <button
                    key={effect.id}
                    type="button"
                    onClick={() => update("sidebarHoverStyle", effect.id)}
                    className="p-3 rounded-lg text-xs font-medium transition-all text-left"
                    style={{
                      backgroundColor: (settings.sidebarHoverStyle || "default") === effect.id ? "var(--adm-accent-bg)" : "var(--adm-input)",
                      color: (settings.sidebarHoverStyle || "default") === effect.id ? "var(--adm-accent)" : "var(--adm-text-secondary)",
                      border: "1px solid " + ((settings.sidebarHoverStyle || "default") === effect.id ? "var(--adm-accent)" : "var(--adm-input-border)"),
                      cursor: "pointer",
                    }}
                  >
                    <div className="font-semibold">{effect.label}</div>
                    <div className="text-[10px] opacity-70 mt-0.5">{effect.desc}</div>
                  </button>
                ))}
              </div>
            </Section>

            <Section icon={Layout} title="List Effects">
              <p className="text-xs mb-4" style={{ color: "var(--adm-text-secondary)" }}>
                Frosted float &amp; blur when hovering list rows, sidebar nav items, and dropdown items.
              </p>
              <Field label="List Hover Float &amp; Blur" desc="列表行 / 导航项 / 菜单项悬停时上浮并虚化背景">
                <button
                  type="button"
                  onClick={() => update("glassLists", settings.glassLists === false)}
                  className="relative w-11 h-6 rounded-full transition-colors"
                  style={{ backgroundColor: settings.glassLists !== false ? "var(--adm-accent)" : "var(--adm-input-border)", cursor: "pointer" }}
                >
                  <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all" style={{ left: settings.glassLists !== false ? "22px" : "2px" }} />
                </button>
              </Field>
            </Section>
          </>
        )}

        {/* ============ Notifications tab (System) ============ */}
        {subTab === "notifications" && settings && (
          <Section icon={Bell} title="Desktop Notifications">
            <p className="text-xs mb-4" style={{ color: "var(--adm-text-secondary)" }}>
              Push notification toasts in the top-right corner of the admin panel.
            </p>
            <div className="space-y-4">
              <Field label="New Order Notifications" desc="Show toast when a new order is received">
                <button
                  type="button"
                  onClick={() => update("notifyNewOrders", settings.notifyNewOrders !== false)}
                  className="relative w-12 h-7 rounded-full transition-all"
                  style={{
                    backgroundColor: settings.notifyNewOrders !== false ? "var(--adm-accent)" : "var(--adm-border)",
                  }}
                >
                  <span
                    className="absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-all"
                    style={{ left: settings.notifyNewOrders !== false ? "22px" : "2px" }}
                  />
                </button>
              </Field>
              <Field label="New Message Notifications" desc="Show toast when a customer or internal staff sends a new message">
                <button
                  type="button"
                  onClick={() => update("notifyNewMessages", settings.notifyNewMessages !== false)}
                  className="relative w-12 h-7 rounded-full transition-all"
                  style={{
                    backgroundColor: settings.notifyNewMessages !== false ? "var(--adm-accent)" : "var(--adm-border)",
                  }}
                >
                  <span
                    className="absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-all"
                    style={{ left: settings.notifyNewMessages !== false ? "22px" : "2px" }}
                  />
                </button>
              </Field>
              <Field label="Auto-Dismiss (seconds)" desc="How long a toast stays before auto-closing">
                <Input type="number" value={String(settings.notifyDuration || 8)} onChange={v => update("notifyDuration", Number(v))} />
              </Field>
            </div>
          </Section>
        )}

        {/* ============ AI Assistant tab (System) ============ */}
        {subTab === "ai-assistant" && settings && (
          <div className="space-y-5">
            <Section icon={Bot} title="对话助手 AI（Floating Assistant）">
              <p className="text-xs mb-4" style={{ color: "var(--adm-text-secondary)" }}>
                配置右下角悬浮对话助手。它用于订单分析、客户洞察与业务问答，与 Content Studio 的文案/图片通道相互独立。
              </p>

              <div className="space-y-5">
              {/* Enable/Disable */}
              <Field label="Enable AI Assistant" desc="Turn on the AI assistant floating widget">
                <button
                  type="button"
                  onClick={() => update("aiEnabled", !settings.aiEnabled)}
                  className="relative w-12 h-7 rounded-full transition-all"
                  style={{ backgroundColor: settings.aiEnabled ? "var(--adm-accent)" : "var(--adm-border)" }}
                >
                  <span
                    className="absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-all"
                    style={{ left: settings.aiEnabled ? "22px" : "2px" }}
                  />
                </button>
              </Field>

              {/* Assistant Name */}
              <Field label="Assistant Name" desc="Display name shown in the chat header">
                <Input value={settings.aiAssistantName || ""} onChange={v => update("aiAssistantName", v)} placeholder="Aria" />
              </Field>

              {/* Avatar */}
              <Field label="Avatar" desc="Choose the assistant's avatar style">
                <div className="flex gap-3 flex-wrap">
                  {[
                    { key: "bot", label: "机器人", emoji: "🤖" },
                    { key: "woman", label: "女生", emoji: "👩‍💼" },
                    { key: "man", label: "男生", emoji: "👨‍💼" },
                    { key: "wizard", label: "魔法师", emoji: "🧙" },
                    { key: "cat", label: "猫咪", emoji: "🐱" },
                    { key: "fox", label: "狐狸", emoji: "🦊" },
                  ].map(av => (
                    <button
                      key={av.key}
                      type="button"
                      onClick={() => update("aiAvatar", av.key)}
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl transition-all"
                      style={{
                        backgroundColor: settings.aiAvatar === av.key ? "var(--adm-accent)" : "var(--adm-input)",
                        border: `2px solid ${settings.aiAvatar === av.key ? "var(--adm-accent)" : "var(--adm-border)"}`,
                        transform: settings.aiAvatar === av.key ? "scale(1.1)" : "scale(1)",
                      }}
                    >
                      {av.emoji}
                    </button>
                  ))}
                </div>
              </Field>

              {/* Personality */}
              <Field label="Personality" desc="Adjust the assistant's tone and style">
                <div className="space-y-2">
                  {[
                    { key: "professional", label: "专业严谨", desc: "正式、简洁、数据驱动" },
                    { key: "friendly", label: "亲切友好", desc: "活泼、热情、像朋友聊天" },
                    { key: "humorous", label: "幽默风趣", desc: "轻松、有趣、偶尔开玩笑" },
                    { key: "concise", label: "极简高效", desc: "只给关键信息，不说废话" },
                  ].map(p => (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => update("aiPersonality", p.key)}
                      className="w-full px-3 py-2 rounded-lg text-left transition-all"
                      style={{
                        backgroundColor: settings.aiPersonality === p.key ? "var(--adm-accent)" : "var(--adm-input)",
                        color: settings.aiPersonality === p.key ? "var(--adm-accent-text)" : "var(--adm-text)",
                        border: `1px solid ${settings.aiPersonality === p.key ? "var(--adm-accent)" : "var(--adm-border)"}`,
                      }}
                    >
                      <div className="text-sm font-medium">{p.label}</div>
                      <div className="text-xs" style={{ opacity: 0.7 }}>{p.desc}</div>
                    </button>
                  ))}
                </div>
              </Field>

              {/* ===== 大模型库（主 AI 与文案共用）===== */}
              <div className="rounded-2xl p-4" style={{ backgroundColor: "var(--adm-card)", border: "1px solid var(--adm-border)" }}>
                <p className="text-sm font-semibold mb-1" style={{ color: "var(--adm-text)" }}>大模型库（主 AI 与文案共用）</p>
                <p className="text-xs mb-3" style={{ color: "var(--adm-text-secondary)" }}>
                  在此保存多家厂商配置，选择「当前使用」后，对话助手与 Content Studio 文案均使用该模型。
                </p>

                {/* 当前使用选择器 */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div>
                    <label className="text-[11px] font-semibold mb-1 block" style={{ color: "var(--adm-text-secondary)" }}>当前厂商</label>
                    <select
                      value={settings.aiProvider || "deepseek"}
                      onChange={e => {
                        const p = e.target.value
                        update("aiProvider", p)
                        const models = settings.aiLLMProviders?.[p]?.models || []
                        const def = models[0]?.id || (p === "deepseek" ? "deepseek-chat" : "")
                        if (def) update("aiModel", def)
                        if (settings.aiLLMProviders?.[p]?.baseUrl) update("aiBaseUrl", settings.aiLLMProviders[p].baseUrl)
                      }}
                      className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                      style={{ backgroundColor: "var(--adm-input)", border: "1px solid var(--adm-border)", color: "var(--adm-text)" }}
                    >
                      {llmProviderKeys.map(p => (
                        <option key={p} value={p}>{LLM_PROVIDER_LABELS[p] || p}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold mb-1 block" style={{ color: "var(--adm-text-secondary)" }}>当前模型</label>
                    <select
                      value={settings.aiModel || ""}
                      onChange={e => update("aiModel", e.target.value)}
                      className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                      style={{ backgroundColor: "var(--adm-input)", border: "1px solid var(--adm-border)", color: "var(--adm-text)" }}
                    >
                      {!settings.aiModel && <option value="">选择模型…</option>}
                      {currentLLMModelOptions.map((m: any) => (
                        <option key={m.id} value={m.id}>{m.label}</option>
                      ))}
                      {settings.aiModel && !currentLLMModelOptions.some((m: any) => m.id === settings.aiModel) && (
                        <option value={settings.aiModel}>自定义：{settings.aiModel}</option>
                      )}
                    </select>
                  </div>
                </div>

                {/* 各厂商配置卡片 */}
                <div className="space-y-2">
                  {llmProviderKeys.map(p => {
                    const conf = settings.aiLLMProviders?.[p] || { apiKey: "", baseUrl: "", models: [] }
                    const open = llmProviderOpen[p]
                    return (
                      <div key={p} className="rounded-xl" style={{ border: "1px solid var(--adm-border)", backgroundColor: "var(--adm-input)" }}>
                        <button
                          type="button"
                          onClick={() => setLlmProviderOpen(prev => ({ ...prev, [p]: !prev[p] }))}
                          className="w-full flex items-center justify-between px-3 py-2.5 text-left"
                        >
                          <span className="text-sm font-medium" style={{ color: "var(--adm-text)" }}>
                            {LLM_PROVIDER_LABELS[p] || p}
                            {conf.apiKey && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: "rgba(34,197,94,0.12)", color: "#22c55e" }}>已配置</span>}
                          </span>
                          <ChevronDown size={14} style={{ color: "var(--adm-text-secondary)", transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
                        </button>
                        {open && (
                          <div className="px-3 pb-3 space-y-2">
                            <Input
                              type="password"
                              value={conf.apiKey || ""}
                              onChange={v => updateLLMProvider(p, "apiKey", v)}
                              placeholder={conf.apiKey ? "已配置（留空保留）" : "API Key"}
                            />
                            <Input
                              value={conf.baseUrl || ""}
                              onChange={v => updateLLMProvider(p, "baseUrl", v)}
                              placeholder="Base URL（默认自动填充）"
                            />
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={async () => {
                                  setLlmLibLoading(prev => ({ ...prev, [p]: true }))
                                  setLlmLibMsg(prev => ({ ...prev, [p]: "" }))
                                  try {
                                    const r = await fetch('/api/ai/llm-models', {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ provider: p, baseUrl: conf.baseUrl, apiKey: realKeyOrEmpty(conf.apiKey) }),
                                    })
                                    const d = await r.json()
                                    if (r.ok && d.success) {
                                      updateLLMProvider(p, "models", d.models || [])
                                      setLlmLibMsg(prev => ({ ...prev, [p]: d.message || `已更新 ${(d.models || []).length} 个模型` }))
                                    } else {
                                      setLlmLibMsg(prev => ({ ...prev, [p]: d.error || "更新失败" }))
                                    }
                                  } catch (e: any) {
                                    setLlmLibMsg(prev => ({ ...prev, [p]: e?.message || "网络错误" }))
                                  } finally {
                                    setLlmLibLoading(prev => ({ ...prev, [p]: false }))
                                  }
                                }}
                                disabled={llmLibLoading[p]}
                                className="px-3 py-1.5 rounded-lg text-xs font-medium"
                                style={{ backgroundColor: "var(--adm-card)", border: "1px solid var(--adm-border)", color: "var(--adm-accent)" }}
                              >
                                {llmLibLoading[p] ? "更新中…" : "刷新模型"}
                              </button>
                              <span className="text-[11px]" style={{ color: "var(--adm-text-secondary)" }}>{conf.models?.length || 0} 个模型</span>
                            </div>
                            {llmLibMsg[p] && <p className="text-[11px]" style={{ color: llmLibMsg[p].includes("失败") ? "#DC2626" : "var(--adm-text-secondary)" }}>{llmLibMsg[p]}</p>}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* System Prompt */}
              <Field label="System Prompt" desc="Instructions that define the assistant's behavior and role">
                <Textarea
                  value={settings.aiSystemPrompt || ""}
                  onChange={v => update("aiSystemPrompt", v)}
                  rows={4}
                  placeholder="You are a helpful e-commerce assistant..."
                />
              </Field>

              {/* Test Connection */}
              <div className="pt-2">
                <button
                  onClick={async () => {
                    setAiTesting(true)
                    setAiTestResult(null)
                    try {
                      const r = await fetch('/api/ai/test', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          provider: settings.aiProvider,
                          apiKey: realKeyOrEmpty(settings.aiLLMProviders?.[settings.aiProvider || "deepseek"]?.apiKey) || realKeyOrEmpty(settings.aiApiKey),
                          model: settings.aiModel,
                          baseUrl: settings.aiLLMProviders?.[settings.aiProvider || "deepseek"]?.baseUrl || settings.aiBaseUrl,
                        }),
                      })
                      const d = await r.json()
                      if (r.ok && d.success) {
                        setAiTestResult({ success: true, message: d.message })
                      } else {
                        setAiTestResult({ success: false, message: d.error || 'Connection failed' })
                      }
                    } catch (e: any) {
                      setAiTestResult({ success: false, message: e.message || 'Network error' })
                    } finally {
                      setAiTesting(false)
                    }
                  }}
                  disabled={aiTesting || !settings.aiApiKey}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
                  style={{
                    backgroundColor: (aiTesting || !settings.aiApiKey) ? "var(--adm-input)" : "var(--adm-accent)",
                    color: (aiTesting || !settings.aiApiKey) ? "var(--adm-text-secondary)" : "var(--adm-accent-text)",
                    border: "1px solid var(--adm-border)",
                    cursor: (aiTesting || !settings.aiApiKey) ? "not-allowed" : "pointer",
                  }}
                >
                  {aiTesting ? "Testing..." : "Test Connection"}
                </button>
                {aiTestResult && (
                  <div
                    className="mt-2 px-3 py-2 rounded-lg text-xs"
                    style={{
                      backgroundColor: aiTestResult.success ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
                      color: aiTestResult.success ? "#22c55e" : "#ef4444",
                      border: `1px solid ${aiTestResult.success ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`,
                    }}
                  >
                    {aiTestResult.success ? "✓ " : "✗ "}{aiTestResult.message}
                  </div>
                )}
              </div>
              </div>
            </Section>

            {/* ===== 文案生成 AI（Content Studio）===== */}
            <Section icon={PenTool} title="文案生成 AI（Content Studio）">
              <p className="text-xs mb-4" style={{ color: "var(--adm-text-secondary)" }}>
                文案 AI 已与主 AI 共用「大模型库」：在上方大模型库选择当前厂商与模型后，Content Studio 的文案生成、微调、画风建议均自动使用该模型。
              </p>

              <div className="space-y-5">
                <div className="rounded-2xl p-4 flex items-center gap-3" style={{ backgroundColor: "var(--adm-input)", border: "1px solid var(--adm-border)" }}>
                  <PenTool size={18} style={{ color: "var(--adm-accent)" }} />
                  <div>
                    <p className="text-sm font-medium" style={{ color: "var(--adm-text)" }}>
                      当前文案模型：{LLM_PROVIDER_LABELS[settings.aiProvider || "deepseek"] || settings.aiProvider} · {settings.aiModel || "deepseek-chat"}
                    </p>
                    <p className="text-xs" style={{ color: "var(--adm-text-secondary)" }}>
                      修改请在上方「大模型库」切换厂商与模型；营销页文案区也可临时选择其他模型。
                    </p>
                  </div>
                </div>
              </div>
            </Section>

            {/* ===== 图片生成 AI（Content Studio）===== */}
            <Section icon={ImageIcon} title="图片生成 AI（Content Studio）">
              <p className="text-xs mb-4" style={{ color: "var(--adm-text-secondary)" }}>
                Content Studio 生成营销配图使用的独立图片生成通道。硅基流动（SiliconFlow）国内可直连；MiniMax image-01 支持按参考图/产品图生成。
              </p>

              <div className="space-y-5">
                {/* Enable/Disable */}
                <Field label="Enable Image Generation" desc="Turn on AI image generation in Content Studio">
                  <button
                    type="button"
                    onClick={() => update("aiImageEnabled", !settings.aiImageEnabled)}
                    className="relative w-12 h-7 rounded-full transition-all"
                    style={{ backgroundColor: settings.aiImageEnabled ? "var(--adm-accent)" : "var(--adm-border)" }}
                  >
                    <span
                      className="absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-all"
                      style={{ left: settings.aiImageEnabled ? "22px" : "2px" }}
                    />
                  </button>
                </Field>

                {/* ===== 图片模型库 ===== */}
                <div className="rounded-2xl p-4" style={{ backgroundColor: "var(--adm-card)", border: "1px solid var(--adm-border)" }}>
                  <p className="text-sm font-semibold mb-1" style={{ color: "var(--adm-text)" }}>图片模型库（多厂商汇总）</p>
                  <p className="text-xs mb-3" style={{ color: "var(--adm-text-secondary)" }}>
                    保存多家图片厂商配置；下方分别选择「文生图」与「参考图」使用的厂商和模型。
                  </p>

                  {/* 文生图当前选择 */}
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div>
                      <label className="text-[11px] font-semibold mb-1 block" style={{ color: "var(--adm-text-secondary)" }}>文生图厂商</label>
                      <select
                        value={settings.aiImageProvider || "siliconflow"}
                        onChange={e => {
                          const p = e.target.value
                          update("aiImageProvider", p)
                          const models = settings.aiImageProviders?.[p]?.models || []
                          if (models[0]?.id) update("aiImageModel", models[0].id)
                          if (settings.aiImageProviders?.[p]?.baseUrl) update("aiImageBaseUrl", settings.aiImageProviders[p].baseUrl)
                        }}
                        className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                        style={{ backgroundColor: "var(--adm-input)", border: "1px solid var(--adm-border)", color: "var(--adm-text)" }}
                      >
                        {imgProviderKeys.map(p => (
                          <option key={p} value={p}>{IMG_PROVIDER_LABELS[p] || p}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold mb-1 block" style={{ color: "var(--adm-text-secondary)" }}>文生图模型</label>
                      <select
                        value={settings.aiImageModel || ""}
                        onChange={e => update("aiImageModel", e.target.value)}
                        className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                        style={{ backgroundColor: "var(--adm-input)", border: "1px solid var(--adm-border)", color: "var(--adm-text)" }}
                      >
                        {!settings.aiImageModel && <option value="">选择模型…</option>}
                        {currentImgModelOptions.map((m: any) => (
                          <option key={m.id} value={m.id}>{m.label}</option>
                        ))}
                        {settings.aiImageModel && !currentImgModelOptions.some((m: any) => m.id === settings.aiImageModel) && (
                          <option value={settings.aiImageModel}>自定义：{settings.aiImageModel}</option>
                        )}
                      </select>
                    </div>
                  </div>

                  {/* 各图片厂商配置卡片 */}
                  <div className="space-y-2">
                    {imgProviderKeys.map(p => {
                      const conf = settings.aiImageProviders?.[p] || { apiKey: "", baseUrl: "", models: [] }
                      const open = imgProviderOpen[p]
                      return (
                        <div key={p} className="rounded-xl" style={{ border: "1px solid var(--adm-border)", backgroundColor: "var(--adm-input)" }}>
                          <button
                            type="button"
                            onClick={() => setImgProviderOpen(prev => ({ ...prev, [p]: !prev[p] }))}
                            className="w-full flex items-center justify-between px-3 py-2.5 text-left"
                          >
                            <span className="text-sm font-medium" style={{ color: "var(--adm-text)" }}>
                              {IMG_PROVIDER_LABELS[p] || p}
                              {conf.apiKey && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: "rgba(34,197,94,0.12)", color: "#22c55e" }}>已配置</span>}
                            </span>
                            <ChevronDown size={14} style={{ color: "var(--adm-text-secondary)", transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
                          </button>
                          {open && (
                            <div className="px-3 pb-3 space-y-2">
                              <Input
                                type="password"
                                value={conf.apiKey || ""}
                                onChange={v => updateImageProviderLib(p, "apiKey", v)}
                                placeholder={conf.apiKey ? "已配置（留空保留）" : "API Key"}
                              />
                              <Input
                                value={conf.baseUrl || ""}
                                onChange={v => updateImageProviderLib(p, "baseUrl", v)}
                                placeholder="Base URL（默认自动填充）"
                              />
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={async () => {
                                    setImgLibLoading(prev => ({ ...prev, [p]: true }))
                                    setImgLibMsg(prev => ({ ...prev, [p]: "" }))
                                    try {
                                      const r = await fetch('/api/ai/image-models', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ provider: p, baseUrl: conf.baseUrl, apiKey: realKeyOrEmpty(conf.apiKey) }),
                                      })
                                      const d = await r.json()
                                      if (r.ok && d.success) {
                                        updateImageProviderLib(p, "models", d.models || [])
                                        setImgLibMsg(prev => ({ ...prev, [p]: d.message || `已更新 ${(d.models || []).length} 个模型` }))
                                      } else {
                                        setImgLibMsg(prev => ({ ...prev, [p]: d.error || "更新失败" }))
                                      }
                                    } catch (e: any) {
                                      setImgLibMsg(prev => ({ ...prev, [p]: e?.message || "网络错误" }))
                                    } finally {
                                      setImgLibLoading(prev => ({ ...prev, [p]: false }))
                                    }
                                  }}
                                  disabled={imgLibLoading[p]}
                                  className="px-3 py-1.5 rounded-lg text-xs font-medium"
                                  style={{ backgroundColor: "var(--adm-card)", border: "1px solid var(--adm-border)", color: "var(--adm-accent)" }}
                                >
                                  {imgLibLoading[p] ? "更新中…" : "刷新模型"}
                                </button>
                                <span className="text-[11px]" style={{ color: "var(--adm-text-secondary)" }}>{conf.models?.length || 0} 个模型</span>
                              </div>
                              {imgLibMsg[p] && <p className="text-[11px]" style={{ color: imgLibMsg[p].includes("失败") ? "#DC2626" : "var(--adm-text-secondary)" }}>{imgLibMsg[p]}</p>}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Size */}
                <Field label="Default Image Size" desc="Aspect ratio used when generating images">
                  <select
                    value={settings.aiImageSize || "1024x1024"}
                    onChange={e => update("aiImageSize", e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                    style={{
                      backgroundColor: "var(--adm-input)",
                      border: "1px solid var(--adm-border)",
                      color: "var(--adm-text)",
                    }}
                  >
                    <option value="1024x1024">1024 x 1024（正方形）</option>
                    <option value="768x1024">768 x 1024（竖版）</option>
                    <option value="1024x768">1024 x 768（横版）</option>
                    <option value="512x512">512 x 512（小图）</option>
                  </select>
                </Field>

                {/* 参考图生成（图生图）当前选择 */}
                <div className="pt-4 mt-4 border-t" style={{ borderColor: "var(--adm-border)" }}>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-semibold" style={{ color: "var(--adm-text)" }}>参考图生成（图生图）</p>
                    <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: "rgba(139,168,160,0.15)", color: "var(--adm-accent)", border: "1px dashed var(--adm-accent)" }}>
                      独立选择
                    </span>
                  </div>
                  <p className="text-xs mb-3" style={{ color: "var(--adm-text-secondary)" }}>
                    使用上方图片模型库中的厂商与模型（可选用不同厂家，如文生图硅基流动、参考图方舟 Seedream）。
                  </p>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div>
                      <label className="text-[11px] font-semibold mb-1 block" style={{ color: "var(--adm-text-secondary)" }}>参考图厂商</label>
                      <select
                        value={settings.aiImageRefProvider || settings.aiImageProvider || "siliconflow"}
                        onChange={e => {
                          const p = e.target.value
                          update("aiImageRefProvider", p)
                          const models = settings.aiImageProviders?.[p]?.models || []
                          const refModels = models.filter((m: any) => /seedream|image-01|z-image|qwen-image|edit|flux/i.test(m.id))
                          const def = refModels[1]?.id || refModels[0]?.id || models[0]?.id || ""
                          if (def) update("aiImageRefModel", def)
                          if (settings.aiImageProviders?.[p]?.baseUrl) update("aiImageRefBaseUrl", settings.aiImageProviders[p].baseUrl)
                        }}
                        className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                        style={{ backgroundColor: "var(--adm-input)", border: "1px solid var(--adm-border)", color: "var(--adm-text)" }}
                      >
                        {imgProviderKeys.map(p => (
                          <option key={p} value={p}>{IMG_PROVIDER_LABELS[p] || p}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold mb-1 block" style={{ color: "var(--adm-text-secondary)" }}>参考图模型</label>
                      <select
                        value={settings.aiImageRefModel || ""}
                        onChange={e => update("aiImageRefModel", e.target.value)}
                        className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                        style={{ backgroundColor: "var(--adm-input)", border: "1px solid var(--adm-border)", color: "var(--adm-text)" }}
                      >
                        {!settings.aiImageRefModel && <option value="">选择模型…</option>}
                        {currentRefImgModelOptions.map((m: any) => (
                          <option key={m.id} value={m.id}>{m.label}</option>
                        ))}
                        {settings.aiImageRefModel && !currentRefImgModelOptions.some((m: any) => m.id === settings.aiImageRefModel) && (
                          <option value={settings.aiImageRefModel}>自定义：{settings.aiImageRefModel}</option>
                        )}
                      </select>
                    </div>
                  </div>

                  {/* 参考图连接测试 */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={async () => {
                        setAiImageRefTesting(true)
                        setAiImageRefTestResult(null)
                        try {
                          const refP = settings.aiImageRefProvider || settings.aiImageProvider || "siliconflow"
                          const conf = settings.aiImageProviders?.[refP] || {}
                          const r = await fetch('/api/ai/test-image', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              apiKey: realKeyOrEmpty(conf.apiKey),
                              baseUrl: conf.baseUrl || settings.aiImageRefBaseUrl || settings.aiImageBaseUrl,
                              model: settings.aiImageRefModel,
                              provider: refP,
                              mode: 'reference',
                            }),
                          })
                          const d = await r.json()
                          if (r.ok && d.success) {
                            setAiImageRefTestResult({ success: true, message: d.message })
                          } else {
                            setAiImageRefTestResult({ success: false, message: d.error || 'Connection failed' })
                          }
                        } catch (e: any) {
                          setAiImageRefTestResult({ success: false, message: e.message || 'Network error' })
                        } finally {
                          setAiImageRefTesting(false)
                        }
                      }}
                      disabled={aiImageRefTesting}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
                      style={{
                        backgroundColor: aiImageRefTesting ? "var(--adm-input)" : "var(--adm-accent)",
                        color: aiImageRefTesting ? "var(--adm-text-secondary)" : "var(--adm-accent-text)",
                        border: "1px solid var(--adm-border)",
                        cursor: aiImageRefTesting ? "not-allowed" : "pointer",
                      }}
                    >
                      {aiImageRefTesting ? "Testing..." : "测试参考图配置连接"}
                    </button>
                    {aiImageRefTestResult && (
                      <div
                        className="mt-2 px-3 py-2 rounded-lg text-xs"
                        style={{
                          backgroundColor: aiImageRefTestResult.success ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
                          color: aiImageRefTestResult.success ? "#22c55e" : "#ef4444",
                          border: `1px solid ${aiImageRefTestResult.success ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`,
                        }}
                      >
                        {aiImageRefTestResult.success ? "✓" : "✕"}{aiImageRefTestResult.message}
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </Section>

            {/* ===== 视频生成 AI（Content Studio）===== */}
            <Section icon={Video} title="视频生成 AI（Content Studio）">
              <p className="text-xs mb-4" style={{ color: "var(--adm-text-secondary)" }}>
                Content Studio 图生视频使用的独立视频生成通道。火山方舟 Seedance 支持参考图/产品图生成视频（异步任务，约 1-3 分钟）；MiniMax H3 / Video-01 也支持图生视频。
              </p>

              <Field label="Enable Video Generation" desc="Turn on AI video generation in Content Studio">
                <button
                  type="button"
                  onClick={() => update("aiVideoEnabled", !settings.aiVideoEnabled)}
                  className="relative w-12 h-7 rounded-full transition-all"
                  style={{ backgroundColor: settings.aiVideoEnabled ? "var(--adm-accent)" : "var(--adm-border)" }}
                >
                  <span
                    className="absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-all"
                    style={{ left: settings.aiVideoEnabled ? "22px" : "2px" }}
                  />
                </button>
              </Field>

              {/* ===== 视频模型库 ===== */}
              <div className="rounded-2xl p-4" style={{ backgroundColor: "var(--adm-card)", border: "1px solid var(--adm-border)" }}>
                <p className="text-sm font-semibold mb-1" style={{ color: "var(--adm-text)" }}>视频模型库（多厂商汇总）</p>
                <p className="text-xs mb-3" style={{ color: "var(--adm-text-secondary)" }}>
                  保存多家视频厂商配置；下方选择「图生视频」当前使用的厂商和模型。模型名称为预设列表，点击「刷新模型」可跟随官网更新。
                </p>

                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div>
                    <label className="text-[11px] font-semibold mb-1 block" style={{ color: "var(--adm-text-secondary)" }}>视频厂商</label>
                    <select
                      value={settings.aiVideoProvider || "ark"}
                      onChange={e => {
                        const p = e.target.value
                        update("aiVideoProvider", p)
                        const models = settings.aiVideoProviders?.[p]?.models || []
                        if (models[0]?.id) update("aiVideoModel", models[0].id)
                        if (settings.aiVideoProviders?.[p]?.baseUrl) update("aiVideoBaseUrl", settings.aiVideoProviders[p].baseUrl)
                      }}
                      className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                      style={{ backgroundColor: "var(--adm-input)", border: "1px solid var(--adm-border)", color: "var(--adm-text)" }}
                    >
                      {videoProviderKeys.map(p => (
                        <option key={p} value={p}>{VIDEO_PROVIDER_LABELS[p] || p}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold mb-1 block" style={{ color: "var(--adm-text-secondary)" }}>视频模型</label>
                    <select
                      value={settings.aiVideoModel || ""}
                      onChange={e => update("aiVideoModel", e.target.value)}
                      className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                      style={{ backgroundColor: "var(--adm-input)", border: "1px solid var(--adm-border)", color: "var(--adm-text)" }}
                    >
                      {!settings.aiVideoModel && <option value="">选择模型…</option>}
                      {currentVideoModelOptions.map((m: any) => (
                        <option key={m.id} value={m.id}>{m.label}</option>
                      ))}
                      {settings.aiVideoModel && !currentVideoModelOptions.some((m: any) => m.id === settings.aiVideoModel) && (
                        <option value={settings.aiVideoModel}>自定义：{settings.aiVideoModel}</option>
                      )}
                    </select>
                  </div>
                </div>

                {/* 各视频厂商配置卡片 */}
                <div className="space-y-2">
                  {videoProviderKeys.map(p => {
                    const conf = settings.aiVideoProviders?.[p] || { apiKey: "", baseUrl: "", models: [] }
                    const open = videoProviderOpen[p]
                    return (
                      <div key={p} className="rounded-xl" style={{ border: "1px solid var(--adm-border)", backgroundColor: "var(--adm-input)" }}>
                        <button
                          type="button"
                          onClick={() => setVideoProviderOpen(prev => ({ ...prev, [p]: !prev[p] }))}
                          className="w-full flex items-center justify-between px-3 py-2.5 text-left"
                        >
                          <span className="text-sm font-medium" style={{ color: "var(--adm-text)" }}>
                            {VIDEO_PROVIDER_LABELS[p] || p}
                            {conf.apiKey && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: "rgba(34,197,94,0.12)", color: "#22c55e" }}>已配置</span>}
                          </span>
                          <ChevronDown size={14} style={{ color: "var(--adm-text-secondary)", transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
                        </button>
                        {open && (
                          <div className="px-3 pb-3 space-y-2">
                            <Input
                              type="password"
                              value={conf.apiKey || ""}
                              onChange={v => updateVideoProviderLib(p, "apiKey", v)}
                              placeholder={conf.apiKey ? "已配置（留空保留）" : "API Key"}
                            />
                            <Input
                              value={conf.baseUrl || ""}
                              onChange={v => updateVideoProviderLib(p, "baseUrl", v)}
                              placeholder="Base URL（默认自动填入）"
                            />
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={async () => {
                                  setVideoLibLoading(prev => ({ ...prev, [p]: true }))
                                  setVideoLibMsg(prev => ({ ...prev, [p]: "" }))
                                  try {
                                    const r = await fetch('/api/ai/video-models', {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ provider: p, baseUrl: conf.baseUrl, apiKey: realKeyOrEmpty(conf.apiKey) }),
                                    })
                                    const d = await r.json()
                                    if (r.ok && d.success) {
                                      updateVideoProviderLib(p, "models", d.models || [])
                                      setVideoLibMsg(prev => ({ ...prev, [p]: d.message || `已更新 ${(d.models || []).length} 个模型` }))
                                    } else {
                                      setVideoLibMsg(prev => ({ ...prev, [p]: d.error || "更新失败" }))
                                    }
                                  } catch (e: any) {
                                    setVideoLibMsg(prev => ({ ...prev, [p]: e?.message || "网络错误" }))
                                  } finally {
                                    setVideoLibLoading(prev => ({ ...prev, [p]: false }))
                                  }
                                }}
                                disabled={videoLibLoading[p]}
                                className="px-3 py-1.5 rounded-lg text-xs font-medium"
                                style={{ backgroundColor: "var(--adm-card)", border: "1px solid var(--adm-border)", color: "var(--adm-accent)" }}
                              >
                                {videoLibLoading[p] ? "更新中…" : "刷新模型"}
                              </button>
                              <span className="text-[11px]" style={{ color: "var(--adm-text-secondary)" }}>{conf.models?.length || 0} 个模型</span>
                            </div>
                            {videoLibMsg[p] && <p className="text-[11px]" style={{ color: videoLibMsg[p].includes("失败") ? "#DC2626" : "var(--adm-text-secondary)" }}>{videoLibMsg[p]}</p>}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* 视频配置连接测试 */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={async () => {
                    setAiVideoTesting(true)
                    setAiVideoTestResult(null)
                    try {
                      const vidP = settings.aiVideoProvider || "ark"
                      const conf = settings.aiVideoProviders?.[vidP] || {}
                      const r = await fetch('/api/ai/video-models', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          provider: vidP,
                          baseUrl: conf.baseUrl || settings.aiVideoBaseUrl,
                          apiKey: realKeyOrEmpty(conf.apiKey),
                        }),
                      })
                      const d = await r.json()
                      if (r.ok && d.success) {
                        updateVideoProviderLib(vidP, "models", d.models || [])
                        setAiVideoTestResult({ success: true, message: d.message || "连接成功，模型列表已同步" })
                      } else {
                        setAiVideoTestResult({ success: false, message: d.error || "Connection failed" })
                      }
                    } catch (e: any) {
                      setAiVideoTestResult({ success: false, message: e.message || "Network error" })
                    } finally {
                      setAiVideoTesting(false)
                    }
                  }}
                  disabled={aiVideoTesting}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
                  style={{
                    backgroundColor: aiVideoTesting ? "var(--adm-input)" : "var(--adm-accent)",
                    color: aiVideoTesting ? "var(--adm-text-secondary)" : "var(--adm-accent-text)",
                    border: "1px solid var(--adm-border)",
                    cursor: aiVideoTesting ? "not-allowed" : "pointer",
                  }}
                >
                  {aiVideoTesting ? "Testing..." : "测试视频配置连接"}
                </button>
                {aiVideoTestResult && (
                  <div
                    className="mt-2 px-3 py-2 rounded-lg text-xs"
                    style={{
                      backgroundColor: aiVideoTestResult.success ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
                      color: aiVideoTestResult.success ? "#22c55e" : "#ef4444",
                      border: `1px solid ${aiVideoTestResult.success ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`,
                    }}
                  >
                    {aiVideoTestResult.success ? "✓" : "✕"}{aiVideoTestResult.message}
                  </div>
                )}
              </div>
            </Section>

            {/* ===== 音频生成 AI（Content Studio）===== */}
            <Section icon={Music} title="音频生成 AI（Content Studio）">
              <p className="text-xs mb-4" style={{ color: "var(--adm-text-secondary)" }}>
                Content Studio 音频工作室使用：MiniMax Music 生成纯音乐背景音、MiniMax Speech 生成配音。未单独填写 Key 时自动复用 MiniMax 视频/图片 Key。
              </p>

              <div className="rounded-2xl p-4" style={{ backgroundColor: "var(--adm-card)", border: "1px solid var(--adm-border)" }}>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div>
                    <label className="text-[11px] font-semibold mb-1 block" style={{ color: "var(--adm-text-secondary)" }}>音频厂商</label>
                    <select
                      value={settings.aiAudioProvider || "minimax"}
                      onChange={e => {
                        const p = e.target.value
                        update("aiAudioProvider", p)
                        const models = settings.aiAudioProviders?.[p]?.models || []
                        if (models[0]?.id) update("aiAudioModel", models[0].id)
                      }}
                      className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                      style={{ backgroundColor: "var(--adm-input)", border: "1px solid var(--adm-border)", color: "var(--adm-text)" }}
                    >
                      {audioProviderKeys.map(p => (
                        <option key={p} value={p}>{AUDIO_PROVIDER_LABELS[p] || p}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold mb-1 block" style={{ color: "var(--adm-text-secondary)" }}>音频模型</label>
                    <select
                      value={settings.aiAudioModel || ""}
                      onChange={e => update("aiAudioModel", e.target.value)}
                      className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                      style={{ backgroundColor: "var(--adm-input)", border: "1px solid var(--adm-border)", color: "var(--adm-text)" }}
                    >
                      {!settings.aiAudioModel && <option value="">选择模型…</option>}
                      {currentAudioModelOptions.map((m: any) => (
                        <option key={m.id} value={m.id}>{m.label}</option>
                      ))}
                      {settings.aiAudioModel && !currentAudioModelOptions.some((m: any) => m.id === settings.aiAudioModel) && (
                        <option value={settings.aiAudioModel}>自定义：{settings.aiAudioModel}</option>
                      )}
                    </select>
                  </div>
                </div>

                {audioProviderKeys.map(p => {
                  const conf = settings.aiAudioProviders?.[p] || { apiKey: "", baseUrl: "", models: [] }
                  return (
                    <div key={p} className="rounded-xl p-3 space-y-2" style={{ backgroundColor: "var(--adm-input)", border: "1px solid var(--adm-border)" }}>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold" style={{ color: "var(--adm-text)" }}>{AUDIO_PROVIDER_LABELS[p] || p}</span>
                        <span className="text-[11px]" style={{ color: "var(--adm-text-secondary)" }}>{conf.models?.length || AUDIO_PRESET_MODELS[p]?.length || 0} 个预设模型</span>
                      </div>
                      <input
                        value={realKeyOrEmpty(conf.apiKey)}
                        onChange={e => updateAudioProviderLib(p, "apiKey", e.target.value)}
                        placeholder="MiniMax API Key（留空复用视频/图片 Key）"
                        className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                        style={{ backgroundColor: "var(--adm-card)", border: "1px solid var(--adm-border)", color: "var(--adm-text)" }}
                      />
                      <input
                        value={conf.baseUrl || "https://api.minimaxi.com"}
                        onChange={e => updateAudioProviderLib(p, "baseUrl", e.target.value)}
                        placeholder="https://api.minimaxi.com"
                        className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                        style={{ backgroundColor: "var(--adm-card)", border: "1px solid var(--adm-border)", color: "var(--adm-text)" }}
                      />
                    </div>
                  )
                })}
              </div>
            </Section>
          </div>
        )}

        {/* ============ Social APIs tab (System) ============ */}
        {subTab === "social-apis" && settings && (
          <Section icon={XLogo} title="Social API Integration">
            <p className="text-xs mb-4" style={{ color: "var(--adm-text-secondary)" }}>
              Connect social media platforms via their official APIs for automated posting and account management.
            </p>

            <div className="space-y-5">
              {/* --- X (Twitter) Section --- */}
              <div className="p-5 rounded-2xl" style={{ backgroundColor: "var(--adm-input)", border: "1px solid var(--adm-border)" }}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#E0F2FE" }}>
                    <XLogo size={24} style={{ color: "#1DA1F2" }} />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold" style={{ color: "var(--adm-text)" }}>X API</h4>
                    <p className="text-xs" style={{ color: "var(--adm-text-secondary)" }}>
                      OAuth 1.0a authentication for posting tweets and reading profile data
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => update("xApiEnabled", !settings.xApiEnabled)}
                    className="relative w-12 h-7 rounded-full transition-all flex-shrink-0"
                    style={{ backgroundColor: settings.xApiEnabled ? "#1DA1F2" : "var(--adm-border)" }}
                  >
                    <span
                      className="absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-all"
                      style={{ left: settings.xApiEnabled ? "22px" : "2px" }}
                    />
                  </button>
                </div>

                {settings.xApiEnabled && (
                  <div className="space-y-4 pt-2 border-t" style={{ borderColor: "var(--adm-border)" }}>
                    {/* API Key */}
                    <Field label="API Key (Consumer Key)" desc="From X Developer Portal → Keys and tokens → API Key and Secret">
                      <Input
                        type="password"
                        value={settings.xApiKey || ""}
                        onChange={v => update("xApiKey", v)}
                        placeholder="Enter your API Key..."
                      />
                    </Field>

                    {/* API Secret */}
                    <Field label="API Key Secret (Consumer Secret)" desc="The secret paired with your API Key">
                      <Input
                        type="password"
                        value={settings.xApiSecret || ""}
                        onChange={v => update("xApiSecret", v)}
                        placeholder="Enter your API Key Secret..."
                      />
                    </Field>

                    {/* Callback URL */}
                    <Field label="Callback URL" desc="Set this in X Developer Portal → App settings → Callback URI / Redirect URL">
                      <div className="flex gap-2">
                        <Input
                          value={settings.xCallbackUrl || ""}
                          onChange={v => update("xCallbackUrl", v)}
                          placeholder="https://your-domain.com/api/marketing/x-oauth/callback"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const defaultUrl = `${window.location.origin}/api/marketing/x-oauth/callback`
                            update("xCallbackUrl", defaultUrl)
                          }}
                          className="px-3 py-2 text-xs rounded-lg flex-shrink-0"
                          style={{ backgroundColor: "var(--adm-accent)", color: "var(--adm-accent-text)" }}
                        >
                          Auto
                        </button>
                      </div>
                    </Field>

                    {/* Setup Instructions */}
                    <div className="p-3 rounded-xl text-xs space-y-1" style={{ backgroundColor: "rgba(29, 161, 242, 0.08)", border: "1px solid rgba(29, 161, 242, 0.2)", color: "var(--adm-text)" }}>
                      <p className="font-semibold mb-1" style={{ color: "#1DA1F2" }}>Setup Instructions:</p>
                      <p>1. Go to <a href="https://developer.x.com/" target="_blank" rel="noreferrer" style={{ color: "#1DA1F2", textDecoration: "underline" }}>developer.x.com</a> and sign up / log in</p>
                      <p>2. Create a Project + App under Free or Basic plan</p>
                      <p>3. Go to your App → <strong>Keys and tokens</strong> → <strong>API Key and Secret</strong></p>
                      <p>4. Go to <strong>Settings</strong> → <strong>User authentication settings</strong></p>
                      <p>5. Set <strong>App permissions</strong> to <strong>Read and write</strong></p>
                      <p>6. Set <strong>Type of App</strong> to <strong>Web App</strong></p>
                      <p>7. Paste the Callback URL above into <strong>Callback URI / Redirect URL</strong></p>
                      <p>8. Click Save, then copy your API Key + Secret to the fields above</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Facebook API */}
              <div className="p-4 rounded-2xl" style={{ backgroundColor: "var(--adm-input)", border: "1px solid var(--adm-border)" }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#1877F2" }}>
                      <Facebook size={20} color="white" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold" style={{ color: "var(--adm-text)" }}>Facebook API</h4>
                      <p className="text-xs" style={{ color: "var(--adm-text-secondary)" }}>Page management, posting and analytics</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => update("fbApiEnabled", !settings.fbApiEnabled)}
                    className="relative w-12 h-7 rounded-full transition-all flex-shrink-0"
                    style={{ backgroundColor: settings.fbApiEnabled ? "#1877F2" : "var(--adm-border)" }}
                  >
                    <span
                      className="absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-all"
                      style={{ left: settings.fbApiEnabled ? "22px" : "2px" }}
                    />
                  </button>
                </div>
                {settings.fbApiEnabled && (
                  <div className="space-y-3 pt-3 border-t" style={{ borderColor: "var(--adm-border)" }}>
                    <Field label="App ID" desc="From Meta for Developers → Your App → Settings → Basic">
                      <Input type="text" value={settings.fbClientId || ""} onChange={v => update("fbClientId", v)} placeholder="Enter App ID..." />
                    </Field>
                    <Field label="App Secret" desc="From Meta for Developers → Your App → Settings → Basic">
                      <Input type="password" value={settings.fbClientSecret || ""} onChange={v => update("fbClientSecret", v)} placeholder="Enter App Secret..." />
                    </Field>
                    <Field label="Page Access Token" desc="From Meta Business Settings → Page → Generate Token">
                      <Input type="password" value={settings.fbPageAccessToken || ""} onChange={v => update("fbPageAccessToken", v)} placeholder="Enter Page Access Token..." />
                    </Field>
                    <Field label="Callback URL">
                      <div className="flex gap-2">
                        <Input value={settings.fbCallbackUrl || ""} onChange={v => update("fbCallbackUrl", v)} placeholder="https://your-domain.com/api/marketing/facebook-oauth/callback" />
                        <button type="button" onClick={() => update("fbCallbackUrl", `${window.location.origin}/api/marketing/facebook-oauth/callback`)}
                          className="px-3 py-2 text-xs rounded-lg flex-shrink-0" style={{ backgroundColor: "var(--adm-accent)", color: "var(--adm-accent-text)" }}>Auto</button>
                      </div>
                    </Field>
                    <div className="p-3 rounded-xl text-xs space-y-1" style={{ backgroundColor: "rgba(24, 119, 242, 0.08)", border: "1px solid rgba(24, 119, 242, 0.2)", color: "var(--adm-text)" }}>
                      <p className="font-semibold" style={{ color: "#1877F2" }}>Setup:</p>
                      <p>1. Go to <a href="https://developers.facebook.com" target="_blank" rel="noreferrer" style={{ color: "#1877F2", textDecoration: "underline" }}>developers.facebook.com</a></p>
                      <p>2. Create App → Add "Facebook Login" product → Settings → Client OAuth Settings</p>
                      <p>3. Set Valid OAuth Redirect URI to Callback URL above</p>
                      <p>4. Copy App ID + App Secret</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Instagram API */}
              <div className="p-4 rounded-2xl" style={{ backgroundColor: "var(--adm-input)", border: "1px solid var(--adm-border)" }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(45deg, #f09433 0%,#e6683c 25%,#dc2743 50%,#cc2366 75%,#bc1888 100%)" }}>
                      <Instagram size={20} color="white" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold" style={{ color: "var(--adm-text)" }}>Instagram API</h4>
                      <p className="text-xs" style={{ color: "var(--adm-text-secondary)" }}>Profile data, media and analytics</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => update("igApiEnabled", !settings.igApiEnabled)}
                    className="relative w-12 h-7 rounded-full transition-all flex-shrink-0"
                    style={{ backgroundColor: settings.igApiEnabled ? "#E4405F" : "var(--adm-border)" }}
                  >
                    <span
                      className="absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-all"
                      style={{ left: settings.igApiEnabled ? "22px" : "2px" }}
                    />
                  </button>
                </div>
                {settings.igApiEnabled && (
                  <div className="space-y-3 pt-3 border-t" style={{ borderColor: "var(--adm-border)" }}>
                    <Field label="Instagram App ID" desc="From Meta App Dashboard → Instagram → API setup with Instagram Login → Business login settings">
                      <Input type="text" value={settings.igClientId || ""} onChange={v => update("igClientId", v)} placeholder="Enter Instagram App ID..." />
                    </Field>
                    <Field label="Instagram App Secret">
                      <Input type="password" value={settings.igClientSecret || ""} onChange={v => update("igClientSecret", v)} placeholder="Enter Instagram App Secret..." />
                    </Field>
                    <Field label="Callback URL">
                      <div className="flex gap-2">
                        <Input value={settings.igCallbackUrl || ""} onChange={v => update("igCallbackUrl", v)} placeholder="https://your-domain.com/api/marketing/social-oauth/callback?platform=instagram" />
                        <button type="button" onClick={() => update("igCallbackUrl", `${window.location.origin}/api/marketing/social-oauth/callback?platform=instagram`)}
                          className="px-3 py-2 text-xs rounded-lg flex-shrink-0" style={{ backgroundColor: "var(--adm-accent)", color: "var(--adm-accent-text)" }}>Auto</button>
                      </div>
                    </Field>
                    <div className="space-y-2 pt-1">
                      <p className="text-xs font-medium" style={{ color: "var(--adm-text-secondary)" }}>Permissions to request:</p>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => update("igContentPublishEnabled", !settings.igContentPublishEnabled)}
                          className="px-3 py-1.5 text-xs rounded-lg flex items-center gap-1"
                          style={{
                            backgroundColor: settings.igContentPublishEnabled ? "#E4405F" : "var(--adm-border)",
                            color: settings.igContentPublishEnabled ? "white" : "var(--adm-text)",
                          }}
                        >
                          {settings.igContentPublishEnabled ? "✓ " : "+ "} Content Publish
                        </button>
                        <button
                          type="button"
                          onClick={() => update("igManageMessagesEnabled", !settings.igManageMessagesEnabled)}
                          className="px-3 py-1.5 text-xs rounded-lg flex items-center gap-1"
                          style={{
                            backgroundColor: settings.igManageMessagesEnabled ? "#E4405F" : "var(--adm-border)",
                            color: settings.igManageMessagesEnabled ? "white" : "var(--adm-text)",
                          }}
                        >
                          {settings.igManageMessagesEnabled ? "✓ " : "+ "} Manage Messages
                        </button>
                        <button
                          type="button"
                          onClick={() => update("igManageCommentsEnabled", !settings.igManageCommentsEnabled)}
                          className="px-3 py-1.5 text-xs rounded-lg flex items-center gap-1"
                          style={{
                            backgroundColor: settings.igManageCommentsEnabled ? "#E4405F" : "var(--adm-border)",
                            color: settings.igManageCommentsEnabled ? "white" : "var(--adm-text)",
                          }}
                        >
                          {settings.igManageCommentsEnabled ? "✓ " : "+ "} Manage Comments
                        </button>
                      </div>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer text-xs" style={{ color: "var(--adm-text)" }}>
                      <input
                        type="checkbox"
                        checked={settings.igForceReauth || false}
                        onChange={(e) => update("igForceReauth", e.target.checked)}
                        className="w-4 h-4 rounded"
                        style={{ accentColor: "#E4405F" }}
                      />
                      Force re-login (ignore existing Instagram session)
                    </label>
                    <div className="p-3 rounded-xl text-xs space-y-1" style={{ backgroundColor: "rgba(228, 64, 95, 0.08)", border: "1px solid rgba(228, 64, 95, 0.2)", color: "var(--adm-text)" }}>
                      <p className="font-semibold" style={{ color: "#E4405F" }}>Instagram API with Instagram Login (New — July 2024):</p>
                      <p>1. Go to <a href="https://developers.facebook.com" target="_blank" rel="noreferrer" style={{ color: "#E4405F", textDecoration: "underline" }}>developers.facebook.com</a></p>
                      <p>2. Create a Business type app</p>
                      <p>3. Add "Instagram" product → "API setup with Instagram Login"</p>
                      <p>4. Configure "Business login settings" with your redirect URI</p>
                      <p>5. Copy Instagram App ID and App Secret (separate from Meta App credentials)</p>
                    </div>
                  </div>
                )}
              </div>

              {/* LinkedIn API */}
              <div className="p-4 rounded-2xl" style={{ backgroundColor: "var(--adm-input)", border: "1px solid var(--adm-border)" }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#0077B5" }}>
                      <Linkedin size={20} color="white" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold" style={{ color: "var(--adm-text)" }}>LinkedIn API</h4>
                      <p className="text-xs" style={{ color: "var(--adm-text-secondary)" }}>Professional networking and content sharing</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => update("liApiEnabled", !settings.liApiEnabled)}
                    className="relative w-12 h-7 rounded-full transition-all flex-shrink-0"
                    style={{ backgroundColor: settings.liApiEnabled ? "#0077B5" : "var(--adm-border)" }}
                  >
                    <span
                      className="absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-all"
                      style={{ left: settings.liApiEnabled ? "22px" : "2px" }}
                    />
                  </button>
                </div>
                {settings.liApiEnabled && (
                  <div className="space-y-3 pt-3 border-t" style={{ borderColor: "var(--adm-border)" }}>
                    <Field label="Client ID" desc="From LinkedIn Developer → Create App → Authentication">
                      <Input type="text" value={settings.liClientId || ""} onChange={v => update("liClientId", v)} placeholder="Enter Client ID..." />
                    </Field>
                    <Field label="Client Secret">
                      <Input type="password" value={settings.liClientSecret || ""} onChange={v => update("liClientSecret", v)} placeholder="Enter Client Secret..." />
                    </Field>
                    <Field label="Callback URL">
                      <div className="flex gap-2">
                        <Input value={settings.liCallbackUrl || ""} onChange={v => update("liCallbackUrl", v)} placeholder="https://your-domain.com/api/marketing/linkedin-oauth/callback" />
                        <button type="button" onClick={() => update("liCallbackUrl", `${window.location.origin}/api/marketing/linkedin-oauth/callback`)}
                          className="px-3 py-2 text-xs rounded-lg flex-shrink-0" style={{ backgroundColor: "var(--adm-accent)", color: "var(--adm-accent-text)" }}>Auto</button>
                      </div>
                    </Field>
                    <div className="p-3 rounded-xl text-xs space-y-1" style={{ backgroundColor: "rgba(0, 119, 181, 0.08)", border: "1px solid rgba(0, 119, 181, 0.2)", color: "var(--adm-text)" }}>
                      <p className="font-semibold" style={{ color: "#0077B5" }}>Setup:</p>
                      <p>1. Go to <a href="https://www.linkedin.com/developers" target="_blank" rel="noreferrer" style={{ color: "#0077B5", textDecoration: "underline" }}>linkedin.com/developers</a></p>
                      <p>2. Create App → Under Auth tab, add Authorized redirect URL</p>
                      <p>3. Select scope: openid, profile, email, w_member_social, w_organization_social</p>
                    </div>
                  </div>
                )}
              </div>

              {/* YouTube API */}
              <div className="p-4 rounded-2xl" style={{ backgroundColor: "var(--adm-input)", border: "1px solid var(--adm-border)" }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#FF0000" }}>
                      <Youtube size={20} color="white" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold" style={{ color: "var(--adm-text)" }}>YouTube API</h4>
                      <p className="text-xs" style={{ color: "var(--adm-text-secondary)" }}>Channel management and video publishing</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => update("ytApiEnabled", !settings.ytApiEnabled)}
                    className="relative w-12 h-7 rounded-full transition-all flex-shrink-0"
                    style={{ backgroundColor: settings.ytApiEnabled ? "#FF0000" : "var(--adm-border)" }}
                  >
                    <span
                      className="absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-all"
                      style={{ left: settings.ytApiEnabled ? "22px" : "2px" }}
                    />
                  </button>
                </div>
                {settings.ytApiEnabled && (
                  <div className="space-y-3 pt-3 border-t" style={{ borderColor: "var(--adm-border)" }}>
                    <Field label="Client ID" desc="From Google Cloud Console → APIs & Services → Credentials">
                      <Input type="text" value={settings.ytClientId || ""} onChange={v => update("ytClientId", v)} placeholder="Enter Client ID..." />
                    </Field>
                    <Field label="Client Secret">
                      <Input type="password" value={settings.ytClientSecret || ""} onChange={v => update("ytClientSecret", v)} placeholder="Enter Client Secret..." />
                    </Field>
                    <Field label="API Key" desc="For read-only operations (Analytics, etc.)">
                      <Input type="password" value={settings.ytApiKey || ""} onChange={v => update("ytApiKey", v)} placeholder="Enter API Key..." />
                    </Field>
                    <Field label="Callback URL">
                      <div className="flex gap-2">
                        <Input value={settings.ytCallbackUrl || ""} onChange={v => update("ytCallbackUrl", v)} placeholder="https://your-domain.com/api/marketing/youtube-oauth/callback" />
                        <button type="button" onClick={() => update("ytCallbackUrl", `${window.location.origin}/api/marketing/youtube-oauth/callback`)}
                          className="px-3 py-2 text-xs rounded-lg flex-shrink-0" style={{ backgroundColor: "var(--adm-accent)", color: "var(--adm-accent-text)" }}>Auto</button>
                      </div>
                    </Field>
                    <div className="p-3 rounded-xl text-xs space-y-1" style={{ backgroundColor: "rgba(255, 0, 0, 0.08)", border: "1px solid rgba(255, 0, 0, 0.2)", color: "var(--adm-text)" }}>
                      <p className="font-semibold" style={{ color: "#FF0000" }}>Setup:</p>
                      <p>1. Go to <a href="https://console.cloud.google.com" target="_blank" rel="noreferrer" style={{ color: "#FF0000", textDecoration: "underline" }}>console.cloud.google.com</a></p>
                      <p>2. Create Project → Enable YouTube Data API v3</p>
                      <p>3. Create OAuth 2.0 credentials (Web application type)</p>
                      <p>4. Add Authorized redirect URI</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Pinterest API */}
              <div className="p-4 rounded-2xl" style={{ backgroundColor: "var(--adm-input)", border: "1px solid var(--adm-border)" }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#E60023" }}>
                      <Pin size={20} color="white" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold" style={{ color: "var(--adm-text)" }}>Pinterest API</h4>
                      <p className="text-xs" style={{ color: "var(--adm-text-secondary)" }}>Pin creation and board management</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => update("ptApiEnabled", !settings.ptApiEnabled)}
                    className="relative w-12 h-7 rounded-full transition-all flex-shrink-0"
                    style={{ backgroundColor: settings.ptApiEnabled ? "#E60023" : "var(--adm-border)" }}
                  >
                    <span
                      className="absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-all"
                      style={{ left: settings.ptApiEnabled ? "22px" : "2px" }}
                    />
                  </button>
                </div>
                {settings.ptApiEnabled && (
                  <div className="space-y-3 pt-3 border-t" style={{ borderColor: "var(--adm-border)" }}>
                    <Field label="Client ID" desc="From Pinterest Developer Portal → App → Basic">
                      <Input type="text" value={settings.ptClientId || ""} onChange={v => update("ptClientId", v)} placeholder="Enter Client ID..." />
                    </Field>
                    <Field label="Client Secret">
                      <Input type="password" value={settings.ptClientSecret || ""} onChange={v => update("ptClientSecret", v)} placeholder="Enter Client Secret..." />
                    </Field>
                    <Field label="Callback URL">
                      <div className="flex gap-2">
                        <Input value={settings.ptCallbackUrl || ""} onChange={v => update("ptCallbackUrl", v)} placeholder="https://your-domain.com/api/marketing/pinterest-oauth/callback" />
                        <button type="button" onClick={() => update("ptCallbackUrl", `${window.location.origin}/api/marketing/pinterest-oauth/callback`)}
                          className="px-3 py-2 text-xs rounded-lg flex-shrink-0" style={{ backgroundColor: "var(--adm-accent)", color: "var(--adm-accent-text)" }}>Auto</button>
                      </div>
                    </Field>
                    <div className="p-3 rounded-xl text-xs space-y-1" style={{ backgroundColor: "rgba(230, 0, 35, 0.08)", border: "1px solid rgba(230, 0, 35, 0.2)", color: "var(--adm-text)" }}>
                      <p className="font-semibold" style={{ color: "#E60023" }}>Setup:</p>
                      <p>1. Go to <a href="https://developers.pinterest.com" target="_blank" rel="noreferrer" style={{ color: "#E60023", textDecoration: "underline" }}>developers.pinterest.com</a></p>
                      <p>2. Create New App → Select "Connect API"</p>
                      <p>3. Set Redirect URI in App settings</p>
                      <p>4. Copy App ID + App Secret</p>
                    </div>
                  </div>
                )}
              </div>

              {/* TikTok API */}
              <div className="p-4 rounded-2xl" style={{ backgroundColor: "var(--adm-input)", border: "1px solid var(--adm-border)" }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#000000" }}>
                      <MessageCircle size={20} color="white" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold" style={{ color: "var(--adm-text)" }}>TikTok API</h4>
                      <p className="text-xs" style={{ color: "var(--adm-text-secondary)" }}>Video content creation and publishing</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => update("tkApiEnabled", !settings.tkApiEnabled)}
                    className="relative w-12 h-7 rounded-full transition-all flex-shrink-0"
                    style={{ backgroundColor: settings.tkApiEnabled ? "#000000" : "var(--adm-border)" }}
                  >
                    <span
                      className="absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-all"
                      style={{ left: settings.tkApiEnabled ? "22px" : "2px" }}
                    />
                  </button>
                </div>
                {settings.tkApiEnabled && (
                  <div className="space-y-3 pt-3 border-t" style={{ borderColor: "var(--adm-border)" }}>
                    <Field label="Client Key" desc="From TikTok Developer Portal → App → Credentials">
                      <Input type="text" value={settings.tkClientId || ""} onChange={v => update("tkClientId", v)} placeholder="Enter Client Key..." />
                    </Field>
                    <Field label="Client Secret">
                      <Input type="password" value={settings.tkClientSecret || ""} onChange={v => update("tkClientSecret", v)} placeholder="Enter Client Secret..." />
                    </Field>
                    <Field label="Callback URL">
                      <div className="flex gap-2">
                        <Input value={settings.tkCallbackUrl || ""} onChange={v => update("tkCallbackUrl", v)} placeholder="https://your-domain.com/api/marketing/tiktok-oauth/callback" />
                        <button type="button" onClick={() => update("tkCallbackUrl", `${window.location.origin}/api/marketing/tiktok-oauth/callback`)}
                          className="px-3 py-2 text-xs rounded-lg flex-shrink-0" style={{ backgroundColor: "var(--adm-accent)", color: "var(--adm-accent-text)" }}>Auto</button>
                      </div>
                    </Field>
                    <div className="p-3 rounded-xl text-xs space-y-1" style={{ backgroundColor: "rgba(0, 0, 0, 0.05)", border: "1px solid rgba(0, 0, 0, 0.1)", color: "var(--adm-text)" }}>
                      <p className="font-semibold" style={{ color: "#000" }}>Setup:</p>
                      <p>1. Go to <a href="https://developers.tiktok.com" target="_blank" rel="noreferrer" style={{ color: "#000", textDecoration: "underline" }}>developers.tiktok.com</a></p>
                      <p>2. Create App → Add "TikTok for Business" product</p>
                      <p>3. Set Redirect URI in App Settings → Security</p>
                      <p>4. Copy Client Key + Client Secret</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Section>
        )}

        {/* ============ Orders tab (System) ============ */}
        {subTab === "orders" && settings && (
          <Section icon={ShoppingCart} title="Order Settings">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <Field label="Auto-Confirm (minutes)" desc="0 = manual only">
                  <Input type="number" value={String(settings.autoConfirmMinutes ?? 0)} onChange={v => update("autoConfirmMinutes", Number(v))} />
                </Field>
                <Field label="Default Shipping Days">
                  <Input type="number" value={String(settings.defaultShippingDays ?? 14)} onChange={v => update("defaultShippingDays", Number(v))} />
                </Field>
              </div>
              <div className="space-y-4">
                <Field label="Auto-Assign Orders">
                  <button onClick={() => update("autoAssignOrders", !settings.autoAssignOrders)}
                    className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
                    style={{
                      backgroundColor: settings.autoAssignOrders ? "var(--adm-accent-bg)" : "var(--adm-input)",
                      color: settings.autoAssignOrders ? "var(--adm-accent)" : "var(--adm-text-secondary)",
                      border: "1px solid " + (settings.autoAssignOrders ? "var(--adm-accent)" : "var(--adm-input-border)"),
                    }}>
                    {settings.autoAssignOrders ? "Enabled" : "Disabled"}
                  </button>
                </Field>
                {settings.autoAssignOrders && (
                  <Field label="Strategy">
                    <select value={settings.autoAssignStrategy || "round_robin"} onChange={e => update("autoAssignStrategy", e.target.value)}
                      className="w-full px-4 py-2.5 rounded-lg text-sm"
                      style={{ backgroundColor: "var(--adm-input)", border: "1px solid var(--adm-input-border)", color: "var(--adm-text)" }}>
                      <option value="round_robin">Round Robin (balanced)</option>
                      <option value="least_orders">Least Orders First</option>
                      <option value="fixed">Assign to Specific Staff</option>
                    </select>
                  </Field>
                )}
                {settings.autoAssignOrders && settings.autoAssignStrategy === "fixed" && (
                  <>
                    <Field label="Select Staff Member" desc="Choose who receives new orders">
                      <select value={settings.autoAssignTargetStaff || ""} onChange={e => update("autoAssignTargetStaff", e.target.value)}
                        className="w-full px-4 py-2.5 rounded-lg text-sm"
                        style={{ backgroundColor: "var(--adm-input)", border: "1px solid var(--adm-input-border)", color: "var(--adm-text)" }}>
                        <option value="">-- Select a staff member --</option>
                        {(settings.staffMembers || []).filter((s: any) => s.active !== false).map((staff: any) => (
                          <option key={staff.id} value={staff.id}>{staff.name} ({staff.email})</option>
                        ))}
                      </select>
                    </Field>
                    <div className="rounded-lg p-3 text-xs" style={{ backgroundColor: "var(--adm-bg)", border: "1px solid var(--adm-border)", color: "var(--adm-text-secondary)" }}>
                      <Users size={14} className="inline mr-1" style={{ color: "var(--adm-accent)" }} />
                      Staff members are managed in{" "}
                      <a href="/admin/staff" className="underline" style={{ color: "var(--adm-accent)" }}>Staff Management</a>
                    </div>
                  </>
                )}
              </div>
            </div>
          </Section>
        )}

        {/* ============ Shipping tab (System) ============ */}
        {subTab === "shipping" && settings && (
          <Section icon={Truck} title="Shipping Settings">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <Field label="Free Threshold ($)"><Input type="number" value={String(settings.shippingFreeThreshold ?? 0)} onChange={v => update("shippingFreeThreshold", Number(v))} /></Field>
              <Field label="Default Cost ($)"><Input type="number" value={String(settings.shippingCost ?? 0)} onChange={v => update("shippingCost", Number(v))} /></Field>
              <Field label="Default Carrier"><Input value={settings.defaultCarrier || ""} onChange={v => update("defaultCarrier", v)} /></Field>
              <Field label="Tracking URL"><Input value={settings.trackingUrlTemplate || ""} onChange={v => update("trackingUrlTemplate", v)} /></Field>
            </div>
            <div style={{ borderTop: "1px solid var(--adm-border)" }} className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold" style={{ color: "var(--adm-text)" }}>Shipping Zones</h3>
                <button onClick={() => { const z = [...(settings.shippingZones || [])]; z.push({ id: "z-"+Date.now(), name: "", countries: [], baseCost: 0, freeThreshold: 0, estimatedDaysMin: 0, estimatedDaysMax: 0, carriers: [] }); update("shippingZones", z) }}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium"
                  style={{ backgroundColor: "var(--adm-accent)", color: "var(--adm-accent-text)", border: "none", cursor: "pointer" }}>
                  <Plus size={14} /> Add Zone
                </button>
              </div>
              {(settings.shippingZones || []).map((zone: any, i: number) => (
                <div key={zone.id || i} className="p-4 rounded-lg mb-4" style={{ backgroundColor: "var(--adm-bg)", border: "1px solid var(--adm-border)" }}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium" style={{ color: "var(--adm-text)" }}>Zone {i+1}</span>
                    <button onClick={() => update("shippingZones", (settings.shippingZones || []).filter((_: any, idx: number) => idx !== i))}
                      className="p-1 rounded hover:bg-red-500/20 transition-colors"
                      style={{ color: "#ef4444", background: "none", border: "none", cursor: "pointer" }}>
                      <X size={14} />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Input value={zone.name || ""} onChange={v => { const z = [...(settings.shippingZones || [])]; if (z[i]) z[i] = { ...z[i], name: v }; update("shippingZones", z) }} placeholder="Zone name" />
                    <Input type="number" value={zone.baseCost ?? ""} onChange={v => { const z = [...(settings.shippingZones || [])]; if (z[i]) z[i] = { ...z[i], baseCost: Number(v) }; update("shippingZones", z) }} placeholder="Base cost" />
                    <Input type="number" value={zone.freeThreshold ?? ""} onChange={v => { const z = [...(settings.shippingZones || [])]; if (z[i]) z[i] = { ...z[i], freeThreshold: Number(v) }; update("shippingZones", z) }} placeholder="Free at $" />
                    <Input type="number" value={zone.estimatedDaysMin ?? ""} onChange={v => { const z = [...(settings.shippingZones || [])]; if (z[i]) z[i] = { ...z[i], estimatedDaysMin: Number(v) }; update("shippingZones", z) }} placeholder="Min days" />
                    <Input type="number" value={zone.estimatedDaysMax ?? ""} onChange={v => { const z = [...(settings.shippingZones || [])]; if (z[i]) z[i] = { ...z[i], estimatedDaysMax: Number(v) }; update("shippingZones", z) }} placeholder="Max days" />
                    <Input value={(zone.countries || []).join(", ")} onChange={v => { const z = [...(settings.shippingZones || [])]; if (z[i]) z[i] = { ...z[i], countries: v.split(",").map((x: any) => x.trim()) }; update("shippingZones", z) }} placeholder="Countries (comma)" />
                    <Input value={(zone.carriers || []).join(", ")} onChange={v => { const z = [...(settings.shippingZones || [])]; if (z[i]) z[i] = { ...z[i], carriers: v.split(",").map((x: any) => x.trim()) }; update("shippingZones", z) }} placeholder="Carriers (comma)" />
                  </div>
                </div>
              ))}
              {(!settings.shippingZones || settings.shippingZones.length === 0) && (
                <p className="text-xs text-center py-6" style={{ color: "var(--adm-text-secondary)" }}>No shipping zones yet.</p>
              )}
            </div>
          </Section>
        )}

        {/* ============ Email (SMTP) tab (System) ============ */}
        {subTab === "smtp" && settings && (
          <Section icon={Mail} title="SMTP / Email">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="SMTP Host"><Input value={settings.smtpHost || ""} onChange={v => update("smtpHost", v)} /></Field>
              <Field label="Port"><Input type="number" value={String(settings.smtpPort || 587)} onChange={v => update("smtpPort", Number(v))} /></Field>
              <Field label="Username"><Input value={settings.smtpUser || ""} onChange={v => update("smtpUser", v)} /></Field>
              <Field label="Password"><Input type="text" value={settings.smtpPass || ""} onChange={v => update("smtpPass", v)} /></Field>
              <Field label="From Email"><Input value={settings.smtpFromEmail || ""} onChange={v => update("smtpFromEmail", v)} /></Field>
              <Field label="Reply-To Email"><Input value={settings.smtpReplyTo || ""} onChange={v => update("smtpReplyTo", v)} /></Field>
              <Field label="Footer Email"><Input value={settings.footerEmail || ""} onChange={v => update("footerEmail", v)} /></Field>
              <Field label="Footer Phone"><Input value={settings.footerPhone || ""} onChange={v => update("footerPhone", v)} /></Field>
            </div>
          </Section>
        )}

        {/* ============ Social & Footer tab (Storefront) ============ */}
        {subTab === "social" && settings && (
          <Section icon={Globe} title="Social & Footer Links">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Facebook"><Input value={settings.socialFacebook || ""} onChange={v => update("socialFacebook", v)} /></Field>
              <Field label="X"><Input value={settings.socialX || ""} onChange={v => update("socialX", v)} /></Field>
              <Field label="Instagram"><Input value={settings.socialInstagram || ""} onChange={v => update("socialInstagram", v)} /></Field>
              <Field label="YouTube"><Input value={settings.socialYoutube || ""} onChange={v => update("socialYoutube", v)} /></Field>
              <Field label="Footer Hours"><Input value={settings.footerHours || ""} onChange={v => update("footerHours", v)} /></Field>
              <Field label="Footer Address"><Input value={settings.footerAddress || ""} onChange={v => update("footerAddress", v)} /></Field>
              <Field label="Copyright"><Input value={settings.footerCopyright || ""} onChange={v => update("footerCopyright", v)} /></Field>
              <Field label="Privacy Link"><Input value={settings.footerPrivacyLink || ""} onChange={v => update("footerPrivacyLink", v)} /></Field>
              <Field label="Terms Link"><Input value={settings.footerTermsLink || ""} onChange={v => update("footerTermsLink", v)} /></Field>
            </div>
          </Section>
        )}

        {/* ============ Customer Tiers tab (Storefront) ============ */}
        {subTab === "customers" && settings && (
          <Section icon={Users} title="Customer Loyalty Tiers">
            <p className="text-xs mb-4" style={{ color: "var(--adm-text-secondary)" }}>
              Configure customer tiers based on order count. The tier determines the number of stars and color displayed in the frontend and admin.
            </p>
            <div className="space-y-4">
              {(settings.customerTiers || []).map((tier: any, index: number) => (
                <div key={tier.id} className="rounded-xl border p-4" style={{ backgroundColor: "var(--adm-card)", borderColor: "var(--adm-border)" }}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-0.5" style={{ color: tier.color }}>
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} size={14} fill={i < tier.stars ? 'currentColor' : 'none'} strokeWidth={2} />
                        ))}
                      </div>
                      <span className="text-sm font-medium" style={{ color: "var(--adm-text)" }}>{tier.name}</span>
                      <span className="text-xs px-2 py-0.5 rounded-sm" style={{ backgroundColor: tier.bgColor, color: tier.color }}>{tier.id}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const newTiers = (settings.customerTiers || []).filter((t: any) => t.id !== tier.id)
                        update("customerTiers", newTiers)
                      }}
                      className="p-1.5 rounded-lg transition-colors"
                      style={{ backgroundColor: "var(--adm-input)", color: "var(--adm-text-secondary)" }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Field label="Tier ID" desc="Unique identifier (lowercase)">
                      <Input
                        value={tier.id || ""}
                        onChange={v => {
                          const newTiers = [...(settings.customerTiers || [])]
                          newTiers[index] = { ...newTiers[index], id: v.toLowerCase() }
                          update("customerTiers", newTiers)
                        }}
                      />
                    </Field>
                    <Field label="Tier Name" desc="Display name">
                      <Input
                        value={tier.name || ""}
                        onChange={v => {
                          const newTiers = [...(settings.customerTiers || [])]
                          newTiers[index] = { ...newTiers[index], name: v }
                          update("customerTiers", newTiers)
                        }}
                      />
                    </Field>
                    <Field label="Min Orders" desc="Minimum order count">
                      <Input
                        type="number"
                        value={String(tier.minOrders || 0)}
                        onChange={v => {
                          const newTiers = [...(settings.customerTiers || [])]
                          newTiers[index] = { ...newTiers[index], minOrders: Number(v) }
                          update("customerTiers", newTiers)
                        }}
                      />
                    </Field>
                    <Field label="Max Orders" desc="Maximum order count (use 9999 for unlimited)">
                      <Input
                        type="number"
                        value={String(tier.maxOrders || 9999)}
                        onChange={v => {
                          const newTiers = [...(settings.customerTiers || [])]
                          newTiers[index] = { ...newTiers[index], maxOrders: Number(v) }
                          update("customerTiers", newTiers)
                        }}
                      />
                    </Field>
                    <Field label="Stars" desc="Number of stars (1-5)">
                      <Input
                        type="number"
                        value={String(tier.stars || 1)}
                        onChange={v => {
                          const newTiers = [...(settings.customerTiers || [])]
                          newTiers[index] = { ...newTiers[index], stars: Math.min(5, Math.max(1, Number(v))) }
                          update("customerTiers", newTiers)
                        }}
                      />
                    </Field>
                    <Field label="Star Color" desc="Hex color for stars">
                      <input
                        type="color"
                        value={tier.color || "#f59e0b"}
                        onChange={e => {
                          const newTiers = [...(settings.customerTiers || [])]
                          newTiers[index] = { ...newTiers[index], color: e.target.value }
                          update("customerTiers", newTiers)
                        }}
                        className="w-full h-9 rounded-lg cursor-pointer"
                        style={{ border: "1px solid var(--adm-input-border)" }}
                      />
                    </Field>
                    <Field label="BG Color" desc="Background color for tier badge">
                      <input
                        type="color"
                        value={tier.bgColor || "#fefce8"}
                        onChange={e => {
                          const newTiers = [...(settings.customerTiers || [])]
                          newTiers[index] = { ...newTiers[index], bgColor: e.target.value }
                          update("customerTiers", newTiers)
                        }}
                        className="w-full h-9 rounded-lg cursor-pointer"
                        style={{ border: "1px solid var(--adm-input-border)" }}
                      />
                    </Field>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={() => {
                  const newTier = {
                    id: `tier-${Date.now()}`,
                    name: 'New Tier',
                    minOrders: 0,
                    maxOrders: 9999,
                    stars: 1,
                    color: '#6b7280',
                    bgColor: '#f3f4f6',
                  }
                  update("customerTiers", [...(settings.customerTiers || []), newTier])
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium"
                style={{ backgroundColor: "var(--adm-accent)", color: "var(--adm-accent-text)", border: "none", cursor: "pointer" }}
              >
                <Plus size={14} /> Add Tier
              </button>
            </div>
          </Section>
        )}
      </div>
    </div>
  )
}

