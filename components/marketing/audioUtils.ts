// 客户端音频/视频编辑工具（Web Audio API + MediaRecorder）
// 用于：音频裁剪/音量/淡入淡出导出 WAV；视频+音频浏览器端合成 WebM

export interface AudioItem {
  url: string
  name: string
  kind: 'music' | 'speech' | 'upload' | 'edited'
  duration?: number
}

export interface AudioEditOptions {
  trimStart: number
  trimEnd: number
  volume: number
  fadeIn: number
  fadeOut: number
  echo?: number
  lowpass?: number
  speed?: number
}

export function getMediaDuration(src: string, kind: 'video' | 'audio'): Promise<number> {
  return new Promise((resolve, reject) => {
    const el: any = kind === 'video' ? document.createElement('video') : new Audio()
    el.preload = 'metadata'
    el.onloadedmetadata = () => {
      const d = Number(el.duration)
      el.src = ''
      resolve(Number.isFinite(d) && d > 0 ? d : 0)
    }
    el.onerror = () => {
      el.src = ''
      reject(new Error('无法读取媒体时长，请确认文件可用'))
    }
    el.src = src
  })
}

export function getVideoMeta(src: string): Promise<{ duration: number; aspect: string }> {
  return new Promise((resolve, reject) => {
    const el = document.createElement('video')
    el.preload = 'metadata'
    el.onloadedmetadata = () => {
      const d = Number(el.duration)
      const w = el.videoWidth || 0
      const h = el.videoHeight || 0
      let aspect = '横屏'
      if (w && h) {
        const r = w / h
        if (r < 0.9) aspect = '竖屏'
        else if (r > 1.1) aspect = '横屏'
        else aspect = '方形'
      }
      el.src = ''
      resolve({ duration: Number.isFinite(d) && d > 0 ? d : 0, aspect })
    }
    el.onerror = () => {
      el.src = ''
      reject(new Error('无法读取视频信息'))
    }
    el.src = src
  })
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v))
}

function audioCtxClass(): typeof AudioContext {
  return window.AudioContext || (window as any).webkitAudioContext
}

function offlineCtxClass(): typeof OfflineAudioContext {
  return window.OfflineAudioContext || (window as any).webkitOfflineAudioContext
}

export function encodeWav(audioBuffer: AudioBuffer): Blob {
  const numCh = Math.min(2, audioBuffer.numberOfChannels)
  const sampleRate = audioBuffer.sampleRate
  const numFrames = audioBuffer.length
  const bytesPerSample = 2
  const blockAlign = numCh * bytesPerSample
  const dataSize = numFrames * blockAlign
  const buffer = new ArrayBuffer(44 + dataSize)
  const view = new DataView(buffer)
  const writeStr = (off: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i))
  }
  writeStr(0, 'RIFF')
  view.setUint32(4, 36 + dataSize, true)
  writeStr(8, 'WAVE')
  writeStr(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, numCh, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * blockAlign, true)
  view.setUint16(32, blockAlign, true)
  view.setUint16(34, 16, true)
  writeStr(36, 'data')
  view.setUint32(40, dataSize, true)
  const channels: Float32Array[] = []
  for (let c = 0; c < numCh; c++) channels.push(audioBuffer.getChannelData(c))
  let off = 44
  for (let i = 0; i < numFrames; i++) {
    for (let c = 0; c < numCh; c++) {
      const s = clamp(channels[c][i], -1, 1)
      view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7fff, true)
      off += 2
    }
  }
  return new Blob([buffer], { type: 'audio/wav' })
}

