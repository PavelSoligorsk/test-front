import { memo } from 'react';
import { ImageIcon } from 'lucide-react';
import GeoGebraWidget from './GeoGebraWidget';
import { geogebraTemplate } from './model';

const HANDLE_POS = {
  nw: { left: 0, top: 0, cursor: 'nwse-resize' },
  ne: { right: 0, top: 0, cursor: 'nesw-resize' },
  sw: { left: 0, bottom: 0, cursor: 'nesw-resize' },
  se: { right: 0, bottom: 0, cursor: 'nwse-resize' },
};

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
        className="absolute z-20 h-2.5 w-2.5 rounded-[3px] border-2 border-zinc-900 bg-white dark:border-white dark:bg-zinc-950"
        style={{
          left: pos.left,
          right: pos.right,
          top: pos.top,
          bottom: pos.bottom,
          cursor: pos.cursor,
          transform: `translate(${shift.x}, ${shift.y}) scale(${1 / zoom})`,
        }}
      />
    );
  });
}

function TextBody({ obj, editing, onChange, onBlur }) {
  const isSticky = obj.type === 'sticky';
  const placeholder = isSticky ? 'Стикер' : 'Текст';
  const fontSize = obj.props.fontSize || (isSticky ? 15 : 22);
  if (editing) {
    return (
      <textarea
        autoFocus
        value={obj.props.text || ''}
        onChange={(event) => onChange(obj.id, event.target.value)}
        onBlur={() => onBlur(obj.id)}
        onPointerDown={(event) => event.stopPropagation()}
        placeholder={placeholder}
        className={`h-full w-full resize-none bg-transparent p-3 outline-none ${isSticky ? 'text-zinc-900' : 'text-zinc-900 dark:text-zinc-100'}`}
        style={{ fontSize }}
      />
    );
  }
  const text = obj.props.text || '';
  return (
    <div
      className={`h-full w-full overflow-hidden whitespace-pre-wrap break-words p-3 ${isSticky ? 'text-zinc-900' : 'text-zinc-900 dark:text-zinc-100'} ${text ? '' : 'text-zinc-500/80'}`}
      style={{ fontSize }}
    >
      {text || placeholder}
    </div>
  );
}

