import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Eye, DollarSign, Calendar, Percent, TrendingUp } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';
import FDForm from '../components/FDForm';
import api from '../services/authService';
import toast from 'react-hot-toast';

const FixedDeposits = () => {
  const { hasPermission, user } = useAuth();
  const isAdmin = user?.role === 'Admin';
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({});
  const [page, setPage] = useState(1);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedFD, setSelectedFD] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

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

  const handleViewFD = (fd) => {
    setSelectedFD(fd);
    setIsViewModalOpen(true);
  };

  const fds = fdsData?.data || [];
  const fdTypes = fdTypesData?.data || [];
  const pagination = fdsData?.pagination || {};

  const getStatusBadge = (status) => {
    const statusClasses = {
      'ACTIVE': 'bg-green-100 text-green-800',
      'MATURED': 'bg-blue-100 text-blue-800',
      'CLOSED': 'bg-gray-100 text-gray-800',
      'PREMATURE_CLOSED': 'bg-yellow-100 text-yellow-800'
    };
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusClasses[status] || 'bg-gray-100 text-gray-800'}`}>
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

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-red-600 text-lg font-medium mb-2">Error Loading Fixed Deposits</div>
          <div className="text-gray-600">{error.message}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fixed Deposits</h1>
          <p className="text-gray-600">{isAdmin ? 'View customer fixed deposits and investments' : 'Manage customer fixed deposits and investments'}</p>
        </div>
        {hasPermission('create_transaction') && !isAdmin && (
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors duration-200 flex items-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            Open FD
          </button>
        )}
        {isAdmin && (
          <div className="text-sm text-gray-500 italic">
            View-only access. Only Managers and Agents can create Fixed Deposits.
          </div>
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
              <p className="text-sm font-medium text-gray-600">Total FDs</p>
              <p className="text-2xl font-bold text-gray-900">
                {pagination.total || 0}
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
              <p className="text-sm font-medium text-gray-600">Active FDs</p>
              <p className="text-2xl font-bold text-gray-900">
                {fds.filter(fd => fd.status === 'ACTIVE').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Calendar className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Matured FDs</p>
              <p className="text-2xl font-bold text-gray-900">
                {fds.filter(fd => fd.status === 'MATURED').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Percent className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Investment</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(fds.reduce((sum, fd) => sum + (fd.principal_amount || 0), 0))}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search by FD number, customer name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <select
              value={filters.status || ''}
              onChange={(e) => setFilters({ ...filters, status: e.target.value || undefined })}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Types</option>
              {fdTypes.map(type => (
                <option key={type.fd_type_id} value={type.fd_type_id}>
                  {type.type_name}
                </option>
              ))}
            </select>

            <button
              onClick={() => {
                setSearchTerm('');
                setFilters({});
                setPage(1);
              }}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* FDs Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  FD Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Interest Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Tenure
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Maturity Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {fds.map((fd) => (
                <tr key={fd.fd_number} className="hover:bg-gray-50 dark:hover:bg-gray-700">
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
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {formatCurrency(fd.principal_amount)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white">
                      {fd.interest_rate}% p.a.
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white">
                      {fd.tenure_months} months
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white">
                      {formatDate(fd.maturity_date)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(fd.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleViewFD(fd)}
                      className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 mr-3"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="bg-white dark:bg-gray-800 px-4 py-3 flex items-center justify-between border-t border-gray-200 dark:border-gray-700 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(Math.min(pagination.pages, page + 1))}
                disabled={page === pagination.pages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
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
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
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
                            ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setPage(Math.min(pagination.pages, page + 1))}
                    disabled={page === pagination.pages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
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
                <label className="block text-sm font-medium text-gray-700">FD Number</label>
                <p className="mt-1 text-sm text-gray-900">{selectedFD.fd_number}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <div className="mt-1">{getStatusBadge(selectedFD.status)}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Customer</label>
                <p className="mt-1 text-sm text-gray-900">{selectedFD.customer_name}</p>
                <p className="text-xs text-gray-500">{selectedFD.customer_id}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Principal Amount</label>
                <p className="mt-1 text-sm text-gray-900">{formatCurrency(selectedFD.principal_amount)}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Interest Rate</label>
                <p className="mt-1 text-sm text-gray-900">{selectedFD.interest_rate}% p.a.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Tenure</label>
                <p className="mt-1 text-sm text-gray-900">{selectedFD.tenure_months} months</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Opening Date</label>
                <p className="mt-1 text-sm text-gray-900">{formatDate(selectedFD.opening_date)}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Maturity Date</label>
                <p className="mt-1 text-sm text-gray-900">{formatDate(selectedFD.maturity_date)}</p>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default FixedDeposits;




