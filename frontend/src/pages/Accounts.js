import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CreditCard, Plus, Search, Filter, Eye, DollarSign, Snowflake, Sun } from 'lucide-react';
import { toast } from 'react-hot-toast';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';
import api from '../services/authService';
import { useAuth } from '../context/AuthContext';

const Accounts = () => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
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
            { acc_type_id: 'CUR001', type_name: 'Joint Account' }
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

  // Freeze account mutation
  const freezeAccountMutation = useMutation({
    mutationFn: async (accountNumber) => {
      // Show confirmation toast
      toast.loading('Freezing account...', { id: 'freeze-account' });
      
      const response = await api.put(`/accounts/${accountNumber}/freeze`);
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Account frozen successfully!', { id: 'freeze-account' });
      queryClient.invalidateQueries('accounts');
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Failed to freeze account';
      toast.error(message, { id: 'freeze-account' });
    }
  });

  // Unfreeze account mutation
  const unfreezeAccountMutation = useMutation({
    mutationFn: async (accountNumber) => {
      // Show confirmation toast
      toast.loading('Unfreezing account...', { id: 'unfreeze-account' });
      
      const response = await api.put(`/accounts/${accountNumber}/unfreeze`);
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Account unfrozen successfully!', { id: 'unfreeze-account' });
      queryClient.invalidateQueries('accounts');
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Failed to unfreeze account';
      toast.error(message, { id: 'unfreeze-account' });
    }
  });

  const handleCreateAccount = (formData) => {
    createAccountMutation.mutate(formData);
  };

  const handleFreezeAccount = (accountNumber) => {
    freezeAccountMutation.mutate(accountNumber);
  };

  const handleUnfreezeAccount = (accountNumber) => {
    unfreezeAccountMutation.mutate(accountNumber);
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
        {!isManager && (
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
        )}
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
          
          {!isAgent && !isManager && (
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
                  {!isAgent && !isManager && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Branch
                    </th>
                  )}
                  {user?.role === 'Manager' && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Agent
                    </th>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Balance
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Freeze Status
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
                    {!isAgent && !isManager && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {account.branch_name || 'N/A'}
                        </div>
                      </td>
                    )}
                    {user?.role === 'Manager' && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {account.agent_name || account.employee_name || account.agent || account.agent_id || '-'}
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
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        account.is_frozen 
                          ? 'bg-red-100 text-red-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {account.is_frozen ? 'Frozen' : 'Normal'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button 
                          onClick={() => {
                            // Show account details in a modal or expandable row
                            console.log('More details for account:', account);
                            alert(`Account Details:\n\nAccount Number: ${account.account_number}\nCustomer: ${account.customer_name}\nType: ${account.account_type}\nBalance: LKR ${parseFloat(account.current_balance || 0).toLocaleString()}\nStatus: ${account.status ? 'Active' : 'Inactive'}\nFreeze Status: ${account.is_frozen ? 'Frozen' : 'Normal'}\nOpening Date: ${account.opening_date || 'N/A'}`);
                          }}
                          className="text-green-600 hover:text-green-900"
                          title="View More Details"
                        >
                          <DollarSign className="h-4 w-4" />
                        </button>
                        <button className="text-blue-600 hover:text-blue-900" title="View Account">
                          <Eye className="h-4 w-4" />
                        </button>
                        {isAgent && (
                          <>
                            {!account.is_frozen ? (
                              <button 
                                onClick={() => handleFreezeAccount(account.account_number)}
                                disabled={freezeAccountMutation.isLoading}
                                className="text-red-600 hover:text-red-900 disabled:opacity-50"
                                title="Freeze Account"
                              >
                                <Snowflake className="h-4 w-4" />
                              </button>
                            ) : (
                              <button 
                                onClick={() => handleUnfreezeAccount(account.account_number)}
                                disabled={unfreezeAccountMutation.isLoading}
                                className="text-green-600 hover:text-green-900 disabled:opacity-50"
                                title="Unfreeze Account"
                              >
                                <Sun className="h-4 w-4" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Account Modal */}
      {!isManager && (
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
      )}    
    </div>
  );
};

// Account Form Component
const AccountForm = ({ customers, accountTypes, branches, onSubmit, isLoading }) => {
  const [formData, setFormData] = useState({
    customer_id: '',
    acc_type_id: '',
    branch_id: '',
    current_balance: 0,
    joint_customers: []
  });
  const [selectedAccountType, setSelectedAccountType] = useState(null);
  const [balanceError, setBalanceError] = useState('');

  // Get user info from AuthContext
  const { user } = useAuth();
  const isAgent = user?.role === 'Agent' || user?.role === 'agent';
  const agentBranchId = user?.branch_id;

  const handleSubmit = (e) => {
    e.preventDefault();
    
    console.log('Form submission - selectedAccountType:', selectedAccountType);
    console.log('Form submission - formData:', formData);
    
    // Handle joint account type - extract the actual account type ID
    let actualAccountTypeId = formData.acc_type_id;
    let isJointAccount = false;
    
    if (formData.acc_type_id.startsWith('joint-')) {
      actualAccountTypeId = formData.acc_type_id.replace('joint-', '');
      isJointAccount = true;
    }
    
    // Find the selected account type for validation
    const accountTypeForValidation = accountTypes.find(type => type.acc_type_id === actualAccountTypeId);
    
    // Validate minimum balance
    if (accountTypeForValidation && accountTypeForValidation.minimum_balance) {
      const minBalance = parseFloat(accountTypeForValidation.minimum_balance);
      const enteredBalance = parseFloat(formData.current_balance);
      
      console.log('Validation - minBalance:', minBalance, 'enteredBalance:', enteredBalance);
      
      if (enteredBalance < minBalance) {
        console.log('Validation failed - balance too low');
        setBalanceError(`Minimum balance required: LKR ${minBalance.toLocaleString()}`);
        return;
      }
    } else if (accountTypeForValidation && accountTypeForValidation.acc_type_id === 'SAV001') {
      // Fallback validation for Savings Account if minimum_balance is not loaded
      const minBalance = 1000;
      const enteredBalance = parseFloat(formData.current_balance);
      
      console.log('Fallback validation - SAV001 minBalance:', minBalance, 'enteredBalance:', enteredBalance);
      
      if (enteredBalance < minBalance) {
        console.log('Fallback validation failed - balance too low');
        setBalanceError(`Minimum balance required for Savings Account: LKR ${minBalance.toLocaleString()}`);
        return;
      }
    }
    
    // Clear any previous errors
    setBalanceError('');
    
    // For agents, automatically set the branch_id to their assigned branch
    const submitData = { 
      ...formData, 
      acc_type_id: actualAccountTypeId,
      joint_customers: isJointAccount ? formData.joint_customers : undefined
    };
    
    if (isAgent && agentBranchId) {
      submitData.branch_id = agentBranchId;
    }
    
    console.log('Submitting data:', submitData);
    onSubmit(submitData);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    setFormData({
      ...formData,
      [name]: value
    });
    
    // Handle account type change
    if (name === 'acc_type_id') {
      const accountType = accountTypes.find(type => type.acc_type_id === value);
      console.log('Selected account type:', accountType);
      setSelectedAccountType(accountType);
      
      // Clear balance error when account type changes
      setBalanceError('');
      
      // If there's a minimum balance, set it as the default
      if (accountType && accountType.minimum_balance) {
        console.log('Setting minimum balance:', accountType.minimum_balance);
        setFormData(prev => ({
          ...prev,
          current_balance: parseFloat(accountType.minimum_balance)
        }));
      } else {
        console.log('No minimum balance for this account type');
      }
    }
    
    // Handle balance change - validate in real-time
    if (name === 'current_balance') {
      const enteredBalance = parseFloat(value);
      console.log('Entered balance:', enteredBalance);
      console.log('Selected account type:', selectedAccountType);
      
      if (selectedAccountType && selectedAccountType.minimum_balance) {
        const minBalance = parseFloat(selectedAccountType.minimum_balance);
        console.log('Minimum balance required:', minBalance);
        
        if (enteredBalance < minBalance) {
          console.log('Balance too low!');
          setBalanceError(`Minimum balance required: LKR ${minBalance.toLocaleString()}`);
        } else {
          console.log('Balance is valid');
          setBalanceError('');
        }
      } else if (selectedAccountType && selectedAccountType.acc_type_id === 'SAV001') {
        // Fallback validation for Savings Account
        const minBalance = 1000;
        console.log('Fallback validation - SAV001 minimum balance:', minBalance);
        
        if (enteredBalance < minBalance) {
          console.log('Fallback validation - Balance too low!');
          setBalanceError(`Minimum balance required for Savings Account: LKR ${minBalance.toLocaleString()}`);
        } else {
          console.log('Fallback validation - Balance is valid');
          setBalanceError('');
        }
      } else {
        console.log('No minimum balance validation needed');
        setBalanceError('');
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Customer
        </label>
        <select
          name="customer_id"
          value={formData.customer_id}
          onChange={handleChange}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select Customer</option>
          {customers.map(customer => (
            <option key={customer.customer_id} value={customer.customer_id}>
              {customer.first_name} {customer.last_name} ({customer.customer_id})
            </option>
          ))}
        </select>
      </div>


      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Account Type
        </label>
        <select
          name="acc_type_id"
          value={formData.acc_type_id}
          onChange={handleChange}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select Account Type</option>
          {accountTypes.map(type => (
            <option key={type.acc_type_id} value={type.acc_type_id}>
              {type.type_name}
            </option>
          ))}
          {/* Joint Account Options */}
          {accountTypes.map(type => (
            <option key={`joint-${type.acc_type_id}`} value={`joint-${type.acc_type_id}`}>
              {type.type_name} (Joint Account)
            </option>
          ))}
        </select>
      </div>

      {/* Joint Customers Selection - Show when joint account type is selected */}
      {formData.acc_type_id.startsWith('joint-') && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Additional Joint Customers
          </label>
          <div className="space-y-2 max-h-32 overflow-y-auto border border-gray-300 rounded-md p-2">
            {customers.filter(c => c.customer_id !== formData.customer_id).map(customer => (
              <label key={customer.customer_id} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.joint_customers.includes(customer.customer_id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setFormData(prev => ({
                        ...prev,
                        joint_customers: [...prev.joint_customers, customer.customer_id]
                      }));
                    } else {
                      setFormData(prev => ({
                        ...prev,
                        joint_customers: prev.joint_customers.filter(id => id !== customer.customer_id)
                      }));
                    }
                  }}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">
                  {customer.first_name} {customer.last_name} ({customer.customer_id})
                </span>
              </label>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Select additional customers for joint account ownership
          </p>
        </div>
      )}

      {!isAgent &&(
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Branch
          </label>
          <select
            name="branch_id"
            value={formData.branch_id}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select Branch</option>
            {branches.map(branch => (
              <option key={branch.branch_id} value={branch.branch_id}>
                {branch.name}
              </option>
            ))}
          </select>
        </div>
      )}
      
      {isAgent && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Branch
          </label>
          <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600">
            {branches.find(b => b.branch_id === agentBranchId)?.name || 'Your Assigned Branch'}
          </div>
          <p className="text-xs text-gray-500 mt-1">Branch is automatically set to your assigned branch</p>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Initial Balance (LKR)
          {selectedAccountType && (selectedAccountType.minimum_balance || selectedAccountType.acc_type_id === 'SAV001') && (
            <span className="text-red-500 ml-1">
              * (Min: LKR {(selectedAccountType.minimum_balance ? parseFloat(selectedAccountType.minimum_balance) : 1000).toLocaleString()})
            </span>
          )}
        </label>
        <input
          type="number"
          name="current_balance"
          value={formData.current_balance}
          onChange={handleChange}
          min={selectedAccountType?.minimum_balance || (selectedAccountType?.acc_type_id === 'SAV001' ? 1000 : 0)}
          step="0.01"
          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
            balanceError 
              ? 'border-red-300 focus:ring-red-500' 
              : 'border-gray-300 focus:ring-blue-500'
          }`}
        />
        {balanceError && (
          <p className="text-red-500 text-sm mt-1">{balanceError}</p>
        )}
        {selectedAccountType && (selectedAccountType.minimum_balance || selectedAccountType.acc_type_id === 'SAV001') && (
          <p className="text-gray-500 text-xs mt-1">
            Minimum balance for {selectedAccountType.type_name}: LKR {(selectedAccountType.minimum_balance ? parseFloat(selectedAccountType.minimum_balance) : 1000).toLocaleString()}
          </p>
        )}
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={() => {
            setFormData({ customer_id: '', acc_type_id: '', branch_id: '', current_balance: 0 });
            setSelectedAccountType(null);
            setBalanceError('');
          }}
          className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-md transition-colors duration-200"
        >
          Reset
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Creating...' : 'Create Account'}
        </button>
      </div>
    </form>
  );
};

export default Accounts;

