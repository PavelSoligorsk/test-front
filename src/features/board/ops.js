const BOX_KEYS = ['x', 'y', 'w', 'h', 'rotation'];

function byId(list) {
  return new Map(list.map((obj) => [obj.id, obj]));
}

function indexOfId(list, id) {
  return list.findIndex((obj) => obj.id === id);
}

function replaceAt(list, index, obj) {
  const next = list.slice();
  next[index] = obj;
  return next;
}

// Контракт штриха: props.points — весь массив, props.ms — время штриха в миллисекундах.
const STROKE_MS_MAX = 600000;

export function strokeDuration(ms) {
  const n = Math.round(Number(ms));
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(n, STROKE_MS_MAX);
}

function pointCount(obj) {
  return obj?.type === 'draw' && Array.isArray(obj.props?.points) ? obj.props.points.length : 0;
}

export function keepLongerStrokes(local, remote) {
  const localById = new Map((local || []).filter((obj) => obj.type === 'draw').map((obj) => [obj.id, obj]));
  return (remote || []).map((obj) => {
    const prev = localById.get(obj.id);
    if (!prev || obj.type !== 'draw' || pointCount(prev) <= pointCount(obj)) return obj;
    const props = { ...obj.props, points: prev.props.points };
    if (prev.props?.ms != null) props.ms = prev.props.ms;
    return { ...obj, props };
  });
}

export function patchSet(prev, next) {
  const set = {};
  let changed = false;
  BOX_KEYS.forEach((key) => {
    if (prev[key] !== next[key] && next[key] !== undefined) {
      set[key] = next[key];
      changed = true;
    }
  });
  const before = prev.props || {};
  const after = next.props || {};
  if (before !== after) {
    const props = {};
    let propsChanged = false;
    new Set([...Object.keys(before), ...Object.keys(after)]).forEach((key) => {
      if (before[key] === after[key]) return;
      // Сервер сливает props по верхним ключам, поэтому удалённое поле обнуляем явно.
      props[key] = after[key] === undefined ? null : after[key];
      propsChanged = true;
    });
    if (propsChanged) {
      set.props = props;
      changed = true;
    }
  }
  return changed ? set : null;
}

// Частый случай — двигали или правили объекты, состав и порядок те же:
// сравнение по индексам, без построения словарей на весь документ.
function sameOrderDiff(before, after) {
  if (before.length !== after.length) return null;
  const ops = [];
  for (let index = 0; index < after.length; index += 1) {
    const prev = before[index];
    const next = after[index];
    if (prev.id !== next.id) return null;
    if (prev === next) continue;
    const set = patchSet(prev, next);
    if (set) ops.push({ type: 'patch', id: next.id, set });
  }
  return ops;
}

export function diffOps(before, after) {
  if (before === after) return [];
  const fast = sameOrderDiff(before, after);
  if (fast) return fast;
  const ops = [];
  const beforeMap = byId(before);
  const afterMap = byId(after);
  const removed = before.filter((obj) => !afterMap.has(obj.id)).map((obj) => obj.id);
  if (removed.length) ops.push({ type: 'delete', ids: removed });

  const added = [];
  after.forEach((obj) => {
    const prev = beforeMap.get(obj.id);
    if (!prev) {
      added.push(obj.id);
      ops.push({ type: 'upsert', object: obj });
      return;
    }
    if (prev === obj) return;
    const set = patchSet(prev, obj);
    if (set) ops.push({ type: 'patch', id: obj.id, set });
  });

  const expected = [...before.filter((obj) => afterMap.has(obj.id)).map((obj) => obj.id), ...added];
  const actual = after.map((obj) => obj.id);
  if (expected.some((id, index) => id !== actual[index])) ops.push({ type: 'reorder', ids: actual });
  return ops;
}

export function applyOp(list, op) {
  switch (op?.type) {
    case 'upsert': {
      const obj = op.object;
      if (!obj?.id) return list;
      const index = indexOfId(list, obj.id);
      if (index < 0) return [...list, obj];
      return replaceAt(list, index, obj);
    }
    case 'patch': {
      const index = indexOfId(list, op.id);
      if (index < 0 || !op.set) return list;
      const current = list[index];
      const { props, ...box } = op.set;
      const obj = { ...current, ...box };
      if (props) obj.props = { ...(current.props || {}), ...props };
      return replaceAt(list, index, obj);
    }
    case 'delete': {
      const ids = new Set(op.ids || []);
      const next = list.filter((obj) => !ids.has(obj.id));
      return next.length === list.length ? list : next;
    }
    case 'reorder':
      return reorder(list, op.ids || []);
    default:
      return list;
  }
}

export function reorder(list, ids) {
  const rank = new Map(ids.map((id, index) => [id, index]));
  const next = list
    .map((obj, index) => ({ obj, index }))
    .sort((a, b) => (rank.get(a.obj.id) ?? ids.length + a.index) - (rank.get(b.obj.id) ?? ids.length + b.index))
    .map((item) => item.obj);
  return next.every((obj, index) => obj === list[index]) ? list : next;
}
