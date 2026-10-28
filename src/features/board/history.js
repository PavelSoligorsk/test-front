import { reorder } from './ops';

const BOX_KEYS = ['x', 'y', 'w', 'h', 'rotation'];

// Что поменялось в объекте: поля рамки и верхние ключи props. Отмена применяет
// обратный патч к текущему объекту, поэтому не трогает поля, которые меняли другие
// участники или сам апплет (построение GeoGebra, высота карточки и т. п.).
function fieldPatch(from, to) {
  const box = {};
  BOX_KEYS.forEach((key) => {
    if (from[key] !== to[key]) box[key] = to[key];
  });
  const set = {};
  const unset = [];
  const before = from.props || {};
  const after = to.props || {};
  if (before !== after) {
    new Set([...Object.keys(before), ...Object.keys(after)]).forEach((key) => {
      if (before[key] === after[key]) return;
      if (after[key] === undefined) unset.push(key);
      else set[key] = after[key];
    });
  }
  const typeChanged = from.type !== to.type;
  if (!Object.keys(box).length && !Object.keys(set).length && !unset.length && !typeChanged) return null;
  return { box, set, unset, ...(typeChanged ? { type: to.type } : {}) };
}

function applyPatch(obj, patch) {
  const next = { ...obj, ...patch.box };
  if (patch.type) next.type = patch.type;
  if (Object.keys(patch.set).length || patch.unset.length) {
    const props = { ...(obj.props || {}), ...patch.set };
    patch.unset.forEach((key) => { delete props[key]; });
    next.props = props;
  }
  return next;
}

// Шаг истории хранит только объекты, которые менял сам пользователь,
// чтобы отмена не откатывала чужую работу на общей доске.
export function historyEntry(before, after) {
  if (before === after) return null;
  const beforeMap = new Map(before.map((obj) => [obj.id, obj]));
  const afterMap = new Map(after.map((obj) => [obj.id, obj]));
  const changes = [];
  before.forEach((obj, index) => {
    const next = afterMap.get(obj.id);
    if (next === obj) return;
    if (!next) {
      changes.push({ id: obj.id, kind: 'delete', object: obj, index });
      return;
    }
    const redo = fieldPatch(obj, next);
    if (redo) changes.push({ id: obj.id, kind: 'patch', redo, undo: fieldPatch(next, obj) });
  });
  after.forEach((obj, index) => {
    if (!beforeMap.has(obj.id)) changes.push({ id: obj.id, kind: 'create', object: obj, index });
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
  const indexOf = (id) => next.findIndex((obj) => obj.id === id);
  entry.changes.forEach((change) => {
    const index = indexOf(change.id);
    if (change.kind === 'patch') {
      if (index >= 0) next[index] = applyPatch(next[index], undo ? change.undo : change.redo);
      return;
    }
    const present = (change.kind === 'create') !== undo;
    if (!present) {
      if (index >= 0) next.splice(index, 1);
      return;
    }
    if (index >= 0) next[index] = change.object;
    else next.splice(Math.min(change.index, next.length), 0, change.object);
  });
  if (entry.order) next = reorder(next, undo ? entry.order.before : entry.order.after);
  return next;
}

export function createdOnly(entry, id) {
  return entry?.changes.length === 1 && entry.changes[0].id === id && entry.changes[0].kind === 'create';
}
