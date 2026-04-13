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

interface DashboardUploadTemplateButtonProps {
  activeCompanySlug: string | null
  companies: CompanyOption[]
}

const fabClass =
  'fixed bottom-6 right-6 z-50 inline-flex h-12 items-center gap-2.5 rounded-full bg-gradient-to-br from-lr-accent to-lr-accent-hover px-5 text-white shadow-lr-glow-accent transition-opacity duration-lr-fast hover:opacity-90 font-display font-semibold'

export function DashboardUploadTemplateButton({
  activeCompanySlug,
  companies,
}: DashboardUploadTemplateButtonProps) {
  const router = useRouter()
  const [dialogOpen, setDialogOpen] = useState(false)

  const hasValidActiveCompany =
    !!activeCompanySlug && companies.some((c) => c.slug === activeCompanySlug)

  function handlePickCompany(slug: string) {
    setDialogOpen(false)
    router.push(`/templates/new?company=${encodeURIComponent(slug)}`)
  }

  if (hasValidActiveCompany) {
    return (
      <Link
        href={`/templates/new?company=${encodeURIComponent(activeCompanySlug!)}`}
        className={fabClass}
      >
        <Upload size={18} />
        Upload template
      </Link>
    )
  }

  if (companies.length === 0) {
    return (
      <Link href="/templates/new" className={fabClass}>
        <Upload size={18} />
        Upload template
      </Link>
    )
  }

  return (
    <>
      <button type="button" onClick={() => setDialogOpen(true)} className={fabClass}>
        <Upload size={18} />
        Upload template
      </button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Choose a company</DialogTitle>
            <DialogDescription>
              Select which company this template is for. You can adjust companies on the template
              form if needed.
            </DialogDescription>
          </DialogHeader>

          <ul className="mt-2 max-h-64 space-y-0.5 overflow-y-auto">
            {companies.map((company) => (
              <li key={company.slug}>
                <button
                  type="button"
                  onClick={() => handlePickCompany(company.slug)}
                  className="w-full rounded-lr px-3 py-2 text-left text-body hover:bg-lr-surface hover:text-lr-text transition-colors"
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
