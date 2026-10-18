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

export function diffOps(before, after) {
  if (before === after) return [];
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
      return index < 0 ? [...list, obj] : replaceAt(list, index, obj);
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
    case 'append_points': {
      const index = indexOfId(list, op.id);
      if (index < 0 || !Array.isArray(op.points) || !op.points.length) return list;
      const current = list[index];
      const points = [...(current.props?.points || []), ...op.points];
      return replaceAt(list, index, { ...current, props: { ...current.props, points } });
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
