/* eslint-disable @typescript-eslint/no-explicit-any */
declare module 'opentimestamps' {
  export const Ops: {
    OpSHA256: new () => any
    [key: string]: any
  }
  export const Notary: {
    BitcoinBlockHeaderAttestation: new (...args: any[]) => any
    PendingAttestation: new (...args: any[]) => any
    UnknownAttestation: new (...args: any[]) => any
    [key: string]: any
  }
  export const DetachedTimestampFile: {
    fromHash(op: any, hash: Buffer): any
    deserialize(buffer: Buffer | Uint8Array): any
    [key: string]: any
  }
  export function stamp(detached: any, options?: { calendars?: string[] }): Promise<void>
  export function upgrade(detached: any): Promise<boolean>
  export function verify(stamped: any, original: any, options?: any): Promise<any>
  export const Utils: any
  export const Calendar: any
  export const Context: any
  export const Timestamp: any
}
