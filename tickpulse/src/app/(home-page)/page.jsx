'use client';

import Link from 'next/link';
import { CheckCircleIcon, CalendarDaysIcon, ClockIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';

import "@/styles/globals.css";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 text-gray-900 dark:text-gray-100 transition-colors duration-200">
      
      {/* 1. 頂部導覽列 (Simple Header) */}
      <header className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between border-b border-gray-200 dark:border-zinc-800">
        <div className="flex items-center space-x-2">
          <span className="text-2xl font-bold text-blue-600 dark:text-blue-400 tracking-tight">TickPulse</span>
        </div>
        <div className="flex items-center space-x-4">
          <Link 
            href="/login" 
            className="text-sm font-medium hover:text-blue-600 dark:hover:text-blue-400 transition"
          >
            Login
          </Link>
          <Link 
            href="/sign-up" 
            className="text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md shadow-sm transition"
          >
            Sign Up
          </Link>
        </div>
      </header>

      {/* 2. 主視覺區 (Hero Section) */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32 text-center">
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight mb-6">
          Stay Organized.<br />
          <span className="bg-gradient-to-r from-blue-600 to-indigo-500 bg-clip-text text-transparent dark:from-blue-400 dark:to-indigo-300">
            Master Your Workflow.
          </span>
        </h1>
        <p className="max-w-2xl mx-auto text-lg sm:text-xl text-gray-500 dark:text-gray-400 mb-10 leading-relaxed">
          TickPulse 是一款專為高效執行者設計的極簡待辦清單軟體。流暢的任務管理、強大的日曆檢視，助你清晰規劃每一天，告別拖延症。
        </p>
        <div className="flex justify-center space-x-4">
          <Link
            href="/login"
            className="text-base font-semibold bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg shadow-lg hover:shadow-xl transition transform hover:-translate-y-0.5"
          >
            進入工作台 (Get Started)
          </Link>
        </div>

        {/* 3. 核心優勢區 (Features Section) */}
        <section className="mt-24 lg:mt-36 grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
          
          {/* 特色 1 */}
          <div className="p-6 bg-white dark:bg-zinc-900 rounded-xl border border-gray-100 dark:border-zinc-800 shadow-sm">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center text-blue-600 dark:text-blue-400 mb-4">
              <CheckCircleIcon className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold mb-2">直覺的任務清單</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">
              透過清單與分類，快速建立、編輯與排序你的日常任務。支援自訂智能篩選，讓你一秒鎖定「今天」最重要的工作。
            </p>
          </div>

          {/* 特色 2 */}
          <div className="p-6 bg-white dark:bg-zinc-900 rounded-xl border border-gray-100 dark:border-zinc-800 shadow-sm">
            <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-4">
              <CalendarDaysIcon className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold mb-2">強大的日曆檢視</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">
              打破傳統條列清單的侷限，將任務直觀地在日曆面板上展開，時間管理更加一目了然。
            </p>
          </div>

          {/* 特色 3 */}
          <div className="p-6 bg-white dark:bg-zinc-900 rounded-xl border border-gray-100 dark:border-zinc-800 shadow-sm">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center text-purple-600 dark:text-purple-400 mb-4">
              <ShieldCheckIcon className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold mb-2">雲端無縫同步</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">
              安全穩固的 Session 驗證機制與第三方帳號綁定，確保你的所有代辦事項與隱私數據在多端受到最嚴密的保護。
            </p>
          </div>

        </section>
      </main>

      {/* 4. 底部宣告 (Footer) */}
      <footer className="border-t border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 mt-20 py-8 text-center text-sm text-gray-400">
        <p>&copy; {new Date().getFullYear()} TickPulse. All rights reserved.</p>
      </footer>

    </div>
  );
}