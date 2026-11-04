'use client'
// src/components/admin/HanscabAdminDashboard.tsx
// MarutiCab Dispatch Dashboard - Light Theme with Cards, N-Tracker, Pairing Board, Directory, and CSV Export

import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Download,
  Filter,
  Phone,
  MessageCircle,
  RefreshCw,
  Search,
  Calendar,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Car,
  MapPin,
  Users,
  LogOut,
  ShieldCheck,
  Building,
  ClipboardList,
  MessageSquareText,
  Sliders,
  Route,
  CreditCard,
  FileText,
} from 'lucide-react'
import { supabase } from '@/lib/supabase-client'
import type { Lead, LeadStage } from '@/types'
import { formatRs, PRICING_CONFIG } from '@/config/pricing'
import { AdminBookingsPanel } from '@/components/admin/AdminBookingsPanel'
import { AdminCustomersPanel } from '@/components/admin/AdminCustomersPanel'
import { WhatsAppAutomationPanel } from '@/components/admin/WhatsAppAutomationPanel'
import { WhatsAppOperationsPanel } from '@/components/admin/WhatsAppOperationsPanel'
import { AdminBookingRulesPanel } from '@/components/admin/AdminBookingRulesPanel'
import { AdminMatchesAndFleetPanel } from '@/components/admin/AdminMatchesAndFleetPanel'
import { AdminPaymentsAndRefundsPanel } from '@/components/admin/AdminPaymentsAndRefundsPanel'
import { AdminTemplatesPanel } from '@/components/admin/AdminTemplatesPanel'

interface Props {
  user: any
  onSignOut: () => void
}

const STAGE_OPTIONS: { id: LeadStage; label: string; color: string }[] = [
  { id: 'pay_clicked', label: 'Pay Clicked', color: 'bg-amber-100 text-amber-900 border-amber-300' },
  { id: 'contacted', label: 'Contacted', color: 'bg-sky-100 text-sky-900 border-sky-300' },
  { id: 'confirmed', label: 'Confirmed', color: 'bg-emerald-100 text-emerald-900 border-emerald-300' },
  { id: 'no_response', label: 'No Response', color: 'bg-slate-100 text-slate-700 border-slate-300' },
  { id: 'cancelled', label: 'Cancelled', color: 'bg-rose-100 text-rose-900 border-rose-300' },
]

