import { reorder } from './ops';

// Шаг истории хранит только объекты, которые менял сам пользователь,
// чтобы отмена не откатывала чужую работу на общей доске.
export function historyEntry(before, after) {
  if (before === after) return null;
  const beforeMap = new Map(before.map((obj) => [obj.id, obj]));
  const afterMap = new Map(after.map((obj) => [obj.id, obj]));
  const changes = [];
  before.forEach((obj, index) => {
    const next = afterMap.get(obj.id);
    if (next !== obj) changes.push({ id: obj.id, before: obj, after: next || null, index });
  });
  after.forEach((obj, index) => {
    if (!beforeMap.has(obj.id)) changes.push({ id: obj.id, before: null, after: obj, index });
  });
  const beforeOrder = before.filter((obj) => afterMap.has(obj.id)).map((obj) => obj.id);
  const afterOrder = after.filter((obj) => beforeMap.has(obj.id)).map((obj) => obj.id);
  const reordered = beforeOrder.some((id, index) => id !== afterOrder[index]);
  if (!changes.length && !reordered) return null;
  return {
    changes,
    order: reordered ? { before: before.map((obj) => obj.id), after: after.map((obj) => obj.id) } : null,
  };
}

export function applyHistory(list, entry, direction) {
  const undo = direction === 'undo';
  let next = list.slice();
  entry.changes.forEach((change) => {
    const target = undo ? change.before : change.after;
    const index = next.findIndex((obj) => obj.id === change.id);
    if (!target) {
      if (index >= 0) next.splice(index, 1);
      return;
    }
    if (index >= 0) next[index] = target;
    else next.splice(Math.min(change.index, next.length), 0, target);
  });
  if (entry.order) next = reorder(next, undo ? entry.order.before : entry.order.after);
  return next;
}

export function entryIds(entry) {
  return entry.changes.map((change) => change.id);
}
