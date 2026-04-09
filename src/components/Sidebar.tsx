import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FileUp,
  UserPlus,
  FileText,
  FileSearch,
  ScrollText,
  Users,
  Shield,
  Building2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  canAccessDashboard,
  canAccessDocuments,
  canAccessCompanies,
  canAccessUserManagement,
  canAccessAuditTrail,
  canUploadDocument,
  InternalRole
} from '../utils/permissions';

const Sidebar = () => {
  const { user } = useAuth();

  if (!user) return null;

  const menuItems = [
    {
      path: '/dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      show: canAccessDashboard(user.role)
    },
    {
      path: '/upload',
      label: 'Upload Document',
      icon: FileUp,
      show: canUploadDocument(user.role)
    },
    {
      path: '/documents',
      label: 'Documents',
      icon: FileText,
      show: canAccessDocuments(user.role)
    },
    {
      path: '/audit-trail',
      label: 'Audit Trail',
      icon: ScrollText,
      show: canAccessAuditTrail(user.role)
    },
    {
      path: '/companies',
      label: 'Companies',
      icon: Building2,
      show: canAccessCompanies(user.role)
    },
    {
      path: '/users',
      label: 'User Management',
      icon: Users,
      show: canAccessUserManagement(user.role)
    },
  ].filter(item => item.show);

  return (
    <div className="w-64 bg-slate-900 text-white h-screen fixed left-0 top-0 flex flex-col">
      <div className="p-6 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <Shield className="w-8 h-8 text-blue-400" />
          <div>
            <h1 className="text-xl font-bold">Complyverse</h1>
            <p className="text-xs text-slate-400">DEMS</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`
                  }
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="p-4 border-t border-slate-700">
        <div className="text-xs text-slate-400">
          {user.companyName}
        </div>
        <div className="text-xs text-slate-500">
          {user.departmentName}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
