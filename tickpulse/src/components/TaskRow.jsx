'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  ArrowUturnLeftIcon,
  Bars3Icon,
  NoSymbolIcon,
  TrashIcon,
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
  enableDrag = true,
  dragHandle,
  onSelect,
  onUpdateStatus,
  onPermanentDelete,
}) {
  const isDone = task.status === 'completed';
  const isTrash = task.status === 'cancelled' || task.status === 'deleted';
  const rowDragHandle = enableDrag && isSelected && !isOverlay ? dragHandle : undefined;
  const iconDragHandle = enableDrag && !isSelected && !isOverlay ? dragHandle : undefined;

  return (
    <div
      {...rowDragHandle}
      onClick={isOverlay || isDragging ? undefined : (e) => onSelect(e, task)}
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
        {enableDrag ? (
          <div
            {...iconDragHandle}
            onClick={(e) => e.stopPropagation()}
            className={`text-zinc-600 hover:text-zinc-400 p-0.5 flex-shrink-0 ${
              isSelected || isOverlay
                ? 'opacity-100'
                : 'cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity duration-100'
            }`}
          >
            <Bars3Icon className="w-4 h-4" />
          </div>
        ) : null}

        {!isTrash ? (
          <button
            onClick={(e) => { e.stopPropagation(); onUpdateStatus(task, isDone ? 'pending' : 'completed'); }}
            className={`w-4 h-4 rounded border flex-shrink-0 transition-colors flex items-center justify-center ${getPriorityClass(task.priority)}`}
          >
            {task.status === 'completed' && <span className="w-1.5 h-1.5 bg-zinc-400 rounded-sm" />}
          </button>
        ) : (
          <button
            onClick={(e) => { e.stopPropagation(); onUpdateStatus(task, 'pending'); }}
            className="text-zinc-600 hover:text-zinc-400 p-0.5 flex-shrink-0"
            title="Restore Task"
          >
            <ArrowUturnLeftIcon className="w-3.5 h-3.5" />
          </button>
        )}

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

      <div className="opacity-0 group-hover:opacity-100 flex items-center space-x-1.5 ml-4 flex-shrink-0 transition-opacity duration-100">
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
    </div>
  );
}

export function SortableTaskRow(props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: taskKey(props.task),
    animateLayoutChanges: () => false,
    disabled: props.enableDrag === false,
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
    >
      <TaskRow {...props} dragHandle={{ ...attributes, ...listeners }} isDragging={isDragging} />
    </div>
  );
}
