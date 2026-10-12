import { NextRequest, NextResponse } from 'next/server'
import { getRepository } from '@/lib/repository'
import { requirePermission } from '@/lib/auth'
import { validateSlug, validateString, sanitizeString } from '@/lib/validation'

export async function GET() {
  const repo = getRepository()
  return NextResponse.json(repo.categories.list())
}

export async function POST(req: NextRequest) {
  const auth = requirePermission(req, 'categories_manage')
  if ('error' in auth) return auth.error
  try {
    const body = await req.json()
    if (!body.slug || !body.slug.trim()) {
      return NextResponse.json({ error: 'Slug is required' }, { status: 400 })
    }
    if (!validateSlug(body.slug)) {
      return NextResponse.json({ error: 'Slug must be lowercase letters, numbers, and hyphens only' }, { status: 400 })
    }
    if (body.name && !validateString(body.name, 100)) {
      return NextResponse.json({ error: 'Name too long' }, { status: 400 })
    }
    if (body.description && !validateString(body.description, 500)) {
      return NextResponse.json({ error: 'Description too long' }, { status: 400 })
    }
    // 清理输入
    //
    // ⚠️ 必须把 undefined 的键**删掉**，不能留着。仓库那边的 update 是
    //    `{ ...existing, ...updates }`，键存在但值为 undefined 会把原有值覆盖成空 ——
    //    表现为「只改一张封面图，结果分类描述被清空」（2026-10-12 踩到）。
    const cleanBody: any = { ...body }
    for (const k of ['name', 'nameEn', 'description', 'descriptionEn'] as const) {
      if (cleanBody[k] !== undefined && cleanBody[k] !== null) cleanBody[k] = sanitizeString(cleanBody[k])
    }
    for (const k of Object.keys(cleanBody)) {
      if (cleanBody[k] === undefined) delete cleanBody[k]
    }
    const repo = getRepository()
    repo.categories.add({ ...cleanBody, slug: body.slug })
    return NextResponse.json(repo.categories.list(), { status: 201 })
  } catch (e: any) {
    if (e.message === 'Category slug already exists') {
      return NextResponse.json({ error: 'Slug already exists' }, { status: 409 })
    }
    return NextResponse.json({ error: e.message || 'Failed to create category' }, { status: 400 })
  }
}

export async function PUT(req: NextRequest) {
  const auth = requirePermission(req, 'categories_manage')
  if ('error' in auth) return auth.error
  try {
    const body = await req.json()
    if (!body.slug || !body.slug.trim()) {
      return NextResponse.json({ error: 'Slug is required' }, { status: 400 })
    }
    if (!validateSlug(body.slug)) {
      return NextResponse.json({ error: 'Invalid slug format' }, { status: 400 })
    }
    if (body.name && !validateString(body.name, 100)) {
      return NextResponse.json({ error: 'Name too long' }, { status: 400 })
    }
    // 清理输入
    //
    // ⚠️ 必须把 undefined 的键**删掉**，不能留着。仓库那边的 update 是
    //    `{ ...existing, ...updates }`，键存在但值为 undefined 会把原有值覆盖成空 ——
    //    表现为「只改一张封面图，结果分类描述被清空」（2026-10-12 踩到）。
    const cleanBody: any = { ...body }
    for (const k of ['name', 'nameEn', 'description', 'descriptionEn'] as const) {
      if (cleanBody[k] !== undefined && cleanBody[k] !== null) cleanBody[k] = sanitizeString(cleanBody[k])
    }
    for (const k of Object.keys(cleanBody)) {
      if (cleanBody[k] === undefined) delete cleanBody[k]
    }
    const repo = getRepository()
    repo.categories.update(body.slug, cleanBody)
    return NextResponse.json(repo.categories.list())
  } catch (e: any) {
    if (e.message === 'Not found') {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }
    return NextResponse.json({ error: e.message || 'Failed to update category' }, { status: 400 })
  }
}
