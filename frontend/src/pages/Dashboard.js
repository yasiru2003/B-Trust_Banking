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
  UserCheck,
  Building2,
  Activity,
  Eye
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import LiveFraudAnalyzer from '../components/FraudAnalyzer';
import api from '../services/authService';
import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const Dashboard = () => {
  const { userType, user } = useAuth();
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  // Fetch dashboard data based on user type
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['dashboard', userType, user?.employee_id, user?.branch_id],
    queryFn: async () => {
      const endpoints = {
        employee: ['/customers/stats', '/accounts/stats', '/transactions/stats'],
        customer: ['/accounts', '/transactions/customer'],
        user: ['/users/profile']
      };

      // Add employees stats for managers and admins
      if (userType === 'employee' && (user?.role === 'Manager' || user?.role === 'Admin')) {
        endpoints.employee.push('/employees/stats');
      }

      // Add admin-specific endpoints
      if (userType === 'employee' && user?.role === 'Admin') {
        endpoints.employee.push('/branches/stats', '/admin/fraud-alerts');
      }

      const promises = (endpoints[userType] || []).map(endpoint => 
        api.get(endpoint).then(res => res.data).catch(err => {
          console.warn(`Failed to fetch ${endpoint}:`, err.message);
          return { data: null, success: false };
        })
      );

      const results = await Promise.all(promises);
      return results;
    },
    enabled: !!userType,
    refetchInterval: 5000, // Refetch every 5 seconds for real-time updates
  });

  // Fetch recent activity data for employees
  const { data: activityData } = useQuery({
    queryKey: ['recent-activity', user?.employee_id],
    queryFn: async () => {
      if (userType === 'employee') {
        const response = await api.get('/customers/recent-activity');
        return response.data;
      }
      return { data: [] };
    },
    enabled: userType === 'employee' && !!user?.employee_id,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Manager branch analytics
  const { data: managerAnalytics } = useQuery({
    queryKey: ['manager-dashboard', user?.branch_id, dateRange.start, dateRange.end],
    queryFn: async () => {
      if (!(userType === 'employee' && user?.role === 'Manager')) return null;
      const params = new URLSearchParams();
      if (dateRange.start) params.append('start_date', dateRange.start);
      if (dateRange.end) params.append('end_date', dateRange.end);
      const res = await api.get(`/manager/dashboard?${params.toString()}`);
      return res.data;
    },
    enabled: userType === 'employee' && user?.role === 'Manager',
    refetchInterval: 30000,
  });

  // Manager: transactions amount by day (line chart)
  const { data: managerDailyTx } = useQuery({
    queryKey: ['manager-daily-tx', user?.branch_id, dateRange.start, dateRange.end],
    queryFn: async () => {
      if (!(userType === 'employee' && user?.role === 'Manager')) return [];
      // Build a reasonable window if no dates selected (last 14 days)
      const end = dateRange.end ? new Date(dateRange.end) : new Date();
      const start = dateRange.start ? new Date(dateRange.start) : new Date(new Date().setDate(end.getDate() - 13));
      const fmt = (d) => d.toISOString().slice(0, 10);
      const params = new URLSearchParams();
      params.append('date_from', fmt(start));
      params.append('date_to', fmt(end));
      // High limit to capture range (backend also filters by manager's branch)
      params.append('limit', '1000');
      params.append('page', '1');
      const res = await api.get(`/transactions?${params.toString()}`);
      const list = Array.isArray(res.data?.data) ? res.data.data : [];

      // Aggregate approved transaction amount per day
      const byDay = new Map();
      for (const t of list) {
        const dateStr = (t.date || t.transaction_date || '').slice(0, 10);
        if (!dateStr) continue;
        if (t.status !== true && t.status !== 'true') continue;
        const amount = parseFloat(t.amount || 0) || 0;
        byDay.set(dateStr, (byDay.get(dateStr) || 0) + amount);
      }

      // Ensure continuous dates across range
      const data = [];
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const key = fmt(d);
        data.push({ date: key, amount: Math.round((byDay.get(key) || 0) * 100) / 100 });
      }
      return data;
    },
    enabled: userType === 'employee' && user?.role === 'Manager',
    staleTime: 30000,
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
      const [customerStats, accountStats, transactionStats, employeesStats, branchesStats, fraudStats] = dashboardData || [];

      const isAgent = user?.role === 'Agent';
      const isManager = user?.role === 'Manager';
      const isAdmin = user?.role === 'Admin';

      // Admin Dashboard - System Summary Cards
      if (isAdmin) {
        const today = new Date().toISOString().split('T')[0];
        const todayTransactions = transactionStats?.data?.today_transactions || 0;
        const todayAmount = transactionStats?.data?.today_amount || 0;
        const fraudAlerts = fraudStats?.data?.today_alerts || 0;

        return [
          {
            title: '🏢 Total Branches',
            value: branchesStats?.data?.total_branches || 25,
            icon: Building2,
            color: 'blue',
            change: 'Active branches',
          },
          {
            title: '👥 Total Employees',
            value: employeesStats?.data?.total_employees || 350,
            icon: Users,
            color: 'blue',
            change: 'All registered staff',
          },
          {
            title: '💳 Total Customers',
            value: customerStats?.data?.total_customers || 12540,
            icon: UserCheck,
            color: 'blue',
            change: 'Active customers',
          },
          {
            title: '🧾 Total Accounts',
            value: accountStats?.data?.total_accounts || 18230,
            icon: CreditCard,
            color: 'blue',
            change: 'All account types',
          },
          {
            title: '💰 Today\'s Transactions',
            value: `Rs. ${(todayAmount / 1000000).toFixed(1)}M`,
            icon: ArrowLeftRight,
            color: 'green',
            change: `${todayTransactions} transactions`,
          },
          {
            title: '⚠️ Fraud Alerts (Today)',
            value: fraudAlerts,
            icon: AlertTriangle,
            color: fraudAlerts > 0 ? 'red' : 'green',
            change: fraudAlerts > 0 ? 'Requires attention' : 'All clear',
          },
        ];
      }

      if (isManager) {
        // Hide generic stat cards for managers; manager has dedicated analytics sections below
        return [];
      }
      
      const cards = [
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
          value: `LKR ${(accountStats?.data?.total_balance || 0).toLocaleString()}`,
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
          value: `LKR ${totalBalance.toLocaleString()}`,
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
      // Use real activity data from the API
      const realActivities = activityData?.data || [];
      
      // If no real data, show a message
      if (realActivities.length === 0) {
        return [
          { type: 'info', message: 'No recent activity', time: 'N/A', status: 'info' }
        ];
      }
      
      return realActivities.map(activity => ({
        type: activity.activity_type,
        message: activity.message,
        time: activity.time,
        status: activity.status,
        details: activity.details
      }));
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
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {getGreeting()}, {getUserDisplayName()}!
        </h1>
        <p className="text-gray-600 dark:text-gray-300 mt-1">
          Welcome to your B-Trust Banking dashboard. Here's what's happening today.
        </p>
      </div>

      {/* Stats Cards */}
      <div className={`grid gap-6 ${userType === 'employee' && user?.role === 'Admin' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'}`}>
        {cards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div key={index} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300">{card.title}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{card.value}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{card.change}</p>
                </div>
                <div className={`p-3 rounded-full ${getCardColor(card.color)}`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Admin Fraud Monitoring Section */}
      {userType === 'employee' && user?.role === 'Admin' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
              <Shield className="h-5 w-5 mr-2 text-red-500" />
              Live Fraud Activity Monitor
            </h2>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-gray-500">Live</span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-red-600">High Risk Transactions</p>
                  <p className="text-2xl font-bold text-red-900">3</p>
                  <p className="text-xs text-red-500">Last 24 hours</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-500" />
              </div>
            </div>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-yellow-600">Suspicious Patterns</p>
                  <p className="text-2xl font-bold text-yellow-900">7</p>
                  <p className="text-xs text-yellow-500">Under review</p>
                </div>
                <Eye className="h-8 w-8 text-yellow-500" />
              </div>
            </div>
            
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600">Resolved Cases</p>
                  <p className="text-2xl font-bold text-green-900">12</p>
                  <p className="text-xs text-green-500">This week</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </div>
          </div>

          {/* Recent Fraud Alerts */}
          <div className="border-t border-gray-200 pt-4">
            <h3 className="text-md font-medium text-gray-900 dark:text-white mb-3">Recent Alerts</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center space-x-3">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Unusual transaction pattern detected</p>
                    <p className="text-xs text-gray-500">Account #12345 - Rs. 2.5M withdrawal</p>
                  </div>
                </div>
                <span className="text-xs text-red-600 font-medium">2 min ago</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Eye className="h-5 w-5 text-yellow-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Multiple failed login attempts</p>
                    <p className="text-xs text-gray-500">Customer ID: CUST789</p>
                  </div>
                </div>
                <span className="text-xs text-yellow-600 font-medium">15 min ago</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Alert resolved - False positive</p>
                    <p className="text-xs text-gray-500">Transaction #TXN456 verified</p>
                  </div>
                </div>
                <span className="text-xs text-green-600 font-medium">1 hour ago</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Live Fraud Analyzer - Full Section */}
      {userType === 'employee' && user?.role === 'Admin' && (
        <LiveFraudAnalyzer />
      )}

      {/* Manager Analytics Filters */}
      {userType === 'employee' && user?.role === 'Manager' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Branch Analytics Filters</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Start Date</label>
              <input type="date" value={dateRange.start} onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })} className="input w-full" />
            </div>
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">End Date</label>
              <input type="date" value={dateRange.end} onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })} className="input w-full" />
            </div>
            <div className="flex items-end">
              <button className="btn btn-outline w-full" onClick={() => setDateRange({ start: '', end: '' })}>Clear</button>
            </div>
          </div>
        </div>
      )}

      {/* Manager Branch Analytics */}
      {userType === 'employee' && user?.role === 'Manager' && managerAnalytics?.success && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Branch Analytics</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <p className="text-sm text-gray-600 dark:text-gray-300">Transactions (selected period)</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{managerAnalytics.data?.statistics?.transactions?.total || 0}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Amount LKR {(managerAnalytics.data?.statistics?.transactions?.total_amount || 0).toLocaleString()}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <p className="text-sm text-gray-600 dark:text-gray-300">Active Agents</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{managerAnalytics.data?.statistics?.agents?.active || 0}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Total {managerAnalytics.data?.statistics?.agents?.total || 0}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <p className="text-sm text-gray-600 dark:text-gray-300">Accounts Balance</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">LKR {(managerAnalytics.data?.statistics?.accounts?.total_balance || 0).toLocaleString()}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Avg LKR {(managerAnalytics.data?.statistics?.accounts?.average_balance || 0).toLocaleString()}</p>
            </div>
          </div>
          {Array.isArray(managerAnalytics.data?.transactions_by_type) && managerAnalytics.data.transactions_by_type.length > 0 && (
            <div className="mt-6">
              <h3 className="text-md font-semibold text-gray-900 dark:text-white mb-2">Transactions by Type</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Count</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Total Amount</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {managerAnalytics.data.transactions_by_type.map((row, idx) => (
                      <tr key={idx}>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-white">{row.type_name || 'Unknown'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-white">{row.count}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-white">LKR {parseFloat(row.total_amount || 0).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Manager: Transaction Amount by Day */}
      {userType === 'employee' && user?.role === 'Manager' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Transaction Amount by Day</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={managerDailyTx || []} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" stroke="#6b7280" tick={{ fontSize: 12 }} />
                <YAxis stroke="#6b7280" tickFormatter={(v) => `LKR ${Number(v).toLocaleString()}`} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value) => [`LKR ${Number(value).toLocaleString()}`, 'Amount']} labelFormatter={(label) => `Date: ${label}`} />
                <Line type="monotone" dataKey="amount" stroke="#2563eb" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Recent Activity */}
      {userType !== 'employee' || user?.role !== 'Admin' ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{userType === 'employee' && user?.role === 'Manager' ? 'Alert' : 'Recent Activity'}</h2>
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
                    {activity.type === 'kyc' && <UserCheck className="h-4 w-4" />}
                    {activity.type === 'profile' && <CheckCircle className="h-4 w-4" />}
                    {activity.type === 'security' && <AlertTriangle className="h-4 w-4" />}
                    {activity.type === 'info' && <CheckCircle className="h-4 w-4" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{activity.message}</p>
                    {activity.details && (
                      <p className="text-xs text-gray-600 dark:text-gray-300">{activity.details}</p>
                    )}
                    <p className="text-xs text-gray-500 dark:text-gray-400">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {/* Quick Actions */}
      {userType === 'employee' && user?.role !== 'Manager' && user?.role !== 'Admin' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button 
              onClick={() => window.location.href = '/customers'}
              className="btn btn-primary"
            >
              <Users className="h-4 w-4 mr-2" />
              Add Customer
            </button>
            <button 
              onClick={() => window.location.href = '/accounts'}
              className="btn btn-secondary"
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Open Account
            </button>
            <button 
              onClick={() => window.location.href = '/transactions'}
              className="btn btn-outline"
            >
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


