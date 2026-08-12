import { getRepository } from './repository'
import { searchKB, getAllKBEntries } from './knowledge-base'
import { getAllSocialAccounts } from './social-accounts'

export interface AITool {
  name: string
  description: string
  parameters: {
    type: string
    properties: Record<string, any>
    required: string[]
  }
  requiresConfirmation?: boolean
}

export const AI_WRITE_TOOLS: AITool[] = [
  {
    name: 'update_product_stock',
    description: '修改单个商品的库存数量',
    parameters: {
      type: 'object',
      properties: {
        productId: { type: 'string', description: '商品ID' },
        stock: { type: 'number', description: '新的库存数量' },
      },
      required: ['productId', 'stock'],
    },
    requiresConfirmation: true,
  },
  {
    name: 'update_product_price',
    description: '修改单个商品的价格',
    parameters: {
      type: 'object',
      properties: {
        productId: { type: 'string', description: '商品ID' },
        price: { type: 'number', description: '新的价格' },
      },
      required: ['productId', 'price'],
    },
    requiresConfirmation: true,
  },
  {
    name: 'update_order_status',
    description: '更新单个订单的状态（如标记为已发货、已送达等）',
    parameters: {
      type: 'object',
      properties: {
        orderId: { type: 'string', description: '订单ID' },
        status: { type: 'string', description: '新的订单状态：pending/processing/shipped/delivered/cancelled/refunded' },
        note: { type: 'string', description: '状态变更备注（可选）' },
      },
      required: ['orderId', 'status'],
    },
    requiresConfirmation: true,
  },
  {
    name: 'reply_to_message',
    description: '回复单条客户留言/消息',
    parameters: {
      type: 'object',
      properties: {
        messageId: { type: 'string', description: '留言ID' },
        replyText: { type: 'string', description: '回复内容' },
      },
      required: ['messageId', 'replyText'],
    },
    requiresConfirmation: true,
  },
  {
    name: 'batch_update_stock',
    description: '批量修改多个商品的库存数量',
    parameters: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              productId: { type: 'string', description: '商品ID' },
              stock: { type: 'number', description: '新的库存数量' },
            },
            required: ['productId', 'stock'],
          },
          description: '要修改的商品列表，每个元素包含 productId 和 stock',
        },
      },
      required: ['items'],
    },
    requiresConfirmation: true,
  },
  {
    name: 'batch_update_price',
    description: '批量修改多个商品的价格',
    parameters: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              productId: { type: 'string', description: '商品ID' },
              price: { type: 'number', description: '新的价格' },
            },
            required: ['productId', 'price'],
          },
          description: '要修改的商品列表，每个元素包含 productId 和 price',
        },
      },
      required: ['items'],
    },
    requiresConfirmation: true,
  },
  {
    name: 'batch_ship_orders',
    description: '批量将多个订单标记为已发货',
    parameters: {
      type: 'object',
      properties: {
        orderIds: {
          type: 'array',
          items: { type: 'string' },
          description: '要标记发货的订单ID列表',
        },
        note: { type: 'string', description: '发货备注（可选）' },
      },
      required: ['orderIds'],
    },
    requiresConfirmation: true,
  },
]

export const AI_TOOLS: AITool[] = [
  {
    name: 'get_order_stats',
    description: '获取订单统计数据，包括总订单数、各状态订单数、总销售额等',
    parameters: {
      type: 'object',
      properties: {
        days: { type: 'number', description: '统计最近多少天的数据，不传则统计全部' },
      },
      required: [],
    },
  },
  {
    name: 'list_orders',
    description: '查询订单列表，支持按状态、时间范围筛选',
    parameters: {
      type: 'object',
      properties: {
        status: { type: 'string', description: '订单状态：pending/processing/shipped/delivered/cancelled/refunded' },
        limit: { type: 'number', description: '返回数量，默认20，最多50' },
        offset: { type: 'number', description: '分页偏移量' },
        sortBy: { type: 'string', description: '排序字段，默认 createdAt' },
        sortOrder: { type: 'string', description: '排序方向：asc/desc，默认 desc' },
      },
      required: [],
    },
  },
  {
    name: 'get_order_detail',
    description: '根据订单号查询订单详细信息',
    parameters: {
      type: 'object',
      properties: {
        orderId: { type: 'string', description: '订单ID' },
      },
      required: ['orderId'],
    },
  },
  {
    name: 'get_sales_stats',
    description: '获取销售统计数据，包括销售额、销量排行等',
    parameters: {
      type: 'object',
      properties: {
        days: { type: 'number', description: '统计最近多少天，默认30' },
      },
      required: [],
    },
  },
  {
    name: 'list_products',
    description: '查询商品列表，支持按分类、库存状态筛选',
    parameters: {
      type: 'object',
      properties: {
        category: { type: 'string', description: '分类slug' },
        lowStock: { type: 'boolean', description: '是否只显示低库存商品' },
        limit: { type: 'number', description: '返回数量，默认20，最多50' },
        offset: { type: 'number', description: '分页偏移量' },
      },
      required: [],
    },
  },
  {
    name: 'get_product_detail',
    description: '根据商品ID查询商品详细信息',
    parameters: {
      type: 'object',
      properties: {
        productId: { type: 'string', description: '商品ID' },
      },
      required: ['productId'],
    },
  },
  {
    name: 'get_inventory_summary',
    description: '获取库存汇总信息，包括低库存预警、总SKU数等',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'list_customers',
    description: '查询客户列表（已脱敏，不含密码等敏感信息）',
    parameters: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: '返回数量，默认20，最多50' },
        offset: { type: 'number', description: '分页偏移量' },
      },
      required: [],
    },
  },
  {
    name: 'get_customer_detail',
    description: '查询客户详情（已脱敏）和该客户的订单列表',
    parameters: {
      type: 'object',
      properties: {
        customerId: { type: 'string', description: '客户ID或邮箱' },
      },
      required: ['customerId'],
    },
  },
  {
    name: 'list_messages',
    description: '查询客户留言/消息列表（已脱敏）',
    parameters: {
      type: 'object',
      properties: {
        status: { type: 'string', description: '消息状态：unread/read/replied' },
        limit: { type: 'number', description: '返回数量，默认20，最多50' },
      },
      required: [],
    },
  },
  {
    name: 'list_reviews',
    description: '查询商品评论列表',
    parameters: {
      type: 'object',
      properties: {
        productId: { type: 'string', description: '商品ID，不传则返回所有评论' },
        approved: { type: 'boolean', description: '是否只显示已审核评论' },
        limit: { type: 'number', description: '返回数量，默认20，最多50' },
      },
      required: [],
    },
  },
  {
    name: 'get_categories',
    description: '获取所有商品分类',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'get_system_info',
    description: '获取系统基本信息（不含敏感配置）',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'get_sales_diagnosis',
    description: '获取完整的销售诊断数据，包含销售额趋势、商品表现、客户分析、库存健康度等，用于给出运营建议',
    parameters: {
      type: 'object',
      properties: {
        days: { type: 'number', description: '分析最近多少天的数据，默认30天' },
      },
      required: [],
    },
  },
  {
    name: 'forecast_sales',
    description: '基于历史订单数据预测未来销量。使用移动平均+趋势外推+周内周期性。返回未来N天每日预测销量、销售额，以及 Top 商品预测。可用于备货决策、营销节奏规划。',
    parameters: {
      type: 'object',
      properties: {
        days: { type: 'number', description: '预测未来多少天，默认7，最大30' },
        historyDays: { type: 'number', description: '使用多少天历史数据做预测，默认60，建议≥30' },
        productId: { type: 'string', description: '可选，只预测某商品。不填则预测全店' },
      },
      required: [],
    },
  },
  {
    name: 'get_customer_segments',
    description: '客户画像与分群：自动给所有客户打标签（VIP/高价值/高频/中频/低频/沉睡/新客/流失风险/价格敏感等），并给出每个分群的人数、占比、平均消费、营销建议。可指定单个客户ID查看其画像。',
    parameters: {
      type: 'object',
      properties: {
        customerId: { type: 'string', description: '可选，查看单个客户画像。不填则返回全店分群' },
      },
      required: [],
    },
  },
  {
    name: 'suggest_pricing',
    description: 'AI 智能定价建议：基于销量速度、库存周转、利润率、价格档位分布，给出调价建议（仅建议，不直接改价）。可指定单个商品或全店扫描。',
    parameters: {
      type: 'object',
      properties: {
        productId: { type: 'string', description: '可选，只分析某商品。不填则全店扫描并返回 Top 10 需调价商品' },
        historyDays: { type: 'number', description: '使用多少天销售数据，默认30' },
      },
      required: [],
    },
  },
  {
    name: 'export_orders_report',
    description: '生成订单报表数据（可下载为CSV），返回订单列表的结构化数据，用于导出',
    parameters: {
      type: 'object',
      properties: {
        days: { type: 'number', description: '最近多少天的订单，默认30天' },
        status: { type: 'string', description: '按状态筛选：pending/processing/shipped/delivered/cancelled/refunded，可选' },
      },
      required: [],
    },
  },
  {
    name: 'export_inventory_report',
    description: '生成库存报表数据（可下载为CSV），返回所有商品的库存、价格等信息',
    parameters: {
      type: 'object',
      properties: {
        lowStockOnly: { type: 'boolean', description: '是否只显示库存不足的商品，默认false' },
      },
      required: [],
    },
  },
  {
    name: 'export_customers_report',
    description: '生成客户报表数据（可下载为CSV），返回客户列表信息',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'recommend_products',
    description: '根据客户历史购买记录分析偏好，推荐相关商品。可指定客户或做通用推荐',
    parameters: {
      type: 'object',
      properties: {
        customerEmail: { type: 'string', description: '客户邮箱，用于个性化推荐。可选，不填则做通用热门推荐' },
        limit: { type: 'number', description: '推荐数量，默认5' },
      },
      required: [],
    },
  },
  {
    name: 'discover_schema',
    description: '动态扫描数据库，发现所有数据表的结构和字段。当用户问及AI不熟悉的数据时，先调用此工具了解数据结构。也用于发现新增的字段、表、配置项。',
    parameters: {
      type: 'object',
      properties: {
        table: { type: 'string', description: '指定表名扫描：orders/products/users/messages/reviews/settings/staff。不填则扫描全部' },
      },
      required: [],
    },
  },
  {
    name: 'query_table',
    description: '通用数据查询工具，可查询任意表的数据。当其他专用工具无法满足时使用。会自动过滤敏感字段。',
    parameters: {
      type: 'object',
      properties: {
        table: { type: 'string', description: '表名：orders/products/users/messages/reviews/settings/staff' },
        filter: { type: 'string', description: '过滤条件，JSON格式字符串，如 {"status":"shipped"}' },
        limit: { type: 'number', description: '返回数量限制，默认20，最大100' },
        fields: { type: 'string', description: '指定返回字段，逗号分隔，如 "id,name,price"。不填返回全部（自动过滤敏感字段）' },
      },
      required: ['table'],
    },
  },
  {
    name: 'search_knowledge_base',
    description: '搜索店铺知识库（FAQ、退换货政策、运营SOP、产品知识、营销话术等）。当用户问到店铺规则、政策、流程、产品使用说明、常见问题时调用此工具。如果搜不到相关内容，请如实告知用户「知识库中暂无此信息」。',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: '搜索关键词或问题' },
        category: { type: 'string', description: '可选，按分类过滤：FAQ/政策/SOP/产品知识/营销话术' },
        limit: { type: 'number', description: '返回数量，默认5' },
      },
      required: ['query'],
    },
  },
  {
    name: 'list_knowledge_base',
    description: '列出知识库中所有条目（仅返回 id、title、category、tags，不返回 content）。用于让用户浏览知识库内容或检查某分类下有哪些条目。',
    parameters: {
      type: 'object',
      properties: {
        category: { type: 'string', description: '可选，按分类过滤' },
      },
      required: [],
    },
  },
  {
    name: 'list_social_accounts',
    description: '查询已连接的社交媒体账号（Instagram/Facebook/Twitter/TikTok/YouTube/Pinterest/LinkedIn），返回账号ID、平台、用户名。用户要求发布内容时先调用此工具确认可用账号。',
    parameters: {
      type: 'object',
      properties: {
        platform: { type: 'string', description: '可选，按平台过滤，如 instagram' },
      },
      required: [],
    },
  },
  {
    name: 'run_marketing_workflow',
    description: '一键营销工作流：为指定商品依次生成推广文案、营销配图、产品视频，并可自动发布到社交平台（默认 Instagram）。当用户说“给某个产品生成文案/图片/视频并发布”这类需求时调用此工具，它会自动完成全部步骤。',
    parameters: {
      type: 'object',
      properties: {
        productId: { type: 'string', description: '商品ID（必填，先用 list_products 查询确认）' },
        platform: { type: 'string', description: '发布平台，默认 instagram' },
        publish: { type: 'boolean', description: '是否自动发布到社交平台，默认 true' },
        publishAccountId: { type: 'string', description: '可选，指定发布账号ID（先用 list_social_accounts 查询）' },
        prompt: { type: 'string', description: '可选，营销重点/风格/活动要求' },
      },
      required: ['productId'],
    },
  },
]

