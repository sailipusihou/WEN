'use client'

import { useRef, useState } from 'react'
import {
  Music, Mic, Upload, Loader2, Sparkles, Download, Trash2, Scissors, Check, Volume2, Play, Pause,
} from 'lucide-react'
import {
  AudioItem, getMediaDuration, exportEditedAudio, uploadMedia, formatDur,
} from './audioUtils'

interface Props {
  library: AudioItem[]
  setLibrary: React.Dispatch<React.SetStateAction<AudioItem[]>>
  selectedAudioUrl: string
  onSelectAudio: (url: string) => void
}

export default function AudioStudio({ library, setLibrary, selectedAudioUrl, onSelectAudio }: Props) {
  const [type, setType] = useState<'music' | 'speech'>('music')
  const [prompt, setPrompt] = useState('')
  const [voiceId, setVoiceId] = useState('male-qn-qingse')
  const [generating, setGenerating] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [editingUrl, setEditingUrl] = useState('')
  const [duration, setDuration] = useState(0)
  const [trimStart, setTrimStart] = useState(0)
  const [trimEnd, setTrimEnd] = useState(0)
  const [volume, setVolume] = useState(1)
  const [fadeIn, setFadeIn] = useState(0)
  const [fadeOut, setFadeOut] = useState(0)
  const [exporting, setExporting] = useState(false)
  const [previewing, setPreviewing] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const previewAudioRef = useRef<HTMLAudioElement>(null)

  const handleGenerate = async () => {
    const text = prompt.trim()
    if (!text) {
      setError(type === 'music' ? '请输入音乐风格提示词，如：东方韵味、古筝+笛子、舒缓、适合产品展示' : '请输入配音文案')
      return
    }
    setGenerating(true)
    setError('')
    try {
      const r = await fetch('/api/marketing/generate-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: text, type, voiceId }),
      })
      const d = await r.json()
      if (!r.ok || !d.success) {
        setError(d.error || '音频生成失败')
        return
      }
      const item: AudioItem = {
        url: d.url,
        name: `${type === 'music' ? '音乐' : '配音'} ${library.length + 1}`,
        kind: type,
      }
      getMediaDuration(d.url, 'audio').then(dur => {
        setLibrary(prev => prev.map(x => x.url === d.url ? { ...x, duration: dur } : x))
      }).catch(() => {})
      setLibrary(prev => [item, ...prev])
      onSelectAudio(d.url)
    } catch (e: any) {
      setError(e?.message || '网络错误，请重试')
    } finally {
      setGenerating(false)
    }
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploading(true)
    setError('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('type', 'audio')
      const r = await fetch('/api/upload', { method: 'POST', body: fd })
      const d = await r.json()
      if (!r.ok || !d.url) {
        setError(d.error || '上传失败')
        return
      }
      const item: AudioItem = { url: d.url, name: file.name, kind: 'upload' }
      getMediaDuration(d.url, 'audio').then(dur => {
        setLibrary(prev => prev.map(x => x.url === d.url ? { ...x, duration: dur } : x))
      }).catch(() => {})
      setLibrary(prev => [item, ...prev])
    } catch (err: any) {
      setError(err?.message || '上传失败')
    } finally {
      setUploading(false)
    }
  }

  const openEditor = async (item: AudioItem) => {
    if (editingUrl === item.url) {
      setEditingUrl('')
      return
    }
    setEditingUrl(item.url)
    setError('')
    try {
      const dur = item.duration || await getMediaDuration(item.url, 'audio')
      setDuration(dur)
      setTrimStart(0)
      setTrimEnd(dur)
      setVolume(1)
      setFadeIn(0)
      setFadeOut(0)
    } catch (err: any) {
      setError(err?.message || '无法读取音频时长')
    }
  }

  const togglePreview = () => {
    const el = previewAudioRef.current
    if (!el) return
    if (previewing) {
      el.pause()
      setPreviewing(false)
      return
    }
    el.volume = volume
    el.currentTime = trimStart
    el.play().then(() => setPreviewing(true)).catch(() => setError('浏览器禁止自动播放，请再次点击'))
  }

  const handleExport = async (item: AudioItem) => {
    setExporting(true)
    setError('')
    try {
      const blob = await exportEditedAudio(item.url, { trimStart, trimEnd, volume, fadeIn, fadeOut })
      const url = await uploadMedia(blob, 'audio', `edited-${Date.now()}.wav`)
      const newItem: AudioItem = { url, name: `${item.name}（已编辑）`, kind: 'edited', duration: trimEnd - trimStart }
      setLibrary(prev => [newItem, ...prev])
      onSelectAudio(url)
      setEditingUrl('')
    } catch (err: any) {
      setError(err?.message || '导出失败')
    } finally {
      setExporting(false)
    }
  }

  const handleDownload = async (url: string, name: string) => {
    try {
      const r = await fetch(url)
      const blob = await r.blob()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `${name.replace(/[\\/:*?"<>|]/g, '_')}-${Date.now()}.mp3`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(a.href)
    } catch {
      window.open(url, '_blank')
    }
  }

  return (
    <div className="rounded-2xl p-4 space-y-3" style={{ backgroundColor: 'var(--adm-card)', border: '1px solid var(--adm-border)' }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Music size={16} style={{ color: 'var(--adm-accent)' }} />
          <p className="text-sm font-semibold" style={{ color: 'var(--adm-text)' }}>音频工作室（AI 生成 / 编辑）</p>
          <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--adm-input)', color: 'var(--adm-text-secondary)', border: '1px dashed var(--adm-border)' }}>
            {library.length} 个音频
          </span>
        </div>
      </div>

      <p className="text-[10px]" style={{ color: 'var(--adm-text-secondary)' }}>
        用提示词生成背景音乐（约 1-3 分钟）或配音（MiniMax），也可上传音频；生成后可裁剪、调音量、淡入淡出并导出。
      </p>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => { setType('music'); setPrompt('') }}
          className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium"
          style={{
            backgroundColor: type === 'music' ? 'var(--adm-accent)' : 'var(--adm-input)',
            color: type === 'music' ? 'var(--adm-accent-text)' : 'var(--adm-text-secondary)',
            border: '1px solid var(--adm-border)',
          }}
        >
          <Music size={13} /> 背景音乐
        </button>
        <button
          type="button"
          onClick={() => { setType('speech'); setPrompt('') }}
          className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium"
          style={{
            backgroundColor: type === 'speech' ? 'var(--adm-accent)' : 'var(--adm-input)',
            color: type === 'speech' ? 'var(--adm-accent-text)' : 'var(--adm-text-secondary)',
            border: '1px solid var(--adm-border)',
          }}
        >
          <Mic size={13} /> 配音
        </button>
      </div>

      <div>
        <label className="text-[10px] font-semibold uppercase tracking-[0.18em] mb-1.5 block" style={{ color: 'var(--adm-text-secondary)' }}>
          音频提示词 {type === 'speech' ? '（配音文案）' : ''}
        </label>
        <textarea
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          rows={2}
          placeholder={type === 'music'
            ? '如：东方韵味，古筝+笛子，舒缓悠扬，适合高端茶具产品展示，无歌词'
            : '如：这款青花瓷茶具采用传统手工工艺，每一笔都蕴含东方美学，现在下单享专属礼盒包装。'}
          className="w-full px-3 py-2 text-sm rounded-lg resize-none"
          style={{ backgroundColor: 'var(--adm-input)', border: '1px solid var(--adm-input-border)', color: 'var(--adm-text)' }}
        />
      </div>

      {type === 'speech' && (
        <div>
          <label className="text-[10px] font-semibold uppercase tracking-[0.18em] mb-1.5 block" style={{ color: 'var(--adm-text-secondary)' }}>
            音色 ID（MiniMax 音色编号，留空用默认男声）
          </label>
          <input
            value={voiceId}
            onChange={e => setVoiceId(e.target.value)}
            placeholder="male-qn-qingse"
            className="w-full px-3 py-2 rounded-lg text-xs outline-none"
            style={{ backgroundColor: 'var(--adm-input)', border: '1px solid var(--adm-input-border)', color: 'var(--adm-text)' }}
          />
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="flex-1 px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
          style={{ backgroundColor: 'var(--adm-accent)', color: 'var(--adm-accent-text)' }}
        >
          {generating ? <><Loader2 size={14} className="animate-spin" /> 正在生成...</> : <><Sparkles size={14} /> 生成音频</>}
        </button>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50"
          style={{ backgroundColor: 'var(--adm-input)', color: 'var(--adm-text)', border: '1px solid var(--adm-border)' }}
        >
          {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />} 上传音频
        </button>
        <input ref={fileRef} type="file" accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg,.flac" className="hidden" onChange={handleUpload} />
      </div>

      {error && (
        <div className="rounded-lg p-3 flex items-center gap-2" style={{ backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.35)' }}>
          <p className="text-xs flex-1" style={{ color: '#DC2626' }}>{error}</p>
          <button onClick={() => setError('')} className="text-[11px]" style={{ color: '#DC2626' }}>关闭</button>
        </div>
      )}

      <audio ref={previewAudioRef} className="hidden" onPause={() => setPreviewing(false)} onEnded={() => setPreviewing(false)}
        onTimeUpdate={e => {
          const el = e.currentTarget
          if (el.currentTime >= trimEnd) {
            el.pause()
            el.currentTime = trimStart
          }
        }}
      />

      {library.length > 0 && (
        <div className="space-y-2">
          {library.map((item, idx) => (
            <div key={item.url} className="rounded-xl p-3 space-y-2" style={{ backgroundColor: 'var(--adm-input)', border: '1px solid var(--adm-border)' }}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-medium truncate flex items-center gap-1" style={{ color: 'var(--adm-text)' }}>
                  {item.kind === 'music' ? <Music size={11} style={{ color: 'var(--adm-accent)' }} /> : item.kind === 'speech' ? <Mic size={11} style={{ color: 'var(--adm-accent)' }} /> : <Volume2 size={11} style={{ color: 'var(--adm-accent)' }} />}
                  {item.name}
                </span>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className="text-[10px]" style={{ color: 'var(--adm-text-secondary)' }}>
                    {item.duration ? formatDur(item.duration) : ''}
                  </span>
                  <button onClick={() => { onSelectAudio(item.url); if (editingUrl) setEditingUrl('') }} className="px-2 py-1 rounded-lg text-[10px] font-medium" style={{ backgroundColor: selectedAudioUrl === item.url ? 'var(--adm-accent)' : 'var(--adm-card)', color: selectedAudioUrl === item.url ? 'var(--adm-accent-text)' : 'var(--adm-text-secondary)', border: '1px solid var(--adm-border)' }}>
                    {selectedAudioUrl === item.url ? <><Check size={10} className="inline mr-0.5" />已入编辑区</> : '发到编辑区'}
                  </button>
                  <button onClick={() => openEditor(item)} className="p-1.5 rounded-lg" style={{ color: 'var(--adm-text-secondary)' }} title="编辑音频">
                    <Scissors size={13} />
                  </button>
                  <button onClick={() => handleDownload(item.url, item.name)} className="p-1.5 rounded-lg" style={{ color: 'var(--adm-text-secondary)' }} title="下载音频">
                    <Download size={13} />
                  </button>
                  <button onClick={() => setLibrary(prev => prev.filter(x => x.url !== item.url))} className="p-1.5 rounded-lg" style={{ color: 'var(--adm-text-secondary)' }} title="移除音频">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
              <audio controls preload="none" src={item.url} className="w-full h-8" />

              {editingUrl === item.url && (
                <div className="space-y-2 pt-1" style={{ borderTop: '1px dashed var(--adm-border)' }}>
                  <p className="text-[10px] font-medium" style={{ color: 'var(--adm-text-secondary)' }}>音频编辑（裁剪 / 音量 / 淡入淡出）</p>
                  <div>
                    <div className="flex justify-between text-[10px] mb-1" style={{ color: 'var(--adm-text-secondary)' }}>
                      <span>开始 {formatDur(trimStart)}</span>
                      <span>结束 {formatDur(trimEnd)}</span>
                    </div>
                    <input type="range" min={0} max={Math.max(1, duration)} step={0.1} value={trimStart} onChange={e => { const v = Number(e.target.value); setTrimStart(Math.min(v, trimEnd - 0.1)) }} className="w-full" />
                    <input type="range" min={0} max={Math.max(1, duration)} step={0.1} value={trimEnd} onChange={e => { const v = Number(e.target.value); setTrimEnd(Math.max(v, trimStart + 0.1)) }} className="w-full" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] mb-1 block" style={{ color: 'var(--adm-text-secondary)' }}>音量 {Math.round(volume * 100)}%</label>
                      <input type="range" min={0.05} max={3} step={0.05} value={volume} onChange={e => setVolume(Number(e.target.value))} className="w-full" />
                    </div>
                    <div>
                      <label className="text-[10px] mb-1 block" style={{ color: 'var(--adm-text-secondary)' }}>淡入 {fadeIn.toFixed(1)}s / 淡出 {fadeOut.toFixed(1)}s</label>
                      <div className="flex gap-1.5">
                        <input type="range" min={0} max={Math.min(5, (trimEnd - trimStart) / 2)} step={0.1} value={fadeIn} onChange={e => setFadeIn(Number(e.target.value))} className="flex-1" />
                        <input type="range" min={0} max={Math.min(5, (trimEnd - trimStart) / 2)} step={0.1} value={fadeOut} onChange={e => setFadeOut(Number(e.target.value))} className="flex-1" />
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        const el = previewAudioRef.current
                        if (el) {
                          if (el.src !== item.url) el.src = item.url
                          el.volume = volume
                          togglePreview()
                        }
                      }}
                      className="flex-1 px-3 py-1.5 rounded-lg text-[11px] font-medium flex items-center justify-center gap-1.5"
                      style={{ backgroundColor: 'var(--adm-card)', color: 'var(--adm-text)', border: '1px solid var(--adm-border)' }}
                    >
                      {previewing ? <><Pause size={12} /> 暂停预览</> : <><Play size={12} /> 预览（裁剪后）</>}
                    </button>
                    <button
                      onClick={() => handleExport(item)}
                      disabled={exporting}
                      className="flex-1 px-3 py-1.5 rounded-lg text-[11px] font-medium flex items-center justify-center gap-1.5 disabled:opacity-50"
                      style={{ backgroundColor: 'var(--adm-accent)', color: 'var(--adm-accent-text)' }}
                    >
                      {exporting ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                      导出 WAV 到音频库
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {library.length === 0 && (
        <div className="rounded-xl flex flex-col items-center justify-center py-8 text-center" style={{ backgroundColor: 'var(--adm-input)', border: '1px dashed var(--adm-border)' }}>
          <Music size={22} style={{ color: 'var(--adm-text-secondary)', opacity: 0.4 }} />
          <p className="text-[11px] mt-2" style={{ color: 'var(--adm-text-secondary)' }}>音频库为空：生成一段背景音乐、上传音频，或先编辑已生成视频的原声</p>
        </div>
      )}
    </div>
  )
}
