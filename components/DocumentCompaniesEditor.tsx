'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle } from 'lucide-react'
import { Company } from '@/lib/types'
import { LrSelect } from '@/components/ui/lr-select'

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
  const [pendingIds, setPendingIds] = useState<string[]>(selectedCompanyIds)
  const pendingRef = useRef(pendingIds)
  pendingRef.current = pendingIds
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function saveCompanies(ids: string[]) {
    setError(null)
    setIsSaving(true)
    try {
      const res = await fetch(`/api/documents/${documentId}/companies`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyIds: ids }),
      })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload.error || 'Failed to save company assignments')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save company assignments')
    } finally {
      setIsSaving(false)
    }
  }

  function handleOpenChange(open: boolean) {
    if (!open) void saveCompanies(pendingRef.current)
  }

  if (companies.length === 0) {
    return <span className="text-caption text-lr-muted">No companies</span>
  }

  return (
    <div>
      <LrSelect
        mode="multi"
        options={companies.map((c) => ({ value: c.id, label: c.name }))}
        value={pendingIds}
        onChange={(ids) => setPendingIds(ids as string[])}
        onOpenChange={handleOpenChange}
        disabled={isSaving}
        className="h-8 text-caption"
      />
      {error && (
        <div className="mt-1 flex items-center gap-1.5 text-lr-xs text-lr-error">
          <AlertCircle className="h-3 w-3 shrink-0" />
          {error}
        </div>
      )}
    </div>
  )
}