function sanitizeOrder(order: any): any {
  const { passwordHash, salt, token, ...safe } = order
  if (safe.shipping) {
    const { ...shippingSafe } = safe.shipping
    safe.shipping = shippingSafe
  }
  return safe
}

function sanitizeUser(user: any): any {
  const { passwordHash, salt, token, password, ...safe } = user
  return safe
}

function sanitizeProduct(product: any): any {
  return product
}

function sanitizeMessage(msg: any): any {
  const { ...safe } = msg
  if (safe.phone) {
    safe.phone = safe.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
  }
  return safe
}

function sanitizeStaff(staff: any): any {
  const { passwordHash, salt, password, ...safe } = staff
  if (safe.email) {
    const [name, domain] = safe.email.split('@')
    safe.email = name.substring(0, 2) + '***@' + domain
  }
  return safe
}

function sanitizeSettings(settings: any): any {
  const safe: any = {
    siteName: settings.siteName,
    siteTagline: settings.siteTagline,
    currency: settings.currency,
    shippingFreeThreshold: settings.shippingFreeThreshold,
    shippingCost: settings.shippingCost,
  }
  return safe
}

export async function executeTool(name: string, args: any): Promise<any> {
  const repo = getRepository()

  switch (name) {
    case 'get_order_stats': {
      const orders = repo.orders.list()
      const days = args.days
      const now = new Date()
      const cutoff = days ? new Date(now.getTime() - days * 24 * 60 * 60 * 1000) : null

      const filtered = cutoff
        ? orders.filter((o: any) => new Date(o.createdAt) >= cutoff)
        : orders

      const stats: any = {
        totalOrders: filtered.length,
        totalRevenue: filtered.reduce((sum: number, o: any) => sum + (o.total || 0), 0),
        avgOrderValue: filtered.length > 0
          ? filtered.reduce((sum: number, o: any) => sum + (o.total || 0), 0) / filtered.length
          : 0,
        byStatus: {} as Record<string, number>,
      }

      for (const o of filtered) {
        const status = o.status || 'unknown'
        stats.byStatus[status] = (stats.byStatus[status] || 0) + 1
      }

      return stats
    }

    case 'list_orders': {
      let orders = repo.orders.list()
      const status = args.status
      const limit = Math.min(args.limit || 20, 50)
      const offset = args.offset || 0
      const sortBy = args.sortBy || 'createdAt'
      const sortOrder = args.sortOrder || 'desc'

      if (status) {
        orders = orders.filter((o: any) => o.status === status)
      }

      orders.sort((a: any, b: any) => {
        const av = a[sortBy]
        const bv = b[sortBy]
        if (sortOrder === 'asc') return av > bv ? 1 : -1
        return av < bv ? 1 : -1
      })

      const page = orders.slice(offset, offset + limit)
      return {
        total: orders.length,
        limit,
        offset,
        orders: page.map(sanitizeOrder),
      }
    }

    case 'get_order_detail': {
      const order = repo.orders.getById(args.orderId)
      if (!order) return { error: 'Order not found' }
      return sanitizeOrder(order)
    }

    case 'get_sales_stats': {
      const orders = repo.orders.list()
      const days = args.days || 30
      const now = new Date()
      const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)

      const filtered = orders.filter((o: any) =>
        new Date(o.createdAt) >= cutoff &&
        ['delivered', 'shipped', 'processing'].includes(o.status)
      )

      const productSales: Record<string, { name: string; quantity: number; revenue: number }> = {}

      for (const o of filtered) {
        for (const item of (o as any).items || []) {
          const pid = item.productId || item.id
          if (!productSales[pid]) {
            productSales[pid] = { name: item.name || item.nameEn || pid, quantity: 0, revenue: 0 }
          }
          productSales[pid].quantity += item.quantity || 0
          productSales[pid].revenue += item.subtotal || (item.price * item.quantity) || 0
        }
      }

      const topProducts = Object.values(productSales)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10)

      return {
        periodDays: days,
        totalOrders: filtered.length,
        totalRevenue: filtered.reduce((sum: number, o: any) => sum + (o.total || 0), 0),
        avgOrderValue: filtered.length > 0
          ? filtered.reduce((sum: number, o: any) => sum + (o.total || 0), 0) / filtered.length
          : 0,
        topProducts,
      }
    }

    case 'list_products': {
      let products = repo.products.list()
      const category = args.category
      const lowStock = args.lowStock
      const limit = Math.min(args.limit || 20, 50)
      const offset = args.offset || 0

      if (category) {
        products = products.filter((p: any) => p.category === category || p.categorySlug === category)
      }

      if (lowStock) {
        products = products.filter((p: any) => (p.stock ?? p.inventory ?? 100) < 10)
      }

      const page = products.slice(offset, offset + limit)
      return {
        total: products.length,
        limit,
        offset,
        products: page.map(sanitizeProduct),
      }
    }

    case 'get_product_detail': {
      const product = repo.products.getById(args.productId)
      if (!product) return { error: 'Product not found' }
      return sanitizeProduct(product)
    }

    case 'get_inventory_summary': {
      const products = repo.products.list()
      const lowStockThreshold = 10
      const outOfStockThreshold = 0

      let lowStock = 0
      let outOfStock = 0
      let totalValue = 0
      let totalStock = 0

      for (const p of products) {
        const stock = (p as any).stock ?? (p as any).inventory ?? 0
        const price = (p as any).price || 0
        totalStock += stock
        totalValue += stock * price
        if (stock <= outOfStockThreshold) outOfStock++
        else if (stock < lowStockThreshold) lowStock++
      }

      return {
        totalSkus: products.length,
        totalStock,
        totalInventoryValue: totalValue,
        lowStockCount: lowStock,
        outOfStockCount: outOfStock,
        lowStockThreshold,
      }
    }

    case 'list_customers': {
      const users = repo.users.list()
      const limit = Math.min(args.limit || 20, 50)
      const offset = args.offset || 0
      const page = users.slice(offset, offset + limit)
      return {
        total: users.length,
        limit,
        offset,
        customers: page.map(sanitizeUser),
      }
    }

    case 'get_customer_detail': {
      const id = args.customerId
      let user = repo.users.getById(id) || repo.users.getByEmail(id)
      if (!user) return { error: 'Customer not found' }

      const orders = repo.orders.list()
        .filter((o: any) => o.customerEmail === user.email || o.userEmail === user.email)

      return {
        customer: sanitizeUser(user),
        orderCount: orders.length,
        totalSpent: orders.reduce((sum: number, o: any) => sum + (o.total || 0), 0),
        recentOrders: orders.slice(0, 10).map(sanitizeOrder),
      }
    }

    case 'list_messages': {
      let messages = repo.messages.list()
      const status = args.status
      const limit = Math.min(args.limit || 20, 50)

      if (status === 'unread') {
        messages = messages.filter((m: any) => !m.read)
      } else if (status === 'replied') {
        messages = messages.filter((m: any) => m.replied)
      }

      return {
        total: messages.length,
        limit,
        messages: messages.slice(0, limit).map(sanitizeMessage),
      }
    }

    case 'list_reviews': {
      let reviews = repo.reviews.list()
      const productId = args.productId
      const approved = args.approved
      const limit = Math.min(args.limit || 20, 50)

      if (productId) {
        reviews = reviews.filter((r: any) => r.productId === productId)
      }

      if (approved !== undefined) {
        reviews = reviews.filter((r: any) => r.approved === approved)
      }

      return {
        total: reviews.length,
        limit,
        reviews: reviews.slice(0, limit),
      }
    }

    case 'get_categories': {
      const categories = repo.categories.list()
      return { categories }
    }

    case 'get_system_info': {
      const settings = repo.settings.get()
      const staff = repo.staff.list()
      return {
        site: sanitizeSettings(settings),
        staffCount: staff.length,
        activeStaffCount: staff.filter((s: any) => s.active).length,
      }
    }

    case 'export_orders_report': {
      const days = args.days || 30
      const status = args.status
      const now = new Date()
      const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)

      let orders = repo.orders.list()

      if (status) {
        orders = orders.filter((o: any) => o.status === status)
      }

      const filtered = orders.filter((o: any) => new Date(o.createdAt) >= cutoff)

      const rows = filtered.map((o: any) => ({
        订单号: o.id,
        日期: o.createdAt?.split('T')[0] || '',
        状态: o.status || '',
        客户: o.customerEmail || o.userEmail || '',
        商品数: o.items?.length || 0,
        金额: o.total || 0,
        支付方式: o.paymentMethod || '',
      }))

      return {
        reportType: 'orders',
        title: `订单报表（最近${days}天）`,
        filename: `orders_${days}days.csv`,
        total: rows.length,
        rows,
      }
    }

    case 'export_inventory_report': {
      const lowStockOnly = args.lowStockOnly || false
      let products = repo.products.list()

      if (lowStockOnly) {
        products = products.filter((p: any) => {
          const stock = p.stock ?? p.inventory ?? 0
          return stock < 10
        })
      }

      const rows = products.map((p: any) => ({
        商品ID: p.id,
        名称: p.name || p.nameEn || '',
        SKU: p.sku || '',
        库存: p.stock ?? p.inventory ?? 0,
        价格: p.price || 0,
        分类: p.category || '',
        状态: (p.stock ?? p.inventory ?? 0) === 0 ? '售罄' : (p.stock ?? p.inventory ?? 0) < 10 ? '库存不足' : '正常',
      }))

      return {
        reportType: 'inventory',
        title: lowStockOnly ? '低库存报表' : '库存报表',
        filename: lowStockOnly ? 'low_stock.csv' : 'inventory.csv',
        total: rows.length,
        rows,
      }
    }

    case 'export_customers_report': {
      const users = repo.users.list()
      const orders = repo.orders.list()

      const orderCountByUser: Record<string, number> = {}
      const totalSpentByUser: Record<string, number> = {}
      for (const o of orders) {
        const email = (o as any).customerEmail || (o as any).userEmail
        if (email) {
          orderCountByUser[email] = (orderCountByUser[email] || 0) + 1
          totalSpentByUser[email] = (totalSpentByUser[email] || 0) + ((o as any).total || 0)
        }
      }

      const rows = users.map((u: any) => ({
        客户ID: u.id,
        姓名: u.name || u.fullName || '',
        邮箱: u.email || '',
        注册时间: u.createdAt?.split('T')[0] || '',
        订单数: orderCountByUser[u.email] || 0,
        消费总额: totalSpentByUser[u.email] || 0,
        等级: u.tier || u.level || '普通',
      }))

      return {
        reportType: 'customers',
        title: '客户报表',
        filename: 'customers.csv',
        total: rows.length,
        rows,
      }
    }

    case 'recommend_products': {
      const limit = args.limit || 5
      const customerEmail = args.customerEmail
      const orders = repo.orders.list()
      const products = repo.products.list().filter((p: any) => p.active !== false)

      if (customerEmail) {
        const customerOrders = orders.filter((o: any) =>
          (o.customerEmail === customerEmail || o.userEmail === customerEmail) &&
          o.status !== 'cancelled'
        )

        const purchasedProductIds = new Set<string>()
        const categoryCount: Record<string, number> = {}
        const pricePoints: number[] = []

        for (const o of customerOrders) {
          for (const item of (o as any).items || []) {
            const pid = item.productId || item.id
            purchasedProductIds.add(pid)
            const product = products.find((p: any) => p.id === pid)
            if (product) {
              const cat = (product as any).category || 'other'
              categoryCount[cat] = (categoryCount[cat] || 0) + (item.quantity || 1)
              pricePoints.push((product as any).price || 0)
            }
          }
        }

        const avgPrice = pricePoints.length > 0
          ? pricePoints.reduce((a, b) => a + b, 0) / pricePoints.length
          : 0

        const topCategories = Object.entries(categoryCount)
          .sort((a, b) => b[1] - a[1])
          .map(([cat]) => cat)

        const recommendations = products
          .filter((p: any) => !purchasedProductIds.has(p.id))
          .map((p: any) => {
            let score = 0
            const cat = p.category || 'other'
            const catIdx = topCategories.indexOf(cat)
            if (catIdx >= 0) score += (topCategories.length - catIdx) * 10

            if (avgPrice > 0) {
              const priceDiff = Math.abs((p.price || 0) - avgPrice)
              const priceScore = Math.max(0, 10 - priceDiff / avgPrice * 10)
              score += priceScore
            }

            const stock = p.stock ?? p.inventory ?? 0
            if (stock > 0) score += 5

            if (p.rating) score += Math.min(p.rating, 5)

            return {
              id: p.id,
              name: p.name || p.nameEn,
              price: p.price,
              category: cat,
              stock,
              rating: p.rating || null,
              score: parseFloat(score.toFixed(2)),
              reason: catIdx >= 0
                ? `与客户偏好的「${cat}」品类匹配`
                : avgPrice > 0 && Math.abs((p.price || 0) - avgPrice) / avgPrice < 0.3
                  ? '价格在客户常用区间'
                  : '综合推荐',
            }
          })
          .sort((a, b) => b.score - a.score)
          .slice(0, limit)

        return {
          type: 'personalized',
          customerEmail,
          purchaseHistory: {
            totalOrders: customerOrders.length,
            purchasedProducts: purchasedProductIds.size,
            topCategories,
            avgPrice: parseFloat(avgPrice.toFixed(2)),
          },
          recommendations,
        }
      } else {
        const productSales: Record<string, { name: string; quantity: number; revenue: number }> = {}
        for (const o of orders) {
          if ((o as any).status === 'cancelled') continue
          for (const item of (o as any).items || []) {
            const pid = item.productId || item.id
            if (!productSales[pid]) {
              productSales[pid] = { name: item.name || item.nameEn || pid, quantity: 0, revenue: 0 }
            }
            productSales[pid].quantity += item.quantity || 0
            productSales[pid].revenue += item.subtotal || ((item.price || 0) * (item.quantity || 0))
          }
        }

        const trending = products
          .map((p: any) => {
            const sales = productSales[p.id] || { quantity: 0, revenue: 0 }
            const stock = p.stock ?? p.inventory ?? 0
            return {
              id: p.id,
              name: p.name || p.nameEn,
              price: p.price,
              category: p.category || 'other',
              stock,
              rating: p.rating || null,
              soldCount: sales.quantity,
              revenue: parseFloat(sales.revenue.toFixed(2)),
              reason: sales.quantity > 0 ? `已售 ${sales.quantity} 件，热销商品` : '新品推荐',
            }
          })
          .sort((a, b) => b.soldCount - a.soldCount || (b.rating || 0) - (a.rating || 0))
          .slice(0, limit)

        return {
          type: 'trending',
          recommendations: trending,
        }
      }
    }

    case 'get_sales_diagnosis': {
      const days = args.days || 30
      const now = new Date()
      const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
      const prevCutoff = new Date(cutoff.getTime() - days * 24 * 60 * 60 * 1000)

      const orders = repo.orders.list()
      const products = repo.products.list()
      const users = repo.users.list()

      const periodOrders = orders.filter((o: any) =>
        new Date(o.createdAt) >= cutoff &&
        ['delivered', 'shipped', 'processing', 'pending'].includes(o.status)
      )

      const prevPeriodOrders = orders.filter((o: any) =>
        new Date(o.createdAt) >= prevCutoff &&
        new Date(o.createdAt) < cutoff &&
        ['delivered', 'shipped', 'processing', 'pending'].includes(o.status)
      )

      const periodRevenue = periodOrders.reduce((sum: number, o: any) => sum + (o.total || 0), 0)
      const prevRevenue = prevPeriodOrders.reduce((sum: number, o: any) => sum + (o.total || 0), 0)
      const revenueGrowth = prevRevenue > 0 ? ((periodRevenue - prevRevenue) / prevRevenue) * 100 : 0

      const avgOrderValue = periodOrders.length > 0 ? periodRevenue / periodOrders.length : 0
      const prevAvgOrderValue = prevPeriodOrders.length > 0 ? prevRevenue / prevPeriodOrders.length : 0
      const aovGrowth = prevAvgOrderValue > 0 ? ((avgOrderValue - prevAvgOrderValue) / prevAvgOrderValue) * 100 : 0

      const productSales: Record<string, { name: string; quantity: number; revenue: number }> = {}
      for (const o of periodOrders) {
        for (const item of (o as any).items || []) {
          const pid = item.productId || item.id
          if (!productSales[pid]) {
            productSales[pid] = { name: item.name || item.nameEn || pid, quantity: 0, revenue: 0 }
          }
          productSales[pid].quantity += item.quantity || 0
          productSales[pid].revenue += item.subtotal || (item.price * item.quantity) || 0
        }
      }

      const topProducts = Object.values(productSales)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5)

      const bottomProducts = products
        .filter((p: any) => (p as any).active !== false)
        .map((p: any) => {
          const sales = productSales[p.id] || { name: p.name || p.nameEn, quantity: 0, revenue: 0 }
          return { id: p.id, name: p.name || p.nameEn, quantity: sales.quantity, revenue: sales.revenue, price: p.price }
        })
        .sort((a, b) => a.revenue - b.revenue)
        .slice(0, 5)

      const periodCustomers = new Set(
        periodOrders.map((o: any) => o.customerEmail || o.userEmail).filter(Boolean)
      )
      const newCustomers = users.filter((u: any) => new Date(u.createdAt) >= cutoff).length

      let lowStock = 0
      let outOfStock = 0
      let totalStock = 0
      let totalInventoryValue = 0
      for (const p of products) {
        const stock = (p as any).stock ?? (p as any).inventory ?? 0
        const price = (p as any).price || 0
        totalStock += stock
        totalInventoryValue += stock * price
        if (stock === 0) outOfStock++
        else if (stock < 10) lowStock++
      }

      const dailySales: { date: string; revenue: number; orders: number }[] = []
      const dayMs = 24 * 60 * 60 * 1000
      for (let i = days - 1; i >= 0; i--) {
        const dayStart = new Date(now.getTime() - i * dayMs)
        dayStart.setHours(0, 0, 0, 0)
        const dayEnd = new Date(dayStart.getTime() + dayMs - 1)
        const dayOrders = periodOrders.filter((o: any) => {
          const t = new Date(o.createdAt).getTime()
          return t >= dayStart.getTime() && t <= dayEnd.getTime()
        })
        dailySales.push({
          date: dayStart.toISOString().split('T')[0],
          revenue: dayOrders.reduce((sum: number, o: any) => sum + (o.total || 0), 0),
          orders: dayOrders.length,
        })
      }

      return {
        periodDays: days,
        periodRevenue,
        prevRevenue,
        revenueGrowth: parseFloat(revenueGrowth.toFixed(2)),
        orderCount: periodOrders.length,
        prevOrderCount: prevPeriodOrders.length,
        orderGrowth: prevPeriodOrders.length > 0
          ? parseFloat((((periodOrders.length - prevPeriodOrders.length) / prevPeriodOrders.length) * 100).toFixed(2))
          : 0,
        avgOrderValue: parseFloat(avgOrderValue.toFixed(2)),
        prevAvgOrderValue: parseFloat(prevAvgOrderValue.toFixed(2)),
        aovGrowth: parseFloat(aovGrowth.toFixed(2)),
        topProducts,
        bottomProducts,
        uniqueCustomers: periodCustomers.size,
        newCustomers,
        inventory: {
          totalSkus: products.length,
          totalStock,
          totalInventoryValue,
          lowStock,
          outOfStock,
        },
        dailySales,
      }
    }

    case 'discover_schema': {
      // 动态数据感知：扫描各数据表的字段结构，让 AI 适应新增字段/表
      const SENSITIVE_FIELDS = ['passwordHash', 'salt', 'token', 'password', 'apiKey', 'apiSecret', 'secret']

      const tableProbes: Record<string, () => any[]> = {
        orders: () => repo.orders.list(),
        products: () => repo.products.list(),
        users: () => repo.users.list(),
        messages: () => repo.messages.list(),
        reviews: () => repo.reviews.list(),
        settings: () => [repo.settings.get()],
        staff: () => repo.staff.list(),
        categories: () => repo.categories ? repo.categories.list() : [],
        suppliers: () => repo.suppliers ? repo.suppliers.list() : [],
        newsletter: () => repo.newsletter ? repo.newsletter.list() : [],
      }

      const inferType = (v: any): string => {
        if (v === null || v === undefined) return 'null'
        if (Array.isArray(v)) return 'array'
        if (v instanceof Date) return 'date'
        const t = typeof v
        if (t === 'object') return 'object'
        return t
      }

      const scanTable = (tableName: string, rows: any[]) => {
        const sample = rows.slice(0, 5)
        // 合并所有样本的字段（防止首条记录字段不全）
        const fieldMap: Record<string, { type: string; sample: any; sensitive: boolean; nullable: boolean }> = {}
        for (const row of sample) {
          if (!row || typeof row !== 'object') continue
          for (const key of Object.keys(row)) {
            if (!fieldMap[key]) {
              fieldMap[key] = {
                type: inferType(row[key]),
                sample: row[key],
                sensitive: SENSITIVE_FIELDS.some(s => key.toLowerCase().includes(s.toLowerCase())),
                nullable: row[key] === null || row[key] === undefined,
              }
            } else {
              // 字段已存在，更新可空性
              if (row[key] === null || row[key] === undefined) {
                fieldMap[key].nullable = true
              }
            }
          }
        }
        return {
          table: tableName,
          rowCount: rows.length,
          fields: Object.entries(fieldMap).map(([name, info]) => ({
            name,
            type: info.type,
            sensitive: info.sensitive,
            nullable: info.nullable,
            sample: info.sensitive ? '[REDACTED]' : (typeof info.sample === 'object' ? JSON.stringify(info.sample).substring(0, 100) : String(info.sample).substring(0, 100)),
          })),
        }
      }

      const target = args.table as string | undefined
      if (target) {
        const probe = tableProbes[target]
        if (!probe) {
          return {
            error: `Unknown table: ${target}`,
            availableTables: Object.keys(tableProbes),
          }
        }
        return scanTable(target, probe())
      }

      // 扫描全部表
      const result: any[] = []
      for (const [tableName, probe] of Object.entries(tableProbes)) {
        try {
          const rows = probe()
          result.push(scanTable(tableName, rows))
        } catch (e) {
          result.push({ table: tableName, error: 'Failed to scan' })
        }
      }
      return {
        scannedAt: new Date().toISOString(),
        tables: result,
        hint: '使用 query_table 工具查询具体数据。敏感字段（标 sensitive:true）会被自动脱敏。',
      }
    }

    case 'query_table': {
      // 通用数据查询：当专用工具无法满足时使用，自动过滤敏感字段
      const SENSITIVE_FIELDS = ['passwordHash', 'salt', 'token', 'password', 'apiKey', 'apiSecret', 'secret']
      const isSensitive = (k: string) => SENSITIVE_FIELDS.some(s => k.toLowerCase().includes(s.toLowerCase()))

      const tableLoaders: Record<string, () => any[]> = {
        orders: () => repo.orders.list(),
        products: () => repo.products.list(),
        users: () => repo.users.list(),
        messages: () => repo.messages.list(),
        reviews: () => repo.reviews.list(),
        settings: () => [repo.settings.get()],
        staff: () => repo.staff.list(),
        categories: () => repo.categories ? repo.categories.list() : [],
        suppliers: () => repo.suppliers ? repo.suppliers.list() : [],
        newsletter: () => repo.newsletter ? repo.newsletter.list() : [],
      }

      const loader = tableLoaders[args.table as string]
      if (!loader) {
        return {
          error: `Unknown table: ${args.table}`,
          availableTables: Object.keys(tableLoaders),
          hint: '调用 discover_schema 查看可用表结构。',
        }
      }

      let rows = loader()
      const filter = args.filter ? (typeof args.filter === 'string' ? JSON.parse(args.filter) : args.filter) : null
      const limit = Math.min(args.limit || 20, 100)
      const requestedFields = args.fields ? (args.fields as string).split(',').map((s: string) => s.trim()) : null

      // 应用过滤条件
      if (filter && typeof filter === 'object') {
        rows = rows.filter((row: any) => {
          if (!row || typeof row !== 'object') return false
          return Object.entries(filter).every(([k, v]) => {
            if (row[k] === undefined) return false
            const op = v as any
            if (op && typeof op === 'object' && op.$gte !== undefined) return row[k] >= op.$gte
            if (op && typeof op === 'object' && op.$lte !== undefined) return row[k] <= op.$lte
            if (op && typeof op === 'object' && op.$like !== undefined) return String(row[k]).includes(String(op.$like))
            return row[k] === v
          })
        })
      }

      const total = rows.length
      rows = rows.slice(0, limit)

      // 字段过滤 + 脱敏
      const sanitized = rows.map((row: any) => {
        if (!row || typeof row !== 'object') return row
        const out: Record<string, any> = {}
        const keys = requestedFields ? requestedFields : Object.keys(row)
        for (const k of keys) {
          if (row[k] === undefined) continue
          if (isSensitive(k)) {
            out[k] = '[REDACTED]'
          } else if (k === 'email' && typeof row[k] === 'string') {
            // 邮箱部分隐藏
            const [name, domain] = row[k].split('@')
            out[k] = domain ? name.substring(0, 2) + '***@' + domain : row[k]
          } else if (k === 'phone' && typeof row[k] === 'string') {
            out[k] = row[k].replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
          } else {
            out[k] = row[k]
          }
        }
        return out
      })

      return {
        table: args.table,
        total,
        returned: sanitized.length,
        limit,
        rows: sanitized,
      }
    }

    case 'search_knowledge_base': {
      const results = searchKB(args.query, args.limit || 5)
      const filtered = args.category
        ? results.filter(e => e.category === args.category)
        : results
      return {
        query: args.query,
        count: filtered.length,
        entries: filtered.map(e => ({
          id: e.id,
          title: e.title,
          category: e.category,
          tags: e.tags,
          content: e.content,
        })),
        hint: filtered.length === 0
          ? '知识库中暂无相关内容。可以告诉用户「知识库中暂无此信息，建议补充相关知识库条目」。'
          : '请基于以上知识库内容回答用户，并明确标注信息来源（例如「根据店铺政策：...」）。',
      }
    }

    case 'forecast_sales': {
      // 销量预测：移动平均 + 线性趋势 + 周内周期性
      const forecastDays = Math.min(Math.max(args.days || 7, 1), 30)
      const historyDays = Math.max(args.historyDays || 60, 14)
      const productId = args.productId as string | undefined

      const orders = repo.orders.list()
      const products = repo.products.list()
      const productMap = new Map(products.map((p: any) => [p.id, p]))

      const now = new Date()
      now.setHours(0, 0, 0, 0)
      const historyStart = new Date(now.getTime() - historyDays * 24 * 3600 * 1000)

      // 按天聚合：dailyRevenue / dailyQty / perProductDailyQty
      type DayBucket = { date: string; revenue: number; qty: number; byProduct: Record<string, number> }
      const buckets = new Map<string, DayBucket>()
      const ensureBucket = (d: Date): DayBucket => {
        const key = d.toISOString().slice(0, 10)
        if (!buckets.has(key)) {
          buckets.set(key, { date: key, revenue: 0, qty: 0, byProduct: {} })
        }
        return buckets.get(key)!
      }

      // 预填所有历史日期，避免缺日造成预测偏移
      for (let i = 0; i < historyDays; i++) {
        const d = new Date(historyStart.getTime() + i * 24 * 3600 * 1000)
        ensureBucket(d)
      }

      for (const o of orders) {
        const createdAt = new Date(o.createdAt)
        if (createdAt < historyStart || createdAt > now) continue
        if (o.status === 'cancelled' || o.status === 'refunded') continue

        const bucket = ensureBucket(createdAt)
        const items = o.items || []
        for (const it of items) {
          const pid = it.productId || it.id
          if (!pid) continue
          if (productId && pid !== productId) continue
          const qty = Number(it.quantity || it.qty || 0)
          const price = Number(it.price || 0)
          bucket.qty += qty
          bucket.revenue += qty * price
          bucket.byProduct[pid] = (bucket.byProduct[pid] || 0) + qty
        }
      }

      // 按日期排序
      const sortedDays = Array.from(buckets.values()).sort((a, b) => a.date.localeCompare(b.date))

      if (sortedDays.length === 0 || sortedDays.every(d => d.qty === 0)) {
        return {
          error: '历史数据不足，无法预测。请确保有至少 14 天的订单数据。',
          forecastDays,
          historyDays,
        }
      }

      // === 预测算法 ===
      // 1. 7 日移动平均
      // 2. 线性趋势（最小二乘法拟合）
      // 3. 周内周期性（按 weekday 平均比值）

      const qtySeries = sortedDays.map(d => d.qty)
      const revSeries = sortedDays.map(d => d.revenue)
      const n = qtySeries.length

      // 线性趋势：y = a + b*x
      const linearFit = (ys: number[]) => {
        const xs = ys.map((_, i) => i)
        const meanX = xs.reduce((s, x) => s + x, 0) / n
        const meanY = ys.reduce((s, y) => s + y, 0) / n
        let num = 0, den = 0
        for (let i = 0; i < n; i++) {
          num += (xs[i] - meanX) * (ys[i] - meanY)
          den += (xs[i] - meanX) ** 2
        }
        const b = den === 0 ? 0 : num / den
        const a = meanY - b * meanX
        return { a, b }
      }

      const qtyTrend = linearFit(qtySeries)
      const revTrend = linearFit(revSeries)

      // 周内周期性：计算每个 weekday 的销量与平均值之比
      const weekdayQty: number[][] = Array.from({ length: 7 }, () => [])
      for (let i = 0; i < n; i++) {
        const wd = new Date(sortedDays[i].date).getDay()
        weekdayQty[wd].push(qtySeries[i])
      }
      const overallMeanQty = qtySeries.reduce((s, y) => s + y, 0) / n
      const weekdayFactor = weekdayQty.map(arr => {
        if (arr.length === 0) return 1
        const m = arr.reduce((s, y) => s + y, 0) / arr.length
        return overallMeanQty > 0 ? m / overallMeanQty : 1
      })

      // 移动平均
      const last7AvgQty = qtySeries.slice(-7).reduce((s, y) => s + y, 0) / Math.min(7, n)
      const last7AvgRev = revSeries.slice(-7).reduce((s, y) => s + y, 0) / Math.min(7, n)

      // 生成预测
      const forecast: any[] = []
      let cumQty = 0, cumRev = 0
      for (let i = 1; i <= forecastDays; i++) {
        const futureIdx = n + i - 1
        const futureDate = new Date(now.getTime() + i * 24 * 3600 * 1000)
        const wd = futureDate.getDay()

        // 趋势值
        const trendQty = qtyTrend.a + qtyTrend.b * futureIdx
        const trendRev = revTrend.a + revTrend.b * futureIdx
        // 移动平均基线
        const baseQty = (last7AvgQty + Math.max(0, trendQty)) / 2
        const baseRev = (last7AvgRev + Math.max(0, trendRev)) / 2
        // 应用周期因子
        const predQty = Math.max(0, Math.round(baseQty * weekdayFactor[wd]))
        const predRev = Math.max(0, Math.round(baseRev * weekdayFactor[wd] * 100) / 100)

        cumQty += predQty
        cumRev += predRev
        forecast.push({
          date: futureDate.toISOString().slice(0, 10),
          weekday: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][wd],
          predictedQty: predQty,
          predictedRevenue: predRev,
        })
      }

      // Top 商品预测：用最近 14 天各商品销量占比 × 总预测量
      const recent14 = sortedDays.slice(-14)
      const productQtyTotal: Record<string, number> = {}
      for (const d of recent14) {
        for (const [pid, q] of Object.entries(d.byProduct)) {
          productQtyTotal[pid] = (productQtyTotal[pid] || 0) + q
        }
      }
      const totalRecentQty = Object.values(productQtyTotal).reduce((s, q) => s + q, 0)
      const topProducts = Object.entries(productQtyTotal)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([pid, q]) => {
          const p = productMap.get(pid)
          const ratio = totalRecentQty > 0 ? q / totalRecentQty : 0
          return {
            productId: pid,
            name: p?.name || p?.nameEn || pid,
            recent14Qty: q,
            ratio: Math.round(ratio * 1000) / 1000,
            forecastQty: Math.round(cumQty * ratio),
          }
        })

      return {
        forecastDays,
        historyDays,
        actualHistoryRange: { from: sortedDays[0].date, to: sortedDays[n - 1].date },
        method: '移动平均(7日) + 线性趋势 + 周内周期性',
        summary: {
          totalPredictedQty: cumQty,
          totalPredictedRevenue: Math.round(cumRev * 100) / 100,
          avgDailyQty: Math.round(cumQty / forecastDays * 10) / 10,
          avgDailyRevenue: Math.round(cumRev / forecastDays * 100) / 100,
          trendDirection: qtyTrend.b > 0.1 ? '上升' : qtyTrend.b < -0.1 ? '下降' : '平稳',
          trendSlopePerDay: Math.round(qtyTrend.b * 100) / 100,
        },
        daily: forecast,
        topProducts,
        note: '此预测基于历史订单统计，未考虑促销/节假日/外部事件。建议结合实际营销计划人工调整。',
      }
    }

    case 'get_customer_segments': {
      // 客户画像与分群
      const users = repo.users.list()
      const orders = repo.orders.list()

      // 聚合每个客户的订单数据
      type CustomerStats = {
        userId: string
        name: string
        email: string
        orderCount: number
        totalSpent: number
        avgOrderValue: number
        firstOrderAt: string
        lastOrderAt: string
        daysSinceLastOrder: number
        daysSinceFirstOrder: number
        cancelledCount: number
        distinctProducts: Set<string>
      }

      const statsMap = new Map<string, CustomerStats>()

      for (const u of users) {
        const id = u.id
        statsMap.set(id, {
          userId: id,
          name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email,
          email: u.email,
          orderCount: 0,
          totalSpent: 0,
          avgOrderValue: 0,
          firstOrderAt: '',
          lastOrderAt: '',
          daysSinceLastOrder: 9999,
          daysSinceFirstOrder: 0,
          cancelledCount: 0,
          distinctProducts: new Set(),
        })
      }

      const now = Date.now()
      const DAY = 24 * 3600 * 1000

      for (const o of orders) {
        const uid = o.userId
        if (!uid) continue
        if (!statsMap.has(uid)) {
          // 订单里有 userId 但用户表里没有的（异常数据），跳过
          continue
        }
        const s = statsMap.get(uid)!
        if (o.status === 'cancelled') {
          s.cancelledCount++
          continue
        }
        s.orderCount++
        s.totalSpent += Number(o.total || 0)
        const ts = new Date(o.createdAt).getTime()
        if (!s.firstOrderAt || ts < new Date(s.firstOrderAt).getTime()) s.firstOrderAt = o.createdAt
        if (!s.lastOrderAt || ts > new Date(s.lastOrderAt).getTime()) s.lastOrderAt = o.createdAt
        for (const it of (o.items || [])) {
          const pid = it.productId || it.id
          if (pid) s.distinctProducts.add(pid)
        }
      }

      // 计算衍生指标 + 打标签
      const allStats = Array.from(statsMap.values()).map(s => {
        if (s.orderCount > 0) {
          s.avgOrderValue = Math.round(s.totalSpent / s.orderCount * 100) / 100
          s.daysSinceLastOrder = s.lastOrderAt ? Math.floor((now - new Date(s.lastOrderAt).getTime()) / DAY) : 9999
          s.daysSinceFirstOrder = s.firstOrderAt ? Math.floor((now - new Date(s.firstOrderAt).getTime()) / DAY) : 0
        }
        return s
      })

      // 单个客户查询
      if (args.customerId) {
        const s = allStats.find(s => s.userId === args.customerId)
        if (!s) return { error: 'Customer not found' }
        const tags = tagCustomer(s, allStats)
        return {
          customer: {
            userId: s.userId,
            name: s.name,
            email: s.email,
            orderCount: s.orderCount,
            totalSpent: Math.round(s.totalSpent * 100) / 100,
            avgOrderValue: s.avgOrderValue,
            firstOrderAt: s.firstOrderAt,
            lastOrderAt: s.lastOrderAt,
            daysSinceLastOrder: s.daysSinceLastOrder,
            distinctProductCount: s.distinctProducts.size,
            cancelledCount: s.cancelledCount,
          },
          tags,
          insights: buildInsights(s, tags),
        }
      }

      // 全店分群
      const tagged = allStats.map(s => ({ stats: s, tags: tagCustomer(s, allStats) }))
      const activeCustomers = tagged.filter(t => t.stats.orderCount > 0)
      const noOrderCustomers = tagged.filter(t => t.stats.orderCount === 0)

      // 统计每个标签
      const tagCount: Record<string, number> = {}
      for (const t of tagged) {
        for (const tag of t.tags) {
          tagCount[tag] = (tagCount[tag] || 0) + 1
        }
      }

      // 分群统计
      const segmentStats = (tag: string) => {
        const group = activeCustomers.filter(t => t.tags.includes(tag))
        if (group.length === 0) return { count: 0, avgTotalSpent: 0, avgOrderCount: 0, avgDaysSinceLast: 0 }
        return {
          count: group.length,
          avgTotalSpent: Math.round(group.reduce((s, t) => s + t.stats.totalSpent, 0) / group.length * 100) / 100,
          avgOrderCount: Math.round(group.reduce((s, t) => s + t.stats.orderCount, 0) / group.length * 10) / 10,
          avgDaysSinceLast: Math.round(group.reduce((s, t) => s + t.stats.daysSinceLastOrder, 0) / group.length),
        }
      }

      const totalActive = activeCustomers.length
      const pct = (n: number) => totalActive > 0 ? Math.round(n / totalActive * 1000) / 10 : 0

      return {
        totalCustomers: users.length,
        activeCustomers: totalActive,
        noOrderCustomers: noOrderCustomers.length,
        tagDistribution: Object.entries(tagCount)
          .sort((a, b) => b[1] - a[1])
          .map(([tag, count]) => ({ tag, count, percent: pct(count) })),
        segments: {
          vip: { ...segmentStats('VIP'), description: '累计消费 Top 10% 或 ≥3 单且累计消费超均值2倍', marketing: '专属客服、新品优先、生日礼物' },
          highValue: { ...segmentStats('高价值'), description: '客单价 ≥ 全店均值 1.5倍', marketing: '推荐高单价商品、会员升级' },
          highFreq: { ...segmentStats('高频'), description: '近90天 ≥3 单', marketing: '订阅型产品、搭配套餐' },
          midFreq: { ...segmentStats('中频'), description: '近90天 1-2 单', marketing: '复购提醒、限时优惠' },
          lowFreq: { ...segmentStats('低频'), description: '历史有订单但近90天 0 单', marketing: '唤醒邮件、回归优惠券' },
          dormant: { ...segmentStats('沉睡'), description: '近180天无订单', marketing: '强力唤醒、调查问卷' },
          churnRisk: { ...segmentStats('流失风险'), description: '近90天无订单但历史消费≥1单', marketing: '一对一沟通、专属折扣' },
          newCustomer: { ...segmentStats('新客'), description: '首单在30天内', marketing: '新手引导、首单礼、二单优惠' },
          priceSensitive: { ...segmentStats('价格敏感'), description: '客单价低于均值 0.5 倍', marketing: '促销专场、满减、低价选品' },
        },
        topCustomersByValue: activeCustomers
          .sort((a, b) => b.stats.totalSpent - a.stats.totalSpent)
          .slice(0, 10)
          .map(t => ({
            userId: t.stats.userId,
            name: t.stats.name,
            totalSpent: Math.round(t.stats.totalSpent * 100) / 100,
            orderCount: t.stats.orderCount,
            daysSinceLastOrder: t.stats.daysSinceLastOrder,
            tags: t.tags,
          })),
      }
    }

    case 'suggest_pricing': {
      // AI 智能定价建议（仅建议，不直接改价）
      const historyDays = Math.max(args.historyDays || 30, 7)
      const productId = args.productId as string | undefined
      const products = repo.products.list()
      const orders = repo.orders.list()
      const now = Date.now()
      const cutoff = now - historyDays * 24 * 3600 * 1000

      // 聚合每商品近 N 天销量
      const salesByProduct: Record<string, { qty: number; revenue: number }> = {}
      for (const o of orders) {
        const ts = new Date(o.createdAt).getTime()
        if (ts < cutoff) continue
        if (o.status === 'cancelled' || o.status === 'refunded') continue
        for (const it of (o.items || [])) {
          const pid = it.productId || it.id
          if (!pid) continue
          if (productId && pid !== productId) continue
          const qty = Number(it.quantity || it.qty || 0)
          const price = Number(it.price || 0)
          if (!salesByProduct[pid]) salesByProduct[pid] = { qty: 0, revenue: 0 }
          salesByProduct[pid].qty += qty
          salesByProduct[pid].revenue += qty * price
        }
      }

      // 计算全店价格分布（用于价格档位比较）
      const allActivePrices = products.filter((p: any) => p.active).map((p: any) => Number(p.price) || 0)
      const median = (arr: number[]) => {
        if (arr.length === 0) return 0
        const s = [...arr].sort((a, b) => a - b)
        const mid = Math.floor(s.length / 2)
        return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
      }
      const medianPrice = median(allActivePrices)
      const avgPrice = allActivePrices.length > 0 ? allActivePrices.reduce((s, p) => s + p, 0) / allActivePrices.length : 0

      const analyzeOne = (p: any) => {
        const price = Number(p.price) || 0
        const cost = Number(p.costPrice) || 0
        const stock = Number(p.stock ?? p.inventory ?? 0)
        const sales = salesByProduct[p.id] || { qty: 0, revenue: 0 }
        const dailyQty = sales.qty / historyDays
        const margin = price > 0 ? (price - cost) / price : 0
        const stockDays = dailyQty > 0 ? Math.floor(stock / dailyQty) : 9999 // 库存可售天数

        // 调价逻辑
        const suggestions: string[] = []
        let action: 'raise' | 'lower' | 'keep' | 'clearance' = 'keep'
        let suggestedPrice = price
        let confidence = 0.5
        const reasons: string[] = []

        if (dailyQty === 0) {
          // 无销量
          if (stock > 0 && stockDays > 90) {
            action = 'clearance'
            suggestedPrice = Math.round(price * 0.85 * 100) / 100
            suggestions.push('近 ' + historyDays + ' 天无销量且库存积压，建议清仓价 85折 试销')
            reasons.push('无销量+库存积压')
            confidence = 0.7
          } else if (price > medianPrice * 1.5) {
            action = 'lower'
            suggestedPrice = Math.round(medianPrice * 1.3 * 100) / 100
            suggestions.push(`价格 ${price} 高于全店中位数 ${Math.round(medianPrice * 100) / 100} 的 1.5 倍，但无销量，建议下调至 ${suggestedPrice}`)
            reasons.push('价格过高+无销量')
            confidence = 0.6
          } else {
            suggestions.push('近 ' + historyDays + ' 天无销量，建议检查商品曝光、详情页、关键词，暂不调价')
            reasons.push('无销量但价格合理')
            confidence = 0.4
          }
        } else if (dailyQty >= 1 && stockDays < 14) {
          // 畅销 + 库存告急 → 涨价
          action = 'raise'
          const uplift = stockDays < 7 ? 1.15 : 1.08
          suggestedPrice = Math.round(price * uplift * 100) / 100
          suggestions.push(`日均销 ${dailyQty.toFixed(1)} 件，库存仅可售 ${stockDays} 天，建议涨价至 ${suggestedPrice}（+${Math.round((uplift - 1) * 100)}%）`)
          reasons.push('畅销+库存告急')
          confidence = 0.8
        } else if (dailyQty >= 0.5 && margin < 0.2) {
          // 销量不错但利润低 → 小幅涨价
          action = 'raise'
          suggestedPrice = Math.round(price * 1.05 * 100) / 100
          suggestions.push(`销量稳定但利润率仅 ${Math.round(margin * 100)}%，建议涨价至 ${suggestedPrice}（+5%）`)
          reasons.push('利润率低')
          confidence = 0.65
        } else if (dailyQty > 0 && dailyQty < 0.1 && stockDays > 60) {
          // 慢销 + 库存高 → 降价
          action = 'lower'
          suggestedPrice = Math.round(price * 0.9 * 100) / 100
          suggestions.push(`日均销 ${dailyQty.toFixed(2)} 件，库存可售 ${stockDays} 天，建议降价至 ${suggestedPrice}（-10%）`)
          reasons.push('慢销+库存高')
          confidence = 0.7
        } else if (price < avgPrice * 0.5 && dailyQty > 0.3) {
          // 价格明显偏低且有销量 → 试涨
          action = 'raise'
          suggestedPrice = Math.round(price * 1.1 * 100) / 100
          suggestions.push(`价格 ${price} 远低于全店均价 ${Math.round(avgPrice * 100) / 100}，且销量尚可，建议涨价至 ${suggestedPrice}（+10%）测试价格弹性`)
          reasons.push('价格偏低+有销量')
          confidence = 0.55
        } else {
          suggestions.push(`销量 ${dailyQty.toFixed(2)}/天，库存可售 ${stockDays} 天，利润率 ${Math.round(margin * 100)}%，价格合理，建议保持`)
          reasons.push('指标健康')
          confidence = 0.6
        }

        return {
          productId: p.id,
          name: p.name || p.nameEn || p.id,
          category: p.category,
          currentPrice: price,
          costPrice: cost,
          margin: Math.round(margin * 1000) / 10,
          stock,
          dailyQty: Math.round(dailyQty * 100) / 100,
          stockDays,
          action,
          suggestedPrice: action === 'keep' ? price : suggestedPrice,
          changePercent: action === 'keep' ? 0 : Math.round((suggestedPrice - price) / price * 1000) / 10,
          confidence,
          reasons,
          suggestions,
        }
      }

      if (productId) {
        const p = products.find((x: any) => x.id === productId)
        if (!p) return { error: 'Product not found' }
        return { product: analyzeOne(p), note: '此为建议价格，需人工确认后通过 update_product_price 工具执行修改。' }
      }

      // 全店扫描：返回 Top 10 最需调价的（优先涨价和清仓，再降价，最后保持）
      const allAnalyses = products
        .filter((p: any) => p.active)
        .map(analyzeOne)
      const priority: Record<string, number> = { raise: 0, clearance: 1, lower: 2, keep: 3 }
      const top = allAnalyses
        .sort((a, b) => {
          if (priority[a.action] !== priority[b.action]) return priority[a.action] - priority[b.action]
          return b.confidence - a.confidence
        })
        .slice(0, 10)

      // 汇总统计
      const summary = {
        totalAnalyzed: allAnalyses.length,
        raiseCount: allAnalyses.filter(a => a.action === 'raise').length,
        lowerCount: allAnalyses.filter(a => a.action === 'lower').length,
        clearanceCount: allAnalyses.filter(a => a.action === 'clearance').length,
        keepCount: allAnalyses.filter(a => a.action === 'keep').length,
        potentialRevenueImpact: allAnalyses.reduce((sum, a) => {
          // 估算：(建议价-现价) × 近N天销量
          return sum + (a.suggestedPrice - a.currentPrice) * (a.dailyQty * historyDays)
        }, 0),
      }

      return {
        historyDays,
        medianPrice: Math.round(medianPrice * 100) / 100,
        avgPrice: Math.round(avgPrice * 100) / 100,
        summary,
        topSuggestions: top,
        note: '此为 AI 调价建议，需人工确认后通过 update_product_price 工具执行。批量改价可用 batch_update_price。',
      }
    }

    case 'list_knowledge_base': {
      const all = getAllKBEntries()
      const filtered = args.category
        ? all.filter(e => e.category === args.category)
        : all
      return {
        total: filtered.length,
        categories: Array.from(new Set(all.map(e => e.category))),
        entries: filtered.map(e => ({
          id: e.id,
          title: e.title,
          category: e.category,
          tags: e.tags,
          updatedAt: e.updatedAt,
        })),
      }
    }

    case 'list_social_accounts': {
      const connected = getAllSocialAccounts().filter(a => a.status === 'connected')
      const platform = args.platform
      const accounts = connected
        .filter(a => !platform || a.platform === platform)
        .map(a => ({
          id: a.id,
          platform: a.platform,
          username: a.username,
          staffName: a.staffName || '',
        }))
      return { total: accounts.length, accounts }
    }

    default:
      return { error: `Unknown tool: ${name}` }
  }
}

