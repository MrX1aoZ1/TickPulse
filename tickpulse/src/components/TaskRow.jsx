'use client';

import { useSortable } from '@dnd-kit/sortable';
import {
  ArrowUturnLeftIcon,
  Bars3Icon,
  CheckCircleIcon,
  NoSymbolIcon,
  TrashIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import { taskKey } from '@/lib/taskListReorder';

export function formatToLocalDateStr(dateInput) {
  if (!dateInput) return null;
  if (typeof dateInput === 'string' && dateInput.length === 10) return dateInput;
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getPriorityClass(priority) {
  switch (priority) {
    case 'high': return 'border-red-500 hover:bg-red-500/10';
    case 'medium': return 'border-orange-400 hover:bg-orange-400/10';
    case 'low': return 'border-blue-400 hover:bg-blue-400/10';
    default: return 'border-zinc-600 hover:bg-zinc-500/10';
  }
}

export default function TaskRow({
  task,
  isSelected,
  isDragging = false,
  isOverlay = false,
  overlayCount = 0,
  enableDrag = true,
  dragHandle,
  onSelect,
  onUpdateStatus,
  onPermanentDelete,
}) {
  const isDone = task.status === 'completed';
  const isCancelled = task.status === 'cancelled';
  const isDeleted = task.status === 'deleted';
  const isTrash = isCancelled || isDeleted;
  const rowDragHandle = enableDrag && isSelected && !isOverlay ? dragHandle : undefined;
  const iconDragHandle = enableDrag && !isOverlay ? dragHandle : undefined;

  let statusControl;
  if (isDone) {
    statusControl = (
      <button
        onClick={(e) => { e.stopPropagation(); onUpdateStatus(task, 'pending'); }}
        className="flex-shrink-0 text-zinc-400 hover:text-zinc-300 p-0.5"
        title="Restore Task"
        aria-label="Completed"
      >
        <CheckCircleIcon className="w-4 h-4" />
      </button>
    );
  } else if (isCancelled) {
    statusControl = (
      <button
        onClick={(e) => { e.stopPropagation(); onUpdateStatus(task, 'pending'); }}
        className="flex-shrink-0 text-orange-400 hover:text-orange-300 p-0.5"
        title="Restore Task"
        aria-label="Won't Do"
      >
        <XCircleIcon className="w-4 h-4" />
      </button>
    );
  } else if (isDeleted) {
    statusControl = (
      <button
        onClick={(e) => { e.stopPropagation(); onUpdateStatus(task, 'pending'); }}
        className="text-zinc-600 hover:text-zinc-400 p-0.5 flex-shrink-0"
        title="Restore Task"
      >
        <ArrowUturnLeftIcon className="w-3.5 h-3.5" />
      </button>
    );
  } else {
    statusControl = (
      <button
        onClick={(e) => { e.stopPropagation(); onUpdateStatus(task, 'completed'); }}
        className="flex-shrink-0 p-0.5"
        aria-label="Mark complete"
        title="Mark complete"
      >
        <span className={`block mx-0.5 w-3 h-3 rounded-full border transition-colors ${getPriorityClass(task.priority)}`} />
      </button>
    );
  }

  return (
    <div
      {...rowDragHandle}
      onClick={isOverlay || isDragging ? undefined : (e) => onSelect(e, task)}
      role={isOverlay ? undefined : 'listitem'}
      aria-label={task.task_name || 'Untitled Task'}
      aria-selected={isSelected}
      className={`relative group flex items-center justify-between py-2.5 px-3 rounded-lg border transition-colors duration-150 ${
        enableDrag && (isSelected || isOverlay) ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'
      } ${
        isOverlay
          ? 'bg-zinc-100 dark:bg-zinc-900 border-blue-500/50 shadow-2xl'
          : isSelected
            ? 'bg-zinc-100 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white'
            : 'bg-transparent border-transparent hover:bg-zinc-100 dark:hover:bg-zinc-900/40 hover:border-zinc-200 dark:hover:border-zinc-900/60'
      } ${isDragging && !isOverlay ? 'opacity-0' : ''} ${isOverlay ? 'pointer-events-none' : ''}`}
    >
      <div className="flex items-center space-x-3 min-w-0 flex-1">
        {statusControl}

        <div className="flex flex-col min-w-0 flex-1">
          <span className={`text-sm truncate ${task.status === 'completed' ? 'line-through text-zinc-600' :
              task.status === 'cancelled' ? 'line-through text-zinc-600 italic' : 'text-zinc-800 dark:text-zinc-200'
            }`}>
            {task.task_name || 'Untitled Task'}
          </span>
          {task.deadline && !isDone && (
            <span className="text-[10px] text-zinc-500 font-mono mt-0.5">📅 {formatToLocalDateStr(task.deadline)}</span>
          )}
        </div>
      </div>

      <div className="flex items-center flex-shrink-0 ml-4">
        <div className="opacity-0 group-hover:opacity-100 flex items-center space-x-1.5 transition-opacity duration-100">
          {!isTrash ? (
            <>
              {task.status !== 'completed' && task.status !== 'cancelled' && (
                <button
                  onClick={(e) => { e.stopPropagation(); onUpdateStatus(task, 'cancelled'); }}
                  className="p-1 text-zinc-500 hover:text-orange-400 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
                  title="Won't Do"
                >
                  <NoSymbolIcon className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); onUpdateStatus(task, 'deleted'); }}
                className="p-1 text-zinc-500 hover:text-red-400 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
                title="Move to Trash"
              >
                <TrashIcon className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); onPermanentDelete(task); }}
              className="p-1 text-zinc-600 hover:text-red-500 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
              title="Delete Permanently"
            >
              <TrashIcon className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        {enableDrag ? (
          <div
            {...iconDragHandle}
            onClick={(e) => e.stopPropagation()}
            className={`text-zinc-600 hover:text-zinc-400 p-0.5 flex-shrink-0 ${
              isSelected || isOverlay
                ? 'opacity-100 cursor-grab active:cursor-grabbing'
                : 'cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity duration-100'
            }`}
            title="Drag to reorder"
          >
            <Bars3Icon className="w-4 h-4" />
          </div>
        ) : null}
      </div>
      {isOverlay && overlayCount > 1 ? (
        <span className="absolute -top-2 -right-2 min-w-5 h-5 px-1 rounded-full bg-blue-600 text-white text-[11px] font-semibold leading-5 text-center shadow">
          {overlayCount}
        </span>
      ) : null}
    </div>
  );
}

export function SortableTaskRow({ isMovingPlaceholder = false, ...props }) {
  const { attributes, listeners, setNodeRef, isDragging } = useSortable({
    id: taskKey(props.task),
    animateLayoutChanges: () => false,
    transition: null,
    disabled: props.enableDrag === false,
  });

  return (
    <div ref={setNodeRef}>
      <TaskRow
        {...props}
        dragHandle={{ ...attributes, ...listeners }}
        isDragging={isDragging || isMovingPlaceholder}
      />
    </div>
  );
}
