import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CreditCard, User, Building, DollarSign } from 'lucide-react';
import api from '../services/authService';
import toast from 'react-hot-toast';
import LoadingSpinner from './LoadingSpinner';

const AccountForm = ({ customers = [], accountTypes = [], branches = [], onSubmit, isLoading = false }) => {
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch
  } = useForm({
    defaultValues: {
      customer_id: '',
      acc_type_id: '',
      branch_id: '',
      current_balance: 0
    }
  });

  const selectedAccountType = watch('acc_type_id');
  const selectedAccountTypeData = accountTypes.find(type => type.acc_type_id === selectedAccountType);

  // Create account mutation
  const createAccountMutation = useMutation({
    mutationFn: async (accountData) => {
      const response = await api.post('/accounts', accountData);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries('accounts');
      queryClient.invalidateQueries('customers');
      toast.success('Account created successfully');
      reset();
      if (onSubmit) onSubmit(data);
    },
    onError: (error) => {
      console.error('Create account error:', error);
      const message = error.response?.data?.message || 'Failed to create account';
      toast.error(message);
    }
  });

  const onFormSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      await createAccountMutation.mutateAsync(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="flex items-center mb-6">
        <CreditCard className="h-8 w-8 text-blue-600 mr-3" />
        <h2 className="text-2xl font-bold text-gray-900">Open New Account</h2>
      </div>

      <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
        {/* Customer Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <User className="h-4 w-4 inline mr-1" />
            Select Customer *
          </label>
          <select
            {...register('customer_id', { required: 'Customer is required' })}
            className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.customer_id ? 'border-red-500' : 'border-gray-300'
            }`}
          >
            <option value="">Choose a customer...</option>
            {customers.map((customer) => (
              <option key={customer.customer_id} value={customer.customer_id}>
                {customer.first_name} {customer.last_name} ({customer.customer_id})
              </option>
            ))}
          </select>
          {errors.customer_id && (
            <p className="mt-1 text-sm text-red-600">{errors.customer_id.message}</p>
          )}
        </div>

        {/* Account Type Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <CreditCard className="h-4 w-4 inline mr-1" />
            Account Type *
          </label>
          <select
            {...register('acc_type_id', { required: 'Account type is required' })}
            className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.acc_type_id ? 'border-red-500' : 'border-gray-300'
            }`}
          >
            <option value="">Choose account type...</option>
            {accountTypes.map((type) => (
              <option key={type.acc_type_id} value={type.acc_type_id}>
                {type.type_name}
                {type.minimum_balance && ` (Min: LKR ${parseFloat(type.minimum_balance).toLocaleString()})`}
                {type.interest_rate && ` (${type.interest_rate}% interest)`}
              </option>
            ))}
          </select>
          {errors.acc_type_id && (
            <p className="mt-1 text-sm text-red-600">{errors.acc_type_id.message}</p>
          )}
          
          {/* Account Type Details */}
          {selectedAccountTypeData && (
            <div className="mt-2 p-3 bg-blue-50 rounded-md">
              <h4 className="font-medium text-blue-900">{selectedAccountTypeData.type_name}</h4>
              <div className="text-sm text-blue-700 mt-1">
                {selectedAccountTypeData.minimum_balance && (
                  <p>Minimum Balance: LKR {parseFloat(selectedAccountTypeData.minimum_balance).toLocaleString()}</p>
                )}
                {selectedAccountTypeData.interest_rate && (
                  <p>Interest Rate: {selectedAccountTypeData.interest_rate}%</p>
                )}
                {selectedAccountTypeData.minimum_age && (
                  <p>Minimum Age: {selectedAccountTypeData.minimum_age} years</p>
                )}
                {selectedAccountTypeData.withdrawal_limit && (
                  <p>Withdrawal Limit: LKR {parseFloat(selectedAccountTypeData.withdrawal_limit).toLocaleString()}</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Branch Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Building className="h-4 w-4 inline mr-1" />
            Branch
          </label>
          <select
            {...register('branch_id')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Auto-assign to your branch</option>
            {branches.map((branch) => (
              <option key={branch.branch_id} value={branch.branch_id}>
                {branch.name}
              </option>
            ))}
          </select>
          <p className="mt-1 text-sm text-gray-500">
            If not selected, will be assigned to your branch automatically
          </p>
        </div>

        {/* Initial Balance */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <DollarSign className="h-4 w-4 inline mr-1" />
            Initial Balance (LKR)
          </label>
          <input
            type="number"
            {...register('current_balance', { 
              min: { value: 0, message: 'Balance cannot be negative' },
              valueAsNumber: true
            })}
            min="0"
            step="100"
            className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.current_balance ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Enter initial balance (optional)"
          />
          {errors.current_balance && (
            <p className="mt-1 text-sm text-red-600">{errors.current_balance.message}</p>
          )}
          {selectedAccountTypeData?.minimum_balance && (
            <p className="mt-1 text-sm text-gray-500">
              Minimum required: LKR {parseFloat(selectedAccountTypeData.minimum_balance).toLocaleString()}
            </p>
          )}
        </div>

        {/* Submit Button */}
        <div className="flex justify-end space-x-3 pt-6">
          <button
            type="button"
            onClick={() => reset()}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            Reset
          </button>
          <button
            type="submit"
            disabled={isSubmitting || isLoading}
            className="px-6 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {isSubmitting || isLoading ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Creating Account...
              </>
            ) : (
              'Create Account'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AccountForm;
