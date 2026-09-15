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

## 排查 OR_BIBED_06（Google Pay 报"此商家无法接受付款"）

如果 Google Pay 面板**能打开**但选中卡片后报 `OR_BIBED_06`：

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
node /root/toggle-paypal-wallets.cjs all
# 只开 Apple Pay（Google Pay 报错期间用这个）
node /root/toggle-paypal-wallets.cjs apple-only
# 只开 Google Pay
node /root/toggle-paypal-wallets.cjs google-only
# 两个都关
node /root/toggle-paypal-wallets.cjs off
```

改完记得重启让设置缓存失效：`pm2 restart lowflame`

**当前状态（2026-09）：只开 Apple Pay。** Google Pay 因为 `OR_BIBED_06` 报错暂时关闭，
一个点了必然失败的支付按钮比不显示更伤转化。修好后一条命令开回来。
