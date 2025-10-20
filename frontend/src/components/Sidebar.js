import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  ArrowLeftRight,
  PiggyBank,
  UserCheck,
  Building2,
  BarChart3,
  FileText,
  X,
  User,
  Monitor,
  Smartphone,
  Activity
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Sidebar = ({ isOpen, onClose }) => {
  const { userType, hasPermission, user } = useAuth();
  const location = useLocation();

  const navigation = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
      permission: null,
    },
    {
      name: 'Customers',
      href: '/customers',
      icon: Users,
      permission: 'view_assigned_customers',
    },
    {
      name: 'Account Summary',
      href: '/accounts/summary-report',
      icon: CreditCard,
      permission: 'view_all',
      adminOnly: true,
    },
    {
      name: 'Transactions',
      href: '/transactions',
      icon: ArrowLeftRight,
      permission: 'view_customer_transactions',
    },
    {
      name: 'Fixed Deposits',
      href: '/fixed-deposits',
      icon: PiggyBank,
      permission: 'create_transaction',
    },
    {
      name: 'Employees',
      href: '/employees',
      icon: UserCheck,
      permission: 'view_all_employees',
    },
    {
      name: 'Agent Performance',
      href: '/employees/performance-report',
      icon: FileText,
      permission: 'view_all',
      adminOnly: true,
      indent: true,
    },
    // Session Management - Admin only
    ...(user?.role === 'Admin' ? [{
      name: 'Session Management',
      href: '/admin/sessions',
      icon: Monitor,
      permission: 'admin_access',
    }] : []),
    // Device Management - Admin only
    ...(user?.role === 'Admin' ? [{
      name: 'Device Management',
      href: '/admin/devices',
      icon: Smartphone,
      permission: 'admin_access',
    }] : []),
    // Security Monitoring - Admin only
    ...(user?.role === 'Admin' ? [{
      name: 'Security Monitor',
      href: '/admin/security',
      icon: Activity,
      permission: 'admin_access',
    }] : []),
    // Hide Branches for Agents; allow Managers/Admins via explicit permission or role
    ...(user?.role === 'Agent' ? [] : [{
      name: 'Branches',
      href: '/branches',
      icon: Building2,
      permission: null,
    }]),
    {
      name: 'Advanced Reports',
      href: '/reports/advanced',
      icon: BarChart3,
      permission: 'view_all',
      adminOnly: true,
    },
    {
      name: 'My Profile',
      href: '/profile',
      icon: User,
      permission: null,
    },
  ];

  


  const filteredNavigation = navigation.filter(item => {
    // Check permission
    if (item.permission && !hasPermission(item.permission)) {
      return false;
    }
    // Check if admin only
    if (item.adminOnly && (userType !== 'employee' || user?.role !== 'Admin')) {
      return false;
    }
    return true;
  });

  // Managers should not see Branches or Settings tabs
  const finalNavigation = filteredNavigation.filter(item => {
    if (user?.role === 'Manager' && (item.name === 'Branches' || item.name === 'Settings')) {
      return false;
    }
    return true;
  });

  const isActive = (href) => {
    return location.pathname === href;
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 dark:bg-gray-900 dark:bg-opacity-75 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">B-Trust</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="mt-8 px-4">
          <ul className="space-y-2">
            {finalNavigation.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.name}>
                  <NavLink
                    to={item.href}
                    onClick={onClose}
                    className={`
                      flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors duration-200
                      ${item.indent ? 'pl-8 text-xs' : ''}
                      ${isActive(item.href)
                        ? 'bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 border-r-2 border-primary-700 dark:border-primary-300'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                      }
                    `}
                  >
                    <Icon className={`mr-3 ${item.indent ? 'h-4 w-4' : 'h-5 w-5'}`} />
                    {item.name}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User info at bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="h-8 w-8 rounded-full bg-primary-600 flex items-center justify-center">
              <span className="text-sm font-medium text-white">
                {userType === 'employee' ? 'E' : userType === 'customer' ? 'C' : 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {userType === 'employee' ? 'Employee' : userType === 'customer' ? 'Customer' : 'User'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {userType === 'employee' ? 'Bank Staff' : 'Banking Client'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
