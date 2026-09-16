'use client'

/**
 * 款式 / 规格选择器
 *
 * 形态与竞品（TeaTsy）对齐 —— 两者是**刻意不同**的：
 *
 *   mode="swatch"（主商品用）
 *     44–54px 图片色块，**选项名只在标题行显示**（`Style: Classic Duoqiu`），
 *     图块下方不重复名称。竞品的 attr-value 就是这个形态。
 *     款式差异多半是颜色/纹样，看图比看名字快；名字放在标题行跟着选中项走。
 *
 *   mode="dropdown"（搭配项用）
 *     原生 <select>，紧凑（约 100×28），只显示名称、不带价格 ——
 *     因为搭配行右侧本来就有单价列。
 *
 *     为什么搭配项不像主商品那样用色块：竞品就是这么做的，而且更合理 ——
 *     搭配行左侧**已经有一张会联动的缩略图**，图片反馈由它承担；
 *     再在每个选项上放一张图，同一件商品的图会在一个小区块里出现两遍，显得臃肿。
 *     （实测竞品：改下拉 → 该行缩略图确实切换，见 site-audit/teatsy-fbt-interaction.json）
 *
 * 退化处理：选项没图时，swatch 模式退回文字按钮（不会出现空框）；
 *           图片加载失败时降级为首字母色块，而不是浏览器破图图标。
 */

import { useState } from 'react'
import { convertPrice, formatPrice, type Currency } from '@/lib/cart-types'

const INK = '#241C12'
const SOFT = 'rgba(74,58,36,0.72)'
const LINE = 'rgba(74,58,36,0.28)'
const GOLD = '#8A6A2E'

export interface VariantOption {
  id: string
  label: string
  image?: string
  price?: number | null
}

/** 选项色块。图片失效时降级成首字母，不留破图图标。 */
function OptionThumb({ src, label, size, active }: { src: string; label: string; size: number; active: boolean }) {
  const [failed, setFailed] = useState(false)
  return (
    <span
      className="block overflow-hidden flex items-center justify-center"
      style={{
        width: size,
        height: size,
        borderRadius: 3,
        backgroundColor: '#F8F2E2',
        border: `1.5px solid ${active ? INK : 'rgba(74,58,36,0.18)'}`,
        // 选中态用外圈阴影而不是填充色 —— 填充会把图盖住
        boxShadow: active ? '0 0 0 2px rgba(36,28,18,0.12)' : 'none',
      }}
    >
      {failed || !src ? (
        <span className="font-en" style={{ color: GOLD, fontSize: size * 0.4 }}>
          {(label || '?').trim().charAt(0).toUpperCase()}
        </span>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={label} onError={() => setFailed(true)} className="w-full h-full object-cover" />
      )}
    </span>
  )
}

export default function VariantOptionPicker({
  options,
  value,
  onChange,
  optionName,
  currency,
  basePrice,
  size = 'md',
  dataAttr,
  label,
  mode = 'swatch',
  /** 是否允许"取消选中"（再点一次已选中的项 = 取消）。竞品就是这种行为。 */
  allowDeselect = false,
}: {
  options: VariantOption[]
  value?: string | null
  /** 传 null 表示取消选中（仅在 allowDeselect 时会发生） */
  onChange: (id: string | null) => void
  optionName?: string
  currency: Currency
  basePrice?: number
  size?: 'md' | 'sm'
  dataAttr?: string
  label?: string
  /** 'swatch' = 图片色块（主商品）；'dropdown' = 紧凑下拉（搭配项） */
  mode?: 'swatch' | 'dropdown'
  allowDeselect?: boolean
}) {
  if (!options.length) return null

  // 未选中时（value 不匹配任何选项）current 为 undefined —— 标题行就不显示名称
  const current = options.find(o => o.id === value)
  const hasPrice = (o: VariantOption) =>
    o.price !== undefined && o.price !== null &&
    basePrice !== undefined && Number(o.price) !== Number(basePrice)

  /** 点选项：已选中且允许取消 → 取消；否则选中 */
  const pick = (id: string) => {
    if (allowDeselect && id === value) onChange(null)
    else onChange(id)
  }

  // ---------- 紧凑下拉（搭配项）----------
  // 不渲染标题行 —— select 自己就显示当前值，竞品的搭配行也是这样
  if (mode === 'dropdown') {
    return (
      <select
        {...(dataAttr ? { [`data-${dataAttr}`]: '1' } : {})}
        value={current?.id || options[0].id}
        onChange={e => onChange(e.target.value)}
        aria-label={label || optionName || 'Style'}
        className="font-sans text-[12px] px-2 py-1 cursor-pointer max-w-[170px]"
        style={{ color: INK, border: `1px solid ${LINE}`, borderRadius: 3, backgroundColor: 'transparent' }}
      >
        {options.map(o => (
          <option key={o.id} value={o.id}>{o.label}</option>
        ))}
      </select>
    )
  }

  // ---------- 图片色块（主商品）----------
  const hasAnyImage = options.some(o => !!o.image)
  const thumb = size === 'sm' ? 44 : 52
  const showHeader = !!(label || optionName)

  return (
    <div>
      {showHeader && (
        // 选项名只在这里出现（与竞品的 `Style: Classic Duoqiu` 对齐），
        // 图块下方不再重复
        <div className="flex items-baseline gap-3 mb-2.5">
          <span className="font-sans text-[11px] font-semibold tracking-[0.16em] uppercase" style={{ color: SOFT }}>
            {label || optionName}
          </span>
          {/* 未选中任何款式时这里不显示名称（只有左侧的 STYLE 标签） */}
          <span className="font-sans text-[12px]" style={{ color: INK }}>{current?.label || ''}</span>
        </div>
      )}

      <div className="flex flex-wrap gap-2.5">
        {options.map(o => {
          const on = o.id === value

          if (hasAnyImage && o.image) {
            return (
              <button
                key={o.id}
                type="button"
                {...(dataAttr ? { [`data-${dataAttr}`]: o.id } : {})}
                onClick={() => pick(o.id)}
                title={hasPrice(o) ? `${o.label} — ${formatPrice(convertPrice(Number(o.price), currency), currency)}` : o.label}
                className="transition-all duration-200"
                aria-pressed={on}
                aria-label={o.label}
              >
                <OptionThumb src={o.image} label={o.label} size={thumb} active={on} />
              </button>
            )
          }

          // 没图的选项退回文字按钮（整组都没图时整组都是文字按钮）
          return (
            <button
              key={o.id}
              type="button"
              {...(dataAttr ? { [`data-${dataAttr}`]: o.id } : {})}
              onClick={() => onChange(o.id)}
              className="px-4 py-2.5 font-sans text-[12px] transition-all duration-200"
              style={{
                border: `1px solid ${on ? INK : LINE}`,
                backgroundColor: on ? INK : 'transparent',
                color: on ? '#FFFFFF' : SOFT,
                borderRadius: 3,
              }}
              title={hasPrice(o) ? `${o.label} — ${formatPrice(convertPrice(Number(o.price), currency), currency)}` : o.label}
              aria-pressed={on}
            >
              {o.label}
              {hasPrice(o) && (
                <span className="ml-2 opacity-70">{formatPrice(convertPrice(Number(o.price), currency), currency)}</span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
