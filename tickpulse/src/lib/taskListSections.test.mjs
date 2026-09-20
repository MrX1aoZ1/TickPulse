import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const dir = dirname(fileURLToPath(import.meta.url));
const tmp = mkdtempSync(join(tmpdir(), 'task-sections-'));
writeFileSync(join(tmp, 'taskListSections.mjs'), readFileSync(join(dir, 'taskListSections.js')));

const {
  isSettledStatus,
  sortByUpdatedAtDesc,
  splitCategoryTasks,
} = await import(pathToFileURL(join(tmp, 'taskListSections.mjs')).href);

let failed = 0;
const assert = (cond, msg) => {
  if (!cond) {
    console.error('FAIL', msg);
    failed += 1;
  } else {
    console.log('ok', msg);
  }
};

assert(isSettledStatus('completed'), 'completed is settled');
assert(isSettledStatus('cancelled'), 'cancelled is settled');
assert(!isSettledStatus('pending'), 'pending is not settled');
assert(!isSettledStatus('deleted'), 'deleted is not settled');

const mixed = [
  { id: 'p1', status: 'pending' },
  { id: 'c-old', status: 'completed', updated_at: '2026-01-01T00:00:00.000Z' },
  { id: 'p2', status: 'pending' },
  { id: 'w-new', status: 'cancelled', updated_at: '2026-06-01T00:00:00.000Z' },
  { id: 'gone', status: 'deleted', updated_at: '2026-09-01T00:00:00.000Z' },
  { id: 'c-new', status: 'completed', updated_at: '2026-08-01T00:00:00.000Z' },
];

const { pending, settled } = splitCategoryTasks(mixed);
assert(pending.map((t) => t.id).join(',') === 'p1,p2', 'pending keeps original order and drops settled');
assert(settled.map((t) => t.id).join(',') === 'c-new,w-new,c-old', 'settled is completed+cancelled by updated_at desc');
assert(!settled.some((t) => t.status === 'deleted'), 'deleted stays out of the category split');

const tied = sortByUpdatedAtDesc([
  { id: 'b', status: 'completed', updated_at: '2026-05-01T00:00:00.000Z' },
  { id: 'a', status: 'cancelled', updated_at: '2026-05-01T00:00:00.000Z' },
]);
assert(tied[0].id === 'b' && tied[1].id === 'a', 'equal updated_at ties break by id desc');

rmSync(tmp, { recursive: true, force: true });
if (failed) process.exit(1);
console.log('all section assertions passed');
