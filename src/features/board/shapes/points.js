import { arrowBounds, distToSegment } from '../geometry';
import { arrowHeadState, releaseMissingBinds, retargetBound } from './binding';
import { isSolid, modelOf, planeNodes } from './kinds';

function worldOf(shape, u, v) {
  return { x: shape.x + (u / 100) * shape.w, y: shape.y + (v / 100) * shape.h };
}

function arrowEnds(host) {
  return [
    { x: host.x + host.props.x1, y: host.y + host.props.y1 },
    { x: host.x + host.props.x2, y: host.y + host.props.y2 },
  ];
}

function hostSegments(host) {
  if (host.type === 'arrow') return [arrowEnds(host)];
  if (host.type !== 'shape' || host.props?.shape === 'circle') return [];
  if (isSolid(host.props.shape)) {
    const model = modelOf(host);
    return model.edges.map((edge) => [
      worldOf(host, model.nodes[edge.a][0], model.nodes[edge.a][1]),
      worldOf(host, model.nodes[edge.b][0], model.nodes[edge.b][1]),
    ]);
  }
  const nodes = planeNodes(host.props?.shape, host.props);
  if (!nodes) return [];
  const closed = host.props.shape !== 'polyline' || host.props.closed;
  const count = closed ? nodes.length : Math.max(0, nodes.length - 1);
  const lines = [];
  for (let index = 0; index < count; index += 1) {
    const next = nodes[(index + 1) % nodes.length];
    lines.push([
      worldOf(host, nodes[index][0], nodes[index][1]),
      worldOf(host, next[0], next[1]),
    ]);
  }
  return lines;
}

function segmentCross(p, q) {
  const rx = p.b.x - p.a.x;
  const ry = p.b.y - p.a.y;
  const sx = q.b.x - q.a.x;
  const sy = q.b.y - q.a.y;
  const den = rx * sy - ry * sx;
  if (Math.abs(den) < 1e-6) return null;
  const qx = q.a.x - p.a.x;
  const qy = q.a.y - p.a.y;
  const t = (qx * sy - qy * sx) / den;
  const u = (qx * ry - qy * rx) / den;
  if (t < -0.02 || t > 1.02 || u < -0.02 || u > 1.02) return null;
  const atEnd = (value) => value <= 0.06 || value >= 0.94;
  if (atEnd(t) && atEnd(u)) return null;
  return { x: p.a.x + rx * t, y: p.a.y + ry * t };
}

function edgesAdjacent(obj, left, right) {
  if (left === right) return true;
  if (Math.abs(left - right) === 1) return true;
  const count = hostSegments(obj).length;
  const closed = obj.type === 'shape' && (obj.props.shape !== 'polyline' || obj.props.closed);
  return closed && count > 2 && ((left === 0 && right === count - 1) || (right === 0 && left === count - 1));
}

function crossingOf(objects, cross) {
  if (!Array.isArray(cross) || cross.length < 2) return null;
  const hosts = cross.map((item) => objects.find((obj) => obj.id === item.id));
  if (hosts.some((host) => !host)) return null;
  const lines = hosts.map((host, index) => hostSegments(host)[cross[index].edge]);
  if (lines.some((line) => !line)) return null;
  return segmentCross(
    { a: lines[0][0], b: lines[0][1] },
    { a: lines[1][0], b: lines[1][1] },
  );
}

export function nearestCrossing(objects, point, zoom, reach = 24) {
  const edges = [];
  (objects || []).forEach((obj) => {
    if (obj.type === 'point') return;
    hostSegments(obj).forEach((line, edge) => {
      edges.push({ id: obj.id, edge, obj, a: line[0], b: line[1] });
    });
  });
  const limit = reach / (zoom || 1);
  let best = null;
  for (let i = 0; i < edges.length; i += 1) {
    for (let j = i + 1; j < edges.length; j += 1) {
      const left = edges[i];
      const right = edges[j];
      if (left.id === right.id && edgesAdjacent(left.obj, left.edge, right.edge)) continue;
      const hit = segmentCross(left, right);
      if (!hit) continue;
      const dist = Math.hypot(point.x - hit.x, point.y - hit.y);
      if (dist > limit || (best && dist >= best.dist)) continue;
      best = {
        dist,
        point: { x: hit.x, y: hit.y },
        cross: [{ id: left.id, edge: left.edge }, { id: right.id, edge: right.edge }],
      };
    }
  }
  return best;
}

