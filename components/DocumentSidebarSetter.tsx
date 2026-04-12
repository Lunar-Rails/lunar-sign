'use client'

import { useEffect } from 'react'
import { useDocumentSidebar, type DocumentSidebarData } from '@/lib/document-sidebar-context'

export function DocumentSidebarSetter({ data }: { data: DocumentSidebarData }) {
  const { setData } = useDocumentSidebar()

  useEffect(() => {
    setData(data)
    return () => setData(null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.documentId])

  return null
}
