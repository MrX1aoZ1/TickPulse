'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import NavigationBar from '@/components/NavigationBar';
import CategoryList from '@/components/CategoryList'; // 🎯 引入融合後的二級選單

export default function WebAppLayout({ children }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  // 🔒 護城河邏輯：未登入則導向登入頁
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // 1. 全局加載狀態
  if (loading) {
    return (
      <div className="min-h-screen bg-[#181818] flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-zinc-400 font-medium">正在安全載入工作台...</p>
        </div>
      </div>
    );
  }

  // 2. 阻斷未驗證的閃爍
  if (!user) {
    return null;
  }

  // 🎉 3. 完美還原 TickTick 經典「三欄式」佈局
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#1a1a1a] text-zinc-200">
      
      {/* 📌 第一欄：最左側「純圖標窄欄」 */}
      <aside className="h-full flex-shrink-0">
        <NavigationBar />
      </aside>

      {/* 📌 第二欄：中左側「智能過濾與自訂分類選單」 */}
      <aside className="h-full flex-shrink-0">
        <CategoryList />
      </aside>

      {/* 📌 第三欄：右側「主體內容區」（任務清單、動態路由內容等） */}
      <main className="flex-1 h-full overflow-hidden relative bg-[#252525]">
        {children}
      </main>

    </div>
  );
}