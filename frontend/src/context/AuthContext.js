import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { authService } from '../services/authService';
import toast from 'react-hot-toast';

const AuthContext = createContext();

const initialState = {
  user: null,
  token: localStorage.getItem('token'),
  isAuthenticated: false,
  isLoading: true,
  userType: null,
};

const authReducer = (state, action) => {
  switch (action.type) {
    case 'LOGIN_START':
      return {
        ...state,
        isLoading: true,
      };
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        userType: action.payload.userType,
        isAuthenticated: true,
        isLoading: false,
      };
    case 'LOGIN_FAILURE':
      return {
        ...state,
        user: null,
        token: null,
        userType: null,
        isAuthenticated: false,
        isLoading: false,
      };
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        token: null,
        userType: null,
        isAuthenticated: false,
        isLoading: false,
      };
    case 'UPDATE_USER':
      return {
        ...state,
        user: { ...state.user, ...action.payload },
      };
    default:
      return state;
  }
};

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Check if user is authenticated on app load
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          console.log('Checking authentication with token:', token.substring(0, 20) + '...');
          const response = await authService.verifyToken(token);
          if (response.success) {
            dispatch({
              type: 'LOGIN_SUCCESS',
              payload: {
                user: response.data.user,
                token,
                userType: response.data.userType,
              },
            });
          } else {
            // Try to refresh the token if verification fails
            try {
              console.log('Token verification failed, attempting refresh...');
              const refreshResponse = await authService.refreshToken(token);
              if (refreshResponse.success) {
                const newToken = refreshResponse.data.token;
                localStorage.setItem('token', newToken);
                dispatch({
                  type: 'LOGIN_SUCCESS',
                  payload: {
                    user: refreshResponse.data.user,
                    token: newToken,
                    userType: refreshResponse.data.userType,
                  },
                });
              } else {
                localStorage.removeItem('token');
                dispatch({ type: 'LOGIN_FAILURE' });
              }
            } catch (refreshError) {
              console.error('Token refresh failed:', refreshError);
              localStorage.removeItem('token');
              dispatch({ type: 'LOGIN_FAILURE' });
            }
          }
        } catch (error) {
          console.error('Auth check failed:', error);
          console.error('Error details:', {
            message: error.message,
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data,
            config: {
              url: error.config?.url,
              method: error.config?.method,
              baseURL: error.config?.baseURL
            }
          });
          
          // Only remove token if it's an authentication error, not a network error
          if (error.response?.status === 401 || error.response?.status === 403) {
            localStorage.removeItem('token');
          }
          dispatch({ type: 'LOGIN_FAILURE' });
        }
      } else {
        console.log('No token found in localStorage');
        dispatch({ type: 'LOGIN_FAILURE' });
      }
    };

    checkAuth();
  }, []);

  const login = async (credentials) => {
    dispatch({ type: 'LOGIN_START' });
    try {
      const response = await authService.login(credentials);
      if (response.success) {
        localStorage.setItem('token', response.data.token);
        dispatch({
          type: 'LOGIN_SUCCESS',
          payload: {
            user: response.data.user,
            token: response.data.token,
            userType: response.data.userType,
          },
        });
        toast.success('Login successful!');
        return { success: true };
      } else {
        dispatch({ type: 'LOGIN_FAILURE' });
        toast.error(response.message || 'Login failed');
        return { success: false, message: response.message };
      }
    } catch (error) {
      dispatch({ type: 'LOGIN_FAILURE' });
      const message = error.response?.data?.message || 'Login failed';
      toast.error(message);
      return { success: false, message };
    }
  };

  const register = async (userData) => {
    dispatch({ type: 'LOGIN_START' });
    try {
      const response = await authService.register(userData);
      if (response.success) {
        localStorage.setItem('token', response.data.token);
        dispatch({
          type: 'LOGIN_SUCCESS',
          payload: {
            user: response.data.user,
            token: response.data.token,
            userType: response.data.userType,
          },
        });
        toast.success('Registration successful!');
        return { success: true };
      } else {
        dispatch({ type: 'LOGIN_FAILURE' });
        toast.error(response.message || 'Registration failed');
        return { success: false, message: response.message };
      }
    } catch (error) {
      dispatch({ type: 'LOGIN_FAILURE' });
      const message = error.response?.data?.message || 'Registration failed';
      toast.error(message);
      return { success: false, message };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    dispatch({ type: 'LOGOUT' });
    toast.success('Logged out successfully');
  };

  const updateUser = (userData) => {
    dispatch({
      type: 'UPDATE_USER',
      payload: userData,
    });
  };

  const hasRole = (role) => {
    if (!state.user) return false;
    return state.user.role === role;
  };

  const hasPermission = (permission) => {
    if (!state.user) return false;
    
    // Define permissions based on user type and role
    const permissions = {
      employee: {
        Manager: [
          'view_all_customers', 'view_assigned_customers', 'create_customer', 'update_customer', 'delete_customer',
          'view_all_accounts', 'create_account', 'update_account', 'delete_account',
          'view_all_transactions', 'create_transaction', 'approve_large_transactions',
          'view_all_employees', 'create_employee', 'update_employee', 'delete_employee',
          'view_branch_reports', 'manage_branch_settings', 'view_fraud_alerts', 'manage_fraud_settings'
        ],
        Agent: [
          'view_assigned_customers', 'create_customer', 'update_customer_info', 'view_customer_accounts',
          'create_account', 'view_customer_transactions', 'view_all_transactions', 'create_transaction',
          'create_small_transactions', 'send_sms_notifications', 'view_agent_reports'
        ],
        Admin: [
          'view_all_customers', 'create_customer', 'update_customer', 'delete_customer',
          'view_all_accounts', 'create_account', 'update_account', 'delete_account',
          'view_all_transactions', 'create_transaction', 'approve_large_transactions',
          'view_all_employees', 'create_employee', 'update_employee', 'delete_employee',
          'view_branch_reports', 'manage_branch_settings', 'view_fraud_alerts', 'manage_fraud_settings',
          'admin_global_access'
        ]
      },
      customer: ['view_own_account', 'view_own_transactions'],
      user: ['view_own_profile'],
    };

    const rolePerms = permissions[state.userType]?.[state.user.role];
    const typePerms = permissions[state.userType];
    const userPermissions = Array.isArray(rolePerms)
      ? rolePerms
      : Array.isArray(typePerms)
      ? typePerms
      : [];
    return userPermissions.includes(permission);
  };

  const value = {
    ...state,
    login,
    register,
    logout,
    updateUser,
    hasRole,
    hasPermission,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

