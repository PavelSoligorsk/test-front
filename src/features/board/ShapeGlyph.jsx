import { shapeFigures, shapeToneOpacity } from './shapes';

export default function ShapeGlyph({ id, size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true" className="overflow-visible">
      {shapeFigures(id).map((fig, index) => {
        const props = {
          fill: 'currentColor',
          stroke: 'currentColor',
          strokeWidth: 6,
          strokeLinejoin: 'round',
          opacity: shapeToneOpacity(fig.tone),
        };
        if (fig.ellipse) return <ellipse key={index} {...fig.ellipse} {...props} />;
        if (fig.d) return <path key={index} d={fig.d} {...props} />;
        return <polygon key={index} points={fig.points} {...props} />;
      })}
    </svg>
  );
}
