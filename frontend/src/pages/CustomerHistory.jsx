import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { History, Calendar, TrendingUp, DollarSign, PiggyBank, Activity } from 'lucide-react';
import api from '../services/authService';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';

const CustomerHistory = () => {
  const [searchParams] = useSearchParams();
  const customerIdFromUrl = searchParams.get('customer_id');

  const [selectedCustomerId, setSelectedCustomerId] = useState(customerIdFromUrl || '');
  const [customers, setCustomers] = useState([]);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [loading, setLoading] = useState(false);
  const [historyData, setHistoryData] = useState(null);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setFullYear(new Date().getFullYear() - 1)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [activeTab, setActiveTab] = useState('transactions');

  // Load customers list on mount
  useEffect(() => {
    loadCustomers();
  }, []);

  // Load history when customer is selected
  useEffect(() => {
    if (selectedCustomerId) {
      loadHistory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCustomerId, dateRange]);

  const loadCustomers = async () => {
    setLoadingCustomers(true);
    try {
      const response = await api.get('/customers?limit=1000');
      console.log('Customers API response:', response.data);
      if (response.data.success) {
        console.log('Customers loaded:', response.data.data.length);
        setCustomers(response.data.data);
      } else {
        console.error('API returned success: false');
        toast.error('Failed to load customers list');
      }
    } catch (error) {
      console.error('Load customers error:', error);
      console.error('Error response:', error.response?.data);
      toast.error(error.response?.data?.message || 'Failed to load customers list');
    } finally {
      setLoadingCustomers(false);
    }
  };

  const handleCustomerSelect = (e) => {
    const customerId = e.target.value;
    setSelectedCustomerId(customerId);
    if (customerId) {
      setHistoryData(null); // Clear previous data
    }
  };

  const loadHistory = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/customer-history/${selectedCustomerId}`, {
        params: {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate
        }
      });

      if (response.data.success) {
        setHistoryData(response.data.data);
      } else {
        toast.error('Failed to load customer history');
      }
    } catch (error) {
      console.error('Load history error:', error);
      toast.error(error.response?.data?.message || 'Failed to load history');
    } finally {
      setLoading(false);
    }
  };

  // Show customer selector if no customer is selected
  if (!selectedCustomerId) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-6">
            <History className="h-8 w-8 text-blue-600 mr-3" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Customer History</h1>
              <p className="text-gray-600 mt-1">Select a customer to view their complete transaction history</p>
            </div>
          </div>

          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Customer
            </label>

            {loadingCustomers ? (
              <div className="text-gray-600">Loading customers...</div>
            ) : customers.length === 0 ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-yellow-800">No customers found. Check browser console for errors.</p>
              </div>
            ) : (
              <>
                <select
                  value={selectedCustomerId}
                  onChange={handleCustomerSelect}
                  className="input w-full max-w-md"
                >
                  <option value="">-- Choose a customer ({customers.length} available) --</option>
                  {customers.map((customer) => (
                    <option key={customer.customer_id} value={customer.customer_id}>
                      {customer.customer_id} - {customer.first_name} {customer.last_name} ({customer.phone_number})
                    </option>
                  ))}
                </select>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                  <p className="text-blue-800">Found {customers.length} customer(s). Select one from the dropdown above.</p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Show loading spinner while loading history
  if (loading) {
    return <LoadingSpinner />;
  }

  // Show error if no history data
  if (!historyData) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Customer not found or no data available.</p>
          <button
            onClick={() => setSelectedCustomerId('')}
            className="btn btn-primary mt-4"
          >
            Select Another Customer
          </button>
        </div>
      </div>
    );
  }

  const { customer, accounts, transactions, interestHistory, activitySummary, fixedDeposits, monthlySummary } = historyData;

  return (
    <div className="space-y-6">
      {/* Header with Customer Info */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center">
            <History className="h-8 w-8 text-blue-600 mr-3" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Customer History</h1>
              <p className="text-gray-600 mt-1">
                {customer.first_name} {customer.last_name} - {customer.customer_id}
              </p>
            </div>
          </div>

          <button
            onClick={() => setSelectedCustomerId('')}
            className="btn btn-outline"
          >
            Switch Customer
          </button>
        </div>

        {/* Customer Details */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600">Email</p>
            <p className="font-medium">{customer.email || 'N/A'}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600">Phone</p>
            <p className="font-medium">{customer.phone_number}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600">NIC</p>
            <p className="font-medium">{customer.nic_number}</p>
          </div>
        </div>

        {/* Date Range Filter */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start Date
            </label>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
              className="input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              End Date
            </label>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
              className="input"
            />
          </div>
        </div>
      </div>

      {/* Account Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Accounts</p>
              <p className="text-2xl font-bold text-gray-900">{accounts.length}</p>
            </div>
            <DollarSign className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Balance</p>
              <p className="text-2xl font-bold text-green-600">
                Rs. {accounts.reduce((sum, acc) => sum + parseFloat(acc.balance || 0), 0).toLocaleString()}
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Fixed Deposits</p>
              <p className="text-2xl font-bold text-purple-600">{fixedDeposits.length}</p>
            </div>
            <PiggyBank className="h-8 w-8 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            {[
              { id: 'transactions', name: 'Transactions', icon: Activity },
              { id: 'interest', name: 'Interest History', icon: TrendingUp },
              { id: 'accounts', name: 'Accounts', icon: DollarSign },
              { id: 'fixed-deposits', name: 'Fixed Deposits', icon: PiggyBank },
              { id: 'monthly', name: 'Monthly Summary', icon: Calendar },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center px-6 py-3 border-b-2 font-medium text-sm
                    ${activeTab === tab.id
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {tab.name}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          {/* Transactions Tab */}
          {activeTab === 'transactions' && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Transaction History</h3>
              {transactions.length === 0 ? (
                <p className="text-gray-500">No transactions found</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="table w-full">
                    <thead className="table-header">
                      <tr>
                        <th className="table-head">Date</th>
                        <th className="table-head">Type</th>
                        <th className="table-head">Account</th>
                        <th className="table-head">Amount</th>
                        <th className="table-head">Balance After</th>
                        <th className="table-head">Status</th>
                      </tr>
                    </thead>
                    <tbody className="table-body">
                      {transactions.map((txn, idx) => (
                        <tr key={idx} className="table-row">
                          <td className="table-cell">{new Date(txn.transaction_date).toLocaleDateString()}</td>
                          <td className="table-cell capitalize">{txn.transaction_type}</td>
                          <td className="table-cell font-mono">{txn.account_number}</td>
                          <td className={`table-cell font-semibold ${txn.transaction_type === 'deposit' || txn.transaction_type === 'interest_credit' ? 'text-green-600' : 'text-red-600'}`}>
                            {txn.transaction_type === 'deposit' || txn.transaction_type === 'interest_credit' ? '+' : '-'}
                            Rs. {parseFloat(txn.amount).toLocaleString()}
                          </td>
                          <td className="table-cell">Rs. {parseFloat(txn.balance_after).toLocaleString()}</td>
                          <td className="table-cell">
                            <span className={`badge ${txn.status === 'completed' ? 'badge-success' : txn.status === 'pending' ? 'badge-warning' : 'badge-error'}`}>
                              {txn.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Interest History Tab */}
          {activeTab === 'interest' && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Interest Distribution History</h3>
              {interestHistory.length === 0 ? (
                <p className="text-gray-500">No interest history found</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="table w-full">
                    <thead className="table-header">
                      <tr>
                        <th className="table-head">Date</th>
                        <th className="table-head">Account</th>
                        <th className="table-head">Interest Amount</th>
                        <th className="table-head">Balance After</th>
                      </tr>
                    </thead>
                    <tbody className="table-body">
                      {interestHistory.map((interest, idx) => (
                        <tr key={idx} className="table-row">
                          <td className="table-cell">{new Date(interest.transaction_date).toLocaleDateString()}</td>
                          <td className="table-cell font-mono">{interest.account_number}</td>
                          <td className="table-cell text-green-600 font-semibold">
                            + Rs. {parseFloat(interest.amount).toLocaleString()}
                          </td>
                          <td className="table-cell">Rs. {parseFloat(interest.balance_after).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Accounts Tab */}
          {activeTab === 'accounts' && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Account Details</h3>
              <div className="grid grid-cols-1 gap-4">
                {accounts.map((account) => (
                  <div key={account.account_number} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-mono font-semibold text-lg">{account.account_number}</p>
                        <p className="text-sm text-gray-600 capitalize">{account.account_type} Account</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-green-600">Rs. {parseFloat(account.balance).toLocaleString()}</p>
                        <p className="text-sm text-gray-600">Current Balance</p>
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Opened Date</p>
                        <p className="font-medium">{new Date(account.open_date).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Status</p>
                        <span className={`badge ${account.status === 'active' ? 'badge-success' : 'badge-error'}`}>
                          {account.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Fixed Deposits Tab */}
          {activeTab === 'fixed-deposits' && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Fixed Deposits</h3>
              {fixedDeposits.length === 0 ? (
                <p className="text-gray-500">No fixed deposits found</p>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {fixedDeposits.map((fd) => (
                    <div key={fd.fd_number} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-mono font-semibold text-lg">FD #{fd.fd_number}</p>
                          <p className="text-sm text-gray-600">Account: {fd.account_number}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-purple-600">Rs. {parseFloat(fd.amount).toLocaleString()}</p>
                          <p className="text-sm text-gray-600">{fd.interest_rate}% interest</p>
                        </div>
                      </div>
                      <div className="mt-4 grid grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">Start Date</p>
                          <p className="font-medium">{new Date(fd.start_date).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Maturity Date</p>
                          <p className="font-medium">{new Date(fd.maturity_date).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Status</p>
                          <span className={`badge ${fd.status === 'active' ? 'badge-success' : 'badge-warning'}`}>
                            {fd.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Monthly Summary Tab */}
          {activeTab === 'monthly' && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Monthly Activity Summary</h3>
              {monthlySummary.length === 0 ? (
                <p className="text-gray-500">No monthly data available</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="table w-full">
                    <thead className="table-header">
                      <tr>
                        <th className="table-head">Month</th>
                        <th className="table-head">Total Deposits</th>
                        <th className="table-head">Total Withdrawals</th>
                        <th className="table-head">Interest Earned</th>
                        <th className="table-head">Transaction Count</th>
                      </tr>
                    </thead>
                    <tbody className="table-body">
                      {monthlySummary.map((month, idx) => (
                        <tr key={idx} className="table-row">
                          <td className="table-cell font-medium">{month.month}</td>
                          <td className="table-cell text-green-600">
                            Rs. {parseFloat(month.total_deposits || 0).toLocaleString()}
                          </td>
                          <td className="table-cell text-red-600">
                            Rs. {parseFloat(month.total_withdrawals || 0).toLocaleString()}
                          </td>
                          <td className="table-cell text-blue-600">
                            Rs. {parseFloat(month.interest_earned || 0).toLocaleString()}
                          </td>
                          <td className="table-cell">{month.transaction_count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerHistory;
