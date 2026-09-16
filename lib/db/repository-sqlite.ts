// SQLite Repository 鐎圭偟骞?
// 鏉╂柨娲栭惃鍕殶閹诡喚绮ㄩ弸鍕瑢閻滅増婀侀惃?JSON 濡€虫健鐎瑰苯鍙忛崗鐓庮啇, 閸欘垯浜掗弮鐘电闯閸掑洦宕?

import { getDb, initDatabase } from './sqlite'
import type { Product, Review, Supplier } from '@/lib/db'
import type { Category } from '@/lib/categories'
import type { Order, OrderItem, OrderStatus, StatusEvent, TrackingInfo, ShippingInfo } from '@/lib/orders'
import type { User, UserAddress } from '@/lib/users'
import type { SiteSettings, StaffMember } from '@/lib/settings'
import { DEFAULTS, getSettings, normalizeSavedSettings } from '@/lib/settings'
import type { WorkLogEntry } from '@/lib/work-log'
import type { Message, NewsletterSubscriber } from '@/lib/repository'

// ========== 瀹搞儱鍙块崙鑺ユ殶 ==========

function rowToProduct(row: any): Product {
  return {
    id: row.id,
    code: row.code || undefined,
    name: row.name,
    nameEn: row.nameEn || '',
    subtitle: row.subtitle || '',
    subtitleEn: row.subtitleEn || '',
    description: row.description || '',
    descriptionEn: row.descriptionEn || '',
    story: row.story || '',
    storyEn: row.storyEn || '',
    price: row.price,
    originalPrice: row.originalPrice || undefined,
    costPrice: row.costPrice || undefined,
    stock: row.stock || 0,
    supplierId: row.supplierId || undefined,
    category: row.category || '',
    image: row.image || '',
    video: row.video || undefined,
    videoEnabled: !!row.videoEnabled,
    craft: row.craft || '',
    craftEn: row.craftEn || '',
    material: row.material || '',
    origin: row.origin || '',
    rating: row.rating || 0,
    reviewCount: row.reviewCount || 0,
    featured: !!row.featured,
    active: row.active !== 0,
    // 旧数据没有这一列时 row.listingVisible 为 undefined → 视为展示（true）
    listingVisible: row.listingVisible === undefined || row.listingVisible === null
      ? true
      : row.listingVisible !== 0,
    tags: [],
    tagsEn: [],
    detailImages: [],
    giftProductIds: [],
    giftQuantity: 1,
  }
}

/**
 * 閹?product_gifts 鐞涖劑鍣烽惃鍕閸濅胶绮︾€规俺浠涢崥鍫濆煂閸熷棗鎼ф稉濞库偓?
 *
 * 鐠佹崘顓哥拠瀛樻閿涙俺绂掗崫浣稿彠缁鐡ㄩ崷銊у缁斿娈?product_gifts 鐞涱煉绱欐稉鈧悰灞肩娑擃亜褰茬挧鐘叉櫌閸濅緤绱氶敍?
 * 閸掓銆冮幒銉ュ經娑撯偓濞嗏剝鈧勫Ω閸忋劑鍎寸紒鎴濈暰鐠囪鍤弶銉ュ晙閸掑棗褰傞敍鍫ヤ缉閸?N+1 閺屻儴顕楅敍澶堚偓?
 * 閸撳秴褰撮崣顏堟付鐠?product.giftProductIds 鐏忚精鍏橀崘鍐茬暰鐟曚椒绗夌憰浣硅閺屾捁绂掗崫浣稿隘閵?
 */
export function attachGiftsToProducts(db: any, products: Product[]): Product[] {
  if (!products.length) return products
  try {
    const rows = db.prepare(
      'SELECT productId, giftProductId, quantity, sortOrder FROM product_gifts ORDER BY productId, sortOrder'
    ).all() as any[]
    if (!rows.length) return products
    const map = new Map<string, { ids: string[]; qty: number }>()
    for (const r of rows) {
      const cur = map.get(r.productId) || { ids: [], qty: 1 }
      cur.ids.push(r.giftProductId)
      cur.qty = Math.max(1, Number(r.quantity) || 1)
      map.set(r.productId, cur)
    }
    for (const p of products) {
      const g = map.get(p.id)
      if (g) {
        p.giftProductIds = g.ids
        p.giftQuantity = g.qty
      }
    }
  } catch {
    // 鐞涖劏绻曞▽鈥崇紦閿涘牊妫惔鎾活浕濞嗏€虫儙閸旑煉绱氶垾鏂衡偓?闂堟瑩绮捄瀹犵箖閿涘奔绗夎ぐ鍗炴惙閸熷棗鎼х拠璇插絿
  }
  return products
}

/**
 * 鎶?product_bundles 琛ㄩ噷鐨勬惌閰嶅叧绯昏仛鍚堝埌鍟嗗搧涓娿€?
 *
 * 涓庤禒鍝佺殑鍖哄埆锛?
 *   璧犲搧鏄€屽厤璐归€併€嶏紝鎼厤鏄€屼竴璧蜂拱鑳界渷閽便€嶁€斺€?鎼厤鍟嗗搧浠嶇劧璁′环锛?
 *   鍙槸缁勫悎璧锋潵鏈変竴涓?discount銆傛墍浠ヨ繖閲岃鎶婅鎼厤鍟嗗搧鐨勫畬鏁翠俊鎭?
 *   锛堝悕绉?鍥剧墖/浠锋牸锛変竴骞跺甫鍑烘潵锛屽墠鍙版墠鑳界畻鍑?鍗曞搧浠?/ 浼樻儬 / 鎬讳环銆?
 *
 * 涓€娆℃煡瀹屽叏閮ㄥ垎鍙戯紝閬垮厤 N+1銆?
 */
export function attachBundlesToProducts(db: any, products: Product[]): Product[] {
  if (!products.length) return products
  try {
    const rows = db.prepare(
      'SELECT * FROM product_bundles ORDER BY productId, sortOrder'
    ).all() as any[]
    if (!rows.length) return products
    const byId = new Map<string, Product>()
    for (const p of products) byId.set(p.id, p)
    /**
     * 被搭配的商品不一定在本次查询的 products 里。
     * 例如商品详情页只查了当前这一件（attachBundlesToProducts(db, [product])），
     * 若只从 byId 取，搭配商品会取不到 -> product 为 null ->
     * 前台名称会回退成商品 id（实测现象：购物车里显示 "ink-painting-scroll"）。
     * 所以缺的从库里补查，并缓存避免重复查。
     */
    const fetchBundleProduct = (id: string): Product | null => {
      if (byId.has(id)) return byId.get(id)!
      try {
        const row = db.prepare('SELECT * FROM products WHERE id = ?').get(id) as any
        if (!row) return null
        const p = rowToProduct(row)
        loadProductRelations(p)
        byId.set(id, p)
        return p
      } catch {
        return null
      }
    }
    const map = new Map<string, any[]>()
    for (const r of rows) {
      if (!map.has(r.productId)) map.set(r.productId, [])
      map.get(r.productId)!.push({
        bundleProductId: r.bundleProductId,
        title: r.title || '',
        description: r.description || '',
        image: r.image || undefined,
        price: r.price === null || r.price === undefined ? undefined : Number(r.price),
        discount: Number(r.discount) || 0,
        sortOrder: Number(r.sortOrder) || 0,
      })
    }
    for (const p of products) {
      const b = map.get(p.id)
      if (b && b.length) {
        // 灏介噺鎶婅鎼厤鍟嗗搧鐨勫畬鏁翠俊鎭寕涓婏紙鍚屼竴鎵瑰晢鍝侀噷鎵句笉鍒板氨鐣欑┖锛?
        // 鍓嶅彴浼氶€€鍥炵敤璇ュ晢鍝佺殑榛樿淇℃伅鍘绘煡锛?
        ;(p as any).bundles = b.map(x => ({ ...x, product: fetchBundleProduct(x.bundleProductId) }))
      }
    }
  } catch {
    // 琛ㄨ繕娌″缓灏辫烦杩?
  }
  return products
}

function rowToVariant(row: any): any {
  return {
    id: row.id,
    productId: row.productId,
    optionName: row.optionName || '',
    label: row.label,
    valueCode: row.valueCode || '',
    price: row.price === null || row.price === undefined ? undefined : Number(row.price),
    image: row.image || undefined,
    stock: row.stock === null || row.stock === undefined ? undefined : Number(row.stock),
    sortOrder: Number(row.sortOrder) || 0,
    active: row.active !== 0,
  }
}

/**
 * 閹?product_variants 鐞涖劑鍣烽惃鍕潐閺嶈壈浠涢崥鍫熷灇 product.variants閵?
 * 閸氬本鐗辨稉鈧▎鈩冪叀鐎瑰苯鍙忛柈銊ュ瀻閸欐埊绱濋柆鍨帳 N+1閵?
 * 閸欘亜鐢稉?active 閻ㄥ嫯顫夐弽纭风幢optionName 閸欐牜顑囨稉鈧稉顏囶潐閺嶈偐娈戠紒鏉戝閸氬秵鏂侀崚?product 娑撳绱?
 * 閺傞€涚┒閸撳秴褰撮惄瀛樺复閺勫墽銇氶柅澶嬪閸ｃ劍鐖ｆ０妯糕偓?
 */
export function attachVariantsToProducts(db: any, products: Product[]): Product[] {
  if (!products.length) return products
  try {
    const rows = db.prepare(
      'SELECT * FROM product_variants WHERE active = 1 ORDER BY productId, sortOrder'
    ).all() as any[]
    if (!rows.length) return products
    const map = new Map<string, any[]>()
    for (const r of rows) {
      if (!map.has(r.productId)) map.set(r.productId, [])
      map.get(r.productId)!.push(rowToVariant(r))
    }
    for (const p of products) {
      const v = map.get(p.id)
      if (v && v.length) {
        ;(p as any).variants = v
        ;(p as any).optionName = v[0].optionName || 'Style'
      }
    }
  } catch {
    // 鐞涖劏绻曞▽鈥崇紦鐏忚精鐑︽潻?
  }
  return products
}

