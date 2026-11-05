'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Check, FileText, MessageCircle, Pause, Play, Plus, Save, Send, Trash2 } from 'lucide-react'
import { getAdminApiHeaders } from '@/lib/admin-api'
import type {
  WhatsAppAutomationConfig,
  WhatsAppTemplate,
  WhatsAppTrigger,
} from '@/lib/whatsapp-automation'

interface Readiness {
  qualityRating: string
  verificationStatus: string
  hasCredentials: boolean
  canSend: boolean
  mockEnabled?: boolean
  automationEnvEnabled: boolean
}

const TRIGGERS: { id: WhatsAppTrigger; label: string; description: string }[] = [
  { id: 'booking_received', label: 'Booking received after payment', description: 'After advance payment verification.' },
  { id: 'match_confirmed', label: 'Match confirmed', description: 'After dispatch pairs both paid Match Deal bookings.' },
  { id: 'no_match', label: 'No match by cutoff', description: 'At the Match Deal decision cutoff.' },
  { id: 'refund_processed', label: 'Refund processed', description: 'When the advance refund is requested or processed.' },
  { id: 'ride_reminder', label: 'Ride reminder', description: 'Two hours before the fixed pickup time.' },
  { id: 'feedback_request', label: 'Feedback request', description: 'After dispatch marks the ride completed.' },
  { id: 'booking_received', label: 'Booking request received (legacy)', description: 'Legacy workflow compatibility.' },
  { id: 'booking_waiting', label: 'Booking waiting for availability', description: 'When a request is waiting for a cab.' },
  { id: 'booking_confirmed', label: 'Booking confirmed', description: 'When dispatch confirms a booking.' },
  { id: 'booking_cancelled', label: 'Booking cancelled', description: 'When dispatch cancels a booking.' },
]

const TEMPLATE_FIELDS = [
  'passenger_name', 'booking_ref', 'route', 'drop_name', 'travel_date', 'pickup_time', 'total_fare', 'vehicle', 'status',
  'status_link', 'booking_message', 'advance_amount', 'balance_amount', 'driver_name', 'driver_phone', 'vehicle_number', 'pickup_address',
] as const

type Draft = Omit<WhatsAppTemplate, 'id'>

const EMPTY_DRAFT: Draft = {
  label: '',
  metaName: '',
  language: 'en',
  trigger: 'booking_received',
  body: '',
  parameterFields: [],
  approved: false,
  enabled: false,
}

