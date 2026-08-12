// 物流商配置管理 API
// GET  - 获取所有物流商配置
// POST - 保存物流商配置
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { getCarrierConfigs, saveCarrierConfig, getCarrierConfig } from '@/lib/shipping-config'

export async function GET(req: NextRequest) {
  try {
    const auth = requireAdmin(req)
    if ('error' in auth) return auth.error

    const configs = getCarrierConfigs()
    // 返回时隐藏敏感凭证值 (只显示前几位)
    const masked = configs.map(c => ({
      ...c,
      credentials: Object.fromEntries(
        Object.entries(c.credentials).map(([k, v]) => [
          k,
          v ? v.slice(0, 4) + '****' + v.slice(-4) : ''
        ])
      ),
    }))

    return NextResponse.json(masked)
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to fetch configs' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = requireAdmin(req)
    if ('error' in auth) return auth.error

    const body = await req.json()

    if (!body.code) {
      return NextResponse.json({ error: 'Carrier code is required' }, { status: 400 })
    }

    // 读取现有配置
    const existing = getCarrierConfig(body.code)
    if (!existing) {
      return NextResponse.json({ error: 'Unknown carrier code' }, { status: 400 })
    }

    // 合并更新
    const updates: any = {}

    if (body.enabled !== undefined) updates.enabled = body.enabled
    if (body.mode !== undefined) updates.mode = body.mode
    if (body.syncEnabled !== undefined) updates.syncEnabled = body.syncEnabled
    if (body.syncInterval !== undefined) updates.syncInterval = body.syncInterval

    // 凭证更新: 如果传入的值包含 **** 说明是掩码值, 不更新
    if (body.credentials) {
      const newCreds: Record<string, string> = { ...existing.credentials }
      for (const [key, val] of Object.entries(body.credentials)) {
        if (typeof val === 'string' && !val.includes('****')) {
          newCreds[key] = val
        }
      }
      updates.credentials = newCreds
    }

    const saved = saveCarrierConfig({ ...existing, ...updates })
    return NextResponse.json({ success: true, config: saved })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to save config' }, { status: 500 })
  }
}
