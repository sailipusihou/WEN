import { NextRequest, NextResponse } from 'next/server'
import { getRepository } from '@/lib/repository'
import { requirePermission } from '@/lib/auth'
import { getPayoneerConfig, getPayoneerAccessToken } from '@/lib/payoneer-config'
import { getAllPayoneerTransactions, syncPayoneerTransactions } from '@/lib/payoneer-transactions'
import { findAttributableReferralClick, markTouchpointsAsConverted } from '@/lib/referral-tracking'

async function fetchFromPayoneerAPI(base: string, accessToken: string): Promise<any[]> {
  const transactions: any[] = []
  
  try {
    const response = await fetch(`${base}/v1/transactions`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(15000),
    })
    
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}))
      console.log('Payoneer API error:', errData.message || 'Unknown error')
      return transactions
    }
    
    const data = await response.json()
    
    if (data.items && Array.isArray(data.items)) {
      for (const item of data.items) {
        const amount = parseFloat(item.amount?.value || '0')
        const fee = parseFloat(item.fee?.value || '0')
        
        transactions.push({
          id: item.id,
          transactionId: item.id,
          captureId: item.capture_id || item.id,
          orderId: item.order_id || '',
          amount,
          fee,
          netAmount: amount - fee,
          currency: item.currency || 'USD',
          status: item.status?.toUpperCase() || 'PENDING',
          createdAt: item.created_at || item.date || '',
          updatedAt: item.updated_at || item.created_at || '',
          customField: item.custom || '',
          invoiceId: item.invoice_id || '',
          payerEmail: item.payer?.email || '',
          payerName: item.payer?.name || '',
          payerId: item.payer?.id || '',
        })
      }
    }
  } catch (e) {
    console.log('Payoneer API fetch error:', (e as Error).message)
  }
  
  return transactions
}

export async function GET(req: NextRequest) {
  const auth = requirePermission(req, 'finance_view')
  if ('error' in auth) return auth.error

  const { searchParams } = new URL(req.url)
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')
  const status = searchParams.get('status')

  const repo = getRepository()
  const allOrders = repo.orders.list()
  
  let payoneerTransactions = getAllPayoneerTransactions()
  
  if (startDate && endDate) {
    const start = new Date(startDate + 'T00:00:00Z').getTime()
    const end = new Date(endDate + 'T23:59:59Z').getTime()
    payoneerTransactions = payoneerTransactions.filter((t: any) => {
      const txTime = new Date(t.createdAt).getTime()
      return txTime >= start && txTime <= end
    })
  }
  
  if (status && status !== 'all') {
    payoneerTransactions = payoneerTransactions.filter((t: any) => {
      if (status === 'completed') return t.status === 'COMPLETED'
      if (status === 'refunded') return t.status === 'REFUNDED'
      if (status === 'unmatched') return !t.matchedOrderId
      return true
    })
  }
  
  const stats = payoneerTransactions.reduce((acc: any, t: any) => {
    acc.totalAmount += t.amount || 0
    acc.totalFees += t.fee || 0
    acc.totalNet += t.netAmount || (t.amount || 0)
    acc.count++
    if (t.status === 'COMPLETED') acc.completed++
    if (t.status === 'REFUNDED') acc.refunded++
    if (!t.matchedOrderId) acc.unmatched++
    return acc
  }, { totalAmount: 0, totalFees: 0, totalNet: 0, count: 0, completed: 0, refunded: 0, unmatched: 0 })

  const enrichedTransactions = payoneerTransactions.map((t: any) => {
    const matchedOrder = t.matchedOrderId ? allOrders.find((o: any) => o.id === t.matchedOrderId) : null
    return {
      id: t.id,
      transactionId: t.transactionId,
      captureId: t.captureId,
      orderId: t.orderId,
      amount: t.amount,
      fee: t.fee,
      netAmount: t.netAmount,
      status: t.status,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      currency: t.currency,
      settlementStatus: t.settlementStatus,
      settlementDate: t.settlementDate,
      payerEmail: t.payerEmail,
      payerName: t.payerName,
      payerId: t.payerId,
      matchedOrderId: t.matchedOrderId,
      matchedOrder: matchedOrder ? {
        id: matchedOrder.id,
        status: matchedOrder.status,
        total: matchedOrder.total,
        customerName: matchedOrder.customerName,
        customerEmail: matchedOrder.customerEmail,
      } : null,
      matched: !!matchedOrder,
    }
  })

  return NextResponse.json({
    transactions: enrichedTransactions,
    stats,
    source: 'payoneer',
  })
}

