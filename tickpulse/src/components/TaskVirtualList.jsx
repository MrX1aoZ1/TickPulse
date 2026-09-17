'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { useVirtualizer } from '@tanstack/react-virtual';
import TaskRow, { SortableTaskRow } from './TaskRow';
import {
  estimateDataIndexFromOffset,
  getMovingKeys,
  taskKey,
} from '@/lib/taskListReorder';

const DEFAULT_ROW_SIZE = 46;
const DEADLINE_ROW_SIZE = 62;
const IDLE_OVERSCAN = 12;
const DRAG_OVERSCAN = 15;

function estimateTaskSize(task) {
  if (task?.deadline && task.status !== 'completed') return DEADLINE_ROW_SIZE;
  return DEFAULT_ROW_SIZE;
}

function clientYFromEvent(event) {
  if (!event) return null;
  if (typeof event.clientY === 'number') return event.clientY;
  const touch = event.touches?.[0] || event.changedTouches?.[0];
  return touch ? touch.clientY : null;
}

function pointerWithinOrNone(args) {
  const hits = pointerWithin(args);
  return hits.length > 0 ? hits : [];
}

function SettledSection({
  tasks,
  expanded,
  selectedIds,
  selectedTaskId,
  onToggle,
  onSelectTask,
  onUpdateStatus,
  onPermanentDelete,
}) {
  if (!tasks.length) return null;
  const label = `Completed & Won't Do (${tasks.length})`;

  return (
    <div className="mt-2 pt-2 border-t border-zinc-200 dark:border-zinc-800/80">
      <button
        type="button"
        aria-expanded={expanded}
        onClick={onToggle}
        className="w-full flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium tracking-wide uppercase text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900/40 transition-colors"
      >
        {expanded ? (
          <ChevronDownIcon className="w-3.5 h-3.5 flex-shrink-0" />
        ) : (
          <ChevronRightIcon className="w-3.5 h-3.5 flex-shrink-0" />
        )}
        <span>{label}</span>
      </button>
      {expanded
        ? tasks.map((task) => {
            const stringId = taskKey(task);
            const isMultiSelected = selectedIds.includes(stringId);
            const isPrimary = selectedTaskId && stringId === String(selectedTaskId);
            return (
              <div key={stringId} className="pb-1">
                <TaskRow
                  task={task}
                  isSelected={isMultiSelected || Boolean(isPrimary)}
                  enableDrag={false}
                  onSelect={onSelectTask}
                  onUpdateStatus={onUpdateStatus}
                  onPermanentDelete={onPermanentDelete}
                />
              </div>
            );
          })
        : null}
    </div>
  );
}

