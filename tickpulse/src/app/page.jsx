'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TaskProvider } from '@/context/TaskContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { ToastProvider } from '@/context/ToastContext';
import NavigationBar from '@/components/NavigationBar';
import TaskModule from '@/components/TaskModule';
import withAuth from '@/components/WithAuth';

import "@/styles/globals.css";

export default function Home() {
  const router = useRouter();
  

  useEffect(() => {
    const checkAuth = async () => {
      if (process.env.NODE_ENV === 'development') {
        return; 
      }
      
      const token = localStorage.getItem('accessToken');
      if (!token) {
        router.push('/login');
      }
    };
    checkAuth();
  }, [router]);
  
  return (
    <ThemeProvider>
      <ToastProvider>
        <TaskProvider>
          <div className="flex h-screen bg-white dark:bg-zinc-800">
            <NavigationBar />
            <TaskModule />
          </div>
        </TaskProvider>
      </ToastProvider>
    </ThemeProvider>
  );
  
}



