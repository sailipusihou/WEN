import { NextRequest, NextResponse } from 'next/server'
import { getRepository } from '@/lib/repository'
import type { SiteSettings } from '@/lib/settings'
import { requireSuperAdmin, hashAdminPassword } from '@/lib/auth'
import { validateString, sanitizeString } from '@/lib/validation'

function maskSecret(s: string | undefined): string {
  if (!s || s.length < 8) return s ? `${s.slice(0, 2)}••••` : ''
  return `${s.slice(0, 4)}••••••••${s.slice(-4)}`
}

function sanitizeSettingsForAdmin(s: SiteSettings) {
  // 安全修复 H2: 全部支付/社媒/Webhook/AI 密钥与员工密码哈希一律不返回, 仅返回 has* 标志与掩码预览
  const {
    adminPassword, smtpPass, paypalClientSecret, paypalWebhookId, payoneerClientSecret,
    aiApiKey, aiCopyApiKey, aiImageApiKey, aiImageRefApiKey, aiVideoApiKey, aiAudioApiKey,
    xApiSecret, xAccessToken, xAccessTokenSecret,
    fbClientSecret, fbPageAccessToken,
    igClientSecret, igAccessToken,
    liClientSecret, liAccessToken,
    ytClientSecret, ytAccessToken, ytApiKey,
    ptClientSecret, ptAccessToken,
    tkClientSecret, tkAccessToken,
    metaAppSecret, webhookVerifyToken, aiAudioProviders,
    ...rest
  } = s
  const staff = (rest.staffMembers || []).map(m => {
    const { password, passwordHash, salt, ...safe } = m as any
    return safe
  })
  return {
    ...rest,
    staffMembers: staff,
    hasAdminPassword: !!(s.adminPasswordHash || s.adminPassword),
    hasSmtpPass: !!smtpPass,
    hasPaypalSecret: !!paypalClientSecret,
    // Webhook ID 与密钥同等对待：只回报是否已配置，不回传明文
    hasPaypalWebhook: !!paypalWebhookId,
    hasPayoneerSecret: !!payoneerClientSecret,
    hasAiApiKey: !!aiApiKey,
    hasAiCopyApiKey: !!aiCopyApiKey,
    hasAiImageApiKey: !!aiImageApiKey,
    hasAiImageRefApiKey: !!aiImageRefApiKey,
    hasAiVideoApiKey: !!aiVideoApiKey,
    hasAiAudioApiKey: !!aiAudioApiKey,
    hasXApiSecret: !!xApiSecret,
    hasXAccessToken: !!xAccessToken,
    hasFbClientSecret: !!fbClientSecret,
    hasFbPageAccessToken: !!fbPageAccessToken,
    hasIgClientSecret: !!igClientSecret,
    hasIgAccessToken: !!igAccessToken,
    hasLiClientSecret: !!liClientSecret,
    hasLiAccessToken: !!liAccessToken,
    hasYtClientSecret: !!ytClientSecret,
    hasYtAccessToken: !!ytAccessToken,
    hasPtClientSecret: !!ptClientSecret,
    hasPtAccessToken: !!ptAccessToken,
    hasTkClientSecret: !!tkClientSecret,
    hasTkAccessToken: !!tkAccessToken,
    hasMetaAppSecret: !!metaAppSecret,
    hasWebhookVerifyToken: !!webhookVerifyToken,
    hasWebhookBaseUrl: !!(rest as any).webhookBaseUrl,
    aiImageKeyPreview: maskSecret(aiImageApiKey),
    aiImageRefKeyPreview: maskSecret(aiImageRefApiKey),
    aiVideoKeyPreview: maskSecret(aiVideoApiKey),
    paypalSecretPreview: maskSecret(paypalClientSecret),
    payoneerSecretPreview: maskSecret(payoneerClientSecret),
    xApiSecretPreview: maskSecret(xApiSecret),
    fbClientSecretPreview: maskSecret(fbClientSecret),
    igClientSecretPreview: maskSecret(igClientSecret),
    metaAppSecretPreview: maskSecret(metaAppSecret),
    aiLLMProviders: Object.fromEntries(
      Object.entries(rest.aiLLMProviders || {}).map(([k, v]) => [
        k,
        {
          ...v,
          apiKey: v.apiKey ? maskSecret(v.apiKey) : '',
        },
      ])
    ),
    aiImageProviders: Object.fromEntries(
      Object.entries(rest.aiImageProviders || {}).map(([k, v]) => [
        k,
        {
          ...v,
          apiKey: v.apiKey ? maskSecret(v.apiKey) : '',
        },
      ])
    ),
    aiVideoProviders: Object.fromEntries(
      Object.entries(rest.aiVideoProviders || {}).map(([k, v]) => [
        k,
        {
          ...v,
          apiKey: v.apiKey ? maskSecret(v.apiKey) : '',
        },
      ])
    ),
  }
}