export async function POST(req: NextRequest) {
  const auth = requirePermission(req, 'finance_manage')
  if ('error' in auth) return auth.error

  try {
    const body = await req.json()
    const action = body.action || ''

    const accessToken = await getPayoneerAccessToken()
    if (!accessToken) {
      return NextResponse.json({ error: 'Payoneer not properly configured. Please check Client ID and Secret.' }, { status: 400 })
    }

    if (action === 'pull_from_payoneer') {
      const repo = getRepository()
      const config = getPayoneerConfig()
      
      try {
        const totalTimeout = setTimeout(() => {
          throw new Error('Pull from Payoneer timed out after 60 seconds')
        }, 60000)
        
        const allOrders = repo.orders.list()
        
        let allTransactions: any[] = []
        let apiMethod = 'payoneer'
        
        allTransactions = await fetchFromPayoneerAPI(config.base, accessToken)
        
        const completedTxns = allTransactions.filter((t: any) => {
          return t.status === 'COMPLETED' || t.status === 'S'
        })
        
        const updatedOrders: string[] = []
        const newMatches: any[] = []
        const unmatchedTxns: any[] = []
        const allTxnData: any[] = []
        
        for (const txn of completedTxns) {
          const amount = txn.amount || 0
          const fee = txn.fee || 0
          const netAmount = amount - fee
          const txnId = txn.transactionId || txn.id || ''
          const txnDate = txn.createdAt || txn.create_time || ''
          const customField = txn.customField || ''
          const invoiceId = txn.invoiceId || ''
          
          let matchedOrder = allOrders.find((o: any) =>
            o.payoneerTransaction?.transactionId === txnId ||
            o.payoneerTransaction?.captureId === txnId ||
            o.payoneerTransaction?.orderId === txnId ||
            o.id === customField ||
            o.id === invoiceId
          )
          
          if (!matchedOrder && amount > 0) {
            const matchedByAmount = allOrders.filter((o: any) =>
              !o.payoneerTransaction?.transactionId &&
              Math.abs(o.total - amount) < 0.01 &&
              o.paymentMethod === 'payoneer'
            )
            if (matchedByAmount.length === 1) {
              matchedOrder = matchedByAmount[0]
            }
          }
          
          const isCompleted = txn.status === 'COMPLETED' || txn.status === 'S'
          const txData = {
            id: txnId || `pay_${Date.now()}`,
            transactionId: txnId,
            captureId: txn.captureId || txnId,
            orderId: customField || invoiceId || txn.orderId || '',
            amount,
            fee,
            netAmount,
            currency: txn.currency || 'USD',
            status: isCompleted ? 'COMPLETED' as const : txn.status,
            createdAt: txnDate,
            updatedAt: txn.updatedAt || txn.update_time || txnDate,
            settlementStatus: (isCompleted ? 'settled' : 'pending') as 'settled' | 'pending',
            settlementDate: isCompleted ? txnDate : null,
            payerEmail: txn.payerEmail || '',
            payerName: txn.payerName || '',
            payerId: txn.payerId || '',
            matchedOrderId: matchedOrder?.id,
            customField,
            invoiceId,
          }
          
          allTxnData.push(txData)
          
          if (matchedOrder) {
            const settings = repo.settings.get()
            let attributionUpdates: any = {}
            if (isCompleted && matchedOrder.referralCode) {
              const attribution = findAttributableReferralClick({
                referralCode: matchedOrder.referralCode,
                visitorId: matchedOrder.referralVisitorId,
                model: settings.attributionModel,
                lookbackDays: settings.attributionLookbackDays,
                requireVisitorMatch: settings.attributionRequireVisitorMatch,
                allowReferralFallback: settings.attributionAllowReferralFallback,
              })
              if (attribution) {
                if (attribution.touchpoints && Array.isArray(attribution.touchpoints)) {
                  markTouchpointsAsConverted(attribution.touchpoints, matchedOrder.id, matchedOrder.total || amount)
                } else {
                  markTouchpointsAsConverted([{ click: attribution.click, weight: 1.0 }], matchedOrder.id, matchedOrder.total || amount)
                }
                attributionUpdates = {
                  attributionClickId: attribution.click.id,
                  attributionModel: attribution.model,
                  attributionTouchpoints: attribution.totalTouchpointsCount || attribution.touchpoints?.length || 1,
                  attributionLookbackDays: attribution.lookbackDays,
                  attributionMatchedBy: attribution.matchedBy,
                  attributionFallbackUsed: attribution.fallbackUsed,
                }
              }
            }
            repo.orders.update(matchedOrder.id, {
              payoneerTransaction: {
                ...(matchedOrder.payoneerTransaction || {}),
                ...txData,
              },
              ...attributionUpdates,
            })
            updatedOrders.push(matchedOrder.id)
            newMatches.push({ orderId: matchedOrder.id, transactionId: txnId, amount })
          } else {
            unmatchedTxns.push(txData)
          }
        }
        
        const syncResult = syncPayoneerTransactions(allTxnData)
        
        clearTimeout(totalTimeout)
        
        const totalFees = allTxnData.reduce((sum: number, item: any) => {
          return sum + (item.fee || 0)
        }, 0)
        const totalAmount = allTxnData.reduce((sum: number, item: any) => {
          return sum + (item.amount || 0)
        }, 0)
        const totalNet = totalAmount - totalFees
        
        return NextResponse.json({
          success: true,
          apiMethod,
          totalFetched: allTransactions.length,
          completedSales: completedTxns.length,
          updatedOrders: updatedOrders.length,
          unmatchedTransactions: unmatchedTxns.length,
          savedTransactions: syncResult.added + syncResult.updated,
          addedTransactions: syncResult.added,
          updatedTransactions: syncResult.updated,
          totalFees,
          totalAmount,
          totalNet,
        })
      } catch (err) {
        console.error('Pull from Payoneer error:', err)
        return NextResponse.json(
          { error: 'Failed to pull transactions: ' + (err as Error).message },
          { status: 400 }
        )
      }
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
