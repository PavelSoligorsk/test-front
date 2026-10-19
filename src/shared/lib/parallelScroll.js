import { useRef } from 'react';

export function useParallelScroll() {
  const leftRef = useRef(null);
  const rightRef = useRef(null);
  const syncing = useRef(false);

  const sync = (source, target) => {
    if (syncing.current || !source || !target) return;
    const sourceMax = source.scrollHeight - source.clientHeight;
    const targetMax = target.scrollHeight - target.clientHeight;
    if (sourceMax <= 0) return;
    syncing.current = true;
    target.scrollTop = targetMax > 0 ? (source.scrollTop / sourceMax) * targetMax : 0;
    requestAnimationFrame(() => {
      syncing.current = false;
    });
  };

  return {
    leftRef,
    rightRef,
    onLeftScroll: () => sync(leftRef.current, rightRef.current),
    onRightScroll: () => sync(rightRef.current, leftRef.current),
  };
}

export const parallelScrollClass = 'min-h-0 lg:max-h-[calc(100vh-100px)] lg:overflow-y-auto lg:overscroll-contain';
