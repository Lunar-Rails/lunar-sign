'use client'

import { useCallback, useMemo, useState } from 'react'

import type { FieldPlacement } from '@drvillo/react-browser-e-signing'

import { getPendingGuideSteps } from '@/lib/signer-field-guide'

export function useSignerFieldGuide({
  fields,
  hasSignatureDataUrl,
}: {
  fields: FieldPlacement[]
  hasSignatureDataUrl: boolean
}) {
  const [started, setStarted] = useState(false)

  const pendingSteps = useMemo(
    () => getPendingGuideSteps(fields, hasSignatureDataUrl),
    [fields, hasSignatureDataUrl]
  )

  const start = useCallback(() => setStarted(true), [])

  const isGuideComplete = pendingSteps.length === 0
  const currentStep = started && pendingSteps[0] ? pendingSteps[0] : null
  const activeFieldId = currentStep?.fieldId ?? null

  return {
    started,
    start,
    pendingSteps,
    pendingCount: pendingSteps.length,
    isGuideComplete,
    currentStep,
    activeFieldId,
  }
}
