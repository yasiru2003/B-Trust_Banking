import React, { useEffect, useState } from 'react';
import api from '../services/authService';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const Profile = () => {
  const { user } = useAuth();
  const [form, setForm] = useState({ employee_name: '', email: '', phone_number: '', role: '', branch_id: '', profile_picture_url: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/employees/me');
        if (res.data?.success) {
          setForm(res.data.data);
        }
      } catch (e) {
        const msg = e?.response?.data?.message || e?.message || 'Failed to load profile';
        toast.error(msg);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const onSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.put('/employees/me', {
        employee_name: form.employee_name,
        phone_number: form.phone_number,
        profile_picture_url: form.profile_picture_url,
      });
      if (res.data?.success) {
        setForm(res.data.data);
        toast.success('Profile updated');
      } else {
        toast.error(res.data?.message || 'Update failed');
      }
    } catch (e) {
      toast.error(e.response?.data?.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-xl font-semibold mb-6 text-gray-900 dark:text-white">My Profile</h1>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center space-x-4 mb-6">
          <img
            src={form.profile_picture_url || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(form.employee_name || 'User')}
            alt="Profile"
            className="h-16 w-16 rounded-full object-cover border-2 border-gray-200 dark:border-gray-600"
          />
          <div>
            <div className="text-lg font-medium text-gray-900 dark:text-white">{form.employee_name || '—'}</div>
            <div className="text-sm text-gray-600 dark:text-gray-300">{form.role || '—'} • Branch {form.branch_id || '—'}</div>
          </div>
        </div>

        <form onSubmit={onSave} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Name</label>
              <input name="employee_name" value={form.employee_name || ''} onChange={onChange} className="w-full border rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Email</label>
              <input value={form.email || ''} disabled className="w-full border rounded px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 opacity-80" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Phone</label>
              <input name="phone_number" value={form.phone_number || ''} onChange={onChange} className="w-full border rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Role</label>
              <input value={form.role || ''} disabled className="w-full border rounded px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 opacity-80" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Branch</label>
              <input value={form.branch_id || ''} disabled className="w-full border rounded px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 opacity-80" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Profile Picture URL</label>
            <input name="profile_picture_url" value={form.profile_picture_url || ''} onChange={onChange} className="w-full border rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600" />
          </div>

          <div className="pt-2">
            <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50">{saving ? 'Saving...' : 'Save Picture/Contact'}</button>
          </div>
        </form>
      </div>

      {/* Branch notices (read-only info) */}
      <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Branch Notices</h2>
        <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
          <li>• Follow branch cash handling SOPs.</li>
          <li>• Submit end-of-day reports by 5:30 PM.</li>
          <li>• Weekly team meeting every Friday 9:00 AM.</li>
        </ul>
      </div>
    </div>
  );
};

export default Profile;


