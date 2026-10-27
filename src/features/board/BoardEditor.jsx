import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Eraser,
  Eye,
  EyeOff,
  Hand,
  Image,
  Link2,
  LocateFixed,
  Maximize2,
  Grid3x3,
  Menu,
  Minus,
  Circle,
  MousePointer2,
  Pencil,
  Pi,
  Pointer,
  Plus,
  Redo2,
  Square,
  StickyNote,
  Type,
  Undo2,
  WifiOff,
  X,
} from 'lucide-react';
import ObjectLayer from './ObjectLayer';
import { cullingRect } from './culling';
import { createBoardStore, sameIdList, useStoreSelector } from './store';
import { createMotion } from './motion';
import SelectionToolbar from './SelectionToolbar';
import {
  boardErrorMessage,
  createTeacherBoard,
  updateTeacherBoardShare,
  deleteTeacherBoard,
  listStudentBoards,
  listTeacherBoards,
  uploadStudentBoardImage,
  uploadTeacherBoardImage,
} from './api';
import { elementStates, graphStructure, readGeoGebraBase64, readGeoGebraView, readGeoGebraXml, readMenuValue, sameGeoGebraView, stripCamera } from './geogebraApi';
import { theoryAppKind } from '../../shared/geogebra/setup';
import { connectBoard, setRemoteTitle } from './live';
import { getCurrentUser } from '../../shared/lib/session';
import { setPenActive } from './penLock';
import { applyOp, diffOps, keepLongerStrokes, reorder, strokeDuration } from './ops';
import { applyHistory, createdOnly, historyEntry } from './history';
import {
  arrowBounds,
  boundsOf,
  clamp,
  eraseStrokes,
  intersects,
  rectFromPoints,
  strokeBounds,
  hitObject,
  smoothPath,
} from './geometry';
import { MAX_ZOOM, MIN_ZOOM, fitCamera, loadLocalCamera, saveLocalCamera } from './camera';
import { cloneObjects, parseObjects, serializeObjects } from './clipboard';
import {
  GEOGEBRA_APPS,
  PEN_COLORS,
  PEN_WIDTHS,
  SELECTION_COLOR,
  SHAPE_FILLS,
  STICKY_COLORS,
  TEXT_SIZES,
  createObject,
  geogebraApp,
  sameSeries,
  TASK_FONT,
  uid,
} from './model';
import { boardImageSrc } from './images';
import ShapeGlyph from './ShapeGlyph';
import {
  SHAPE_GROUPS,
  appendFigures,
  bindFromHit,
  defaultDepth,
  dropBindsTo,
  extendStraight,
  hitShape,
  isRegularShape,
  planeDefaults,
  polylineFrame,
  joinArrows,
  plantPoint,
  releaseMissingBinds,
  setArrowSide,
  splitArrowThroughPoints,
  settleSnap,
  shapeFigures,
  snapFigurePoint,
} from './shapes';
import { DEFAULT_SURFACE, SURFACE_COLORS, SURFACE_MARK, isHiddenBoardObject, isSurfaceMeta, readSurface } from './meta';
import { deleteBoard } from './storage';
import BoardTheoryPane from './BoardTheoryPane';
import BoardTasksPane from './BoardTasksPane';
import BoardStudentsPane from './BoardStudentsPane';
import { taskOptions } from './taskBankApi';
import { SNAP_PX, dragKindForHandle, followMoved, gestureStep, handleIndex, isEditGesture, settleGesture, squareFrom } from './tools/gestures';

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

function selfName() {
  const user = getCurrentUser();
  const full = [user?.first_name, user?.last_name].filter(Boolean).join(' ');
  return full || user?.username || '';
}

function hasNoCanvasObjects(objects) {
  return !objects.some((obj) => !isHiddenBoardObject(obj));
}

function isMeasured(obj) {
  return obj?.type === 'task'
    || (obj?.type === 'text' && (obj.props?.format === 'theory' || obj.props?.format === 'markdown'));
}


const LASER_COLOR = '#fde047';
const LASER_WIDTH = 18;
const LASER_COLORS = [LASER_COLOR, '#18181b', '#dc2626', '#2563eb', '#16a34a', '#d97706', '#7c3aed'];
const LASER_WIDTHS = [10, 18, 32, 56];
const LASER_FADE_MS = 2000;
const LASER_MAX_POINTS = 2000;
const INK_SPEED = 720;

const TOOLS = [
  { id: 'select', label: 'Выбор', hint: 'V', icon: MousePointer2 },
  { id: 'hand', label: 'Рука', hint: 'H', icon: Hand },
  { id: 'sticky', label: 'Стикер', hint: 'N', icon: StickyNote },
  { id: 'text', label: 'Текст', hint: 'T', icon: Type },
  { id: 'shape', label: 'Фигура', hint: 'R', icon: Square },
  { id: 'arrow', label: 'Отрезок', hint: 'L', icon: Minus },
  { id: 'point', label: 'Точка', hint: '.', icon: Circle },
  { id: 'pen', label: 'Кисть', hint: 'P', icon: Pencil },
  { id: 'laser', label: 'Указка', hint: 'U', icon: Pointer },
  { id: 'eraser', label: 'Ластик', hint: 'E', icon: Eraser },
  { id: 'image', label: 'Изображение', hint: 'I', icon: Image },
  { id: 'geogebra', label: 'GeoGebra', hint: 'G', icon: Pi },
];

const INITIAL_STYLE = {
  sticky: STICKY_COLORS[0].bg,
  pen: PEN_COLORS[0],
  penWidth: 2,
  laserColor: LASER_COLOR,
  laserWidth: LASER_WIDTH,
  shape: 'cube',
  fill: SHAPE_FILLS[0],
  arrow: PEN_COLORS[0],
  textSize: 22,
  appName: 'geometry',
  templateId: '',
};

const TOOL_CODES = {
  KeyV: 'select',
  KeyH: 'hand',
  KeyN: 'sticky',
  KeyT: 'text',
  KeyR: 'shape',
  KeyO: 'shape',
  KeyL: 'arrow',
  KeyP: 'pen',
  KeyU: 'laser',
  KeyE: 'eraser',
  KeyI: 'image',
  KeyG: 'geogebra',
};

const MAX_OBJECTS = 10000;
const DRAG_HIDES_BAR = new Set(['move', 'resize', 'arrow-end', 'depth', 'shape-knob', 'poly-point', 'apex', 'base-point', 'marquee', 'pinch']);
const IMAGE_TYPES = /^image\/(png|jpe?g|webp)$/;
const DEFAULT_CAMERA = { x: 64, y: 72, zoom: 1 };
const SEND_MS = 50;
const GEO_XML_MS = 200;
const GEO_XML_MOVING_MS = 1000;
const GEO_SAVE_MS = 4000;
const TASK_CARD_W = 560;
const TASK_CARD_GAP = 32;
const PEER_COLORS = ['#e11d48', '#2563eb', '#16a34a', '#d97706', '#9333ea', '#0891b2', '#db2777', '#4f46e5'];

function boardTitle(value) {
  return (value || '').trim() || 'Доска';
}

function peerColor(clientId) {
  let hash = 0;
  for (const char of String(clientId || '')) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return PEER_COLORS[Math.abs(hash) % PEER_COLORS.length];
}

function peerName(peer) {
  return peer?.name || (peer?.role === 'teacher' ? 'Учитель' : 'Ученик');
}

function initials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  return (parts.length > 1 ? parts[0][0] + parts[1][0] : (parts[0] || '?').slice(0, 2)).toUpperCase();
}

function roundPoint(point) {
  return { x: Math.round(point.x * 10) / 10, y: Math.round(point.y * 10) / 10 };
}

function imageFiles(list) {
  return Array.from(list || []).filter((file) => IMAGE_TYPES.test(file.type));
}

async function imageSize(file) {
  if (typeof createImageBitmap !== 'function') return null;
  try {
    const bitmap = await createImageBitmap(file);
    const size = { w: bitmap.width, h: bitmap.height };
    bitmap.close?.();
    return size;
  } catch {
    return null;
  }
}

function freshPageTitle(pages) {
  const taken = new Set(pages.map((page) => boardTitle(page.title)));
  const date = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'numeric' }).format(new Date());
  if (!taken.has(date)) return date;
  let index = 2;
  while (taken.has(`${date} (${index})`)) index += 1;
  return `${date} (${index})`;
}

function isTypingTarget(target) {
  return target instanceof Element && Boolean(target.closest('input, textarea, [contenteditable="true"], [data-geo-live]'));
}

