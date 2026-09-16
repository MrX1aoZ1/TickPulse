'use client';

import { useEffect, useRef, useState } from 'react';
import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useVirtualizer } from '@tanstack/react-virtual';
import TaskRow, { SortableTaskRow } from './TaskRow';
import { taskKey } from '@/lib/taskListReorder';

const DEFAULT_ROW_SIZE = 46;
const DEADLINE_ROW_SIZE = 62;

function estimateTaskSize(task) {
  if (task?.deadline && task.status !== 'completed') return DEADLINE_ROW_SIZE;
  return DEFAULT_ROW_SIZE;
}

export default function TaskVirtualList({
  filteredTasks,
  selectedIds,
  selectedTaskId,
  enableReorder = true,
  scrollResetKey,
  onSelectTask,
  onUpdateStatus,
  onPermanentDelete,
  onReorder,
}) {
  const parentRef = useRef(null);
  const [activeId, setActiveId] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const sortableIds = filteredTasks.map(taskKey);

  const virtualizer = useVirtualizer({
    count: filteredTasks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => estimateTaskSize(filteredTasks[index]),
    overscan: 8,
    getItemKey: (index) => taskKey(filteredTasks[index]) || index,
    measureElement:
      typeof window !== 'undefined' && navigator.userAgent.indexOf('Firefox') === -1
        ? (element) => element?.getBoundingClientRect().height
        : undefined,
  });

  useEffect(() => {
    const node = parentRef.current;
    if (node) node.scrollTop = 0;
    if (filteredTasks.length > 0) {
      virtualizer.scrollToIndex(0);
    }
    virtualizer.measure();
    // Only reset when the view/filter/category changes, not on every virtualizer identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrollResetKey]);

  const activeTask = activeId
    ? filteredTasks.find((task) => taskKey(task) === activeId)
    : null;
  const activeSelected = Boolean(
    activeTask && (
      selectedIds.includes(taskKey(activeTask))
      || (selectedTaskId && taskKey(activeTask) === String(selectedTaskId))
    ),
  );

  const clearActive = () => {
    setActiveId(null);
    requestAnimationFrame(() => virtualizer.measure());
  };

  const renderRows = (RowComponent, rowProps = {}) => (
    <div
      style={{
        height: `${virtualizer.getTotalSize()}px`,
        width: '100%',
        position: 'relative',
      }}
    >
      {virtualizer.getVirtualItems().map((virtualRow) => {
        const task = filteredTasks[virtualRow.index];
        if (!task) return null;
        const stringId = taskKey(task);
        const isMultiSelected = selectedIds.includes(stringId);
        const isPrimary = selectedTaskId && stringId === String(selectedTaskId);
        const isSelected = isMultiSelected || Boolean(isPrimary);

        return (
          <div
            key={virtualRow.key}
            data-index={virtualRow.index}
            ref={(node) => {
              if (!node) return;
              if (activeId && stringId === activeId) return;
              virtualizer.measureElement(node);
            }}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${virtualRow.start}px)`,
            }}
          >
            <div className="pb-1">
              <RowComponent
                task={task}
                isSelected={isSelected}
                onSelect={onSelectTask}
                onUpdateStatus={onUpdateStatus}
                onPermanentDelete={onPermanentDelete}
                {...rowProps}
              />
            </div>
          </div>
        );
      })}
    </div>
  );

  const listBody = (
    <div
      ref={parentRef}
      className="flex-1 overflow-y-auto px-6 py-2 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent"
    >
      {filteredTasks.length === 0 ? (
        <div className="h-48 flex flex-col items-center justify-center text-zinc-600 text-sm">
          <p className="font-medium">No tasks here.</p>
          <p className="text-xs text-zinc-700 mt-1">Enjoy your clear day!</p>
        </div>
      ) : enableReorder ? (
        <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
          {renderRows(SortableTaskRow)}
        </SortableContext>
      ) : (
        renderRows(TaskRow, { enableDrag: false })
      )}
    </div>
  );

  if (!enableReorder) {
    return listBody;
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      autoScroll={{
        enabled: true,
        layoutShiftCompensation: false,
        canScroll: (element) => element === parentRef.current,
      }}
      onDragStart={({ active }) => setActiveId(String(active.id))}
      onDragCancel={clearActive}
      onDragEnd={({ active, over }) => {
        const currentActiveId = String(active.id);
        const overId = over ? String(over.id) : null;
        clearActive();
        onReorder?.({ activeId: currentActiveId, overId });
      }}
    >
      {listBody}
      <DragOverlay dropAnimation={null}>
        {activeTask ? (
          <TaskRow
            task={activeTask}
            isSelected={activeSelected}
            isOverlay
            onSelect={onSelectTask}
            onUpdateStatus={onUpdateStatus}
            onPermanentDelete={onPermanentDelete}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
