'use client'

import { useEffect } from 'react'
import { useTemplateSidebar, type TemplateSidebarData } from '@/lib/template-sidebar-context'

export function TemplateSidebarSetter({ data }: { data: TemplateSidebarData }) {
  const { setData } = useTemplateSidebar()

  useEffect(() => {
    setData(data)
    return () => setData(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.templateId])

  return null
}
