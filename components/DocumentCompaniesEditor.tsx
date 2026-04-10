'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Building2 } from 'lucide-react'

import { Company } from '@/lib/types'

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
  const [nextSelectedCompanyIds, setNextSelectedCompanyIds] = useState<string[]>(
    selectedCompanyIds
  )
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleToggle(companyId: string) {
    setNextSelectedCompanyIds((prev) => {
      if (prev.includes(companyId)) {
        return prev.filter((id) => id !== companyId)
      }
      return [...prev, companyId]
    })
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
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to save company assignments')
      }

      router.refresh()
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Failed to save company assignments'
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="lr-panel p-6">
      <p className="lr-label">Company routing</p>
      <h2 className="font-display mt-2 text-xl font-semibold text-white">
        Company assignment
      </h2>
      <p className="mt-3 text-sm leading-6 text-[var(--lr-text-soft)]">
        Select which companies this document belongs to.
      </p>

      {companies.length === 0 ? (
        <p className="mt-4 text-sm text-[var(--lr-text-muted)]">
          No companies available. Ask an admin to create companies first.
        </p>
      ) : (
        <div className="mt-5 max-h-56 space-y-2 overflow-y-auto rounded-[14px] border border-[rgba(193,178,255,0.12)] bg-[rgba(255,255,255,0.02)] p-3">
          {companies.map((company) => {
            const isChecked = nextSelectedCompanyIds.includes(company.id)
            return (
              <label
                key={company.id}
                className="flex cursor-pointer items-center gap-3 rounded-[12px] border border-[rgba(193,178,255,0.08)] bg-[rgba(124,92,252,0.03)] px-3 py-2 text-sm text-[var(--lr-text-soft)]"
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => handleToggle(company.id)}
                  className="lr-checkbox h-4 w-4 rounded border-[rgba(193,178,255,0.22)] bg-transparent"
                />
                <Building2 className="h-4 w-4 text-[var(--lr-accent-soft)]" />
                <span>{company.name}</span>
              </label>
            )
          })}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving || companies.length === 0}
          className="lr-button lr-button-primary"
        >
          {isSaving ? 'Saving...' : 'Save companies'}
        </button>
        {error && <p className="text-sm text-[var(--lr-danger)]">{error}</p>}
      </div>
    </div>
  )
}
