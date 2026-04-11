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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      })

      if (!response.ok) throw new Error('Failed to update role')

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
      className="h-8 rounded-lr border border-lr-border bg-lr-surface px-3 text-lr-xs font-medium text-lr-text transition-colors focus:border-lr-accent focus:outline-none focus:ring-1 focus:ring-lr-accent disabled:opacity-50 cursor-pointer capitalize"
    >
      <option value="member">Member</option>
      <option value="admin">Admin</option>
    </select>
  )
}
