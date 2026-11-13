import { MAIN_TOPICS } from '../AdminDashboardPage/constants';

const FOCUS_RING =
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-white';

function sectionsLabel(count) {
  const n = Number(count) || 0;
  const mod10 = n % 10;
  const mod100 = n % 100;
  let word = 'разделов';
  if (mod10 === 1 && mod100 !== 11) word = 'раздел';
  else if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) word = 'раздела';
  return `${n} ${word}`;
}

export default function TopicCard({ topic, onClick }) {
  const label = MAIN_TOPICS[topic.topic] || topic.label || topic.topic;
  const detail = topic.hint || sectionsLabel(topic.sections_count);

  return (
    <button
      type="button"
      onClick={() => onClick(topic)}
      className={`flex h-full w-full flex-col gap-2 rounded-xl border border-zinc-200 bg-white p-3 text-left shadow-sm hover:border-zinc-300 dark:border-zinc-800/60 dark:bg-[#09090b] dark:hover:border-zinc-700 ${FOCUS_RING}`}
    >
      <h3 className="text-sm font-semibold leading-5 tracking-[-0.01em] text-zinc-900 dark:text-zinc-100 break-words">
        {label}
      </h3>
      <p className="text-[11px] font-medium leading-4 text-zinc-500 dark:text-zinc-400 break-words">
        {detail}
      </p>
    </button>
  );
}
