import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import DocumentPreview from '../components/DocumentPreview';
import AddSignerModal from '../components/AddSignerModal';
import ConfirmDialog from '../components/ConfirmDialog';
import { ArrowLeft, Download, Send, FileText, CheckCircle, Clock, XCircle, AlertCircle, Eye, UserPlus, CreditCard as Edit2, Trash2 } from 'lucide-react';
import { mockDocuments, mockSigners, mockAuditEvents } from '../data/mockData';
import { getStatusColor, getSignerStatusColor } from '../utils/documentStatus';
import { useAuth } from '../context/AuthContext';
import { Signer } from '../types/document';
import {
  canSendReminder,
  canAddSigners,
  canCancelDocument,
  canDownloadDocument,
  isDocumentReadOnly
} from '../utils/permissions';

const DocumentDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isAddSignerModalOpen, setIsAddSignerModalOpen] = useState(false);
  const [documentSigners, setDocumentSigners] = useState<Signer[]>([]);
  const [editingSigner, setEditingSigner] = useState<Signer | null>(null);
  const [signerToRemove, setSignerToRemove] = useState<Signer | null>(null);

  const document = mockDocuments.find(d => d.document_id === id) || mockDocuments[0];
  const auditEvents = mockAuditEvents.filter(e => e.document_id === document.document_id);

  useEffect(() => {
    const initialSigners = mockSigners.filter(s => s.document_id === document.document_id);
    setDocumentSigners(initialSigners);
  }, [document.document_id]);

  const allSigned = document.signed_signers_count === document.total_signers;
  const isTerminal = isDocumentReadOnly(document.current_status);
  const isDraft = document.current_status === 'Draft';

  if (!user) return null;

  const permissionCtx = {
    userRole: user.role,
    userCompanyId: user.companyId,
    userDepartmentId: user.departmentId,
    documentCompanyId: document.company_id,
    documentDepartmentId: document.department_id,
    documentOwnerId: document.owner_user_id,
    documentStatus: document.current_status
  };

  const canSend = canSendReminder(permissionCtx);
  const canAdd = canAddSigners(permissionCtx);
  const canCancel = canCancelDocument(permissionCtx);
  const canDownload = canDownloadDocument(user.role);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Signed': return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'Viewed': return <Eye className="w-5 h-5 text-cyan-600" />;
      case 'Pending': return <Clock className="w-5 h-5 text-yellow-600" />;
      case 'Rejected': return <XCircle className="w-5 h-5 text-red-600" />;
      case 'Expired': return <XCircle className="w-5 h-5 text-gray-600" />;
      default: return <Clock className="w-5 h-5 text-slate-400" />;
    }
  };

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getAuditIcon = (actionType: string) => {
    if (actionType.includes('signed')) return CheckCircle;
    if (actionType.includes('sent')) return Send;
    if (actionType.includes('rejected')) return XCircle;
    if (actionType.includes('cancelled')) return XCircle;
    return FileText;
  };

  const handleAddSigner = (signerData: {
    signer_name: string;
    signer_email: string;
    signer_role_or_label?: string;
    signing_order?: number;
  }) => {
    const newSigner: Signer = {
      signer_id: `sig-${document.document_id}-${Date.now()}`,
      document_id: document.document_id,
      signer_name: signerData.signer_name,
      signer_email: signerData.signer_email,
      signer_role: signerData.signer_role_or_label,
      signing_order: signerData.signing_order || documentSigners.length + 1,
      signer_status: 'Pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setDocumentSigners([...documentSigners, newSigner]);
  };

  const handleEditSigner = (signer: Signer) => {
    if (!isDraft) return;
    setEditingSigner(signer);
    setIsAddSignerModalOpen(true);
  };

  const handleUpdateSigner = (signerId: string, signerData: {
    signer_name: string;
    signer_email: string;
    signer_role_or_label?: string;
    signing_order?: number;
  }) => {
    setDocumentSigners(documentSigners.map(s => {
      if (s.signer_id === signerId) {
        return {
          ...s,
          signer_name: signerData.signer_name,
          signer_email: signerData.signer_email,
          signer_role: signerData.signer_role_or_label,
          signing_order: signerData.signing_order || s.signing_order,
          updated_at: new Date().toISOString(),
        };
      }
      return s;
    }));
    setEditingSigner(null);
  };

  const handleRemoveSignerClick = (signer: Signer) => {
    if (!isDraft) return;
    setSignerToRemove(signer);
  };

  const handleConfirmRemove = () => {
    if (signerToRemove) {
      setDocumentSigners(documentSigners.filter(s => s.signer_id !== signerToRemove.signer_id));
      setSignerToRemove(null);
    }
  };

  const handleCloseModal = () => {
    setIsAddSignerModalOpen(false);
    setEditingSigner(null);
  };

  const handleSendForSignature = () => {
    if (documentSigners.length === 0) {
      alert('Please add at least one signer before sending the document.');
      return;
    }

    if (!document.file_name) {
      alert('Please upload a document file before sending.');
      return;
    }

    alert(`Document sent to ${documentSigners.length} signer(s) successfully!`);
    navigate('/documents');
  };

  const canSendDocument = isDraft && documentSigners.length > 0 && document.file_name;

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/documents')}
            className="p-2 hover:bg-slate-100 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-slate-900">{document.title}</h1>
            <p className="text-slate-600 mt-1">{document.document_number}</p>
          </div>
          {canDownload && (
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2">
              <Download className="w-4 h-4" />
              Download
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-900">Document Information</h2>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-xs text-slate-600">Signing Progress</p>
                    <p className="text-sm font-semibold text-blue-600">{document.signed_signers_count}/{document.total_signers} Completed</p>
                  </div>
                  <div className="w-16 h-16 relative">
                    <svg className="w-16 h-16 transform -rotate-90">
                      <circle
                        cx="32"
                        cy="32"
                        r="28"
                        stroke="#e2e8f0"
                        strokeWidth="4"
                        fill="none"
                      />
                      <circle
                        cx="32"
                        cy="32"
                        r="28"
                        stroke="#3b82f6"
                        strokeWidth="4"
                        fill="none"
                        strokeDasharray={`${(document.signed_signers_count / document.total_signers) * 175.93} 175.93`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-sm font-bold text-slate-900">
                        {Math.round((document.signed_signers_count / document.total_signers) * 100)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-slate-600 mb-1">Document Type</p>
                  <p className="font-medium text-slate-900">{document.document_type || 'Contract'}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600 mb-1">Status</p>
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(document.current_status)}`}>
                    {document.current_status}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-slate-600 mb-1">Company</p>
                  <p className="font-medium text-slate-900">{document.company_name}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600 mb-1">Department</p>
                  <p className="font-medium text-slate-900">{document.department_name || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600 mb-1">Uploaded By</p>
                  <p className="font-medium text-slate-900">{document.owner_name}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600 mb-1">Upload Date</p>
                  <p className="font-medium text-slate-900">{formatDateTime(document.created_at)}</p>
                </div>
                {document.sent_at && (
                  <div>
                    <p className="text-sm text-slate-600 mb-1">Sent Date</p>
                    <p className="font-medium text-slate-900">{formatDateTime(document.sent_at)}</p>
                  </div>
                )}
                {document.completed_at && (
                  <div>
                    <p className="text-sm text-slate-600 mb-1">Completed Date</p>
                    <p className="font-medium text-slate-900">{formatDateTime(document.completed_at)}</p>
                  </div>
                )}
              </div>

              {document.description && (
                <div className="mt-6">
                  <p className="text-sm text-slate-600 mb-1">Description</p>
                  <p className="text-slate-900">{document.description}</p>
                </div>
              )}
            </div>

            <DocumentPreview documentName={document.title} />

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-900">Signers</h2>
                {isDraft && canAdd && (
                  <button
                    onClick={() => setIsAddSignerModalOpen(true)}
                    className="px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2"
                  >
                    <UserPlus className="w-4 h-4" />
                    Add Signer
                  </button>
                )}
              </div>

              {documentSigners.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-lg">
                  <UserPlus className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                  <p className="text-slate-600 font-medium mb-1">No signers added yet</p>
                  <p className="text-sm text-slate-500 mb-4">
                    Add at least one signer to send this document for signature
                  </p>
                  {isDraft && canAdd && (
                    <button
                      onClick={() => setIsAddSignerModalOpen(true)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium inline-flex items-center gap-2"
                    >
                      <UserPlus className="w-4 h-4" />
                      Add First Signer
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {documentSigners.map((signer, index) => (
                    <div key={signer.signer_id} className="flex items-center gap-4 p-4 border border-slate-200 rounded-lg">
                      <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center font-semibold text-slate-600">
                        {signer.signing_order || index + 1}
                      </div>

                      <div className="flex-1">
                        <p className="font-medium text-slate-900">{signer.signer_name}</p>
                        <p className="text-sm text-slate-600">{signer.signer_email}</p>
                        {signer.signer_role && (
                          <p className="text-xs text-slate-500 mt-1">{signer.signer_role}</p>
                        )}
                      </div>

                      <div className="text-right">
                        <div className="flex items-center gap-2 justify-end mb-1">
                          {getStatusIcon(signer.signer_status)}
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSignerStatusColor(signer.signer_status)}`}>
                            {signer.signer_status}
                          </span>
                        </div>
                        {signer.signed_at && (
                          <p className="text-xs text-slate-500">{formatDateTime(signer.signed_at)}</p>
                        )}
                        {signer.viewed_at && !signer.signed_at && (
                          <p className="text-xs text-slate-500">Viewed {formatDateTime(signer.viewed_at)}</p>
                        )}
                      </div>

                      {isDraft && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditSigner(signer)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit signer"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleRemoveSignerClick(signer)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Remove signer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Actions</h2>

              <div className="flex flex-wrap gap-3">
                {isDraft ? (
                  <>
                    <button
                      onClick={() => setIsAddSignerModalOpen(true)}
                      className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors font-medium flex items-center gap-2"
                    >
                      <UserPlus className="w-4 h-4" />
                      Add Signer
                    </button>
                    <button
                      onClick={handleSendForSignature}
                      disabled={!canSendDocument}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      <Send className="w-4 h-4" />
                      Send for Signature
                    </button>
                    <button
                      onClick={() => navigate('/documents')}
                      className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors font-medium"
                    >
                      Save Draft
                    </button>
                    {canCancel && (
                      <button
                        className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors font-medium"
                      >
                        Cancel Document
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    {canSend && (
                      <button
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={!canSend}
                      >
                        Send Reminder
                      </button>
                    )}
                    <button
                      onClick={() => navigate('/audit-trail')}
                      className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors font-medium"
                    >
                      View Audit Trail
                    </button>
                    {canCancel && (
                      <button
                        className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={!canCancel}
                      >
                        Cancel Document
                      </button>
                    )}
                  </>
                )}
              </div>

              {isDraft && documentSigners.length === 0 && (
                <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-900">Add Signers Required</p>
                    <p className="text-sm text-amber-700 mt-1">
                      Add at least one signer before sending this document for signature.
                    </p>
                  </div>
                </div>
              )}

              {isDraft && !document.file_name && (
                <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-900">Document Upload Required</p>
                    <p className="text-sm text-amber-700 mt-1">
                      Upload a document file before sending for signature.
                    </p>
                  </div>
                </div>
              )}

              {!isTerminal && !isDraft && documentSigners.some(s => s.signer_status === 'Pending' || s.signer_status === 'Viewed') && (
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-900">Awaiting Signatures</p>
                    <p className="text-sm text-blue-700 mt-1">
                      {documentSigners.filter(s => s.signer_status !== 'Signed').length} signer(s) have not yet signed this document.
                      You can send reminders.
                    </p>
                  </div>
                </div>
              )}

              {document.current_status === 'Cancelled' && document.cancelled_at && (
                <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg flex items-start gap-3">
                  <XCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-orange-900">Document Cancelled</p>
                    <p className="text-sm text-orange-700 mt-1">
                      This document was cancelled on {formatDateTime(document.cancelled_at)}
                    </p>
                  </div>
                </div>
              )}

              {document.current_status === 'Completed' && document.completed_at && (
                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-green-900">All Signatures Collected</p>
                    <p className="text-sm text-green-700 mt-1">
                      This document was completed on {formatDateTime(document.completed_at)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 sticky top-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Activity Timeline</h2>

              <div className="space-y-4">
                {auditEvents.map((event, index) => {
                  const Icon = getAuditIcon(event.action_type);
                  const actionLabel = event.action_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

                  return (
                    <div key={event.audit_event_id} className="flex gap-3">
                      <div className="relative">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <Icon className="w-4 h-4 text-blue-600" />
                        </div>
                        {index < auditEvents.length - 1 && (
                          <div className="absolute top-8 left-1/2 transform -translate-x-1/2 w-0.5 h-8 bg-slate-200"></div>
                        )}
                      </div>

                      <div className="flex-1 pb-4">
                        <p className="text-sm font-medium text-slate-900">{actionLabel}</p>
                        <p className="text-xs text-slate-600">{event.performed_by_id_or_email}</p>
                        <p className="text-xs text-slate-500 mt-1">{formatDateTime(event.timestamp)}</p>
                        {event.notes && (
                          <p className="text-xs text-slate-500 mt-1 italic">{event.notes}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      <AddSignerModal
        isOpen={isAddSignerModalOpen}
        onClose={handleCloseModal}
        onAddSigner={handleAddSigner}
        onUpdateSigner={handleUpdateSigner}
        existingSignersCount={documentSigners.length}
        editingSigner={editingSigner}
      />

      <ConfirmDialog
        isOpen={signerToRemove !== null}
        title="Remove Signer"
        message={`Are you sure you want to remove ${signerToRemove?.signer_name}? This action cannot be undone.`}
        confirmText="Remove"
        cancelText="Cancel"
        variant="danger"
        onConfirm={handleConfirmRemove}
        onCancel={() => setSignerToRemove(null)}
      />
    </Layout>
  );
};

export default DocumentDetails;
