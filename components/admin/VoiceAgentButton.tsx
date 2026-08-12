'use client'

import { useEffect, useRef, useState } from 'react'
import { Mic, Loader2, X, Send, Sparkles, Check, AlertCircle, Volume2 } from 'lucide-react'

interface ToolStep { label: string; status: 'running' | 'done' | 'confirm' }
interface WorkflowStep { step: string; label: string; status: 'running' | 'done' | 'error'; detail?: string }

export default function VoiceAgentButton() {
  const [open, setOpen] = useState(false)
  const [supported, setSupported] = useState(true)
  const [listening, setListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [status, setStatus] = useState<'idle' | 'processing' | 'done' | 'error'>('idle')
  const [error, setError] = useState('')
  const [reply, setReply] = useState('')
  const [toolSteps, setToolSteps] = useState<ToolStep[]>([])
  const [workflowSteps, setWorkflowSteps] = useState<WorkflowStep[]>([])
  const [workflowResult, setWorkflowResult] = useState<any>(null)
  const recRef = useRef<any>(null)
  const finalTextRef = useRef('')
  const aborterRef = useRef<AbortController | null>(null)

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    setSupported(!!SR)
    return () => {
      try { recRef.current?.stop() } catch {}
      aborterRef.current?.abort()
    }
  }, [])

  const stopListening = () => {
    try { recRef.current?.stop() } catch {}
    setListening(false)
  }

  const startListening = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) {
      setSupported(false)
      setOpen(true)
      setError('当前浏览器不支持语音识别，请使用 Chrome / Edge')
      setStatus('error')
      return
    }
    setOpen(true)
    setStatus('idle')
    setError('')
    setReply('')
    setToolSteps([])
    setWorkflowSteps([])
    setWorkflowResult(null)
    setTranscript('')
    finalTextRef.current = ''

    const rec = new SR()
    rec.lang = 'zh-CN'
    rec.interimResults = true
    rec.continuous = false
    rec.onresult = (e: any) => {
      let interim = ''
      let final = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0]?.transcript || ''
        if (e.results[i].isFinal) final += t
        else interim += t
      }
      if (final) {
        finalTextRef.current = final
        setTranscript(final)
      } else if (interim) {
        setTranscript(interim)
      }
    }
    rec.onerror = (e: any) => {
      if (e?.error === 'not-allowed' || e?.error === 'service-not-allowed') {
        setError('麦克风权限被拒绝，请在浏览器设置中允许麦克风')
        setStatus('error')
      }
    }
    rec.onend = () => {
      setListening(false)
      const text = (finalTextRef.current || transcriptRef.current).trim()
      if (text) sendToAgent(text)
    }
    recRef.current = rec
    try {
      rec.start()
      setListening(true)
    } catch {
      setError('无法启动语音识别，请重试')
      setStatus('error')
    }
  }

  const transcriptRef = useRef('')
  transcriptRef.current = transcript

  const sendToAgent = async (text: string) => {
    if (!text.trim()) return
    setTranscript(text)
    setStatus('processing')
    setError('')
    setReply('')
    setToolSteps([])
    setWorkflowSteps([])
    setWorkflowResult(null)
    try {
      const controller = new AbortController()
      aborterRef.current = controller
      const r = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: text }] }),
        signal: controller.signal,
      })
      if (!r.ok || !r.body) {
        const d = await r.json().catch(() => ({}))
        throw new Error(d.error || `请求失败 (${r.status})`)
      }
      const reader = r.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''
        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed) continue
          try {
            const ev = JSON.parse(trimmed)
            if (ev.type === 'thinking') {
              // 忽略思考提示，保持 processing 状态
            } else if (ev.type === 'tool_start') {
              setToolSteps(prev => [...prev, { label: ev.label, status: 'running' }])
            } else if (ev.type === 'tool_done') {
              setToolSteps(prev => {
                const arr = [...prev]
                const last = arr.length - 1
                if (last >= 0) arr[last] = { ...arr[last], status: 'done' }
                return arr
              })
            } else if (ev.type === 'tool_confirm') {
              setToolSteps(prev => [...prev, { label: ev.label, status: 'confirm' }])
            } else if (ev.type === 'workflow_step') {
              setWorkflowSteps(prev => {
                const arr = [...prev]
                const i = arr.findIndex(s => s.step === ev.step)
                const item = { step: ev.step, label: ev.label, status: ev.status, detail: ev.detail || '' }
                if (i >= 0) arr[i] = item
                else arr.push(item)
                return arr
              })
            } else if (ev.type === 'workflow_result') {
              setWorkflowResult(ev)
              setWorkflowSteps(prev => prev.map(s => ({ ...s, status: 'done' as const })))
            } else if (ev.type === 'final') {
              setReply(prev => prev + ev.content)
            } else if (ev.type === 'error') {
              throw new Error(ev.content)
            }
          } catch (err: any) {
            // 跳过非 JSON 行；真正的错误由外层捕获
            if (err?.message && !String(err.message).startsWith('Unexpected')) {
              throw err
            }
          }
        }
      }
      setStatus('done')
    } catch (err: any) {
      if (err?.name === 'AbortError') return
      setError(err?.message || 'AI 助手请求失败')
      setStatus('error')
    }
  }

  const toggle = () => {
    if (listening) {
      stopListening()
      return
    }
    startListening()
  }

  return (
    <div className="relative">
      <button
        onClick={toggle}
        className={`p-2 rounded-lg transition-all adm-hover-bg ${listening ? 'animate-pulse' : ''}`}
        style={{
          color: listening ? 'var(--adm-accent-text)' : 'var(--adm-text-secondary)',
          backgroundColor: listening ? 'var(--adm-accent)' : 'transparent',
          position: 'relative',
        }}
        title={listening ? '停止说话' : '语音指令（说一句话让 AI 助手执行）'}
      >
        <Mic size={16} />
        {listening && (
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full animate-ping" style={{ backgroundColor: 'var(--adm-accent)' }} />
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-[95]" onClick={() => setOpen(false)} />
          <div
            className="absolute right-0 top-full mt-2 z-[96] w-[400px] max-w-[90vw] rounded-2xl overflow-hidden"
            style={{
              backgroundColor: 'var(--adm-card)',
              border: '1px solid var(--adm-border)',
              boxShadow: '0 24px 60px rgba(0,0,0,0.45)',
              backdropFilter: 'blur(20px)',
            }}
          >
            <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--adm-border)' }}>
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--adm-accent-bg)', color: 'var(--adm-accent)' }}>
                  <Mic size={14} />
                </span>
                <div>
                  <p className="text-xs font-semibold" style={{ color: 'var(--adm-text)' }}>语音指令 · AI Agent</p>
                  <p className="text-[10px]" style={{ color: 'var(--adm-text-secondary)' }}>说话即转文字，自动交给 AI 助手执行</p>
                </div>
              </div>
              <button onClick={() => { stopListening(); setOpen(false) }} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors" style={{ color: 'var(--adm-text-secondary)' }}>
                <X size={15} />
              </button>
            </div>

            <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
              {/* 语音状态 */}
              <div className="flex items-center gap-3 rounded-xl px-3 py-3" style={{ backgroundColor: 'var(--adm-input)', border: '1px solid var(--adm-border)' }}>
                <button
                  onClick={toggle}
                  className="w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-95"
                  style={{
                    backgroundColor: listening ? 'var(--adm-accent)' : 'var(--adm-accent-bg)',
                    color: listening ? 'var(--adm-accent-text)' : 'var(--adm-accent)',
                    boxShadow: listening ? '0 0 20px var(--adm-accent)' : 'none',
                  }}
                >
                  {listening ? <Loader2 size={18} className="animate-spin" /> : <Mic size={18} />}
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium" style={{ color: 'var(--adm-text)' }}>
                    {listening ? '正在聆听…' : status === 'processing' ? 'AI 助手执行中…' : '点击开始说话'}
                  </p>
                  <div className="flex items-center gap-1 mt-1 h-3">
                    {listening && [0, 1, 2, 3, 4].map(i => (
                      <span
                        key={i}
                        className="w-1 rounded-full animate-bounce"
                        style={{ backgroundColor: 'var(--adm-accent)', height: 4 + (i % 3) * 3, animationDelay: `${i * 90}ms` }}
                      />
                    ))}
                  </div>
                </div>
                {status === 'done' && <Check size={16} style={{ color: '#22c55e' }} />}
              </div>

              {/* 识别文字 */}
              <div>
                <label className="text-[10px] font-semibold mb-1 block" style={{ color: 'var(--adm-text-secondary)' }}>识别文字（可修改后重新发送）</label>
                <textarea
                  value={transcript}
                  onChange={e => setTranscript(e.target.value)}
                  rows={3}
                  placeholder="点击麦克风开始说话…"
                  className="w-full px-3 py-2 rounded-xl text-sm resize-none outline-none"
                  style={{ backgroundColor: 'var(--adm-input)', border: '1px solid var(--adm-input-border)', color: 'var(--adm-text)' }}
                />
                {transcript.trim() && status !== 'processing' && (
                  <button
                    onClick={() => sendToAgent(transcript)}
                    className="mt-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5"
                    style={{ backgroundColor: 'var(--adm-accent)', color: 'var(--adm-accent-text)' }}
                  >
                    <Send size={12} /> 发送给 AI 助手执行
                  </button>
                )}
              </div>

              {/* 执行进度 */}
              {(toolSteps.length > 0 || workflowSteps.length > 0) && (
                <div className="rounded-xl px-3 py-2 space-y-1.5" style={{ backgroundColor: 'var(--adm-input)', border: '1px solid var(--adm-border)' }}>
                  <p className="text-[10px] font-semibold" style={{ color: 'var(--adm-text-secondary)' }}>AI Agent 执行进度</p>
                  {toolSteps.map((s, i) => (
                    <div key={`t${i}`} className="flex items-center gap-2 text-xs">
                      <span className="w-4 h-4 rounded-full flex items-center justify-center text-[10px]" style={{ backgroundColor: s.status === 'done' ? '#22c55e' : s.status === 'confirm' ? '#f59e0b' : 'var(--adm-accent)', color: '#fff' }}>
                        {s.status === 'done' ? '✓' : s.status === 'confirm' ? '?' : ''}
                      </span>
                      <span style={{ color: s.status === 'done' ? 'var(--adm-text-secondary)' : 'var(--adm-text)' }}>{s.label}{s.status === 'confirm' ? '（待确认）' : ''}</span>
                    </div>
                  ))}
                  {workflowSteps.map((s, i) => (
                    <div key={`w${i}`} className="flex items-center gap-2 text-xs">
                      <span className="w-4 h-4 rounded-full flex items-center justify-center text-[10px]" style={{ backgroundColor: s.status === 'done' ? '#22c55e' : s.status === 'error' ? '#ef4444' : 'var(--adm-accent)', color: '#fff' }}>
                        {s.status === 'done' ? '✓' : s.status === 'error' ? '!' : ''}
                      </span>
                      <span className="min-w-0" style={{ color: s.status === 'done' ? 'var(--adm-text-secondary)' : 'var(--adm-text)' }}>
                        <span className="block truncate">{s.label}</span>
                        {s.detail && <span className="block text-[10px] truncate" style={{ color: 'var(--adm-text-secondary)' }}>{s.detail}</span>}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* 工作流结果 */}
              {workflowResult && (
                <div className="rounded-xl px-3 py-2 space-y-2" style={{ backgroundColor: 'var(--adm-input)', border: '1px solid var(--adm-border)' }}>
                  {workflowResult.imageUrl && <img src={workflowResult.imageUrl} alt="" className="w-full max-h-40 object-cover rounded-lg" />}
                  {workflowResult.videoUrl && <video src={workflowResult.videoUrl} controls className="w-full max-h-48 rounded-lg" style={{ backgroundColor: '#000' }} />}
                  {workflowResult.published && (
                    <p className="text-[11px] flex items-center gap-1" style={{ color: '#22c55e' }}>
                      <Check size={12} /> 已发布到 Instagram{workflowResult.published.mediaId ? `（Media ${workflowResult.published.mediaId}）` : ''}
                    </p>
                  )}
                  {workflowResult.error && <p className="text-[11px]" style={{ color: '#ef4444' }}>{workflowResult.error}</p>}
                </div>
              )}

              {/* AI 回复 */}
              {reply && (
                <div className="rounded-xl px-3 py-2.5" style={{ backgroundColor: 'var(--adm-input)', border: '1px solid var(--adm-border)' }}>
                  <p className="text-[10px] font-semibold mb-1 flex items-center gap-1" style={{ color: 'var(--adm-text-secondary)' }}>
                    <Sparkles size={11} /> AI 助手回复
                  </p>
                  <p className="text-xs leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--adm-text)' }}>{reply}</p>
                  <button
                    onClick={() => {
                      const u = new SpeechSynthesisUtterance(reply.replace(/[#*`]/g, ''))
                      u.lang = 'zh-CN'
                      window.speechSynthesis.speak(u)
                    }}
                    className="mt-2 flex items-center gap-1 text-[10px]"
                    style={{ color: 'var(--adm-accent)' }}
                  >
                    <Volume2 size={11} /> 朗读回复
                  </button>
                </div>
              )}

              {error && (
                <div className="rounded-xl px-3 py-2 flex items-center gap-2" style={{ backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.35)' }}>
                  <AlertCircle size={13} style={{ color: '#ef4444', flexShrink: 0 }} />
                  <p className="text-xs" style={{ color: '#ef4444' }}>{error}</p>
                </div>
              )}

              {!supported && (
                <p className="text-[11px] text-center" style={{ color: 'var(--adm-text-secondary)' }}>
                  当前浏览器不支持语音识别，请使用 Chrome / Edge
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
