# Low Flame 商城 — 交接文档

> 本文档供接手方（AI 代理或开发者）快速了解项目结构、已实现功能与注意事项。

## 1. 项目概况

- 技术栈：Next.js 15（App Router）+ React 19 + TypeScript + Tailwind CSS 3 + better-sqlite3 + framer-motion + lucide-react
- 数据：SQLite（`data/site.db`）为主，部分功能用 JSON 文件存储（营销、促销/优惠券、推荐跟踪、会话）
- 品牌：**Low Flame**（已替换原 Oriental Treasures 品牌）
- 前后端一体：前台商城 + `/admin` 管理后台

## 2. 启动方式

```bash
npm install        # 依赖已在 node_modules，通常可跳过
npm run dev        # 开发模式 http://localhost:3000
npm run build      # 生产构建（验证用，必须通过）
npm start          # 生产模式
```

- 需要 `data/site.db` 与 `data/` 下的 JSON 文件（本仓库不提交 `data/`，见备份说明）
- 需要 `.env.local`（含数据库密钥等；本仓库不提交，需单独复制）
- 后台登录：`/admin`，账号在系统设置中配置

## 3. 目录结构要点

| 路径 | 说明 |
|---|---|
| `app/` | 页面与 API 路由（`app/admin/*` 后台、`app/api/*` 接口） |
| `components/` | 前端组件（`layout`、`product`、`admin`、`ui`、`marketing`、`chat`） |
| `lib/` | 业务逻辑与数据层（`db/` SQLite、`promotions.ts` 促销、`referral-*` 推荐跟踪、`admin-i18n.ts` 后台中文字典） |
| `context/` | 全局状态（Cart / Currency / Toast / AdminTheme） |
| `data/` | **运行数据（不提交 git）**：`site.db` + JSON 存储 |
| `public/` | 静态资源与上传文件（logo、images、uploads） |

## 4. 已实现功能清单（最近迭代）

**前台**
- 玻璃质感导航（顶部透明 / 滚动增强 / 深色毛玻璃弹出面板）、全屏首屏 Hero
- 首页 3D Showroom 商品展示（鼠标跟随倾斜 + 悬停换图 + 毛玻璃信息条）
- 商品视频：后台可上传/启用，前端商品卡悬停播放
- 商品评论：下单完成后可评论（订单核验即时展示），后台基础评论（初始展示）
- 促销/折扣：商品/分类/全站促销活动、优惠券（含新用户欢迎券），结账按折后价结算
- 品牌 Low Flame：logo、名称、favicon、SEO/OG、邮件模板已全部替换

**后台（/admin）**
- 中文显示切换：侧边栏“中文/English”，DOM 级翻译字典 `lib/admin-i18n.ts`
- 评论管理：商品/日期/审核/隐藏/类型筛选，审核、隐藏、删除
- 营销中心：Content Studio（AI 文案/配图/视频）、Post Ledger（发帖台账）、二次编辑/继续发布/重新创作、历史与草稿
- 促销优惠（`/admin/promotions`）：商品促销活动 + 优惠券管理
- 商品管理：基础评论、商品视频、图片上传

## 5. 数据存储说明

- SQLite：商品、订单、用户、评论、分类、消息等（迁移在 `lib/db/sqlite.ts` 启动时自动执行）
- JSON 文件：
  - `data/promotions.json` / `data/coupons.json` — 促销与优惠券
  - `data/marketing-content.json` / `data/social-content.json` — 营销草稿与发帖记录
  - `data/referrals.json` / `data/referral-clicks.json` — 推荐链接与点击
  - `data/admin-sessions.json` — 后台会话（含敏感 token）
- **`data/` 目录不提交 git**，交接时必须单独复制备份（见备份）

## 6. 注意事项

1. **乱码注释**：部分源码文件中的中文注释是历史遗留乱码（GBK/UTF-8 混存），不影响运行；**修改这些文件时不要整文件转码**，只改目标行即可。
2. **`.env.local`**：含密钥，不提交；交接需单独复制。
3. **端口 3000 旧服务**：机器上可能有之前启动的 `next start` 进程占用 3000，先 `netstat -ano | findstr :3000` 确认并清理。
4. **上线前必填**（后台系统设置 + 营销中心）：
   - Site URL（正式域名，用于 sitemap/OG/跟踪链接）
   - 各平台 API 凭证与回调地址（IG/FB/X 等）
   - `webhookBaseUrl` + 平台 Webhook Verify Token（需 HTTPS）
   - 邮件 SMTP 配置
5. **权限**：后台新菜单“促销优惠”映射 `products_manage` 权限；超级管理员默认全权限。
6. **验证**：改动后跑 `npx tsc --noEmit` 与 `npm run build`，通过后再交付。

## 7. 交接给 AI 代理的建议

- 先读本文件 + `PROJECT_DOCUMENTATION.md` + `项目说明书.md`
- 以 git 首次提交（`Baseline`）为基线，小步提交、可回滚
- 改动前备份 `data/` 目录；涉及数据库字段时依赖 `lib/db/sqlite.ts` 的自动迁移机制
- 后台 UI 文案沿用 `lib/admin-i18n.ts` 字典方式补充中文，不要硬改每个页面
