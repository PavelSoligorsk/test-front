import React from 'react';
import { BookOpen, Search, Filter, XCircle, ChevronRight, ScanSearch, Inbox } from 'lucide-react';
import TestCard from './TestCard';

export default function TestsTab({
  allTests, publicStaticTests, teacherTests, aiTestsMapped,
  testTypeFilter, setTestTypeFilter,
  uniqueClasses, selectedClass, setSelectedClass,
  classSearch, setClassSearch,
  selectedSubject, setSelectedSubject,
  subjects, searchedTests,
  testSearch, setTestSearch,
  handleStartTest,
  typeFilteredTests,
  examFilter, setExamFilter,
}) {
  const isExamClass = (className) => {
    const examKeywords = ['цт', 'цэ', 'рт', 'дрт', 'рцэ'];
    const lowerClassName = className.toLowerCase();
    return examKeywords.some(keyword => lowerClassName.includes(keyword));
  };

  const filteredUniqueClasses = examFilter
    ? uniqueClasses.filter(cls => isExamClass(cls))
    : uniqueClasses;

  const typeLabel = {
    all: `Все (${allTests.length})`,
    public: `Общие (${publicStaticTests.length})`,
    teacher: `Учительские (${teacherTests.length})`,
    ai: `AI (${aiTestsMapped.length})`,
  };

  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      <div className="bg-white dark:bg-[#09090b] rounded-3xl border border-zinc-200 dark:border-zinc-800/60 shadow-sm p-6 md:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm">
              <BookOpen size={18} strokeWidth={2} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
                Доступные тесты
              </h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
                {typeFilteredTests.length} {typeFilteredTests.length === 1 ? 'тест' : 'тестов'}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setExamFilter(!examFilter)}
              className={`inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium border transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-white ${
                examFilter
                  ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 border-transparent'
                  : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800'
              }`}
              title="Показать только разделы с ЦТ, ЦЭ, РТ, ДРТ, РЦЭ"
            >
              <ScanSearch size={14} /> ЦТ/ЦЭ/РТ
            </button>
            <button
              type="button"
              onClick={() => {
                const filters = ['all', 'public', 'teacher', 'ai'];
                const ci = filters.indexOf(testTypeFilter);
                setTestTypeFilter(filters[(ci + 1) % filters.length]);
              }}
              className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950 focus-visible:ring-zinc-900 dark:focus-visible:ring-white"
            >
              {typeLabel[testTypeFilter]}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-[#09090b] rounded-3xl border border-zinc-200 dark:border-zinc-800/60 shadow-sm overflow-hidden flex flex-col md:flex-row min-h-[450px] md:min-h-[550px]">
        <aside className={`w-full md:w-64 bg-zinc-50/70 dark:bg-zinc-950/40 border-b md:border-b-0 md:border-r border-zinc-100 dark:border-zinc-800/60 p-4 md:p-5 flex flex-col gap-3 ${selectedClass ? 'hidden md:flex' : 'flex'}`}>
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-medium text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
              <Filter size={14} /> Разделы
            </h3>
            <span className="text-[11px] font-medium text-zinc-500 bg-white dark:bg-zinc-900 px-2 py-0.5 rounded-md border border-zinc-200 dark:border-zinc-800 tabular-nums">
              {filteredUniqueClasses.length}
            </span>
          </div>

          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Поиск раздела..."
              value={classSearch}
              onChange={e => setClassSearch(e.target.value)}
              className="w-full bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800/80 py-2.5 pl-9 pr-4 rounded-xl text-sm font-medium text-zinc-900 dark:text-zinc-100 outline-none focus:ring-4 focus:ring-zinc-100 dark:focus:ring-zinc-800/50 focus:border-zinc-300 dark:focus:border-zinc-700 placeholder:text-zinc-400"
            />
          </div>

          <div className="flex flex-col gap-1 overflow-y-auto max-h-[350px] md:max-h-[550px] pr-1">
            {filteredUniqueClasses.length > 0 ? filteredUniqueClasses.map(cls => {
              const count = typeFilteredTests.filter(t => (t.target_class || 'Общие') === cls).length;
              const isActive = selectedClass === cls;
              const isExam = isExamClass(cls);

              return (
                <button
                  key={cls}
                  type="button"
                  onClick={() => { setSelectedClass(cls); setSelectedSubject('Все'); setTestSearch(''); }}
                  className={`w-full flex items-center justify-between p-3 rounded-xl text-left transition-colors border ${
                    isActive
                      ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 border-transparent'
                      : 'bg-white dark:bg-zinc-900/40 text-zinc-700 dark:text-zinc-300 border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                  }`}
                >
                  <span className="text-sm font-medium truncate mr-2 flex items-center gap-1.5">
                    {cls}
                    {isExam && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium shrink-0 ${
                        isActive
                          ? 'bg-white/15 dark:bg-zinc-900/10'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'
                      }`}>
                        ЦТ/ЦЭ
                      </span>
                    )}
                  </span>
                  <span className={`text-[11px] font-medium tabular-nums px-2 py-0.5 rounded-md shrink-0 ${
                    isActive ? 'bg-white/15 dark:bg-zinc-900/10' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            }) : (
              <p className="text-sm text-zinc-400 text-center py-8">
                {classSearch
                  ? 'Ничего не найдено'
                  : examFilter
                    ? 'Нет разделов с ЦТ/ЦЭ/РТ'
                    : 'Нет разделов'}
              </p>
            )}
          </div>
        </aside>

        <main className={`flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto ${!selectedClass ? 'hidden md:flex flex-col justify-center' : 'block'}`}>
          {!selectedClass ? (
            <div className="h-full flex flex-col items-center justify-center text-center gap-4 py-12">
              <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800 text-zinc-400">
                <BookOpen size={24} strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Выберите раздел</p>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 max-w-[250px] mx-auto leading-relaxed">
                  В левой панели разделы с доступными проверочными тестами
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-5 animate-in fade-in duration-300">
              <div className="flex flex-col gap-3 pb-4 border-b border-zinc-100 dark:border-zinc-800/60">
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

                <div className="relative w-full">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="Поиск теста по названию..."
                    value={testSearch}
                    onChange={e => setTestSearch(e.target.value)}
                    className="w-full pl-9 pr-9 py-2.5 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800/80 rounded-xl text-sm font-medium text-zinc-900 dark:text-zinc-100 outline-none focus:ring-4 focus:ring-zinc-100 dark:focus:ring-zinc-800/50 focus:border-zinc-300 dark:focus:border-zinc-700 placeholder:text-zinc-400"
                  />
                  {testSearch && (
                    <button
                      type="button"
                      onClick={() => setTestSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                    >
                      <XCircle size={14} />
                    </button>
                  )}
                </div>
              </div>

              {selectedClass && subjects.length > 1 && (
                <div className="overflow-x-auto scrollbar-none -mx-4 px-4 md:mx-0 md:px-0 pb-1">
                  <div className="flex items-center p-1 bg-zinc-100/80 dark:bg-zinc-900/50 rounded-xl border border-zinc-200/60 dark:border-zinc-800/60 w-max">
                    {subjects.map(subject => {
                      const isActive = selectedSubject === subject;
                      return (
                        <button
                          key={subject}
                          type="button"
                          onClick={() => setSelectedSubject(subject)}
                          className={`relative px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                            isActive
                              ? 'text-zinc-900 dark:text-zinc-100'
                              : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                          }`}
                        >
                          {isActive && (
                            <div className="absolute inset-0 bg-white dark:bg-zinc-800 rounded-lg shadow-sm border border-zinc-200/50 dark:border-zinc-700/50" />
                          )}
                          <span className="relative z-10">{subject === 'Все' ? 'Все темы' : subject}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {searchedTests.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
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
                <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
                  <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800 text-zinc-400">
                    <Inbox size={24} strokeWidth={1.5} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {testSearch ? 'Ничего не найдено' : 'Нет тестов'}
                    </p>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                      {testSearch ? 'Попробуйте изменить поисковый запрос' : 'В этой категории пока нет заданий'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
