'use client';

import { createContext, useContext, useReducer, useEffect, useState } from 'react';
import { useToast } from './ToastContext';
import { v4 as uuidv4 } from 'uuid';

// API base URL - change this to your backend URL
const API_BASE_URL = 'http://localhost:3000';


const TaskContext = createContext();

/**
 * @typedef {object} TaskState
 * @property {Array<object>} tasks - The list of tasks.
 * @property {Array<object>} projects - The list of projects.
 * @property {Array<object>} categories - The list of categories.
 * @property {string|null} selectedTaskId - The ID of the currently selected task.
 * @property {string|null} selectedProjectId - The ID of the currently selected project.
 * @property {string|null} selectedCategoryId - The ID of the currently selected category.
 * @property {string} selectedView - The current view type ('project', 'filter', 'category').
 * @property {string} activeFilter - The currently active filter ('all', 'today', 'completed').
 */

/**
 * @typedef {object} TaskContextProps
 * @property {TaskState} state - The current state of tasks and related data.
 * @property {Function} dispatch - The dispatch function to update the state.
 * @property {Function} refreshTasks - Function to refresh tasks from the backend.
 * @property {object} taskApi - API utility for task-related operations.
 */

/**
 * Provides task-related state and actions to its children components.
 * Manages tasks, projects, categories, and UI selections.
 * Handles data fetching, local storage persistence, and API interactions.
 * @param {object} props - The component props.
 * @param {React.ReactNode} props.children - The child components to be wrapped by the provider.
 * @returns {JSX.Element} The TaskProvider component.
 */
export function TaskProvider({ children }) {
  const [state, dispatch] = useReducer(taskReducer, initialState);
  const { showError } = useToast(); // Hook for displaying error notifications
  
  // Effect to load state from localStorage on component mount
  useEffect(() => {
    const savedState = loadState();
    if (savedState) {
      dispatch({ type: 'HYDRATE_STATE', payload: savedState });
    }
    
    const fetchInitialData = async () => {
      try {
        const tasks = await taskApi.getTasks();
        if (Array.isArray(tasks)) {
          dispatch({ type: 'SET_TASKS', payload: tasks });
        }
        
        const categories = await taskApi.getAllCategories();
        if (Array.isArray(categories)) {
          const transformedCategories = categories.map(cat => ({
            id: cat.id, 
            name: cat.category_name 
          }));
          
          dispatch({
            type: 'SET_CATEGORIES',
            payload: transformedCategories
          });

          const userInbox = transformedCategories.find(c => c.id && c.id.toString().startsWith('inbox_'));
          if (userInbox) {
             dispatch({ type: 'SELECT_CATEGORY', payload: userInbox.id });
          }
        }
      } catch (error) {
        console.error('Failed to fetch initial data:', error);
        showError('Failed to load tasks and categories');
      }
    };
    
    // 🚨 關鍵修正：移除了 token 檢查，直接呼叫！
    fetchInitialData(); 
  }, [showError]);

  // Effect to save state to localStorage whenever the state changes
  useEffect(() => {
    saveState(state); // Persist current state to localStorage
  }, [state]); // Dependency: state
  
  /**
   * Function to refresh the list of tasks from the backend.
   * Useful after operations that might change tasks on the server outside of direct client actions.
   */
  const refreshTasks = async () => {
    try {
      // 🚨 關鍵修正：刪除了對 localStorage token 的依賴
      const tasks = await taskApi.getTasks(); 
      if (Array.isArray(tasks)) {
        dispatch({ type: 'SET_TASKS', payload: tasks }); 
      }
    } catch (error) {
      console.error('Failed to refresh tasks:', error);
      showError('Failed to refresh tasks'); 
    }
  };
  
  return (
    // Provide task state, dispatch function, and refreshTasks function to consuming components
    <TaskContext.Provider value={{ ...state, dispatch, refreshTasks }}>
      {children}
    </TaskContext.Provider>
  );
}

/**
 * Custom hook to access the TaskContext.
 * Provides an easy way for components to consume task-related state and actions.
 * @throws {Error} If used outside of a TaskProvider.
 * @returns {TaskContextProps} The task context value.
 */
export function useTasks() {
  const context = useContext(TaskContext);
  if (context === undefined) {
    throw new Error('useTasks must be used within a TaskProvider');
  }
  return context;
}


