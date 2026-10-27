import { figureReactProps, figureTag, shapeFigures } from './shapes';

const GLYPH_PAINT = {
  fill: 'currentColor',
  stroke: 'currentColor',
  strokeWidth: 6,
  dash: '7 5',
  tone: 'whole',
  scaling: true,
};

export default function ShapeGlyph({ id, size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true" className="overflow-visible">
      {shapeFigures(id).map((fig, index) => {
        const Tag = figureTag(fig);
        return <Tag key={index} {...figureReactProps(fig, GLYPH_PAINT)} />;
      })}
    </svg>
  );
}
