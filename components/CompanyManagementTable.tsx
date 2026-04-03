'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Company } from '@/lib/types'

interface CompanyManagementTableProps {
  initialCompanies: Company[]
}

type FormMode = 'create' | 'edit'

export default function CompanyManagementTable({
  initialCompanies,
}: CompanyManagementTableProps) {
  const router = useRouter()
  const [companies, setCompanies] = useState<Company[]>(initialCompanies)
  const [name, setName] = useState('')
  const [editingCompanyId, setEditingCompanyId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mode: FormMode = useMemo(
    () => (editingCompanyId ? 'edit' : 'create'),
    [editingCompanyId]
  )

  async function handleCreateCompany() {
    if (!name.trim()) return
    setError(null)
    setIsSaving(true)

    try {
      const response = await fetch('/api/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })

      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Failed to create company')

      setCompanies((prev) =>
        [...prev, payload.data.company].sort((a, b) => a.name.localeCompare(b.name))
      )
      setName('')
      router.refresh()
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Failed to create company'
      )
    } finally {
      setIsSaving(false)
    }
  }

  function startEdit(company: Company) {
    setEditingCompanyId(company.id)
    setName(company.name)
    setError(null)
  }

  function cancelEdit() {
    setEditingCompanyId(null)
    setName('')
    setError(null)
  }

  async function handleUpdateCompany() {
    if (!editingCompanyId) return
    if (!name.trim()) return
    setError(null)
    setIsSaving(true)

    try {
      const response = await fetch(`/api/companies/${editingCompanyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })

      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Failed to update company')

      setCompanies((prev) =>
        prev
          .map((company) =>
            company.id === editingCompanyId ? payload.data.company : company
          )
          .sort((a, b) => a.name.localeCompare(b.name))
      )
      cancelEdit()
      router.refresh()
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Failed to update company'
      )
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDeleteCompany(company: Company) {
    const shouldDelete = window.confirm(
      `Delete "${company.name}"? This removes all document assignments to it.`
    )
    if (!shouldDelete) return

    setError(null)
    setIsSaving(true)
    try {
      const response = await fetch(`/api/companies/${company.id}`, {
        method: 'DELETE',
      })

      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Failed to delete company')

      setCompanies((prev) => prev.filter((row) => row.id !== company.id))
      if (editingCompanyId === company.id) cancelEdit()
      router.refresh()
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Failed to delete company'
      )
    } finally {
      setIsSaving(false)
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (mode === 'create') {
      void handleCreateCompany()
      return
    }
    void handleUpdateCompany()
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label
              htmlFor="company-name"
              className="block text-sm font-medium text-gray-700"
            >
              {mode === 'create' ? 'New company name' : 'Edit company name'}
            </label>
            <input
              id="company-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Acme Inc."
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              disabled={isSaving}
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isSaving || !name.trim()}
              className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {mode === 'create' ? 'Add Company' : 'Save Changes'}
            </button>
            {mode === 'edit' && (
              <button
                type="button"
                onClick={cancelEdit}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
        {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
      </form>

      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  Slug
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  Created
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {companies.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-6 text-center text-sm text-gray-500"
                  >
                    No companies yet.
                  </td>
                </tr>
              )}
              {companies.map((company) => (
                <tr key={company.id} className="border-b border-gray-100 last:border-b-0">
                  <td className="px-4 py-3 text-sm text-gray-900">{company.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{company.slug}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {new Date(company.created_at).toLocaleDateString('en-US')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Link
                        href={`/admin/companies/${company.slug}/members`}
                        className="rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                      >
                        Members
                      </Link>
                      <button
                        type="button"
                        onClick={() => startEdit(company)}
                        className="rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteCompany(company)}
                        className="rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
