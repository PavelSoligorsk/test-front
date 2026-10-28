import {
  arrowBounds,
  boundsOf,
  clamp,
  eraseStrokes,
  hitObject,
  intersects,
  rectFromPoints,
  strokeBounds,
} from '../geometry';
import { MAX_ZOOM, MIN_ZOOM } from '../camera';
import { LASER_COLOR, LASER_MAX_POINTS, LASER_WIDTH, MAX_OBJECTS, SEND_MS } from '../constants';
import { createObject, geogebraApp, uid } from '../model';
import { strokeDuration } from '../ops';
import { setPenActive } from '../penLock';
import { imageFiles } from '../images';
import {
  bindFromHit,
  defaultDepth,
  hitShape,
  isRegularShape,
  planeDefaults,
  splitArrowThroughPoints,
} from '../shapes';
import { createThrottle } from '../timers';
import {
  dragKindForHandle,
  gestureStep,
  handleIndex,
  isEditGesture,
  settleGesture,
  squareFrom,
} from '../tools/gestures';

// Указатель на холсте: начало, ход и конец жестов — выделение и перемещение, ручки,
// кисть и указка, ластик, фигуры и отрезки, панорама и щипок двумя пальцами, двойной
// клик, файлы, свой курсор для других. Модуль не знает о React: редактор один раз
// отдаёт ему ref-ы, документ, камеру и набор действий (board), а действия всегда
// вызывают свежие функции редактора.

function roundPoint(point) {
  return { x: Math.round(point.x * 10) / 10, y: Math.round(point.y * 10) / 10 };
}

/** Верхний объект под точкой; точки выбираются раньше остальных. */
function pickObject(objects, point, zoom) {
  for (let index = objects.length - 1; index >= 0; index -= 1) {
    const obj = objects[index];
    if (obj?.type === 'point' && hitObject(obj, point, zoom)) return obj;
  }
  for (let index = objects.length - 1; index >= 0; index -= 1) {
    const obj = objects[index];
    if (!obj || obj.type === 'point') continue;
    const hit = obj.type === 'shape' ? hitShape(obj, point, zoom) : hitObject(obj, point, zoom);
    if (hit) return obj;
  }
  return null;
}

/** Действия редактора, которые нужны указателю. */
export const POINTER_ACTIONS = [
  'addObjects',
  'addStroke',
  'aimPoint',
  'beginEdit',
  'broadcastCursor',
  'canEdit',
  'canSelect',
  'canvasList',
  'commit',
  'commitEdit',
  'cursorAllowed',
  'dropPoint',
  'eraseTo',
  'finishChain',
  'flushHeldLink',
  'flushOps',
  'gesture',
  'insertImages',
  'notify',
  'paintChainPreview',
  'paintCursor',
  'paintDraft',
  'paintGuides',
  'paintSelectionUi',
  'placePolylinePoint',
  'pruneSelection',
  'publishGesture',
  'pushHistory',
  'releaseGesture',
  'scheduleSend',
  'selectIds',
  'sendLaser',
];

/** Объект-прокладка: каждый вызов идёт в текущую версию функции, которую вернёт read(). */
export function forwardActions(read, names) {
  return Object.fromEntries(names.map((name) => [name, (...args) => read()[name](...args)]));
}

