import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import api from '../services/authService';
import toast from 'react-hot-toast';

const PhoneVerification = ({ phoneNumber, onVerified, onCancel }) => {
  const [step, setStep] = useState('send'); // 'send' or 'verify'
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Convert international format to local format for backend
  const formatPhoneForBackend = (phone) => {
    // Remove all non-digits
    const cleaned = phone.replace(/\D/g, '');
    
    // If it starts with +94, remove +94 and add 0
    if (cleaned.startsWith('94')) {
      return '0' + cleaned.substring(2);
    }
    
    // If it already starts with 0, return as is
    if (cleaned.startsWith('0')) {
      return cleaned;
    }
    
    // If it's 9 digits, add 0 at the beginning
    if (cleaned.length === 9) {
      return '0' + cleaned;
    }
    
    // Return as is if it's already 10 digits
    return cleaned;
  };

  const sendVerificationMutation = useMutation({
    mutationFn: async (phone) => {
      const formattedPhone = formatPhoneForBackend(phone);
      console.log('Original phone:', phone, 'Formatted phone:', formattedPhone);
      const response = await api.post('/customers/verify-phone', {
        phone_number: formattedPhone
      });
      return response.data;
    },
    onSuccess: () => {
      setStep('verify');
      toast.success('Verification code sent');
    },
    onError: (error) => {
      console.error('Failed to send verification:', error);
      const statusCode = error.response?.status;
      const message = error.response?.data?.message || 'Failed to send verification code. Please try again.';
      if (statusCode === 409) {
        // Surface backend message like: "Phone number already registered with another customer"
        toast.error(message);
      } else {
        toast.error(message);
      }
    }
  });

  const verifyCodeMutation = useMutation({
    mutationFn: async ({ phone, code }) => {
      const formattedPhone = formatPhoneForBackend(phone);
      console.log('Verifying OTP for original phone:', phone, 'Formatted phone:', formattedPhone);
      const response = await api.post('/customers/verify-phone-otp', {
        phone_number: formattedPhone,
        otp_code: code
      });
      return response.data;
    },
    onSuccess: (data) => {
      if (data.success && data.data.verified) {
        onVerified && onVerified(phoneNumber);
        toast.success('Phone verified');
      } else {
        toast.error('Invalid verification code. Please try again.');
      }
    },
    onError: (error) => {
      console.error('Failed to verify code:', error);
      const message = error.response?.data?.message || 'Failed to verify code. Please try again.';
      toast.error(message);
    }
  });

  const handleSendCode = () => {
    setIsLoading(true);
    sendVerificationMutation.mutate(phoneNumber, {
      onSettled: () => setIsLoading(false)
    });
  };

  const handleVerifyCode = () => {
    if (!code || code.length !== 6) {
      alert('Please enter a valid 6-digit code');
      return;
    }
    
    setIsLoading(true);
    verifyCodeMutation.mutate({ phone: phoneNumber, code }, {
      onSettled: () => setIsLoading(false)
    });
  };

  const handleResendCode = () => {
    setStep('send');
    setCode('');
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md max-w-md mx-auto">
      <h3 className="text-lg font-semibold mb-4">Phone Verification</h3>
      
      {step === 'send' ? (
        <div>
          <p className="text-gray-600 mb-4">
            We'll send a verification code to <strong>{phoneNumber}</strong>
          </p>
          <div className="flex gap-3">
            <button
              onClick={handleSendCode}
              disabled={isLoading}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? 'Sending...' : 'Send Code'}
            </button>
            <button
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div>
          <p className="text-gray-600 mb-4">
            Enter the 6-digit code sent to <strong>{phoneNumber}</strong>
          </p>
          <div className="mb-4">
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="123456"
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-lg tracking-widest"
              maxLength={6}
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleVerifyCode}
              disabled={isLoading || code.length !== 6}
              className="flex-1 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
            >
              {isLoading ? 'Verifying...' : 'Verify Code'}
            </button>
            <button
              onClick={handleResendCode}
              className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
            >
              Resend
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PhoneVerification;


