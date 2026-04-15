export interface SupabaseOpResult {
  data: unknown
  error: unknown
}

function thenableResult(result: SupabaseOpResult) {
  return {
    then<TResult1 = SupabaseOpResult, TResult2 = never>(
      onFulfilled?: ((value: SupabaseOpResult) => TResult1 | PromiseLike<TResult1>) | null,
      onRejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
    ) {
      return Promise.resolve(result).then(onFulfilled as never, onRejected as never)
    },
  }
}

/**
 * Mock client: each **awaited** PostgREST chain consumes the next queued `{ data, error }`.
 * Order must match the handler under test.
 */
export function createQueuedSupabaseMock(options: {
  user: { id: string; email?: string } | null
  queue: SupabaseOpResult[]
  storageUploadError?: unknown
}) {
  const queue = [...options.queue]
  let qi = 0

  function next(): SupabaseOpResult {
    if (qi >= queue.length) return { data: null, error: null }
    const r = queue[qi]
    qi += 1
    return r
  }

  function filterAfterSelect() {
    const self = {
      eq: () => self,
      neq: () => self,
      in: () => self,
      is: () => self,
      ilike: () => self,
      or: () => self,
      order: () => self,
      limit: () => self,
      not: () => self,
      maybeSingle: () => thenableResult(next()),
      single: () => thenableResult(next()),
      then: (onFulfilled: never, onRejected: never) =>
        thenableResult(next()).then(onFulfilled, onRejected),
    }
    return self
  }

  function updateChain() {
    const afterSelect = {
      maybeSingle: () => thenableResult(next()),
      single: () => thenableResult(next()),
      then: (onFulfilled: never, onRejected: never) =>
        thenableResult(next()).then(onFulfilled, onRejected),
    }

    const chain = {
      eq: () => chain,
      in: () => chain,
      is: () => chain,
      select: () => afterSelect,
      then: (onFulfilled: never, onRejected: never) =>
        thenableResult(next()).then(onFulfilled, onRejected),
    }
    return chain
  }

  function updateOrDeleteChain() {
    const chain = {
      eq: () => chain,
      in: () => chain,
      is: () => chain,
      select: () => ({
        maybeSingle: () => thenableResult(next()),
        single: () => thenableResult(next()),
      }),
      then: (onFulfilled: never, onRejected: never) =>
        thenableResult(next()).then(onFulfilled, onRejected),
    }
    return chain
  }

  function insertChain() {
    const chain = {
      select: () => ({
        single: () => thenableResult(next()),
      }),
      then: (onFulfilled: never, onRejected: never) =>
        thenableResult(next()).then(onFulfilled, onRejected),
    }
    return chain
  }

  const client = {
    auth: {
      getUser: async () => ({
        data: { user: options.user },
        error: null,
      }),
    },
    from(_table: string) {
      void _table
      return {
        select: () => filterAfterSelect(),
        insert: () => insertChain(),
        update: () => updateChain(),
        delete: () => updateOrDeleteChain(),
      }
    },
    storage: {
      from(_bucket: string) {
        void _bucket
        return {
          upload: async () => ({
            data: options.storageUploadError ? null : { path: 'mock-path' },
            error: options.storageUploadError ?? null,
          }),
          download: async () => ({
            data: new Blob([new Uint8Array([1])]),
            error: null,
          }),
          createSignedUrl: async () => ({
            data: { signedUrl: 'https://signed.example/test.pdf' },
            error: null,
          }),
        }
      },
    },
  }

  return client
}
