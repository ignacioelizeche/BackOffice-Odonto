import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Rutas públicas que no requieren autenticación
  const publicRoutes = ['/auth/login']

  // Verificar si la ruta actual es pública
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))

  // Si es una ruta pública, permitir el acceso
  if (isPublicRoute) {
    return NextResponse.next()
  }

  // Para las demás rutas, verificar si hay token
  const token = request.cookies.get('authToken')?.value

  // Si no hay token y la ruta no es pública, redirigir a login
  if (!token) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    // Proteger todas las rutas excepto:
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png|.*\\.jpg|.*\\.jpeg|.*\\.gif|.*\\.svg).*)',
  ],
}
