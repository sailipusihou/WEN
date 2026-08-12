"use client"
import { useState, useEffect, useRef, useCallback } from "react"
import {
  X, Trash2, Sparkles, Download, Type, Plus, ChevronUp, ChevronDown,
  Save, Loader2, Wand2, Copy, RotateCw, FlipHorizontal2, AlignCenter, AlignLeft, AlignRight,
} from "lucide-react"

interface TextLayer {
  id: string
  kind: 'text' | 'badge'
  text: string
  x: number // 容器宽百分比 (0-100), 中心锚点
  y: number // 容器高百分比 (0-100), 中心锚点
  size: number // 相对容器宽百分比
  color: string
  bold: boolean
  font: 'sans' | 'serif' | 'mono' | 'impact'
  bg: boolean
  align: 'left' | 'center' | 'right'
  badgeBg?: string
  outline?: boolean
}

interface DesignBrief {
  headline?: string
  subheadline?: string
  badge?: string
  cta?: string
  style?: string
  styleDesc?: string
  colors?: string[]
}

const STYLE_PRESETS: { id: string; name: string; filter: string }[] = [
  { id: 'original', name: '原图', filter: 'none' },
  { id: 'bright', name: '明亮', filter: 'brightness(1.15) contrast(1.05) saturate(1.08)' },
  { id: 'dark', name: '暗调', filter: 'brightness(0.82) contrast(1.12) saturate(0.95)' },
  { id: 'bw', name: '黑白', filter: 'grayscale(1) contrast(1.12)' },
  { id: 'retro', name: '复古', filter: 'sepia(0.45) contrast(1.05) brightness(1.02)' },
  { id: 'warm', name: '暖调', filter: 'sepia(0.22) saturate(1.25) brightness(1.04)' },
  { id: 'cool', name: '冷调', filter: 'hue-rotate(12deg) saturate(1.2) brightness(1.02)' },
  { id: 'vivid', name: '高饱和', filter: 'saturate(1.55) contrast(1.08)' },
  { id: 'neon', name: '霓虹', filter: 'saturate(1.7) contrast(1.25) hue-rotate(-8deg)' },
]

const FONT_FAMILIES: Record<TextLayer['font'], string> = {
  sans: "'Segoe UI', 'PingFang SC', 'Microsoft YaHei', Arial, sans-serif",
  serif: "Georgia, 'Songti SC', 'SimSun', serif",
  mono: "'Courier New', Consolas, monospace",
  impact: "Impact, 'Arial Black', 'PingFang SC', sans-serif",
}

const BADGE_PRESETS = ['NEW', 'SALE', 'HOT', 'LIMITED', '5% OFF', '秒杀', '新品', '特惠']

const EMOJI_STICKERS = ['🔥', '✨', '🛍️', '🎁', '⭐', '💫', '🌙', '🏮', '🌸', '💎', '🎯', '🚀']

const DESIGN_TONES = [
  { id: 'premium', name: '高级' },
  { id: 'minimal', name: '极简' },
  { id: 'vibrant', name: '活力' },
  { id: 'retro', name: '复古' },
  { id: 'festive', name: '节日' },
  { id: 'elegant', name: '优雅' },
]

const OUTPUT_ASPECTS = [
  { id: 'original', name: '原图比例' },
  { id: '1:1', name: '1:1 方形' },
  { id: '4:5', name: '4:5 竖版' },
  { id: '9:16', name: '9:16 故事' },
]

let layerSeq = 0
function newLayer(partial: Partial<TextLayer> = {}): TextLayer {
  layerSeq += 1
  return {
    id: `layer_${Date.now()}_${layerSeq}`,
    kind: 'text',
    text: '文案',
    x: 50,
    y: 50,
    size: 6,
    color: '#ffffff',
    bold: true,
    font: 'sans',
    bg: true,
    align: 'center',
    ...partial,
  }
}

