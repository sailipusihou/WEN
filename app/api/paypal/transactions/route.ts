import { NextRequest, NextResponse } from "next/server"
import { getRepository } from "@/lib/repository"
import { requirePermission } from "@/lib/auth"
import { getAllPayPalTransactions, syncPayPalTransactions } from "@/lib/paypal-transactions"
import { findAttributableReferralClick, markTouchpointsAsConverted } from "@/lib/referral-tracking"

function getPayPalConfig() {
  try {
    const repo = getRepository()
    const settings = repo.settings.get()
    
    const dbEnabled = settings.paypalEnabled && settings.paypalClientId && settings.paypalClientSecret
    const envClientId = process.env.PAYPAL_CLIENT_ID || ''
    const envSecret = process.env.PAYPAL_CLIENT_SECRET || ''
    const envEnv = process.env.PAYPAL_ENV || 'sandbox'
    const envApi = process.env.PAYPAL_API_URL || (envEnv === 'production'
      ? 'https://api-m.paypal.com'
      : 'https://api-m.sandbox.paypal.com')
    
    if (dbEnabled) {
      return {
        clientId: settings.paypalClientId,
        secret: settings.paypalClientSecret,
        env: settings.paypalEnv || 'sandbox',
        base: settings.paypalEnv === 'production'
          ? 'https://api-m.paypal.com'
          : 'https://api-m.sandbox.paypal.com',
        configured: true,
      }
    }
    
    if (envClientId && envSecret) {
      return {
        clientId: envClientId,
        secret: envSecret,
        env: envEnv,
        base: envApi,
        configured: true,
      }
    }
    
    return {
      clientId: '',
      secret: '',
      env: 'sandbox',
      base: 'https://api-m.sandbox.paypal.com',
      configured: false,
    }
  } catch {
    return {
      clientId: '',
      secret: '',
      env: 'sandbox',
      base: 'https://api-m.sandbox.paypal.com',
      configured: false,
    }
  }
}