export function retargetMarks(objects, hostIds) {
  const ids = new Set(hostIds);
  let changed = false;
  const next = objects.map((obj) => {
    if (obj.type !== 'point' || !Array.isArray(obj.props.cross)) return obj;
    if (!obj.props.cross.some((item) => ids.has(item.id))) return obj;
    const point = crossingOf(objects, obj.props.cross);
    if (!point) return obj;
    if (Math.abs(point.x - obj.x) < 0.05 && Math.abs(point.y - obj.y) < 0.05) return obj;
    changed = true;
    return { ...obj, x: point.x, y: point.y };
  });
  return changed ? next : objects;
}

function arrowPropsOnly(props) {
  const base = { ...props };
  delete base.x1;
  delete base.y1;
  delete base.x2;
  delete base.y2;
  delete base.joints;
  delete base.bind1;
  delete base.bind2;
  delete base.head;
  delete base.headStart;
  delete base.headEnd;
  return base;
}

function gluedToPoint(arrow, pointId) {
  return Boolean(
    (arrow.props.bind1?.point && arrow.props.bind1.id === pointId)
    || (arrow.props.bind2?.point && arrow.props.bind2.id === pointId),
  );
}

function arrowAngle(arrow) {
  const [start, end] = arrowEnds(arrow);
  return Math.atan2(end.y - start.y, end.x - start.x);
}

function directionGap(a, b) {
  let gap = Math.abs(a - b) % Math.PI;
  if (gap > Math.PI / 2) gap = Math.PI - gap;
  return gap;
}

function armsOf(objects, pointId) {
  return objects.filter((obj) => obj.type === 'arrow' && gluedToPoint(obj, pointId));
}

function lineMeet(p, q) {
  const rx = p.b.x - p.a.x;
  const ry = p.b.y - p.a.y;
  const sx = q.b.x - q.a.x;
  const sy = q.b.y - q.a.y;
  const den = rx * sy - ry * sx;
  if (Math.abs(den) < 1e-6) return null;
  const t = ((q.a.x - p.a.x) * sy - (q.a.y - p.a.y) * sx) / den;
  const u = ((q.a.x - p.a.x) * ry - (q.a.y - p.a.y) * rx) / den;
  if (p.clamp && (t < -0.05 || t > 1.05)) return null;
  if (q.clamp && (u < -0.05 || u > 1.05)) return null;
  return { x: p.a.x + rx * t, y: p.a.y + ry * t };
}

function crossFromArms(objects, pointId, shapeItem) {
  const arms = armsOf(objects, pointId);
  if (shapeItem && arms.length) return [shapeItem, { id: arms[0].id, edge: 0 }];
  if (arms.length < 2) return null;
  const other = arms.find((arm) => directionGap(arrowAngle(arms[0]), arrowAngle(arm)) > 0.08);
  if (!other) return null;
  return [{ id: arms[0].id, edge: 0 }, { id: other.id, edge: 0 }];
}

function holdNear(objects, point) {
  let shapeItem = null;
  let best = Infinity;
  objects.forEach((obj) => {
    if (obj.type !== 'shape') return;
    hostSegments(obj).forEach((line, edge) => {
      const dist = distToSegment(point, line[0], line[1]);
      if (dist > 10 || dist >= best) return;
      best = dist;
      shapeItem = { id: obj.id, edge };
    });
  });
  const linked = crossFromArms(objects, point.id, shapeItem);
  if (!linked) return null;
  const shape = shapeItem && objects.find((obj) => obj.id === shapeItem.id);
  const edge = shape && hostSegments(shape)[shapeItem.edge];
  const arm = objects.find((obj) => obj.id === linked[shapeItem ? 1 : 0].id);
  if (!arm) return null;
  const [start, end] = arrowEnds(arm);
  let at = null;
  if (edge) at = lineMeet({ a: start, b: end, clamp: false }, { a: edge[0], b: edge[1], clamp: true });
  else {
    const other = objects.find((obj) => obj.id === linked[1].id);
    const ends = other && arrowEnds(other);
    if (!ends) return null;
    at = lineMeet({ a: start, b: end, clamp: false }, { a: ends[0], b: ends[1], clamp: false });
  }
  if (!at || Math.hypot(at.x - point.x, at.y - point.y) > 12) return null;
  return linked;
}

