import { arrowBounds, clamp, distToSegment, pointInPolygon } from '../geometry';
import { convexHull, isSolid, modelOf, planeNodes, pyramidBaseOf } from './kinds';
import { retargetMarks } from './points';

// Привязки концов отрезков, вершин ломаной и основания пирамиды к фигурам.
//
// Привязка хранится у того, кто привязан, и целиком описывает точку на хосте:
//   { id, index }          — вершина хоста;
//   { id, edge, t }        — точка на ребре (доля t от начала ребра);
//   { id, rim, rimIndex }  — точка на окружности или ободе тела (угол rim).
// Хост при этом не меняется, поэтому двое могут одновременно привязываться к одной
// фигуре, не перетирая друг другу props. Старый формат { id, joint } ссылался на
// props.joints хоста; он читается и при первом пересчёте переводится в новый.

function round1(value) {
  return Math.round(value * 10) / 10;
}

function worldOf(shape, u, v) {
  return { x: shape.x + (u / 100) * shape.w, y: shape.y + (v / 100) * shape.h };
}

function projectEllipse(point, shape, rim, rimIndex) {
  const cx = shape.x + (rim.cx / 100) * shape.w;
  const cy = shape.y + (rim.cy / 100) * shape.h;
  const rx = (rim.rx / 100) * shape.w;
  const ry = (rim.ry / 100) * shape.h;
  if (rx < 0.5 || ry < 0.5) return null;
  const dx = (point.x - cx) / rx;
  const dy = (point.y - cy) / ry;
  if (dx * dx + dy * dy < 1e-8) return null;
  const angle = Math.atan2(dy, dx);
  const projected = { x: cx + Math.cos(angle) * rx, y: cy + Math.sin(angle) * ry };
  return { point: projected, dist: Math.hypot(point.x - projected.x, point.y - projected.y), angle, rimIndex };
}

export function hitShapeContour(shape, point, zoom) {
  if (!shape || shape.type !== 'shape' || !point) return false;
  const limit = 12 / (zoom || 1);
  const id = shape.props?.shape;
  const nearPoint = (item) => Math.hypot(point.x - item.x, point.y - item.y) <= limit;
  const nearEdge = (a, b) => distToSegment(point, a, b) <= limit;
  if (isSolid(id)) {
    const model = modelOf(shape);
    if (model.edges.some((edge) => nearEdge(
      worldOf(shape, model.nodes[edge.a][0], model.nodes[edge.a][1]),
      worldOf(shape, model.nodes[edge.b][0], model.nodes[edge.b][1]),
    ))) return true;
    if ((model.rims || []).some((rim) => {
      const hit = projectEllipse(point, shape, rim, 0);
      return hit && hit.dist <= limit;
    })) return true;
    return model.nodes.some((node) => nearPoint(worldOf(shape, node[0], node[1])));
  }
  if (id === 'circle') {
    const hit = projectEllipse(point, shape, { cx: 50, cy: 50, rx: 42, ry: 42 }, 0);
    return Boolean(hit && hit.dist <= limit);
  }
  const nodes = planeNodes(id, shape.props);
  if (!nodes?.length) return false;
  const world = nodes.map((node) => worldOf(shape, node[0], node[1]));
  const closed = id !== 'polyline' || shape.props?.closed;
  const count = closed ? world.length : Math.max(0, world.length - 1);
  for (let index = 0; index < count; index += 1) {
    if (nearEdge(world[index], world[(index + 1) % world.length])) return true;
  }
  return world.some(nearPoint);
}

