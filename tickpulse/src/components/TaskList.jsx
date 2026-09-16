'use client';

import { useEffect, useState } from 'react';
import { useTasks, taskApi } from '@/context/TaskContext';
import { useToast } from '@/context/ToastContext';
import { taskKey } from '@/lib/taskListReorder';
import { PlusIcon, PencilIcon } from '@heroicons/react/24/outline';
import TaskVirtualList from './TaskVirtualList';
import { formatToLocalDateStr } from './TaskRow';

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
  const [selectedIds, setSelectedIds] = useState([]);

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

  useEffect(() => {
    setSelectedIds([]);
  }, [selectedView, selectedCategoryId, activeFilter]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setSelectedIds([]);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const handleSelectTask = (e, task, index) => {
    const id = taskKey(task);
    if (e.shiftKey) {
      let anchor = selectedTaskId
        ? filteredTasks.findIndex((t) => taskKey(t) === String(selectedTaskId))
        : -1;
      if (anchor === -1 && selectedIds.length > 0) {
        anchor = filteredTasks.findIndex((t) => taskKey(t) === selectedIds[selectedIds.length - 1]);
      }
      if (anchor === -1) anchor = index;
      const from = Math.min(anchor, index);
      const to = Math.max(anchor, index);
      setSelectedIds(filteredTasks.slice(from, to + 1).map(taskKey));
      dispatch({ type: 'SELECT_TASK', payload: id });
      return;
    }
    if (e.metaKey || e.ctrlKey) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        return [...next];
      });
      dispatch({ type: 'SELECT_TASK', payload: id });
      return;
    }
    setSelectedIds([id]);
    dispatch({ type: 'SELECT_TASK', payload: id });
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

  const handlePermanentDelete = async (task) => {
    const targetId = task.id || task.taskId;
    if (!confirm('Permanently delete this task?')) return;
    try {
      await taskApi.deleteTask(targetId);
      dispatch({ type: 'DELETE_TASK', payload: targetId });
      showSuccess('Permanently deleted');
    } catch (error) {
      showError('Failed to delete');
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-white dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200 min-w-0 select-none">
      <div className="px-6 pt-6 pb-2 flex items-center justify-between border-b border-zinc-200 dark:border-zinc-900/40">
        {isEditingHeader ? (
          <input
            type="text"
            value={editHeaderName}
            onChange={(e) => setEditHeaderName(e.target.value)}
            onBlur={handleSaveHeaderRename}
            onKeyDown={(e) => e.key === 'Enter' && handleSaveHeaderRename()}
            className="text-xl font-semibold bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-white border border-zinc-300 dark:border-zinc-700 rounded px-2 py-0.5 focus:outline-none focus:border-blue-500"
            autoFocus
          />
        ) : (
          <div
            className={`flex items-center space-x-2 group ${isEditable ? 'cursor-pointer' : ''}`}
            onClick={() => { if (isEditable) { setIsEditingHeader(true); setEditHeaderName(headerTitle); } }}
          >
            <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              {headerTitle}
              {selectedIds.length > 1 ? (
                <span className="ml-2 text-xs font-normal text-zinc-500 tracking-normal">
                  {selectedIds.length} selected
                </span>
              ) : null}
            </h1>
            {isEditable && <PencilIcon className="w-4 h-4 text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity duration-150" />}
          </div>
        )}
      </div>

      {selectedView !== 'filter' || (activeFilter !== 'completed' && activeFilter !== 'cancelled' && activeFilter !== 'deleted') ? (
        <form onSubmit={handleAddTask} className="px-6 pt-4 pb-2">
          <div className="flex items-center space-x-3 bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800/80 rounded-lg px-3 py-2 focus-within:border-zinc-400 dark:focus-within:border-zinc-700 transition-all">
            <PlusIcon className="w-4 h-4 text-zinc-500 flex-shrink-0" />
            <input
              type="text"
              placeholder="Add a task to this list... (Press Enter)"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              disabled={isSubmitting}
              className="w-full bg-transparent border-none outline-none text-sm placeholder-zinc-400 dark:placeholder-zinc-600 text-zinc-800 dark:text-zinc-200"
            />
          </div>
        </form>
      ) : null}

      <TaskVirtualList
        filteredTasks={filteredTasks}
        selectedIds={selectedIds}
        selectedTaskId={selectedTaskId}
        scrollResetKey={`${selectedView}:${selectedCategoryId}:${activeFilter}`}
        onSelectTask={handleSelectTask}
        onUpdateStatus={handleUpdateStatus}
        onPermanentDelete={handlePermanentDelete}
      />
    </div>
  );
}
