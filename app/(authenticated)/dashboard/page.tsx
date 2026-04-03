import { createClient } from '@/lib/supabase/server'

import { Document } from '@/lib/types'

import DashboardSearch from '@/components/DashboardSearch'

export const dynamic = 'force-dynamic'


export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  // Fetch documents
  const { data: documents } = await supabase
    .from('documents')
    .select('*')
    .eq('uploaded_by', user.id)
    .order('created_at', { ascending: false })

  const docs: Document[] = documents || []

  // Calculate stats
  const totalDocs = docs.length
  const draftCount = docs.filter((d) => d.status === 'draft').length
  const pendingCount = docs.filter((d) => d.status === 'pending').length
  const completedCount = docs.filter((d) => d.status === 'completed').length

  return (
    <div>
      <h1 className="mb-8 text-3xl font-bold text-gray-900">Dashboard</h1>

      {/* Stats Cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-gray-600">Total Documents</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{totalDocs}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-gray-600">Draft</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{draftCount}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-gray-600">Pending</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {pendingCount}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-gray-600">Completed</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {completedCount}
          </p>
        </div>
      </div>

      {/* Documents Section */}
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Documents</h2>
        </div>

        <div className="px-6 py-4">
          <DashboardSearch documents={docs} />
        </div>
      </div>
    </div>
  )
}
