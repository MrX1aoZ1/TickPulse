'use client';

import { useState, useEffect } from 'react';
import { useTasks } from '@/context/TaskContext';
import { taskApi } from '@/context/TaskContext';
import { useToast } from '@/context/ToastContext';
import { 
  CheckIcon, 
  CalendarIcon, 
  FlagIcon, 
  TrashIcon, 
  FolderIcon 
} from '@heroicons/react/24/outline';

/**
 * @component TaskDetail
 * @description 滴答清單風格 - 標題獨立居下、單擊直接編輯的任務詳情面板
 */
export default function TaskDetail() {
  const { tasks, dispatch, selectedTaskId, categories } = useTasks();
  const { showSuccess, showError } = useToast();
  
  // 核心狀態：獲取當前選中的任務
  const selectedTask = tasks && tasks.find ? tasks.find(t => String(t.id) === String(selectedTaskId)) : null;
  
  // 用於動態同步輸入框的局部狀態
  const [taskName, setTaskName] = useState('');
  const [content, setContent] = useState('');

  // 當選中任務切換時，同步局部文字狀態
  useEffect(() => {
    if (selectedTask) {
      setTaskName(selectedTask.task_name || '');
      setContent(selectedTask.content || '');
    }
  }, [selectedTask]);

  // 如果沒有選中任何任務，顯示佔位提示
  if (!selectedTask) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-gray-400 dark:text-gray-500 bg-white dark:bg-zinc-900 border-l border-gray-100 dark:border-zinc-800">
        Select a task to view details
      </div>
    );
  }

  /**
   * 核心防禦性全域更新函數 (Dev Mode 攔截)
   */
  const updateTaskField = async (fieldName, value) => {
    // 如果值根本沒變，直接退回不觸發更新
    if (selectedTask[fieldName] === value) return;

    const updatedUpdates = {
      task_name: fieldName === 'task_name' ? value : selectedTask.task_name,
      content: fieldName === 'content' ? value : selectedTask.content,
      deadline: fieldName === 'deadline' ? value : selectedTask.deadline,
      priority: fieldName === 'priority' ? value : selectedTask.priority,
      category_name: fieldName === 'category_name' ? value : selectedTask.category_name,
    };

    try {
      if (process.env.NODE_ENV === 'development') {
        dispatch({
          type: 'UPDATE_TASK',
          payload: { taskId: selectedTask.id, updates: updatedUpdates }
        });
        return;
      }

      // 線上環境 API 呼叫
      await taskApi.updateTask(selectedTask.id, updatedUpdates);
      dispatch({
        type: 'UPDATE_TASK',
        payload: { taskId: selectedTask.id, updates: updatedUpdates }
      });
    } catch (error) {
      console.error(`Failed to update ${fieldName}:`, error);
      showError('Failed to update task');
      // 失敗時還原前端顯示
      if (fieldName === 'task_name') setTaskName(selectedTask.task_name || '');
      if (fieldName === 'content') setContent(selectedTask.content || '');
    }
  };

  // 勾選/取消勾選任務狀態
  const handleToggleComplete = () => {
    const nextStatus = selectedTask.status === 'completed' ? 'pending' : 'completed';
    dispatch({ type: 'TOGGLE_TASK', payload: selectedTask.id });
    showSuccess(`${selectedTask.task_name || 'Task'} marked as ${nextStatus} (Dev Mode)`);
  };

  // 刪除任務
  const handleDeleteTask = async () => {
    if (!window.confirm('確定要刪除這個任務嗎？')) return;
    try {
      if (process.env.NODE_ENV === 'development') {
        dispatch({ type: 'DELETE_TASK', payload: selectedTask.id });
        showSuccess('Task deleted successfully (Dev Mode)');
        return;
      }
      await taskApi.deleteTask(selectedTask.id);
      dispatch({ type: 'DELETE_TASK', payload: selectedTask.id });
      showSuccess('Task deleted successfully');
    } catch (error) {
      showError('Failed to delete task');
    }
  };

  // 根據優先級返回對應的顏色
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'text-red-500 fill-red-500';
      case 'medium': return 'text-orange-400 fill-orange-400';
      case 'low': return 'text-blue-400 fill-blue-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-white dark:bg-zinc-900 border-l border-gray-100 dark:border-zinc-800 text-gray-800 dark:text-zinc-100">
      
      {/* 1. 頂部小工具功能列 */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-50 dark:border-zinc-800/50">
        
        {/* 工具列左側：Tickbox 圓圈 + 緊跟在後的日期選擇器 */}
        <div className="flex items-center space-x-4 flex-1">
          {/* Tickbox */}
          <button
            onClick={handleToggleComplete}
            className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors flex-shrink-0 ${
              selectedTask.status === 'completed'
                ? 'bg-green-500 border-green-500 text-white'
                : 'border-gray-300 dark:border-zinc-600 hover:border-gray-400'
            }`}
          >
            {selectedTask.status === 'completed' && <CheckIcon className="h-3.5 w-3.5 stroke-[3]" />}
          </button>

          {/* 💡 日期選擇器成功挪到左邊：緊貼著 Tickbox 圓圈 */}
          <div className="relative flex items-center text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300 cursor-pointer group max-w-max">
            <CalendarIcon className="h-5 w-5 flex-shrink-0" />
            <input
              type="date"
              value={selectedTask.deadline || ''}
              onChange={(e) => updateTaskField('deadline', e.target.value)}
              className="absolute inset-0 opacity-0 cursor-pointer w-5"
            />
            {selectedTask.deadline ? (
              <span className="text-sm ml-1.5 text-gray-600 dark:text-zinc-400 font-medium">
                {selectedTask.deadline}
              </span>
            ) : (
              <span className="text-sm ml-1.5 text-gray-300 dark:text-zinc-600 group-hover:text-gray-400 transition-colors">
                設置日期
              </span>
            )}
          </div>
        </div>

        {/* 工具列右側：其餘操作功能圖標區（優先級、分類、刪除） */}
        <div className="flex items-center space-x-4 text-gray-400 dark:text-zinc-500">
          
          {/* 優先級旗幟下拉切換 */}
          <div className="relative flex items-center group">
            <select
              value={selectedTask.priority || 'none'}
              onChange={(e) => updateTaskField('priority', e.target.value)}
              className="absolute inset-0 opacity-0 cursor-pointer w-5 z-10"
            >
              <option value="none">無優先級</option>
              <option value="low">低優先級</option>
              <option value="medium">中優先級</option>
              <option value="high">高優先級</option>
            </select>
            <FlagIcon className={`h-5 w-5 transition-colors ${getPriorityColor(selectedTask.priority)}`} />
          </div>

          {/* 分類資料夾下拉切換 */}
          <div className="relative flex items-center group">
            <select
              value={selectedTask.category_name || 'inbox'}
              onChange={(e) => updateTaskField('category_name', e.target.value)}
              className="absolute inset-0 opacity-0 cursor-pointer w-5 z-10"
            >
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <FolderIcon className="h-5 w-5 hover:text-gray-600 dark:hover:text-zinc-300 transition-colors" />
            <span className="text-sm ml-1.5 text-gray-600 dark:text-zinc-400 font-medium">
              {categories.find(c => String(c.id) === String(selectedTask.category_name))?.name || 'Inbox'}
            </span>
          </div>

          {/* 垂直分割線 */}
          <div className="w-px h-4 bg-gray-200 dark:bg-zinc-800"></div>

          {/* 垃圾桶刪除按鈕 */}
          <button 
            onClick={handleDeleteTask}
            className="hover:text-red-500 dark:hover:text-red-400 transition-colors"
            title="Delete Task"
          >
            <TrashIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* 下方主要內容大畫布（標題另放至此處） */}
      <div className="flex-1 px-8 py-6 flex flex-col space-y-4 overflow-y-auto">
        
        {/* 2. 獨立出來的大標題 Inline 輸入區 */}
        <div className="w-full">
          <input
            type="text"
            value={taskName}
            onChange={(e) => setTaskName(e.target.value)}
            onBlur={() => updateTaskField('task_name', taskName.trim())}
            onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
            placeholder="任務名稱"
            className={`w-full bg-transparent text-2xl font-bold focus:outline-none border-b border-transparent focus:border-gray-100 dark:focus:border-zinc-800 pb-1 transition-colors ${
              selectedTask.status === 'completed' 
                ? 'line-through text-gray-400 dark:text-zinc-500 decoration-gray-400/70' 
                : 'text-gray-900 dark:text-zinc-50'
            }`}
          />
        </div>

        {/* 3. 大面積極簡備忘錄內容編輯區 */}
        <div className="flex-1 flex flex-col pt-2">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onBlur={() => updateTaskField('content', content)}
            placeholder="添加步驟、描述或備忘紀錄..."
            className="w-full flex-1 bg-transparent resize-none focus:outline-none text-base leading-relaxed text-gray-700 dark:text-zinc-300 placeholder-gray-300 dark:placeholder-zinc-600 whitespace-pre-wrap"
            style={{ minHeight: '300px' }}
          />
        </div>

      </div>

    </div>
  );
}