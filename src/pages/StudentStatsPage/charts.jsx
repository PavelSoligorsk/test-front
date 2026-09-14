export function Donut({ percent, label, sub, size = 156 }) {
  const stroke = 12;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.min(100, Math.max(0, Number(percent) || 0));
  const text = Number.isInteger(p) ? String(p) : p.toFixed(1);

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        role="img"
        aria-label={`${label || 'Результат'}: ${text}%`}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          className="stroke-zinc-100 dark:stroke-zinc-800"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (p / 100) * c}
          className="stroke-zinc-900 dark:stroke-zinc-100 transition-[stroke-dashoffset] duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
        <span className="text-3xl font-semibold tracking-tight tabular-nums text-zinc-900 dark:text-zinc-100">
          {text}%
        </span>
        {label ? <span className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-tight">{label}</span> : null}
        {sub ? <span className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5 tabular-nums">{sub}</span> : null}
      </div>
    </div>
  );
}

export function Histogram({ items, ariaLabel, compact = false }) {
  const w = compact ? 360 : 440;
  const h = compact ? 148 : 224;
  const pad = compact ? { t: 18, r: 4, b: 36, l: 22 } : { t: 24, r: 6, b: 44, l: 30 };
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;
  const gap = compact ? 10 : 14;
  const count = Math.max(items.length, 1);
  const barW = (innerW - gap * (count - 1)) / count;
  const baseline = pad.t + innerH;
  const ticks = compact ? [0, 50, 100] : [0, 25, 50, 75, 100];

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className={`block w-full h-auto ${compact ? 'max-w-[360px]' : 'max-w-[440px]'} mx-auto`}
      role="img"
      aria-label={ariaLabel}
    >
      {ticks.map((tick) => {
        const y = baseline - (tick / 100) * innerH;
        return (
          <g key={tick}>
            <line
              x1={pad.l}
              x2={w - pad.r}
              y1={y}
              y2={y}
              strokeWidth="1"
              className="stroke-zinc-200 dark:stroke-zinc-800"
            />
            <text
              x={pad.l - 6}
              y={y + 3}
              textAnchor="end"
              fontSize="10"
              className="fill-zinc-400 dark:fill-zinc-500 tabular-nums"
            >
              {tick}
            </text>
          </g>
        );
      })}

      {items.map((item, i) => {
        const x = pad.l + i * (barW + gap);
        const value = Math.min(100, Math.max(0, Number(item.value) || 0));
        const barH = item.empty ? 0 : Math.max(3, (value / 100) * innerH);
        const y = baseline - barH;
        return (
          <g key={item.id}>
            <rect
              x={x}
              y={pad.t}
              width={barW}
              height={innerH}
              rx={compact ? 6 : 8}
              className="fill-zinc-100/70 dark:fill-zinc-900/70"
            />
            {item.empty ? (
              <text
                x={x + barW / 2}
                y={baseline - 8}
                textAnchor="middle"
                fontSize="12"
                className="fill-zinc-300 dark:fill-zinc-600"
              >
                —
              </text>
            ) : (
              <>
                <rect
                  x={x}
                  y={y}
                  width={barW}
                  height={barH}
                  rx={compact ? 6 : 8}
                  className="fill-zinc-900 dark:fill-zinc-100 transition-all duration-700"
                >
                  <title>{`${item.label}: ${Math.round(value)}% · ${item.meta}`}</title>
                </rect>
                <text
                  x={x + barW / 2}
                  y={y - 6}
                  textAnchor="middle"
                  fontSize={compact ? '10' : '11'}
                  fontWeight="600"
                  className="fill-zinc-900 dark:fill-zinc-100 tabular-nums"
                >
                  {Math.round(value)}%
                </text>
              </>
            )}
            <text
              x={x + barW / 2}
              y={baseline + 16}
              textAnchor="middle"
              fontSize="11"
              className="fill-zinc-500 dark:fill-zinc-400"
            >
              {item.axis}
            </text>
            <text
              x={x + barW / 2}
              y={baseline + 30}
              textAnchor="middle"
              fontSize="10"
              className="fill-zinc-400 dark:fill-zinc-500 tabular-nums"
            >
              {item.meta}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
