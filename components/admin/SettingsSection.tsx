"use client"
import { useState, useRef } from "react"
import { Upload, Sun, Contrast, Plus, X } from "lucide-react"

function inputStyle() {
  return {
    width: "100%",
    padding: "0.625rem 1rem",
    borderRadius: "0.5rem",
    backgroundColor: "var(--adm-input)",
    border: "1px solid var(--adm-input-border)",
    fontSize: "0.875rem",
    color: "var(--adm-text)",
    outline: "none",
    transition: "border-color 0.15s, box-shadow 0.15s",
  }
}

export function Section({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl overflow-hidden adm-panel-card" style={{ backgroundColor: "var(--adm-card)", border: "1px solid var(--adm-border)" }}>
      <div className="flex items-center gap-2 px-6 py-4" style={{ borderBottom: "1px solid var(--adm-border)" }}>
        <Icon size={16} style={{ color: "var(--adm-accent)" }} />
        <h2 className="text-sm font-semibold" style={{ color: "var(--adm-text)" }}>{title}</h2>
      </div>
      <div className="p-6 space-y-5">{children}</div>
    </div>
  )
}

export function Field({ label, desc, children }: { label: string; desc?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-0.5" style={{ color: "var(--adm-text)" }}>{label}</label>
      {desc && <p className="text-xs mb-2" style={{ color: "var(--adm-text-secondary)" }}>{desc}</p>}
      {children}
    </div>
  )
}

export function Input({ value, onChange, placeholder, type = "text", className = "" }: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string; className?: string }) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className={className}
      style={inputStyle()}
      onFocus={e => { e.target.style.borderColor = "var(--adm-accent)"; e.target.style.boxShadow = "0 0 0 2px rgba(129,140,248,0.15)" }}
      onBlur={e => { e.target.style.borderColor = "var(--adm-input-border)"; e.target.style.boxShadow = "none" }}
    />
  )
}

export function Textarea({ value, onChange, placeholder, rows = 3 }: { value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      style={{ ...inputStyle(), resize: "vertical", minHeight: "4rem" }}
    />
  )
}

