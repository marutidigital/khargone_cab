'use client'

import { useState, useEffect, useMemo, DragEvent, useRef } from 'react'
import { DM_Sans, Sora } from 'next/font/google'
import {
  LayoutDashboard,
  Calendar,
  Users,
  UserCheck,
  Car,
  Link2,
  CreditCard,
  BarChart3,
  Settings,
  Search,
  Bell,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Plus,
  Trash2,
  Edit2,
  TrendingUp,
  MapPin,
  ArrowRight,
  Eye,
  Info,
  DollarSign,
  AlertCircle,
  RefreshCw,
  Check,
  X,
  Send,
  ExternalLink,
  ChevronRight,
  Filter
} from 'lucide-react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend
} from 'recharts'

// Load Fonts
const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-dm-sans',
})

const sora = Sora({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  variable: '--font-sora',
})

// ─── Interfaces ───────────────────────────────────────────────────────────────
interface Booking {
  id: string
  booking_ref: string
  direction: 'KI' | 'IK'
  travel_date: string
  pickup_time: string
  passenger_name: string
  phone: string
  email?: string
  drop_point: string
  drop_name: string
  vehicle_type: 'sedan' | 'suv' | 'innova'
  base_fare: number
  discount: number
  night_extra: number
  total_fare: number
  advance_paid: number
  status: 'waiting' | 'confirmed' | 'cancelled'
  matched_with?: string
  driver_id?: string
  agent_id?: string
  notes?: string
  created_at: string
}

interface Driver {
  id: string
  name: string
  phone: string
  vehicle_type: 'sedan' | 'suv' | 'innova'
  vehicle_number: string
  vehicle_model: string
  status: 'active' | 'on_trip' | 'inactive'
  rating: number
  trips_completed: number
  license_expiry: string
  permit_expiry: string
  created_at: string
}

interface Agent {
  id: string
  name: string
  phone: string
  email: string
  area: string
  commission_pct: number
  status: 'active' | 'inactive'
  bookings_linked: number
  total_payout: number
  created_at: string
}

interface Vehicle {
  id: string
  make: string
  model: string
  plate: string
  type: 'sedan' | 'suv' | 'innova'
  capacity: number
  status: 'active' | 'inactive' | 'maintenance'
  driver_id?: string
}

interface Transaction {
  id: string
  date: string
  booking_ref: string
  passenger_name: string
  amount: number
  type: 'advance' | 'balance' | 'full'
  method: 'UPI' | 'Cash'
}

type TabType = 'dashboard' | 'bookings' | 'dispatch' | 'drivers' | 'agents' | 'vehicles' | 'matching' | 'payments' | 'reports' | 'settings' | 'booking-link'

// ─── Mock Data ────────────────────────────────────────────────────────────────
const INITIAL_DRIVERS: Driver[] = [
  { id: 'drv-1', name: 'Rajesh Kumar', phone: '9876543210', vehicle_type: 'sedan', vehicle_number: 'MP-09-AB-1234', vehicle_model: 'Maruti Dzire', status: 'active', rating: 4.8, trips_completed: 248, license_expiry: '2027-05-15', permit_expiry: '2026-08-20', created_at: '2024-01-10' },
  { id: 'drv-2', name: 'Suresh Jaiswal', phone: '9876543211', vehicle_type: 'suv', vehicle_number: 'MP-09-CD-5678', vehicle_model: 'Maruti Ertiga', status: 'on_trip', rating: 4.6, trips_completed: 187, license_expiry: '2026-03-10', permit_expiry: '2026-04-12', created_at: '2024-02-14' },
  { id: 'drv-3', name: 'Mukesh Yadav', phone: '9876543212', vehicle_type: 'innova', vehicle_number: 'MP-09-EF-9012', vehicle_model: 'Toyota Innova', status: 'active', rating: 4.9, trips_completed: 312, license_expiry: '2025-12-01', permit_expiry: '2026-01-15', created_at: '2023-11-05' },
  { id: 'drv-4', name: 'Vivek Gupta', phone: '9876543213', vehicle_type: 'sedan', vehicle_number: 'MP-09-GH-3456', vehicle_model: 'Hyundai Aura', status: 'inactive', rating: 4.2, trips_completed: 156, license_expiry: '2026-07-22', permit_expiry: '2026-06-18', created_at: '2024-03-20' }
]

const INITIAL_AGENTS: Agent[] = [
  { id: 'agt-1', name: 'Anita Verma', phone: '8887777766', email: 'anita@kcabs.in', area: 'Khargone City', commission_pct: 10, status: 'active', bookings_linked: 45, total_payout: 9800, created_at: '2024-01-15' },
  { id: 'agt-2', name: 'Ravi Sharma', phone: '9988776655', email: 'ravi@kcabs.in', area: 'Indore Central', commission_pct: 8, status: 'active', bookings_linked: 32, total_payout: 6400, created_at: '2024-02-01' },
  { id: 'agt-3', name: 'Gopal Joshi', phone: '9123456789', email: 'gopal@kcabs.in', area: 'Ujjain Stn', commission_pct: 12, status: 'inactive', bookings_linked: 18, total_payout: 4200, created_at: '2024-03-10' }
]

const INITIAL_VEHICLES: Vehicle[] = [
  { id: 'veh-1', make: 'Maruti', model: 'Dzire', plate: 'MP-09-AB-1234', type: 'sedan', capacity: 4, status: 'active', driver_id: 'drv-1' },
  { id: 'veh-2', make: 'Maruti', model: 'Ertiga', plate: 'MP-09-CD-5678', type: 'suv', capacity: 6, status: 'active', driver_id: 'drv-2' },
  { id: 'veh-3', make: 'Toyota', model: 'Innova', plate: 'MP-09-EF-9012', type: 'innova', capacity: 7, status: 'active', driver_id: 'drv-3' },
  { id: 'veh-4', make: 'Hyundai', model: 'Aura', plate: 'MP-09-GH-3456', type: 'sedan', capacity: 4, status: 'active', driver_id: 'drv-4' }
]

const TODAY_DATE = new Date().toISOString().split('T')[0]
const TOMORROW_DATE = new Date(Date.now() + 86400000).toISOString().split('T')[0]

const INITIAL_BOOKINGS: Booking[] = [
  { id: 'b-1', booking_ref: 'KCB-4011', direction: 'KI', travel_date: TODAY_DATE, pickup_time: '08:30', passenger_name: 'Harish Mandloi', phone: '9827011223', email: 'harish@gmail.com', drop_point: 'ind-apt', drop_name: 'Indore Airport', vehicle_type: 'sedan', base_fare: 2200, discount: 100, night_extra: 0, total_fare: 2100, advance_paid: 500, status: 'confirmed', matched_with: 'b-2', driver_id: 'drv-1', agent_id: 'agt-1', created_at: '2026-05-28T10:00:00Z' },
  { id: 'b-2', booking_ref: 'KCB-4012', direction: 'IK', travel_date: TODAY_DATE, pickup_time: '12:00', passenger_name: 'Priya Sharma', phone: '9407155667', email: 'priya@outlook.com', drop_point: 'ind-apt', drop_name: 'Indore Airport', vehicle_type: 'sedan', base_fare: 2200, discount: 0, night_extra: 0, total_fare: 2200, advance_paid: 500, status: 'confirmed', matched_with: 'b-1', driver_id: 'drv-1', agent_id: 'agt-1', created_at: '2026-05-28T10:15:00Z' },
  { id: 'b-3', booking_ref: 'KCB-4013', direction: 'KI', travel_date: TODAY_DATE, pickup_time: '09:00', passenger_name: 'Sanjay Patidar', phone: '9926088990', drop_point: 'ind-rwy', drop_name: 'Indore Railway Station', vehicle_type: 'suv', base_fare: 2800, discount: 200, night_extra: 0, total_fare: 2600, advance_paid: 1000, status: 'confirmed', matched_with: 'b-4', driver_id: 'drv-2', created_at: '2026-05-29T08:30:00Z' },
  { id: 'b-4', booking_ref: 'KCB-4014', direction: 'IK', travel_date: TODAY_DATE, pickup_time: '14:30', passenger_name: 'Ramesh Gehlot', phone: '9893044556', drop_point: 'ind-rwy', drop_name: 'Indore Railway Station', vehicle_type: 'suv', base_fare: 2800, discount: 0, night_extra: 0, total_fare: 2800, advance_paid: 0, status: 'confirmed', matched_with: 'b-3', driver_id: 'drv-2', created_at: '2026-05-29T08:45:00Z' },
  { id: 'b-5', booking_ref: 'KCB-4015', direction: 'KI', travel_date: TODAY_DATE, pickup_time: '15:00', passenger_name: 'Vikram Singh', phone: '9425033442', drop_point: 'ind-vij', drop_name: 'Vijay Nagar', vehicle_type: 'innova', base_fare: 3200, discount: 0, night_extra: 0, total_fare: 3200, advance_paid: 1000, status: 'waiting', created_at: '2026-05-29T14:00:00Z' },
  { id: 'b-6', booking_ref: 'KCB-4016', direction: 'KI', travel_date: TOMORROW_DATE, pickup_time: '06:00', passenger_name: 'Anjali Gupta', phone: '9755012345', drop_point: 'ind-apt', drop_name: 'Indore Airport', vehicle_type: 'sedan', base_fare: 2200, discount: 100, night_extra: 0, total_fare: 2100, advance_paid: 500, status: 'waiting', created_at: '2026-05-30T07:00:00Z' },
  { id: 'b-7', booking_ref: 'KCB-4017', direction: 'IK', travel_date: TOMORROW_DATE, pickup_time: '10:30', passenger_name: 'Rajesh Solanki', phone: '9009099887', drop_point: 'ind-apt', drop_name: 'Indore Airport', vehicle_type: 'sedan', base_fare: 2200, discount: 0, night_extra: 0, total_fare: 2200, advance_paid: 2200, status: 'waiting', created_at: '2026-05-30T07:30:00Z' },
  { id: 'b-8', booking_ref: 'KCB-4018', direction: 'KI', travel_date: TOMORROW_DATE, pickup_time: '23:30', passenger_name: 'Deepak Verma', phone: '9826011122', drop_point: 'ind-rwy', drop_name: 'Indore Railway Station', vehicle_type: 'sedan', base_fare: 2200, discount: 0, night_extra: 300, total_fare: 2500, advance_paid: 500, status: 'waiting', created_at: '2026-05-30T08:00:00Z' },
  { id: 'b-9', booking_ref: 'KCB-4019', direction: 'IK', travel_date: TOMORROW_DATE, pickup_time: '04:00', passenger_name: 'Sunita Jain', phone: '9424077665', drop_point: 'ind-rwy', drop_name: 'Indore Railway Station', vehicle_type: 'sedan', base_fare: 2200, discount: 0, night_extra: 300, total_fare: 2500, advance_paid: 500, status: 'waiting', created_at: '2026-05-30T08:15:00Z' },
  { id: 'b-10', booking_ref: 'KCB-4020', direction: 'KI', travel_date: TODAY_DATE, pickup_time: '18:00', passenger_name: 'Alok Mishra', phone: '9893011223', drop_point: 'ind-vij', drop_name: 'Vijay Nagar', vehicle_type: 'sedan', base_fare: 2200, discount: 100, night_extra: 0, total_fare: 2100, advance_paid: 0, status: 'cancelled', created_at: '2026-05-29T16:00:00Z' }
]

