import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import Accounts from './pages/Accounts';
import Transactions from './pages/Transactions';
import FixedDeposits from './pages/FixedDeposits';
import Employees from './pages/Employees';
import FraudDetection from './pages/FraudDetection';
import Branches from './pages/Branches';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import NotFound from './pages/NotFound';
import Profile from './pages/Profile';
import ManagerProfile from './pages/ManagerProfile';
import PhoneVerificationTest from './pages/PhoneVerificationTest';
import TransactionOTPTest from './pages/TransactionOTPTest';
import AdminTest from './pages/AdminTest';
import AdminDashboard from './components/AdminDashboard';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <Router>
            <div className="min-h-screen bg-gray-50">
              <Routes>
                {/* Public Routes */}
                <Route path="/login" element={<Login />} />
                
                {/* Protected Routes */}
                <Route path="/" element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }>
                  <Route index element={<Navigate to="/dashboard" replace />} />
                  <Route path="dashboard" element={<Dashboard />} />
                  <Route path="customers" element={<Customers />} />
                  <Route path="accounts" element={<Accounts />} />
                  <Route path="transactions" element={<Transactions />} />
                  <Route path="fixed-deposits" element={<FixedDeposits />} />
                  <Route path="profile" element={<Profile />} />
                  <Route path="manager/profile" element={<ManagerProfile />} />
                  <Route path="employees" element={<Employees />} />
                  <Route path="fraud" element={<FraudDetection />} />
                  <Route path="branches" element={<Branches />} />
                  <Route path="reports" element={<Reports />} />
                  <Route path="settings" element={<Settings />} />
                  <Route path="phone-verification-test" element={<PhoneVerificationTest />} />
                  <Route path="transaction-otp-test" element={<TransactionOTPTest />} />
                  
                  {/* Admin Routes */}
                  <Route path="admin/test" element={<AdminTest />} />
                  <Route path="admin/sessions" element={<AdminDashboard />} />
                  <Route path="admin/devices" element={<AdminDashboard />} />
                  <Route path="admin/security" element={<AdminDashboard />} />
                  <Route path="admin/dashboard" element={<AdminDashboard />} />
                </Route>
                
                {/* 404 Route */}
                <Route path="*" element={<NotFound />} />
              </Routes>
              
              {/* Toast Notifications */}
              <Toaster
                position="top-right"
                toastOptions={{
                  duration: 4000,
                  style: {
                    background: '#363636',
                    color: '#fff',
                  },
                  success: {
                    duration: 3000,
                    iconTheme: {
                      primary: '#22c55e',
                      secondary: '#fff',
                    },
                  },
                  error: {
                    duration: 5000,
                    iconTheme: {
                      primary: '#ef4444',
                      secondary: '#fff',
                    },
                  },
                }}
              />
            </div>
          </Router>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;


