'use client'

import { configure, loadSignatureFont } from '@drvillo/react-browser-e-signing'
import { getPdfWorkerSrc } from '@drvillo/react-browser-e-signing/worker'

declare global {
  interface Window {
    __lunarSignESigningConfigured__?: boolean
    __lunarSignSwUnregistered__?: boolean
  }
}

export function ensureESigningConfigured() {
  if (typeof window === 'undefined') return
  if (window.__lunarSignESigningConfigured__) return

  // As of @drvillo/react-browser-e-signing >= 0.6.2, configure() applies
  // pdfWorkerSrc to pdfjs.GlobalWorkerOptions synchronously, so the previous
  // race-fix workaround (importing react-pdf to pre-set GlobalWorkerOptions)
  // is no longer needed.
  configure({
    pdfWorkerSrc: getPdfWorkerSrc(),
    fontMode: 'bundled',
  })

  // Preload the single signature font used across the signer flow.
  void loadSignatureFont('Homemade Apple')

  window.__lunarSignESigningConfigured__ = true

  // Dev-only Service Worker self-defense. Stale SWs (e.g., from a prior
  // Netlify preview deploy of this branch) can intercept the pdfjs worker
  // script fetch and silently break module workers, leaving the PDF stuck
  // on "Loading PDF..." with no error. Unregister any controller so dev
  // reloads always start from a clean slate.
  if (
    process.env.NODE_ENV !== 'production' &&
    !window.__lunarSignSwUnregistered__ &&
    'serviceWorker' in navigator
  ) {
    window.__lunarSignSwUnregistered__ = true
    navigator.serviceWorker
      .getRegistrations()
      .then((regs) => {
        for (const reg of regs) reg.unregister().catch(() => {})
      })
      .catch(() => {})
  }
}

ensureESigningConfigured()
