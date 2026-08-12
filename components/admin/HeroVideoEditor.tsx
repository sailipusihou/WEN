"use client"
import { useState, useRef } from "react"
import {
  Upload, X, Video, Play, Pause, Volume2, VolumeX, RefreshCw,
  Maximize2, Link2, GripVertical, ArrowLeft, ArrowRight,
  Sun, Thermometer,
} from "lucide-react"

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

interface HeroVideoEditorProps {
  videos: string[]        // 多视频数组
  enabled: boolean
  slideshowEnabled: boolean
  slideshowInterval: number // 每个视频展示秒数
  loop: boolean
  muted: boolean
  autoplay: boolean
  controls: boolean
  fit: 'cover' | 'contain'
  // 颜色与对比度调节
  colorTint: string
  colorTintOpacity: number
  brightness: number
  contrast: number
  saturation: number
  blur: number
  temperature: number
  onChange: (patch: {
    backgroundVideos?: string[]
    backgroundVideo?: string
    videoEnabled?: boolean
    videoSlideshowEnabled?: boolean
    videoSlideshowInterval?: number
    videoLoop?: boolean
    videoMuted?: boolean
    videoAutoplay?: boolean
    videoControls?: boolean
    videoFit?: 'cover' | 'contain'
    heroColorTint?: string
    heroColorTintOpacity?: number
    heroBrightness?: number
    heroContrast?: number
    heroSaturation?: number
    heroBlur?: number
    heroTemperature?: number
  }) => void
}

