import { createContext, useContext } from 'react';

export const DialogsContext = createContext(null);

function useDialogs() {
  const ctx = useContext(DialogsContext);
  if (!ctx) throw new Error('useConfirm/useNotify must be used within DialogProvider');
  return ctx;
}

/**
 * Подтверждение вместо window.confirm: `if (!(await confirm('Удалить?', { danger: true }))) return;`
 * Опции: title, confirmLabel, cancelLabel, danger.
 */
export function useConfirm() {
  return useDialogs().confirm;
}

/** Всплывающее сообщение вместо alert: `notify(text)` — ошибка, `notify(text, 'success')` — успех. */
export function useNotify() {
  return useDialogs().notify;
}
