import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowUpRight,
  ChevronLeft,
  Circle,
  Eraser,
  Hand,
  Minus,
  MousePointer2,
  Pencil,
  Pi,
  Plus,
  Redo2,
  Square,
  StickyNote,
  Trash2,
  Type,
  Undo2,
  Image,
} from 'lucide-react';
import BoardObject from './BoardObject';
import {
  BoardConflictError,
  boardErrorMessage,
  getGeoGebraTemplate,
  getStudentBoard,
  getTeacherBoard,
  listGeoGebraTemplates,
  putStudentBoard,
  putStudentBoardKeepalive,
  putTeacherBoard,
  putTeacherBoardKeepalive,
  uploadStudentBoardImage,
  uploadTeacherBoardImage,
  watchBoardEvents,
} from './api';
import { ENDPOINTS } from '../../shared/api/endpoints';
import { readGeoGebraBase64 } from './geogebraApi';
import {
  arrowBounds,
  bringToFront,
  clamp,
  eraseStrokes,
  rectFromPoints,
  resizeBox,
  strokeBounds,
  topHit,
} from './geometry';
import {
  GEOGEBRA_TEMPLATES,
  PEN_COLORS,
  PEN_WIDTHS,
  SHAPE_FILLS,
  STICKY_COLORS,
  createObject,
  geogebraTemplate,
} from './model';
import { deleteBoard, saveBoard } from './storage';

const TOOLS = [
  { id: 'select', label: 'Выбор', hint: 'V', icon: MousePointer2 },
  { id: 'hand', label: 'Рука', hint: 'H', icon: Hand },
  { id: 'sticky', label: 'Стикер', hint: 'N', icon: StickyNote },
  { id: 'text', label: 'Текст', hint: 'T', icon: Type },
  { id: 'shape', label: 'Фигура', hint: 'R', icon: Square },
  { id: 'arrow', label: 'Стрелка', hint: 'L', icon: ArrowUpRight },
  { id: 'pen', label: 'Кисть', hint: 'P', icon: Pencil },
  { id: 'eraser', label: 'Ластик', hint: 'E', icon: Eraser },
  { id: 'image', label: 'Изображение', hint: 'I', icon: Image },
  { id: 'geogebra', label: 'GeoGebra', hint: 'G', icon: Pi },
];

const INITIAL_STYLE = {
  sticky: STICKY_COLORS[0].bg,
  pen: PEN_COLORS[0],
  penWidth: 4,
  shape: 'rect',
  fill: SHAPE_FILLS[0],
  arrow: PEN_COLORS[0],
  appName: 'geometry',
  templateId: '',
};

const TOOL_KEYS = {
  v: 'select',
  h: 'hand',
  n: 'sticky',
  t: 'text',
  r: 'shape',
  l: 'arrow',
  p: 'pen',
  e: 'eraser',
  i: 'image',
  g: 'geogebra',
};

function replaceObject(objects, id, next) {
  return objects.map((obj) => (obj.id === id ? next : obj));
}

