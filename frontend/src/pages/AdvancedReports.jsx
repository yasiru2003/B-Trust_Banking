import React, { useState, useEffect } from 'react';
import { FileText, TrendingUp, Users, PiggyBank, DollarSign } from 'lucide-react';
import ReportFilters from '../components/Reports/ReportFilters';
import ReportExport from '../components/Reports/ReportExport';
import BarChart from '../components/Charts/BarChart';
import LineChart from '../components/Charts/LineChart';
import PieChart from '../components/Charts/PieChart';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  useAgentTransactions,
  useAccountSummary,
  useActiveFDs,
  useInterestDistribution,
  useCustomerActivity,
  useBranches,
  useAccountTypes,
  useFDTypes,
  useAgents
} from '../hooks/useReports';
import toast from 'react-hot-toast';

const AdvancedReports = () => {
  const [activeTab, setActiveTab] = useState('agent-transactions');
  const [filters, setFilters] = useState({
    startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)),
    endDate: new Date(),
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    branchId: null,
    accountType: null,
    fdType: null,
    agentId: null,
    activityStatus: null,
    accountStatus: undefined,
    minBalance: null,
    autoRenewal: undefined
  });

  // Fetch filter options
  const { data: branchesData } = useBranches();
  const { data: accountTypesData } = useAccountTypes();
  const { data: fdTypesData } = useFDTypes();
  const { data: agentsData } = useAgents(filters.branchId);

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

  useEffect(() => {
    if (fdTypesData?.data) {
      setFilters(prev => ({ ...prev, fdTypes: fdTypesData.data }));
    }
  }, [fdTypesData]);

  useEffect(() => {
    if (agentsData?.data) {
      setFilters(prev => ({ ...prev, agents: agentsData.data }));
    }
  }, [agentsData]);

  const tabs = [
    { id: 'agent-transactions', label: 'Agent Transactions', icon: Users },
    { id: 'account-summary', label: 'Account Summary', icon: FileText },
    { id: 'active-fds', label: 'Active FDs', icon: PiggyBank },
    { id: 'interest-distribution', label: 'Interest Distribution', icon: DollarSign },
    { id: 'customer-activity', label: 'Customer Activity', icon: TrendingUp }
  ];

  const handleResetFilters = () => {
    setFilters({
      startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)),
      endDate: new Date(),
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
      branchId: null,
      accountType: null,
      fdType: null,
      agentId: null,
      activityStatus: null,
      accountStatus: undefined,
      minBalance: null,
      autoRenewal: undefined,
      branches: filters.branches,
      accountTypes: filters.accountTypes,
      fdTypes: filters.fdTypes,
      agents: filters.agents
    });
    toast.success('Filters reset');
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'agent-transactions':
        return <AgentTransactionsReport filters={filters} />;
      case 'account-summary':
        return <AccountSummaryReport filters={filters} />;
      case 'active-fds':
        return <ActiveFDsReport filters={filters} />;
      case 'interest-distribution':
        return <InterestDistributionReport filters={filters} />;
      case 'customer-activity':
        return <CustomerActivityReport filters={filters} />;
      default:
        return null;
    }
  };

  const getAvailableFilters = () => {
    switch (activeTab) {
      case 'agent-transactions':
        return ['dateRange', 'branch'];
      case 'account-summary':
        return ['dateRange', 'branch', 'accountType', 'accountStatus', 'minBalance'];
      case 'active-fds':
        return ['branch', 'fdType', 'autoRenewal'];
      case 'interest-distribution':
        return ['monthYear', 'branch', 'accountType'];
      case 'customer-activity':
        return ['dateRange', 'branch', 'agent', 'activityStatus'];
      default:
        return [];
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-gray-900">Advanced Reports</h1>
        <p className="text-gray-600 mt-1">
          Comprehensive reporting and analytics for B-Trust Banking System
        </p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px overflow-x-auto">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center px-6 py-4 text-sm font-medium border-b-2 whitespace-nowrap
                    ${activeTab === tab.id
                      ? 'border-primary-600 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  <Icon className="h-5 w-5 mr-2" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Filters */}
        <div className="p-6">
          <ReportFilters
            filters={filters}
            setFilters={setFilters}
            availableFilters={getAvailableFilters()}
            onReset={handleResetFilters}
          />

          {/* Tab Content */}
          <div className="mt-6">
            {renderTabContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

// Agent Transactions Report Component
const AgentTransactionsReport = ({ filters }) => {
  const { data, isLoading, error } = useAgentTransactions({
    startDate: filters.startDate?.toISOString().split('T')[0],
    endDate: filters.endDate?.toISOString().split('T')[0],
    branchId: filters.branchId
  });

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
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Agent Transaction Report</h2>
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
      </div>
    </div>
  );
};

// Account Summary Report Component
const AccountSummaryReport = ({ filters }) => {
  const { data, isLoading, error } = useAccountSummary({
    startDate: filters.startDate?.toISOString().split('T')[0],
    endDate: filters.endDate?.toISOString().split('T')[0],
    branchId: filters.branchId,
    accountType: filters.accountType,
    accountStatus: filters.accountStatus,
    minBalance: filters.minBalance
  });

  if (isLoading) return <LoadingSpinner />;
  if (error) return <div className="text-red-600">Error loading report: {error.message}</div>;

  const reportData = data?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Account Summary Report</h2>
        <ReportExport reportType="account-summary" data={reportData} filters={filters} />
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
            ${reportData.reduce((sum, item) => sum + parseFloat(item.current_balance || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-purple-50 rounded-lg p-4">
          <p className="text-sm text-purple-600 font-medium">Total Deposits</p>
          <p className="text-2xl font-bold text-purple-900">
            ${reportData.reduce((sum, item) => sum + parseFloat(item.total_deposits || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-red-50 rounded-lg p-4">
          <p className="text-sm text-red-600 font-medium">Total Withdrawals</p>
          <p className="text-2xl font-bold text-red-900">
            ${reportData.reduce((sum, item) => sum + parseFloat(item.total_withdrawals || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
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
                    ${parseFloat(row.current_balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">${parseFloat(row.total_deposits).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">${parseFloat(row.total_withdrawals).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
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
      </div>
    </div>
  );
};

// Active FDs Report Component
const ActiveFDsReport = ({ filters }) => {
  const { data, isLoading, error } = useActiveFDs({
    branchId: filters.branchId,
    fdType: filters.fdType,
    autoRenewal: filters.autoRenewal
  });

  if (isLoading) return <LoadingSpinner />;
  if (error) return <div className="text-red-600">Error loading report: {error.message}</div>;

  const reportData = data?.data || [];

  // Categorize FDs by maturity
  const maturingSoon = reportData.filter(fd => parseInt(fd.days_to_maturity) <= 30 && parseInt(fd.days_to_maturity) > 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Active Fixed Deposits Report</h2>
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
      </div>
    </div>
  );
};

// Interest Distribution Report Component
const InterestDistributionReport = ({ filters }) => {
  const { data, isLoading, error } = useInterestDistribution({
    month: filters.month,
    year: filters.year,
    branchId: filters.branchId,
    accountType: filters.accountType
  });

  if (isLoading) return <LoadingSpinner />;
  if (error) return <div className="text-red-600">Error loading report: {error.message}</div>;

  const reportData = data?.data || {};
  const summaryData = reportData.summary || [];
  const trendData = reportData.trend || [];
  const ytdData = reportData.yearToDate || {};

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Interest Distribution Report</h2>
        <ReportExport reportType="interest-distribution" data={summaryData} filters={filters} />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 rounded-lg p-4">
          <p className="text-sm text-blue-600 font-medium">This Month</p>
          <p className="text-2xl font-bold text-blue-900">
            ${summaryData.reduce((sum, item) => sum + parseFloat(item.interest_paid_this_month || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-green-50 rounded-lg p-4">
          <p className="text-sm text-green-600 font-medium">Year to Date</p>
          <p className="text-2xl font-bold text-green-900">
            ${parseFloat(ytdData.total_interest_ytd || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-purple-50 rounded-lg p-4">
          <p className="text-sm text-purple-600 font-medium">Total Accounts</p>
          <p className="text-2xl font-bold text-purple-900">
            {summaryData.reduce((sum, item) => sum + parseInt(item.account_count || 0), 0)}
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <LineChart
            data={trendData}
            lines={[{ dataKey: 'interest_amount', name: 'Interest Paid', color: '#2563eb' }]}
            xAxisKey="month"
            title="12-Month Interest Trend"
          />
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <PieChart
            data={summaryData}
            dataKey="interest_paid_this_month"
            nameKey="account_type"
            title="Interest Distribution by Account Type"
          />
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account Type</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Accounts</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total Principal</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Interest Paid</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Rate %</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {summaryData.map((row, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{row.account_type}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{parseInt(row.account_count).toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">${parseFloat(row.total_principal).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">${parseFloat(row.interest_paid_this_month).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{parseFloat(row.avg_interest_rate).toFixed(2)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// Customer Activity Report Component
const CustomerActivityReport = ({ filters }) => {
  const { data, isLoading, error } = useCustomerActivity({
    startDate: filters.startDate?.toISOString().split('T')[0],
    endDate: filters.endDate?.toISOString().split('T')[0],
    branchId: filters.branchId,
    agentId: filters.agentId,
    activityStatus: filters.activityStatus
  });

  if (isLoading) return <LoadingSpinner />;
  if (error) return <div className="text-red-600">Error loading report: {error.message}</div>;

  const reportData = data?.data || [];
  const activeCustomers = reportData.filter(c => c.activity_status === 'Active');
  const inactiveCustomers = reportData.filter(c => c.activity_status === 'Inactive');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Customer Activity Report</h2>
        <ReportExport reportType="customer-activity" data={reportData} filters={filters} />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-lg p-4">
          <p className="text-sm text-blue-600 font-medium">Total Customers</p>
          <p className="text-2xl font-bold text-blue-900">{reportData.length}</p>
        </div>
        <div className="bg-green-50 rounded-lg p-4">
          <p className="text-sm text-green-600 font-medium">Active Customers</p>
          <p className="text-2xl font-bold text-green-900">{activeCustomers.length}</p>
        </div>
        <div className="bg-red-50 rounded-lg p-4">
          <p className="text-sm text-red-600 font-medium">Inactive Customers</p>
          <p className="text-2xl font-bold text-red-900">{inactiveCustomers.length}</p>
        </div>
        <div className="bg-purple-50 rounded-lg p-4">
          <p className="text-sm text-purple-600 font-medium">Total Balance</p>
          <p className="text-2xl font-bold text-purple-900">
            ${reportData.reduce((sum, item) => sum + parseFloat(item.net_balance || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Branch</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Net Balance</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Deposits</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Withdrawals</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Last Transaction</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {reportData.map((row, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{row.customer_name}</div>
                    <div className="text-sm text-gray-500">{row.customer_id}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.branch_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">${parseFloat(row.net_balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {parseInt(row.deposits_count).toLocaleString()} (${parseFloat(row.total_deposits_value).toLocaleString(undefined, { minimumFractionDigits: 2 })})
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {parseInt(row.withdrawals_count).toLocaleString()} (${parseFloat(row.total_withdrawals_value).toLocaleString(undefined, { minimumFractionDigits: 2 })})
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                    {row.last_transaction_date ? new Date(row.last_transaction_date).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${row.activity_status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {row.activity_status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdvancedReports;
