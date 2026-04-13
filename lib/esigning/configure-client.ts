'use client'

import { configure } from '@drvillo/react-browser-e-signing'
import { getPdfWorkerSrc } from '@drvillo/react-browser-e-signing/worker'

declare global {
  interface Window {
    __lunarSignESigningConfigured__?: boolean
  }
}

export function ensureESigningConfigured() {
  if (typeof window === 'undefined') return
  if (window.__lunarSignESigningConfigured__) return

  configure({
    pdfWorkerSrc: getPdfWorkerSrc(),
    fontMode: 'bundled',
  })

  window.__lunarSignESigningConfigured__ = true
}
