'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Upload } from 'lucide-react'

interface CompanyOption {
  slug: string
  name: string
}

interface DashboardUploadDocumentButtonProps {
  activeCompanySlug: string | null
  companies: CompanyOption[]
}

export function DashboardUploadDocumentButton({
  activeCompanySlug,
  companies,
}: DashboardUploadDocumentButtonProps) {
  const router = useRouter()
  const [dialogOpen, setDialogOpen] = useState(false)

  const hasValidActiveCompany =
    !!activeCompanySlug && companies.some((c) => c.slug === activeCompanySlug)

  function handlePickCompany(slug: string) {
    setDialogOpen(false)
    router.push(`/upload?company=${encodeURIComponent(slug)}`)
  }

  if (hasValidActiveCompany) {
    return (
      <Button asChild>
        <Link href={`/upload?company=${encodeURIComponent(activeCompanySlug!)}`}>
          <Upload className="h-4 w-4" />
          Upload new document
        </Link>
      </Button>
    )
  }

  if (companies.length === 0) {
    return (
      <Button asChild>
        <Link href="/upload">
          <Upload className="h-4 w-4" />
          Upload new document
        </Link>
      </Button>
    )
  }

  return (
    <>
      <Button onClick={() => setDialogOpen(true)}>
        <Upload className="h-4 w-4" />
        Upload new document
      </Button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Choose a company</DialogTitle>
            <DialogDescription>
              Select which company this upload belongs to. You can add more companies on the upload
              form if needed.
            </DialogDescription>
          </DialogHeader>

          <ul className="mt-2 max-h-64 space-y-0.5 overflow-y-auto">
            {companies.map((company) => (
              <li key={company.slug}>
                <button
                  type="button"
                  onClick={() => handlePickCompany(company.slug)}
                  className="w-full rounded-lr px-3 py-2 text-left text-lr-sm text-lr-text-2 hover:bg-lr-surface hover:text-lr-text transition-colors"
                >
                  {company.name}
                </button>
              </li>
            ))}
          </ul>

          <Button variant="secondary" onClick={() => setDialogOpen(false)} className="w-full mt-2">
            Cancel
          </Button>
        </DialogContent>
      </Dialog>
    </>
  )
}
