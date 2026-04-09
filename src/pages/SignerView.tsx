import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FileText, CheckCircle, X, Shield, Clock } from 'lucide-react';
import DocumentPreview from '../components/DocumentPreview';

const SignerView = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [signed, setSigned] = useState(false);
  const [declined, setDeclined] = useState(false);

  const signingRequest = {
    documentId: 'DOC-001',
    documentName: 'Employee Contract - Sarah Johnson',
    signerName: 'Jennifer White',
    signerEmail: 'jennifer.w@company.com',
    company: 'Acme Corporation',
    requestedBy: 'John Doe',
    requestedDate: '2026-04-05 10:30 AM',
    dueDate: '2026-04-12',
    signingOrder: 3,
    totalSigners: 3,
    previousSigners: [
      { name: 'Sarah Johnson', signedAt: '2026-04-05 11:00 AM' },
      { name: 'Michael Brown', signedAt: '2026-04-05 02:30 PM' },
    ],
  };

  const handleSign = () => {
    setSigned(true);
    setTimeout(() => {
      navigate('/sign-success');
    }, 2000);
  };

  const handleDecline = () => {
    setDeclined(true);
  };

  if (signed) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Document Signed Successfully</h2>
          <p className="text-slate-600 mb-6">
            Thank you for signing. All parties will be notified.
          </p>
          <p className="text-sm text-slate-500">You can safely close this window.</p>
        </div>
      </div>
    );
  }

  if (declined) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <X className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Signature Declined</h2>
          <p className="text-slate-600 mb-6">
            You have declined to sign this document. The document owner will be notified.
          </p>
          <p className="text-sm text-slate-500">You can safely close this window.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-slate-900">Complyverse DEMS</h1>
              <p className="text-xs text-slate-600">Secure Document Signature</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Clock className="w-4 h-4" />
            <span>Due: {signingRequest.dueDate}</span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 mb-1">
                    {signingRequest.documentName}
                  </h2>
                  <p className="text-sm text-slate-600">{signingRequest.company}</p>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
                  <Clock className="w-4 h-4" />
                  Pending Your Signature
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200">
                <div>
                  <p className="text-xs text-slate-600 mb-1">Document ID</p>
                  <p className="text-sm font-medium text-slate-900">{signingRequest.documentId}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-600 mb-1">Requested By</p>
                  <p className="text-sm font-medium text-slate-900">{signingRequest.requestedBy}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-600 mb-1">Requested Date</p>
                  <p className="text-sm font-medium text-slate-900">{signingRequest.requestedDate}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-600 mb-1">Signing Progress</p>
                  <p className="text-sm font-medium text-slate-900">
                    {signingRequest.signingOrder - 1} of {signingRequest.totalSigners} signed
                  </p>
                </div>
              </div>
            </div>

            <DocumentPreview documentName={signingRequest.documentName} />
          </div>

          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Your Information</h3>

              <div className="space-y-4">
                <div>
                  <p className="text-sm text-slate-600 mb-1">Full Name</p>
                  <p className="font-medium text-slate-900">{signingRequest.signerName}</p>
                </div>

                <div>
                  <p className="text-sm text-slate-600 mb-1">Email Address</p>
                  <p className="font-medium text-slate-900">{signingRequest.signerEmail}</p>
                </div>

                <div>
                  <p className="text-sm text-slate-600 mb-1">Signing Position</p>
                  <p className="font-medium text-slate-900">
                    Signer {signingRequest.signingOrder} of {signingRequest.totalSigners}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Previous Signers</h3>

              <div className="space-y-3">
                {signingRequest.previousSigners.map((signer, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900">{signer.name}</p>
                      <p className="text-xs text-slate-600">Signed: {signer.signedAt}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Actions</h3>

              <div className="space-y-3">
                <button
                  onClick={handleSign}
                  className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-5 h-5" />
                  Sign Document
                </button>

                <button
                  onClick={handleDecline}
                  className="w-full px-4 py-3 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors font-semibold flex items-center justify-center gap-2"
                >
                  <X className="w-5 h-5" />
                  Decline to Sign
                </button>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-200">
                <div className="flex items-start gap-2 text-xs text-slate-600">
                  <Shield className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <p>
                    This signature is legally binding. By clicking "Sign Document," you agree to the terms and conditions outlined in this document.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignerView;
