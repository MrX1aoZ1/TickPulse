'use client';

import Link from 'next/link';
import { FiMail, FiEye, FiEyeOff } from 'react-icons/fi';
import React, { useCallback, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import SocialAuthButtons from '@/components/SocialAuthButtons';
import { consumeOAuthError } from '@/lib/oauthError';

function validateSignup({ email, password, confirmPassword }) {
  if (!email) return 'Email cannot be empty';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Please enter a valid email address';
  if (!password) return 'Password cannot be empty';
  if (password.length < 8) return 'Password length cannot be shorter than 8';
  if (password.length > 63) return 'Password length cannot be longer than 63';
  if (!/(?=.*[0-9])/.test(password)) return 'Password must contain numbers';
  if (!/(?=.*[a-z])/.test(password)) return 'Password must contain lowercase letters';
  if (!/(?=.*[A-Z])/.test(password)) return 'Password must contain uppercase letters';
  if (!/(?=.*[!@#$%^&*.])/.test(password)) return 'Password must contain special characters';
  if (!/^[a-zA-Z0-9!@#$%^&*.]{8,63}$/.test(password)) {
    return 'Password can only contain letters, numbers and special characters';
  }
  if (!confirmPassword) return 'Confirmed password cannot be empty';
  if (password !== confirmPassword) return 'Password and confirmed password do not match';
  return undefined;
}

export default function RegisterPage() {
  const router = useRouter();
  const { user, loading, signup } = useAuth();

  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formError, setFormError] = useState(undefined);

  useEffect(() => {
    if (loading) return;
    if (user) {
      router.push('/webapp/');
    }
  }, [user, loading, router]);

  useEffect(() => {
    const message = consumeOAuthError(router, '/sign-up');
    if (message) setFormError(message);
  }, [router]);

  const submitHandler = useCallback(
    async (event) => {
      event.preventDefault();

      const validationError = validateSignup({ email, password, confirmPassword });
      if (validationError) {
        setFormError(validationError);
        return;
      }

      setFormError(undefined);
      setIsLoading(true);

      try {
        const result = await signup(email, password);

        if (!result.success) {
          setIsLoading(false);
          if (result.status === 400) {
            setFormError(result.message === 'Already authenticated'
              ? 'You are already signed in'
              : 'Email already exists');
            return;
          }
          if (result.status >= 500) {
            setFormError('Server error, please try again later');
            return;
          }
          setFormError(result.message || 'Unknown error, please try again later');
          return;
        }
      } catch (error) {
        setIsLoading(false);
        setFormError('Network error, please try again later');
      }
    },
    [email, password, confirmPassword, signup],
  );

  const clearErrorOnChange = (setter) => (event) => {
    setter(event.target.value);
    if (formError) setFormError(undefined);
  };

  return (
    <div className="min-h-screen bg-stone-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="bg-white rounded-lg shadow-lg p-8 border border-gray-200">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Create New Account</h1>
          </div>

          <form className="mt-8 space-y-6" onSubmit={submitHandler}>
            <div className="relative">
              <FiMail className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={clearErrorOnChange(setEmail)}
                className="w-full px-4 py-2 pr-8 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                placeholder="Email Address"
              />
            </div>

            <div className="relative">
              <button
                type="button"
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-500"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <FiEyeOff /> : <FiEye />}
              </button>
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={password}
                onChange={clearErrorOnChange(setPassword)}
                className="w-full px-4 py-2 pr-8 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                placeholder="Password"
              />
            </div>

            <div className="relative">
              <button
                type="button"
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-500"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? <FiEyeOff /> : <FiEye />}
              </button>
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={clearErrorOnChange(setConfirmPassword)}
                className="w-full px-4 py-2 pr-8 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                placeholder="Confirmed Password"
              />
            </div>

            <p className="text-xs text-gray-400 -mt-3">
              8–63 characters, with uppercase, lowercase, a number, and a special character (!@#$%^&amp;*.)
            </p>

            <button
              type="submit"
              className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors disabled:opacity-60"
              disabled={isLoading}
            >
              {isLoading ? 'Register...' : 'Register'}
            </button>

            <SocialAuthButtons disabled={isLoading} next="/sign-up" />

            <div className="text-center mt-4">
              <p className="text-sm text-gray-600">
                Already have an account?{' '}
                <Link
                  href="/login"
                  className="text-blue-600 hover:text-blue-800 ml-1 font-medium"
                >
                  Click here
                </Link>
                {' '}to login.
              </p>
            </div>
            <p className="mx-6 mb-4 text-center text-red-500">
              {formError ?? ''}
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
