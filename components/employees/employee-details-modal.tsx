"use client"

import { type ReactNode, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Mail, Phone, Briefcase, Building2, Calendar, DollarSign, Hash, Printer, Download, KeyRound, Eye, EyeOff } from 'lucide-react'
import type { Employee, EmployeeLedgerEntry, SalaryAdvance, SalaryPayment } from '@/lib/types'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import { buildEmployeeLedger, calculateSalaryPreview, formatSalaryPeriod, getPayrollStatusColor, statusLabel } from '@/lib/payroll/payroll-utils'
import { downloadSalarySlipPdf } from '@/lib/payroll/salary-slip-pdf'

interface EmployeeDetailsModalProps {
  employee: Employee | null
  open: boolean
  onOpenChange: (open: boolean) => void
  advances?: SalaryAdvance[]
  payments?: SalaryPayment[]
  ledgerEntries?: EmployeeLedgerEntry[]
  onAddAdvance?: (employee: Employee) => void
  onGenerateSalary?: (employee: Employee) => void
  onMarkSalaryPaid?: (payment: SalaryPayment) => void
  onCancelPayment?: (payment: SalaryPayment) => void
  onCancelAdvance?: (advance: SalaryAdvance) => void
}

export function EmployeeDetailsModal({
  employee,
  open,
  onOpenChange,
  advances = [],
  payments = [],
  ledgerEntries = [],
  onAddAdvance,
  onGenerateSalary,
  onMarkSalaryPaid,
  onCancelPayment,
  onCancelAdvance,
}: EmployeeDetailsModalProps) {
  if (!employee) return null

  const employeeAdvances = advances.filter(advance => advance.employeeId === employee.id)
  const employeePayments = payments.filter(payment => payment.employeeId === employee.id)
  const employeeLedger = buildEmployeeLedger(employee.id, payments, advances, ledgerEntries)
  const outstandingAdvance = employeeAdvances
    .filter(advance => advance.status !== 'cancelled')
    .reduce((sum, advance) => sum + advance.remainingAmount, 0)
  const paidPayments = employeePayments.filter(payment => payment.status === 'paid')
  const lastPayment = [...paidPayments].sort((a, b) => new Date(b.paymentDate || b.createdAt).getTime() - new Date(a.paymentDate || a.createdAt).getTime())[0]
  const totalPaid = paidPayments.reduce((sum, payment) => sum + payment.amountPaid, 0)
  const preview = calculateSalaryPreview(employee, advances)

  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

  const downloadSalarySlip = (payment: SalaryPayment) => downloadSalarySlipPdf({ employee, payment })

  const printSalarySlip = (payment: SalaryPayment) => {
    const slipWindow = window.open('', '_blank', 'width=800,height=900')
    if (!slipWindow) return
    slipWindow.document.write(`
      <html>
        <head>
          <title>Salary Slip - ${payment.paymentNumber}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 32px; color: #111; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #111; padding-bottom: 12px; margin-bottom: 24px; }
            h1 { margin: 0; font-size: 24px; }
            .muted { color: #555; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ccc; padding: 10px; text-align: left; }
            th { background: #f4f4f4; }
            .right { text-align: right; }
            .total { font-weight: bold; font-size: 18px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1>Tabinda Machinery</h1>
              <div class="muted">Employee Salary Slip</div>
            </div>
            <div class="right">
              <div><strong>${payment.paymentNumber}</strong></div>
              <div>${formatSalaryPeriod(payment.salaryPeriod)}</div>
            </div>
          </div>
          <p><strong>Employee:</strong> ${employee.name}</p>
          <p><strong>Role:</strong> ${employee.position}</p>
          <p><strong>Status:</strong> ${statusLabel(payment.status)}</p>
          <p><strong>Payment Date:</strong> ${payment.paymentDate ? formatDate(payment.paymentDate) : '-'}</p>
          <table>
            <tr><th>Description</th><th class="right">Amount</th></tr>
            <tr><td>Base Salary</td><td class="right">${formatCurrency(payment.baseSalary)}</td></tr>
            <tr><td>Bonus</td><td class="right">${formatCurrency(payment.bonus)}</td></tr>
            <tr><td>Other Deductions</td><td class="right">-${formatCurrency(payment.otherDeductions)}</td></tr>
            <tr><td>Advance Deduction</td><td class="right">-${formatCurrency(payment.advanceDeduction)}</td></tr>
            <tr class="total"><td>Net Salary</td><td class="right">${formatCurrency(payment.netPayable)}</td></tr>
          </table>
        </body>
      </html>
    `)
    slipWindow.document.close()
    slipWindow.focus()
    slipWindow.print()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-[90vh] max-w-5xl min-w-0 flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle className="text-xl font-semibold">Employee Details</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-5 overflow-y-auto min-h-0 min-w-0 flex-1 pt-1">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="h-14 w-14">
                <AvatarFallback className="text-base bg-primary/10 text-primary font-semibold">{getInitials(employee.name)}</AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-lg font-semibold text-foreground">{employee.name}</h2>
                <p className="text-sm text-muted-foreground">{employee.position}</p>
                <div className="mt-1 flex flex-wrap gap-2">
                  <Badge variant="outline" className="text-xs">{employee.employeeId}</Badge>
                  <Badge className={`border text-xs ${getPayrollStatusColor(employee.status)}`}>{statusLabel(employee.status)}</Badge>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {onAddAdvance && <Button variant="outline" onClick={() => onAddAdvance(employee)}>Add Advance</Button>}
              {onGenerateSalary && <Button onClick={() => onGenerateSalary(employee)}>Generate Salary</Button>}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <SummaryCard label="Base Salary" value={formatCurrency(employee.baseSalary ?? employee.salary)} />
            <SummaryCard label="Outstanding Advance" value={formatCurrency(outstandingAdvance)} tone={outstandingAdvance > 0 ? 'amber' : undefined} />
            <SummaryCard label="Last Salary Paid" value={lastPayment?.paymentDate ? formatDate(lastPayment.paymentDate) : '-'} />
            <SummaryCard label="Net Payable Preview" value={formatCurrency(preview.netPayable)} tone="blue" />
            <SummaryCard label="Total Paid To Date" value={formatCurrency(totalPaid)} tone="green" />
          </div>

          <Tabs defaultValue="profile" className="flex flex-col flex-1 min-h-0 min-w-0 gap-4">
            <TabsList className="grid w-full grid-cols-5 shrink-0">
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="salary">Salary</TabsTrigger>
              <TabsTrigger value="advances">Advances</TabsTrigger>
              <TabsTrigger value="payments">Payments</TabsTrigger>
              <TabsTrigger value="ledger">Ledger</TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="space-y-4 overflow-auto min-h-0 min-w-0">
              <Card>
                <CardHeader><CardTitle className="text-base">Profile</CardTitle></CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid gap-4 md:grid-cols-2">
                    <InfoRow icon={<Mail className="h-4 w-4" />} label="Email" value={employee.email || '-'} />
                    <InfoRow icon={<Phone className="h-4 w-4" />} label="Phone" value={employee.phone} />
                    <InfoRow icon={<Hash className="h-4 w-4" />} label="Employee ID" value={employee.employeeId} />
                    <InfoRow icon={<Building2 className="h-4 w-4" />} label="App Role" value={employee.role === 'no_app_access' ? 'No App Access' : employee.role.replace('_', ' ')} />
                    <InfoRow icon={<Briefcase className="h-4 w-4" />} label="Designation" value={employee.position} />
                    <InfoRow icon={<Hash className="h-4 w-4" />} label="CNIC Number" value={employee.cnic || '-'} />
                    <InfoRow icon={<Calendar className="h-4 w-4" />} label="Joining Date" value={formatDate(employee.joiningDate || employee.hireDate)} />
                    {employee.password && (
                      <PasswordRow password={employee.password} />
                    )}
                  </div>
                  {employee.address && <><Separator /><p className="text-sm"><span className="font-medium">Address:</span> {employee.address}</p></>}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="salary" className="space-y-4 overflow-auto min-h-0 min-w-0">
              <Card>
                <CardHeader><CardTitle className="text-base">Salary Profile</CardTitle></CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <InfoRow icon={<DollarSign className="h-4 w-4" />} label="Base Salary" value={formatCurrency(employee.baseSalary ?? employee.salary)} />
                  <InfoRow icon={<DollarSign className="h-4 w-4" />} label="Outstanding Advance" value={formatCurrency(outstandingAdvance)} />
                  <InfoRow icon={<DollarSign className="h-4 w-4" />} label="Suggested Advance Deduction" value={formatCurrency(preview.advanceDeduction)} />
                  <InfoRow icon={<DollarSign className="h-4 w-4" />} label="Gross Salary Preview" value={formatCurrency(preview.grossSalary)} />
                  <InfoRow icon={<DollarSign className="h-4 w-4" />} label="Net Payable Preview" value={formatCurrency(preview.netPayable)} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="advances" className="overflow-auto min-h-0 min-w-0">
              <Card>
                <CardHeader><CardTitle className="text-base">Advance History</CardTitle></CardHeader>
                <CardContent><AdvanceTable advances={employeeAdvances} onCancelAdvance={onCancelAdvance} /></CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="payments" className="overflow-auto min-h-0 min-w-0">
              <Card>
                <CardHeader><CardTitle className="text-base">Salary Payment History</CardTitle></CardHeader>
                <CardContent>
                  <PaymentsTable
                    payments={employeePayments}
                    onMarkSalaryPaid={onMarkSalaryPaid}
                    onCancelPayment={onCancelPayment}
                    onPrintSlip={printSalarySlip}
                    onDownloadSlip={downloadSalarySlip}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="ledger" className="overflow-auto min-h-0 min-w-0">
              <Card>
                <CardHeader><CardTitle className="text-base">Employee Salary Ledger</CardTitle></CardHeader>
                <CardContent><LedgerTable entries={employeeLedger} /></CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function SummaryCard({ label, value, tone }: { label: string; value: string; tone?: 'green' | 'amber' | 'blue' }) {
  const toneClass = tone === 'green' ? 'text-emerald-500' : tone === 'amber' ? 'text-amber-500' : tone === 'blue' ? 'text-blue-500' : ''
  return (
    <Card>
      <CardContent className="pt-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`mt-1 text-lg font-semibold tabular-nums ${toneClass}`}>{value}</p>
      </CardContent>
    </Card>
  )
}

function InfoRow({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5 text-sm">
      <span className="text-muted-foreground shrink-0">{icon}</span>
      <div>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="font-medium">{value}</div>
      </div>
    </div>
  )
}

function PasswordRow({ password }: { password: string }) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="flex items-center gap-2.5 text-sm">
      <span className="text-muted-foreground shrink-0"><KeyRound className="h-4 w-4" /></span>
      <div className="flex-1">
        <div className="text-xs text-muted-foreground">Password</div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="font-medium font-mono tracking-wider">
            {visible ? password : '••••••••'}
          </span>
          <button
            type="button"
            onClick={() => setVisible(v => !v)}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label={visible ? 'Hide password' : 'Show password'}
          >
            {visible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>
    </div>
  )
}

function AdvanceTable({ advances, onCancelAdvance }: { advances: SalaryAdvance[]; onCancelAdvance?: (advance: SalaryAdvance) => void }) {
  if (advances.length === 0) return <p className="py-6 text-center text-sm text-muted-foreground">No salary advances found.</p>
  return (
    <div className="rounded-md border overflow-auto">
      <Table>
        <TableHeader><TableRow><TableHead>Date</TableHead><TableHead className="text-right">Amount</TableHead><TableHead className="text-right">Deducted</TableHead><TableHead className="text-right">Remaining</TableHead><TableHead>Status</TableHead><TableHead>Reason</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
        <TableBody>
          {advances.map(advance => (
            <TableRow key={advance.id}>
              <TableCell>{formatDate(advance.date)}</TableCell>
              <TableCell className="text-right tabular-nums">{formatCurrency(advance.amount)}</TableCell>
              <TableCell className="text-right tabular-nums">{formatCurrency(advance.deductedAmount)}</TableCell>
              <TableCell className="text-right tabular-nums">{formatCurrency(advance.remainingAmount)}</TableCell>
              <TableCell><Badge className={`border text-xs ${getPayrollStatusColor(advance.status)}`}>{statusLabel(advance.status)}</Badge></TableCell>
              <TableCell>{advance.reason || '-'}</TableCell>
              <TableCell className="text-right">
                {onCancelAdvance && advance.deductedAmount === 0 && advance.status !== 'cancelled'
                  ? <Button size="sm" variant="outline" onClick={() => onCancelAdvance(advance)}>Cancel</Button>
                  : <span className="text-xs text-muted-foreground">-</span>}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function PaymentsTable({
  payments,
  onMarkSalaryPaid,
  onCancelPayment,
  onPrintSlip,
  onDownloadSlip,
}: {
  payments: SalaryPayment[]
  onMarkSalaryPaid?: (payment: SalaryPayment) => void
  onCancelPayment?: (payment: SalaryPayment) => void
  onPrintSlip: (payment: SalaryPayment) => void
  onDownloadSlip: (payment: SalaryPayment) => void
}) {
  if (payments.length === 0) return <p className="py-6 text-center text-sm text-muted-foreground">No salary payments found.</p>
  return (
    <div className="rounded-md border overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Period</TableHead><TableHead>Payment #</TableHead><TableHead className="text-right">Base</TableHead><TableHead className="text-right">Bonus</TableHead><TableHead className="text-right">Deductions</TableHead><TableHead className="text-right">Advance Deduction</TableHead><TableHead className="text-right">Net Payable</TableHead><TableHead className="text-right">Paid</TableHead><TableHead>Status</TableHead><TableHead>Payment Date</TableHead><TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {payments.map(payment => (
            <TableRow key={payment.id}>
              <TableCell>{formatSalaryPeriod(payment.salaryPeriod)}</TableCell>
              <TableCell className="font-mono text-xs">{payment.paymentNumber}</TableCell>
              <TableCell className="text-right tabular-nums">{formatCurrency(payment.baseSalary)}</TableCell>
              <TableCell className="text-right tabular-nums">{formatCurrency(payment.bonus)}</TableCell>
              <TableCell className="text-right tabular-nums">{formatCurrency(payment.otherDeductions)}</TableCell>
              <TableCell className="text-right tabular-nums">{formatCurrency(payment.advanceDeduction)}</TableCell>
              <TableCell className="text-right font-medium tabular-nums">{formatCurrency(payment.netPayable)}</TableCell>
              <TableCell className="text-right tabular-nums">{formatCurrency(payment.amountPaid)}</TableCell>
              <TableCell><Badge className={`border text-xs ${getPayrollStatusColor(payment.status)}`}>{statusLabel(payment.status)}</Badge></TableCell>
              <TableCell>{payment.paymentDate ? formatDate(payment.paymentDate) : '-'}</TableCell>
              <TableCell>
                <div className="flex justify-end gap-2">
                  {payment.status === 'pending' && onMarkSalaryPaid && <Button size="sm" onClick={() => onMarkSalaryPaid(payment)}>Mark Paid</Button>}
                  {payment.status === 'pending' && onCancelPayment && <Button size="sm" variant="outline" onClick={() => onCancelPayment(payment)}>Cancel</Button>}
                  <Button size="sm" variant="outline" onClick={() => onDownloadSlip(payment)} title="Download Salary Slip PDF"><Download className="h-3.5 w-3.5" /></Button>
                  <Button size="sm" variant="outline" onClick={() => onPrintSlip(payment)} title="Print Salary Slip"><Printer className="h-3.5 w-3.5" /></Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function LedgerTable({ entries }: { entries: EmployeeLedgerEntry[] }) {
  if (entries.length === 0) return <p className="py-6 text-center text-sm text-muted-foreground">No ledger entries found.</p>
  return (
    <div className="rounded-md border overflow-auto">
      <Table>
        <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Type</TableHead><TableHead>Description</TableHead><TableHead className="text-right">Debit</TableHead><TableHead className="text-right">Credit</TableHead><TableHead>Reference</TableHead></TableRow></TableHeader>
        <TableBody>
          {entries.map(entry => (
            <TableRow key={entry.id}>
              <TableCell>{formatDate(entry.date)}</TableCell>
              <TableCell><Badge variant="outline">{statusLabel(entry.type)}</Badge></TableCell>
              <TableCell>{entry.description}</TableCell>
              <TableCell className="text-right tabular-nums">{formatCurrency(entry.debit)}</TableCell>
              <TableCell className="text-right tabular-nums">{formatCurrency(entry.credit)}</TableCell>
              <TableCell className="font-mono text-xs">{entry.referenceId || '-'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
