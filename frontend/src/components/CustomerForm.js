import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Camera, User, Phone, CheckCircle } from 'lucide-react';
import api from '../services/authService';
import toast from 'react-hot-toast';
import LoadingSpinner from './LoadingSpinner';
import CameraCapture from './CameraCapture';
import PhoneVerification from './PhoneVerification';

const CustomerForm = ({ onClose, onSuccess }) => {
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customerPhoto, setCustomerPhoto] = useState(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [showPhoneVerification, setShowPhoneVerification] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    defaultValues: {
      first_name: '',
      last_name: '',
      gender: 'Male',
      date_of_birth: '',
      address: '',
      nic_number: '',
      phone_number: '',
      email: '',
    },
  });

  // Create customer mutation
  const createCustomerMutation = useMutation({
    mutationFn: async (customerData) => {
      const response = await api.post('/customers', customerData);
      return response.data;
    },
    onSuccess: (data) => {
        queryClient.invalidateQueries('customers');
        toast.success('Customer created successfully');
        reset();
        onClose();
        if (onSuccess) onSuccess(data);
      },
      onError: (error) => {
        console.error('Customer creation error:', error);
        const errorMessage = error.response?.data?.message || 'Failed to create customer';
        const statusCode = error.response?.status;
        
        if (statusCode === 409) {
          toast.error(`Conflict: ${errorMessage}. Please check if customer already exists.`);
        } else {
          toast.error(errorMessage);
        }
      },
    }
  );

  const handlePhotoCapture = (photoData) => {
    setCustomerPhoto(photoData);
    setIsCameraOpen(false);
  };

  const handlePhoneVerification = (phone) => {
    setPhoneNumber(phone);
    setShowPhoneVerification(true);
  };

  const handlePhoneVerified = () => {
    setPhoneVerified(true);
    setShowPhoneVerification(false);
    toast.success('Phone number verified successfully!');
  };

  const onSubmit = async (data) => {
    if (!customerPhoto) {
      toast.error('Please capture a customer photo before submitting');
      return;
    }

    if (!phoneVerified) {
      toast.error('Please verify the phone number before submitting');
      return;
    }
    
    setIsSubmitting(true);
    try {
      // Include photo data and phone verification status in the submission
      const customerData = {
        ...data,
        photo: customerPhoto, // Add photo to the data
        phone_is_verified: true // Mark phone as verified
      };
      
      console.log('Submitting customer data:', {
        ...customerData,
        photo: customerPhoto ? 'Base64 photo data present' : 'No photo'
      });
      
      await createCustomerMutation.mutateAsync(customerData);
    } catch (error) {
      // Error is already handled by the mutation's onError
      console.error('Form submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Customer Photo Section */}
      <div className="bg-gray-50 rounded-lg p-4">
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Customer Photo *
        </label>
        <div className="flex items-center space-x-4">
          <div className="flex-shrink-0">
            {customerPhoto ? (
              <img
                src={customerPhoto}
                alt="Customer"
                className="h-20 w-20 rounded-lg object-cover border-2 border-gray-200"
              />
            ) : (
              <div className="h-20 w-20 rounded-lg bg-gray-200 border-2 border-dashed border-gray-300 flex items-center justify-center">
                <User className="h-8 w-8 text-gray-400" />
              </div>
            )}
          </div>
          <div className="flex-1">
            <button
              type="button"
              onClick={() => setIsCameraOpen(true)}
              className="btn btn-outline flex items-center space-x-2"
            >
              <Camera className="h-4 w-4" />
              <span>{customerPhoto ? 'Retake Photo' : 'Capture Photo'}</span>
            </button>
            <p className="text-xs text-gray-500 mt-1">
              Photo is required for customer identification
            </p>
          </div>
        </div>
      </div>

      {/* Personal Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            First Name *
          </label>
          <input
            type="text"
            {...register('first_name', { 
              required: 'First name is required',
              minLength: { value: 2, message: 'First name must be at least 2 characters' }
            })}
            className="input w-full"
            placeholder="Enter first name"
          />
          {errors.first_name && (
            <p className="text-red-500 text-xs mt-1">{errors.first_name.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Last Name *
          </label>
          <input
            type="text"
            {...register('last_name', { 
              required: 'Last name is required',
              minLength: { value: 2, message: 'Last name must be at least 2 characters' }
            })}
            className="input w-full"
            placeholder="Enter last name"
          />
          {errors.last_name && (
            <p className="text-red-500 text-xs mt-1">{errors.last_name.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Gender *
          </label>
          <select
            {...register('gender', { required: 'Gender is required' })}
            className="input w-full"
          >
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
          {errors.gender && (
            <p className="text-red-500 text-xs mt-1">{errors.gender.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Date of Birth *
          </label>
          <input
            type="date"
            {...register('date_of_birth', { 
              required: 'Date of birth is required',
              validate: (value) => {
                const today = new Date();
                const birthDate = new Date(value);
                if (birthDate >= today) {
                  return 'Date of birth must be in the past';
                }
                return true;
              }
            })}
            className="input w-full"
          />
          {errors.date_of_birth && (
            <p className="text-red-500 text-xs mt-1">{errors.date_of_birth.message}</p>
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Address *
        </label>
        <textarea
          {...register('address', { 
            required: 'Address is required',
            minLength: { value: 10, message: 'Address must be at least 10 characters' }
          })}
          className="input w-full"
          rows={3}
          placeholder="Enter full address"
        />
        {errors.address && (
          <p className="text-red-500 text-xs mt-1">{errors.address.message}</p>
        )}
      </div>

      {/* Contact Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            NIC Number *
          </label>
          <input
            type="text"
            {...register('nic_number', { 
              required: 'NIC number is required',
              pattern: {
                value: /^[0-9]{9}[vVxX]|[0-9]{12}$/,
                message: 'Invalid NIC number format'
              }
            })}
            className="input w-full"
            placeholder="e.g., 901234567V or 199012345678"
          />
          {errors.nic_number && (
            <p className="text-red-500 text-xs mt-1">{errors.nic_number.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Phone Number *
          </label>
          <div className="flex space-x-2">
            <input
              type="tel"
              {...register('phone_number', { 
                required: 'Phone number is required',
                pattern: {
                  value: /^[0-9]{10}$/,
                  message: 'Phone number must be 10 digits'
                }
              })}
              className="input flex-1"
              placeholder="e.g., 0771234567"
              disabled={phoneVerified}
            />
            {!phoneVerified ? (
              <button
                type="button"
                onClick={() => {
                  const phoneValue = document.querySelector('input[name="phone_number"]').value;
                  if (phoneValue && phoneValue.length === 10) {
                    handlePhoneVerification(`+94${phoneValue.substring(1)}`);
                  } else {
                    toast.error('Please enter a valid 10-digit phone number first');
                  }
                }}
                className="btn btn-outline flex items-center space-x-1"
              >
                <Phone className="h-4 w-4" />
                <span>Verify</span>
              </button>
            ) : (
              <div className="flex items-center space-x-1 px-3 py-2 bg-green-50 border border-green-200 rounded-md">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-600 font-medium">Verified</span>
              </div>
            )}
          </div>
          {errors.phone_number && (
            <p className="text-red-500 text-xs mt-1">{errors.phone_number.message}</p>
          )}
          {phoneVerified && (
            <p className="text-green-600 text-xs mt-1">
              Phone number {phoneNumber} has been verified
            </p>
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Email Address
        </label>
        <input
          type="email"
          {...register('email', {
            pattern: {
              value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
              message: 'Invalid email address'
            }
          })}
          className="input w-full"
          placeholder="Enter email address (optional)"
        />
        {errors.email && (
          <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>
        )}
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-3 pt-4 border-t">
        <button
          type="button"
          onClick={onClose}
          className="btn btn-outline"
          disabled={isSubmitting}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={isSubmitting || !customerPhoto || !phoneVerified}
        >
          {isSubmitting ? (
            <>
              <LoadingSpinner size="sm" />
              <span className="ml-2">Creating...</span>
            </>
          ) : (
            'Create Customer'
          )}
        </button>
      </div>

      {/* Camera Capture Modal */}
      <CameraCapture
        isOpen={isCameraOpen}
        onCapture={handlePhotoCapture}
        onClose={() => setIsCameraOpen(false)}
      />

      {/* Phone Verification Modal */}
      {showPhoneVerification && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Verify Phone Number</h3>
            <PhoneVerification
              phoneNumber={phoneNumber}
              onVerified={handlePhoneVerified}
              onCancel={() => setShowPhoneVerification(false)}
            />
          </div>
        </div>
      )}
    </form>
  );
};

export default CustomerForm;
