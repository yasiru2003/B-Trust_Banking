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
    <div className="p-6 max-w-2xl">
      <h1 className="text-xl font-semibold mb-6">My Profile</h1>
      <form onSubmit={onSave} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Name</label>
          <input name="employee_name" value={form.employee_name || ''} onChange={onChange} className="w-full border rounded px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input value={form.email || ''} disabled className="w-full border rounded px-3 py-2 bg-gray-100" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Phone</label>
          <input name="phone_number" value={form.phone_number || ''} onChange={onChange} className="w-full border rounded px-3 py-2" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Role</label>
            <input value={form.role || ''} disabled className="w-full border rounded px-3 py-2 bg-gray-100" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Branch</label>
            <input value={form.branch_id || ''} disabled className="w-full border rounded px-3 py-2 bg-gray-100" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Profile Picture URL</label>
          <input name="profile_picture_url" value={form.profile_picture_url || ''} onChange={onChange} className="w-full border rounded px-3 py-2" />
        </div>
        <div className="pt-4">
          <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50">{saving ? 'Saving...' : 'Save Changes'}</button>
        </div>
      </form>
    </div>
  );
};

export default Profile;


