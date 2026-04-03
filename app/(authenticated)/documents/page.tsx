import { redirect } from 'next/navigation'

interface DocumentsIndexPageProps {
  searchParams: Promise<{ company?: string }>
}

export default async function DocumentsIndexPage({
  searchParams,
}: DocumentsIndexPageProps) {
  const { company } = await searchParams
  const suffix =
    typeof company === 'string' && company
      ? `?company=${encodeURIComponent(company)}`
      : ''
  redirect(`/dashboard${suffix}`)
}
