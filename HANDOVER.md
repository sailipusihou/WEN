# 交接文档 — Low Flame 商城

> 给接手这个项目的开发者（无论人或 AI）看的。
> 最后更新：2026-09-29

---

## 0. 先读这一段（最重要）

**这个项目踩过的坑比一般的多，而且有几个是"看起来成功其实没成功"的类型。** 如果你只读一段，请读这段：

| 陷阱 | 表现 | 怎么避免 |
|---|---|---|
| **部署静默失败** | 脚本打印"部署成功"、页面全 200，但服务器跑的还是旧构建 | 部署脚本现在会比对 `BUILD_ID`，不一致直接报错。**永远不要只看页面 200 就认为生效了** |
| **用 PowerShell 改源码** | `Set-Content` 会把中文变乱码、吞掉反引号、粘连换行 | **只用编辑器/edit 工具改文件，绝不用 PowerShell 写文件内容** |
| **改了 `.next` 却忘了 `public/`** | 换图片/logo 后线上没变化 | 部署脚本已支持同步 `public/`（排除 `uploads`），但如果你用别的方式部署，记得静态资源要单独同步 |
| **`rowToOrder` 映射不全** | 服务端拿到的 `orderNo` 是 `undefined` | 往 `orders` 表加字段时，**必须同时改 `rowToOrder` 映射 + update 白名单**，否则数据读不出也写不进 |
| **`Product` 接口有两份定义** | 加字段后 TS 报"不存在该属性" | `lib/db.ts` 和 `lib/products.ts` 各有一个 `Product`，改的时候都要改 |
| **钱包/支付按钮点了没反应** | PayPal / Apple Pay / Google Pay 点击无响应 | 第三方支付组件会**吞掉 click**，必须用原生 `addEventListener` 绑在元素本身上，不能只靠组件的 `onClick` |
| **测试发邮件的接口** | 会真的把邮件发给客户 | 所有外发接口都有 `dryRun`，**测试时永远先用 dryRun** |

---

## 1. 项目概况

```
类型     Next.js 15 App Router + React 19 + TypeScript 跨境电商独立站
样式     Tailwind CSS 3（大量内联 style，配色用十六进制硬编码）
数据库   better-sqlite3（同步驱动，文件 data/site.db）
组件库   lucide-react（图标）+ framer-motion（动画）
包管理   npm
```

**目录结构**

```
WEN/
├── app/                          # Next.js App Router
│   ├── page.tsx                  # 首页
│   ├── products/                 # 商品列表 + [id] 详情
│   ├── cart/  checkout/          # 购物车 / 结算
│   ├── admin/                    # 后台（orders / products / settings 等 20 个子页）
│   │   └── orders/page.tsx       # ★ 最大的单文件（约 3000 行），订单管理
│   └── api/                      # 全部 API 路由
├── components/
│   ├── product/ProductCard.tsx   # 列表页商品卡
│   ├── product/ShowroomCard.tsx  # 首页商品卡（带玻璃信息条）
│   ├── product/QuickViewModal.tsx# 快速查看弹窗
│   ├── cart/CartExpressCheckout.tsx # 购物车直接支付
│   ├── checkout/WalletButtons.tsx   # ★ 支付钱包按钮（592 行，坑最多）
│   └── layout/Header.tsx Footer.tsx
├── lib/
│   ├── db/sqlite.ts              # ★ 表结构 + 迁移（ALTER TABLE 都在这里）
│   ├── db/repository-sqlite.ts   # ★ 数据仓库（2200+ 行，读写都在这）
│   ├── orders.ts / db.ts         # 类型定义（注意 Product 有两份）
│   ├── email.ts                  # 邮件模板 + sendEmail
│   └── paypal-sdk.ts             # PayPal SDK 加载器（结算页/购物车共用）
├── public/images/                # 静态资源（logo 等）
├── scripts/deploy/               # 部署与运维脚本
└── scripts/tools/                # 图标/图片处理脚本
```