export default function HeroVideoEditor({
  videos, enabled, slideshowEnabled, slideshowInterval,
  loop, muted, autoplay, controls, fit,
  colorTint, colorTintOpacity, brightness, contrast, saturation, blur,
  temperature,
  onChange,
}: HeroVideoEditorProps) {
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [dropIdx, setDropIdx] = useState<number | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const posterRef = useRef<HTMLInputElement>(null)

  const list = Array.isArray(videos) ? videos.filter(Boolean) : []

  const update = (patch: Parameters<HeroVideoEditorProps['onChange']>[0]) => {
    const next: Parameters<HeroVideoEditorProps['onChange']>[0] = { ...patch }
    // 同步 backgroundVideo 为第一个(兼容旧代码)
    if (patch.backgroundVideos) {
      if (patch.backgroundVideos.length > 0) {
        next.backgroundVideo = patch.backgroundVideos[0]
      } else {
        next.backgroundVideo = ""
      }
    }
    onChange(next)
  }

  // 上传多个视频 (XHR 显示进度)
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    setUploading(true); setUploadProgress(0)
    const newUrls: string[] = []
    let completed = 0
    try {
      for (const file of files) {
        if (file.size > 50 * 1024 * 1024) { alert(`${file.name} 超过 50MB`); continue }
        const fd = new FormData(); fd.append("file", file); fd.append("type", "video")
        const url = await new Promise<string>((resolve, reject) => {
          const xhr = new XMLHttpRequest()
          xhr.open("POST", "/api/upload")
          xhr.upload.onprogress = (ev) => {
            if (ev.lengthComputable) {
              const overall = (completed + (ev.loaded / ev.total)) / files.length
              setUploadProgress(Math.round(overall * 100))
            }
          }
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              try { const d = JSON.parse(xhr.responseText); resolve(d.url || "") }
              catch { reject(new Error("Invalid response")) }
            } else {
              try { const d = JSON.parse(xhr.responseText); reject(new Error(d.error || `Upload failed (${xhr.status})`)) }
              catch { reject(new Error(`Upload failed (${xhr.status})`)) }
            }
          }
          xhr.onerror = () => reject(new Error("Network error"))
          xhr.send(fd)
        })
        if (url) newUrls.push(url)
        completed++
        setUploadProgress(Math.round((completed / files.length) * 100))
      }
      if (newUrls.length > 0) update({ backgroundVideos: [...list, ...newUrls] })
    } catch (err: any) {
      console.error(err); alert(err?.message || "上传失败")
    } finally {
      setUploading(false); setUploadProgress(0)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  const addByUrl = () => {
    const url = prompt("输入视频 URL (mp4/webm/mov/ogg):")
    if (url) update({ backgroundVideos: [...list, url] })
  }

  const removeAt = (i: number) => {
    if (!confirm("确定删除这个视频? 这不会删除服务器上的文件,只是从轮播中移除。")) return
    update({ backgroundVideos: list.filter((_, idx) => idx !== i) })
  }

  const moveItem = (from: number, to: number) => {
    if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return
    const next = [...list]
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item)
    update({ backgroundVideos: next })
  }

  const handleDragStart = (i: number) => setDragIdx(i)
  const handleDragOver = (e: React.DragEvent, i: number) => { e.preventDefault(); setDropIdx(i) }
  const handleDrop = (i: number) => {
    if (dragIdx !== null) moveItem(dragIdx, i)
    setDragIdx(null); setDropIdx(null)
  }

  const multiVideo = list.length > 1

  const getTemperatureFilter = (temp: number) => {
    const t = (temp - 50) / 50
    if (t < 0) {
      const coldIntensity = Math.abs(t)
      return `hue-rotate(${coldIntensity * 15}deg) saturate(${1 - coldIntensity * 0.2})`
    } else {
      const warmIntensity = t
      return `sepia(${warmIntensity * 0.25}) hue-rotate(${-warmIntensity * 12}deg) saturate(${1 + warmIntensity * 0.15})`
    }
  }

  return (
    <div className="space-y-5">
      {/* 启用开关 + 核心参数 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-lg"
        style={{ backgroundColor: "var(--adm-bg)", border: "1px solid var(--adm-border)" }}>
        {/* 启用视频背景 */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium flex items-center gap-1.5" style={{ color: "var(--adm-text)" }}>
              <Video size={13} style={{ color: "var(--adm-accent)" }} />
              启用视频背景
            </div>
            <div className="text-xs mt-0.5" style={{ color: "var(--adm-text-secondary)" }}>
              启用后视频将覆盖图片轮播层
            </div>
          </div>
          <button type="button" onClick={() => onChange({ videoEnabled: !enabled })}
            className="px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{
              backgroundColor: enabled ? "var(--adm-accent-bg)" : "var(--adm-input)",
              color: enabled ? "var(--adm-accent)" : "var(--adm-text-secondary)",
              border: "1px solid " + (enabled ? "var(--adm-accent)" : "var(--adm-input-border)"),
            }}>
            {enabled ? "已启用" : "已禁用"}
          </button>
        </div>

        {/* 自动播放 */}
        <ToggleRow icon={<Play size={12} />} label="自动播放" desc="页面加载即播放" value={autoplay}
          onChange={(v) => onChange({ videoAutoplay: v })} />

        {/* 循环 (仅单视频模式显示, 多视频轮播时自动循环) */}
        {!multiVideo && (
          <ToggleRow icon={<RefreshCw size={12} />} label="循环播放" desc="播放结束后自动重头开始" value={loop}
            onChange={(v) => onChange({ videoLoop: v })} />
        )}

        {/* 静音 */}
        <ToggleRow icon={muted ? <VolumeX size={12} /> : <Volume2 size={12} />} label="静音" desc="浏览器要求自动播放必须静音" value={muted}
          onChange={(v) => onChange({ videoMuted: v })} />

        {/* 显示控制条 */}
        <ToggleRow icon={<Pause size={12} />} label="显示控制条" desc="背景视频建议关闭" value={controls}
          onChange={(v) => onChange({ videoControls: v })} />

        {/* 填充模式 */}
        <div>
          <div className="text-sm font-medium flex items-center gap-1.5 mb-1.5" style={{ color: "var(--adm-text)" }}>
            <Maximize2 size={12} style={{ color: "var(--adm-accent)" }} />
            填充模式
          </div>
          <div className="flex gap-1.5">
            {(['cover', 'contain'] as const).map((m) => (
              <button key={m} type="button" onClick={() => onChange({ videoFit: m })}
                className="flex-1 px-2 py-1.5 rounded-md text-xs font-medium"
                style={{
                  backgroundColor: fit === m ? "var(--adm-accent-bg)" : "var(--adm-input)",
                  color: fit === m ? "var(--adm-accent)" : "var(--adm-text-secondary)",
                  border: "1px solid " + (fit === m ? "var(--adm-accent)" : "var(--adm-input-border)"),
                }}>
                {m === 'cover' ? 'cover (填满)' : 'contain (完整)'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 视频轮播参数 (多视频时显示) */}
      {multiVideo && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-lg"
          style={{ backgroundColor: "var(--adm-bg)", border: "1px solid var(--adm-border)" }}>
          <ToggleRow
            icon={<Play size={12} />}
            label="启用视频轮播"
            desc="多视频时自动切换"
            value={slideshowEnabled}
            onChange={(v) => onChange({ videoSlideshowEnabled: v })}
          />
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--adm-text)" }}>
              每个视频展示时间 (秒)
            </label>
            <input type="number" min={5} max={60} value={slideshowInterval}
              onChange={e => onChange({ videoSlideshowInterval: Math.max(5, Number(e.target.value) || 8) })}
              style={inputStyle()} />
          </div>
        </div>
      )}

      {/* 视频列表 */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <Video size={13} style={{ color: "var(--adm-accent)" }} />
            <span className="text-sm font-medium" style={{ color: "var(--adm-text)" }}>
              视频列表 ({list.length} 个)
            </span>
            {multiVideo && slideshowEnabled && (
              <span className="text-[10px] flex items-center gap-0.5 px-1.5 py-0.5 rounded"
                style={{ backgroundColor: "var(--adm-accent-bg)", color: "var(--adm-accent)" }}>
                <Play size={9} /> 轮播中
              </span>
            )}
            {list.length <= 1 && list.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded"
                style={{ backgroundColor: "var(--adm-input)", color: "var(--adm-text-secondary)" }}>
                单视频
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <button type="button" onClick={addByUrl}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs"
              style={{ backgroundColor: "var(--adm-input)", color: "var(--adm-text-secondary)", border: "1px solid var(--adm-input-border)" }}>
              <Link2 size={11} /> URL
            </button>
            <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs text-white"
              style={{ backgroundColor: "var(--adm-accent)", border: "none", opacity: uploading ? 0.5 : 1 }}>
              <Upload size={11} /> {uploading ? `上传中 ${uploadProgress}%` : "上传视频"}
            </button>
          </div>
        </div>
        <input ref={fileRef} type="file" accept="video/mp4,video/webm,video/quicktime,video/ogg,.mp4,.webm,.mov,.ogg,.ogv" multiple onChange={handleUpload} className="hidden" />

        {/* 上传进度条 */}
        {uploading && (
          <div className="mb-3 p-3 rounded-lg" style={{ backgroundColor: "var(--adm-bg)", border: "1px solid var(--adm-border)" }}>
            <div className="flex items-center justify-between text-xs mb-1.5" style={{ color: "var(--adm-text-secondary)" }}>
              <span>正在上传视频...</span>
              <span style={{ color: "var(--adm-accent)" }}>{uploadProgress}%</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "var(--adm-input-border)" }}>
              <div className="h-full transition-all duration-200"
                style={{ width: `${uploadProgress}%`, backgroundColor: "var(--adm-accent)" }} />
            </div>
          </div>
        )}

        {/* 视频网格 */}
        {list.length === 0 ? (
          <div className="aspect-video rounded-lg flex flex-col items-center justify-center gap-2"
            style={{ backgroundColor: "var(--adm-bg)", border: "1px dashed var(--adm-input-border)", color: "var(--adm-text-secondary)" }}>
            <Video size={36} />
            <p className="text-xs">还没有视频,点击"上传视频"添加</p>
            <p className="text-[10px]">支持 MP4 / WebM / MOV / OGG,单个最大 50MB</p>
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
                {/* 视频预览 */}
                <div className="aspect-video bg-black flex items-center justify-center">
                  <video
                    src={url}
                    muted
                    loop
                    playsInline
                    className="w-full h-full"
                    style={{ objectFit: fit, filter: `brightness(${brightness}%) ${getTemperatureFilter(temperature)}` }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLVideoElement).play().catch(() => {}) }}
                    onMouseLeave={(e) => { const v = e.currentTarget as HTMLVideoElement; v.pause(); v.currentTime = 0 }}
                  />
                </div>
                {/* 底部操作 */}
                <div className="flex items-center justify-between px-2 py-1.5"
                  style={{ backgroundColor: "var(--adm-bg)" }}>
                  <span className="text-[10px] truncate flex-1" style={{ color: "var(--adm-text-secondary)" }}>
                    {url.startsWith("/api/") ? "本地视频" : url.startsWith("http") ? "网络视频" : "相对路径"}
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
              className="aspect-video rounded-lg flex flex-col items-center justify-center gap-1.5"
              style={{ backgroundColor: "var(--adm-bg)", border: "1px dashed var(--adm-input-border)", color: "var(--adm-text-secondary)", cursor: "pointer" }}>
              <Upload size={20} />
              <span className="text-xs">添加视频</span>
            </button>
          </div>
        )}

        {list.length > 1 && (
          <p className="text-[11px] mt-2 flex items-center gap-1" style={{ color: "var(--adm-text-secondary)" }}>
            <GripVertical size={10} /> 拖拽视频可调整顺序 · 第一个为默认播放
          </p>
        )}
      </div>

      {/* 主页展示亮度控制 */}
      <div>
        <div className="flex items-center gap-1.5 mb-3">
          <Sun size={13} style={{ color: "var(--adm-accent)" }} />
          <span className="text-sm font-medium" style={{ color: "var(--adm-text)" }}>
            主页展示亮度
          </span>
        </div>
        <div className="p-4 rounded-lg"
          style={{ backgroundColor: "var(--adm-bg)", border: "1px solid var(--adm-border)" }}>
          <RangeSlider label="背景亮度" min={20} max={200} value={brightness}
            onChange={(v) => onChange({ heroBrightness: v })} icon={<Sun size={11} />} unit="%" />
          <p className="text-[11px] mt-2" style={{ color: "var(--adm-text-secondary)" }}>
            调节主页 Hero 区背景的明暗程度。100% 为原图,低于 100 变暗(文字更突出),高于 100 变亮。
          </p>
          <div className="mt-4 pt-4 border-t" style={{ borderColor: "var(--adm-border)" }}>
            <RangeSlider label="色温调节" min={0} max={100} value={temperature}
              onChange={(v) => onChange({ heroTemperature: v })} icon={<Thermometer size={11} />} 
              unit="%" 
              minLabel="冷" 
              maxLabel="暖" />
            <p className="text-[11px] mt-2" style={{ color: "var(--adm-text-secondary)" }}>
              调节画面色温。50% 为正常,向左偏冷(蓝色调),向右偏暖(黄色调)。
            </p>
          </div>
        </div>

        {/* 实时预览 */}
        <div className="mt-3 p-3 rounded-lg" style={{ backgroundColor: "var(--adm-bg)", border: "1px solid var(--adm-border)" }}>
          <p className="text-[11px] mb-2" style={{ color: "var(--adm-text-secondary)" }}>
            实时预览 (视频 + 亮度效果)
          </p>
          <div className="relative aspect-video rounded-lg overflow-hidden"
            style={{ backgroundColor: "#000" }}>
            {list[0] ? (
              <video
                src={list[0]}
                muted
                loop
                autoPlay
                playsInline
                className="absolute inset-0 w-full h-full"
                style={{
                  objectFit: fit,
                  filter: `brightness(${brightness}%) ${getTemperatureFilter(temperature)}`,
                }}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-white/50 text-xs">上传视频后预览</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 提示信息 */}
      <div className="p-3 rounded-lg flex items-start gap-2"
        style={{ backgroundColor: "var(--adm-bg)", border: "1px solid var(--adm-border)", color: "var(--adm-text-secondary)" }}>
        <Video size={14} className="shrink-0 mt-0.5" style={{ color: "var(--adm-accent)" }} />
        <div className="text-[11px] leading-relaxed">
          <p className="font-medium mb-1" style={{ color: "var(--adm-text)" }}>视频背景建议</p>
          <ul className="space-y-0.5 list-disc pl-4">
            <li>使用 <b>静音 + 自动播放</b> 以获得最佳背景效果</li>
            <li>建议分辨率 1920×1080, 码率不超过 2Mbps, 时长 10-30 秒</li>
            <li>WebM 比 MP4 体积更小, 适合现代浏览器</li>
            <li>调低 <b>背景亮度</b> 可以让前景文字更清晰</li>
            <li>多视频时自动轮播, 鼠标悬停视频卡片可预览播放</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

function ToggleRow({ icon, label, desc, value, onChange }: {
  icon: React.ReactNode
  label: string
  desc: string
  value: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="text-sm font-medium flex items-center gap-1.5" style={{ color: "var(--adm-text)" }}>
          <span style={{ color: "var(--adm-accent)" }}>{icon}</span>
          {label}
        </div>
        <div className="text-xs mt-0.5" style={{ color: "var(--adm-text-secondary)" }}>{desc}</div>
      </div>
      <button type="button" onClick={() => onChange(!value)}
        className="px-3 py-1.5 rounded-lg text-xs font-medium"
        style={{
          backgroundColor: value ? "var(--adm-accent-bg)" : "var(--adm-input)",
          color: value ? "var(--adm-accent)" : "var(--adm-text-secondary)",
          border: "1px solid " + (value ? "var(--adm-accent)" : "var(--adm-input-border)"),
        }}>
        {value ? "已启用" : "已禁用"}
      </button>
    </div>
  )
}

function RangeSlider({ value, onChange, min = 0, max = 100, label, icon, unit = "", minLabel, maxLabel }: {
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  label: string
  icon?: React.ReactNode
  unit?: string
  minLabel?: string
  maxLabel?: string
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-xs font-medium flex items-center gap-1" style={{ color: "var(--adm-text)" }}>
          {icon && <span style={{ color: "var(--adm-accent)" }}>{icon}</span>}
          {label}
        </label>
        <span className="text-[11px] font-medium" style={{ color: "var(--adm-accent)" }}>
          {value}{unit}
        </span>
      </div>
      <div className="relative">
        <input type="range" min={min} max={max} value={value}
          onChange={e => onChange(Number(e.target.value))}
          className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
          style={{ backgroundColor: "var(--adm-input-border)", accentColor: "var(--adm-accent)" }} />
        {minLabel && (
          <span className="absolute -left-6 top-0 text-[9px]" style={{ color: "var(--adm-text-secondary)" }}>
            {minLabel}
          </span>
        )}
        {maxLabel && (
          <span className="absolute -right-6 top-0 text-[9px]" style={{ color: "var(--adm-text-secondary)" }}>
            {maxLabel}
          </span>
        )}
      </div>
    </div>
  )
}
