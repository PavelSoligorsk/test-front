import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

/**
 * Данные, которые загружаются по ключу. Пока для текущего ключа нет ответа — `loading`.
 *
 * Состояние меняется только когда запрос завершился, поэтому эффект не вызывает setState
 * синхронно, а смена ключа не показывает чужие данные: они «устаревают» сами, по ключу.
 * `key = null` — грузить нечего. `reload()` перезапрашивает тот же ключ и держит на экране
 * прежние данные до ответа; `mutate()` правит загруженное локально (после своих изменений).
 * `keepPrevious` — пока грузится новый ключ, отдавать данные прежнего (листание календаря).
 * Ответ на устаревший запрос отбрасывается.
 */
export function useAsyncData(key, load, { keepPrevious = false } = {}) {
  const [state, setState] = useState({ key: null, data: undefined, error: null });
  const loadRef = useRef(load);
  const seqRef = useRef(0);
  const keyRef = useRef(key);

  useLayoutEffect(() => {
    loadRef.current = load;
    keyRef.current = key;
  });

  // Загрузчик зовётся сразу: в ref лежит версия того же рендера, что и ключ.
  const run = useCallback((requested) => {
    seqRef.current += 1;
    const seq = seqRef.current;
    let request;
    try {
      request = Promise.resolve(loadRef.current());
    } catch (error) {
      request = Promise.reject(error);
    }
    return request
      .then(
        (data) => {
          if (seq === seqRef.current) setState({ key: requested, data, error: null });
        },
        (error) => {
          if (seq !== seqRef.current) return;
          setState((prev) => ({ key: requested, data: prev.key === requested ? prev.data : undefined, error }));
        },
      );
  }, []);

  useEffect(() => {
    if (key == null) return undefined;
    run(key);
    return () => {
      seqRef.current += 1;
    };
  }, [key, run]);

  const reload = useCallback(() => (keyRef.current == null ? Promise.resolve() : run(keyRef.current)), [run]);

  const mutate = useCallback((update) => {
    setState((prev) => (prev.key == null
      ? prev
      : { ...prev, data: typeof update === 'function' ? update(prev.data) : update }));
  }, []);

  const ready = key != null && state.key === key;
  return {
    data: ready || (keepPrevious && key != null) ? state.data : undefined,
    error: ready ? state.error : null,
    loading: key != null && !ready,
    reload,
    mutate,
  };
}
