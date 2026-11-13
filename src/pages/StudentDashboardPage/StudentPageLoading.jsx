import { ArrowLeft, BarChart3, Library, User as UserIcon } from 'lucide-react';
import { IconWell, PageShell, Sheet } from '../../shared/ui/Sheet';

export default function StudentPageLoading({ variant = 'tests', title, hint }) {
  if (variant === 'history') {
    return (
      <PageShell>
        <HistorySkeleton />
      </PageShell>
    );
  }

  if (variant === 'profile') {
    return (
      <PageShell>
        <ProfileSkeleton />
      </PageShell>
    );
  }

  if (variant === 'tests') {
    return (
      <PageShell className="space-y-8">
        <TestsSkeleton />
      </PageShell>
    );
  }

  if (variant === 'stats') {
    return (
      <PageShell className="space-y-6">
        <StatsSkeleton />
      </PageShell>
    );
  }

  const theoryTitle = title || 'Теоретический материал';
  const theoryHint = hint || (variant === 'theoryArticle' ? '' : variant === 'theorySections' ? 'Выберите раздел' : 'Материалы по темам');

  return (
    <PageShell className="space-y-6">
      <Sheet className="p-6 md:p-8">
        <div className="flex items-center gap-4">
          <IconWell>
            {variant === 'theory' ? <Library size={18} strokeWidth={2} /> : <ArrowLeft size={18} strokeWidth={2} />}
          </IconWell>
          <div className="min-w-0">
            <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">{theoryTitle}</h1>
            {theoryHint ? <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">{theoryHint}</p> : null}
          </div>
        </div>
      </Sheet>
      {variant === 'theoryArticle' && <ArticleSkeleton />}
      {variant === 'theorySections' && <RowsSkeleton rows={5} />}
      {variant === 'theory' && <CardsSkeleton />}
    </PageShell>
  );
}

function Pulse({ className = '' }) {
  return <div className={`animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-900 ${className}`} />;
}

function TestsSkeleton() {
  return (
    <div className="space-y-6">
      <Sheet className="p-5 sm:p-6 md:p-8">
        <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-xl md:text-2xl font-semibold leading-tight tracking-[-0.02em] text-zinc-900 dark:text-zinc-100">
              Доступные тесты
            </h2>
            <Pulse className="h-3.5 w-16 mt-2" />
          </div>
          <div className="flex items-center gap-2">
            <Pulse className="h-9 w-9 rounded-lg" />
            <Pulse className="h-9 w-20 rounded-lg" />
          </div>
        </div>
      </Sheet>
      <Sheet className="overflow-hidden flex flex-col md:flex-row min-h-[450px] md:min-h-[550px]">
        <aside className="w-full md:w-64 shrink-0 flex flex-col gap-4 p-4 md:p-5 border-b md:border-b-0 md:border-r border-zinc-200/70 dark:border-zinc-800/60 bg-zinc-50/70 dark:bg-zinc-950/40">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Pulse className="w-7 h-7 rounded-lg" />
              <Pulse className="h-4 w-16" />
            </div>
            <Pulse className="h-9 w-9 rounded-full" />
          </div>
          <Pulse className="h-11 w-full rounded-xl" />
          <div className="flex flex-col gap-1">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <Pulse key={i} className="h-11 w-full rounded-lg" />
            ))}
          </div>
        </aside>
        <div className="hidden md:grid flex-1 p-4 md:p-6 lg:p-8 content-start grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="rounded-xl border border-zinc-200 dark:border-zinc-800/60 p-3 flex flex-col gap-2">
              <Pulse className="h-5 w-4/5" />
              <Pulse className="h-5 w-3/5" />
              <Pulse className="h-3 w-16 mt-1" />
              <div className="mt-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/60">
                <Pulse className="h-3 w-14" />
              </div>
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
      <div className="p-5 sm:p-6 md:p-8 border-b border-zinc-100 dark:border-zinc-800/60">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold tracking-[-0.02em] text-zinc-900 dark:text-zinc-100">История решений</h2>
            <Pulse className="h-3.5 w-20 mt-2" />
          </div>
          <Pulse className="h-11 w-full sm:w-72 rounded-xl" />
        </div>
      </div>
      <ul className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
        {Array.from({ length: 6 }).map((_, i) => (
          <li key={i} className="flex items-center gap-4 px-5 sm:px-6 md:px-8 py-4">
            <Pulse className="hidden sm:block h-3 w-20 shrink-0" />
            <Pulse className="h-4 flex-1 max-w-xs" />
            <Pulse className="h-5 w-8 shrink-0" />
            <Pulse className="h-8 w-8 sm:w-24 shrink-0 rounded-lg" />
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
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="rounded-xl border border-zinc-200 dark:border-zinc-800/60 p-3 space-y-2">
          <Pulse className="h-5 w-4/5" />
          <Pulse className="h-3 w-16" />
        </div>
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
            <IconWell><BarChart3 size={18} strokeWidth={2} /></IconWell>
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
        <div className="grid grid-cols-1 lg:grid-cols-[17rem_minmax(0,1fr)] divide-y lg:divide-y-0 lg:divide-x divide-zinc-100 dark:divide-zinc-800/60">
          <div className="px-6 md:px-8 py-8 flex justify-center">
            <Pulse className="w-[156px] h-[156px] rounded-full" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-zinc-100 dark:divide-zinc-800/60">
            {[0, 1].map((i) => (
              <div key={i} className="px-6 md:px-8 py-8 space-y-3">
                <Pulse className="h-9 w-20" />
                <Pulse className="h-3 w-28" />
              </div>
            ))}
          </div>
        </div>
      </Sheet>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Sheet className="p-6 md:p-8 space-y-5">
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
        <Sheet className="p-6 md:p-8 space-y-5">
          <Pulse className="h-5 w-28" />
          <div className="flex items-end justify-between gap-3 h-44 pt-4">
            {['h-1/3', 'h-2/3', 'h-1/2', 'h-3/4', 'h-2/5'].map((height, i) => (
              <div key={i} className="flex-1 flex flex-col justify-end gap-2">
                <Pulse className={`w-full ${height} rounded-lg`} />
                <Pulse className="h-3 w-8 mx-auto" />
              </div>
            ))}
          </div>
        </Sheet>
      </div>
    </div>
  );
}