---

## 2. 部署（重点）

### 生产环境

```
域名     https://lowflame.store
服务器   43.110.46.49（阿里云香港，2 核 2GB，Ubuntu 22.04）
路径     /var/www/lowflame
进程     pm2（name: lowflame，端口 3000）
Web      nginx（反代 3000）
```

### 部署方式：**本地构建 → 上传产物 → 服务器零构建**

```powershell
# 1. 类型检查 + 构建
npx tsc --noEmit
npm run build

# 2. 提交并推送
git add -A
git commit -m "..."
git push origin master          # 需要代理 http://127.0.0.1:7890

# 3. 部署（会自动校验 BUILD_ID）
#    ⚠️ 2026-09-17 起 SSH 密码登录已关闭，必须用密钥。所有部署脚本都认 SSH_KEY。
$env:SSH_KEY='D:\2026-06-20\lowflame-server-key'
node scripts/deploy/fast-deploy.cjs
```

**为什么不在服务器上构建**：这台机器只有 2GB 内存，Next.js 构建会把它压死（历史上多次导致站点不可用）。构建产物是**可移植的** —— Windows 路径只出现在 route manifest 的显示标签里，模块加载用的是数字 id。

### 部署脚本会做三件事

```
1. tar .next（排除 .next/cache ≈ 635MB）→ 约 5MB
2. tar public（排除 public/uploads）→ 约 7MB
   ⚠️ 必须排除 uploads —— 那是服务器上的用户上传文件，本地那份是旧副本
3. 解压、重启 pm2、比对 BUILD_ID、验证 6 个页面
```

---

## 3. 安全事件（2026-09-16，已处理）

**服务器曾被 root 级入侵。** 完整记录：

### 事件时间线

```
9/12 05:20  植入 LD_PRELOAD rootkit（/etc/ld.so.preload → /usr/lib/libproc.so）
            劫持 readdir/lstat/stat/open → 让 ls/find/ps 看不到恶意文件
9/13 05:42  往 /root/.ssh/authorized_keys 加入 2 把攻击者公钥（绕过密码）
9/15 14:12  创建后门账户 pakchoi（UID 0 + NOPASSWD sudo）+ 一次对外 SSH 连接
9/15 16:29  写入 /root/.bashrc 与 .profile 的登录触发后门
9/12 起     crontab：每分钟从 C2（195.178.110.29）拉脚本执行、
            每 3 分钟看矿机守护、每 30 分钟重建后门账户、@reboot 拉起
            矿机 XMRig 占满 2 核 → 网站频繁"打不开"
```

### 入侵途径

```
SSH 配置：PermitRootLogin yes + PasswordAuthentication yes
失败登录：51,803 次（主要来自 51.91.64.198 / 51.222.47.156 / 109.160.32.x 代理池）
防护：    没有 fail2ban → 密码被暴力破解猜中
```

### 已完成的清理与加固

```
清理：矿机进程 + 4 个伪装守护 / LD_PRELOAD rootkit / 后门账户 /
      SSH 公钥后门 / crontab 恶意条目 / .bashrc+.profile 登录后门 / C2 封禁

加固：fail2ban（已封多个 IP）/ ufw 只放行 22,80,443 /
      SSH MaxAuthTries 3 + 关闭端口转发 / unattended-upgrades 自动安全更新 /
      rkhunter + chkrootkit / watchdog.sh（应用假死自动重启，待安装 cron）
```

### ⚠️ 遗留事项

| 事项 | 状态 |
|---|---|
| **是否重装系统** | ❗**强烈建议重装**。root 级入侵后"清理≠安全"，攻击者可改任何文件。目前只是应急止血 |
| PayPal API Secret | ✅ 已轮换并实测通过 |
| SSH root 密码 | ✅ 已换 |
| 后台管理员密码 | ✅ 已换 |
| PayPal 账户登录密码 | ✅ 用户自己改过 |
| 检查 PayPal 有无异常交易 | ❓ 需用户人工核对 |

