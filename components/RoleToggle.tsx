'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { UserRole } from '@/lib/types'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

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
      toast.success('Role updated')
    } catch (error) {
      console.error('Role update error:', error)
      toast.error('Failed to update role')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Select value={role} onValueChange={handleRoleChange} disabled={loading}>
        <SelectTrigger className="w-[110px] h-8 text-lr-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="member">Member</SelectItem>
          <SelectItem value="admin">Admin</SelectItem>
        </SelectContent>
      </Select>
      {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-lr-muted" />}
    </div>
  )
}
