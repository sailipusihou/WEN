# 对标拆解：TeaTsy vs Low Flame

> 对标对象：https://teatsy.com/pages/under-one-moon-mid-autumn-2026
> 拆解时间：2026-09-12
> 方法：Playwright 实抓 DOM 结构、computed style、CSS 变量、文案序列、卡片标记（**不是目测截图**，是结构化实测数据）

---

## 0. 先认清对标对象是什么

| 项 | TeaTsy | 我们 Low Flame |
|---|---|---|
| 建站平台 | **SHOPLINE**（`img-va.myshopline.com` CDN，非 Shopify） | Next.js 自建 |
| 主体 | TeaTsy (Hong Kong) Co., Limited | — |
| 品类 | 便携功夫茶具（Travel Tea Set）为核心 | 青瓷 / 刺绣 / 竹编 / 香道 / 剪纸 |
| 价格带 | $9.99 – $129.99 | $27.50 – $83.06 |
| SKU 数 | 数百（单集合页就 20+ 卡片） | **8** |
| 社群规模 | 自称 180,000+ 会员 / IG 100,000+ | 起步期 |
| 市场 | 欧美，多币种多语言 | 欧美 + 中文叙事 |

**关键结论先行**：TeaTsy 是「成熟站 + 大量 SKU + 强促销」的打法。它有很多机制（秒杀、买一送一、爆款集合）**在 8 个 SKU 的阶段抄了只会显得空**。后面我把建议分成「立刻抄」「有条件再抄」「别抄」三档。

---

## 1. 它的设计系统（实测 token）

### 字体
| 用途 | TeaTsy | 我们 |
|---|---|---|
| 标题 | **Akatab**（圆润几何无衬线）/ 部分 **Actor** | **Playfair Display**（衬线） |
| 正文 | **Montserrat** 14px | **Inter + Noto Sans SC** 16px |
| 标题字号 | 36px（H1）/ 48–62px（区块大标题） | 36px（H1）/ 30px（H2） |
| 字距 | `0.02em` 全局 | H1 0.72px |

> 它的做法是**大标题用「圆润无衬线」而不是衬线**——这跟西方消费者对「东方茶具」的预期有关：它想做的是**现代生活方式品牌**，不是古董店。我们用的 Playfair（衬线）传达的是「老派优雅」。这是**品牌调性差异**，不是优劣——但值得你知道这是刻意的选择。

### 配色
| 语义 | TeaTsy | 我们 |
|---|---|---|
| 页面底色 | `#FAFAF6`（暖白，**不是纯白**） | `#FFFFFF` |
| 正文色 | `#4A3422`（暖褐） | `#2D2F33`（冷灰） |
| 主按钮 | `#4C5546`（橄榄绿） | 透明 + 边框 |
| 强调/折扣 | `#B42929`（正红） | — |
| 页脚 | 底色 `#4C5546` + 文字 `#F5F4F0`（**深底浅字**） | 同左（`#2D2F33` 底） |

> 它的每个语义色都是 **CSS 变量**（`--color-*`），我们也是 token 化（`--ink-deep` 等）。**这一项我们不落后。**

### 我们的实际优势
- 我们 H1 用了 `Playfair Display` + `letter-spacing 0.72px`，标题排版比它更精致
- 我们有中文排版专用字体栈（`--font-noto-serif-sc` 宋体用于中文），它没有

---

## 2. 首页区块序列（实测对照）

### TeaTsy 首页（实测 15 段）
```
1  公告条（两条轮播）      Free Damaged Replacement • 60-Day Money Back / 2026 Mid Autumn Special
2  Hero                    New Arrival
3  促销区块                Mid Autumn Special
4  图文区                  Rotating Linglong Porcelain Mug Collection
5  社群区                  Be Part Of Our 180000+ Members Community
6  商品网格                Shop Our Bestsellers
7  分类导航 ★              Shop by Category          ← advc-section
8  图文区                  Explore Our Travel Tea Sets
9  商品网格                Tea on the Go
10 Instagram UGC ★         Join 100,000+ Tea Aesthetics Lovers On Instagram
11 图文区                  #AsianArtCulturalTreasures Collection
12 评价区 ★                Reviews from Verified Customers（独立组件，多卡）
13 品牌故事                More Than A Cup of Tea
14 图文区                  About Us
15 邮件订阅                Sign up and save
```

### 我们首页（实测 9 段）
```
1  公告条                  ◈ HANDCRAFTED IN SMALL BATCHES · SHIPPED WORLDWIDE
2  Hero                    Objects That Carry Stories
3  价值主张 4 宫格          HAND-SELECTED / AUTHENTIC CRAFT / ETHICAL SOURCING / TIMELESS DESIGN
4  分类浏览 ★              Our Collections（4 个分类轮播 + 编号）
5  商品网格                Featured Pieces
6  图文区                  Every Object Has a Maker, Place, Story
7  理念宣言                Beauty Lives in the Details We Often Overlook
8  Journal 文章区          The Journal
9  促销图文                Summer Collection
10 邮件订阅                Receive Stories from the Studio
```

