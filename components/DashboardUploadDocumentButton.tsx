'use client'

import * as Dialog from '@radix-ui/react-dialog'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ArrowRight, Building2, Plus } from 'lucide-react'

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

  const buttonClass = 'lr-button lr-button-primary whitespace-nowrap'

  if (hasValidActiveCompany) {
    return (
      <Link
        href={`/upload?company=${encodeURIComponent(activeCompanySlug!)}`}
        className={buttonClass}
      >
        <Plus className="h-4 w-4" />
        Upload new document
      </Link>
    )
  }

  if (companies.length === 0) {
    return (
      <Link href="/upload" className={buttonClass}>
        <Plus className="h-4 w-4" />
        Upload new document
      </Link>
    )
  }

  return (
    <Dialog.Root open={dialogOpen} onOpenChange={setDialogOpen}>
      <Dialog.Trigger asChild>
        <button type="button" className={buttonClass}>
          <Plus className="h-4 w-4" />
          Upload new document
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-[rgba(6,8,15,0.72)] backdrop-blur-md" />
        <Dialog.Content className="lr-panel fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 p-6 sm:p-7">
          <Dialog.Title className="font-display text-xl font-semibold text-white">
            Choose a company lane
          </Dialog.Title>
          <Dialog.Description className="mt-2 text-sm leading-6 text-[var(--lr-text-soft)]">
            Select the company context for this upload. You can attach more
            companies later on the document form.
          </Dialog.Description>
          <ul className="mt-5 max-h-64 space-y-2 overflow-y-auto">
            {companies.map((company) => (
              <li key={company.slug}>
                <button
                  type="button"
                  onClick={() => handlePickCompany(company.slug)}
                  className="lr-sidebar-link w-full"
                >
                  <span className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-[var(--lr-accent-soft)]" />
                    <span>{company.name}</span>
                  </span>
                  <ArrowRight className="h-4 w-4 text-[var(--lr-text-muted)]" />
                </button>
              </li>
            ))}
          </ul>
          <Dialog.Close asChild>
            <button type="button" className="lr-button lr-button-ghost mt-5 w-full">
              Cancel
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
