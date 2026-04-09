import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Signer } from '../types/document';

interface AddSignerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddSigner: (signer: {
    signer_name: string;
    signer_email: string;
    signer_role_or_label?: string;
    signing_order?: number;
  }) => void;
  onUpdateSigner?: (signerId: string, signer: {
    signer_name: string;
    signer_email: string;
    signer_role_or_label?: string;
    signing_order?: number;
  }) => void;
  existingSignersCount: number;
  editingSigner?: Signer | null;
}

const AddSignerModal = ({
  isOpen,
  onClose,
  onAddSigner,
  onUpdateSigner,
  existingSignersCount,
  editingSigner
}: AddSignerModalProps) => {
  const [formData, setFormData] = useState({
    signer_name: '',
    signer_email: '',
    signer_role_or_label: '',
    signing_order: existingSignersCount + 1,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (editingSigner) {
      setFormData({
        signer_name: editingSigner.signer_name,
        signer_email: editingSigner.signer_email,
        signer_role_or_label: editingSigner.signer_role || '',
        signing_order: editingSigner.signing_order || existingSignersCount + 1,
      });
    } else {
      setFormData({
        signer_name: '',
        signer_email: '',
        signer_role_or_label: '',
        signing_order: existingSignersCount + 1,
      });
    }
    setErrors({});
  }, [editingSigner, isOpen, existingSignersCount]);

  if (!isOpen) return null;

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.signer_name.trim()) {
      newErrors.signer_name = 'Signer name is required';
    }

    if (!formData.signer_email.trim()) {
      newErrors.signer_email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.signer_email)) {
      newErrors.signer_email = 'Invalid email format';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const signerData = {
      signer_name: formData.signer_name,
      signer_email: formData.signer_email,
      signer_role_or_label: formData.signer_role_or_label || undefined,
      signing_order: formData.signing_order || undefined,
    };

    if (editingSigner && onUpdateSigner) {
      onUpdateSigner(editingSigner.signer_id, signerData);
    } else {
      onAddSigner(signerData);
    }

    setFormData({
      signer_name: '',
      signer_email: '',
      signer_role_or_label: '',
      signing_order: existingSignersCount + 1,
    });
    setErrors({});
    onClose();
  };

  const handleClose = () => {
    setFormData({
      signer_name: '',
      signer_email: '',
      signer_role_or_label: '',
      signing_order: existingSignersCount + 1,
    });
    setErrors({});
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-xl font-semibold text-slate-900">
            {editingSigner ? 'Edit Signer' : 'Add Signer'}
          </h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Signer Name *
            </label>
            <input
              type="text"
              value={formData.signer_name}
              onChange={(e) => setFormData({ ...formData, signer_name: e.target.value })}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${
                errors.signer_name ? 'border-red-500' : 'border-slate-300'
              }`}
              placeholder="Enter signer's full name"
            />
            {errors.signer_name && (
              <p className="text-sm text-red-600 mt-1">{errors.signer_name}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Email Address *
            </label>
            <input
              type="email"
              value={formData.signer_email}
              onChange={(e) => setFormData({ ...formData, signer_email: e.target.value })}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${
                errors.signer_email ? 'border-red-500' : 'border-slate-300'
              }`}
              placeholder="signer@example.com"
            />
            {errors.signer_email && (
              <p className="text-sm text-red-600 mt-1">{errors.signer_email}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Role or Title (Optional)
            </label>
            <input
              type="text"
              value={formData.signer_role_or_label}
              onChange={(e) => setFormData({ ...formData, signer_role_or_label: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              placeholder="e.g., CEO, CFO, Authorized Signatory"
            />
            <p className="text-xs text-slate-500 mt-1">
              The signer's role or title (for reference only)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Signing Order (Optional)
            </label>
            <input
              type="number"
              min="1"
              value={formData.signing_order}
              onChange={(e) => setFormData({ ...formData, signing_order: parseInt(e.target.value) || 0 })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
            <p className="text-xs text-slate-500 mt-1">
              Reserved for future sequential signing feature
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              {editingSigner ? 'Update Signer' : 'Add Signer'}
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 font-medium rounded-lg hover:bg-slate-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddSignerModal;
