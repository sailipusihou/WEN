import fs from "fs"
import path from "path"
import crypto from "crypto"
import { getCachedData, invalidateCache, CACHE_TTL } from "@/lib/cache"

export interface ShippingZone {
  id: string
  name: string
  countries: string[]
  baseCost: number
  freeThreshold: number
  estimatedDaysMin: number
  estimatedDaysMax: number
  carriers: string[]
}

export interface StaffMember {
  id: string
  name: string
  email: string
  password: string        // DEPRECATED & DANGEROUS: 仅向后兼容, 应始终为空字符串, 新代码必须使用 passwordHash
  passwordHash?: string
  salt?: string
  role: string
  active: boolean
  createdAt: string
  permissions: string[]
  avatar?: string
}

// --- NEW: Editable frontend sections ---
export interface HeroContent {
  eyebrow: string           // "Low Flame · Contemporary Craftsmanship"
  headline: string          // "Objects That\nCarry Stories"
  headlineAccent: string    // "Carry Stories"
  subtitle: string          // paragraph text
  buttonText: string        // "Explore the Collection"
  buttonLink: string        // "/products"
  secondaryText: string     // "Our Philosophy"
  secondaryLink: string     // "/#philosophy"
  backgroundImage: string   // hero image URL (兼容旧配置,单图模式)
  overlayOpacity: number    // 0-100
  // === 新增: 多图轮播 ===
  backgroundImages?: string[]   // 多张轮播图 URL, 为空时退化为单图模式 (backgroundImage)
  slideshowEnabled?: boolean    // 是否启用轮播, 默认 true (当 backgroundImages 有多张时)
  slideshowInterval?: number    // 每张图展示秒数, 默认 6 秒
  slideshowTransition?: number  // 切换过渡毫秒数, 默认 1500ms
  kenBurnsEnabled?: boolean     // 是否启用 Ken Burns 缓慢缩放动效, 默认 true

  // === 新增: 视频动态背景 ===
  backgroundVideo?: string      // 单视频 URL (兼容旧配置)
  backgroundVideos?: string[]   // 多视频 URL 数组,支持轮播
  videoEnabled?: boolean        // 是否启用视频背景, 默认 false
  videoSlideshowEnabled?: boolean // 是否启用视频轮播, 默认 true (有多视频时)
  videoSlideshowInterval?: number // 每个视频展示秒数, 默认 8 秒
  videoLoop?: boolean           // 循环播放, 默认 true (单视频模式)
  videoMuted?: boolean          // 静音, 默认 true (浏览器要求自动播放必须静音)
  videoAutoplay?: boolean       // 自动播放, 默认 true
  videoControls?: boolean       // 显示控制条, 默认 false
  videoPoster?: string          // 视频封面图 URL (可选)
  videoFit?: 'cover' | 'contain' // 视频填充模式, 默认 cover

  // === 新增: 背景颜色与对比度调节 ===
  heroColorTint?: string        // 背景叠层颜色 (十六进制, 如 "#2D2F33")
  heroColorTintOpacity?: number // 颜色叠层不透明度, 0-100, 默认 40
  heroBrightness?: number       // 背景亮度, 20-200, 默认 100 (%)
  heroContrast?: number         // 背景对比度, 50-200, 默认 100 (%)
  heroSaturation?: number       // 背景饱和度, 0-200, 默认 100 (%)
  heroBlur?: number             // 背景模糊, 0-20, 默认 0 (px)
  heroTemperature?: number      // 色温, 0-100, 默认 50 (0=冷色调, 50=正常, 100=暖色调)

  // === 新增: Collections 轮播配置 ===
  collectionsSlideshowEnabled?: boolean    // 是否启用 collections 轮播
  collectionsSlideshowInterval?: number    // 轮播间隔秒数, 默认 6
  collectionsSlideshowTransition?: number  // 切换过渡毫秒数, 默认 1000
}

export interface PhilosophyPillar {
  number: string
  label: string
  desc: string
}

export interface CollectionCard {
  title: string
  subtitle: string
  slug: string
  image: string
  description: string
  // === 新增: 视频背景 ===
  video?: string               // 视频 URL
  videoEnabled?: boolean       // 是否启用视频背景
  videoLoop?: boolean          // 循环播放
  videoMuted?: boolean         // 静音
  videoAutoplay?: boolean      // 自动播放
  heroBrightness?: number      // 亮度 20-200, 默认 100
  heroTemperature?: number     // 色温 0-100, 默认 50
}

export interface ArtisanStory {
  image: string
  badgeNumber: string
  badgeText: string
  eyebrow: string
  headline: string
  headlineAccent: string
  paragraph1: string
  paragraph2: string
  buttonText: string
  buttonLink: string
}

export interface PhilosophySection {
  eyebrow: string
  headline: string
  headlineAccent: string
  body: string
  quotes: { quote: string; author: string }[]
}

export interface JournalEntry {
  image: string
  date: string
  readTime: string
  title: string
  excerpt: string
  link: string
}

export interface SeasonalSection {
  eyebrow: string
  headline: string
  body: string
  buttonText: string
  buttonLink: string
  secondaryText: string
  secondaryLink: string
  backgroundImage: string
}

export interface NewsletterSection {
  eyebrow: string
  headline: string
  body: string
  buttonText: string
  disclaimer: string
}

