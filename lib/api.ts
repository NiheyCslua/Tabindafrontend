/**
 * Shared API client for the NestJS backend.
 *
 * Set NEXT_PUBLIC_API_URL in .env.local when the backend is not running on
 * http://localhost:5000.
 */

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ?? 'http://localhost:5000'

export const API_ENDPOINTS = {
  authLogin: '/auth/login',
  authMe: '/auth/me',
  customers: '/customers',
  products: '/inventory/products',
  productCategories: '/inventory/categories',
  invoices: '/invoices',
  vendors: '/vendors',
  bills: '/vendors/bills',
  vendorPayments: '/vendor-payments',
  vendorPaymentsUnpaid: '/vendor-payments/unpaid-bills',
  vendorReceipts: '/vendor-payments/receipts',
  vendorReceiptsUnpaid: '/vendor-payments/receipts/unpaid-debit-bills',
  vendorSummaries: '/vendor-payments/vendor-summaries',
  users: '/users',
  employees: '/employees',
  dashboardStats: '/dashboard/stats',
  serialUnits: '/serial-units',
  salaryAdvances: '/salary-advances',
  salaryPayments: '/salary-payments',
  employeeLedger: '/employee-ledger',
  miscLedger: '/misc-ledger',
  monthlyEarnings: '/reports/monthly-earnings',
  financialAccounts: '/financial-accounts',
  chartOfAccounts: '/financial-accounts/chart-of-accounts',
  invoiceTemplates: '/invoice-templates',
} as const

export function getStoredToken(): string | null {
  return typeof window !== 'undefined' ? localStorage.getItem('token') : null
}

export function setStoredToken(token: string | null) {
  if (typeof window === 'undefined') return
  if (token) localStorage.setItem('token', token)
  else localStorage.removeItem('token')
}

export async function api<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getStoredToken()
  const hasBody = options.body !== undefined && options.body !== null
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData

  const headers: HeadersInit = {
    ...(hasBody && !isFormData ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((options.headers as Record<string, string>) ?? {}),
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    // Invoice Terms & Conditions Persistence: default every API call to
    // bypass the browser's HTTP cache. Without this, a device that already
    // has a cached response for a given URL (e.g. GET /invoices/:id viewed
    // before an edit made on another device) can keep serving it instead of
    // hitting the network, which looks identical to a server-side
    // persistence bug. Callers can still override via `options.cache` if
    // they ever have a genuine reason to allow caching.
    cache: 'no-store',
    ...options,
    headers,
  })

  if (!res.ok) {
    let message = `API error ${res.status}`
    try {
      const body = await res.json()
      message = Array.isArray(body?.message)
        ? body.message.join(', ')
        : body?.message ?? body?.error ?? message
    } catch {
      // non-JSON error body — keep the default message
    }
    throw new Error(message)
  }

  if (res.status === 204) return undefined as T

  const text = await res.text()
  return (text ? JSON.parse(text) : undefined) as T
}
