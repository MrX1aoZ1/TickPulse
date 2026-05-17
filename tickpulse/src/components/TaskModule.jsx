'use client';

import { useState } from 'react';
import TaskList from './TaskList';
import TaskDetail from './TaskDetail';
import { useTasks } from '@/context/TaskContext';
import { taskApi } from '@/context/TaskContext'; // Add this import
import { useToast } from '@/context/ToastContext'; // Add this import
import { PlusIcon } from '@heroicons/react/24/outline';
import ErrorBoundary from './ErrorBoundary';
import { useRef } from 'react';
import CategoryList from './CategoryList';

// Updated priority array, including 'none'
const priorities = [
    { value: 'none', label: 'none' },
    { value: 'low', label: 'low' },
    { value: 'medium', label: 'medium' },
    { value: 'high', label: 'high' },
];

/**
 * @component TaskModule
 * @description Main module for managing tasks.
 * Integrates TaskList and TaskDetail components.
 * Handles task creation via a modal and allows resizing of the TaskList panel.
 */
export default function TaskModule() {
  const { selectedTaskId, dispatch, categories, selectedCategoryId } = useTasks();
  const { showSuccess, showError } = useToast(); // Add this line

  // --- Column width state ---
  const minTaskListWidth = 180;
  const maxTaskListWidth = 600;
  const [taskListWidth, setTaskListWidth] = useState(340); // px, initial task list width
  const resizing = useRef({ active: false, startX: 0, startTaskList: 0 });
  const [showDivider, setShowDivider] = useState(false);

  // --- Mouse event handlers for resizing ---
  /**
   * @function handleMouseDown
   * @description Handles mouse down event on the resizer divider.
   * Initializes resizing state and adds global mouse move/up listeners.
   * @param {MouseEvent} e - The mouse down event.
   */
  const handleMouseDown = (e) => {
    resizing.current = {
      active: true,
      startX: e.clientX,
      startTaskList: taskListWidth,
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
    setShowDivider(true); // Keep divider visible during drag
  };

  /**
   * @function handleMouseMove
   * @description Handles mouse move event during resizing.
   * Calculates and sets the new width for the task list, within defined limits.
   * @param {MouseEvent} e - The mouse move event.
   */
  const handleMouseMove = (e) => {
    if (!resizing.current.active) return;
    const dx = e.clientX - resizing.current.startX;
    // Limit width
    const newWidth = Math.max(minTaskListWidth, Math.min(maxTaskListWidth, resizing.current.startTaskList + dx));
    setTaskListWidth(newWidth);
  };

  /**
   * @function handleMouseUp
   * @description Handles mouse up event after resizing.
   * Clears resizing state and removes global mouse listeners.
   */
  const handleMouseUp = () => {
    resizing.current.active = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = '';
    setShowDivider(false); // Hide divider after drag
  };

  // Modal related state and handlers
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    title: '',
    content: '',
    deadline: '',
    priority: 'none',
    categoryName: selectedCategoryId || 'inbox', // This will be mapped to category_name in API
    status: 'pending',
  });

  // Remove editForm and its handlers if not used for modal

  /**
   * @function handleOpenModal
   * @description Opens the 'Add New Task' modal and resets the form.
   */
  const handleOpenModal = () => {
    setForm({
      title: '',
      content: '',
      deadline: '',
      priority: 'none',
      categoryName: selectedCategoryId || 'inbox',
    });
    setShowModal(true);
  };

  /**
   * @function handleCloseModal
   * @description Closes the 'Add New Task' modal.
   */
  const handleCloseModal = () => setShowModal(false);

  /**
   * @function handleChange
   * @description Handles changes in the 'Add New Task' form input fields.
   * Updates the local `form` state.
   * @param {Event} e - The input change event object.
   */
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  /**
   * @function handleSubmit
   * @description Handles the submission of the 'Add New Task' form.
   * Calls the API to create a new task and updates the local state upon success.
   * @param {Event} e - The form submission event object.
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    
    try {
      // For frontend dev use
      if (process.env.NODE_ENV === 'development') {
        dispatch({
          type: 'ADD_TASK',
          payload: {
            id: `task-${Date.now()}`,
            task_name: form.title.trim(),
            content: form.content,
            deadline: form.deadline,
            priority: form.priority,
            category_name: form.categoryName, // 綁定到對應的分類 ID
            status: form.status,
            createdAt: new Date().toISOString()
          }
        });
        
        setShowModal(false);
        showSuccess('Task created successfully (Dev Mode)');
        return; // 💥 直接攔截返回
      }

      // First create the task in the backend
      const response = await taskApi.createTask({
        title: form.title,
        content: form.content,
        deadline: form.deadline,
        priority: form.priority,
        categoryName: form.categoryName,
        status: form.status,
      });
      
      // Then update the local state with the response from the backend
      dispatch({
        type: 'ADD_TASK',
        payload: {
          id: response.id,
          task_name: response.task_name,
          content: response.content,
          deadline: response.deadline,
          priority: response.priority,
          category_name: response.category_name,
          status: response.status,
          createdAt: new Date().toISOString()
        }
      });
      
      setShowModal(false);
      showSuccess('Task created successfully');
    } catch (error) {
      console.error('Failed to create task:', error);
      showError('Failed to create task');
    }
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Floating + Button */}
      <button
        className="fixed bottom-8 right-8 z-50 bg-blue-600 hover:bg-blue-700 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg text-3xl"
        onClick={handleOpenModal}
        title="Add Task"
      >
        +
      </button>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/10 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-800 rounded-lg p-6 w-full max-w-md shadow-lg relative">
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-xl"
              onClick={handleCloseModal}
              aria-label="Close"
            >
              ×
            </button>
            <h2 className="text-lg font-semibold mb-4">Add New Task</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                name="title"
                value={form.title}
                onChange={handleChange}
                placeholder="Title"
                className="w-full border rounded p-2"
                required
              />
              <textarea
                name="content"
                value={form.content}
                onChange={handleChange}
                placeholder="Details"
                className="w-full border rounded p-2"
              />
              <input
                type="date"
                name="deadline"
                value={form.deadline}
                onChange={handleChange}
                className="w-full border rounded p-2"
              />
              <select
                name="priority"
                value={form.priority}
                onChange={handleChange}
                className="w-full border rounded p-2"
              >
                <option value="none">No Priority</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
              <select
                name="categoryName"
                value={form.categoryName}
                onChange={handleChange}
                className="w-full border rounded p-2"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded p-2 font-semibold"
              >
                Add Task 
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Task List and Detail */}
      <div className="flex flex-1">
        <div className="flex-shrink-0" style={{ width: taskListWidth }}>
          <TaskList />
        </div>
        <div
          className={`w-1 ${showDivider ? 'bg-blue-500' : 'bg-transparent'} cursor-col-resize`}
          onMouseDown={handleMouseDown}
        />
        <div className="flex-1">
          <TaskDetail />
        </div>
      </div>
    </div>
  );
}