'use client'

import { useState, useMemo } from 'react'
import { Document } from '@/lib/types'
import Link from 'next/link'

interface DashboardSearchProps {
  documents: Document[]
}

function getStatusBadgeStyles(status: string) {
  switch (status) {
    case 'draft':
      return 'inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800'
    case 'pending':
      return 'inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800'
    case 'completed':
      return 'inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800'
    case 'cancelled':
      return 'inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800'
    default:
      return ''
  }
}

export default function DashboardSearch({
  documents,
}: DashboardSearchProps) {
  const [searchTerm, setSearchTerm] = useState('')

  const filteredDocuments = useMemo(() => {
    if (!searchTerm) return documents
    return documents.filter((doc) =>
      doc.title.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [documents, searchTerm])

  if (documents.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-500">No documents yet.</p>
        <Link
          href="/upload"
          className="mt-2 inline-flex items-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
        >
          Upload Your First Document
        </Link>
      </div>
    )
  }

  return (
    <div>
      <input
        type="text"
        placeholder="Search documents by title..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="mb-4 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
      />

      {filteredDocuments.length === 0 ? (
        <p className="py-8 text-center text-gray-500">
          No documents matching "{searchTerm}"
        </p>
      ) : (
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="py-3 text-left text-xs font-medium text-gray-500">
                Title
              </th>
              <th className="py-3 text-left text-xs font-medium text-gray-500">
                Status
              </th>
              <th className="py-3 text-left text-xs font-medium text-gray-500">
                Created
              </th>
              <th className="py-3 text-left text-xs font-medium text-gray-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredDocuments.map((doc) => (
              <tr key={doc.id} className="border-b border-gray-100">
                <td className="py-4 text-sm text-gray-900">{doc.title}</td>
                <td className="py-4 text-sm">
                  <span className={getStatusBadgeStyles(doc.status)}>
                    {doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
                  </span>
                </td>
                <td className="py-4 text-sm text-gray-600">
                  {new Date(doc.created_at).toLocaleDateString()}
                </td>
                <td className="py-4 text-sm">
                  <Link
                    href={`/documents/${doc.id}`}
                    className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
