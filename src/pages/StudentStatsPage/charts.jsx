const PIE_LIGHT = ['#18181b', '#3f3f46', '#52525b', '#71717a', '#a1a1aa', '#d4d4d8'];
const PIE_DARK = ['#fafafa', '#d4d4d8', '#a1a1aa', '#71717a', '#52525b', '#3f3f46'];

function polar(cx, cy, r, angleDeg) {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

function slicePath(cx, cy, r, start, end) {
  const sweep = end - start;
  if (sweep >= 359.99) {
    return `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx} ${cy + r} A ${r} ${r} 0 1 1 ${cx} ${cy - r} Z`;
  }
  const s = polar(cx, cy, r, start);
  const e = polar(cx, cy, r, end);
  const large = sweep > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y} Z`;
}

export function Donut({ percent, dark, label, sub }) {
  const size = 168;
  const stroke = 14;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.min(100, Math.max(0, percent || 0));
  const ink = dark ? '#f4f4f5' : '#18181b';
  const track = dark ? '#27272a' : '#e4e4e7';

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={ink}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (p / 100) * c}
          className="transition-[stroke-dashoffset] duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-3xl font-semibold tracking-tight tabular-nums text-zinc-900 dark:text-zinc-100">
          {p.toFixed(1)}%
        </span>
        {label ? <span className="text-xs text-zinc-500 mt-0.5">{label}</span> : null}
        {sub ? <span className="text-[11px] text-zinc-400 mt-0.5">{sub}</span> : null}
      </div>
    </div>
  );
}

export function Pie({ slices, dark, title }) {
  const palette = dark ? PIE_DARK : PIE_LIGHT;
  const total = slices.reduce((s, x) => s + x.value, 0);
  const cx = 80;
  const cy = 80;
  const r = 72;
  let angle = 0;
  const paths = total <= 0
    ? []
    : slices.map((slice, i) => {
        const sweep = (slice.value / total) * 360;
        const start = angle;
        const end = angle + sweep;
        angle = end;
        return { ...slice, d: slicePath(cx, cy, r, start, end), color: palette[i % palette.length] };
      });

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      <svg width="160" height="160" viewBox="0 0 160 160" role="img" aria-label={title}>
        {paths.length === 0 ? (
          <circle cx={cx} cy={cy} r={r} className="fill-zinc-100 dark:fill-zinc-800" />
        ) : (
          paths.map((p) => (
            <path key={p.id} d={p.d} fill={p.color}>
              <title>{`${p.label}: ${p.value}`}</title>
            </path>
          ))
        )}
      </svg>
      <ul className="w-full space-y-2 min-w-0">
        {slices.map((slice, i) => {
          const share = total > 0 ? Math.round((slice.value / total) * 100) : 0;
          return (
            <li key={slice.id} className="flex items-center gap-2.5 text-sm min-w-0">
              <span
                className="w-2.5 h-2.5 rounded-sm shrink-0"
                style={{ background: palette[i % palette.length] }}
              />
              <span className="truncate text-zinc-700 dark:text-zinc-300">{slice.label}</span>
              <span className="ml-auto tabular-nums text-zinc-500 shrink-0">{share}%</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function Bars({ items, dark }) {
  const ink = dark ? '#f4f4f5' : '#18181b';
  const track = dark ? '#27272a' : '#f4f4f5';
  const grid = dark ? '#27272a' : '#e4e4e7';
  const muted = dark ? '#71717a' : '#a1a1aa';
  const w = 420;
  const h = 200;
  const pad = { t: 24, r: 8, b: 28, l: 28 };
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;
  const gap = 12;
  const barW = (innerW - gap * (items.length - 1)) / items.length;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-48" role="img" aria-label="Успех по уровням сложности">
      {[0, 25, 50, 75, 100].map((tick) => {
        const y = pad.t + innerH - (tick / 100) * innerH;
        return (
          <g key={tick}>
            <line x1={pad.l} x2={w - pad.r} y1={y} y2={y} stroke={grid} strokeWidth="1" />
            <text x={pad.l - 6} y={y + 3} textAnchor="end" fontSize="10" fill={muted}>
              {tick}
            </text>
          </g>
        );
      })}
      {items.map((item, i) => {
        const x = pad.l + i * (barW + gap);
        const value = item.empty ? 0 : Math.min(100, item.value);
        const bh = Math.max(item.empty ? 0 : 4, (value / 100) * innerH);
        const y = pad.t + innerH - bh;
        return (
          <g key={item.id}>
            <rect x={x} y={pad.t} width={barW} height={innerH} rx="6" fill={track} />
            <rect x={x} y={y} width={barW} height={bh} rx="6" fill={ink}>
              <title>{`${item.label}: ${item.empty ? 'нет задач' : `${item.value}%`}`}</title>
            </rect>
            {!item.empty && (
              <text x={x + barW / 2} y={y - 6} textAnchor="middle" fontSize="11" fontWeight="600" fill={ink}>
                {item.value}%
              </text>
            )}
            <text x={x + barW / 2} y={h - 8} textAnchor="middle" fontSize="11" fill={muted}>
              {item.axis}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function Area({ points, dark }) {
  const ink = dark ? '#f4f4f5' : '#18181b';
  const grid = dark ? '#27272a' : '#e4e4e7';
  const muted = dark ? '#71717a' : '#a1a1aa';
  const w = 640;
  const h = 220;
  const pad = { t: 16, r: 12, b: 28, l: 28 };
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;
  const n = Math.max(points.length - 1, 1);

  const coords = points.map((p, i) => {
    const x = pad.l + (i / n) * innerW;
    const y = pad.t + innerH - (Math.min(100, Math.max(0, p.value)) / 100) * innerH;
    return { ...p, x, y };
  });

  const line = coords.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const area = coords.length
    ? `${line} L ${coords[coords.length - 1].x} ${pad.t + innerH} L ${coords[0].x} ${pad.t + innerH} Z`
    : '';

  const labelEvery = Math.max(1, Math.ceil(points.length / 6));

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-52" role="img" aria-label="Средний результат по дням">
      {[0, 50, 100].map((tick) => {
        const y = pad.t + innerH - (tick / 100) * innerH;
        return (
          <g key={tick}>
            <line x1={pad.l} x2={w - pad.r} y1={y} y2={y} stroke={grid} strokeWidth="1" />
            <text x={pad.l - 6} y={y + 3} textAnchor="end" fontSize="10" fill={muted}>
              {tick}
            </text>
          </g>
        );
      })}
      {area && <path d={area} fill={ink} opacity="0.08" />}
      {line && <path d={line} fill="none" stroke={ink} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />}
      {coords.map((p) => (
        <g key={p.id}>
          <circle cx={p.x} cy={p.y} r="3.5" fill={ink}>
            <title>{`${p.label}: ${p.value}% · ${p.meta}`}</title>
          </circle>
        </g>
      ))}
      {coords.map((p, i) =>
        i % labelEvery === 0 || i === coords.length - 1 ? (
          <text key={`l-${p.id}`} x={p.x} y={h - 8} textAnchor="middle" fontSize="10" fill={muted}>
            {p.label}
          </text>
        ) : null
      )}
    </svg>
  );
}

export function piePalette(dark) {
  return dark ? PIE_DARK : PIE_LIGHT;
}