export interface FooterContent {
  brandDesc: string
  collections: { label: string; href: string }[]
  companyLinks: { label: string; href: string }[]
  contacts: { label: string; value: string }[]
  socialLinks: { label: string; href: string; color: string }[]
  bottomLinks: string[]
  copyright: string
}

export interface FrontendContent {
  hero: HeroContent
  philosophyStrip: PhilosophyPillar[]
  collections: CollectionCard[]
  collectionsSlideshowEnabled?: boolean
  collectionsSlideshowInterval?: number
  featuredSection: { eyebrow: string; headline: string }
  artisanStory: ArtisanStory
  philosophySection: PhilosophySection
  journal: { eyebrow: string; headline: string; body: string; entries: JournalEntry[] }
  seasonal: SeasonalSection
  newsletter: NewsletterSection
  footer: FooterContent
}

export interface ImagePreset {
  brightness: number   // -100 to 100
  contrast: number     // -100 to 100
  warmth: number       // -100 to 100
  saturation: number   // -100 to 100
}

export interface EditableImage {
  url: string
  alt: string
  preset: ImagePreset
}

// --- SETTINGS ---
export interface CustomerTier {
  id: string
  name: string
  minOrders: number
  maxOrders: number
  stars: number
  color: string
  bgColor: string
}

export interface SiteSettings {
  autoConfirmMinutes: number
  autoAssignOrders: boolean
  autoAssignStrategy: string
  autoAssignMode: string
  autoAssignTargetRole: string
  autoAssignTargetStaff: string
  glassLayered?: boolean
  glassSidebar?: boolean
  glassTopbar?: boolean
  glassMenus?: boolean
  glassLists?: boolean
  staffMembers: StaffMember[]
  adminUsername: string
  adminEmail: string
  adminAvatar: string
  adminPhone: string
  adminBio: string
  adminPassword: string                 // DEPRECATED: 仅用于兼容旧版登录校验, 新部署应为空
  adminPasswordHash?: string            // 推荐存储方式 (PBKDF2-SHA512, 100000 次迭代)
  adminPasswordSalt?: string
  socialFacebook: string
  socialX: string
  socialInstagram: string
  socialYoutube: string
  footerHours: string
  footerAddress: string
  footerCopyright: string
  footerPrivacyLink: string
  footerTermsLink: string
  siteName: string
  siteTagline: string
  siteUrl: string
  siteLogo: string
  heroTitle: string
  heroSubtitle: string
  heroBackgroundImage: string
  primaryColor: string
  accentColor: string
  featuredProductIds: string[]
  aboutText: string
  footerEmail: string
  footerPhone: string
  currency: string
  shippingFreeThreshold: number
  shippingCost: number
  smtpHost: string
  smtpPort: number
  smtpUser: string
  smtpPass: string
  smtpFromEmail: string
  defaultShippingDays: number
  shippingZones: ShippingZone[]
  defaultCarrier: string
  trackingUrlTemplate: string
  paypalEnabled: boolean
  paypalEnv: "sandbox" | "production"
  paypalClientId: string
  paypalClientSecret: string
  payoneerEnabled: boolean
  payoneerEnv: "sandbox" | "production"
  payoneerClientId: string
  payoneerClientSecret: string
  // NEW: editable frontend content
  frontendContent: FrontendContent
  // NEW: customer tier rules
  customerTiers: CustomerTier[]
  // AI Assistant
  aiEnabled: boolean
  aiProvider: string
  aiApiKey: string
  aiModel: string
  aiBaseUrl: string
  aiSystemPrompt: string
  aiAssistantName: string
  aiPersonality: string
  // AI 模型库（多厂商配置，主 AI 与文案共用）
  aiLLMProviders: Record<string, { apiKey: string; baseUrl: string; models: { id: string; label: string }[] }>
  // AI 图片模型库（多厂商配置，文生图/参考图共用）
  aiImageProviders: Record<string, { apiKey: string; baseUrl: string; models: { id: string; label: string }[] }>
  // AI 视频模型库（多厂商配置，图生视频共用）
  aiVideoProviders: Record<string, { apiKey: string; baseUrl: string; models: { id: string; label: string }[] }>
  // AI 音频模型库（多厂商配置，背景音乐/配音共用）
  aiAudioProviders: Record<string, { apiKey: string; baseUrl: string; models: { id: string; label: string }[] }>
  // AI 文案生成 (Content Studio) - 独立通道
  aiCopyProvider: string
  aiCopyApiKey: string
  aiCopyModel: string
  aiCopyBaseUrl: string
  // AI 图片生成 (Content Studio) - 独立通道
  aiImageEnabled: boolean
  aiImageProvider: string
  aiImageApiKey: string
  aiImageModel: string
  aiImageRefModel: string
  aiImageBaseUrl: string
  aiImageSize: string
  // 参考图生成（图生图）独立厂家配置：可与上方文生图使用不同 Provider/Key
  aiImageRefProvider: string
  aiImageRefApiKey: string
  aiImageRefBaseUrl: string
  // AI 视频生成 (Content Studio) - 图生视频独立通道
  aiVideoEnabled: boolean
  aiVideoProvider: string
  aiVideoApiKey: string
  aiVideoModel: string
  aiVideoBaseUrl: string
  // AI 音频生成 (Content Studio) - 背景音乐/配音独立通道
  aiAudioProvider: string
  aiAudioApiKey: string
  aiAudioModel: string
  aiAudioBaseUrl: string
  // X (Twitter) API
  xApiEnabled: boolean
  xApiKey: string
  xApiSecret: string
  xClientId: string
  xClientSecret: string
  xApiAuthType: 'oauth1' | 'oauth2'
  xAccessToken: string
  xAccessTokenSecret: string
  xCallbackUrl: string
  // Facebook API
  fbApiEnabled: boolean
  fbClientId: string
  fbClientSecret: string
  fbPageAccessToken: string
  fbCallbackUrl: string
  // Instagram API (new API with Instagram Login - July 2024)
  igApiEnabled: boolean
  igClientId: string
  igClientSecret: string
  igAccessToken: string
  igCallbackUrl: string
  igBusinessAccountId: string
  igContentPublishEnabled: boolean
  igManageMessagesEnabled: boolean
  igManageCommentsEnabled: boolean
  igForceReauth: boolean
  igInsightsEnabled: boolean
  // Webhook settings
  webhookVerifyToken: string        // Meta (IG/FB) webhook verify token
  webhookIgSubscribed: boolean      // Instagram webhook subscription status
  webhookFbSubscribed: boolean      // Facebook webhook subscription status
  webhookXSubscribed: boolean       // X/Twitter webhook subscription status
  webhookPtSubscribed: boolean      // Pinterest webhook subscription status
  webhookBaseUrl: string            // Public base URL for webhook callbacks
  metaAppSecret: string             // Meta App Secret for webhook signature verification
  attributionModel: 'last_click' | 'first_click' | 'multi_touch'
  attributionLookbackDays: number
  attributionRequireVisitorMatch: boolean
  attributionAllowReferralFallback: boolean
  // LinkedIn API
  liApiEnabled: boolean
  liClientId: string
  liClientSecret: string
  liAccessToken: string
  liCallbackUrl: string
  // YouTube API
  ytApiEnabled: boolean
  ytClientId: string
  ytClientSecret: string
  ytApiKey: string
  ytAccessToken: string
  ytCallbackUrl: string
  // Pinterest API
  ptApiEnabled: boolean
  ptClientId: string
  ptClientSecret: string
  ptAccessToken: string
  ptCallbackUrl: string
  // TikTok API
  tkApiEnabled: boolean
  tkClientId: string
  tkClientSecret: string
  tkAccessToken: string
  tkCallbackUrl: string
}

