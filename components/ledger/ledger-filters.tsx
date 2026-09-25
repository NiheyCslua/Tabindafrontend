import { Search } from 'lucide-react'

import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { LedgerSortOrder, LedgerTypeFilter } from '@/lib/utils/ledger'

interface LedgerFiltersProps {
  search: string
  onSearchChange: (value: string) => void
  typeFilter: LedgerTypeFilter
  onTypeFilterChange: (value: LedgerTypeFilter) => void
  sortOrder: LedgerSortOrder
  onSortOrderChange: (value: LedgerSortOrder) => void
}

export function LedgerFilters({
  search,
  onSearchChange,
  typeFilter,
  onTypeFilterChange,
  sortOrder,
  onSortOrderChange,
}: LedgerFiltersProps) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border bg-card p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
      <div className="relative min-w-0 flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search invoice, bill, customer, vendor, amount, status..."
          className="pl-9"
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Select
          value={typeFilter}
          onValueChange={(value) => onTypeFilterChange(value as LedgerTypeFilter)}
        >
          <SelectTrigger className="w-full sm:w-[190px]">
            <SelectValue placeholder="Entry type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Entries</SelectItem>
            <SelectItem value="debit">Debit Only</SelectItem>
            <SelectItem value="credit">Credit Only</SelectItem>
            <SelectItem value="customer_invoice">Customer Invoices</SelectItem>
            <SelectItem value="vendor_bill">Vendor Bills</SelectItem>
            <SelectItem value="misc_expense">Misc. Expenses</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={sortOrder}
          onValueChange={(value) => onSortOrderChange(value as LedgerSortOrder)}
        >
          <SelectTrigger className="w-full sm:w-[170px]">
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest First</SelectItem>
            <SelectItem value="oldest">Oldest First</SelectItem>
            <SelectItem value="amount_high">Amount High</SelectItem>
            <SelectItem value="amount_low">Amount Low</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