export default function TaskVirtualList({
  filteredTasks,
  settledTasks = [],
  settledExpanded = false,
  selectedIds,
  selectedTaskId,
  enableReorder = true,
  scrollResetKey,
  onSelectTask,
  onUpdateStatus,
  onPermanentDelete,
  onReorder,
  onToggleSettled = () => {},
}) {
  const parentRef = useRef(null);
  const pointerYRef = useRef(null);
  const scrollTopRef = useRef(0);
  const [activeId, setActiveId] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const sortableIds = filteredTasks.map(taskKey);
  const movingKeys = activeId
    ? getMovingKeys(filteredTasks, selectedIds, activeId)
    : [];
  const movingSet = new Set(movingKeys);

  const virtualizer = useVirtualizer({
    count: filteredTasks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => estimateTaskSize(filteredTasks[index]) || DEFAULT_ROW_SIZE,
    overscan: activeId ? DRAG_OVERSCAN : IDLE_OVERSCAN,
    getItemKey: (index) => taskKey(filteredTasks[index]) || index,
    measureElement:
      typeof window !== 'undefined' && navigator.userAgent.indexOf('Firefox') === -1
        ? (element) => element?.getBoundingClientRect().height
        : undefined,
  });

  const itemKeys = filteredTasks.map(taskKey).join(',');
  useLayoutEffect(() => {
    const node = parentRef.current;
    if (node) node.scrollTop = 0;
    if (filteredTasks.length > 0) {
      virtualizer.scrollToIndex(0, { align: 'start' });
    }
    // Parent also remounts this list with key={viewKey}; this covers same-instance resets.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrollResetKey]);

  useLayoutEffect(() => {
    virtualizer.measure();
    // Re-measure after add / complete / delete / reorder so leftover spacers don't leave holes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemKeys, filteredTasks.length]);

  const activeTask = activeId
    ? filteredTasks.find((task) => taskKey(task) === activeId)
    : null;
  const overlayCount = movingKeys.length;

  const captureScrollTop = () => {
    scrollTopRef.current = parentRef.current?.scrollTop ?? 0;
  };

  const restoreScrollAndMeasure = () => {
    const top = scrollTopRef.current;
    const apply = () => {
      if (parentRef.current) parentRef.current.scrollTop = top;
    };
    apply();
    requestAnimationFrame(() => {
      apply();
      virtualizer.measure();
      apply();
    });
  };

  const estimateFallbackIndex = () => {
    const parent = parentRef.current;
    const pointerY = pointerYRef.current;
    if (!parent || pointerY == null) return -1;
    const rect = parent.getBoundingClientRect();
    const paddingTop = Number.parseFloat(getComputedStyle(parent).paddingTop) || 0;
    return estimateDataIndexFromOffset({
      offsetY: parent.scrollTop + (pointerY - rect.top) - paddingTop,
      itemCount: filteredTasks.length,
      totalSize: virtualizer.getTotalSize(),
      estimateSize: DEFAULT_ROW_SIZE,
    });
  };

  const finishDrag = async (event) => {
    const currentActiveId = event?.active ? String(event.active.id) : null;
    const overId = event?.over ? String(event.over.id) : null;
    const fallbackIndex = estimateFallbackIndex();
    setActiveId(null);
    pointerYRef.current = null;
    try {
      if (currentActiveId) {
        await onReorder?.({ activeId: currentActiveId, overId, fallbackIndex });
      }
    } finally {
      restoreScrollAndMeasure();
    }
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
              if (!node || activeId) return;
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
                isMovingPlaceholder={Boolean(activeId) && movingSet.has(stringId)}
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
      role="list"
      aria-label="Task list"
      className="flex-1 overflow-y-auto [overflow-anchor:none] px-6 py-2 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent"
    >
      {filteredTasks.length === 0 && settledTasks.length === 0 ? (
        <div className="h-48 flex flex-col items-center justify-center text-zinc-600 text-sm">
          <p className="font-medium">No tasks here.</p>
          <p className="text-xs text-zinc-700 mt-1">Enjoy your clear day!</p>
        </div>
      ) : (
        <>
          {filteredTasks.length > 0 ? (
            enableReorder ? (
              <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
                {renderRows(SortableTaskRow)}
              </SortableContext>
            ) : (
              renderRows(TaskRow, { enableDrag: false })
            )
          ) : null}
          <SettledSection
            tasks={settledTasks}
            expanded={settledExpanded}
            selectedIds={selectedIds}
            selectedTaskId={selectedTaskId}
            onToggle={onToggleSettled}
            onSelectTask={onSelectTask}
            onUpdateStatus={onUpdateStatus}
            onPermanentDelete={onPermanentDelete}
          />
        </>
      )}
    </div>
  );

  if (!enableReorder) {
    return listBody;
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithinOrNone}
      autoScroll={{
        enabled: true,
        layoutShiftCompensation: false,
        canScroll: (element) => element === parentRef.current,
        acceleration: 25,
        interval: 5,
        threshold: { x: 0.2, y: 0.12 },
      }}
      onDragStart={({ active }) => {
        captureScrollTop();
        setActiveId(String(active.id));
      }}
      onDragMove={({ delta, activatorEvent }) => {
        const startY = clientYFromEvent(activatorEvent);
        if (startY != null) pointerYRef.current = startY + delta.y;
        captureScrollTop();
      }}
      onDragCancel={() => {
        setActiveId(null);
        pointerYRef.current = null;
        restoreScrollAndMeasure();
      }}
      onDragEnd={finishDrag}
    >
      {listBody}
      <DragOverlay dropAnimation={null}>
        {activeTask ? (
          <TaskRow
            task={activeTask}
            isSelected
            isOverlay
            overlayCount={overlayCount}
            onSelect={onSelectTask}
            onUpdateStatus={onUpdateStatus}
            onPermanentDelete={onPermanentDelete}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
