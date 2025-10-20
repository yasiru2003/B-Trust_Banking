import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Filter, Edit, Trash2, Eye, CheckCircle, XCircle, Download } from 'lucide-react';
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
  const [agents, setAgents] = useState([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [txCustomer, setTxCustomer] = useState(null);

  // Load agents for manager filter
  useEffect(() => {
    const loadAgents = async () => {
      try {
        if (user?.role === 'Manager') {
          const res = await api.get('/manager/agents');
          if (res.data?.success) setAgents(res.data.data || []);
        }
      } catch (e) {
        // silent
      }
    };
    loadAgents();
  }, [user?.role]);

  // Fetch customers
  const { data: customersData, isLoading } = useQuery({
    queryKey: ['customers', page, searchTerm, filters, user?.role],
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

  // Customer recent activity (for View modal)
  const { data: customerActivityData, isLoading: txLoading } = useQuery({
    queryKey: ['customer-activity', txCustomer?.customer_id],
    queryFn: async () => {
      const params = new URLSearchParams({ customer_id: txCustomer.customer_id });
      const response = await api.get(`/customers/recent-activity?${params.toString()}`);
      return response.data;
    },
    enabled: !!isTxModalOpen && !!txCustomer?.customer_id,
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
    }
  });

  // Update KYC status mutation
  const updateKycMutation = useMutation({
    mutationFn: async ({ customerId, kycStatus }) => {
      const response = await api.put(`/customers/${customerId}`, { kyc_status: kycStatus });
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries('customers');
      const status = variables.kycStatus ? 'verified' : 'rejected';
      toast.success(`KYC status ${status} successfully!`, { id: 'kyc-update' });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update KYC status', { id: 'kyc-update' });
    }
  });

  const handleDelete = (customerId) => {
    if (window.confirm('Are you sure you want to delete this customer?')) {
      deleteCustomerMutation.mutate(customerId);
    }
  };

  const handleKycUpdate = (customerId, currentStatus) => {
    const newStatus = !currentStatus;
    const action = newStatus ? 'verify' : 'reject';
    
    // Show confirmation toast instead of window.confirm
    toast.loading(`${action === 'verify' ? 'Verifying' : 'Rejecting'} KYC...`, { id: 'kyc-update' });
    
    // Simulate a small delay for better UX, then proceed
    setTimeout(() => {
      updateKycMutation.mutate({ customerId, kycStatus: newStatus });
    }, 500);
  };



  const customers = customersData?.data || [];

  // Debug logging
  console.log('Customers component - User:', user);
  console.log('Customers component - User role:', user?.role);
  console.log('Customers component - Customers data:', customers);

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
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search customers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-10 w-full"
              />
            </div>
          </div>
          
          <div className="flex-1">
            <select
              value={filters.kyc_status || ''}
              onChange={(e) => setFilters({ ...filters, kyc_status: e.target.value })}
              className="input w-full"
            >
              <option value="">All KYC Status</option>
              <option value="true">✅ Verified</option>
              <option value="false">❌ Pending</option>
            </select>
          </div>

          {user?.role !== 'Agent' && user?.role !== 'Manager' && (
            <div className="flex-1">
              <select
                value={filters.branch_id || ''}
                onChange={(e) => setFilters({ ...filters, branch_id: e.target.value })}
                className="input w-full"
              >
                <option value="">All Branches</option>
                <option value="1">Main Branch</option>
                <option value="2">Downtown Branch</option>
              </select>
            </div>
          )}

          {user?.role === 'Manager' && (
            <div className="flex-1">
              <select
                value={filters.agent_id || ''}
                onChange={(e) => setFilters({ ...filters, agent_id: e.target.value })}
                className="input w-full"
              >
                <option value="">All Agents</option>
                {agents.map(a => (
                  <option key={a.employee_id} value={a.employee_id}>{a.employee_name}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <button
              onClick={() => {
                setFilters({});
                setSearchTerm('');
              }}
              className="btn btn-outline"
            >
              <Filter className="h-4 w-4 mr-2" />
              Apply Filters
            </button>
          </div>
        </div>
      </div>

      {/* Customers Table / Empty State */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        {Array.isArray(customers) && customers.length === 0 ? (
          <div className="p-12 text-center">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Customers</h3>
            <p className="text-gray-600 dark:text-gray-300">You don't have any assigned customers yet.</p>
          </div>
        ) : isLoading ? (
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
                          <button
                            className="btn btn-ghost btn-sm"
                            title="View Recent Activity"
                            onClick={() => {
                              setTxCustomer(customer);
                              setIsTxModalOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          {user?.role === 'Agent' && hasPermission('update_customer') && (
                            <button className="btn btn-ghost btn-sm" title="Edit Customer">
                              <Edit className="h-4 w-4" />
                            </button>
                          )}
                          {/* KYC Status Update Button - Show for all agents */}
                          {(user?.role === 'Agent' || user?.role === 'agent') && (
                            <button
                              onClick={() => handleKycUpdate(customer.customer_id, customer.kyc_status)}
                              disabled={updateKycMutation.isLoading}
                              className={`btn btn-ghost btn-sm ${
                                customer.kyc_status 
                                  ? 'text-red-600 hover:text-red-700' 
                                  : 'text-green-600 hover:text-green-700'
                              } disabled:opacity-50`}
                              title={customer.kyc_status ? 'Reject KYC' : 'Verify KYC'}
                            >
                              {customer.kyc_status ? (
                                <XCircle className="h-4 w-4" />
                              ) : (
                                <CheckCircle className="h-4 w-4" />
                              )}
                            </button>
                          )}
                          {user?.role === 'Agent' && hasPermission('delete_customer') && (
                            <button
                              onClick={() => handleDelete(customer.customer_id)}
                              className="btn btn-ghost btn-sm text-red-600 hover:text-red-700"
                              title="Delete Customer"
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

            {/* No longer render inline empty; handled above */}
          </>
        )}
      </div>

    {/* View Customer Transactions Modal */}
    <Modal
      isOpen={isTxModalOpen}
      onClose={() => setIsTxModalOpen(false)}
      title={txCustomer ? `Recent Activity - ${txCustomer.first_name} ${txCustomer.last_name}` : 'Recent Activity'}
      size="xl"
    >
      {txCustomer && (
        <div className="space-y-4">
          {/* Activity list */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
            {txLoading ? (
              <div className="flex items-center justify-center h-48"><LoadingSpinner /></div>
            ) : (customerActivityData?.data || []).length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 dark:text-gray-400">No recent activity</p>
              </div>
            ) : (
              <div className="p-4 space-y-3">
                {(customerActivityData?.data || []).map((a, idx) => (
                  <div key={idx} className="flex items-start justify-between border-b border-gray-200 dark:border-gray-700 pb-3">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{a.message}</div>
                      {a.details && <div className="text-xs text-gray-600 dark:text-gray-300">{a.details}</div>}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{a.time || ''}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>

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
