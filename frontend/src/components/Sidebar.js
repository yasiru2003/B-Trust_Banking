import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  CreditCard, 
  ArrowLeftRight, 
  PiggyBank,
  UserCheck, 
  Shield, 
  Building2, 
  BarChart3, 
  Settings,
  X,
  User
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
      name: 'Accounts',
      href: '/accounts',
      icon: CreditCard,
      permission: null,
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
      name: 'Fraud Detection',
      href: '/fraud',
      icon: Shield,
      permission: 'view_fraud',
    },
    // Hide Branches for Agents; allow Managers/Admins via explicit permission or role
    ...(user?.role === 'Agent' ? [] : [{
      name: 'Branches',
      href: '/branches',
      icon: Building2,
      permission: null,
    }]),
    {
      name: 'Reports',
      href: '/reports',
      icon: BarChart3,
      permission: 'view_all',
    },
    {
      name: 'Settings',
      href: '/settings',
      icon: Settings,
      permission: null,
    },
    {
      name: 'My Profile',
      href: '/profile',
      icon: User,
      permission: null,
    },
  ];

 

  const filteredNavigation = navigation.filter(item => 
    !item.permission || hasPermission(item.permission)
  );

  const isActive = (href) => {
    return location.pathname === href;
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">B-Trust</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="mt-8 px-4">
          <ul className="space-y-2">
            {filteredNavigation.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.name}>
                  <NavLink
                    to={item.href}
                    onClick={onClose}
                    className={`
                      flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors duration-200
                      ${isActive(item.href)
                        ? 'bg-primary-100 text-primary-700 border-r-2 border-primary-700'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                      }
                    `}
                  >
                    <Icon className="mr-3 h-5 w-5" />
                    {item.name}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User info at bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="h-8 w-8 rounded-full bg-primary-600 flex items-center justify-center">
              <span className="text-sm font-medium text-white">
                {userType === 'employee' ? 'E' : userType === 'customer' ? 'C' : 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {userType === 'employee' ? 'Employee' : userType === 'customer' ? 'Customer' : 'User'}
              </p>
              <p className="text-xs text-gray-500 truncate">
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
