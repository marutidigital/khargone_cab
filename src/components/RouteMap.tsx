'use client'
// src/components/RouteMap.tsx
import { useEffect, useRef, useState } from 'react'
import { PRICING_CONFIG, MAP_COORDINATES } from '@/config/pricing'

interface Props {
  selectedPointId: string
  onSelectPoint: (pointId: string) => void
  direction: 'K2I' | 'I2K'
}

export function RouteMap({ selectedPointId, onSelectPoint, direction }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const routeLineRef = useRef<any>(null)
  const [mapLoaded, setMapLoaded] = useState(false)

  // 1. Dynamically inject Leaflet JS & CSS
  useEffect(() => {
    if (typeof window === 'undefined') return

    // Load CSS
    const cssId = 'leaflet-css'
    if (!document.getElementById(cssId)) {
      const link = document.createElement('link')
      link.id = cssId
      link.rel = 'stylesheet'
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      document.head.appendChild(link)
    }

    // Load JS
    if ((window as any).L) {
      setMapLoaded(true)
      return
    }

    const scriptId = 'leaflet-js'
    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script')
      script.id = scriptId
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
      script.async = true
      script.onload = () => {
        setMapLoaded(true)
      }
      document.body.appendChild(script)
    } else {
      const checkInterval = setInterval(() => {
        if ((window as any).L) {
          clearInterval(checkInterval)
          setMapLoaded(true)
        }
      }, 100)
      return () => clearInterval(checkInterval)
    }
  }, [])

  // 2. Initialize and Update Map
  useEffect(() => {
    if (!mapLoaded || !containerRef.current) return
    const L = (window as any).L
    if (!L) return

    // If map not initialized yet
    if (!mapInstanceRef.current) {
      const map = L.map(containerRef.current, {
        zoomControl: false,
        attributionControl: false,
        scrollWheelZoom: false,
      })

      L.control.zoom({ position: 'topright' }).addTo(map)

      // OpenStreetMap tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
      }).addTo(map)

      mapInstanceRef.current = map
    }

    const map = mapInstanceRef.current

    // Clear previous markers and route line
    markersRef.current.forEach((m) => m.remove())
    markersRef.current = []
    if (routeLineRef.current) {
      routeLineRef.current.remove()
      routeLineRef.current = null
    }

    const khargoneCoords = PRICING_CONFIG.khargoneCoords

    // Khargone Marker Icon
    const khargoneIcon = L.divIcon({
      className: 'custom-map-marker',
      html: `
        <div style="display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-100%);">
          <div style="background:#16A34A;color:white;font-weight:800;font-size:11px;padding:2px 8px;border-radius:12px;box-shadow:0 2px 6px rgba(0,0,0,0.2);white-space:nowrap;margin-bottom:3px;border:1.5px solid white;">
            Bus Stand Khargone
          </div>
          <div style="width:16px;height:16px;border-radius:50%;background:#16A34A;border:3px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3);"></div>
        </div>
      `,
      iconSize: [0, 0],
    })

    const khargoneMarker = L.marker(khargoneCoords, { icon: khargoneIcon }).addTo(map)
    markersRef.current.push(khargoneMarker)

    // Add markers for all 5 Indore points
    let activePointCoords: [number, number] = PRICING_CONFIG.points[0].coords

    PRICING_CONFIG.points.forEach((pt) => {
      const isSelected = pt.id === selectedPointId
      if (isSelected) activePointCoords = pt.coords

      const markerHtml = `
        <div style="display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-100%);cursor:pointer;">
          <div style="background:${isSelected ? '#FBBF24' : '#FFFFFF'};color:${isSelected ? '#18181B' : '#4B5563'};font-weight:700;font-size:10px;padding:2px 7px;border-radius:10px;box-shadow:0 2px 6px rgba(0,0,0,0.18);white-space:nowrap;margin-bottom:3px;border:1.5px solid ${isSelected ? '#D97706' : '#D1D5DB'};">
            ${pt.name} ${pt.extra > 0 ? `(+₹${pt.extra})` : ''}
          </div>
          <div style="width:${isSelected ? '18px' : '12px'};height:${isSelected ? '18px' : '12px'};border-radius:50%;background:${isSelected ? '#EF4444' : '#6B7280'};border:2.5px solid white;box-shadow:0 2px 5px rgba(0,0,0,0.3);transition:all 0.2s;"></div>
        </div>
      `

      const ptIcon = L.divIcon({
        className: 'custom-indore-marker',
        html: markerHtml,
        iconSize: [0, 0],
      })

      const marker = L.marker(pt.coords, { icon: ptIcon }).addTo(map)
      marker.on('click', () => {
        onSelectPoint(pt.id)
      })
      markersRef.current.push(marker)
    })

    // Draw route line between Khargone and active Indore point
    const routeCoords = [khargoneCoords, activePointCoords]
    routeLineRef.current = L.polyline(routeCoords, {
      color: '#F59E0B',
      weight: 4,
      dashArray: '8, 8',
      opacity: 0.85,
    }).addTo(map)

    // Fit bounds
    const bounds = L.latLngBounds(routeCoords)
    map.fitBounds(bounds, {
      padding: [45, 45],
      maxZoom: 11,
      animate: true,
    })
  }, [mapLoaded, selectedPointId, onSelectPoint, direction])

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-[#E5E7EB] shadow-sm bg-slate-100">
      <div
        ref={containerRef}
        className="w-full h-[260px] lg:h-[340px]"
        aria-label="Route map showing Khargone to Indore route"
      />

      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-50/80 text-xs text-slate-500 font-medium">
          Loading interactive route map...
        </div>
      )}

      {/* Floating map route indicator */}
      <div className="absolute bottom-3 left-3 z-[400] bg-white/95 backdrop-blur-sm border border-slate-200/90 rounded-xl px-3 py-1.5 shadow-md flex items-center gap-2 text-xs font-semibold text-slate-800">
        <span className="w-2.5 h-2.5 rounded-full bg-[#16A34A]" />
        <span>Khargone</span>
        <span className="text-slate-400">➔</span>
        <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444]" />
        <span>Indore Selected Point</span>
      </div>
    </div>
  )
}
