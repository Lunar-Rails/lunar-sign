'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body>
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
                    d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>

            <h2 className="mb-2 text-lg font-semibold text-gray-900">
              Something went wrong
            </h2>
            <p className="mb-6 text-sm text-gray-600">
              An unexpected error occurred. Please try again or contact support
              if the problem persists.
            </p>

            {process.env.NODE_ENV === 'development' && error.message && (
              <div className="mb-6 rounded-lg bg-gray-100 p-4 text-left">
                <p className="text-xs font-mono text-gray-600">{error.message}</p>
              </div>
            )}

            <button
              onClick={() => reset()}
              className="inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Try Again
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