export default function MarketingImageEditor({
  imageUrl,
  productName,
  productDesc,
  caption,
  imagePrompt,
  onSave,
  onClose,
}: {
  imageUrl: string
  productName?: string
  productDesc?: string
  caption?: string
  imagePrompt?: string
  onSave: (url: string) => void
  onClose: () => void
}) {
  const [img, setImg] = useState<HTMLImageElement | null>(null)
  const [containerW, setContainerW] = useState(0)
  const [filter, setFilter] = useState('none')
  const [stylePreset, setStylePreset] = useState('original')
  const [layers, setLayers] = useState<TextLayer[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [aiNote, setAiNote] = useState('')
  const [extraNotes, setExtraNotes] = useState('')
  const [designTone, setDesignTone] = useState('premium')
  const [brightness, setBrightness] = useState(1)
  const [contrast, setContrast] = useState(1)
  const [saturation, setSaturation] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [flipH, setFlipH] = useState(false)
  const [outputAspect, setOutputAspect] = useState('original')
  const [padColor, setPadColor] = useState<'white' | 'black' | 'transparent'>('white')
  const containerRef = useRef<HTMLDivElement | null>(null)
  const dragRef = useRef<{ id: string; dx: number; dy: number } | null>(null)
  const exportRetried = useRef(false)

  useEffect(() => {
    let cancelled = false
    exportRetried.current = false
    const load = async () => {
      try {
        // 优先以 blob 方式加载，避免外链图片污染 Canvas 导致无法导出
        const r = await fetch(imageUrl)
        if (r.ok) {
          const blob = await r.blob()
          if (cancelled) return
          const url = URL.createObjectURL(blob)
          const el = new Image()
          el.onload = () => setImg(el)
          el.onerror = () => { if (!cancelled) setError('图片解码失败，请重试') }
          el.src = url
          return
        }
      } catch {
        // 无 CORS 时退回直接加载（可预览，导出可能受限）
      }
      if (cancelled) return
      const el = new Image()
      el.onload = () => setImg(el)
      el.onerror = () => { if (!cancelled) setError('图片加载失败，请检查图片地址') }
      el.src = imageUrl
    }
    load()
    return () => { cancelled = true }
  }, [imageUrl])

  useEffect(() => {
    const node = containerRef.current
    if (!node) return
    const update = () => setContainerW(node.clientWidth)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(node)
    return () => ro.disconnect()
  }, [img])

  const updateLayer = useCallback((id: string, patch: Partial<TextLayer>) => {
    setLayers(prev => prev.map(l => (l.id === id ? { ...l, ...patch } : l)))
  }, [])

  const removeLayer = useCallback((id: string) => {
    setLayers(prev => prev.filter(l => l.id !== id))
    setSelectedId(prev => (prev === id ? null : prev))
  }, [])

  const duplicateLayer = useCallback((id: string) => {
    setLayers(prev => {
      const src = prev.find(l => l.id === id)
      if (!src) return prev
      const copy = { ...src, id: `layer_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, y: Math.min(95, src.y + 6) }
      return [...prev, copy]
    })
  }, [])

  const onPointerDown = (e: React.PointerEvent, layer: TextLayer) => {
    e.preventDefault()
    const node = containerRef.current
    if (!node) return
    const rect = node.getBoundingClientRect()
    dragRef.current = {
      id: layer.id,
      dx: ((e.clientX - rect.left) / rect.width) * 100 - layer.x,
      dy: ((e.clientY - rect.top) / rect.height) * 100 - layer.y,
    }
    setSelectedId(layer.id)
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current
    const node = containerRef.current
    if (!drag || !node) return
    const rect = node.getBoundingClientRect()
    const x = Math.min(100, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100 - drag.dx))
    const y = Math.min(100, Math.max(0, ((e.clientY - rect.top) / rect.height) * 100 - drag.dy))
    updateLayer(drag.id, { x, y })
  }

  const onPointerUp = () => {
    dragRef.current = null
  }

  const applyDesign = (d: DesignBrief) => {
    const next: TextLayer[] = []
    const primary = d.colors?.[0] || '#2C3E50'
    const accent = d.colors?.[1] || '#C9A96A'
    if (d.headline) {
      next.push(newLayer({ text: d.headline, x: 50, y: 12, size: 7, color: '#ffffff', font: 'impact', bg: true, kind: 'text' }))
    }
    if (d.subheadline) {
      next.push(newLayer({ text: d.subheadline, x: 50, y: 22, size: 3.6, color: '#ffffff', font: 'sans', bold: false, bg: true, kind: 'text' }))
    }
    if (d.badge) {
      next.push(newLayer({ text: d.badge, x: 50, y: 8, size: 4, color: '#ffffff', font: 'impact', bg: false, kind: 'badge', badgeBg: accent }))
    }
    if (d.cta) {
      next.push(newLayer({ text: d.cta, x: 50, y: 90, size: 4.5, color: '#ffffff', font: 'impact', bg: true, kind: 'text' }))
    }
    setLayers(next)
    const preset = STYLE_PRESETS.find(s => s.id === d.style) || STYLE_PRESETS.find(s => s.id === 'luxury')
    if (preset) {
      setStylePreset(preset.id)
      setFilter(preset.filter)
    }
    setAiNote(d.styleDesc || '')
    setSelectedId(null)
  }

  const runAiSuggest = async () => {
    setAiLoading(true)
    setError('')
    try {
      const r = await fetch('/api/marketing/design-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName,
          productDesc,
          caption,
          imagePrompt,
          style: stylePreset,
          extraNotes,
          tone: designTone,
        }),
      })
      const d = await r.json()
      if (r.ok && d.success && d.design) {
        applyDesign(d.design)
      } else {
        setError(d.error || 'AI 建议生成失败')
      }
    } catch (e: any) {
      setError(e.message || '网络错误')
    } finally {
      setAiLoading(false)
    }
  }

  const wrapText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] => {
    const words = text.split(/\s+/)
    const lines: string[] = []
    let line = ''
    for (const w of words) {
      const test = line ? `${line} ${w}` : w
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line)
        line = w
      } else {
        line = test
      }
    }
    if (line) lines.push(line)
    if (lines.length === 0) lines.push('')
    return lines
  }

  const exportImage = async (download = false) => {
    if (!img) {
      setError('图片尚未加载完成，请稍候再试')
      return
    }
    if (!img.complete) {
      setError('图片仍在加载，请稍候再试')
      return
    }
    setSaving(true)
    setError('')
    try {
      const maxSide = 2048
      const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight))
      const imgW = Math.round(img.naturalWidth * scale)
      const imgH = Math.round(img.naturalHeight * scale)
      const rot = ((rotation % 360) + 360) % 360
      const swap = rot === 90 || rot === 270
      const baseW = swap ? imgH : imgW
      const baseH = swap ? imgW : imgH
      let canvasW = baseW
      let canvasH = baseH
      if (outputAspect !== 'original') {
        const [aw, ah] = outputAspect.split(':').map(Number)
        const ar = aw / ah
        if (canvasW / canvasH > ar) {
          canvasH = Math.round(canvasW / ar)
        } else {
          canvasW = Math.round(canvasH * ar)
        }
      }
      const canvas = document.createElement('canvas')
      canvas.width = canvasW
      canvas.height = canvasH
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Canvas 初始化失败')
      if (padColor === 'white') ctx.fillStyle = '#ffffff'
      else if (padColor === 'black') ctx.fillStyle = '#0b0b0f'
      if (padColor !== 'transparent') ctx.fillRect(0, 0, canvasW, canvasH)

      const presetFilter = STYLE_PRESETS.find(s => s.id === stylePreset)?.filter || 'none'
      const combinedFilter = [
        presetFilter === 'none' ? '' : presetFilter,
        `brightness(${brightness}) contrast(${contrast}) saturate(${saturation})`,
      ].filter(Boolean).join(' ')

      ctx.save()
      ctx.translate(canvasW / 2, canvasH / 2)
      ctx.rotate((rot * Math.PI) / 180)
      if (flipH) ctx.scale(-1, 1)
      ctx.filter = combinedFilter
      ctx.drawImage(img, -baseW / 2, -baseH / 2, baseW, baseH)
      ctx.filter = 'none'
      ctx.restore()

      for (const layer of layers) {
        const lx = (layer.x / 100) * canvasW
        const ly = (layer.y / 100) * canvasH
        const fontSize = Math.round((layer.size / 100) * canvasW * 0.82)
        ctx.font = `${layer.bold ? '700 ' : ''}${fontSize}px ${FONT_FAMILIES[layer.font]}`
        ctx.textAlign = layer.align === 'left' ? 'left' : layer.align === 'right' ? 'right' : 'center'
        ctx.textBaseline = 'middle'
        const maxW = canvasW * 0.86
        const lines = wrapText(ctx, layer.text, maxW)
        const lineH = fontSize * 1.22
        const totalH = lineH * lines.length

        if (layer.kind === 'badge') {
          const bw = Math.max(ctx.measureText(layer.text).width + fontSize * 1.6, fontSize * 4.2)
          const bh = fontSize * 1.9
          ctx.fillStyle = layer.badgeBg || '#E4002B'
          const radius = bh / 2
          ctx.beginPath()
          if ('roundRect' in ctx) {
            ;(ctx as any).roundRect(lx - bw / 2, ly - bh / 2, bw, bh, radius)
          } else {
            ;(ctx as any).rect(lx - bw / 2, ly - bh / 2, bw, bh)
          }
          ctx.fill()
          ctx.fillStyle = layer.color
          ctx.fillText(layer.text, lx, ly)
        } else {
          if (layer.bg) {
            const padX = fontSize * 0.5
            const padY = fontSize * 0.35
            ctx.fillStyle = 'rgba(0,0,0,0.45)'
            lines.forEach((ln, i) => {
              const tw = ctx.measureText(ln).width
              const ty = ly - totalH / 2 + i * lineH
              const bx = layer.align === 'left' ? lx - tw / 2 - padX : layer.align === 'right' ? lx + tw / 2 - tw - padX : lx - tw / 2 - padX
              ctx.beginPath()
              if ('roundRect' in ctx) {
                ;(ctx as any).roundRect(bx, ty - lineH / 2 - padY, tw + padX * 2, lineH + padY * 2, fontSize * 0.28)
              } else {
                ;(ctx as any).rect(bx, ty - lineH / 2 - padY, tw + padX * 2, lineH + padY * 2)
              }
              ctx.fill()
            })
          }
          ctx.fillStyle = layer.color
          if (layer.outline) {
            ctx.strokeStyle = 'rgba(255,255,255,0.95)'
            ctx.lineWidth = Math.max(2, fontSize * 0.07)
            ctx.lineJoin = 'round'
          }
          lines.forEach((ln, i) => {
            if (layer.outline) ctx.strokeText(ln, lx, ly - totalH / 2 + lineH / 2 + i * lineH)
            ctx.fillText(ln, lx, ly - totalH / 2 + lineH / 2 + i * lineH)
          })
        }
      }

      const dataUrl = canvas.toDataURL('image/png')
      if (download) {
        const a = document.createElement('a')
        a.href = dataUrl
        a.download = `marketing-ad-${Date.now()}.png`
        a.click()
        setSaving(false)
        return
      }
      const r = await fetch('/api/marketing/save-edited-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: dataUrl }),
      })
      const d = await r.json()
      if (r.ok && d.success) {
        onSave(d.url)
      } else {
        setError(d.error || '保存失败')
      }
    } catch (e: any) {
      if (e?.name === 'SecurityError' && !exportRetried.current) {
        exportRetried.current = true
        try {
          const r = await fetch(imageUrl)
          if (!r.ok) throw new Error('fetch failed')
          const blob = await r.blob()
          const url = URL.createObjectURL(blob)
          const fresh = new Image()
          await new Promise<void>((res, rej) => {
            fresh.onload = () => res()
            fresh.onerror = () => rej(new Error('reload failed'))
            fresh.src = url
          })
          setImg(fresh)
          setSaving(false)
          return exportImage(download)
        } catch {
          setError('图片跨域受限，无法导出。请使用 AI 生成的图片或本地图片编辑。')
        }
      } else {
        console.error('[MarketingImageEditor] export error:', e)
        setError(e?.message || '导出失败')
      }
    } finally {
      setSaving(false)
    }
  }

  const selected = layers.find(l => l.id === selectedId) || null
  const fontPx = (l: TextLayer) => `${Math.max(10, (l.size / 100) * containerW * 0.82)}px`
  const rotDeg = ((rotation % 360) + 360) % 360
  const swapDim = rotDeg === 90 || rotDeg === 270
  const baseAspect = img ? `${swapDim ? img.naturalHeight : img.naturalWidth} / ${swapDim ? img.naturalWidth : img.naturalHeight}` : '1 / 1'
  const previewAspect = outputAspect !== 'original' ? outputAspect.replace(':', ' / ') : baseAspect
  const previewBg = outputAspect !== 'original' ? (padColor === 'white' ? '#ffffff' : padColor === 'black' ? '#0b0b0f' : '#111') : '#111'

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(6px)' }}>
      <div className="w-full max-w-6xl max-h-[94vh] overflow-y-auto rounded-2xl" style={{ backgroundColor: 'var(--adm-card)', border: '1px solid var(--adm-border)', boxShadow: '0 30px 80px rgba(0,0,0,0.5)' }}>
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--adm-border)' }}>
          <div>
            <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--adm-text)' }}>
              <Wand2 size={16} style={{ color: 'var(--adm-accent)' }} /> 营销图片编辑器
            </h3>
            <p className="text-xs mt-0.5" style={{ color: 'var(--adm-text-secondary)' }}>拖拽图层调整位置，AI 一键生成文案与画风，完成后导出</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg" style={{ color: 'var(--adm-text-secondary)' }}>
            <X size={18} />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-0">
          {/* 画布 */}
          <div className="p-6">
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="text-xs font-medium" style={{ color: 'var(--adm-text-secondary)' }}>画风滤镜:</span>
              {STYLE_PRESETS.map(p => (
                <button
                  key={p.id}
                  onClick={() => { setStylePreset(p.id); setFilter(p.filter) }}
                  className="px-3 py-1 text-xs rounded-lg transition-all"
                  style={{
                    backgroundColor: stylePreset === p.id ? 'var(--adm-accent)' : 'var(--adm-input)',
                    color: stylePreset === p.id ? 'var(--adm-accent-text)' : 'var(--adm-text-secondary)',
                    border: '1px solid var(--adm-border)',
                  }}
                >
                  {p.name}
                </button>
              ))}
            </div>
            <div
              ref={containerRef}
              className="relative rounded-xl overflow-hidden mx-auto"
              style={{
                maxWidth: 640,
                aspectRatio: previewAspect,
                backgroundColor: previewBg,
                boxShadow: outputAspect !== 'original' ? 'inset 0 0 0 1px rgba(0,0,0,0.08)' : 'none',
              }}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
            >
              {img && (
                <img
                  src={imageUrl}
                  alt=""
                  className="absolute inset-0 w-full h-full object-contain select-none"
                  style={{
                    filter: [STYLE_PRESETS.find(s => s.id === stylePreset)?.filter || 'none', `brightness(${brightness}) contrast(${contrast}) saturate(${saturation})`].filter(f => f && f !== 'none').join(' ') || 'none',
                    transform: `rotate(${((rotation % 360) + 360) % 360}deg) scaleX(${flipH ? -1 : 1})`,
                    pointerEvents: 'none',
                  }}
                  draggable={false}
                />
              )}
              {layers.map(layer => {
                const isSel = layer.id === selectedId
                const sizePx = fontPx(layer)
                return (
                  <div
                    key={layer.id}
                    onPointerDown={e => onPointerDown(e, layer)}
                    className="absolute select-none cursor-move"
                    style={{
                      left: `${layer.x}%`,
                      top: `${layer.y}%`,
                      transform: 'translate(-50%, -50%)',
                      color: layer.color,
                      fontFamily: FONT_FAMILIES[layer.font],
                      fontSize: sizePx,
                      fontWeight: layer.bold ? 700 : 400,
                      textAlign: layer.align,
                      textShadow: layer.bg ? 'none' : '0 2px 8px rgba(0,0,0,0.55)',
                      WebkitTextStroke: layer.outline && !layer.bg ? '2px rgba(255,255,255,0.9)' : 'transparent',
                      padding: layer.bg ? '0.25em 0.6em' : '0 0.2em',
                      backgroundColor: layer.bg ? 'rgba(0,0,0,0.45)' : 'transparent',
                      borderRadius: layer.kind === 'badge' ? '999px' : '0.3em',
                      border: isSel ? '2px dashed rgba(255,255,255,0.85)' : '2px dashed transparent',
                      maxWidth: '86%',
                      wordBreak: 'break-word',
                      zIndex: isSel ? 20 : 10,
                      whiteSpace: 'pre-wrap',
                      lineHeight: 1.22,
                    }}
                  >
                    {layer.text}
                  </div>
                )
              })}
            </div>
            <div className="mt-2 text-center">
              <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--adm-input)', color: 'var(--adm-text-secondary)' }}>
                {outputAspect === 'original'
                  ? '输出：原图比例'
                  : `输出：${outputAspect}（${padColor === 'white' ? '白底' : padColor === 'black' ? '黑底' : '透明底'}留白）`}
              </span>
            </div>
          </div>

          {/* 控制面板 */}
          <div className="p-5 space-y-5 border-l" style={{ borderColor: 'var(--adm-border)', backgroundColor: 'var(--adm-input)' }}>
            {/* AI 建议 */}
            <div className="rounded-xl p-3 space-y-2" style={{ backgroundColor: 'var(--adm-card)', border: '1px solid var(--adm-border)' }}>
              <p className="text-xs font-semibold flex items-center gap-1.5" style={{ color: 'var(--adm-text)' }}>
                <Sparkles size={13} style={{ color: 'var(--adm-accent)' }} /> AI 文案与画风建议
              </p>
              <textarea
                value={extraNotes}
                onChange={e => setExtraNotes(e.target.value)}
                rows={2}
                placeholder="补充卖点/要求，如：强调手作工艺、适合送礼、节日限定..."
                className="w-full px-2.5 py-2 text-xs rounded-lg resize-none"
                style={{ backgroundColor: 'var(--adm-input)', border: '1px solid var(--adm-input-border)', color: 'var(--adm-text)' }}
              />
              <div className="flex flex-wrap gap-1.5">
                {DESIGN_TONES.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setDesignTone(t.id)}
                    className="px-2.5 py-1 text-[11px] rounded-lg"
                    style={{
                      backgroundColor: designTone === t.id ? 'var(--adm-accent)' : 'var(--adm-input)',
                      color: designTone === t.id ? 'var(--adm-accent-text)' : 'var(--adm-text-secondary)',
                      border: '1px solid var(--adm-border)',
                    }}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
              <button
                onClick={runAiSuggest}
                disabled={aiLoading}
                className="w-full py-2.5 rounded-lg text-xs font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ backgroundColor: 'var(--adm-accent)', color: 'var(--adm-accent-text)' }}
              >
                {aiLoading ? <><Loader2 size={14} className="animate-spin" /> 生成中...</> : <><Wand2 size={14} /> 一键生成标题/角标/画风</>}
              </button>
              {aiNote && <p className="text-[11px] mt-2 leading-relaxed" style={{ color: 'var(--adm-text-secondary)' }}>{aiNote}</p>}
            </div>

            {/* 添加元素 */}
            <div>
              <p className="text-xs font-semibold mb-2" style={{ color: 'var(--adm-text)' }}>添加元素</p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    setLayers(prev => [...prev, newLayer({ text: '输入标题', x: 50, y: 15 })])
                    setSelectedId('')
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs"
                  style={{ backgroundColor: 'var(--adm-card)', border: '1px solid var(--adm-border)', color: 'var(--adm-text)' }}
                >
                  <Type size={13} /> 文字
                </button>
                {BADGE_PRESETS.slice(0, 4).map(b => (
                  <button
                    key={b}
                    onClick={() => {
                      setLayers(prev => [...prev, newLayer({ kind: 'badge', text: b, x: 50 + Math.random() * 20 - 10, y: 15, size: 4, bg: false, badgeBg: '#E4002B', font: 'impact' })])
                      setSelectedId('')
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold"
                    style={{ backgroundColor: '#E4002B', color: '#fff' }}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>

            {/* 画质调节 */}
            <div className="rounded-xl p-3 space-y-3" style={{ backgroundColor: 'var(--adm-card)', border: '1px solid var(--adm-border)' }}>
              <p className="text-xs font-semibold" style={{ color: 'var(--adm-text)' }}>画质调节</p>
              <div className="space-y-2.5">
                <div>
                  <label className="text-[11px] flex justify-between" style={{ color: 'var(--adm-text-secondary)' }}>
                    <span>亮度</span><span>{Math.round(brightness * 100)}%</span>
                  </label>
                  <input type="range" min={0.5} max={1.5} step={0.01} value={brightness} onChange={e => setBrightness(Number(e.target.value))} className="w-full" />
                </div>
                <div>
                  <label className="text-[11px] flex justify-between" style={{ color: 'var(--adm-text-secondary)' }}>
                    <span>对比度</span><span>{Math.round(contrast * 100)}%</span>
                  </label>
                  <input type="range" min={0.5} max={1.6} step={0.01} value={contrast} onChange={e => setContrast(Number(e.target.value))} className="w-full" />
                </div>
                <div>
                  <label className="text-[11px] flex justify-between" style={{ color: 'var(--adm-text-secondary)' }}>
                    <span>饱和度</span><span>{Math.round(saturation * 100)}%</span>
                  </label>
                  <input type="range" min={0} max={1.8} step={0.01} value={saturation} onChange={e => setSaturation(Number(e.target.value))} className="w-full" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setRotation(r => (r + 90) % 360)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px]"
                  style={{ backgroundColor: 'var(--adm-input)', border: '1px solid var(--adm-border)', color: 'var(--adm-text)' }}
                >
                  <RotateCw size={12} /> 旋转 90°
                </button>
                <button
                  onClick={() => setFlipH(f => !f)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px]"
                  style={{
                    backgroundColor: flipH ? 'var(--adm-accent)' : 'var(--adm-input)',
                    border: '1px solid var(--adm-border)',
                    color: flipH ? 'var(--adm-accent-text)' : 'var(--adm-text)',
                  }}
                >
                  <FlipHorizontal2 size={12} /> 水平翻转
                </button>
              </div>
            </div>

            {/* 贴纸 */}
            <div>
              <p className="text-xs font-semibold mb-2" style={{ color: 'var(--adm-text)' }}>表情贴纸</p>
              <div className="flex flex-wrap gap-1.5">
                {EMOJI_STICKERS.map(em => (
                  <button
                    key={em}
                    onClick={() => {
                      setLayers(prev => [...prev, newLayer({ kind: 'text', text: em, x: 50 + Math.random() * 24 - 12, y: 30 + Math.random() * 40, size: 8, color: '#ffffff', font: 'sans', bg: false, align: 'center' })])
                      setSelectedId('')
                    }}
                    className="w-9 h-9 rounded-lg text-base flex items-center justify-center"
                    style={{ backgroundColor: 'var(--adm-card)', border: '1px solid var(--adm-border)' }}
                    title="点击添加贴纸"
                  >
                    {em}
                  </button>
                ))}
              </div>
            </div>

            {/* 输出设置 */}
            <div className="rounded-xl p-3 space-y-2" style={{ backgroundColor: 'var(--adm-card)', border: '1px solid var(--adm-border)' }}>
              <p className="text-xs font-semibold" style={{ color: 'var(--adm-text)' }}>输出比例</p>
              <div className="flex flex-wrap gap-1.5">
                {OUTPUT_ASPECTS.map(a => (
                  <button
                    key={a.id}
                    onClick={() => setOutputAspect(a.id)}
                    className="px-2.5 py-1 text-[11px] rounded-lg"
                    style={{
                      backgroundColor: outputAspect === a.id ? 'var(--adm-accent)' : 'var(--adm-input)',
                      color: outputAspect === a.id ? 'var(--adm-accent-text)' : 'var(--adm-text-secondary)',
                      border: '1px solid var(--adm-border)',
                    }}
                  >
                    {a.name}
                  </button>
                ))}
              </div>
              {outputAspect !== 'original' && (
                <div className="flex items-center gap-2">
                  <span className="text-[11px]" style={{ color: 'var(--adm-text-secondary)' }}>留白:</span>
                  {(['white', 'black', 'transparent'] as const).map(c => (
                    <button
                      key={c}
                      onClick={() => setPadColor(c)}
                      className="px-2.5 py-1 text-[11px] rounded-lg"
                      style={{
                        backgroundColor: padColor === c ? 'var(--adm-accent)' : 'var(--adm-input)',
                        color: padColor === c ? 'var(--adm-accent-text)' : 'var(--adm-text-secondary)',
                        border: '1px solid var(--adm-border)',
                      }}
                    >
                      {c === 'white' ? '白色' : c === 'black' ? '黑色' : '透明'}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 图层列表 */}
            <div>
              <p className="text-xs font-semibold mb-2" style={{ color: 'var(--adm-text)' }}>图层 ({layers.length})</p>
              <div className="space-y-2">
                {layers.length === 0 && (
                  <p className="text-[11px] py-3 text-center" style={{ color: 'var(--adm-text-secondary)' }}>暂无图层，点击 AI 建议或手动添加</p>
                )}
                {layers.map((l, idx) => (
                  <div
                    key={l.id}
                    onClick={() => setSelectedId(l.id)}
                    className="flex items-center gap-2 p-2 rounded-lg cursor-pointer"
                    style={{
                      backgroundColor: selectedId === l.id ? 'var(--adm-accent-bg)' : 'var(--adm-card)',
                      border: `1px solid ${selectedId === l.id ? 'var(--adm-accent)' : 'var(--adm-border)'}`,
                    }}
                  >
                    <span className="text-[10px] w-8 truncate" style={{ color: 'var(--adm-text-secondary)' }}>{l.kind === 'badge' ? '角标' : '文字'}</span>
                    <span className="flex-1 text-xs truncate" style={{ color: 'var(--adm-text)' }}>{l.text}</span>
                    <button onClick={e => { e.stopPropagation(); setLayers(prev => { const arr = [...prev]; const i = arr.findIndex(x => x.id === l.id); if (i > 0) [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]]; return arr }) }} className="p-1 rounded" style={{ color: 'var(--adm-text-secondary)' }} title="上移">
                      <ChevronUp size={13} />
                    </button>
                    <button onClick={e => { e.stopPropagation(); setLayers(prev => { const arr = [...prev]; const i = arr.findIndex(x => x.id === l.id); if (i >= 0 && i < arr.length - 1) [arr[i], arr[i + 1]] = [arr[i + 1], arr[i]]; return arr }) }} className="p-1 rounded" style={{ color: 'var(--adm-text-secondary)' }} title="下移">
                      <ChevronDown size={13} />
                    </button>
                    <button onClick={e => { e.stopPropagation(); duplicateLayer(l.id) }} className="p-1 rounded" style={{ color: 'var(--adm-text-secondary)' }} title="复制">
                      <Copy size={12} />
                    </button>
                    <button onClick={e => { e.stopPropagation(); removeLayer(l.id) }} className="p-1 rounded" style={{ color: '#EF4444' }} title="删除">
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* 选中图层样式 */}
            {selected && (
              <div className="space-y-3 rounded-xl p-3" style={{ backgroundColor: 'var(--adm-card)', border: '1px solid var(--adm-border)' }}>
                <p className="text-xs font-semibold" style={{ color: 'var(--adm-text)' }}>图层样式</p>
                <input
                  type="text"
                  value={selected.text}
                  onChange={e => updateLayer(selected.id, { text: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg"
                  style={{ backgroundColor: 'var(--adm-input)', border: '1px solid var(--adm-input-border)', color: 'var(--adm-text)' }}
                />
                <div>
                  <label className="text-[11px] block mb-1" style={{ color: 'var(--adm-text-secondary)' }}>字号: {Math.round(selected.size * 10) / 10}%</label>
                  <input type="range" min={1.5} max={14} step={0.1} value={selected.size} onChange={e => updateLayer(selected.id, { size: Number(e.target.value) })} className="w-full" />
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <input type="color" value={selected.color} onChange={e => updateLayer(selected.id, { color: e.target.value })} className="w-9 h-9 rounded cursor-pointer" />
                  <select
                    value={selected.font}
                    onChange={e => updateLayer(selected.id, { font: e.target.value as TextLayer['font'] })}
                    className="flex-1 px-2 py-1.5 text-xs rounded-lg"
                    style={{ backgroundColor: 'var(--adm-input)', border: '1px solid var(--adm-input-border)', color: 'var(--adm-text)' }}
                  >
                    <option value="sans">无衬线</option>
                    <option value="serif">衬线</option>
                    <option value="impact">粗黑</option>
                    <option value="mono">等宽</option>
                  </select>
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--adm-text-secondary)' }}>
                    <input type="checkbox" checked={selected.bold} onChange={e => updateLayer(selected.id, { bold: e.target.checked })} /> 加粗
                  </label>
                  <label className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--adm-text-secondary)' }}>
                    <input type="checkbox" checked={selected.bg} onChange={e => updateLayer(selected.id, { bg: e.target.checked })} /> 深色底
                  </label>
                  <label className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--adm-text-secondary)' }}>
                    <input type="checkbox" checked={!!selected.outline} onChange={e => updateLayer(selected.id, { outline: e.target.checked })} /> 白描边
                  </label>
                  {selected.kind === 'badge' && (
                    <input type="color" value={selected.badgeBg || '#E4002B'} onChange={e => updateLayer(selected.id, { badgeBg: e.target.value })} className="w-8 h-8 rounded cursor-pointer" />
                  )}
                </div>
                <div className="flex gap-1.5">
                  {(['left', 'center', 'right'] as const).map(a => (
                    <button key={a} onClick={() => updateLayer(selected.id, { align: a })} className="flex-1 py-1 text-[11px] rounded" style={{ backgroundColor: selected.align === a ? 'var(--adm-accent)' : 'var(--adm-input)', color: selected.align === a ? 'var(--adm-accent-text)' : 'var(--adm-text-secondary)' }}>
                      {a === 'left' ? '左对齐' : a === 'center' ? '居中' : '右对齐'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-lg p-3 text-xs" style={{ backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.35)', color: '#DC2626' }}>
                {error}
              </div>
            )}

            {/* 导出 */}
            <div className="space-y-2">
              <button
                onClick={() => exportImage(false)}
                disabled={saving || !img}
                className="w-full py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ backgroundColor: 'var(--adm-accent)', color: 'var(--adm-accent-text)' }}
              >
                {saving ? <><Loader2 size={15} className="animate-spin" /> 保存中...</> : <><Save size={15} /> 保存并使用这张图</>}
              </button>
              <button
                onClick={() => exportImage(true)}
                disabled={saving || !img}
                className="w-full py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ backgroundColor: 'var(--adm-input)', border: '1px solid var(--adm-border)', color: 'var(--adm-text)' }}
              >
                <Download size={13} /> 下载 PNG
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
