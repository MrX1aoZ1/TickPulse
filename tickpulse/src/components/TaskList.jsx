'use client';

import { useTasks } from '@/context/TaskContext';
import { CheckIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useState, useEffect } from 'react';
import { taskApi } from '@/context/TaskContext'; // Import taskApi
import { useToast } from '@/context/ToastContext'; // Import useToast

// For frontend dev use
const mockTasks = [
  {
    id: 'task-1',
    task_name: '🚀 將 TickPulse 前端組件進行分類重構',
    status: 'pending',
    priority: 'high',
    category_name: '1',
    deadline: new Date().toISOString().split('T')[0] // Due Today
  },
  {
    id: 'task-2',
    task_name: '📝 補全 TaskItem 的 TypeScript 接口定義',
    status: 'pending',
    priority: 'medium',
    category_name: '1',
    deadline: ''
  },
  {
    id: 'task-3',
    task_name: '🤖 去 Gym 訓練 1 小時 (練腿日)',
    status: 'completed',
    priority: 'low',
    category_name: '3',
    deadline: new Date().toISOString().split('T')[0]
  },
  {
    id: 'task-4',
    task_name: '🤖 去 Gym 訓練 1 小時 (練腿日)',
    status: 'completed',
    priority: 'low',
    category_name: '3',
    deadline: new Date().toISOString().split('T')[0]
  }
];

/**
 * @component TaskList
 * @description Component for displaying a list of tasks.
 * Filters and sorts tasks based on the selected view (category or filter).
 * Allows users to select, complete, and delete tasks.
 */
