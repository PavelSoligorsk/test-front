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

// Контракт штриха с сервером: props.points — весь массив точек,
// props.ms — одно целое время на этот массив (мс от нажатия до отпускания).
// У лазерной указки то же поле ms на сообщении laser. Старые штрихи без ms остаются как есть.
//
// Имена точек идут обычным upsert/patch, отдельного типа сообщения нет.
// Новый объект type "point": x,y — центр в мире, w,h = 8.
// props.letter — одна латинская буква, props.sub — до трёх цифр нижнего индекса ("" если нет).
// props.cross — [{id, edge}, {id, edge}] ребра фигуры и отрезка (или двух отрезков).
// Точка остаётся на этом пересечении, когда двигают фигуру или отрезок.
// Несколько отрезков клеятся к одной точке: bind {id точки, point: true} на каждом конце.
// Вершины фигуры (type "shape") подписываются на месте: props.names[i] = {letter, sub, dx, dy, size} или null.
// dx, dy и size — в координатах доски, как клетки (клетка 20). У точки те же dx, dy, size в props.
// Разрез отрезка: вместо одного arrow несколько, общий конец bind {id точки, point: true}.
// Так же, если новый отрезок проходит через уже стоящие точки: куски по порядку, каждый приклеен.
// Отделённое ребро фигуры: props.skipEdges — номера рёбер, которые больше не рисуются.
// Индекс i совпадает с вершиной: polyline.points, verts, либо узлы многогранника.
// Сдвинутые вершины лежат в props.verts: [[u, v], ...] в локальных 0..100.
const STROKE_MS_MAX = 600000;

export function strokeDuration(ms) {
  const n = Math.round(Number(ms));
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(n, STROKE_MS_MAX);
}

// Сжатые точки штриха: целые десятые доли, первая пара абсолютная, дальше разности.
export function encodePts(points) {
  const out = [];
  let px = 0;
  let py = 0;
  points.forEach((point) => {
    const x = Math.round(point.x * 10);
    const y = Math.round(point.y * 10);
    out.push(x - px, y - py);
    px = x;
    py = y;
  });
  return out;
}

export function decodePts(pts) {
  const points = [];
  let x = 0;
  let y = 0;
  for (let i = 0; i + 1 < pts.length; i += 2) {
    x += pts[i];
    y += pts[i + 1];
    points.push({ x: x / 10, y: y / 10 });
  }
  return points;
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

function pointCount(obj) {
  return obj?.type === 'draw' && Array.isArray(obj.props?.points) ? obj.props.points.length : 0;
}

// Короткий повтор первого куска штриха не должен стирать уже дописанный хвост.
export function keepLongerStrokes(local, remote) {
  const byId = new Map((local || []).filter((obj) => obj.type === 'draw').map((obj) => [obj.id, obj]));
  return (remote || []).map((obj) => {
    const prev = byId.get(obj.id);
    if (!prev || obj.type !== 'draw' || pointCount(prev) <= pointCount(obj)) return obj;
    const props = { ...obj.props, points: prev.props.points };
    if (prev.props?.ms != null) props.ms = prev.props.ms;
    return { ...obj, props };
  });
}

export function applyOp(list, op) {
  switch (op?.type) {
    case 'upsert': {
      const obj = op.object;
      if (!obj?.id) return list;
      const index = indexOfId(list, obj.id);
      if (index < 0) return [...list, obj];
      const current = list[index];
      if (obj.type === 'draw' && current.type === 'draw' && pointCount(obj) < pointCount(current)) return list;
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
    case 'append_points': {
      const index = indexOfId(list, op.id);
      let incoming = Array.isArray(op.pts) ? decodePts(op.pts) : op.points;
      if (index < 0 || !Array.isArray(incoming) || !incoming.length) return list;
      const current = list[index];
      const existing = current.props?.points || [];
      if (Number.isInteger(op.from)) {
        if (op.from > existing.length) return list;
        incoming = incoming.slice(existing.length - op.from);
        if (!incoming.length) return list;
      }
      const points = [...existing, ...incoming];
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