export async function exportEditedAudio(src: string, opts: AudioEditOptions): Promise<Blob> {
  const res = await fetch(src)
  if (!res.ok) throw new Error('音频加载失败')
  const arrayBuf = await res.arrayBuffer()
  const ctx = new (audioCtxClass())()
  const buffer = await ctx.decodeAudioData(arrayBuf)
  await ctx.close()

  const sr = buffer.sampleRate
  const start = Math.max(0, opts.trimStart)
  const end = Math.min(buffer.duration, opts.trimEnd > start ? opts.trimEnd : buffer.duration)
  const speed = clamp(opts.speed || 1, 0.5, 2)
  const echo = clamp(opts.echo || 0, 0, 0.9)
  const lowpass = clamp(opts.lowpass || 0, 0, 20000)
  const tail = echo > 0 ? 0.8 : 0
  const len = Math.max(1, Math.floor(((end - start) / speed + tail) * sr))
  const numCh = Math.min(2, buffer.numberOfChannels)
  const off = new (offlineCtxClass())(numCh, len, sr)

  const srcNode = off.createBufferSource()
  srcNode.buffer = buffer
  srcNode.playbackRate.value = speed
  const gain = off.createGain()
  const vol = clamp(opts.volume || 1, 0.05, 3)
  const dur = (end - start) / speed
  const fadeIn = clamp(opts.fadeIn || 0, 0, dur / 2)
  const fadeOut = clamp(opts.fadeOut || 0, 0, dur / 2)
  gain.gain.setValueAtTime(0, 0)
  if (fadeIn > 0.01) {
    gain.gain.linearRampToValueAtTime(vol, fadeIn)
  } else {
    gain.gain.setValueAtTime(vol, 0)
  }
  if (fadeOut > 0.01) {
    gain.gain.setValueAtTime(vol, dur - fadeOut)
    gain.gain.linearRampToValueAtTime(0, dur)
  }
  let tailNode: AudioNode = srcNode
  if (lowpass > 0) {
    const lp = off.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = lowpass
    srcNode.connect(lp)
    tailNode = lp
  }
  if (echo > 0) {
    const delay = off.createDelay(1)
    delay.delayTime.value = 0.25
    const feedback = off.createGain()
    feedback.gain.value = echo * 0.6
    const wet = off.createGain()
    wet.gain.value = echo
    tailNode.connect(delay)
    delay.connect(feedback)
    feedback.connect(delay)
    delay.connect(wet)
    wet.connect(gain)
  }
  tailNode.connect(gain)
  gain.connect(off.destination)
  srcNode.start(0, start, dur)
  const rendered = await off.startRendering()
  return encodeWav(rendered)
}

function pickMime(): string {
  const candidates = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm;codecs=vp9',
    'video/webm',
  ]
  for (const c of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(c)) return c
  }
  return ''
}

export interface ComposeOptions {
  audioUrl: string
  keepOriginalAudio: boolean
  videoStart: number
  videoEnd: number
  audioStart: number
  audioEnd: number
  audioDelay: number
  volume: number
  videoFilter?: string
  zoom?: string
  vignette?: boolean
  textOverlay?: { text: string; position: string; size: number; color: string } | null
  videoFadeIn?: number
  videoFadeOut?: number
  echo?: number
  lowpass?: number
  speed?: number
  outputAspect?: string
  flipH?: boolean
  rotate?: number
  videoSpeed?: number
  onProgress?: (p: number) => void
}

const VIDEO_FILTERS: Record<string, string> = {
  bright: 'brightness(1.12) contrast(1.06) saturate(1.15)',
  warm: 'sepia(0.28) saturate(1.32) brightness(1.05) contrast(1.03)',
  cool: 'hue-rotate(12deg) saturate(1.22) brightness(1.03)',
  bw: 'grayscale(1) contrast(1.08)',
  sepia: 'sepia(0.72) contrast(1.06) brightness(1.02)',
  soft: 'blur(2px) brightness(1.04)',
}

export interface VideoClip {
  id: string
  url: string
  srcStart: number
  srcEnd: number
  speed: number
  filter: string
  zoom: string
  vignette: boolean
  flipH: boolean
  rotate: number
  fadeIn: number
  fadeOut: number
  text: string
  textPosition: string
  textSize: number
  textColor: string
  keepOriginal: boolean
  brightness: number
  contrast: number
  saturation: number
  warmth: number
  hue: number
  effect: string
  sticker: { emoji: string; position: string; size: number } | null
}

