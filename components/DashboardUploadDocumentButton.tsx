'use client'

import * as Dialog from '@radix-ui/react-dialog'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

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

  const buttonClass =
    'inline-flex items-center justify-center rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700'

  if (hasValidActiveCompany) {
    return (
      <Link
        href={`/upload?company=${encodeURIComponent(activeCompanySlug!)}`}
        className={buttonClass}
      >
        Upload new document
      </Link>
    )
  }

  if (companies.length === 0) {
    return (
      <Link href="/upload" className={buttonClass}>
        Upload new document
      </Link>
    )
  }

  return (
    <Dialog.Root open={dialogOpen} onOpenChange={setDialogOpen}>
      <Dialog.Trigger asChild>
        <button type="button" className={buttonClass}>
          Upload new document
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-gray-200 bg-white p-6 shadow-lg">
          <Dialog.Title className="text-lg font-semibold text-gray-900">
            Choose a company
          </Dialog.Title>
          <Dialog.Description className="mt-1 text-sm text-gray-600">
            Select which company this upload belongs to. You can add more
            companies on the upload form if needed.
          </Dialog.Description>
          <ul className="mt-4 max-h-64 space-y-1 overflow-y-auto">
            {companies.map((company) => (
              <li key={company.slug}>
                <button
                  type="button"
                  onClick={() => handlePickCompany(company.slug)}
                  className="w-full rounded-md px-3 py-2 text-left text-sm text-gray-800 hover:bg-gray-100"
                >
                  {company.name}
                </button>
              </li>
            ))}
          </ul>
          <Dialog.Close asChild>
            <button
              type="button"
              className="mt-4 w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
