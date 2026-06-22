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
    try {
      // 🎯 打向後端用來檢查當前登入狀態的路由（例如 /auth/me 或 /api/tasks 根路由）
      // 這裡強制加上 credentials: 'include' 讓瀏覽器帶上 Cookie 去敲門
      const response = await fetch('http://localhost:3000/api/tasks', { 
        method: 'GET',
        credentials: 'include' 
      });

      // 如果後端回傳 401 (未授權) 或 403 (被禁止)，代表 Cookie 失效或根本沒登入
      if (response.status === 401 || response.status === 403) {
        router.push('/login');
      }
    } catch (error) {
      console.error('檢查驗證狀態失敗:', error);
      // 網路斷線或後端崩潰時的保底處理，避免無限跳轉
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



