'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Company } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { AlertCircle } from 'lucide-react'

interface DocumentCompaniesEditorProps {
  documentId: string
  companies: Company[]
  selectedCompanyIds: string[]
}

export default function DocumentCompaniesEditor({
  documentId,
  companies,
  selectedCompanyIds,
}: DocumentCompaniesEditorProps) {
  const router = useRouter()
  const [nextSelectedCompanyIds, setNextSelectedCompanyIds] = useState<string[]>(selectedCompanyIds)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleToggle(companyId: string) {
    setNextSelectedCompanyIds((prev) =>
      prev.includes(companyId) ? prev.filter((id) => id !== companyId) : [...prev, companyId]
    )
  }

  async function handleSave() {
    setError(null)
    setIsSaving(true)

    try {
      const response = await fetch(`/api/documents/${documentId}/companies`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyIds: nextSelectedCompanyIds }),
      })

      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Failed to save company assignments')

      router.refresh()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to save company assignments')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="rounded-lr-lg border border-lr-border bg-lr-surface p-5 shadow-lr-card">
      <h2 className="font-display text-lr-xl font-semibold text-lr-text">Company Assignment</h2>
      <p className="mt-1 text-lr-sm text-lr-muted">Select which companies this document belongs to.</p>

      {companies.length === 0 ? (
        <p className="mt-4 text-lr-sm text-lr-muted">
          No companies available. Ask an admin to create companies first.
        </p>
      ) : (
        <div className="mt-4 max-h-56 space-y-2 overflow-y-auto rounded-lr border border-lr-border bg-lr-glass p-3">
          {companies.map((company) => {
            const isChecked = nextSelectedCompanyIds.includes(company.id)
            return (
              <label key={company.id} className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => handleToggle(company.id)}
                  className="h-4 w-4 rounded border-lr-border accent-lr-accent"
                />
                <span className="text-lr-sm text-lr-text-2">{company.name}</span>
              </label>
            )
          })}
        </div>
      )}

      <div className="mt-4 flex items-center gap-3">
        <Button
          type="button"
          onClick={handleSave}
          disabled={isSaving || companies.length === 0}
          size="sm"
        >
          {isSaving ? 'Saving…' : 'Save Companies'}
        </Button>
        {error && (
          <div className="flex items-center gap-1.5 text-lr-xs text-lr-error">
            <AlertCircle className="h-3.5 w-3.5" />
            {error}
          </div>
        )}
      </div>
    </div>
  )
}