---

## 4. 已知的代码坑（都踩过）

### 4.1 `Product` 类型有两份

```
lib/db.ts      export interface Product { ... }
lib/products.ts export interface Product { ... }
```
加字段时**两个都要改**，否则 TS 报"对象字面量不能指定未知属性"。

### 4.2 往 orders 表加字段必须改三处

```
① lib/db/sqlite.ts          —— addOrderCol('字段名', 'TEXT')  迁移
② lib/db/repository-sqlite.ts
     · rowToOrder()          —— 读取映射（漏了 → 服务端拿到 undefined）
     · orderRepo.update()    —— 写入白名单（漏了 → 更新静默失效）
③ lib/orders.ts             —— Order 接口
```

**实例**：`orderNo` 一直没在 `rowToOrder` 里映射，导致催付邮件写成 "Order reference: undefined"。

### 4.3 第三方支付组件会吞掉点击

```jsx
// ❌ 无效：Apple Pay / Google Pay 自定义元素不冒泡 click
<apple-pay-button onClick={handler} />

// ✅ 有效：原生监听器绑在元素本身
useEffect(() => {
  const el = ref.current
  el.addEventListener('click', handler)
  return () => el.removeEventListener('click', handler)
}, [])
```

涉及：`components/checkout/WalletButtons.tsx`。

### 4.4 PayPal SDK 的 locale 必须用下划线

```js
// ❌ navigator.language 返回 "en-US"，PayPal 会直接 400、SDK 不加载
// ✅ 必须转换
const locale = (navigator.language || 'en_US').replace('-', '_')
```
见 `lib/paypal-sdk.ts`。

### 4.5 `WalletButtons` 自己不渲染 PayPal 按钮

它只渲染 Apple Pay / Google Pay。**PayPal 按钮要由父组件渲染进 `leading` 容器**：

```jsx
<WalletButtons
  leading={<div id="xxx-paypal-container" />}
  ...
/>
// 另外还要 useEffect 里 paypal.Buttons({...}).render('#xxx-paypal-container')
```

漏了这一步的结果：页面上只剩一条 "or" 分隔线，PayPal 主按钮完全消失。

### 4.6 未付款订单会自然产生

客户点钱包/PayPal 按钮时，**站内会立刻建一张 `unpaid` 订单**（服务端要先核价才能创建 PayPal 订单）。若客户在付款窗口放弃，订单就留下。

处理方式：后台有「Unpaid」专区 + 一键催付（`/api/orders/remind`，支持 `dryRun`）。

### 4.7 `better-sqlite3` 是同步驱动

每条查询都会**阻塞 Node 事件循环**。全站 `force-dynamic`（无缓存）+ N+1 查询，
一旦某个查询变慢（缺索引全表扫描）就可能把服务卡死。
往新表加外键关联查询时，**记得建索引**。

### 4.8 站点设置里的 logo 会覆盖代码默认值

`settings.site_settings.siteLogo` 当前是 `/images/low-flame-logo.png`，
所以**替换这个文件就能全站生效**。但如果用户在后台传了自定义 logo，那个会优先。

---

## 5. 当前功能状态

### 已完成并验证

```
商品页   规格款式选择（价格/图片联动）、赠品绑定、配套商品（搭配购买）
         悬停浮出 Quick view + Add to cart、快速查看弹窗
商品卡   首页与列表页均有悬停浮出按钮；已移除悬停切图与 3D 倾斜
购物车   直接支付（PayPal / Apple Pay / G Pay）+ Checkout
结算页   半屏布局、钱包快捷支付、运费/优惠实时计算
后台     商品管理（规格/赠品/搭配，均可本地传图）、订单「待付款」专区 +
         一键催付、订单列表可展开（修复了 undefined.toFixed 导致整页崩溃）
品牌     logo 已换（原色 #F2F1EE 白色线条 + 深色圆底）、方形 favicon/PWA 图标
```