function rowToSupplier(row: any): Supplier {
  return {
    id: row.id,
    name: row.name,
    contact: row.contact || undefined,
    phone: row.phone || undefined,
    email: row.email || undefined,
    address: row.address || undefined,
    region: row.region || undefined,
    status: row.status || 'active',
    notes: row.notes || undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

function loadProductRelations(product: Product) {
  const db = getDb()
  // supplier
  if (product.supplierId) {
    const supplierRow = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(product.supplierId) as any
    if (supplierRow) {
      product.supplier = rowToSupplier(supplierRow)
    }
  }
  // tags
  const tagRows = db.prepare('SELECT tag, lang FROM product_tags WHERE productId = ? ORDER BY sortOrder').all(product.id) as any[]
  product.tags = tagRows.filter(r => r.lang === 'zh').map(r => r.tag)
  product.tagsEn = tagRows.filter(r => r.lang === 'en').map(r => r.tag)
  // detailImages
  const imgRows = db.prepare('SELECT imageUrl FROM product_images WHERE productId = ? ORDER BY sortOrder').all(product.id) as any[]
  product.detailImages = imgRows.map(r => r.imageUrl)
}

function rowToCategory(row: any, productCount = 0): Category {
  return {
    slug: row.slug,
    name: row.name,
    nameEn: row.nameEn || '',
    description: row.description || '',
    descriptionEn: row.descriptionEn || '',
    icon: row.icon || '棣冩憹',
    productCount,
    image: row.image || '',
  }
}

function loadOrderStatusHistory(orderId: string) {
  const db = getDb()
  const rows = db.prepare('SELECT status, note, timestamp FROM order_status_history WHERE orderId = ? ORDER BY timestamp ASC').all(orderId) as any[]
  return rows.map(r => ({
    status: r.status as OrderStatus,
    timestamp: r.timestamp,
    note: r.note || undefined,
  }))
}

function rowToOrder(row: any, items: OrderItem[]): Order {
  const statusHistory = loadOrderStatusHistory(row.id)
  return {
    id: row.id,
    items,
    shipping: {
      firstName: row.shippingName?.split(' ')[0] || '',
      lastName: row.shippingName?.split(' ').slice(1).join(' ') || '',
      email: row.customerEmail || '',
      phone: row.customerPhone || '',
      address: row.shippingAddress || '',
      city: row.shippingCity || '',
      state: row.shippingState || '',
      zipCode: row.shippingZip || '',
      country: row.shippingCountry || 'United States',
    },
    subtotal: row.subtotal || 0,
    discount: row.discount || 0,
    couponCode: row.couponCode || undefined,
    shippingCost: row.shipping || 0,
    total: row.totalAmount || 0,
    currency: row.currency || 'USD',
    status: row.status as OrderStatus || 'pending',
    createdAt: row.createdAt,
    notes: row.notes || undefined,
    paymentMethod: row.paymentMethod || undefined,
    // ⚠️ orderNo 必须映射：数据库里有这个字段，但之前漏了映射。
    //    后果是所有服务端代码拿到的 o.orderNo 都是 undefined ——
    //    实测踩过：催付邮件写成了 "Order reference: undefined"。
    orderNo: row.orderNo,
    // 待付款催付记录（后台「待付款」专区的冷却期判断用）
    lastReminderAt: row.lastReminderAt || undefined,
    reminderCount: row.reminderCount || 0,
    customerEmail: row.customerEmail,
    customerName: row.customerName,
    userEmail: row.userEmail,
    referralCode: row.referralCode || undefined,
    referralId: row.referralId || undefined,
    referralVisitorId: row.referralVisitorId || undefined,
    referredByStaffId: row.referredByStaffId || undefined,
    referredByStaffName: row.referredByStaffName || undefined,
    attributionClickId: row.attributionClickId || undefined,
    attributionModel: row.attributionModel || undefined,
    attributionTouchpoints: row.attributionTouchpoints || undefined,
    attributionLookbackDays: row.attributionLookbackDays || undefined,
    attributionMatchedBy: row.attributionMatchedBy || undefined,
    attributionFallbackUsed: Boolean(row.attributionFallbackUsed),
    assignedTo: row.assignedTo,
    assignedToName: row.assignedToName,
    assignedToAvatar: row.assignedToAvatar,
    estimatedDeliveryDays: row.estimatedDeliveryDays || undefined,
    tracking: row.trackingNumber ? {
      carrier: row.carrier || '',
      trackingNumber: row.trackingNumber,
      estimatedDelivery: row.estimatedDelivery || '',
      url: row.trackingUrl || '',
    } as TrackingInfo : undefined,
    statusHistory: statusHistory.length > 0 ? statusHistory : undefined,
    // 娣囶喖顦?C3: 鐠囪娲栭弨顖欑帛娴溿倖妲?闁偓閹广垼鎻?閺€顖欑帛閻樿埖鈧?(閸樼喎鍘?SQLite 閸氬海顏棃娆撶帛娑撱垹銇?
    paymentStatus: row.paymentStatus || undefined,
    paypalTransaction: row.paypalTransaction ? safeJsonParse(row.paypalTransaction) : undefined,
    payoneerTransaction: row.payoneerTransaction ? safeJsonParse(row.payoneerTransaction) : undefined,
    returnInfo: row.returnInfo ? safeJsonParse(row.returnInfo) : undefined,
  }
}

function safeJsonParse(raw: string): any {
  try {
    return JSON.parse(raw)
  } catch {
    return undefined
  }
}

function rowToUser(row: any, addresses: UserAddress[], wishlist: string[]): User {
  let coupons: User['coupons'] = undefined
  if (row.coupons) {
    try { coupons = JSON.parse(row.coupons) } catch {}
  }
  return {
    id: row.id,
    email: row.email,
    passwordHash: row.passwordHash,
    salt: row.salt,
    firstName: row.firstName || '',
    lastName: row.lastName || '',
    phone: row.phone || '',
    avatar: row.avatar || undefined,
    dob: row.dob || undefined,
    gender: row.gender || undefined,
    bio: row.bio || undefined,
    preferredCurrency: row.preferredCurrency || 'USD',
    coupons,
    wishlist,
    addresses,
    token: row.token || undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt || row.createdAt,
  }
}

function rowToReview(row: any): Review {
  return {
    id: row.id,
    productId: row.productId,
    author: row.author || 'Anonymous',
    avatar: row.avatar || (row.author || 'A')[0].toUpperCase(),
    rating: row.rating,
    date: row.date || new Date(row.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    content: row.content || '',
    location: row.location || 'Verified Buyer',
    approved: !!row.approved,
    orderId: row.orderId || undefined,
    customerEmail: row.customerEmail || undefined,
    source: row.source || 'customer',
    hidden: !!row.hidden,
    deleted: !!row.deleted,
    createdAt: row.createdAt,
  }
}

// ========== Products Repository ==========

export const productRepo = {
  list(): Product[] {
    const db = getDb()
    const rows = db.prepare('SELECT * FROM products ORDER BY sortOrder DESC, createdAt DESC').all() as any[]
    const products = rows.map(rowToProduct)
    products.forEach(loadProductRelations)
    return attachBundlesToProducts(db, attachVariantsToProducts(db, attachGiftsToProducts(db, products)))
  },

  /**
   * 商店列表用的查询。
   *
   * 两个条件都必需：
   *   active = 1          → 可售
   *   listingVisible != 0 → 在列表里露出
   * 只在主商品编辑页里当赠品/搭配用的商品会设 listingVisible = 0，
   * 所以不会出现在商店里，但依然可售、能参与赠品与搭配。
   */
  listActive(): Product[] {
    const db = getDb()
    const rows = db.prepare(
      "SELECT * FROM products WHERE active = 1 AND (listingVisible IS NULL OR listingVisible != 0) ORDER BY sortOrder DESC, createdAt DESC"
    ).all() as any[]
    const products = rows.map(rowToProduct)
    products.forEach(loadProductRelations)
    return attachBundlesToProducts(db, attachVariantsToProducts(db, attachGiftsToProducts(db, products)))
  },

  getById(id: string): Product | undefined {
    const db = getDb()
    const row = db.prepare('SELECT * FROM products WHERE id = ?').get(id) as any
    if (!row) return undefined
    const product = rowToProduct(row)
    loadProductRelations(product)
    attachBundlesToProducts(db, attachVariantsToProducts(db, attachGiftsToProducts(db, [product])))
    return product
  },

  getByCategory(slug: string): Product[] {
    const db = getDb()
    const rows = db.prepare("SELECT * FROM products WHERE category = ? AND active = 1 AND (listingVisible IS NULL OR listingVisible != 0) ORDER BY sortOrder DESC, createdAt DESC").all(slug) as any[]
    const products = rows.map(rowToProduct)
    products.forEach(loadProductRelations)
    return attachBundlesToProducts(db, attachVariantsToProducts(db, attachGiftsToProducts(db, products)))
  },

  /** 鐠囪褰囬弻鎰櫌閸濅胶绮︾€规氨娈戠挧鐘叉惂閿涘牆鐣弫鏉戞櫌閸濅礁顕挒鈽呯礉娓氭稑澧犻崣鐗堣閺屾捁绂掗崫浣稿隘閿?*/
  listGifts(productId: string): Product[] {
    const db = getDb()
    try {
      const rows = db.prepare(
        'SELECT p.* FROM product_gifts g JOIN products p ON p.id = g.giftProductId WHERE g.productId = ? ORDER BY g.sortOrder'
      ).all(productId) as any[]
      const gifts = rows.map(rowToProduct)
      gifts.forEach(loadProductRelations)
      return gifts
    } catch {
      return []
    }
  },

  /**
   * 鐟曞棛娲婂蹇氼啎缂冾喛绂掗崫浣虹拨鐎规哎鈧?
   * giftQuantity 鐎涙ê婀В蹇庣鐞涘奔绗傞敍鍫滅娴犳垝瀵岄崯鍡楁惂闁礁鍤戞禒璁圭礆閿涘苯褰囩粭顑跨娑擃亙瀵岄崯鍡楁惂閻ㄥ嫯顔曠純顔煎晸閸忋儱鍙忛柈銊攽閵?
   */
  setGifts(productId: string, giftProductIds: string[], giftQuantity = 1): void {
    const db = getDb()
    const tx = db.transaction(() => {
      db.prepare('DELETE FROM product_gifts WHERE productId = ?').run(productId)
      const ins = db.prepare(
        'INSERT OR REPLACE INTO product_gifts (productId, giftProductId, quantity, sortOrder) VALUES (?, ?, ?, ?)'
      )
      const qty = Math.max(1, Number(giftQuantity) || 1)
      const seen = new Set<string>()
      let i = 0
      for (const gid of giftProductIds) {
        // 娑撳秶绮伴懛顏勭箒闁浇鍤滃鎲嬬礉娑旂喍绗夐柌宥咁槻缂佹垵鐣?
        if (!gid || gid === productId || seen.has(gid)) continue
        seen.add(gid)
        ins.run(productId, gid, qty, i++)
      }
    })
    tx()
  },

  /** 閹碘偓閺堝鏅㈤崫浣烘畱鐠х姴鎼х紒鎴濈暰閿涘牆鎮楅崣鏉垮灙鐞涖劎鏁ら敍灞肩濞嗏剝鐓＄€瑰矂浼╅崗?N+1閿?*/
  allGiftBindings(): Record<string, string[]> {
    const db = getDb()
    try {
      const rows = db.prepare('SELECT productId, giftProductId FROM product_gifts ORDER BY productId, sortOrder').all() as any[]
      const out: Record<string, string[]> = {}
      for (const r of rows) {
        if (!out[r.productId]) out[r.productId] = []
        out[r.productId].push(r.giftProductId)
      }
      return out
    } catch {
      return {}
    }
  },

  // ===== 鍟嗗搧瑙勬牸 / 娆惧紡锛坧roduct_variants锛?=====

  /** 璇诲彇鏌愬晢鍝佺殑鍏ㄩ儴瑙勬牸锛堝惈鏈惎鐢ㄧ殑锛屽悗鍙扮紪杈戠敤锛?*/
  listVariants(productId: string): any[] {
    const db = getDb()
    try {
      const rows = db.prepare(
        'SELECT * FROM product_variants WHERE productId = ? ORDER BY sortOrder, rowid'
      ).all(productId) as any[]
      return rows.map(rowToVariant)
    } catch {
      return []
    }
  },

  /**
   * 瑕嗙洊寮忎繚瀛樻煇鍟嗗搧鐨勮鏍煎垪琛ㄣ€?
   *
   * 涓轰粈涔堢敤銆屽厛鍒犲悗鎻掋€嶈€屼笉鏄€愭潯 diff锛?
   *   瑙勬牸鏄暣浣撻厤缃紙椤哄簭銆佸鍑忛兘鍦ㄤ竴璧锋敼锛夛紝diff 閫昏緫澶嶆潅涓斿鏄撴畫鐣欒剰鏁版嵁锛?
   *   瑙勬牸鏉℃暟寰堝皯锛堥€氬父 < 20锛夛紝鏁磋〃閲嶅啓鐨勪唬浠峰彲浠ュ拷鐣ャ€?
   * 椤哄甫鍋氬熀鏈竻娲楋細鍘绘帀绌?label銆佸幓鎺夐噸澶?label銆佹寜浼犲叆椤哄簭鍐?sortOrder銆?
   */
  setVariants(productId: string, variants: any[]): void {
    const db = getDb()
    const tx = db.transaction(() => {
      db.prepare('DELETE FROM product_variants WHERE productId = ?').run(productId)
      const ins = db.prepare(`
        INSERT INTO product_variants
          (id, productId, optionName, label, valueCode, price, image, stock, sortOrder, active)
        VALUES (@id, @productId, @optionName, @label, @valueCode, @price, @image, @stock, @sortOrder, @active)
      `)
      const seen = new Set<string>()
      let i = 0
      for (const v of variants || []) {
        const label = String(v?.label || '').trim()
        if (!label || seen.has(label)) continue
        seen.add(label)
        const numOrNull = (x: any) =>
          x === '' || x === null || x === undefined || Number.isNaN(Number(x)) ? null : Number(x)
        ins.run({
          id: String(v?.id || `${productId}-var-${Date.now().toString(36)}-${i}`),
          productId,
          optionName: String(v?.optionName || '').trim(),
          label,
          valueCode: String(v?.valueCode || '').trim(),
          price: numOrNull(v?.price),
          image: v?.image ? String(v.image) : null,
          stock: numOrNull(v?.stock),
          sortOrder: i,
          active: v?.active === false ? 0 : 1,
        })
        i++
      }
    })
    tx()
  },

  /** 鎵€鏈夊晢鍝佺殑瑙勬牸锛堝悗鍙板垪琛ㄧ敤锛屼竴娆℃煡瀹岄伩鍏?N+1锛?*/
  allVariants(): Record<string, any[]> {
    const db = getDb()
    try {
      const rows = db.prepare('SELECT * FROM product_variants ORDER BY productId, sortOrder').all() as any[]
      const out: Record<string, any[]> = {}
      for (const r of rows) {
        if (!out[r.productId]) out[r.productId] = []
        out[r.productId].push(rowToVariant(r))
      }
      return out
    } catch {
      return {}
    }
  },

  // ===== 配套商品 / 搭配购买（product_bundles） =====

  /** 读取某商品的搭配列表（带被搭配商品的完整信息，前台展示用） */
  listBundles(productId: string): any[] {
    const db = getDb()
    try {
      const rows = db.prepare(
        'SELECT * FROM product_bundles WHERE productId = ? ORDER BY sortOrder'
      ).all(productId) as any[]
      return rows.map(r => {
        const bp = db.prepare('SELECT * FROM products WHERE id = ?').get(r.bundleProductId) as any
        return {
          bundleProductId: r.bundleProductId,
          title: r.title || '',
          description: r.description || '',
          image: r.image || undefined,
          price: r.price === null || r.price === undefined ? undefined : Number(r.price),
          discount: Number(r.discount) || 0,
          sortOrder: Number(r.sortOrder) || 0,
          product: bp ? rowToProduct(bp) : null,
        }
      })
    } catch {
      return []
    }
  },

  /**
   * 覆盖式保存某商品的搭配列表。
   * 与赠品一样用「先删后插」：搭配是整体配置、条数少，整表重写更简单可靠。
   * 清洗：不给自己搭配、去重、discount 不能为负。
   */
  setBundles(productId: string, bundles: any[]): void {
    const db = getDb()
    const tx = db.transaction(() => {
      db.prepare('DELETE FROM product_bundles WHERE productId = ?').run(productId)
      const ins = db.prepare(`
        INSERT INTO product_bundles
          (productId, bundleProductId, title, description, image, price, discount, sortOrder)
        VALUES (@productId, @bundleProductId, @title, @description, @image, @price, @discount, @sortOrder)
      `)
      const seen = new Set<string>()
      let i = 0
      for (const b of bundles || []) {
        const bid = String(b?.bundleProductId || '').trim()
        if (!bid || bid === productId || seen.has(bid)) continue
        seen.add(bid)
        const numOrNull = (x: any) =>
          x === '' || x === null || x === undefined || Number.isNaN(Number(x)) ? null : Number(x)
        ins.run({
          productId,
          bundleProductId: bid,
          title: String(b?.title || '').trim(),
          description: String(b?.description || '').trim(),
          image: b?.image ? String(b.image) : null,
          price: numOrNull(b?.price),
          discount: Math.max(0, Number(b?.discount) || 0),
          sortOrder: i,
        })
        i++
      }
    })
    tx()
  },

  /** 所有商品的搭配（后台列表用，一次查完避免 N+1） */
  allBundles(): Record<string, any[]> {
    const db = getDb()
    try {
      const rows = db.prepare('SELECT * FROM product_bundles ORDER BY productId, sortOrder').all() as any[]
      const out: Record<string, any[]> = {}
      for (const r of rows) {
        if (!out[r.productId]) out[r.productId] = []
        out[r.productId].push({
          bundleProductId: r.bundleProductId,
          title: r.title || '',
          description: r.description || '',
          image: r.image || undefined,
          price: r.price === null || r.price === undefined ? undefined : Number(r.price),
          discount: Number(r.discount) || 0,
        })
      }
      return out
    } catch {
      return {}
    }
  },

  add(product: Product): Product {
    const db = getDb()
    const stmt = db.prepare(`
      INSERT INTO products (id, code, name, nameEn, subtitle, subtitleEn, description, descriptionEn, story, storyEn,
        price, originalPrice, costPrice, stock, supplierId, category, image, video, videoEnabled, craft, craftEn, material, origin, rating, reviewCount, featured, active, listingVisible, sortOrder)
      VALUES (@id, @code, @name, @nameEn, @subtitle, @subtitleEn, @description, @descriptionEn, @story, @storyEn,
        @price, @originalPrice, @costPrice, @stock, @supplierId, @category, @image, @video, @videoEnabled, @craft, @craftEn, @material, @origin, @rating, @reviewCount, @featured, @active, @listingVisible, @sortOrder)
    `)
    stmt.run({
      id: product.id,
      code: product.code || null,
      name: product.name,
      nameEn: product.nameEn || '',
      subtitle: product.subtitle || '',
      subtitleEn: product.subtitleEn || '',
      description: product.description || '',
      descriptionEn: product.descriptionEn || '',
      story: product.story || '',
      storyEn: product.storyEn || '',
      price: product.price,
      originalPrice: product.originalPrice || null,
      costPrice: product.costPrice || null,
      stock: product.stock || 0,
      supplierId: product.supplierId || null,
      category: product.category || '',
      image: product.image || '',
      video: product.video || null,
      videoEnabled: product.videoEnabled ? 1 : 0,
      craft: product.craft || '',
      craftEn: product.craftEn || '',
      material: product.material || '',
      origin: product.origin || '',
      rating: product.rating || 0,
      reviewCount: product.reviewCount || 0,
      featured: product.featured ? 1 : 0,
      active: product.active !== false ? 1 : 0,
      listingVisible: (product as any).listingVisible === false ? 0 : 1,
      sortOrder: 0,
    })
    if (product.tags?.length) {
      const tagStmt = db.prepare('INSERT OR REPLACE INTO product_tags (productId, tag, lang, sortOrder) VALUES (?, ?, \'zh\', ?)')
      product.tags.forEach((tag, i) => tagStmt.run(product.id, tag, i))
    }
    if (product.tagsEn?.length) {
      const tagStmt = db.prepare('INSERT OR REPLACE INTO product_tags (productId, tag, lang, sortOrder) VALUES (?, ?, \'en\', ?)')
      product.tagsEn.forEach((tag, i) => tagStmt.run(product.id, tag, i))
    }
    if (product.detailImages?.length) {
      const imgStmt = db.prepare('INSERT OR REPLACE INTO product_images (productId, imageUrl, sortOrder) VALUES (?, ?, ?)')
      product.detailImages.forEach((img, i) => imgStmt.run(product.id, img, i))
    }
    return product
  },

  update(id: string, updates: Partial<Product>): Product | null {
    const db = getDb()
    const existing = productRepo.getById(id)
    if (!existing) return null
    const merged = { ...existing, ...updates }
    const stmt = db.prepare(`
      UPDATE products SET
        code = @code,
        name = @name, nameEn = @nameEn, subtitle = @subtitle, subtitleEn = @subtitleEn,
        description = @description, descriptionEn = @descriptionEn, story = @story, storyEn = @storyEn,
        price = @price, originalPrice = @originalPrice, costPrice = @costPrice, stock = @stock, supplierId = @supplierId,
        category = @category, image = @image,
        video = @video, videoEnabled = @videoEnabled,
        craft = @craft, craftEn = @craftEn, material = @material, origin = @origin,
        rating = @rating, reviewCount = @reviewCount, featured = @featured, active = @active,
        listingVisible = @listingVisible,
        updatedAt = datetime('now')
      WHERE id = @id
    `)
    stmt.run({
      id,
      code: merged.code || null,
      name: merged.name,
      nameEn: merged.nameEn || '',
      subtitle: merged.subtitle || '',
      subtitleEn: merged.subtitleEn || '',
      description: merged.description || '',
      descriptionEn: merged.descriptionEn || '',
      story: merged.story || '',
      storyEn: merged.storyEn || '',
      price: merged.price,
      originalPrice: merged.originalPrice || null,
      costPrice: merged.costPrice || null,
      stock: merged.stock || 0,
      supplierId: merged.supplierId || null,
      category: merged.category || '',
      image: merged.image || '',
      video: merged.video || null,
      videoEnabled: merged.videoEnabled ? 1 : 0,
      craft: merged.craft || '',
      craftEn: merged.craftEn || '',
      material: merged.material || '',
      origin: merged.origin || '',
      rating: merged.rating || 0,
      reviewCount: merged.reviewCount || 0,
      featured: merged.featured ? 1 : 0,
      active: merged.active !== false ? 1 : 0,
      listingVisible: (merged as any).listingVisible === false ? 0 : 1,
    })
    // 閺囧瓨鏌?tags 閸?detailImages
    if (updates.tags) {
      db.prepare('DELETE FROM product_tags WHERE productId = ? AND lang = \'zh\'').run(id)
      const tagStmt = db.prepare('INSERT INTO product_tags (productId, tag, lang, sortOrder) VALUES (?, ?, \'zh\', ?)')
      updates.tags.forEach((tag, i) => tagStmt.run(id, tag, i))
    }
    if (updates.tagsEn) {
      db.prepare('DELETE FROM product_tags WHERE productId = ? AND lang = \'en\'').run(id)
      const tagStmt = db.prepare('INSERT INTO product_tags (productId, tag, lang, sortOrder) VALUES (?, ?, \'en\', ?)')
      updates.tagsEn.forEach((tag, i) => tagStmt.run(id, tag, i))
    }
    if (updates.detailImages) {
      db.prepare('DELETE FROM product_images WHERE productId = ?').run(id)
      const imgStmt = db.prepare('INSERT INTO product_images (productId, imageUrl, sortOrder) VALUES (?, ?, ?)')
      updates.detailImages.forEach((img, i) => imgStmt.run(id, img, i))
    }
    return productRepo.getById(id) || null
  },

  delete(id: string): boolean {
    const db = getDb()
    const result = db.prepare('DELETE FROM products WHERE id = ?').run(id)
    return result.changes > 0
  },
}

// ========== Suppliers Repository ==========

export const supplierRepo = {
  list(): Supplier[] {
    const db = getDb()
    const rows = db.prepare('SELECT * FROM suppliers ORDER BY name').all() as any[]
    return rows.map(rowToSupplier)
  },

  getById(id: string): Supplier | undefined {
    const db = getDb()
    const row = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(id) as any
    if (!row) return undefined
    return rowToSupplier(row)
  },

  add(data: Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Supplier {
    const db = getDb()
    const id = data.id || 'SUP-' + Date.now().toString(36).toUpperCase()
    const now = new Date().toISOString()
    const supplier: Supplier = {
      id,
      name: data.name,
      contact: data.contact,
      phone: data.phone,
      email: data.email,
      address: data.address,
      region: data.region,
      status: data.status || 'active',
      notes: data.notes,
      createdAt: now,
      updatedAt: now,
    }
    db.prepare(`
      INSERT INTO suppliers (id, name, contact, phone, email, address, region, status, notes, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, supplier.name, supplier.contact || '', supplier.phone || '', supplier.email || '', supplier.address || '', supplier.region || '', supplier.status, supplier.notes || '', now, now)
    return supplier
  },

  update(id: string, updates: Partial<Supplier>): Supplier | null {
    const db = getDb()
    const existing = supplierRepo.getById(id)
    if (!existing) return null
    const fields: string[] = []
    const values: any[] = []
    if (updates.name !== undefined) { fields.push('name = ?'); values.push(updates.name) }
    if (updates.contact !== undefined) { fields.push('contact = ?'); values.push(updates.contact) }
    if (updates.phone !== undefined) { fields.push('phone = ?'); values.push(updates.phone) }
    if (updates.email !== undefined) { fields.push('email = ?'); values.push(updates.email) }
    if (updates.address !== undefined) { fields.push('address = ?'); values.push(updates.address) }
    if (updates.region !== undefined) { fields.push('region = ?'); values.push(updates.region) }
    if (updates.status !== undefined) { fields.push('status = ?'); values.push(updates.status) }
    if (updates.notes !== undefined) { fields.push('notes = ?'); values.push(updates.notes) }
    fields.push('updatedAt = ?')
    values.push(new Date().toISOString())
    if (fields.length > 0) {
      values.push(id)
      db.prepare(`UPDATE suppliers SET ${fields.join(', ')} WHERE id = ?`).run(...values)
    }
    return supplierRepo.getById(id) || null
  },

  delete(id: string): boolean {
    const db = getDb()
    const result = db.prepare('DELETE FROM suppliers WHERE id = ?').run(id)
    return result.changes > 0
  },

  getProductCount(id: string): number {
    const db = getDb()
    const row = db.prepare('SELECT COUNT(*) as cnt FROM products WHERE supplierId = ?').get(id) as any
    return row?.cnt || 0
  },
}

// ========== Categories Repository ==========

export const categoryRepo = {
  list(): Category[] {
    const db = getDb()
    const rows = db.prepare('SELECT * FROM categories ORDER BY sortOrder, name').all() as any[]
    return rows.map(row => {
      const count = db.prepare('SELECT COUNT(*) as cnt FROM products WHERE category = ?').get(row.slug) as any
      return rowToCategory(row, count.cnt)
    })
  },

  getBySlug(slug: string): Category | undefined {
    const db = getDb()
    const row = db.prepare('SELECT * FROM categories WHERE slug = ?').get(slug) as any
    if (!row) return undefined
    const count = db.prepare('SELECT COUNT(*) as cnt FROM products WHERE category = ? AND active = 1').get(slug) as any
    return rowToCategory(row, count.cnt)
  },

  add(category: Category & { id?: string }): Category {
    const db = getDb()
    const id = category.id || 'CAT-' + category.slug
    db.prepare(`
      INSERT INTO categories (id, name, nameEn, slug, description, descriptionEn, image, icon, sortOrder, active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 1)
    `).run(id, category.name, category.nameEn || '', category.slug, category.description || '', category.descriptionEn || '', category.image || '', category.icon || '棣冩憹')
    return category
  },

  update(slug: string, updates: Partial<Category>): Category | null {
    const db = getDb()
    const existing = categoryRepo.getBySlug(slug)
    if (!existing) return null
    const merged = { ...existing, ...updates }
    db.prepare(`
      UPDATE categories SET name = ?, nameEn = ?, description = ?, descriptionEn = ?, image = ?, icon = ?, updatedAt = datetime('now')
      WHERE slug = ?
    `).run(merged.name, merged.nameEn || '', merged.description || '', merged.descriptionEn || '', merged.image || '', merged.icon || '棣冩憹', slug)
    return categoryRepo.getBySlug(slug) || null
  },

  delete(slug: string): boolean {
    const db = getDb()
    const result = db.prepare('DELETE FROM categories WHERE slug = ?').run(slug)
    return result.changes > 0
  },
}

// ========== Orders Repository ==========

export const orderRepo = {
  list(): Order[] {
    const db = getDb()
    const rows = db.prepare('SELECT * FROM orders ORDER BY createdAt DESC').all() as any[]
    return rows.map(row => {
      const itemRows = db.prepare('SELECT * FROM order_items WHERE orderId = ?').all(row.id) as any[]
      const items: OrderItem[] = itemRows.map(r => ({
        id: r.id,
        // 韫囧懘銆忛崶鐐诧綖 productId閿涙瓰eductStockForOrder 娓氭繆绂嗙€瑰啯澧告惔鎾崇摠閿?
        // 缂傝桨绨＄€?item.id閿涘牐顓归崡鏇€?ID閿涘绱扮悮顐㈢秼閹存劕鏅㈤崫?ID閿涘本鐓℃稉宥呭煂閸熷棗鎼ч懓宀勬饯姒涙鐑︽潻鍥ㄥ⒏閸戝繈鈧?
        productId: r.productId || undefined,
        name: r.name,
        nameEn: r.nameEn || '',
        image: r.image || '',
        price: r.price,
        quantity: r.quantity,
      }))
      return rowToOrder(row, items)
    })
  },

  getById(id: string): Order | undefined {
    const db = getDb()
    const row = db.prepare('SELECT * FROM orders WHERE id = ?').get(id) as any
    if (!row) return undefined
    const itemRows = db.prepare('SELECT * FROM order_items WHERE orderId = ?').all(id) as any[]
    const items: OrderItem[] = itemRows.map(r => ({
      id: r.id,
      // 閸?list()閿涙艾娲栨繅?productId閿涘苯鎯侀崚娆愬瘻鐠併垹宕熼崣鏍ф礀閻ㄥ嫯顓归崡鏇熷⒏娑撳秳绨℃惔鎾崇摠
      productId: r.productId || undefined,
      name: r.name,
      nameEn: r.nameEn || '',
      image: r.image || '',
      price: r.price,
      quantity: r.quantity,
    }))
    return rowToOrder(row, items)
  },

  add(order: Order): Order {
    const db = getDb()
    const tx = db.transaction(() => {
      db.prepare(`
        INSERT INTO orders (id, orderNo, status, totalAmount, currency, subtotal, discount, couponCode, shipping, customerName, customerEmail, customerPhone,
          shippingName, shippingAddress, shippingCity, shippingState, shippingZip, shippingCountry, paymentMethod, notes, createdAt,
          userEmail, assignedTo, assignedToName, estimatedDeliveryDays, referralCode, referralId, referralVisitorId,
          referredByStaffId, referredByStaffName, attributionClickId, attributionModel, attributionTouchpoints,
          attributionLookbackDays, attributionMatchedBy, attributionFallbackUsed,
          paymentStatus, paypalTransaction, payoneerTransaction, returnInfo)
        VALUES (@id, @orderNo, @status, @totalAmount, @currency, @subtotal, @discount, @couponCode, @shipping, @customerName, @customerEmail, @customerPhone,
          @shippingName, @shippingAddress, @shippingCity, @shippingState, @shippingZip, @shippingCountry, @paymentMethod, @notes, @createdAt,
          @userEmail, @assignedTo, @assignedToName, @estimatedDeliveryDays, @referralCode, @referralId, @referralVisitorId,
          @referredByStaffId, @referredByStaffName, @attributionClickId, @attributionModel, @attributionTouchpoints,
          @attributionLookbackDays, @attributionMatchedBy, @attributionFallbackUsed,
          @paymentStatus, @paypalTransaction, @payoneerTransaction, @returnInfo)
      `).run({
        id: order.id,
        orderNo: order.id,
        status: order.status,
        totalAmount: order.total,
        currency: order.currency || 'USD',
        subtotal: order.subtotal,
        discount: order.discount || 0,
        couponCode: order.couponCode || null,
        shipping: order.shippingCost,
        customerName: order.shipping?.firstName ? order.shipping.firstName + ' ' + (order.shipping.lastName || '') : order.customerName || '',
        customerEmail: order.shipping?.email || order.customerEmail || '',
        customerPhone: order.shipping?.phone || '',
        shippingName: order.shipping?.firstName ? order.shipping.firstName + ' ' + (order.shipping.lastName || '') : '',
        shippingAddress: order.shipping?.address || '',
        shippingCity: order.shipping?.city || '',
        shippingState: order.shipping?.state || '',
        shippingZip: order.shipping?.zipCode || '',
        shippingCountry: order.shipping?.country || 'United States',
        paymentMethod: order.paymentMethod || null,
        notes: order.notes || null,
        createdAt: order.createdAt,
        userEmail: order.userEmail || null,
        assignedTo: order.assignedTo || null,
        assignedToName: order.assignedToName || null,
        estimatedDeliveryDays: order.estimatedDeliveryDays || null,
        referralCode: order.referralCode || null,
        referralId: order.referralId || null,
        referralVisitorId: order.referralVisitorId || null,
        referredByStaffId: order.referredByStaffId || null,
        referredByStaffName: order.referredByStaffName || null,
        attributionClickId: order.attributionClickId || null,
        attributionModel: order.attributionModel || null,
        attributionTouchpoints: order.attributionTouchpoints || null,
        attributionLookbackDays: order.attributionLookbackDays || null,
        attributionMatchedBy: order.attributionMatchedBy || null,
        attributionFallbackUsed: order.attributionFallbackUsed ? 1 : 0,
        paymentStatus: order.paymentStatus || 'unpaid',
        paypalTransaction: order.paypalTransaction ? JSON.stringify(order.paypalTransaction) : null,
        payoneerTransaction: order.payoneerTransaction ? JSON.stringify(order.payoneerTransaction) : null,
        returnInfo: order.returnInfo ? JSON.stringify(order.returnInfo) : null,
      })
      const itemStmt = db.prepare(`
        INSERT INTO order_items (id, orderId, productId, name, nameEn, image, price, quantity, subtotal, category)
        VALUES (@id, @orderId, @productId, @name, @nameEn, @image, @price, @quantity, @subtotal, @category)
      `)
      order.items.forEach((item, idx) => {
        itemStmt.run({
          id: 'OI-' + order.id + '-' + idx + '-' + Math.random().toString(36).slice(2, 6),
          orderId: order.id,
          productId: (item as any).productId || null,
          name: item.name,
          nameEn: item.nameEn || '',
          image: item.image || '',
          price: item.price,
          quantity: item.quantity,
          subtotal: (item as any).subtotal || item.price * item.quantity,
          category: (item as any).category || '',
        })
      })
      const initialStatus = order.status || 'pending'
      const histId = 'OSH-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
      db.prepare(`
        INSERT INTO order_status_history (id, orderId, status, note, timestamp)
        VALUES (?, ?, ?, ?, ?)
      `).run(histId, order.id, initialStatus, 'Order placed', order.createdAt || new Date().toISOString())
    })
    tx()
    const saved = orderRepo.getById(order.id)
    return saved || order
  },

  update(id: string, updates: Partial<Order> & { statusNote?: string, paymentStatus?: string, paymentMethod?: string, shippingMethod?: string, couponCode?: string, discount?: number, tax?: number, billing?: any }): Order | null {
    const db = getDb()
    const existing = orderRepo.getById(id)
    if (!existing) return null

    const tx = db.transaction(() => {
      const fields: string[] = []
      const values: any[] = []

      if (updates.status !== undefined && updates.status !== existing.status) {
        fields.push('status = ?')
        values.push(updates.status)
        const histId = 'OSH-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
        db.prepare(`
          INSERT INTO order_status_history (id, orderId, status, note, timestamp)
          VALUES (?, ?, ?, ?, ?)
        `).run(histId, id, updates.status, updates.statusNote || null, new Date().toISOString())
      }
      if (updates.total !== undefined) { fields.push('totalAmount = ?'); values.push(updates.total) }
      if (updates.subtotal !== undefined) { fields.push('subtotal = ?'); values.push(updates.subtotal) }
      if (updates.shippingCost !== undefined) { fields.push('shipping = ?'); values.push(updates.shippingCost) }
      if (updates.currency !== undefined) { fields.push('currency = ?'); values.push(updates.currency) }
      if (updates.notes !== undefined) { fields.push('notes = ?'); values.push(updates.notes || null) }
      if (updates.tracking?.trackingNumber !== undefined) { fields.push('trackingNumber = ?'); values.push(updates.tracking.trackingNumber || null) }
      if (updates.tracking?.carrier !== undefined) { fields.push('carrier = ?'); values.push(updates.tracking.carrier || null) }
      if (updates.tracking?.estimatedDelivery !== undefined) { fields.push('estimatedDelivery = ?'); values.push(updates.tracking.estimatedDelivery || null) }
      if (updates.tracking?.url !== undefined) { fields.push('trackingUrl = ?'); values.push(updates.tracking.url || null) }
      if (updates.assignedTo !== undefined) { fields.push('assignedTo = ?'); values.push(updates.assignedTo || null) }
      if (updates.assignedToName !== undefined) { fields.push('assignedToName = ?'); values.push(updates.assignedToName || null) }
      if (updates.assignedToAvatar !== undefined) { fields.push('assignedToAvatar = ?'); values.push(updates.assignedToAvatar || null) }
      if (updates.userEmail !== undefined) { fields.push('userEmail = ?'); values.push(updates.userEmail || null) }
      if (updates.customerEmail !== undefined) { fields.push('customerEmail = ?'); values.push(updates.customerEmail || null) }
      if (updates.customerName !== undefined) { fields.push('customerName = ?'); values.push(updates.customerName || null) }
      if (updates.estimatedDeliveryDays !== undefined) { fields.push('estimatedDeliveryDays = ?'); values.push(updates.estimatedDeliveryDays || 0) }
      if (updates.referralCode !== undefined) { fields.push('referralCode = ?'); values.push(updates.referralCode || null) }
      if (updates.referralId !== undefined) { fields.push('referralId = ?'); values.push(updates.referralId || null) }
      if (updates.referralVisitorId !== undefined) { fields.push('referralVisitorId = ?'); values.push(updates.referralVisitorId || null) }
      if (updates.referredByStaffId !== undefined) { fields.push('referredByStaffId = ?'); values.push(updates.referredByStaffId || null) }
      if (updates.referredByStaffName !== undefined) { fields.push('referredByStaffName = ?'); values.push(updates.referredByStaffName || null) }
      if (updates.attributionClickId !== undefined) { fields.push('attributionClickId = ?'); values.push(updates.attributionClickId || null) }
      if (updates.attributionModel !== undefined) { fields.push('attributionModel = ?'); values.push(updates.attributionModel || null) }
      if (updates.attributionTouchpoints !== undefined) { fields.push('attributionTouchpoints = ?'); values.push(updates.attributionTouchpoints || null) }
      if (updates.attributionLookbackDays !== undefined) { fields.push('attributionLookbackDays = ?'); values.push(updates.attributionLookbackDays || null) }
      if (updates.attributionMatchedBy !== undefined) { fields.push('attributionMatchedBy = ?'); values.push(updates.attributionMatchedBy || null) }
      if (updates.attributionFallbackUsed !== undefined) { fields.push('attributionFallbackUsed = ?'); values.push(updates.attributionFallbackUsed ? 1 : 0) }
      if ((updates as any).paymentStatus !== undefined) { fields.push('paymentStatus = ?'); values.push((updates as any).paymentStatus || 'unpaid') }
      // 待付款催付记录（后台「待付款」专区发信后写入，用于 24 小时冷却）
      if ((updates as any).lastReminderAt !== undefined) { fields.push('lastReminderAt = ?'); values.push((updates as any).lastReminderAt || null) }
      if ((updates as any).reminderCount !== undefined) { fields.push('reminderCount = ?'); values.push(Number((updates as any).reminderCount) || 0) }
      // 娣囶喖顦?C3: 閺€顖欑帛娴溿倖妲?闁偓閹广垼鎻ｉ弫鐗堝祦閸欘垱娲块弬?(JSON 閸?
      if ((updates as any).paypalTransaction !== undefined) { fields.push('paypalTransaction = ?'); values.push((updates as any).paypalTransaction ? JSON.stringify((updates as any).paypalTransaction) : null) }
      if ((updates as any).payoneerTransaction !== undefined) { fields.push('payoneerTransaction = ?'); values.push((updates as any).payoneerTransaction ? JSON.stringify((updates as any).payoneerTransaction) : null) }
      if ((updates as any).returnInfo !== undefined) { fields.push('returnInfo = ?'); values.push((updates as any).returnInfo ? JSON.stringify((updates as any).returnInfo) : null) }
      if ((updates as any).paymentMethod !== undefined) { fields.push('paymentMethod = ?'); values.push((updates as any).paymentMethod || null) }
      if ((updates as any).shippingMethod !== undefined) { fields.push('shippingMethod = ?'); values.push((updates as any).shippingMethod || null) }
      if ((updates as any).couponCode !== undefined) { fields.push('couponCode = ?'); values.push((updates as any).couponCode || null) }
      if ((updates as any).discount !== undefined) { fields.push('discount = ?'); values.push((updates as any).discount || 0) }
      if ((updates as any).tax !== undefined) { fields.push('tax = ?'); values.push((updates as any).tax || 0) }
      if (updates.shipping) {
        const s = updates.shipping
        if (s.firstName !== undefined || s.lastName !== undefined) {
          const name = [s.firstName || '', s.lastName || ''].filter(Boolean).join(' ')
          fields.push('shippingName = ?'); values.push(name || null)
        }
        if (s.address !== undefined) { fields.push('shippingAddress = ?'); values.push(s.address || null) }
        if (s.city !== undefined) { fields.push('shippingCity = ?'); values.push(s.city || null) }
        if (s.state !== undefined) { fields.push('shippingState = ?'); values.push(s.state || null) }
        if (s.zipCode !== undefined) { fields.push('shippingZip = ?'); values.push(s.zipCode || null) }
        if (s.country !== undefined) { fields.push('shippingCountry = ?'); values.push(s.country || null) }
        if (s.phone !== undefined) { fields.push('customerPhone = ?'); values.push(s.phone || null) }
      }
      if ((updates as any).billing) {
        const b = (updates as any).billing
        if (b.firstName !== undefined || b.lastName !== undefined) {
          const name = [b.firstName || '', b.lastName || ''].filter(Boolean).join(' ')
          fields.push('billingName = ?'); values.push(name || null)
        }
        if (b.address !== undefined) { fields.push('billingAddress = ?'); values.push(b.address || null) }
        if (b.city !== undefined) { fields.push('billingCity = ?'); values.push(b.city || null) }
        if (b.state !== undefined) { fields.push('billingState = ?'); values.push(b.state || null) }
        if (b.zipCode !== undefined) { fields.push('billingZip = ?'); values.push(b.zipCode || null) }
        if (b.country !== undefined) { fields.push('billingCountry = ?'); values.push(b.country || null) }
      }
      if (updates.userId !== undefined) { fields.push('userId = ?'); values.push(updates.userId || null) }

      if (fields.length > 0) {
        fields.push("updatedAt = datetime('now')")
        values.push(id)
        db.prepare(`UPDATE orders SET ${fields.join(', ')} WHERE id = ?`).run(...values)
      }
    })
    tx()
    return orderRepo.getById(id) || null
  },

  updateStatus(id: string, status: OrderStatus, note?: string): Order | null {
    return orderRepo.update(id, { status, statusNote: note })
  },

  updateTracking(id: string, tracking: TrackingInfo): Order | null {
    return orderRepo.update(id, { tracking })
  },

  updateNotes(id: string, notes: string): Order | null {
    return orderRepo.update(id, { notes })
  },

  assignStaff(id: string, staffId: string, staffName: string, staffAvatar?: string): Order | null {
    return orderRepo.update(id, { assignedTo: staffId, assignedToName: staffName })
  },
}

// ========== Users Repository ==========

export const userRepo = {
  list(): User[] {
    const db = getDb()
    const rows = db.prepare('SELECT * FROM users ORDER BY createdAt DESC').all() as any[]
    return rows.map(row => {
      const addrRows = db.prepare('SELECT * FROM user_addresses WHERE userId = ? ORDER BY isDefault DESC, createdAt').all(row.id) as any[]
      const addresses: UserAddress[] = addrRows.map(r => ({
        id: r.id, label: r.label || '', firstName: r.firstName || '', lastName: r.lastName || '',
        phone: r.phone || '', address: r.address || '', city: r.city || '', state: r.state || '',
        zip: r.zip || '', country: r.country || 'United States', isDefault: !!r.isDefault,
      }))
      const wishRows = db.prepare('SELECT productId FROM wishlist WHERE userId = ? ORDER BY createdAt DESC').all(row.id) as any[]
      const wishlist = wishRows.map(r => r.productId)
      return rowToUser(row, addresses, wishlist)
    })
  },

  getById(id: string): User | undefined {
    const db = getDb()
    const row = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any
    if (!row) return undefined
    const addrRows = db.prepare('SELECT * FROM user_addresses WHERE userId = ? ORDER BY isDefault DESC, createdAt').all(id) as any[]
    const addresses: UserAddress[] = addrRows.map(r => ({
      id: r.id, label: r.label || '', firstName: r.firstName || '', lastName: r.lastName || '',
      phone: r.phone || '', address: r.address || '', city: r.city || '', state: r.state || '',
      zip: r.zip || '', country: r.country || 'United States', isDefault: !!r.isDefault,
    }))
    const wishRows = db.prepare('SELECT productId FROM wishlist WHERE userId = ? ORDER BY createdAt DESC').all(id) as any[]
    const wishlist = wishRows.map(r => r.productId)
    return rowToUser(row, addresses, wishlist)
  },

  getByEmail(email: string): User | undefined {
    const db = getDb()
    const row = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any
    if (!row) return undefined
    return userRepo.getById(row.id)
  },

  getByToken(token: string): User | undefined {
    const db = getDb()
    const row = db.prepare('SELECT * FROM users WHERE token = ?').get(token) as any
    if (!row) return undefined
    // 娣囶喖顦?H20: token 鏉╁洦婀￠弽锟犵崣 (閺冪姾绻冮張鐔告闂傚娈戦崢鍡楀蕉閻劍鍩涚憴鍡曡礋閺堝鏅? 閸忕厧顔愰弮褌绱扮拠?
    if (row.tokenExpiresAt && new Date(row.tokenExpiresAt).getTime() < Date.now()) return undefined
    return userRepo.getById(row.id)
  },

  add(user: User): User {
    const db = getDb()
    // 娣囶喖顦? 閸?INSERT 濠曞繑甯€娴?token / tokenExpiresAt 閳ユ柡鈧?濞夈劌鍞介幒銉ュ經閺勵垬鈧苯鍘涢崘娆忕氨閸愬秴褰?cookie閵?
    // 娴滃孩妲搁弬鐗堟暈閸愬瞼鏁ら幋閿嬬セ鐟欏牆娅掗柌宀冩閻掕埖瀣侀崚棰佺啊 cookie, 娴ｅ棗绨遍柌?token 娑?NULL,
    // /api/auth/user 閺屻儰绗夐崚棰佹眽 閳?閻╁瓨甯寸悮顐ユ丢閸ョ偟娅ヨぐ鏇€?(濞夈劌鍞介崡铏竴缁?閵?
    db.prepare(`
      INSERT INTO users (id, email, passwordHash, salt, firstName, lastName, phone, avatar, dob, gender, bio, preferredCurrency, coupons, role, token, tokenExpiresAt, createdAt, updatedAt)
      VALUES (@id, @email, @passwordHash, @salt, @firstName, @lastName, @phone, @avatar, @dob, @gender, @bio, @preferredCurrency, @coupons, @role, @token, @tokenExpiresAt, @createdAt, @updatedAt)
    `).run({
      id: user.id, email: user.email, passwordHash: user.passwordHash, salt: user.salt,
      firstName: user.firstName || '', lastName: user.lastName || '', phone: user.phone || '',
      avatar: user.avatar || null, dob: user.dob || null, gender: user.gender || null,
      bio: user.bio || null, preferredCurrency: user.preferredCurrency || 'USD',
      coupons: user.coupons && user.coupons.length ? JSON.stringify(user.coupons) : null,
      role: user.role || 'customer',
      token: user.token || null, tokenExpiresAt: user.tokenExpiresAt || null,
      createdAt: user.createdAt, updatedAt: user.updatedAt || user.createdAt,
    })
    // 娣囨繂鐡?addresses
    if (user.addresses?.length) {
      const addrStmt = db.prepare(`
        INSERT INTO user_addresses (id, userId, label, firstName, lastName, phone, address, city, state, zip, country, isDefault)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      user.addresses.forEach(addr => addrStmt.run(
        addr.id, user.id, addr.label, addr.firstName, addr.lastName, addr.phone,
        addr.address, addr.city, addr.state, addr.zip, addr.country, addr.isDefault ? 1 : 0
      ))
    }
    // 娣囨繂鐡?wishlist
    if (user.wishlist?.length) {
      const wishStmt = db.prepare('INSERT OR IGNORE INTO wishlist (userId, productId) VALUES (?, ?)')
      user.wishlist.forEach(pid => wishStmt.run(user.id, pid))
    }
    return user
  },

  update(id: string, updates: Partial<User>): User | null {
    const db = getDb()
    const existing = userRepo.getById(id)
    if (!existing) return null
    const merged = { ...existing, ...updates }
    db.prepare(`
      UPDATE users SET firstName = ?, lastName = ?, phone = ?, avatar = ?, dob = ?, gender = ?, bio = ?,
        coupons = ?,
        preferredCurrency = ?, role = ?, token = ?, tokenExpiresAt = ?, updatedAt = datetime('now')
      WHERE id = ?
    `).run(
      merged.firstName || '', merged.lastName || '', merged.phone || '',
      merged.avatar || null, merged.dob || null, merged.gender || null, merged.bio || null,
      merged.coupons && merged.coupons.length ? JSON.stringify(merged.coupons) : null,
      merged.preferredCurrency || 'USD', merged.role || 'customer', merged.token || null,
      (updates as any).tokenExpiresAt !== undefined ? (updates as any).tokenExpiresAt : merged.tokenExpiresAt || null,
      id
    )
    // 閺囧瓨鏌?addresses
    if (updates.addresses) {
      db.prepare('DELETE FROM user_addresses WHERE userId = ?').run(id)
      const addrStmt = db.prepare(`
        INSERT INTO user_addresses (id, userId, label, firstName, lastName, phone, address, city, state, zip, country, isDefault)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      updates.addresses.forEach(addr => addrStmt.run(
        addr.id, id, addr.label, addr.firstName, addr.lastName, addr.phone,
        addr.address, addr.city, addr.state, addr.zip, addr.country, addr.isDefault ? 1 : 0
      ))
    }
    // 閺囧瓨鏌?wishlist
    if (updates.wishlist) {
      db.prepare('DELETE FROM wishlist WHERE userId = ?').run(id)
      const wishStmt = db.prepare('INSERT INTO wishlist (userId, productId) VALUES (?, ?)')
      updates.wishlist.forEach(pid => wishStmt.run(id, pid))
    }
    return userRepo.getById(id) || null
  },
}

// ========== Reviews Repository ==========

export const reviewRepo = {
  list(): Review[] {
    const db = getDb()
    const rows = db.prepare('SELECT * FROM reviews ORDER BY createdAt DESC').all() as any[]
    return rows.map(rowToReview)
  },

  getByProduct(productId: string): Review[] {
    const db = getDb()
    const rows = db.prepare('SELECT * FROM reviews WHERE productId = ? ORDER BY createdAt DESC').all(productId) as any[]
    return rows.map(rowToReview)
  },

  add(data: Omit<Review, 'id' | 'createdAt' | 'date' | 'avatar'> & { approved?: boolean; date?: string; avatar?: string }): Review {
    const db = getDb()
    const id = 'REV-' + Date.now().toString(36).toUpperCase()
    const date = data.date || new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    const avatar = data.avatar || (data.author || 'A')[0].toUpperCase()
    db.prepare(`
      INSERT INTO reviews (id, productId, author, avatar, rating, date, content, location, approved, orderId, customerEmail, source)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, data.productId, data.author || 'Anonymous', avatar, data.rating, date, data.content || '', data.location || 'Verified Buyer', data.approved ? 1 : 0, data.orderId || null, data.customerEmail || null, data.source || 'customer')
    // 閺囧瓨鏌婇崯鍡楁惂鐠囧嫯顔戠拋鈩冩殶
    db.prepare('UPDATE products SET reviewCount = (SELECT COUNT(*) FROM reviews WHERE productId = products.id) WHERE id = ?').run(data.productId)
    return { ...data, id, date, avatar, approved: !!data.approved, hidden: false, deleted: false, createdAt: new Date().toISOString() } as Review
  },

  update(id: string, updates: Partial<Review>): Review | null {
    const db = getDb()
    const existing = reviewRepo.list().find(r => r.id === id)
    if (!existing) return null
    db.prepare(`
      UPDATE reviews SET author = ?, rating = ?, content = ?, location = ?, approved = ?, hidden = ?, deleted = ?, avatar = ?, date = ?
      WHERE id = ?
    `).run(
      updates.author || existing.author,
      updates.rating ?? existing.rating,
      updates.content || existing.content,
      updates.location || existing.location,
      updates.approved !== undefined ? (updates.approved ? 1 : 0) : (existing.approved ? 1 : 0),
      updates.hidden !== undefined ? (updates.hidden ? 1 : 0) : (existing.hidden ? 1 : 0),
      updates.deleted !== undefined ? (updates.deleted ? 1 : 0) : (existing.deleted ? 1 : 0),
      updates.avatar || existing.avatar,
      updates.date || existing.date,
      id
    )
    return reviewRepo.list().find(r => r.id === id) || null
  },
}

// ========== Messages Repository ==========

function parseAttachments(raw: any): any[] {
  if (!raw) return []
  if (Array.isArray(raw)) return raw
  try { return JSON.parse(raw) } catch { return [] }
}

function rowToMessage(row: any, userInfo?: { avatar?: string; name?: string; registered?: boolean }): Message {
  return {
    id: row.id,
    name: userInfo?.name || row.name || '',
    email: row.email || '',
    phone: row.phone || '',
    subject: row.subject || '',
    message: row.message || '',
    avatar: row.avatar || userInfo?.avatar || undefined,
    registered: userInfo?.registered || false,
    status: row.status || 'unread',
    createdAt: row.createdAt,
    source: row.source || '',
    attachments: parseAttachments(row.attachments),
    adminReply: row.adminReply || '',
    adminAttachments: parseAttachments(row.adminAttachments),
    adminName: row.adminName || '',
    adminAvatar: row.adminAvatar || '',
    repliedAt: row.repliedAt || '',
    read: row.read ? true : (row.status === 'read'),
    replied: row.replied ? true : (row.status === 'replied'),
    senderType: (row.senderType as 'customer' | 'admin') || 'customer',
    adminRead: row.adminRead ? true : false,
    chatType: row.chatType || undefined,
    fromStaffId: row.fromStaffId || undefined,
    toStaffId: row.toStaffId || undefined,
    fromAvatar: row.fromAvatar || undefined,
    fromName: row.fromName || undefined,
    toAvatar: row.toAvatar || undefined,
    toName: row.toName || undefined,
    orderRef: row.orderRef ? JSON.parse(row.orderRef) : undefined,
  } as any
}

function getUserInfoByEmail(db: any, email: string): { avatar?: string; name?: string; registered: boolean } {
  if (!email) return { registered: false }
  const userRow = db.prepare('SELECT avatar, firstName, lastName FROM users WHERE email = ?').get(email.toLowerCase()) as any
  if (!userRow) return { registered: false }
  const fullName = [userRow.firstName, userRow.lastName].filter(Boolean).join(' ')
  return { avatar: userRow.avatar || undefined, name: fullName || undefined, registered: true }
}

export const messageRepo = {
  list(): Message[] {
    const db = getDb()
    const rows = db.prepare('SELECT * FROM messages ORDER BY createdAt DESC').all() as any[]
    const infoCache = new Map<string, { avatar?: string; name?: string; registered: boolean }>()
    return rows.map(row => {
      const key = row.email?.toLowerCase()
      let info = infoCache.get(key)
      if (!info && row.email) {
        info = getUserInfoByEmail(db, row.email)
        infoCache.set(key, info)
      }
      return rowToMessage(row, info)
    })
  },

  getById(id: string): Message | undefined {
    const db = getDb()
    const row = db.prepare('SELECT * FROM messages WHERE id = ?').get(id) as any
    if (!row) return undefined
    const info = getUserInfoByEmail(db, row.email)
    return rowToMessage(row, info)
  },

  add(data: Omit<Message, 'id' | 'createdAt'> & Partial<Message>): Message {
    const db = getDb()
    const id = data.id || ('MSG-' + Date.now().toString(36).toUpperCase())
    const createdAt = data.createdAt || new Date().toISOString()
    const status = data.status || 'unread'
    const attachments = JSON.stringify(data.attachments || [])
    const read = data.read ? 1 : 0
    const replied = data.replied ? 1 : 0
    const senderType = data.senderType || 'customer'
    const adminRead = data.adminRead ? 1 : 0
    const orderRef = data.orderRef ? JSON.stringify(data.orderRef) : null
    db.prepare(`
      INSERT INTO messages (id, name, email, phone, subject, message, status, createdAt, source, attachments, adminReply, adminAttachments, adminName, adminAvatar, repliedAt, read, replied, senderType, adminRead, avatar, chatType, fromStaffId, toStaffId, fromAvatar, fromName, toAvatar, toName, orderRef)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, data.name || '', data.email || '', data.phone || '', data.subject || '',
      data.message || '', status, createdAt, data.source || '', attachments,
      data.adminReply || '', JSON.stringify(data.adminAttachments || []),
      data.adminName || '', data.adminAvatar || '', data.repliedAt || '', read, replied, senderType, adminRead, data.avatar || '',
      data.chatType || '', data.fromStaffId || '', data.toStaffId || '',
      data.fromAvatar || '', data.fromName || '', data.toAvatar || '', data.toName || '', orderRef
    )
    return messageRepo.getById(id) as Message
  },

  update(id: string, updates: Partial<Message>): Message | null {
    const db = getDb()
    const existing = messageRepo.getById(id)
    if (!existing) return null
    const fields: string[] = []
    const values: any[] = []
    if (updates.name !== undefined) { fields.push('name = ?'); values.push(updates.name) }
    if (updates.email !== undefined) { fields.push('email = ?'); values.push(updates.email) }
    if (updates.phone !== undefined) { fields.push('phone = ?'); values.push(updates.phone) }
    if (updates.subject !== undefined) { fields.push('subject = ?'); values.push(updates.subject) }
    if (updates.message !== undefined) { fields.push('message = ?'); values.push(updates.message) }
    if (updates.status !== undefined) { fields.push('status = ?'); values.push(updates.status) }
    if (updates.source !== undefined) { fields.push('source = ?'); values.push(updates.source) }
    if (updates.attachments !== undefined) { fields.push('attachments = ?'); values.push(JSON.stringify(updates.attachments)) }
    if (updates.adminReply !== undefined) { fields.push('adminReply = ?'); values.push(updates.adminReply) }
    if (updates.adminAttachments !== undefined) { fields.push('adminAttachments = ?'); values.push(JSON.stringify(updates.adminAttachments)) }
    if (updates.adminName !== undefined) { fields.push('adminName = ?'); values.push(updates.adminName) }
    if (updates.adminAvatar !== undefined) { fields.push('adminAvatar = ?'); values.push(updates.adminAvatar) }
    if (updates.repliedAt !== undefined) { fields.push('repliedAt = ?'); values.push(updates.repliedAt) }
    if (updates.read !== undefined) { fields.push('read = ?'); values.push(updates.read ? 1 : 0) }
    if (updates.replied !== undefined) { fields.push('replied = ?'); values.push(updates.replied ? 1 : 0) }
    if (updates.senderType !== undefined) { fields.push('senderType = ?'); values.push(updates.senderType) }
    if (updates.adminRead !== undefined) { fields.push('adminRead = ?'); values.push(updates.adminRead ? 1 : 0) }
    if (updates.avatar !== undefined) { fields.push('avatar = ?'); values.push(updates.avatar) }
    if (updates.chatType !== undefined) { fields.push('chatType = ?'); values.push(updates.chatType) }
    if (updates.fromStaffId !== undefined) { fields.push('fromStaffId = ?'); values.push(updates.fromStaffId) }
    if (updates.toStaffId !== undefined) { fields.push('toStaffId = ?'); values.push(updates.toStaffId) }
    if (updates.fromAvatar !== undefined) { fields.push('fromAvatar = ?'); values.push(updates.fromAvatar) }
    if (updates.fromName !== undefined) { fields.push('fromName = ?'); values.push(updates.fromName) }
    if (updates.toAvatar !== undefined) { fields.push('toAvatar = ?'); values.push(updates.toAvatar) }
    if (updates.toName !== undefined) { fields.push('toName = ?'); values.push(updates.toName) }
    if (updates.orderRef !== undefined) { fields.push('orderRef = ?'); values.push(JSON.stringify(updates.orderRef)) }
    if (fields.length > 0) {
      values.push(id)
      db.prepare(`UPDATE messages SET ${fields.join(', ')} WHERE id = ?`).run(...values)
    }
    return messageRepo.getById(id) || null
  },
}

// ========== Settings Repository ==========

const DEFAULT_SETTINGS_KEY = 'site_settings'

export const settingsRepo = {
  get(): SiteSettings {
    const db = getDb()
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(DEFAULT_SETTINGS_KEY) as any
    if (row && row.value) {
      try {
        return normalizeSavedSettings(JSON.parse(row.value))
      } catch {}
    }
    return DEFAULTS as SiteSettings
  },

  update(updates: Partial<SiteSettings>): SiteSettings {
    const db = getDb()
    const current = settingsRepo.get()
    const merged = {
      ...current,
      ...updates,
      frontendContent: updates.frontendContent
        ? { ...current.frontendContent, ...updates.frontendContent }
        : current.frontendContent,
    }
    db.prepare(`
      INSERT OR REPLACE INTO settings (key, value, updatedAt)
      VALUES (?, ?, datetime('now'))
    `).run(DEFAULT_SETTINGS_KEY, JSON.stringify(merged))

    // 閸忔娊鏁敍姘閹?getSettings() 閻ㄥ嫯绻樼粙瀣敶缂傛挸鐡ㄩ妴?
    // getSettings() 閻?lib/cache 缂傛挸鐡?settings閿涘湵TL 60 缁夋帪绱濇稉鏂垮涧閸?JSON 閸愭瑥鍙嗙捄顖氱窞
    // saveSettings() 闁插本澧犳径杈ㄦ櫏閿涘鈧倸鎮楅崣棰佺箽鐎涙顔曠純顔胯泲閻ㄥ嫭妲告潻娆撳櫡閿涘奔绗夋径杈ㄦ櫏閻ㄥ嫯鐦?
    // 閸氬骸褰撮弨閫涚啊闁板秶鐤嗛張鈧梹?60 缁夋帗澧犻悽鐔告櫏閿涘矁銆冮悳棰佽礋閵嗗本妲戦弰搴㈡暭娴滃棗宓堝▽鈥冲冀鎼存柣鈧秲鈧?
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require('@/lib/cache').invalidateCache('settings')
    } catch {
      // 缂傛挸鐡ㄥΟ鈥虫健娑撳秴褰查悽銊ょ瑝鎼存柨濂栭崫宥堫啎缂冾喕绻氱€涙ɑ婀伴煬?
    }

    return merged
  },
}

// ========== Staff Repository ==========

export const staffRepo = {
  list(): StaffMember[] {
    const settings = settingsRepo.get()
    return settings.staffMembers || []
  },

  getById(id: string): StaffMember | undefined {
    return staffRepo.list().find(s => s.id === id)
  },

  getByEmail(email: string): StaffMember | undefined {
    return staffRepo.list().find(s => s.email.toLowerCase() === email.toLowerCase())
  },

  add(data: Omit<StaffMember, 'id' | 'createdAt'> & Partial<StaffMember>): StaffMember {
    const settings = settingsRepo.get()
    const staff = settings.staffMembers || []
    const member: StaffMember = {
      ...data,
      id: data.id || ('STF-' + Date.now().toString(36).toUpperCase()),
      createdAt: data.createdAt || new Date().toISOString(),
    } as StaffMember
    staff.push(member)
    settingsRepo.update({ staffMembers: staff })
    return member
  },

  update(id: string, updates: Partial<StaffMember>): StaffMember | null {
    const settings = settingsRepo.get()
    const staff = settings.staffMembers || []
    const idx = staff.findIndex(s => s.id === id)
    if (idx === -1) return null
    staff[idx] = { ...staff[idx], ...updates }
    settingsRepo.update({ staffMembers: staff })
    return staff[idx]
  },

  delete(id: string): boolean {
    const settings = settingsRepo.get()
    const staff = settings.staffMembers || []
    const before = staff.length
    const filtered = staff.filter(s => s.id !== id)
    if (filtered.length === before) return false
    settingsRepo.update({ staffMembers: filtered })
    return true
  },
}

// ========== Newsletter Repository ==========

export const newsletterRepo = {
  list(): NewsletterSubscriber[] {
    const db = getDb()
    const rows = db.prepare('SELECT * FROM newsletter_subscribers ORDER BY createdAt DESC').all() as any[]
    return rows.map(row => ({
      id: row.id,
      email: row.email,
      status: row.status || 'active',
      createdAt: row.createdAt,
      subscribedAt: row.createdAt,
      source: row.source || '',
    }))
  },

  getByEmail(email: string): NewsletterSubscriber | undefined {
    const db = getDb()
    const row = db.prepare('SELECT * FROM newsletter_subscribers WHERE email = ?').get(email.toLowerCase()) as any
    if (!row) return undefined
    return {
      id: row.id,
      email: row.email,
      status: row.status || 'active',
      createdAt: row.createdAt,
      subscribedAt: row.createdAt,
      source: row.source || '',
    }
  },

  add(email: string, source = 'footer'): NewsletterSubscriber {
    const db = getDb()
    const normalized = email.toLowerCase().trim()
    const existing = newsletterRepo.getByEmail(normalized)
    if (existing) return existing
    const id = 'NL-' + Date.now().toString(36).toUpperCase()
    const createdAt = new Date().toISOString()
    db.prepare(`
      INSERT INTO newsletter_subscribers (id, email, status, createdAt)
      VALUES (?, ?, 'active', ?)
    `).run(id, normalized, createdAt)
    return {
      id,
      email: normalized,
      status: 'active',
      createdAt,
      subscribedAt: createdAt,
      source,
    }
  },

  delete(id: string): boolean {
    const db = getDb()
    const result = db.prepare('DELETE FROM newsletter_subscribers WHERE id = ?').run(id)
    return result.changes > 0
  },
}

// ========== Work Logs Repository ==========

export const workLogRepo = {
  list(): WorkLogEntry[] {
    const db = getDb()
    const rows = db.prepare('SELECT * FROM work_logs ORDER BY timestamp DESC').all() as any[]
    return rows.map(row => ({
      id: row.id,
      timestamp: row.timestamp,
      operatorId: row.operatorId || '',
      operatorName: row.operatorName || '',
      operatorRole: row.operatorRole || '',
      action: row.action || '',
      details: row.details || '',
      orderId: row.orderId || undefined,
      productId: row.productId || undefined,
      category: row.category || undefined,
    }))
  },

  add(data: Omit<WorkLogEntry, 'id' | 'timestamp'> & Partial<WorkLogEntry>): WorkLogEntry {
    const db = getDb()
    const id = data.id || ('WL-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).slice(2, 6).toUpperCase())
    const timestamp = data.timestamp || new Date().toISOString()
    db.prepare(`
      INSERT INTO work_logs (id, timestamp, operatorId, operatorName, operatorRole, action, details, orderId, productId, category)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      timestamp,
      data.operatorId || null,
      data.operatorName || null,
      data.operatorRole || null,
      data.action || null,
      data.details || null,
      data.orderId || null,
      data.productId || null,
      data.category || null,
    )
    return {
      ...data,
      id,
      timestamp,
      operatorId: data.operatorId || '',
      operatorName: data.operatorName || '',
      operatorRole: data.operatorRole || '',
      action: data.action || '',
      details: data.details || '',
    } as WorkLogEntry
  },
}

// ========== Browsing History Repository ==========

export const browsingHistoryRepo = {
  list(): any[] {
    const db = getDb()
    const rows = db.prepare('SELECT * FROM browsing_history ORDER BY timestamp DESC').all() as any[]
    return rows.map(row => ({
      id: row.id,
      sessionId: row.sessionId,
      userId: row.userId || undefined,
      email: row.email || '',
      visitorId: row.visitorId,
      productId: row.productId,
      productName: row.productName || '',
      productImage: row.productImage || '',
      productPrice: row.productPrice || 0,
      productCode: row.productCode || '',
      productCategory: row.productCategory || '',
      pageType: row.pageType || 'product',
      duration: row.duration || 0,
      ip: row.ip || '',
      timestamp: row.timestamp,
    }))
  },

  getByEmail(email: string): any[] {
    const db = getDb()
    const rows = db.prepare('SELECT * FROM browsing_history WHERE email = ? ORDER BY timestamp DESC').all(email.toLowerCase()) as any[]
    return rows.map(row => ({
      id: row.id,
      sessionId: row.sessionId,
      userId: row.userId || undefined,
      email: row.email || '',
      visitorId: row.visitorId,
      productId: row.productId,
      productName: row.productName || '',
      productImage: row.productImage || '',
      productPrice: row.productPrice || 0,
      productCode: row.productCode || '',
      productCategory: row.productCategory || '',
      pageType: row.pageType || 'product',
      duration: row.duration || 0,
      ip: row.ip || '',
      timestamp: row.timestamp,
    }))
  },

  getByVisitor(visitorId: string): any[] {
    const db = getDb()
    const rows = db.prepare('SELECT * FROM browsing_history WHERE visitorId = ? ORDER BY timestamp DESC').all(visitorId) as any[]
    return rows.map(row => ({
      id: row.id,
      sessionId: row.sessionId,
      userId: row.userId || undefined,
      email: row.email || '',
      visitorId: row.visitorId,
      productId: row.productId,
      productName: row.productName || '',
      productImage: row.productImage || '',
      productPrice: row.productPrice || 0,
      productCode: row.productCode || '',
      productCategory: row.productCategory || '',
      pageType: row.pageType || 'product',
      duration: row.duration || 0,
      ip: row.ip || '',
      timestamp: row.timestamp,
    }))
  },

  add(data: {
    sessionId: string
    userId?: string
    email?: string
    visitorId: string
    productId: string
    productName?: string
    productImage?: string
    productPrice?: number
    productCode?: string
    productCategory?: string
    pageType?: string
    duration?: number
    ip?: string
  }): any {
    const db = getDb()
    // 閸樺鍣? 閸氬奔绔?visitorId + productId 閸?30 缁夋帒鍞存稉宥夊櫢婢跺秵褰冮崗?(闂冨弶顒?React StrictMode 閸欏矁鐨熼悽?
    const existing = db.prepare(`
      SELECT * FROM browsing_history
      WHERE visitorId = ? AND productId = ?
        AND strftime('%s', timestamp) > strftime('%s', 'now', '-30 seconds')
      ORDER BY timestamp DESC LIMIT 1
    `).get(data.visitorId, data.productId) as any
    if (existing) {
      // 婵″倹鐏夐弬鎷岊嚞濮瑰倸鐢張澶屾暏閹磋渹淇婇幁顖濃偓灞炬＋鐠佹澘缍嶅▽鈩冩箒, 閺囧瓨鏌婇弮褑顔囪ぐ?
      if ((data.userId || data.email) && (!existing.userId || !existing.email)) {
        const fields: string[] = []
        const values: any[] = []
        if (data.userId && !existing.userId) { fields.push('userId = ?'); values.push(data.userId) }
        if (data.email && !existing.email) { fields.push('email = ?'); values.push(data.email.toLowerCase()) }
        if (fields.length > 0) {
          values.push(existing.id)
          db.prepare(`UPDATE browsing_history SET ${fields.join(', ')} WHERE id = ?`).run(...values)
        }
      }
      return {
        id: existing.id,
        sessionId: existing.sessionId,
        userId: existing.userId || undefined,
        email: existing.email || '',
        visitorId: existing.visitorId,
        productId: existing.productId,
        productName: existing.productName || '',
        productImage: existing.productImage || '',
        productPrice: existing.productPrice || 0,
        productCode: existing.productCode || '',
        productCategory: existing.productCategory || '',
        pageType: existing.pageType || 'product',
        duration: existing.duration || 0,
        ip: existing.ip || '',
        timestamp: existing.timestamp,
      }
    }
    const id = 'BH-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).slice(2, 6).toUpperCase()
    const createdAt = new Date().toISOString()
    db.prepare(`
      INSERT INTO browsing_history (id, sessionId, userId, email, visitorId, productId, productName, productImage, productPrice, productCode, productCategory, pageType, duration, ip, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, data.sessionId, data.userId || null, (data.email || '').toLowerCase(),
      data.visitorId, data.productId, data.productName || '', data.productImage || '',
      data.productPrice || 0, data.productCode || '', data.productCategory || '', data.pageType || 'product',
      data.duration || 0, data.ip || '', createdAt
    )
    return { ...data, id, timestamp: createdAt }
  },

  update(id: string, updates: Partial<{ duration: number; email: string; userId: string }>): any | null {
    const db = getDb()
    const fields: string[] = []
    const values: any[] = []
    if (updates.duration !== undefined) { fields.push('duration = ?'); values.push(updates.duration) }
    if (updates.email !== undefined) { fields.push('email = ?'); values.push(updates.email.toLowerCase()) }
    if (updates.userId !== undefined) { fields.push('userId = ?'); values.push(updates.userId || null) }
    if (fields.length > 0) {
      values.push(id)
      db.prepare(`UPDATE browsing_history SET ${fields.join(', ')} WHERE id = ?`).run(...values)
    }
    const row = db.prepare('SELECT * FROM browsing_history WHERE id = ?').get(id) as any
    if (!row) return null
    return {
      id: row.id,
      sessionId: row.sessionId,
      userId: row.userId || undefined,
      email: row.email || '',
      visitorId: row.visitorId,
      productId: row.productId,
      productName: row.productName || '',
      productImage: row.productImage || '',
      productPrice: row.productPrice || 0,
      productCode: row.productCode || '',
      productCategory: row.productCategory || '',
      pageType: row.pageType || 'product',
      duration: row.duration || 0,
      ip: row.ip || '',
      timestamp: row.timestamp,
    }
  },

  cleanupOld(days: number = 90): number {
    const db = getDb()
    const result = db.prepare(`DELETE FROM browsing_history WHERE timestamp < datetime('now', '-${days} days')`).run()
    return result.changes
  },
}

// ========== Customers Repository ==========

export const customerRepo = {
  list(): any[] {
    const db = getDb()
    const rows = db.prepare('SELECT * FROM customers ORDER BY totalSpent DESC, lastOrderAt DESC').all() as any[]
    return rows.map(row => ({
      id: row.id,
      email: row.email,
      firstName: row.firstName || '',
      lastName: row.lastName || '',
      phone: row.phone || '',
      avatar: row.avatar || undefined,
      rating: row.rating || 0,
      tier: row.tier || 'standard',
      notes: row.notes || '',
      preferences: row.preferences ? JSON.parse(row.preferences) : [],
      tags: row.tags ? JSON.parse(row.tags) : [],
      totalOrders: row.totalOrders || 0,
      totalSpent: row.totalSpent || 0,
      lastOrderAt: row.lastOrderAt || '',
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }))
  },

  getById(id: string): any | undefined {
    const db = getDb()
    const row = db.prepare('SELECT * FROM customers WHERE id = ?').get(id) as any
    if (!row) return undefined
    return {
      id: row.id,
      email: row.email,
      firstName: row.firstName || '',
      lastName: row.lastName || '',
      phone: row.phone || '',
      avatar: row.avatar || undefined,
      rating: row.rating || 0,
      tier: row.tier || 'standard',
      notes: row.notes || '',
      preferences: row.preferences ? JSON.parse(row.preferences) : [],
      tags: row.tags ? JSON.parse(row.tags) : [],
      totalOrders: row.totalOrders || 0,
      totalSpent: row.totalSpent || 0,
      lastOrderAt: row.lastOrderAt || '',
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }
  },

  getByEmail(email: string): any | undefined {
    const db = getDb()
    const row = db.prepare('SELECT * FROM customers WHERE email = ?').get(email.toLowerCase()) as any
    if (!row) return undefined
    return {
      id: row.id,
      email: row.email,
      firstName: row.firstName || '',
      lastName: row.lastName || '',
      phone: row.phone || '',
      avatar: row.avatar || undefined,
      rating: row.rating || 0,
      tier: row.tier || 'standard',
      notes: row.notes || '',
      preferences: row.preferences ? JSON.parse(row.preferences) : [],
      tags: row.tags ? JSON.parse(row.tags) : [],
      totalOrders: row.totalOrders || 0,
      totalSpent: row.totalSpent || 0,
      lastOrderAt: row.lastOrderAt || '',
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }
  },

  add(data: Omit<any, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): any {
    const db = getDb()
    const id = data.id || 'CUS-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).slice(2, 6).toUpperCase()
    const now = new Date().toISOString()
    db.prepare(`
      INSERT INTO customers (id, email, firstName, lastName, phone, avatar, rating, tier, notes, preferences, tags, totalOrders, totalSpent, lastOrderAt, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, data.email.toLowerCase(), data.firstName || '', data.lastName || '',
      data.phone || '', data.avatar || null, data.rating || 0, data.tier || 'standard',
      data.notes || '', JSON.stringify(data.preferences || []), JSON.stringify(data.tags || []),
      data.totalOrders || 0, data.totalSpent || 0, data.lastOrderAt || null, now, now
    )
    return customerRepo.getById(id) as any
  },

  update(id: string, updates: Partial<any>): any | null {
    const db = getDb()
    const existing = customerRepo.getById(id)
    if (!existing) return null
    const fields: string[] = []
    const values: any[] = []
    if (updates.firstName !== undefined) { fields.push('firstName = ?'); values.push(updates.firstName) }
    if (updates.lastName !== undefined) { fields.push('lastName = ?'); values.push(updates.lastName) }
    if (updates.phone !== undefined) { fields.push('phone = ?'); values.push(updates.phone) }
    if (updates.avatar !== undefined) { fields.push('avatar = ?'); values.push(updates.avatar || null) }
    if (updates.rating !== undefined) { fields.push('rating = ?'); values.push(updates.rating) }
    if (updates.tier !== undefined) { fields.push('tier = ?'); values.push(updates.tier) }
    if (updates.notes !== undefined) { fields.push('notes = ?'); values.push(updates.notes) }
    if (updates.preferences !== undefined) { fields.push('preferences = ?'); values.push(JSON.stringify(updates.preferences)) }
    if (updates.tags !== undefined) { fields.push('tags = ?'); values.push(JSON.stringify(updates.tags)) }
    if (updates.totalOrders !== undefined) { fields.push('totalOrders = ?'); values.push(updates.totalOrders) }
    if (updates.totalSpent !== undefined) { fields.push('totalSpent = ?'); values.push(updates.totalSpent) }
    if (updates.lastOrderAt !== undefined) { fields.push('lastOrderAt = ?'); values.push(updates.lastOrderAt || null) }
    if (fields.length > 0) {
      fields.push('updatedAt = datetime(\'now\')')
      values.push(id)
      db.prepare(`UPDATE customers SET ${fields.join(', ')} WHERE id = ?`).run(...values)
    }
    return customerRepo.getById(id) || null
  },

  upsertByEmail(email: string, updates: Partial<any>): any {
    const existing = customerRepo.getByEmail(email)
    if (existing) {
      return customerRepo.update(existing.id, updates)
    }
    return customerRepo.add({ ...updates, email })
  },

  syncFromOrders(): void {
    const db = getDb()
    const orders = orderRepo.list()
    const emailMap: Record<string, { orders: any[]; total: number; lastOrder: string }> = {}
    const settings = getSettings()
    const tiers = settings.customerTiers || DEFAULTS.customerTiers
    
    orders.forEach(order => {
      const email = (order.customerEmail || order.shipping?.email || '').toLowerCase()
      if (!email) return
      if (!emailMap[email]) {
        emailMap[email] = { orders: [], total: 0, lastOrder: '' }
      }
      emailMap[email].orders.push(order)
      emailMap[email].total += order.total || 0
      if (!emailMap[email].lastOrder || order.createdAt > emailMap[email].lastOrder) {
        emailMap[email].lastOrder = order.createdAt
      }
    })

    Object.entries(emailMap).forEach(([email, data]) => {
      const firstOrder = data.orders[0]
      const customer = customerRepo.getByEmail(email)
      
      const tier = tiers.find(t => data.orders.length >= t.minOrders && data.orders.length <= t.maxOrders) || tiers[0]
      
      const updates: any = {
        totalOrders: data.orders.length,
        totalSpent: data.total,
        lastOrderAt: data.lastOrder,
        tier: tier.id,
        rating: tier.stars,
      }
      if (!customer) {
        updates.firstName = firstOrder.customerName?.split(' ')[0] || firstOrder.shipping?.firstName || ''
        updates.lastName = firstOrder.customerName?.split(' ').slice(1).join(' ') || firstOrder.shipping?.lastName || ''
        updates.phone = firstOrder.customerPhone || firstOrder.shipping?.phone || ''
        customerRepo.add({ ...updates, email })
      } else {
        customerRepo.update(customer.id, updates)
      }
    })
  },
}

// ========== Shipments Repository (閻椻晜绁﹂崣鎴ｆ彛鐠佹澘缍? ==========

function rowToShipment(row: any): any {
  return {
    id: row.id,
    orderId: row.orderId,
    orderNo: row.orderNo || '',
    shipmentNo: row.shipmentNo || '',
    carrierCode: row.carrierCode || '',
    carrierName: row.carrierName || '',
    trackingNumber: row.trackingNumber || '',
    status: row.status || 'pending',
    weight: row.weight || undefined,
    shippingCost: row.shippingCost || undefined,
    shippedAt: row.shippedAt || '',
    estimatedDelivery: row.estimatedDelivery || '',
    deliveredAt: row.deliveredAt || '',
    events: row.events ? JSON.parse(row.events) : [],
    notes: row.notes || '',
    createdBy: row.createdBy || '',
    // 閸欐垼鎻ｉ柅姘辩叀鐠佹澘缍?(閸氬骸褰?"闁氨鐓＄€广垺鍩? 閻?: 濞撶娀浜?email | message, 閸欐垿鈧焦妞傞梻缈犵瑢閻╊喗鐖?
    notifiedAt: row.notifiedAt || '',
    notifiedChannel: row.notifiedChannel || '',
    notifiedTo: row.notifiedTo || '',
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export const shipmentRepo = {
  list(): any[] {
    const db = getDb()
    const rows = db.prepare('SELECT * FROM shipments ORDER BY createdAt DESC').all() as any[]
    return rows.map(rowToShipment)
  },

  getByOrderId(orderId: string): any[] {
    const db = getDb()
    const rows = db.prepare('SELECT * FROM shipments WHERE orderId = ? ORDER BY createdAt ASC').all(orderId) as any[]
    return rows.map(rowToShipment)
  },

  getByTrackingNumber(trackingNumber: string): any | null {
    const db = getDb()
    const row = db.prepare('SELECT * FROM shipments WHERE trackingNumber = ?').get(trackingNumber) as any
    return row ? rowToShipment(row) : null
  },

  getById(id: string): any | null {
    const db = getDb()
    const row = db.prepare('SELECT * FROM shipments WHERE id = ?').get(id) as any
    return row ? rowToShipment(row) : null
  },

  add(data: {
    orderId: string
    orderNo?: string
    shipmentNo: string
    carrierCode: string
    carrierName?: string
    trackingNumber: string
    status?: string
    weight?: number
    shippingCost?: number
    shippedAt?: string
    estimatedDelivery?: string
    events?: any[]
    notes?: string
    createdBy?: string
  }): any {
    const db = getDb()
    const id = 'SHP-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).slice(2, 6).toUpperCase()
    const now = new Date().toISOString()
    const shippedAt = data.shippedAt || now
    db.prepare(`
      INSERT INTO shipments (id, orderId, orderNo, shipmentNo, carrierCode, carrierName, trackingNumber, status, weight, shippingCost, shippedAt, estimatedDelivery, events, notes, createdBy, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, data.orderId, data.orderNo || '', data.shipmentNo,
      data.carrierCode, data.carrierName || '', data.trackingNumber,
      data.status || 'picked_up', data.weight || null, data.shippingCost || null,
      shippedAt, data.estimatedDelivery || '',
      JSON.stringify(data.events || []), data.notes || '', data.createdBy || '',
      now, now
    )
    return shipmentRepo.getById(id)
  },

  update(id: string, updates: Partial<any>): any | null {
    const db = getDb()
    const existing = shipmentRepo.getById(id)
    if (!existing) return null
    const fields: string[] = []
    const values: any[] = []
    const setField = (col: string, val: any) => {
      if (val !== undefined) { fields.push(`${col} = ?`); values.push(val) }
    }
    setField('carrierCode', updates.carrierCode)
    setField('carrierName', updates.carrierName)
    setField('trackingNumber', updates.trackingNumber)
    setField('status', updates.status)
    setField('weight', updates.weight)
    setField('shippingCost', updates.shippingCost)
    setField('estimatedDelivery', updates.estimatedDelivery)
    setField('deliveredAt', updates.deliveredAt)
    setField('notes', updates.notes)
    setField('notifiedAt', updates.notifiedAt)
    setField('notifiedChannel', updates.notifiedChannel)
    setField('notifiedTo', updates.notifiedTo)
    if (updates.events !== undefined) {
      fields.push('events = ?')
      values.push(JSON.stringify(updates.events))
    }
    // 閼奉亜濮╃拋鍓х枂 deliveredAt (瑜版挾濮搁幀浣稿綁娑?delivered 娑撴梹婀幍瀣З鐠佸墽鐤嗛弮?
    if (updates.status === 'delivered' && !updates.deliveredAt && !existing.deliveredAt) {
      fields.push('deliveredAt = ?')
      values.push(new Date().toISOString())
    }
    if (fields.length > 0) {
      fields.push('updatedAt = datetime(\'now\')')
      values.push(id)
      db.prepare(`UPDATE shipments SET ${fields.join(', ')} WHERE id = ?`).run(...values)
    }
    return shipmentRepo.getById(id)
  },

  // 濞ｈ濮炴潪銊ㄦ姉閼哄倻鍋?
  addTrackEvent(shipmentId: string, event: { timestamp: string; location: string; description: string; status: string; carrier?: string }): any | null {
    const shipment = shipmentRepo.getById(shipmentId)
    if (!shipment) return null
    const newEvent = {
      id: 'EVT-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).slice(2, 6).toUpperCase(),
      ...event,
    }
    const events = [...(shipment.events || []), newEvent]
    // 閹?timestamp 閹烘帒绨?
    events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    return shipmentRepo.update(shipmentId, { events, status: event.status })
  },

  delete(id: string): boolean {
    const db = getDb()
    const result = db.prepare('DELETE FROM shipments WHERE id = ?').run(id)
    return result.changes > 0
  },

  // 閸欐牗绉烽崣鎴ｆ彛
  // 鐏忓棛澧垮ù浣稿礋閺嶅洩顔囨稉?cancelled
  // 婵″倹鐏夌拠銉吂閸楁洘鐥呴張澶婂従娴犳牗妞跨捄鍐⒖濞翠礁宕熼敍灞藉灟鐏忓棜顓归崡鏇炴礀闁偓閸?processing 閻樿埖鈧礁鑻熷〒鍛存珟 tracking 娣団剝浼?
  // 閸欘亝婀侀棃?delivered/returned/cancelled 閻樿埖鈧胶娈戦崣鎴ｆ彛閸楁洘澧犻懗钘夊絿濞?
  cancel(id: string, reason?: string, operator?: string): { shipment: any; order: any; orderReverted: boolean } | null {
    const db = getDb()
    const shipment = shipmentRepo.getById(id)
    if (!shipment) return null

    // 濡偓閺屻儲妲搁崥锕€褰叉禒銉ュ絿濞?
    if (['delivered', 'returned', 'cancelled'].includes(shipment.status)) {
      throw new Error(`Cannot cancel shipment with status: ${shipment.status}`)
    }

    const order = orderRepo.getById(shipment.orderId)
    if (!order) throw new Error('Order not found')

    const now = new Date().toISOString()
    const cancelNote = reason || 'Shipment cancelled'

    // 濡偓閺屻儴顕氱拋銏犲礋閺勵垰鎯侀張澶婂従娴犳牗妞跨捄鍐⒖濞翠礁宕?
    const allShipments = shipmentRepo.getByOrderId(shipment.orderId)
    const otherActiveShipments = allShipments.filter(s => s.id !== id && !['cancelled', 'delivered', 'returned'].includes(s.status))
    const hasOtherActiveShipment = otherActiveShipments.length > 0

    const tx = db.transaction(() => {
      // 1. 濞ｈ濮為崣鏍ㄧХ娴滃娆㈤崚鎷屽缓鏉?
      const cancelEvent = {
        id: 'EVT-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).slice(2, 6).toUpperCase(),
        timestamp: now,
        location: '',
        description: cancelNote,
        status: 'cancelled',
        carrier: shipment.carrierCode,
        operator: operator || '',
      }
      const events = [...(shipment.events || []), cancelEvent]

      // 2. 閺囧瓨鏌婇崣鎴ｆ彛閸楁洜濮搁幀浣疯礋 cancelled
      const fields: string[] = ['status = ?', 'events = ?', 'updatedAt = datetime(\'now\')']
      const values: any[] = ['cancelled', JSON.stringify(events)]
      if (shipment.notes) {
        fields.push('notes = ?')
        values.push(shipment.notes + '\n[cancelled] ' + cancelNote)
      } else {
        fields.push('notes = ?')
        values.push('[cancelled] ' + cancelNote)
      }
      values.push(id)
      db.prepare(`UPDATE shipments SET ${fields.join(', ')} WHERE id = ?`).run(...values)

      // 3. 閸欘亝婀佽ぐ鎾寸梾閺堝鍙炬禒鏍ㄦた鐠哄啰澧垮ù浣稿礋閺冭绱濋幍宥呮礀闁偓鐠併垹宕熼悩鑸碘偓浣歌嫙濞撳懘娅?tracking 娣団剝浼?
      if (!hasOtherActiveShipment) {
        const orderFields: string[] = ['status = ?']
        const orderValues: any[] = ['processing']
        const histId = 'OSH-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
        db.prepare(`
          INSERT INTO order_status_history (id, orderId, status, note, timestamp)
          VALUES (?, ?, ?, ?, ?)
        `).run(histId, shipment.orderId, 'processing', `Shipment ${shipment.shipmentNo || shipment.id.slice(0,12)} cancelled: ${cancelNote}`, now)

        // 濞撳懘娅巘racking娣団剝浼?
        orderFields.push('trackingNumber = ?')
        orderValues.push(null)
        orderFields.push('carrier = ?')
        orderValues.push(null)
        orderFields.push('trackingUrl = ?')
        orderValues.push(null)

        orderValues.push(shipment.orderId)
        db.prepare(`UPDATE orders SET ${orderFields.join(', ')} WHERE id = ?`).run(...orderValues)
      }

      return {
        shipment: shipmentRepo.getById(id),
        order: orderRepo.getById(shipment.orderId),
        orderReverted: !hasOtherActiveShipment,
      }
    })

    return tx()
  },

  // 濡偓閺屻儴顓归崡鏇熸Ц閸氾附婀佸ú鏄忕┈閻ㄥ嫬褰傜拹褍宕?(闂?cancelled/delivered/returned)
  hasActiveShipment(orderId: string): boolean {
    const shipments = shipmentRepo.getByOrderId(orderId)
    return shipments.some(s => !['cancelled', 'delivered', 'returned'].includes(s.status))
  },

  // 缂佺喕顓?
  getStats(): { total: number; inTransit: number; delivered: number; pending: number; cancelled: number } {
    const db = getDb()
    const total = (db.prepare('SELECT COUNT(*) as c FROM shipments').get() as any).c
    const inTransit = (db.prepare("SELECT COUNT(*) as c FROM shipments WHERE status IN ('picked_up','in_transit','export_customs','international','import_customs','at_local_facility','out_for_delivery')").get() as any).c
    const delivered = (db.prepare("SELECT COUNT(*) as c FROM shipments WHERE status = 'delivered'").get() as any).c
    const pending = (db.prepare("SELECT COUNT(*) as c FROM shipments WHERE status = 'pending'").get() as any).c
    const cancelled = (db.prepare("SELECT COUNT(*) as c FROM shipments WHERE status = 'cancelled'").get() as any).c
    return { total, inTransit, delivered, pending, cancelled }
  },
}

// 閸掓繂顫愰崠鏍ㄦ殶閹诡喖绨?
initDatabase()
