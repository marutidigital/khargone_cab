import { NextRequest, NextResponse } from 'next/server'

function isAdminHost(host: string) {
  const hostname = host.split(':')[0].toLowerCase()
  const configured = process.env.ADMIN_DOMAIN?.toLowerCase()
  return hostname === 'admin.localhost' || (!!configured && hostname === configured)
}

function unauthorized() {
  return new NextResponse('Admin sign-in required', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Khargone Cabs Admin"' },
  })
}

export function proxy(req: NextRequest) {
  const adminHost = isAdminHost(req.headers.get('host') ?? '')
  const adminPath = req.nextUrl.pathname === '/admin' ||
    req.nextUrl.pathname.startsWith('/api/admin/') ||
    req.nextUrl.pathname === '/api/drivers' ||
    req.nextUrl.pathname === '/api/agents'

  if (!adminHost && !adminPath) return NextResponse.next()

  const password = process.env.ADMIN_PASSWORD
  if (password) {
    const authorization = req.headers.get('authorization')
    if (!authorization?.startsWith('Basic ')) return unauthorized()

    try {
      const [username, suppliedPassword] = atob(authorization.slice(6)).split(':')
      if (username !== (process.env.ADMIN_USERNAME ?? 'admin') || suppliedPassword !== password) {
        return unauthorized()
      }
    } catch {
      return unauthorized()
    }
  } else if (process.env.NODE_ENV === 'production') {
    return new NextResponse('ADMIN_PASSWORD must be configured', { status: 503 })
  }

  if (adminHost && req.nextUrl.pathname === '/') {
    const url = req.nextUrl.clone()
    url.pathname = '/admin'
    return NextResponse.rewrite(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/', '/admin', '/api/admin/:path*', '/api/drivers', '/api/agents'],
}