export function ImageUploader({ value, onChange, label = "Upload Image", previewFilter, previewOverlay, previewWarmth }: { value: string; onChange: (v: string) => void; label?: string; previewFilter?: string; previewOverlay?: string; previewWarmth?: string }) {
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const [previewError, setPreviewError] = useState(false)

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    if (file.size > 10 * 1024 * 1024) { alert("File too large (max 10MB)"); return }
    setUploading(true)
    try {
      const fd = new FormData(); fd.append("file", file)
      const res = await fetch("/api/upload", { method: "POST", body: fd })
      if (!res.ok) {
        let errMsg = "Upload failed"
        try { const d = await res.json(); errMsg = d.error || errMsg } catch {}
        alert(errMsg); setUploading(false); return
      }
      const d = await res.json()
      if (!d.url) { alert("Upload returned no URL"); setUploading(false); return }
      // Set the URL immediately via callback
      onChange(d.url)
      setPreviewError(false)
    } catch (e) {
      console.error("Upload error:", e)
      alert("Upload failed")
    }
    finally { setUploading(false) }
    // Reset file input after everything
    if (fileRef.current) fileRef.current.value = ""
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <input
          type="text"
          value={value}
          onChange={e => { onChange(e.target.value); setPreviewError(false) }}
          placeholder="Image URL or upload a file"
          style={{ ...inputStyle(), flex: 1 }}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1 shrink-0"
          style={{
            padding: "0.5rem 0.75rem",
            borderRadius: "0.5rem",
            backgroundColor: "var(--adm-accent)",
            color: "#fff",
            fontSize: "0.75rem",
            border: "none",
            cursor: "pointer",
            opacity: uploading ? 0.5 : 1,
            whiteSpace: "nowrap",
          }}
        >
          {uploading ? "Uploading..." : <><Upload size={12} /> {label}</>}
        </button>
      </div>
      <input ref={fileRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />
      {value && (
        <div className="relative aspect-[16/9] rounded-lg overflow-hidden" style={{ backgroundColor: "var(--adm-input)", border: "1px solid var(--adm-border)" }}>
          {previewError ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-xs" style={{ color: "var(--adm-text-secondary)" }}>Preview unavailable</p>
            </div>
          ) : (
            <>
              <img
                src={value}
                alt="Preview"
                className="w-full h-full object-cover"
                style={{ filter: previewFilter || "none" }}
                onError={() => { console.warn("Image load error:", value); setPreviewError(true); }}
                onLoad={() => { setPreviewError(false); }}
              />
              {previewOverlay && (
                <div className="absolute inset-0" style={{ backgroundColor: previewOverlay }} />
              )}
              {previewWarmth && (
                <div className="absolute inset-0" style={{ backgroundColor: previewWarmth }} />
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

export function RangeSlider({ value, onChange, min = 0, max = 100, label, icon: Icon }: { value: number; onChange: (v: number) => void; min?: number; max?: number; label: string; icon?: any }) {
  return (
    <div className="flex items-center gap-3">
      {Icon && <Icon size={14} style={{ color: "var(--adm-text-secondary)" }} />}
      <span className="text-xs w-16 shrink-0" style={{ color: "var(--adm-text-secondary)" }}>{label}</span>
      <input type="range" min={min} max={max} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer"
        style={{ backgroundColor: "var(--adm-input-border)", accentColor: "var(--adm-accent)" }} />
      <input type="number" min={min} max={max} value={value}
        onChange={e => onChange(Math.max(min, Math.min(max, Number(e.target.value) || min)))}
        style={{ ...inputStyle(), width: "4rem", padding: "0.25rem 0.5rem", textAlign: "center", fontSize: "0.75rem" }} />
    </div>
  )
}

export function ImageToneControls({ value, onChange }: { value: { brightness: number; contrast: number; warmth: number; saturation: number }; onChange: (v: any) => void }) {
  return (
    <div className="grid grid-cols-2 gap-3 p-4 rounded-lg" style={{ backgroundColor: "var(--adm-bg)", border: "1px solid var(--adm-border)" }}>
      <RangeSlider value={value.brightness} onChange={v => onChange({ ...value, brightness: v })} label="Brightness" icon={Sun} />
      <RangeSlider value={value.contrast} onChange={v => onChange({ ...value, contrast: v })} label="Contrast" icon={Contrast} />
      <RangeSlider value={value.warmth} onChange={v => onChange({ ...value, warmth: v })} label="Warmth" icon={Sun} />
      <RangeSlider value={value.saturation} onChange={v => onChange({ ...value, saturation: v })} label="Saturation" icon={Contrast} />
    </div>
  )
}

export function VideoUploader({ value, onChange, label = "Upload Video" }: { value: string; onChange: (v: string) => void; label?: string }) {
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    if (file.size > 50 * 1024 * 1024) { alert("File too large (max 50MB)"); return }
    setUploading(true)
    try {
      const fd = new FormData(); fd.append("file", file); fd.append("type", "video")
      const res = await fetch("/api/upload", { method: "POST", body: fd })
      if (!res.ok) {
        let errMsg = "Upload failed"
        try { const d = await res.json(); errMsg = d.error || errMsg } catch {}
        alert(errMsg); setUploading(false); return
      }
      const d = await res.json()
      if (!d.url) { alert("Upload returned no URL"); setUploading(false); return }
      onChange(d.url)
    } catch (e) {
      console.error("Upload error:", e)
      alert("Upload failed")
    } finally { setUploading(false) }
    if (fileRef.current) fileRef.current.value = ""
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="Video URL or upload a file"
          style={{ ...inputStyle(), flex: 1 }}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1 shrink-0"
          style={{
            padding: "0.5rem 0.75rem",
            borderRadius: "0.5rem",
            backgroundColor: "var(--adm-accent)",
            color: "#fff",
            fontSize: "0.75rem",
            border: "none",
            cursor: "pointer",
            opacity: uploading ? 0.5 : 1,
            whiteSpace: "nowrap",
          }}
        >
          {uploading ? "Uploading..." : <><Upload size={12} /> {label}</>}
        </button>
      </div>
      <input ref={fileRef} type="file" accept="video/mp4,video/webm,video/quicktime,video/ogg,.mp4,.webm,.mov,.ogg,.ogv" onChange={handleUpload} className="hidden" />
      {value && (
        <div className="relative aspect-video rounded-lg overflow-hidden" style={{ backgroundColor: "#000" }}>
          <video src={value} muted loop playsInline className="w-full h-full object-cover" />
        </div>
      )}
    </div>
  )
}

export function CollectionEditor({ items, onChange, slideshowEnabled, slideshowInterval, onSlideshowChange }: { items: any[]; onChange: (items: any[]) => void; slideshowEnabled?: boolean; slideshowInterval?: number; onSlideshowChange?: (key: string, value: any) => void }) {
  const addItem = () => onChange([...items, { title: "", subtitle: "", slug: "", image: "", description: "", video: "", videoEnabled: false, videoLoop: true, videoMuted: true, videoAutoplay: true, heroBrightness: 100, heroTemperature: 50 }])
  const removeItem = (i: number) => onChange(items.filter((_, idx) => idx !== i))
  const updateItem = (i: number, field: string, val: any) => {
    const next = [...items]; next[i] = { ...next[i], [field]: val }; onChange(next)
  }

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-lg" style={{ backgroundColor: "var(--adm-bg)", border: "1px solid var(--adm-border)" }}>
        <p className="text-xs font-medium mb-3" style={{ color: "var(--adm-text)" }}>轮播设置</p>
        <div className="flex items-center gap-4">
          <button type="button" onClick={() => onSlideshowChange?.("collectionsSlideshowEnabled", !slideshowEnabled)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{
              backgroundColor: slideshowEnabled ? "var(--adm-accent-bg)" : "var(--adm-input)",
              color: slideshowEnabled ? "var(--adm-accent)" : "var(--adm-text-secondary)",
              border: "1px solid " + (slideshowEnabled ? "var(--adm-accent)" : "var(--adm-input-border)"),
              cursor: "pointer",
            }}>
            {slideshowEnabled ? "轮播已启用" : "轮播已禁用"}
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: "var(--adm-text-secondary)" }}>间隔:</span>
            <input
              type="number"
              min="2"
              max="60"
              value={slideshowInterval ?? 6}
              onChange={e => onSlideshowChange?.("collectionsSlideshowInterval", Number(e.target.value))}
              className="w-20 px-3 py-1.5 rounded-lg text-xs"
              style={{ backgroundColor: "var(--adm-input)", border: "1px solid var(--adm-input-border)", color: "var(--adm-text)" }}
            />
            <span className="text-xs" style={{ color: "var(--adm-text-secondary)" }}>秒</span>
          </div>
        </div>
      </div>
      {items.map((item, i) => (
        <div key={i} className="p-4 rounded-lg space-y-3 relative" style={{ backgroundColor: "var(--adm-bg)", border: "1px solid var(--adm-border)" }}>
          <button type="button" onClick={() => removeItem(i)}
            style={{ position: "absolute", top: "0.75rem", right: "0.75rem", padding: "0.25rem", borderRadius: "0.25rem", color: "#ef4444", background: "none", border: "none", cursor: "pointer" }}>
            <X size={14} />
          </button>
          <div className="grid grid-cols-2 gap-3">
            <Input value={item.title} onChange={v => updateItem(i, "title", v)} placeholder="Title" />
            <Input value={item.subtitle} onChange={v => updateItem(i, "subtitle", v)} placeholder="Subtitle" />
            <Input value={item.slug} onChange={v => updateItem(i, "slug", v)} placeholder="Slug (e.g. cultural-gifts)" />
            <Input value={item.description} onChange={v => updateItem(i, "description", v)} placeholder="Description" />
          </div>
          <ImageUploader value={item.image} onChange={v => updateItem(i, "image", v)} label="Image" />
          
          <div className="pt-3 border-t" style={{ borderColor: "var(--adm-border)" }}>
            <p className="text-xs font-medium mb-2" style={{ color: "var(--adm-text)" }}>视频背景 (可选)</p>
            <button type="button" onClick={() => updateItem(i, "videoEnabled", !item.videoEnabled)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium mb-3"
              style={{
                backgroundColor: item.videoEnabled ? "var(--adm-accent-bg)" : "var(--adm-input)",
                color: item.videoEnabled ? "var(--adm-accent)" : "var(--adm-text-secondary)",
                border: "1px solid " + (item.videoEnabled ? "var(--adm-accent)" : "var(--adm-input-border)"),
                cursor: "pointer",
              }}>
              {item.videoEnabled ? "视频已启用" : "视频已禁用"}
            </button>
            {item.videoEnabled && (
              <>
                <VideoUploader value={item.video || ""} onChange={v => updateItem(i, "video", v)} label="Video" />
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <RangeSlider value={item.heroBrightness ?? 100} onChange={v => updateItem(i, "heroBrightness", v)} label="Brightness" icon={Sun} min={20} max={200} />
                  <RangeSlider value={item.heroTemperature ?? 50} onChange={v => updateItem(i, "heroTemperature", v)} label="Temperature" icon={Sun} min={0} max={100} />
                </div>
              </>
            )}
          </div>
        </div>
      ))}
      <button type="button" onClick={addItem}
        className="w-full py-2.5 rounded-lg border border-dashed text-sm flex items-center justify-center gap-1"
        style={{ borderColor: "var(--adm-input-border)", color: "var(--adm-text-secondary)", backgroundColor: "transparent", cursor: "pointer" }}>
        <Plus size={14} /> Add Collection
      </button>
    </div>
  )
}

export function JournalEditor({ entries, onChange }: { entries: any[]; onChange: (entries: any[]) => void }) {
  const addEntry = () => onChange([...entries, { image: "", date: "", readTime: "", title: "", excerpt: "", link: "" }])
  const removeEntry = (i: number) => onChange(entries.filter((_, idx) => idx !== i))
  const updateEntry = (i: number, field: string, val: any) => {
    const next = [...entries]; next[i] = { ...next[i], [field]: val }; onChange(next)
  }

  return (
    <div className="space-y-4">
      {entries.map((e, i) => (
        <div key={i} className="p-4 rounded-lg space-y-3 relative" style={{ backgroundColor: "var(--adm-bg)", border: "1px solid var(--adm-border)" }}>
          <button type="button" onClick={() => removeEntry(i)}
            style={{ position: "absolute", top: "0.75rem", right: "0.75rem", padding: "0.25rem", borderRadius: "0.25rem", color: "#ef4444", background: "none", border: "none", cursor: "pointer" }}>
            <X size={14} />
          </button>
          <div className="grid grid-cols-3 gap-3">
            <Input value={e.date} onChange={v => updateEntry(i, "date", v)} placeholder="Date (Jun 2026)" />
            <Input value={e.readTime} onChange={v => updateEntry(i, "readTime", v)} placeholder="Read time (min)" />
            <Input value={e.link} onChange={v => updateEntry(i, "link", v)} placeholder="Link" />
          </div>
          <Input value={e.title} onChange={v => updateEntry(i, "title", v)} placeholder="Title" />
          <Textarea value={e.excerpt} onChange={v => updateEntry(i, "excerpt", v)} placeholder="Excerpt" rows={2} />
          <ImageUploader value={e.image} onChange={v => updateEntry(i, "image", v)} label="Cover Image" />
        </div>
      ))}
      <button type="button" onClick={addEntry}
        className="w-full py-2.5 rounded-lg border border-dashed text-sm flex items-center justify-center gap-1"
        style={{ borderColor: "var(--adm-input-border)", color: "var(--adm-text-secondary)", backgroundColor: "transparent", cursor: "pointer" }}>
        <Plus size={14} /> Add Journal Entry
      </button>
    </div>
  )
}

export function QuoteEditor({ quotes, onChange }: { quotes: { quote: string; author: string }[]; onChange: (q: { quote: string; author: string }[]) => void }) {
  const addQuote = () => onChange([...quotes, { quote: "", author: "" }])
  const removeQuote = (i: number) => onChange(quotes.filter((_, idx) => idx !== i))
  const updateQuote = (i: number, field: string, val: string) => {
    const next = [...quotes]; next[i] = { ...next[i], [field]: val }; onChange(next)
  }

  return (
    <div className="space-y-3">
      {quotes.map((q, i) => (
        <div key={i} className="p-3 rounded-lg space-y-2 relative" style={{ backgroundColor: "var(--adm-bg)", border: "1px solid var(--adm-border)" }}>
          <button type="button" onClick={() => removeQuote(i)}
            style={{ position: "absolute", top: "0.5rem", right: "0.5rem", padding: "0.25rem", borderRadius: "0.25rem", color: "#ef4444", background: "none", border: "none", cursor: "pointer" }}>
            <X size={12} />
          </button>
          <Textarea value={q.quote} onChange={v => updateQuote(i, "quote", v)} placeholder="Quote text..." rows={2} />
          <Input value={q.author} onChange={v => updateQuote(i, "author", v)} placeholder="Author" />
        </div>
      ))}
      <button type="button" onClick={addQuote}
        className="text-xs flex items-center gap-1"
        style={{ color: "var(--adm-accent)", background: "none", border: "none", cursor: "pointer" }}>
        <Plus size={12} /> Add Quote
      </button>
    </div>
  )
}
