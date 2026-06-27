'use client';

import Link from 'next/link';
import { FiMail, FiLock, FiEye, FiEyeOff } from 'react-icons/fi';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import React, { useCallback, useState, useEffect } from 'react';

/**
 * LoginPage component.
 * Renders the login form and handles user authentication.
 */
export default function LoginPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false); // State to manage loading status during login

  const [email, setEmail] = useState(''); // State for email input
  const [password, setPassword] = useState(''); // State for password input
  const [showPassword, setShowPassword] = useState(false); // State to toggle password visibility

  const [formError, setFormError] = useState(undefined); // State for displaying form errors

  useEffect(() => {
    if (loading) return;

    if (user) {
      router.push('/webapp/');
    }
  }, [user, loading, router]);

  /**
   * Handles the form submission for login.
   * Validates inputs, sends login request to the server, and handles response.
   * @param {React.FormEvent<HTMLFormElement>} event - The form submission event.
   */
  const submitHandler = useCallback(
    async (event) => {
      event.preventDefault(); // Prevent default form submission
      setFormError(undefined); // Clear previous errors

      // Validate email
      if (!email) {
        setFormError("Email cannot be empty"); // setEmailError was used here, changed to setFormError for consistency
        return;
      }

      // Validate password
      if (!password) {
        setFormError("Password cannot be empty");
        return;
      }

      setIsLoading(true); // Set loading state

      try {
        // Send login request to the backend
        const response = await fetch(
          'http://localhost:3000/auth/login',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
            credentials: 'include'
          }
        );

        // const response = useState({
        //   status: 200,
        //   data: { message: "Success" }
        // });

        const data = await response.json().catch(() => undefined); // Parse JSON response

        // Handle specific error statuses
        if (response.status === 401) {
          setIsLoading(false);
          setFormError("User not registered, please register first");
          return;
        }
        if (response.status === 402) {
          setIsLoading(false);
          setFormError("Password is incorrect, please try again");
          return;
        }

        // Handle server errors (5xx)
        if (500 <= response.status && response.status < 600) {
          setIsLoading(false);
          setFormError("Server error, please try again later");
          return; // Added return
        }

        // Handle other non-ok responses
        if (!response.ok) {
          setIsLoading(false);
          setFormError(data?.message || "Unknown error, please try again later"); // Use message from data if available
          return;
        }

        // On successful login, store access token and redirect
        // localStorage.setItem('accessToken', data.accessToken);
        // localStorage.setItem('refreshToken', data.refreshToken); // Potentially for refresh token functionality
        router.push('/webapp');

      } catch (error) {
        // Handle network or other unexpected errors
        setIsLoading(false);
        setFormError("Server error, please try again later");
      }
    },
    [email, password, router], // Dependencies for useCallback
  );


  return (
    <div className="min-h-screen bg-stone-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="bg-white rounded-lg shadow-lg p-8 border border-gray-200">
          {/* Page Title */}
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h1>
          </div>

          {/* Login Form */}
          <form className="mt-8 space-y-6" onSubmit={submitHandler}>
            {/* Email Input Field */}
            <div className="relative">
              <FiMail className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                placeholder="Email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  if (formError) setFormError(undefined); // Clear error on input change
                }}
              />
            </div>

            {/* Password Input Field */}
            <div className="relative">
              <button
                type="button"
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-500"
                onClick={() => setShowPassword(!showPassword)} // Toggle password visibility
              >
                {showPassword ? <FiEyeOff /> : <FiEye />}
              </button>
              <input
                type={showPassword ? "text" : "password"} // Dynamically set input type
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                placeholder="Password"
                value={password}  // Show or hide password
                onChange={(event) => {
                  setPassword(event.target.value);
                  if (formError) setFormError(undefined); // Clear error on input change
                }}
              />
            </div>

            {/* Login Button */}
            <button
              type="submit"
              className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors"
              disabled={isLoading} // Disable button when loading
            >
              {isLoading ? "Login..." : "Login"}
            </button>

            {/* Link to Registration Page */}
            <div className="text-center mt-4">
              <p className="text-sm text-gray-600">
                No account?{" "}
                <Link
                  href="/sign-up"
                  className="text-blue-600 hover:text-blue-800 ml-1 font-medium"
                >
                  Click here
                </Link>
                {" "}to register.
              </p>
            </div>

            {/* Display Form Errors */}
            <p className="mx-6 mb-4 text-center text-red-500">
              {formError ?? ''}
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}