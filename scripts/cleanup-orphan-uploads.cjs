#!/usr/bin/env node
/**
 * public/uploads 孤儿文件清理 (默认只报告, 加 --delete 才真正删除)
 *
 * 背景: 长期使用 AI 生成 / 后台上传, public/uploads 里堆了大量已经不再被任何
 *       数据引用的文件 (约 105MB)。这些文件不会被自动回收, 只能离线清理。
 *
 * 判断「孤儿」的依据: 文件 basename 在以下任何位置都找不到引用
 *   1) SQLite data/site.db 中所有 TEXT 列的值 (含 -wal 原始字节兜底)
 *   2) data/ 目录下所有 JSON 文件
 *   3) 项目源码 / pages 里出现的字符串 (frontend-content 等可能硬编码)
 *
 * 安全策略 (宁可漏删, 不可错删):
 *   - 24 小时内的新文件一律不删 (可能刚上传、数据还没落库)
 *   - 任何命中引用的文件一律不删
 *   - 只有显式传 --delete 才会删除
 *
 * 用法 (在服务器 /var/www/lowflame 下执行):
 *   node scripts/cleanup-orphan-uploads.cjs            # 只报告
 *   node scripts/cleanup-orphan-uploads.cjs --delete   # 执行删除
 */
const fs = require('fs')
const path = require('path')

const ROOT = process.cwd()
const UPLOAD_DIR = path.join(ROOT, 'public', 'uploads')
const DATA_DIR = path.join(ROOT, 'data')
const DB_FILE = path.join(DATA_DIR, 'site.db')
const DELETE = process.argv.includes('--delete')
const MIN_AGE_MS = 24 * 60 * 60 * 1000

function log(...a) { console.log(...a) }

function buildPhrase() {
  const parts = []

  // ---- 1. SQLite: 所有表的 TEXT 列 ----
  let tableCount = 0
  try {
    const Database = require('better-sqlite3')
    const db = new Database(DB_FILE, { readonly: true })
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all()
    for (const t of tables) {
      if (!t.name || t.name.startsWith('sqlite_')) continue
      let cols
      try {
        cols = db.prepare(`PRAGMA table_info(${JSON.stringify(t.name)})`).all()
      } catch { continue }
      const textCols = cols.filter(c => /TEXT|BLOB|VARCHAR|CHAR|CLOB/i.test(c.type || '')).map(c => c.name)
      if (!textCols.length) continue
      try {
        const rows = db.prepare(`SELECT ${textCols.map(c => `"${c}"`).join(',')} FROM "${t.name}"`).iterate()
        const first = textCols.join(' ')
        parts.push(first)
        for (const row of rows) {
          for (const c of textCols) {
            const v = row[c]
            if (typeof v === 'string' && v) parts.push(v)
          }
        }
        tableCount++
      } catch { /* ignore table */ }
    }
    db.close()
    log(`[refs] SQLite 已扫描 ${tableCount} 张表`)
  } catch (e) {
    log('[refs] SQLite 读取失败 (将依赖 JSON/源码引用):', e.message)
  }

  // ---- 1b. WAL 原始字节兜底 (刚写入还没 checkpoint 的数据) ----
  for (const f of ['site.db-wal', 'site.db-shm']) {
    const p = path.join(DATA_DIR, f)
    if (fs.existsSync(p)) {
      try { parts.push(fs.readFileSync(p).toString('latin1')) } catch {}
    }
  }

  // ---- 2. data/ 下的 JSON ----
  function walk(dir, depth = 0) {
    if (depth > 4) return
    let entries = []
    try { entries = fs.readdirSync(dir, { withFileTypes: true }) } catch { return }
    for (const e of entries) {
      const p = path.join(dir, e.name)
      if (e.isDirectory()) walk(p, depth + 1)
      else if (/\.(json|txt|md|csv)$/i.test(e.name)) {
        try { parts.push(fs.readFileSync(p, 'utf-8')) } catch {}
      }
    }
  }
  walk(DATA_DIR)
  log(`[refs] 已读取 data/ 下 JSON/文本文件`)

  // ---- 3. 源码 / 配置里的硬编码引用 ----
  function walkCode(dir, depth = 0) {
    if (depth > 3) return
    let entries = []
    try { entries = fs.readdirSync(dir, { withFileTypes: true }) } catch { return }
    for (const e of entries) {
      if (['node_modules', '.next', '.git', 'uploads', 'images'].includes(e.name)) continue
      const p = path.join(dir, e.name)
      if (e.isDirectory()) walkCode(p, depth + 1)
      else if (/\.(ts|tsx|js|jsx|cjs|mjs|json|css|sql)$/i.test(e.name)) {
        try { parts.push(fs.readFileSync(p, 'utf-8')) } catch {}
      }
    }
  }
  walkCode(ROOT)
  log(`[refs] 已读取源码/配置引用`)

  return parts.join('\n')
}

