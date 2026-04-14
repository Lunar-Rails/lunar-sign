'use client'

import { createContext, useCallback, useContext, useState } from 'react'
import type { DocumentType } from '@/lib/types'

export interface Company {
  id: string
  name: string
}

export interface TemplateEditorSidebarData {
  title: string
  setTitle: (v: string) => void
  description: string
  setDescription: (v: string) => void
  documentTypeId: string | null
  setDocumentTypeId: (v: string | null) => void
  documentTypes: DocumentType[]
  companies: Company[]
  selectedCompanyIds: string[]
  onCompanyToggle: (id: string) => void
}

interface TemplateEditorSidebarContextValue {
  data: TemplateEditorSidebarData | null
  setData: (data: TemplateEditorSidebarData | null) => void
}

const TemplateEditorSidebarContext = createContext<TemplateEditorSidebarContextValue>({
  data: null,
  setData: () => {},
})

export function TemplateEditorSidebarProvider({ children }: { children: React.ReactNode }) {
  const [data, setDataState] = useState<TemplateEditorSidebarData | null>(null)

  const setData = useCallback((next: TemplateEditorSidebarData | null) => {
    setDataState(next)
  }, [])

  return (
    <TemplateEditorSidebarContext.Provider value={{ data, setData }}>
      {children}
    </TemplateEditorSidebarContext.Provider>
  )
}

export function useTemplateEditorSidebar() {
  return useContext(TemplateEditorSidebarContext)
}
