import type { Invoice, Notification, Product, RecentTransaction, RevenueData, TopProduct } from '@/lib/types'
import { getStockStatus } from '@/lib/utils/format'

export const DEFAULT_PRODUCT_CATEGORIES: string[] = []

export const getProductCategories = (products: Product[] = [], savedCategories: string[] = []) => {
  const categories = new Set<string>()

  savedCategories.forEach((category) => {
    const trimmed = category.trim()
    if (trimmed) categories.add(trimmed)
  })

  products.forEach((product) => {
    if (product.category?.trim()) categories.add(product.category.trim())
  })

  return Array.from(categories).sort((a, b) => a.localeCompare(b))
}

const isInvoiceOverdue = (invoice: Invoice) =>
  invoice.status === 'overdue' || (invoice.status === 'pending' && new Date(invoice.dueDate) < new Date())

export const buildNotifications = (products: Product[] = [], invoices: Invoice[] = []): Notification[] => {
  const now = new Date()
  const notifications: Notification[] = []

  products.forEach((product) => {
    const stockStatus = getStockStatus(product.quantity, product.reorderLevel)
    if (stockStatus === 'out_of_stock') {
      notifications.push({
        id: `product-out-${product.id}`,
        type: 'error',
        title: 'Product out of stock',
        message: `${product.name} has no units left.`,
        read: false,
        createdAt: product.updatedAt || now.toISOString(),
      })
    } else if (stockStatus === 'low_stock') {
      notifications.push({
        id: `product-low-${product.id}`,
        type: 'warning',
        title: 'Low stock alert',
        message: `${product.name} has ${product.quantity} units left. Reorder level is ${product.reorderLevel}.`,
        read: false,
        createdAt: product.updatedAt || now.toISOString(),
      })
    }
  })

  invoices.forEach((invoice) => {
    if (isInvoiceOverdue(invoice)) {
      notifications.push({
        id: `invoice-overdue-${invoice.id}`,
        type: 'error',
        title: 'Invoice overdue',
        message: `${invoice.invoiceNumber} for ${invoice.customerName || 'customer'} is overdue.`,
        read: false,
        createdAt: invoice.dueDate || invoice.createdAt || now.toISOString(),
      })
    } else if (invoice.status === 'pending') {
      notifications.push({
        id: `invoice-pending-${invoice.id}`,
        type: 'info',
        title: 'Invoice pending',
        message: `${invoice.invoiceNumber} is pending payment.`,
        read: false,
        createdAt: invoice.createdAt || now.toISOString(),
      })
    }
  })

  if (notifications.length === 0 && (products.length > 0 || invoices.length > 0)) {
    notifications.push({
      id: 'all-clear',
      type: 'success',
      title: 'All clear',
      message: 'No urgent inventory or invoice alerts right now.',
      read: true,
      createdAt: now.toISOString(),
    })
  }

  return notifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

export const buildRecentTransactions = (invoices: Invoice[] = [], limit = 6): RecentTransaction[] =>
  invoices
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit)
    .map((invoice) => ({
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      customerName: invoice.customerName || 'Walk-in customer',
      amount: invoice.total,
      status: invoice.status,
      date: invoice.createdAt,
    }))

export const buildTopProducts = (invoices: Invoice[] = [], limit = 5): TopProduct[] => {
  const byProduct = new Map<string, TopProduct>()

  invoices.forEach((invoice) => {
    if (invoice.status === 'cancelled') return
    invoice.items.forEach((item) => {
      const key = item.productId || item.productSku || item.productName
      if (!byProduct.has(key)) {
        byProduct.set(key, {
          id: key,
          name: item.productName,
          sku: item.productSku,
          sales: 0,
          revenue: 0,
        })
      }
      const existing = byProduct.get(key)!
      existing.sales += item.quantity
      existing.revenue += item.total || item.quantity * item.unitPrice
    })
  })

  return Array.from(byProduct.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit)
}

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate())

const getWeekKey = (date: Date) => {
  const firstDay = startOfDay(date)
  firstDay.setDate(firstDay.getDate() - firstDay.getDay())
  return firstDay.toISOString().slice(0, 10)
}

const getMonthKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

export const buildRevenueSeries = (invoices: Invoice[] = [], range: 'daily' | 'weekly' | 'monthly'): RevenueData[] => {
  const map = new Map<string, RevenueData>()

  invoices.forEach((invoice) => {
    if (invoice.status === 'cancelled') return
    const invoiceDate = new Date(invoice.createdAt)
    if (Number.isNaN(invoiceDate.getTime())) return

    const key = range === 'daily'
      ? invoiceDate.toISOString().slice(0, 10)
      : range === 'weekly'
        ? getWeekKey(invoiceDate)
        : getMonthKey(invoiceDate)

    if (!map.has(key)) map.set(key, { date: key, revenue: 0, orders: 0 })
    const entry = map.get(key)!
    entry.revenue += invoice.total
    entry.orders += 1
  })

  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date))
}
