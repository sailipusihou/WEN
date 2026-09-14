'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Film, Loader2, Download, Trash2, Upload, Scissors, Volume2, AlertCircle,
  Music, Sparkles, Palette, Type, Mic2, Wand2, Check, FlipHorizontal2, RotateCw,
  Plus, ChevronLeft, ChevronRight, Clapperboard, Play, Pause, SkipBack, SkipForward,
  SlidersHorizontal, Sticker as StickerIcon, Layers, ScissorsLineDashed, Zap, Sun, Contrast, Droplets, ThermometerSun,
  Undo2, Redo2, ChevronUp, ChevronDown,
} from 'lucide-react'
import {
  AudioItem, VideoClip, AudioClip, uid, getMediaDuration, getVideoMeta,
  composeMultiClipClient, uploadMedia, formatDur, previewFrameAt, getAudioWaveform,
} from './audioUtils'

interface Props {
  videos: string[]
  onAddVideo: (url: string) => void
  audioLibrary: AudioItem[]
  setAudioLibrary: React.Dispatch<React.SetStateAction<AudioItem[]>>
  onAddResult: (url: string) => void
  initialAudioUrl?: string
  autoSelectVideo?: string
  videoContext?: string
}

// 与后台主题一致（app/globals.css --adm-*）
const C = {
  card: 'var(--adm-card)',
  input: 'var(--adm-input)',
  inputBorder: 'var(--adm-input-border)',
  border: 'var(--adm-border)',
  text: 'var(--adm-text)',
  sub: 'var(--adm-text-secondary)',
  accent: 'var(--adm-accent)',
  accentText: 'var(--adm-accent-text)',
  accentBg: 'var(--adm-accent-bg)',
}

const FILTER_OPTIONS = [
  { id: 'none', label: '原片' },
  { id: 'bright', label: '明亮' },
  { id: 'warm', label: '暖色' },
  { id: 'cool', label: '冷色' },
  { id: 'bw', label: '黑白' },
  { id: 'sepia', label: '怀旧' },
  { id: 'soft', label: '柔焦' },
]
const EFFECT_OPTIONS = [
  { id: 'none', label: '无特效' },
  { id: 'film', label: '电影感' },
  { id: 'cyber', label: '赛博' },
  { id: 'fresh', label: '清新' },
  { id: 'retro', label: '复古' },
  { id: 'bloom', label: '柔光' },
  { id: 'portrait', label: '人像美颜' },
]
const TEXT_TEMPLATES = ['东方雅物 · 匠心手作', '新品上市 · 限时优惠', '手作之美 · 送礼首选', '天然材质 · 安心之选']
const MUSIC_STYLES = [
  { label: '东方古风', prompt: '东方古风，古筝+笛子+琵琶，典雅悠扬，适合传统工艺产品展示，纯音乐无歌词' },
  { label: '舒缓治愈', prompt: '舒缓治愈，钢琴+轻弦乐，温暖柔和，适合生活方式产品展示，纯音乐无歌词' },
  { label: '轻快活力', prompt: '轻快活力，尤克里里+轻打击乐，节奏明快，适合年轻化产品展示，纯音乐无歌词' },
  { label: '大气高端', prompt: '大气高端，管弦乐+电子氛围，庄重有质感，适合高端品牌产品展示，纯音乐无歌词' },
]
const STICKERS = ['🏮', '✨', '🫖', '🌸', '🎁', '❤️', '🔥', '⭐', '🎵', '💎', '🍵', '🦋']

function makeVideoClip(url: string, dur: number): VideoClip {
  return {
    id: uid(), url, srcStart: 0, srcEnd: dur || 10, speed: 1, filter: 'none', zoom: 'none',
    vignette: false, flipH: false, rotate: 0, fadeIn: 0, fadeOut: 0,
    text: '', textPosition: 'bottom', textSize: 28, textColor: '#ffffff', keepOriginal: true,
    brightness: 1, contrast: 1, saturation: 1, warmth: 0, hue: 0, effect: 'none',
    sticker: null,
  }
}

