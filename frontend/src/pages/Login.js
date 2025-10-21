import React, { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, Building2, User, ShieldCheck, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';

const Login = () => {
  const { login, isAuthenticated, isLoading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const location = useLocation();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm({
    defaultValues: {
      email: '',
      password: '',
      userType: 'employee',
      role: 'Agent', // Track the visual role selection
    },
  });

  const role = watch('role');

  // Redirect if already authenticated
  if (isAuthenticated) {
    const from = location.state?.from?.pathname || '/dashboard';
    return <Navigate to={from} replace />;
  }

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      // Remove 'role' field - it's only for UI, backend doesn't expect it
      const { role, ...loginData } = data;
      
      const result = await login(loginData);
      if (result.success) {
        // Navigation will be handled by the redirect above
      }
    } catch (error) {
      console.error('Login error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="xl" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-600 to-primary-800 relative overflow-hidden">
        <div className="absolute inset-0 bg-black opacity-20"></div>
        <div className="relative z-10 flex flex-col justify-center px-12 text-white">
          <div className="mb-8">
            <Building2 className="h-16 w-16 mb-4" />
            <h1 className="text-4xl font-bold mb-2">B-Trust Banking</h1>
            <p className="text-xl text-primary-100">
              Secure, Reliable, and Trusted Banking Solutions
            </p>
          </div>
          
          <div className="space-y-6">
            <div className="flex items-center space-x-4">
              <div className="h-12 w-12 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold">Advanced Security</h3>
                <p className="text-primary-100 text-sm">Multi-layer fraud detection</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="h-12 w-12 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold">Employee Portal</h3>
                <p className="text-primary-100 text-sm">Secure access for bank staff</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="h-12 w-12 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                <User className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold">Role-Based Access</h3>
                <p className="text-primary-100 text-sm">Agent, Manager, and Admin roles</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Building2 className="h-12 w-12 mx-auto text-primary-600 mb-4" />
            <h2 className="text-3xl font-bold text-gray-900">Welcome Back</h2>
            <p className="text-gray-600 mt-2">Sign in to your account</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Employee Role Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Employee Role
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'Agent', label: 'Agent', icon: User },
                  { value: 'Manager', label: 'Manager', icon: Users },
                  { value: 'Admin', label: 'Admin', icon: ShieldCheck },
                ].map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setValue('role', value)}
                    className={`
                      flex flex-col items-center p-3 rounded-lg border-2 transition-colors
                      ${role === value
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-gray-200 hover:border-gray-300 text-gray-600'
                      }
                    `}
                  >
                    <Icon className="h-5 w-5 mb-1" />
                    <span className="text-xs font-medium">{label}</span>
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-gray-500">
                Select your role type - the system will verify your credentials
              </p>
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                {...register('email', {
                  required: 'Email is required',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Invalid email address',
                  },
                })}
                type="email"
                id="email"
                className="input w-full"
                placeholder="Enter your email"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  {...register('password', {
                    required: 'Password is required',
                    minLength: {
                      value: 6,
                      message: 'Password must be at least 6 characters',
                    },
                  })}
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  className="input w-full pr-10"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn btn-primary w-full"
            >
              {isSubmitting ? (
                <LoadingSpinner size="sm" className="mr-2" />
              ) : null}
              Sign In
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
