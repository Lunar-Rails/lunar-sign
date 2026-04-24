'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Company, UserRole } from '@/lib/types'
import { FormPending } from '@/components/ui/form-pending'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { LrSelect } from '@/components/ui/lr-select'
import { AlertCircle, CheckCircle } from 'lucide-react'
import { CheckboxList } from '@/components/CheckboxList'

interface InviteUserFormProps {
  companies: Pick<Company, 'id' | 'name' | 'slug'>[]
}

export function InviteUserForm({ companies }: InviteUserFormProps) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<UserRole>('member')
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<string[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  function handleCompanyToggle(companyId: string) {
    setSelectedCompanyIds((prev) =>
      prev.includes(companyId)
        ? prev.filter((id) => id !== companyId)
        : [...prev, companyId]
    )
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!email.trim()) return

    setError(null)
    setSuccessMessage(null)
    setIsSaving(true)

    try {
      const response = await fetch('/api/admin/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), role, companyIds: selectedCompanyIds }),
      })

      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Failed to create invitation')

      setEmail('')
      setRole('member')
      setSelectedCompanyIds([])
      setSuccessMessage('Invitation saved. Permissions will apply on first login.')
      router.refresh()
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : 'Failed to create invitation'
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <FormPending isPending={isSaving} className="block">
    <form onSubmit={handleSubmit} className="rounded-lr-lg border border-lr-border bg-lr-surface p-5 shadow-lr-card">
      <h2 className="text-card-title">Invite user</h2>
      <p className="text-body mt-1">
        Add an email, workspace role, and optional company access.
      </p>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="invite-email">Email *</Label>
          <Input
            id="invite-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@company.com"
            disabled={isSaving}
            required
          />
        </div>

        <div>
          <Label htmlFor="invite-role">Workspace role</Label>
          <LrSelect
            options={[
              { value: 'member', label: 'Member' },
              { value: 'admin', label: 'Admin' },
            ]}
            value={role}
            onChange={(v) => setRole(v as UserRole)}
            disabled={isSaving}
          />
        </div>
      </div>

      <div className="mt-4">
        <Label>Company access</Label>
        {companies.length === 0 ? (
          <p className="mt-2 text-lr-sm text-lr-muted">No companies available yet.</p>
        ) : (
          <div className="mt-2 max-h-44 overflow-y-auto rounded-lr border border-lr-border bg-lr-surface p-3">
            <CheckboxList
              options={companies.map((c) => ({ id: c.id, label: c.name }))}
              selectedIds={selectedCompanyIds}
              onChange={handleCompanyToggle}
              disabled={isSaving}
            />
          </div>
        )}
      </div>

      <div className="mt-5 flex items-center gap-3">
        <Button type="submit" disabled={isSaving || !email.trim()}>
          {isSaving ? 'Saving…' : 'Send Invite'}
        </Button>
        {successMessage && (
          <span className="flex items-center gap-1.5 text-lr-sm text-lr-success">
            <CheckCircle className="h-4 w-4" />
            {successMessage}
          </span>
        )}
      </div>

      {error && (
        <div className="mt-3 flex items-center gap-2 rounded-lr border-l-4 border-l-lr-error bg-lr-error-dim px-4 py-3">
          <AlertCircle className="h-4 w-4 shrink-0 text-lr-error" />
          <p className="text-lr-sm text-lr-error">{error}</p>
        </div>
      )}
    </form>
    </FormPending>
  )
}
