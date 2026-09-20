import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const dir = dirname(fileURLToPath(import.meta.url));
const tmp = mkdtempSync(join(tmpdir(), 'task-sel-'));

writeFileSync(join(tmp, 'taskListReorder.mjs'), readFileSync(join(dir, 'taskListReorder.js')));
writeFileSync(
  join(tmp, 'taskListSelection.mjs'),
  readFileSync(join(dir, 'taskListSelection.js'), 'utf8')
    .replace("from './taskListReorder'", "from './taskListReorder.mjs'")
    .replace("from './taskListReorder.js'", "from './taskListReorder.mjs'"),
);

const {
  applyTaskClick,
  getClickedDataIndex,
  selectTaskRange,
  toggleSelectedId,
} = await import(pathToFileURL(join(tmp, 'taskListSelection.mjs')).href);

const list = Array.from({ length: 80 }, (_, i) => ({ id: `t${i + 1}` }));
let failed = 0;
const assert = (cond, msg) => {
  if (!cond) {
    console.error('FAIL', msg);
    failed += 1;
  } else {
    console.log('ok', msg);
  }
};

assert(getClickedDataIndex(list, { id: 't50' }) === 49, 'dataIndex from findIndex, not window index');
assert(selectTaskRange(list, 't1', 't50').length === 50, 'shift 1..50 selects 50 ids');
assert(selectTaskRange(list, 't1', 't50')[0] === 't1', 'range starts at t1');
assert(selectTaskRange(list, 't1', 't50')[49] === 't50', 'range ends at t50');
assert(selectTaskRange(list, 't50', 't1').length === 50, 'shift works backwards');

const click = applyTaskClick({ filteredTasks: list, selectedIds: [], selectedTaskId: null, task: list[0] });
assert(JSON.stringify(click.selectedIds) === JSON.stringify(['t1']), 'plain click stores only the task id');
assert(click.selectedTaskId === 't1', 'plain click sets selectedTaskId');

const shifted = applyTaskClick({
  filteredTasks: list,
  selectedIds: ['t1'],
  selectedTaskId: 't1',
  task: list[49],
  shiftKey: true,
});
assert(shifted.selectedIds.length === 50, 'shift click 1 then 50 selects 1..50 without needing mounted rows');
assert(shifted.selectedIds.every((id) => typeof id === 'string' && id.startsWith('t')), 'selectedIds are task ids only');

const toggledOn = applyTaskClick({
  filteredTasks: list,
  selectedIds: ['t1'],
  selectedTaskId: 't1',
  task: list[2],
  ctrlKey: true,
});
assert(JSON.stringify(toggledOn.selectedIds) === JSON.stringify(['t1', 't3']), 'ctrl adds id');

const toggledOff = applyTaskClick({
  filteredTasks: list,
  selectedIds: ['t1', 't3'],
  selectedTaskId: 't3',
  task: list[0],
  metaKey: true,
});
assert(JSON.stringify(toggledOff.selectedIds) === JSON.stringify(['t3']), 'cmd/ctrl removes id');

assert(JSON.stringify(toggleSelectedId(['t1'], 't1')) === JSON.stringify([]), 'toggle off last id');

rmSync(tmp, { recursive: true, force: true });
if (failed) process.exit(1);
console.log('all selection assertions passed');
