import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { DialogsContext } from './dialogsContext';
import { primaryBtnClass, secondaryBtnClass } from '../Sheet';

const NOTICE_MS = 5000;
const dangerBtnClass =
  'inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600';

function ConfirmDialog({ request, onAnswer }) {
  const confirmRef = useRef(null);

  useEffect(() => {
    confirmRef.current?.focus();
    const onKey = (event) => {
      if (event.key === 'Escape') onAnswer(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onAnswer]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => onAnswer(false)} />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={request.title ? 'confirm-title' : undefined}
        aria-describedby="confirm-text"
        className="relative w-full max-w-md rounded-3xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-[#09090b]"
      >
        {request.title && (
          <h2 id="confirm-title" className="mb-2 text-base font-semibold text-zinc-900 dark:text-zinc-100">{request.title}</h2>
        )}
        <p id="confirm-text" className="whitespace-pre-line text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">{request.text}</p>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" className={secondaryBtnClass} onClick={() => onAnswer(false)}>
            {request.cancelLabel || 'Отмена'}
          </button>
          <button
            ref={confirmRef}
            type="button"
            className={request.danger ? dangerBtnClass : primaryBtnClass}
            onClick={() => onAnswer(true)}
          >
            {request.confirmLabel || (request.danger ? 'Удалить' : 'ОК')}
          </button>
        </div>
      </div>
    </div>
  );
}

function Notices({ items, onClose }) {
  return (
    <div aria-live="polite" className="pointer-events-none fixed bottom-4 right-4 z-[110] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2">
      {items.map((item) => (
        <div
          key={item.id}
          role={item.tone === 'error' ? 'alert' : 'status'}
          className={`pointer-events-auto flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm shadow-lg ${item.tone === 'error'
            ? 'border-red-200 bg-red-50 text-red-800 dark:border-red-900/50 dark:bg-red-950/60 dark:text-red-200'
            : 'border-zinc-200 bg-white text-zinc-800 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100'}`}
        >
          <span className="min-w-0 flex-1 whitespace-pre-line">{item.text}</span>
          <button type="button" aria-label="Закрыть" onClick={() => onClose(item.id)} className="shrink-0 opacity-60 hover:opacity-100">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}

/** Общие подтверждения и уведомления приложения (useConfirm / useNotify из dialogsContext). */
export default function DialogProvider({ children }) {
  const [queue, setQueue] = useState([]);
  const [notices, setNotices] = useState([]);
  const seqRef = useRef(0);
  const timersRef = useRef(new Map());
  const queueRef = useRef(queue);
  useLayoutEffect(() => {
    queueRef.current = queue;
  });

  const confirm = useCallback((text, options = {}) => new Promise((resolve) => {
    seqRef.current += 1;
    setQueue((prev) => [...prev, { ...options, text, resolve, id: seqRef.current }]);
  }), []);

  const answer = useCallback((value) => {
    const [head] = queueRef.current;
    if (!head) return;
    head.resolve(value);
    setQueue((prev) => prev.filter((item) => item.id !== head.id));
  }, []);

  const closeNotice = useCallback((id) => {
    window.clearTimeout(timersRef.current.get(id));
    timersRef.current.delete(id);
    setNotices((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const notify = useCallback((text, tone = 'error') => {
    if (!text) return;
    seqRef.current += 1;
    const id = seqRef.current;
    setNotices((prev) => [...prev.slice(-3), { id, text: String(text), tone }]);
    timersRef.current.set(id, window.setTimeout(() => closeNotice(id), NOTICE_MS));
  }, [closeNotice]);

  useEffect(() => {
    const timers = timersRef.current;
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, []);

  const value = useMemo(() => ({ confirm, notify }), [confirm, notify]);
  const current = queue[0];

  return (
    <DialogsContext.Provider value={value}>
      {children}
      {current && <ConfirmDialog key={current.id} request={current} onAnswer={answer} />}
      <Notices items={notices} onClose={closeNotice} />
    </DialogsContext.Provider>
  );
}
