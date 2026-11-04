'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  FileText,
  Save,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  MessageSquare,
  Sparkles,
  Layers,
  ChevronRight,
  Eye,
} from 'lucide-react'

interface WhatsAppTemplate {
  id: string
  template_code: string
  meta_template_name?: string
  category: string
  header_text?: string
  body_text: string
  footer_text?: string
  language: string
  variables?: string[]
  active: boolean
  approval_status?: string
  updated_at?: string
}

export function AdminTemplatesPanel() {
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [savingCode, setSavingCode] = useState<string | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<string>('booking_received')
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const fetchTemplates = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/templates')
      const json = await res.json()
      if (res.ok && json.templates) {
        setTemplates(json.templates)
      } else {
        setMsg({ type: 'error', text: json.error || 'Failed to fetch templates' })
      }
    } catch (e: any) {
      setMsg({ type: 'error', text: e?.message || 'Network error' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTemplates()
  }, [fetchTemplates])

  const activeTemplate = templates.find((t) => t.template_code === selectedTemplate)

  const handleUpdateField = (field: keyof WhatsAppTemplate, value: any) => {
    setTemplates((prev) =>
      prev.map((t) => (t.template_code === selectedTemplate ? { ...t, [field]: value } : t))
    )
  }

  const handleSave = async () => {
    if (!activeTemplate) return
    setSavingCode(activeTemplate.template_code)
    setMsg(null)
    try {
      const res = await fetch('/api/admin/templates', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template_code: activeTemplate.template_code,
          header_text: activeTemplate.header_text,
          body_text: activeTemplate.body_text,
          footer_text: activeTemplate.footer_text,
          active: activeTemplate.active,
        }),
      })
      const json = await res.json()
      if (res.ok) {
        setMsg({ type: 'success', text: `Template "${activeTemplate.template_code}" saved successfully!` })
        setTimeout(() => setMsg(null), 3000)
      } else {
        setMsg({ type: 'error', text: json.error || 'Save failed' })
      }
    } catch (e: any) {
      setMsg({ type: 'error', text: e?.message || 'Network error' })
    } finally {
      setSavingCode(null)
    }
  }

  // Generate dummy preview
  const previewBody = (activeTemplate?.body_text || '')
    .replace(/\{\{1\}\}/g, 'John Doe')
    .replace(/\{\{2\}\}/g, 'MKC-241104-A9B2')
    .replace(/\{\{3\}\}/g, 'Khargone to Indore')
    .replace(/\{\{4\}\}/g, '04 Nov 2026, 08:00 AM')
    .replace(/\{\{5\}\}/g, '₹2,200')
    .replace(/\{\{6\}\}/g, '₹500')
    .replace(/\{\{7\}\}/g, '04 Nov 2026, 02:00 AM')
    .replace(/\{\{8\}\}/g, 'Rajesh Sharma')
    .replace(/\{\{9\}\}/g, '+91 98765 43210')
    .replace(/\{\{10\}\}/g, 'MP-10-CA-1001 (Dzire White)')
    .replace(/\{\{11\}\}/g, '₹1,700')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-100 text-amber-800 rounded-xl">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight">WhatsApp Message Templates</h2>
              <p className="text-xs text-slate-500 font-medium">
                Live Meta WhatsApp Cloud API utility notification templates (stored in Supabase)
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchTemplates}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {msg && (
        <div
          className={`p-4 rounded-xl border text-xs font-bold flex items-center gap-2 ${
            msg.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          {msg.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-rose-600" />}
          <span>{msg.text}</span>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Template Selector Sidebar */}
        <div className="lg:col-span-4 space-y-2">
          <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
            <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider px-2 py-1 mb-2">
              5 System Templates
            </h3>
            <div className="space-y-1">
              {templates.map((tpl) => {
                const isSelected = tpl.template_code === selectedTemplate
                return (
                  <button
                    key={tpl.id}
                    onClick={() => setSelectedTemplate(tpl.template_code)}
                    className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-amber-500 text-slate-950 font-bold border-amber-600 shadow-xs'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-mono font-black">{tpl.template_code}</div>
                      <div className="text-[11px] opacity-80 mt-0.5 capitalize">
                        {tpl.meta_template_name || tpl.template_code.replace(/_/g, ' ')}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 opacity-70" />
                  </button>
                )
              })}
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900 space-y-2">
            <div className="flex items-center gap-1.5 font-bold">
              <Sparkles className="w-4 h-4 text-amber-700" />
              <span>Variable Placeholders</span>
            </div>
            <p className="text-[11px] text-amber-800 leading-relaxed">
              Variables in body text are dynamically replaced:
              <br /><code>&#123;&#123;1&#125;&#125;</code> = Passenger Name
              <br /><code>&#123;&#123;2&#125;&#125;</code> = Booking Number
              <br /><code>&#123;&#123;3&#125;&#125;</code> = Route
              <br /><code>&#123;&#123;4&#125;&#125;</code> = Departure Date & Time
              <br /><code>&#123;&#123;5&#125;&#125;</code> = Total Fare
              <br /><code>&#123;&#123;6&#125;&#125;</code> = Advance Paid
              <br /><code>&#123;&#123;7&#125;&#125;</code> = Matching Cutoff Deadline
              <br /><code>&#123;&#123;8&#125;&#125;</code> = Driver Name
              <br /><code>&#123;&#123;9&#125;&#125;</code> = Driver Mobile
              <br /><code>&#123;&#123;10&#125;&#125;</code> = Vehicle Plate & Model
              <br /><code>&#123;&#123;11&#125;&#125;</code> = Balance Cash in Cab
            </p>
          </div>
        </div>

        {/* Editor & Preview */}
        {activeTemplate ? (
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                    {activeTemplate.category}
                  </span>
                  <h3 className="text-base font-black text-slate-900 mt-1 font-mono">
                    {activeTemplate.template_code}
                  </h3>
                </div>

                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                    <input
                      type="checkbox"
                      checked={activeTemplate.active}
                      onChange={(e) => handleUpdateField('active', e.target.checked)}
                      className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 w-4 h-4"
                    />
                    Active
                  </label>
                  <button
                    onClick={handleSave}
                    disabled={savingCode === activeTemplate.template_code}
                    className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black rounded-xl transition shadow-xs"
                  >
                    <Save className="w-3.5 h-3.5" />
                    {savingCode === activeTemplate.template_code ? 'Saving...' : 'Save Template'}
                  </button>
                </div>
              </div>

              {/* Header Text */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Header Text (Optional)
                </label>
                <input
                  type="text"
                  value={activeTemplate.header_text || ''}
                  onChange={(e) => handleUpdateField('header_text', e.target.value)}
                  placeholder="e.g. MarutiCab Khargone - Indore"
                  className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-400 font-mono"
                />
              </div>

              {/* Body Text */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Message Body (Markdown with &#123;&#123;1&#125;&#125; variables)
                </label>
                <textarea
                  rows={9}
                  value={activeTemplate.body_text}
                  onChange={(e) => handleUpdateField('body_text', e.target.value)}
                  className="w-full text-xs p-3.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-400 font-mono leading-relaxed"
                />
              </div>

              {/* Footer Text */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Footer Text (Optional)
                </label>
                <input
                  type="text"
                  value={activeTemplate.footer_text || ''}
                  onChange={(e) => handleUpdateField('footer_text', e.target.value)}
                  placeholder="e.g. MarutiCab · 24x7 Helpline +91 72823 16090"
                  className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-400 font-mono"
                />
              </div>
            </div>

            {/* Live WhatsApp Bubble Preview */}
            <div className="bg-slate-100 p-5 rounded-2xl border border-slate-300 shadow-inner">
              <div className="flex items-center gap-2 mb-3 text-xs font-black text-slate-700 uppercase tracking-wider">
                <Eye className="w-4 h-4 text-emerald-600" />
                <span>WhatsApp Simulated Customer Bubble</span>
              </div>

              <div className="max-w-md mx-auto bg-[#DCF8C6] border border-[#C5E1A5] p-4 rounded-2xl rounded-tl-none shadow-sm text-slate-900 font-sans space-y-2">
                {activeTemplate.header_text && (
                  <div className="text-xs font-bold text-slate-800 border-b border-[#C5E1A5] pb-1">
                    {activeTemplate.header_text}
                  </div>
                )}
                <div className="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed font-sans">
                  {previewBody}
                </div>
                {activeTemplate.footer_text && (
                  <div className="text-[10px] text-slate-500 pt-1 border-t border-[#C5E1A5]">
                    {activeTemplate.footer_text}
                  </div>
                )}
                <div className="text-[10px] text-slate-400 text-right">08:02 AM · Delivered ✓✓</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="lg:col-span-8 bg-white p-12 text-center rounded-2xl border border-slate-200 text-slate-500 text-xs font-bold">
            Select a template from the left to edit.
          </div>
        )}
      </div>
    </div>
  )
}
