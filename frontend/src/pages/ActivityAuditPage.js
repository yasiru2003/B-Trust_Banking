import React from 'react';
import ActivityAudit from '../components/ActivityAudit';

const ActivityAuditPage = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Activity Audit
            </h1>
            <p className="text-gray-600 mt-1">Monitor and analyze system activities</p>
          </div>
        </div>
      </div>

      {/* Activity Audit Component */}
      <ActivityAudit />
    </div>
  );
};

export default ActivityAuditPage;
