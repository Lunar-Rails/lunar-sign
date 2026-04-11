import Link from 'next/link'
import { FileQuestion } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-lr-bg px-4">
      <div className="w-full max-w-sm text-center">
        <FileQuestion className="mx-auto h-12 w-12 text-lr-muted" />
        <h2 className="mt-4 font-display text-lr-2xl font-semibold text-lr-text">Page Not Found</h2>
        <p className="mt-2 text-lr-sm text-lr-muted">
          The page you are looking for does not exist or has been moved.
        </p>
        <Button asChild className="mt-6">
          <Link href="/dashboard">Back to Dashboard</Link>
        </Button>
      </div>
    </div>
  )
}
