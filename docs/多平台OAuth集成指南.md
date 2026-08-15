# 多平台 OAuth 集成指南（Low Flame 后台实战）

> 适用：任何需要接入多个第三方平台（Instagram / Facebook / X / LinkedIn / YouTube / Pinterest / TikTok）OAuth 的项目。
> 本文档提炼自 `app/api/marketing/social-oauth/*`、`lib/social-oauth-store.ts`、各平台 `lib/*.ts` 的实际实现。

---

## 1. 总览：统一入口 + 注册表

**核心思想**：所有平台的 OAuth 走同一个入口路由，差异全部收敛到一张注册表里。

```
前端按钮（任意平台）
  └─ GET /api/marketing/social-oauth?platform=instagram&staffId=xxx
       ├─ 查 PLATFORM_CONFIG[platform] 注册表
       ├─ 校验：平台启用? clientId 配置? 权限?
       ├─ 生成 state（crypto 随机） + PKCE verifier/challenge
       ├─ savePendingSocialOAuth(platform, state, {...})
       └─ 返回 { authUrl }（按平台模板拼装）
            └─ 前端 window.location.href = authUrl
                 └─ 用户在平台授权页登录+同意
                      └─ 平台 302 回 /api/marketing/social-oauth/callback?platform=xxx&code=..&state=..
                           ├─ 校验 state（必须精确匹配，防 CSRF）
                           ├─ exchangeCode（换 access_token + refresh_token）
                           ├─ 拉取用户信息（昵称/头像）
                           ├─ addSocialAccount / updateSocialAccount
                           └─ 302 回前端发起页 ?platform_auth=success
```

## 2. 注册表（后端）

```ts
const PLATFORM_CONFIG: Record<string, {
  enabledKey: string       // 设置项：平台开关
  clientIdKey: string      // 设置项：Client ID/Key
  clientSecretKey: string  // 设置项：Client Secret
  callbackUrlKey: string   // 设置项：回调地址（可空，空则用当前 origin）
  authUrl: string          // 授权端点
  tokenUrl: string         // 换 token 端点
  scope: string            // 默认 scope 列表
}> = {
  instagram: {
    enabledKey: 'igApiEnabled', clientIdKey: 'igClientId',
    clientSecretKey: 'igClientSecret', callbackUrlKey: 'igCallbackUrl',
    authUrl: 'https://www.instagram.com/oauth/authorize',
    tokenUrl: 'https://api.instagram.com/oauth/access_token',
    scope: 'instagram_business_basic',
  },
  tiktok: {
    enabledKey: 'tkApiEnabled', clientIdKey: 'tkClientId',
    clientSecretKey: 'tkClientSecret', callbackUrlKey: 'tkCallbackUrl',
    authUrl: 'https://www.tiktok.com/v2/auth/authorize/',  // 注意 v2 端点带尾斜杠
    tokenUrl: 'https://open.tiktokapis.com/v2/oauth2/token/',
    scope: 'user.info.basic,video.list,video.publish',
  },
  // facebook / linkedin / youtube / pinterest / x 同构
}
```

## 3. 安全三板斧

### 3.1 state（防 CSRF）

```ts
function generateOAuthState(): string {
  return crypto.randomBytes(16).toString('hex')  // 必须 crypto 随机，禁止 Math.random
}
// 回调时：
const pending = getPendingSocialOAuth(platform, state)
if (!pending) return redirect('?error=expired')   // 精确匹配，不做任何回退
```

### 3.2 PKCE（防授权码截获）

```ts
const codeVerifier = generateCodeVerifier()                    // base64url 32 字节
const codeChallenge = generateCodeChallenge(codeVerifier)      // sha256 → base64url
// 授权链接带上：
params.set('code_challenge', codeChallenge)
params.set('code_challenge_method', 'S256')
// 换 token 时回传 code_verifier
```

> Facebook 走服务端机密流程可不带 PKCE；其余平台统一 S256。

### 3.3 Token 脱敏（防泄漏）

```ts
// 列表接口返回前剥离 token，只给布尔标志
const safeAccounts = accounts.map(({ accessToken, refreshToken, ...safe }) => ({
  ...safe,
  hasAccessToken: !!accessToken,
  hasRefreshToken: !!refreshToken,
}))
```

## 4. Token 生命周期

### 4.1 存储

`data/social-accounts.json`（JSON 后端）/ SQLite 表（当前后端）：
`{ id, staffId, staffName, platform, username, avatar, accessToken, refreshToken, status, lastSync }`

### 4.2 自动刷新（55 分钟阈值）

```ts
const shouldRefresh = !account.lastSync ||
  (Date.now() - new Date(account.lastSync).getTime() > 55 * 60 * 1000)
if (account.refreshToken && shouldRefresh) {
  const newTokens = await refreshToken(account.refreshToken)
  updateSocialAccount(accountId, {
    accessToken: newTokens.accessToken,
    refreshToken: newTokens.refreshToken,   // 注意：部分平台（Instagram 长期令牌）刷新后必须回写新 refreshToken
    lastSync: new Date().toISOString(),
  })
}
```

### 4.3 调用失败二次刷新

接口先试现有 token，401/过期错误时再用 refreshToken 换新重试一次；仍失败才返回「请重新登录」。

## 5. 权限与多角色

```ts
// 非管理员只能用自己的身份发起 OAuth；管理员可代员工发起
const isAdmin = ['super_admin', 'admin'].includes(auth.user.role)
const staffId = isAdmin ? (searchParams.get('staffId') || auth.user.id) : auth.user.id

// 发布/管理接口校验账号归属
if (!canUserManageAccount(auth.user, account)) return 403
```

## 6. 平台差异备忘录

| 平台 | 注意点 |
|---|---|
| Instagram | 长期令牌刷新后会**滚动** refreshToken，必须持久化新值；权限需 Meta 后台审核 |
| TikTok | v2 端点；授权用 `client_key` 参数（非 client_id）；**Client Key 区分大小写**（全小写）；沙箱环境有独立 key；未审核应用必须走沙箱 + 目标用户 |
| Facebook | 页面令牌可长期化；webhook 需签名校验 |
| X | 需要 Elevated Access；DM 权限单独申请 |
| Pinterest | 无私信 API；评论 API v5 可用 |
| LinkedIn | openid/profile/email + w_member_social |
| YouTube | Google OAuth；scope 用完整 URI 形式 |

## 7. 前端接入示例（通用按钮）

```tsx
const handleConnect = async (platform: string) => {
  const res = await fetch(`/api/marketing/social-oauth?platform=${platform}&staffId=${me.id}`, { credentials: 'include' })
  const data = await res.json()
  if (data.authUrl) window.location.href = data.authUrl   // 直接整页跳转，保证第三方 cookie 可用
}
```

---

*整理自 Low Flame 后台实际代码 · 2026-08-15*