### 待办

```
· 🔴 凭据轮换**未完成**（攻击者拿过旧机器的 root，机器上所有凭据都要视为已泄露）
    ✅ 已换：PayPal Client Secret、后台管理员密码、SSH root 密码；社媒 3 个账号已断开
    ⏸ **待换（用户 2026-09-17 决定暂缓）**：
       · Resend API Key —— 发邮件用，字段 `smtpPass`（smtp.resend.com）
       · DeepSeek —— `aiApiKey` / `aiCopyApiKey`（对话与文案）
       · 火山方舟 ARK —— `aiImageApiKey` / `aiImageRefApiKey`（生图）
       · MiniMax —— `aiVideoApiKey`（视频）
       · X/Twitter 开发者应用 —— `xApiKey` / `xApiSecret` / `xClientId` / `xClientSecret`
       · Facebook 应用 —— `fbClientId`（App Secret 一并重置）
       ⚠️ 这些都还在数据库里、也还在线上使用中，泄露状态下攻击者可直接消耗你的额度/余额
    ✅ 阿里云账号（2026-09-17 查过）：MFA **原本就已绑定**（不是这次才加的）；
       「AccessKey 管理」页**没有任何 AccessKey** —— 主账号没有长期凭据后门
       ☐ 仍待查：RAM **子账号**（访问控制 → 用户）—— 那是独立一处，
         「AccessKey 管理」页只覆盖主账号；顺带看一眼 RAM 角色
    ☐ GitHub 密码（若与服务器密码相同）
    ☐ 核对 PayPal 有无异常交易
· ✅ next@15.1.0 的已知漏洞**已修**（2026-09-29 升到 15.5.26，详见下方第 4 次入侵记录）
· 参考站还有几个元素没做：DELIVERY COST CALCULATOR 折叠运费计算器、
  WISHLIST(n) 带数字的收藏
· 搭配商品各自的规格下拉
· lib/db/repository-sqlite.ts 里有 24 行注释是乱码（历史遗留，仅注释，不影响编译）

已完成（2026-09-17）：
· 服务器重装（阿里云「更换操作系统」，IP 不变）+ 安全基线六步
  （fail2ban / ufw / SSH 加固 / 自动更新 / rkhunter + chkrootkit）
· 数据与上传文件恢复、应用重新部署、PM2 开机自启、HTTPS 重新签发
· 后台管理员密码已更换（新密码在本地「新后台管理员密码.txt」）
· SSH root 密码已轮换为 28 位随机串（本地「新建 文本文档.txt」）
· PayPal Client Secret 已轮换（新值存本地「PayPal新密钥.txt」；
  更新用 `scripts/deploy/update-paypal-creds.cjs`，它会先用新密钥实测换 token 再写入）
· 社媒 3 个账号已断开（instagram / twitter / facebook，token 已从数据库清除），
  另清理了 data/social-oauth/ 下 3 个过期授权握手残留
· watchdog.sh 已装 cron（每分钟自检，连续 2 分钟不通才重启应用）
· **SSH 改为仅密钥登录**：密码登录已关闭（`PasswordAuthentication no` +
  `PermitRootLogin prohibit-password`）。密钥在本地 `lowflame-server-key`，
  所有部署脚本传 `SSH_KEY=私钥路径` 即可。⚠️ 这就是当初被爆破进来的那条路，
  现在从根上关掉了
· sshd `MaxStartups` 10 → `50:30:100`：原来只允许 10 个未认证并发连接，
  被持续爆破流量打满，导致我们自己连接时好时坏（实测 6 次只成 2 次），
  调大后 5/5 成功
```

已完成（2026-09-28）—— **第三次入侵后的重装**：

