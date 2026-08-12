export function getOrCreateVisitorId(): string {
  let visitorId = localStorage.getItem('visitor_id')
  if (!visitorId) {
    visitorId = `v_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    localStorage.setItem('visitor_id', visitorId)
  }
  return visitorId
}

export function getStoredReferralCode(): string | null {
  return localStorage.getItem('referral_code')
}

export function storeReferralCode(refCode: string): void {
  localStorage.setItem('referral_code', refCode)
}

export function getStoredReferralChannel(): string | null {
  return localStorage.getItem('referral_channel')
}

export function storeReferralChannel(sourceChannel: string): void {
  localStorage.setItem('referral_channel', sourceChannel)
}

interface TrackReferralVisitOptions {
  refCode: string
  page: string
  query?: string
  recordOncePerSession?: boolean
  sourceChannel?: string
}

export async function trackReferralVisit({
  refCode,
  page,
  query,
  recordOncePerSession = true,
  sourceChannel,
}: TrackReferralVisitOptions): Promise<void> {
  if (!refCode) return

  const visitorId = getOrCreateVisitorId()
  storeReferralCode(refCode)
  if (sourceChannel) {
    storeReferralChannel(sourceChannel)
  }

  const sessionKey = `referral_click_recorded_${refCode}_${sourceChannel || 'unknown'}_${page || '/'}`
  if (recordOncePerSession && sessionStorage.getItem(sessionKey)) {
    return
  }

  try {
    const response = await fetch('/api/referrals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'click',
        code: refCode,
        visitorId,
        page,
        query,
        sourceChannel,
      }),
    })

    if (response.ok && recordOncePerSession) {
      sessionStorage.setItem(sessionKey, page || '/')
    }
  } catch {}
}
