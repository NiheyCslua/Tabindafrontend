import { format, formatDistanceToNow, parseISO } from 'date-fns'

// Currency formatting
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-PK', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}


// Number formatting with commas
export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num)
}

// Percentage formatting
export function formatPercentage(value: number, showSign = true): string {
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  }).format(value / 100)
  
  if (showSign && value > 0) {
    return `+${formatted}`
  }
  return formatted
}

// Date formatting
export function formatDate(dateString: string, formatStr = 'MMM dd, yyyy'): string {
  try {
    const date = parseISO(dateString)
    return format(date, formatStr)
  } catch {
    return dateString
  }
}

export function formatDateTime(dateString: string): string {
  return formatDate(dateString, 'MMM dd, yyyy h:mm a')
}

export function formatRelativeTime(dateString: string): string {
  try {
    const date = parseISO(dateString)
    return formatDistanceToNow(date, { addSuffix: true })
  } catch {
    return dateString
  }
}

// Phone number formatting
export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
  }
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`
  }
  return phone
}

// Stock status helpers
export function getStockStatus(quantity: number, reorderLevel: number): 'in_stock' | 'low_stock' | 'out_of_stock' {
  if (quantity === 0) return 'out_of_stock'
  if (quantity < reorderLevel) return 'low_stock'
  return 'in_stock'
}

export function getStockStatusLabel(status: 'in_stock' | 'low_stock' | 'out_of_stock'): string {
  switch (status) {
    case 'in_stock':
      return 'In Stock'
    case 'low_stock':
      return 'Low Stock'
    case 'out_of_stock':
      return 'Out of Stock'
  }
}

// Invoice status helpers
export function getInvoiceStatusColor(status: string): string {
  switch (status) {
    case 'paid':
      return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
    case 'pending':
    case 'unpaid':
      return 'bg-amber-500/10 text-amber-500 border-amber-500/20'
    case 'overdue':
      return 'bg-red-500/10 text-red-500 border-red-500/20'
    case 'cancelled':
      return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
    default:
      return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
  }
}

export function getBillStatusColor(status: string): string {
  switch (status) {
    case 'paid':
      return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
    case 'unpaid':
      return 'bg-amber-500/10 text-amber-500 border-amber-500/20'
    case 'partially_paid':
      return 'bg-blue-500/10 text-blue-500 border-blue-500/20'
    case 'overdue':
      return 'bg-red-500/10 text-red-500 border-red-500/20'
    case 'cancelled':
      return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
    default:
      return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
  }
}

export function formatInvoiceStatus(status: string): string {
  switch (status) {
    case 'paid':
      return 'Paid'
    case 'pending':
      return 'Pending'
    case 'overdue':
      return 'Overdue'
    case 'cancelled':
      return 'Cancelled'
    default:
      return status
        .split('_')
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ')
  }
}

export function formatPaymentMethod(method: string): string {
  if (typeof method !== 'string' || method.trim() === '') {
    return 'Unknown Payment Method'  // Fallback for non-string or empty values
  }

  switch (method) {
    case 'credit_card':
      return 'Credit Card'
    case 'bank_transfer':
      return 'Bank Transfer'
    case 'cash':
      return 'Cash'
    case 'cheque':
    case 'check': // legacy value from before payment methods were standardized on 'cheque'
      return 'Cheque'
    default:
      return method.split('_').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ')
  }
}

// Employee status helpers
export function getEmployeeStatusColor(status: string): string {
  switch (status) {
    case 'active':
      return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
    case 'inactive':
      return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
    case 'on_leave':
      return 'bg-amber-500/10 text-amber-500 border-amber-500/20'
    default:
      return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
  }
}

// Customer status helpers
export function getCustomerStatusColor(status: string): string {
  switch (status) {
    case 'active':
      return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
    case 'inactive':
      return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
    default:
      return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
  }
}

// Stock status color
export function getStockStatusColor(status: 'in_stock' | 'low_stock' | 'out_of_stock'): string {
  switch (status) {
    case 'in_stock':
      return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
    case 'low_stock':
      return 'bg-amber-500/10 text-amber-500 border-amber-500/20'
    case 'out_of_stock':
      return 'bg-red-500/10 text-red-500 border-red-500/20'
  }
}

// Truncate text
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength)}...`
}
