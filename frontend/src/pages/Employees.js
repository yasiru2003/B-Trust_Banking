import React, { useEffect, useState } from 'react';
import { UserCheck, Plus, Trash2 } from 'lucide-react';
import api from '../services/authService';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const Employees = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'Admin';
  const [employees, setEmployees] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    employee_id: '',
    employee_name: '',
    email: '',
    phone_number: '',
    role: 'Agent',
    branch_id: '',
    password: ''
  });

  const load = async () => {
    setLoading(true);
    try {
      const [emps, brs] = await Promise.all([
        api.get('/employees'),
        api.get('/branches')
      ]);
      if (emps.data?.success) setEmployees(emps.data.data);
      if (brs.data?.success) setBranches(brs.data.data);
    } catch (e) {
      toast.error('Failed to load employees');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const onCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await api.post('/admin/employees', form);
      if (res.data?.success) {
        toast.success('Employee created');
        setForm({ employee_id: '', employee_name: '', email: '', phone_number: '', role: 'Agent', branch_id: '', password: '' });
        load();
      } else {
        toast.error(res.data?.message || 'Create failed');
      }
    } catch (e) {
      toast.error(e.response?.data?.message || 'Create failed');
    } finally {
      setCreating(false);
    }
  };

  const onDelete = async (employee_id, employee_name) => {
    if (!window.confirm(`Are you sure you want to delete employee "${employee_name}"?\n\nThis action cannot be undone.`)) {
      return;
    }

    try {
      const res = await api.delete(`/admin/employees/${employee_id}`);
      if (res.data?.success) {
        toast.success(res.data.message || 'Employee deleted successfully');
        load();
      } else {
        toast.error(res.data?.message || 'Delete failed');
      }
    } catch (e) {
      toast.error(e.response?.data?.message || 'Delete failed');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Employees</h1>
          <p className="text-gray-600">Manage bank employees and staff</p>
        </div>
      </div>

      {isAdmin && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium mb-4">Add New Employee</h3>
          <form onSubmit={onCreate} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input className="input" placeholder="Employee ID" value={form.employee_id} onChange={(e) => setForm({ ...form, employee_id: e.target.value })} required />
            <input className="input" placeholder="Name" value={form.employee_name} onChange={(e) => setForm({ ...form, employee_name: e.target.value })} required />
            <input className="input" placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            <input className="input" placeholder="Phone" value={form.phone_number} onChange={(e) => setForm({ ...form, phone_number: e.target.value })} />
            <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="Agent">Agent</option>
              <option value="Manager">Manager</option>
              <option value="Admin">Admin</option>
            </select>
            <select className="input" value={form.branch_id} onChange={(e) => setForm({ ...form, branch_id: e.target.value })} required>
              <option value="">Select Branch</option>
              {branches.map(b => (
                <option key={b.branch_id} value={b.branch_id}>{b.name}</option>
              ))}
            </select>
            <input className="input" placeholder="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
            <div className="md:col-span-3">
              <button type="submit" disabled={creating} className="btn btn-primary flex items-center">
                <Plus className="h-4 w-4 mr-2" /> {creating ? 'Creating...' : 'Create Employee'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">All Employees ({employees.length})</h3>
        </div>
        {loading ? (
          <div className="p-6">Loading...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Branch</th>
                  {isAdmin && (
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {employees.map(emp => (
                  <tr key={emp.employee_id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{emp.employee_id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{emp.employee_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{emp.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{emp.phone_number || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        emp.role === 'Admin' ? 'bg-purple-100 text-purple-800' :
                        emp.role === 'Manager' ? 'bg-blue-100 text-blue-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {emp.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{emp.branch_id}</td>
                    {isAdmin && (
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <button
                          onClick={() => onDelete(emp.employee_id, emp.employee_name)}
                          disabled={emp.employee_id === user?.employee_id}
                          className={`inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md ${
                            emp.employee_id === user?.employee_id
                              ? 'text-gray-400 bg-gray-100 cursor-not-allowed'
                              : 'text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500'
                          }`}
                          title={emp.employee_id === user?.employee_id ? 'Cannot delete your own account' : 'Delete employee'}
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1" />
                          Delete
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Employees;


