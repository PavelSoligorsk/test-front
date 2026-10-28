import { shapeToneOpacity } from './kinds';

// Одна точка, где фигура из shapeFigures превращается в SVG: для React (ShapeBody,
// ShapeGlyph) и для прямой отрисовки в DOM (черновик при рисовании).

const SVG_NS = 'http://www.w3.org/2000/svg';

export function figureTag(fig) {
  if (fig.ellipse) return 'ellipse';
  return fig.d ? 'path' : 'polygon';
}

function figureGeometry(fig) {
  if (fig.ellipse) return fig.ellipse;
  return fig.d ? { d: fig.d } : { points: fig.points };
}

/**
 * Атрибуты фигуры в именах SVG. paint: fill, stroke, dashed, strokeWidth, dash,
 * tone ('fill' — прозрачность заливки по грани, 'whole' — всей фигуры), scaling.
 */
export function figureAttributes(fig, {
  fill,
  stroke,
  dashed = false,
  strokeWidth = 2,
  dash = '4 3',
  tone = 'fill',
  scaling = false,
}) {
  const filled = fig.fill !== 'none';
  const attrs = {
    ...figureGeometry(fig),
    fill: filled ? fill : 'none',
    stroke: fig.stroke === 'none' ? 'none' : stroke,
    'stroke-width': strokeWidth,
    'stroke-linejoin': 'round',
  };
  if (!scaling) attrs['vector-effect'] = 'non-scaling-stroke';
  if (tone === 'whole') attrs.opacity = shapeToneOpacity(fig.tone);
  else if (filled) attrs['fill-opacity'] = shapeToneOpacity(fig.tone);
  if (fig.dashed || dashed) attrs['stroke-dasharray'] = dash;
  return attrs;
}

const REACT_NAMES = {
  'stroke-width': 'strokeWidth',
  'stroke-linejoin': 'strokeLinejoin',
  'vector-effect': 'vectorEffect',
  'fill-opacity': 'fillOpacity',
  'stroke-dasharray': 'strokeDasharray',
};

export function figureReactProps(fig, paint) {
  const attrs = figureAttributes(fig, paint);
  return Object.fromEntries(Object.entries(attrs).map(([key, value]) => [REACT_NAMES[key] || key, value]));
}

export function appendFigures(svg, figures, paint) {
  figures.forEach((fig) => {
    const node = document.createElementNS(SVG_NS, figureTag(fig));
    Object.entries(figureAttributes(fig, paint)).forEach(([key, value]) => node.setAttribute(key, String(value)));
    svg.appendChild(node);
  });
}
