import React, { useState, useEffect } from 'react';
import { PiggyBank } from 'lucide-react';
import ReportFilters from '../components/Reports/ReportFilters';
import ReportExport from '../components/Reports/ReportExport';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  useActiveFDs,
  useBranches,
  useFDTypes
} from '../hooks/useReports';
import toast from 'react-hot-toast';

const ActiveFDReport = () => {
  const [filters, setFilters] = useState({
    branchId: null,
    fdType: null,
    autoRenewal: undefined
  });

  // Fetch filter options
  const { data: branchesData } = useBranches();
  const { data: fdTypesData } = useFDTypes();

  // Add filter options to filters state
  useEffect(() => {
    if (branchesData?.data) {
      setFilters(prev => ({ ...prev, branches: branchesData.data }));
    }
  }, [branchesData]);

  useEffect(() => {
    if (fdTypesData?.data) {
      setFilters(prev => ({ ...prev, fdTypes: fdTypesData.data }));
    }
  }, [fdTypesData]);

  const { data, isLoading, error } = useActiveFDs({
    branchId: filters.branchId,
    fdType: filters.fdType,
    autoRenewal: filters.autoRenewal
  });

  const handleResetFilters = () => {
    setFilters({
      branchId: null,
      fdType: null,
      autoRenewal: undefined,
      branches: filters.branches,
      fdTypes: filters.fdTypes
    });
    toast.success('Filters reset');
  };

  if (isLoading) return <LoadingSpinner />;
  if (error) return <div className="text-red-600">Error loading report: {error.message}</div>;

  const reportData = data?.data || [];

  // Categorize FDs by maturity
  const maturingSoon = reportData.filter(fd => parseInt(fd.days_to_maturity) <= 30 && parseInt(fd.days_to_maturity) > 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center">
          <PiggyBank className="h-8 w-8 text-purple-600 mr-3" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Active Fixed Deposits Report</h1>
            <p className="text-gray-600 mt-1">
              Track active FDs with maturity monitoring and alerts
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <ReportFilters
          filters={filters}
          setFilters={setFilters}
          availableFilters={['branch', 'fdType', 'autoRenewal']}
          onReset={handleResetFilters}
        />
      </div>

      {/* Report Content */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">Active FD Status Report</h2>
            <ReportExport reportType="active-fds" data={reportData} filters={filters} />
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-sm text-blue-600 font-medium">Total Active FDs</p>
              <p className="text-2xl font-bold text-blue-900">{reportData.length}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <p className="text-sm text-green-600 font-medium">Total Principal</p>
              <p className="text-2xl font-bold text-green-900">
                ${reportData.reduce((sum, item) => sum + parseFloat(item.principal_amount || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <p className="text-sm text-purple-600 font-medium">Maturity Value</p>
              <p className="text-2xl font-bold text-purple-900">
                ${reportData.reduce((sum, item) => sum + parseFloat(item.maturity_amount || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="bg-yellow-50 rounded-lg p-4">
              <p className="text-sm text-yellow-600 font-medium">Maturing Soon (30d)</p>
              <p className="text-2xl font-bold text-yellow-900">{maturingSoon.length}</p>
            </div>
          </div>

          {/* Alert for maturing FDs */}
          {maturingSoon.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                ⚠️ <strong>{maturingSoon.length}</strong> fixed deposit(s) maturing within the next 30 days require attention.
              </p>
            </div>
          )}

          {/* Data Table */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            {reportData.length === 0 ? (
              <div className="text-center py-12">
                <PiggyBank className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No active FDs found</h3>
                <p className="text-gray-500">Try adjusting your filters or check back later.</p>
                <p className="text-sm text-gray-400 mt-2">Note: This report may return empty if the database schema is not yet configured.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">FD Number</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Principal</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Rate %</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Maturity Date</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Days Left</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Maturity Amount</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {reportData.map((row, index) => {
                      const daysLeft = parseInt(row.days_to_maturity);
                      const isMaturing = daysLeft <= 30 && daysLeft > 0;

                      return (
                        <tr key={index} className={`hover:bg-gray-50 ${isMaturing ? 'bg-yellow-50' : ''}`}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{row.fd_number}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.customer_name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.fd_type_name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">${parseFloat(row.principal_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{parseFloat(row.interest_rate).toFixed(2)}%</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">{new Date(row.maturity_date).toLocaleDateString()}</td>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${isMaturing ? 'text-yellow-600' : 'text-gray-900'}`}>
                            {daysLeft}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">${parseFloat(row.maturity_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActiveFDReport;
