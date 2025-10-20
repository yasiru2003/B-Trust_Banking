import React, { useState } from 'react';
import PhoneVerification from '../components/PhoneVerification';

const PhoneVerificationTest = () => {
  const [phoneNumber, setPhoneNumber] = useState('+94760159557');
  const [showVerification, setShowVerification] = useState(false);
  const [verifiedPhone, setVerifiedPhone] = useState(null);

  const handleStartVerification = () => {
    if (!phoneNumber) {
      alert('Please enter a phone number');
      return;
    }
    setShowVerification(true);
  };

  const handleVerified = (phone) => {
    setVerifiedPhone(phone);
    setShowVerification(false);
    alert(`Phone number ${phone} has been verified successfully!`);
  };

  const handleCancel = () => {
    setShowVerification(false);
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-center mb-8">Phone Verification Test</h1>
        
        {!showVerification ? (
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Test Twilio Phone Verification</h2>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+94760159557"
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <button
              onClick={handleStartVerification}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Start Verification
            </button>
            
            {verifiedPhone && (
              <div className="mt-4 p-4 bg-green-100 border border-green-400 rounded">
                <p className="text-green-800">
                  ✅ <strong>{verifiedPhone}</strong> has been verified!
                </p>
              </div>
            )}
            
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded">
              <h3 className="font-semibold text-blue-800 mb-2">Demo Mode</h3>
              <p className="text-blue-700 text-sm">
                In demo mode, any 6-digit code will be accepted for verification.
                To use real Twilio verification, update the AUTH_TOKEN in the backend .env file.
              </p>
            </div>
          </div>
        ) : (
          <PhoneVerification
            phoneNumber={phoneNumber}
            onVerified={handleVerified}
            onCancel={handleCancel}
          />
        )}
      </div>
    </div>
  );
};

export default PhoneVerificationTest;






















