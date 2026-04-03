import { NextRequest } from 'next/server'

export function jsonRequest(
  url: string,
  body: unknown,
  init?: Omit<RequestInit, 'body'> & { headers?: HeadersInit }
) {
  return new NextRequest(url, {
    method: init?.method ?? 'POST',
    body: JSON.stringify(body),
    headers: {
      'content-type': 'application/json',
      ...normalizeHeaders(init?.headers),
    },
    ...stripBody(init),
  })
}

export function formDataRequest(
  url: string,
  formData: FormData,
  init?: Omit<RequestInit, 'body'>
) {
  return new NextRequest(url, {
    method: init?.method ?? 'POST',
    body: formData,
    ...stripBody(init),
  })
}

export function routeParams<P extends Record<string, string>>(params: P) {
  return { params: Promise.resolve(params) }
}

function normalizeHeaders(h?: HeadersInit): Record<string, string> {
  if (!h) return {}
  if (h instanceof Headers) return Object.fromEntries(h.entries())
  if (Array.isArray(h)) return Object.fromEntries(h)
  return { ...h }
}

function stripBody(
  init?: Omit<RequestInit, 'body'>
): Omit<RequestInit, 'body' | 'signal'> | undefined {
  if (!init) return undefined
  const { body, signal, ...rest } = init as RequestInit
  void body
  void signal
  return rest
}
