// src/app/api/whatsapp/route.ts
import { NextRequest } from 'next/server'
import { GET as handleGET, POST as handlePOST } from './webhook/route'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  return handleGET(request)
}

export async function POST(request: NextRequest) {
  return handlePOST(request)
}