**差距**：我们**缺** 3 个区块 —— ① 评价区（我们有 128 条评价数据，首页却不用）② Instagram/UGC 区 ③ 「Shop by Category」独立导航区（我们的分类只在轮播里，没有网格化的品类入口）。

**我们的优势**：我们的 4 宫格价值主张 + 品牌宣言区，是它没有的深度内容——这块不要丢。

---

## 3. 分类体系搭建（你问的重点）

### TeaTsy 的 collections（实测 17 个，分三层）
```
【主题/场景层】new-arrivals · best-sellers · gift-picks
【促销层】    sale · flash-deals-today · buy-1-get-1-free
【品类层】    tea · teaset · tea-mug · tea-cup · glassware · gaiwan · accessories
【套餐层】    travel-set · matcha-set
【文化层】    asian-art-cultural-treasures-collection
```

**三个可复制的设计**：
1. **品类层和场景层并列存在**：用户既能「按东西买」（茶杯/盖碗/玻璃器），也能「按用途买」（送礼/旅行装/抹茶套装）——同一个商品出现在多个集合里，不冲突。
2. **促销用独立集合承接，不需要在商品上打促销标签**：`flash-deals-today`、`buy-1-get-1-free`、`sale` 都是集合，运营改集合成员即可，不动商品数据。
3. **「文化层」集合做品牌叙事**：`asian-art-cultural-treasures-collection` 这个名字本身就在讲品牌故事——这正是我们该强化的方向。

### 我们现在的分类（实测，**有问题**）
| 分类 | 名称 | 里面的商品 | 是否合理 |
|---|---|---|---|
| `tea-ceremony` | 东方茶道 | Ink Landscape Scroll（水墨画卷轴）、Silk Embroidered Scarf（丝绸围巾） | ❌ 跟茶道无关 |
| `ceramic-art` | 陶瓷艺术 | 陶瓷香炉、**竹编落地灯**、**剪纸夜灯** | ❌ 后两个不是陶瓷 |
| `incense-rituals` | 香道 | **漆器首饰盒**、**草本手工皂** | ❌ 跟香道无关 |
| `Chinese Tea Culture` | 中国茶文化 | **Celadon Tea Set（青瓷茶具）** | ⚠️ 这个才是茶具，但名字和 slug 混乱 |

**四个问题**：
1. **商品归属错配**：每个分类里都塞了不相关的商品
2. **分类名 ≠ 内容**：客户点「东方茶道」看到围巾，立刻失去信任
3. **slug 中英混用**：`tea-ceremony` / `ceramic-art` / `incense-rituals` 是英文，但 `Chinese Tea Culture` 是带空格的中文拼音名 → URL 变成 `/category/Chinese%20Tea%20Culture`
4. **只有 4 个分类，其中 3 个是空的或错的** → 首页「Our Collections」轮播里展示的「1 items」「2 items」暴露了我们商品少

> **这是我认为优先级最高的一件事**：分类是电商的骨架，比详情页的任何一个新模块都重要。

---

## 4. 列表页（PLP）对照

| 元素 | TeaTsy | 我们 |
|---|---|---|
| H1 + 商品数 | `Tea` / `5 products` ✅ | `All Objects` / `8 pieces` ✅ |
| 排序 | **6 种**（Recommended / Top sellers / New arrivals / Price ↑ / Price ↓ / New to old） | 5 种（Featured / Price ↑ / Price ↓ / Top Rated / Newest）✅ 基本对齐 |
| 筛选 | Filter 面板（价格/品类/标签） | Filters ✅ |
| 卡片：悬停显示 | **Quick view + Add to cart** | ❌ 无 |
| 卡片：划线原价 | ✅ `$24.99` → `$14.99` | ✅ 已有 |
| 卡片：评论数角标 | ✅ `(4)` | ❌ 无 |
| 卡片：新品/促销标 | ✅ `new` | ✅ `SALE -20%` |
| 底部推荐 | ✅ You May Also Like（大轮播） | ❌ 无 |

**最该补的**：卡片上的 **Quick view（快速查看）+ 直接加购**，以及**评论数角标**。这两个是列表页转化率的关键——用户不用进详情页就能加购，评论数提供决策依据。

---

## 5. 商品详情页（PDP）对照 —— 核心

