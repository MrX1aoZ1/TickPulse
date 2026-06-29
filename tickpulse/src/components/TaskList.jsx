'use client';

import { useState } from 'react';
import { useTasks, taskApi } from '@/context/TaskContext';
import { useToast } from '@/context/ToastContext';
import {
  PlusIcon,
  TrashIcon,
  NoSymbolIcon,
  ArrowUturnLeftIcon,
  PencilIcon // 🎯 記得引入鉛筆圖標
} from '@heroicons/react/24/outline';

export default function TaskList() {
  const {
    tasks = [],
    categories = [], // 🎯 修正一：把 categories 從全域 Context 中解構撈出來！
    dispatch,
    selectedView,
    selectedCategoryId,
    activeFilter,
    selectedTaskId
  } = useTasks();
  const { showSuccess, showError } = useToast();

  // 快速新增任務的本地狀態
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 🎯 修正二：補上你畫面中缺失的這兩個頂端標題編輯狀態！
  const [isEditingHeader, setIsEditingHeader] = useState(false);
  const [editHeaderName, setEditHeaderName] = useState('');

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

  // 🎯 1. 動態計算目前 View 的頂端標題資訊
  const currentCategory = categories.find(cat => cat.id === selectedCategoryId);

  let headerTitle = '';
  let isEditable = false;

  if (selectedView === 'category' && currentCategory) {
    headerTitle = currentCategory.name || 'Untitled List';
    // 系統預設的收件匣（inbox_）不允許改名，其餘自訂清單可以
    isEditable = !currentCategory.id?.toString().startsWith('inbox_');
  } else if (selectedView === 'filter') {
    switch (activeFilter) {
      case 'all': headerTitle = 'All Tasks'; break;
      case 'today': headerTitle = "Today's Tasks"; break;
      case 'next7': headerTitle = 'Next 7 Days'; break;
      case 'completed': headerTitle = 'Completed'; break;
      case 'cancelled': headerTitle = "Won't Do"; break;
      case 'deleted': headerTitle = 'Trash'; break;
      default: headerTitle = 'Tasks';
    }
  }

  // 🎯 2. 處理頂端標題的重命名儲存
  const handleSaveHeaderRename = async () => {
    const trimmed = editHeaderName.trim();
    if (!trimmed || trimmed === currentCategory?.name) {
      setIsEditingHeader(false);
      return;
    }
    try {
      // 呼叫後端 API
      await taskApi.updateCategory(selectedCategoryId, trimmed);

      // 同步更新前端 Context 狀態
      dispatch({
        type: 'RENAME_CATEGORY',
        payload: { categoryId: selectedCategoryId, newName: trimmed }
      });
      showSuccess('List renamed');
    } catch (error) {
      showError('Failed to rename list');
    } finally {
      setIsEditingHeader(false);
    }
  };

  // 任務過濾邏輯
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
      switch (activeFilter) {
        case 'all':
          return (
            task.status !== 'deleted' &&
            task.status !== 'cancelled' &&
            task.status !== 'completed'
          );
        case 'today':
          return (
            taskDateStr === formatToLocalDateStr(new Date()) &&
            task.status !== 'deleted' &&
            task.status !== 'cancelled'
          );
        case 'next7': {
          if (!taskDateStr || task.status === 'deleted' || task.status === 'cancelled') return false;
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const sevenDaysLater = new Date();
          sevenDaysLater.setDate(today.getDate() + 7);
          const taskDate = new Date(taskDateStr + 'T00:00:00');
          return taskDate >= today && taskDate <= sevenDaysLater;
        }
        case 'completed': return task.status === 'completed';
        case 'cancelled': return task.status === 'cancelled';
        case 'deleted': return task.status === 'deleted';
        default: return true;
      }
    }
    return true;
  });

  // 快速新增任務
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

  const handleUpdateStatus = async (task, newStatus) => {
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
    <div className="flex-1 flex flex-col h-full bg-zinc-950 text-zinc-200 min-w-0">

      {/* 🎯 動態標題顯示 / 編輯區塊 */}
      <div className="px-6 pt-6 pb-2 flex items-center justify-between border-b border-zinc-900/40">
        {isEditingHeader ? (
          <input
            type="text"
            value={editHeaderName}
            onChange={(e) => setEditHeaderName(e.target.value)}
            onBlur={handleSaveHeaderRename}
            onKeyDown={(e) => e.key === 'Enter' && handleSaveHeaderRename()}
            className="text-xl font-semibold bg-zinc-900 text-white border border-zinc-700 rounded px-2 py-0.5 focus:outline-none focus:border-blue-500"
            autoFocus
          />
        ) : (
          <div
            className={`flex items-center space-x-2 group ${isEditable ? 'cursor-pointer' : ''}`}
            onClick={() => {
              if (isEditable) {
                setIsEditingHeader(true);
                setEditHeaderName(headerTitle);
              }
            }}
          >
            <h1 className="text-xl font-semibold tracking-tight text-zinc-100">
              {headerTitle}
            </h1>
            {isEditable && (
              <PencilIcon className="w-4 h-4 text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity duration-150" />
            )}
          </div>
        )}
      </div>

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

            const isSelected = selectedTaskId && String(task.id || task.taskId) === String(selectedTaskId);

            return (
              <div
                key={task.id || task.taskId}
                // 🎯 修正二：綁定點擊事件，派發 SELECT_TASK 給全域 Context
                onClick={() => {
                  const targetId = task.id || task.taskId;
                  dispatch({ type: 'SELECT_TASK', payload: targetId });
                }}
                // 🎯 修正三：如果被選中，加上深色背景高亮（bg-zinc-900 border-zinc-800）提升工業級 UI 質感
                className={`group flex items-center justify-between py-2.5 px-3 rounded-lg border border-transparent cursor-pointer transition-all duration-150 ${isSelected
                    ? 'bg-zinc-900 border-zinc-800/80 text-white'
                    : 'hover:bg-zinc-900/40 hover:border-zinc-900/60'
                  }`}
              >
                <div className="flex items-center space-x-3 min-w-0 flex-1">
                  {!isTrash ? (
                    <button
                      onClick={(e) => {
                        // 🎯 修正四：阻止事件冒泡，防止點擊 Checkbox 同時觸發外層的選擇任務事件
                        e.stopPropagation();
                        handleUpdateStatus(task, isDone ? 'pending' : 'completed');
                      }}
                      className={`w-4 h-4 rounded border flex-shrink-0 transition-colors flex items-center justify-center ${getPriorityClass(task.priority)}`}
                    >
                      {task.status === 'completed' && <span className="w-1.5 h-1.5 bg-zinc-400 rounded-sm" />}
                    </button>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation(); // 阻止冒泡
                        handleUpdateStatus(task, 'pending');
                      }}
                      className="text-zinc-600 hover:text-zinc-400 p-0.5 flex-shrink-0"
                      title="Restore Task"
                    >
                      <ArrowUturnLeftIcon className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <div className="flex flex-col min-w-0 flex-1">
                    <span className={`text-sm truncate ${task.status === 'completed' ? 'line-through text-zinc-600' :
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

                <div className="opacity-0 group-hover:opacity-100 flex items-center space-x-1.5 ml-4 flex-shrink-0 transition-opacity duration-100">
                  {!isTrash ? (
                    <>
                      {task.status !== 'completed' && task.status !== 'cancelled' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation(); // 🎯 阻止冒泡
                            handleUpdateStatus(task, 'cancelled');
                          }}
                          className="p-1 text-zinc-500 hover:text-orange-400 rounded hover:bg-zinc-800 transition-colors"
                          title="Won't Do"
                        >
                          <NoSymbolIcon className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation(); // 🎯 阻止冒泡
                          handleUpdateStatus(task, 'deleted');
                        }}
                        className="p-1 text-zinc-500 hover:text-red-400 rounded hover:bg-zinc-800 transition-colors"
                        title="Move to Trash"
                      >
                        <TrashIcon className="w-3.5 h-3.5" />
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={async (e) => {
                        e.stopPropagation(); // 🎯 阻止冒泡
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