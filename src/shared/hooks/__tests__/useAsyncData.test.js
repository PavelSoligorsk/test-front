// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { useAsyncData } from '../useAsyncData';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

let root = null;

// Рендерит хук и отдаёт объект, в котором всегда последний результат.
function renderHook(initialProps, useHook) {
  const result = { current: null };
  function Probe(props) {
    result.current = useHook(props);
    return null;
  }
  root = createRoot(document.createElement('div'));
  act(() => root.render(createElement(Probe, initialProps)));
  return {
    result,
    rerender: (props) => act(() => root.render(createElement(Probe, props))),
  };
}

afterEach(() => {
  act(() => root?.unmount());
  root = null;
});

describe('useAsyncData', () => {
  it('грузит данные по ключу и снимает loading по ответу', async () => {
    const request = deferred();
    const { result } = renderHook({ id: 'a' }, ({ id }) => useAsyncData(id, () => request.promise));
    expect(result.current).toMatchObject({ loading: true, data: undefined, error: null });
    await act(async () => request.resolve(['x']));
    expect(result.current).toMatchObject({ loading: false, data: ['x'], error: null });
  });

  it('без ключа ничего не запрашивает', () => {
    let calls = 0;
    const { result } = renderHook({}, () => useAsyncData(null, () => { calls += 1; return Promise.resolve(1); }));
    expect(calls).toBe(0);
    expect(result.current).toMatchObject({ loading: false, data: undefined });
  });

  it('не показывает чужие данные и отбрасывает ответ на прежний ключ', async () => {
    const requests = { a: deferred(), b: deferred() };
    const { result, rerender } = renderHook({ id: 'a' }, ({ id }) => useAsyncData(id, () => requests[id].promise));
    await act(async () => requests.a.resolve('A'));
    rerender({ id: 'b' });
    expect(result.current).toMatchObject({ loading: true, data: undefined });
    rerender({ id: 'a' });
    rerender({ id: 'b' });
    await act(async () => requests.b.resolve('B'));
    expect(result.current).toMatchObject({ loading: false, data: 'B' });
  });

  it('keepPrevious держит прежние данные, пока грузится новый ключ', async () => {
    const requests = { a: deferred(), b: deferred() };
    const { result, rerender } = renderHook(
      { id: 'a' },
      ({ id }) => useAsyncData(id, () => requests[id].promise, { keepPrevious: true }),
    );
    await act(async () => requests.a.resolve('A'));
    rerender({ id: 'b' });
    expect(result.current).toMatchObject({ loading: true, data: 'A' });
    await act(async () => requests.b.resolve('B'));
    expect(result.current).toMatchObject({ loading: false, data: 'B' });
  });

  it('reload перезапрашивает без мигания, mutate правит загруженное', async () => {
    let version = 0;
    const { result } = renderHook({}, () => useAsyncData('k', () => Promise.resolve(++version)));
    await act(async () => {});
    expect(result.current.data).toBe(1);
    let pending;
    act(() => { pending = result.current.reload(); });
    expect(result.current).toMatchObject({ loading: false, data: 1 });
    await act(async () => pending);
    expect(result.current.data).toBe(2);
    act(() => result.current.mutate((n) => n * 10));
    expect(result.current.data).toBe(20);
  });

  it('ошибка отдаётся по своему ключу, прежние данные при reload сохраняются', async () => {
    let fail = false;
    const { result } = renderHook({}, () => useAsyncData('k', () => (fail ? Promise.reject(new Error('нет сети')) : Promise.resolve('ok'))));
    await act(async () => {});
    fail = true;
    await act(async () => result.current.reload());
    expect(result.current.data).toBe('ok');
    expect(result.current.error?.message).toBe('нет сети');
  });
});
