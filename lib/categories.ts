import fs from 'fs'
import path from 'path'
import { getAllProducts } from './db'
import { getCachedData, invalidateCache, CACHE_TTL } from '@/lib/cache'

export interface Category {
  slug: string; name: string; nameEn: string
  description: string; descriptionEn: string
  icon: string; productCount: number; image: string
}

const DATA_DIR = path.join(process.cwd(), 'data')
const FILE = path.join(DATA_DIR, 'categories.json')

function readCategoriesRaw(): any[] {
  try {
    const raw = fs.readFileSync(FILE, 'utf-8').replace(/^\uFEFF/, '')
    return JSON.parse(raw)
  } catch {
    return []
  }
}

export function getAllCategories(): Category[] {
  try {
    const cats = getCachedData('categories', FILE, readCategoriesRaw, CACHE_TTL.categories)
    let products: any[] = []
    try {
      products = getAllProducts()
    } catch (e) {
      console.error('Error getting products:', e)
    }
    return cats.map((c: any) => ({
      ...c,
      productCount: products.filter((p: any) => p.category === c.slug).length,
    }))
  } catch (e) {
    console.error('Error getting categories:', e)
    return []
  }
}

export function getCategoryBySlug(slug: string): Category | undefined {
  const all = getAllCategories()
  return all.find(c => c.slug === slug)
}

export function addCategory(slug: string, data: Partial<Category>): Category[] {
  const all = readCategoriesRaw()
  if (all.some((c: any) => c.slug === slug)) {
    throw new Error('Category slug already exists')
  }
  const cat: Category = { slug, name: data.name || slug, nameEn: data.nameEn || '', description: data.description || '', descriptionEn: data.descriptionEn || '', icon: data.icon || '📦', productCount: 0, image: data.image || '' }
  all.push(cat)
  fs.writeFileSync(FILE, JSON.stringify(all, null, 2), 'utf-8')
  invalidateCache('categories')
  return getAllCategories()
}

export function updateCategory(slug: string, data: Partial<Category>): Category[] {
  const all = readCategoriesRaw()
  const idx = all.findIndex((c: any) => c.slug === slug)
  if (idx === -1) throw new Error('Not found')
  all[idx] = { ...all[idx], ...data, slug }
  fs.writeFileSync(FILE, JSON.stringify(all, null, 2), 'utf-8')
  invalidateCache('categories')
  return getAllCategories()
}

export function deleteCategory(slug: string): Category[] {
  const all = readCategoriesRaw()
  const filtered = all.filter((c: any) => c.slug !== slug)
  fs.writeFileSync(FILE, JSON.stringify(filtered, null, 2), 'utf-8')
  invalidateCache('categories')
  return getAllCategories()
}