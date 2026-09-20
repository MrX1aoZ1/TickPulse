'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

// Create the context
const AuthContext = createContext();

const AUTH_API = 'http://localhost:3000';

// Provider component
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const checkAuthStatus = useCallback(async () => {
    try {
      const response = await fetch(`${AUTH_API}/auth/check`, {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user || { authenticated: true });
        return true;
      }

      setUser(null);
      return false;
    } catch (error) {
      console.error('後端 Session 驗證失敗:', error);
      setUser(null);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  // Login function
  const login = async (email, password) => {
    try {
      setLoading(true);
      const response = await fetch(`${AUTH_API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      });

      const data = await response.json().catch(() => undefined);

      if (!response.ok) {
        return { success: false, status: response.status, message: data?.message || data?.error };
      }

      setUser(data.user || { authenticated: true });
      return { success: true, status: response.status, message: 'Login successful' };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, status: 0, message: 'Server error, please try again later' };
    } finally {
      setLoading(false);
    }
  };

  const signup = async (email, password) => {
    try {
      setLoading(true);
      const response = await fetch(`${AUTH_API}/auth/sign-up`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json().catch(() => undefined);

      if (!response.ok) {
        return { success: false, status: response.status, message: data?.error || data?.message };
      }

      return await login(email, password);
    } catch (error) {
      console.error('Sign-up error:', error);
      return { success: false, status: 0, message: 'Network error, please try again later' };
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    try {
      await fetch(`${AUTH_API}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Logout request failed:', error);
    } finally {
      setUser(null);
      localStorage.removeItem('tickpulseState');
      router.push('/login');
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, checkAuthStatus }}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use the auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    console.trace()
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}