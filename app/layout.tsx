import type { Metadata } from 'next'
import { Inter, Space_Grotesk } from 'next/font/google'
import './globals.css'
import '@drvillo/react-browser-e-signing/styles.css'
import { Toaster } from '@/components/ui/sonner'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-space-grotesk',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Lunar Sign - E-Signature Portal',
  description: 'Secure document signing portal',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`dark h-full ${inter.variable} ${spaceGrotesk.variable}`}>
      <body className="min-h-full bg-lr-bg text-lr-text font-sans antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  )
}
