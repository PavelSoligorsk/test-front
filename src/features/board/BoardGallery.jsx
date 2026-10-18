function relativeUpdated(iso) {
  if (!iso) return 'Без даты';
  const delta = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(delta) || delta < 0) return 'Изменено только что';
  const minutes = Math.round(delta / 60000);
  if (minutes < 1) return 'Изменено только что';
  if (minutes < 60) return `Изменено ${minutes} мин. назад`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) {
    const word = hours % 10 === 1 && hours % 100 !== 11 ? 'час' : hours % 10 >= 2 && hours % 10 <= 4 && (hours % 100 < 12 || hours % 100 > 14) ? 'часа' : 'часов';
    return `Изменено ${hours} ${word} назад`;
  }
  const days = Math.round(hours / 24);
  const word = days % 10 === 1 && days % 100 !== 11 ? 'день' : days % 10 >= 2 && days % 10 <= 4 && (days % 100 < 12 || days % 100 > 14) ? 'дня' : 'дней';
  return `Изменено ${days} ${word} назад`;
}

function Preview() {
  return (
    <div className="relative aspect-[16/10] overflow-hidden rounded-2xl bg-[#f3f4f6] dark:bg-zinc-900">
      <svg viewBox="0 0 320 180" className="absolute inset-0 h-full w-full" aria-hidden="true">
        <path d="M40 150c30-40 50-70 70-70 18 0 20 28 40 28 22 0 30-50 55-62 20-10 40 8 62 8 18 0 28-16 40-16" fill="none" stroke="#dbe7f5" strokeWidth="28" strokeLinecap="round" />
        <g transform="translate(168 78) rotate(-28)">
          <rect x="0" y="0" width="18" height="64" rx="4" fill="#e8eef5" stroke="#c5d0de" />
          <rect x="4" y="8" width="10" height="36" rx="2" fill="#7eb6ea" />
          <rect x="22" y="16" width="14" height="52" rx="3" fill="#f7f9fb" stroke="#d5dee8" />
        </g>
      </svg>
    </div>
  );
}

export default function BoardGallery({ boards, onOpen, renderMenu, titleOf }) {
  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 xl:grid-cols-3">
      {boards.map((board) => {
        const title = titleOf ? titleOf(board) : (board.title || 'Доска');
        return (
          <article key={board.id} className="min-w-0">
            <div className="relative">
              <button type="button" onClick={() => onOpen(board)} className="block w-full text-left" aria-label={title}>
                <Preview />
              </button>
              {renderMenu ? (
                <div className="absolute right-3 top-3">{renderMenu(board)}</div>
              ) : null}
            </div>
            <button type="button" onClick={() => onOpen(board)} className="mt-3 block max-w-full text-left">
              <p className="truncate text-[15px] font-semibold text-zinc-900 dark:text-zinc-100">{title}</p>
              <p className="mt-0.5 text-sm text-zinc-500">{relativeUpdated(board.updatedAt)}</p>
            </button>
          </article>
        );
      })}
    </div>
  );
}
