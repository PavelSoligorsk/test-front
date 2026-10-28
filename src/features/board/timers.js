// Время для редактора доски. Всё, что смотрит на часы, живёт здесь, а не в теле
// компонента: тело компонента должно оставаться чистым и предсказуемым.

/** Одно и то же сообщение не чаще раза в windowMs. Возвращает true, если показывать. */
export function createRepeatGate(windowMs) {
  let last = { key: null, at: -Infinity };
  return (key) => {
    const now = Date.now();
    if (last.key === key && now - last.at < windowMs) return false;
    last = { key, at: now };
    return true;
  };
}

/** Таймер, который при повторном вызове срабатывает в самое раннее из запрошенных времён. */
export function createEarliestTimer() {
  let timer = 0;
  let due = 0;
  return {
    schedule(delay, fn) {
      const at = performance.now() + delay;
      if (timer && at >= due) return;
      clearTimeout(timer);
      due = at;
      timer = setTimeout(() => {
        timer = 0;
        fn();
      }, delay);
    },
    cancel() {
      clearTimeout(timer);
      timer = 0;
    },
  };
}

/** Не чаще раза в intervalMs; последний вызов в паузе не теряется, а уходит в её конце. */
export function createThrottle(fn, intervalMs) {
  let last = -Infinity;
  let timer = 0;
  let args = [];
  const run = () => {
    timer = 0;
    last = performance.now();
    fn(...args);
  };
  const call = (...next) => {
    args = next;
    const wait = intervalMs - (performance.now() - last);
    if (wait <= 0) {
      clearTimeout(timer);
      run();
    } else if (!timer) {
      timer = setTimeout(run, wait);
    }
  };
  call.cancel = () => {
    clearTimeout(timer);
    timer = 0;
  };
  return call;
}

/** Длительность жеста от отметки начала. */
export function sinceMs(startedAt) {
  return performance.now() - (startedAt || performance.now());
}

export function nowMs() {
  return performance.now();
}
