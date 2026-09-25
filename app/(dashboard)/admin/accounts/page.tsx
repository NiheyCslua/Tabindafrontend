'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Landmark, Plus, Wallet, Banknote, PiggyBank } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { useFinancialAccountsStore } from '@/lib/store/financial-accounts-store'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import type { ChartOfAccountsEntry, FinancialAccountType } from '@/lib/types'

const typeIcon: Record<FinancialAccountType, React.ElementType> = {
  CASH: Wallet,
  BANK: Landmark,
  MOBILE_WALLET: Banknote,
}

const typeLabel: Record<FinancialAccountType, string> = {
  CASH: 'Cash',
  BANK: 'Bank',
  MOBILE_WALLET: 'Mobile Wallet',
}

// ── New Account form ─────────────────────────────────────────────────────────

const accountSchema = z.object({
  name: z.string().trim().min(1, 'Account name is required'),
  type: z.enum(['CASH', 'BANK', 'MOBILE_WALLET'], { required_error: 'Type is required' }),
  description: z.string().optional(),
})

function NewAccountDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { createAccount, fetchChartOfAccounts } = useFinancialAccountsStore()
  const [submitError, setSubmitError] = useState<string | null>(null)

  const form = useForm<z.infer<typeof accountSchema>>({
    resolver: zodResolver(accountSchema),
    defaultValues: { name: '', type: 'BANK', description: '' },
  })

  const handleSubmit = async (values: z.infer<typeof accountSchema>) => {
    setSubmitError(null)
    try {
      await createAccount(values)
      await fetchChartOfAccounts()
      form.reset({ name: '', type: 'BANK', description: '' })
      onOpenChange(false)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to create account')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>New Financial Account</DialogTitle></DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl><Input placeholder="e.g. UBL" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="type" render={({ field }) => (
              <FormItem>
                <FormLabel>Type</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="CASH">Cash</SelectItem>
                    <SelectItem value="BANK">Bank</SelectItem>
                    <SelectItem value="MOBILE_WALLET">Mobile Wallet</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                <FormLabel>Description <span className="text-xs text-muted-foreground font-normal">(optional)</span></FormLabel>
                <FormControl><Textarea rows={2} className="resize-none" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            {submitError && <p className="text-sm text-destructive">{submitError}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>Create Account</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

// ── Set Opening Balance (Change 10) ─────────────────────────────────────────

const openingBalanceSchema = z.object({
  openingBalance: z.coerce.number(),
  openingBalanceDate: z.string().min(1, 'Date is required'),
})

function OpeningBalanceDialog({
  account, open, onOpenChange,
}: { account: ChartOfAccountsEntry | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { setOpeningBalance } = useFinancialAccountsStore()
  const [submitError, setSubmitError] = useState<string | null>(null)

  const form = useForm<z.infer<typeof openingBalanceSchema>>({
    resolver: zodResolver(openingBalanceSchema),
    values: {
      openingBalance: account?.openingBalance ?? 0,
      openingBalanceDate: account?.openingBalanceDate?.slice(0, 10) || new Date().toISOString().split('T')[0],
    },
  })

  if (!account) return null

  const handleSubmit = async (values: z.infer<typeof openingBalanceSchema>) => {
    setSubmitError(null)
    try {
      await setOpeningBalance(account.id, values)
      onOpenChange(false)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to update opening balance')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Set Opening Balance — {account.name}</DialogTitle></DialogHeader>
        <p className="text-xs text-muted-foreground -mt-2">
          For migrating existing balances from another system. This does not create a
          transaction — it only changes the starting point future balances are calculated from.
        </p>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField control={form.control} name="openingBalance" render={({ field }) => (
              <FormItem>
                <FormLabel>Opening Balance</FormLabel>
                <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="openingBalanceDate" render={({ field }) => (
              <FormItem>
                <FormLabel>Opening Balance Date</FormLabel>
                <FormControl><Input type="date" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            {submitError && <p className="text-sm text-destructive">{submitError}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>Save</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function ChartOfAccountsPage() {
  const { chartOfAccounts, isLoading, error, fetchChartOfAccounts } = useFinancialAccountsStore()
  const [newAccountOpen, setNewAccountOpen] = useState(false)
  const [openingBalanceTarget, setOpeningBalanceTarget] = useState<ChartOfAccountsEntry | null>(null)

  useEffect(() => { fetchChartOfAccounts() }, [fetchChartOfAccounts])

  const totalBalance = useMemo(
    () => chartOfAccounts.reduce((sum, a) => sum + a.currentBalance, 0),
    [chartOfAccounts]
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Chart of Accounts</h1>
          <p className="text-muted-foreground text-sm">
            Every cash, bank and mobile wallet balance in one place. Balances are calculated live —
            opening balance plus money in, minus money out.
          </p>
        </div>
        <Button onClick={() => setNewAccountOpen(true)} className="gap-1.5">
          <Plus className="h-4 w-4" /> New Account
        </Button>
      </div>

      <Card>
        <CardContent className="pt-4 flex items-center gap-3">
          <PiggyBank className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Total Balance (all accounts)</p>
            <p className="text-xl font-bold tabular-nums">{formatCurrency(totalBalance)}</p>
          </div>
        </CardContent>
      </Card>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Card>
        <CardHeader><CardTitle className="text-base">Accounts</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Account</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Opening Balance</TableHead>
                <TableHead className="text-right">Money In</TableHead>
                <TableHead className="text-right">Money Out</TableHead>
                <TableHead className="text-right">Current Balance</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && chartOfAccounts.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="h-24 text-center text-muted-foreground">Loading…</TableCell></TableRow>
              ) : chartOfAccounts.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="h-24 text-center text-muted-foreground">No financial accounts yet.</TableCell></TableRow>
              ) : (
                chartOfAccounts.map((account) => {
                  const Icon = typeIcon[account.type]
                  return (
                    <TableRow key={account.id}>
                      <TableCell>
                        <Link href={`/admin/accounts/${account.id}`} className="flex items-center gap-2 font-medium hover:underline">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          {account.name}
                          {!account.isActive && <Badge variant="outline" className="ml-1">Inactive</Badge>}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{typeLabel[account.type]}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatCurrency(account.openingBalance)}</TableCell>
                      <TableCell className="text-right tabular-nums text-emerald-600">{formatCurrency(account.moneyIn)}</TableCell>
                      <TableCell className="text-right tabular-nums text-destructive">{formatCurrency(account.moneyOut)}</TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">{formatCurrency(account.currentBalance)}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" onClick={() => setOpeningBalanceTarget(account)}>
                          Set Opening Balance
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <NewAccountDialog open={newAccountOpen} onOpenChange={setNewAccountOpen} />
      <OpeningBalanceDialog
        account={openingBalanceTarget}
        open={!!openingBalanceTarget}
        onOpenChange={(open) => { if (!open) setOpeningBalanceTarget(null) }}
      />
    </div>
  )
}
