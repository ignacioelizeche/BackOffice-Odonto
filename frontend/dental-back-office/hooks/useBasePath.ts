import { useRouter as useNextRouter } from 'next/navigation'

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || '/agildent'

/**
 * Hook que envuelve useRouter de Next.js para automáticamente aplicar basePath
 * a las rutas. Uso: useRouter en lugar de useRouter de next/navigation
 */
export function useRouter() {
  const router = useNextRouter()

  return {
    ...router,
    push: (href: string) => {
      const pathWithBase = href.startsWith('/') ? `${BASE_PATH}${href}` : href
      router.push(pathWithBase)
    },
    replace: (href: string) => {
      const pathWithBase = href.startsWith('/') ? `${BASE_PATH}${href}` : href
      router.replace(pathWithBase)
    },
    prefetch: (href: string) => {
      const pathWithBase = href.startsWith('/') ? `${BASE_PATH}${href}` : href
      router.prefetch(pathWithBase)
    },
  }
}

/**
 * Utility function para obtener una ruta con basePath aplicado
 */
export function getBasePath(path: string): string {
  return path.startsWith('/') ? `${BASE_PATH}${path}` : path
}
