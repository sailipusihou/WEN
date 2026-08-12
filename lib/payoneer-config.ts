import { getRepository } from '@/lib/repository'

export interface PayoneerConfig {
  enabled: boolean
  clientId: string
  secret: string
  env: 'sandbox' | 'production'
  base: string
  configured: boolean
}

export function getPayoneerConfig(): PayoneerConfig {
  const repo = getRepository()
  const s = repo.settings.get()
  
  const env = (s.payoneerEnv || 'sandbox') as 'sandbox' | 'production'
  
  return {
    enabled: !!s.payoneerEnabled,
    clientId: s.payoneerClientId || '',
    secret: s.payoneerClientSecret || '',
    env,
    base: env === 'sandbox' 
      ? 'https://api.sandbox.payoneer.com' 
      : 'https://api.payoneer.com',
    configured: !!(s.payoneerEnabled && s.payoneerClientId && s.payoneerClientSecret),
  }
}

export async function getPayoneerAccessToken(): Promise<string> {
  const config = getPayoneerConfig()
  if (!config.configured) return ''

  const auth = Buffer.from(`${config.clientId}:${config.secret}`).toString('base64')
  
  try {
    const response = await fetch(`${config.base}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
      signal: AbortSignal.timeout(15000),
    })

    const data = await response.json()
    return data.access_token || ''
  } catch {
    return ''
  }
}