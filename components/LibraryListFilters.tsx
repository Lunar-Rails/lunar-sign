'use client'

import type { DocumentType } from '@/lib/types'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LibraryListFiltersProps {
  documentTypes: Pick<DocumentType, 'id' | 'name'>[]
  searchTerm: string
  onSearchTermChange: (value: string) => void
  selectedTypeIds: string[]
  onToggleType: (typeId: string) => void
  searchPlaceholder: string
}

export function LibraryListFilters({
  documentTypes,
  searchTerm,
  onSearchTermChange,
  selectedTypeIds,
  onToggleType,
  searchPlaceholder,
}: LibraryListFiltersProps) {
  return (
    <div className="space-y-4">
      {documentTypes.length > 0 && (
        <div>
          <p className="text-section-label mb-2">Filter by type</p>
          <div className="flex flex-wrap gap-2">
            {documentTypes.map((type) => {
              const isSelected = selectedTypeIds.includes(type.id)
              return (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => onToggleType(type.id)}
                  className={cn(
                    'inline-flex h-6 items-center rounded-full px-2.5 text-lr-xs font-medium transition-colors duration-lr-fast',
                    isSelected
                      ? 'bg-lr-accent text-white'
                      : 'bg-transparent border border-lr-border text-lr-muted hover:border-lr-border-2 hover:text-lr-text-2'
                  )}
                >
                  {type.name}
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-lr-muted" />
        <Input
          type="text"
          placeholder={searchPlaceholder}
          value={searchTerm}
          onChange={(e) => onSearchTermChange(e.target.value)}
          className="pl-10"
        />
      </div>
    </div>
  )
}
