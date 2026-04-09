import { useState } from 'react';
import Layout from '../components/Layout';
import { Search, Filter, Download, FileText, UserPlus, Send, CheckCircle, XCircle, Upload, Eye, Ban } from 'lucide-react';
import { mockAuditEvents } from '../data/mockData';
import { AuditActionType } from '../types/document';

const AuditTrail = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<AuditActionType | 'all'>('all');
  const [dateFilter, setDateFilter] = useState('7days');

  const getActionIcon = (actionType: AuditActionType) => {
    switch (actionType) {
      case 'document_created': return Upload;
      case 'document_sent': return Send;
      case 'document_viewed': return Eye;
      case 'document_signed': return CheckCircle;
      case 'document_rejected': return XCircle;
      case 'document_cancelled': return Ban;
      case 'document_expired': return XCircle;
      case 'document_completed': return CheckCircle;
      case 'signer_added': return UserPlus;
      case 'reminder_sent': return Send;
      default: return FileText;
    }
  };

  const getActionColor = (actionType: AuditActionType) => {
    switch (actionType) {
      case 'document_created': return 'text-blue-600';
      case 'document_sent': return 'text-purple-600';
      case 'document_viewed': return 'text-cyan-600';
      case 'document_signed': return 'text-green-600';
      case 'document_rejected': return 'text-red-600';
      case 'document_cancelled': return 'text-orange-600';
      case 'document_expired': return 'text-gray-600';
      case 'document_completed': return 'text-green-600';
      case 'signer_added': return 'text-blue-600';
      case 'reminder_sent': return 'text-yellow-600';
      default: return 'text-slate-600';
    }
  };

  const formatActionLabel = (actionType: AuditActionType) => {
    return actionType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  const filteredEvents = mockAuditEvents.filter(event => {
    const matchesSearch =
      event.performed_by_id_or_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.action_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (event.notes && event.notes.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesAction = actionFilter === 'all' || event.action_type === actionFilter;
    return matchesSearch && matchesAction;
  });

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Audit Trail</h1>
            <p className="text-slate-600 mt-1">Complete history of all system activities</p>
          </div>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export Report
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search audit logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>

            <div className="flex gap-3">
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <select
                  value={actionFilter}
                  onChange={(e) => setActionFilter(e.target.value as AuditActionType | 'all')}
                  className="pl-10 pr-8 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none appearance-none bg-white"
                >
                  <option value="all">All Actions</option>
                  <option value="document_created">Created</option>
                  <option value="document_sent">Sent</option>
                  <option value="document_viewed">Viewed</option>
                  <option value="document_signed">Signed</option>
                  <option value="document_rejected">Rejected</option>
                  <option value="document_cancelled">Cancelled</option>
                  <option value="document_completed">Completed</option>
                  <option value="signer_added">Signer Added</option>
                  <option value="reminder_sent">Reminder Sent</option>
                </select>
              </div>

              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              >
                <option value="7days">Last 7 days</option>
                <option value="30days">Last 30 days</option>
                <option value="90days">Last 90 days</option>
                <option value="all">All time</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Timestamp</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">User / Actor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Action</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Details</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">IP / Device</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredEvents.map((event) => {
                  const Icon = getActionIcon(event.action_type);
                  const color = getActionColor(event.action_type);
                  const actionLabel = formatActionLabel(event.action_type);

                  return (
                    <tr key={event.audit_event_id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 font-mono">
                        {formatDateTime(event.timestamp)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                        <div>
                          <p className="font-medium">{event.performed_by_id_or_email}</p>
                          <p className="text-xs text-slate-500">{event.performed_by_type}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Icon className={`w-4 h-4 ${color}`} />
                          <span className="text-sm font-medium text-slate-900">{actionLabel}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {event.notes || '-'}
                        {event.from_status && event.to_status && (
                          <p className="text-xs text-slate-500 mt-1">
                            {event.from_status} → {event.to_status}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {event.ip_address && <p className="font-mono text-xs">{event.ip_address}</p>}
                        {event.device_info && <p className="text-xs text-slate-500 mt-0.5">{event.device_info}</p>}
                        {!event.ip_address && !event.device_info && <p className="text-xs text-slate-400">-</p>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-slate-600">
              Showing {filteredEvents.length} of {mockAuditEvents.length} events
            </p>
            <div className="flex gap-2">
              <button className="px-3 py-1 border border-slate-300 rounded hover:bg-slate-50">Previous</button>
              <button className="px-3 py-1 bg-blue-600 text-white rounded">1</button>
              <button className="px-3 py-1 border border-slate-300 rounded hover:bg-slate-50">2</button>
              <button className="px-3 py-1 border border-slate-300 rounded hover:bg-slate-50">Next</button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-sm font-medium text-slate-600 mb-2">Total Events</h3>
            <p className="text-3xl font-bold text-slate-900">{mockAuditEvents.length}</p>
            <p className="text-sm text-green-600 mt-2">All time activity</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-sm font-medium text-slate-600 mb-2">Unique Actors</h3>
            <p className="text-3xl font-bold text-slate-900">
              {new Set(mockAuditEvents.map(e => e.performed_by_id_or_email)).size}
            </p>
            <p className="text-sm text-blue-600 mt-2">Users + System</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-sm font-medium text-slate-600 mb-2">Documents Tracked</h3>
            <p className="text-3xl font-bold text-slate-900">
              {new Set(mockAuditEvents.map(e => e.document_id)).size}
            </p>
            <p className="text-sm text-slate-600 mt-2">With audit history</p>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default AuditTrail;
