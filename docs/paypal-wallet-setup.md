# PayPal 钱包（Apple Pay / Google Pay）开启步骤

> 这份文档是为了不再丢失后台链接而写的。改这块之前先读一遍。
> 最后核对：2026-09（链接经实际请求验证，会跳转到 paypal.com/signin?returnUri=...，属正常）

---

## 两个链接

### 1. 主入口：账户设置 → 付款方式（Apple Pay + Google Pay 都在这一页）

```
https://www.paypal.com/businessmanage/account/payments
```

### 2. 直达 Apple Pay 能力开通（如果上面那页找不到入口就用这个）

```
https://www.paypal.com/bizsignup/add-product?product=payment_methods&capabilities=APPLE_PAY
```

---

## 步骤（来自 Sytist 官方手册的实操记录）

1. 登录 PayPal 商业账户
2. 进入 **Account Settings → Payment Methods**
   （即上面第 1 个链接）
3. **向下滚动**，找到 **Expanded Checkout** 区块
4. 点 **Get Started**
   - 如果看不到 Expanded Checkout 这一块，说明已经开通过了，跳过
5. 在下一页点 **Next**
6. 填好信息，点 **Agree & Submit**
7. 回到 **Account Settings → Payment Methods**

到这里：

- **Google Pay**：手册原文 "At this point, Google Pay should already be enabled."
  → 完成 Expanded Checkout 报名后，Google Pay 会自动开通
- **Apple Pay**：还需要点 **Manage Apple Pay**，填入**网站域名**并完成验证
  - ⚠️ 如果 `yourdomain.com` 和 `www.yourdomain.com` 都能访问，
    **两个都要单独注册验证**（PayPal/Apple 按域名逐个关联）

---

## Google Pay 的钱走哪里（架构，别搞混）

**走 PayPal，不走 Google。**

```
客户点 [Buy with G Pay]
        ↓
① Google 弹出支付面板，客户选一张卡
        ↓
② Google 把卡号令牌化，返回一次性 token（不是真实卡号）
        ↓
③ token 通过 PayPal 的网关交给 PayPal
   （配置里 gateway: "paypalppcp" 就是干这个的）
        ↓
④ PayPal 拿 token 向客户的卡实际扣款 → 钱进你的 PayPal 商业账户
        ↓
⑤ 服务端调 PayPal Capture API 确认收款 → 落库 → 发确认邮件
```

由此推出：

| 问题 | 答案 |
|---|---|
| 客户需要 Google 账号余额吗 | 不需要，扣的是卡 |
| 需要 Google 商户收款账户吗 | 不需要，PayPal 是实际收单方 |
| 钱到哪 | **PayPal 商业账户**，和 Apple Pay 完全一样 |
| 为什么 Google Pay 没有「管理」链接 | Google 侧的商户关系由 PayPal 持有（merchantId + authJwt 都是 PayPal 下发的） |
| 对账在哪看 | PayPal 后台，和普通 PayPal 收款混在一起（custom_id 带了站内订单号，可一一对应） |

---

## 关键线索汇总（2026-09 排查记录 —— 改这块之前务必先读）

### 现象
Google Pay 面板**能打开**（`pay.google.com`），但选中卡片后报：
```
此商家目前无法接受您的付款。请尝试使用其他付款方式。[OR_BIBED_06]
```

### 已逐项排除的可能

| 检查项 | 结论 |
|---|---|
| 请求字段（apiVersion / allowedPaymentMethods / tokenizationSpecification / merchantId / authJwt / merchantOrigin） | ✅ 逐项对过 Google 规范，零缺失 |
| `PaymentRequest.show()` 是否被调用 | ✅ 钩住确认调用了（代码走到了这一步） |
| `isReadyToPay()` | ✅ `{"result": true}` |
| `countryCode` 用商户国 CN 是否有问题 | ❌ 改成买家国 / US 后**无变化**，排除 |
| Google Pay 按钮点击有没有响应 | ✅ 已修（见下方「三个同类 bug」） |
| 网站缺政策页影响审核 | ✅ 已补齐（/refund-policy、/shipping-policy） |

### 官方文档给出的方向

**Google 侧**（<https://developers.google.com/pay/api/web/support/troubleshooting>）：
> "This merchant is **not enabled for Google Pay**... A Google merchantId is associated with
> one or more fully qualified domains through the Google Pay & Wallet Console"
>
> "This merchant has **not completed registration**... **Request production access** to register
> using the Google Pay & Wallet Console and request a review of your website's use of the Google Pay API"

