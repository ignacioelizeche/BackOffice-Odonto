import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const BASE_PATH = '/agildent'

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Remove basePath from pathname for comparison
  const pathWithoutBase = pathname.startsWith(BASE_PATH)
    ? pathname.slice(BASE_PATH.length) || '/'
    : pathname

  // Rutas públicas que no requieren autenticación
  const publicRoutes = ['/auth/login', '/auth/register']

  // Verificar si la ruta actual es pública
  const isPublicRoute = publicRoutes.some(route => pathWithoutBase.startsWith(route))

  // Si es una ruta pública, permitir el acceso
  if (isPublicRoute) {
    return NextResponse.next()
  }

  // Para las demás rutas, verificar si hay token
  const token = request.cookies.get('authToken')?.value

  // Si no hay token y la ruta no es pública, redirigir a login
  if (!token) {
    const loginUrl = new URL(`${BASE_PATH}/auth/login`, request.url)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    // Proteger rutas bajo /agildent excepto assets
    '/agildent/((?!_next/static|_next/image|favicon.ico|.*\\.png|.*\\.jpg|.*\\.jpeg|.*\\.gif|.*\\.svg).*)',
  ],
}
