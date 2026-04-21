'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { loadSignatureFont, SignaturePad, useSignatureRenderer } from '@drvillo/react-browser-e-signing'
import type { SignatureStyle } from '@drvillo/react-browser-e-signing'
import { SIGNATURE_FONTS } from '@drvillo/react-browser-e-signing'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const DEFAULT_SIGNATURE_FONT = 'Homemade Apple'

export interface SignatureCaptureFormProps {
  displayName: string
  /** Called whenever the effective signature image changes (typed or drawn). */
  onSignatureDataUrl: (dataUrl: string | null) => void
  /** When false, typed tab is disabled until a name is present. */
  showFontPicker?: boolean
  className?: string
}

export function SignatureCaptureForm({
  displayName,
  onSignatureDataUrl,
  showFontPicker = true,
  className,
}: SignatureCaptureFormProps) {
  const [mode, setMode] = useState<'typed' | 'drawn'>('typed')
  const [drawnDataUrl, setDrawnDataUrl] = useState<string | null>(null)
  const [typedFont, setTypedFont] = useState(DEFAULT_SIGNATURE_FONT)

  useEffect(() => {
    void loadSignatureFont(typedFont)
  }, [typedFont])

  const style = useMemo<SignatureStyle>(
    () =>
      mode === 'typed'
        ? { mode: 'typed', fontFamily: typedFont }
        : { mode: 'drawn', dataUrl: drawnDataUrl ?? '' },
    [mode, typedFont, drawnDataUrl]
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
    <div className={className}>
      <Tabs value={mode} onValueChange={(v) => setMode(v as 'typed' | 'drawn')}>
        <TabsList className="mb-3 w-full">
          <TabsTrigger value="typed" className="flex-1">
            Type
          </TabsTrigger>
          <TabsTrigger value="drawn" className="flex-1">
            Draw
          </TabsTrigger>
        </TabsList>

        <TabsContent value="typed" className="space-y-3">
          {showFontPicker && (
            <div>
              <Label className="text-caption text-lr-muted">Font</Label>
              <Select value={typedFont} onValueChange={setTypedFont}>
                <SelectTrigger className="mt-1 w-full">
                  <SelectValue placeholder="Choose font" />
                </SelectTrigger>
                <SelectContent>
                  {SIGNATURE_FONTS.map((font) => (
                    <SelectItem key={font} value={font}>
                      {font}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="flex min-h-24 items-center justify-center rounded-lr border border-lr-border bg-lr-bg/60 p-4">
            {isRendering ? (
              <span className="text-caption text-lr-muted">Rendering…</span>
            ) : signatureDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={signatureDataUrl}
                alt="Signature preview"
                className="max-h-20 max-w-full object-contain"
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
