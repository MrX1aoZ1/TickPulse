/**
 * 中欄多選契約（階段 2）。
 *
 * 只用 dataIndex：filteredTasks.findIndex（0 … n-1）。
 * 不要用 virtualizer 的 window index；列未掛 DOM 時 Shift 範圍仍然成立。
 * selectedIds 只存 task id 字串。
 */

import { findDataIndex, taskKey } from './taskListReorder';

export function getClickedDataIndex(filteredTasks, task) {
  return findDataIndex(filteredTasks, taskKey(task));
}

export function selectTaskRange(filteredTasks, anchorId, clickedId) {
  const dataIndex = findDataIndex(filteredTasks, clickedId);
  let anchorIndex = findDataIndex(filteredTasks, anchorId);
  if (dataIndex === -1) return [];
  if (anchorIndex === -1) anchorIndex = dataIndex;
  const from = Math.min(anchorIndex, dataIndex);
  const to = Math.max(anchorIndex, dataIndex);
  return filteredTasks.slice(from, to + 1).map(taskKey);
}

export function toggleSelectedId(selectedIds, id) {
  const key = String(id);
  const next = new Set(selectedIds.map(String));
  if (next.has(key)) next.delete(key);
  else next.add(key);
  return [...next];
}

export function resolveAnchorId(selectedTaskId, selectedIds) {
  if (selectedTaskId != null && String(selectedTaskId) !== '') {
    return String(selectedTaskId);
  }
  if (selectedIds.length > 0) return String(selectedIds[selectedIds.length - 1]);
  return null;
}

/**
 * @returns {{ selectedIds: string[], selectedTaskId: string }}
 */
export function applyTaskClick({
  filteredTasks,
  selectedIds,
  selectedTaskId,
  task,
  shiftKey = false,
  metaKey = false,
  ctrlKey = false,
}) {
  const id = taskKey(task);
  const dataIndex = getClickedDataIndex(filteredTasks, task);

  if (shiftKey) {
    const anchorId = resolveAnchorId(selectedTaskId, selectedIds);
    const range = dataIndex === -1
      ? [id]
      : selectTaskRange(filteredTasks, anchorId, id);
    return { selectedIds: range, selectedTaskId: id };
  }

  if (metaKey || ctrlKey) {
    return {
      selectedIds: toggleSelectedId(selectedIds, id),
      selectedTaskId: id,
    };
  }

  return { selectedIds: [id], selectedTaskId: id };
}