export function cutArrows(objects, point, arrowIds, makeId) {
  const drop = new Set();
  const created = [];
  (arrowIds || []).forEach((id) => {
    if (drop.has(id)) return;
    const arrow = objects.find((obj) => obj.id === id && obj.type === 'arrow');
    if (!arrow) return;
    const [start, end] = arrowEnds(arrow);
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const len2 = dx * dx + dy * dy;
    if (len2 < 4) return;
    const t = ((point.x - start.x) * dx + (point.y - start.y) * dy) / len2;
    if (t <= 0.05 || t >= 0.95) return;
    const mid = { x: start.x + dx * t, y: start.y + dy * t };
    const glue = { id: point.id, point: true };
    const heads = arrowHeadState(arrow.props);
    const base = arrowPropsOnly(arrow.props);
    const piece = (from, to, bind1, bind2, headStart, headEnd) => ({
      id: makeId(),
      type: 'arrow',
      rotation: 0,
      ...arrowBounds(from, to, { ...base, bind1, bind2, head: false, headStart, headEnd }),
    });
    drop.add(id);
    created.push(
      piece(start, mid, arrow.props.bind1 || null, glue, heads.headStart, false),
      piece(mid, end, glue, arrow.props.bind2 || null, false, heads.headEnd),
    );
  });
  if (!drop.size) return objects;
  return releaseMissingBinds([...objects.filter((obj) => !drop.has(obj.id)), ...created]);
}

export function arrowUnderPoint(objects, point, zoom) {
  const limit = 14 / (zoom || 1);
  let best = null;
  (objects || []).forEach((obj) => {
    if (obj.type !== 'arrow') return;
    const [start, end] = arrowEnds(obj);
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const len2 = dx * dx + dy * dy;
    if (len2 < 4) return;
    const t = ((point.x - start.x) * dx + (point.y - start.y) * dy) / len2;
    if (t <= 0.06 || t >= 0.94) return;
    const at = { x: start.x + dx * t, y: start.y + dy * t };
    const dist = Math.hypot(point.x - at.x, point.y - at.y);
    if (dist > limit || (best && dist >= best.dist)) return;
    best = { dist, point: at, id: obj.id };
  });
  return best;
}

export function plantPoint(objects, pointId, zoom, makeId) {
  const point = objects.find((obj) => obj.id === pointId && obj.type === 'point');
  if (!point) return objects;
  const hit = nearestCrossing(objects, point, zoom, 16);
  const onArrow = hit ? null : arrowUnderPoint(objects, point, zoom);
  if (!hit && !onArrow) return objects;
  const place = hit?.point || onArrow.point;
  const arrowIds = [];
  let cross = null;
  let shapeItem = null;
  if (hit) {
    const shapeCross = [];
    hit.cross.forEach((item) => {
      const host = objects.find((obj) => obj.id === item.id);
      if (host?.type === 'arrow') {
        if (!gluedToPoint(host, pointId)) arrowIds.push(host.id);
      } else if (host) shapeCross.push(item);
    });
    if (!arrowIds.length && shapeCross.length === 2) cross = shapeCross;
    else if (shapeCross.length) shapeItem = shapeCross[0];
  } else {
    const host = objects.find((obj) => obj.id === onArrow.id);
    if (host && !gluedToPoint(host, pointId)) arrowIds.push(host.id);
  }
  let next = objects.map((obj) => (
    obj.id === pointId ? { ...obj, x: place.x, y: place.y, props: { ...obj.props, cross } } : obj
  ));
  if (arrowIds.length) {
    const seated = next.find((obj) => obj.id === pointId);
    next = cutArrows(next, seated, arrowIds, makeId);
    const linked = crossFromArms(next, pointId, shapeItem);
    if (linked) {
      next = next.map((obj) => (
        obj.id === pointId ? { ...obj, props: { ...obj.props, cross: linked } } : obj
      ));
    }
  }
  return retargetBound(next, [pointId]);
}