export async function executeWriteTool(name: string, args: any): Promise<any> {
  const repo = getRepository()

  switch (name) {
    case 'update_product_stock': {
      const product = repo.products.getById(args.productId)
      if (!product) return { success: false, error: 'Product not found' }
      const result = repo.products.update(args.productId, { stock: args.stock, inventory: args.stock } as any)
      return {
        success: true,
        message: `已将「${product.name || product.nameEn || args.productId}」的库存更新为 ${args.stock}`,
        product: result ? sanitizeProduct(result) : null,
      }
    }

    case 'update_product_price': {
      const product = repo.products.getById(args.productId)
      if (!product) return { success: false, error: 'Product not found' }
      const oldPrice = (product as any).price
      const result = repo.products.update(args.productId, { price: args.price } as any)
      return {
        success: true,
        message: `已将「${product.name || product.nameEn || args.productId}」的价格从 $${oldPrice} 更新为 $${args.price}`,
        product: result ? sanitizeProduct(result) : null,
      }
    }

    case 'update_order_status': {
      const order = repo.orders.getById(args.orderId)
      if (!order) return { success: false, error: 'Order not found' }
      const oldStatus = (order as any).status
      const updated = repo.orders.update(args.orderId, {
        status: args.status,
        statusHistory: [
          ...((order as any).statusHistory || []),
          {
            status: args.status,
            timestamp: new Date().toISOString(),
            note: args.note || 'Status updated by AI assistant',
          },
        ],
      } as any)
      return {
        success: true,
        message: `订单 ${args.orderId} 状态已从「${oldStatus}」更新为「${args.status}」`,
        order: updated ? sanitizeOrder(updated) : null,
      }
    }

    case 'reply_to_message': {
      const msg = repo.messages.getById(args.messageId)
      if (!msg) return { success: false, error: 'Message not found' }
      const updated = repo.messages.update(args.messageId, {
        reply: args.replyText,
        replyText: args.replyText,
        replied: true,
        repliedAt: new Date().toISOString(),
        adminReply: args.replyText,
      } as any)
      return {
        success: true,
        message: `已回复留言 ${args.messageId}`,
        reply: args.replyText,
      }
    }

    case 'batch_update_stock': {
      const items = args.items || []
      if (!Array.isArray(items) || items.length === 0) {
        return { success: false, error: 'Items list is required' }
      }
      if (items.length > 50) {
        return { success: false, error: 'Batch size limit is 50 items' }
      }

      let successCount = 0
      const failed: string[] = []
      const results: any[] = []

      for (const item of items) {
        try {
          const product = repo.products.getById(item.productId)
          if (!product) {
            failed.push(`${item.productId}: 商品不存在`)
            continue
          }
          const result = repo.products.update(item.productId, { stock: item.stock, inventory: item.stock } as any)
          if (result) {
            successCount++
            results.push({ productId: item.productId, name: (product as any).name || (product as any).nameEn, stock: item.stock })
          } else {
            failed.push(item.productId)
          }
        } catch (e) {
          failed.push(`${item.productId}: 更新失败`)
        }
      }

      return {
        success: successCount > 0,
        message: `批量修改库存：成功 ${successCount} 个，失败 ${failed.length} 个`,
        successCount,
        failedCount: failed.length,
        failed,
        results,
      }
    }

    case 'batch_update_price': {
      const items = args.items || []
      if (!Array.isArray(items) || items.length === 0) {
        return { success: false, error: 'Items list is required' }
      }
      if (items.length > 50) {
        return { success: false, error: 'Batch size limit is 50 items' }
      }

      let successCount = 0
      const failed: string[] = []
      const results: any[] = []

      for (const item of items) {
        try {
          const product = repo.products.getById(item.productId)
          if (!product) {
            failed.push(`${item.productId}: 商品不存在`)
            continue
          }
          const oldPrice = (product as any).price
          const result = repo.products.update(item.productId, { price: item.price } as any)
          if (result) {
            successCount++
            results.push({
              productId: item.productId,
              name: (product as any).name || (product as any).nameEn,
              oldPrice,
              newPrice: item.price,
            })
          } else {
            failed.push(item.productId)
          }
        } catch (e) {
          failed.push(`${item.productId}: 更新失败`)
        }
      }

      return {
        success: successCount > 0,
        message: `批量修改价格：成功 ${successCount} 个，失败 ${failed.length} 个`,
        successCount,
        failedCount: failed.length,
        failed,
        results,
      }
    }

    case 'batch_ship_orders': {
      const orderIds = args.orderIds || []
      if (!Array.isArray(orderIds) || orderIds.length === 0) {
        return { success: false, error: 'Order IDs list is required' }
      }
      if (orderIds.length > 50) {
        return { success: false, error: 'Batch size limit is 50 orders' }
      }

      let successCount = 0
      const failed: string[] = []
      const results: any[] = []

      for (const orderId of orderIds) {
        try {
          const order = repo.orders.getById(orderId)
          if (!order) {
            failed.push(`${orderId}: 订单不存在`)
            continue
          }
          const oldStatus = (order as any).status
          const updated = repo.orders.update(orderId, {
            status: 'shipped',
            statusHistory: [
              ...((order as any).statusHistory || []),
              {
                status: 'shipped',
                timestamp: new Date().toISOString(),
                note: args.note || 'Shipped (batch operation)',
              },
            ],
          } as any)
          if (updated) {
            successCount++
            results.push({ orderId, oldStatus, newStatus: 'shipped' })
          } else {
            failed.push(orderId)
          }
        } catch (e) {
          failed.push(`${orderId}: 更新失败`)
        }
      }

      return {
        success: successCount > 0,
        message: `批量发货：成功 ${successCount} 个，失败 ${failed.length} 个`,
        successCount,
        failedCount: failed.length,
        failed,
        results,
      }
    }

    default:
      return { success: false, error: `Unknown write tool: ${name}` }
  }
}