export default function TaskList() {
  const {
    tasks = [],
    dispatch,
    selectedTaskId,
    selectedView,
    activeFilter,
    selectedCategoryId, // Changed from selectedProjectId
    categories // Changed from projects
  } = useTasks();

  const { showSuccess, showError } = useToast(); // Add useToast hook
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: 'createdAt', direction: 'desc' });


  // For frontend dev use
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && tasks.length === 0) {
      dispatch({
        type: 'SET_TASKS',
        payload: mockTasks
      });
    }
  }, [dispatch, tasks.length]);

  /**
   * @function getViewTitle
   * @description Gets the title for the current view (e.g., category name or filter name).
   * @returns {string} The title for the current view.
   */
  const getViewTitle = () => {
    if (selectedView === 'category') { // Changed from 'project'
      const category = categories.find(c => c.id === selectedCategoryId); // Changed from project
      return category ? category.name : 'Tasks';
    } else if (selectedView === 'filter') {
      switch (activeFilter) {
        case 'all': return 'All Tasks'; // Translated from 'All Mission'
        case 'today': return 'Today\'s Tasks'; // Translated from 'Today Mission'
        case 'completed': return 'Completed Tasks'; // Translated from 'Finished Mission'
        default: return 'Tasks';
      }
    }
    return 'Tasks';
  };

  // Filter and sort tasks
  useEffect(() => {

    // For frontend dev use
    let result = [...tasks];

    if (selectedView === 'category') {
      result = result.filter(task => task.category_name === selectedCategoryId);
    } else if (selectedView === 'filter') {
      if (activeFilter === 'today') {
        const today = new Date().toISOString().split('T')[0];
        result = result.filter(task => task.deadline === today && task.status !== 'completed');
      } else if (activeFilter === 'completed') {
        result = result.filter(task => task.status === 'completed');
      }
    }
    // Add sorting logic here if needed, based on sortConfig
    // Example: result.sort((a, b) => { ... });
    setFilteredTasks(result);
  }, [tasks, selectedView, selectedCategoryId, activeFilter, sortConfig]); // Changed from selectedProjectId

  /**
   * @function handleTaskSelect
   * @description Handles the selection of a task.
   * Dispatches an action to update the selected task in the global state.
   * @param {string} taskId - The ID of the task to select.
   */
  const handleTaskSelect = (taskId) => {
    dispatch({ type: 'SELECT_TASK', payload: taskId });
  };

  /**
   * @function handleToggleComplete
   * @description Toggles the completion status of a task.
   * Calls the API to update the task status and updates the local state.
   * @param {Event} e - The event object.
   * @param {string} taskId - The ID of the task to toggle.
   */
  const handleToggleComplete = async (e, taskId) => {
    e.stopPropagation(); // Prevent task selection when clicking the checkbox
    try {
      // For frontend dev use

      const task = tasks.find(t => t.id === taskId);
      if (!task) return;

      const newStatus = task.status === 'completed' ? 'pending' : 'completed';

      if (process.env.NODE_ENV === 'development' ) {
        // 模擬修改本地數據庫
        dispatch({ type: 'TOGGLE_TASK', payload: taskId });

        console.log(tasks);

        showSuccess(`${taskId} marked as ${newStatus} (Dev Mode)`);

        return; // Exit without calling API in dev mode
      }

      // Call API to update task status
      await taskApi.updateTaskStatus(taskId, newStatus);

      // Update local state
      dispatch({ type: 'TOGGLE_TASK', payload: taskId });
      showSuccess(`Task marked as ${newStatus}`);
    } catch (error) {
      console.error('Failed to update task status:', error);
      showError('Failed to update task status');
    }
  };

  /**
   * @function handleDeleteTask
   * @description Handles the deletion of a task.
   * Prompts for confirmation, calls the API, and updates local state.
   * @param {Event} e - The event object.
   * @param {string} taskId - The ID of the task to delete.
   */
  const handleDeleteTask = async (e, taskId) => {
    e.stopPropagation(); // Prevent task selection when clicking delete

    try {
      // For frontend dev use   
      if (process.env.NODE_ENV === 'development') {
        dispatch({ type: 'DELETE_TASK', payload: taskId });

        console.log(tasks);

        showSuccess(`${taskId} deleted successfully (Dev Mode)`);
        return; // Exit without calling API in dev mo de
      }

      // Call API to delete task
      await taskApi.deleteTask(taskId);

      // Update local state
      dispatch({ type: 'DELETE_TASK', payload: taskId });
      showSuccess('Task deleted successfully');
    } catch (error) {
      console.error('Failed to delete task:', error);
      showError('Failed to delete task');
    }

  };

  // Add this filter bar above the task list
  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-gray-200 dark:border-zinc-700">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">{getViewTitle()}</h2>
        {/* Filter Bar */}
        <div className="flex space-x-2 mt-2">
          {[
            { key: 'all', label: 'All Tasks' }, // Translated
            { key: 'today', label: 'Today\'s Tasks' }, // Translated
            { key: 'completed', label: 'Completed Tasks' } // Translated
          ].map(filter => (
            <button
              key={filter.key}
              onClick={() => {
                dispatch({ type: 'SET_VIEW', payload: 'filter' });
                dispatch({ type: 'SET_FILTER', payload: filter.key });
              }}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${selectedView === 'filter' && activeFilter === filter.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 dark:bg-zinc-700 text-gray-800 dark:text-gray-200'
                }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {filteredTasks.length === 0 ? (
          <div className="p-4 text-center text-gray-500 dark:text-gray-400">
            No tasks
          </div>
        ) : (
          <ul className="divide-y divide-gray-200 dark:divide-zinc-700">
            {filteredTasks.map(task => (
              <li
                key={task.id}
                onClick={() => handleTaskSelect(task.id)}
                className={`p-4 transition-colors ${task.id === selectedTaskId
                    ? 'bg-blue-50 dark:bg-blue-900/20'
                    : 'hover:bg-gray-50 dark:hover:bg-zinc-800'
                  }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <button
                      onClick={(e) => handleToggleComplete(e, task.id)}
                      className={`mt-0.5 cursor-pointer flex-shrink-0 h-5 w-5 rounded-full border ${task.status === 'completed' // Changed from task.completed
                          ? 'bg-green-500 border-green-500 text-white'
                          : 'border-gray-300 dark:border-zinc-600'
                        } flex items-center justify-center`}
                    >
                      {task.status === 'completed' && <CheckIcon className="h-3 w-3" />} {/* Changed from task.completed */}
                    </button>
                    <div>
                      <h3 className={`text-sm font-medium ${task.status === 'completed' // Changed from task.completed
                          ? 'text-gray-400 dark:text-gray-500 line-through'
                          : 'text-gray-800 dark:text-gray-200'
                        }`}>
                        {task.task_name} {/* Changed from task.title */}
                      </h3>
                      {task.deadline && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Due date: {task.deadline}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {task.priority !== 'none' && (
                      <span className={`text-xs px-2 py-1 rounded-full ${task.priority === 'high'
                          ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200'
                          : task.priority === 'medium'
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200'
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200'
                        }`}>
                        {task.priority}
                      </span>
                    )}
                    <button
                      onClick={(e) => handleDeleteTask(e, task.id)}
                      className="text-gray-400 hover:text-red-500 dark:hover:text-red-400"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}