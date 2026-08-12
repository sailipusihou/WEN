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
    const cleanBody = {
      ...body,
      name: body.name ? sanitizeString(body.name) : body.name,
      nameEn: body.nameEn ? sanitizeString(body.nameEn) : body.nameEn,
      description: body.description ? sanitizeString(body.description) : body.description,
      descriptionEn: body.descriptionEn ? sanitizeString(body.descriptionEn) : body.descriptionEn,
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
    const cleanBody = {
      ...body,
      name: body.name ? sanitizeString(body.name) : body.name,
      nameEn: body.nameEn ? sanitizeString(body.nameEn) : body.nameEn,
      description: body.description ? sanitizeString(body.description) : body.description,
      descriptionEn: body.descriptionEn ? sanitizeString(body.descriptionEn) : body.descriptionEn,
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
