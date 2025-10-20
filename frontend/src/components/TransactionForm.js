import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { DollarSign, User, CreditCard } from 'lucide-react';
import api from '../services/authService';
import toast from 'react-hot-toast';
import LoadingSpinner from './LoadingSpinner';

const TransactionForm = ({ onClose, onSuccess }) => {
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [requiresOTP, setRequiresOTP] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpCode, setOtpCode] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    reset,
  } = useForm({
    defaultValues: {
      transaction_type_id: '',
      amount: '',
      reference: '',
      customer_id: '',
      account_number: '',
      customer_phone: '',
    },
  });

  const transactionTypeId = watch('transaction_type_id');
  const customerId = watch('customer_id');
  const amount = watch('amount');
  const accountNumber = watch('account_number');

  // Fetch customers for dropdown
  const { data: customersData } = useQuery({
    queryKey: 'customers-for-transaction',
    queryFn: async () => {
      const response = await api.get('/customers?limit=100');
      return response.data;
    }
  });

  // Fetch transaction types
  const { data: transactionTypesData, error: transactionTypesError } = useQuery({
    queryKey: 'transaction-types',
    queryFn: async () => {
      const response = await api.get('/transactions/types');
      return response.data;
    },
    staleTime: 0, // Force fresh data every time
    cacheTime: 0  // Don't cache the data
  });

  // Log transaction types for debugging
  useEffect(() => {
    if (transactionTypesData) {
      console.log('Transaction types loaded:', transactionTypesData);
      console.log('All transaction types:', transactionTypesData.data);
      const filteredTypes = transactionTypesData.data?.filter(type => type.transaction_type_id.trim() !== 'INT001');
      console.log('Filtered transaction types (excluding INT001):', filteredTypes);
      console.log('Transaction type IDs with spaces:', transactionTypesData.data?.map(t => `"${t.transaction_type_id}"`));
    }
    if (transactionTypesError) {
      console.error('Error loading transaction types:', transactionTypesError);
    }
  }, [transactionTypesData, transactionTypesError]);

  // Fetch accounts for the selected customer
  const { data: accountsData, error: accountsError } = useQuery({
    queryKey: ['customer-accounts', customerId],
    queryFn: async () => {
      if (!customerId) return { data: [] };
      const response = await api.get(`/accounts/customer/${customerId}`);
      return response.data;
    },
    enabled: !!customerId,
  });

  // Log accounts for debugging
  useEffect(() => {
    if (accountsData) {
      console.log('Customer accounts loaded:', accountsData);
    }
    if (accountsError) {
      console.error('Error loading customer accounts:', accountsError);
    }
  }, [accountsData, accountsError]);

  // Create transaction mutation
  const createTransactionMutation = useMutation({
    mutationFn: async (transactionData) => {
      const response = await api.post('/transactions', transactionData);
      return response.data;
    },
    onSuccess: (data) => {
        queryClient.invalidateQueries('transactions');
        queryClient.invalidateQueries('transaction-stats');
        queryClient.invalidateQueries('accounts');
        queryClient.invalidateQueries(['accounts', 'agent']);
        queryClient.invalidateQueries(['accounts', 'manager']);
        queryClient.invalidateQueries('customer-accounts');
        queryClient.invalidateQueries('accounts-stats');
        queryClient.invalidateQueries('dashboard');
        toast.success('Transaction created successfully');
        reset();
        onClose();
        if (onSuccess) onSuccess(data);
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to create transaction');
      },
    }
  );

  const customers = customersData?.data || [];
  const accounts = accountsData?.data || [];

  // Real-time validation for insufficient funds
  const getInsufficientFundsError = () => {
    if (!amount || !accountNumber || !transactionTypeId) return null;
    
    const transactionAmount = parseFloat(amount.replace(/,/g, ''));
    const selectedAccount = accounts.find(a => a.account_number === accountNumber);
    
    if (!selectedAccount || isNaN(transactionAmount)) return null;
    
    const currentBalance = parseFloat(selectedAccount.current_balance || 0);
    
    // Only check for withdrawals
    if (transactionTypeId.trim() === 'WIT001' && transactionAmount > currentBalance) {
      return `Insufficient funds. Available balance: LKR ${currentBalance.toLocaleString()}, Required: LKR ${transactionAmount.toLocaleString()}`;
    }
    
    return null;
  };

  const insufficientFundsError = getInsufficientFundsError();

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      console.log('Raw form data:', data);
      console.log('Form data keys:', Object.keys(data));
      console.log('Form data values:', Object.values(data));
      
      // Only send the fields that the backend expects
      const transactionData = {
        transaction_type_id: data.transaction_type_id,
        account_number: data.account_number,
        amount: parseFloat(data.amount.replace(/,/g, '')), // Remove commas before parsing
        reference: data.reference || '',
        customer_phone: data.customer_phone || ''
      };
      
      console.log('Submitting transaction data:', transactionData);
      console.log('Transaction data keys:', Object.keys(transactionData));
      console.log('Transaction data values:', Object.values(transactionData));
      console.log('Amount type:', typeof transactionData.amount);
      console.log('Amount value:', transactionData.amount);
      console.log('Is amount valid number?', !isNaN(transactionData.amount));
      
      // Validate required fields before sending
      if (!transactionData.transaction_type_id) {
        toast.error('Please select a transaction type');
        return;
      }
      if (!transactionData.account_number) {
        toast.error('Please select an account');
        return;
      }
      if (!transactionData.amount || isNaN(transactionData.amount) || transactionData.amount <= 0) {
        toast.error('Please enter a valid amount (numbers only, no commas)');
        return;
      }

      // Check if OTP is required for large transactions
      if (transactionData.amount > 5000 && !otpVerified) {
        toast.error('OTP verification required for transactions over 5,000 LKR');
        setRequiresOTP(true);
        return;
      }

      // Add OTP verification status to transaction data
      if (otpVerified) {
        transactionData.otpVerified = true;
      }
      
      await createTransactionMutation.mutateAsync(transactionData);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCustomerChange = (customerId) => {
    setValue('customer_id', customerId);
    setValue('account_number', ''); // Reset account selection
    setSelectedCustomer(customers.find(c => c.customer_id === customerId));
    setSelectedAccount(null);
  };

  const handleAccountChange = (accountNumber) => {
    setValue('account_number', accountNumber);
    setSelectedAccount(accounts.find(a => a.account_number === accountNumber));
  };

  const sendOTP = async () => {
    try {
      const amount = parseFloat(watch('amount').replace(/,/g, ''));
      const accountNumber = watch('account_number');
      
      if (!accountNumber || !amount) {
        toast.error('Please select an account and enter amount first');
        return;
      }

      const response = await api.post('/transaction-otp/send', {
        accountNumber,
        transactionAmount: amount
      });

      if (response.data.success) {
        toast.success('OTP sent successfully!');
      } else {
        toast.error(response.data.message || 'Failed to send OTP');
      }
    } catch (error) {
      console.error('Send OTP error:', error);
      toast.error('Failed to send OTP');
    }
  };

  const verifyOTP = async () => {
    try {
      const amount = parseFloat(watch('amount').replace(/,/g, ''));
      const accountNumber = watch('account_number');
      const customerPhone = selectedCustomer?.phone_number;
      
      if (!accountNumber || !amount || !customerPhone || !otpCode) {
        toast.error('Please fill all required fields');
        return;
      }

      // Format phone number for international use (same as backend)
      const formatPhoneNumber = (phoneNumber) => {
        const cleaned = phoneNumber.replace(/\D/g, '');
        if (cleaned.startsWith('0')) {
          return '+94' + cleaned.substring(1);
        }
        if (!cleaned.startsWith('+')) {
          return '+94' + cleaned;
        }
        return '+' + cleaned;
      };

      const formattedPhone = formatPhoneNumber(customerPhone);
      console.log('Sending verification with formatted phone:', formattedPhone);

      const response = await api.post('/transaction-otp/verify', {
        accountNumber,
        phoneNumber: formattedPhone,
        code: otpCode,
        transactionAmount: amount
      });

      if (response.data.success) {
        setOtpVerified(true);
        toast.success('OTP verified successfully!');
      } else {
        toast.error(response.data.message || 'Invalid OTP');
      }
    } catch (error) {
      console.error('Verify OTP error:', error);
      toast.error('Failed to verify OTP');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Transaction Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Transaction Type *
        </label>
        <select
          {...register('transaction_type_id', { required: 'Transaction type is required' })}
          className="input w-full"
        >
          <option value="">Select transaction type</option>
          {transactionTypesData?.data?.filter(type => type.transaction_type_id.trim() !== 'INT001').map((type) => (
            <option key={type.transaction_type_id} value={type.transaction_type_id}>
              {type.type_name}
            </option>
          ))}
        </select>
        {errors.transaction_type_id && (
          <p className="text-red-500 text-xs mt-1">{errors.transaction_type_id.message}</p>
        )}
      </div>

      {/* Customer Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Customer *
        </label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <select
            {...register('customer_id', { required: 'Customer is required' })}
            onChange={(e) => handleCustomerChange(e.target.value)}
            className="input w-full pl-10"
          >
            <option value="">Select a customer</option>
            {customers.map((customer) => (
              <option key={customer.customer_id} value={customer.customer_id}>
                {customer.first_name} {customer.last_name} - {customer.nic_number}
              </option>
            ))}
          </select>
        </div>
        {errors.customer_id && (
          <p className="text-red-500 text-xs mt-1">{errors.customer_id.message}</p>
        )}
      </div>

      {/* Account Number */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Account Number *
        </label>
        <div className="relative">
          <CreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <select
            {...register('account_number', { required: 'Account number is required' })}
            className="input w-full pl-10"
            disabled={!customerId}
          >
            <option value="">Select an account</option>
            {accounts.map((account) => (
              <option key={account.account_number} value={account.account_number}>
                {account.account_number} - {account.account_type} (LKR {parseFloat(account.current_balance || 0).toLocaleString()})
              </option>
            ))}
          </select>
        </div>
        {errors.account_number && (
          <p className="text-red-500 text-xs mt-1">{errors.account_number.message}</p>
        )}
        {!customerId && (
          <p className="text-gray-500 text-xs mt-1">Please select a customer first</p>
        )}
      </div>

      {/* Amount */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Amount (LKR) *
        </label>
        <div className="relative">
          <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="number"
            step="0.01"
            min="0.01"
            {...register('amount', { 
              required: 'Amount is required',
              min: { value: 0.01, message: 'Amount must be greater than 0' },
              max: { value: 1000000, message: 'Amount cannot exceed LKR 1,000,000' }
            })}
            className={`input w-full pl-10 ${insufficientFundsError ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
            placeholder="0.00"
            title={insufficientFundsError || "Enter the transaction amount"}
          />
        </div>
        {errors.amount && (
          <p className="text-red-500 text-xs mt-1">{errors.amount.message}</p>
        )}
        {insufficientFundsError && (
          <p className="text-red-500 text-xs mt-1">{insufficientFundsError}</p>
        )}
      </div>

      {/* OTP Verification for Large Transactions */}
      {watch('amount') && parseFloat(watch('amount').replace(/,/g, '')) > 5000 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center mb-3">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                OTP Verification Required
              </h3>
              <p className="text-sm text-yellow-700 mt-1">
                Transactions over 5,000 LKR require OTP verification
              </p>
            </div>
          </div>
          
          {!otpVerified ? (
            <div className="space-y-3">
              <button
                type="button"
                onClick={sendOTP}
                className="btn btn-secondary text-sm"
                disabled={!watch('account_number') || !watch('amount')}
              >
                Send OTP
              </button>
              
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  placeholder="Enter 6-digit OTP"
                  className="input flex-1"
                  maxLength="6"
                />
                <button
                  type="button"
                  onClick={verifyOTP}
                  className="btn btn-primary text-sm"
                  disabled={!otpCode || otpCode.length !== 6}
                >
                  Verify
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center text-green-600">
              <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-medium">OTP Verified Successfully</span>
            </div>
          )}
        </div>
      )}

      {/* Reference */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Reference
        </label>
        <input
          type="text"
          {...register('reference')}
          className="input w-full"
          placeholder="Enter transaction reference (optional)"
        />
      </div>

      {/* Customer Phone (for SMS notifications) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Customer Phone (for SMS notification)
        </label>
        <input
          type="tel"
          {...register('customer_phone', {
            pattern: {
              value: /^[0-9]{10}$/,
              message: 'Phone number must be 10 digits'
            }
          })}
          className="input w-full"
          placeholder="Enter customer phone number (optional)"
        />
        {errors.customer_phone && (
          <p className="text-red-500 text-xs mt-1">{errors.customer_phone.message}</p>
        )}
      </div>

      {/* Account Balance Display */}
      {selectedAccount && (
        <div className={`border rounded-lg p-4 ${insufficientFundsError ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-medium ${insufficientFundsError ? 'text-red-900' : 'text-blue-900'}`}>Current Balance</p>
              <p className={`text-2xl font-bold ${insufficientFundsError ? 'text-red-600' : 'text-blue-600'}`}>
                LKR {selectedAccount.current_balance?.toLocaleString() || '0'}
              </p>
            </div>
            <div className="text-right">
              <p className={`text-sm ${insufficientFundsError ? 'text-red-700' : 'text-blue-700'}`}>Account Type</p>
              <p className={`font-medium ${insufficientFundsError ? 'text-red-900' : 'text-blue-900'}`}>{selectedAccount.account_type}</p>
            </div>
          </div>
          {insufficientFundsError && (
            <div className="mt-3 p-2 bg-red-100 border border-red-300 rounded">
              <p className="text-sm text-red-800 font-medium">⚠️ Insufficient Funds</p>
              <p className="text-xs text-red-700 mt-1">You cannot withdraw more than the available balance.</p>
            </div>
          )}
        </div>
      )}

      {/* Transaction Limits Warning */}
      {transactionTypeId === '2' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                Withdrawal Limit
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>Agent withdrawal limit: LKR 50,000 per transaction</p>
                <p>Large transactions may require manager approval</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Form Actions */}
      <div className="flex justify-end space-x-3 pt-4 border-t">
        <button
          type="button"
          onClick={onClose}
          className="btn btn-outline"
          disabled={isSubmitting}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={isSubmitting || insufficientFundsError}
        >
          {isSubmitting ? (
            <>
              <LoadingSpinner size="sm" />
              <span className="ml-2">Processing...</span>
            </>
          ) : (
            'Create Transaction'
          )}
        </button>
      </div>
    </form>
  );
};

export default TransactionForm;

