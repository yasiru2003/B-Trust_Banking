import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import axios from 'axios';

const TransactionOTP = ({ 
  accountNumber, 
  transactionAmount, 
  customerName, 
  phoneNumber, 
  onVerified, 
  onCancel 
}) => {
  const [step, setStep] = useState('check'); // 'check', 'send', 'verify'
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const sendOTPMutation = useMutation({
    mutationFn: async (data) => {
      const response = await axios.post('/api/transaction-otp/send', data);
      return response.data;
    },
    onSuccess: () => {
      setStep('verify');
    },
    onError: (error) => {
      console.error('Failed to send OTP:', error);
      alert('Failed to send OTP. Please try again.');
    }
  });

  const verifyOTPMutation = useMutation({
    mutationFn: async (data) => {
      const response = await axios.post('/api/transaction-otp/verify', data);
      return response.data;
    },
    onSuccess: (data) => {
      if (data.success && data.data.verified) {
        onVerified && onVerified();
      } else {
        alert('Invalid OTP code. Please try again.');
      }
    },
    onError: (error) => {
      console.error('Failed to verify OTP:', error);
      alert('Failed to verify OTP. Please try again.');
    }
  });

  const handleSendOTP = () => {
    setIsLoading(true);
    sendOTPMutation.mutate({
      accountNumber,
      transactionAmount
    }, {
      onSettled: () => setIsLoading(false)
    });
  };

  const handleVerifyOTP = () => {
    if (!code || code.length !== 6) {
      alert('Please enter a valid 6-digit OTP');
      return;
    }
    
    setIsLoading(true);
    verifyOTPMutation.mutate({
      accountNumber,
      phoneNumber,
      code,
      transactionAmount
    }, {
      onSettled: () => setIsLoading(false)
    });
  };

  const handleResendOTP = () => {
    setCode('');
    setStep('send');
  };

  if (step === 'check') {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md max-w-md mx-auto">
        <h3 className="text-lg font-semibold mb-4 text-orange-600">OTP Required</h3>
        <div className="mb-4">
          <p className="text-gray-600 mb-2">
            Transaction amount: <strong>LKR {transactionAmount.toLocaleString()}</strong>
          </p>
          <p className="text-gray-600 mb-2">
            Account: <strong>{accountNumber}</strong>
          </p>
          <p className="text-gray-600 mb-2">
            Customer: <strong>{customerName}</strong>
          </p>
          <p className="text-sm text-gray-500">
            OTP verification is required for transactions over LKR 5,000
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setStep('send')}
            className="flex-1 bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700"
          >
            Send OTP
          </button>
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (step === 'send') {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md max-w-md mx-auto">
        <h3 className="text-lg font-semibold mb-4 text-orange-600">Send OTP</h3>
        <div className="mb-4">
          <p className="text-gray-600 mb-2">
            We'll send an OTP to the customer's registered phone number:
          </p>
          <p className="text-sm text-gray-500">
            {phoneNumber ? `***${phoneNumber.slice(-4)}` : 'Phone number not available'}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleSendOTP}
            disabled={isLoading || !phoneNumber}
            className="flex-1 bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700 disabled:opacity-50"
          >
            {isLoading ? 'Sending...' : 'Send OTP'}
          </button>
          <button
            onClick={() => setStep('check')}
            className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md max-w-md mx-auto">
      <h3 className="text-lg font-semibold mb-4 text-orange-600">Verify OTP</h3>
      <div className="mb-4">
        <p className="text-gray-600 mb-2">
          Enter the 6-digit OTP sent to the customer's phone
        </p>
        <p className="text-sm text-gray-500 mb-4">
          Transaction: LKR {transactionAmount.toLocaleString()}
        </p>
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="123456"
          className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500 text-center text-lg tracking-widest"
          maxLength={6}
        />
      </div>
      <div className="flex gap-3">
        <button
          onClick={handleVerifyOTP}
          disabled={isLoading || code.length !== 6}
          className="flex-1 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
        >
          {isLoading ? 'Verifying...' : 'Verify OTP'}
        </button>
        <button
          onClick={handleResendOTP}
          className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
        >
          Resend
        </button>
      </div>
      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
        <p className="text-blue-700 text-sm">
          <strong>Demo Mode:</strong> In demo mode, any 6-digit code will be accepted for verification.
        </p>
      </div>
    </div>
  );
};

export default TransactionOTP;






















