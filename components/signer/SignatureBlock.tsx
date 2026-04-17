'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useSignatureRenderer, loadSignatureFont, SignaturePad } from '@drvillo/react-browser-e-signing'
import type { SignatureStyle } from '@drvillo/react-browser-e-signing'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

const SIGNATURE_FONT = 'Homemade Apple'

interface SignatureBlockProps {
  displayName: string
  onSignatureDataUrl: (dataUrl: string | null) => void
}

export function SignatureBlock({ displayName, onSignatureDataUrl }: SignatureBlockProps) {
  const [mode, setMode] = useState<'typed' | 'drawn'>('typed')
  const [drawnDataUrl, setDrawnDataUrl] = useState<string | null>(null)

  useEffect(() => {
    void loadSignatureFont(SIGNATURE_FONT)
  }, [])

  // Stable references prevent useSignatureRenderer's effect from refiring on
  // every parent render (which would cascade into a render loop via the
  // onSignatureDataUrl callback below).
  const style = useMemo<SignatureStyle>(
    () =>
      mode === 'typed'
        ? { mode: 'typed', fontFamily: SIGNATURE_FONT }
        : { mode: 'drawn', dataUrl: drawnDataUrl ?? '' },
    [mode, drawnDataUrl]
  )

  const { signatureDataUrl, isRendering } = useSignatureRenderer({
    signerName: displayName,
    style,
  })

  const activeDataUrl = mode === 'typed' ? signatureDataUrl : drawnDataUrl

  const lastSentRef = useRef<string | null | undefined>(undefined)
  useEffect(() => {
    if (lastSentRef.current === activeDataUrl) return
    lastSentRef.current = activeDataUrl
    onSignatureDataUrl(activeDataUrl)
  }, [activeDataUrl, onSignatureDataUrl])

  function handleDrawn(dataUrl: string) {
    setDrawnDataUrl(dataUrl)
  }

  return (
    <div>
      <p className="text-section-label mb-2">Your signature</p>
      <p className="text-caption text-lr-muted mb-3">
        This will appear on the signed document.
      </p>

      <Tabs value={mode} onValueChange={(v) => setMode(v as 'typed' | 'drawn')}>
        <TabsList className="mb-3 w-full">
          <TabsTrigger value="typed" className="flex-1">Type</TabsTrigger>
          <TabsTrigger value="drawn" className="flex-1">Draw</TabsTrigger>
        </TabsList>

        <TabsContent value="typed">
          <div className="min-h-24 rounded-lr border border-lr-border bg-lr-bg/60 p-4 flex items-center justify-center">
            {isRendering ? (
              <span className="text-caption text-lr-muted">Rendering…</span>
            ) : signatureDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={signatureDataUrl}
                alt="Signature preview"
                className="max-h-16 max-w-full object-contain"
              />
            ) : (
              <span className="text-caption text-lr-muted">
                {displayName ? 'Generating preview…' : 'Enter your name to preview'}
              </span>
            )}
          </div>
        </TabsContent>

        <TabsContent value="drawn">
          <SignaturePad onDrawn={handleDrawn} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
