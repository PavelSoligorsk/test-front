import React, { useState } from 'react';
import { PlusCircle, Search, BookOpen, Filter, ChevronRight, Edit3, Users, Trash2, XCircle } from 'lucide-react';

export default function TestsListTab({ tests, onEdit, onDelete, onManage, onCreateClick }) {
  const [selectedTestClass, setSelectedTestClass] = useState(null);
  const [selectedTestTopic, setSelectedTestTopic] = useState("Все");
  const [testClassSearch, setTestClassSearch] = useState("");
  const [testSearchTerm, setTestSearchTerm] = useState("");

  const classes = [...new Set(tests.map((t) => t.target_class || "Без раздела"))].sort();
  const filteredClasses = classes.filter((cls) => cls.toLowerCase().includes(testClassSearch.toLowerCase()));

  const filteredTests = tests.filter((t) => {
    const matchClass = !selectedTestClass || (t.target_class || "Без раздела") === selectedTestClass;
    const matchTopic = selectedTestTopic === "Все" || (t.target_topic || "Без темы") === selectedTestTopic;
    const matchSearch = t.title.toLowerCase().includes(testSearchTerm.toLowerCase());
    return matchClass && matchTopic && matchSearch;
  });

  const topics = selectedTestClass ? [...new Set(tests.filter((t) => (t.target_class || "Без раздела") === selectedTestClass).map((t) => t.target_topic || "Без темы"))].sort() : [];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-4 md:space-y-6 max-w-7xl mx-auto px-2 sm:px-4 md:px-0">
      <div className="bg-slate-800/50 rounded-2xl md:rounded-[2.5rem] p-4 md:p-6 shadow-sm border border-slate-700">
        <div className="w-full flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-0.5 md:space-y-1">
            <h2 className="text-2xl md:text-3xl font-black text-white uppercase italic tracking-tighter">Мои тесты</h2>
            <p className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />{tests.length} тестов создано
            </p>
          </div>
          <button onClick={onCreateClick} className="w-full sm:w-auto px-5 py-3 sm:py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 active:scale-95 flex items-center justify-center gap-2 border select-none shrink-0 bg-emerald-500 text-white border-transparent shadow-lg shadow-emerald-500/20 hover:bg-emerald-600">
            <PlusCircle size={16} /> <span>Создать тест</span>
          </button>
        </div>
      </div>

      <div className="bg-slate-800/50 rounded-2xl md:rounded-[2.5rem] shadow-sm border border-slate-700 overflow-hidden flex flex-col md:flex-row min-h-[450px] md:min-h-[550px]">
        <aside className={`w-full md:w-64 bg-slate-800 border-b md:border-b-0 md:border-r border-slate-700 p-4 md:p-5 flex flex-col gap-3 ${selectedTestClass ? 'hidden md:flex' : 'flex'}`}>
          <h3 className="text-[10px] md:text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><Filter size={14} className="text-slate-500" /> Разделы</h3>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input type="text" placeholder="Поиск раздела..." value={testClassSearch} onChange={(e) => setTestClassSearch(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 py-2.5 pl-9 pr-4 rounded-xl text-xs font-bold text-slate-100 outline-none focus:border-emerald-500 transition-all placeholder:text-slate-500" />
          </div>
          <button onClick={() => { setSelectedTestClass(null); setSelectedTestTopic("Все"); setTestSearchTerm(""); }}
            className={`w-full flex items-center justify-between p-3 rounded-xl text-left transition-all border ${!selectedTestClass ? 'bg-emerald-500 text-white border-transparent shadow-md' : 'bg-slate-700 text-slate-300 border-slate-600 hover:border-slate-500'}`}>
            <span className="font-extrabold text-xs uppercase truncate mr-2">📚 Все тесты</span>
            <span className={`text-[10px] font-black px-2 py-0.5 rounded-md shrink-0 ${!selectedTestClass ? 'bg-emerald-600 text-white' : 'bg-slate-600 text-slate-400'}`}>{tests.length}</span>
          </button>
          <div className="flex flex-col gap-1.5 overflow-y-auto max-h-[350px] md:max-h-[550px] pr-1">
            {filteredClasses.map((cls) => {
              const count = tests.filter((t) => (t.target_class || "Без раздела") === cls).length;
              return (
                <button key={cls} onClick={() => { setSelectedTestClass(cls); setSelectedTestTopic("Все"); setTestSearchTerm(""); }}
                  className={`w-full flex items-center justify-between p-3 rounded-xl text-left transition-all border ${selectedTestClass === cls ? 'bg-emerald-500 text-white border-transparent shadow-md' : 'bg-slate-700 text-slate-300 border-slate-600 hover:border-slate-500'}`}>
                  <span className="font-extrabold text-xs uppercase truncate mr-2">{cls}</span>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-md shrink-0 ${selectedTestClass === cls ? 'bg-emerald-600 text-white' : 'bg-slate-600 text-slate-400'}`}>{count}</span>
                </button>
              );
            })}
          </div>
        </aside>

        <main className={`flex-1 p-4 md:p-6 lg:p-8 bg-slate-800/30 overflow-y-auto ${!selectedTestClass ? 'hidden md:flex flex-col justify-center' : 'block'}`}>
          {!selectedTestClass && tests.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4 py-12">
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl md:rounded-[2rem] bg-slate-700 flex items-center justify-center border border-slate-600"><BookOpen size={32} className="text-slate-500" /></div>
              <div><h3 className="text-base md:text-lg font-black uppercase text-slate-400 tracking-tight">Нет тестов</h3><p className="text-xs font-bold text-slate-500 mt-1 max-w-xs mx-auto">Создайте первый тест в конструкторе</p></div>
            </div>
          ) : !selectedTestClass ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4 py-12">
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl md:rounded-[2rem] bg-slate-700 flex items-center justify-center border border-slate-600"><BookOpen size={32} className="text-slate-500" /></div>
              <div><h3 className="text-base md:text-lg font-black uppercase text-slate-400 tracking-tight">Выберите раздел</h3><p className="text-xs font-bold text-slate-500 mt-1 max-w-xs mx-auto">В левой панели находятся разделы с созданными тестами</p></div>
            </div>
          ) : (
            <div className="space-y-4 md:space-y-6 animate-in fade-in duration-300">
              <div className="flex flex-col gap-3 pb-4 border-b border-slate-700">
                <div className="flex items-center gap-1.5 flex-wrap text-[10px] md:text-xs font-black uppercase text-slate-500">
                  <button onClick={() => { setSelectedTestClass(null); setSelectedTestTopic("Все"); }} className="flex items-center gap-1 bg-slate-700 text-slate-300 hover:bg-slate-600 px-2.5 py-1.5 rounded-lg md:hidden mr-1"><ChevronRight size={12} className="rotate-180" /> Назад</button>
                  <span className="bg-slate-700 text-emerald-400 px-2 py-1 rounded-md">{selectedTestClass}</span>
                </div>
                <div className="relative w-full">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input type="text" placeholder="Поиск теста..." value={testSearchTerm} onChange={(e) => setTestSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-9 py-2.5 bg-slate-700 border border-slate-600 focus:border-emerald-500 rounded-xl text-xs font-bold text-slate-100 uppercase tracking-wide outline-none transition-all placeholder:text-slate-500" />
                </div>
              </div>
              {topics.length > 0 && (
                <div className="flex gap-1.5 overflow-x-auto pb-1">
                  <button onClick={() => setSelectedTestTopic("Все")} className={`px-3.5 py-2 rounded-xl text-[10px] md:text-xs font-black uppercase whitespace-nowrap transition-all border ${selectedTestTopic === "Все" ? 'bg-emerald-500 text-white border-transparent shadow-sm' : 'bg-slate-700 text-slate-300 border-slate-600 hover:bg-slate-600'}`}>
                    📚 Все ({tests.filter((t) => (t.target_class || "Без раздела") === selectedTestClass).length})
                  </button>
                  {topics.map((topic) => (
                    <button key={topic} onClick={() => setSelectedTestTopic(topic)} className={`px-3.5 py-2 rounded-xl text-[10px] md:text-xs font-black uppercase whitespace-nowrap transition-all border ${selectedTestTopic === topic ? 'bg-emerald-500 text-white border-transparent shadow-sm' : 'bg-slate-700 text-slate-300 border-slate-600 hover:bg-slate-600'}`}>
                      {topic} ({tests.filter((t) => (t.target_class || "Без раздела") === selectedTestClass && (t.target_topic || "Без темы") === topic).length})
                    </button>
                  ))}
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                {filteredTests.map((test) => (
                  <div key={test.id} className="bg-slate-700/50 p-4 sm:p-5 md:p-6 rounded-2xl border border-slate-600 hover:shadow-xl hover:border-slate-500 transition-all group flex flex-col min-w-0">
                    <h3 className="font-black text-slate-200 mb-2 text-xs sm:text-sm line-clamp-2 break-words">{test.title}</h3>
                    <div className="flex gap-1 sm:gap-1.5 mb-3 flex-wrap min-w-0">
                      {test.target_class && <span className="text-[7px] sm:text-[8px] md:text-[9px] font-black bg-emerald-900/30 text-emerald-400 px-1.5 sm:px-2 py-0.5 rounded-md whitespace-nowrap">{test.target_class}</span>}
                      {test.target_topic && <span className="text-[7px] sm:text-[8px] md:text-[9px] font-black bg-blue-900/30 text-blue-400 px-1.5 sm:px-2 py-0.5 rounded-md whitespace-nowrap truncate max-w-[120px]">{test.target_topic}</span>}
                      <span className="text-[7px] sm:text-[8px] md:text-[9px] bg-slate-700 text-slate-400 px-1.5 sm:px-2 py-0.5 rounded-md border border-slate-600 whitespace-nowrap">{test.tasks?.length || 0} зад.</span>
                    </div>
                    <div className="flex-1 min-h-0" />
                    <div className="flex gap-0.5 sm:gap-1 md:gap-1.5 mt-auto min-w-0">
                      <button onClick={() => onEdit(test)} className="flex-1 min-w-0 p-1 sm:p-1.5 md:p-2 bg-slate-700 text-slate-300 rounded-lg sm:rounded-xl text-[7px] sm:text-[8px] md:text-[10px] font-black hover:bg-emerald-500 hover:text-white transition-all flex items-center justify-center gap-0.5 border border-slate-600">
                        <Edit3 size={9} className="sm:w-3 sm:h-3 md:w-3.5 md:h-3.5 shrink-0" /> <span className="hidden sm:inline truncate">Изменить</span><span className="sm:hidden truncate">Ред.</span>
                      </button>
                      <button onClick={() => onManage(test)} className="flex-1 min-w-0 p-1 sm:p-1.5 md:p-2 bg-blue-900/30 text-blue-400 rounded-lg sm:rounded-xl text-[7px] sm:text-[8px] md:text-[10px] font-black hover:bg-blue-700/50 transition-all flex items-center justify-center gap-0.5">
                        <Users size={9} className="sm:w-3 sm:h-3 md:w-3.5 md:h-3.5 shrink-0" /> <span className="hidden sm:inline truncate">Управление</span><span className="sm:hidden truncate">Упр.</span>
                      </button>
                      <button onClick={() => onDelete(test.id)} className="p-1 sm:p-1.5 md:p-2 bg-slate-700 text-slate-400 rounded-lg sm:rounded-xl hover:bg-red-900/30 hover:text-red-400 transition-all border border-slate-600 shrink-0"><Trash2 size={9} className="sm:w-3 sm:h-3 md:w-3.5 md:h-3.5" /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
