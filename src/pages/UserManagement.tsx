import { useState } from 'react';
import Layout from '../components/Layout';
import { Search, Filter, UserPlus, CreditCard as Edit, Trash2, MoreVertical, X, Save } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  canCreateUser,
  canEditUser,
  canDeleteUser,
  getAssignableRoles,
  InternalRole
} from '../utils/permissions';

const UserManagement = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'User',
    company: '',
    department: '',
  });

  if (!user) return null;

  const canCreate = canCreateUser(user.role);
  const assignableRoles = getAssignableRoles(user.role);

  // Internal platform users ONLY - external signers are NOT shown here
  const users = [
    { id: 1, name: 'John Doe', email: 'john.doe@company.com', role: 'Super Admin', company: 'Acme Corp', department: 'IT', status: 'Active', lastLogin: '2026-04-06 09:15' },
    { id: 2, name: 'Sarah Johnson', email: 'sarah.j@company.com', role: 'Company Admin', company: 'Acme Corp', department: 'HR', status: 'Active', lastLogin: '2026-04-06 10:30' },
    { id: 3, name: 'Michael Brown', email: 'michael.b@company.com', role: 'Department Admin', company: 'Acme Corp', department: 'Legal', status: 'Active', lastLogin: '2026-04-06 11:45' },
    { id: 4, name: 'Jennifer White', email: 'jennifer.w@company.com', role: 'User', company: 'Acme Corp', department: 'Legal', status: 'Active', lastLogin: '2026-04-05 16:20' },
    { id: 5, name: 'Emily Chen', email: 'emily.c@company.com', role: 'Viewer', company: 'Beta LLC', department: 'Operations', status: 'Active', lastLogin: '2026-04-04 09:00' },
    { id: 6, name: 'Robert Taylor', email: 'robert.t@company.com', role: 'Auditor', company: 'Gamma Industries', department: 'Compliance', status: 'Active', lastLogin: '2026-04-03 13:15' },
    { id: 7, name: 'Lisa Anderson', email: 'lisa.a@company.com', role: 'Company Admin', company: 'Gamma Industries', department: 'HR', status: 'Inactive', lastLogin: '2026-03-15 10:00' },
    { id: 8, name: 'Mark Stevens', email: 'mark.s@company.com', role: 'Department Admin', company: 'Beta LLC', department: 'Finance', status: 'Active', lastLogin: '2026-04-05 14:30' },
  ];

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'Super Admin': return 'bg-purple-100 text-purple-800';
      case 'Company Admin': return 'bg-blue-100 text-blue-800';
      case 'Department Admin': return 'bg-cyan-100 text-cyan-800';
      case 'User': return 'bg-green-100 text-green-800';
      case 'Viewer': return 'bg-slate-100 text-slate-800';
      case 'Auditor': return 'bg-orange-100 text-orange-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  const getStatusColor = (status: string) => {
    return status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  };

  const handleOpenModal = () => {
    setFormData({ name: '', email: '', role: 'User', company: '', department: '' });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setFormData({ name: '', email: '', role: 'User', company: '', department: '' });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('User added:', formData);
    handleCloseModal();
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">User Management</h1>
            <p className="text-slate-600 mt-1">Manage internal platform users, roles, and permissions</p>
          </div>
          {canCreate && (
            <button
              onClick={handleOpenModal}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              Add User
            </button>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search internal users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>

            <div className="flex gap-3">
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="pl-10 pr-8 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none appearance-none bg-white"
                >
                  <option value="all">All Roles</option>
                  <option value="Super Admin">Super Admin</option>
                  <option value="Company Admin">Company Admin</option>
                  <option value="Department Admin">Department Admin</option>
                  <option value="User">User</option>
                  <option value="Viewer">Viewer</option>
                  <option value="Auditor">Auditor</option>
                </select>
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              >
                <option value="all">All Status</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Company</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Department</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Last Login</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredUsers.map((listUser) => {
                  const canEdit = canEditUser(user.role, listUser.role as InternalRole);
                  const canDelete = canDeleteUser(user.role, listUser.role as InternalRole);

                  return (
                    <tr key={listUser.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                            {listUser.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <span className="text-sm font-medium text-slate-900">{listUser.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{listUser.email}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(listUser.role)}`}>
                          {listUser.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{listUser.company}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{listUser.department}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(listUser.status)}`}>
                          {listUser.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{listUser.lastLogin}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex items-center gap-2">
                          {canEdit && (
                            <button className="p-1 hover:bg-blue-50 rounded text-blue-600" title="Edit">
                              <Edit className="w-4 h-4" />
                            </button>
                          )}
                          {canDelete && (
                            <button className="p-1 hover:bg-red-50 rounded text-red-600" title="Delete">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
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
              Showing {filteredUsers.length} of {users.length} users
            </p>
            <div className="flex gap-2">
              <button className="px-3 py-1 border border-slate-300 rounded hover:bg-slate-50">Previous</button>
              <button className="px-3 py-1 bg-blue-600 text-white rounded">1</button>
              <button className="px-3 py-1 border border-slate-300 rounded hover:bg-slate-50">Next</button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-sm font-medium text-slate-600 mb-2">Total Users</h3>
            <p className="text-3xl font-bold text-slate-900">{users.length}</p>
            <p className="text-sm text-green-600 mt-2">+2 this month</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-sm font-medium text-slate-600 mb-2">Active Users</h3>
            <p className="text-3xl font-bold text-slate-900">{users.filter(u => u.status === 'Active').length}</p>
            <p className="text-sm text-blue-600 mt-2">87.5% of total</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-sm font-medium text-slate-600 mb-2">Admins</h3>
            <p className="text-3xl font-bold text-slate-900">
              {users.filter(u => u.role.includes('Admin')).length}
            </p>
            <p className="text-sm text-purple-600 mt-2">37.5% of total</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-sm font-medium text-slate-600 mb-2">Pending Invites</h3>
            <p className="text-3xl font-bold text-slate-900">3</p>
            <p className="text-sm text-yellow-600 mt-2">Awaiting acceptance</p>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-xl font-semibold text-slate-900">Add New User</h2>
              <button
                onClick={handleCloseModal}
                className="p-2 hover:bg-slate-100 rounded-lg text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="john.doe@company.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Role *
                </label>
                <select
                  required
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                >
                  {assignableRoles.map(role => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Company *
                </label>
                <select
                  required
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                >
                  <option value="">Select a company</option>
                  <option value="Acme Corp">Acme Corp</option>
                  <option value="Beta LLC">Beta LLC</option>
                  <option value="Gamma Industries">Gamma Industries</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Department *
                </label>
                <input
                  type="text"
                  required
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="e.g., Legal, HR, Finance"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Create User
                </button>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default UserManagement;