```
· 9/21 攻击者再次进入（矿机 xmrig + 二进制 jajang_xex94 + 守护 d1_7cb3pt_w1
  + **UID 0 后门账号 pakchoi** + docker 容器 + **systemd 单元 / docker 重启策略**
  做持久化 —— 所以"杀进程"完全没用，被 systemd 每秒拉起来一次）。
  清除记录见 `scripts/deploy/contain-20260928.cjs`。
  前两次清理都没挡住，最终按 `docs/服务器重装方案.md` 重装
  （**轻量应用服务器「重置系统」**，不是 ECS「更换操作系统」；IP 不变）。

· 🔑 **找到并堵上了三次入侵的共同入口**：
  `/etc/sudoers` 里有 `admin ALL=(ALL)  NOPASSWD:ALL` —— 配合阿里云注入到
  `admin` 账号的 `swas-imported-key`（控制台「远程连接」用，**重装后会自动注回**），
  就是「拿到密钥 → 登录 admin → 免密 sudo → root」这条链。
  **已摘掉那行免密 sudo**；密钥没删（删了也会被注回），但单独一把已提不了权。
  ⚠️ 这行**在 `/etc/sudoers` 主文件里，不在 `/etc/sudoers.d/`** ——
  只看后者会误判成"admin 没有 sudo"（本次就先误判了一次）。
  实测摘掉后控制台「远程连接」不受影响。

· 全新系统上重做了全部部署：装环境（**新增 `step0-base.sh`** —— 上次那两个
  setup 脚本只存在服务器上、随重装一起丢了）→ 安全基线六步 → 装回部署密钥
  → 关密码登录 → 恢复数据（`data-merged`）→ 部署 → HTTPS → watchdog。
· 后台管理员密码再次更换（新密码在本地「新后台管理员密码.txt」）。
· 服务器 root 密码 = 重装时在控制台设的那个（本地「新服务器密码.txt」）。

⏳ **仍未做**：9/21 那次攻击者有整整一周的 root，
数据库里的 **PayPal Secret / Resend / DeepSeek / ARK / MiniMax 密钥**
都要视为已泄露 —— **尚未轮换**。
```

已完成（2026-09-29）—— **第四次入侵（Next.js 的 RCE），入口已堵上**：

```
· 9/28 16:46–21:45 攻击者**经 POST / 的 RSC 协议在应用里执行任意命令**
  （Next.js「React flight protocol」RCE，CVE-2025-66478 / GHSA-9qr9-h5gf-34mp）。
  应用代码没被改 —— 入口就是 Next.js 本身。
  证据在 **/var/log/lowflame-error.log**（注意：不是 /root/.pm2/logs/，那里是空的）：
    21:36:49  NODE:yes …（探测环境）
    21:36:54  POOL 85.215.219.126:443 / DL …xmrig-x64.bin.gz / BIN /var/tmp/.c/.x
    16:46 起多次  cat ~/.claude/.credentials.json   ← 他在偷 Claude Code 凭据
· 上一轮（9/28 晚）已止血：杀矿机、删 /var/tmp/.c、iptables 封 85.215.219.126。
  **但矿机在 9/29 06:17 的体检里又被看到在跑**（CPU 榜首 lowflame 99%）。
  它是应用进程的子进程 —— **08:03 站点被打满、watchdog 自动重启应用时才被顺带杀掉**。
  残留物 /home/lowflame/.c/.ex 与 /tmp/.r2s.boot（内容是矿机路径清单）已取证后清除，
  副本在服务器 /root/quarantine-20260929/。本轮**没有** cron/systemd/at 持久化。
· ✅ **根因已修：next 15.1.0 → 15.5.26**。只升 15.1.12 只堵被利用的这一条；
  而本项目开了 AVIF 图片优化 + remotePatterns、middleware 又承担后台鉴权，
  还落在「图片优化未认证 RCE <15.5.24」「中间件鉴权绕过 <15.2.3」
  「中间件跳转 SSRF <15.4.7」里 —— 所以直接升到 15.5 线末版，一次清干净。
  升完 `npm audit` 里 next 自身已无 critical/high。
· ⚠️ **部署流程新踩到的坑：`fast-deploy.cjs` 只传 .next 与 public，不传依赖。**
  服务器 node_modules 还是 15.1.0，新产物直接 MODULE_NOT_FOUND、全站 500
  （已回滚过一次）。补救是把本地 node_modules/next 与 @next/env 打包传上去 ——
  next 自身的依赖声明恰好只差这两个。**以后升 Next 必须同时更新服务器依赖**。
  回退件留在服务器 /root/rollback.tar.gz 与 /root/next-15.1.0.bak。
```

