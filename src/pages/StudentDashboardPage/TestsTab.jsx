import { useState } from 'react';
import { BookOpen, ChevronRight, ScanSearch, Inbox, PanelLeftOpen } from 'lucide-react';
import TestCard from './TestCard';
import TestsClassSidebar from './TestsClassSidebar';
import { PageHeading } from '../../shared/ui/HeadingBlock';
import { Sheet } from '../../shared/ui/Sheet';
import SearchField from '../../shared/ui/SearchField';
import EmptyState from '../../shared/ui/EmptyState';

// 1 тест, 2 теста, 5 тестов, 21 тест
function testsWord(n) {
  const abs = n % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return 'тестов';
  if (last > 1 && last < 5) return 'теста';
  return last === 1 ? 'тест' : 'тестов';
}

export default function TestsTab({
  allTests, publicStaticTests, teacherTests, aiTestsMapped,
  testTypeFilter, setTestTypeFilter,
  uniqueClasses, selectedClass, setSelectedClass,
  classSearch, setClassSearch,
  selectedSubject, setSelectedSubject,
  searchedTests,
  testSearch, setTestSearch,
  handleStartTest,
  typeFilteredTests,
  examFilter, setExamFilter,
}) {
  const [sectionsOpen, setSectionsOpen] = useState(() => {
    try {
      return window.localStorage.getItem('student_tests_sections_open') !== '0';
    } catch {
      return true;
    }
  });

  const toggleSections = () => {
    setSectionsOpen((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem('student_tests_sections_open', next ? '1' : '0');
      } catch {
        /* storage may be unavailable */
      }
      return next;
    });
  };
  const typeLabel = {
    all: `Все (${allTests.length})`,
    public: `Общие (${publicStaticTests.length})`,
    teacher: `Учительские (${teacherTests.length})`,
    ai: `AI (${aiTestsMapped.length})`,
  };

  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      <PageHeading
  title="Доступные тесты"
  hint={`${typeFilteredTests.length} ${testsWord(typeFilteredTests.length)}`}
  titleAs="h2"
  extra={(
    <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 max-w-full">
      <button
        type="button"
        onClick={() => setExamFilter(!examFilter)}
        title="Показать только разделы с ЦТ, ЦЭ, РТ, ДРТ, РЦЭ"
        aria-label="Показать только разделы с ЦТ, ЦЭ, РТ, ДРТ, РЦЭ"
        aria-pressed={examFilter}
        className={`inline-flex items-center justify-center w-9 h-9 shrink-0 rounded-lg border transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-white ${
          examFilter
            ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 border-transparent'
            : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800'
        }`}
      >
        <ScanSearch size={16} />
      </button>

      <button
        type="button"
        onClick={() => {
          const filters = ['all', 'public', 'teacher', 'ai'];
          const ci = filters.indexOf(testTypeFilter);
          setTestTypeFilter(filters[(ci + 1) % filters.length]);
        }}
        className="inline-flex items-center justify-center h-9 px-3.5 min-w-0 max-w-full rounded-lg text-xs font-medium bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950 focus-visible:ring-zinc-900 dark:focus-visible:ring-white"
      >
        <span className="truncate">{typeLabel[testTypeFilter]}</span>
      </button>
    </div>
  )}
/>

      <Sheet className="overflow-hidden flex flex-col md:flex-row min-h-[450px] md:min-h-[550px]">
        <TestsClassSidebar
          uniqueClasses={uniqueClasses}
          examFilter={examFilter}
          classSearch={classSearch}
          setClassSearch={setClassSearch}
          selectedClass={selectedClass}
          setSelectedClass={setSelectedClass}
          setSelectedSubject={setSelectedSubject}
          setTestSearch={setTestSearch}
          typeFilteredTests={typeFilteredTests}
          open={sectionsOpen}
          onToggle={toggleSections}
        />
        <section className={`flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto ${!selectedClass && sectionsOpen ? 'hidden md:flex flex-col justify-center' : 'block'}`}>
          {!sectionsOpen && !selectedClass && (
            <button
              type="button"
              onClick={toggleSections}
              aria-label="Открыть разделы"
              title="Открыть разделы"
              className="md:hidden mb-4 inline-flex items-center justify-center w-9 h-9 rounded-full border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300"
            >
              <PanelLeftOpen size={18} />
            </button>
          )}
          {!selectedClass ? (
            <EmptyState
              framed={false}
              className="h-full py-12"
              icon={<BookOpen size={24} strokeWidth={1.5} />}
              title="Выберите раздел"
              hint="В левой панели разделы с доступными проверочными тестами"
            />
          ) : (
            <div className="space-y-5 animate-in fade-in duration-300">
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-1.5 flex-wrap text-xs font-medium text-zinc-500">
                  <button
                    type="button"
                    onClick={() => { setSelectedClass(null); setSelectedSubject('Все'); }}
                    className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors md:hidden mr-1"
                  >
                    <ChevronRight size={12} className="rotate-180" /> Назад
                  </button>

                  {testTypeFilter !== 'all' && (
                    <>
                      <span className="px-2 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                        {testTypeFilter === 'public' ? 'Общие' : testTypeFilter === 'teacher' ? 'Учительские' : 'AI'}
                      </span>
                      <ChevronRight size={12} className="text-zinc-300 dark:text-zinc-600" />
                    </>
                  )}

                  <span className="bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 px-2 py-1 rounded-md">
                    {selectedClass}
                  </span>

                  {selectedSubject !== 'Все' && (
                    <>
                      <ChevronRight size={12} className="text-zinc-300 dark:text-zinc-600" />
                      <span className="bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 px-2 py-1 rounded-md">{selectedSubject}</span>
                    </>
                  )}
                </div>

                <SearchField
                  className="w-full"
                  value={testSearch}
                  onChange={setTestSearch}
                  onClear={() => setTestSearch('')}
                  placeholder="Поиск теста по названию..."
                />
              </div>

              {searchedTests.length > 0 ? (
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 items-stretch">
                  {searchedTests.map(test => (
                    <TestCard
                      key={`${test.type}-${test.id}`}
                      test={test}
                      type={test.type}
                      onStart={handleStartTest}
                      disabled={test.is_completed}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState
                  framed={false}
                  className="py-16"
                  icon={<Inbox size={24} strokeWidth={1.5} />}
                  title={testSearch ? 'Ничего не найдено' : 'Нет тестов'}
                  hint={testSearch ? 'Попробуйте изменить поисковый запрос' : 'В этой категории пока нет заданий'}
                />
              )}
            </div>
          )}
        </section>
      </Sheet>
    </div>
  );
}