'use client'

import { useRouter } from 'next/navigation'

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || '/agildent'

/**
 * Hook personalizado que envuelve useRouter y aplica automáticamente el basePath
 * a todas las navegaciones
 */
export function useAppRouter() {
  const router = useRouter()

  return {
    push: (path: string) => {
      const fullPath = path.startsWith('/') ? `${BASE_PATH}${path}` : path
      router.push(fullPath)
    },
    replace: (path: string) => {
      const fullPath = path.startsWith('/') ? `${BASE_PATH}${path}` : path
      router.replace(fullPath)
    },
    refresh: () => router.refresh(),
    back: () => router.back(),
    forward: () => router.forward(),
  }
}