export function HanscabAdminDashboard({ user, onSignOut }: Props) {
  const [activeView, setActiveView] = useState<'bookings' | 'matches' | 'payments' | 'rules' | 'templates' | 'customers' | 'whatsapp' | 'leads'>('bookings')
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  // Filters
  const [directionFilter, setDirectionFilter] = useState<'ALL' | 'K2I' | 'I2K'>('ALL')
  const [dateFilter, setDateFilter] = useState<string>('ALL')
  const [stageFilter, setStageFilter] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState('')

  // Inline notes editing state
  const [notesState, setNotesState] = useState<Record<string, string>>({})

  const showToast = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }, [])

  // 1. Fetch leads from Supabase using authenticated client (RLS policy: admin reads leads)
  const fetchLeads = useCallback(async () => {
    setRefreshing(true)
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching leads:', error)
        showToast(error.message || 'Could not fetch leads', 'error')
      } else if (data) {
        setLeads(data as Lead[])
        // Initialize local notes state
        const initialNotes: Record<string, string> = {}
        for (const l of data) {
          initialNotes[l.id] = l.notes || ''
        }
        setNotesState(initialNotes)
      }
    } catch (err: any) {
      console.error('Fetch exception:', err)
      showToast(err.message || 'Network error', 'error')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [showToast])

  useEffect(() => {
    if (activeView === 'leads') void fetchLeads()
  }, [activeView, fetchLeads])

  // 2. Update Stage in Supabase
  const handleStageChange = async (leadId: string, newStage: LeadStage) => {
    try {
      // Optimistic update
      setLeads((prev) =>
        prev.map((l) => (l.id === leadId ? { ...l, stage: newStage } : l))
      )

      const { error } = await supabase
        .from('leads')
        .update({ stage: newStage })
        .eq('id', leadId)

      if (error) {
        throw error
      }
      showToast(`Stage updated to ${newStage}`)
    } catch (err: any) {
      showToast(err.message || 'Failed to update stage', 'error')
      fetchLeads()
    }
  }

  // 3. Save Notes in Supabase on blur
  const handleNoteSave = async (leadId: string, noteText: string) => {
    try {
      const { error } = await supabase
        .from('leads')
        .update({ notes: noteText })
        .eq('id', leadId)

      if (error) throw error
      showToast('Note saved')
    } catch (err: any) {
      showToast('Failed to save note', 'error')
    }
  }

  // 4. Computed Metrics & Stats
  const todayDateStr = useMemo(() => {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
  }, [])

  const stats = useMemo(() => {
    const total = leads.length
    const todayCount = leads.filter((l) => {
      const createdDate = l.created_at ? l.created_at.split('T')[0] : ''
      const pickupDate = l.pickup_at ? l.pickup_at.split('T')[0] : ''
      return createdDate === todayDateStr || pickupDate === todayDateStr
    }).length

    const k2iCount = leads.filter((l) => l.direction === 'K2I').length
    const i2kCount = leads.filter((l) => l.direction === 'I2K').length

    return { total, todayCount, k2iCount, i2kCount }
  }, [leads, todayDateStr])

  // 5. Day Grid Aggregation (leads per date and direction)
  const dayGrid = useMemo(() => {
    const map: Record<string, { date: string; k2i: number; i2k: number; total: number }> = {}

    for (const lead of leads) {
      const dateKey = lead.pickup_at
        ? lead.pickup_at.split('T')[0]
        : lead.created_at
        ? lead.created_at.split('T')[0]
        : 'Unknown'
      if (!map[dateKey]) {
        map[dateKey] = { date: dateKey, k2i: 0, i2k: 0, total: 0 }
      }
      if (lead.direction === 'K2I') map[dateKey].k2i++
      else if (lead.direction === 'I2K') map[dateKey].i2k++
      map[dateKey].total++
    }

    return Object.values(map).sort((a, b) => b.date.localeCompare(a.date))
  }, [leads])

  // Distinct dates for filter
  const distinctDates = useMemo(() => {
    const set = new Set<string>()
    for (const l of leads) {
      const d = l.pickup_at
        ? l.pickup_at.split('T')[0]
        : l.created_at
        ? l.created_at.split('T')[0]
        : ''
      if (d) set.add(d)
    }
    return Array.from(set).sort().reverse()
  }, [leads])

  // 6. Filtered Leads List
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      if (directionFilter !== 'ALL' && lead.direction !== directionFilter) return false
      if (stageFilter !== 'ALL' && lead.stage !== stageFilter) return false

      if (dateFilter !== 'ALL') {
        const leadDate = lead.pickup_at
          ? lead.pickup_at.split('T')[0]
          : lead.created_at
          ? lead.created_at.split('T')[0]
          : ''
        if (leadDate !== dateFilter) return false
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchesName = lead.name?.toLowerCase().includes(q)
        const matchesPhone = lead.phone?.toLowerCase().includes(q)
        const matchesPoint = lead.point?.toLowerCase().includes(q)
        const matchesNotes = (notesState[lead.id] || lead.notes || '').toLowerCase().includes(q)
        return matchesName || matchesPhone || matchesPoint || matchesNotes
      }

      return true
    })
  }, [leads, directionFilter, stageFilter, dateFilter, searchQuery, notesState])

  // 7. Export to CSV
  const handleExportCSV = () => {
    if (filteredLeads.length === 0) {
      showToast('No leads to export', 'error')
      return
    }

    const headers = [
      'ID',
      'Created At',
      'Passenger Name',
      'Phone Number',
      'Direction',
      'Vehicle',
      'Point',
      'Pickup At',
      'Passengers',
      'Total Price (INR)',
      'Stage',
      'Source',
      'Notes',
    ]

    const rows = filteredLeads.map((l) => [
      `"${l.id}"`,
      `"${l.created_at}"`,
      `"${(l.name || '').replace(/"/g, '""')}"`,
      `"${l.phone}"`,
      `"${l.direction}"`,
      `"${l.vehicle || 'sedan'}"`,
      `"${(l.point || '').replace(/"/g, '""')}"`,
      `"${l.pickup_at || ''}"`,
      l.passengers || 1,
      l.price || 0,
      `"${l.stage}"`,
      `"${l.source || ''}"`,
      `"${(notesState[l.id] || l.notes || '').replace(/"/g, '""')}"`,
    ])

    const csvContent =
      'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `hanscab_leads_${todayDateStr}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    showToast('Exported CSV successfully')
  }

  // 8. Progress calculations: Target 25 leads per direction (Green >= 25, Amber 15-24, Red < 15)
  const getProgressBarConfig = (count: number) => {
    const target = 25
    const pct = Math.min(100, Math.round((count / target) * 100))

    let color = 'bg-rose-500'
    let textColor = 'text-rose-600'
    let badgeText = 'Under Target (< 15)'

    if (count >= 25) {
      color = 'bg-emerald-500'
      textColor = 'text-emerald-700'
      badgeText = 'Target Met (25+)'
    } else if (count >= 15) {
      color = 'bg-[#FBBF24]'
      textColor = 'text-amber-800'
      badgeText = 'Good Progress (15–24)'
    }

    return { pct, color, textColor, badgeText, target }
  }

  const k2iProgress = getProgressBarConfig(stats.k2iCount)
  const i2kProgress = getProgressBarConfig(stats.i2kCount)

  return (
    <div className="min-h-screen bg-[#F4F4F5] text-slate-900 font-sans p-4 sm:p-6 lg:p-8 antialiased selection:bg-[#FBBF24] selection:text-slate-950">
      {/* ── Top Bar ── */}
      <header className="max-w-7xl mx-auto bg-white border border-[#E5E7EB] rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center shadow-xs">
            <MapPin className="w-5 h-5 text-[#FBBF24] fill-[#FBBF24]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-black tracking-tight">
                Maruti<span className="text-[#FBBF24]">Cab</span> Admin
              </h1>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300 px-2.5 py-0.5 rounded-full">
                Operations
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Dedicated Sedan Cab Service · Khargone ↔ Indore
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <nav aria-label="Admin sections" className="flex rounded-xl border border-slate-200 bg-slate-50 p-1 flex-wrap gap-1">
            {([
              ['bookings', 'Bookings', ClipboardList],
              ['matches', 'Matches & Fleet', Route],
              ['payments', 'Payments & Refunds', CreditCard],
              ['rules', 'Rules Engine', Sliders],
              ['templates', 'Templates', FileText],
              ['customers', 'Customers (CRM)', Users],
              ['whatsapp', 'WhatsApp', MessageSquareText],
            ] as const).map(([view, label, Icon]) => (
              <button
                key={view}
                type="button"
                aria-current={activeView === view ? 'page' : undefined}
                onClick={() => setActiveView(view)}
                className={`inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-bold transition-colors ${activeView === view ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-600 hover:text-slate-950'}`}
              >
                <Icon className="h-3.5 w-3.5" />{label}
              </button>
            ))}
          </nav>
          {/* Operations info */}
          <div className="hidden md:flex flex-col text-right px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl">
            <span className="text-xs font-bold text-slate-800">
              Operations Desk
            </span>
            <span className="text-[10px] text-emerald-700 font-bold">Support: +91 72823 16090</span>
          </div>

          {/* Refresh */}
          {activeView === 'leads' && <button
            onClick={fetchLeads}
            disabled={refreshing}
            className="flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 px-3.5 py-2 rounded-xl text-xs font-bold transition-all min-h-[42px] cursor-pointer shadow-xs active:scale-98"
            title="Refresh Leads"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-[#FBBF24]' : ''}`} />
            <span>Refresh</span>
          </button>}

          {/* Export to CSV */}
          {activeView === 'leads' && <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 bg-[#FBBF24] hover:bg-[#F59E0B] text-slate-950 font-black px-4 py-2 rounded-xl text-xs transition-all shadow-xs min-h-[42px] cursor-pointer active:scale-98"
          >
            <Download className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Export CSV</span>
          </button>}

          {/* Sign Out */}
          <button
            onClick={onSignOut}
            className="flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-3 py-2 rounded-xl text-xs font-bold transition-all min-h-[42px] cursor-pointer shadow-xs"
            title="Sign Out"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </header>

      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-2xl shadow-xl text-xs font-bold border transition-all animate-in fade-in duration-200 ${
            toast.type === 'error'
              ? 'bg-rose-600 text-white border-rose-700'
              : 'bg-emerald-700 text-white border-emerald-800'
          }`}
        >
          {toast.msg}
        </div>
      )}

      {activeView === 'bookings' && <main className="max-w-7xl mx-auto space-y-6 mt-6"><AdminBookingsPanel /></main>}
      {activeView === 'matches' && <main className="max-w-7xl mx-auto space-y-6 mt-6"><AdminMatchesAndFleetPanel /></main>}
      {activeView === 'payments' && <main className="max-w-7xl mx-auto space-y-6 mt-6"><AdminPaymentsAndRefundsPanel /></main>}
      {activeView === 'rules' && <main className="max-w-7xl mx-auto space-y-6 mt-6"><AdminBookingRulesPanel /></main>}
      {activeView === 'templates' && <main className="max-w-7xl mx-auto space-y-6 mt-6"><AdminTemplatesPanel /></main>}
      {activeView === 'customers' && <main className="max-w-7xl mx-auto space-y-6 mt-6"><AdminCustomersPanel /></main>}
      {activeView === 'whatsapp' && <main className="max-w-7xl mx-auto space-y-6 mt-6"><WhatsAppAutomationPanel /><WhatsAppOperationsPanel /></main>}
    </div>
  )
}