🔴 **同时修掉一个 9/28 降权带出来的生产事故（此前一直没人发现）**：

```
· /var/www/lowflame/.env.local 是 -rw------- root root，而应用 9/28 起改跑
  lowflame 用户 —— **应用读不到它**，于是 DATABASE_BACKEND=sqlite 从未生效，
  线上一直退回 JSON 后端。后果：site.db 里的 16 条搭配、10 条规格、8 条赠品、
  商品编码（GEN-0001…）**全都没上线**，前台商品页连搭配区与规格选择都不显示。
  Next 15.5 会把这件事显式报成 `Failed to load env from .env.local [EACCES]`，
  15.1 是静默的 —— 这也是升级顺带暴露出来的。
· 但**放开权限不能单独做**：sqlite 这条路上 GET /api/products 会 500 ——
  `attachBundlesToProducts` 把搭配商品对象原样嵌进 `bundles[].product`，而那个对象
  就在同一个 products 数组里，A→B→A 构成循环引用，`JSON.stringify` 直接抛
  "Converting circular structure to JSON"。已修（嵌套那层剥掉自己的 bundles，
  variants 保留，搭配区仍能显示规格下拉）。
· 2026-09-29 11:45 已 chown lowflame + chmod 600 并重启，线上确认为 sqlite
  （接口返回 code=GEN-0001、搭配 2 条、规格 2 条），逐页 200。
  切换前的数据快照在服务器 /root/pre-switch-backup-20260929.tar.gz。
· ⚠️ **以后往应用目录放配置（.env.local 之类），属主必须是 lowflame**，否则应用读不到。

⏳ 仍未做：服务器上的 git 检出还停在 24d3a86（它的 package.json 仍写 ^15.1.0），
   而部署只传产物不传代码 —— 谁在服务器上跑 `npm install`，就会把 next 降回 15.1.0。
```

---

## 6. 回归测试脚本

都在 `D:\2026-06-20\browser-automation\`（**不在 WEN 项目内**），用 Playwright：

```
diag-pages.cjs                  全站 16 页体检（间隔 400ms 两遍，避免误报）
verify-card-hover-quickview.js  商品卡悬停 + Quick view
verify-quickview-clean.js       同上（更稳的版本，推荐）
verify-unpaid-tab.js            后台待付款专区
verify-remind-fix.js            催付接口（全程 dry-run）
verify-logo-visible.js          logo 显示
diagnose-header-badge.js        页头徽标底色/线上图片颜色
```

**注意**：Playwright **无法渲染支付弹窗**（headless 和 headed 都不行），
支付相关只能验证到"`PaymentRequest.show()` 被调用"这一层。

---

## 7. 给接手者的建议

1. **改任何代码前先跑 `npx tsc --noEmit`** —— 类型错误很容易引入
2. **改完必须部署并验证 BUILD_ID** —— 不要相信"页面 200"
3. **改数据库相关代码时，照着 §4.2 的三处清单走**
4. **测试外发接口（邮件/消息）永远先用 `dryRun`**
5. **不要用 PowerShell 改文件内容**
6. **服务器目前是"被入侵过但已清理"的状态** —— 涉及安全的功能要谨慎
