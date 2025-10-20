import React, { useState } from 'react';
import { Calendar, Filter, X } from 'lucide-react';

const ReportFilters = ({ 
  filters, 
  onFiltersChange, 
  onApplyFilters, 
  onClearFilters,
  setFilters, // alias used by AdvancedReports
  availableFilters, // currently not used; reserved for future conditional rendering
  onReset, // alias for clear/reset
  isLoading = false 
}) => {
  // Normalize incoming filters to support both {dateRange:{startDate,endDate}} and flat {startDate,endDate}
  const buildNormalizedFilters = (source) => {
    const base = {
      dateRange: { startDate: '', endDate: '' },
      branchId: '',
      agentId: '',
      accountType: '',
      status: ''
    };
    if (!source) return base;
    const normalized = { ...base, ...source };
    if (!source.dateRange) {
      const start = source.startDate instanceof Date ? source.startDate.toISOString().slice(0, 10) : (source.startDate || '');
      const end = source.endDate instanceof Date ? source.endDate.toISOString().slice(0, 10) : (source.endDate || '');
      normalized.dateRange = { startDate: start, endDate: end };
    } else {
      const sd = source.dateRange.startDate instanceof Date ? source.dateRange.startDate.toISOString().slice(0, 10) : (source.dateRange.startDate || '');
      const ed = source.dateRange.endDate instanceof Date ? source.dateRange.endDate.toISOString().slice(0, 10) : (source.dateRange.endDate || '');
      normalized.dateRange = { startDate: sd, endDate: ed };
    }
    return normalized;
  };

  const [localFilters, setLocalFilters] = useState(buildNormalizedFilters(filters));

  // Prefer explicit handler, fall back to setFilters if provided
  const changeHandler = onFiltersChange || setFilters;

  const handleFilterChange = (key, value) => {
    const newFilters = { ...localFilters };
    
    if (key.includes('.')) {
      const [parent, child] = key.split('.');
      newFilters[parent] = { ...newFilters[parent], [child]: value };
    } else {
      newFilters[key] = value;
    }
    
    setLocalFilters(newFilters);
  };

  const handleApply = () => {
    changeHandler?.(localFilters);
    onApplyFilters?.(localFilters);
  };

  const handleClear = () => {
    const clearedFilters = {
      dateRange: { startDate: '', endDate: '' },
      branchId: '',
      agentId: '',
      accountType: '',
      status: ''
    };
    setLocalFilters(clearedFilters);
    changeHandler?.(clearedFilters);
    onClearFilters?.(clearedFilters);
    onReset?.();
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Filter className="h-5 w-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">Report Filters</h3>
        </div>
        <button
          onClick={handleClear}
          className="flex items-center space-x-1 text-sm text-gray-600 hover:text-gray-800"
        >
          <X className="h-4 w-4" />
          <span>Clear All</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Date Range */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Start Date
          </label>
          <input
            type="date"
            value={localFilters?.dateRange?.startDate || ''}
            onChange={(e) => handleFilterChange('dateRange.startDate', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            End Date
          </label>
          <input
            type="date"
            value={localFilters?.dateRange?.endDate || ''}
            onChange={(e) => handleFilterChange('dateRange.endDate', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Branch Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Branch
          </label>
          <select
            value={localFilters.branchId}
            onChange={(e) => handleFilterChange('branchId', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Branches</option>
            <option value="BR001">Main Branch</option>
            <option value="BR002">Downtown Branch</option>
            <option value="BR003">Suburban Branch</option>
          </select>
        </div>

        {/* Agent Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Agent
          </label>
          <select
            value={localFilters.agentId}
            onChange={(e) => handleFilterChange('agentId', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Agents</option>
            <option value="AG001">John Smith</option>
            <option value="AG002">Jane Doe</option>
            <option value="AG003">Mike Johnson</option>
          </select>
        </div>

        {/* Account Type Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Account Type
          </label>
          <select
            value={localFilters.accountType}
            onChange={(e) => handleFilterChange('accountType', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Types</option>
            <option value="SAVINGS">Savings</option>
            <option value="CHECKING">Checking</option>
            <option value="FIXED_DEPOSIT">Fixed Deposit</option>
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Status
          </label>
          <select
            value={localFilters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="SUSPENDED">Suspended</option>
          </select>
        </div>
      </div>

      <div className="flex justify-end mt-4 space-x-3">
        <button
          onClick={handleClear}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Clear
        </button>
        <button
          onClick={handleApply}
          disabled={isLoading}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Applying...' : 'Apply Filters'}
        </button>
      </div>
    </div>
  );
};

export default ReportFilters;
