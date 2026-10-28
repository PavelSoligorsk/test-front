import { X } from 'lucide-react';
import { SURFACE_COLORS } from '../meta';

export default function SurfacePanel({ surface, onChange, onClose }) {
  const grids = [
    { id: 'empty', label: 'Пустой' },
    { id: 'cell', label: 'Клетка' },
    { id: 'rule', label: 'Линейка' },
  ];
  return (
    <div className="fixed inset-x-3 top-16 z-50 max-h-[calc(100dvh-9rem)] overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-4 shadow-lg min-[720px]:absolute min-[720px]:inset-x-auto min-[720px]:right-0 min-[720px]:top-11 min-[720px]:max-h-none min-[720px]:w-[22rem] dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Фон и сетка</p>
        <button type="button" aria-label="Закрыть" onClick={onClose} className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900">
          <X size={16} />
        </button>
      </div>
      <p className="mb-2 text-sm text-zinc-500">Цвет фона</p>
      <div className="mb-4 flex flex-wrap gap-2">
        {SURFACE_COLORS.map((color) => (
          <button
            key={color}
            type="button"
            aria-label={color}
            onClick={() => onChange({ ...surface, color })}
            className={`h-9 w-9 rounded-xl border ${surface.color === color ? 'border-sky-500 ring-2 ring-sky-200' : 'border-zinc-200 dark:border-zinc-700'}`}
            style={{ background: color }}
          />
        ))}
      </div>
      <p className="mb-2 text-sm text-zinc-500">Тип сетки</p>
      <div className="mb-3 grid grid-cols-3 gap-2">
        {grids.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onChange({ ...surface, grid: item.id })}
            className={`rounded-xl border px-2 py-2 text-xs font-medium ${surface.grid === item.id ? 'border-sky-500 bg-sky-50 text-sky-900' : 'border-zinc-200 text-zinc-600 dark:border-zinc-700 dark:text-zinc-300'}`}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div
        className="h-28 rounded-xl border border-zinc-200"
        style={{
          backgroundColor: surface.color,
          backgroundImage: surface.grid === 'cell'
            ? 'linear-gradient(to right, rgba(120,132,148,0.45) 1px, transparent 1px), linear-gradient(to bottom, rgba(120,132,148,0.45) 1px, transparent 1px)'
            : surface.grid === 'rule'
              ? 'linear-gradient(to bottom, transparent 15px, rgba(120,132,148,0.45) 15px)'
              : 'none',
          backgroundSize: surface.grid === 'rule' ? '100% 16px' : '20px 20px',
        }}
      />
    </div>
  );
}
