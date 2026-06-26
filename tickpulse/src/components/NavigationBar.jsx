'use client';

import { useState, useEffect, useRef } from 'react';
import { useTasks } from '@/context/TaskContext';
import { useTheme } from '@/context/ThemeContext';
import { useRouter } from 'next/navigation';
import { SunIcon, MoonIcon, CalendarDaysIcon, CheckCircleIcon, InboxIcon, PlayIcon, PauseIcon, ArrowPathIcon, ClockIcon, StopIcon } from '@heroicons/react/24/outline';
import CategoryList from './CategoryList';
import FilterSelector from   './FilterSelector';
import { useToast } from '@/context/ToastContext'; // Import useToast

const predefinedFilters = [
  { name: 'All Tasks', filter: 'all', icon: InboxIcon },
  { name: 'Today\'s Tasks', filter: 'today', icon: CalendarDaysIcon },
  { name: 'Completed Tasks', filter: 'completed', icon: CheckCircleIcon },
];


export default function NavigationBar() {
  const { theme, toggleTheme } = useTheme();
  const { dispatch, selectedView, activeFilter } = useTasks();
  const router = useRouter();
  const { showInfo } = useToast(); // Get showInfo from useToast

  // Function to handle filter selection
  const handleFilterSelect = (filter) => {
    dispatch({ type: 'SET_VIEW', payload: 'filter' });
    dispatch({ type: 'SET_FILTER', payload: filter });
    router.push('/');
  };

  // 🎯 修正：將登出邏輯完美包裝進 async 的 handleLogout 函式中，點擊按鈕時才會觸發
  const handleLogout = async () => {
    try {
      const response = await fetch('http://localhost:3000/auth/logout', {
        method: 'POST',
        credentials: 'include', 
      });

      if (!response.ok) {
        console.warn('後端登出 Session 銷毀失敗，將強制進行前端清理');
      }
    } catch (error) {
      console.error('登出請求發送失敗:', error);
    } finally {
      // 🔒 遵照吩咐：完全保留 localStorage 內的所有原有內容完好無損，絕不主動 removeItem 清空它們
      router.push('/login');
    }
  };

  // Handle calendar view
  const handleCalendarView = () => {
    router.push('/calendar');
  };

  return (
    <div className="flex flex-col h-full bg-gray-100 dark:bg-zinc-900 border-r border-gray-200 dark:border-zinc-700">
      {/* App Logo/Name */}
      <div className="p-4 border-b border-gray-200 dark:border-zinc-700">
        <h1 className="text-xl font-bold text-blue-600 dark:text-blue-400">TickPulse</h1>
      </div>

      <nav className="flex-1 overflow-y-auto p-2 space-y-1">
        {/* Filters Section */}
        <div className="mb-4">
          <h2 className="px-2 py-1 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Filters
          </h2>
          {predefinedFilters.map((filter) => (
            <button
              key={filter.filter}
              onClick={() => handleFilterSelect(filter.filter)}
              className={`w-full flex items-center px-3 py-2 text-sm rounded-md ${
                selectedView === 'filter' && activeFilter === filter.filter
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-zinc-800'
              }`}
            >
              <filter.icon className="h-5 w-5 mr-2" />
              {filter.name}
            </button>
          ))}
        </div>

        {/* Categories Section */}
        <div className="mb-4">
          <h2 className="px-2 py-1 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Categories
          </h2>
          <CategoryList />
        </div>
      </nav>

      {/* Bottom Actions */}
      <div className="p-2 border-t border-gray-200 dark:border-zinc-700">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="w-full flex items-center px-3 py-2 text-sm rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-zinc-800 mb-2"
        >
          {theme === 'dark' ? (
            <>
              <SunIcon className="h-5 w-5 mr-2" />
              Light Mode
            </>
          ) : (
            <>
              <MoonIcon className="h-5 w-5 mr-2" />
              Dark Mode
            </>
          )}
        </button>
        
        {/* Calendar View */}
        <button
          onClick={handleCalendarView}
          className="w-full flex items-center px-3 py-2 text-sm rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-zinc-800 mb-2"
        >
          <CalendarDaysIcon className="h-5 w-5 mr-2" />
          Calendar
        </button>
        
        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center px-3 py-2 text-sm rounded-md bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200 hover:bg-red-200 dark:hover:bg-red-900/50"
        >
          Logout
        </button>
      </div>
    </div>
  );
}