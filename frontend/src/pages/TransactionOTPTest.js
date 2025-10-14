import React, { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import axios from 'axios';
import TransactionOTP from '../components/TransactionOTP';

const TransactionOTPTest = () => {
  const [accountNumber, setAccountNumber] = useState('BT25874627528');
  const [transactionAmount, setTransactionAmount] = useState(10000);
  const [showOTP, setShowOTP] = useState(false);
  const [otpData, setOtpData] = useState(null);

  const checkOTPRequirementMutation = useMutation({
    mutationFn: async ({ accountNumber, transactionAmount }) => {
      const response = await axios.get('/api/transaction-otp/check', {
        params: { accountNumber, transactionAmount }
      });
      return response.data;
    },
    onSuccess: (data) => {
      if (data.requiresOTP) {
        setOtpData(data.data);
        setShowOTP(true);
      } else {
        alert('OTP not required for this transaction amount');
      }
    },
    onError: (error) => {
      console.error('Failed to check OTP requirement:', error);
      alert('Failed to check OTP requirement');
    }
  });

  const createTransactionMutation = useMutation({
    mutationFn: async (transactionData) => {
      const response = await axios.post('/api/transactions', {
        ...transactionData,
        otpVerified: true // Mark as OTP verified
      });
      return response.data;
    },
    onSuccess: (data) => {
      alert('Transaction created successfully!');
      setShowOTP(false);
      setOtpData(null);
    },
    onError: (error) => {
      console.error('Failed to create transaction:', error);
      alert('Failed to create transaction');
    }
  });

  const handleCheckOTP = () => {
    if (!accountNumber || !transactionAmount) {
      alert('Please enter account number and transaction amount');
      return;
    }
    
    checkOTPRequirementMutation.mutate({
      accountNumber,
      transactionAmount: parseFloat(transactionAmount)
    });
  };

  const handleOTPVerified = () => {
    // Create the transaction after OTP verification
    createTransactionMutation.mutate({
      transaction_type_id: 'WIT001',
      account_number: accountNumber,
      amount: parseFloat(transactionAmount),
      reference: 'OTP Test Transaction'
    });
  };

  const handleOTPCancel = () => {
    setShowOTP(false);
    setOtpData(null);
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-center mb-8">Transaction OTP Test</h1>
        
        {!showOTP ? (
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Test Transaction OTP Verification</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Account Number
                </label>
                <input
                  type="text"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="BT25874627528"
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Transaction Amount (LKR)
                </label>
                <input
                  type="number"
                  value={transactionAmount}
                  onChange={(e) => setTransactionAmount(e.target.value)}
                  placeholder="10000"
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-sm text-gray-500 mt-1">
                  OTP required for amounts over 5,000 LKR
                </p>
              </div>
            </div>
            
            <div className="mt-6">
              <button
                onClick={handleCheckOTP}
                disabled={checkOTPRequirementMutation.isPending}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {checkOTPRequirementMutation.isPending ? 'Checking...' : 'Check OTP Requirement'}
              </button>
            </div>
            
            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded">
              <h3 className="font-semibold text-yellow-800 mb-2">Test Scenarios:</h3>
              <ul className="text-yellow-700 text-sm space-y-1">
                <li>• Amount ≤ 5,000: No OTP required</li>
                <li>• Amount > 5,000: OTP verification required</li>
                <li>• Demo mode: Any 6-digit code accepted</li>
                <li>• Real SMS: Requires Twilio geo-permissions for Sri Lanka</li>
              </ul>
            </div>
          </div>
        ) : (
          <TransactionOTP
            accountNumber={otpData.accountNumber}
            transactionAmount={otpData.transactionAmount}
            customerName={otpData.customerName}
            phoneNumber={otpData.phoneNumber}
            onVerified={handleOTPVerified}
            onCancel={handleOTPCancel}
          />
        )}
      </div>
    </div>
  );
};

export default TransactionOTPTest;



