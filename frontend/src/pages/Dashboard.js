import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Users, 
  CreditCard, 
  ArrowLeftRight, 
  Shield, 
  TrendingUp, 
  DollarSign,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import api from '../services/authService';

const Dashboard = () => {
  const { userType, user } = useAuth();

  // Debug logging
  console.log('Dashboard - userType:', userType);
  console.log('Dashboard - user:', user);
  console.log('Dashboard - user role:', user?.role);
  console.log('Dashboard - Is Admin?:', userType === 'employee' && user?.role === 'Admin');

  // Fetch dashboard data based on user type
  const { data: dashboardData, isLoading, error } = useQuery({
    queryKey: ['dashboard', userType],
    queryFn: async () => {
      // For Admin users, fetch from the unified admin endpoint
      if (userType === 'employee' && user?.role === 'Admin') {
        console.log('Fetching admin dashboard stats...');
        const statsResponse = await api.get('/admin/dashboard/stats');
        console.log('Admin stats response:', statsResponse.data);
        return { stats: statsResponse.data.data };
      }

      // For other employee types (Agent, Manager)
      if (userType === 'employee') {
        const endpoints = ['/customers/stats', '/accounts/stats', '/transactions/stats'];
        const promises = endpoints.map(endpoint =>
          api.get(endpoint).then(res => res.data)
        );
        const results = await Promise.all(promises);
        return results;
      }

      // For customers
      if (userType === 'customer') {
        const endpoints = ['/accounts', '/transactions/customer'];
        const promises = endpoints.map(endpoint =>
          api.get(endpoint).then(res => res.data)
        );
        const results = await Promise.all(promises);
        return results;
      }

      return null;
    },
    enabled: !!userType,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Fetch recent activity for Admin users
  const { data: recentActivityData } = useQuery({
    queryKey: ['recent-activity'],
    queryFn: async () => {
      const response = await api.get('/admin/dashboard/recent-activity');
      return response.data.activities;
    },
    enabled: userType === 'employee' && user?.role === 'Admin',
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Helper functions - defined early to avoid hoisting issues
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const getUserDisplayName = () => {
    if (userType === 'employee') {
      return user?.employee_name || 'Employee';
    } else if (userType === 'customer') {
      return `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || 'Customer';
    } else {
      return user?.name || 'User';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Welcome Section Skeleton */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </div>

        {/* Stats Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-lg shadow p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>

        {/* Recent Activity Skeleton */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="h-6 bg-gray-200 rounded w-1/4 animate-pulse"></div>
          </div>
          <div className="p-6 space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center space-x-4 animate-pulse">
                <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold text-gray-900">
            {getGreeting()}, {getUserDisplayName()}!
          </h1>
          <p className="text-gray-600 mt-1">
            Welcome to your B-Trust Banking dashboard.
          </p>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="h-6 w-6 text-red-600" />
            <div>
              <h3 className="text-lg font-semibold text-red-900">Failed to load dashboard data</h3>
              <p className="text-sm text-red-700 mt-1">
                We couldn't fetch your dashboard statistics. Please try refreshing the page.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const getDashboardCards = () => {
    if (userType === 'employee') {
      // Admin users get data from the unified stats endpoint
      if (user?.role === 'Admin' && dashboardData?.stats) {
        const stats = dashboardData.stats;

        return [
          {
            title: 'Total Customers',
            value: stats.customers?.total?.toLocaleString() || 0,
            icon: Users,
            color: 'blue',
            change: `+${stats.customers?.newThisMonth || 0} this month`,
          },
          {
            title: 'Active Accounts',
            value: stats.accounts?.active?.toLocaleString() || 0,
            icon: CreditCard,
            color: 'green',
            change: `+${stats.accounts?.newThisMonth || 0} this month`,
          },
          {
            title: 'Total Transactions',
            value: stats.transactions?.total?.toLocaleString() || 0,
            icon: ArrowLeftRight,
            color: 'purple',
            change: `+${stats.transactions?.thisMonth || 0} this month`,
          },
          {
            title: 'Total Balance',
            value: `$${stats.balance?.total?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}`,
            icon: DollarSign,
            color: 'yellow',
            change: 'Across all accounts',
          },
        ];
      }

      // Other employees (Agent, Manager) use the old format
      const [customerStats, accountStats, transactionStats] = dashboardData || [];

      return [
        {
          title: 'Total Customers',
          value: customerStats?.data?.total_customers?.toLocaleString() || 0,
          icon: Users,
          color: 'blue',
          change: `+${customerStats?.data?.new_customers_30d || 0} this month`,
        },
        {
          title: 'Active Accounts',
          value: accountStats?.data?.active_accounts?.toLocaleString() || 0,
          icon: CreditCard,
          color: 'green',
          change: `+${accountStats?.data?.new_accounts_30d || 0} this month`,
        },
        {
          title: 'Total Transactions',
          value: transactionStats?.data?.total_transactions?.toLocaleString() || 0,
          icon: ArrowLeftRight,
          color: 'purple',
          change: `+${transactionStats?.data?.transactions_30d || 0} this month`,
        },
        {
          title: 'Total Balance',
          value: `$${accountStats?.data?.total_balance?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}`,
          icon: DollarSign,
          color: 'yellow',
          change: 'Across all accounts',
        },
      ];
    } else if (userType === 'customer') {
      const [accounts, transactions] = dashboardData || [];
      const totalBalance = accounts?.data?.reduce((sum, account) => sum + parseFloat(account.current_balance || 0), 0) || 0;
      
      return [
        {
          title: 'My Accounts',
          value: accounts?.data?.length || 0,
          icon: CreditCard,
          color: 'blue',
          change: 'Active accounts',
        },
        {
          title: 'Total Balance',
          value: `$${totalBalance.toLocaleString()}`,
          icon: DollarSign,
          color: 'green',
          change: 'Across all accounts',
        },
        {
          title: 'Recent Transactions',
          value: transactions?.data?.length || 0,
          icon: ArrowLeftRight,
          color: 'purple',
          change: 'Last 30 days',
        },
        {
          title: 'Account Status',
          value: accounts?.data?.filter(acc => acc.status).length || 0,
          icon: CheckCircle,
          color: 'green',
          change: 'Active accounts',
        },
      ];
    } else {
      return [
        {
          title: 'Profile Status',
          value: 'Active',
          icon: CheckCircle,
          color: 'green',
          change: 'Account verified',
        },
      ];
    }
  };

  // Helper function to format timestamp as relative time
  const formatRelativeTime = (timestamp) => {
    if (!timestamp) return 'Unknown time';

    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

  const getRecentActivity = () => {
    if (userType === 'employee') {
      // Admin users get real activity data from the backend
      if (user?.role === 'Admin' && recentActivityData && recentActivityData.length > 0) {
        return recentActivityData.map(activity => {
          let activityType = 'customer';
          let status = 'success';

          // Map activity types to UI types and statuses
          if (activity.type === 'customer_registered') {
            activityType = 'customer';
            status = 'success';
          } else if (activity.type === 'transaction_processed') {
            activityType = 'transaction';
            status = 'success';
          } else if (activity.type === 'account_opened') {
            activityType = 'account';
            status = 'success';
          } else if (activity.type === 'fraud_alert') {
            activityType = 'fraud';
            status = 'danger';
          }

          return {
            type: activityType,
            message: activity.description,
            time: formatRelativeTime(activity.timestamp),
            status: status
          };
        });
      }

      // Fallback for non-Admin employees (placeholder data)
      return [
        { type: 'customer', message: 'New customer registered', time: '2 hours ago', status: 'success' },
        { type: 'transaction', message: 'Large transaction processed', time: '4 hours ago', status: 'warning' },
        { type: 'fraud', message: 'Fraud alert triggered', time: '6 hours ago', status: 'danger' },
        { type: 'account', message: 'New account opened', time: '8 hours ago', status: 'success' },
      ];
    } else if (userType === 'customer') {
      return [
        { type: 'transaction', message: 'Deposit of $500 completed', time: '1 hour ago', status: 'success' },
        { type: 'transaction', message: 'Withdrawal of $200 completed', time: '3 hours ago', status: 'success' },
        { type: 'account', message: 'Account statement generated', time: '1 day ago', status: 'info' },
        { type: 'security', message: 'Login from new device', time: '2 days ago', status: 'warning' },
      ];
    } else {
      return [
        { type: 'profile', message: 'Profile updated successfully', time: '1 hour ago', status: 'success' },
        { type: 'security', message: 'Password changed', time: '1 day ago', status: 'success' },
      ];
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'success': return 'text-green-600 bg-green-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      case 'danger': return 'text-red-600 bg-red-100';
      case 'info': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getCardColor = (color) => {
    switch (color) {
      case 'blue': return 'bg-blue-500';
      case 'green': return 'bg-green-500';
      case 'purple': return 'bg-purple-500';
      case 'yellow': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const cards = getDashboardCards();
  const recentActivity = getRecentActivity();

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {getGreeting()}, {getUserDisplayName()}!
        </h1>
        <p className="text-gray-600 mt-1">
          Welcome to your B-Trust Banking dashboard. Here's what's happening today.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div key={index} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{card.title}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{card.value}</p>
                  <p className="text-xs text-gray-500 mt-1">{card.change}</p>
                </div>
                <div className={`p-3 rounded-full ${getCardColor(card.color)}`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {recentActivity.map((activity, index) => (
              <div key={index} className="flex items-center space-x-4">
                <div className={`p-2 rounded-full ${getStatusColor(activity.status)}`}>
                  {activity.type === 'customer' && <Users className="h-4 w-4" />}
                  {activity.type === 'transaction' && <ArrowLeftRight className="h-4 w-4" />}
                  {activity.type === 'fraud' && <Shield className="h-4 w-4" />}
                  {activity.type === 'account' && <CreditCard className="h-4 w-4" />}
                  {activity.type === 'profile' && <CheckCircle className="h-4 w-4" />}
                  {activity.type === 'security' && <AlertTriangle className="h-4 w-4" />}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{activity.message}</p>
                  <p className="text-xs text-gray-500">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
};

export default Dashboard;


