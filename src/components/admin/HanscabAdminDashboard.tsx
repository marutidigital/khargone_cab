'use client'
// src/components/admin/HanscabAdminDashboard.tsx
// Hanscab Dispatch Dashboard - Light Theme with Cards, N-Tracker, Pairing Board, Directory, and CSV Export

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
} from 'lucide-react'
import { supabase } from '@/lib/supabase-client'
import type { Lead, LeadStage } from '@/types'
import { formatRs, PRICING_CONFIG } from '@/config/pricing'

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

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

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
  }, [])

  useEffect(() => {
    fetchLeads()
  }, [fetchLeads])

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
                Hans<span className="text-[#FBBF24]">cab</span> Admin
              </h1>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300 px-2.5 py-0.5 rounded-full">
                Leads Dispatch
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Live private cab test-phase pipeline · Khargone ↔ Indore
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* User info */}
          <div className="hidden md:flex flex-col text-right px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl">
            <span className="text-xs font-bold text-slate-800 truncate max-w-[200px]">
              {user?.email}
            </span>
            <span className="text-[10px] text-emerald-700 font-bold">Verified Admin</span>
          </div>

          {/* Refresh */}
          <button
            onClick={fetchLeads}
            disabled={refreshing}
            className="flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 px-3.5 py-2 rounded-xl text-xs font-bold transition-all min-h-[42px] cursor-pointer shadow-xs active:scale-98"
            title="Refresh Leads"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-[#FBBF24]' : ''}`} />
            <span>Refresh</span>
          </button>

          {/* Export to CSV */}
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 bg-[#FBBF24] hover:bg-[#F59E0B] text-slate-950 font-black px-4 py-2 rounded-xl text-xs transition-all shadow-xs min-h-[42px] cursor-pointer active:scale-98"
          >
            <Download className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Export CSV</span>
          </button>

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

      <main className="max-w-7xl mx-auto space-y-6 mt-6">
        {/* ── 1. CARDS: Total, Today, Per Direction ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Leads */}
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 sm:p-5 shadow-xs">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Total Leads
            </span>
            <div className="text-3xl sm:text-4xl font-black text-slate-900 mt-1">
              {stats.total}
            </div>
            <div className="text-[11px] text-slate-500 font-medium mt-1">All test-phase requests</div>
          </div>

          {/* Today's Leads */}
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 sm:p-5 shadow-xs">
            <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">
              Today&apos;s Leads
            </span>
            <div className="text-3xl sm:text-4xl font-black text-emerald-700 mt-1">
              {stats.todayCount}
            </div>
            <div className="text-[11px] text-slate-500 font-medium mt-1">Booked or traveling today</div>
          </div>

          {/* K2I Leads */}
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 sm:p-5 shadow-xs">
            <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block">
              Khargone ➔ Indore (K2I)
            </span>
            <div className="text-3xl sm:text-4xl font-black text-slate-900 mt-1">
              {stats.k2iCount}
            </div>
            <div className="text-[11px] text-slate-500 font-medium mt-1">Outbound route leads</div>
          </div>

          {/* I2K Leads */}
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 sm:p-5 shadow-xs">
            <span className="text-[11px] font-bold text-sky-700 uppercase tracking-wider block">
              Indore ➔ Khargone (I2K)
            </span>
            <div className="text-3xl sm:text-4xl font-black text-slate-900 mt-1">
              {stats.i2kCount}
            </div>
            <div className="text-[11px] text-slate-500 font-medium mt-1">Return route leads</div>
          </div>
        </div>

        {/* ── 2. N PROGRESS BARS (Target 25 each toward green) ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* K2I Progress */}
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Direction Progress
                </span>
                <span className="text-sm font-extrabold text-slate-900">Khargone ➔ Indore (K2I)</span>
              </div>
              <div className="text-right">
                <span className={`text-base font-black ${k2iProgress.textColor}`}>
                  {stats.k2iCount} / {k2iProgress.target}
                </span>
                <span className="text-[10px] text-slate-500 font-bold block">{k2iProgress.badgeText}</span>
              </div>
            </div>

            <div className="w-full bg-slate-100 rounded-full h-3.5 overflow-hidden p-0.5 border border-slate-200">
              <div
                className={`h-full rounded-full transition-all duration-500 ${k2iProgress.color}`}
                style={{ width: `${Math.max(6, k2iProgress.pct)}%` }}
              />
            </div>

            <div className="flex justify-between text-[11px] text-slate-500 font-semibold">
              <span className="text-rose-600">Red: &lt; 15</span>
              <span className="text-amber-700">Amber: 15–24</span>
              <span className="text-emerald-700">Green: 25+ target</span>
            </div>
          </div>

          {/* I2K Progress */}
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Direction Progress
                </span>
                <span className="text-sm font-extrabold text-slate-900">Indore ➔ Khargone (I2K)</span>
              </div>
              <div className="text-right">
                <span className={`text-base font-black ${i2kProgress.textColor}`}>
                  {stats.i2kCount} / {i2kProgress.target}
                </span>
                <span className="text-[10px] text-slate-500 font-bold block">{i2kProgress.badgeText}</span>
              </div>
            </div>

            <div className="w-full bg-slate-100 rounded-full h-3.5 overflow-hidden p-0.5 border border-slate-200">
              <div
                className={`h-full rounded-full transition-all duration-500 ${i2kProgress.color}`}
                style={{ width: `${Math.max(6, i2kProgress.pct)}%` }}
              />
            </div>

            <div className="flex justify-between text-[11px] text-slate-500 font-semibold">
              <span className="text-rose-600">Red: &lt; 15</span>
              <span className="text-amber-700">Amber: 15–24</span>
              <span className="text-emerald-700">Green: 25+ target</span>
            </div>
          </div>
        </div>

        {/* ── 3. DAY GRID: Leads per date & direction (highlighting one-way dates) ── */}
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 space-y-4 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#FBBF24]" />
                Day Grid: Route Pairing Balance
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Highlights dates where only one direction has leads (unpaired return opportunities).
              </p>
            </div>
            <span className="text-xs text-slate-500 font-bold">
              {dayGrid.length} travel dates recorded
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 max-h-72 overflow-y-auto pr-1">
            {dayGrid.length === 0 ? (
              <div className="col-span-full py-8 text-center text-xs text-slate-400">
                No travel dates recorded in leads table yet.
              </div>
            ) : (
              dayGrid.map((day) => {
                const isOnlyK2I = day.k2i > 0 && day.i2k === 0
                const isOnlyI2K = day.i2k > 0 && day.k2i === 0
                const isUnbalanced = isOnlyK2I || isOnlyI2K

                return (
                  <div
                    key={day.date}
                    className={`p-3.5 rounded-xl border transition-all ${
                      isUnbalanced
                        ? 'bg-amber-50/80 border-amber-300 text-amber-950'
                        : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-xs font-bold text-slate-900">{day.date}</span>
                      <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-900">
                        {day.total} {day.total === 1 ? 'lead' : 'leads'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs py-1 border-t border-slate-200 font-bold">
                      <span className="text-amber-900">K2I: {day.k2i}</span>
                      <span className="text-sky-700">I2K: {day.i2k}</span>
                    </div>

                    {isOnlyK2I && (
                      <div className="mt-2 text-[10px] font-bold text-amber-900 bg-amber-100 border border-amber-200 px-2 py-1 rounded-md flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-amber-700 flex-shrink-0" />
                        <span>Only K2I · Need Indore return</span>
                      </div>
                    )}

                    {isOnlyI2K && (
                      <div className="mt-2 text-[10px] font-bold text-amber-900 bg-amber-100 border border-amber-200 px-2 py-1 rounded-md flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-amber-700 flex-shrink-0" />
                        <span>Only I2K · Need Khargone return</span>
                      </div>
                    )}

                    {!isUnbalanced && day.total > 0 && (
                      <div className="mt-2 text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-200 px-2 py-1 rounded-md flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-700 flex-shrink-0" />
                        <span>Paired both directions</span>
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* ── 4. TABLE OF LEADS WITH FILTERS, STAGES, NOTES & CALL/WHATSAPP ── */}
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 space-y-4 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                <span>Leads Directory</span>
                <span className="text-xs font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-full">
                  {filteredLeads.length} of {leads.length}
                </span>
              </h2>
            </div>

            {/* Filter controls */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Search */}
              <div className="relative w-full sm:w-56">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search name, phone, notes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#FBBF24] focus:border-[#FBBF24] min-h-[40px]"
                />
              </div>

              {/* Direction Filter */}
              <select
                value={directionFilter}
                onChange={(e) => setDirectionFilter(e.target.value as any)}
                className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#FBBF24] min-h-[40px]"
              >
                <option value="ALL">All Directions</option>
                <option value="K2I">Khargone ➔ Indore (K2I)</option>
                <option value="I2K">Indore ➔ Khargone (I2K)</option>
              </select>

              {/* Stage Filter */}
              <select
                value={stageFilter}
                onChange={(e) => setStageFilter(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#FBBF24] min-h-[40px]"
              >
                <option value="ALL">All Stages</option>
                {STAGE_OPTIONS.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.label}
                  </option>
                ))}
              </select>

              {/* Date Filter */}
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#FBBF24] min-h-[40px]"
              >
                <option value="ALL">All Dates</option>
                {distinctDates.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Table Container */}
          <div className="border border-slate-200 rounded-xl overflow-hidden overflow-x-auto shadow-xs">
            <table className="w-full text-left text-xs text-slate-800">
              <thead className="bg-slate-50 text-slate-600 text-[11px] font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3.5">Logged</th>
                  <th className="py-3 px-3.5">Passenger</th>
                  <th className="py-3 px-3.5">Route</th>
                  <th className="py-3 px-3.5">Pickup Time</th>
                  <th className="py-3 px-3.5">Vehicle & Point</th>
                  <th className="py-3 px-3.5">Price</th>
                  <th className="py-3 px-3.5">Stage</th>
                  <th className="py-3 px-3.5 min-w-[180px]">Notes</th>
                  <th className="py-3 px-3.5 text-right">Quick Contact</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLeads.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      No leads match current filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredLeads.map((lead) => {
                    const cleanPhone = lead.phone.replace(/\D/g, '')
                    const callHref = `tel:+91${cleanPhone}`
                    const waText = `Hi ${lead.name || 'Customer'}, Hanscab here regarding your ${lead.direction} trip request on ${lead.pickup_at?.split('T')[0] || 'date'}. Are you still looking to travel?`
                    const waHref = `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(waText)}`

                    const formattedCreated = new Date(lead.created_at).toLocaleTimeString('en-IN', {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true,
                    })

                    return (
                      <tr key={lead.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* Time */}
                        <td className="py-3 px-3.5 font-mono text-slate-500 whitespace-nowrap">
                          <div className="font-semibold text-slate-700">{lead.created_at?.split('T')[0]}</div>
                          <div className="text-[10px] text-slate-400">{formattedCreated}</div>
                        </td>

                        {/* Name & Phone */}
                        <td className="py-3 px-3.5">
                          <div className="font-bold text-slate-900">
                            {lead.name || <span className="text-slate-400 italic">No name</span>}
                          </div>
                          <div className="font-mono text-xs text-slate-600 mt-0.5">
                            +91 {lead.phone}
                          </div>
                        </td>

                        {/* Direction */}
                        <td className="py-3 px-3.5 whitespace-nowrap">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded text-[10px] font-extrabold ${
                              lead.direction === 'K2I'
                                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                : 'bg-sky-100 text-sky-900 border border-sky-300'
                            }`}
                          >
                            {lead.direction === 'K2I' ? 'Khargone ➔ Indore' : 'Indore ➔ Khargone'}
                          </span>
                        </td>

                        {/* Pickup At */}
                        <td className="py-3 px-3.5 whitespace-nowrap">
                          {lead.pickup_at ? (
                            <div>
                              <div className="font-semibold text-slate-800">
                                {lead.pickup_at.split('T')[0]}
                              </div>
                              <div className="text-[10px] text-slate-500 font-medium">
                                {lead.pickup_at.split('T')[1]?.slice(0, 5) || ''}
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>

                        {/* Vehicle & Point */}
                        <td className="py-3 px-3.5">
                          <div className="font-semibold text-slate-900 capitalize">{lead.vehicle || 'Sedan'}</div>
                          <div className="text-[10px] text-slate-500">{lead.point || '—'}</div>
                        </td>

                        {/* Price */}
                        <td className="py-3 px-3.5 font-black text-slate-900 whitespace-nowrap">
                          {lead.price ? formatRs(lead.price) : '—'}
                        </td>

                        {/* Stage Dropdown */}
                        <td className="py-3 px-3.5">
                          <select
                            value={lead.stage}
                            onChange={(e) => handleStageChange(lead.id, e.target.value as LeadStage)}
                            className="bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#FBBF24]"
                          >
                            {STAGE_OPTIONS.map((st) => (
                              <option key={st.id} value={st.id}>
                                {st.label}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* Notes Input (Auto-save on blur) */}
                        <td className="py-3 px-3.5">
                          <input
                            type="text"
                            placeholder="Add notes..."
                            value={notesState[lead.id] ?? ''}
                            onChange={(e) =>
                              setNotesState((prev) => ({ ...prev, [lead.id]: e.target.value }))
                            }
                            onBlur={(e) => handleNoteSave(lead.id, e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-[#FBBF24] rounded-lg px-2.5 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none transition-colors"
                          />
                        </td>

                        {/* Quick Contact Buttons (Tap target >= 44px) */}
                        <td className="py-3 px-3.5 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5 justify-end">
                            {/* Call */}
                            <a
                              href={callHref}
                              className="inline-flex items-center gap-1 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors min-h-[36px] shadow-xs"
                              title={`Call +91 ${cleanPhone}`}
                            >
                              <Phone className="w-3.5 h-3.5 text-amber-700" />
                              <span>Call</span>
                            </a>

                            {/* WhatsApp */}
                            <a
                              href={waHref}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors min-h-[36px] shadow-xs"
                              title="Chat on WhatsApp"
                            >
                              <MessageCircle className="w-3.5 h-3.5 fill-current text-emerald-600" />
                              <span>WhatsApp</span>
                            </a>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}
