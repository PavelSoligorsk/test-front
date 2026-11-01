import { arrowBounds, distToSegment } from '../geometry';
import { arrowHeadState, releaseMissingBinds, retargetBound } from './binding';
import { isSolid, modelOf, planeNodes } from './kinds';
import { labelVertices } from './labels';

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
      if (!bind?.point || shifts.has(bind.id) || moved.has(bind.id)) return;
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

export const SEGMENT_SLACK = 6;
export const JOIN_SLACK = 36;

function joinLine(arrows, slack = SEGMENT_SLACK) {
  if (!arrows || arrows.length < 2) return null;
  const ends = [];
  let host = arrows[0];
  let hostLen = 0;
  arrows.forEach((arrow) => {
    const [start, end] = arrowEnds(arrow);
    const len = Math.hypot(end.x - start.x, end.y - start.y);
    if (len > hostLen) {
      host = arrow;
      hostLen = len;
    }
    const heads = arrowHeadState(arrow.props);
    ends.push(
      { x: start.x, y: start.y, bind: arrow.props.bind1 || null, head: heads.headStart },
      { x: end.x, y: end.y, bind: arrow.props.bind2 || null, head: heads.headEnd },
    );
  });
  let farA = ends[0];
  let farB = ends[1];
  let span = -1;
  for (let i = 0; i < ends.length; i += 1) {
    for (let j = i + 1; j < ends.length; j += 1) {
      const dist = Math.hypot(ends[j].x - ends[i].x, ends[j].y - ends[i].y);
      if (dist > span) {
        span = dist;
        farA = ends[i];
        farB = ends[j];
      }
    }
  }
  if (!(span > 1)) return null;
  const ux = (farB.x - farA.x) / span;
  const uy = (farB.y - farA.y) / span;
  const along = (point) => (point.x - farA.x) * ux + (point.y - farA.y) * uy;
  const off = (point) => Math.abs((point.x - farA.x) * uy - (point.y - farA.y) * ux);
  if (ends.some((point) => off(point) > slack)) return null;
  let min = Infinity;
  let max = -Infinity;
  let minBind = null;
  let maxBind = null;
  let headStart = false;
  let headEnd = false;
  ends.forEach((item) => {
    const t = along(item);
    if (t < min - 0.5) {
      min = t;
      minBind = item.bind;
      headStart = item.head;
    } else if (t <= min + 0.5) {
      if (item.bind && !minBind) minBind = item.bind;
      if (item.head) headStart = true;
    }
    if (t > max + 0.5) {
      max = t;
      maxBind = item.bind;
      headEnd = item.head;
    } else if (t >= max - 0.5) {
      if (item.bind && !maxBind) maxBind = item.bind;
      if (item.head) headEnd = true;
    }
  });
  if (!(max - min > 1)) return null;
  return {
    host,
    start: { x: farA.x + ux * min, y: farA.y + uy * min },
    end: { x: farA.x + ux * max, y: farA.y + uy * max },
    bind1: minBind,
    bind2: maxBind,
    headStart,
    headEnd,
  };
}

export function canJoinArrows(arrows, slack = JOIN_SLACK) {
  return Boolean(joinLine(arrows, slack));
}

function lineHit(start, end, point, slack) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const len = Math.hypot(dx, dy);
  if (len < 1) return null;
  const ux = dx / len;
  const uy = dy / len;
  const vx = point.x - start.x;
  const vy = point.y - start.y;
  if (Math.abs(vx * uy - vy * ux) > slack) return null;
  const t = vx * ux + vy * uy;
  if (t < -slack || t > len + slack) return null;
  const clamped = Math.max(0, Math.min(len, t));
  return { x: start.x + ux * clamped, y: start.y + uy * clamped };
}

function pointBind(bind, dropPoints) {
  if (!bind) return null;
  if (bind.point && dropPoints.has(bind.id)) return null;
  return bind.point ? { id: bind.id, point: true } : bind;
}

