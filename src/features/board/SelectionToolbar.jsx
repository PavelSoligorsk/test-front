import {
  BringToFront,
  Circle,
  Copy,
  Diamond,
  Lock,
  LockOpen,
  SendToBack,
  Square,
  Trash2,
  Triangle,
} from 'lucide-react';
import { PEN_COLORS, PEN_WIDTHS, SHAPE_FILLS, SHAPE_KINDS, STICKY_COLORS, TEXT_SIZES } from './model';

const SHAPE_ICONS = { rect: Square, ellipse: Circle, triangle: Triangle, diamond: Diamond };

function Divider() {
  return <span className="mx-1 h-5 w-px shrink-0 bg-zinc-200 dark:bg-zinc-700" />;
}

function ToolButton({ label, onClick, active = false, danger = false, children }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={`inline-flex h-8 min-w-8 shrink-0 items-center justify-center rounded-lg px-1.5 text-xs font-semibold transition-colors ${
        active
          ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950'
          : danger
            ? 'text-zinc-600 hover:bg-red-50 hover:text-red-600 dark:text-zinc-300 dark:hover:bg-red-950/40'
            : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800'
      }`}
    >
      {children}
    </button>
  );
}

function Swatch({ color, label, active, onClick }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className="inline-flex h-8 w-7 shrink-0 items-center justify-center rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
    >
      <span
        className={`h-5 w-5 rounded-full border ${active ? 'ring-2 ring-[#4262ff] ring-offset-1 ring-offset-white dark:ring-offset-zinc-900' : 'border-black/10'}`}
        style={{ background: color }}
      />
    </button>
  );
}

export default function SelectionToolbar({
  objects,
  canLock,
  geoEditing,
  onPatch,
  onDuplicate,
  onDelete,
  onFront,
  onBack,
  onToggleLock,
  onToggleGeo,
}) {
  if (!objects.length) return null;
  const first = objects[0];
  const locked = objects.some((obj) => obj.props?.locked);
  const types = new Set(objects.map((obj) => obj.type));
  const only = types.size === 1 ? first.type : null;

  if (locked) {
    return (
      <div className="flex items-center gap-0.5 rounded-xl border border-zinc-200 bg-white px-1.5 py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
        {canLock ? (
          <ToolButton label="Открепить (Ctrl+Shift+L)" onClick={onToggleLock}>
            <LockOpen size={15} />
            <span className="ml-1">Открепить</span>
          </ToolButton>
        ) : (
          <span className="inline-flex h-8 items-center gap-1.5 px-2 text-xs font-medium text-zinc-500">
            <Lock size={13} />
            Закрепил учитель
          </span>
        )}
      </div>
    );
  }

  let specific = null;
  if (only === 'sticky') {
    specific = STICKY_COLORS.map((color) => (
      <Swatch
        key={color.id}
        color={color.bg}
        label={color.label}
        active={first.props.color === color.bg}
        onClick={() => onPatch('sticky', { color: color.bg })}
      />
    ));
  } else if (only === 'shape') {
    specific = (
      <>
        {SHAPE_KINDS.map((kind) => {
          const Icon = SHAPE_ICONS[kind.id];
          return (
            <ToolButton
              key={kind.id}
              label={kind.label}
              active={(first.props.shape || 'rect') === kind.id}
              onClick={() => onPatch('shape', { shape: kind.id })}
            >
              <Icon size={15} />
            </ToolButton>
          );
        })}
        <Divider />
        {SHAPE_FILLS.map((fill) => (
          <Swatch
            key={fill.id}
            color={fill.fill}
            label={fill.label}
            active={first.props.fill === fill.fill}
            onClick={() => onPatch('shape', { fill: fill.fill, stroke: fill.stroke })}
          />
        ))}
      </>
    );
  } else if (only === 'draw' || only === 'arrow') {
    specific = (
      <>
        {PEN_COLORS.map((color) => (
          <Swatch
            key={color}
            color={color}
            label={color}
            active={first.props.color === color}
            onClick={() => onPatch(only, { color })}
          />
        ))}
        <Divider />
        {PEN_WIDTHS.map((width) => (
          <ToolButton
            key={width}
            label={`Толщина ${width}`}
            active={(first.props.width || 4) === width}
            onClick={() => onPatch(only, { width })}
          >
            <span className="block rounded-full bg-current" style={{ width: 14, height: Math.max(2, width / 1.5) }} />
          </ToolButton>
        ))}
      </>
    );
  } else if (only === 'text') {
    specific = TEXT_SIZES.map((item) => (
      <ToolButton
        key={item.id}
        label={`Размер ${item.label}`}
        active={(first.props.fontSize || 22) === item.size}
        onClick={() => onPatch('text', { fontSize: item.size })}
      >
        {item.label}
      </ToolButton>
    ));
  } else if (only === 'geogebra' && objects.length === 1) {
    specific = (
      <ToolButton label={geoEditing ? 'Двигать объект' : 'Чертить внутри'} active={geoEditing} onClick={onToggleGeo}>
        <span className="px-1">{geoEditing ? 'Двигать' : 'Чертить внутри'}</span>
      </ToolButton>
    );
  }

  return (
    <div className="flex max-w-[calc(100vw-1rem)] items-center gap-0.5 overflow-x-auto rounded-xl border border-zinc-200 bg-white px-1.5 py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
      {specific}
      {specific && <Divider />}
      <ToolButton label="На передний план (PageUp)" onClick={onFront}><BringToFront size={15} /></ToolButton>
      <ToolButton label="На задний план (PageDown)" onClick={onBack}><SendToBack size={15} /></ToolButton>
      <ToolButton label="Дублировать (Ctrl+D)" onClick={onDuplicate}><Copy size={15} /></ToolButton>
      {canLock && <ToolButton label="Закрепить (Ctrl+Shift+L)" onClick={onToggleLock}><Lock size={15} /></ToolButton>}
      <ToolButton label="Удалить (Delete)" onClick={onDelete} danger><Trash2 size={15} /></ToolButton>
    </div>
  );
}
