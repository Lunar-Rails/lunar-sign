'use client'

import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useDocumentSidebar } from '@/lib/document-sidebar-context'
import DocumentTypeInlineEditor from '@/components/DocumentTypeInlineEditor'
import DocumentCompaniesEditor from '@/components/DocumentCompaniesEditor'
import { SidebarNav, type SidebarNavItem, type SidebarNavGroup } from '@/components/SidebarNav'
import { SidebarStatGrid, type StatItem } from '@/components/SidebarStatGrid'

interface CompanySidebarItem {
  id: string
  name: string
  slug: string
  documentCount: number
}

interface StatusCounts {
  draft: number
  pending: number
  completed: number
}

interface AdminStats {
  userCount: number
  companyCount: number
}

interface CompanySidebarClientProps {
  companies: CompanySidebarItem[]
  totalDocumentCount: number
  statusCounts: StatusCounts
  adminStats: AdminStats
}

export default function CompanySidebarClient({
  companies,
  totalDocumentCount,
  statusCounts,
  adminStats,
}: CompanySidebarClientProps) {
  const pathname = usePathname()
  const isAdmin = pathname.startsWith('/admin')

  const { data: docData } = useDocumentSidebar()

  const overviewItem: SidebarNavItem = {
    href: '/dashboard',
    kicker: 'ALL',
    label: 'All Documents',
    count: totalDocumentCount,
  }

  const companyGroups: SidebarNavGroup[] = companies.length > 0
    ? [{
        title: 'Companies',
        items: companies.map((c) => ({
          href: `/dashboard?company=${c.slug}`,
          kicker: 'COMPANY',
          label: c.name,
          count: c.documentCount,
        })),
      }]
    : []

  const statusStats: StatItem[] = [
    { label: 'Draft', count: statusCounts.draft, color: 'muted' },
    { label: 'Pending', count: statusCounts.pending, color: 'warning' },
    { label: 'Done', count: statusCounts.completed, color: 'cyan' },
  ]

  const adminSystemStats: StatItem[] = [
    { label: 'Users', count: adminStats.userCount, color: 'cyan' },
    { label: 'Companies', count: adminStats.companyCount, color: 'warning' },
  ]

  return (
    <aside className="hidden lg:block w-[220px] shrink-0 sticky top-[88px] self-start max-h-[calc(100vh-104px)] overflow-y-auto">
      <div className="rounded-lr-lg bg-lr-surface border border-lr-border p-3 space-y-0.5">

        {/* Zone 1: Navigation */}
        <SidebarNav overviewItem={overviewItem} groups={companyGroups} />

        {/* Zone 2: Stat widget */}
        <div className="border-t border-lr-border mt-2 pt-2">
          {isAdmin
            ? <SidebarStatGrid title="System" stats={adminSystemStats} />
            : <SidebarStatGrid title="Status" stats={statusStats} />
          }
        </div>

        {/* Zone 3: Document-specific widgets (only on /documents/[id]) */}
        {docData && (
          <>
            <div className="border-t border-lr-border mt-2 pt-2">
              <div className="bg-lr-surface-2 rounded-lr p-3 space-y-2">
                <p className="text-section-label">Details</p>
                <div className="space-y-2 pt-0.5">
                  <DetailRow label="Type">
                    <DocumentTypeInlineEditor
                      documentId={docData.documentId}
                      initialTypeNames={docData.assignedTypes.map((t) => t.name)}
                      availableTypeNames={docData.allDocumentTypeNames}
                      isCompact
                    />
                  </DetailRow>
                  <DetailRow label="Companies">
                    <DocumentCompaniesEditor
                      documentId={docData.documentId}
                      companies={docData.allCompanies}
                      selectedCompanyIds={docData.assignedCompanyIds}
                    />
                  </DetailRow>
                  <DetailRow label="Created">
                    <span className="text-caption">
                      {new Date(docData.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </DetailRow>
                  {docData.completedAt && (
                    <DetailRow label="Completed">
                      <span className="text-caption">
                        {new Date(docData.completedAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    </DetailRow>
                  )}
                </div>
              </div>
            </div>

            <div className="border-t border-lr-border mt-2 pt-2">
              <div className="bg-lr-surface-2 rounded-lr p-3">
                <p className="text-section-label mb-2">Activity</p>
                {docData.auditLogs.length === 0 ? (
                  <p className="text-caption">No activity yet.</p>
                ) : (
                  <div className="max-h-[280px] overflow-y-auto space-y-0">
                    {docData.auditLogs.map((log, index) => {
                      const actorLine = getActorLine(log)
                      return (
                        <div key={log.id} className="flex gap-2">
                          <div className="flex flex-col items-center pt-1">
                            <div className={cn('h-2 w-2 shrink-0 rounded-full', getDotClass(log.action))} />
                            {index < docData.auditLogs.length - 1 && (
                              <div className="mt-0.5 flex-1 w-px bg-lr-border" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1 pb-2.5">
                            <p className="text-caption font-medium text-lr-text leading-tight">
                              {getActionLabel(log.action)}
                            </p>
                            <p className="text-caption leading-tight mt-0.5">
                              {actorLine && <span>{actorLine} · </span>}
                              {new Date(log.created_at).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                              })}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </aside>
  )
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-section-label">{label}</span>
      <div className="min-w-0">{children}</div>
    </div>
  )
}

function getActionLabel(action: string): string {
  const labels: Record<string, string> = {
    document_uploaded: 'Uploaded',
    signer_added: 'Signer added',
    signer_removed: 'Signer removed',
    document_sent: 'Sent for signing',
    document_signed: 'Signed',
    document_viewed: 'Viewed',
    document_completed: 'Completed',
    document_cancelled: 'Cancelled',
  }
  return labels[action] || action.replace(/_/g, ' ')
}

function getDotClass(action: string): string {
  switch (action) {
    case 'document_uploaded':
    case 'document_sent':
      return 'bg-lr-accent'
    case 'signer_added':
    case 'signer_removed':
      return 'bg-lr-accent-soft'
    case 'document_signed':
    case 'document_completed':
      return 'bg-lr-cyan'
    case 'document_cancelled':
      return 'bg-lr-error'
    default:
      return 'bg-lr-muted'
  }
}

function getActorLine(log: {
  actor?: { full_name?: string; email?: string } | null
  metadata?: Record<string, unknown>
}): string | null {
  const name = log.actor?.full_name?.trim()
  if (name) return name
  if (log.actor?.email) return log.actor.email
  const signerEmail = log.metadata?.signer_email
  if (typeof signerEmail === 'string' && signerEmail) return signerEmail
  return null
}
