import { smoothPath } from '../geometry';
import { SELECTION_COLOR } from '../model';
import { appendFigures, shapeFigures } from '../shapes';

// Черновики поверх холста, пока идёт жест: линия кисти, рамка выделения, ломаная,
// будущая фигура и отрезок. Это временная графика, а не объекты документа.

export function renderDraft(host, draft, zoom) {
  if (!host) return;
  if (draft?.kind === 'pen' && draft.points.length) {
    const origin = draft.origin || draft.points[0];
    const wrap = host.firstChild;
    const path = wrap?.dataset?.pen === `${origin.x},${origin.y}` ? wrap.querySelector('path') : null;
    if (path) {
      path.setAttribute('d', smoothPath(draft.points.map((point) => ({ x: point.x - origin.x, y: point.y - origin.y }))));
      path.setAttribute('stroke', draft.color);
      path.setAttribute('stroke-width', draft.width);
      return;
    }
  }
  host.replaceChildren();
  if (!draft) return;
  const inv = 1 / zoom;
  if (draft.kind === 'marquee') {
    const node = document.createElement('div');
    node.className = 'pointer-events-none absolute';
    node.style.left = `${draft.x}px`;
    node.style.top = `${draft.y}px`;
    node.style.width = `${draft.w}px`;
    node.style.height = `${draft.h}px`;
    node.style.border = `${inv}px solid ${SELECTION_COLOR}`;
    node.style.background = 'rgba(66, 98, 255, 0.08)';
    host.appendChild(node);
    return;
  }
  if (draft.kind === 'chain') {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '1');
    svg.setAttribute('height', '1');
    svg.style.position = 'absolute';
    svg.style.left = '0';
    svg.style.top = '0';
    svg.style.overflow = 'visible';
    const addLine = (x1, y1, x2, y2, dashed) => {
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', x1);
      line.setAttribute('y1', y1);
      line.setAttribute('x2', x2);
      line.setAttribute('y2', y2);
      line.setAttribute('stroke', draft.stroke || '#18181b');
      line.setAttribute('stroke-width', '2');
      line.setAttribute('stroke-linecap', 'round');
      if (dashed) line.setAttribute('stroke-dasharray', '6 4');
      svg.appendChild(line);
    };
    draft.points.forEach((point, index) => {
      if (index) addLine(draft.points[index - 1].x, draft.points[index - 1].y, point.x, point.y, false);
    });
    if (draft.closing && draft.points.length) {
      const last = draft.points[draft.points.length - 1];
      addLine(last.x, last.y, draft.points[0].x, draft.points[0].y, false);
    } else if (draft.hover && draft.points.length) {
      const last = draft.points[draft.points.length - 1];
      addLine(last.x, last.y, draft.hover.x, draft.hover.y, false);
    }
    if (draft.guide) addLine(draft.guide.x1, draft.guide.y1, draft.guide.x2, draft.guide.y2, true);
    draft.points.forEach((point, index) => {
      const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      dot.setAttribute('cx', point.x);
      dot.setAttribute('cy', point.y);
      dot.setAttribute('r', index === 0 ? '3.5' : '2.5');
      dot.setAttribute('fill', '#18181b');
      svg.appendChild(dot);
    });
    host.appendChild(svg);
    return;
  }
  if (draft.kind === 'shape') {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'pointer-events-none absolute overflow-visible');
    svg.style.position = 'absolute';
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.style.left = `${draft.x}px`;
    svg.style.top = `${draft.y}px`;
    svg.style.width = `${Math.max(draft.w, 1)}px`;
    svg.style.height = `${Math.max(draft.h, 1)}px`;
    svg.style.opacity = '0.85';
    appendFigures(svg, shapeFigures(draft.shape), { fill: draft.fill, stroke: draft.stroke });
    host.appendChild(svg);
    return;
  }
  if (draft.kind === 'pen' && draft.points.length) {
    // Та же схема, что у зрителя: рамка в первой точке, точки от неё. Рамка по bbox раздувает холст и сдвигает уже нарисованное.
    const origin = draft.origin || draft.points[0];
    const wrap = document.createElement('div');
    wrap.dataset.pen = `${origin.x},${origin.y}`;
    wrap.style.position = 'absolute';
    wrap.style.left = `${origin.x}px`;
    wrap.style.top = `${origin.y}px`;
    wrap.style.width = '12px';
    wrap.style.height = '12px';
    wrap.style.overflow = 'visible';
    wrap.style.pointerEvents = 'none';
    const pen = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    pen.setAttribute('width', '12');
    pen.setAttribute('height', '12');
    pen.style.display = 'block';
    pen.style.overflow = 'visible';
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', smoothPath(draft.points.map((point) => ({ x: point.x - origin.x, y: point.y - origin.y }))));
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', draft.color);
    path.setAttribute('stroke-width', draft.width);
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');
    pen.appendChild(path);
    wrap.appendChild(pen);
    host.appendChild(wrap);
    return;
  }
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'pointer-events-none absolute overflow-visible');
  svg.style.position = 'absolute';
  if (draft.kind === 'arrow') {
    const left = Math.min(draft.x1, draft.x2);
    const top = Math.min(draft.y1, draft.y2);
    svg.style.left = `${left}px`;
    svg.style.top = `${top}px`;
    svg.setAttribute('width', Math.max(Math.abs(draft.x2 - draft.x1), 1));
    svg.setAttribute('height', Math.max(Math.abs(draft.y2 - draft.y1), 1));
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', draft.x1 - left);
    line.setAttribute('y1', draft.y1 - top);
    line.setAttribute('x2', draft.x2 - left);
    line.setAttribute('y2', draft.y2 - top);
    line.setAttribute('stroke', draft.color);
    line.setAttribute('stroke-width', draft.width);
    line.setAttribute('stroke-linecap', 'round');
    svg.appendChild(line);
    if (draft.guide) {
      const guide = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      guide.setAttribute('x1', draft.guide.x1 - left);
      guide.setAttribute('y1', draft.guide.y1 - top);
      guide.setAttribute('x2', draft.guide.x2 - left);
      guide.setAttribute('y2', draft.guide.y2 - top);
      guide.setAttribute('stroke', draft.color);
      guide.setAttribute('stroke-width', '1.5');
      guide.setAttribute('stroke-dasharray', '6 4');
      svg.appendChild(guide);
    }
  }
  host.appendChild(svg);
}
