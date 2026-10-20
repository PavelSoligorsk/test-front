import { memo, useLayoutEffect, useRef } from 'react';
import { ImageIcon, Lock } from 'lucide-react';
import GeoGebraWidget from './GeoGebraWidget';
import MarkdownBody from './MarkdownBody';
import { smoothPath } from './geometry';
import { SELECTION_COLOR, geogebraApp } from './model';
import { boardImageSrc } from './images';
import { isSolid, shapeFigures, shapeHandle, shapeToneOpacity } from './shapes';

const HANDLE_POS = {
  nw: { left: 0, top: 0, cursor: 'nwse-resize' },
  ne: { right: 0, top: 0, cursor: 'nesw-resize' },
  sw: { left: 0, bottom: 0, cursor: 'nesw-resize' },
  se: { right: 0, bottom: 0, cursor: 'nwse-resize' },
};

const DEFAULT_FONT = { sticky: 20, shape: 18, text: 22 };
const MAX_FONT = { sticky: 28, shape: 22 };
const MIN_FONT = 10;
const CENTER_PAD = 12;

function counterShift(handle) {
  const x = handle.includes('w') ? '-50%' : '50%';
  const y = handle.includes('n') ? '-50%' : '50%';
  return { x, y };
}

function BoxHandles({ zoom }) {
  return Object.entries(HANDLE_POS).map(([handle, pos]) => {
    const shift = counterShift(handle);
    return (
      <button
        key={handle}
        type="button"
        data-handle={handle}
        aria-label="Изменить размер"
        className="absolute z-20 h-3 w-3 rounded-full border-2 bg-white"
        style={{
          left: pos.left,
          right: pos.right,
          top: pos.top,
          bottom: pos.bottom,
          cursor: pos.cursor,
          borderColor: SELECTION_COLOR,
          transform: `translate(${shift.x}, ${shift.y}) scale(${1 / zoom})`,
        }}
      />
    );
  });
}

function fitCentered(el, kind) {
  const box = el.parentElement;
  if (!box) return DEFAULT_FONT[kind];
  const limit = Math.max(16, box.clientHeight - CENTER_PAD * 2);
  let size = MAX_FONT[kind] || DEFAULT_FONT[kind];
  const measure = () => {
    el.style.height = 'auto';
    return el.scrollHeight;
  };
  el.style.fontSize = `${size}px`;
  while (measure() > limit && size > MIN_FONT) {
    size -= 1;
    el.style.fontSize = `${size}px`;
  }
  el.style.height = `${Math.min(el.scrollHeight, limit)}px`;
  return size;
}

function TextBody({ obj, editing, onChange, onBlur }) {
  const ref = useRef(null);
  const kind = obj.type;
  const centered = kind !== 'text';
  const fontSize = obj.props.fontSize || DEFAULT_FONT[kind];
  const text = obj.props.text || '';
  const tone = kind === 'text' ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-900';
  const placeholder = kind === 'sticky' ? 'Стикер' : kind === 'text' ? 'Текст' : '';

  useLayoutEffect(() => {
    const el = ref.current;
    if (!editing || !el) return;
    if (centered) fitCentered(el, kind);
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  }, [editing, centered, kind]);

  function handleChange(event) {
    const el = event.target;
    if (centered) {
      onChange(obj.id, el.value, { fontSize: fitCentered(el, kind) });
      return;
    }
    el.style.height = 'auto';
    const height = el.scrollHeight;
    el.style.height = '';
    onChange(obj.id, el.value, { height });
  }

  if (editing) {
    const textarea = (
      <textarea
        ref={ref}
        rows={1}
        value={text}
        onChange={handleChange}
        onBlur={() => onBlur(obj.id)}
        onPointerDown={(event) => event.stopPropagation()}
        placeholder={placeholder}
        className={`resize-none overflow-hidden bg-transparent leading-snug outline-none placeholder:text-zinc-500/70 ${tone} ${centered ? 'w-full p-0 text-center' : 'h-full w-full p-2'}`}
        style={{ fontSize }}
      />
    );
    if (!centered) return textarea;
    return (
      <div className="absolute inset-0 flex items-center justify-center" style={{ padding: CENTER_PAD }}>
        {textarea}
      </div>
    );
  }

  if (!text && !placeholder) return null;
  if (centered) {
    return (
      <div
        className={`absolute inset-0 flex items-center justify-center overflow-hidden whitespace-pre-wrap break-words text-center leading-snug ${tone} ${text ? '' : 'text-zinc-500/70'}`}
        style={{ fontSize, padding: CENTER_PAD }}
      >
        {text || placeholder}
      </div>
    );
  }
  return (
    <div
      className={`h-full w-full overflow-hidden whitespace-pre-wrap break-words p-2 leading-snug ${tone} ${text ? '' : 'text-zinc-500/70'}`}
      style={{ fontSize }}
    >
      {text || placeholder}
    </div>
  );
}

