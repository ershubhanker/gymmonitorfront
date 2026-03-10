import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Lock, ArrowLeft, Key } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import InputField from '../components/InputField';
import LoadingSpinner from '../components/LoadingSpinner';

const ResetPassword = () => {
  const { register, handleSubmit, watch, formState: { errors } } = useForm();
  const { resetPassword, tempEmail, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!tempEmail) {
      navigate('/forgot-password');
    }
  }, [tempEmail, navigate]);

  const onSubmit = async (data) => {
    const result = await resetPassword(tempEmail, data.otp, data.newPassword);
    if (result.success) {
      navigate('/login');
    }
  };

  if (!tempEmail) return null;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-2xl shadow-xl">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-blue-100 p-3 rounded-full">
              <Key className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900">Reset Password</h2>
          <p className="mt-2 text-sm text-gray-600">
            Enter the OTP sent to your email and your new password
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <InputField
            label="OTP Code"
            type="text"
            name="otp"
            register={register}
            error={errors.otp?.message}
            icon={Lock}
            placeholder="Enter 6-digit OTP"
            rules={{ 
              required: 'OTP is required',
              minLength: {
                value: 6,
                message: 'OTP must be 6 digits'
              },
              maxLength: {
                value: 6,
                message: 'OTP must be 6 digits'
              }
            }}
          />

          <InputField
            label="New Password"
            type="password"
            name="newPassword"
            register={register}
            error={errors.newPassword?.message}
            icon={Lock}
            placeholder="Enter new password"
            rules={{ 
              required: 'New password is required',
              minLength: {
                value: 8,
                message: 'Password must be at least 8 characters'
              }
            }}
          />

          <InputField
            label="Confirm New Password"
            type="password"
            name="confirmPassword"
            register={register}
            error={errors.confirmPassword?.message}
            icon={Lock}
            placeholder="Confirm new password"
            rules={{ 
              required: 'Please confirm your password',
              validate: value => value === watch('newPassword') || 'Passwords do not match'
            }}
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200"
          >
            {loading ? <LoadingSpinner /> : 'Reset Password'}
          </button>

          <div className="text-center">
            <Link to="/login" className="inline-flex items-center text-sm text-blue-600 hover:text-blue-500 font-medium">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Login
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;