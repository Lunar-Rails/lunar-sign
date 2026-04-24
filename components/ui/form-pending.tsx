'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { cn } from '@/lib/utils'

// ── Context: global bar under app header (see FormPendingProvider + FormPendingBar) ──

interface FormPendingContextValue {
  pendingCount: number
  register: () => void
  unregister: () => void
}

const FormPendingContext = createContext<FormPendingContextValue | null>(null)

export function FormPendingProvider({ children }: { children: React.ReactNode }) {
  const [pendingCount, setPendingCount] = useState(0)
  const register = useCallback(() => {
    setPendingCount((c) => c + 1)
  }, [])
  const unregister = useCallback(() => {
    setPendingCount((c) => Math.max(0, c - 1))
  }, [])
  const value = useMemo(
    () => ({ pendingCount, register, unregister }),
    [pendingCount, register, unregister]
  )
  return (
    <FormPendingContext.Provider value={value}>{children}</FormPendingContext.Provider>
  )
}

/** Accent shimmer line; full width of the sticky header stack. Renders only while forms request pending. */
export function FormPendingBar({ className }: { className?: string }) {
  const ctx = useContext(FormPendingContext)
  if (!ctx || ctx.pendingCount === 0) return null
  return (
    <div
      className={cn('h-0.5 w-full overflow-hidden bg-lr-border/20', className)}
      aria-hidden
    >
      <div className="h-full w-full animate-lr-shimmer bg-gradient-to-r from-transparent via-lr-accent/50 to-transparent bg-[length:200%_100%]" />
    </div>
  )
}

// ── Form wrapper: dim + block interaction; registers global bar when pending ──

interface FormPendingProps {
  isPending: boolean
  className?: string
  children: React.ReactNode
}

export function FormPending({ isPending, className, children }: FormPendingProps) {
  const ctx = useContext(FormPendingContext)

  useEffect(() => {
    if (!isPending || !ctx) return
    ctx.register()
    return () => ctx.unregister()
  }, [isPending, ctx])

  return (
    <div className={cn('relative', className)} aria-busy={isPending || undefined}>
      <div
        className={cn(
          'transition-opacity duration-lr-base',
          isPending && 'pointer-events-none opacity-60'
        )}
      >
        {children}
      </div>
    </div>
  )
}
