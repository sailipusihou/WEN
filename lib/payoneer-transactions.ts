import fs from 'fs'
import path from 'path'

export interface PayoneerTransaction {
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
const FILE = path.join(DATA_DIR, 'payoneer-transactions.json')

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }
}

function readTransactions(): PayoneerTransaction[] {
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

function writeTransactions(transactions: PayoneerTransaction[]) {
  ensureDir()
  fs.writeFileSync(FILE, JSON.stringify(transactions, null, 2), 'utf-8')
}

export function getAllPayoneerTransactions(): PayoneerTransaction[] {
  return readTransactions()
}

export function getPayoneerTransactionById(id: string): PayoneerTransaction | undefined {
  return readTransactions().find(t => t.id === id || t.transactionId === id)
}

export function addPayoneerTransaction(transaction: Omit<PayoneerTransaction, 'id'>): PayoneerTransaction {
  const transactions = readTransactions()
  const existing = transactions.find(t => t.transactionId === transaction.transactionId)
  if (existing) {
    return existing
  }
  const newTransaction: PayoneerTransaction = {
    ...transaction,
    id: `PYN-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
  }
  transactions.push(newTransaction)
  writeTransactions(transactions)
  return newTransaction
}

export function updatePayoneerTransaction(id: string, updates: Partial<PayoneerTransaction>): PayoneerTransaction | null {
  const transactions = readTransactions()
  const index = transactions.findIndex(t => t.id === id || t.transactionId === id)
  if (index === -1) return null
  transactions[index] = { ...transactions[index], ...updates }
  writeTransactions(transactions)
  return transactions[index]
}

export function addOrUpdatePayoneerTransaction(transaction: Omit<PayoneerTransaction, 'id'>): PayoneerTransaction {
  const transactions = readTransactions()
  const existingIndex = transactions.findIndex(t => t.transactionId === transaction.transactionId)
  
  if (existingIndex !== -1) {
    transactions[existingIndex] = { ...transactions[existingIndex], ...transaction }
    writeTransactions(transactions)
    return transactions[existingIndex]
  }
  
  const newTransaction: PayoneerTransaction = {
    ...transaction,
    id: `PYN-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
  }
  transactions.push(newTransaction)
  writeTransactions(transactions)
  return newTransaction
}

export function syncPayoneerTransactions(transactions: Omit<PayoneerTransaction, 'id'>[]): { added: number; updated: number } {
  const existing = readTransactions()
  let added = 0
  let updated = 0
  
  for (const txn of transactions) {
    const existingIndex = existing.findIndex(t => t.transactionId === txn.transactionId)
    if (existingIndex !== -1) {
      existing[existingIndex] = { ...existing[existingIndex], ...txn }
      updated++
    } else {
      existing.push({
        ...txn,
        id: `PYN-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
      })
      added++
    }
  }
  
  writeTransactions(existing)
  // 修复 L3: 移除恒为 0 的 skipped 字段
  return { added, updated }
}

export function deletePayoneerTransaction(id: string): boolean {
  const transactions = readTransactions()
  const before = transactions.length
  const filtered = transactions.filter(t => t.id !== id && t.transactionId !== id)
  writeTransactions(filtered)
  return filtered.length < before
}

export function clearPayoneerTransactions() {
  writeTransactions([])
}