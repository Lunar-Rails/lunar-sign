'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Company } from '@/lib/types'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { AlertCircle } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface CompanyManagementTableProps {
  initialCompanies: Company[]
}

type FormMode = 'create' | 'edit'

export default function CompanyManagementTable({ initialCompanies }: CompanyManagementTableProps) {
  const router = useRouter()
  const [companies, setCompanies] = useState<Company[]>(initialCompanies)
  const [name, setName] = useState('')
  const [editingCompanyId, setEditingCompanyId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mode: FormMode = useMemo(() => (editingCompanyId ? 'edit' : 'create'), [editingCompanyId])

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
      setCompanies((prev) => [...prev, payload.data.company].sort((a, b) => a.name.localeCompare(b.name)))
      setName('')
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create company')
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
    if (!editingCompanyId || !name.trim()) return
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
        prev.map((c) => (c.id === editingCompanyId ? payload.data.company : c)).sort((a, b) => a.name.localeCompare(b.name))
      )
      cancelEdit()
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update company')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDeleteCompany(company: Company) {
    if (!window.confirm(`Delete "${company.name}"? This removes all document assignments to it.`)) return
    setError(null)
    setIsSaving(true)
    try {
      const response = await fetch(`/api/companies/${company.id}`, { method: 'DELETE' })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Failed to delete company')
      setCompanies((prev) => prev.filter((r) => r.id !== company.id))
      if (editingCompanyId === company.id) cancelEdit()
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete company')
    } finally {
      setIsSaving(false)
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (mode === 'create') { void handleCreateCompany(); return }
    void handleUpdateCompany()
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="rounded-lr-lg border border-lr-border bg-lr-surface p-5 shadow-lr-card">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Label htmlFor="company-name">
              {mode === 'create' ? 'New company name' : 'Edit company name'}
            </Label>
            <Input
              id="company-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Acme Inc."
              disabled={isSaving}
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={isSaving || !name.trim()}>
              {mode === 'create' ? 'Add Company' : 'Save Changes'}
            </Button>
            {mode === 'edit' && (
              <Button type="button" variant="secondary" onClick={cancelEdit}>
                Cancel
              </Button>
            )}
          </div>
        </div>
        {error && (
          <div className="mt-3 flex items-center gap-2 text-lr-xs text-lr-error">
            <AlertCircle className="h-3.5 w-3.5" />
            {error}
          </div>
        )}
      </form>

      <div className="rounded-lr-lg border border-lr-border bg-lr-surface shadow-lr-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {companies.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-lr-muted py-8">
                  No companies yet.
                </TableCell>
              </TableRow>
            )}
            {companies.map((company) => (
              <TableRow key={company.id}>
                <TableCell className="font-medium text-lr-text">{company.name}</TableCell>
                <TableCell className="font-mono text-lr-xs text-lr-muted">{company.slug}</TableCell>
                <TableCell className="text-lr-muted">
                  {new Date(company.created_at).toLocaleDateString('en-US')}
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-2">
                    <Button asChild variant="secondary" size="sm">
                      <Link href={`/admin/companies/${company.slug}/members`}>Members</Link>
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => startEdit(company)}>
                      Edit
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDeleteCompany(company)}>
                      Delete
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
