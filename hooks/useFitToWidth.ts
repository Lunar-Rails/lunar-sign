import { type RefObject, useEffect, useRef } from 'react'

const MIN_SCALE = 0.25
const MAX_SCALE = 2

/**
 * Computes a fit-to-width scale from the PDF page width (in points) and the
 * scroll container's client width, then sets it via `setScale`. Re-runs on
 * container resize via ResizeObserver. Skips update when the delta is < 0.01
 * to avoid feedback loops with the library's own scale state.
 */
export function useFitToWidth(
  containerRef: RefObject<HTMLDivElement | null>,
  firstPageWidthPt: number | undefined,
  setScale: (next: number) => void,
  options?: { paddingPx?: number }
) {
  const paddingPx = options?.paddingPx ?? 32
  const lastScaleRef = useRef<number | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container || !firstPageWidthPt) return

    function computeAndSet() {
      const el = containerRef.current
      if (!el || !firstPageWidthPt) return
      const available = el.clientWidth - paddingPx
      if (available <= 0) return
      const raw = available / firstPageWidthPt
      const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, parseFloat(raw.toFixed(2))))
      if (!Number.isFinite(next)) return
      const last = lastScaleRef.current
      if (last !== null && Math.abs(last - next) < 0.01) return
      lastScaleRef.current = next
      setScale(next)
    }

    computeAndSet()

    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(computeAndSet)
    ro.observe(container)
    return () => ro.disconnect()
  }, [containerRef, firstPageWidthPt, paddingPx, setScale])
}
