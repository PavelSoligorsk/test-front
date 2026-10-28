// Плавное воспроизведение чужих движений. Значения приходят пачками раз в 50–200 мс;
// показываем их с небольшой задержкой и линейно между соседними отсчётами — с
// постоянной скоростью, без рывков и без «догоняния» экспонентой.

export function lerpNumbers(a, b, k) {
  if (Array.isArray(a)) return a.map((value, index) => value + (b[index] - value) * k);
  if (a && typeof a === 'object') {
    const out = {};
    Object.keys(a).forEach((key) => {
      const from = a[key];
      const to = b?.[key];
      out[key] = typeof from === 'number' && typeof to === 'number' ? from + (to - from) * k : (k < 1 ? from : to);
    });
    return out;
  }
  return a + (b - a) * k;
}

/**
 * Буфер отсчётов. push(value, at) — отсчёт со временем получения (или отправки,
 * переведённым в наши часы); sample(now) — значение на момент now - delay.
 * adaptive: задержка растёт до 1,25 среднего промежутка между отсчётами, чтобы
 * редкие отсчёты (снимок XML раз в 200 мс, камера раз в 450 мс) не шли рывками.
 */
export function createPlayback({ delay = 100, lerp = lerpNumbers, maxSamples = 32, adaptive = false, maxDelay = 600 } = {}) {
  const samples = [];
  let gap = 0;
  let lastAt = null;
  return {
    push(value, at = performance.now()) {
      const last = samples[samples.length - 1];
      const time = last ? Math.max(at, last.at + 1) : at;
      if (lastAt != null) {
        const step = time - lastAt;
        if (step > 0 && step < 2000) gap = gap ? gap * 0.8 + step * 0.2 : step;
      }
      lastAt = time;
      samples.push({ at: time, value });
      if (samples.length > maxSamples) samples.splice(0, samples.length - maxSamples);
    },
    sample(now = performance.now()) {
      if (!samples.length) return null;
      const wait = adaptive ? Math.min(maxDelay, Math.max(delay, gap * 1.25)) : delay;
      const play = now - wait;
      while (samples.length > 1 && samples[1].at <= play) samples.shift();
      const [from, to] = samples;
      if (!to) return { value: from.value, done: play >= from.at };
      if (play <= from.at) return { value: from.value, done: false };
      const k = Math.min(1, (play - from.at) / Math.max(1, to.at - from.at));
      return { value: lerp(from.value, to.value, k), done: false };
    },
    last() {
      return samples.length ? samples[samples.length - 1].value : null;
    },
    get size() {
      return samples.length;
    },
    clear() {
      samples.length = 0;
    },
  };
}

/**
 * Набор воспроизведений по ключам с одним циклом кадров. onFrame(key, value, done)
 * зовётся на каждом кадре для каждого активного ключа.
 */
export function createPlaybackGroup({ delay = 100, interval = 50, lerp = lerpNumbers, adaptive = false, onFrame }) {
  const items = new Map();
  let raf = 0;

  const tick = (now) => {
    raf = 0;
    items.forEach((playback, key) => {
      const sample = playback.sample(now);
      if (!sample) {
        items.delete(key);
        return;
      }
      if (sample.done) items.delete(key);
      onFrame(key, sample.value, sample.done);
    });
    if (items.size) raf = requestAnimationFrame(tick);
  };

  return {
    /** Новое значение. from — откуда начинать, если ключ ещё не двигался. */
    push(key, value, from = null, at = performance.now()) {
      let playback = items.get(key);
      if (!playback) {
        playback = createPlayback({ delay, lerp, adaptive });
        items.set(key, playback);
        if (from != null) playback.push(from, at - interval);
      }
      playback.push(value, at);
      if (!raf) raf = requestAnimationFrame(tick);
    },
    has: (key) => items.has(key),
    active: () => items.size > 0,
    cancel(key) {
      items.delete(key);
    },
    clear() {
      items.clear();
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    },
  };
}

/**
 * Перевод времени отправителя (Date.now() на его машине) в наши performance.now().
 * Смещение берётся по самому быстрому пакету и медленно подстраивается: так задержка
 * сети не превращается в рывки, а разница часов не ломает порядок отсчётов.
 */
export function createClockSync({ resetAfterMs = 3000 } = {}) {
  let offset = null;
  let lastRecv = 0;
  let lastAt = 0;
  return (sentWallMs) => {
    const recv = performance.now();
    if (recv - lastRecv > resetAfterMs) offset = null;
    lastRecv = recv;
    if (!Number.isFinite(sentWallMs)) {
      lastAt = Math.max(lastAt, recv);
      return lastAt;
    }
    const sent = sentWallMs - performance.timeOrigin;
    const skew = recv - sent;
    offset = offset == null || skew < offset ? skew : offset + (skew - offset) * 0.002;
    lastAt = Math.max(lastAt, sent + offset);
    return lastAt;
  };
}
