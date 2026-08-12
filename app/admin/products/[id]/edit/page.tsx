import { notFound } from "next/navigation"
import { getProductById } from "@/lib/db"
import ProductForm from "@/components/admin/ProductForm"

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const product = getProductById(id)
  if (!product) notFound()
  return <ProductForm initial={product} />
}
