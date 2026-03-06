import type { Metadata } from 'next'
import { Inter, DM_Sans } from 'next/font/google'

import './globals.css'
import { Providers } from './providers'
import { Footer } from '@/components/footer'

const _inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const _dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-dm-sans' })

export const metadata: Metadata = {
  title: 'AgilDent  - Panel de Administracion',
  description: 'Sistema de gestion para clinica dental',
  icons: {
    icon: '/favicon.ico',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es">
      <body className={`${_inter.variable} ${_dmSans.variable} font-sans antialiased flex flex-col min-h-screen`}>
        <Providers>
          <div className="flex-grow">{children}</div>
          <Footer />
        </Providers>
      </body>
    </html>
  )
}
