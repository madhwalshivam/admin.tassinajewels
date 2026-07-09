import { NextRequest, NextResponse } from 'next/server'

export function middleware(req: NextRequest) {
  const auth = req.cookies.get('admin_auth')?.value
  const isProtected = req.nextUrl.pathname.startsWith('/dashboard') ||
    req.nextUrl.pathname.startsWith('/products') ||
    req.nextUrl.pathname.startsWith('/inquiries') ||
    req.nextUrl.pathname.startsWith('/categories')

  if (isProtected && auth !== 'true') {
    return NextResponse.redirect(new URL('/', req.url))
  }
  return NextResponse.next()
}

export const config = { matcher: ['/dashboard/:path*', '/products/:path*', '/inquiries/:path*', '/categories/:path*'] }