export function joinArrows(objects, ids, slack = JOIN_SLACK) {
  const arrows = (ids || [])
    .map((id) => objects.find((obj) => obj.id === id && obj.type === 'arrow'))
    .filter(Boolean);
  const plan = joinLine(arrows, slack);
  if (!plan) return objects;
  const mergedIds = new Set(arrows.map((arrow) => arrow.id));
  const dropArrows = new Set(mergedIds);
  dropArrows.delete(plan.host.id);
  const usedOutside = new Set();
  objects.forEach((obj) => {
    if (obj.type !== 'arrow' || mergedIds.has(obj.id)) return;
    if (obj.props.bind1?.point) usedOutside.add(obj.props.bind1.id);
    if (obj.props.bind2?.point) usedOutside.add(obj.props.bind2.id);
  });
  const endIds = new Set([plan.bind1, plan.bind2].filter((bind) => bind?.point).map((bind) => bind.id));
  const dropPoints = new Set();
  const namedOnLine = new Set();
  arrows.forEach((arrow) => {
    [arrow.props.bind1, arrow.props.bind2].forEach((bind) => {
      if (!bind?.point) return;
      const point = objects.find((obj) => obj.id === bind.id && obj.type === 'point');
      if (point?.props.letter) namedOnLine.add(point.id);
      if (!point || endIds.has(bind.id) || usedOutside.has(bind.id) || point.props.letter) return;
      dropPoints.add(point.id);
    });
  });
  const startPoint = plan.bind1?.point ? objects.find((obj) => obj.id === plan.bind1.id && obj.type === 'point') : null;
  const endPoint = plan.bind2?.point ? objects.find((obj) => obj.id === plan.bind2.id && obj.type === 'point') : null;
  const start = startPoint && usedOutside.has(startPoint.id) ? { x: startPoint.x, y: startPoint.y } : plan.start;
  const end = endPoint && usedOutside.has(endPoint.id) ? { x: endPoint.x, y: endPoint.y } : plan.end;
  const props = arrowPropsOnly(plan.host.props);
  const joined = {
    ...plan.host,
    ...arrowBounds(start, end, {
      ...props,
      bind1: pointBind(plan.bind1, dropPoints),
      bind2: pointBind(plan.bind2, dropPoints),
      head: false,
      headStart: plan.headStart,
      headEnd: plan.headEnd,
    }),
  };
  const startId = joined.props.bind1?.point ? joined.props.bind1.id : null;
  const endId = joined.props.bind2?.point ? joined.props.bind2.id : null;
  const next = objects
    .filter((obj) => !dropArrows.has(obj.id) && !dropPoints.has(obj.id))
    .map((obj) => {
      if (obj.id === joined.id) return joined;
      if (obj.type !== 'point') return obj;
      const at = obj.id === startId
        ? start
        : obj.id === endId
          ? end
          : (namedOnLine.has(obj.id) && !usedOutside.has(obj.id) ? lineHit(start, end, obj, slack) : null);
      const role = obj.id === startId ? 'start' : obj.id === endId ? 'end' : (at ? 'mid' : null);
      const prevRail = obj.props.rail;
      const rail = role ? { id: joined.id, role } : (prevRail && mergedIds.has(prevRail.id) ? null : prevRail || null);
      let cross = obj.props.cross;
      if (Array.isArray(cross) && cross.some((item) => mergedIds.has(item.id))) {
        const shapeItem = cross.find((item) => objects.find((host) => host.id === item.id)?.type === 'shape');
        cross = shapeItem ? [shapeItem, { id: joined.id, edge: 0 }] : null;
      }
      const moved = at && (Math.abs(at.x - obj.x) > 0.05 || Math.abs(at.y - obj.y) > 0.05);
      if (!moved && rail === (prevRail || null) && cross === obj.props.cross) return obj;
      return {
        ...obj,
        x: at && !usedOutside.has(obj.id) ? at.x : obj.x,
        y: at && !usedOutside.has(obj.id) ? at.y : obj.y,
        props: { ...obj.props, rail, cross },
      };
    });
  return releaseMissingBinds(next);
}

function interiorSegment(point, objects) {
  let best = null;
  objects.forEach((obj) => {
    if (obj.type !== 'arrow') return;
    if (obj.props.bind1?.point && obj.props.bind1.id === point.id) return;
    if (obj.props.bind2?.point && obj.props.bind2.id === point.id) return;
    const [start, end] = arrowEnds(obj);
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const len = Math.hypot(dx, dy);
    if (len < 1) return;
    const ux = dx / len;
    const uy = dy / len;
    const vx = point.x - start.x;
    const vy = point.y - start.y;
    const off = Math.abs(vx * uy - vy * ux);
    if (off > SEGMENT_SLACK) return;
    const t = vx * ux + vy * uy;
    if (t <= SEGMENT_SLACK || t >= len - SEGMENT_SLACK) return;
    if (best && off >= best.off) return;
    best = { arrow: obj, off };
  });
  return best;
}

function lineOf(arrow) {
  const [start, end] = arrowEnds(arrow);
  const len = Math.hypot(end.x - start.x, end.y - start.y);
  if (len < 1) return null;
  return { ux: (end.x - start.x) / len, uy: (end.y - start.y) / len };
}

function collinearDirection(point, objects) {
  const arms = armsOf(objects, point.id).map(lineOf).filter(Boolean);
  for (let i = 0; i < arms.length; i += 1) {
    for (let j = i + 1; j < arms.length; j += 1) {
      const cross = Math.abs(arms[i].ux * arms[j].uy - arms[i].uy * arms[j].ux);
      if (cross < 0.15) return arms[i];
    }
  }
  return null;
}

