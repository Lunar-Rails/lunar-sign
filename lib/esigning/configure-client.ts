'use client'

import { configure } from '@drvillo/react-browser-e-signing'
import { getPdfWorkerSrc } from '@drvillo/react-browser-e-signing/worker'
import { pdfjs } from 'react-pdf'

declare global {
  interface Window {
    __lunarSignESigningConfigured__?: boolean
    __lunarSignSwUnregistered__?: boolean
  }
}

export function ensureESigningConfigured() {
  if (typeof window === 'undefined') return
  if (window.__lunarSignESigningConfigured__) return

  const workerSrc = getPdfWorkerSrc()

  configure({
    pdfWorkerSrc: workerSrc,
    fontMode: 'bundled',
  })

  // Set workerSrc directly so child <Document> effects (which run before
  // PdfViewer's parent useEffect) find a configured worker. Without this,
  // the first getDocument() call races with an empty workerSrc and only
  // succeeds in dev because StrictMode double-invokes effects.
  if (workerSrc) {
    try {
      pdfjs.GlobalWorkerOptions.workerSrc = workerSrc
    } catch {
      // GlobalWorkerOptions may be sealed in some pdfjs builds; the lib's
      // own useEffect remains as a fallback.
    }
  }

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
