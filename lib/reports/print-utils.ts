export type PrintableValue = string | number | boolean | null | undefined

export type PrintTableColumn = {
  key: string
  label: string
  align?: 'left' | 'right' | 'center'
}

export type PrintTable = {
  title?: string
  description?: string
  columns: PrintTableColumn[]
  rows: Record<string, PrintableValue>[]
}

export type PrintReportOptions = {
  title: string
  subtitle?: string
  metadata?: string[]
  tables: PrintTable[]
  orientation?: 'portrait' | 'landscape'
  generatedOn?: string
}

function escapeHtml(value: PrintableValue): string {
  return String(value ?? '-')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function renderMetadata(metadata: string[] = []): string {
  if (!metadata.length) return ''

  return `
    <div class="metadata">
      ${metadata.map(item => `<div>${escapeHtml(item)}</div>`).join('')}
    </div>
  `
}

function renderTable(table: PrintTable): string {
  return `
    <section class="table-section">
      ${table.title ? `<h2>${escapeHtml(table.title)}</h2>` : ''}
      ${table.description ? `<p class="table-description">${escapeHtml(table.description)}</p>` : ''}
      <table>
        <thead>
          <tr>
            ${table.columns.map(column => `<th class="${column.align === 'right' ? 'align-right' : column.align === 'center' ? 'align-center' : ''}">${escapeHtml(column.label)}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${table.rows.map(row => `
            <tr>
              ${table.columns.map(column => `<td class="${column.align === 'right' ? 'align-right' : column.align === 'center' ? 'align-center' : ''}">${escapeHtml(row[column.key])}</td>`).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
    </section>
  `
}

function buildPrintDocument(options: PrintReportOptions): string {
  const orientation = options.orientation ?? 'landscape'
  const generatedOn = options.generatedOn ?? new Date().toLocaleDateString()

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(options.title)}</title>
  <style>
    @page {
      size: ${orientation};
      margin: 10mm;
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      color: #000;
      background: #fff;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 11px;
      line-height: 1.35;
    }

    .print-report {
      width: 100%;
    }

    h1 {
      margin: 0;
      font-size: 18px;
      line-height: 1.25;
      font-weight: 700;
    }

    h2 {
      margin: 16px 0 8px;
      font-size: 13px;
      font-weight: 700;
    }

    .subtitle {
      margin-top: 4px;
      color: #333;
      font-size: 11px;
    }

    .metadata {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 4px 16px;
      margin: 12px 0 14px;
      color: #111;
      font-size: 10.5px;
    }

    .table-description {
      margin: -4px 0 8px;
      color: #333;
      font-size: 10.5px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      table-layout: auto;
      page-break-inside: auto;
    }

    thead {
      display: table-header-group;
    }

    tr {
      break-inside: avoid;
      page-break-inside: avoid;
    }

    th,
    td {
      border: 1px solid #d6d6d6;
      padding: 5px 6px;
      vertical-align: top;
      text-align: left;
      color: #000;
      background: #fff;
      white-space: normal;
      word-break: break-word;
    }

    th {
      background: #f2f2f2;
      font-weight: 700;
    }

    .align-right {
      text-align: right;
    }

    .align-center {
      text-align: center;
    }

    .footer {
      margin-top: 16px;
      padding-top: 8px;
      border-top: 1px solid #ddd;
      color: #444;
      font-size: 10px;
    }

    @media screen {
      body {
        padding: 24px;
      }
    }
  </style>
</head>
<body>
  <main class="print-report">
    <h1>${escapeHtml(options.title)}</h1>
    ${options.subtitle ? `<div class="subtitle">${escapeHtml(options.subtitle)}</div>` : ''}
    ${renderMetadata(options.metadata)}
    ${options.tables.map(renderTable).join('')}
    <div class="footer">Generated on ${escapeHtml(generatedOn)}</div>
  </main>
</body>
</html>`
}

export function printReport(options: PrintReportOptions): void {
  if (typeof window === 'undefined') return

  const printWindow = window.open('', '_blank', 'width=1200,height=800')

  if (!printWindow) {
    window.alert('Unable to open the report print preview. Please allow pop-ups for this site and try again.')
    return
  }

  printWindow.document.open()
  printWindow.document.write(buildPrintDocument(options))
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
