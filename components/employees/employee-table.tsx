"use client"

import { useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Banknote,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Edit,
  Eye,
  MoreHorizontal,
  PlusCircle,
  Search,
  Trash2,
} from 'lucide-react'
import type { Employee, EmployeeStatus } from '@/lib/types'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import { getPayrollStatusColor, statusLabel } from '@/lib/payroll/payroll-utils'

interface EmployeeTableProps {
  employees: Employee[]
  getOutstandingAdvance?: (employeeId: string) => number
  getLastSalaryPaid?: (employeeId: string) => string | undefined
  onView?: (employee: Employee) => void
  onEdit?: (employee: Employee) => void
  onDelete?: (employee: Employee) => void
  onAddAdvance?: (employee: Employee) => void
  onGenerateSalary?: (employee: Employee) => void
  onViewLedger?: (employee: Employee) => void
}

const statusVariants: Record<EmployeeStatus, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  active: 'default',
  inactive: 'secondary',
  on_leave: 'outline',
  terminated: 'destructive',
}

const ITEMS_PER_PAGE = 10

export function EmployeeTable({
  employees,
  getOutstandingAdvance,
  getLastSalaryPaid,
  onView,
  onEdit,
  onDelete,
  onAddAdvance,
  onGenerateSalary,
  onViewLedger,
}: EmployeeTableProps) {
  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  const filteredEmployees = employees.filter(employee => {
    const searchLower = search.toLowerCase()
    return (
      employee.name.toLowerCase().includes(searchLower) ||
      employee.email.toLowerCase().includes(searchLower) ||
      employee.employeeId.toLowerCase().includes(searchLower) ||
      employee.position.toLowerCase().includes(searchLower) ||
      (employee.cnic || '').toLowerCase().includes(searchLower)
    )
  })

  const totalPages = Math.ceil(filteredEmployees.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const paginatedEmployees = filteredEmployees.slice(startIndex, startIndex + ITEMS_PER_PAGE)

  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search employees..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setCurrentPage(1)
          }}
          className="pl-9"
        />
      </div>

      <div className="rounded-md border overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee Name</TableHead>
              <TableHead>Role / Designation</TableHead>
              <TableHead>App Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Base Salary</TableHead>
              <TableHead className="text-right">Outstanding Advance</TableHead>
              <TableHead>Last Salary Paid</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedEmployees.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">No employees found.</TableCell>
              </TableRow>
            ) : (
              paginatedEmployees.map((employee) => {
                const outstandingAdvance = getOutstandingAdvance?.(employee.id) ?? 0
                const lastSalaryPaid = getLastSalaryPaid?.(employee.id)
                return (
                  <TableRow
                    key={employee.id}
                    className={onView ? 'cursor-pointer hover:bg-muted/50' : ''}
                    onClick={() => onView?.(employee)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">{getInitials(employee.name)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{employee.name}</div>
                          <div className="text-xs text-muted-foreground font-mono">{employee.employeeId}</div>
                          <div className="text-xs text-muted-foreground">{employee.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{employee.designation || employee.position}</TableCell>
                    <TableCell>
                      {employee.role === 'no_app_access' ? (
                        <Badge variant="secondary" className="capitalize">No App Access</Badge>
                      ) : (
                        <Badge variant="outline" className="capitalize">{employee.role.replace('_', ' ')}</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariants[employee.status]} className="capitalize">
                        {statusLabel(employee.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">{formatCurrency(employee.baseSalary ?? employee.salary)}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      <span className={outstandingAdvance > 0 ? 'font-medium text-amber-600 dark:text-amber-400' : ''}>
                        {formatCurrency(outstandingAdvance)}
                      </span>
                    </TableCell>
                    <TableCell>{lastSalaryPaid ? formatDate(lastSalaryPaid) : '-'}</TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Open menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          {onView && <DropdownMenuItem onClick={() => onView(employee)}><Eye className="mr-2 h-4 w-4" />View Details</DropdownMenuItem>}
                          {onEdit && <DropdownMenuItem onClick={() => onEdit(employee)}><Edit className="mr-2 h-4 w-4" />Edit Employee</DropdownMenuItem>}
                          {onAddAdvance && <DropdownMenuItem onClick={() => onAddAdvance(employee)}><PlusCircle className="mr-2 h-4 w-4" />Add Advance</DropdownMenuItem>}
                          {onGenerateSalary && <DropdownMenuItem onClick={() => onGenerateSalary(employee)}><Banknote className="mr-2 h-4 w-4" />Generate Salary</DropdownMenuItem>}
                          {onViewLedger && <DropdownMenuItem onClick={() => onViewLedger(employee)}><BookOpen className="mr-2 h-4 w-4" />View Ledger</DropdownMenuItem>}
                          {onDelete && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => onDelete(employee)} className="text-destructive">
                                <Trash2 className="mr-2 h-4 w-4" />Delete
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {startIndex + 1} to {Math.min(startIndex + ITEMS_PER_PAGE, filteredEmployees.length)} of {filteredEmployees.length} employees
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
              <ChevronLeft className="h-4 w-4" />Previous
            </Button>
            <span className="text-sm text-muted-foreground">Page {currentPage} of {totalPages}</span>
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
              Next<ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
