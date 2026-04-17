import type { Metadata } from 'next'
import { Inter, Space_Grotesk } from 'next/font/google'
import './globals.css'
import '@drvillo/react-browser-e-signing/styles.css'
import '@/styles/signing-theme.css'
import { ThemeProvider } from '@/components/theme-provider'
import { ThemeScript } from '@/components/theme-script'
import { Toaster } from '@/components/ui/sonner'

const THEME_STORAGE_KEY = 'lunar-sign-theme'
const DEFAULT_THEME = 'dark' as const

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
    <html
      lang="en"
      className={`h-full ${DEFAULT_THEME} ${inter.variable} ${spaceGrotesk.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-full bg-lr-bg text-lr-text font-sans antialiased">
        <ThemeScript storageKey={THEME_STORAGE_KEY} defaultTheme={DEFAULT_THEME} />
        <ThemeProvider defaultTheme={DEFAULT_THEME} storageKey={THEME_STORAGE_KEY}>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
