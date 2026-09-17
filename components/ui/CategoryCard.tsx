'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import type { Category } from '@/lib/products'
import OptimizedImage from '@/components/ui/OptimizedImage'

interface CategoryCardProps {
  category: Category
  index?: number
}

export default function CategoryCard({ category, index = 0 }: CategoryCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.08 }}
    >
      <Link href={`/category/${category.slug}`} className="block group">
        <div className="relative overflow-hidden bg-[#EFE7D4]/50">
          <div className="aspect-[4/3] transition-transform duration-700 group-hover:scale-105">
            <OptimizedImage
              src={category.image}
              alt={category.nameEn || category.name}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              className="w-full h-full"
              objectFit="cover"
              placeholder="blur"
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-[#2A2118]/80 via-[#2A2118]/20 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-5 md:p-6">
            <h3 className="font-en text-xl md:text-2xl text-white font-semibold tracking-[0.005em]">{category.nameEn || category.name}</h3>
            <p className="font-sans text-xs text-white/50 mt-1 leading-relaxed line-clamp-1">{category.descriptionEn || category.description}</p>
            <div className="flex items-center gap-2 mt-3">
              <span className="font-sans text-micro text-white/40">{category.productCount} pieces</span>
              <span className="w-6 h-px bg-[#A07C34]/50" />
              <span className="font-sans text-micro text-[#A07C34] tracking-[0.18em] uppercase flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                Explore <ArrowUpRight size={10} strokeWidth={1.5} />
              </span>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}
