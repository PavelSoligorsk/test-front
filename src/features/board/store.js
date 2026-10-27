import { useCallback, useRef, useSyncExternalStore } from 'react';

// Документ доски вне React. Объект перерисовывается, только когда меняется он сам;
// список — только когда меняется состав или порядок. Раньше любая правка (и каждый
// кадр перетаскивания) перерисовывала весь холст, а часть DOM красилась вручную.

function indexById(list) {
  return new Map(list.map((obj) => [obj.id, obj]));
}

function sameOrder(order, list) {
  if (order.length !== list.length) return false;
  for (let index = 0; index < list.length; index += 1) {
    if (order[index] !== list[index].id) return false;
  }
  return true;
}

export function createBoardStore(initial = []) {
  let objects = initial;
  let byId = indexById(initial);
  let order = initial.map((obj) => obj.id);
  let version = 0;
  const listeners = new Set();
  const orderListeners = new Set();
  const idListeners = new Map();
  let pendingIds = new Set();
  let pendingOrder = false;
  let pendingAll = false;
  let frame = 0;

  const notify = () => {
    frame = 0;
    const ids = pendingIds;
    const orderChanged = pendingOrder;
    pendingIds = new Set();
    pendingOrder = false;
    pendingAll = false;
    ids.forEach((id) => idListeners.get(id)?.forEach((fn) => fn()));
    if (orderChanged) orderListeners.forEach((fn) => fn());
    listeners.forEach((fn) => fn());
  };

  const store = {
    get: () => objects,
    getById: (id) => byId.get(id),
    getOrder: () => order,
    getVersion: () => version,

    /**
     * Новый список объектов. changed — подсказка, какие объекты поменялись (жест знает
     * это сам), тогда список не сравнивается целиком. defer — оповестить на следующем
     * кадре: жест пишет модель на каждое движение мыши, а рисовать нужно раз в кадр.
     */
    set(next, { changed = null, defer = false } = {}) {
      if (next === objects) return;
      const prev = byId;
      objects = next;
      version += 1;
      if (changed && sameOrder(order, next)) {
        changed.forEach((obj) => {
          if (!obj) return;
          byId.set(obj.id, obj);
          pendingIds.add(obj.id);
        });
      } else {
        byId = indexById(next);
        next.forEach((obj) => {
          if (prev.get(obj.id) !== obj) pendingIds.add(obj.id);
        });
        prev.forEach((_, id) => {
          if (!byId.has(id)) pendingIds.add(id);
        });
        if (!sameOrder(order, next)) {
          order = next.map((obj) => obj.id);
          pendingOrder = true;
        }
      }
      pendingAll = true;
      if (defer) {
        if (!frame) frame = requestAnimationFrame(notify);
        return;
      }
      if (frame) {
        cancelAnimationFrame(frame);
        frame = 0;
      }
      notify();
    },

    /** Догнать отложенные оповещения сейчас (конец жеста). */
    flush() {
      if (!frame && !pendingAll) return;
      if (frame) cancelAnimationFrame(frame);
      notify();
    },

    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },

    subscribeOrder(fn) {
      orderListeners.add(fn);
      return () => orderListeners.delete(fn);
    },

    subscribeId(id, fn) {
      let set = idListeners.get(id);
      if (!set) {
        set = new Set();
        idListeners.set(id, set);
      }
      set.add(fn);
      return () => {
        set.delete(fn);
        if (!set.size) idListeners.delete(id);
      };
    },

    dispose() {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      listeners.clear();
      orderListeners.clear();
      idListeners.clear();
    },
  };
  return store;
}

export function useBoardObject(store, id) {
  const subscribe = useCallback((fn) => store.subscribeId(id, fn), [store, id]);
  return useSyncExternalStore(subscribe, () => store.getById(id));
}

/**
 * Производное значение документа. selector считается на каждую правку, но компонент
 * перерисовывается, только когда результат поменялся по isEqual.
 */
export function useStoreSelector(store, selector, isEqual = Object.is) {
  const cache = useRef({ version: -1, value: undefined, selector: null });
  const getSnapshot = () => {
    const entry = cache.current;
    const version = store.getVersion();
    if (entry.version === version && entry.selector === selector) return entry.value;
    const value = selector(store.get());
    const same = entry.version >= 0 && isEqual(entry.value, value);
    cache.current = { version, value: same ? entry.value : value, selector };
    return cache.current.value;
  };
  return useSyncExternalStore(store.subscribe, getSnapshot);
}

export function sameIdList(a, b) {
  if (a === b) return true;
  if (!a || !b || a.length !== b.length) return false;
  for (let index = 0; index < a.length; index += 1) {
    if (a[index] !== b[index]) return false;
  }
  return true;
}
