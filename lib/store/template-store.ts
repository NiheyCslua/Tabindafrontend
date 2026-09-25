import { create } from 'zustand'
import { invoiceTemplates as defaultTemplates } from '@/lib/config/invoice-templates'
import type { InvoiceTemplateConfig } from '@/lib/config/invoice-templates'
import { api, API_ENDPOINTS } from '@/lib/api'

/**
 * Invoice Templates only ever supply the *default* Terms & Conditions text
 * copied into a new invoice — but that default text itself is now backed by
 * the database (see `src/invoice-templates` on the backend), not browser
 * `localStorage`. Editing a template in Settings is visible from any
 * device/session as soon as `fetchTemplates()` runs, instead of being
 * stuck on whichever browser made the edit.
 *
 * `templates` starts seeded with the static fallback defaults so nothing
 * is ever blank before the first fetch resolves (e.g. during the brief
 * window right after login, or if the network request is still in
 * flight) — `fetchTemplates()` then replaces it with the live server data.
 */
interface TemplateStore {
  templates: InvoiceTemplateConfig[]
  isLoaded: boolean
  isLoading: boolean
  // Set whenever fetchTemplates() fails, so a broken GET /invoice-templates
  // (e.g. backend running against a stale Prisma Client that doesn't know
  // about this table yet) shows up as a visible error instead of quietly
  // falling back to the hardcoded defaults with no explanation.
  loadError: string | null
  fetchTemplates: (force?: boolean) => Promise<void>
  addTemplate: (template: InvoiceTemplateConfig) => Promise<void>
  updateTemplate: (id: string, updated: InvoiceTemplateConfig) => Promise<void>
  deleteTemplate: (id: string) => Promise<void>
  resetTemplate: (id: string) => Promise<void>
  resetAll: () => Promise<void>
}

const normalizeTemplate = (raw: unknown): InvoiceTemplateConfig => {
  const t = (raw ?? {}) as Record<string, any>
  const footnote = (t.footnote ?? {}) as Record<string, any>
  return {
    id: String(t.id ?? ''),
    label: String(t.label ?? ''),
    description: String(t.description ?? ''),
    footnote: {
      title: String(footnote.title ?? ''),
      policies: Array.isArray(footnote.policies) ? footnote.policies.map(String) : [],
      closing: String(footnote.closing ?? ''),
    },
  }
}

export const useTemplateStore = create<TemplateStore>()((set, get) => ({
  templates: defaultTemplates,
  isLoaded: false,
  isLoading: false,
  loadError: null,

  fetchTemplates: async (force = false) => {
    if (get().isLoading) return
    if (get().isLoaded && !force) return
    set({ isLoading: true, loadError: null })
    try {
      const data = await api<unknown[]>(API_ENDPOINTS.invoiceTemplates)
      const templates = Array.isArray(data) ? data.map(normalizeTemplate) : []
      set({
        templates: templates.length ? templates : defaultTemplates,
        isLoaded: true,
        isLoading: false,
        loadError: null,
      })
    } catch (err) {
      // Surface this — a failed fetch here previously fell back to the
      // hardcoded defaults with zero indication anything was wrong, which
      // made a broken backend (e.g. Prisma Client not regenerated after a
      // migration) look identical to "the app is ignoring the database."
      const message = err instanceof Error ? err.message : 'Failed to load invoice templates from the server'
      console.error('Failed to load invoice templates:', err)
      set({ isLoading: false, loadError: message })
    }
  },

  addTemplate: async (template) => {
    const created = await api<unknown>(API_ENDPOINTS.invoiceTemplates, {
      method: 'POST',
      body: JSON.stringify(template),
    })
    const normalized = normalizeTemplate(created)
    set((state) => ({ templates: [...state.templates, normalized] }))
  },

  updateTemplate: async (id, updated) => {
    const saved = await api<unknown>(`${API_ENDPOINTS.invoiceTemplates}/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updated),
    })
    const normalized = normalizeTemplate(saved)
    set((state) => ({
      templates: state.templates.map((t) => (t.id === id ? normalized : t)),
    }))
  },

  deleteTemplate: async (id) => {
    await api(`${API_ENDPOINTS.invoiceTemplates}/${id}`, { method: 'DELETE' })
    set((state) => ({ templates: state.templates.filter((t) => t.id !== id) }))
  },

  resetTemplate: async (id) => {
    const reset = await api<unknown>(`${API_ENDPOINTS.invoiceTemplates}/${id}/reset`, { method: 'POST' })
    const normalized = normalizeTemplate(reset)
    set((state) => ({
      templates: state.templates.map((t) => (t.id === id ? normalized : t)),
    }))
  },

  resetAll: async () => {
    const all = await api<unknown[]>(`${API_ENDPOINTS.invoiceTemplates}/reset-all`, { method: 'POST' })
    const templates = Array.isArray(all) ? all.map(normalizeTemplate) : defaultTemplates
    set({ templates })
  },
}))

/** Drop-in replacement for getTemplate() — reads live store data */
export function getTemplateFromStore(
  id: string | undefined
): InvoiceTemplateConfig {
  const templates = useTemplateStore.getState().templates
  return templates.find((t) => t.id === (id ?? templates[0]?.id)) ?? templates[0]
}
