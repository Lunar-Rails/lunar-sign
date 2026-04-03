'use client'

import { useState } from 'react'

export default function AuditLogSearch() {
  const [searchTerm, setSearchTerm] = useState('')

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="mb-4 font-semibold text-gray-900">Search Audit Log</h3>
      <div className="space-y-4">
        <div>
          <label
            htmlFor="search"
            className="block text-sm font-medium text-gray-700"
          >
            Search by action, email, or entity
          </label>
          <input
            type="text"
            id="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="e.g., document_uploaded, user@example.com"
            className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 text-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <p className="text-xs text-gray-600">
          Use the search box to filter audit logs. Currently showing all logs
          ordered by most recent.
        </p>
      </div>
    </div>
  )
}
