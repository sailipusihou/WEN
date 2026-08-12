"use client"

import { useState } from "react"
import { Download, AlertTriangle, Check, X, FileText } from "lucide-react"

interface ChartBlockProps {
  type: "pie" | "bar" | "line"
  data: { label: string; value: number; color?: string }[]
  title?: string
}

const DEFAULT_COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
  "#ec4899", "#06b6d4", "#84cc16", "#f97316", "#6366f1",
]

export function ChartBlock({ type, data, title }: ChartBlockProps) {
  const total = data.reduce((sum, d) => sum + d.value, 0)
  const maxValue = Math.max(...data.map(d => d.value), 1)

  if (type === "pie") {
    const size = 180
    const radius = 70
    const center = size / 2
    let currentAngle = -90

    const slices = data.map((d, i) => {
      const percentage = total > 0 ? d.value / total : 0
      const angle = percentage * 360
      const startAngle = currentAngle
      const endAngle = currentAngle + angle
      currentAngle = endAngle

      const startRad = (startAngle * Math.PI) / 180
      const endRad = (endAngle * Math.PI) / 180

      const x1 = center + radius * Math.cos(startRad)
      const y1 = center + radius * Math.sin(startRad)
      const x2 = center + radius * Math.cos(endRad)
      const y2 = center + radius * Math.sin(endRad)

      const largeArc = angle > 180 ? 1 : 0
      const color = d.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length]

      const pathData = [
        `M ${center} ${center}`,
        `L ${x1} ${y1}`,
        `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
        "Z",
      ].join(" ")

      return { pathData, color, label: d.label, value: d.value, percentage: (percentage * 100).toFixed(1) }
    })

    return (
      <div
        className="rounded-lg p-4 my-2"
        style={{
          backgroundColor: "var(--adm-input)",
          border: "1px solid var(--adm-border)",
        }}
      >
        {title && (
          <div className="text-sm font-medium mb-3" style={{ color: "var(--adm-text)" }}>
            {title}
          </div>
        )}
        <div className="flex items-center gap-4">
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            {data.length === 1 ? (
              <circle cx={center} cy={center} r={radius} fill={slices[0]?.color || "#3b82f6"} />
            ) : (
              slices.map((s, i) => (
                <path key={i} d={s.pathData} fill={s.color} />
              ))
            )}
            <circle cx={center} cy={center} r={40} fill="var(--adm-input)" />
            <text
              x={center}
              y={center - 4}
              textAnchor="middle"
              fontSize="14"
              fontWeight="bold"
              fill="var(--adm-text)"
            >
              {total}
            </text>
            <text
              x={center}
              y={center + 12}
              textAnchor="middle"
              fontSize="10"
              fill="var(--adm-text-secondary)"
            >
              总计
            </text>
          </svg>
          <div className="flex-1 space-y-1.5">
            {slices.map((s, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <div
                  className="w-3 h-3 rounded-sm shrink-0"
                  style={{ backgroundColor: s.color }}
                />
                <span className="flex-1 truncate" style={{ color: "var(--adm-text-secondary)" }}>
                  {s.label}
                </span>
                <span className="font-medium" style={{ color: "var(--adm-text)" }}>
                  {s.value}
                </span>
                <span style={{ color: "var(--adm-text-secondary)" }}>
                  {s.percentage}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (type === "bar") {
    const barHeight = 24
    const barGap = 8
    const chartHeight = data.length * (barHeight + barGap)
    const maxBarWidth = 200

    return (
      <div
        className="rounded-lg p-4 my-2"
        style={{
          backgroundColor: "var(--adm-input)",
          border: "1px solid var(--adm-border)",
        }}
      >
        {title && (
          <div className="text-sm font-medium mb-3" style={{ color: "var(--adm-text)" }}>
            {title}
          </div>
        )}
        <div className="space-y-2" style={{ minHeight: chartHeight }}>
          {data.map((d, i) => {
            const width = maxValue > 0 ? (d.value / maxValue) * maxBarWidth : 0
            const color = d.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length]
            return (
              <div key={i} className="flex items-center gap-3">
                <div
                  className="text-xs w-24 truncate text-right shrink-0"
                  style={{ color: "var(--adm-text-secondary)" }}
                >
                  {d.label}
                </div>
                <div className="flex-1 h-6 rounded overflow-hidden" style={{ backgroundColor: "var(--adm-card)" }}>
                  <div
                    className="h-full rounded transition-all duration-500"
                    style={{
                      width: `${width}px`,
                      backgroundColor: color,
                      minWidth: d.value > 0 ? "20px" : "0",
                    }}
                  />
                </div>
                <div className="text-xs font-medium w-12 shrink-0" style={{ color: "var(--adm-text)" }}>
                  {d.value}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  if (type === "line") {
    const width = 300
    const height = 150
    const padding = { top: 20, right: 20, bottom: 30, left: 40 }
    const chartW = width - padding.left - padding.right
    const chartH = height - padding.top - padding.bottom

    const points = data.map((d, i) => {
      const x = padding.left + (data.length > 1 ? (i / (data.length - 1)) * chartW : chartW / 2)
      const y = padding.top + chartH - (maxValue > 0 ? (d.value / maxValue) * chartH : 0)
      return { x, y, label: d.label, value: d.value, color: d.color || DEFAULT_COLORS[0] }
    })

    const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ")
    const areaD = `${pathD} L ${points[points.length - 1]?.x || 0} ${padding.top + chartH} L ${points[0]?.x || 0} ${padding.top + chartH} Z`

    const yTicks = 4
    const yTickValues = Array.from({ length: yTicks + 1 }, (_, i) => (maxValue * i) / yTicks)

    return (
      <div
        className="rounded-lg p-4 my-2"
        style={{
          backgroundColor: "var(--adm-input)",
          border: "1px solid var(--adm-border)",
        }}
      >
        {title && (
          <div className="text-sm font-medium mb-3" style={{ color: "var(--adm-text)" }}>
            {title}
          </div>
        )}
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
          {yTickValues.map((v, i) => {
            const y = padding.top + chartH - (chartH * i) / yTicks
            return (
              <g key={i}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="var(--adm-border)"
                  strokeWidth="1"
                  strokeDasharray="3,3"
                />
                <text
                  x={padding.left - 8}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="9"
                  fill="var(--adm-text-secondary)"
                >
                  {Math.round(v)}
                </text>
              </g>
            )
          })}

          <path
            d={areaD}
            fill={DEFAULT_COLORS[0]}
            fillOpacity="0.15"
          />
          <path
            d={pathD}
            fill="none"
            stroke={DEFAULT_COLORS[0]}
            strokeWidth="2"
          />

          {points.map((p, i) => (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r="4" fill={DEFAULT_COLORS[0]} />
              <text
                x={p.x}
                y={height - padding.bottom + 16}
                textAnchor="middle"
                fontSize="9"
                fill="var(--adm-text-secondary)"
              >
                {p.label}
              </text>
            </g>
          ))}
        </svg>
      </div>
    )
  }

  return null
}

interface MessageContentProps {
  content: string
  onActionExecuted?: () => void
}

export function MessageContent({ content, onActionExecuted }: MessageContentProps) {
  const parts = parseMessage(content)

  return (
    <div className="space-y-2">
      {parts.map((part, i) => {
        if (part.type === "text") {
          return <div key={i} className="whitespace-pre-wrap">{part.content}</div>
        }
        if (part.type === "chart") {
          return <ChartBlock key={i} type={part.chartType!} data={part.data!} title={part.title} />
        }
        if (part.type === "action") {
          return (
            <ActionBlock
              key={i}
              action={part.action!}
              description={part.description!}
              args={part.args}
              onExecuted={onActionExecuted}
            />
          )
        }
        if (part.type === "report") {
          return (
            <ReportBlock
              key={i}
              title={part.title || "报表"}
              filename={part.filename || "report.csv"}
              rows={part.rows || []}
            />
          )
        }
        return null
      })}
    </div>
  )
}

interface ActionBlockProps {
  action: string
  description: string
  args: any
  onExecuted?: () => void
}

const ACTION_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  update_product_stock: { label: "修改库存", color: "#f59e0b", icon: "📦" },
  update_product_price: { label: "调整价格", color: "#ef4444", icon: "💰" },
  update_order_status: { label: "更新订单状态", color: "#3b82f6", icon: "📋" },
  reply_to_message: { label: "回复留言", color: "#10b981", icon: "✉️" },
  batch_update_stock: { label: "批量改库存", color: "#f59e0b", icon: "📦" },
  batch_update_price: { label: "批量改价格", color: "#ef4444", icon: "💰" },
  batch_ship_orders: { label: "批量发货", color: "#3b82f6", icon: "🚚" },
}

function ActionBlock({ action, description, args, onExecuted }: ActionBlockProps) {
  const [status, setStatus] = useState<"pending" | "loading" | "success" | "error">("pending")
  const [result, setResult] = useState("")

  const info = ACTION_LABELS[action] || { label: action, color: "#6b7280", icon: "⚡" }

  const handleConfirm = async () => {
    setStatus("loading")
    try {
      const res = await fetch("/api/ai/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, args }),
      })
      const data = await res.json()
      if (data.success) {
        setStatus("success")
        setResult(data.message || "操作成功")
        onExecuted?.()
      } else {
        setStatus("error")
        setResult(data.error || "操作失败")
      }
    } catch (e: any) {
      setStatus("error")
      setResult(e.message || "操作失败")
    }
  }

  const handleCancel = () => {
    setStatus("error")
    setResult("已取消")
  }

  return (
    <div
      className="rounded-lg overflow-hidden my-2"
      style={{
        border: `1px solid ${info.color}40`,
        backgroundColor: `${info.color}10`,
      }}
    >
      <div
        className="px-3 py-2 flex items-center gap-2"
        style={{ backgroundColor: `${info.color}20` }}
      >
        <span className="text-base">{info.icon}</span>
        <span
          className="text-xs font-medium"
          style={{ color: info.color }}
        >
          {info.label} - 待确认
        </span>
      </div>
      <div className="px-3 py-2.5">
        <p className="text-sm" style={{ color: "var(--adm-text)" }}>
          {description}
        </p>

        {status === "pending" && (
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleConfirm}
              className="flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1"
              style={{
                backgroundColor: info.color,
                color: "white",
              }}
            >
              <Check size={12} />
              确认执行
            </button>
            <button
              onClick={handleCancel}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1"
              style={{
                backgroundColor: "var(--adm-input)",
                color: "var(--adm-text-secondary)",
                border: "1px solid var(--adm-border)",
              }}
            >
              <X size={12} />
              取消
            </button>
          </div>
        )}

        {status === "loading" && (
          <div className="mt-3 flex items-center gap-2 text-xs" style={{ color: "var(--adm-text-secondary)" }}>
            <div className="w-3 h-3 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: info.color, borderTopColor: "transparent" }} />
            执行中...
          </div>
        )}

        {(status === "success" || status === "error") && (
          <div
            className="mt-3 px-2 py-1.5 rounded text-xs flex items-center gap-1.5"
            style={{
              backgroundColor: status === "success" ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
              color: status === "success" ? "#22c55e" : "#ef4444",
            }}
          >
            {status === "success" ? <Check size={12} /> : <X size={12} />}
            {result}
          </div>
        )}
      </div>
    </div>
  )
}

interface ReportBlockProps {
  title: string
  filename: string
  rows: Record<string, any>[]
}

function ReportBlock({ title, filename, rows }: ReportBlockProps) {
  const [downloading, setDownloading] = useState(false)

  const handleDownload = () => {
    setDownloading(true)
    try {
      if (rows.length === 0) return

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
    } finally {
      setTimeout(() => setDownloading(false), 500)
    }
  }

  const previewCount = Math.min(rows.length, 3)
  const headers = rows.length > 0 ? Object.keys(rows[0]).slice(0, 4) : []

  return (
    <div
      className="rounded-lg overflow-hidden my-2"
      style={{
        border: "1px solid var(--adm-border)",
        backgroundColor: "var(--adm-input)",
      }}
    >
      <div
        className="px-3 py-2 flex items-center gap-2"
        style={{ backgroundColor: "var(--adm-card)" }}
      >
        <FileText size={14} style={{ color: "var(--adm-accent)" }} />
        <span className="text-xs font-medium flex-1" style={{ color: "var(--adm-text)" }}>
          {title}
        </span>
        <span className="text-xs" style={{ color: "var(--adm-text-secondary)" }}>
          {rows.length} 行
        </span>
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors"
          style={{
            backgroundColor: "var(--adm-accent)",
            color: "var(--adm-accent-text)",
          }}
        >
          <Download size={12} />
          下载 CSV
        </button>
      </div>

      {rows.length > 0 && (
        <div className="px-3 py-2 overflow-x-auto">
          <table className="w-full text-xs" style={{ color: "var(--adm-text)" }}>
            <thead>
              <tr style={{ color: "var(--adm-text-secondary)" }}>
                {headers.map(h => (
                  <th key={h} className="text-left py-1 pr-3 font-normal">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, previewCount).map((row, i) => (
                <tr key={i} className="border-t" style={{ borderColor: "var(--adm-border)" }}>
                  {headers.map(h => (
                    <td key={h} className="py-1 pr-3 truncate max-w-[100px]">
                      {String(row[h] ?? "")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length > previewCount && (
            <div
              className="text-xs mt-2 text-center"
              style={{ color: "var(--adm-text-secondary)" }}
            >
              ... 还有 {rows.length - previewCount} 行数据
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function parseMessage(content: string): { type: "text" | "chart" | "action" | "report"; content?: string; chartType?: "pie" | "bar" | "line"; data?: any[]; title?: string; action?: string; description?: string; args?: any; filename?: string; rows?: any[] }[] {
  const parts: { type: "text" | "chart" | "action" | "report"; content?: string; chartType?: "pie" | "bar" | "line"; data?: any[]; title?: string; action?: string; description?: string; args?: any; filename?: string; rows?: any[] }[] = []

  const combinedRegex = /```(chart|action|report)\s*\n([\s\S]*?)\n```/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = combinedRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: "text", content: content.slice(lastIndex, match.index) })
    }

    const blockType = match[1]
    const blockContent = match[2].trim()

    if (blockType === "chart") {
      try {
        const parsed = parseChartBlock(blockContent)
        if (parsed) {
          parts.push({ type: "chart", ...parsed })
        } else {
          parts.push({ type: "text", content: match[0] })
        }
      } catch {
        parts.push({ type: "text", content: match[0] })
      }
    } else if (blockType === "action") {
      try {
        const parsed = parseActionBlock(blockContent)
        if (parsed) {
          parts.push({ type: "action", ...parsed })
        } else {
          parts.push({ type: "text", content: match[0] })
        }
      } catch {
        parts.push({ type: "text", content: match[0] })
      }
    } else if (blockType === "report") {
      try {
        const parsed = JSON.parse(blockContent)
        parts.push({
          type: "report",
          title: parsed.title || "报表",
          filename: parsed.filename || "report.csv",
          rows: parsed.rows || [],
        })
      } catch {
        parts.push({ type: "text", content: match[0] })
      }
    }

    lastIndex = match.index + match[0].length
  }

  if (lastIndex < content.length) {
    parts.push({ type: "text", content: content.slice(lastIndex) })
  }

  if (parts.length === 0) {
    parts.push({ type: "text", content })
  }

  return parts
}

function parseActionBlock(content: string): { action: string; description: string; args: any } | null {
  const lines = content.split("\n")
  let action = ""
  let description = ""
  const args: any = {}
  let inArgs = false

  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.startsWith("action:")) {
      action = trimmed.slice(7).trim()
    } else if (trimmed.startsWith("description:")) {
      description = trimmed.slice(12).trim()
    } else if (trimmed.startsWith("args:")) {
      inArgs = true
    } else if (inArgs && trimmed.includes(":")) {
      const [key, ...valParts] = trimmed.split(":")
      const val = valParts.join(":").trim()
      const numVal = Number(val)
      args[key.trim()] = isNaN(numVal) || val === "" ? val : numVal
    }
  }

  if (!action) return null
  return { action, description, args }
}

function parseChartBlock(content: string): { chartType: "pie" | "bar" | "line"; data: any[]; title: string } | null {
  const lines = content.split("\n")
  let chartType: "pie" | "bar" | "line" = "bar"
  let chartTitle = ""
  const data: { label: string; value: number; color?: string }[] = []

  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.startsWith("type:")) {
      const t = trimmed.slice(5).trim() as "pie" | "bar" | "line"
      if (["pie", "bar", "line"].includes(t)) {
        chartType = t
      }
    } else if (trimmed.startsWith("title:")) {
      chartTitle = trimmed.slice(6).trim()
    } else if (trimmed.startsWith("- ") || trimmed.startsWith("  - ")) {
      const itemLine = trimmed.replace(/^-+\s*/, "")
      const colonMatch = itemLine.match(/^(.+?):\s*(\d+)(?:\s*,\s*color:\s*(#?\w+))?$/)
      if (colonMatch) {
        data.push({
          label: colonMatch[1].trim(),
          value: parseInt(colonMatch[2], 10),
          color: colonMatch[3],
        })
      }
    }
  }

  if (data.length === 0) return null
  return { chartType, data, title: chartTitle }
}
