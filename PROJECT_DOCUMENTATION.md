# PROJECT_DOCUMENTATION

## 1. 文档目的

本文件用于让另一个 AI IDE 或新的开发者快速接管当前项目，重点覆盖：

- 技术架构与运行方式
- 核心目录结构
- 已完成模块与当前成熟度
- 未完成模块与明显缺口
- 下一步开发优先级
- 关键接手入口文件

说明：

- 本文档基于当前磁盘代码状态生成，不依赖 Git 历史。
- 本文档不包含任何密钥或敏感凭据，仅说明配置位和接入方式。
- 项目当前已从“普通电商站”演进为“电商独立站 + 后台管理 + 营销归因 + 社交运营中台”的复合系统。

---

## 2. 项目概览

### 2.1 项目定位

项目名称：`oriental-market`

项目类型：

- 跨境电商独立站
- 前后台一体化管理系统
- 社交营销与归因运营中台

业务方向：

- 东方工艺品 / 文创商品销售
- 独立站下单与支付
- 社交账号连接、发帖、流量追踪、转化归因

### 2.2 当前总体完成度判断

当前项目不是早期骨架，而是已经具备真实业务闭环：

- 前台商城可用
- 后台管理可用
- 订单与支付主链路可用
- Referral 归因链路可用
- Instagram 营销能力最完整
- 多平台社交接入已铺底，但能力不均衡

一句话总结：

> 这是一个“已可运行、已可运营、但仍在持续扩展社交营销深度”的中后期项目。

---

## 3. 技术架构

### 3.1 技术栈

- 框架：Next.js 15 App Router
- 语言：TypeScript
- 前端：React 19
- 样式：Tailwind CSS
- 动效：Framer Motion
- 图标：Lucide React
- 数据库：SQLite（`better-sqlite3`）
- 兼容存储：JSON 文件存储
- 邮件：Nodemailer
- 外部平台请求：`undici` + `https-proxy-agent`
- X/Twitter SDK：`twitter-api-v2`

关键依赖见：