export async function GET(req: NextRequest) {
  const authResult = requireSuperAdmin(req)
  const repo = getRepository()
  const s = repo.settings.get()
  if ('error' in authResult) {
    return NextResponse.json({
    siteName: s.siteName,
    siteTagline: s.siteTagline,
    heroTitle: s.heroTitle,
    heroSubtitle: s.heroSubtitle,
    heroBackgroundImage: s.heroBackgroundImage,
    primaryColor: s.primaryColor,
    accentColor: s.accentColor,
    currency: s.currency,
    socialFacebook: s.socialFacebook,
    socialX: s.socialX,
    socialInstagram: s.socialInstagram,
    socialYoutube: s.socialYoutube,
    footerHours: s.footerHours,
    footerAddress: s.footerAddress,
    footerCopyright: s.footerCopyright,
    footerEmail: s.footerEmail,
    footerPhone: s.footerPhone,
    footerPrivacyLink: s.footerPrivacyLink,
    footerTermsLink: s.footerTermsLink,
    aboutText: s.aboutText,
    defaultShippingDays: s.defaultShippingDays,
    shippingZones: s.shippingZones,
    defaultCarrier: s.defaultCarrier,
    trackingUrlTemplate: s.trackingUrlTemplate,
    frontendContent: s.frontendContent,
    shippingFreeThreshold: s.shippingFreeThreshold,
    shippingCost: s.shippingCost,
    customerTiers: s.customerTiers,
  })
  }
  return NextResponse.json(sanitizeSettingsForAdmin(s))
}

const STRING_FIELDS: Record<string, number> = {
  siteName: 100,
  siteUrl: 500,
  siteTagline: 200,
  heroTitle: 200,
  heroSubtitle: 500,
  heroBackgroundImage: 1000,
  heroVideoUrl: 1000,
  primaryColor: 20,
  accentColor: 20,
  currency: 10,
  socialFacebook: 200,
  socialX: 200,
  socialInstagram: 200,
  socialYoutube: 200,
  footerHours: 200,
  footerAddress: 300,
  footerCopyright: 200,
  footerEmail: 100,
  footerPhone: 50,
  footerPrivacyLink: 500,
  footerTermsLink: 500,
  aboutText: 5000,
  defaultCarrier: 50,
  trackingUrlTemplate: 500,
  paypalClientId: 200,
  paypalClientSecret: 200,
  paypalWebhookId: 100,
  paypalEnv: 20,
  payoneerClientId: 200,
  payoneerClientSecret: 200,
  payoneerEnv: 20,
  adminBgImage: 1000,
  siteLogo: 500,
  adminUsername: 100,
  smtpHost: 200,
  smtpUser: 200,
  smtpFromEmail: 200,
  aiProvider: 50,
  aiApiKey: 500,
  aiModel: 100,
  aiBaseUrl: 500,
  aiSystemPrompt: 5000,
  aiAssistantName: 100,
  aiAvatar: 50,
  aiPersonality: 50,
  aiPetStyle: 50,
  aiCopyProvider: 50,
  aiCopyApiKey: 500,
  aiCopyModel: 100,
  aiCopyBaseUrl: 500,
  aiImageProvider: 50,
  aiImageApiKey: 500,
  aiImageModel: 200,
  aiImageRefModel: 200,
  aiImageBaseUrl: 500,
  aiImageSize: 50,
    aiImageRefProvider: 50,
    aiImageRefApiKey: 500,
    aiImageRefBaseUrl: 500,
    aiLLMProviders: 100000,
    aiImageProviders: 100000,
    aiVideoProvider: 50,
    aiVideoApiKey: 500,
    aiVideoModel: 200,
    aiVideoBaseUrl: 500,
    aiVideoProviders: 100000,
  xApiKey: 200,
  xApiSecret: 200,
  xAccessToken: 200,
  xAccessTokenSecret: 200,
  xCallbackUrl: 500,
  xClientId: 200,
  xClientSecret: 200,
  xApiAuthType: 20,
  fbClientId: 200,
  fbClientSecret: 200,
  fbPageAccessToken: 500,
  fbCallbackUrl: 500,
  igClientId: 200,
  igClientSecret: 200,
  igAccessToken: 500,
  igCallbackUrl: 500,
  igBusinessAccountId: 200,
  attributionModel: 30,
  liClientId: 200,
  liClientSecret: 200,
  liAccessToken: 500,
  liCallbackUrl: 500,
  ytClientId: 200,
  ytClientSecret: 200,
  ytApiKey: 200,
  ytAccessToken: 500,
  ytCallbackUrl: 500,
  ptClientId: 200,
  ptClientSecret: 200,
  ptAccessToken: 500,
  ptCallbackUrl: 500,
  tkClientId: 200,
  tkClientSecret: 200,
  tkAccessToken: 500,
  tkCallbackUrl: 500,
}

