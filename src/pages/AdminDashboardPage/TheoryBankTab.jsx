import React from 'react';
import { BookOpen, PlusCircle, Edit3, Trash2, Inbox } from 'lucide-react';
import { TheoryViewer } from '../../components/Theory';
import { MAIN_TOPICS } from './constants';
import { Sheet, IconWell, primaryBtnClass, secondaryBtnClass } from '../../shared/ui';

export default function TheoryBankTab({ groupedTheory, selectedTopic, setSelectedTopic, selectedSection, setSelectedSection, filteredTheory, onEditTheory, onDeleteTheory, onAddNew }) {
  return (
    <Sheet className="overflow-hidden min-h-[600px] flex flex-col md:flex-row animate-in fade-in slide-in-from-bottom-4 duration-500">
      <aside className="w-full md:w-80 bg-zinc-50 dark:bg-zinc-900/40 border-b md:border-b-0 md:border-r border-zinc-100 dark:border-zinc-800/60 p-4 md:p-6 flex flex-col gap-6">
        <div>
          <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-3">Темы</h3>
          <div className="flex flex-row md:flex-col gap-2 overflow-x-auto md:overflow-x-visible pb-2 md:pb-0">
            {Object.entries(MAIN_TOPICS).map(([key, label]) => (
              <button key={key} type="button" onClick={() => { setSelectedTopic(key); setSelectedSection(null); }}
                className={`shrink-0 md:shrink p-3 rounded-xl text-left text-sm font-medium transition-colors ${
                  selectedTopic === key
                    ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-950'
                    : 'bg-white dark:bg-[#09090b] text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800'
                }`}>
                {label}
              </button>
            ))}
          </div>
        </div>
        {selectedTopic && groupedTheory[selectedTopic] && (
          <div>
            <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-3">Разделы</h3>
            <div className="grid grid-cols-1 gap-2">
              {Object.keys(groupedTheory[selectedTopic]).map(section => (
                <button key={section} type="button"
                  onClick={() => setSelectedSection(selectedSection === section ? null : section)}
                  className={`p-3 rounded-xl text-sm font-medium transition-colors text-left ${
                    selectedSection === section
                      ? 'bg-zinc-800 dark:bg-zinc-200 text-white dark:text-zinc-950'
                      : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800'
                  }`}>
                  {section}{' '}
                  <span className="text-xs opacity-70">({groupedTheory[selectedTopic][section].length})</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </aside>
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        {!selectedTopic ? (
          <div className="h-full flex flex-col items-center justify-center gap-3 py-20 text-zinc-400">
            <div className="w-12 h-12 rounded-xl border border-zinc-200 dark:border-zinc-800 flex items-center justify-center">
              <BookOpen size={20} />
            </div>
            <p className="text-sm font-medium text-zinc-500">Выберите тему</p>
            <p className="text-sm text-zinc-400">Список разделов появится слева</p>
          </div>
        ) : !selectedSection ? (
          <div className="space-y-6">
            {filteredTheory.map(({ section, theories }) => (
              <div key={section} className="border-b border-zinc-100 dark:border-zinc-800/60 pb-6 last:border-0">
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight mb-4">{section}</h3>
                <div className="grid gap-4">
                  {theories.map(theory => (
                    <div key={theory.id} className="p-5 md:p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800/60 bg-white dark:bg-[#09090b]">
                      <div className="flex justify-between items-start mb-4">
                        <span className="text-xs font-medium text-zinc-500 bg-zinc-100 dark:bg-zinc-900 px-2 py-1 rounded-lg tabular-nums">
                          ID: {theory.id}
                        </span>
                        <div className="flex gap-1">
                          <button type="button" onClick={() => onEditTheory(theory)}
                            className="p-2 rounded-xl text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors">
                            <Edit3 size={16} />
                          </button>
                          <button type="button" onClick={() => onDeleteTheory(theory.id)}
                            className="p-2 rounded-xl text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                      <div className="[&_.max-w-3xl]:max-w-full [&_.max-w-3xl]:w-full [&_.mx-auto]:ml-0 [&_.mx-auto]:mr-0">
                        <TheoryViewer content={theory.content} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {filteredTheory.length === 0 && (
              <div className="flex flex-col items-center gap-3 py-16 text-zinc-400">
                <div className="w-12 h-12 rounded-xl border border-zinc-200 dark:border-zinc-800 flex items-center justify-center">
                  <Inbox size={20} />
                </div>
                <p className="text-sm font-medium text-zinc-500">Нет материалов</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-2">
              <div className="flex items-center gap-4">
                <IconWell><BookOpen size={18} strokeWidth={2} /></IconWell>
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">{selectedSection}</h2>
              </div>
              <button type="button" onClick={onAddNew} className={primaryBtnClass}>
                <PlusCircle size={16} /> Добавить теорию
              </button>
            </div>
            {filteredTheory.map(theory => (
              <div key={theory.id} className="p-6 md:p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800/60 bg-zinc-50/50 dark:bg-zinc-900/30">
                <div className="flex justify-between items-start mb-6">
                  <span className="text-xs font-medium text-zinc-500 bg-zinc-100 dark:bg-zinc-900 px-3 py-1.5 rounded-xl tabular-nums">
                    Версия {theory.id}
                  </span>
                  <div className="flex gap-1">
                    <button type="button" onClick={() => onEditTheory(theory)} className={secondaryBtnClass}>
                      <Edit3 size={16} />
                    </button>
                    <button type="button" onClick={() => onDeleteTheory(theory.id)}
                      className="p-2.5 rounded-xl text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <div className="[&_.max-w-3xl]:max-w-full [&_.max-w-3xl]:w-full [&_.mx-auto]:ml-0 [&_.mx-auto]:mr-0">
                  <TheoryViewer content={theory.content} />
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </Sheet>
  );
}
