import type { InvoiceTemplate } from '@/lib/types'

export interface InvoiceTemplateConfig {
  id: InvoiceTemplate
  label: string
  description: string
  footnote: {
    title: string
    policies: string[]
    closing: string
  }
}

export const invoiceTemplates: InvoiceTemplateConfig[] = [
  {
    id: 'standard_local',
    label: 'Standard Local',
    description: 'Standard local warranty terms',
    footnote: {
      title: 'Standard Local',
      policies: [
        '1- One Year Standard Manufacturer Warranty.',
        '2- Any damages due to abusing, breakage, electrical shocks, tampering into the warranty stickers or components shall void the warranty.',
        '3- All warranties are relevant to Manufacturers / Distributors under their prevailing warranty policy.',
        '4- Handling of warranty may take from next day to 90 days, depending on the availability of the affected hardware / component at the time of claiming the warranty.',
        '5- WARRANTY IS NON-TRANSFERABLE.',
      ],
      closing: '',
    },
  },
  {
    id: 'standard_international',
    label: 'Standard International',
    description: 'Standard international (HP) warranty terms',
    footnote: {
      title: 'Standard International',
      policies: [
        '1- HP Standard International Manufacturer Warranty.',
        '2- Any damages due to abusing, breakage, electrical shocks, tampering into the warranty stickers or components shall void the warranty.',
        '3- All warranties are relevant to Manufacturers / Distributors under their prevailing warranty policy.',
        '4- Handling of warranty may take from next day to 90 days, depending on the availability of the affected hardware / component at the time of claiming the warranty.',
        '5- WARRANTY IS NON-TRANSFERABLE.',
      ],
      closing: '',
    },
  },
  {
    id: 'standard_toners',
    label: 'Standard Toners',
    description: 'Standard toner warranty terms',
    footnote: {
      title: 'Standard Toners',
      policies: [
        '1- HP Standard Manufacturer warranty for 03 months or 40% usage whichever is earlier from invoice date for toner.',
        '2- Any damages due to abusing, breakage, electrical shocks, tampering into the warranty stickers or components shall void the warranty.',
        '3- All warranties are relevant to Manufacturers / Distributors under their prevailing warranty policy.',
        '4- Handling of warranty may take from next day to 90 days, depending on the availability of the affected hardware / component at the time of claiming the warranty.',
        '5- WARRANTY IS NON-TRANSFERABLE.',
      ],
      closing: '',
    },
  },
]

export function getTemplate(id: InvoiceTemplate): InvoiceTemplateConfig {
  return invoiceTemplates.find(t => t.id === id) ?? invoiceTemplates[0]
}

/**
 * Invoice Terms & Conditions – Editable Per Invoice.
 *
 * Turns a template's structured footnote (policies list + closing line)
 * into the plain, freely-editable multi-line text that gets copied into a
 * new invoice. This runs once, at invoice creation, when the user selects a
 * template — from then on the invoice owns its own copy and this function
 * is never consulted again for that invoice (see Change 3).
 */
export function buildDefaultTermsText(template: InvoiceTemplateConfig): string {
  const paragraphs = [...template.footnote.policies]
  if (template.footnote.closing) paragraphs.push(template.footnote.closing)
  return paragraphs.join('\n\n')
}