export async function PUT(req: NextRequest) {
  const auth = requireSuperAdmin(req)
  if ('error' in auth) return auth.error
  try {
    const body = await req.json()

    // 管理员密码修改：前端提交非空的 adminPassword 时，重新哈希后保存
    // （不允许前端直接写入 hash/salt，防止绕过校验）
    const newAdminPassword = typeof body.adminPassword === 'string' ? body.adminPassword.trim() : ''
    delete body.adminPassword
    delete body.adminPasswordHash
    delete body.adminPasswordSalt
    delete body.staffMembers

    const cleanBody: any = {}
    for (const [key, maxLen] of Object.entries(STRING_FIELDS)) {
      if (body[key] !== undefined) {
        if (typeof body[key] === 'string') {
          if (!validateString(body[key], maxLen)) {
            return NextResponse.json({ error: `${key} too long (max ${maxLen} chars)` }, { status: 400 })
          }
          cleanBody[key] = sanitizeString(body[key])
        } else {
          cleanBody[key] = body[key]
        }
      }
    }

    // 模型库保存保护：脱敏 Key（含 •）不覆盖真实 Key
    const curSettings = getRepository().settings.get()
    const protectLibKeys = (libKey: 'aiLLMProviders' | 'aiImageProviders' | 'aiVideoProviders') => {
      if (body[libKey] && typeof body[libKey] === 'object') {
        const current = (curSettings as any)[libKey] || {}
        cleanBody[libKey] = Object.fromEntries(
          Object.entries(body[libKey]).map(([k, v]: [string, any]) => [
            k,
            {
              ...v,
              apiKey: v?.apiKey && /•/.test(String(v.apiKey))
                ? (current[k]?.apiKey || '')
                : (v?.apiKey || ''),
            },
          ])
        )
      }
    }
    protectLibKeys('aiLLMProviders')
    protectLibKeys('aiImageProviders')
    protectLibKeys('aiVideoProviders')

    if (body.defaultShippingDays !== undefined) {
      const days = Number(body.defaultShippingDays)
      if (Number.isNaN(days) || days < 1 || days > 365) {
        return NextResponse.json({ error: 'Invalid shipping days' }, { status: 400 })
      }
      cleanBody.defaultShippingDays = days
    }
    // SMTP 端口（上线配置邮箱必需）
    if (body.smtpPort !== undefined) {
      const port = Number(body.smtpPort)
      if (Number.isNaN(port) || port < 1 || port > 65535) {
        return NextResponse.json({ error: 'Invalid SMTP port' }, { status: 400 })
      }
      cleanBody.smtpPort = port
    }
    if (body.shippingFreeThreshold !== undefined) {
      const threshold = Number(body.shippingFreeThreshold)
      if (Number.isNaN(threshold) || threshold < 0 || threshold > 999999) {
        return NextResponse.json({ error: 'Invalid shipping threshold' }, { status: 400 })
      }
      cleanBody.shippingFreeThreshold = threshold
    }
    if (body.shippingCost !== undefined) {
      const cost = Number(body.shippingCost)
      if (Number.isNaN(cost) || cost < 0 || cost > 999999) {
        return NextResponse.json({ error: 'Invalid shipping cost' }, { status: 400 })
      }
      cleanBody.shippingCost = cost
    }
    if (body.cnyUsdRate !== undefined) {
      // 人民币换算汇率 (商品编辑表单辅助换算用)
      const rate = Number(body.cnyUsdRate)
      if (Number.isNaN(rate) || rate < 1 || rate > 20) {
        return NextResponse.json({ error: 'Invalid CNY/USD rate' }, { status: 400 })
      }
      cleanBody.cnyUsdRate = Math.round(rate * 10000) / 10000
    }

    if (body.shippingZones !== undefined) cleanBody.shippingZones = body.shippingZones
    if (body.frontendContent !== undefined) cleanBody.frontendContent = body.frontendContent
    if (body.customerTiers !== undefined) cleanBody.customerTiers = body.customerTiers
    if (body.heroVideoEnabled !== undefined) cleanBody.heroVideoEnabled = Boolean(body.heroVideoEnabled)
    if (body.paypalEnabled !== undefined) cleanBody.paypalEnabled = Boolean(body.paypalEnabled)
    if (body.payoneerEnabled !== undefined) cleanBody.payoneerEnabled = Boolean(body.payoneerEnabled)
    if (body.attributionLookbackDays !== undefined) {
      const days = Number(body.attributionLookbackDays)
      if (Number.isNaN(days) || days < 1 || days > 90) {
        return NextResponse.json({ error: 'Invalid attribution lookback days' }, { status: 400 })
      }
      cleanBody.attributionLookbackDays = days
    }

    const numberFields = [
      'adminBgOverlay', 'adminBgBrightness', 'adminBgContrast',
      'adminBgSaturation', 'adminBgBlur', 'adminBgWarmth',
      'autoConfirmMinutes', 'defaultShippingDays',
      'shippingFreeThreshold', 'shippingCost',
      'notifyDuration',
    ]
    for (const field of numberFields) {
      if (body[field] !== undefined) {
        const val = Number(body[field])
        if (!Number.isNaN(val)) cleanBody[field] = val
      }
    }

    const boolFields = [
      'notifyNewOrders', 'notifyNewMessages',
      'autoAssignOrders', 'adminBgSidebar', 'aiEnabled', 'aiPetEnabled',
      'xApiEnabled',
      'fbApiEnabled',
      'igApiEnabled',
      'liApiEnabled',
      'ytApiEnabled',
      'ptApiEnabled',
      'tkApiEnabled',
      'igInsightsEnabled',
      'glassLayered',
      'glassSidebar',
      'glassTopbar',
      'glassMenus',
      'glassLists',
      'aiImageEnabled',
      'aiVideoEnabled',
      'attributionRequireVisitorMatch',
      'attributionAllowReferralFallback',
    ]

    if (body.adminPanelStyle !== undefined && typeof body.adminPanelStyle === 'string') {
      const validStyles = ['solid', 'glass', 'cyber', 'brutalist', 'gold', 'matrix', 'holo', 'mono', 'midnight', 'obsidian', 'noir', 'slate', 'aurora', 'ocean', 'sunset']
      if (validStyles.includes(body.adminPanelStyle)) {
        cleanBody.adminPanelStyle = body.adminPanelStyle
      }
    }

    if (body.sidebarHoverStyle !== undefined && typeof body.sidebarHoverStyle === 'string') {
      const validEffects = ['default', 'glass', 'apple', 'shimmer', 'indicator', 'pulse']
      if (validEffects.includes(body.sidebarHoverStyle)) {
        cleanBody.sidebarHoverStyle = body.sidebarHoverStyle
      }
    }
    for (const field of boolFields) {
      if (body[field] !== undefined) {
        cleanBody[field] = Boolean(body[field])
      }
    }

    const stringFields = [
      'siteLogo', 'adminUsername', 'smtpHost', 'smtpUser',
      'smtpFromEmail', 'autoAssignStrategy', 'autoAssignTargetStaff',
      'smtpPass',
    ]
    for (const field of stringFields) {
      if (body[field] !== undefined && typeof body[field] === 'string') {
        cleanBody[field] = sanitizeString(body[field])
      }
    }

    if (body.attributionModel !== undefined && typeof body.attributionModel === 'string') {
      const validModels = ['last_click', 'first_click']
      if (!validModels.includes(body.attributionModel)) {
        return NextResponse.json({ error: 'Invalid attribution model' }, { status: 400 })
      }
      cleanBody.attributionModel = body.attributionModel
    }

    if (body.staffMembers !== undefined) cleanBody.staffMembers = body.staffMembers

    // 管理员密码：提交了非空新密码才更新（哈希存储，明文不落库）
    if (newAdminPassword) {
      if (newAdminPassword.length < 8) {
        return NextResponse.json({ error: '管理员密码至少需要 8 位字符' }, { status: 400 })
      }
      const { hash, salt } = hashAdminPassword(newAdminPassword)
      cleanBody.adminPasswordHash = hash
      cleanBody.adminPasswordSalt = salt
      cleanBody.adminPassword = ''
    }

    const repo = getRepository()
    const updated = repo.settings.update(cleanBody)
    return NextResponse.json(sanitizeSettingsForAdmin(updated))
  } catch (e: any) {
    console.error('[Settings PUT] error:', e)
    // 修复 L14: 不回显内部错误消息
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 400 })
  }
}