export function WhatsAppAutomationPanel({ onSwitchToTemplates }: { onSwitchToTemplates?: () => void } = {}) {
  const [config, setConfig] = useState<WhatsAppAutomationConfig>({ enabled: false, templates: [] })
  const [readiness, setReadiness] = useState<Readiness | null>(null)
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [parameterText, setParameterText] = useState('')
  const [selectedTemplateId, setSelectedTemplateId] = useState('')
  const [sendPhone, setSendPhone] = useState('')
  const [sendValues, setSendValues] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const loadConfig = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const headers = await getAdminApiHeaders()
      const response = await fetch('/api/admin/whatsapp/templates', { headers, cache: 'no-store' })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Could not load WhatsApp settings.')
      setConfig(result.config)
      setReadiness(result.readiness)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load WhatsApp settings.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void loadConfig() }, [loadConfig])

  const approvedTemplates = useMemo(
    () => config.templates.filter((template) => template.approved),
    [config.templates]
  )
  const selectedTemplate = approvedTemplates.find((template) => template.id === selectedTemplateId) || approvedTemplates[0]
  const canEnable = Boolean(readiness?.canSend && readiness.automationEnvEnabled)

  useEffect(() => {
    const nextTemplate = selectedTemplateId
      ? approvedTemplates.find((template) => template.id === selectedTemplateId) || approvedTemplates[0]
      : approvedTemplates[0]
    if (!selectedTemplateId && nextTemplate) setSelectedTemplateId(nextTemplate.id)
    setSendValues(nextTemplate ? nextTemplate.parameterFields.map(() => '') : [])
  }, [approvedTemplates, selectedTemplateId])

  const resetDraft = () => {
    setDraft(EMPTY_DRAFT)
    setEditingId(null)
    setParameterText('')
  }

  const saveConfig = async (nextConfig: WhatsAppAutomationConfig) => {
    setSaving(true)
    setError(null)
    setNotice(null)
    try {
      const headers = await getAdminApiHeaders()
      const response = await fetch('/api/admin/whatsapp/templates', {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: nextConfig }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Could not save WhatsApp settings.')
      setConfig(result.config)
      setReadiness(result.readiness)
      setNotice('WhatsApp settings saved.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save WhatsApp settings.')
    } finally {
      setSaving(false)
    }
  }

  const addOrUpdateTemplate = () => {
    setError(null)
    if (draft.label.trim().length < 2 || !/^[a-z0-9_]{1,128}$/.test(draft.metaName)) {
      setError('Add a label and the exact lowercase template name approved in WhatsApp Manager.')
      return
    }
    if (draft.body.trim().length < 2) {
      setError('Add the approved message text so dispatch can identify this template.')
      return
    }

    const parameterFields = parameterText.split(',').map((value) => value.trim()).filter(Boolean)
    if (parameterFields.length > 20 || parameterFields.some((field) => !TEMPLATE_FIELDS.includes(field as typeof TEMPLATE_FIELDS[number]))) {
      setError(`Template parameters must use these fields: ${TEMPLATE_FIELDS.join(', ')}.`)
      return
    }

    const item: WhatsAppTemplate = {
      ...draft,
      id: editingId || crypto.randomUUID(),
      label: draft.label.trim(),
      metaName: draft.metaName.trim(),
      body: draft.body.trim(),
      parameterFields,
    }
    const templates = editingId
      ? config.templates.map((template) => template.id === editingId ? item : template)
      : [...config.templates, item]
    setConfig((current) => ({ ...current, templates }))
    resetDraft()
    setNotice('Template is ready to save. It will only send after Meta approval and account readiness.')
  }

  const editTemplate = (template: WhatsAppTemplate) => {
    const { id, ...rest } = template
    setEditingId(id)
    setDraft(rest)
    setParameterText(template.parameterFields.join(', '))
    setNotice(null)
  }

  const removeTemplate = (id: string) => {
    setConfig((current) => ({ ...current, templates: current.templates.filter((item) => item.id !== id) }))
    if (editingId === id) resetDraft()
  }

  const toggleAutomation = () => {
    if (!canEnable && !config.enabled) {
      setError('Automation is paused until number verification, quality, credentials, and the server-side enable switch are ready.')
      return
    }
    setConfig((current) => ({ ...current, enabled: !current.enabled }))
  }

  const sendTemplate = async () => {
    if (!selectedTemplate) return
    setSending(true)
    setError(null)
    setNotice(null)
    try {
      const headers = await getAdminApiHeaders()
      const response = await fetch('/api/admin/whatsapp/send', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: sendPhone,
          templateId: selectedTemplate.id,
          parameters: sendValues,
        }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Could not send this template.')
      setNotice(`Template sent to ${sendPhone}.`)
      setSendPhone('')
      setSendValues(selectedTemplate.parameterFields.map(() => ''))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send this template.')
    } finally {
      setSending(false)
    }
  }

  return (
    <section className="space-y-5">
      <div className={`rounded-2xl border p-4 sm:p-5 ${readiness?.canSend ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
        <div className="flex items-start gap-3">
          <AlertTriangle className={`mt-0.5 h-5 w-5 shrink-0 ${readiness?.canSend ? 'text-emerald-700' : 'text-amber-700'}`} />
          <div className="min-w-0 flex-1">
            <h2 className="font-extrabold text-slate-950">{readiness?.mockEnabled ? 'WhatsApp mock mode is active' : readiness?.canSend ? 'WhatsApp account is ready' : 'WhatsApp sending is paused'}</h2>
            <p className="mt-1 text-sm leading-relaxed text-slate-700">
              {readiness?.mockEnabled
                ? 'Messages are recorded in local mock mode and are not sent to Meta.'
                : readiness?.canSend
                ? 'Account checks passed. Template sends still require an approved template and the server-side automation switch for automatic messages.'
                : 'Resolve the account checks shown below in Meta before enabling automatic or manual template sends.'}
            </p>
            {readiness && (
              <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
                <span className="rounded-full border border-rose-200 bg-white px-3 py-1 text-rose-800">Quality: {readiness.qualityRating}</span>
                <span className="rounded-full border border-amber-200 bg-white px-3 py-1 text-amber-900">Verification: {readiness.verificationStatus}</span>
                <span className={`rounded-full border bg-white px-3 py-1 ${readiness.hasCredentials ? 'border-emerald-200 text-emerald-800' : 'border-slate-200 text-slate-600'}`}>
                  Server credentials: {readiness.hasCredentials ? 'configured' : 'missing'}
                </span>
              {readiness.mockEnabled && <span className="rounded-full border border-sky-200 bg-white px-3 py-1 text-sky-800">Mock mode · no Meta sends</span>}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick link to live Meta Templates Panel with Sync */}
      <div className="bg-amber-500/10 border border-amber-300 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900">Looking for all WhatsApp Message Templates & Sync?</h3>
            <p className="text-xs text-slate-600 font-medium">All live Meta approved templates, live preview, and the &quot;Sync Templates&quot; button are in the <strong>Templates</strong> tab.</p>
          </div>
        </div>
        {onSwitchToTemplates && (
          <button
            onClick={onSwitchToTemplates}
            type="button"
            className="px-4 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl transition shadow-xs cursor-pointer whitespace-nowrap"
          >
            Open Templates Tab (Sync & All Templates) ➔
          </button>
        )}
      </div>

      {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      {notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <div className="space-y-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  {config.enabled ? <Play className="h-4 w-4 text-emerald-700" /> : <Pause className="h-4 w-4 text-slate-500" />}
                  <h2 className="font-extrabold text-slate-900">Booking automations</h2>
                </div>
                <p className="mt-1 text-xs text-slate-500">Use approved templates for booking status updates.</p>
              </div>
              <button
                type="button"
                aria-pressed={config.enabled}
                disabled={!canEnable && !config.enabled}
                onClick={toggleAutomation}
                className={`min-h-10 rounded-xl px-4 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50 ${config.enabled ? 'bg-emerald-100 text-emerald-900' : 'bg-slate-100 text-slate-700'}`}
              >
                {config.enabled ? 'Automation on' : 'Automation off'}
              </button>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {TRIGGERS.map((trigger) => {
                const template = config.templates.find((item) => item.trigger === trigger.id && item.enabled && item.approved)
                return (
                  <div key={trigger.id} className="rounded-xl border border-slate-200 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold text-slate-800">{trigger.label}</span>
                      {template ? <Check className="h-4 w-4 text-emerald-700" /> : <span className="text-[10px] font-bold uppercase text-slate-400">Not set</span>}
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{template?.label || trigger.description}</p>
                  </div>
                )
              })}
            </div>
            <button
              type="button"
              onClick={() => void saveConfig(config)}
              disabled={saving || loading}
              className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl bg-amber-400 px-4 text-sm font-extrabold text-slate-950 hover:bg-amber-500 disabled:opacity-50"
            >
              <Save className="h-4 w-4" /> {saving ? 'Saving…' : 'Save automation settings'}
            </button>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-extrabold text-slate-900">Message templates</h2>
                <p className="mt-1 text-xs text-slate-500">Add the exact names and text of templates approved in WhatsApp Manager.</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{config.templates.length}</span>
            </div>

            {loading ? (
              <p className="py-8 text-center text-sm text-slate-500">Loading templates…</p>
            ) : config.templates.length === 0 ? (
              <p className="mt-4 rounded-xl border border-dashed border-slate-300 p-5 text-center text-sm text-slate-500">No templates added yet. Add approved Meta templates below to configure booking messages.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {config.templates.map((template) => (
                  <article key={template.id} className="rounded-xl border border-slate-200 p-3.5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-bold text-slate-900">{template.label}</h3>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${template.approved ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>{template.approved ? 'Meta approved' : 'Draft'}</span>
                          {template.enabled && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-900">Trigger on</span>}
                        </div>
                        <p className="mt-1 text-xs text-slate-500"><code>{template.metaName}</code> · {template.language} · {TRIGGERS.find((item) => item.id === template.trigger)?.label}</p>
                        <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{template.body}</p>
                        {template.parameterFields.length > 0 && <p className="mt-2 text-[11px] text-slate-500">Parameters: {template.parameterFields.join(', ')}</p>}
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <button type="button" onClick={() => editTemplate(template)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold hover:bg-slate-50">Edit</button>
                        <button type="button" onClick={() => removeTemplate(template.id)} aria-label={`Delete ${template.label}`} className="rounded-lg border border-rose-200 p-2 text-rose-700 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={() => void saveConfig(config)}
              disabled={saving || loading}
              className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-300 px-4 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <Save className="h-4 w-4" /> Save templates
            </button>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex items-center gap-2">
              <Plus className="h-4 w-4 text-amber-700" />
              <h2 className="font-extrabold text-slate-900">{editingId ? 'Edit template' : 'Add template'}</h2>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="text-xs font-semibold text-slate-600">Admin label
                <input value={draft.label} onChange={(event) => setDraft({ ...draft, label: event.target.value })} placeholder="Booking received" className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-900" />
              </label>
              <label className="text-xs font-semibold text-slate-600">Approved Meta template name
                <input value={draft.metaName} onChange={(event) => setDraft({ ...draft, metaName: event.target.value })} placeholder="booking_received" className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-900" />
              </label>
              <label className="text-xs font-semibold text-slate-600">Language code
                <input value={draft.language} onChange={(event) => setDraft({ ...draft, language: event.target.value })} placeholder="en" className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-900" />
              </label>
              <label className="text-xs font-semibold text-slate-600">Automation trigger
                <select value={draft.trigger} onChange={(event) => setDraft({ ...draft, trigger: event.target.value as WhatsAppTrigger })} className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900">
                  {TRIGGERS.map((trigger) => <option key={trigger.id} value={trigger.id}>{trigger.label}</option>)}
                </select>
              </label>
              <label className="text-xs font-semibold text-slate-600 sm:col-span-2">Message text / preview
                <textarea value={draft.body} onChange={(event) => setDraft({ ...draft, body: event.target.value })} rows={3} placeholder="Paste the approved message body. Use {{1}}, {{2}} for parameters." className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm text-slate-900" />
              </label>
              <label className="text-xs font-semibold text-slate-600 sm:col-span-2">Parameter fields, in placeholder order
                <input value={parameterText} onChange={(event) => setParameterText(event.target.value)} placeholder="passenger_name, booking_ref, travel_date" className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-900" />
                <span className="mt-1 block font-normal text-slate-500">Allowed: {TEMPLATE_FIELDS.join(', ')}</span>
              </label>
            </div>
            <div className="mt-4 flex flex-wrap gap-4 text-sm">
              <label className="inline-flex items-center gap-2 text-slate-700"><input type="checkbox" checked={draft.approved} onChange={(event) => setDraft({ ...draft, approved: event.target.checked })} /> Approved in WhatsApp Manager</label>
              <label className="inline-flex items-center gap-2 text-slate-700"><input type="checkbox" checked={draft.enabled} onChange={(event) => setDraft({ ...draft, enabled: event.target.checked })} /> Use for this trigger</label>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={addOrUpdateTemplate} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-bold text-white hover:bg-slate-700"><Plus className="h-4 w-4" />{editingId ? 'Update template' : 'Add template'}</button>
              {editingId && <button type="button" onClick={resetDraft} className="min-h-10 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-600">Cancel edit</button>}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex items-center gap-2"><MessageCircle className="h-4 w-4 text-emerald-700" /><h2 className="font-extrabold text-slate-900">Send an approved template</h2></div>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">One customer at a time. Use only the saved, Meta-approved template. This panel stays disabled while account checks are unresolved.</p>

          {approvedTemplates.length === 0 ? (
            <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-500">Add and mark an approved template to prepare a message.</p>
          ) : (
            <div className="mt-4 space-y-3">
              <label className="block text-xs font-semibold text-slate-600">Template
                <select value={selectedTemplate?.id || ''} onChange={(event) => setSelectedTemplateId(event.target.value)} className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900">
                  {approvedTemplates.map((template) => <option key={template.id} value={template.id}>{template.label}</option>)}
                </select>
              </label>
              <label className="block text-xs font-semibold text-slate-600">Customer WhatsApp number
                <input value={sendPhone} onChange={(event) => setSendPhone(event.target.value)} placeholder="10-digit Indian mobile number" inputMode="tel" className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-900" />
              </label>
              {selectedTemplate?.parameterFields.map((field, index) => (
                <label key={`${selectedTemplate.id}-${field}-${index}`} className="block text-xs font-semibold capitalize text-slate-600">{field.replaceAll('_', ' ')} · {'{{' + (index + 1) + '}}'}
                  <input value={sendValues[index] || ''} onChange={(event) => setSendValues((values) => values.map((value, currentIndex) => currentIndex === index ? event.target.value : value))} className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-900" />
                </label>
              ))}
              <button
                type="button"
                onClick={() => void sendTemplate()}
                disabled={!readiness?.canSend || !sendPhone || sending}
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-extrabold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Send className="h-4 w-4" />{sending ? 'Sending…' : 'Send template'}
              </button>
            </div>
          )}
          <button type="button" onClick={() => void loadConfig()} disabled={loading} className="mt-4 text-xs font-bold text-slate-500 underline">Refresh account status</button>
        </div>
      </div>
    </section>
  )
}