// ===== 客户画像辅助函数 =====
type CustomerStats = {
  userId: string
  name: string
  email: string
  orderCount: number
  totalSpent: number
  avgOrderValue: number
  firstOrderAt: string
  lastOrderAt: string
  daysSinceLastOrder: number
  daysSinceFirstOrder: number
  cancelledCount: number
  distinctProducts: Set<string>
}

function tagCustomer(s: CustomerStats, all: CustomerStats[]): string[] {
  const tags: string[] = []
  if (s.orderCount === 0) return ['未消费']

  // 计算全店均值
  const active = all.filter(x => x.orderCount > 0)
  const avgSpent = active.length > 0 ? active.reduce((sum, x) => sum + x.totalSpent, 0) / active.length : 0
  const avgAOV = active.length > 0 ? active.reduce((sum, x) => sum + x.avgOrderValue, 0) / active.length : 0

  // 新客
  if (s.daysSinceFirstOrder <= 30) tags.push('新客')

  // VIP：累计消费 Top 10% 或 ≥3 单且累计消费超均值 2 倍
  const sortedBySpent = [...active].sort((a, b) => b.totalSpent - a.totalSpent)
  const top10Cut = Math.ceil(sortedBySpent.length * 0.1)
  const top10Idx = sortedBySpent.findIndex(x => x.userId === s.userId)
  if (top10Idx >= 0 && top10Idx < top10Cut) tags.push('VIP')
  else if (s.orderCount >= 3 && s.totalSpent >= avgSpent * 2) tags.push('VIP')

  // 高价值
  if (s.avgOrderValue >= avgAOV * 1.5) tags.push('高价值')

  // 高频/中频/低频（近 90 天）
  // 简化：用 daysSinceLastOrder 和 orderCount 近似
  if (s.daysSinceLastOrder <= 90) {
    // 近 90 天单数 ≈ 总单数 × (90/daysSinceFirstOrder)
    const recentRatio = s.daysSinceFirstOrder > 0 ? Math.min(1, 90 / s.daysSinceFirstOrder) : 1
    const estRecentOrders = s.orderCount * recentRatio
    if (estRecentOrders >= 3) tags.push('高频')
    else tags.push('中频')
  } else {
    tags.push('低频')
  }

  // 沉睡 / 流失风险
  if (s.daysSinceLastOrder > 180) tags.push('沉睡')
  else if (s.daysSinceLastOrder > 90 && s.orderCount >= 1) tags.push('流失风险')

  // 价格敏感
  if (s.avgOrderValue < avgAOV * 0.5) tags.push('价格敏感')

  return tags
}

function buildInsights(s: CustomerStats, tags: string[]): string[] {
  const insights: string[] = []
  if (s.orderCount === 0) {
    insights.push('该客户注册后未产生任何订单，可推送新手优惠券促进首单。')
    return insights
  }
  if (tags.includes('VIP')) insights.push('高价值客户，建议配备专属客服，新品上市优先推送。')
  if (tags.includes('沉睡')) insights.push(`已 ${s.daysSinceLastOrder} 天未下单，建议一对一沟通了解原因并提供回归优惠券。`)
  if (tags.includes('流失风险')) insights.push('近期活跃度下降，建议主动触达，避免流失。')
  if (tags.includes('新客')) insights.push('新手期内，建议发送二单优惠券提升复购。')
  if (tags.includes('高频')) insights.push('购买频次高，可推荐订阅型产品或搭配套餐。')
  if (tags.includes('价格敏感')) insights.push('对价格敏感，促销/满减活动效果更佳。')
  if (s.cancelledCount > 0) insights.push(`有 ${s.cancelledCount} 笔取消订单，需关注取消原因。`)
  insights.push(`累计购买过 ${s.distinctProducts.size} 种不同商品。`)
  return insights
}
