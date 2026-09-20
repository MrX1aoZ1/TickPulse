/** 分类列表里已完成 / 已放弃（Won't Do）沉底，不参与 LexoRank 拖曳。 */

export function isSettledStatus(status) {
  return status === 'completed' || status === 'cancelled';
}

export function updatedAtMs(task) {
  const raw = task?.updated_at || task?.updatedAt || task?.update_date || task?.updateDate;
  const t = raw ? new Date(raw).getTime() : 0;
  return Number.isNaN(t) ? 0 : t;
}

export function sortByUpdatedAtDesc(tasks) {
  return [...tasks].sort((a, b) => {
    const diff = updatedAtMs(b) - updatedAtMs(a);
    if (diff !== 0) return diff;
    return String(b.id || b.taskId || '').localeCompare(String(a.id || a.taskId || ''));
  });
}

/**
 * 分类视图：pending 保持原 sort_order；completed + cancelled 按 updated_at 新到旧。
 * deleted 不进分类列表。
 */
export function splitCategoryTasks(tasks) {
  const pending = [];
  const settled = [];
  for (const task of tasks) {
    const status = task?.status;
    if (status === 'deleted') continue;
    if (isSettledStatus(status)) settled.push(task);
    else pending.push(task);
  }
  return { pending, settled: sortByUpdatedAtDesc(settled) };
}
