import { useState } from 'react';
import { Link2, X } from 'lucide-react';
import { boardErrorMessage } from '../api';

export default function ShareButton({ open, access, token, onToggle, onClose, onApply }) {
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
