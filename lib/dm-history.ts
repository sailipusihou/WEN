import fs from 'fs'
import path from 'path'

// 私信历史持久化存储（data/dm-history.json）
// 结构: { ig: [...], x: [...], fb: [...] }
// 每次成功抓取后合并保存，页面加载时先读历史立即显示，再拉取最新

const FILE = path.join(process.cwd(), 'data', 'dm-history.json')

export interface DmHistory {
  ig: any[]
  x: any[]
  fb: any[]
}

function ensureFile() {
  const dir = path.dirname(FILE)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  if (!fs.existsSync(FILE)) {
    fs.writeFileSync(FILE, JSON.stringify({ ig: [], x: [], fb: [], updatedAt: '' }, null, 2), 'utf8')
  }
}

export function readDmHistory(): DmHistory {
  try {
    ensureFile()
    const raw = fs.readFileSync(FILE, 'utf8').replace(/^\uFEFF/, '').trim()
    if (!raw) return { ig: [], x: [], fb: [] }
    const data = JSON.parse(raw)
    return {
      ig: data.ig || [],
      x: data.x || [],
      fb: data.fb || [],
    }
  } catch {
    return { ig: [], x: [], fb: [] }
  }
}

export function saveDmHistory(history: DmHistory) {
  try {
    ensureFile()
    fs.writeFileSync(FILE, JSON.stringify({
      ig: history.ig || [],
      x: history.x || [],
      fb: history.fb || [],
      updatedAt: new Date().toISOString(),
    }, null, 2), 'utf8')
  } catch (e) {
    console.error('[DM History] save failed:', e)
  }
}

// 删除某个平台的某个会话（按 _id 或 id）
export function deleteDmConversation(platform: 'ig' | 'x' | 'fb', conversationId: string) {
  const history = readDmHistory()
  const key = platform as keyof DmHistory
  const before = (history[key] || []).length
  history[key] = (history[key] || []).filter((c: any) => c._id !== conversationId && c.id !== conversationId)
  saveDmHistory(history)
  return before - history[key].length
}

// 删除全部历史
export function clearDmHistory() {
  saveDmHistory({ ig: [], x: [], fb: [] })
}
