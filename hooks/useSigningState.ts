'use client'

import { useSyncExternalStore } from 'react'

/** Matches Tailwind `lg` (1024px): mobile signing wizard vs desktop split. */
const NARROW_VIEWPORT_QUERY = '(max-width: 1023px)'

function subscribeToNarrowViewport(callback: () => void) {
  const media = window.matchMedia(NARROW_VIEWPORT_QUERY)
  media.addEventListener('change', callback)
  return () => media.removeEventListener('change', callback)
}

function getNarrowViewportSnapshot() {
  return window.matchMedia(NARROW_VIEWPORT_QUERY).matches
}

function getNarrowViewportServerSnapshot() {
  return false
}

/** Used by `SigningInterface` to switch mobile wizard vs desktop layout. */
export function useNarrowSigningLayout() {
  return useSyncExternalStore(
    subscribeToNarrowViewport,
    getNarrowViewportSnapshot,
    getNarrowViewportServerSnapshot
  )
}
