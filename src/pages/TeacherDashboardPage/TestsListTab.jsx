import React, { useState } from 'react';
import { PlusCircle, Search, BookOpen, Filter, ChevronRight, Edit3, Users, Trash2 } from 'lucide-react';
import { Sheet, IconWell, fieldClass, primaryBtnClass, secondaryBtnClass } from '../../shared/ui';

export default function TestsListTab({ tests, onEdit, onDelete, onManage, onCreateClick }) {
  const [selectedTestClass, setSelectedTestClass] = useState(null);
  const [selectedTestTopic, setSelectedTestTopic] = useState('Все');
  const [testClassSearch, setTestClassSearch] = useState('');
  const [testSearchTerm, setTestSearchTerm] = useState('');

  const classes = [...new Set(tests.map((t) => t.target_class || 'Без раздела'))].sort();
  const filteredClasses = classes.filter((cls) => cls.toLowerCase().includes(testClassSearch.toLowerCase()));

  const filteredTests = tests.filter((t) => {
    const matchClass = !selectedTestClass || (t.target_class || 'Без раздела') === selectedTestClass;
    const matchTopic = selectedTestTopic === 'Все' || (t.target_topic || 'Без темы') === selectedTestTopic;
    const matchSearch = t.title.toLowerCase().includes(testSearchTerm.toLowerCase());
    return matchClass && matchTopic && matchSearch;
  });

  const topics = selectedTestClass
    ? [...new Set(tests.filter((t) => (t.target_class || 'Без раздела') === selectedTestClass).map((t) => t.target_topic || 'Без темы'))].sort()
    : [];

  const chipActive =
    'bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 border-transparent';
  const chipIdle =
    'bg-white dark:bg-zinc-900/40 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50';

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-4 md:space-y-6 max-w-7xl mx-auto">
      <Sheet className="p-5 md:p-6">
        <div className="w-full flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <IconWell>
              <BookOpen size={18} strokeWidth={2} />
            </IconWell>
            <div>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
                Мои тесты
              </h2>
              <p className="text-sm text-zinc-500 mt-0.5">{tests.length} тестов создано</p>
            </div>
          </div>
          <button type="button" onClick={onCreateClick} className={primaryBtnClass}>
            <PlusCircle size={16} /> <span>Создать тест</span>
          </button>
        </div>
      </Sheet>

      <Sheet className="overflow-hidden flex flex-col md:flex-row min-h-[450px] md:min-h-[550px]">
        <aside
          className={`w-full md:w-64 bg-zinc-50/60 dark:bg-zinc-900/30 border-b md:border-b-0 md:border-r border-zinc-100 dark:border-zinc-800/60 p-4 md:p-5 flex flex-col gap-3 ${
            selectedTestClass ? 'hidden md:flex' : 'flex'
          }`}
        >
          <h3 className="text-xs font-medium text-zinc-500 flex items-center gap-2">
            <Filter size={14} /> Разделы
          </h3>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Поиск раздела..."
              value={testClassSearch}
              onChange={(e) => setTestClassSearch(e.target.value)}
              className={`${fieldClass} pl-9 text-xs py-2.5`}
            />
          </div>
          <button
            type="button"
            onClick={() => {
              setSelectedTestClass(null);
              setSelectedTestTopic('Все');
              setTestSearchTerm('');
            }}
            className={`w-full flex items-center justify-between p-3 rounded-xl text-left transition-all border text-xs font-medium ${
              !selectedTestClass ? chipActive : chipIdle
            }`}
          >
            <span className="truncate mr-2">Все тесты</span>
            <span
              className={`text-[11px] font-medium tabular-nums px-2 py-0.5 rounded-md shrink-0 ${
                !selectedTestClass
                  ? 'bg-white/15 dark:bg-zinc-900/10'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
              }`}
            >
              {tests.length}
            </span>
          </button>
          <div className="flex flex-col gap-1.5 overflow-y-auto max-h-[350px] md:max-h-[550px] pr-1">
            {filteredClasses.map((cls) => {
              const count = tests.filter((t) => (t.target_class || 'Без раздела') === cls).length;
              const active = selectedTestClass === cls;
              return (
                <button
                  key={cls}
                  type="button"
                  onClick={() => {
                    setSelectedTestClass(cls);
                    setSelectedTestTopic('Все');
                    setTestSearchTerm('');
                  }}
                  className={`w-full flex items-center justify-between p-3 rounded-xl text-left transition-all border text-xs font-medium ${
                    active ? chipActive : chipIdle
                  }`}
                >
                  <span className="truncate mr-2">{cls}</span>
                  <span
                    className={`text-[11px] font-medium tabular-nums px-2 py-0.5 rounded-md shrink-0 ${
                      active ? 'bg-white/15 dark:bg-zinc-900/10' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        <main
          className={`flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto ${
            !selectedTestClass ? 'hidden md:flex flex-col justify-center' : 'block'
          }`}
        >
          {!selectedTestClass && tests.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center gap-3 py-12">
              <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800 text-zinc-400">
                <BookOpen size={20} />
              </div>
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Нет тестов</p>
              <p className="text-sm text-zinc-500 max-w-xs">Создайте первый тест в конструкторе</p>
            </div>
          ) : !selectedTestClass ? (
            <div className="h-full flex flex-col items-center justify-center text-center gap-3 py-12">
              <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800 text-zinc-400">
                <BookOpen size={20} />
              </div>
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Выберите раздел</p>
              <p className="text-sm text-zinc-500 max-w-xs">В левой панели находятся разделы с созданными тестами</p>
            </div>
          ) : (
            <div className="space-y-4 md:space-y-6 animate-in fade-in duration-300">
              <div className="flex flex-col gap-3 pb-4 border-b border-zinc-100 dark:border-zinc-800/60">
                <div className="flex items-center gap-1.5 flex-wrap text-xs font-medium text-zinc-500">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTestClass(null);
                      setSelectedTestTopic('Все');
                    }}
                    className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800 px-2.5 py-1.5 rounded-lg md:hidden mr-1"
                  >
                    <ChevronRight size={12} className="rotate-180" /> Назад
                  </button>
                  <span className="bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 px-2 py-1 rounded-md border border-zinc-200 dark:border-zinc-800">
                    {selectedTestClass}
                  </span>
                </div>
                <div className="relative w-full">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="Поиск теста..."
                    value={testSearchTerm}
                    onChange={(e) => setTestSearchTerm(e.target.value)}
                    className={`${fieldClass} pl-9 text-xs`}
                  />
                </div>
              </div>
              {topics.length > 0 && (
                <div className="flex gap-1.5 overflow-x-auto pb-1">
                  <button
                    type="button"
                    onClick={() => setSelectedTestTopic('Все')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all border ${
                      selectedTestTopic === 'Все' ? chipActive : chipIdle
                    }`}
                  >
                    Все (
                    {tests.filter((t) => (t.target_class || 'Без раздела') === selectedTestClass).length})
                  </button>
                  {topics.map((topic) => (
                    <button
                      key={topic}
                      type="button"
                      onClick={() => setSelectedTestTopic(topic)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all border ${
                        selectedTestTopic === topic ? chipActive : chipIdle
                      }`}
                    >
                      {topic} (
                      {
                        tests.filter(
                          (t) =>
                            (t.target_class || 'Без раздела') === selectedTestClass &&
                            (t.target_topic || 'Без темы') === topic
                        ).length
                      }
                      )
                    </button>
                  ))}
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                {filteredTests.map((test) => (
                  <div
                    key={test.id}
                    className="bg-zinc-50 dark:bg-zinc-900/40 p-4 sm:p-5 rounded-2xl border border-zinc-100 dark:border-zinc-800 flex flex-col min-w-0"
                  >
                    <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-2 text-sm line-clamp-2 break-words tracking-tight">
                      {test.title}
                    </h3>
                    <div className="flex gap-1.5 mb-3 flex-wrap min-w-0">
                      {test.target_class && (
                        <span className="text-[10px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 px-2 py-0.5 rounded-md">
                          {test.target_class}
                        </span>
                      )}
                      {test.target_topic && (
                        <span className="text-[10px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 px-2 py-0.5 rounded-md truncate max-w-[120px]">
                          {test.target_topic}
                        </span>
                      )}
                      <span className="text-[10px] font-medium bg-white dark:bg-zinc-900 text-zinc-500 px-2 py-0.5 rounded-md border border-zinc-200 dark:border-zinc-800 tabular-nums">
                        {test.tasks?.length || 0} зад.
                      </span>
                    </div>
                    <div className="flex gap-1.5 mb-3 flex-wrap min-w-0">
                      {test.time_limit_minutes != null && (
                        <span className="text-[10px] font-medium text-zinc-500 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-2 py-0.5 rounded-md tabular-nums">
                          {test.time_limit_minutes} мин
                        </span>
                      )}
                      {test.max_attempts != null && (
                        <span className="text-[10px] font-medium text-zinc-500 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-2 py-0.5 rounded-md tabular-nums">
                          ×{test.max_attempts}
                        </span>
                      )}
                      {test.allow_interruptions === false && (
                        <span className="text-[10px] font-medium text-zinc-500 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-2 py-0.5 rounded-md">
                          Без прерываний
                        </span>
                      )}
                      {test.exam_start && (
                        <span className="text-[10px] font-medium text-zinc-500 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-2 py-0.5 rounded-md">
                          Экзамен
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-h-0" />
                    <div className="flex gap-1.5 mt-auto min-w-0">
                      <button
                        type="button"
                        onClick={() => onEdit(test)}
                        className={`${secondaryBtnClass} flex-1 min-w-0 text-xs py-2`}
                      >
                        <Edit3 size={12} className="shrink-0" />
                        <span className="hidden sm:inline truncate">Изменить</span>
                        <span className="sm:hidden truncate">Ред.</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onManage(test)}
                        className={`${secondaryBtnClass} flex-1 min-w-0 text-xs py-2`}
                      >
                        <Users size={12} className="shrink-0" />
                        <span className="hidden sm:inline truncate">Управление</span>
                        <span className="sm:hidden truncate">Упр.</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(test.id)}
                        className="p-2 rounded-xl bg-white dark:bg-zinc-900 text-zinc-400 border border-zinc-200 dark:border-zinc-800 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 transition-colors shrink-0"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </Sheet>
    </div>
  );
}
