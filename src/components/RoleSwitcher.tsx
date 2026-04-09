import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { InternalRole } from '../utils/permissions';
import { Settings, X } from 'lucide-react';

const RoleSwitcher = () => {
  const { user, switchRole } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  if (!user) return null;

  const roles: InternalRole[] = [
    'Super Admin',
    'Company Admin',
    'Department Admin',
    'User',
    'Viewer',
    'Auditor'
  ];

  const companies = [
    { id: 'comp-001', name: 'Acme Corp' },
    { id: 'comp-002', name: 'Beta LLC' },
    { id: 'comp-003', name: 'Gamma Inc' }
  ];

  const departments = [
    { id: 'dept-001', name: 'IT' },
    { id: 'dept-002', name: 'Legal' },
    { id: 'dept-003', name: 'Finance' },
    { id: 'dept-004', name: 'HR' }
  ];

  const handleRoleChange = (role: InternalRole) => {
    switchRole(role, user.companyId, user.companyName, user.departmentId, user.departmentName);
  };

  const handleCompanyChange = (companyId: string, companyName: string) => {
    switchRole(user.role, companyId, companyName, user.departmentId, user.departmentName);
  };

  const handleDepartmentChange = (departmentId: string, departmentName: string) => {
    switchRole(user.role, user.companyId, user.companyName, departmentId, departmentName);
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
        title="Demo Role Switcher"
      >
        <Settings className="w-5 h-5 text-slate-600" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900">Demo Role Switcher</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-slate-100 rounded"
              >
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Current Role
                </label>
                <select
                  value={user.role}
                  onChange={(e) => handleRoleChange(e.target.value as InternalRole)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                >
                  {roles.map(role => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Company Context
                </label>
                <select
                  value={user.companyId}
                  onChange={(e) => {
                    const company = companies.find(c => c.id === e.target.value);
                    if (company) handleCompanyChange(company.id, company.name);
                  }}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                >
                  {companies.map(company => (
                    <option key={company.id} value={company.id}>{company.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Department Context
                </label>
                <select
                  value={user.departmentId}
                  onChange={(e) => {
                    const department = departments.find(d => d.id === e.target.value);
                    if (department) handleDepartmentChange(department.id, department.name);
                  }}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                >
                  {departments.map(dept => (
                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                  ))}
                </select>
              </div>

              <div className="pt-4 border-t border-slate-200">
                <div className="text-xs text-slate-600 space-y-1">
                  <p><span className="font-medium">User:</span> {user.name}</p>
                  <p><span className="font-medium">Email:</span> {user.email}</p>
                  <p><span className="font-medium">ID:</span> {user.id}</p>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-900">
                  This is a demo/testing feature. Change roles to see how permissions affect the UI.
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default RoleSwitcher;