export function railDrag(point, objects, dx, dy) {
  const alongLine = (ux, uy, shiftIds) => {
    const along = dx * ux + dy * uy;
    return { dx: ux * along, dy: uy * along, shiftIds };
  };
  const junction = collinearDirection(point, objects);
  if (junction) return alongLine(junction.ux, junction.uy, []);
  const stored = point?.props?.rail;
  let arrow = stored?.id ? objects.find((obj) => obj.id === stored.id && obj.type === 'arrow') : null;
  let slideOnly = stored?.role === 'mid';
  if (!arrow) {
    const hit = interiorSegment(point, objects);
    if (!hit) return { dx, dy, shiftIds: [] };
    arrow = hit.arrow;
    slideOnly = true;
  }
  const line = lineOf(arrow);
  if (!line) return { dx: 0, dy: 0, shiftIds: [] };
  if (slideOnly) return alongLine(line.ux, line.uy, []);
  const shiftIds = [arrow.id];
  [arrow.props.bind1, arrow.props.bind2].forEach((bind) => {
    if (bind?.point && bind.id !== point.id) shiftIds.push(bind.id);
  });
  return alongLine(line.ux, line.uy, shiftIds);
}

function pointObject(id, point, name = {}) {
  return {
    id,
    type: 'point',
    x: point.x,
    y: point.y,
    w: 8,
    h: 8,
    rotation: 0,
    props: { letter: name.letter || '', sub: name.sub || '', cross: null },
  };
}

function figureEdges(shape) {
  if (isSolid(shape.props?.shape)) {
    const model = modelOf(shape);
    return model.edges.map((edge) => [
      worldOf(shape, model.nodes[edge.a][0], model.nodes[edge.a][1]),
      worldOf(shape, model.nodes[edge.b][0], model.nodes[edge.b][1]),
    ]);
  }
  const nodes = planeNodes(shape.props?.shape, shape.props);
  if (!nodes?.length) return [];
  const closed = shape.props.shape !== 'polyline' || shape.props.closed;
  const count = closed ? nodes.length : Math.max(0, nodes.length - 1);
  const lines = [];
  for (let index = 0; index < count; index += 1) {
    const next = nodes[(index + 1) % nodes.length];
    lines.push([
      worldOf(shape, nodes[index][0], nodes[index][1]),
      worldOf(shape, next[0], next[1]),
    ]);
  }
  return lines;
}

export function separateShape(objects, shapeId, makeId) {
  const shape = objects.find((obj) => obj.id === shapeId && obj.type === 'shape');
  if (!shape) return objects;
  const edges = figureEdges(shape).filter((line) => Math.hypot(line[1].x - line[0].x, line[1].y - line[0].y) > 1);
  if (!edges.length) return objects;
  const named = (labelVertices(shape) || []).map((local, index) => ({
    x: shape.x + (local[0] / 100) * shape.w,
    y: shape.y + (local[1] / 100) * shape.h,
    letter: shape.props.names?.[index]?.letter || '',
    sub: shape.props.names?.[index]?.sub || '',
  }));
  const verts = [];
  const take = (point) => {
    const found = verts.find((item) => Math.hypot(item.x - point.x, item.y - point.y) < 1);
    if (found) return found;
    const name = named.find((item) => Math.hypot(item.x - point.x, item.y - point.y) < 1) || {};
    const next = { id: makeId(), x: point.x, y: point.y, letter: name.letter || '', sub: name.sub || '' };
    verts.push(next);
    return next;
  };
  const arrows = edges.map(([from, to]) => {
    const start = take(from);
    const end = take(to);
    return {
      id: makeId(),
      type: 'arrow',
      rotation: 0,
      ...arrowBounds(start, end, {
        color: shape.props.stroke || '#18181b',
        width: 2,
        head: false,
        dashed: Boolean(shape.props.dashed),
        bind1: { id: start.id, point: true },
        bind2: { id: end.id, point: true },
      }),
    };
  });
  const points = verts.map((item) => pointObject(item.id, item, item));
  return objects.filter((obj) => obj.id !== shape.id).concat(points, arrows);
}

function nearPoint(objects, at, slack) {
  return objects.find((obj) => obj.type === 'point' && Math.hypot(obj.x - at.x, obj.y - at.y) <= slack) || null;
}

function bindArrowEnd(arrow, which, at, pointId) {
  const [start, end] = arrowEnds(arrow);
  const from = which === 0 ? at : start;
  const to = which === 1 ? at : end;
  const bind1 = which === 0 ? { id: pointId, point: true } : (arrow.props.bind1 || null);
  const bind2 = which === 1 ? { id: pointId, point: true } : (arrow.props.bind2 || null);
  return { ...arrow, ...arrowBounds(from, to, { ...arrow.props, bind1, bind2, head: false }) };
}

