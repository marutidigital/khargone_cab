import { NextRequest, NextResponse } from 'next/server'
import { assignDriverAndVehicleToMatch } from '@/lib/driver-dispatch-lifecycle'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)
    if (!body?.match_id) {
      return NextResponse.json({ error: 'Match ID is required.' }, { status: 400 })
    }
    if (!body?.driver_name || !body?.driver_phone) {
      return NextResponse.json({ error: 'Driver name and phone are required.' }, { status: 400 })
    }
    if (!body?.vehicle_model || !body?.vehicle_number) {
      return NextResponse.json({ error: 'Vehicle model and registration number are required.' }, { status: 400 })
    }

    const result = await assignDriverAndVehicleToMatch({
      matchId: body.match_id,
      driverName: body.driver_name,
      driverPhone: body.driver_phone,
      vehicleModel: body.vehicle_model,
      vehicleNumber: body.vehicle_number,
      driverId: body.driver_id,
      vehicleId: body.vehicle_id,
    })

    return NextResponse.json({
      success: true,
      driver: result.driver,
      vehicle: result.vehicle,
      message: 'Driver and car assigned successfully! Interactive duty templates dispatched to Driver on WhatsApp.',
    })
  } catch (err: any) {
    console.error('Assign driver error:', err)
    return NextResponse.json({ error: err.message || 'Failed to assign driver and car.' }, { status: 500 })
  }
}
