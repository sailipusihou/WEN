'use client'

// 图片裁剪器: 固定比例裁剪框 (拖动移动 / 右下角缩放), 确认后输出裁剪后的 Blob
import { useRef, useState, useCallback } from 'react'
import { Check, X, Move } from 'lucide-react'

interface CropRect {
  x: number // 相对显示尺寸的比例 0-1
  y: number
  w: number
  h: number
}

export default function ImageCropper({
  src,
  aspectRatio = 1,
  onConfirm,
  onCancel,
}: {
  src: string
  aspectRatio?: number
  onConfirm: (blob: Blob) => void
  onCancel: () => void
}) {
  const imgRef = useRef<HTMLImageElement>(null)
  const boxRef = useRef<HTMLDivElement>(null)
  const [rect, setRect] = useState<CropRect>({ x: 0.1, y: 0.1, w: 0.8, h: 0.8 / aspectRatio })
  const dragRef = useRef<{ mode: 'move' | 'resize'; startX: number; startY: number; orig: CropRect } | null>(null)

  const clamp = useCallback((r: CropRect): CropRect => {
    const w = Math.max(0.15, Math.min(r.w, 1))
    const h = Math.max(0.15 * aspectRatio, Math.min(r.h, 1))
    const x = Math.max(0, Math.min(r.x, 1 - w))
    const y = Math.max(0, Math.min(r.y, 1 - h))
    return { x, y, w, h }
  }, [aspectRatio])

  const onPointerDown = (e: React.PointerEvent, mode: 'move' | 'resize') => {
    e.preventDefault()
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    dragRef.current = { mode, startX: e.clientX, startY: e.clientY, orig: rect }
  }

  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current
    const box = boxRef.current
    if (!d || !box) return
    const bw = box.clientWidth
    const bh = box.clientHeight
    const dx = (e.clientX - d.startX) / bw
    const dy = (e.clientY - d.startY) / bh
    if (d.mode === 'move') {
      setRect(clamp({ ...d.orig, x: d.orig.x + dx, y: d.orig.y + dy }))
    } else {
      const w = Math.max(0.15, d.orig.w + dx)
      const h = w / aspectRatio
      setRect(clamp({ x: d.orig.x, y: d.orig.y, w, h }))
    }
  }

  const onPointerUp = () => { dragRef.current = null }

  const handleConfirm = () => {
    const img = imgRef.current
    if (!img) return
    const cw = img.naturalWidth
    const ch = img.naturalHeight
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(rect.w * cw)
    canvas.height = Math.round(rect.h * ch)
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(
      img,
      rect.x * cw, rect.y * ch, rect.w * cw, rect.h * ch,
      0, 0, canvas.width, canvas.height
    )
    canvas.toBlob(b => { if (b) onConfirm(b) }, 'image/png')
  }

  return (
    <div className="rounded-lg border p-3" style={{ borderColor: 'var(--adm-border)' }}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium" style={{ color: 'var(--adm-text)' }}>Crop & Confirm</p>
        <div className="flex items-center gap-2">
          <button onClick={handleConfirm} className="px-3 py-1.5 rounded-lg text-xs font-medium inline-flex items-center gap-1.5"
            style={{ backgroundColor: 'var(--adm-accent)', color: 'var(--adm-accent-text)' }}>
            <Check size={13} /> Confirm
          </button>
          <button onClick={onCancel} className="px-3 py-1.5 rounded-lg text-xs font-medium inline-flex items-center gap-1.5"
            style={{ backgroundColor: 'var(--adm-input)', color: 'var(--adm-text-secondary)' }}>
            <X size={13} /> Cancel
          </button>
        </div>
      </div>
      <div
        ref={boxRef}
        className="relative overflow-hidden rounded-md select-none"
        style={{ maxHeight: 300, background: '#111' }}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        <img ref={imgRef} src={src} alt="crop source" className="w-full block" draggable={false}
          onLoad={() => {
            // 图片加载后按实际比例修正初始裁剪框 (保持 aspectRatio 内边距 10%)
            const img = imgRef.current
            if (!img) return
            const iw = img.naturalWidth, ih = img.naturalHeight
            const dispRatio = iw / ih
            let w = 0.8
            let h = w / aspectRatio
            if (h > 0.8 * (1 / Math.min(dispRatio, 4))) { /* 防止超出显示高度, 按高度约束 */ }
            // 简单处理: 宽 80%, 高按比例; 若超高则按高度 80% 反推宽度
            const dispH = 1 / dispRatio
            if (h > dispH * 0.9) {
              h = dispH * 0.9
              w = h * aspectRatio
            }
            setRect(clamp({ x: (1 - w) / 2, y: (1 - h) / 2, w, h }))
          }}
        />
        {/* 裁剪框 */}
        <div
          className="absolute border-2 border-white/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] cursor-move"
          style={{ left: `${rect.x * 100}%`, top: `${rect.y * 100}%`, width: `${rect.w * 100}%`, height: `${rect.h * 100}%` }}
          onPointerDown={e => onPointerDown(e, 'move')}
        >
          <Move size={12} className="absolute -top-4 left-1/2 -translate-x-1/2 text-white/80" />
          {/* 右下角缩放柄 */}
          <div
            className="absolute -right-1.5 -bottom-1.5 w-5 h-5 rounded-full bg-white border-2 border-gray-400 cursor-nwse-resize"
            onPointerDown={e => { e.stopPropagation(); onPointerDown(e, 'resize') }}
          />
        </div>
      </div>
      <p className="text-[11px] mt-2" style={{ color: 'var(--adm-text-secondary)' }}>
        拖动裁剪框移动，拖右下角圆点缩放（固定比例）。确认后保存为优惠券图片。
      </p>
    </div>
  )
}
