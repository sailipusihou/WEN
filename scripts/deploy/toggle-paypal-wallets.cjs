#!/usr/bin/env node
/**
 * 开关 Apple Pay / Google Pay 结算按钮。
 *
 * 用法（服务器上从 /var/www/lowflame 运行）:
 *   NODE_PATH=/var/www/lowflame/node_modules node /root/toggle-paypal-wallets.cjs status
 *   NODE_PATH=/var/www/lowflame/node_modules node /root/toggle-paypal-wallets.cjs on
 *   NODE_PATH=/var/www/lowflame/node_modules node /root/toggle-paypal-wallets.cjs off
 *   NODE_PATH=/var/www/lowflame/node_modules node /root/toggle-paypal-wallets.cjs google-only
 *   NODE_PATH=/var/www/lowflame/node_modules node /root/toggle-paypal-wallets.cjs apple-only
 *
 * 开关含义：
 *   paypalWalletsEnabled  总开关，false 时结算页完全不出现钱包按钮（默认）
 *   paypalApplePayEnabled 单独控制 Apple Pay
 *   paypalGooglePayEnabled 单独控制 Google Pay
 *
 * 打开前请确认对应钱包在 PayPal 后台确实已开通，否则前端探测到不可用也不会渲染，
 * 表现为「开关开了但按钮不出来」。
 */
const Database = require('better-sqlite3')
const path = require('path')

const db = new Database(path.join(process.cwd(), 'data', 'site.db'))
const KEY = 'site_settings'

function read() {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(KEY)
  if (!row) throw new Error("settings 表缺少 key='site_settings'")
  return JSON.parse(row.value)
}
function write(o) {
  db.prepare("UPDATE settings SET value = ?, updatedAt = datetime('now') WHERE key = ?").run(JSON.stringify(o), KEY)
}

const cmd = process.argv[2] || 'status'
const cfg = read()

const show = (c) => {
  console.log('paypalWalletsEnabled   =', c.paypalWalletsEnabled === true)
  console.log('paypalApplePayEnabled  =', c.paypalApplePayEnabled !== false)
  console.log('paypalGooglePayEnabled =', c.paypalGooglePayEnabled !== false)
}

if (cmd === 'status') { show(cfg); process.exit(0) }

if (cmd === 'on') { cfg.paypalWalletsEnabled = true; cfg.paypalApplePayEnabled = true; cfg.paypalGooglePayEnabled = true }
else if (cmd === 'off') { cfg.paypalWalletsEnabled = false }
else if (cmd === 'google-only') { cfg.paypalWalletsEnabled = true; cfg.paypalGooglePayEnabled = true; cfg.paypalApplePayEnabled = false }
else if (cmd === 'apple-only') { cfg.paypalWalletsEnabled = true; cfg.paypalApplePayEnabled = true; cfg.paypalGooglePayEnabled = false }
else { console.error('未知命令:', cmd); process.exit(1) }

write(cfg)
console.log('已更新：')
show(cfg)
console.log('\n记得重启服务让设置缓存失效： pm2 restart lowflame')
