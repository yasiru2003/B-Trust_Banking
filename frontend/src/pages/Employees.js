import React, { useEffect, useState } from 'react';
import { Plus, Snowflake, Sun } from 'lucide-react';
import api from '../services/authService';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const Employees = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'Admin';
  const isManager = user?.role === 'Manager';
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
        isManager ? api.get('/manager/agents') : api.get('/employees'),
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

  useEffect(() => { load(); }, [load]);

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

  const toggleAgentStatus = async (emp) => {
    if (!isManager) return;
    try {
      const isFrozen = emp.status === false;
      const agentId = encodeURIComponent(String(emp.employee_id || '').trim());
      const url = isFrozen ? `/manager/agents/${agentId}/unfreeze` : `/manager/agents/${agentId}/freeze`;
      toast.loading(isFrozen ? 'Unfreezing agent...' : 'Freezing agent...', { id: 'agent-freeze' });
      const res = await api.put(url);
      if (res.data?.success) {
        toast.success(res.data?.message || 'Updated', { id: 'agent-freeze' });
        load();
      } else {
        toast.error(res.data?.message || 'Failed', { id: 'agent-freeze' });
      }
    } catch (e) {
      const msg = e?.response?.data?.message || e?.response?.statusText || e?.message || 'Action failed';
      toast.error(msg, { id: 'agent-freeze' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Employees</h1>
          <p className="text-gray-600 dark:text-gray-300">Manage bank employees and staff</p>
        </div>
      </div>

      {isAdmin && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-medium mb-4 text-gray-900 dark:text-white">Add New Employee</h3>
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

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">All Employees ({employees.length})</h3>
        </div>
        {loading ? (
          <div className="p-6">Loading...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Phone</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Role</th>
                  {!isManager && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Branch
                    </th>
                  )}
                  {isManager && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                  )}
                  {isManager && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {employees.map(emp => (
                  <tr key={emp.employee_id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-white">{emp.employee_id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-white">{emp.employee_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-white">{emp.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-white">{emp.phone_number || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-white">{emp.role}</td>
                    {!isManager && (
                      <td className="px-6 py-4 whitespace-nowrap">{emp.branch_id}
                      </td>
                    )}
                    {isManager && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${emp.status ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'}`}>
                          {emp.status ? 'Active' : 'Frozen'}
                        </span>
                      </td>
                    )}
                    {isManager && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => toggleAgentStatus(emp)}
                          className={`text-sm ${emp.status ? 'text-red-600 dark:text-red-400 hover:text-red-800' : 'text-green-600 dark:text-green-400 hover:text-green-800'}`}
                          title={emp.status ? 'Freeze Agent' : 'Unfreeze Agent'}
                        >
                          {emp.status ? <Snowflake className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
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


