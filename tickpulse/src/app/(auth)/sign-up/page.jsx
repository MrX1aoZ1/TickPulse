'use client';

import Link from 'next/link';
import { FiMail, FiEye, FiEyeOff } from 'react-icons/fi';
import React, { useCallback, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [formError, setFormError] = useState(undefined);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      router.push('/');
    }
  }, []);

  const submitHandler = useCallback(
    async (event) => {
      event.preventDefault();
      setFormError(undefined);

      if (!email) {
        setFormError("Email cannot be empty");
        return;
      }

      if (!password) {
        setFormError("Password cannot be empty");
        return;
      }

      if (password.length < 8) {
        setFormError("Password length cannot be shorter than 8");
        return;
      }

      if (password.length > 63) {
        setFormError("Password length cannot be longer than 863");
        return;
      }

      if (!/(?=.*[0-9])/.test(password)) {
        setFormError("Password must contain numbers");
        return;
      }

      if (!/(?=.*[a-z])/.test(password)) {
        setFormError("Password must contain lowercase letters");
        return;
      }

      if (!/(?=.*[A-Z])/.test(password)) {
        setFormError("Password must contain uppercase letters");
        return;
      }

      if (!/(?=.*[!@#$%^&*.])/.test(password)) {
        setFormError("Password must contain special characters");
        return;
      }

      if (!/^[a-zA-Z0-9!@#$%^&*.]{8,63}$/.test(password)) {
        setFormError("Password can only contain letters, numbers and special characters");
        return;
      }

      if (!confirmPassword) {
        setFormError("Confirmed password cannot be empty");
        return;
      }

      if (password !== confirmPassword) {
        setFormError("Password and confirmed password do not match");
        return;
      }

      setIsLoading(true);

      // Send sign-up request to the backend
      try {
        const response = await fetch(
          'http://localhost:3000/auth/sign-up',
          {
            method: 'POST',
            headers: {
              Accept: 'application/json',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password }),
          });

        console.log('Login response status:', response.status);

        if (response.status === 400) {
          setIsLoading(false);
          setFormError("Email already exists");
          return;
        }
        if (500 <= response.status && response.status < 600) {
          setIsLoading(false);
          setFormError("Server error, please try again later");
        }

        if (!response.ok) {
          setIsLoading(false);
          setFormError("Unknown error, please try again later");
          return;
        }

        router.push('/login');

      } catch (error) {
        setIsLoading(false);
        setFormError("Network error, please try again later");
      }
    },
    [email, password, confirmPassword, router],
  );


  return (
    <div className="min-h-screen bg-stone-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="bg-white rounded-lg shadow-lg p-8 border border-gray-200">
          {/* Title */}
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Create New Account</h1>
          </div>

          {/* Sign-up Form */}
          <form className="mt-8 space-y-6" onSubmit={submitHandler}>
            {/* Email */}
            <div className="relative">
              <FiMail className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                }}
                className="w-full px-4 py-2 pr-8 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                placeholder="Email Address"
              />
            </div>

            {/* Password */}
            <div className="relative">
              <button
                type="button"
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-500"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <FiEyeOff /> : <FiEye />}   {/* Toggle password visibility */}
              </button>
              <input
                type={showPassword ? 'text' : 'password'} // Show or hide password
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                }}
                className="w-full px-4 py-2 pr-8 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                placeholder="Password"
              />
            </div>

            {/* Confirmed Password */}
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
                value={confirmPassword}
                onChange={(event) => {
                  setConfirmPassword(event.target.value);
                }}
                className="w-full px-4 py-2 pr-8 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                placeholder="Confirmed Password"
              />
            </div>

            {/* Sign-up button */}
            <button
              type="submit"
              className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors"
              disabled={isLoading}
            >
              {isLoading ? "Register..." : "Register"}
            </button>

            {/* Login Password */}
            <div className="text-center mt-4">
              <p className="text-sm text-gray-600">
                Already have an account?{" "}
                <Link
                  href="/login"
                  className="text-blue-600 hover:text-blue-800 ml-1 font-medium"
                >
                  Click here
                </Link>
                {" "}to login.
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