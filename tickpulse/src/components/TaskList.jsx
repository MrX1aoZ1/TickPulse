'use client';

import { useState } from 'react';
import { useTasks, taskApi } from '@/context/TaskContext';
import { useToast } from '@/context/ToastContext';
import {
  PlusIcon,
  TrashIcon,
  NoSymbolIcon,
  ArrowUturnLeftIcon,
  PencilIcon,
  Bars3Icon // 🎯 漢堡選單圖標，作為 Draggable 的拖曳把手
} from '@heroicons/react/24/outline';
// 🎯 引入與 CategoryList 相同的拖曳組件
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

export default function TaskList() {
  const {
    tasks = [],
    categories = [],
    dispatch,
    selectedView,
    selectedCategoryId,
    activeFilter,
    selectedTaskId
  } = useTasks();
  const { showSuccess, showError } = useToast();

  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditingHeader, setIsEditingHeader] = useState(false);
  const [editHeaderName, setEditHeaderName] = useState('');

  // 輔助函式：日期格式化
  const formatToLocalDateStr = (dateInput) => {
    if (!dateInput) return null;
    if (typeof dateInput === 'string' && dateInput.length === 10) return dateInput;
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return null;
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  // 動態計算目前 View 的頂端標題
  const currentCategory = categories.find(cat => cat.id === selectedCategoryId);
  let headerTitle = '';
  let isEditable = false;

  if (selectedView === 'category' && currentCategory) {
    headerTitle = currentCategory.name || 'Untitled List';
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

  // 處理標題重新命名
  const handleSaveHeaderRename = async () => {
    const trimmed = editHeaderName.trim();
    if (!trimmed || trimmed === currentCategory?.name) {
      setIsEditingHeader(false);
      return;
    }
    try {
      await taskApi.updateCategory(selectedCategoryId, trimmed);
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
      return task.category_id === selectedCategoryId && task.status !== 'deleted' && task.status !== 'cancelled';
    }
    if (selectedView === 'filter') {
      switch (activeFilter) {
        case 'all': return task.status !== 'deleted' && task.status !== 'cancelled' && task.status !== 'completed';
        case 'today': return taskDateStr === formatToLocalDateStr(new Date()) && task.status !== 'deleted' && task.status !== 'cancelled';
        case 'next7': {
          if (!taskDateStr || task.status === 'deleted' || task.status === 'cancelled') return false;
          const today = new Date(); today.setHours(0, 0, 0, 0);
          const sevenDaysLater = new Date(); sevenDaysLater.setDate(today.getDate() + 7);
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

  // 🎯 @hello-pangea/dnd 拖曳結束後的處理函式
  const onDragEnd = async (result) => {
    const { destination, source } = result;
    // 如果沒有放進有效的 Droppable 區域，或者放回原位，直接不處理
    if (!destination || destination.index === source.index) return;

    // 1. 複製目前的過濾任務清單，調換順序
    const reorderedFiltered = [...filteredTasks];
    const [removed] = reorderedFiltered.splice(source.index, 1);
    reorderedFiltered.splice(destination.index, 0, removed);

    // 2. 對齊並覆寫回全域的總 tasks 陣列中 (確保其他分類的資料不被影響)
    const updatedAllTasks = [...tasks];
    const globalIndices = filteredTasks.map(ft => 
      tasks.findIndex(t => (t.id || t.taskId) === (ft.id || ft.taskId))
    );

    globalIndices.forEach((globalIdx, i) => {
      if (globalIdx !== -1) {
        updatedAllTasks[globalIdx] = reorderedFiltered[i];
      }
    });

    // 3. 更新前端全域 Context 狀態
    dispatch({ type: 'SET_TASKS', payload: updatedAllTasks });

    try {
      // 4. 後端同步 (可選：留著未來接 API 排序時使用)
      console.log("New task order via dnd:", reorderedFiltered.map(t => t.task_name));
    } catch (error) {
      showError('Failed to save task order');
    }
  };

  const handleAddTask = async (e) => {
    e.preventDefault();
    const title = newTaskTitle.trim();
    if (!title || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const targetCategoryId = selectedView === 'category' ? selectedCategoryId : null;
      const taskData = { task_name: title, category_id: targetCategoryId };
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
      showError(error.message || 'Failed to add task');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (task, newStatus) => {
    const targetId = task.id || task.taskId;
    if (!targetId) { showError('Task ID missing'); return; }
    try {
      await taskApi.updateTask(targetId, { status: newStatus });
      dispatch({ type: 'UPDATE_TASK', payload: { id: targetId, updates: { status: newStatus } } });
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
    <div className="flex-1 flex flex-col h-full bg-zinc-950 text-zinc-200 min-w-0 select-none">
      {/* 動態標題 */}
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
            onClick={() => { if (isEditable) { setIsEditingHeader(true); setEditHeaderName(headerTitle); } }}
          >
            <h1 className="text-xl font-semibold tracking-tight text-zinc-100">{headerTitle}</h1>
            {isEditable && <PencilIcon className="w-4 h-4 text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity duration-150" />}
          </div>
        )}
      </div>

      {/* 📥 頂部新增 */}
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

      {/* 🎯 封裝 DragDropContext */}
      <DragDropContext onDragEnd={onDragEnd}>
        {/* 📜 任務列表主滾動區 */}
        <Droppable droppableId="task-list-droppable">
          {(provided) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className="flex-1 overflow-y-auto px-6 py-2 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent"
            >
              {filteredTasks.length === 0 ? (
                <div className="h-48 flex flex-col items-center justify-center text-zinc-600 text-sm">
                  <p className="font-medium">No tasks here.</p>
                  <p className="text-xs text-zinc-700 mt-1">Enjoy your clear day!</p>
                </div>
              ) : (
                filteredTasks.map((task, index) => {
                  const isDone = task.status === 'completed';
                  const isTrash = task.status === 'cancelled' || task.status === 'deleted';
                  const isSelected = selectedTaskId && String(task.id || task.taskId) === String(selectedTaskId);
                  const stringId = String(task.id || task.taskId);

                  return (
                    <Draggable key={stringId} draggableId={stringId} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          onClick={() => {
                            const targetId = task.id || task.taskId;
                            dispatch({ type: 'SELECT_TASK', payload: targetId });
                          }}
                          // 🎯 整合 @hello-pangea/dnd 的動態拖曳快照狀態 (snapshot.isDragging)
                          className={`group flex items-center justify-between py-2.5 px-3 mb-1 rounded-lg border cursor-pointer transition-all duration-150 ${
                            snapshot.isDragging 
                              ? 'bg-zinc-900 border-blue-500/50 shadow-2xl scale-[1.02]' 
                              : isSelected 
                                ? 'bg-zinc-900 border-zinc-800/80 text-white' 
                                : 'bg-transparent border-transparent hover:bg-zinc-900/40 hover:border-zinc-900/60'
                          }`}
                        >
                          <div className="flex items-center space-x-3 min-w-0 flex-1">
                            
                            {/* 🎯 把手（Drag Handle）：只有這裡可以抓取拖曳，點擊其他地方依然是選取 Task */}
                            <div
                              className="cursor-grab active:cursor-grabbing text-zinc-600 hover:text-zinc-400 p-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-100 flex-shrink-0"
                            >
                              <Bars3Icon className="w-4 h-4" />
                            </div>

                            {!isTrash ? (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleUpdateStatus(task, isDone ? 'pending' : 'completed'); }}
                                className={`w-4 h-4 rounded border flex-shrink-0 transition-colors flex items-center justify-center ${getPriorityClass(task.priority)}`}
                              >
                                {task.status === 'completed' && <span className="w-1.5 h-1.5 bg-zinc-400 rounded-sm" />}
                              </button>
                            ) : (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleUpdateStatus(task, 'pending'); }}
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
                                <span className="text-[10px] text-zinc-500 font-mono mt-0.5">📅 {formatToLocalDateStr(task.deadline)}</span>
                              )}
                            </div>
                          </div>

                          {/* 右側操作按鈕 */}
                          <div className="opacity-0 group-hover:opacity-100 flex items-center space-x-1.5 ml-4 flex-shrink-0 transition-opacity duration-100">
                            {!isTrash ? (
                              <>
                                {task.status !== 'completed' && task.status !== 'cancelled' && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleUpdateStatus(task, 'cancelled'); }}
                                    className="p-1 text-zinc-500 hover:text-orange-400 rounded hover:bg-zinc-800 transition-colors"
                                    title="Won't Do"
                                  >
                                    <NoSymbolIcon className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleUpdateStatus(task, 'deleted'); }}
                                  className="p-1 text-zinc-500 hover:text-red-400 rounded hover:bg-zinc-800 transition-colors"
                                  title="Move to Trash"
                                >
                                  <TrashIcon className="w-3.5 h-3.5" />
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
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
                      )}
                    </Draggable>
                  );
                })
              )}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
}