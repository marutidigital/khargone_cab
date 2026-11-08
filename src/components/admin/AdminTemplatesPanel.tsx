'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  FileText,
  Save,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  ChevronRight,
  Eye,
  Trash2,
  Plus,
  CloudLightning,
  ShieldAlert,
  UserCheck,
  UploadCloud,
  Send,
  Clock,
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
  const [syncing, setSyncing] = useState(false)
  const [pushingAll, setPushingAll] = useState(false)
  const [pushingCode, setPushingCode] = useState<string | null>(null)
  const [savingCode, setSavingCode] = useState<string | null>(null)
  const [deletingCode, setDeletingCode] = useState<string | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<string>('booking_received')
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [newTpl, setNewTpl] = useState({
    template_code: '',
    header_text: '',
    body_text: '',
    footer_text: 'Support: +91 72823 16090 · MarutiCab 🚕',
    category: 'UTILITY',
  })

  const fetchTemplates = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/templates')
      const json = await res.json()
      if (res.ok && json.templates) {
        setTemplates(json.templates)
        if (json.templates.length > 0 && !selectedTemplate) {
          setSelectedTemplate(json.templates[0].template_code)
        }
      } else {
        setMsg({ type: 'error', text: json.error || 'Failed to fetch templates' })
      }
    } catch (e: any) {
      setMsg({ type: 'error', text: e?.message || 'Network error' })
    } finally {
      setLoading(false)
    }
  }, [selectedTemplate])

  useEffect(() => {
    fetchTemplates()
  }, [fetchTemplates])

  const handleSyncTemplates = async () => {
    setSyncing(true)
    setMsg(null)
    try {
      const res = await fetch('/api/admin/templates/sync', { method: 'POST' })
      const json = await res.json()
      if (res.ok && json.success) {
        setMsg({ type: 'success', text: json.message || 'Templates synced successfully!' })
        if (json.templates) setTemplates(json.templates)
      } else {
        setMsg({ type: 'error', text: json.error || 'Sync failed' })
      }
    } catch (e: any) {
      setMsg({ type: 'error', text: e?.message || 'Sync error' })
    } finally {
      setSyncing(false)
    }
  }

  const handlePushAllToMeta = async () => {
    if (!window.confirm('Submit all WhatsApp utility templates directly to Meta for review? Meta AI will review them automatically.')) return
    setPushingAll(true)
    setMsg(null)
    try {
      const res = await fetch('/api/admin/templates/push-to-meta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ push_all: true }),
      })
      const json = await res.json()
      if (res.ok && json.success) {
        setMsg({ type: 'success', text: json.message || 'All templates submitted to Meta!' })
        fetchTemplates()
      } else {
        setMsg({ type: 'error', text: json.error || 'Failed to submit templates to Meta' })
      }
    } catch (e: any) {
      setMsg({ type: 'error', text: e?.message || 'Network error submitting to Meta' })
    } finally {
      setPushingAll(false)
    }
  }

  const handlePushSingleToMeta = async () => {
    if (!activeTemplate) return
    setPushingCode(activeTemplate.template_code)
    setMsg(null)
    try {
      const res = await fetch('/api/admin/templates/push-to-meta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template_code: activeTemplate.template_code }),
      })
      const json = await res.json()
      if (res.ok && json.success) {
        setMsg({
          type: 'success',
          text: json.message || `Template "${activeTemplate.template_code}" processed with Meta!`,
        })
        fetchTemplates()
      } else {
        setMsg({
          type: 'error',
          text: json.error || json.message || 'Failed to submit template to Meta',
        })
      }
    } catch (e: any) {
      setMsg({ type: 'error', text: e?.message || 'Network error' })
    } finally {
      setPushingCode(null)
    }
  }

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
          approval_status: activeTemplate.approval_status,
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

  const handleDelete = async (templateCode: string) => {
    if (!window.confirm(`Are you sure you want to delete template "${templateCode}"?`)) return
    setDeletingCode(templateCode)
    try {
      const res = await fetch(`/api/admin/templates?template_code=${encodeURIComponent(templateCode)}`, {
        method: 'DELETE',
      })
      const json = await res.json()
      if (res.ok) {
        setMsg({ type: 'success', text: `Template "${templateCode}" deleted!` })
        const remaining = templates.filter((t) => t.template_code !== templateCode)
        setTemplates(remaining)
        if (remaining.length > 0) {
          setSelectedTemplate(remaining[0].template_code)
        }
      } else {
        setMsg({ type: 'error', text: json.error || 'Failed to delete template' })
      }
    } catch (e: any) {
      setMsg({ type: 'error', text: e?.message || 'Delete error' })
    } finally {
      setDeletingCode(null)
    }
  }

  const handleCreateNew = async () => {
    if (!newTpl.template_code || !newTpl.body_text) {
      alert('Template Code and Message Body are required.')
      return
    }
    setSavingCode('new')
    try {
      const res = await fetch('/api/admin/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTpl),
      })
      const json = await res.json()
      if (res.ok && json.template) {
        setMsg({ type: 'success', text: `Template "${json.template.template_code}" created!` })
        setTemplates((prev) => [...prev, json.template])
        setSelectedTemplate(json.template.template_code)
        setShowAddModal(false)
        setNewTpl({
          template_code: '',
          header_text: '',
          body_text: '',
          footer_text: 'Support: +91 72823 16090 · MarutiCab 🚕',
          category: 'UTILITY',
        })
      } else {
        setMsg({ type: 'error', text: json.error || 'Failed to create template' })
      }
    } catch (e: any) {
      setMsg({ type: 'error', text: e?.message || 'Creation error' })
    } finally {
      setSavingCode(null)
    }
  }

  // Generate friendly sample preview
  const previewBody = (activeTemplate?.body_text || '')
    .replace(/\{\{1\}\}/g, 'Avadh Bajaj')
    .replace(/\{\{2\}\}/g, 'KC99381')
    .replace(/\{\{3\}\}/g, 'Khargone ➔ Indore')
    .replace(/\{\{4\}\}/g, '05 Nov 2026')
    .replace(/\{\{5\}\}/g, '09:00 AM')
    .replace(/\{\{6\}\}/g, '₹1,800')
    .replace(/\{\{7\}\}/g, '₹500')
    .replace(/\{\{8\}\}/g, '₹1,300')
    .replace(/\{\{9\}\}/g, 'Bus Stand Khargone')
    .replace(/\{\{10\}\}/g, '₹1,300')

  const customerTemplates = templates.filter((t) => !t.template_code.startsWith('admin_'))
  const adminTemplates = templates.filter((t) => t.template_code.startsWith('admin_'))

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold shadow-xs">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900 tracking-tight">WhatsApp Message Templates</h2>
            <p className="text-xs text-slate-500 font-medium">
              Live Meta WhatsApp Cloud API utility templates ({templates.length} Active in Supabase)
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Submit All to Meta Button */}
          <button
            onClick={handlePushAllToMeta}
            disabled={pushingAll}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition shadow-xs cursor-pointer disabled:opacity-50"
            title="Submit all utility templates directly to Meta Graph API for review"
          >
            <UploadCloud className={`w-3.5 h-3.5 ${pushingAll ? 'animate-bounce' : ''}`} />
            <span>{pushingAll ? 'Submitting to Meta...' : 'Submit All to Meta'}</span>
          </button>

          {/* Sync Button */}
          <button
            onClick={handleSyncTemplates}
            disabled={syncing}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl transition shadow-xs cursor-pointer"
            title="Sync live status with Meta Graph API"
          >
            <CloudLightning className={`w-3.5 h-3.5 ${syncing ? 'animate-bounce text-slate-900' : ''}`} />
            <span>{syncing ? 'Syncing...' : 'Sync Status'}</span>
          </button>

          {/* Add Template Button */}
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Template</span>
          </button>

          {/* Refresh Button */}
          <button
            onClick={fetchTemplates}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
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
          {msg.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />}
          <span>{msg.text}</span>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Template Selector Sidebar */}
        <div className="lg:col-span-4 space-y-4">
          {/* Passenger Section */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center gap-1.5 px-2 py-1 mb-2 text-slate-800">
              <UserCheck className="w-4 h-4 text-emerald-600" />
              <h3 className="text-xs font-black uppercase tracking-wider">
                Passenger Templates ({customerTemplates.length})
              </h3>
            </div>
            <div className="space-y-1">
              {customerTemplates.map((tpl) => {
                const isSelected = tpl.template_code === selectedTemplate
                return (
                  <button
                    key={tpl.id}
                    onClick={() => setSelectedTemplate(tpl.template_code)}
                    className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500 text-slate-950 font-bold border-amber-600 shadow-xs'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="text-xs font-mono font-black truncate">{tpl.template_code}</div>
                      <div className="text-[11px] opacity-80 mt-0.5 capitalize truncate">
                        {tpl.header_text || tpl.meta_template_name || tpl.template_code.replace(/_/g, ' ')}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 opacity-70 shrink-0" />
                  </button>
                )
              })}
            </div>
          </div>

          {/* Admin Section */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center gap-1.5 px-2 py-1 mb-2 text-slate-800">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              <h3 className="text-xs font-black uppercase tracking-wider">
                Admin Private Alerts ({adminTemplates.length})
              </h3>
            </div>
            <div className="space-y-1">
              {adminTemplates.map((tpl) => {
                const isSelected = tpl.template_code === selectedTemplate
                return (
                  <button
                    key={tpl.id}
                    onClick={() => setSelectedTemplate(tpl.template_code)}
                    className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500 text-slate-950 font-bold border-amber-600 shadow-xs'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="text-xs font-mono font-black truncate">{tpl.template_code}</div>
                      <div className="text-[11px] opacity-80 mt-0.5 capitalize truncate">
                        {tpl.header_text || tpl.meta_template_name || tpl.template_code.replace(/_/g, ' ')}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 opacity-70 shrink-0" />
                  </button>
                )
              })}
            </div>
          </div>

          {/* Placeholders Guide */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900 space-y-2">
            <div className="flex items-center gap-1.5 font-bold">
              <Sparkles className="w-4 h-4 text-amber-700" />
              <span>Variable Placeholders Guide</span>
            </div>
            <p className="text-[11px] text-amber-800 leading-relaxed font-mono">
              &#123;&#123;1&#125;&#125; = Name / Ref
              <br />&#123;&#123;2&#125;&#125; = Booking ID / Driver Name
              <br />&#123;&#123;3&#125;&#125; = Route / Driver Mobile
              <br />&#123;&#123;4&#125;&#125; = Date / Car Model
              <br />&#123;&#123;5&#125;&#125; = Pickup Time / Plate No.
              <br />&#123;&#123;6&#125;&#125; = Total Fare / Route
              <br />&#123;&#123;7&#125;&#125; = Advance Paid / Date
              <br />&#123;&#123;8&#125;&#125; = Balance to Driver
            </p>
          </div>
        </div>

        {/* Editor & Preview */}
        {activeTemplate ? (
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-wrap gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                      {activeTemplate.category || 'UTILITY'}
                    </span>
                    {activeTemplate.approval_status === 'APPROVED' ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Meta Approved
                      </span>
                    ) : activeTemplate.approval_status === 'PENDING' ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full">
                        <Clock className="w-3 h-3 text-amber-600" /> Under Meta Review
                      </span>
                    ) : activeTemplate.approval_status === 'REJECTED' ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-rose-700 bg-rose-100 px-2.5 py-0.5 rounded-full">
                        <AlertTriangle className="w-3 h-3 text-rose-600" /> Meta Rejected
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full">
                        Not Submitted
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-black text-slate-900 mt-1 font-mono">
                    {activeTemplate.template_code}
                  </h3>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 mr-1">
                    <input
                      type="checkbox"
                      checked={activeTemplate.active}
                      onChange={(e) => handleUpdateField('active', e.target.checked)}
                      className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                    />
                    Active
                  </label>

                  {/* Submit to Meta Button */}
                  <button
                    onClick={handlePushSingleToMeta}
                    disabled={pushingCode === activeTemplate.template_code}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold rounded-xl transition shadow-xs cursor-pointer disabled:opacity-50"
                    title="Submit this template directly to Meta WhatsApp Cloud API for review"
                  >
                    <Send className={`w-3.5 h-3.5 ${pushingCode === activeTemplate.template_code ? 'animate-spin' : ''}`} />
                    <span>{pushingCode === activeTemplate.template_code ? 'Submitting...' : 'Submit to Meta'}</span>
                  </button>

                  <button
                    onClick={handleSave}
                    disabled={savingCode === activeTemplate.template_code}
                    className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black rounded-xl transition shadow-xs cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    {savingCode === activeTemplate.template_code ? 'Saving...' : 'Save'}
                  </button>

                  <button
                    onClick={() => handleDelete(activeTemplate.template_code)}
                    disabled={deletingCode === activeTemplate.template_code}
                    className="flex items-center gap-1 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl transition border border-rose-200 cursor-pointer"
                    title="Delete template"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </button>
                </div>
              </div>

              {/* Informational Tip Banner */}
              <div className="bg-blue-50/70 border border-blue-200/80 rounded-xl p-3 flex items-start gap-2.5 text-xs text-blue-900">
                <UploadCloud className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <span className="font-bold">1-Click Meta Review:</span> Click <strong>&quot;Submit to Meta&quot;</strong> to send this template directly to Meta&apos;s automated review system. Meta AI typically approves UTILITY templates in <strong>1 to 5 minutes</strong>.
                </div>
              </div>

              {/* Header Text */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Header Text (Optional with emoji)
                </label>
                <input
                  type="text"
                  value={activeTemplate.header_text || ''}
                  onChange={(e) => handleUpdateField('header_text', e.target.value)}
                  placeholder="e.g. 🚕 Booking Request Mil Gayi!"
                  className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-400 font-sans"
                />
              </div>

              {/* Body Text */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Message Body (Hinglish with &#123;&#123;1&#125;&#125; variables)
                </label>
                <textarea
                  rows={10}
                  value={activeTemplate.body_text}
                  onChange={(e) => handleUpdateField('body_text', e.target.value)}
                  className="w-full text-xs p-3.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-400 font-mono leading-relaxed"
                />
              </div>

              {/* Footer Text */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Footer Text
                </label>
                <input
                  type="text"
                  value={activeTemplate.footer_text || ''}
                  onChange={(e) => handleUpdateField('footer_text', e.target.value)}
                  placeholder="e.g. Support: +91 72823 16090 · MarutiCab 🚕"
                  className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-400 font-sans"
                />
              </div>
            </div>

            {/* Live WhatsApp Bubble Preview */}
            <div className="bg-slate-100 p-5 rounded-2xl border border-slate-300 shadow-inner">
              <div className="flex items-center gap-2 mb-3 text-xs font-black text-slate-700 uppercase tracking-wider">
                <Eye className="w-4 h-4 text-emerald-600" />
                <span>Simulated WhatsApp Bubble Preview</span>
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
                <div className="text-[10px] text-slate-400 text-right">09:15 AM · Delivered ✓✓</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="lg:col-span-8 bg-white p-12 text-center rounded-2xl border border-slate-200 text-slate-500 text-xs font-bold">
            Select a template from the left to edit or click &quot;Sync Templates&quot;.
          </div>
        )}
      </div>

      {/* Modal: Add Custom Template */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900">Add New Meta Template</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Template Code (Meta Name)
                </label>
                <input
                  type="text"
                  value={newTpl.template_code}
                  onChange={(e) => setNewTpl({ ...newTpl, template_code: e.target.value })}
                  placeholder="e.g. promo_diwali_discount"
                  className="w-full text-xs p-3 rounded-xl border border-slate-300 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Header Text (Optional)
                </label>
                <input
                  type="text"
                  value={newTpl.header_text}
                  onChange={(e) => setNewTpl({ ...newTpl, header_text: e.target.value })}
                  placeholder="e.g. 🚕 MarutiCab Special Offer!"
                  className="w-full text-xs p-3 rounded-xl border border-slate-300 font-sans"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Message Body (Markdown with &#123;&#123;1&#125;&#125; variables)
                </label>
                <textarea
                  rows={5}
                  value={newTpl.body_text}
                  onChange={(e) => setNewTpl({ ...newTpl, body_text: e.target.value })}
                  placeholder="Hey {{1}}! Use code {{2}} to get flat 10% off on Khargone to Indore cab rides!"
                  className="w-full text-xs p-3 rounded-xl border border-slate-300 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Footer Text
                </label>
                <input
                  type="text"
                  value={newTpl.footer_text}
                  onChange={(e) => setNewTpl({ ...newTpl, footer_text: e.target.value })}
                  className="w-full text-xs p-3 rounded-xl border border-slate-300 font-sans"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateNew}
                disabled={savingCode === 'new'}
                className="px-4 py-2 text-xs font-black bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl shadow-xs"
              >
                {savingCode === 'new' ? 'Creating...' : 'Create & Save Template'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
