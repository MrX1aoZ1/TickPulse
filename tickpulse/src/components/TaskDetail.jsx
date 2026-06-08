'use client';

import { useState, useEffect } from 'react';
import { useTasks } from '@/context/TaskContext';
<<<<<<< Updated upstream
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
=======
import { taskApi } from '@/context/TaskContext';
import { useToast } from '@/context/ToastContext';
// 1. 引入 TipTap 核心组件与扩展
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';

import { 
  CheckIcon, 
  CalendarIcon, 
  FlagIcon, 
  TrashIcon, 
  FolderIcon 
} from '@heroicons/react/24/outline';

/**
 * @component TaskDetail
 * @description 滴答清單風格 - 融入 TipTap 的實時 Markdown 渲染詳情面板
 */
export default function TaskDetail() {
  const { tasks, dispatch, selectedTaskId, categories } = useTasks();
  const { showSuccess, showError } = useToast();
  
  // 核心狀態：獲取當前選中的任務
  const selectedTask = tasks && tasks.find ? tasks.find(t => String(t.id) === String(selectedTaskId)) : null;
  
  // 用於動態同步輸入框的局部狀態 (注意：content 移交給 tiptap 管理了)
  const [taskName, setTaskName] = useState('');

  // 2. 初始化 TipTap 編輯器
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // 覆寫內建的加粗行為
        bold: {
          HTMLAttributes: {
            // 給所有的 strong 標籤預設加上一個 class，方便我們用 CSS 控制
            class: 'notion-bold-node',
          },
        }
      }),
      Placeholder.configure({
        placeholder: '添加步驟、描述或備忘紀錄... (支援 Markdown 語法如 # 標題、**加粗**)',
      }),
    ],
    // 💡 注入自訂快捷鍵與行為
    editorProps: {
      handleKeyDown: (view, event) => {
        // 監聽 Ctrl + B (Windows) 或 Cmd + B (Mac)
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'b') {
          event.preventDefault(); // 阻止瀏覽器預設的加粗

          const { state } = view;
          const { selection } = state;
          const { empty, from } = selection;

          // 情況 A: 如果使用者沒有選中任何文字，直接按下 Ctrl+B
          if (empty) {
            // 1. 使用 editor 核心命令安全地在當前光標處插入 ****
            editor.commands.insertContent('****');
            
            // 2. 將光標精準向左移動 2 個字元，讓它乖乖待在 **** 的正中間
            // from + 2 就是剛好在第二個 * 後面的位置
            editor.commands.setTextSelection(from + 2);
            return true;
          }
          
          // 情況 B: 如果選中了文字，則執行標準加粗 toggle（已刪除錯誤代碼）
          editor.commands.toggleBold();
          return true;
        }
        return false;
      },
      attributes: {
        class: 'prose dark:prose-invert focus:outline-none max-w-none',
      }
    },
    onBlur: ({ editor }) => {
      const htmlContent = editor.getHTML();
      updateTaskField('content', htmlContent);
    },
  }, []);
>>>>>>> Stashed changes

    // 這個暫時加上去的
    status: 'pending'
  });
  
  // Get the selected task
  const selectedTask = tasks && tasks.find ? tasks.find(task => task.id === selectedTaskId) : null;
  
  // When the selected task changes, update the edit form
  useEffect(() => {
    if (selectedTask) {
<<<<<<< Updated upstream
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
=======
      setTaskName(selectedTask.task_name || '');
      
      // 3. 任務切換時，動態將新內容塞入 TipTap 編輯器
      if (editor) {
        editor.commands.setContent(selectedTask.content || '');
      }
    }
  }, [selectedTask, editor]);

  // 如果沒有選中任何任務，顯示佔位提示
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
=======
  const updateTaskField = async (fieldName, value) => {
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

      await taskApi.updateTask(selectedTask.id, updatedUpdates);
      dispatch({
        type: 'UPDATE_TASK',
        payload: { taskId: selectedTask.id, updates: updatedUpdates }
      });
    } catch (error) {
      console.error(`Failed to update ${fieldName}:`, error);
      showError('Failed to update task');
      if (fieldName === 'task_name') setTaskName(selectedTask.task_name || '');
      // 失敗時還原 TipTap 內容
      if (fieldName === 'content' && editor) editor.commands.setContent(selectedTask.content || '');
    }
  };

  // 勾選/取消勾選任務狀態
>>>>>>> Stashed changes
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

<<<<<<< Updated upstream
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
=======
  return (
    <div className="flex-1 flex flex-col h-full bg-white dark:bg-zinc-900 border-l border-gray-100 dark:border-zinc-800 text-gray-800 dark:text-zinc-100">
      
      {/* 1. 頂部小工具功能列 */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-50 dark:border-zinc-800/50">
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

          {/* 日期選擇器 */}
          <div className="relative flex items-center text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300 cursor-pointer group max-w-max">
            <CalendarIcon className="h-5 w-5 flex-shrink-0" />
>>>>>>> Stashed changes
            <input
              type="date"
              name="deadline"
              value={editForm.deadline}
              onChange={handleEditChange}
              className="w-full p-2 border border-gray-300 dark:border-zinc-600 rounded-md dark:bg-zinc-800"
            />
          </div>
<<<<<<< Updated upstream
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Priority
            </label>
=======
        </div>

        {/* 工具列右側：其餘操作功能圖標區 */}
        <div className="flex items-center space-x-4 text-gray-400 dark:text-zinc-500">
          {/* 優先級 */}
          <div className="relative flex items-center group">
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Category
            </label>
=======

          {/* 分類資料夾 */}
          <div className="relative flex items-center group">
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
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
=======

          <div className="w-px h-4 bg-gray-200 dark:bg-zinc-800"></div>

          <button 
            onClick={handleDeleteTask}
            className="hover:text-red-500 dark:hover:text-red-400 transition-colors"
            title="Delete Task"
          >
            <TrashIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* 下方主要內容大畫布 */}
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

        {/* 4. 💡 替換成 TipTap 實時渲染編輯區 */}
        <div className="flex-1 flex flex-col pt-2 tiptap-wrapper">
          <EditorContent editor={editor} />
        </div>

      </div>

>>>>>>> Stashed changes
    </div>
  );
}


