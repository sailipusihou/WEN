import { notFound } from "next/navigation"
import { getProductById } from "@/lib/db"
import ProductForm from "@/components/admin/ProductForm"

// 编辑页禁用静态缓存 / 客户端 router cache — 保证保存后重新打开看到的是最新价格
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const product = getProductById(id)
  if (!product) notFound()
  return <ProductForm initial={product} />
}
