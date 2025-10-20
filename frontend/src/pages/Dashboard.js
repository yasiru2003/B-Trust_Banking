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
  CheckCircle,
  UserCheck  
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import api from '../services/authService';

const Dashboard = () => {
  const { userType, user } = useAuth();

  // Fetch dashboard data based on user type
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['dashboard', userType, user?.employee_id, user?.branch_id],
    queryFn: async () => {
      const endpoints = {
        employee: ['/customers/stats', '/accounts/stats', '/transactions/stats'],
        customer: ['/accounts', '/transactions/customer'],
        user: ['/users/profile']
      };

      // Add employees stats for managers
      if (userType === 'employee' && user?.role === 'Manager') {
        endpoints.employee.push('/employees/stats');
      }

      const promises = (endpoints[userType] || []).map(endpoint => 
        api.get(endpoint).then(res => res.data)
      );

      const results = await Promise.all(promises);
      return results;
    },
    enabled: !!userType,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="xl" />
      </div>
    );
  }

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

  const getDashboardCards = () => {
    if (userType === 'employee') {
      const [customerStats, accountStats, transactionStats,employeesStats] = dashboardData || [];

      const isAgent = user?.role === 'Agent';
      const isManager = user?.role === 'Manager';
      const cards = [     //card added instead return
        {
          title: isAgent ? 'My Customers' : 'Total Customers',
          value: customerStats?.data?.total_customers || 0,
          icon: Users,
          color: 'blue',
          change: isAgent ? 'Assigned to you' : `+${customerStats?.data?.new_customers_30d || 0} this month`,
        },
        {
          title: isAgent ? 'My Active Accounts' : 'Active Accounts',
          value: accountStats?.data?.active_accounts || 0,
          icon: CreditCard,
          color: 'green',
          change: isAgent ? 'Assigned customers only' : `+${accountStats?.data?.new_accounts_30d || 0} this month`,
        },
        {
          title: isAgent ? 'My Transactions' : 'Total Transactions',
          value: transactionStats?.data?.total_transactions || 0,
          icon: ArrowLeftRight,
          color: 'purple',
          change: isAgent ? 'You processed' : `+${transactionStats?.data?.transactions_30d || 0} this month`,
        },
        {
          title: isAgent ? 'My Total Balance' : 'Total Balance',
          value: `$${(accountStats?.data?.total_balance || 0).toLocaleString()}`,
          icon: DollarSign,
          color: 'yellow',
          change: isAgent ? 'Across your customers' : 'Across all accounts',
        },
      ];
      // Add agent count for managers
      if (isManager && employeesStats) {
        cards.push({
          title: 'Total Agents',
          value: employeesStats?.data?.total_agents || 0,
          icon: UserCheck,
          color: 'indigo',
          change: 'All active agents'
        });
      }
      return cards;
      
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

  const getRecentActivity = () => {
    if (userType === 'employee') {
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
      case 'indigo': return 'bg-indigo-500';
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
          <h2 className="text-lg font-semibold text-gray-900">{userType === 'employee' && user?.role === 'Manager' ? 'Alert' : 'Recent Activity'}</h2>
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

      {/* Quick Actions */}
      {userType === 'employee' && user?.role !== 'Manager' &&(
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button className="btn btn-primary">
              <Users className="h-4 w-4 mr-2" />
              Add Customer
            </button>
            <button className="btn btn-secondary">
              <CreditCard className="h-4 w-4 mr-2" />
              Open Account
            </button>
            <button className="btn btn-outline">
              <ArrowLeftRight className="h-4 w-4 mr-2" />
              Process Transaction
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;


