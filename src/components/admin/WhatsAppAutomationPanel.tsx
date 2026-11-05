'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  FileText,
  MessageCircle,
  Pause,
  Play,
  RefreshCw,
  Send,
  Sparkles,
} from 'lucide-react'
import { getAdminApiHeaders } from '@/lib/admin-api'
import type {
  WhatsAppAutomationConfig,
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

export interface MetaTemplateItem {
  id: string
  template_code: string
  meta_template_name: string
  category: string
  language: string
  header_text?: string | null
  body_text: string
  footer_text?: string | null
  variables: string[]
  active: boolean
  approval_status: string
  has_flow?: boolean
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

export function WhatsAppAutomationPanel() {
  const [config, setConfig] = useState<WhatsAppAutomationConfig>({ enabled: false, templates: [] })
  const [readiness, setReadiness] = useState<Readiness | null>(null)
  const [metaTemplates, setMetaTemplates] = useState<MetaTemplateItem[]>([])

  const [selectedTemplateName, setSelectedTemplateName] = useState<string>('')
  const [sendPhone, setSendPhone] = useState<string>('9406633778')
  const [sendValues, setSendValues] = useState<string[]>([])

  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const headers = await getAdminApiHeaders()
      const response = await fetch('/api/admin/whatsapp/templates', { headers, cache: 'no-store' })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Could not load WhatsApp settings.')

      setConfig(result.config || { enabled: false, templates: [] })
      setReadiness(result.readiness)

      const dbTpls: MetaTemplateItem[] = result.allTemplates || []
      setMetaTemplates(dbTpls)

      // Default select testflow or first template
      if (!selectedTemplateName && dbTpls.length > 0) {
        const testflowTpl = dbTpls.find((t) => t.template_code === 'testflow' || t.meta_template_name === 'testflow')
        setSelectedTemplateName(testflowTpl ? testflowTpl.meta_template_name : dbTpls[0].meta_template_name)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load WhatsApp settings.')
    } finally {
      setLoading(false)
    }
  }, [selectedTemplateName])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const syncMetaTemplates = async () => {
    setSyncing(true)
    setError(null)
    setNotice(null)
    try {
      const headers = await getAdminApiHeaders()
      const res = await fetch('/api/admin/whatsapp/sync', { method: 'POST', headers })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to sync with Meta WhatsApp Manager')

      if (Array.isArray(data.templates)) {
        setMetaTemplates(data.templates)
        const testflowTpl = data.templates.find((t: any) => t.template_code === 'testflow' || t.meta_template_name === 'testflow')
        if (testflowTpl) {
          setSelectedTemplateName(testflowTpl.meta_template_name)
        } else if (data.templates[0]) {
          setSelectedTemplateName(data.templates[0].meta_template_name)
        }
      }
      setNotice(data.message || 'Successfully synced all templates from Meta!')
    } catch (err: any) {
      setError(err.message || 'Could not sync templates from Meta.')
    } finally {
      setSyncing(false)
    }
  }

  // Combined list of all templates available to send
  const availableTemplates = useMemo(() => {
    if (metaTemplates.length > 0) {
      return metaTemplates.map((t) => {
        const cleanVars = (t.variables || []).filter((v) => v !== '__has_flow__')
        const hasFlow = Boolean(
          t.category === 'FLOW' ||
          t.variables?.includes('__has_flow__') ||
          (t.meta_template_name || '').toLowerCase().includes('flow')
        )
        return {
          id: t.meta_template_name || t.template_code,
          name: t.meta_template_name,
          category: t.category || 'UTILITY',
          language: t.language || 'en',
          body: t.body_text || '',
          header: t.header_text || null,
          footer: t.footer_text || null,
          hasFlow,
          variables: cleanVars,
          approvalStatus: t.approval_status || 'APPROVED',
        }
      })
    }

    // Fallback if DB empty
    return [
      {
        id: 'testflow',
        name: 'testflow',
        category: 'FLOW',
        language: 'en',
        body: 'Thank you for your enquiry. Book your cab in 30 seconds below.',
        header: '🚖 Maruti Cab Booking',
        footer: 'Maruti Cab Khargone',
        hasFlow: true,
        variables: [],
        approvalStatus: 'APPROVED',
      },
      ...config.templates.map((t) => ({
        id: t.metaName || t.id,
        name: t.metaName,
        category: 'UTILITY',
        language: t.language,
        body: t.body,
        header: null,
        footer: null,
        hasFlow: (t.metaName || '').toLowerCase().includes('flow'),
        variables: t.parameterFields,
        approvalStatus: t.approved ? 'APPROVED' : 'PENDING',
      })),
    ]
  }, [metaTemplates, config.templates])

  const currentTemplate = useMemo(() => {
    return availableTemplates.find((t) => t.name === selectedTemplateName) || availableTemplates[0]
  }, [availableTemplates, selectedTemplateName])

  // Sync parameter inputs when template changes
  useEffect(() => {
    if (currentTemplate) {
      setSendValues(currentTemplate.variables.map(() => ''))
    }
  }, [currentTemplate])

  const fillSampleData = () => {
    if (!currentTemplate) return
    const samples = ['Avadh Bajaj', 'KC4821', 'Khargone to Indore', '2026-11-06', 'Rs 2,200', 'Dzire Sedan']
    setSendValues(currentTemplate.variables.map((_, i) => samples[i] || `Value ${i + 1}`))
  }

  const toggleAutomation = () => {
    setConfig((current) => ({ ...current, enabled: !current.enabled }))
  }

  const saveAutomationSettings = async () => {
    setSaving(true)
    setError(null)
    setNotice(null)
    try {
      const headers = await getAdminApiHeaders()
      const response = await fetch('/api/admin/whatsapp/templates', {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ config }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Could not save settings.')
      setConfig(result.config)
      setNotice('Automation settings saved.')
    } catch (err: any) {
      setError(err.message || 'Could not save settings.')
    } finally {
      setSaving(false)
    }
  }

  const sendTemplate = async () => {
    if (!currentTemplate) return
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
          templateName: currentTemplate.name,
          parameters: sendValues,
        }),
      })

      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Failed to send template message.')

      setNotice(`✅ Template "${currentTemplate.name}" sent successfully to +91 ${sendPhone.replace(/\D/g, '').slice(-10)}! (Message ID: ${result.messageId || 'Delivered'})`)
    } catch (err: any) {
      setError(err.message || 'Could not send this template.')
    } finally {
      setSending(false)
    }
  }

  return (
    <section className="space-y-6">
      {/* Top Header Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-black text-slate-900 tracking-tight">WhatsApp Management & Templates</h2>
            <span className="rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold px-2.5 py-0.5 border border-emerald-300">
              {availableTemplates.length} Templates Active
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500 font-medium">
            Send any Meta-approved template manually (including Flow buttons) or configure automatic triggers.
          </p>
        </div>

        {/* Sync Button */}
        <button
          type="button"
          onClick={syncMetaTemplates}
          disabled={syncing}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-black bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl transition shadow-xs cursor-pointer active:scale-98 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
          <span>{syncing ? 'Syncing from Meta…' : '🔄 Sync All Templates from Meta'}</span>
        </button>
      </div>

      {/* Account Status Strip */}
      <div className={`rounded-2xl border p-4 sm:p-5 ${readiness?.hasCredentials ? 'border-emerald-200 bg-emerald-50/70' : 'border-amber-200 bg-amber-50'}`}>
        <div className="flex items-start gap-3">
          <AlertTriangle className={`mt-0.5 h-5 w-5 shrink-0 ${readiness?.hasCredentials ? 'text-emerald-700' : 'text-amber-700'}`} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-extrabold text-slate-950 text-sm">
                WhatsApp Cloud API: {readiness?.hasCredentials ? 'Configured & Connected' : 'Checking Credentials'}
              </h3>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-slate-700">
              Registered WhatsApp Business Phone: <strong>+91 72823 16090</strong> (ID: 1379464058575093). Manual sends are fully enabled.
            </p>
            {readiness && (
              <div className="mt-2.5 flex flex-wrap gap-2 text-[11px] font-bold">
                <span className="rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-slate-700">Phone ID: 1379464058575093</span>
                <span className="rounded-full border border-emerald-200 bg-white px-2.5 py-0.5 text-emerald-800">Credentials: Active</span>
                <span className="rounded-full border border-amber-200 bg-white px-2.5 py-0.5 text-amber-900">Quality: {readiness.qualityRating}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Global Toast Alerts */}
      {error && (
        <div role="alert" className="rounded-2xl border border-rose-300 bg-rose-50 p-4 text-xs font-bold text-rose-800 flex items-center justify-between shadow-xs">
          <span>❌ {error}</span>
          <button type="button" onClick={() => setError(null)} className="text-rose-600 hover:text-rose-900 ml-3">✕</button>
        </div>
      )}
      {notice && (
        <div role="status" className="rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-xs font-bold text-emerald-800 flex items-center justify-between shadow-xs">
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice(null)} className="text-emerald-600 hover:text-emerald-900 ml-3">✕</button>
        </div>
      )}

      {/* Main 2-Column Grid */}
      <div className="grid gap-6 lg:grid-cols-12 items-start">
        {/* Left Column: All Meta Templates List & Automations (7 cols) */}
        <div className="space-y-6 lg:col-span-7">
          {/* Automatic Triggers Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm">Booking Automations</h3>
                <p className="text-xs text-slate-500 font-medium">Automatic WhatsApp status updates for bookings.</p>
              </div>
              <button
                type="button"
                onClick={toggleAutomation}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-extrabold transition cursor-pointer ${
                  config.enabled ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' : 'bg-slate-100 text-slate-700 border border-slate-300'
                }`}
              >
                {config.enabled ? <Check className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
                {config.enabled ? 'Automation ON' : 'Automation OFF'}
              </button>
            </div>

            <div className="mt-4 grid gap-2.5 sm:grid-cols-2 text-xs">
              {TRIGGERS.slice(0, 6).map((trigger) => (
                <div key={trigger.id} className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 flex flex-col justify-between">
                  <div className="font-bold text-slate-800">{trigger.label}</div>
                  <div className="text-[11px] text-slate-500 mt-1">{trigger.description}</div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={saveAutomationSettings}
              disabled={saving}
              className="mt-4 inline-flex min-h-9 items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-600 px-4 text-xs font-bold text-slate-950 transition cursor-pointer"
            >
              {saving ? 'Saving…' : 'Save Automation Settings'}
            </button>
          </div>

          {/* All Synced Templates List */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm">Meta Approved Templates</h3>
                <p className="text-xs text-slate-500 font-medium">
                  {availableTemplates.length} templates fetched from Meta Facebook Business Manager.
                </p>
              </div>
              <button
                type="button"
                onClick={syncMetaTemplates}
                disabled={syncing}
                className="text-xs font-bold text-amber-800 hover:underline inline-flex items-center gap-1"
              >
                <RefreshCw className={`w-3 h-3 ${syncing ? 'animate-spin' : ''}`} /> Refresh
              </button>
            </div>

            {loading ? (
              <div className="py-8 text-center text-xs text-slate-500">Loading templates…</div>
            ) : availableTemplates.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                No templates found. Click &quot;🔄 Sync All Templates from Meta&quot; above.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[580px] overflow-y-auto pr-1">
                {availableTemplates.map((tpl) => {
                  const isSelected = tpl.name === selectedTemplateName
                  return (
                    <div
                      key={tpl.id}
                      onClick={() => setSelectedTemplateName(tpl.name)}
                      className={`rounded-xl border p-3.5 transition cursor-pointer flex flex-col justify-between gap-2 ${
                        isSelected
                          ? 'border-amber-500 bg-amber-50/50 shadow-xs ring-1 ring-amber-500'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2 font-mono font-bold text-xs text-slate-900">
                          <span>{tpl.name}</span>
                          {tpl.hasFlow && (
                            <span className="rounded bg-purple-100 text-purple-800 border border-purple-300 text-[10px] font-sans font-black px-1.5 py-0.2">
                              📱 WhatsApp Flow
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] font-bold">
                          <span className="rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5">
                            {tpl.approvalStatus}
                          </span>
                          <span className="rounded-full bg-slate-100 text-slate-700 px-2 py-0.5 uppercase">
                            {tpl.language}
                          </span>
                        </div>
                      </div>

                      {tpl.body && (
                        <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
                          {tpl.body}
                        </p>
                      )}

                      <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px]">
                        <span className="text-slate-400">
                          {tpl.variables.length > 0 ? `${tpl.variables.length} parameter(s)` : 'Zero parameters'}
                        </span>
                        <span className={`font-bold ${isSelected ? 'text-amber-800' : 'text-slate-500'}`}>
                          {isSelected ? '✓ Selected to Send' : 'Select to Send ➔'}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Send Any Template Manually (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sticky top-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
                <Send className="h-4 w-4" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm">Send Template to Any Number</h3>
                <p className="text-[11px] text-slate-500 font-medium">Instant test send directly via WhatsApp Cloud API.</p>
              </div>
            </div>

            <div className="mt-4 space-y-4">
              {/* Template Selector Dropdown */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Selected Meta Template
                </label>
                <select
                  value={currentTemplate?.name || ''}
                  onChange={(e) => setSelectedTemplateName(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs font-bold text-slate-900 focus:border-amber-500 focus:outline-hidden"
                >
                  {availableTemplates.map((t) => (
                    <option key={t.id} value={t.name}>
                      {t.name} {t.hasFlow ? '📱 [FLOW]' : ''} ({t.category})
                    </option>
                  ))}
                </select>
              </div>

              {/* Template Flow Banner */}
              {currentTemplate?.hasFlow && (
                <div className="rounded-xl border border-purple-200 bg-purple-50 p-3 text-xs text-purple-900 flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-purple-700 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold">Interactive WhatsApp Flow Template</div>
                    <div className="text-[11px] text-purple-700 mt-0.5">
                      Recipient will receive this message with a native <strong>&quot;Book Cab&quot;</strong> button that opens your interactive booking flow form inside WhatsApp!
                    </div>
                  </div>
                </div>
              )}

              {/* Destination Phone Input with 1-click Preset */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">
                    Recipient WhatsApp Number
                  </label>
                  <button
                    type="button"
                    onClick={() => setSendPhone('9406633778')}
                    className="text-[11px] font-bold text-amber-800 hover:underline"
                  >
                    +91 94066 33778
                  </button>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">+91</span>
                  <input
                    value={sendPhone}
                    onChange={(e) => setSendPhone(e.target.value)}
                    placeholder="9406633778"
                    inputMode="tel"
                    className="h-10 w-full rounded-xl border border-slate-300 pl-10 pr-3 text-sm font-mono font-bold text-slate-900 focus:border-amber-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Dynamic Variables Inputs if applicable */}
              {currentTemplate && currentTemplate.variables.length > 0 ? (
                <div className="space-y-2.5 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">
                      Template Variables ({currentTemplate.variables.length})
                    </span>
                    <button
                      type="button"
                      onClick={fillSampleData}
                      className="text-[11px] font-bold text-amber-800 hover:underline"
                    >
                      Fill Sample Data
                    </button>
                  </div>
                  {currentTemplate.variables.map((field, idx) => (
                    <div key={`${currentTemplate.name}-var-${idx}`}>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                        Placeholder {`{{${idx + 1}}}`} ({field.replace('param_', '')})
                      </label>
                      <input
                        value={sendValues[idx] || ''}
                        onChange={(e) => {
                          const val = e.target.value
                          setSendValues((prev) => prev.map((v, i) => (i === idx ? val : v)))
                        }}
                        placeholder={`Value for {{${idx + 1}}}`}
                        className="h-9 w-full rounded-xl border border-slate-200 px-3 text-xs text-slate-900 focus:border-amber-500 focus:outline-hidden"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-2.5 text-center text-xs text-slate-500">
                  ✓ No parameters needed for this template.
                </div>
              )}

              {/* Message Preview Box */}
              {currentTemplate?.body && (
                <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 text-xs text-slate-700 font-mono">
                  <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">Message Preview</div>
                  <div className="whitespace-pre-wrap leading-relaxed text-[11px]">
                    {currentTemplate.body}
                  </div>
                </div>
              )}

              {/* Send Button */}
              <button
                type="button"
                onClick={() => void sendTemplate()}
                disabled={!sendPhone || sendPhone.replace(/\D/g, '').length < 10 || sending}
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-sm font-extrabold text-white transition shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="h-4 w-4" />
                {sending ? 'Sending to WhatsApp…' : `Send "${currentTemplate?.name || 'Template'}" to ${sendPhone || 'Number'}`}
              </button>

              <p className="text-[11px] text-center text-slate-400">
                Messages are routed through Meta Cloud API for +91 72823 16090.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
