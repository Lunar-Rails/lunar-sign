'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { UserRole } from '@/lib/types'

interface RoleToggleProps {
  userId: string
  currentRole: UserRole
}

export default function RoleToggle({ userId, currentRole }: RoleToggleProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [role, setRole] = useState<UserRole>(currentRole)

  const handleRoleChange = async (newRole: UserRole) => {
    if (newRole === role) return

    setLoading(true)

    try {
      const response = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: newRole }),
      })

      if (!response.ok) {
        throw new Error('Failed to update role')
      }

      setRole(newRole)
      router.refresh()
    } catch (error) {
      console.error('Role update error:', error)
      alert('Failed to update role')
    } finally {
      setLoading(false)
    }
  }

  return (
    <select
      value={role}
      onChange={(e) => handleRoleChange(e.target.value as UserRole)}
      disabled={loading}
      className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-600"
    >
      <option value="member">Member</option>
      <option value="admin">Admin</option>
    </select>
  )
}
