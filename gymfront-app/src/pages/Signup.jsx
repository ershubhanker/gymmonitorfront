import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Mail, Lock, User, UserCircle, LogIn, ArrowLeft, Dumbbell } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import InputField from '../components/InputField';
import LoadingSpinner from '../components/LoadingSpinner';

const Signup = () => {
  const { register, handleSubmit, watch, formState: { errors } } = useForm();
  const { signup, loading } = useAuth();
  const navigate = useNavigate();

  const onSubmit = async (data) => {
    console.log('Form data:', data);
    
    const result = await signup({
      email: data.email,
      username: data.username,
      full_name: data.fullName,
      password: data.password
    });
    
    console.log('Signup result:', result);
    
    if (result.success) {
      navigate('/verify-email');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Navigation Bar */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-3 py-1.5 rounded-xl font-bold text-lg shadow-md flex items-center gap-2">
              <Dumbbell className="h-5 w-5" />
              <span>Gym Monitor</span>
            </div>
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-gray-600 hover:text-blue-600 font-medium text-sm px-4 py-2 rounded-lg hover:bg-blue-50 transition-all"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </button>
          </div>
        </div>
      </nav>

      {/* Signup Form */}
      <div className="flex items-center justify-center px-4 py-12 min-h-[calc(100vh-4rem)]">
        <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-2xl shadow-xl">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-blue-100 p-3 rounded-full">
                <UserCircle className="h-8 w-8 text-blue-600" />
              </div>
            </div>
            <h2 className="text-3xl font-extrabold text-gray-900">Create Account</h2>
            <p className="mt-2 text-sm text-gray-600">
              Join us today! Fill in your details
            </p>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
            <InputField
              label="Full Name"
              type="text"
              name="fullName"
              register={register}
              error={errors.fullName?.message}
              icon={User}
              placeholder="Enter your full name"
              rules={{ required: 'Full name is required' }}
            />

            <InputField
              label="Username"
              type="text"
              name="username"
              register={register}
              error={errors.username?.message}
              icon={User}
              placeholder="Choose a username"
              rules={{ required: 'Username is required' }}
            />

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

            <InputField
              label="Password"
              type="password"
              name="password"
              register={register}
              error={errors.password?.message}
              icon={Lock}
              placeholder="Create a password"
              rules={{ 
                required: 'Password is required',
                minLength: {
                  value: 8,
                  message: 'Password must be at least 8 characters'
                }
              }}
            />

            <InputField
              label="Confirm Password"
              type="password"
              name="confirmPassword"
              register={register}
              error={errors.confirmPassword?.message}
              icon={Lock}
              placeholder="Confirm your password"
              rules={{ 
                required: 'Please confirm your password',
                validate: value => value === watch('password') || 'Passwords do not match'
              }}
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200"
            >
              {loading ? <LoadingSpinner /> : 'Sign Up'}
            </button>

            <div className="text-center">
              <p className="text-sm text-gray-600">
                Already have an account?{' '}
                <Link to="/login" className="text-blue-600 hover:text-blue-500 font-medium">
                  Sign in
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Signup;