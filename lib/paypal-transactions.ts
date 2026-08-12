import fs from 'fs'
import path from 'path'

export interface PayPalTransaction {
  id: string
  transactionId: string
  captureId: string
  orderId: string
  amount: number
  fee: number
  netAmount: number
  currency: string
  status: 'COMPLETED' | 'REFUNDED' | 'PARTIALLY_REFUNDED' | 'FAILED' | 'PENDING' | string
  createdAt: string
  updatedAt: string
  settlementStatus?: 'pending' | 'settled'
  settlementDate?: string
  payerEmail: string
  payerName: string
  payerId: string
  matchedOrderId?: string
  customField?: string
  invoiceId?: string
  rawData?: any
}

const DATA_DIR = path.join(process.cwd(), 'data')
const FILE = path.join(DATA_DIR, 'paypal-transactions.json')

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }
}

function readTransactions(): PayPalTransaction[] {
  ensureDir()
  if (!fs.existsSync(FILE)) {
    fs.writeFileSync(FILE, JSON.stringify([], null, 2), 'utf-8')
    return []
  }
  try {
    const content = fs.readFileSync(FILE, 'utf-8')
    const data = content.replace(/^\uFEFF/, '')
    return JSON.parse(data)
  } catch {
    return []
  }
}

function writeTransactions(transactions: PayPalTransaction[]) {
  ensureDir()
  fs.writeFileSync(FILE, JSON.stringify(transactions, null, 2), 'utf-8')
}

export function getAllPayPalTransactions(): PayPalTransaction[] {
  return readTransactions()
}

export function getPayPalTransactionById(id: string): PayPalTransaction | undefined {
  return readTransactions().find(t => t.id === id || t.transactionId === id)
}

export function addPayPalTransaction(transaction: Omit<PayPalTransaction, 'id'>): PayPalTransaction {
  const transactions = readTransactions()
  const existing = transactions.find(t => t.transactionId === transaction.transactionId)
  if (existing) {
    return existing
  }
  const newTransaction: PayPalTransaction = {
    ...transaction,
    id: `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
  }
  transactions.push(newTransaction)
  writeTransactions(transactions)
  return newTransaction
}

export function updatePayPalTransaction(id: string, updates: Partial<PayPalTransaction>): PayPalTransaction | null {
  const transactions = readTransactions()
  const index = transactions.findIndex(t => t.id === id || t.transactionId === id)
  if (index === -1) return null
  transactions[index] = { ...transactions[index], ...updates }
  writeTransactions(transactions)
  return transactions[index]
}

export function addOrUpdatePayPalTransaction(transaction: Omit<PayPalTransaction, 'id'>): PayPalTransaction {
  const transactions = readTransactions()
  const existingIndex = transactions.findIndex(t => t.transactionId === transaction.transactionId)
  
  if (existingIndex !== -1) {
    transactions[existingIndex] = { ...transactions[existingIndex], ...transaction }
    writeTransactions(transactions)
    return transactions[existingIndex]
  }
  
  const newTransaction: PayPalTransaction = {
    ...transaction,
    id: `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
  }
  transactions.push(newTransaction)
  writeTransactions(transactions)
  return newTransaction
}

export function syncPayPalTransactions(transactions: Omit<PayPalTransaction, 'id'>[]): { added: number; updated: number; skipped: number } {
  const existing = readTransactions()
  let added = 0
  let updated = 0
  let skipped = 0
  
  for (const txn of transactions) {
    const existingIndex = existing.findIndex(t => t.transactionId === txn.transactionId)
    if (existingIndex !== -1) {
      existing[existingIndex] = { ...existing[existingIndex], ...txn }
      updated++
    } else {
      existing.push({
        ...txn,
        id: `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
      })
      added++
    }
  }
  
  writeTransactions(existing)
  return { added, updated, skipped }
}

export function deletePayPalTransaction(id: string): boolean {
  const transactions = readTransactions()
  const before = transactions.length
  const filtered = transactions.filter(t => t.id !== id && t.transactionId !== id)
  writeTransactions(filtered)
  return filtered.length < before
}

export function clearPayPalTransactions() {
  writeTransactions([])
}