### TeaTsy 详情页实测区块（21 个）
```
1  公告条 ×2 轮播          Free Damaged Replacement • 60-Day Money Back / Mid Autumn Special → Shop Now
2  面包屑                  Home / 商品名
3  ★ 实时社会证明          "126 tea friends are browsing our store."
4  标题 + 一行卖点钩子      “Blanc Grace" - Sophisticated Dehua Porcelain Tea Set
5  ★ 评分 + 评论数         1 reviews
6  价格 + 划线原价         $119.99 USD  ~~$199.99 USD~~
7  ★ 满赠门槛              "Gift Offer on orders over 1 pieces"
8  ★ 变体选择              Style：Classic Duoqiu
9  数量选择                QUANTITY
10 ★ 库存紧张             "Only 12 left in stock"
11 ★ 预计到达日期          "Buy it now, get between Sep/18 - Oct/8"
12 ★ 运费计算器            DELIVERY COST CALCULATOR（页内可算）
13 双 CTA                 Add to cart / Buy now
14 收藏                    WISHLIST(4)
15 ★ 搭配购               Frequently bought together（3 件套装 + 总价 + "Save $8.49" + BUY TOGETHER）
16 信任条                  Shop Confidently With
17 手风琴 ×4              DESCRIPTION / SHOP WITH CONFIDENCE / FAQS / SHIPPING & RETURN POLICY
18 社交分享                Share / Tweet / Pin it / LINE / Whatsapp / Tumblr
19 ★ 评价 + 问答 Tab       Reviews(1) / Questions & Answers(0)，带筛选（With Images / 时间 / 评分）、Write a review、ASK NOW
20 ★ 相关推荐             You May Also Like（11 张卡片）
21 邮件订阅 + 页脚
```

### 我们详情页实测区块（12 个）
```
1  公告条                  ◈ HANDCRAFTED IN SMALL BATCHES · SHIPPED WORLDWIDE
2  面包屑                  HOME / ALL OBJECTS / CELADON TEA SET
3  促销标 + 折扣           SALE  $74.66 -20%
4  分类标签                CREATIVE GIFTS（⚠️ 见第 7 节，这是错的）
5  标题 + 一行卖点         Celadon Tea Set / Longquan Celadon · Sky-Blue Glaze
6  价格 + 划线原价         $74.66  ~~$93.33~~
7  ★ 规格卡（我们独有）    CRAFT: Hand-thrown · Fired at 1280°C / MATERIAL: 龙泉瓷土·天青釉 / ORIGIN: 浙江·龙泉
8  ★ 评分 + 评论数         RATING 4.9 (128)
9  描述段落
10 工艺徽章               MASTER CRAFT / INTANGIBLE HERITAGE
11 数量 + 加购 + 咨询      QUANTITY / ADD TO CART / Ask about this piece →
12 信任条                 AUTHENTICITY GUARANTEED / WORLDWIDE SHIPPING / 30-DAY RETURNS
13 品牌故事               The Story Behind This Piece
14 评价列表               Reviews（2 条，带头像/城市/日期）
15 BACK TO COLLECTION
16 页脚
```

### 逐项差距表

| 能力 | TeaTsy | 我们 | 价值 |
|---|---|---|---|
| 库存紧张提示 | ✅ Only 12 left | ❌ **我们数据库有 stock 字段但没展示** | 高（制造紧迫感） |
| 预计到达日期 | ✅ Sep/18 - Oct/8 | ❌ | 高（跨境最大疑虑就是「多久到」） |
| 运费计算器 | ✅ 页内可算 | ❌ | 高（跨境运费不透明是弃单首因） |
| 搭配购 / 套装 | ✅ Frequently bought together | ❌ | 高（直接提升客单价） |
| 相关推荐 | ✅ You May Also Like | ❌ | 高（提升浏览深度） |
| FAQ / 配送退货手风琴 | ✅ 4 个手风琴 | ❌ | 高（减少售前咨询，我们客服压力大） |
| Q&A 问答区 | ✅ 独立 Tab | ❌ | 中 |
| 收藏按钮（详情页） | ✅ WISHLIST | ❌（只有卡片上有） | 中 |
| 社交分享 | ✅ 6 个渠道 | ❌ | 中（低成本） |
| 变体（颜色/款式） | ✅ Style 选择 | ❌ | 中（我们有变体商品时会需要） |
| 实时浏览人数 | ✅ 126 browsing | ❌ | 低（**需真实数据，造假会反噬**） |
| 满赠门槛 | ✅ Gift Offer | ❌ | 低（促销玩法，SKU 少时无用） |
| **中文 / 文化叙事** | ❌ 全英文 | ✅ **我们有** | **我们的护城河** |
| **结构化规格卡** | ❌ 只有长文字 DESCRIPTION | ✅ **CRAFT/MATERIAL/ORIGIN** | **我们的护城河** |
| **工艺溯源故事** | ❌ | ✅ The Story Behind This Piece | **我们的护城河** |
| **售前即时咨询** | ❌ | ✅ Ask about this piece（聊天） | **我们的护城河** |