function BoardObject({
  obj,
  zoom,
  selected,
  editing,
  onChangeText,
  onBlurText,
  onToggleGeo,
  onGeoReady,
  onGeoChange,
  geoEpoch,
  templateBase64 = '',
  templateFailed = false,
}) {
  const box = obj.type === 'sticky' || obj.type === 'text' || obj.type === 'shape' || obj.type === 'geogebra' || obj.type === 'image';
  const interactiveGeo = obj.type === 'geogebra' && editing;
  const template = obj.type === 'geogebra' && obj.props.templateId
    ? (geogebraTemplate(obj.props.templateId) || {
      id: obj.props.templateId,
      title: obj.props.templateTitle || obj.props.templateId,
    })
    : null;
  const savedBase64 = obj.type === 'geogebra' ? (obj.props.ggbBase64 || '') : '';
  const waitingTemplate = Boolean(template && !savedBase64 && !templateBase64 && !templateFailed);
  const failedTemplate = Boolean(template && !savedBase64 && !templateBase64 && templateFailed);
  const appletBase64 = savedBase64 || templateBase64;

  return (
    <div
      data-object={obj.id}
      className="absolute"
      style={{ left: obj.x, top: obj.y, width: obj.w, height: obj.h }}
    >
      {obj.type === 'sticky' && (
        <div className="h-full w-full rounded-md shadow-md" style={{ background: obj.props.color || '#fde68a' }}>
          <TextBody obj={obj} editing={editing} onChange={onChangeText} onBlur={onBlurText} />
        </div>
      )}

      {obj.type === 'text' && (
        <TextBody obj={obj} editing={editing} onChange={onChangeText} onBlur={onBlurText} />
      )}

      {obj.type === 'shape' && (
        <div
          className="h-full w-full"
          style={{
            background: obj.props.fill || '#ffffff',
            border: `2px solid ${obj.props.stroke || '#18181b'}`,
            borderRadius: obj.props.shape === 'ellipse' ? '999px' : '12px',
          }}
        />
      )}

      {obj.type === 'arrow' && (
        <svg width={obj.w} height={obj.h} className="overflow-visible">
          <defs>
            <marker id={`arrowhead-${obj.id}`} markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
              <path d="M0,0 L7,3 L0,6 Z" fill={obj.props.color || '#18181b'} />
            </marker>
          </defs>
          <line
            x1={obj.props.x1}
            y1={obj.props.y1}
            x2={obj.props.x2}
            y2={obj.props.y2}
            stroke={obj.props.color || '#18181b'}
            strokeWidth={obj.props.width || 3}
            markerEnd={`url(#arrowhead-${obj.id})`}
          />
        </svg>
      )}

      {obj.type === 'draw' && (
        <svg width={obj.w} height={obj.h} className="overflow-visible">
          <polyline
            points={(obj.props.points || []).map((point) => `${point.x},${point.y}`).join(' ')}
            fill="none"
            stroke={obj.props.color || '#18181b'}
            strokeWidth={obj.props.width || 4}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}

      {obj.type === 'image' && (
        <div className="flex h-full flex-col overflow-hidden rounded-xl border border-dashed border-zinc-300 bg-zinc-50 shadow-md dark:border-zinc-700 dark:bg-zinc-900">
          {obj.props.src ? (
            <img src={obj.props.src} alt={obj.props.name || 'Изображение'} className="h-full w-full object-contain" />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-1 px-3 text-center">
              <ImageIcon size={22} className="text-zinc-400" />
              <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">Изображение</span>
              <span className="text-[11px] text-zinc-400">Файл появится с сервера</span>
            </div>
          )}
        </div>
      )}

      {obj.type === 'geogebra' && (
        <div className={`flex h-full flex-col overflow-hidden rounded-xl border bg-white shadow-md ${interactiveGeo ? 'border-blue-500' : 'border-zinc-200'}`}>
          <div data-chrome="true" className="flex h-9 shrink-0 items-center justify-between gap-2 border-b border-zinc-200 bg-zinc-50 px-2.5">
            <span className="truncate text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
              {template ? template.title : `GeoGebra · ${obj.props.appName === 'graphing' ? 'Графики' : 'Геометрия'}`}
            </span>
            {!waitingTemplate && !failedTemplate && (
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
            {waitingTemplate ? (
              <div className="grid h-full place-items-center bg-white px-4 text-center text-xs font-medium text-zinc-400">
                Загрузка шаблона…
              </div>
            ) : failedTemplate ? (
              <div className="flex h-full flex-col items-center justify-center gap-1 bg-white px-4 text-center">
                <span className="text-sm font-semibold text-zinc-800">{template.title}</span>
                <span className="text-[11px] text-zinc-500">Шаблон не загрузился</span>
              </div>
            ) : (
              <GeoGebraWidget
                key={`${obj.id}-${geoEpoch}`}
                appletId={`ggb${obj.id.replace(/-/g, '')}`}
                appName={obj.props.appName}
                width={Math.max(200, obj.w - 2)}
                height={Math.max(160, obj.h - 38)}
                ggbBase64={appletBase64}
                interactive={interactiveGeo}
                onReady={(api) => onGeoReady(obj.id, api)}
                onConstructionChange={() => onGeoChange(obj.id)}
              />
            )}
          </div>
        </div>
      )}

      {selected && (
        <div className={`pointer-events-none absolute inset-0 ${interactiveGeo ? 'outline outline-2 outline-blue-500' : 'outline outline-2 outline-zinc-900 dark:outline-zinc-100'}`} />
      )}

      {selected && box && !interactiveGeo && <BoxHandles zoom={zoom} />}

      {selected && obj.type === 'arrow' && (
        <>
          <span
            data-handle="start"
            className="absolute z-20 h-3 w-3 rounded-full border-2 border-zinc-900 bg-white dark:border-white dark:bg-zinc-950"
            style={{
              left: obj.props.x1,
              top: obj.props.y1,
              transform: `translate(-50%, -50%) scale(${1 / zoom})`,
              cursor: 'crosshair',
            }}
          />
          <span
            data-handle="end"
            className="absolute z-20 h-3 w-3 rounded-full border-2 border-zinc-900 bg-white dark:border-white dark:bg-zinc-950"
            style={{
              left: obj.props.x2,
              top: obj.props.y2,
              transform: `translate(-50%, -50%) scale(${1 / zoom})`,
              cursor: 'crosshair',
            }}
          />
        </>
      )}
    </div>
  );
}

export default memo(BoardObject, (prev, next) => (
  prev.obj === next.obj
  && prev.selected === next.selected
  && prev.editing === next.editing
  && prev.geoEpoch === next.geoEpoch
  && prev.templateBase64 === next.templateBase64
  && prev.templateFailed === next.templateFailed
));

export function DraftShape({ draft }) {
  if (!draft) return null;
  if (draft.kind === 'shape') {
    return (
      <div
        className="pointer-events-none absolute"
        style={{
          left: draft.x,
          top: draft.y,
          width: draft.w,
          height: draft.h,
          background: draft.fill,
          border: `2px solid ${draft.stroke}`,
          borderRadius: draft.shape === 'ellipse' ? '999px' : '12px',
          opacity: 0.85,
        }}
      />
    );
  }
  if (draft.kind === 'arrow') {
    const left = Math.min(draft.x1, draft.x2);
    const top = Math.min(draft.y1, draft.y2);
    const width = Math.max(Math.abs(draft.x2 - draft.x1), 1);
    const height = Math.max(Math.abs(draft.y2 - draft.y1), 1);
    return (
      <svg className="pointer-events-none absolute overflow-visible" style={{ left, top, width, height }}>
        <line
          x1={draft.x1 - left}
          y1={draft.y1 - top}
          x2={draft.x2 - left}
          y2={draft.y2 - top}
          stroke={draft.color}
          strokeWidth={draft.width}
        />
      </svg>
    );
  }
  if (draft.kind === 'pen' && draft.points.length) {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    draft.points.forEach((point) => {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
    });
    const pad = draft.width + 4;
    const left = minX - pad;
    const top = minY - pad;
    return (
      <svg
        className="pointer-events-none absolute overflow-visible"
        style={{ left, top, width: Math.max(maxX - minX + pad * 2, 1), height: Math.max(maxY - minY + pad * 2, 1) }}
      >
        <polyline
          points={draft.points.map((point) => `${point.x - left},${point.y - top}`).join(' ')}
          fill="none"
          stroke={draft.color}
          strokeWidth={draft.width}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return null;
}
