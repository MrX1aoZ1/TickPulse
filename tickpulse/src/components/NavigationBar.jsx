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

const TIMER_MODES = [
  { key: 'pomodoro', label: 'Pomodoro', duration: 25 * 60 },
  { key: 'shortBreak', label: 'Short Break', duration: 5 * 60 },
  { key: 'longBreak', label: 'Long Break', duration: 15 * 60 },
  { key: 'stopwatch', label: 'Stopwatch', duration: 0 },
  { key: 'countdown', label: 'Countdown', duration: 0 },
];

export default function NavigationBar() {
  const { theme, toggleTheme } = useTheme();
  const { dispatch, selectedView, activeFilter } = useTasks();
  const router = useRouter();
  const { showInfo } = useToast(); // Get showInfo from useToast

  // Timer state
  const [isRunning, setIsRunning] = useState(false);
  const [timerMode, setTimerMode] = useState('pomodoro');
  const [time, setTime] = useState(25 * 60);
  const [customMinutes, setCustomMinutes] = useState(5);
  const [customSeconds, setCustomSeconds] = useState(0);
  const timerRef = useRef(null);
  const [progress, setProgress] = useState(100);
  const audioRef = useRef(null); // Ref for the audio element

  // Timer durations in seconds
  const timerDurations = {
    pomodoro: 25 * 60,
    shortBreak: 5 * 60,
    longBreak: 15 * 60,
    stopwatch: 0,
    countdown: customMinutes * 60 + customSeconds,
  };

  // Initialize timer when mode changes
  useEffect(() => {
    if (timerMode === 'countdown') {
      setTime(customMinutes * 60 + customSeconds);
    } else if (timerMode === 'stopwatch') {
      setTime(0);
    } else {
      setTime(timerDurations[timerMode]);
    }
    setIsRunning(false);
    if (timerRef.current) clearInterval(timerRef.current);
    setProgress(timerMode === 'stopwatch' ? 0 : 100);

    // Initialize audio element
    if (!audioRef.current) {
      audioRef.current = new Audio('/alert.mp3'); // Assuming alert.mp3 is in the public folder
    }
  }, [timerMode, customMinutes, customSeconds]);

  // Update progress for animation
  useEffect(() => {
    if (timerMode === 'stopwatch') {
      if (time > 0) {
        const maxTime = 60 * 60;
        setProgress(Math.min((time / maxTime) * 100, 100));
      } else {
        setProgress(0);
      }
    } else {
      const totalTime = timerMode === 'countdown'
        ? customMinutes * 60 + customSeconds
        : timerDurations[timerMode];
      if (totalTime > 0) {
        setProgress((time / totalTime) * 100);
      } else {
        setProgress(0);
      }
    }
  }, [time, timerMode, customMinutes, customSeconds]);

  // Timer controls
  const startTimer = () => {
    if (!isRunning) {
      setIsRunning(true);
      timerRef.current = setInterval(() => {
        setTime(prevTime => {
          if (timerMode === 'stopwatch') {
            return prevTime + 1;
          } else {
            if (prevTime <= 1) {
              clearInterval(timerRef.current);
              setIsRunning(false);
              // Play sound and show notification for pomodoro and countdown
              if (timerMode === 'pomodoro' || timerMode === 'countdown') {
                if (audioRef.current) {
                  audioRef.current.play().catch(error => console.error("Error playing sound:", error));
                }
                const modeLabel = TIMER_MODES.find(m => m.key === timerMode)?.label || 'Timer';
                showInfo(`${modeLabel} has finished!`);
              }
              return 0;
            }
            return prevTime - 1;
          }
        });
      }, 1000);
    }
  };

  const pauseTimer = () => {
    if (isRunning) {
      clearInterval(timerRef.current);
      setIsRunning(false);
    }
  };

  const resetTimer = () => {
    clearInterval(timerRef.current);
    setIsRunning(false);
    if (timerMode === 'countdown') {
      setTime(customMinutes * 60 + customSeconds);
    } else if (timerMode === 'stopwatch') {
      setTime(0);
      setProgress(0);
    } else {
      setTime(timerDurations[timerMode]);
      setProgress(100);
    }
  };

  // Format time as MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Function to handle filter selection
  const handleFilterSelect = (filter) => {
    dispatch({ type: 'SET_VIEW', payload: 'filter' });
    dispatch({ type: 'SET_FILTER', payload: filter });
    router.push('/');
  };

  try {
    // 🎯 1. 發送登出請求給後端，強制攜帶 credentials 讓後端知道要銷毀哪一個 Cookie
    const response = await fetch('http://localhost:3000/auth/logout', {
      method: 'POST', // 或是 GET，取決於你後端登出路由的設定（通常是 POST 或 DELETE）
      credentials: 'include', 
    });

    if (!response.ok) {
      console.warn('後端登出 Session 銷毀失敗，將強制進行前端清理');
    }
  } catch (error) {
    console.error('登出請求發送失敗:', error);
  } finally {
    // 🎯 2. 前端清理保壘：不論後端成功與否，前端都要把緩存清空
    if (typeof window !== 'undefined') {
      // 如果你之前在 TaskContext 裡有存 'tickpulseState'，順便清掉它
      localStorage.removeItem('tickpulseState'); 
      
      // 如果有殘留的舊 token，也一併清理乾淨
      localStorage.removeItem('accessToken'); 
    }

    // 🎯 3. 跳轉回登入頁
    router.push('/login');
    
    // 💡 溫馨小貼士：如果你的 App 狀態沒有因為 router.push 完全重置，
    // 可以考慮直接用 window.location.href = '/login'; 
    // 這樣可以強制刷新整頁，把 React Context 裡面的任務、分類狀態「瞬間物理清空」，最安全！
  }
};

  // Handle calendar view
  const handleCalendarView = () => {
    router.push('/calendar');
  };

  // Timer mode selector
  const renderTimerModeSelector = () => (
    <div className="flex flex-wrap gap-2 mb-2">
      {TIMER_MODES.map(mode => (
        <button
          key={mode.key}
          className={`px-2 py-1 rounded text-xs ${
            timerMode === mode.key
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 dark:bg-zinc-700 text-gray-800 dark:text-gray-200'
          }`}
          onClick={() => setTimerMode(mode.key)}
        >
          {mode.label}
        </button>
      ))}
    </div>
  );

  // Timer input for countdown
  const renderCountdownInput = () => (
    <div className="flex items-center gap-1 mb-2">
      <input
        type="number"
        min="0"
        max="99"
        value={customMinutes}
        onChange={e => setCustomMinutes(Number(e.target.value))}
        className="w-10 px-1 py-0.5 rounded border text-xs"
      />
      <span>:</span>
      <input
        type="number"
        min="0"
        max="59"
        value={customSeconds}
        onChange={e => setCustomSeconds(Number(e.target.value))}
        className="w-10 px-1 py-0.5 rounded border text-xs"
      />
      <button
        className="ml-2 px-2 py-0.5 rounded bg-blue-500 text-white text-xs"
        onClick={() => setTime(customMinutes * 60 + customSeconds)}
      >
        Set
      </button>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-gray-100 dark:bg-zinc-900 border-r border-gray-200 dark:border-zinc-700">
      {/* App Logo/Name */}
      <div className="p-4 border-b border-gray-200 dark:border-zinc-700">
        <h1 className="text-xl font-bold text-blue-600 dark:text-blue-400">TickPulse</h1>
      </div>

      <nav className="flex-1 overflow-y-auto p-2 space-y-1">
        {/*
        Timer Section
        <div className="mb-4">
          <h2 className="px-2 py-1 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Timer
          </h2>
          
        
          <div className="flex justify-center my-2">
            <div className="relative w-20 h-20">
              
              <div className="absolute inset-0 rounded-full border-4 border-gray-200 dark:border-zinc-700"></div>
              
              
              <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke={isRunning ? (timerMode === 'pomodoro' ? '#ef4444' : '#3b82f6') : '#d1d5db'}
                  strokeWidth="8"
                  strokeDasharray="283"
                  strokeDashoffset={283 - (283 * progress) / 100}
                  strokeLinecap="round"
                />
              </svg>
              
              
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                  {formatTime(time)}
                </span>
              </div>
            </div>
          </div>
          
          
          <div className="flex justify-center space-x-2 mb-2">
            {!isRunning ? (
              <button
                onClick={startTimer}
                className="p-1 rounded-full bg-green-500 text-white hover:bg-green-600"
                title="Start"
              >
                <PlayIcon className="h-5 w-5" />
              </button>
            ) : (
              <button
                onClick={pauseTimer}
                className="p-1 rounded-full bg-yellow-500 text-white hover:bg-yellow-600"
                title="Pause"
              >
                <PauseIcon className="h-5 w-5" />
              </button>
            )}
            <button
              onClick={resetTimer}
              className="p-1 rounded-full bg-gray-500 text-white hover:bg-gray-600"
              title="Reset"
            >
              <ArrowPathIcon className="h-5 w-5" />
            </button>
          </div>
          
          
          {renderTimerModeSelector()}
          
         
          {timerMode === 'countdown' && renderCountdownInput()}
          
          
          <button
            onClick={() => router.push('/timer')}
            className="w-full flex items-center px-3 py-2 text-sm rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-zinc-800"
          >
            <ClockIcon className="h-5 w-5 mr-2" />
            Timer Page
          </button>
        </div>
        */}

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