import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import api from '../services/authService';
import toast from 'react-hot-toast';

const FDForm = ({ onSuccess, onCancel }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    customer_id: '',
    fd_type_id: '',
    principal_amount: '',
    source_account_number: '',
    auto_renew: false
  });
  const [errors, setErrors] = useState({});

  // Fetch customers assigned to the agent
  const { data: customersData, isLoading: customersLoading } = useQuery({
    queryKey: 'agent-customers',
    queryFn: async () => {
      const response = await api.get('/customers');
      return response.data;
    },
    enabled: !!user?.employee_id
  });

  // Fetch FD types
  const { data: fdTypesData, isLoading: fdTypesLoading } = useQuery({
    queryKey: 'fd-types',
    queryFn: async () => {
      const response = await api.get('/fixed-deposits/types');
      return response.data;
    }
  });

  // Fetch customer accounts when customer is selected
  const { data: customerAccountsData, isLoading: accountsLoading } = useQuery({
    queryKey: ['customer-accounts', formData.customer_id],
    queryFn: async () => {
      if (!formData.customer_id) return { data: [] };
      const response = await api.get(`/accounts/customer/${formData.customer_id}`);
      return response.data;
    },
    enabled: !!formData.customer_id
  });

  // Create FD mutation
  const createFDMutation = useMutation({
    mutationFn: async (fdData) => {
      const response = await api.post('/fixed-deposits', fdData);
      return response.data;
    },
    onSuccess: (data) => {
        queryClient.invalidateQueries('fixed-deposits');
        queryClient.invalidateQueries('accounts');
        onSuccess(data);
      },
      onError: (error) => {
        const errorMessage = error.response?.data?.message || 'Failed to open fixed deposit';
        toast.error(errorMessage);
        
        if (error.response?.data?.errors) {
          setErrors(
            error.response.data.errors.reduce((acc, err) => {
              const field = err.split(' ')[0].replace(/"/g, '');
              acc[field] = err;
              return acc;
            }, {})
          );
        }
      }
  });

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Real-time validation for principal amount
    if (name === 'principal_amount') {
      const amount = parseFloat(value);
      if (value && (isNaN(amount) || amount < 25000)) {
        setErrors(prev => ({
          ...prev,
          principal_amount: 'Minimum amount is LKR 25,000'
        }));
      } else {
        setErrors(prev => ({
          ...prev,
          principal_amount: ''
        }));
      }
    } else {
      // Clear error when user starts typing for other fields
      if (errors[name]) {
        setErrors(prev => ({
          ...prev,
          [name]: ''
        }));
      }
    }

    // Reset source account when customer changes
    if (name === 'customer_id') {
      setFormData(prev => ({
        ...prev,
        customer_id: value,
        source_account_number: ''
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    // Validation
    const newErrors = {};
    if (!formData.customer_id) newErrors.customer_id = 'Customer is required';
    if (!formData.fd_type_id) newErrors.fd_type_id = 'FD type is required';
    if (!formData.principal_amount || formData.principal_amount < 25000) {
      newErrors.principal_amount = 'Minimum amount is LKR 25,000';
    }
    if (!formData.source_account_number) newErrors.source_account_number = 'Source account is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Convert amount to number (remove commas if present)
    const fdData = {
      ...formData,
      principal_amount: parseFloat(formData.principal_amount.toString().replace(/,/g, ''))
    };
    
    console.log('Submitting FD data:', fdData);
    createFDMutation.mutate(fdData);
  };

  const customers = customersData?.data || [];
  const fdTypes = fdTypesData?.data || [];
  const customerAccounts = customerAccountsData?.data || [];

  const selectedFDType = fdTypes.find(type => type.fd_type_id === formData.fd_type_id);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Customer Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Customer *
          </label>
          <select
            name="customer_id"
            value={formData.customer_id}
            onChange={handleInputChange}
            className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
              errors.customer_id ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
            }`}
            disabled={customersLoading}
          >
            <option value="">Select Customer</option>
            {customers.map(customer => (
              <option key={customer.customer_id} value={customer.customer_id}>
                {customer.first_name} {customer.last_name} ({customer.customer_id})
              </option>
            ))}
          </select>
          {errors.customer_id && (
            <p className="mt-1 text-sm text-red-600">{errors.customer_id}</p>
          )}
        </div>

        {/* FD Type Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            FD Type *
          </label>
          <select
            name="fd_type_id"
            value={formData.fd_type_id}
            onChange={handleInputChange}
            className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
              errors.fd_type_id ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
            }`}
            disabled={fdTypesLoading}
          >
            <option value="">Select FD Type</option>
            {fdTypes.map(fdType => (
              <option key={fdType.fd_type_id} value={fdType.fd_type_id}>
                {fdType.type_name} - {fdType.interest_rate}% p.a. ({fdType.tenure_months} months)
              </option>
            ))}
          </select>
          {errors.fd_type_id && (
            <p className="mt-1 text-sm text-red-600">{errors.fd_type_id}</p>
          )}
        </div>

        {/* Principal Amount */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Principal Amount (LKR) *
          </label>
          <input
            type="number"
            name="principal_amount"
            value={formData.principal_amount}
            onChange={handleInputChange}
            min="25000"
            step="100"
            className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
              errors.principal_amount ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
            }`}
            placeholder="Enter amount (minimum LKR 25,000)"
            title="Minimum amount required is LKR 25,000"
          />
          {errors.principal_amount && (
            <p className="mt-1 text-sm text-red-600">{errors.principal_amount}</p>
          )}
          {selectedFDType && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Min: LKR {selectedFDType.minimum_amount?.toLocaleString() || '25,000'} | 
              Max: LKR {selectedFDType.maximum_amount?.toLocaleString() || 'No limit'}
            </p>
          )}
        </div>

        {/* Source Account */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Source Account *
          </label>
          <select
            name="source_account_number"
            value={formData.source_account_number}
            onChange={handleInputChange}
            className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
              errors.source_account_number ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
            }`}
            disabled={!formData.customer_id || accountsLoading}
          >
            <option value="">Select Source Account</option>
            {customerAccounts.map(account => (
              <option key={account.account_number} value={account.account_number}>
                {account.account_number} - {account.account_type} (Balance: LKR {account.current_balance?.toLocaleString()})
              </option>
            ))}
          </select>
          {errors.source_account_number && (
            <p className="mt-1 text-sm text-red-600">{errors.source_account_number}</p>
          )}
          {!formData.customer_id && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Please select a customer first</p>
          )}
        </div>
      </div>

      {/* Auto Renewal */}
      <div className="flex items-center">
        <input
          type="checkbox"
          name="auto_renew"
          checked={formData.auto_renew}
          onChange={handleInputChange}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
        />
        <label className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
          Auto-renewal on maturity
        </label>
      </div>

      {/* FD Details Preview */}
      {selectedFDType && formData.principal_amount && (
        <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-md p-4">
          <h4 className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-2">FD Details Preview</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-blue-700 dark:text-blue-300">Interest Rate:</span>
              <span className="ml-2 font-medium text-gray-900 dark:text-white">{selectedFDType.interest_rate}% p.a.</span>
            </div>
            <div>
              <span className="text-blue-700 dark:text-blue-300">Tenure:</span>
              <span className="ml-2 font-medium text-gray-900 dark:text-white">{selectedFDType.tenure_months} months</span>
            </div>
            <div>
              <span className="text-blue-700 dark:text-blue-300">Principal Amount:</span>
              <span className="ml-2 font-medium text-gray-900 dark:text-white">LKR {parseFloat(formData.principal_amount || 0).toLocaleString()}</span>
            </div>
            <div>
              <span className="text-blue-700 dark:text-blue-300">Estimated Interest:</span>
              <span className="ml-2 font-medium text-gray-900 dark:text-white">LKR {((parseFloat(formData.principal_amount || 0) * selectedFDType.interest_rate * selectedFDType.tenure_months) / (12 * 100)).toLocaleString()}</span>
            </div>
            <div className="col-span-2">
              <span className="text-blue-700 dark:text-blue-300">Maturity Amount:</span>
              <span className="ml-2 font-medium text-gray-900 dark:text-white">LKR {(parseFloat(formData.principal_amount || 0) + (parseFloat(formData.principal_amount || 0) * selectedFDType.interest_rate * selectedFDType.tenure_months) / (12 * 100)).toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}

      {/* Form Actions */}
      <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={createFDMutation.isLoading}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {createFDMutation.isLoading ? 'Opening FD...' : 'Open Fixed Deposit'}
        </button>
      </div>
    </form>
  );
};

export default FDForm;




