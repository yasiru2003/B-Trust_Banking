import React, { useState, useEffect } from 'react';
import { Users, TrendingUp } from 'lucide-react';
import ReportFilters from '../components/Reports/ReportFilters';
import ReportExport from '../components/Reports/ReportExport';
import BarChart from '../components/Charts/BarChart';
import PieChart from '../components/Charts/PieChart';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  useAgentTransactions,
  useBranches
} from '../hooks/useReports';
import toast from 'react-hot-toast';

const AgentPerformanceReport = () => {
  const [filters, setFilters] = useState({
    startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)),
    endDate: new Date(),
    branchId: null
  });

  // Fetch filter options
  const { data: branchesData } = useBranches();

  // Add filter options to filters state
  useEffect(() => {
    if (branchesData?.data) {
      setFilters(prev => ({ ...prev, branches: branchesData.data }));
    }
  }, [branchesData]);

  const { data, isLoading, error } = useAgentTransactions({
    startDate: filters.startDate?.toISOString().split('T')[0],
    endDate: filters.endDate?.toISOString().split('T')[0],
    branchId: filters.branchId
  });

  const handleResetFilters = () => {
    setFilters({
      startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)),
      endDate: new Date(),
      branchId: null,
      branches: filters.branches
    });
    toast.success('Filters reset');
  };

  if (isLoading) return <LoadingSpinner />;
  if (error) return <div className="text-red-600">Error loading report: {error.message}</div>;

  const reportData = data?.data || [];

  // Prepare chart data
  const chartData = reportData.slice(0, 10).map(item => ({
    name: item.employee_name,
    transactions: parseInt(item.total_transactions),
    value: parseFloat(item.total_value)
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center">
          <Users className="h-8 w-8 text-blue-600 mr-3" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Agent Performance Report</h1>
            <p className="text-gray-600 mt-1">
              Track agent transaction activity and performance metrics
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <ReportFilters
          filters={filters}
          setFilters={setFilters}
          availableFilters={['dateRange', 'branch']}
          onReset={handleResetFilters}
        />
      </div>

      {/* Report Content */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">Agent Transaction Performance</h2>
            <ReportExport reportType="agent-transactions" data={reportData} filters={filters} />
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-sm text-blue-600 font-medium">Total Agents</p>
              <p className="text-2xl font-bold text-blue-900">{reportData.length}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <p className="text-sm text-green-600 font-medium">Total Transactions</p>
              <p className="text-2xl font-bold text-green-900">
                {reportData.reduce((sum, item) => sum + parseInt(item.total_transactions || 0), 0).toLocaleString()}
              </p>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <p className="text-sm text-purple-600 font-medium">Total Value</p>
              <p className="text-2xl font-bold text-purple-900">
                ${reportData.reduce((sum, item) => sum + parseFloat(item.total_value || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="bg-yellow-50 rounded-lg p-4">
              <p className="text-sm text-yellow-600 font-medium">Avg per Agent</p>
              <p className="text-2xl font-bold text-yellow-900">
                ${reportData.length > 0 ? (reportData.reduce((sum, item) => sum + parseFloat(item.total_value || 0), 0) / reportData.length).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
              </p>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <BarChart
                data={chartData}
                dataKey="transactions"
                xAxisKey="name"
                title="Top 10 Agents by Transaction Count"
                color="#2563eb"
              />
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <PieChart
                data={chartData.slice(0, 5)}
                dataKey="value"
                nameKey="name"
                title="Top 5 Agents by Transaction Value"
              />
            </div>
          </div>

          {/* Data Table */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            {reportData.length === 0 ? (
              <div className="text-center py-12">
                <TrendingUp className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No transaction data found</h3>
                <p className="text-gray-500">Try adjusting your filters or check back later.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Agent</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Branch</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Transactions</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total Value</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Deposits</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Withdrawals</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Value</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {reportData.map((row, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{row.employee_name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.branch_name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{parseInt(row.total_transactions).toLocaleString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">${parseFloat(row.total_value).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{parseInt(row.deposits_count).toLocaleString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{parseInt(row.withdrawals_count).toLocaleString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">${parseFloat(row.avg_transaction_value).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
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

export default AgentPerformanceReport;
