'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Profile } from '@/lib/types'
import { signOut } from '@/app/(authenticated)/actions'

interface UserDropdownProps {
  profile: Profile
}

export default function UserDropdown({ profile }: UserDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)

  const handleSignOut = async () => {
    await signOut()
  }

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false)
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [])

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
        className="inline-flex items-center gap-2 rounded-full border border-[rgba(124,92,252,0.5)] bg-[linear-gradient(135deg,rgba(124,92,252,0.14),rgba(124,92,252,0.08))] px-2 py-1.5 text-sm font-medium text-white shadow-[0_0_18px_rgba(124,92,252,0.12),inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:border-[rgba(158,133,255,0.8)]"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[rgba(193,178,255,0.24)] bg-[rgba(124,92,252,0.18)] font-display text-xs font-semibold text-[var(--lr-accent-soft)]">
          {profile.full_name.charAt(0).toUpperCase()}
        </div>
        <div className="hidden text-left sm:block">
          <p className="max-w-[10rem] truncate text-sm text-white">
            {profile.full_name}
          </p>
          <p className="font-display text-[0.6rem] uppercase tracking-[0.14em] text-[var(--lr-text-muted)]">
            {profile.role}
          </p>
        </div>
        <ChevronDown className="h-4 w-4 text-[var(--lr-text-muted)]" />
      </button>

      {isOpen && (
        <div className="lr-panel absolute right-0 mt-3 w-64 overflow-hidden p-0">
          <div className="border-b border-[rgba(193,178,255,0.12)] px-4 py-4">
            <p className="font-display text-sm font-semibold text-white">
              {profile.full_name}
            </p>
            <p className="mt-1 text-xs text-[var(--lr-text-soft)]">{profile.email}</p>
            <p className="mt-3 lr-label">Account role</p>
            <p className="mt-1 text-sm capitalize text-[var(--lr-text-soft)]">
              {profile.role}
            </p>
          </div>
          <div className="p-2">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false)
                void handleSignOut()
              }}
              className="lr-button lr-button-ghost w-full justify-start"
            >
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
