import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const BASE_PATH = '/agildent'

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Si la ruta no empieza con /agildent, ignorar
  if (!pathname.startsWith(BASE_PATH)) {
    return NextResponse.next()
  }

  // Remove basePath from pathname for comparison
  const pathWithoutBase = pathname.slice(BASE_PATH.length) || '/'

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
    // Usar headers de X-Forwarded-* para el proxy reverso
    const forwardedProto = request.headers.get('x-forwarded-proto') || 'http'
    const forwardedHost = request.headers.get('x-forwarded-host') || request.headers.get('host') || 'localhost'

    // Construir URL de redirección con el host y protocolo correctos
    const loginUrl = `${forwardedProto}://${forwardedHost}${BASE_PATH}/auth/login`
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    // Aplicar a todas las rutas excepto assets estáticos
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png|.*\\.jpg|.*\\.jpeg|.*\\.gif|.*\\.svg).*)',
  ],
}