export function refreshPointHold(objects, pointId) {
  const point = objects.find((obj) => obj.id === pointId && obj.type === 'point');
  if (!point) return objects;
  const cross = holdNear(objects, point);
  const prev = point.props.cross || null;
  if (!cross && !prev) return objects;
  if (cross && prev && cross.length === prev.length && cross.every((item, index) => item.id === prev[index]?.id && item.edge === prev[index]?.edge)) {
    return objects;
  }
  return objects.map((obj) => (
    obj.id === pointId ? { ...obj, props: { ...obj.props, cross } } : obj
  ));
}

function intersectionFor(objects, point, movedArrow) {
  const shapeItem = (point.props.cross || []).find((item) => objects.find((obj) => obj.id === item.id)?.type === 'shape');
  const [start, end] = arrowEnds(movedArrow);
  const moving = { a: start, b: end, clamp: false };
  if (shapeItem) {
    const host = objects.find((obj) => obj.id === shapeItem.id);
    const edge = host && hostSegments(host)[shapeItem.edge];
    return edge ? lineMeet(moving, { a: edge[0], b: edge[1], clamp: true }) : null;
  }
  const other = armsOf(objects, point.id).find((arm) => (
    arm.id !== movedArrow.id && directionGap(arrowAngle(arm), arrowAngle(movedArrow)) > 0.08
  ));
  if (!other) {
    const atStart = movedArrow.props.bind1?.point && movedArrow.props.bind1.id === point.id;
    return atStart ? start : end;
  }
  const [a, b] = arrowEnds(other);
  return lineMeet(moving, { a, b, clamp: false });
}

export function slideSharedPoints(objects, movedIds) {
  const moved = new Set(movedIds);
  const shifts = new Map();
  objects.forEach((obj) => {
    if (!moved.has(obj.id) || obj.type !== 'arrow') return;
    [obj.props.bind1, obj.props.bind2].forEach((bind) => {
      if (!bind?.point || shifts.has(bind.id)) return;
      const point = objects.find((item) => item.id === bind.id && item.type === 'point');
      if (!point) return;
      const at = intersectionFor(objects, point, obj);
      if (!at) return;
      shifts.set(point.id, at);
    });
  });
  if (!shifts.size) return objects;
  const next = objects.map((obj) => {
    const at = shifts.get(obj.id);
    return at ? { ...obj, x: at.x, y: at.y } : obj;
  });
  return retargetBound(next, [...shifts.keys()]);
}

export function splitArrowThroughPoints(objects, arrowIds, makeId, zoom, ignoreIds) {
  const ignore = ignoreIds instanceof Set ? ignoreIds : new Set(ignoreIds || []);
  const limit = 14 / (zoom || 1);
  const drop = new Set();
  const created = [];
  (arrowIds || []).forEach((id) => {
    const arrow = objects.find((obj) => obj.id === id && obj.type === 'arrow');
    if (!arrow) return;
    const [start, end] = arrowEnds(arrow);
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const len2 = dx * dx + dy * dy;
    if (len2 < 16) return;
    const hits = [];
    objects.forEach((obj) => {
      if (obj.type !== 'point' || ignore.has(obj.id)) return;
      if (gluedToPoint(arrow, obj.id)) return;
      const t = ((obj.x - start.x) * dx + (obj.y - start.y) * dy) / len2;
      if (t <= 0.06 || t >= 0.94) return;
      const at = { x: start.x + dx * t, y: start.y + dy * t };
      if (Math.hypot(obj.x - at.x, obj.y - at.y) > limit) return;
      if (Math.hypot(obj.x - start.x, obj.y - start.y) < 8 || Math.hypot(obj.x - end.x, obj.y - end.y) < 8) return;
      hits.push({ t, point: obj });
    });
    hits.sort((left, right) => left.t - right.t);
    const knots = [];
    hits.forEach((hit) => {
      if (knots.some((item) => Math.hypot(item.point.x - hit.point.x, item.point.y - hit.point.y) < 6)) return;
      knots.push(hit);
    });
    if (!knots.length) return;
    const heads = arrowHeadState(arrow.props);
    const base = arrowPropsOnly(arrow.props);
    const spots = [
      { at: start, bind: arrow.props.bind1 || null },
      ...knots.map((hit) => ({ at: { x: hit.point.x, y: hit.point.y }, bind: { id: hit.point.id, point: true } })),
      { at: end, bind: arrow.props.bind2 || null },
    ];
    drop.add(id);
    for (let index = 0; index < spots.length - 1; index += 1) {
      const from = spots[index];
      const to = spots[index + 1];
      created.push({
        id: makeId(),
        type: 'arrow',
        rotation: 0,
        ...arrowBounds(from.at, to.at, {
          ...base,
          bind1: from.bind,
          bind2: to.bind,
          head: false,
          headStart: index === 0 ? heads.headStart : false,
          headEnd: index === spots.length - 2 ? heads.headEnd : false,
        }),
      });
    }
  });
  if (!drop.size) return objects;
  return releaseMissingBinds([...objects.filter((obj) => !drop.has(obj.id)), ...created]);
}

