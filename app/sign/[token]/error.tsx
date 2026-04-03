'use client'

export default function SigningError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-8 text-center shadow-sm">
        <div className="mb-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <svg
              className="h-6 w-6 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4v2m0 0v2m0-6v-2m0 0V7a2 2 0 012-2h.5a.5.5 0 00-.5-.5v1.5a6 6 0 016 6h.5"
              />
            </svg>
          </div>
        </div>

        <h2 className="mb-2 text-lg font-semibold text-gray-900">
          Something went wrong
        </h2>
        <p className="mb-6 text-sm text-gray-600">
          An error occurred while processing your signing request. Please try
          again.
        </p>

        <button
          onClick={() => reset()}
          className="inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Try Again
        </button>
      </div>
    </div>
  )
}
