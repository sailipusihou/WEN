"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import {
  Send, X, Sparkles, BarChart3, Package, ShoppingCart,
  Users, MessageSquare, TrendingUp, Bell, CheckCheck,
  Download, FileText, Mic, Volume2, Square,
} from "lucide-react"
import { MessageContent } from "./AIChatCharts"

interface ChatMessage {
  role: "user" | "assistant"
  content: string
  status?: "thinking" | "tool" | "done"
  toolSteps?: { label: string; status: "running" | "done" | "confirm"; tool?: string; result?: any }[]
  reportData?: { title: string; filename: string; rows: any[] }
  workflowSteps?: { step: string; label: string; status: "running" | "done" | "error"; detail?: string }[]
  workflowResult?: any
}

interface AINotification {
  id: string
  type: "new_order" | "low_stock" | "daily_brief" | "shipping_reminder" | "anomaly"
  title: string
  content: string
  data?: any
  read: boolean
  createdAt: string
  aiAnalysis?: string
}

interface AIAssistantWidgetProps {
  isOpen: boolean
  onClose: () => void
  assistantName?: string
  avatar?: string
  theme?: string
}

const QUICK_ACTIONS = [
  { icon: BarChart3, label: "今日数据", query: "今天的销售数据怎么样？", color: "#3b82f6" },
  { icon: TrendingUp, label: "销售诊断", query: "给我做一个最近30天的销售诊断和运营建议", color: "#8b5cf6" },
  { icon: Package, label: "库存预警", query: "库存情况怎么样？哪些商品库存不足？", color: "#f59e0b" },
  { icon: ShoppingCart, label: "最新订单", query: "最近的5个订单是什么？", color: "#10b981" },
  { icon: Sparkles, label: "商品推荐", query: "帮我推荐一些热销商品，分析一下哪些商品值得推广", color: "#ec4899" },
  { icon: MessageSquare, label: "未读消息", query: "有多少未读的客户留言？", color: "#06b6d4" },
]

const NOTIFICATION_ICONS: Record<string, any> = {
  new_order: ShoppingCart,
  low_stock: Package,
  daily_brief: BarChart3,
  weekly_report: TrendingUp,
  shipping_reminder: TrendingUp,
  anomaly: Bell,
}

const AVATAR_EMOJI: Record<string, string> = {
  bot: "🤖",
  woman: "👩‍💼",
  man: "👨‍💼",
  wizard: "🧙",
  cat: "🐱",
  fox: "🦊",
}

function getAvatarEmoji(avatar: string): string {
  return AVATAR_EMOJI[avatar] || "🤖"
}

