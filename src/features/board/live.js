import { getToken } from '../../shared/lib/session';
import { boardSocketUrl } from './api';

const FINAL_CODES = new Set([4401, 4403, 4404]);
const MAX_BACKOFF = 30000;

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

  const reconnect = () => {
    const delay = Math.min(MAX_BACKOFF, 1000 * 2 ** Math.min(attempt, 5));
    attempt += 1;
    status();
    timer = window.setTimeout(open, delay);
  };

  const handle = (message) => {
    switch (message?.type) {
      case 'snapshot': {
        attempt = 0;
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
        raw({ type: 'sync' });
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
      case 'join':
        if (message.peer) handlers.onJoin?.(message.peer);
        break;
      case 'leave':
        handlers.onLeave?.(message.clientId);
        break;
      case 'deleted':
        stopped = true;
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
    ws.onmessage = (event) => {
      if (socket !== ws) return;
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
      if (stopped) return;
      if (FINAL_CODES.has(event.code)) {
        stopped = true;
        handlers.onClosed?.(event.code);
        return;
      }
      reconnect();
    };
  }

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
    laser(points, color, width) {
      raw({ type: 'laser', points, color, width });
    },
    cursors(enabled) {
      raw({ type: 'cursors', enabled: Boolean(enabled) });
    },
    pull(camera) {
      raw({ type: 'pull', camera });
    },
    pendingCount: () => pending.size,
    close() {
      stopped = true;
      window.clearTimeout(timer);
      const ws = socket;
      socket = null;
      ready = false;
      if (ws && ws.readyState <= WebSocket.OPEN) ws.close(1000);
    },
  };
}

export function setRemoteTitle({ audience, boardId, title }) {
  return new Promise((resolve, reject) => {
    let sent = false;
    let settled = false;
    const finish = (error) => {
      if (settled) return;
      settled = true;
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
    window.setTimeout(() => finish(new Error('Страница не ответила')), 8000);
  });
}
