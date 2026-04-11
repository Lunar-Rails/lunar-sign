'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { AlertCircle } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export interface CompanyMemberRow {
  company_id: string
  user_id: string
  created_at: string
  profiles: { id: string; email: string; full_name: string } | null
}

interface CompanyMemberManagementProps {
  companyId: string
  initialMembers: CompanyMemberRow[]
}

export function CompanyMemberManagement({ companyId, initialMembers }: CompanyMemberManagementProps) {
  const router = useRouter()
  const [members, setMembers] = useState<CompanyMemberRow[]>(initialMembers)
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const sortedMembers = useMemo(
    () => [...members].sort((a, b) => (a.profiles?.email || '').localeCompare(b.profiles?.email || '')),
    [members]
  )

  async function handleAddMember(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!email.trim()) return

    setError(null)
    setIsLoading(true)
    try {
      const response = await fetch(`/api/companies/${companyId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })

      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Failed to add company member')

      const member = payload.data.member as CompanyMemberRow
      setMembers((prev) => {
        const alreadyExists = prev.some((row) => row.user_id === member.user_id)
        if (alreadyExists) return prev
        return [...prev, { ...member, created_at: new Date().toISOString() }]
      })
      setEmail('')
      router.refresh()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to add member')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleRemoveMember(member: CompanyMemberRow) {
    const memberLabel = member.profiles?.email || member.user_id
    if (!window.confirm(`Remove ${memberLabel} from this company?`)) return

    setError(null)
    setIsLoading(true)
    try {
      const response = await fetch(`/api/companies/${companyId}/members/${member.user_id}`, {
        method: 'DELETE',
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Failed to remove company member')

      setMembers((prev) => prev.filter((row) => row.user_id !== member.user_id))
      router.refresh()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to remove member')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleAddMember}
        className="rounded-lr-lg border border-lr-border bg-lr-surface p-5 shadow-lr-card"
      >
        <Label htmlFor="member-email">Add member by email</Label>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <Input
            id="member-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@company.com"
            disabled={isLoading}
            className="flex-1"
          />
          <Button type="submit" disabled={isLoading || !email.trim()}>
            Add Member
          </Button>
        </div>
        {error && (
          <div className="mt-3 flex items-center gap-2 text-lr-xs text-lr-error">
            <AlertCircle className="h-3.5 w-3.5" />
            {error}
          </div>
        )}
      </form>

      <div className="rounded-lr-lg border border-lr-border bg-lr-surface shadow-lr-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Added</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedMembers.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-lr-muted py-8">
                  No members yet.
                </TableCell>
              </TableRow>
            )}
            {sortedMembers.map((member) => (
              <TableRow key={member.user_id}>
                <TableCell className="font-medium text-lr-text">
                  {member.profiles?.full_name || 'Unknown'}
                </TableCell>
                <TableCell className="text-lr-muted">
                  {member.profiles?.email || member.user_id}
                </TableCell>
                <TableCell className="text-lr-muted">
                  {new Date(member.created_at).toLocaleDateString('en-US')}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleRemoveMember(member)}
                  >
                    Remove
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
