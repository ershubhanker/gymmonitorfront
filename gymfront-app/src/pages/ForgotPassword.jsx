import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Mail, ArrowLeft, Send } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import InputField from '../components/InputField';
import LoadingSpinner from '../components/LoadingSpinner';

const ForgotPassword = () => {
  const { register, handleSubmit, formState: { errors } } = useForm();
  const { forgotPassword, loading } = useAuth();
  const navigate = useNavigate();

  const onSubmit = async (data) => {
    const result = await forgotPassword(data.email);
    if (result.success) {
      navigate('/reset-password');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-2xl shadow-xl">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-blue-100 p-3 rounded-full">
              <Send className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900">Forgot Password?</h2>
          <p className="mt-2 text-sm text-gray-600">
            No worries! Enter your email and we'll send you an OTP to reset your password.
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <InputField
            label="Email Address"
            type="email"
            name="email"
            register={register}
            error={errors.email?.message}
            icon={Mail}
            placeholder="Enter your email"
            rules={{ 
              required: 'Email is required',
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message: 'Invalid email address'
              }
            }}
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200"
          >
            {loading ? <LoadingSpinner /> : 'Send OTP'}
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

export default ForgotPassword;