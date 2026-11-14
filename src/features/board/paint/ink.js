// Дорисовка чужого штриха по времени жеста (props.ms / points[i].t), а не по длине линии.
//
// Протокол:
//   1. BoardEditor: ink.start(id) — до применения op к стору, только для нового штриха.
//   2. BoardObject: в useLayoutEffect, когда <path> уже в DOM, но кадр ещё не показан,
//      вызывает ink.attach(id, path, props). Анимация создаётся синхронно.
//   3. BoardObject при размонтировании вызывает ink.cancel(id).

const MIN_MS = 200;
const MAX_MS = 2500;
const FALLBACK_SPEED = 600;
const PENDING_TTL_MS = 5000;

const pending = new Map();
const running = new Map();

const clamp = (value, lo, hi) => Math.min(hi, Math.max(lo, value));

function reducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

function cumulativeLength(points) {
  const cum = [0];
  for (let i = 1; i < points.length; i += 1) {
    cum.push(cum[i - 1] + Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y));
  }
  return cum;
}

function buildPlan(props) {
  const points = Array.isArray(props?.points) ? props.points : [];
  if (points.length < 2) return null;
  const cum = cumulativeLength(points);
  const total = cum[cum.length - 1];
  if (!(total > 0)) return null;

  const timed = points.every((point) => Number.isFinite(point.t));
  const span = timed ? points[points.length - 1].t - points[0].t : 0;
  const useTimes = timed && span > 0;

  const declared = useTimes ? span : Number(props.ms);
  const ms = Number.isFinite(declared) && declared > 0 ? declared : (total / FALLBACK_SPEED) * 1000;
  const duration = clamp(ms, MIN_MS, MAX_MS);

  const frames = [];
  if (useTimes) {
    let last = 0;
    points.forEach((point, i) => {
      last = Math.min(1, Math.max(last, (point.t - points[0].t) / span));
      frames.push({ offset: last, strokeDashoffset: String(1 - cum[i] / total) });
    });
  } else {
    frames.push({ offset: 0, strokeDashoffset: '1' }, { offset: 1, strokeDashoffset: '0' });
  }
  return { duration, frames };
}

function release({ anim, path }) {
  anim.onfinish = null;
  anim.cancel();
  path.style.removeProperty('stroke-dasharray');
  path.removeAttribute('pathLength');
}

export const ink = {
  start(id) {
    pending.set(id, { until: performance.now() + PENDING_TTL_MS });
  },

  attach(id, path, props) {
    const job = pending.get(id);
    if (!job) return;
    pending.delete(id);
    if (performance.now() > job.until) return;
    if (!path || typeof path.animate !== 'function' || reducedMotion()) return;
    const plan = buildPlan(props);
    if (!plan) return;

    path.setAttribute('pathLength', '1');
    path.style.strokeDasharray = '1 2';
    const anim = path.animate(plan.frames, { duration: plan.duration, easing: 'linear', fill: 'both' });
    const run = { anim, path, job };
    running.set(id, run);
    anim.onfinish = () => {
      if (running.get(id) !== run) return;
      running.delete(id);
      release(run);
    };
  },

  cancel(id) {
    pending.delete(id);
    const run = running.get(id);
    if (!run) return;
    running.delete(id);
    const unfinished = run.anim.playState !== 'finished';
    release(run);
    if (unfinished) pending.set(id, run.job);
  },
};
