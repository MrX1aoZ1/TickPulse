'use client';

import { useState, useEffect } from 'react';
import { useTasks } from '@/context/TaskContext';
import { taskApi } from '@/context/TaskContext'; // Add this import
import { useToast } from '@/context/ToastContext'; // Add this import
import { CheckIcon, PencilIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { TaskList } from '@/components/TaskList'

/**
 * @component TaskDetail
 * @description Component for displaying and editing the details of a selected task.
 * Allows users to view task information, edit fields, mark as complete, and delete the task.
 * @param {object} props - The component's props.
 * @param {object} [props.task] - The task object (though typically fetched from context).
 */
export default function TaskDetail({ task }) {
  const { tasks, dispatch, selectedTaskId, categories } = useTasks(); // Use useTasks instead of useTaskContext
  const { showSuccess, showError } = useToast(); // Add this line
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    task_name: '', // Changed from title
    content: '',
    deadline: '',
    priority: 'none',
    category_name: 'inbox', // Changed from projectId

    // 這個暫時加上去的
    status: 'pending'
  });
  
  // Get the selected task
  const selectedTask = tasks && tasks.find ? tasks.find(task => task.id === selectedTaskId) : null;
  
  // When the selected task changes, update the edit form
  useEffect(() => {
    if (selectedTask) {
      setEditForm({
        task_name: selectedTask.task_name || '', // Changed from title
        content: selectedTask.content || '',
        deadline: selectedTask.deadline || '',
        priority: selectedTask.priority || 'none',
        category_name: selectedTask.category_name || 'inbox', // Changed from projectId
      });
    }
  }, [selectedTask]);
  
  // If no task is selected, display a placeholder message
  if (!selectedTask) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-gray-400 dark:text-gray-500">
        Select a task to view details
      </div>
    );
  }
  
  /**
   * @function handleToggleComplete
   * @description Toggles the completion status of the selected task.
   * Dispatches an action to update the task's status in the global state.
   */
  const handleToggleComplete = () => {
    const nextStatus = selectedTask.status === 'completed' ? 'pending' : 'completed';
    dispatch({ type: 'TOGGLE_TASK', payload: selectedTask.id });
    showSuccess(`${selectedTask.id} marked as ${nextStatus} (Dev Mode)`);
  };
  
  /**
   * @function handleDeleteTask
   * @description Handles the deletion of the selected task.
   * Calls the API to delete the task and updates the local state upon success.
   */
  const handleDeleteTask = async () => {
    if (!selectedTask || !selectedTask.id) return;
    
    try {

      // For frontend dev use
      if (process.env.NODE_ENV === 'development') {
        dispatch({ type: 'DELETE_TASK', payload: selectedTask.id });
        showSuccess(`${selectedTask.id} deleted successfully (Dev Mode)`);
        return; // Stop execution if in dev mode
      }

      // First call the API to delete the task
      await taskApi.deleteTask(selectedTask.id);
      
      // Then update the local state
      dispatch({ type: 'DELETE_TASK', payload: selectedTask.id });
      
      showSuccess('Task deleted successfully');
    } catch (error) {
      console.error('Failed to delete task:', error);
      showError('Failed to delete task');
    }
  };
  
  /**
   * @function handleEditChange
   * @description Handles changes in the edit form input fields.
   * Updates the local `editForm` state.
   * @param {Event} e - The input change event object.
   */
  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({ ...prev, [name]: value }));
  };

  /**
   * @function handleCategoryChange
   * @description Handles category change in the edit form.
   * (Currently no specific logic, can be extended if needed)
   * @param {Event} e - The select change event object.
   */
  const handleCategoryChange = (e) => {
    // Can add specific logic if needed
  };
  
  /**
   * @function handleEditSubmit
   * @description Handles the submission of the task edit form.
   * Calls the API to update the task and updates the local state upon success.
   * @param {Event} e - The form submission event object.
   */
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      // Create a complete update object with all required fields
      const updateData = {
        task_name: editForm.task_name,
        content: editForm.content,
        deadline: editForm.deadline,
        priority: editForm.priority,
        category_name: editForm.category_name,
      };

      // For frontend dev use
      if (process.env.NODE_ENV === 'development') {
        dispatch({
          type: 'UPDATE_TASK',
          payload: {
            taskId: selectedTask.id,
            updates: editForm // 包含修改後的名稱、內容、日期、優先級、分類
          }
        });
        setIsEditing(false);
        showSuccess('Task updated successfully (Dev Mode)');
        return; // Stop execution if in dev mode
      }  

      // Update the task with all fields to ensure task_name is included
      await taskApi.updateTask(selectedTask.id, updateData);
      
      // No need for individual updates since we're updating everything at once
      // This prevents the "task_name cannot be null" error
      
      dispatch({
        type: 'UPDATE_TASK',
        payload: {
          taskId: selectedTask.id,
          updates: editForm
        }
      });
      setIsEditing(false);
      showSuccess('Task updated successfully');
    } catch (error) {
      console.error('Failed to update task:', error);
      showError('Failed to update task');
    }
  };
  
  // Render task details or edit form
  return (
    <div className="flex-1 p-6 overflow-y-auto">
      {isEditing ? (
        // Edit form
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Title
            </label>
            <input
              type="text"
              name="task_name" // Changed from title
              value={editForm.task_name} // Changed from title
              onChange={handleEditChange}
              className="w-full p-2 border border-gray-300 dark:border-zinc-600 rounded-md dark:bg-zinc-800"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Content
            </label>
            <textarea
              name="content"
              value={editForm.content}
              onChange={handleEditChange}
              rows={4}
              className="w-full p-2 border border-gray-300 dark:border-zinc-600 rounded-md dark:bg-zinc-800"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Deadline
            </label>
            <input
              type="date"
              name="deadline"
              value={editForm.deadline}
              onChange={handleEditChange}
              className="w-full p-2 border border-gray-300 dark:border-zinc-600 rounded-md dark:bg-zinc-800"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Priority
            </label>
            <select
              name="priority"
              value={editForm.priority}
              onChange={handleEditChange}
              className="w-full p-2 border border-gray-300 dark:border-zinc-600 rounded-md dark:bg-zinc-800"
            >
              <option value="none">none</option>
              <option value="low">low</option>
              <option value="medium">medium</option>
              <option value="high">High</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Category
            </label>
            <select
              name="category_name"
              value={editForm.category_name}
              onChange={(e) => {
                handleEditChange(e);
                handleCategoryChange(e);
              }}
              className="w-full p-2 border border-gray-300 dark:border-zinc-600 rounded-md dark:bg-zinc-800"
            >
              {categories.map(category => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
          </div>
          
          <div className="flex space-x-2">
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              <CheckIcon className="h-5 w-5 inline-block mr-1" />
              Save
            </button>
            <button
              type="button"
              className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
              onClick={() => setIsEditing(false)}
            >
              <XMarkIcon className="h-5 w-5 inline-block mr-1" />
              Cancel
            </button>
          </div>
        </form>
      ) : (
        // Task details
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{selectedTask.task_name}</h2>
            <div className="flex space-x-2">
              <button
                className="p-2 rounded bg-yellow-100 text-yellow-800 hover:bg-yellow-200 dark:bg-yellow-900 dark:text-yellow-200"
                onClick={() => setIsEditing(true)}
                title="edit"
              >
                <PencilIcon className="h-5 w-5" />
              </button>
              <button
                className="p-2 rounded bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900 dark:text-red-200"
                onClick={handleDeleteTask}
                title="delete"
              >
                <TrashIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
          <div className="mb-2">
            <span className="font-semibold">Content: </span>
            <span>{selectedTask.content || 'None'}</span>
          </div>
          <div className="mb-2">
            <span className="font-semibold">Deadline: </span>
            <span>{selectedTask.deadline || 'None'}</span>
          </div>
          <div className="mb-2">
            <span className="font-semibold">Priority: </span>
            <span>{selectedTask.priority || 'None'}</span>
          </div>
          <div className="mb-2">
            <span className="font-semibold">Category: </span>
            <span>
              {categories.find(c => c.id === selectedTask.category_name)?.name || 'None'}
            </span>
          </div>
          <div className="flex space-x-2 mt-4">
            <button
              className={`px-4 py-2 rounded ${
                selectedTask.status === 'completed'
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-200 text-gray-800'
              }`}
              onClick={handleToggleComplete}
            >
              <CheckIcon className="h-5 w-5 inline-block mr-1" />
              {selectedTask.status === 'completed' ? 'Completed' : 'Mark as Done'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


