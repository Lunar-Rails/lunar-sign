'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { UserRole } from '@/lib/types'
import { LrSelect } from '@/components/ui/lr-select'

interface RoleToggleProps {
  userId: string
  currentRole: UserRole
}

export default function RoleToggle({ userId, currentRole }: RoleToggleProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [role, setRole] = useState<UserRole>(currentRole)

  async function handleRoleChange(newRole: string) {
    const typed = newRole as UserRole
    if (typed === role) return
    setLoading(true)
    try {
      const response = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: typed }),
      })
      if (!response.ok) throw new Error('Failed to update role')
      setRole(typed)
      router.refresh()
    } catch (error) {
      console.error('Role update error:', error)
      alert('Failed to update role')
    } finally {
      setLoading(false)
    }
  }

  return (
    <LrSelect
      options={[
        { value: 'member', label: 'Member' },
        { value: 'admin', label: 'Admin' },
      ]}
      value={role}
      onChange={(v) => void handleRoleChange(v as string)}
      disabled={loading}
      className="w-[110px] h-8 text-lr-xs"
    />
  )
}
