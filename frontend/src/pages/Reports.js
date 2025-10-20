import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, TrendingUp, Users, PiggyBank, DollarSign, FileText, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Reports = () => {
  const navigate = useNavigate();
  const { userType, user } = useAuth();

  // Only show advanced reports to admin users
  const isAdmin = userType === 'employee' && user?.role === 'Admin';

  const reportCategories = [
    {
      title: 'Agent Transactions',
      description: 'View agent-wise transaction reports with totals and breakdowns',
      icon: Users,
      color: 'blue',
      available: isAdmin
    },
    {
      title: 'Account Summary',
      description: 'Comprehensive account-wise transaction summaries with balances',
      icon: FileText,
      color: 'green',
      available: isAdmin
    },
    {
      title: 'Active Fixed Deposits',
      description: 'Track active FDs with maturity dates and interest calculations',
      icon: PiggyBank,
      color: 'purple',
      available: isAdmin
    },
    {
      title: 'Interest Distribution',
      description: 'Monthly interest distribution analysis by account type',
      icon: DollarSign,
      color: 'yellow',
      available: isAdmin
    },
    {
      title: 'Customer Activity',
      description: 'Customer transaction activity and engagement analysis',
      icon: TrendingUp,
      color: 'red',
      available: isAdmin
    }
  ];

  const getColorClasses = (color) => {
    const colors = {
      blue: 'bg-blue-50 text-blue-600',
      green: 'bg-green-50 text-green-600',
      purple: 'bg-purple-50 text-purple-600',
      yellow: 'bg-yellow-50 text-yellow-600',
      red: 'bg-red-50 text-red-600'
    };
    return colors[color] || 'bg-gray-50 text-gray-600';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
        <p className="text-gray-600">Generate and view comprehensive banking reports</p>
      </div>

      {isAdmin ? (
        <>
          {/* Advanced Reports Card */}
          <div className="bg-gradient-to-r from-primary-600 to-primary-800 rounded-lg shadow-lg p-8 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold mb-2">Advanced Reports</h2>
                <p className="text-primary-100 mb-4">
                  Access comprehensive reporting dashboard with interactive charts and export capabilities
                </p>
                <button
                  onClick={() => navigate('/reports/advanced')}
                  className="inline-flex items-center px-6 py-3 bg-white text-primary-700 font-semibold rounded-lg hover:bg-primary-50 transition-colors"
                >
                  Go to Advanced Reports
                  <ArrowRight className="ml-2 h-5 w-5" />
                </button>
              </div>
              <BarChart3 className="h-24 w-24 opacity-20" />
            </div>
          </div>

          {/* Report Categories Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {reportCategories.filter(cat => cat.available).map((category, index) => {
              const Icon = category.icon;
              return (
                <div
                  key={index}
                  className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => navigate('/reports/advanced')}
                >
                  <div className={`inline-flex p-3 rounded-lg ${getColorClasses(category.color)} mb-4`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{category.title}</h3>
                  <p className="text-sm text-gray-600">{category.description}</p>
                </div>
              );
            })}
          </div>

          {/* Features List */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Report Features</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start">
                <div className="flex-shrink-0 h-6 w-6 rounded-full bg-green-100 flex items-center justify-center mr-3">
                  <svg className="h-4 w-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Interactive Charts</p>
                  <p className="text-sm text-gray-500">Bar charts, line graphs, and pie charts</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="flex-shrink-0 h-6 w-6 rounded-full bg-green-100 flex items-center justify-center mr-3">
                  <svg className="h-4 w-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Multiple Export Formats</p>
                  <p className="text-sm text-gray-500">PDF, Excel, and CSV downloads</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="flex-shrink-0 h-6 w-6 rounded-full bg-green-100 flex items-center justify-center mr-3">
                  <svg className="h-4 w-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Advanced Filtering</p>
                  <p className="text-sm text-gray-500">Date ranges, branches, account types, and more</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="flex-shrink-0 h-6 w-6 rounded-full bg-green-100 flex items-center justify-center mr-3">
                  <svg className="h-4 w-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Real-time Data</p>
                  <p className="text-sm text-gray-500">Up-to-date information from database</p>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-center py-12">
            <BarChart3 className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Reports & Analytics</h3>
            <p className="text-gray-500">Advanced reporting features are available for Admin users only.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;


























