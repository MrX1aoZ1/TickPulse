'use client';

import { useState, useEffect, useRef } from 'react';
import TaskList from './TaskList';
import TaskDetail from './TaskDetail';
import { useTasks } from '@/context/TaskContext';
import { taskApi } from '@/context/TaskContext'; 
import { useToast } from '@/context/ToastContext'; 
import { PlusIcon } from '@heroicons/react/24/outline';
import ErrorBoundary from './ErrorBoundary';
import CategoryList from './CategoryList';

const priorities = [
    { value: 'none', label: 'none' },
    { value: 'low', label: 'low' },
    { value: 'medium', label: 'medium' },
    { value: 'high', label: 'high' },
];

export default function TaskModule() {
  // --- 🎯 自由拉伸核心狀態設定 ---
  const minWidth = 380; 
  const [taskListWidth, setTaskListWidth] = useState(480); 
  const [isResizing, setIsResizing] = useState(false);

  // 🎯 使用 useRef 實時同步最新的拉伸狀態，徹底杜絕閉包過期導致突破邊界的 Bug
  const isResizingRef = useRef(isResizing);
  useEffect(() => {
    isResizingRef.current = isResizing;
  }, [isResizing]);

  // --- 🎯 全域拖拽滑鼠追蹤機制（優化版依賴） ---
  useEffect(() => {
    const handleMouseMove = (e) => {
      // 透過 Ref 實時讀取最新的拖拽開關狀態
      if (!isResizingRef.current) return;

      const containerElement = document.getElementById('task-module-container');
      if (!containerElement) return;
      
      const containerRect = containerElement.getBoundingClientRect();
      const containerLeft = containerRect.left;
      const containerWidth = containerRect.width;

      // 1. 動態最大寬度限制（佔整個容器的 45%）
      const dynamicMaxWidth = containerWidth - minWidth; 

      // 2. 計算出滑鼠當前的相對寬度
      const newWidth = e.clientX - containerLeft;

      // 3. 嚴格的安全限制攔截
      if (newWidth < minWidth) {
        setTaskListWidth(minWidth);
      } else if (newWidth > dynamicMaxWidth) {
        setTaskListWidth(dynamicMaxWidth);
      } else {
        setTaskListWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      if (isResizingRef.current) {
        setIsResizing(false);
        document.body.style.cursor = 'default';
        document.body.style.userSelect = 'auto';
      }
    };

    // 一初始化就掛載全域監聽，透過內部的 Ref 進行精準開關，完美避開 React 重新渲染的監聽延遲
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []); // 💡 空依賴陣列：全域只綁定一次，內部計算完全跟隨視窗動態即時計算

  const handleMouseDown = (e) => {
    e.preventDefault(); 
    setIsResizing(true);
    document.body.style.cursor = 'default';
    document.body.style.userSelect = 'none';
  };

  return (
    <div 
      id="task-module-container" 
      className={`flex-1 flex flex-col h-full bg-white dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200 ${isResizing ? 'select-none' : ''}`}
    >
      {/* 任務列表與詳情面板主佈局區 */}
      <div className="flex flex-1 overflow-hidden w-full h-full relative">
        
        {/* 1. 中間任務清單 */}
        <div 
          className="flex-shrink-0 h-full overflow-hidden" 
          style={{ width: `${taskListWidth}px` }}
        >
          <TaskList />
        </div>

        {/* 2. 純淨分界線 (無任何視覺干擾，游標常態) */}
        <div
          onMouseDown={handleMouseDown}
          className="w-[1px] h-full cursor-ew-resize bg-zinc-200 dark:bg-zinc-900 relative z-30"
        >
          {/* 觸控擴展層 */}
          <div className="absolute top-0 -left-1 -right-1 bottom-0 bg-transparent cursor-ew-resize z-10" />
        </div>

        {/* 3. 右側任務詳情面板 */}
        <div className="flex-1 h-full overflow-hidden min-w-0">
          <ErrorBoundary>
            <TaskDetail />
          </ErrorBoundary>
        </div>

      </div>
    </div>
  );
}