function meetEnds(objects, makeId, slack) {
  const ends = [];
  objects.forEach((obj) => {
    if (obj.type !== 'arrow') return;
    const [start, end] = arrowEnds(obj);
    ends.push({ id: obj.id, which: 0, at: start }, { id: obj.id, which: 1, at: end });
  });
  const used = new Set();
  const groups = [];
  ends.forEach((_, index) => {
    if (used.has(index)) return;
    const group = [];
    const queue = [index];
    used.add(index);
    while (queue.length) {
      const current = queue.pop();
      group.push(ends[current]);
      ends.forEach((other, otherIndex) => {
        if (used.has(otherIndex) || other.id === ends[current].id) return;
        if (Math.hypot(other.at.x - ends[current].at.x, other.at.y - ends[current].at.y) > slack) return;
        used.add(otherIndex);
        queue.push(otherIndex);
      });
    }
    if (group.length >= 2) groups.push(group);
  });
  let next = objects;
  let changed = false;
  groups.forEach((group) => {
    const at = {
      x: group.reduce((sum, item) => sum + item.at.x, 0) / group.length,
      y: group.reduce((sum, item) => sum + item.at.y, 0) / group.length,
    };
    const sitting = nearPoint(next, at, slack);
    const glued = sitting && group.every((item) => {
      const arrow = next.find((obj) => obj.id === item.id);
      const bind = item.which === 0 ? arrow?.props.bind1 : arrow?.props.bind2;
      return bind?.point && bind.id === sitting.id;
    });
    if (glued) return;
    let point = nearPoint(next, at, slack);
    if (!point) {
      point = pointObject(makeId(), at);
      next = [...next, point];
    }
    next = next.map((obj) => {
      if (obj.type !== 'arrow') return obj;
      let arrow = obj;
      group.forEach((item) => {
        if (item.id !== obj.id) return;
        arrow = bindArrowEnd(arrow, item.which, { x: point.x, y: point.y }, point.id);
      });
      return arrow;
    });
    changed = true;
  });
  return changed ? next : objects;
}

function crossingHit(a, b, c, d) {
  const rx = b.x - a.x;
  const ry = b.y - a.y;
  const sx = d.x - c.x;
  const sy = d.y - c.y;
  const den = rx * sy - ry * sx;
  if (Math.abs(den) < 1e-6) return null;
  const t = ((c.x - a.x) * sy - (c.y - a.y) * sx) / den;
  const u = ((c.x - a.x) * ry - (c.y - a.y) * rx) / den;
  if (t < -0.02 || t > 1.02 || u < -0.02 || u > 1.02) return null;
  const interior = (value) => value > 0.06 && value < 0.94;
  if (!interior(t) && !interior(u)) return null;
  return { x: a.x + rx * t, y: a.y + ry * t, t, u };
}

function splitCrossings(objects, makeId, slack) {
  const arrows = objects.filter((obj) => obj.type === 'arrow');
  for (let i = 0; i < arrows.length; i += 1) {
    for (let j = i + 1; j < arrows.length; j += 1) {
      const [a0, a1] = arrowEnds(arrows[i]);
      const [b0, b1] = arrowEnds(arrows[j]);
      const hit = crossingHit(a0, a1, b0, b1);
      if (!hit) continue;
      let point = nearPoint(objects, hit, slack);
      let next = objects;
      if (!point) {
        point = pointObject(makeId(), hit);
        next = [...objects, point];
      }
      const interior = (value) => value > 0.06 && value < 0.94;
      if (interior(hit.t)) next = cutArrows(next, point, [arrows[i].id], makeId);
      const seated = next.find((obj) => obj.id === point.id) || point;
      if (interior(hit.u)) next = cutArrows(next, seated, [arrows[j].id], makeId);
      if (!interior(hit.t) || !interior(hit.u)) {
        next = next.map((obj) => {
          if (obj.id === arrows[i].id && !interior(hit.t)) return bindArrowEnd(obj, hit.t < 0.5 ? 0 : 1, seated, seated.id);
          if (obj.id === arrows[j].id && !interior(hit.u)) return bindArrowEnd(obj, hit.u < 0.5 ? 0 : 1, seated, seated.id);
          return obj;
        });
      }
      return next;
    }
  }
  return objects;
}

export function weaveSegments(objects, makeId, slack = SEGMENT_SLACK) {
  let next = objects;
  for (let pass = 0; pass < 8; pass += 1) {
    const met = meetEnds(next, makeId, slack);
    const split = splitCrossings(met, makeId, slack);
    if (split === next) return next;
    next = split;
  }
  return next;
}
