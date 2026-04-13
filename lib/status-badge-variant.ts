/** Shared badge variants for document/template list statuses. */

export type StatusBadgeVariant =
  | 'default'
  | 'warning'
  | 'success'
  | 'destructive'
  | 'secondary'

export function statusToBadgeVariant(status: string): StatusBadgeVariant {
  switch (status) {
    case 'draft':
      return 'secondary'
    case 'pending':
      return 'warning'
    case 'completed':
      return 'success'
    case 'cancelled':
      return 'destructive'
    default:
      return 'secondary'
  }
}
