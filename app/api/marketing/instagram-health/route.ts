import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth'
import { getAllSocialAccounts } from '@/lib/social-accounts'
import { getInstagramUserInfo } from '@/lib/instagram'
import { getSettings } from '@/lib/settings'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function classifyError(message: string) {
  const normalized = message.toLowerCase()
  if (normalized.includes('timeout') || normalized.includes('fetch failed') || normalized.includes('connect')) {
    return 'network_unreachable'
  }
  if (normalized.includes('permission') || normalized.includes('scope')) {
    return 'missing_permission'
  }
  if (normalized.includes('token') || normalized.includes('oauth') || normalized.includes('expired')) {
    return 'auth_error'
  }
  return 'unknown_error'
}

export async function GET(req: NextRequest) {
  const auth = requirePermission(req, 'messages_view')
  if ('error' in auth) return auth.error

  try {
    const settings = getSettings()
    const connectedAccounts = getAllSocialAccounts().filter(
      (item) => item.platform === 'instagram' && item.status === 'connected' && item.accessToken
    )
    const baseChecks = {
      apiEnabled: !!settings.igApiEnabled,
      contentPublishEnabled: !!settings.igContentPublishEnabled,
      manageCommentsEnabled: !!settings.igManageCommentsEnabled,
      manageMessagesEnabled: !!settings.igManageMessagesEnabled,
    }

    if (connectedAccounts.length === 0) {
      return NextResponse.json({
        success: false,
        status: 'not_connected',
        checks: {
          ...baseChecks,
          accountConnected: false,
          networkReachable: false,
        },
        accounts: [],
        summary: {
          connectedAccounts: 0,
          healthyAccounts: 0,
          failedAccounts: 0,
        },
        message: 'No connected Instagram account found.',
      })
    }

    const accountResults = await Promise.all(
      connectedAccounts.map(async (account) => {
        try {
          const profile = await getInstagramUserInfo(account.accessToken!)
          return {
            success: true,
            status: 'healthy',
            checks: {
              ...baseChecks,
              accountConnected: true,
              networkReachable: true,
            },
            account: {
              id: account.id,
              username: account.username,
              staffId: account.staffId,
              staffName: account.staffName,
            },
            profile,
            message: 'Instagram API is reachable and account profile sync succeeded.',
          }
        } catch (error: any) {
          const message = error?.message || 'Unknown Instagram health check error'
          return {
            success: false,
            status: classifyError(message),
            checks: {
              ...baseChecks,
              accountConnected: true,
              networkReachable: false,
            },
            account: {
              id: account.id,
              username: account.username,
              staffId: account.staffId,
              staffName: account.staffName,
            },
            message,
          }
        }
      })
    )

    const healthyAccounts = accountResults.filter((item) => item.status === 'healthy').length
    const failedAccounts = accountResults.length - healthyAccounts
    const overallStatus =
      healthyAccounts === accountResults.length
        ? 'healthy'
        : healthyAccounts > 0
          ? 'partial_health'
          : accountResults[0]?.status || 'unknown_error'

    return NextResponse.json({
      success: healthyAccounts > 0,
      status: overallStatus,
      checks: {
        ...baseChecks,
        accountConnected: accountResults.length > 0,
        networkReachable: healthyAccounts > 0,
      },
      accounts: accountResults,
      summary: {
        connectedAccounts: accountResults.length,
        healthyAccounts,
        failedAccounts,
      },
      account:
        accountResults[0]?.account || null,
      profile:
        accountResults[0] && 'profile' in accountResults[0] ? accountResults[0].profile : null,
      message:
        overallStatus === 'healthy'
          ? 'All connected Instagram accounts passed the health check.'
          : overallStatus === 'partial_health'
            ? 'Some Instagram accounts are healthy while others still need attention.'
            : accountResults[0]?.message || 'Instagram health check failed.',
    })
  } catch (error) {
    console.error('[Instagram Health] GET error:', error)
    return NextResponse.json(
      { success: false, status: 'server_error', message: 'Failed to run Instagram health check.' },
      { status: 500 }
    )
  }
}