const DATA_DIR = path.join(process.cwd(), "data")
const FILE = path.join(DATA_DIR, "settings.json")

const DEFAULT_ZONES: ShippingZone[] = [
  { id: "us-canada", name: "United States & Canada", countries: ["United States", "Canada"], baseCost: 250, freeThreshold: 3000, estimatedDaysMin: 7, estimatedDaysMax: 14, carriers: ["UPS", "FedEx", "USPS"] },
  { id: "europe", name: "Europe", countries: ["United Kingdom", "Germany", "France", "Italy", "Spain", "Netherlands", "Other"], baseCost: 350, freeThreshold: 4000, estimatedDaysMin: 10, estimatedDaysMax: 18, carriers: ["DHL", "FedEx", "UPS"] },
  { id: "asia-pacific", name: "Asia Pacific", countries: ["Australia", "Japan", "South Korea", "Singapore"], baseCost: 300, freeThreshold: 3500, estimatedDaysMin: 8, estimatedDaysMax: 15, carriers: ["DHL", "EMS", "FedEx"] },
  { id: "rest-of-world", name: "Rest of World", countries: ["Other"], baseCost: 400, freeThreshold: 5000, estimatedDaysMin: 12, estimatedDaysMax: 21, carriers: ["DHL", "EMS"] },
]

