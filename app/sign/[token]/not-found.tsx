import Link from 'next/link'

export default function SigningNotFoundPage() {
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
                d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        </div>

        <h2 className="mb-2 text-lg font-semibold text-gray-900">
          Invalid or Expired Link
        </h2>
        <p className="mb-6 text-sm text-gray-600">
          This signing link is invalid or has expired. Signing links can only
          be used once and may expire if not used within a certain time period.
        </p>

        <p className="text-xs text-gray-500">
          If you believe this is an error, please contact the document owner.
        </p>
      </div>
    </div>
  )
}