function main() {
  if (!fs.existsSync(UPLOAD_DIR)) {
    log('上传目录不存在:', UPLOAD_DIR)
    return
  }
  const corpus = buildPhrase()

  // 递归收集 (包含 uploads/ai 等子目录)
  const files = []
  ;(function walk(dir, rel) {
    let entries = []
    try { entries = fs.readdirSync(dir, { withFileTypes: true }) } catch { return }
    for (const e of entries) {
      const p = path.join(dir, e.name)
      const relPath = rel ? rel + '/' + e.name : e.name
      if (e.isDirectory()) { walk(p, relPath); continue }
      let st
      try { st = fs.statSync(p) } catch { continue }
      if (!st.isFile()) continue
      files.push({ name: relPath, size: st.size, mtime: st.mtimeMs, full: p })
    }
  })(UPLOAD_DIR, '')

  const now = Date.now()
  const orphans = []
  const kept = []
  const recent = []

  // 保守判定: 相对路径 (ai/xxx.png) 或纯文件名 (xxx.png) 任一被引用就保留,
  // 避免数据里只存了 basename 时误判为孤儿。
  const isReferenced = (f) => {
    const base = path.basename(f.name)
    return corpus.includes(f.name) || (base !== f.name && corpus.includes(base))
  }

  for (const f of files) {
    if (isReferenced(f)) { kept.push(f); continue }
    if (now - f.mtime < MIN_AGE_MS) { recent.push(f); continue }
    orphans.push(f)
  }

  const sum = arr => arr.reduce((s, f) => s + f.size, 0)
  const mb = n => (n / 1024 / 1024).toFixed(1) + ' MB'

  log('')
  log('==================== 扫描结果 ====================')
  log(`上传目录      : ${UPLOAD_DIR}`)
  log(`文件总数      : ${files.length}  (${mb(sum(files))})`)
  log(`被引用 (保留) : ${kept.length}  (${mb(sum(kept))})`)
  log(`24h 内新文件  : ${recent.length}  (${mb(sum(recent))}) — 跳过`)
  log(`孤儿文件      : ${orphans.length}  (${mb(sum(orphans))}) — 可清理`)
  log('==================================================')

  if (orphans.length) {
    log('')
    log('孤儿文件 (前 40 个):')
    orphans.slice(0, 40).forEach(f => log(`  ${f.name}  ${(f.size / 1024).toFixed(0)} KB  ${new Date(f.mtime).toISOString().slice(0, 10)}`))
    if (orphans.length > 40) log(`  ... 其余 ${orphans.length - 40} 个`)
  }

  if (!DELETE) {
    log('')
    log('这是「只报告」模式, 没有删除任何文件。确认无误后执行:')
    log('  node scripts/cleanup-orphan-uploads.cjs --delete')
    return
  }

  let deleted = 0
  let freed = 0
  for (const f of orphans) {
    try {
      fs.unlinkSync(f.full)
      deleted++
      freed += f.size
    } catch (e) {
      log('删除失败:', f.name, e.message)
    }
  }
  log('')
  log(`已删除 ${deleted} 个文件, 释放 ${mb(freed)}`)
}

main()
