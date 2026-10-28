import { GEOGEBRA_APPS, PEN_COLORS, PEN_WIDTHS, SHAPE_FILLS, STICKY_COLORS, TEXT_SIZES } from '../model';
import { SHAPE_GROUPS } from '../shapes';
import ShapeGlyph from '../ShapeGlyph';
import { LASER_COLORS, LASER_WIDTHS } from '../constants';

export default function StyleTray({ context, style, onStyle }) {
  if (context === 'sticky') {
    return (
      <SwatchCard label="Цвет стикера">
        <div className="flex flex-wrap gap-1.5">
          {STICKY_COLORS.map((color) => (
            <ColorDot
              key={color.id}
              color={color.bg}
              label={color.label}
              active={style.sticky === color.bg}
              onClick={() => onStyle((prev) => ({ ...prev, sticky: color.bg }))}
            />
          ))}
        </div>
      </SwatchCard>
    );
  }

  if (context === 'text') {
    return (
      <SwatchCard label="Текст">
        <div className="flex gap-1">
          {TEXT_SIZES.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onStyle((prev) => ({ ...prev, textSize: item.size }))}
              className={`h-7 min-w-7 rounded-lg px-1.5 text-[11px] font-semibold ${style.textSize === item.size ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950' : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300'}`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </SwatchCard>
    );
  }

  if (context === 'laser') {
    return (
      <SwatchCard label="Указка">
        <div className="flex flex-wrap gap-1.5">
          {LASER_COLORS.map((color) => (
            <ColorDot
              key={color}
              color={color}
              label={color}
              active={style.laserColor === color}
              onClick={() => onStyle((prev) => ({ ...prev, laserColor: color }))}
            />
          ))}
        </div>
        <div className="mt-2 flex gap-1">
          {LASER_WIDTHS.map((width) => (
            <button
              key={width}
              type="button"
              onClick={() => onStyle((prev) => ({ ...prev, laserWidth: width }))}
              className={`h-7 min-w-7 rounded-lg px-1.5 text-[11px] font-semibold ${style.laserWidth === width ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950' : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300'}`}
            >
              {width}
            </button>
          ))}
        </div>
      </SwatchCard>
    );
  }

  if (context === 'pen' || context === 'eraser') {
    return (
      <SwatchCard label={context === 'eraser' ? 'Ластик стирает штрихи кисти' : 'Кисть'}>
        {context === 'pen' && (
          <>
            <div className="flex flex-wrap gap-1.5">
              {PEN_COLORS.map((color) => (
                <ColorDot
                  key={color}
                  color={color}
                  label={color}
                  active={style.pen === color}
                  onClick={() => onStyle((prev) => ({ ...prev, pen: color }))}
                />
              ))}
            </div>
            <div className="mt-2 flex gap-1">
              {PEN_WIDTHS.map((width) => (
                <button
                  key={width}
                  type="button"
                  onClick={() => onStyle((prev) => ({ ...prev, penWidth: width }))}
                  className={`h-7 min-w-7 rounded-lg px-1.5 text-[11px] font-semibold ${style.penWidth === width ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950' : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300'}`}
                >
                  {width}
                </button>
              ))}
            </div>
          </>
        )}
      </SwatchCard>
    );
  }

  if (context === 'shape') {
    return (
      <SwatchCard label="Стереометрия" wide>
        <div className="max-h-64 space-y-2 overflow-y-auto">
          {SHAPE_GROUPS.map((group) => (
            <div key={group.id}>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">{group.label}</p>
              <div className="grid grid-cols-5 gap-1">
                {group.kinds.map((kind) => (
                  <button
                    key={kind.id}
                    type="button"
                    aria-label={kind.label}
                    title={kind.label}
                    onClick={() => onStyle((prev) => ({ ...prev, shape: kind.id }))}
                    className={`flex h-7 w-7 items-center justify-center rounded-lg ${style.shape === kind.id ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950' : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-900'}`}
                  >
                    <ShapeGlyph id={kind.id} size={16} />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {SHAPE_FILLS.map((fill) => (
            <ColorDot
              key={fill.id}
              color={fill.fill}
              label={fill.label}
              active={style.fill.fill === fill.fill}
              onClick={() => onStyle((prev) => ({ ...prev, fill }))}
            />
          ))}
        </div>
      </SwatchCard>
    );
  }

  if (context === 'arrow') {
    return (
      <SwatchCard label="Отрезок">
        <div className="flex flex-wrap gap-1.5">
          {PEN_COLORS.map((color) => (
            <ColorDot
              key={color}
              color={color}
              label={color}
              active={style.arrow === color}
              onClick={() => onStyle((prev) => ({ ...prev, arrow: color }))}
            />
          ))}
        </div>
      </SwatchCard>
    );
  }

  if (context === 'image') {
    return (
      <SwatchCard label="Изображение" wide>
        <p className="text-[11px] leading-snug text-zinc-500">
          Клик по доске открывает файл. Ещё можно вставить картинку через Ctrl+V или перетащить её на холст.
        </p>
      </SwatchCard>
    );
  }

  if (context === 'geogebra') {
    return (
      <SwatchCard label="GeoGebra" wide>
        <div className="flex flex-col gap-1">
          {GEOGEBRA_APPS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onStyle((prev) => ({ ...prev, appName: item.id }))}
              className={`rounded-lg px-2 py-1.5 text-left text-xs font-medium ${style.appName === item.id ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950' : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-200'}`}
            >
              {item.title}
            </button>
          ))}
        </div>
      </SwatchCard>
    );
  }

  return null;
}

function SwatchCard({ label, children, wide = false }) {
  return (
    <div className={`${wide ? 'w-[min(100vw-1.5rem,18rem)]' : 'w-[min(100vw-1.5rem,15rem)]'} max-h-[38vh] overflow-y-auto rounded-2xl border border-zinc-200/80 bg-white/95 p-2.5 shadow-sm min-[720px]:max-h-none ${wide ? 'min-[720px]:w-56' : 'min-[720px]:w-40'} dark:border-zinc-800 dark:bg-zinc-950/95`}>
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">{label}</p>
      {children}
    </div>
  );
}

function ColorDot({ color, label, active, onClick }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`h-5 w-5 rounded-full border ${active ? 'ring-2 ring-zinc-900 ring-offset-2 ring-offset-white dark:ring-white dark:ring-offset-zinc-950' : 'border-zinc-300 dark:border-zinc-700'}`}
      style={color === 'none'
        ? { background: 'linear-gradient(135deg, transparent 46%, currentColor 46%, currentColor 54%, transparent 54%)' }
        : { background: color }}
    />
  );
}
