'use client';

import { useState } from 'react';
import { useTasks, taskApi } from '@/context/TaskContext';
import { useToast } from '@/context/ToastContext';
import { 
  PlusIcon,
  TrashIcon, 
  NoSymbolIcon, 
  ArrowUturnLeftIcon 
} from '@heroicons/react/24/outline';

export default function TaskList() {
  const { 
    tasks = [], 
    dispatch, 
    selectedView, 
    selectedCategoryId, 
    activeFilter 
  } = useTasks();
  const { showSuccess, showError } = useToast();
  
  // 快速新增任務的本地狀態
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 🎯 輔助函式：將任何後端回傳的日期轉成純粹的 "YYYY-MM-DD" 本地字串（處理 Floating Time）
  const formatToLocalDateStr = (dateInput) => {
    if (!dateInput) return null;
    if (typeof dateInput === 'string' && dateInput.length === 10) return dateInput;
    
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return null;
    
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const filteredTasks = tasks.filter(task => {
    const taskDateStr = formatToLocalDateStr(task.deadline);


    if (selectedView === 'category') {
      return (
        task.category_id === selectedCategoryId && 
        task.status !== 'deleted' && 
        task.status !== 'cancelled'
      );
    }

    if (selectedView === 'filter') {
      const todayStr = formatToLocalDateStr(new Date());
      
      switch (activeFilter) {
        case 'all':
          return (
            task.status !== 'deleted' && 
            task.status !== 'cancelled' && 
            task.status !== 'completed'
          );
          
        case 'today':
          // Today 視圖：今天的任務，且必須是活著的任務
          return (
            taskDateStr === todayStr && 
            task.status !== 'deleted' && 
            task.status !== 'cancelled'
          );
          
        case 'next7': {
          if (!taskDateStr || task.status === 'deleted' || task.status === 'cancelled') return false;
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const sevenDaysLater = new Date();
          sevenDaysLater.setDate(today.getDate() + 7);
          sevenDaysLater.setHours(23, 59, 59, 999);
          const taskDate = new Date(taskDateStr + 'T00:00:00');
          return taskDate >= today && taskDate <= sevenDaysLater;
        }
        
        case 'completed': 
          return task.status === 'completed';
          
        case 'cancelled': 
          return task.status === 'cancelled';
          
        case 'deleted': 
          return task.status === 'deleted';
          
        default: 
          return true;
      }
    }
    return true;
  });

  // 🎯 處理快速新增任務
  const handleAddTask = async (e) => {
    e.preventDefault();
    const title = newTaskTitle.trim();
    if (!title || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const targetCategoryId = selectedView === 'category' ? selectedCategoryId : null;

      const taskData = {
        task_name: title,
        category_id: targetCategoryId
      };

      const savedTask = await taskApi.createTask(taskData);
      
      const sanitizedTask = {
        ...savedTask,
        status: savedTask.status || 'pending',
        priority: savedTask.priority || 'none',
        deadline: savedTask.deadline || null
      };
      
      dispatch({ type: 'ADD_TASK', payload: sanitizedTask });
      setNewTaskTitle('');
      showSuccess('Task added!');
    } catch (error) {
      console.error('Failed to create task:', error);
      showError(error.message || 'Failed to add task');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 🎯 處理狀態更新
  const handleUpdateStatus = async (task, newStatus) => {
    // 🛡️ 確保能拿到正確的 ID 欄位
    const targetId = task.id || task.taskId;
    if (!targetId) {
      showError('Task ID missing');
      return;
    }

    try {
      await taskApi.updateTask(targetId, { status: newStatus });
      dispatch({ 
        type: 'UPDATE_TASK', 
        payload: { id: targetId, updates: { status: newStatus } } 
      });
      showSuccess(`Task updated`);
    } catch (error) {
      showError('Failed to update task status');
    }
  };

  const getPriorityClass = (priority) => {
    switch (priority) {
      case 'high': return 'border-red-500 hover:bg-red-500/10';
      case 'medium': return 'border-orange-400 hover:bg-orange-400/10';
      case 'low': return 'border-blue-400 hover:bg-blue-400/10';
      default: return 'border-zinc-600 hover:bg-zinc-500/10';
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-950 text-zinc-200">
      
      {/* 📥 頂部極簡新增輸入框 */}
      {selectedView !== 'filter' || (activeFilter !== 'completed' && activeFilter !== 'cancelled' && activeFilter !== 'deleted') ? (
        <form onSubmit={handleAddTask} className="px-6 pt-4 pb-2">
          <div className="flex items-center space-x-3 bg-zinc-900/40 border border-zinc-800/80 rounded-lg px-3 py-2 focus-within:border-zinc-700 transition-all">
            <PlusIcon className="w-4 h-4 text-zinc-500 flex-shrink-0" />
            <input
              type="text"
              placeholder="Add a task to this list... (Press Enter)"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              disabled={isSubmitting}
              className="w-full bg-transparent border-none outline-none text-sm placeholder-zinc-600 text-zinc-200"
            />
          </div>
        </form>
      ) : null}

      {/* 📜 任務列表主滾動區 */}
      <div className="flex-1 overflow-y-auto px-6 py-2 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
        {filteredTasks.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center text-zinc-600 text-sm">
            <p className="font-medium">No tasks here.</p>
            <p className="text-xs text-zinc-700 mt-1">Enjoy your clear day!</p>
          </div>
        ) : (
          
          filteredTasks.map((task) => {
            const isDone = task.status === 'completed';
            const isTrash = task.status === 'cancelled' || task.status === 'deleted';

            return (
              <div
                key={task.id || task.taskId}
                className="group flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-zinc-900/40 border border-transparent hover:border-zinc-900/60 transition-all duration-150"
              >
                {/* 左側內容（核取方塊 + 標題） */}
                <div className="flex items-center space-x-3 min-w-0 flex-1">
                  {!isTrash ? (
                    <button
                      onClick={() => handleUpdateStatus(task, isDone ? 'pending' : 'completed')}
                      className={`w-4 h-4 rounded border flex-shrink-0 transition-colors flex items-center justify-center ${getPriorityClass(task.priority)}`}
                    >
                      {task.status === 'completed' && <span className="w-1.5 h-1.5 bg-zinc-400 rounded-sm" />}
                      {task.status === 'cancelled' && <span className="text-[9px] text-zinc-500">✕</span>}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleUpdateStatus(task, 'pending')}
                      className="text-zinc-600 hover:text-zinc-400 p-0.5 flex-shrink-0"
                      title="Restore Task"
                    >
                      <ArrowUturnLeftIcon className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <div className="flex flex-col min-w-0 flex-1">
                    <span className={`text-sm truncate ${
                      task.status === 'completed' ? 'line-through text-zinc-600' : 
                      task.status === 'cancelled' ? 'line-through text-zinc-600 italic' : 'text-zinc-200'
                    }`}>
                      {task.task_name || 'Untitled Task'}
                    </span>
                    
                    {task.deadline && !isDone && (
                      <span className="text-[10px] text-zinc-500 font-mono mt-0.5">
                        📅 {formatToLocalDateStr(task.deadline)}
                      </span>
                    )}
                  </div>
                </div>

                {/* 右側懸浮微操作按鈕區 */}
                <div className="opacity-0 group-hover:opacity-100 flex items-center space-x-1.5 ml-4 flex-shrink-0 transition-opacity duration-100">
                  {!isTrash ? (
                    <>
                      {task.status !== 'completed' && task.status !== 'cancelled' && (
                        <button
                          onClick={() => handleUpdateStatus(task, 'cancelled')}
                          className="p-1 text-zinc-500 hover:text-orange-400 rounded hover:bg-zinc-800 transition-colors"
                          title="Won't Do"
                        >
                          <NoSymbolIcon className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => handleUpdateStatus(task, 'deleted')}
                        className="p-1 text-zinc-500 hover:text-red-400 rounded hover:bg-zinc-800 transition-colors"
                        title="Move to Trash"
                      >
                        <TrashIcon className="w-3.5 h-3.5" />
                      </button>
                    </>
                  ) : (
                    // 徹底從資料庫中抹除
                    <button
                      onClick={async () => {
                        const targetId = task.id || task.taskId;
                        if (confirm('Permanently delete this task?')) {
                          try {
                            await taskApi.deleteTask(targetId);
                            dispatch({ type: 'DELETE_TASK', payload: targetId });
                            showSuccess('Permanently deleted');
                          } catch (e) { 
                            showError('Failed to delete'); 
                          }
                        }
                      }}
                      className="p-1 text-zinc-600 hover:text-red-500 rounded hover:bg-zinc-800 transition-colors"
                      title="Delete Permanently"
                    >
                      <TrashIcon className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

              </div>
            );
          })
        )}
      </div>
    </div>
  );
}