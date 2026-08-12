import { getSettings } from "@/lib/settings"

// Public site base URL, resolved from (highest priority first):
// 1. Admin Settings -> Site URL (siteUrl)
// 2. NEXT_PUBLIC_SITE_URL env var
// 3. http://localhost:3000
export function getSiteBaseUrl(): string {
  try {
    const settings = getSettings()
    if (settings.siteUrl?.trim()) {
      return settings.siteUrl.trim().replace(/\/+$/, "")
    }
  } catch {}

  const envUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  if (envUrl) {
    return envUrl.replace(/\/+$/, "")
  }

  return "http://localhost:3000"
}
