import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const BASE_PATH = process.env.BASE_PATH || ''

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Remove basePath from pathname for comparison
  const pathWithoutBase = pathname.replace(new RegExp(`^${BASE_PATH}`), '') || '/'

  // Rutas públicas que no requieren autenticación
  const publicRoutes = ['/auth/login']

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
    const loginUrl = new URL(request.url)
    loginUrl.pathname = `${BASE_PATH}/auth/login`
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    // Proteger todas las rutas excepto:
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png|.*\\.jpg|.*\\.jpeg|.*\\.gif|.*\\.svg).*)',
  ],
}
