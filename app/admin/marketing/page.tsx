"use client"
import { useState, useEffect, useMemo, useRef } from "react"
import {
  Megaphone, Sparkles, Copy, Save, Trash2, Plus, Search,
  History, LayoutTemplate, Wand2, Hash, ChevronDown, ChevronUp,
  Check, Loader2, Package, Globe, Palette, Lightbulb, X,
  FileText, ExternalLink, RefreshCw, BarChart3, Users, Link2, LogIn,
  ArrowUpRight, ArrowDownRight, TrendingUp, TrendingDown,
  User, AtSign, Globe2, Share2, Monitor, ShoppingCart,
  Zap, Target, Award, Briefcase, Calendar, Clock, Mail,
  Layers, Image as ImageIcon, Settings, ChevronRight, ChevronLeft,
  Facebook, Twitter, Instagram, Youtube, Linkedin, MessageCircle,
  Globe as GlobeIcon, LineChart, Activity, Eye, DollarSign,
  Phone, MapPin, Building, MoreHorizontal, Pause, Play,
  Globe as Globe3, MessageSquare, Send, Bookmark, Camera, Music,
  Heart, Film, Users2, Trophy,
  ShoppingBag, CreditCard, BarChart, PieChart,
  Paperclip, Bot, PenTool, AlertCircle, Smartphone, GripVertical, Filter, Shield,
  Download, Upload, Signal, Wifi,
} from "lucide-react"
import { buildReferralBioLandingUrl, buildReferralProductUrl } from "@/lib/referral-links"
import { getInstagramInsightsSummary } from "@/lib/marketing-insights"
import AccountSelector, { type AccountSelectorValue } from "@/components/admin/AccountSelector"
import ProjectsTab from "@/components/admin/ProjectsTab"
import MarketingImageEditor from "@/components/admin/MarketingImageEditor"
import AudioStudio from "@/components/marketing/AudioStudio"
import VideoAudioEditor from "@/components/marketing/VideoAudioEditor"
import type { AudioItem } from "@/components/marketing/audioUtils"

const PLATFORMS = [
  { id: 'instagram', name: 'Instagram', icon: Instagram, color: '#E4405F', bgColor: '#FFF0F3', url: 'https://instagram.com', loginUrl: 'https://www.instagram.com/accounts/login/' },
  { id: 'facebook', name: 'Facebook', icon: Facebook, color: '#1877F2', bgColor: '#EEF2FF', url: 'https://facebook.com', loginUrl: 'https://www.facebook.com/login.php' },
  { id: 'twitter', name: 'Twitter', icon: Twitter, color: '#1DA1F2', bgColor: '#E0F2FE', url: 'https://twitter.com', loginUrl: 'https://twitter.com/i/flow/login' },
  { id: 'linkedin', name: 'LinkedIn', icon: Linkedin, color: '#0077B5', bgColor: '#E0F2FE', url: 'https://linkedin.com', loginUrl: 'https://www.linkedin.com/login' },
  { id: 'youtube', name: 'YouTube', icon: Youtube, color: '#FF0000', bgColor: '#FEF2F2', url: 'https://youtube.com', loginUrl: 'https://accounts.google.com/ServiceLogin?service=youtube' },
  { id: 'pinterest', name: 'Pinterest', icon: Target, color: '#E60023', bgColor: '#FEF2F2', url: 'https://pinterest.com', loginUrl: 'https://www.pinterest.com/login/' },
  { id: 'tiktok', name: 'TikTok', icon: MessageCircle, color: '#000000', bgColor: '#F3F4F6', url: 'https://tiktok.com', loginUrl: 'https://www.tiktok.com/login/phone-or-email/email' },
]

// AI 聊天模式 — 智能文案设计 / 广告设计等专用模式
const AI_MODES = [
  { id: 'copywriting', name: 'Copywriting', description: 'Sales copy, taglines, product descriptions', icon: PenTool },
  { id: 'ad_design', name: 'Ad Design', description: 'Ad creatives, banners, visual concepts', icon: Megaphone },
  { id: 'social_content', name: 'Social Content', description: 'Posts, stories, reels scripts', icon: MessageSquare },
  { id: 'email_campaign', name: 'Email Campaign', description: 'Subject lines, email body, CTAs', icon: Mail },
  { id: 'seo_content', name: 'SEO Content', description: 'Keywords, meta tags, blog outlines', icon: Search },
  { id: 'general', name: 'General Chat', description: 'Brainstorm and ask anything', icon: Bot },
]

const CONTENT_TYPES = [
  { id: 'social_post', name: 'Social Post', description: 'Engaging social media content' },
  { id: 'ad_copy', name: 'Ad Copy', description: 'High-converting advertisement copy' },
  { id: 'product_desc', name: 'Product Description', description: 'SEO-friendly product descriptions' },
  { id: 'email_campaign', name: 'Email Campaign', description: 'Marketing email sequences' },
]

const TONES = [
  { id: 'professional', name: 'Professional', description: 'Polished & authoritative' },
  { id: 'casual', name: 'Casual', description: 'Friendly & approachable' },
  { id: 'playful', name: 'Playful', description: 'Fun & energetic' },
  { id: 'luxury', name: 'Luxury', description: 'Premium & sophisticated' },
  { id: 'minimal', name: 'Minimal', description: 'Clean & concise' },
  { id: 'storytelling', name: 'Storytelling', description: 'Narrative & emotional' },
]

const TEMPLATES = [
  { id: 'new_product_launch', name: 'New Product Launch', description: 'Build hype around new arrivals', icon: '🚀' },
  { id: 'flash_sale', name: 'Flash Sale', description: 'Create urgency with time-limited offers', icon: '⚡' },
  { id: 'product_story', name: 'Product Story', description: 'Share the story behind the product', icon: '📖' },
  { id: 'customer_testimonial', name: 'Customer Love', description: 'Showcase customer reviews', icon: '💝' },
  { id: 'holiday_promotion', name: 'Holiday Special', description: 'Seasonal promotion content', icon: '🎄' },
  { id: 'behind_scenes', name: 'Behind the Scenes', description: 'Give a peek into your brand', icon: '🎬' },
]

const ATTRIBUTION_MODEL_OPTIONS = [
  {
    id: 'last_click',
    name: 'Last Click',
    description: '默认把转化归给最近一次有效点击，适合当前社交流量闭环。',
  },
  {
    id: 'first_click',
    name: 'First Click',
    description: '把转化归给首次引流点击，适合看首次种草内容的获客能力。',
  },
]

const EXTENSION_BACKLOG = [
  {
    id: 'meta_insights',
    title: 'Meta Insights API',
    description: '补真实曝光、互动、保存、Profile Visits 与 Reels 表现数据。',
  },
  {
    id: 'story_link_taps',
    title: 'Story Link Taps',
    description: '单独统计 Story sticker / link tap，区分 Bio 与 Story 转化效率。',
  },
  {
    id: 'cross_device',
    title: 'Cross-device Attribution',
    description: '后续可接会员邮箱、登录态与订单邮箱做跨设备归因。',
  },
  {
    id: 'multi_touch',
    title: 'Weighted Multi-touch',
    description: '在 first / last click 之外，再扩展线性分摊或位置加权模型。',
  },
]

function TechHud({ rounded = 'rounded-2xl' }: { rounded?: string }) {
  return (
    <div className={`pointer-events-none absolute inset-0 ${rounded} overflow-hidden`} aria-hidden>
      <span className="absolute" style={{ top: 10, left: 10, width: 18, height: 18, borderTop: '2px solid color-mix(in srgb, var(--adm-accent) 60%, transparent)', borderLeft: '2px solid color-mix(in srgb, var(--adm-accent) 60%, transparent)', borderTopLeftRadius: 6 }} />
      <span className="absolute" style={{ top: 10, right: 10, width: 18, height: 18, borderTop: '2px solid color-mix(in srgb, var(--adm-accent) 60%, transparent)', borderRight: '2px solid color-mix(in srgb, var(--adm-accent) 60%, transparent)', borderTopRightRadius: 6 }} />
      <span className="absolute" style={{ bottom: 10, left: 10, width: 18, height: 18, borderBottom: '2px solid color-mix(in srgb, var(--adm-accent) 60%, transparent)', borderLeft: '2px solid color-mix(in srgb, var(--adm-accent) 60%, transparent)', borderBottomLeftRadius: 6 }} />
      <span className="absolute" style={{ bottom: 10, right: 10, width: 18, height: 18, borderBottom: '2px solid color-mix(in srgb, var(--adm-accent) 60%, transparent)', borderRight: '2px solid color-mix(in srgb, var(--adm-accent) 60%, transparent)', borderBottomRightRadius: 6 }} />
      <span className="absolute left-0 right-0" style={{ top: 0, height: '45%', background: 'linear-gradient(180deg, transparent, color-mix(in srgb, var(--adm-accent) 8%, transparent) 80%, transparent)', animation: 'scan-sweep 6s linear infinite', opacity: 0.6 }} />
    </div>
  )
}

const NOISE_DATA_URI = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="140" height="140"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" stitchTiles="stitch"/></filter><rect width="140" height="140" filter="url(#n)" opacity="0.6"/></svg>').replace(/"/g, '%22')

type CapabilityStatus = 'ready' | 'partial' | 'pending'

const PLATFORM_SYSTEM_STATUS: Record<
  string,
  {
    profile: CapabilityStatus
    timeline: CapabilityStatus
    publish: CapabilityStatus
    tracking: CapabilityStatus
    insights: CapabilityStatus
    comments: CapabilityStatus
    messages: CapabilityStatus
    nextAction: string
  }
> = {
  instagram: {
    profile: 'ready',
    timeline: 'ready',
    publish: 'ready',
    tracking: 'partial',
    insights: 'ready',
    comments: 'partial',
    messages: 'partial',
    nextAction: '评论和私信API已实现，需在Meta开发者平台授予 instagram_manage_comments 和 instagram_manage_messages 权限。',
  },
  twitter: {
    profile: 'ready',
    timeline: 'ready',
    publish: 'ready',
    tracking: 'partial',
    insights: 'ready',
    comments: 'partial',
    messages: 'partial',
    nextAction: '评论和私信API已实现，需X API Elevated Access 和 DM read/write 权限。',
  },
  facebook: {
    profile: 'ready',
    timeline: 'ready',
    publish: 'partial',
    tracking: 'partial',
    insights: 'ready',
    comments: 'partial',
    messages: 'partial',
    nextAction: '评论和私信API已实现，需在Meta开发者平台授予 pages_manage_engagement 和 pages_messaging 权限。',
  },
  linkedin: {
    profile: 'ready',
    timeline: 'ready',
    publish: 'partial',
    tracking: 'partial',
    insights: 'pending',
    comments: 'pending',
    messages: 'pending',
    nextAction: '已具备基础链路，后续重点是平台表现数据与线索归因。',
  },
  youtube: {
    profile: 'ready',
    timeline: 'ready',
    publish: 'partial',
    tracking: 'partial',
    insights: 'pending',
    comments: 'pending',
    messages: 'pending',
    nextAction: '适合后续补视频上传状态、表现数据和站内落地页归因。',
  },
  pinterest: {
    profile: 'ready',
    timeline: 'ready',
    publish: 'partial',
    tracking: 'partial',
    insights: 'pending',
    comments: 'ready',
    messages: 'pending',
    nextAction: 'Comments API已就绪，可查看和回复Pin评论。Pinterest API v5 不提供私信(DM)接口，无法实现私信管理。',
  },
  tiktok: {
    profile: 'ready',
    timeline: 'ready',
    publish: 'partial',
    tracking: 'partial',
    insights: 'pending',
    comments: 'pending',
    messages: 'pending',
    nextAction: '后续要补短视频素材上传、表现数据和广告归因链路。',
  },
}

interface GeneratedContent {
  title: string
  content: string
  hashtags: string[]
  suggestedHashtags: string[]
  hook: string
  cta: string
  tips: string[]
  imagePrompt?: string
}

interface MarketingEntry {
  id: string
  title: string
  type: string
  platform: string
  productName?: string
  content: string
  hashtags: string[]
  mediaUrls?: string[]
  tone: string
  status: string
  createdAt: string
}

interface ReferralLink {
  id: string
  staffId: string
  staffName: string
  staffAvatar?: string
  platform: string
  platformUsername?: string
  productId?: string
  productName?: string
  url: string
  code: string
  createdAt: string
  status: 'active' | 'inactive'
  clicks: number
  conversions: number
  revenue: number
  contentTitle?: string
  contentBody?: string
  hashtags?: string
  contentType?: string
  tone?: string
  publishedAt?: string
}

interface SocialContentRecord {
  id: string
  accountId: string
  staffId: string
  staffName: string
  staffAvatar?: string
  platform: string
  platformName: string
  platformUsername?: string
  status: 'draft' | 'published' | 'manual_action_required' | 'failed'
  publishMode: 'api' | 'share_window' | 'manual'
  contentTitle: string
  contentBody: string
  hashtags?: string
  contentType?: string
  tone?: string
  mediaUrl?: string
  mediaType?: string
  productId?: string
  productName?: string
  referralLinkId?: string
  referralCode?: string
  referralUrl?: string
  platformPostId?: string
  platformPostUrl?: string
  note?: string
  errorMessage?: string
  createdAt: string
  updatedAt: string
  publishedAt?: string
}

interface StaffMember {
  id: string
  name: string
  email: string
  role: string
  active: boolean
  avatar?: string
}

export default function MarketingPage() {
  const [activeTab, setActiveTabState] = useState<'dashboard' | 'projects' | 'studio' | 'templates' | 'history' | 'social' | 'comments' | 'messages' | 'referrals' | 'ai-chat'>('dashboard')
  const [products, setProducts] = useState<any[]>([])
  const [selectedProduct, setSelectedProduct] = useState<any>(null)
  const [productSearch, setProductSearch] = useState('')
  const [showProductDropdown, setShowProductDropdown] = useState(false)
  const [selectedPlatform, setSelectedPlatform] = useState('')
  const [selectedType, setSelectedType] = useState('')
  const [selectedTone, setSelectedTone] = useState('professional')
  const [selectedTemplate, setSelectedTemplate] = useState('')
  const [additionalContext, setAdditionalContext] = useState('')
  const [language, setLanguage] = useState<'en' | 'zh'>('en')
  const [generating, setGenerating] = useState(false)
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null)
  const [imagePrompt, setImagePrompt] = useState('')
  const [generatingImage, setGeneratingImage] = useState(false)
  const [generatedImages, setGeneratedImages] = useState<string[]>([])
  const [imageError, setImageError] = useState('')
  const [generatedVideos, setGeneratedVideos] = useState<string[]>([])
  const [generatingVideo, setGeneratingVideo] = useState(false)
  const [videoError, setVideoError] = useState('')
  const [videoPrompt, setVideoPrompt] = useState('')
  const [videoModel, setVideoModel] = useState('')
  const [videoProvider, setVideoProvider] = useState('')
  const [videoDuration, setVideoDuration] = useState(5)
  const [videoRatio, setVideoRatio] = useState('16:9')
  const [videoAudio, setVideoAudio] = useState(false)
  const [audioLibrary, setAudioLibrary] = useState<AudioItem[]>([])
  const [selectedEditorAudio, setSelectedEditorAudio] = useState('')
  const [lastGeneratedVideo, setLastGeneratedVideo] = useState('')
  const [videoSourceUrl, setVideoSourceUrl] = useState('')

  // ===== 草稿箱：创作进度保存 + 离开页面确认 =====
  const activeTabRef = useRef(activeTab)
  activeTabRef.current = activeTab
  const bypassLeaveGuardRef = useRef(false)
  const pendingNavRef = useRef<{ type: 'tab' | 'link'; target: string } | null>(null)
  const [leaveModal, setLeaveModal] = useState<{ type: 'tab' | 'link'; target: string } | null>(null)
  const [draftToast, setDraftToast] = useState('')
  const draftToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const currentWorkKey = () => JSON.stringify({
    c: generatedContent,
    i: generatedImages,
    v: generatedVideos,
    a: audioLibrary.map(x => x.url),
  })
  const [savedWorkKey, setSavedWorkKey] = useState<string>(() => JSON.stringify({ c: null, i: [], v: [], a: [] }))
  const dirty = currentWorkKey() !== savedWorkKey
  const dirtyRef = useRef(dirty)
  dirtyRef.current = dirty

  const setActiveTab = (tab: any) => {
    if (tab === activeTabRef.current) {
      setActiveTabState(tab)
      return
    }
    if (!bypassLeaveGuardRef.current && dirtyRef.current) {
      pendingNavRef.current = { type: 'tab', target: tab }
      setLeaveModal({ type: 'tab', target: tab })
      return
    }
    setActiveTabState(tab)
  }
  const setActiveTabSilent = (tab: any) => {
    bypassLeaveGuardRef.current = true
    setActiveTabState(tab)
    bypassLeaveGuardRef.current = false
  }

  const saveDraft = async (opts: { copy?: boolean; images?: boolean; videos?: boolean } = {}) => {
    const mediaUrls = [
      ...(opts.images === false ? [] : generatedImages),
      ...(opts.videos === false ? [] : generatedVideos),
    ]
    const content = generatedContent?.content
      || (opts.videos !== false && videoPrompt ? videoPrompt : '')
      || (opts.images !== false && imagePrompt ? imagePrompt : '')
      || ''
    const title = generatedContent?.title
      || (selectedProduct?.name || selectedProduct?.nameEn)
      || `草稿 ${new Date().toLocaleString()}`
    const r = await fetch('/api/marketing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        type: selectedType || 'social_post',
        platform: selectedPlatform || '',
        productId: selectedProduct?.id,
        productName: selectedProduct?.name || selectedProduct?.nameEn,
        content,
        hashtags: generatedContent?.hashtags || [],
        mediaUrls,
        imagePrompt: generatedContent?.imagePrompt || imagePrompt,
        tone: selectedTone,
        status: 'draft',
      }),
    })
    if (!r.ok) throw new Error('保存草稿失败')
    setSavedWorkKey(currentWorkKey())
    loadHistory()
    setDraftToast('✓ 已加入草稿箱（历史记录）')
    if (draftToastTimerRef.current) clearTimeout(draftToastTimerRef.current)
    draftToastTimerRef.current = setTimeout(() => setDraftToast(''), 2200)
  }

  const closeLeaveModal = (action: 'save' | 'discard' | 'cancel') => {
    const pending = pendingNavRef.current
    setLeaveModal(null)
    pendingNavRef.current = null
    if (!pending || action === 'cancel') return
    const finish = () => {
      if (pending.type === 'tab') setActiveTabState(pending.target as any)
      else window.location.assign(pending.target)
    }
    if (action === 'save') {
      saveDraft({}).then(finish).catch(() => {
        setDraftToast('草稿保存失败，请重试')
        if (draftToastTimerRef.current) clearTimeout(draftToastTimerRef.current)
        draftToastTimerRef.current = setTimeout(() => setDraftToast(''), 2200)
      })
    } else {
      // Discard: mark the current work as saved so the prompt won't repeat
      setSavedWorkKey(currentWorkKey())
      finish()
    }
  }

  const handleStartFresh = () => {
    setGeneratedContent(null)
    setPublishCaption('')
    setPublishHashtags('')
    setGeneratedImages([])
    setGeneratedVideos([])
    setPublishImageUrl('')
    setImagePrompt('')
    setSelectedProduct(null)
    setAudioLibrary([])
    setSavedWorkKey(JSON.stringify({ c: null, i: [], v: [], a: [] }))
    setRightPanelTab('preview')
  }

  // 离开页面保护：刷新/关闭走浏览器原生确认；点击站内链接走自定义弹窗
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (dirtyRef.current) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    const onClickCapture = (e: MouseEvent) => {
      if (!dirtyRef.current) return
      const target = e.target as HTMLElement
      const a = target.closest?.('a[href]') as HTMLAnchorElement | null
      if (!a) return
      const href = a.getAttribute('href') || ''
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) return
      const url = new URL(a.href, window.location.href)
      if (url.origin !== window.location.origin || url.pathname === window.location.pathname) return
      e.preventDefault()
      e.stopPropagation()
      pendingNavRef.current = { type: 'link', target: url.href }
      setLeaveModal({ type: 'link', target: url.href })
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    document.addEventListener('click', onClickCapture, true)
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload)
      document.removeEventListener('click', onClickCapture, true)
    }
  }, [])
  const [imageSize, setImageSize] = useState('1024x1024')
  const [autoImage, setAutoImage] = useState(true)
  const [imageCount, setImageCount] = useState(1)
  const [genMode, setGenMode] = useState<'name' | 'reference'>('name')
  const [imageModel, setImageModel] = useState('')
  const [imageRefModel, setImageRefModel] = useState('')
  const [imageProvider, setImageProvider] = useState('')
  const [imageRefProvider, setImageRefProvider] = useState('')
  const [imageRefBaseUrl, setImageRefBaseUrl] = useState('')
  const [copyLLMProvider, setCopyLLMProvider] = useState('')
  const [copyLLMModel, setCopyLLMModel] = useState('')
  const [referenceImage, setReferenceImage] = useState('')
  const [editorImage, setEditorImage] = useState<string | null>(null)
  const [history, setHistory] = useState<MarketingEntry[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)
  const [expandedHistory, setExpandedHistory] = useState<string | null>(null)
  const [stats, setStats] = useState<any>(null)
  const [referralStats, setReferralStats] = useState<any>(null)
  const [referralLinks, setReferralLinks] = useState<ReferralLink[]>([])
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([])
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [socialAccounts, setSocialAccounts] = useState<any[]>([])
  const [socialContent, setSocialContent] = useState<SocialContentRecord[]>([])
  const [socialContentStats, setSocialContentStats] = useState<any>(null)
  const [socialContentLoading, setSocialContentLoading] = useState(false)
  const [selectedStaff, setSelectedStaff] = useState<string>('')
  const [newReferralPlatform, setNewReferralPlatform] = useState('')
  const [showCreateReferral, setShowCreateReferral] = useState(false)
  const [createReferralStaffId, setCreateReferralStaffId] = useState('')
  const [createReferralPlatform, setCreateReferralPlatform] = useState('')
  const [dashboardLoading, setDashboardLoading] = useState(true)
  const [socialAccountStats, setSocialAccountStats] = useState<any>(null)
  const [recentClicks, setRecentClicks] = useState<any[]>([])
  const [allReferralClicks, setAllReferralClicks] = useState<any[]>([])
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month'>('week')
  const [showConnectSocial, setShowConnectSocial] = useState(false)
  const [connectStaffId, setConnectStaffId] = useState('')
  const [connectPlatform, setConnectPlatform] = useState('')
  const [connectUsername, setConnectUsername] = useState('')
  // 三级账户选择器
  const [selectedAccount, setSelectedAccount] = useState<AccountSelectorValue | null>(null)
  // Social Tab 竖状分类导航
  const [socialCategory, setSocialCategory] = useState('')
  // Publish History Tab 竖状分类导航
  const [publishCategory, setPublishCategory] = useState('')

  // 社交平台登录模态框
  const [loginModalPlatform, setLoginModalPlatform] = useState('')
  const [loginStaffId, setLoginStaffId] = useState('')
  const [loginMode, setLoginMode] = useState('')
  const [loginUsername, setLoginUsername] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginAvatar, setLoginAvatar] = useState('')
  const [loginProfileUrl, setLoginProfileUrl] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)
  const [loginError, setLoginError] = useState('')
  const [previewAccountId, setPreviewAccountId] = useState('')
  const [phoneTab, setPhoneTab] = useState<'home' | 'search' | 'create' | 'profile'>('home')
  const [phoneAccountId, setPhoneAccountId] = useState('')
  const [phoneClock, setPhoneClock] = useState('')
  useEffect(() => {
    const tick = () => {
      const d = new Date()
      const hh = d.getHours().toString().padStart(2, '0')
      const mm = d.getMinutes().toString().padStart(2, '0')
      setPhoneClock(`${hh}:${mm}`)
    }
    tick()
    const t = setInterval(tick, 30000)
    return () => clearInterval(t)
  }, [])
  const [showPushModal, setShowPushModal] = useState(false)
  const [pushTargetId, setPushTargetId] = useState('')
  const [pushCopied, setPushCopied] = useState(false)
  const [expandedReferral, setExpandedReferral] = useState<string | null>(null)
  const [rightPanelTab, setRightPanelTab] = useState<'preview' | 'media' | 'phone' | 'publish'>('preview')
  const [xAuthLoading, setXAuthLoading] = useState(false)
  const xAuthLock = useRef(false)
  const [syncAvatarLoading, setSyncAvatarLoading] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [disconnectingId, setDisconnectingId] = useState('')
  const [platformOptionsPlatform, setPlatformOptionsPlatform] = useState('')
  const [expandedPlatforms, setExpandedPlatforms] = useState<Set<string>>(new Set())
  const [publishCaption, setPublishCaption] = useState('')
  const [publishHashtags, setPublishHashtags] = useState('')
  const [publishSending, setPublishSending] = useState(false)
  const [selectedCarouselImages, setSelectedCarouselImages] = useState<string[]>([])
  const [carouselExternalUrl, setCarouselExternalUrl] = useState('')
  const [carouselSelectionActive, setCarouselSelectionActive] = useState(false)
  const [styleKeyword, setStyleKeyword] = useState('')
  const [publishImageUrl, setPublishImageUrl] = useState('')
  const [copyToolAction, setCopyToolAction] = useState<'' | 'expand' | 'shorten' | 'rewrite' | 'translate_en' | 'translate_zh' | 'playful' | 'luxury' | 'minimal' | 'storytelling'>('')
  const [copyToolResult, setCopyToolResult] = useState('')

  // Staff & Platform Carousel Wheel refs and focus indices
  const staffCarouselRef = useRef<HTMLDivElement>(null)
  const platformCarouselRef = useRef<HTMLDivElement>(null)
  const staffScrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wheelSnapTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wheelAccumRef = useRef(0)
  const wheelAnimRef = useRef(0)
  const staffWheelZoneRef = useRef<HTMLDivElement>(null)
  const platformScrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [staffCarouselFocusIdx, setStaffCarouselFocusIdx] = useState(0)
  const [staffHoverIdx, setStaffHoverIdx] = useState<number | null>(null)
  const [allStaffHover, setAllStaffHover] = useState(false)

  // 员工头像转盘：滚一格 = 干脆利落地停到下一个头像（每个人头像为最小单位）
  const stepStaffWheel = (dir: number) => {
    const el = staffCarouselRef.current
    if (!el) return
    const items = el.children
    const n = items.length
    if (!n) return
    const center = el.scrollLeft + el.offsetWidth / 2
    let cur = 0
    let curDist = Infinity
    for (let i = 0; i < n; i++) {
      const item = items[i] as HTMLElement
      const d = Math.abs(center - (item.offsetLeft + item.offsetWidth / 2))
      if (d < curDist) { curDist = d; cur = i }
    }
    const target = Math.max(0, Math.min(n - 1, cur + dir))
    if (target === cur) { wheelAccumRef.current = 0; return }
    const item = items[target] as HTMLElement
    const targetScroll = item.offsetLeft + item.offsetWidth / 2 - el.offsetWidth / 2
    if (wheelAnimRef.current) cancelAnimationFrame(wheelAnimRef.current)
    const startScroll = el.scrollLeft
    const diff = targetScroll - startScroll
    const duration = Math.min(Math.abs(diff) * 0.2, 140)
    const startTime = performance.now()
    const animate = (now: number) => {
      const p = Math.min((now - startTime) / duration, 1)
      const ease = 1 - Math.pow(1 - p, 3)
      el.scrollLeft = startScroll + diff * ease
      if (p < 1) {
        wheelAnimRef.current = requestAnimationFrame(animate)
      } else {
        wheelAnimRef.current = 0
        setStaffCarouselFocusIdx(target)
      }
    }
    wheelAnimRef.current = requestAnimationFrame(animate)
  }

  const handleStaffWheelZone = (e: WheelEvent) => {
    if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return
    e.preventDefault()
    let delta = e.deltaY
    if (e.deltaMode === 1) delta *= 30
    else if (e.deltaMode === 2) delta *= 120
    const NOTCH = 24
    const sign = delta > 0 ? 1 : -1
    if (Math.abs(delta) >= NOTCH) {
      wheelAccumRef.current = 0
      stepStaffWheel(sign)
    } else {
      wheelAccumRef.current += delta
      if (Math.abs(wheelAccumRef.current) >= NOTCH) {
        const s = wheelAccumRef.current > 0 ? 1 : -1
        wheelAccumRef.current = 0
        stepStaffWheel(s)
      }
    }
  }
  const orbitSceneRef = useRef<HTMLDivElement | null>(null)
  const orbitWrapRef = useRef<HTMLDivElement | null>(null)
  const orbitBgRef = useRef<HTMLDivElement | null>(null)
  const orbitLinesRef = useRef<SVGSVGElement | null>(null)
  const orbitRotRef = useRef({ rx: -16, ry: 0, zoom: 1 })
  const orbitDragRef = useRef<{ x: number; y: number; rx: number; ry: number; moved: boolean } | null>(null)
  const starDragRef = useRef<{ accountId: string; startX: number; startY: number; baseX: number; baseY: number; baseZ: number; moved: boolean } | null>(null)
  const starDragMovedRef = useRef(false)
  const orbitAutoRef = useRef(false)
  const [orbitDragging, setOrbitDragging] = useState(false)
  const [orbitHoverId, setOrbitHoverId] = useState<string | null>(null)
  const [orbitActiveId, setOrbitActiveId] = useState<string | null>(null)
  const [starOffsets, setStarOffsets] = useState<Record<string, { x: number; y: number }>>({})
  const [orbitAuto, setOrbitAuto] = useState(false)
  const [featureMenuOpen, setFeatureMenuOpen] = useState(false)

  const applyOrbitTransform = () => {
    const t = orbitRotRef.current
    const el = orbitWrapRef.current
    if (el) {
      el.style.transform = `rotateX(${t.rx}deg) rotateY(${t.ry}deg) scale(${t.zoom})`
    }
    // 背景固定，不做任何视差移动
    if (el) {
      const rx = (t.rx * Math.PI) / 180
      const ry = (t.ry * Math.PI) / 180
      const stars = Array.from(el.querySelectorAll<HTMLElement>('[data-star-depth]'))
      const projected = stars.map(node => {
        const px = parseFloat(node.dataset.px || '0')
        const py = parseFloat(node.dataset.py || '0')
        const pz = parseFloat(node.dataset.pz || '0')
        const y1 = py * Math.cos(rx) - pz * Math.sin(rx)
        const z1 = py * Math.sin(rx) + pz * Math.cos(rx)
        const x2 = px * Math.cos(ry) + z1 * Math.sin(ry)
        const z2 = -px * Math.sin(ry) + z1 * Math.cos(ry)
        const norm = Math.max(0, Math.min(1, (z2 + 120) / 240))
        node.style.opacity = String(0.4 + 0.6 * norm)
        const f = 950
        const zz = z2 * t.zoom
        const proj = f / (f - zz)
        return { x: x2 * t.zoom * proj, y: y1 * t.zoom * proj, norm }
      })
      // 星座连线：跟随星点投影实时重绘
      const svg = orbitLinesRef.current
      if (svg && projected.length > 1) {
        const lines = svg.querySelectorAll('line')
        lines.forEach((ln, i) => {
          const a = projected[i]
          const b = projected[(i + 1) % projected.length]
          if (!a || !b) return
          const avg = (a.norm + b.norm) / 2
          ln.setAttribute('x1', String(a.x))
          ln.setAttribute('y1', String(a.y))
          ln.setAttribute('x2', String(b.x))
          ln.setAttribute('y2', String(b.y))
          ln.setAttribute('stroke-opacity', String(0.16 + 0.38 * avg))
        })
      }
    }
  }

  // 自动运行：星域缓慢自转（拖动/按住星点时暂停）
  useEffect(() => {
    let raf = 0
    const tick = () => {
      if (orbitAutoRef.current && !orbitDragRef.current && !starDragRef.current) {
        const t = orbitRotRef.current
        t.ry = (t.ry + 0.12) % 360
        applyOrbitTransform()
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])
  const [platformCarouselFocusIdx, setPlatformCarouselFocusIdx] = useState(0)

  useEffect(() => {
    setCarouselSelectionActive(false)
    setSelectedCarouselImages([])
    setCarouselExternalUrl('')
    setGeneratedImages([])
    setImagePrompt('')
    setImageError('')
    setReferenceImage('')
  }, [selectedProduct])

  // Sync Studio platform selection with selectedAccount
  useEffect(() => {
    if (selectedAccount?.platform) {
      setSelectedPlatform(selectedAccount.platform)
    }
  }, [selectedAccount?.staffId, selectedAccount?.platform])

  // Auto-scroll staff carousel to center selected item when selection changes
  // "All Staff" is handled by the fixed button outside the scrollable area
  useEffect(() => {
    if (!selectedAccount) {
      setStaffCarouselFocusIdx(0)
      return
    }
    if (staffCarouselRef.current) {
      const el = staffCarouselRef.current
      const items = el.children
      const centerIdx = Array.from(items).findIndex(item => {
        const key = (item as HTMLElement).dataset?.staffId || ''
        return key === selectedAccount.staffId
      })
      const idx = centerIdx >= 0 ? centerIdx : 0
      setStaffCarouselFocusIdx(idx)
      if (items[idx]) {
        const item = items[idx] as HTMLElement
        el.scrollTo({
          left: item.offsetLeft + item.offsetWidth / 2 - el.offsetWidth / 2,
          behavior: 'smooth',
        })
      }
    }
  }, [selectedAccount])

  // Auto-scroll platform carousel when platform selection changes
  useEffect(() => {
    if (platformCarouselRef.current) {
      const el = platformCarouselRef.current
      const items = el.children
      const centerIdx = selectedAccount
        ? Array.from(items).findIndex(item => {
            const key = (item as HTMLElement).dataset?.platformId || ''
            return key === selectedAccount.platform
          })
        : 0
      const idx = centerIdx >= 0 ? centerIdx : 0
      setPlatformCarouselFocusIdx(idx)
      if (items[idx]) {
        const item = items[idx] as HTMLElement
        el.scrollTo({
          left: item.offsetLeft + item.offsetWidth / 2 - el.offsetWidth / 2,
          behavior: 'smooth',
        })
      }
    }
  }, [selectedAccount?.platform])

  // AI Chat 相关状态
  const [aiMessages, setAiMessages] = useState<{ role: 'user' | 'assistant'; content: string; mode?: string; images?: string[] }[]>([])
  const [aiInput, setAiInput] = useState('')
  const [aiMode, setAiMode] = useState('general')
  const [aiSending, setAiSending] = useState(false)
  const [aiAttachedProduct, setAiAttachedProduct] = useState<any>(null)
  const [showAiProductPicker, setShowAiProductPicker] = useState(false)
  const [aiProductSearch, setAiProductSearch] = useState('')
  const [aiUploads, setAiUploads] = useState<{ name: string; type: string; dataUrl: string }[]>([])
  const [generateError, setGenerateError] = useState('')
  const [xProfileData, setXProfileData] = useState<any>(null)
  const [xProfileLoading, setXProfileLoading] = useState(false)
  const [xTimeline, setXTimeline] = useState<any[]>([])
  const [xTimelineLoading, setXTimelineLoading] = useState(false)
  const [xTweetText, setXTweetText] = useState('')
  const [xPosting, setXPosting] = useState(false)
  const [xPostSuccess, setXPostSuccess] = useState(false)
  const [xPostError, setXPostError] = useState('')
  const [accountLiveProfile, setAccountLiveProfile] = useState<any>(null)
  const [accountLiveProfileLoading, setAccountLiveProfileLoading] = useState(false)
  const [accountLiveProfileError, setAccountLiveProfileError] = useState('')
  const [profileRefreshKey, setProfileRefreshKey] = useState(0)
  const [systemSettings, setSystemSettings] = useState<any>(null)
  const [instagramHealth, setInstagramHealth] = useState<any>(null)
  const [instagramHealthLoading, setInstagramHealthLoading] = useState(false)
  const [instagramHealthError, setInstagramHealthError] = useState('')
  const [instagramInsightsData, setInstagramInsightsData] = useState<any>(null)
  const [instagramInsightsLoading, setInstagramInsightsLoading] = useState(false)
  const [instagramInsightsError, setInstagramInsightsError] = useState('')
  const [xInsightsData, setXInsightsData] = useState<Record<string, any>>({})
  const [xInsightsLoading, setXInsightsLoading] = useState(false)
  const [facebookInsightsData, setFacebookInsightsData] = useState<Record<string, any>>({})
  const [facebookInsightsLoading, setFacebookInsightsLoading] = useState(false)
  // Comments management (multi-platform)
  const [igComments, setIgComments] = useState<any[]>([])
  const [xComments, setXComments] = useState<any[]>([])
  const [fbComments, setFbComments] = useState<any[]>([])
  const [ptComments, setPtComments] = useState<any[]>([])
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [commentsSyncErrors, setCommentsSyncErrors] = useState<{ platform: string; label: string; message: string }[]>([])
  const [commentsPlatformFilter, setCommentsPlatformFilter] = useState('all')
  const [commentsAccountFilter, setCommentsAccountFilter] = useState('all')
  const [commentsSearch, setCommentsSearch] = useState('')
  const [commentsSelected, setCommentsSelected] = useState<Set<string>>(new Set())
  const [replyTarget, setReplyTarget] = useState<{ commentId: string; accountId: string; platform: string } | null>(null)
  const [replyText, setReplyText] = useState('')
  const [replySending, setReplySending] = useState(false)
  // DM / Messages management (multi-platform)
  const [igConversations, setIgConversations] = useState<any[]>([])
  const [xConversations, setXConversations] = useState<any[]>([])
  const [fbConversations, setFbConversations] = useState<any[]>([])
  const [dmLoading, setDmLoading] = useState(false)
  const [conversationSyncErrors, setConversationSyncErrors] = useState<{ platform: string; label: string; message: string }[]>([])
  const [dmPlatformFilter, setDmPlatformFilter] = useState('all')
  const [dmAccountFilter, setDmAccountFilter] = useState('all')
  const [dmSearch, setDmSearch] = useState('')
  const [activeConversation, setActiveConversation] = useState<any>(null)
  const [dmText, setDmText] = useState('')
  const [dmSending, setDmSending] = useState(false)
  const [unreadDmCount, setUnreadDmCount] = useState(0)
  const [unreadCommentCount, setUnreadCommentCount] = useState(0)
  const [lastNotificationCheck, setLastNotificationCheck] = useState<Date | null>(null)
  // 实时通知弹窗
  const [liveNotifications, setLiveNotifications] = useState<{ id: string; type: string; platform: string; message: string; timestamp: Date }[]>([])
  const [sseConnected, setSseConnected] = useState(false)
  const [sseEventCount, setSseEventCount] = useState(0)
  const [lastSseEvent, setLastSseEvent] = useState<string>('')
  const [showVerifyToken, setShowVerifyToken] = useState(false)
  const [webhookSaving, setWebhookSaving] = useState<Record<string, boolean>>({})
  const [selectedSocialContentId, setSelectedSocialContentId] = useState<string | null>(null)
  const [attributionSaving, setAttributionSaving] = useState(false)
  const [selectedInstagramPanelAccountId, setSelectedInstagramPanelAccountId] = useState('')
  const [postListSearch, setPostListSearch] = useState('')
  const [postListStatusFilter, setPostListStatusFilter] = useState('all')
  const [postListPlatformFilter, setPostListPlatformFilter] = useState('all')
  const [postListStartDate, setPostListStartDate] = useState('')
  const [postListEndDate, setPostListEndDate] = useState('')
  const [postListStaffFilter, setPostListStaffFilter] = useState('all')
  const [postListSortBy, setPostListSortBy] = useState('newest')

  const filteredProducts = useMemo(() => 
    products.filter((p: any) => {
      const name = p.name || p.nameEn || ''
      return name.toLowerCase().includes(productSearch.toLowerCase())
    }).slice(0, 10),
    [products, productSearch]
  )

  const filteredHistory = useMemo(() => 
    history.filter((h: MarketingEntry) =>
      h.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (h.productName && h.productName.toLowerCase().includes(searchQuery.toLowerCase()))
    ),
    [history, searchQuery]
  )

  const aiFilteredProducts = useMemo(() => 
    products.filter((p: any) => {
      const name = p.name || p.nameEn || ''
      return name.toLowerCase().includes(aiProductSearch.toLowerCase())
    }),
    [products, aiProductSearch]
  )

  const allStaffMembers = useMemo(() => {
    if (!currentUser) return staffMembers
    const exists = staffMembers.some(s => s.id === currentUser.id)
    if (exists) return staffMembers
    return [currentUser as StaffMember, ...staffMembers]
  }, [staffMembers, currentUser])

  const currentUserAccounts = useMemo(() => 
    socialAccounts.filter(a => a.staffId === currentUser?.id && a.status === 'connected'),
    [socialAccounts, currentUser]
  )

  const visibleAccounts = useMemo(() => {
    if (isAdmin) return socialAccounts
    return socialAccounts.filter(a => a.staffId === currentUser?.id)
  }, [socialAccounts, isAdmin, currentUser])
  const connectedVisibleAccounts = useMemo(
    () => visibleAccounts.filter(account => account.status === 'connected'),
    [visibleAccounts]
  )

  const previewAccount = useMemo(() =>
    socialAccounts.find(a => a.id === previewAccountId) || visibleAccounts[0] || null,
    [socialAccounts, previewAccountId, visibleAccounts]
  )

  // 从全局 selectedAccount 推导实际账户对象，用于预览面板
  const selectedPreviewAccount = useMemo(() => {
    if (!selectedAccount?.accountId) return null
    return socialAccounts.find(a => a.id === selectedAccount.accountId) || null
  }, [socialAccounts, selectedAccount])

  const phoneAccount = useMemo(() => {
    if (phoneAccountId) {
      return socialAccounts.find(a => a.id === phoneAccountId) || null
    }
    if (selectedPlatform) {
      return currentUserAccounts.find(a => a.platform === selectedPlatform) || null
    }
    return null
  }, [socialAccounts, phoneAccountId, currentUserAccounts, selectedPlatform])

  const selectedPlatformAccount = useMemo(() =>
    currentUserAccounts.find(a => a.platform === selectedPlatform) || null,
    [currentUserAccounts, selectedPlatform]
  )

  // Dashboard filtered data based on selectedAccount
  const dashboardFilteredLinks = useMemo(() => {
    if (!selectedAccount) return referralLinks
    return referralLinks.filter(l => {
      const matchStaff = l.staffId === selectedAccount.staffId
      const matchPlatform = l.platform === selectedAccount.platform
      return matchStaff && matchPlatform
    })
  }, [referralLinks, selectedAccount])

  const dashboardFilteredStats = useMemo(() => {
    const links = dashboardFilteredLinks
    const totalClicks = links.reduce((sum, l) => sum + (l.clicks || 0), 0)
    const totalConversions = links.reduce((sum, l) => sum + (l.conversions || 0), 0)
    const totalRevenue = links.reduce((sum, l) => sum + (l.revenue || 0), 0)
    return {
      totalClicks,
      totalConversions,
      totalRevenue,
      totalLinks: links.length,
      conversionRate: totalClicks > 0 ? ((totalConversions / totalClicks) * 100).toFixed(1) : '0',
    }
  }, [dashboardFilteredLinks])

  const dashboardFilteredAccounts = useMemo(() => {
    if (!selectedAccount) return visibleAccounts
    return visibleAccounts.filter(a =>
      a.staffId === selectedAccount.staffId &&
      a.platform === selectedAccount.platform
    )
  }, [visibleAccounts, selectedAccount])

  const recentSocialContent = useMemo(() => socialContent.slice(0, 8), [socialContent])
  const instagramAccount = useMemo(
    () => socialAccounts.find(a => a.platform === 'instagram' && a.status === 'connected') || null,
    [socialAccounts]
  )
  const instagramVisibleAccounts = useMemo(
    () => connectedVisibleAccounts.filter(account => account.platform === 'instagram'),
    [connectedVisibleAccounts]
  )
  const instagramOperationalRecords = useMemo(
    () => socialContent.filter(record => record.platform === 'instagram').slice(0, 6),
    [socialContent]
  )
  const pendingOperationalRecords = useMemo(
    () =>
      socialContent
        .filter(record => record.status === 'manual_action_required' || record.status === 'failed')
        .slice(0, 6),
    [socialContent]
  )
  const selectedSocialContent = useMemo(
    () => socialContent.find(record => record.id === selectedSocialContentId) || null,
    [socialContent, selectedSocialContentId]
  )
  const featuredInstagramRecord = useMemo(
    () => instagramOperationalRecords.find(record => record.status === 'published') || instagramOperationalRecords[0] || null,
    [instagramOperationalRecords]
  )
  const instagramInsightsSummary = useMemo(
    () => getInstagramInsightsSummary(socialContent, referralLinks),
    [socialContent, referralLinks]
  )
  const publishRecordsTable = useMemo(() => {
    return [...socialContent]
      .sort((a, b) => new Date(b.publishedAt || b.createdAt).getTime() - new Date(a.publishedAt || a.createdAt).getTime())
      .map(record => {
        const linkedMetrics = record.referralLinkId
          ? referralLinks.find(link => link.id === record.referralLinkId) || null
          : null
        let officialMetrics = null
        let views = 0
        let reach = 0

        if (record.platform === 'instagram' && record.platformPostId) {
          officialMetrics = instagramInsightsData?.officialSummary?.records?.find((item: any) => item.mediaId === record.platformPostId) || null
          views = officialMetrics?.views || 0
          reach = officialMetrics?.reach || 0
        } else if (record.platform === 'twitter' && record.accountId) {
          const xIns = xInsightsData[record.accountId]
          if (xIns && !xIns.error) {
            views = xIns.impressions || 0
            reach = xIns.followers || 0
            officialMetrics = { platform: 'twitter', impressions: xIns.impressions, followers: xIns.followers, profileClicks: xIns.profileClicks, linkClicks: xIns.linkClicks }
          }
        } else if (record.platform === 'facebook' && record.accountId) {
          const fbIns = facebookInsightsData[record.accountId]
          if (fbIns && !fbIns.error) {
            views = fbIns.impressions || 0
            reach = fbIns.totalFollowers || 0
            officialMetrics = { platform: 'facebook', impressions: fbIns.impressions, totalFollowers: fbIns.totalFollowers, newFollowers: fbIns.newFollowers, engagements: fbIns.engagements }
          }
        }

        const clicks = linkedMetrics?.clicks || 0
        const conversions = linkedMetrics?.conversions || 0
        const revenue = linkedMetrics?.revenue || 0
        const searchBlob = [
          record.contentTitle,
          record.contentBody,
          record.platformName,
          record.platformUsername,
          record.staffName,
          record.productName,
          record.referralCode,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()

        return {
          record,
          linkedMetrics,
          officialMetrics,
          views,
          reach,
          clicks,
          conversions,
          revenue,
          conversionRate: clicks > 0 ? (conversions / clicks) * 100 : 0,
          searchBlob,
        }
      })
  }, [socialContent, referralLinks, instagramInsightsData, xInsightsData, facebookInsightsData])

  const dashboardFilteredRecords = useMemo(() => {
    if (!selectedAccount) return publishRecordsTable
    return publishRecordsTable.filter(item =>
      item.record.staffId === selectedAccount.staffId &&
      item.record.platform === selectedAccount.platform &&
      item.record.accountId === selectedAccount.accountId
    )
  }, [publishRecordsTable, selectedAccount])

  const filteredPublishRecordsTable = useMemo(() => {
    const keyword = postListSearch.trim().toLowerCase()
    let result = publishRecordsTable.filter(item => {
      if (postListStatusFilter !== 'all' && item.record.status !== postListStatusFilter) return false
      if (postListPlatformFilter !== 'all' && item.record.platform !== postListPlatformFilter) return false
      if (keyword && !item.searchBlob.includes(keyword)) return false
      if (postListStaffFilter !== 'all' && item.record.staffName !== postListStaffFilter) return false
      // Filter by selectedAccount from the selector
      if (selectedAccount) {
        if (item.record.staffId !== selectedAccount.staffId) return false
        if (item.record.platform !== selectedAccount.platform) return false
        if (item.record.accountId && item.record.accountId !== selectedAccount.accountId) return false
      }
      const publishedAt = item.record.publishedAt || item.record.createdAt
      if (postListStartDate) {
        const start = new Date(postListStartDate)
        if (publishedAt && new Date(publishedAt) < start) return false
      }
      if (postListEndDate) {
        const end = new Date(postListEndDate)
        end.setHours(23, 59, 59, 999)
        if (publishedAt && new Date(publishedAt) > end) return false
      }
      return true
    })

    result = [...result].sort((a, b) => {
      const aDate = new Date(a.record.publishedAt || a.record.createdAt).getTime()
      const bDate = new Date(b.record.publishedAt || b.record.createdAt).getTime()
      switch (postListSortBy) {
        case 'newest': return bDate - aDate
        case 'oldest': return aDate - bDate
        case 'most_views': return b.views - a.views
        case 'most_clicks': return b.clicks - a.clicks
        case 'highest_revenue': return b.revenue - a.revenue
        case 'best_conversion': return b.conversionRate - a.conversionRate
        default: return 0
      }
    })

    return result
  }, [publishRecordsTable, postListSearch, postListStatusFilter, postListPlatformFilter, postListStaffFilter, postListStartDate, postListEndDate, postListSortBy, selectedAccount])
  const postPageSummary = useMemo(() => {
    return filteredPublishRecordsTable.reduce(
      (acc, item) => {
        acc.total += 1
        if (item.record.status === 'published') acc.published += 1
        if (item.record.status === 'manual_action_required') acc.manual += 1
        if (item.record.status === 'failed') acc.failed += 1
        acc.clicks += item.clicks
        acc.conversions += item.conversions
        acc.revenue += item.revenue
        acc.views += item.views
        return acc
      },
      { total: 0, published: 0, manual: 0, failed: 0, clicks: 0, conversions: 0, revenue: 0, views: 0 }
    )
  }, [filteredPublishRecordsTable])

  const handleExportPostLedgerCSV = () => {
    const headers = ['Date', 'Account', 'Platform', 'Title', 'Status', 'Views', 'Clicks', 'Revenue', 'Conversions', 'Rate']
    const rows = filteredPublishRecordsTable.map(item => {
      const date = new Date(item.record.publishedAt || item.record.createdAt).toLocaleDateString()
      const account = item.record.platformUsername || item.record.staffName || ''
      const platform = item.record.platformName || item.record.platform
      const title = (item.record.contentTitle || '').replace(/"/g, '""')
      const status = item.record.status
      const views = item.views
      const clicks = item.clicks
      const revenue = item.revenue.toFixed(2)
      const conversions = item.conversions
      const rate = item.conversionRate.toFixed(2) + '%'
      return [date, account, platform, title, status, views, clicks, revenue, conversions, rate]
        .map(v => `"${v}"`)
        .join(',')
    })
    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `post-ledger-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const instagramFunnelSummary = useMemo(() => {
    const instagramLinkIds = new Set(
      referralLinks.filter(link => link.platform === 'instagram').map(link => link.id)
    )
    const instagramClicks = allReferralClicks.filter(
      click => click.platform === 'instagram' && instagramLinkIds.has(click.referralId)
    )
    const isProductPage = (page?: string) => page === '/products' || (page || '').startsWith('/products/')
    const storyEntryVisits = instagramClicks.filter(click => click.sourceChannel === 'story').length
    const bioLandingVisits = instagramClicks.filter(click => click.page === '/link-in-bio').length
    const productDetailVisits = instagramClicks.filter(click => isProductPage(click.page)).length
    const attributedOrders = instagramClicks.filter(click => click.converted).length
    const directHomeVisits = instagramClicks.filter(
      click => (click.sourceChannel || 'direct') === 'direct' && click.page === '/'
    ).length
    const rate = (current: number, previous: number) =>
      previous > 0 ? Math.round((current / previous) * 1000) / 10 : 0

    return {
      officialViews: instagramInsightsData?.officialSummary?.totals?.views || 0,
      officialReach: instagramInsightsData?.officialSummary?.totals?.reach || 0,
      directHomeVisits,
      stages: [
        {
          id: 'story',
          label: 'Story Entry',
          visits: storyEntryVisits,
          nextLabel: 'To Bio',
          nextRate: rate(bioLandingVisits, storyEntryVisits),
          description: 'Story sticker / story link 进入归因链路的会话数。',
        },
        {
          id: 'bio',
          label: 'Bio Landing',
          visits: bioLandingVisits,
          nextLabel: 'To Product',
          nextRate: rate(productDetailVisits, bioLandingVisits),
          description: '进入 Link in Bio 落地页并继续浏览的会话数。',
        },
        {
          id: 'product',
          label: 'Product Detail',
          visits: productDetailVisits,
          nextLabel: 'To Order',
          nextRate: rate(attributedOrders, productDetailVisits),
          description: '带 referral 的商品详情访问，继续观察下单转化。',
        },
      ],
    }
  }, [allReferralClicks, instagramInsightsData, referralLinks])
  const platformCapabilityMatrix = useMemo(() => {
    return PLATFORMS.map(platform => {
      const accounts = visibleAccounts.filter(account => account.platform === platform.id)
      const connectedAccounts = accounts.filter(account => account.status === 'connected')
      const records = socialContent.filter(record => record.platform === platform.id)
      const publishedRecords = records.filter(record => record.status === 'published')
      const manualRecords = records.filter(record => record.status === 'manual_action_required')
      const links = referralLinks.filter(link => link.platform === platform.id)
      const clicks = links.reduce((sum, link) => sum + (link.clicks || 0), 0)
      const conversions = links.reduce((sum, link) => sum + (link.conversions || 0), 0)
      const revenue = links.reduce((sum, link) => sum + (link.revenue || 0), 0)
      const systemStatus = PLATFORM_SYSTEM_STATUS[platform.id]
      const insightsStatus: CapabilityStatus =
        platform.id === 'instagram'
          ? instagramInsightsData?.status === 'ready'
            ? 'ready'
            : systemSettings?.igInsightsEnabled
              ? 'partial'
              : 'pending'
          : systemStatus?.insights || 'pending'
      const capabilityEntries = systemStatus
        ? [
            ['Profile', systemStatus.profile],
            ['Publish', systemStatus.publish],
            ['Tracking', systemStatus.tracking],
            ['Insights', insightsStatus],
          ]
        : []
      const readyCount = capabilityEntries.filter(([, status]) => status === 'ready').length
      const partialCount = capabilityEntries.filter(([, status]) => status === 'partial').length

      return {
        ...platform,
        accounts,
        connectedAccounts,
        records,
        publishedRecords,
        manualRecords,
        clicks,
        conversions,
        revenue,
        systemStatus,
        capabilityEntries,
        readyCount,
        partialCount,
      }
    })
  }, [visibleAccounts, socialContent, referralLinks, instagramInsightsData, systemSettings])
  const multiAccountOperations = useMemo(() => {
    return connectedVisibleAccounts.map(account => {
      const pInfo = PLATFORMS.find(platform => platform.id === account.platform) || {
        id: account.platform,
        name: account.platform,
        icon: Globe,
        color: '#6366F1',
        bgColor: '#EEF2FF',
      }
      const records = socialContent.filter(record => record.accountId === account.id)
      const publishedRecords = records.filter(record => record.status === 'published')
      const relatedLinkIds = new Set(
        records.map(record => record.referralLinkId).filter(Boolean)
      )
      const relatedLinks = referralLinks.filter(link => relatedLinkIds.has(link.id))
      const clicks = relatedLinks.reduce((sum, link) => sum + (link.clicks || 0), 0)
      const conversions = relatedLinks.reduce((sum, link) => sum + (link.conversions || 0), 0)
      const systemStatus = PLATFORM_SYSTEM_STATUS[account.platform]
      const insightsStatus: CapabilityStatus =
        account.platform === 'instagram'
          ? instagramInsightsData?.status === 'ready'
            ? 'ready'
            : systemSettings?.igInsightsEnabled
              ? 'partial'
              : 'pending'
          : systemStatus?.insights || 'pending'

      return {
        account,
        pInfo,
        records,
        publishedRecords,
        clicks,
        conversions,
        capabilityHighlights: [
          ['Publish', systemStatus?.publish || 'pending'],
          ['Tracking', systemStatus?.tracking || 'pending'],
          ['Insights', insightsStatus],
        ] as Array<[string, CapabilityStatus]>,
      }
    })
  }, [connectedVisibleAccounts, socialContent, referralLinks, instagramInsightsData, systemSettings])
  const filteredAccountOps = useMemo(() => {
    if (!selectedAccount) return multiAccountOperations
    return multiAccountOperations.filter(op =>
      op.account.staffId === selectedAccount.staffId &&
      op.account.platform === selectedAccount.platform &&
      op.account.id === selectedAccount.accountId
    )
  }, [multiAccountOperations, selectedAccount])
  const developerConfigCards = useMemo(() => {
    const connectorConfigs = [
      { id: 'instagram', name: 'Instagram', enabledKey: 'igApiEnabled', clientIdKey: 'igClientId', callbackKey: 'igCallbackUrl' },
      { id: 'facebook', name: 'Facebook', enabledKey: 'fbApiEnabled', clientIdKey: 'fbClientId', callbackKey: 'fbCallbackUrl' },
      { id: 'twitter', name: 'X (Twitter)', enabledKey: 'xApiEnabled', clientIdKey: 'xClientId', callbackKey: 'xCallbackUrl' },
    ]

    return connectorConfigs.map(item => {
      const enabled = Boolean(systemSettings?.[item.enabledKey])
      const hasClientId = Boolean(systemSettings?.[item.clientIdKey])
      const hasCallback = Boolean(systemSettings?.[item.callbackKey])
      return {
        ...item,
        enabled,
        hasClientId,
        hasCallback,
        ready: enabled && hasClientId && hasCallback,
        callbackUrl: systemSettings?.[item.callbackKey] || '',
      }
    })
  }, [systemSettings])
  const staffAuthorizationRows = useMemo(() => {
    const targetStaff = isAdmin
      ? staffMembers.filter(staff => staff.active)
      : currentUser
        ? [{
            id: currentUser.id,
            name: currentUser.name,
            email: currentUser.email,
            role: currentUser.role,
            active: true,
            avatar: currentUser.avatar,
          }]
        : []

    return targetStaff.map(staff => {
      const accounts = socialAccounts.filter(account => account.staffId === staff.id)
      const connectedAccounts = accounts.filter(account => account.status === 'connected')
      const instagramAccounts = connectedAccounts.filter(account => account.platform === 'instagram')
      const platformNames = Array.from(new Set(connectedAccounts.map(account => {
        const platform = PLATFORMS.find(item => item.id === account.platform)
        return platform?.name || account.platform
      })))

      return {
        staff,
        accounts,
        connectedAccounts,
        instagramAccounts,
        platformNames,
      }
    })
  }, [isAdmin, staffMembers, currentUser, socialAccounts])
  const instagramAccountBoards = useMemo(() => {
    return instagramVisibleAccounts.map(account => {
      const health = instagramHealth?.accounts?.find((item: any) => item.account?.id === account.id) || null
      const insights = instagramInsightsData?.accountSummaries?.find((item: any) => item.account?.id === account.id) || null
      const records = socialContent.filter(record => record.accountId === account.id)
      const publishedRecords = records.filter(record => record.status === 'published')
      return {
        account,
        health,
        insights,
        records,
        publishedRecords,
      }
    })
  }, [instagramVisibleAccounts, instagramHealth, instagramInsightsData, socialContent])
  const selectedInstagramAccountBoard = useMemo(() => {
    return instagramAccountBoards.find(item => item.account.id === selectedInstagramPanelAccountId) || instagramAccountBoards[0] || null
  }, [instagramAccountBoards, selectedInstagramPanelAccountId])
  const attributionStatusSummary = useMemo(() => {
    const model = systemSettings?.attributionModel === 'first_click' ? 'First Click' : 'Last Click'
    const lookback = systemSettings?.attributionLookbackDays || 7
    const requireVisitorMatch = systemSettings?.attributionRequireVisitorMatch !== false
    const allowFallback = systemSettings?.attributionAllowReferralFallback !== false
    return {
      model,
      lookback,
      requireVisitorMatch,
      allowFallback,
    }
  }, [systemSettings])

  useEffect(() => {
    if (instagramAccountBoards.length === 0) {
      if (selectedInstagramPanelAccountId) setSelectedInstagramPanelAccountId('')
      return
    }
    if (!instagramAccountBoards.some(item => item.account.id === selectedInstagramPanelAccountId)) {
      setSelectedInstagramPanelAccountId(instagramAccountBoards[0].account.id)
    }
  }, [instagramAccountBoards, selectedInstagramPanelAccountId])

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      alert('Copied to clipboard!')
    } catch (e) {
      const textarea = document.createElement('textarea')
      textarea.value = text
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      alert('Copied to clipboard!')
    }
  }

  const getProductMediaUrl = (product?: any) => {
    if (!product) return ''
    return product.image || product.detailImages?.[0] || ''
  }

  const getCapabilityBadge = (status: 'ready' | 'partial' | 'pending') => {
    if (status === 'ready') {
      return {
        label: '已接入',
        backgroundColor: '#DCFCE7',
        color: '#166534',
      }
    }
    if (status === 'partial') {
      return {
        label: '部分完成',
        backgroundColor: '#FEF3C7',
        color: '#92400E',
      }
    }
    return {
      label: '待开发',
      backgroundColor: '#F3F4F6',
      color: '#4B5563',
    }
  }

  const getPublishStatusMeta = (status: SocialContentRecord['status']) => {
    switch (status) {
      case 'published':
        return { label: '已发布', backgroundColor: '#DCFCE7', color: '#166534' }
      case 'manual_action_required':
        return { label: '待人工完成', backgroundColor: '#FEF3C7', color: '#92400E' }
      case 'failed':
        return { label: '发布失败', backgroundColor: '#FEE2E2', color: '#991B1B' }
      default:
        return { label: '草稿', backgroundColor: '#F3F4F6', color: '#4B5563' }
    }
  }

  const getHealthStatusMeta = (status?: string) => {
    switch (status) {
      case 'healthy':
        return { label: '已就绪', backgroundColor: '#DCFCE7', color: '#166534' }
      case 'partial_health':
        return { label: '部分可用', backgroundColor: '#FEF3C7', color: '#92400E' }
      case 'network_unreachable':
        return { label: '网络阻塞', backgroundColor: '#FEE2E2', color: '#991B1B' }
      case 'missing_permission':
        return { label: '缺少权限', backgroundColor: '#FEF3C7', color: '#92400E' }
      case 'auth_error':
        return { label: '授权异常', backgroundColor: '#FEF3C7', color: '#92400E' }
      case 'not_connected':
        return { label: '未连接账号', backgroundColor: '#F3F4F6', color: '#4B5563' }
      default:
        return { label: '待检查', backgroundColor: '#F3F4F6', color: '#4B5563' }
    }
  }

  const getInsightsStatusMeta = (status?: string) => {
    switch (status) {
      case 'ready':
        return { label: '已拉取', backgroundColor: '#DCFCE7', color: '#166534' }
      case 'partial_ready':
        return { label: '部分拉取', backgroundColor: '#FEF3C7', color: '#92400E' }
      case 'ready_without_posts':
        return { label: '缺少帖子', backgroundColor: '#FEF3C7', color: '#92400E' }
      case 'internal_only':
        return { label: '仅内部快照', backgroundColor: '#E0E7FF', color: '#3730A3' }
      case 'auth_error':
        return { label: '授权异常', backgroundColor: '#FEE2E2', color: '#991B1B' }
      case 'network_unreachable':
        return { label: '网络阻塞', backgroundColor: '#FEE2E2', color: '#991B1B' }
      case 'metric_not_supported':
        return { label: '指标需回退', backgroundColor: '#FEF3C7', color: '#92400E' }
      case 'not_connected':
        return { label: '未连接账号', backgroundColor: '#F3F4F6', color: '#4B5563' }
      default:
        return { label: '待检查', backgroundColor: '#F3F4F6', color: '#4B5563' }
    }
  }

  const getLinkedReferralMetrics = (record?: SocialContentRecord | null) => {
    if (!record?.referralLinkId) {
      return null
    }
    return referralLinks.find(link => link.id === record.referralLinkId) || null
  }

  const getRecordFunnelMetrics = (record?: SocialContentRecord | null) => {
    if (!record?.referralLinkId) {
      return null
    }

    const recordClicks = allReferralClicks.filter(click => click.referralId === record.referralLinkId)
    const uniqueVisitors = (items: any[]) => new Set(items.map(item => item.visitorId).filter(Boolean)).size
    const storyVisits = uniqueVisitors(recordClicks.filter(click => click.sourceChannel === 'story'))
    const bioVisits = uniqueVisitors(recordClicks.filter(click => click.page === '/link-in-bio'))
    const productVisits = uniqueVisitors(
      recordClicks.filter(click => click.page === '/products' || (click.page || '').startsWith('/products/'))
    )
    const orderCount = new Set(
      recordClicks.filter(click => click.converted).map(click => click.orderId || click.id)
    ).size
    const stageRate = (current: number, previous: number) =>
      previous > 0 ? Math.round((current / previous) * 1000) / 10 : 0

    return {
      storyVisits,
      bioVisits,
      productVisits,
      orderCount,
      totalTouchpoints: recordClicks.length,
      stages: [
        {
          id: 'story',
          label: 'Story Entry',
          value: storyVisits,
          nextLabel: 'To Bio',
          nextRate: stageRate(bioVisits, storyVisits),
        },
        {
          id: 'bio',
          label: 'Bio Landing',
          value: bioVisits,
          nextLabel: 'To Product',
          nextRate: stageRate(productVisits, bioVisits),
        },
        {
          id: 'product',
          label: 'Product Detail',
          value: productVisits,
          nextLabel: 'To Order',
          nextRate: stageRate(orderCount, productVisits),
        },
      ],
    }
  }

  const getRecordOfficialMetrics = (record?: SocialContentRecord | null) => {
    if (!record?.platformPostId) {
      return null
    }
    return (
      instagramInsightsData?.officialSummary?.records?.find(
        (item: any) => item.mediaId === record.platformPostId
      ) || null
    )
  }

  const getAttributionModelLabel = (model?: string) => {
    if (model === 'first_click') return 'First Click'
    return 'Last Click'
  }

  const getBioLandingUrl = (
    record?: Pick<SocialContentRecord, 'referralCode' | 'productId' | 'referralUrl'> | null
  ) => {
    if (!record?.referralCode) {
      return record?.referralUrl || ''
    }
    return buildReferralBioLandingUrl({
      code: record.referralCode,
      productId: record.productId,
      fallbackUrl: record.referralUrl,
    })
  }

  const getStoryLandingUrl = (
    record?: Pick<SocialContentRecord, 'referralCode' | 'productId' | 'referralUrl'> | null
  ) => {
    if (!record?.referralCode) return ''
    return buildReferralBioLandingUrl({
      code: record.referralCode,
      productId: record.productId,
      fallbackUrl: record.referralUrl,
      sourceChannel: 'story',
    })
  }

  const getProductTrackingUrl = (
    record?: Pick<SocialContentRecord, 'referralCode' | 'productId' | 'referralUrl'> | null
  ) => {
    if (!record?.referralCode || !record.productId) return ''
    return buildReferralProductUrl({
      code: record.referralCode,
      productId: record.productId,
      fallbackUrl: record.referralUrl,
      sourceChannel: 'bio',
    })
  }

  const openTrackingPreview = (url?: string) => {
    if (!url) return
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const saveAttributionSettings = async () => {
    if (!systemSettings) return
    setAttributionSaving(true)
    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attributionModel: systemSettings.attributionModel || 'last_click',
          attributionLookbackDays: Number(systemSettings.attributionLookbackDays || 7),
          attributionRequireVisitorMatch: Boolean(systemSettings.attributionRequireVisitorMatch),
          attributionAllowReferralFallback: Boolean(systemSettings.attributionAllowReferralFallback),
          igInsightsEnabled: Boolean(systemSettings.igInsightsEnabled),
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to save attribution settings')
      }
      setSystemSettings(data)
      loadInstagramInsights()
      alert('Attribution settings updated.')
    } catch (error: any) {
      alert(error?.message || 'Failed to save attribution settings')
    } finally {
      setAttributionSaving(false)
    }
  }

  const loadInstagramInsights = async () => {
    setInstagramInsightsLoading(true)
    setInstagramInsightsError('')
    try {
      const r = await fetch('/api/marketing/instagram-insights')
      const d = await r.json().catch(() => ({}))
      if (r.ok) {
        setInstagramInsightsData(d)
      } else {
        setInstagramInsightsData(null)
        setInstagramInsightsError(d.message || d.error || 'Failed to load Instagram insights status')
      }
    } catch (e: any) {
      setInstagramInsightsData(null)
      setInstagramInsightsError(e.message || 'Failed to load Instagram insights status')
    } finally {
      setInstagramInsightsLoading(false)
    }
  }

  const loadXInsights = async () => {
    setXInsightsLoading(true)
    try {
      const xAccounts = socialAccounts.filter((a: any) => a.platform === 'twitter' && a.accessToken)
      const results: Record<string, any> = {}
      for (const account of xAccounts) {
        try {
          const r = await fetch(`/api/marketing/x-insights?accountId=${account.id}`)
          const d = await r.json()
          if (r.ok && d.success) {
            results[account.id] = d.insights
          } else {
            results[account.id] = { error: d.error || 'Failed to fetch' }
          }
        } catch {
          results[account.id] = { error: 'Network error' }
        }
      }
      setXInsightsData(results)
    } catch {
      setXInsightsData({})
    } finally {
      setXInsightsLoading(false)
    }
  }

  const loadXInsightsForAccounts = async (accounts: any[]) => {
    setXInsightsLoading(true)
    try {
      const xAccounts = accounts.filter((a: any) => a.platform === 'twitter' && a.accessToken)
      const results: Record<string, any> = {}
      for (const account of xAccounts) {
        try {
          const r = await fetch(`/api/marketing/x-insights?accountId=${account.id}`)
          const d = await r.json()
          if (r.ok && d.success) {
            results[account.id] = d.insights
          } else {
            results[account.id] = { error: d.error || 'Failed to fetch' }
          }
        } catch {
          results[account.id] = { error: 'Network error' }
        }
      }
      setXInsightsData(results)
    } catch {
      setXInsightsData({})
    } finally {
      setXInsightsLoading(false)
    }
  }

  const loadFacebookInsights = async () => {
    setFacebookInsightsLoading(true)
    try {
      const fbAccounts = socialAccounts.filter((a: any) => a.platform === 'facebook' && a.accessToken)
      const results: Record<string, any> = {}
      for (const account of fbAccounts) {
        try {
          const r = await fetch(`/api/marketing/facebook-insights?accountId=${account.id}`)
          const d = await r.json()
          if (r.ok && d.success) {
            results[account.id] = { ...d.insights, pages: d.pages }
          } else {
            results[account.id] = { error: d.error || 'Failed to fetch' }
          }
        } catch {
          results[account.id] = { error: 'Network error' }
        }
      }
      setFacebookInsightsData(results)
    } catch {
      setFacebookInsightsData({})
    } finally {
      setFacebookInsightsLoading(false)
    }
  }

  const loadFacebookInsightsForAccounts = async (accounts: any[]) => {
    setFacebookInsightsLoading(true)
    try {
      const fbAccounts = accounts.filter((a: any) => a.platform === 'facebook' && a.accessToken)
      const results: Record<string, any> = {}
      for (const account of fbAccounts) {
        try {
          const r = await fetch(`/api/marketing/facebook-insights?accountId=${account.id}`)
          const d = await r.json()
          if (r.ok && d.success) {
            results[account.id] = { ...d.insights, pages: d.pages }
          } else {
            results[account.id] = { error: d.error || 'Failed to fetch' }
          }
        } catch {
          results[account.id] = { error: 'Network error' }
        }
      }
      setFacebookInsightsData(results)
    } catch {
      setFacebookInsightsData({})
    } finally {
      setFacebookInsightsLoading(false)
    }
  }

  // ===== Multi-platform Comments Management =====
  const loadAllComments = async () => {
    setCommentsLoading(true)
    setCommentsSelected(new Set())
    const syncErrors: { platform: string; label: string; message: string }[] = []
    const visibleAccounts = isAdmin ? socialAccounts : socialAccounts.filter(a => a.staffId === currentUser?.id)

    // Instagram
    const igAccounts = visibleAccounts.filter((a: any) => a.platform === 'instagram' && a.accessToken && a.status === 'connected')
    const igAll: any[] = []
    for (const account of igAccounts) {
      try {
        const r = await fetch(`/api/marketing/instagram-comments?accountId=${account.id}&mode=all`)
        const d = await r.json().catch(() => null)
        if (r.ok && d?.success) {
          for (const c of d.comments) {
            igAll.push({ ...c, accountId: account.id, accountUsername: account.username, staffName: account.staffName, platform: 'instagram', _timestamp: c.timestamp })
          }
        } else {
          syncErrors.push({ platform: 'instagram', label: 'Instagram', message: d?.error || `同步失败 (${r.status})` })
        }
      } catch {
        syncErrors.push({ platform: 'instagram', label: 'Instagram', message: '网络连接失败' })
      }
    }
    igAll.sort((a, b) => new Date(b._timestamp).getTime() - new Date(a._timestamp).getTime())
    // 保留实时评论（_realtime标记），避免API刷新覆盖SSE推送的数据
    setIgComments(prev => {
      const realtimeComments = prev.filter(c => c._realtime)
      return [...realtimeComments, ...igAll]
    })

    // X/Twitter
    const xAccounts = visibleAccounts.filter((a: any) => a.platform === 'twitter' && a.accessToken && a.status === 'connected')
    const xAll: any[] = []
    for (const account of xAccounts) {
      try {
        const r = await fetch(`/api/marketing/x-comments?accountId=${account.id}`)
        const d = await r.json().catch(() => null)
        if (r.ok && d?.success) {
          for (const c of d.comments) {
            xAll.push({ ...c, accountId: account.id, accountUsername: account.username, staffName: account.staffName, platform: 'twitter', _timestamp: c.createdAt })
          }
        } else {
          syncErrors.push({ platform: 'twitter', label: 'X', message: d?.error || `同步失败 (${r.status})` })
        }
      } catch {
        syncErrors.push({ platform: 'twitter', label: 'X', message: '网络连接失败' })
      }
    }
    xAll.sort((a, b) => new Date(b._timestamp).getTime() - new Date(a._timestamp).getTime())
    setXComments(prev => {
      const realtimeComments = prev.filter(c => c._realtime)
      return [...realtimeComments, ...xAll]
    })

    // Facebook
    const fbAccounts = visibleAccounts.filter((a: any) => a.platform === 'facebook' && a.accessToken && a.status === 'connected')
    const fbAll: any[] = []
    for (const account of fbAccounts) {
      try {
        const r = await fetch(`/api/marketing/facebook-comments?accountId=${account.id}&mode=all`)
        const d = await r.json().catch(() => null)
        if (r.ok && d?.success) {
          for (const c of d.comments) {
            fbAll.push({ ...c, accountId: account.id, accountUsername: account.username, staffName: account.staffName, platform: 'facebook', _timestamp: c.createdAt })
          }
        } else {
          syncErrors.push({ platform: 'facebook', label: 'Facebook', message: d?.error || `同步失败 (${r.status})` })
        }
      } catch {
        syncErrors.push({ platform: 'facebook', label: 'Facebook', message: '网络连接失败' })
      }
    }
    fbAll.sort((a, b) => new Date(b._timestamp).getTime() - new Date(a._timestamp).getTime())
    setFbComments(prev => {
      const realtimeComments = prev.filter(c => c._realtime)
      return [...realtimeComments, ...fbAll]
    })

    // Pinterest
    const ptAccounts = visibleAccounts.filter((a: any) => a.platform === 'pinterest' && a.accessToken && a.status === 'connected')
    const ptAll: any[] = []
    for (const account of ptAccounts) {
      try {
        const r = await fetch(`/api/marketing/pinterest-comments?accountId=${account.id}&mode=all`)
        const d = await r.json().catch(() => null)
        if (r.ok && d?.success) {
          for (const c of d.comments) {
            ptAll.push({ ...c, accountId: account.id, accountUsername: account.username, staffName: account.staffName, platform: 'pinterest', _timestamp: c.createdAt })
          }
        } else {
          syncErrors.push({ platform: 'pinterest', label: 'Pinterest', message: d?.error || `同步失败 (${r.status})` })
        }
      } catch {
        syncErrors.push({ platform: 'pinterest', label: 'Pinterest', message: '网络连接失败' })
      }
    }
    ptAll.sort((a, b) => new Date(b._timestamp).getTime() - new Date(a._timestamp).getTime())
    setPtComments(prev => {
      const realtimeComments = prev.filter(c => c._realtime)
      return [...realtimeComments, ...ptAll]
    })

    setCommentsSyncErrors(syncErrors)
    setCommentsLoading(false)
  }

  // ===== DM / Messages Loading =====
  const loadAllConversations = async () => {
    setDmLoading(true)
    const syncErrors: { platform: string; label: string; message: string }[] = []
    const visibleAccounts = isAdmin ? socialAccounts : socialAccounts.filter(a => a.staffId === currentUser?.id)

    // Instagram DMs
    const igAccounts = visibleAccounts.filter((a: any) => a.platform === 'instagram' && a.accessToken && a.status === 'connected')
    const igAll: any[] = []
    for (const account of igAccounts) {
      try {
        const r = await fetch(`/api/marketing/instagram-dms?accountId=${account.id}`)
        const d = await r.json().catch(() => null)
        if (r.ok && d?.success) {
          for (const conv of d.conversations) {
            igAll.push({ ...conv, accountId: account.id, accountUsername: account.username, staffName: account.staffName, platform: 'instagram' })
          }
        } else {
          syncErrors.push({ platform: 'instagram', label: 'Instagram', message: d?.error || `同步失败 (${r.status})` })
        }
      } catch {
        syncErrors.push({ platform: 'instagram', label: 'Instagram', message: '网络连接失败' })
      }
    }
    setIgConversations(prev => {
      const realtime = prev.filter(c => c._realtime)
      return [...realtime, ...igAll]
    })

    // X/Twitter DMs
    const xAccounts = visibleAccounts.filter((a: any) => a.platform === 'twitter' && a.accessToken && a.status === 'connected')
    const xAll: any[] = []
    for (const account of xAccounts) {
      try {
        const r = await fetch(`/api/marketing/x-dms?accountId=${account.id}`)
        const d = await r.json().catch(() => null)
        if (r.ok && d?.success) {
          for (const conv of d.conversations) {
            xAll.push({ ...conv, accountId: account.id, accountUsername: account.username, staffName: account.staffName, platform: 'twitter' })
          }
        } else {
          syncErrors.push({ platform: 'twitter', label: 'X', message: d?.error || `同步失败 (${r.status})` })
        }
      } catch {
        syncErrors.push({ platform: 'twitter', label: 'X', message: '网络连接失败' })
      }
    }
    setXConversations(prev => {
      const realtime = prev.filter(c => c._realtime)
      return [...realtime, ...xAll]
    })

    // Facebook DMs
    const fbAccounts = visibleAccounts.filter((a: any) => a.platform === 'facebook' && a.accessToken && a.status === 'connected')
    const fbAll: any[] = []
    for (const account of fbAccounts) {
      try {
        const r = await fetch(`/api/marketing/facebook-dms?accountId=${account.id}`)
        const d = await r.json().catch(() => null)
        if (r.ok && d?.success) {
          for (const conv of d.conversations) {
            fbAll.push({ ...conv, accountId: account.id, accountUsername: account.username, staffName: account.staffName, platform: 'facebook' })
          }
        } else {
          syncErrors.push({ platform: 'facebook', label: 'Facebook', message: d?.error || `同步失败 (${r.status})` })
        }
      } catch {
        syncErrors.push({ platform: 'facebook', label: 'Facebook', message: '网络连接失败' })
      }
    }
    setFbConversations(prev => {
      const realtime = prev.filter(c => c._realtime)
      return [...realtime, ...fbAll]
    })

    setConversationSyncErrors(syncErrors)
    setDmLoading(false)
  }

  // 统一私信会话列表
  const allConversationsUnified = useMemo(() => {
    const unified = [
      ...igConversations.map(conv => {
        const participant = conv.participants?.data?.find((p: any) => p.id !== conv.id.replace('_conv', '')) || conv.participants?.data?.[0] || conv.participants?.[0]
        return {
          ...conv,
          _platformLabel: 'Instagram',
          _platformIcon: 'instagram',
          _id: `ig_${conv.id}`,
          _lastMessage: conv.messages?.length > 0 ? conv.messages[conv.messages.length - 1].text : conv.text || '',
          _lastTimestamp: conv.updatedTime || conv.updated_time || conv.updatedAt || conv.timestamp || '',
          _participantName: participant?.name || participant?.username || conv.senderName || 'Unknown',
          _participantId: participant?.id || conv.senderId || '',
          _unread: conv.unreadCount || (conv.unread ? 1 : 0),
        }
      }),
      ...xConversations.map(conv => {
        const otherParticipantId = conv.participantIds?.find((p: string) => p !== conv.id) || conv.participantIds?.[0]
        return {
          ...conv,
          _platformLabel: 'X',
          _platformIcon: 'twitter',
          _id: `x_${conv.id}`,
          _lastMessage: conv.lastMessageText || '',
          _lastTimestamp: conv.lastMessageTimestamp || '',
          _participantName: conv.participantNames?.[otherParticipantId] || otherParticipantId || 'Unknown',
          _participantId: otherParticipantId || '',
          _unread: conv.unreadCount || 0,
        }
      }),
      ...fbConversations.map(conv => {
        const participant = conv.participants?.find((p: any) => p.id !== conv.accountId) || conv.participants?.[0]
        return {
          ...conv,
          _platformLabel: 'Facebook',
          _platformIcon: 'facebook',
          _id: `fb_${conv.id}`,
          _lastMessage: conv.messages?.length > 0 ? conv.messages[conv.messages.length - 1].text : conv.text || '',
          _lastTimestamp: conv.updatedAt || conv.updated_time || conv.timestamp || '',
          _participantName: participant?.name || participant?.username || conv.senderName || 'Unknown',
          _participantId: participant?.id || conv.senderId || '',
          _unread: conv.unreadCount || (conv.unread ? 1 : 0),
        }
      }),
    ]
    unified.sort((a, b) => new Date(b._lastTimestamp).getTime() - new Date(a._lastTimestamp).getTime())
    return unified
  }, [igConversations, xConversations, fbConversations])

  const filteredConversations = useMemo(() => {
    let result = allConversationsUnified
    if (dmPlatformFilter !== 'all') {
      result = result.filter(c => c.platform === dmPlatformFilter)
    }
    if (dmAccountFilter !== 'all') {
      result = result.filter(c => c.accountId === dmAccountFilter)
    }
    if (dmSearch.trim()) {
      const kw = dmSearch.trim().toLowerCase()
      result = result.filter(c =>
        (c._participantName || '').toLowerCase().includes(kw) ||
        (c._lastMessage || '').toLowerCase().includes(kw) ||
        (c.accountUsername || '').toLowerCase().includes(kw)
      )
    }
    return result
  }, [allConversationsUnified, dmPlatformFilter, dmAccountFilter, dmSearch])

  // 发送私信
  const handleSendDM = async () => {
    if (!activeConversation || !dmText.trim()) return
    setDmSending(true)
    try {
      const endpoint = activeConversation.platform === 'instagram' ? '/api/marketing/instagram-dms'
        : activeConversation.platform === 'twitter' ? '/api/marketing/x-dms'
        : '/api/marketing/facebook-dms'
      const r = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: activeConversation.accountId,
          recipientId: activeConversation._participantId,
          message: dmText.trim(),
        }),
      })
      const d = await r.json()
      if (r.ok && d.success) {
        setDmText('')
        // 重新加载会话以获取最新消息
        loadAllConversations()
      } else {
        alert(d.error || 'Send failed')
      }
    } catch {
      alert('Network error')
    } finally {
      setDmSending(false)
    }
  }

  const allCommentsUnified = useMemo(() => {
    // 建立 platformPostId → 发帖记录 的映射
    const postMap = new Map<string, any>()
    for (const r of socialContent) {
      if (r.platformPostId && r.status === 'published') {
        postMap.set(r.platformPostId, r)
      }
    }

    const unified = [
      ...igComments.map(c => {
        const linkedPost = c.mediaId ? postMap.get(c.mediaId) : null
        return {
          ...c,
          _platformLabel: 'Instagram', _platformIcon: 'instagram', _id: `ig_${c.id}`,
          _text: c.text, _username: c.username, _replied: c.replies?.length > 0,
          _linkedPostTitle: linkedPost?.contentTitle || '',
          _linkedPostId: linkedPost?.id || '',
          _linkedProductName: linkedPost?.productName || '',
          _linkedReferralCode: linkedPost?.referralCode || '',
          _isOurPost: !!linkedPost,
        }
      }),
      ...xComments.map(c => {
        const linkedPost = c.tweetId ? postMap.get(c.tweetId) : null
        return {
          ...c,
          _platformLabel: 'X', _platformIcon: 'twitter', _id: `x_${c.id}`,
          _text: c.text, _username: c.username, _replied: false,
          _linkedPostTitle: linkedPost?.contentTitle || '',
          _linkedPostId: linkedPost?.id || '',
          _linkedProductName: linkedPost?.productName || '',
          _linkedReferralCode: linkedPost?.referralCode || '',
          _isOurPost: !!linkedPost,
        }
      }),
      ...fbComments.map(c => {
        const linkedPost = c.postId ? postMap.get(c.postId) : null
        return {
          ...c,
          _platformLabel: 'Facebook', _platformIcon: 'facebook',
          _text: c.text, _username: c.username, _replied: c.replies?.length > 0, _id: `fb_${c.id}`,
          _linkedPostTitle: linkedPost?.contentTitle || c.postMessage || '',
          _linkedPostId: linkedPost?.id || '',
          _linkedProductName: linkedPost?.productName || '',
          _linkedReferralCode: linkedPost?.referralCode || '',
          _isOurPost: !!linkedPost,
        }
      }),
      ...ptComments.map(c => {
        const linkedPost = c.pinId ? postMap.get(c.pinId) : null
        return {
          ...c,
          _platformLabel: 'Pinterest', _platformIcon: 'pinterest',
          _text: c.text, _username: c.commenter?.username || c.username || '', _replied: false, _id: `pt_${c.id}`,
          _linkedPostTitle: linkedPost?.contentTitle || c.pinTitle || '',
          _linkedPostId: linkedPost?.id || '',
          _linkedProductName: linkedPost?.productName || '',
          _linkedReferralCode: linkedPost?.referralCode || '',
          _isOurPost: !!linkedPost,
        }
      }),
    ]
    unified.sort((a, b) => new Date(b._timestamp).getTime() - new Date(a._timestamp).getTime())
    return unified
  }, [igComments, xComments, fbComments, ptComments, socialContent])

  const filteredComments = useMemo(() => {
    let result = allCommentsUnified
    if (commentsPlatformFilter !== 'all') {
      result = result.filter(c => c.platform === commentsPlatformFilter)
    }
    if (commentsAccountFilter !== 'all') {
      result = result.filter(c => c.accountId === commentsAccountFilter)
    }
    if (commentsSearch.trim()) {
      const kw = commentsSearch.trim().toLowerCase()
      result = result.filter(c =>
        (c._text || '').toLowerCase().includes(kw) ||
        (c._username || '').toLowerCase().includes(kw) ||
        (c.accountUsername || '').toLowerCase().includes(kw)
      )
    }
    return result
  }, [allCommentsUnified, commentsPlatformFilter, commentsAccountFilter, commentsSearch])

  const handleReply = async () => {
    if (!replyTarget || !replyText.trim()) return
    setReplySending(true)
    try {
      const { commentId, accountId, platform } = replyTarget
      const endpoint = platform === 'instagram' ? '/api/marketing/instagram-comments'
        : platform === 'twitter' ? '/api/marketing/x-comments'
        : platform === 'pinterest' ? '/api/marketing/pinterest-comments'
        : '/api/marketing/facebook-comments'
      const body = platform === 'twitter'
        ? { accountId, tweetId: commentId, message: replyText.trim() }
        : platform === 'pinterest'
        ? { accountId, pinId: commentId, message: replyText.trim() }
        : { accountId, commentId, message: replyText.trim() }
      const r = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const d = await r.json()
      if (r.ok && d.success) {
        setReplyTarget(null)
        setReplyText('')
        loadAllComments()
      } else {
        alert(d.error || 'Reply failed')
      }
    } catch {
      alert('Network error')
    } finally {
      setReplySending(false)
    }
  }

  const handleDeleteComment = async (rawId: string, accountId: string, platform: string) => {
    const commentId = rawId
    if (!confirm('Delete this comment?')) return
    try {
      let url: string
      if (platform === 'instagram') {
        url = `/api/marketing/instagram-comments?accountId=${accountId}&commentId=${commentId}`
      } else if (platform === 'twitter') {
        url = `/api/marketing/x-comments?accountId=${accountId}&tweetId=${commentId}`
      } else if (platform === 'pinterest') {
        // Pinterest 需要 pinId 和 commentId
        const comment = allCommentsUnified.find(c => c._id === `pt_${commentId}`)
        const pinId = comment?.pinId || ''
        url = `/api/marketing/pinterest-comments?accountId=${accountId}&pinId=${pinId}&commentId=${commentId}`
      } else {
        url = `/api/marketing/facebook-comments?accountId=${accountId}&commentId=${commentId}`
      }
      const r = await fetch(url, { method: 'DELETE' })
      const d = await r.json()
      if (r.ok && d.success) {
        loadAllComments()
      } else {
        alert(d.error || 'Delete failed')
      }
    } catch {
      alert('Network error')
    }
  }

  const handleBatchDelete = async () => {
    if (commentsSelected.size === 0) return
    if (!confirm(`Delete ${commentsSelected.size} selected comments?`)) return
    let successCount = 0
    for (const compositeId of commentsSelected) {
      const comment = allCommentsUnified.find(c => c._id === compositeId)
      if (!comment) continue
      try {
        let url: string
        if (comment.platform === 'instagram') {
          url = `/api/marketing/instagram-comments?accountId=${comment.accountId}&commentId=${comment.id}`
        } else if (comment.platform === 'twitter') {
          url = `/api/marketing/x-comments?accountId=${comment.accountId}&tweetId=${comment.id}`
        } else if (comment.platform === 'pinterest') {
          url = `/api/marketing/pinterest-comments?accountId=${comment.accountId}&pinId=${comment.pinId || ''}&commentId=${comment.id}`
        } else {
          url = `/api/marketing/facebook-comments?accountId=${comment.accountId}&commentId=${comment.id}`
        }
        const r = await fetch(url, { method: 'DELETE' })
        if (r.ok) successCount++
      } catch { /* skip */ }
    }
    alert(`Deleted ${successCount}/${commentsSelected.size} comments`)
    setCommentsSelected(new Set())
    loadAllComments()
  }

  const toggleCommentSelect = (compositeId: string) => {
    setCommentsSelected(prev => {
      const next = new Set(prev)
      if (next.has(compositeId)) next.delete(compositeId)
      else next.add(compositeId)
      return next
    })
  }

  const toggleSelectAllComments = () => {
    if (commentsSelected.size === filteredComments.length) {
      setCommentsSelected(new Set())
    } else {
      setCommentsSelected(new Set(filteredComments.map(c => c._id)))
    }
  }

  // Keep loadIgComments alias for backward compatibility
  const loadIgComments = loadAllComments

  useEffect(() => {
    loadCurrentUser()
    loadProducts()
    loadHistory()
    loadDashboardData()
    loadStaff()
    loadSocialAccounts()
    loadSocialContent()
    loadSystemSettings()
    loadInstagramHealth()
    loadInstagramInsights()
    loadAllComments()

    const params = new URLSearchParams(window.location.search)
    
    // 平台 OAuth 回调参数映射：统一处理所有平台的登录回调
    const OAUTH_PARAM_MAP: Record<string, string> = {
      x_auth: 'X (Twitter)',
      facebook_auth: 'Facebook',
      instagram_auth: 'Instagram',
      linkedin_auth: 'LinkedIn',
      pinterest_auth: 'Pinterest',
      yt_auth: 'YouTube',
      tiktok_auth: 'TikTok',
    }

    const oauthStatus = params.get('oauth')
    const oauthPlatform = params.get('platform')

    // 统一处理所有平台专用 OAuth 回调参数
    for (const [paramKey, platformName] of Object.entries(OAUTH_PARAM_MAP)) {
      const status = params.get(paramKey)
      if (status === 'success') {
        setActiveTabSilent('social')
        // 先加载账户数据，等数据就绪后再检查在线状态，并同步最新用户信息
        ;(async () => {
          await loadSocialAccounts()
          // 短暂延迟确保 OAuth 回调路由已完成数据写入
          await new Promise(r => setTimeout(r, 500))
          await handleCheckOnlineStatus()
          // 实时拉取最新用户信息（头像、名称、主页链接）
          await syncAllUserInfo()
        })()
        setTimeout(() => {
          alert(`${platformName} account connected successfully!`)
        }, 300)
        window.history.replaceState({}, '', window.location.pathname)
        break
      } else if (status === 'cancelled') {
        alert(`${platformName} login was cancelled`)
        window.history.replaceState({}, '', window.location.pathname)
        break
      } else if (status === 'expired') {
        alert(`${platformName} login session expired. Please try again.`)
        window.history.replaceState({}, '', window.location.pathname)
        break
      } else if (status === 'error') {
        const msg = params.get('msg')
        alert(`${platformName} login failed: ${msg || 'Unknown error'}`)
        window.history.replaceState({}, '', window.location.pathname)
        break
      }
    }

    // 处理通用 OAuth 回调参数 (social-oauth 路由)
    if (oauthStatus === 'success') {
      setActiveTabSilent('social')
      const platformName = oauthPlatform ? PLATFORMS_OAUTH_CONFIG[oauthPlatform]?.name || oauthPlatform : 'Social'
      ;(async () => {
        await loadSocialAccounts()
        await new Promise(r => setTimeout(r, 500))
        await handleCheckOnlineStatus()
        // 实时拉取最新用户信息（头像、名称、主页链接）
        await syncAllUserInfo()
      })()
      setTimeout(() => {
        alert(`${platformName} account connected successfully!`)
      }, 300)
      window.history.replaceState({}, '', window.location.pathname)
    } else if (oauthStatus === 'expired') {
      alert('OAuth session expired. Please try again.')
      window.history.replaceState({}, '', window.location.pathname)
    } else if (oauthStatus === 'error') {
      const msg = params.get('msg')
      alert(`Login failed: ${msg || 'Unknown error'}`)
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  // 未读计数追踪
  useEffect(() => {
    const unrepliedComments = allCommentsUnified.filter(c => !c._replied).length
    setUnreadCommentCount(unrepliedComments)
    const totalUnreadDMs = allConversationsUnified.reduce((sum, conv) => sum + (conv._unread || 0), 0)
    setUnreadDmCount(totalUnreadDMs)
    setLastNotificationCheck(new Date())
  }, [allCommentsUnified, allConversationsUnified])

  // ===== SSE 实时事件监听（替代3分钟轮询） =====
  const sseConnectedRef = useRef(false)
  const eventSourceRef = useRef<EventSource | null>(null)
  useEffect(() => {
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null
    let reconnectAttempts = 0
    const MAX_RECONNECT_ATTEMPTS = 20

    const connectSSE = () => {
      // 关闭旧连接
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }

      try {
        const es = new EventSource('/api/marketing/events/stream?types=comment,dm,mention,workflow&platforms=instagram,twitter,facebook,pinterest,internal')
        eventSourceRef.current = es

        es.addEventListener('connected', () => {
          console.log('[SSE] Connected to real-time event stream')
          setSseConnected(true)
          sseConnectedRef.current = true
          reconnectAttempts = 0
        })

        es.onmessage = (event) => {
          try {
            const socialEvent = JSON.parse(event.data)
            console.log('[SSE] Real-time event:', socialEvent.type, socialEvent.platform, socialEvent.data)
            setSseEventCount(prev => prev + 1)
            setLastSseEvent(`${socialEvent.type}:${socialEvent.platform} @ ${new Date().toLocaleTimeString()}`)

            // 实时数据直接插入列表（不等API刷新）
            if (socialEvent.type === 'comment') {
              const c = socialEvent.data
              const realtimeComment = {
                id: c.commentId || socialEvent.id,
                text: c.text || '',
                username: c.username || '',
                userId: c.userId || c.senderId || '',
                timestamp: socialEvent.timestamp || new Date().toISOString(),
                _timestamp: socialEvent.timestamp || new Date().toISOString(),
                accountId: socialEvent.accountId || '',
                accountUsername: socialEvent.accountUsername || '',
                platform: socialEvent.platform,
                mediaId: c.mediaId || '',
                mediaPermalink: c.mediaPermalink || '',
                postId: c.postId || '',
                permalink: c.permalink || '',
                replies: [],
                _realtime: true,
              }
              if (socialEvent.platform === 'instagram') {
                setIgComments(prev => [realtimeComment, ...prev])
              } else if (socialEvent.platform === 'facebook') {
                setFbComments(prev => [realtimeComment, ...prev])
              } else if (socialEvent.platform === 'pinterest') {
                setPtComments(prev => [realtimeComment, ...prev])
              }
              // 不再立即调用loadAllComments()，避免API返回空数据覆盖实时评论
            }

            if (socialEvent.type === 'mention') {
              const c = socialEvent.data
              const realtimeComment = {
                id: c.commentId || socialEvent.id,
                text: c.text || '',
                username: c.username || '',
                userId: c.userId || '',
                timestamp: socialEvent.timestamp || new Date().toISOString(),
                _timestamp: socialEvent.timestamp || new Date().toISOString(),
                accountId: socialEvent.accountId || '',
                accountUsername: socialEvent.accountUsername || '',
                platform: socialEvent.platform,
                mediaId: c.mediaId || '',
                replies: [],
                _realtime: true,
              }
              if (socialEvent.platform === 'instagram') {
                setIgComments(prev => [realtimeComment, ...prev])
              }
            }

            // AI 一键营销工作流结果 → 自动操作面板：图片/视频进列表、切到编辑区、选中发布
            if (socialEvent.type === 'workflow') {
              const d = socialEvent.data || {}
              if (d.imageUrl) {
                setGeneratedImages(prev => [d.imageUrl, ...prev.filter((u: string) => u !== d.imageUrl)])
              }
              if (d.videoUrl) {
                setGeneratedVideos(prev => [d.videoUrl, ...prev.filter((u: string) => u !== d.videoUrl)])
                setLastGeneratedVideo(d.videoUrl)
                setPublishImageUrl(d.videoUrl)
                setRightPanelTab('media')
                setActiveTabSilent('studio')
              }
            }

            if (socialEvent.type === 'dm') {
              const c = socialEvent.data
              const realtimeConv = {
                id: c.messageId || socialEvent.id,
                senderId: c.senderId || '',
                senderName: c.senderName || c.username || '',
                recipientId: c.recipientId || '',
                text: c.text || '',
                timestamp: socialEvent.timestamp || new Date().toISOString(),
                platform: socialEvent.platform,
                accountId: socialEvent.accountId || '',
                accountUsername: socialEvent.accountUsername || '',
                unread: true,
                _realtime: true,
                // 兼容 allConversationsUnified 映射字段
                participants: [{ id: c.senderId || '', name: c.senderName || c.username || 'Unknown' }],
                messages: [{ text: c.text || '', created_time: socialEvent.timestamp || new Date().toISOString() }],
                updatedAt: socialEvent.timestamp || new Date().toISOString(),
                updated_time: socialEvent.timestamp || new Date().toISOString(),
              }
              if (socialEvent.platform === 'instagram') {
                setIgConversations(prev => [realtimeConv, ...prev])
              } else if (socialEvent.platform === 'facebook') {
                setFbConversations(prev => [realtimeConv, ...prev])
              }
              // 不再立即调用loadAllConversations()，避免API返回空数据覆盖实时消息
            }

            // 生成通知弹窗
            const platformLabel = socialEvent.platform === 'instagram' ? 'Instagram' : socialEvent.platform === 'twitter' ? 'X' : socialEvent.platform === 'pinterest' ? 'Pinterest' : 'Facebook'
            let message = ''
            if (socialEvent.type === 'comment') {
              message = `New comment from @${socialEvent.data.username || 'user'} on ${platformLabel}`
            } else if (socialEvent.type === 'dm') {
              message = `New message from ${socialEvent.data.senderName || socialEvent.data.username || 'user'} on ${platformLabel}`
            } else if (socialEvent.type === 'mention') {
              message = `New mention from @${socialEvent.data.username || 'user'} on ${platformLabel}`
            }

            if (message) {
              const notification = {
                id: socialEvent.id || Date.now().toString(),
                type: socialEvent.type,
                platform: socialEvent.platform,
                message,
                timestamp: new Date(),
              }
              setLiveNotifications(prev => [notification, ...prev].slice(0, 10))

              setTimeout(() => {
                setLiveNotifications(prev => prev.filter(n => n.id !== notification.id))
              }, 5000)
            }
          } catch (err) {
            console.error('[SSE] Parse error:', err)
          }
        }

        es.onerror = () => {
          console.log('[SSE] Connection lost, attempting reconnect...')
          setSseConnected(false)
          sseConnectedRef.current = false
          es.close()
          if (eventSourceRef.current === es) {
            eventSourceRef.current = null
          }

          reconnectAttempts++
          if (reconnectAttempts <= MAX_RECONNECT_ATTEMPTS) {
            const delay = Math.min(3000 + 2000 * reconnectAttempts, 30000)
            console.log(`[SSE] Reconnect attempt ${reconnectAttempts} in ${delay}ms`)
            reconnectTimer = setTimeout(connectSSE, delay)
          } else {
            console.log('[SSE] Max reconnect attempts reached, falling back to polling')
          }
        }
      } catch (err) {
        console.error('[SSE] Connection error:', err)
        setSseConnected(false)
        sseConnectedRef.current = false
      }
    }

    connectSSE()

    // 延迟检查在线状态
    setTimeout(() => handleCheckOnlineStatus(), 3000)

    // 每5分钟检查在线状态
    const statusInterval = setInterval(() => handleCheckOnlineStatus(), 5 * 60 * 1000)

    // 降级：如果SSE不可用，每3分钟轮询一次
    const fallbackPoll = setInterval(() => {
      if (!sseConnectedRef.current) {
        loadAllComments()
        loadAllConversations()
      }
    }, 180000)

    return () => {
      // 清理：关闭EventSource和定时器
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
      if (reconnectTimer) clearTimeout(reconnectTimer)
      clearInterval(fallbackPoll)
      clearInterval(statusInterval)
      sseConnectedRef.current = false
    }
  }, [])

  useEffect(() => {
    const account = selectedPreviewAccount
    if (!account || account.status !== 'connected') {
      setAccountLiveProfile(null)
      setAccountLiveProfileError('')
      return
    }

    const profileRouteMap: Record<string, string> = {
      instagram: 'instagram-profile',
      twitter: 'x-profile',
      facebook: 'facebook-profile',
      linkedin: 'linkedin-profile',
      youtube: 'youtube-profile',
      pinterest: 'pinterest-profile',
      tiktok: 'tiktok-profile',
    }

    const route = profileRouteMap[account.platform]
    if (!route) {
      setAccountLiveProfile(null)
      setAccountLiveProfileError('当前平台暂无资料同步接口')
      return
    }

    let cancelled = false
    const run = async () => {
      setAccountLiveProfileLoading(true)
      setAccountLiveProfileError('')
      try {
        const r = await fetch(`/api/marketing/${route}?accountId=${account.id}`)
        const d = await r.json().catch(() => ({}))
        if (cancelled) return
        if (r.ok && d.success) {
          setAccountLiveProfile(d.profile || null)
        } else {
          setAccountLiveProfile(null)
          setAccountLiveProfileError(d.error || '资料同步失败')
        }
      } catch (e: any) {
        if (!cancelled) {
          setAccountLiveProfile(null)
          setAccountLiveProfileError(e.message || '资料同步失败')
        }
      } finally {
        if (!cancelled) setAccountLiveProfileLoading(false)
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [selectedPreviewAccount, profileRefreshKey])

  const loadCurrentUser = async () => {
    try {
      const r = await fetch('/api/auth/check')
      if (r.ok) {
        const d = await r.json()
        const user = d.staff || d.user || null
        setCurrentUser(user)
        if (user) {
          const adminRoles = ['super_admin', 'admin']
          setIsAdmin(adminRoles.includes(user.role))
        }
      }
    } catch (e) {
      console.error('Failed to load current user:', e)
    }
  }

  const loadProducts = async () => {
    try {
      const r = await fetch('/api/products?pageSize=100')
      if (r.ok) {
        const d = await r.json()
        const list = Array.isArray(d) ? d : (d.items || d.products || d.data || [])
        setProducts(list)
      }
    } catch (e) {
      console.error('Failed to load products:', e)
    }
  }

  const loadHistory = async () => {
    setHistoryLoading(true)
    try {
      const r = await fetch('/api/marketing')
      if (r.ok) {
        const d = await r.json()
        setHistory(d.entries || [])
        setStats(d.stats || null)
      }
    } catch (e) {
      console.error('Failed to load history:', e)
    } finally {
      setHistoryLoading(false)
    }
  }

  const loadDashboardData = async () => {
    setDashboardLoading(true)
    try {
      const [referralRes, socialStatsRes] = await Promise.all([
        fetch('/api/referrals?stats=true'),
        fetch('/api/marketing/social-accounts?stats=true'),
      ])
      if (referralRes.ok) {
        const d = await referralRes.json()
        setReferralStats(d)
        setReferralLinks(d.allLinks || d.topLinks || [])
        setRecentClicks(d.recentClicks || [])
        setAllReferralClicks(d.allClicks || [])
      }
      if (socialStatsRes.ok) {
        const d = await socialStatsRes.json()
        setSocialAccountStats(d)
      }
    } catch (e) {
      console.error('Failed to load dashboard data:', e)
    } finally {
      setDashboardLoading(false)
    }
  }

  const loadSocialContent = async () => {
    setSocialContentLoading(true)
    try {
      const [recordsRes, statsRes] = await Promise.all([
        fetch('/api/marketing/social-content'),
        fetch('/api/marketing/social-content?stats=true'),
      ])
      if (recordsRes.ok) {
        const d = await recordsRes.json()
        setSocialContent(d.records || [])
      }
      if (statsRes.ok) {
        const d = await statsRes.json()
        setSocialContentStats(d)
      }
    } catch (e) {
      console.error('Failed to load social content:', e)
      setSocialContent([])
      setSocialContentStats(null)
    } finally {
      setSocialContentLoading(false)
    }
  }

  // 图片生成：按 Provider 提供可切换的模型列表
  const IMAGE_MODEL_LISTS: Record<string, { id: string; label: string }[]> = {
    ark: [
      { id: 'doubao-seedream-4-0-250828', label: 'Seedream 4.0（性价比）' },
      { id: 'doubao-seedream-4-5-251128', label: 'Seedream 4.5（更精细）' },
      { id: 'doubao-seedream-5-0-260128', label: 'Seedream 5.0（旗舰）' },
    ],
    minimax: [
      { id: 'image-01', label: 'MiniMax image-01' },
    ],
    openai: [
      { id: 'gpt-image-1', label: 'OpenAI gpt-image-1' },
      { id: 'dall-e-3', label: 'OpenAI DALL·E 3' },
    ],
    siliconflow: [
      { id: 'Tongyi-MAI/Z-Image-Turbo', label: '通义 Z-Image-Turbo（免费）' },
      { id: 'Tongyi-MAI/Z-Image', label: '通义 Z-Image' },
      { id: 'baidu/ERNIE-Image-Turbo', label: '百度 ERNIE-Image-Turbo' },
    ],
  }
  const getDefaultImageModel = (provider: string): string => {
    const list = IMAGE_MODEL_LISTS[provider] || IMAGE_MODEL_LISTS.siliconflow
    return list[0]?.id || ''
  }

  const loadSystemSettings = async () => {
    try {
      const r = await fetch('/api/settings')
      if (r.ok) {
        const d = await r.json()
        setSystemSettings(d)
        const p = String(d.aiImageProvider || 'siliconflow').toLowerCase()
        setImageProvider(p)
        setImageModel(String(d.aiImageModel || getDefaultImageModel(p)))
        const rp = String(d.aiImageRefProvider || p).toLowerCase()
        setImageRefProvider(rp)
        setImageRefBaseUrl(String(d.aiImageRefBaseUrl || ''))
        setImageRefModel(String(d.aiImageRefModel || (IMAGE_MODEL_LISTS[rp]?.[1]?.id || IMAGE_MODEL_LISTS[rp]?.[0]?.id || getDefaultImageModel(rp))))
        const vp = String(d.aiVideoProvider || Object.keys(d.aiVideoProviders || { ark: 1 })[0] || 'ark').toLowerCase()
        setVideoProvider(vp)
        const vModels = d.aiVideoProviders?.[vp]?.models || []
        setVideoModel(String(d.aiVideoModel || vModels[0]?.id || ''))
        const llmP = String(d.aiProvider || 'deepseek').toLowerCase()
        setCopyLLMProvider(llmP)
        setCopyLLMModel(String(d.aiModel || 'deepseek-chat'))
      }
    } catch (e) {
      console.error('Failed to load system settings:', e)
    }
  }

  const loadInstagramHealth = async () => {
    setInstagramHealthLoading(true)
    setInstagramHealthError('')
    try {
      const r = await fetch('/api/marketing/instagram-health')
      const d = await r.json().catch(() => ({}))
      if (r.ok) {
        setInstagramHealth(d)
      } else {
        setInstagramHealth(null)
        setInstagramHealthError(d.message || d.error || 'Failed to load Instagram health status')
      }
    } catch (e: any) {
      setInstagramHealth(null)
      setInstagramHealthError(e.message || 'Failed to load Instagram health status')
    } finally {
      setInstagramHealthLoading(false)
    }
  }

  const loadStaff = async () => {
    try {
      const r = await fetch('/api/staff')
      if (r.ok) {
        const d = await r.json()
        // Add 6 dummy staff members for testing the 3D carousel
        const dummyStaff: StaffMember[] = [
          { id: 'dummy-1', name: 'Alice', email: 'alice@test.com', role: 'staff', active: true, avatar: '' },
          { id: 'dummy-2', name: 'Bob', email: 'bob@test.com', role: 'staff', active: true, avatar: '' },
          { id: 'dummy-3', name: 'Charlie', email: 'charlie@test.com', role: 'staff', active: true, avatar: '' },
          { id: 'dummy-4', name: 'Diana', email: 'diana@test.com', role: 'staff', active: true, avatar: '' },
          { id: 'dummy-5', name: 'Eve', email: 'eve@test.com', role: 'staff', active: true, avatar: '' },
          { id: 'dummy-6', name: 'Frank', email: 'frank@test.com', role: 'staff', active: true, avatar: '' },
        ]
        setStaffMembers([...d, ...dummyStaff])
      }
    } catch (e) {
      console.error('Failed to load staff:', e)
    }
  }

  const loadSocialAccounts = async () => {
    try {
      const r = await fetch('/api/marketing/social-accounts', { credentials: 'include' })
      if (r.ok) {
        const d = await r.json()
        setSocialAccounts(d.accounts || [])
        // Load X/Facebook insights after accounts are loaded
        loadXInsightsForAccounts(d.accounts || [])
        loadFacebookInsightsForAccounts(d.accounts || [])
      }
    } catch {
      setSocialAccounts([])
    }
  }

  const handleGenerate = async () => {
    setGenerateError('')
    
    if (!selectedPlatform) {
      setGenerateError('Please select a platform')
      return
    }
    if (!selectedType) {
      setGenerateError('Please select a content type')
      return
    }
    if (!selectedProduct && selectedType !== 'general') {
      setGenerateError('Please select a product first')
      return
    }
    
    try {
      setGenerating(true)
      setGeneratedContent(null)
      
      // 添加 30 秒超时保护，防止请求挂起导致页面卡死
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 180000)
      
      const r = await fetch('/api/marketing/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: selectedProduct?.id,
          product: selectedProduct,
          platform: selectedPlatform,
          type: selectedType,
          tone: selectedTone,
          template: selectedTemplate,
          additionalContext,
          language,
          provider: copyLLMProvider,
          model: copyLLMModel,
        }),
        signal: controller.signal,
      })
      
      clearTimeout(timeoutId)
      
      const d = await r.json()
      
      if (d.success && d.result) {
        const raw = d.result
        
        const safe: GeneratedContent = {
          title: String(raw.title || raw.headline || 'Marketing Content'),
          content: String(raw.content || raw.body || ''),
          hashtags: Array.isArray(raw.hashtags) ? raw.hashtags.map(String) : [],
          suggestedHashtags: Array.isArray(raw.suggestedHashtags) ? raw.suggestedHashtags.map(String) : [],
          hook: String(raw.hook || ''),
          cta: String(raw.cta || ''),
          tips: Array.isArray(raw.tips) ? raw.tips.map(String) : [],
          imagePrompt: String(raw.imagePrompt || ''),
        }
        setGeneratedContent(safe)
        setImagePrompt(String(raw.imagePrompt || ''))
        setPublishCaption(safe.content)
        setPublishHashtags(safe.hashtags.map(t => `#${t}`).join(' '))
        const platformAccount = currentUserAccounts.find(a => a.platform === selectedPlatform)
        if (platformAccount) {
          setPushTargetId(platformAccount.id)
        }
        setRightPanelTab('preview')
        // 自动生成配图（文案模型会产出 imagePrompt）
        if (autoImage && raw.imagePrompt) {
          await handleGenerateImage(String(raw.imagePrompt))
        }
      } else {
        setGenerateError(d.error || 'Failed to generate content')
      }
    } catch (e: any) {
      if (e?.name === 'AbortError') {
        setGenerateError('Request timed out. AI service may be slow, please try again.')
      } else {
        setGenerateError('Failed to generate content. Please try again.')
      }
    } finally {
      setGenerating(false)
    }
  }

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const runCopyTool = async (action: NonNullable<typeof copyToolAction>) => {
    if (!generatedContent) return
    setCopyToolAction(action)
    setCopyToolResult('')
    try {
      const r = await fetch('/api/marketing/copy-tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: generatedContent.content,
          action,
          platform: platformInfo?.name || selectedPlatform,
        }),
      })
      const d = await r.json()
      if (r.ok && d.success) {
        setGeneratedContent(prev => prev ? { ...prev, content: d.text } : prev)
        setPublishCaption(d.text)
        setCopyToolResult('已更新正文，可在发布端直接使用')
      } else {
        setCopyToolResult(d.error || '微调失败')
      }
    } catch {
      setCopyToolResult('网络错误，请重试')
    } finally {
      setCopyToolAction('')
    }
  }

  const handleGenerateImage = async (promptOverride?: string) => {
    const basePrompt = (promptOverride !== undefined ? promptOverride : imagePrompt)
    const prompt = styleKeyword && styleKeyword !== 'auto'
      ? `${basePrompt}（画风：${styleKeyword}）`.trim()
      : basePrompt
    if (genMode === 'reference' && !referenceImage && !selectedProduct?.image) {
      setImageError('参考产品图生成需要参考图：请上传自定义参考图，或选择带主图的商品')
      return
    }
    if (!selectedProduct && !prompt.trim()) {
      setImageError('请先选择商品或填写图片提示词')
      return
    }
    setGeneratingImage(true)
    setImageError('')
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 180000)
      const r = await fetch('/api/marketing/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: selectedProduct?.id,
          product: selectedProduct,
          prompt,
          size: imageSize,
          count: imageCount,
          model: genMode === 'reference' ? imageRefModel : imageModel,
          mode: genMode,
          provider: genMode === 'reference' ? imageRefProvider : imageProvider,
          refProvider: genMode === 'reference' ? imageRefProvider : '',
          refBaseUrl: genMode === 'reference' ? imageRefBaseUrl : '',
          referenceImage: genMode === 'reference' ? referenceImage : '',
          referenceUrl: genMode === 'reference' && !referenceImage && selectedProduct?.image ? selectedProduct.image : '',
          platform: selectedPlatform,
        }),
        signal: controller.signal,
      })
      clearTimeout(timeoutId)
      const d = await r.json()
      if (d.success && Array.isArray(d.images)) {
        setGeneratedImages(prev => [...d.images, ...prev])
      } else {
        setImageError(d.error || '图片生成失败，请稍后重试')
      }
    } catch (e: any) {
      if (e?.name === 'AbortError') {
        setImageError('图片生成超时，请稍后重试')
      } else {
        setImageError('图片生成失败，请检查网络/API Key 后重试')
      }
    } finally {
      setGeneratingImage(false)
    }
  }

  const handleGenerateVideo = async () => {
    if (generatingVideo) return
    setVideoError('')
    const source = videoSourceUrl || referenceImage || selectedProduct?.image || generatedImages[0] || ''
    if (!source) {
      setVideoError('图生视频需要一张起始帧图片：请上传自定义图片、选择带主图的商品，或先生成一张营销图。')
      return
    }
    setGeneratingVideo(true)
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 240000)
      const r = await fetch('/api/marketing/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          referenceImage: source.startsWith('data:image/') ? source : '',
          referenceUrl: source.startsWith('data:image/') ? '' : source,
          prompt: videoPrompt,
          model: videoModel,
          provider: videoProvider,
          duration: videoDuration,
          ratio: videoRatio,
          audio: videoAudio,
        }),
        signal: controller.signal,
      })
      clearTimeout(timeoutId)
      const d = await r.json()
      if (d.success && d.video) {
        setGeneratedVideos(prev => [d.video, ...prev])
        setLastGeneratedVideo(d.video)
        setPublishImageUrl(d.video)
        setRightPanelTab('media')
      } else {
        setVideoError(d.error || '视频生成失败，请稍后重试')
      }
    } catch (e: any) {
      if (e?.name === 'AbortError') {
        setVideoError('视频生成超时（约 4 分钟）。任务可能仍在后台进行，请稍后重试。')
      } else {
        setVideoError('视频生成失败，请检查视频 API Key/模型权限后重试')
      }
    } finally {
      setGeneratingVideo(false)
    }
  }

  const handleDownloadImage = async (url: string) => {
    try {
      const r = await fetch(url)
      const blob = await r.blob()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `marketing-${Date.now()}.png`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(a.href)
    } catch {
      window.open(url, '_blank')
    }
  }

  const handleAddEditedVideo = (url: string) => {
    setGeneratedVideos(prev => [url, ...prev.filter(v => v !== url)])
    setPublishImageUrl(url)
    setRightPanelTab('publish')
  }

  const handleSave = async () => {
    if (!generatedContent) return
    setSaving(true)
    try {
      const r = await fetch('/api/marketing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: generatedContent.title,
          type: selectedType,
          platform: selectedPlatform,
          productId: selectedProduct?.id,
          productName: selectedProduct?.name || selectedProduct?.nameEn,
          content: generatedContent.content,
          hashtags: generatedContent.hashtags,
          mediaUrls: [...generatedImages, ...generatedVideos],
          imagePrompt: generatedContent.imagePrompt || imagePrompt,
          tone: selectedTone,
          status: 'draft',
        }),
      })
      if (r.ok) {
        loadHistory()
        alert('Content saved to history!')
      } else {
        alert('Failed to save content')
      }
    } catch (e) {
      alert('Failed to save content')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this content?')) return
    try {
      const r = await fetch(`/api/marketing?id=${id}`, { method: 'DELETE' })
      if (r.ok) {
        loadHistory()
      }
    } catch (e) {
      console.error('Delete failed:', e)
    }
  }

  const handleCreateReferral = async () => {
    if (!createReferralStaffId || !createReferralPlatform) {
      alert('Please select a staff member and platform')
      return
    }
    const staff = allStaffMembers.find(s => s.id === createReferralStaffId)
    if (!staff) return

    try {
      const r = await fetch('/api/referrals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          staffId: staff.id,
          staffName: staff.name,
          staffAvatar: staff.avatar,
          platform: createReferralPlatform,
        }),
      })
      if (r.ok) {
        loadDashboardData()
        setShowCreateReferral(false)
        setCreateReferralStaffId('')
        setCreateReferralPlatform('')
      } else {
        const d = await r.json().catch(() => ({}))
        alert(d.error || 'Failed to create referral link')
      }
    } catch (e) {
      console.error('Failed to create referral:', e)
      alert('Failed to create referral link')
    }
  }

  const handleDeleteReferral = async (id: string) => {
    if (!confirm('Delete this referral link?')) return
    try {
      const r = await fetch(`/api/referrals?id=${id}`, { method: 'DELETE' })
      if (r.ok) {
        loadDashboardData()
      }
    } catch (e) {
      console.error('Delete referral failed:', e)
    }
  }

  const handleConnectX = async (staffId: string) => {
    if (xAuthLock.current) return
    xAuthLock.current = true
    setXAuthLoading(true)
    
    const staff = allStaffMembers.find(s => s.id === staffId)
    
    if (!staff) {
      alert('Staff member not found')
      setXAuthLoading(false)
      xAuthLock.current = false
      return
    }

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000)
      
      const r = await fetch('/api/marketing/x-oauth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staffId: staff.id,
          staffName: staff.name,
          staffAvatar: staff.avatar,
        }),
        signal: controller.signal,
      })
      
      clearTimeout(timeoutId)
      const d = await r.json()
      if (d.success && d.authUrl) {
        window.location.href = d.authUrl
      } else {
        alert(d.error || 'Failed to initiate X login')
        setXAuthLoading(false)
        xAuthLock.current = false
      }
    } catch (e: any) {
      console.error('X auth failed:', e)
      if (e.name === 'AbortError') {
        alert('Request timed out. Please check your network connection and try again.')
      } else {
        alert('Failed to connect X account. Please check your X API configuration.')
      }
      setXAuthLoading(false)
      xAuthLock.current = false
    }
  }

  const handleConnectSocial = async () => {
    if (!connectStaffId || !connectPlatform || !connectUsername) {
      alert('Please fill all required fields')
      return
    }
    const staff = allStaffMembers.find(s => s.id === connectStaffId)
    if (!staff) return

    const platformInfo = PLATFORMS.find(p => p.id === connectPlatform)
    if (!platformInfo) return

    try {
      const r = await fetch('/api/marketing/social-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'connect',
          staffId: staff.id,
          staffName: staff.name,
          staffAvatar: staff.avatar,
          platform: platformInfo.id,
          platformName: platformInfo.name,
          username: connectUsername,
        }),
      })
      if (r.ok) {
        loadSocialAccounts()
        setShowConnectSocial(false)
        setConnectStaffId('')
        setConnectPlatform('')
        setConnectUsername('')
      } else {
        const d = await r.json()
        alert(d.error || 'Failed to connect account')
      }
    } catch (e) {
      alert('Failed to connect account')
    }
  }

  const handleShareWithAccount = (account: any) => {
    const platformInfo = PLATFORMS.find(p => p.id === account.platform)
    if (!platformInfo) return

    const shareUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}?ref=${account.staffId.slice(0, 8)}`
    let shareWindowUrl = ''

    switch (account.platform) {
      case 'twitter':
        shareWindowUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent('Check out this amazing store!')}`
        break
      case 'facebook':
        shareWindowUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`
        break
      case 'linkedin':
        shareWindowUrl = `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent('Low Flame')}`
        break
      case 'pinterest':
        shareWindowUrl = `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(shareUrl)}&description=${encodeURIComponent('Beautiful handcrafted objects')}`
        break
      case 'instagram':
        alert('Instagram direct sharing requires their API. Copy the link and share manually.')
        navigator.clipboard.writeText(shareUrl)
        return
      case 'youtube':
        alert('YouTube sharing requires video upload. Copy the link to share.')
        navigator.clipboard.writeText(shareUrl)
        return
      case 'tiktok':
        alert('TikTok sharing requires their API. Copy the link and share manually.')
        navigator.clipboard.writeText(shareUrl)
        return
    }

    if (shareWindowUrl) {
      window.open(shareWindowUrl, '_blank', 'width=600,height=400')
    }
  }

  const loadXProfileData = async (accountId: string) => {
    const account = socialAccounts.find(a => a.id === accountId)
    if (!account || account.platform !== 'twitter' || !account.accessToken) {
      setXProfileData(null)
      return
    }

    setXProfileLoading(true)
    try {
      const r = await fetch(`/api/marketing/x-profile?accountId=${accountId}`)
      if (r.ok) {
        const d = await r.json()
        if (d.success && d.profile) {
          setXProfileData(d.profile)
        } else {
          setXProfileData(null)
        }
      } else if (r.status === 401) {
        setXProfileData(null)
        console.warn('[X Profile] Token expired, user needs to re-login')
      } else {
        setXProfileData(null)
      }
    } catch (e) {
      console.error('Failed to load X profile:', e)
      setXProfileData(null)
    } finally {
      setXProfileLoading(false)
    }
  }

  useEffect(() => {
    if (phoneAccount && phoneAccount.platform === 'twitter') {
      loadXProfileData(phoneAccount.id)
      loadXTimeline(phoneAccount.id)
    } else {
      setXProfileData(null)
      setXTimeline([])
    }
  }, [phoneAccount])

  const loadXTimeline = async (accountId: string) => {
    setXTimelineLoading(true)
    try {
      const r = await fetch(`/api/marketing/x-timeline?accountId=${accountId}`)
      if (r.ok) {
        const d = await r.json()
        if (d.success && d.tweets) {
          setXTimeline(d.tweets)
        } else {
          setXTimeline([])
        }
      } else {
        setXTimeline([])
      }
    } catch (e) {
      console.error('Failed to load X timeline:', e)
      setXTimeline([])
    } finally {
      setXTimelineLoading(false)
    }
  }

  const postTweet = async () => {
    if (!phoneAccount || !xTweetText.trim()) return
    setXPosting(true)
    setXPostError('')
    setXPostSuccess(false)
    try {
      const r = await fetch('/api/marketing/x-publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: phoneAccount.id, text: xTweetText.trim() }),
      })
      const d = await r.json()
      if (r.ok && d.success) {
        setXPostSuccess(true)
        setXTweetText('')
        setPhoneTab('home')
        setTimeout(() => loadXTimeline(phoneAccount.id), 1000)
        setTimeout(() => setXPostSuccess(false), 3000)
      } else {
        setXPostError(d.error || 'Failed to post tweet')
      }
    } catch (e: any) {
      setXPostError(e.message || 'Failed to post tweet')
    } finally {
      setXPosting(false)
    }
  }

  const formatTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr)
      const now = new Date()
      const diff = (now.getTime() - date.getTime()) / 1000
      if (diff < 60) return 'now'
      if (diff < 3600) return `${Math.floor(diff / 60)}m`
      if (diff < 86400) return `${Math.floor(diff / 3600)}h`
      if (diff < 604800) return `${Math.floor(diff / 86400)}d`
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    } catch {
      return ''
    }
  }

  const formatCount = (n: number) => {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
    return n.toString()
  }

  const [socialOAuthLoading, setSocialOAuthLoading] = useState(false)

  const PLATFORMS_OAUTH_CONFIG: Record<string, { enabledKey: string; clientIdKey: string; name: string }> = {
    twitter: { enabledKey: 'xApiEnabled', clientIdKey: 'xClientId', name: 'X (Twitter)' },
    facebook: { enabledKey: 'fbApiEnabled', clientIdKey: 'fbClientId', name: 'Facebook' },
    instagram: { enabledKey: 'igApiEnabled', clientIdKey: 'igClientId', name: 'Instagram' },
    linkedin: { enabledKey: 'liApiEnabled', clientIdKey: 'liClientId', name: 'LinkedIn' },
    youtube: { enabledKey: 'ytApiEnabled', clientIdKey: 'ytClientId', name: 'YouTube' },
    pinterest: { enabledKey: 'ptApiEnabled', clientIdKey: 'ptClientId', name: 'Pinterest' },
    tiktok: { enabledKey: 'tkApiEnabled', clientIdKey: 'tkClientId', name: 'TikTok' },
  }

  const handleConnectOAuth = async (platformId: string, staffId: string, staffName: string, staffAvatar?: string, mode?: string) => {
    const config = PLATFORMS_OAUTH_CONFIG[platformId]
    if (!config) return

    if (platformId === 'twitter') {
      handleConnectX(staffId)
      return
    }

    // 使用平台专用 OAuth 路由（服务端重定向，更可靠）
    const params = new URLSearchParams({
      staffId,
      staffName,
    })
    if (staffAvatar) params.set('staffAvatar', staffAvatar)
    if (mode) params.set('mode', mode)

    window.location.href = `/api/marketing/${platformId}-oauth?${params.toString()}`
  }

  // 跳转到社交平台登录页面 - 直接触发 OAuth 登录
  const handleSocialLogin = (platformId: string) => {
    console.log('[Social Login] Clicked:', platformId, 'currentUser:', currentUser)
    const platform = PLATFORMS.find(p => p.id === platformId)
    if (!platform) return

    const existingCount = socialAccounts.filter(a => a.platform === platformId && a.status === 'connected').length
    if (existingCount > 0) {
      // 已有连接账户，显示选项弹窗
      setPlatformOptionsPlatform(platformId)
      return
    }

    if (isAdmin) {
      // Admin: 先选择员工，再触发 OAuth
      setLoginModalPlatform(platformId)
      setLoginStaffId('')
      setLoginError('')
    } else {
      // 非管理员: 直接触发 OAuth
      const staffId = currentUser?.id || ''
      const staffName = currentUser?.name || currentUser?.username || 'Current User'
      const staffAvatar = currentUser?.avatar || ''
      handleConnectOAuth(platformId, staffId, staffName, staffAvatar)
    }
  }

  // 新增账户：保留已有账户，创建新条目
  const handleAddNewAccount = (platformId: string) => {
    setPlatformOptionsPlatform('')
    const platform = PLATFORMS.find(p => p.id === platformId)
    if (!platform) return

    if (isAdmin) {
      setLoginModalPlatform(platformId)
      setLoginStaffId('')
      setLoginError('')
      // 标记为新增模式，在 submit 时传 mode=add
      setLoginMode('add')
    } else {
      const staffId = currentUser?.id || ''
      const staffName = currentUser?.name || currentUser?.username || 'Current User'
      const staffAvatar = currentUser?.avatar || ''
      handleConnectOAuth(platformId, staffId, staffName, staffAvatar, 'add')
    }
  }

  // 重新登录：替换已有账户
  const handleReLoginAccount = (platformId: string) => {
    setPlatformOptionsPlatform('')
    const platform = PLATFORMS.find(p => p.id === platformId)
    if (!platform) return

    if (isAdmin) {
      setLoginModalPlatform(platformId)
      setLoginStaffId('')
      setLoginError('')
      setLoginMode('replace')
    } else {
      const staffId = currentUser?.id || ''
      const staffName = currentUser?.name || currentUser?.username || 'Current User'
      const staffAvatar = currentUser?.avatar || ''
      handleConnectOAuth(platformId, staffId, staffName, staffAvatar, 'replace')
    }
  }

  // 关闭登录模态框
  const closeLoginModal = () => {
    setLoginModalPlatform('')
    setLoginStaffId('')
    setLoginError('')
    setLoginLoading(false)
    setLoginMode('')
  }

  // 触发 OAuth 登录（管理员模态框提交）
  const handleSocialLoginSubmit = () => {
    const platform = PLATFORMS.find(p => p.id === loginModalPlatform)
    if (!platform) return

    if (isAdmin && !loginStaffId) {
      setLoginError('Please select a staff member')
      return
    }

    const staffId = loginStaffId || currentUser?.id || ''
    const staffMember = allStaffMembers.find(s => s.id === staffId)
    const staffName = staffMember?.name || currentUser?.name || 'Staff Member'
    const staffAvatar = staffMember?.avatar || currentUser?.avatar || ''

    closeLoginModal()
    handleConnectOAuth(platform.id, staffId, staffName, staffAvatar, loginMode || undefined)
  }

  // 断开社交账户连接
  const handleDisconnectSocial = async (accountId: string) => {
    // 设置确认状态，显示确认弹窗
    setDisconnectingId(accountId)
  }

  const confirmDisconnect = async () => {
    const accountId = disconnectingId
    if (!accountId) return
    setDisconnectingId('')

    try {
      await fetch('/api/marketing/social-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'disconnect', id: accountId }),
      })
      await loadSocialAccounts()
    } catch (e) {
      console.error('Failed to disconnect:', e)
    }
  }

  const cancelDisconnect = () => {
    setDisconnectingId('')
  }

  // 同步所有账户头像
  const handleSyncAvatars = async () => {
    setSyncAvatarLoading(true)
    try {
      const res = await fetch('/api/marketing/social-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync-avatars' }),
      })
      const data = await res.json()
      if (data.success) {
        const synced = data.results.filter((r: any) => r.synced).length
        alert(`Avatar sync complete! ${synced} account(s) updated.`)
        await loadSocialAccounts()
      } else {
        alert('Avatar sync failed.')
      }
    } catch (e) {
      console.error('Failed to sync avatars:', e)
      alert('Network error during avatar sync.')
    } finally {
      setSyncAvatarLoading(false)
    }
  }

  // 检查所有账户在线状态
  const handleCheckOnlineStatus = async () => {
    try {
      const res = await fetch('/api/marketing/social-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'check-status' }),
      })
      const data = await res.json()
      if (data.success) {
        await loadSocialAccounts()
      }
    } catch (e) {
      console.error('Failed to check online status:', e)
    }
  }

  // 同步所有已连接账户的最新用户信息（头像、名称、主页链接）
  const syncAllUserInfo = async () => {
    try {
      const res = await fetch('/api/marketing/social-accounts', { credentials: 'include' })
      if (!res.ok) return
      const data = await res.json()
      const accounts = data.accounts || []
      // 为每个已连接且有 token 的账户同步用户信息
      const syncPromises = accounts
        .filter((a: any) => a.status === 'connected' && a.accessToken)
        .map((a: any) =>
          fetch('/api/marketing/social-accounts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ action: 'sync-user-info', accountId: a.id }),
          })
            .then(r => r.json())
            .catch(() => null)
        )
      await Promise.allSettled(syncPromises)
      // 同步完成后刷新列表
      await loadSocialAccounts()
    } catch (e) {
      console.error('Failed to sync user info:', e)
    }
  }

  // 点击离线头像时：直接打开个人主页，强制设为在线状态
  const handleOfflineAvatarClick = (account: any) => {
    if (editMode) return
    // 立即打开个人主页
    if (account.profileUrl) {
      window.open(account.profileUrl, '_blank')
    }
    // 强制将账户设为在线状态（用户已主动交互，视为登录行为）
    fetch('/api/marketing/social-accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ action: 'force-online', accountId: account.id }),
    })
      .then(res => res.json())
      .then(() => {
        // 同步用户信息后再刷新列表
        fetch('/api/marketing/social-accounts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ action: 'sync-user-info', accountId: account.id }),
        })
          .then(() => loadSocialAccounts())
          .catch(() => loadSocialAccounts())
      })
      .catch(e => {
        console.error('Background force online failed:', e)
        loadSocialAccounts()
      })
  }

  // AI 聊天发送
  const handleAiSend = async () => {
    if (!aiInput.trim() || aiSending) return
    const userMsg = { role: 'user' as const, content: aiInput, mode: aiMode }
    const newMessages = [...aiMessages, userMsg]
    setAiMessages(newMessages)
    setAiInput('')
    setAiSending(true)

    try {
      const modeInfo = AI_MODES.find(m => m.id === aiMode)
      const productContext = aiAttachedProduct
        ? `\n\nAttached Product: ${aiAttachedProduct.name || aiAttachedProduct.nameEn} ($${aiAttachedProduct.price})\nDescription: ${aiAttachedProduct.description || aiAttachedProduct.descriptionEn || ''}\nCategory: ${aiAttachedProduct.category || ''}`
        : ''
      const uploadContext = aiUploads.length > 0
        ? `\n\nUploaded files: ${aiUploads.map(u => u.name).join(', ')}`
        : ''

      const res = await fetch('/api/marketing/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          mode: aiMode,
          modeName: modeInfo?.name || 'General',
          product: aiAttachedProduct || null,
          uploads: aiUploads.map(u => ({ name: u.name, type: u.type })),
          extraContext: productContext + uploadContext,
        }),
      })
      const data = await res.json()
      if (data.reply) {
        const aiImages: string[] = Array.isArray(data.images) ? data.images : []
        setAiMessages(prev => [...prev, { role: 'assistant', content: data.reply, mode: aiMode, images: aiImages }])
        if (aiImages.length > 0) {
          setGeneratedImages(prev => [...aiImages, ...prev])
          if (!publishImageUrl) setPublishImageUrl(aiImages[0])
        }
      } else {
        setAiMessages(prev => [...prev, { role: 'assistant', content: data.error || 'AI request failed. Please check your AI settings.', mode: aiMode }])
      }
    } catch (e) {
      setAiMessages(prev => [...prev, { role: 'assistant', content: 'Failed to connect to AI. Please try again.', mode: aiMode }])
    } finally {
      setAiSending(false)
    }
  }

  // 文件上传处理
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
    Array.from(files).forEach(file => {
      if (file.size > 5 * 1024 * 1024) {
        alert(`${file.name} is too large (max 5MB)`)
        return
      }
      const reader = new FileReader()
      reader.onload = () => {
        setAiUploads(prev => [...prev, { name: file.name, type: file.type, dataUrl: reader.result as string }])
      }
      reader.readAsDataURL(file)
    })
    e.target.value = ''
  }

  const removeUpload = (index: number) => {
    setAiUploads(prev => prev.filter((_, i) => i !== index))
  }

  const handleDeleteHistory = async (id: string) => {
    try {
      await fetch(`/api/marketing?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
      loadHistory()
    } catch (e) {
      console.error('Failed to delete history:', e)
    }
  }

  // 从保存历史回到工作区二次编辑（文案 + 图片均可继续处理）
  const reopenHistoryEntry = (entry: MarketingEntry) => {
    setGeneratedContent({
      title: entry.title || 'Marketing Content',
      content: entry.content || '',
      hashtags: entry.hashtags || [],
      suggestedHashtags: [],
      hook: '',
      cta: '',
      tips: [],
      imagePrompt: '',
    })
    setSelectedPlatform(entry.platform)
    setSelectedType((entry.type as any) || 'social_post')
    setPublishCaption(entry.content || '')
    setPublishHashtags((entry.hashtags || []).map(t => `#${t}`).join(' '))
    const media = Array.isArray(entry.mediaUrls) ? entry.mediaUrls.filter(Boolean) : []
    setGeneratedImages(media.filter((u: string) => !/\.(mp4|mov|webm)(\?|$)/i.test(u)))
    setGeneratedVideos(media.filter((u: string) => /\.(mp4|mov|webm)(\?|$)/i.test(u)))
    setPublishImageUrl(media[0] || '')
    setImagePrompt('')
    setRightPanelTab('preview')
    setActiveTabSilent('studio')
  }

  const reopenSocialContentRecord = (record: SocialContentRecord) => {
    const tags = Array.isArray(record.hashtags)
      ? record.hashtags.map((t: string) => t.replace(/^#/, ''))
      : (record.hashtags || '').split(/\s+/).filter(Boolean).map(t => t.replace(/^#/, ''))
    const media = [record.mediaUrl].filter(Boolean) as string[]
    setGeneratedContent({
      title: record.contentTitle || 'Marketing Content',
      content: record.contentBody || '',
      hashtags: tags,
      suggestedHashtags: [],
      hook: '',
      cta: '',
      tips: [],
      imagePrompt: '',
    })
    setSelectedPlatform(record.platform)
    setSelectedType((record.contentType as any) || 'social_post')
    setPublishCaption(record.contentBody || '')
    setPublishHashtags(tags.map(t => `#${t}`).join(' '))
    setGeneratedImages(media.filter(u => !/\.(mp4|mov|webm)(\?|$)/i.test(u)))
    setGeneratedVideos(media.filter(u => /\.(mp4|mov|webm)(\?|$)/i.test(u)))
    setPublishImageUrl(media[0] || '')
    setImagePrompt('')
    if (record.productId) {
      const product = products.find((p: any) => p.id === record.productId)
      if (product) setSelectedProduct(product)
    }
    setRightPanelTab('publish')
    setActiveTabSilent('studio')
  }

  const platformInfo = PLATFORMS.find(p => p.id === selectedPlatform)

  return (
    <div
      className="p-6 relative overflow-hidden"
      style={{ backgroundColor: '#000', margin: '12px', minHeight: 'calc(100vh - 24px)', borderRadius: '18px' }}
    >
      {/* Deep-space backdrop: stars + aurora + nebula + drifting dust */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" style={{ zIndex: 0 }} aria-hidden>
        {/* Nebula orbs */}
        <span className="absolute" style={{ width: 460, height: 460, left: '-10%', top: '-14%', borderRadius: '50%', background: 'radial-gradient(circle, color-mix(in srgb, var(--adm-accent) 12%, transparent), transparent 70%)', filter: 'blur(34px)', opacity: 0.85 }} />
        <span className="absolute" style={{ width: 520, height: 520, right: '-12%', top: '28%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(56,189,248,0.08), transparent 70%)', filter: 'blur(40px)' }} />
        <span className="absolute" style={{ width: 480, height: 480, left: '16%', bottom: '-18%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(217,70,239,0.07), transparent 70%)', filter: 'blur(40px)' }} />
        {/* Aurora sweep */}
        <span className="absolute" style={{ left: '-40%', top: '10%', width: '120%', height: 220, background: 'linear-gradient(90deg, transparent, color-mix(in srgb, var(--adm-accent) 10%, transparent) 28%, rgba(56,189,248,0.07) 48%, color-mix(in srgb, var(--adm-accent) 10%, transparent) 68%, transparent)', filter: 'blur(30px)', animation: 'aurora-sweep 26s ease-in-out infinite' }} />
        {/* Twinkle stars */}
        {Array.from({ length: 120 }).map((_, i) => {
          const left = (i * 37.7 + 11.3) % 100
          const top = (i * 53.3 + 7.7) % 100
          const size = 1 + ((i * 7) % 3)
          const delay = (i % 14) * 0.5
          const dur = 2 + ((i * 13) % 5)
          const warm = i % 11 === 0
          const blue = i % 7 === 0
          return (
            <span
              key={i}
              style={{
                position: 'absolute',
                left: `${left}%`,
                top: `${top}%`,
                width: `${size}px`,
                height: `${size}px`,
                borderRadius: '50%',
                background: warm ? 'rgba(255,224,178,0.95)' : blue ? 'rgba(170,200,255,0.95)' : 'rgba(255,255,255,0.9)',
                boxShadow: warm ? '0 0 8px rgba(255,190,120,0.7)' : blue ? '0 0 8px rgba(150,190,255,0.7)' : '0 0 8px 1px color-mix(in srgb, var(--adm-accent) 60%, transparent)',
                opacity: 0.3,
                animation: `twinkle ${dur}s ease-in-out ${delay}s infinite`,
              }}
            />
          )
        })}
        {/* Cross-sparkle stars */}
        {[5, 22, 41, 63, 88, 104].map((p, k) => (
          <span key={k} className="absolute" style={{ left: `${(p * 7.3 + 8.1) % 100}%`, top: `${(p * 11.9 + 21.3) % 100}%`, width: 5, height: 5, background: 'radial-gradient(circle, #fff 0 1px, transparent 1.5px), linear-gradient(90deg, transparent 42%, rgba(255,255,255,0.95) 50%, transparent 58%), linear-gradient(0deg, transparent 42%, rgba(255,255,255,0.95) 50%, transparent 58%)', animation: `twinkle ${2.4 + k * 0.5}s ease-in-out ${k * 0.8}s infinite` }} />
        ))}
        {/* Drifting dust */}
        <div className="absolute inset-0" style={{ animation: 'star-drift 120s linear infinite alternate' }}>
          {Array.from({ length: 50 }).map((_, i) => (
            <span key={i} style={{ position: 'absolute', left: `${(i * 61.7 + 23.9) % 100}%`, top: `${(i * 37.3 + 51.1) % 100}%`, width: 1.5, height: 1.5, borderRadius: '50%', background: 'rgba(200,215,255,0.5)', boxShadow: '0 0 4px rgba(180,200,255,0.5)', opacity: 0.18, animation: `twinkle ${3 + ((i * 17) % 4)}s ease-in-out ${(i % 9) * 0.6}s infinite` }} />
          ))}
        </div>
        {/* Vignette */}
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 40%, transparent 55%, rgba(0,0,0,0.5) 100%)' }} />
      </div>
      <style>{`
        @keyframes pulse-ring {
          0% { transform: scale(0.9); opacity: 0.3; }
          50% { transform: scale(1.08); opacity: 1; }
          100% { transform: scale(0.9); opacity: 0.3; }
        }
        @keyframes spin-ring {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes twinkle {
          0%, 100% { opacity: 0.12; transform: scale(0.8); }
          50% { opacity: 0.9; transform: scale(1.15); }
        }
        @keyframes shimmer-line {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes scan-sweep {
          0% { transform: translateY(-110%); }
          100% { transform: translateY(330%); }
        }
        @keyframes menu-pop {
          0% { transform: translateY(6px) scale(0.96); opacity: 0; }
          100% { transform: translateY(0) scale(1); opacity: 1; }
        }
        @keyframes account-in {
          0% { transform: translateY(8px) scale(0.97); opacity: 0; }
          100% { transform: translateY(0) scale(1); opacity: 1; }
        }
        @keyframes ring-spin {
          0% { transform: rotateY(0deg); }
          100% { transform: rotateY(360deg); }
        }
        @keyframes float-bob {
          0%, 100% { transform: translateY(-3px); }
          50% { transform: translateY(4px); }
        }
        @keyframes avatar-in {
          0% { transform: scale(0.4); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes star-drift {
          0% { transform: translate(0, 0); }
          100% { transform: translate(-70px, 28px); }
        }
        @keyframes aurora-sweep {
          0%, 100% { transform: translateX(-12%) rotate(8deg); opacity: 0.35; }
          50% { transform: translateX(10%) rotate(8deg); opacity: 0.75; }
        }
      `}</style>
      {/* 实时通知弹窗（固定在右上角） */}
      <div className="fixed top-4 right-4 z-50 space-y-2" style={{ maxWidth: '380px' }}>
        {liveNotifications.map((notification) => {
          const platformColor = notification.platform === 'instagram' ? '#E4405F' : notification.platform === 'twitter' ? '#1DA1F2' : notification.platform === 'pinterest' ? '#E60023' : '#1877F2'
          const typeIcon = notification.type === 'comment' ? '💬' : notification.type === 'dm' ? '✉️' : notification.type === 'mention' ? '📢' : '🔔'
          return (
            <div
              key={notification.id}
              className="animate-slide-in rounded-xl p-3 shadow-lg flex items-start gap-3"
              style={{
                backgroundColor: 'var(--adm-card)',
                border: `1px solid ${platformColor}`,
                borderLeft: `4px solid ${platformColor}`,
                boxShadow: `0 4px 12px rgba(0,0,0,0.15)`,
              }}
            >
              <span className="text-lg">{typeIcon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium" style={{ color: 'var(--adm-text)' }}>{notification.message}</p>
                <p className="text-[10px] mt-0.5" style={{ color: 'var(--adm-text-secondary)' }}>{notification.timestamp.toLocaleTimeString()}</p>
              </div>
              <button
                onClick={() => setLiveNotifications(prev => prev.filter(n => n.id !== notification.id))}
                className="text-xs p-1 rounded" style={{ color: 'var(--adm-text-secondary)' }}
              >✕</button>
            </div>
          )
        })}
      </div>

      <div className="w-full">
        {/* 草稿保存成功提示 */}
        {draftToast && (
          <div
            className="fixed top-5 left-1/2 -translate-x-1/2 z-[999] px-4 py-2.5 rounded-xl text-sm font-medium"
            style={{ backgroundColor: 'var(--adm-accent)', color: 'var(--adm-accent-text)', boxShadow: '0 10px 36px rgba(0,0,0,0.35)' }}
          >
            {draftToast}
          </div>
        )}

        {/* 离开页面确认：保存到草稿箱 / 不保存 / 取消 */}
        {leaveModal && (
          <div
            className="fixed inset-0 z-[998] flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
          >
            <div
              className="rounded-2xl p-5 w-[420px] max-w-full"
              style={{ backgroundColor: 'var(--adm-card)', border: '1px solid var(--adm-border)', boxShadow: '0 28px 70px rgba(0,0,0,0.5)' }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Bookmark size={18} style={{ color: 'var(--adm-accent)' }} />
                <h3 className="text-base font-bold" style={{ color: 'var(--adm-text)' }}>有未保存的创作进度</h3>
              </div>
              <p className="text-sm mb-5 leading-relaxed" style={{ color: 'var(--adm-text-secondary)' }}>
                当前有文案 / 图片 / 视频等创作内容尚未保存。是否先保存到草稿箱（历史记录）再离开？
              </p>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => closeLeaveModal('cancel')}
                  className="px-4 py-2 rounded-lg text-sm font-medium"
                  style={{ backgroundColor: 'var(--adm-input)', color: 'var(--adm-text-secondary)', border: '1px solid var(--adm-border)' }}
                >
                  取消
                </button>
                <button
                  onClick={() => closeLeaveModal('discard')}
                  className="px-4 py-2 rounded-lg text-sm font-medium"
                  style={{ backgroundColor: 'var(--adm-input)', color: '#DC2626', border: '1px solid var(--adm-input-border)' }}
                >
                  不保存离开
                </button>
                <button
                  onClick={() => closeLeaveModal('save')}
                  className="px-4 py-2 rounded-lg text-sm font-semibold"
                  style={{ backgroundColor: 'var(--adm-accent)', color: 'var(--adm-accent-text)' }}
                >
                  保存并离开
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Full-width dashboard header */}
        <div
          className="sticky top-0 z-30 -mx-2 mb-5 px-2 pt-1 pb-3 flex items-center justify-between flex-wrap gap-3"
          style={{
            background: 'linear-gradient(180deg, var(--adm-bg) 68%, transparent)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            borderBottom: '1px solid color-mix(in srgb, var(--adm-accent) 20%, transparent)',
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: 'var(--adm-accent-bg)', boxShadow: '0 0 22px color-mix(in srgb, var(--adm-accent) 28%, transparent)' }}
            >
              <Megaphone size={24} style={{ color: 'var(--adm-accent)' }} />
            </div>
            <div>
              <h1 className="text-2xl font-bold" style={{ color: 'var(--adm-text)' }}>Marketing Center</h1>
              <p className="text-sm" style={{ color: 'var(--adm-text-secondary)' }}>Track campaigns, generate content, and boost conversions</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono px-2 py-1 rounded-md" style={{ backgroundColor: 'color-mix(in srgb, var(--adm-accent) 12%, transparent)', color: 'var(--adm-text-secondary)' }}>
              OPERATIONS CONSOLE
            </span>
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full"
              style={{
                backgroundColor: sseConnected ? 'color-mix(in srgb, #22c55e 14%, transparent)' : 'var(--adm-input)',
                border: `1px solid ${sseConnected ? 'rgba(34,197,94,0.45)' : 'var(--adm-border)'}`,
              }}
            >
              <span className={`w-2 h-2 rounded-full ${sseConnected ? 'animate-pulse' : ''}`} style={{ backgroundColor: sseConnected ? '#22c55e' : '#9ca3af', boxShadow: sseConnected ? '0 0 8px #22c55e' : 'none' }} />
              <span className="text-xs font-semibold" style={{ color: sseConnected ? '#22c55e' : 'var(--adm-text-secondary)' }}>{sseConnected ? 'LIVE' : 'POLLING'}</span>
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-1 mb-6 p-1 rounded-xl" style={{ backgroundColor: 'var(--adm-card)', border: '1px solid var(--adm-border)', width: 'fit-content' }}>
          <button
            onClick={() => setActiveTab('dashboard')}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2"
            style={{
              backgroundColor: activeTab === 'dashboard' ? 'var(--adm-accent)' : 'transparent',
              color: activeTab === 'dashboard' ? 'var(--adm-accent-text)' : 'var(--adm-text-secondary)',
            }}
          >
            <BarChart3 size={16} /> Dashboard
          </button>
          <button
            onClick={() => setActiveTab('projects')}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2"
            style={{
              backgroundColor: activeTab === 'projects' ? 'var(--adm-accent)' : 'transparent',
              color: activeTab === 'projects' ? 'var(--adm-accent-text)' : 'var(--adm-text-secondary)',
            }}
          >
            <Layers size={16} /> Projects
          </button>
          <button
            onClick={() => setActiveTab('studio')}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2"
            style={{
              backgroundColor: activeTab === 'studio' ? 'var(--adm-accent)' : 'transparent',
              color: activeTab === 'studio' ? 'var(--adm-accent-text)' : 'var(--adm-text-secondary)',
            }}
          >
            <Wand2 size={16} /> Content Studio
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2"
            style={{
              backgroundColor: activeTab === 'templates' ? 'var(--adm-accent)' : 'transparent',
              color: activeTab === 'templates' ? 'var(--adm-accent-text)' : 'var(--adm-text-secondary)',
            }}
          >
            <LayoutTemplate size={16} /> Templates
          </button>
          <button
            onClick={() => setActiveTab('social')}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2"
            style={{
              backgroundColor: activeTab === 'social' ? 'var(--adm-accent)' : 'transparent',
              color: activeTab === 'social' ? 'var(--adm-accent-text)' : 'var(--adm-text-secondary)',
            }}
          >
            <Globe2 size={16} /> Social Accounts
          </button>
          <button
            onClick={() => { setActiveTab('comments'); if (allCommentsUnified.length === 0) loadAllComments() }}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2"
            style={{
              backgroundColor: activeTab === 'comments' ? 'var(--adm-accent)' : 'transparent',
              color: activeTab === 'comments' ? 'var(--adm-accent-text)' : 'var(--adm-text-secondary)',
            }}
          >
            <MessageSquare size={16} /> Comments
            {unreadCommentCount > 0 && (
              <span className="text-xs px-1.5 py-0.5 rounded-full font-bold animate-pulse" style={{ backgroundColor: '#FEE2E2', color: '#991B1B' }}>
                {unreadCommentCount} unreplied
              </span>
            )}
            {allCommentsUnified.length > 0 && unreadCommentCount === 0 && (
              <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'var(--adm-accent-bg)', color: 'var(--adm-accent)' }}>
                {allCommentsUnified.length}
              </span>
            )}
          </button>
          <button
            onClick={() => { setActiveTab('messages'); if (allConversationsUnified.length === 0) loadAllConversations() }}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2"
            style={{
              backgroundColor: activeTab === 'messages' ? 'var(--adm-accent)' : 'transparent',
              color: activeTab === 'messages' ? 'var(--adm-accent-text)' : 'var(--adm-text-secondary)',
            }}
          >
            <Mail size={16} /> Messages
            {unreadDmCount > 0 && (
              <span className="text-xs px-1.5 py-0.5 rounded-full font-bold animate-pulse" style={{ backgroundColor: '#FEE2E2', color: '#991B1B' }}>
                {unreadDmCount} new
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('referrals')}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2"
            style={{
              backgroundColor: activeTab === 'referrals' ? 'var(--adm-accent)' : 'transparent',
              color: activeTab === 'referrals' ? 'var(--adm-accent-text)' : 'var(--adm-text-secondary)',
            }}
          >
            <Link2 size={16} /> Publish History
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2"
            style={{
              backgroundColor: activeTab === 'history' ? 'var(--adm-accent)' : 'transparent',
              color: activeTab === 'history' ? 'var(--adm-accent-text)' : 'var(--adm-text-secondary)',
            }}
          >
            <History size={16} /> History
            {stats?.total > 0 && (
              <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'var(--adm-accent-bg)', color: 'var(--adm-accent)' }}>
                {stats.total}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('ai-chat')}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2"
            style={{
              backgroundColor: activeTab === 'ai-chat' ? 'var(--adm-accent)' : 'transparent',
              color: activeTab === 'ai-chat' ? 'var(--adm-accent-text)' : 'var(--adm-text-secondary)',
            }}
          >
            <Bot size={16} /> AI Chat
          </button>
        </div>

        {activeTab === 'projects' && (
          <ProjectsTab
            socialAccounts={socialAccounts}
            staffMembers={allStaffMembers}
            currentUser={currentUser}
            isAdmin={isAdmin}
            onLogin={handleSocialLogin}
            onDisconnect={handleDisconnectSocial}
            onShare={handleShareWithAccount}
            selectedAccount={selectedAccount}
            onAccountChange={setSelectedAccount}
          />
        )}

        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Header with staff selector + platform logos */}
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h2 className="text-xl font-bold" style={{ color: 'var(--adm-text)' }}>Marketing Dashboard</h2>
                  <p className="text-sm" style={{ color: 'var(--adm-text-secondary)' }}>Track your campaign performance across all platforms</p>
                </div>
                <div className="flex items-center gap-2">
                  {(['today', 'week', 'month'] as const).map(range => (
                    <button
                      key={range}
                      onClick={() => setTimeRange(range)}
                      className="px-4 py-2 text-sm rounded-lg font-medium transition-all"
                      style={{
                        backgroundColor: timeRange === range ? 'var(--adm-accent)' : 'var(--adm-input)',
                        color: timeRange === range ? 'var(--adm-accent-text)' : 'var(--adm-text-secondary)',
                      }}
                    >
                      {range === 'today' ? 'Today' : range === 'week' ? 'This Week' : 'This Month'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Staff Selector + Platform Logos - Wheel/Dial Selector */}
              <div className="rounded-2xl p-4 relative" style={{ backgroundColor: 'var(--adm-card)', border: '1px solid var(--adm-border)' }}>
                {/* Tech HUD frame decorations */}
                <div className="pointer-events-none absolute inset-0 rounded-2xl overflow-hidden" aria-hidden>
                  <span className="absolute" style={{ top: 10, left: 10, width: 18, height: 18, borderTop: '2px solid color-mix(in srgb, var(--adm-accent) 65%, transparent)', borderLeft: '2px solid color-mix(in srgb, var(--adm-accent) 65%, transparent)', borderTopLeftRadius: 6 }} />
                  <span className="absolute" style={{ top: 10, right: 10, width: 18, height: 18, borderTop: '2px solid color-mix(in srgb, var(--adm-accent) 65%, transparent)', borderRight: '2px solid color-mix(in srgb, var(--adm-accent) 65%, transparent)', borderTopRightRadius: 6 }} />
                  <span className="absolute" style={{ bottom: 10, left: 10, width: 18, height: 18, borderBottom: '2px solid color-mix(in srgb, var(--adm-accent) 65%, transparent)', borderLeft: '2px solid color-mix(in srgb, var(--adm-accent) 65%, transparent)', borderBottomLeftRadius: 6 }} />
                  <span className="absolute" style={{ bottom: 10, right: 10, width: 18, height: 18, borderBottom: '2px solid color-mix(in srgb, var(--adm-accent) 65%, transparent)', borderRight: '2px solid color-mix(in srgb, var(--adm-accent) 65%, transparent)', borderBottomRightRadius: 6 }} />
                  <span className="absolute left-0 right-0" style={{ top: 0, height: '45%', background: 'linear-gradient(180deg, transparent, color-mix(in srgb, var(--adm-accent) 9%, transparent) 80%, transparent)', animation: 'scan-sweep 6s linear infinite', opacity: 0.7 }} />
                </div>
                <div className="flex gap-4">
                  {/* Left Column: Staff Wheel */}
                  <div
                    className="w-[45%] flex-shrink-0"
                    ref={(el) => {
                      staffWheelZoneRef.current = el
                      if (el && !el.dataset.staffWheelBound) {
                        el.dataset.staffWheelBound = '1'
                        el.addEventListener('wheel', handleStaffWheelZone, { passive: false })
                      }
                    }}
                  >
                    {(() => {
                      const connected = isAdmin
                        ? socialAccounts.filter(a => a.status === 'connected')
                        : socialAccounts.filter(a => a.staffId === currentUser?.id && a.status === 'connected')
                      const staffList: { staffId: string; staffName: string; staffAvatar?: string }[] = allStaffMembers
                        .filter(s => isAdmin ? true : (s.id === currentUser?.id))
                        .map(s => ({ staffId: s.id, staffName: s.name, staffAvatar: s.avatar }))
                      const visualIdx = staffCarouselFocusIdx

                      const handleStaffScroll = () => {
                        if (!staffCarouselRef.current) return
                        const el = staffCarouselRef.current
                        const center = el.scrollLeft + el.offsetWidth / 2
                        const items = el.children
                        let closest = 0
                        let closestDist = Infinity
                        for (let i = 0; i < items.length; i++) {
                          const item = items[i] as HTMLElement
                          const itemCenter = item.offsetLeft + item.offsetWidth / 2
                          const dist = Math.abs(center - itemCenter)
                          if (dist < closestDist) {
                            closestDist = dist
                            closest = i
                          }
                        }
                        setStaffCarouselFocusIdx(closest)
                        if (staffScrollTimeoutRef.current) clearTimeout(staffScrollTimeoutRef.current)
                        staffScrollTimeoutRef.current = setTimeout(() => {
                          const item = staffList[closest]
                          if (!item) return
                          const staffAccounts = connected.filter(a => a.staffId === item.staffId)
                          if (staffAccounts.length === 0) return
                          const currentPlatform = selectedAccount?.platform
                          const a = currentPlatform
                            ? (staffAccounts.find(a => a.platform === currentPlatform) || staffAccounts[0])
                            : staffAccounts[0]
                          setSelectedAccount({
                            staffId: a.staffId,
                            staffName: a.staffName,
                            platform: a.platform,
                            accountId: a.id,
                            accountUsername: a.username,
                          })
                        }, 150)
                      }
                      const snapToNearest = (el: HTMLElement, { overshoot = false } = {}) => {
                        const center = el.scrollLeft + el.offsetWidth / 2
                        const items = el.children
                        let closest = 0
                        let closestDist = Infinity
                        for (let i = 0; i < items.length; i++) {
                          const item = items[i] as HTMLElement
                          const itemCenter = item.offsetLeft + item.offsetWidth / 2
                          const dist = Math.abs(center - itemCenter)
                          if (dist < closestDist) {
                            closestDist = dist
                            closest = i
                          }
                        }
                        const target = (items[closest] as HTMLElement)
                        if (target) {
                          const targetCenter = target.offsetLeft + target.offsetWidth / 2
                          const targetScroll = targetCenter - el.offsetWidth / 2
                          const startScroll = el.scrollLeft
                          const diff = targetScroll - startScroll
                          const duration = Math.min(Math.abs(diff) * 0.6, 400)
                          const startTime = performance.now()
                          const animateSnap = (now: number) => {
                            const elapsed = now - startTime
                            const progress = Math.min(elapsed / duration, 1)
                            // Gear-like snap: slight overshoot for gear click feel
                            let ease = 1 - Math.pow(1 - progress, 3)
                            if (overshoot) {
                              // Overshoot ease: bounce past then settle
                              ease = progress < 0.7
                                ? 1 - Math.pow(1 - progress / 0.7, 3)
                                : 1 + 0.12 * (1 - Math.pow((progress - 0.7) / 0.3, 2))
                            }
                            el.scrollLeft = startScroll + diff * ease
                            if (progress < 1) {
                              requestAnimationFrame(animateSnap)
                            }
                          }
                          requestAnimationFrame(animateSnap)
                        }
                      }
                      // Get the nearest item center for gear notch resistance
                      const getNearestItemCenter = (el: HTMLElement, scrollPos: number) => {
                        const items = el.children
                        const viewCenter = scrollPos + el.offsetWidth / 2
                        let closest = 0
                        let closestDist = Infinity
                        for (let i = 0; i < items.length; i++) {
                          const item = items[i] as HTMLElement
                          const itemCenter = item.offsetLeft + item.offsetWidth / 2
                          const dist = Math.abs(viewCenter - itemCenter)
                          if (dist < closestDist) {
                            closestDist = dist
                            closest = i
                          }
                        }
                        const target = items[closest] as HTMLElement
                        return {
                          scroll: target.offsetLeft + target.offsetWidth / 2 - el.offsetWidth / 2,
                          dist: closestDist,
                        }
                      }

                      return (
                        <div className="relative">
                          {/* Wheel label */}
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: 'var(--adm-accent)', boxShadow: '0 0 8px var(--adm-accent)' }} />
                              <span className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--adm-text-secondary)' }}>Staff Wheel</span>
                              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded" style={{ backgroundColor: 'color-mix(in srgb, var(--adm-accent) 12%, transparent)', color: 'var(--adm-accent)' }}>SYS.WHEEL-01</span>
                            </div>
                            {selectedAccount && (
                              <button onClick={() => { setSelectedAccount(null); setStaffCarouselFocusIdx(0) }} className="text-xs px-2 py-0.5 rounded hover:opacity-70" style={{ color: 'var(--adm-text-secondary)', backgroundColor: 'var(--adm-input)' }}>
                                Clear
                              </button>
                            )}
                          </div>

                          {/* Fixed "All Staff" button + 3D Cover Flow track */}
                          <div className="flex items-start gap-3">
                            {/* Fixed All Staff button (always visible) */}
                            <div
                              onClick={() => { setSelectedAccount(null); setStaffCarouselFocusIdx(0) }}
                              className="flex flex-col items-center gap-2 cursor-pointer flex-shrink-0 select-none group"
                              style={{
                                width: '70px',
                                padding: '10px 8px',
                                paddingTop: '38px',
                                transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                              }}
                            >
                              <div
                                onMouseEnter={() => setAllStaffHover(true)}
                                onMouseLeave={() => setAllStaffHover(false)}
                                className="rounded-full flex items-center justify-center overflow-hidden transition-transform duration-300 group-hover:scale-110"
                                style={{
                                  width: '52px',
                                  height: '52px',
                                  borderRadius: '50%',
                                  border: allStaffHover
                                    ? '2px solid var(--adm-accent)'
                                    : '2px dashed color-mix(in srgb, var(--adm-accent) 40%, transparent)',
                                  backgroundColor: 'color-mix(in srgb, var(--adm-card) 97%, transparent)',
                                  boxShadow: allStaffHover
                                    ? '0 0 0 3px color-mix(in srgb, var(--adm-accent) 22%, transparent), 0 0 20px color-mix(in srgb, var(--adm-accent) 42%, transparent)'
                                    : '0 2px 8px rgba(0,0,0,0.10)',
                                  opacity: selectedAccount ? 0.5 : (allStaffHover ? 0.95 : 0.6),
                                  filter: selectedAccount ? 'grayscale(0.6)' : (allStaffHover ? 'grayscale(0.4)' : 'grayscale(0.85)'),
                                  transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                                }}
                              >
                                <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: 'var(--adm-accent-bg)' }}>
                                  <Globe2 size={22} style={{ color: 'var(--adm-accent)' }} />
                                </div>
                              </div>
                              <span
                                className="text-center truncate font-medium"
                                style={{
                                  fontSize: '10px',
                                  color: 'var(--adm-text-secondary)',
                                  maxWidth: '70px',
                                  fontWeight: 400,
                                  opacity: selectedAccount ? 0.6 : 0.35,
                                  transition: 'all 0.25s ease',
                                  marginTop: '3px',
                                }}
                              >
                                All Staff
                              </span>
                            </div>

                            {/* 3D Cover Flow track */}
                            <div
                              className="relative flex-1 min-w-0 rounded-2xl overflow-hidden"
                              style={{
                                padding: '24px 10px',
                                background: 'radial-gradient(ellipse 85% 130% at 50% 50%, color-mix(in srgb, var(--adm-accent) 8%, transparent), transparent 74%)',
                              }}
                            >
                              {/* The scrollable 3D carousel */}
                              <div
                                ref={(el) => { staffCarouselRef.current = el }}
                                className="flex items-center overflow-x-auto"
                                style={{
                                  scrollbarWidth: 'none',
                                  msOverflowStyle: 'none',
                                  gap: '0px',
                                  WebkitOverflowScrolling: 'touch',
                                  overscrollBehavior: 'contain',
                                  padding: '8px 56px',
                                  minHeight: '150px',
                                  cursor: 'grab',
                                  userSelect: 'none',
                                  WebkitMaskImage: 'linear-gradient(90deg, transparent 0%, black 7%, black 93%, transparent 100%)',
                                  maskImage: 'linear-gradient(90deg, transparent 0%, black 7%, black 93%, transparent 100%)',
                                }}
                                onScroll={handleStaffScroll}
                                onMouseDown={(e) => {
                                  const el = staffCarouselRef.current
                                  if (!el) return
                                  let startX = e.clientX
                                  let startScroll = el.scrollLeft
                                  let lastX = e.clientX
                                  let lastTime = Date.now()
                                  let velocity = 0
                                  let momentumId: number | null = null
                                  const onMove = (ev: MouseEvent) => {
                                    if (momentumId) { cancelAnimationFrame(momentumId); momentumId = null }
                                    el.style.cursor = 'grabbing'
                                    const dx = ev.clientX - startX
                                    const rawScroll = startScroll - dx
                                    // Gear notch resistance: pull toward nearest item center
                                    const notchRange = 35
                                    const nearest = getNearestItemCenter(el, rawScroll)
                                    let finalScroll = rawScroll
                                    if (nearest.dist < notchRange) {
                                      const resistance = (1 - nearest.dist / notchRange) * 0.35
                                      finalScroll = rawScroll * (1 - resistance) + nearest.scroll * resistance
                                    }
                                    el.scrollLeft = finalScroll
                                    const now = Date.now()
                                    const dt = now - lastTime
                                    if (dt > 0) {
                                      velocity = (ev.clientX - lastX) / dt * 16
                                      lastX = ev.clientX
                                      lastTime = now
                                    }
                                  }
                                  const onUp = () => {
                                    document.removeEventListener('mousemove', onMove)
                                    document.removeEventListener('mouseup', onUp)
                                    if (el) el.style.cursor = 'grab'
                                    if (Math.abs(velocity) > 0.5) {
                                      const friction = 0.92
                                      const animate = () => {
                                        velocity *= friction
                                        el.scrollLeft -= velocity * 8
                                        if (Math.abs(velocity) > 0.1) {
                                          momentumId = requestAnimationFrame(animate)
                                        } else {
                                          snapToNearest(el, { overshoot: true })
                                        }
                                      }
                                      momentumId = requestAnimationFrame(animate)
                                    } else {
                                      snapToNearest(el, { overshoot: true })
                                    }
                                  }
                                  document.addEventListener('mousemove', onMove)
                                  document.addEventListener('mouseup', onUp)
                                }}
                                onTouchStart={(e) => {
                                  const el = staffCarouselRef.current
                                  if (!el) return
                                  const startX = e.touches[0].clientX
                                  const startScroll = el.scrollLeft
                                  let lastX = e.touches[0].clientX
                                  let lastTime = Date.now()
                                  let velocity = 0
                                  let momentumId: number | null = null
                                  const onMove = (ev: TouchEvent) => {
                                    if (momentumId) { cancelAnimationFrame(momentumId); momentumId = null }
                                    const dx = ev.touches[0].clientX - startX
                                    const rawScroll = startScroll - dx
                                    // Gear notch resistance
                                    const notchRange = 35
                                    const nearest = getNearestItemCenter(el, rawScroll)
                                    let finalScroll = rawScroll
                                    if (nearest.dist < notchRange) {
                                      const resistance = (1 - nearest.dist / notchRange) * 0.35
                                      finalScroll = rawScroll * (1 - resistance) + nearest.scroll * resistance
                                    }
                                    el.scrollLeft = finalScroll
                                    const now = Date.now()
                                    const dt = now - lastTime
                                    if (dt > 0) {
                                      velocity = (ev.touches[0].clientX - lastX) / dt * 16
                                      lastX = ev.touches[0].clientX
                                      lastTime = now
                                    }
                                  }
                                  const onEnd = () => {
                                    document.removeEventListener('touchmove', onMove)
                                    document.removeEventListener('touchend', onEnd)
                                    if (Math.abs(velocity) > 0.5) {
                                      const friction = 0.92
                                      const animate = () => {
                                        velocity *= friction
                                        el.scrollLeft -= velocity * 8
                                        if (Math.abs(velocity) > 0.1) {
                                          momentumId = requestAnimationFrame(animate)
                                        } else {
                                          snapToNearest(el, { overshoot: true })
                                        }
                                      }
                                      momentumId = requestAnimationFrame(animate)
                                    } else {
                                      snapToNearest(el, { overshoot: true })
                                    }
                                  }
                                  document.addEventListener('touchmove', onMove, { passive: true })
                                  document.addEventListener('touchend', onEnd)
                                }}
                              >
                                {staffList.map((s, idx) => {
                                  const dist = Math.abs(idx - visualIdx)
                                  const maxDist = Math.max(staffList.length, 3)
                                  const isCenter = idx === visualIdx
                                  const hasConnected = connected.some(a => a.staffId === s.staffId)
                                  const isHighlighted = hasConnected
                                  const isHovered = staffHoverIdx === idx
                                  const rotateY = idx < visualIdx ? -Math.min(dist * 18, 45) : (idx > visualIdx ? Math.min(dist * 18, 45) : 0)
                                  const distScale = Math.max(1 - dist * 0.1, 0.62)
                                  const opacity = Math.max(1 - dist / maxDist * 0.7, 0.25)
                                  const zIdx = staffList.length - dist
                                  const avatarSize = isHighlighted ? 85 : 52
                                  const hoverScale = Math.min(distScale + 0.13, 1.16)
                                  return (
                                    <div
                                      key={s.staffId}
                                      data-staff-id={s.staffId}
                                      onClick={(e) => {
                                        // 点击放大光效脉冲
                                        const avatar = e.currentTarget.querySelector<HTMLElement>('[data-wheel-avatar]')
                                        if (avatar) {
                                          avatar.animate(
                                            [
                                              { transform: 'scale(1)' },
                                              { transform: 'scale(1.32)', offset: 0.45 },
                                              { transform: 'scale(1)' },
                                            ],
                                            { duration: 620, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }
                                          )
                                          avatar.animate(
                                            [
                                              { boxShadow: '0 0 0 4px color-mix(in srgb, var(--adm-accent) 30%, transparent), 0 0 14px color-mix(in srgb, var(--adm-accent) 35%, transparent)' },
                                              { boxShadow: '0 0 0 10px color-mix(in srgb, var(--adm-accent) 55%, transparent), 0 0 44px color-mix(in srgb, var(--adm-accent) 85%, transparent)', offset: 0.45 },
                                              { boxShadow: '0 0 0 4px color-mix(in srgb, var(--adm-accent) 30%, transparent), 0 0 14px color-mix(in srgb, var(--adm-accent) 35%, transparent)' },
                                            ],
                                            { duration: 620, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }
                                          )
                                        }
                                        setStaffCarouselFocusIdx(idx)
                                        const staffAccounts = connected.filter(a => a.staffId === s.staffId)
                                        if (staffAccounts.length === 0) {
                                          setSelectedAccount(null)
                                          return
                                        }
                                        const currentPlatform = selectedAccount?.platform
                                        const a = currentPlatform
                                          ? (staffAccounts.find(a => a.platform === currentPlatform) || staffAccounts[0])
                                          : staffAccounts[0]
                                        setSelectedAccount({
                                          staffId: a.staffId,
                                          staffName: a.staffName,
                                          platform: a.platform,
                                          accountId: a.id,
                                          accountUsername: a.username,
                                        })
                                      }}
                                      className="flex flex-col items-center gap-2 cursor-pointer flex-shrink-0 select-none"
                                      style={{
                                        transform: `perspective(1400px) rotateY(${rotateY}deg) scale(${isHovered ? hoverScale : distScale})`,
                                        opacity,
                                        filter: isHighlighted ? 'none' : `grayscale(${Math.min(1 - opacity + 0.3, 1)})`,
                                        width: '70px',
                                        zIndex: isHovered ? zIdx + 10 : zIdx,
                                        transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                                        padding: '10px 8px',
                                        position: 'relative',
                                      }}
                                      onMouseEnter={() => setStaffHoverIdx(idx)}
                                      onMouseLeave={() => setStaffHoverIdx(null)}
                                    >
                                      {/* Avatar with tech ring */}
                                      <div className="relative flex-shrink-0" style={{ width: avatarSize, height: avatarSize }}>
                                        {isCenter && (
                                          <div
                                            className="pointer-events-none absolute"
                                            style={{
                                              inset: -3,
                                              borderRadius: '50%',
                                              background: 'conic-gradient(from 0deg, transparent 0%, var(--adm-accent) 12%, transparent 28%, transparent 52%, color-mix(in srgb, var(--adm-accent) 60%, #818cf8) 68%, transparent 84%)',
                                              WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 2px), black calc(100% - 1px))',
                                              mask: 'radial-gradient(farthest-side, transparent calc(100% - 2px), black calc(100% - 1px))',
                                              animation: 'spin-ring 4s linear infinite',
                                              opacity: 0.9,
                                              zIndex: 0,
                                            }}
                                          />
                                        )}
                                        <div
                                          data-wheel-avatar
                                          className="rounded-full flex items-center justify-center overflow-hidden"
                                          style={{
                                            position: 'relative',
                                            zIndex: 1,
                                            width: '100%',
                                            height: '100%',
                                            borderRadius: '50%',
                                            border: isHighlighted
                                              ? '3px solid var(--adm-accent)'
                                              : `2px solid ${isHovered ? 'var(--adm-accent)' : 'color-mix(in srgb, var(--adm-accent) 24%, transparent)'}`,
                                            backgroundColor: 'color-mix(in srgb, var(--adm-card) 97%, transparent)',
                                            boxShadow: isHighlighted
                                              ? '0 0 0 5px color-mix(in srgb, var(--adm-accent) 24%, transparent), 0 0 34px color-mix(in srgb, var(--adm-accent) 48%, transparent), 0 0 96px color-mix(in srgb, var(--adm-accent) 22%, transparent)'
                                              : isHovered
                                                ? '0 0 0 3px color-mix(in srgb, var(--adm-accent) 25%, transparent), 0 0 18px color-mix(in srgb, var(--adm-accent) 48%, transparent)'
                                                : '0 2px 8px rgba(0,0,0,0.10), 0 0 0 1px color-mix(in srgb, var(--adm-accent) 8%, transparent)',
                                            transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                                          }}
                                        >
                                          {s.staffAvatar ? (
                                            <img src={s.staffAvatar} alt="" className="w-full h-full object-contain rounded-full" />
                                          ) : (
                                            <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: 'var(--adm-accent-bg)' }}>
                                              <User size={isHighlighted ? 32 : 18} style={{ color: 'var(--adm-text-secondary)' }} />
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                      <span
                                        className="text-center truncate font-medium"
                                        style={{
                                          fontSize: isHighlighted ? '13px' : '10px',
                                          color: isHighlighted ? 'var(--adm-accent)' : 'var(--adm-text-secondary)',
                                          maxWidth: '70px',
                                          fontWeight: isHighlighted ? 600 : 400,
                                          transition: 'all 0.25s ease',
                                          marginTop: isHighlighted ? '5px' : '3px',
                                        }}
                                      >
                                        {s.staffName}
                                      </span>
                                    </div>
                                  )
                                })}
                              </div>
                              {/* Bottom tech glow line */}
                              <div
                                className="pointer-events-none absolute left-1/2 -translate-x-1/2"
                                style={{
                                  bottom: 6,
                                  width: '68%',
                                  height: 2,
                                  borderRadius: 2,
                                  background: 'linear-gradient(90deg, transparent, color-mix(in srgb, var(--adm-accent) 60%, transparent) 28%, color-mix(in srgb, var(--adm-accent) 85%, #818cf8) 50%, color-mix(in srgb, var(--adm-accent) 60%, transparent) 72%, transparent)',
                                  filter: 'blur(0.4px)',
                                  opacity: 0.85,
                                }}
                              />
                            </div>
                          </div>

                          {/* Bottom staff data bar */}
                          {(() => {
                            const staffId = selectedAccount?.staffId
                            const staff = staffId ? allStaffMembers.find(s => s.id === staffId) : null
                            const staffAvatar = staff?.avatar || ''
                            const accounts = staffId
                              ? socialAccounts.filter(a => a.staffId === staffId && a.status === 'connected')
                              : socialAccounts.filter(a => a.status === 'connected')
                            const platforms = Array.from(new Set(accounts.map(a => a.platform)))
                            const allStats = Object.values((referralStats?.clicksByStaff || {}) as Record<string, { clicks?: number; conversions?: number; revenue?: number }>)
                              .reduce<{ clicks: number; conversions: number; revenue: number }>((acc, v) => ({
                                clicks: acc.clicks + (v.clicks || 0),
                                conversions: acc.conversions + (v.conversions || 0),
                                revenue: acc.revenue + (v.revenue || 0),
                              }), { clicks: 0, conversions: 0, revenue: 0 })
                            const stat = staffId ? ((referralStats?.clicksByStaff?.[staffId] as any) || { clicks: 0, conversions: 0, revenue: 0 }) : allStats
                            const name = staff?.name || 'All Staff'
                            return (
                              <div className="mt-3">
                                <div
                                  className="rounded-xl p-3 flex items-center gap-3"
                                  style={{
                                    backgroundColor: 'color-mix(in srgb, var(--adm-card) 55%, transparent)',
                                    border: '1px solid color-mix(in srgb, var(--adm-accent) 22%, transparent)',
                                    backdropFilter: 'blur(8px)',
                                    WebkitBackdropFilter: 'blur(8px)',
                                  }}
                                >
                                  <div
                                    className="w-11 h-11 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0"
                                    style={{
                                      backgroundColor: 'color-mix(in srgb, var(--adm-accent) 12%, transparent)',
                                      border: '2px solid color-mix(in srgb, var(--adm-accent) 35%, transparent)',
                                    }}
                                  >
                                    {staffAvatar ? (
                                      <img src={staffAvatar} alt="" className="w-full h-full object-contain" />
                                    ) : (
                                      <Users2 size={20} style={{ color: 'var(--adm-accent)' }} />
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="text-sm font-semibold" style={{ color: 'var(--adm-text)' }}>{name}</span>
                                      <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'var(--adm-accent-bg)', color: 'var(--adm-accent)' }}>
                                        {accounts.length} accounts
                                      </span>
                                      {platforms.map(p => {
                                        const pInfo = PLATFORMS.find(x => x.id === p)
                                        return pInfo ? <pInfo.icon key={p} size={13} style={{ color: pInfo.color }} /> : null
                                      })}
                                    </div>
                                    <div className="flex items-center gap-4 mt-1 text-xs" style={{ color: 'var(--adm-text-secondary)' }}>
                                      <span className="flex items-center gap-1"><Link2 size={11} style={{ color: 'var(--adm-accent)' }} /> {stat.clicks} clicks</span>
                                      <span className="flex items-center gap-1"><TrendingUp size={11} style={{ color: '#22c55e' }} /> {stat.conversions} conv</span>
                                      <span className="flex items-center gap-1"><DollarSign size={11} style={{ color: '#F59E0B' }} /> ${(stat.revenue || 0).toLocaleString()}</span>
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => setActiveTab('referrals')}
                                    className="px-2.5 py-1.5 text-xs rounded-lg font-medium flex-shrink-0"
                                    style={{ backgroundColor: 'var(--adm-accent)', color: 'var(--adm-accent-text)' }}
                                  >
                                    Publish Data
                                  </button>
                                </div>
                                {/* Animated shimmer edge */}
                                <div
                                  className="mt-1 h-[2px] rounded-full"
                                  style={{
                                    background: 'linear-gradient(90deg, transparent, var(--adm-accent) 50%, transparent)',
                                    backgroundSize: '200% 100%',
                                    animation: 'shimmer-line 3s linear infinite',
                                    opacity: 0.55,
                                  }}
                                />
                              </div>
                            )
                          })()}
                        </div>
                      )
                    })()}
                  </div>

                  {/* Right Column: Platform Accounts + All Accounts */}
                  <div className="flex-1 min-w-0 space-y-4">
                    {/* Platform Accounts - All Accounts (including historical) */}
                    <div>
                    {(() => {
                      // Show ALL social accounts regardless of connection status
                      const staffId = selectedAccount?.staffId
                      const allStaffAccounts = staffId
                        ? socialAccounts.filter(a => a.staffId === staffId)
                        : socialAccounts
                      // Group by platform
                      const platformMap = new Map<string, typeof allStaffAccounts>()
                      for (const acc of allStaffAccounts) {
                        const existing = platformMap.get(acc.platform) || []
                        existing.push(acc)
                        platformMap.set(acc.platform, existing)
                      }
                      const platformEntries = Array.from(platformMap.entries())
                      if (platformEntries.length === 0) {
                        return (
                          <div className="text-xs py-3 text-center" style={{ color: 'var(--adm-text-secondary)' }}>
                            {selectedAccount ? `No accounts for ${selectedAccount.staffName}` : 'Select a staff member to view accounts'}
                          </div>
                        )
                      }

                      const handlePlatformScroll = () => {
                        if (!platformCarouselRef.current) return
                        const el = platformCarouselRef.current
                        const center = el.scrollLeft + el.offsetWidth / 2
                        const items = el.children
                        let closest = 0
                        let closestDist = Infinity
                        for (let i = 0; i < items.length; i++) {
                          const item = items[i] as HTMLElement
                          const itemCenter = item.offsetLeft + item.offsetWidth / 2
                          const dist = Math.abs(center - itemCenter)
                          if (dist < closestDist) {
                            closestDist = dist
                            closest = i
                          }
                        }
                        setPlatformCarouselFocusIdx(closest)
                        if (platformScrollTimeoutRef.current) clearTimeout(platformScrollTimeoutRef.current)
                        platformScrollTimeoutRef.current = setTimeout(() => {
                          const [platId] = platformEntries[closest] || []
                          if (!platId) return
                          if (selectedAccount?.platform === platId) return
                          const accounts = platformMap.get(platId) || []
                          const a = accounts[0]
                          setSelectedAccount({
                            staffId: a.staffId,
                            staffName: a.staffName,
                            platform: a.platform,
                            accountId: a.id,
                            accountUsername: a.username,
                          })
                        }, 150)
                      }
                      const platformVisualIdx = platformCarouselFocusIdx

                      return (
                        <div className="relative">
                          {/* Wheel label */}
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--adm-text-secondary)' }}>Accounts History</span>
                            <span className="text-xs" style={{ color: 'var(--adm-text-secondary)' }}>{allStaffAccounts.length} total</span>
                          </div>

                          {/* Wheel track container */}
                          <div className="relative rounded-xl overflow-hidden" style={{ backgroundColor: 'color-mix(in srgb, var(--adm-input) 50%, transparent)' }}>
                            {/* Top center indicator arrow */}
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 z-10" style={{ marginTop: '-1px' }}>
                              <div style={{ width: 0, height: 0, borderLeft: '10px solid transparent', borderRight: '10px solid transparent', borderTop: '10px solid var(--adm-accent)' }} />
                            </div>

                            {/* The scrollable wheel track */}
                            <div
                              ref={platformCarouselRef}
                              className="flex items-start overflow-x-auto"
                              style={{
                                scrollSnapType: 'x mandatory',
                                scrollbarWidth: 'none',
                                msOverflowStyle: 'none',
                                gap: '0px',
                                WebkitOverflowScrolling: 'touch',
                                overscrollBehavior: 'contain',
                                scrollSnapStop: 'always',
                              }}
                              onScroll={handlePlatformScroll}
                            >
                              {platformEntries.map(([platId, accounts], idx) => {
                                const pInfo = PLATFORMS.find(p => p.id === platId)
                                const Icon = pInfo?.icon || Globe2
                                const dist = Math.abs(idx - platformVisualIdx)
                                const maxDist = Math.max(platformEntries.length, 3)
                                const isSelected = selectedAccount?.staffId && idx === platformVisualIdx
                                const arcOffset = isSelected ? 0 : Math.pow(dist, 1.2) * 6
                                const scale = isSelected ? 1 : Math.max(1 - dist * 0.12, 0.55)
                                const opacity = isSelected ? 1 : Math.max(1 - dist / maxDist * 0.8, 0.2)
                                const onlineCount = accounts.filter(a => a.isOnline).length
                                return (
                                  <div
                                    key={platId}
                                    data-platform-id={platId}
                                    onClick={() => {
                                      if (!selectedAccount?.staffId) return
                                      if (isSelected) { setSelectedAccount(null); return }
                                      setPlatformCarouselFocusIdx(idx)
                                      const a = accounts[0]
                                      setSelectedAccount({
                                        staffId: a.staffId,
                                        staffName: a.staffName,
                                        platform: a.platform,
                                        accountId: a.id,
                                        accountUsername: a.username,
                                      })
                                    }}
                                    className="flex flex-col items-center gap-1.5 cursor-pointer flex-shrink-0 select-none"
                                    style={{
                                      scrollSnapAlign: 'center',
                                      scrollSnapStop: 'always',
                                      transform: `translateY(${arcOffset}px) scale(${scale})`,
                                      opacity,
                                      filter: isSelected ? 'none' : `grayscale(${Math.min(1 - opacity + 0.3, 1)})`,
                                      width: isSelected ? '80px' : '50px',
                                      zIndex: platformEntries.length - dist,
                                      transition: 'all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
                                      padding: '8px 4px',
                                      position: 'relative',
                                    }}
                                  >
                                    {/* Platform icon circle */}
                                    <div
                                      className="rounded-full flex items-center justify-center"
                                      style={{
                                        width: isSelected ? '60px' : '36px',
                                        height: isSelected ? '60px' : '36px',
                                        backgroundColor: isSelected ? (pInfo?.bgColor || 'var(--adm-accent-bg)') : 'var(--adm-input)',
                                        border: isSelected ? `3px solid ${pInfo?.color || 'var(--adm-accent)'}` : '2px solid transparent',
                                        boxShadow: isSelected
                                          ? `0 0 0 4px ${pInfo?.color || 'var(--adm-accent)'}22, 0 0 30px ${pInfo?.color || 'var(--adm-accent)'}40`
                                          : '0 2px 8px rgba(0,0,0,0.08)',
                                        transition: 'all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
                                        position: 'relative',
                                      }}
                                    >
                                      <Icon size={isSelected ? 28 : 16} style={{ color: isSelected ? (pInfo?.color || 'var(--adm-accent)') : 'var(--adm-text-secondary)' }} />
                                      {/* Online indicator dot */}
                                      {onlineCount > 0 && (
                                        <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2" style={{ backgroundColor: '#22c55e', borderColor: isSelected ? pInfo?.bgColor || 'var(--adm-card)' : 'var(--adm-input)' }} />
                                      )}
                                    </div>
                                    {/* Platform name */}
                                    <span
                                      className="text-center truncate font-medium"
                                      style={{
                                        fontSize: isSelected ? '11px' : '8px',
                                        color: isSelected ? (pInfo?.color || 'var(--adm-accent)') : 'var(--adm-text-secondary)',
                                        maxWidth: isSelected ? '80px' : '50px',
                                        fontWeight: isSelected ? 600 : 400,
                                        transition: 'all 0.25s ease',
                                        marginTop: isSelected ? '4px' : '2px',
                                      }}
                                    >
                                      {pInfo?.name || platId}
                                    </span>
                                    {/* Account count badge */}
                                    {accounts.length > 1 && (
                                      <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full" style={{
                                        backgroundColor: isSelected ? 'var(--adm-accent-bg)' : 'var(--adm-input)',
                                        color: isSelected ? 'var(--adm-accent)' : 'var(--adm-text-secondary)',
                                      }}>
                                        {accounts.length}
                                      </span>
                                    )}
                                  </div>
                                )
                              })}
                            </div>

                            {/* Gradient fade edges */}
                            <div className="absolute left-0 top-0 bottom-0 w-8 pointer-events-none" style={{ background: 'linear-gradient(to right, color-mix(in srgb, var(--adm-card) 80%, transparent), transparent)' }} />
                            <div className="absolute right-0 top-0 bottom-0 w-8 pointer-events-none" style={{ background: 'linear-gradient(to left, color-mix(in srgb, var(--adm-card) 80%, transparent), transparent)' }} />
                          </div>
                        </div>
                      )
                    })()}
                  </div>

                  {/* All Accounts History (including offline) */}
                  {(() => {
                    const staffId = selectedAccount?.staffId
                    let displayAccounts = staffId
                      ? socialAccounts.filter(a => a.staffId === staffId)
                      : socialAccounts
                    if (selectedAccount?.platform) {
                      displayAccounts = displayAccounts.filter(a => a.platform === selectedAccount.platform)
                    }
                    if (displayAccounts.length === 0) return null
                    return (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--adm-text-secondary)' }}>All Accounts</span>
                          <span className="text-xs" style={{ color: 'var(--adm-text-secondary)' }}>{displayAccounts.filter(a => a.isOnline).length} online · {displayAccounts.length} total</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {displayAccounts.map(acc => {
                            const pInfo = PLATFORMS.find(p => p.id === acc.platform)
                            const Icon = pInfo?.icon || Globe2
                            return (
                              <div
                                key={acc.id}
                                className="flex items-center gap-2 px-3 py-2 rounded-xl transition-all hover:scale-[1.02] cursor-pointer"
                                style={{ backgroundColor: 'var(--adm-input)', border: '1px solid var(--adm-border)' }}
                                onClick={() => {
                                  // Open the account's profile page
                                  if (acc.profileUrl) {
                                    window.open(acc.profileUrl, '_blank')
                                  }
                                }}
                              >
                                <div className="relative flex-shrink-0">
                                  {acc.avatar ? (
                                    <div className="w-8 h-8 rounded-full overflow-hidden" style={{ border: `2px solid ${acc.isOnline ? '#22c55e' : (pInfo?.color || 'var(--adm-text-secondary)')}` }}>
                                      <img src={acc.avatar} alt="" className="w-full h-full object-cover" />
                                    </div>
                                  ) : (
                                    <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: pInfo?.bgColor || 'var(--adm-accent-bg)' }}>
                                      <Icon size={14} style={{ color: pInfo?.color || 'var(--adm-accent)' }} />
                                    </div>
                                  )}
                                  {/* Online/Offline indicator */}
                                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2" style={{
                                    backgroundColor: acc.isOnline ? '#22c55e' : '#9ca3af',
                                    borderColor: 'var(--adm-card)',
                                  }} />
                                </div>
                                <div className="flex flex-col min-w-0">
                                  <div className="flex items-center gap-1">
                                    <Icon size={10} style={{ color: pInfo?.color || 'var(--adm-text-secondary)' }} />
                                    <span className="text-xs font-medium truncate" style={{ color: 'var(--adm-text)', maxWidth: '100px' }}>
                                      {acc.username || acc.platformName}
                                    </span>
                                    {!acc.isOnline && (
                                      <span className="text-[9px] px-1 py-0.5 rounded" style={{ backgroundColor: '#f3f4f6', color: '#9ca3af' }}>offline</span>
                                    )}
                                  </div>
                                  <span className="text-[10px]" style={{ color: 'var(--adm-text-secondary)' }}>
                                    {acc.staffName} · {acc.platformName}
                                  </span>
                                </div>
                                {acc.isOnline && (
                                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: '#22c55e' }} />
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })()}

                  {/* Selected filter indicator */}
                  {selectedAccount && (
                    <div className="flex items-center gap-2 pt-1 flex-wrap">
                      <span className="text-xs" style={{ color: 'var(--adm-text-secondary)' }}>Filtering:</span>
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ backgroundColor: 'var(--adm-accent-bg)' }}>
                        <User size={12} style={{ color: 'var(--adm-accent)' }} />
                        <span className="text-xs font-medium" style={{ color: 'var(--adm-accent)' }}>{selectedAccount.staffName}</span>
                      </div>
                      <ChevronRight size={12} style={{ color: 'var(--adm-text-secondary)' }} />
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ backgroundColor: (() => { const p = PLATFORMS.find(p => p.id === selectedAccount.platform); return p?.bgColor || 'var(--adm-input)'; })() }}>
                        {(() => {
                          const p = PLATFORMS.find(p => p.id === selectedAccount.platform)
                          const Icon = p?.icon || Globe2
                          return <Icon size={12} style={{ color: p?.color || 'var(--adm-text-secondary)' }} />
                        })()}
                        <span className="text-xs font-medium" style={{ color: (() => { const p = PLATFORMS.find(p => p.id === selectedAccount.platform); return p?.color || 'var(--adm-text)'; })() }}>
                          {PLATFORMS.find(p => p.id === selectedAccount.platform)?.name || selectedAccount.platform}
                        </span>
                      </div>
                      <ChevronRight size={12} style={{ color: 'var(--adm-text-secondary)' }} />
                      <span className="text-xs font-medium" style={{ color: 'var(--adm-text)' }}>@{selectedAccount.accountUsername}</span>
                      <button
                        onClick={() => { setSelectedAccount(null); setStaffCarouselFocusIdx(0); setPlatformCarouselFocusIdx(0) }}
                        className="ml-2 px-2 py-0.5 rounded text-xs hover:opacity-70"
                        style={{ color: 'var(--adm-text-secondary)', backgroundColor: 'var(--adm-input)' }}
                      >
                        Clear filter
                      </button>
                    </div>
                  )}

                  {/* Messages & Inbox Status */}
                  <div className="pt-3 border-t" style={{ borderColor: 'var(--adm-border)' }}>
                    <div className="flex items-center gap-3">
                      {/* Circular message status indicator */}
                      <div
                        className="relative flex-shrink-0 rounded-full flex items-center justify-center cursor-pointer transition-all hover:scale-105"
                        style={{
                          width: '52px',
                          height: '52px',
                          backgroundColor: selectedAccount ? 'var(--adm-accent-bg)' : 'var(--adm-input)',
                          border: `2px solid ${selectedAccount ? 'var(--adm-accent)' : 'var(--adm-border)'}`,
                          boxShadow: selectedAccount ? `0 0 0 3px color-mix(in srgb, var(--adm-accent) 15%, transparent)` : 'none',
                        }}
                        onClick={() => { setActiveTab('messages'); if (allConversationsUnified.length === 0) loadAllConversations() }}
                        title="Messages & Inbox"
                      >
                        <MessageSquare size={20} style={{ color: selectedAccount ? 'var(--adm-accent)' : 'var(--adm-text-secondary)' }} />
                        {(() => {
                          const staffId = selectedAccount?.staffId
                          const platform = selectedAccount?.platform
                          const convCount = staffId
                            ? allConversationsUnified.filter(c => c.staffId === staffId && (platform ? c.platform === platform : true)).length
                            : allConversationsUnified.length
                          const unreadCount = staffId
                            ? allConversationsUnified.filter(c => c.staffId === staffId && (platform ? c.platform === platform : true)).reduce((sum: number, c: any) => sum + (c._unread || 0), 0)
                            : allConversationsUnified.reduce((sum: number, c: any) => sum + (c._unread || 0), 0)
                          return (
                            <>
                              {convCount > 0 && (
                                <span className="absolute -top-1 -right-1 text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--adm-accent)', color: '#fff' }}>
                                  {convCount > 9 ? '9+' : convCount}
                                </span>
                              )}
                              {unreadCount > 0 && (
                                <span className="absolute -bottom-1 -left-1 w-3 h-3 rounded-full" style={{ backgroundColor: '#ef4444' }} />
                              )}
                            </>
                          )
                        })()}
                      </div>

                      {/* Circular chat status - shows unread count */}
                      <div
                        className="relative flex-shrink-0 rounded-full flex items-center justify-center cursor-pointer transition-all hover:scale-105"
                        style={{
                          width: '44px',
                          height: '44px',
                          backgroundColor: 'var(--adm-card)',
                          border: '2px solid var(--adm-border)',
                        }}
                        onClick={() => { setActiveTab('messages'); if (allConversationsUnified.length === 0) loadAllConversations() }}
                        title="Unread messages"
                      >
                        {(() => {
                          const staffId = selectedAccount?.staffId
                          const platform = selectedAccount?.platform
                          const unreadCount = staffId
                            ? allConversationsUnified.filter(c => c.staffId === staffId && (platform ? c.platform === platform : true)).reduce((sum: number, c: any) => sum + (c._unread || 0), 0)
                            : allConversationsUnified.reduce((sum: number, c: any) => sum + (c._unread || 0), 0)
                          return (
                            <>
                              <span className="text-xs font-bold" style={{ color: unreadCount > 0 ? '#ef4444' : 'var(--adm-text-secondary)' }}>
                                {unreadCount > 99 ? '99+' : unreadCount || 0}
                              </span>
                              {unreadCount > 0 && (
                                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full animate-ping" style={{ backgroundColor: '#ef4444' }} />
                              )}
                            </>
                          )
                        })()}
                      </div>

                      {/* Quick action menu */}
                      <div className="relative flex-shrink-0">
                        <div
                          className="rounded-full flex items-center justify-center cursor-pointer transition-all hover:scale-110"
                          style={{
                            width: '38px',
                            height: '38px',
                            background: featureMenuOpen
                              ? 'linear-gradient(135deg, color-mix(in srgb, var(--adm-accent) 30%, transparent), color-mix(in srgb, var(--adm-accent) 10%, transparent))'
                              : 'color-mix(in srgb, var(--adm-accent) 10%, transparent)',
                            border: `1.5px solid ${featureMenuOpen ? 'var(--adm-accent)' : 'color-mix(in srgb, var(--adm-accent) 40%, transparent)'}`,
                            boxShadow: featureMenuOpen
                              ? '0 0 0 3px color-mix(in srgb, var(--adm-accent) 20%, transparent), 0 0 16px color-mix(in srgb, var(--adm-accent) 40%, transparent)'
                              : '0 0 10px color-mix(in srgb, var(--adm-accent) 15%, transparent)',
                            transform: featureMenuOpen ? 'rotate(45deg)' : 'none',
                          }}
                          onClick={() => setFeatureMenuOpen(o => !o)}
                          title="Quick actions"
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ color: featureMenuOpen ? 'var(--adm-accent)' : 'var(--adm-text-secondary)', transition: 'all 0.25s ease' }}>
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                          </svg>
                        </div>
                        {featureMenuOpen && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setFeatureMenuOpen(false)} />
                            <div
                              className="absolute right-0 bottom-full mb-2 w-60 rounded-xl p-2 z-50"
                              style={{
                                backgroundColor: 'color-mix(in srgb, var(--adm-card) 92%, transparent)',
                                border: '1px solid color-mix(in srgb, var(--adm-accent) 28%, transparent)',
                                boxShadow: '0 12px 32px rgba(0,0,0,0.35), 0 0 24px color-mix(in srgb, var(--adm-accent) 14%, transparent)',
                                backdropFilter: 'blur(12px)',
                                WebkitBackdropFilter: 'blur(12px)',
                                animation: 'menu-pop 0.22s cubic-bezier(0.34, 1.56, 0.64, 1)',
                              }}
                            >
                              <p className="text-[10px] font-semibold uppercase tracking-wider px-2 py-1" style={{ color: 'var(--adm-text-secondary)' }}>Quick Actions</p>
                              {[
                                { label: 'Content Studio', desc: 'Generate post copy & creatives', icon: Wand2, action: () => setActiveTab('studio') },
                                { label: 'AI Assistant', desc: 'Ask the marketing AI', icon: Bot, action: () => setActiveTab('ai-chat') },
                                { label: 'Social Accounts', desc: 'Manage connections & re-login', icon: Globe2, action: () => setActiveTab('social') },
                                { label: 'Publish History', desc: 'Create links & schedule posts', icon: History, action: () => setActiveTab('referrals') },
                              ].map(item => (
                                <button
                                  key={item.label}
                                  onClick={() => { setFeatureMenuOpen(false); item.action() }}
                                  className="w-full flex items-center gap-3 px-2 py-2 rounded-lg text-left transition-colors"
                                  style={{ color: 'var(--adm-text)' }}
                                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--adm-accent-bg)')}
                                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                                >
                                  <span className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--adm-accent-bg)' }}>
                                    <item.icon size={14} style={{ color: 'var(--adm-accent)' }} />
                                  </span>
                                  <span className="min-w-0">
                                    <span className="block text-sm font-medium">{item.label}</span>
                                    <span className="block text-[10px] truncate" style={{ color: 'var(--adm-text-secondary)' }}>{item.desc}</span>
                                  </span>
                                </button>
                              ))}
                            </div>
                          </>
                        )}
                      </div>

                      {/* Status label */}
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-semibold truncate" style={{ color: 'var(--adm-text)' }}>
                          {selectedAccount ? `${selectedAccount.staffName} · ${selectedAccount.accountUsername || selectedAccount.platform}` : 'All Accounts'}
                        </span>
                        <span className="text-[10px]" style={{ color: 'var(--adm-text-secondary)' }}>
                          {(() => {
                            const staffId = selectedAccount?.staffId
                            const platform = selectedAccount?.platform
                            const convCount = staffId
                              ? allConversationsUnified.filter(c => c.staffId === staffId && (platform ? c.platform === platform : true)).length
                              : allConversationsUnified.length
                            const unreadCount = staffId
                              ? allConversationsUnified.filter(c => c.staffId === staffId && (platform ? c.platform === platform : true)).reduce((sum: number, c: any) => sum + (c._unread || 0), 0)
                              : allConversationsUnified.reduce((sum: number, c: any) => sum + (c._unread || 0), 0)
                            return `${convCount} conversations · ${unreadCount} unread`
                          })()}
                        </span>
                      </div>
                    </div>
                  </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-4">
              <div className="rounded-2xl p-5" style={{ backgroundColor: 'var(--adm-card)', border: '1px solid var(--adm-border)' }}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--adm-text-secondary)' }}>Total Clicks</span>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#EEF2FF' }}>
                    <Eye size={16} style={{ color: '#6366F1' }} />
                  </div>
                </div>
                <p className="text-2xl font-bold" style={{ color: 'var(--adm-text)' }}>
                  {dashboardLoading ? '-' : dashboardFilteredStats.totalClicks.toLocaleString()}
                </p>
                <div className="flex items-center gap-1 mt-2">
                  <TrendingUp size={12} style={{ color: '#22c55e' }} />
                  <span className="text-xs font-medium" style={{ color: '#22c55e' }}>+12.5%</span>
                </div>
              </div>

              <div className="rounded-2xl p-5" style={{ backgroundColor: 'var(--adm-card)', border: '1px solid var(--adm-border)' }}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--adm-text-secondary)' }}>Unique Visitors</span>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#E0F2FE' }}>
                    <Users size={16} style={{ color: '#0EA5E9' }} />
                  </div>
                </div>
                <p className="text-2xl font-bold" style={{ color: 'var(--adm-text)' }}>
                  {dashboardLoading ? '-' : Math.round(dashboardFilteredStats.totalClicks * 0.75).toLocaleString()}
                </p>
                <div className="flex items-center gap-1 mt-2">
                  <TrendingUp size={12} style={{ color: '#22c55e' }} />
                  <span className="text-xs font-medium" style={{ color: '#22c55e' }}>+8.7%</span>
                </div>
              </div>

              <div className="rounded-2xl p-5" style={{ backgroundColor: 'var(--adm-card)', border: '1px solid var(--adm-border)' }}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--adm-text-secondary)' }}>Conversions</span>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#ECFDF5' }}>
                    <ShoppingCart size={16} style={{ color: '#10B981' }} />
                  </div>
                </div>
                <p className="text-2xl font-bold" style={{ color: 'var(--adm-text)' }}>
                  {dashboardLoading ? '-' : dashboardFilteredStats.totalConversions.toLocaleString()}
                </p>
                <div className="flex items-center gap-1 mt-2">
                  <TrendingUp size={12} style={{ color: '#22c55e' }} />
                  <span className="text-xs font-medium" style={{ color: '#22c55e' }}>+8.3%</span>
                </div>
              </div>

              <div className="rounded-2xl p-5" style={{ backgroundColor: 'var(--adm-card)', border: '1px solid var(--adm-border)' }}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--adm-text-secondary)' }}>Conversion Rate</span>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#FEF3C7' }}>
                    <Target size={16} style={{ color: '#F59E0B' }} />
                  </div>
                </div>
                <p className="text-2xl font-bold" style={{ color: 'var(--adm-text)' }}>
                  {dashboardLoading ? '-' : `${dashboardFilteredStats.conversionRate}%`}
                </p>
                <div className="flex items-center gap-1 mt-2">
                  <TrendingUp size={12} style={{ color: '#22c55e' }} />
                  <span className="text-xs font-medium" style={{ color: '#22c55e' }}>+2.1%</span>
                </div>
              </div>

              <div className="rounded-2xl p-5" style={{ backgroundColor: 'var(--adm-card)', border: '1px solid var(--adm-border)' }}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--adm-text-secondary)' }}>Revenue</span>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#FCE7F3' }}>
                    <DollarSign size={16} style={{ color: '#EC4899' }} />
                  </div>
                </div>
                <p className="text-2xl font-bold" style={{ color: 'var(--adm-text)' }}>
                  ${dashboardLoading ? '-' : dashboardFilteredStats.totalRevenue.toLocaleString()}
                </p>
                <div className="flex items-center gap-1 mt-2">
                  <TrendingUp size={12} style={{ color: '#22c55e' }} />
                  <span className="text-xs font-medium" style={{ color: '#22c55e' }}>+15.2%</span>
                </div>
              </div>

              <div className="rounded-2xl p-5" style={{ backgroundColor: 'var(--adm-card)', border: '1px solid var(--adm-border)' }}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--adm-text-secondary)' }}>Avg Order Value</span>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#DBEAFE' }}>
                    <CreditCard size={16} style={{ color: '#3B82F6' }} />
                  </div>
                </div>
                <p className="text-2xl font-bold" style={{ color: 'var(--adm-text)' }}>
                  $
                  {dashboardLoading
                    ? '-'
                    : dashboardFilteredStats.totalConversions > 0
                    ? Math.round(dashboardFilteredStats.totalRevenue / dashboardFilteredStats.totalConversions).toLocaleString()
                    : '0'}
                </p>
                <div className="flex items-center gap-1 mt-2">
                  <TrendingUp size={12} style={{ color: '#22c55e' }} />
                  <span className="text-xs font-medium" style={{ color: '#22c55e' }}>+3.2%</span>
                </div>
              </div>

              <div className="rounded-2xl p-5" style={{ backgroundColor: 'var(--adm-card)', border: '1px solid var(--adm-border)' }}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--adm-text-secondary)' }}>Referral Links</span>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#E0F2FE' }}>
                    <Link2 size={16} style={{ color: '#0EA5E9' }} />
                  </div>
                </div>
                <p className="text-2xl font-bold" style={{ color: 'var(--adm-text)' }}>
                  {dashboardLoading ? '-' : dashboardFilteredStats.totalLinks.toLocaleString()}
                </p>
                <div className="flex items-center gap-1 mt-2">
                  <TrendingUp size={12} style={{ color: '#22c55e' }} />
                  <span className="text-xs font-medium" style={{ color: '#22c55e' }}>+5</span>
                </div>
              </div>

              <div className="rounded-2xl p-5" style={{ backgroundColor: 'var(--adm-card)', border: '1px solid var(--adm-border)' }}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--adm-text-secondary)' }}>Social Accounts</span>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#F0FDF4' }}>
                    <Globe2 size={16} style={{ color: '#16A34A' }} />
                  </div>
                </div>
                <p className="text-2xl font-bold" style={{ color: 'var(--adm-text)' }}>
                  {dashboardLoading ? '-' : dashboardFilteredAccounts.filter(a => a.status === 'connected').length.toLocaleString()}
                </p>
                <div className="flex items-center gap-1 mt-2">
                  <span className="text-xs font-medium" style={{ color: '#6366F1' }}>
                    {dashboardFilteredAccounts.length || 0} total
                  </span>
                </div>
              </div>

            </div>

            <div className="rounded-2xl p-6 mb-8" style={{ backgroundColor: 'var(--adm-card)', border: '1px solid var(--adm-border)' }}>
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h3 className="text-lg font-semibold" style={{ color: 'var(--adm-text)' }}>Post Ledger Snapshot</h3>
                  <p className="text-sm" style={{ color: 'var(--adm-text-secondary)' }}>
                    主面板同步帖子总表关键指标，进入 `Referrals` 标签可查看全量帖子列表和单帖详情。
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('referrals')}
                  className="px-3 py-2 text-xs rounded-lg font-medium"
                  style={{ backgroundColor: 'var(--adm-input)', color: 'var(--adm-text)' }}
                >
                  Open Post Ledger
                </button>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--adm-input)' }}>
                  <p className="text-[11px]" style={{ color: 'var(--adm-text-secondary)' }}>Visible Posts</p>
                  <p className="text-xl font-bold mt-1" style={{ color: 'var(--adm-text)' }}>{dashboardFilteredRecords.length}</p>
                </div>
                <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--adm-input)' }}>
                  <p className="text-[11px]" style={{ color: 'var(--adm-text-secondary)' }}>Published</p>
                  <p className="text-xl font-bold mt-1" style={{ color: '#166534' }}>{dashboardFilteredRecords.filter(item => item.record.status === 'published').length}</p>
                </div>
                <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--adm-input)' }}>
                  <p className="text-[11px]" style={{ color: 'var(--adm-text-secondary)' }}>Tracked Clicks</p>
                  <p className="text-xl font-bold mt-1" style={{ color: 'var(--adm-text)' }}>
                    {dashboardFilteredRecords.reduce((sum, item) => sum + item.clicks, 0)}
                  </p>
                </div>
                <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--adm-input)' }}>
                  <p className="text-[11px]" style={{ color: 'var(--adm-text-secondary)' }}>Conversions</p>
                  <p className="text-xl font-bold mt-1" style={{ color: '#166534' }}>
                    {dashboardFilteredRecords.reduce((sum, item) => sum + item.conversions, 0)}
                  </p>
                </div>
                <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--adm-input)' }}>
                  <p className="text-[11px]" style={{ color: 'var(--adm-text-secondary)' }}>Revenue</p>
                  <p className="text-xl font-bold mt-1" style={{ color: '#166534' }}>
                    {`$${dashboardFilteredRecords.reduce((sum, item) => sum + item.revenue, 0).toFixed(0)}`}
                  </p>
                </div>
              </div>
            </div>

            {/* 折线图看板 - 各账户链接点击数据 */}
            {(() => {
              const accountClickData = dashboardFilteredAccounts.map(acc => {
                const pInfo = PLATFORMS.find(p => p.id === acc.platform)
                const accLinks = referralLinks.filter(l => l.staffId === acc.staffId && l.platform === acc.platform)
                const clicks = accLinks.reduce((sum, l) => sum + (l.clicks || 0), 0)
                const conversions = accLinks.reduce((sum, l) => sum + (l.conversions || 0), 0)
                return {
                  name: acc.staffName,
                  username: acc.username,
                  platform: acc.platform,
                  platformName: pInfo?.name || acc.platform,
                  color: pInfo?.color || '#6366F1',
                  bgColor: pInfo?.bgColor || '#EEF2FF',
                  Icon: pInfo?.icon || Globe,
                  clicks,
                  conversions,
                }
              }).filter(a => a.clicks > 0 || a.conversions > 0)

              const maxClicks = Math.max(...accountClickData.map(a => a.clicks), 1)
              const chartWidth = 700
              const chartHeight = 220
              const padding = { top: 20, right: 20, bottom: 50, left: 50 }
              const innerW = chartWidth - padding.left - padding.right
              const innerH = chartHeight - padding.top - padding.bottom

              return (
                <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--adm-card)', border: '1px solid var(--adm-border)' }}>
                  <div className="flex items-center justify-between mb-1">
                    <div>
                      <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: 'var(--adm-text)' }}>
                        <LineChart size={18} style={{ color: 'var(--adm-accent)' }} />
                        Account Click Analytics
                      </h3>
                      <p className="text-sm" style={{ color: 'var(--adm-text-secondary)' }}>
                        Link click data across all connected social accounts
                      </p>
                    </div>
                  </div>

                  {accountClickData.length === 0 ? (
                    <div className="text-center py-12">
                      <LineChart size={40} className="mx-auto mb-3 opacity-20" style={{ color: 'var(--adm-text-secondary)' }} />
                      <p className="text-sm font-medium" style={{ color: 'var(--adm-text)' }}>No click data yet</p>
                      <p className="text-xs mt-1" style={{ color: 'var(--adm-text-secondary)' }}>
                        Share referral links from your connected accounts to start tracking clicks
                      </p>
                    </div>
                  ) : (
                    <div className="mt-4 overflow-x-auto">
                      <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full" style={{ minWidth: '500px' }}>
                        {/* Y轴网格线 */}
                        {[0, 0.25, 0.5, 0.75, 1].map(ratio => {
                          const y = padding.top + innerH * (1 - ratio)
                          const val = Math.round(maxClicks * ratio)
                          return (
                            <g key={ratio}>
                              <line x1={padding.left} y1={y} x2={padding.left + innerW} y2={y} stroke="var(--adm-border)" strokeWidth="1" strokeDasharray="3 3" />
                              <text x={padding.left - 8} y={y + 4} textAnchor="end" fontSize="10" fill="var(--adm-text-secondary)">{val}</text>
                            </g>
                          )
                        })}

                        {/* 点击数据折线 */}
                        {(() => {
                          const points = accountClickData.map((a, i) => {
                            const x = padding.left + (innerW / Math.max(accountClickData.length - 1, 1)) * i
                            const y = padding.top + innerH * (1 - a.clicks / maxClicks)
                            return { x, y, ...a }
                          })
                          const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
                          const areaD = `${pathD} L ${points[points.length - 1]?.x || padding.left} ${padding.top + innerH} L ${points[0]?.x || padding.left} ${padding.top + innerH} Z`

                          return (
                            <>
                              <defs>
                                <linearGradient id="clickAreaGrad" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor="var(--adm-accent)" stopOpacity="0.25" />
                                  <stop offset="100%" stopColor="var(--adm-accent)" stopOpacity="0" />
                                </linearGradient>
                              </defs>
                              <path d={areaD} fill="url(#clickAreaGrad)" />
                              <path d={pathD} fill="none" stroke="var(--adm-accent)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />

                              {points.map((p, i) => (
                                <g key={i}>
                                  <circle cx={p.x} cy={p.y} r="5" fill="var(--adm-card)" stroke={p.color} strokeWidth="2.5" />
                                  <text x={p.x} y={p.y - 12} textAnchor="middle" fontSize="10" fontWeight="bold" fill="var(--adm-text)">
                                    {p.clicks}
                                  </text>
                                  <text x={p.x} y={padding.top + innerH + 18} textAnchor="middle" fontSize="9" fill="var(--adm-text)">
                                    {p.name.length > 10 ? p.name.slice(0, 8) + '…' : p.name}
                                  </text>
                                  <text x={p.x} y={padding.top + innerH + 32} textAnchor="middle" fontSize="8" fill="var(--adm-text-secondary)">
                                    {p.platformName}
                                  </text>
                                </g>
                              ))}
                            </>
                          )
                        })()}

                        {/* X轴线 */}
                        <line x1={padding.left} y1={padding.top + innerH} x2={padding.left + innerW} y2={padding.top + innerH} stroke="var(--adm-border)" strokeWidth="1.5" />
                      </svg>

                      {/* 图例 */}
                      <div className="flex flex-wrap gap-3 mt-3 justify-center">
                        {accountClickData.map((a, i) => (
                          <div key={i} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg" style={{ backgroundColor: a.bgColor }}>
                            <div className="w-4 h-4 rounded-full flex items-center justify-center" style={{ backgroundColor: 'white' }}>
                              <a.Icon size={10} style={{ color: a.color }} />
                            </div>
                            <span className="text-xs font-medium" style={{ color: 'var(--adm-text)' }}>{a.name}</span>
                            <span className="text-xs" style={{ color: 'var(--adm-text-secondary)' }}>· {a.clicks} clicks</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })()}

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--adm-card)', border: '1px solid var(--adm-border)' }}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-semibold" style={{ color: 'var(--adm-text)' }}>Traffic by Platform</h3>
                  <PieChart size={16} style={{ color: 'var(--adm-accent)' }} />
                </div>
                <div className="space-y-3">
                  {Object.entries(referralStats?.clicksByPlatform || {}).map(([platform, clicks]) => {
                    const pInfo = PLATFORMS.find(p => p.id === platform) || { name: platform, color: '#6366F1', bgColor: '#EEF2FF', icon: Globe }
                    const total = referralStats?.totalClicks || 1
                    const percentage = Math.round(((clicks as number) / total) * 100)
                    return (
                      <div key={platform}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: pInfo.bgColor }}>
                              {pInfo.icon && <pInfo.icon size={16} style={{ color: pInfo.color }} />}
                            </div>
                            <span className="text-sm font-medium" style={{ color: 'var(--adm-text)' }}>{pInfo.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium" style={{ color: 'var(--adm-text-secondary)' }}>{percentage}%</span>
                            <span className="text-sm font-bold" style={{ color: 'var(--adm-text)' }}>{clicks as number}</span>
                          </div>
                        </div>
                        <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--adm-input)' }}>
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${percentage}%`, backgroundColor: pInfo.color }}
                          />
                        </div>
                      </div>
                    )
                  })}
                  {Object.keys(referralStats?.clicksByPlatform || {}).length === 0 && (
                    <div className="text-center py-8" style={{ color: 'var(--adm-text-secondary)' }}>
                      <GlobeIcon size={32} className="mx-auto mb-2 opacity-30" style={{ color: 'var(--adm-text-secondary)' }} />
                      <p className="text-sm">No traffic data yet</p>
                      <p className="text-xs mt-1">Start sharing referral links to track performance</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--adm-card)', border: '1px solid var(--adm-border)' }}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-semibold" style={{ color: 'var(--adm-text)' }}>Revenue by Platform</h3>
                  <BarChart size={16} style={{ color: '#EC4899' }} />
                </div>
                <div className="space-y-3">
                  {Object.entries(referralStats?.revenueByPlatform || {})
                    .sort((a, b) => (b[1] as number) - (a[1] as number))
                    .map(([platform, revenue]) => {
                      const pInfo = PLATFORMS.find(p => p.id === platform) || { name: platform, color: '#6366F1', bgColor: '#EEF2FF', icon: Globe }
                      const total = referralStats?.totalRevenue || 1
                      const percentage = Math.round(((revenue as number) / total) * 100)
                      return (
                        <div key={platform}>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              {pInfo.icon && <pInfo.icon size={14} style={{ color: pInfo.color }} />}
                              <span className="text-sm font-medium" style={{ color: 'var(--adm-text)' }}>{pInfo.name}</span>
                            </div>
                            <span className="text-sm font-bold" style={{ color: 'var(--adm-text)' }}>${(revenue as number).toLocaleString()}</span>
                          </div>
                          <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--adm-input)' }}>
                            <div
                              className="h-full rounded-full transition-all"
                              style={{ width: `${percentage}%`, backgroundColor: pInfo.color }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  {Object.keys(referralStats?.revenueByPlatform || {}).length === 0 && (
                    <div className="text-center py-8" style={{ color: 'var(--adm-text-secondary)' }}>
                      <DollarSign size={32} className="mx-auto mb-2 opacity-30" style={{ color: 'var(--adm-text-secondary)' }} />
                      <p className="text-sm">No revenue data yet</p>
                      <p className="text-xs mt-1">Wait for conversions to appear</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--adm-card)', border: '1px solid var(--adm-border)' }}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-semibold" style={{ color: 'var(--adm-text)' }}>Top Performers</h3>
                  <Trophy size={16} style={{ color: '#F59E0B' }} />
                </div>
                <div className="space-y-3">
                  {referralStats?.clicksByStaff && Object.entries(referralStats.clicksByStaff as Record<string, { revenue: number; clicks: number; conversions: number; name: string; avatar?: string }>)
                    .sort((a, b) => (b[1].revenue || 0) - (a[1].revenue || 0))
                    .slice(0, 5)
                    .map(([staffId, data], index) => (
                      <div
                        key={staffId}
                        className="flex items-center gap-3 p-3 rounded-xl"
                        style={{ backgroundColor: 'var(--adm-input)' }}
                      >
                        <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm"
                          style={{
                            backgroundColor: index === 0 ? '#FCD34D' : index === 1 ? '#E5E7EB' : index === 2 ? '#F59E0B' : 'var(--adm-accent-bg)',
                            color: index === 0 ? '#78350F' : index === 1 ? '#374151' : index === 2 ? '#92400E' : 'var(--adm-accent)',
                          }}
                        >
                          {index + 1}
                        </div>
                        <div className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden" style={{ backgroundColor: 'var(--adm-card)' }}>
                          {data.avatar ? (
                            <img src={data.avatar} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <User size={20} style={{ color: 'var(--adm-text-secondary)' }} />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate" style={{ color: 'var(--adm-text)' }}>{data.name}</p>
                          <p className="text-xs" style={{ color: 'var(--adm-text-secondary)' }}>
                            {data.clicks} clicks | {data.conversions} conversions
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold" style={{ color: 'var(--adm-text)' }}>${data.revenue.toLocaleString()}</p>
                          <p className="text-xs" style={{ color: '#22c55e' }}>
                            {data.clicks > 0 ? Math.round((data.conversions / data.clicks) * 100) : 0}% CR
                          </p>
                        </div>
                      </div>
                    ))}
                  {(!referralStats?.clicksByStaff || Object.keys(referralStats.clicksByStaff).length === 0) && (
                    <div className="text-center py-8" style={{ color: 'var(--adm-text-secondary)' }}>
                      <Users2 size={32} className="mx-auto mb-2 opacity-30" style={{ color: 'var(--adm-text-secondary)' }} />
                      <p className="text-sm">No staff performance data</p>
                      <p className="text-xs mt-1">Create referral links for your team</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--adm-card)', border: '1px solid var(--adm-border)' }}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-semibold" style={{ color: 'var(--adm-text)' }}>Recent Visitors</h3>
                  <Activity size={16} style={{ color: '#EC4899' }} />
                </div>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {recentClicks.slice(0, 10).map(click => {
                    const pInfo = PLATFORMS.find(p => p.id === click.platform) || { name: click.platform, color: '#6366F1', bgColor: '#EEF2FF', icon: Globe }
                    const timeAgo = (Date.now() - new Date(click.createdAt).getTime()) / 1000
                    let timeText = ''
                    if (timeAgo < 60) timeText = 'just now'
                    else if (timeAgo < 3600) timeText = `${Math.floor(timeAgo / 60)}m ago`
                    else if (timeAgo < 86400) timeText = `${Math.floor(timeAgo / 3600)}h ago`
                    else timeText = `${Math.floor(timeAgo / 86400)}d ago`
                    return (
                      <div key={click.id} className="flex items-center gap-3 p-2 rounded-lg" style={{ backgroundColor: 'var(--adm-input)' }}>
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: pInfo.bgColor || '#EEF2FF' }}>
                          {pInfo.icon && <pInfo.icon size={14} style={{ color: pInfo.color }} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate" style={{ color: 'var(--adm-text)' }}>{click.page}</p>
                          <p className="text-[10px]" style={{ color: 'var(--adm-text-secondary)' }}>{timeText}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          {pInfo.icon && <pInfo.icon size={12} style={{ color: pInfo.color }} />}
                        </div>
                      </div>
                    )
                  })}
                  {recentClicks.length === 0 && (
                    <div className="text-center py-8" style={{ color: 'var(--adm-text-secondary)' }}>
                      <Eye size={32} className="mx-auto mb-2 opacity-30" style={{ color: 'var(--adm-text-secondary)' }} />
                      <p className="text-sm">No visitor activity</p>
                      <p className="text-xs mt-1">Visitors will appear here</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--adm-card)', border: '1px solid var(--adm-border)' }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold" style={{ color: 'var(--adm-text)' }}>Top Referral Links</h3>
                <button
                  onClick={() => setActiveTab('referrals')}
                  className="text-sm flex items-center gap-1"
                  style={{ color: 'var(--adm-accent)' }}
                >
                  View All <ChevronRight size={14} />
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--adm-text-secondary)', borderBottom: '1px solid var(--adm-border)' }}>
                        Staff
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--adm-text-secondary)', borderBottom: '1px solid var(--adm-border)' }}>
                        Platform
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--adm-text-secondary)', borderBottom: '1px solid var(--adm-border)' }}>
                        Link
                      </th>
                      <th className="text-center py-3 px-4 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--adm-text-secondary)', borderBottom: '1px solid var(--adm-border)' }}>
                        Clicks
                      </th>
                      <th className="text-center py-3 px-4 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--adm-text-secondary)', borderBottom: '1px solid var(--adm-border)' }}>
                        Conversions
                      </th>
                      <th className="text-right py-3 px-4 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--adm-text-secondary)', borderBottom: '1px solid var(--adm-border)' }}>
                        Revenue
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {referralLinks.filter(link =>
                      socialContent.some(c => c.status === 'published' && c.referralLinkId === link.id)
                    ).map(link => {
                      const pInfo = PLATFORMS.find(p => p.id === link.platform) || { name: link.platform, color: '#6366F1', bgColor: '#EEF2FF', icon: Globe }
                      return (
                        <tr key={link.id}>
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden" style={{ backgroundColor: 'var(--adm-input)' }}>
                                {link.staffAvatar ? (
                                  <img src={link.staffAvatar} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <User size={16} style={{ color: 'var(--adm-text-secondary)' }} />
                                )}
                              </div>
                              <span className="text-sm font-medium" style={{ color: 'var(--adm-text)' }}>{link.staffName}</span>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2">
                              {pInfo.icon && <pInfo.icon size={16} style={{ color: pInfo.color }} />}
                              <span className="text-sm" style={{ color: 'var(--adm-text)' }}>{pInfo.name}</span>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2">
                              <code className="text-xs font-mono px-2 py-1 rounded" style={{ backgroundColor: 'var(--adm-input)', color: 'var(--adm-text-secondary)' }}>
                                {link.code}
                              </code>
                              <button
                                onClick={() => handleCopy(link.url)}
                                className="p-1 rounded hover:opacity-70"
                                style={{ color: 'var(--adm-text-secondary)' }}
                              >
                                <Copy size={14} />
                              </button>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-center">
                            <span className="text-sm font-semibold" style={{ color: 'var(--adm-text)' }}>{link.clicks}</span>
                          </td>
                          <td className="py-4 px-4 text-center">
                            <span className="text-sm font-semibold" style={{ color: '#22c55e' }}>{link.conversions}</span>
                          </td>
                          <td className="py-4 px-4 text-right">
                            <span className="text-sm font-bold" style={{ color: 'var(--adm-text)' }}>${link.revenue.toLocaleString()}</span>
                          </td>
                        </tr>
                      )
                    })}
                    {referralLinks.filter(link =>
                      socialContent.some(c => c.status === 'published' && c.referralLinkId === link.id)
                    ).length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-8 text-center">
                          <Link2 size={32} className="mx-auto mb-2 opacity-30" style={{ color: 'var(--adm-text-secondary)' }} />
                          <p className="text-sm" style={{ color: 'var(--adm-text-secondary)' }}>No published posts yet. Only completed post publishes appear here.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'studio' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-5">
              {/* 社交账户选择器 - Dashboard 风格 */}
              <div className="rounded-2xl p-4" style={{ backgroundColor: 'var(--adm-card)', border: '1px solid var(--adm-border)' }}>
                <div className="space-y-3">
                  <div className="flex items-center gap-4">
                    <span className="text-xs font-semibold uppercase tracking-wider flex-shrink-0" style={{ color: 'var(--adm-text-secondary)' }}>Staff</span>
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => setSelectedAccount(null)}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl transition-all"
                        style={{
                          backgroundColor: !selectedAccount ? 'var(--adm-accent)' : 'var(--adm-input)',
                          color: !selectedAccount ? 'var(--adm-accent-text)' : 'var(--adm-text)',
                          border: !selectedAccount ? '2px solid var(--adm-accent)' : '2px solid transparent',
                        }}
                      >
                        <Globe2 size={16} />
                        <span className="text-sm font-medium">All Staff</span>
                      </button>
                      {(() => {
                        const connected = isAdmin
                          ? socialAccounts.filter(a => a.status === 'connected')
                          : socialAccounts.filter(a => a.staffId === currentUser?.id && a.status === 'connected')
                        const seen = new Set<string>()
                        const staffList: { staffId: string; staffName: string; staffAvatar?: string }[] = []
                        for (const a of connected) {
                          if (!seen.has(a.staffId)) {
                            seen.add(a.staffId)
                            staffList.push({ staffId: a.staffId, staffName: a.staffName, staffAvatar: a.staffAvatar })
                          }
                        }
                        return staffList.map(s => {
                          const isSelected = selectedAccount?.staffId === s.staffId
                          return (
                            <button
                              key={s.staffId}
                              onClick={() => {
                                if (isSelected) { setSelectedAccount(null); return }
                                const staffAccounts = connected.filter(a => a.staffId === s.staffId)
                                if (staffAccounts.length === 0) return
                                const a = staffAccounts[0]
                                setSelectedAccount({
                                  staffId: s.staffId,
                                  staffName: s.staffName,
                                  platform: a.platform,
                                  accountId: a.id,
                                  accountUsername: a.username,
                                })
                              }}
                              className="flex items-center gap-2 px-3 py-2 rounded-xl transition-all"
                              style={{
                                backgroundColor: isSelected ? 'var(--adm-accent-bg)' : 'var(--adm-input)',
                                border: isSelected ? '2px solid var(--adm-accent)' : '2px solid transparent',
                              }}
                            >
                              <div className="w-7 h-7 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0" style={{ backgroundColor: 'var(--adm-card)' }}>
                                {s.staffAvatar ? (
                                  <img src={s.staffAvatar} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <User size={14} style={{ color: 'var(--adm-text-secondary)' }} />
                                )}
                              </div>
                              <span className="text-sm font-medium" style={{ color: isSelected ? 'var(--adm-accent)' : 'var(--adm-text)' }}>{s.staffName}</span>
                              {isSelected && <X size={12} className="ml-1 opacity-50" style={{ color: 'var(--adm-accent)' }} />}
                            </button>
                          )
                        })
                      })()}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs font-semibold uppercase tracking-wider flex-shrink-0" style={{ color: 'var(--adm-text-secondary)' }}>Platform</span>
                    <div className="flex items-center gap-2 flex-wrap">
                      {PLATFORMS.map(platform => {
                        const isSelected = selectedAccount?.platform === platform.id
                        const hasAccount = (() => {
                          const connected = isAdmin
                            ? socialAccounts.filter(a => a.status === 'connected')
                            : socialAccounts.filter(a => a.staffId === currentUser?.id && a.status === 'connected')
                          const staffId = selectedAccount?.staffId
                          if (staffId) return connected.some(a => a.staffId === staffId && a.platform === platform.id)
                          return connected.some(a => a.platform === platform.id)
                        })()
                        return (
                          <button
                            key={platform.id}
                            onClick={() => {
                              if (isSelected) { setSelectedAccount(null); return }
                              const connected = isAdmin
                                ? socialAccounts.filter(a => a.status === 'connected')
                                : socialAccounts.filter(a => a.staffId === currentUser?.id && a.status === 'connected')
                              const staffId = selectedAccount?.staffId
                              let candidates = staffId
                                ? connected.filter(a => a.staffId === staffId && a.platform === platform.id)
                                : connected.filter(a => a.platform === platform.id)
                              if (candidates.length === 0) return
                              const a = candidates[0]
                              setSelectedAccount({
                                staffId: a.staffId,
                                staffName: a.staffName,
                                platform: a.platform,
                                accountId: a.id,
                                accountUsername: a.username,
                              })
                            }}
                            disabled={!hasAccount}
                            className="relative p-2.5 rounded-xl transition-all flex items-center gap-2"
                            style={{
                              backgroundColor: isSelected ? platform.bgColor : 'var(--adm-input)',
                              border: isSelected ? `2px solid ${platform.color}` : '2px solid transparent',
                              opacity: hasAccount ? 1 : 0.35,
                              cursor: hasAccount ? 'pointer' : 'not-allowed',
                            }}
                            title={`${platform.name}${!hasAccount ? ' (no connected account)' : ''}`}
                          >
                            <platform.icon size={20} style={{ color: isSelected ? platform.color : 'var(--adm-text-secondary)' }} />
                            <span className="text-xs font-medium hidden sm:inline" style={{ color: isSelected ? platform.color : 'var(--adm-text-secondary)' }}>{platform.name}</span>
                            {isSelected && <Check size={14} style={{ color: platform.color }} />}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl p-5" style={{ backgroundColor: 'var(--adm-card)', border: '1px solid var(--adm-border)' }}>
                <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--adm-text)' }}>
                  <Package size={16} style={{ color: 'var(--adm-accent)' }} />
                  Select Product
                </h3>
                <div className="relative">
                  <div
                    className="w-full px-4 py-3 rounded-lg cursor-pointer flex items-center gap-3 transition-colors adm-hover-bg"
                    style={{ backgroundColor: 'var(--adm-input)', border: '1px solid var(--adm-input-border)' }}
                    onClick={() => setShowProductDropdown(!showProductDropdown)}
                  >
                    {selectedProduct ? (
                      <>
                        {selectedProduct.image && <img src={selectedProduct.image} alt="" className="w-10 h-10 rounded object-cover" />}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate" style={{ color: 'var(--adm-text)' }}>{selectedProduct.name || selectedProduct.nameEn}</p>
                          <p className="text-xs" style={{ color: 'var(--adm-text-secondary)' }}>${selectedProduct.price}</p>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedProduct(null); setProductSearch('') }}
                          className="p-1 rounded hover:opacity-70"
                          style={{ color: 'var(--adm-text-secondary)' }}
                        >
                          <X size={14} />
                        </button>
                      </>
                    ) : (
                      <>
                        <Search size={16} style={{ color: 'var(--adm-text-secondary)' }} />
                        <span className="text-sm" style={{ color: 'var(--adm-text-secondary)' }}>Search and select a product...</span>
                      </>
                    )}
                    {showProductDropdown ? <ChevronUp size={16} style={{ color: 'var(--adm-text-secondary)' }} /> : <ChevronDown size={16} style={{ color: 'var(--adm-text-secondary)' }} />}
                  </div>
                  {showProductDropdown && (
                    <div className="absolute z-20 w-full mt-2 rounded-lg border overflow-hidden max-h-64 overflow-y-auto" style={{ backgroundColor: 'var(--adm-card)', borderColor: 'var(--adm-border)' }}>
                      <div className="p-2 border-b" style={{ borderColor: 'var(--adm-border)' }}>
                        <div className="relative">
                          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--adm-text-secondary)' }} />
                          <input
                            type="text"
                            value={productSearch}
                            onChange={e => setProductSearch(e.target.value)}
                            placeholder="Search products..."
                            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg"
                            style={{ backgroundColor: 'var(--adm-input)', border: '1px solid var(--adm-input-border)', color: 'var(--adm-text)' }}
                            onClick={e => e.stopPropagation()}
                          />
                        </div>
                      </div>
                      <div className="max-h-48 overflow-y-auto">
                        {filteredProducts.length === 0 ? (
                          <div className="p-4 text-center text-sm" style={{ color: 'var(--adm-text-secondary)' }}>No products found</div>
                        ) : (
                          filteredProducts.map((product: any) => (
                            <div
                              key={product.id}
                              onClick={(e) => { e.stopPropagation(); setSelectedProduct(product); setShowProductDropdown(false); setProductSearch('') }}
                              className="flex items-center gap-3 p-3 cursor-pointer transition-colors adm-hover-bg"
                              style={{ borderBottom: '1px solid var(--adm-border)' }}
                            >
                              {product.image && <img src={product.image} alt="" className="w-10 h-10 rounded object-cover" />}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate" style={{ color: 'var(--adm-text)' }}>{product.name || product.nameEn}</p>
                                <p className="text-xs" style={{ color: 'var(--adm-text-secondary)' }}>${product.price}</p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-2xl p-5" style={{ backgroundColor: 'var(--adm-card)', border: '1px solid var(--adm-border)' }}>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--adm-text)' }}>
                  <Globe size={16} style={{ color: 'var(--adm-accent)' }} />
                  Platform <span style={{ color: '#ef4444' }}>*</span>
                </h3>
                <div className="grid grid-cols-4 gap-2">
                  {PLATFORMS.map(platform => {
                    const isSelected = selectedPlatform === platform.id
                    const hasSelectedAccount = selectedAccount?.platform === platform.id
                    return (
                      <button
                        key={platform.id}
                        onClick={() => { setSelectedPlatform(platform.id); setPhoneAccountId(''); setPhoneTab('profile') }}
                        className="p-3 rounded-xl border transition-all text-center"
                        style={{
                          backgroundColor: isSelected ? platform.bgColor : 'var(--adm-input)',
                          borderColor: isSelected ? platform.color : hasSelectedAccount ? platform.color : 'var(--adm-input-border)',
                          borderWidth: isSelected ? '2px' : hasSelectedAccount ? '1.5px' : '1px',
                          borderStyle: hasSelectedAccount && !isSelected ? 'dashed' : 'solid',
                        }}
                      >
                        <platform.icon size={20} style={{ color: isSelected ? platform.color : 'var(--adm-text-secondary)' }} className="mx-auto mb-1" />
                        <div className="text-xs font-medium" style={{ color: 'var(--adm-text)' }}>{platform.name}</div>
                        {hasSelectedAccount && !isSelected && (
                          <div className="text-[9px] mt-0.5" style={{ color: platform.color }}>@{selectedAccount?.accountUsername}</div>
                        )}
                      </button>
                    )
                  })}
                </div>
                {/* Show selected publishing account */}
                {selectedAccount && selectedAccount.platform === selectedPlatform && (
                  <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg" style={{ backgroundColor: 'var(--adm-accent-bg)' }}>
                    <User size={14} style={{ color: 'var(--adm-accent)' }} />
                    <span className="text-xs" style={{ color: 'var(--adm-accent)' }}>
                      Publishing as <strong>{selectedAccount.staffName}</strong> @{selectedAccount.accountUsername}
                    </span>
                  </div>
                )}
              </div>

              <div className="rounded-2xl p-5" style={{ backgroundColor: 'var(--adm-card)', border: '1px solid var(--adm-border)' }}>
                <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--adm-text)' }}>
                  <FileText size={16} style={{ color: 'var(--adm-accent)' }} />
                  Content Type <span style={{ color: '#ef4444' }}>*</span>
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {CONTENT_TYPES.map(type => (
                    <button
                      key={type.id}
                      onClick={() => setSelectedType(type.id)}
                      className="p-3 rounded-xl border text-left transition-all"
                      style={{
                        backgroundColor: selectedType === type.id ? 'var(--adm-accent-bg)' : 'var(--adm-input)',
                        borderColor: selectedType === type.id ? 'var(--adm-accent)' : 'var(--adm-input-border)',
                        borderWidth: selectedType === type.id ? '2px' : '1px',
                      }}
                    >
                      <div className="text-sm font-medium mb-0.5" style={{ color: 'var(--adm-text)' }}>{type.name}</div>
                      <div className="text-xs" style={{ color: 'var(--adm-text-secondary)' }}>{type.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl p-5" style={{ backgroundColor: 'var(--adm-card)', border: '1px solid var(--adm-border)' }}>
                <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--adm-text)' }}>
                  <Palette size={16} style={{ color: 'var(--adm-accent)' }} />
                  Tone of Voice
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  {TONES.map(tone => (
                    <button
                      key={tone.id}
                      onClick={() => setSelectedTone(tone.id)}
                      className="p-2.5 rounded-xl border text-center transition-all"
                      style={{
                        backgroundColor: selectedTone === tone.id ? 'var(--adm-accent-bg)' : 'var(--adm-input)',
                        borderColor: selectedTone === tone.id ? 'var(--adm-accent)' : 'var(--adm-input-border)',
                        borderWidth: selectedTone === tone.id ? '2px' : '1px',
                      }}
                    >
                      <div className="text-xs font-medium" style={{ color: 'var(--adm-text)' }}>{tone.name}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl p-5" style={{ backgroundColor: 'var(--adm-card)', border: '1px solid var(--adm-border)' }}>
                <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--adm-text)' }}>
                  <Lightbulb size={16} style={{ color: 'var(--adm-accent)' }} />
                  Additional Context
                </h3>
                <textarea
                  value={additionalContext}
                  onChange={e => setAdditionalContext(e.target.value)}
                  placeholder="e.g., Summer sale 20% off, new collection launch, holiday special, target audience details..."
                  rows={3}
                  className="w-full px-3 py-2 text-sm rounded-lg resize-none"
                  style={{ backgroundColor: 'var(--adm-input)', border: '1px solid var(--adm-input-border)', color: 'var(--adm-text)' }}
                />
                <div className="mt-3 flex items-center gap-3">
                  <span className="text-xs" style={{ color: 'var(--adm-text-secondary)' }}>Language:</span>
                  <button
                    onClick={() => setLanguage('en')}
                    className="px-3 py-1 text-xs rounded-lg transition-colors"
                    style={{
                      backgroundColor: language === 'en' ? 'var(--adm-accent)' : 'var(--adm-input)',
                      color: language === 'en' ? 'var(--adm-accent-text)' : 'var(--adm-text-secondary)',
                    }}
                  >
                    English
                  </button>
                  <button
                    onClick={() => setLanguage('zh')}
                    className="px-3 py-1 text-xs rounded-lg transition-colors"
                    style={{
                      backgroundColor: language === 'zh' ? 'var(--adm-accent)' : 'var(--adm-input)',
                      color: language === 'zh' ? 'var(--adm-accent-text)' : 'var(--adm-text-secondary)',
                    }}
                  >
                    中文
                  </button>
                </div>
              </div>

              {generateError && (
                <div className="rounded-lg p-3 flex items-center gap-2" style={{ backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5' }}>
                  <AlertCircle size={16} style={{ color: '#EF4444', flexShrink: 0 }} />
                  <p className="text-sm" style={{ color: '#DC2626' }}>{generateError}</p>
                </div>
              )}

              <button
                type="button"
                onClick={() => setAutoImage(!autoImage)}
                className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-medium transition-all mb-2"
                style={{
                  backgroundColor: autoImage ? 'var(--adm-accent-bg)' : 'var(--adm-input)',
                  border: `1px solid ${autoImage ? 'var(--adm-accent)' : 'var(--adm-input-border)'}`,
                  color: 'var(--adm-text)',
                }}
              >
                <span className="flex items-center gap-2">
                  <ImageIcon size={14} style={{ color: 'var(--adm-accent)' }} />
                  生成文案后自动生成配图
                </span>
                <span className="w-9 h-5 rounded-full relative transition-all flex-shrink-0" style={{ backgroundColor: autoImage ? 'var(--adm-accent)' : 'var(--adm-border)' }}>
                  <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all" style={{ left: autoImage ? '18px' : '2px' }} />
                </span>
              </button>

              <button
                data-studio-generate
                onClick={handleGenerate}
                disabled={generating}
                className="w-full py-3.5 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ backgroundColor: 'var(--adm-accent)', color: 'var(--adm-accent-text)' }}
              >
                {generating ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    {autoImage ? 'Generating copy & image...' : 'Generating Magic...'}
                  </>
                ) : (
                  <>
                    <Sparkles size={18} />
                    Generate Content
                  </>
                )}
              </button>

              {/* 文案模型选择（跟随大模型库，可临时切换） */}
              <div className="flex items-center gap-2 mt-2">
                <label className="text-[11px] font-semibold whitespace-nowrap" style={{ color: 'var(--adm-text-secondary)' }}>
                  文案模型
                </label>
                <select
                  value={copyLLMProvider}
                  onChange={e => {
                    const p = e.target.value
                    setCopyLLMProvider(p)
                    const models = (systemSettings?.aiLLMProviders?.[p]?.models || [])
                    if (models[0]?.id) setCopyLLMModel(models[0].id)
                  }}
                  className="flex-1 min-w-0 px-2.5 py-2 rounded-lg text-xs outline-none"
                  style={{ backgroundColor: 'var(--adm-input)', border: '1px solid var(--adm-input-border)', color: 'var(--adm-text)' }}
                >
                  {(Object.entries(systemSettings?.aiLLMProviders || {}) as [string, any][]).map(([p, conf]) => (
                    <option key={p} value={p}>{p === 'deepseek' ? 'DeepSeek' : p === 'siliconflow' ? '硅基流动' : p === 'openai' ? 'OpenAI' : p === 'qwen' ? '通义千问' : p === 'zhipu' ? '智谱 GLM' : p}</option>
                  ))}
                </select>
                <select
                  value={copyLLMModel}
                  onChange={e => setCopyLLMModel(e.target.value)}
                  className="flex-1 min-w-0 px-2.5 py-2 rounded-lg text-xs outline-none"
                  style={{ backgroundColor: 'var(--adm-input)', border: '1px solid var(--adm-input-border)', color: 'var(--adm-text)' }}
                >
                  {(systemSettings?.aiLLMProviders?.[copyLLMProvider]?.models || []).map((m: any) => (
                    <option key={m.id} value={m.id}>{m.label}</option>
                  ))}
                  {copyLLMModel && !(systemSettings?.aiLLMProviders?.[copyLLMProvider]?.models || []).some((m: any) => m.id === copyLLMModel) && (
                    <option value={copyLLMModel}>自定义：{copyLLMModel}</option>
                  )}
                </select>
              </div>
            </div>

            <div>
              <div className="rounded-2xl overflow-hidden sticky top-6" style={{ backgroundColor: 'var(--adm-card)', border: '1px solid var(--adm-border)' }}>
                {/* 头部标签页切换 */}
                <div className="border-b" style={{ borderColor: 'var(--adm-border)' }}>
                  <div className="flex items-center">
                    {([
                      { id: 'preview', label: 'AI Preview', icon: Wand2 },
                      { id: 'media', label: 'Video & Audio', icon: Film },
                      { id: 'phone', label: 'Mobile App', icon: Smartphone },
                      { id: 'publish', label: 'Publish', icon: Send },
                    ] as const).map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => setRightPanelTab(tab.id)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium transition-colors"
                        style={{
                          color: rightPanelTab === tab.id ? 'var(--adm-accent)' : 'var(--adm-text-secondary)',
                          borderBottom: rightPanelTab === tab.id ? '2px solid var(--adm-accent)' : '2px solid transparent',
                        }}
                      >
                        <tab.icon size={14} />
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-5 min-h-[calc(100vh-150px)]">
                  {/* AI Preview 标签页 */}
                  {rightPanelTab === 'preview' && (
                    <div>
                      {generating && (
                        <div className="flex flex-col items-center justify-center py-20">
                          <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4 animate-pulse" style={{ backgroundColor: 'var(--adm-accent-bg)' }}>
                            <Sparkles size={28} style={{ color: 'var(--adm-accent)' }} />
                          </div>
                          <p className="text-sm font-medium" style={{ color: 'var(--adm-text)' }}>Creating amazing content...</p>
                          <p className="text-xs mt-1" style={{ color: 'var(--adm-text-secondary)' }}>AI is crafting the perfect copy for {platformInfo?.name}</p>
                        </div>
                      )}

                      {!generating && !generatedContent && (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                          <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-4 opacity-30" style={{ backgroundColor: 'var(--adm-input)' }}>
                            <Wand2 size={36} style={{ color: 'var(--adm-text-secondary)' }} />
                          </div>
                          <p className="text-sm font-medium mb-1" style={{ color: 'var(--adm-text)' }}>Ready to create?</p>
                          <p className="text-xs max-w-xs" style={{ color: 'var(--adm-text-secondary)' }}>
                            Select a product, choose your platform and preferences, then click Generate to create amazing marketing content
                          </p>
                        </div>
                      )}

                      {!generating && generatedContent && (
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 items-start">
                          {/* 文案区 */}
                          <div className="space-y-5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: 'var(--adm-accent-bg)', color: 'var(--adm-accent)' }}>
                                文案区
                              </span>
                              {platformInfo?.icon && <platformInfo.icon size={20} style={{ color: platformInfo.color }} />}
                              <p className="text-sm font-semibold" style={{ color: 'var(--adm-text)' }}>{platformInfo?.name} · {CONTENT_TYPES.find(t => t.id === selectedType)?.name}</p>
                            </div>
                            <div className="flex gap-1">
                              {(generatedContent || generatedImages.length > 0 || generatedVideos.length > 0 || publishCaption) && (
                                <button
                                  onClick={handleStartFresh}
                                  className="px-1.5 py-0.5 rounded text-[10px] font-medium flex items-center gap-1"
                                  style={{ backgroundColor: 'var(--adm-input)', color: '#DC2626', border: '1px solid var(--adm-input-border)' }}
                                  title="Clear current content and start a new creation"
                                >
                                  <Plus size={10} /> Start Fresh
                                </button>
                              )}
                              <button
                                onClick={() => saveDraft({})}
                                className="px-1.5 py-0.5 rounded text-[10px] font-medium flex items-center gap-1"
                                style={{ backgroundColor: 'var(--adm-accent-bg)', color: 'var(--adm-accent)', border: '1px solid var(--adm-accent)' }}
                                title="Save current work to drafts (history)"
                              >
                                <Bookmark size={10} /> Save Draft
                              </button>
                              <button
                                onClick={() => generatedContent && handleCopy(generatedContent.content)}
                                className="p-1 rounded"
                                style={{ color: 'var(--adm-text-secondary)' }}
                                title="Copy"
                              >
                                {copied ? <Check size={12} style={{ color: '#22c55e' }} /> : <Copy size={12} />}
                              </button>
                              <button
                                onClick={handleSave}
                                disabled={saving}
                                className="p-1 rounded"
                                style={{ color: 'var(--adm-text-secondary)' }}
                                title="Save"
                              >
                                {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                              </button>
                              <button
                                onClick={handleGenerate}
                                disabled={generating}
                                className="p-1 rounded"
                                style={{ color: 'var(--adm-text-secondary)' }}
                                title="Regenerate"
                              >
                                <RefreshCw size={12} className={generating ? 'animate-spin' : ''} />
                              </button>
                            </div>
                          </div>

                          {/* AI 文案微调 */}
                          <div className="rounded-xl p-2.5 space-y-2" style={{ backgroundColor: 'var(--adm-card)', border: '1px solid var(--adm-border)' }}>
                            <div className="flex items-center gap-1.5">
                              <Sparkles size={12} style={{ color: 'var(--adm-accent)' }} />
                              <span className="text-[11px] font-semibold" style={{ color: 'var(--adm-text)' }}>AI 文案微调</span>
                              <span className="text-[10px]" style={{ color: 'var(--adm-text-secondary)' }}>直接更新正文，同步到发布端</span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {([
                                { id: 'expand', label: '扩写' },
                                { id: 'shorten', label: '精简' },
                                { id: 'rewrite', label: '改写' },
                                { id: 'translate_en', label: '译成英文' },
                                { id: 'translate_zh', label: '译成中文' },
                                { id: 'playful', label: '活泼语气' },
                                { id: 'luxury', label: '奢华语气' },
                                { id: 'minimal', label: '极简语气' },
                                { id: 'storytelling', label: '故事语气' },
                              ] as const).map(t => (
                                <button
                                  key={t.id}
                                  onClick={() => runCopyTool(t.id)}
                                  disabled={!!copyToolAction}
                                  className="px-2.5 py-1 text-[11px] rounded-lg transition-all disabled:opacity-50"
                                  style={{
                                    backgroundColor: copyToolAction === t.id ? 'var(--adm-accent)' : 'var(--adm-input)',
                                    color: copyToolAction === t.id ? 'var(--adm-accent-text)' : 'var(--adm-text-secondary)',
                                    border: '1px solid var(--adm-border)',
                                  }}
                                >
                                  {copyToolAction === t.id ? <Loader2 size={11} className="animate-spin inline mr-1" /> : null}
                                  {t.label}
                                </button>
                              ))}
                            </div>
                            {copyToolResult && (
                              <p className="text-[11px]" style={{ color: copyToolResult.startsWith('已更新') ? '#16a34a' : '#dc2626' }}>{copyToolResult}</p>
                            )}
                          </div>

                          <div>
                            <h4 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--adm-text-secondary)' }}>Headline</h4>
                            <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--adm-input)' }}>
                              <p className="text-xl font-bold" style={{ color: 'var(--adm-text)' }}>{generatedContent.title}</p>
                            </div>
                          </div>

                          {generatedContent.hook && (
                            <div>
                              <h4 className="text-xs font-semibold uppercase tracking-wider mb-2 flex items-center gap-1" style={{ color: 'var(--adm-text-secondary)' }}>
                              <Lightbulb size={12} /> Hook
                            </h4>
                            <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--adm-input)' }}>
                              <p className="text-sm italic" style={{ color: 'var(--adm-text)' }}>"{generatedContent.hook}"</p>
                            </div>
                          </div>
                          )}

                          <div>
                            <h4 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--adm-text-secondary)' }}>Main Content</h4>
                            <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--adm-input)' }}>
                              <div className="max-h-[260px] overflow-y-auto pr-1">
                                <p className="text-[15px] whitespace-pre-wrap leading-relaxed" style={{ color: 'var(--adm-text)' }}>{generatedContent.content}</p>
                              </div>
                              <div className="mt-2 pt-2 flex items-center justify-between" style={{ borderTop: '1px solid var(--adm-border)' }}>
                                <span className="text-[10px]" style={{ color: 'var(--adm-text-secondary)' }}>正文 {generatedContent.content.length} 字</span>
                                <span className="text-[10px]" style={{ color: 'var(--adm-text-secondary)' }}>修改后自动同步发布端</span>
                              </div>
                            </div>
                          </div>

                          {generatedContent.hashtags && generatedContent.hashtags.length > 0 && (
                            <div>
                              <h4 className="text-xs font-semibold uppercase tracking-wider mb-2 flex items-center gap-1" style={{ color: 'var(--adm-text-secondary)' }}>
                                <Hash size={12} /> Hashtags
                              </h4>
                              <div className="flex flex-wrap gap-2">
                                {generatedContent.hashtags.map((tag, i) => (
                                  <span
                                    key={i}
                                    className="px-3 py-1 text-xs rounded-full font-medium"
                                    style={{ backgroundColor: 'var(--adm-accent-bg)', color: 'var(--adm-accent)' }}
                                  >
                                    #{tag}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {generatedContent.suggestedHashtags && generatedContent.suggestedHashtags.length > 0 && (
                            <div>
                              <h4 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--adm-text-secondary)' }}>More Hashtag Ideas</h4>
                              <div className="flex flex-wrap gap-2">
                                {generatedContent.suggestedHashtags.slice(0, 10).map((tag, i) => (
                                  <span
                                    key={i}
                                    className="px-2.5 py-1 text-xs rounded-full"
                                    style={{ backgroundColor: 'var(--adm-input)', color: 'var(--adm-text-secondary)', border: '1px dashed var(--adm-border)' }}
                                  >
                                    #{tag}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {generatedContent.cta && (
                            <div>
                              <h4 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--adm-text-secondary)' }}>Call to Action</h4>
                              <div className="p-3 rounded-lg border-l-4" style={{ backgroundColor: 'var(--adm-input)', borderLeftColor: 'var(--adm-accent)' }}>
                                <p className="text-sm font-medium" style={{ color: 'var(--adm-text)' }}>{generatedContent.cta}</p>
                              </div>
                            </div>
                          )}

                          {generatedContent.tips && generatedContent.tips.length > 0 && (
                            <div>
                              <h4 className="text-xs font-semibold uppercase tracking-wider mb-2 flex items-center gap-1" style={{ color: 'var(--adm-text-secondary)' }}>
                                <Lightbulb size={12} /> Pro Tips
                              </h4>
                              <div className="space-y-2">
                                {generatedContent.tips.map((tip, i) => (
                                  <div key={i} className="flex gap-2 p-2.5 rounded-lg" style={{ backgroundColor: 'var(--adm-input)' }}>
                                    <span className="text-xs font-bold mt-0.5" style={{ color: 'var(--adm-accent)' }}>{i + 1}</span>
                                    <p className="text-xs" style={{ color: 'var(--adm-text)' }}>{tip}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          </div>

                          {/* 图片区 */}
                          <div className="space-y-4 self-start xl:sticky xl:top-6">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <ImageIcon size={16} style={{ color: 'var(--adm-accent)' }} />
                                <p className="text-sm font-semibold" style={{ color: 'var(--adm-text)' }}>图片区</p>
                                <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--adm-input)', color: 'var(--adm-text-secondary)', border: '1px dashed var(--adm-border)' }}>
                                  {generatedImages.length} generated
                                </span>
                              </div>
                              {generatedImages.length > 0 && (
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => saveDraft({ images: true })}
                                    className="px-2 py-1 rounded-lg text-[11px] font-medium flex items-center gap-1"
                                    style={{ backgroundColor: 'var(--adm-accent-bg)', color: 'var(--adm-accent)', border: '1px solid var(--adm-accent)' }}
                                    title="把当前配图加入草稿箱（历史记录）"
                                  >
                                    <Bookmark size={12} /> 加入草稿箱
                                  </button>
                                  <button onClick={() => { setGeneratedImages([]); setPublishImageUrl('') }} className="p-1.5 rounded-lg" style={{ color: 'var(--adm-text-secondary)' }} title="清空图片">
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              )}
                            </div>

                            {/* 生成模式 */}
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                onClick={() => setGenMode('name')}
                                className="px-3 py-2 rounded-lg text-xs font-medium transition-all"
                                style={{
                                  backgroundColor: genMode === 'name' ? 'var(--adm-accent)' : 'var(--adm-input)',
                                  color: genMode === 'name' ? 'var(--adm-accent-text)' : 'var(--adm-text-secondary)',
                                  border: `1px solid ${genMode === 'name' ? 'var(--adm-accent)' : 'var(--adm-input-border)'}`,
                                }}
                              >
                                按产品名称/描述
                              </button>
                              <button
                                onClick={() => setGenMode('reference')}
                                className="px-3 py-2 rounded-lg text-xs font-medium transition-all"
                                style={{
                                  backgroundColor: genMode === 'reference' ? 'var(--adm-accent)' : 'var(--adm-input)',
                                  color: genMode === 'reference' ? 'var(--adm-accent-text)' : 'var(--adm-text-secondary)',
                                  border: `1px solid ${genMode === 'reference' ? 'var(--adm-accent)' : 'var(--adm-input-border)'}`,
                                }}
                              >
                                参考产品图生成
                              </button>
                            </div>
                            <p className="text-[10px]" style={{ color: 'var(--adm-text-secondary)' }}>
                              {genMode === 'reference'
                                ? '用商品图/上传图作为参考，保持产品主体特征，再按提示词调整场景与氛围'
                                : '仅按文字提示词生成，不使用商品图；想按商品图生成请切换到"参考产品图生成"'}
                            </p>

                            {/* 模型选择（可切换不同生图模型） */}
                            <div className="flex items-center gap-2">
                              <label className="text-[11px] font-semibold whitespace-nowrap" style={{ color: 'var(--adm-text-secondary)' }}>
                                {genMode === 'reference' ? '参考图' : '生成模型'}
                              </label>
                              <select
                                value={genMode === 'reference' ? imageRefProvider : imageProvider}
                                onChange={e => {
                                  const p = e.target.value
                                  if (genMode === 'reference') {
                                    setImageRefProvider(p)
                                    const models = systemSettings?.aiImageProviders?.[p]?.models || IMAGE_MODEL_LISTS[p] || []
                                    const refModels = models.filter((m: any) => /seedream|image-01|z-image|qwen-image|edit|flux/i.test(m.id))
                                    setImageRefModel(String(refModels[1]?.id || refModels[0]?.id || models[0]?.id || ''))
                                  } else {
                                    setImageProvider(p)
                                    const models = systemSettings?.aiImageProviders?.[p]?.models || IMAGE_MODEL_LISTS[p] || []
                                    setImageModel(String(models[0]?.id || ''))
                                  }
                                }}
                                className="flex-1 min-w-0 px-3 py-2 rounded-lg text-xs outline-none"
                                style={{ backgroundColor: 'var(--adm-input)', border: '1px solid var(--adm-input-border)', color: 'var(--adm-text)' }}
                              >
                                {(Object.entries(systemSettings?.aiImageProviders || {}) as [string, any][]).map(([p, conf]) => (
                                  <option key={p} value={p}>{p === 'siliconflow' ? '硅基流动' : p === 'minimax' ? 'MiniMax' : p === 'ark' ? '火山方舟' : p === 'openai' ? 'OpenAI' : p}</option>
                                ))}
                              </select>
                              <select
                                value={genMode === 'reference' ? imageRefModel : imageModel}
                                onChange={e => genMode === 'reference' ? setImageRefModel(e.target.value) : setImageModel(e.target.value)}
                                className="flex-1 min-w-0 px-3 py-2 rounded-lg text-xs outline-none"
                                style={{ backgroundColor: 'var(--adm-input)', border: '1px solid var(--adm-input-border)', color: 'var(--adm-text)' }}
                              >
                                {((genMode === 'reference'
                                  ? systemSettings?.aiImageProviders?.[imageRefProvider]?.models
                                  : systemSettings?.aiImageProviders?.[imageProvider]?.models) || IMAGE_MODEL_LISTS[genMode === 'reference' ? imageRefProvider : imageProvider] || IMAGE_MODEL_LISTS.siliconflow).map((m: any) => (
                                  <option key={m.id} value={m.id}>{m.label}</option>
                                ))}
                                {(genMode === 'reference' ? imageRefModel : imageModel) && !((genMode === 'reference'
                                  ? systemSettings?.aiImageProviders?.[imageRefProvider]?.models
                                  : systemSettings?.aiImageProviders?.[imageProvider]?.models) || IMAGE_MODEL_LISTS[genMode === 'reference' ? imageRefProvider : imageProvider] || IMAGE_MODEL_LISTS.siliconflow).some((m: any) => m.id === (genMode === 'reference' ? imageRefModel : imageModel)) && (
                                  <option value={genMode === 'reference' ? imageRefModel : imageModel}>自定义：{genMode === 'reference' ? imageRefModel : imageModel}</option>
                                )}
                              </select>
                            </div>
                            <p className="text-[10px] flex items-center gap-1" style={{ color: 'var(--adm-text-secondary)' }}>
                              <Sparkles size={11} />
                              {imageProvider === 'ark'
                                ? genMode === 'reference'
                                  ? imageRefProvider !== imageProvider
                                    ? `参考图模式使用独立厂家（${imageRefProvider === 'minimax' ? 'MiniMax' : imageRefProvider === 'ark' ? '火山方舟' : imageRefProvider}），与按名称生成（火山方舟）完全分开`
                                    : '参考图模式使用方舟独立模型（默认 Seedream 4.5），与按名称生成互不影响，可保持商品主体一致'
                                  : '按名称生成使用方舟模型（默认 Seedream 4.0），与参考图模式互不影响'
                                : imageProvider === 'minimax'
                                  ? 'MiniMax image-01：原生支持参考图生成'
                                  : genMode === 'reference'
                                    ? imageRefProvider !== imageProvider
                                      ? `参考图模式使用独立厂家（${imageRefProvider === 'minimax' ? 'MiniMax' : imageRefProvider === 'ark' ? '火山方舟' : imageRefProvider}），需支持图片输入`
                                      : '参考图模式使用图生图模型（需支持图片输入）'
                                    : '按名称生成使用文生图模型'}
                            </p>

                            {genMode === 'reference' && (
                              <div className="rounded-xl p-3 space-y-2" style={{ backgroundColor: 'var(--adm-input)', border: '1px dashed var(--adm-border)' }}>
                                <div className="flex items-center gap-3">
                                  {(referenceImage || selectedProduct?.image) ? (
                                    <img
                                      src={referenceImage || selectedProduct.image}
                                      alt=""
                                      className="w-14 h-14 rounded-lg object-cover"
                                      style={{ border: '1px solid var(--adm-border)' }}
                                    />
                                  ) : (
                                    <div className="w-14 h-14 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--adm-card)' }}>
                                      <ImageIcon size={18} style={{ color: 'var(--adm-text-secondary)' }} />
                                    </div>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium" style={{ color: 'var(--adm-text)' }}>
                                      {referenceImage ? '已上传自定义参考图' : (selectedProduct?.image ? `使用商品主图：${selectedProduct?.name || selectedProduct?.nameEn || ''}` : '无参考图，请上传')}
                                    </p>
                                    <p className="text-[11px]" style={{ color: 'var(--adm-text-secondary)' }}>
                                      参考图 + 提示词生成：火山方舟 Seedream / MiniMax 均可保持产品主体特征；失败时可改用编辑器制作
                                    </p>
                                    {!referenceImage && !selectedProduct?.image && (
                                      <p className="text-[11px] flex items-center gap-1" style={{ color: '#DC2626' }}>
                                        <AlertCircle size={12} /> 当前没有参考图，请上传自定义参考图或选择带主图的商品
                                      </p>
                                    )}
                                  </div>
                                  {referenceImage && (
                                    <button onClick={() => setReferenceImage('')} className="p-1.5 rounded-lg" style={{ color: 'var(--adm-text-secondary)' }} title="移除参考图">
                                      <X size={14} />
                                    </button>
                                  )}
                                </div>
                                <label className="w-full py-2 text-xs rounded-lg border-2 border-dashed cursor-pointer flex items-center justify-center gap-1 transition-colors" style={{ borderColor: 'var(--adm-border)', color: 'var(--adm-text-secondary)' }}>
                                  <Upload size={13} /> 上传自定义参考图
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={e => {
                                      const f = e.target.files?.[0]
                                      if (!f) return
                                      const reader = new FileReader()
                                      reader.onload = () => setReferenceImage(String(reader.result))
                                      reader.readAsDataURL(f)
                                  }}
                                />
                                </label>
                                <div className="pt-1">
                                  <p className="text-[10px] mb-1.5 font-medium" style={{ color: 'var(--adm-text-secondary)' }}>画风微调（自动附加到提示词）</p>
                                  <div className="flex flex-wrap gap-1.5">
                                    {([
                                      { id: 'auto', label: '自动' },
                                      { id: '清新淡雅', label: '清新' },
                                      { id: '高级感', label: '高级' },
                                      { id: '东方国风', label: '国风' },
                                      { id: '极简留白', label: '极简' },
                                      { id: '暗调质感', label: '暗调' },
                                      { id: '节日氛围', label: '节日' },
                                    ] as const).map(s => (
                                      <button
                                        key={s.id}
                                        onClick={() => setStyleKeyword(s.id)}
                                        className="px-2.5 py-1 text-[11px] rounded-lg transition-all"
                                        style={{
                                          backgroundColor: styleKeyword === s.id ? 'var(--adm-accent)' : 'var(--adm-card)',
                                          color: styleKeyword === s.id ? 'var(--adm-accent-text)' : 'var(--adm-text-secondary)',
                                          border: `1px solid ${styleKeyword === s.id ? 'var(--adm-accent)' : 'var(--adm-border)'}`,
                                        }}
                                      >
                                        {s.label}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                                {(referenceImage || selectedProduct?.image) && (
                                  <button
                                    onClick={() => setEditorImage(referenceImage || selectedProduct?.image)}
                                    className="w-full py-2 text-xs rounded-lg flex items-center justify-center gap-1 transition-colors"
                                    style={{ backgroundColor: 'var(--adm-card)', border: '1px solid var(--adm-border)', color: 'var(--adm-accent)' }}
                                  >
                                    <Wand2 size={13} /> 用这张图打开营销编辑器
                                  </button>
                                )}
                              </div>
                            )}

                            {/* Prompt */}
                            <div>
                              <label className="text-xs font-semibold uppercase tracking-wider mb-2 block" style={{ color: 'var(--adm-text-secondary)' }}>
                                Image Prompt
                              </label>
                              <textarea
                                value={imagePrompt}
                                onChange={e => setImagePrompt(e.target.value)}
                                rows={4}
                                placeholder={genMode === 'reference'
                                  ? '描述如何基于参考图生成，如：把产品放在木质餐桌上、换成暖色背景、加节日装饰...'
                                  : '描述你想生成的营销配图（仅按文字生成，不使用商品图；想按商品图生成请切换参考模式）...'}
                                className="w-full px-3 py-2 text-sm rounded-lg resize-none"
                                style={{ backgroundColor: 'var(--adm-input)', border: '1px solid var(--adm-input-border)', color: 'var(--adm-text)' }}
                              />
                              {genMode === 'name' && /参考|商品图|产品图|类似|按照|根据这张|以.{0,4}为参考/.test(imagePrompt) && (
                                <div className="mt-1.5 flex items-center gap-2 rounded-lg px-3 py-2" style={{ backgroundColor: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.35)' }}>
                                  <AlertCircle size={13} style={{ color: '#D97706', flexShrink: 0 }} />
                                  <p className="text-[11px] flex-1" style={{ color: '#B45309' }}>
                                    你的描述提到了"参考商品图"，但当前是文字生成模式，商品图不会被使用
                                  </p>
                                  <button
                                    onClick={() => setGenMode('reference')}
                                    className="px-2.5 py-1 text-[11px] rounded-lg font-medium flex-shrink-0"
                                    style={{ backgroundColor: '#D97706', color: '#fff', border: 'none', cursor: 'pointer' }}
                                  >
                                    切换到参考模式
                                  </button>
                                </div>
                              )}
                            </div>

                            {/* Size + Count + Generate */}
                            <div className="flex items-center gap-2">
                              <select
                                value={imageSize}
                                onChange={e => setImageSize(e.target.value)}
                                className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
                                style={{ backgroundColor: 'var(--adm-input)', border: '1px solid var(--adm-input-border)', color: 'var(--adm-text)' }}
                              >
                                <option value="1024x1024">1024 x 1024</option>
                                <option value="768x1024">768 x 1024（竖版）</option>
                                <option value="1024x768">1024 x 768（横版）</option>
                                <option value="512x512">512 x 512</option>
                              </select>
                              <select
                                value={imageCount}
                                onChange={e => setImageCount(Number(e.target.value))}
                                className="px-2 py-2 rounded-lg text-sm outline-none"
                                style={{ backgroundColor: 'var(--adm-input)', border: '1px solid var(--adm-input-border)', color: 'var(--adm-text)' }}
                              >
                                <option value={1}>1 张</option>
                                <option value={2}>2 张</option>
                                <option value={4}>4 张</option>
                              </select>
                              <button
                                onClick={() => handleGenerateImage()}
                                disabled={generatingImage}
                                className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50"
                                style={{ backgroundColor: 'var(--adm-accent)', color: 'var(--adm-accent-text)' }}
                              >
                                {generatingImage ? (
                                  <>
                                    <Loader2 size={14} className="animate-spin" />
                                    Generating...
                                  </>
                                ) : (
                                  <>
                                    <Sparkles size={14} />
                                    Generate Image
                                  </>
                                )}
                              </button>
                            </div>

                            {imageError && (
                              <div className="rounded-lg p-3 flex items-center gap-2" style={{ backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.35)' }}>
                                <AlertCircle size={14} style={{ color: '#EF4444', flexShrink: 0 }} />
                                <p className="text-xs" style={{ color: '#DC2626' }}>{imageError}</p>
                              </div>
                            )}

                            {/* Image grid */}
                            <div className="space-y-3">
                              {generatingImage && (
                                <div className="relative rounded-xl overflow-hidden flex items-center justify-center" style={{ backgroundColor: 'var(--adm-input)', border: '1px solid var(--adm-border)', aspectRatio: '1/1' }}>
                                  <div className="flex flex-col items-center justify-center gap-2">
                                    <Loader2 size={22} className="animate-spin" style={{ color: 'var(--adm-accent)' }} />
                                    <p className="text-xs" style={{ color: 'var(--adm-text-secondary)' }}>AI 正在绘制营销配图...</p>
                                  </div>
                                </div>
                              )}
                              {!generatingImage && generatedImages.length === 0 && (
                                <div className="rounded-xl flex flex-col items-center justify-center py-12 text-center" style={{ backgroundColor: 'var(--adm-input)', border: '1px dashed var(--adm-border)' }}>
                                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3 opacity-40" style={{ backgroundColor: 'var(--adm-card)' }}>
                                    <ImageIcon size={26} style={{ color: 'var(--adm-text-secondary)' }} />
                                  </div>
                                  <p className="text-xs font-medium mb-1" style={{ color: 'var(--adm-text)' }}>暂无配图</p>
                                  <p className="text-[11px] max-w-[220px]" style={{ color: 'var(--adm-text-secondary)' }}>
                                    点击 Generate Image 生成营销配图，图片将自动保存到本地
                                  </p>
                                </div>
                              )}
                              {generatedImages.map((url, idx) => (
                                <div key={url + idx} className="group relative rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--adm-input)', border: '1px solid var(--adm-border)' }}>
                                  <img src={url} alt={`Generated ${idx + 1}`} className="w-full object-cover" style={{ maxHeight: 280 }} />
                                  <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto">
                                    <button
                                      onClick={() => setEditorImage(url)}
                                      className="p-1.5 rounded-lg backdrop-blur"
                                      style={{ backgroundColor: 'rgba(0,0,0,0.55)', color: '#fff' }}
                                      title="打开营销图片编辑器"
                                    >
                                      <Wand2 size={14} />
                                    </button>
                                    <button
                                      onClick={() => handleDownloadImage(url)}
                                      className="p-1.5 rounded-lg backdrop-blur"
                                      style={{ backgroundColor: 'rgba(0,0,0,0.55)', color: '#fff' }}
                                      title="下载图片"
                                    >
                                      <Download size={14} />
                                    </button>
                                    <button
                                      onClick={() => {
                                        setGeneratedImages(prev => prev.filter(u => u !== url))
                                        setPublishImageUrl(prev => prev === url ? '' : prev)
                                      }}
                                      className="p-1.5 rounded-lg backdrop-blur"
                                      style={{ backgroundColor: 'rgba(0,0,0,0.55)', color: '#fff' }}
                                      title="移除图片"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>

                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Video & Audio 标签页（视频生成 / 音频工作室 / 视频音频编辑） */}
                  {rightPanelTab === 'media' && (
                    <div>
                      <div className="space-y-4 self-start xl:sticky xl:top-6">
                            {/* ===== 视频区（图生视频）===== */}
                            <div className="rounded-2xl p-4 space-y-3" style={{ backgroundColor: 'var(--adm-card)', border: '1px solid var(--adm-border)' }}>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Film size={16} style={{ color: 'var(--adm-accent)' }} />
                                  <p className="text-sm font-semibold" style={{ color: 'var(--adm-text)' }}>视频区（图生视频）</p>
                                  <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--adm-input)', color: 'var(--adm-text-secondary)', border: '1px dashed var(--adm-border)' }}>
                                    {generatedVideos.length} generated
                                  </span>
                                </div>
                                {generatedVideos.length > 0 && (
                                  <div className="flex gap-1">
                                    <button
                                      onClick={() => saveDraft({ videos: true })}
                                      className="px-2 py-1 rounded-lg text-[11px] font-medium flex items-center gap-1"
                                      style={{ backgroundColor: 'var(--adm-accent-bg)', color: 'var(--adm-accent)', border: '1px solid var(--adm-accent)' }}
                                      title="把当前视频加入草稿箱（历史记录）"
                                    >
                                      <Bookmark size={12} /> 加入草稿箱
                                    </button>
                                    <button onClick={() => { setGeneratedVideos([]); if (publishImageUrl.endsWith('.mp4')) setPublishImageUrl('') }} className="p-1.5 rounded-lg" style={{ color: 'var(--adm-text-secondary)' }} title="清空视频">
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                )}
                              </div>

                              <p className="text-[10px]" style={{ color: 'var(--adm-text-secondary)' }}>
                                用一张起始帧图片（上传图 / 产品主图 / 已生成的营销图）生成动态营销视频，结果自动同步到发布端。
                              </p>

                              {/* 起始帧图片选择 */}
                              {(() => {
                                const options = [
                                  ...(referenceImage ? [{ label: '自定义参考图', url: referenceImage }] : []),
                                  ...(selectedProduct?.image ? [{ label: `商品主图：${selectedProduct?.name || selectedProduct?.nameEn || ''}`, url: selectedProduct.image }] : []),
                                  ...generatedImages.map((u, i) => ({ label: `AI 营销图 ${i + 1}`, url: u })),
                                ]
                                if (options.length === 0) {
                                  return (
                                    <div className="rounded-xl p-3 text-center" style={{ backgroundColor: 'var(--adm-input)', border: '1px dashed var(--adm-border)' }}>
                                      <p className="text-[11px]" style={{ color: 'var(--adm-text-secondary)' }}>
                                        暂无起始帧图片：请在上方上传参考图、选择带主图的商品，或先生成营销图
                                      </p>
                                    </div>
                                  )
                                }
                                const current = videoSourceUrl && options.some(o => o.url === videoSourceUrl)
                                  ? videoSourceUrl
                                  : (options[0]?.url || '')
                                return (
                                  <div className="rounded-xl p-3 space-y-2" style={{ backgroundColor: 'var(--adm-input)', border: '1px solid var(--adm-border)' }}>
                                    <p className="text-[10px] font-medium" style={{ color: 'var(--adm-text-secondary)' }}>起始帧图片</p>
                                    <div className="flex gap-2 overflow-x-auto pb-1">
                                      {options.map(o => {
                                        const isSel = current === o.url
                                        return (
                                          <button
                                            key={o.url}
                                            onClick={() => setVideoSourceUrl(o.url)}
                                            className="relative flex-shrink-0 rounded-lg overflow-hidden transition-all"
                                            style={{ border: isSel ? '3px solid var(--adm-accent)' : '3px solid var(--adm-border)', opacity: current && !isSel ? 0.6 : 1 }}
                                            title={o.label}
                                          >
                                            <img src={o.url} alt="" className="w-14 h-14 object-cover" />
                                            {isSel && (
                                              <span className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--adm-accent)' }}>
                                                <Check size={10} style={{ color: 'var(--adm-accent-text)' }} />
                                              </span>
                                            )}
                                          </button>
                                        )
                                      })}
                                    </div>
                                  </div>
                                )
                              })()}

                              {/* 动作提示词 */}
                              <div>
                                <label className="text-[10px] font-semibold uppercase tracking-wider mb-1.5 block" style={{ color: 'var(--adm-text-secondary)' }}>
                                  Motion Prompt
                                </label>
                                <textarea
                                  value={videoPrompt}
                                  onChange={e => setVideoPrompt(e.target.value)}
                                  rows={3}
                                  placeholder="描述画面运动，如：镜头缓慢推进，产品在柔和灯光下缓缓旋转，背景光斑流动，电影感运镜"
                                  className="w-full px-3 py-2 text-sm rounded-lg resize-none"
                                  style={{ backgroundColor: 'var(--adm-input)', border: '1px solid var(--adm-input-border)', color: 'var(--adm-text)' }}
                                />
                              </div>

                              {/* 模型选择 */}
                              <div className="flex items-center gap-2">
                                <label className="text-[11px] font-semibold whitespace-nowrap" style={{ color: 'var(--adm-text-secondary)' }}>视频模型</label>
                                <select
                                  value={videoProvider || Object.keys(systemSettings?.aiVideoProviders || { ark: 1 })[0] || 'ark'}
                                  onChange={e => {
                                    const p = e.target.value
                                    setVideoProvider(p)
                                    const models = systemSettings?.aiVideoProviders?.[p]?.models || []
                                    setVideoModel(String(models[0]?.id || ''))
                                  }}
                                  className="flex-1 min-w-0 px-3 py-2 rounded-lg text-xs outline-none"
                                  style={{ backgroundColor: 'var(--adm-input)', border: '1px solid var(--adm-input-border)', color: 'var(--adm-text)' }}
                                >
                                  {(Object.entries(systemSettings?.aiVideoProviders || {}) as [string, any][]).map(([p, conf]) => (
                                    <option key={p} value={p}>{p === 'ark' ? '火山方舟（Seedance）' : p === 'minimax' ? 'MiniMax（H3 / Video-01）' : p}</option>
                                  ))}
                                </select>
                                <select
                                  value={videoModel}
                                  onChange={e => setVideoModel(e.target.value)}
                                  className="flex-1 min-w-0 px-3 py-2 rounded-lg text-xs outline-none"
                                  style={{ backgroundColor: 'var(--adm-input)', border: '1px solid var(--adm-input-border)', color: 'var(--adm-text)' }}
                                >
                                  {(systemSettings?.aiVideoProviders?.[videoProvider || Object.keys(systemSettings?.aiVideoProviders || { ark: 1 })[0] || 'ark']?.models || []).map((m: any) => (
                                    <option key={m.id} value={m.id}>{m.label}</option>
                                  ))}
                                  {videoModel && !(systemSettings?.aiVideoProviders?.[videoProvider]?.models || []).some((m: any) => m.id === videoModel) && (
                                    <option value={videoModel}>自定义：{videoModel}</option>
                                  )}
                                </select>
                              </div>

                              {/* 参数：时长 / 画幅 / 音频 */}
                              <div className="grid grid-cols-3 gap-2">
                                <div>
                                  <label className="text-[10px] font-medium mb-1 block" style={{ color: 'var(--adm-text-secondary)' }}>时长</label>
                                  <select
                                    value={videoDuration}
                                    onChange={e => setVideoDuration(Number(e.target.value))}
                                    className="w-full px-2 py-2 rounded-lg text-xs outline-none"
                                    style={{ backgroundColor: 'var(--adm-input)', border: '1px solid var(--adm-input-border)', color: 'var(--adm-text)' }}
                                  >
                                    <option value={5}>5 秒</option>
                                    <option value={10}>10 秒</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="text-[10px] font-medium mb-1 block" style={{ color: 'var(--adm-text-secondary)' }}>画幅</label>
                                  <select
                                    value={videoRatio}
                                    onChange={e => setVideoRatio(e.target.value)}
                                    className="w-full px-2 py-2 rounded-lg text-xs outline-none"
                                    style={{ backgroundColor: 'var(--adm-input)', border: '1px solid var(--adm-input-border)', color: 'var(--adm-text)' }}
                                  >
                                    <option value="16:9">16:9 横版</option>
                                    <option value="9:16">9:16 竖版</option>
                                    <option value="1:1">1:1 方形</option>
                                    <option value="adaptive">跟随图片</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="text-[10px] font-medium mb-1 block" style={{ color: 'var(--adm-text-secondary)' }}>原生音频</label>
                                  <button
                                    type="button"
                                    onClick={() => setVideoAudio(!videoAudio)}
                                    className="w-full flex items-center justify-between px-2 py-2 rounded-lg text-xs"
                                    style={{ backgroundColor: 'var(--adm-input)', border: '1px solid var(--adm-input-border)', color: 'var(--adm-text)' }}
                                  >
                                    <span>{videoAudio ? '开启' : '关闭'}</span>
                                    <span
                                      className="relative w-8 h-4.5 rounded-full transition-all"
                                      style={{ backgroundColor: videoAudio ? 'var(--adm-accent)' : 'var(--adm-border)', width: 30, height: 18 }}
                                    >
                                      <span
                                        className="absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white shadow transition-all"
                                        style={{ left: videoAudio ? '14px' : '2px', width: 14, height: 14 }}
                                      />
                                    </span>
                                  </button>
                                </div>
                              </div>

                              <button
                                onClick={handleGenerateVideo}
                                disabled={generatingVideo || !((referenceImage || selectedProduct?.image || generatedImages.length > 0))}
                                className="w-full px-4 py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                                style={{ backgroundColor: 'var(--adm-accent)', color: 'var(--adm-accent-text)' }}
                              >
                                {generatingVideo ? (
                                  <>
                                    <Loader2 size={14} className="animate-spin" />
                                    正在生成视频（约 1-3 分钟）...
                                  </>
                                ) : (
                                  <>
                                    <Film size={14} />
                                    Generate Video（图生视频）
                                  </>
                                )}
                              </button>

                              {videoError && (
                                <div className="rounded-lg p-3 flex items-center gap-2" style={{ backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.35)' }}>
                                  <AlertCircle size={14} style={{ color: '#EF4444', flexShrink: 0 }} />
                                  <p className="text-xs" style={{ color: '#DC2626' }}>{videoError}</p>
                                </div>
                              )}

                              {/* 视频结果列表 */}
                              {generatedVideos.length > 0 && (
                                <div className="space-y-3">
                                  {generatedVideos.map((url, idx) => (
                                    <div key={url + idx} className="rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--adm-input)', border: '1px solid var(--adm-border)' }}>
                                      <video src={url} controls className="w-full" style={{ maxHeight: 300, backgroundColor: '#000' }} />
                                      <div className="flex items-center justify-between px-3 py-2">
                                        <span className="text-[10px] flex items-center gap-1" style={{ color: 'var(--adm-text-secondary)' }}>
                                          <Film size={11} /> 视频 {idx + 1}
                                        </span>
                                        <div className="flex gap-1.5">
                                          <button
                                            onClick={() => { setLastGeneratedVideo(url); setRightPanelTab('media') }}
                                            className="px-2.5 py-1 rounded-lg text-[11px] font-medium"
                                            style={{ backgroundColor: 'var(--adm-card)', color: 'var(--adm-accent)', border: '1px solid var(--adm-border)' }}
                                            title="发送到下方编辑区"
                                          >
                                            <Wand2 size={11} className="inline mr-0.5" />编辑
                                          </button>
                                          <button
                                            onClick={() => { setPublishImageUrl(url); setRightPanelTab('publish') }}
                                            className="px-2.5 py-1 rounded-lg text-[11px] font-medium"
                                            style={{ backgroundColor: 'var(--adm-accent)', color: 'var(--adm-accent-text)' }}
                                          >
                                            {publishImageUrl === url ? <><Check size={11} className="inline mr-0.5" />已选</> : '用于发布'}
                                          </button>
                                          <button
                                            onClick={async () => {
                                              try {
                                                const r = await fetch(url)
                                                const blob = await r.blob()
                                                const a = document.createElement('a')
                                                a.href = URL.createObjectURL(blob)
                                                a.download = `marketing-video-${Date.now()}.mp4`
                                                document.body.appendChild(a)
                                                a.click()
                                                a.remove()
                                                URL.revokeObjectURL(a.href)
                                              } catch {
                                                window.open(url, '_blank')
                                              }
                                            }}
                                            className="p-1.5 rounded-lg"
                                            style={{ color: 'var(--adm-text-secondary)' }}
                                            title="下载视频"
                                          >
                                            <Download size={14} />
                                          </button>
                                          <button
                                            onClick={() => {
                                              setGeneratedVideos(prev => prev.filter(v => v !== url))
                                              setPublishImageUrl(prev => prev === url ? '' : prev)
                                            }}
                                            className="p-1.5 rounded-lg"
                                            style={{ color: 'var(--adm-text-secondary)' }}
                                            title="移除视频"
                                          >
                                            <Trash2 size={14} />
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            <AudioStudio
                              library={audioLibrary}
                              setLibrary={setAudioLibrary}
                              selectedAudioUrl={selectedEditorAudio}
                              onSelectAudio={setSelectedEditorAudio}
                            />
                          </div>
                        </div>
                      )}

                  {/* Mobile App 标签页 */}
                  {rightPanelTab === 'phone' && (
                    <div>
                      {!selectedPlatform ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                          <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-4 opacity-30" style={{ backgroundColor: 'var(--adm-input)' }}>
                            <Smartphone size={36} style={{ color: 'var(--adm-text-secondary)' }} />
                          </div>
                          <p className="text-sm font-medium mb-1" style={{ color: 'var(--adm-text)' }}>Select a platform first</p>
                          <p className="text-xs max-w-xs" style={{ color: 'var(--adm-text-secondary)' }}>
                            Choose a platform from the left panel to see the mobile app preview
                          </p>
                        </div>
                      ) : (() => {
                        const pInfo = PLATFORMS.find(p => p.id === selectedPlatform) || { name: selectedPlatform, color: '#6366F1', bgColor: '#EEF2FF', icon: Globe, url: '#' }
                        const account = phoneAccount

                        return (
                          <div className="flex justify-center">
                            <div style={{ width: '268px' }}>
                              <div className="rounded-[2.6rem] p-[3px] mx-auto" style={{ background: 'linear-gradient(145deg, #9ca3af, #374151 28%, #111827 68%, #6b7280)', boxShadow: '0 18px 50px rgba(0,0,0,0.45), inset 0 0 0 1px rgba(255,255,255,0.1)' }}>
                                <div className="rounded-[2.4rem] p-2.5" style={{ backgroundColor: '#0a0a0a' }}>
                                  <div className="relative rounded-[1.9rem] overflow-hidden" style={{ backgroundColor: '#fff', height: '500px' }}>
                                    {/* 灵动岛 */}
                                    <div className="absolute top-2 left-1/2 -translate-x-1/2 z-30 w-[72px] h-[19px] rounded-full" style={{ backgroundColor: '#000' }} />
                                    <div className="flex items-center justify-between px-5 pt-2 pb-1 text-[10px] font-semibold relative z-20" style={{ color: '#111' }}>
                                      <span>{phoneClock || '9:41'}</span>
                                      <div className="flex items-center gap-1">
                                        <Signal size={9} />
                                        <Wifi size={10} />
                                        <span style={{ fontSize: '8px' }}>100%</span>
                                      </div>
                                    </div>

                                  {account ? (
                                    <>
                                      <div className="px-4 py-2 flex items-center gap-2" style={{ backgroundColor: pInfo.color }}>
                                        <pInfo.icon size={16} color="white" />
                                        <span className="text-white font-semibold text-xs flex-1">{pInfo.name}</span>
                                        <div className="flex items-center gap-1">
                                          <div className="w-1.5 h-1.5 rounded-full bg-green-300" />
                                          <span className="text-white text-[9px]">Online</span>
                                        </div>
                                      </div>

                                      <div className="overflow-y-auto" style={{ height: 'calc(100% - 110px)' }}>
                                        {phoneTab === 'profile' && (
                                          <div className="flex flex-col items-center py-5 px-4">
                                            <div className="w-20 h-20 rounded-full flex items-center justify-center overflow-hidden mb-3" style={{ border: `3px solid ${pInfo.color}`, backgroundColor: pInfo.bgColor }}>
                                              {xProfileData?.profileImageUrl ? (
                                                <img src={xProfileData.profileImageUrl} alt="" className="w-full h-full object-cover" />
                                              ) : account.avatar ? (
                                                <img src={account.avatar} alt="" className="w-full h-full object-cover" />
                                              ) : (
                                                <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-white" style={{ backgroundColor: pInfo.color }}>
                                                  {(account.username || account.staffName || '?')[0].toUpperCase()}
                                                </div>
                                              )}
                                            </div>
                                            <p className="font-bold text-sm" style={{ color: '#1a1a1a' }}>
                                              {xProfileData?.name || account.staffName}
                                              {xProfileData?.verified && (
                                                <span className="inline-block ml-1 text-[10px]" style={{ color: '#1DA1F2' }}>✓</span>
                                              )}
                                            </p>
                                            <div className="flex items-center gap-1 mt-0.5">
                                              <AtSign size={10} style={{ color: pInfo.color }} />
                                              <span className="text-xs" style={{ color: '#666' }}>{xProfileData?.username || account.username}</span>
                                            </div>
                                            {xProfileData?.description && (
                                              <p className="text-[9px] text-center mt-2 px-2" style={{ color: '#666' }}>{xProfileData.description}</p>
                                            )}
                                            <div className="mt-2 px-3 py-0.5 rounded-full text-[10px] font-medium flex items-center gap-1" style={{ backgroundColor: '#dcfce7', color: '#16a34a' }}>
                                              <Check size={9} /> Logged in
                                            </div>
                                            <div className="flex gap-5 mt-4">
                                              <div className="text-center">
                                                <p className="text-sm font-bold" style={{ color: '#1a1a1a' }}>
                                                  {xProfileLoading ? '...' : (xProfileData?.tweetsCount ?? 0).toLocaleString()}
                                                </p>
                                                <p className="text-[9px]" style={{ color: '#999' }}>Posts</p>
                                              </div>
                                              <div className="text-center">
                                                <p className="text-sm font-bold" style={{ color: '#1a1a1a' }}>
                                                  {xProfileLoading ? '...' : (xProfileData?.followersCount ?? 0).toLocaleString()}
                                                </p>
                                                <p className="text-[9px]" style={{ color: '#999' }}>Followers</p>
                                              </div>
                                              <div className="text-center">
                                                <p className="text-sm font-bold" style={{ color: '#1a1a1a' }}>
                                                  {xProfileLoading ? '...' : (xProfileData?.followingCount ?? 0).toLocaleString()}
                                                </p>
                                                <p className="text-[9px]" style={{ color: '#999' }}>Following</p>
                                              </div>
                                            </div>
                                            <button
                                              onClick={() => window.open(xProfileData?.url || account.profileUrl || pInfo.url, '_blank')}
                                              className="mt-4 px-5 py-1.5 rounded-lg text-[10px] font-medium text-white"
                                              style={{ backgroundColor: pInfo.color }}
                                            >
                                              View Profile
                                            </button>
                                          </div>
                                        )}

                                        {phoneTab === 'home' && (
                                          <div className="flex flex-col h-full">
                                            {account.platform === 'twitter' ? (
                                              <>
                                                {/* X风格顶部栏 */}
                                                <div className="flex items-center justify-between px-4 py-2" style={{ borderBottom: '1px solid #eff3f4' }}>
                                                  <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0" style={{ border: '1px solid #eff3f4' }}>
                                                    {xProfileData?.profileImageUrl ? (
                                                      <img src={xProfileData.profileImageUrl} alt="" className="w-full h-full object-cover" />
                                                    ) : account.avatar ? (
                                                      <img src={account.avatar} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                      <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-white" style={{ backgroundColor: pInfo.color }}>
                                                        {(account.username || '?')[0].toUpperCase()}
                                                      </div>
                                                    )}
                                                  </div>
                                                  <span className="text-base font-bold" style={{ color: '#0f1419' }}>Home</span>
                                                  <Sparkles size={16} style={{ color: pInfo.color }} />
                                                </div>

                                                {/* 时间线 */}
                                                <div className="flex-1 overflow-y-auto">
                                                  {xTimelineLoading ? (
                                                    <div className="flex flex-col items-center justify-center py-10">
                                                      <Loader2 size={20} className="animate-spin" style={{ color: pInfo.color }} />
                                                      <p className="text-[9px] mt-2" style={{ color: '#999' }}>Loading tweets...</p>
                                                    </div>
                                                  ) : xTimeline.length > 0 ? (
                                                    xTimeline.map((tweet: any, idx: number) => (
                                                      <div key={tweet.id} className="px-3 py-3" style={{ borderBottom: '1px solid #eff3f4' }}>
                                                        <div className="flex gap-2">
                                                          <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0" style={{ border: '1px solid #eff3f4' }}>
                                                            {tweet.author?.profileImageUrl ? (
                                                              <img src={tweet.author.profileImageUrl} alt="" className="w-full h-full object-cover" />
                                                            ) : (
                                                              <div className="w-full h-full flex items-center justify-center text-[11px] font-bold text-white" style={{ backgroundColor: pInfo.color }}>
                                                                {(tweet.author?.name || '?')[0].toUpperCase()}
                                                              </div>
                                                            )}
                                                          </div>
                                                          <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-1">
                                                              <span className="text-[11px] font-bold truncate" style={{ color: '#0f1419' }}>{tweet.author?.name}</span>
                                                              <Check size={9} style={{ color: pInfo.color }} />
                                                              <span className="text-[10px] truncate" style={{ color: '#536471' }}>@{tweet.author?.username}</span>
                                                              <span className="text-[10px]" style={{ color: '#536471' }}>· {formatTime(tweet.createdAt)}</span>
                                                            </div>
                                                            <p className="text-[11px] mt-1 whitespace-pre-wrap break-words" style={{ color: '#0f1419' }}>{tweet.text}</p>
                                                            <div className="flex items-center justify-between mt-2 max-w-[200px]">
                                                              <div className="flex items-center gap-1">
                                                                <MessageSquare size={11} style={{ color: '#536471' }} />
                                                                <span className="text-[9px]" style={{ color: '#536471' }}>{formatCount(tweet.metrics?.replies || 0)}</span>
                                                              </div>
                                                              <div className="flex items-center gap-1">
                                                                <RefreshCw size={11} style={{ color: '#536471' }} />
                                                                <span className="text-[9px]" style={{ color: '#536471' }}>{formatCount(tweet.metrics?.retweets || 0)}</span>
                                                              </div>
                                                              <div className="flex items-center gap-1">
                                                                <Heart size={11} style={{ color: '#536471' }} />
                                                                <span className="text-[9px]" style={{ color: '#536471' }}>{formatCount(tweet.metrics?.likes || 0)}</span>
                                                              </div>
                                                              <div className="flex items-center gap-1">
                                                                <BarChart size={11} style={{ color: '#536471' }} />
                                                                <span className="text-[9px]" style={{ color: '#536471' }}>{formatCount(tweet.metrics?.impressions || 0)}</span>
                                                              </div>
                                                            </div>
                                                          </div>
                                                        </div>
                                                      </div>
                                                    ))
                                                  ) : (
                                                    <div className="flex flex-col items-center justify-center py-10 px-4">
                                                      <div className="w-12 h-12 rounded-full flex items-center justify-center mb-3" style={{ backgroundColor: pInfo.bgColor }}>
                                                        <Twitter size={24} style={{ color: pInfo.color }} />
                                                      </div>
                                                      <p className="text-[11px] font-semibold" style={{ color: '#0f1419' }}>No tweets yet</p>
                                                      <p className="text-[9px] text-center mt-1" style={{ color: '#536471' }}>
                                                        Tap the Create tab to post your first tweet
                                                      </p>
                                                      <button
                                                        onClick={() => setPhoneTab('create')}
                                                        className="mt-3 px-4 py-1.5 rounded-full text-[10px] font-bold text-white"
                                                        style={{ backgroundColor: pInfo.color }}
                                                      >
                                                        Post a tweet
                                                      </button>
                                                    </div>
                                                  )}
                                                </div>
                                              </>
                                            ) : (
                                              <div className="flex flex-col h-full">
                                                {/* 顶栏 */}
                                                <div className="flex items-center justify-between px-4 py-2">
                                                  <span className="text-[13px] font-bold italic" style={{ color: '#1a1a1a' }}>{pInfo.name}</span>
                                                  <div className="flex items-center gap-2.5">
                                                    <Heart size={14} style={{ color: '#1a1a1a' }} />
                                                    <MessageCircle size={14} style={{ color: '#1a1a1a' }} />
                                                  </div>
                                                </div>

                                                {/* 快拍 */}
                                                <div className="flex gap-2.5 px-4 pb-2 overflow-x-auto flex-shrink-0">
                                                  {[
                                                    { label: 'Your story', avatar: account.avatar, isYou: true },
                                                    ...(generatedImages.length ? generatedImages.slice(0, 6).map(u => ({ label: 'Draft', avatar: u, isYou: false })) : []),
                                                  ].map((s, i) => (
                                                    <div key={i} className="flex flex-col items-center flex-shrink-0" style={{ width: 44 }}>
                                                      <div className="w-10 h-10 rounded-full p-[2px]" style={{ background: 'linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)' }}>
                                                        <div className="w-full h-full rounded-full overflow-hidden" style={{ border: '2px solid #fff' }}>
                                                          {s.avatar ? (
                                                            <img src={s.avatar} alt="" className="w-full h-full object-cover" />
                                                          ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-[11px] font-bold text-white" style={{ backgroundColor: pInfo.color }}>
                                                              {(s.label[0] || '?').toUpperCase()}
                                                            </div>
                                                          )}
                                                        </div>
                                                      </div>
                                                      <span className="text-[7px] mt-1 truncate w-full text-center" style={{ color: '#555' }}>{s.label}</span>
                                                    </div>
                                                  ))}
                                                </div>

                                                {/* 帖子信息流 */}
                                                {(() => {
                                                  const postImg = publishImageUrl || (generatedImages.length ? generatedImages[0] : '')
                                                  const caption = publishCaption || generatedContent?.content || ''
                                                  const hashtags = publishHashtags || (generatedContent?.hashtags ? generatedContent.hashtags.map(t => `#${t}`).join(' ') : '')
                                                  if (!postImg && !caption) {
                                                    return (
                                                      <div className="flex flex-col items-center justify-center flex-1 px-4">
                                                        <div className="w-12 h-12 rounded-full flex items-center justify-center mb-3" style={{ backgroundColor: pInfo.bgColor }}>
                                                          <ImageIcon size={22} style={{ color: pInfo.color }} />
                                                        </div>
                                                        <p className="text-[10px] font-semibold" style={{ color: '#1a1a1a' }}>No posts yet</p>
                                                        <p className="text-[8px] text-center mt-1" style={{ color: '#999' }}>去 AI Preview 生成内容，这里会显示真实发布效果</p>
                                                        <button
                                                          onClick={() => setRightPanelTab('preview')}
                                                          className="mt-3 px-4 py-1.5 rounded-lg text-[9px] font-medium text-white"
                                                          style={{ backgroundColor: pInfo.color }}
                                                        >
                                                          Go to Generate
                                                        </button>
                                                      </div>
                                                    )
                                                  }
                                                  return (
                                                    <div className="flex-1 overflow-y-auto">
                                                      <div style={{ borderBottom: '1px solid #f0f0f0' }}>
                                                        <div className="flex items-center gap-2 px-3 py-2">
                                                          <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0" style={{ border: `2px solid ${pInfo.color}` }}>
                                                            {account.avatar ? (
                                                              <img src={account.avatar} alt="" className="w-full h-full object-cover" />
                                                            ) : (
                                                              <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-white" style={{ backgroundColor: pInfo.color }}>
                                                                {(account.username || '?')[0].toUpperCase()}
                                                              </div>
                                                            )}
                                                          </div>
                                                          <div className="flex-1 min-w-0">
                                                            <p className="text-[10px] font-semibold truncate" style={{ color: '#1a1a1a' }}>{account.staffName || account.username}</p>
                                                            <p className="text-[8px] truncate" style={{ color: '#999' }}>{selectedProduct?.name || selectedProduct?.nameEn || pInfo.name}</p>
                                                          </div>
                                                          <MoreHorizontal size={13} style={{ color: '#1a1a1a' }} />
                                                        </div>
                                                        {postImg && (
                                                          <div className="w-full" style={{ aspectRatio: '1/1', backgroundColor: '#fafafa' }}>
                                                            <img src={postImg} alt="" className="w-full h-full object-cover" />
                                                          </div>
                                                        )}
                                                        <div className="flex items-center gap-3 px-3 py-2">
                                                          <Heart size={15} style={{ color: '#1a1a1a' }} />
                                                          <MessageCircle size={15} style={{ color: '#1a1a1a' }} />
                                                          <Send size={15} style={{ color: '#1a1a1a' }} />
                                                          <div className="flex-1" />
                                                          <Bookmark size={15} style={{ color: '#1a1a1a' }} />
                                                        </div>
                                                        <p className="px-3 text-[9px] font-semibold" style={{ color: '#1a1a1a' }}>{(128 + generatedImages.length * 37).toLocaleString()} likes</p>
                                                        {caption && (
                                                          <div className="px-3 mt-1">
                                                            <span className="text-[9px] font-semibold" style={{ color: '#1a1a1a' }}>{account.staffName || account.username} </span>
                                                            <span className="text-[9px]" style={{ color: '#1a1a1a' }}>{caption}</span>
                                                            {hashtags && <p className="text-[9px] mt-0.5" style={{ color: '#00376b' }}>{hashtags}</p>}
                                                          </div>
                                                        )}
                                                        <p className="px-3 mt-1 text-[8px]" style={{ color: '#999' }}>View all 12 comments</p>
                                                        <p className="px-3 pb-2 text-[8px] uppercase" style={{ color: '#999' }}>Just now</p>
                                                      </div>
                                                    </div>
                                                  )
                                                })()}
                                              </div>
                                            )}
                                          </div>
                                        )}

                                        {phoneTab === 'search' && (
                                          <div className="p-3">
                                            <div className="px-3 py-2 rounded-lg mb-3" style={{ backgroundColor: '#f0f0f0' }}>
                                              <p className="text-[10px]" style={{ color: '#999' }}>Search {pInfo.name}...</p>
                                            </div>
                                            <p className="text-[10px] font-semibold mb-2" style={{ color: '#1a1a1a' }}>Trending</p>
                                            {['Low Flame', 'Handmade Crafts', 'Summer Sale'].map((t, i) => (
                                              <div key={i} className="flex items-center gap-2 py-2" style={{ borderBottom: '1px solid #f0f0f0' }}>
                                                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: pInfo.bgColor }}>
                                                  <pInfo.icon size={14} style={{ color: pInfo.color }} />
                                                </div>
                                                <div className="flex-1">
                                                  <p className="text-[10px] font-medium" style={{ color: '#1a1a1a' }}>{t}</p>
                                                  <p className="text-[8px]" style={{ color: '#999' }}>{Math.floor(Math.random() * 5000)} posts</p>
                                                </div>
                                                <TrendingUp size={12} style={{ color: '#22c55e' }} />
                                              </div>
                                            ))}
                                          </div>
                                        )}

                                        {phoneTab === 'create' && (
                                          <div className="flex flex-col h-full">
                                            {account.platform === 'twitter' ? (
                                              <>
                                                {/* 发推顶部栏 */}
                                                <div className="flex items-center justify-between px-3 py-2" style={{ borderBottom: '1px solid #eff3f4' }}>
                                                  <button
                                                    onClick={() => setPhoneTab('home')}
                                                    className="text-[11px] font-medium"
                                                    style={{ color: '#0f1419' }}
                                                  >
                                                    Cancel
                                                  </button>
                                                  <span className="text-[11px] font-bold" style={{ color: '#0f1419' }}>New Post</span>
                                                  <button
                                                    onClick={postTweet}
                                                    disabled={!xTweetText.trim() || xPosting}
                                                    className="px-3 py-1 rounded-full text-[10px] font-bold text-white disabled:opacity-50"
                                                    style={{ backgroundColor: xTweetText.trim() && !xPosting ? pInfo.color : '#aaa' }}
                                                  >
                                                    {xPosting ? (
                                                      <Loader2 size={10} className="animate-spin" />
                                                    ) : xPostSuccess ? (
                                                      <Check size={10} />
                                                    ) : 'Post'}
                                                  </button>
                                                </div>

                                                {/* 输入区 */}
                                                <div className="flex-1 flex flex-col p-3">
                                                  <div className="flex gap-2 flex-1">
                                                    <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0" style={{ border: '1px solid #eff3f4' }}>
                                                      {xProfileData?.profileImageUrl ? (
                                                        <img src={xProfileData.profileImageUrl} alt="" className="w-full h-full object-cover" />
                                                      ) : account.avatar ? (
                                                        <img src={account.avatar} alt="" className="w-full h-full object-cover" />
                                                      ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-[11px] font-bold text-white" style={{ backgroundColor: pInfo.color }}>
                                                          {(account.username || '?')[0].toUpperCase()}
                                                        </div>
                                                      )}
                                                    </div>
                                                    <div className="flex-1 flex flex-col">
                                                      <span className="text-[11px] font-bold" style={{ color: '#0f1419' }}>
                                                        {xProfileData?.name || account.staffName}
                                                      </span>
                                                      <textarea
                                                        value={xTweetText}
                                                        onChange={(e) => setXTweetText(e.target.value)}
                                                        placeholder="What's happening?"
                                                        maxLength={280}
                                                        className="flex-1 mt-1 w-full bg-transparent resize-none outline-none text-[12px] placeholder:text-[#536471]"
                                                        style={{ color: '#0f1419', minHeight: '120px' }}
                                                        autoFocus
                                                      />
                                                    </div>
                                                  </div>

                                                  {/* 字数统计 */}
                                                  <div className="flex items-center justify-between mt-2 pt-2" style={{ borderTop: '1px solid #eff3f4' }}>
                                                    <div className="flex items-center gap-2">
                                                      <ImageIcon size={14} style={{ color: pInfo.color }} />
                                                      <Hash size={14} style={{ color: pInfo.color }} />
                                                      <MapPin size={14} style={{ color: pInfo.color }} />
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                      {xTweetText.length > 0 && (
                                                        <div className="flex items-center gap-1">
                                                          <span className="text-[9px]" style={{ color: xTweetText.length > 250 ? '#f4212e' : '#536471' }}>
                                                            {280 - xTweetText.length}
                                                          </span>
                                                        </div>
                                                      )}
                                                    </div>
                                                  </div>

                                                  {/* 状态提示 */}
                                                  {xPostSuccess && (
                                                    <div className="mt-2 px-3 py-2 rounded-lg flex items-center gap-2" style={{ backgroundColor: '#dcfce7' }}>
                                                      <Check size={12} style={{ color: '#16a34a' }} />
                                                      <span className="text-[10px] font-medium" style={{ color: '#16a34a' }}>Tweet posted successfully!</span>
                                                    </div>
                                                  )}
                                                  {xPostError && (
                                                    <div className="mt-2 px-3 py-2 rounded-lg flex items-center gap-2" style={{ backgroundColor: '#fef2f2' }}>
                                                      <AlertCircle size={12} style={{ color: '#dc2626' }} />
                                                      <span className="text-[10px] font-medium" style={{ color: '#dc2626' }}>{xPostError}</span>
                                                    </div>
                                                  )}
                                                  {xPostSuccess && (
                                                    <button
                                                      onClick={() => { setXPostSuccess(false); setPhoneTab('home') }}
                                                      className="mt-2 w-full py-2 rounded-lg text-[10px] font-medium text-white"
                                                      style={{ backgroundColor: pInfo.color }}
                                                    >
                                                      View on Home
                                                    </button>
                                                  )}
                                                </div>
                                              </>
                                            ) : (
                                              (() => {
                                                const candidates = Array.from(new Set([
                                                  ...(generatedImages.length ? generatedImages : []),
                                                  ...(generatedVideos.length ? generatedVideos : []),
                                                  ...(selectedProduct?.image ? [selectedProduct.image] : []),
                                                ])).filter(Boolean)
                                                const postImg = publishImageUrl || (candidates.length ? candidates[0] : '')
                                                const hashtagText = publishHashtags || (generatedContent?.hashtags ? generatedContent.hashtags.map(t => `#${t}`).join(' ') : '')
                                                return (
                                                  <div className="flex flex-col h-full">
                                                    {/* 顶栏 */}
                                                    <div className="flex items-center px-3 py-2" style={{ borderBottom: '1px solid #efefef' }}>
                                                      <button onClick={() => setPhoneTab('home')} style={{ color: '#1a1a1a' }}>
                                                        <ChevronLeft size={16} />
                                                      </button>
                                                      <span className="flex-1 text-center text-[11px] font-semibold" style={{ color: '#1a1a1a' }}>New post</span>
                                                      <button
                                                        onClick={() => setRightPanelTab('publish')}
                                                        className="text-[10px] font-bold"
                                                        style={{ color: pInfo.color }}
                                                      >
                                                        Share
                                                      </button>
                                                    </div>

                                                    {/* 图片 */}
                                                    {postImg ? (
                                                      <div className="px-3 pt-3">
                                                        <div className="rounded-xl overflow-hidden flex items-center justify-center" style={{ backgroundColor: '#fafafa', border: '1px solid #efefef', maxHeight: 175 }}>
                                                          {/\.(mp4|mov|webm)(\?|$)/i.test(postImg) ? (
                                                            <video src={postImg} controls className="w-full object-cover" style={{ maxHeight: 175 }} />
                                                          ) : (
                                                            <img src={postImg} alt="" className="w-full object-cover" style={{ maxHeight: 175 }} />
                                                          )}
                                                        </div>
                                                        {candidates.length > 1 && (
                                                          <div className="flex gap-1.5 mt-2 overflow-x-auto pb-1">
                                                            {candidates.map((u, i) => (
                                                              <button
                                                                key={u + i}
                                                                onClick={() => setPublishImageUrl(u)}
                                                                className="w-10 h-10 rounded-md overflow-hidden flex-shrink-0"
                                                                style={{ border: (publishImageUrl === u || (!publishImageUrl && i === 0)) ? `2px solid ${pInfo.color}` : '2px solid transparent' }}
                                                              >
                                                                {/\.(mp4|mov|webm)(\?|$)/i.test(u) ? (
                                                                  <video src={u} muted className="w-full h-full object-cover" />
                                                                ) : (
                                                                  <img src={u} alt="" className="w-full h-full object-cover" />
                                                                )}
                                                              </button>
                                                            ))}
                                                          </div>
                                                        )}
                                                      </div>
                                                    ) : (
                                                      <div className="px-3 pt-3">
                                                        <div className="rounded-xl py-10 flex flex-col items-center justify-center" style={{ backgroundColor: '#fafafa', border: '1px dashed #ddd' }}>
                                                          <ImageIcon size={22} style={{ color: '#999' }} />
                                                          <p className="text-[9px] mt-2" style={{ color: '#999' }}>暂无图片素材，去 AI Preview 生成</p>
                                                          <button
                                                            onClick={() => setRightPanelTab('preview')}
                                                            className="mt-3 px-4 py-1.5 rounded-lg text-[10px] font-medium text-white"
                                                            style={{ backgroundColor: pInfo.color }}
                                                          >
                                                            去生成
                                                          </button>
                                                        </div>
                                                      </div>
                                                    )}

                                                    {/* 文案 */}
                                                    <div className="flex-1 flex flex-col p-3">
                                                      <div className="flex gap-2 flex-1">
                                                        <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0" style={{ border: `2px solid ${pInfo.color}` }}>
                                                          {account.avatar ? (
                                                            <img src={account.avatar} alt="" className="w-full h-full object-cover" />
                                                          ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-white" style={{ backgroundColor: pInfo.color }}>
                                                              {(account.username || '?')[0].toUpperCase()}
                                                            </div>
                                                          )}
                                                        </div>
                                                        <div className="flex-1 flex flex-col">
                                                          <span className="text-[10px] font-semibold" style={{ color: '#1a1a1a' }}>{account.staffName || account.username}</span>
                                                          <textarea
                                                            value={publishCaption || generatedContent?.content || ''}
                                                            onChange={e => setPublishCaption(e.target.value)}
                                                            placeholder="写点说明..."
                                                            className="flex-1 mt-1 w-full bg-transparent resize-none outline-none text-[11px] placeholder:text-[#999]"
                                                            style={{ color: '#1a1a1a', minHeight: '100px' }}
                                                          />
                                                          <div className="flex items-center justify-between mt-1">
                                                            <span className="text-[9px]" style={{ color: '#999' }}>{publishCaption.length} 字</span>
                                                            <span className="text-[9px] font-medium truncate ml-2" style={{ color: pInfo.color }}>
                                                              {hashtagText.split(/\s+/).filter(Boolean).slice(0, 5).join(' ')}
                                                            </span>
                                                          </div>
                                                        </div>
                                                      </div>
                                                    </div>

                                                    {/* 底部操作 */}
                                                    <div className="flex items-center justify-between px-4 py-2.5" style={{ borderTop: '1px solid #efefef' }}>
                                                      <div className="flex items-center gap-3" style={{ color: '#333' }}>
                                                        <Heart size={15} />
                                                        <MessageCircle size={15} />
                                                        <Send size={15} />
                                                        <Bookmark size={15} />
                                                      </div>
                                                      <button
                                                        onClick={() => setRightPanelTab('publish')}
                                                        className="px-3 py-1 rounded-lg text-[10px] font-bold text-white"
                                                        style={{ backgroundColor: pInfo.color }}
                                                      >
                                                        前往发布端
                                                      </button>
                                                    </div>
                                                  </div>
                                                )
                                              })()
                                            )}
                                          </div>
                                        )}
                                      </div>

                                      <div className="flex items-center justify-around px-2 py-2" style={{ backgroundColor: '#fff', borderTop: '1px solid #f0f0f0' }}>
                                        {[
                                          { id: 'home', icon: Globe3, label: 'Home' },
                                          { id: 'search', icon: Search, label: 'Search' },
                                          { id: 'create', icon: Plus, label: 'Create' },
                                          { id: 'profile', icon: User, label: 'Profile' },
                                        ].map(tab => (
                                          <button
                                            key={tab.id}
                                            onClick={() => setPhoneTab(tab.id as any)}
                                            className="flex flex-col items-center gap-0.5 py-1 px-2"
                                          >
                                            <tab.icon size={18} style={{ color: phoneTab === tab.id ? pInfo.color : '#999' }} />
                                            <span className="text-[7px]" style={{ color: phoneTab === tab.id ? pInfo.color : '#999' }}>{tab.label}</span>
                                          </button>
                                        ))}
                                      </div>
                                    </>
                                  ) : (
                                    <>
                                      <div className="px-4 py-2 flex items-center gap-2" style={{ backgroundColor: pInfo.color }}>
                                        <pInfo.icon size={16} color="white" />
                                        <span className="text-white font-semibold text-xs flex-1">{pInfo.name}</span>
                                      </div>

                                      <div className="h-[calc(100%-80px)] flex flex-col items-center justify-center px-6" style={{ backgroundColor: pInfo.bgColor }}>
                                        <div className="w-20 h-20 rounded-full flex items-center justify-center mb-4 bg-white" style={{ border: `3px solid ${pInfo.color}` }}>
                                          <pInfo.icon size={36} style={{ color: pInfo.color }} />
                                        </div>
                                        <p className="text-sm font-bold mb-1 text-center" style={{ color: '#1a1a1a' }}>Not Logged In</p>
                                        <p className="text-[10px] text-center mb-5" style={{ color: '#666' }}>
                                          Connect your {pInfo.name} account to start posting content
                                        </p>
                                        <button
                                          onClick={() => setActiveTab('social')}
                                          className="w-full py-2.5 rounded-lg text-[11px] font-semibold text-white"
                                          style={{ backgroundColor: pInfo.color }}
                                        >
                                          Login to {pInfo.name}
                                        </button>
                                        <button
                                          onClick={() => window.open((pInfo as any).loginUrl || pInfo.url, '_blank')}
                                          className="mt-2 text-[10px] font-medium"
                                          style={{ color: pInfo.color }}
                                        >
                                          Open {pInfo.name} website →
                                        </button>
                                      </div>
                                    </>
                                  )}
                                </div>

                                <div className="flex justify-center py-1.5">
                                  <div className="w-20 h-1 rounded-full" style={{ backgroundColor: '#555' }} />
                                </div>
                              </div>

                              <div className="text-center mt-3">
                                <p className="text-xs font-medium" style={{ color: 'var(--adm-text)' }}>
                                  {pInfo.name} App
                                </p>
                                <p className="text-[10px] mt-0.5" style={{ color: 'var(--adm-text-secondary)' }}>
                                  {account ? `Logged in as ${account.staffName}` : 'Not connected'}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                        )
                      })()}
                    </div>
                  )}

                  {/* Publish 标签页 */}
                  {rightPanelTab === 'publish' && (
                    <div className="space-y-4">
                      {!generatedContent ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                          <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-4 opacity-30" style={{ backgroundColor: 'var(--adm-input)' }}>
                            <Send size={36} style={{ color: 'var(--adm-text-secondary)' }} />
                          </div>
                          <p className="text-sm font-medium mb-1" style={{ color: 'var(--adm-text)' }}>Nothing to publish</p>
                          <p className="text-xs max-w-xs" style={{ color: 'var(--adm-text-secondary)' }}>
                            Generate content in AI Preview first, then come back here to publish
                          </p>
                          <button
                            onClick={() => setRightPanelTab('preview')}
                            className="mt-4 px-5 py-2 rounded-lg text-xs font-medium"
                            style={{ backgroundColor: 'var(--adm-accent)', color: 'var(--adm-accent-text)' }}
                          >
                            Go to Generate
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--adm-accent-bg)', border: '1px solid var(--adm-accent)' }}>
                            <div className="flex items-center gap-2">
                              <Check size={16} style={{ color: 'var(--adm-accent)' }} />
                              <p className="text-xs font-medium" style={{ color: 'var(--adm-text)' }}>Content ready to publish</p>
                            </div>
                          </div>

                          <div>
                            <p className="text-xs font-medium mb-2" style={{ color: 'var(--adm-text)' }}>Select account:</p>
                            <div className="space-y-2">
                              {currentUserAccounts.map(account => {
                                const pInfo = PLATFORMS.find(p => p.id === account.platform)
                                if (!pInfo) return null
                                const isSelected = pushTargetId === account.id
                                return (
                                  <button
                                    key={account.id}
                                    onClick={() => setPushTargetId(account.id)}
                                    className="w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left"
                                    style={{
                                      backgroundColor: isSelected ? pInfo.bgColor : 'var(--adm-input)',
                                      borderColor: isSelected ? pInfo.color : 'var(--adm-border)',
                                    }}
                                  >
                                    <div className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0" style={{ border: `2px solid ${pInfo.color}`, backgroundColor: 'var(--adm-card)' }}>
                                      {account.avatar ? (
                                        <img src={account.avatar} alt="" className="w-full h-full object-cover" />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center text-sm font-bold text-white" style={{ backgroundColor: pInfo.color }}>
                                          {(account.username || account.staffName || '?')[0].toUpperCase()}
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-semibold truncate" style={{ color: 'var(--adm-text)' }}>{account.staffName}</p>
                                      <div className="flex items-center gap-1.5">
                                        <div className="w-4 h-4 rounded flex items-center justify-center" style={{ backgroundColor: 'white' }}>
                                          <pInfo.icon size={10} style={{ color: pInfo.color }} />
                                        </div>
                                        <span className="text-xs" style={{ color: 'var(--adm-text-secondary)' }}>@{account.username} · {pInfo.name}</span>
                                      </div>
                                    </div>
                                    {isSelected && <Check size={20} style={{ color: pInfo.color }} />}
                                  </button>
                                )
                              })}
                              {currentUserAccounts.length === 0 && (
                                <div className="text-center py-6">
                                  <p className="text-sm" style={{ color: 'var(--adm-text-secondary)' }}>No connected accounts</p>
                                  <button
                                    onClick={() => setActiveTab('social')}
                                    className="mt-2 text-xs font-medium"
                                    style={{ color: 'var(--adm-accent)' }}
                                  >
                                    Go connect one →
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>

                          <div>
                            <p className="text-xs font-medium mb-2 flex items-center gap-1" style={{ color: 'var(--adm-text)' }}>
                              <ImageIcon size={12} /> 发布素材（图片/视频）
                              <span className="text-[10px] font-normal" style={{ color: 'var(--adm-text-secondary)' }}>选择随文案发布的图片或视频（AI 生成/编辑素材已自动同步）</span>
                            </p>
                            {(() => {
                              const candidates = Array.from(new Set([
                                ...(generatedImages.length ? generatedImages : []),
                                ...(generatedVideos.length ? generatedVideos : []),
                                ...(selectedProduct?.image ? [selectedProduct.image] : []),
                              ])).filter(Boolean)
                              if (candidates.length === 0) {
                                return (
                                  <div className="rounded-xl p-4 text-center" style={{ backgroundColor: 'var(--adm-input)', border: '1px dashed var(--adm-border)' }}>
                                    <p className="text-[11px]" style={{ color: 'var(--adm-text-secondary)' }}>暂无发布素材，请先在 AI Preview 生成图片或视频</p>
                                  </div>
                                )
                              }
                              return (
                                <div className="flex gap-2 overflow-x-auto pb-1">
                                  {candidates.map((u, i) => {
                                    const isSel = publishImageUrl === u || (!publishImageUrl && i === 0 && generatedImages.length > 0)
                                    return (
                                      <div key={u + i} className="relative flex-shrink-0">
                                        <button
                                          onClick={() => setPublishImageUrl(u)}
                                          className="w-16 h-16 rounded-lg overflow-hidden transition-all"
                                          style={{
                                            border: isSel ? '3px solid var(--adm-accent)' : '3px solid var(--adm-border)',
                                            opacity: publishImageUrl && !isSel ? 0.65 : 1,
                                          }}
                                        >
                                          {/\.(mp4|mov|webm)(\?|$)/i.test(u) ? (
                                            <span className="relative block w-full h-full">
                                              <video src={u} muted className="w-full h-full object-cover" />
                                              <span className="absolute inset-0 flex items-center justify-center bg-black/30">
                                                <Play size={18} style={{ color: '#fff' }} />
                                              </span>
                                            </span>
                                          ) : (
                                            <img src={u} alt="" className="w-full h-full object-cover" />
                                          )}
                                        </button>
                                        {isSel && (
                                          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--adm-accent)' }}>
                                            <Check size={10} style={{ color: 'var(--adm-accent-text)' }} />
                                          </span>
                                        )}
                                        {!/\.(mp4|mov|webm)(\?|$)/i.test(u) && (
                                          <button
                                            onClick={() => setEditorImage(u)}
                                            className="absolute -bottom-1 -left-1 p-1 rounded-md backdrop-blur"
                                            style={{ backgroundColor: 'rgba(0,0,0,0.55)', color: '#fff' }}
                                            title="打开营销图片编辑器"
                                          >
                                            <Wand2 size={11} />
                                          </button>
                                        )}
                                      </div>
                                    )
                                  })}
                                </div>
                              )
                            })()}
                          </div>

                          <div>
                            <p className="text-xs font-medium mb-2" style={{ color: 'var(--adm-text)' }}>Caption:</p>
                            <textarea
                              value={publishCaption || generatedContent.content}
                              onChange={e => setPublishCaption(e.target.value)}
                              rows={6}
                              className="w-full px-3 py-2 text-sm rounded-lg resize-none"
                              style={{ backgroundColor: 'var(--adm-input)', border: '1px solid var(--adm-input-border)', color: 'var(--adm-text)' }}
                            />
                          </div>

                          <div>
                            <p className="text-xs font-medium mb-2 flex items-center gap-1" style={{ color: 'var(--adm-text)' }}>
                              <Hash size={12} /> Hashtags:
                            </p>
                            <input
                              type="text"
                              value={publishHashtags || (generatedContent.hashtags ? generatedContent.hashtags.map(t => `#${t}`).join(' ') : '')}
                              onChange={e => setPublishHashtags(e.target.value)}
                              className="w-full px-3 py-2 text-sm rounded-lg"
                              style={{ backgroundColor: 'var(--adm-input)', border: '1px solid var(--adm-input-border)', color: 'var(--adm-text)' }}
                            />
                          </div>

                          {pushTargetId && (() => {
                            const target = socialAccounts.find(a => a.id === pushTargetId)
                            if (!target || target.platform !== 'instagram') return null
                            const mediaUrl = publishImageUrl || (generatedImages.length > 0 ? generatedImages[0] : getProductMediaUrl(selectedProduct))
                            return (
                              <div className="rounded-xl p-3" style={{ backgroundColor: 'var(--adm-input)', border: '1px solid var(--adm-border)' }}>
                                <div className="flex items-center justify-between gap-3 mb-2">
                                  <div>
                                    <p className="text-xs font-semibold" style={{ color: 'var(--adm-text)' }}>Instagram Media Source</p>
                                    <p className="text-[11px]" style={{ color: 'var(--adm-text-secondary)' }}>
                                      Instagram 直发需要图片或视频素材，优先使用 AI 生成的营销图/视频（视频将按 VIDEO 类型发布）。
                                    </p>
                                  </div>
                                  <span
                                    className="text-[10px] px-2 py-1 rounded-full font-medium"
                                    style={{
                                      backgroundColor: mediaUrl ? '#DCFCE7' : '#FEF2F2',
                                      color: mediaUrl ? '#166534' : '#B91C1C',
                                    }}
                                  >
                                    {mediaUrl ? '素材已就绪' : '缺少素材'}
                                  </span>
                                </div>
                                {mediaUrl ? (
                                  <div className="flex items-center gap-3">
                                    {/\.(mp4|mov|webm)(\?|$)/i.test(mediaUrl) ? (
                                      <video
                                        src={mediaUrl}
                                        muted
                                        className="w-16 h-16 rounded-lg object-cover"
                                        style={{ border: '1px solid var(--adm-border)', backgroundColor: '#000' }}
                                      />
                                    ) : (
                                      <img
                                        src={mediaUrl}
                                        alt=""
                                        className="w-16 h-16 rounded-lg object-cover"
                                        style={{ border: '1px solid var(--adm-border)' }}
                                      />
                                    )}
                                    <div className="min-w-0">
                                      <p className="text-xs font-medium truncate" style={{ color: 'var(--adm-text)' }}>
                                        {selectedProduct?.name || selectedProduct?.nameEn || 'Selected product media'}
                                      </p>
                                      <p className="text-[11px] truncate" style={{ color: 'var(--adm-text-secondary)' }}>
                                        {mediaUrl}
                                      </p>
                                    </div>
                                  </div>
                                ) : (
                                  <p className="text-[11px]" style={{ color: '#B91C1C' }}>
                                    请选择带主图的商品后再发布到 Instagram，否则无法走 API 直发。
                                  </p>
                                )}
                              </div>
                            )
                          })()}

                          {pushTargetId && (() => {
                            const target = socialAccounts.find(a => a.id === pushTargetId)
                            if (!target || target.platform !== 'instagram') return null
                            const productImages: string[] = (() => {
                              // AI 生成/编辑图优先，其次是商品主图与详情图
                              let urls: string[] = publishImageUrl ? [publishImageUrl, ...generatedImages] : [...generatedImages]
                              if (selectedProduct) {
                                if (selectedProduct.image) urls.push(selectedProduct.image)
                                if (selectedProduct.detailImages && Array.isArray(selectedProduct.detailImages)) {
                                  urls = urls.concat(selectedProduct.detailImages)
                                }
                              }
                              return Array.from(new Set(urls)).filter((u: string) => !!u && !/\.(mp4|mov|webm)(\?|$)/i.test(u)).slice(0, 12)
                            })()
                            const totalImages = productImages.length
                            const isManual = carouselSelectionActive
                            const activeSelection = isManual ? selectedCarouselImages : productImages
                            const selectedCount = activeSelection.length
                            const isCarousel = selectedCount > 1

                            const toggleImage = (url: string) => {
                              if (!isManual) {
                                setCarouselSelectionActive(true)
                                setSelectedCarouselImages(productImages.filter(u => u !== url))
                              } else {
                                setSelectedCarouselImages(prev =>
                                  prev.includes(url)
                                    ? prev.filter(u => u !== url)
                                    : [...prev, url]
                                )
                              }
                            }

                            const moveImage = (url: string, direction: 'up' | 'down') => {
                              setSelectedCarouselImages(prev => {
                                const idx = prev.indexOf(url)
                                if (idx === -1) return prev
                                if (direction === 'up' && idx === 0) return prev
                                if (direction === 'down' && idx === prev.length - 1) return prev
                                const newIdx = direction === 'up' ? idx - 1 : idx + 1
                                const next = [...prev]
                                ;[next[idx], next[newIdx]] = [next[newIdx], next[idx]]
                                return next
                              })
                            }

                            const addExternalUrl = () => {
                              const url = carouselExternalUrl.trim()
                              if (!url) return
                              if (!isManual) {
                                setCarouselSelectionActive(true)
                                setSelectedCarouselImages([...productImages, url])
                              } else {
                                setSelectedCarouselImages(prev => [...prev, url])
                              }
                              setCarouselExternalUrl('')
                            }

                            const clearSelection = () => {
                              setCarouselSelectionActive(false)
                              setSelectedCarouselImages([])
                              setCarouselExternalUrl('')
                            }

                            return (
                              <div className="rounded-xl p-3" style={{ backgroundColor: 'var(--adm-input)', border: '1px solid var(--adm-border)' }}>
                                <div className="flex items-center justify-between gap-3 mb-3">
                                  <div className="flex items-center gap-2">
                                    <ImageIcon size={14} style={{ color: 'var(--adm-text)' }} />
                                    <p className="text-xs font-semibold" style={{ color: 'var(--adm-text)' }}>Carousel Media Manager</p>
                                    {isCarousel && (
                                      <span
                                        className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                                        style={{ backgroundColor: 'var(--adm-badge-bg, #FEF3C7)', color: 'var(--adm-badge-text, #92400E)' }}
                                      >
                                        CAROUSEL
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <p className="text-[11px]" style={{ color: 'var(--adm-text-secondary)' }}>
                                      {selectedCount} of {totalImages} selected for carousel
                                    </p>
                                    {(isManual || selectedCount > 0) && (
                                      <button
                                        onClick={clearSelection}
                                        className="text-[10px] px-2 py-0.5 rounded-md font-medium transition-colors"
                                        style={{ color: 'var(--adm-text-secondary)', border: '1px solid var(--adm-border)' }}
                                      >
                                        Clear
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {totalImages === 0 ? (
                                  <p className="text-[11px] py-3 text-center" style={{ color: 'var(--adm-text-secondary)' }}>
                                    No product images available. Add external URLs below.
                                  </p>
                                ) : (
                                  <div className="grid grid-cols-5 gap-2 mb-3">
                                    {productImages.map((url, idx) => {
                                      const checked = isManual ? selectedCarouselImages.includes(url) : true
                                      return (
                                        <div
                                          key={`${url}-${idx}`}
                                          className="relative rounded-lg overflow-hidden group"
                                          style={{
                                            border: checked ? '2px solid var(--adm-accent, #3b82f6)' : '1px solid var(--adm-border)',
                                            opacity: checked ? 1 : 0.55,
                                          }}
                                        >
                                          <img
                                            src={url}
                                            alt=""
                                            className="w-full aspect-square object-cover cursor-pointer"
                                            onClick={() => toggleImage(url)}
                                          />
                                          <button
                                            onClick={() => toggleImage(url)}
                                            className="absolute top-1 left-1 w-5 h-5 rounded-full flex items-center justify-center transition-all"
                                            style={{
                                              backgroundColor: checked ? 'var(--adm-accent, #3b82f6)' : 'var(--adm-bg)',
                                              border: checked ? 'none' : '1px solid var(--adm-border)',
                                            }}
                                          >
                                            {checked && <Check size={12} style={{ color: '#fff' }} />}
                                          </button>
                                          <div
                                            className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                            style={{ color: 'var(--adm-text-secondary)' }}
                                          >
                                            <GripVertical size={12} />
                                          </div>
                                        </div>
                                      )
                                    })}
                                  </div>
                                )}

                                {isManual && selectedCarouselImages.length > 0 && (
                                  <div className="mb-3 p-2 rounded-lg" style={{ backgroundColor: 'var(--adm-bg)', border: '1px solid var(--adm-border)' }}>
                                    <p className="text-[10px] font-medium mb-2" style={{ color: 'var(--adm-text-secondary)' }}>Selected order (drag handles are visual; use arrows to reorder)</p>
                                    <div className="flex flex-wrap gap-1.5">
                                      {selectedCarouselImages.map((url, idx) => (
                                        <div
                                          key={`sel-${url}-${idx}`}
                                          className="flex items-center gap-1 px-1.5 py-1 rounded-md"
                                          style={{ backgroundColor: 'var(--adm-input-border, #e5e7eb)' }}
                                        >
                                          <GripVertical size={10} style={{ color: 'var(--adm-text-secondary)' }} />
                                          <img src={url} alt="" className="w-6 h-6 rounded object-cover" />
                                          <span className="text-[10px] font-medium" style={{ color: 'var(--adm-text)' }}>{idx + 1}</span>
                                          <button
                                            onClick={() => moveImage(url, 'up')}
                                            disabled={idx === 0}
                                            className="w-4 h-4 rounded flex items-center justify-center disabled:opacity-30"
                                            style={{ color: 'var(--adm-text)' }}
                                          >
                                            <ChevronUp size={10} />
                                          </button>
                                          <button
                                            onClick={() => moveImage(url, 'down')}
                                            disabled={idx === selectedCarouselImages.length - 1}
                                            className="w-4 h-4 rounded flex items-center justify-center disabled:opacity-30"
                                            style={{ color: 'var(--adm-text)' }}
                                          >
                                            <ChevronDown size={10} />
                                          </button>
                                          <button
                                            onClick={() => toggleImage(url)}
                                            className="w-4 h-4 rounded flex items-center justify-center ml-0.5"
                                            style={{ color: 'var(--adm-text-secondary)' }}
                                          >
                                            <X size={10} />
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                <div className="flex items-center gap-2">
                                  <input
                                    type="text"
                                    value={carouselExternalUrl}
                                    onChange={e => setCarouselExternalUrl(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') addExternalUrl() }}
                                    placeholder="Add external image URL..."
                                    className="flex-1 px-2.5 py-1.5 text-xs rounded-lg"
                                    style={{ backgroundColor: 'var(--adm-bg)', border: '1px solid var(--adm-border)', color: 'var(--adm-text)' }}
                                  />
                                  <button
                                    onClick={addExternalUrl}
                                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors"
                                    style={{ backgroundColor: 'var(--adm-accent, #3b82f6)', color: '#fff' }}
                                  >
                                    <Plus size={12} /> Add
                                  </button>
                                </div>

                                <p className="text-[10px] mt-2" style={{ color: 'var(--adm-text-secondary)' }}>
                                  {isManual
                                    ? 'Custom selection active. Instagram allows up to 10 images per carousel.'
                                    : 'Auto mode: all product images will be used. Select images above to customize.'}
                                </p>
                              </div>
                            )
                          })()}

                          <div className="rounded-xl p-3" style={{ backgroundColor: 'var(--adm-input)', border: '1px solid var(--adm-border)' }}>
                            <p className="text-xs font-semibold mb-1" style={{ color: 'var(--adm-text)' }}>Tracking Binding</p>
                            <p className="text-[11px]" style={{ color: 'var(--adm-text-secondary)' }}>
                              发布时会自动创建一条专属 tracking link，并写入发布记录中心。Instagram 的点击追踪建议将链接放在 Bio 或 Story Link 中。
                            </p>
                          </div>

                          {pushTargetId && (<> 
                            <button
                              onClick={async () => {
                                const target = socialAccounts.find(a => a.id === pushTargetId)
                                if (!target) return
                                const pInfo = PLATFORMS.find(p => p.id === target.platform)
                                if (!pInfo) return

                                const caption = publishCaption || generatedContent.content
                                const tags = publishHashtags || (generatedContent.hashtags ? generatedContent.hashtags.map(t => `#${t}`).join(' ') : '')
                                const fullText = `${caption}\n\n${tags}`
                                
                                const isVideoPublish = !!publishImageUrl && /\.(mp4|mov|webm)(\?|$)/i.test(publishImageUrl)
                                const mediaUrls = (() => {
                                  if (isVideoPublish) {
                                    return [publishImageUrl]
                                  }
                                  if (carouselSelectionActive) {
                                    return selectedCarouselImages.filter(u => !/\.(mp4|mov|webm)(\?|$)/i.test(u)).filter(Boolean).slice(0, 10)
                                  }
                                  if (!selectedProduct) return []
                                  let urls: string[] = []
                                  if (publishImageUrl && /^data:image\//.test(publishImageUrl)) urls.push(publishImageUrl)
                                  if (selectedProduct.image) urls.push(selectedProduct.image)
                                  if (selectedProduct.detailImages && Array.isArray(selectedProduct.detailImages)) {
                                    urls = urls.concat(selectedProduct.detailImages)
                                  }
                                  return Array.from(new Set(urls)).filter(Boolean).slice(0, 10)
                                })()
                                const mediaUrl = mediaUrls.length > 0 ? mediaUrls[0] : ''

                                const publishedAt = new Date().toISOString()
                                let referralLink: ReferralLink | null = null

                                setPublishSending(true)
                                try {
                                  const referralRes = await fetch('/api/referrals', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                      action: 'create',
                                      staffId: target.staffId,
                                      staffName: target.staffName,
                                      staffAvatar: target.staffAvatar,
                                      platform: target.platform,
                                      platformUsername: target.username,
                                      productId: selectedProduct?.id,
                                      productName: selectedProduct?.name || selectedProduct?.nameEn,
                                      contentTitle: generatedContent.title,
                                      contentBody: caption,
                                      hashtags: tags,
                                      contentType: selectedType,
                                      tone: selectedTone,
                                      publishedAt,
                                    }),
                                  })
                                  const referralData = await referralRes.json()
                                  if (!referralRes.ok || !referralData.success || !referralData.link) {
                                    throw new Error(referralData.error || 'Failed to create tracking link')
                                  }
                                  referralLink = referralData.link

                                  if (pInfo.id === 'instagram') {
                                    if (mediaUrls.length === 0) {
                                      throw new Error('Instagram publishing requires at least one image or video. Please select product media, generate a creative, or add external URLs.')
                                    }

                                    const isCarousel = mediaUrls.length > 1 && !isVideoPublish
                                    const pubR = await fetch('/api/marketing/instagram-publish', {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({
                                        accountId: target.id,
                                        mediaUrl: isCarousel ? mediaUrls : mediaUrls[0],
                                        caption: fullText,
                                        mediaType: isVideoPublish ? 'VIDEO' : isCarousel ? 'CAROUSEL' : 'IMAGE',
                                      }),
                                    })
                                    const pubD = await pubR.json()
                                    if (!pubR.ok || !pubD.success) {
                                      throw new Error(pubD.error || 'Instagram publish failed')
                                    }

                                    await fetch('/api/marketing/social-content', {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({
                                        accountId: target.id,
                                        staffId: target.staffId,
                                        staffName: target.staffName,
                                        staffAvatar: target.staffAvatar,
                                        platform: target.platform,
                                        platformName: pInfo.name,
                                        platformUsername: target.username,
                                        status: 'published',
                                        publishMode: 'api',
                                        contentTitle: generatedContent.title,
                                        contentBody: caption,
                                        hashtags: tags,
                                        contentType: selectedType,
                                        tone: selectedTone,
                                        mediaUrl: mediaUrls.length > 0 ? mediaUrls[0] : '', // 列表页仍展示首图
                                        mediaType: isVideoPublish ? 'VIDEO' : mediaUrls.length > 1 ? 'CAROUSEL' : 'IMAGE',
                                        productId: selectedProduct?.id,
                                        productName: selectedProduct?.name || selectedProduct?.nameEn,
                                        referralLinkId: referralLink!.id,
                                        referralCode: referralLink!.code,
                                        referralUrl: referralLink!.url,
                                        platformPostId: pubD.mediaId,
                                        note: 'Instagram 内容已通过 API 发布。为追踪点击，请将 tracking link 放到 Bio、Story Link 或落地页入口。',
                                        publishedAt,
                                      }),
                                    })

                                    await Promise.all([loadDashboardData(), loadSocialContent(), loadSocialAccounts()])
                                    setActiveTab('referrals')
                                    alert(`Instagram 内容已发布。\n\nTracking Link:\n${referralLink!.url}\n\n下一步建议：把这个链接放到 Instagram Bio 或 Story Link。`)
                                  } else if (pInfo.id === 'twitter' || pInfo.id === 'x') {
                                    if (target.accessToken && target.refreshToken) {
                                      try {
                                        const pubR = await fetch('/api/marketing/x-publish', {
                                          method: 'POST',
                                          headers: { 'Content-Type': 'application/json' },
                                          body: JSON.stringify({
                                            accountId: target.id,
                                            text: fullText,
                                          }),
                                        })
                                        const pubD = await pubR.json()
                                        if (pubD.success) {
                                          await fetch('/api/marketing/social-content', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({
                                              accountId: target.id,
                                              staffId: target.staffId,
                                              staffName: target.staffName,
                                              staffAvatar: target.staffAvatar,
                                              platform: target.platform,
                                              platformName: pInfo.name,
                                              platformUsername: target.username,
                                              status: 'published',
                                              publishMode: 'api',
                                              contentTitle: generatedContent.title,
                                              contentBody: caption,
                                              hashtags: tags,
                                              contentType: selectedType,
                                              tone: selectedTone,
                                              productId: selectedProduct?.id,
                                              productName: selectedProduct?.name || selectedProduct?.nameEn,
                                              referralLinkId: referralLink!.id,
                                              referralCode: referralLink!.code,
                                              referralUrl: referralLink!.url,
                                              platformPostId: pubD.tweet?.id,
                                              platformPostUrl: pubD.tweet?.url,
                                              note: 'X 内容已通过 API 发布，tracking link 已绑定到本次发布记录。',
                                              publishedAt,
                                            }),
                                          })
                                          await Promise.all([loadDashboardData(), loadSocialContent()])
                                          setActiveTab('referrals')
                                          alert(`Tweet published successfully!\n\n${pubD.tweet.url}\n\nTracking Link:\n${referralLink!.url}`)
                                        } else {
                                          throw new Error(pubD.error || 'Failed to publish')
                                        }
                                      } catch (pubErr: any) {
                                        console.error('X publish error:', pubErr)
                                        await fetch('/api/marketing/social-content', {
                                          method: 'POST',
                                          headers: { 'Content-Type': 'application/json' },
                                          body: JSON.stringify({
                                            accountId: target.id,
                                            staffId: target.staffId,
                                            staffName: target.staffName,
                                            staffAvatar: target.staffAvatar,
                                            platform: target.platform,
                                            platformName: pInfo.name,
                                            platformUsername: target.username,
                                            status: 'manual_action_required',
                                            publishMode: 'share_window',
                                            contentTitle: generatedContent.title,
                                            contentBody: caption,
                                            hashtags: tags,
                                            contentType: selectedType,
                                            tone: selectedTone,
                                            productId: selectedProduct?.id,
                                            productName: selectedProduct?.name || selectedProduct?.nameEn,
                                            referralLinkId: referralLink!.id,
                                            referralCode: referralLink!.code,
                                            referralUrl: referralLink!.url,
                                            note: `API 发布失败，已回退为分享窗口。失败原因：${pubErr.message}`,
                                            publishedAt,
                                          }),
                                        })
                                        await Promise.all([loadDashboardData(), loadSocialContent()])
                                        alert(`Direct publish failed: ${pubErr.message}\n\nOpening share window as fallback...`)
                                        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(fullText)}`, '_blank')
                                      }
                                    } else {
                                      await fetch('/api/marketing/social-content', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                          accountId: target.id,
                                          staffId: target.staffId,
                                          staffName: target.staffName,
                                          staffAvatar: target.staffAvatar,
                                          platform: target.platform,
                                          platformName: pInfo.name,
                                          platformUsername: target.username,
                                          status: 'manual_action_required',
                                          publishMode: 'share_window',
                                          contentTitle: generatedContent.title,
                                          contentBody: caption,
                                          hashtags: tags,
                                          contentType: selectedType,
                                          tone: selectedTone,
                                          productId: selectedProduct?.id,
                                          productName: selectedProduct?.name || selectedProduct?.nameEn,
                                          referralLinkId: referralLink!.id,
                                          referralCode: referralLink!.code,
                                          referralUrl: referralLink!.url,
                                          note: '当前账号缺少 API token，已改为手动分享窗口。',
                                          publishedAt,
                                        }),
                                      })
                                      await Promise.all([loadDashboardData(), loadSocialContent()])
                                      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(fullText)}`, '_blank')
                                    }
                                  } else if (pInfo.id === 'facebook') {
                                    await fetch('/api/marketing/social-content', {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({
                                        accountId: target.id,
                                        staffId: target.staffId,
                                        staffName: target.staffName,
                                        staffAvatar: target.staffAvatar,
                                        platform: target.platform,
                                        platformName: pInfo.name,
                                        platformUsername: target.username,
                                        status: 'manual_action_required',
                                        publishMode: 'share_window',
                                        contentTitle: generatedContent.title,
                                        contentBody: caption,
                                        hashtags: tags,
                                        contentType: selectedType,
                                        tone: selectedTone,
                                        productId: selectedProduct?.id,
                                        productName: selectedProduct?.name || selectedProduct?.nameEn,
                                        referralLinkId: referralLink!.id,
                                        referralCode: referralLink!.code,
                                        referralUrl: referralLink!.url,
                                        note: '已生成发布记录和 tracking link，请在 Facebook 分享窗口中完成最后发布。',
                                        publishedAt,
                                      }),
                                    })
                                    await Promise.all([loadDashboardData(), loadSocialContent()])
                                    const shareUrl = `https://www.facebook.com/sharer/sharer.php?quote=${encodeURIComponent(fullText)}`
                                    window.open(shareUrl, '_blank')
                                  } else if (pInfo.id === 'linkedin') {
                                    await fetch('/api/marketing/social-content', {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({
                                        accountId: target.id,
                                        staffId: target.staffId,
                                        staffName: target.staffName,
                                        staffAvatar: target.staffAvatar,
                                        platform: target.platform,
                                        platformName: pInfo.name,
                                        platformUsername: target.username,
                                        status: 'manual_action_required',
                                        publishMode: 'share_window',
                                        contentTitle: generatedContent.title,
                                        contentBody: caption,
                                        hashtags: tags,
                                        contentType: selectedType,
                                        tone: selectedTone,
                                        productId: selectedProduct?.id,
                                        productName: selectedProduct?.name || selectedProduct?.nameEn,
                                        referralLinkId: referralLink!.id,
                                        referralCode: referralLink!.code,
                                        referralUrl: referralLink!.url,
                                        note: '已生成发布记录和 tracking link，请在 LinkedIn 分享窗口中完成发布。',
                                        publishedAt,
                                      }),
                                    })
                                    await Promise.all([loadDashboardData(), loadSocialContent()])
                                    const shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.origin)}`
                                    window.open(shareUrl, '_blank')
                                  } else {
                                    await fetch('/api/marketing/social-content', {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({
                                        accountId: target.id,
                                        staffId: target.staffId,
                                        staffName: target.staffName,
                                        staffAvatar: target.staffAvatar,
                                        platform: target.platform,
                                        platformName: pInfo.name,
                                        platformUsername: target.username,
                                        status: 'manual_action_required',
                                        publishMode: 'manual',
                                        contentTitle: generatedContent.title,
                                        contentBody: caption,
                                        hashtags: tags,
                                        contentType: selectedType,
                                        tone: selectedTone,
                                        mediaUrl: mediaUrl || undefined,
                                        mediaType: mediaUrl ? 'IMAGE' : undefined,
                                        productId: selectedProduct?.id,
                                        productName: selectedProduct?.name || selectedProduct?.nameEn,
                                        referralLinkId: referralLink!.id,
                                        referralCode: referralLink!.code,
                                        referralUrl: referralLink!.url,
                                        note: '已生成 tracking link，请到目标平台手动完成发布，并优先使用该链接做归因。',
                                        publishedAt,
                                      }),
                                    })
                                    await Promise.all([loadDashboardData(), loadSocialContent()])
                                    window.open(pInfo.url, '_blank')
                                  }
                                } catch (e) {
                                  console.error('Failed to publish:', e)
                                  await fetch('/api/marketing/social-content', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                      accountId: target.id,
                                      staffId: target.staffId,
                                      staffName: target.staffName,
                                      staffAvatar: target.staffAvatar,
                                      platform: target.platform,
                                      platformName: pInfo.name,
                                      platformUsername: target.username,
                                      status: 'failed',
                                      publishMode: 'manual',
                                      contentTitle: generatedContent.title,
                                      contentBody: caption,
                                      hashtags: tags,
                                      contentType: selectedType,
                                      tone: selectedTone,
                                      mediaUrl: mediaUrl || undefined,
                                      mediaType: mediaUrl ? 'IMAGE' : undefined,
                                      productId: selectedProduct?.id,
                                      productName: selectedProduct?.name || selectedProduct?.nameEn,
                                      referralLinkId: referralLink?.id,
                                      referralCode: referralLink?.code,
                                      referralUrl: referralLink?.url,
                                      errorMessage: e instanceof Error ? e.message : 'Unknown publish error',
                                      note: '本次发布已记录为失败，便于后续排查。',
                                      publishedAt,
                                    }),
                                  }).catch(() => {})
                                  await Promise.all([loadDashboardData(), loadSocialContent()])
                                  alert(e instanceof Error ? e.message : 'Failed to create publish record')
                                } finally {
                                  setPublishSending(false)
                                }
                              }}
                              disabled={publishSending}
                              className="w-full py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                              style={{ backgroundColor: 'var(--adm-accent)', color: 'var(--adm-accent-text)' }}
                            >
                              {publishSending ? (
                                <><Loader2 size={18} className="animate-spin" /> Publishing...</>
                              ) : (
                                <><Send size={18} /> 一键发布（图片 + 文案）</>
                              )}
                            </button>
                            <p className="text-[11px] text-center" style={{ color: 'var(--adm-text-secondary)' }}>
                              将同时发布 {generatedImages.length > 0 ? `${generatedImages.length} 张 AI 营销图` : '商品图'} 与已生成的文案，并自动生成追踪链接
                            </p>
                          </>)}

                          <button
                            onClick={() => {
                              const fullText = `${publishCaption || generatedContent.content}\n\n${publishHashtags || (generatedContent.hashtags ? generatedContent.hashtags.map(t => `#${t}`).join(' ') : '')}`
                              navigator.clipboard.writeText(fullText)
                              setPushCopied(true)
                              setTimeout(() => setPushCopied(false), 2000)
                            }}
                            className="w-full py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2"
                            style={{ backgroundColor: 'var(--adm-input)', color: 'var(--adm-text)' }}
                          >
                            {pushCopied ? <Check size={16} style={{ color: '#22c55e' }} /> : <Copy size={16} />}
                            {pushCopied ? 'Copied!' : 'Copy All Content'}
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
              </div>
          </div>
        )}

        {/* 满宽视频 & 音频编辑区（剪映式，多视频/多音频，位于工作室下方满宽展示） */}
        {activeTab === 'studio' && rightPanelTab === 'media' && (
          <div className="mt-6">
            <VideoAudioEditor
              videos={generatedVideos}
              onAddVideo={url => setGeneratedVideos(prev => [url, ...prev])}
              audioLibrary={audioLibrary}
              setAudioLibrary={setAudioLibrary}
              onAddResult={handleAddEditedVideo}
              initialAudioUrl={selectedEditorAudio}
              autoSelectVideo={lastGeneratedVideo}
              videoContext={selectedProduct?.name || selectedProduct?.nameEn || ''}
            />
          </div>
        )}

        {/* 营销图片编辑器 */}
        {editorImage && (
          <MarketingImageEditor
            imageUrl={editorImage}
            productName={selectedProduct?.name || selectedProduct?.nameEn}
            productDesc={selectedProduct?.description || selectedProduct?.descriptionEn}
            caption={generatedContent ? `${generatedContent.title}\n${generatedContent.content}` : ''}
            imagePrompt={imagePrompt}
                  onSave={url => {
                    setGeneratedImages(prev => [url, ...prev])
                    setPublishImageUrl(url)
                    setEditorImage(null)
                  }}
            onClose={() => setEditorImage(null)}
          />
        )}

        {activeTab === 'templates' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {TEMPLATES.map(template => (
              <div
                key={template.id}
                className="rounded-2xl p-5 cursor-pointer transition-all hover:scale-[1.02]"
                style={{
                  backgroundColor: 'var(--adm-card)',
                  border: `2px solid ${selectedTemplate === template.id ? 'var(--adm-accent)' : 'var(--adm-border)'}`,
                }}
                onClick={() => { setSelectedTemplate(selectedTemplate === template.id ? '' : template.id); setActiveTab('studio') }}
              >
                <div className="text-4xl mb-3">{template.icon}</div>
                <h3 className="font-semibold mb-1" style={{ color: 'var(--adm-text)' }}>{template.name}</h3>
                <p className="text-sm" style={{ color: 'var(--adm-text-secondary)' }}>{template.description}</p>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'social' && (
          <div className="space-y-6">
            {/* Staff Selector + Platform Logos - same style as Dashboard */}
            <div className="rounded-2xl p-4" style={{ backgroundColor: 'var(--adm-card)', border: '1px solid var(--adm-border)' }}>
              <div className="space-y-3">
                {/* Staff Selection Row */}
                <div className="flex items-center gap-4">
                  <span className="text-xs font-semibold uppercase tracking-wider flex-shrink-0" style={{ color: 'var(--adm-text-secondary)' }}>Staff</span>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => setSelectedAccount(null)}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl transition-all"
                      style={{
                        backgroundColor: !selectedAccount ? 'var(--adm-accent)' : 'var(--adm-input)',
                        color: !selectedAccount ? 'var(--adm-accent-text)' : 'var(--adm-text)',
                        border: !selectedAccount ? '2px solid var(--adm-accent)' : '2px solid transparent',
                      }}
                    >
                      <Globe2 size={16} />
                      <span className="text-sm font-medium">All Staff</span>
                    </button>
                    {(() => {
                      const connected = isAdmin
                        ? socialAccounts.filter(a => a.status === 'connected')
                        : socialAccounts.filter(a => a.staffId === currentUser?.id && a.status === 'connected')
                      const seen = new Set<string>()
                      const staffList: { staffId: string; staffName: string; staffAvatar?: string }[] = []
                      for (const a of connected) {
                        if (!seen.has(a.staffId)) {
                          seen.add(a.staffId)
                          staffList.push({ staffId: a.staffId, staffName: a.staffName, staffAvatar: a.staffAvatar })
                        }
                      }
                      return staffList.map(s => {
                        const isSelected = selectedAccount?.staffId === s.staffId
                        return (
                          <button
                            key={s.staffId}
                            onClick={() => {
                              if (isSelected) { setSelectedAccount(null); return }
                              const staffAccounts = connected.filter(a => a.staffId === s.staffId)
                              if (staffAccounts.length === 0) return
                              const currentPlatform = selectedAccount?.platform
                              const a = currentPlatform
                                ? (staffAccounts.find(a => a.platform === currentPlatform) || staffAccounts[0])
                                : staffAccounts[0]
                              setSelectedAccount({
                                staffId: s.staffId,
                                staffName: s.staffName,
                                platform: a.platform,
                                accountId: a.id,
                                accountUsername: a.username,
                              })
                            }}
                            className="flex items-center gap-2 px-3 py-2 rounded-xl transition-all"
                            style={{
                              backgroundColor: isSelected ? 'var(--adm-accent-bg)' : 'var(--adm-input)',
                              border: isSelected ? '2px solid var(--adm-accent)' : '2px solid transparent',
                            }}
                          >
                            <div className="w-7 h-7 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0" style={{ backgroundColor: 'var(--adm-card)' }}>
                              {s.staffAvatar ? (
                                <img src={s.staffAvatar} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <User size={14} style={{ color: 'var(--adm-text-secondary)' }} />
                              )}
                            </div>
                            <span className="text-sm font-medium" style={{ color: isSelected ? 'var(--adm-accent)' : 'var(--adm-text)' }}>{s.staffName}</span>
                            {isSelected && (
                              <X size={12} className="ml-1 opacity-50" style={{ color: 'var(--adm-accent)' }} />
                            )}
                          </button>
                        )
                      })
                    })()}
                  </div>
                </div>

                {/* Platform Logo Row - Always visible */}
                <div className="flex items-center gap-4">
                  <span className="text-xs font-semibold uppercase tracking-wider flex-shrink-0" style={{ color: 'var(--adm-text-secondary)' }}>Platform</span>
                  <div className="flex items-center gap-2 flex-wrap">
                    {PLATFORMS.map(platform => {
                      const isSelected = selectedAccount?.platform === platform.id
                      const hasAccount = (() => {
                        const connected = isAdmin
                          ? socialAccounts.filter(a => a.status === 'connected')
                          : socialAccounts.filter(a => a.staffId === currentUser?.id && a.status === 'connected')
                        const staffId = selectedAccount?.staffId
                        if (staffId) return connected.some(a => a.staffId === staffId && a.platform === platform.id)
                        return connected.some(a => a.platform === platform.id)
                      })()
                      return (
                        <button
                          key={platform.id}
                          onClick={() => {
                            if (isSelected) { setSelectedAccount(null); return }
                            const connected = isAdmin
                              ? socialAccounts.filter(a => a.status === 'connected')
                              : socialAccounts.filter(a => a.staffId === currentUser?.id && a.status === 'connected')
                            const staffId = selectedAccount?.staffId
                            let candidates = staffId
                              ? connected.filter(a => a.staffId === staffId && a.platform === platform.id)
                              : connected.filter(a => a.platform === platform.id)
                            if (candidates.length === 0) return
                            const a = candidates[0]
                            setSelectedAccount({
                              staffId: a.staffId,
                              staffName: a.staffName,
                              platform: a.platform,
                              accountId: a.id,
                              accountUsername: a.username,
                            })
                          }}
                          disabled={!hasAccount}
                          className="relative p-2.5 rounded-xl transition-all flex items-center gap-2"
                          style={{
                            backgroundColor: isSelected ? platform.bgColor : 'var(--adm-input)',
                            border: isSelected ? `2px solid ${platform.color}` : '2px solid transparent',
                            opacity: hasAccount ? 1 : 0.35,
                            cursor: hasAccount ? 'pointer' : 'not-allowed',
                          }}
                          title={`${platform.name}${!hasAccount ? ' (no connected account)' : ''}`}
                        >
                          <platform.icon size={20} style={{ color: isSelected ? platform.color : 'var(--adm-text-secondary)' }} />
                          <span className="text-xs font-medium hidden sm:inline" style={{ color: isSelected ? platform.color : 'var(--adm-text-secondary)' }}>{platform.name}</span>
                          {isSelected && <Check size={14} style={{ color: platform.color }} />}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Selected filter indicator */}
                {selectedAccount && (
                  <div className="flex items-center gap-2 pt-1 flex-wrap">
                    <span className="text-xs" style={{ color: 'var(--adm-text-secondary)' }}>Filtering:</span>
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ backgroundColor: 'var(--adm-accent-bg)' }}>
                      <User size={12} style={{ color: 'var(--adm-accent)' }} />
                      <span className="text-xs font-medium" style={{ color: 'var(--adm-accent)' }}>{selectedAccount.staffName}</span>
                    </div>
                    <ChevronRight size={12} style={{ color: 'var(--adm-text-secondary)' }} />
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ backgroundColor: (() => { const p = PLATFORMS.find(p => p.id === selectedAccount.platform); return p?.bgColor || 'var(--adm-input)'; })() }}>
                      {(() => {
                        const p = PLATFORMS.find(p => p.id === selectedAccount.platform)
                        const Icon = p?.icon || Globe2
                        return <Icon size={12} style={{ color: p?.color || 'var(--adm-text-secondary)' }} />
                      })()}
                      <span className="text-xs font-medium" style={{ color: (() => { const p = PLATFORMS.find(p => p.id === selectedAccount.platform); return p?.color || 'var(--adm-text)'; })() }}>
                        {PLATFORMS.find(p => p.id === selectedAccount.platform)?.name || selectedAccount.platform}
                      </span>
                    </div>
                    <ChevronRight size={12} style={{ color: 'var(--adm-text-secondary)' }} />
                    <span className="text-xs font-medium" style={{ color: 'var(--adm-text)' }}>@{selectedAccount.accountUsername}</span>
                    <button
                      onClick={() => setSelectedAccount(null)}
                      className="ml-2 px-2 py-0.5 rounded text-xs hover:opacity-70"
                      style={{ color: 'var(--adm-text-secondary)', backgroundColor: 'var(--adm-input)' }}
                    >
                      Clear filter
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Login Platforms + Account Preview - merged into one row */}
            <div className="grid grid-cols-1 xl:grid-cols-[440px_1fr] gap-6">
              {/* Login Buttons - show all connected accounts as avatar grid */}
              <div className="rounded-2xl p-5" style={{ backgroundColor: 'var(--adm-card)', border: '1px solid var(--adm-border)' }}>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--adm-text)' }}>
                  <LogIn size={14} style={{ color: 'var(--adm-accent)' }} />
                  Connect Account
                  <button
                    onClick={() => setEditMode(!editMode)}
                    className="ml-auto px-2.5 py-1 text-[10px] rounded-lg font-medium flex items-center gap-1"
                    style={{ backgroundColor: editMode ? '#EF4444' : 'var(--adm-input)', color: editMode ? 'white' : 'var(--adm-text)' }}
                  >
                    {editMode ? 'Done' : 'Edit'}
                  </button>
                  <button
                    onClick={handleSyncAvatars}
                    disabled={syncAvatarLoading}
                    className="px-2 py-1 text-[10px] rounded-lg font-medium flex items-center gap-1 disabled:opacity-50"
                    style={{ backgroundColor: 'var(--adm-input)', color: 'var(--adm-text-secondary)' }}
                    title="Sync avatars from social platforms"
                  >
                    {syncAvatarLoading ? <Loader2 size={10} className="animate-spin" /> : <RefreshCw size={10} />}
                    Sync
                  </button>
                </h3>

                {/* Connected accounts - interactive 4D star map */}
                {(() => {
                  const allConnected = socialAccounts.filter(a => a.status === 'connected')
                  if (allConnected.length === 0) {
                    return (
                      <div className="flex flex-col items-center py-8">
                        <div className="relative mb-3">
                          <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ backgroundColor: 'color-mix(in srgb, var(--adm-accent) 12%, transparent)', boxShadow: '0 0 24px color-mix(in srgb, var(--adm-accent) 25%, transparent)' }}>
                            <User size={24} style={{ color: 'var(--adm-accent)' }} />
                          </div>
                          <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2" style={{ backgroundColor: '#9CA3AF', borderColor: 'var(--adm-card)' }} />
                        </div>
                        <p className="text-sm font-medium" style={{ color: 'var(--adm-text)' }}>No accounts connected yet</p>
                        <p className="text-xs mt-1" style={{ color: 'var(--adm-text-secondary)' }}>Click any platform below to connect</p>
                      </div>
                    )
                  }
                  const sorted = [...allConnected].sort((a, b) => (a.platform || '').localeCompare(b.platform || '') || (a.username || '').localeCompare(b.username || ''))
                  const N = sorted.length
                  const R = 120

                  return (
                    <div className="flex flex-col gap-2.5">
                      {/* Summary */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-medium" style={{ color: 'var(--adm-text-secondary)' }}>{N} star accounts</span>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            {PLATFORMS.map(p => {
                              const has = allConnected.some(a => a.platform === p.id)
                              return (
                                <span key={p.id} style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: has ? p.color : 'color-mix(in srgb, var(--adm-border) 55%, transparent)', boxShadow: has ? `0 0 5px ${p.color}` : 'none' }} />
                              )
                            })}
                          </div>
                          <button
                            onClick={() => {
                              const next = !orbitAuto
                              setOrbitAuto(next)
                              orbitAutoRef.current = next
                            }}
                            className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold transition-all"
                            style={{
                              backgroundColor: orbitAuto ? 'rgba(0,229,255,0.14)' : 'var(--adm-input)',
                              color: orbitAuto ? '#00E5FF' : 'var(--adm-text-secondary)',
                              border: `1px solid ${orbitAuto ? 'rgba(0,229,255,0.5)' : 'var(--adm-border)'}`,
                              boxShadow: orbitAuto ? '0 0 10px rgba(0,229,255,0.25)' : 'none',
                            }}
                            title={orbitAuto ? 'Pause auto-orbit' : 'Start auto-orbit'}
                          >
                            {orbitAuto ? <Pause size={10} /> : <Play size={10} />}
                            {orbitAuto ? 'Auto On' : 'Auto'}
                          </button>
                        </div>
                      </div>

                      {/* 3D starfield scene */}
                      <div
                        ref={(el) => {
                          orbitSceneRef.current = el
                          if (el && !el.dataset.orbitBound) {
                            el.dataset.orbitBound = '1'
                            el.addEventListener('wheel', (e) => {
                              e.preventDefault()
                              const t = orbitRotRef.current
                              t.zoom = Math.min(1.9, Math.max(0.55, t.zoom - e.deltaY * 0.0011))
                              applyOrbitTransform()
                            }, { passive: false })
                          }
                        }}
                        className="relative rounded-xl overflow-hidden select-none"
                        style={{
                          height: 310,
                          cursor: orbitDragging ? 'grabbing' : 'grab',
                          touchAction: 'none',
                          perspective: 950,
                        }}
                        onClick={() => { if (!orbitDragRef.current?.moved) setOrbitActiveId(null) }}
                        onPointerDown={(e) => {
                          orbitDragRef.current = { x: e.clientX, y: e.clientY, rx: orbitRotRef.current.rx, ry: orbitRotRef.current.ry, moved: false }
                          setOrbitDragging(true)
                        }}
                        onPointerMove={(e) => {
                          const d = orbitDragRef.current
                          if (!d) return
                          const dx = e.clientX - d.x
                          const dy = e.clientY - d.y
                          if (Math.abs(dx) + Math.abs(dy) > 4) d.moved = true
                          orbitRotRef.current.rx = Math.max(-70, Math.min(70, d.rx - dy * 0.25))
                          orbitRotRef.current.ry = d.ry + dx * 0.35
                          applyOrbitTransform()
                        }}
                        onPointerUp={() => { orbitDragRef.current = null; setOrbitDragging(false) }}
                        onPointerCancel={() => { orbitDragRef.current = null; setOrbitDragging(false) }}
                      >
                        {/* Pure-black void galaxy background */}
                        <div
                          ref={(el) => { orbitBgRef.current = el; if (el) el.style.transform = 'none' }}
                          className="pointer-events-none absolute -inset-10"
                          style={{ background: '#010208' }}
                        >
                          {/* Deep subtle nebulas */}
                          <div className="absolute" style={{ left: '12%', top: '18%', width: 260, height: 260, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.10), transparent 65%)', filter: 'blur(18px)' }} />
                          <div className="absolute" style={{ right: '6%', top: '52%', width: 240, height: 240, borderRadius: '50%', background: 'radial-gradient(circle, rgba(56,189,248,0.07), transparent 65%)', filter: 'blur(18px)' }} />
                          <div className="absolute" style={{ left: '40%', bottom: '0%', width: 260, height: 180, borderRadius: '50%', background: 'radial-gradient(circle, rgba(217,70,239,0.05), transparent 65%)', filter: 'blur(20px)' }} />
                          {/* Milky-way diagonal band */}
                          <div className="absolute -inset-[40%] rotate-[22deg]" style={{ background: 'linear-gradient(90deg, transparent 40%, rgba(190,210,255,0.05) 47%, rgba(255,255,255,0.10) 50%, rgba(190,210,255,0.05) 53%, transparent 60%)', filter: 'blur(14px)' }} />
                          {/* Accompanying planets */}
                          {/* Ringed gas giant */}
                          <div className="absolute" style={{ left: '4%', top: '7%', width: 62, height: 62 }}>
                            <div className="absolute left-1/2 top-1/2" style={{ width: 108, height: 32, transform: 'translate(-50%, -50%) rotate(-16deg)', borderRadius: '50%', background: 'linear-gradient(90deg, transparent, rgba(210,180,255,0.55), rgba(255,255,255,0.8), rgba(210,180,255,0.55), transparent)', filter: 'blur(1px)' }} />
                            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ width: 60, height: 60, background: 'radial-gradient(circle at 32% 28%, #e8d9ff 0%, #7a5cf0 38%, #241a5c 72%, #0a0820 100%)', boxShadow: '0 0 26px rgba(122,92,240,0.35), inset -8px -10px 22px rgba(0,0,0,0.55)' }} />
                            <div className="absolute left-1/2 top-1/2" style={{ width: 108, height: 32, transform: 'translate(-50%, -50%) rotate(-16deg)', borderRadius: '50%', background: 'linear-gradient(90deg, transparent, rgba(210,180,255,0.40) 40%, rgba(255,255,255,0.55) 50%, rgba(210,180,255,0.40) 60%, transparent)', filter: 'blur(1px)', clipPath: 'inset(0 0 52% 0)' }} />
                          </div>
                          {/* Cratered planet */}
                          <div className="absolute rounded-full" style={{ right: '9%', top: '16%', width: 40, height: 40, background: 'radial-gradient(circle at 35% 30%, #ffd9b0 0%, #d76f3c 42%, #7a2d12 76%, #1a0703 100%)', boxShadow: '0 0 22px rgba(215,111,60,0.30), inset -6px -8px 14px rgba(0,0,0,0.5)' }} />
                          {/* Teal moon */}
                          <div className="absolute rounded-full" style={{ right: '18%', bottom: '10%', width: 16, height: 16, background: 'radial-gradient(circle at 35% 30%, #d8f6ff 0%, #4db6c8 45%, #0b3a47 80%)', boxShadow: '0 0 12px rgba(77,182,200,0.45)' }} />

                          {/* Static star dust */}
                          <div className="absolute inset-0">
                            {Array.from({ length: 130 }).map((_, i) => (
                              <span
                                key={i}
                                style={{
                                  position: 'absolute',
                                  left: `${(i * 29.7 + 3.3) % 100}%`,
                                  top: `${(i * 47.3 + 11.7) % 100}%`,
                                  width: `${1 + ((i * 7) % 3)}px`,
                                  height: `${1 + ((i * 7) % 3)}px`,
                                  borderRadius: '50%',
                                  backgroundColor: i % 5 === 0 ? 'rgba(148,190,255,0.95)' : i % 5 === 1 ? 'rgba(255,255,255,0.9)' : 'rgba(220,230,255,0.75)',
                                  boxShadow: i % 6 === 0 ? '0 0 6px rgba(160,190,255,0.9)' : '0 0 3px rgba(255,255,255,0.7)',
                                  opacity: 0.35 + (i % 4) * 0.12,
                                  animation: `twinkle ${2 + ((i * 13) % 4)}s ease-in-out ${(i % 12) * 0.4}s infinite`,
                                }}
                              />
                            ))}
                            {/* Cross-sparkle stars */}
                            {[12, 33, 61, 88].map((p, k) => (
                              <span
                                key={k}
                                className="absolute"
                                style={{
                                  left: `${(p * 7.3 + 8.1) % 100}%`,
                                  top: `${(p * 11.9 + 21.3) % 100}%`,
                                  width: 4,
                                  height: 4,
                                  background: 'radial-gradient(circle, #fff 0 1px, transparent 1.5px), linear-gradient(90deg, transparent 42%, rgba(255,255,255,0.95) 50%, transparent 58%), linear-gradient(0deg, transparent 42%, rgba(255,255,255,0.95) 50%, transparent 58%)',
                                  animation: `twinkle ${2.6 + k * 0.4}s ease-in-out ${k * 1.1}s infinite`,
                                }}
                              />
                            ))}
                          </div>
                          {/* Soft vignette */}
                          <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 45%, transparent 60%, rgba(0,0,0,0.28) 100%)' }} />
                          {/* CRT scanlines */}
                          <div className="absolute inset-0" style={{ background: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.018) 0 1px, transparent 1px 3px)', mixBlendMode: 'overlay' }} />
                          {/* Film grain texture */}
                          <div className="absolute inset-0" style={{ backgroundImage: `url("${NOISE_DATA_URI}")`, mixBlendMode: 'overlay', opacity: 0.10 }} />
                        </div>

                        {/* 3D star field (drag-rotatable) */}
                        <div
                          ref={(el) => {
                            orbitWrapRef.current = el
                            if (el) {
                              const t = orbitRotRef.current
                              el.style.transform = `rotateX(${t.rx}deg) rotateY(${t.ry}deg) scale(${t.zoom})`
                              applyOrbitTransform()
                            }
                          }}
                          className="absolute left-1/2 top-1/2"
                          style={{ transformStyle: 'preserve-3d' }}
                        >
                          {sorted.map((account, i) => {
                            const phi = (i / N) * Math.PI * 2
                            const lat = (((i * 0.618) % 1) - 0.5) * Math.PI * 0.72
                            const x = R * Math.cos(lat) * Math.cos(phi)
                            const y = R * Math.sin(lat)
                            const z = R * Math.cos(lat) * Math.sin(phi)
                            const pInfo = PLATFORMS.find(p => p.id === account.platform)
                            const pColor = pInfo?.color || '#818cf8'
                            const isHover = orbitHoverId === account.id && !orbitDragging
                            const isActive = orbitActiveId === account.id
                            const offset = starOffsets[account.id] || { x: 0, y: 0 }
                            return (
                              <div key={account.id} data-star-anchor={account.id} className="absolute" style={{ width: 0, height: 0, transform: `translate3d(${x + offset.x}px, ${y + offset.y}px, ${z}px)`, transformStyle: 'preserve-3d' }}>
                                <div
                                  data-star-depth
                                  data-px={x + offset.x}
                                  data-py={y + offset.y}
                                  data-pz={z}
                                  className="relative flex flex-col items-center cursor-grab"
                                  style={{ transform: 'translate(-50%, -50%)', opacity: 1, transition: 'opacity 0.12s linear' }}
                                  onPointerDown={(e) => {
                                    e.stopPropagation()
                                    ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
                                    starDragRef.current = {
                                      accountId: account.id,
                                      startX: e.clientX,
                                      startY: e.clientY,
                                      baseX: x + offset.x,
                                      baseY: y + offset.y,
                                      baseZ: z,
                                      moved: false,
                                    }
                                    starDragMovedRef.current = false
                                  }}
                                  onPointerMove={(e) => {
                                    const d = starDragRef.current
                                    if (!d || d.accountId !== account.id) return
                                    const dx = e.clientX - d.startX
                                    const dy = e.clientY - d.startY
                                    if (Math.abs(dx) + Math.abs(dy) > 4) {
                                      d.moved = true
                                      starDragMovedRef.current = true
                                    }
                                    const nx = d.baseX + dx
                                    const ny = d.baseY + dy
                                    const anchor = e.currentTarget.parentElement as HTMLElement
                                    if (anchor) {
                                      anchor.style.transform = `translate3d(${nx}px, ${ny}px, ${d.baseZ}px)`
                                    }
                                    e.currentTarget.dataset.px = String(nx)
                                    e.currentTarget.dataset.py = String(ny)
                                    applyOrbitTransform()
                                  }}
                                  onPointerUp={(e) => {
                                    const d = starDragRef.current
                                    if (d && d.accountId === account.id) {
                                      const dx = e.clientX - d.startX
                                      const dy = e.clientY - d.startY
                                      if (d.moved || Math.abs(dx) + Math.abs(dy) > 4) {
                                        const nx = d.baseX + dx
                                        const ny = d.baseY + dy
                                        setStarOffsets(prev => ({ ...prev, [account.id]: { x: nx - x, y: ny - y } }))
                                        starDragMovedRef.current = true
                                      }
                                      starDragRef.current = null
                                    }
                                  }}
                                  onPointerCancel={() => { starDragRef.current = null }}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    if (editMode) return
                                    if (orbitDragRef.current?.moved || starDragMovedRef.current) return
                                    starDragMovedRef.current = false
                                    setOrbitActiveId(prev => (prev === account.id ? null : account.id))
                                    setSelectedAccount({
                                      staffId: account.staffId,
                                      staffName: account.staffName,
                                      platform: account.platform,
                                      accountId: account.id,
                                      accountUsername: account.username,
                                    })
                                  }}
                                  onMouseEnter={() => setOrbitHoverId(account.id)}
                                  onMouseLeave={() => setOrbitHoverId(null)}
                                >
                                  <div style={{ animation: `float-bob 5.4s ease-in-out ${i * 0.7}s infinite`, animationPlayState: orbitDragging || starDragRef.current?.accountId === account.id ? 'paused' : 'running' }}>
                                  {isActive ? (
                                    <div className="relative">
                                      {/* rotating halo ring */}
                                      <div
                                        className="absolute pointer-events-none"
                                        style={{
                                          inset: -5,
                                          borderRadius: '50%',
                                          background: 'conic-gradient(from 0deg, transparent 0%, rgba(0,229,255,0.9) 14%, transparent 30%, transparent 55%, rgba(255,46,154,0.85) 70%, transparent 88%)',
                                          WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 2px), black calc(100% - 1px))',
                                          mask: 'radial-gradient(farthest-side, transparent calc(100% - 2px), black calc(100% - 1px))',
                                          animation: 'spin-ring 3.5s linear infinite',
                                        }}
                                      />
                                      {/* halo glow */}
                                      <div
                                        className="absolute pointer-events-none"
                                        style={{ inset: -12, borderRadius: '50%', background: `radial-gradient(circle, ${pColor}55, transparent 70%)`, filter: 'blur(6px)' }}
                                      />
                                      <div
                                        className="relative rounded-full overflow-hidden flex items-center justify-center"
                                        style={{
                                          width: 54,
                                          height: 54,
                                          border: `2px solid ${pColor}`,
                                          backgroundColor: 'var(--adm-card)',
                                          boxShadow: `0 0 0 3px ${pColor}33, 0 0 30px ${pColor}88`,
                                          animation: 'avatar-in 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
                                        }}
                                      >
                                        {account.avatar ? (
                                          <img src={account.avatar} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                          <div className="w-full h-full flex items-center justify-center font-bold text-white text-xs" style={{ backgroundColor: pColor }}>
                                            {(account.username || '?')[0].toUpperCase()}
                                          </div>
                                        )}
                                        {editMode && (
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              handleDisconnectSocial(account.id)
                                            }}
                                            className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center shadow-md hover:scale-110 transition-transform"
                                            style={{ backgroundColor: '#EF4444', color: 'white', zIndex: 5 }}
                                            title={`Disconnect @${account.username}`}
                                          >
                                            <X size={10} />
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="relative flex flex-col items-center">
                                      {/* soft halo */}
                                      <div
                                        className="absolute pointer-events-none rounded-full"
                                        style={{
                                          top: '50%',
                                          left: '50%',
                                          width: isHover ? 46 : 34,
                                          height: isHover ? 46 : 34,
                                          transform: 'translate(-50%, -62%)',
                                          background: `radial-gradient(circle, ${pColor}59, transparent 70%)`,
                                          filter: 'blur(2px)',
                                          transition: 'all 0.25s ease',
                                        }}
                                      />
                                      <div
                                        className="relative rounded-full"
                                        style={{
                                          width: isHover ? 19 : 13,
                                          height: isHover ? 19 : 13,
                                          background: `radial-gradient(circle at 35% 30%, #fff 0 14%, ${pColor} 55%, ${pColor} 100%)`,
                                          boxShadow: `0 0 14px 2px ${pColor}AA, 0 0 4px #fff, inset 0 -1px 2px rgba(0,0,0,0.35)`,
                                          transition: 'all 0.22s ease',
                                          animation: 'twinkle 3.2s ease-in-out infinite',
                                        }}
                                      />
                                      {/* hover cross sparkle */}
                                      {isHover && (
                                        <span
                                          className="absolute pointer-events-none"
                                          style={{
                                            top: '38%',
                                            left: '50%',
                                            width: 26,
                                            height: 26,
                                            transform: 'translate(-50%, -50%)',
                                            background: 'radial-gradient(circle, #fff 0 1px, transparent 1.5px), linear-gradient(90deg, transparent 46%, rgba(255,255,255,0.95) 50%, transparent 54%), linear-gradient(0deg, transparent 46%, rgba(255,255,255,0.95) 50%, transparent 54%)',
                                            animation: 'twinkle 1.2s ease-in-out infinite',
                                          }}
                                        />
                                      )}
                                    </div>
                                  )}
                                  <span
                                    className="mt-1.5 text-[10px] font-semibold truncate pointer-events-none"
                                    style={{
                                      maxWidth: 96,
                                      fontFamily: '"Space Mono", "IBM Plex Mono", ui-monospace, monospace',
                                      color: isActive || isHover ? pColor : 'rgba(235,240,255,0.95)',
                                      textShadow: `0 1px 3px rgba(0,0,0,0.95), 0 0 ${isActive || isHover ? 10 : 6}px ${pColor}${isActive || isHover ? 'CC' : '59'}`,
                                    }}
                                  >
                                    @{account.username}
                                  </span>
                                  {isHover && !isActive && (
                                    <div
                                      className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-1 rounded-md text-[10px] pointer-events-none"
                                      style={{ backgroundColor: 'rgba(8,10,18,0.94)', border: `1px solid ${pColor}55`, color: 'var(--adm-text)', boxShadow: `0 4px 14px rgba(0,0,0,0.45), 0 0 12px ${pColor}2E` }}
                                    >
                                      <span style={{ color: pColor }}>{pInfo?.name || account.platform}</span> · @{account.username}
                                      <span className="ml-1" style={{ color: account.isOnline === true ? '#22c55e' : '#9CA3AF' }}>{account.isOnline === true ? '●' : '○'}</span>
                                    </div>
                                  )}
                                  {isActive && (
                                    <div
                                      className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-0.5 rounded-full text-[9px] font-medium pointer-events-none"
                                      style={{ backgroundColor: pColor + '22', color: pColor, border: `1px solid ${pColor}55` }}
                                    >
                                      {pInfo?.name || account.platform}
                                    </div>
                                  )}
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                        {/* Constellation lines (live-projected) */}
                        {N > 1 && (
                          <svg
                            ref={orbitLinesRef}
                            className="absolute left-1/2 top-1/2 pointer-events-none"
                            style={{ width: 0, height: 0, overflow: 'visible' }}
                          >
                            {Array.from({ length: N }).map((_, i) => (
                              <line key={i} data-star-line stroke="#00E5FF" strokeWidth={1} />
                            ))}
                          </svg>
                        )}
                      </div>
                      <p className="text-[10px] text-center" style={{ color: 'var(--adm-text-secondary)' }}>
                        Drag to rotate · Scroll to zoom · Hover a star for info · Click to view avatar
                      </p>
                    </div>
                  )
                })()}

                {/* Add new account buttons - platform row */}
                <div className="mt-4 pt-3 border-t flex flex-wrap gap-2" style={{ borderColor: 'var(--adm-border)' }}>
                  {PLATFORMS.map(platform => {
                    const count = socialAccounts.filter(a => a.platform === platform.id && a.status === 'connected').length
                    return (
                      <button
                        key={platform.id}
                        onClick={() => handleSocialLogin(platform.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium transition-all hover:scale-[1.04]"
                        style={{
                          background: count > 0 ? `linear-gradient(135deg, ${platform.color}24, ${platform.color}0D)` : 'color-mix(in srgb, var(--adm-card) 55%, transparent)',
                          color: count > 0 ? platform.color : 'var(--adm-text-secondary)',
                          border: `1px solid ${count > 0 ? platform.color + '55' : 'var(--adm-border)'}`,
                          boxShadow: count > 0 ? `0 2px 10px ${platform.color}1F` : 'none',
                        }}
                        title={`${count > 0 ? `${count} connected - ` : ''}Add ${platform.name} account`}
                      >
                        <platform.icon size={12} />
                        <span>{platform.name}</span>
                        {count > 0 && <span className="opacity-75 font-bold">· {count}</span>}
                        <Plus size={10} className="opacity-70" />
                      </button>
                    )
                  })}
                </div>

                {/* Platform options popup - shown when clicking a platform with existing accounts */}
                {platformOptionsPlatform && (() => {
                  const pInfo = PLATFORMS.find(p => p.id === platformOptionsPlatform)
                  const existingAccounts = socialAccounts.filter(a => a.platform === platformOptionsPlatform && a.status === 'connected')
                  if (!pInfo) return null
                  return (
                    <div className="mt-3 p-3 rounded-xl" style={{ backgroundColor: pInfo.bgColor, border: `1px solid ${pInfo.color}30` }}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <pInfo.icon size={14} style={{ color: pInfo.color }} />
                          <span className="text-xs font-semibold" style={{ color: pInfo.color }}>{pInfo.name}</span>
                          <span className="text-[10px] opacity-60" style={{ color: pInfo.color }}>({existingAccounts.length} connected)</span>
                        </div>
                        <button onClick={() => setPlatformOptionsPlatform('')} className="p-0.5 rounded" style={{ color: pInfo.color }}>
                          <X size={14} />
                        </button>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleReLoginAccount(platformOptionsPlatform)}
                          className="flex-1 px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all hover:opacity-80"
                          style={{ backgroundColor: 'white', color: pInfo.color, border: `1px solid ${pInfo.color}40` }}
                        >
                          <RefreshCw size={11} /> Re-login
                        </button>
                        <button
                          onClick={() => handleAddNewAccount(platformOptionsPlatform)}
                          className="flex-1 px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all hover:opacity-80"
                          style={{ backgroundColor: pInfo.color, color: 'white' }}
                        >
                          <Plus size={11} /> Add New Account
                        </button>
                      </div>
                      <p className="text-[10px] mt-2 text-center opacity-60" style={{ color: pInfo.color }}>
                        "Re-login" replaces the existing account. "Add New Account" keeps the current one and adds another.
                      </p>
                    </div>
                  )
                })()}
              </div>

              {/* Account Preview - merged with selector */}
              <div className="rounded-2xl p-5" style={{ backgroundColor: 'var(--adm-card)', border: '1px solid var(--adm-border)' }}>
                <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
                  <div>
                    <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--adm-text)' }}>
                      <Eye size={14} style={{ color: 'var(--adm-accent)' }} />
                      Account Preview
                    </h3>
                    <p className="text-xs" style={{ color: 'var(--adm-text-secondary)' }}>Select an account to view details</p>
                  </div>
                  <button
                    onClick={() => setActiveTab('projects')}
                    className="px-3 py-1.5 text-xs rounded-lg font-medium flex items-center gap-1.5"
                    style={{ backgroundColor: 'var(--adm-input)', color: 'var(--adm-text)' }}
                  >
                    <Layers size={12} /> Manage All
                  </button>
                </div>
                {(() => {
                  const previewAccount = selectedPreviewAccount || socialAccounts.find(a => a.status === 'connected') || null
                  if (!previewAccount) {
                    return (
                      <div className="text-center py-8">
                        <User size={32} className="mx-auto mb-2 opacity-20" style={{ color: 'var(--adm-text-secondary)' }} />
                        <p className="text-sm" style={{ color: 'var(--adm-text-secondary)' }}>No connected accounts yet</p>
                        <p className="text-xs mt-1" style={{ color: 'var(--adm-text-secondary)' }}>Connect a platform to see details here</p>
                      </div>
                    )
                  }
                  const pInfo = PLATFORMS.find(p => p.id === previewAccount.platform)
                  const pColor = pInfo?.color || '#6366F1'
                  const online = previewAccount.isOnline === true
                  return (
                    <div className="flex items-center gap-4">
                      <div className="relative flex-shrink-0">
                        <div className="w-14 h-14 rounded-full flex items-center justify-center overflow-hidden" style={{ border: `3px solid ${pColor}`, backgroundColor: 'var(--adm-card)', boxShadow: `0 0 0 4px ${pColor}22, 0 0 18px ${pColor}40` }}>
                          {previewAccount.avatar ? (
                            <img src={previewAccount.avatar} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xl font-bold text-white" style={{ backgroundColor: pColor }}>
                              {(previewAccount.username || previewAccount.staffName || '?')[0].toUpperCase()}
                            </div>
                          )}
                        </div>
                        <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2" style={{ backgroundColor: online ? '#22c55e' : '#9CA3AF', borderColor: 'var(--adm-card)' }} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-base font-bold" style={{ color: 'var(--adm-text)' }}>{previewAccount.staffName}</p>
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ backgroundColor: online ? '#DCFCE7' : 'var(--adm-input)', color: online ? '#166534' : 'var(--adm-text-secondary)' }}>
                            {online ? '● ONLINE' : '○ OFFLINE'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {pInfo && <pInfo.icon size={12} style={{ color: pColor }} />}
                          <span className="text-sm" style={{ color: 'var(--adm-text-secondary)' }}>{pInfo?.name || previewAccount.platform}</span>
                          <AtSign size={12} style={{ color: 'var(--adm-text-secondary)' }} />
                          <span className="text-sm font-medium" style={{ color: 'var(--adm-text)' }}>@{previewAccount.username}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: pColor + '1A', color: pColor }}>Connected</span>
                          {previewAccount.lastSync && <span className="text-[10px]" style={{ color: 'var(--adm-text-secondary)' }}>Last sync: {new Date(previewAccount.lastSync).toLocaleString()}</span>}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 flex-shrink-0">
                        <button
                          onClick={() => window.open(previewAccount.profileUrl || pInfo?.url || '#', '_blank')}
                          className="px-3 py-1.5 text-xs rounded-lg font-medium flex items-center justify-center gap-1"
                          style={{ backgroundColor: pColor, color: 'white' }}
                        >
                          <ArrowUpRight size={12} /> View Profile
                        </button>
                        <button
                          onClick={() => handleDisconnectSocial(previewAccount.id)}
                          className="px-3 py-1.5 text-xs rounded-lg font-medium"
                          style={{ backgroundColor: 'var(--adm-input)', color: '#EF4444' }}
                        >
                          Disconnect
                        </button>
                      </div>
                    </div>
                  )
                })()}
              </div>
            </div>

            {/* Vertical Category Navigation */}
            <div className="grid grid-cols-1 xl:grid-cols-[260px_1fr] gap-6">
              {/* Sidebar Category List */}
              <div className="rounded-2xl p-4" style={{ backgroundColor: 'var(--adm-card)', border: '1px solid var(--adm-border)' }}>
                <h3 className="text-xs font-semibold uppercase tracking-wider mb-3 px-2" style={{ color: 'var(--adm-text-secondary)' }}>Categories</h3>
                <nav className="space-y-1">
                  {[
                    { id: 'platform-matrix', label: 'Platform Capability', icon: Layers, desc: 'API status & metrics' },
                    { id: 'account-ops', label: 'Account Operations', icon: Users2, desc: 'Accounts & preview' },
                    { id: 'dev-config', label: 'Developer Config', icon: Settings, desc: 'OAuth connectors & setup' },
                    { id: 'staff-auth', label: 'Staff Authorization', icon: Shield, desc: 'Employee OAuth status' },
                    { id: 'quick-share', label: 'Quick Share', icon: Share2, desc: 'Share products & links' },
                    { id: 'webhooks', label: 'Webhooks', icon: Zap, desc: 'Real-time event config' },
                  ].map(item => {
                    const isActive = socialCategory === item.id
                    return (
                      <button
                        key={item.id}
                        onClick={() => setSocialCategory(isActive ? '' : item.id)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all"
                        style={{
                          backgroundColor: isActive ? 'var(--adm-accent-bg)' : 'transparent',
                          border: isActive ? '1px solid var(--adm-accent)' : '1px solid transparent',
                        }}
                      >
                        <item.icon size={16} style={{ color: isActive ? 'var(--adm-accent)' : 'var(--adm-text-secondary)' }} />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium" style={{ color: isActive ? 'var(--adm-accent)' : 'var(--adm-text)' }}>{item.label}</p>
                          <p className="text-[10px] truncate" style={{ color: 'var(--adm-text-secondary)' }}>{item.desc}</p>
                        </div>
                        {isActive && <ChevronRight size={14} style={{ color: 'var(--adm-accent)' }} />}
                      </button>
                    )
                  })}
                </nav>
              </div>

              {/* Content Panel */}
              <div className="space-y-0">
                {!socialCategory && (
                  <div className="rounded-2xl p-12 text-center" style={{ backgroundColor: 'var(--adm-card)', border: '1px solid var(--adm-border)' }}>
                    <Layers size={40} className="mx-auto mb-3 opacity-20" style={{ color: 'var(--adm-text-secondary)' }} />
                    <p className="text-sm font-medium" style={{ color: 'var(--adm-text)' }}>Select a category</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--adm-text-secondary)' }}>Choose a category from the sidebar to view related content</p>
                  </div>
                )}

                {socialCategory === 'platform-matrix' && (
                  <div className="rounded-2xl p-5" style={{ backgroundColor: 'var(--adm-card)', border: '1px solid var(--adm-border)' }}>
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div>
                        <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--adm-text)' }}>
                          <Layers size={14} style={{ color: 'var(--adm-accent)' }} /> Platform Capability Matrix
                        </h3>
                        <p className="text-xs" style={{ color: 'var(--adm-text-secondary)' }}>Platform API status, account count, and operational metrics</p>
                      </div>
                      <span className="text-[10px] px-2.5 py-1 rounded-full font-medium" style={{ backgroundColor: 'var(--adm-input)', color: 'var(--adm-text-secondary)' }}>
                        {`${platformCapabilityMatrix.filter(item => item.connectedAccounts.length > 0).length} active platforms`}
                      </span>
                    </div>
                    {/* Filter indicator when selectedAccount is set */}
                    {selectedAccount && (
                      <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg" style={{ backgroundColor: 'var(--adm-accent-bg)' }}>
                        <Filter size={12} style={{ color: 'var(--adm-accent)' }} />
                        <span className="text-xs" style={{ color: 'var(--adm-accent)' }}>
                          Filtered: <strong>{selectedAccount.staffName}</strong> · {PLATFORMS.find(p => p.id === selectedAccount.platform)?.name || selectedAccount.platform} · @{selectedAccount.accountUsername}
                        </span>
                      </div>
                    )}
                    <div className="space-y-3">
                      {platformCapabilityMatrix
                        .filter(item => !selectedAccount || item.id === selectedAccount.platform)
                        .map(item => {
                          const completeness = Math.round(((item.readyCount + item.partialCount * 0.5) / Math.max(item.capabilityEntries.length, 1)) * 100)
                        return (
                          <div key={item.id} className="rounded-xl p-4" style={{ backgroundColor: 'var(--adm-input)' }}>
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: item.bgColor }}>
                                  <item.icon size={18} style={{ color: item.color }} />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold" style={{ color: 'var(--adm-text)' }}>{item.name}</p>
                                  <p className="text-[11px]" style={{ color: 'var(--adm-text-secondary)' }}>
                                    {item.connectedAccounts.length > 0
                                      ? `${item.connectedAccounts.length} connected · ${item.publishedRecords.length} published · ${item.clicks} clicks`
                                      : 'No connected account yet'}
                                  </p>
                                </div>
                              </div>
                              <span className="text-[10px] px-2 py-1 rounded-full font-medium flex-shrink-0"
                                style={{ backgroundColor: item.connectedAccounts.length > 0 ? '#DCFCE7' : '#F3F4F6', color: item.connectedAccounts.length > 0 ? '#166534' : '#4B5563' }}>
                                {item.connectedAccounts.length > 0 ? 'Auto tracked' : 'Waiting'}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                              {(item.capabilityEntries as Array<[string, string]>).map(([label, status]) => {
                                const badge = getCapabilityBadge(status as CapabilityStatus)
                                return (
                                  <div key={label} className="rounded-lg p-3" style={{ backgroundColor: 'var(--adm-card)' }}>
                                    <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--adm-text-secondary)' }}>{label}</p>
                                    <span className="inline-flex mt-2 text-[10px] px-2 py-1 rounded-full font-medium"
                                      style={{ backgroundColor: badge.backgroundColor, color: badge.color }}>
                                      {badge.label}
                                    </span>
                                  </div>
                                )
                              })}
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                              <div className="rounded-lg p-3" style={{ backgroundColor: 'var(--adm-card)' }}>
                                <p className="text-[10px]" style={{ color: 'var(--adm-text-secondary)' }}>Accounts</p>
                                <p className="text-sm font-semibold mt-1" style={{ color: 'var(--adm-text)' }}>{item.accounts.length}</p>
                              </div>
                              <div className="rounded-lg p-3" style={{ backgroundColor: 'var(--adm-card)' }}>
                                <p className="text-[10px]" style={{ color: 'var(--adm-text-secondary)' }}>Manual Queue</p>
                                <p className="text-sm font-semibold mt-1" style={{ color: 'var(--adm-text)' }}>{item.manualRecords.length}</p>
                              </div>
                              <div className="rounded-lg p-3" style={{ backgroundColor: 'var(--adm-card)' }}>
                                <p className="text-[10px]" style={{ color: 'var(--adm-text-secondary)' }}>Conversions</p>
                                <p className="text-sm font-semibold mt-1" style={{ color: 'var(--adm-text)' }}>{item.conversions}</p>
                              </div>
                              <div className="rounded-lg p-3" style={{ backgroundColor: 'var(--adm-card)' }}>
                                <p className="text-[10px]" style={{ color: 'var(--adm-text-secondary)' }}>Coverage</p>
                                <p className="text-sm font-semibold mt-1" style={{ color: 'var(--adm-text)' }}>{completeness}%</p>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {socialCategory === 'account-ops' && (
                  <div className="rounded-2xl p-5" style={{ backgroundColor: 'var(--adm-card)', border: '1px solid var(--adm-border)' }}>
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div>
                        <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--adm-text)' }}>
                          <Users2 size={14} style={{ color: 'var(--adm-accent)' }} /> Account Operations
                        </h3>
                        <p className="text-xs" style={{ color: 'var(--adm-text-secondary)' }}>Per-account operations cards and live preview</p>
                      </div>
                      <span className="text-[10px] px-2.5 py-1 rounded-full font-medium" style={{ backgroundColor: 'var(--adm-input)', color: 'var(--adm-text-secondary)' }}>
                        {`${filteredAccountOps.length} live accounts`}
                      </span>
                    </div>

                    {filteredAccountOps.length === 0 ? (
                      <div className="text-center py-12" style={{ color: 'var(--adm-text-secondary)' }}>
                        <Users2 size={36} className="mx-auto mb-2 opacity-30" />
                        <p className="text-sm">Connect an account to generate an operations card</p>
                        <p className="text-xs mt-1">New accounts will appear here after OAuth or manual connection.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {filteredAccountOps.map(({ account, pInfo, records, publishedRecords, clicks, conversions, capabilityHighlights }) => (
                          <div key={account.id} className="rounded-xl p-4" style={{ backgroundColor: 'var(--adm-input)' }}>
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: pInfo.bgColor }}>
                                  <pInfo.icon size={18} style={{ color: pInfo.color }} />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--adm-text)' }}>{`@${account.username}`}</p>
                                  <p className="text-[11px]" style={{ color: 'var(--adm-text-secondary)' }}>
                                    {`${pInfo.name} · ${account.staffName} · ${account.lastSync ? `Synced ${new Date(account.lastSync).toLocaleString()}` : 'Connected'}`}
                                  </p>
                                </div>
                              </div>
                              <button
                                onClick={() => setSelectedAccount({
                                  staffId: account.staffId,
                                  staffName: account.staffName,
                                  platform: account.platform,
                                  accountId: account.id,
                                  accountUsername: account.username,
                                })}
                                className="px-3 py-1.5 text-xs rounded-lg font-medium flex-shrink-0"
                                style={{ backgroundColor: 'var(--adm-card)', color: 'var(--adm-text)' }}
                              >
                                View Panel
                              </button>
                            </div>
                            <div className="grid grid-cols-3 gap-3 mt-4">
                              <div className="rounded-lg p-3" style={{ backgroundColor: 'var(--adm-card)' }}>
                                <p className="text-[10px]" style={{ color: 'var(--adm-text-secondary)' }}>Records</p>
                                <p className="text-sm font-semibold mt-1" style={{ color: 'var(--adm-text)' }}>{records.length}</p>
                              </div>
                              <div className="rounded-lg p-3" style={{ backgroundColor: 'var(--adm-card)' }}>
                                <p className="text-[10px]" style={{ color: 'var(--adm-text-secondary)' }}>Published</p>
                                <p className="text-sm font-semibold mt-1" style={{ color: 'var(--adm-text)' }}>{publishedRecords.length}</p>
                              </div>
                              <div className="rounded-lg p-3" style={{ backgroundColor: 'var(--adm-card)' }}>
                                <p className="text-[10px]" style={{ color: 'var(--adm-text-secondary)' }}>Clicks / Conv</p>
                                <p className="text-sm font-semibold mt-1" style={{ color: 'var(--adm-text)' }}>{`${clicks} / ${conversions}`}</p>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2 mt-4">
                              {capabilityHighlights.map(([label, status]) => {
                                const badge = getCapabilityBadge(status as CapabilityStatus)
                                return (
                                  <span key={label} className="text-[10px] px-2 py-1 rounded-full font-medium"
                                    style={{ backgroundColor: badge.backgroundColor, color: badge.color }}>
                                    {`${label} · ${badge.label}`}
                                  </span>
                                )
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Mobile Preview - shown when account selected */}
                    {selectedPreviewAccount && (() => {
                      const pInfo = PLATFORMS.find(p => p.id === selectedPreviewAccount.platform) || { name: selectedPreviewAccount.platform, color: '#6366F1', bgColor: '#EEF2FF', icon: Globe, url: '#' }
                      const systemStatus = PLATFORM_SYSTEM_STATUS[selectedPreviewAccount.platform]
                      return (
                        <div className="mt-5 pt-5" style={{ borderTop: '1px solid var(--adm-border)' }}>
                          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--adm-text)' }}>
                            <Smartphone size={14} style={{ color: 'var(--adm-accent)' }} /> Mobile Preview
                          </h4>
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="flex justify-center">
                              <div className="relative" style={{ width: '220px' }}>
                                <div className="rounded-[2rem] p-2" style={{ backgroundColor: '#1a1a1a', border: '2.5px solid #333', boxShadow: '0 8px 30px rgba(0,0,0,0.25)' }}>
                                  <div className="rounded-[1.75rem] overflow-hidden" style={{ backgroundColor: '#fff', height: '380px' }}>
                                    <div className="flex items-center justify-between px-4 py-1 text-[9px] font-medium" style={{ color: '#333' }}>
                                      <span>9:41</span>
                                      <div className="flex items-center gap-1">
                                        <span style={{ fontSize: '7px' }}>●●●●</span>
                                        <span style={{ fontSize: '8px' }}>WiFi</span>
                                        <span style={{ fontSize: '8px' }}>100%</span>
                                      </div>
                                    </div>
                                    <div className="px-3 py-2 flex items-center gap-2" style={{ backgroundColor: pInfo.color }}>
                                      <pInfo.icon size={14} color="white" />
                                      <span className="text-white font-semibold text-[11px]">{pInfo.name}</span>
                                      <div className="ml-auto w-1.5 h-1.5 rounded-full bg-green-300" />
                                    </div>
                                    <div className="flex flex-col items-center py-4 px-3">
                                      <div className="w-16 h-16 rounded-full flex items-center justify-center overflow-hidden mb-2" style={{ border: `2.5px solid ${pInfo.color}`, backgroundColor: pInfo.bgColor }}>
                                        {selectedPreviewAccount.avatar ? (
                                          <img src={selectedPreviewAccount.avatar} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                          <div className="w-full h-full flex items-center justify-center text-xl font-bold text-white" style={{ backgroundColor: pInfo.color }}>
                                            {(selectedPreviewAccount.username || selectedPreviewAccount.staffName || '?')[0].toUpperCase()}
                                          </div>
                                        )}
                                      </div>
                                      <p className="font-bold text-xs" style={{ color: '#1a1a1a' }}>{selectedPreviewAccount.staffName}</p>
                                      <div className="flex items-center gap-1 mt-0.5">
                                        <AtSign size={9} style={{ color: pInfo.color }} />
                                        <span className="text-[10px]" style={{ color: '#666' }}>{selectedPreviewAccount.username}</span>
                                      </div>
                                      <div className="mt-2 px-2.5 py-0.5 rounded-full text-[9px] font-medium flex items-center gap-1" style={{ backgroundColor: '#dcfce7', color: '#16a34a' }}>
                                        <Check size={8} /> Logged in
                                      </div>
                                      <div className="flex gap-4 mt-3">
                                        <div className="text-center">
                                          <p className="text-xs font-bold" style={{ color: '#1a1a1a' }}>{(accountLiveProfile?.mediaCount || accountLiveProfile?.media_count || accountLiveProfile?.tweetsCount || 0).toLocaleString()}</p>
                                          <p className="text-[8px]" style={{ color: '#999' }}>Posts</p>
                                        </div>
                                        <div className="text-center">
                                          <p className="text-xs font-bold" style={{ color: '#1a1a1a' }}>{(accountLiveProfile?.followersCount || accountLiveProfile?.followers_count || 0).toLocaleString()}</p>
                                          <p className="text-[8px]" style={{ color: '#999' }}>Followers</p>
                                        </div>
                                        <div className="text-center">
                                          <p className="text-xs font-bold" style={{ color: '#1a1a1a' }}>{(accountLiveProfile?.followingCount || accountLiveProfile?.follows_count || 0).toLocaleString()}</p>
                                          <p className="text-[8px]" style={{ color: '#999' }}>Following</p>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="px-3 py-2 flex items-center justify-between" style={{ backgroundColor: '#f5f5f5', borderTop: '1px solid #eee' }}>
                                      <div className="flex items-center gap-1.5">
                                        <div className="w-5 h-5 rounded-full flex items-center justify-center overflow-hidden" style={{ backgroundColor: 'white', border: `1px solid ${pInfo.color}` }}>
                                          {selectedPreviewAccount.avatar ? (
                                            <img src={selectedPreviewAccount.avatar} alt="" className="w-full h-full object-cover" />
                                          ) : (
                                            <div className="w-full h-full flex items-center justify-center text-[8px] font-bold text-white" style={{ backgroundColor: pInfo.color }}>
                                              {(selectedPreviewAccount.username || '?')[0].toUpperCase()}
                                            </div>
                                          )}
                                        </div>
                                        <span className="text-[8px]" style={{ color: '#666' }}>{pInfo.name}</span>
                                      </div>
                                      <button onClick={() => window.open(selectedPreviewAccount.profileUrl || pInfo.url, '_blank')}
                                        className="text-[8px] px-2 py-1 rounded-md font-medium"
                                        style={{ backgroundColor: pInfo.color, color: 'white' }}>
                                        View Profile
                                      </button>
                                    </div>
                                  </div>
                                  <div className="flex justify-center py-1">
                                    <div className="w-16 h-0.5 rounded-full" style={{ backgroundColor: '#555' }} />
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="space-y-3">
                              {systemStatus && (
                                <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--adm-input)' }}>
                                  <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--adm-text-secondary)' }}>System Linkage Status</p>
                                  <div className="grid grid-cols-2 gap-2">
                                    {[['Profile', systemStatus.profile], ['Timeline', systemStatus.timeline], ['Publish', systemStatus.publish], ['Tracking', systemStatus.tracking], ['Insights', systemStatus.insights], ['Comments', systemStatus.comments], ['Messages', systemStatus.messages]].map(([label, status]) => {
                                      const badge = getCapabilityBadge(status as 'ready' | 'partial' | 'pending')
                                      return (
                                        <div key={label} className="p-2 rounded-lg" style={{ backgroundColor: 'var(--adm-card)' }}>
                                          <p className="text-[10px]" style={{ color: 'var(--adm-text-secondary)' }}>{label}</p>
                                          <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium" style={{ backgroundColor: badge.backgroundColor, color: badge.color }}>{badge.label}</span>
                                        </div>
                                      )
                                    })}
                                  </div>
                                  <div className="mt-3 rounded-lg p-3" style={{ backgroundColor: pInfo.bgColor }}>
                                    <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: pInfo.color }}>Next Manual Action</p>
                                    <p className="text-xs mt-0.5" style={{ color: 'var(--adm-text)' }}>{systemStatus.nextAction}</p>
                                  </div>
                                </div>
                              )}
                              <div className="flex gap-2">
                                <button onClick={() => handleSocialLogin(selectedPreviewAccount.platform)}
                                  className="flex-1 py-2 text-xs rounded-lg flex items-center justify-center gap-1 font-medium"
                                  style={{ backgroundColor: pInfo.color, color: 'white' }}>
                                  <ExternalLink size={12} /> Open Platform
                                </button>
                                <button onClick={() => handleDisconnectSocial(selectedPreviewAccount.id)}
                                  className="px-3 py-2 text-xs rounded-lg"
                                  style={{ backgroundColor: 'var(--adm-input)', color: '#EF4444' }}>
                                  <X size={12} />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                )}

                {socialCategory === 'dev-config' && (
                  <div className="rounded-2xl p-5" style={{ backgroundColor: 'var(--adm-card)', border: '1px solid var(--adm-border)' }}>
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div>
                        <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--adm-text)' }}>
                          <Settings size={14} style={{ color: 'var(--adm-accent)' }} /> Developer Connectors
                        </h3>
                        <p className="text-xs" style={{ color: 'var(--adm-text-secondary)' }}>Company-level OAuth app config — employees don't need to create their own apps</p>
                      </div>
                      <span className="text-[10px] px-2.5 py-1 rounded-full font-medium" style={{ backgroundColor: 'var(--adm-input)', color: 'var(--adm-text-secondary)' }}>
                        {`${developerConfigCards.filter(item => item.ready).length}/${developerConfigCards.length} ready`}
                      </span>
                    </div>
                    <div className="space-y-3">
                      {developerConfigCards.map(item => (
                        <div key={item.id} className="rounded-xl p-4" style={{ backgroundColor: 'var(--adm-input)' }}>
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold" style={{ color: 'var(--adm-text)' }}>{item.name}</p>
                              <p className="text-[11px]" style={{ color: 'var(--adm-text-secondary)' }}>
                                {item.ready ? 'Company OAuth connector ready, reusable for multiple employees.' : 'Connector not fully configured. Set up before employee authorization.'}
                              </p>
                            </div>
                            <span className="text-[10px] px-2 py-1 rounded-full font-medium"
                              style={{ backgroundColor: item.ready ? '#DCFCE7' : '#FEF3C7', color: item.ready ? '#166534' : '#92400E' }}>
                              {item.ready ? 'Ready' : 'Setup needed'}
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-3 mt-4">
                            {[
                              { label: 'API Enabled', ok: item.enabled, detail: item.enabled ? 'Enabled' : 'Toggle off' },
                              { label: 'Client ID', ok: item.hasClientId, detail: item.hasClientId ? 'Configured' : 'Missing' },
                              { label: 'Callback', ok: item.hasCallback, detail: item.hasCallback ? 'Configured' : 'Missing' },
                            ].map(card => (
                              <div key={card.label} className="rounded-lg p-3" style={{ backgroundColor: 'var(--adm-card)' }}>
                                <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--adm-text-secondary)' }}>{card.label}</p>
                                <p className="text-sm font-semibold mt-1" style={{ color: card.ok ? '#166534' : '#92400E' }}>{card.ok ? 'OK' : 'Pending'}</p>
                                <p className="text-[11px] mt-1" style={{ color: 'var(--adm-text-secondary)' }}>{card.detail}</p>
                              </div>
                            ))}
                          </div>
                          {item.callbackUrl && (
                            <p className="text-[11px] mt-3 break-all" style={{ color: 'var(--adm-text-secondary)' }}>Callback: {item.callbackUrl}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {socialCategory === 'staff-auth' && (
                  <div className="rounded-2xl p-5" style={{ backgroundColor: 'var(--adm-card)', border: '1px solid var(--adm-border)' }}>
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div>
                        <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--adm-text)' }}>
                          <Shield size={14} style={{ color: 'var(--adm-accent)' }} /> Staff Authorization
                        </h3>
                        <p className="text-xs" style={{ color: 'var(--adm-text-secondary)' }}>Check if employees have authorized their social accounts into the system</p>
                      </div>
                      <span className="text-[10px] px-2.5 py-1 rounded-full font-medium" style={{ backgroundColor: 'var(--adm-input)', color: 'var(--adm-text-secondary)' }}>
                        {`${staffAuthorizationRows.filter(item => item.connectedAccounts.length > 0).length}/${staffAuthorizationRows.length} authorized`}
                      </span>
                    </div>
                    {/* Filter indicator when selectedAccount is set */}
                    {selectedAccount && (
                      <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg" style={{ backgroundColor: 'var(--adm-accent-bg)' }}>
                        <Filter size={12} style={{ color: 'var(--adm-accent)' }} />
                        <span className="text-xs" style={{ color: 'var(--adm-accent)' }}>
                          Filtered: <strong>{selectedAccount.staffName}</strong>
                        </span>
                      </div>
                    )}
                    <div className="space-y-3">
                      {staffAuthorizationRows
                        .filter(row => !selectedAccount || row.staff.id === selectedAccount.staffId)
                        .map(({ staff, connectedAccounts, instagramAccounts, platformNames }) => (
                        <div key={staff.id} className="rounded-xl p-4" style={{ backgroundColor: 'var(--adm-input)' }}>
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold" style={{ color: 'var(--adm-text)' }}>{staff.name}</p>
                              <p className="text-[11px]" style={{ color: 'var(--adm-text-secondary)' }}>{`${staff.email} · ${staff.role}`}</p>
                            </div>
                            <span className="text-[10px] px-2 py-1 rounded-full font-medium"
                              style={{ backgroundColor: connectedAccounts.length > 0 ? '#DCFCE7' : '#FEF3C7', color: connectedAccounts.length > 0 ? '#166534' : '#92400E' }}>
                              {connectedAccounts.length > 0 ? 'Authorized' : 'Needs OAuth'}
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-3 mt-4">
                            <div className="rounded-lg p-3" style={{ backgroundColor: 'var(--adm-card)' }}>
                              <p className="text-[10px]" style={{ color: 'var(--adm-text-secondary)' }}>Connected Accounts</p>
                              <p className="text-sm font-semibold mt-1" style={{ color: 'var(--adm-text)' }}>{connectedAccounts.length}</p>
                            </div>
                            <div className="rounded-lg p-3" style={{ backgroundColor: 'var(--adm-card)' }}>
                              <p className="text-[10px]" style={{ color: 'var(--adm-text-secondary)' }}>Instagram Accounts</p>
                              <p className="text-sm font-semibold mt-1" style={{ color: 'var(--adm-text)' }}>{instagramAccounts.length}</p>
                            </div>
                            <div className="rounded-lg p-3" style={{ backgroundColor: 'var(--adm-card)' }}>
                              <p className="text-[10px]" style={{ color: 'var(--adm-text-secondary)' }}>Platforms</p>
                              <p className="text-sm font-semibold mt-1 truncate" style={{ color: 'var(--adm-text)' }}>
                                {platformNames.length > 0 ? platformNames.join(', ') : 'None'}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {socialCategory === 'quick-share' && (
                  <div className="rounded-2xl p-5" style={{ backgroundColor: 'var(--adm-card)', border: '1px solid var(--adm-border)' }}>
                    <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--adm-text)' }}>
                      <Share2 size={14} style={{ color: 'var(--adm-accent)' }} /> Quick Share
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--adm-input)' }}>
                        <h4 className="text-sm font-medium mb-2" style={{ color: 'var(--adm-text)' }}>Share Product</h4>
                        <select className="w-full px-3 py-2 text-sm rounded-lg mb-3" style={{ backgroundColor: 'var(--adm-card)', border: '1px solid var(--adm-border)', color: 'var(--adm-text)' }}>
                          <option>Select a product...</option>
                          {products.slice(0, 10).map((p: any) => (
                            <option key={p.id} value={p.id}>{p.name || p.nameEn}</option>
                          ))}
                        </select>
                        <div className="flex gap-2">
                          {['twitter', 'facebook', 'linkedin'].map(pid => {
                            const p = PLATFORMS.find(x => x.id === pid)
                            return p ? (
                              <button key={pid} className="flex-1 py-2 rounded-lg flex items-center justify-center gap-1"
                                style={{ backgroundColor: p.bgColor }}>
                                <p.icon size={14} style={{ color: p.color }} />
                              </button>
                            ) : null
                          })}
                        </div>
                      </div>
                      <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--adm-input)' }}>
                        <h4 className="text-sm font-medium mb-2" style={{ color: 'var(--adm-text)' }}>Share Homepage</h4>
                        <p className="text-xs mb-3" style={{ color: 'var(--adm-text-secondary)' }}>Share your store homepage across social media</p>
                        <div className="flex gap-2">
                          {['twitter', 'facebook', 'instagram', 'linkedin'].map(pid => {
                            const p = PLATFORMS.find(x => x.id === pid)
                            return p ? (
                              <button key={pid} className="flex-1 py-2 rounded-lg flex items-center justify-center gap-1"
                                style={{ backgroundColor: p.bgColor }}>
                                <p.icon size={14} style={{ color: p.color }} />
                              </button>
                            ) : null
                          })}
                        </div>
                      </div>
                      <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--adm-input)' }}>
                        <h4 className="text-sm font-medium mb-2" style={{ color: 'var(--adm-text)' }}>Share Category</h4>
                        <select className="w-full px-3 py-2 text-sm rounded-lg mb-3" style={{ backgroundColor: 'var(--adm-card)', border: '1px solid var(--adm-border)', color: 'var(--adm-text)' }}>
                          <option>Select a category...</option>
                          <option>Featured</option>
                          <option>New Arrivals</option>
                          <option>Best Sellers</option>
                        </select>
                        <div className="flex gap-2">
                          {['pinterest', 'instagram', 'facebook'].map(pid => {
                            const p = PLATFORMS.find(x => x.id === pid)
                            return p ? (
                              <button key={pid} className="flex-1 py-2 rounded-lg flex items-center justify-center gap-1"
                                style={{ backgroundColor: p.bgColor }}>
                                <p.icon size={14} style={{ color: p.color }} />
                              </button>
                            ) : null
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {socialCategory === 'webhooks' && (
                  <div className="rounded-2xl p-5" style={{ backgroundColor: 'var(--adm-card)', border: '1px solid var(--adm-border)' }}>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--adm-text)' }}>
                          <Zap size={14} style={{ color: 'var(--adm-accent)' }} /> Real-time Webhooks
                        </h3>
                        <p className="text-xs mt-1" style={{ color: 'var(--adm-text-secondary)' }}>Configure webhooks for instant notifications on comments and DMs</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${sseConnected ? 'animate-pulse' : ''}`} style={{ backgroundColor: sseConnected ? '#22c55e' : '#9ca3af' }} />
                        <span className="text-xs font-medium" style={{ color: sseConnected ? '#22c55e' : 'var(--adm-text-secondary)' }}>
                          {sseConnected ? 'SSE Connected' : 'Polling Mode'}
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--adm-text-secondary)' }}>Webhook Base URL</label>
                        <input
                          key={`baseurl-${systemSettings?.webhookBaseUrl ?? ''}`}
                          type="text"
                          placeholder="https://your-domain.com"
                          defaultValue={systemSettings?.webhookBaseUrl || ''}
                          onBlur={async (e) => {
                            const val = e.target.value
                            try {
                              await fetch('/api/marketing/webhook/manage', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                credentials: 'include',
                                body: JSON.stringify({ webhookBaseUrl: val }),
                              })
                              setSystemSettings((prev: any) => ({ ...prev, webhookBaseUrl: val }))
                            } catch { /* ignore */ }
                          }}
                          className="w-full px-3 py-2 text-sm rounded-lg"
                          style={{ backgroundColor: 'var(--adm-input)', border: '1px solid var(--adm-input-border)', color: 'var(--adm-text)' }}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--adm-text-secondary)' }}>Verify Token</label>
                        <div className="relative">
                          <input
                            key={`vtoken-${systemSettings?.webhookVerifyToken ? 'set' : 'empty'}`}
                            type={showVerifyToken ? 'text' : 'password'}
                            placeholder="Enter a secure verify token"
                            defaultValue={systemSettings?.webhookVerifyToken || ''}
                            onBlur={async (e) => {
                              const val = e.target.value
                              try {
                                await fetch('/api/marketing/webhook/manage', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  credentials: 'include',
                                  body: JSON.stringify({ webhookVerifyToken: val }),
                                })
                                setSystemSettings((prev: any) => ({ ...prev, webhookVerifyToken: val }))
                              } catch { /* ignore */ }
                            }}
                            className="w-full px-3 py-2 text-sm rounded-lg pr-10"
                            style={{ backgroundColor: 'var(--adm-input)', border: '1px solid var(--adm-input-border)', color: 'var(--adm-text)' }}
                          />
                          <button type="button"
                            onMouseDown={(e) => { e.preventDefault(); setShowVerifyToken(!showVerifyToken) }}
                            className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-xs rounded hover:opacity-80 transition-opacity"
                            style={{ color: 'var(--adm-accent)', backgroundColor: 'var(--adm-bg)' }}>
                            {showVerifyToken ? '◉' : '○'}
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="mb-4">
                      <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--adm-text-secondary)' }}>Meta App Secret</label>
                      <div className="relative max-w-md">
                        <input
                          key={`metaappsecret-${systemSettings?.metaAppSecret ? 'set' : 'empty'}`}
                          type={showVerifyToken ? 'text' : 'password'}
                          placeholder="Enter your Meta App Secret"
                          defaultValue={systemSettings?.metaAppSecret || ''}
                          onBlur={async (e) => {
                            const val = e.target.value
                            try {
                              await fetch('/api/marketing/webhook/manage', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                credentials: 'include',
                                body: JSON.stringify({ metaAppSecret: val }),
                              })
                              setSystemSettings((prev: any) => ({ ...prev, metaAppSecret: val }))
                            } catch { /* ignore */ }
                          }}
                          className="w-full px-3 py-2 text-sm rounded-lg pr-10"
                          style={{ backgroundColor: 'var(--adm-input)', border: '1px solid var(--adm-input-border)', color: 'var(--adm-text)' }}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                      {[
                        { platform: 'instagram', label: 'Instagram', color: '#E4405F', subscribed: systemSettings?.webhookIgSubscribed, icon: Instagram },
                        { platform: 'facebook', label: 'Facebook', color: '#1877F2', subscribed: systemSettings?.webhookFbSubscribed, icon: Facebook },
                        { platform: 'x', label: 'X / Twitter', color: '#1DA1F2', subscribed: systemSettings?.webhookXSubscribed, icon: Twitter },
                        { platform: 'pinterest', label: 'Pinterest', color: '#E60023', subscribed: systemSettings?.webhookPtSubscribed, icon: Target },
                      ].map(({ platform, label, color, subscribed, icon: PlatformIcon }) => (
                        <div key={platform} className="rounded-xl p-4 flex items-center justify-between"
                          style={{ backgroundColor: 'var(--adm-input)', border: `1px solid ${subscribed ? color : 'var(--adm-border)'}` }}>
                          <div className="flex items-center gap-2">
                            <PlatformIcon size={18} style={{ color }} />
                            <div>
                              <p className="text-sm font-medium" style={{ color: 'var(--adm-text)' }}>{label}</p>
                              <p className="text-[10px]" style={{ color: subscribed ? color : 'var(--adm-text-secondary)' }}>
                                {subscribed ? 'Webhook Active' : 'Not Subscribed'}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={async () => {
                              const savingKey = platform
                              if (webhookSaving[savingKey]) return
                              setWebhookSaving((prev) => ({ ...prev, [savingKey]: true }))
                              const action = subscribed ? 'unsubscribe' : 'subscribe'
                              try {
                                const controller = new AbortController()
                                const timeout = setTimeout(() => controller.abort(), 10000)
                                const r = await fetch('/api/marketing/webhook/manage', {
                                  method: 'PUT',
                                  headers: { 'Content-Type': 'application/json' },
                                  credentials: 'include',
                                  body: JSON.stringify({ platform, action }),
                                  signal: controller.signal,
                                })
                                clearTimeout(timeout)
                                const d = await r.json()
                                if (d.success) {
                                  const field = platform === 'instagram' ? 'webhookIgSubscribed' : platform === 'facebook' ? 'webhookFbSubscribed' : platform === 'pinterest' ? 'webhookPtSubscribed' : 'webhookXSubscribed'
                                  setSystemSettings((prev: any) => ({ ...prev, [field]: action === 'subscribe' }))
                                }
                              } catch (err: any) {
                                console.error('[Webhook] Error:', err.name === 'AbortError' ? 'Request timed out' : err.message)
                              } finally {
                                setWebhookSaving((prev) => ({ ...prev, [savingKey]: false }))
                              }
                            }}
                            disabled={!!webhookSaving[platform]}
                            className="px-3 py-1.5 text-xs rounded-lg font-medium disabled:opacity-50"
                            style={{ backgroundColor: subscribed ? '#FEF2F2' : 'var(--adm-accent)', color: subscribed ? '#991B1B' : 'var(--adm-accent-text)' }}>
                            {webhookSaving[platform] ? '...' : subscribed ? 'Disable' : 'Enable'}
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 p-3 rounded-lg" style={{ backgroundColor: 'var(--adm-bg)', border: '1px solid var(--adm-border)' }}>
                      <p className="text-xs font-medium mb-2" style={{ color: 'var(--adm-text-secondary)' }}>Webhook Endpoints:</p>
                      <div className="space-y-1 text-xs font-mono" style={{ color: 'var(--adm-text)' }}>
                        <p>Meta (IG+FB): <span style={{ color: 'var(--adm-accent)' }}>/api/marketing/webhook/meta</span></p>
                        <p>X/Twitter: <span style={{ color: 'var(--adm-accent)' }}>/api/marketing/webhook/x</span></p>
                        <p>Pinterest: <span style={{ color: 'var(--adm-accent)' }}>/api/marketing/webhook/pinterest</span></p>
                        <p>SSE Stream: <span style={{ color: 'var(--adm-accent)' }}>/api/marketing/events/stream</span></p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}


        {/* ===== Comments Management ===== */}
        {activeTab === 'comments' && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--adm-text)' }}>
                  <MessageSquare size={20} style={{ color: 'var(--adm-accent)' }} /> Comment Management
                </h2>
                <p className="text-sm mt-1" style={{ color: 'var(--adm-text-secondary)' }}>
                  {isAdmin ? 'Manage comments across all connected accounts' : 'Manage comments on your connected accounts'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={loadAllComments}
                  disabled={commentsLoading}
                  className="px-3 py-2 text-sm rounded-lg font-medium flex items-center gap-2"
                  style={{ backgroundColor: 'var(--adm-accent)', color: 'var(--adm-accent-text)' }}
                >
                  <RefreshCw size={14} className={commentsLoading ? 'animate-spin' : ''} /> {commentsLoading ? 'Loading...' : 'Refresh'}
                </button>
                {commentsSelected.size > 0 && (
                  <button
                    onClick={handleBatchDelete}
                    className="px-3 py-2 text-sm rounded-lg font-medium flex items-center gap-2"
                    style={{ backgroundColor: '#FEE2E2', color: '#991B1B' }}
                  >
                    <Trash2 size={14} /> Delete ({commentsSelected.size})
                  </button>
                )}
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px] max-w-xs">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--adm-text-secondary)' }} />
                <input
                  type="text"
                  value={commentsSearch}
                  onChange={e => setCommentsSearch(e.target.value)}
                  placeholder="Search comments or usernames..."
                  className="w-full pl-8 pr-3 py-2 text-sm rounded-lg"
                  style={{ backgroundColor: 'var(--adm-input)', border: '1px solid var(--adm-input-border)', color: 'var(--adm-text)' }}
                />
              </div>
              <AccountSelector
                socialAccounts={socialAccounts}
                staffMembers={allStaffMembers}
                currentUser={currentUser}
                isAdmin={isAdmin}
                value={selectedAccount}
                onChange={(v) => {
                  setSelectedAccount(v)
                  setCommentsPlatformFilter(v?.platform || 'all')
                  setCommentsAccountFilter(v?.accountId || 'all')
                }}
                compact
              />
              <span className="text-xs px-2 py-1 rounded-full font-medium" style={{ backgroundColor: 'var(--adm-accent-bg)', color: 'var(--adm-accent)' }}>
                {filteredComments.length} comments
              </span>
            </div>

            {/* Sync error banner */}
            {commentsSyncErrors.length > 0 && (
              <div className="rounded-xl p-4" style={{ backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5' }}>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <AlertCircle size={15} style={{ color: '#991B1B' }} />
                  <span className="text-sm font-semibold" style={{ color: '#991B1B' }}>
                    评论同步失败
                  </span>
                  <span className="text-xs" style={{ color: '#991B1B' }}>以下平台连接异常，评论可能未更新：</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {commentsSyncErrors.map(err => {
                    const pInfo = PLATFORMS.find(p => p.id === err.platform)
                    return (
                      <span key={err.platform} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs" style={{ backgroundColor: '#FEE2E2', color: '#991B1B' }}>
                        {pInfo && <pInfo.icon size={12} style={{ color: pInfo.color }} />}
                        {err.label}: {err.message}
                      </span>
                    )
                  })}
                  <button
                    onClick={() => setActiveTab('social')}
                    className="px-2.5 py-1 text-xs rounded-lg font-medium"
                    style={{ backgroundColor: '#991B1B', color: '#fff' }}
                  >
                    Re-login
                  </button>
                  <button
                    onClick={loadAllComments}
                    className="px-2.5 py-1 text-xs rounded-lg font-medium inline-flex items-center gap-1"
                    style={{ backgroundColor: '#fff', color: '#991B1B', border: '1px solid #FCA5A5' }}
                  >
                    <RefreshCw size={11} /> Retry
                  </button>
                </div>
              </div>
            )}

            {/* Stats Cards */}
            {allCommentsUnified.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--adm-card)', border: '1px solid var(--adm-border)' }}>
                  <p className="text-xs" style={{ color: 'var(--adm-text-secondary)' }}>Total</p>
                  <p className="text-xl font-bold mt-1" style={{ color: 'var(--adm-text)' }}>{allCommentsUnified.length.toLocaleString()}</p>
                </div>
                <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--adm-card)', border: '1px solid var(--adm-border)' }}>
                  <p className="text-xs flex items-center gap-1" style={{ color: 'var(--adm-text-secondary)' }}><Instagram size={12} style={{ color: '#E4405F' }} /> Instagram</p>
                  <p className="text-xl font-bold mt-1" style={{ color: '#E4405F' }}>{igComments.length.toLocaleString()}</p>
                </div>
                <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--adm-card)', border: '1px solid var(--adm-border)' }}>
                  <p className="text-xs flex items-center gap-1" style={{ color: 'var(--adm-text-secondary)' }}><Twitter size={12} style={{ color: '#1DA1F2' }} /> X</p>
                  <p className="text-xl font-bold mt-1" style={{ color: '#1DA1F2' }}>{xComments.length.toLocaleString()}</p>
                </div>
                <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--adm-card)', border: '1px solid var(--adm-border)' }}>
                  <p className="text-xs flex items-center gap-1" style={{ color: 'var(--adm-text-secondary)' }}><Facebook size={12} style={{ color: '#1877F2' }} /> Facebook</p>
                  <p className="text-xl font-bold mt-1" style={{ color: '#1877F2' }}>{fbComments.length.toLocaleString()}</p>
                </div>
                <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--adm-card)', border: '1px solid var(--adm-border)' }}>
                  <p className="text-xs" style={{ color: 'var(--adm-text-secondary)' }}>Unreplied</p>
                  <p className="text-xl font-bold mt-1" style={{ color: '#B45309' }}>{allCommentsUnified.filter(c => !c._replied).length.toLocaleString()}</p>
                </div>
              </div>
            )}

            {/* Comment List */}
            {commentsLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 size={24} className="animate-spin" style={{ color: 'var(--adm-accent)' }} />
                <span className="ml-3 text-sm" style={{ color: 'var(--adm-text-secondary)' }}>Loading comments from all platforms...</span>
              </div>
            ) : filteredComments.length === 0 ? (
              <div className="text-center py-20 rounded-2xl" style={{ backgroundColor: 'var(--adm-card)', border: '1px solid var(--adm-border)' }}>
                <MessageSquare size={40} className="mx-auto mb-3" style={{ color: 'var(--adm-text-secondary)', opacity: 0.5 }} />
                <p className="text-sm font-medium" style={{ color: 'var(--adm-text-secondary)' }}>
                  {allCommentsUnified.length === 0
                    ? (commentsSyncErrors.length > 0
                      ? '无法加载评论：请先处理上方平台连接异常，或点击 Retry 重试。'
                      : 'No comments yet. Connect social accounts and click Refresh.')
                    : 'No comments match your filter.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Select All Row */}
                <div className="flex items-center gap-3 px-4 py-2 rounded-lg" style={{ backgroundColor: 'var(--adm-card)', border: '1px solid var(--adm-border)' }}>
                  <input
                    type="checkbox"
                    checked={commentsSelected.size === filteredComments.length && filteredComments.length > 0}
                    onChange={toggleSelectAllComments}
                    className="rounded"
                  />
                  <span className="text-xs font-medium" style={{ color: 'var(--adm-text-secondary)' }}>
                    Select all ({filteredComments.length})
                  </span>
                </div>

                {filteredComments.slice(0, 100).map((comment) => {
                  const platformColor = comment.platform === 'instagram' ? '#E4405F' : comment.platform === 'twitter' ? '#1DA1F2' : comment.platform === 'pinterest' ? '#E60023' : '#1877F2'
                  const PlatformIcon = comment.platform === 'instagram' ? Instagram : comment.platform === 'twitter' ? Twitter : comment.platform === 'pinterest' ? Target : Facebook
                  return (
                    <div
                      key={comment._id}
                      className="rounded-xl p-4 transition-all"
                      style={{
                        backgroundColor: commentsSelected.has(comment._id) ? 'var(--adm-accent-bg)' : 'var(--adm-card)',
                        border: `1px solid ${commentsSelected.has(comment._id) ? 'var(--adm-accent)' : 'var(--adm-border)'}`,
                      }}
                    >
                      <div className="flex items-start gap-3">
                        {/* Checkbox */}
                        <input
                          type="checkbox"
                          checked={commentsSelected.has(comment._id)}
                          onChange={() => toggleCommentSelect(comment._id)}
                          className="rounded mt-1"
                        />

                        {/* Platform avatar */}
                        <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: comment.platform === 'instagram' ? '#FFF0F3' : comment.platform === 'twitter' ? '#E0F2FE' : comment.platform === 'pinterest' ? '#FEF2F2' : '#EEF2FF' }}>
                          <PlatformIcon size={14} style={{ color: platformColor }} />
                        </div>

                        {/* Comment content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold" style={{ color: 'var(--adm-text)' }}>@{comment._username}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: comment.platform === 'instagram' ? '#FFF0F3' : comment.platform === 'twitter' ? '#E0F2FE' : comment.platform === 'pinterest' ? '#FEF2F2' : '#EEF2FF', color: platformColor }}>
                              {comment._platformLabel}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'var(--adm-input)', color: 'var(--adm-text-secondary)' }}>
                              @{comment.accountUsername}
                            </span>
                            {comment._replied && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: '#DCFCE7', color: '#166534' }}>
                                Replied
                              </span>
                            )}
                            {comment._isOurPost && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ backgroundColor: '#DBEAFE', color: '#1E40AF' }}>
                                Our Post
                              </span>
                            )}
                            <span className="text-[10px] ml-auto" style={{ color: 'var(--adm-text-secondary)' }}>
                              {new Date(comment._timestamp).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-sm mt-1" style={{ color: 'var(--adm-text)' }}>{comment._text}</p>

                          {/* X/Twitter metrics */}
                          {comment.platform === 'twitter' && (comment.likes > 0 || comment.retweets > 0) && (
                            <p className="text-xs mt-1" style={{ color: 'var(--adm-text-secondary)' }}>
                              {comment.likes > 0 && `${comment.likes} likes`}{comment.likes > 0 && comment.retweets > 0 && ' · '}{comment.retweets > 0 && `${comment.retweets} retweets`}
                            </p>
                          )}
                          {/* Facebook likes */}
                          {comment.platform === 'facebook' && comment.likeCount > 0 && (
                            <p className="text-xs mt-1" style={{ color: 'var(--adm-text-secondary)' }}>{comment.likeCount} likes</p>
                          )}
                          {/* Post context — linked to our published posts */}
                          {comment._isOurPost && (
                            <div className="mt-1 p-2 rounded-lg text-xs" style={{ backgroundColor: 'var(--adm-input)', borderLeft: '3px solid #1E40AF' }}>
                              <span className="font-medium" style={{ color: 'var(--adm-text)' }}>Our Post: </span>
                              <span style={{ color: 'var(--adm-text-secondary)' }}>"{comment._linkedPostTitle.substring(0, 50)}"</span>
                              {comment._linkedProductName && <span className="ml-2" style={{ color: 'var(--adm-accent)' }}>Product: {comment._linkedProductName}</span>}
                              {comment._linkedReferralCode && <span className="ml-2" style={{ color: '#166534' }}>Code: {comment._linkedReferralCode}</span>}
                            </div>
                          )}
                          {!comment._isOurPost && (comment.mediaCaption || comment.postMessage || comment.tweetText) && (
                            <p className="text-xs mt-1 truncate" style={{ color: 'var(--adm-text-secondary)' }}>
                              On: "{(comment.mediaCaption || comment.postMessage || comment.tweetText || '').substring(0, 60)}"
                              {(comment.mediaPermalink || comment.permalink_url) && <a href={comment.mediaPermalink || comment.permalink_url} target="_blank" rel="noopener noreferrer" className="ml-1 underline">View</a>}
                            </p>
                          )}

                          {/* Replies (IG & FB) */}
                          {(comment.replies && comment.replies.length > 0) && (
                            <div className="mt-2 ml-4 space-y-2">
                              {comment.replies.map((reply: any) => (
                                <div key={reply.id} className="pl-3 py-2 rounded-lg text-sm" style={{ borderLeft: `2px solid ${platformColor}`, backgroundColor: 'var(--adm-input)' }}>
                                  <span className="font-medium" style={{ color: platformColor }}>@{reply.username || reply.from?.name}</span>
                                  <span className="ml-2" style={{ color: 'var(--adm-text)' }}>{reply.text || reply.message}</span>
                                  <span className="text-[10px] ml-2" style={{ color: 'var(--adm-text-secondary)' }}>{new Date(reply.timestamp || reply.createdAt).toLocaleString()}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Reply input */}
                          {replyTarget?.commentId === comment.id && replyTarget?.accountId === comment.accountId && replyTarget?.platform === comment.platform ? (
                            <div className="mt-2 flex items-center gap-2">
                              <input
                                type="text"
                                value={replyText}
                                onChange={e => setReplyText(e.target.value)}
                                placeholder="Type your reply..."
                                className="flex-1 px-3 py-1.5 text-sm rounded-lg"
                                style={{ backgroundColor: 'var(--adm-input)', border: '1px solid var(--adm-input-border)', color: 'var(--adm-text)' }}
                                onKeyDown={e => { if (e.key === 'Enter') handleReply() }}
                                autoFocus
                              />
                              <button
                                onClick={handleReply}
                                disabled={replySending || !replyText.trim()}
                                className="px-3 py-1.5 text-xs rounded-lg font-medium flex items-center gap-1"
                                style={{ backgroundColor: 'var(--adm-accent)', color: 'var(--adm-accent-text)', opacity: replySending || !replyText.trim() ? 0.6 : 1 }}
                              >
                                <Send size={12} /> {replySending ? 'Sending...' : 'Send'}
                              </button>
                              <button
                                onClick={() => { setReplyTarget(null); setReplyText('') }}
                                className="px-2 py-1.5 text-xs rounded-lg"
                                style={{ backgroundColor: 'var(--adm-input)', color: 'var(--adm-text-secondary)' }}
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="mt-2 flex items-center gap-2">
                              <button
                                onClick={() => setReplyTarget({ commentId: comment.id, accountId: comment.accountId, platform: comment.platform })}
                                className="px-2 py-1 text-xs rounded-lg flex items-center gap-1"
                                style={{ backgroundColor: 'var(--adm-input)', color: 'var(--adm-text-secondary)' }}
                              >
                                <Send size={10} /> Reply
                              </button>
                              <button
                                onClick={() => {
                                  setActiveTab('messages')
                                  // 尝试在私信中找到该评论用户
                                  const targetConv = allConversationsUnified.find(c =>
                                    c.platform === comment.platform && c.accountId === comment.accountId &&
                                    (c._participantName?.toLowerCase().includes(comment._username?.toLowerCase()) ||
                                     c._participantId === comment._username)
                                  )
                                  if (targetConv) {
                                    setActiveConversation(targetConv)
                                  }
                                  if (allConversationsUnified.length === 0) {
                                    loadAllConversations()
                                  }
                                }}
                                className="px-2 py-1 text-xs rounded-lg flex items-center gap-1"
                                style={{ backgroundColor: '#E0F2FE', color: '#0369A1' }}
                              >
                                <Mail size={10} /> Send DM
                              </button>
                              <button
                                onClick={() => handleDeleteComment(comment.id, comment.accountId, comment.platform)}
                                className="px-2 py-1 text-xs rounded-lg flex items-center gap-1"
                                style={{ backgroundColor: '#FEF2F2', color: '#991B1B' }}
                              >
                                <Trash2 size={10} /> Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}

                {filteredComments.length > 100 && (
                  <p className="text-xs text-center py-2" style={{ color: 'var(--adm-text-secondary)' }}>
                    Showing 100 of {filteredComments.length} comments. Use filters to narrow results.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* ===== Messages / DM Management ===== */}
        {activeTab === 'messages' && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--adm-text)' }}>
                  <Mail size={20} style={{ color: 'var(--adm-accent)' }} /> Direct Messages
                </h2>
                <p className="text-sm mt-1" style={{ color: 'var(--adm-text-secondary)' }}>
                  {isAdmin ? 'Manage DMs across all connected accounts' : 'Manage DMs on your connected accounts'}
                  {unreadDmCount > 0 && <span className="ml-2 font-medium" style={{ color: '#991B1B' }}> — {unreadDmCount} unread messages</span>}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={loadAllConversations}
                  disabled={dmLoading}
                  className="px-3 py-2 text-sm rounded-lg font-medium flex items-center gap-2"
                  style={{ backgroundColor: 'var(--adm-accent)', color: 'var(--adm-accent-text)' }}
                >
                  <RefreshCw size={14} className={dmLoading ? 'animate-spin' : ''} /> {dmLoading ? 'Loading...' : 'Refresh'}
                </button>
                {lastNotificationCheck && (
                  <span className="text-xs" style={{ color: 'var(--adm-text-secondary)' }}>
                    Last check: {lastNotificationCheck.toLocaleTimeString()}
                  </span>
                )}
              </div>
            </div>

            {/* Stats Cards */}
            {allConversationsUnified.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--adm-card)', border: '1px solid var(--adm-border)' }}>
                  <p className="text-xs" style={{ color: 'var(--adm-text-secondary)' }}>Total Conversations</p>
                  <p className="text-xl font-bold mt-1" style={{ color: 'var(--adm-text)' }}>{allConversationsUnified.length.toLocaleString()}</p>
                </div>
                <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--adm-card)', border: '1px solid var(--adm-border)' }}>
                  <p className="text-xs flex items-center gap-1" style={{ color: 'var(--adm-text-secondary)' }}><Instagram size={12} style={{ color: '#E4405F' }} /> Instagram</p>
                  <p className="text-xl font-bold mt-1" style={{ color: '#E4405F' }}>{igConversations.length.toLocaleString()}</p>
                </div>
                <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--adm-card)', border: '1px solid var(--adm-border)' }}>
                  <p className="text-xs flex items-center gap-1" style={{ color: 'var(--adm-text-secondary)' }}><Twitter size={12} style={{ color: '#1DA1F2' }} /> X</p>
                  <p className="text-xl font-bold mt-1" style={{ color: '#1DA1F2' }}>{xConversations.length.toLocaleString()}</p>
                </div>
                <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--adm-card)', border: '1px solid var(--adm-border)' }}>
                  <p className="text-xs flex items-center gap-1" style={{ color: 'var(--adm-text-secondary)' }}><Facebook size={12} style={{ color: '#1877F2' }} /> Facebook</p>
                  <p className="text-xl font-bold mt-1" style={{ color: '#1877F2' }}>{fbConversations.length.toLocaleString()}</p>
                </div>
                <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--adm-card)', border: '1px solid var(--adm-border)' }}>
                  <p className="text-xs" style={{ color: 'var(--adm-text-secondary)' }}>Unread</p>
                  <p className="text-xl font-bold mt-1" style={{ color: '#991B1B' }}>{unreadDmCount.toLocaleString()}</p>
                </div>
              </div>
            )}

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px] max-w-xs">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--adm-text-secondary)' }} />
                <input
                  type="text"
                  value={dmSearch}
                  onChange={e => setDmSearch(e.target.value)}
                  placeholder="Search conversations..."
                  className="w-full pl-8 pr-3 py-2 text-sm rounded-lg"
                  style={{ backgroundColor: 'var(--adm-input)', border: '1px solid var(--adm-input-border)', color: 'var(--adm-text)' }}
                />
              </div>
              <AccountSelector
                socialAccounts={socialAccounts}
                staffMembers={allStaffMembers}
                currentUser={currentUser}
                isAdmin={isAdmin}
                value={selectedAccount}
                onChange={(v) => {
                  setSelectedAccount(v)
                  setDmPlatformFilter(v?.platform || 'all')
                  setDmAccountFilter(v?.accountId || 'all')
                }}
                compact
              />
              <span className="text-xs px-2 py-1 rounded-full font-medium" style={{ backgroundColor: 'var(--adm-accent-bg)', color: 'var(--adm-accent)' }}>
                {filteredConversations.length} conversations
              </span>
            </div>

            {/* Sync error banner */}
            {conversationSyncErrors.length > 0 && (
              <div className="rounded-xl p-4" style={{ backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5' }}>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <AlertCircle size={15} style={{ color: '#991B1B' }} />
                  <span className="text-sm font-semibold" style={{ color: '#991B1B' }}>私信同步失败</span>
                  <span className="text-xs" style={{ color: '#991B1B' }}>以下平台连接异常，消息可能未更新：</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {conversationSyncErrors.map(err => {
                    const pInfo = PLATFORMS.find(p => p.id === err.platform)
                    return (
                      <span key={err.platform} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs" style={{ backgroundColor: '#FEE2E2', color: '#991B1B' }}>
                        {pInfo && <pInfo.icon size={12} style={{ color: pInfo.color }} />}
                        {err.label}: {err.message}
                      </span>
                    )
                  })}
                  <button
                    onClick={() => setActiveTab('social')}
                    className="px-2.5 py-1 text-xs rounded-lg font-medium"
                    style={{ backgroundColor: '#991B1B', color: '#fff' }}
                  >
                    Re-login
                  </button>
                  <button
                    onClick={loadAllConversations}
                    className="px-2.5 py-1 text-xs rounded-lg font-medium inline-flex items-center gap-1"
                    style={{ backgroundColor: '#fff', color: '#991B1B', border: '1px solid #FCA5A5' }}
                  >
                    <RefreshCw size={11} /> Retry
                  </button>
                </div>
              </div>
            )}

            {/* Conversation List + Chat Detail (Split View) */}
            {dmLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 size={24} className="animate-spin" style={{ color: 'var(--adm-accent)' }} />
                <span className="ml-3 text-sm" style={{ color: 'var(--adm-text-secondary)' }}>Loading conversations from all platforms...</span>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="text-center py-20 rounded-2xl" style={{ backgroundColor: 'var(--adm-card)', border: '1px solid var(--adm-border)' }}>
                <Mail size={40} className="mx-auto mb-3" style={{ color: 'var(--adm-text-secondary)', opacity: 0.5 }} />
                <p className="text-sm font-medium" style={{ color: 'var(--adm-text-secondary)' }}>
                  {allConversationsUnified.length === 0
                    ? (conversationSyncErrors.length > 0
                      ? '无法加载私信：请先处理上方平台连接异常，或点击 Retry 重试。'
                      : 'No conversations yet. Connect social accounts and click Refresh.')
                    : 'No conversations match your filter.'}
                </p>
              </div>
            ) : (
              <div className="flex gap-4 min-h-[500px]">
                {/* Conversation List (Left Panel) */}
                <div className="w-2/5 space-y-2 overflow-y-auto max-h-[600px] pr-2" style={{ scrollbarWidth: 'thin' }}>
                  {filteredConversations.slice(0, 100).map((conv) => {
                    const platformColor = conv.platform === 'instagram' ? '#E4405F' : conv.platform === 'twitter' ? '#1DA1F2' : conv.platform === 'pinterest' ? '#E60023' : '#1877F2'
                    const PlatformIcon = conv.platform === 'instagram' ? Instagram : conv.platform === 'twitter' ? Twitter : Facebook
                    const isActive = activeConversation?._id === conv._id
                    return (
                      <div
                        key={conv._id}
                        onClick={() => setActiveConversation(conv)}
                        className="rounded-xl p-3 cursor-pointer transition-all hover:scale-[1.01]"
                        style={{
                          backgroundColor: isActive ? 'var(--adm-accent-bg)' : conv._unread > 0 ? '#FEF2F2' : 'var(--adm-card)',
                          border: `1px solid ${isActive ? 'var(--adm-accent)' : conv._unread > 0 ? '#FCA5A5' : 'var(--adm-border)'}`,
                        }}
                      >
                        <div className="flex items-start gap-2">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: conv.platform === 'instagram' ? '#FFF0F3' : conv.platform === 'twitter' ? '#E0F2FE' : '#EEF2FF' }}>
                            <PlatformIcon size={14} style={{ color: platformColor }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-semibold truncate" style={{ color: 'var(--adm-text)' }}>{conv._participantName}</span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: conv.platform === 'instagram' ? '#FFF0F3' : conv.platform === 'twitter' ? '#E0F2FE' : '#EEF2FF', color: platformColor }}>
                                {conv._platformLabel}
                              </span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'var(--adm-input)', color: 'var(--adm-text-secondary)' }}>
                                @{conv.accountUsername}
                              </span>
                              {conv._unread > 0 && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold" style={{ backgroundColor: '#FEE2E2', color: '#991B1B' }}>
                                  {conv._unread}
                                </span>
                              )}
                            </div>
                            <p className="text-xs truncate mt-1" style={{ color: 'var(--adm-text-secondary)' }}>{conv._lastMessage}</p>
                            <p className="text-[10px] mt-0.5" style={{ color: 'var(--adm-text-secondary)' }}>{new Date(conv._lastTimestamp).toLocaleString()}</p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Chat Detail (Right Panel) */}
                <div className="w-3/5 rounded-2xl" style={{ backgroundColor: 'var(--adm-card)', border: '1px solid var(--adm-border)' }}>
                  {activeConversation ? (
                    <div className="flex flex-col h-full min-h-[500px]">
                      {/* Chat Header */}
                      <div className="p-4 flex items-center gap-3" style={{ borderBottom: '1px solid var(--adm-border)' }}>
                        <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: activeConversation.platform === 'instagram' ? '#FFF0F3' : activeConversation.platform === 'twitter' ? '#E0F2FE' : '#EEF2FF' }}>
                          {activeConversation.platform === 'instagram' ? <Instagram size={18} style={{ color: '#E4405F' }} /> : activeConversation.platform === 'twitter' ? <Twitter size={18} style={{ color: '#1DA1F2' }} /> : <Facebook size={18} style={{ color: '#1877F2' }} />}
                        </div>
                        <div>
                          <p className="text-sm font-bold" style={{ color: 'var(--adm-text)' }}>{activeConversation._participantName}</p>
                          <p className="text-xs" style={{ color: 'var(--adm-text-secondary)' }}>
                            {activeConversation._platformLabel} · @{activeConversation.accountUsername}
                          </p>
                        </div>
                        {activeConversation._unread > 0 && (
                          <span className="text-xs px-2 py-1 rounded-full font-bold" style={{ backgroundColor: '#FEE2E2', color: '#991B1B' }}>
                            {activeConversation._unread} unread
                          </span>
                        )}
                      </div>

                      {/* Messages */}
                      <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ maxHeight: '400px' }}>
                        {(activeConversation.messages || []).map((msg: any, idx: number) => {
                          const isOurMessage = msg.senderId === activeConversation.accountId || msg.from?.id === activeConversation.accountId
                          // 检查是否是Instagram会话中来自我们自己账号的消息
                          const isFromUs = isOurMessage || (activeConversation.platform === 'instagram' && msg.from?.username === activeConversation.accountUsername)
                          return (
                            <div key={msg.id || idx} className={`flex ${isFromUs ? 'justify-end' : 'justify-start'}`}>
                              <div className="max-w-[70%] rounded-xl px-3 py-2" style={{
                                backgroundColor: isFromUs ? 'var(--adm-accent-bg)' : 'var(--adm-input)',
                                border: isFromUs ? '1px solid var(--adm-accent)' : '1px solid var(--adm-border)',
                              }}>
                                {!isFromUs && (
                                  <p className="text-xs font-medium mb-1" style={{ color: activeConversation.platform === 'instagram' ? '#E4405F' : activeConversation.platform === 'twitter' ? '#1DA1F2' : '#1877F2' }}>
                                    {msg.senderName || msg.from?.name || msg.from?.username || 'User'}
                                  </p>
                                )}
                                <p className="text-sm" style={{ color: isFromUs ? 'var(--adm-accent)' : 'var(--adm-text)' }}>{msg.text || msg.message || ''}</p>
                                <p className="text-[10px] mt-1" style={{ color: 'var(--adm-text-secondary)' }}>{new Date(msg.timestamp || msg.createdAt || msg.created_time || '').toLocaleString()}</p>
                              </div>
                            </div>
                          )
                        })}
                        {(activeConversation.messages || []).length === 0 && (
                          <p className="text-center text-sm" style={{ color: 'var(--adm-text-secondary)' }}>No messages in this conversation yet.</p>
                        )}
                      </div>

                      {/* Send DM */}
                      <div className="p-4" style={{ borderTop: '1px solid var(--adm-border)' }}>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={dmText}
                            onChange={e => setDmText(e.target.value)}
                            placeholder="Type a message..."
                            className="flex-1 px-3 py-2 text-sm rounded-lg"
                            style={{ backgroundColor: 'var(--adm-input)', border: '1px solid var(--adm-input-border)', color: 'var(--adm-text)' }}
                            onKeyDown={e => { if (e.key === 'Enter') handleSendDM() }}
                            autoFocus
                          />
                          <button
                            onClick={handleSendDM}
                            disabled={dmSending || !dmText.trim()}
                            className="px-4 py-2 text-sm rounded-lg font-medium flex items-center gap-2"
                            style={{ backgroundColor: 'var(--adm-accent)', color: 'var(--adm-accent-text)', opacity: dmSending || !dmText.trim() ? 0.6 : 1 }}
                          >
                            <Send size={14} /> {dmSending ? 'Sending...' : 'Send'}
                          </button>
                        </div>
                        <p className="text-[10px] mt-1" style={{ color: 'var(--adm-text-secondary)' }}>
                          Reply via {activeConversation._platformLabel} as @{activeConversation.accountUsername}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full min-h-[500px]">
                      <div className="text-center">
                        <Mail size={40} className="mx-auto mb-3" style={{ color: 'var(--adm-text-secondary)', opacity: 0.3 }} />
                        <p className="text-sm" style={{ color: 'var(--adm-text-secondary)' }}>Select a conversation to view messages</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'referrals' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold" style={{ color: 'var(--adm-text)' }}>Publish History</h3>

            {/* Dashboard-style Account Selector */}
            <div className="rounded-2xl p-4" style={{ backgroundColor: 'var(--adm-card)', border: '1px solid var(--adm-border)' }}>
              <div className="space-y-3">
                <div className="flex items-center gap-4">
                  <span className="text-xs font-semibold uppercase tracking-wider flex-shrink-0" style={{ color: 'var(--adm-text-secondary)' }}>Staff</span>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => setSelectedAccount(null)}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl transition-all"
                      style={{
                        backgroundColor: !selectedAccount ? 'var(--adm-accent)' : 'var(--adm-input)',
                        color: !selectedAccount ? 'var(--adm-accent-text)' : 'var(--adm-text)',
                        border: !selectedAccount ? '2px solid var(--adm-accent)' : '2px solid transparent',
                      }}
                    >
                      <Globe2 size={16} />
                      <span className="text-sm font-medium">All Staff</span>
                    </button>
                    {(() => {
                      const connected = isAdmin
                        ? socialAccounts.filter(a => a.status === 'connected')
                        : socialAccounts.filter(a => a.staffId === currentUser?.id && a.status === 'connected')
                      const seen = new Set<string>()
                      const staffList: { staffId: string; staffName: string; staffAvatar?: string }[] = []
                      for (const a of connected) {
                        if (!seen.has(a.staffId)) {
                          seen.add(a.staffId)
                          staffList.push({ staffId: a.staffId, staffName: a.staffName, staffAvatar: a.staffAvatar })
                        }
                      }
                      return staffList.map(s => {
                        const isSelected = selectedAccount?.staffId === s.staffId
                        return (
                          <button
                            key={s.staffId}
                            onClick={() => {
                              if (isSelected) { setSelectedAccount(null); return }
                              const staffAccounts = connected.filter(a => a.staffId === s.staffId)
                              if (staffAccounts.length === 0) return
                              const a = staffAccounts[0]
                              setSelectedAccount({
                                staffId: s.staffId,
                                staffName: s.staffName,
                                platform: a.platform,
                                accountId: a.id,
                                accountUsername: a.username,
                              })
                            }}
                            className="flex items-center gap-2 px-3 py-2 rounded-xl transition-all"
                            style={{
                              backgroundColor: isSelected ? 'var(--adm-accent-bg)' : 'var(--adm-input)',
                              border: isSelected ? '2px solid var(--adm-accent)' : '2px solid transparent',
                            }}
                          >
                            <div className="w-7 h-7 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0" style={{ backgroundColor: 'var(--adm-card)' }}>
                              {s.staffAvatar ? (
                                <img src={s.staffAvatar} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <User size={14} style={{ color: 'var(--adm-text-secondary)' }} />
                              )}
                            </div>
                            <span className="text-sm font-medium" style={{ color: isSelected ? 'var(--adm-accent)' : 'var(--adm-text)' }}>{s.staffName}</span>
                            {isSelected && <X size={12} className="ml-1 opacity-50" style={{ color: 'var(--adm-accent)' }} />}
                          </button>
                        )
                      })
                    })()}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs font-semibold uppercase tracking-wider flex-shrink-0" style={{ color: 'var(--adm-text-secondary)' }}>Platform</span>
                  <div className="flex items-center gap-2 flex-wrap">
                    {PLATFORMS.map(platform => {
                      const isSelected = selectedAccount?.platform === platform.id
                      const hasAccount = (() => {
                        const connected = isAdmin
                          ? socialAccounts.filter(a => a.status === 'connected')
                          : socialAccounts.filter(a => a.staffId === currentUser?.id && a.status === 'connected')
                        const staffId = selectedAccount?.staffId
                        if (staffId) return connected.some(a => a.staffId === staffId && a.platform === platform.id)
                        return connected.some(a => a.platform === platform.id)
                      })()
                      return (
                        <button
                          key={platform.id}
                          onClick={() => {
                            if (isSelected) { setSelectedAccount(null); return }
                            const connected = isAdmin
                              ? socialAccounts.filter(a => a.status === 'connected')
                              : socialAccounts.filter(a => a.staffId === currentUser?.id && a.status === 'connected')
                            const staffId = selectedAccount?.staffId
                            let candidates = staffId
                              ? connected.filter(a => a.staffId === staffId && a.platform === platform.id)
                              : connected.filter(a => a.platform === platform.id)
                            if (candidates.length === 0) return
                            const a = candidates[0]
                            setSelectedAccount({
                              staffId: a.staffId,
                              staffName: a.staffName,
                              platform: a.platform,
                              accountId: a.id,
                              accountUsername: a.username,
                            })
                          }}
                          disabled={!hasAccount}
                          className="relative p-2.5 rounded-xl transition-all flex items-center gap-2"
                          style={{
                            backgroundColor: isSelected ? platform.bgColor : 'var(--adm-input)',
                            border: isSelected ? `2px solid ${platform.color}` : '2px solid transparent',
                            opacity: hasAccount ? 1 : 0.35,
                            cursor: hasAccount ? 'pointer' : 'not-allowed',
                          }}
                          title={`${platform.name}${!hasAccount ? ' (no connected account)' : ''}`}
                        >
                          <platform.icon size={20} style={{ color: isSelected ? platform.color : 'var(--adm-text-secondary)' }} />
                          <span className="text-xs font-medium hidden sm:inline" style={{ color: isSelected ? platform.color : 'var(--adm-text-secondary)' }}>{platform.name}</span>
                          {isSelected && <Check size={14} style={{ color: platform.color }} />}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Selected filter indicator */}
            {selectedAccount && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs" style={{ color: 'var(--adm-text-secondary)' }}>Filtering:</span>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ backgroundColor: 'var(--adm-accent-bg)' }}>
                  <User size={12} style={{ color: 'var(--adm-accent)' }} />
                  <span className="text-xs font-medium" style={{ color: 'var(--adm-accent)' }}>{selectedAccount.staffName}</span>
                </div>
                <ChevronRight size={12} style={{ color: 'var(--adm-text-secondary)' }} />
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ backgroundColor: (() => { const p = PLATFORMS.find(p => p.id === selectedAccount.platform); return p?.bgColor || 'var(--adm-input)'; })() }}>
                  {(() => {
                    const p = PLATFORMS.find(p => p.id === selectedAccount.platform)
                    const Icon = p?.icon || Globe2
                    return <Icon size={12} style={{ color: p?.color || 'var(--adm-text-secondary)' }} />
                  })()}
                  <span className="text-xs font-medium" style={{ color: (() => { const p = PLATFORMS.find(p => p.id === selectedAccount.platform); return p?.color || 'var(--adm-text)'; })() }}>
                    {PLATFORMS.find(p => p.id === selectedAccount.platform)?.name || selectedAccount.platform}
                  </span>
                </div>
                <ChevronRight size={12} style={{ color: 'var(--adm-text-secondary)' }} />
                <span className="text-xs font-medium" style={{ color: 'var(--adm-text)' }}>@{selectedAccount.accountUsername}</span>
                <button
                  onClick={() => setSelectedAccount(null)}
                  className="ml-2 px-2 py-0.5 rounded text-xs hover:opacity-70"
                  style={{ color: 'var(--adm-text-secondary)', backgroundColor: 'var(--adm-input)' }}
                >
                  Clear filter
                </button>
              </div>
            )}

            {/* Quick Actions + Publish Summary - merged row */}
            <div className="grid grid-cols-1 xl:grid-cols-[auto_1fr] gap-6">
              {/* Quick Actions */}
              <div className="rounded-2xl p-5" style={{ backgroundColor: 'var(--adm-card)', border: '1px solid var(--adm-border)' }}>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--adm-text)' }}>
                  <Zap size={14} style={{ color: 'var(--adm-accent)' }} />
                  Quick Actions
                </h3>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => setShowCreateReferral(true)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all hover:opacity-90"
                    style={{ backgroundColor: 'var(--adm-accent)', color: 'var(--adm-accent-text)' }}
                  >
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
                      <Plus size={16} />
                    </div>
                    <div className="text-left flex-1 min-w-0">
                      <p className="text-xs font-semibold">Create Link</p>
                      <p className="text-[10px] opacity-70">Generate tracking link</p>
                    </div>
                    <ChevronRight size={14} className="opacity-70" />
                  </button>
                  <button
                    onClick={() => setActiveTab('studio')}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all hover:opacity-90"
                    style={{ backgroundColor: 'var(--adm-input)', border: '1.5px solid transparent' }}
                  >
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--adm-card)' }}>
                      <Send size={16} style={{ color: 'var(--adm-text-secondary)' }} />
                    </div>
                    <div className="text-left flex-1 min-w-0">
                      <p className="text-xs font-semibold" style={{ color: 'var(--adm-text)' }}>New Publish</p>
                      <p className="text-[10px]" style={{ color: 'var(--adm-text-secondary)' }}>Create & schedule post</p>
                    </div>
                    <ChevronRight size={14} style={{ color: 'var(--adm-text-secondary)' }} />
                  </button>
                </div>
              </div>

              {/* Publish Summary */}
              <div className="rounded-2xl p-5" style={{ backgroundColor: 'var(--adm-card)', border: '1px solid var(--adm-border)' }}>
                <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
                  <div>
                    <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--adm-text)' }}>
                      <BarChart3 size={14} style={{ color: 'var(--adm-accent)' }} />
                      Publish Summary
                    </h3>
                    <p className="text-xs" style={{ color: 'var(--adm-text-secondary)' }}>
                      {selectedAccount
                        ? `Filtered: ${selectedAccount.staffName} · @${selectedAccount.accountUsername}`
                        : 'Overview of all published content'}
                    </p>
                  </div>
                  <span className="text-[10px] px-2.5 py-1 rounded-full font-medium" style={{ backgroundColor: 'var(--adm-input)', color: 'var(--adm-text-secondary)' }}>
                    {dashboardFilteredRecords.length} posts
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {(() => {
                    const totalClicks = dashboardFilteredRecords.reduce((sum, r) => sum + r.clicks, 0)
                    const totalConversions = dashboardFilteredRecords.reduce((sum, r) => sum + r.conversions, 0)
                    const totalRevenue = dashboardFilteredRecords.reduce((sum, r) => sum + r.revenue, 0)
                    const totalViews = dashboardFilteredRecords.reduce((sum, r) => sum + r.views, 0)
                    return (
                      <>
                        <div className="rounded-lg p-3" style={{ backgroundColor: 'var(--adm-input)' }}>
                          <p className="text-[10px]" style={{ color: 'var(--adm-text-secondary)' }}>Total Clicks</p>
                          <p className="text-lg font-bold mt-1" style={{ color: 'var(--adm-text)' }}>{totalClicks.toLocaleString()}</p>
                        </div>
                        <div className="rounded-lg p-3" style={{ backgroundColor: 'var(--adm-input)' }}>
                          <p className="text-[10px]" style={{ color: 'var(--adm-text-secondary)' }}>Conversions</p>
                          <p className="text-lg font-bold mt-1" style={{ color: '#166534' }}>{totalConversions.toLocaleString()}</p>
                        </div>
                        <div className="rounded-lg p-3" style={{ backgroundColor: 'var(--adm-input)' }}>
                          <p className="text-[10px]" style={{ color: 'var(--adm-text-secondary)' }}>Revenue</p>
                          <p className="text-lg font-bold mt-1" style={{ color: '#166534' }}>${totalRevenue.toFixed(0)}</p>
                        </div>
                        <div className="rounded-lg p-3" style={{ backgroundColor: 'var(--adm-input)' }}>
                          <p className="text-[10px]" style={{ color: 'var(--adm-text-secondary)' }}>Views</p>
                          <p className="text-lg font-bold mt-1" style={{ color: 'var(--adm-text)' }}>{totalViews.toLocaleString()}</p>
                        </div>
                      </>
                    )
                  })()}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[260px_1fr] gap-6">
              {/* Sidebar Category List */}
              <div className="rounded-2xl p-4" style={{ backgroundColor: 'var(--adm-card)', border: '1px solid var(--adm-border)' }}>
                <h3 className="text-xs font-semibold uppercase tracking-wider mb-3 px-2" style={{ color: 'var(--adm-text-secondary)' }}>Categories</h3>
                <nav className="space-y-1">
                  {[
                    { id: 'post-ledger', label: 'Post Ledger', icon: FileText, desc: 'All published posts & metrics' },
                    { id: 'instagram-health', label: 'Instagram Health', icon: Activity, desc: 'API connectivity & operations' },
                    { id: 'attribution', label: 'Attribution', icon: BarChart3, desc: 'Conversion rules & tracking' },
                    { id: 'insights', label: 'Insights', icon: Eye, desc: 'Performance & analytics' },
                  ].map(item => {
                    const isActive = publishCategory === item.id
                    return (
                      <button
                        key={item.id}
                        onClick={() => setPublishCategory(isActive ? '' : item.id)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all"
                        style={{
                          backgroundColor: isActive ? 'var(--adm-accent-bg)' : 'transparent',
                          border: isActive ? '1px solid var(--adm-accent)' : '1px solid transparent',
                        }}
                      >
                        <item.icon size={16} style={{ color: isActive ? 'var(--adm-accent)' : 'var(--adm-text-secondary)' }} />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium" style={{ color: isActive ? 'var(--adm-accent)' : 'var(--adm-text)' }}>{item.label}</p>
                          <p className="text-[10px] truncate" style={{ color: 'var(--adm-text-secondary)' }}>{item.desc}</p>
                        </div>
                        {isActive && <ChevronRight size={14} style={{ color: 'var(--adm-accent)' }} />}
                      </button>
                    )
                  })}
                </nav>
              </div>

              {/* Content Panel */}
              <div className="space-y-0">
                {!publishCategory && (
                  <div className="rounded-2xl p-12 text-center" style={{ backgroundColor: 'var(--adm-card)', border: '1px solid var(--adm-border)' }}>
                    <FileText size={40} className="mx-auto mb-3 opacity-20" style={{ color: 'var(--adm-text-secondary)' }} />
                    <p className="text-sm font-medium" style={{ color: 'var(--adm-text)' }}>Select a category</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--adm-text-secondary)' }}>Choose a category from the sidebar to view related content</p>
                  </div>
                )}

                {publishCategory === 'post-ledger' && (
                  <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-6">
              <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--adm-card)', border: '1px solid var(--adm-border)' }}>
                <div className="flex items-center justify-between mb-4 gap-3">
                  <div>
                    <h4 className="text-base font-semibold" style={{ color: 'var(--adm-text)' }}>Post Data Ledger</h4>
                    <p className="text-sm" style={{ color: 'var(--adm-text-secondary)' }}>
                      {isAdmin
                        ? '管理员查看所有社交账号的发帖流水、转化数据和官方表现指标。'
                        : '这里只显示你自己的发帖流水、转化数据和官方表现指标。'}
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab('studio')}
                    className="px-3 py-1.5 text-xs rounded-lg font-medium"
                    style={{ backgroundColor: 'var(--adm-accent)', color: 'var(--adm-accent-text)' }}
                  >
                    New Publish
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-[1.4fr_0.8fr_0.8fr_auto] gap-3 mb-4">
                  <input
                    value={postListSearch}
                    onChange={(e) => setPostListSearch(e.target.value)}
                    placeholder="搜索账户、标题、内容、产品、tracking code..."
                    className="px-3 py-2 text-sm rounded-lg"
                    style={{ backgroundColor: 'var(--adm-input)', color: 'var(--adm-text)' }}
                  />
                  <select
                    value={postListPlatformFilter}
                    onChange={(e) => setPostListPlatformFilter(e.target.value)}
                    className="px-3 py-2 text-sm rounded-lg"
                    style={{ backgroundColor: 'var(--adm-input)', color: 'var(--adm-text)' }}
                  >
                    <option value="all">All Platforms</option>
                    {PLATFORMS.map(platform => (
                      <option key={platform.id} value={platform.id}>{platform.name}</option>
                    ))}
                  </select>
                  <select
                    value={postListStatusFilter}
                    onChange={(e) => setPostListStatusFilter(e.target.value)}
                    className="px-3 py-2 text-sm rounded-lg"
                    style={{ backgroundColor: 'var(--adm-input)', color: 'var(--adm-text)' }}
                  >
                    <option value="all">All Status</option>
                    <option value="published">Published</option>
                    <option value="manual_action_required">Manual Action</option>
                    <option value="failed">Failed</option>
                    <option value="draft">Draft</option>
                  </select>
                  <button
                    onClick={() => {
                      setPostListSearch('')
                      setPostListPlatformFilter('all')
                      setPostListStatusFilter('all')
                      setPostListStartDate('')
                      setPostListEndDate('')
                      setPostListStaffFilter('all')
                      setPostListSortBy('newest')
                    }}
                    className="px-3 py-2 text-xs rounded-lg font-medium"
                    style={{ backgroundColor: 'var(--adm-input)', color: 'var(--adm-text)' }}
                  >
                    Reset
                  </button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-[1fr_1fr_1fr_1fr_auto] gap-3 mb-4">
                  <div className="flex items-center gap-2">
                    <label className="text-[11px] whitespace-nowrap" style={{ color: 'var(--adm-text-secondary)' }}>From</label>
                    <input
                      type="date"
                      value={postListStartDate}
                      onChange={(e) => setPostListStartDate(e.target.value)}
                      className="px-3 py-2 text-sm rounded-lg w-full"
                      style={{ backgroundColor: 'var(--adm-input)', color: 'var(--adm-text)' }}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-[11px] whitespace-nowrap" style={{ color: 'var(--adm-text-secondary)' }}>To</label>
                    <input
                      type="date"
                      value={postListEndDate}
                      onChange={(e) => setPostListEndDate(e.target.value)}
                      className="px-3 py-2 text-sm rounded-lg w-full"
                      style={{ backgroundColor: 'var(--adm-input)', color: 'var(--adm-text)' }}
                    />
                  </div>
                  <select
                    value={postListStaffFilter}
                    onChange={(e) => setPostListStaffFilter(e.target.value)}
                    className="px-3 py-2 text-sm rounded-lg"
                    style={{ backgroundColor: 'var(--adm-input)', color: 'var(--adm-text)' }}
                  >
                    <option value="all">All Staff</option>
                    {allStaffMembers.map(staff => (
                      <option key={staff.id} value={staff.name}>{staff.name}</option>
                    ))}
                  </select>
                  <select
                    value={postListSortBy}
                    onChange={(e) => setPostListSortBy(e.target.value)}
                    className="px-3 py-2 text-sm rounded-lg"
                    style={{ backgroundColor: 'var(--adm-input)', color: 'var(--adm-text)' }}
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="most_views">Most Views</option>
                    <option value="most_clicks">Most Clicks</option>
                    <option value="highest_revenue">Highest Revenue</option>
                    <option value="best_conversion">Best Conversion Rate</option>
                  </select>
                  <button
                    onClick={handleExportPostLedgerCSV}
                    className="px-3 py-2 text-sm rounded-lg font-medium flex items-center gap-2"
                    style={{ backgroundColor: 'var(--adm-accent)', color: 'var(--adm-accent-text)' }}
                  >
                    <FileText size={14} /> Export CSV
                  </button>
                </div>

                {socialContentLoading ? (
                  <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--adm-text-secondary)' }}>
                    <Loader2 size={16} className="animate-spin" /> Loading publish records...
                  </div>
                ) : filteredPublishRecordsTable.length === 0 ? (
                  <div className="text-center py-10" style={{ color: 'var(--adm-text-secondary)' }}>
                    <Send size={32} className="mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No post records matched current filters</p>
                    <p className="text-xs mt-1">调整筛选条件，或先通过 Studio / Social Accounts 发出第一批内容。</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-[1.3fr_0.9fr_0.8fr_0.8fr_0.8fr_0.7fr_0.7fr_auto] gap-3 px-4 py-2 rounded-xl text-[11px] font-semibold uppercase tracking-wider" style={{ backgroundColor: 'var(--adm-input)', color: 'var(--adm-text-secondary)' }}>
                      <span>Account / Content</span>
                      <span>Status / Publish</span>
                      <span>Views</span>
                      <span>Clicks</span>
                      <span>Revenue</span>
                      <span>Conv</span>
                      <span>Rate</span>
                      <span>Action</span>
                    </div>
                    {filteredPublishRecordsTable.map(item => {
                      const { record, clicks, conversions, revenue, views, conversionRate } = item
                      const pInfo = PLATFORMS.find(p => p.id === record.platform) || { name: record.platform, color: '#6366F1', bgColor: '#EEF2FF', icon: Globe }
                      const statusMeta = getPublishStatusMeta(record.status)
                      return (
                        <div key={record.id} className="rounded-xl p-4" style={{ backgroundColor: 'var(--adm-input)' }}>
                          <div className="grid grid-cols-1 md:grid-cols-[1.3fr_0.9fr_0.8fr_0.8fr_0.8fr_0.7fr_0.7fr_auto] gap-3 items-start">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <pInfo.icon size={14} style={{ color: pInfo.color }} />
                                <p className="text-sm font-semibold truncate" style={{ color: 'var(--adm-text)' }}>{record.contentTitle}</p>
                              </div>
                              <p className="text-xs mt-1 truncate" style={{ color: 'var(--adm-text-secondary)' }}>
                                {`${record.platformName} · @${record.platformUsername || record.staffName}${isAdmin ? ` · ${record.staffName}` : ''}`}
                              </p>
                              <p className="text-[11px] mt-1 line-clamp-2" style={{ color: 'var(--adm-text-secondary)' }}>
                                {record.contentBody}
                              </p>
                            </div>
                            <div>
                              <span
                                className="text-[10px] px-2 py-1 rounded-full font-medium inline-flex"
                                style={{ backgroundColor: statusMeta.backgroundColor, color: statusMeta.color }}
                              >
                                {statusMeta.label}
                              </span>
                              <p className="text-[11px] mt-2" style={{ color: 'var(--adm-text-secondary)' }}>{record.publishMode}</p>
                              <p className="text-[11px] mt-1" style={{ color: 'var(--adm-text-secondary)' }}>
                                {new Date(record.publishedAt || record.createdAt).toLocaleString()}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm font-semibold" style={{ color: 'var(--adm-text)' }}>{views}</p>
                              <p className="text-[11px]" style={{ color: 'var(--adm-text-secondary)' }}>official views</p>
                            </div>
                            <div>
                              <p className="text-sm font-semibold" style={{ color: 'var(--adm-text)' }}>{clicks}</p>
                              <p className="text-[11px]" style={{ color: 'var(--adm-text-secondary)' }}>{record.referralCode || 'no code'}</p>
                            </div>
                            <div>
                              <p className="text-sm font-semibold" style={{ color: revenue > 0 ? '#166534' : 'var(--adm-text)' }}>{`$${revenue.toFixed(0)}`}</p>
                              <p className="text-[11px]" style={{ color: 'var(--adm-text-secondary)' }}>revenue</p>
                            </div>
                            <div>
                              <p className="text-sm font-semibold" style={{ color: conversions > 0 ? '#166534' : 'var(--adm-text)' }}>{conversions}</p>
                              <p className="text-[11px]" style={{ color: 'var(--adm-text-secondary)' }}>orders</p>
                            </div>
                            <div>
                              <p className="text-sm font-semibold" style={{ color: 'var(--adm-text)' }}>{conversionRate.toFixed(1)}%</p>
                              <p className="text-[11px]" style={{ color: 'var(--adm-text-secondary)' }}>click-to-order</p>
                            </div>
                            <div className="flex md:justify-end gap-2">
                              <button
                                onClick={() => setSelectedSocialContentId(record.id)}
                                className="px-3 py-1.5 text-xs rounded-lg font-medium"
                                style={{ backgroundColor: 'var(--adm-card)', color: 'var(--adm-text)' }}
                              >
                                Details
                              </button>
                            </div>
                          </div>

                          {(record.note || record.errorMessage) && (
                            <div className="mt-3 rounded-lg p-3" style={{ backgroundColor: 'var(--adm-card)' }}>
                              <p className="text-[11px]" style={{ color: record.errorMessage ? '#B91C1C' : 'var(--adm-text-secondary)' }}>
                                {record.errorMessage || record.note}
                              </p>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--adm-card)', border: '1px solid var(--adm-border)' }}>
                <h4 className="text-base font-semibold mb-4" style={{ color: 'var(--adm-text)' }}>Post Ledger Summary</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--adm-input)' }}>
                    <p className="text-xs mb-1" style={{ color: 'var(--adm-text-secondary)' }}>Visible Posts</p>
                    <p className="text-xl font-bold" style={{ color: 'var(--adm-text)' }}>{postPageSummary.total}</p>
                  </div>
                  <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--adm-input)' }}>
                    <p className="text-xs mb-1" style={{ color: 'var(--adm-text-secondary)' }}>Published</p>
                    <p className="text-xl font-bold" style={{ color: '#166534' }}>{postPageSummary.published}</p>
                  </div>
                  <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--adm-input)' }}>
                    <p className="text-xs mb-1" style={{ color: 'var(--adm-text-secondary)' }}>Manual Steps</p>
                    <p className="text-xl font-bold" style={{ color: '#92400E' }}>{postPageSummary.manual}</p>
                  </div>
                  <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--adm-input)' }}>
                    <p className="text-xs mb-1" style={{ color: 'var(--adm-text-secondary)' }}>Failed</p>
                    <p className="text-xl font-bold" style={{ color: '#991B1B' }}>{postPageSummary.failed}</p>
                  </div>
                  <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--adm-input)' }}>
                    <p className="text-xs mb-1" style={{ color: 'var(--adm-text-secondary)' }}>Tracked Clicks</p>
                    <p className="text-xl font-bold" style={{ color: 'var(--adm-text)' }}>{postPageSummary.clicks}</p>
                  </div>
                  <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--adm-input)' }}>
                    <p className="text-xs mb-1" style={{ color: 'var(--adm-text-secondary)' }}>Official Views</p>
                    <p className="text-xl font-bold" style={{ color: 'var(--adm-text)' }}>{postPageSummary.views}</p>
                  </div>
                  <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--adm-input)' }}>
                    <p className="text-xs mb-1" style={{ color: 'var(--adm-text-secondary)' }}>Conversions</p>
                    <p className="text-xl font-bold" style={{ color: '#166534' }}>{postPageSummary.conversions}</p>
                  </div>
                  <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--adm-input)' }}>
                    <p className="text-xs mb-1" style={{ color: 'var(--adm-text-secondary)' }}>Revenue</p>
                    <p className="text-xl font-bold" style={{ color: '#166534' }}>{`$${postPageSummary.revenue.toFixed(0)}`}</p>
                  </div>
                </div>

                <div className="mt-4 rounded-xl p-4" style={{ backgroundColor: 'var(--adm-input)' }}>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--adm-text-secondary)' }}>
                    Ledger Rules
                  </p>
                  <p className="text-sm" style={{ color: 'var(--adm-text)' }}>
                    管理员默认看全部帖子，员工默认只看自己发布或绑定到自己账号的帖子。列表点击 `Details` 会进入单帖完整详情页。
                  </p>
                </div>

                <div className="mt-4 rounded-xl p-4" style={{ backgroundColor: 'var(--adm-input)' }}>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--adm-text-secondary)' }}>
                    Top Rows
                  </p>
                  {filteredPublishRecordsTable.length === 0 ? (
                    <p className="text-sm" style={{ color: 'var(--adm-text-secondary)' }}>
                      当前筛选条件下没有帖子记录。
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {filteredPublishRecordsTable.slice(0, 3).map(item => (
                        (() => {
                          const statusMeta = getPublishStatusMeta(item.record.status)
                          return (
                            <div key={item.record.id} className="flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate" style={{ color: 'var(--adm-text)' }}>{item.record.contentTitle}</p>
                                <p className="text-[11px]" style={{ color: 'var(--adm-text-secondary)' }}>
                                  {`@${item.record.platformUsername || item.record.staffName} · ${item.clicks} clicks · $${item.revenue.toFixed(0)}`}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => setSelectedSocialContentId(item.record.id)}
                                  className="px-2.5 py-1 text-[10px] rounded-full font-medium"
                                  style={{ backgroundColor: 'var(--adm-card)', color: 'var(--adm-text)' }}
                                >
                                  Details
                                </button>
                                <span
                                  className="text-[10px] px-2 py-1 rounded-full font-medium"
                                  style={{ backgroundColor: statusMeta.backgroundColor, color: statusMeta.color }}
                                >
                                  {statusMeta.label}
                                </span>
                              </div>
                            </div>
                          )
                        })()
                      ))}
                    </div>
                  )}
                </div>
              </div>

                  </div>
                )}

                {publishCategory === 'instagram-health' && (
                  <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-6">
              <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--adm-card)', border: '1px solid var(--adm-border)' }}>
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <h4 className="text-base font-semibold" style={{ color: 'var(--adm-text)' }}>Instagram Publish Readiness</h4>
                    <p className="text-sm" style={{ color: 'var(--adm-text-secondary)' }}>
                      将账号、权限、发布开关和服务端连通性放在一处展示，方便快速判断真实发布阻塞点。
                    </p>
                  </div>
                  <button
                    onClick={loadInstagramHealth}
                    className="px-3 py-1.5 text-xs rounded-lg font-medium flex items-center gap-1.5"
                    style={{ backgroundColor: 'var(--adm-input)', color: 'var(--adm-text)' }}
                  >
                    <RefreshCw size={12} className={instagramHealthLoading ? 'animate-spin' : ''} /> Recheck
                  </button>
                </div>

                <div className="flex items-center gap-3 mb-4">
                  {(() => {
                    const healthMeta = getHealthStatusMeta(instagramHealth?.status)
                    return (
                      <span
                        className="text-xs px-3 py-1.5 rounded-full font-semibold"
                        style={{ backgroundColor: healthMeta.backgroundColor, color: healthMeta.color }}
                      >
                        {healthMeta.label}
                      </span>
                    )
                  })()}
                  <p className="text-sm" style={{ color: 'var(--adm-text-secondary)' }}>
                    {instagramHealthLoading
                      ? '正在检查 Instagram API 连通性...'
                      : instagramHealthError || instagramHealth?.message || '尚未执行健康检查'}
                  </p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    {
                      label: 'Connected Accounts',
                      ok: (instagramHealth?.summary?.connectedAccounts || instagramVisibleAccounts.length) > 0,
                      detail: `${instagramHealth?.summary?.connectedAccounts || instagramVisibleAccounts.length || 0} connected`,
                    },
                    {
                      label: 'API Enabled',
                      ok: !!instagramHealth?.checks?.apiEnabled,
                      detail: instagramHealth?.checks?.apiEnabled ? 'Instagram API enabled' : 'Enable igApi in settings',
                    },
                    {
                      label: 'Content Publish',
                      ok: !!instagramHealth?.checks?.contentPublishEnabled,
                      detail: instagramHealth?.checks?.contentPublishEnabled ? 'Content publish enabled' : 'Enable content publish permission',
                    },
                    {
                      label: 'Comments',
                      ok: !!instagramHealth?.checks?.manageCommentsEnabled,
                      detail: instagramHealth?.checks?.manageCommentsEnabled ? 'Comments permission on' : 'Pending manual permission',
                    },
                    {
                      label: 'Messages',
                      ok: !!instagramHealth?.checks?.manageMessagesEnabled,
                      detail: instagramHealth?.checks?.manageMessagesEnabled ? 'Messages permission on' : 'Pending manual permission',
                    },
                    {
                      label: 'Healthy Accounts',
                      ok: (instagramHealth?.summary?.healthyAccounts || 0) > 0,
                      detail: `${instagramHealth?.summary?.healthyAccounts || 0} healthy / ${instagramHealth?.summary?.connectedAccounts || instagramVisibleAccounts.length || 0}`,
                    },
                  ].map(item => (
                    <div key={item.label} className="p-4 rounded-xl" style={{ backgroundColor: 'var(--adm-input)' }}>
                      <div className="flex items-center gap-2 mb-2">
                        <div
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: item.ok ? '#22C55E' : '#F59E0B' }}
                        />
                        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--adm-text-secondary)' }}>
                          {item.label}
                        </p>
                      </div>
                      <p className="text-sm font-medium" style={{ color: 'var(--adm-text)' }}>
                        {item.ok ? 'Ready' : 'Action Needed'}
                      </p>
                      <p className="text-[11px] mt-1" style={{ color: 'var(--adm-text-secondary)' }}>
                        {item.detail}
                      </p>
                    </div>
                  ))}
                </div>

                {instagramAccountBoards.length > 0 && (
                  <div className="mt-4 rounded-xl p-4" style={{ backgroundColor: 'var(--adm-input)' }}>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {instagramAccountBoards.map(item => {
                        const isActive = selectedInstagramAccountBoard?.account.id === item.account.id
                        return (
                          <button
                            key={item.account.id}
                            onClick={() => setSelectedInstagramPanelAccountId(item.account.id)}
                            className="px-3 py-1.5 text-xs rounded-full font-medium"
                            style={{
                              backgroundColor: isActive ? '#FCE7F3' : 'var(--adm-card)',
                              color: isActive ? '#9D174D' : 'var(--adm-text)',
                            }}
                          >
                            {`@${item.account.username} · ${item.account.staffName}`}
                          </button>
                        )
                      })}
                    </div>

                    {selectedInstagramAccountBoard ? (
                      <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--adm-card)' }}>
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold" style={{ color: 'var(--adm-text)' }}>
                              {`Focused Health: @${selectedInstagramAccountBoard.account.username}`}
                            </p>
                            <p className="text-[11px]" style={{ color: 'var(--adm-text-secondary)' }}>
                              {selectedInstagramAccountBoard.health?.message || 'Health status pending'}
                            </p>
                          </div>
                          {(() => {
                            const meta = getHealthStatusMeta(selectedInstagramAccountBoard.health?.status)
                            return (
                              <span className="text-[10px] px-2 py-1 rounded-full font-medium" style={{ backgroundColor: meta.backgroundColor, color: meta.color }}>
                                {meta.label}
                              </span>
                            )
                          })()}
                        </div>
                      </div>
                    ) : null}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                      {instagramAccountBoards.map(item => {
                        const meta = getHealthStatusMeta(item.health?.status)
                        return (
                          <div key={item.account.id} className="rounded-lg p-4" style={{ backgroundColor: 'var(--adm-card)' }}>
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="text-sm font-semibold" style={{ color: 'var(--adm-text)' }}>{`@${item.account.username}`}</p>
                                <p className="text-[11px]" style={{ color: 'var(--adm-text-secondary)' }}>{item.account.staffName}</p>
                              </div>
                              <span className="text-[10px] px-2 py-1 rounded-full font-medium" style={{ backgroundColor: meta.backgroundColor, color: meta.color }}>
                                {meta.label}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 mt-3">
                              <div className="rounded-lg p-3" style={{ backgroundColor: 'var(--adm-input)' }}>
                                <p className="text-[10px]" style={{ color: 'var(--adm-text-secondary)' }}>Network</p>
                                <p className="text-sm font-semibold mt-1" style={{ color: 'var(--adm-text)' }}>
                                  {item.health?.checks?.networkReachable ? 'Reachable' : 'Check server'}
                                </p>
                              </div>
                              <div className="rounded-lg p-3" style={{ backgroundColor: 'var(--adm-input)' }}>
                                <p className="text-[10px]" style={{ color: 'var(--adm-text-secondary)' }}>Published Posts</p>
                                <p className="text-sm font-semibold mt-1" style={{ color: 'var(--adm-text)' }}>{item.publishedRecords.length}</p>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                <div className="mt-4 rounded-xl p-4" style={{ backgroundColor: 'var(--adm-input)' }}>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--adm-text-secondary)' }}>
                    Real Test Result
                  </p>
                  <p className="text-sm" style={{ color: 'var(--adm-text)' }}>
                    {instagramOperationalRecords.some(record => record.status === 'published')
                      ? '最新一次真实 Instagram 发帖已成功完成，发布结果、tracking link 和运营记录均已同步回系统。'
                      : instagramHealth?.status === 'healthy'
                        ? 'Instagram API 当前可用，系统已具备继续执行真实发帖与后续运营追踪的条件。'
                        : '当前仍需先排查连通性或权限问题，再继续真实发帖。'}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--adm-card)', border: '1px solid var(--adm-border)' }}>
                <h4 className="text-base font-semibold mb-4" style={{ color: 'var(--adm-text)' }}>Operations Queue</h4>
                {pendingOperationalRecords.length === 0 ? (
                  <div className="text-center py-10" style={{ color: 'var(--adm-text-secondary)' }}>
                    <Check size={30} className="mx-auto mb-2 opacity-40" />
                    <p className="text-sm">No pending manual actions</p>
                    <p className="text-xs mt-1">失败或待人工完成的发布记录会集中显示在这里。</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pendingOperationalRecords.map(record => {
                      const statusMeta = getPublishStatusMeta(record.status)
                      return (
                        <div key={record.id} className="rounded-xl p-4" style={{ backgroundColor: 'var(--adm-input)' }}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold truncate" style={{ color: 'var(--adm-text)' }}>{record.contentTitle}</p>
                              <p className="text-xs mt-1" style={{ color: 'var(--adm-text-secondary)' }}>
                                {record.platformName} · @{record.platformUsername || record.staffName}
                              </p>
                            </div>
                            <span
                              className="text-[10px] px-2 py-1 rounded-full font-medium"
                              style={{ backgroundColor: statusMeta.backgroundColor, color: statusMeta.color }}
                            >
                              {statusMeta.label}
                            </span>
                          </div>
                          <p className="text-[11px] mt-3" style={{ color: record.errorMessage ? '#B91C1C' : 'var(--adm-text-secondary)' }}>
                            {record.errorMessage || record.note || 'Waiting for manual completion'}
                          </p>
                          {record.referralUrl && (
                            <button
                              onClick={() => copyToClipboard(record.referralUrl || '')}
                              className="mt-3 px-3 py-1.5 text-xs rounded-lg font-medium"
                              style={{ backgroundColor: 'var(--adm-card)', color: 'var(--adm-text)' }}
                            >
                              Copy Tracking Link
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}

                <div className="mt-4 rounded-xl p-4" style={{ backgroundColor: 'var(--adm-input)' }}>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--adm-text-secondary)' }}>
                    Bio Link Playbook
                  </p>
                  {featuredInstagramRecord ? (
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-medium" style={{ color: 'var(--adm-text)' }}>
                          {featuredInstagramRecord.contentTitle}
                        </p>
                        <p className="text-[11px]" style={{ color: 'var(--adm-text-secondary)' }}>
                          建议将本条 tracking link 放入 Instagram Bio、Story Link 或 Link in Bio 页面。
                        </p>
                      </div>
                      <div className="rounded-lg p-3" style={{ backgroundColor: 'var(--adm-card)' }}>
                        <p className="text-[11px] mb-2" style={{ color: 'var(--adm-text-secondary)' }}>Primary Bio Link</p>
                        <code className="block text-xs break-all" style={{ color: 'var(--adm-text)' }}>
                          {getBioLandingUrl(featuredInstagramRecord) || 'No tracking link'}
                        </code>
                      </div>
                      <div className="rounded-lg p-3" style={{ backgroundColor: 'var(--adm-card)' }}>
                        <p className="text-[11px] mb-2" style={{ color: 'var(--adm-text-secondary)' }}>Story Link</p>
                        <code className="block text-xs break-all" style={{ color: 'var(--adm-text)' }}>
                          {getStoryLandingUrl(featuredInstagramRecord) || 'No story link'}
                        </code>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => copyToClipboard(getBioLandingUrl(featuredInstagramRecord))}
                          className="px-3 py-2 text-xs rounded-lg font-medium"
                          style={{ backgroundColor: 'var(--adm-card)', color: 'var(--adm-text)' }}
                        >
                          Copy Bio Link
                        </button>
                        <button
                          onClick={() => openTrackingPreview(getBioLandingUrl(featuredInstagramRecord))}
                          className="px-3 py-2 text-xs rounded-lg font-medium"
                          style={{ backgroundColor: 'var(--adm-accent)', color: 'var(--adm-accent-text)' }}
                        >
                          Preview Landing
                        </button>
                        <button
                          onClick={() => copyToClipboard(getStoryLandingUrl(featuredInstagramRecord))}
                          className="px-3 py-2 text-xs rounded-lg font-medium"
                          style={{ backgroundColor: 'var(--adm-card)', color: 'var(--adm-text)' }}
                        >
                          Copy Story Link
                        </button>
                        <button
                          onClick={() => openTrackingPreview(getStoryLandingUrl(featuredInstagramRecord))}
                          className="px-3 py-2 text-xs rounded-lg font-medium"
                          style={{ backgroundColor: 'var(--adm-card)', color: 'var(--adm-text)' }}
                        >
                          Preview Story Flow
                        </button>
                        <button
                          onClick={() => copyToClipboard(featuredInstagramRecord.contentBody)}
                          className="px-3 py-2 text-xs rounded-lg font-medium"
                          style={{ backgroundColor: 'var(--adm-card)', color: 'var(--adm-text)' }}
                        >
                          Copy Caption
                        </button>
                        <button
                          onClick={() => setSelectedSocialContentId(featuredInstagramRecord.id)}
                          className="px-3 py-2 text-xs rounded-lg font-medium"
                          style={{ backgroundColor: 'var(--adm-card)', color: 'var(--adm-text)' }}
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm" style={{ color: 'var(--adm-text-secondary)' }}>
                      暂无可用的 Instagram 发布记录，完成发帖后这里会出现可直接执行的 Bio Link 操作。
                    </p>
                  )}
                </div>
              </div>

                  </div>
                )}

                {publishCategory === 'attribution' && (
                  <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--adm-card)', border: '1px solid var(--adm-border)' }}>
              <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--adm-card)', border: '1px solid var(--adm-border)' }}>
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <h4 className="text-base font-semibold" style={{ color: 'var(--adm-text)' }}>Attribution Control Center</h4>
                    <p className="text-sm" style={{ color: 'var(--adm-text-secondary)' }}>
                      直接控制当前订单归因规则，为后续多触点模型和跨设备归因预留扩展位。
                    </p>
                  </div>
                  <button
                    onClick={saveAttributionSettings}
                    disabled={!systemSettings || attributionSaving}
                    className="px-3 py-1.5 text-xs rounded-lg font-medium flex items-center gap-1.5 disabled:opacity-50"
                    style={{ backgroundColor: 'var(--adm-accent)', color: 'var(--adm-accent-text)' }}
                  >
                    {attributionSaving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                    Save Rules
                  </button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--adm-input)' }}>
                    <p className="text-xs mb-1" style={{ color: 'var(--adm-text-secondary)' }}>Model</p>
                    <p className="text-lg font-semibold" style={{ color: 'var(--adm-text)' }}>{attributionStatusSummary.model}</p>
                  </div>
                  <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--adm-input)' }}>
                    <p className="text-xs mb-1" style={{ color: 'var(--adm-text-secondary)' }}>Lookback</p>
                    <p className="text-lg font-semibold" style={{ color: 'var(--adm-text)' }}>{attributionStatusSummary.lookback} days</p>
                  </div>
                  <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--adm-input)' }}>
                    <p className="text-xs mb-1" style={{ color: 'var(--adm-text-secondary)' }}>Visitor Match</p>
                    <p className="text-lg font-semibold" style={{ color: attributionStatusSummary.requireVisitorMatch ? '#166534' : '#92400E' }}>
                      {attributionStatusSummary.requireVisitorMatch ? 'Strict' : 'Loose'}
                    </p>
                  </div>
                  <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--adm-input)' }}>
                    <p className="text-xs mb-1" style={{ color: 'var(--adm-text-secondary)' }}>Fallback</p>
                    <p className="text-lg font-semibold" style={{ color: attributionStatusSummary.allowFallback ? '#166534' : '#991B1B' }}>
                      {attributionStatusSummary.allowFallback ? 'Enabled' : 'Off'}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--adm-text-secondary)' }}>
                      Attribution Model
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {ATTRIBUTION_MODEL_OPTIONS.map(option => {
                        const active = (systemSettings?.attributionModel || 'last_click') === option.id
                        return (
                          <button
                            key={option.id}
                            onClick={() => setSystemSettings((prev: any) => ({ ...prev, attributionModel: option.id }))}
                            className="text-left rounded-xl p-4 transition-colors"
                            style={{
                              backgroundColor: active ? 'rgba(59,130,246,0.08)' : 'var(--adm-input)',
                              border: active ? '1px solid rgba(59,130,246,0.35)' : '1px solid transparent',
                            }}
                          >
                            <p className="text-sm font-semibold" style={{ color: 'var(--adm-text)' }}>{option.name}</p>
                            <p className="text-[11px] mt-1" style={{ color: 'var(--adm-text-secondary)' }}>{option.description}</p>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--adm-input)' }}>
                      <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--adm-text-secondary)' }}>
                        Lookback Window
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={90}
                        value={systemSettings?.attributionLookbackDays || 7}
                        onChange={(e) => setSystemSettings((prev: any) => ({ ...prev, attributionLookbackDays: Number(e.target.value || 7) }))}
                        className="w-full px-3 py-2 rounded-lg text-sm"
                        style={{ backgroundColor: 'var(--adm-card)', color: 'var(--adm-text)' }}
                      />
                      <p className="text-[11px] mt-2" style={{ color: 'var(--adm-text-secondary)' }}>
                        当前只会在最近 N 天的有效 click 中挑选归因对象。
                      </p>
                    </div>

                    <div className="rounded-xl p-4 space-y-3" style={{ backgroundColor: 'var(--adm-input)' }}>
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={systemSettings?.attributionRequireVisitorMatch !== false}
                          onChange={(e) => setSystemSettings((prev: any) => ({ ...prev, attributionRequireVisitorMatch: e.target.checked }))}
                        />
                        <span>
                          <span className="block text-sm font-medium" style={{ color: 'var(--adm-text)' }}>Require same visitor match</span>
                          <span className="block text-[11px]" style={{ color: 'var(--adm-text-secondary)' }}>
                            优先要求 `visitor_id` 一致，减少多个用户共用 referral code 时的误归因。
                          </span>
                        </span>
                      </label>
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={systemSettings?.attributionAllowReferralFallback !== false}
                          onChange={(e) => setSystemSettings((prev: any) => ({ ...prev, attributionAllowReferralFallback: e.target.checked }))}
                        />
                        <span>
                          <span className="block text-sm font-medium" style={{ color: 'var(--adm-text)' }}>Allow referral-code fallback</span>
                          <span className="block text-[11px]" style={{ color: 'var(--adm-text-secondary)' }}>
                            没有 visitor 精确命中时，允许退回到同 referral code 的最近有效点击。
                          </span>
                        </span>
                      </label>
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!systemSettings?.igInsightsEnabled}
                          onChange={(e) => setSystemSettings((prev: any) => ({ ...prev, igInsightsEnabled: e.target.checked }))}
                        />
                        <span>
                          <span className="block text-sm font-medium" style={{ color: 'var(--adm-text)' }}>Mark Insights module as enabled</span>
                          <span className="block text-[11px]" style={{ color: 'var(--adm-text-secondary)' }}>
                            用于标记 Meta Insights 权限已经准备继续接入，便于后台展示状态联动。
                          </span>
                        </span>
                      </label>
                    </div>
                  </div>

                  <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--adm-input)' }}>
                    <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--adm-text-secondary)' }}>
                      Channel Split
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {[
                        { id: 'bio', label: 'Bio', clicks: referralStats?.clicksByChannel?.bio || 0, conversions: referralStats?.conversionsByChannel?.bio || 0 },
                        { id: 'story', label: 'Story', clicks: referralStats?.clicksByChannel?.story || 0, conversions: referralStats?.conversionsByChannel?.story || 0 },
                        { id: 'post', label: 'Post', clicks: referralStats?.clicksByChannel?.post || 0, conversions: referralStats?.conversionsByChannel?.post || 0 },
                        { id: 'direct', label: 'Direct', clicks: referralStats?.clicksByChannel?.direct || 0, conversions: referralStats?.conversionsByChannel?.direct || 0 },
                      ].map(channel => (
                        <div key={channel.id} className="rounded-lg p-3" style={{ backgroundColor: 'var(--adm-card)' }}>
                          <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--adm-text-secondary)' }}>{channel.label}</p>
                          <p className="text-sm font-semibold mt-1" style={{ color: 'var(--adm-text)' }}>{channel.clicks} clicks</p>
                          <p className="text-[11px] mt-1" style={{ color: 'var(--adm-text-secondary)' }}>{channel.conversions} conversions</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

                  </div>
                )}

                {publishCategory === 'insights' && (
                  <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--adm-card)', border: '1px solid var(--adm-border)' }}>
              <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--adm-card)', border: '1px solid var(--adm-border)' }}>
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <h4 className="text-base font-semibold" style={{ color: 'var(--adm-text)' }}>Instagram Insights Snapshot</h4>
                    <p className="text-sm" style={{ color: 'var(--adm-text-secondary)' }}>
                      先用系统内已沉淀的发布记录、click、conversion、revenue 做运营快照，后续再接 Meta 官方表现数据。
                    </p>
                  </div>
                  <span
                    className="text-[10px] px-2.5 py-1 rounded-full font-medium"
                    style={{
                      backgroundColor: systemSettings?.igInsightsEnabled ? '#DCFCE7' : '#FEF3C7',
                      color: systemSettings?.igInsightsEnabled ? '#166534' : '#92400E',
                    }}
                  >
                    {systemSettings?.igInsightsEnabled ? 'Insights Ready To Expand' : 'Internal Metrics Mode'}
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--adm-input)' }}>
                    <p className="text-xs mb-1" style={{ color: 'var(--adm-text-secondary)' }}>Published Posts</p>
                    <p className="text-xl font-bold" style={{ color: 'var(--adm-text)' }}>{instagramInsightsSummary.publishedRecords}</p>
                  </div>
                  <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--adm-input)' }}>
                    <p className="text-xs mb-1" style={{ color: 'var(--adm-text-secondary)' }}>Tracked Clicks</p>
                    <p className="text-xl font-bold" style={{ color: 'var(--adm-text)' }}>{instagramInsightsSummary.totalClicks}</p>
                  </div>
                  <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--adm-input)' }}>
                    <p className="text-xs mb-1" style={{ color: 'var(--adm-text-secondary)' }}>Conversions</p>
                    <p className="text-xl font-bold" style={{ color: '#166534' }}>{instagramInsightsSummary.totalConversions}</p>
                  </div>
                  <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--adm-input)' }}>
                    <p className="text-xs mb-1" style={{ color: 'var(--adm-text-secondary)' }}>Revenue</p>
                    <p className="text-xl font-bold" style={{ color: '#166534' }}>${instagramInsightsSummary.totalRevenue.toFixed(0)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
                  <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--adm-input)' }}>
                    <p className="text-xs mb-1" style={{ color: 'var(--adm-text-secondary)' }}>Avg Clicks / Post</p>
                    <p className="text-lg font-semibold" style={{ color: 'var(--adm-text)' }}>{instagramInsightsSummary.avgClicksPerPost.toFixed(1)}</p>
                  </div>
                  <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--adm-input)' }}>
                    <p className="text-xs mb-1" style={{ color: 'var(--adm-text-secondary)' }}>Conversion Rate</p>
                    <p className="text-lg font-semibold" style={{ color: 'var(--adm-text)' }}>{instagramInsightsSummary.conversionRate.toFixed(1)}%</p>
                  </div>
                  <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--adm-input)' }}>
                    <p className="text-xs mb-1" style={{ color: 'var(--adm-text-secondary)' }}>Posts With Traffic</p>
                    <p className="text-lg font-semibold" style={{ color: 'var(--adm-text)' }}>{instagramInsightsSummary.recordsWithTraffic}</p>
                  </div>
                </div>

                <div className="mt-4 rounded-xl p-4" style={{ backgroundColor: 'var(--adm-input)' }}>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--adm-text-secondary)' }}>
                    Top Performing Content
                  </p>
                  {instagramInsightsSummary.topRevenueRecord ? (
                    <div className="space-y-3">
                      <div className="rounded-lg p-3" style={{ backgroundColor: 'var(--adm-card)' }}>
                        <p className="text-sm font-medium" style={{ color: 'var(--adm-text)' }}>
                          {instagramInsightsSummary.topRevenueRecord.contentTitle}
                        </p>
                        <p className="text-[11px] mt-1" style={{ color: 'var(--adm-text-secondary)' }}>
                          {instagramInsightsSummary.topRevenueRecord.productName || 'No specific product bound'}
                        </p>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="rounded-lg p-3" style={{ backgroundColor: 'var(--adm-card)' }}>
                          <p className="text-[10px]" style={{ color: 'var(--adm-text-secondary)' }}>Clicks</p>
                          <p className="text-sm font-semibold" style={{ color: 'var(--adm-text)' }}>{instagramInsightsSummary.topRevenueRecord.clicks}</p>
                        </div>
                        <div className="rounded-lg p-3" style={{ backgroundColor: 'var(--adm-card)' }}>
                          <p className="text-[10px]" style={{ color: 'var(--adm-text-secondary)' }}>Conversions</p>
                          <p className="text-sm font-semibold" style={{ color: 'var(--adm-text)' }}>{instagramInsightsSummary.topRevenueRecord.conversions}</p>
                        </div>
                        <div className="rounded-lg p-3" style={{ backgroundColor: 'var(--adm-card)' }}>
                          <p className="text-[10px]" style={{ color: 'var(--adm-text-secondary)' }}>Revenue</p>
                          <p className="text-sm font-semibold" style={{ color: 'var(--adm-text)' }}>${instagramInsightsSummary.topRevenueRecord.revenue.toFixed(0)}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm" style={{ color: 'var(--adm-text-secondary)' }}>
                      还没有形成足够的真实点击与转化数据，后续随着订单归因沉淀，这里会自动出现最佳内容。
                    </p>
                  )}
                </div>

                <div className="mt-4 rounded-xl p-4" style={{ backgroundColor: 'var(--adm-input)' }}>
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--adm-text-secondary)' }}>
                      Official Meta Insights Readiness
                    </p>
                    <button
                      onClick={loadInstagramInsights}
                      className="px-2.5 py-1 text-[10px] rounded-full font-medium"
                      style={{ backgroundColor: 'var(--adm-card)', color: 'var(--adm-text)' }}
                    >
                      {instagramInsightsLoading ? 'Refreshing...' : 'Refresh'}
                    </button>
                  </div>
                  <p className="text-sm" style={{ color: 'var(--adm-text)' }}>
                    {instagramInsightsLoading
                      ? '正在检查官方 Insights 接入状态...'
                      : instagramInsightsError || instagramInsightsData?.message || '官方 Insights 状态尚未获取'}
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                    {[
                      {
                        label: 'Accounts',
                        ok: !!instagramInsightsData?.readiness?.accountConnected,
                        detail: `${instagramInsightsData?.readiness?.connectedAccountCount || 0} connected`,
                      },
                      {
                        label: 'Insights Toggle',
                        ok: !!instagramInsightsData?.readiness?.officialInsightsToggleEnabled,
                        detail: instagramInsightsData?.readiness?.officialInsightsToggleEnabled ? 'Enabled' : 'Enable in Attribution Center',
                      },
                      {
                        label: 'Published Posts',
                        ok: !!instagramInsightsData?.readiness?.hasPublishedRecords,
                        detail: instagramInsightsData?.readiness?.hasPublishedRecords ? 'Ready to fetch' : 'Need published records',
                      },
                      {
                        label: 'Official Fetch',
                        ok: ['ready', 'partial_ready'].includes(instagramInsightsData?.status),
                        detail: `${instagramInsightsData?.readiness?.readyAccountCount || 0} ready / ${instagramInsightsData?.readiness?.connectedAccountCount || 0}`,
                      },
                    ].map(item => (
                      <div key={item.label} className="rounded-lg p-3" style={{ backgroundColor: 'var(--adm-card)' }}>
                        <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--adm-text-secondary)' }}>{item.label}</p>
                        <p className="text-sm font-semibold mt-1" style={{ color: item.ok ? '#166534' : '#92400E' }}>{item.ok ? 'Ready' : 'Pending'}</p>
                        <p className="text-[11px] mt-1" style={{ color: 'var(--adm-text-secondary)' }}>{item.detail}</p>
                      </div>
                    ))}
                  </div>
                  {instagramAccountBoards.length > 0 && (
                    <div className="mt-3 rounded-lg p-3" style={{ backgroundColor: 'var(--adm-card)' }}>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {instagramAccountBoards.map(item => {
                          const isActive = selectedInstagramAccountBoard?.account.id === item.account.id
                          const meta = getInsightsStatusMeta(item.insights?.status)
                          return (
                            <button
                              key={item.account.id}
                              onClick={() => setSelectedInstagramPanelAccountId(item.account.id)}
                              className="px-3 py-1.5 text-xs rounded-full font-medium"
                              style={{
                                backgroundColor: isActive ? '#FCE7F3' : meta.backgroundColor,
                                color: isActive ? '#9D174D' : meta.color,
                              }}
                            >
                              {`@${item.account.username} · ${meta.label}`}
                            </button>
                          )
                        })}
                      </div>

                      {selectedInstagramAccountBoard ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--adm-input)' }}>
                            <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--adm-text-secondary)' }}>Focused Account</p>
                            <p className="text-sm font-semibold mt-1" style={{ color: 'var(--adm-text)' }}>
                              {`@${selectedInstagramAccountBoard.account.username} · ${selectedInstagramAccountBoard.account.staffName}`}
                            </p>
                            <p className="text-[11px] mt-1" style={{ color: 'var(--adm-text-secondary)' }}>
                              {selectedInstagramAccountBoard.insights?.message || 'Insights status pending'}
                            </p>
                          </div>
                          <div className="grid grid-cols-3 gap-3">
                            <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--adm-input)' }}>
                              <p className="text-[10px]" style={{ color: 'var(--adm-text-secondary)' }}>Posts</p>
                              <p className="text-sm font-semibold mt-1" style={{ color: 'var(--adm-text)' }}>{selectedInstagramAccountBoard.publishedRecords.length}</p>
                            </div>
                            <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--adm-input)' }}>
                              <p className="text-[10px]" style={{ color: 'var(--adm-text-secondary)' }}>Views</p>
                              <p className="text-sm font-semibold mt-1" style={{ color: 'var(--adm-text)' }}>
                                {selectedInstagramAccountBoard.insights?.officialSummary?.totals?.views || 0}
                              </p>
                            </div>
                            <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--adm-input)' }}>
                              <p className="text-[10px]" style={{ color: 'var(--adm-text-secondary)' }}>Reach</p>
                              <p className="text-sm font-semibold mt-1" style={{ color: 'var(--adm-text)' }}>
                                {selectedInstagramAccountBoard.insights?.officialSummary?.totals?.reach || 0}
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : null}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                        {instagramAccountBoards.map(item => {
                          const meta = getInsightsStatusMeta(item.insights?.status)
                          return (
                            <div key={item.account.id} className="rounded-lg p-4" style={{ backgroundColor: 'var(--adm-input)' }}>
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <p className="text-sm font-semibold" style={{ color: 'var(--adm-text)' }}>{`@${item.account.username}`}</p>
                                  <p className="text-[11px]" style={{ color: 'var(--adm-text-secondary)' }}>{item.account.staffName}</p>
                                </div>
                                <span className="text-[10px] px-2 py-1 rounded-full font-medium" style={{ backgroundColor: meta.backgroundColor, color: meta.color }}>
                                  {meta.label}
                                </span>
                              </div>
                              <div className="grid grid-cols-3 gap-2 mt-3">
                                <div className="rounded-lg p-3" style={{ backgroundColor: 'var(--adm-card)' }}>
                                  <p className="text-[10px]" style={{ color: 'var(--adm-text-secondary)' }}>Views</p>
                                  <p className="text-sm font-semibold mt-1" style={{ color: 'var(--adm-text)' }}>{item.insights?.officialSummary?.totals?.views || 0}</p>
                                </div>
                                <div className="rounded-lg p-3" style={{ backgroundColor: 'var(--adm-card)' }}>
                                  <p className="text-[10px]" style={{ color: 'var(--adm-text-secondary)' }}>Reach</p>
                                  <p className="text-sm font-semibold mt-1" style={{ color: 'var(--adm-text)' }}>{item.insights?.officialSummary?.totals?.reach || 0}</p>
                                </div>
                                <div className="rounded-lg p-3" style={{ backgroundColor: 'var(--adm-card)' }}>
                                  <p className="text-[10px]" style={{ color: 'var(--adm-text-secondary)' }}>Posts</p>
                                  <p className="text-sm font-semibold mt-1" style={{ color: 'var(--adm-text)' }}>{item.publishedRecords.length}</p>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                  {instagramInsightsData?.officialSummary?.supportedMetrics?.length ? (
                    <div className="mt-3 rounded-lg p-3" style={{ backgroundColor: 'var(--adm-card)' }}>
                      <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--adm-text-secondary)' }}>
                        Live Metric Diagnostics
                      </p>
                      <p className="text-[11px] mt-1" style={{ color: 'var(--adm-text-secondary)' }}>
                        {`Media Type: ${(instagramInsightsData.officialSummary.mediaProductTypes || []).join(', ') || 'Unknown'} · Supported: ${(instagramInsightsData.officialSummary.supportedMetrics || []).join(', ')}`}
                      </p>
                      {instagramInsightsData?.officialSummary?.unsupportedMetrics?.length ? (
                        <p className="text-[11px] mt-1" style={{ color: '#92400E' }}>
                          {`Fallback applied: ${instagramInsightsData.officialSummary.unsupportedMetrics
                            .map((item: any) => item.metric)
                            .filter((value: string, index: number, arr: string[]) => arr.indexOf(value) === index)
                            .join(', ')} not supported for current media product type.`}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                  {instagramInsightsData?.officialSummary?.totals && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                      <div className="rounded-lg p-3" style={{ backgroundColor: 'var(--adm-card)' }}>
                        <p className="text-[10px]" style={{ color: 'var(--adm-text-secondary)' }}>Views</p>
                        <p className="text-sm font-semibold" style={{ color: 'var(--adm-text)' }}>{instagramInsightsData.officialSummary.totals.views}</p>
                      </div>
                      <div className="rounded-lg p-3" style={{ backgroundColor: 'var(--adm-card)' }}>
                        <p className="text-[10px]" style={{ color: 'var(--adm-text-secondary)' }}>Reach</p>
                        <p className="text-sm font-semibold" style={{ color: 'var(--adm-text)' }}>{instagramInsightsData.officialSummary.totals.reach}</p>
                      </div>
                      <div className="rounded-lg p-3" style={{ backgroundColor: 'var(--adm-card)' }}>
                        <p className="text-[10px]" style={{ color: 'var(--adm-text-secondary)' }}>Saved</p>
                        <p className="text-sm font-semibold" style={{ color: 'var(--adm-text)' }}>{instagramInsightsData.officialSummary.totals.saved}</p>
                      </div>
                      <div className="rounded-lg p-3" style={{ backgroundColor: 'var(--adm-card)' }}>
                        <p className="text-[10px]" style={{ color: 'var(--adm-text-secondary)' }}>Interactions</p>
                        <p className="text-sm font-semibold" style={{ color: 'var(--adm-text)' }}>{instagramInsightsData.officialSummary.totals.totalInteractions}</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-4 rounded-xl p-4" style={{ backgroundColor: 'var(--adm-input)' }}>
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--adm-text-secondary)' }}>
                      Story / Bio / Product Funnel
                    </p>
                    <span className="text-[10px] px-2 py-1 rounded-full" style={{ backgroundColor: 'var(--adm-card)', color: 'var(--adm-text-secondary)' }}>
                      {`Official Reach ${instagramFunnelSummary.officialReach} · Views ${instagramFunnelSummary.officialViews}`}
                    </span>
                  </div>
                  <p className="text-sm" style={{ color: 'var(--adm-text)' }}>
                    {instagramFunnelSummary.directHomeVisits > 0
                      ? `当前还有 ${instagramFunnelSummary.directHomeVisits} 次 Instagram 归因流量直接落在首页，后续 Story / Bio / Product 三段会随着真实入口使用自动补齐。`
                      : '这里专门看 Story 入口、Bio 落地页、Product 详情页三段承接效率，并与官方 Reach / Views 联动观察。'}
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
                    {instagramFunnelSummary.stages.map((stage) => (
                      <div key={stage.id} className="rounded-lg p-3" style={{ backgroundColor: 'var(--adm-card)' }}>
                        <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--adm-text-secondary)' }}>{stage.label}</p>
                        <p className="text-2xl font-semibold mt-2" style={{ color: 'var(--adm-text)' }}>{stage.visits}</p>
                        <p className="text-[11px] mt-1" style={{ color: 'var(--adm-text-secondary)' }}>{stage.description}</p>
                        <div className="mt-3 h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--adm-input)' }}>
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.max(
                                stage.visits > 0
                                  ? Math.min(
                                      100,
                                      (stage.visits /
                                        Math.max(...instagramFunnelSummary.stages.map(item => item.visits), 1)) *
                                        100
                                    )
                                  : 6,
                                6
                              )}%`,
                              background: 'linear-gradient(90deg, #8B5CF6, #EC4899)',
                            }}
                          />
                        </div>
                        <div className="mt-3 flex items-center justify-between text-[11px]" style={{ color: 'var(--adm-text-secondary)' }}>
                          <span>{stage.nextLabel}</span>
                          <span style={{ color: 'var(--adm-text)' }}>{stage.nextRate.toFixed(1)}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 rounded-xl p-4" style={{ backgroundColor: 'var(--adm-input)' }}>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--adm-text-secondary)' }}>
                    Extension Backlog
                  </p>
                  <div className="space-y-2">
                    {EXTENSION_BACKLOG.map(item => (
                      <div key={item.id} className="rounded-lg p-3" style={{ backgroundColor: 'var(--adm-card)' }}>
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-medium" style={{ color: 'var(--adm-text)' }}>{item.title}</p>
                          <span
                            className="text-[10px] px-2 py-1 rounded-full font-medium"
                            style={{
                              backgroundColor: item.id === 'meta_insights' && systemSettings?.igInsightsEnabled ? '#DCFCE7' : '#F3F4F6',
                              color: item.id === 'meta_insights' && systemSettings?.igInsightsEnabled ? '#166534' : '#4B5563',
                            }}
                          >
                            {item.id === 'meta_insights' && systemSettings?.igInsightsEnabled ? 'Ready To Wire' : 'Pending'}
                          </span>
                        </div>
                        <p className="text-[11px] mt-1" style={{ color: 'var(--adm-text-secondary)' }}>{item.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold" style={{ color: 'var(--adm-text)' }}>Generated Content History</h3>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--adm-text-secondary)' }} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search history..."
                  className="pl-9 pr-3 py-2 text-sm rounded-lg"
                  style={{ backgroundColor: 'var(--adm-input)', border: '1px solid var(--adm-input-border)', color: 'var(--adm-text)' }}
                />
              </div>
            </div>
            {filteredHistory.length === 0 ? (
              <div className="text-center py-16">
                <History size={48} className="mx-auto mb-4 opacity-30" style={{ color: 'var(--adm-text-secondary)' }} />
                <p className="text-lg font-medium" style={{ color: 'var(--adm-text)' }}>No content yet</p>
                <p className="text-sm mt-2" style={{ color: 'var(--adm-text-secondary)' }}>Generated marketing content will appear here. Go to Studio to create some!</p>
                <button
                  onClick={() => setActiveTab('studio')}
                  className="mt-4 px-6 py-2.5 rounded-lg font-medium"
                  style={{ backgroundColor: 'var(--adm-accent)', color: 'var(--adm-accent-text)' }}
                >
                  Go to Studio
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredHistory.map((entry: MarketingEntry) => {
                  const pInfo = PLATFORMS.find(p => p.id === entry.platform)
                  return (
                    <div key={entry.id} className="rounded-2xl p-5" style={{ backgroundColor: 'var(--adm-card)', border: '1px solid var(--adm-border)' }}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          {pInfo && <pInfo.icon size={16} style={{ color: pInfo.color }} />}
                          <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--adm-input)', color: 'var(--adm-text-secondary)' }}>{pInfo?.name || entry.platform}</span>
                        </div>
                        <span className="text-xs" style={{ color: 'var(--adm-text-secondary)' }}>{new Date(entry.createdAt).toLocaleDateString()}</span>
                      </div>
                      <h4 className="font-semibold mb-2" style={{ color: 'var(--adm-text)' }}>{entry.title}</h4>
                      <p className="text-sm line-clamp-3 mb-3" style={{ color: 'var(--adm-text-secondary)' }}>{entry.content}</p>
                      {entry.productName && (
                        <p className="text-xs mb-2" style={{ color: 'var(--adm-accent)' }}>Product: {entry.productName}</p>
                      )}
                          {entry.mediaUrls && entry.mediaUrls.length > 0 && (
                            <div className="flex gap-2 mb-2 overflow-x-auto pb-1">
                              {entry.mediaUrls.slice(0, 3).map((u, i) => (
                                <div key={i} className="relative flex-shrink-0 group">
                                  {/\.(mp4|mov|webm)(\?|$)/i.test(u) ? (
                                    <>
                                      <video src={u} muted className="w-16 h-16 rounded-lg object-cover" style={{ backgroundColor: '#000' }} />
                                      <button
                                        onClick={() => { setGeneratedVideos(prev => [u, ...prev.filter(v => v !== u)]); setPublishImageUrl(u); setRightPanelTab('publish'); setActiveTab('studio') }}
                                        className="absolute inset-0 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                        style={{ backgroundColor: 'rgba(0,0,0,0.45)', color: '#fff' }}
                                        title="用于发布"
                                      >
                                        <Play size={14} />
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      <img src={u} alt="" className="w-16 h-16 rounded-lg object-cover" />
                                      <button
                                        onClick={() => { setEditorImage(u); setActiveTab('studio') }}
                                        className="absolute inset-0 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                        style={{ backgroundColor: 'rgba(0,0,0,0.45)', color: '#fff' }}
                                        title="打开营销图片编辑器二次处理"
                                      >
                                        <Wand2 size={14} />
                                      </button>
                                    </>
                                  )}
                                </div>
                              ))}
                        </div>
                      )}
                      <div className="flex gap-2">
                        <button
                          onClick={() => reopenHistoryEntry(entry)}
                          className="flex-1 py-1.5 text-xs rounded-lg flex items-center justify-center gap-1"
                          style={{ backgroundColor: 'var(--adm-accent)', color: 'var(--adm-accent-text)' }}
                        >
                          <Wand2 size={12} /> 二次编辑
                        </button>
                        <button
                          onClick={() => handleCopy(entry.content)}
                          className="flex-1 py-1.5 text-xs rounded-lg flex items-center justify-center gap-1"
                          style={{ backgroundColor: 'var(--adm-input)', color: 'var(--adm-text-secondary)' }}
                        >
                          <Copy size={12} /> Copy
                        </button>
                        <button
                          onClick={() => handleDeleteHistory(entry.id)}
                          className="px-3 py-1.5 text-xs rounded-lg"
                          style={{ backgroundColor: 'var(--adm-input)', color: '#EF4444' }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'ai-chat' && (
          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 h-[calc(100vh-200px)]">
            {/* 左侧：模式选择 + 附件 */}
            <div className="space-y-4 overflow-y-auto">
              <div className="rounded-2xl p-4" style={{ backgroundColor: 'var(--adm-card)', border: '1px solid var(--adm-border)' }}>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--adm-text)' }}>
                  <Bot size={16} style={{ color: 'var(--adm-accent)' }} /> AI Mode
                </h3>
                <div className="space-y-2">
                  {AI_MODES.map(mode => (
                    <button
                      key={mode.id}
                      onClick={() => setAiMode(mode.id)}
                      className="w-full p-3 rounded-xl border text-left transition-all"
                      style={{
                        backgroundColor: aiMode === mode.id ? 'var(--adm-accent-bg)' : 'var(--adm-input)',
                        borderColor: aiMode === mode.id ? 'var(--adm-accent)' : 'var(--adm-input-border)',
                        borderWidth: aiMode === mode.id ? '2px' : '1px',
                      }}
                    >
                      <div className="flex items-center gap-2 mb-0.5">
                        <mode.icon size={14} style={{ color: aiMode === mode.id ? 'var(--adm-accent)' : 'var(--adm-text-secondary)' }} />
                        <span className="text-sm font-medium" style={{ color: 'var(--adm-text)' }}>{mode.name}</span>
                      </div>
                      <p className="text-xs pl-5" style={{ color: 'var(--adm-text-secondary)' }}>{mode.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* 产品链接选择 */}
              <div className="rounded-2xl p-4" style={{ backgroundColor: 'var(--adm-card)', border: '1px solid var(--adm-border)' }}>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--adm-text)' }}>
                  <Package size={16} style={{ color: 'var(--adm-accent)' }} /> Product Link
                </h3>
                {aiAttachedProduct ? (
                  <div className="flex items-center gap-2 p-2 rounded-lg" style={{ backgroundColor: 'var(--adm-input)' }}>
                    {aiAttachedProduct.image && <img src={aiAttachedProduct.image} alt="" className="w-8 h-8 rounded object-cover" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate" style={{ color: 'var(--adm-text)' }}>{aiAttachedProduct.name || aiAttachedProduct.nameEn}</p>
                      <p className="text-xs" style={{ color: 'var(--adm-text-secondary)' }}>${aiAttachedProduct.price}</p>
                    </div>
                    <button onClick={() => setAiAttachedProduct(null)} className="p-1 rounded" style={{ color: 'var(--adm-text-secondary)' }}>
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowAiProductPicker(true)}
                    className="w-full py-2 text-xs rounded-lg border-2 border-dashed transition-colors"
                    style={{ borderColor: 'var(--adm-border)', color: 'var(--adm-text-secondary)' }}
                  >
                    + Attach a product
                  </button>
                )}
              </div>

              {/* 上传文件 */}
              <div className="rounded-2xl p-4" style={{ backgroundColor: 'var(--adm-card)', border: '1px solid var(--adm-border)' }}>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--adm-text)' }}>
                  <Paperclip size={16} style={{ color: 'var(--adm-accent)' }} /> Uploads
                </h3>
                {aiUploads.length > 0 && (
                  <div className="space-y-1 mb-2">
                    {aiUploads.map((upload, i) => (
                      <div key={i} className="flex items-center gap-2 p-2 rounded-lg" style={{ backgroundColor: 'var(--adm-input)' }}>
                        {upload.type.startsWith('image/') && <img src={upload.dataUrl} alt="" className="w-8 h-8 rounded object-cover" />}
                        {!upload.type.startsWith('image/') && <FileText size={16} style={{ color: 'var(--adm-text-secondary)' }} />}
                        <span className="text-xs flex-1 truncate" style={{ color: 'var(--adm-text)' }}>{upload.name}</span>
                        <button onClick={() => removeUpload(i)} className="p-0.5 rounded" style={{ color: '#EF4444' }}>
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <label className="w-full py-2 text-xs rounded-lg border-2 border-dashed cursor-pointer flex items-center justify-center gap-1 transition-colors" style={{ borderColor: 'var(--adm-border)', color: 'var(--adm-text-secondary)' }}>
                  <Paperclip size={14} /> Upload files (max 5MB)
                  <input type="file" multiple className="hidden" onChange={handleFileUpload} accept="image/*,.pdf,.txt,.doc,.docx" />
                </label>
              </div>

              {/* 清空对话 */}
              {aiMessages.length > 0 && (
                <button
                  onClick={() => { setAiMessages([]); setAiUploads([]); setAiAttachedProduct(null) }}
                  className="w-full py-2 text-xs rounded-lg"
                  style={{ backgroundColor: 'var(--adm-input)', color: '#EF4444' }}
                >
                  Clear Conversation
                </button>
              )}
            </div>

            {/* 右侧：聊天界面 */}
            <div className="rounded-2xl flex flex-col overflow-hidden" style={{ backgroundColor: 'var(--adm-card)', border: '1px solid var(--adm-border)' }}>
              {/* 头部 */}
              <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--adm-border)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--adm-accent-bg)' }}>
                    <Bot size={20} style={{ color: 'var(--adm-accent)' }} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm" style={{ color: 'var(--adm-text)' }}>Marketing AI Assistant</h3>
                    <p className="text-xs" style={{ color: 'var(--adm-text-secondary)' }}>{AI_MODES.find(m => m.id === aiMode)?.name} mode</p>
                  </div>
                </div>
              </div>

              {/* 消息列表 */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {aiMessages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ backgroundColor: 'var(--adm-accent-bg)' }}>
                      <Bot size={32} style={{ color: 'var(--adm-accent)' }} />
                    </div>
                    <p className="text-sm font-medium mb-1" style={{ color: 'var(--adm-text)' }}>AI Marketing Assistant</p>
                    <p className="text-xs max-w-xs" style={{ color: 'var(--adm-text-secondary)' }}>
                      Select a mode, attach a product or file, then ask me to write copy, design ads, or brainstorm campaign ideas.
                    </p>
                    <div className="mt-6 grid grid-cols-2 gap-2 w-full max-w-md">
                      {['Write a product tagline', 'Design a Facebook ad', 'Create an email subject line', 'Brainstorm TikTok ideas'].map(s => (
                        <button
                          key={s}
                          onClick={() => setAiInput(s)}
                          className="px-3 py-2 text-xs rounded-lg border text-left transition-colors adm-hover-bg"
                          style={{ borderColor: 'var(--adm-border)', color: 'var(--adm-text-secondary)' }}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {aiMessages.map((msg, i) => (
                  <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: msg.role === 'user' ? 'var(--adm-accent)' : 'var(--adm-accent-bg)' }}>
                      {msg.role === 'user' ? <User size={16} style={{ color: 'var(--adm-accent-text)' }} /> : <Bot size={16} style={{ color: 'var(--adm-accent)' }} />}
                    </div>
                    <div className={`max-w-[75%] rounded-2xl p-3 ${msg.role === 'user' ? 'rounded-tr-sm' : 'rounded-tl-sm'}`} style={{ backgroundColor: msg.role === 'user' ? 'var(--adm-accent)' : 'var(--adm-input)', color: msg.role === 'user' ? 'var(--adm-accent-text)' : 'var(--adm-text)' }}>
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                      {msg.role === 'assistant' && msg.images && msg.images.length > 0 && (
                        <div className="mt-2 grid grid-cols-2 gap-2">
                          {msg.images.map((imgUrl, imgIdx) => (
                            <div key={imgIdx} className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--adm-border)', backgroundColor: 'var(--adm-card)' }}>
                              <img src={imgUrl} alt="" className="w-full aspect-square object-cover" />
                              <div className="p-2 flex gap-1.5">
                                <button
                                  onClick={() => setEditorImage(imgUrl)}
                                  className="flex-1 text-[11px] px-2 py-1 rounded-lg font-medium"
                                  style={{ backgroundColor: 'var(--adm-accent)', color: 'var(--adm-accent-text)', border: 'none', cursor: 'pointer' }}
                                >
                                  编辑
                                </button>
                                <button
                                  onClick={() => {
                                    setPublishImageUrl(imgUrl)
                                    setRightPanelTab('publish')
                                  }}
                                  className="flex-1 text-[11px] px-2 py-1 rounded-lg font-medium"
                                  style={{ backgroundColor: 'var(--adm-card)', color: 'var(--adm-accent)', border: '1px solid var(--adm-border)', cursor: 'pointer' }}
                                >
                                  发布
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      {msg.role === 'assistant' && (
                        <div className="mt-2 flex gap-2">
                          <button onClick={() => handleCopy(msg.content)} className="text-xs flex items-center gap-1 opacity-60 hover:opacity-100" style={{ color: 'var(--adm-text-secondary)' }}>
                            <Copy size={12} /> Copy
                          </button>
                          <button onClick={() => setAiInput(msg.content)} className="text-xs flex items-center gap-1 opacity-60 hover:opacity-100" style={{ color: 'var(--adm-text-secondary)' }}>
                            <RefreshCw size={12} /> Edit
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {aiSending && (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--adm-accent-bg)' }}>
                      <Bot size={16} style={{ color: 'var(--adm-accent)' }} />
                    </div>
                    <div className="rounded-2xl rounded-tl-sm p-3 flex items-center gap-2" style={{ backgroundColor: 'var(--adm-input)' }}>
                      <Loader2 size={14} className="animate-spin" style={{ color: 'var(--adm-accent)' }} />
                      <span className="text-sm" style={{ color: 'var(--adm-text-secondary)' }}>Thinking...</span>
                    </div>
                  </div>
                )}
              </div>

              {/* 输入框 */}
              <div className="p-4 border-t" style={{ borderColor: 'var(--adm-border)' }}>
                <div className="flex items-center gap-2">
                  <label className="p-2.5 rounded-xl cursor-pointer transition-colors adm-hover-bg" style={{ color: 'var(--adm-text-secondary)' }} title="Upload files">
                    <Paperclip size={18} />
                    <input type="file" multiple className="hidden" onChange={handleFileUpload} accept="image/*,.pdf,.txt,.doc,.docx" />
                  </label>
                  <input
                    type="text"
                    value={aiInput}
                    onChange={e => setAiInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAiSend() } }}
                    placeholder={`Ask AI in ${AI_MODES.find(m => m.id === aiMode)?.name} mode...`}
                    className="flex-1 px-4 py-2.5 text-sm rounded-xl"
                    style={{ backgroundColor: 'var(--adm-input)', border: '1px solid var(--adm-input-border)', color: 'var(--adm-text)' }}
                  />
                  <button
                    onClick={handleAiSend}
                    disabled={!aiInput.trim() || aiSending}
                    className="p-2.5 rounded-xl font-medium transition-all disabled:opacity-50"
                    style={{ backgroundColor: 'var(--adm-accent)', color: 'var(--adm-accent-text)' }}
                  >
                    {aiSending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedSocialContent && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="rounded-2xl w-full max-w-5xl max-h-[85vh] overflow-hidden flex flex-col" style={{ backgroundColor: 'var(--adm-card)', border: '1px solid var(--adm-border)' }}>
              <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'var(--adm-border)' }}>
                <div>
                  <h3 className="text-lg font-semibold" style={{ color: 'var(--adm-text)' }}>Publish Record Details</h3>
                  <p className="text-sm" style={{ color: 'var(--adm-text-secondary)' }}>
                    查看单条发布记录的素材、链接、归因和后续动作。
                  </p>
                </div>
                <button onClick={() => setSelectedSocialContentId(null)} className="p-1 rounded-lg">
                  <X size={20} style={{ color: 'var(--adm-text-secondary)' }} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5">
                {(() => {
                  const statusMeta = getPublishStatusMeta(selectedSocialContent.status)
                  const linkedMetrics = getLinkedReferralMetrics(selectedSocialContent)
                  const recordFunnelMetrics = getRecordFunnelMetrics(selectedSocialContent)
                  const recordOfficialMetrics = getRecordOfficialMetrics(selectedSocialContent)
                  const bioLandingUrl = getBioLandingUrl(selectedSocialContent)
                  const productTrackingUrl = getProductTrackingUrl(selectedSocialContent)
                  return (
                    <div className="grid grid-cols-1 xl:grid-cols-[1.15fr_0.85fr] gap-6">
                      <div className="space-y-4">
                        <div className="rounded-2xl p-5" style={{ backgroundColor: 'var(--adm-input)' }}>
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                              <p className="text-lg font-semibold" style={{ color: 'var(--adm-text)' }}>
                                {selectedSocialContent.contentTitle}
                              </p>
                              <p className="text-sm mt-1" style={{ color: 'var(--adm-text-secondary)' }}>
                                {selectedSocialContent.platformName} · @{selectedSocialContent.platformUsername || selectedSocialContent.staffName}
                              </p>
                            </div>
                            <span
                              className="text-xs px-3 py-1.5 rounded-full font-semibold"
                              style={{ backgroundColor: statusMeta.backgroundColor, color: statusMeta.color }}
                            >
                              {statusMeta.label}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                            <div className="p-3 rounded-xl" style={{ backgroundColor: 'var(--adm-card)' }}>
                              <p className="text-[11px]" style={{ color: 'var(--adm-text-secondary)' }}>Publish Mode</p>
                              <p className="text-sm font-medium mt-1" style={{ color: 'var(--adm-text)' }}>{selectedSocialContent.publishMode}</p>
                            </div>
                            <div className="p-3 rounded-xl" style={{ backgroundColor: 'var(--adm-card)' }}>
                              <p className="text-[11px]" style={{ color: 'var(--adm-text-secondary)' }}>Published At</p>
                              <p className="text-sm font-medium mt-1" style={{ color: 'var(--adm-text)' }}>
                                {new Date(selectedSocialContent.publishedAt || selectedSocialContent.createdAt).toLocaleString()}
                              </p>
                            </div>
                            <div className="p-3 rounded-xl" style={{ backgroundColor: 'var(--adm-card)' }}>
                              <p className="text-[11px]" style={{ color: 'var(--adm-text-secondary)' }}>Tracking Code</p>
                              <p className="text-sm font-medium mt-1" style={{ color: 'var(--adm-text)' }}>
                                {selectedSocialContent.referralCode || 'Not linked'}
                              </p>
                            </div>
                            <div className="p-3 rounded-xl" style={{ backgroundColor: 'var(--adm-card)' }}>
                              <p className="text-[11px]" style={{ color: 'var(--adm-text-secondary)' }}>Product</p>
                              <p className="text-sm font-medium mt-1" style={{ color: 'var(--adm-text)' }}>
                                {selectedSocialContent.productName || 'General content'}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="rounded-2xl p-5" style={{ backgroundColor: 'var(--adm-input)' }}>
                          <div className="flex items-center justify-between gap-3 mb-3">
                            <p className="text-sm font-semibold" style={{ color: 'var(--adm-text)' }}>Caption & Hashtags</p>
                            <button
                              onClick={() => copyToClipboard(selectedSocialContent.contentBody)}
                              className="px-3 py-1.5 text-xs rounded-lg font-medium"
                              style={{ backgroundColor: 'var(--adm-card)', color: 'var(--adm-text)' }}
                            >
                              Copy Caption
                            </button>
                          </div>
                          <div className="rounded-xl p-4 whitespace-pre-wrap text-sm leading-relaxed" style={{ backgroundColor: 'var(--adm-card)', color: 'var(--adm-text)' }}>
                            {selectedSocialContent.contentBody}
                          </div>
                          {selectedSocialContent.hashtags && (
                            <div className="mt-3">
                              <p className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--adm-text-secondary)' }}>
                                Hashtags
                              </p>
                              <div className="rounded-xl p-3 text-sm" style={{ backgroundColor: 'var(--adm-card)', color: 'var(--adm-text)' }}>
                                {selectedSocialContent.hashtags}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="rounded-2xl p-5" style={{ backgroundColor: 'var(--adm-input)' }}>
                          <p className="text-sm font-semibold mb-3" style={{ color: 'var(--adm-text)' }}>Tracking & Landing Page</p>
                          <div className="rounded-xl p-3" style={{ backgroundColor: 'var(--adm-card)' }}>
                            <p className="text-[11px] mb-2" style={{ color: 'var(--adm-text-secondary)' }}>Bio Landing Page</p>
                            <code className="block text-xs break-all" style={{ color: 'var(--adm-text)' }}>
                              {bioLandingUrl || 'Not linked'}
                            </code>
                          </div>
                          <div className="rounded-xl p-3 mt-3" style={{ backgroundColor: 'var(--adm-card)' }}>
                            <p className="text-[11px] mb-2" style={{ color: 'var(--adm-text-secondary)' }}>Raw Tracking Link</p>
                            <code className="block text-xs break-all" style={{ color: 'var(--adm-text)' }}>
                              {selectedSocialContent.referralUrl || 'Not linked'}
                            </code>
                          </div>
                          {productTrackingUrl && (
                            <div className="rounded-xl p-3 mt-3" style={{ backgroundColor: 'var(--adm-card)' }}>
                              <p className="text-[11px] mb-2" style={{ color: 'var(--adm-text-secondary)' }}>Product Deep Link</p>
                              <code className="block text-xs break-all" style={{ color: 'var(--adm-text)' }}>
                                {productTrackingUrl}
                              </code>
                            </div>
                          )}
                          <div className="flex flex-wrap gap-2 mt-3">
                            <button
                              onClick={() => copyToClipboard(bioLandingUrl)}
                              className="px-3 py-2 text-xs rounded-lg font-medium"
                              style={{ backgroundColor: 'var(--adm-card)', color: 'var(--adm-text)' }}
                            >
                              Copy Bio Link
                            </button>
                            {selectedSocialContent.status !== 'published' && (
                              <button
                                onClick={() => reopenSocialContentRecord(selectedSocialContent)}
                                className="px-3 py-2 text-xs rounded-lg font-medium inline-flex items-center gap-1"
                                style={{ backgroundColor: 'var(--adm-accent)', color: 'var(--adm-accent-text)' }}
                              >
                                <Share2 size={12} /> Continue & Publish
                              </button>
                            )}
                            <button
                              onClick={() => openTrackingPreview(bioLandingUrl)}
                              className="px-3 py-2 text-xs rounded-lg font-medium"
                              style={{ backgroundColor: 'var(--adm-accent)', color: 'var(--adm-accent-text)' }}
                            >
                              Preview Landing Page
                            </button>
                            {productTrackingUrl && (
                              <button
                                onClick={() => openTrackingPreview(productTrackingUrl)}
                                className="px-3 py-2 text-xs rounded-lg font-medium"
                                style={{ backgroundColor: 'var(--adm-card)', color: 'var(--adm-text)' }}
                              >
                                Open Product Detail
                              </button>
                            )}
                            {selectedSocialContent.platformPostUrl && (
                              <a
                                href={selectedSocialContent.platformPostUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-2 text-xs rounded-lg font-medium inline-flex items-center gap-1"
                                style={{ backgroundColor: 'var(--adm-card)', color: 'var(--adm-text)' }}
                              >
                                <ExternalLink size={12} /> Open Post
                              </a>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        {selectedSocialContent.mediaUrl && (
                          <div className="rounded-2xl p-5" style={{ backgroundColor: 'var(--adm-input)' }}>
                            <p className="text-sm font-semibold mb-3" style={{ color: 'var(--adm-text)' }}>Media Asset</p>
                            <img
                              src={selectedSocialContent.mediaUrl}
                              alt=""
                              className="w-full aspect-square object-cover rounded-2xl"
                              style={{ border: '1px solid var(--adm-border)' }}
                            />
                          </div>
                        )}

                        <div className="rounded-2xl p-5" style={{ backgroundColor: 'var(--adm-input)' }}>
                          <div className="flex items-center justify-between gap-3 mb-3">
                            <p className="text-sm font-semibold" style={{ color: 'var(--adm-text)' }}>Official Meta Metrics</p>
                            <span className="text-[10px] px-2 py-1 rounded-full" style={{ backgroundColor: 'var(--adm-card)', color: 'var(--adm-text-secondary)' }}>
                              {recordOfficialMetrics?.mediaProductType || 'Not fetched'}
                            </span>
                          </div>
                          {recordOfficialMetrics ? (
                            <>
                              <div className="grid grid-cols-2 gap-3">
                                <div className="p-4 rounded-xl text-center" style={{ backgroundColor: 'var(--adm-card)' }}>
                                  <p className="text-xl font-bold" style={{ color: 'var(--adm-text)' }}>{recordOfficialMetrics.views || 0}</p>
                                  <p className="text-[11px]" style={{ color: 'var(--adm-text-secondary)' }}>Views</p>
                                </div>
                                <div className="p-4 rounded-xl text-center" style={{ backgroundColor: 'var(--adm-card)' }}>
                                  <p className="text-xl font-bold" style={{ color: 'var(--adm-text)' }}>{recordOfficialMetrics.reach || 0}</p>
                                  <p className="text-[11px]" style={{ color: 'var(--adm-text-secondary)' }}>Reach</p>
                                </div>
                                <div className="p-4 rounded-xl text-center" style={{ backgroundColor: 'var(--adm-card)' }}>
                                  <p className="text-xl font-bold" style={{ color: 'var(--adm-text)' }}>{recordOfficialMetrics.saved || 0}</p>
                                  <p className="text-[11px]" style={{ color: 'var(--adm-text-secondary)' }}>Saved</p>
                                </div>
                                <div className="p-4 rounded-xl text-center" style={{ backgroundColor: 'var(--adm-card)' }}>
                                  <p className="text-xl font-bold" style={{ color: 'var(--adm-text)' }}>{recordOfficialMetrics.totalInteractions || 0}</p>
                                  <p className="text-[11px]" style={{ color: 'var(--adm-text-secondary)' }}>Interactions</p>
                                </div>
                              </div>
                              <p className="text-[11px] mt-3" style={{ color: 'var(--adm-text-secondary)' }}>
                                {`Supported: ${(recordOfficialMetrics.supportedMetrics || []).join(', ') || 'None'}`}
                              </p>
                            </>
                          ) : (
                            <p className="text-sm" style={{ color: 'var(--adm-text-secondary)' }}>
                              该帖子还没有官方 metrics 缓存，请在 Insights 区块点击 Refresh 后再查看单帖指标。
                            </p>
                          )}
                        </div>

                        <div className="rounded-2xl p-5" style={{ backgroundColor: 'var(--adm-input)' }}>
                          <p className="text-sm font-semibold mb-3" style={{ color: 'var(--adm-text)' }}>Attribution Snapshot</p>
                          <div className="grid grid-cols-3 gap-3">
                            <div className="p-4 rounded-xl text-center" style={{ backgroundColor: 'var(--adm-card)' }}>
                              <p className="text-xl font-bold" style={{ color: 'var(--adm-text)' }}>{linkedMetrics?.clicks || 0}</p>
                              <p className="text-[11px]" style={{ color: 'var(--adm-text-secondary)' }}>Clicks</p>
                            </div>
                            <div className="p-4 rounded-xl text-center" style={{ backgroundColor: 'var(--adm-card)' }}>
                              <p className="text-xl font-bold" style={{ color: 'var(--adm-text)' }}>{linkedMetrics?.conversions || 0}</p>
                              <p className="text-[11px]" style={{ color: 'var(--adm-text-secondary)' }}>Conversions</p>
                            </div>
                            <div className="p-4 rounded-xl text-center" style={{ backgroundColor: 'var(--adm-card)' }}>
                              <p className="text-xl font-bold" style={{ color: 'var(--adm-text)' }}>${linkedMetrics?.revenue || 0}</p>
                              <p className="text-[11px]" style={{ color: 'var(--adm-text-secondary)' }}>Revenue</p>
                            </div>
                          </div>
                        </div>

                        <div className="rounded-2xl p-5" style={{ backgroundColor: 'var(--adm-input)' }}>
                          <div className="flex items-center justify-between gap-3 mb-3">
                            <p className="text-sm font-semibold" style={{ color: 'var(--adm-text)' }}>Post-level Funnel</p>
                            <span className="text-[10px] px-2 py-1 rounded-full" style={{ backgroundColor: 'var(--adm-card)', color: 'var(--adm-text-secondary)' }}>
                              {`Touchpoints ${recordFunnelMetrics?.totalTouchpoints || 0}`}
                            </span>
                          </div>
                          {recordFunnelMetrics ? (
                            <div className="grid grid-cols-1 gap-3">
                              {recordFunnelMetrics.stages.map((stage: any) => (
                                <div key={stage.id} className="rounded-xl p-4" style={{ backgroundColor: 'var(--adm-card)' }}>
                                  <div className="flex items-center justify-between gap-3">
                                    <p className="text-[11px] uppercase tracking-wider" style={{ color: 'var(--adm-text-secondary)' }}>{stage.label}</p>
                                    <p className="text-sm font-semibold" style={{ color: 'var(--adm-text)' }}>{stage.value}</p>
                                  </div>
                                  <div className="mt-3 h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--adm-input)' }}>
                                    <div
                                      className="h-full rounded-full"
                                      style={{
                                        width: `${Math.max(
                                          stage.value > 0
                                            ? Math.min(
                                                100,
                                                (stage.value /
                                                  Math.max(...recordFunnelMetrics.stages.map((item: any) => item.value), 1)) *
                                                  100
                                              )
                                            : 6,
                                          6
                                        )}%`,
                                        background: 'linear-gradient(90deg, #8B5CF6, #EC4899)',
                                      }}
                                    />
                                  </div>
                                  <div className="mt-3 flex items-center justify-between text-[11px]" style={{ color: 'var(--adm-text-secondary)' }}>
                                    <span>{stage.nextLabel}</span>
                                    <span style={{ color: 'var(--adm-text)' }}>{stage.nextRate.toFixed(1)}%</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm" style={{ color: 'var(--adm-text-secondary)' }}>
                              这条内容还没有绑定 referral link，暂时无法生成 Story / Bio / Product 漏斗。
                            </p>
                          )}
                        </div>

                        <div className="rounded-2xl p-5" style={{ backgroundColor: 'var(--adm-input)' }}>
                          <p className="text-sm font-semibold mb-3" style={{ color: 'var(--adm-text)' }}>Operational Checklist</p>
                          <div className="space-y-2 text-sm">
                            <div className="flex items-start gap-2">
                              <Check size={14} className="mt-0.5" style={{ color: selectedSocialContent.platformPostUrl ? '#22C55E' : '#9CA3AF' }} />
                              <p style={{ color: 'var(--adm-text)' }}>帖子发布结果已写入系统记录</p>
                            </div>
                            <div className="flex items-start gap-2">
                              <Check size={14} className="mt-0.5" style={{ color: selectedSocialContent.referralUrl ? '#22C55E' : '#9CA3AF' }} />
                              <p style={{ color: 'var(--adm-text)' }}>Tracking link 已生成，可用于 Bio 或 Story Link</p>
                            </div>
                            <div className="flex items-start gap-2">
                              <Check size={14} className="mt-0.5" style={{ color: '#F59E0B' }} />
                              <p style={{ color: 'var(--adm-text)' }}>建议把该链接放入 Link in Bio 页面，提升自然流量转化承接</p>
                            </div>
                            <div className="flex items-start gap-2">
                              <Check size={14} className="mt-0.5" style={{ color: instagramHealth?.checks?.manageCommentsEnabled ? '#22C55E' : '#F59E0B' }} />
                              <p style={{ color: 'var(--adm-text)' }}>
                                {instagramHealth?.checks?.manageCommentsEnabled
                                  ? '评论权限已具备，可继续开发评论互动模块'
                                  : '评论权限暂未打开，后续如要接评论运营需你在开发者平台补权限'}
                              </p>
                            </div>
                          </div>
                        </div>

                        {(selectedSocialContent.note || selectedSocialContent.errorMessage) && (
                          <div className="rounded-2xl p-5" style={{ backgroundColor: 'var(--adm-input)' }}>
                            <p className="text-sm font-semibold mb-2" style={{ color: 'var(--adm-text)' }}>System Note</p>
                            <p className="text-sm" style={{ color: selectedSocialContent.errorMessage ? '#B91C1C' : 'var(--adm-text-secondary)' }}>
                              {selectedSocialContent.errorMessage || selectedSocialContent.note}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })()}
              </div>
            </div>
          </div>
        )}

        {/* AI 聊天产品选择器 */}
        {showAiProductPicker && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="rounded-2xl w-full max-w-md max-h-[70vh] flex flex-col" style={{ backgroundColor: 'var(--adm-card)', border: '1px solid var(--adm-border)' }}>
              <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'var(--adm-border)' }}>
                <h3 className="text-lg font-semibold" style={{ color: 'var(--adm-text)' }}>Select Product</h3>
                <button onClick={() => { setShowAiProductPicker(false); setAiProductSearch('') }} className="p-1 rounded-lg">
                  <X size={20} style={{ color: 'var(--adm-text-secondary)' }} />
                </button>
              </div>
              <div className="p-4 border-b" style={{ borderColor: 'var(--adm-border)' }}>
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--adm-text-secondary)' }} />
                  <input
                    type="text"
                    value={aiProductSearch}
                    onChange={e => setAiProductSearch(e.target.value)}
                    placeholder="Search products..."
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-lg"
                    style={{ backgroundColor: 'var(--adm-input)', border: '1px solid var(--adm-input-border)', color: 'var(--adm-text)' }}
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-3">
                {aiFilteredProducts.map((product: any) => (
                  <div
                    key={product.id}
                    onClick={() => { setAiAttachedProduct(product); setShowAiProductPicker(false); setAiProductSearch('') }}
                    className="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors adm-hover-bg"
                  >
                    {product.image && <img src={product.image} alt="" className="w-10 h-10 rounded object-cover" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--adm-text)' }}>{product.name || product.nameEn}</p>
                      <p className="text-xs" style={{ color: 'var(--adm-text-secondary)' }}>${product.price}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {showCreateReferral && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="rounded-2xl w-full max-w-md" style={{ backgroundColor: 'var(--adm-card)', border: '1px solid var(--adm-border)' }}>
              <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'var(--adm-border)' }}>
                <h3 className="text-lg font-semibold" style={{ color: 'var(--adm-text)' }}>Create Referral Link</h3>
                <button onClick={() => setShowCreateReferral(false)} className="p-1 rounded-lg hover:bg-gray-100">
                  <X size={20} style={{ color: 'var(--adm-text-secondary)' }} />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--adm-text)' }}>Select Staff Member</label>
                  <select
                    className="w-full px-3 py-2 text-sm rounded-lg"
                    style={{ backgroundColor: 'var(--adm-input)', border: '1px solid var(--adm-border)', color: 'var(--adm-text)' }}
                    value={createReferralStaffId}
                    onChange={(e) => setCreateReferralStaffId(e.target.value)}
                  >
                    <option value="">Select staff member...</option>
                    {allStaffMembers.map(staff => (
                      <option key={staff.id} value={staff.id}>{staff.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--adm-text)' }}>Select Platform</label>
                  <select
                    className="w-full px-3 py-2 text-sm rounded-lg"
                    style={{ backgroundColor: 'var(--adm-input)', border: '1px solid var(--adm-border)', color: 'var(--adm-text)' }}
                    value={createReferralPlatform}
                    onChange={(e) => setCreateReferralPlatform(e.target.value)}
                  >
                    <option value="">Select platform...</option>
                    {PLATFORMS.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 p-5 border-t" style={{ borderColor: 'var(--adm-border)' }}>
                <button
                  onClick={() => setShowCreateReferral(false)}
                  className="px-4 py-2 text-sm rounded-lg"
                  style={{ backgroundColor: 'var(--adm-input)', color: 'var(--adm-text)' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateReferral}
                  className="px-4 py-2 text-sm rounded-lg font-medium"
                  style={{ backgroundColor: 'var(--adm-accent)', color: 'var(--adm-accent-text)' }}
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        )}

        {showConnectSocial && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="rounded-2xl w-full max-w-md" style={{ backgroundColor: 'var(--adm-card)', border: '1px solid var(--adm-border)' }}>
              <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'var(--adm-border)' }}>
                <h3 className="text-lg font-semibold" style={{ color: 'var(--adm-text)' }}>Connect Social Account</h3>
                <button onClick={() => setShowConnectSocial(false)} className="p-1 rounded-lg hover:bg-gray-100">
                  <X size={20} style={{ color: 'var(--adm-text-secondary)' }} />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--adm-text)' }}>Select Staff Member</label>
                  <select
                    className="w-full px-3 py-2 text-sm rounded-lg"
                    style={{ backgroundColor: 'var(--adm-input)', border: '1px solid var(--adm-border)', color: 'var(--adm-text)' }}
                    value={connectStaffId}
                    onChange={(e) => setConnectStaffId(e.target.value)}
                  >
                    <option value="">Select staff member...</option>
                    {allStaffMembers.map(staff => (
                      <option key={staff.id} value={staff.id}>{staff.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--adm-text)' }}>Select Platform</label>
                  <select
                    className="w-full px-3 py-2 text-sm rounded-lg"
                    style={{ backgroundColor: 'var(--adm-input)', border: '1px solid var(--adm-border)', color: 'var(--adm-text)' }}
                    value={connectPlatform}
                    onChange={(e) => setConnectPlatform(e.target.value)}
                  >
                    <option value="">Select platform...</option>
                    {PLATFORMS.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                {connectPlatform === 'twitter' ? (
                  <div className="space-y-3">
                    <div className="p-3 rounded-xl" style={{ backgroundColor: '#E0F2FE', border: '1px solid #7DD3FC' }}>
                      <div className="flex items-center gap-2 mb-2">
                        <Twitter size={18} style={{ color: '#1DA1F2' }} />
                        <span className="text-sm font-semibold" style={{ color: '#0C4A6E' }}>X (Twitter) OAuth Login</span>
                      </div>
                      <p className="text-xs" style={{ color: '#0369A1' }}>
                        Click the button below to connect your X account securely via OAuth. You will be redirected to X to authorize this app.
                      </p>
                    </div>
                    {!connectStaffId && (
                      <p className="text-xs" style={{ color: 'var(--adm-text-secondary)' }}>
                        ⚠️ Please select a staff member first
                      </p>
                    )}
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--adm-text)' }}>Username</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 text-sm rounded-lg"
                      style={{ backgroundColor: 'var(--adm-input)', border: '1px solid var(--adm-border)', color: 'var(--adm-text)' }}
                      placeholder="Enter your username"
                      value={connectUsername}
                      onChange={(e) => setConnectUsername(e.target.value)}
                    />
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-3 p-5 border-t" style={{ borderColor: 'var(--adm-border)' }}>
                <button
                  onClick={() => setShowConnectSocial(false)}
                  className="px-4 py-2 text-sm rounded-lg"
                  style={{ backgroundColor: 'var(--adm-input)', color: 'var(--adm-text)' }}
                >
                  Cancel
                </button>
                {connectPlatform === 'twitter' ? (
                  <button
                    onClick={() => connectStaffId && handleConnectX(connectStaffId)}
                    disabled={!connectStaffId || xAuthLoading}
                    className="px-4 py-2 text-sm rounded-lg font-medium flex items-center gap-2 disabled:opacity-50"
                    style={{ backgroundColor: '#1DA1F2', color: 'white' }}
                  >
                    {xAuthLoading ? (
                      <><Loader2 size={16} className="animate-spin" /> Connecting...</>
                    ) : (
                      <><Twitter size={16} /> Connect with X</>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={handleConnectSocial}
                    className="px-4 py-2 text-sm rounded-lg font-medium"
                    style={{ backgroundColor: 'var(--adm-accent)', color: 'var(--adm-accent-text)' }}
                  >
                    Connect
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 推送至社交账户模态框 */}
        {showPushModal && generatedContent && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowPushModal(false)}>
            <div className="w-full max-w-lg rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--adm-card)' }} onClick={e => e.stopPropagation()}>
              <div className="p-5 border-b flex items-center justify-between" style={{ borderColor: 'var(--adm-border)' }}>
                <div className="flex items-center gap-2">
                  <Send size={20} style={{ color: 'var(--adm-accent)' }} />
                  <h3 className="font-semibold" style={{ color: 'var(--adm-text)' }}>Push to Social Account</h3>
                </div>
                <button onClick={() => setShowPushModal(false)} className="p-1 rounded-lg" style={{ color: 'var(--adm-text-secondary)' }}>
                  <X size={20} />
                </button>
              </div>

              <div className="p-5 max-h-[60vh] overflow-y-auto">
                {/* 内容预览 */}
                <div className="mb-4 p-3 rounded-lg" style={{ backgroundColor: 'var(--adm-input)' }}>
                  <p className="text-xs font-semibold mb-1" style={{ color: 'var(--adm-text-secondary)' }}>Content Preview</p>
                  <p className="text-sm font-bold mb-1" style={{ color: 'var(--adm-text)' }}>{generatedContent.title}</p>
                  <p className="text-xs line-clamp-3" style={{ color: 'var(--adm-text-secondary)' }}>{generatedContent.content}</p>
                  {generatedContent.hashtags && generatedContent.hashtags.length > 0 && (
                    <p className="text-xs mt-1" style={{ color: 'var(--adm-accent)' }}>
                      {generatedContent.hashtags.slice(0, 5).map(t => `#${t}`).join(' ')}
                    </p>
                  )}
                </div>

                {/* 选择目标账户 */}
                <p className="text-sm font-medium mb-3" style={{ color: 'var(--adm-text)' }}>Select target account:</p>
                <div className="space-y-2">
                  {currentUserAccounts.map(account => {
                    const pInfo = PLATFORMS.find(p => p.id === account.platform)
                    if (!pInfo) return null
                    const isSelected = pushTargetId === account.id
                    return (
                      <button
                        key={account.id}
                        onClick={() => setPushTargetId(account.id)}
                        className="w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left"
                        style={{
                          backgroundColor: isSelected ? pInfo.bgColor : 'var(--adm-input)',
                          borderColor: isSelected ? pInfo.color : 'var(--adm-border)',
                        }}
                      >
                        <div className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0" style={{ border: `2px solid ${pInfo.color}`, backgroundColor: 'var(--adm-card)' }}>
                          {account.avatar ? (
                            <img src={account.avatar} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-sm font-bold text-white" style={{ backgroundColor: pInfo.color }}>
                              {(account.username || account.staffName || '?')[0].toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate" style={{ color: 'var(--adm-text)' }}>{account.staffName}</p>
                          <div className="flex items-center gap-1.5">
                            <div className="w-4 h-4 rounded flex items-center justify-center" style={{ backgroundColor: 'white' }}>
                              <pInfo.icon size={10} style={{ color: pInfo.color }} />
                            </div>
                            <span className="text-xs" style={{ color: 'var(--adm-text-secondary)' }}>@{account.username} · {pInfo.name}</span>
                          </div>
                        </div>
                        {isSelected && <Check size={20} style={{ color: pInfo.color }} />}
                      </button>
                    )
                  })}
                  {currentUserAccounts.length === 0 && (
                    <div className="text-center py-6">
                      <p className="text-sm" style={{ color: 'var(--adm-text-secondary)' }}>No connected accounts</p>
                      <button
                        onClick={() => { setShowPushModal(false); setActiveTab('social') }}
                        className="mt-2 text-xs font-medium"
                        style={{ color: 'var(--adm-accent)' }}
                      >
                        Go to Social Accounts →
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {pushTargetId && (
                <div className="p-5 border-t flex gap-2" style={{ borderColor: 'var(--adm-border)' }}>
                  <button
                    onClick={() => {
                      const fullContent = `${generatedContent.title}\n\n${generatedContent.hook ? `"${generatedContent.hook}"\n\n` : ''}${generatedContent.content}\n\n${generatedContent.cta ? `${generatedContent.cta}\n\n` : ''}${generatedContent.hashtags.map(t => `#${t}`).join(' ')}`
                      navigator.clipboard.writeText(fullContent)
                      setPushCopied(true)
                      setTimeout(() => setPushCopied(false), 2000)
                    }}
                    className="flex-1 py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2"
                    style={{ backgroundColor: 'var(--adm-input)', color: 'var(--adm-text)' }}
                  >
                    {pushCopied ? <Check size={16} style={{ color: '#22c55e' }} /> : <Copy size={16} />}
                    {pushCopied ? 'Copied!' : 'Copy Content'}
                  </button>
                  <button
                    onClick={() => {
                      const target = socialAccounts.find(a => a.id === pushTargetId)
                      if (target) {
                        const pInfo = PLATFORMS.find(p => p.id === target.platform)
                        if (pInfo) {
                          const shareUrl = `${pInfo.url}${pInfo.id === 'twitter' || pInfo.id === 'x' ? '/share?text=' : '/'}${encodeURIComponent(generatedContent.title)}`
                          window.open(shareUrl, '_blank')
                        }
                      }
                      setShowPushModal(false)
                      setPushTargetId('')
                    }}
                    className="flex-1 py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2"
                    style={{ backgroundColor: 'var(--adm-accent)', color: 'var(--adm-accent-text)' }}
                  >
                    <Send size={16} /> Push Now
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 社交平台登录模态框 */}
        {loginModalPlatform && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="rounded-2xl w-full max-w-md" style={{ backgroundColor: 'var(--adm-card)', border: '1px solid var(--adm-border)' }}>
              {(() => {
                const platform = PLATFORMS.find(p => p.id === loginModalPlatform)
                if (!platform) return null
                return (
                  <>
                    <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'var(--adm-border)' }}>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: platform.bgColor }}>
                          <platform.icon size={22} style={{ color: platform.color }} />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold" style={{ color: 'var(--adm-text)' }}>Connect {platform.name}</h3>
                          <p className="text-xs" style={{ color: 'var(--adm-text-secondary)' }}>
                            Secure OAuth login
                          </p>
                        </div>
                      </div>
                      <button onClick={closeLoginModal} className="p-1 rounded-lg" style={{ color: 'var(--adm-text-secondary)' }}>
                        <X size={20} />
                      </button>
                    </div>
                    <div className="p-5 space-y-4">
                      {loginError && (
                        <div className="rounded-lg p-3 flex items-center gap-2" style={{ backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5' }}>
                          <AlertCircle size={16} style={{ color: '#EF4444', flexShrink: 0 }} />
                          <p className="text-sm" style={{ color: '#DC2626' }}>{loginError}</p>
                        </div>
                      )}

                      <div className="p-3 rounded-xl" style={{ backgroundColor: '#E0F2FE', border: '1px solid #7DD3FC' }}>
                        <div className="flex items-center gap-2 mb-2">
                          <platform.icon size={18} style={{ color: platform.color }} />
                          <span className="text-sm font-semibold" style={{ color: '#0C4A6E' }}>OAuth Login</span>
                        </div>
                        <p className="text-xs" style={{ color: '#0369A1' }}>
                          Click the button below to connect your {platform.name} account securely via OAuth. You will be redirected to {platform.name} to authorize this app.
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--adm-text)' }}>Assign to Staff Member</label>
                        <select
                          value={loginStaffId}
                          onChange={(e) => setLoginStaffId(e.target.value)}
                          className="w-full px-3 py-2 text-sm rounded-lg"
                          style={{ backgroundColor: 'var(--adm-input)', border: '1px solid var(--adm-input-border)', color: 'var(--adm-text)' }}
                        >
                          <option value="">Select staff member...</option>
                          {allStaffMembers.map(staff => (
                            <option key={staff.id} value={staff.id}>{staff.name} ({staff.role})</option>
                          ))}
                        </select>
                        {!loginStaffId && (
                          <p className="text-xs mt-1" style={{ color: '#EF4444' }}>⚠️ Please select a staff member first</p>
                        )}
                      </div>

                      <div className="flex gap-3 pt-2">
                        <button
                          onClick={closeLoginModal}
                          className="flex-1 py-2.5 text-sm rounded-lg"
                          style={{ backgroundColor: 'var(--adm-input)', color: 'var(--adm-text)' }}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSocialLoginSubmit}
                          disabled={!loginStaffId}
                          className="flex-1 py-2.5 text-sm rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                          style={{ backgroundColor: platform.color, color: 'white' }}
                        >
                          <platform.icon size={16} /> Authorize with OAuth
                        </button>
                      </div>
                    </div>
                  </>
                )
              })()}
            </div>
          </div>
        )}

        {/* 断开社交账户确认弹窗 */}
        {disconnectingId && socialAccounts.find(a => a.id === disconnectingId) && (() => {
          const acc = socialAccounts.find(a => a.id === disconnectingId)!
          const pInfo = PLATFORMS.find(p => p.id === acc.platform)
          return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={cancelDisconnect}>
              <div className="rounded-2xl w-full max-w-sm p-6" style={{ backgroundColor: 'var(--adm-card)', border: '1px solid var(--adm-border)' }} onClick={e => e.stopPropagation()}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0" style={{ border: `2px solid ${pInfo?.color || '#EF4444'}`, backgroundColor: 'var(--adm-card)' }}>
                    {acc.avatar ? (
                      <img src={acc.avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-bold text-white text-xs" style={{ backgroundColor: pInfo?.color || '#EF4444' }}>
                        {(acc.username || '?')[0].toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-sm" style={{ color: 'var(--adm-text)' }}>Disconnect Account?</p>
                    <p className="text-xs" style={{ color: 'var(--adm-text-secondary)' }}>
                      @{acc.username} on {pInfo?.name || acc.platformName}
                    </p>
                  </div>
                </div>
                <p className="text-xs mb-5" style={{ color: 'var(--adm-text-secondary)' }}>
                  This will remove the account connection. You can reconnect it later.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={cancelDisconnect}
                    className="flex-1 py-2 rounded-lg text-sm font-medium"
                    style={{ backgroundColor: 'var(--adm-input)', color: 'var(--adm-text)' }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDisconnect}
                    className="flex-1 py-2 rounded-lg text-sm font-medium"
                    style={{ backgroundColor: '#EF4444', color: 'white' }}
                  >
                    Disconnect
                  </button>
                </div>
              </div>
            </div>
          )
        })()}
      </div>
    </div>
  )
}
