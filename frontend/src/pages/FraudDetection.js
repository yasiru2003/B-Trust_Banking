import React from 'react';
import { Shield } from 'lucide-react';

const FraudDetection = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Fraud Detection</h1>
        <p className="text-gray-600">Monitor and manage fraud alerts</p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center py-12">
          <Shield className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Fraud Detection System</h3>
          <p className="text-gray-500">Fraud detection features coming soon...</p>
        </div>
      </div>
    </div>
  );
};

export default FraudDetection;


