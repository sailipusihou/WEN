import { notFound } from "next/navigation"
import { getRepository } from "@/lib/repository"
import ProductForm from "@/components/admin/ProductForm"

// 编辑页禁用静态缓存 / 客户端 router cache — 保证保存后重新打开看到的是最新价格
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  // 修复: 统一从当前后端 (SQLite) 读取 — 原误用 lib/db 的 JSON 文件,
  // 保存写入 SQLite 后编辑页仍显示 JSON 旧值 (且为旧人民币价格)
  const repo = getRepository()
  const product = repo.products.getById(id)
  if (!product) notFound()
  return <ProductForm initial={product} />
}
