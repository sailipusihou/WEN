'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { X, Minus, Plus, ShoppingBag, Zap, Check, Heart } from 'lucide-react'
import type { Product } from '@/lib/products'
import { useCart } from '@/context/CartContext'
import { useCurrency } from '@/context/CurrencyContext'
import { convertPrice, formatPrice } from '@/lib/cart-types'
import { useProductPrice } from '@/lib/promotion-client'
import OptimizedImage from '@/components/ui/OptimizedImage'
import { PromoSaleTag } from '@/components/product/PromoBadge'

/**
 * 商品卡「Quick view」快速查看弹窗。
 *
 * 对齐参考站：在商品列表里点 Quick view，不跳转页面就弹出缩略图 + 可加购/可支付。
 *   · 左：商品图 + 缩略图切换
 *   · 右：名称 / 价格（含促销）/ 规格选择 / 数量 / 加入购物车 / 立即购买
 *
 * 规格选择复用商品详情页那套逻辑：款式的价格与图片留空时沿用主商品值。
 */
export default function QuickViewModal({
  product,
  onClose,
}: {
  product: Product | null
  onClose: () => void
}) {
  const { addItem, addGiftItem } = useCart()
  const { currency } = useCurrency()
  const router = useRouter()
  const [qty, setQty] = useState(1)
  const [added, setAdded] = useState(false)
  const [imgIdx, setImgIdx] = useState(0)
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null)

  // 款式（只取启用的）
  const variants = useMemo(() => {
    const v = (product as any)?.variants
    return Array.isArray(v) ? v.filter((x: any) => x && x.active !== false && x.label) : []
  }, [product])

  const activeVariant = useMemo(() => {
    if (!variants.length) return null
    return variants.find((v: any) => v.id === selectedVariantId) || variants[0]
  }, [variants, selectedVariantId])

  // 价格：款式价优先，参与促销计算（和详情页口径一致）
  const priceSource = useMemo(() => {
    if (!product) return product
    if (activeVariant && activeVariant.price !== undefined && activeVariant.price !== null
        && Number(activeVariant.price) !== product.price) {
      return { ...product, price: Number(activeVariant.price) }
    }
    return product
  }, [product, activeVariant])
  const eff = useProductPrice(priceSource)

  // 图片：选中的款式图优先 + 详情图去重
  const images = useMemo(() => {
    if (!product) return []
    return [
      activeVariant?.image || product.image,
      ...((product as any).detailImages || []),
    ].filter((x, i, arr) => x && arr.indexOf(x) === i)
  }, [product, activeVariant])

  // 打开时重置状态 + 锁定滚动 + ESC 关闭
  useEffect(() => {
    if (!product) return
    setQty(1); setAdded(false); setImgIdx(0); setSelectedVariantId(null)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKey)
    }
  }, [product, onClose])

  if (!product) return null

  const cartName = activeVariant
    ? `${product.nameEn || product.name} · ${activeVariant.label}`
    : (product.nameEn || product.name)
  const useImage = images[imgIdx] || product.image
  const usePrice = eff.price

  const buildItem = () => ({
    id: product.id,
    name: product.name,
    nameEn: cartName,
    image: useImage,
    price: usePrice,
    category: product.category,
  })

  /** 顺手把该商品的赠品也带上（和详情页一致） */
  const attachGiftIfAny = () => {
    const ids: string[] = (product as any).giftProductIds || []
    if (!ids.length) return
    const gid = ids[0]
    // 赠品商品信息在列表接口里可能没带全，这里只带 id 与占位信息，
    // 真正的价格/图片由服务端在下单时核对（服务端有赠品额度校验）
    addGiftItem({
      id: gid,
      name: gid,
      nameEn: gid,
      image: '',
      price: 0,
      category: product.category,
    }, product.id)
  }

  const handleAdd = () => {
    for (let i = 0; i < qty; i++) addItem(buildItem())
    attachGiftIfAny()
    setAdded(true)
    setTimeout(() => setAdded(false), 1800)
  }

  const handleBuyNow = () => {
    for (let i = 0; i < qty; i++) addItem(buildItem())
    attachGiftIfAny()
    onClose()
    router.push('/checkout')
  }

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(20,16,12,0.55)' }}
      onClick={onClose}
      data-quickview="1"
    >
      <div
        className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-[#FFFFFF]"
        style={{ borderRadius: 6 }}
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-9 h-9 flex items-center justify-center transition-opacity hover:opacity-60"
          style={{ backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 4 }}
          aria-label="Close quick view"
        >
          <X size={16} strokeWidth={1.8} style={{ color: '#2A2118' }} />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* ===== 左：图片 ===== */}
          <div className="p-5 md:p-7">
            <div className="relative aspect-[4/5] overflow-hidden" style={{ backgroundColor: '#F8F2E2', borderRadius: 4 }}>
              <OptimizedImage
                src={useImage}
                alt={product.nameEn || product.name}
                fill
                sizes="(max-width: 768px) 90vw, 40vw"
                className="absolute inset-0"
                objectFit="cover"
              />
            </div>
            {images.length > 1 && (
              <div className="flex gap-2 mt-3 flex-wrap">
                {images.slice(0, 6).map((src, i) => (
                  <button
                    key={src + i}
                    onClick={() => setImgIdx(i)}
                    className="relative overflow-hidden shrink-0"
                    style={{
                      width: 54, height: 66, borderRadius: 3,
                      border: `2px solid ${i === imgIdx ? '#2A2118' : 'transparent'}`,
                      backgroundColor: '#F8F2E2',
                    }}
                    aria-label={`Image ${i + 1}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ===== 右：信息与操作 ===== */}
          <div className="p-5 md:p-7 flex flex-col">
            <h2 className="font-en text-[22px] leading-tight mb-1" style={{ color: '#2A2118' }}>
              {product.nameEn || product.name}
            </h2>
            {(product.subtitleEn || product.subtitle) && (
              <p className="font-sans text-[12px] mb-3" style={{ color: 'rgba(74,58,36,0.6)' }}>
                {product.subtitleEn || product.subtitle}
              </p>
            )}

            {/* 价格 */}
            <div className="flex items-baseline gap-2.5 mb-4">
              <span className="font-en text-[26px] font-medium" style={{ color: eff.discount > 0 ? '#A83420' : '#2A2118' }}>
                {formatPrice(convertPrice(usePrice, currency), currency)}
              </span>
              {eff.discount > 0 && <PromoSaleTag />}
              {(eff.originalPrice || product.originalPrice) && (
                <span className="font-sans text-[14px] line-through" style={{ color: 'rgba(74,58,36,0.5)' }}>
                  {formatPrice(convertPrice(eff.originalPrice || product.originalPrice || 0, currency), currency)}
                </span>
              )}
            </div>

            {/* 规格选择 */}
            {variants.length > 0 && (
              <div className="mb-4" data-qv-variants="1">
                <p className="font-sans text-[10px] font-semibold tracking-[0.18em] uppercase mb-2" style={{ color: 'rgba(74,58,36,0.6)' }}>
                  {(product as any).optionName || 'Style'}
                  <span className="ml-2 normal-case tracking-normal font-normal" style={{ color: '#2A2118' }}>
                    {activeVariant?.label}
                  </span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {variants.map((v: any) => {
                    const on = activeVariant && v.id === activeVariant.id
                    const vp = v.price !== undefined && v.price !== null ? Number(v.price) : product.price
                    return (
                      <button
                        key={v.id}
                        type="button"
                        data-qv-option={v.id}
                        onClick={() => setSelectedVariantId(v.id)}
                        className="px-3 py-2 font-sans text-[12px] transition-all duration-200"
                        style={{
                          border: `1px solid ${on ? '#2A2118' : 'rgba(74,58,36,0.28)'}`,
                          backgroundColor: on ? '#2A2118' : 'transparent',
                          color: on ? '#FFFFFF' : '#5A4A36',
                          borderRadius: 3,
                        }}
                      >
                        {v.label}
                        {v.price !== undefined && v.price !== null && Number(v.price) !== product.price && (
                          <span className="ml-2 opacity-70">{formatPrice(convertPrice(vp, currency), currency)}</span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* 数量 */}
            <div className="flex items-stretch gap-3 mb-3">
              <div className="flex items-center" style={{ border: '1px solid rgba(74,58,36,0.28)', borderRadius: 4 }}>
                <button type="button" onClick={() => setQty(Math.max(1, qty - 1))}
                  className="px-3.5 py-3 transition-opacity hover:opacity-60" aria-label="Decrease">
                  <Minus size={13} strokeWidth={1.8} style={{ color: '#5A4A36' }} />
                </button>
                <span className="px-1 font-sans text-[15px] min-w-[2rem] text-center" style={{ color: '#2A2118' }}>{qty}</span>
                <button type="button" onClick={() => setQty(qty + 1)}
                  className="px-3.5 py-3 transition-opacity hover:opacity-60" aria-label="Increase">
                  <Plus size={13} strokeWidth={1.8} style={{ color: '#5A4A36' }} />
                </button>
              </div>

              <button
                type="button"
                onClick={handleAdd}
                data-qv-add="1"
                className="flex-1 flex items-center justify-center gap-2.5 px-6 py-3 font-sans text-[11px] font-bold tracking-[0.2em] uppercase transition-all duration-300"
                style={{
                  backgroundColor: added ? '#8A6A2E' : '#FFFFFF',
                  color: added ? '#FFFFFF' : '#2A2118',
                  border: `1px solid ${added ? '#8A6A2E' : '#2A2118'}`,
                  borderRadius: 4,
                }}
              >
                {added ? <><Check size={14} strokeWidth={2.2} /> 已加入</> : <><ShoppingBag size={14} strokeWidth={2} /> Add to cart</>}
              </button>
            </div>

            {/* 立即购买 */}
            <button
              type="button"
              onClick={handleBuyNow}
              data-qv-buynow="1"
              className="w-full flex items-center justify-center gap-2 px-6 py-3 font-sans text-[11px] font-bold tracking-[0.2em] uppercase transition-all duration-300 hover:-translate-y-px mb-3"
              style={{ backgroundColor: '#4C5546', color: '#FFFFFF', borderRadius: 4 }}
            >
              <Zap size={14} strokeWidth={2.2} /> Buy now
            </button>

            <Link
              href={`/products/${product.id}`}
              onClick={onClose}
              className="font-sans text-[11px] underline underline-offset-4 transition-opacity hover:opacity-70 mb-4"
              style={{ color: 'rgba(74,58,36,0.65)' }}
            >
              查看完整商品详情 →
            </Link>

            {/* 简短卖点 */}
            <div className="mt-auto pt-4 space-y-1.5" style={{ borderTop: '1px solid rgba(74,58,36,0.12)' }}>
              {[
                { icon: Check, text: 'Authenticity guaranteed' },
                { icon: Check, text: '30-day money back' },
                { icon: Check, text: 'Tracked worldwide shipping' },
              ].map(x => (
                <p key={x.text} className="flex items-center gap-2 font-sans text-[11px]" style={{ color: 'rgba(74,58,36,0.7)' }}>
                  <x.icon size={11} strokeWidth={2.4} style={{ color: '#8A6A2E' }} /> {x.text}
                </p>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/** 未使用的占位，避免 lint 报未引用（Heart 预留给收藏功能） */
void Heart
