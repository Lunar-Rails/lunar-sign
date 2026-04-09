import { Document, DocumentStatus, Signer } from '../types/document';

export function calculateDocumentStatus(
  document: Pick<Document, 'sent_at' | 'cancelled_at' | 'expired_at' | 'rejected_signers_count' | 'signed_signers_count' | 'total_signers' | 'viewed_signers_count' | 'completed_at'>
): DocumentStatus {
  if (document.rejected_signers_count > 0) {
    return 'Rejected';
  }

  if (document.cancelled_at) {
    return 'Cancelled';
  }

  if (document.expired_at) {
    return 'Expired';
  }

  if (document.completed_at && document.signed_signers_count === document.total_signers && document.total_signers > 0) {
    return 'Completed';
  }

  if (document.signed_signers_count > 0 && document.signed_signers_count < document.total_signers) {
    return 'Signed (Partial)';
  }

  if (document.viewed_signers_count > 0 && document.signed_signers_count === 0 && document.rejected_signers_count === 0) {
    return 'Viewed';
  }

  if (document.sent_at && document.viewed_signers_count === 0 && document.signed_signers_count === 0) {
    return 'Sent for Signature';
  }

  return 'Draft';
}

export function getStatusColor(status: DocumentStatus): string {
  switch (status) {
    case 'Completed':
      return 'bg-green-100 text-green-800';
    case 'Signed (Partial)':
      return 'bg-blue-100 text-blue-800';
    case 'Viewed':
      return 'bg-cyan-100 text-cyan-800';
    case 'Sent for Signature':
      return 'bg-yellow-100 text-yellow-800';
    case 'Draft':
      return 'bg-slate-100 text-slate-800';
    case 'Rejected':
      return 'bg-red-100 text-red-800';
    case 'Cancelled':
      return 'bg-orange-100 text-orange-800';
    case 'Expired':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-slate-100 text-slate-800';
  }
}

export function getSignerStatusColor(status: string): string {
  switch (status) {
    case 'Signed':
      return 'bg-green-100 text-green-800';
    case 'Viewed':
      return 'bg-cyan-100 text-cyan-800';
    case 'Pending':
      return 'bg-yellow-100 text-yellow-800';
    case 'Rejected':
      return 'bg-red-100 text-red-800';
    case 'Expired':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-slate-100 text-slate-800';
  }
}

export function canSignerSign(document: Pick<Document, 'current_status'>, signer: Signer): boolean {
  const terminalDocumentStates: DocumentStatus[] = ['Cancelled', 'Expired', 'Rejected', 'Completed'];

  if (terminalDocumentStates.includes(document.current_status)) {
    return false;
  }

  if (signer.signer_status === 'Signed' || signer.signer_status === 'Rejected') {
    return false;
  }

  return true;
}
