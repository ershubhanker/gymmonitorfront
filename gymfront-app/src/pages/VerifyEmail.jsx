import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Mail, ArrowLeft, CheckCircle, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';
import api from '../services/api';

const VerifyEmail = () => {
  const { register, handleSubmit, setValue, formState: { errors } } = useForm();
  const { verifyEmail, tempEmail, loading } = useAuth();
  const navigate = useNavigate();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [resendLoading, setResendLoading] = useState(false);
  const [timer, setTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const [verificationError, setVerificationError] = useState('');

  useEffect(() => {
    if (!tempEmail) {
      navigate('/signup');
    }
  }, [tempEmail, navigate]);

  // Timer countdown effect
  useEffect(() => {
    let interval;
    if (timer > 0 && !canResend) {
      interval = setInterval(() => {
        setTimer((prevTimer) => prevTimer - 1);
      }, 1000);
    } else if (timer === 0) {
      setCanResend(true);
    }
    return () => clearInterval(interval);
  }, [timer, canResend]);

  // Reset timer when resend is clicked
  const resetTimer = () => {
    setTimer(30);
    setCanResend(false);
  };

  const handleOtpChange = (index, value) => {
    if (value.length > 1) return;
    
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setValue('otp', newOtp.join(''));
    setVerificationError(''); // Clear error when user types

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      if (prevInput) prevInput.focus();
    }
  };

  const handleResendOtp = async () => {
    if (!canResend) return;
    
    setResendLoading(true);
    setVerificationError('');
    
    try {
      console.log('Resending OTP to:', tempEmail);
      
      // Call the dedicated resend verification endpoint
      const response = await api.post('/resend-verification-otp', { email: tempEmail });
      
      console.log('Resend response:', response.data);
      
      if (response.data) {
        toast.success('New verification code sent successfully!');
        resetTimer();
        // Clear OTP inputs
        setOtp(['', '', '', '', '', '']);
        setValue('otp', '');
      }
    } catch (error) {
      console.error('Resend OTP error:', error);
      
      let errorMessage = 'Failed to resend OTP';
      
      if (error.response) {
        // The request was made and the server responded with a status code
        console.error('Error response data:', error.response.data);
        console.error('Error response status:', error.response.status);
        
        if (error.response.status === 404) {
          errorMessage = 'User not found. Please sign up again.';
          setTimeout(() => navigate('/signup'), 3000);
        } else if (error.response.status === 400) {
          errorMessage = error.response.data?.detail || 'Email already verified';
          if (errorMessage.includes('already verified')) {
            setTimeout(() => navigate('/login'), 2000);
          }
        } else if (error.response.status === 429) {
          errorMessage = 'Too many requests. Please try again later.';
        } else {
          errorMessage = error.response.data?.detail || errorMessage;
        }
      } else if (error.request) {
        // The request was made but no response was received
        errorMessage = 'Network error. Please check your connection.';
      }
      
      toast.error(errorMessage);
    } finally {
      setResendLoading(false);
    }
  };

  const onSubmit = async (data) => {
    if (data.otp.length !== 6) {
      toast.error('Please enter complete OTP');
      return;
    }
    
    setVerificationError('');
    
    try {
      const result = await verifyEmail(tempEmail, data.otp);
      if (result.success) {
        toast.success('Email verified successfully!');
        setTimeout(() => navigate('/login'), 1500);
      }
    } catch (error) {
      console.error('Verification error:', error);
      setVerificationError('Invalid or expired OTP. Please try again.');
    }
  };

  if (!tempEmail) return null;

  // Format time as MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-2xl shadow-xl">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-blue-100 p-3 rounded-full animate-pulse">
              <CheckCircle className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900">Verify Your Email</h2>
          <p className="mt-2 text-sm text-gray-600">
            We've sent a verification code to
          </p>
          <p className="text-sm font-medium text-blue-600 bg-blue-50 px-4 py-2 rounded-lg mt-2 inline-block">
            {tempEmail}
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4">
            <label className="block text-gray-700 text-sm font-medium mb-2 text-center">
              Enter 6-digit OTP
            </label>
            <div className="flex gap-2 justify-center">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  id={`otp-${index}`}
                  type="text"
                  maxLength="1"
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className={`w-12 h-12 text-center text-xl font-semibold border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                    verificationError ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                  disabled={loading}
                />
              ))}
            </div>
            <input
              type="hidden"
              {...register('otp', { 
                required: 'OTP is required',
                minLength: {
                  value: 6,
                  message: 'OTP must be 6 digits'
                }
              })}
            />
            {errors.otp && (
              <p className="text-xs text-red-500 text-center mt-2">
                {errors.otp.message}
              </p>
            )}
            {verificationError && (
              <p className="text-sm text-red-500 text-center mt-2 bg-red-50 p-2 rounded-lg">
                {verificationError}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200"
          >
            {loading ? <LoadingSpinner /> : 'Verify Email'}
          </button>

          <div className="text-center space-y-4">
            {/* Timer and Resend Section */}
            <div className="bg-gray-50 p-4 rounded-lg">
              {!canResend ? (
                <div className="flex items-center justify-center gap-2 text-gray-600">
                  <Clock className="h-4 w-4 text-blue-500" />
                  <span className="text-sm">Resend OTP in</span>
                  <span className="font-mono font-bold text-blue-600 bg-blue-100 px-2 py-1 rounded">
                    {formatTime(timer)}
                  </span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resendLoading}
                  className="text-blue-600 hover:text-blue-800 font-medium text-sm flex items-center justify-center gap-2 mx-auto disabled:opacity-50 w-full"
                >
                  {resendLoading ? (
                    <>
                      <LoadingSpinner />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="h-4 w-4" />
                      Resend Verification Code
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Help Text */}
            <p className="text-xs text-gray-500">
              Didn't receive the code? Check your spam folder or try resending.
            </p>

            {/* Back to Signup Link */}
            <Link 
              to="/signup" 
              className="inline-flex items-center text-sm text-blue-600 hover:text-blue-500 font-medium mt-2 group"
            >
              <ArrowLeft className="h-4 w-4 mr-1 group-hover:-translate-x-1 transition-transform" />
              Back to Sign Up
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default VerifyEmail;