const INITIAL_TRANSACTIONS: Transaction[] = [
  { id: 't-1', date: TODAY_DATE, booking_ref: 'KCB-4011', passenger_name: 'Harish Mandloi', amount: 500, type: 'advance', method: 'UPI' },
  { id: 't-2', date: TODAY_DATE, booking_ref: 'KCB-4012', passenger_name: 'Priya Sharma', amount: 500, type: 'advance', method: 'UPI' },
  { id: 't-3', date: TODAY_DATE, booking_ref: 'KCB-4013', passenger_name: 'Sanjay Patidar', amount: 1000, type: 'advance', method: 'UPI' },
  { id: 't-4', date: TODAY_DATE, booking_ref: 'KCB-4011', passenger_name: 'Harish Mandloi', amount: 1600, type: 'balance', method: 'Cash' },
  { id: 't-5', date: TOMORROW_DATE, booking_ref: 'KCB-4017', passenger_name: 'Rajesh Solanki', amount: 2200, type: 'full', method: 'UPI' },
  { id: 't-6', date: TOMORROW_DATE, booking_ref: 'KCB-4018', passenger_name: 'Deepak Verma', amount: 500, type: 'advance', method: 'UPI' }
]

const INITIAL_NOTIFICATIONS = [
  { id: 'n-1', type: 'info', text: 'New booking KCB-4019 waiting for match', time: '10 mins ago', read: false },
  { id: 'n-2', type: 'success', text: 'Auto Match Found: KCB-4011 matched with KCB-4012', time: '2 hours ago', read: false },
  { id: 'n-3', type: 'warning', text: 'Driver Rajesh Kumar license expiring in 45 days', time: '1 day ago', read: true },
  { id: 'n-4', type: 'warning', text: 'Vehicle MP-09-GH-3456 permit expiring in 18 days', time: '2 days ago', read: true }
]

const INITIAL_SETTINGS = {
  business_name: 'Khargone Cabs Pvt Ltd',
  phone: '98260 98260',
  email: 'support@khargonecabs.com',
  address: 'Bus Stand Road, Near Mandi, Khargone (M.P.)',
  base_sedan: 2200,
  base_suv: 2800,
  base_innova: 3200,
  night_charge: 300,
  commission_agent: 10,
  advance_req: 500,
  rac_cancel_hrs: 48,
  template_rac: 'Hello [Name], your cab request [ID] from [Route] on [Date] at [Time] is in waiting (RAC). We are matching a return trip. Support: [AdminPhone]',
  template_confirmed: 'Great news [Name]! Your cab booking [ID] is confirmed. Cab: [CarModel] ([Plate]), Driver: [DriverName] ([Phone]). Balance due: ₹[Balance].',
  template_reminder: 'Reminder [Name]: Your cab [ID] is scheduled for tomorrow at [Time] from [Route]. Driver detail: [DriverName] ([Phone]).'
}

