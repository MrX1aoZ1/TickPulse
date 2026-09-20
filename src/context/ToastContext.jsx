'use client';

import { createContext, useContext, useState, useCallback } from 'react';
import Toast from '@/components/ui/Toast';
import { v4 as uuidv4 } from 'uuid'; // Import uuid

const ToastContext = createContext();

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  
  // Add a new toast
  const addToast = useCallback((message, type = 'error', duration = 5000) => {
    const id = uuidv4(); // Use uuidv4 for unique IDs
    setToasts(prev => [...prev, { id, message, type, duration }]);
    return id;
  }, []);
  
  // Remove a toast by id
  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);
  
  // Convenience methods for different toast types
  const showError = useCallback((message, duration) => 
    addToast(message, 'error', duration), [addToast]);
    
  const showSuccess = useCallback((message, duration) => 
    addToast(message, 'success', duration), [addToast]);
    
  const showWarning = useCallback((message, duration) => 
    addToast(message, 'warning', duration), [addToast]);
    
  const showInfo = useCallback((message, duration) => 
    addToast(message, 'info', duration), [addToast]);
  
  return (
    <ToastContext.Provider value={{ 
      showError, 
      showSuccess, 
      showWarning, 
      showInfo 
    }}>
      {children}
      
      {/* Render all active toasts */}
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);