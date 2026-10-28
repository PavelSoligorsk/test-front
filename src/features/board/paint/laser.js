import { smoothPath } from '../geometry';
import { LASER_COLOR, LASER_FADE_MS, LASER_WIDTH } from '../constants';

// Полоска указки: дорисовывается за время, сравнимое со временем жеста, и гаснет.

export function playLaser(host, message) {
  const points = Array.isArray(message?.points) ? message.points : [];
  if (!host || points.length < 2) return;
  const origin = points[0];
  const wrap = document.createElement('div');
  wrap.style.position = 'absolute';
  wrap.style.left = `${origin.x}px`;
  wrap.style.top = `${origin.y}px`;
  wrap.style.width = '12px';
  wrap.style.height = '12px';
  wrap.style.overflow = 'visible';
  wrap.style.pointerEvents = 'none';
  wrap.style.opacity = '1';
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '12');
  svg.setAttribute('height', '12');
  svg.style.display = 'block';
  svg.style.overflow = 'visible';
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  const local = points.map((point) => ({ x: Number(point.x) - origin.x, y: Number(point.y) - origin.y }));
  path.setAttribute('d', smoothPath(local.slice(0, 2)));
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', message.color || LASER_COLOR);
  path.setAttribute('stroke-width', String(message.width || LASER_WIDTH));
  path.setAttribute('stroke-linecap', 'round');
  path.setAttribute('stroke-linejoin', 'round');
  svg.appendChild(path);
  wrap.appendChild(svg);
  host.appendChild(wrap);
  const drawMs = Math.min(1600, Math.max(400, local.length * 6));
  const fadeMs = Math.max(1, Number(message.fadeMs) || LASER_FADE_MS);
  let started = 0;
  const tick = (now) => {
    if (!wrap.isConnected) return;
    if (!started) started = now;
    const elapsed = now - started;
    if (elapsed < drawMs) {
      const count = Math.max(2, Math.ceil(local.length * (elapsed / drawMs)));
      path.setAttribute('d', smoothPath(local.slice(0, count)));
      requestAnimationFrame(tick);
      return;
    }
    path.setAttribute('d', smoothPath(local));
    const fade = Math.min(1, (elapsed - drawMs) / fadeMs);
    wrap.style.opacity = String(1 - fade);
    if (fade < 1) requestAnimationFrame(tick);
    else wrap.remove();
  };
  requestAnimationFrame(tick);
}