export function jointLocal(shape, joint) {
  if (Number.isFinite(joint?.rim) && Number.isInteger(joint?.rimIndex) && isSolid(shape.props?.shape)) {
    const rim = modelOf(shape).rims?.[joint.rimIndex];
    if (!rim) return [50, 50];
    return [rim.cx + Math.cos(joint.rim) * rim.rx, rim.cy + Math.sin(joint.rim) * rim.ry];
  }
  if (Number.isFinite(joint?.rim)) return [50 + Math.cos(joint.rim) * 42, 50 + Math.sin(joint.rim) * 42];
  if (isSolid(shape.props?.shape)) {
    const model = modelOf(shape);
    const edge = model.edges[joint?.edge];
    if (!edge) return [50, 50];
    const a = model.nodes[edge.a];
    const b = model.nodes[edge.b];
    const t = Number(joint.t) || 0;
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  }
  const nodes = planeNodes(shape.props?.shape, shape.props);
  const a = nodes?.[joint?.edge];
  const b = nodes?.[(joint.edge + 1) % nodes.length];
  if (!a || !b) return [50, 50];
  const t = Number(joint.t) || 0;
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

function projectSegment(point, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy || 1;
  const t = clamp(((point.x - a.x) * dx + (point.y - a.y) * dy) / len2, 0, 1);
  const projected = { x: a.x + dx * t, y: a.y + dy * t };
  return { t, point: projected, dist: Math.hypot(point.x - projected.x, point.y - projected.y) };
}

function projectRim(point, shape) {
  const cx = shape.x + shape.w * 0.5;
  const cy = shape.y + shape.h * 0.5;
  const rx = shape.w * 0.42;
  const ry = shape.h * 0.42;
  if (rx < 1 || ry < 1) return null;
  const dx = (point.x - cx) / rx;
  const dy = (point.y - cy) / ry;
  if (dx * dx + dy * dy < 1e-8) return null;
  const angle = Math.atan2(dy, dx);
  const projected = { x: cx + Math.cos(angle) * rx, y: cy + Math.sin(angle) * ry };
  return { point: projected, dist: Math.hypot(point.x - projected.x, point.y - projected.y), angle };
}

function arrowEnds(host) {
  return [
    { x: host.x + host.props.x1, y: host.y + host.props.y1 },
    { x: host.x + host.props.x2, y: host.y + host.props.y2 },
  ];
}

function considerNode(hit, dist, point, bind) {
  if (!hit || dist < hit.dist) return { dist, point, bind };
  return hit;
}

function considerEdge(hit, dist, point, spec) {
  if (!hit || dist < hit.dist) return { dist, point, spec };
  return hit;
}

// Хост дальше своей рамки (с запасом на основание пирамиды, вынесенное за рамку)
// точку не притянет: без этого на каждое движение мыши строились модели всех тел доски.
function nearHost(host, point, radius) {
  const reach = radius + 0.25 * Math.max(host.w || 0, host.h || 0);
  return point.x >= host.x - reach && point.y >= host.y - reach
    && point.x <= host.x + (host.w || 0) + reach && point.y <= host.y + (host.h || 0) + reach;
}

export function snapFigurePoint(point, hosts, zoom, ignoreId) {
  const nodeR = 16 / (zoom || 1);
  const edgeR = 12 / (zoom || 1);
  let nodeHit = null;
  let edgeHit = null;
  hosts.forEach((host) => {
    if (!host || host.id === ignoreId) return;
    if (host.type === 'point') {
      const dist = Math.hypot(point.x - host.x, point.y - host.y);
      if (dist <= nodeR) nodeHit = considerNode(nodeHit, dist, { x: host.x, y: host.y }, { id: host.id, point: true });
      return;
    }
    if ((host.type !== 'arrow' && host.type !== 'shape') || !nearHost(host, point, nodeR)) return;
    if (host.type === 'arrow') {
      const [start, end] = arrowEnds(host);
      const startDist = Math.hypot(point.x - start.x, point.y - start.y);
      const endDist = Math.hypot(point.x - end.x, point.y - end.y);
      if (startDist <= nodeR) nodeHit = considerNode(nodeHit, startDist, start, { id: host.id, index: 0 });
      if (endDist <= nodeR) nodeHit = considerNode(nodeHit, endDist, end, { id: host.id, index: 1 });
      const projected = projectSegment(point, start, end);
      if (projected.t > 0.07 && projected.t < 0.93 && projected.dist <= edgeR) {
        edgeHit = considerEdge(edgeHit, projected.dist, projected.point, { id: host.id, edge: 0, t: projected.t });
      }
      return;
    }
    if (host.type !== 'shape') return;
    const id = host.props?.shape;
    if (isSolid(id)) {
      const model = modelOf(host);
      model.nodes.forEach((node, index) => {
        const world = worldOf(host, node[0], node[1]);
        const dist = Math.hypot(point.x - world.x, point.y - world.y);
        if (dist <= nodeR) nodeHit = considerNode(nodeHit, dist, world, { id: host.id, index });
      });
      model.edges.forEach((edge, index) => {
        const a = worldOf(host, model.nodes[edge.a][0], model.nodes[edge.a][1]);
        const b = worldOf(host, model.nodes[edge.b][0], model.nodes[edge.b][1]);
        if (Math.hypot(b.x - a.x, b.y - a.y) < 1) return;
        const projected = projectSegment(point, a, b);
        if (projected.t < 0.07 || projected.t > 0.93 || projected.dist > edgeR) return;
        edgeHit = considerEdge(edgeHit, projected.dist, projected.point, { id: host.id, edge: index, t: projected.t });
      });
      (model.rims || []).forEach((rim, rimIndex) => {
        const hit = projectEllipse(point, host, rim, rimIndex);
        if (!hit || hit.dist > edgeR) return;
        const onNode = model.nodes.some((node) => {
          const world = worldOf(host, node[0], node[1]);
          return Math.hypot(hit.point.x - world.x, hit.point.y - world.y) < nodeR * 0.75;
        });
        if (onNode) return;
        edgeHit = considerEdge(edgeHit, hit.dist, hit.point, { id: host.id, rim: hit.angle, rimIndex });
      });
      return;
    }
    const nodes = planeNodes(id, host.props);
    if (!nodes) return;
    nodes.forEach((node, index) => {
      const world = worldOf(host, node[0], node[1]);
      const dist = Math.hypot(point.x - world.x, point.y - world.y);
      if (dist <= nodeR) nodeHit = considerNode(nodeHit, dist, world, { id: host.id, index });
    });
    if (id === 'circle') {
      const rim = projectRim(point, host);
      if (!rim || rim.dist > edgeR) return;
      const onNode = nodes.some((node) => {
        const world = worldOf(host, node[0], node[1]);
        return Math.hypot(rim.point.x - world.x, rim.point.y - world.y) < nodeR * 0.75;
      });
      if (onNode) return;
      edgeHit = considerEdge(edgeHit, rim.dist, rim.point, { id: host.id, rim: rim.angle });
      return;
    }
    const edges = id === 'polyline' && !host.props?.closed ? nodes.length - 1 : nodes.length;
    for (let index = 0; index < edges; index += 1) {
      const a = worldOf(host, nodes[index][0], nodes[index][1]);
      const next = nodes[(index + 1) % nodes.length];
      const b = worldOf(host, next[0], next[1]);
      const projected = projectSegment(point, a, b);
      if (projected.t < 0.07 || projected.t > 0.93 || projected.dist > edgeR) continue;
      edgeHit = considerEdge(edgeHit, projected.dist, projected.point, { id: host.id, edge: index, t: projected.t });
    }
  });
  if (nodeHit && (!edgeHit || nodeHit.dist <= edgeHit.dist)) {
    return { point: nodeHit.point, bind: nodeHit.bind, dist: nodeHit.dist };
  }
  if (edgeHit) return { point: edgeHit.point, spec: edgeHit.spec, dist: edgeHit.dist };
  return { point, dist: Infinity };
}

/** Привязка из результата snapFigurePoint: вершина или точка на ребре/ободе. */
export function bindFromHit(hit) {
  if (hit?.bind) return hit.bind;
  const spec = hit?.spec;
  if (!spec) return null;
  if (Number.isFinite(spec.rim)) {
    return { id: spec.id, rim: spec.rim, ...(Number.isInteger(spec.rimIndex) ? { rimIndex: spec.rimIndex } : {}) };
  }
  return { id: spec.id, edge: spec.edge, t: spec.t };
}

/** Точка привязки в новом формате. Старый { joint } переводится по props.joints хоста. */
export function bindSpec(bind, host) {
  if (!bind || !host) return null;
  if (!bind.joint) return bind;
  const joint = (host.props?.joints || []).find((item) => item.id === bind.joint);
  if (!joint) return null;
  if (Number.isFinite(joint.rim)) {
    return { id: bind.id, rim: joint.rim, ...(Number.isInteger(joint.rimIndex) ? { rimIndex: joint.rimIndex } : {}) };
  }
  return { id: bind.id, edge: joint.edge, t: Number(joint.t) || 0 };
}

function indexById(objects) {
  return new Map(objects.map((obj) => [obj.id, obj]));
}

function upgradeBind(bind, index) {
  if (!bind?.joint) return bind || null;
  return bindSpec(bind, index.get(bind.id)) || bind;
}

export function boundPoint(bind, objects, index = null) {
  if (!bind) return null;
  const host = index ? index.get(bind.id) : objects.find((obj) => obj.id === bind.id);
  if (!host) return null;
  if (bind.point) return host.type === 'point' ? { x: host.x, y: host.y } : null;
  if (host.type === 'arrow') {
    const [start, end] = arrowEnds(host);
    if (bind.index === 0) return start;
    if (bind.index === 1) return end;
    const spec = bindSpec(bind, host);
    if (!spec) return null;
    const t = Number(spec.t) || 0;
    return { x: start.x + (end.x - start.x) * t, y: start.y + (end.y - start.y) * t };
  }
  if (host.type !== 'shape') return null;
  if (Number.isInteger(bind.index)) {
    const node = isSolid(host.props.shape)
      ? modelOf(host).nodes[bind.index]
      : planeNodes(host.props.shape, host.props)?.[bind.index];
    return node ? worldOf(host, node[0], node[1]) : null;
  }
  const spec = bindSpec(bind, host);
  if (!spec) return null;
  const [u, v] = jointLocal(host, spec);
  return worldOf(host, u, v);
}

/** Точки, к которым привязаны другие объекты: хост рисует их у себя. */
export function incomingJoints(objects) {
  const byHost = new Map();
  const add = (bind, sourceId, slot) => {
    if (!bind || bind.joint || Number.isInteger(bind.index)) return;
    if (!Number.isFinite(bind.rim) && !Number.isInteger(bind.edge)) return;
    if (!byHost.has(bind.id)) byHost.set(bind.id, []);
    byHost.get(bind.id).push({
      id: `${sourceId}:${slot}`,
      edge: bind.edge,
      t: bind.t,
      rim: bind.rim,
      rimIndex: bind.rimIndex,
    });
  };
  objects.forEach((obj) => {
    if (obj.type === 'arrow') {
      add(obj.props?.bind1, obj.id, 'a');
      add(obj.props?.bind2, obj.id, 'b');
    } else if (obj.type === 'shape') {
      (obj.props?.binds || []).forEach((bind, index) => add(bind, obj.id, `v${index}`));
      (obj.props?.baseBinds || []).forEach((bind, index) => add(bind, obj.id, `b${index}`));
    }
  });
  return byHost;
}

export function jointsKey(list) {
  if (!list?.length) return '';
  return list.map((joint) => `${joint.id}|${joint.edge ?? ''}|${joint.t ?? ''}|${joint.rim ?? ''}|${joint.rimIndex ?? ''}`).join(';');
}

export function polylineWorld(shape) {
  const nodes = planeNodes(shape.props?.shape, shape.props) || [];
  return nodes.map((node) => ({
    x: shape.x + (node[0] / 100) * shape.w,
    y: shape.y + (node[1] / 100) * shape.h,
  }));
}

export function movePolylineVertex(shape, index, point) {
  const world = polylineWorld(shape);
  if (!world[index]) return shape;
  world[index] = point;
  const binds = Array.isArray(shape.props.binds) ? shape.props.binds.slice() : world.map(() => null);
  binds[index] = null;
  return { ...shape, ...polylineFrame(world, { ...shape.props, binds }) };
}

export function bindPolylineVertex(objects, shapeId, index, zoom) {
  const shape = objects.find((obj) => obj.id === shapeId);
  if (!shape) return objects;
  const world = polylineWorld(shape);
  if (!world[index]) return objects;
  const hosts = objects.filter((obj) => obj.id !== shapeId);
  const hit = settleSnap(snapFigurePoint(world[index], hosts, zoom, shapeId), hosts);
  const binds = Array.isArray(shape.props.binds) ? shape.props.binds.slice() : world.map(() => null);
  binds[index] = bindFromHit(hit);
  world[index] = hit.point;
  const frame = polylineFrame(world, { ...shape.props, binds });
  const next = objects.map((obj) => (obj.id === shapeId ? { ...shape, ...frame } : obj));
  return retargetBound(next, [shapeId]);
}

export function polylineFrame(points, props) {
  const pad = 18;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  points.forEach((item) => {
    minX = Math.min(minX, item.x);
    minY = Math.min(minY, item.y);
    maxX = Math.max(maxX, item.x);
    maxY = Math.max(maxY, item.y);
  });
  if (!Number.isFinite(minX)) {
    minX = 0;
    minY = 0;
    maxX = 0;
    maxY = 0;
  }
  const x = minX - pad;
  const y = minY - pad;
  const w = Math.max(36, maxX - minX + pad * 2);
  const h = Math.max(36, maxY - minY + pad * 2);
  return {
    x,
    y,
    w,
    h,
    props: {
      ...props,
      points: points.map((item) => [((item.x - x) / w) * 100, ((item.y - y) / h) * 100]),
    },
  };
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

/** Попадание по фигуре: по контуру всегда, по заливке — если она есть. */
export function hitShape(shape, point, zoom) {
  if (hitShapeContour(shape, point, zoom)) return true;
  const fill = shape.props?.fill;
  if (!fill || fill === 'none') return false;
  return insideClosed(point, shape);
}

/** Снять привязки к хостам, у которых сменился вид: номера вершин и рёбер больше ничего не значат. */
export function dropBindsTo(objects, hostIds) {
  const ids = new Set(hostIds);
  if (!ids.size) return objects;
  const keep = (bind) => (bind && !ids.has(bind.id) ? bind : null);
  let changed = false;
  const next = objects.map((obj) => {
    if (obj.type === 'arrow') {
      const bind1 = keep(obj.props.bind1);
      const bind2 = keep(obj.props.bind2);
      if ((obj.props.bind1 || null) === bind1 && (obj.props.bind2 || null) === bind2) return obj;
      changed = true;
      return { ...obj, props: { ...obj.props, bind1, bind2 } };
    }
    if (obj.type !== 'shape') return obj;
    const binds = Array.isArray(obj.props.binds) ? obj.props.binds.map(keep) : null;
    const baseBinds = Array.isArray(obj.props.baseBinds) ? obj.props.baseBinds.map(keep) : null;
    const same = (list, prev) => !list || list.every((bind, index) => bind === (prev[index] || null));
    if (same(binds, obj.props.binds || []) && same(baseBinds, obj.props.baseBinds || [])) return obj;
    changed = true;
    return { ...obj, props: { ...obj.props, ...(binds ? { binds } : {}), ...(baseBinds ? { baseBinds } : {}) } };
  });
  return changed ? pruneJoints(next) : objects;
}

function insideClosed(point, host) {
  if (host.type !== 'shape') return false;
  if (isSolid(host.props.shape)) {
    const model = modelOf(host);
    const shell = convexHull(model.shell?.length >= 3 ? model.shell : model.nodes);
    if (shell.length < 3) return false;
    return pointInPolygon(point, shell.map((node) => worldOf(host, node[0], node[1])));
  }
  if (host.props.shape === 'polyline' && !host.props.closed) return false;
  if (host.props.shape === 'circle') {
    const dx = (point.x - (host.x + host.w / 2)) / (host.w * 0.42 || 1);
    const dy = (point.y - (host.y + host.h / 2)) / (host.h * 0.42 || 1);
    return dx * dx + dy * dy <= 1;
  }
  const nodes = planeNodes(host.props.shape, host.props);
  if (!nodes || nodes.length < 3) return false;
  return pointInPolygon(point, nodes.map((node) => worldOf(host, node[0], node[1])));
}

function anchorEdge(host, anchor) {
  if (Number.isInteger(anchor.spec?.edge)) return anchor.spec.edge;
  return bindSpec(anchor.bind, host)?.edge;
}

function incidentLines(host, anchor) {
  const lines = hostSegments(host);
  if (host.type === 'arrow') return lines;
  if (host.type === 'shape' && isSolid(host.props?.shape)) {
    const model = modelOf(host);
    if (Number.isInteger(anchor.bind?.index)) {
      const index = anchor.bind.index;
      return lines.filter((_, edge) => model.edges[edge].a === index || model.edges[edge].b === index);
    }
    const edge = anchorEdge(host, anchor);
    if (Number.isInteger(edge) && lines[edge]) return [lines[edge]];
    return [];
  }
  if (Number.isInteger(anchor.bind?.index)) {
    const index = anchor.bind.index;
    const nodes = planeNodes(host.props.shape, host.props) || [];
    const closed = host.props.shape !== 'polyline' || host.props.closed;
    return lines.filter((_, edge) => edge === index || (closed ? (edge + 1) % nodes.length : edge + 1) === index);
  }
  const edge = anchorEdge(host, anchor);
  if (Number.isInteger(edge) && lines[edge]) return [lines[edge]];
  return [];
}

export function settleSnap(hit, objects) {
  if (!hit?.bind || !Number.isInteger(hit.bind.index)) return hit;
  const host = objects.find((obj) => obj.id === hit.bind.id);
  if (!host || host.type !== 'arrow') return hit;
  const inner = hit.bind.index === 0 ? host.props.bind1 : host.props.bind2;
  if (!inner || inner.id === host.id) return hit;
  const point = boundPoint(inner, objects);
  if (!point) return hit;
  return { ...hit, point, bind: inner };
}

export function extendStraight(cursor, anchor, objects, zoom) {
  const hostId = anchor?.bind?.id || anchor?.spec?.id;
  if (!hostId) return null;
  const host = objects.find((obj) => obj.id === hostId);
  if (!host || insideClosed(cursor, host)) return null;
  const origin = anchor.point || (Number.isFinite(anchor.x) ? { x: anchor.x, y: anchor.y } : null);
  if (!origin) return null;
  const scale = zoom || 1;
  const travel = Math.hypot(cursor.x - origin.x, cursor.y - origin.y);
  if (travel < 40 / scale) return null;
  const limit = Math.min(8 / scale, travel * 0.1);
  const found = [];
  incidentLines(host, anchor).forEach(([a, b]) => {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len2 = dx * dx + dy * dy;
    if (len2 < 1) return;
    const t = ((cursor.x - a.x) * dx + (cursor.y - a.y) * dy) / len2;
    if (t > -0.04 && t < 1.04) return;
    const point = { x: a.x + dx * t, y: a.y + dy * t };
    const dist = Math.hypot(cursor.x - point.x, cursor.y - point.y);
    if (dist > limit) return;
    const from = t > 1 ? b : a;
    const angle = Math.atan2(dy, dx);
    found.push({
      dist,
      point,
      angle: angle < 0 ? angle + Math.PI : angle,
      guide: { x1: from.x, y1: from.y, x2: point.x, y2: point.y },
    });
  });
  found.sort((left, right) => left.dist - right.dist);
  if (!found.length) return null;
  const sameLine = (left, right) => Math.abs(left.angle - right.angle) < 0.15 || Math.abs(left.angle - right.angle) > Math.PI - 0.15;
  if (found.length > 1 && !sameLine(found[0], found[1]) && found[1].dist < found[0].dist + 4 / scale) return null;
  return found[0];
}

export function retargetArrows(objects, shapeIds) {
  const ids = new Set(shapeIds);
  const index = indexById(objects);
  let changed = false;
  const next = objects.map((obj) => {
    if (obj.type !== 'arrow') return obj;
    const startBind = obj.props.bind1;
    const endBind = obj.props.bind2;
    if (!((startBind && ids.has(startBind.id)) || (endBind && ids.has(endBind.id)))) return obj;
    const start = startBind ? boundPoint(startBind, objects, index) : { x: obj.x + obj.props.x1, y: obj.y + obj.props.y1 };
    const end = endBind ? boundPoint(endBind, objects, index) : { x: obj.x + obj.props.x2, y: obj.y + obj.props.y2 };
    if (!start || !end) return obj;
    changed = true;
    return {
      ...obj,
      ...arrowBounds(start, end, { ...obj.props, bind1: upgradeBind(startBind, index), bind2: upgradeBind(endBind, index) }),
    };
  });
  return changed ? next : objects;
}

function noteJoint(used, bind) {
  if (bind?.joint) used.add(`${bind.id}:${bind.joint}`);
}

export function pruneJoints(objects) {
  const used = new Set();
  objects.forEach((obj) => {
    if (obj.type === 'arrow') {
      noteJoint(used, obj.props.bind1);
      noteJoint(used, obj.props.bind2);
    }
    if (obj.type === 'shape' && Array.isArray(obj.props.binds)) obj.props.binds.forEach((bind) => noteJoint(used, bind));
    if (obj.type === 'shape' && Array.isArray(obj.props.baseBinds)) obj.props.baseBinds.forEach((bind) => noteJoint(used, bind));
  });
  let changed = false;
  const next = objects.map((obj) => {
    if ((obj.type !== 'shape' && obj.type !== 'arrow') || !obj.props.joints?.length) return obj;
    const joints = obj.props.joints.filter((joint) => used.has(`${obj.id}:${joint.id}`));
    if (joints.length === obj.props.joints.length) return obj;
    changed = true;
    return { ...obj, props: { ...obj.props, joints } };
  });
  return changed ? next : objects;
}

export function bindArrowEnds(objects, arrowId, zoom) {
  const arrow = objects.find((obj) => obj.id === arrowId);
  if (!arrow || arrow.type !== 'arrow') return objects;
  const hosts = objects.filter((obj) => obj.id !== arrowId);
  const start = snapFigurePoint({ x: arrow.x + arrow.props.x1, y: arrow.y + arrow.props.y1 }, hosts, zoom, arrowId);
  const end = snapFigurePoint({ x: arrow.x + arrow.props.x2, y: arrow.y + arrow.props.y2 }, hosts, zoom, arrowId);
  const bounded = arrowBounds(start.point, end.point, { ...arrow.props, bind1: bindFromHit(start), bind2: bindFromHit(end) });
  return pruneJoints(objects.map((obj) => (obj.id === arrowId ? { ...arrow, ...bounded } : obj)));
}

export function releaseMissingBinds(objects) {
  const hosts = new Set(objects.filter((obj) => obj.type === 'shape' || obj.type === 'arrow' || obj.type === 'point').map((obj) => obj.id));
  const next = objects.map((obj) => {
    if (obj.type === 'arrow') {
      const bind1 = obj.props.bind1 && hosts.has(obj.props.bind1.id) ? obj.props.bind1 : null;
      const bind2 = obj.props.bind2 && hosts.has(obj.props.bind2.id) ? obj.props.bind2 : null;
      if ((obj.props.bind1 || null) === bind1 && (obj.props.bind2 || null) === bind2) return obj;
      return { ...obj, props: { ...obj.props, bind1, bind2 } };
    }
    if (obj.type === 'shape' && (Array.isArray(obj.props.binds) || Array.isArray(obj.props.baseBinds))) {
      const binds = Array.isArray(obj.props.binds)
        ? obj.props.binds.map((bind) => (bind && hosts.has(bind.id) ? bind : null))
        : null;
      const baseBinds = Array.isArray(obj.props.baseBinds)
        ? obj.props.baseBinds.map((bind) => (bind && hosts.has(bind.id) ? bind : null))
        : null;
      const sameBinds = !binds || binds.every((bind, index) => (bind || null) === (obj.props.binds[index] || null));
      const sameBase = !baseBinds || baseBinds.every((bind, index) => (bind || null) === (obj.props.baseBinds[index] || null));
      if (sameBinds && sameBase) return obj;
      return {
        ...obj,
        props: {
          ...obj.props,
          ...(binds ? { binds } : {}),
          ...(baseBinds ? { baseBinds } : {}),
        },
      };
    }
    return obj;
  });
  return pruneJoints(next);
}

export function retargetPolylines(objects, hostIds) {
  const ids = new Set(hostIds);
  const index = indexById(objects);
  let changed = false;
  const next = objects.map((obj) => {
    if (obj.type !== 'shape' || obj.props.shape !== 'polyline' || !Array.isArray(obj.props.binds)) return obj;
    if (!obj.props.binds.some((bind) => bind && ids.has(bind.id))) return obj;
    const nodes = planeNodes(obj.props.shape, obj.props);
    if (!nodes?.length) return obj;
    const world = nodes.map((node, slot) => {
      const bind = obj.props.binds[slot];
      return (bind && boundPoint(bind, objects, index)) || worldOf(obj, node[0], node[1]);
    });
    changed = true;
    const binds = obj.props.binds.map((bind) => upgradeBind(bind, index));
    return { ...obj, ...polylineFrame(world, { ...obj.props, binds }) };
  });
  return changed ? next : objects;
}

export function bindPyramidBase(objects, shapeId, index, zoom) {
  const shape = objects.find((obj) => obj.id === shapeId);
  if (!shape || shape.props.shape !== 'pyramid3') return objects;
  const base = pyramidBaseOf(shape);
  if (!base[index]) return objects;
  const world = worldOf(shape, base[index][0], base[index][1]);
  const hosts = objects.filter((obj) => obj.id !== shapeId);
  const hit = settleSnap(snapFigurePoint(world, hosts, zoom, shapeId), hosts);
  base[index] = [round1(((hit.point.x - shape.x) / shape.w) * 100), round1(((hit.point.y - shape.y) / shape.h) * 100)];
  const binds = Array.isArray(shape.props.baseBinds) ? shape.props.baseBinds.slice() : base.map(() => null);
  binds[index] = bindFromHit(hit);
  const next = objects.map((obj) => (
    obj.id === shapeId ? { ...shape, props: { ...shape.props, base, baseBinds: binds } } : obj
  ));
  return retargetBound(next, [shapeId]);
}

function retargetPyramids(objects, hostIds) {
  const ids = new Set(hostIds);
  const index = indexById(objects);
  let changed = false;
  const next = objects.map((obj) => {
    if (obj.type !== 'shape' || obj.props.shape !== 'pyramid3' || !Array.isArray(obj.props.baseBinds)) return obj;
    if (!obj.props.baseBinds.some((bind) => bind && ids.has(bind.id))) return obj;
    const base = pyramidBaseOf(obj).map((point, slot) => {
      const bind = obj.props.baseBinds[slot];
      const world = (bind && boundPoint(bind, objects, index)) || worldOf(obj, point[0], point[1]);
      return [round1(((world.x - obj.x) / obj.w) * 100), round1(((world.y - obj.y) / obj.h) * 100)];
    });
    changed = true;
    const baseBinds = obj.props.baseBinds.map((bind) => upgradeBind(bind, index));
    return { ...obj, props: { ...obj.props, base, baseBinds } };
  });
  return changed ? next : objects;
}

export function retargetBound(objects, hostIds) {
  let next = objects;
  let pending = [...hostIds];
  const seen = new Set();
  for (let guard = 0; pending.length && guard < 6; guard += 1) {
    pending.forEach((id) => seen.add(id));
    const before = next;
    next = retargetArrows(next, pending);
    next = retargetPolylines(next, pending);
    next = retargetPyramids(next, pending);
    next = retargetMarks(next, pending);
    pending = next.flatMap((obj, index) => (obj !== before[index] && !seen.has(obj.id) ? [obj.id] : []));
  }
  return pruneJoints(next);
}

export function arrowHeadState(props = {}) {
  if (props.headStart != null || props.headEnd != null) {
    return { headStart: props.headStart === true, headEnd: props.headEnd === true };
  }
  return { headStart: false, headEnd: props.head === true };
}

export function arrowHeadSides(obj) {
  const start = { x: obj.x + obj.props.x1, y: obj.y + obj.props.y1 };
  const end = { x: obj.x + obj.props.x2, y: obj.y + obj.props.y2 };
  const startLeft = start.x < end.x - 0.01 || (Math.abs(start.x - end.x) <= 0.01 && start.y <= end.y);
  return startLeft ? { left: 'headStart', right: 'headEnd' } : { left: 'headEnd', right: 'headStart' };
}

export function setArrowSide(obj, side) {
  const prop = arrowHeadSides(obj)[side];
  const state = arrowHeadState(obj.props);
  const other = prop === 'headStart' ? 'headEnd' : 'headStart';
  const on = !(state[prop] && !state[other]);
  return {
    head: false,
    headStart: on && prop === 'headStart',
    headEnd: on && prop === 'headEnd',
  };
}
