/**
 * 开发模式示例评价（占位内容）
 *
 * ── 为什么是"开发模式"而不是直接写进数据库 ──
 * 把编造的评价当作真实客户评价发布到线上，在美国属于 FTC《消费者评价与推荐规则》
 * （2024-10 生效）明确禁止的行为，且是按条计罚；欧盟的 Omnibus 指令同样要求评价
 * 真实性可核验 —— 而本站主销市场正是欧美。另外本项目自己在上一轮体检里就定过
 * 「无评分不伪造」，竞品分析也把"18 万会员"这类假数字列进了「❌ 别抄」。
 *
 * 所以这里的内容**只用于把版式调好**，不写数据库、不进 JSON-LD、线上永远不显示。
 * 真实评价到货后直接换数据源即可，UI 零返工。
 *
 * ── 门禁 ──
 * 必须是「开发环境」**且**显式打开开关才生效：
 *   NODE_ENV=development 且 NEXT_PUBLIC_ENABLE_SAMPLE_REVIEWS=1
 *
 * 生产构建下的实测结果（`grep -rl "Margaret Ellis" .next/`）：
 *   .next/server  0 命中   ← 部署的服务端产物
 *   .next/static  0 命中   ← 用户能下载的客户端资源
 *   仅 .next/cache/webpack/... 命中 —— 那是构建缓存，而部署脚本
 *   （scripts/deploy/fast-deploy.cjs）打包时明确排除 .next/cache。
 * 也就是说线上产物里既没有这些内容、更不会渲染它们。
 *
 * ── 头像是怎么处理的 ──
 * 用「单字母 + 圆形底」的字母标识（与商品详情页既有评价卡片同一套渲染逻辑），
 * **不使用任何真人照片或肖像素材** —— 让没买过东西的人替你产品背书，
 * 在美国涉及形象权（right of publicity），比假评价本身更容易被投诉。
 *
 * 用法：在 .env.local 里加一行 NEXT_PUBLIC_ENABLE_SAMPLE_REVIEWS=1 后重启 dev server
 */

export interface SampleReview {
  id: string
  productId: string
  author: string
  /** 单字母头像（非 URL 时评价卡片自动按字母渲染） */
  avatar: string
  rating: number
  date: string
  content: string
  location: string
  /** 恒定标记：渲染层据此显示可见的 SAMPLE 角标 */
  isSample: true
}

export const SAMPLE_REVIEWS_ENABLED: boolean =
  process.env.NODE_ENV === 'development' &&
  process.env.NEXT_PUBLIC_ENABLE_SAMPLE_REVIEWS === '1'

/** 便于在组件里直接判断，语义更清楚 */
export function hasSampleReviews(): boolean {
  return SAMPLE_REVIEWS_ENABLED
}

/**
 * 占位评价内容。名字与城市刻意做成多国的 —— 目的只是把"不同长度姓名 / 不同地区"
 * 的排版情况都覆盖到，不是要模拟真实客户分布。
 *
 * ⚠️ 数据放在函数体里、入口处先 return，而不是写成模块级常量 ——
 *    这样打包器有机会把整块数据当作死代码摘掉。实测两种情况都不会进入
 *    .next/server 与 .next/static（见文件头的门禁说明），但函数内更干净：
 *    模块级常量无论如何都会被求值一次。
 */
