import { getToken } from '../../shared/lib/session';
import { boardSocketUrl } from './api';

const FINAL_CODES = new Set([4401, 4403, 4404]);
const MAX_BACKOFF = 30000;
const PING_MS = 15000;
// Ответ на ping не пришёл за это время — соединение мёртвое (сон ноутбука, смена сети).
// Считаем от отправки ping, а не от последнего сообщения: в фоновой вкладке таймеры
// браузер замедляет, и долгая тишина там — не обрыв.
const PONG_TIMEOUT_MS = 10000;

function backoffDelay(attempt) {
  const base = Math.min(MAX_BACKOFF, 1000 * 2 ** Math.min(attempt, 5));
  return Math.round(base * (0.75 + Math.random() * 0.5));
}

// Одно соединение на открытую доску: snapshot один раз, дальше мелкие операции.
// Неподтверждённые операции живут в pending и переотправляются после нового snapshot.
export function connectBoard({ audience, boardId, shareToken = null, handlers }) {
  const pending = new Map();
  const prefix = Math.random().toString(36).slice(2, 8);
  let socket = null;
  let ready = false;
  let stopped = false;
  let attempt = 0;
  let timer = 0;
  let counter = 0;
  let heartbeat = 0;
  let lastHeard = 0;
  let pingSentAt = 0;
  // Один запрос sync на все отклонённые правки: следующий snapshot приведёт всё в порядок.
  let syncAsked = false;

  const status = () => {
    if (stopped) return;
    handlers.onStatus?.(ready ? (pending.size ? 'syncing' : 'live') : attempt ? 'offline' : 'connecting', pending.size);
  };

  const raw = (message) => {
    if (!ready || socket?.readyState !== WebSocket.OPEN) return false;
    try {
      socket.send(JSON.stringify(message));
      return true;
    } catch {
      return false;
    }
  };

  const stopHeartbeat = () => {
    window.clearInterval(heartbeat);
    heartbeat = 0;
  };

  const drop = () => {
    const ws = socket;
    socket = null;
    ready = false;
    syncAsked = false;
    stopHeartbeat();
    if (ws && ws.readyState <= WebSocket.OPEN) {
      try { ws.close(4000); } catch { /* уже закрыт */ }
    }
  };

  const reconnect = () => {
    window.clearTimeout(timer);
    const delay = backoffDelay(attempt);
    attempt += 1;
    status();
    timer = window.setTimeout(open, delay);
  };

  const ping = () => {
    if (raw({ type: 'ping', t: Date.now() })) pingSentAt = performance.now();
  };

  const checkPulse = () => {
    const now = performance.now();
    if (pingSentAt && pingSentAt > lastHeard && now - pingSentAt > PONG_TIMEOUT_MS) {
      drop();
      reconnect();
      return;
    }
    if (now - lastHeard >= PING_MS && !(pingSentAt > lastHeard)) ping();
  };

  const startHeartbeat = () => {
    stopHeartbeat();
    lastHeard = performance.now();
    pingSentAt = 0;
    heartbeat = window.setInterval(checkPulse, PONG_TIMEOUT_MS / 2);
  };

  const askSync = () => {
    if (syncAsked) return;
    if (raw({ type: 'sync' })) syncAsked = true;
  };

  const handle = (message) => {
    switch (message?.type) {
      case 'snapshot': {
        attempt = 0;
        syncAsked = false;
        // Незаконченный штрих в очередь не попадает: в сеть уходит только готовая линия.
        // Пока ready=false, всё, что клиент досылает внутри onSnapshot, только копится в pending.
        handlers.onSnapshot?.(message, () => [...pending.values()]);
        ready = true;
        pending.forEach((op, opId) => raw({ ...op, opId }));
        status();
        break;
      }
      case 'ack':
        pending.delete(message.opId);
        if (message.object) handlers.onAckObject?.(message.object);
        status();
        break;
      case 'error':
        pending.delete(message.opId);
        handlers.onOpError?.(message.detail);
        askSync();
        status();
        break;
      case 'op':
        if (message.op) handlers.onOp?.(message.op, message);
        break;
      case 'cursor':
        handlers.onCursor?.(message);
        break;
      case 'laser':
        handlers.onLaser?.(message);
        break;
      case 'cursors':
        handlers.onCursors?.(message.enabled !== false);
        break;
      case 'pull':
        handlers.onPull?.(message);
        break;
      case 'geocam':
        handlers.onGeocam?.(message);
        break;
      case 'geomove':
        handlers.onGeoMove?.(message);
        break;
      case 'geoinput':
        handlers.onGeoInput?.(message);
        break;
      case 'join':
        if (message.peer) handlers.onJoin?.(message.peer);
        break;
      case 'leave':
        handlers.onLeave?.(message.clientId);
        break;
      case 'deleted':
        stopped = true;
        stopHeartbeat();
        handlers.onClosed?.(4404);
        break;
      default:
        break;
    }
  };

  function open() {
    timer = 0;
    if (stopped) return;
    const token = getToken();
    if (!token) {
      stopped = true;
      handlers.onClosed?.(4401);
      return;
    }
    let ws;
    try {
      ws = new WebSocket(boardSocketUrl(audience, boardId, token, shareToken));
    } catch {
      reconnect();
      return;
    }
    socket = ws;
    ws.onopen = () => {
      if (socket === ws) startHeartbeat();
    };
    ws.onmessage = (event) => {
      if (socket !== ws) return;
      lastHeard = performance.now();
      let message = null;
      try {
        message = JSON.parse(event.data);
      } catch {
        return;
      }
      handle(message);
    };
    ws.onclose = (event) => {
      if (socket !== ws) return;
      socket = null;
      ready = false;
      syncAsked = false;
      stopHeartbeat();
      if (stopped) return;
      if (FINAL_CODES.has(event.code)) {
        stopped = true;
        handlers.onClosed?.(event.code);
        return;
      }
      reconnect();
    };
  }

  // Сеть вернулась или вкладку снова открыли: не ждать конца паузы.
  const wake = () => {
    if (stopped || document.visibilityState === 'hidden') return;
    if (socket && socket.readyState <= WebSocket.OPEN) {
      if (ready && performance.now() - lastHeard > PING_MS && !(pingSentAt > lastHeard)) ping();
      return;
    }
    window.clearTimeout(timer);
    attempt = Math.min(attempt, 1);
    open();
  };
  window.addEventListener('online', wake);
  document.addEventListener('visibilitychange', wake);

  open();
  status();

  return {
    send(op) {
      if (stopped) return;
      counter += 1;
      const opId = `${prefix}-${counter}`;
      pending.set(opId, op);
      raw({ ...op, opId });
      status();
    },
    cursor(x, y) {
      raw({ type: 'cursor', x, y });
    },
    hideCursor() {
      raw({ type: 'cursor', hidden: true });
    },
    laser(points, color, width, ms) {
      raw({ type: 'laser', points, color, width, ms });
    },
    cursors(enabled) {
      raw({ type: 'cursors', enabled: Boolean(enabled) });
    },
    pull(camera) {
      raw({ type: 'pull', camera });
    },
    geocam(body) {
      raw({ type: 'geocam', ...body });
    },
    geomove(body) {
      raw({ type: 'geomove', ...body });
    },
    geoinput(body) {
      raw({ type: 'geoinput', ...body });
    },
    pendingCount: () => pending.size,
    close() {
      stopped = true;
      window.clearTimeout(timer);
      window.removeEventListener('online', wake);
      document.removeEventListener('visibilitychange', wake);
      const ws = socket;
      socket = null;
      ready = false;
      stopHeartbeat();
      if (ws && ws.readyState <= WebSocket.OPEN) ws.close(1000);
    },
  };
}

export function setRemoteTitle({ audience, boardId, title }) {
  return new Promise((resolve, reject) => {
    let sent = false;
    let settled = false;
    let guard = 0;
    const finish = (error) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(guard);
      connection.close();
      if (error) reject(error);
      else resolve();
    };
    const connection = connectBoard({
      audience,
      boardId,
      handlers: {
        onSnapshot: () => {
          if (sent) return;
          sent = true;
          connection.send({ type: 'title', title });
        },
        onStatus: (state) => {
          if (sent && state === 'live') finish();
        },
        onOpError: (detail) => finish(new Error(detail || 'Не удалось переименовать страницу')),
        onClosed: (code) => {
          if (!sent) finish(new Error(code === 4403 ? 'Нет доступа' : 'Страница не открылась'));
        },
      },
    });
    guard = window.setTimeout(() => finish(new Error('Страница не ответила')), 8000);
  });
}