export function createPointerInput({ refs, store, cam, board }) {
  const {
    dragRef,
    chainRef,
    touchesRef,
    pointerClientRef,
    toolRef,
    styleRef,
    editingIdRef,
    selectedIdsRef,
    readOnlyRef,
    spaceRef,
    hintRef,
    fileRef,
    imagePointRef,
    dragCleanupRef,
    draftRef,
    viewportRef,
    cameraRef,
  } = refs;
  const {
    addObjects,
    addStroke,
    aimPoint,
    beginEdit,
    broadcastCursor,
    canEdit,
    canSelect,
    canvasList,
    commit,
    commitEdit,
    cursorAllowed,
    dropPoint,
    eraseTo,
    finishChain,
    flushHeldLink,
    flushOps,
    gesture,
    insertImages,
    notify,
    paintChainPreview,
    paintCursor,
    paintDraft,
    paintGuides,
    paintSelectionUi,
    placePolylinePoint,
    pruneSelection,
    publishGesture,
    pushHistory,
    releaseGesture,
    scheduleSend,
    selectIds,
    sendLaser,
    setEditingId,
    setTool,
  } = board;

  // Свой курсор уходит другим не чаще SEND_MS; последнее положение не теряется.
  const shareCursor = createThrottle((clientX, clientY) => broadcastCursor(clientX, clientY), SEND_MS);

  function sendCursor(clientX, clientY) {
    pointerClientRef.current = { x: clientX, y: clientY };
    if (!cursorAllowed()) return;
    shareCursor(clientX, clientY);
  }

  function toWorld(event) {
    return cam.clientToWorld(event.clientX, event.clientY);
  }

  function finishLaser(drag) {
    if (drag.points.length < 2) return;
    const points = drag.points.map(roundPoint);
    const color = styleRef.current.laserColor || LASER_COLOR;
    const width = styleRef.current.laserWidth || LASER_WIDTH;
    const ms = strokeDuration(performance.now() - (drag.t0 || performance.now())) || 1;
    sendLaser(points, color, width, ms);
    paintDraft(null);
  }

  // Штрих живёт только на экране, пока перо не отпущено. В сеть уходит один раз, целиком.
  function finishStroke(drag) {
    if (drag.laser) {
      finishLaser(drag);
      return;
    }
    if (drag.points.length < 2) return;
    const frame = strokeBounds(drag.points.map(roundPoint), drag.width);
    const stroke = {
      id: uid(),
      type: 'draw',
      x: frame.x,
      y: frame.y,
      w: frame.w,
      h: frame.h,
      rotation: 0,
      props: {
        points: frame.points,
        color: drag.color,
        width: drag.width,
        ms: strokeDuration(performance.now() - (drag.t0 || performance.now())) || 1,
      },
    };
    if (draftRef.current?.kind === 'pen') draftRef.current = { ...draftRef.current, strokeId: stroke.id };
    addStroke(stroke);
    // Черновик линии уходит, когда настоящий штрих уже нарисован: без мигания.
    requestAnimationFrame(() => {
      if (draftRef.current?.strokeId === stroke.id) paintDraft(null);
    });
  }

  function startPinch() {
    const viewport = viewportRef.current;
    const points = [...touchesRef.current.values()].slice(0, 2);
    if (!viewport || points.length < 2) return;
    const rect = viewport.getBoundingClientRect();
    const [a, b] = points;
    dragRef.current = {
      kind: 'pinch',
      dist: Math.max(1, Math.hypot(b.x - a.x, b.y - a.y)),
      mid: { x: (a.x + b.x) / 2 - rect.left, y: (a.y + b.y) / 2 - rect.top },
      camera: { ...cameraRef.current },
    };
    paintCursor();
    paintSelectionUi();
  }

  function pinchMove() {
    const drag = dragRef.current;
    const viewport = viewportRef.current;
    const points = [...touchesRef.current.values()].slice(0, 2);
    if (!drag || drag.kind !== 'pinch' || !viewport || points.length < 2) return;
    const rect = viewport.getBoundingClientRect();
    const [a, b] = points;
    const dist = Math.max(1, Math.hypot(b.x - a.x, b.y - a.y));
    const mid = { x: (a.x + b.x) / 2 - rect.left, y: (a.y + b.y) / 2 - rect.top };
    const zoom = clamp(drag.camera.zoom * (dist / drag.dist), MIN_ZOOM, MAX_ZOOM);
    const worldX = (drag.mid.x - drag.camera.x) / drag.camera.zoom;
    const worldY = (drag.mid.y - drag.camera.y) / drag.camera.zoom;
    cam.paint({ zoom, x: mid.x - worldX * zoom, y: mid.y - worldY * zoom });
  }

  function endPinch() {
    releaseGesture();
    dragRef.current = null;
    paintCursor();
    publishGesture();
    paintSelectionUi();
    flushHeldLink();
  }

  function startPan(event) {
    dragRef.current = {
      kind: 'pan',
      pointerId: event.pointerId,
      client: { x: event.clientX, y: event.clientY },
      camera: { ...cameraRef.current },
    };
    paintCursor();
    trackPointer(event);
  }

  function cancelDrag() {
    const drag = dragRef.current;
    if (!drag) return;
    releaseGesture();
    dragRef.current = null;
    flushHeldLink();
    dragCleanupRef.current?.();
    paintDraft(null);
    paintGuides(null);
    // Отмена жеста (второй палец, pointercancel) возвращает документ как был.
    if (drag.origin && drag.kind !== 'marquee') store.set(drag.origin);
    if (drag.kind === 'pen') setPenActive(false);
    if (hintRef.current) hintRef.current.style.display = '';
    paintCursor();
    paintSelectionUi();
    flushHeldLink();
    scheduleSend();
  }

  function finishDrag(event) {
    const drag = dragRef.current;
    releaseGesture();
    dragRef.current = null;
    if (drag?.kind === 'pen') setPenActive(false);
    flushHeldLink();
    cam.cancelCommit();
    if (drag?.kind !== 'pen') paintDraft(null);
    paintGuides(null);
    paintCursor();
    if (hintRef.current) hintRef.current.style.display = '';
    try {
      if (!drag) return;
      if (drag.kind === 'pan') return;
      if (drag.kind === 'eraser') {
        if (drag.dirty && drag.origin) pushHistory(drag.origin);
        pruneSelection();
        return;
      }
      const world = toWorld(event);
      if (!world) return;
      const currentStyle = styleRef.current;

      if (drag.kind === 'marquee') {
        const rect = rectFromPoints(drag.start, world);
        const zoom = cameraRef.current.zoom;
        if (rect.w < 3 / zoom && rect.h < 3 / zoom) return;
        const hits = canvasList()
          .filter((obj) => canSelect(obj) && !obj.props?.locked && intersects(rect, obj))
          .map((obj) => obj.id);
        selectIds([...new Set([...drag.base, ...hits])]);
        return;
      }

      if (drag.kind === 'pen') {
        finishStroke(drag);
        return;
      }

      if (drag.kind === 'shape') {
        const rect = rectFromPoints(drag.start, world);
        const zoom = cameraRef.current.zoom;
        const tiny = rect.w < 8 / zoom && rect.h < 8 / zoom;
        const regular = isRegularShape(currentStyle.shape) !== event.shiftKey;
        const box = tiny
          ? (regular
            ? { x: drag.start.x - 70, y: drag.start.y - 70, w: 140, h: 140 }
            : { x: drag.start.x - 80, y: drag.start.y - 60, w: 160, h: 120 })
          : squareFrom(drag.start, world, regular);
        const shape = createObject('shape', {
          ...box,
          props: {
            shape: currentStyle.shape,
            fill: currentStyle.fill.fill,
            stroke: currentStyle.fill.stroke,
            depth: defaultDepth(currentStyle.shape),
            text: '',
            ...planeDefaults(currentStyle.shape),
          },
        });
        if (addObjects([shape])) selectIds([shape.id]);
        setTool('select');
        return;
      }

      if (drag.kind === 'arrow') {
        const zoom = cameraRef.current.zoom;
        const startHit = aimPoint(drag.start, null, event.altKey);
        const endHit = aimPoint(world, startHit, event.altKey);
        if (Math.hypot(endHit.point.x - startHit.point.x, endHit.point.y - startHit.point.y) < 8 / zoom) return;
        if (store.get().length + 1 > MAX_OBJECTS) {
          notify(`На доске может быть не больше ${MAX_OBJECTS} объектов`);
          return;
        }
        const arrow = createObject('arrow', arrowBounds(startHit.point, endHit.point, {
          color: currentStyle.arrow,
          width: currentStyle.penWidth,
          head: false,
          bind1: bindFromHit(startHit),
          bind2: bindFromHit(endHit),
        }));
        let list = [...store.get(), arrow];
        if (!event.altKey) list = splitArrowThroughPoints(list, [arrow.id], uid, zoom);
        if (list.length > MAX_OBJECTS) {
          notify(`На доске может быть не больше ${MAX_OBJECTS} объектов`);
          return;
        }
        const known = new Set(store.get().map((obj) => obj.id));
        commit(list);
        const pieces = list.filter((obj) => obj.type === 'arrow' && !known.has(obj.id)).map((obj) => obj.id);
        selectIds(pieces.length ? pieces : [arrow.id]);
        return;
      }

      store.set(settleGesture(drag, store.get(), { zoom: cameraRef.current.zoom, alt: event.altKey, makeId: uid }));

      if (drag.dirty && drag.origin) pushHistory(drag.origin);
      pruneSelection();
    } finally {
      publishGesture();
      paintSelectionUi();
      flushHeldLink();
      flushOps();
    }
  }

  function moveDrag(event) {
    const drag = dragRef.current;
    if (!drag) return;
    if (event.pointerType === 'touch') pointerClientRef.current = { x: event.clientX, y: event.clientY };
    else sendCursor(event.clientX, event.clientY);

    if (drag.kind === 'pan') {
      cam.paint({
        ...cameraRef.current,
        x: drag.camera.x + (event.clientX - drag.client.x),
        y: drag.camera.y + (event.clientY - drag.client.y),
      });
      return;
    }

    const world = toWorld(event);
    if (!world) return;
    const currentStyle = styleRef.current;
    const zoom = cameraRef.current.zoom;

    if (drag.kind === 'marquee') {
      paintDraft({ kind: 'marquee', ...rectFromPoints(drag.start, world) });
      return;
    }

    if (drag.kind === 'pen') {
      const raw = typeof event.getCoalescedEvents === 'function' ? event.getCoalescedEvents() : null;
      const samples = raw?.length ? raw : [event];
      const min = 0.35 / zoom;
      let added = false;
      samples.forEach((sample) => {
        if (drag.laser && drag.points.length >= LASER_MAX_POINTS) return;
        const point = toWorld(sample);
        const last = drag.points[drag.points.length - 1];
        if (last && Math.hypot(point.x - last.x, point.y - last.y) < min) return;
        drag.points.push(point);
        added = true;
      });
      if (!added) return;
      paintDraft({
        kind: 'pen',
        points: drag.points,
        origin: drag.origin,
        color: drag.laser ? (styleRef.current.laserColor || LASER_COLOR) : currentStyle.pen,
        width: drag.laser ? (styleRef.current.laserWidth || LASER_WIDTH) : currentStyle.penWidth,
      });
      return;
    }

    if (drag.kind === 'eraser') {
      const next = eraseStrokes(store.get(), world, 16 / zoom);
      if (next.length !== store.get().length) {
        drag.dirty = true;
        eraseTo(next);
      }
      return;
    }

    if (drag.kind === 'shape') {
      paintDraft({
        kind: 'shape',
        ...squareFrom(drag.start, world, isRegularShape(currentStyle.shape) !== event.shiftKey),
        shape: currentStyle.shape,
        fill: currentStyle.fill.fill,
        stroke: currentStyle.fill.stroke,
      });
      return;
    }

    if (drag.kind === 'arrow') {
      // Начало отрезка не двигается: его привязку считаем один раз на жест (и на Alt).
      if (!drag.startHit || drag.startAlt !== event.altKey) {
        drag.startHit = aimPoint(drag.start, null, event.altKey);
        drag.startAlt = event.altKey;
      }
      const startHit = drag.startHit;
      const endHit = aimPoint(world, startHit, event.altKey);
      paintDraft({
        kind: 'arrow',
        x1: startHit.point.x,
        y1: startHit.point.y,
        x2: endHit.point.x,
        y2: endHit.point.y,
        guide: endHit.guide,
        color: currentStyle.arrow,
        width: currentStyle.penWidth,
      });
      return;
    }

    if (!isEditGesture(drag.kind)) return;
    if (!drag.dirty && Math.hypot(world.x - drag.start.x, world.y - drag.start.y) < 3 / zoom) return;
    if (!drag.dirty) {
      drag.dirty = true;
      paintSelectionUi();
    }
    const step = gestureStep(drag, world, store.get(), {
      zoom,
      alt: event.altKey,
      shift: event.shiftKey,
      aim: aimPoint,
    });
    if (drag.kind === 'move') paintGuides(step?.guides || null);
    if (step) gesture(step.next, step.changed);
  }

  function trackPointer(event) {
    const pointerId = event.pointerId;
    const move = (ev) => {
      if (ev.pointerId === pointerId) moveDrag(ev);
    };
    const detach = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', cancel);
      if (dragCleanupRef.current === detach) dragCleanupRef.current = null;
    };
    const up = (ev) => {
      if (ev.pointerId !== pointerId) return;
      detach();
      if (dragRef.current?.pointerId === pointerId) finishDrag(ev);
    };
    const cancel = (ev) => {
      if (ev.pointerId !== pointerId) return;
      detach();
      if (dragRef.current?.pointerId === pointerId) cancelDrag();
    };
    dragCleanupRef.current?.();
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', cancel);
    dragCleanupRef.current = detach;
    const capture = event.currentTarget;
    if (capture?.setPointerCapture) {
      try { capture.setPointerCapture(pointerId); } catch { /* уже отпущен */ }
    }
  }

  function onPointerDown(event) {
    if (!event.isTrusted) return;
    const target = event.target instanceof Element ? event.target : null;
    if (target?.closest('[data-geo-live]')) return;
    if (target?.closest('textarea, input')) return;
    if (target?.closest('[data-chrome]')) return;

    if (event.pointerType === 'touch') {
      touchesRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (touchesRef.current.size === 2) {
        cancelDrag();
        startPinch();
        return;
      }
      if (touchesRef.current.size > 2) return;
    }
    if (dragRef.current) return;
    if (event.button !== 0 && event.button !== 1 && event.button !== 2) return;

    pointerClientRef.current = { x: event.clientX, y: event.clientY };
    const world = toWorld(event);
    if (!world) return;
    const currentTool = toolRef.current;
    const handleEl = target?.closest('[data-handle]');
    const panButton = event.button === 1 || event.button === 2;

    if (readOnlyRef.current || panButton || currentTool === 'hand' || (spaceRef.current && !handleEl)) {
      startPan(event);
      return;
    }

    if (editingIdRef.current && !target?.closest('textarea')) {
      const editing = store.get().find((obj) => obj.id === editingIdRef.current);
      if (editing && editing.type !== 'geogebra') commitEdit(editingIdRef.current);
    }

    if (chainRef.current && !(currentTool === 'shape' && styleRef.current.shape === 'polyline')) finishChain();

    const drawingLine = currentTool === 'arrow' || (currentTool === 'shape' && styleRef.current.shape === 'polyline');
    const polyHandle = handleEl?.dataset.handle?.startsWith('poly-');
    if ((((currentTool === 'select' || handleEl) && !drawingLine) || polyHandle)) {
      if (handleEl) {
        const id = handleEl.closest('[data-object]')?.dataset.object;
        const obj = store.get().find((item) => item.id === id);
        if (!obj || !canEdit(obj)) return;
        const handle = handleEl.dataset.handle;
        dragRef.current = {
          kind: dragKindForHandle(handle),
          index: handleIndex(handle),
          pointerId: event.pointerId,
          id,
          handle,
          start: world,
          obj,
          origin: store.get(),
          dirty: false,
        };
        selectIds([id]);
        trackPointer(event);
        return;
      }

      const hit = pickObject(canvasList().filter(canSelect), world, cameraRef.current.zoom);
      if (!hit) {
        if (event.pointerType === 'touch') {
          selectIds([]);
          setEditingId(null);
          startPan(event);
          return;
        }
        const base = event.shiftKey ? selectedIdsRef.current : [];
        if (!event.shiftKey) {
          selectIds([]);
          setEditingId(null);
        }
        dragRef.current = { kind: 'marquee', pointerId: event.pointerId, start: world, base };
        trackPointer(event);
        return;
      }

      let ids = selectedIdsRef.current;
      if (event.shiftKey) {
        ids = ids.includes(hit.id) ? ids.filter((id) => id !== hit.id) : [...ids, hit.id];
        selectIds(ids);
        if (!ids.includes(hit.id)) return;
      } else if (!ids.includes(hit.id)) {
        ids = [hit.id];
        selectIds(ids);
      }
      if (editingIdRef.current && editingIdRef.current !== hit.id) setEditingId(null);
      if (hit.type === 'geogebra' && editingIdRef.current === hit.id) return;

      const set = new Set(ids);
      const movable = store.get().filter((obj) => set.has(obj.id) && canEdit(obj));
      if (!movable.length) return;
      dragRef.current = {
        kind: 'move',
        pointerId: event.pointerId,
        start: world,
        starts: new Map(movable.map((obj) => [obj.id, obj])),
        bounds: boundsOf(movable),
        others: store.get()
          .filter((obj) => !set.has(obj.id) && obj.type !== 'draw')
          .map((obj) => ({ x: obj.x, y: obj.y, w: obj.w, h: obj.h })),
        origin: store.get(),
        dirty: false,
      };
      trackPointer(event);
      return;
    }

    selectIds([]);

    if (currentTool === 'pen' || currentTool === 'laser') {
      if (currentTool === 'pen' && store.get().length >= MAX_OBJECTS) {
        notify(`На доске может быть не больше ${MAX_OBJECTS} объектов`);
        return;
      }
      const laser = currentTool === 'laser';
      dragRef.current = {
        kind: 'pen',
        laser,
        pointerId: event.pointerId,
        points: [world],
        origin: world,
        t0: performance.now(),
        color: laser ? (styleRef.current.laserColor || LASER_COLOR) : styleRef.current.pen,
        width: laser ? (styleRef.current.laserWidth || LASER_WIDTH) : styleRef.current.penWidth,
      };
      setPenActive(true);
      if (hintRef.current) hintRef.current.style.display = 'none';
      paintDraft({
        kind: 'pen',
        points: [world],
        origin: world,
        color: laser ? (styleRef.current.laserColor || LASER_COLOR) : styleRef.current.pen,
        width: laser ? (styleRef.current.laserWidth || LASER_WIDTH) : styleRef.current.penWidth,
      });
      trackPointer(event);
      return;
    }

    if (currentTool === 'eraser') {
      const next = eraseStrokes(store.get(), world, 16 / cameraRef.current.zoom);
      dragRef.current = {
        kind: 'eraser',
        pointerId: event.pointerId,
        origin: store.get(),
        dirty: next.length !== store.get().length,
      };
      if (dragRef.current.dirty) eraseTo(next);
      trackPointer(event);
      return;
    }

    if (currentTool === 'shape' && styleRef.current.shape === 'polyline') {
      if (hintRef.current) hintRef.current.style.display = 'none';
      placePolylinePoint(world, event.altKey);
      return;
    }

    if (currentTool === 'point') {
      if (hintRef.current) hintRef.current.style.display = 'none';
      dropPoint(world);
      return;
    }

    if (currentTool === 'shape' || currentTool === 'arrow') {
      if (hintRef.current) hintRef.current.style.display = 'none';
      dragRef.current = { kind: currentTool, pointerId: event.pointerId, start: world };
      trackPointer(event);
      return;
    }

    if (currentTool === 'sticky' || currentTool === 'text') {
      // Иначе mousedown после этого pointerdown уводит фокус с нового поля на body.
      event.preventDefault();
      const sticky = currentTool === 'sticky';
      const obj = createObject(sticky ? 'sticky' : 'text', sticky
        ? {
          x: world.x - 100,
          y: world.y - 100,
          w: 200,
          h: 200,
          props: { text: '', color: styleRef.current.sticky, fontSize: 28 },
        }
        : {
          x: world.x,
          y: world.y - 20,
          w: 280,
          h: Math.max(40, Math.round(styleRef.current.textSize * 1.4 + 16)),
          props: { text: '', fontSize: styleRef.current.textSize },
        });
      if (addObjects([obj])) beginEdit(obj.id);
      return;
    }

    if (currentTool === 'image') {
      imagePointRef.current = world;
      fileRef.current?.click();
      return;
    }

    if (currentTool === 'geogebra') {
      placeGeogebra(world);
    }
  }

  function onViewportPointerMove(event) {
    if (!event.isTrusted) return;
    if (event.pointerType === 'touch') return;
    if (chainRef.current && !dragRef.current && toolRef.current === 'shape' && styleRef.current.shape === 'polyline') {
      const world = toWorld(event);
      if (world) paintChainPreview(aimPoint(world, chainRef.current.hits.at(-1), event.altKey));
    }
    if (dragRef.current) return;
    sendCursor(event.clientX, event.clientY);
  }

  function onContextMenu(event) {
    if (event.target instanceof Element && event.target.closest('[data-geo-live]')) return;
    event.preventDefault();
  }

  function onDragOver(event) {
    if (readOnlyRef.current) return;
    if (Array.from(event.dataTransfer?.types || []).includes('Files')) {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'copy';
    }
  }

  function onDrop(event) {
    const files = imageFiles(event.dataTransfer?.files);
    if (!files.length) return;
    event.preventDefault();
    const world = toWorld(event);
    if (!world) return;
    insertImages(files, world);
  }

  async function onImageFile(event) {
    const files = imageFiles(event.target.files);
    event.target.value = '';
    const point = imagePointRef.current;
    if (!files.length || !point) return;
    await insertImages(files, point);
  }

  function placeGeogebra(world) {
    const appName = geogebraApp(styleRef.current.appName).id;
    const obj = createObject('geogebra', {
      x: world.x - 220,
      y: world.y - 160,
      w: 440,
      h: 320,
      props: { appName },
    });
    if (addObjects([obj])) selectIds([obj.id]);
    setTool('select');
  }

  function onDoubleClick(event) {
    if (toolRef.current !== 'select' || readOnlyRef.current) return;
    const target = event.target instanceof Element ? event.target : null;
    if (target?.closest('[data-geo-live], [data-chrome], textarea')) return;
    const world = toWorld(event);
    if (!world) return;
    const hit = pickObject(canvasList().filter(canSelect), world, cameraRef.current.zoom);
    if (hit) {
      if (canEdit(hit) && hit.props?.format !== 'markdown' && hit.props?.format !== 'theory' && (hit.type === 'sticky' || hit.type === 'text' || hit.type === 'shape')) beginEdit(hit.id);
      return;
    }
    const obj = createObject('text', {
      x: world.x,
      y: world.y - 20,
      w: 280,
      h: Math.max(40, Math.round(styleRef.current.textSize * 1.4 + 16)),
      props: { text: '', fontSize: styleRef.current.textSize },
    });
    if (addObjects([obj])) beginEdit(obj.id);
  }

  return {
    onPointerDown,
    onViewportPointerMove,
    onContextMenu,
    onDragOver,
    onDrop,
    onDoubleClick,
    onImageFile,
    pinchMove,
    endPinch,
    cancelDrag,
    dispose() {
      shareCursor.cancel();
      dragCleanupRef.current?.();
    },
  };
}