const DEFAULT_FRONTEND: FrontendContent = {
  hero: {
    eyebrow: "Low Flame · Contemporary Craftsmanship",
    headline: "Objects That\nCarry Stories",
    headlineAccent: "Carry Stories",
    subtitle: "Celadon, silk, bamboo, and incense — each piece hand-selected from master craftspeople who have spent a lifetime perfecting their art.",
    buttonText: "Explore the Collection",
    buttonLink: "/products",
    secondaryText: "Our Philosophy",
    secondaryLink: "/#philosophy",
    backgroundImage: "https://images.unsplash.com/photo-1508804185872-d7badad00f7d?w=1920&q=80",
    overlayOpacity: 55,
  },
  philosophyStrip: [
    { number: "01", label: "Hand-Selected", desc: "Every object personally curated from master workshops" },
    { number: "02", label: "Authentic Craft", desc: "Direct from artisans preserving centuries-old techniques" },
    { number: "03", label: "Ethical Sourcing", desc: "Fair partnerships supporting traditional communities" },
    { number: "04", label: "Timeless Design", desc: "Objects made to last, designed to be cherished" },
  ],
  collections: [
    { title: "Tea Ceremony", subtitle: "The Art of Cha Dao", slug: "cultural-gifts", image: "https://images.unsplash.com/photo-1515377905703-c4788e51af15?w=1200&q=80", description: "Hand-thrown celadon and Yixing teaware that transforms tea brewing into a meditative ritual." },
    { title: "Ceramic Living", subtitle: "Daily Vessels, Timeless Beauty", slug: "home-decor", image: "https://images.unsplash.com/photo-1586105251261-72a756497a11?w=1200&q=80", description: "Porcelain and stoneware made for everyday use, each shaped by centuries of tradition." },
    { title: "Silk & Embroidery", subtitle: "Threads of Heritage", slug: "cultural-gifts", image: "https://images.unsplash.com/photo-1607532941432-5e0d3cba768b?w=1200&q=80", description: "Suzhou double-sided embroidery preserving an endangered craft." },
    { title: "Bamboo Craft", subtitle: "Sustainable Artistry", slug: "home-decor", image: "https://images.unsplash.com/photo-1513519245088-0e12902e35ca?w=1200&q=80", description: "Baskets and objects woven by master artisans in Zhejiang." },
    { title: "Natural Incense", subtitle: "Sacred Scents", slug: "creative-gifts", image: "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=1200&q=80", description: "Agarwood, sandalwood, and herbal blends using ancient formulas." },
    { title: "Scholar's Desk", subtitle: "The Art of Writing", slug: "creative-gifts", image: "https://images.unsplash.com/photo-1496096265110-f83ad7f96608?w=1200&q=80", description: "Brush pots, ink stones, and writing sets for the modern scholar." },
  ],
  collectionsSlideshowEnabled: true,
  collectionsSlideshowInterval: 6,
  featuredSection: { eyebrow: "Curated Selection", headline: "Featured Pieces" },
  artisanStory: {
    image: "https://images.unsplash.com/photo-1508804185872-d7badad00f7d?w=800&q=80",
    badgeNumber: "45+", badgeText: "Master artisans in our network",
    eyebrow: "Behind the Craft",
    headline: "Every Object Has a\nMaker, Place, Story",
    headlineAccent: "Maker, Place, Story",
    paragraph1: "We travel to remote villages — not to source products, but to find the people who keep living traditions alive.",
    paragraph2: "Each piece is accompanied by the name of the artisan, their workshop, and the story behind the technique.",
    buttonText: "Meet the Artisans", buttonLink: "/products",
  },
  philosophySection: {
    eyebrow: "Our Philosophy",
    headline: "Beauty Lives in the\nDetails We Often Overlook",
    headlineAccent: "Details We Often Overlook",
    body: "We believe everyday objects carry cultural memory, emotional weight, and quiet beauty. In a world of mass production, choosing handmade is a connection to something larger than ourselves.",
    quotes: [
      { quote: "The potter shapes not just clay, but the stillness of the person who will drink from it.", author: "— Master Wei, Celadon Artisan" },
      { quote: "A single silk thread can carry a thousand years of culture.", author: "— Chen Li, Embroidery Artist" },
      { quote: "We do not create beauty. We simply remove everything that is not essential.", author: "— Zen saying" },
    ],
  },
  journal: {
    eyebrow: "Stories & Essays", headline: "The Journal",
    body: "Explorations of craft, culture, and the philosophy of everyday objects.",
    entries: [
      { image: "https://images.unsplash.com/photo-1515377905703-c4788e51af15?w=800&q=80", date: "June 2026", readTime: "8", title: "The Celadon Tradition", excerpt: "How a single glaze color became one of China's most cherished artistic legacies.", link: "/#journal" },
      { image: "https://images.unsplash.com/photo-1607532941432-5e0d3cba768b?w=800&q=80", date: "May 2026", readTime: "6", title: "Inside the Workshop: Suzhou Embroidery", excerpt: "A rare glimpse into the studio where silk threads become paintings.", link: "/#journal" },
      { image: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=800&q=80", date: "April 2026", readTime: "10", title: "The Way of Tea", excerpt: "Beyond ceremony, tea culture offers a philosophy of presence and simplicity.", link: "/#journal" },
    ],
  },
  seasonal: {
    eyebrow: "Seasonal Edition", headline: "Summer Collection",
    body: "Light bamboo fans, summer-weight silk, celadon tea sets for warm afternoons, and incense blended for the season of long, slow days.",
    buttonText: "Explore Summer Collection", buttonLink: "/products",
    secondaryText: "Request a Lookbook", secondaryLink: "/contact",
    backgroundImage: "https://images.unsplash.com/photo-1547981609-4b6bfe67ca0b?w=1920&q=80",
  },
  newsletter: {
    eyebrow: "Stay Connected", headline: "Receive Stories from the Studio",
    body: "Monthly dispatches on new collections, artisan interviews, and the philosophy of craft.",
    buttonText: "Subscribe", disclaimer: "No spam. Unsubscribe anytime.",
  },
  footer: {
    brandDesc: "Low Flame — contemporary craftsmanship. Each piece connects you to the artisan who made it.",
    collections: [
      { label: "Tea Ceremony", href: "/products" },
      { label: "Ceramic Living", href: "/products" },
      { label: "Silk & Embroidery", href: "/products" },
      { label: "Bamboo Craft", href: "/products" },
      { label: "Natural Incense", href: "/products" },
      { label: "Scholar's Desk", href: "/products" },
    ],
    companyLinks: [
      { label: "About", href: "/#philosophy" },
      { label: "Journal", href: "/#journal" },
      { label: "Contact", href: "/contact" },
      { label: "Shipping", href: "/contact" },
      { label: "Returns", href: "/contact" },
    ],
    contacts: [
      { label: "Email", value: "hello@lowflame.com" },
      { label: "Phone", value: "+86 400-888-8888" },
      { label: "Hours", value: "Mon-Sat 9:00-18:00 (CST)" },
    ],
    socialLinks: [
      { label: "X", href: "https://x.com", color: "hover:text-white" },
      { label: "IG", href: "https://instagram.com", color: "hover:text-[#E4405F]" },
      { label: "FB", href: "https://facebook.com", color: "hover:text-[#1877F2]" },
      { label: "PT", href: "https://pinterest.com", color: "hover:text-[#E60023]" },
      { label: "YT", href: "https://youtube.com", color: "hover:text-[#FF0000]" },
    ],
    bottomLinks: ["Privacy", "Terms", "Cookie Policy"],
    copyright: "All rights reserved.",
  },
}

export const DEFAULTS: SiteSettings = {
  autoConfirmMinutes: 0,
  autoAssignOrders: false,
  autoAssignStrategy: "round_robin",
  autoAssignMode: "disabled",
  autoAssignTargetRole: "order_processor",
  autoAssignTargetStaff: "",
  glassLayered: true,
  glassSidebar: true,
  glassTopbar: true,
  glassMenus: true,
  glassLists: true,
  staffMembers: [],
  adminUsername: "admin",
  adminEmail: "admin@lowflame.com",
  adminAvatar: "",
  adminPhone: "",
  adminBio: "",
  adminPassword: "",                    // 强制用户首次启动后立即通过 /api/auth/migrate-admin-password 或登录后修改
  adminPasswordHash: "",                // 首次启动时若为空, /api/auth/route.ts 会自动用默认密码迁移
  adminPasswordSalt: "",
  siteName: "Low Flame",
  siteTagline: "",
  siteUrl: "",
  siteLogo: "",
  heroTitle: "Artisanal Treasures",
  heroSubtitle: "Hand-selected ceramics, silk, bamboo, and paper-cut art from master craftspeople across China.",
  heroBackgroundImage: "https://images.unsplash.com/photo-1508804185872-d7badad00f7d?w=1920&q=80",
  primaryColor: "#2D2F33",
  accentColor: "#8BA8A0",
  featuredProductIds: [],
  aboutText: "Low Flame — contemporary craftsmanship with quiet character.",
  footerEmail: "hello@lowflame.com",
  footerPhone: "+86 400-888-8888",
  currency: "USD",
  shippingFreeThreshold: 3000,
  shippingCost: 250,
  smtpHost: "",
  smtpPort: 587,
  smtpUser: "",
  smtpPass: "",
  smtpFromEmail: "",
  socialFacebook: "https://facebook.com",
  socialX: "https://x.com",
  socialInstagram: "https://instagram.com",
  socialYoutube: "https://youtube.com",
  footerHours: "Mon-Sat 9:00-18:00 (CST)",
  footerAddress: "",
  footerCopyright: "All rights reserved.",
  footerPrivacyLink: "/contact",
  footerTermsLink: "/contact",
  defaultShippingDays: 14,
  shippingZones: DEFAULT_ZONES,
  defaultCarrier: "DHL",
  trackingUrlTemplate: "https://www.dhl.com/cn/en/tracking.html?tracking-id={tracking}",
  paypalEnabled: false,
  paypalEnv: "sandbox",
  paypalClientId: "",
  paypalClientSecret: "",
  payoneerEnabled: false,
  payoneerEnv: "sandbox",
  payoneerClientId: "",
  payoneerClientSecret: "",
  frontendContent: DEFAULT_FRONTEND,
  customerTiers: [
    { id: "new", name: "New", minOrders: 0, maxOrders: 0, stars: 1, color: "#3b82f6", bgColor: "#dbeafe" },
    { id: "bronze", name: "Bronze", minOrders: 1, maxOrders: 2, stars: 2, color: "#b45309", bgColor: "#fef3c7" },
    { id: "silver", name: "Silver", minOrders: 3, maxOrders: 5, stars: 3, color: "#6b7280", bgColor: "#f3f4f6" },
    { id: "gold", name: "Gold", minOrders: 6, maxOrders: 10, stars: 4, color: "#f59e0b", bgColor: "#fefce8" },
    { id: "vip", name: "VIP", minOrders: 11, maxOrders: 9999, stars: 5, color: "#e11d48", bgColor: "#fef2f2" },
  ],
  aiEnabled: false,
  aiProvider: "openai",
  aiApiKey: "",
  aiLLMProviders: {
    deepseek: {
      apiKey: "",
      baseUrl: "https://api.deepseek.com/v1",
      models: [
        { id: "deepseek-chat", label: "DeepSeek V3 (deepseek-chat)" },
        { id: "deepseek-reasoner", label: "DeepSeek R1 (deepseek-reasoner)" },
      ],
    },
    siliconflow: {
      apiKey: "",
      baseUrl: "https://api.siliconflow.cn/v1",
      models: [
        { id: "deepseek-ai/DeepSeek-V3", label: "DeepSeek V3" },
        { id: "deepseek-ai/DeepSeek-R1", label: "DeepSeek R1" },
        { id: "Qwen/Qwen3-32B", label: "Qwen3-32B" },
        { id: "zai-org/GLM-4.5", label: "GLM-4.5" },
      ],
    },
    openai: {
      apiKey: "",
      baseUrl: "https://api.openai.com/v1",
      models: [
        { id: "gpt-4o-mini", label: "GPT-4o mini" },
        { id: "gpt-4o", label: "GPT-4o" },
        { id: "gpt-4.1-mini", label: "GPT-4.1 mini" },
      ],
    },
    qwen: {
      apiKey: "",
      baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
      models: [
        { id: "qwen-plus", label: "Qwen Plus" },
        { id: "qwen-max", label: "Qwen Max" },
        { id: "qwen-turbo", label: "Qwen Turbo" },
      ],
    },
    zhipu: {
      apiKey: "",
      baseUrl: "https://open.bigmodel.cn/api/paas/v4",
      models: [
        { id: "glm-4-plus", label: "GLM-4 Plus" },
        { id: "glm-4-air", label: "GLM-4 Air" },
        { id: "glm-4-flash", label: "GLM-4 Flash" },
      ],
    },
  },
  aiModel: "gpt-4o-mini",
  aiBaseUrl: "",
  aiSystemPrompt: "You are a helpful e-commerce assistant for Low Flame. You help analyze orders, customers, and business operations. Be concise and professional.",
  aiAssistantName: "Aria",
  aiPersonality: "",
  aiCopyProvider: "deepseek",
  aiCopyApiKey: "",
  aiCopyModel: "deepseek-chat",
  aiCopyBaseUrl: "",
  aiImageEnabled: false,
  aiImageProvider: "siliconflow",
  aiImageApiKey: "",
  aiImageProviders: {
    siliconflow: {
      apiKey: "",
      baseUrl: "https://api.siliconflow.cn/v1",
      models: [
        { id: "Tongyi-MAI/Z-Image-Turbo", label: "Tongyi Z-Image Turbo（免费）" },
        { id: "Tongyi-MAI/Z-Image", label: "Tongyi Z-Image" },
        { id: "Kwai-Kolors/Kolors", label: "Kwai Kolors" },
        { id: "Qwen/Qwen-Image", label: "Qwen-Image" },
        { id: "BFL/FLUX.1-dev", label: "FLUX.1-dev" },
      ],
    },
    minimax: {
      apiKey: "",
      baseUrl: "https://api.minimaxi.com/v1",
      models: [
        { id: "image-01", label: "image-01（文生图/参考图）" },
        { id: "image-01-live", label: "image-01-live" },
      ],
    },
    ark: {
      apiKey: "",
      baseUrl: "https://ark.cn-beijing.volces.com/api/v3",
      models: [
        { id: "doubao-seedream-4-0-250828", label: "Seedream 4.0（1K/2K/4K）" },
        { id: "doubao-seedream-4-5-251128", label: "Seedream 4.5（2K/4K，细节更强）" },
        { id: "doubao-seedream-5-0-260128", label: "Seedream 5.0（2K/3K，旗舰）" },
      ],
    },
    openai: {
      apiKey: "",
      baseUrl: "https://api.openai.com/v1",
      models: [
        { id: "gpt-image-1", label: "gpt-image-1（推荐）" },
        { id: "dall-e-3", label: "DALL·E 3" },
      ],
    },
  },
  aiImageModel: "Tongyi-MAI/Z-Image-Turbo",
  aiImageRefModel: "Tongyi-MAI/Z-Image",
  aiImageBaseUrl: "https://api.siliconflow.cn/v1",
  aiImageSize: "1024x1024",
  aiImageRefProvider: "",
  aiImageRefApiKey: "",
  aiImageRefBaseUrl: "",
  aiVideoEnabled: false,
  aiVideoProvider: "ark",
  aiVideoApiKey: "",
  aiVideoModel: "doubao-seedance-2-0-260128",
  aiVideoBaseUrl: "",
  aiVideoProviders: {
    ark: {
      apiKey: "",
      baseUrl: "https://ark.cn-beijing.volces.com/api/v3",
      models: [
        { id: "doubao-seedance-2-0-260128", label: "Seedance 2.0（旗舰，图生视频/原生音频）" },
        { id: "doubao-seedance-2-0-fast-260128", label: "Seedance 2.0 Fast（快速）" },
        { id: "doubao-seedance-1-5-pro-251215", label: "Seedance 1.5 Pro（图生视频）" },
        { id: "doubao-seedance-1-0-pro-250528", label: "Seedance 1.0 Pro（图生视频）" },
        { id: "doubao-seedance-1-0-lite-i2v-250428", label: "Seedance 1.0 Lite i2v" },
      ],
    },
    minimax: {
      apiKey: "",
      baseUrl: "https://api.minimaxi.com",
      models: [
        { id: "MiniMax-H3", label: "MiniMax H3（旗舰，图生/文生/多模态参考，原生音频）" },
        { id: "video-01", label: "Video-01（图生视频）" },
        { id: "video-01-live", label: "Video-01 Live" },
      ],
    },
  },
  aiAudioProvider: "minimax",
  aiAudioApiKey: "",
  aiAudioModel: "music-3.0-free",
  aiAudioBaseUrl: "https://api.minimaxi.com",
  aiAudioProviders: {
    minimax: {
      apiKey: "",
      baseUrl: "https://api.minimaxi.com",
      models: [
        { id: "music-3.0-free", label: "Music 3.0 Free（纯音乐，免费额度）" },
        { id: "music-2.6-free", label: "Music 2.6 Free（纯音乐，免费额度）" },
        { id: "music-3.0", label: "Music 3.0（付费，效果最佳）" },
        { id: "speech-02-hd", label: "Speech 02 HD（高清配音）" },
        { id: "speech-02-turbo", label: "Speech 02 Turbo（快速配音）" },
      ],
    },
  },
  xApiEnabled: false,
  xApiKey: "",
  xApiSecret: "",
  xClientId: "",
  xClientSecret: "",
  xApiAuthType: "oauth2",
  xAccessToken: "",
  xAccessTokenSecret: "",
  xCallbackUrl: "",
  fbApiEnabled: false,
  fbClientId: "",
  fbClientSecret: "",
  fbPageAccessToken: "",
  fbCallbackUrl: "",
  igApiEnabled: false,
  igClientId: "",
  igClientSecret: "",
  igAccessToken: "",
  igCallbackUrl: "",
  igBusinessAccountId: "",
  igContentPublishEnabled: false,
  igManageMessagesEnabled: false,
  igManageCommentsEnabled: false,
  igForceReauth: false,
  igInsightsEnabled: false,
  // Webhook defaults
  webhookVerifyToken: '',
  webhookIgSubscribed: false,
  webhookFbSubscribed: false,
  webhookXSubscribed: false,
  webhookPtSubscribed: false,
  webhookBaseUrl: '',
  metaAppSecret: '',
  attributionModel: 'last_click',
  attributionLookbackDays: 7,
  attributionRequireVisitorMatch: true,
  attributionAllowReferralFallback: true,
  liApiEnabled: false,
  liClientId: "",
  liClientSecret: "",
  liAccessToken: "",
  liCallbackUrl: "",
  ytApiEnabled: false,
  ytClientId: "",
  ytClientSecret: "",
  ytApiKey: "",
  ytAccessToken: "",
  ytCallbackUrl: "",
  ptApiEnabled: false,
  ptClientId: "",
  ptClientSecret: "",
  ptAccessToken: "",
  ptCallbackUrl: "",
  tkApiEnabled: false,
  tkClientId: "",
  tkClientSecret: "",
  tkAccessToken: "",
  tkCallbackUrl: "",
}

// 规范化设置：合并默认值 + 模型库迁移（JSON 与 SQLite 后端共用）
export function normalizeSavedSettings(saved: any): SiteSettings {
  const llmProviders = JSON.parse(JSON.stringify(DEFAULTS.aiLLMProviders))
  const copyP = (saved.aiCopyProvider || saved.aiProvider || 'deepseek').toLowerCase()
  if (saved.aiCopyApiKey && (!llmProviders[copyP] || !llmProviders[copyP].apiKey)) {
    if (!llmProviders[copyP]) llmProviders[copyP] = { apiKey: "", baseUrl: "", models: [] }
    llmProviders[copyP].apiKey = saved.aiCopyApiKey
    if (!llmProviders[copyP].baseUrl && saved.aiCopyBaseUrl) llmProviders[copyP].baseUrl = saved.aiCopyBaseUrl
  } else if (saved.aiApiKey && (!llmProviders[saved.aiProvider] || !llmProviders[saved.aiProvider].apiKey)) {
    const p = (saved.aiProvider || 'openai').toLowerCase()
    if (!llmProviders[p]) llmProviders[p] = { apiKey: "", baseUrl: "", models: [] }
    llmProviders[p].apiKey = saved.aiApiKey
    if (!llmProviders[p].baseUrl && saved.aiBaseUrl) llmProviders[p].baseUrl = saved.aiBaseUrl
  }
  const imgProviders = JSON.parse(JSON.stringify(DEFAULTS.aiImageProviders))
  const imgP = (saved.aiImageProvider || 'siliconflow').toLowerCase()
  if (saved.aiImageApiKey && (!imgProviders[imgP] || !imgProviders[imgP].apiKey)) {
    if (!imgProviders[imgP]) imgProviders[imgP] = { apiKey: "", baseUrl: "", models: [] }
    imgProviders[imgP].apiKey = saved.aiImageApiKey
    if (!imgProviders[imgP].baseUrl && saved.aiImageBaseUrl) imgProviders[imgP].baseUrl = saved.aiImageBaseUrl
  }
  const refP = (saved.aiImageRefProvider || saved.aiImageProvider || 'siliconflow').toLowerCase()
  if (saved.aiImageRefApiKey && (!imgProviders[refP] || !imgProviders[refP].apiKey)) {
    if (!imgProviders[refP]) imgProviders[refP] = { apiKey: "", baseUrl: "", models: [] }
    imgProviders[refP].apiKey = saved.aiImageRefApiKey
    if (!imgProviders[refP].baseUrl && saved.aiImageRefBaseUrl) imgProviders[refP].baseUrl = saved.aiImageRefBaseUrl
  }
  const videoProviders = JSON.parse(JSON.stringify(DEFAULTS.aiVideoProviders))
  const vidP = (saved.aiVideoProvider || 'ark').toLowerCase()
  if (saved.aiVideoApiKey && (!videoProviders[vidP] || !videoProviders[vidP].apiKey)) {
    if (!videoProviders[vidP]) videoProviders[vidP] = { apiKey: "", baseUrl: "", models: [] }
    videoProviders[vidP].apiKey = saved.aiVideoApiKey
    if (!videoProviders[vidP].baseUrl && saved.aiVideoBaseUrl) videoProviders[vidP].baseUrl = saved.aiVideoBaseUrl
  }
  const audioProviders = JSON.parse(JSON.stringify(DEFAULTS.aiAudioProviders))
  const audioP = (saved.aiAudioProvider || 'minimax').toLowerCase()
  const savedAudioKey = saved.aiAudioApiKey
    || saved.aiVideoProviders?.minimax?.apiKey
    || saved.aiLLMProviders?.minimax?.apiKey
    || saved.aiImageProviders?.minimax?.apiKey
  if (savedAudioKey && (!audioProviders[audioP] || !audioProviders[audioP].apiKey)) {
    if (!audioProviders[audioP]) audioProviders[audioP] = { apiKey: "", baseUrl: "", models: [] }
    audioProviders[audioP].apiKey = savedAudioKey
    if (!audioProviders[audioP].baseUrl && saved.aiAudioBaseUrl) audioProviders[audioP].baseUrl = saved.aiAudioBaseUrl
  }
  return {
    ...DEFAULTS,
    ...saved,
    aiLLMProviders: { ...llmProviders, ...(saved.aiLLMProviders || {}) },
    aiImageProviders: { ...imgProviders, ...(saved.aiImageProviders || {}) },
    aiVideoProviders: { ...videoProviders, ...(saved.aiVideoProviders || {}) },
    aiAudioProviders: { ...audioProviders, ...(saved.aiAudioProviders || {}) },
    shippingZones: saved.shippingZones || DEFAULTS.shippingZones,
    frontendContent: { ...DEFAULTS.frontendContent, ...(saved.frontendContent || {}) },
  }
}

export function getSettings(): SiteSettings {
  return getCachedData('settings', FILE, () => {
    try {
      if (fs.existsSync(FILE)) {
        const raw = fs.readFileSync(FILE, "utf-8").replace(/^\uFEFF/, "").trim()
        return normalizeSavedSettings(JSON.parse(raw))
      }
    } catch {}
    return DEFAULTS
  }, CACHE_TTL.settings)
}

export function saveSettings(updates: Partial<SiteSettings>): SiteSettings {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
  const current = getSettings()
  const updated = {
    ...current,
    ...updates,
    frontendContent: updates.frontendContent
      ? { ...current.frontendContent, ...updates.frontendContent }
      : current.frontendContent,
  }
  fs.writeFileSync(FILE, JSON.stringify(updated, null, 2), "utf-8")
  invalidateCache('settings')
  return updated
}

export function getShippingZoneForCountry(country: string): ShippingZone | undefined {
  const settings = getSettings()
  return settings.shippingZones.find(z => z.countries.some(c => c.toLowerCase() === country.toLowerCase()))
}

export function hashStaffPassword(password: string, salt?: string): { hash: string; salt: string } {
  const s = salt || crypto.randomBytes(16).toString("hex")
  // 从 1000 提升至 100000 次迭代, 防止暴力破解 (OWASP 2023 推荐)
  const hash = crypto.pbkdf2Sync(password, s, 100000, 64, "sha512").toString("hex")
  return { hash, salt: s }
}

// 常量时间比较, 防止时序攻击
function safeEqualStr(a: string, b: string): boolean {
  const ba = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ba.length !== bb.length) return false
  return crypto.timingSafeEqual(ba, bb)
}

