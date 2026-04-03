'use client'

import { useState } from 'react'
import { Profile } from '@/lib/types'
import { signOut } from '@/app/(authenticated)/actions'

interface UserDropdownProps {
  profile: Profile
}

export default function UserDropdown({ profile }: UserDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)

  const handleSignOut = async () => {
    await signOut()
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
      >
        <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center text-xs text-white">
          {profile.full_name.charAt(0).toUpperCase()}
        </div>
        <span>{profile.full_name}</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 rounded-md border border-gray-200 bg-white shadow-lg">
          <div className="px-4 py-3">
            <p className="text-sm font-medium text-gray-900">
              {profile.full_name}
            </p>
            <p className="text-xs text-gray-500">{profile.email}</p>
            <p className="mt-1 text-xs text-gray-500">
              Role:{' '}
              <span className="font-medium capitalize">{profile.role}</span>
            </p>
          </div>
          <div className="border-t border-gray-200 px-0 py-0">
            <button
              onClick={() => {
                setIsOpen(false)
                handleSignOut()
              }}
              className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
            >
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
