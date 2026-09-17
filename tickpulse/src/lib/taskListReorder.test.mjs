import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const dir = dirname(fileURLToPath(import.meta.url));
const tmp = mkdtempSync(join(tmpdir(), 'task-reorder-'));
writeFileSync(join(tmp, 'taskListReorder.mjs'), readFileSync(join(dir, 'taskListReorder.js')));

const {
  estimateDataIndexFromOffset,
  getMovingKeys,
  getReorderPayload,
  moveSelectedBlock,
  resolveDropDataIndices,
  resolveOverDataIndex,
  taskOrderSignature,
} = await import(pathToFileURL(join(tmp, 'taskListReorder.mjs')).href);

const list = Array.from({ length: 10 }, (_, i) => ({ id: `t${i}` }));
const longList = Array.from({ length: 900 }, (_, i) => ({ id: `t${i}` }));
let failed = 0;
const assert = (cond, msg) => {
  if (!cond) {
    console.error('FAIL', msg);
    failed += 1;
  } else {
    console.log('ok', msg);
  }
};

assert(
  JSON.stringify(getMovingKeys(list, ['t1', 't3', 't5'], 't3')) === JSON.stringify(['t1', 't3', 't5']),
  'selectedIds contains activeId and length > 1 → whole block in list order',
);
assert(
  JSON.stringify(getMovingKeys(list, ['t1', 't3', 't5'], 't9')) === JSON.stringify(['t9']),
  'dragging an unselected row moves only that row',
);
assert(
  JSON.stringify(getMovingKeys(list, ['t1'], 't1')) === JSON.stringify(['t1']),
  'single selection is still a one-item move',
);

const block = moveSelectedBlock(list, ['t1', 't3', 't5'], 1, 8);
assert(taskOrderSignature(block) === 't0,t2,t4,t6,t7,t8,t1,t3,t5,t9', 'block keeps relative order when inserted');
const payload = getReorderPayload(block, ['t1', 't3', 't5']);
assert(JSON.stringify(payload.ids) === JSON.stringify(['t1', 't3', 't5']), 'reorder ids are the 3 selected keys');
assert(payload.prev_id === 't8', 'prev_id is the neighbor before the block');
assert(payload.next_id === 't9', 'next_id is the neighbor after the block');

const far = moveSelectedBlock(longList, ['t5', 't6', 't7'], 5, 800);
const farPayload = getReorderPayload(far, ['t5', 't6', 't7']);
assert(JSON.stringify(farPayload.ids) === JSON.stringify(['t5', 't6', 't7']), 'ids stay the 3 keys after a long-distance drop');
assert(far[798].id === 't5' && far[799].id === 't6' && far[800].id === 't7', 'block lands around dest 800');

assert(estimateDataIndexFromOffset({ offsetY: 0, itemCount: 1000, totalSize: 46000, estimateSize: 46 }) === 0, 'offset 0 → index 0');
assert(
  estimateDataIndexFromOffset({ offsetY: 46 * 800 + 10, itemCount: 1000, totalSize: 46000, estimateSize: 46 }) === 800,
  'scrollTop/estimateSize ≈ row 800',
);
assert(estimateDataIndexFromOffset({ offsetY: 999999, itemCount: 50, estimateSize: 46 }) === 49, 'clamps to last index');
assert(estimateDataIndexFromOffset({ offsetY: 10, itemCount: 0, estimateSize: 46 }) === -1, 'empty list → -1');

assert(resolveOverDataIndex(list, 't2', 8) === 2, 'real overId wins over fallback');
assert(resolveOverDataIndex(list, null, 8) === 8, 'empty overId uses fallback dataIndex');
assert(resolveOverDataIndex(list, 'missing', 8) === 8, 'unknown overId falls back');
assert(resolveDropDataIndices(list, 't5', null, 800).sourceIndex === 5, 'source is activeId dataIndex');
assert(resolveDropDataIndices(list, 't5', null, 8).destIndex === 8, 'dest uses fallback when overId is empty');

const same = moveSelectedBlock(list, ['t2'], 2, 2);
assert(taskOrderSignature(same) === taskOrderSignature(list), 'same position is a no-op');

rmSync(tmp, { recursive: true, force: true });
if (failed) process.exit(1);
console.log('all reorder assertions passed');
