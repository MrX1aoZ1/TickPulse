'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { SunIcon, MoonIcon } from '@heroicons/react/24/outline';
import {
  CheckSquareIcon,
  CalendarIconCustom,
  ArrowLeftEndOnRectangleIconCustom
} from './ui/CustomIcons';

export default function NavigationBar() {
  const router = useRouter();
  const pathname = usePathname();
  const { logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const isCalendar = pathname?.startsWith('/webapp/calendar');
  const isTask = pathname?.startsWith('/webapp') && !isCalendar;
  const isDark = theme === 'dark';

  const handleLogout = async () => {
    try {
      await fetch('http://localhost:3000/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      logout();
      router.push('/login');
    }
  };

  const inactiveTab = isDark
    ? 'text-zinc-500 hover:bg-zinc-800/50 hover:text-zinc-300'
    : 'text-zinc-400 hover:bg-zinc-200 hover:text-zinc-700';
  const activeTab = isDark
    ? 'bg-white text-zinc-900 shadow-sm'
    : 'bg-zinc-900 text-white shadow-sm';

  return (
    <div className="w-14 h-full bg-zinc-100 dark:bg-[#181818] flex flex-col items-center justify-between py-4 border-r border-zinc-200 dark:border-zinc-900 select-none">

      <div className="relative group cursor-pointer">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shadow-md transition-transform active:scale-95">
          TP
        </div>
        <span className="absolute -top-1 -right-1 text-[10px]">👑</span>
      </div>

      <div className="flex flex-col space-y-4 flex-1 justify-center w-full items-center">

        <button
          onClick={() => router.push('/webapp')}
          className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-200 ${
            isTask ? activeTab : inactiveTab
          }`}
          title="Tasks"
        >
          <CheckSquareIcon
            className="w-5 h-5"
            fill={isTask}
            checkStroke={isDark ? '#181818' : '#ffffff'}
          />
        </button>

        <button
          onClick={() => router.push('/webapp/calendar')}
          className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-200 ${
            isCalendar ? activeTab : inactiveTab
          }`}
          title="Calendar"
        >
          <CalendarIconCustom className="w-5 h-5" />
        </button>
      </div>

      <div className="w-full flex flex-col items-center gap-2">
        <button
          onClick={toggleTheme}
          className={`w-10 h-10 flex items-center justify-center rounded-xl transition-colors ${
            isDark
              ? 'text-zinc-500 hover:bg-zinc-800/50 hover:text-amber-300'
              : 'text-zinc-500 hover:bg-zinc-200 hover:text-indigo-600'
          }`}
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDark ? (
            <SunIcon className="w-5 h-5" />
          ) : (
            <MoonIcon className="w-5 h-5" />
          )}
        </button>

        <button
          onClick={handleLogout}
          className={`w-10 h-10 flex items-center justify-center rounded-xl transition-colors ${
            isDark
              ? 'text-zinc-500 hover:bg-red-950/30 hover:text-red-400'
              : 'text-zinc-500 hover:bg-red-50 hover:text-red-500'
          }`}
          title="Sign Out"
        >
          <ArrowLeftEndOnRectangleIconCustom className="w-5 h-5" />
        </button>
      </div>

    </div>
  );
}