function buildSampleReviews(): SampleReview[] {
  if (!SAMPLE_REVIEWS_ENABLED) return []

  const DATA: Omit<SampleReview, 'id' | 'isSample'>[] = [
  {
    productId: 'celadon-tea-set', author: 'Margaret Ellis', avatar: 'M', rating: 5,
    date: 'March 3, 2026', location: 'Portland, OR',
    content: 'The glaze has a depth the photos honestly cannot capture. My first pour, the whole pot caught the window light and went the colour of a winter sky. Worth every cent of the wait.',
  },
  {
    productId: 'celadon-tea-set', author: 'Kenji Watanabe', avatar: 'K', rating: 5,
    date: 'February 18, 2026', location: 'Osaka',
    content: 'I have used celadon for twenty years. The weight distribution of this pot is right — it does not fight your wrist. Packed beautifully too, not a chip in transit.',
  },
  {
    productId: 'celadon-tea-set', author: 'Ana Sofia Reis', avatar: 'A', rating: 4,
    date: 'April 7, 2026', location: 'Lisbon',
    content: 'Lovely set and the cups hold heat well. Took three weeks to reach Portugal rather than two, but the workshop answered my email the same day, which counted for a lot.',
  },
  {
    productId: 'ink-painting-scroll', author: 'Claire Dubois', avatar: 'C', rating: 5,
    date: 'January 29, 2026', location: 'Lyon',
    content: 'Hung it above the stairs and it has entirely changed how that corridor feels. The ink has a softness in person that I did not expect from a print of a brush painting.',
  },
  {
    productId: 'silk-scarf', author: 'Priya Raman', avatar: 'P', rating: 5,
    date: 'March 22, 2026', location: 'Singapore',
    content: 'The embroidery is genuinely two-sided — I keep turning it over to check. Light enough for the heat here, and it has not snagged once on my bag strap.',
  },
  {
    productId: 'paper-cutting-light', author: 'Thomas Bergman', avatar: 'T', rating: 4,
    date: 'February 5, 2026', location: 'Stockholm',
    content: 'Beautiful cast shadow on the wall at night, genuinely warm rather than orange. The switch is on the cable which took a little getting used to, but the lamp itself is faultless.',
  },
  {
    productId: 'paper-cutting-light', author: 'Lucia Ferrara', avatar: 'L', rating: 5,
    date: 'April 2, 2026', location: 'Milan',
    content: 'Bought two for the bedside tables. They look far more expensive than they were and the paper pattern is cut cleanly, no ragged edges anywhere.',
  },
  {
    productId: 'ceramic-incense', author: 'Daniel Okafor', avatar: 'D', rating: 5,
    date: 'March 11, 2026', location: 'Toronto',
    content: 'The burner holds a full cone without any ash escaping onto the shelf, which was my worry. The crackle glaze has started to take on a little colour from the smoke — I like it more now than when it arrived.',
  },
  {
    productId: 'ceramic-incense', author: 'Hana Nováková', avatar: 'H', rating: 4,
    date: 'January 16, 2026', location: 'Prague',
    content: 'Well made and heavier than it looks in a reassuring way. A little smaller than I had pictured from the measurements, though that is on my reading rather than the product.',
  },
  {
    productId: 'bamboo-lamp', author: 'Sofia Lindqvist', avatar: 'S', rating: 5,
    date: 'February 27, 2026', location: 'Copenhagen',
    content: 'The weave is very even and you can tell it was done by hand rather than a machine. It sets a soft pool of light in the corner and has become my favourite thing in the room.',
  },
  {
    productId: 'lacquer-jewelry-box', author: 'Isabelle Chen', avatar: 'I', rating: 5,
    date: 'March 30, 2026', location: 'Vancouver',
    content: 'The lacquer has real depth with the shell inlay catching light at an angle. The lid closes with a soft, precise sound — the kind of detail you only get when someone has fitted it properly.',
  },
  {
    productId: 'handmade-soap-set', author: 'Emma Hartmann', avatar: 'E', rating: 5,
    date: 'April 12, 2026', location: 'Berlin',
    content: 'Split the set as gifts and kept one. Lathers well without leaving the tight feeling some bar soaps do, and the scent is subtle rather than perfumed. Would order again.',
  },
  ]

  return DATA.map((d, i) => ({ ...d, id: `SAMPLE-${i + 1}`, isSample: true as const }))
}

/** 全站示例评价（关闭时恒为空数组） */
export const SAMPLE_REVIEWS: SampleReview[] = buildSampleReviews()

/** 取某商品的示例评价 */
export function getSampleReviewsFor(productId: string): SampleReview[] {
  if (!SAMPLE_REVIEWS_ENABLED) return []
  return SAMPLE_REVIEWS.filter(r => r.productId === productId)
}

/**
 * 首页评价区展示用：挑出写得较完整、且分布在多个国家的几条。
 * 关闭开关时返回空数组，首页那一段就不会渲染。
 */
export function getHomepageSampleReviews(limit = 3): SampleReview[] {
  if (!SAMPLE_REVIEWS_ENABLED) return []
  const picked = SAMPLE_REVIEWS.filter(r =>
    ['celadon-tea-set', 'silk-scarf', 'lacquer-jewelry-box', 'bamboo-lamp'].includes(r.productId)
  )
  return picked.slice(0, limit)
}
