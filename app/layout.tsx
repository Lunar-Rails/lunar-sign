import type { Metadata } from 'next'
import './globals.css'

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
    <html lang="en" className="h-full">
      <body className="min-h-full bg-white text-gray-900 font-sans">
        {children}
      </body>
    </html>
  )
}
