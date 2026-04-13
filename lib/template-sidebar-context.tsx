'use client'

import { createContext, useCallback, useContext, useState } from 'react'

export interface TemplateSidebarData {
  templateId: string
  title: string
  documentTypeName: string | null
  companyNames: string[]
  createdAt: string
  documentsCount: number
}

interface TemplateSidebarContextValue {
  data: TemplateSidebarData | null
  setData: (data: TemplateSidebarData | null) => void
}

const TemplateSidebarContext = createContext<TemplateSidebarContextValue>({
  data: null,
  setData: () => {},
})

export function TemplateSidebarProvider({ children }: { children: React.ReactNode }) {
  const [data, setDataState] = useState<TemplateSidebarData | null>(null)

  const setData = useCallback((next: TemplateSidebarData | null) => {
    setDataState(next)
  }, [])

  return (
    <TemplateSidebarContext.Provider value={{ data, setData }}>
      {children}
    </TemplateSidebarContext.Provider>
  )
}

export function useTemplateSidebar() {
  return useContext(TemplateSidebarContext)
}