async function getPayPalAccessToken(): Promise<string> {
  const config = getPayPalConfig()
  if (!config.configured) return ""

  const auth = Buffer.from(`${config.clientId}:${config.secret}`).toString("base64")
  
  try {
    const response = await fetch(`${config.base}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
      signal: AbortSignal.timeout(15000),
    })

    const data = await response.json()
    return data.access_token || ""
  } catch {
    return ""
  }
}

async function fetchFromPaymentsAPI(base: string, accessToken: string): Promise<any[]> {
  const transactions: any[] = []
  let nextId: string | null = null
  const maxPages = 10
  let pageCount = 0
  
  do {
    let url = `${base}/v1/payments/payment?count=100&sort_by=create_time&sort_order=desc`
    if (nextId) {
      url += `&start_id=${nextId}`
    }
    
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(15000),
    })
    
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}))
      throw new Error(`Payments API error (${response.status}): ${errData.message || errData.name || 'Unknown error'}`)
    }
    
    const data = await response.json()
    
    if (data.payments && Array.isArray(data.payments)) {
      for (const payment of data.payments) {
        if (payment.state === 'approved' || payment.state === 'completed') {
          const transaction = payment.transactions?.[0]
          const relatedResources = transaction?.related_resources || []
          const sale = relatedResources.find((r: any) => r.sale)?.sale
          
          if (sale) {
            transactions.push({
              id: payment.id,
              transactionId: sale.id,
              captureId: sale.id,
              orderId: '',
              amount: parseFloat(sale.amount?.total || "0"),
              fee: parseFloat(sale.transaction_fee?.value || "0"),
              netAmount: parseFloat(sale.amount?.total || "0") - parseFloat(sale.transaction_fee?.value || "0"),
              currency: sale.amount?.currency || 'USD',
              status: sale.state === 'completed' ? 'COMPLETED' : sale.state?.toUpperCase() || 'PENDING',
              createdAt: sale.create_time || payment.create_time,
              updatedAt: sale.update_time || payment.update_time,
              customField: transaction?.custom || payment.experience_profile_id || '',
              invoiceId: transaction?.invoice_number || '',
              payerEmail: payment.payer?.payer_info?.email || '',
              payerName: payment.payer?.payer_info?.first_name 
                ? `${payment.payer.payer_info.first_name} ${payment.payer.payer_info.last_name || ''}`.trim() 
                : '',
              payerId: payment.payer?.payer_info?.payer_id || '',
            })
          }
        }
      }
    }
    
    nextId = data.next_id || null
    pageCount++
  } while (nextId && pageCount < maxPages)
  
  return transactions
}

async function fetchFromTransactionSearchAPI(base: string, accessToken: string, customStart?: string, customEnd?: string): Promise<any[]> {
  const allTransactions: any[] = []
  const maxPages = 10
  
  const batchRanges: { start: string, end: string }[] = []
  
  if (customStart && customEnd) {
    const start = new Date(customStart + 'T00:00:00Z')
    const end = new Date(customEnd + 'T23:59:59Z')
    const diffDays = Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000))
    
    if (diffDays <= 31) {
      batchRanges.push({
        start: customStart,
        end: customEnd,
      })
    } else {
      const totalBatches = Math.ceil(diffDays / 30)
      for (let i = 0; i < totalBatches; i++) {
        const batchStart = new Date(start.getTime() + i * 30 * 24 * 60 * 60 * 1000)
        const batchEnd = new Date(Math.min(
          start.getTime() + (i + 1) * 30 * 24 * 60 * 60 * 1000 - 1,
          end.getTime()
        ))
        if (batchStart <= end) {
          batchRanges.push({
            start: batchStart.toISOString().split('T')[0],
            end: batchEnd.toISOString().split('T')[0],
          })
        }
      }
    }
  } else {
    const now = new Date()
    for (let i = 0; i < 3; i++) {
      const end = new Date(now.getTime() - i * 30 * 24 * 60 * 60 * 1000)
      const start = new Date(now.getTime() - (i + 1) * 30 * 24 * 60 * 60 * 1000)
      batchRanges.push({
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0],
      })
    }
  }
  
  for (const range of batchRanges) {
    let page = 1
    do {
      const txnRes = await fetch(
        `${base}/v1/reporting/transactions?start_date=${range.start}T00:00:00Z&end_date=${range.end}T23:59:59Z&fields=all&page_size=100&page=${page}`,
        {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          signal: AbortSignal.timeout(15000),
        }
      )
      
      if (!txnRes.ok) {
        const errData = await txnRes.json().catch(() => ({}))
        console.log(`Transaction Search API error for range ${range.start} to ${range.end}:`, errData.message || 'Unknown')
        continue
      }
      
      const txnData = await txnRes.json()
      
      if (txnData.transaction_details && txnData.transaction_details.length > 0) {
        for (const t of txnData.transaction_details) {
          const info = t.transaction_info || {}
          const payer = t.payer_info || {}
          const amount = parseFloat(info.transaction_amount?.value || "0")
          const fee = Math.abs(parseFloat(info.fee_amount?.value || "0"))
          
          allTransactions.push({
            id: info.transaction_id,
            transactionId: info.transaction_id,
            captureId: info.transaction_id,
            orderId: info.custom_field || info.invoice_id || '',
            amount,
            fee,
            netAmount: amount - fee,
            currency: info.transaction_amount?.currency_code || 'USD',
            status: info.transaction_status === 'S' ? 'COMPLETED' : info.transaction_status,
            createdAt: info.transaction_initiation_date,
            updatedAt: info.transaction_updated_date || info.transaction_initiation_date,
            customField: info.custom_field || '',
            invoiceId: info.invoice_id || '',
            payerEmail: payer.email_address || '',
            payerName: payer.payer_name?.given_name 
              ? `${payer.payer_name.given_name} ${payer.payer_name.surname || ''}`.trim() 
              : '',
            payerId: payer.payer_id || '',
          })
        }
      }
      
      if (page >= (txnData.total_pages || 1)) break
      page++
    } while (page <= maxPages)
  }
  
  const uniqueMap = new Map<string, any>()
  for (const t of allTransactions) {
    if (!uniqueMap.has(t.transactionId)) {
      uniqueMap.set(t.transactionId, t)
    }
  }
  
  return Array.from(uniqueMap.values())
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
  
  let paypalTransactions = getAllPayPalTransactions()
  
  if (startDate && endDate) {
    const start = new Date(startDate + 'T00:00:00Z').getTime()
    const end = new Date(endDate + 'T23:59:59Z').getTime()
    paypalTransactions = paypalTransactions.filter((t: any) => {
      const txTime = new Date(t.createdAt).getTime()
      return txTime >= start && txTime <= end
    })
  }
  
  if (status && status !== 'all') {
    paypalTransactions = paypalTransactions.filter((t: any) => {
      if (status === 'completed') return t.status === 'COMPLETED'
      if (status === 'refunded') return t.status === 'REFUNDED'
      if (status === 'unmatched') return !t.matchedOrderId
      return true
    })
  }
  
  const stats = paypalTransactions.reduce((acc: any, t: any) => {
    acc.totalAmount += t.amount || 0
    acc.totalFees += t.fee || 0
    acc.totalNet += t.netAmount || (t.amount || 0)
    acc.count++
    if (t.status === 'COMPLETED') acc.completed++
    if (t.status === 'REFUNDED') acc.refunded++
    if (!t.matchedOrderId) acc.unmatched++
    return acc
  }, { totalAmount: 0, totalFees: 0, totalNet: 0, count: 0, completed: 0, refunded: 0, unmatched: 0 })

  const enrichedTransactions = paypalTransactions.map((t: any) => {
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
    source: 'paypal',
  })
}

export async function POST(req: NextRequest) {
  const auth = requirePermission(req, 'finance_manage')
  if ('error' in auth) return auth.error

  try {
    const body = await req.json()
    const action = body.action || ""

    const accessToken = await getPayPalAccessToken()
    if (!accessToken) {
      return NextResponse.json({ error: "PayPal not properly configured. Please check Client ID and Secret." }, { status: 400 })
    }

    if (action === "pull_from_paypal") {
      const repo = getRepository()
      const config = getPayPalConfig()
      
      try {
        const totalTimeout = setTimeout(() => {
          throw new Error("Pull from PayPal timed out after 60 seconds")
        }, 60000)
        
        const allOrders = repo.orders.list()
        
        let allTransactions: any[] = []
        let apiMethod = 'transaction_search'
        const customStart = body.startDate
        const customEnd = body.endDate
        
        try {
          allTransactions = await fetchFromTransactionSearchAPI(config.base, accessToken, customStart, customEnd)
          apiMethod = 'transaction_search'
          if (allTransactions.length === 0) {
            console.log("Transaction Search API returned 0 results, trying Payments API...")
            try {
              const payments = await fetchFromPaymentsAPI(config.base, accessToken)
              if (payments.length > 0) {
                allTransactions = payments
                apiMethod = 'payments'
              }
            } catch (paymentsErr: any) {
              console.log("Payments API also failed:", paymentsErr.message)
            }
          }
        } catch (txnErr: any) {
          console.log("Transaction Search API failed, trying Payments API:", txnErr.message)
          try {
            allTransactions = await fetchFromPaymentsAPI(config.base, accessToken)
            apiMethod = 'payments'
          } catch (paymentsErr: any) {
            clearTimeout(totalTimeout)
            return NextResponse.json(
              { 
                error: `Both PayPal APIs failed. Transaction Search API: ${txnErr.message}. Payments API: ${paymentsErr.message}`,
                transactionSearchError: txnErr.message,
                paymentsError: paymentsErr.message,
              },
              { status: 400 }
            )
          }
        }
        
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
            o.paypalTransaction?.transactionId === txnId ||
            o.paypalTransaction?.captureId === txnId ||
            o.paypalTransaction?.orderId === txnId ||
            o.id === customField ||
            o.id === invoiceId
          )
          
          if (!matchedOrder && amount > 0) {
            const matchedByAmount = allOrders.filter((o: any) =>
              !o.paypalTransaction?.transactionId &&
              Math.abs(o.total - amount) < 0.01 &&
              o.paymentMethod === 'paypal'
            )
            if (matchedByAmount.length === 1) {
              matchedOrder = matchedByAmount[0]
            }
          }
          
          const isCompleted = txn.status === 'COMPLETED' || txn.status === 'S'
          const txData = {
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
              paypalTransaction: {
                ...(matchedOrder.paypalTransaction || {}),
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
        
        const syncResult = syncPayPalTransactions(allTxnData)
        
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
        console.error("Pull from PayPal error:", err)
        return NextResponse.json(
          { error: "Failed to pull transactions: " + (err as Error).message },
          { status: 400 }
        )
      }
    }

    if (action === "sync_all") {
      const repo = getRepository()
      const allOrders = repo.orders.list()
      const paypalOrders = allOrders.filter((o: any) => 
        o.paymentMethod === 'paypal' && o.paypalTransaction?.captureId
      )
      
      const updatedOrders: any[] = []
      
      for (const order of paypalOrders) {
        try {
          const captureId = order.paypalTransaction?.captureId
          if (!captureId) continue
          const response = await fetch(`${getPayPalConfig().base}/v2/payments/captures/${captureId}`, {
            method: "GET",
            headers: {
              "Authorization": `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            signal: AbortSignal.timeout(30000),
          })
          
          const captureData = await response.json()
          
          if (response.ok) {
            const updatedTransaction = {
              ...(order.paypalTransaction || {}),
              status: captureData.status,
              amount: parseFloat(captureData.amount?.value || order.total),
              fee: parseFloat(captureData.seller_receivable_breakdown?.paypal_fee?.value || "0"),
              netAmount: parseFloat(captureData.seller_receivable_breakdown?.gross_amount?.value || order.total) - parseFloat(captureData.seller_receivable_breakdown?.paypal_fee?.value || "0"),
              settlementStatus: captureData.status === 'COMPLETED' ? 'settled' : 'pending',
              settlementDate: captureData.status === 'COMPLETED' ? new Date().toISOString() : undefined,
              updatedAt: new Date().toISOString(),
            }
            
            repo.orders.update(order.id, {
              paypalTransaction: updatedTransaction as any,
            })
            
            updatedOrders.push(order.id)
          }
        } catch {
          continue
        }
      }
      
      return NextResponse.json({
        success: true,
        updatedOrders: updatedOrders.length,
        totalOrders: paypalOrders.length,
      })
    }

    if (action === "sync" && body.orderId) {
      const repo = getRepository()
      const order = repo.orders.getById(body.orderId)
      if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 })

      const captureId = order.paypalTransaction?.captureId
      if (!captureId) return NextResponse.json({ error: "No capture ID found for order" }, { status: 400 })

      const response = await fetch(`${getPayPalConfig().base}/v2/payments/captures/${captureId}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(30000),
      })

      const captureData = await response.json()

      if (response.ok) {
        const updatedTransaction = {
          ...(order.paypalTransaction || {}),
          status: captureData.status,
          amount: parseFloat(captureData.amount?.value || order.total),
          fee: parseFloat(captureData.seller_receivable_breakdown?.paypal_fee?.value || "0"),
          netAmount: parseFloat(captureData.seller_receivable_breakdown?.gross_amount?.value || order.total) - parseFloat(captureData.seller_receivable_breakdown?.paypal_fee?.value || "0"),
          updatedAt: new Date().toISOString(),
        }

        const updated = repo.orders.update(order.id, {
          paypalTransaction: updatedTransaction as any,
        })

        return NextResponse.json({ success: true, order: updated })
      } else {
        return NextResponse.json(
          { error: captureData.message || "Sync failed", details: captureData },
          { status: response.status }
        )
      }
    }

    if (action === "refund" && body.orderId) {
      const repo = getRepository()
      const order = repo.orders.getById(body.orderId)
      if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 })

      const captureId = order.paypalTransaction?.captureId
      if (!captureId) return NextResponse.json({ error: "No capture ID found for order" }, { status: 400 })

      const refundAmountValue = body.amount || order.total

      const response = await fetch(`${getPayPalConfig().base}/v2/payments/captures/${captureId}/refund`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "PayPal-Request-Id": `refund-${body.orderId}-${Date.now()}`,
        },
        body: JSON.stringify({
          amount: {
            value: refundAmountValue.toFixed(2),
            currency_code: order.currency || "USD",
          },
          note_to_payer: body.note || "Refund for return",
        }),
        signal: AbortSignal.timeout(30000),
      })

      const refundData = await response.json()

      if (response.ok) {
        const updatedTransaction = {
          ...(order.paypalTransaction || {}),
          status: "REFUNDED" as const,
          refundId: refundData.id,
          refundAmount: refundAmountValue,
          updatedAt: new Date().toISOString(),
        }

        const updated = repo.orders.update(order.id, {
          status: "refunded",
          paypalTransaction: updatedTransaction as any,
          returnInfo: {
            ...(order.returnInfo || { reason: "Refund processed", requestedAt: new Date().toISOString() }),
            refundedAt: new Date().toISOString(),
            refundAmount: refundAmountValue,
          },
          statusHistory: [
            ...(order.statusHistory || []),
            { status: "refunded", timestamp: new Date().toISOString(), note: body.note || "Refund processed via PayPal" },
          ],
        })

        return NextResponse.json({ success: true, refund: refundData, order: updated })
      } else {
        return NextResponse.json(
          { error: refundData.message || "Refund failed", details: refundData },
          { status: response.status }
        )
      }
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 })
  } catch (err) {
    console.error("[PayPal Transactions API] Error:", err)
    return NextResponse.json(
      { error: "PayPal operation failed: " + (err as Error).message },
      { status: 400 }
    )
  }
}