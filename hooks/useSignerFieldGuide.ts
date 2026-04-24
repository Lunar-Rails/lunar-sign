'use client'

import { useCallback, useMemo, useState } from 'react'

import type { FieldPlacement } from '@drvillo/react-browser-e-signing'

import { getAllGuideSteps, getPendingGuideSteps } from '@/lib/signer-field-guide'

export function useSignerFieldGuide({
  fields,
  hasSignatureDataUrl,
}: {
  fields: FieldPlacement[]
  hasSignatureDataUrl: boolean
}) {
  const [started, setStarted] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)
  const [acknowledgedSignatureIds, setAcknowledgedSignatureIds] = useState<Set<string>>(
    () => new Set()
  )

  const allSteps = useMemo(() => getAllGuideSteps(fields), [fields])

  const pendingSteps = useMemo(
    () => getPendingGuideSteps(fields, hasSignatureDataUrl, acknowledgedSignatureIds),
    [fields, hasSignatureDataUrl, acknowledgedSignatureIds]
  )

  const start = useCallback(() => {
    setStarted(true)
    setStepIndex(0)
  }, [])

  const next = useCallback(() => {
    setStepIndex((i) => (allSteps.length > 0 ? (i + 1) % allSteps.length : 0))
  }, [allSteps.length])

  const goTo = useCallback((index: number) => {
    setStepIndex(index)
  }, [])

  const acknowledgeSignatureField = useCallback((fieldId: string) => {
    setAcknowledgedSignatureIds((prev) => {
      if (prev.has(fieldId)) return prev
      const next = new Set(prev)
      next.add(fieldId)
      return next
    })
  }, [])

  const isGuideComplete = pendingSteps.length === 0
  const clampedIndex = allSteps.length > 0 ? stepIndex % allSteps.length : 0
  const currentStep = started && allSteps[clampedIndex] ? allSteps[clampedIndex] : null
  const activeFieldId = currentStep?.fieldId ?? null

  return {
    started,
    start,
    next,
    goTo,
    allSteps,
    pendingSteps,
    pendingCount: pendingSteps.length,
    isGuideComplete,
    currentStep,
    activeFieldId,
    stepIndex: clampedIndex,
    totalSteps: allSteps.length,
    acknowledgeSignatureField,
    acknowledgedSignatureIds,
  }
}
