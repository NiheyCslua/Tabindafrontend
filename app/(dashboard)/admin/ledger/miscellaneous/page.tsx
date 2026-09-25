'use client'

import { useEffect, useMemo, useState, type ElementType } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  AlertCircle,
  CalendarDays,
  Edit,
  Plus,
  ReceiptText,
  Search,
  Tags,
  Trash2,
  WalletCards,
} from 'lucide-react'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useMiscLedgerStore } from '@/lib/store/misc-ledger-store'
import { useFinancialAccountsStore } from '@/lib/store/financial-accounts-store'
import { FinancialAccountSelect } from '@/components/financial-accounts/financial-account-select'
import { MISC_EXPENSE_LABELS } from '@/lib/config/misc-expense-labels'
import { methodNeedsFinancialAccount, CREDIT_CARD_ACCOUNTS } from '@/lib/config/payment-methods'
import type { CreateMiscLedgerEntryDTO, MiscLedgerEntry } from '@/lib/types'
import { formatCurrency, formatDate, formatPaymentMethod } from '@/lib/utils/format'

const formSchema = z.object({
  label: z.string().trim().min(1, 'Expense label is required'),
  amount: z.coerce.number().positive('Amount must be greater than zero'),
  date: z.string().min(1, 'Date is required'),
  description: z.string().optional(),
  paymentMethod: z.string().default('cash'),
  financialAccountId: z.string().optional(),
  referenceNumber: z.string().optional(),
  paymentDate: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

type SortOrder = 'newest' | 'oldest' | 'amount_high' | 'amount_low'

const today = () => new Date().toISOString().split('T')[0]

const cleanOptional = (value?: string) => {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

export default function MiscellaneousLedgerPage() {
  const {
    entries,
    fetchEntries,
    addEntry,
    updateEntry,
    deleteEntry,
    isLoading,
    error,
  } = useMiscLedgerStore()
  const { accounts, fetchAccounts } = useFinancialAccountsStore()

  const [formOpen, setFormOpen] = useState(false)
  const [selectedEntry, setSelectedEntry] = useState<MiscLedgerEntry | null>(null)
  const [entryToDelete, setEntryToDelete] = useState<MiscLedgerEntry | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [labelFilter, setLabelFilter] = useState('all')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest')

  useEffect(() => {
    fetchEntries().catch((err) => {
      setActionError(err instanceof Error ? err.message : 'Unable to load miscellaneous ledger')
    })
    fetchAccounts(true).catch(() => undefined)
  }, [fetchEntries, fetchAccounts])

  const accountNameById = useMemo(
    () => new Map(accounts.map((account) => [account.id, account.name])),
    [accounts]
  )

  const uniqueLabels = useMemo(() => {
    return Array.from(new Set(entries.map((entry) => entry.label).filter(Boolean))).sort((a, b) => a.localeCompare(b))
  }, [entries])

  const visibleEntries = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    const filtered = entries.filter((entry) => {
      const matchesLabel = labelFilter === 'all' || entry.label === labelFilter
      const matchesFrom = !fromDate || entry.date >= fromDate
      const matchesTo = !toDate || entry.date <= toDate
      const searchable = [
        entry.label,
        entry.description,
        entry.amount.toString(),
        entry.paymentMethod,
        entry.financialAccountId,
        entry.referenceNumber,
        entry.createdByName,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      const matchesSearch = !normalizedSearch || searchable.includes(normalizedSearch)
      return matchesLabel && matchesFrom && matchesTo && matchesSearch
    })

    return [...filtered].sort((a, b) => {
      if (sortOrder === 'oldest') return new Date(a.date).getTime() - new Date(b.date).getTime()
      if (sortOrder === 'amount_high') return b.amount - a.amount
      if (sortOrder === 'amount_low') return a.amount - b.amount
      return new Date(b.date).getTime() - new Date(a.date).getTime()
    })
  }, [entries, fromDate, labelFilter, search, sortOrder, toDate])

  const summary = useMemo(() => {
    const currentMonth = new Date().toISOString().slice(0, 7)
    const totalVisible = visibleEntries.reduce((sum, entry) => sum + entry.amount, 0)
    const monthTotal = entries
      .filter((entry) => entry.date.startsWith(currentMonth))
      .reduce((sum, entry) => sum + entry.amount, 0)

    return {
      totalVisible,
      monthTotal,
      labelsCount: uniqueLabels.length,
      visibleCount: visibleEntries.length,
    }
  }, [entries, uniqueLabels.length, visibleEntries])

  const handleAdd = () => {
    setSelectedEntry(null)
    setActionError(null)
    setFormOpen(true)
  }

  const handleEdit = (entry: MiscLedgerEntry) => {
    setSelectedEntry(entry)
    setActionError(null)
    setFormOpen(true)
  }

  const handleDelete = (entry: MiscLedgerEntry) => {
    setEntryToDelete(entry)
    setActionError(null)
    setDeleteDialogOpen(true)
  }

  const handleSubmit = async (data: CreateMiscLedgerEntryDTO) => {
    try {
      setActionError(null)
      if (selectedEntry) {
        await updateEntry(selectedEntry.id, data)
      } else {
        await addEntry(data)
      }
      setFormOpen(false)
      setSelectedEntry(null)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to save expense')
      throw err
    }
  }

  const confirmDelete = async () => {
    if (!entryToDelete) return
    try {
      setActionError(null)
      await deleteEntry(entryToDelete.id)
      setDeleteDialogOpen(false)
      setEntryToDelete(null)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to delete expense')
    }
  }

  if (isLoading && entries.length === 0) {
    return <div className="flex h-96 items-center justify-center text-muted-foreground">Loading miscellaneous ledger...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <ReceiptText className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">Miscellaneous Ledger</h1>
          </div>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="mr-2 h-4 w-4" />Add Expense
        </Button>
      </div>

      {(actionError || error) && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          <span>{actionError || error}</span>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard icon={WalletCards} label="Visible Expenses" value={formatCurrency(summary.totalVisible)} helper="Total of the current filters" />
        <SummaryCard icon={CalendarDays} label="This Month" value={formatCurrency(summary.monthTotal)} helper="All misc. expenses this month" />
        <SummaryCard icon={Tags} label="Labels" value={String(summary.labelsCount)} helper="Unique expense labels" />
        <SummaryCard icon={ReceiptText} label="Entries" value={String(summary.visibleCount)} helper={`${entries.length} total ledger entries`} />
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_180px_150px_150px_160px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search label, description, account, reference..."
                className="pl-9"
              />
            </div>

            <Select value={labelFilter} onValueChange={setLabelFilter}>
              <SelectTrigger><SelectValue placeholder="Label" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Labels</SelectItem>
                {uniqueLabels.map((label) => (
                  <SelectItem key={label} value={label}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
            <Input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} />

            <Select value={sortOrder} onValueChange={(value) => setSortOrder(value as SortOrder)}>
              <SelectTrigger><SelectValue placeholder="Sort" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="amount_high">Amount High</SelectItem>
                <SelectItem value="amount_low">Amount Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Label</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Added By</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleEntries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-28 text-center text-muted-foreground">
                      No miscellaneous expenses found.
                    </TableCell>
                  </TableRow>
                ) : (
                  visibleEntries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="whitespace-nowrap font-medium">{formatDate(entry.date)}</TableCell>
                      <TableCell><Badge variant="outline">{entry.label}</Badge></TableCell>
                      <TableCell className="min-w-[180px]">{entry.description || '-'}</TableCell>
                      <TableCell>{entry.paymentMethod ? formatPaymentMethod(entry.paymentMethod) : '-'}</TableCell>
                      <TableCell>{entry.financialAccountId ? (accountNameById.get(entry.financialAccountId) || entry.financialAccountId) : '-'}</TableCell>
                      <TableCell className="font-mono text-xs">{entry.referenceNumber || '-'}</TableCell>
                      <TableCell>{entry.createdByName || '-'}</TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">{formatCurrency(entry.amount)}</TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => handleEdit(entry)}>
                            <Edit className="mr-1.5 h-3.5 w-3.5" />Edit
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleDelete(entry)}>
                            <Trash2 className="mr-1.5 h-3.5 w-3.5" />Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <MiscExpenseForm
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) setSelectedEntry(null)
        }}
        entry={selectedEntry}
        onSubmit={handleSubmit}
        isLoading={isLoading}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete miscellaneous expense?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the {entryToDelete?.label} entry for {entryToDelete ? formatCurrency(entryToDelete.amount) : 'this amount'}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete Expense</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  helper,
}: {
  icon: ElementType
  label: string
  value: string
  helper: string
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tracking-tight">{value}</div>
        <p className="mt-1 text-xs text-muted-foreground">{helper}</p>
      </CardContent>
    </Card>
  )
}

function MiscExpenseForm({
  open,
  onOpenChange,
  entry,
  onSubmit,
  isLoading,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  entry?: MiscLedgerEntry | null
  onSubmit: (data: CreateMiscLedgerEntryDTO) => Promise<void>
  isLoading?: boolean
}) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      label: '',
      amount: 0,
      date: today(),
      description: '',
      paymentMethod: 'cash',
      financialAccountId: '',
      referenceNumber: '',
      paymentDate: '',
    },
  })

  const paymentMethod = form.watch('paymentMethod')
  const needsAccount = methodNeedsFinancialAccount(paymentMethod)

  useEffect(() => {
    if (!open) return
    form.reset({
      label: entry?.label || '',
      amount: entry?.amount || 0,
      date: entry?.date || today(),
      description: entry?.description || '',
      paymentMethod: entry?.paymentMethod || 'cash',
      financialAccountId: entry?.financialAccountId || '',
      referenceNumber: entry?.referenceNumber || '',
      paymentDate: entry?.paymentDate || '',
    })
  }, [entry, form, open])

  // Clear financial account when switching to Cash (no selector needed)
  useEffect(() => {
    if (!needsAccount) {
      form.setValue('financialAccountId', '')
    }
  }, [needsAccount, form])

  const handleSubmit = async (values: FormValues) => {
    if (values.paymentMethod === 'credit_card' && !values.financialAccountId) {
      form.setError('financialAccountId', { message: `Please select a card settlement account (${CREDIT_CARD_ACCOUNTS.join(', ')})` })
      return
    }
    await onSubmit({
      label: values.label.trim(),
      amount: Number(values.amount),
      date: values.date,
      description: cleanOptional(values.description),
      paymentMethod: values.paymentMethod || 'cash',
      financialAccountId: needsAccount ? cleanOptional(values.financialAccountId) : undefined,
      referenceNumber: cleanOptional(values.referenceNumber),
      paymentDate: cleanOptional(values.paymentDate),
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{entry ? 'Edit Expense' : 'Add Expense'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="label"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expense Label</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ''}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select expense category" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {MISC_EXPENSE_LABELS.map((label) => (
                          <SelectItem key={label} value={label}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <FormControl><Input type="number" min="1" step="0.01" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="paymentMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Method</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || 'cash'}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Payment method" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                        <SelectItem value="cheque">Cheque</SelectItem>
                        <SelectItem value="credit_card">Credit Card</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Financial Account selector — shown for every method except Cash,
                which maps automatically to "Cash on Hand" (Change 2). Uses the
                shared FinancialAccountSelect component (backed by real
                FinancialAccount records), the same selector used by Vendor
                Payments, Vendor Receipts and Invoices, so these transactions
                feed directly into Chart of Accounts. */}
            {needsAccount && (
              <FormField
                control={form.control}
                name="financialAccountId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {paymentMethod === 'credit_card' ? 'Card Settlement Account' : 'Financial Account'}
                    </FormLabel>
                    <FormControl>
                      <FinancialAccountSelect
                        value={field.value || ''}
                        onChange={field.onChange}
                        allowedNames={paymentMethod === 'credit_card' ? CREDIT_CARD_ACCOUNTS : undefined}
                        placeholder={paymentMethod === 'credit_card' ? 'Select card settlement account' : 'Select bank account'}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="referenceNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reference Number</FormLabel>
                    <FormControl><Input placeholder="Receipt or transaction no." {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="paymentDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Date</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl><Input placeholder="Short expense description" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={isLoading}>{entry ? 'Save Changes' : 'Add Expense'}</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
