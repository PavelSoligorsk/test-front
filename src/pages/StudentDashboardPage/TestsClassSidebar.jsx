import { useMemo } from 'react';
import { Filter, PanelLeftClose, PanelLeftOpen, SearchX } from 'lucide-react';
import SearchField from '../../shared/ui/SearchField';

const EXAM_KEYWORDS = ['цт', 'цэ', 'рт', 'дрт', 'рцэ'];

const FOCUS_RING =
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-white';

const ROUND_BUTTON = `shrink-0 items-center justify-center w-9 h-9 rounded-full border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors motion-reduce:transition-none ${FOCUS_RING}`;

function isExamClass(className) {
  const lowerClassName = String(className || '').toLowerCase();
  return EXAM_KEYWORDS.some((keyword) => lowerClassName.includes(keyword));
}

export default function TestsClassSidebar({
  uniqueClasses,
  examFilter,
  classSearch,
  setClassSearch,
  selectedClass,
  setSelectedClass,
  setSelectedSubject,
  setTestSearch,
  typeFilteredTests,
  open = true,
  onToggle,
}) {
  const filteredUniqueClasses = examFilter
    ? uniqueClasses.filter((cls) => isExamClass(cls))
    : uniqueClasses;

  const counts = useMemo(() => {
    const map = {};
    typeFilteredTests.forEach((test) => {
      const key = test.target_class || 'Общие';
      map[key] = (map[key] || 0) + 1;
    });
    return map;
  }, [typeFilteredTests]);

  const handleSelect = (cls) => {
    setSelectedClass(cls);
    setSelectedSubject('Все');
    setTestSearch('');
  };

  if (!open) {
    return (
      <aside
        aria-label="Разделы (свёрнуто)"
        className="hidden md:flex w-14 shrink-0 flex-col items-center bg-zinc-50/70 dark:bg-zinc-950/40 border-r border-zinc-200/70 dark:border-zinc-800/60 py-4"
      >
        <button
          type="button"
          onClick={onToggle}
          aria-label="Открыть разделы"
          title="Открыть разделы"
          className={`inline-flex ${ROUND_BUTTON}`}
        >
          <PanelLeftOpen size={18} />
        </button>
      </aside>
    );
  }

  return (
    <aside
      aria-label="Разделы"
      className={`w-full md:w-64 shrink-0 bg-zinc-50/70 dark:bg-zinc-950/40 border-b md:border-b-0 md:border-r border-zinc-200/70 dark:border-zinc-800/60 p-4 md:p-5 flex flex-col gap-4 ${
        selectedClass ? 'hidden md:flex' : 'flex'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold tracking-[-0.01em] text-zinc-900 dark:text-zinc-100">
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400">
            <Filter size={14} />
          </span>
          Разделы
        </h3>
        <button
          type="button"
          onClick={onToggle}
          aria-label="Свернуть разделы"
          title="Свернуть разделы"
          className={`inline-flex ${ROUND_BUTTON}`}
        >
          <PanelLeftClose size={18} />
        </button>
      </div>

      <SearchField
        value={classSearch}
        onChange={setClassSearch}
        placeholder="Поиск раздела..."
      />

      <div className="flex flex-col gap-1 overflow-y-auto max-h-[350px] md:max-h-[550px] -mr-2 pr-2 [scrollbar-width:thin]">
        {filteredUniqueClasses.length > 0 ? (
          filteredUniqueClasses.map((cls) => {
            const count = counts[cls] || 0;
            const isActive = selectedClass === cls;
            const isExam = isExamClass(cls);

            return (
              <button
                key={cls}
                type="button"
                onClick={() => handleSelect(cls)}
                aria-pressed={isActive}
                className={`group w-full flex items-center justify-between gap-2 min-h-11 px-3 rounded-lg text-left transition-colors motion-reduce:transition-none ${FOCUS_RING} ${
                  isActive
                    ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 shadow-sm'
                    : 'text-zinc-700 dark:text-zinc-300 hover:bg-white dark:hover:bg-zinc-900 hover:ring-1 hover:ring-inset hover:ring-zinc-200 dark:hover:ring-zinc-800'
                }`}
              >
                <span className="flex items-center gap-2 min-w-0 text-sm font-medium tracking-[-0.01em]">
                  <span className="truncate">{cls}</span>
                  {isExam && (
                    <span
                      className={`shrink-0 text-[10px] leading-none px-1.5 py-1 rounded-md font-medium ${
                        isActive
                          ? 'bg-white/15 dark:bg-zinc-900/10'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'
                      }`}
                    >
                      ЦТ/ЦЭ
                    </span>
                  )}
                </span>

                <span
                  className={`shrink-0 text-[11px] font-medium tabular-nums min-w-6 text-center px-1.5 py-0.5 rounded-md ${
                    isActive
                      ? 'bg-white/15 dark:bg-zinc-900/10'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })
        ) : (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <span className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-400">
              <SearchX size={18} />
            </span>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {classSearch
                ? 'Ничего не найдено'
                : examFilter
                  ? 'Нет разделов с ЦТ/ЦЭ/РТ'
                  : 'Нет разделов'}
            </p>
          </div>
        )}
      </div>
    </aside>
  );
}
