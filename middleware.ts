import { NextResponse, type NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_ACCESS_SECRET!)
const EMPLOYEE_JWT_SECRET = new TextEncoder().encode(process.env.JWT_EMPLOYEE_ACCESS_SECRET!)

const ROLE_HOME_PATHS: Record<string, string> = {
  SUPERADMIN: '/admin/dashboard',
  ADMIN:      '/admin/dashboard',
  MARKETING:  '/admin/cms',
  FINANCE:    '/admin/finance',
  OPERATIONS: '/admin/inventory',
  OFFERS:     '/admin/offers',
}

const ROLE_ALLOWED_PREFIXES: Record<string, string[]> = {
  SUPERADMIN: ['/admin'],
  ADMIN: [
    '/admin/dashboard', '/admin/cms', '/admin/finance', '/admin/inventory',
    '/admin/offers', '/admin/employees', '/admin/analytics', '/admin/customers',
    '/admin/orders', '/admin/reviews', '/admin/plugins', '/admin/audit',
    '/admin/settings',
  ],
  MARKETING: [
    '/admin/dashboard', '/admin/cms', '/admin/analytics',
    '/admin/reviews', '/admin/offers/coupons', '/admin/offers/promotions',
  ],
  FINANCE: [
    '/admin/dashboard', '/admin/finance', '/admin/orders',
    '/admin/customers', '/admin/analytics',
  ],
  OPERATIONS: [
    '/admin/dashboard', '/admin/inventory', '/admin/orders',
    '/admin/customers', '/admin/analytics',
  ],
  OFFERS: [
    '/admin/dashboard', '/admin/offers', '/admin/analytics',
  ],
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // ── Employee portal protection ─────────────────────────────
  if (pathname.startsWith('/admin') && pathname !== '/admin/login' && pathname !== '/admin/access-denied') {
    const token = req.cookies.get('employee_access_token')?.value
    if (!token) return NextResponse.redirect(new URL('/admin/login', req.url))

    try {
      const { payload } = await jwtVerify(token, EMPLOYEE_JWT_SECRET)
      const role = payload.role as string
      const allowedPrefixes = ROLE_ALLOWED_PREFIXES[role] ?? []
      const isAllowed = allowedPrefixes.some(prefix => pathname.startsWith(prefix))

      if (!isAllowed) {
        const accessDeniedUrl = new URL('/admin/access-denied', req.url)
        accessDeniedUrl.searchParams.set('from', pathname)
        accessDeniedUrl.searchParams.set('role', role)
        return NextResponse.redirect(accessDeniedUrl)
      }

      // Attach role to request headers for downstream use
      const response = NextResponse.next()
      response.headers.set('x-employee-role', role)
      response.headers.set('x-employee-id', payload.employeeId as string)
      return response
    } catch {
      // Token expired or invalid — redirect to login
      const response = NextResponse.redirect(new URL('/admin/login', req.url))
      response.cookies.delete('employee_access_token')
      response.cookies.delete('employee_refresh_token')
      return response
    }
  }

  // ── Customer protected routes ─────────────────────────────
  const customerProtectedPaths = ['/account', '/checkout']
  const isCustomerProtected = customerProtectedPaths.some(p => pathname.startsWith(p))

  if (isCustomerProtected) {
    const token = req.cookies.get('access_token')?.value
    const refreshToken = req.cookies.get('refresh_token')?.value

    if (!token && !refreshToken) {
      const loginUrl = new URL('/login', req.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }

    if (token) {
      try {
        await jwtVerify(token, JWT_SECRET)
        return NextResponse.next()
      } catch {
        // Access token expired — allow through if refresh token exists
        // The API route's requireCustomerAuth will handle the refresh
        if (refreshToken) {
          return NextResponse.next()
        }
        const loginUrl = new URL('/login', req.url)
        loginUrl.searchParams.set('redirect', pathname)
        const response = NextResponse.redirect(loginUrl)
        response.cookies.delete('access_token')
        return response
      }
    }

    // No access token but refresh token exists — allow through
    if (refreshToken) {
      return NextResponse.next()
    }

    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/account/:path*',
    '/checkout/:path*',
  ]
}
