import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Filter, Edit, Trash2, Eye } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';
import CustomerForm from '../components/CustomerForm';
import CustomerPhoto from '../components/CustomerPhoto';
import api from '../services/authService';
import toast from 'react-hot-toast';

const Customers = () => {
  const { hasPermission, user } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({});
  const [page, setPage] = useState(1);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Fetch customers
  const { data: customersData, isLoading } = useQuery({
    queryKey: ['customers', page, searchTerm, filters],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        ...filters,
      });
      
      if (searchTerm) {
        params.append('search', searchTerm);
      }

      const response = await api.get(`/customers?${params}`);
      return response.data;
    },
    placeholderData: (previousData) => previousData,
  });

  // Delete customer mutation
  const deleteCustomerMutation = useMutation({
    mutationFn: async (customerId) => {
      const response = await api.delete(`/customers/${customerId}`);
      return response.data;
    },
    onSuccess: () => {
        queryClient.invalidateQueries('customers');
        toast.success('Customer deleted successfully');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to delete customer');
      },
    }
  );

  const handleDelete = (customerId) => {
    if (window.confirm('Are you sure you want to delete this customer?')) {
      deleteCustomerMutation.mutate(customerId);
    }
  };



  const customers = customersData?.data || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <p className="text-gray-600">Manage customer accounts and information</p>
        </div>
        {user?.role === 'Agent' && hasPermission('create_customer') && (
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="btn btn-primary"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Customer
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-${user?.role === 'Manager' ? '3' : '4'} gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search customers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-10"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              KYC Status
            </label>
            <select
              value={filters.kyc_status || ''}
              onChange={(e) => setFilters({ ...filters, kyc_status: e.target.value })}
              className="input"
            >
              <option value="">All</option>
              <option value="true">Verified</option>
              <option value="false">Not Verified</option>
            </select>
          </div>

          {(() => {
            console.log('User role:', user?.role);
            console.log('User object:', user);
            return user?.role !== 'Agent' && user?.role !== 'Manager';
          })() && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Branch
              </label>
              <select
                value={filters.branch_id || ''}
                onChange={(e) => setFilters({ ...filters, branch_id: e.target.value })}
                className="input"
              >
                <option value="">All Branches</option>
                <option value="1">Main Branch</option>
                <option value="2">Downtown Branch</option>
              </select>
            </div>
          )}

          <div className="flex items-end">
            <button
              onClick={() => setFilters({})}
              className="btn btn-outline w-full"
            >
              <Filter className="h-4 w-4 mr-2" />
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <LoadingSpinner size="xl" />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="table w-full">
                <thead className="table-header">
                  <tr>
                    <th className="table-head">Customer ID</th>
                    <th className="table-head">Name</th>
                    <th className="table-head">Email</th>
                    {user?.role === 'Manager' && (
                      <th className="table-head">Agent</th>
                    )}
                    <th className="table-head">Phone</th>
                    <th className="table-head">KYC Status</th>
                    <th className="table-head">Actions</th>
                  </tr>
                </thead>
                <tbody className="table-body">
                  {customers.map((customer) => (
                    <tr key={customer.customer_id} className="table-row">
                      <td className="table-cell font-mono text-sm">
                        {customer.customer_id}
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center space-x-3">
                          <div className="flex-shrink-0">
                            <CustomerPhoto
                              customerId={customer.customer_id}
                              photoUrl={customer.photo}
                              firstName={customer.first_name}
                              lastName={customer.last_name}
                              className="h-10 w-10 rounded-full object-cover border-2 border-gray-200"
                            />
                          </div>
                          <div>
                            <div className="font-medium">
                              {customer.first_name} {customer.last_name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {customer.nic_number}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="table-cell">{customer.email}</td>
                      {user?.role === 'Manager' && (
                        <td className="table-cell">{customer.agent_name || customer.agent_id || '-'}</td>
                      )}  
                      <td className="table-cell">
                        <div>
                          <div>{customer.phone_number}</div>
                          {customer.phone_is_verified && (
                            <span className="badge badge-success badge-sm">Verified</span>
                          )}
                        </div>
                      </td>
                      <td className="table-cell">
                        {customer.kyc_status ? (
                          <span className="badge badge-success">Verified</span>
                        ) : (
                          <span className="badge badge-warning">Pending</span>
                        )}
                      </td>
                      <td className="table-cell">
                        <div className="flex space-x-2">
                          <button className="btn btn-ghost btn-sm">
                            <Eye className="h-4 w-4" />
                          </button>
                          {user?.role === 'Agent' && hasPermission('update_customer') && (
                            <button className="btn btn-ghost btn-sm">
                              <Edit className="h-4 w-4" />
                            </button>
                          )}
                          {user?.role === 'Agent' && hasPermission('delete_customer') && (
                            <button
                              onClick={() => handleDelete(customer.customer_id)}
                              className="btn btn-ghost btn-sm text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {customers.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">No customers found</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Add Customer Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Customer"
        size="lg"
      >
        <CustomerForm
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={() => {
            // Modal will be closed by CustomerForm
          }}
        />
      </Modal>
    </div>
  );
};

export default Customers;
