'use client';

import TaskModule from '@/components/TaskModule';

export default function WebAppRootPage() {
  // 🎯 進入 /webapp 預設直接渲染你的核心 Task 模組
  return (
    <div className="flex w-full h-full overflow-hidden">
      <TaskModule />
    </div>
  );
}