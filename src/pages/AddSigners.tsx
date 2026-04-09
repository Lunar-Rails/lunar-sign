import { useState } from 'react';
import Layout from '../components/Layout';
import { UserPlus, X, Mail } from 'lucide-react';

interface Signer {
  id: string;
  name: string;
  email: string;
  role: string;
  order: number;
}

const AddSigners = () => {
  const [signers, setSigners] = useState<Signer[]>([]);
  const [newSigner, setNewSigner] = useState({ name: '', email: '', role: 'Signer' });

  const addSigner = () => {
    if (newSigner.name && newSigner.email) {
      const signer: Signer = {
        id: Date.now().toString(),
        ...newSigner,
        order: signers.length + 1,
      };
      setSigners([...signers, signer]);
      setNewSigner({ name: '', email: '', role: 'Signer' });
    }
  };

  const removeSigner = (id: string) => {
    setSigners(signers.filter(s => s.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Signers added:', signers);
  };

  return (
    <Layout>
      <div className="max-w-4xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Add Signers</h1>
          <p className="text-slate-600 mt-1">Define the signing workflow and add signers</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Document Selection</h2>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Select Document
              </label>
              <select className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none">
                <option>DOC-001 - Employee Contract - Sarah Johnson</option>
                <option>DOC-002 - NDA Agreement - TechStart Inc</option>
                <option>DOC-003 - Partnership MOU - GlobalTech</option>
              </select>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Add Signer</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  value={newSigner.name}
                  onChange={(e) => setNewSigner({ ...newSigner, name: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={newSigner.email}
                  onChange={(e) => setNewSigner({ ...newSigner, email: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="john@company.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Role
                </label>
                <select
                  value={newSigner.role}
                  onChange={(e) => setNewSigner({ ...newSigner, role: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                >
                  <option>Signer</option>
                  <option>Approver</option>
                  <option>Reviewer</option>
                </select>
              </div>
            </div>

            <button
              type="button"
              onClick={addSigner}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <UserPlus className="w-5 h-5" />
              Add Signer
            </button>
          </div>

          {signers.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Signing Order</h2>

              <div className="space-y-3">
                {signers.map((signer, index) => (
                  <div
                    key={signer.id}
                    className="flex items-center gap-4 p-4 border border-slate-200 rounded-lg hover:border-slate-300"
                  >
                    <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-semibold">
                      {index + 1}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-slate-900">{signer.name}</p>
                        <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded">
                          {signer.role}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-600 mt-1">
                        <Mail className="w-4 h-4" />
                        {signer.email}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeSigner(signer.id)}
                      className="p-2 hover:bg-red-50 rounded-lg text-red-600"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Notification Settings</h2>

            <div className="space-y-3">
              <label className="flex items-center gap-3">
                <input type="checkbox" className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500" defaultChecked />
                <span className="text-sm text-slate-700">Send email notifications to signers</span>
              </label>

              <label className="flex items-center gap-3">
                <input type="checkbox" className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500" defaultChecked />
                <span className="text-sm text-slate-700">Send reminder emails after 48 hours</span>
              </label>

              <label className="flex items-center gap-3">
                <input type="checkbox" className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500" />
                <span className="text-sm text-slate-700">Require sequential signing</span>
              </label>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
              disabled={signers.length === 0}
            >
              Send for Signatures
            </button>
            <button
              type="button"
              className="px-6 py-3 bg-slate-100 text-slate-700 font-semibold rounded-lg hover:bg-slate-200 transition-colors"
            >
              Save as Draft
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
};

export default AddSigners;