export default function BoardEditor({
  initialBoard,
  readOnly = false,
  audience = 'student',
  backTo = '/student/board',
  backLabel = 'Доски',
}) {
  const navigate = useNavigate();
  const viewportRef = useRef(null);
  const worldRef = useRef(null);
  const draftHostRef = useRef(null);
  const zoomLabelRef = useRef(null);
  const hintRef = useRef(null);
  const cameraSyncRef = useRef(0);
  const wheelRef = useRef(() => {});
  const objectsRef = useRef(initialBoard.objects || []);
  const cameraRef = useRef(initialBoard.camera || { x: 64, y: 72, zoom: 1 });
  const titleRef = useRef(initialBoard.title || 'Доска');
  const boardRef = useRef(initialBoard);
  const apiMap = useRef(new Map());
  const pastRef = useRef([]);
  const futureRef = useRef([]);
  const dragRef = useRef(null);
  const editOriginRef = useRef(null);
  const editingIdRef = useRef(null);
  const selectedIdRef = useRef(null);
  const toolRef = useRef('select');
  const styleRef = useRef(INITIAL_STYLE);
  const persistRef = useRef(async () => {});
  const actionsRef = useRef({});
  const mountedRef = useRef(true);
  const persistSeq = useRef(0);
  const skipSave = useRef(true);
  const persistBusy = useRef(0);
  const pullingRef = useRef(false);
  const seenRevisionRef = useRef(initialBoard.revision ?? 0);
  const ackedRef = useRef({
    objects: initialBoard.objects || [],
    camera: { ...(initialBoard.camera || { x: 0, y: 0, zoom: 1 }) },
    title: (initialBoard.title || 'Доска').trim() || 'Доска',
  });
  const pullRemoteRef = useRef(async () => {});
  const noteRemoteRef = useRef(() => {});
  const spaceRef = useRef(false);
  const geoTimerRef = useRef(null);
  const readOnlyRef = useRef(readOnly);
  const audienceRef = useRef(audience);
  const fileRef = useRef(null);
  const imagePointRef = useRef(null);
  const templatesRef = useRef(GEOGEBRA_TEMPLATES);

  const [objects, setObjects] = useState(initialBoard.objects || []);
  const [camera, setCamera] = useState(initialBoard.camera || { x: 64, y: 72, zoom: 1 });
  const [title, setTitle] = useState(initialBoard.title || 'Доска');
  const [tool, setTool] = useState('select');
  const [selectedId, setSelectedId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [saveState, setSaveState] = useState('saved');
  const [historyCounts, setHistoryCounts] = useState({ undo: 0, redo: 0 });
  const [geoEpoch, setGeoEpoch] = useState(0);
  const [style, setStyle] = useState(INITIAL_STYLE);
  const [templates, setTemplates] = useState(GEOGEBRA_TEMPLATES);
  const [notice, setNotice] = useState('');

  function noteHistory() {
    setHistoryCounts({ undo: pastRef.current.length, redo: futureRef.current.length });
  }

  const selected = objects.find((obj) => obj.id === selectedId) || null;

  function commit(next) {
    pastRef.current.push(objectsRef.current);
    if (pastRef.current.length > 80) pastRef.current.shift();
    futureRef.current = [];
    objectsRef.current = next;
    setObjects(next);
    noteHistory();
  }

  function paintCamera(cam) {
    cameraRef.current = cam;
    const world = worldRef.current;
    if (world) {
      world.style.transform = `translate(${cam.x}px, ${cam.y}px) scale(${cam.zoom})`;
    }
    const viewport = viewportRef.current;
    if (viewport) {
      viewport.style.backgroundSize = `${22 * cam.zoom}px ${22 * cam.zoom}px`;
      viewport.style.backgroundPosition = `${cam.x}px ${cam.y}px`;
      viewport.querySelectorAll('[data-handle]').forEach((handle) => {
        const kind = handle.dataset.handle;
        const inv = 1 / cam.zoom;
        if (kind === 'start' || kind === 'end') {
          handle.style.transform = `translate(-50%, -50%) scale(${inv})`;
          return;
        }
        const x = kind?.includes('w') ? '-50%' : '50%';
        const y = kind?.includes('n') ? '-50%' : '50%';
        handle.style.transform = `translate(${x}, ${y}) scale(${inv})`;
      });
    }
    if (zoomLabelRef.current) {
      zoomLabelRef.current.textContent = `${Math.round(cam.zoom * 100)}%`;
    }
  }

  function paintObject(obj) {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const el = viewport.querySelector(`[data-object="${CSS.escape(obj.id)}"]`);
    if (!el) return;
    el.style.left = `${obj.x}px`;
    el.style.top = `${obj.y}px`;
    el.style.width = `${obj.w}px`;
    el.style.height = `${obj.h}px`;
    if (obj.type === 'arrow') {
      const svg = el.querySelector('svg');
      const line = el.querySelector('line');
      if (svg) {
        svg.setAttribute('width', obj.w);
        svg.setAttribute('height', obj.h);
      }
      if (line) {
        line.setAttribute('x1', obj.props.x1);
        line.setAttribute('y1', obj.props.y1);
        line.setAttribute('x2', obj.props.x2);
        line.setAttribute('y2', obj.props.y2);
      }
      const start = el.querySelector('[data-handle="start"]');
      const end = el.querySelector('[data-handle="end"]');
      if (start) {
        start.style.left = `${obj.props.x1}px`;
        start.style.top = `${obj.props.y1}px`;
      }
      if (end) {
        end.style.left = `${obj.props.x2}px`;
        end.style.top = `${obj.props.y2}px`;
      }
    }
    if (obj.type === 'geogebra') {
      const api = apiMap.current.get(obj.id);
      if (api && typeof api.setSize === 'function') {
        try {
          api.setSize(Math.max(200, Math.round(obj.w - 2)), Math.max(160, Math.round(obj.h - 38)));
        } catch {
          /* размер догонит кадр после отпускания */
        }
      }
    }
  }

  function live(next) {
    objectsRef.current = next;
    setObjects(next);
  }

  function gesture(next, obj) {
    objectsRef.current = next;
    paintObject(obj);
  }

  function hideErased(before, next) {
    const keep = new Set(next.map((obj) => obj.id));
    before.forEach((obj) => {
      if (keep.has(obj.id)) return;
      const el = viewportRef.current?.querySelector(`[data-object="${CSS.escape(obj.id)}"]`);
      if (el) el.style.display = 'none';
    });
    objectsRef.current = next;
  }

  function publishGesture() {
    const next = objectsRef.current;
    setObjects((prev) => (prev === next ? prev : next));
    const cam = cameraRef.current;
    setCamera((prev) => (
      prev.x === cam.x && prev.y === cam.y && prev.zoom === cam.zoom ? prev : cam
    ));
  }

  function scheduleCameraCommit() {
    window.clearTimeout(cameraSyncRef.current);
    cameraSyncRef.current = window.setTimeout(() => {
      if (dragRef.current) {
        scheduleCameraCommit();
        return;
      }
      publishGesture();
    }, 80);
  }

  function paintCursor() {
    const el = viewportRef.current;
    if (!el) return;
    const current = toolRef.current;
    const panning = dragRef.current?.kind === 'pan';
    el.style.cursor = panning
      ? 'grabbing'
      : (spaceRef.current || current === 'hand')
        ? 'grab'
        : (current === 'pen' || current === 'eraser' || current === 'shape' || current === 'arrow')
          ? 'crosshair'
          : current === 'text'
            ? 'text'
            : 'default';
  }

  function paintDraft(draft) {
    const host = draftHostRef.current;
    if (!host) return;
    host.replaceChildren();
    if (!draft) return;
    if (draft.kind === 'shape') {
      const node = document.createElement('div');
      node.className = 'pointer-events-none absolute';
      node.style.left = `${draft.x}px`;
      node.style.top = `${draft.y}px`;
      node.style.width = `${draft.w}px`;
      node.style.height = `${draft.h}px`;
      node.style.background = draft.fill;
      node.style.border = `2px solid ${draft.stroke}`;
      node.style.borderRadius = draft.shape === 'ellipse' ? '999px' : '12px';
      node.style.opacity = '0.85';
      host.appendChild(node);
      return;
    }
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'pointer-events-none absolute overflow-visible');
    if (draft.kind === 'arrow') {
      const left = Math.min(draft.x1, draft.x2);
      const top = Math.min(draft.y1, draft.y2);
      svg.style.left = `${left}px`;
      svg.style.top = `${top}px`;
      svg.setAttribute('width', Math.max(Math.abs(draft.x2 - draft.x1), 1));
      svg.setAttribute('height', Math.max(Math.abs(draft.y2 - draft.y1), 1));
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', draft.x1 - left);
      line.setAttribute('y1', draft.y1 - top);
      line.setAttribute('x2', draft.x2 - left);
      line.setAttribute('y2', draft.y2 - top);
      line.setAttribute('stroke', draft.color);
      line.setAttribute('stroke-width', draft.width);
      svg.appendChild(line);
    }
    if (draft.kind === 'pen' && draft.points.length) {
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      draft.points.forEach((point) => {
        minX = Math.min(minX, point.x);
        minY = Math.min(minY, point.y);
        maxX = Math.max(maxX, point.x);
        maxY = Math.max(maxY, point.y);
      });
      const pad = draft.width + 4;
      const left = minX - pad;
      const top = minY - pad;
      svg.style.left = `${left}px`;
      svg.style.top = `${top}px`;
      svg.setAttribute('width', Math.max(maxX - minX + pad * 2, 1));
      svg.setAttribute('height', Math.max(maxY - minY + pad * 2, 1));
      const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
      poly.setAttribute('points', draft.points.map((point) => `${point.x - left},${point.y - top}`).join(' '));
      poly.setAttribute('fill', 'none');
      poly.setAttribute('stroke', draft.color);
      poly.setAttribute('stroke-width', draft.width);
      poly.setAttribute('stroke-linecap', 'round');
      poly.setAttribute('stroke-linejoin', 'round');
      svg.appendChild(poly);
    }
    host.appendChild(svg);
  }

  function raiseObject(id) {
    const node = viewportRef.current?.querySelector(`[data-object="${CSS.escape(id)}"]`);
    node?.parentElement?.appendChild(node);
  }

  function toWorld(event) {
    const rect = viewportRef.current.getBoundingClientRect();
    const cam = cameraRef.current;
    return {
      x: (event.clientX - rect.left - cam.x) / cam.zoom,
      y: (event.clientY - rect.top - cam.y) / cam.zoom,
    };
  }

  function zoomAt(nextZoom, clientX, clientY) {
    const rect = viewportRef.current.getBoundingClientRect();
    const cam = cameraRef.current;
    const zoom = clamp(nextZoom, 0.25, 2.5);
    const px = clientX - rect.left;
    const py = clientY - rect.top;
    const worldX = (px - cam.x) / cam.zoom;
    const worldY = (py - cam.y) / cam.zoom;
    paintCamera({ zoom, x: px - worldX * zoom, y: py - worldY * zoom });
    scheduleCameraCommit();
  }

  function zoomBy(factor) {
    const rect = viewportRef.current.getBoundingClientRect();
    zoomAt(cameraRef.current.zoom * factor, rect.left + rect.width / 2, rect.top + rect.height / 2);
  }

  async function attachBase64(list) {
    const next = [];
    let changed = false;
    for (const obj of list) {
      if (obj.type !== 'geogebra') {
        next.push(obj);
        continue;
      }
      const api = apiMap.current.get(obj.id);
      const base64 = api ? await readGeoGebraBase64(api) : '';
      if (base64 && base64 !== obj.props.ggbBase64) {
        changed = true;
        next.push({ ...obj, props: { ...obj.props, ggbBase64: base64 } });
      } else {
        next.push(obj);
      }
    }
    return changed ? next : list;
  }

  function ggbSignature(list) {
    return (list || []).map((obj) => (
      obj.type === 'geogebra' ? `${obj.id}:${obj.props?.ggbBase64 || ''}` : ''
    )).join('|');
  }

  function rememberAck() {
    ackedRef.current = {
      objects: objectsRef.current,
      camera: {
        x: cameraRef.current.x,
        y: cameraRef.current.y,
        zoom: cameraRef.current.zoom,
      },
      title: titleRef.current.trim() || 'Доска',
    };
  }

  function isDirty() {
    if (dragRef.current || persistBusy.current > 0) return true;
    const acked = ackedRef.current;
    if (objectsRef.current !== acked.objects) return true;
    if ((titleRef.current.trim() || 'Доска') !== acked.title) return true;
    const cam = cameraRef.current;
    return cam.x !== acked.camera.x || cam.y !== acked.camera.y || cam.zoom !== acked.camera.zoom;
  }

  function adoptServerBoard(next, { resetHistory = false } = {}) {
    const geoChanged = ggbSignature(objectsRef.current) !== ggbSignature(next.objects);
    skipSave.current = true;
    boardRef.current = next;
    objectsRef.current = next.objects || [];
    cameraRef.current = next.camera || cameraRef.current;
    titleRef.current = next.title || titleRef.current;
    rememberAck();
    if ((next.revision ?? 0) > (seenRevisionRef.current ?? 0)) seenRevisionRef.current = next.revision;
    setObjects(objectsRef.current);
    setCamera({ ...cameraRef.current });
    setTitle(titleRef.current);
    if (resetHistory) {
      pastRef.current = [];
      futureRef.current = [];
      setEditingId(null);
      noteHistory();
    }
    if (geoChanged) setGeoEpoch((value) => value + 1);
    saveBoard(next).catch(() => {});
  }

  async function pullRemote() {
    if (pullingRef.current || isDirty()) return;
    const target = Number(seenRevisionRef.current || 0);
    if (!(target > Number(boardRef.current.revision ?? 0))) return;
    pullingRef.current = true;
    const revisionBefore = Number(boardRef.current.revision ?? 0);
    try {
      const remote = audienceRef.current === 'teacher'
        ? await getTeacherBoard(boardRef.current.id)
        : await getStudentBoard(boardRef.current.id);
      if (!mountedRef.current || isDirty()) return;
      if ((remote?.revision ?? 0) > revisionBefore) {
        adoptServerBoard(remote, { resetHistory: true });
        if (mountedRef.current) setSaveState('saved');
      }
    } catch {
      /* следующее update или повтор потока скачает документ ещё раз */
    } finally {
      pullingRef.current = false;
      const advanced = Number(boardRef.current.revision ?? 0) > revisionBefore;
      if (advanced && !isDirty() && Number(seenRevisionRef.current || 0) > Number(boardRef.current.revision ?? 0)) {
        pullRemote();
      }
    }
  }

  function noteRemoteRevision(revision) {
    const next = Number(revision);
    if (!Number.isFinite(next)) return;
    if (next > Number(seenRevisionRef.current || 0)) seenRevisionRef.current = next;
    pullRemote();
  }

  async function persist() {
    if (readOnlyRef.current) return;
    persistBusy.current += 1;
    const seq = persistSeq.current + 1;
    persistSeq.current = seq;
    if (mountedRef.current) setSaveState('saving');
    try {
      const withGeo = await attachBase64(objectsRef.current);
      if (persistSeq.current !== seq) return;
      if (withGeo !== objectsRef.current) {
        objectsRef.current = withGeo;
        if (mountedRef.current) setObjects(withGeo);
      }
      const nextBoard = {
        ...boardRef.current,
        title: titleRef.current.trim() || 'Доска',
        camera: cameraRef.current,
        objects: objectsRef.current,
        updatedAt: new Date().toISOString(),
      };
      boardRef.current = nextBoard;
      await saveBoard(nextBoard);
      if (persistSeq.current !== seq) return;
      if (nextBoard.revision == null) {
        if (mountedRef.current) setSaveState('saved');
        return;
      }
      try {
        const saved = await (audienceRef.current === 'teacher' ? putTeacherBoard(nextBoard) : putStudentBoard(nextBoard));
        if (persistSeq.current !== seq) {
          boardRef.current = {
            ...boardRef.current,
            revision: saved.revision,
            updatedAt: saved.updatedAt,
          };
          return;
        }
        adoptServerBoard(saved);
        if (mountedRef.current) setSaveState('saved');
      } catch (error) {
        if (persistSeq.current !== seq) return;
        if (error instanceof BoardConflictError) {
          adoptServerBoard(error.board, { resetHistory: true });
          if (mountedRef.current) setSaveState('conflict');
          return;
        }
        if (error.response?.status === 404) {
          if (mountedRef.current) setSaveState('saved');
          return;
        }
        if (mountedRef.current) {
          setNotice(boardErrorMessage(error, 'Не удалось сохранить доску'));
          setSaveState('error');
        }
      }
    } catch {
      if (mountedRef.current && persistSeq.current === seq) setSaveState('error');
    } finally {
      persistBusy.current -= 1;
      pullRemoteRef.current();
    }
  }

  useEffect(() => {
    const boardId = initialBoard?.id;
    if (!boardId) return undefined;
    const controller = new AbortController();
    let stopped = false;
    let timer = 0;
    let attempt = 0;
    const url = audience === 'teacher'
      ? ENDPOINTS.TEACHER_BOARD_EVENTS(boardId)
      : ENDPOINTS.STUDENT_BOARD_EVENTS(boardId);

    const wait = (ms) => new Promise((resolve) => {
      timer = window.setTimeout(resolve, ms);
    });

    (async () => {
      while (!stopped) {
        try {
          await watchBoardEvents(url, {
            signal: controller.signal,
            onUpdate: (data) => {
              if (data?.id && data.id !== boardId) return;
              noteRemoteRef.current(data?.revision);
            },
            onDelete: () => {
              if (stopped) return;
              stopped = true;
              controller.abort();
              deleteBoard(boardId).catch(() => {});
              navigate(backTo);
            },
          });
          if (stopped) return;
          attempt += 1;
        } catch (error) {
          if (stopped || controller.signal.aborted || error?.name === 'AbortError') return;
          const status = error?.status;
          if (status === 401 || status === 403 || status === 404) return;
          attempt += 1;
        }
        if (stopped) return;
        await wait(Math.min(10000, 1000 * attempt));
      }
    })();

    return () => {
      stopped = true;
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [initialBoard.id, audience, backTo, navigate]);

  useEffect(() => {
    mountedRef.current = true;
    const onHide = () => {
      if (document.visibilityState === 'hidden') persistRef.current();
    };
    const onPageHide = () => {
      const board = {
        ...boardRef.current,
        title: titleRef.current.trim() || 'Доска',
        camera: cameraRef.current,
        objects: objectsRef.current,
      };
      saveBoard(board).catch(() => {});
      if (!readOnlyRef.current && board.revision != null) {
        const send = audienceRef.current === 'teacher' ? putTeacherBoardKeepalive : putStudentBoardKeepalive;
        send(board);
      }
    };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', onPageHide);
    return () => {
      mountedRef.current = false;
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', onPageHide);
      persistRef.current();
    };
  }, []);

  useEffect(() => {
    if (skipSave.current) {
      skipSave.current = false;
      return undefined;
    }
    const timer = setTimeout(() => persistRef.current(), 700);
    return () => clearTimeout(timer);
  }, [objects, camera, title]);

  useEffect(() => {
    let cancelled = false;
    listGeoGebraTemplates()
      .then((rows) => {
        if (!cancelled && Array.isArray(rows) && rows.length) setTemplates(rows);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return undefined;
    const onWheel = (event) => wheelRef.current(event);
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  function undo() {
    if (readOnlyRef.current) return;
    const prev = pastRef.current.pop();
    if (!prev) return;
    futureRef.current.push(objectsRef.current);
    objectsRef.current = prev;
    setObjects(prev);
    setEditingId(null);
    setGeoEpoch((value) => value + 1);
    noteHistory();
  }

  function redo() {
    if (readOnlyRef.current) return;
    const next = futureRef.current.pop();
    if (!next) return;
    pastRef.current.push(objectsRef.current);
    objectsRef.current = next;
    setObjects(next);
    setEditingId(null);
    setGeoEpoch((value) => value + 1);
    noteHistory();
  }

  function deleteSelected() {
    if (readOnlyRef.current) return;
    const id = selectedIdRef.current;
    if (!id) return;
    const before = objectsRef.current;
    const next = before.filter((obj) => obj.id !== id);
    if (next.length === before.length) return;
    commit(next);
    setSelectedId(null);
    setEditingId(null);
  }

  function commitEdit(id) {
    const origin = editOriginRef.current;
    editOriginRef.current = null;
    setEditingId(null);
    if (!origin || !id) return;
    const prev = origin.find((obj) => obj.id === id);
    const curr = objectsRef.current.find((obj) => obj.id === id);
    if ((prev?.props?.text || '') === (curr?.props?.text || '')) return;
    pastRef.current.push(origin);
    if (pastRef.current.length > 80) pastRef.current.shift();
    futureRef.current = [];
    noteHistory();
  }

  function beginEdit(id) {
    if (editOriginRef.current == null) editOriginRef.current = objectsRef.current;
    setSelectedId(id);
    setEditingId(id);
    setTool('select');
  }

  function changeText(id, text) {
    live(objectsRef.current.map((obj) => (
      obj.id === id ? { ...obj, props: { ...obj.props, text } } : obj
    )));
  }

  function patchProps(id, propsPatch) {
    const before = objectsRef.current;
    const next = before.map((obj) => (
      obj.id === id ? { ...obj, props: { ...obj.props, ...propsPatch } } : obj
    ));
    commit(next);
  }

  useLayoutEffect(() => {
    toolRef.current = tool;
    paintCamera(cameraRef.current);
    paintCursor();
    const drag = dragRef.current;
    if (!drag?.id) return;
    raiseObject(drag.id);
    const obj = objectsRef.current.find((item) => item.id === drag.id);
    if (obj) paintObject(obj);
  });

  useEffect(() => {
    titleRef.current = title;
    editingIdRef.current = editingId;
    selectedIdRef.current = selectedId;
    toolRef.current = tool;
    styleRef.current = style;
    persistRef.current = persist;
    pullRemoteRef.current = pullRemote;
    noteRemoteRef.current = noteRemoteRevision;
    actionsRef.current = { undo, redo, deleteSelected, commitEdit };
    readOnlyRef.current = readOnly;
    audienceRef.current = audience;
    templatesRef.current = templates;
    wheelRef.current = (event) => {
      if (event.target instanceof Element && event.target.closest('[data-geo-live]')) return;
      event.preventDefault();
      const cam = cameraRef.current;
      if (event.ctrlKey || event.metaKey) {
        const factor = event.deltaY < 0 ? 1.08 : 1 / 1.08;
        zoomAt(cam.zoom * factor, event.clientX, event.clientY);
        return;
      }
      paintCamera({ ...cam, x: cam.x - event.deltaX, y: cam.y - event.deltaY });
      scheduleCameraCommit();
    };
  });

  useEffect(() => {
    const onKeyDown = (event) => {
      const typing = event.target instanceof Element
        && event.target.closest('input, textarea, [data-geo-live]');
      if (event.target instanceof Element && event.target.closest('[data-geo-live]')) return;
      if (event.code === 'Space' && !typing) {
        event.preventDefault();
        spaceRef.current = true;
        paintCursor();
        return;
      }
      if (typing) return;
      const key = event.key.toLowerCase();
      if ((event.ctrlKey || event.metaKey) && key === 'z') {
        event.preventDefault();
        if (event.shiftKey) actionsRef.current.redo();
        else actionsRef.current.undo();
        return;
      }
      if ((event.ctrlKey || event.metaKey) && key === 'y') {
        event.preventDefault();
        actionsRef.current.redo();
        return;
      }
      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault();
        actionsRef.current.deleteSelected();
        return;
      }
      if (event.key === 'Escape') {
        setEditingId(null);
        setSelectedId(null);
        setTool('select');
        return;
      }
      if (event.key === 'Enter' && selectedIdRef.current) {
        const obj = objectsRef.current.find((item) => item.id === selectedIdRef.current);
        if (obj && (obj.type === 'sticky' || obj.type === 'text')) beginEdit(obj.id);
        return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const nextTool = TOOL_KEYS[key];
      if (nextTool) setTool(nextTool);
    };
    const onKeyUp = (event) => {
      if (event.code === 'Space') {
        spaceRef.current = false;
        paintCursor();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  function finishDrag(event) {
    const drag = dragRef.current;
    dragRef.current = null;
    window.clearTimeout(cameraSyncRef.current);
    paintDraft(null);
    paintCursor();
    if (hintRef.current) hintRef.current.style.display = '';
    try {
      if (!drag) return;
      if (drag.kind === 'pan' || drag.kind === 'eraser') {
        if (drag.dirty && drag.origin) {
          pastRef.current.push(drag.origin);
          if (pastRef.current.length > 80) pastRef.current.shift();
          futureRef.current = [];
          noteHistory();
        }
        if (selectedIdRef.current && !objectsRef.current.some((obj) => obj.id === selectedIdRef.current)) {
          setSelectedId(null);
        }
        return;
      }
      const world = toWorld(event);
      const currentStyle = styleRef.current;

      if (drag.kind === 'pen') {
        if (drag.points.length < 2) return;
        const bounds = strokeBounds(drag.points, currentStyle.penWidth);
        const stroke = createObject('draw', {
          x: bounds.x,
          y: bounds.y,
          w: bounds.w,
          h: bounds.h,
          props: { points: bounds.points, color: currentStyle.pen, width: currentStyle.penWidth },
        });
        commit([...objectsRef.current, stroke]);
        setSelectedId(stroke.id);
        return;
      }

      if (drag.kind === 'shape') {
        const rect = rectFromPoints(drag.start, world);
        if (rect.w < 8 && rect.h < 8) return;
        const shape = createObject('shape', {
          ...rect,
          w: Math.max(rect.w, 16),
          h: Math.max(rect.h, 16),
          props: {
            shape: currentStyle.shape,
            fill: currentStyle.fill.fill,
            stroke: currentStyle.fill.stroke,
          },
        });
        commit([...objectsRef.current, shape]);
        setSelectedId(shape.id);
        setTool('select');
        return;
      }

      if (drag.kind === 'arrow') {
        if (Math.hypot(world.x - drag.start.x, world.y - drag.start.y) < 8) return;
        const bounds = arrowBounds(drag.start, world, {
          color: currentStyle.arrow,
          width: currentStyle.penWidth,
        });
        const arrow = createObject('arrow', bounds);
        commit([...objectsRef.current, arrow]);
        setSelectedId(arrow.id);
        setTool('select');
        return;
      }

      if (drag.dirty && drag.origin) {
        pastRef.current.push(drag.origin);
        if (pastRef.current.length > 80) pastRef.current.shift();
        futureRef.current = [];
        noteHistory();
      }
      if (selectedIdRef.current && !objectsRef.current.some((obj) => obj.id === selectedIdRef.current)) {
        setSelectedId(null);
      }
    } finally {
      publishGesture();
    }
  }

  function moveDrag(event) {
    const drag = dragRef.current;
    if (!drag) return;
    const world = toWorld(event);
    const currentStyle = styleRef.current;

    if (drag.kind === 'pan') {
      const next = {
        ...cameraRef.current,
        x: drag.camera.x + (event.clientX - drag.client.x),
        y: drag.camera.y + (event.clientY - drag.client.y),
      };
      paintCamera(next);
      return;
    }

    if (drag.kind === 'pen') {
      const last = drag.points[drag.points.length - 1];
      if (!last || Math.hypot(world.x - last.x, world.y - last.y) > 1.2) drag.points.push(world);
      paintDraft({ kind: 'pen', points: drag.points.slice(), color: currentStyle.pen, width: currentStyle.penWidth });
      return;
    }

    if (drag.kind === 'eraser') {
      const radius = 16 / cameraRef.current.zoom;
      const next = eraseStrokes(objectsRef.current, world, radius);
      if (next.length !== objectsRef.current.length) {
        drag.dirty = true;
        hideErased(objectsRef.current, next);
      }
      return;
    }

    if (drag.kind === 'shape') {
      const rect = rectFromPoints(drag.start, world);
      paintDraft({
        kind: 'shape',
        ...rect,
        shape: currentStyle.shape,
        fill: currentStyle.fill.fill,
        stroke: currentStyle.fill.stroke,
      });
      return;
    }

    if (drag.kind === 'arrow') {
      paintDraft({
        kind: 'arrow',
        x1: drag.start.x,
        y1: drag.start.y,
        x2: world.x,
        y2: world.y,
        color: currentStyle.arrow,
        width: currentStyle.penWidth,
      });
      return;
    }

    const dx = world.x - drag.start.x;
    const dy = world.y - drag.start.y;
    if (!drag.dirty && Math.hypot(dx, dy) < 3 / cameraRef.current.zoom) return;
    drag.dirty = true;

    if (drag.kind === 'move') {
      gesture(replaceObject(objectsRef.current, drag.id, {
        ...drag.obj,
        x: drag.obj.x + dx,
        y: drag.obj.y + dy,
      }), {
        ...drag.obj,
        x: drag.obj.x + dx,
        y: drag.obj.y + dy,
      });
      return;
    }

    if (drag.kind === 'resize') {
      const size = resizeBox(drag.obj, drag.handle, world, drag.start);
      const nextObj = { ...drag.obj, ...size };
      gesture(replaceObject(objectsRef.current, drag.id, nextObj), nextObj);
      return;
    }

    if (drag.kind === 'arrow-end') {
      const start = drag.handle === 'start'
        ? world
        : { x: drag.obj.x + drag.obj.props.x1, y: drag.obj.y + drag.obj.props.y1 };
      const end = drag.handle === 'end'
        ? world
        : { x: drag.obj.x + drag.obj.props.x2, y: drag.obj.y + drag.obj.props.y2 };
      const bounds = arrowBounds(start, end, drag.obj.props);
      const nextObj = { ...drag.obj, ...bounds };
      gesture(replaceObject(objectsRef.current, drag.id, nextObj), nextObj);
    }
  }

  function trackPointer(event) {
    const move = (ev) => moveDrag(ev);
    const up = (ev) => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      finishDrag(ev);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    if (event.currentTarget.setPointerCapture) {
      try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* уже отпущен */ }
    }
  }

  function onPointerDown(event) {
    if (event.button !== 0 && event.button !== 1) return;
    if (readOnlyRef.current) {
      if (event.target.closest?.('[data-chrome], textarea, input')) return;
      dragRef.current = {
        kind: 'pan',
        client: { x: event.clientX, y: event.clientY },
        camera: { ...cameraRef.current },
      };
      paintCursor();
      trackPointer(event);
      return;
    }
    if (event.target instanceof Element && event.target.closest('[data-geo-live]')) return;
    if (event.target.closest('textarea, input')) return;
    if (event.target.closest('[data-chrome]')) return;

    const handleEl = event.target.closest('[data-handle]');
    const world = toWorld(event);
    const hand = toolRef.current === 'hand' || spaceRef.current || event.button === 1;

    if (hand && !handleEl) {
      dragRef.current = {
        kind: 'pan',
        client: { x: event.clientX, y: event.clientY },
        camera: { ...cameraRef.current },
      };
      paintCursor();
      trackPointer(event);
      return;
    }

    if (editingIdRef.current && !event.target.closest('textarea')) {
      actionsRef.current.commitEdit(editingIdRef.current);
    }

    if (toolRef.current === 'select' || handleEl) {
      if (handleEl) {
        const objectEl = handleEl.closest('[data-object]');
        const id = objectEl?.dataset.object;
        const obj = objectsRef.current.find((item) => item.id === id);
        if (!obj) return;
        const handle = handleEl.dataset.handle;
        dragRef.current = {
          kind: handle === 'start' || handle === 'end' ? 'arrow-end' : 'resize',
          id,
          handle,
          start: world,
          obj,
          origin: objectsRef.current,
          dirty: false,
        };
        setSelectedId(id);
        trackPointer(event);
        return;
      }

      const hit = topHit(objectsRef.current, world, cameraRef.current.zoom);
      if (!hit) {
        setSelectedId(null);
        setEditingId(null);
        return;
      }
      const front = bringToFront(objectsRef.current, hit.id);
      const origin = objectsRef.current;
      if (front !== origin) {
        objectsRef.current = front;
        raiseObject(hit.id);
      }
      const obj = front.find((item) => item.id === hit.id);
      setSelectedId(hit.id);
      if (hit.type === 'geogebra' && editingIdRef.current === hit.id) return;
      dragRef.current = {
        kind: 'move',
        id: hit.id,
        start: world,
        obj,
        origin,
        dirty: front !== origin,
      };
      trackPointer(event);
      return;
    }

    if (toolRef.current === 'pen') {
      dragRef.current = { kind: 'pen', points: [world] };
      if (hintRef.current) hintRef.current.style.display = 'none';
      paintDraft({ kind: 'pen', points: [world], color: styleRef.current.pen, width: styleRef.current.penWidth });
      trackPointer(event);
      return;
    }

    if (toolRef.current === 'eraser') {
      const radius = 16 / cameraRef.current.zoom;
      const next = eraseStrokes(objectsRef.current, world, radius);
      dragRef.current = { kind: 'eraser', origin: objectsRef.current, dirty: next.length !== objectsRef.current.length };
      if (dragRef.current.dirty) hideErased(objectsRef.current, next);
      trackPointer(event);
      return;
    }

    if (toolRef.current === 'shape' || toolRef.current === 'arrow') {
      if (hintRef.current) hintRef.current.style.display = 'none';
      dragRef.current = { kind: toolRef.current, start: world };
      trackPointer(event);
      return;
    }

    if (toolRef.current === 'sticky' || toolRef.current === 'text') {
      const sticky = toolRef.current === 'sticky';
      const obj = createObject(sticky ? 'sticky' : 'text', {
        x: world.x,
        y: world.y,
        w: sticky ? 200 : 240,
        h: sticky ? 160 : 72,
        props: sticky
          ? { text: '', color: styleRef.current.sticky, fontSize: 15 }
          : { text: '', fontSize: 22 },
      });
      commit([...objectsRef.current, obj]);
      beginEdit(obj.id);
      return;
    }

    if (toolRef.current === 'image') {
      imagePointRef.current = world;
      fileRef.current?.click();
      return;
    }

    if (toolRef.current === 'geogebra') {
      placeGeogebra(world);
    }
  }

  async function onImageFile(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    const point = imagePointRef.current;
    if (!file || !point || readOnlyRef.current) return;
    setNotice('');
    setSaveState('saving');
    try {
      const upload = audienceRef.current === 'teacher' ? uploadTeacherBoardImage : uploadStudentBoardImage;
      const uploaded = await upload(file);
      const obj = createObject('image', {
        x: point.x,
        y: point.y,
        w: 320,
        h: 240,
        props: {
          fileId: uploaded.fileId,
          src: uploaded.src,
          name: uploaded.name || file.name,
        },
      });
      commit([...objectsRef.current, obj]);
      setSelectedId(obj.id);
      setTool('select');
      setSaveState('saved');
    } catch (error) {
      setNotice(boardErrorMessage(error, 'Не удалось загрузить изображение'));
      setSaveState('error');
    }
  }

  async function placeGeogebra(world) {
    const templateId = styleRef.current.templateId || '';
    const known = templatesRef.current.find((item) => item.id === templateId) || geogebraTemplate(templateId);
    let ggbBase64 = '';
    let appName = known?.appName || styleRef.current.appName;
    let templateTitle = known?.title || '';
    if (templateId) {
      try {
        const full = await getGeoGebraTemplate(templateId);
        ggbBase64 = full?.ggbBase64 || '';
        appName = full?.appName || appName;
        templateTitle = full?.title || templateTitle;
      } catch (error) {
        if (error.response?.status !== 404) {
          setNotice(boardErrorMessage(error, 'Шаблон не загрузился'));
        }
      }
    }
    const obj = createObject('geogebra', {
      x: world.x,
      y: world.y,
      w: 440,
      h: 320,
      props: {
        appName,
        ggbBase64,
        templateId,
        templateTitle,
      },
    });
    commit([...objectsRef.current, obj]);
    setSelectedId(obj.id);
    setTool('select');
  }

  function onDoubleClick(event) {
    if (toolRef.current !== 'select') return;
    const world = toWorld(event);
    const hit = topHit(objectsRef.current, world, cameraRef.current.zoom);
    if (hit && (hit.type === 'sticky' || hit.type === 'text')) beginEdit(hit.id);
  }

  async function goBack() {
    await persistRef.current();
    navigate(backTo);
  }

  const context = tool === 'select' && selected ? selected.type : tool;
  const canUndo = historyCounts.undo > 0;
  const canRedo = historyCounts.redo > 0;

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#f3f3f4] text-zinc-900 dark:bg-[#101012] dark:text-zinc-100">
      <div
        ref={viewportRef}
        className="absolute inset-0 touch-none select-none"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(113,113,122,0.55) 1px, transparent 1px)',
          backgroundSize: `${22 * camera.zoom}px ${22 * camera.zoom}px`,
          backgroundPosition: `${camera.x}px ${camera.y}px`,
        }}
        onPointerDown={onPointerDown}
        onDoubleClick={onDoubleClick}
      >
        <div
          ref={worldRef}
          className="absolute left-0 top-0 origin-top-left"
          style={{ transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.zoom})` }}
        >
          {objects.map((obj) => (
            <BoardObject
              key={obj.id}
              obj={obj}
              zoom={camera.zoom}
              selected={obj.id === selectedId}
              editing={obj.id === editingId}
              geoEpoch={geoEpoch}
              onChangeText={changeText}
              onBlurText={commitEdit}
              onToggleGeo={(id) => {
                setSelectedId(id);
                setEditingId((current) => (current === id ? null : id));
              }}
              onGeoReady={(id, api) => {
                if (api) apiMap.current.set(id, api);
                else apiMap.current.delete(id);
              }}
              onGeoChange={() => {
                clearTimeout(geoTimerRef.current);
                geoTimerRef.current = setTimeout(() => persistRef.current(), 1200);
              }}
            />
          ))}
          <div ref={draftHostRef} className="pointer-events-none absolute left-0 top-0" />
        </div>
      </div>

      {objects.length === 0 && (
        <div ref={hintRef} className="pointer-events-none absolute inset-0 grid place-items-center px-6 text-center">
          <p className="max-w-sm text-sm text-zinc-500 dark:text-zinc-400">
            Пустой холст. Стикер, изображение и GeoGebra — на панели инструментов. Колесо двигает доску, Ctrl и колесо — масштаб.
          </p>
        </div>
      )}

      <div className="pointer-events-none absolute inset-x-0 top-0 z-40 flex items-center gap-2 p-2 [@media(min-height:760px)]:pl-[4.75rem]">
        <div className="pointer-events-auto flex min-w-0 flex-1 items-center gap-1 rounded-2xl border border-zinc-200/80 bg-white/90 px-1.5 py-1 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/90">
          <button
            type="button"
            onClick={goBack}
            className="inline-flex h-9 shrink-0 items-center gap-1 rounded-xl px-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            <ChevronLeft size={16} />
            <span className="hidden sm:inline">{backLabel}</span>
          </button>
          <input
            value={title}
            readOnly={readOnly}
            onChange={(event) => {
              titleRef.current = event.target.value;
              setTitle(event.target.value);
            }}
            aria-label="Название доски"
            className="h-9 min-w-0 flex-1 truncate bg-transparent px-1 text-sm font-semibold outline-none"
          />
          <span className="hidden shrink-0 pr-2 text-[11px] text-zinc-400 lg:inline">
            {saveState === 'saving' ? 'Сохранение…' : saveState === 'error' ? 'Не сохранилось' : saveState === 'conflict' ? 'На сервере новее' : readOnly ? 'Только просмотр' : 'Сохранено'}
          </span>
        </div>

        <div className="pointer-events-auto flex shrink-0 items-center gap-2">
          {selected && !readOnly && (
            <button
              type="button"
              onClick={deleteSelected}
              aria-label="Удалить"
              title="Удалить"
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-zinc-200/80 bg-white/90 text-zinc-700 shadow-sm hover:text-red-600 dark:border-zinc-800 dark:bg-zinc-950/90 dark:text-zinc-200"
            >
              <Trash2 size={15} />
            </button>
          )}
          <div className="flex items-center rounded-2xl border border-zinc-200/80 bg-white/90 p-1 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/90">
            <IconButton label="Отменить" disabled={!canUndo} onClick={undo}><Undo2 size={16} /></IconButton>
            <IconButton label="Повторить" disabled={!canRedo} onClick={redo}><Redo2 size={16} /></IconButton>
          </div>
          <div className="flex items-center rounded-2xl border border-zinc-200/80 bg-white/90 p-1 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/90">
            <IconButton label="Уменьшить" onClick={() => zoomBy(1 / 1.15)}><Minus size={16} /></IconButton>
            <button
              ref={zoomLabelRef}
              type="button"
              onClick={() => zoomBy(1 / cameraRef.current.zoom)}
              className="w-12 text-center text-xs font-medium tabular-nums text-zinc-600 dark:text-zinc-300"
            >
              {Math.round(camera.zoom * 100)}%
            </button>
            <IconButton label="Увеличить" onClick={() => zoomBy(1.15)}><Plus size={16} /></IconButton>
          </div>
        </div>
      </div>

      <div className="absolute inset-x-3 bottom-3 z-30 flex items-end justify-center gap-2 [@media(min-height:760px)]:inset-x-auto [@media(min-height:760px)]:bottom-auto [@media(min-height:760px)]:left-3 [@media(min-height:760px)]:top-16 [@media(min-height:760px)]:flex-col [@media(min-height:760px)]:items-start">
        <div className="flex flex-row items-center gap-1 rounded-2xl border border-zinc-200/80 bg-white/95 p-1.5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/95 [@media(min-height:760px)]:w-12 [@media(min-height:760px)]:flex-col">
          {TOOLS.map((item) => {
            const Icon = item.icon;
            const active = tool === item.id;
            const divider = item.id === 'sticky' || item.id === 'image';
            return (
              <div key={item.id} className="flex items-center [@media(min-height:760px)]:w-full [@media(min-height:760px)]:flex-col">
                {divider && <div className="mx-0.5 h-6 w-px bg-zinc-200 dark:bg-zinc-800 [@media(min-height:760px)]:mx-1 [@media(min-height:760px)]:my-1 [@media(min-height:760px)]:h-px [@media(min-height:760px)]:w-6" />}
                <button
                  type="button"
                  title={`${item.label} (${item.hint})`}
                  aria-label={item.label}
                  aria-pressed={active}
                  onClick={() => setTool(item.id)}
                  className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${active ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950' : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900'}`}
                >
                  <Icon size={18} strokeWidth={1.75} />
                </button>
              </div>
            );
          })}
        </div>
        <StyleTray
          context={context}
          style={style}
          selected={selected}
          editingId={editingId}
          templates={templates}
          notice={notice}
          onStyle={setStyle}
          onPatch={(patch) => selected && patchProps(selected.id, patch)}
          onToggleGeo={() => selected && setEditingId((current) => (current === selected.id ? null : selected.id))}
        />
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={onImageFile}
      />
    </div>
  );
}