const JOIN_SLACK = 6;

function joinLine(arrows) {
  if (!arrows || arrows.length < 2) return null;
  let host = arrows[0];
  let hostLen = 0;
  arrows.forEach((arrow) => {
    const [start, end] = arrowEnds(arrow);
    const len = Math.hypot(end.x - start.x, end.y - start.y);
    if (len > hostLen) {
      host = arrow;
      hostLen = len;
    }
  });
  if (hostLen < 1) return null;
  const [origin, far] = arrowEnds(host);
  const dx = far.x - origin.x;
  const dy = far.y - origin.y;
  const ux = dx / hostLen;
  const uy = dy / hostLen;
  const along = (point) => (point.x - origin.x) * ux + (point.y - origin.y) * uy;
  const off = (point) => Math.abs((point.x - origin.x) * uy - (point.y - origin.y) * ux);
  let min = Infinity;
  let max = -Infinity;
  let minBind = null;
  let maxBind = null;
  let headStart = false;
  let headEnd = false;
  for (let index = 0; index < arrows.length; index += 1) {
    const arrow = arrows[index];
    const [start, end] = arrowEnds(arrow);
    if (off(start) > JOIN_SLACK || off(end) > JOIN_SLACK) return null;
    const heads = arrowHeadState(arrow.props);
    [
      { t: along(start), bind: arrow.props.bind1 || null, head: heads.headStart },
      { t: along(end), bind: arrow.props.bind2 || null, head: heads.headEnd },
    ].forEach((item) => {
      if (item.t < min - 0.5) {
        min = item.t;
        minBind = item.bind;
        headStart = item.head;
      } else if (item.t <= min + 0.5) {
        if (item.bind && !minBind) minBind = item.bind;
        if (item.head) headStart = true;
      }
      if (item.t > max + 0.5) {
        max = item.t;
        maxBind = item.bind;
        headEnd = item.head;
      } else if (item.t >= max - 0.5) {
        if (item.bind && !maxBind) maxBind = item.bind;
        if (item.head) headEnd = true;
      }
    });
  }
  if (!(max - min > 1)) return null;
  return {
    host,
    start: { x: origin.x + ux * min, y: origin.y + uy * min },
    end: { x: origin.x + ux * max, y: origin.y + uy * max },
    bind1: minBind,
    bind2: maxBind,
    headStart,
    headEnd,
  };
}

export function canJoinArrows(arrows) {
  return Boolean(joinLine(arrows));
}

export function joinArrows(objects, ids) {
  const arrows = (ids || [])
    .map((id) => objects.find((obj) => obj.id === id && obj.type === 'arrow'))
    .filter(Boolean);
  const plan = joinLine(arrows);
  if (!plan) return objects;
  const removed = new Set(arrows.map((arrow) => arrow.id));
  removed.delete(plan.host.id);
  const props = arrowPropsOnly(plan.host.props);
  const joined = {
    ...plan.host,
    ...arrowBounds(plan.start, plan.end, {
      ...props,
      bind1: plan.bind1,
      bind2: plan.bind2,
      head: false,
      headStart: plan.headStart,
      headEnd: plan.headEnd,
    }),
  };
  const next = objects
    .filter((obj) => !removed.has(obj.id))
    .map((obj) => {
      if (obj.id === joined.id) return joined;
      if (obj.type !== 'point' || !Array.isArray(obj.props.cross)) return obj;
      if (!obj.props.cross.some((item) => removed.has(item.id) || item.id === joined.id)) return obj;
      const shapeItem = obj.props.cross.find((item) => objects.find((host) => host.id === item.id)?.type === 'shape');
      return {
        ...obj,
        props: { ...obj.props, cross: shapeItem ? [shapeItem, { id: joined.id, edge: 0 }] : null },
      };
    });
  return releaseMissingBinds(next);
}
