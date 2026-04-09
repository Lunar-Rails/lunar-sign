import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { Search, Filter, Download, Eye, MoreVertical, Upload } from 'lucide-react';
import { mockDocuments } from '../data/mockData';
import { getStatusColor, calculateDocumentStatus } from '../utils/documentStatus';
import { DocumentStatus } from '../types/document';
import { useAuth } from '../context/AuthContext';
import { canUploadDocument } from '../utils/permissions';

const DocumentList = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState<DocumentStatus | 'all'>('all');
  const [companyFilter, setCompanyFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  if (!user) return null;

  const canUpload = canUploadDocument(user.role);

  const filteredDocuments = mockDocuments.filter(doc => {
    const matchesStatus = statusFilter === 'all' || doc.current_status === statusFilter;
    const matchesCompany = companyFilter === 'all' || doc.company_name === companyFilter;
    const matchesSearch = doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.document_number.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesCompany && matchesSearch;
  });

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Documents</h1>
            <p className="text-slate-600 mt-1">Manage and track all your documents</p>
          </div>
          {canUpload && (
            <button
              onClick={() => navigate('/upload')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              Upload New Document
            </button>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search documents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>

            <div className="flex gap-3">
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as DocumentStatus | 'all')}
                  className="pl-10 pr-8 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none appearance-none bg-white"
                >
                  <option value="all">All Status</option>
                  <option value="Draft">Draft</option>
                  <option value="Sent for Signature">Sent for Signature</option>
                  <option value="Viewed">Viewed</option>
                  <option value="Signed (Partial)">Signed (Partial)</option>
                  <option value="Completed">Completed</option>
                  <option value="Rejected">Rejected</option>
                  <option value="Cancelled">Cancelled</option>
                  <option value="Expired">Expired</option>
                </select>
              </div>

              <select
                value={companyFilter}
                onChange={(e) => setCompanyFilter(e.target.value)}
                className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              >
                <option value="all">All Companies</option>
                <option value="Acme Corp">Acme Corp</option>
                <option value="Beta LLC">Beta LLC</option>
                <option value="Gamma Industries">Gamma Industries</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Document ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Company</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Department</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Signers</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredDocuments.map((doc) => {
                  const displayDate = doc.sent_at
                    ? new Date(doc.sent_at).toLocaleDateString()
                    : new Date(doc.created_at).toLocaleDateString();

                  return (
                    <tr key={doc.document_id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                        <button onClick={() => navigate(`/documents/${doc.document_id}`)} className="hover:underline">
                          {doc.document_number}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-900">{doc.title}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{doc.company_name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{doc.department_name || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(doc.current_status)}`}>
                          {doc.current_status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                        {doc.signed_signers_count}/{doc.total_signers}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{displayDate}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => navigate(`/documents/${doc.document_id}`)}
                            className="p-1 hover:bg-blue-50 rounded text-blue-600"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button className="p-1 hover:bg-slate-100 rounded text-slate-600" title="Download">
                            <Download className="w-4 h-4" />
                          </button>
                          <button className="p-1 hover:bg-slate-100 rounded text-slate-600" title="More">
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-slate-600">
              Showing {filteredDocuments.length} of {mockDocuments.length} documents
            </p>
            <div className="flex gap-2">
              <button className="px-3 py-1 border border-slate-300 rounded hover:bg-slate-50">Previous</button>
              <button className="px-3 py-1 bg-blue-600 text-white rounded">1</button>
              <button className="px-3 py-1 border border-slate-300 rounded hover:bg-slate-50">2</button>
              <button className="px-3 py-1 border border-slate-300 rounded hover:bg-slate-50">3</button>
              <button className="px-3 py-1 border border-slate-300 rounded hover:bg-slate-50">Next</button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default DocumentList;
