'use client';

import { useTasks } from '@/context/TaskContext';
import { CheckIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useState, useEffect } from 'react';
import { taskApi } from '@/context/TaskContext'; 
import { useToast } from '@/context/ToastContext'; 

export default function TaskList() {
  // 💡 安全防護：確保 tasks 有預設值空陣列，避免 map 報錯
  const { tasks = [], selectedCategoryId, selectedView, activeFilter, dispatch, selectedTaskId } = useTasks();
  const { showSuccess, showError } = useToast();
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');

  // 1. 基於後端真實資料進行過濾與排序
  useEffect(() => {
    // 終極安全檢查：如果 tasks 不是陣列，直接給空
    if (!Array.isArray(tasks)) {
      setFilteredTasks([]);
      return;
    }

    let result = [...tasks];

    // 分類視圖過濾
    if (selectedView === 'category') {
      // 💡 關鍵修正：後端現在關聯的是 category_id
      result = result.filter(task => task && String(task.category_id) === String(selectedCategoryId));
    } 
    // 預設過濾器視圖 (All / Today / Completed)
    else if (selectedView === 'filter') {
      if (activeFilter === 'today') {
        const todayStr = new Date().toISOString().split('T')[0];
        result = result.filter(task => task && task.deadline && task.deadline.startsWith(todayStr));
      } else if (activeFilter === 'completed') {
        // 後端可能是 status === 'completed' 或是 completed == 1/true
        result = result.filter(task => task && (task.status === 'completed' || task.completed));
      } else if (activeFilter === 'all') {
        // 顯示全部未完成的任務
        result = result.filter(task => task && task.status !== 'completed' && !task.completed);
      }
    }

    // 排序：高優先級在前
    result.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1, none: 0 };
      const pA = priorityOrder[a?.priority] || 0;
      const pB = priorityOrder[b?.priority] || 0;
      return pB - pA;
    });

    setFilteredTasks(result);
  }, [tasks, selectedView, selectedCategoryId, activeFilter]);

  // 2. 處理新增任務
  const handleAddTask = async (e) => {
    e.preventDefault();
    const trimmedTitle = newTaskTitle.trim();
    if (!trimmedTitle) return;

    try {
      // 傳送給後端的欄位：title
      const response = await taskApi.createTask({
        title: trimmedTitle,
        categoryId: selectedView === 'category' ? selectedCategoryId : null
      });

      // 後端返回新任務後，派發給全域 Context
      dispatch({ type: 'ADD_TASK', payload: response });
      setNewTaskTitle('');
      showSuccess('Task added successfully');
    } catch (error) {
      console.error('Failed to add task:', error);
      showError('Failed to create task');
    }
  };

  // 3. 處理切換任務完成狀態
  const handleToggleComplete = async (e, task) => {
    e.stopPropagation(); // 防止觸發選取任務
    const newStatus = (task.status === 'completed' || task.completed) ? 'pending' : 'completed';
    
    try {
      await taskApi.updateTask(task.id, {
        task_name: task.task_name,
        status: newStatus
      });
      dispatch({ type: 'TOGGLE_TASK_STATUS', payload: task.id });
      showSuccess(newStatus === 'completed' ? 'Task completed!' : 'Task marked as pending');
    } catch (error) {
      showError('Failed to update task status');
    }
  };

  // 4. 處理刪除任務
  const handleDeleteTask = async (e, taskId) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this task?')) {
      try {
        await taskApi.deleteTask(taskId);
        dispatch({ type: 'DELETE_TASK', payload: taskId });
        showSuccess('Task deleted');
      } catch (error) {
        showError('Failed to delete task');
      }
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-white dark:bg-zinc-900">
      {/* 頂部新增任務輸入框 */}
      <div className="p-4 border-b border-gray-200 dark:border-zinc-800">
        <form onSubmit={handleAddTask}>
          <input
            type="text"
            placeholder="Add a task..."
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            className="w-full px-4 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-black dark:text-white"
          />
        </form>
      </div>

      {/* 任務列表展示區 */}
      <div className="flex-1 overflow-y-auto divide-y divide-gray-100 dark:divide-zinc-800">
        {filteredTasks.length > 0 ? (
          filteredTasks.map((task) => {
            if (!task) return null;
            const isCompleted = task.status === 'completed' || task.completed;
            const isSelected = String(task.id) === String(selectedTaskId);

            return (
              <div
                key={task.id}
                onClick={() => dispatch({ type: 'SELECT_TASK', payload: task.id })}
                className={`flex items-center justify-between p-4 cursor-pointer transition-colors ${
                  isSelected ? 'bg-blue-50/50 dark:bg-blue-900/10' : 'hover:bg-gray-50 dark:hover:bg-zinc-800/30'
                }`}
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <button
                    onClick={(e) => handleToggleComplete(e, task)}
                    className={`h-5 w-5 rounded-md border flex items-center justify-center transition-colors ${
                      isCompleted
                        ? 'bg-green-500 border-green-500 text-white'
                        : 'border-gray-300 dark:border-zinc-600 hover:border-gray-400'
                    }`}
                  >
                    {isCompleted && <CheckIcon className="h-3 w-3 stroke-[3]" />}
                  </button>
                  <div className="min-w-0">
                    <h3 className={`text-sm font-medium truncate text-black dark:text-white ${isCompleted ? 'line-through text-gray-400 dark:text-zinc-500' : ''}`}>
                      {/* 💡 統一使用後端資料庫的欄位名 task_name */}
                      {task.task_name || 'Untitled Task'}
                    </h3>
                    {task.deadline && (
                      <p className="text-xs text-gray-400 mt-0.5">Due: {task.deadline}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  {task.priority && task.priority !== 'none' && (
                    <span className={`text-xs px-2 py-0.5 rounded-full uppercase font-semibold ${
                      task.priority === 'high'
                        ? 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                        : task.priority === 'medium'
                          ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400'
                          : 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                    }`}>
                      {task.priority}
                    </span>
                  )}
                  <button
                    onClick={(e) => handleDeleteTask(e, task.id)}
                    className="text-gray-400 hover:text-red-500 transition-colors p-1"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-8 text-center text-sm text-gray-400">
            No tasks here yet.
          </div>
        )}
      </div>
    </div>
  );
}