'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Company } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckboxList } from '@/components/CheckboxList'
import { AlertCircle, ChevronDown } from 'lucide-react'

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
  const [isOpen, setIsOpen] = useState(false)
  const [nextSelectedCompanyIds, setNextSelectedCompanyIds] = useState<string[]>(selectedCompanyIds)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const selectedCompanies = companies.filter((c) =>
    nextSelectedCompanyIds.includes(c.id)
  )

  const hasChanges =
    nextSelectedCompanyIds.length !== selectedCompanyIds.length ||
    nextSelectedCompanyIds.some((id) => !selectedCompanyIds.includes(id))

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
        if (hasChanges) handleSave()
      }
    }
    if (isOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, hasChanges])

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

  if (companies.length === 0) {
    return <span className="text-lr-xs text-lr-muted">No companies</span>
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex flex-wrap items-center gap-1 rounded-lr px-1.5 py-0.5 text-lr-xs transition-colors hover:bg-lr-surface-2"
      >
        {selectedCompanies.length === 0 ? (
          <span className="text-lr-muted">Unassigned</span>
        ) : (
          selectedCompanies.map((company) => (
            <Badge key={company.id} variant="outline">
              {company.name}
            </Badge>
          ))
        )}
        <ChevronDown className="ml-0.5 h-3 w-3 shrink-0 text-lr-muted" />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full z-20 mt-1 w-56 rounded-lr-lg border border-lr-border bg-lr-bg py-1 shadow-lg">
          <div className="max-h-48 overflow-y-auto">
            <CheckboxList
              variant="menu"
              options={companies.map((c) => ({ id: c.id, label: c.name }))}
              selectedIds={nextSelectedCompanyIds}
              onChange={handleToggle}
            />
          </div>
          {error && (
            <div className="flex items-center gap-1.5 border-t border-lr-border px-3 py-1.5 text-lr-xs text-lr-error">
              <AlertCircle className="h-3.5 w-3.5" />
              {error}
            </div>
          )}
          {hasChanges && (
            <div className="border-t border-lr-border px-3 py-1.5">
              <Button
                type="button"
                size="sm"
                className="w-full"
                onClick={() => {
                  setIsOpen(false)
                  handleSave()
                }}
                disabled={isSaving}
              >
                {isSaving ? 'Saving…' : 'Save'}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
