const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')

const collectPageStyles = () => {
  if (typeof document === 'undefined') return ''

  return Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
    .map((node) => node.outerHTML)
    .join('\n')
}

export function printHtmlElement(element: HTMLElement | null, documentTitle: string) {
  if (typeof window === 'undefined' || !element) return

  const printWindow = window.open('', '_blank', 'width=1000,height=800')
  if (!printWindow) {
    window.alert('Unable to open the invoice print preview. Please allow pop-ups for this site and try again.')
    return
  }

  printWindow.document.open()
  printWindow.document.write(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(documentTitle)}</title>
    ${collectPageStyles()}
    <style>
      html,
      body {
        margin: 0;
        background: #ffffff;
        color: #000000;
      }

      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      @page {
        size: portrait;
        margin: 10mm;
      }

      @media screen {
        body { padding: 24px; }
      }

      @media print {
        /* Override app/globals.css, which hides everything except .report-print-area.
           The new print window contains only the invoice markup, so everything in it
           should remain visible. */
        body * {
          visibility: visible !important;
        }

        .invoice-print-area {
          position: static !important;
          inset: auto !important;
          width: 100% !important;
          max-width: none !important;
          margin: 0 !important;
          padding: 0 !important;
          font-size: 11px !important;
          line-height: 1.2 !important;
          box-shadow: none !important;
        }

        .invoice-print-area .invoice-items-table {
          table-layout: fixed !important;
          width: 100% !important;
          border-collapse: collapse !important;
        }

        .invoice-print-area .invoice-items-table th,
        .invoice-print-area .invoice-items-table td {
          padding: 0.35rem 0.25rem !important;
          vertical-align: top !important;
        }

        .invoice-print-area .invoice-items-table th:first-child,
        .invoice-print-area .invoice-items-table td:first-child {
          padding-left: 0 !important;
          padding-right: 0.25rem !important;
        }

        .invoice-print-area .invoice-items-table th:last-child,
        .invoice-print-area .invoice-items-table td:last-child {
          padding-left: 0.25rem !important;
          padding-right: 0 !important;
        }

        .invoice-print-area .invoice-items-table th:not(:nth-child(2)),
        .invoice-print-area .invoice-items-table td:not(:nth-child(2)) {
          white-space: nowrap !important;
        }

        .invoice-print-area .invoice-items-table th:nth-child(2),
        .invoice-print-area .invoice-items-table td:nth-child(2) {
          overflow-wrap: anywhere !important;
          word-break: break-word !important;
        }
      }
    </style>
  </head>
  <body>${element.outerHTML}</body>
</html>`)
  printWindow.document.close()

  const runPrint = () => {
    printWindow.focus()
    printWindow.print()
  }

  if (printWindow.document.readyState === 'complete') {
    window.setTimeout(runPrint, 150)
  } else {
    printWindow.onload = () => window.setTimeout(runPrint, 150)
  }
}