export default function VideoAudioEditor({
  videos, onAddVideo, audioLibrary, setAudioLibrary, onAddResult, initialAudioUrl, autoSelectVideo, videoContext,
}: Props) {
  const [clips, setClips] = useState<VideoClip[]>([])
  const [audioClips, setAudioClips] = useState<AudioClip[]>([])
  const [selectedClipId, setSelectedClipId] = useState('')
  const [selectedAudioId, setSelectedAudioId] = useState('')
  const [outputAspect, setOutputAspect] = useState('source')
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [resultUrl, setResultUrl] = useState('')
  const [resultMode, setResultMode] = useState<'mp4' | 'webm'>('mp4')
  const [propTab, setPropTab] = useState('basic')
  const [playhead, setPlayhead] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [pxPerSec, setPxPerSec] = useState(64)
  const [waveforms, setWaveforms] = useState<Record<string, number[]>>({})
  const [timelineCollapsed, setTimelineCollapsed] = useState(false)
  const [libOpen, setLibOpen] = useState(false)
  const [splitMsg, setSplitMsg] = useState('')
  const [loop, setLoop] = useState(true)
  const [snap, setSnap] = useState(false)
  const [previewSpeed, setPreviewSpeed] = useState(1)
  const [markers, setMarkers] = useState<number[]>([])

  const [musicMode, setMusicMode] = useState<'prompt' | 'video'>('video')
  const [musicPrompt, setMusicPrompt] = useState('')
  const [generatingMusic, setGeneratingMusic] = useState(false)
  const [musicError, setMusicError] = useState('')

  const videoFileRef = useRef<HTMLInputElement>(null)
  const timelineRef = useRef<HTMLDivElement>(null)
  const previewRef = useRef<HTMLCanvasElement>(null)
  const playheadRef = useRef(0)
  const playingRef = useRef(false)
  const rafRef = useRef(0)
  const lastFrameRef = useRef(0)
  const dragRef = useRef<{ type: 'clipStart' | 'clipEnd' | 'audioDelay'; id: string; startX: number; startVal: number } | null>(null)

  // 撤销/重做
  const historyRef = useRef<{ clips: VideoClip[]; audioClips: AudioClip[] }[]>([])
  const historyIdxRef = useRef(-1)
  const skipHistoryRef = useRef(false)

  const total = useMemo(() => clips.reduce((s, c) => s + Math.max(0.1, (c.srcEnd - c.srcStart) / c.speed), 0), [clips])
  const safeTotal = Math.max(1, total)
  const selectedClip = clips.find(c => c.id === selectedClipId)
  const selectedAudio = audioClips.find(a => a.id === selectedAudioId)

  const clipStarts = useMemo(() => {
    const arr: { id: string; start: number; dur: number }[] = []
    let acc = 0
    for (const c of clips) {
      const d = Math.max(0.1, (c.srcEnd - c.srcStart) / c.speed)
      arr.push({ id: c.id, start: acc, dur: d })
      acc += d
    }
    return arr
  }, [clips])

  useEffect(() => {
    if (skipHistoryRef.current) {
      skipHistoryRef.current = false
      return
    }
    const snap = { clips, audioClips }
    const h = historyRef.current
    const prev = h[historyIdxRef.current]
    if (prev && JSON.stringify(prev) === JSON.stringify(snap)) return
    h.splice(historyIdxRef.current + 1)
    h.push(snap)
    if (h.length > 60) h.shift()
    historyIdxRef.current = h.length - 1
  }, [clips, audioClips])

  const undo = () => {
    if (historyIdxRef.current <= 0) return
    historyIdxRef.current--
    const s = historyRef.current[historyIdxRef.current]
    if (!s) return
    skipHistoryRef.current = true
    setClips(s.clips)
    setAudioClips(s.audioClips)
  }
  const redo = () => {
    if (historyIdxRef.current >= historyRef.current.length - 1) return
    historyIdxRef.current++
    const s = historyRef.current[historyIdxRef.current]
    if (!s) return
    skipHistoryRef.current = true
    setClips(s.clips)
    setAudioClips(s.audioClips)
  }

  useEffect(() => {
    audioClips.forEach(a => {
      if (!waveforms[a.url]) {
        getAudioWaveform(a.url, 36).then(peaks => {
          if (peaks.length) setWaveforms(prev => ({ ...prev, [a.url]: peaks }))
        }).catch(() => {})
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioClips])

  const renderPreview = useCallback(async (t: number) => {
    const canvas = previewRef.current
    if (!canvas || !clips.length) return
    let idx = clips.length - 1
    for (let i = 0; i < clips.length; i++) {
      if (t < clipStarts[i].start + clipStarts[i].dur) { idx = i; break }
    }
    const clip = clips[idx]
    const tIn = Math.min(clipStarts[idx].dur - 0.01, Math.max(0, t - clipStarts[idx].start))
    try {
      await previewFrameAt(clip, tIn, canvas, outputAspect)
    } catch {}
  }, [clips, clipStarts, outputAspect])

  useEffect(() => {
    const id = setTimeout(() => renderPreview(playhead), 120)
    return () => clearTimeout(id)
  }, [playhead, renderPreview, selectedClipId, selectedClip?.brightness, selectedClip?.contrast, selectedClip?.saturation, selectedClip?.warmth, selectedClip?.hue, selectedClip?.effect, selectedClip?.filter, selectedClip?.zoom, selectedClip?.vignette, selectedClip?.flipH, selectedClip?.rotate, selectedClip?.text, selectedClip?.textPosition, selectedClip?.textSize, selectedClip?.textColor, selectedClip?.sticker, outputAspect])

  useEffect(() => {
    playingRef.current = playing
    if (!playing) { cancelAnimationFrame(rafRef.current); return }
    lastFrameRef.current = performance.now()
    const tick = () => {
      if (!playingRef.current) return
      const now = performance.now()
      const dt = Math.min(0.12, (now - lastFrameRef.current) / 1000) * previewSpeed
      lastFrameRef.current = now
      let t = playheadRef.current + dt
      if (t >= total) {
        if (loop) {
          t = 0
        } else {
          playheadRef.current = total
          setPlayhead(total)
          setPlaying(false)
          return
        }
      }
      playheadRef.current = t
      setPlayhead(t)
      renderPreview(t)
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [playing, total, renderPreview, loop, previewSpeed])

  const seekTo = (t: number) => {
    const v = Math.max(0, Math.min(total, t))
    playheadRef.current = v
    setPlayhead(v)
    renderPreview(v)
  }

  const addVideoClip = async (url: string) => {
    setError('')
    try {
      const meta = await getVideoMeta(url)
      const clip = makeVideoClip(url, meta.duration)
      setClips(prev => [...prev, clip])
      setSelectedClipId(clip.id)
      setSelectedAudioId('')
      setPropTab('basic')
      seekTo(clipStarts.reduce((s, x) => s + x.dur, 0))
    } catch (e: any) {
      setError(e?.message || '无法添加视频')
    }
  }

  useEffect(() => {
    if (!autoSelectVideo) return
    const exist = clips.find(c => c.url === autoSelectVideo)
    if (exist) {
      setSelectedClipId(exist.id)
      const cs = clipStarts.find(x => x.id === exist.id)
      if (cs) seekTo(cs.start)
      return
    }
    addVideoClip(autoSelectVideo)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSelectVideo])

  const addAudioClip = async (url: string, delay = 0) => {
    setError('')
    try {
      const dur = await getMediaDuration(url, 'audio')
      const item: AudioClip = {
        id: uid(), url, srcStart: 0, srcEnd: dur || 10, volume: 1, speed: 1, echo: 0, lowpass: 0, delay,
      }
      setAudioClips(prev => [...prev, item])
      setSelectedAudioId(item.id)
      setSelectedClipId('')
      setPropTab('audio')
    } catch (e: any) {
      setError(e?.message || '无法添加音频')
    }
  }

  useEffect(() => {
    if (!initialAudioUrl) return
    if (!audioClips.some(a => a.url === initialAudioUrl)) addAudioClip(initialAudioUrl)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialAudioUrl])

  const updateClip = (id: string, patch: Partial<VideoClip>) => setClips(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c))
  const updateAudioClip = (id: string, patch: Partial<AudioClip>) => setAudioClips(prev => prev.map(a => a.id === id ? { ...a, ...patch } : a))

  const splitClip = () => {
    const idx = clipStarts.findIndex(x => playhead >= x.start && playhead < x.start + x.dur)
    const clip = idx >= 0 ? clips[idx] : null
    if (!clip) {
      setSplitMsg('请先把播放头移到片段内部再分割')
      setTimeout(() => setSplitMsg(''), 2000)
      return
    }
    const cs = clipStarts[idx]
    const srcT = clip.srcStart + (playhead - cs.start) * clip.speed
    if (srcT <= clip.srcStart + 0.15 || srcT >= clip.srcEnd - 0.15) {
      setSplitMsg('播放头太靠近片段边缘，无法分割')
      setTimeout(() => setSplitMsg(''), 2000)
      return
    }
    const left = { ...clip, id: uid(), srcEnd: srcT }
    const right = { ...clip, id: uid(), srcStart: srcT }
    setClips(clips.flatMap(c => c.id === clip.id ? [left, right] : [c]))
    setSelectedClipId(right.id)
    setSplitMsg('已分割')
    setTimeout(() => setSplitMsg(''), 1600)
  }

  const handleUploadVideo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setProcessing(true)
    setError('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('type', 'video')
      const r = await fetch('/api/upload', { method: 'POST', body: fd })
      const d = await r.json()
      if (!r.ok || !d.url) { setError(d.error || '视频上传失败'); return }
      onAddVideo(d.url)
      await addVideoClip(d.url)
    } catch (err: any) {
      setError(err?.message || '视频上传失败')
    } finally {
      setProcessing(false)
    }
  }

  const handleGenerateMusic = async () => {
    const prompt = musicMode === 'video' ? `为一段${Math.round(total)}秒的产品展示视频生成背景音乐，${videoContext ? `商品：${videoContext}；` : ''}东方韵味、舒缓高级、节奏与画面匹配，纯音乐无歌词` : musicPrompt.trim()
    if (!prompt) { setMusicError('请输入音乐提示词'); return }
    setGeneratingMusic(true)
    setMusicError('')
    try {
      const r = await fetch('/api/marketing/generate-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, type: 'music' }),
      })
      const d = await r.json()
      if (!r.ok || !d.success) { setMusicError(d.error || '音乐生成失败'); return }
      const item: AudioItem = { url: d.url, name: `AI 配乐 ${audioLibrary.length + 1}`, kind: 'music' }
      getMediaDuration(d.url, 'audio').then(dur => {
        setAudioLibrary(prev => prev.map(x => x.url === d.url ? { ...x, duration: dur } : x))
      }).catch(() => {})
      setAudioLibrary(prev => [item, ...prev])
      await addAudioClip(d.url, 0)
    } catch (e: any) {
      setMusicError(e?.message || '网络错误')
    } finally {
      setGeneratingMusic(false)
    }
  }

  const handleTimelinePointer = (e: React.PointerEvent, type: 'clipStart' | 'clipEnd' | 'audioDelay', id: string) => {
    e.preventDefault()
    e.stopPropagation()
    const rect = timelineRef.current?.getBoundingClientRect()
    if (!rect) return
    const startVal = type === 'clipStart' ? (clips.find(c => c.id === id)?.srcStart || 0)
      : type === 'clipEnd' ? (clips.find(c => c.id === id)?.srcEnd || 0)
        : (audioClips.find(a => a.id === id)?.delay || 0)
    dragRef.current = { type, id, startX: e.clientX, startVal }
    const onMove = (ev: PointerEvent) => {
      const d = dragRef.current
      if (!d || !timelineRef.current) return
      const r = timelineRef.current.getBoundingClientRect()
      const delta = ((ev.clientX - d.startX) / r.width) * safeTotal
      const val = snap ? Math.round(Math.max(0, d.startVal + delta) * 2) / 2 : Math.max(0, d.startVal + delta)
      if (d.type === 'clipStart') {
        const c = clips.find(x => x.id === d.id)
        if (c) updateClip(d.id, { srcStart: Math.min(val, c.srcEnd - 0.1) })
      } else if (d.type === 'clipEnd') {
        const c = clips.find(x => x.id === d.id)
        if (c) updateClip(d.id, { srcEnd: Math.max(val, c.srcStart + 0.1) })
      } else {
        updateAudioClip(d.id, { delay: Math.min(safeTotal, val) })
      }
    }
    const onUp = () => {
      dragRef.current = null
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  const handleRulerPointer = (e: React.PointerEvent) => {
    const rect = timelineRef.current?.getBoundingClientRect()
    if (!rect) return
    const v = ((e.clientX - rect.left) / rect.width) * safeTotal
    seekTo(snap ? Math.round(v * 2) / 2 : v)
  }

  const handleMerge = async () => {
    if (!clips.length) { setError('请先添加至少一个视频片段'); return }
    setProcessing(true)
    setError('')
    setProgress(0)
    setResultUrl('')
    try {
      const blob = await composeMultiClipClient(clips, audioClips, outputAspect, setProgress)
      const webmUrl = await uploadMedia(blob, 'video', `edited-${Date.now()}.webm`)
      try {
        const tr = await fetch('/api/marketing/transcode-media', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: webmUrl }),
        })
        const td = await tr.json()
        if (tr.ok && td.success) {
          setResultUrl(td.url)
          setResultMode('mp4')
          onAddResult(td.url)
          return
        }
      } catch {}
      setResultUrl(webmUrl)
      setResultMode('webm')
      onAddResult(webmUrl)
    } catch (e: any) {
      setError(e?.message || '合成失败')
    } finally {
      setProcessing(false)
      setProgress(0)
    }
  }

  const moveClip = (dir: -1 | 1) => {
    if (!selectedClip) return
    const i = clips.findIndex(c => c.id === selectedClip.id)
    const j = i + dir
    if (j < 0 || j >= clips.length) return
    const arr = [...clips]
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
    setClips(arr)
  }

  const aspectRatio = outputAspect === '16:9' ? 16 / 9 : outputAspect === '9:16' ? 9 / 16 : outputAspect === '1:1' ? 1 : 16 / 9
  const hasUndo = historyIdxRef.current > 0
  const hasRedo = historyIdxRef.current < historyRef.current.length - 1

  const inputCls: React.CSSProperties = {
    width: '100%', padding: '7px 10px', borderRadius: 10, fontSize: 12, outline: 'none',
    backgroundColor: C.input, border: `1px solid ${C.inputBorder}`, color: C.text,
  }
  const chip = (active: boolean): React.CSSProperties => ({
    padding: '6px 10px', borderRadius: 10, fontSize: 11, border: `1px solid ${active ? C.accent : C.border}`,
    background: active ? C.accentBg : C.input, color: active ? C.accent : C.sub, cursor: 'pointer', fontWeight: 500,
  })

  return (
    <div className="w-full rounded-2xl p-4 space-y-3" style={{ backgroundColor: C.card, border: `1px solid ${C.border}` }}>
      <style>{`
        @keyframes silverFlow {
          0% { background-position: 0% 50%; }
          100% { background-position: 200% 50%; }
        }
      `}</style>
      {/* 顶栏 */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Scissors size={16} style={{ color: C.accent }} />
          <p className="text-sm font-semibold" style={{ color: C.text }}>视频 & 音频编辑区</p>
          <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: C.input, color: C.sub, border: `1px dashed ${C.border}` }}>
            {clips.length} 视频 / {audioClips.length} 音频 · {formatDur(total)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={undo} disabled={!hasUndo} className="p-2 rounded-lg transition-colors hover:bg-[#FFFFFF]/5 disabled:opacity-30" style={{ color: C.sub }} title="撤销"><Undo2 size={15} /></button>
          <button onClick={redo} disabled={!hasRedo} className="p-2 rounded-lg transition-colors hover:bg-[#FFFFFF]/5 disabled:opacity-30" style={{ color: C.sub }} title="重做"><Redo2 size={15} /></button>
          <button onClick={() => videoFileRef.current?.click()} className="px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-1.5" style={{ backgroundColor: C.input, color: C.text, border: `1px solid ${C.border}` }}>
            <Upload size={13} /> 上传视频
          </button>
          <input ref={videoFileRef} type="file" accept="video/*,.mp4,.webm,.mov" className="hidden" onChange={handleUploadVideo} />
          <button onClick={handleMerge} disabled={processing || !clips.length} className="px-4 py-2 rounded-lg text-xs font-medium flex items-center gap-1.5 disabled:opacity-50" style={{ backgroundColor: C.accent, color: C.accentText }}>
            {processing ? <><Loader2 size={13} className="animate-spin" /> {progress > 0 ? `${Math.round(progress * 100)}%` : '合成中...'}</> : <><Zap size={13} /> 合成视频</>}
          </button>
        </div>
      </div>

      <p className="text-[10px]" style={{ color: C.sub }}>
        多视频顺序拼接 + 多音频混音；每个片段可独立调色/特效/文字/贴纸/倍速/裁剪；时间轴支持拖拽裁剪、播放头分割、波形显示；合成后自动转码 MP4。
      </p>

      {error && (
        <div className="rounded-lg p-3 flex items-center gap-2" style={{ backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.35)' }}>
          <AlertCircle size={13} style={{ color: '#EF4444', flexShrink: 0 }} />
          <p className="text-xs flex-1" style={{ color: '#DC2626' }}>{error}</p>
          <button onClick={() => setError('')} className="text-[11px]" style={{ color: '#DC2626' }}>关闭</button>
        </div>
      )}

      {/* 素材库快捷下拉（不占布局空间） */}
      <div className="relative flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setLibOpen(!libOpen)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors"
          style={{ backgroundColor: libOpen ? C.accentBg : C.input, color: libOpen ? C.accent : C.text, border: `1px solid ${libOpen ? C.accent : C.border}` }}
        >
          <Layers size={13} /> 素材库（{clips.length} 视频 / {audioClips.length} 音频）
          <ChevronDown size={12} style={{ transform: libOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
        </button>

        {libOpen && <div className="fixed inset-0 z-20" onClick={() => setLibOpen(false)} />}
        {libOpen && (
          <div className="absolute top-full left-0 mt-1.5 z-30 w-80 rounded-xl p-3 space-y-3" style={{ backgroundColor: C.card, border: `1px solid ${C.border}`, boxShadow: '0 18px 50px rgba(0,0,0,0.45)' }}>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-semibold" style={{ color: C.sub }}>视频片段</span>
                <button onClick={() => videoFileRef.current?.click()} className="flex items-center gap-1 text-[10px] font-semibold" style={{ color: C.accent }}><Plus size={11} /> 上传</button>
                <input ref={videoFileRef} type="file" accept="video/*,.mp4,.webm,.mov" className="hidden" onChange={handleUploadVideo} />
              </div>
              <select value="" onChange={e => { if (e.target.value) { addVideoClip(e.target.value); setLibOpen(false) } }} className="w-full mb-1.5" style={inputCls}>
                <option value="">+ 从生成列表添加视频...</option>
                {videos.map((u, i) => <option key={u} value={u}>视频 {i + 1}</option>)}
              </select>
              <div className="space-y-1 max-h-44 overflow-y-auto pr-0.5">
                {clips.map((c, i) => (
                  <button key={c.id} onClick={() => { setSelectedClipId(c.id); setSelectedAudioId(''); setPropTab('basic'); setLibOpen(false) }} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left" style={{ backgroundColor: selectedClipId === c.id ? C.accentBg : C.input, border: `1px solid ${selectedClipId === c.id ? C.accent : 'transparent'}` }}>
                    <span className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: C.card }}><Film size={13} style={{ color: C.accent }} /></span>
                    <span className="min-w-0">
                      <span className="block text-[11px] font-medium truncate" style={{ color: C.text }}>视频 {i + 1}</span>
                      <span className="block text-[9px]" style={{ color: C.sub }}>{formatDur((c.srcEnd - c.srcStart) / c.speed)}</span>
                    </span>
                  </button>
                ))}
                {clips.length === 0 && <p className="text-[10px] text-center py-2" style={{ color: C.sub }}>暂无视频片段</p>}
              </div>
            </div>
            <div>
              <span className="text-[10px] font-semibold" style={{ color: C.sub }}>音频片段</span>
              <select value="" onChange={e => { if (e.target.value) { addAudioClip(e.target.value); setLibOpen(false) } }} className="w-full mt-1 mb-1.5" style={inputCls}>
                <option value="">+ 从音频库添加...</option>
                {audioLibrary.map((a, i) => <option key={a.url} value={a.url}>音频 {i + 1}：{a.name}</option>)}
              </select>
              <div className="space-y-1 max-h-44 overflow-y-auto pr-0.5 mt-1">
                {audioClips.map((a, i) => (
                  <button key={a.id} onClick={() => { setSelectedAudioId(a.id); setSelectedClipId(''); setPropTab('audio'); setLibOpen(false) }} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left" style={{ backgroundColor: selectedAudioId === a.id ? 'rgba(34,197,94,0.12)' : C.input, border: `1px solid ${selectedAudioId === a.id ? '#22c55e' : 'transparent'}` }}>
                    <span className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: C.card }}><Music size={13} style={{ color: '#22c55e' }} /></span>
                    <span className="min-w-0">
                      <span className="block text-[11px] font-medium truncate" style={{ color: C.text }}>音频 {i + 1}</span>
                      <span className="block text-[9px]" style={{ color: C.sub }}>{formatDur((a.srcEnd - a.srcStart) / a.speed)} · 延迟 {a.delay.toFixed(1)}s</span>
                    </span>
                  </button>
                ))}
                {audioClips.length === 0 && <p className="text-[10px] text-center py-2" style={{ color: C.sub }}>暂无音频片段</p>}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_330px] gap-3">

        {/* 预览 + 播放控制 */}
        <div className="space-y-3 min-w-0">
          <div className="rounded-xl overflow-hidden relative flex items-center justify-center" style={{ backgroundColor: '#000', border: `1px solid ${C.border}`, aspectRatio: `${aspectRatio}`, maxHeight: 480 }}>
            <canvas ref={previewRef} className="max-w-full max-h-full object-contain" />
            <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full text-[10px]" style={{ backgroundColor: 'rgba(0,0,0,0.65)', border: `1px solid ${C.border}`, color: C.sub }}>
              {outputAspect === 'source' ? '跟随视频' : outputAspect} · {formatDur(playhead)} / {formatDur(total)}
            </div>
            {clips.length === 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <Clapperboard size={36} style={{ color: 'rgba(255,255,255,0.2)' }} />
                <p className="mt-3 text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>暂无片段，请从素材库添加</p>
              </div>
            )}
          </div>

          {/* 播放控制条 */}
          <div className="flex items-center justify-center gap-2 rounded-xl px-3 py-2" style={{ backgroundColor: C.input, border: `1px solid ${C.border}` }}>
            <button onClick={() => seekTo(0)} className="p-2 rounded-lg hover:bg-[#FFFFFF]/5 transition-colors" style={{ color: C.sub }} title="回到开头"><SkipBack size={14} /></button>
            <button onClick={() => seekTo(Math.max(0, playhead - 1))} className="p-2 rounded-lg hover:bg-[#FFFFFF]/5 transition-colors" style={{ color: C.sub }} title="后退 1 秒"><ChevronLeft size={14} /></button>
            <button onClick={() => setPlaying(!playing)} className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: C.accent, color: C.accentText }}>
              {playing ? <Pause size={16} /> : <Play size={16} style={{ marginLeft: 1 }} />}
            </button>
            <button onClick={() => seekTo(Math.min(total, playhead + 1))} className="p-2 rounded-lg hover:bg-[#FFFFFF]/5 transition-colors" style={{ color: C.sub }} title="前进 1 秒"><ChevronRight size={14} /></button>
            <button onClick={() => seekTo(total)} className="p-2 rounded-lg hover:bg-[#FFFFFF]/5 transition-colors" style={{ color: C.sub }} title="跳到结尾"><SkipForward size={14} /></button>
            <select value={outputAspect} onChange={e => setOutputAspect(e.target.value)} className="px-2 py-1.5 rounded-lg text-[11px] outline-none" style={{ backgroundColor: C.card, color: C.sub, border: `1px solid ${C.border}` }}>
              <option value="source">画幅：跟随</option>
              <option value="16:9">画幅：16:9</option>
              <option value="9:16">画幅：9:16</option>
              <option value="1:1">画幅：1:1</option>
            </select>
          </div>

          {resultUrl && (
            <div className="rounded-xl overflow-hidden" style={{ backgroundColor: C.input, border: `1px solid ${C.border}` }}>
              <video src={resultUrl} controls className="w-full" style={{ maxHeight: 240, backgroundColor: '#000' }} />
              <div className="flex items-center justify-between px-3 py-2">
                <span className="text-[10px] flex items-center gap-1" style={{ color: C.sub }}>
                  <Film size={11} /> 编辑结果（{resultMode === 'mp4' ? 'MP4' : 'WebM'}）{resultMode === 'mp4' && <Check size={12} style={{ color: '#22c55e' }} />}
                </span>
                <button onClick={async () => {
                  try {
                    const r = await fetch(resultUrl)
                    const blob = await r.blob()
                    const a = document.createElement('a')
                    a.href = URL.createObjectURL(blob)
                    a.download = `marketing-edited-${Date.now()}.${resultMode}`
                    document.body.appendChild(a)
                    a.click()
                    a.remove()
                    URL.revokeObjectURL(a.href)
                  } catch { window.open(resultUrl, '_blank') }
                }} className="p-1.5 rounded-lg hover:bg-[#FFFFFF]/5 transition-colors" style={{ color: C.sub }} title="下载"><Download size={14} /></button>
              </div>
            </div>
          )}
        </div>

        {/* 属性面板 */}
        <div className="rounded-xl p-3 min-w-0 space-y-2" style={{ backgroundColor: C.input, border: `1px solid ${C.border}` }}>
          <div className="flex items-center gap-1 p-1 rounded-xl overflow-x-auto" style={{ background: 'linear-gradient(180deg, rgba(226,232,240,0.16), rgba(148,163,184,0.05))', border: `1px solid ${C.border}` }}>
            {[
              { id: 'basic', label: '基础', icon: SlidersHorizontal },
              { id: 'grade', label: '调色', icon: Palette },
              { id: 'effect', label: '特效', icon: Wand2 },
              { id: 'text', label: '文字', icon: Type },
              { id: 'sticker', label: '贴纸', icon: StickerIcon },
              { id: 'audio', label: '音频', icon: Mic2 },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setPropTab(tab.id)}
                className="flex items-center justify-center gap-1 flex-1 px-2 py-1.5 rounded-[9px] text-[10px] font-semibold transition-all duration-200"
                style={propTab === tab.id ? {
                  background: 'linear-gradient(120deg,#e2e8f0,#f8fafc,#cbd5e1,#f8fafc,#e2e8f0)',
                  backgroundSize: '200% 100%',
                  animation: 'silverFlow 2.4s linear infinite',
                  color: '#0f172a',
                  boxShadow: '0 2px 10px rgba(148,163,184,0.35), inset 0 1px 0 rgba(255,255,255,0.9)',
                  border: '1px solid rgba(148,163,184,0.55)',
                } : {
                  background: 'transparent',
                  color: C.sub,
                  border: '1px solid transparent',
                }}
              >
                <tab.icon size={11} /> {tab.label}
              </button>
            ))}
          </div>

          {!selectedClip && !selectedAudio && (
            <div className="space-y-2">
              <p className="text-[11px] font-semibold" style={{ color: C.text }}>全局设置</p>
              <div>
                <label className="text-[10px] mb-1 block" style={{ color: C.sub }}>输出画幅（不一致时模糊背景填充）</label>
                <select value={outputAspect} onChange={e => setOutputAspect(e.target.value)} style={inputCls}>
                  <option value="source">跟随视频</option>
                  <option value="16:9">16:9 横屏</option>
                  <option value="9:16">9:16 竖屏</option>
                  <option value="1:1">1:1 方形</option>
                </select>
              </div>
              <div className="rounded-xl p-3" style={{ backgroundColor: C.card, border: `1px dashed ${C.inputBorder}` }}>
                <p className="text-[11px] leading-relaxed" style={{ color: C.sub }}>点击素材库或时间轴中的片段即可编辑；播放头（时间轴竖线）可点击定位，用于预览与分割。</p>
              </div>
            </div>
          )}

          {selectedClip && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold" style={{ color: C.text }}>视频片段属性</p>
                <div className="flex gap-1">
                  <button onClick={() => moveClip(-1)} className="p-1.5 rounded-lg hover:bg-[#FFFFFF]/5 transition-colors" style={{ color: C.sub }} title="前移"><ChevronLeft size={13} /></button>
                  <button onClick={() => moveClip(1)} className="p-1.5 rounded-lg hover:bg-[#FFFFFF]/5 transition-colors" style={{ color: C.sub }} title="后移"><ChevronRight size={13} /></button>
                  <button onClick={() => { setClips(prev => prev.filter(c => c.id !== selectedClip.id)); setSelectedClipId('') }} className="p-1.5 rounded-lg hover:bg-[#FFFFFF]/5 transition-colors" style={{ color: '#EF4444' }} title="删除"><Trash2 size={13} /></button>
                </div>
              </div>

              {propTab === 'basic' && (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] mb-1 block" style={{ color: C.sub }}>起点 {formatDur(selectedClip.srcStart)}</label>
                      <input type="range" min={0} max={Math.max(1, selectedClip.srcEnd - 0.1)} step={0.1} value={selectedClip.srcStart} onChange={e => updateClip(selectedClip.id, { srcStart: Math.min(Number(e.target.value), selectedClip.srcEnd - 0.1) })} className="w-full" style={{ accentColor: C.accent }} />
                    </div>
                    <div>
                      <label className="text-[10px] mb-1 block" style={{ color: C.sub }}>终点 {formatDur(selectedClip.srcEnd)}</label>
                      <input type="range" min={selectedClip.srcStart + 0.1} max={Math.max(1, selectedClip.srcEnd)} step={0.1} value={selectedClip.srcEnd} onChange={e => updateClip(selectedClip.id, { srcEnd: Math.max(Number(e.target.value), selectedClip.srcStart + 0.1) })} className="w-full" style={{ accentColor: C.accent }} />
                    </div>
                    <div>
                      <label className="text-[10px] mb-1 block" style={{ color: C.sub }}>倍速 {selectedClip.speed}x</label>
                      <select value={selectedClip.speed} onChange={e => updateClip(selectedClip.id, { speed: Number(e.target.value) })} style={inputCls}>
                        {[0.5, 0.75, 1, 1.25, 1.5, 2].map(s => <option key={s} value={s}>{s}x</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] mb-1 block" style={{ color: C.sub }}>片段 {formatDur((selectedClip.srcEnd - selectedClip.srcStart) / selectedClip.speed)}</label>
                      <button onClick={() => updateClip(selectedClip.id, { keepOriginal: !selectedClip.keepOriginal })} className="w-full py-1.5 rounded-lg text-[11px] font-medium" style={{ backgroundColor: selectedClip.keepOriginal ? 'rgba(34,197,94,0.12)' : C.card, color: selectedClip.keepOriginal ? '#22c55e' : C.sub, border: `1px solid ${selectedClip.keepOriginal ? 'rgba(34,197,94,0.35)' : C.border}` }}>
                        <Volume2 size={11} className="inline mr-1" />{selectedClip.keepOriginal ? '保留原声' : '静音原声'}
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] mb-1 block" style={{ color: C.sub }}>淡入 {selectedClip.fadeIn.toFixed(1)}s</label>
                      <input type="range" min={0} max={3} step={0.1} value={selectedClip.fadeIn} onChange={e => updateClip(selectedClip.id, { fadeIn: Number(e.target.value) })} className="w-full" style={{ accentColor: C.accent }} />
                    </div>
                    <div>
                      <label className="text-[10px] mb-1 block" style={{ color: C.sub }}>淡出 {selectedClip.fadeOut.toFixed(1)}s</label>
                      <input type="range" min={0} max={3} step={0.1} value={selectedClip.fadeOut} onChange={e => updateClip(selectedClip.id, { fadeOut: Number(e.target.value) })} className="w-full" style={{ accentColor: C.accent }} />
                    </div>
                  </div>
                </div>
              )}

              {propTab === 'grade' && (
                <div className="space-y-2.5">
                  {[
                    { label: '亮度', key: 'brightness', min: 0.5, max: 1.5, step: 0.01, icon: Sun },
                    { label: '对比度', key: 'contrast', min: 0.5, max: 1.8, step: 0.01, icon: Contrast },
                    { label: '饱和度', key: 'saturation', min: 0, max: 2, step: 0.01, icon: Droplets },
                    { label: '色温', key: 'warmth', min: -1, max: 1, step: 0.05, icon: ThermometerSun },
                    { label: '色调', key: 'hue', min: -180, max: 180, step: 5, icon: Palette },
                  ].map(g => (
                    <div key={g.key}>
                      <label className="text-[10px] mb-1 flex items-center gap-1" style={{ color: C.sub }}>
                        <g.icon size={11} /> {g.label} <span style={{ color: C.text }}>{(selectedClip as any)[g.key]}</span>
                      </label>
                      <input type="range" min={g.min} max={g.max} step={g.step} value={(selectedClip as any)[g.key]} onChange={e => updateClip(selectedClip.id, { [g.key]: Number(e.target.value) } as any)} className="w-full" style={{ accentColor: C.accent }} />
                    </div>
                  ))}
                  <button onClick={() => updateClip(selectedClip.id, { brightness: 1, contrast: 1, saturation: 1, warmth: 0, hue: 0 })} className="w-full py-1.5 rounded-lg text-[11px] font-medium" style={{ backgroundColor: C.card, color: C.sub, border: `1px solid ${C.border}` }}>重置调色</button>
                </div>
              )}

              {propTab === 'effect' && (
                <div className="space-y-2.5">
                  <div>
                    <label className="text-[10px] mb-1 block" style={{ color: C.sub }}>特效预设</label>
                    <div className="flex flex-wrap gap-1.5">
                      {EFFECT_OPTIONS.map(e => <button key={e.id} onClick={() => updateClip(selectedClip.id, { effect: e.id })} style={chip(selectedClip.effect === e.id)}>{e.label}</button>)}
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] mb-1 block" style={{ color: C.sub }}>滤镜</label>
                    <div className="flex flex-wrap gap-1.5">
                      {FILTER_OPTIONS.map(f => <button key={f.id} onClick={() => updateClip(selectedClip.id, { filter: f.id })} style={chip(selectedClip.filter === f.id)}>{f.label}</button>)}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button onClick={() => updateClip(selectedClip.id, { zoom: selectedClip.zoom === 'slow-in' ? 'none' : 'slow-in' })} style={chip(selectedClip.zoom === 'slow-in')}>推近</button>
                    <button onClick={() => updateClip(selectedClip.id, { vignette: !selectedClip.vignette })} style={chip(selectedClip.vignette)}>暗角</button>
                    <button onClick={() => updateClip(selectedClip.id, { flipH: !selectedClip.flipH })} style={chip(selectedClip.flipH)}><FlipHorizontal2 size={11} className="inline mr-0.5" />镜像</button>
                    {[0, 90, 180, 270].map(r => (
                      <button key={r} onClick={() => updateClip(selectedClip.id, { rotate: r })} style={chip(selectedClip.rotate === r)}><RotateCw size={10} className="inline mr-0.5" />{r === 0 ? '原向' : `${r}°`}</button>
                    ))}
                  </div>
                </div>
              )}

              {propTab === 'text' && (
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-1.5">
                    {TEXT_TEMPLATES.map(t => (
                      <button key={t} onClick={() => updateClip(selectedClip.id, { text: t })} className="px-2 py-1 rounded-lg text-[10px]" style={{ backgroundColor: C.card, color: C.accent, border: `1px dashed ${C.inputBorder}` }}>{t}</button>
                    ))}
                  </div>
                  <input value={selectedClip.text} onChange={e => updateClip(selectedClip.id, { text: e.target.value })} placeholder="自定义文字，如：东方雅物 · 匠心手作" style={inputCls} />
                  <div className="grid grid-cols-3 gap-2">
                    <select value={selectedClip.textPosition} onChange={e => updateClip(selectedClip.id, { textPosition: e.target.value })} style={inputCls}>
                      <option value="top">顶部</option>
                      <option value="center">居中</option>
                      <option value="bottom">底部</option>
                    </select>
                    <div className="flex items-center gap-1.5">
                      <input type="range" min={16} max={56} step={1} value={selectedClip.textSize} onChange={e => updateClip(selectedClip.id, { textSize: Number(e.target.value) })} className="flex-1" style={{ accentColor: C.accent }} />
                      <span className="text-[10px]" style={{ color: C.sub }}>{selectedClip.textSize}</span>
                    </div>
                    <input type="color" value={selectedClip.textColor} onChange={e => updateClip(selectedClip.id, { textColor: e.target.value })} className="w-full h-8 rounded-lg" style={{ backgroundColor: C.card, border: `1px solid ${C.border}`, padding: 0 }} />
                  </div>
                </div>
              )}

              {propTab === 'sticker' && (
                <div className="space-y-2">
                  <div className="grid grid-cols-6 gap-1.5">
                    {STICKERS.map(s => (
                      <button key={s} onClick={() => updateClip(selectedClip.id, { sticker: { emoji: s, position: selectedClip.sticker?.position || 'br', size: selectedClip.sticker?.size || 48 } })} className="aspect-square rounded-xl text-lg flex items-center justify-center" style={{ backgroundColor: selectedClip.sticker?.emoji === s ? C.accentBg : C.card, border: `1px solid ${selectedClip.sticker?.emoji === s ? C.accent : C.border}` }}>{s}</button>
                    ))}
                  </div>
                  {selectedClip.sticker && (
                    <>
                      <div className="flex items-center justify-between rounded-lg px-3 py-2" style={{ backgroundColor: C.card, border: `1px solid ${C.border}` }}>
                        <span className="text-[11px]" style={{ color: C.text }}>贴纸 {selectedClip.sticker.emoji}</span>
                        <button onClick={() => updateClip(selectedClip.id, { sticker: null })} className="text-[10px] font-semibold" style={{ color: '#EF4444' }}>移除</button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <select value={selectedClip.sticker.position} onChange={e => updateClip(selectedClip.id, { sticker: { ...selectedClip.sticker!, position: e.target.value } })} style={inputCls}>
                          <option value="tl">左上</option><option value="tr">右上</option><option value="bl">左下</option><option value="br">右下</option><option value="center">居中</option>
                        </select>
                        <div className="flex items-center gap-1.5">
                          <input type="range" min={24} max={110} step={2} value={selectedClip.sticker.size} onChange={e => updateClip(selectedClip.id, { sticker: { ...selectedClip.sticker!, size: Number(e.target.value) } })} className="flex-1" style={{ accentColor: C.accent }} />
                          <span className="text-[10px]" style={{ color: C.sub }}>{selectedClip.sticker.size}</span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {propTab === 'audio' && <p className="text-[11px] py-6 text-center" style={{ color: C.sub }}>请选择音频片段，或生成 AI 配乐。</p>}
            </div>
          )}

          {selectedAudio && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold" style={{ color: C.text }}>音频片段属性</p>
                <button onClick={() => { setAudioClips(prev => prev.filter(a => a.id !== selectedAudio.id)); setSelectedAudioId('') }} className="p-1.5 rounded-lg hover:bg-[#FFFFFF]/5 transition-colors" style={{ color: '#EF4444' }}><Trash2 size={13} /></button>
              </div>
              <audio controls preload="none" src={selectedAudio.url} className="w-full h-8" />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] mb-1 block" style={{ color: C.sub }}>起点 {formatDur(selectedAudio.srcStart)}</label>
                  <input type="range" min={0} max={Math.max(1, selectedAudio.srcEnd - 0.1)} step={0.1} value={selectedAudio.srcStart} onChange={e => updateAudioClip(selectedAudio.id, { srcStart: Math.min(Number(e.target.value), selectedAudio.srcEnd - 0.1) })} className="w-full" style={{ accentColor: '#22c55e' }} />
                </div>
                <div>
                  <label className="text-[10px] mb-1 block" style={{ color: C.sub }}>终点 {formatDur(selectedAudio.srcEnd)}</label>
                  <input type="range" min={selectedAudio.srcStart + 0.1} max={Math.max(1, selectedAudio.srcEnd)} step={0.1} value={selectedAudio.srcEnd} onChange={e => updateAudioClip(selectedAudio.id, { srcEnd: Math.max(Number(e.target.value), selectedAudio.srcStart + 0.1) })} className="w-full" style={{ accentColor: '#22c55e' }} />
                </div>
                <div>
                  <label className="text-[10px] mb-1 block" style={{ color: C.sub }}>音量 {Math.round(selectedAudio.volume * 100)}%</label>
                  <input type="range" min={0.05} max={3} step={0.05} value={selectedAudio.volume} onChange={e => updateAudioClip(selectedAudio.id, { volume: Number(e.target.value) })} className="w-full" style={{ accentColor: '#22c55e' }} />
                </div>
                <div>
                  <label className="text-[10px] mb-1 block" style={{ color: C.sub }}>变速 {selectedAudio.speed}x</label>
                  <select value={selectedAudio.speed} onChange={e => updateAudioClip(selectedAudio.id, { speed: Number(e.target.value) })} style={inputCls}>
                    {[0.5, 0.75, 1, 1.25, 1.5, 2].map(s => <option key={s} value={s}>{s}x</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] mb-1 block" style={{ color: C.sub }}>回声 {Math.round(selectedAudio.echo * 100)}%</label>
                  <input type="range" min={0} max={0.9} step={0.05} value={selectedAudio.echo} onChange={e => updateAudioClip(selectedAudio.id, { echo: Number(e.target.value) })} className="w-full" style={{ accentColor: '#22c55e' }} />
                </div>
                <div>
                  <label className="text-[10px] mb-1 block" style={{ color: C.sub }}>低通 {selectedAudio.lowpass > 0 ? `${Math.round(selectedAudio.lowpass / 1000)}k` : '关'}</label>
                  <input type="range" min={0} max={16000} step={500} value={selectedAudio.lowpass} onChange={e => updateAudioClip(selectedAudio.id, { lowpass: Number(e.target.value) })} className="w-full" style={{ accentColor: '#22c55e' }} />
                </div>
              </div>
              <div>
                <label className="text-[10px] mb-1 block" style={{ color: C.sub }}>延迟 {selectedAudio.delay.toFixed(1)}s（也可在时间轴拖动）</label>
                <input type="range" min={0} max={Math.max(1, total)} step={0.1} value={selectedAudio.delay} onChange={e => updateAudioClip(selectedAudio.id, { delay: Number(e.target.value) })} className="w-full" style={{ accentColor: '#22c55e' }} />
              </div>
            </div>
          )}

          {/* AI 配乐 */}
          <div className="rounded-xl p-3 space-y-2" style={{ backgroundColor: C.card, border: `1px solid ${C.border}` }}>
            <p className="text-[11px] font-semibold flex items-center gap-1.5" style={{ color: C.text }}><Music size={13} style={{ color: C.accent }} /> AI 配乐</p>
            <div className="grid grid-cols-2 gap-1.5">
              <button onClick={() => setMusicMode('video')} style={chip(musicMode === 'video')}>根据视频</button>
              <button onClick={() => setMusicMode('prompt')} style={chip(musicMode === 'prompt')}>提示词</button>
            </div>
            <div className="flex flex-wrap gap-1">
              {MUSIC_STYLES.map(s => (
                <button key={s.label} onClick={() => { setMusicMode('prompt'); setMusicPrompt(s.prompt) }} className="px-2 py-1 rounded-lg text-[9px]" style={{ backgroundColor: C.input, color: C.accent, border: `1px dashed ${C.inputBorder}` }}>{s.label}</button>
              ))}
            </div>
            <textarea value={musicMode === 'video' ? `为一段${Math.round(total)}秒的产品展示视频生成背景音乐，${videoContext ? `商品：${videoContext}；` : ''}东方韵味、舒缓高级、节奏与画面匹配，纯音乐无歌词` : musicPrompt} onChange={e => musicMode === 'prompt' && setMusicPrompt(e.target.value)} rows={2} readOnly={musicMode === 'video'} placeholder="描述音乐风格" className="w-full px-3 py-2 rounded-lg text-xs resize-none outline-none" style={{ backgroundColor: C.input, border: `1px solid ${C.inputBorder}`, color: C.text }} />
            <button onClick={handleGenerateMusic} disabled={generatingMusic} className="w-full px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 disabled:opacity-50" style={{ backgroundColor: C.accent, color: C.accentText }}>
              {generatingMusic ? <><Loader2 size={13} className="animate-spin" /> 生成中...</> : <><Sparkles size={13} /> 生成并加入音频轨道</>}
            </button>
            {musicError && <p className="text-[10px]" style={{ color: '#EF4444' }}>{musicError}</p>}
          </div>
        </div>
      </div>

      {/* 时间轴 */}
      <div className="rounded-xl p-3 space-y-2 select-none overflow-x-auto" ref={timelineRef} style={{ backgroundColor: C.input, border: `1px solid ${C.border}` }}>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-semibold tracking-widest" style={{ color: C.sub }}>时间轴</span>
            <input type="range" min={28} max={160} step={4} value={pxPerSec} onChange={e => setPxPerSec(Number(e.target.value))} className="w-20" style={{ accentColor: C.accent }} title="缩放" />
            <button onClick={() => setTimelineCollapsed(!timelineCollapsed)} className="flex items-center gap-1 text-[10px]" style={{ color: C.sub }}>
              {timelineCollapsed ? <><ChevronUp size={11} /> 展开</> : <><ChevronDown size={11} /> 收起</>}
            </button>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {splitMsg && <span className="text-[10px]" style={{ color: splitMsg === '已分割' ? '#22c55e' : '#F59E0B' }}>{splitMsg}</span>}
            <button onClick={() => { const m = Math.round(playhead * 10) / 10; if (!markers.includes(m)) setMarkers(prev => [...prev, m].sort((a, b) => a - b)) }} className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-medium" style={{ backgroundColor: C.card, color: '#F59E0B', border: `1px solid ${C.border}` }}>
              <Plus size={11} /> 标记
            </button>
            {markers.length > 0 && (
              <button onClick={() => setMarkers([])} className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-medium" style={{ backgroundColor: C.card, color: C.sub, border: `1px solid ${C.border}` }}>
                清标记 ({markers.length})
              </button>
            )}
            <button onClick={() => setSnap(!snap)} className="px-2 py-1.5 rounded-lg text-[10px] font-medium" style={{ backgroundColor: snap ? C.accentBg : C.card, color: snap ? C.accent : C.sub, border: `1px solid ${snap ? C.accent : C.border}` }}>
              {snap ? '吸附 ✓' : '吸附'}
            </button>
            <button onClick={() => setLoop(!loop)} className="px-2 py-1.5 rounded-lg text-[10px] font-medium" style={{ backgroundColor: loop ? C.accentBg : C.card, color: loop ? C.accent : C.sub, border: `1px solid ${loop ? C.accent : C.border}` }}>
              {loop ? '循环 ✓' : '单次'}
            </button>
            <select value={previewSpeed} onChange={e => setPreviewSpeed(Number(e.target.value))} className="px-1.5 py-1.5 rounded-lg text-[10px] outline-none" style={{ backgroundColor: C.card, color: C.sub, border: `1px solid ${C.border}` }}>
              {[0.5, 1, 1.5, 2].map(s => <option key={s} value={s}>预览 {s}x</option>)}
            </select>
            <input
              type="number"
              min={0}
              max={Math.max(1, Math.round(total * 10) / 10)}
              step={0.1}
              value={Math.round(playhead * 10) / 10}
              onChange={e => seekTo(Math.max(0, Number(e.target.value) || 0))}
              className="w-16 px-1.5 py-1.5 rounded-lg text-[10px] outline-none tabular-nums"
              style={{ backgroundColor: C.card, border: `1px solid ${C.border}`, color: C.text, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}
              title="跳转到指定秒"
            />
            <button onClick={splitClip} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium" style={{ backgroundColor: C.card, color: C.accent, border: `1px solid ${C.border}` }}>
              <ScissorsLineDashed size={11} /> 分割
            </button>
            <button onClick={() => { setClips([]); setAudioClips([]); setMarkers([]) }} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium" style={{ backgroundColor: C.card, color: '#EF4444', border: `1px solid ${C.border}` }}>
              <Trash2 size={11} /> 清空
            </button>
          </div>
        </div>

        {!timelineCollapsed && (
          <>
            {/* 刻度尺 */}
            <div className="relative h-5 rounded-lg" style={{ backgroundColor: 'rgba(0,0,0,0.25)' }} onPointerDown={handleRulerPointer}>
              {markers.map((m, i) => (
                <button
                  key={i}
                  onClick={e => { e.stopPropagation(); seekTo(m) }}
                  className="absolute top-0 z-10 w-2 h-2 rotate-45"
                  style={{ left: `calc(${(m / safeTotal) * 100}% - 4px)`, backgroundColor: '#F59E0B', border: '1px solid rgba(0,0,0,0.4)' }}
                  title={`标记 ${formatDur(m)}（点击跳转）`}
                />
              ))}
              {[...Array(Math.ceil(total) + 1).keys()].map(i => (
                <div key={i} className="absolute top-0 bottom-0 flex items-start" style={{ left: `${(i / safeTotal) * 100}%` }}>
                  <span className="text-[8px] px-1" style={{ color: C.sub }}>{i}s</span>
                </div>
              ))}
              <div className="absolute top-0 bottom-0 w-[2px] z-10 rounded-full" style={{ left: `${(playhead / safeTotal) * 100}%`, backgroundColor: C.accent, boxShadow: `0 0 8px ${C.accent}` }} />
            </div>

            {/* 视频轨道 */}
            <div className="relative h-10 rounded-lg overflow-hidden" style={{ backgroundColor: 'rgba(0,0,0,0.3)', border: `1px solid ${C.border}` }}>
              {clipStarts.map((cs, idx) => {
                const c = clips.find(x => x.id === cs.id)!
                const isSel = selectedClipId === cs.id
                return (
                  <div
                    key={cs.id}
                    onClick={() => { setSelectedClipId(cs.id); setSelectedAudioId(''); setPropTab('basic'); seekTo(cs.start) }}
                    className="absolute top-[3px] bottom-[3px] rounded-[7px] flex items-center justify-center text-[10px] font-medium truncate cursor-pointer"
                    style={{
                      left: `${(cs.start / safeTotal) * 100}%`,
                      width: `${(cs.dur / safeTotal) * 100}%`,
                      backgroundColor: isSel ? 'rgba(99,102,241,0.4)' : 'rgba(99,102,241,0.2)',
                      color: isSel ? '#fff' : C.sub,
                      border: isSel ? `1.5px solid ${C.accent}` : `1px solid rgba(99,102,241,0.25)`,
                    }}
                  >
                    <span className="truncate px-1">视频 {idx + 1} · {formatDur(cs.dur)}</span>
                    <div
                      className="absolute left-0 top-0 bottom-0 cursor-ew-resize"
                      style={{ width: isSel ? 10 : 8, backgroundColor: isSel ? 'rgba(255,255,255,0.9)' : 'transparent' }}
                      onPointerDown={e => handleTimelinePointer(e, 'clipStart', cs.id)}
                      title="拖动裁剪起点"
                    />
                    <div
                      className="absolute right-0 top-0 bottom-0 cursor-ew-resize"
                      style={{ width: isSel ? 10 : 8, backgroundColor: isSel ? 'rgba(255,255,255,0.9)' : 'transparent' }}
                      onPointerDown={e => handleTimelinePointer(e, 'clipEnd', cs.id)}
                      title="拖动裁剪终点"
                    />
                  </div>
                )
              })}
              {clips.length === 0 && <div className="absolute inset-0 flex items-center justify-center text-[10px]" style={{ color: C.sub }}>视频轨道为空：从素材库添加</div>}
            </div>

            {/* 音频轨道 */}
            <div className="relative h-9 rounded-lg overflow-hidden" style={{ backgroundColor: 'rgba(0,0,0,0.3)', border: `1px solid ${C.border}` }}>
              {audioClips.map((a, idx) => {
                const isSel = selectedAudioId === a.id
                const left = (a.delay / safeTotal) * 100
                const width = Math.min(100 - left, ((a.srcEnd - a.srcStart) / a.speed / safeTotal) * 100)
                const peaks = waveforms[a.url] || []
                return (
                  <div
                    key={a.id}
                    onClick={() => { setSelectedAudioId(a.id); setSelectedClipId(''); setPropTab('audio') }}
                    className="absolute top-[3px] bottom-[3px] rounded-[7px] flex items-center gap-1 px-1.5 cursor-grab active:cursor-grabbing"
                    style={{
                      left: `${left}%`,
                      width: `${Math.max(5, width)}%`,
                      backgroundColor: isSel ? 'rgba(34,197,94,0.4)' : 'rgba(34,197,94,0.18)',
                      border: isSel ? `1.5px solid #22c55e` : `1px solid rgba(34,197,94,0.25)`,
                    }}
                    onPointerDown={e => handleTimelinePointer(e, 'audioDelay', a.id)}
                    title="拖动调整延迟"
                  >
                    <Music size={10} style={{ color: isSel ? '#fff' : C.sub }} />
                    <div className="flex items-end gap-[1px] h-5 flex-1 overflow-hidden">
                      {peaks.slice(0, 30).map((pk, i) => (
                        <span key={i} className="w-[2px] rounded-sm" style={{ height: `${Math.max(8, pk * 100)}%`, backgroundColor: isSel ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.45)' }} />
                      ))}
                    </div>
                    <span className="text-[9px] font-medium truncate" style={{ color: isSel ? '#fff' : C.sub }}>音频 {idx + 1}</span>
                  </div>
                )
              })}
              {audioClips.length === 0 && <div className="absolute inset-0 flex items-center justify-center text-[10px]" style={{ color: C.sub }}>音频轨道为空：从素材库添加或 AI 配乐</div>}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
