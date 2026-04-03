import { createClient } from '@/lib/supabase/server'

import { getServiceClient } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'


export default async function AdminDashboardPage() {
  const supabase = await createClient()
  const serviceClient = getServiceClient()

  // Fetch stats using service role for accurate counts
  const { count: userCount } = await serviceClient
    .from('profiles')
    .select('*', { count: 'exact', head: true })

  const { count: documentCount } = await serviceClient
    .from('documents')
    .select('*', { count: 'exact', head: true })

  // Get document counts by status
  const { data: documentsByStatusRaw } = await serviceClient
    .from('documents')
    .select('status')

  const documentsByStatus = (documentsByStatusRaw ?? []) as { status: string }[]

  const statusCounts = {
    draft: documentsByStatus.filter((d) => d.status === 'draft').length,
    pending: documentsByStatus.filter((d) => d.status === 'pending').length,
    completed: documentsByStatus.filter((d) => d.status === 'completed').length,
    cancelled: documentsByStatus.filter((d) => d.status === 'cancelled').length,
  }

  const stats = [
    {
      label: 'Total Users',
      value: userCount || 0,
      color: 'bg-blue-500',
    },
    {
      label: 'Total Documents',
      value: documentCount || 0,
      color: 'bg-green-500',
    },
    {
      label: 'Completed Documents',
      value: statusCounts.completed,
      color: 'bg-emerald-500',
    },
    {
      label: 'Pending Documents',
      value: statusCounts.pending,
      color: 'bg-yellow-500',
    },
  ]

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="mt-2 text-gray-600">
          Overview of system statistics and activity.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {stats.map((stat, index) => (
          <div
            key={index}
            className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                <p className="mt-2 text-3xl font-bold text-gray-900">
                  {stat.value}
                </p>
              </div>
              <div className={`${stat.color} h-12 w-12 rounded-lg opacity-10`} />
            </div>
          </div>
        ))}
      </div>

      {/* Quick Links */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Admin Sections
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <a
            href="/admin/users"
            className="rounded-lg border border-gray-200 p-4 text-center hover:bg-gray-50"
          >
            <div className="mb-2 text-2xl">👥</div>
            <div className="font-medium text-gray-900">Manage Users</div>
            <div className="mt-1 text-xs text-gray-600">
              View and manage user roles
            </div>
          </a>
          <a
            href="/admin/documents"
            className="rounded-lg border border-gray-200 p-4 text-center hover:bg-gray-50"
          >
            <div className="mb-2 text-2xl">📄</div>
            <div className="font-medium text-gray-900">All Documents</div>
            <div className="mt-1 text-xs text-gray-600">
              View all documents across system
            </div>
          </a>
          <a
            href="/admin/audit-log"
            className="rounded-lg border border-gray-200 p-4 text-center hover:bg-gray-50"
          >
            <div className="mb-2 text-2xl">📊</div>
            <div className="font-medium text-gray-900">Audit Log</div>
            <div className="mt-1 text-xs text-gray-600">
              View system audit trail
            </div>
          </a>
          <a
            href="/dashboard"
            className="rounded-lg border border-gray-200 p-4 text-center hover:bg-gray-50"
          >
            <div className="mb-2 text-2xl">←</div>
            <div className="font-medium text-gray-900">Back to Dashboard</div>
            <div className="mt-1 text-xs text-gray-600">
              Return to main dashboard
            </div>
          </a>
        </div>
      </div>
    </div>
  )
}