**PayPal 侧**（[platforms/checkout/apm/google-pay](https://developer.paypal.com/platforms/checkout/apm/google-pay/)）：
> "**Note: Before going live, complete production onboarding to process Google Pay payments
> with your live PayPal account.**"

文档给出的生产 onboarding 入口：
- Google Pay：`https://www.paypal.com/bizsignup/add-product?product=payment_methods&capabilities=GOOGLE_PAY`
- Apple Pay 对照版：`...&capabilities=APPLE_PAY`（这个已走完，Apple Pay 实测可用）
- ⚠️ 但 `bizsignup` 链接**按地区跳转**：跨境/中国区账户打开会落到**中国贝宝**，走不通
- 备选路径：**PayPal Developer Dashboard → 选 Live 应用 → Features / Mobile and digital payments → 勾选启用 Google Pay**

**⚠️ 商户不需要自己去 Google Pay & Wallet Console 建商户档案**：
用 PayPal 网关集成时，`merchantId` + `authJwt` 都由 PayPal 下发，
Google 侧那套 Business Profile 是**另一套体系**（用户实测在中国区被要求填，但填了也不解决这里的问题）。

### 同类已知问题（说明中国商户本该可用）

[woocommerce-paypal-payments #4138](https://github.com/woocommerce/woocommerce-paypal-payments/issues/4138)：
> "WooCommerce PayPal Payments receives the PayPal onboarding `merchant_country` value **C2 for China**.
> However, inside the plugin the Google Pay / Apple Pay supported-country whitelist only contains **CN**
> and does not include **C2**. Because of this mismatch, Google Pay / Apple Pay are treated as **ineligible**"
>
> "PayPal docs confirm China's REST country code is **C2**:
> <https://developer.paypal.com/api/rest/reference/country-codes/> (row: CHINA | C2)"

**推论：中国商户本来应该能用**（否则插件作者不会建议把 C2 加进白名单）。
所以这不是"中国不能用"，而是这条链路上有具体的配置/适配问题要解决。

⚠️ 我们代码里的 `pickCountry()` 已做防护：PayPal 给的 `countryCode` 若不在
Google Pay 支持列表里，会退回买家所在国、再退回 US，因此不会因 C2/CN 这类代码差异被拒。

---

## 三个同类 bug（改支付组件前必读）

| # | 组件 | 症状 | 根因 | 修法 |
|---|---|---|---|---|
| 1 | Apple Pay | 点了没反应 | Apple 的 `<apple-pay-button>` **吞掉 click，不冒泡** | 在元素自身绑**原生** `addEventListener` |
| 2 | PayPal 弹窗 | 点了不弹窗 | 地址断言被放进 `createPendingOrder` 公共路径；Express Checkout 在页顶、表单为空 → 断言抛错 | 断言只在钱包确实回传联系方式时执行 |
| 3 | Google Pay | 点了没反应 | Google 生成的按钮**不把点击交给 `createButton` 的 `onClick`** | 在 Google 返回的 `<button>` 上再绑原生监听器 |

**共同规律：第三方支付组件的点击，不能只依赖它自己的回调 —— 要在元素上绑原生监听器兜底。**

---

## 排查 OR_BIBED_06（Google Pay 报"此商家无法接受付款"）

**⚠️ 先确认报错是在哪台站上截的。** 2026-09 的经过：用户给的报错截图其实是在**对比网站**
（别家站）上截的，不是我们站 —— 差点因此误判成我们的问题。先问清楚再说。

**已确认我方代码没问题** —— 完整请求配置逐项对照过 Google API 规范：

| 字段 | 值 | 状态 |
|---|---|---|
| apiVersion / apiVersionMinor | 2 / 0 | ✅ |
| allowedPaymentMethods[0] | CARD + PAN_ONLY,CRYPTOGRAM_3DS | ✅ |
| tokenizationSpecification | PAYMENT_GATEWAY → gateway: paypalppcp | ✅ |
| merchantInfo.merchantId | BCR2DN4TXSDMVTKM | ✅ |
| merchantInfo.authJwt | 已下发 | ✅ |
| merchantInfo.merchantOrigin | lowflame.store | ✅ |

Google 官方文档对这类错误的定义**全部指向商户注册 / 域名关联**：
<https://developers.google.com/pay/api/web/support/troubleshooting>

> "This merchant is **not enabled for Google Pay**... A Google merchantId is associated with
> one or more fully qualified domains through the **Google Pay & Wallet Console**"
>
> "Your domain **is not registered** to use this API — The domain where your checkout is hosted
> isn't associated with the merchantId that you use"

**按可能性排序的处理方向：**

1. **Expanded Checkout 报名没走完** ← 最可能（见上面第 3–6 步）
2. 域名没关联到 merchantId → 在 PayPal 后台 Manage Apple Pay 处补齐域名
3. PayPal 侧的 Google Pay 授权没同步 → 关掉再打开 Google Pay 开关，或重连 PPCP
4. 以上都不行 → 找 PayPal 客服查 merchantId 的 Google 授权状态

**找 PayPal 客服时的信息模板：**

```
商户：lowflame.store
PayPal 商业账户：saih25271@gmail.com
Google Pay merchantId：BCR2DN4TXSDMVTKM
PayPal 网关 merchantId：JD9B86YY2WXTC

问题：Google Pay 支付面板能打开，但选中卡片后报
"此商家目前无法接受您的付款 [OR_BIBED_06]"。
PayPal 侧 Googlepay().config() 返回 isEligible: true、
merchantInfo 完整（含 authJwt 与 merchantOrigin），
但 Google 侧提示商户未启用/域名未注册。
请协助确认该 Google Pay 商户授权是否已通过 Google 审核、
lowflame.store 是否已关联到该 merchantId。
```

**辅助核对（Google 侧）：** <https://pay.google.com/business/console>
用绑定 PayPal 商业账户的 Google 账号登录，看店铺域名是否在列、状态是否已批准。

---

## 站点开关

钱包按钮可以在不改代码的情况下开关（存 settings 表的 `paypalApplePayEnabled` / `paypalGooglePayEnabled`）：

```bash
# 两个都开
node /root/toggle-paypal-wallets.cjs on
# 只开 Apple Pay（Google Pay 报错期间用这个）
node /root/toggle-paypal-wallets.cjs apple-only
# 只开 Google Pay
node /root/toggle-paypal-wallets.cjs google-only
# 两个都关
node /root/toggle-paypal-wallets.cjs off
# 只看当前状态
node /root/toggle-paypal-wallets.cjs status
```

⚠️ 全部开关关键字：`on` / `off` / `apple-only` / `google-only` / `status`
（**没有 `all`** —— 我一开始在文档里写错了 `all`，脚本会报"未知命令"。已修正。）

改完记得重启让设置缓存失效：`pm2 restart lowflame`

**当前状态（2026-09）：两个都开。**
