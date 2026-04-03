'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface SigningInterfaceProps {
  token: string
  signerName: string
  signerEmail: string
  documentTitle: string
  pdfBase64: string
}

type SignatureTab = 'draw' | 'type' | 'upload'

export default function SigningInterface({
  token,
  signerName,
  signerEmail,
  documentTitle,
  pdfBase64,
}: SigningInterfaceProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<SignatureTab>('draw')
  const [fullName, setFullName] = useState(signerName)
  const [signatureData, setSignatureData] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [typedText, setTypedText] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size and background
    canvas.width = canvas.offsetWidth
    canvas.height = canvas.offsetHeight
    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.strokeStyle = '#000000'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }, [])

  // Canvas drawing handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    setIsDrawing(true)
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.beginPath()
      ctx.moveTo(x, y)
    }
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.lineTo(x, y)
      ctx.stroke()
    }
  }

  const stopDrawing = () => {
    setIsDrawing(false)
  }

  // Clear canvas
  const clearCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.fillStyle = 'white'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    }
    setSignatureData(null)
  }

  // Export canvas as base64
  const exportCanvasSignature = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const data = canvas.toDataURL('image/png')
    setSignatureData(data)
  }

  // Handle typed signature
  const handleTypeTab = () => {
    if (typedText) {
      // Create canvas for typed signature
      const canvas = document.createElement('canvas')
      canvas.width = 400
      canvas.height = 150
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      ctx.fillStyle = 'white'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.font = 'italic 48px cursive'
      ctx.fillStyle = '#000000'
      ctx.textBaseline = 'middle'
      ctx.fillText(typedText, 20, 75)

      setSignatureData(canvas.toDataURL('image/png'))
    }
  }

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const data = event.target?.result as string
      setSignatureData(data)
    }
    reader.readAsDataURL(file)
  }

  // Get current signature data based on active tab
  const getCurrentSignatureData = (): string | null => {
    if (activeTab === 'draw') {
      exportCanvasSignature()
      const canvas = canvasRef.current
      if (!canvas) return null
      return canvas.toDataURL('image/png')
    } else if (activeTab === 'type') {
      handleTypeTab()
      return signatureData
    }
    return signatureData
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const currentSigData = getCurrentSignatureData()
    if (!currentSigData) {
      alert('Please provide a signature')
      return
    }

    if (!fullName.trim()) {
      alert('Please enter your full name')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/signatures', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          signature_data: currentSigData,
          signer_name: fullName,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to sign document')
      }

      const result = await response.json()
      setSuccess(true)

      // Redirect after 3 seconds
      setTimeout(() => {
        if (result.data?.completed) {
          router.push(`/download/${token}`)
        }
      }, 3000)
    } catch (error) {
      console.error('Signing error:', error)
      alert(
        error instanceof Error
          ? error.message
          : 'Failed to sign document. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-8 text-center shadow-sm">
          <div className="mb-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <svg
                className="h-6 w-6 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          </div>

          <h2 className="mb-2 text-lg font-semibold text-gray-900">
            Successfully Signed
          </h2>
          <p className="text-sm text-gray-600">
            You have successfully signed <strong>{documentTitle}</strong>.
          </p>
          <p className="mt-4 text-xs text-gray-500">
            Redirecting to document download...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-2xl font-bold text-gray-900">{documentTitle}</h1>
          <p className="mt-1 text-sm text-gray-600">
            Signing as: <strong>{signerName}</strong> ({signerEmail})
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 px-6 py-8">
        <div className="mx-auto max-w-4xl">
          <div className="grid gap-8 lg:grid-cols-2">
            {/* PDF Preview */}
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 font-semibold text-gray-900">
                Document Preview
              </h2>
              <iframe
                srcDoc={`<!DOCTYPE html>
<html>
<body style="margin: 0; padding: 0; overflow: auto;">
<embed src="data:application/pdf;base64,${pdfBase64}" type="application/pdf" width="100%" height="500px" />
</body>
</html>`}
                className="h-96 w-full rounded border border-gray-200"
              />
            </div>

            {/* Signature Form */}
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Full Name */}
                <div>
                  <label
                    htmlFor="fullName"
                    className="block text-sm font-medium text-gray-900"
                  >
                    Full Name
                  </label>
                  <input
                    type="text"
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {/* Signature Tabs */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-3">
                    Your Signature
                  </label>

                  {/* Tab Navigation */}
                  <div className="flex gap-2 border-b border-gray-200">
                    {(['draw', 'type', 'upload'] as const).map((tab) => (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => {
                          setActiveTab(tab)
                          setSignatureData(null)
                        }}
                        className={`pb-2 text-sm font-medium ${
                          activeTab === tab
                            ? 'border-b-2 border-blue-600 text-blue-600'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                      </button>
                    ))}
                  </div>

                  {/* Tab Content */}
                  <div className="mt-4">
                    {activeTab === 'draw' && (
                      <div className="space-y-3">
                        <canvas
                          ref={canvasRef}
                          onMouseDown={startDrawing}
                          onMouseMove={draw}
                          onMouseUp={stopDrawing}
                          onMouseLeave={stopDrawing}
                          className="w-full border border-gray-300 rounded-lg bg-white cursor-crosshair"
                          style={{ height: '200px' }}
                        />
                        <button
                          type="button"
                          onClick={clearCanvas}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                          Clear
                        </button>
                      </div>
                    )}

                    {activeTab === 'type' && (
                      <div className="space-y-3">
                        <input
                          type="text"
                          value={typedText}
                          onChange={(e) => setTypedText(e.target.value)}
                          placeholder="Type your name"
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        {typedText && (
                          <div
                            style={{
                              fontFamily: 'cursive',
                              fontSize: '48px',
                              fontStyle: 'italic',
                              textAlign: 'center',
                              padding: '20px',
                              border: '1px solid #e5e7eb',
                              borderRadius: '8px',
                              backgroundColor: '#fafafa',
                            }}
                          >
                            {typedText}
                          </div>
                        )}
                      </div>
                    )}

                    {activeTab === 'upload' && (
                      <div className="space-y-3">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleFileUpload}
                          className="block w-full text-sm text-gray-600"
                        />
                        {signatureData && (
                          <div className="flex justify-center rounded-lg border border-gray-200 bg-gray-50 p-4">
                            <img
                              src={signatureData}
                              alt="Signature preview"
                              className="max-h-24"
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {loading ? 'Signing...' : 'Sign Document'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
