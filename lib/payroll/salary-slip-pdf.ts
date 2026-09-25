import type { Employee, SalaryPayment } from '@/lib/types'
import { formatSalaryPeriod, statusLabel } from '@/lib/payroll/payroll-utils'

type SalarySlipPdfInput = {
  employee: Employee
  payment: SalaryPayment
}

type PdfTextLine = {
  text: string
  x: number
  y: number
  size?: number
  bold?: boolean
}

function money(amount: number): string {
  return `PKR ${new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(amount) || 0)}`
}

function readableDate(date?: string): string {
  if (!date) return '-'
  const parsed = new Date(date)
  if (Number.isNaN(parsed.getTime())) return date
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).format(parsed)
}

function asciiText(value: string): string {
  return value
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[^\x20-\x7E]/g, ' ')
}

function escapePdfText(value: string): string {
  return asciiText(value).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
}

function filenameSafe(value: string): string {
  return value.replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase()
}

function textCommand(line: PdfTextLine): string {
  const font = line.bold ? 'F2' : 'F1'
  return `BT /${font} ${line.size ?? 10} Tf ${line.x} ${line.y} Td (${escapePdfText(line.text)}) Tj ET`
}

function buildPdfDocument(lines: PdfTextLine[]): string {
  const content = lines.map(textCommand).join('\n')
  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>\nendobj',
    '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj',
    '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj',
    `6 0 obj\n<< /Length ${content.length} >>\nstream\n${content}\nendstream\nendobj`,
  ]

  let pdf = '%PDF-1.4\n'
  const offsets = [0]
  for (const object of objects) {
    offsets.push(pdf.length)
    pdf += `${object}\n`
  }

  const xrefStart = pdf.length
  pdf += `xref\n0 ${objects.length + 1}\n`
  pdf += '0000000000 65535 f \n'
  for (let index = 1; index <= objects.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`
  return pdf
}

function buildSlipLines({ employee, payment }: SalarySlipPdfInput): PdfTextLine[] {
  const role = employee.designation || employee.position || '-'
  const cnic = employee.cnic || '-'
  const notes = payment.notes ? asciiText(payment.notes).slice(0, 90) : ''

  const lines: PdfTextLine[] = [
    { text: 'Tabinda Machinery', x: 50, y: 792, size: 20, bold: true },
    { text: 'Salary Slip', x: 50, y: 768, size: 15, bold: true },
    { text: `Payment #: ${payment.paymentNumber}`, x: 365, y: 792, size: 10, bold: true },
    { text: `Status: ${statusLabel(payment.status)}`, x: 365, y: 774, size: 10 },
    { text: `Salary Period: ${formatSalaryPeriod(payment.salaryPeriod)}`, x: 50, y: 728, size: 11, bold: true },
    { text: `Employee: ${employee.name}`, x: 50, y: 706, size: 10 },
    { text: `Role/Designation: ${role}`, x: 50, y: 688, size: 10 },
    { text: `CNIC: ${cnic}`, x: 50, y: 670, size: 10 },
    { text: `Payment Date: ${readableDate(payment.paymentDate)}`, x: 365, y: 706, size: 10 },
    { text: `Generated: ${readableDate(new Date().toISOString())}`, x: 365, y: 688, size: 10 },
    { text: 'Earnings and Deductions', x: 50, y: 628, size: 13, bold: true },
    { text: 'Description', x: 50, y: 602, size: 10, bold: true },
    { text: 'Amount', x: 430, y: 602, size: 10, bold: true },
    { text: 'Base Salary', x: 50, y: 578, size: 10 },
    { text: money(payment.baseSalary), x: 430, y: 578, size: 10 },
    { text: 'Bonus', x: 50, y: 556, size: 10 },
    { text: money(payment.bonus), x: 430, y: 556, size: 10 },
    { text: 'Other Deductions', x: 50, y: 534, size: 10 },
    { text: `-${money(payment.otherDeductions)}`, x: 430, y: 534, size: 10 },
    { text: 'Advance Deduction', x: 50, y: 512, size: 10 },
    { text: `-${money(payment.advanceDeduction)}`, x: 430, y: 512, size: 10 },
    { text: 'Net Payable', x: 50, y: 476, size: 12, bold: true },
    { text: money(payment.netPayable), x: 430, y: 476, size: 12, bold: true },
    { text: 'Amount Paid', x: 50, y: 452, size: 12, bold: true },
    { text: money(payment.amountPaid), x: 430, y: 452, size: 12, bold: true },
  ]

  if (notes) {
    lines.push({ text: `Notes: ${notes}`, x: 50, y: 414, size: 9 })
  }

  lines.push({ text: 'This PDF contains salary slip data only. Navigation, buttons, browser URL, and headers/footers are excluded.', x: 50, y: 80, size: 8 })

  return lines
}

export function downloadSalarySlipPdf(input: SalarySlipPdfInput): void {
  const pdf = buildPdfDocument(buildSlipLines(input))
  const blob = new Blob([pdf], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${filenameSafe(input.payment.paymentNumber)}-${filenameSafe(input.employee.name)}-salary-slip.pdf`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
