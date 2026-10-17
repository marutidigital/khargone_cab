import { NextRequest, NextResponse } from 'next/server'

function isAdminHost(host: string) {
  const hostname = host.split(':')[0].toLowerCase()
  const configured = process.env.ADMIN_DOMAIN?.toLowerCase()
  return hostname === 'admin.localhost' || (!!configured && hostname === configured)
}

export function proxy(req: NextRequest) {
  const adminHost = isAdminHost(req.headers.get('host') ?? '')

  if (adminHost && req.nextUrl.pathname === '/') {
    const url = req.nextUrl.clone()
    url.pathname = '/admin'
    return NextResponse.rewrite(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/', '/admin', '/api/admin/:path*'],
}
