"use client"

import { forwardRef } from 'react'
import type { Invoice } from '@/lib/types'
import { formatDate, formatInvoiceStatus, formatPaymentMethod } from '@/lib/utils/format'
import { getTemplateFromStore } from '@/lib/store/template-store'
import { buildDefaultTermsText } from '@/lib/config/invoice-templates'

interface InvoicePrintViewProps {
  invoice: Invoice
}

const formatInvoiceMoney = (amount: number, withSymbol = true) => {
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)

  return withSymbol ? `Rs ${formatted}` : formatted
}

export const InvoicePrintView = forwardRef<HTMLDivElement, InvoicePrintViewProps>(
  ({ invoice }, ref) => {
    // Invoice Terms & Conditions – Editable Per Invoice (Changes 3 & 5):
    // always print the invoice's own saved text. The template is only
    // consulted as a fallback for invoices saved before this feature
    // existed (termsAndConditions is null/undefined) — never for invoices
    // that already have their own copy.
    const termsText = invoice.termsAndConditions
      ?? buildDefaultTermsText(getTemplateFromStore(invoice.template))
    const termsParagraphs = termsText.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean)

    const hasAnyTax = invoice.items.some((item) => item.taxRate > 0)
    const hasAnyDiscount = invoice.items.some((item) => item.discount > 0)
    const itemTableColumnWidths = hasAnyTax && hasAnyDiscount
      ? ['4%', '44%', '6%', '12%', '7%', '7%', '20%']
      : hasAnyTax || hasAnyDiscount
        ? ['4%', '50%', '6%', '14%', '8%', '18%']
        : ['4%', '56%', '7%', '15%', '18%']

    return (
      <div ref={ref} className="invoice-print-area bg-white text-black p-6 text-[12px] leading-tight max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-start mb-12">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">INVOICE</h1>
            <p className="text-gray-600 mt-1 text-xs">{invoice.invoiceNumber}</p>
            {invoice.poNumber && (
              <p className="text-gray-600 mt-1 text-xs">
                <span className="font-semibold text-gray-700">PO:</span> {invoice.poNumber}
              </p>
            )}
          </div>
          <div className="text-right flex flex-col items-end mt-1">
            <img
              src="/logo.png"
              alt="Tabinda Machinery"
              className="mb-1.5 h-auto w-44 object-contain"
            />
            <p className="text-xs text-gray-600">Office 16-17, Wali Centre, Fazal e Haq, Road, Blue area</p>
            <p className="text-xs text-gray-600">Islamabad</p>
            <p className="text-xs text-gray-600">0336 5318947 | 051 2802424-25</p>
          </div>
        </div>

        {/* Invoice Details */}
        <div className="grid grid-cols-2 gap-8 mb-6">
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Bill To</h3>
            <p className="font-semibold text-gray-900">{invoice.customerName}</p>
            {invoice.customerPhone && (
              <p className="text-gray-600">{invoice.customerPhone}</p>
            )}
            <p className="text-gray-600">{invoice.customerEmail}</p>
          </div>
          <div className="text-right">
            <div className="space-y-0.5">
              <div className="flex justify-between">
                <span className="text-gray-600">Invoice Date:</span>
                <span className="font-medium">{formatDate(invoice.createdAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <span className="font-medium">{formatInvoiceStatus(invoice.status)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Payment:</span>
                <span className="font-medium">{formatPaymentMethod(invoice.paymentMethod)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Line Items Table */}
        <table className="invoice-items-table w-full table-fixed mb-5 text-[11px]">
          <colgroup>
            {itemTableColumnWidths.map((width, index) => (
              <col key={`${width}-${index}`} style={{ width }} />
            ))}
          </colgroup>
          <thead>
            <tr className="border-b-2 border-gray-300">
              <th className="text-left py-2 pr-1 text-gray-600 font-semibold">#</th>
              <th className="text-left py-2 px-1 text-gray-600 font-semibold">Item</th>
              <th className="text-right py-2 px-1 text-gray-600 font-semibold whitespace-nowrap">Qty</th>
              <th className="text-right py-2 px-1 text-gray-600 font-semibold whitespace-nowrap">Price</th>
              {hasAnyTax && <th className="text-right py-2 px-1 text-gray-600 font-semibold whitespace-nowrap">Tax</th>}
              {hasAnyDiscount && <th className="text-right py-2 px-1 text-gray-600 font-semibold whitespace-nowrap">Disc</th>}
              <th className="text-right py-2 pl-1 text-gray-600 font-semibold whitespace-nowrap">Total</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item, index) => (
              <tr key={item.id} className="border-b border-gray-200">
                <td className="py-2 pr-1 text-gray-400 text-[10px] font-mono align-top">{index + 1}</td>
                <td className="py-2 px-1 align-top">
                  <div className="font-medium text-gray-900 break-words">{item.productName}</div>
                  {item.productDescription && (
                    <div className="text-[10px] text-gray-500 whitespace-pre-line break-words">
                      {item.productDescription}
                    </div>
                  )}
                  {(() => {
                    const serials: string[] = item.serialNumbers && item.serialNumbers.length > 0
                      ? item.serialNumbers
                      : item.serialNumber
                        ? [item.serialNumber]
                        : []
                    return serials.length > 0 ? (
                      <div className="mt-1">
                        <span className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider">S/N: </span>
                        <span className="text-[10px] text-gray-500 font-mono break-all">
                          {serials.join(', ')}
                        </span>
                      </div>
                    ) : null
                  })()}
                </td>
                <td className="text-right py-2 px-1 text-gray-900 whitespace-nowrap align-top">{item.quantity}</td>
                <td className="text-right py-2 px-1 text-gray-900 whitespace-nowrap align-top">{formatInvoiceMoney(item.unitPrice, false)}</td>
                {hasAnyTax && (
                  <td className="text-right py-2 px-1 text-gray-900 whitespace-nowrap align-top">
                    {item.taxRate > 0 ? `${item.taxRate}%` : '—'}
                  </td>
                )}
                {hasAnyDiscount && (
                  <td className="text-right py-2 px-1 text-gray-900 whitespace-nowrap align-top">
                    {item.discount > 0 ? `${item.discount}%` : '—'}
                  </td>
                )}
                <td className="text-right py-2 pl-1 font-medium text-gray-900 whitespace-nowrap align-top">{formatInvoiceMoney(item.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="flex justify-end mb-5">
          <div className="w-64">
            <div className="flex justify-between py-1">
              <span className="text-gray-600">Subtotal</span>
              <span className="text-gray-900">{formatInvoiceMoney(invoice.subtotal)}</span>
            </div>
            {invoice.taxAmount > 0 && (
              <div className="flex justify-between py-1">
                <span className="text-gray-600">Tax</span>
                <span className="text-gray-900">{formatInvoiceMoney(invoice.taxAmount)}</span>
              </div>
            )}
            {invoice.discountAmount > 0 && (
              <div className="flex justify-between py-1">
                <span className="text-gray-600">Discount</span>
                <span className="text-red-600">-{formatInvoiceMoney(invoice.discountAmount)}</span>
              </div>
            )}
            {(invoice.shippingCost ?? 0) > 0 && (
              <div className="flex justify-between py-1">
                <span className="text-gray-600">Shipping</span>
                <span className="text-gray-900">{formatInvoiceMoney(invoice.shippingCost)}</span>
              </div>
            )}
            <div className="flex justify-between py-2 border-t-2 border-gray-300">
              <span className="font-bold text-gray-900">Total Due</span>
              <span className="font-bold text-base text-gray-900">{formatInvoiceMoney(invoice.total)}</span>
            </div>
          </div>
        </div>

        {/* Template Footnote */}
        <div className="border-t-2 border-gray-300 pt-3 mt-5 flex gap-4 items-start">
          {/* Terms & Conditions — Service Invoices never show this (Change 7) */}
          {invoice.invoiceType !== 'service' && (
            <div className="flex-1 min-w-0">
              <p className="text-[9px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Terms &amp; Conditions
              </p>
              <div className="space-y-1">
                {termsParagraphs.map((paragraph, i) => (
                  <p key={i} className="text-[9px] leading-snug text-gray-500 whitespace-pre-line">
                    {paragraph}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* QR Codes */}
          <div className="flex gap-4 shrink-0">
            <div className="flex flex-col items-center gap-0.5">
              <img
                src="/Google-review-QR.jpeg"
                alt="Google Review QR Code"
                className="w-14 h-14 object-contain"
              />
              <p className="text-[8px] text-gray-500 font-medium text-center">Leave a Review</p>
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <img
                src="/Facebook-page-qr.jpeg"
                alt="Facebook Page QR Code"
                className="w-14 h-14 object-contain"
              />
              <p className="text-[8px] text-gray-500 font-medium text-center">Follow Us on Facebook</p>
            </div>
          </div>
        </div>

        {/* Name & Signature — hardcoded, print-only, for the customer to
            physically fill in. Not tied to any data field. */}
        <div className="flex justify-end mt-8">
          <div className="w-56 space-y-4">
            <div>
              <div className="border-b border-gray-400 h-5" />
              <p className="text-[8px] text-gray-500 mt-0.5">Name</p>
            </div>
            <div>
              <div className="border-b border-gray-400 h-5" />
              <p className="text-[8px] text-gray-500 mt-0.5">Signature</p>
            </div>
          </div>
        </div>
      </div>
    )
  }
)

InvoicePrintView.displayName = 'InvoicePrintView'

