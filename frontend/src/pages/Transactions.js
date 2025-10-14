import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Filter, Eye, Download, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';
import TransactionForm from '../components/TransactionForm';
import api from '../services/authService';
import toast from 'react-hot-toast';

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

  const handleViewTransaction = (transaction) => {
    setSelectedTransaction(transaction);
    setIsViewModalOpen(true);
  };

  const transactions = transactionsData?.data || [];
  const stats = statsData?.data || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
          <p className="text-gray-600">Manage customer transactions and payments</p>
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
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <DollarSign className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Volume</p>
              <p className="text-2xl font-bold text-gray-900">
                LKR {stats.total_volume?.toLocaleString() || '0'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Deposits</p>
              <p className="text-2xl font-bold text-gray-900">
                LKR {stats.total_deposits?.toLocaleString() || '0'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <TrendingDown className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Withdrawals</p>
              <p className="text-2xl font-bold text-gray-900">
                LKR {stats.total_withdrawals?.toLocaleString() || '0'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <DollarSign className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Today's Count</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.today_count || '0'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
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
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Transaction Type
            </label>
            <select
              value={filters.transaction_type || ''}
              onChange={(e) => setFilters({ ...filters, transaction_type: e.target.value })}
              className="input"
            >
              <option value="">All Types</option>
              <option value="Deposit">Deposit</option>
              <option value="Withdraw">Withdrawal</option>
              <option value="Interest_Calculation">Interest</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
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
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <LoadingSpinner size="xl" />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <p className="text-gray-500 mb-4">No transactions found or database not set up yet</p>
              <p className="text-sm text-gray-400">Create your first transaction to get started</p>
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
                          <div className="text-sm text-gray-500">
                            {transaction.account_number || 'N/A'}
                          </div>
                        </div>
                      </td>
                      <td className="table-cell">
                        <span className={`badge ${
                          transaction.transaction_type === 'Deposit' 
                            ? 'badge-success' 
                            : transaction.transaction_type === 'Withdraw'
                            ? 'badge-warning'
                            : 'badge-info'
                        }`}>
                          {transaction.transaction_type}
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
                        <div className="text-xs text-gray-500">
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
                            <button className="btn btn-ghost btn-sm" title="Download Receipt">
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
                <p className="text-gray-500">No transactions found</p>
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
                <label className="block text-sm font-medium text-gray-700">Transaction ID</label>
                <p className="text-sm text-gray-900 font-mono">{selectedTransaction.transaction_id}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Type</label>
                <span className={`badge ${
                  selectedTransaction.transaction_type === 'Deposit' 
                    ? 'badge-success' 
                    : selectedTransaction.transaction_type === 'Withdraw'
                    ? 'badge-warning'
                    : 'badge-info'
                }`}>
                  {selectedTransaction.transaction_type}
                </span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Amount</label>
                <p className="text-lg font-bold text-gray-900">
                  LKR {selectedTransaction.amount?.toLocaleString() || '0'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
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
              <label className="block text-sm font-medium text-gray-700">Customer</label>
              <p className="text-sm text-gray-900">{selectedTransaction.customer_name || 'N/A'}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Account</label>
              <p className="text-sm text-gray-900">{selectedTransaction.account_number || 'N/A'}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Date & Time</label>
              <p className="text-sm text-gray-900">
                {selectedTransaction.date ? new Date(selectedTransaction.date).toLocaleString() : 'N/A'}
              </p>
            </div>

            {selectedTransaction.description && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <p className="text-sm text-gray-900">{selectedTransaction.description}</p>
              </div>
            )}

            <div className="flex justify-end pt-4 border-t">
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