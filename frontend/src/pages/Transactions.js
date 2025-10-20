import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Filter, Eye, Download, TrendingUp, TrendingDown, Banknote, Activity } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';
import TransactionForm from '../components/TransactionForm';
import api from '../services/authService';
import toast from 'react-hot-toast';
import { downloadTransactionReceipt } from '../utils/pdfGenerator';

const Transactions = () => {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({});
  const [page, setPage] = useState(1);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  // Fetch transactions
  const { data: transactionsData, isLoading, error } = useQuery({
    queryKey: ['transactions', page, searchTerm, filters],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        ...filters,
      });
      
      if (searchTerm) {
        params.append('search', searchTerm);
      }

      const response = await api.get(`/transactions?${params}`);
      return response.data;
    },
    placeholderData: (previousData) => previousData,
    retry: false, // Don't retry on error
  });

  // Fetch transaction stats
  const { data: statsData } = useQuery({
    queryKey: 'transaction-stats',
    queryFn: async () => {
      const response = await api.get('/transactions/stats');
      return response.data;
    }
  });

  // Fetch customers for filtering
  const { data: customersData } = useQuery({
    queryKey: 'customers',
    queryFn: async () => {
      const response = await api.get('/customers?limit=1000');
      return response.data;
    }
  });

  // Fetch accounts for filtering
  const { data: accountsData } = useQuery({
    queryKey: 'accounts',
    queryFn: async () => {
      const response = await api.get('/accounts?limit=1000');
      return response.data;
    }
  });

  const handleViewTransaction = (transaction) => {
    setSelectedTransaction(transaction);
    setIsViewModalOpen(true);
  };

  const handleDownloadReceipt = (transaction) => {
    try {
      const result = downloadTransactionReceipt(transaction);
      if (result.success) {
        toast.success(`Receipt downloaded: ${result.filename}`);
      } else {
        toast.error(`Failed to generate PDF: ${result.error}`);
      }
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download receipt');
    }
  };

  const transactions = transactionsData?.data || [];
  const stats = statsData?.data || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Transactions</h1>
          <p className="text-gray-600 dark:text-gray-300">Manage customer transactions and payments</p>
        </div>
        {hasPermission('create_transaction') && (
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="btn btn-primary"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Transaction
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Banknote className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300 dark:text-gray-400">Total Volume</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white dark:text-white">
                LKR {stats.total_volume?.toLocaleString() || '0'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
              <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300 dark:text-gray-400">Deposits</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white dark:text-white">
                LKR {stats.total_deposits?.toLocaleString() || '0'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg">
              <TrendingDown className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300 dark:text-gray-400">Withdrawals</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white dark:text-white">
                LKR {stats.total_withdrawals?.toLocaleString() || '0'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <Activity className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300 dark:text-gray-400">Today's Count</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white dark:text-white">
                {stats.today_count || '0'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
              Search
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search transactions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-10"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
              Customer
            </label>
            <select
              value={filters.customer_id || ''}
              onChange={(e) => setFilters({ ...filters, customer_id: e.target.value })}
              className="input"
            >
              <option value="">All Customers</option>
              {customersData?.data?.map(customer => (
                <option key={customer.customer_id} value={customer.customer_id}>
                  {customer.customer_id} - {customer.first_name} {customer.last_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
              Account
            </label>
            <select
              value={filters.account_number || ''}
              onChange={(e) => setFilters({ ...filters, account_number: e.target.value })}
              className="input"
            >
              <option value="">All Accounts</option>
              {accountsData?.data?.map(account => (
                <option key={account.account_number} value={account.account_number}>
                  {account.account_number} - {account.customer_name}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
              Transaction Type
            </label>
            <select
              value={filters.transaction_type_id || ''}
              onChange={(e) => setFilters({ ...filters, transaction_type_id: e.target.value })}
              className="input"
            >
              <option value="">All Types</option>
              <option value="DEP001">Deposit</option>
              <option value="WIT001">Withdrawal</option>
              <option value="INT001">Interest Calculation</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
              Status
            </label>
            <select
              value={filters.status || ''}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="input"
            >
              <option value="">All Status</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => setFilters({})}
              className="btn btn-outline w-full"
            >
              <Filter className="h-4 w-4 mr-2" />
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <LoadingSpinner size="xl" />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <p className="text-gray-500 dark:text-gray-400 mb-4">No transactions found or database not set up yet</p>
              <p className="text-sm text-gray-400 dark:text-gray-500">Create your first transaction to get started</p>
            </div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="table w-full">
                <thead className="table-header">
                  <tr>
                    <th className="table-head">Transaction ID</th>
                    <th className="table-head">Customer</th>
                    <th className="table-head">Type</th>
                    <th className="table-head">Amount</th>
                    <th className="table-head">Status</th>
                    <th className="table-head">Date</th>
                    <th className="table-head">Actions</th>
                  </tr>
                </thead>
                <tbody className="table-body">
                  {transactions.map((transaction) => (
                    <tr key={transaction.transaction_id} className="table-row">
                      <td className="table-cell font-mono text-sm">
                        {transaction.transaction_id}
                      </td>
                      <td className="table-cell">
                        <div>
                          <div className="font-medium">
                            {transaction.customer_name || 'N/A'}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {transaction.account_number || 'N/A'}
                          </div>
                        </div>
                      </td>
                      <td className="table-cell">
                        <span className={`badge ${
                          transaction.type_name === 'Deposit' 
                            ? 'badge-success' 
                            : transaction.type_name === 'Withdraw'
                            ? 'badge-warning'
                            : transaction.type_name === 'Interest_Calculation'
                            ? 'badge-info'
                            : 'badge-secondary'
                        }`}>
                          {transaction.type_name === 'Interest_Calculation' ? 'Interest Calculation' : transaction.type_name || 'Unknown'}
                        </span>
                      </td>
                      <td className="table-cell">
                        <div className="font-medium">
                          LKR {transaction.amount?.toLocaleString() || '0'}
                        </div>
                      </td>
                      <td className="table-cell">
                        <span className={`badge ${
                          transaction.status === true 
                            ? 'badge-success' 
                            : transaction.status === false
                            ? 'badge-warning'
                            : 'badge-error'
                        }`}>
                          {transaction.status === true ? 'Approved' : transaction.status === false ? 'Pending' : 'Unknown'}
                        </span>
                      </td>
                      <td className="table-cell">
                        <div className="text-sm">
                          {transaction.date ? new Date(transaction.date).toLocaleDateString() : 'N/A'}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {transaction.date ? new Date(transaction.date).toLocaleTimeString() : ''}
                        </div>
                      </td>
                      <td className="table-cell">
                        <div className="flex space-x-2">
                          <button 
                            onClick={() => handleViewTransaction(transaction)}
                            className="btn btn-ghost btn-sm"
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          {hasPermission('view_all_transactions') && (
                            <button 
                              onClick={() => handleDownloadReceipt(transaction)}
                              className="btn btn-ghost btn-sm" 
                              title="Download Receipt"
                            >
                              <Download className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {transactions.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500 dark:text-gray-400">No transactions found</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Add Transaction Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Create New Transaction"
        size="lg"
      >
        <TransactionForm
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={() => {
            queryClient.invalidateQueries('transactions');
            queryClient.invalidateQueries('transaction-stats');
          }}
        />
      </Modal>

      {/* View Transaction Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title="Transaction Details"
        size="md"
      >
        {selectedTransaction && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Transaction ID</label>
                <p className="text-sm text-gray-900 dark:text-white font-mono">{selectedTransaction.transaction_id}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Type</label>
                <span className={`badge ${
                  selectedTransaction.type_name === 'Deposit' 
                    ? 'badge-success' 
                    : selectedTransaction.type_name === 'Withdraw'
                    ? 'badge-warning'
                    : selectedTransaction.type_name === 'Interest_Calculation'
                    ? 'badge-info'
                    : 'badge-secondary'
                }`}>
                  {selectedTransaction.type_name === 'Interest_Calculation' ? 'Interest Calculation' : selectedTransaction.type_name || 'Unknown'}
                </span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Amount</label>
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  LKR {selectedTransaction.amount?.toLocaleString() || '0'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
                <span className={`badge ${
                  selectedTransaction.status === 'completed' 
                    ? 'badge-success' 
                    : selectedTransaction.status === 'pending'
                    ? 'badge-warning'
                    : 'badge-error'
                }`}>
                  {selectedTransaction.status}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Customer</label>
              <p className="text-sm text-gray-900 dark:text-white">{selectedTransaction.customer_name || 'N/A'}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Account</label>
              <p className="text-sm text-gray-900 dark:text-white">{selectedTransaction.account_number || 'N/A'}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Date & Time</label>
              <p className="text-sm text-gray-900 dark:text-white">
                {selectedTransaction.date ? new Date(selectedTransaction.date).toLocaleString() : 'N/A'}
              </p>
            </div>

            {selectedTransaction.description && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
                <p className="text-sm text-gray-900 dark:text-white">{selectedTransaction.description}</p>
              </div>
            )}

            <div className="flex justify-end pt-4 border-t">
              <button
                onClick={() => handleDownloadReceipt(selectedTransaction)}
                className="btn btn-primary mr-2"
              >
                <Download className="h-4 w-4 mr-2" />
                Download Receipt
              </button>
              <button
                onClick={() => setIsViewModalOpen(false)}
                className="btn btn-outline"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Transactions;