'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { 
  CheckSquareIcon, 
  CalendarIconCustom, 
  ArrowLeftEndOnRectangleIconCustom 
} from './ui/CustomIcons';

export default function NavigationBar() {
  const router = useRouter();
  const { logout } = useAuth();
  
  // 🎯 預設鎖定在 'task' 一欄
  const [activeTab, setActiveTab] = useState('task');

  const handleLogout = async () => {
    try {
      await fetch('http://localhost:3000/auth/logout', {
        method: 'POST',
        credentials: 'include', 
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      logout(); // 清理 context 狀態
      router.push('/login');
    }
  };

  return (
    <div className="w-14 h-full bg-[#181818] flex flex-col items-center justify-between py-4 border-r border-zinc-900 select-none">
      
      {/* 頂部：用戶頭像區 (對齊圖一) */}
      <div className="relative group cursor-pointer">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shadow-md transition-transform active:scale-95">
          TP
        </div>
        {/* 皇冠小點裝飾 */}
        <span className="absolute -top-1 -right-1 text-[10px]">👑</span>
      </div>

      {/* 中部：核心分流切換區 (目前鎖定 Task 啟用) */}
      <div className="flex flex-col space-y-4 flex-1 justify-center w-full items-center">
        
        {/* Task 按鈕 (目前打勾作用中) */}
        <button
          onClick={() => setActiveTab('task')}
          className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-200 ${
            activeTab === 'task'
              ? 'bg-white text-zinc-900 shadow-sm'
              : 'text-zinc-500 hover:bg-zinc-800/50 hover:text-zinc-300'
          }`}
          title="Tasks"
        >
          <CheckSquareIcon className="w-5 h-5" fill={activeTab === 'task'} />
        </button>

        {/* Calendar 按鈕 (無功能，點擊不切換，僅供視覺) */}
        <button
          className="w-10 h-10 flex items-center justify-center rounded-xl text-zinc-600 cursor-not-allowed"
          title="Calendar (Coming Soon)"
          disabled
        >
          <CalendarIconCustom className="w-5 h-5" />
        </button>
      </div>

      {/* 底部：登出操作區 */}
      <div className="w-full flex justify-center">
        <button
          onClick={handleLogout}
          className="w-10 h-10 flex items-center justify-center rounded-xl text-zinc-500 hover:bg-red-950/30 hover:text-red-400 transition-colors"
          title="Sign Out"
        >
          <ArrowLeftEndOnRectangleIconCustom className="w-5 h-5" />
        </button>
      </div>

    </div>
  );
}