export default function BoardEditor({
  initialBoard,
  readOnly = false,
  audience = 'student',
  backTo = '/student/board',
  backLabel = 'Доски',
  shareToken = null,
}) {
  const navigate = useNavigate();
  const [savedCamera] = useState(() => loadLocalCamera(initialBoard.id));

  const viewportRef = useRef(null);
  const worldRef = useRef(null);
  const draftHostRef = useRef(null);
  const laserHostRef = useRef(null);
  const inkRef = useRef({ items: new Map(), raf: 0 });
  const guideHostRef = useRef(null);
  const groupBoxRef = useRef(null);
  const barRef = useRef(null);
  const zoomLabelRef = useRef(null);
  const hintRef = useRef(null);
  const cameraSyncRef = useRef(0);
  const cameraFrameRef = useRef(0);
  const surfacePaintRef = useRef('');
  const wheelRef = useRef(() => {});
  const [store] = useState(() => createBoardStore(initialBoard.objects || []));
  const [motion] = useState(() => createMotion());
  const cameraRef = useRef(savedCamera || DEFAULT_CAMERA);
  const titleRef = useRef(boardTitle(initialBoard.title));
  const boardIdRef = useRef(initialBoard.id);
  const sentRef = useRef(initialBoard.objects || []);
  const sentTitleRef = useRef(boardTitle(initialBoard.title));
  const socketRef = useRef(null);
  const geoCamInRef = useRef(new Map());
  const geoInputInRef = useRef(new Map());
  const geoMoveInRef = useRef(new Map());
  const geoCamLastRef = useRef(new Map());
  const geoSeqRef = useRef(new Map());
  const geoCamFromRef = useRef(new Map());
  const sendTimerRef = useRef(0);
  const lastCursorRef = useRef(0);
  const cursorTimerRef = useRef(0);
  const cursorNodesRef = useRef(new Map());
  const peerCursorsRef = useRef(new Map());
  const cursorsOnRef = useRef(true);
  const gestureIdsRef = useRef(new Set());
  const clientIdRef = useRef(null);
  const lastErrorRef = useRef({ text: '', at: 0 });
  const apiMap = useRef(new Map());
  const pastRef = useRef([]);
  const futureRef = useRef([]);
  const dragRef = useRef(null);
  const chainRef = useRef(null);
  const draftRef = useRef(null);
  const linkHoldRef = useRef(null);
  const dragCleanupRef = useRef(null);
  const touchesRef = useRef(new Map());
  const pointerClientRef = useRef(null);
  const editOriginRef = useRef(null);
  const editingIdRef = useRef(null);
  const selectedIdsRef = useRef([]);
  const toolRef = useRef('select');
  const styleRef = useRef(INITIAL_STYLE);
  const actionsRef = useRef({});
  const liveRef = useRef({});
  const mountedRef = useRef(true);
  const spaceRef = useRef(false);
  const geoTimerRef = useRef(null);
  const geoXmlTimerRef = useRef(null);
  const geoXmlDueRef = useRef(0);
  const geoLayoutTimerRef = useRef(0);
  const pendingTaskHeightsRef = useRef(new Map());
  const taskMeasureRafRef = useRef(0);
  const stackRef = useRef(null);
  const geoDirtyRef = useRef(new Set());
  const readOnlyRef = useRef(readOnly);
  const audienceRef = useRef(audience);
  const fileRef = useRef(null);
  const imagePointRef = useRef(null);
  const noticeTimerRef = useRef(0);

  const [camera, setCamera] = useState(savedCamera || DEFAULT_CAMERA);
  const [viewSize, setViewSize] = useState({ w: 0, h: 0 });
  const renderedRectRef = useRef(null);
  const cullFollowRef = useRef(false);
  const [title, setTitle] = useState(boardTitle(initialBoard.title));
  const [tool, setTool] = useState('select');
  const [selectedIds, setSelectedIds] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [link, setLink] = useState({ state: 'connecting', pending: 0 });
  const [peers, setPeers] = useState([]);
  const peersRef = useRef([]);
  const [selfId, setSelfId] = useState(null);
  const [historyCounts, setHistoryCounts] = useState({ undo: 0, redo: 0 });
  const [style, setStyle] = useState(INITIAL_STYLE);
  const [notice, setNotice] = useState('');
  const [pagesOpen, setPagesOpen] = useState(false);
  const [surfaceOpen, setSurfaceOpen] = useState(false);
  const [sidePane, setSidePane] = useState(null);
  const [keptPanes, setKeptPanes] = useState({ theory: false, tasks: false, students: false });
  const sideStudentsRef = useRef(initialBoard.studentIds || EMPTY_STUDENTS);
  const [cursorsOn, setCursorsOn] = useState(true);
  const [shareAccess, setShareAccess] = useState(initialBoard.shareAccess || 'off');
  const [shareTokenState, setShareTokenState] = useState(initialBoard.shareToken || null);
  const [shareOpen, setShareOpen] = useState(false);
  const theoryOpen = sidePane !== null;
  const [surface, setSurface] = useState(() => readSurface(initialBoard.objects));
  const surfaceRef = useRef(surface);
  const [series, setSeries] = useState([]);
  const [editingPageId, setEditingPageId] = useState(null);
  const [editingPageTitle, setEditingPageTitle] = useState('');
  const pageClickRef = useRef(0);
  const boardMetaRef = useRef({
    id: initialBoard.id,
    title: boardTitle(initialBoard.title),
    groupId: initialBoard.groupId ?? null,
    studentIds: initialBoard.studentIds || [],
    seriesId: initialBoard.seriesId || null,
    createdAt: initialBoard.createdAt || '',
  });

  const canvasEmpty = useStoreSelector(store, hasNoCanvasObjects);
  const canUndo = historyCounts.undo > 0;
  const canRedo = historyCounts.redo > 0;

  function notify(text) {
    if (!mountedRef.current) return;
    window.clearTimeout(noticeTimerRef.current);
    setNotice(text);
    if (text) noticeTimerRef.current = window.setTimeout(() => setNotice(''), 6000);
  }

  function noteHistory() {
    setHistoryCounts({ undo: pastRef.current.length, redo: futureRef.current.length });
  }

  function pushHistory(before, after = store.get()) {
    const entry = historyEntry(before, after);
    if (!entry) return;
    pastRef.current.push(entry);
    if (pastRef.current.length > 80) pastRef.current.shift();
    futureRef.current = [];
    noteHistory();
  }

  function applySurface(next) {
    surfaceRef.current = next;
    setSurface(next);
    paintSurface(cameraRef.current);
    if (readOnlyRef.current) return;
    const props = { system: SURFACE_MARK, text: '', color: next.color, grid: next.grid };
    const existing = store.get().find(isSurfaceMeta);
    if (!existing) {
      commit([...store.get(), createObject('text', { x: -10000, y: -10000, w: 1, h: 1, props })]);
      return;
    }
    commit(store.get().map((obj) => (obj.id === existing.id ? { ...obj, props } : obj)));
  }

  function commit(next) {
    pushHistory(store.get(), next);
    store.set(next);
    scheduleSend();
  }

  function send(op) {
    if (readOnlyRef.current) return;
    socketRef.current?.send(op);
  }

  function flushOps() {
    window.clearTimeout(sendTimerRef.current);
    sendTimerRef.current = 0;
    if (readOnlyRef.current) {
      sentRef.current = store.get();
      return;
    }
    const before = sentRef.current;
    const after = store.get();
    if (before !== after) {
      sentRef.current = after;
      diffOps(before, after).forEach(send);
    }
    const nextTitle = boardTitle(titleRef.current);
    if (nextTitle !== sentTitleRef.current) {
      sentTitleRef.current = nextTitle;
      send({ type: 'title', title: nextTitle });
    }
  }

  function scheduleSend() {
    if (sendTimerRef.current) return;
    sendTimerRef.current = window.setTimeout(() => liveRef.current.flushOps(), SEND_MS);
  }

  function movePeerToStroke(clientId, id) {
    const obj = store.get().find((item) => item.id === id);
    const points = obj?.type === 'draw' ? obj.props?.points : null;
    if (!clientId || !points?.length) return;
    const last = points[points.length - 1];
    peerCursorsRef.current.set(clientId, { x: obj.x + last.x, y: obj.y + last.y });
    paintPeerCursors();
  }

  function applyIncoming(op) {
    const before = store.get();
    sentRef.current = applyOp(sentRef.current, op);
    const next = applyOp(before, op);
    if (next === before) return;
    const id = op.type === 'patch' ? op.id : op.type === 'upsert' ? op.object?.id : null;
    const prev = id ? store.getById(id) : null;
    store.set(next);
    // Чужой сдвиг и размер доезжают плавно; свой жест над тем же объектом важнее.
    if (prev && !gestureIdsRef.current.has(id)) motion.note(prev, store.getById(id));
    pruneSelection();
    // Чертёж взял другой участник (гонка нажатий) — уступаем ему, не трогая его замок.
    const editing = editingIdRef.current && store.getById(editingIdRef.current);
    const holder = editing?.type === 'geogebra' ? geoEditor(editing) : null;
    if (holder) {
      editingIdRef.current = null;
      setEditingId(null);
      notify(`Чертёж взял ${holder.name || 'другой участник'}`);
    }
  }

  function onSnapshot(message, readPending) {
    flushOps();
    const pendingOps = readPending();
    let next = keepLongerStrokes(store.get(), Array.isArray(message.board?.objects) ? message.board.objects : []);
    pendingOps.forEach((op) => {
      next = applyOp(next, op);
    });
    const remoteTitle = boardTitle(message.board?.title);
    const pendingTitle = [...pendingOps].reverse().find((op) => op.type === 'title');
    sentRef.current = next;
    store.set(next);
    sentTitleRef.current = pendingTitle ? pendingTitle.title : remoteTitle;
    titleRef.current = sentTitleRef.current;
    clientIdRef.current = message.clientId || null;
    setSelfId(clientIdRef.current);
    if (typeof message.cursors === 'boolean') {
      cursorsOnRef.current = message.cursors;
      setCursorsOn(message.cursors);
    }
    if (Array.isArray(message.geocams)) {
      message.geocams.forEach((cam) => {
        if (cam?.id) geoCamLastRef.current.set(cam.id, cam);
      });
    }
    const roster = (message.peers || []).filter((peer) => peer.clientId !== message.clientId);
    peerCursorsRef.current = new Map([...peerCursorsRef.current].filter(([id]) => roster.some((peer) => peer.clientId === id)));
    if (!mountedRef.current) return;
    setTitle(titleRef.current);
    setPeers(roster);
    peersRef.current = roster;
    pruneSelection();
    // После переподключения у нас новый clientId: замок на свой чертёж переписываем.
    const editing = editingIdRef.current && store.getById(editingIdRef.current);
    if (editing?.type === 'geogebra' && editing.props?.editor?.clientId !== clientIdRef.current) {
      if (geoEditor(editing)) {
        editingIdRef.current = null;
        setEditingId(null);
      } else if (!readOnlyRef.current) setGeoLock(editing.id, true);
    }
  }

  function showLaser(message) {
    const host = laserHostRef.current;
    const points = Array.isArray(message?.points) ? message.points : [];
    if (!host || points.length < 2) return;
    if (message.clientId && message.clientId === clientIdRef.current) return;
    const origin = points[0];
    const wrap = document.createElement('div');
    wrap.style.position = 'absolute';
    wrap.style.left = `${origin.x}px`;
    wrap.style.top = `${origin.y}px`;
    wrap.style.width = '12px';
    wrap.style.height = '12px';
    wrap.style.overflow = 'visible';
    wrap.style.pointerEvents = 'none';
    wrap.style.opacity = '1';
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '12');
    svg.setAttribute('height', '12');
    svg.style.display = 'block';
    svg.style.overflow = 'visible';
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const local = points.map((point) => ({ x: Number(point.x) - origin.x, y: Number(point.y) - origin.y }));
    path.setAttribute('d', smoothPath(local.slice(0, 2)));
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', message.color || LASER_COLOR);
    path.setAttribute('stroke-width', String(message.width || LASER_WIDTH));
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');
    svg.appendChild(path);
    wrap.appendChild(svg);
    host.appendChild(wrap);
    const drawMs = Math.min(1600, Math.max(400, local.length * 6));
    const fadeMs = Math.max(1, Number(message.fadeMs) || LASER_FADE_MS);
    let started = 0;
    const tick = (now) => {
      if (!wrap.isConnected) return;
      if (!started) started = now;
      const elapsed = now - started;
      if (elapsed < drawMs) {
        const count = Math.max(2, Math.ceil(local.length * (elapsed / drawMs)));
        path.setAttribute('d', smoothPath(local.slice(0, count)));
        requestAnimationFrame(tick);
        return;
      }
      path.setAttribute('d', smoothPath(local));
      const fade = Math.min(1, (elapsed - drawMs) / fadeMs);
      wrap.style.opacity = String(1 - fade);
      if (fade < 1) requestAnimationFrame(tick);
      else wrap.remove();
    };
    requestAnimationFrame(tick);
  }

  function paintInk(now) {
    const ink = inkRef.current;
    const viewport = viewportRef.current;
    let alive = false;
    ink.items.forEach((item, id) => {
      const path = viewport?.querySelector(`[data-object="${CSS.escape(id)}"] path`);
      if (!path) {
        // Штрих ещё не отрисован или ушёл за экран: ждём недолго и бросаем анимацию.
        item.missing = (item.missing || 0) + 1;
        if (item.missing > 120) ink.items.delete(id);
        else alive = true;
        return;
      }
      const length = path.getTotalLength();
      if (!length) {
        alive = true;
        return;
      }
      if (!item.duration) item.duration = Math.min(4000, Math.max(280, (length / INK_SPEED) * 1000));
      if (!item.at) item.at = now;
      const progress = Math.min(1, (now - item.at) / item.duration);
      path.style.strokeDasharray = String(length);
      path.style.strokeDashoffset = String(length * (1 - progress));
      if (progress < 1) alive = true;
      else {
        path.style.strokeDasharray = '';
        path.style.strokeDashoffset = '';
        ink.items.delete(id);
      }
    });
    return alive;
  }

  function startInk(id) {
    if (!id) return;
    const ink = inkRef.current;
    ink.items.set(id, { at: 0 });
    if (ink.raf) return;
    const tick = (now) => {
      ink.last = now;
      ink.raf = paintInk(now) ? requestAnimationFrame(tick) : 0;
    };
    ink.raf = requestAnimationFrame(tick);
  }

  function onAckObject(obj) {
    if (!obj?.id) return;
    applyIncoming({ type: 'upsert', object: obj });
  }

  function onOpError(detail) {
    const text = typeof detail === 'string' && detail ? detail : 'Сервер не принял изменение';
    const last = lastErrorRef.current;
    const now = Date.now();
    if (last.text === text && now - last.at < 4000) return;
    lastErrorRef.current = { text, at: now };
    notify(text);
  }

  function onClosed(code) {
    if (code === 4404) {
      deleteBoard(boardIdRef.current).catch(() => {});
      if (mountedRef.current) navigate(backTo, { replace: true });
      return;
    }
    if (!mountedRef.current) return;
    setLink({ state: 'denied', pending: 0 });
    notify(code === 4401 ? 'Сессия истекла. Войдите заново, чтобы продолжить.' : 'Нет доступа к этой доске.');
  }

  function paintPeerCursors() {
    if (!cursorsOnRef.current) {
      cursorNodesRef.current.forEach((node) => { node.style.display = 'none'; });
      return;
    }
    const cam = cameraRef.current;
    cursorNodesRef.current.forEach((node, clientId) => {
      const point = peerCursorsRef.current.get(clientId);
      if (!point) {
        node.style.display = 'none';
        return;
      }
      node.style.display = '';
      node.style.transform = `translate(${Math.round(cam.x + point.x * cam.zoom)}px, ${Math.round(cam.y + point.y * cam.zoom)}px)`;
    });
  }

  function sendCursor(clientX, clientY) {
    const socket = socketRef.current;
    if (!socket || !viewportRef.current || !cursorsOnRef.current) return;
    const editing = store.get().find((obj) => obj.id === editingIdRef.current);
    if (editing?.type === 'geogebra') return;
    const now = performance.now();
    const wait = SEND_MS - (now - lastCursorRef.current);
    const push = () => {
      cursorTimerRef.current = 0;
      lastCursorRef.current = performance.now();
      const client = pointerClientRef.current;
      if (!client || !viewportRef.current) return;
      const world = clientToWorld(client.x, client.y);
      if (!world) return;
      socket.cursor(Math.round(world.x), Math.round(world.y));
    };
    pointerClientRef.current = { x: clientX, y: clientY };
    if (wait <= 0) push();
    else if (!cursorTimerRef.current) cursorTimerRef.current = window.setTimeout(push, wait);
  }

  function canvasList() {
    return store.get().filter((obj) => !isHiddenBoardObject(obj));
  }

  function addObjects(list) {
    if (!list.length) return false;
    if (store.get().length + list.length > MAX_OBJECTS) {
      notify(`На доске может быть не больше ${MAX_OBJECTS} объектов`);
      return false;
    }
    commit([...store.get(), ...list]);
    return true;
  }

  function placeTheoryBlock(payload) {
    const point = viewportCenterWorld();
    if (!point) return;
    if (payload?.kind === 'geogebra') {
      const height = Math.max(220, parseInt(payload.height, 10) || 400);
      const obj = createObject('geogebra', {
        x: point.x - 220,
        y: point.y - height / 2,
        w: 440,
        h: height + 160,
        props: {
          appName: theoryAppKind(payload.setup),
          theory: true,
          setup: payload.setup || '',
          ...(payload.materialId ? { materialId: payload.materialId } : {}),
          controls: payload.controls || [],
          texts: payload.texts || [],
          height: String(height),
        },
      });
      if (addObjects([obj])) selectIds([obj.id]);
      return;
    }
    if (payload?.kind === 'theory' && payload.block) {
      const viewport = viewportRef.current;
      if (!viewport) return;
      const rect = viewport.getBoundingClientRect();
      const origin = clientToWorld(rect.left + 16, rect.top + 96);
      const obj = createObject('text', {
        x: origin.x,
        y: origin.y,
        w: 768,
        h: 320,
        props: { format: 'theory', theoryBlock: payload.block, text: '' },
      });
      if (addObjects([obj])) selectIds([obj.id]);
      return;
    }
    const text = String(payload?.text || '').trim();
    if (!text) return;
    const obj = createObject('text', {
      x: point.x - 180,
      y: point.y - 80,
      w: 360,
      h: 220,
      props: { text, format: 'markdown' },
    });
    if (addObjects([obj])) selectIds([obj.id]);
  }

  function estimateTaskHeight(props) {
    const text = `${props.content}\n${props.options.join('\n')}`;
    const lines = text.split('\n').reduce((sum, line) => sum + Math.max(1, Math.ceil(line.length / 42)), 0);
    const images = (text.match(/!\[[^\]]*\]\([^)]+\)/g) || []).length;
    const answers = props.options.length || props.openAnswer ? 40 + props.options.length * 24 : 0;
    return 90 + lines * 30 + images * 430 + answers + (props.openAnswer ? 52 : 0);
  }

  function placeTasks(items, source) {
    if (!Array.isArray(items) || !items.length) return;
    const point = viewportCenterWorld();
    let y = point.y - 160;
    const list = items.map(({ task, number }) => {
      const teacherOnly = {};
      if (task.answer != null && String(task.answer).trim()) teacherOnly.answer = String(task.answer);
      if (task.solution && String(task.solution).trim()) teacherOnly.solution = String(task.solution);
      if (Array.isArray(task.studentAnswers) && task.studentAnswers.length) {
        teacherOnly.studentAnswers = task.studentAnswers.map(({ name, answer, correct }) => ({
          name: String(name || ''),
          answer: String(answer ?? ''),
          ...(correct === 'right' || correct === 'wrong' || correct === 'empty' ? { correct } : {}),
        }));
      }
      const props = {
        taskId: task.id,
        number,
        source: source?.title || '',
        content: task.content || task.statement || '',
        options: task.is_open_answer ? [] : taskOptions(task),
        openAnswer: Boolean(task.is_open_answer),
        ...(Object.keys(teacherOnly).length ? { teacherOnly } : {}),
      };
      const h = estimateTaskHeight(props);
      const obj = createObject('task', { x: point.x - TASK_CARD_W / 2, y, w: TASK_CARD_W, h, props });
      y += h + TASK_CARD_GAP;
      return obj;
    });
    if (!addObjects(list)) return;
    const ids = list.map((obj) => obj.id);
    selectIds(ids);
    const stack = { ids };
    stackRef.current = stack;
    window.setTimeout(() => {
      if (stackRef.current === stack) stackRef.current = null;
    }, 4000);
  }

  // Высоту карточки задания, блока теории и markdown знает только DOM (формулы,
  // картинки), поэтому её меряет сам блок, а в модель пишет учитель — один писатель
  // на всех. Свежий столбик заданий заодно перекладывается без зазоров.
  function measureObject(id, height) {
    if (audienceRef.current !== 'teacher' || readOnlyRef.current || dragRef.current) return;
    const h = Math.max(80, Math.round(height));
    const obj = store.get().find((item) => item.id === id);
    if (!obj || !isMeasured(obj) || Math.abs(obj.h - h) <= 2) return;
    pendingTaskHeightsRef.current.set(id, h);
    if (taskMeasureRafRef.current) return;
    taskMeasureRafRef.current = requestAnimationFrame(() => {
      taskMeasureRafRef.current = 0;
      liveRef.current.restackTasks?.();
    });
  }

  function restackTasks() {
    if (!mountedRef.current) return;
    const heights = pendingTaskHeightsRef.current;
    pendingTaskHeightsRef.current = new Map();
    const updates = new Map();
    heights.forEach((h, id) => updates.set(id, { h }));
    const stack = stackRef.current;
    if (stack) {
      const placed = stack.ids.map((id) => store.get().find((obj) => obj.id === id)).filter(Boolean);
      if (placed.length && placed.every((obj) => obj.x === placed[0].x)) {
        let y = placed[0].y;
        placed.forEach((obj) => {
          const h = updates.get(obj.id)?.h ?? obj.h;
          if (Math.abs(obj.y - y) > 1) updates.set(obj.id, { ...updates.get(obj.id), y });
          y += h + TASK_CARD_GAP;
        });
      }
    }
    if (!updates.size) return;
    live(store.get().map((obj) => (updates.has(obj.id) ? { ...obj, ...updates.get(obj.id) } : obj)));
  }

  function boardPath(id) {
    return audienceRef.current === 'teacher' ? `/teacher/board/${id}` : `/student/board/${id}`;
  }

  function switchPage(id) {
    if (!id || id === boardMetaRef.current.id) return;
    navigate(boardPath(id));
  }

  async function addPage() {
    if (audienceRef.current !== 'teacher') return;
    const meta = boardMetaRef.current;
    const title = freshPageTitle(series.length ? series : [meta]);
    const students = (meta.studentIds || []).map((id) => Number(id));
    const audience = meta.groupId != null
      ? { groupId: Number(meta.groupId) }
      : students.length
        ? { studentIds: students }
        : {};
    const body = { title, ...audience, seriesId: meta.seriesId || meta.id };
    try {
      const created = await createTeacherBoard(body);
      navigate(boardPath(created.id));
    } catch (error) {
      notify(boardErrorMessage(error, 'Не удалось создать страницу'));
    }
  }

  function beginPageRename(page) {
    if (readOnlyRef.current) return;
    setEditingPageId(page.id);
    setEditingPageTitle(page.id === boardMetaRef.current.id ? titleRef.current : (page.title || ''));
  }

  async function commitPageTitle(id) {
    const next = boardTitle(editingPageTitle);
    setEditingPageId(null);
    if (!next) return;
    if (id === boardMetaRef.current.id) {
      titleRef.current = next;
      setTitle(next);
      setSeries((prev) => prev.map((item) => (item.id === id ? { ...item, title: next } : item)));
      return;
    }
    try {
      await setRemoteTitle({ audience: audienceRef.current, boardId: id, title: next });
      setSeries((prev) => prev.map((item) => (item.id === id ? { ...item, title: next } : item)));
    } catch (error) {
      notify(error?.message || 'Не удалось переименовать страницу');
    }
  }

  async function removePage(id) {
    if (audienceRef.current !== 'teacher' || series.length < 2) return;
    try {
      await deleteTeacherBoard(id);
      const rest = series.filter((item) => item.id !== id);
      setSeries(rest);
      if (id === boardMetaRef.current.id) navigate(boardPath(rest[0].id));
    } catch (error) {
      notify(boardErrorMessage(error, 'Не удалось удалить страницу'));
    }
  }

  function selectIds(ids) {
    selectedIdsRef.current = ids;
    setSelectedIds(ids);
  }

  function pruneSelection() {
    const alive = new Set(store.get().map((obj) => obj.id));
    const ids = selectedIdsRef.current.filter((id) => alive.has(id));
    if (ids.length !== selectedIdsRef.current.length) selectIds(ids);
    if (editingIdRef.current && !alive.has(editingIdRef.current)) {
      editingIdRef.current = null;
      editOriginRef.current = null;
      setEditingId(null);
    }
  }

  function canSelect(obj) {
    return audienceRef.current === 'teacher' || !obj.props?.locked;
  }

  function canEdit(obj) {
    return !readOnlyRef.current && !obj.props?.locked;
  }

  function selectedList() {
    const set = new Set(selectedIdsRef.current);
    return store.get().filter((obj) => set.has(obj.id));
  }

  function paintSelectionUi() {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const list = selectedList();
    const bounds = boundsOf(list);
    const cam = cameraRef.current;
    const group = groupBoxRef.current;
    if (group) {
      if (list.length > 1 && bounds) {
        group.style.display = 'block';
        group.style.left = `${bounds.x}px`;
        group.style.top = `${bounds.y}px`;
        group.style.width = `${bounds.w}px`;
        group.style.height = `${bounds.h}px`;
        group.style.outline = `calc(1.5px * var(--inv-zoom, 1)) solid ${SELECTION_COLOR}`;
      } else {
        group.style.display = 'none';
      }
    }
    const bar = barRef.current;
    if (!bar) return;
    const drag = dragRef.current;
    const hidden = !bounds || (drag && DRAG_HIDES_BAR.has(drag.kind) && drag.dirty !== false);
    if (hidden || !bar.firstElementChild) {
      bar.style.visibility = 'hidden';
      return;
    }
    const width = viewport.clientWidth;
    const height = viewport.clientHeight;
    const barW = bar.offsetWidth;
    const barH = bar.offsetHeight;
    let left = cam.x + (bounds.x + bounds.w / 2) * cam.zoom - barW / 2;
    let top = cam.y + bounds.y * cam.zoom - barH - 16;
    if (top < 60) top = cam.y + (bounds.y + bounds.h) * cam.zoom + 16;
    const phone = width < 720;
    const topLimit = phone ? 72 : 60;
    const bottomLimit = phone ? 76 : 8;
    left = clamp(left, 8, Math.max(8, width - barW - 8));
    top = clamp(top, topLimit, Math.max(topLimit, height - barH - bottomLimit));
    bar.style.transform = `translate(${Math.round(left)}px, ${Math.round(top)}px)`;
    bar.style.visibility = 'visible';
  }

  function paintSurface(cam) {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const look = surfaceRef.current || DEFAULT_SURFACE;
    const zoom = cam?.zoom || 1;
    const step = 28 * zoom;
    const line = look.color === '#2c2c2e' ? 'rgba(255,255,255,0.28)' : 'rgba(120, 132, 148, 0.45)';
    // Картинку сетки пересобираем только при смене вида или масштаба, при сдвиге — только позицию.
    const key = `${look.color}|${look.grid}|${step}`;
    if (surfacePaintRef.current !== key) {
      surfacePaintRef.current = key;
      viewport.style.backgroundColor = look.color;
      if (look.grid === 'empty') {
        viewport.style.backgroundImage = 'none';
      } else if (look.grid === 'rule') {
        viewport.style.backgroundImage = `linear-gradient(to bottom, transparent ${step - 1}px, ${line} ${step - 1}px)`;
        viewport.style.backgroundSize = `100% ${step}px`;
      } else {
        viewport.style.backgroundImage = `linear-gradient(to right, ${line} 1px, transparent 1px), linear-gradient(to bottom, ${line} 1px, transparent 1px)`;
        viewport.style.backgroundSize = `${step}px ${step}px`;
      }
    }
    if (look.grid === 'rule') viewport.style.backgroundPosition = `0px ${cam.y}px`;
    else if (look.grid === 'cell') viewport.style.backgroundPosition = `${cam.x}px ${cam.y}px`;
  }

  // Камера меняется на каждое событие колеса и указателя, а красится раз в кадр.
  function paintCamera(cam) {
    cameraRef.current = cam;
    if (cameraFrameRef.current) return;
    cameraFrameRef.current = requestAnimationFrame(() => {
      cameraFrameRef.current = 0;
      paintCameraNow();
    });
  }

  function paintCameraNow() {
    if (cameraFrameRef.current) {
      cancelAnimationFrame(cameraFrameRef.current);
      cameraFrameRef.current = 0;
    }
    const cam = cameraRef.current;
    const world = worldRef.current;
    if (world) {
      world.style.transform = `translate(${cam.x}px, ${cam.y}px) scale(${cam.zoom})`;
    }
    const viewport = viewportRef.current;
    if (viewport) {
      // Ручки, обводки и плашки держат экранный размер через одну переменную, без обхода DOM.
      viewport.style.setProperty('--inv-zoom', String(1 / cam.zoom));
      paintSurface(cam);
    }
    if (zoomLabelRef.current) {
      zoomLabelRef.current.textContent = `${Math.round(cam.zoom * 100)}%`;
    }
    paintSelectionUi();
    paintPeerCursors();
    liveRef.current.followCulling?.(cam);
  }

  function live(next) {
    store.set(next);
    scheduleSend();
  }

  // Жест пишет модель на каждое движение указателя, а перерисовывает только
  // затронутые объекты и не чаще кадра.
  function gesture(next, changed) {
    const list = changed.filter(Boolean);
    list.forEach((obj) => {
      gestureIdsRef.current.add(obj.id);
      motion.cancel(obj.id);
    });
    store.set(next, { changed: list, defer: true });
    paintSelectionUi();
    scheduleSend();
  }

  function eraseTo(next) {
    store.set(next, { defer: true });
    scheduleSend();
  }

  function releaseGesture() {
    gestureIdsRef.current.clear();
  }

  function publishGesture() {
    store.flush();
    const cam = cameraRef.current;
    setCamera((prev) => (
      prev.x === cam.x && prev.y === cam.y && prev.zoom === cam.zoom ? prev : cam
    ));
    saveLocalCamera(boardIdRef.current, cam);
  }

  // Камеру в состояние React пишем после жеста, но если экран уехал за отрисованную
  // полосу, перерисовываем сразу — иначе на краю появится пустота.
  function followCulling(cam) {
    const rect = renderedRectRef.current;
    if (!rect || cullFollowRef.current) return;
    const viewport = viewportRef.current;
    if (!viewport) return;
    const w = viewport.clientWidth / cam.zoom;
    const h = viewport.clientHeight / cam.zoom;
    const x = -cam.x / cam.zoom;
    const y = -cam.y / cam.zoom;
    const inside = x >= rect.x && y >= rect.y && x + w <= rect.x + rect.w && y + h <= rect.y + rect.h;
    if (inside && Math.abs(cam.zoom / rect.zoom - 1) < 0.5) return;
    cullFollowRef.current = true;
    setCamera({ ...cam });
  }

  function scheduleCameraCommit() {
    window.clearTimeout(cameraSyncRef.current);
    cameraSyncRef.current = window.setTimeout(() => {
      if (dragRef.current) {
        scheduleCameraCommit();
        return;
      }
      publishGesture();
    }, 120);
  }

  function paintCursor() {
    const el = viewportRef.current;
    if (!el) return;
    const current = toolRef.current;
    const kind = dragRef.current?.kind;
    el.style.cursor = kind === 'pan' || kind === 'pinch'
      ? 'grabbing'
      : (spaceRef.current || current === 'hand')
        ? 'grab'
        : (current === 'pen' || current === 'laser' || current === 'eraser' || current === 'shape' || current === 'arrow' || current === 'sticky')
          ? 'crosshair'
          : current === 'text'
            ? 'text'
            : 'default';
  }

  function paintGuides(guides) {
    const host = guideHostRef.current;
    if (!host) return;
    host.replaceChildren();
    if (!guides?.length) return;
    const thickness = 1 / cameraRef.current.zoom;
    guides.forEach((guide) => {
      const line = document.createElement('div');
      line.className = 'pointer-events-none absolute';
      line.style.background = '#f43f5e';
      if (guide.axis === 'x') {
        line.style.left = `${guide.at - thickness / 2}px`;
        line.style.top = `${guide.from}px`;
        line.style.width = `${thickness}px`;
        line.style.height = `${guide.to - guide.from}px`;
      } else {
        line.style.left = `${guide.from}px`;
        line.style.top = `${guide.at - thickness / 2}px`;
        line.style.width = `${guide.to - guide.from}px`;
        line.style.height = `${thickness}px`;
      }
      host.appendChild(line);
    });
  }

  function flushHeldLink() {
    const held = linkHoldRef.current;
    if (!held) return;
    linkHoldRef.current = null;
    setLink((prev) => (prev.state === 'denied' ? prev : held));
  }

  function paintDraft(draft) {
    draftRef.current = draft;
    const host = draftHostRef.current;
    if (!host) return;
    if (draft?.kind === 'pen' && draft.points.length) {
      const origin = draft.origin || draft.points[0];
      const wrap = host.firstChild;
      const path = wrap?.dataset?.pen === `${origin.x},${origin.y}` ? wrap.querySelector('path') : null;
      if (path) {
        path.setAttribute('d', smoothPath(draft.points.map((point) => ({ x: point.x - origin.x, y: point.y - origin.y }))));
        path.setAttribute('stroke', draft.color);
        path.setAttribute('stroke-width', draft.width);
        return;
      }
    }
    host.replaceChildren();
    if (!draft) return;
    const inv = 1 / cameraRef.current.zoom;
    if (draft.kind === 'marquee') {
      const node = document.createElement('div');
      node.className = 'pointer-events-none absolute';
      node.style.left = `${draft.x}px`;
      node.style.top = `${draft.y}px`;
      node.style.width = `${draft.w}px`;
      node.style.height = `${draft.h}px`;
      node.style.border = `${inv}px solid ${SELECTION_COLOR}`;
      node.style.background = 'rgba(66, 98, 255, 0.08)';
      host.appendChild(node);
      return;
    }
    if (draft.kind === 'chain') {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('width', '1');
      svg.setAttribute('height', '1');
      svg.style.position = 'absolute';
      svg.style.left = '0';
      svg.style.top = '0';
      svg.style.overflow = 'visible';
      const addLine = (x1, y1, x2, y2, dashed) => {
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', x1);
        line.setAttribute('y1', y1);
        line.setAttribute('x2', x2);
        line.setAttribute('y2', y2);
        line.setAttribute('stroke', draft.stroke || '#18181b');
        line.setAttribute('stroke-width', '2');
        line.setAttribute('stroke-linecap', 'round');
        if (dashed) line.setAttribute('stroke-dasharray', '6 4');
        svg.appendChild(line);
      };
      draft.points.forEach((point, index) => {
        if (index) addLine(draft.points[index - 1].x, draft.points[index - 1].y, point.x, point.y, false);
      });
      if (draft.closing && draft.points.length) {
        const last = draft.points[draft.points.length - 1];
        addLine(last.x, last.y, draft.points[0].x, draft.points[0].y, false);
      } else if (draft.hover && draft.points.length) {
        const last = draft.points[draft.points.length - 1];
        addLine(last.x, last.y, draft.hover.x, draft.hover.y, false);
      }
      if (draft.guide) addLine(draft.guide.x1, draft.guide.y1, draft.guide.x2, draft.guide.y2, true);
      draft.points.forEach((point, index) => {
        const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        dot.setAttribute('cx', point.x);
        dot.setAttribute('cy', point.y);
        dot.setAttribute('r', index === 0 ? '3.5' : '2.5');
        dot.setAttribute('fill', '#18181b');
        svg.appendChild(dot);
      });
      host.appendChild(svg);
      return;
    }
    if (draft.kind === 'shape') {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('class', 'pointer-events-none absolute overflow-visible');
      svg.style.position = 'absolute';
      svg.setAttribute('viewBox', '0 0 100 100');
      svg.setAttribute('preserveAspectRatio', 'none');
      svg.style.left = `${draft.x}px`;
      svg.style.top = `${draft.y}px`;
      svg.style.width = `${Math.max(draft.w, 1)}px`;
      svg.style.height = `${Math.max(draft.h, 1)}px`;
      svg.style.opacity = '0.85';
      appendFigures(svg, shapeFigures(draft.shape), { fill: draft.fill, stroke: draft.stroke });
      host.appendChild(svg);
      return;
    }
    if (draft.kind === 'pen' && draft.points.length) {
      // Та же схема, что у зрителя: рамка в первой точке, точки от неё. Рамка по bbox раздувает холст и сдвигает уже нарисованное.
      const origin = draft.origin || draft.points[0];
      const wrap = document.createElement('div');
      wrap.dataset.pen = `${origin.x},${origin.y}`;
      wrap.style.position = 'absolute';
      wrap.style.left = `${origin.x}px`;
      wrap.style.top = `${origin.y}px`;
      wrap.style.width = '12px';
      wrap.style.height = '12px';
      wrap.style.overflow = 'visible';
      wrap.style.pointerEvents = 'none';
      const pen = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      pen.setAttribute('width', '12');
      pen.setAttribute('height', '12');
      pen.style.display = 'block';
      pen.style.overflow = 'visible';
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', smoothPath(draft.points.map((point) => ({ x: point.x - origin.x, y: point.y - origin.y }))));
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', draft.color);
      path.setAttribute('stroke-width', draft.width);
      path.setAttribute('stroke-linecap', 'round');
      path.setAttribute('stroke-linejoin', 'round');
      pen.appendChild(path);
      wrap.appendChild(pen);
      host.appendChild(wrap);
      return;
    }
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'pointer-events-none absolute overflow-visible');
    svg.style.position = 'absolute';
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
      line.setAttribute('stroke-linecap', 'round');
      svg.appendChild(line);
      if (draft.guide) {
        const guide = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        guide.setAttribute('x1', draft.guide.x1 - left);
        guide.setAttribute('y1', draft.guide.y1 - top);
        guide.setAttribute('x2', draft.guide.x2 - left);
        guide.setAttribute('y2', draft.guide.y2 - top);
        guide.setAttribute('stroke', draft.color);
        guide.setAttribute('stroke-width', '1.5');
        guide.setAttribute('stroke-dasharray', '6 4');
        svg.appendChild(guide);
      }
    }
    host.appendChild(svg);
  }

  function toWorld(event) {
    return clientToWorld(event.clientX, event.clientY);
  }

  function clientToWorld(clientX, clientY) {
    const viewport = viewportRef.current;
    if (!viewport) return null;
    const rect = viewport.getBoundingClientRect();
    const cam = cameraRef.current;
    return {
      x: (clientX - rect.left - cam.x) / cam.zoom,
      y: (clientY - rect.top - cam.y) / cam.zoom,
    };
  }

  function viewportCenterWorld() {
    const viewport = viewportRef.current;
    if (!viewport) return null;
    const rect = viewport.getBoundingClientRect();
    return clientToWorld(rect.left + rect.width / 2, rect.top + rect.height / 2);
  }

  function pasteTarget() {
    const client = pointerClientRef.current;
    return client ? clientToWorld(client.x, client.y) : viewportCenterWorld();
  }

  function zoomAt(nextZoom, clientX, clientY) {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const rect = viewport.getBoundingClientRect();
    const cam = cameraRef.current;
    const zoom = clamp(nextZoom, MIN_ZOOM, MAX_ZOOM);
    const px = clientX - rect.left;
    const py = clientY - rect.top;
    const worldX = (px - cam.x) / cam.zoom;
    const worldY = (py - cam.y) / cam.zoom;
    paintCamera({ zoom, x: px - worldX * zoom, y: py - worldY * zoom });
    scheduleCameraCommit();
  }

  function zoomBy(factor) {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const rect = viewport.getBoundingClientRect();
    zoomAt(cameraRef.current.zoom * factor, rect.left + rect.width / 2, rect.top + rect.height / 2);
  }

  function zoomTo(zoom) {
    zoomBy(zoom / cameraRef.current.zoom);
  }

  function fitAll() {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const bounds = boundsOf(canvasList());
    const cam = bounds
      ? fitCamera(bounds, viewport.clientWidth, viewport.clientHeight, { padding: 96, maxZoom: 2 })
      : { x: viewport.clientWidth / 2, y: viewport.clientHeight / 2, zoom: 1 };
    paintCamera(cam);
    scheduleCameraCommit();
  }

  function changedGeoBase64(obj, base64) {
    const stored = obj.props.ggbBase64 || '';
    return Boolean(base64) && base64 !== stored;
  }

  async function collectGeoBase64() {
    const updates = new Map();
    const ids = [...geoDirtyRef.current];
    for (const id of ids) {
      geoDirtyRef.current.delete(id);
      const obj = store.get().find((item) => item.id === id);
      const api = apiMap.current.get(id);
      if (!obj || obj.type !== 'geogebra' || !api) continue;
      const base64 = await readGeoGebraBase64(api);
      if (changedGeoBase64(obj, base64)) updates.set(id, base64);
    }
    return updates;
  }

  async function saveGeoChanges() {
    const updates = await collectGeoBase64();
    if (!updates.size || !mountedRef.current) return;
    const next = store.get().map((obj) => (
      updates.has(obj.id) ? { ...obj, props: { ...obj.props, ggbBase64: updates.get(obj.id) } } : obj
    ));
    live(next);
  }

  function sameElementStates(prevXml, nextXml) {
    const prev = elementStates(prevXml);
    const next = elementStates(nextXml);
    if (prev.size !== next.size) return false;
    for (const [label, state] of next) {
      if (prev.get(label) !== state) return false;
    }
    return true;
  }

  function sameGeoView(prev, next) {
    return sameGeoGebraView(prev, next);
  }

  async function saveGeoXml() {
    const ids = new Set(geoDirtyRef.current);
    if (editingIdRef.current) ids.add(editingIdRef.current);
    const pending = [];
    ids.forEach((id) => {
      const obj = store.get().find((item) => item.id === id);
      const api = apiMap.current.get(id);
      if (!obj || obj.type !== 'geogebra' || !api) return;
      const xml = readGeoGebraXml(api);
      const prevXml = obj.props.ggbXml || '';
      const nextXml = xml || prevXml;
      const is3d = obj.props.appName === '3d';
      if (is3d && stripCamera(nextXml) === stripCamera(prevXml)) return;
      const view = is3d ? null : readGeoGebraView(api);
      const prevView = obj.props.ggbView || null;
      if (is3d && graphStructure(nextXml) === graphStructure(prevXml) && sameElementStates(prevXml, nextXml)) return;
      const viewChanged = !is3d && Boolean(view) && !sameGeoView(prevView, view);
      if (nextXml === prevXml && !viewChanged) return;
      pending.push({
        id,
        ggbXml: nextXml,
        ggbView: is3d ? prevView : (view || prevView),
      });
    });
    if (!pending.length) return;
    if (!mountedRef.current) return;
    const byId = new Map(pending.map((item) => [item.id, item]));
    const current = store.get();
    let changed = false;
    const next = current.map((obj) => {
      const update = byId.get(obj.id);
      if (!update) return obj;
      if ((obj.props.ggbXml || '') === update.ggbXml && sameGeoView(obj.props.ggbView, update.ggbView)) return obj;
      changed = true;
      const props = { ...obj.props, ggbXml: update.ggbXml };
      if (update.ggbView) props.ggbView = update.ggbView;
      return { ...obj, props };
    });
    if (changed) live(next);
  }

  function changeGeoControls(id, controls) {
    if (readOnlyRef.current || !Array.isArray(controls)) return;
    const current = store.get();
    const index = current.findIndex((obj) => obj.id === id);
    if (index < 0) return;
    const obj = current[index];
    if (obj.type !== 'geogebra' || obj.props?.locked) return;
    const prev = obj.props.controls || [];
    const same = prev.length === controls.length && prev.every((item, itemIndex) => (
      item?.name === controls[itemIndex]?.name && Object.is(item?.value, controls[itemIndex]?.value)
    ));
    if (same) return;
    const next = current.slice();
    next[index] = { ...obj, props: { ...obj.props, controls } };
    live(next);
    scheduleGeoSave(id);
  }

  // Меню живёт в файле апплета. Графики и планиметрия уходят сразу после отпускания,
  // 3D — с короткой паузой. Отдельный setPerspective затирает чертёж до белого.
  function geoLayoutChanged(id) {
    if (editingIdRef.current !== id || readOnlyRef.current) return;
    const current = store.get().find((item) => item.id === id);
    if (!current || current.type !== 'geogebra') return;
    window.clearTimeout(geoLayoutTimerRef.current);
    const delay = current.props.appName === '3d' ? 400 : 0;
    geoLayoutTimerRef.current = window.setTimeout(async () => {
      const api = apiMap.current.get(id);
      if (!api || !mountedRef.current || editingIdRef.current !== id) return;
      const is3d = current.props.appName === '3d';
      const menu = is3d ? '' : readMenuValue(api);
      const view = is3d ? null : readGeoGebraView(api);
      const xml = readGeoGebraXml(api);
      const base64 = await readGeoGebraBase64(api);
      if (!base64 || !mountedRef.current || editingIdRef.current !== id) return;
      const next = store.get().map((obj) => (
        obj.id === id && obj.type === 'geogebra'
          ? {
            ...obj,
            props: {
              ...obj.props,
              ggbBase64: base64,
              ggbLayout: uid(),
              ggbPerspective: '',
              ...(xml ? { ggbXml: xml } : {}),
              ...(menu ? { ggbMenu: menu } : {}),
              ...(view ? { ggbView: view } : {}),
            },
          }
          : obj
      ));
      live(next);
    }, delay);
  }

  // Снимок построения (XML). Пока чертящий тянет точку, зрители получают дельты,
  // поэтому полный XML можно слать реже; отпустил — уходит сразу.
  function scheduleGeoSave(id, delay = GEO_XML_MS) {
    geoDirtyRef.current.add(id);
    const due = performance.now() + delay;
    if (!geoXmlTimerRef.current || due < geoXmlDueRef.current) {
      window.clearTimeout(geoXmlTimerRef.current);
      geoXmlDueRef.current = due;
      geoXmlTimerRef.current = window.setTimeout(() => {
        geoXmlTimerRef.current = 0;
        liveRef.current.saveGeoXml?.();
      }, delay);
    }
    if (!geoTimerRef.current) {
      geoTimerRef.current = window.setTimeout(() => {
        geoTimerRef.current = 0;
        liveRef.current.saveGeoChanges?.();
      }, GEO_SAVE_MS);
    }
  }

  useEffect(() => {
    const boardId = initialBoard?.id;
    if (!boardId) return undefined;
    const call = (name) => (...args) => liveRef.current[name]?.(...args);
    const socket = connectBoard({
      audience,
      boardId,
      shareToken,
      handlers: {
        onStatus: (state, pending) => {
          if (!mountedRef.current) return;
          if (state !== 'offline' && state !== 'denied') {
            setLink((prev) => (prev.state === 'live' ? prev : { state: 'live', pending: 0 }));
            return;
          }
          setLink((prev) => (
            prev.state === state && prev.pending === pending ? prev : { state, pending }
          ));
        },
        onSnapshot: call('onSnapshot'),
        onAckObject: call('onAckObject'),
        onOpError: call('onOpError'),
        onOp: call('applyRemote'),
        onCursor: (message) => {
          if (!message?.clientId || message.clientId === clientIdRef.current) return;
          if (message.hidden) peerCursorsRef.current.delete(message.clientId);
          else peerCursorsRef.current.set(message.clientId, { x: Number(message.x) || 0, y: Number(message.y) || 0 });
          liveRef.current.paintPeerCursors?.();
        },
        onLaser: call('showLaser'),
        onCursors: (enabled) => {
          cursorsOnRef.current = enabled;
          if (!enabled) peerCursorsRef.current.clear();
          setCursorsOn(enabled);
          liveRef.current.paintPeerCursors?.();
        },
        onGeoMove: (message) => {
          if (!message?.id || message.clientId === clientIdRef.current) return;
          geoMoveInRef.current.get(message.id)?.(message);
        },
        onGeoInput: (message) => {
          if (!message?.id || message.clientId === clientIdRef.current) return;
          geoInputInRef.current.get(message.id)?.(message);
        },
        onGeocam: (message) => {
          if (!message?.id || !Number.isFinite(message.seq)) return;
          const prevFrom = geoCamFromRef.current.get(message.id);
          if (prevFrom && prevFrom !== message.clientId) geoSeqRef.current.delete(message.id);
          geoCamFromRef.current.set(message.id, message.clientId);
          if ((geoSeqRef.current.get(message.id) ?? -1) >= message.seq) return;
          geoSeqRef.current.set(message.id, message.seq);
          geoCamLastRef.current.set(message.id, message);
          if (message.clientId === clientIdRef.current) return;
          liveRef.current.onGeocam?.(message);
        },
        onPull: (message) => {
          if (!message?.camera || message.clientId === clientIdRef.current) return;
          const next = {
            x: Number(message.camera.x) || 0,
            y: Number(message.camera.y) || 0,
            zoom: clamp(Number(message.camera.zoom) || 1, MIN_ZOOM, MAX_ZOOM),
          };
          paintCamera(next);
          setCamera(next);
          saveLocalCamera(boardIdRef.current, next);
          notify(`${message.name || 'Участник'} притянул вас к своему виду`);
        },
        onJoin: (peer) => {
          if (!peer?.clientId || peer.clientId === clientIdRef.current) return;
          peersRef.current = [...peersRef.current.filter((item) => item.clientId !== peer.clientId), peer];
          setPeers(peersRef.current);
        },
        onLeave: (clientId) => {
          peerCursorsRef.current.delete(clientId);
          peersRef.current = peersRef.current.filter((item) => item.clientId !== clientId);
          setPeers(peersRef.current);
        },
        onClosed: call('onClosed'),
      },
    });
    socketRef.current = socket;
    const onBeforeUnload = () => {
      liveRef.current.flushOps?.();
    };
    const onPageHide = () => liveRef.current.flushOps?.();
    window.addEventListener('beforeunload', onBeforeUnload);
    window.addEventListener('pagehide', onPageHide);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      window.removeEventListener('pagehide', onPageHide);
      liveRef.current.flushOps?.();
      socket.close();
      if (socketRef.current === socket) socketRef.current = null;
    };
  }, [initialBoard.id, audience, shareToken]);

  useEffect(() => store.subscribe(() => {
    const next = readSurface(store.get());
    const current = surfaceRef.current;
    if (next.color === current.color && next.grid === current.grid) return;
    surfaceRef.current = next;
    setSurface(next);
    liveRef.current.paintSurface?.(cameraRef.current);
  }), [store]);

  useEffect(() => {
    mountedRef.current = true;
    const ink = inkRef.current;
    return () => {
      mountedRef.current = false;
      window.clearTimeout(noticeTimerRef.current);
      window.clearTimeout(cameraSyncRef.current);
      window.clearTimeout(geoTimerRef.current);
      window.clearTimeout(geoXmlTimerRef.current);
      window.clearTimeout(cursorTimerRef.current);
      cancelAnimationFrame(cameraFrameRef.current);
      setPenActive(false);
      cancelAnimationFrame(ink.raf);
      dragCleanupRef.current?.();
      motion.dispose();
      store.dispose();
    };
  }, [motion, store]);

  // Любая правка документа (своя или после отмены) уходит в сеть через общий diff.
  useEffect(() => store.subscribe(() => liveRef.current.scheduleSend?.()), [store]);

  useEffect(() => {
    scheduleSend();
  }, [title]);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return undefined;
    const onWheel = (event) => wheelRef.current(event);
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  useLayoutEffect(() => {
    if (savedCamera) return;
    const viewport = viewportRef.current;
    if (!viewport) return;
    const bounds = boundsOf(canvasList());
    const cam = bounds
      ? fitCamera(bounds, viewport.clientWidth, viewport.clientHeight, { padding: 96, maxZoom: 1 })
      : { x: Math.round(viewport.clientWidth / 2), y: Math.round(viewport.clientHeight / 2), zoom: 1 };
    paintCamera(cam);
    scheduleCameraCommit();
    // Камера подбирается один раз при открытии доски.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function stepHistory(direction) {
    if (readOnlyRef.current) return;
    const from = direction === 'undo' ? pastRef.current : futureRef.current;
    const to = direction === 'undo' ? futureRef.current : pastRef.current;
    const entry = from.pop();
    if (!entry) return;
    to.push(entry);
    const before = store.get();
    const next = applyHistory(before, entry, direction);
    editOriginRef.current = null;
    editingIdRef.current = null;
    setEditingId(null);
    live(next);
    noteHistory();
    pruneSelection();
  }

  function undo() {
    stepHistory('undo');
  }

  function redo() {
    stepHistory('redo');
  }

  function applyRemote(op, message) {
    if (op.type === 'title') {
      const nextTitle = boardTitle(op.title);
      sentTitleRef.current = nextTitle;
      titleRef.current = nextTitle;
      setTitle(nextTitle);
      return;
    }
    if (op.type === 'camera') return;
    applyIncoming(op);
    // Пока человек рисует, курсор он не шлёт: стрелка встаёт на конец готового штриха.
    if (op.type === 'upsert' && op.object?.type === 'draw') {
      movePeerToStroke(message?.clientId, op.object.id);
      const current = store.get().find((item) => item.id === op.object.id);
      const incoming = op.object.props?.points?.length || 0;
      if (current && (current.props?.points?.length || 0) === incoming) startInk(op.object.id);
    }
  }

  function deleteSelected() {
    if (readOnlyRef.current) return;
    const set = new Set(selectedList().filter(canEdit).map((obj) => obj.id));
    if (!set.size) return;
    commit(releaseMissingBinds(store.get().filter((obj) => !set.has(obj.id))));
    selectIds(selectedIdsRef.current.filter((id) => !set.has(id)));
    setEditingId(null);
  }

  function patchSelected(type, patch) {
    const set = new Set(selectedList().filter((obj) => obj.type === type && canEdit(obj)).map((obj) => obj.id));
    if (!set.size) return;
    let next = store.get().map((obj) => {
      if (!set.has(obj.id)) return obj;
      const updated = { ...obj, props: { ...obj.props, ...patch } };
      if (type === 'task' && patch.fontSize) {
        const w = Math.round(TASK_CARD_W * (patch.fontSize / TASK_FONT));
        updated.x = obj.x + (obj.w - w) / 2;
        updated.w = w;
      }
      return updated;
    });
    if (type === 'shape' && patch.shape) {
      const changedIds = new Set(
        store.get().filter((obj) => set.has(obj.id) && obj.props.shape !== patch.shape).map((obj) => obj.id),
      );
      if (changedIds.size) next = dropBindsTo(next, [...changedIds]);
    }
    commit(next);
  }

  function reorderSelected(toFront) {
    const set = new Set(selectedList().filter(canEdit).map((obj) => obj.id));
    if (!set.size) return;
    const moving = store.get().filter((obj) => set.has(obj.id));
    const rest = store.get().filter((obj) => !set.has(obj.id));
    const next = reorder(store.get(), (toFront ? [...rest, ...moving] : [...moving, ...rest]).map((obj) => obj.id));
    if (next === store.get()) return;
    commit(next);
  }

  function toggleLock() {
    if (readOnlyRef.current || audienceRef.current !== 'teacher') return;
    const list = selectedList();
    if (!list.length) return;
    const lock = !list.every((obj) => obj.props?.locked);
    const set = new Set(list.map((obj) => obj.id));
    commit(store.get().map((obj) => {
      if (!set.has(obj.id)) return obj;
      return { ...obj, props: { ...obj.props, locked: lock } };
    }));
    if (lock && editingIdRef.current && set.has(editingIdRef.current)) setEditingId(null);
  }

  async function geoSnapshot(obj) {
    if (obj.type !== 'geogebra') return obj;
    const api = apiMap.current.get(obj.id);
    if (!api) return obj;
    const base64 = await readGeoGebraBase64(api);
    return changedGeoBase64(obj, base64) ? { ...obj, props: { ...obj.props, ggbBase64: base64 } } : obj;
  }

  async function duplicateSelected() {
    if (readOnlyRef.current) return;
    const source = selectedList();
    if (!source.length) return;
    const snapshot = await Promise.all(source.map(geoSnapshot));
    const clones = cloneObjects(snapshot, { dx: 24, dy: 24 });
    if (addObjects(clones)) selectIds(clones.map((obj) => obj.id));
  }

  function selectAll() {
    selectIds(canvasList().filter((obj) => canSelect(obj) && !obj.props?.locked).map((obj) => obj.id));
    setEditingId(null);
    setTool('select');
  }

  function nudge(dx, dy) {
    const set = new Set(selectedList().filter(canEdit).map((obj) => obj.id));
    if (!set.size) return;
    const moved = store.get().map((obj) => (set.has(obj.id) ? { ...obj, x: obj.x + dx, y: obj.y + dy } : obj));
    commit(followMoved(moved, [...set]));
  }

  function styleKeys(key) {
    if (readOnlyRef.current) return false;
    const selected = store.get().filter((obj) => selectedIdsRef.current.includes(obj.id) && canEdit(obj));
    if (!selected.length || !selected.every((obj) => obj.type === 'shape' || obj.type === 'arrow')) return false;
    if (key === 'ArrowUp' || key === 'ArrowDown') {
      const dashed = key === 'ArrowDown';
      const ids = new Set(selected.map((obj) => obj.id));
      commit(store.get().map((obj) => (ids.has(obj.id) ? { ...obj, props: { ...obj.props, dashed } } : obj)));
      return true;
    }
    if (key === 'ArrowLeft' || key === 'ArrowRight') {
      const arrows = selected.filter((obj) => obj.type === 'arrow');
      if (!arrows.length) return false;
      const side = key === 'ArrowLeft' ? 'left' : 'right';
      const ids = new Set(arrows.map((obj) => obj.id));
      commit(store.get().map((obj) => (ids.has(obj.id) ? { ...obj, props: { ...obj.props, ...setArrowSide(obj, side) } } : obj)));
      return true;
    }
    return false;
  }

  function joinSelected() {
    if (readOnlyRef.current) return;
    const ids = selectedList().filter((obj) => obj.type === 'arrow' && canEdit(obj)).map((obj) => obj.id);
    if (ids.length < 2) return;
    const next = joinArrows(store.get(), ids);
    if (next === store.get()) {
      notify('Эти отрезки не лежат на одной прямой');
      return;
    }
    const kept = ids.find((id) => next.some((obj) => obj.id === id));
    commit(next);
    if (kept) selectIds([kept]);
  }

  function dropPoint(at) {
    const zoom = cameraRef.current.zoom || 1;
    const point = createObject('point', {
      x: at.x,
      y: at.y,
      w: 8,
      h: 8,
      props: { letter: '', sub: '', cross: null },
    });
    const next = plantPoint([...store.get(), point], point.id, zoom, uid);
    if (next.length > MAX_OBJECTS) {
      notify(`На доске может быть не больше ${MAX_OBJECTS} объектов`);
      return;
    }
    commit(next);
    const placed = next.find((obj) => obj.id === point.id);
    if (placed) selectIds([placed.id]);
    setTool('select');
  }

  function arrowSide(side) {
    if (readOnlyRef.current) return;
    const ids = new Set(selectedList().filter((obj) => obj.type === 'arrow' && canEdit(obj)).map((obj) => obj.id));
    if (!ids.size) return;
    commit(store.get().map((obj) => (ids.has(obj.id) ? { ...obj, props: { ...obj.props, ...setArrowSide(obj, side) } } : obj)));
  }

  function aimPoint(point, anchor, alt, ignoreId) {
    const zoom = cameraRef.current.zoom || 1;
    if (alt) return { point, dist: Infinity };
    const hosts = store.get();
    const hit = settleSnap(snapFigurePoint(point, hosts, zoom, ignoreId), hosts);
    const locked = anchor ? settleSnap(anchor, hosts) : null;
    const straight = locked ? extendStraight(point, locked, hosts, zoom) : null;
    if (straight && !hit.bind && straight.dist < hit.dist) return { point: straight.point, guide: straight.guide, dist: straight.dist };
    return hit;
  }

  function commitChain(chain, closed) {
    chainRef.current = null;
    paintDraft(null);
    if (!chain || chain.points.length < 2) return false;
    if (store.get().length + 1 > MAX_OBJECTS) {
      notify(`На доске может быть не больше ${MAX_OBJECTS} объектов`);
      return true;
    }
    const look = styleRef.current;
    const binds = chain.hits.map(bindFromHit);
    const frame = polylineFrame(chain.points, {
      shape: 'polyline',
      closed,
      binds,
      fill: closed ? look.fill.fill : 'none',
      stroke: look.fill.stroke,
      text: '',
      depth: 0,
    });
    const obj = createObject('shape', frame);
    commit([...store.get(), obj]);
    selectIds([obj.id]);
    return true;
  }

  function finishChain() {
    const chain = chainRef.current;
    if (!chain) return false;
    return commitChain(chain, false);
  }

  function paintChainPreview(hover) {
    const chain = chainRef.current;
    if (!chain) {
      paintDraft(null);
      return;
    }
    const zoom = cameraRef.current.zoom || 1;
    const closing = Boolean(hover) && chain.points.length >= 3
      && Math.hypot(hover.point.x - chain.points[0].x, hover.point.y - chain.points[0].y) <= 16 / zoom;
    paintDraft({
      kind: 'chain',
      points: chain.points,
      hover: closing ? null : hover?.point,
      guide: closing ? null : hover?.guide,
      closing,
      stroke: styleRef.current.fill.stroke,
    });
  }

  function placePolylinePoint(world, alt) {
    const chain = chainRef.current;
    const zoom = cameraRef.current.zoom || 1;
    if (chain && chain.points.length >= 3 && Math.hypot(world.x - chain.points[0].x, world.y - chain.points[0].y) <= 16 / zoom) {
      commitChain(chain, true);
      return;
    }
    const hit = aimPoint(world, chain?.hits?.at(-1), alt);
    if (chain && Math.hypot(hit.point.x - chain.points.at(-1).x, hit.point.y - chain.points.at(-1).y) < 4 / zoom) return;
    chainRef.current = {
      points: chain ? [...chain.points, hit.point] : [hit.point],
      hits: chain ? [...chain.hits, hit] : [hit],
    };
    paintChainPreview(null);
  }

  function pasteObjects(list, point) {
    if (readOnlyRef.current) return;
    const clones = cloneObjects(list, { center: point });
    if (addObjects(clones)) {
      selectIds(clones.map((obj) => obj.id));
      setTool('select');
    }
  }

  function pasteText(text, point) {
    if (readOnlyRef.current) return;
    const lines = text.split('\n').length;
    const obj = createObject('text', {
      x: point.x - 160,
      y: point.y - 20,
      w: 320,
      h: Math.max(48, lines * 30 + 16),
      props: { text, fontSize: 22 },
    });
    if (addObjects([obj])) {
      selectIds([obj.id]);
      setTool('select');
    }
  }

  async function uploadImageAt(file, point) {
    const upload = audienceRef.current === 'teacher' ? uploadTeacherBoardImage : uploadStudentBoardImage;
    const size = await imageSize(file);
    const uploaded = await upload(file);
    let w = 320;
    let h = 240;
    if (size?.w && size?.h) {
      const scale = Math.min(1, 480 / Math.max(size.w, size.h));
      w = Math.max(40, Math.round(size.w * scale));
      h = Math.max(32, Math.round(size.h * scale));
    }
    return createObject('image', {
      x: point.x - w / 2,
      y: point.y - h / 2,
      w,
      h,
      props: {
        fileId: uploaded.fileId,
        src: boardImageSrc({ src: uploaded.src, fileId: uploaded.fileId, name: uploaded.name || file.name }),
        name: uploaded.name || file.name,
      },
    });
  }

  async function insertImages(files, point) {
    if (readOnlyRef.current || !files.length) return;
    notify('');
    const created = [];
    for (let i = 0; i < files.length; i += 1) {
      try {
        created.push(await uploadImageAt(files[i], { x: point.x + i * 24, y: point.y + i * 24 }));
      } catch (error) {
        notify(boardErrorMessage(error, 'Не удалось загрузить изображение'));
      }
    }
    if (!mountedRef.current) return;
    if (created.length && addObjects(created)) {
      selectIds(created.map((obj) => obj.id));
      setTool('select');
    }
  }

  function commitEdit(id) {
    const origin = editOriginRef.current;
    editOriginRef.current = null;
    editingIdRef.current = null;
    setEditingId(null);
    if (!origin || !id) return;
    const prev = origin.find((obj) => obj.id === id);
    const curr = store.get().find((obj) => obj.id === id);
    if (curr?.type === 'text' && !(curr.props?.text || '').trim()) {
      const next = store.get().filter((obj) => obj.id !== id);
      const created = createdOnly(pastRef.current[pastRef.current.length - 1], id);
      if (!(prev?.props?.text || '').trim() && created) {
        pastRef.current.pop();
        noteHistory();
      } else {
        pushHistory(origin, next);
      }
      live(next);
      pruneSelection();
      return;
    }
    if ((prev?.props?.text || '') === (curr?.props?.text || '')) return;
    pushHistory(origin);
  }

  function beginEdit(id) {
    if (editOriginRef.current == null) editOriginRef.current = store.get();
    editingIdRef.current = id;
    selectIds([id]);
    setEditingId(id);
    setTool('select');
  }

  function changeText(id, text, measure) {
    live(store.get().map((obj) => {
      if (obj.id !== id) return obj;
      const props = { ...obj.props, text };
      if (measure?.fontSize) props.fontSize = measure.fontSize;
      const next = { ...obj, props };
      if (obj.type === 'text' && measure?.height) next.h = Math.max(40, Math.ceil(measure.height));
      return next;
    }));
  }

  // Кто сейчас чертит в апплете. Замок живёт в props.editor и действует, пока его
  // владелец на доске: ушёл или переподключился — замок сам перестаёт считаться.
  function geoEditor(obj) {
    const editor = obj?.props?.editor;
    if (!editor?.clientId || editor.clientId === clientIdRef.current) return null;
    return peersRef.current.some((peer) => peer.clientId === editor.clientId) ? editor : null;
  }

  function setGeoLock(id, locked) {
    const editor = locked && clientIdRef.current ? { clientId: clientIdRef.current, name: selfName() } : null;
    live(store.get().map((obj) => (obj.id === id ? { ...obj, props: { ...obj.props, editor } } : obj)));
  }

  function toggleGeo(id) {
    const obj = store.get().find((item) => item.id === id);
    if (!obj || !canEdit(obj)) return;
    selectIds([id]);
    const turningOff = editingIdRef.current === id;
    const holder = obj.type === 'geogebra' && !turningOff ? geoEditor(obj) : null;
    if (holder) {
      notify(`Сейчас чертит ${holder.name || 'другой участник'}`);
      return;
    }
    editingIdRef.current = turningOff ? null : id;
    setEditingId(editingIdRef.current);
    if (obj.type === 'geogebra' && !readOnlyRef.current) setGeoLock(id, !turningOff);
    if (!turningOff && obj.type === 'geogebra') socketRef.current?.hideCursor();
    if (turningOff) {
      geoDirtyRef.current.add(id);
      window.clearTimeout(geoXmlTimerRef.current);
      geoXmlTimerRef.current = 0;
      window.clearTimeout(geoTimerRef.current);
      geoTimerRef.current = 0;
      liveRef.current.saveGeoXml?.();
      liveRef.current.saveGeoChanges?.();
    }
  }

  const sideActionsRef = useRef({});
  sideActionsRef.current.theory = placeTheoryBlock;
  sideActionsRef.current.tasks = placeTasks;
  const copyTheoryToBoard = useCallback((payload) => sideActionsRef.current.theory?.(payload), []);
  const copyTasksToBoard = useCallback((payload) => sideActionsRef.current.tasks?.(payload), []);
  const isDragging = useCallback(() => Boolean(dragRef.current), []);
  // Колбэки объектов не меняются между рендерами: они зовут свежие функции через ref-ы.
  const objectCallbacks = useMemo(() => ({
    onChangeText: (...args) => actionsRef.current.changeText?.(...args),
    onBlurText: (...args) => actionsRef.current.commitEdit?.(...args),
    onToggleGeo: (...args) => actionsRef.current.toggleGeo?.(...args),
    onGeoControls: (...args) => actionsRef.current.changeGeoControls?.(...args),
    onGeoReady: (id, api) => {
      if (api) apiMap.current.set(id, api);
      else apiMap.current.delete(id);
    },
    onGeoChange: (id) => liveRef.current.geoChanged?.(id),
    onGeoLayout: (id) => liveRef.current.geoLayoutChanged?.(id),
    onGeoCamera: (id, wire) => socketRef.current?.geocam({ id, ...wire }),
    onGeoCamBind: (id, fn) => {
      if (fn) {
        geoCamInRef.current.set(id, fn);
        const last = geoCamLastRef.current.get(id);
        if (last) fn(last);
      } else geoCamInRef.current.delete(id);
    },
    onGeoMove: (id, body) => socketRef.current?.geomove({ id, ...body }),
    onGeoMoveBind: (id, fn) => {
      if (fn) geoMoveInRef.current.set(id, fn);
      else geoMoveInRef.current.delete(id);
    },
    onGeoInput: (id, body) => socketRef.current?.geoinput({ id, ...body }),
    onGeoInputBind: (id, fn) => {
      if (fn) geoInputInRef.current.set(id, fn);
      else geoInputInRef.current.delete(id);
    },
    onMeasure: (id, height) => liveRef.current.measureObject?.(id, height),
  }), []);
  function toggleSidePane(pane) {
    setSidePane((open) => (open === pane ? null : pane));
    setKeptPanes((prev) => (prev[pane] ? prev : { ...prev, [pane]: true }));
  }

  useLayoutEffect(() => {
    toolRef.current = tool;
    if (dragRef.current?.kind === 'pen') {
      if (inkRef.current.last) paintInk(inkRef.current.last);
      return;
    }
    paintCameraNow();
    paintCursor();
    if (draftRef.current && draftRef.current.kind !== 'pen' && dragRef.current?.kind !== 'pen') paintDraft(draftRef.current);
    if (inkRef.current.last) paintInk(inkRef.current.last);
  });

  useLayoutEffect(() => {
    renderedRectRef.current = cullingRect(camera, viewSize);
    cullFollowRef.current = false;
  });

  useEffect(() => {
    const el = viewportRef.current;
    if (!el || typeof ResizeObserver !== 'function') return undefined;
    const observer = new ResizeObserver(([entry]) => {
      const w = Math.round(entry.contentRect.width);
      const h = Math.round(entry.contentRect.height);
      setViewSize((prev) => (prev.w === w && prev.h === h ? prev : { w, h }));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    titleRef.current = title;
    editingIdRef.current = editingId;
    selectedIdsRef.current = selectedIds;
    toolRef.current = tool;
    styleRef.current = style;
    liveRef.current = {
      flushOps,
      scheduleSend,
      paintSurface,
      geoChanged: (id, info) => {
        if (editingIdRef.current !== id || readOnlyRef.current) return;
        scheduleGeoSave(id, info?.settled ? 0 : info?.moving ? GEO_XML_MOVING_MS : GEO_XML_MS);
      },
      saveGeoXml,
      saveGeoChanges,
      geoLayoutChanged,
      restackTasks,
      measureObject,
      onSnapshot,
      onAckObject,
      onOpError,
      applyRemote,
      onClosed,
      paintPeerCursors,
      followCulling,
      showLaser,
      onGeocam: (message) => geoCamInRef.current.get(message.id)?.(message),
    };
    actionsRef.current = {
      changeText,
      toggleGeo,
      changeGeoControls,
      undo,
      redo,
      deleteSelected,
      commitEdit,
      beginEdit,
      duplicateSelected,
      selectAll,
      toggleLock,
      reorderSelected,
      nudge,
      styleKeys,
      arrowSide,
      finishChain,
      fitAll,
      zoomTo,
      pasteObjects,
      pasteText,
      insertImages,
      pasteTarget,
      pinchMove,
      endPinch,
      selectedList,
    };
    readOnlyRef.current = readOnly;
    audienceRef.current = audience;
    wheelRef.current = (event) => {
      if (!event.isTrusted) return;
      if (event.target instanceof Element && event.target.closest('[data-geo-live]')) return;
      event.preventDefault();
      const cam = cameraRef.current;
      const scale = event.deltaMode === 1 ? 16 : 1;
      if (event.ctrlKey || event.metaKey) {
        const delta = clamp(event.deltaY * scale, -60, 60);
        zoomAt(cam.zoom * Math.exp(-delta * 0.006), event.clientX, event.clientY);
        return;
      }
      paintCamera({ ...cam, x: cam.x - event.deltaX * scale, y: cam.y - event.deltaY * scale });
      scheduleCameraCommit();
    };
  });

  useEffect(() => {
    const onKeyDown = (event) => {
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest('[data-geo-live]')) return;
      const typing = isTypingTarget(target);
      const actions = actionsRef.current;
      if (event.code === 'Space' && !typing) {
        event.preventDefault();
        spaceRef.current = true;
        paintCursor();
        return;
      }
      if (typing) {
        if (event.key === 'Escape' && editingIdRef.current) {
          event.preventDefault();
          actions.commitEdit(editingIdRef.current);
        }
        return;
      }
      const mod = event.ctrlKey || event.metaKey;
      if (mod && event.code === 'KeyZ') {
        event.preventDefault();
        if (event.shiftKey) actions.redo();
        else actions.undo();
        return;
      }
      if (mod && event.code === 'KeyY') {
        event.preventDefault();
        actions.redo();
        return;
      }
      if (mod && event.code === 'KeyA') {
        event.preventDefault();
        actions.selectAll();
        return;
      }
      if (mod && event.code === 'KeyD') {
        event.preventDefault();
        actions.duplicateSelected();
        return;
      }
      if (mod && event.shiftKey && event.code === 'KeyL') {
        event.preventDefault();
        actions.toggleLock();
        return;
      }
      if (event.shiftKey && event.code === 'Digit1') {
        event.preventDefault();
        actions.fitAll();
        return;
      }
      if (event.shiftKey && event.code === 'Digit0') {
        event.preventDefault();
        actions.zoomTo(1);
        return;
      }
      if (event.key === 'PageUp' || event.key === 'PageDown') {
        event.preventDefault();
        actions.reorderSelected(event.key === 'PageUp');
        return;
      }
      if (event.key.startsWith('Arrow') && selectedIdsRef.current.length) {
        event.preventDefault();
        if (!event.shiftKey && actions.styleKeys(event.key)) return;
        const step = event.shiftKey ? 10 : 1;
        const dx = event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0;
        const dy = event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0;
        actions.nudge(dx, dy);
        return;
      }
      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault();
        actions.deleteSelected();
        return;
      }
      if (event.key === 'Escape') {
        if (actions.finishChain?.()) return;
        setEditingId(null);
        selectedIdsRef.current = [];
        setSelectedIds([]);
        setTool('select');
        return;
      }
      if (event.key === 'Enter' && selectedIdsRef.current.length === 1) {
        const obj = store.get().find((item) => item.id === selectedIdsRef.current[0]);
        if (obj && !obj.props?.locked && obj.props?.format !== 'markdown' && obj.props?.format !== 'theory' && (obj.type === 'sticky' || obj.type === 'text' || obj.type === 'shape')) {
          event.preventDefault();
          actions.beginEdit(obj.id);
        }
        return;
      }
      if (mod || event.altKey) return;
      const nextTool = TOOL_CODES[event.code];
      if (!nextTool) return;
      if (event.code === 'KeyO' || event.code === 'KeyR') {
        const shape = event.code === 'KeyO' ? 'sphere' : 'cube';
        setStyle((prev) => ({ ...prev, shape }));
      }
      setTool(nextTool);
    };
    const onKeyUp = (event) => {
      if (event.code === 'Space') {
        spaceRef.current = false;
        paintCursor();
      }
    };
    const onCopy = (event) => {
      if (isTypingTarget(event.target) || isTypingTarget(document.activeElement)) return;
      if (window.getSelection()?.toString()) return;
      const list = actionsRef.current.selectedList();
      if (!list.length) return;
      event.preventDefault();
      event.clipboardData?.setData('text/plain', serializeObjects(list));
      if (event.type === 'cut') actionsRef.current.deleteSelected();
    };
    const onPaste = (event) => {
      if (isTypingTarget(event.target) || isTypingTarget(document.activeElement)) return;
      const data = event.clipboardData;
      if (!data) return;
      const actions = actionsRef.current;
      const point = actions.pasteTarget();
      if (!point) return;
      const files = imageFiles(data.files);
      if (files.length) {
        event.preventDefault();
        actions.insertImages(files, point);
        return;
      }
      const text = data.getData('text/plain');
      const parsed = parseObjects(text);
      if (parsed?.length) {
        event.preventDefault();
        actions.pasteObjects(parsed, point);
        return;
      }
      if (text && text.trim()) {
        event.preventDefault();
        actions.pasteText(text.trim(), point);
      }
    };
    const onTouchMove = (event) => {
      if (event.pointerType !== 'touch' || !touchesRef.current.has(event.pointerId)) return;
      touchesRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (dragRef.current?.kind === 'pinch') actionsRef.current.pinchMove();
    };
    const onTouchEnd = (event) => {
      if (event.pointerType !== 'touch') return;
      touchesRef.current.delete(event.pointerId);
      if (dragRef.current?.kind === 'pinch' && touchesRef.current.size < 2) actionsRef.current.endPinch();
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('copy', onCopy);
    window.addEventListener('cut', onCopy);
    window.addEventListener('paste', onPaste);
    window.addEventListener('pointermove', onTouchMove);
    window.addEventListener('pointerup', onTouchEnd);
    window.addEventListener('pointercancel', onTouchEnd);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('copy', onCopy);
      window.removeEventListener('cut', onCopy);
      window.removeEventListener('paste', onPaste);
      window.removeEventListener('pointermove', onTouchMove);
      window.removeEventListener('pointerup', onTouchEnd);
      window.removeEventListener('pointercancel', onTouchEnd);
    };
  }, [store]);

  function finishLaser(drag) {
    if (drag.points.length < 2) return;
    const points = drag.points.map(roundPoint);
    const color = styleRef.current.laserColor || LASER_COLOR;
    const width = styleRef.current.laserWidth || LASER_WIDTH;
    const ms = strokeDuration(performance.now() - (drag.t0 || performance.now())) || 1;
    socketRef.current?.laser(points, color, width, ms);
    paintDraft(null);
    showLaser({ points, color, width, fadeMs: LASER_FADE_MS });
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
    flushOps();
    const upsert = { type: 'upsert', object: stroke };
    send(upsert);
    const next = applyOp(store.get(), upsert);
    sentRef.current = applyOp(sentRef.current, upsert);
    pushHistory(store.get(), next);
    store.set(next);
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
    paintCamera({ zoom, x: mid.x - worldX * zoom, y: mid.y - worldY * zoom });
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
    window.clearTimeout(cameraSyncRef.current);
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
      paintCamera({
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
      if (editing && editing.type !== 'geogebra') actionsRef.current.commitEdit(editingIdRef.current);
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

  function goBack() {
    flushOps();
    navigate(backTo);
  }

  useEffect(() => {
    let cancelled = false;
    const load = audience === 'teacher' ? listTeacherBoards : listStudentBoards;
    load()
      .then((rows) => {
        if (cancelled) return;
        const current = boardMetaRef.current;
        const mine = (rows || []).filter((row) => sameSeries(row, current));
        if (!mine.some((row) => row.id === current.id)) mine.unshift(current);
        if (mine.every((row) => row.createdAt)) {
          mine.sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)) || String(a.id).localeCompare(String(b.id)));
        } else {
          mine.reverse();
        }
        setSeries(mine);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [initialBoard.id, audience]);

  const pages = series.length ? series : [{
    id: initialBoard.id,
    title: initialBoard.title,
    studentIds: initialBoard.studentIds || [],
    groupId: initialBoard.groupId ?? null,
    seriesId: initialBoard.seriesId || null,
    createdAt: initialBoard.createdAt || '',
  }];
  const pageIndex = Math.max(0, pages.findIndex((page) => page.id === initialBoard.id));
  const trayContext = tool === 'select' || tool === 'hand' ? null : tool;

  return (
    <div className={`fixed inset-0 z-30 flex overflow-hidden bg-[#f3f3f4] text-zinc-900 dark:bg-[#101012] dark:text-zinc-100 ${theoryOpen ? 'min-[720px]:flex-row' : ''}`}>
      <div className="@container relative h-full min-w-0 flex-1 overflow-hidden [contain:layout_paint]">
      <div
        ref={viewportRef}
        className={`absolute inset-0 touch-none select-none ${(tool === 'pen' || tool === 'laser' || tool === 'eraser' || (tool === 'shape' && style.shape === 'polyline')) ? 'cursor-crosshair [&_*]:cursor-crosshair' : ''}`}
        style={{ backgroundColor: surface.color }}
        onPointerDown={onPointerDown}
        onPointerMove={onViewportPointerMove}
        onPointerLeave={() => { pointerClientRef.current = null; }}
        onDoubleClick={onDoubleClick}
        onContextMenu={onContextMenu}
        onDragOver={onDragOver}
        onDrop={onDrop}
      >
        <div
          ref={worldRef}
          className="absolute left-0 top-0 h-0 w-0 origin-top-left overflow-visible"
        >
          <ObjectLayer
            store={store}
            motion={motion}
            camera={camera}
            viewSize={viewSize}
            selectedIds={selectedIds}
            editingId={editingId}
            teacher={audience === 'teacher'}
            selfId={selfId}
            peers={peers}
            callbacks={objectCallbacks}
          />
          <div ref={groupBoxRef} className="pointer-events-none absolute" style={{ display: 'none' }} />
          <div ref={guideHostRef} className="pointer-events-none absolute left-0 top-0" />
          <div ref={draftHostRef} className="pointer-events-none absolute left-0 top-0" />
          <div ref={laserHostRef} className="pointer-events-none absolute left-0 top-0 z-10" />
        </div>
      </div>

      {canvasEmpty && (
        <div ref={hintRef} className="pointer-events-none absolute inset-0 grid place-items-center px-6 pb-28 text-center min-[720px]:pb-6">
          <p className="max-w-md text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
            Пустой холст. N — стикер, T или двойной клик — текст, P — кисть, G — GeoGebra.
            Картинку можно вставить через Ctrl+V или перетащить файл. Колесо двигает доску, Ctrl и колесо — масштаб.
          </p>
        </div>
      )}

      <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
        {peers.map((peer) => (
          <div
            key={peer.clientId}
            ref={(node) => {
              if (node) {
                cursorNodesRef.current.set(peer.clientId, node);
                liveRef.current.paintPeerCursors?.();
              } else {
                cursorNodesRef.current.delete(peer.clientId);
              }
            }}
            className="absolute left-0 top-0 transition-transform duration-75 ease-linear"
            style={{ display: 'none' }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" className="drop-shadow-sm">
              <path d="M2 1.5 L15 8.5 L9 10 L6.5 16 Z" fill={peerColor(peer.clientId)} stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
            </svg>
            <span
              className="ml-3 mt-0.5 inline-block max-w-40 truncate whitespace-nowrap rounded-md px-1.5 py-0.5 text-[11px] font-medium text-white shadow-sm"
              style={{ background: peerColor(peer.clientId) }}
            >
              {peerName(peer)}
            </span>
          </div>
        ))}
      </div>

      <div ref={barRef} className="absolute left-0 top-0 z-30" style={{ visibility: 'hidden' }}>
        {!readOnly && selectedIds.length > 0 && (
          <SelectionBar
            store={store}
            selectedIds={selectedIds}
            editingId={editingId}
            frozen={isDragging}
            canLock={audience === 'teacher'}
            onPatch={patchSelected}
            onDuplicate={duplicateSelected}
            onDelete={deleteSelected}
            onFront={() => reorderSelected(true)}
            onBack={() => reorderSelected(false)}
            onToggleLock={toggleLock}
            onArrowSide={arrowSide}
            onJoin={joinSelected}
            onToggleGeo={toggleGeo}
            onRendered={paintSelectionUi}
          />
        )}
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 z-40 flex items-center gap-1.5 p-2 pt-[max(0.5rem,env(safe-area-inset-top))] [@media(min-width:720px)_and_(min-height:760px)]:pl-[4.75rem]">
        <div className="pointer-events-auto flex w-max max-w-[calc(100%-11rem)] items-center gap-0.5 rounded-2xl border border-zinc-200/80 bg-white/95 px-1 py-0.5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/95">
          <button
            type="button"
            onClick={goBack}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center gap-1 rounded-xl text-sm font-medium text-zinc-600 hover:bg-zinc-100 min-[720px]:w-auto min-[720px]:px-2 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            <ChevronLeft size={16} />
            {sidePane !== 'theory' && <span className="hidden sm:inline">{backLabel}</span>}
          </button>
          <input
            value={title}
            readOnly={readOnly}
            onChange={(event) => {
              titleRef.current = event.target.value;
              setTitle(event.target.value);
            }}
            aria-label="Название доски"
            size={Math.max(4, Math.min(title.length || 4, 16))}
            className="h-8 min-w-0 max-w-40 truncate bg-transparent px-1 text-sm font-semibold outline-none"
          />
          {audience === 'teacher' && [['theory', 'Теория'], ['tasks', 'Задания'], ['students', 'Ученики']].map(([pane, label]) => (
            <button
              key={pane}
              type="button"
              onClick={() => toggleSidePane(pane)}
              className={`hidden h-8 items-center rounded-xl px-2 text-xs font-semibold min-[720px]:inline-flex ${sidePane === pane ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950' : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900'}`}
            >
              {label}
            </button>
          ))}
          <PeerList peers={peers} compact />
          <LinkStatus link={link} />
        </div>

        <div className="pointer-events-auto ml-auto flex shrink-0 items-center gap-1.5">
          {!readOnly && (
            <button
              type="button"
              title="Притянуть участников к своему виду"
              onClick={() => {
                const cam = cameraRef.current;
                socketRef.current?.pull({ x: cam.x, y: cam.y, zoom: cam.zoom });
                notify('Участники видят ваш кадр');
              }}
              className="flex h-9 w-9 items-center justify-center rounded-2xl border border-zinc-200/80 bg-white/95 text-zinc-600 shadow-sm hover:bg-zinc-50 min-[720px]:h-8 dark:border-zinc-800 dark:bg-zinc-950/95 dark:text-zinc-300"
            >
              <LocateFixed size={16} />
            </button>
          )}
          {audience === 'teacher' && (
            <button
              type="button"
              title={cursorsOn ? 'Выключить курсоры участников' : 'Включить курсоры участников'}
              aria-pressed={!cursorsOn}
              onClick={() => {
                const next = !cursorsOnRef.current;
                cursorsOnRef.current = next;
                if (!next) peerCursorsRef.current.clear();
                setCursorsOn(next);
                paintPeerCursors();
                socketRef.current?.cursors(next);
              }}
              className={`flex h-9 w-9 items-center justify-center rounded-2xl border border-zinc-200/80 bg-white/95 shadow-sm hover:bg-zinc-50 min-[720px]:h-8 dark:border-zinc-800 dark:bg-zinc-950/95 ${cursorsOn ? 'text-zinc-600 dark:text-zinc-300' : 'text-zinc-400'}`}
            >
              {cursorsOn ? <Eye size={16} /> : <EyeOff size={16} />}
            </button>
          )}
          {audience === 'teacher' && (
            <div className="hidden min-[720px]:block">
              <ShareButton
                open={shareOpen}
                access={shareAccess}
                token={shareTokenState}
                onToggle={() => setShareOpen((open) => !open)}
                onClose={() => setShareOpen(false)}
                onApply={async (access, resetLink) => {
                  const data = await updateTeacherBoardShare(initialBoard.id, { access, resetLink });
                  setShareAccess(data.shareAccess || 'off');
                  setShareTokenState(data.shareToken || null);
                }}
              />
            </div>
          )}
          {!readOnly && (
            <div className="relative">
              <button
                type="button"
                aria-label="Фон и сетка"
                title="Фон и сетка"
                onClick={() => setSurfaceOpen((open) => !open)}
                className="flex h-9 w-9 items-center justify-center rounded-2xl border border-zinc-200/80 bg-white/95 text-zinc-600 shadow-sm hover:bg-zinc-50 min-[720px]:h-8 dark:border-zinc-800 dark:bg-zinc-950/95 dark:text-zinc-300"
              >
                <Grid3x3 size={16} />
              </button>
              {surfaceOpen && (
                <SurfacePanel
                  surface={surface}
                  onChange={applySurface}
                  onClose={() => setSurfaceOpen(false)}
                />
              )}
            </div>
          )}
          <div className="flex items-center rounded-2xl border border-zinc-200/80 bg-white/95 p-1 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/95">
            <IconButton label="Отменить (Ctrl+Z)" disabled={!canUndo} onClick={undo}><Undo2 size={18} /></IconButton>
            <IconButton label="Повторить (Ctrl+Shift+Z)" disabled={!canRedo} onClick={redo}><Redo2 size={18} /></IconButton>
          </div>
          <div className="hidden items-center rounded-2xl border border-zinc-200/80 bg-white/95 p-1 shadow-sm min-[720px]:flex dark:border-zinc-800 dark:bg-zinc-950/95">
            <IconButton label="Уменьшить" onClick={() => zoomBy(1 / 1.2)}><Minus size={18} /></IconButton>
            <button
              ref={zoomLabelRef}
              type="button"
              title="100% (Shift+0)"
              onClick={() => zoomTo(1)}
              className="h-8 w-12 text-center text-xs font-medium tabular-nums text-zinc-600 dark:text-zinc-300"
            >
              {Math.round(camera.zoom * 100)}%
            </button>
            <IconButton label="Увеличить" onClick={() => zoomBy(1.2)}><Plus size={18} /></IconButton>
            <IconButton label="Показать всё (Shift+1)" onClick={fitAll}><Maximize2 size={16} /></IconButton>
          </div>
        </div>
      </div>

      {pagesOpen && (
        <div className="absolute left-2 top-[4.5rem] z-40 flex max-h-[min(70vh,32rem)] w-64 flex-col rounded-2xl border border-zinc-200 bg-white p-3 shadow-lg dark:border-zinc-800 dark:bg-zinc-950">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold">Страницы</p>
            <button type="button" aria-label="Закрыть" onClick={() => setPagesOpen(false)} className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900">
              <X size={16} />
            </button>
          </div>
          {audience === 'teacher' && (
            <button
              type="button"
              onClick={addPage}
              className="mb-2 rounded-xl bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-200 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
            >
              + Новая страница
            </button>
          )}
          <div className="min-h-0 flex-1 space-y-1 overflow-y-auto">
            {pages.map((page, index) => (
              <div key={page.id} className={`flex items-center gap-2 rounded-xl px-2 py-1.5 ${page.id === initialBoard.id ? 'bg-sky-50 dark:bg-sky-950/40' : 'hover:bg-zinc-50 dark:hover:bg-zinc-900'}`}>
                {editingPageId === page.id ? (
                  <input
                    autoFocus
                    value={editingPageTitle}
                    aria-label={`Название страницы ${index + 1}`}
                    onChange={(event) => setEditingPageTitle(event.target.value)}
                    onBlur={() => commitPageTitle(page.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') event.currentTarget.blur();
                      if (event.key === 'Escape') setEditingPageId(null);
                    }}
                    className="h-8 min-w-0 flex-1 bg-transparent text-sm outline-none"
                  />
                ) : (
                  <button
                    type="button"
                    title="Двойное нажатие меняет название"
                    onClick={() => {
                      window.clearTimeout(pageClickRef.current);
                      pageClickRef.current = window.setTimeout(() => switchPage(page.id), 220);
                    }}
                    onDoubleClick={(event) => {
                      event.preventDefault();
                      window.clearTimeout(pageClickRef.current);
                      beginPageRename(page);
                    }}
                    className="min-w-0 flex-1 truncate text-left text-sm"
                  >
                    <span className="mr-2 text-zinc-500">{index + 1}</span>
                    {page.id === initialBoard.id ? title : (page.title || 'Доска')}
                  </button>
                )}
                {audience === 'teacher' && pages.length > 1 && (
                  <button type="button" aria-label="Удалить страницу" onClick={() => removePage(page.id)} className="text-zinc-400 hover:text-red-600">
                    <X size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="absolute bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-2 z-40 min-[720px]:bottom-3 @max-[1100px]:bottom-[calc(4.75rem+env(safe-area-inset-bottom))]">
        <div className="flex items-center gap-0.5 rounded-2xl border border-zinc-200/80 bg-white/95 p-1 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/95">
          <button
            type="button"
            aria-label="Страницы"
            title="Страницы"
            onClick={() => setPagesOpen((open) => !open)}
            className={`flex h-11 w-11 items-center justify-center rounded-xl min-[720px]:h-9 min-[720px]:w-9 ${pagesOpen ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950' : 'text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-900'}`}
          >
            <Menu size={18} />
          </button>
          <div className="hidden items-center min-[720px]:flex">
            <button
              type="button"
              aria-label="Предыдущая страница"
              onClick={() => switchPage(pages[Math.max(0, pageIndex - 1)].id)}
              className="flex h-9 w-8 items-center justify-center rounded-lg text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="min-w-12 text-center text-sm font-medium tabular-nums text-zinc-800 dark:text-zinc-100">
              {pageIndex + 1}
              {' / '}
              {pages.length}
            </span>
            <button
              type="button"
              aria-label="Следующая страница"
              onClick={() => switchPage(pages[Math.min(pages.length - 1, pageIndex + 1)].id)}
              className="flex h-9 w-8 items-center justify-center rounded-lg text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {notice && (
        <div className="pointer-events-auto absolute left-1/2 top-16 z-50 flex max-w-[calc(100vw-2rem)] -translate-x-1/2 items-start gap-2 rounded-xl bg-zinc-900 px-3 py-2 text-xs font-medium text-white shadow-lg dark:bg-zinc-100 dark:text-zinc-900">
          <AlertCircle size={14} className="mt-px shrink-0" />
          <span className="min-w-0">{notice}</span>
          <button type="button" aria-label="Закрыть" onClick={() => notify('')} className="-mr-1 shrink-0 opacity-70 hover:opacity-100">
            <X size={14} />
          </button>
        </div>
      )}

      <div className="absolute bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-2 right-2 z-30 flex translate-x-0 flex-col-reverse items-stretch gap-2 min-[720px]:bottom-3 min-[720px]:left-1/2 min-[720px]:right-auto min-[720px]:w-max min-[720px]:-translate-x-1/2 min-[720px]:items-center [@media(min-width:720px)_and_(min-height:760px)]:bottom-auto [@media(min-width:720px)_and_(min-height:760px)]:left-3 [@media(min-width:720px)_and_(min-height:760px)]:top-16 [@media(min-width:720px)_and_(min-height:760px)]:w-auto [@media(min-width:720px)_and_(min-height:760px)]:translate-x-0 [@media(min-width:720px)_and_(min-height:760px)]:flex-col [@media(min-width:720px)_and_(min-height:760px)]:items-start">
        <div className="flex min-w-0 max-w-full flex-row items-center gap-0.5 overflow-x-auto rounded-2xl border border-zinc-200/80 bg-white/95 p-1 shadow-sm [scrollbar-width:none] [&::-webkit-scrollbar]:hidden dark:border-zinc-800 dark:bg-zinc-950/95 min-[720px]:w-max [@media(min-width:720px)_and_(min-height:760px)]:w-12 [@media(min-width:720px)_and_(min-height:760px)]:max-w-none [@media(min-width:720px)_and_(min-height:760px)]:flex-col [@media(min-width:720px)_and_(min-height:760px)]:overflow-visible [@media(min-width:720px)_and_(min-height:760px)]:p-1.5">
          {TOOLS.filter((item) => !readOnly || item.id === 'select' || item.id === 'hand' || item.id === 'laser').map((item) => {
            const Icon = item.icon;
            const active = tool === item.id;
            const divider = item.id === 'sticky' || item.id === 'image';
            return (
              <div key={item.id} className="flex items-center [@media(min-width:720px)_and_(min-height:760px)]:w-full [@media(min-width:720px)_and_(min-height:760px)]:flex-col">
                {divider && <div className="mx-0.5 h-6 w-px bg-zinc-200 dark:bg-zinc-800 [@media(min-width:720px)_and_(min-height:760px)]:mx-1 [@media(min-width:720px)_and_(min-height:760px)]:my-1 [@media(min-width:720px)_and_(min-height:760px)]:h-px [@media(min-width:720px)_and_(min-height:760px)]:w-6" />}
                <button
                  type="button"
                  title={`${item.label} (${item.hint})`}
                  aria-label={item.label}
                  aria-pressed={active}
                  onClick={() => setTool(item.id)}
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors [@media(min-width:720px)_and_(min-height:760px)]:h-9 [@media(min-width:720px)_and_(min-height:760px)]:w-9 ${active ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950' : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900'}`}
                >
                  <Icon size={18} strokeWidth={1.75} />
                </button>
              </div>
            );
          })}
        </div>
        <StyleTray context={trayContext} style={style} onStyle={setStyle} />
      </div>
      <input
        ref={fileRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={onImageFile}
      />
      </div>
      {audience === 'teacher' && (
        <BoardSidePanes
          pane={sidePane}
          kept={keptPanes}
          groupId={initialBoard.groupId ?? null}
          studentIds={sideStudentsRef.current}
          onTheory={copyTheoryToBoard}
          onTasks={copyTasksToBoard}
        />
      )}
    </div>
  );
}

const EMPTY_STUDENTS = [];

const BoardSidePanes = memo(function BoardSidePanes({ pane, kept, groupId, studentIds, onTheory, onTasks }) {
  if (!kept.theory && !kept.tasks && !kept.students) return null;
  const open = pane != null;
  return (
    <aside
      hidden={!open}
      inert={!open}
      className={`h-full min-w-0 w-1/2 overflow-hidden border-l border-zinc-200 [contain:layout_paint] dark:border-zinc-800 ${open ? 'hidden min-[720px]:block' : 'hidden'}`}
    >
      {kept.theory && (
        <div className="h-full" hidden={pane !== 'theory'} inert={pane !== 'theory'}>
          <BoardTheoryPane onCopy={onTheory} />
        </div>
      )}
      {kept.tasks && (
        <div className="h-full" hidden={pane !== 'tasks'} inert={pane !== 'tasks'}>
          <BoardTasksPane onCopy={onTasks} />
        </div>
      )}
      {kept.students && (
        <div className="h-full" hidden={pane !== 'students'} inert={pane !== 'students'}>
          <BoardStudentsPane groupId={groupId} studentIds={studentIds || EMPTY_STUDENTS} onCopy={onTasks} />
        </div>
      )}
    </aside>
  );
});

// Панель выделения подписана на выделенные объекты сама: при их правке не
// перерисовывается весь редактор. Пока идёт жест, она скрыта и не обновляется.
function SelectionBar({ store, selectedIds, editingId, frozen, onRendered, onToggleGeo, ...actions }) {
  const selectObjects = useCallback((objects) => {
    const ids = new Set(selectedIds);
    return objects.filter((obj) => ids.has(obj.id));
  }, [selectedIds]);
  const isEqual = useCallback((a, b) => sameIdList(a, b) || frozen(), [frozen]);
  const objects = useStoreSelector(store, selectObjects, isEqual);
  useLayoutEffect(() => {
    onRendered?.();
  });
  if (!objects.length) return null;
  const first = objects[0];
  const geoEditing = objects.length === 1 && editingId === first.id && first.type === 'geogebra';
  return (
    <SelectionToolbar
      objects={objects}
      geoEditing={geoEditing}
      onToggleGeo={() => onToggleGeo(first.id)}
      {...actions}
    />
  );
}

function ShareButton({ open, access, token, onToggle, onClose, onApply }) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const link = token ? `${window.location.origin}/board/shared/${token}` : '';
  async function apply(next, resetLink = false) {
    setBusy(true);
    setNote('');
    try {
      await onApply(next, resetLink);
      setNote(resetLink ? 'Новая ссылка' : '');
    } catch (error) {
      setNote(boardErrorMessage(error, 'Не удалось изменить ссылку'));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="relative">
      <button
        type="button"
        title="Ссылка на доску"
        aria-pressed={open}
        onClick={onToggle}
        className={`flex h-9 w-9 items-center justify-center rounded-2xl border border-zinc-200/80 bg-white/95 shadow-sm hover:bg-zinc-50 min-[720px]:h-8 dark:border-zinc-800 dark:bg-zinc-950/95 ${access === 'off' ? 'text-zinc-400' : 'text-zinc-800 dark:text-zinc-100'}`}
      >
        <Link2 size={16} />
      </button>
      {open && (
        <div className="absolute right-0 top-11 z-50 w-72 rounded-2xl border border-zinc-200 bg-white p-3 shadow-lg dark:border-zinc-800 dark:bg-zinc-950">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold">Ссылка</p>
            <button type="button" aria-label="Закрыть" onClick={onClose} className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900"><X size={14} /></button>
          </div>
          <div className="grid grid-cols-3 gap-1">
            {[['off', 'Выкл'], ['view', 'Смотреть'], ['edit', 'Править']].map(([id, label]) => (
              <button
                key={id}
                type="button"
                disabled={busy}
                onClick={() => apply(id)}
                className={`rounded-lg px-2 py-1.5 text-xs font-semibold ${access === id ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950' : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300'}`}
              >
                {label}
              </button>
            ))}
          </div>
          {access !== 'off' && link && (
            <div className="mt-2 space-y-1">
              <button
                type="button"
                onClick={() => navigator.clipboard?.writeText(link).then(() => setNote('Ссылка скопирована')).catch(() => setNote(link))}
                className="w-full truncate rounded-lg bg-zinc-100 px-2 py-1.5 text-left text-xs text-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
              >
                {link}
              </button>
              <button type="button" disabled={busy} onClick={() => apply(access, true)} className="text-xs font-medium text-zinc-500 hover:text-zinc-800">
                Новая ссылка, старая перестанет работать
              </button>
            </div>
          )}
          {note && <p className="mt-2 text-xs text-zinc-500">{note}</p>}
        </div>
      )}
    </div>
  );
}

function LinkStatus({ link }) {
  if (link.state !== 'offline') return null;
  const base = 'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-2 text-[11px] font-medium';
  const text = link.pending ? `Потеряно соединение · ${link.pending} в очереди` : 'Потеряно соединение';
  return (
    <span className={`${base} text-amber-600`} title="Правки отправятся после переподключения">
      <WifiOff size={13} />
      <span className="hidden sm:inline">{text}</span>
    </span>
  );
}

function PeerList({ peers, compact = false }) {
  if (!peers.length) return null;
  const shown = peers.slice(0, 4);
  const rest = peers.length - shown.length;
  return (
    <div
      className={`flex shrink-0 items-center ${compact ? 'pr-1' : 'rounded-2xl border border-zinc-200/80 bg-white/90 py-1 pl-1 pr-2 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/90'}`}
      title={peers.map(peerName).join(', ')}
    >
      <div className="flex -space-x-1.5">
        {shown.map((peer) => (
          <span
            key={peer.clientId}
            className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-semibold text-white ring-2 ring-white dark:ring-zinc-950"
            style={{ background: peerColor(peer.clientId) }}
          >
            {initials(peerName(peer))}
          </span>
        ))}
      </div>
      {rest > 0 && <span className="ml-1.5 text-[11px] font-medium text-zinc-500">+{rest}</span>}
    </div>
  );
}

function IconButton({ label, onClick, disabled, className = '', children }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-xl text-zinc-700 hover:bg-zinc-100 disabled:opacity-30 min-[720px]:h-8 min-[720px]:w-8 dark:text-zinc-200 dark:hover:bg-zinc-900 ${className}`}
    >
      {children}
    </button>
  );
}

function StyleTray({ context, style, onStyle }) {
  if (context === 'sticky') {
    return (
      <SwatchCard label="Цвет стикера">
        <div className="flex flex-wrap gap-1.5">
          {STICKY_COLORS.map((color) => (
            <ColorDot
              key={color.id}
              color={color.bg}
              label={color.label}
              active={style.sticky === color.bg}
              onClick={() => onStyle((prev) => ({ ...prev, sticky: color.bg }))}
            />
          ))}
        </div>
      </SwatchCard>
    );
  }

  if (context === 'text') {
    return (
      <SwatchCard label="Текст">
        <div className="flex gap-1">
          {TEXT_SIZES.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onStyle((prev) => ({ ...prev, textSize: item.size }))}
              className={`h-7 min-w-7 rounded-lg px-1.5 text-[11px] font-semibold ${style.textSize === item.size ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950' : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300'}`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </SwatchCard>
    );
  }

  if (context === 'laser') {
    return (
      <SwatchCard label="Указка">
        <div className="flex flex-wrap gap-1.5">
          {LASER_COLORS.map((color) => (
            <ColorDot
              key={color}
              color={color}
              label={color}
              active={style.laserColor === color}
              onClick={() => onStyle((prev) => ({ ...prev, laserColor: color }))}
            />
          ))}
        </div>
        <div className="mt-2 flex gap-1">
          {LASER_WIDTHS.map((width) => (
            <button
              key={width}
              type="button"
              onClick={() => onStyle((prev) => ({ ...prev, laserWidth: width }))}
              className={`h-7 min-w-7 rounded-lg px-1.5 text-[11px] font-semibold ${style.laserWidth === width ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950' : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300'}`}
            >
              {width}
            </button>
          ))}
        </div>
      </SwatchCard>
    );
  }

  if (context === 'pen' || context === 'eraser') {
    return (
      <SwatchCard label={context === 'eraser' ? 'Ластик стирает штрихи кисти' : 'Кисть'}>
        {context === 'pen' && (
          <>
            <div className="flex flex-wrap gap-1.5">
              {PEN_COLORS.map((color) => (
                <ColorDot
                  key={color}
                  color={color}
                  label={color}
                  active={style.pen === color}
                  onClick={() => onStyle((prev) => ({ ...prev, pen: color }))}
                />
              ))}
            </div>
            <div className="mt-2 flex gap-1">
              {PEN_WIDTHS.map((width) => (
                <button
                  key={width}
                  type="button"
                  onClick={() => onStyle((prev) => ({ ...prev, penWidth: width }))}
                  className={`h-7 min-w-7 rounded-lg px-1.5 text-[11px] font-semibold ${style.penWidth === width ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950' : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300'}`}
                >
                  {width}
                </button>
              ))}
            </div>
          </>
        )}
      </SwatchCard>
    );
  }

  if (context === 'shape') {
    return (
      <SwatchCard label="Стереометрия" wide>
        <div className="max-h-64 space-y-2 overflow-y-auto">
          {SHAPE_GROUPS.map((group) => (
            <div key={group.id}>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">{group.label}</p>
              <div className="grid grid-cols-5 gap-1">
                {group.kinds.map((kind) => (
                  <button
                    key={kind.id}
                    type="button"
                    aria-label={kind.label}
                    title={kind.label}
                    onClick={() => onStyle((prev) => ({ ...prev, shape: kind.id }))}
                    className={`flex h-7 w-7 items-center justify-center rounded-lg ${style.shape === kind.id ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950' : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-900'}`}
                  >
                    <ShapeGlyph id={kind.id} size={16} />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {SHAPE_FILLS.map((fill) => (
            <ColorDot
              key={fill.id}
              color={fill.fill}
              label={fill.label}
              active={style.fill.fill === fill.fill}
              onClick={() => onStyle((prev) => ({ ...prev, fill }))}
            />
          ))}
        </div>
      </SwatchCard>
    );
  }

  if (context === 'arrow') {
    return (
      <SwatchCard label="Отрезок">
        <div className="flex flex-wrap gap-1.5">
          {PEN_COLORS.map((color) => (
            <ColorDot
              key={color}
              color={color}
              label={color}
              active={style.arrow === color}
              onClick={() => onStyle((prev) => ({ ...prev, arrow: color }))}
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
          Клик по доске открывает файл. Ещё можно вставить картинку через Ctrl+V или перетащить её на холст.
        </p>
      </SwatchCard>
    );
  }

  if (context === 'geogebra') {
    return (
      <SwatchCard label="GeoGebra" wide>
        <div className="flex flex-col gap-1">
          {GEOGEBRA_APPS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onStyle((prev) => ({ ...prev, appName: item.id, templateId: '' }))}
              className={`rounded-lg px-2 py-1.5 text-left text-xs font-medium ${style.appName === item.id ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950' : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-200'}`}
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
    <div className={`${wide ? 'w-[min(100vw-1.5rem,18rem)]' : 'w-[min(100vw-1.5rem,15rem)]'} max-h-[38vh] overflow-y-auto rounded-2xl border border-zinc-200/80 bg-white/95 p-2.5 shadow-sm min-[720px]:max-h-none ${wide ? 'min-[720px]:w-56' : 'min-[720px]:w-40'} dark:border-zinc-800 dark:bg-zinc-950/95`}>
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
      style={color === 'none'
        ? { background: 'linear-gradient(135deg, transparent 46%, currentColor 46%, currentColor 54%, transparent 54%)' }
        : { background: color }}
    />
  );
}

function SurfacePanel({ surface, onChange, onClose }) {
  const grids = [
    { id: 'empty', label: 'Пустой' },
    { id: 'cell', label: 'Клетка' },
    { id: 'rule', label: 'Линейка' },
  ];
  return (
    <div className="fixed inset-x-3 top-16 z-50 max-h-[calc(100dvh-9rem)] overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-4 shadow-lg min-[720px]:absolute min-[720px]:inset-x-auto min-[720px]:right-0 min-[720px]:top-11 min-[720px]:max-h-none min-[720px]:w-[22rem] dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Фон и сетка</p>
        <button type="button" aria-label="Закрыть" onClick={onClose} className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900">
          <X size={16} />
        </button>
      </div>
      <p className="mb-2 text-sm text-zinc-500">Цвет фона</p>
      <div className="mb-4 flex flex-wrap gap-2">
        {SURFACE_COLORS.map((color) => (
          <button
            key={color}
            type="button"
            aria-label={color}
            onClick={() => onChange({ ...surface, color })}
            className={`h-9 w-9 rounded-xl border ${surface.color === color ? 'border-sky-500 ring-2 ring-sky-200' : 'border-zinc-200 dark:border-zinc-700'}`}
            style={{ background: color }}
          />
        ))}
      </div>
      <p className="mb-2 text-sm text-zinc-500">Тип сетки</p>
      <div className="mb-3 grid grid-cols-3 gap-2">
        {grids.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onChange({ ...surface, grid: item.id })}
            className={`rounded-xl border px-2 py-2 text-xs font-medium ${surface.grid === item.id ? 'border-sky-500 bg-sky-50 text-sky-900' : 'border-zinc-200 text-zinc-600 dark:border-zinc-700 dark:text-zinc-300'}`}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div
        className="h-28 rounded-xl border border-zinc-200"
        style={{
          backgroundColor: surface.color,
          backgroundImage: surface.grid === 'cell'
            ? 'linear-gradient(to right, rgba(120,132,148,0.45) 1px, transparent 1px), linear-gradient(to bottom, rgba(120,132,148,0.45) 1px, transparent 1px)'
            : surface.grid === 'rule'
              ? 'linear-gradient(to bottom, transparent 15px, rgba(120,132,148,0.45) 15px)'
              : 'none',
          backgroundSize: surface.grid === 'rule' ? '100% 16px' : '20px 20px',
        }}
      />
    </div>
  );
}