function shapePaint(fig, fill, stroke) {
  return {
    fill: fig.fill === 'none' ? 'none' : fill,
    stroke,
    strokeWidth: 2,
    strokeLinejoin: 'round',
    vectorEffect: 'non-scaling-stroke',
    fillOpacity: fig.fill === 'none' ? 1 : shapeToneOpacity(fig.tone),
    strokeDasharray: fig.dashed ? '4 3' : undefined,
  };
}

function ShapeBody({ obj }) {
  const fill = obj.props.fill || '#ffffff';
  const stroke = obj.props.stroke || '#18181b';
  return (
    <svg data-shape="true" className="absolute inset-0 h-full w-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
      {shapeFigures(obj.props.shape, obj.props.depth).map((fig, index) => {
        const props = shapePaint(fig, fill, stroke);
        if (fig.ellipse) return <ellipse key={index} {...fig.ellipse} {...props} />;
        if (fig.d) return <path key={index} d={fig.d} {...props} />;
        return <polygon key={index} points={fig.points} {...props} />;
      })}
    </svg>
  );
}

function BoardObject({
  obj,
  zoom,
  selected,
  handles,
  editing,
  onChangeText,
  onBlurText,
  onToggleGeo,
  onGeoReady,
  onGeoChange,
  onGeoLayout,
  onGeoControls,
}) {
  const locked = Boolean(obj.props?.locked);
  const box = obj.type === 'sticky' || obj.type === 'text' || obj.type === 'shape' || obj.type === 'geogebra' || obj.type === 'image';
  const interactiveGeo = obj.type === 'geogebra' && editing;
  const geoApp = obj.type === 'geogebra' ? geogebraApp(obj.props.appName) : null;
  const appletBase64 = obj.type === 'geogebra' ? (obj.props.ggbBase64 || '') : '';
  const imageSrc = obj.type === 'image' ? boardImageSrc(obj.props) : '';
  const markdown = obj.type === 'text' && obj.props.format === 'markdown';
  const outlineWidth = handles ? 2 : 1.5;

  return (
    <div
      data-object={obj.id}
      className="absolute"
      style={{ left: obj.x, top: obj.y, width: obj.w, height: obj.h }}
    >
      {obj.type === 'sticky' && (
        <div className="absolute inset-0 rounded-[3px] shadow-[0_2px_6px_rgba(0,0,0,0.18)]" style={{ background: obj.props.color || '#fde68a' }}>
          <TextBody obj={obj} editing={editing} onChange={onChangeText} onBlur={onBlurText} />
        </div>
      )}

      {obj.type === 'text' && (
        markdown
          ? <MarkdownBody text={obj.props.text} fontSize={obj.props.fontSize || 22} />
          : <TextBody obj={obj} editing={editing} onChange={onChangeText} onBlur={onBlurText} />
      )}

      {obj.type === 'shape' && (
        <>
          <ShapeBody obj={obj} />
          <TextBody obj={obj} editing={editing} onChange={onChangeText} onBlur={onBlurText} />
        </>
      )}

      {obj.type === 'arrow' && (
        <svg width={obj.w} height={obj.h} className="overflow-visible">
          {obj.props.head !== false && (
            <defs>
              <marker id={`arrowhead-${obj.id}`} markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
                <path d="M0,0 L7,3 L0,6 Z" fill={obj.props.color || '#18181b'} />
              </marker>
            </defs>
          )}
          <line
            x1={obj.props.x1}
            y1={obj.props.y1}
            x2={obj.props.x2}
            y2={obj.props.y2}
            stroke={obj.props.color || '#18181b'}
            strokeWidth={obj.props.width || 3}
            strokeLinecap="round"
            strokeDasharray={obj.props.dashed ? `${(obj.props.width || 3) * 2.4} ${(obj.props.width || 3) * 1.6}` : undefined}
            markerEnd={obj.props.head !== false ? `url(#arrowhead-${obj.id})` : undefined}
          />
        </svg>
      )}

      {obj.type === 'draw' && (
        <svg width={obj.w} height={obj.h} className="overflow-visible">
          <path
            d={smoothPath(obj.props.points || [])}
            fill="none"
            stroke={obj.props.color || '#18181b'}
            strokeWidth={obj.props.width || 4}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}

      {obj.type === 'image' && (
        <div className="relative h-full w-full overflow-hidden rounded-sm bg-zinc-50 dark:bg-zinc-900">
          {imageSrc ? (
            <img
              src={imageSrc}
              alt={obj.props.name || 'Изображение'}
              draggable={false}
              className="absolute inset-0 h-full w-full object-contain"
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-1 border border-dashed border-zinc-300 px-3 text-center dark:border-zinc-700">
              <ImageIcon size={22} className="text-zinc-400" />
              <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">Изображение</span>
              <span className="text-[11px] text-zinc-400">Файл появится с сервера</span>
            </div>
          )}
        </div>
      )}

      {obj.type === 'geogebra' && (
        <div className={`flex h-full flex-col overflow-visible rounded-lg border bg-white shadow-md ${interactiveGeo ? 'border-blue-500' : 'border-zinc-200'}`}>
          <div data-chrome="true" className="flex h-9 shrink-0 items-center justify-between gap-2 border-b border-zinc-200 bg-zinc-50 px-2.5">
            <span className="truncate text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
              {geoApp?.title || 'Планиметрия'}
            </span>
            {!locked && (
              <button
                type="button"
                data-chrome="true"
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.stopPropagation();
                  onToggleGeo(obj.id);
                }}
                className={`rounded-md px-2 py-1 text-[11px] font-semibold ${interactiveGeo ? 'bg-blue-600 text-white' : 'bg-zinc-900 text-white'}`}
              >
                {interactiveGeo ? 'Двигать' : 'Чертить'}
              </button>
            )}
          </div>
          <div className="min-h-0 flex-1">
            <GeoGebraWidget
              appletId={`ggb${obj.id.replace(/-/g, '')}`}
              appName={geoApp?.id || 'geometry'}
              width={Math.max(40, Math.round(obj.w - 2))}
              height={Math.max(40, Math.round(obj.h - 38))}
              ggbBase64={appletBase64}
              ggbXml={obj.props.ggbXml || ''}
              ggbPerspective={obj.props.ggbPerspective || ''}
              ggbView={obj.props.ggbView || null}
              ggbLayout={obj.props.ggbLayout || ''}
              setup={obj.props.setup || ''}
              controls={obj.props.controls || []}
              texts={obj.props.texts || []}
              interactive={interactiveGeo}
              onReady={(api) => onGeoReady(obj.id, api)}
              onConstructionChange={() => onGeoChange(obj.id)}
              onLayoutChange={() => onGeoLayout?.(obj.id)}
              onControls={locked ? undefined : (controls) => onGeoControls?.(obj.id, controls)}
            />
          </div>
        </div>
      )}

      {selected && obj.type !== 'arrow' && obj.type !== 'draw' && (
        <div
          data-outline={outlineWidth}
          className="pointer-events-none absolute inset-0"
          style={{
            outline: `${outlineWidth / zoom}px solid ${interactiveGeo ? '#2563eb' : SELECTION_COLOR}`,
          }}
        />
      )}

      {selected && obj.type === 'draw' && (
        <div
          data-outline={1}
          className="pointer-events-none absolute inset-0 rounded-sm"
          style={{ outline: `${1 / zoom}px dashed ${SELECTION_COLOR}` }}
        />
      )}

      {selected && handles && box && !interactiveGeo && !locked && <BoxHandles zoom={zoom} />}

      {selected && handles && !locked && obj.type === 'shape' && isSolid(obj.props.shape) && (
        <span
          data-handle="depth"
          aria-label="Глубина"
          title="Глубина"
          className="absolute z-30 h-3 w-3 border-2 border-amber-600 bg-amber-400"
          style={{
            left: `${shapeHandle(obj.props.shape, obj.props.depth).x}%`,
            top: `${shapeHandle(obj.props.shape, obj.props.depth).y}%`,
            transform: `translate(-50%, -50%) rotate(45deg) scale(${1 / zoom})`,
            cursor: 'grab',
          }}
        />
      )}

      {selected && handles && !locked && obj.type === 'arrow' && (
        <>
          <span
            data-handle="start"
            className="absolute z-20 h-3 w-3 rounded-full border-2 bg-white"
            style={{
              left: obj.props.x1,
              top: obj.props.y1,
              borderColor: SELECTION_COLOR,
              transform: `translate(-50%, -50%) scale(${1 / zoom})`,
              cursor: 'crosshair',
            }}
          />
          <span
            data-handle="end"
            className="absolute z-20 h-3 w-3 rounded-full border-2 bg-white"
            style={{
              left: obj.props.x2,
              top: obj.props.y2,
              borderColor: SELECTION_COLOR,
              transform: `translate(-50%, -50%) scale(${1 / zoom})`,
              cursor: 'crosshair',
            }}
          />
        </>
      )}

      {selected && locked && (
        <span
          data-counter-scale="true"
          className="pointer-events-none absolute bottom-full right-0 mb-1 inline-flex items-center gap-1 rounded-md bg-zinc-900 px-1.5 py-0.5 text-[10px] font-semibold text-white"
          style={{ transform: `scale(${1 / zoom})`, transformOrigin: 'bottom right' }}
        >
          <Lock size={10} />
          Закреплено
        </span>
      )}
    </div>
  );
}

export default memo(BoardObject, (prev, next) => (
  prev.obj === next.obj
  && prev.selected === next.selected
  && prev.handles === next.handles
  && prev.editing === next.editing
));