function downloadCSV(filename: string, rows: Record<string, any>[]) {
  if (!rows || rows.length === 0) return
  const headers = Object.keys(rows[0])
  const csvContent = [
    headers.join(","),
    ...rows.map(row =>
      headers.map(h => {
        const val = row[h] ?? ""
        const str = String(val).replace(/"/g, '""')
        return /[",\n]/.test(str) ? `"${str}"` : str
      }).join(",")
    )
  ].join("\n")

  const BOM = "\uFEFF"
  const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

const NOTIFICATION_COLORS: Record<string, string> = {
  new_order: "#10b981",
  low_stock: "#f59e0b",
  daily_brief: "#3b82f6",
  weekly_report: "#8b5cf6",
  shipping_reminder: "#8b5cf6",
  anomaly: "#ef4444",
}

export function AIAssistantWidget({ isOpen, onClose, assistantName = "Aria", avatar = "bot", theme = "dark" }: AIAssistantWidgetProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("ai_chat_history")
        if (saved) {
          const parsed = JSON.parse(saved)
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed
          }
        }
      } catch {}
    }
    return [
      {
        role: "assistant",
        content: `Hi! I'm ${assistantName}, your AI assistant. I can help you with order analysis, customer insights, and business operations. How can I help you today?`,
        status: "done",
      },
    ]
  })
  const [input, setInput] = useState("")
  const [isListening, setIsListening] = useState(false)
  const recognitionRef = useRef<any>(null)
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState("")
  const [activeTab, setActiveTab] = useState<"chat" | "notifications">("chat")
  const [notifications, setNotifications] = useState<AINotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [speakingIndex, setSpeakingIndex] = useState<number | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null)

  const fetchNotifications = useCallback(async (check = false) => {
    try {
      const res = await fetch(`/api/ai/notifications?limit=50${check ? "&check=true" : ""}`)
      if (res.ok) {
        const data = await res.json()
        setNotifications(data.notifications || [])
        setUnreadCount(data.unreadCount || 0)

        const prevUnread = unreadCount
        if (data.unreadCount > prevUnread && check && typeof Notification !== "undefined" && Notification.permission === "granted") {
          const newNotifs = (data.notifications || []).filter((n: AINotification) => !n.read)
          if (newNotifs.length > 0) {
            const latest = newNotifs[0]
            new Notification(latest.title, {
              body: latest.content,
              icon: "/images/low-flame-logo.png",
            })
          }
        }
      }
    } catch (e) {
      // Silent fail
    }
  }, [unreadCount])

  useEffect(() => {
    if (!isOpen) return
    fetchNotifications(true)

    pollTimerRef.current = setInterval(() => {
      fetchNotifications(true)
    }, 30000)

    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current)
      }
    }
  }, [isOpen, fetchNotifications])

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("ai_chat_history", JSON.stringify(messages.filter(m => m.status === "done")))
      } catch {}
    }
  }, [messages])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  useEffect(() => {
    if (isOpen && activeTab === "chat" && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen, activeTab])

  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [isOpen, onClose])

  const typeText = useCallback(async (text: string, messageIndex: number) => {
    for (let i = 0; i <= text.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 6))
      setMessages(prev => {
        const updated = [...prev]
        if (updated[messageIndex]) {
          updated[messageIndex] = { ...updated[messageIndex], content: text.slice(0, i) }
        }
        return updated
      })
    }
  }, [])

  const onActionExecuted = useCallback(() => {
    setMessages(prev => prev.map(m => ({ ...m })))
  }, [])

  const sendMessage = useCallback(async (customQuery?: string) => {
    const trimmed = (customQuery ?? input).trim()
    if (!trimmed || isStreaming) return

    setError("")
    const userMessage: ChatMessage = { role: "user", content: trimmed, status: "done" }
    const assistantMessage: ChatMessage = { role: "assistant", content: "", status: "thinking", toolSteps: [] }
    const newMessages = [...messages, userMessage, assistantMessage]
    setMessages(newMessages)
    setInput("")
    setIsStreaming(true)

    const assistantMsgIndex = newMessages.length - 1

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({ role: m.role, content: m.content })),
        }),
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.error || `Request failed (${response.status})`)
      }

      if (!response.body) throw new Error("No response body")

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() || ""

        for (const line of lines) {
          const trimmedLine = line.trim()
          if (!trimmedLine) continue

          try {
            const event = JSON.parse(trimmedLine)

            if (event.type === "thinking") {
              setMessages(prev => {
                const updated = [...prev]
                if (updated[assistantMsgIndex]) {
                  updated[assistantMsgIndex] = { ...updated[assistantMsgIndex], status: "thinking" }
                }
                return updated
              })
            } else if (event.type === "tool_start") {
              setMessages(prev => {
                const updated = [...prev]
                if (updated[assistantMsgIndex]) {
                  const steps = [...(updated[assistantMsgIndex].toolSteps || [])]
                  steps.push({ label: event.label, status: "running" })
                  updated[assistantMsgIndex] = { ...updated[assistantMsgIndex], status: "tool", toolSteps: steps }
                }
                return updated
              })
            } else if (event.type === "tool_done") {
              setMessages(prev => {
                const updated = [...prev]
                if (updated[assistantMsgIndex]) {
                  const steps = updated[assistantMsgIndex].toolSteps || []
                  const lastIdx = steps.length - 1
                  if (lastIdx >= 0) {
                    steps[lastIdx] = { ...steps[lastIdx], status: "done", result: event.result }
                  }
                  if (event.tool && event.tool.startsWith('export_') && event.result && event.result.rows) {
                    updated[assistantMsgIndex].reportData = {
                      title: event.result.title || '报表',
                      filename: event.result.filename || 'report.csv',
                      rows: event.result.rows,
                    }
                  }
                  updated[assistantMsgIndex] = { ...updated[assistantMsgIndex], toolSteps: [...steps] }
                }
                return updated
              })
            } else if (event.type === "tool_confirm") {
              setMessages(prev => {
                const updated = [...prev]
                if (updated[assistantMsgIndex]) {
                  const steps = [...(updated[assistantMsgIndex].toolSteps || [])]
                  steps.push({ label: event.label, status: "confirm" })
                  updated[assistantMsgIndex] = { ...updated[assistantMsgIndex], status: "tool", toolSteps: steps }
                }
                return updated
              })
            } else if (event.type === "workflow_step") {
              setMessages(prev => {
                const updated = [...prev]
                if (updated[assistantMsgIndex]) {
                  const steps = [...(updated[assistantMsgIndex].workflowSteps || [])]
                  const existing = steps.findIndex(s => s.step === event.step)
                  const item = { step: event.step, label: event.label, status: event.status, detail: event.detail || "" }
                  if (existing >= 0) steps[existing] = item
                  else steps.push(item)
                  updated[assistantMsgIndex] = { ...updated[assistantMsgIndex], status: "tool", workflowSteps: steps }
                }
                return updated
              })
            } else if (event.type === "workflow_result") {
              setMessages(prev => {
                const updated = [...prev]
                if (updated[assistantMsgIndex]) {
                  updated[assistantMsgIndex] = {
                    ...updated[assistantMsgIndex],
                    workflowResult: event,
                    workflowSteps: (updated[assistantMsgIndex].workflowSteps || []).map(s => ({ ...s, status: "done" as const })),
                  }
                }
                return updated
              })
            } else if (event.type === "final") {
              setMessages(prev => {
                const updated = [...prev]
                if (updated[assistantMsgIndex]) {
                  updated[assistantMsgIndex] = { ...updated[assistantMsgIndex], status: "done", toolSteps: [] }
                }
                return updated
              })
              await typeText(event.content, assistantMsgIndex)
            } else if (event.type === "error") {
              throw new Error(event.content)
            }
          } catch (e) {
            // Skip malformed lines
          }
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to get AI response")
      setMessages(prev => {
        const updated = [...prev]
        if (updated[assistantMsgIndex]?.content === "") {
          updated.pop()
        }
        return updated
      })
    } finally {
      setIsStreaming(false)
    }
  }, [input, isStreaming, messages, typeText])

  const toggleVoiceInput = () => {
    if (isListening) {
      recognitionRef.current?.stop()
      setIsListening(false)
      return
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      setError("当前浏览器不支持语音输入，请使用 Chrome 或 Edge")
      setTimeout(() => setError(""), 3000)
      return
    }

    const recognition = new SpeechRecognition()
    recognition.lang = "zh-CN"
    recognition.continuous = false
    recognition.interimResults = true

    let finalText = ""

    recognition.onresult = (event: any) => {
      let interimText = ""
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          finalText += transcript
        } else {
          interimText += transcript
        }
      }
      setInput(finalText + interimText)
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognition.onerror = (event: any) => {
      setIsListening(false)
      if (event.error === "not-allowed") {
        setError("请允许麦克风权限以使用语音输入")
        setTimeout(() => setError(""), 3000)
      }
    }

    recognitionRef.current = recognition
    recognition.start()
    setIsListening(true)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const clearHistory = () => {
    setMessages([
      {
        role: "assistant",
        content: `Hi! I'm ${assistantName}, your AI assistant. I can help you with order analysis, customer insights, and business operations. How can I help you today?`,
        status: "done",
      },
    ])
    if (typeof window !== "undefined") {
      localStorage.removeItem("ai_chat_history")
    }
  }

  // 导出对话为 Markdown
  const exportChat = () => {
    const done = messages.filter(m => m.status === "done")
    if (done.length === 0) return
    const md = [
      `# ${assistantName} 对话记录`,
      ``,
      `> 导出时间：${new Date().toLocaleString()}`,
      `> 共 ${done.length} 条消息`,
      ``,
      `---`,
      ``,
      ...done.map(m => {
        const role = m.role === "user" ? "🧑 User" : `🤖 ${assistantName}`
        return [`### ${role}`, ``, m.content || "_(empty)_", ``, `---`, ``].join("\n")
      }),
    ].join("\n")
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    const ts = new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-")
    a.href = url
    a.download = `chat-${ts}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // 语音播报（TTS）
  const toggleSpeak = (index: number, text: string) => {
    if (typeof window === "undefined") return
    const synth = window.speechSynthesis
    if (!synth) {
      setError("当前浏览器不支持语音播报")
      setTimeout(() => setError(""), 3000)
      return
    }

    // 正在朗读这条 → 停止
    if (speakingIndex === index) {
      synth.cancel()
      setSpeakingIndex(null)
      return
    }

    // 朗读其他条 → 先取消当前的
    synth.cancel()

    // 清洗 markdown，提取纯文本（去掉代码块、表格、链接等）
    const cleanText = text
      .replace(/```[\s\S]*?```/g, "（代码块）")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
      .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
      .replace(/#{1,6}\s*/g, "")
      .replace(/^\s*\|.*\|\s*$/gm, "")
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/\*([^*]+)\*/g, "$1")
      .trim()

    if (!cleanText) return

    const utter = new SpeechSynthesisUtterance(cleanText)
    // 检测语言：含中文用 zh-CN，否则 en-US
    utter.lang = /[\u4e00-\u9fa5]/.test(cleanText) ? "zh-CN" : "en-US"
    utter.rate = 1
    utter.pitch = 1

    utter.onend = () => setSpeakingIndex(null)
    utter.onerror = () => setSpeakingIndex(null)

    setSpeakingIndex(index)
    synth.speak(utter)
  }

  // 关闭面板时停止语音
  useEffect(() => {
    if (!isOpen && speakingIndex !== null) {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel()
      }
      setSpeakingIndex(null)
    }
  }, [isOpen, speakingIndex])

  const handleNotificationClick = (notif: AINotification) => {
    if (!notif.read) {
      fetch(`/api/ai/notifications`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: notif.id }),
      }).then(() => fetchNotifications())
    }

    let query = ""
    if (notif.type === "new_order") {
      query = "最近的新订单有哪些？帮我分析一下"
    } else if (notif.type === "low_stock") {
      query = "库存情况怎么样？哪些商品库存不足？"
    } else if (notif.type === "daily_brief") {
      query = "给我看看昨天的运营数据总结"
    } else {
      query = notif.title
    }

    setActiveTab("chat")
    setTimeout(() => sendMessage(query), 100)
  }

  const markAllRead = () => {
    fetch(`/api/ai/notifications`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    }).then(() => fetchNotifications())
  }

  const formatTime = (iso: string) => {
    const date = new Date(iso)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return "刚刚"
    if (minutes < 60) return `${minutes}分钟前`
    if (hours < 24) return `${hours}小时前`
    if (days < 7) return `${days}天前`
    return date.toLocaleDateString()
  }

  if (!isOpen) return null

  return (
    <>
      <div
        className="fixed inset-0 z-[200]"
        style={{ backgroundColor: "rgba(0,0,0,0.3)" }}
        onClick={onClose}
      />

      <div
        className="adm-ai-panel fixed right-0 top-0 bottom-0 z-[201] flex flex-col"
        style={{
          width: "420px",
          maxWidth: "100vw",
          backgroundColor: "var(--adm-card)",
          borderLeft: "1px solid var(--adm-border)",
          boxShadow: "-8px 0 24px rgba(0,0,0,0.2)",
        }}
      >
        <div
          className="flex items-center gap-3 px-4 py-3 shrink-0"
          style={{ borderBottom: "1px solid var(--adm-border)" }}
        >
          <div
            className="relative w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-lg"
            style={{
              background: "linear-gradient(135deg, var(--adm-accent), var(--adm-accent-text))",
            }}
          >
            {getAvatarEmoji(avatar)}
            <div
              className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full"
              style={{
                backgroundColor: isStreaming ? "#fbbf24" : "#22c55e",
                border: "2px solid var(--adm-card)",
              }}
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm" style={{ color: "var(--adm-text)" }}>
              {assistantName}
            </div>
            <div className="text-xs flex items-center gap-1" style={{ color: "var(--adm-text-secondary)" }}>
              <Sparkles size={10} />
              {isStreaming ? "Working..." : "AI Assistant"}
            </div>
          </div>
          <button
            onClick={exportChat}
            disabled={messages.filter(m => m.status === "done").length === 0}
            className="p-1.5 rounded-lg transition-colors disabled:opacity-40"
            style={{ color: "var(--adm-text-secondary)" }}
            onMouseEnter={(e) => { if (!e.currentTarget.disabled) e.currentTarget.style.backgroundColor = "var(--adm-input)" }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent" }}
            title="Export conversation as Markdown"
          >
            <Download size={16} />
          </button>
          <button
            onClick={clearHistory}
            className="px-2 py-1 rounded text-xs transition-colors"
            style={{ color: "var(--adm-text-secondary)" }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--adm-input)" }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent" }}
            title="Clear chat history"
          >
            Clear
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: "var(--adm-text-secondary)" }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--adm-input)" }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent" }}
          >
            <X size={18} />
          </button>
        </div>

        <div
          className="flex shrink-0"
          style={{ borderBottom: "1px solid var(--adm-border)" }}
        >
          <button
            onClick={() => setActiveTab("chat")}
            className="flex-1 px-4 py-2.5 text-sm font-medium transition-colors relative"
            style={{
              color: activeTab === "chat" ? "var(--adm-accent)" : "var(--adm-text-secondary)",
            }}
          >
            对话
            {activeTab === "chat" && (
              <div
                className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-t-full"
                style={{ backgroundColor: "var(--adm-accent)" }}
              />
            )}
          </button>
          <button
            onClick={() => { setActiveTab("notifications"); fetchNotifications() }}
            className="flex-1 px-4 py-2.5 text-sm font-medium transition-colors relative flex items-center justify-center gap-1.5"
            style={{
              color: activeTab === "notifications" ? "var(--adm-accent)" : "var(--adm-text-secondary)",
            }}
          >
            <Bell size={14} />
            通知
            {unreadCount > 0 && (
              <span
                className="px-1.5 py-0.5 rounded-full text-[10px] font-bold min-w-[18px] text-center"
                style={{ backgroundColor: "#ef4444", color: "white" }}
              >
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
            {activeTab === "notifications" && (
              <div
                className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-t-full"
                style={{ backgroundColor: "var(--adm-accent)" }}
              />
            )}
          </button>
        </div>

        {activeTab === "chat" && (
          <>
            <div
              ref={scrollRef}
              className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-4"
            >
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
                >
                  {msg.role === "assistant" && (
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-sm"
                      style={{ backgroundColor: "var(--adm-accent-bg)" }}
                    >
                      {getAvatarEmoji(avatar)}
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] ${msg.role === "user" ? "items-end" : "items-start"} flex flex-col gap-1.5`}
                  >
                    {msg.status !== "done" && msg.toolSteps && msg.toolSteps.length > 0 && (
                      <div
                        className="px-2.5 py-2 rounded-lg space-y-1.5 w-full"
                        style={{
                          backgroundColor: "var(--adm-input)",
                          border: "1px solid var(--adm-border)",
                        }}
                      >
                        {msg.toolSteps.map((step, si) => (
                          <div key={si} className="flex items-center gap-2 text-xs">
                            <div
                              className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
                              style={{
                                backgroundColor: step.status === "done" ? "#22c55e" : step.status === "confirm" ? "#f59e0b" : "var(--adm-accent)",
                              }}
                            >
                              {step.status === "done" ? (
                                <span style={{ color: "white", fontSize: "10px" }}>✓</span>
                              ) : step.status === "confirm" ? (
                                <span style={{ color: "white", fontSize: "10px" }}>?</span>
                              ) : (
                                <div
                                  className="w-2 h-2 rounded-full animate-pulse"
                                  style={{ backgroundColor: "white" }}
                                />
                              )}
                            </div>
                            <span style={{ color: step.status === "done" ? "var(--adm-text-secondary)" : "var(--adm-text)" }}>
                              {step.label}
                              {step.status === "confirm" && " (待确认)"}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {msg.workflowSteps && msg.workflowSteps.length > 0 && (
                      <div
                        className="px-2.5 py-2 rounded-lg space-y-1.5 w-full"
                        style={{
                          backgroundColor: "var(--adm-input)",
                          border: "1px solid var(--adm-border)",
                        }}
                      >
                        <p className="text-[10px] font-semibold" style={{ color: "var(--adm-text-secondary)" }}>
                          AI Agent 自动执行中
                        </p>
                        {msg.workflowSteps.map((step, si) => (
                          <div key={si} className="flex items-center gap-2 text-xs">
                            <div
                              className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
                              style={{
                                backgroundColor: step.status === "done" ? "#22c55e" : step.status === "error" ? "#ef4444" : "var(--adm-accent)",
                              }}
                            >
                              {step.status === "done" ? (
                                <span style={{ color: "white", fontSize: "10px" }}>✓</span>
                              ) : step.status === "error" ? (
                                <span style={{ color: "white", fontSize: "10px" }}>!</span>
                              ) : (
                                <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: "white" }} />
                              )}
                            </div>
                            <span className="min-w-0" style={{ color: step.status === "done" ? "var(--adm-text-secondary)" : "var(--adm-text)" }}>
                              <span className="block">{step.label}</span>
                              {step.detail && (
                                <span className="block text-[10px] truncate" style={{ color: "var(--adm-text-secondary)" }}>
                                  {step.detail}
                                </span>
                              )}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {msg.workflowResult && (
                      <div
                        className="px-2.5 py-2 rounded-lg space-y-2 w-full"
                        style={{
                          backgroundColor: "var(--adm-input)",
                          border: "1px solid var(--adm-border)",
                        }}
                      >
                        {msg.workflowResult.imageUrl && (
                          <img src={msg.workflowResult.imageUrl} alt="" className="w-full max-h-48 object-cover rounded-lg" />
                        )}
                        {msg.workflowResult.videoUrl && (
                          <video src={msg.workflowResult.videoUrl} controls className="w-full max-h-56 rounded-lg" style={{ backgroundColor: "#000" }} />
                        )}
                        {msg.workflowResult.published && (
                          <p className="text-[11px] flex items-center gap-1" style={{ color: "#22c55e" }}>
                            <span>✓</span> 已发布到 Instagram
                            {msg.workflowResult.published.mediaId ? `（Media ${msg.workflowResult.published.mediaId}）` : ""}
                          </p>
                        )}
                        {msg.workflowResult.error && (
                          <p className="text-[11px]" style={{ color: "#ef4444" }}>{msg.workflowResult.error}</p>
                        )}
                      </div>
                    )}

                    {msg.status === "thinking" && (!msg.toolSteps || msg.toolSteps.length === 0) && (
                      <div
                        className="px-3 py-2 rounded-xl text-sm flex items-center gap-2"
                        style={{
                          backgroundColor: "var(--adm-input)",
                          color: "var(--adm-text-secondary)",
                        }}
                      >
                        <div className="flex gap-1">
                          <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: "var(--adm-text-secondary)", animationDelay: "0ms" }} />
                          <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: "var(--adm-text-secondary)", animationDelay: "150ms" }} />
                          <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: "var(--adm-text-secondary)", animationDelay: "300ms" }} />
                        </div>
                        <span>思考中...</span>
                      </div>
                    )}

                    {(msg.status === "done" || msg.content) && msg.role === "assistant" && (
                      <div
                        className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed break-words rounded-tl-sm`}
                        style={{
                          backgroundColor: "var(--adm-input)",
                          color: "var(--adm-text)",
                        }}
                      >
                        <MessageContent content={msg.content} onActionExecuted={onActionExecuted} />
                        {msg.status === "done" && !msg.content && isStreaming && "..."}
                      </div>
                    )}

                    {msg.status === "done" && msg.content && msg.role === "assistant" && (
                      <button
                        onClick={() => toggleSpeak(i, msg.content)}
                        className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] transition-colors self-start"
                        style={{
                          color: speakingIndex === i ? "var(--adm-accent)" : "var(--adm-text-secondary)",
                          backgroundColor: speakingIndex === i ? "var(--adm-accent-bg)" : "transparent",
                        }}
                        onMouseEnter={(e) => { if (speakingIndex !== i) e.currentTarget.style.backgroundColor = "var(--adm-input)" }}
                        onMouseLeave={(e) => { if (speakingIndex !== i) e.currentTarget.style.backgroundColor = "transparent" }}
                        title={speakingIndex === i ? "停止朗读" : "朗读此回复"}
                      >
                        {speakingIndex === i ? (
                          <><Square size={10} className="animate-pulse" /> 停止朗读</>
                        ) : (
                          <><Volume2 size={10} /> 朗读</>
                        )}
                      </button>
                    )}

                    {msg.reportData && msg.reportData.rows && msg.reportData.rows.length > 0 && (
                      <div
                        className="rounded-lg overflow-hidden mt-1.5"
                        style={{
                          border: "1px solid var(--adm-border)",
                          backgroundColor: "var(--adm-card)",
                          maxWidth: "80%",
                        }}
                      >
                        <div
                          className="px-3 py-2 flex items-center gap-2"
                          style={{ borderBottom: "1px solid var(--adm-border)" }}
                        >
                          <FileText size={14} style={{ color: "var(--adm-accent)" }} />
                          <span className="text-xs font-medium flex-1" style={{ color: "var(--adm-text)" }}>
                            {msg.reportData.title}
                          </span>
                          <span className="text-xs" style={{ color: "var(--adm-text-secondary)" }}>
                            {msg.reportData.rows.length} 行
                          </span>
                          <button
                            onClick={() => downloadCSV(msg.reportData!.filename, msg.reportData!.rows)}
                            className="px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1"
                            style={{
                              backgroundColor: "var(--adm-accent)",
                              color: "var(--adm-accent-text)",
                            }}
                          >
                            <Download size={12} />
                            下载
                          </button>
                        </div>
                        <div className="px-3 py-2 overflow-x-auto">
                          <table className="w-full text-xs" style={{ color: "var(--adm-text)" }}>
                            <thead>
                              <tr style={{ color: "var(--adm-text-secondary)" }}>
                                {Object.keys(msg.reportData.rows[0]).slice(0, 4).map(h => (
                                  <th key={h} className="text-left py-1 pr-3 font-normal">
                                    {h}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {msg.reportData.rows.slice(0, 3).map((row, i) => (
                                <tr key={i} className="border-t" style={{ borderColor: "var(--adm-border)" }}>
                                  {Object.keys(msg.reportData!.rows[0]).slice(0, 4).map(h => (
                                    <td key={h} className="py-1 pr-3 truncate max-w-[100px]">
                                      {String(row[h] ?? "")}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {msg.reportData.rows.length > 3 && (
                            <div
                              className="text-xs mt-2 text-center"
                              style={{ color: "var(--adm-text-secondary)" }}
                            >
                              ... 还有 {msg.reportData.rows.length - 3} 行
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {msg.role === "user" && (
                      <div
                        className="px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words rounded-tr-sm"
                        style={{
                          backgroundColor: "var(--adm-accent)",
                          color: "var(--adm-accent-text)",
                        }}
                      >
                        {msg.content}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {error && (
                <div
                  className="px-3 py-2 rounded-lg text-xs"
                  style={{
                    backgroundColor: "rgba(239,68,68,0.1)",
                    color: "#ef4444",
                    border: "1px solid rgba(239,68,68,0.3)",
                  }}
                >
                  {error}
                </div>
              )}
            </div>

            <div
              className="shrink-0 px-4 py-3 space-y-3"
              style={{ borderTop: "1px solid var(--adm-border)" }}
            >
              <div className="flex flex-wrap gap-2">
                {QUICK_ACTIONS.map((action, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(action.query)}
                    disabled={isStreaming}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-all hover:scale-105"
                    style={{
                      backgroundColor: "var(--adm-input)",
                      color: "var(--adm-text)",
                      border: "1px solid var(--adm-border)",
                      cursor: isStreaming ? "not-allowed" : "pointer",
                      opacity: isStreaming ? 0.5 : 1,
                    }}
                  >
                    <action.icon size={12} style={{ color: action.color }} />
                    <span>{action.label}</span>
                  </button>
                ))}
              </div>

              <div
                className="flex items-end gap-2 rounded-2xl px-3 py-2"
                style={{
                  backgroundColor: "var(--adm-input)",
                  border: "1px solid var(--adm-border)",
                }}
              >
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask anything..."
                  rows={1}
                  disabled={isStreaming}
                  className="flex-1 bg-transparent resize-none outline-none text-sm py-1"
                  style={{
                    color: "var(--adm-text)",
                    maxHeight: "120px",
                    cursor: isStreaming ? "not-allowed" : "text",
                  }}
                  onInput={(e) => {
                    const el = e.currentTarget
                    el.style.height = "auto"
                    el.style.height = Math.min(el.scrollHeight, 120) + "px"
                  }}
                />
                <button
                  onClick={toggleVoiceInput}
                  disabled={isStreaming}
                  className="p-2 rounded-xl transition-all shrink-0"
                  style={{
                    backgroundColor: isListening ? "#ef4444" : "transparent",
                    color: isListening ? "white" : "var(--adm-text-secondary)",
                    cursor: isStreaming ? "not-allowed" : "pointer",
                  }}
                  title={isListening ? "停止录音" : "语音输入"}
                >
                  <Mic size={16} className={isListening ? "animate-pulse" : ""} />
                </button>
                <button
                  onClick={() => sendMessage()}
                  disabled={!input.trim() || isStreaming}
                  className="p-2 rounded-xl transition-all shrink-0"
                  style={{
                    backgroundColor: (!input.trim() || isStreaming) ? "var(--adm-input)" : "var(--adm-accent)",
                    color: (!input.trim() || isStreaming) ? "var(--adm-text-secondary)" : "var(--adm-accent-text)",
                    cursor: (!input.trim() || isStreaming) ? "not-allowed" : "pointer",
                  }}
                >
                  <Send size={16} />
                </button>
              </div>
              <div className="text-[10px] text-center" style={{ color: "var(--adm-text-secondary)" }}>
                {isListening ? "正在录音... 点击麦克风停止" : "Enter 发送 · Shift+Enter 换行 · 点击麦克风语音输入"}
              </div>
            </div>
          </>
        )}

        {activeTab === "notifications" && (
          <>
            <div
              className="flex items-center justify-between px-4 py-2 shrink-0"
              style={{ borderBottom: "1px solid var(--adm-border)" }}
            >
              <span className="text-xs" style={{ color: "var(--adm-text-secondary)" }}>
                共 {notifications.length} 条通知
              </span>
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="flex items-center gap-1 text-xs transition-colors"
                  style={{ color: "var(--adm-accent)" }}
                >
                  <CheckCheck size={12} />
                  全部已读
                </button>
              )}
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full px-8 text-center">
                  <Bell size={40} style={{ color: "var(--adm-text-secondary)", opacity: 0.3 }} />
                  <div className="mt-3 text-sm" style={{ color: "var(--adm-text-secondary)" }}>
                    暂无通知
                  </div>
                  <div className="mt-1 text-xs" style={{ color: "var(--adm-text-secondary)", opacity: 0.7 }}>
                    有新订单、库存预警等重要信息会在这里显示
                  </div>
                </div>
              ) : (
                <div className="divide-y" style={{ borderColor: "var(--adm-border)" }}>
                  {notifications.map((notif) => {
                    const Icon = NOTIFICATION_ICONS[notif.type] || Bell
                    const color = NOTIFICATION_COLORS[notif.type] || "#3b82f6"
                    return (
                      <div
                        key={notif.id}
                        onClick={() => handleNotificationClick(notif)}
                        className="px-4 py-3 cursor-pointer transition-colors hover:bg-opacity-50"
                        style={{
                          backgroundColor: notif.read ? "transparent" : "var(--adm-accent-bg)",
                          opacity: notif.read ? 0.7 : 1,
                        }}
                      >
                        <div className="flex gap-3">
                          <div
                            className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                            style={{ backgroundColor: `${color}15` }}
                          >
                            <Icon size={18} style={{ color }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <span
                                className="text-sm font-medium truncate"
                                style={{ color: "var(--adm-text)" }}
                              >
                                {notif.title}
                              </span>
                              <span
                                className="text-[10px] shrink-0 mt-0.5"
                                style={{ color: "var(--adm-text-secondary)" }}
                              >
                                {formatTime(notif.createdAt)}
                              </span>
                            </div>
                            <div
                              className="text-xs mt-1 line-clamp-2"
                              style={{ color: "var(--adm-text-secondary)" }}
                            >
                              {notif.content}
                            </div>
                            {notif.aiAnalysis && (
                              <div
                                className="text-xs mt-2 px-2 py-1.5 rounded line-clamp-2"
                                style={{
                                  backgroundColor: "var(--adm-input)",
                                  color: "var(--adm-text-secondary)",
                                  borderLeft: `2px solid ${color}`,
                                }}
                              >
                                <span style={{ color }}>AI 分析：</span>
                                {notif.aiAnalysis}
                              </div>
                            )}
                          </div>
                          {!notif.read && (
                            <div
                              className="w-2 h-2 rounded-full shrink-0 mt-2"
                              style={{ backgroundColor: "#ef4444" }}
                            />
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  )
}
