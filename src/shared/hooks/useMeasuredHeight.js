import { useLayoutEffect, useRef } from 'react';

/**
 * Сообщает высоту элемента при каждом изменении (шрифты, формулы, картинки догружаются позже).
 * Возвращает ref для элемента.
 */
export function useMeasuredHeight(onMeasure) {
  const ref = useRef(null);
  const callbackRef = useRef(onMeasure);

  useLayoutEffect(() => {
    callbackRef.current = onMeasure;
  });

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return undefined;
    const report = () => callbackRef.current?.(Math.ceil(node.offsetHeight));
    report();
    if (typeof ResizeObserver !== 'function') return undefined;
    const observer = new ResizeObserver(report);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return ref;
}
