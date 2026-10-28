import { useMemo, useSyncExternalStore } from 'react';
import { parseSession, readStoredSession, subscribeSession } from '../lib/session';

/** Текущий пользователь; компонент перерисуется при входе, выходе и смене сессии в другой вкладке. */
export function useSessionUser() {
  const saved = useSyncExternalStore(subscribeSession, readStoredSession, () => null);
  return useMemo(() => parseSession(saved), [saved]);
}
