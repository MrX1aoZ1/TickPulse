/**
 * 中欄拖曳排序契約（階段 0）。
 *
 * 全程用 id，不要用畫面 window index。
 *
 * Drop 流程（dnd-kit 之後仍走這條，只是「誰告訴你 drop 在哪」會換）：
 *   1. overId      指標下方那一列的 task id（dnd-kit）；hello-pangea 時期沒有 overId
 *   2. dataIndex   filteredTasks.findIndex → 0 … n-1，多選範圍與 reorder 都只用這個
 *   3. movingKeys  若 selectedIds 含 activeId 且長度 > 1，整組搬（相對順序不變）；否則 [activeId]
 *   4. moveSelectedBlock(filteredTasks, movingKeys, sourceDataIndex, destDataIndex)
 *   5. SET_TASKS   把重排後的 filtered 片段 splice 回完整 tasks（樂觀更新）
 *   6. updateTasksOrder({ ids, prev_id, next_id })  LexoRank 仍由後端算
 *   7. 失敗 rollback  dispatch SET_TASKS(previous)
 *
 * 階段 4：overId 優先；沒有真實 overId 時用 scroll/pointer 估 dataIndex。
 * movingKeys 在 selectedIds 含 activeId 且長度 > 1 時整組搬。單列、source === dest 不發 API。
 */

export function taskKey(task) {
  return String(task?.id || task?.taskId || '');
}

/** overId / activeId → dataIndex；找不到回 -1。 */
export function findDataIndex(list, id) {
  const key = String(id ?? '');
  if (!key) return -1;
  return list.findIndex((task) => taskKey(task) === key);
}

/**
 * 把指標在列表內容裡的 Y 偏移估成 dataIndex。
 * totalSize / itemCount 當平均列高；還沒量過時退回 estimateSize。
 */
export function estimateDataIndexFromOffset({
  offsetY,
  itemCount,
  totalSize = 0,
  estimateSize = 46,
}) {
  if (itemCount <= 0) return -1;
  const rowSize = (totalSize > 0 ? totalSize / itemCount : estimateSize) || estimateSize || 1;
  if (!(rowSize > 0)) return 0;
  if (offsetY <= 0) return 0;
  return Math.max(0, Math.min(itemCount - 1, Math.floor(offsetY / rowSize)));
}

/** 有真實 overId 立刻用 id；否則才用 fallback dataIndex。 */
export function resolveOverDataIndex(filteredTasks, overId, fallbackIndex) {
  if (overId != null && String(overId) !== '') {
    const destIndex = findDataIndex(filteredTasks, overId);
    if (destIndex >= 0) return destIndex;
  }
  if (
    fallbackIndex != null
    && Number.isFinite(fallbackIndex)
    && fallbackIndex >= 0
    && fallbackIndex < filteredTasks.length
  ) {
    return fallbackIndex;
  }
  return -1;
}

/**
 * onDragEnd：activeId / overId（可空）+ fallbackIndex → moveSelectedBlock 的下標。
 */
export function resolveDropDataIndices(filteredTasks, activeId, overId, fallbackIndex) {
  return {
    sourceIndex: findDataIndex(filteredTasks, activeId),
    destIndex: resolveOverDataIndex(filteredTasks, overId, fallbackIndex),
  };
}

export function getMovingKeys(filteredTasks, selectedIds, activeId) {
  const id = String(activeId);
  if (selectedIds.includes(id) && selectedIds.length > 1) {
    return filteredTasks.filter((task) => selectedIds.includes(taskKey(task))).map(taskKey);
  }
  return [id];
}

export function taskOrderSignature(list) {
  return list.map(taskKey).join(',');
}

/**
 * 把 movingKeys 這一段（相對順序不變）插到 destIndex 指向的位置。
 * sourceIndex / destIndex 必須是 filteredTasks 的 dataIndex，不是 virtualizer window index。
 */
export function moveSelectedBlock(list, movingKeys, sourceIndex, destIndex) {
  const moving = new Set(movingKeys);
  const block = list.filter((task) => moving.has(taskKey(task)));
  const without = list.filter((task) => !moving.has(taskKey(task)));
  const insertAt = destIndex > sourceIndex
    ? list.slice(0, destIndex + 1).filter((task) => !moving.has(taskKey(task))).length
    : list.slice(0, destIndex).filter((task) => !moving.has(taskKey(task))).length;
  const next = [...without];
  next.splice(insertAt, 0, ...block);
  return next;
}

/** 把重排後的 filtered 順序寫回完整 tasks 陣列（未出現在 filtered 裡的列不動）。 */
export function applyFilteredOrderToAllTasks(allTasks, filteredTasks, reorderedFiltered) {
  const globalIndices = filteredTasks.map((filteredTask) =>
    allTasks.findIndex((task) => taskKey(task) === taskKey(filteredTask))
  );
  const updated = [...allTasks];
  globalIndices.forEach((globalIdx, i) => {
    if (globalIdx !== -1) {
      updated[globalIdx] = reorderedFiltered[i];
    }
  });
  return updated;
}

/** over-id 落地後：整組 ids + 新位置的前後鄰居，給 PUT /api/tasks/reorder。 */
export function getReorderPayload(reorderedList, movingKeys) {
  const movingSet = new Set(movingKeys);
  const block = reorderedList.filter((task) => movingSet.has(taskKey(task)));
  const firstIdx = reorderedList.findIndex((task) => taskKey(task) === taskKey(block[0]));
  const lastIdx = reorderedList.findIndex((task) => taskKey(task) === taskKey(block[block.length - 1]));
  const prevTask = firstIdx > 0 ? reorderedList[firstIdx - 1] : null;
  const nextTask = lastIdx < reorderedList.length - 1 ? reorderedList[lastIdx + 1] : null;
  return {
    ids: block.map(taskKey),
    prev_id: prevTask ? taskKey(prevTask) : null,
    next_id: nextTask ? taskKey(nextTask) : null,
  };
}