export interface AudioClip {
  id: string
  url: string
  srcStart: number
  srcEnd: number
  volume: number
  speed: number
  echo: number
  lowpass: number
  delay: number
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

const EFFECT_FILTERS: Record<string, string> = {
  film: 'contrast(1.1) saturate(1.15) sepia(0.18) brightness(0.98)',
  cyber: 'contrast(1.25) saturate(1.5) hue-rotate(18deg) brightness(1.04)',
  fresh: 'brightness(1.08) saturate(1.25) contrast(1.03)',
  retro: 'sepia(0.55) contrast(1.05) brightness(1.03) saturate(0.9)',
  bloom: 'brightness(1.12) contrast(0.92) saturate(1.1) blur(0.4px)',
  portrait: 'brightness(1.06) contrast(1.05) saturate(1.08) blur(0.3px)',
}

function drawClipFrame(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  clip: VideoClip,
  srcW: number,
  srcH: number,
  canvas: HTMLCanvasElement,
  fitScale: number,
  needsBg: boolean,
  t: number,
  durT: number
) {
  const playRate = Math.max(0.5, Math.min(2, clip.speed || 1))
  const p = Math.min(1, Math.max(0, t / durT))
  const warmShift = Math.max(-1, Math.min(1, clip.warmth || 0))
  const hueShift = Math.round((clip.hue || 0) + warmShift * 12)
  const colorFilter = `brightness(${clip.brightness ?? 1}) contrast(${clip.contrast ?? 1}) saturate(${clip.saturation ?? 1}) hue-rotate(${hueShift}deg)${warmShift > 0 ? ` sepia(${(warmShift * 0.45).toFixed(2)})` : ''}`
  const baseFilter = EFFECT_FILTERS[clip.effect || ''] || 'none'
  const filter = clip.effect ? `${colorFilter} ${baseFilter}` : colorFilter
  if (needsBg) {
    const coverScale = Math.max(canvas.width / srcW, canvas.height / srcH)
    const bw = srcW * coverScale
    const bh = srcH * coverScale
    ctx.save()
    ctx.filter = 'blur(22px) brightness(0.6)'
    ctx.drawImage(video, (srcW - bw) / 2, (srcH - bh) / 2, bw, bh, 0, 0, canvas.width, canvas.height)
    ctx.filter = 'none'
    ctx.restore()
  }
  ctx.save()
  ctx.translate(canvas.width / 2, canvas.height / 2)
  if (clip.flipH) ctx.scale(-1, 1)
  ctx.rotate(((clip.rotate || 0) * Math.PI) / 180)
  ctx.filter = `${filter} ${VIDEO_FILTERS[clip.filter || ''] || ''}`.trim() || 'none'
  const zoomFactor = clip.zoom === 'slow-in' ? 1 + 0.14 * p : 1
  const sw = srcW / zoomFactor
  const sh = srcH / zoomFactor
  const sx = (srcW - sw) / 2
  const sy = (srcH - sh) / 2
  const vw = srcW * fitScale * zoomFactor
  const vh = srcH * fitScale * zoomFactor
  const fadeIn = Math.min(clip.fadeIn || 0, durT / playRate / 2)
  const fadeOut = Math.min(clip.fadeOut || 0, durT / playRate / 2)
  let alpha = 1
  if (fadeIn > 0.01) alpha = Math.min(1, t / fadeIn)
  if (fadeOut > 0.01) alpha = Math.min(alpha, Math.max(0, (durT - t) / fadeOut))
  ctx.globalAlpha = alpha
  ctx.drawImage(video, sx, sy, sw, sh, -vw / 2, -vh / 2, vw, vh)
  ctx.filter = 'none'
  ctx.globalAlpha = 1
  ctx.restore()
  if (clip.vignette) {
    const g = ctx.createRadialGradient(
      canvas.width / 2, canvas.height / 2, Math.min(canvas.width, canvas.height) * 0.42,
      canvas.width / 2, canvas.height / 2, Math.max(canvas.width, canvas.height) * 0.72
    )
    g.addColorStop(0, 'rgba(0,0,0,0)')
    g.addColorStop(1, 'rgba(0,0,0,0.34)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }
  if (clip.text && clip.text.trim()) {
    const lines = clip.text.split('\n').slice(0, 3)
    const size = Math.max(16, Math.min(64, clip.textSize || 28))
    ctx.font = `600 ${size}px "Microsoft YaHei","PingFang SC",sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    const lineH = size * 1.35
    const totalH = lines.length * lineH
    let baseY = canvas.height / 2
    if (clip.textPosition === 'top') baseY = size + 12
    if (clip.textPosition === 'bottom') baseY = canvas.height - size - 12
    ctx.fillStyle = 'rgba(0,0,0,0.45)'
    ctx.fillRect(0, baseY - totalH / 2 - 8, canvas.width, totalH + 16)
    ctx.fillStyle = clip.textColor || '#ffffff'
    lines.forEach((ln, i) => {
      ctx.fillText(ln, canvas.width / 2, baseY + i * lineH)
    })
  }
  if (clip.sticker && clip.sticker.emoji) {
    const size = Math.max(18, Math.min(120, clip.sticker.size || 48))
    ctx.font = `${size}px "Segoe UI Emoji","Apple Color Emoji",sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    const pad = size * 0.8
    let sx = canvas.width / 2
    let sy = canvas.height / 2
    if (clip.sticker.position === 'tl') { sx = pad; sy = pad }
    if (clip.sticker.position === 'tr') { sx = canvas.width - pad; sy = pad }
    if (clip.sticker.position === 'bl') { sx = pad; sy = canvas.height - pad }
    if (clip.sticker.position === 'br') { sx = canvas.width - pad; sy = canvas.height - pad }
    ctx.fillText(clip.sticker.emoji, sx, sy)
  }
}

export async function composeVideoClient(videoSrc: string, opts: ComposeOptions): Promise<Blob> {
  const vRes = await fetch(videoSrc)
  if (!vRes.ok) throw new Error('视频加载失败')
  const vBlob = await vRes.blob()
  const vUrl = URL.createObjectURL(vBlob)

  const video = document.createElement('video')
  video.muted = !opts.keepOriginalAudio
  video.playsInline = true
  video.src = vUrl
  await new Promise<void>((resolve, reject) => {
    video.onloadedmetadata = () => resolve()
    video.onerror = () => {
      URL.revokeObjectURL(vUrl)
      reject(new Error('无法读取视频，浏览器端合成不可用'))
    }
  })

  const dur = Number(video.duration) || 0
  const start = Math.max(0, opts.videoStart)
  const end = Math.min(dur, opts.videoEnd > start ? opts.videoEnd : dur)
  if (end - start < 0.1) {
    video.src = ''
    URL.revokeObjectURL(vUrl)
    throw new Error('视频起止时间无效')
  }

  video.playbackRate = clamp(opts.videoSpeed || 1, 0.5, 2)

  const srcW = video.videoWidth || 1280
  const srcH = video.videoHeight || 720
  const rotDeg = [90, 180, 270].includes(opts.rotate || 0) ? (opts.rotate || 0) : 0
  const isSideRotate = rotDeg === 90 || rotDeg === 270
  let baseW = isSideRotate ? srcH : srcW
  let baseH = isSideRotate ? srcW : srcH
  const aspect = opts.outputAspect || 'source'
  if (aspect === '16:9' || aspect === '9:16' || aspect === '1:1') {
    const [aw, ah] = aspect === '16:9' ? [16, 9] : aspect === '9:16' ? [9, 16] : [1, 1]
    if (baseW / baseH > aw / ah) {
      baseW = baseH * aw / ah
    } else {
      baseH = baseW * ah / aw
    }
  }
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(2, Math.round(baseW))
  canvas.height = Math.max(2, Math.round(baseH))
  const outAspect = canvas.width / canvas.height
  const srcAspectRot = isSideRotate ? srcH / srcW : srcW / srcH
  const needsBg = Math.abs(outAspect - srcAspectRot) > 0.01
  const fitScale = isSideRotate
    ? Math.min(canvas.width / srcH, canvas.height / srcW)
    : Math.min(canvas.width / srcW, canvas.height / srcH)
  const rad = rotDeg * Math.PI / 180
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 不可用')

  const stream = canvas.captureStream(30)
  const audioCtx = new (audioCtxClass())()
  const dest = audioCtx.createMediaStreamDestination()

  if (opts.keepOriginalAudio) {
    try {
      const srcNode = audioCtx.createMediaElementSource(video)
      srcNode.connect(dest)
    } catch {
      // 某些浏览器不允许重复连接，忽略
    }
  }

  let audioBuffer: AudioBuffer | null = null
  if (opts.audioUrl) {
    const aRes = await fetch(opts.audioUrl)
    if (!aRes.ok) throw new Error('音频加载失败')
    const aBuf = await aRes.arrayBuffer()
    audioBuffer = await audioCtx.decodeAudioData(aBuf)
    const aSrc = audioCtx.createBufferSource()
    aSrc.buffer = audioBuffer
    aSrc.playbackRate.value = clamp(opts.speed || 1, 0.5, 2)
    const gain = audioCtx.createGain()
    gain.gain.value = clamp(opts.volume || 1, 0.05, 3)
    const echo = clamp(opts.echo || 0, 0, 0.9)
    const lowpass = clamp(opts.lowpass || 0, 0, 20000)
    let chain: AudioNode = aSrc
    if (lowpass > 0) {
      const lp = audioCtx.createBiquadFilter()
      lp.type = 'lowpass'
      lp.frequency.value = lowpass
      chain.connect(lp)
      chain = lp
    }
    if (echo > 0) {
      const delay = audioCtx.createDelay(1)
      delay.delayTime.value = 0.25
      const feedback = audioCtx.createGain()
      feedback.gain.value = echo * 0.6
      const wet = audioCtx.createGain()
      wet.gain.value = echo
      chain.connect(delay)
      delay.connect(feedback)
      feedback.connect(delay)
      delay.connect(wet)
      wet.connect(gain)
    }
    chain.connect(gain)
    gain.connect(dest)
    const aStart = Math.max(0, opts.audioStart)
    const aEnd = opts.audioEnd > aStart ? opts.audioEnd : audioBuffer.duration
    const aDur = Math.max(0.05, (aEnd - aStart) / aSrc.playbackRate.value)
    aSrc.start(audioCtx.currentTime + Math.max(0, opts.audioDelay || 0), aStart, aDur)
  }

  const audioTrack = dest.stream.getAudioTracks()[0]
  if (audioTrack) stream.addTrack(audioTrack)

  const mime = pickMime()
  const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined)
  const chunks: BlobPart[] = []
  rec.ondataavailable = (e: BlobEvent) => {
    if (e.data && e.data.size > 0) chunks.push(e.data)
  }
  const done = new Promise<Blob>(resolve => {
    rec.onstop = () => resolve(new Blob(chunks, { type: mime || 'video/webm' }))
  })

  video.currentTime = start
  let stopped = false
  let raf = 0
  const stop = () => {
    if (stopped) return
    stopped = true
    cancelAnimationFrame(raf)
    try { video.pause() } catch {}
    try { video.src = '' } catch {}
    URL.revokeObjectURL(vUrl)
    if (rec.state !== 'inactive') rec.stop()
    setTimeout(() => { try { audioCtx.close() } catch {} }, 500)
  }

  const draw = () => {
    if (stopped) return
    if (video.currentTime >= end || video.ended) {
      stop()
      return
    }
    const durT = end - start
    const playRate = video.playbackRate || 1
    const t = (video.currentTime - start) / playRate
    const p = Math.min(1, Math.max(0, (video.currentTime - start) / durT))

    if (needsBg) {
      // 模糊背景填充（剪映式：源画面铺满 + 高斯模糊 + 压暗）
      const coverScale = Math.max(canvas.width / srcW, canvas.height / srcH)
      const bw = srcW * coverScale
      const bh = srcH * coverScale
      ctx.save()
      ctx.filter = 'blur(22px) brightness(0.6)'
      ctx.drawImage(video, (srcW - bw) / 2, (srcH - bh) / 2, bw, bh, 0, 0, canvas.width, canvas.height)
      ctx.filter = 'none'
      ctx.restore()
    }

    ctx.save()
    ctx.translate(canvas.width / 2, canvas.height / 2)
    if (opts.flipH) ctx.scale(-1, 1)
    ctx.rotate(rad)
    ctx.filter = VIDEO_FILTERS[opts.videoFilter || ''] || 'none'
    const zoomFactor = opts.zoom === 'slow-in' ? 1 + 0.14 * p : 1
    const sw = srcW / zoomFactor
    const sh = srcH / zoomFactor
    const sx = (srcW - sw) / 2
    const sy = (srcH - sh) / 2
    const vw = srcW * fitScale * zoomFactor
    const vh = srcH * fitScale * zoomFactor
    const fadeIn = Math.min(opts.videoFadeIn || 0, durT / playRate / 2)
    const fadeOut = Math.min(opts.videoFadeOut || 0, durT / playRate / 2)
    let alpha = 1
    if (fadeIn > 0.01) alpha = Math.min(1, t / fadeIn)
    if (fadeOut > 0.01) alpha = Math.min(alpha, Math.max(0, (durT - t) / fadeOut))
    ctx.globalAlpha = alpha
    ctx.drawImage(video, sx, sy, sw, sh, -vw / 2, -vh / 2, vw, vh)
    ctx.filter = 'none'
    ctx.globalAlpha = 1
    ctx.restore()

    if (opts.vignette) {
      const g = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, Math.min(canvas.width, canvas.height) * 0.42,
        canvas.width / 2, canvas.height / 2, Math.max(canvas.width, canvas.height) * 0.72
      )
      g.addColorStop(0, 'rgba(0,0,0,0)')
      g.addColorStop(1, 'rgba(0,0,0,0.34)')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    }
    const overlay = opts.textOverlay
    if (overlay && overlay.text.trim()) {
      const lines = overlay.text.split('\n').slice(0, 3)
      const size = Math.max(16, Math.min(64, overlay.size || 28))
      ctx.font = `600 ${size}px "Microsoft YaHei","PingFang SC",sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      const lineH = size * 1.35
      const totalH = lines.length * lineH
      let baseY = canvas.height / 2
      if (overlay.position === 'top') baseY = size + 12
      if (overlay.position === 'bottom') baseY = canvas.height - size - 12
      ctx.fillStyle = 'rgba(0,0,0,0.45)'
      ctx.fillRect(0, baseY - totalH / 2 - 8, canvas.width, totalH + 16)
      ctx.fillStyle = overlay.color || '#ffffff'
      lines.forEach((ln, i) => {
        ctx.fillText(ln, canvas.width / 2, baseY + i * lineH)
      })
    }
    opts.onProgress?.(Math.min(1, (video.currentTime - start) / (end - start)))
    raf = requestAnimationFrame(draw)
  }

  video.ontimeupdate = () => {
    if (video.currentTime >= end) stop()
  }
  video.onended = () => stop()

  rec.start(500)
  try {
    await video.play()
  } catch {
    stop()
    throw new Error('浏览器禁止自动播放，请再次点击合成按钮')
  }
  draw()

  const blob = await done
  return blob
}

export async function composeMultiClipClient(
  videoClips: VideoClip[],
  audioClips: AudioClip[],
  outputAspect: string,
  onProgress?: (p: number) => void
): Promise<Blob> {
  if (!videoClips.length) throw new Error('请至少添加一个视频片段')

  const loaded: { clip: VideoClip; el: HTMLVideoElement; srcW: number; srcH: number; dur: number }[] = []
  for (const clip of videoClips) {
    const res = await fetch(clip.url)
    if (!res.ok) throw new Error('视频片段加载失败')
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const el = document.createElement('video')
    el.playsInline = true
    el.muted = !clip.keepOriginal
    el.volume = clip.keepOriginal ? 0 : 1
    el.src = url
    await new Promise<void>((resolve, reject) => {
      el.onloadedmetadata = () => resolve()
      el.onerror = () => {
        URL.revokeObjectURL(url)
        reject(new Error('视频片段读取失败'))
      }
    })
    loaded.push({ clip, el, srcW: el.videoWidth || 1280, srcH: el.videoHeight || 720, dur: Number(el.duration) || 0 })
  }

  const starts: number[] = []
  const clipDurs: number[] = []
  let total = 0
  for (const l of loaded) {
    starts.push(total)
    const s = Math.max(0, l.clip.srcStart)
    const e = Math.min(l.dur, l.clip.srcEnd > s ? l.clip.srcEnd : l.dur)
    const d = Math.max(0.1, (e - s) / Math.max(0.5, Math.min(2, l.clip.speed || 1)))
    clipDurs.push(d)
    total += d
  }

  const first = loaded[0]
  const isSideRotate = first.clip.rotate === 90 || first.clip.rotate === 270
  let baseW = isSideRotate ? first.srcH : first.srcW
  let baseH = isSideRotate ? first.srcW : first.srcH
  const aspect = outputAspect || 'source'
  if (aspect === '16:9' || aspect === '9:16' || aspect === '1:1') {
    const [aw, ah] = aspect === '16:9' ? [16, 9] : aspect === '9:16' ? [9, 16] : [1, 1]
    if (baseW / baseH > aw / ah) baseW = baseH * aw / ah
    else baseH = baseW * ah / aw
  }
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(2, Math.round(baseW))
  canvas.height = Math.max(2, Math.round(baseH))
  const fitScale = isSideRotate
    ? Math.min(canvas.width / first.srcH, canvas.height / first.srcW)
    : Math.min(canvas.width / first.srcW, canvas.height / first.srcH)
  const needsBg = Math.abs(canvas.width / canvas.height - (isSideRotate ? first.srcH / first.srcW : first.srcW / first.srcH)) > 0.01
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 不可用')

  const audioCtx = new (audioCtxClass())()
  const dest = audioCtx.createMediaStreamDestination()
  const nodeGains: GainNode[] = []
  loaded.forEach((l, i) => {
    try {
      const src = audioCtx.createMediaElementSource(l.el)
      const g = audioCtx.createGain()
      g.gain.value = l.clip.keepOriginal ? 1 : 0
      src.connect(g)
      g.connect(dest)
      nodeGains.push(g)
    } catch {
      const g = audioCtx.createGain()
      g.gain.value = 0
      g.connect(dest)
      nodeGains.push(g)
    }
  })

  for (const a of audioClips) {
    try {
      const res = await fetch(a.url)
      if (!res.ok) continue
      const buf = await audioCtx.decodeAudioData(await res.arrayBuffer())
      const src = audioCtx.createBufferSource()
      src.buffer = buf
      src.playbackRate.value = clamp(a.speed || 1, 0.5, 2)
      const gain = audioCtx.createGain()
      gain.gain.value = clamp(a.volume || 1, 0.05, 3)
      let chain: AudioNode = src
      if ((a.lowpass || 0) > 0) {
        const lp = audioCtx.createBiquadFilter()
        lp.type = 'lowpass'
        lp.frequency.value = a.lowpass
        chain.connect(lp)
        chain = lp
      }
      if ((a.echo || 0) > 0) {
        const delay = audioCtx.createDelay(1)
        delay.delayTime.value = 0.25
        const feedback = audioCtx.createGain()
        feedback.gain.value = clamp(a.echo, 0, 0.9) * 0.6
        const wet = audioCtx.createGain()
        wet.gain.value = clamp(a.echo, 0, 0.9)
        chain.connect(delay)
        delay.connect(feedback)
        feedback.connect(delay)
        delay.connect(wet)
        wet.connect(gain)
      }
      chain.connect(gain)
      gain.connect(dest)
      const s = Math.max(0, a.srcStart || 0)
      const e = a.srcEnd > s ? a.srcEnd : buf.duration
      const d = Math.max(0.05, (e - s) / src.playbackRate.value)
      src.start(audioCtx.currentTime + Math.max(0, a.delay || 0), s, d)
    } catch {}
  }

  const stream = canvas.captureStream(30)
  const audioTrack = dest.stream.getAudioTracks()[0]
  if (audioTrack) stream.addTrack(audioTrack)
  const mime = pickMime()
  const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined)
  const chunks: BlobPart[] = []
  rec.ondataavailable = (e: BlobEvent) => {
    if (e.data && e.data.size > 0) chunks.push(e.data)
  }
  const done = new Promise<Blob>(resolve => {
    rec.onstop = () => resolve(new Blob(chunks, { type: mime || 'video/webm' }))
  })

  const t0 = performance.now()
  let activeIdx = -1
  let stopped = false
  let raf = 0
  const stop = () => {
    if (stopped) return
    stopped = true
    cancelAnimationFrame(raf)
    loaded.forEach(l => {
      try { l.el.pause() } catch {}
      try { l.el.src = '' } catch {}
    })
    if (rec.state !== 'inactive') rec.stop()
    setTimeout(() => { try { audioCtx.close() } catch {} }, 500)
  }

  const draw = () => {
    if (stopped) return
    const t = (performance.now() - t0) / 1000
    if (t >= total) {
      stop()
      return
    }
    let idx = loaded.length - 1
    for (let i = 0; i < loaded.length; i++) {
      if (t < starts[i] + clipDurs[i]) {
        idx = i
        break
      }
    }
    if (idx !== activeIdx) {
      loaded.forEach((l, j) => {
        if (j !== idx) { try { l.el.pause() } catch {} }
      })
      activeIdx = idx
      const l = loaded[idx]
      l.el.currentTime = Math.min(l.dur, l.clip.srcStart + Math.max(0, t - starts[idx]) * l.clip.speed)
      l.el.play().catch(() => {})
      nodeGains.forEach((g, j) => {
        g.gain.setTargetAtTime(j === idx && loaded[j].clip.keepOriginal ? 1 : 0, audioCtx.currentTime, 0.08)
      })
    }
    const l = loaded[idx]
    const tClip = t - starts[idx]
    drawClipFrame(ctx, l.el, l.clip, l.srcW, l.srcH, canvas, fitScale, needsBg, tClip, clipDurs[idx])
    onProgress?.(Math.min(1, t / total))
    raf = requestAnimationFrame(draw)
  }

  rec.start(500)
  draw()
  const blob = await done
  return blob
}

const previewCache = new Map<string, { el: HTMLVideoElement; srcW: number; srcH: number; dur: number }>()

export async function previewFrameAt(
  clip: VideoClip,
  tInClip: number,
  canvas: HTMLCanvasElement,
  outputAspect: string
): Promise<void> {
  let entry = previewCache.get(clip.url)
  if (!entry) {
    const res = await fetch(clip.url)
    if (!res.ok) throw new Error('视频加载失败')
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const el = document.createElement('video')
    el.muted = true
    el.playsInline = true
    el.src = url
    await new Promise<void>((resolve, reject) => {
      el.onloadedmetadata = () => resolve()
      el.onerror = () => reject(new Error('视频读取失败'))
    })
    entry = { el, srcW: el.videoWidth || 1280, srcH: el.videoHeight || 720, dur: Number(el.duration) || 0 }
    previewCache.set(clip.url, entry)
  }
  const { el, srcW, srcH, dur } = entry
  const srcTime = Math.min(Math.max(0, dur - 0.05), Math.max(0, clip.srcStart + tInClip * (clip.speed || 1)))
  if (Math.abs(el.currentTime - srcTime) > 0.05) {
    el.currentTime = srcTime
    await new Promise<void>(resolve => {
      const onSeeked = () => {
        el.removeEventListener('seeked', onSeeked)
        resolve()
      }
      el.addEventListener('seeked', onSeeked)
    })
  }
  const isSideRotate = clip.rotate === 90 || clip.rotate === 270
  let baseW = isSideRotate ? srcH : srcW
  let baseH = isSideRotate ? srcW : srcH
  const aspect = outputAspect || 'source'
  if (aspect === '16:9' || aspect === '9:16' || aspect === '1:1') {
    const [aw, ah] = aspect === '16:9' ? [16, 9] : aspect === '9:16' ? [9, 16] : [1, 1]
    if (baseW / baseH > aw / ah) baseW = baseH * aw / ah
    else baseH = baseW * ah / aw
  }
  canvas.width = Math.max(2, Math.round(baseW))
  canvas.height = Math.max(2, Math.round(baseH))
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const fitScale = isSideRotate
    ? Math.min(canvas.width / srcH, canvas.height / srcW)
    : Math.min(canvas.width / srcW, canvas.height / srcH)
  const needsBg = Math.abs(canvas.width / canvas.height - (isSideRotate ? srcH / srcW : srcW / srcH)) > 0.01
  drawClipFrame(ctx, el, clip, srcW, srcH, canvas, fitScale, needsBg, tInClip, (clip.srcEnd - clip.srcStart) / (clip.speed || 1))
}

export async function getAudioWaveform(url: string, bars = 48): Promise<number[]> {
  try {
    const res = await fetch(url)
    if (!res.ok) return []
    const buf = await res.arrayBuffer()
    const ctx = new (audioCtxClass())()
    const audio = await ctx.decodeAudioData(buf)
    await ctx.close()
    const ch = audio.getChannelData(0)
    const step = Math.max(1, Math.floor(ch.length / bars))
    const peaks: number[] = []
    for (let i = 0; i < bars; i++) {
      let max = 0
      for (let j = i * step; j < Math.min(ch.length, (i + 1) * step); j++) {
        const v = Math.abs(ch[j])
        if (v > max) max = v
      }
      peaks.push(max)
    }
    return peaks
  } catch {
    return []
  }
}

export async function uploadMedia(blob: Blob, type: 'video' | 'audio', filename: string): Promise<string> {
  const fd = new FormData()
  fd.append('file', new File([blob], filename, { type: blob.type || (type === 'video' ? 'video/webm' : 'audio/wav') }))
  fd.append('type', type)
  const r = await fetch('/api/upload', { method: 'POST', body: fd })
  const d = await r.json().catch(() => ({}))
  if (!r.ok || !d.url) throw new Error(d.error || '上传失败')
  return d.url
}

export function formatDur(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '--'
  const m = Math.floor(sec / 60)
  const s = Math.round(sec % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}
