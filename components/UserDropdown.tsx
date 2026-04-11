'use client'

import { Profile } from '@/lib/types'
import { signOut } from '@/app/(authenticated)/actions'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ChevronDown, LogOut } from 'lucide-react'

interface UserDropdownProps {
  profile: Profile
}

export default function UserDropdown({ profile }: UserDropdownProps) {
  const initial = profile.full_name.charAt(0).toUpperCase()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex h-[34px] items-center gap-2 rounded-full border border-lr-accent bg-gradient-to-br from-lr-accent-dim to-lr-accent-dim/60 px-3 text-lr-sm font-medium text-lr-text transition-all duration-lr-fast hover:border-lr-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lr-accent focus-visible:ring-offset-2 focus-visible:ring-offset-lr-bg">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-lr-accent text-[10px] font-bold text-white font-display">
            {initial}
          </span>
          <span className="hidden sm:block">{profile.full_name}</span>
          <ChevronDown className="h-3.5 w-3.5 text-lr-muted" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="normal-case text-lr-sm font-medium text-lr-text tracking-normal">
          <p>{profile.full_name}</p>
          <p className="text-lr-xs text-lr-muted font-normal mt-0.5">{profile.email}</p>
          <p className="text-lr-xs text-lr-muted font-normal capitalize mt-0.5">
            {profile.role}
          </p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => signOut()}
          className="text-lr-error focus:text-lr-error focus:bg-lr-error-dim cursor-pointer"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
