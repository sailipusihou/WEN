import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

let dbInstance: Database.Database | null = null

// 数据库文件路径: 项目根目录/data/site.db
const DATA_DIR = path.join(process.cwd(), 'data')
const DB_PATH = path.join(DATA_DIR, 'site.db')

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }
}

export function getDb(): Database.Database {
  if (dbInstance) return dbInstance
  ensureDataDir()
  dbInstance = new Database(DB_PATH)
  // 启用 WAL 模式提升并发性能
  dbInstance.pragma('journal_mode = WAL')
  dbInstance.pragma('foreign_keys = ON')
  return dbInstance
}

// 关闭数据库连接 (用于开发环境热重载)
export function closeDb() {
  if (dbInstance) {
    dbInstance.close()
    dbInstance = null
  }
}

// 初始化数据库表结构
export function initDatabase() {
  const db = getDb()

  db.exec(`
    -- 分类表
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      nameEn TEXT,
      slug TEXT UNIQUE NOT NULL,
      description TEXT,
      descriptionEn TEXT,
      image TEXT,
      icon TEXT,
      iconType TEXT DEFAULT 'emoji',
      sortOrder INTEGER DEFAULT 0,
      productCount INTEGER DEFAULT 0,
      parentId TEXT,
      active INTEGER DEFAULT 1,
      createdAt TEXT DEFAULT (datetime('now')),
      updatedAt TEXT DEFAULT (datetime('now'))
    );

    -- 供货商表
    CREATE TABLE IF NOT EXISTS suppliers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      contact TEXT,
      phone TEXT,
      email TEXT,
      address TEXT,
      region TEXT,
      status TEXT DEFAULT 'active',
      notes TEXT,
      createdAt TEXT DEFAULT (datetime('now')),
      updatedAt TEXT DEFAULT (datetime('now'))
    );

    -- 商品表
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE,
      name TEXT NOT NULL,
      nameEn TEXT,
      subtitle TEXT,
      subtitleEn TEXT,
      description TEXT,
      descriptionEn TEXT,
      story TEXT,
      storyEn TEXT,
      price REAL NOT NULL DEFAULT 0,
      originalPrice REAL,
      costPrice REAL,
      stock INTEGER DEFAULT 0,
      supplierId TEXT,
      category TEXT,
      image TEXT,
      craft TEXT,
      craftEn TEXT,
      material TEXT,
      origin TEXT,
      rating REAL DEFAULT 0,
      reviewCount INTEGER DEFAULT 0,
      featured INTEGER DEFAULT 0,
      active INTEGER DEFAULT 1,
      sortOrder INTEGER DEFAULT 0,
      createdAt TEXT DEFAULT (datetime('now')),
      updatedAt TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (supplierId) REFERENCES suppliers(id) ON DELETE SET NULL
    );

    -- 商品标签 (多对多)
    CREATE TABLE IF NOT EXISTS product_tags (
      productId TEXT NOT NULL,
      tag TEXT NOT NULL,
      lang TEXT NOT NULL DEFAULT 'zh',
      sortOrder INTEGER DEFAULT 0,
      PRIMARY KEY (productId, tag, lang),
      FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE
    );

    -- 商品详情图
    CREATE TABLE IF NOT EXISTS product_images (
      productId TEXT NOT NULL,
      imageUrl TEXT NOT NULL,
      sortOrder INTEGER DEFAULT 0,
      PRIMARY KEY (productId, imageUrl),
      FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE
    );

    -- 用户表
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      passwordHash TEXT NOT NULL,
      salt TEXT NOT NULL,
      firstName TEXT,
      lastName TEXT,
      phone TEXT,
      avatar TEXT,
      dob TEXT,
      gender TEXT,
      bio TEXT,
      preferredCurrency TEXT DEFAULT 'USD',
      role TEXT DEFAULT 'customer',
      token TEXT,
      tokenExpiresAt TEXT,
      createdAt TEXT DEFAULT (datetime('now')),
      updatedAt TEXT DEFAULT (datetime('now'))
    );

    -- 用户地址
    CREATE TABLE IF NOT EXISTS user_addresses (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      label TEXT,
      firstName TEXT,
      lastName TEXT,
      phone TEXT,
      address TEXT,
      city TEXT,
      state TEXT,
      zip TEXT,
      country TEXT DEFAULT 'United States',
      isDefault INTEGER DEFAULT 0,
      createdAt TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    );

    -- 心愿单
    CREATE TABLE IF NOT EXISTS wishlist (
      userId TEXT NOT NULL,
      productId TEXT NOT NULL,
      createdAt TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (userId, productId),
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE
    );

    -- 订单表
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      orderNo TEXT UNIQUE NOT NULL,
      userId TEXT,
      status TEXT DEFAULT 'pending',
      totalAmount REAL NOT NULL DEFAULT 0,
      currency TEXT DEFAULT 'USD',
      subtotal REAL DEFAULT 0,
      shipping REAL DEFAULT 0,
      tax REAL DEFAULT 0,
      discount REAL DEFAULT 0,
      couponCode TEXT,
      customerName TEXT,
      customerEmail TEXT,
      customerPhone TEXT,
      shippingName TEXT,
      shippingAddress TEXT,
      shippingCity TEXT,
      shippingState TEXT,
      shippingZip TEXT,
      shippingCountry TEXT,
      billingName TEXT,
      billingAddress TEXT,
      billingCity TEXT,
      billingState TEXT,
      billingZip TEXT,
      billingCountry TEXT,
      shippingMethod TEXT,
      trackingNumber TEXT,
      carrier TEXT,
      paymentMethod TEXT,
      paymentStatus TEXT DEFAULT 'unpaid',
      referralCode TEXT,
      referralId TEXT,
      referralVisitorId TEXT,
      referredByStaffId TEXT,
      referredByStaffName TEXT,
      attributionClickId TEXT,
      attributionModel TEXT,
      attributionTouchpoints INTEGER,
      attributionLookbackDays INTEGER,
      attributionMatchedBy TEXT,
      attributionFallbackUsed INTEGER DEFAULT 0,
      notes TEXT,
      createdAt TEXT DEFAULT (datetime('now')),
      updatedAt TEXT DEFAULT (datetime('now'))
    );

    -- 订单商品
    CREATE TABLE IF NOT EXISTS order_items (
      id TEXT PRIMARY KEY,
      orderId TEXT NOT NULL,
      productId TEXT,
      name TEXT,
      nameEn TEXT,
      image TEXT,
      price REAL DEFAULT 0,
      quantity INTEGER DEFAULT 1,
      subtotal REAL DEFAULT 0,
      category TEXT,
      FOREIGN KEY (orderId) REFERENCES orders(id) ON DELETE CASCADE
    );

    -- 订单状态历史
    CREATE TABLE IF NOT EXISTS order_status_history (
      id TEXT PRIMARY KEY,
      orderId TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      note TEXT,
      timestamp TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (orderId) REFERENCES orders(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_order_status_history_orderId ON order_status_history(orderId);

    -- 评论表
    CREATE TABLE IF NOT EXISTS reviews (
      id TEXT PRIMARY KEY,
      productId TEXT NOT NULL,
      author TEXT DEFAULT 'Anonymous',
      avatar TEXT,
      rating INTEGER NOT NULL DEFAULT 5,
      date TEXT,
      content TEXT,
      location TEXT,
      approved INTEGER DEFAULT 0,
      createdAt TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE
    );

    -- 消息/联系表单
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      name TEXT,
      email TEXT,
      phone TEXT,
      subject TEXT,
      message TEXT,
      status TEXT DEFAULT 'unread',
      createdAt TEXT DEFAULT (datetime('now')),
      source TEXT,
      attachments TEXT,
      adminReply TEXT,
      adminAttachments TEXT,
      adminName TEXT,
      adminAvatar TEXT,
      repliedAt TEXT,
      read INTEGER DEFAULT 0,
      replied INTEGER DEFAULT 0,
      senderType TEXT DEFAULT 'customer',
      chatType TEXT,
      fromStaffId TEXT,
      toStaffId TEXT,
      fromAvatar TEXT,
      fromName TEXT,
      toAvatar TEXT,
      toName TEXT,
      orderRef TEXT
    );

    -- 工作日志
    CREATE TABLE IF NOT EXISTS work_logs (
      id TEXT PRIMARY KEY,
      timestamp TEXT DEFAULT (datetime('now')),
      operatorId TEXT,
      operatorName TEXT,
      operatorRole TEXT,
      action TEXT,
      details TEXT,
      orderId TEXT,
      productId TEXT,
      category TEXT
    );

    -- Newsletter 订阅
    CREATE TABLE IF NOT EXISTS newsletter_subscribers (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      status TEXT DEFAULT 'active',
      createdAt TEXT DEFAULT (datetime('now'))
    );

    -- 网站设置 (单例, key-value)
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT,
      updatedAt TEXT DEFAULT (datetime('now'))
    );

    -- 员工表
    CREATE TABLE IF NOT EXISTS staff (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      passwordHash TEXT NOT NULL,
      salt TEXT NOT NULL,
      name TEXT,
      role TEXT DEFAULT 'editor',
      avatar TEXT,
      status TEXT DEFAULT 'active',
      createdAt TEXT DEFAULT (datetime('now')),
      updatedAt TEXT DEFAULT (datetime('now'))
    );

    -- Web Vitals 监控数据
    CREATE TABLE IF NOT EXISTS web_vitals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      value REAL,
      rating TEXT,
      page TEXT,
      navigationType TEXT,
      createdAt TEXT DEFAULT (datetime('now'))
    );

    -- 浏览记录表
    CREATE TABLE IF NOT EXISTS browsing_history (
      id TEXT PRIMARY KEY,
      sessionId TEXT NOT NULL,
      userId TEXT,
      email TEXT,
      visitorId TEXT NOT NULL,
      productId TEXT NOT NULL,
      productName TEXT,
      productImage TEXT,
      productPrice REAL,
      productCode TEXT,
      productCategory TEXT,
      pageType TEXT DEFAULT 'product',
      duration INTEGER DEFAULT 0,
      ip TEXT,
      timestamp TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE
    );

    -- 物流发货记录表
    CREATE TABLE IF NOT EXISTS shipments (
      id TEXT PRIMARY KEY,
      orderId TEXT NOT NULL,
      orderNo TEXT,
      shipmentNo TEXT NOT NULL,
      carrierCode TEXT NOT NULL,
      carrierName TEXT,
      trackingNumber TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      weight REAL,
      shippingCost REAL,
      shippedAt TEXT,
      estimatedDelivery TEXT,
      deliveredAt TEXT,
      events TEXT,
      notes TEXT,
      createdBy TEXT,
      createdAt TEXT DEFAULT (datetime('now')),
      updatedAt TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (orderId) REFERENCES orders(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_shipments_orderId ON shipments(orderId);
    CREATE INDEX IF NOT EXISTS idx_shipments_trackingNumber ON shipments(trackingNumber);
    CREATE INDEX IF NOT EXISTS idx_shipments_status ON shipments(status);

    -- 客户记录表（客户留样）
    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      firstName TEXT,
      lastName TEXT,
      phone TEXT,
      avatar TEXT,
      rating INTEGER DEFAULT 0,
      tier TEXT DEFAULT 'standard',
      notes TEXT,
      preferences TEXT,
      tags TEXT,
      totalOrders INTEGER DEFAULT 0,
      totalSpent REAL DEFAULT 0,
      lastOrderAt TEXT,
      createdAt TEXT DEFAULT (datetime('now')),
      updatedAt TEXT DEFAULT (datetime('now'))
    );

    -- 创建索引
    CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
    CREATE INDEX IF NOT EXISTS idx_products_active ON products(active);
    CREATE INDEX IF NOT EXISTS idx_products_featured ON products(featured);
    CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
    CREATE INDEX IF NOT EXISTS idx_orders_userId ON orders(userId);
    CREATE INDEX IF NOT EXISTS idx_reviews_productId ON reviews(productId);
    CREATE INDEX IF NOT EXISTS idx_wishlist_userId ON wishlist(userId);
    CREATE INDEX IF NOT EXISTS idx_order_items_orderId ON order_items(orderId);
    CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status);
    CREATE INDEX IF NOT EXISTS idx_browsing_sessionId ON browsing_history(sessionId);
    CREATE INDEX IF NOT EXISTS idx_browsing_email ON browsing_history(email);
    CREATE INDEX IF NOT EXISTS idx_browsing_productId ON browsing_history(productId);
    CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
    CREATE INDEX IF NOT EXISTS idx_customers_tier ON customers(tier);
  `)

  // 迁移: 给 orders 表添加缺失的列 (兼容旧数据库)
  const orderColumns = db.prepare("PRAGMA table_info(orders)").all() as any[]
  const orderColNames = new Set(orderColumns.map(c => c.name))
  const addOrderCol = (col: string, def: string) => {
    if (!orderColNames.has(col)) {
      try { db.exec(`ALTER TABLE orders ADD COLUMN ${col} ${def}`) } catch {}
    }
  }
  addOrderCol('assignedTo', 'TEXT')
  addOrderCol('assignedToName', 'TEXT')
  addOrderCol('userEmail', 'TEXT')
  addOrderCol('estimatedDeliveryDays', 'INTEGER DEFAULT 0')
  addOrderCol('trackingUrl', 'TEXT')
  addOrderCol('estimatedDelivery', 'TEXT')
  addOrderCol('assignedToAvatar', 'TEXT')
  addOrderCol('referralCode', 'TEXT')
  addOrderCol('referralId', 'TEXT')
  addOrderCol('referralVisitorId', 'TEXT')
  addOrderCol('referredByStaffId', 'TEXT')
  addOrderCol('referredByStaffName', 'TEXT')
  addOrderCol('attributionClickId', 'TEXT')
  addOrderCol('attributionModel', 'TEXT')
  addOrderCol('attributionTouchpoints', 'INTEGER')
  addOrderCol('attributionLookbackDays', 'INTEGER')
  addOrderCol('attributionMatchedBy', 'TEXT')
  addOrderCol('attributionFallbackUsed', 'INTEGER DEFAULT 0')

  // 迁移: 给 messages 表添加缺失的列 (兼容旧数据库)
  const msgColumns = db.prepare("PRAGMA table_info(messages)").all() as any[]
  const msgColNames = new Set(msgColumns.map(c => c.name))
  const addMsgCol = (col: string, def: string) => {
    if (!msgColNames.has(col)) {
      try { db.exec(`ALTER TABLE messages ADD COLUMN ${col} ${def}`) } catch {}
    }
  }
  addMsgCol('source', 'TEXT')
  addMsgCol('attachments', 'TEXT')
  addMsgCol('adminReply', 'TEXT')
  addMsgCol('adminAttachments', 'TEXT')
  addMsgCol('adminName', 'TEXT')
  addMsgCol('adminAvatar', 'TEXT')
  addMsgCol('repliedAt', 'TEXT')
  addMsgCol('read', 'INTEGER DEFAULT 0')
  addMsgCol('replied', 'INTEGER DEFAULT 0')
  addMsgCol('senderType', "TEXT DEFAULT 'customer'")
  addMsgCol('adminRead', 'INTEGER DEFAULT 0')
  addMsgCol('avatar', 'TEXT')
  addMsgCol('chatType', 'TEXT')
  addMsgCol('fromStaffId', 'TEXT')
  addMsgCol('toStaffId', 'TEXT')
  addMsgCol('fromAvatar', 'TEXT')
  addMsgCol('fromName', 'TEXT')
  addMsgCol('toAvatar', 'TEXT')
  addMsgCol('toName', 'TEXT')
  addMsgCol('orderRef', 'TEXT')

  // 迁移: 给 reviews 表添加缺失的列（订单关联 + 审核/隐藏/删除状态）
  const reviewColumns = db.prepare("PRAGMA table_info(reviews)").all() as any[]
  const reviewColNames = new Set(reviewColumns.map(c => c.name))
  const addReviewCol = (col: string, def: string) => {
    if (!reviewColNames.has(col)) {
      try { db.exec(`ALTER TABLE reviews ADD COLUMN ${col} ${def}`) } catch {}
    }
  }
  addReviewCol('orderId', 'TEXT')
  addReviewCol('customerEmail', 'TEXT')
  addReviewCol('hidden', 'INTEGER DEFAULT 0')
  addReviewCol('deleted', 'INTEGER DEFAULT 0')
  addReviewCol('source', "TEXT DEFAULT 'customer'")

  // 迁移: 给 products 表添加缺失的列
  const productColumns = db.prepare("PRAGMA table_info(products)").all() as any[]
  const productColNames = new Set(productColumns.map(c => c.name))
  const addProductCol = (col: string, def: string) => {
    if (!productColNames.has(col)) {
      try { db.exec(`ALTER TABLE products ADD COLUMN ${col} ${def}`) } catch {}
    }
  }
  addProductCol('costPrice', 'REAL')
  addProductCol('stock', 'INTEGER DEFAULT 0')
  addProductCol('supplierId', 'TEXT')
  addProductCol('code', 'TEXT')
  addProductCol('video', 'TEXT')
  addProductCol('videoEnabled', 'INTEGER DEFAULT 0')

  // 迁移: 给 users 表添加优惠券字段
  const userColumns = db.prepare("PRAGMA table_info(users)").all() as any[]
  const userColNames = new Set(userColumns.map(c => c.name))
  if (!userColNames.has('coupons')) {
    try { db.exec('ALTER TABLE users ADD COLUMN coupons TEXT') } catch {}
  }

  // 迁移: 为已有商品自动生成规律性编码 (按分类前缀 + 4位序号, 如 CG-0001)
  // 仅对 code 为空或 NULL 的商品执行, 已有编码的不覆盖
  try {
    const { generateProductCode } = require('@/lib/db')
    const rowsMissingCode = db.prepare("SELECT id, category FROM products WHERE code IS NULL OR code = '' ORDER BY createdAt ASC").all() as any[]
    if (rowsMissingCode.length > 0) {
      const allCodes = new Set<string>(
        (db.prepare("SELECT code FROM products WHERE code IS NOT NULL AND code != ''").all() as any[])
          .map(r => r.code)
      )
      for (const row of rowsMissingCode) {
        const newCode = generateProductCode(row.category || '', allCodes)
        db.prepare("UPDATE products SET code = ? WHERE id = ?").run(newCode, row.id)
        allCodes.add(newCode)
      }
    }
  } catch {}

  // 迁移: 创建 suppliers 表（如果旧数据库没有）
  db.exec(`
    CREATE TABLE IF NOT EXISTS suppliers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      contact TEXT,
      phone TEXT,
      email TEXT,
      address TEXT,
      region TEXT,
      status TEXT DEFAULT 'active',
      notes TEXT,
      createdAt TEXT DEFAULT (datetime('now')),
      updatedAt TEXT DEFAULT (datetime('now'))
    )
  `)

  // 迁移: 给 browsing_history 表添加 ip 字段（兼容旧数据库）
  const bhColumns = db.prepare("PRAGMA table_info(browsing_history)").all() as any[]
  const bhColNames = new Set(bhColumns.map(c => c.name))
  if (!bhColNames.has('ip')) {
    try { db.exec('ALTER TABLE browsing_history ADD COLUMN ip TEXT') } catch {}
  }
  if (!bhColNames.has('productCode')) {
    try { db.exec('ALTER TABLE browsing_history ADD COLUMN productCode TEXT') } catch {}
  }

  // 清理: 删除浏览记录中的重复数据（同一 visitorId + productId 在 30 秒内的重复记录，保留最新一条）
  try {
    db.exec(`
      DELETE FROM browsing_history
      WHERE id NOT IN (
        SELECT id FROM (
          SELECT id,
            ROW_NUMBER() OVER (
              PARTITION BY visitorId, productId
              ORDER BY timestamp DESC
            ) AS rn
          FROM browsing_history
          WHERE EXISTS (
            SELECT 1 FROM browsing_history b2
            WHERE b2.visitorId = browsing_history.visitorId
              AND b2.productId = browsing_history.productId
              AND ABS(strftime('%s', b2.timestamp) - strftime('%s', browsing_history.timestamp)) < 30
          )
        ) WHERE rn = 1
      )
      AND EXISTS (
        SELECT 1 FROM browsing_history b3
        WHERE b3.visitorId = browsing_history.visitorId
          AND b3.productId = browsing_history.productId
          AND b3.id != browsing_history.id
          AND ABS(strftime('%s', b3.timestamp) - strftime('%s', browsing_history.timestamp)) < 30
      )
    `)
  } catch {}

  return db
}