export function verifyStaffPassword(password: string, member: StaffMember): boolean {
  // 推荐: 使用哈希凭证
  if (member.passwordHash && member.salt) {
    // 优先尝试新版本 (100000 次迭代)
    if (safeEqualStr(hashStaffPassword(password, member.salt).hash, member.passwordHash)) return true
    // 兼容旧版本 (1000 次迭代)
    const legacyHash = crypto.pbkdf2Sync(password, member.salt, 1000, 64, "sha512").toString("hex")
    return safeEqualStr(legacyHash, member.passwordHash)
  }
  // 向后兼容: 明文校验 (常量时间比较), 新代码不应再走此分支
  if (member.password) {
    return safeEqualStr(password, member.password)
  }
  return false
}

export function calculateShipping(country: string, subtotal: number): { cost: number; estimatedDays: string; zone: ShippingZone | undefined } {
  const zone = getShippingZoneForCountry(country)
  if (!zone) {
    const defaultZone = getSettings().shippingZones.find(z => z.countries.includes("Other"))
    const cost = defaultZone ? (subtotal >= defaultZone.freeThreshold ? 0 : defaultZone.baseCost) : 250
    return { cost, estimatedDays: defaultZone ? `${defaultZone.estimatedDaysMin}-${defaultZone.estimatedDaysMax}` : "14-21", zone: defaultZone }
  }
  const cost = subtotal >= zone.freeThreshold ? 0 : zone.baseCost
  return { cost, estimatedDays: `${zone.estimatedDaysMin}-${zone.estimatedDaysMax}`, zone }
}
