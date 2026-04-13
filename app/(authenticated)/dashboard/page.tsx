import { redirect } from 'next/navigation'

interface DashboardRedirectPageProps {
  searchParams: Promise<{ company?: string }>
}

/** Legacy URL: sends users to the documents list. */
export default async function DashboardRedirectPage({
  searchParams,
}: DashboardRedirectPageProps) {
  const { company } = await searchParams
  const suffix =
    typeof company === 'string' && company
      ? `?company=${encodeURIComponent(company)}`
      : ''
  redirect(`/documents${suffix}`)
}