export default function AdminDashboard() {
  // ─── States ─────────────────────────────────────────────────────────────────
  const [bookings, setBookings] = useState<Booking[]>(INITIAL_BOOKINGS)
  const [drivers, setDrivers] = useState<Driver[]>(INITIAL_DRIVERS)
  const [agents, setAgents] = useState<Agent[]>(INITIAL_AGENTS)
  const [vehicles, setVehicles] = useState<Vehicle[]>(INITIAL_VEHICLES)
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS)
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS)
  const [settings, setSettings] = useState(INITIAL_SETTINGS)

  const [activeTab, setActiveTab] = useState<TabType>('dashboard')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [globalSearch, setGlobalSearch] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)

  // Drawer / Modals
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [showNewBooking, setShowNewBooking] = useState(false)
  const [showLinkModal, setShowLinkModal] = useState<Booking | null>(null)
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null)
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [driverModalMode, setDriverModalMode] = useState<'create' | 'edit'>('create')
  const [agentModalMode, setAgentModalMode] = useState<'create' | 'edit'>('create')
  const [vehicleModalMode, setVehicleModalMode] = useState<'create' | 'edit'>('create')
  const [showDriverModal, setShowDriverModal] = useState(false)
  const [showAgentModal, setShowAgentModal] = useState(false)
  const [showVehicleModal, setShowVehicleModal] = useState(false)
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null)

  // Toasts
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [toastType, setToastType] = useState<'success' | 'error'>('success')

  // Auto Matching Settings
  const [matchThreshold, setMatchThreshold] = useState(80)

  // Hydration state
  const [isMounted, setIsMounted] = useState(false)
  useEffect(() => {
    setIsMounted(true)
    // Responsive Collapsing on small devices
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setSidebarCollapsed(true)
      } else {
        setSidebarCollapsed(false)
      }
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // ─── Toast Helper ───────────────────────────────────────────────────────────
  const triggerToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToastMessage(msg)
    setToastType(type)
    setTimeout(() => setToastMessage(null), 3000)
  }

  // ─── Drag and Drop State ─────────────────────────────────────────────────────
  const [draggedBookingId, setDraggedBookingId] = useState<string | null>(null)

  // ─── Computed Stats ─────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const todayB = bookings.filter(b => b.travel_date === TODAY_DATE)
    const todayConfirmed = todayB.filter(b => b.status === 'confirmed')
    const todayRevenue = todayConfirmed.reduce((sum, b) => sum + b.total_fare, 0)
    const activeTripsCount = todayConfirmed.filter(b => b.driver_id).length
    const unmatchedCount = bookings.filter(b => b.status === 'waiting').length
    const totalRevenue = bookings.filter(b => b.status !== 'cancelled').reduce((sum, b) => sum + b.total_fare, 0)

    // Match Rate calculation
    const linkedCount = bookings.filter(b => b.status === 'confirmed' && b.matched_with).length
    const matchRate = bookings.length > 0 ? Math.round((linkedCount / bookings.length) * 100) : 0

    return {
      todayCount: todayB.length,
      todayRevenue,
      activeTripsCount,
      unmatchedCount,
      totalRevenue,
      matchRate
    }
  }, [bookings])

  // ─── Search Results ─────────────────────────────────────────────────────────
  const searchResults = useMemo(() => {
    if (!globalSearch.trim()) return { bookings: [], drivers: [], agents: [] }
    const query = globalSearch.toLowerCase()
    const matchBookings = bookings.filter(b =>
      b.booking_ref.toLowerCase().includes(query) ||
      b.passenger_name.toLowerCase().includes(query) ||
      b.phone.includes(query)
    )
    const matchDrivers = drivers.filter(d =>
      d.name.toLowerCase().includes(query) ||
      d.phone.includes(query) ||
      d.vehicle_number.toLowerCase().includes(query)
    )
    const matchAgents = agents.filter(a =>
      a.name.toLowerCase().includes(query) ||
      a.phone.includes(query) ||
      a.area.toLowerCase().includes(query)
    )
    return { bookings: matchBookings, drivers: matchDrivers, agents: matchAgents }
  }, [globalSearch, bookings, drivers, agents])

  // ─── Dashboard Charts Data ──────────────────────────────────────────────────
  const revenueChartData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date()
      d.setDate(d.getDate() - i)
      return d.toISOString().split('T')[0]
    }).reverse()

    return last7Days.map(date => {
      const dayBookings = bookings.filter(b => b.travel_date === date && b.status !== 'cancelled')
      const revenue = dayBookings.reduce((sum, b) => sum + b.total_fare, 0)
      const cost = dayBookings.reduce((sum, b) => {
        // Mock driver payouts / fuel costs
        const rate = b.vehicle_type === 'sedan' ? 1200 : b.vehicle_type === 'suv' ? 1600 : 2000
        return sum + rate
      }, 0)
      const profit = revenue - cost
      const displayDate = new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
      return { name: displayDate, revenue, cost, profit }
    })
  }, [bookings])

  const bookingStatusData = useMemo(() => {
    const linked = bookings.filter(b => b.status === 'confirmed' && b.matched_with).length
    const unlinked = bookings.filter(b => b.status === 'waiting').length
    const cancelled = bookings.filter(b => b.status === 'cancelled').length
    return [
      { name: 'Linked (Confirmed)', value: linked, color: '#22C55E' },
      { name: 'Unlinked (RAC)', value: unlinked, color: '#F59E0B' },
      { name: 'Cancelled', value: cancelled, color: '#EF4444' }
    ]
  }, [bookings])

  // ─── Matching Queue ─────────────────────────────────────────────────────────
  const matchingSuggestions = useMemo(() => {
    const unmatchedKI = bookings.filter(b => b.status === 'waiting' && b.direction === 'KI')
    const unmatchedIK = bookings.filter(b => b.status === 'waiting' && b.direction === 'IK')
    const suggestions: { b1: Booking; b2: Booking; confidence: number }[] = []

    unmatchedKI.forEach(ki => {
      unmatchedIK.forEach(ik => {
        if (ki.travel_date === ik.travel_date) {
          // Compute a mock match confidence score based on time difference and vehicle capacity
          const timeDiffMin = Math.abs(
            (parseInt(ki.pickup_time.split(':')[0]) * 60 + parseInt(ki.pickup_time.split(':')[1])) -
            (parseInt(ik.pickup_time.split(':')[0]) * 60 + parseInt(ik.pickup_time.split(':')[1]))
          )
          let confidence = 100 - Math.min(20, Math.floor(timeDiffMin / 15))
          if (ki.vehicle_type !== ik.vehicle_type) confidence -= 10
          suggestions.push({ b1: ki, b2: ik, confidence })
        }
      })
    })

    return suggestions.sort((a, b) => b.confidence - a.confidence)
  }, [bookings])

  // ─── Actions ────────────────────────────────────────────────────────────────
  const handleLinkBookings = (id1: string, id2: string) => {
    setBookings(prev =>
      prev.map(b => {
        if (b.id === id1) return { ...b, status: 'confirmed', matched_with: id2 }
        if (b.id === id2) return { ...b, status: 'confirmed', matched_with: id1 }
        return b
      })
    )
    const ref1 = bookings.find(b => b.id === id1)?.booking_ref
    const ref2 = bookings.find(b => b.id === id2)?.booking_ref
    // Add transaction for balance collected or advance update
    triggerToast(`🔗 Linked booking ${ref1} and ${ref2} successfully!`)
    setShowLinkModal(null)
  }

  const handleUnlinkBooking = (id: string) => {
    const current = bookings.find(b => b.id === id)
    if (!current || !current.matched_with) return

    const partnerId = current.matched_with

    setBookings(prev =>
      prev.map(b => {
        if (b.id === id) return { ...b, status: 'waiting', matched_with: undefined }
        if (b.id === partnerId) return { ...b, status: 'waiting', matched_with: undefined }
        return b
      })
    )
    triggerToast('🔓 Bookings unlinked successfully.')
  }

  const handleCancelBooking = (id: string) => {
    const current = bookings.find(b => b.id === id)
    if (!current) return

    if (current.matched_with) {
      handleUnlinkBooking(id)
    }

    setBookings(prev =>
      prev.map(b => (b.id === id ? { ...b, status: 'cancelled' } : b))
    )
    triggerToast(`❌ Booking ${current.booking_ref} marked as Cancelled.`)
  }

  const handleBulkLink = () => {
    const threshold = matchThreshold
    const list = matchingSuggestions.filter(s => s.confidence >= threshold)
    if (list.length === 0) {
      triggerToast('No suggestions above threshold!', 'error')
      return
    }

    let linkedCount = 0
    let tempBookings = [...bookings]

    list.forEach(({ b1, b2 }) => {
      const latestB1 = tempBookings.find(b => b.id === b1.id)
      const latestB2 = tempBookings.find(b => b.id === b2.id)

      if (latestB1 && latestB2 && !latestB1.matched_with && !latestB2.matched_with) {
        latestB1.status = 'confirmed'
        latestB1.matched_with = b2.id
        latestB2.status = 'confirmed'
        latestB2.matched_with = b1.id
        linkedCount++
      }
    })

    setBookings(tempBookings)
    triggerToast(`⚡ Automatically paired ${linkedCount} couples!`)
  }

  const handleCreateBooking = (data: Partial<Booking>) => {
    const newId = `b-${bookings.length + 1}`
    const ref = `KCB-${4020 + bookings.length}`
    const finalFare = (data.base_fare || 0) + (data.night_extra || 0) - (data.discount || 0)

    const newB: Booking = {
      id: newId,
      booking_ref: ref,
      direction: data.direction || 'KI',
      travel_date: data.travel_date || TODAY_DATE,
      pickup_time: data.pickup_time || '10:00',
      passenger_name: data.passenger_name || 'Passenger Name',
      phone: data.phone || '9999999999',
      email: data.email,
      drop_point: data.drop_point || 'ind-vij',
      drop_name: data.drop_name || 'Vijay Nagar',
      vehicle_type: data.vehicle_type || 'sedan',
      base_fare: data.base_fare || 2200,
      discount: data.discount || 0,
      night_extra: data.night_extra || 0,
      total_fare: finalFare,
      advance_paid: data.advance_paid || 0,
      status: 'waiting',
      driver_id: data.driver_id,
      agent_id: data.agent_id,
      notes: data.notes,
      created_at: new Date().toISOString()
    }

    setBookings(prev => [newB, ...prev])
    // Create advance transaction if paid
    if (newB.advance_paid > 0) {
      setTransactions(prev => [
        {
          id: `t-${transactions.length + 1}`,
          date: newB.travel_date,
          booking_ref: newB.booking_ref,
          passenger_name: newB.passenger_name,
          amount: newB.advance_paid,
          type: 'advance',
          method: 'UPI'
        },
        ...prev
      ])
    }
    triggerToast(`Booking ${ref} Created successfully!`)
    setShowNewBooking(false)
  }

  // CRUD Helpers
  const handleSaveDriver = (driver: Partial<Driver>) => {
    if (driverModalMode === 'create') {
      const newD: Driver = {
        id: `drv-${drivers.length + 1}`,
        name: driver.name || 'New Driver',
        phone: driver.phone || '9000000000',
        vehicle_type: driver.vehicle_type || 'sedan',
        vehicle_number: driver.vehicle_number || 'MP-09-XX-0000',
        vehicle_model: driver.vehicle_model || 'Model',
        status: 'active',
        rating: 5.0,
        trips_completed: 0,
        license_expiry: driver.license_expiry || TODAY_DATE,
        permit_expiry: driver.permit_expiry || TODAY_DATE,
        created_at: TODAY_DATE
      }
      setDrivers(prev => [...prev, newD])
      triggerToast('Driver added successfully!')
    } else {
      setDrivers(prev => prev.map(d => (d.id === driver.id ? { ...d, ...driver } : d) as Driver))
      triggerToast('Driver updated successfully!')
    }
    setShowDriverModal(false)
  }

  const handleDeleteDriver = (id: string) => {
    setDrivers(prev => prev.filter(d => d.id !== id))
    triggerToast('Driver deleted.')
  }

  const handleSaveAgent = (agent: Partial<Agent>) => {
    if (agentModalMode === 'create') {
      const newA: Agent = {
        id: `agt-${agents.length + 1}`,
        name: agent.name || 'New Agent',
        phone: agent.phone || '9000000000',
        email: agent.email || 'agent@kcabs.in',
        area: agent.area || 'Area',
        commission_pct: agent.commission_pct || 10,
        status: 'active',
        bookings_linked: 0,
        total_payout: 0,
        created_at: TODAY_DATE
      }
      setAgents(prev => [...prev, newA])
      triggerToast('Agent added successfully!')
    } else {
      setAgents(prev => prev.map(a => (a.id === agent.id ? { ...a, ...agent } : a) as Agent))
      triggerToast('Agent updated successfully!')
    }
    setShowAgentModal(false)
  }

  const handleDeleteAgent = (id: string) => {
    setAgents(prev => prev.filter(a => a.id !== id))
    triggerToast('Agent deleted.')
  }

  const handleSaveVehicle = (veh: Partial<Vehicle>) => {
    if (vehicleModalMode === 'create') {
      const newV: Vehicle = {
        id: `veh-${vehicles.length + 1}`,
        make: veh.make || 'Make',
        model: veh.model || 'Model',
        plate: veh.plate || 'Plate',
        type: veh.type || 'sedan',
        capacity: veh.type === 'sedan' ? 4 : veh.type === 'suv' ? 6 : 7,
        status: 'active',
        driver_id: veh.driver_id
      }
      setVehicles(prev => [...prev, newV])
      triggerToast('Vehicle registered successfully!')
    } else {
      setVehicles(prev => prev.map(v => (v.id === veh.id ? { ...v, ...veh } : v) as Vehicle))
      triggerToast('Vehicle updated successfully!')
    }
    setShowVehicleModal(false)
  }

  const handleDeleteVehicle = (id: string) => {
    setVehicles(prev => prev.filter(v => v.id !== id))
    triggerToast('Vehicle deleted.')
  }

  // ─── Drag and Drop Handlers ──────────────────────────────────────────────────
  const handleDragStart = (e: DragEvent, id: string) => {
    setDraggedBookingId(id)
    e.dataTransfer.setData('text/plain', id)
  }

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: DragEvent, targetId: string) => {
    e.preventDefault()
    const sourceId = draggedBookingId || e.dataTransfer.getData('text/plain')
    if (!sourceId || sourceId === targetId) return

    const sourceB = bookings.find(b => b.id === sourceId)
    const targetB = bookings.find(b => b.id === targetId)

    if (sourceB && targetB) {
      if (sourceB.status === 'confirmed' || targetB.status === 'confirmed') {
        triggerToast('One of the bookings is already linked!', 'error')
        return
      }
      if (sourceB.travel_date !== targetB.travel_date) {
        triggerToast('Travel dates must match to pair!', 'error')
        return
      }
      if (sourceB.direction === targetB.direction) {
        triggerToast('Directions must be opposite to match!', 'error')
        return
      }
      handleLinkBookings(sourceId, targetId)
    }
    setDraggedBookingId(null)
  }

  return (
    <div className={`${dmSans.variable} ${sora.variable} font-sans bg-slate-900 text-slate-100 min-h-screen flex`}>
      
      {/* ─── SIDEBAR ───────────────────────────────────────────────────────────── */}
      <aside
        className={`bg-slate-800 border-r border-slate-700 flex flex-col fixed top-0 bottom-0 left-0 z-20 transition-all duration-200 ${
          sidebarCollapsed ? 'w-16' : 'w-56'
        }`}
      >
        {/* Brand */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-700">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 bg-brand text-slate-950 flex items-center justify-center font-extrabold rounded-lg shrink-0 text-base">
              KC
            </div>
            {!sidebarCollapsed && (
              <div className="flex flex-col">
                <span className="font-sora text-sm font-extrabold text-brand tracking-tight">Khargone_Cab</span>
                <span className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold">Admin Panel</span>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'bookings', label: 'Bookings', icon: Calendar },
            { id: 'dispatch', label: 'Dispatch Board', icon: ArrowRight, badge: 'Live', badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
            { id: 'drivers', label: 'Drivers', icon: UserCheck },
            { id: 'agents', label: 'Agents', icon: Users },
            { id: 'vehicles', label: 'Vehicles', icon: Car },
            { id: 'matching', label: 'Auto Matching', icon: Link2, badge: 'New', badgeColor: 'bg-amber-500/20 text-brand border-brand/30' },
            { id: 'payments', label: 'Payments', icon: CreditCard },
            { id: 'reports', label: 'Reports', icon: BarChart3 },
            { id: 'settings', label: 'Settings', icon: Settings },
          ].map(item => {
            const Icon = item.icon
            const active = activeTab === item.id
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as TabType)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all border-l-4 ${
                  active
                    ? 'bg-brand/10 text-brand border-brand'
                    : 'text-slate-400 border-transparent hover:bg-slate-700/30 hover:text-slate-200'
                }`}
              >
                <Icon size={16} className="shrink-0" />
                {!sidebarCollapsed && (
                  <span className="flex-1 text-left truncate">{item.label}</span>
                )}
                {!sidebarCollapsed && item.badge && (
                  <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full border ${item.badgeColor}`}>
                    {item.badge}
                  </span>
                )}
              </button>
            )
          })}
        </nav>

        {/* Footer Admin Profile */}
        <div className="p-3 border-t border-slate-700">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-brand/10 border border-brand flex items-center justify-center font-bold text-brand shrink-0">
              A
            </div>
            {!sidebarCollapsed && (
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold truncate">Super Admin</span>
                <span className="text-[9px] text-slate-400 truncate">MVP Access</span>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* ─── MAIN CONTENT CONTAINER ────────────────────────────────────────────── */}
      <div
        className={`flex-1 flex flex-col transition-all duration-200 min-h-screen ${
          sidebarCollapsed ? 'pl-16' : 'pl-56'
        }`}
      >
        
        {/* ─── TOP BAR ─────────────────────────────────────────────────────────── */}
        <header className="h-16 bg-slate-800 border-b border-slate-700 flex items-center justify-between px-6 sticky top-0 z-10">
          {/* Search Box */}
          <div className="relative w-80">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search Booking ID, Passenger, Driver..."
              value={globalSearch}
              onChange={e => setGlobalSearch(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-4 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-brand transition-colors"
            />
            {/* Search Dropdown */}
            {searchFocused && globalSearch && (
              <div className="absolute top-11 left-0 right-0 bg-slate-800 border border-slate-700 rounded-lg shadow-xl max-h-72 overflow-y-auto p-2 space-y-2 z-50 text-xs">
                {searchResults.bookings.length === 0 && searchResults.drivers.length === 0 && searchResults.agents.length === 0 ? (
                  <div className="p-3 text-center text-slate-400">No matching records found.</div>
                ) : (
                  <>
                    {searchResults.bookings.length > 0 && (
                      <div>
                        <div className="px-2 py-1 text-[9px] font-bold text-slate-400 uppercase tracking-wider">Bookings</div>
                        {searchResults.bookings.map(b => (
                          <button
                            key={b.id}
                            onClick={() => { setSelectedBooking(b); setActiveTab('bookings') }}
                            className="w-full text-left p-2 rounded hover:bg-slate-700/50 flex justify-between items-center"
                          >
                            <div>
                              <div className="font-bold text-brand">{b.booking_ref}</div>
                              <div className="text-[10px] text-slate-400">{b.passenger_name}</div>
                            </div>
                            <span className="text-[10px] text-slate-300">{b.travel_date}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {searchResults.drivers.length > 0 && (
                      <div>
                        <div className="px-2 py-1 text-[9px] font-bold text-slate-400 uppercase tracking-wider">Drivers</div>
                        {searchResults.drivers.map(d => (
                          <button
                            key={d.id}
                            onClick={() => { setSelectedDriver(d); setActiveTab('drivers') }}
                            className="w-full text-left p-2 rounded hover:bg-slate-700/50 flex justify-between items-center"
                          >
                            <div>
                              <div className="font-bold">{d.name}</div>
                              <div className="text-[10px] text-slate-400">{d.vehicle_number}</div>
                            </div>
                            <span className="text-[10px] text-slate-300">{d.phone}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {searchResults.agents.length > 0 && (
                      <div>
                        <div className="px-2 py-1 text-[9px] font-bold text-slate-400 uppercase tracking-wider">Agents</div>
                        {searchResults.agents.map(a => (
                          <button
                            key={a.id}
                            onClick={() => { setSelectedAgent(a); setActiveTab('agents') }}
                            className="w-full text-left p-2 rounded hover:bg-slate-700/50 flex justify-between items-center"
                          >
                            <div>
                              <div className="font-bold">{a.name}</div>
                              <div className="text-[10px] text-slate-400">{a.area}</div>
                            </div>
                            <span className="text-[10px] text-slate-300">{a.phone}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-4">
            {/* Collapse / Expand Toggle */}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="text-xs font-semibold px-2.5 py-1 bg-slate-750 border border-slate-700 rounded-md text-slate-300 hover:bg-slate-700"
            >
              {sidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            </button>

            {/* Quick WhatsApp Link */}
            <a
              href={`https://wa.me/91${settings.phone.replace(/\s+/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-slate-950 font-bold rounded-lg text-xs transition-all"
            >
              <Send size={12} />
              <span>WhatsApp Cloud</span>
            </a>

            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="w-9 h-9 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-slate-300 hover:bg-slate-700 transition-colors"
              >
                <Bell size={16} />
                {notifications.some(n => !n.read) && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-rose-500" />
                )}
              </button>
              {showNotifications && (
                <div className="absolute right-0 top-11 w-80 bg-slate-800 border border-slate-700 rounded-lg shadow-xl p-3 z-50 space-y-2">
                  <div className="flex justify-between items-center border-b border-slate-700 pb-2 mb-1">
                    <span className="font-sora font-bold text-xs text-slate-200">Alert Center</span>
                    <button
                      onClick={() => setNotifications(prev => prev.map(n => ({ ...n, read: true })))}
                      className="text-[10px] text-brand hover:underline"
                    >
                      Mark all read
                    </button>
                  </div>
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {notifications.map(n => (
                      <div
                        key={n.id}
                        className={`p-2 rounded text-xs transition-colors border ${
                          n.read ? 'bg-slate-900/40 border-transparent text-slate-400' : 'bg-slate-900 border-slate-700 text-slate-200'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          {n.type === 'success' ? (
                            <CheckCircle size={14} className="text-emerald-500 mt-0.5 shrink-0" />
                          ) : n.type === 'warning' ? (
                            <AlertTriangle size={14} className="text-amber-500 mt-0.5 shrink-0" />
                          ) : (
                            <Info size={14} className="text-sky-500 mt-0.5 shrink-0" />
                          )}
                          <div className="flex-1">
                            <div>{n.text}</div>
                            <div className="text-[9px] text-slate-500 mt-0.5">{n.time}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* ─── PAGE MAIN VIEW ─────────────────────────────────────────────────── */}
        <main className="flex-1 p-6 space-y-6 overflow-x-hidden">
          
          {/* TAB 1: DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Heading */}
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="font-sora text-2xl font-extrabold text-slate-100">Dashboard Overview</h1>
                  <p className="text-xs text-slate-400 mt-1">Real-time status updates and early bird matching</p>
                </div>
                <button
                  onClick={() => triggerToast('📊 Refreshing dashboard...')}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold transition-colors"
                >
                  <RefreshCw size={13} className="animate-spin" />
                  <span>Refresh</span>
                </button>
              </div>

              {/* Stat Cards */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                {[
                  { label: "Today's Bookings", val: stats.todayCount, sub: "+4 vs yesterday", color: 'border-brand text-brand', icon: Calendar },
                  { label: "Today's Revenue", val: `₹${stats.todayRevenue.toLocaleString('en-IN')}`, sub: "+12.4% vs last week", color: 'border-emerald-500 text-emerald-400', icon: DollarSign },
                  { label: "Unmatched (RAC)", val: stats.unmatchedCount, sub: "Pending pairs", color: 'border-amber-500 text-amber-500', icon: AlertCircle },
                  { label: "Active Trips", val: stats.activeTripsCount, sub: "Currently moving", color: 'border-sky-500 text-sky-400', icon: Car },
                  { label: "Month Revenue", val: `₹${(stats.totalRevenue / 1000).toFixed(1)}k`, sub: "18% of target met", color: 'border-purple-500 text-purple-400', icon: TrendingUp }
                ].map((s, idx) => {
                  const Icon = s.icon
                  return (
                    <div key={idx} className={`bg-slate-800 border-t-4 ${s.color} rounded-xl p-4 shadow-lg flex flex-col gap-1 hover:-translate-y-0.5 hover:shadow-xl transition-all duration-150`}>
                      <div className="flex justify-between items-center text-slate-400">
                        <span className="text-[10px] font-bold uppercase tracking-wider">{s.label}</span>
                        <Icon size={14} />
                      </div>
                      <div className="font-sora text-xl font-extrabold tracking-tight mt-1">{s.val}</div>
                      <div className="text-[9px] text-emerald-400 mt-1 font-medium">{s.sub}</div>
                    </div>
                  )
                })}
              </div>

              {/* Dashboard Content Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Auto Matching Suggestions */}
                <div className="lg:col-span-2 bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-lg space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h2 className="font-sora text-sm font-bold text-slate-200">🔗 Auto Matching suggestions</h2>
                      <p className="text-[10px] text-slate-400">Unmatched opposite-route pairs travelling on matching days</p>
                    </div>
                    <button
                      onClick={() => setActiveTab('matching')}
                      className="text-[10px] font-bold text-brand hover:underline flex items-center gap-1"
                    >
                      <span>View Match Queue</span>
                      <ChevronRight size={12} />
                    </button>
                  </div>

                  <div className="space-y-3">
                    {matchingSuggestions.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                        <CheckCircle size={28} className="text-emerald-500 mb-2" />
                        <span className="text-xs">No pending matches. All bookings matched!</span>
                      </div>
                    ) : (
                      matchingSuggestions.slice(0, 3).map((item, idx) => (
                        <div key={idx} className="bg-slate-900 border border-brand/20 hover:border-brand/45 rounded-lg p-3 flex flex-col gap-2 transition-all">
                          <div className="flex justify-between items-center">
                            <div className="w-[45%]">
                              <div className="flex items-center gap-1.5">
                                <span className="font-extrabold text-[10px] text-brand">{item.b1.booking_ref}</span>
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-brand">Khargone</span>
                              </div>
                              <div className="font-semibold text-xs mt-1 truncate">{item.b1.passenger_name}</div>
                              <div className="text-[9px] text-slate-400 mt-0.5">{item.b1.travel_date} · {item.b1.pickup_time}</div>
                            </div>
                            
                            <div className="flex flex-col items-center justify-center w-[10%]">
                              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-1 py-0.5 rounded">{item.confidence}%</span>
                              <ArrowRight size={14} className="text-slate-500 mt-1" />
                            </div>

                            <div className="w-[45%] text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400">Indore</span>
                                <span className="font-extrabold text-[10px] text-brand">{item.b2.booking_ref}</span>
                              </div>
                              <div className="font-semibold text-xs mt-1 truncate">{item.b2.passenger_name}</div>
                              <div className="text-[9px] text-slate-400 mt-0.5">{item.b2.travel_date} · {item.b2.pickup_time}</div>
                            </div>
                          </div>
                          
                          <button
                            onClick={() => handleLinkBookings(item.b1.id, item.b2.id)}
                            className="w-full py-1 bg-brand hover:bg-brand-dark active:scale-98 text-slate-950 font-bold rounded text-[10px] transition-all"
                          >
                            🔗 Auto-Link Rides
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Booking Status Donut Chart */}
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-lg flex flex-col justify-between">
                  <div>
                    <h2 className="font-sora text-sm font-bold text-slate-200">📊 Booking Status Ratio</h2>
                    <p className="text-[10px] text-slate-400">Linked Confirmed vs Unlinked RAC</p>
                  </div>
                  
                  <div className="h-44 w-full mt-2">
                    {isMounted ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={bookingStatusData}
                            innerRadius={50}
                            outerRadius={70}
                            paddingAngle={4}
                            dataKey="value"
                          >
                            {bookingStatusData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ backgroundColor: '#1E293B', borderColor: '#334155', color: '#F8FAFC', borderRadius: '8px' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs">Loading Charts...</div>
                    )}
                  </div>

                  <div className="space-y-1.5 text-xs">
                    {bookingStatusData.map((d, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-slate-400">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                          <span>{d.name}</span>
                        </div>
                        <span className="font-bold">{d.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* Lower Section Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Driver Schedule Overview */}
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-lg space-y-4">
                  <div>
                    <h2 className="font-sora text-sm font-bold text-slate-200">📅 Driver Schedule Overview</h2>
                    <p className="text-[10px] text-slate-400">Upcoming assignments & status</p>
                  </div>
                  <div className="divide-y divide-slate-700">
                    {drivers.map(drv => {
                      const activeBookings = bookings.filter(b => b.driver_id === drv.id && b.status === 'confirmed')
                      return (
                        <div key={drv.id} className="py-2.5 flex items-center justify-between text-xs">
                          <div>
                            <div className="font-bold">{drv.name}</div>
                            <div className="text-[10px] text-slate-400">{drv.vehicle_model} · {drv.vehicle_number}</div>
                          </div>
                          <div className="text-right">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                              drv.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' :
                              drv.status === 'on_trip' ? 'bg-sky-500/10 text-sky-400' : 'bg-slate-700 text-slate-400'
                            }`}>
                              {drv.status}
                            </span>
                            <div className="text-[9px] text-slate-400 mt-1">{activeBookings.length} assignments</div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Last 7 Days Revenue Trend */}
                <div className="lg:col-span-2 bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-lg space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h2 className="font-sora text-sm font-bold text-slate-200">📈 Revenue & Profit Analysis</h2>
                      <p className="text-[10px] text-slate-400">Weekly sales vs vehicle settlement payout</p>
                    </div>
                  </div>
                  <div className="h-56 w-full">
                    {isMounted ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={revenueChartData}>
                          <defs>
                            <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#F5A623" stopOpacity={0.2}/>
                              <stop offset="95%" stopColor="#F5A623" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#22C55E" stopOpacity={0.2}/>
                              <stop offset="95%" stopColor="#22C55E" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <XAxis dataKey="name" stroke="#94A3B8" fontSize={9} />
                          <YAxis stroke="#94A3B8" fontSize={9} />
                          <Tooltip contentStyle={{ backgroundColor: '#1E293B', borderColor: '#334155', color: '#F8FAFC', borderRadius: '8px' }} />
                          <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                          <Area type="monotone" dataKey="revenue" name="Total Revenue" stroke="#F5A623" fillOpacity={1} fill="url(#colorRev)" />
                          <Area type="monotone" dataKey="profit" name="Net Profit" stroke="#22C55E" fillOpacity={1} fill="url(#colorProfit)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs">Loading Charts...</div>
                    )}
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB 2: BOOKINGS */}
          {activeTab === 'bookings' && (
            <div className="space-y-6">
              {/* Header Bar */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h1 className="font-sora text-2xl font-extrabold text-slate-100">Booking Management</h1>
                  <p className="text-xs text-slate-400 mt-1">Manage manual customer reservations and match links</p>
                </div>
                <button
                  onClick={() => setShowNewBooking(true)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-brand hover:bg-brand-dark active:scale-95 text-slate-950 font-bold rounded-lg text-xs transition-all"
                >
                  <Plus size={14} />
                  <span>New Booking</span>
                </button>
              </div>

              {/* Bookings Filters */}
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex flex-wrap items-center gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <Filter size={14} className="text-slate-400" />
                  <span className="font-semibold text-slate-300">Filter By</span>
                </div>
                
                {/* Search Term */}
                <input
                  type="text"
                  placeholder="Search ref or passenger..."
                  onChange={e => setGlobalSearch(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-brand"
                />

                {/* Custom Filters logic in table */}
              </div>

              {/* Bookings Table */}
              <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-lg">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="bg-slate-900 text-slate-400 border-b border-slate-700 text-[10px] font-bold uppercase tracking-wider">
                        <th className="p-4">Ref / Created</th>
                        <th className="p-4">Passenger Details</th>
                        <th className="p-4">Route Info</th>
                        <th className="p-4">Vehicle Details</th>
                        <th className="p-4">Fare breakdown</th>
                        <th className="p-4">Match Connect</th>
                        <th className="p-4">Status</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/60">
                      {bookings.map(b => {
                        const matchedB = b.matched_with ? bookings.find(x => x.id === b.matched_with) : null
                        return (
                          <tr
                            key={b.id}
                            draggable
                            onDragStart={e => handleDragStart(e, b.id)}
                            onDragOver={handleDragOver}
                            onDrop={e => handleDrop(e, b.id)}
                            className="hover:bg-slate-700/35 transition-colors cursor-move"
                          >
                            <td className="p-4 font-medium">
                              <div className="font-bold text-brand">{b.booking_ref}</div>
                              <div className="text-[10px] text-slate-400 mt-0.5">{new Date(b.created_at).toLocaleDateString('en-IN')}</div>
                            </td>
                            <td className="p-4">
                              <div className="font-bold">{b.passenger_name}</div>
                              <div className="text-[10px] text-slate-400">{b.phone}</div>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-1.5">
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                  b.direction === 'KI' ? 'bg-amber-500/15 text-brand' : 'bg-sky-500/15 text-sky-400'
                                }`}>
                                  {b.direction === 'KI' ? 'Khargone' : 'Indore'}
                                </span>
                                <ArrowRight size={10} className="text-slate-500" />
                                <span className="text-slate-300 font-semibold truncate max-w-[90px]">{b.drop_name}</span>
                              </div>
                              <div className="text-[10px] text-slate-400 mt-1">{b.travel_date} · {b.pickup_time}</div>
                            </td>
                            <td className="p-4 capitalize">
                              <div className="font-semibold">{b.vehicle_type}</div>
                              {b.driver_id && (
                                <div className="text-[10px] text-slate-400 mt-0.5">
                                  {drivers.find(d => d.id === b.driver_id)?.name}
                                </div>
                              )}
                            </td>
                            <td className="p-4">
                              <div className="font-bold">₹{b.total_fare.toLocaleString('en-IN')}</div>
                              <div className="text-[10px] text-slate-400 mt-0.5">
                                Adv: ₹{b.advance_paid} | Bal: ₹{b.total_fare - b.advance_paid}
                              </div>
                            </td>
                            <td className="p-4">
                              {matchedB ? (
                                <div className="flex flex-col gap-1">
                                  <div className="flex items-center gap-1 text-[10px] text-emerald-400">
                                    <Link2 size={12} />
                                    <span>Pair: <strong>{matchedB.booking_ref}</strong></span>
                                  </div>
                                  <button
                                    onClick={() => handleUnlinkBooking(b.id)}
                                    className="text-[9px] text-rose-400 hover:underline text-left self-start"
                                  >
                                    Unlink Pair
                                  </button>
                                </div>
                              ) : b.status === 'cancelled' ? (
                                <span className="text-slate-500 text-[10px]">—</span>
                              ) : (
                                <div className="flex flex-col gap-1">
                                  <span className="text-amber-500 text-[10px] font-semibold">RAC (Unlinked)</span>
                                  <button
                                    onClick={() => setShowLinkModal(b)}
                                    className="text-[9px] text-brand hover:underline text-left self-start"
                                  >
                                    🔗 Link Booking
                                  </button>
                                </div>
                              )}
                            </td>
                            <td className="p-4">
                              <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold border ${
                                b.status === 'confirmed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                                b.status === 'cancelled' ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' :
                                'bg-amber-500/10 text-amber-500 border-amber-500/30'
                              }`}>
                                {b.status === 'confirmed' ? 'Linked' : b.status === 'cancelled' ? 'Cancelled' : 'Waiting'}
                              </span>
                            </td>
                            <td className="p-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => setSelectedBooking(b)}
                                  className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center text-slate-300 hover:bg-slate-700 transition-colors"
                                  title="View Booking Detail"
                                >
                                  <Eye size={13} />
                                </button>
                                {b.status !== 'cancelled' && (
                                  <button
                                    onClick={() => handleCancelBooking(b.id)}
                                    className="w-8 h-8 rounded-lg bg-slate-900 border border-rose-500/30 flex items-center justify-center text-rose-400 hover:bg-rose-950/40 transition-colors"
                                    title="Cancel Reservation"
                                  >
                                    <X size={13} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: DISPATCH BOARD */}
          {activeTab === 'dispatch' && (
            <div className="space-y-6">
              <div>
                <h1 className="font-sora text-2xl font-extrabold text-slate-100">Live Dispatch Control</h1>
                <p className="text-xs text-slate-400 mt-1">Track active vehicles on the Khargone ↔ Indore highway route (150 km)</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Visual Map Mockup */}
                <div className="lg:col-span-2 bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-lg flex flex-col gap-4">
                  <div className="flex justify-between items-center">
                    <span className="font-sora font-bold text-xs">Route Map: Khargone ↔ Indore</span>
                    <span className="flex items-center gap-1.5 text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                      <span>Live GPS Pins</span>
                    </span>
                  </div>

                  {/* Visual Highway Track */}
                  <div className="h-64 bg-slate-900 border border-slate-700 rounded-lg relative overflow-hidden flex items-center justify-center p-6">
                    {/* Highway Line */}
                    <div className="absolute left-10 right-10 h-1.5 bg-slate-750 flex justify-between items-center">
                      <div className="w-3 h-3 bg-brand rounded-full -mt-[3px] border-2 border-slate-900" title="Khargone Station" />
                      <div className="w-3 h-3 bg-sky-500 rounded-full -mt-[3px] border-2 border-slate-900" title="Indore Station" />
                    </div>

                    {/* Labels */}
                    <div className="absolute top-1/2 -translate-y-8 left-8 text-center">
                      <span className="text-[10px] font-bold text-brand block">KHARGONE</span>
                      <span className="text-[8px] text-slate-500 block">Km 0</span>
                    </div>

                    <div className="absolute top-1/2 -translate-y-8 right-8 text-center">
                      <span className="text-[10px] font-bold text-sky-400 block">INDORE</span>
                      <span className="text-[8px] text-slate-500 block">Km 150</span>
                    </div>

                    {/* Active Pins (Mocked positions along route) */}
                    <div className="absolute left-[30%] top-1/2 -translate-y-7 text-center">
                      <div className="w-6 h-6 rounded-full bg-emerald-600 text-slate-950 font-bold flex items-center justify-center text-[10px] mx-auto border-2 border-slate-900 cursor-pointer shadow-lg hover:scale-110 transition-transform">
                        RK
                      </div>
                      <span className="text-[8px] text-slate-400 block mt-1">Dzire (Sedan)</span>
                    </div>

                    <div className="absolute right-[25%] top-1/2 -translate-y-7 text-center">
                      <div className="w-6 h-6 rounded-full bg-sky-500 text-slate-950 font-bold flex items-center justify-center text-[10px] mx-auto border-2 border-slate-900 cursor-pointer shadow-lg hover:scale-110 transition-transform">
                        SJ
                      </div>
                      <span className="text-[8px] text-slate-400 block mt-1">Ertiga (SUV)</span>
                    </div>
                  </div>
                </div>

                {/* Active Dispatch List */}
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-lg space-y-4">
                  <h3 className="font-sora font-bold text-xs">Active Fleet Assignments</h3>
                  <div className="space-y-3">
                    {drivers.filter(d => d.status === 'active' || d.status === 'on_trip').map(drv => {
                      const activeB = bookings.find(b => b.driver_id === drv.id && b.status === 'confirmed')
                      return (
                        <div key={drv.id} className="bg-slate-900 border border-slate-700 rounded-lg p-3 space-y-2 text-xs">
                          <div className="flex justify-between items-center">
                            <span className="font-bold">{drv.name}</span>
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                              drv.status === 'on_trip' ? 'bg-sky-500/10 text-sky-400' : 'bg-emerald-500/10 text-emerald-400'
                            }`}>
                              {drv.status === 'on_trip' ? 'On Trip' : 'Available'}
                            </span>
                          </div>
                          {activeB ? (
                            <div className="space-y-1.5">
                              <div className="flex justify-between text-[10px] text-slate-400">
                                <span>Booking: <strong>{activeB.booking_ref}</strong></span>
                                <span>ETA: 45 mins</span>
                              </div>
                              <div className="text-[10px] text-slate-200">
                                {activeB.passenger_name} ({activeB.phone})
                              </div>
                              <button
                                onClick={() => {
                                  setBookings(prev => prev.map(b => (b.id === activeB.id ? { ...b, status: 'confirmed', matched_with: undefined } : b))) // mockup complete
                                  triggerToast(`Trip completed for driver ${drv.name}`)
                                }}
                                className="w-full py-1 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold rounded text-[10px] transition-colors"
                              >
                                Mark Trip Completed
                              </button>
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-500 block">Idle - Awaiting pairing dispatch</span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB 4: DRIVERS */}
          {activeTab === 'drivers' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="font-sora text-2xl font-extrabold text-slate-100">Driver Directory</h1>
                  <p className="text-xs text-slate-400 mt-1">Manage certified intercity drivers and permit expiries</p>
                </div>
                <button
                  onClick={() => { setDriverModalMode('create'); setSelectedDriver(null); setShowDriverModal(true) }}
                  className="flex items-center gap-1.5 px-4 py-2 bg-brand hover:bg-brand-dark active:scale-95 text-slate-950 font-bold rounded-lg text-xs transition-all"
                >
                  <Plus size={14} />
                  <span>Register Driver</span>
                </button>
              </div>

              {/* Drivers Card Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {drivers.map(drv => {
                  const isLicenseExpiring = new Date(drv.license_expiry).getTime() - Date.now() < 30 * 86400000 * 3 // warning if < 90 days
                  return (
                    <div key={drv.id} className="bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-lg flex flex-col justify-between hover:-translate-y-0.5 hover:shadow-xl transition-all duration-150 relative">
                      {isLicenseExpiring && (
                        <div className="absolute top-4 right-4 bg-amber-500/10 border border-amber-500/20 text-brand rounded-full p-1" title="Documents Expiring Soon!">
                          <AlertTriangle size={14} />
                        </div>
                      )}
                      
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-brand/10 border border-brand text-brand flex items-center justify-center font-bold text-sm">
                            {drv.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div>
                            <h3 className="font-sora font-bold text-sm text-slate-200">{drv.name}</h3>
                            <span className="text-[10px] text-slate-400">{drv.phone}</span>
                          </div>
                        </div>

                        <div className="border-t border-slate-700/60 pt-3 space-y-1.5 text-xs text-slate-300">
                          <div className="flex justify-between">
                            <span className="text-slate-400">Cab:</span>
                            <span className="font-semibold">{drv.vehicle_model}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Plate:</span>
                            <span className="font-semibold">{drv.vehicle_number}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Expiry License:</span>
                            <span className={`font-semibold ${isLicenseExpiring ? 'text-amber-500 font-bold' : ''}`}>{drv.license_expiry}</span>
                          </div>
                        </div>
                      </div>

                      <div className="border-t border-slate-700/60 pt-3 mt-4 flex items-center justify-between">
                        <span className="text-[10px] text-slate-400 font-bold uppercase">Completed: {drv.trips_completed}</span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => { setSelectedDriver(drv); setDriverModalMode('edit'); setShowDriverModal(true) }}
                            className="p-1.5 rounded bg-slate-900 border border-slate-700 text-slate-300 hover:bg-slate-700 transition-colors"
                          >
                            <Edit2 size={12} />
                          </button>
                          <button
                            onClick={() => handleDeleteDriver(drv.id)}
                            className="p-1.5 rounded bg-slate-900 border border-rose-500/30 text-rose-400 hover:bg-rose-950/40 transition-colors"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* TAB 5: AGENTS */}
          {activeTab === 'agents' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="font-sora text-2xl font-extrabold text-slate-100">Booking Agents</h1>
                  <p className="text-xs text-slate-400 mt-1">Manage ticket booking agents, zones, and commission rates</p>
                </div>
                <button
                  onClick={() => { setAgentModalMode('create'); setSelectedAgent(null); setShowAgentModal(true) }}
                  className="flex items-center gap-1.5 px-4 py-2 bg-brand hover:bg-brand-dark active:scale-95 text-slate-950 font-bold rounded-lg text-xs transition-all"
                >
                  <Plus size={14} />
                  <span>Add New Agent</span>
                </button>
              </div>

              {/* Agent Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {agents.map(agt => (
                  <div key={agt.id} className="bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-lg flex flex-col justify-between hover:-translate-y-0.5 hover:shadow-xl transition-all duration-150">
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-purple-500/10 border border-purple-500 text-purple-400 flex items-center justify-center font-bold text-sm">
                          {agt.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <h3 className="font-sora font-bold text-sm text-slate-200">{agt.name}</h3>
                          <span className="text-[10px] text-slate-400">{agt.area}</span>
                        </div>
                      </div>

                      <div className="border-t border-slate-700/60 pt-3 space-y-1.5 text-xs text-slate-300">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Phone:</span>
                          <span className="font-semibold">{agt.phone}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Commission Rate:</span>
                          <span className="font-semibold text-purple-400">{agt.commission_pct}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Total Bookings:</span>
                          <span className="font-semibold">{agt.bookings_linked}</span>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-slate-700/60 pt-3 mt-4 flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 font-bold uppercase">Payouts: ₹{agt.total_payout.toLocaleString('en-IN')}</span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => { setSelectedAgent(agt); setAgentModalMode('edit'); setShowAgentModal(true) }}
                          className="p-1.5 rounded bg-slate-900 border border-slate-700 text-slate-300 hover:bg-slate-700 transition-colors"
                        >
                          <Edit2 size={12} />
                        </button>
                        <button
                          onClick={() => handleDeleteAgent(agt.id)}
                          className="p-1.5 rounded bg-slate-900 border border-rose-500/30 text-rose-400 hover:bg-rose-950/40 transition-colors"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 6: VEHICLES */}
          {activeTab === 'vehicles' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="font-sora text-2xl font-extrabold text-slate-100">Vehicle Fleet</h1>
                  <p className="text-xs text-slate-400 mt-1">Manage active fleet models, capacity specifications, and registration status</p>
                </div>
                <button
                  onClick={() => { setVehicleModalMode('create'); setSelectedVehicle(null); setShowVehicleModal(true) }}
                  className="flex items-center gap-1.5 px-4 py-2 bg-brand hover:bg-brand-dark active:scale-95 text-slate-950 font-bold rounded-lg text-xs transition-all"
                >
                  <Plus size={14} />
                  <span>Register Vehicle</span>
                </button>
              </div>

              {/* Vehicle Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {vehicles.map(veh => (
                  <div key={veh.id} className="bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-lg flex flex-col justify-between hover:-translate-y-0.5 hover:shadow-xl transition-all duration-150">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          veh.type === 'sedan' ? 'bg-amber-500/10 text-brand' :
                          veh.type === 'suv' ? 'bg-sky-500/10 text-sky-400' : 'bg-purple-500/10 text-purple-400'
                        } uppercase`}>
                          {veh.type}
                        </span>
                        <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                          {veh.status}
                        </span>
                      </div>
                      
                      <div>
                        <h3 className="font-sora font-extrabold text-base text-slate-100 mt-2">{veh.make} {veh.model}</h3>
                        <span className="text-xs text-slate-400 font-mono mt-1 block">{veh.plate}</span>
                      </div>

                      <div className="border-t border-slate-700/60 pt-3 space-y-1 text-xs text-slate-300">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Capacity:</span>
                          <span className="font-semibold">{veh.capacity} Seater</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Assigned Driver:</span>
                          <span className="font-semibold">
                            {drivers.find(d => d.id === veh.driver_id)?.name || 'Unassigned'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-slate-700/60 pt-3 mt-4 flex justify-end gap-2">
                      <button
                        onClick={() => { setSelectedVehicle(veh); setVehicleModalMode('edit'); setShowVehicleModal(true) }}
                        className="p-1.5 rounded bg-slate-900 border border-slate-700 text-slate-300 hover:bg-slate-700 transition-colors"
                      >
                        <Edit2 size={12} />
                      </button>
                      <button
                        onClick={() => handleDeleteVehicle(veh.id)}
                        className="p-1.5 rounded bg-slate-900 border border-rose-500/30 text-rose-400 hover:bg-rose-950/40 transition-colors"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 7: AUTO MATCHING */}
          {activeTab === 'matching' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="font-sora text-2xl font-extrabold text-slate-100">Auto Matching Engine</h1>
                  <p className="text-xs text-slate-400 mt-1">Smart scheduling pairs opposite route bookings on identical travel dates</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 text-xs">
                    <span className="text-slate-400 font-semibold">Min Confidence:</span>
                    <input
                      type="range"
                      min="70"
                      max="100"
                      value={matchThreshold}
                      onChange={e => setMatchThreshold(parseInt(e.target.value))}
                      className="w-20 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-brand"
                    />
                    <span className="font-bold text-brand">{matchThreshold}%</span>
                  </div>
                  <button
                    onClick={handleBulkLink}
                    className="flex items-center gap-1.5 px-4 py-2 bg-brand hover:bg-brand-dark active:scale-95 text-slate-950 font-bold rounded-lg text-xs transition-all animate-pulse"
                  >
                    <Link2 size={14} />
                    <span>Auto-Match All</span>
                  </button>
                </div>
              </div>

              {/* Suggestions Queue */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Pending Unmatched Queue */}
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-lg space-y-4">
                  <h3 className="font-sora font-bold text-xs text-slate-200">Unmatched RAC Bookings</h3>
                  <div className="space-y-3">
                    {bookings.filter(b => b.status === 'waiting').length === 0 ? (
                      <div className="text-center text-slate-400 py-10 text-xs">No pending unmatched bookings.</div>
                    ) : (
                      bookings.filter(b => b.status === 'waiting').map(b => (
                        <div key={b.id} className="bg-slate-900 border border-slate-700 rounded-lg p-3 flex justify-between items-center text-xs">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-extrabold text-[10px] text-brand">{b.booking_ref}</span>
                              <span className="text-slate-400 font-medium">({b.passenger_name})</span>
                            </div>
                            <div className="text-[10px] mt-1 text-slate-300">
                              {b.direction === 'KI' ? 'Khargone → Indore' : 'Indore → Khargone'}
                            </div>
                            <div className="text-[9px] text-slate-400 mt-0.5">{b.travel_date} · {b.pickup_time}</div>
                          </div>
                          <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                            Waiting
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Suggestions List */}
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-lg space-y-4">
                  <h3 className="font-sora font-bold text-xs text-slate-200">Pair Suggestions & Linking</h3>
                  <div className="space-y-3">
                    {matchingSuggestions.length === 0 ? (
                      <div className="text-center text-slate-400 py-10 text-xs">All suggestions linked.</div>
                    ) : (
                      matchingSuggestions.map((item, idx) => (
                        <div key={idx} className="bg-slate-900 border border-slate-700 rounded-lg p-3 space-y-3 text-xs">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-emerald-400">Match score: {item.confidence}%</span>
                            <button
                              onClick={() => handleLinkBookings(item.b1.id, item.b2.id)}
                              className="px-3 py-1 bg-brand text-slate-950 font-bold rounded hover:bg-brand-dark active:scale-95 transition-all text-[10px]"
                            >
                              🔗 Establish Link
                            </button>
                          </div>
                          <div className="grid grid-cols-2 gap-4 border-t border-slate-750 pt-2 text-[10px]">
                            <div>
                              <div className="text-brand font-bold">{item.b1.booking_ref}</div>
                              <div>{item.b1.passenger_name}</div>
                              <div className="text-slate-400">{item.b1.direction === 'KI' ? 'Khargone → Indore' : 'Indore → Khargone'}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-brand font-bold">{item.b2.booking_ref}</div>
                              <div>{item.b2.passenger_name}</div>
                              <div className="text-slate-400">{item.b2.direction === 'KI' ? 'Khargone → Indore' : 'Indore → Khargone'}</div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB 8: PAYMENTS */}
          {activeTab === 'payments' && (
            <div className="space-y-6">
              <div>
                <h1 className="font-sora text-2xl font-extrabold text-slate-100">Financial Settlements</h1>
                <p className="text-xs text-slate-400 mt-1">Review advance collections, pending balances, and settle settlements</p>
              </div>

              {/* Payments Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                  { label: 'Total Revenue', val: '₹19,700', sub: 'Calculated fare total' },
                  { label: 'Advance Collected', val: '₹4,000', sub: 'UPI payments' },
                  { label: 'Balance Outstanding', val: '₹15,700', sub: 'Due in Cash/UPI' },
                  { label: 'Estimated Driver Settlements', val: '₹9,800', sub: 'Assigned trip settlements' }
                ].map((item, idx) => (
                  <div key={idx} className="bg-slate-800 border border-slate-700 rounded-xl p-4 shadow-lg flex flex-col gap-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{item.label}</span>
                    <span className="font-sora text-lg font-extrabold text-brand mt-1">{item.val}</span>
                    <span className="text-[9px] text-slate-400 mt-1">{item.sub}</span>
                  </div>
                ))}
              </div>

              {/* Transactions Ledger */}
              <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-lg p-5 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-sora font-bold text-xs text-slate-200">Payment Transactions</h3>
                  <button
                    onClick={() => triggerToast('📥 CSV file exported successfully!')}
                    className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors"
                  >
                    Export Ledger (CSV)
                  </button>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="bg-slate-900 text-slate-400 border-b border-slate-700 text-[10px] font-bold uppercase tracking-wider">
                        <th className="p-3">Transaction Date</th>
                        <th className="p-3">Booking Ref</th>
                        <th className="p-3">Passenger</th>
                        <th className="p-3">Settlement Type</th>
                        <th className="p-3">Method</th>
                        <th className="p-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/60">
                      {transactions.map(t => (
                        <tr key={t.id} className="hover:bg-slate-700/30">
                          <td className="p-3">{t.date}</td>
                          <td className="p-3 text-brand font-bold">{t.booking_ref}</td>
                          <td className="p-3">{t.passenger_name}</td>
                          <td className="p-3 capitalize">{t.type}</td>
                          <td className="p-3">{t.method}</td>
                          <td className="p-3 text-right font-bold text-emerald-400">₹{t.amount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 9: REPORTS */}
          {activeTab === 'reports' && (
            <div className="space-y-6">
              <div>
                <h1 className="font-sora text-2xl font-extrabold text-slate-100">Performance Reports</h1>
                <p className="text-xs text-slate-400 mt-1">Track conversions, routes metrics, and match rates</p>
              </div>

              {/* Reports 2x2 charts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* 1. Route Volume Heatmap */}
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-lg">
                  <h3 className="font-sora font-bold text-xs text-slate-200 mb-4">Route Booking Frequency</h3>
                  <div className="h-56 w-full">
                    {isMounted ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={[
                          { name: 'Khargone ➔ Airport', bookings: 12 },
                          { name: 'Khargone ➔ Rwy Stn', bookings: 18 },
                          { name: 'Khargone ➔ Vijay Nagar', bookings: 9 },
                          { name: 'Indore ➔ Khargone', bookings: 22 }
                        ]}>
                          <XAxis dataKey="name" stroke="#94A3B8" fontSize={9} />
                          <YAxis stroke="#94A3B8" fontSize={9} />
                          <Tooltip contentStyle={{ backgroundColor: '#1E293B', borderColor: '#334155', color: '#F8FAFC' }} />
                          <Bar dataKey="bookings" name="Bookings" fill="#F5A623" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs">Loading Charts...</div>
                    )}
                  </div>
                </div>

                {/* 2. Match Rate Efficiency Trend */}
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-lg">
                  <h3 className="font-sora font-bold text-xs text-slate-200 mb-4">Match Efficiency Trend (%)</h3>
                  <div className="h-56 w-full">
                    {isMounted ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={[
                          { date: 'May 24', rate: 75 },
                          { date: 'May 25', rate: 80 },
                          { date: 'May 26', rate: 82 },
                          { date: 'May 27', rate: 80 },
                          { date: 'May 28', rate: 88 },
                          { date: 'May 29', rate: 90 },
                          { date: 'May 30', rate: 92 }
                        ]}>
                          <XAxis dataKey="date" stroke="#94A3B8" fontSize={9} />
                          <YAxis stroke="#94A3B8" fontSize={9} />
                          <Tooltip contentStyle={{ backgroundColor: '#1E293B', borderColor: '#334155', color: '#F8FAFC' }} />
                          <Line type="monotone" dataKey="rate" name="Match Rate %" stroke="#22C55E" strokeWidth={2.5} />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs">Loading Charts...</div>
                    )}
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB 10: SETTINGS */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              <div>
                <h1 className="font-sora text-2xl font-extrabold text-slate-100">Business Control Settings</h1>
                <p className="text-xs text-slate-400 mt-1">Configure pricing models, emergency policies, and notification rules</p>
              </div>

              {/* Settings forms */}
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-lg space-y-6 max-w-3xl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5 text-xs">
                    <label className="font-bold text-slate-300">Business Name</label>
                    <input
                      type="text"
                      value={settings.business_name}
                      onChange={e => setSettings({ ...settings, business_name: e.target.value })}
                      className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-brand"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5 text-xs">
                    <label className="font-bold text-slate-300">Contact Number</label>
                    <input
                      type="text"
                      value={settings.phone}
                      onChange={e => setSettings({ ...settings, phone: e.target.value })}
                      className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-brand"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5 text-xs">
                    <label className="font-bold text-slate-300">Sedan Base Fare (₹)</label>
                    <input
                      type="number"
                      value={settings.base_sedan}
                      onChange={e => setSettings({ ...settings, base_sedan: parseInt(e.target.value) })}
                      className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-brand"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5 text-xs">
                    <label className="font-bold text-slate-300">SUV Base Fare (₹)</label>
                    <input
                      type="number"
                      value={settings.base_suv}
                      onChange={e => setSettings({ ...settings, base_suv: parseInt(e.target.value) })}
                      className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-brand"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 text-xs">
                  <label className="font-bold text-slate-300">RAC Confirmed Template</label>
                  <textarea
                    rows={3}
                    value={settings.template_confirmed}
                    onChange={e => setSettings({ ...settings, template_confirmed: e.target.value })}
                    className="bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-200 focus:outline-none focus:border-brand font-mono text-[10px] leading-relaxed"
                  />
                </div>

                <button
                  onClick={() => triggerToast('💾 Settings Saved successfully!')}
                  className="px-4 py-2 bg-brand text-slate-950 font-bold rounded-lg text-xs hover:bg-brand-dark active:scale-95 transition-all"
                >
                  Save Settings
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ─── MODALS & DRAWERS ─────────────────────────────────────────────────── */}
      
      {/* 1. New Booking Slide-In Drawer */}
      {showNewBooking && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex justify-end">
          <div className="w-full max-w-md bg-slate-800 border-l border-slate-700 p-6 flex flex-col h-full overflow-y-auto text-xs space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-700 pb-3">
              <h2 className="font-sora text-sm font-bold text-slate-200">Create Reservation</h2>
              <button onClick={() => setShowNewBooking(false)} className="text-slate-400 hover:text-slate-200">
                <X size={18} />
              </button>
            </div>
            
            {/* Slide-in form fields */}
            <form
              onSubmit={e => {
                e.preventDefault()
                const form = e.currentTarget
                const fd = new FormData(form)
                handleCreateBooking({
                  passenger_name: fd.get('name') as string,
                  phone: fd.get('phone') as string,
                  direction: fd.get('direction') as 'KI' | 'IK',
                  travel_date: fd.get('date') as string,
                  pickup_time: fd.get('time') as string,
                  drop_name: fd.get('drop_point') === 'ind-apt' ? 'Indore Airport' : 'Indore Railway Station',
                  vehicle_type: fd.get('vehicle_type') as 'sedan' | 'suv' | 'innova',
                  base_fare: parseInt(fd.get('base_fare') as string) || 2200,
                  advance_paid: parseInt(fd.get('advance') as string) || 0,
                  driver_id: fd.get('driver') as string || undefined,
                  agent_id: fd.get('agent') as string || undefined
                })
              }}
              className="space-y-4 flex-1 flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-slate-300">Passenger Name</label>
                  <input type="text" name="name" required className="bg-slate-900 border border-slate-700 rounded p-2 text-slate-200 focus:outline-none" />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-slate-300">Phone</label>
                  <input type="tel" name="phone" required className="bg-slate-900 border border-slate-700 rounded p-2 text-slate-200 focus:outline-none" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="font-semibold text-slate-300">Route Direction</label>
                    <select name="direction" className="bg-slate-900 border border-slate-700 rounded p-2 text-slate-200 focus:outline-none">
                      <option value="KI">Khargone → Indore</option>
                      <option value="IK">Indore → Khargone</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="font-semibold text-slate-300">Vehicle Type</label>
                    <select name="vehicle_type" className="bg-slate-900 border border-slate-700 rounded p-2 text-slate-200 focus:outline-none">
                      <option value="sedan">Economy Sedan</option>
                      <option value="suv">Premium SUV</option>
                      <option value="innova">Innova</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="font-semibold text-slate-300">Travel Date</label>
                    <input type="date" name="date" required defaultValue={TODAY_DATE} className="bg-slate-900 border border-slate-700 rounded p-2 text-slate-200 focus:outline-none" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="font-semibold text-slate-300">Pickup Time</label>
                    <input type="time" name="time" required defaultValue="08:00" className="bg-slate-900 border border-slate-700 rounded p-2 text-slate-200 focus:outline-none" />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-slate-300">Pickup/Drop Spot</label>
                  <select name="drop_point" className="bg-slate-900 border border-slate-700 rounded p-2 text-slate-200 focus:outline-none">
                    <option value="ind-apt">Indore Airport</option>
                    <option value="ind-rwy">Indore Railway Station</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="font-semibold text-slate-300">Base Fare (₹)</label>
                    <input type="number" name="base_fare" defaultValue="2200" className="bg-slate-900 border border-slate-700 rounded p-2 text-slate-200 focus:outline-none" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="font-semibold text-slate-300">Advance Paid (₹)</label>
                    <input type="number" name="advance" defaultValue="500" className="bg-slate-900 border border-slate-700 rounded p-2 text-slate-200 focus:outline-none" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="font-semibold text-slate-300">Assign Driver</label>
                    <select name="driver" className="bg-slate-900 border border-slate-700 rounded p-2 text-slate-200 focus:outline-none">
                      <option value="">None</option>
                      {drivers.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="font-semibold text-slate-300">Assign Agent</label>
                    <select name="agent" className="bg-slate-900 border border-slate-700 rounded p-2 text-slate-200 focus:outline-none">
                      <option value="">None</option>
                      {agents.map(a => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-brand text-slate-950 font-bold rounded-lg hover:bg-brand-dark active:scale-95 transition-all mt-6 text-xs"
              >
                Create Reservation
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 2. Link Booking Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 w-full max-w-sm space-y-4 text-xs">
            <div className="flex justify-between items-center border-b border-slate-700 pb-2">
              <h3 className="font-sora font-bold text-slate-200">🔗 Link Reservation {showLinkModal.booking_ref}</h3>
              <button onClick={() => setShowLinkModal(null)}>
                <X size={16} />
              </button>
            </div>
            
            <div className="space-y-3">
              <label className="font-semibold text-slate-300 block">Select matching opposite ride</label>
              <select
                id="link-select-partner"
                className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-slate-200 focus:outline-none"
              >
                {bookings
                  .filter(b => b.status === 'waiting' && b.id !== showLinkModal.id && b.direction !== showLinkModal.direction && b.travel_date === showLinkModal.travel_date)
                  .map(b => (
                    <option key={b.id} value={b.id}>
                      {b.booking_ref} - {b.passenger_name} ({b.travel_date} · {b.pickup_time})
                    </option>
                  ))}
              </select>
            </div>

            <button
              onClick={() => {
                const el = document.getElementById('link-select-partner') as HTMLSelectElement
                if (el?.value) {
                  handleLinkBookings(showLinkModal.id, el.value)
                } else {
                  triggerToast('No valid match selected!', 'error')
                }
              }}
              className="w-full py-2 bg-brand text-slate-950 font-bold rounded-lg hover:bg-brand-dark transition-colors"
            >
              Connect Rides
            </button>
          </div>
        </div>
      )}

      {/* 3. Booking Details Drawer (Slide-In) */}
      {selectedBooking && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex justify-end">
          <div className="w-full max-w-md bg-slate-800 border-l border-slate-700 p-6 flex flex-col h-full overflow-y-auto text-xs space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-700 pb-3">
              <h2 className="font-sora text-sm font-bold text-slate-200">Reservation Details</h2>
              <button onClick={() => setSelectedBooking(null)} className="text-slate-400 hover:text-slate-200">
                <X size={18} />
              </button>
            </div>

            {/* 4-column detail panel specs */}
            <div className="space-y-4 flex-1">
              
              {/* Column 1: Route details */}
              <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-750">
                <span className="font-bold text-[10px] text-slate-400 uppercase tracking-wider block mb-2">1. Route & Schedule</span>
                <div className="flex justify-between text-slate-200">
                  <span>Direction:</span>
                  <span className="font-semibold">{selectedBooking.direction === 'KI' ? 'Khargone ➔ Indore' : 'Indore ➔ Khargone'}</span>
                </div>
                <div className="flex justify-between text-slate-200 mt-1">
                  <span>Travel Date:</span>
                  <span className="font-semibold">{selectedBooking.travel_date}</span>
                </div>
                <div className="flex justify-between text-slate-200 mt-1">
                  <span>Pickup Time:</span>
                  <span className="font-semibold">{selectedBooking.pickup_time}</span>
                </div>
                <div className="flex justify-between text-slate-200 mt-1">
                  <span>Pickup Point:</span>
                  <span className="font-semibold">{selectedBooking.drop_name}</span>
                </div>
              </div>

              {/* Column 2: Passenger details */}
              <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-750">
                <span className="font-bold text-[10px] text-slate-400 uppercase tracking-wider block mb-2">2. Passenger Information</span>
                <div className="flex justify-between text-slate-200">
                  <span>Name:</span>
                  <span className="font-semibold">{selectedBooking.passenger_name}</span>
                </div>
                <div className="flex justify-between text-slate-200 mt-1">
                  <span>Contact Phone:</span>
                  <span className="font-semibold">{selectedBooking.phone}</span>
                </div>
                {selectedBooking.email && (
                  <div className="flex justify-between text-slate-200 mt-1">
                    <span>Email:</span>
                    <span className="font-semibold">{selectedBooking.email}</span>
                  </div>
                )}
              </div>

              {/* Column 3: Fare Breakdown */}
              <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-750">
                <span className="font-bold text-[10px] text-slate-400 uppercase tracking-wider block mb-2">3. Financial Ledger</span>
                <div className="flex justify-between text-slate-200">
                  <span>Base Fare:</span>
                  <span>₹{selectedBooking.base_fare}</span>
                </div>
                <div className="flex justify-between text-slate-200 mt-1">
                  <span>Night surcharge:</span>
                  <span>₹{selectedBooking.night_extra}</span>
                </div>
                <div className="flex justify-between text-slate-200 mt-1">
                  <span>Discount:</span>
                  <span className="text-rose-400">-₹{selectedBooking.discount}</span>
                </div>
                <div className="flex justify-between text-slate-200 font-bold border-t border-slate-700 pt-1.5 mt-1.5">
                  <span>Total Fare:</span>
                  <span className="text-brand">₹{selectedBooking.total_fare}</span>
                </div>
                <div className="flex justify-between text-slate-200 font-bold mt-1">
                  <span>Advance Paid:</span>
                  <span>₹{selectedBooking.advance_paid}</span>
                </div>
                <div className="flex justify-between text-emerald-400 font-bold mt-1">
                  <span>Outstanding Balance:</span>
                  <span>₹{selectedBooking.total_fare - selectedBooking.advance_paid}</span>
                </div>
              </div>

              {/* Column 4: Driver / Agent Assignment details */}
              <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-750">
                <span className="font-bold text-[10px] text-slate-400 uppercase tracking-wider block mb-2">4. Resource Assignment</span>
                <div className="flex justify-between text-slate-200">
                  <span>Assigned Driver:</span>
                  <span className="font-semibold">
                    {drivers.find(d => d.id === selectedBooking.driver_id)?.name || 'Unassigned'}
                  </span>
                </div>
                <div className="flex justify-between text-slate-200 mt-1">
                  <span>Booking Agent:</span>
                  <span className="font-semibold">
                    {agents.find(a => a.id === selectedBooking.agent_id)?.name || 'Direct Online'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-4 border-t border-slate-700">
              <a
                href={`https://wa.me/91${selectedBooking.phone}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-center rounded-lg transition-colors flex items-center justify-center gap-1.5"
              >
                <Send size={12} />
                <span>Text Customer (WhatsApp)</span>
              </a>
              {selectedBooking.status !== 'cancelled' && (
                <button
                  onClick={() => {
                    handleCancelBooking(selectedBooking.id)
                    setSelectedBooking(null)
                  }}
                  className="w-full py-2 bg-rose-600 hover:bg-rose-500 text-slate-950 font-bold rounded-lg transition-colors"
                >
                  Cancel Booking Request
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. Driver Modal (Create / Edit) */}
      {showDriverModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 w-full max-w-sm space-y-4 text-xs">
            <div className="flex justify-between items-center border-b border-slate-700 pb-2">
              <h3 className="font-sora font-bold text-slate-200">
                {driverModalMode === 'create' ? 'Register Driver' : 'Edit Driver Profile'}
              </h3>
              <button onClick={() => setShowDriverModal(false)}>
                <X size={16} />
              </button>
            </div>

            <form
              onSubmit={e => {
                e.preventDefault()
                const fd = new FormData(e.currentTarget)
                handleSaveDriver({
                  id: selectedDriver?.id,
                  name: fd.get('name') as string,
                  phone: fd.get('phone') as string,
                  vehicle_model: fd.get('vehicle_model') as string,
                  vehicle_number: fd.get('vehicle_number') as string,
                  license_expiry: fd.get('license_expiry') as string,
                  permit_expiry: fd.get('permit_expiry') as string
                })
              }}
              className="space-y-4"
            >
              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-300">Name</label>
                <input type="text" name="name" required defaultValue={selectedDriver?.name} className="bg-slate-900 border border-slate-700 rounded p-2 text-slate-200 focus:outline-none" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-300">Phone</label>
                <input type="text" name="phone" required defaultValue={selectedDriver?.phone} className="bg-slate-900 border border-slate-700 rounded p-2 text-slate-200 focus:outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-slate-300">Vehicle Model</label>
                  <input type="text" name="vehicle_model" required defaultValue={selectedDriver?.vehicle_model} className="bg-slate-900 border border-slate-700 rounded p-2 text-slate-200 focus:outline-none" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-slate-300">Plate Number</label>
                  <input type="text" name="vehicle_number" required defaultValue={selectedDriver?.vehicle_number} className="bg-slate-900 border border-slate-700 rounded p-2 text-slate-200 focus:outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-slate-300">License Expiry</label>
                  <input type="date" name="license_expiry" required defaultValue={selectedDriver?.license_expiry || TODAY_DATE} className="bg-slate-900 border border-slate-700 rounded p-2 text-slate-200 focus:outline-none" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-slate-300">Permit Expiry</label>
                  <input type="date" name="permit_expiry" required defaultValue={selectedDriver?.permit_expiry || TODAY_DATE} className="bg-slate-900 border border-slate-700 rounded p-2 text-slate-200 focus:outline-none" />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-brand text-slate-950 font-bold rounded-lg hover:bg-brand-dark transition-colors"
              >
                Save Profile
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 5. Agent Modal (Create / Edit) */}
      {showAgentModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 w-full max-w-sm space-y-4 text-xs">
            <div className="flex justify-between items-center border-b border-slate-700 pb-2">
              <h3 className="font-sora font-bold text-slate-200">
                {agentModalMode === 'create' ? 'Add New Agent' : 'Edit Agent Information'}
              </h3>
              <button onClick={() => setShowAgentModal(false)}>
                <X size={16} />
              </button>
            </div>

            <form
              onSubmit={e => {
                e.preventDefault()
                const fd = new FormData(e.currentTarget)
                handleSaveAgent({
                  id: selectedAgent?.id,
                  name: fd.get('name') as string,
                  phone: fd.get('phone') as string,
                  email: fd.get('email') as string,
                  area: fd.get('area') as string,
                  commission_pct: parseInt(fd.get('commission') as string) || 10
                })
              }}
              className="space-y-4"
            >
              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-300">Name</label>
                <input type="text" name="name" required defaultValue={selectedAgent?.name} className="bg-slate-900 border border-slate-700 rounded p-2 text-slate-200 focus:outline-none" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-300">Phone</label>
                <input type="text" name="phone" required defaultValue={selectedAgent?.phone} className="bg-slate-900 border border-slate-700 rounded p-2 text-slate-200 focus:outline-none" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-300">Email</label>
                <input type="email" name="email" required defaultValue={selectedAgent?.email} className="bg-slate-900 border border-slate-700 rounded p-2 text-slate-200 focus:outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-slate-300">Assigned Area</label>
                  <input type="text" name="area" required defaultValue={selectedAgent?.area} className="bg-slate-900 border border-slate-700 rounded p-2 text-slate-200 focus:outline-none" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-slate-300">Commission %</label>
                  <input type="number" name="commission" required defaultValue={selectedAgent?.commission_pct} className="bg-slate-900 border border-slate-700 rounded p-2 text-slate-200 focus:outline-none" />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-brand text-slate-950 font-bold rounded-lg hover:bg-brand-dark transition-colors"
              >
                Save Agent Profile
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 6. Vehicle Modal (Create / Edit) */}
      {showVehicleModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 w-full max-w-sm space-y-4 text-xs">
            <div className="flex justify-between items-center border-b border-slate-700 pb-2">
              <h3 className="font-sora font-bold text-slate-200">
                {vehicleModalMode === 'create' ? 'Register Vehicle' : 'Modify Fleet Details'}
              </h3>
              <button onClick={() => setShowVehicleModal(false)}>
                <X size={16} />
              </button>
            </div>

            <form
              onSubmit={e => {
                e.preventDefault()
                const fd = new FormData(e.currentTarget)
                handleSaveVehicle({
                  id: selectedVehicle?.id,
                  make: fd.get('make') as string,
                  model: fd.get('model') as string,
                  plate: fd.get('plate') as string,
                  type: fd.get('type') as 'sedan' | 'suv' | 'innova',
                  driver_id: fd.get('driver') as string || undefined
                })
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-slate-300">Make</label>
                  <input type="text" name="make" required defaultValue={selectedVehicle?.make} className="bg-slate-900 border border-slate-700 rounded p-2 text-slate-200 focus:outline-none" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-slate-300">Model</label>
                  <input type="text" name="model" required defaultValue={selectedVehicle?.model} className="bg-slate-900 border border-slate-700 rounded p-2 text-slate-200 focus:outline-none" />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-300">License Plate</label>
                <input type="text" name="plate" required defaultValue={selectedVehicle?.plate} className="bg-slate-900 border border-slate-700 rounded p-2 text-slate-200 focus:outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-slate-300">Body Type</label>
                  <select name="type" defaultValue={selectedVehicle?.type} className="bg-slate-900 border border-slate-700 rounded p-2 text-slate-200 focus:outline-none">
                    <option value="sedan">Sedan</option>
                    <option value="suv">SUV</option>
                    <option value="innova">Innova</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-slate-300">Assign Driver</label>
                  <select name="driver" defaultValue={selectedVehicle?.driver_id} className="bg-slate-900 border border-slate-700 rounded p-2 text-slate-200 focus:outline-none">
                    <option value="">None</option>
                    {drivers.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-brand text-slate-950 font-bold rounded-lg hover:bg-brand-dark transition-colors"
              >
                Save Vehicle Info
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ─── TOAST NOTIFICATION ────────────────────────────────────────────────── */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-800 border border-slate-700 px-4 py-3 rounded-lg shadow-2xl flex items-center gap-3 text-xs animate-bounce">
          {toastType === 'success' ? (
            <CheckCircle size={16} className="text-emerald-500" />
          ) : (
            <XCircle size={16} className="text-rose-500" />
          )}
          <span className="font-semibold text-slate-200">{toastMessage}</span>
        </div>
      )}

    </div>
  )
}