function IconButton({ label, onClick, disabled, children }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex h-8 w-8 items-center justify-center rounded-xl text-zinc-700 hover:bg-zinc-100 disabled:opacity-30 dark:text-zinc-200 dark:hover:bg-zinc-900"
    >
      {children}
    </button>
  );
}

function StyleTray({ context, style, selected, editingId, templates, notice, onStyle, onPatch, onToggleGeo }) {
  if (context === 'sticky') {
    return (
      <SwatchCard label="Цвет стикера">
        {STICKY_COLORS.map((color) => (
          <ColorDot
            key={color.id}
            color={color.bg}
            label={color.label}
            active={(selected?.props.color || style.sticky) === color.bg}
            onClick={() => {
              onStyle((prev) => ({ ...prev, sticky: color.bg }));
              if (selected?.type === 'sticky') onPatch({ color: color.bg });
            }}
          />
        ))}
      </SwatchCard>
    );
  }

  if (context === 'pen' || context === 'draw' || context === 'eraser') {
    return (
      <SwatchCard label="Кисть">
        <div className="flex flex-wrap gap-1.5">
          {PEN_COLORS.map((color) => (
            <ColorDot
              key={color}
              color={color}
              label={color}
              active={(selected?.type === 'draw' ? selected.props.color : style.pen) === color}
              onClick={() => {
                onStyle((prev) => ({ ...prev, pen: color, arrow: prev.arrow }));
                if (selected?.type === 'draw') onPatch({ color });
              }}
            />
          ))}
        </div>
        <div className="mt-2 flex gap-1">
          {PEN_WIDTHS.map((width) => (
            <button
              key={width}
              type="button"
              onClick={() => {
                onStyle((prev) => ({ ...prev, penWidth: width }));
                if (selected?.type === 'draw') onPatch({ width });
              }}
              className={`h-7 min-w-7 rounded-lg px-1.5 text-[11px] font-semibold ${(selected?.type === 'draw' ? selected.props.width : style.penWidth) === width ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950' : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300'}`}
            >
              {width}
            </button>
          ))}
        </div>
      </SwatchCard>
    );
  }

  if (context === 'shape') {
    const activeFill = selected?.type === 'shape' ? selected.props.fill : style.fill.fill;
    return (
      <SwatchCard label="Фигура">
        <div className="mb-2 flex gap-1">
          <button
            type="button"
            aria-label="Прямоугольник"
            onClick={() => {
              onStyle((prev) => ({ ...prev, shape: 'rect' }));
              if (selected?.type === 'shape') onPatch({ shape: 'rect' });
            }}
            className={`flex h-8 w-8 items-center justify-center rounded-lg ${(selected?.props.shape || style.shape) === 'rect' ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950' : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-900'}`}
          >
            <Square size={15} />
          </button>
          <button
            type="button"
            aria-label="Эллипс"
            onClick={() => {
              onStyle((prev) => ({ ...prev, shape: 'ellipse' }));
              if (selected?.type === 'shape') onPatch({ shape: 'ellipse' });
            }}
            className={`flex h-8 w-8 items-center justify-center rounded-lg ${(selected?.props.shape || style.shape) === 'ellipse' ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950' : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-900'}`}
          >
            <Circle size={15} />
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {SHAPE_FILLS.map((fill) => (
            <ColorDot
              key={fill.id}
              color={fill.fill}
              label={fill.label}
              active={activeFill === fill.fill}
              onClick={() => {
                onStyle((prev) => ({ ...prev, fill }));
                if (selected?.type === 'shape') onPatch({ fill: fill.fill, stroke: fill.stroke });
              }}
            />
          ))}
        </div>
      </SwatchCard>
    );
  }

  if (context === 'arrow') {
    return (
      <SwatchCard label="Стрелка">
        <div className="flex flex-wrap gap-1.5">
          {PEN_COLORS.map((color) => (
            <ColorDot
              key={color}
              color={color}
              label={color}
              active={(selected?.type === 'arrow' ? selected.props.color : style.arrow) === color}
              onClick={() => {
                onStyle((prev) => ({ ...prev, arrow: color }));
                if (selected?.type === 'arrow') onPatch({ color });
              }}
            />
          ))}
        </div>
      </SwatchCard>
    );
  }

  if (context === 'image') {
    return (
      <SwatchCard label="Изображение" wide>
        <p className="text-[11px] leading-snug text-zinc-500">
          Клик по доске открывает файл. На холст попадёт адрес с сервера.
        </p>
        {notice && <p className="mt-2 text-[11px] leading-snug text-red-600">{notice}</p>}
      </SwatchCard>
    );
  }

  if (context === 'geogebra') {
    const selectedTemplate = selected?.type === 'geogebra' && selected.props.templateId
      ? (templates.find((item) => item.id === selected.props.templateId) || {
        id: selected.props.templateId,
        title: selected.props.templateTitle || selected.props.templateId,
      })
      : null;
    if (selected?.type === 'geogebra' && selectedTemplate && !selected.props.ggbBase64) {
      return (
        <SwatchCard label="Шаблон" wide>
          <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-100">{selectedTemplate.title}</p>
          <p className="mt-1 text-[11px] leading-snug text-zinc-500">Построение придёт с сервера. Пока это пустая рамка.</p>
        </SwatchCard>
      );
    }
    if (selected?.type === 'geogebra') {
      return (
        <SwatchCard label="GeoGebra">
          <button
            type="button"
            onClick={onToggleGeo}
            className="w-full rounded-lg bg-zinc-900 px-2 py-1.5 text-xs font-semibold text-white dark:bg-white dark:text-zinc-950"
          >
            {editingId === selected.id ? 'Двигать объект' : 'Чертить внутри'}
          </button>
        </SwatchCard>
      );
    }
    return (
      <SwatchCard label="GeoGebra" wide>
        <div className="flex max-h-44 flex-col gap-1 overflow-y-auto">
          {[
            ['geometry', 'Пустая геометрия'],
            ['graphing', 'Пустые графики'],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => onStyle((prev) => ({ ...prev, appName: id, templateId: '' }))}
              className={`rounded-lg px-2 py-1.5 text-left text-xs font-medium ${!style.templateId && style.appName === id ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950' : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-200'}`}
            >
              {label}
            </button>
          ))}
          {templates.map((item) => (
            <button
              key={`${item.teacherId || 'local'}-${item.id}`}
              type="button"
              onClick={() => onStyle((prev) => ({ ...prev, appName: item.appName, templateId: item.id }))}
              className={`rounded-lg px-2 py-1.5 text-left text-xs font-medium ${style.templateId === item.id ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950' : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-200'}`}
            >
              {item.title}
            </button>
          ))}
        </div>
      </SwatchCard>
    );
  }

  return null;
}

function SwatchCard({ label, children, wide = false }) {
  return (
    <div className={`${wide ? 'w-48' : 'w-36'} rounded-2xl border border-zinc-200/80 bg-white/95 p-2.5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/95`}>
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">{label}</p>
      {children}
    </div>
  );
}

function ColorDot({ color, label, active, onClick }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`h-5 w-5 rounded-full border ${active ? 'ring-2 ring-zinc-900 ring-offset-2 ring-offset-white dark:ring-white dark:ring-offset-zinc-950' : 'border-zinc-300 dark:border-zinc-700'}`}
      style={{ background: color }}
    />
  );
}
