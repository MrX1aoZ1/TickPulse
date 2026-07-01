'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from './ToastContext';

// Create the context
const AuthContext = createContext();

// Provider component
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { showError } = useToast();

  const checkAuthStatus = async () => {
    try {
      const response = await fetch('http://localhost:3000/auth/check', {
        method: 'GET',
        credentials: 'include', // 攜帶 Cookie
      });

      if (response.ok) {
        const data = await response.json();
        // 假設後端回傳 { authenticated: true, user: { id: 1, email: "..." } }
        setUser(data.user || { authenticated: true });
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('後端 Session 驗證失敗:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuthStatus();
  }, []);

  // Login function
  const login = async (email, password) => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:3000/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      });

      const data = await response.json().catch(() => undefined);

      if (!response.ok) {
        return { success: false, status: response.status, message: data?.message };
      }

      setUser(data.user || { authenticated: true });
      return { success: true, status: response.status, message: 'Login successful' };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, status: response.status, message: 'Server error, please try again later' };
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    try {
      await fetch('http://localhost:3000/auth/logout', {
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
    <AuthContext.Provider value={{ user, loading, login, logout, checkAuthStatus }}>
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