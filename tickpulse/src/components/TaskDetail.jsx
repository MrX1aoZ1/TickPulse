'use client';

import { useState, useEffect } from 'react';
import { useTasks } from '@/context/TaskContext';
import { taskApi } from '@/context/TaskContext';
import { useToast } from '@/context/ToastContext';

// 1. 引入 TipTap 核心組件與擴展
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
 * @description 滴答清單風格 - 融入 TipTap 的實時 Markdown 渲染詳情面板（全實時失焦/變更保存，完美對接後端實體欄位）
 */
export default function TaskDetail() {
  const { tasks = [], dispatch, selectedTaskId, categories = [] } = useTasks();
  const { showSuccess, showError } = useToast();
  
  // 💡 安全防護：確保 tasks 是陣列，防止因 null/undefined 崩潰
  const selectedTask = Array.isArray(tasks) 
    ? tasks.find(t => t && String(t.id) === String(selectedTaskId)) 
    : null;
  
  // 用於動態同步輸入框的局部狀態
  const [taskName, setTaskName] = useState('');

  // 2. 初始化 TipTap 編輯器
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: '添加描述或筆記...',
      }),
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm dark:prose-invert focus:outline-none max-w-none min-h-[150px] text-sm text-gray-800 dark:text-zinc-200',
      },
    },
    // 當編輯器失去焦點時，自動保存內容到後端
    onBlur: ({ editor }) => {
      const htmlContent = editor.getHTML();
      // 如果內容沒有變，就不要打 API
      if (selectedTask && selectedTask.content !== htmlContent) {
        updateTaskField('content', htmlContent);
      }
    }
  });

  // 3. 當選中的任務切換時，同步更新標題與 TipTap 編輯器的內容
  useEffect(() => {
    if (selectedTask) {
      setTaskName(selectedTask.task_name || '');
      if (editor) {
        editor.commands.setContent(selectedTask.content || '');
      }
    }
  }, [selectedTaskId, selectedTask, editor]);

  // 💡 安全防護：如果沒有選中任何任務，直接優雅阻斷渲染，避免元件內部噴出 TypeError
  if (!selectedTask) {
    return (
      <div className="flex-1 h-full flex items-center justify-center text-gray-400 dark:text-zinc-500 bg-gray-50 dark:bg-zinc-900/50 text-sm">
        請選取任務以查看詳細資訊
      </div>
    );
  }

  // 4. 實時更新後端資料庫欄位的核心函式
  const updateTaskField = async (fieldName, value) => {
    if (!selectedTask) return;
    // 如果值沒變，直接返回
    if (selectedTask[fieldName] === value) return;

    // 構建符合後端 API 規範的 Payload 結構
    const updatedFields = {
      task_name: fieldName === 'task_name' ? value : (selectedTask.task_name || ''),
      content: fieldName === 'content' ? value : (selectedTask.content || ''),
      deadline: fieldName === 'deadline' ? value : selectedTask.deadline,
      priority: fieldName === 'priority' ? value : (selectedTask.priority || 'none'),
      category_id: fieldName === 'category_id' ? value : selectedTask.category_id,
      status: fieldName === 'status' ? value : (selectedTask.status || 'pending')
    };

    try {
      // 呼叫真實後端 API 進行更新
      await taskApi.updateTask(selectedTask.id, updatedFields);
      
      // 同步更新前端全域 Context 的狀態
      dispatch({
        type: 'UPDATE_TASK',
        payload: {
          id: selectedTask.id,
          ...updatedFields
        }
      });
      showSuccess('任務已自動更新');
    } catch (error) {
      console.error(`Failed to update task ${fieldName}:`, error);
      showError('自動儲存失敗，請檢查網路連線');
    }
  };

  // 5. 處理切換完成狀態
  const handleToggleComplete = () => {
    const newStatus = (selectedTask.status === 'completed' || selectedTask.completed) ? 'pending' : 'completed';
    updateTaskField('status', newStatus);
  };

  // 6. 處理刪除任務
  const handleDeleteTask = async () => {
    if (confirm('確定要刪除此任務嗎？')) {
      try {
        await taskApi.deleteTask(selectedTask.id);
        dispatch({ type: 'DELETE_TASK', payload: selectedTask.id });
        showSuccess('任務已刪除');
      } catch (error) {
        showError('刪除任務失敗');
      }
    }
  };

  const isCompleted = selectedTask.status === 'completed' || selectedTask.completed;

  return (
    <div className="w-96 border-l border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 h-full flex flex-col">
      
      {/* 1. 頂部工具列區塊 */}
      <div className="h-14 border-b border-gray-200 dark:border-zinc-800 px-6 flex items-center justify-between flex-shrink-0 text-gray-500 dark:text-zinc-400">
        <button 
          onClick={handleToggleComplete}
          className={`flex items-center space-x-1.5 text-xs font-medium px-2 py-1 rounded transition-colors ${
            isCompleted 
              ? 'bg-green-50 text-green-600 dark:bg-green-900/10 dark:text-green-400' 
              : 'hover:bg-gray-100 dark:hover:bg-zinc-800 hover:text-gray-700'
          }`}
        >
          <div className={`h-4 w-4 rounded border flex items-center justify-center ${
            isCompleted ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 dark:border-zinc-600'
          }`}>
            {isCompleted && <CheckIcon className="h-2.5 w-2.5 stroke-[3]" />}
          </div>
          <span>{isCompleted ? '已完成' : '標記完成'}</span>
        </button>

        <div className="flex items-center space-x-4">
          <div className="w-px h-4 bg-gray-200 dark:bg-zinc-800"></div>
          <button 
            onClick={handleDeleteTask}
            className="hover:text-red-500 dark:hover:text-red-400 transition-colors"
            title="刪除任務"
          >
            <TrashIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* 2. 下方主要內容滾動面板 */}
      <div className="flex-1 px-6 py-6 flex flex-col space-y-5 overflow-y-auto">
        
        {/* 大標題 Inline 輸入區 */}
        <div className="w-full">
          <input
            type="text"
            value={taskName}
            onChange={(e) => setTaskName(e.target.value)}
            onBlur={() => updateTaskField('task_name', taskName.trim())}
            onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
            placeholder="任務名稱"
            className={`w-full bg-transparent text-xl font-bold focus:outline-none border-b border-transparent focus:border-gray-100 dark:focus:border-zinc-800 pb-1 transition-colors text-black dark:text-white ${
              isCompleted ? 'line-through text-gray-400 dark:text-zinc-500 decoration-gray-400' : ''
            }`}
          />
        </div>

        {/* 屬性設定網格區 (分類、截止日期、優先級) */}
        <div className="space-y-3 bg-gray-50/50 dark:bg-zinc-800/20 p-3 rounded-lg border border-gray-100 dark:border-zinc-800/50">
          
          {/* 分類資料夾選擇 */}
          <div className="flex items-center text-sm">
            <span className="w-20 text-gray-400 dark:text-zinc-500">分類</span>
            <select
              name="category_id"
              value={selectedTask.category_id || ''} 
              onChange={(e) => updateTaskField('category_id', e.target.value)} 
              className="p-1 text-xs border border-transparent hover:border-gray-200 dark:hover:border-zinc-700 rounded bg-transparent dark:bg-transparent text-gray-700 dark:text-zinc-300 focus:outline-none focus:bg-white dark:focus:bg-zinc-800"
            >
              <option value="">未分類 (Inbox)</option>
              {Array.isArray(categories) && categories.map(category => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
          </div>

          {/* 截止日期選擇 */}
          <div className="flex items-center text-sm">
            <span className="w-20 text-gray-400 dark:text-zinc-500">截止日期</span>
            <div className="flex items-center text-gray-700 dark:text-zinc-300 group relative">
              <CalendarIcon className="h-4 w-4 mr-1.5 text-gray-400" />
              <input
                type="date"
                value={selectedTask.deadline ? selectedTask.deadline.split('T')[0] : ''}
                onChange={(e) => updateTaskField('deadline', e.target.value || null)}
                className="bg-transparent text-xs text-gray-700 dark:text-zinc-300 focus:outline-none border border-transparent rounded p-0.5 hover:border-gray-200 dark:hover:border-zinc-700"
              />
            </div>
          </div>

          {/* 優先級選擇 */}
          <div className="flex items-center text-sm">
            <span className="w-20 text-gray-400 dark:text-zinc-500">優先級</span>
            <select
              value={selectedTask.priority || 'none'}
              onChange={(e) => updateTaskField('priority', e.target.value)}
              className={`p-1 text-xs border border-transparent rounded bg-transparent dark:bg-transparent focus:outline-none font-medium ${
                selectedTask.priority === 'high' 
                  ? 'text-red-600 dark:text-red-400' 
                  : selectedTask.priority === 'medium' 
                    ? 'text-yellow-600 dark:text-yellow-400' 
                    : selectedTask.priority === 'low' 
                      ? 'text-blue-600 dark:text-blue-400' 
                      : 'text-gray-500 dark:text-zinc-400'
              }`}
            >
              <option value="none">無優先級</option>
              <option value="low">低優先級 (Low)</option>
              <option value="medium">中優先級 (Medium)</option>
              <option value="high">高優先級 (High)</option>
            </select>
          </div>
        </div>

        {/* 3. TipTap 豐富文字編輯器區域 */}
        <div className="flex-1 flex flex-col min-h-[200px]">
          <div className="text-xs font-semibold text-gray-400 dark:text-zinc-500 uppercase tracking-wider mb-2">
            備註內容
          </div>
          <div className="flex-1 border border-gray-100 dark:border-zinc-800 rounded-lg p-4 bg-gray-50/30 dark:bg-zinc-800/10 overflow-y-auto">
            <EditorContent editor={editor} />
          </div>
        </div>

      </div>
    </div>
  );
}