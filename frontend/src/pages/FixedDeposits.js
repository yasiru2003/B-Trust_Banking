import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Filter, Eye, Download, TrendingUp, TrendingDown, DollarSign, Calendar, Percent, Clock, History } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';
import FDForm from '../components/FDForm';
import api from '../services/authService';
import toast from 'react-hot-toast';

const FixedDeposits = () => {
  const { hasPermission,user } = useAuth();
  const isAgent = user?.role === 'Agent';
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({});
  const [page, setPage] = useState(1);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedFD, setSelectedFD] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isInterestHistoryModalOpen, setIsInterestHistoryModalOpen] = useState(false);
  const [selectedFDForHistory, setSelectedFDForHistory] = useState(null);

  // Fetch FDs
  const { data: fdsData, isLoading, error } = useQuery({
    queryKey: ['fixed-deposits', page, searchTerm, filters],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        ...filters,
      });
      
      if (searchTerm) {
        params.append('search', searchTerm);
      }

      const response = await api.get(`/fixed-deposits?${params}`);
      return response.data;
    },
    placeholderData: (previousData) => previousData,
    retry: false,
  });

  // Fetch FD types
  const { data: fdTypesData } = useQuery({
    queryKey: 'fd-types',
    queryFn: async () => {
      const response = await api.get('/fixed-deposits/types');
      return response.data;
    }
  });

  // Fetch interest history for selected FD
  const { data: interestHistoryData, isLoading: interestHistoryLoading } = useQuery({
    queryKey: ['fd-interest-history', selectedFDForHistory?.fd_number],
    queryFn: async () => {
      if (!selectedFDForHistory?.fd_number) return { data: [] };
      const response = await api.get(`/fixed-deposits/${selectedFDForHistory.fd_number}/interest-history`);
      return response.data;
    },
    enabled: !!selectedFDForHistory?.fd_number
  });

  const handleViewFD = (fd) => {
    setSelectedFD(fd);
    setIsViewModalOpen(true);
  };

  const handleViewInterestHistory = (fd) => {
    setSelectedFDForHistory(fd);
    setIsInterestHistoryModalOpen(true);
  };

  const fds = fdsData?.data || [];
  const fdTypes = fdTypesData?.data || [];
  const pagination = fdsData?.pagination || {};

  const getStatusBadge = (status) => {
    const statusClasses = {
      'ACTIVE': 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200',
      'MATURED': 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200',
      'CLOSED': 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200',
      'PREMATURE_CLOSED': 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
    };
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusClasses[status] || 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'}`}>
        {status?.replace('_', ' ') || 'Unknown'}
      </span>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const formatCurrency = (amount) => {
    return `LKR ${amount?.toLocaleString() || '0'}`;
  };

  const formatNextPayoutDate = (fd) => {
    if (!fd.next_payout_date) return 'N/A';
    const payoutDate = new Date(fd.next_payout_date);
    const daysUntil = parseInt(fd.days_until_payout) || 0;
    
    if (daysUntil <= 0) return 'Due Now';
    if (daysUntil === 1) return 'Tomorrow';
    if (daysUntil <= 7) return `${daysUntil} days`;
    
    return payoutDate.toLocaleDateString();
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-red-600 text-lg font-medium mb-2">Error Loading Fixed Deposits</div>
          <div className="text-gray-600 dark:text-gray-300">{error.message}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Fixed Deposits</h1>
          <p className="text-gray-600 dark:text-gray-300">Manage customer fixed deposits and investments</p>
        </div>
        {isAgent && hasPermission('create_transaction') && (
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors duration-200 flex items-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            Open FD
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <DollarSign className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Total FDs</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {pagination.total || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Active FDs</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {fds.filter(fd => fd.status === 'ACTIVE').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Calendar className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Matured FDs</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {fds.filter(fd => fd.status === 'MATURED').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Percent className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Investment</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(fds.reduce((sum, fd) => sum + (fd.balance_after || 0), 0))}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search by FD number, customer name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <select
              value={filters.status || ''}
              onChange={(e) => setFilters({ ...filters, status: e.target.value || undefined })}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="MATURED">Matured</option>
              <option value="CLOSED">Closed</option>
              <option value="PREMATURE_CLOSED">Premature Closed</option>
            </select>

            <select
              value={filters.fd_type_id || ''}
              onChange={(e) => setFilters({ ...filters, fd_type_id: e.target.value || undefined })}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">All Types</option>
              {fdTypes.map(type => (
                <option key={type.fd_type_id} value={type.fd_type_id}>
                  {type.duration_months} months @ {type.interest_rate}%
                </option>
              ))}
            </select>

            <button
              onClick={() => {
                setSearchTerm('');
                setFilters({});
                setPage(1);
              }}
              className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* FDs Table / Empty State */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        {fds.length === 0 ? (
          <div className="p-12 text-center">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Fixed Deposits</h3>
            <p className="text-gray-600 dark:text-gray-300">
              {isAgent ? "You don't have any assigned fixed deposits yet." : 'No fixed deposits found.'}
            </p>
          </div>
        ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  FD Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Customer
                </th>
                {user?.role === 'Manager' && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Agent
                  </th>
                )}
                
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Interest Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Tenure
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Maturity Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Next Payout
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {fds.map((fd) => (
                <tr key={fd.fd_number} className="hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {fd.fd_number}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(fd.opening_date)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {fd.customer_name || 'Unknown'}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {fd.customer_id}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {user?.role === 'Manager' && (
                      <div className="text-sm text-gray-900 dark:text-white">
                        {fd.agent_name || 'Unknown'}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {formatCurrency(fd.balance_after)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white">
                      {fd.standard_rate || fd.interest_rate}% p.a.
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white">
                      {fd.duration_months || 'N/A'} months
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white">
                      {formatDate(fd.maturity_date)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white">
                      {formatNextPayoutDate(fd)}
                    </div>
                    {fd.days_until_payout && parseInt(fd.days_until_payout) <= 7 && (
                      <div className="text-xs text-orange-600 dark:text-orange-400">
                        <Clock className="h-3 w-3 inline mr-1" />
                        {parseInt(fd.days_until_payout)} days
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(fd.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleViewFD(fd)}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300"
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleViewInterestHistory(fd)}
                        className="text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300"
                        title="Interest History"
                      >
                        <History className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="bg-white dark:bg-gray-800 px-4 py-3 flex items-center justify-between border-t border-gray-200 dark:border-gray-700 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(Math.min(pagination.pages, page + 1))}
                disabled={page === pagination.pages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  Showing{' '}
                  <span className="font-medium">{(page - 1) * pagination.limit + 1}</span>
                  {' '}to{' '}
                  <span className="font-medium">
                    {Math.min(page * pagination.limit, pagination.total)}
                  </span>
                  {' '}of{' '}
                  <span className="font-medium">{pagination.total}</span>
                  {' '}results
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                    const pageNum = i + 1;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          page === pageNum
                            ? 'z-10 bg-blue-50 dark:bg-blue-900 border-blue-500 text-blue-600 dark:text-blue-300'
                            : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setPage(Math.min(pagination.pages, page + 1))}
                    disabled={page === pagination.pages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add FD Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Open Fixed Deposit"
        size="lg"
      >
        <FDForm
          onSuccess={() => {
            setIsAddModalOpen(false);
            queryClient.invalidateQueries('fixed-deposits');
            toast.success('Fixed deposit opened successfully!');
          }}
          onCancel={() => setIsAddModalOpen(false)}
        />
      </Modal>

      {/* View FD Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title="Fixed Deposit Details"
        size="lg"
      >
        {selectedFD && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">FD Number</label>
                <p className="mt-1 text-sm text-gray-900 dark:text-white">{selectedFD.fd_number}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
                <div className="mt-1">{getStatusBadge(selectedFD.status)}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Customer</label>
                <p className="mt-1 text-sm text-gray-900 dark:text-white">{selectedFD.customer_name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{selectedFD.customer_id}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Principal Amount</label>
                <p className="mt-1 text-sm text-gray-900 dark:text-white">{formatCurrency(selectedFD.balance_after)}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Interest Rate</label>
                <p className="mt-1 text-sm text-gray-900 dark:text-white">{selectedFD.standard_rate || selectedFD.interest_rate}% p.a.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Tenure</label>
                <p className="mt-1 text-sm text-gray-900 dark:text-white">{selectedFD.duration_months || 'N/A'} months</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Opening Date</label>
                <p className="mt-1 text-sm text-gray-900 dark:text-white">{formatDate(selectedFD.start_date)}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Maturity Date</label>
                <p className="mt-1 text-sm text-gray-900 dark:text-white">{formatDate(selectedFD.maturity_date)}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Next Payout</label>
                <p className="mt-1 text-sm text-gray-900 dark:text-white">{formatNextPayoutDate(selectedFD)}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Total Interest Accrued</label>
                <p className="mt-1 text-sm text-gray-900 dark:text-white">{formatCurrency(selectedFD.total_interest_accrued || 0)}</p>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Interest History Modal */}
      <Modal
        isOpen={isInterestHistoryModalOpen}
        onClose={() => setIsInterestHistoryModalOpen(false)}
        title={`Interest History - ${selectedFDForHistory?.fd_number}`}
        size="lg"
      >
        {selectedFDForHistory && (
          <div className="space-y-6">
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-200 mb-2">
                FD Details
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-blue-700 dark:text-blue-300">FD Number:</span>
                  <span className="ml-2 text-blue-600 dark:text-blue-400">{selectedFDForHistory.fd_number}</span>
                </div>
                <div>
                  <span className="font-medium text-blue-700 dark:text-blue-300">Principal Amount:</span>
                  <span className="ml-2 text-blue-600 dark:text-blue-400">{formatCurrency(selectedFDForHistory.balance_after)}</span>
                </div>
                <div>
                  <span className="font-medium text-blue-700 dark:text-blue-300">Interest Rate:</span>
                  <span className="ml-2 text-blue-600 dark:text-blue-400">{selectedFDForHistory.standard_rate || selectedFDForHistory.interest_rate}% p.a.</span>
                </div>
                <div>
                  <span className="font-medium text-blue-700 dark:text-blue-300">Calculation Cycle:</span>
                  <span className="ml-2 text-blue-600 dark:text-blue-400">{selectedFDForHistory.interest_calc_cycle || 'N/A'}</span>
                </div>
              </div>
            </div>

            {interestHistoryLoading ? (
              <LoadingSpinner />
            ) : (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Interest Accrual History
                </h3>
                {interestHistoryData?.data?.length === 0 ? (
                  <div className="text-center py-8">
                    <History className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">No interest accrual records found</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Date
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Principal Amount
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Interest Rate
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Interest Amount
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {interestHistoryData?.data?.map((record, index) => (
                          <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                              {formatDate(record.accrual_date)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                              {formatCurrency(record.principal_amount)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                              {record.annual_rate}% p.a.
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600 dark:text-green-400">
                              {formatCurrency(record.interest_amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                
                {interestHistoryData?.data?.length > 0 && (
                  <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-green-800 dark:text-green-200">Total Interest Accrued:</span>
                      <span className="text-lg font-bold text-green-900 dark:text-green-100">
                        {formatCurrency(interestHistoryData.data.reduce((sum, record) => sum + parseFloat(record.interest_amount || 0), 0))}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default FixedDeposits;




