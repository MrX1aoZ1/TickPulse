'use client';

import { useState, useEffect, useRef } from 'react';
import { useTasks, taskApi } from '@/context/TaskContext';
import { useToast } from '@/context/ToastContext';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';

import { 
  CheckIcon, 
  XMarkIcon,        
  ArrowUturnLeftIcon, 
  CalendarIcon, 
  TrashIcon,
  FolderIcon,        
  ChatBubbleLeftIcon, 
  EllipsisHorizontalIcon,
  Bars4Icon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  BellIcon,
  ArrowPathIcon,
  ChevronRightIcon as ChevronRightIconSmall
} from '@heroicons/react/24/outline';

import { FlagIcon as FlagIconSolid } from '@heroicons/react/24/solid';

export default function TaskDetail() {
  const { tasks = [], dispatch, selectedTaskId, categories = [] } = useTasks();
  const { showSuccess, showError } = useToast();
  
  const selectedTask = Array.isArray(tasks) 
    ? tasks.find(t => t && String(t.id) === String(selectedTaskId)) 
    : null;
  
  const [taskName, setTaskName] = useState('');
  
  // 🎯 控制直接跳轉的渲染防閃爍鎖定狀態（不帶動畫）
  const [isReady, setIsReady] = useState(false);

  // 萬年曆狀態
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth()); 
  const datePickerRef = useRef(null);

  // 1. 初始化 TipTap 編輯器
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: '添加描述或筆記...' }),
    ],
    content: selectedTask?.content || '', 
    editorProps: {
      attributes: {
        class: 'prose prose-sm prose-invert focus:outline-none max-w-none min-h-[300px] text-base text-zinc-200 leading-relaxed',
      },
    },
    onBlur: ({ editor }) => {
      if (!selectedTask) return;
      const htmlContent = editor.getHTML();
      const sanitizedContent = htmlContent === '<p></p>' ? '' : htmlContent;
      if ((selectedTask.content || '') !== sanitizedContent) {
        updateTaskField('content', sanitizedContent);
      }
    }
  }, [selectedTaskId]); 

  // 2. 當選中的任務切換時，執行瞬間防殘影跳轉
  useEffect(() => {
    if (selectedTask) {
      setTaskName(selectedTask.task_name || '');
      
      // 🎯 瞬間切換核心：先將 Ready 狀態關閉（隱藏內容，但保留佈局骨架避免抖動）
      setIsReady(false);
      
      // 50ms 後，此時 TipTap 已完成非同步數據吞吐，直接顯示，無任何漸變動畫
      const timer = setTimeout(() => {
        setIsReady(true);
      }, 50); 

      // 同步月曆定位
      if (selectedTask.deadline) {
        const d = new Date(selectedTask.deadline);
        if (!isNaN(d.getTime())) {
          setCurrentYear(d.getFullYear());
          setCurrentMonth(d.getMonth());
        }
      }

      return () => clearTimeout(timer);
    }
  }, [selectedTaskId, selectedTask]);

  // 點擊外面關閉日曆
  useEffect(() => {
    function handleClickOutside(event) {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target)) {
        setIsDatePickerOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!selectedTask) {
    return (
      <div className="w-full border-l border-zinc-200 dark:border-zinc-900 bg-white dark:bg-zinc-950 h-full flex items-center justify-center text-zinc-500 dark:text-zinc-600 text-sm flex-shrink-0 select-none">
        請選取任務以查看詳細資訊
      </div>
    );
  }

  const updateTaskField = async (fieldName, value) => {
    if (!selectedTask) return;
    if ((selectedTask[fieldName] || '') === (value || '')) return;

    const updatedFields = {
      task_name: fieldName === 'task_name' ? value : (selectedTask.task_name || ''),
      content: fieldName === 'content' ? value : (selectedTask.content || ''),
      deadline: fieldName === 'deadline' ? (value || null) : selectedTask.deadline,
      priority: fieldName === 'priority' ? value : (selectedTask.priority || 'none'),
      category_id: fieldName === 'category_id' ? (value || null) : selectedTask.category_id,
      status: fieldName === 'status' ? value : (selectedTask.status || 'pending')
    };

    try {
      await taskApi.updateTask(selectedTask.id, updatedFields);
      dispatch({
        type: 'UPDATE_TASK',
        payload: { id: selectedTask.id, ...updatedFields }
      });
    } catch (error) {
      showError('自動儲存失敗');
    }
  };

  const isDeleted = selectedTask.status === 'deleted';
  const isCancelled = selectedTask.status === 'cancelled';
  const isCompleted = selectedTask.status === 'completed';

  const handleStatusAction = () => {
    if (isDeleted || isCancelled) {
      updateTaskField('status', 'pending');
    } else {
      updateTaskField('status', isCompleted ? 'pending' : 'completed');
    }
  };

  const handleDeleteTask = async () => {
    if (isDeleted) {
      if (confirm('確定要永久刪除此任務嗎？此操作無法復原。')) {
        try {
          await taskApi.deleteTask(selectedTask.id);
          dispatch({ type: 'DELETE_TASK', payload: selectedTask.id });
          showSuccess('任務已永久刪除');
        } catch (error) {
          showError('永久刪除失敗');
        }
      }
    } else {
      updateTaskField('status', 'deleted');
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'text-red-500';
      case 'medium': return 'text-amber-500';
      case 'low': return 'text-blue-500';
      default: return 'text-zinc-600 hover:text-zinc-400';
    }
  };

  // --- 萬年曆矩陣演算法 ---
  const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  const generateCalendarDays = () => {
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
    const totalDaysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const totalDaysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

    const days = [];

    // 1. 上個月尾巴
    let prevYear = currentYear;
    let prevMonth = currentMonth - 1;
    if (prevMonth < 0) { prevMonth = 11; prevYear -= 1; }
    
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = totalDaysInPrevMonth - i;
      days.push({
        day: d,
        monthOffset: -1,
        dateStr: `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      });
    }

    // 2. 當月
    for (let i = 1; i <= totalDaysInMonth; i++) {
      days.push({
        day: i,
        monthOffset: 0,
        dateStr: `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`
      });
    }

    // 3. 下個月開頭
    let nextYear = currentYear;
    let nextMonth = currentMonth + 1;
    if (nextMonth > 11) { nextMonth = 0; nextYear += 1; }

    const remainingCells = 42 - days.length;
    for (let i = 1; i <= remainingCells; i++) {
      days.push({
        day: i,
        monthOffset: 1,
        dateStr: `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`
      });
    }

    return days;
  };

  const handlePrevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(currentYear - 1); } 
    else { setCurrentMonth(currentMonth - 1); }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(currentYear + 1); } 
    else { setCurrentMonth(currentMonth + 1); }
  };

  const getTodayStr = () => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  };

  const calendarDays = generateCalendarDays();
  const formattedTaskDeadline = selectedTask.deadline ? selectedTask.deadline.split('T')[0] : null;
  const todayStr = getTodayStr();

  return (
    <div key={selectedTaskId} className="w-full border-l border-zinc-200 dark:border-zinc-900 bg-white dark:bg-zinc-950 h-full flex flex-col justify-between select-none relative">
      
      {/* 1. 頂部 Meta 欄位 */}
      <div className="h-12 px-6 flex items-center justify-between border-b border-zinc-200 dark:border-b-zinc-900/60 bg-white dark:bg-zinc-950 flex-shrink-0 relative">
        <div className="flex items-center space-x-3">
          {isDeleted ? (
            <button onClick={handleStatusAction} className="p-1 hover:bg-zinc-900 rounded text-zinc-400">
              <ArrowUturnLeftIcon className="h-4 w-4" />
            </button>
          ) : (
            <button 
              onClick={handleStatusAction}
              className={`h-4 w-4 rounded border transition-colors flex items-center justify-center ${
                isCompleted ? 'bg-zinc-700 border-zinc-600 text-zinc-400' : isCancelled ? 'bg-orange-950 border-orange-800 text-orange-400' : 'border-zinc-700 hover:border-zinc-500'
              }`}
            >
              {isCompleted && <CheckIcon className="h-2.5 w-2.5 stroke-[3]" />}
              {isCancelled && <XMarkIcon className="h-2.5 w-2.5 stroke-[3]" />}
            </button>
          )}
          <div className="h-3 w-px bg-zinc-900" />
          
          {/* 日曆 */}
          <div className="relative" ref={datePickerRef}>
            <div 
              onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
              className="flex items-center text-zinc-400 hover:text-zinc-300 transition-colors cursor-pointer"
            >
              <CalendarIcon className="h-4 w-4 mr-1.5 text-red-500/80" />
              <span className="text-xs font-medium mr-1 text-red-400/90">
                {formattedTaskDeadline ? formattedTaskDeadline : '設置日期'}
              </span>
            </div>

            {/* 月曆面板 */}
            {isDatePickerOpen && (
              <div className="absolute left-0 top-7 z-50 w-72 bg-[#1e1e1e] border border-zinc-800 rounded-xl shadow-2xl p-4 flex flex-col text-zinc-200">
                <div className="grid grid-cols-2 bg-[#2a2a2a] p-0.5 rounded-lg mb-4 text-xs font-medium text-center">
                  <div className="bg-[#3e3e3e] py-1.5 rounded-md text-white shadow-sm cursor-pointer">Date</div>
                  <div className="py-1.5 text-zinc-600 cursor-not-allowed">Duration</div>
                </div>

                <div className="flex justify-between items-center px-2 mb-4 text-zinc-400">
                  <button onClick={() => { updateTaskField('deadline', todayStr); setIsDatePickerOpen(false); }} className="p-1 hover:bg-zinc-800 rounded-lg transition-colors">☀️</button>
                  <button onClick={() => {
                    const tomo = new Date(); tomo.setDate(tomo.getDate() + 1);
                    updateTaskField('deadline', `${tomo.getFullYear()}-${String(tomo.getMonth() + 1).padStart(2, '0')}-${String(tomo.getDate()).padStart(2, '0')}`);
                    setIsDatePickerOpen(false);
                  }} className="p-1 hover:bg-zinc-800 rounded-lg transition-colors">🌅</button>
                  <button onClick={() => {
                    const nextWeek = new Date(); nextWeek.setDate(nextWeek.getDate() + 7);
                    updateTaskField('deadline', `${nextWeek.getFullYear()}-${String(nextWeek.getMonth() + 1).padStart(2, '0')}-${String(nextWeek.getDate()).padStart(2, '0')}`);
                    setIsDatePickerOpen(false);
                  }} className="p-1 hover:bg-zinc-800 rounded-lg transition-colors">🗓️</button>
                  <button className="p-1 text-zinc-600 cursor-not-allowed">🌙</button>
                </div>

                <div className="flex justify-between items-center px-1 mb-2">
                  <span className="text-sm font-semibold">{monthNames[currentMonth]} {currentYear}</span>
                  <div className="flex items-center space-x-2 text-zinc-400">
                    <ChevronLeftIcon onClick={handlePrevMonth} className="h-3.5 w-3.5 cursor-pointer hover:text-zinc-200 p-0.5" />
                    <div onClick={() => {
                      const today = new Date(); setCurrentYear(today.getFullYear()); setCurrentMonth(today.getMonth());
                    }} className="h-1.5 w-1.5 rounded-full border border-zinc-400 cursor-pointer hover:bg-zinc-200" />
                    <ChevronRightIcon onClick={handleNextMonth} className="h-3.5 w-3.5 cursor-pointer hover:text-zinc-200 p-0.5" />
                  </div>
                </div>

                <div className="grid grid-cols-7 text-center text-[11px] text-zinc-500 font-medium mb-1">
                  {weekDays.map((day, idx) => <div key={idx}>{day}</div>)}
                </div>

                <div className="grid grid-cols-7 text-center text-xs font-normal gap-y-1 mb-4">
                  {calendarDays.map((item, idx) => {
                    const isSelected = formattedTaskDeadline === item.dateStr; 
                    const isToday = todayStr === item.dateStr;
                    const isCurrentMonth = item.monthOffset === 0;

                    return (
                      <div 
                        key={idx} 
                        onClick={() => {
                          updateTaskField('deadline', item.dateStr);
                          setIsDatePickerOpen(false);
                        }}
                        className={`h-7 w-7 flex items-center justify-center rounded-full mx-auto cursor-pointer transition-all ${
                          isSelected 
                            ? 'bg-blue-600 text-white font-semibold shadow-md shadow-blue-900/40' 
                            : isToday
                              ? 'border border-blue-500/60 text-blue-400 font-medium'
                              : isCurrentMonth 
                                ? 'text-zinc-200 hover:bg-zinc-800' 
                                : 'text-zinc-700 hover:text-zinc-500 hover:bg-zinc-800/30'
                        }`}
                      >
                        {item.day}
                      </div>
                    );
                  })}
                </div>

                <div className="border-t border-zinc-800/80 pt-2 space-y-1 text-xs">
                  <div className="flex justify-between items-center py-2 px-1 hover:bg-zinc-800/40 rounded-lg cursor-pointer text-zinc-400 group">
                    <div className="flex items-center space-x-2.5">
                      <ClockIcon className="h-4 w-4 text-zinc-500" />
                      <span>Time</span>
                    </div>
                    <ChevronRightIconSmall className="h-3 w-3 text-zinc-600 group-hover:text-zinc-400" />
                  </div>
                  <div className="flex justify-between items-center py-2 px-1 hover:bg-zinc-800/40 rounded-lg cursor-pointer text-zinc-400 group">
                    <div className="flex items-center space-x-2.5">
                      <BellIcon className="h-4 w-4 text-zinc-500" />
                      <span>Reminder</span>
                    </div>
                    <ChevronRightIconSmall className="h-3 w-3 text-zinc-600 group-hover:text-zinc-400" />
                  </div>
                  <div className="flex justify-between items-center py-2 px-1 hover:bg-zinc-800/40 rounded-lg cursor-pointer text-zinc-400 group">
                    <div className="flex items-center space-x-2.5">
                      <ArrowPathIcon className="h-4 w-4 text-zinc-500" />
                      <span>Repeat</span>
                    </div>
                    <ChevronRightIconSmall className="h-3 w-3 text-zinc-600 group-hover:text-zinc-400" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-4 text-xs font-medium">
                  <button 
                    onClick={() => { updateTaskField('deadline', null); setIsDatePickerOpen(false); }}
                    className="py-2 border border-zinc-800 rounded-lg bg-[#242424] text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors text-center"
                  >
                    Clear
                  </button>
                  <button onClick={() => setIsDatePickerOpen(false)} className="py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition-colors text-center shadow-md">
                    OK
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 旗標 */}
        <div className="relative flex items-center justify-center h-7 w-7 rounded hover:bg-zinc-900 transition-colors cursor-pointer group">
          <FlagIconSolid className={`h-4 w-4 transition-colors ${getPriorityColor(selectedTask.priority)}`} />
          <select
            value={selectedTask.priority || 'none'}
            onChange={(e) => updateTaskField('priority', e.target.value)}
            className="absolute inset-0 opacity-0 w-full h-full cursor-pointer [color-scheme:dark]"
          >
            <option value="none" className="bg-zinc-950 text-zinc-400">none</option>
            <option value="low" className="bg-zinc-950 text-blue-400">low</option>
            <option value="medium" className="bg-zinc-950 text-amber-500">medium</option>
            <option value="high" className="bg-zinc-950 text-red-500">high</option>
          </select>
        </div>
      </div>

      {/* 2. 中間主要內容區 */}
      {/* 🎯 移除所有 transition 動畫類別，改用無過渡的 opacity 直接控制顯示與隱藏 */}
      <div className={`flex-1 px-8 py-4 overflow-y-auto space-y-4 ${
        isReady ? 'opacity-100' : 'opacity-0'
      }`}>
        <div className="flex items-center justify-between group">
          <input
            type="text"
            value={taskName}
            onChange={(e) => setTaskName(e.target.value)}
            onBlur={() => updateTaskField('task_name', taskName.trim())}
            onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
            placeholder="任務名稱"
            className={`w-full bg-transparent text-xl font-bold focus:outline-none text-zinc-900 dark:text-white tracking-tight ${
              (isCompleted || isCancelled) ? 'line-through text-zinc-600 decoration-zinc-600' : ''
            }`}
          />
          <Bars4Icon className="h-4 w-4 text-zinc-600 group-hover:text-zinc-400 transition-colors cursor-pointer flex-shrink-0" />
        </div>
        
        <div className="pt-2">
          <EditorContent editor={editor} />
        </div>
      </div>

      {/* 3. 底部工具列 */}
      <div className="h-11 px-4 border-t border-zinc-200 dark:border-zinc-900/60 bg-white dark:bg-zinc-950 flex items-center justify-between flex-shrink-0 text-zinc-500">
        <div className="flex items-center space-x-1 text-xs hover:text-zinc-300 transition-colors max-w-[200px] truncate">
          <FolderIcon className="h-3.5 w-3.5 text-zinc-500 flex-shrink-0" />
          <select
            name="category_id"
            value={selectedTask.category_id || ''} 
            onChange={(e) => updateTaskField('category_id', e.target.value)} 
            className="bg-transparent font-medium focus:outline-none cursor-pointer text-zinc-400 text-xs py-1 pr-1 truncate"
          >
            <option value="" className="bg-zinc-950 text-zinc-400">未分類 (Inbox)</option>
            {Array.isArray(categories) && categories.map(category => (
              <option key={category.id} value={category.id} className="bg-zinc-950 text-zinc-300">
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center space-x-3.5 pr-2">
          <button className="hover:text-zinc-300 transition-colors"><span className="text-sm font-serif font-bold tracking-tight">A</span></button>
          <button className="hover:text-zinc-300 transition-colors"><ChatBubbleLeftIcon className="h-4 w-4" /></button>
          <button onClick={handleDeleteTask} className="hover:text-red-400 transition-colors"><TrashIcon className="h-4 w-4" /></button>
          <button className="hover:text-zinc-300 transition-colors"><EllipsisHorizontalIcon className="h-4 w-4" /></button>
        </div>
      </div>

    </div>
  );
}