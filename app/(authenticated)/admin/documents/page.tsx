import { getServiceClient } from '@/lib/supabase/service'

import { Document } from '@/lib/types'

import Link from 'next/link'

export const dynamic = 'force-dynamic'


export default async function AdminDocumentsPage() {
  const supabase = getServiceClient()

  // Fetch all documents with owner info
  const { data: documentsData } = await supabase
    .from('documents')
    .select(
      `
      id,
      title,
      status,
      created_at,
      uploaded_by,
      profiles:uploaded_by(email, full_name)
    `
    )
    .order('created_at', { ascending: false })

  const documents = (documentsData as any[]) || []

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">All Documents</h1>
        <p className="mt-2 text-gray-600">
          View all documents across the system.
        </p>
      </div>

      {/* Documents Table */}
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                Title
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                Owner
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                Status
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                Created At
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {documents.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-gray-600">
                  No documents found
                </td>
              </tr>
            ) : (
              documents.map((doc: any) => (
                <tr
                  key={doc.id}
                  className="border-b border-gray-200 hover:bg-gray-50"
                >
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {doc.title}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    <div>{doc.profiles?.full_name}</div>
                    <div className="text-xs text-gray-500">
                      {doc.profiles?.email}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        doc.status === 'draft'
                          ? 'bg-gray-100 text-gray-800'
                          : doc.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : doc.status === 'completed'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {new Date(doc.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <Link
                      href={`/admin/documents/${doc.id}`}
                      className="text-blue-600 hover:text-blue-700 font-medium"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