async function fetchWithAuth(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
      credentials: 'include', 
    });

    console.log(response);

    if (response.status === 401 || response.status === 403) {
      throw new Error('UNAUTHORIZED');
    }
    
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}: ${await response.text()}`);
    }
    
    return response.json();
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
}

/**
 * @namespace taskApi
 * @description An object containing functions for interacting with the task-related backend API endpoints.
 */
export const taskApi = {
  getTasks: async () => 
    fetchWithAuth('/api/tasks', {
      method: 'GET',
      credentials: 'include', 
    }),
  createTask: async (taskData) =>
    fetchWithAuth('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include', 
      body: JSON.stringify(taskData),
    }),
  updateTask: async (taskId, updates) =>
    fetchWithAuth(`/api/tasks/${taskId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include', 
      body: JSON.stringify(updates),
    }),
  deleteTask: async (taskId) =>
    fetchWithAuth(`/api/tasks/${taskId}`, { 
      method: 'DELETE',
      credentials: 'include',
    }),

  // updateTaskStatus: async (id, status) =>
  //   fetchWithAuth(`/api/tasks/${id}/status`, {
  //     method: 'PUT',
  //     body: JSON.stringify({ status }),
  //   }),

  // updateTaskPriority: async (id, priority) =>
  //   fetchWithAuth(`/api/tasks/${id}/priority`, {
  //     method: 'PUT',
  //     body: JSON.stringify({ priority }),
  //   }),

  // updateTaskDeadline: async (id, deadline) =>
  //   fetchWithAuth(`/api/tasks/${id}/deadline`, {
  //     method: 'PUT',
  //     body: JSON.stringify({ deadline }),
  //   }),

  // updateTaskCategory: async (id, category_id) =>
  //   fetchWithAuth(`/api/tasks/${id}/category`, {
  //     method: 'PUT',
  //     body: JSON.stringify({ category_id }),
  //   }),

  // updateTaskContent: async (id, content) =>
  //   fetchWithAuth(`/api/tasks/${id}/content`, { // Corrected path from /tasks to /api/tasks for consistency
  //     method: 'PUT',
  //     body: JSON.stringify({ content }),
  //   }),



  // Category related API calls
  getAllCategories: async () => 
    fetchWithAuth('/api/categories', {
      method: 'GET',
      credentials: 'include',
    }),
  createCategory: async (category_name) =>
    fetchWithAuth('/api/categories', { 
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ name: category_name }),
    }),
  updateCategory: async (category_id) =>
    fetchWithAuth(`/api/categories/${category_id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ category_id: category_id }),
    }),
  deleteCategory: async (category_id) =>
    fetchWithAuth(`/api/categories/${category_id}`, {
      method: 'DELETE',
      credentials: 'include',
    }),
};

// Initial state for the reducer
const initialState = {
  tasks: [],
  categories: [], 
  selectedCategoryId: null, 
  selectedTaskId: null,
  selectedView: 'filter', // Changed from 'category' to 'filter'
  activeFilter: 'all', // Set default filter to 'all'
};

// --- Helper Functions ---

// Function to save state to local storage (Client-side only)
const saveState = (state) => {
  try {
    if (typeof window !== 'undefined') {
      const stateToSave = {
        selectedCategoryId: state.selectedCategoryId, 
        selectedView: state.selectedView,
        activeFilter: state.activeFilter,
      };
      const serializedState = JSON.stringify(stateToSave);
      localStorage.setItem('tickpulseState', serializedState);
    }
  } catch (err) {
    console.error("Could not save state to local storage", err);
  }
};

// Function to load state (will be called within useEffect)
const loadState = () => {
  if (typeof window === 'undefined') {
    return undefined;
  }
  try {
    const serializedState = localStorage.getItem('tickpulseState');
    if (serializedState === null) {
      return undefined; // Let reducer use initialState
    }
    return JSON.parse(serializedState);
  } catch (err) {
    console.error("Could not load state from local storage", err);
    return undefined; // Use initialState in case of error
  }
};

// --- Single Reducer Definition ---
const taskReducer = (state, action) => {
  switch (action.type) {
    case 'HYDRATE_STATE':
      return {
        ...initialState,
        ...(action.payload || {}),
        categories: action.payload?.categories || [],
      };

    case 'ADD_TASK': {
      if (action.payload.id) {
        return {
          ...state,
          tasks: [...state.tasks, action.payload]
        };
      }
      
      const newId = uuidv4();
      const newTask = {
        id: newId,
        task_name: action.payload.title,
        content: action.payload.content || '',
        deadline: action.payload.deadline,
        priority: action.payload.priority || 'low',
        category_id: action.payload.categoryId || state.selectedCategoryId,
        status: 'pending',
        completed: false,
        createdAt: new Date().toISOString(),
      };
      return {
        ...state,
        tasks: [...state.tasks, newTask]
      };
    }

    case 'TOGGLE_TASK': {
      const updatedTasks = state.tasks.map(task =>
        task.id === action.payload
          ? { 
              ...task, 
              completed: !task.completed,
              status: !task.completed ? 'completed' : 'pending' // Update status to match database
            }
          : task
      );
      return {
        ...state,
        tasks: updatedTasks
      };
    }

    case 'DELETE_TASK': {
      const updatedTasks = state.tasks.filter(task => task.id !== action.payload);
      return {
        ...state,
        tasks: updatedTasks
      };
    }

    case 'UPDATE_TASK': {
      const updatedTasks = state.tasks.map(task =>
        task.id === action.payload.id
          ? { ...task, ...action.payload.updates }
          : task
      );
      return {
        ...state,
        tasks: updatedTasks
      };
    }

    case 'SET_CATEGORIES': {
      return {
        ...state,
        categories: action.payload
      };
    }

    case 'ADD_CATEGORY': {
      return {
        ...state,
        categories: [...state.categories, action.payload]
      };
    }

    case 'DELETE_CATEGORY': {
      const updatedCategories = state.categories.filter(category => category.id !== action.payload);
      return {
        ...state,
        categories: updatedCategories
      };
    }

    case 'RENAME_CATEGORY': {
      const updatedCategories = state.categories.map(category =>
        category.id === action.payload.categoryId
          ? { ...category, name: action.payload.newName }
          : category
      );
      return {
        ...state,
        categories: updatedCategories
      };
    }

    case 'SELECT_TASK': {
      return {
        ...state,
        selectedTaskId: action.payload
      };
    }

    case 'SELECT_CATEGORY': {
      return {
        ...state,
        selectedCategoryId: action.payload
      };
    }

    case 'SET_VIEW':
      return { ...state, selectedView: action.payload };
    case 'SET_FILTER':
      return { ...state, activeFilter: action.payload };
    case 'SET_TASKS':
      return {
        ...state,
        tasks: action.payload
      };
    default:
      return state;
  }
};

// --- Context Definition ---
