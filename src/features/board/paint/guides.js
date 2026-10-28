// Направляющие прилипания при перемещении: линии толщиной в один экранный пиксель.

export function paintGuides(host, guides, zoom) {
  if (!host) return;
  host.replaceChildren();
  if (!guides?.length) return;
  const thickness = 1 / zoom;
  guides.forEach((guide) => {
    const line = document.createElement('div');
    line.className = 'pointer-events-none absolute';
    line.style.background = '#f43f5e';
    if (guide.axis === 'x') {
      line.style.left = `${guide.at - thickness / 2}px`;
      line.style.top = `${guide.from}px`;
      line.style.width = `${thickness}px`;
      line.style.height = `${guide.to - guide.from}px`;
    } else {
      line.style.left = `${guide.from}px`;
      line.style.top = `${guide.at - thickness / 2}px`;
      line.style.width = `${guide.to - guide.from}px`;
      line.style.height = `${thickness}px`;
    }
    host.appendChild(line);
  });
}
