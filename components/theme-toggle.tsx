'use client'

import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { Moon, Sun } from 'lucide-react'

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <div className="h-[34px] w-[34px]" />
  }

  const isDark = resolvedTheme === 'dark'

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      className="flex h-[34px] w-[34px] items-center justify-center rounded-full border border-lr-border bg-lr-surface text-lr-muted transition-all duration-lr-fast hover:border-lr-border-2 hover:text-lr-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lr-accent focus-visible:ring-offset-2 focus-visible:ring-offset-lr-bg"
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  )
}
