import { useState } from 'react';
import Layout from '../components/Layout';
import { Search, Building2, Plus, CreditCard as Edit, X, Save } from 'lucide-react';

interface Company {
  id: string;
  name: string;
  industry: string;
  status: 'Active' | 'Inactive';
  departments: string[];
  employees: number;
  createdDate: string;
}

const Companies = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    industry: '',
    departments: '',
  });

  const [companies, setCompanies] = useState<Company[]>([
    { id: 'COMP-001', name: 'Acme Corporation', industry: 'Technology', status: 'Active', departments: ['Legal', 'HR', 'Finance', 'IT'], employees: 250, createdDate: '2025-01-15' },
    { id: 'COMP-002', name: 'Beta LLC', industry: 'Healthcare', status: 'Active', departments: ['Operations', 'Finance', 'Compliance'], employees: 180, createdDate: '2025-02-20' },
    { id: 'COMP-003', name: 'Gamma Industries', industry: 'Manufacturing', status: 'Active', departments: ['HR', 'Legal', 'Operations'], employees: 320, createdDate: '2025-03-10' },
  ]);

  const handleOpenModal = (company?: Company) => {
    if (company) {
      setEditingCompany(company);
      setFormData({
        name: company.name,
        industry: company.industry,
        departments: company.departments.join(', '),
      });
    } else {
      setEditingCompany(null);
      setFormData({ name: '', industry: '', departments: '' });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingCompany(null);
    setFormData({ name: '', industry: '', departments: '' });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const departments = formData.departments.split(',').map(d => d.trim()).filter(d => d);

    if (editingCompany) {
      setCompanies(companies.map(c =>
        c.id === editingCompany.id
          ? { ...c, name: formData.name, industry: formData.industry, departments }
          : c
      ));
    } else {
      const newCompany: Company = {
        id: `COMP-${String(companies.length + 1).padStart(3, '0')}`,
        name: formData.name,
        industry: formData.industry,
        status: 'Active',
        departments,
        employees: 0,
        createdDate: new Date().toISOString().split('T')[0],
      };
      setCompanies([...companies, newCompany]);
    }

    handleCloseModal();
  };

  const handleToggleStatus = (companyId: string) => {
    setCompanies(companies.map(c =>
      c.id === companyId
        ? { ...c, status: c.status === 'Active' ? 'Inactive' : 'Active' }
        : c
    ));
  };

  const filteredCompanies = companies.filter(company =>
    company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    company.industry.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    return status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Companies</h1>
            <p className="text-slate-600 mt-1">Manage organizations and their departments</p>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Company
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search companies..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCompanies.map((company) => (
              <div key={company.id} className="border border-slate-200 rounded-xl p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Building2 className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">{company.name}</h3>
                      <p className="text-sm text-slate-600">{company.industry}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 mb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Status</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(company.status)}`}>
                      {company.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Employees</span>
                    <span className="text-sm font-medium text-slate-900">{company.employees}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Departments</span>
                    <span className="text-sm font-medium text-slate-900">{company.departments.length}</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200">
                  <div className="flex flex-wrap gap-2 mb-4">
                    {company.departments.slice(0, 3).map((dept) => (
                      <span key={dept} className="px-2 py-1 bg-slate-100 text-slate-700 text-xs rounded">
                        {dept}
                      </span>
                    ))}
                    {company.departments.length > 3 && (
                      <span className="px-2 py-1 bg-slate-100 text-slate-700 text-xs rounded">
                        +{company.departments.length - 3}
                      </span>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleOpenModal(company)}
                      className="flex-1 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                    >
                      <Edit className="w-4 h-4" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleToggleStatus(company.id)}
                      className={`flex-1 px-3 py-2 rounded-lg transition-colors text-sm font-medium ${
                        company.status === 'Active'
                          ? 'bg-red-50 text-red-600 hover:bg-red-100'
                          : 'bg-green-50 text-green-600 hover:bg-green-100'
                      }`}
                    >
                      {company.status === 'Active' ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-sm font-medium text-slate-600 mb-2">Total Companies</h3>
            <p className="text-3xl font-bold text-slate-900">{companies.length}</p>
            <p className="text-sm text-blue-600 mt-2">
              {companies.filter(c => c.status === 'Active').length} active
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-sm font-medium text-slate-600 mb-2">Total Employees</h3>
            <p className="text-3xl font-bold text-slate-900">
              {companies.reduce((sum, c) => sum + c.employees, 0)}
            </p>
            <p className="text-sm text-green-600 mt-2">Across all companies</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-sm font-medium text-slate-600 mb-2">Total Departments</h3>
            <p className="text-3xl font-bold text-slate-900">
              {companies.reduce((sum, c) => sum + c.departments.length, 0)}
            </p>
            <p className="text-sm text-teal-600 mt-2">Managed entities</p>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-xl font-semibold text-slate-900">
                {editingCompany ? 'Edit Company' : 'Add New Company'}
              </h2>
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
                  Company Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="Enter company name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Industry *
                </label>
                <input
                  type="text"
                  required
                  value={formData.industry}
                  onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="e.g., Technology, Healthcare"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Departments (comma-separated) *
                </label>
                <input
                  type="text"
                  required
                  value={formData.departments}
                  onChange={(e) => setFormData({ ...formData, departments: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="Legal, HR, Finance, IT"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {editingCompany ? 'Update' : 'Create'} Company
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

export default Companies;
