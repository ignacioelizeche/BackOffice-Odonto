import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const BASE_PATH = '/agildent'

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Ignorar rutas que no empiezan con /agildent
  if (!pathname.startsWith(BASE_PATH)) {
    return NextResponse.next()
  }

  // Obtener la ruta sin el basePath
  const pathWithoutBase = pathname.slice(BASE_PATH.length) || '/'

  // Rutas públicas que no requieren autenticación
  const publicPaths = ['/auth/login', '/auth/register', '/auth']

  // Si es una ruta pública, permitir acceso sin verificar token
  if (publicPaths.some(path => pathWithoutBase === path || pathWithoutBase.startsWith(path + '/'))) {
    return NextResponse.next()
  }

  // Para las demás rutas, verificar si hay token
  const token = request.cookies.get('authToken')?.value

  if (!token) {
    // Construir URL de redirección usando los headers del proxy
    const proto = request.headers.get('x-forwarded-proto') || 'https'
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || 'agilapps.com'

    return NextResponse.redirect(`${proto}://${host}${BASE_PATH}/auth/login`)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    // Solo aplicar a rutas bajo /agildent, excluyendo assets
    '/agildent/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.gif$|.*\\.svg$|.*\\.woff2?$).*)',
  ],
}
