import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { FileText, Clock, CheckCircle, XCircle, Users, TrendingUp, Upload } from 'lucide-react';
import { mockDocuments } from '../data/mockData';
import { getStatusColor } from '../utils/documentStatus';

const Dashboard = () => {
  const navigate = useNavigate();

  const totalDocs = mockDocuments.length;
  const completedDocs = mockDocuments.filter(d => d.current_status === 'Completed').length;
  const pendingDocs = mockDocuments.filter(d =>
    ['Sent for Signature', 'Viewed', 'Signed (Partial)'].includes(d.current_status)
  ).length;
  const cancelledDocs = mockDocuments.filter(d => d.current_status === 'Cancelled').length;

  const stats = [
    { label: 'Total Documents', value: totalDocs.toString(), icon: FileText, color: 'bg-blue-500', change: '+12%' },
    { label: 'Pending Signatures', value: pendingDocs.toString(), icon: Clock, color: 'bg-yellow-500', change: '+5%' },
    { label: 'Completed', value: completedDocs.toString(), icon: CheckCircle, color: 'bg-green-500', change: '+8%' },
    { label: 'Cancelled', value: cancelledDocs.toString(), icon: XCircle, color: 'bg-red-500', change: '-3%' },
    { label: 'Active Users', value: '156', icon: Users, color: 'bg-purple-500', change: '+15%' },
    { label: 'Compliance Rate', value: '98.5%', icon: TrendingUp, color: 'bg-teal-500', change: '+2%' },
  ];

  const recentDocuments = mockDocuments.slice(0, 4);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
            <p className="text-slate-600 mt-1">Overview of your document execution activities</p>
          </div>
          <button
            onClick={() => navigate('/upload')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Upload New Document
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className={`${stat.color} w-12 h-12 rounded-lg flex items-center justify-center`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-sm font-semibold text-green-600">{stat.change}</span>
                </div>
                <div className="text-3xl font-bold text-slate-900 mb-1">{stat.value}</div>
                <div className="text-sm text-slate-600">{stat.label}</div>
              </div>
            );
          })}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="p-6 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">Recent Documents</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Document ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Company</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {recentDocuments.map((doc) => {
                  const displayDate = doc.sent_at
                    ? new Date(doc.sent_at).toLocaleDateString()
                    : new Date(doc.created_at).toLocaleDateString();

                  return (
                    <tr
                      key={doc.document_id}
                      className="hover:bg-slate-50 cursor-pointer"
                      onClick={() => navigate(`/documents/${doc.document_id}`)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">{doc.document_number}</td>
                      <td className="px-6 py-4 text-sm text-slate-900">{doc.title}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{doc.company_name}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(doc.current_status)}`}>
                          {doc.current_status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{displayDate}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
