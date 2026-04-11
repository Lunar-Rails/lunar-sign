import { getServiceClient } from '@/lib/supabase/service'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export const dynamic = 'force-dynamic'

interface AdminDocumentRow {
  id: string
  title: string
  status: string
  created_at: string
  uploaded_by: string
  profiles?: { email: string; full_name: string } | { email: string; full_name: string }[] | null
}

function profileFromDoc(doc: AdminDocumentRow) {
  const p = doc.profiles
  if (!p) return undefined
  return Array.isArray(p) ? p[0] : p
}

type StatusVariant = 'secondary' | 'warning' | 'success' | 'destructive'

function docStatusVariant(status: string): StatusVariant {
  switch (status) {
    case 'draft': return 'secondary'
    case 'pending': return 'warning'
    case 'completed': return 'success'
    default: return 'destructive'
  }
}

export default async function AdminDocumentsPage() {
  const supabase = getServiceClient()

  const { data: documentsData } = await supabase
    .from('documents')
    .select('id, title, status, created_at, uploaded_by, profiles:uploaded_by(email, full_name)')
    .order('created_at', { ascending: false })

  const documents = (documentsData ?? []) as AdminDocumentRow[]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-lr-3xl font-bold text-lr-text">All Documents</h1>
        <p className="mt-1 text-lr-sm text-lr-muted">View all documents across the system.</p>
      </div>

      <div className="rounded-lr-lg border border-lr-border bg-lr-surface shadow-lr-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created At</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {documents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-lr-muted py-8">
                  No documents found
                </TableCell>
              </TableRow>
            ) : (
              documents.map((doc) => {
                const profile = profileFromDoc(doc)
                return (
                  <TableRow key={doc.id}>
                    <TableCell className="font-medium text-lr-text">{doc.title}</TableCell>
                    <TableCell>
                      <div className="text-lr-sm text-lr-text-2">{profile?.full_name}</div>
                      <div className="text-lr-xs text-lr-muted">{profile?.email}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={docStatusVariant(doc.status)}>
                        {doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-lr-muted">
                      {new Date(doc.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="secondary" size="sm">
                        <Link href={`/admin/documents/${doc.id}`}>View</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
