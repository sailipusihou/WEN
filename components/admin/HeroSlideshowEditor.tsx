"use client"
import { useState, useRef } from "react"
import { Upload, Plus, X, GripVertical, ArrowLeft, ArrowRight, ImageIcon, Play, Pause } from "lucide-react"

function inputStyle() {
  return {
    width: "100%",
    padding: "0.5rem 0.75rem",
    borderRadius: "0.5rem",
    backgroundColor: "var(--adm-input)",
    border: "1px solid var(--adm-input-border)",
    fontSize: "0.8125rem",
    color: "var(--adm-text)",
    outline: "none",
  }
}

interface SlideItem {
  url: string
}

interface HeroSlideshowEditorProps {
  images: string[]
  enabled: boolean
  interval: number       // 秒
  transition: number     // ms
  kenBurns: boolean
  onChange: (patch: {
    backgroundImages: string[]
    slideshowEnabled: boolean
    slideshowInterval: number
    slideshowTransition: number
    kenBurnsEnabled: boolean
  }) => void
}

export default function HeroSlideshowEditor({
  images, enabled, interval, transition, kenBurns, onChange,
}: HeroSlideshowEditorProps) {
  const [uploading, setUploading] = useState(false)
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [dropIdx, setDropIdx] = useState<number | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const list = images || []

  const update = (patch: Partial<HeroSlideshowEditorProps>) => {
    onChange({
      backgroundImages: patch.images ?? list,
      slideshowEnabled: patch.enabled ?? enabled,
      slideshowInterval: patch.interval ?? interval,
      slideshowTransition: patch.transition ?? transition,
      kenBurnsEnabled: patch.kenBurns ?? kenBurns,
    })
  }

  // 上传多张图片
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    setUploading(true)
    try {
      const urls: string[] = []
      for (const file of files) {
        if (file.size > 10 * 1024 * 1024) { alert(`${file.name} 超过 10MB`); continue }
        const fd = new FormData(); fd.append("file", file)
        const res = await fetch("/api/upload", { method: "POST", body: fd })
        if (!res.ok) { try { const d = await res.json(); alert(d.error || "上传失败") } catch { alert("上传失败") }; continue }
        const d = await res.json()
        if (d.url) urls.push(d.url)
      }
      if (urls.length > 0) update({ images: [...list, ...urls] })
    } catch (err) {
      console.error(err); alert("上传失败")
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  const addByUrl = () => {
    const url = prompt("输入图片 URL:")
    if (url) update({ images: [...list, url] })
  }

  const removeAt = (i: number) => {
    if (!confirm("确定删除这张轮播图?")) return
    update({ images: list.filter((_, idx) => idx !== i) })
  }

  const moveItem = (from: number, to: number) => {
    if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return
    const next = [...list]
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item)
    update({ images: next })
  }

  // 拖拽排序
  const handleDragStart = (i: number) => setDragIdx(i)
  const handleDragOver = (e: React.DragEvent, i: number) => { e.preventDefault(); setDropIdx(i) }
  const handleDrop = (i: number) => {
    if (dragIdx !== null) moveItem(dragIdx, i)
    setDragIdx(null); setDropIdx(null)
  }

  return (
    <div className="space-y-4">
      {/* 启用开关 + 参数 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-lg"
        style={{ backgroundColor: "var(--adm-bg)", border: "1px solid var(--adm-border)" }}>
        {/* 启用轮播 */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium" style={{ color: "var(--adm-text)" }}>启用轮播</div>
            <div className="text-xs mt-0.5" style={{ color: "var(--adm-text-secondary)" }}>
              关闭则仅显示第一张图
            </div>
          </div>
          <button type="button" onClick={() => update({ enabled: !enabled })}
            className="px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{
              backgroundColor: enabled ? "var(--adm-accent-bg)" : "var(--adm-input)",
              color: enabled ? "var(--adm-accent)" : "var(--adm-text-secondary)",
              border: "1px solid " + (enabled ? "var(--adm-accent)" : "var(--adm-input-border)"),
            }}>
            {enabled ? "已启用" : "已禁用"}
          </button>
        </div>

        {/* Ken Burns 动效 */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium" style={{ color: "var(--adm-text)" }}>Ken Burns 缩放动效</div>
            <div className="text-xs mt-0.5" style={{ color: "var(--adm-text-secondary)" }}>
              图片缓慢缩放平移,呈现电影感
            </div>
          </div>
          <button type="button" onClick={() => update({ kenBurns: !kenBurns })}
            className="px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{
              backgroundColor: kenBurns ? "var(--adm-accent-bg)" : "var(--adm-input)",
              color: kenBurns ? "var(--adm-accent)" : "var(--adm-text-secondary)",
              border: "1px solid " + (kenBurns ? "var(--adm-accent)" : "var(--adm-input-border)"),
            }}>
            {kenBurns ? "已启用" : "已禁用"}
          </button>
        </div>

        {/* 每张展示秒数 */}
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--adm-text)" }}>
            每张展示时间 (秒)
          </label>
          <input type="number" min={3} max={30} value={interval}
            onChange={e => update({ interval: Math.max(3, Number(e.target.value) || 6) })}
            style={inputStyle()} />
        </div>

        {/* 切换过渡毫秒 */}
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--adm-text)" }}>
            切换过渡时间 (毫秒)
          </label>
          <input type="number" min={500} max={5000} step={100} value={transition}
            onChange={e => update({ transition: Math.max(500, Number(e.target.value) || 1500) })}
            style={inputStyle()} />
        </div>
      </div>

      {/* 当前轮播图列表 */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <ImageIcon size={13} style={{ color: "var(--adm-accent)" }} />
            <span className="text-sm font-medium" style={{ color: "var(--adm-text)" }}>
              轮播图列表 ({list.length} 张)
            </span>
            {list.length > 1 && enabled && (
              <span className="text-[10px] flex items-center gap-0.5 px-1.5 py-0.5 rounded"
                style={{ backgroundColor: "var(--adm-accent-bg)", color: "var(--adm-accent)" }}>
                <Play size={9} /> 轮播中
              </span>
            )}
            {list.length <= 1 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded"
                style={{ backgroundColor: "var(--adm-input)", color: "var(--adm-text-secondary)" }}>
                <Pause size={9} className="inline" /> 静止
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <button type="button" onClick={addByUrl}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs"
              style={{ backgroundColor: "var(--adm-input)", color: "var(--adm-text-secondary)", border: "1px solid var(--adm-input-border)" }}>
              <Plus size={11} /> URL
            </button>
            <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs text-white"
              style={{ backgroundColor: "var(--adm-accent)", border: "none", opacity: uploading ? 0.5 : 1 }}>
              <Upload size={11} /> {uploading ? "上传中..." : "上传图片"}
            </button>
          </div>
        </div>
        <input ref={fileRef} type="file" accept="image/*" multiple onChange={handleUpload} className="hidden" />

        {list.length === 0 ? (
          <div className="aspect-[16/4] rounded-lg flex flex-col items-center justify-center gap-2"
            style={{ backgroundColor: "var(--adm-bg)", border: "1px dashed var(--adm-input-border)", color: "var(--adm-text-secondary)" }}>
            <ImageIcon size={32} />
            <p className="text-xs">还没有轮播图,点击"上传图片"添加</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {list.map((url, i) => (
              <div key={i}
                draggable
                onDragStart={() => handleDragStart(i)}
                onDragOver={(e) => handleDragOver(e, i)}
                onDrop={() => handleDrop(i)}
                onDragEnd={() => { setDragIdx(null); setDropIdx(null) }}
                className="relative group rounded-lg overflow-hidden cursor-move"
                style={{
                  backgroundColor: "var(--adm-input)",
                  border: dropIdx === i ? "2px solid var(--adm-accent)" : "1px solid var(--adm-border)",
                  opacity: dragIdx === i ? 0.4 : 1,
                  transition: "opacity 0.15s, border-color 0.15s",
                }}>
                {/* 拖拽手柄 */}
                <div className="absolute top-1 left-1 z-10 p-1 rounded"
                  style={{ backgroundColor: "rgba(0,0,0,0.5)", color: "white" }}>
                  <GripVertical size={12} />
                </div>
                {/* 序号 */}
                <div className="absolute top-1 right-8 z-10 px-1.5 py-0.5 rounded text-[10px] font-bold"
                  style={{ backgroundColor: "rgba(0,0,0,0.6)", color: "white" }}>
                  {String(i + 1).padStart(2, "0")}
                </div>
                {/* 删除按钮 */}
                <button type="button" onClick={() => removeAt(i)}
                  className="absolute top-1 right-1 z-10 p-1 rounded"
                  style={{ backgroundColor: "rgba(239,68,68,0.9)", color: "white", border: "none", cursor: "pointer" }}>
                  <X size={12} />
                </button>
                {/* 图片 */}
                <div className="aspect-[16/9] bg-black/20">
                  <img src={url} alt={`Slide ${i + 1}`} className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.2" }} />
                </div>
                {/* 底部操作 */}
                <div className="flex items-center justify-between px-2 py-1.5"
                  style={{ backgroundColor: "var(--adm-bg)" }}>
                  <span className="text-[10px] truncate flex-1" style={{ color: "var(--adm-text-secondary)" }}>
                    {url.startsWith("/api/") ? "本地图片" : url.startsWith("http") ? "网络图片" : "相对路径"}
                  </span>
                  <div className="flex items-center gap-0.5">
                    <button type="button" onClick={() => moveItem(i, i - 1)} disabled={i === 0}
                      className="p-0.5 rounded disabled:opacity-30"
                      style={{ color: "var(--adm-text-secondary)", background: "none", border: "none", cursor: "pointer" }}>
                      <ArrowLeft size={12} />
                    </button>
                    <button type="button" onClick={() => moveItem(i, i + 1)} disabled={i === list.length - 1}
                      className="p-0.5 rounded disabled:opacity-30"
                      style={{ color: "var(--adm-text-secondary)", background: "none", border: "none", cursor: "pointer" }}>
                      <ArrowRight size={12} />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {/* 添加按钮 */}
            <button type="button" onClick={() => fileRef.current?.click()}
              className="aspect-[16/9] rounded-lg flex flex-col items-center justify-center gap-1.5"
              style={{ backgroundColor: "var(--adm-bg)", border: "1px dashed var(--adm-input-border)", color: "var(--adm-text-secondary)", cursor: "pointer" }}>
              <Plus size={20} />
              <span className="text-xs">添加图片</span>
            </button>
          </div>
        )}

        {list.length > 1 && (
          <p className="text-[11px] mt-2 flex items-center gap-1" style={{ color: "var(--adm-text-secondary)" }}>
            <GripVertical size={10} /> 拖拽图片可调整顺序 · 第一张为默认封面
          </p>
        )}
      </div>
    </div>
  )
}
