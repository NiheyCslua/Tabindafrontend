'use client'

import { useEffect, useRef, useState } from 'react'
import { Plus, Trash2, RotateCcw, Save, ChevronDown, ChevronRight, FileText } from 'lucide-react'
import { DashboardHeader } from '@/components/dashboard/dashboard-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
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
import { useTemplateStore } from '@/lib/store/template-store'
import type { InvoiceTemplateConfig } from '@/lib/config/invoice-templates'

export default function SettingsPage() {
  const { templates, isLoaded, loadError, fetchTemplates, addTemplate, updateTemplate, deleteTemplate, resetTemplate, resetAll } =
    useTemplateStore()

  const [drafts, setDrafts] = useState<Record<string, InvoiceTemplateConfig>>(
    () => Object.fromEntries(templates.map((t) => [t.id, structuredClone(t)]))
  )
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [saved, setSaved] = useState<Record<string, boolean>>({})
  const [deleteDialogId, setDeleteDialogId] = useState<string | null>(null)
  const [resetDialogId, setResetDialogId] = useState<string | 'all' | null>(null)
  const [error, setError] = useState<string | null>(null)
  // Tracks whether we've done the one-time "real server data just arrived,
  // overwrite whatever placeholder drafts we started with" sync yet.
  const didInitialSync = useRef(false)

  // Always pull the live server copy when landing on Settings — templates
  // are shared across every device/session now, so a previously-cached
  // fetch from earlier in this session isn't good enough here.
  useEffect(() => {
    fetchTemplates(true)
  }, [fetchTemplates])

  // Keep drafts in sync with the server copy of the template list.
  //
  // `drafts` is seeded above from whatever `templates` happens to be at
  // mount — which, before the fetch above resolves, is just the hardcoded
  // static fallback list. The FIRST time real data arrives (isLoaded flips
  // true), every draft must be fully overwritten with it — otherwise a
  // saved edit shows correctly in the network response and in the
  // database, but this page keeps rendering the stale placeholder it
  // already had a draft entry for, forever. After that one-time sync,
  // only add/remove entries for ids that appear/disappear (from this
  // session's own add/delete calls) — never blanket-overwrite again, so a
  // field the user is actively typing into is never clobbered.
  useEffect(() => {
    if (isLoaded && !didInitialSync.current) {
      didInitialSync.current = true
      setDrafts(Object.fromEntries(templates.map((t) => [t.id, structuredClone(t)])))
      return
    }
    setDrafts((prev) => {
      const next = { ...prev }
      for (const t of templates) {
        if (!next[t.id]) next[t.id] = structuredClone(t)
      }
      for (const id of Object.keys(next)) {
        if (!templates.some((t) => t.id === id)) delete next[id]
      }
      return next
    })
  }, [templates, isLoaded])

  const syncDraft = (id: string) => {
    const fresh = useTemplateStore.getState().templates.find((t) => t.id === id)
    if (fresh) setDrafts((prev) => ({ ...prev, [id]: structuredClone(fresh) }))
  }

  const updateDraft = (id: string, updated: InvoiceTemplateConfig) => {
    setDrafts((prev) => ({ ...prev, [id]: updated }))
    setSaved((prev) => ({ ...prev, [id]: false }))
  }

  const handleSave = async (id: string) => {
    setError(null)
    try {
      await updateTemplate(id, drafts[id])
      setSaved((prev) => ({ ...prev, [id]: true }))
      setTimeout(() => setSaved((prev) => ({ ...prev, [id]: false })), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save template')
    }
  }

  const handleAddTemplate = async () => {
    const id = `template_${Date.now()}`
    const newTemplate: InvoiceTemplateConfig = {
      id,
      label: `Template ${templates.length + 1}`,
      description: '',
      footnote: { title: 'Terms & Conditions', policies: [''], closing: '' },
    }
    setError(null)
    try {
      await addTemplate(newTemplate)
      setDrafts((prev) => ({ ...prev, [id]: structuredClone(newTemplate) }))
      setExpanded((prev) => ({ ...prev, [id]: true }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add template')
    }
  }

  const handleDelete = async (id: string) => {
    setError(null)
    try {
      await deleteTemplate(id)
      setDrafts((prev) => { const c = { ...prev }; delete c[id]; return c })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete template')
    }
    setDeleteDialogId(null)
  }

  const handleReset = async (id: string | 'all') => {
    setError(null)
    try {
      if (id === 'all') {
        await resetAll()
        const fresh = useTemplateStore.getState().templates
        setDrafts(Object.fromEntries(fresh.map((t) => [t.id, structuredClone(t)])))
      } else {
        await resetTemplate(id)
        syncDraft(id)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset template')
    }
    setResetDialogId(null)
  }

  const addPolicy = (id: string) => {
    const d = drafts[id]
    updateDraft(id, { ...d, footnote: { ...d.footnote, policies: [...d.footnote.policies, ''] } })
  }

  const removePolicy = (id: string, i: number) => {
    const d = drafts[id]
    updateDraft(id, { ...d, footnote: { ...d.footnote, policies: d.footnote.policies.filter((_, j) => j !== i) } })
  }

  const updatePolicy = (id: string, i: number, val: string) => {
    const d = drafts[id]
    updateDraft(id, { ...d, footnote: { ...d.footnote, policies: d.footnote.policies.map((p, j) => j === i ? val : p) } })
  }

  const movePolicy = (id: string, i: number, dir: 'up' | 'down') => {
    const d = drafts[id]
    const ps = [...d.footnote.policies]
    const t = dir === 'up' ? i - 1 : i + 1
    if (t < 0 || t >= ps.length) return
    ;[ps[i], ps[t]] = [ps[t], ps[i]]
    updateDraft(id, { ...d, footnote: { ...d.footnote, policies: ps } })
  }

  // Must match FACTORY_DEFAULTS in backend/src/invoice-templates/invoice-templates.service.ts
  const defaultIds = ['standard_local', 'standard_international', 'standard_toners']

  return (
    <div className="flex flex-col min-h-screen">
      <DashboardHeader title="Settings" description="Manage invoice templates and policies" />

      <div className="flex-1 p-4 md:p-6 space-y-4 max-w-4xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Invoice Templates</h2>
            <p className="text-sm text-muted-foreground">Click a template to expand and edit its policies.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-2 text-destructive border-destructive/40 hover:bg-destructive/10" onClick={() => setResetDialogId('all')}>
              <RotateCcw className="h-3.5 w-3.5" /> Reset Defaults
            </Button>
            <Button size="sm" className="gap-2" onClick={handleAddTemplate}>
              <Plus className="h-3.5 w-3.5" /> Add Template
            </Button>
          </div>
        </div>

        {loadError && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
            <span className="font-medium">Couldn't load templates from the server</span> — showing local
            defaults instead, which may not reflect what's actually saved. ({loadError})
          </div>
        )}

        {error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
            {error}
          </div>
        )}

        {templates.map((template, index) => {
          const draft = drafts[template.id]
          if (!draft) return null
          const isOpen = !!expanded[template.id]
          const isSaved = saved[template.id]
          const isDefault = defaultIds.includes(template.id)
          const templateNumber = `Template ${index + 1}`

          return (
            <Card key={template.id} className="bg-card border-border overflow-hidden">
              <button
                className="w-full text-left px-5 py-4 flex items-center gap-3 hover:bg-muted/30 transition-colors"
                onClick={() => setExpanded((prev) => ({ ...prev, [template.id]: !isOpen }))}
              >
                <div className="text-muted-foreground shrink-0">
                  {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </div>
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-foreground">{templateNumber}</span>
                    <span className="text-muted-foreground">·</span>
                    <span className="text-sm text-muted-foreground truncate">
                      {draft.footnote.title || 'Untitled'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                  {isDefault && <Badge variant="secondary" className="text-xs hidden sm:inline-flex">Default</Badge>}
                  <span className="text-xs text-muted-foreground">{draft.footnote.policies.filter(Boolean).length} policies</span>
                </div>
              </button>

              {isOpen && (
                <CardContent className="px-5 pb-5 pt-0 space-y-5 border-t border-border">
                  <div className="flex items-center justify-between pt-4">
                    <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{templateNumber}</span>
                    <div className="flex gap-2">
                      {isDefault && (
                        <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground h-8" onClick={() => setResetDialogId(template.id)}>
                          <RotateCcw className="h-3.5 w-3.5" /> Reset
                        </Button>
                      )}
                      {!isDefault && (
                        <Button variant="destructive" size="sm" className="gap-1.5 h-8" onClick={() => setDeleteDialogId(template.id)}>
                          <Trash2 className="h-3.5 w-3.5" /> Delete
                        </Button>
                      )}
                      <Button size="sm" className="gap-1.5 h-8" onClick={() => handleSave(template.id)}>
                        {isSaved ? <>✓ Saved</> : <><Save className="h-3.5 w-3.5" /> Save</>}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Section Title</Label>
                    <Input
                      value={draft.footnote.title}
                      onChange={(e) => updateDraft(template.id, { ...draft, footnote: { ...draft.footnote, title: e.target.value } })}
                      placeholder="e.g. Terms & Conditions — Retail"
                    />
                    <p className="text-xs text-muted-foreground">
                      This title appears as the footnote heading on printed invoices and as the label in the invoice type dropdown.
                    </p>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Policies ({draft.footnote.policies.filter(Boolean).length})
                      </Label>
                      <Button variant="outline" size="sm" className="gap-1.5 h-7 text-xs" onClick={() => addPolicy(template.id)}>
                        <Plus className="h-3 w-3" /> Add Policy
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {draft.footnote.policies.map((policy, i) => (
                        <div key={i} className="flex gap-2 items-start group">
                          <div className="flex flex-col gap-0.5 pt-2 opacity-40 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => movePolicy(template.id, i, 'up')} disabled={i === 0} className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground disabled:opacity-20 disabled:cursor-not-allowed leading-none" title="Move up">▴</button>
                            <button onClick={() => movePolicy(template.id, i, 'down')} disabled={i === draft.footnote.policies.length - 1} className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground disabled:opacity-20 disabled:cursor-not-allowed leading-none" title="Move down">▾</button>
                          </div>
                          <span className="text-xs text-muted-foreground font-mono pt-2.5 w-5 shrink-0 text-right">{i + 1}.</span>
                          <Textarea value={policy} onChange={(e) => updatePolicy(template.id, i, e.target.value)} placeholder={`Policy ${i + 1}...`} rows={2} className="flex-1 text-sm resize-none" />
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 mt-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => removePolicy(template.id, i)} disabled={draft.footnote.policies.length <= 1}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Closing / Contact Line</Label>
                    <Textarea
                      value={draft.footnote.closing}
                      onChange={(e) => updateDraft(template.id, { ...draft, footnote: { ...draft.footnote, closing: e.target.value } })}
                      placeholder="e.g. Thank you for your business. Contact us at..."
                      rows={2}
                      className="text-sm resize-none"
                    />
                  </div>
                </CardContent>
              )}
            </Card>
          )
        })}

        {templates.length === 0 && (
          <div className="text-center py-12 text-muted-foreground border border-dashed border-border rounded-lg">
            <FileText className="h-8 w-8 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No templates yet.</p>
            <Button variant="outline" size="sm" className="mt-3 gap-2" onClick={handleAddTemplate}>
              <Plus className="h-3.5 w-3.5" /> Add your first template
            </Button>
          </div>
        )}
      </div>

      <AlertDialog open={deleteDialogId !== null} onOpenChange={() => setDeleteDialogId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete template?</AlertDialogTitle>
            <AlertDialogDescription>This template will be permanently removed. Invoices already created with it will still show their saved policies.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteDialogId && handleDelete(deleteDialogId)} className="bg-destructive text-white hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={resetDialogId !== null} onOpenChange={() => setResetDialogId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset to defaults?</AlertDialogTitle>
            <AlertDialogDescription>
              {resetDialogId === 'all'
                ? 'All default templates will be restored. Custom templates will be removed.'
                : 'This template will be reset to its original default policies. This cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => resetDialogId && handleReset(resetDialogId)} className="bg-destructive text-white hover:bg-destructive/90">Reset</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
