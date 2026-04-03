'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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
      if (prev.includes(companyId))
        return prev.filter((id) => id !== companyId)
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
      if (!response.ok)
        throw new Error(payload.error || 'Failed to save company assignments')

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
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900">Company Assignment</h2>
      <p className="mt-1 text-sm text-gray-600">
        Select which companies this document belongs to.
      </p>

      {companies.length === 0 ? (
        <p className="mt-4 text-sm text-gray-500">
          No companies available. Ask an admin to create companies first.
        </p>
      ) : (
        <div className="mt-4 max-h-56 space-y-2 overflow-y-auto rounded-md border border-gray-200 p-3">
          {companies.map((company) => {
            const isChecked = nextSelectedCompanyIds.includes(company.id)
            return (
              <label
                key={company.id}
                className="flex cursor-pointer items-center gap-2 text-sm text-gray-700"
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => handleToggle(company.id)}
                  className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                />
                <span>{company.name}</span>
              </label>
            )
          })}
        </div>
      )}

      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving || companies.length === 0}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSaving ? 'Saving...' : 'Save Companies'}
        </button>
        {error && <p className="text-sm text-red-700">{error}</p>}
      </div>
    </div>
  )
}
