import React, { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import api from '../services/authService';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const Branches = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'Admin';
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', district: '', town: '', phone_number: '' });

  const loadBranches = async () => {
    setLoading(true);
    try {
      const res = await api.get('/branches');
      if (res.data?.success) setBranches(res.data.data);
    } catch (e) {
      toast.error('Failed to load branches');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadBranches(); }, []);

  const onCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await api.post('/admin/branches', form);
      if (res.data?.success) {
        toast.success('Branch created');
        setForm({ name: '', district: '', town: '', phone_number: '' });
        loadBranches();
      } else {
        toast.error(res.data?.message || 'Create failed');
      }
    } catch (e) {
      toast.error(e.response?.data?.message || 'Create failed');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Branches</h1>
          <p className="text-gray-600">Manage bank branches and locations</p>
        </div>
      </div>

      {isAdmin && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium mb-4">Add New Branch</h3>
          <form onSubmit={onCreate} className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <input className="input" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <input className="input" placeholder="District" value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} />
            <input className="input" placeholder="Town" value={form.town} onChange={(e) => setForm({ ...form, town: e.target.value })} />
            <input className="input" placeholder="Phone" value={form.phone_number} onChange={(e) => setForm({ ...form, phone_number: e.target.value })} />
            <div className="md:col-span-4">
              <button type="submit" disabled={creating} className="btn btn-primary flex items-center">
                <Plus className="h-4 w-4 mr-2" /> {creating ? 'Creating...' : 'Create Branch'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">All Branches ({branches.length})</h3>
        </div>
        {loading ? (
          <div className="p-6 text-gray-900 dark:text-white">Loading...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">District</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Town</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Phone</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {branches.map(b => (
                  <tr key={b.branch_id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-white">{b.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-white">{b.district || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-white">{b.town || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-white">{b.phone_number || '-'}</td>
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

export default Branches;






