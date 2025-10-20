import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CreditCard, Plus, Search, Filter, Eye, Info } from 'lucide-react';
import { toast } from 'react-hot-toast';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';
import AccountForm from '../components/AccountForm';
import api from '../services/authService';
import { useAuth } from '../context/AuthContext';

const Accounts = () => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Get user info to check role
  const isAgent = user?.role === 'Agent' || user?.role === 'agent';
  const isManager = user?.role === 'Manager' || user?.role === 'manager';

  // Debug logging
  console.log('Accounts component rendered');
  console.log('User info:', user);
  console.log('User role:', user?.role);
  console.log('Is agent:', isAgent);
  console.log('Modal state:', isCreateModalOpen);

  // Fetch accounts
  const { data: accountsData, isLoading: accountsLoading, error: accountsError } = useQuery({
    queryKey: ['accounts', isManager ? 'manager' : 'agent'],
    queryFn: async () => {
      const url = isManager ? '/manager/accounts?page=1&limit=100' : '/accounts';
      const response = await api.get(url);
      return response.data;
    },
    retry: 1,
    onError: (error) => {
      console.error('Failed to fetch accounts:', error);
      toast.error('Failed to load accounts');
    }
  });

  // Fetch account types
  const { data: accountTypes, error: accountTypesError } = useQuery({
    queryKey: 'accountTypes',
    queryFn: async () => {
      try {
        const response = await api.get('/accounts/types');
        return response.data;
      } catch (error) {
        console.error('Failed to fetch account types:', error);
        // Return mock data if API fails
        return {
          success: true,
          data: [
            { acc_type_id: 'SAV001', type_name: 'Savings Account' },
            { acc_type_id: 'CUR001', type_name: 'Current Account' }
          ]
        };
      }
    },
    retry: 1,
    onError: (error) => {
      console.error('Failed to fetch account types:', error);
      toast.error('Failed to load account types - using default options');
    }
  });

  // Fetch customers for account creation (only assigned to current agent)
  const { data: customersData, error: customersError } = useQuery({
    queryKey: 'customers',
    queryFn: async () => {
      try {
        const response = await api.get('/customers');
        return response.data;
      } catch (error) {
        console.error('Failed to fetch customers:', error);
        // Return mock data if API fails
        return {
          success: true,
          data: [
            { customer_id: 'CUST001', first_name: 'Demo', last_name: 'Customer' },
            { customer_id: 'CUST002', first_name: 'Test', last_name: 'User' }
          ]
        };
      }
    },
    retry: 1,
    onError: (error) => {
      console.error('Failed to fetch customers:', error);
      toast.error('Failed to load customers - using default options');
    }
  });

  // Fetch branches
  const { data: branchesData, error: branchesError } = useQuery({
    queryKey: 'branches',
    queryFn: async () => {
      try {
        const response = await api.get('/branches');
        return response.data;
      } catch (error) {
        console.error('Failed to fetch branches:', error);
        // Return mock data if API fails
        return {
          success: true,
          data: [
            { branch_id: 1, name: 'Main Branch' },
            { branch_id: 2, name: 'Sub Branch' }
          ]
        };
      }
    },
    retry: 1,
    onError: (error) => {
      console.error('Failed to fetch branches:', error);
      toast.error('Failed to load branches - using default options');
    }
  });

  // Create account mutation
  const createAccountMutation = useMutation({
    mutationFn: async (accountData) => {
      const response = await api.post('/accounts', accountData);
      return response.data;
    },
    onSuccess: () => {
        toast.success('Account created successfully!');
        queryClient.invalidateQueries('accounts');
        setIsCreateModalOpen(false);
      },
      onError: (error) => {
        const message = error.response?.data?.message || 'Failed to create account';
        toast.error(message);
      }
  });

  const handleCreateAccount = (formData) => {
    createAccountMutation.mutate(formData);
  };

  const handleViewAccountDetails = (account) => {
    setSelectedAccount(account);
    setIsDetailsModalOpen(true);
  };

  const filteredAccounts = accountsData?.data?.filter(account => {
    const matchesSearch = account.account_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         account.customer_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesBranch = !selectedBranch || account.branch_id === parseInt(selectedBranch);
    const matchesType = !selectedType || account.acc_type_id === selectedType;
    
    return matchesSearch && matchesBranch && matchesType;
  }) || [];

  if (accountsLoading) return <LoadingSpinner />;
  
  // Show error state only if accounts failed to load (critical data)
  if (accountsError) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Accounts</h1>
            <p className="text-gray-600">Manage customer accounts and balances</p>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-center py-12">
            <div className="text-red-500 mb-4">
              <h3 className="text-lg font-medium mb-2">Failed to load data</h3>
              <p className="text-sm">
                {accountsError && "Failed to load accounts. "}
                {customersError && "Failed to load customers. "}
                {accountTypesError && "Failed to load account types. "}
                {branchesError && "Failed to load branches. "}
              </p>
              <button 
                onClick={() => window.location.reload()} 
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors duration-200 mt-4"
              >
                Refresh Page
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Accounts</h1>
          <p className="text-gray-600">Manage customer accounts and balances</p>
        </div>
        <button 
          onClick={() => {
            console.log('Open Account button clicked');
            console.log('Errors:', { customersError, accountTypesError, branchesError });
            console.log('Data available:', { 
              customers: customersData?.data?.length || 0, 
              accountTypes: accountTypes?.data?.length || 0, 
              branches: branchesData?.data?.length || 0 
            });
            
            console.log('Opening modal...');
            setIsCreateModalOpen(true);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors duration-200 flex items-center"
        >
          <Plus className="h-4 w-4 mr-2" />
          Open Account
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className={`grid grid-cols-1 gap-4 ${isAgent ? 'md:grid-cols-3' : 'md:grid-cols-4'}`}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search accounts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          {!isAgent && (
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Branches</option>
              {branchesData?.data?.map(branch => (
                <option key={branch.branch_id} value={branch.branch_id}>
                  {branch.name}
                </option>
              ))}
            </select>
          )}

          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Account Types</option>
            {accountTypes?.data?.map(type => (
              <option key={type.acc_type_id} value={type.acc_type_id}>
                {type.type_name}
              </option>
            ))}
          </select>

          <button className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-md transition-colors duration-200 flex items-center">
            <Filter className="h-4 w-4 mr-2" />
            Apply Filters
          </button>
        </div>
      </div>

      {/* Accounts Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Accounts ({filteredAccounts.length})
          </h3>
        </div>
        
        {filteredAccounts.length === 0 ? (
          <div className="text-center py-12">
            <CreditCard className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No accounts found</h3>
            <p className="text-gray-500">No accounts match your current filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Account Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Account Type
                  </th>
                  {!isAgent && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Branch
                    </th>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Balance
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    More Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAccounts.map((account) => (
                  <tr key={account.account_number} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {account.account_number}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {account.customer_name || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {account.account_type || 'N/A'}
                      </div>
                    </td>
                    {!isAgent && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {account.branch_name || 'N/A'}
                        </div>
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        LKR {parseFloat(account.current_balance || 0).toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        account.status 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {account.status ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button 
                        onClick={() => handleViewAccountDetails(account)}
                        className="text-green-600 hover:text-green-900 mr-3"
                        title="View More Details"
                      >
                        <Info className="h-4 w-4" />
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button className="text-blue-600 hover:text-blue-900 mr-3">
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Account Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Open New Account"
      >
        <AccountForm
          customers={customersData?.data || []}
          accountTypes={accountTypes?.data || []}
          branches={branchesData?.data || []}
          onSubmit={handleCreateAccount}
          isLoading={createAccountMutation.isLoading}
        />
      </Modal>

      {/* Account Details Modal */}
      <Modal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        title="Account Details"
        size="lg"
      >
        {selectedAccount && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Account Number</label>
                <p className="mt-1 text-sm text-gray-900">{selectedAccount.account_number}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <div className="mt-1">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    selectedAccount.status 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {selectedAccount.status ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Customer Name</label>
                <p className="mt-1 text-sm text-gray-900">{selectedAccount.customer_name || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Account Type</label>
                <p className="mt-1 text-sm text-gray-900">{selectedAccount.account_type || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Current Balance</label>
                <p className="mt-1 text-sm font-medium text-gray-900">
                  LKR {parseFloat(selectedAccount.current_balance || 0).toLocaleString()}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Branch</label>
                <p className="mt-1 text-sm text-gray-900">{selectedAccount.branch_name || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Opening Date</label>
                <p className="mt-1 text-sm text-gray-900">
                  {selectedAccount.opening_date ? new Date(selectedAccount.opening_date).toLocaleDateString() : 'N/A'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Customer Phone</label>
                <p className="mt-1 text-sm text-gray-900">{selectedAccount.phone_number || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Customer Email</label>
                <p className="mt-1 text-sm text-gray-900">{selectedAccount.email || 'N/A'}</p>
              </div>
            </div>
            
            <div className="pt-4 border-t">
              <div className="flex justify-end">
                <button
                  onClick={() => setIsDetailsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};


export default Accounts;

