// Чужой готовый штрих появляется не сразу, а прорисовывается со скоростью руки.

const INK_SPEED = 720;

function paint(ink, viewport, now) {
  let alive = false;
  ink.items.forEach((item, id) => {
    const path = viewport?.querySelector(`[data-object="${CSS.escape(id)}"] path`);
    if (!path) {
      // Штрих ещё не отрисован или ушёл за экран: ждём недолго и бросаем анимацию.
      item.missing = (item.missing || 0) + 1;
      if (item.missing > 120) ink.items.delete(id);
      else alive = true;
      return;
    }
    const length = path.getTotalLength();
    if (!length) {
      alive = true;
      return;
    }
    if (!item.duration) item.duration = Math.min(4000, Math.max(280, (length / INK_SPEED) * 1000));
    if (!item.at) item.at = now;
    const progress = Math.min(1, (now - item.at) / item.duration);
    path.style.strokeDasharray = String(length);
    path.style.strokeDashoffset = String(length * (1 - progress));
    if (progress < 1) alive = true;
    else {
      path.style.strokeDasharray = '';
      path.style.strokeDashoffset = '';
      ink.items.delete(id);
    }
  });
  return alive;
}

/** Анимация «чужой штрих рисуется» по stroke-dashoffset. attach() — корень холста. */
export function createInk() {
  let viewport = null;
  const getViewport = () => viewport;
  const ink = { items: new Map(), raf: 0, last: 0 };
  return {
    attach(element) {
      viewport = element;
    },
    start(id) {
      if (!id) return;
      ink.items.set(id, { at: 0 });
      if (ink.raf) return;
      const tick = (now) => {
        ink.last = now;
        ink.raf = paint(ink, getViewport(), now) ? requestAnimationFrame(tick) : 0;
      };
      ink.raf = requestAnimationFrame(tick);
    },
    /** Перерисовать текущий кадр (после рендера React узлы путей могли смениться). */
    repaint() {
      if (ink.last) paint(ink, getViewport(), ink.last);
    },
    stop() {
      cancelAnimationFrame(ink.raf);
      ink.raf = 0;
      ink.items.clear();
    },
  };
}
