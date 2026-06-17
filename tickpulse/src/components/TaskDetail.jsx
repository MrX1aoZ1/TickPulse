'use client';

import { useState, useEffect } from 'react';
import { useTasks } from '@/context/TaskContext';
import { taskApi } from '@/context/TaskContext';
import { useToast } from '@/context/ToastContext';

// 1. 引入 TipTap 核心组件与扩展
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';

import { 
  CheckIcon, 
  CalendarIcon, 
  TrashIcon,
} from '@heroicons/react/24/outline';

/**
 * @component TaskDetail
 * @description 滴答清單風格 - 融入 TipTap 的實時 Markdown 渲染詳情面板（已移除傳統 Form 切換，改為全實時失焦保存）
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
          
          // 情況 B: 如果選中了文字，則執行標準加粗 toggle
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

  // 当选中的任务改变时，动态更新本地状态并注入 TipTap
  useEffect(() => {
    if (selectedTask) {
      setTaskName(selectedTask.task_name || '');
      
      // 3. 任務切換時，動態將新內容塞入 TipTap 編輯器
      if (editor) {
        editor.commands.setContent(selectedTask.content || '');
      }
    }
  }, [selectedTask, editor]);

  // 如果沒有選中任何任務，顯示佔位提示
  if (!selectedTask) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-gray-400 dark:text-gray-500">
        Select a task to view details
      </div>
    );
  }

  // 核心统一更新字段方法 (整合 Dev 模式与生产 API)
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
        showSuccess(`Task ${fieldName} updated successfully (Dev Mode)`);
        return;
      }

      await taskApi.updateTask(selectedTask.id, updatedUpdates);
      dispatch({
        type: 'UPDATE_TASK',
        payload: { taskId: selectedTask.id, updates: updatedUpdates }
      });
      showSuccess('Task updated successfully');
    } catch (error) {
      console.error(`Failed to update ${fieldName}:`, error);
      showError('Failed to update task');
      // 失败时回滚对应状态
      if (fieldName === 'task_name') setTaskName(selectedTask.task_name || '');
      if (fieldName === 'content' && editor) editor.commands.setContent(selectedTask.content || '');
    }
  };

  // 勾選/取消勾選任務狀態
  const handleToggleComplete = () => {
    const nextStatus = selectedTask.status === 'completed' ? 'pending' : 'completed';
    dispatch({ type: 'TOGGLE_TASK', payload: selectedTask.id });
    showSuccess(`${selectedTask.id} marked as ${nextStatus} (Dev Mode)`);
  };
  
  // 刪除任務
  const handleDeleteTask = async () => {
    if (!selectedTask || !selectedTask.id) return;
    
    try {
      if (process.env.NODE_ENV === 'development') {
        dispatch({ type: 'DELETE_TASK', payload: selectedTask.id });
        showSuccess(`${selectedTask.id} deleted successfully (Dev Mode)`);
        return;
      }

      await taskApi.deleteTask(selectedTask.id);
      dispatch({ type: 'DELETE_TASK', payload: selectedTask.id });
      showSuccess('Task deleted successfully');
    } catch (error) {
      console.error('Failed to delete task:', error);
      showError('Failed to delete task');
    }
  };
  
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
            <CalendarIcon className="h-5 w-5 flex-shrink-0 mr-1" />
            <input
              type="date"
              name="deadline"
              value={selectedTask.deadline || ''}
              onChange={(e) => updateTaskField('deadline', e.target.value)}
              className="p-1 border border-transparent hover:border-gray-300 dark:hover:border-zinc-600 rounded-md bg-transparent dark:bg-transparent text-sm focus:outline-none focus:border-gray-300"
            />
          </div>
        </div>

        {/* 工具列右側：其餘操作功能圖標區 */}
        <div className="flex items-center space-x-4 text-gray-400 dark:text-zinc-500">
          {/* 優先級 */}
          <div className="relative flex items-center group">
            <select
              name="priority"
              value={selectedTask.priority || 'none'}
              onChange={(e) => updateTaskField('priority', e.target.value)}
              className="p-1 border border-transparent hover:border-gray-300 dark:hover:border-zinc-600 rounded-md bg-transparent dark:bg-transparent text-sm focus:outline-none focus:border-gray-300"
            >
              <option value="none">none</option>
              <option value="low">low</option>
              <option value="medium">medium</option>
              <option value="high">High</option>
            </select>
          </div>

          {/* 分類資料夾 */}
          <div className="relative flex items-center group">
            <select
              name="category_name"
              value={selectedTask.category_name || 'inbox'}
              onChange={(e) => updateTaskField('category_name', e.target.value)}
              className="p-1 border border-transparent hover:border-gray-300 dark:hover:border-zinc-600 rounded-md bg-transparent dark:bg-transparent text-sm focus:outline-none focus:border-gray-300"
            >
              {categories.map(category => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
          </div>
          
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

    </div>
  );
}