- [package.json](file:///d:/2026-06-20/files-mentioned-by-the-user-zip/work/_extracted/package.json)

### 3.2 架构分层

项目采用“单仓前后端一体化 + Repository 数据抽象 + 营销中台内嵌”的架构。

#### 表现层

- `app/`：Next.js 页面与 API Route
- `components/`：通用组件、商品组件、后台组件、营销组件
- `context/`：购物车、货币、后台主题、Toast 等全局状态

#### 业务层

- `lib/`：业务核心服务层
- 包含认证、权限、商品、订单、支付、社交平台、归因、设置、仓储等逻辑

#### 数据层

- `lib/repository.ts`：统一仓储入口
- `lib/db/repository-sqlite.ts`：SQLite 实现
- JSON 数据文件位于 `data/*.json`

### 3.3 数据存储模式

项目支持双后端：

- JSON 文件后端
- SQLite 后端

统一通过 Repository 模式访问，业务代码无需关心底层差异。

关键文件：

- [repository.ts](file:///d:/2026-06-20/files-mentioned-by-the-user-zip/work/_extracted/lib/repository.ts)
- [repository-sqlite.ts](file:///d:/2026-06-20/files-mentioned-by-the-user-zip/work/_extracted/lib/db/repository-sqlite.ts)
- [sqlite.ts](file:///d:/2026-06-20/files-mentioned-by-the-user-zip/work/_extracted/lib/db/sqlite.ts)

### 3.4 权限与身份体系

当前系统存在两条主要身份链路：

- 后台管理员/员工
- 前台普通用户

后台角色包括：

- `super_admin`
- `admin`
- `staff`

权限核心文件：

- [auth.ts](file:///d:/2026-06-20/files-mentioned-by-the-user-zip/work/_extracted/lib/auth.ts)
- [permissions.ts](file:///d:/2026-06-20/files-mentioned-by-the-user-zip/work/_extracted/lib/permissions.ts)
- [middleware.ts](file:///d:/2026-06-20/files-mentioned-by-the-user-zip/work/_extracted/middleware.ts)

---

## 4. 目录结构

以下是当前项目最重要目录的接管级说明。

### 4.1 页面与 API

`app/`

- 前台页面
  - `/`
  - `/products`
  - `/products/[id]`
  - `/category/[slug]`
  - `/checkout`
  - `/account/*`
  - `/link-in-bio`
- 后台页面
  - `/admin`
  - `/admin/orders`
  - `/admin/products`
  - `/admin/marketing`
  - `/admin/settings`
  - `/admin/staff`
  - `/admin/shipping`
  - `/admin/finance`
- API
  - `/api/auth/*`
  - `/api/orders/*`
  - `/api/products/*`
  - `/api/settings`
  - `/api/referrals`
  - `/api/marketing/*`
  - `/api/paypal/*`
  - `/api/payoneer/*`
  - `/api/shipping/*`

### 4.2 组件层

`components/`

- `layout/`：站点框架、首页客户端逻辑、顶部导航
- `product/`：商品卡片、商品详情逻辑
- `referral/`：Link in Bio 前端逻辑
- `admin/`：后台编辑器与设置组件
- `ui/`：通用 UI 组件

### 4.3 业务核心

`lib/`

- 电商核心
  - `products.ts`
  - `orders.ts`
  - `categories.ts`
  - `users.ts`
- 权限与认证
  - `auth.ts`
  - `permissions.ts`
- 支付
  - `paypal-transactions.ts`
  - `payoneer-transactions.ts`
  - `payoneer-config.ts`
- 物流
  - `shipping.ts`
  - `shipping-config.ts`
  - `integrations/fourpx.ts`
- 社交与营销
  - `instagram.ts`
  - `x-twitter.ts`
  - `facebook.ts`
  - `linkedin.ts`
  - `pinterest.ts`
  - `tiktok.ts`
  - `youtube.ts`
  - `social-accounts.ts`
  - `social-content.ts`
  - `referral-links.ts`
  - `referral-client.ts`
  - `referral-tracking.ts`
  - `marketing-insights.ts`

### 4.4 数据与脚本

`data/`

- 既包含 JSON 数据，也包含 SQLite 数据库文件
- 当前可见关键数据：
  - `orders.json`
  - `products.json`
  - `settings.json`
  - `social-accounts.json`
  - `social-content.json`
  - `referrals.json`
  - `referral-clicks.json`
  - `paypal-transactions.json`
  - `payoneer-transactions.json`
  - `site.db`

`scripts/`

- 迁移与校验脚本
- 真实联调辅助脚本
- 管理员/员工恢复和密码相关脚本

---

## 5. 运行与接手方式

### 5.1 本地运行

```bash
npm install
npm run dev
```

生产构建：

```bash
npm run build
npm start
```

### 5.2 当前重要运行特征

- 项目默认可跑 JSON 后端
- 也支持 SQLite 后端
- 外部平台请求可能需要代理环境
- Instagram/Meta 等接口在某些机器上可能需要：

```bash
HTTP_PROXY=http://127.0.0.1:7890
HTTPS_PROXY=http://127.0.0.1:7890
```

### 5.3 数据后端切换

如需切 SQLite：

```bash
npx tsx scripts/migrate-json-to-sqlite.ts
```

然后设置环境变量：

```env
DATABASE_BACKEND=sqlite
```

参考：

- [项目说明书.md](file:///d:/2026-06-20/files-mentioned-by-the-user-zip/work/_extracted/项目说明书.md)

---

## 6. 当前已完成模块

以下按业务价值排序。

### 6.1 前台商城主链路

已完成：

- 首页、商品列表、商品详情、分类页、搜索页
- 购物车与 Checkout 页面
- 用户注册、登录、个人中心、订单查看、地址管理、收藏夹

关键页面：

- [app/page.tsx](file:///d:/2026-06-20/files-mentioned-by-the-user-zip/work/_extracted/app/page.tsx)
- [app/products/page.tsx](file:///d:/2026-06-20/files-mentioned-by-the-user-zip/work/_extracted/app/products/page.tsx)
- [app/products/[id]/page.tsx](file:///d:/2026-06-20/files-mentioned-by-the-user-zip/work/_extracted/app/products/[id]/page.tsx)
- [app/checkout/page.tsx](file:///d:/2026-06-20/files-mentioned-by-the-user-zip/work/_extracted/app/checkout/page.tsx)

### 6.2 后台管理主链路

已完成：

- 后台登录
- 后台仪表盘
- 商品管理
- 分类管理
- 订单管理
- 用户管理
- 员工管理
- 设置页
- 物流、财务、消息、评价等后台页面入口

关键页面：

- [app/admin/page.tsx](file:///d:/2026-06-20/files-mentioned-by-the-user-zip/work/_extracted/app/admin/page.tsx)
- [app/admin/orders/page.tsx](file:///d:/2026-06-20/files-mentioned-by-the-user-zip/work/_extracted/app/admin/orders/page.tsx)
- [app/admin/products/page.tsx](file:///d:/2026-06-20/files-mentioned-by-the-user-zip/work/_extracted/app/admin/products/page.tsx)
- [app/admin/settings/page.tsx](file:///d:/2026-06-20/files-mentioned-by-the-user-zip/work/_extracted/app/admin/settings/page.tsx)

### 6.3 订单与归因闭环

已完成：

- 创建订单
- 订单状态更新
- 订单物流与分配
- 订单详情前后台展示
- Referral 归因字段写入订单
- attribution model / matchedBy / fallback 等展示

关键文件：

- [app/api/orders/route.ts](file:///d:/2026-06-20/files-mentioned-by-the-user-zip/work/_extracted/app/api/orders/route.ts)
- [app/api/orders/[id]/route.ts](file:///d:/2026-06-20/files-mentioned-by-the-user-zip/work/_extracted/app/api/orders/[id]/route.ts)
- [lib/orders.ts](file:///d:/2026-06-20/files-mentioned-by-the-user-zip/work/_extracted/lib/orders.ts)
- [lib/referral-tracking.ts](file:///d:/2026-06-20/files-mentioned-by-the-user-zip/work/_extracted/lib/referral-tracking.ts)

### 6.4 支付

已完成：

- PayPal 下单与 capture
- Payoneer 下单创建
- Payoneer 交易拉取与订单匹配
- Payoneer 交易同步时补归因回写

关键文件：

- [app/api/create-paypal-order/route.ts](file:///d:/2026-06-20/files-mentioned-by-the-user-zip/work/_extracted/app/api/create-paypal-order/route.ts)
- [app/api/capture-paypal-order/route.ts](file:///d:/2026-06-20/files-mentioned-by-the-user-zip/work/_extracted/app/api/capture-paypal-order/route.ts)
- [app/api/create-payoneer-order/route.ts](file:///d:/2026-06-20/files-mentioned-by-the-user-zip/work/_extracted/app/api/create-payoneer-order/route.ts)
- [app/api/payoneer/transactions/route.ts](file:///d:/2026-06-20/files-mentioned-by-the-user-zip/work/_extracted/app/api/payoneer/transactions/route.ts)

### 6.5 Referral / 营销归因系统

已完成：

- Referral Link 创建
- 点击记录
- 访问者 visitorId
- 归因模型：
  - last_click
  - first_click
- lookback window
- visitor match
- fallback
- 渠道维度：
  - bio
  - story
  - post
  - direct

关键文件：

- [app/api/referrals/route.ts](file:///d:/2026-06-20/files-mentioned-by-the-user-zip/work/_extracted/app/api/referrals/route.ts)
- [lib/referral-links.ts](file:///d:/2026-06-20/files-mentioned-by-the-user-zip/work/_extracted/lib/referral-links.ts)
- [lib/referral-client.ts](file:///d:/2026-06-20/files-mentioned-by-the-user-zip/work/_extracted/lib/referral-client.ts)
- [lib/referral-tracking.ts](file:///d:/2026-06-20/files-mentioned-by-the-user-zip/work/_extracted/lib/referral-tracking.ts)

### 6.6 Link in Bio / Product 深链承接

已完成：

- 专用 `/link-in-bio` 落地页
- 商品详情页保留 referral 和 channel
- Checkout 成功页回流 referral 信息
- Story / Bio / Product 三段漏斗展示

关键文件：

- [app/link-in-bio/page.tsx](file:///d:/2026-06-20/files-mentioned-by-the-user-zip/work/_extracted/app/link-in-bio/page.tsx)
- [components/referral/LinkInBioClient.tsx](file:///d:/2026-06-20/files-mentioned-by-the-user-zip/work/_extracted/components/referral/LinkInBioClient.tsx)
- [components/product/ProductDetailClient.tsx](file:///d:/2026-06-20/files-mentioned-by-the-user-zip/work/_extracted/components/product/ProductDetailClient.tsx)
- [app/checkout/page.tsx](file:///d:/2026-06-20/files-mentioned-by-the-user-zip/work/_extracted/app/checkout/page.tsx)

### 6.7 社交账号接入与发帖台账

已完成：

- 社交账号连接模型
- 社交内容记录模型
- 发帖记录台账
- 管理员看全部、员工只看自己
- 帖子总表类订单页
- 单帖详情弹层

关键文件：

- [lib/social-accounts.ts](file:///d:/2026-06-20/files-mentioned-by-the-user-zip/work/_extracted/lib/social-accounts.ts)
- [lib/social-content.ts](file:///d:/2026-06-20/files-mentioned-by-the-user-zip/work/_extracted/lib/social-content.ts)
- [app/api/marketing/social-accounts/route.ts](file:///d:/2026-06-20/files-mentioned-by-the-user-zip/work/_extracted/app/api/marketing/social-accounts/route.ts)
- [app/api/marketing/social-content/route.ts](file:///d:/2026-06-20/files-mentioned-by-the-user-zip/work/_extracted/app/api/marketing/social-content/route.ts)
- [app/admin/marketing/page.tsx](file:///d:/2026-06-20/files-mentioned-by-the-user-zip/work/_extracted/app/admin/marketing/page.tsx)

### 6.8 Instagram：当前最完整的平台

已完成：

- OAuth 接入
- profile / timeline
- API 直发
- 真实发布打通
- 健康检查
- 官方 Insights 拉取
- 多 Instagram 账号切换 / 并列 Health
- 多 Instagram 账号切换 / 并列 Official Insights
- 单帖官方指标与单帖漏斗

关键文件：

- [lib/instagram.ts](file:///d:/2026-06-20/files-mentioned-by-the-user-zip/work/_extracted/lib/instagram.ts)
- [app/api/marketing/instagram-oauth/route.ts](file:///d:/2026-06-20/files-mentioned-by-the-user-zip/work/_extracted/app/api/marketing/instagram-oauth/route.ts)
- [app/api/marketing/instagram-publish/route.ts](file:///d:/2026-06-20/files-mentioned-by-the-user-zip/work/_extracted/app/api/marketing/instagram-publish/route.ts)
- [app/api/marketing/instagram-health/route.ts](file:///d:/2026-06-20/files-mentioned-by-the-user-zip/work/_extracted/app/api/marketing/instagram-health/route.ts)
- [app/api/marketing/instagram-insights/route.ts](file:///d:/2026-06-20/files-mentioned-by-the-user-zip/work/_extracted/app/api/marketing/instagram-insights/route.ts)

### 6.9 多平台社交基础接入

当前已具备基础接入的平台：

- Instagram
- X / Twitter
- Facebook
- LinkedIn
- Pinterest
- TikTok
- YouTube

说明：

- 并不表示这些平台都已达到 Instagram 一样的成熟度
- 更多是“OAuth / profile / timeline / publish 的基础接口已铺设”

相关目录：

- `app/api/marketing/*-oauth/*`
- `app/api/marketing/*-profile/*`
- `app/api/marketing/*-timeline/*`
- `app/api/marketing/*-publish/*`

---

## 7. 当前未完成模块与明显缺口

以下是接手者应优先理解的“未完成”部分。

### 7.1 PayPal 拉单同步未补归因回写

现状：

- Payoneer 的交易同步已回写 attribution
- PayPal 的交易拉单同步还没有补同等归因处理

影响：

- 两条支付链的数据口径不完全一致
- 会影响营销归因统计准确性

关键对比文件：

- [app/api/payoneer/transactions/route.ts](file:///d:/2026-06-20/files-mentioned-by-the-user-zip/work/_extracted/app/api/payoneer/transactions/route.ts)
- [app/api/paypal/transactions/route.ts](file:///d:/2026-06-20/files-mentioned-by-the-user-zip/work/_extracted/app/api/paypal/transactions/route.ts)

### 7.2 Instagram Carousel 未真正落地

现状：

- 类型层已经出现 Carousel 意图
- 但真实多图 children 容器逻辑未完整实现

影响：

- 当前 Instagram 更适合单图/单视频发帖

关键文件：

- [lib/instagram.ts](file:///d:/2026-06-20/files-mentioned-by-the-user-zip/work/_extracted/lib/instagram.ts)

### 7.3 评论 / 私信 / 更深层社交运营未完成

现状：

- Instagram 评论管理、私信管理仍未完成
- X/Facebook/LinkedIn 等平台也缺评论、私信、深层表现数据

影响：

- 当前系统更偏“发帖 + 引流 + 转化”
- 还不是完整 Social CRM

### 7.4 除 Instagram 外，其他平台 Insights 能力不足

现状：

- Instagram 已有官方 Insights
- 其他平台当前多为 pending / partial

影响：

- 主看板虽然已支持多平台能力矩阵
- 但真实官方表现数据仍高度偏向 Instagram

### 7.5 多触点与跨设备归因仍是 backlog

未完成方向：

- Story tap 独立统计
- cross-device attribution
- weighted multi-touch attribution

这些已作为 backlog 在营销后台中显式展示，但尚未落地为真实逻辑。

### 7.6 Payoneer 更接近“拉单确认”，不是完整 webhook 闭环

现状：

- 已有支付创建和交易同步
- 但更偏后台拉取确认，而非完整异步支付成功回调闭环

---

## 8. 当前进行中 / 半完成模块

### 8.1 X / Twitter

成熟度：中高

已有：

- 授权
- profile
- timeline
- publish

说明：

- 可用，但在部分失败场景仍会回退到分享窗
- 还不是完全稳定的纯 API 运营闭环

### 8.2 Facebook / LinkedIn

成熟度：中

已有：

- OAuth 基础
- profile / timeline
- publish 基础

缺口：

- 官方 Insights 深度不足
- 运营后台专项能力不够完整

### 8.3 TikTok / YouTube / Pinterest

成熟度：中低

已有：

- 基础 OAuth / profile / timeline / publish 接口

缺口：

- 真实运营流程未充分验证
- 官方表现数据与后台专项看板不足

---

## 9. 当前主面板与营销中台状态

当前营销后台已经不是单一页面，而是一个相对完整的运营中台。

### 9.1 已有主看板能力

- 平台能力矩阵
- 多账号运营看板
- 系统级开发者连接器状态
- 员工 OAuth 授权状态
- Instagram Publish Readiness
- Official Meta Insights Readiness
- Story / Bio / Product Funnel
- Post Ledger Snapshot
- Post Data Ledger

主文件：

- [app/admin/marketing/page.tsx](file:///d:/2026-06-20/files-mentioned-by-the-user-zip/work/_extracted/app/admin/marketing/page.tsx)

### 9.2 当前帖子总表能力

已支持：

- 类订单样式的一行一帖
- 账户 / 内容 / 状态 / Views / Clicks / Revenue / Conversions / Rate
- 搜索
- 按平台筛选
- 按状态筛选
- 点击进入单帖详情
- 管理员全量 / 员工个人范围控制

---

## 10. 已知重要约束

### 10.1 系统级开发者配置 vs 员工级 OAuth 授权

当前系统遵循：

- 公司统一维护开发者应用配置
- 员工不需要各自再创建开发者 App
- 员工只需把自己的社交账号授权给系统

这已经在营销后台中明确拆分为两块展示：

- System-level Developer Connectors
- Employee Authorization Status

### 10.2 管理员与员工可见范围

当前约定：

- 管理员可以总览所有员工、所有账号、所有帖子
- 员工只能查看自己的账号和自己的帖子

这一点已在接口层和前端层同时收口。

### 10.3 Meta / Instagram 网络代理约束

在部分环境下，服务端访问 Meta API 可能需要代理，否则会出现超时或不可达。

### 10.4 Instagram 普通帖子链接不可点击

系统设计上已通过：

- Link in Bio
- Story Link
- Product Deep Link

来规避 Instagram 普通贴文 caption 链接不可点击的问题。

---

## 11. 下一步开发计划

建议按优先级推进，不要同时分散到过多平台。

### 第一优先级：补齐支付归因口径

目标：

- 将 PayPal 交易同步补成与 Payoneer 一致的 attribution 回写逻辑

原因：

- 这是当前最直接影响“营收归因准确性”的缺口

### 第二优先级：继续深挖 Instagram

目标：

- Carousel 发布
- 评论管理
- 私信能力
- 更完整的单帖官方指标
- 更丰富的账号级/帖子级 drill-down

原因：

- Instagram 已是当前最成熟平台
- 在该平台继续深挖收益最高

### 第三优先级：把 Post Ledger 继续升级成“订单级后台体验”

建议增强项：

- 时间范围筛选
- 员工筛选
- 账号筛选
- Views / Clicks / Revenue / Conversion 排序
- 批量操作
- 导出 CSV / Excel

### 第四优先级：平台分层推进

建议顺序：

1. Instagram
2. X / Twitter
3. Facebook / LinkedIn
4. TikTok / YouTube / Pinterest

原因：

- 避免七个平台同时深挖导致系统复杂度失控

### 第五优先级：多触点归因升级

建议顺序：

1. Story tap 独立统计
2. cross-device attribution
3. weighted multi-touch attribution

---

## 12. 建议接手入口

如果另一个 AI IDE 要快速接手，建议按以下顺序阅读。

### 第一组：项目骨架

1. [package.json](file:///d:/2026-06-20/files-mentioned-by-the-user-zip/work/_extracted/package.json)
2. [middleware.ts](file:///d:/2026-06-20/files-mentioned-by-the-user-zip/work/_extracted/middleware.ts)
3. [lib/repository.ts](file:///d:/2026-06-20/files-mentioned-by-the-user-zip/work/_extracted/lib/repository.ts)
4. [lib/auth.ts](file:///d:/2026-06-20/files-mentioned-by-the-user-zip/work/_extracted/lib/auth.ts)

### 第二组：订单与支付

1. [app/api/orders/route.ts](file:///d:/2026-06-20/files-mentioned-by-the-user-zip/work/_extracted/app/api/orders/route.ts)
2. [app/api/capture-paypal-order/route.ts](file:///d:/2026-06-20/files-mentioned-by-the-user-zip/work/_extracted/app/api/capture-paypal-order/route.ts)
3. [app/api/paypal/transactions/route.ts](file:///d:/2026-06-20/files-mentioned-by-the-user-zip/work/_extracted/app/api/paypal/transactions/route.ts)
4. [app/api/payoneer/transactions/route.ts](file:///d:/2026-06-20/files-mentioned-by-the-user-zip/work/_extracted/app/api/payoneer/transactions/route.ts)

### 第三组：营销与归因

1. [lib/referral-tracking.ts](file:///d:/2026-06-20/files-mentioned-by-the-user-zip/work/_extracted/lib/referral-tracking.ts)
2. [lib/referral-links.ts](file:///d:/2026-06-20/files-mentioned-by-the-user-zip/work/_extracted/lib/referral-links.ts)
3. [lib/referral-client.ts](file:///d:/2026-06-20/files-mentioned-by-the-user-zip/work/_extracted/lib/referral-client.ts)
4. [app/api/referrals/route.ts](file:///d:/2026-06-20/files-mentioned-by-the-user-zip/work/_extracted/app/api/referrals/route.ts)

### 第四组：社交平台与营销中台

1. [app/admin/marketing/page.tsx](file:///d:/2026-06-20/files-mentioned-by-the-user-zip/work/_extracted/app/admin/marketing/page.tsx)
2. [lib/social-accounts.ts](file:///d:/2026-06-20/files-mentioned-by-the-user-zip/work/_extracted/lib/social-accounts.ts)
3. [lib/social-content.ts](file:///d:/2026-06-20/files-mentioned-by-the-user-zip/work/_extracted/lib/social-content.ts)
4. [app/api/marketing/social-content/route.ts](file:///d:/2026-06-20/files-mentioned-by-the-user-zip/work/_extracted/app/api/marketing/social-content/route.ts)
5. [lib/instagram.ts](file:///d:/2026-06-20/files-mentioned-by-the-user-zip/work/_extracted/lib/instagram.ts)
6. [app/api/marketing/instagram-insights/route.ts](file:///d:/2026-06-20/files-mentioned-by-the-user-zip/work/_extracted/app/api/marketing/instagram-insights/route.ts)

---

## 13. AI 接管建议

如果由另一个 AI IDE 继续开发，建议遵守以下策略：

### 13.1 先不要重构全局架构

原因：

- 当前系统已形成真实业务闭环
- 更适合“沿现有结构持续增强”
- 大规模重构会增加风险

### 13.2 优先在现有营销页上扩展

原因：

- `app/admin/marketing/page.tsx` 已经是实际的运营总面板
- 新能力优先接入该页，符合当前产品方向

### 13.3 新平台优先走“统一骨架”

建议复用这套结构：

- social account
- social content record
- referral link
- official health
- official insights
- post ledger

### 13.4 先补短板，再做新花样

推荐顺序：

1. PayPal 归因同步
2. Instagram Carousel / 评论 / 私信
3. Post Ledger 排序筛选
4. 其他平台 Insights
5. 多触点归因

---

## 14. 结论

当前项目已经具备以下交接价值：

- 不是仅有页面壳子，而是带真实业务数据结构
- 不是仅有电商流程，而是带营销归因与社交运营闭环
- 不是只支持单账号，而是已进入多账号、多员工、多平台阶段

当前最适合的接管方式是：

> 在保留现有 Next.js 单仓结构的前提下，继续沿着“订单支付准确化 + Instagram 深化 + 帖子总表增强 + 其他平台补齐”的路线迭代。

