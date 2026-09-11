import fs from 'fs'
import path from 'path'

// 评论历史持久化存储（data/comment-history.json）
// 结构: { ig: [...], x: [...], fb: [...], pt: [...] }
// 评论是独立于帖子的记录：帖子删除后评论历史仍然保留

const FILE = path.join(process.cwd(), 'data', 'comment-history.json')

export interface CommentHistory {
  ig: any[]
  x: any[]
  fb: any[]
  pt: any[]
}

function ensureFile() {
  const dir = path.dirname(FILE)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  if (!fs.existsSync(FILE)) {
    fs.writeFileSync(FILE, JSON.stringify({ ig: [], x: [], fb: [], pt: [], updatedAt: '' }, null, 2), 'utf8')
  }
}

export function readCommentHistory(): CommentHistory {
  try {
    ensureFile()
    const raw = fs.readFileSync(FILE, 'utf8').replace(/^\uFEFF/, '').trim()
    if (!raw) return { ig: [], x: [], fb: [], pt: [] }
    const data = JSON.parse(raw)
    return {
      ig: data.ig || [],
      x: data.x || [],
      fb: data.fb || [],
      pt: data.pt || [],
    }
  } catch {
    return { ig: [], x: [], fb: [], pt: [] }
  }
}

export function saveCommentHistory(history: CommentHistory) {
  try {
    ensureFile()
    fs.writeFileSync(FILE, JSON.stringify({
      ig: history.ig || [],
      x: history.x || [],
      fb: history.fb || [],
      pt: history.pt || [],
      updatedAt: new Date().toISOString(),
    }, null, 2), 'utf8')
  } catch (e) {
    console.error('[Comment History] save failed:', e)
  }
}

export function deleteComment(platform: 'ig' | 'x' | 'fb' | 'pt', commentId: string) {
  const history = readCommentHistory()
  const key = platform as keyof CommentHistory
  const before = (history[key] || []).length
  history[key] = (history[key] || []).filter((c: any) => c.id !== commentId && c._id !== commentId)
  saveCommentHistory(history)
  return before - history[key].length
}

export function clearCommentHistory() {
  saveCommentHistory({ ig: [], x: [], fb: [], pt: [] })
}
