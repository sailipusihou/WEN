/**
 * Hero 亮度 / 色温维护（生产 DB: data/site.db，settings 表 key = 'site_settings'）。
 *
 * 在服务器上从 /var/www/lowflame 运行：
 *   NODE_PATH=/var/www/lowflame/node_modules node /root/hero-native.cjs show
 *   NODE_PATH=/var/www/lowflame/node_modules node /root/hero-native.cjs keys
 *   NODE_PATH=/var/www/lowflame/node_modules node /root/hero-native.cjs native   # 100 / 50 原生
 */
const Database = require('better-sqlite3')
const path = require('path')

const root = process.cwd()
const dbPath = process.env.DB_PATH || path.join(root, 'data', 'site.db')
const cmd = process.argv[2] || 'show'

const db = new Database(dbPath)
const KEY = 'site_settings'

function read() {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(KEY)
  if (!row) throw new Error("settings 表缺少 key='site_settings'")
  return JSON.parse(row.value)
}

function write(obj) {
  db.prepare("UPDATE settings SET value = ?, updatedAt = datetime('now') WHERE key = ?").run(JSON.stringify(obj), KEY)
}

const cfg = read()
const hero = cfg.hero || cfg.frontendContent && cfg.frontendContent.hero || {}

if (cmd === 'keys') {
  console.log('全量 hero 字段:')
  for (const k of Object.keys(hero)) {
    const v = hero[k]
    console.log('  ', k, '=', typeof v === 'object' ? JSON.stringify(v).slice(0, 160) : v)
  }
  process.exit(0)
}

if (cmd === 'show') {
  console.log('heroBrightness =', hero.heroBrightness)
  console.log('heroTemperature =', hero.heroTemperature)
  console.log('overlayOpacity  =', hero.overlayOpacity)
  console.log('videoEnabled    =', hero.videoEnabled)
  process.exit(0)
}

if (cmd === 'native') {
  // hero 直接挂在 cfg 下；若历史上被包在 frontendContent 里也一并处理
  const target = cfg.hero ? cfg.hero : (cfg.frontendContent.hero)
  target.heroBrightness = 100
  target.heroTemperature = 50
  write(cfg)
  console.log('已写回 heroBrightness=100 heroTemperature=50')
  process.exit(0)
}

console.error('未知命令:', cmd)
process.exit(1)