---

## 6. 建议清单（按优先级）

### P0 — 立刻做（低成本、直接提转化）

1. **修分类体系**（不是抄它，是修我们自己的）
   - 重新分配 8 个商品的归属，做到「分类名 = 里面的东西」
   - 统一 slug 为英文短横线（`chinese-tea-culture` 而不是 `Chinese Tea Culture`）
   - 建议 4 个分类：`tea-ceremony`（茶具）/ `ceramic-art`（陶瓷）/ `textile-embroidery`（织绣）/ `incense-rituals`（香道+漆器）
2. **详情页补「预计到达 + 运费说明」** —— 我们已有 `estimatedDeliveryDays` 和 `shippingZones` 数据，只是没在详情页展示。跨境站这是第一疑虑。
3. **详情页补库存提示** —— `stock` 字段已有，显示「仅剩 N 件」即可
4. **详情页补「相关推荐」** —— 8 个商品做「你可能也喜欢」绰绰有余，按同分类推荐
5. **列表页卡片加「评论数角标」** —— 我们有 128 条评价，却不在列表页露出
6. **修掉商品卡的假分类标签**（见第 7 节）

### P1 — 值得做（需要一点开发量）

7. **列表页卡片「悬停加购 / Quick view」** —— 我们的卡片已有收藏和快速加购（之前修过），把它扩展到所有列表页
8. **详情页「配送与退货 / FAQ」手风琴** —— 内容可以从我们已有的政策页搬，成本很低
9. **搭配购（Frequently bought together）** —— 需要后台配置「搭配组合」，8 个 SKU 做 2–3 个组合即可
10. **详情页收藏 + 社交分享** —— 小改动
11. **首页补「评价区」** —— 我们已有 128 条评价，首页完全没用

### P2 — 有条件再做

12. Instagram/UGC 区（需要真的在运营 IG）
13. Q&A 问答模块
14. 运费计算器（如果运费规则复杂才值得；否则用第 2 条的「运费说明 + 预计到达」更划算）
15. 实时浏览人数（**必须真实**，否则不做）
16. 商品变体（等真有变体商品时）

### ❌ 别抄的

| 项 | 原因 |
|---|---|
| Flash deals / 秒杀 | 8 个 SKU 做秒杀，页面会很空，且伤害价格锚点 |
| Buy 1 Get 1 Free | 我们是工艺品定位，买一送一会摧毁「手工/非遗」的价值感 |
| Best Sellers / New Arrivals 集合 | 商品太少时这两个集合没内容可放 |
| 双公告条轮播 | 我们的单条「HANDCRAFTED IN SMALL BATCHES」更克制、更符合品牌；两条轮播会显得吵闹 |
| 「180,000+ 会员」式数字 | 我们还没有这个数字。**假数字一旦被识破，工艺品牌的信任就没了** |

---

## 7. 顺手发现的 3 个自站问题（本轮已修 1 个）

| # | 问题 | 证据 | 状态 |
|---|---|---|---|
| 1 | **页脚对外邮箱还是旧品牌** `hello@oriental-treasures.com` | 线上页脚实测；`settings.frontendContent.footer.contacts` 里存的是旧值（`footerEmail` 改了，但这个没改） | ✅ **已修**（改为 `hello@lowflame.store`，已重启生效） |
| 2 | **商品卡上的分类标签 100% 是错的** | `components/product/ProductCard.tsx:109/137` 硬编码三元表达式：只有 `cultural-gifts` / `home-decor` 两个旧分类能正确显示，其他全落到 `else` → 所以每张卡都显示 **GIFT IDEAS / CREATIVE GIFTS** | ❌ 待修 |
| 3 | **分类商品归属错配** | 「东方茶道」里是水墨画和围巾；「香道」里是漆器盒和手工皂 | ❌ 待修（见 P0-1） |

> 第 2 条是「为什么每张卡都顶着同一个标签」的答案，也是它跟第 3 条同源：**都是旧品牌分类体系（cultural-gifts / home-decor / creative-gifts）的遗留物**，新的四个分类从未接进商品卡组件。

---

## 8. 一句话总结

**TeaTsy 强在「转化机器」——每一个区块都在消除一个下单疑虑（多久到？运费多少？别人买过吗？还有货吗？还能搭什么买？）。我们强在「品牌深度」——文化叙事、工艺溯源、中文质感，这是它完全不具备的。**

所以正确的姿势不是「照抄它的页面」，而是：
> **用它的「转化结构」装上我们的「品牌内容」。**

具体到执行顺序：先修分类（骨架），再补详情页的 4 个信任/决策模块（预计到达、库存、运费、FAQ），最后再做搭配购和相关推荐（提客单价）。
