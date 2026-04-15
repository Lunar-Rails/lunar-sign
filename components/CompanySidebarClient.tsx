'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useDocumentSidebar } from '@/lib/document-sidebar-context'
import { useTemplateSidebar } from '@/lib/template-sidebar-context'
import { useTemplateEditorSidebar } from '@/lib/template-editor-sidebar-context'
import DocumentTypeInlineEditor from '@/components/DocumentTypeInlineEditor'
import DocumentCompaniesEditor from '@/components/DocumentCompaniesEditor'
import { SidebarNav, type SidebarNavItem, type SidebarNavGroup } from '@/components/SidebarNav'
import { SidebarStatGrid, type StatItem } from '@/components/SidebarStatGrid'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface CompanySidebarItem {
  id: string
  name: string
  slug: string
  documentCount: number
  templateCount: number
}

interface StatusCounts {
  draft: number
  pending: number
  completed: number
}

interface TemplateStatusCounts {
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
  totalTemplateCount: number
  statusCounts: StatusCounts
  templateStatusCounts: TemplateStatusCounts
  adminStats: AdminStats
}

export default function CompanySidebarClient({
  companies,
  totalDocumentCount,
  totalTemplateCount,
  statusCounts,
  templateStatusCounts,
  adminStats,
}: CompanySidebarClientProps) {
  const pathname = usePathname()
  const isAdmin = pathname.startsWith('/admin')
  const inDocuments =
    pathname === '/documents' || pathname.startsWith('/documents/')
  const inTemplates =
    pathname === '/templates' || pathname.startsWith('/templates/')

  const { data: docData } = useDocumentSidebar()
  const { data: templateData } = useTemplateSidebar()
  const { data: editorData } = useTemplateEditorSidebar()

  const overviewItem: SidebarNavItem = {
    href: '/documents',
    kicker: 'ALL',
    label: 'All Documents',
    count: totalDocumentCount,
  }

  const companyGroups: SidebarNavGroup[] = companies.length > 0
    ? [{
        title: 'Companies',
        items: companies.map((c) => ({
          href: `/documents?company=${c.slug}`,
          kicker: 'COMPANY',
          label: c.name,
          count: c.documentCount,
        })),
      }]
    : []

  const documentStatusStats: StatItem[] = [
    { label: 'Draft', count: statusCounts.draft, color: 'muted' },
    { label: 'Pending', count: statusCounts.pending, color: 'warning' },
    { label: 'Done', count: statusCounts.completed, color: 'cyan' },
  ]

  const templateStatusStats: StatItem[] = [
    { label: 'Draft', count: templateStatusCounts.draft, color: 'muted' },
    { label: 'Pending', count: templateStatusCounts.pending, color: 'warning' },
    { label: 'Done', count: templateStatusCounts.completed, color: 'cyan' },
  ]

  const adminSystemStats: StatItem[] = [
    { label: 'Users', count: adminStats.userCount, color: 'cyan' },
    { label: 'Companies', count: adminStats.companyCount, color: 'warning' },
  ]

  return (
    <aside className="hidden lg:block w-[220px] shrink-0 sticky top-[88px] self-start max-h-[calc(100vh-104px)] overflow-y-auto">
      <div className="rounded-lr-lg bg-lr-surface border border-lr-border p-3 space-y-0.5">

        {inDocuments && (
          <SidebarNav overviewItem={overviewItem} groups={companyGroups} />
        )}

        {inTemplates && (
          <TemplatesSidebarNav
            companies={companies}
            totalTemplateCount={totalTemplateCount}
          />
        )}

        {/* Zone 2: Stat widget */}
        <div className="border-t border-lr-border mt-2 pt-2">
          {isAdmin ? (
            <SidebarStatGrid title="System" stats={adminSystemStats} />
          ) : inTemplates ? (
            <SidebarStatGrid title="Status" stats={templateStatusStats} />
          ) : (
            <SidebarStatGrid title="Status" stats={documentStatusStats} />
          )}
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

        {/* Zone 3b: Template editor (only when TemplateFieldEditor is mounted) */}
        {editorData && (
          <div className="border-t border-lr-border mt-2 pt-2">
            <div className="bg-lr-surface-2 rounded-lr p-3 space-y-3">
              <p className="text-section-label">Template</p>
              <div className="space-y-2.5">
                <div className="flex flex-col gap-0.5">
                  <span className="text-section-label">Title *</span>
                  <Input
                    value={editorData.title}
                    onChange={(e) => editorData.setTitle(e.target.value)}
                    placeholder="Template title"
                    className="mt-0.5 h-8 text-caption bg-lr-bg border-lr-border"
                  />
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-section-label">Description</span>
                  <Textarea
                    value={editorData.description}
                    onChange={(e) => editorData.setDescription(e.target.value)}
                    placeholder="Optional description"
                    rows={2}
                    className="mt-0.5 text-caption bg-lr-bg border-lr-border resize-none"
                  />
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-section-label">Document type</span>
                  <Select
                    value={editorData.documentTypeId ?? '__none__'}
                    onValueChange={(v) => editorData.setDocumentTypeId(v === '__none__' ? null : v)}
                  >
                    <SelectTrigger className="mt-0.5 h-8 text-caption border-lr-border bg-lr-bg">
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {editorData.documentTypes.map((dt) => (
                        <SelectItem key={dt.id} value={dt.id}>
                          {dt.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {editorData.companies.length > 0 && (
                  <div className="flex flex-col gap-0.5">
                    <span className="text-section-label">Companies</span>
                    <div className="mt-0.5 space-y-1.5">
                      {editorData.companies.map((c) => (
                        <label
                          key={c.id}
                          className="flex cursor-pointer items-center gap-2 text-caption"
                        >
                          <input
                            type="checkbox"
                            checked={editorData.selectedCompanyIds.includes(c.id)}
                            onChange={() => editorData.onCompanyToggle(c.id)}
                            className="h-3.5 w-3.5 rounded border-lr-border accent-lr-accent"
                          />
                          {c.name}
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Zone 3b: Template detail (only on /templates/[id] when setter runs) */}
        {templateData && !editorData && (
          <div className="border-t border-lr-border mt-2 pt-2">
            <div className="bg-lr-surface-2 rounded-lr p-3 space-y-2">
              <p className="text-section-label">Template</p>
              <div className="space-y-2 pt-0.5">
                <DetailRow label="Type">
                  <span className="text-caption">
                    {templateData.documentTypeName ?? (
                      <span className="text-lr-muted">None</span>
                    )}
                  </span>
                </DetailRow>
                <DetailRow label="Companies">
                  <span className="text-caption">
                    {templateData.companyNames.length > 0
                      ? templateData.companyNames.join(', ')
                      : <span className="text-lr-muted">None</span>}
                  </span>
                </DetailRow>
                <DetailRow label="Created">
                  <span className="text-caption">
                    {new Date(templateData.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </DetailRow>
                <DetailRow label="Documents">
                  <span className="text-caption">{templateData.documentsCount}</span>
                </DetailRow>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}

function TemplatesSidebarNav({
  companies,
  totalTemplateCount,
}: {
  companies: CompanySidebarItem[]
  totalTemplateCount: number
}) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const activeCompany = searchParams.get('company')
  const inTemplates = pathname === '/templates' || pathname.startsWith('/templates/')

  const templateCompanyGroups: SidebarNavGroup[] = companies.length > 0
    ? [{
        title: 'Companies',
        items: companies.map((c) => ({
          href: `/templates?company=${c.slug}`,
          kicker: 'COMPANY',
          label: c.name,
          count: c.templateCount,
        })),
      }]
    : []

  const overviewItem: SidebarNavItem = {
    href: '/templates',
    kicker: 'ALL',
    label: 'All Templates',
    count: totalTemplateCount,
  }

  function isTemplateItemActive(item: SidebarNavItem): boolean {
    if (item.href === '/templates') return inTemplates && !activeCompany
    const url = new URL(item.href, 'http://x')
    const company = url.searchParams.get('company')
    return inTemplates && activeCompany === company
  }

  return (
    <div>
      <p className="text-section-label px-3 pb-1">Templates</p>
      <div className="space-y-0.5">
        <TemplateNavRow item={overviewItem} active={isTemplateItemActive(overviewItem)} />
        {templateCompanyGroups.map((group) => (
          <div key={group.title}>
            <div className="pt-1 pb-0.5 px-3">
              <p className="text-section-label">{group.title}</p>
            </div>
            {group.items.map((item) => (
              <TemplateNavRow key={item.href} item={item} active={isTemplateItemActive(item)} />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

function TemplateNavRow({ item, active }: { item: SidebarNavItem; active: boolean }) {
  return (
    <Link
      href={item.href}
      className={cn(
        'flex items-center justify-between rounded-lr px-3 py-1.5 transition-colors duration-lr-fast group',
        active
          ? 'bg-gradient-to-br from-lr-accent to-lr-accent-hover text-white'
          : 'hover:bg-lr-surface-2'
      )}
    >
      <div className="flex flex-col min-w-0">
        <span className={cn('text-section-label truncate', active && 'text-white/70')}>
          {item.kicker}
        </span>
        <span
          className={cn(
            'text-item-label truncate',
            active ? 'text-white' : 'text-lr-text-2 group-hover:text-lr-text'
          )}
        >
          {item.label}
        </span>
      </div>
      <span className={cn('text-caption shrink-0 ml-2', active ? 'text-white/70' : '')}>
        {item.count}
      </span>
    </Link>
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
    document_fields_updated: 'Fields saved',
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
