import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth'
import { getSettings } from '@/lib/settings'
import { getAllSocialAccounts } from '@/lib/social-accounts'
import { getAllSocialContent } from '@/lib/social-content'
import { getAllReferralLinks } from '@/lib/referral-tracking'
import { getInstagramMediaInsights } from '@/lib/instagram'
import { getInstagramInsightsSummary } from '@/lib/marketing-insights'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function classifyInsightsError(message: string) {
  const normalized = message.toLowerCase()
  if (normalized.includes('does not support') || normalized.includes('must be one of')) {
    return 'metric_not_supported'
  }
  if (normalized.includes('permission') || normalized.includes('scope') || normalized.includes('metric')) {
    return 'missing_permission'
  }
  if (normalized.includes('token') || normalized.includes('oauth') || normalized.includes('expired')) {
    return 'auth_error'
  }
  if (normalized.includes('fetch') || normalized.includes('connect') || normalized.includes('timeout')) {
    return 'network_unreachable'
  }
  return 'unknown_error'
}

export async function GET(req: NextRequest) {
  const auth = requirePermission(req, 'messages_view')
  if ('error' in auth) return auth.error

  try {
    const settings = getSettings()
    const socialContent = getAllSocialContent()
    const referralLinks = getAllReferralLinks()
    const internalSummary = getInstagramInsightsSummary(socialContent, referralLinks)
    const connectedAccounts = getAllSocialAccounts().filter(
      item => item.platform === 'instagram' && item.status === 'connected' && item.accessToken
    )

    const readiness = {
      accountConnected: connectedAccounts.length > 0,
      connectedAccountCount: connectedAccounts.length,
      apiEnabled: !!settings.igApiEnabled,
      internalInsightsEnabled: true,
      officialInsightsToggleEnabled: !!settings.igInsightsEnabled,
      contentPublishEnabled: !!settings.igContentPublishEnabled,
      hasPublishedRecords: internalSummary.publishedRecords > 0,
      manualActionRequired: !settings.igInsightsEnabled,
    }

    if (connectedAccounts.length === 0) {
      return NextResponse.json({
        success: false,
        status: 'not_connected',
        readiness,
        internalSummary,
        accountSummaries: [],
        officialSummary: null,
        message: 'No connected Instagram account found for insights fetch.',
      })
    }

    if (!settings.igInsightsEnabled) {
      return NextResponse.json({
        success: true,
        status: 'internal_only',
        readiness,
        internalSummary,
        accountSummaries: connectedAccounts.map(account => ({
          account: {
            id: account.id,
            username: account.username,
            staffId: account.staffId,
            staffName: account.staffName,
          },
          status: 'internal_only',
          readiness: {
            accountConnected: true,
            apiEnabled: !!settings.igApiEnabled,
            internalInsightsEnabled: true,
            officialInsightsToggleEnabled: false,
            contentPublishEnabled: !!settings.igContentPublishEnabled,
            hasPublishedRecords: socialContent.some(
              record => record.platform === 'instagram' && record.accountId === account.id && record.status === 'published'
            ),
            manualActionRequired: true,
          },
          internalSummary: getInstagramInsightsSummary(
            socialContent.filter(record => record.accountId === account.id),
            referralLinks
          ),
          officialSummary: null,
          message: 'Insights toggle is not enabled yet. Internal attribution snapshot is available.',
        })),
        officialSummary: null,
        message: 'Insights toggle is not enabled yet. Internal attribution snapshot is available.',
      })
    }

    const emptyTotals = () => ({
      impressions: 0,
      reach: 0,
      saved: 0,
      totalInteractions: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      views: 0,
      profileVisits: 0,
      follows: 0,
    })

    const accountSummaries = await Promise.all(
      connectedAccounts.map(async account => {
        const accountRecords = socialContent.filter(record => record.accountId === account.id)
        const accountInternalSummary = getInstagramInsightsSummary(accountRecords, referralLinks)
        const candidates = accountRecords
          .filter(record => record.platform === 'instagram' && record.status === 'published' && record.platformPostId)
          .slice(0, 3)
        const accountReadiness = {
          accountConnected: true,
          apiEnabled: !!settings.igApiEnabled,
          internalInsightsEnabled: true,
          officialInsightsToggleEnabled: !!settings.igInsightsEnabled,
          contentPublishEnabled: !!settings.igContentPublishEnabled,
          hasPublishedRecords: candidates.length > 0,
          manualActionRequired: !settings.igInsightsEnabled,
        }

        if (candidates.length === 0) {
          return {
            account: {
              id: account.id,
              username: account.username,
              staffId: account.staffId,
              staffName: account.staffName,
            },
            status: 'ready_without_posts',
            readiness: accountReadiness,
            internalSummary: accountInternalSummary,
            officialSummary: null,
            message: 'Insights toggle is enabled, but this account has no published Instagram posts with platform post IDs yet.',
          }
        }

        try {
          const officialRecords = await Promise.all(
            candidates.map(async record => {
              const insight = await getInstagramMediaInsights(account.accessToken!, record.platformPostId!)
              return {
                ...insight,
                title: record.contentTitle,
                permalink: record.platformPostUrl,
                accountId: account.id,
                accountUsername: account.username,
                staffId: account.staffId,
                staffName: account.staffName,
              }
            })
          )

          return {
            account: {
              id: account.id,
              username: account.username,
              staffId: account.staffId,
              staffName: account.staffName,
            },
            status: 'ready',
            readiness: accountReadiness,
            internalSummary: accountInternalSummary,
            officialSummary: {
              records: officialRecords,
              totals: officialRecords.reduce((acc, item) => {
                acc.impressions += item.impressions
                acc.reach += item.reach
                acc.saved += item.saved
                acc.totalInteractions += item.totalInteractions
                acc.likes += item.likes
                acc.comments += item.comments
                acc.shares += item.shares
                acc.views += item.views
                acc.profileVisits += item.profileVisits
                acc.follows += item.follows
                return acc
              }, emptyTotals()),
              supportedMetrics: Array.from(new Set(officialRecords.flatMap(item => item.supportedMetrics))),
              unsupportedMetrics: officialRecords.flatMap(item =>
                item.unsupportedMetrics.map(metric => ({
                  ...metric,
                  mediaId: item.mediaId,
                  mediaProductType: item.mediaProductType,
                }))
              ),
              mediaProductTypes: Array.from(new Set(officialRecords.map(item => item.mediaProductType).filter(Boolean))),
            },
            message: 'Instagram official insights fetch succeeded for this account.',
          }
        } catch (error: any) {
          return {
            account: {
              id: account.id,
              username: account.username,
              staffId: account.staffId,
              staffName: account.staffName,
            },
            status: classifyInsightsError(error?.message || 'Unknown insights error'),
            readiness: accountReadiness,
            internalSummary: accountInternalSummary,
            officialSummary: null,
            message: error?.message || 'Failed to fetch official Instagram insights.',
          }
        }
      })
    )

    const readyAccounts = accountSummaries.filter(item => item.status === 'ready')
    const aggregateStatus =
      readyAccounts.length === accountSummaries.length
        ? 'ready'
        : readyAccounts.length > 0
          ? 'partial_ready'
          : accountSummaries[0]?.status || 'unknown_error'
    const aggregateOfficialRecords = readyAccounts.flatMap(item => item.officialSummary?.records || [])
    const officialSummary = aggregateOfficialRecords.length
      ? {
          records: aggregateOfficialRecords,
          totals: aggregateOfficialRecords.reduce((acc, item) => {
            acc.impressions += item.impressions
            acc.reach += item.reach
            acc.saved += item.saved
            acc.totalInteractions += item.totalInteractions
            acc.likes += item.likes
            acc.comments += item.comments
            acc.shares += item.shares
            acc.views += item.views
            acc.profileVisits += item.profileVisits
            acc.follows += item.follows
            return acc
          }, emptyTotals()),
          supportedMetrics: Array.from(new Set(aggregateOfficialRecords.flatMap(item => item.supportedMetrics))),
          unsupportedMetrics: readyAccounts.flatMap(item => item.officialSummary?.unsupportedMetrics || []),
          mediaProductTypes: Array.from(new Set(aggregateOfficialRecords.map(item => item.mediaProductType).filter(Boolean))),
        }
      : null

    return NextResponse.json({
      success: readyAccounts.length > 0,
      status: aggregateStatus,
      readiness: {
        ...readiness,
        readyAccountCount: readyAccounts.length,
      },
      internalSummary,
      accountSummaries,
      officialSummary,
      message:
        aggregateStatus === 'ready'
          ? 'Instagram official insights fetch succeeded for all connected accounts.'
          : aggregateStatus === 'partial_ready'
            ? 'Some Instagram accounts returned official insights while others still need attention.'
            : accountSummaries[0]?.message || 'Failed to fetch official Instagram insights.',
    })
  } catch (error) {
    console.error('[Instagram Insights] GET error:', error)
    return NextResponse.json(
      { success: false, status: 'server_error', message: 'Failed to fetch Instagram insights.' },
      { status: 500 }
    )
  }
}
