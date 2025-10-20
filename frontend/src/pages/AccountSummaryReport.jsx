import React, { useState, useEffect } from 'react';
import { FileText, Download } from 'lucide-react';
import ReportFilters from '../components/Reports/ReportFilters';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  useAccountSummary,
  useBranches,
  useAccountTypes
} from '../hooks/useReports';
import toast from 'react-hot-toast';

const AccountSummaryReport = () => {
  const [filters, setFilters] = useState({
    startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)),
    endDate: new Date(),
    branchId: null,
    accountType: null,
    accountStatus: undefined,
    minBalance: null
  });

  // Fetch filter options
  const { data: branchesData } = useBranches();
  const { data: accountTypesData } = useAccountTypes();

  // Add filter options to filters state
  useEffect(() => {
    if (branchesData?.data) {
      setFilters(prev => ({ ...prev, branches: branchesData.data }));
    }
  }, [branchesData]);

  useEffect(() => {
    if (accountTypesData?.data) {
      setFilters(prev => ({ ...prev, accountTypes: accountTypesData.data }));
    }
  }, [accountTypesData]);

  const { data, isLoading, error } = useAccountSummary({
    startDate: filters.startDate?.toISOString().split('T')[0],
    endDate: filters.endDate?.toISOString().split('T')[0],
    branchId: filters.branchId,
    accountType: filters.accountType,
    accountStatus: filters.accountStatus,
    minBalance: filters.minBalance
  });

  const handleResetFilters = () => {
    setFilters({
      startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)),
      endDate: new Date(),
      branchId: null,
      accountType: null,
      accountStatus: undefined,
      minBalance: null,
      branches: filters.branches,
      accountTypes: filters.accountTypes
    });
    toast.success('Filters reset');
  };

  if (isLoading) return <LoadingSpinner />;
  if (error) return <div className="text-red-600">Error loading report: {error.message}</div>;

  const reportData = data?.data || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center">
          <FileText className="h-8 w-8 text-blue-600 mr-3" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Account-wise Transaction Summary</h1>
            <p className="text-gray-600 mt-1">
              Comprehensive account analysis with balances and transaction history
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <ReportFilters
          filters={filters}
          setFilters={setFilters}
          availableFilters={['dateRange', 'branch', 'accountType', 'accountStatus', 'minBalance']}
          onReset={handleResetFilters}
        />
      </div>

      {/* Report Content */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">Account Summary Report</h2>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-sm text-blue-600 font-medium">Total Accounts</p>
              <p className="text-2xl font-bold text-blue-900">{reportData.length}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <p className="text-sm text-green-600 font-medium">Total Balance</p>
              <p className="text-2xl font-bold text-green-900">
                LKR {reportData.reduce((sum, item) => sum + parseFloat(item.current_balance || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <p className="text-sm text-purple-600 font-medium">Total Deposits</p>
              <p className="text-2xl font-bold text-purple-900">
                LKR {reportData.reduce((sum, item) => sum + parseFloat(item.total_deposits || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="bg-red-50 rounded-lg p-4">
              <p className="text-sm text-red-600 font-medium">Total Withdrawals</p>
              <p className="text-2xl font-bold text-red-900">
                LKR {reportData.reduce((sum, item) => sum + parseFloat(item.total_withdrawals || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          {/* Interest Records Summary */}
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg p-6 border border-yellow-200">
            <h3 className="text-lg font-semibold text-yellow-800 mb-4 flex items-center">
              <span className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></span>
              Monthly Interest Calculations
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <p className="text-sm text-gray-600 font-medium">Total Monthly Interest</p>
                <p className="text-xl font-bold text-green-600">
                  LKR {reportData.reduce((sum, item) => {
                    const balance = parseFloat(item.current_balance || 0);
                    const rate = parseFloat(item.interest_rate || 0);
                    return sum + (balance * rate / 100 / 12); // Monthly interest
                  }, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <p className="text-sm text-gray-600 font-medium">Average Interest Rate</p>
                <p className="text-xl font-bold text-blue-600">
                  {reportData.length > 0 ? (reportData.reduce((sum, item) => sum + parseFloat(item.interest_rate || 0), 0) / reportData.length).toFixed(2) : 0}%
                </p>
              </div>
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <p className="text-sm text-gray-600 font-medium">Interest-Bearing Accounts</p>
                <p className="text-xl font-bold text-purple-600">
                  {reportData.filter(item => parseFloat(item.interest_rate || 0) > 0).length}
                </p>
              </div>
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <p className="text-sm text-gray-600 font-medium">Total Interest-Bearing Balance</p>
                <p className="text-xl font-bold text-orange-600">
                  LKR {reportData.reduce((sum, item) => {
                    const balance = parseFloat(item.current_balance || 0);
                    const rate = parseFloat(item.interest_rate || 0);
                    return rate > 0 ? sum + balance : sum;
                  }, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>

          {/* Interest by Account Type */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
            <h3 className="text-lg font-semibold text-blue-800 mb-4 flex items-center">
              <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
              Interest Calculations by Account Type
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-white">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account Type</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Interest Rate</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Accounts Count</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total Balance</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Monthly Interest</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Annual Interest</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {(() => {
                    // Group accounts by type and calculate interest
                    const groupedByType = reportData.reduce((acc, account) => {
                      const type = account.account_type || 'Unknown';
                      if (!acc[type]) {
                        acc[type] = {
                          type: type,
                          rate: parseFloat(account.interest_rate || 0),
                          count: 0,
                          totalBalance: 0,
                          monthlyInterest: 0
                        };
                      }
                      acc[type].count++;
                      acc[type].totalBalance += parseFloat(account.current_balance || 0);
                      acc[type].monthlyInterest += parseFloat(account.current_balance || 0) * parseFloat(account.interest_rate || 0) / 100 / 12;
                      return acc;
                    }, {});

                    return Object.values(groupedByType).map((group, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-sm font-medium text-gray-900">{group.type}</td>
                        <td className="px-4 py-2 text-sm text-right">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            group.rate > 0 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {group.rate.toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-4 py-2 text-sm text-right text-gray-900">{group.count}</td>
                        <td className="px-4 py-2 text-sm text-right text-gray-900">
                          LKR {group.totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-2 text-sm text-right font-medium text-green-600">
                          LKR {group.monthlyInterest.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-2 text-sm text-right font-medium text-blue-600">
                          LKR {(group.monthlyInterest * 12).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          </div>

          {/* Simple PDF Download Button */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">Account Summary Report</h3>
              </div>
              <button 
                onClick={() => {
                  toast.success('PDF download started!');
                  // Here you would implement the actual PDF download logic
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-md font-medium transition-colors flex items-center"
              >
                <Download className="h-4 w-4 mr-2" />
                Export PDF
              </button>
            </div>
          </div>

          {/* Data Table */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            {reportData.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No data found</h3>
                <p className="text-gray-500">Try adjusting your filters to see results.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account No</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Current Balance</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Deposits</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Withdrawals</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Interest Rate</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Monthly Interest</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {reportData.map((row, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{row.account_number}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.customer_name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.account_type}</td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${parseFloat(row.current_balance) < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                          LKR {parseFloat(row.current_balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">LKR {parseFloat(row.total_deposits).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">LKR {parseFloat(row.total_withdrawals).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            parseFloat(row.interest_rate || 0) > 0 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {parseFloat(row.interest_rate || 0).toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
                          {(() => {
                            const balance = parseFloat(row.current_balance || 0);
                            const rate = parseFloat(row.interest_rate || 0);
                            const monthlyInterest = balance * rate / 100 / 12;
                            return monthlyInterest > 0 ? (
                              <span className="text-green-600">
                                LKR {monthlyInterest.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </span>
                            ) : (
                              <span className="text-gray-400">LKR 0.00</span>
                            );
                          })()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${row.account_status ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {row.account_status ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                      </tr>
                    ))}
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

export default AccountSummaryReport;
