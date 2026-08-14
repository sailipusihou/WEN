"use client"
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import {
  Music2, RefreshCw, Upload, Video, Share2, Link2, Settings, ExternalLink,
  CheckCircle2, AlertTriangle, Loader2, User as UserIcon, Eye, Heart,
  MessageCircle, CalendarDays, LogOut, Clapperboard, ArrowLeft, Info,
  ShieldCheck, KeyRound, PlugZap, FileVideo, Send, BadgeCheck,
} from "lucide-react"

const TIKTOK_SCOPES = [
  { id: "user.info", label: "user.info", desc: "Login Kit — read basic profile info (avatar, nickname, username)" },
  { id: "video.list", label: "video.list", desc: "Display API — list the connected account's videos" },
  { id: "video.publish", label: "video.publish", desc: "Content Posting API — upload and publish videos" },
]

const PRIVACY_OPTIONS = [
  { value: "SELF_ONLY", label: "Private (Only Me)" },
  { value: "FRIENDS", label: "Friends" },
  { value: "PUBLIC_TO_EVERYONE", label: "Public" },
]

function TikTokConsole() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [settings, setSettings] = useState<any>(null)
  const [accounts, setAccounts] = useState<any[]>([])
  const [selectedAccountId, setSelectedAccountId] = useState<string>("")
  const [profile, setProfile] = useState<any>(null)
  const [timeline, setTimeline] = useState<any[]>([])
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState({ profile: false, timeline: false, publish: false, connect: false })
  const [notice, setNotice] = useState<{ kind: "ok" | "err"; text: string } | null>(null)
  const [publishForm, setPublishForm] = useState({ title: "", description: "", privacy: "SELF_ONLY" })
  const [publishFile, setPublishFile] = useState<File | null>(null)
  const [lastPublish, setLastPublish] = useState<any>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const authMsg = searchParams.get("tiktok_auth")

  const showNotice = useCallback((kind: "ok" | "err", text: string) => {
    setNotice({ kind, text })
    window.setTimeout(() => setNotice(null), 6000)
  }, [])

  // 初始数据：会话 + 设置 + 账号
  useEffect(() => {
    ;(async () => {
      try {
        const [authRes, settingsRes, accRes] = await Promise.all([
          fetch("/api/auth/check?_t=" + Date.now(), { credentials: "include" }),
          fetch("/api/settings?_t=" + Date.now()),
          fetch("/api/marketing/social-accounts?_t=" + Date.now(), { credentials: "include" }),
        ])
        const authData = authRes.ok ? await authRes.json() : null
        if (!authData?.ok || !authData?.user) {
          router.push("/admin/login")
          return
        }
        setCurrentUser(authData.user)
        const settingsData = settingsRes.ok ? await settingsRes.json() : null
        if (settingsData) setSettings(settingsData)
        const accData = accRes.ok ? await accRes.json() : null
        const list: any[] = accData?.accounts || []
        const tiktokAccounts = list.filter((a: any) => a.platform === "tiktok" && a.status === "connected")
        setAccounts(list.filter((a: any) => a.platform === "tiktok"))
        if (tiktokAccounts.length > 0) setSelectedAccountId(tiktokAccounts[0].id)
      } catch (e) {
        console.error("[TikTok Console] init error", e)
      }
    })()
  }, [router])

  // OAuth 回跳提示
  useEffect(() => {
    if (!authMsg) return
    if (authMsg === "success") {
      showNotice("ok", "TikTok account connected successfully")
      const t = window.setTimeout(() => {
        fetch("/api/marketing/social-accounts?_t=" + Date.now(), { credentials: "include" })
          .then(r => r.ok ? r.json() : null)
          .then((d: any) => {
            const list: any[] = d?.accounts || []
            const tiktokAccounts = list.filter((a: any) => a.platform === "tiktok" && a.status === "connected")
            setAccounts(list.filter((a: any) => a.platform === "tiktok"))
            if (tiktokAccounts.length > 0) {
              setSelectedAccountId(tiktokAccounts[0].id)
            }
          })
          .catch(() => {})
      }, 800)
      return () => window.clearTimeout(t)
    } else if (authMsg === "error" || authMsg === "expired") {
      showNotice("err", authMsg === "expired" ? "OAuth session expired. Please try again." : (searchParams.get("msg") || "TikTok authorization failed"))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authMsg])

  const selectedAccount = useMemo(() => accounts.find(a => a.id === selectedAccountId) || null, [accounts, selectedAccountId])

  const canManage = currentUser?.role === "super_admin" || currentUser?.role === "admin"
  const apiReady = settings?.tkApiEnabled && settings?.tkClientId && settings?.tkClientSecret

  const loadProfile = useCallback(async (accountId: string) => {
    if (!accountId) return
    setLoading(l => ({ ...l, profile: true }))
    try {
      const r = await fetch(`/api/marketing/tiktok-profile?accountId=${accountId}`, { credentials: "include" })
      const d = await r.json()
      if (r.ok && d?.success) {
        setProfile(d.profile)
      } else {
        setProfile(null)
        showNotice("err", d?.error || "Failed to load profile")
      }
    } catch {
      setProfile(null)
      showNotice("err", "Failed to load TikTok profile")
    } finally {
      setLoading(l => ({ ...l, profile: false }))
    }
  }, [showNotice])

  const loadTimeline = useCallback(async (accountId: string, cursor?: string, append = false) => {
    if (!accountId) return
    setLoading(l => ({ ...l, timeline: true }))
    try {
      const params = new URLSearchParams({ accountId, maxCount: "12" })
      if (cursor) params.set("cursor", cursor)
      const r = await fetch(`/api/marketing/tiktok-timeline?${params.toString()}`, { credentials: "include" })
      const d = await r.json()
      if (r.ok && d?.success) {
        setTimeline(prev => append ? [...prev, ...(d.videos || [])] : (d.videos || []))
        setNextCursor(d.nextCursor)
        setHasMore(!!d.hasMore)
      } else {
        showNotice("err", d?.error || "Failed to load timeline")
      }
    } catch {
      showNotice("err", "Failed to load TikTok timeline")
    } finally {
      setLoading(l => ({ ...l, timeline: false }))
    }
  }, [showNotice])

  // 选择账号 → 拉取 profile + timeline
  useEffect(() => {
    if (!selectedAccountId) {
      setProfile(null)
      setTimeline([])
      setNextCursor(undefined)
      setHasMore(false)
      return
    }
    loadProfile(selectedAccountId)
    loadTimeline(selectedAccountId)
  }, [selectedAccountId, loadProfile, loadTimeline])

  const handleConnect = async () => {
    if (!currentUser) return
    setLoading(l => ({ ...l, connect: true }))
    try {
      const r = await fetch("/api/marketing/tiktok-oauth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          staffId: currentUser.id,
          staffName: currentUser.name || currentUser.email || currentUser.id,
          staffAvatar: currentUser.avatar || undefined,
        }),
      })
      const d = await r.json()
      if (r.ok && d?.authUrl) {
        window.location.href = d.authUrl
        return
      }
      showNotice("err", d?.error || "Failed to start TikTok authorization")
    } catch {
      showNotice("err", "Failed to start TikTok authorization")
    } finally {
      setLoading(l => ({ ...l, connect: false }))
    }
  }

  const handleDisconnect = async () => {
    if (!selectedAccount) return
    if (!window.confirm(`Disconnect @${selectedAccount.username || selectedAccount.id} from TikTok?`)) return
    try {
      const r = await fetch("/api/marketing/social-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "disconnect", id: selectedAccount.id }),
      })
      const d = await r.json()
      if (r.ok && d?.success) {
        showNotice("ok", "TikTok account disconnected")
        const refreshed = await fetch("/api/marketing/social-accounts?_t=" + Date.now(), { credentials: "include" })
        const accData = await refreshed.json()
        const list: any[] = accData?.accounts || []
        const tiktokAccounts = list.filter((a: any) => a.platform === "tiktok" && a.status === "connected")
        setAccounts(list.filter((a: any) => a.platform === "tiktok"))
        setSelectedAccountId(tiktokAccounts[0]?.id || "")
      } else {
        showNotice("err", d?.error || "Failed to disconnect account")
      }
    } catch {
      showNotice("err", "Failed to disconnect account")
    }
  }

  const handlePublish = async () => {
    if (!selectedAccount) { showNotice("err", "Connect a TikTok account first"); return }
    if (!publishFile) { showNotice("err", "Please choose a video file (MP4/MOV, max 50MB)"); return }
    if (publishFile.size > 50 * 1024 * 1024) { showNotice("err", "Video exceeds 50MB limit"); return }
    setLoading(l => ({ ...l, publish: true }))
    setLastPublish(null)
    try {
      // 1) 上传到站点 uploads 目录
      const form = new FormData()
      form.append("file", publishFile)
      form.append("type", "video")
      const upRes = await fetch("/api/upload", { method: "POST", body: form, credentials: "include" })
      const upData = await upRes.json()
      if (!upRes.ok || !upData?.url) {
        showNotice("err", upData?.error || "Video upload failed")
        return
      }
      const fileUrl: string = upData.url
      const qIdx = fileUrl.indexOf("file=")
      const filename = qIdx >= 0 ? decodeURIComponent(fileUrl.slice(qIdx + 5).split("&")[0]) : fileUrl.split("/").pop() || ""

      // 2) 调 TikTok 发布 API
      const pubRes = await fetch("/api/marketing/tiktok-publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          accountId: selectedAccount.id,
          title: publishForm.title.trim(),
          description: publishForm.description.trim(),
          privacyLevel: publishForm.privacy,
          videoPath: `public/uploads/${filename}`,
        }),
      })
      const pubData = await pubRes.json()
      if (!pubRes.ok || !pubData?.success) {
        showNotice("err", pubData?.error || "TikTok publish failed")
        return
      }
      setLastPublish(pubData)
      showNotice("ok", "Video uploaded to TikTok! It is now processing.")
      setPublishFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ""
      // 稍后刷新时间线
      window.setTimeout(() => {
        loadTimeline(selectedAccount.id)
        loadProfile(selectedAccount.id)
      }, 6000)
    } catch (e: any) {
      showNotice("err", e?.message || "Publish failed")
    } finally {
      setLoading(l => ({ ...l, publish: false }))
    }
  }

  const handleShare = () => {
    const siteUrl = (settings?.siteUrl || window.location.origin) as string
    const shareUrl = `${siteUrl}${siteUrl.endsWith("/") ? "" : "/"}`
    const text = settings?.siteName || "Low Flame"
    const url = `https://www.tiktok.com/share?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(text)}`
    window.open(url, "_blank", "noopener,noreferrer,width=720,height=640")
  }

  const card = "rounded-2xl p-5"
  const cardStyle = { backgroundColor: "var(--adm-card)", border: "1px solid var(--adm-border)" }
  const labelStyle = { color: "var(--adm-text-secondary)" }
  const inputStyle = { backgroundColor: "var(--adm-input)", border: "1px solid var(--adm-input-border)", color: "var(--adm-text)" }

  return (
    <div className="max-w-5xl mx-auto py-6 px-4 space-y-5">
      {/* 顶部 */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#000", color: "#fff" }}>
            <Music2 size={22} />
          </div>
          <div>
            <h1 className="text-lg font-bold" style={{ color: "var(--adm-text)" }}>TikTok Console</h1>
            <p className="text-xs" style={labelStyle}>Login Kit · Share Kit · Display API · Content Posting API</p>
          </div>
        </div>
        <Link href="/admin/marketing" className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg adm-hover-bg" style={{ color: "var(--adm-text-secondary)" }}>
          <ArrowLeft size={14} /> Marketing Center
        </Link>
      </div>

      {notice && (
        <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm" style={{
          backgroundColor: notice.kind === "ok" ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
          color: notice.kind === "ok" ? "#16a34a" : "#dc2626",
          border: `1px solid ${notice.kind === "ok" ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`,
        }}>
          {notice.kind === "ok" ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          <span>{notice.text}</span>
        </div>
      )}

      {/* 设置状态 */}
      <div className={card} style={cardStyle}>
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: "var(--adm-text)" }}>
          <Settings size={15} style={{ color: "var(--adm-accent)" }} /> Integration Status
        </h3>
        <div className="grid sm:grid-cols-3 gap-3">
          {[
            { label: "API Enabled", ok: !!settings?.tkApiEnabled, detail: settings?.tkApiEnabled ? "Enabled" : "Disabled" },
            { label: "Client Key", ok: !!settings?.tkClientId, detail: settings?.tkClientId ? settings.tkClientId.slice(0, 10) + "…" : "Not configured" },
            { label: "Callback URL", ok: !!settings?.tkCallbackUrl, detail: settings?.tkCallbackUrl ? settings.tkCallbackUrl.replace(/^https?:\/\//, "") : "Auto (current origin)" },
          ].map(item => (
            <div key={item.label} className="rounded-xl px-4 py-3" style={{ backgroundColor: "var(--adm-input)", border: "1px solid var(--adm-input-border)" }}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-medium" style={labelStyle}>{item.label}</span>
                {item.ok ? <CheckCircle2 size={14} style={{ color: "#16a34a" }} /> : <AlertTriangle size={14} style={{ color: "#f59e0b" }} />}
              </div>
              <p className="text-xs font-semibold truncate" style={{ color: "var(--adm-text)" }}>{item.detail}</p>
            </div>
          ))}
        </div>
        {!apiReady && (
          <div className="mt-3 flex items-center justify-between gap-3 rounded-xl px-4 py-3" style={{ backgroundColor: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)" }}>
            <p className="text-xs flex items-center gap-2" style={{ color: "#b45309" }}>
              <KeyRound size={14} />
              TikTok API is not fully configured. Add your Client Key & Client Secret in Settings first.
            </p>
            <Link href="/admin/settings" className="text-xs font-semibold px-3 py-1.5 rounded-lg whitespace-nowrap" style={{ backgroundColor: "#f59e0b", color: "#fff" }}>
              Go to Settings
            </Link>
          </div>
        )}
      </div>

      {/* 连接账号 */}
      <div className={card} style={cardStyle}>
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: "var(--adm-text)" }}>
          <PlugZap size={15} style={{ color: "var(--adm-accent)" }} /> TikTok Account
        </h3>
        {accounts.length === 0 ? (
          <div className="text-center py-6">
            <Music2 size={32} className="mx-auto mb-2 opacity-40" style={{ color: "var(--adm-text-secondary)" }} />
            <p className="text-sm font-medium mb-1" style={{ color: "var(--adm-text)" }}>No TikTok account connected</p>
            <p className="text-xs mb-4" style={labelStyle}>Click below to authorize with TikTok (OAuth 2.0 + PKCE, scopes: user.info, video.list, video.publish)</p>
            <button
              onClick={handleConnect}
              disabled={!apiReady || loading.connect}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50"
              style={{ backgroundColor: "#000" }}
            >
              {loading.connect ? <Loader2 size={16} className="animate-spin" /> : <Music2 size={16} />}
              Connect TikTok Account
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              {accounts.map(acc => (
                <button
                  key={acc.id}
                  onClick={() => setSelectedAccountId(acc.id)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all"
                  style={{
                    backgroundColor: selectedAccountId === acc.id ? "rgba(0,0,0,0.08)" : "var(--adm-input)",
                    border: selectedAccountId === acc.id ? "2px solid #000" : "2px solid transparent",
                    color: "var(--adm-text)",
                    opacity: acc.status === "connected" ? 1 : 0.55,
                  }}
                >
                  {acc.avatar ? (
                    <img src={acc.avatar} alt="" className="w-6 h-6 rounded-full object-cover" />
                  ) : (
                    <UserIcon size={14} style={{ color: "var(--adm-text-secondary)" }} />
                  )}
                  <span>@{acc.username || acc.id}</span>
                  {acc.status === "connected" && <BadgeCheck size={13} style={{ color: "#16a34a" }} />}
                </button>
              ))}
              <button
                onClick={handleConnect}
                disabled={!apiReady || loading.connect}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white transition-all disabled:opacity-50"
                style={{ backgroundColor: "#000" }}
              >
                {loading.connect ? <Loader2 size={13} className="animate-spin" /> : <PlugZap size={13} />}
                {canManage ? "Add Account" : "Connect"}
              </button>
              {selectedAccount && canManage && (
                <button
                  onClick={handleDisconnect}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors"
                  style={{ backgroundColor: "rgba(239,68,68,0.1)", color: "#dc2626", border: "1px solid rgba(239,68,68,0.3)" }}
                >
                  <LogOut size={13} /> Disconnect
                </button>
              )}
            </div>

            {/* Profile */}
            <div className="rounded-xl p-4 flex flex-wrap items-center gap-4" style={{ backgroundColor: "var(--adm-input)", border: "1px solid var(--adm-input-border)" }}>
              {loading.profile ? (
                <div className="flex items-center gap-2 text-xs py-4" style={labelStyle}>
                  <Loader2 size={14} className="animate-spin" /> Loading profile...
                </div>
              ) : profile ? (
                <>
                  <div className="w-16 h-16 rounded-full overflow-hidden flex-shrink-0" style={{ backgroundColor: "var(--adm-card)", border: "2px solid var(--adm-border)" }}>
                    {profile.avatarUrl ? (
                      <img src={profile.avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center" style={{ color: "var(--adm-text-secondary)" }}>
                        <UserIcon size={24} />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-[180px]">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold" style={{ color: "var(--adm-text)" }}>{profile.nickname || profile.username}</p>
                      <span className="text-xs" style={labelStyle}>@{profile.username}</span>
                      {profile.profileUrl && (
                        <a href={profile.profileUrl} target="_blank" rel="noopener noreferrer" className="text-xs inline-flex items-center gap-1" style={{ color: "var(--adm-accent)" }}>
                          View on TikTok <ExternalLink size={11} />
                        </a>
                      )}
                    </div>
                    {profile.bioDescription && <p className="text-xs mt-1 line-clamp-2" style={labelStyle}>{profile.bioDescription}</p>}
                    <div className="flex items-center gap-4 mt-2 text-xs">
                      <span style={{ color: "var(--adm-text)" }}><b>{profile.followerCount?.toLocaleString?.() || 0}</b> <span style={labelStyle}>Followers</span></span>
                      <span style={{ color: "var(--adm-text)" }}><b>{profile.followingCount?.toLocaleString?.() || 0}</b> <span style={labelStyle}>Following</span></span>
                      <span style={{ color: "var(--adm-text)" }}><b>{profile.likesCount?.toLocaleString?.() || 0}</b> <span style={labelStyle}>Likes</span></span>
                      <span style={{ color: "var(--adm-text)" }}><b>{profile.videoCount || 0}</b> <span style={labelStyle}>Videos</span></span>
                    </div>
                  </div>
                  <button onClick={() => { loadProfile(selectedAccountId); loadTimeline(selectedAccountId) }} className="p-2 rounded-lg adm-hover-bg" title="Refresh" style={{ color: "var(--adm-text-secondary)" }}>
                    <RefreshCw size={15} />
                  </button>
                </>
              ) : (
                <div className="text-xs py-4" style={labelStyle}>Profile unavailable — token may have expired. Try disconnecting and reconnecting.</div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Display API — 时间线 */}
        <div className={card} style={cardStyle}>
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: "var(--adm-text)" }}>
            <Eye size={15} style={{ color: "var(--adm-accent)" }} /> Display API — Video Timeline
            <span className="text-[10px] font-normal px-2 py-0.5 rounded-full" style={{ backgroundColor: "rgba(0,0,0,0.06)", color: "var(--adm-text-secondary)" }}>video.list</span>
          </h3>
          {!selectedAccount ? (
            <p className="text-xs py-8 text-center" style={labelStyle}>Connect a TikTok account to view its videos</p>
          ) : loading.timeline && timeline.length === 0 ? (
            <div className="flex items-center justify-center gap-2 text-xs py-10" style={labelStyle}>
              <Loader2 size={15} className="animate-spin" /> Loading videos...
            </div>
          ) : timeline.length === 0 ? (
            <p className="text-xs py-8 text-center" style={labelStyle}>No videos yet — publish your first video below</p>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {timeline.map(v => (
                  <div key={v.id} className="rounded-xl overflow-hidden" style={{ backgroundColor: "var(--adm-input)", border: "1px solid var(--adm-input-border)" }}>
                    <div className="relative aspect-[3/4] bg-black/5">
                      {v.coverUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={v.coverUrl} alt={v.title || "TikTok video"} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center" style={{ color: "var(--adm-text-secondary)" }}>
                          <Clapperboard size={22} />
                        </div>
                      )}
                      <div className="absolute bottom-1.5 right-1.5 flex items-center gap-1.5 text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-black/60 text-white">
                        <Eye size={10} /> {v.viewCount?.toLocaleString?.() || 0}
                        <Heart size={10} /> {v.likeCount?.toLocaleString?.() || 0}
                      </div>
                    </div>
                    <div className="p-2.5">
                      <p className="text-[11px] font-medium truncate" style={{ color: "var(--adm-text)" }}>{v.title || "Untitled video"}</p>
                      <p className="text-[10px] mt-0.5 flex items-center gap-1" style={labelStyle}>
                        <CalendarDays size={10} />
                        {v.createTime ? new Date(v.createTime).toLocaleDateString() : "—"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              {hasMore && (
                <button
                  onClick={() => loadTimeline(selectedAccountId, nextCursor, true)}
                  disabled={loading.timeline}
                  className="w-full mt-3 py-2 rounded-xl text-xs font-medium transition-all adm-hover-bg disabled:opacity-50"
                  style={{ color: "var(--adm-text-secondary)", border: "1px solid var(--adm-border)" }}
                >
                  {loading.timeline ? <Loader2 size={13} className="animate-spin inline mr-1" /> : null} Load More
                </button>
              )}
            </>
          )}
        </div>

        {/* Content Posting API — 发布 */}
        <div className={card} style={cardStyle}>
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: "var(--adm-text)" }}>
            <Upload size={15} style={{ color: "var(--adm-accent)" }} /> Content Posting API — Publish Video
            <span className="text-[10px] font-normal px-2 py-0.5 rounded-full" style={{ backgroundColor: "rgba(0,0,0,0.06)", color: "var(--adm-text-secondary)" }}>video.publish</span>
          </h3>
          <div className="space-y-3">
            <div
              className="rounded-xl border-2 border-dashed px-4 py-6 text-center cursor-pointer transition-colors"
              style={{ borderColor: publishFile ? "#16a34a" : "var(--adm-border)", backgroundColor: "var(--adm-input)" }}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="video/mp4,video/quicktime,video/webm,video/ogg"
                className="hidden"
                onChange={e => setPublishFile(e.target.files?.[0] || null)}
              />
              {publishFile ? (
                <>
                  <FileVideo size={22} className="mx-auto mb-1" style={{ color: "#16a34a" }} />
                  <p className="text-xs font-medium truncate px-4" style={{ color: "var(--adm-text)" }}>{publishFile.name}</p>
                  <p className="text-[10px] mt-0.5" style={labelStyle}>{(publishFile.size / 1024 / 1024).toFixed(1)} MB — click to change</p>
                </>
              ) : (
                <>
                  <Video size={22} className="mx-auto mb-1 opacity-50" style={{ color: "var(--adm-text-secondary)" }} />
                  <p className="text-xs" style={labelStyle}>Click to choose a video (MP4 / MOV, max 50MB)</p>
                </>
              )}
            </div>
            <input
              type="text"
              value={publishForm.title}
              onChange={e => setPublishForm(p => ({ ...p, title: e.target.value }))}
              placeholder="Video title (max 32 chars)"
              maxLength={32}
              className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none focus:ring-2"
              style={{ ...inputStyle, ["--tw-ring-color" as any]: "var(--adm-accent)" } as any}
            />
            <textarea
              value={publishForm.description}
              onChange={e => setPublishForm(p => ({ ...p, description: e.target.value }))}
              placeholder="Description (optional)"
              rows={2}
              className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none resize-none focus:ring-2"
              style={{ ...inputStyle, ["--tw-ring-color" as any]: "var(--adm-accent)" } as any}
            />
            <div className="flex items-center gap-2">
              <span className="text-xs whitespace-nowrap" style={labelStyle}>Privacy:</span>
              <select
                value={publishForm.privacy}
                onChange={e => setPublishForm(p => ({ ...p, privacy: e.target.value }))}
                className="flex-1 px-3 py-2 rounded-xl text-xs outline-none"
                style={inputStyle}
              >
                {PRIVACY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <button
              onClick={handlePublish}
              disabled={loading.publish || !selectedAccount || !publishFile}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50"
              style={{ backgroundColor: "#000" }}
            >
              {loading.publish ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
              {loading.publish ? "Uploading to TikTok…" : "Publish to TikTok"}
            </button>
            {lastPublish && (
              <div className="rounded-xl px-3.5 py-2.5 text-xs flex items-start gap-2" style={{ backgroundColor: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)", color: "#16a34a" }}>
                <CheckCircle2 size={14} className="mt-0.5 flex-shrink-0" />
                <span>
                  Uploaded! Post ID: <b>{lastPublish.postId}</b>. TikTok is processing the video — it will appear in the timeline shortly.
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Share Kit */}
        <div className={card} style={cardStyle}>
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: "var(--adm-text)" }}>
            <Share2 size={15} style={{ color: "var(--adm-accent)" }} /> Share Kit — Share to TikTok
            <span className="text-[10px] font-normal px-2 py-0.5 rounded-full" style={{ backgroundColor: "rgba(0,0,0,0.06)", color: "var(--adm-text-secondary)" }}>no auth needed</span>
          </h3>
          <p className="text-xs mb-4 leading-relaxed" style={labelStyle}>
            Let visitors share the store (or any product page) to TikTok. The Share Kit opens TikTok&apos;s share sheet with the site link — a one-click way to spread content.
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleShare}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
              style={{ backgroundColor: "#000" }}
            >
              <Music2 size={15} /> Share to TikTok
            </button>
            <button
              onClick={async () => {
                const siteUrl = (settings?.siteUrl || window.location.origin) as string
                try { await navigator.clipboard.writeText(siteUrl) } catch {}
                showNotice("ok", "Site link copied — paste it in TikTok's share dialog")
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium transition-all adm-hover-bg"
              style={{ color: "var(--adm-text-secondary)", border: "1px solid var(--adm-border)" }}
            >
              <Link2 size={14} /> Copy Site Link
            </button>
          </div>
        </div>

        {/* Scopes */}
        <div className={card} style={cardStyle}>
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: "var(--adm-text)" }}>
            <ShieldCheck size={15} style={{ color: "var(--adm-accent)" }} /> Requested Scopes
          </h3>
          <div className="space-y-2.5">
            {TIKTOK_SCOPES.map(s => (
              <div key={s.id} className="flex items-start gap-2.5">
                <BadgeCheck size={14} className="mt-0.5 flex-shrink-0" style={{ color: "#16a34a" }} />
                <div>
                  <p className="text-xs font-semibold font-mono" style={{ color: "var(--adm-text)" }}>{s.label}</p>
                  <p className="text-[11px]" style={labelStyle}>{s.desc}</p>
                </div>
              </div>
            ))}
            <p className="text-[11px] pt-1 flex items-center gap-1.5" style={labelStyle}>
              <Info size={12} />
              These scopes appear on TikTok&apos;s consent screen when connecting, and are also visible in the developer portal under your app.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function TikTokConsolePage() {
  return (
    <Suspense fallback={
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <TikTokConsole />
    </Suspense>
  )
}
