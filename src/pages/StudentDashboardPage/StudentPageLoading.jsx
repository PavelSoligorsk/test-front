import { ArrowLeft, BarChart3, BookOpen, LayoutGrid, Library, User as UserIcon } from 'lucide-react';

export default function StudentPageLoading({ variant = 'tests', title, hint }) {
  if (variant === 'history') {
    return (
      <main className="max-w-7xl mx-auto p-4 md:p-8">
        <HistorySkeleton />
      </main>
    );
  }

  if (variant === 'profile') {
    return (
      <main className="max-w-7xl mx-auto p-4 md:p-8">
        <ProfileSkeleton />
      </main>
    );
  }

  if (variant === 'tests') {
    return (
      <main className="max-w-7xl mx-auto p-4 md:p-8 space-y-8">
        <TestsSkeleton />
      </main>
    );
  }

  if (variant === 'stats') {
    return (
      <main className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
        <StatsSkeleton />
      </main>
    );
  }

  const theoryTitle = title || 'Теоретический материал';
  const theoryHint = hint || (variant === 'theoryArticle' ? '' : variant === 'theorySections' ? 'Выберите раздел' : 'Материалы по темам');

  return (
    <main className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
      <Sheet className="p-6 md:p-8">
        <div className="flex items-center gap-4">
          <Well>
            {variant === 'theory' ? <Library size={18} strokeWidth={2} /> : <ArrowLeft size={18} strokeWidth={2} />}
          </Well>
          <div className="min-w-0">
            <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">{theoryTitle}</h1>
            {theoryHint ? <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">{theoryHint}</p> : null}
          </div>
        </div>
      </Sheet>
      {variant === 'theoryArticle' && <ArticleSkeleton />}
      {variant === 'theorySections' && <RowsSkeleton rows={5} />}
      {variant === 'theory' && <CardsSkeleton />}
    </main>
  );
}

function Sheet({ children, className = '' }) {
  return (
    <div className={`bg-white dark:bg-[#09090b] rounded-3xl border border-zinc-200 dark:border-zinc-800/60 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

function Well({ children }) {
  return (
    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm shrink-0">
      {children}
    </div>
  );
}

function Pulse({ className = '' }) {
  return <div className={`animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-900 ${className}`} />;
}

function TestsSkeleton() {
  return (
    <div className="space-y-6">
      <Sheet className="p-6 md:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div className="flex items-center gap-4">
            <Well><BookOpen size={18} strokeWidth={2} /></Well>
            <div>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">Доступные тесты</h2>
              <Pulse className="h-3 w-16 mt-2" />
            </div>
          </div>
          <div className="flex gap-2">
            <Pulse className="h-9 w-28 rounded-xl" />
            <Pulse className="h-9 w-24 rounded-xl" />
          </div>
        </div>
      </Sheet>
      <Sheet className="overflow-hidden flex min-h-[450px] md:min-h-[550px]">
        <aside className="hidden md:flex w-64 flex-col gap-2 p-5 border-r border-zinc-100 dark:border-zinc-800/60 bg-zinc-50/70 dark:bg-zinc-950/40">
          <Pulse className="h-9 w-full rounded-xl" />
          {[0, 1, 2, 3, 4, 5].map((i) => <Pulse key={i} className="h-11 w-full rounded-xl" />)}
        </aside>
        <div className="flex-1 p-6 md:p-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="rounded-3xl border border-zinc-200 dark:border-zinc-800/60 p-5 md:p-6 space-y-3">
              <div className="flex justify-between">
                <Pulse className="w-10 h-10 rounded-xl" />
                <Pulse className="h-6 w-16 rounded-md" />
              </div>
              <Pulse className="h-4 w-4/5" />
              <Pulse className="h-3 w-2/5" />
              <Pulse className="h-8 w-24 rounded-lg" />
            </div>
          ))}
        </div>
      </Sheet>
    </div>
  );
}

function HistorySkeleton() {
  return (
    <Sheet className="overflow-hidden">
      <div className="p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-zinc-100 dark:border-zinc-800/60">
        <div className="flex items-center gap-4">
          <Well><LayoutGrid size={18} strokeWidth={2} /></Well>
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">История решений</h2>
            <Pulse className="h-3 w-20 mt-2" />
          </div>
        </div>
        <Pulse className="h-11 w-full md:w-72 rounded-xl" />
      </div>
      <ul className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
        {Array.from({ length: 7 }).map((_, i) => (
          <li key={i} className="px-6 md:px-8 py-4 md:py-5 flex items-center gap-4 md:gap-6">
            <Pulse className="hidden sm:block w-24 h-6 rounded-md" />
            <Pulse className="h-4 flex-1" />
            <Pulse className="w-10 h-6" />
            <Pulse className="w-4 h-4 rounded-full" />
          </li>
        ))}
      </ul>
    </Sheet>
  );
}

function RowsSkeleton({ rows }) {
  return (
    <Sheet className="overflow-hidden">
      <ul className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
        {Array.from({ length: rows }).map((_, i) => (
          <li key={i} className="px-6 md:px-8 py-4">
            <Pulse className="h-4 w-2/3" />
          </li>
        ))}
      </ul>
    </Sheet>
  );
}

function CardsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <Sheet key={i} className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <Pulse className="w-10 h-10 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Pulse className="h-4 w-3/4" />
              <Pulse className="h-3 w-1/3" />
            </div>
          </div>
          <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800/60 flex justify-between">
            <Pulse className="h-3 w-14" />
            <Pulse className="h-3 w-3 rounded-full" />
          </div>
        </Sheet>
      ))}
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="max-w-3xl mx-auto">
      <Sheet className="p-6 md:p-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 pb-8 border-b border-zinc-100 dark:border-zinc-800/60">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm">
              <UserIcon size={20} strokeWidth={2} />
            </div>
            <div className="space-y-2">
              <Pulse className="h-5 w-40" />
              <Pulse className="h-3 w-16" />
            </div>
          </div>
          <div className="flex gap-8 bg-zinc-50 dark:bg-zinc-900/50 px-6 py-4 rounded-2xl border border-zinc-100 dark:border-zinc-800">
            <Pulse className="h-10 w-12" />
            <div className="w-px bg-zinc-200 dark:bg-zinc-800" />
            <Pulse className="h-10 w-12" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <Pulse className="h-3 w-16" />
              <Pulse className="h-12 rounded-xl" />
            </div>
          ))}
        </div>
        <Pulse className="h-12 rounded-xl" />
      </Sheet>
    </div>
  );
}

export function ArticleBodySkeleton() {
  return (
    <div className="space-y-5">
      <Pulse className="h-6 w-1/3" />
      <Pulse className="h-3 w-full" />
      <Pulse className="h-3 w-[92%]" />
      <Pulse className="h-3 w-[78%]" />
      <Pulse className="h-28 w-full rounded-xl" />
      <Pulse className="h-3 w-full" />
      <Pulse className="h-3 w-[88%]" />
      <Pulse className="h-3 w-[64%]" />
      <Pulse className="h-20 w-full rounded-xl" />
      <Pulse className="h-3 w-[72%]" />
    </div>
  );
}

function ArticleSkeleton() {
  return (
    <Sheet className="p-6 md:px-8 md:py-8">
      <ArticleBodySkeleton />
    </Sheet>
  );
}

function StatsSkeleton() {
  return (
    <div className="space-y-6">
      <Sheet className="overflow-hidden">
        <div className="p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-zinc-100 dark:border-zinc-800/60">
          <div className="flex items-center gap-4">
            <Well><BarChart3 size={18} strokeWidth={2} /></Well>
            <div>
              <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">Статистика</h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">Как идут решения за выбранный период</p>
            </div>
          </div>
          <div className="flex items-center p-1 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border border-zinc-200 dark:border-zinc-800/80 w-full md:w-auto">
            {['Всё время', 'Год', 'Месяц', 'Неделя'].map((label) => (
              <span key={label} className="flex-1 md:flex-none px-3 py-1.5 text-xs font-medium text-zinc-400 whitespace-nowrap">{label}</span>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-zinc-100 dark:divide-zinc-800/60">
          {[0, 1, 2].map((i) => (
            <div key={i} className="px-6 md:px-8 py-8 space-y-3">
              <Pulse className="h-9 w-20" />
              <Pulse className="h-3 w-28" />
            </div>
          ))}
        </div>
      </Sheet>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {[0, 1].map((sheet) => (
          <Sheet key={sheet} className="p-6 md:p-8 space-y-5">
            <Pulse className="h-5 w-24" />
            <div className="flex justify-between">
              <Pulse className="h-3 w-6" />
              <Pulse className="h-3 w-6" />
              <Pulse className="h-3 w-8" />
            </div>
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between gap-4">
                  <Pulse className="h-3 w-32" />
                  <Pulse className="h-3 w-10" />
                </div>
                <Pulse className="h-2.5 w-full rounded-full" />
              </div>
            ))}
          </Sheet>
        ))}
      </div>
    </div>
  );
}
