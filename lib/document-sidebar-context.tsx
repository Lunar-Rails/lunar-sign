'use client'

import { createContext, useContext, useState, useCallback } from 'react'
import type { AuditLogWithActor, Company, DocumentType, DocumentStatus } from '@/lib/types'

export interface DocumentSidebarData {
  documentId: string
  documentStatus: DocumentStatus
  assignedTypes: Pick<DocumentType, 'id' | 'name'>[]
  allDocumentTypeNames: string[]
  assignedCompanies: Pick<Company, 'id' | 'name' | 'slug'>[]
  allCompanies: Company[]
  assignedCompanyIds: string[]
  createdAt: string
  completedAt: string | null
  auditLogs: AuditLogWithActor[]
}

interface DocumentSidebarContextValue {
  data: DocumentSidebarData | null
  setData: (data: DocumentSidebarData | null) => void
}

const DocumentSidebarContext = createContext<DocumentSidebarContextValue>({
  data: null,
  setData: () => {},
})

export function DocumentSidebarProvider({ children }: { children: React.ReactNode }) {
  const [data, setDataState] = useState<DocumentSidebarData | null>(null)

  const setData = useCallback((next: DocumentSidebarData | null) => {
    setDataState(next)
  }, [])

  return (
    <DocumentSidebarContext.Provider value={{ data, setData }}>
      {children}
    </DocumentSidebarContext.Provider>
  )
}

export function useDocumentSidebar() {
  return useContext(DocumentSidebarContext)
}
