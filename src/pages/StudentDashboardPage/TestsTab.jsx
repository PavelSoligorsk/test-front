import React from 'react';
import { BookOpen, Search, Filter, XCircle, ChevronRight } from 'lucide-react';
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
}) {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-4 md:space-y-6 max-w-7xl mx-auto px-2 sm:px-4 md:px-0">
      {/* Top panel */}
      <div className="bg-white rounded-2xl md:rounded-[2.5rem] p-4 md:p-6 shadow-sm border border-slate-100/80">
        <div className="w-full flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-0.5 md:space-y-1">
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 uppercase italic tracking-tighter">
              Доступные тесты
            </h2>
            <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {typeFilteredTests.length} тестов доступно
            </p>
          </div>
          <button onClick={() => {
            const filters = ['all', 'public', 'teacher', 'ai'];
            const ci = filters.indexOf(testTypeFilter);
            setTestTypeFilter(filters[(ci + 1) % filters.length]);
          }} className={`w-full sm:w-auto px-5 py-3 sm:py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 active:scale-95 flex items-center justify-center gap-2 border select-none shrink-0 ${
            testTypeFilter === 'all' ? 'bg-slate-900 text-white border-transparent shadow-lg shadow-slate-900/20'
            : testTypeFilter === 'public' ? 'bg-blue-600 text-white border-transparent shadow-lg shadow-blue-600/20'
            : testTypeFilter === 'teacher' ? 'bg-emerald-600 text-white border-transparent shadow-lg shadow-emerald-600/20'
            : 'bg-purple-600 text-white border-transparent shadow-lg shadow-purple-600/20'
          }`}>
            {testTypeFilter === 'all' && <span>Все ({allTests.length})</span>}
            {testTypeFilter === 'public' && <span>Общие ({publicStaticTests.length})</span>}
            {testTypeFilter === 'teacher' && <span>Учительские ({teacherTests.length})</span>}
            {testTypeFilter === 'ai' && <span>AI ({aiTestsMapped.length})</span>}
          </button>
        </div>
      </div>

      {/* Main */}
      <div className="bg-white rounded-2xl md:rounded-[2.5rem] shadow-sm border border-slate-100/80 overflow-hidden flex flex-col md:flex-row min-h-[450px] md:min-h-[550px]">
        {/* Sidebar */}
        <aside className={`w-full md:w-64 bg-slate-50/60 border-b md:border-b-0 md:border-r border-slate-100 p-4 md:p-5 flex flex-col gap-3 ${selectedClass ? 'hidden md:flex' : 'flex'}`}>
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Filter size={14} /> Разделы
            </h3>
            <span className="text-[10px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-100 shadow-sm">{uniqueClasses.length}</span>
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Поиск раздела..." value={classSearch}
              onChange={e => setClassSearch(e.target.value)}
              className="w-full bg-white border border-slate-200 py-2.5 pl-9 pr-4 rounded-xl text-xs font-bold outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-slate-400 placeholder:font-normal" />
          </div>
          <div className="flex flex-col gap-1.5 overflow-y-auto max-h-[350px] md:max-h-[550px] pr-1 scrollbar-thin">
            {uniqueClasses.length > 0 ? uniqueClasses.map(cls => {
              const count = typeFilteredTests.filter(t => (t.target_class || 'Общие') === cls).length;
              const isActive = selectedClass === cls;
              return (
                <button key={cls} onClick={() => { setSelectedClass(cls); setSelectedSubject('Все'); setTestSearch(''); }}
                  className={`w-full flex items-center justify-between p-3 rounded-xl text-left transition-all border ${isActive ? 'bg-slate-800 text-white border-transparent shadow-md shadow-slate-700/20' : 'bg-white text-slate-600 border-slate-100 hover:border-slate-200 hover:bg-slate-50/50'}`}>
                  <span className="font-extrabold text-xs uppercase truncate mr-2">{cls}</span>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-md shrink-0 ${isActive ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-400'}`}>{count}</span>
                </button>
              );
            }) : (
              <p className="text-xs font-bold text-slate-400 text-center py-8 italic">{classSearch ? 'Ничего не найдено' : 'Нет разделов'}</p>
            )}
          </div>
        </aside>

        {/* Content */}
        <main className={`flex-1 p-4 md:p-6 lg:p-8 bg-white overflow-y-auto ${!selectedClass ? 'hidden md:flex flex-col justify-center' : 'block'}`}>
          {!selectedClass ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4 py-12">
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl md:rounded-[2rem] bg-slate-50 flex items-center justify-center border border-slate-100">
                <BookOpen size={32} className="text-blue-400/70" />
              </div>
              <div>
                <h3 className="text-base md:text-lg font-black uppercase text-slate-400 tracking-tight">Выберите раздел</h3>
                <p className="text-xs font-bold text-slate-300 mt-1 max-w-xs mx-auto">В левой панели находятся разделы с доступными проверочными тестами</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4 md:space-y-6 animate-in fade-in duration-300">
              <div className="flex flex-col gap-3 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-1.5 flex-wrap text-[10px] md:text-xs font-black uppercase text-slate-400">
                  <button onClick={() => { setSelectedClass(null); setSelectedSubject('Все'); }}
                    className="flex items-center gap-1 bg-slate-100 text-slate-700 hover:bg-slate-200 px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all md:hidden mr-1">
                    <ChevronRight size={12} className="rotate-180" /> Назад
                  </button>
                  {testTypeFilter !== 'all' && (
                    <><span className={`px-2 py-1 rounded-md ${testTypeFilter === 'public' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}>
                      {testTypeFilter === 'public' ? '🌐 Общие' : '👨‍🏫 Учительские'}
                    </span><ChevronRight size={12} className="text-slate-300" /></>
                  )}
                  <span className="bg-blue-50 text-blue-600 px-2 py-1 rounded-md">{selectedClass}</span>
                  {selectedSubject !== 'Все' && <><ChevronRight size={12} className="text-slate-300" /><span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-md">{selectedSubject}</span></>}
                </div>
                <div className="relative w-full">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="text" placeholder="Поиск теста по названию..." value={testSearch}
                    onChange={e => setTestSearch(e.target.value)}
                    className="w-full pl-9 pr-9 py-2.5 bg-slate-50 border border-slate-100 focus:border-blue-400 focus:bg-white rounded-xl text-xs font-bold uppercase tracking-wide outline-none transition-all placeholder:text-slate-400 placeholder:font-normal" />
                  {testSearch && (
                    <button onClick={() => setTestSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><XCircle size={14} /></button>
                  )}
                </div>
              </div>
              {selectedClass && subjects.length > 1 && (
                <div className="overflow-x-auto scrollbar-none -mx-4 px-4 md:mx-0 md:px-0 pb-1">
                  <div className="flex gap-1.5">
                    {subjects.map(subject => (
                      <button key={subject} onClick={() => setSelectedSubject(subject)}
                        className={`px-3.5 py-2 rounded-xl text-[10px] md:text-xs font-black uppercase whitespace-nowrap transition-all border ${selectedSubject === subject ? 'bg-slate-800 text-white border-transparent shadow-sm' : 'bg-slate-50 text-slate-500 border-slate-100 hover:bg-slate-100'}`}>
                        {subject === 'Все' ? '📚 Все темы' : subject}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {searchedTests.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                  {searchedTests.map(test => (
                    <TestCard key={`${test.type}-${test.id}`} test={test} type={test.type} onStart={handleStartTest} disabled={test.is_completed} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 space-y-3">
                  <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto border border-slate-100"><Search size={22} className="text-slate-300" /></div>
                  <div>
                    <p className="font-black text-slate-400 uppercase text-xs md:text-sm">{testSearch ? 'Ничего не найдено' : 'Нет тестов'}</p>
                    <p className="text-[10px] font-bold text-slate-300 uppercase mt-0.5">{testSearch ? 'Попробуйте изменить поисковый запрос' : 'В этой категории пока нет заданий'}</p>
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
