import { MAIN_TOPICS } from '../AdminDashboardPage/constants';

const LABEL_TO_KEY = Object.fromEntries(
  Object.entries(MAIN_TOPICS).map(([key, label]) => [label.toLowerCase(), key]),
);

function resolveTopicArtKey(topic) {
  const raw = String(topic?.topic || topic?.label || '').trim();
  if (MAIN_TOPICS[raw]) return raw;
  return LABEL_TO_KEY[raw.toLowerCase()] || 'default';
}

function Frame({ children }) {
  return (
    <div className="relative h-full w-full overflow-hidden bg-zinc-100 text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_28%_22%,rgb(255_255_255/0.9),transparent_58%)] dark:bg-[radial-gradient(circle_at_28%_22%,rgb(255_255_255/0.08),transparent_58%)]"
      />
      <svg viewBox="0 0 64 64" className="relative h-full w-full" aria-hidden>
        {children}
      </svg>
    </div>
  );
}

function NumbersArt() {
  const cells = [1, 1, 1, 1, 1, 1, 1, 0, 0, 0];
  return (
    <Frame>
      {cells.map((on, i) => {
        const x = 10.5 + (i % 5) * 9;
        const y = 21 + Math.floor(i / 5) * 13;
        return (
          <rect
            key={i}
            x={x}
            y={y}
            width={7}
            height={7}
            rx={1.6}
            fill={on ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth="1.2"
            opacity={on ? 1 : 0.28}
          />
        );
      })}
    </Frame>
  );
}

function ExpressionsArt() {
  return (
    <Frame>
      <path d="M18 18a12 14 0 0 0 0 28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M46 18a12 14 0 0 1 0 28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <text
        x="32"
        y="33.5"
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="20"
        fontWeight="600"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
        fill="currentColor"
      >
        x²
      </text>
    </Frame>
  );
}

function EquationsArt() {
  return (
    <Frame>
      <rect x="9" y="23" width="16" height="18" rx="3" fill="currentColor" />
      <rect x="39" y="23" width="16" height="18" rx="3" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <rect x="28" y="28" width="8" height="2.2" rx="1.1" fill="currentColor" />
      <rect x="28" y="34" width="8" height="2.2" rx="1.1" fill="currentColor" />
    </Frame>
  );
}

function InequalitiesArt() {
  return (
    <Frame>
      <path
        d="M18 18 48 30.5 18 43"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M18 49h30" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </Frame>
  );
}

function FunctionsArt() {
  return (
    <Frame>
      <line x1="12" y1="48" x2="54" y2="48" stroke="currentColor" strokeWidth="1.2" opacity="0.35" />
      <line x1="16" y1="12" x2="16" y2="48" stroke="currentColor" strokeWidth="1.2" opacity="0.35" />
      <path
        d="M16 42c8 0 10-26 22-26 8 0 12 22 16 28"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
      />
      <circle cx="38" cy="16" r="2.6" fill="currentColor" />
    </Frame>
  );
}

function TextArt() {
  return (
    <Frame>
      <rect x="16" y="12" width="32" height="40" rx="4" fill="none" stroke="currentColor" strokeWidth="1.4" opacity="0.3" />
      <rect x="21" y="20" width="22" height="2.4" rx="1.2" fill="currentColor" />
      <rect x="21" y="28" width="18" height="2.4" rx="1.2" fill="currentColor" opacity="0.55" />
      <rect x="21" y="36" width="14" height="2.4" rx="1.2" fill="currentColor" opacity="0.28" />
    </Frame>
  );
}

function PlanimArt() {
  const cx = 32;
  const cy = 32;
  const R = 17;
  const half = (R * Math.sqrt(3)) / 2;
  const top = [cx, cy - R];
  const br = [cx + half, cy + R / 2];
  const bl = [cx - half, cy + R / 2];

  return (
    <Frame>
      <circle cx={cx} cy={cy} r={R} fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
      <polygon
        points={`${top.join(',')} ${br.join(',')} ${bl.join(',')}`}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinejoin="round"
      />
      {[top, br, bl].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="2.1" fill="currentColor" />
      ))}
    </Frame>
  );
}

function StereoArt() {
  return (
    <Frame>
      <path d="M32 16 48 25 32 34 16 25Z" fill="currentColor" />
      <path d="M16 25 32 34 32 52 16 43Z" fill="currentColor" opacity="0.38" />
      <path d="M48 25 32 34 32 52 48 43Z" fill="currentColor" opacity="0.16" />
      <path
        d="M32 16 48 25 32 34 16 25Z M16 25 32 34 32 52 16 43Z M48 25 32 34 32 52 48 43Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </Frame>
  );
}

function DefaultArt() {
  return (
    <Frame>
      <rect x="18" y="14" width="28" height="36" rx="3" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M18 22h28" stroke="currentColor" strokeWidth="1.4" />
    </Frame>
  );
}

const ARTS = {
  numbers: NumbersArt,
  expressions: ExpressionsArt,
  equations: EquationsArt,
  inequalities: InequalitiesArt,
  functions: FunctionsArt,
  text: TextArt,
  planim: PlanimArt,
  stereo: StereoArt,
  default: DefaultArt,
};

export default function TopicArt({ topic }) {
  const key = resolveTopicArtKey(topic);
  const Art = ARTS[key] || ARTS.default;
  return <Art />;
}
