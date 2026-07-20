import React from 'react';
import { BookOpen, PlusCircle, Edit3, Trash2 } from 'lucide-react';
import { TheoryViewer } from '../../components/Theory';
import { MAIN_TOPICS } from './constants';

export default function TheoryBankTab({ groupedTheory, selectedTopic, setSelectedTopic, selectedSection, setSelectedSection, filteredTheory, onEditTheory, onDeleteTheory, onAddNew }) {
  return (
    <div className="bg-white rounded-[3rem] shadow-xl border border-slate-200 overflow-hidden min-h-[600px] flex flex-col md:flex-row">
      <aside className="w-full md:w-80 bg-slate-50 border-b md:border-b-0 md:border-r border-slate-100 p-4 md:p-8 flex flex-col gap-6 md:gap-8">
        <div>
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 md:mb-4 italic">Темы</h3>
          <div className="flex flex-row md:flex-col gap-2 overflow-x-auto md:overflow-x-visible pb-2 md:pb-0">
            {Object.entries(MAIN_TOPICS).map(([key, label]) => (
              <button key={key} onClick={() => { setSelectedTopic(key); setSelectedSection(null); }}
                className={`shrink-0 md:shrink p-3 md:p-4 rounded-2xl text-left font-black text-xs transition-all ${selectedTopic === key ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-slate-500 border border-slate-100'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>
        {selectedTopic && groupedTheory[selectedTopic] && (
          <div>
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 md:mb-4 italic">Разделы</h3>
            <div className="grid grid-cols-1 gap-2">
              {Object.keys(groupedTheory[selectedTopic]).map(section => (
                <button key={section} onClick={() => setSelectedSection(selectedSection === section ? null : section)}
                  className={`p-3 rounded-xl font-black text-[10px] transition-all text-left ${selectedSection === section ? 'bg-slate-800 text-white' : 'bg-slate-200/50 text-slate-500 hover:bg-slate-200'}`}>
                  {section} <span className="ml-2 text-[8px] opacity-70">({groupedTheory[selectedTopic][section].length})</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </aside>
      <main className="flex-1 p-4 md:p-10 overflow-y-auto">
        {!selectedTopic ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-300 italic font-black text-xs tracking-widest gap-4 py-20">
            <BookOpen size={48} className="opacity-10" /> Выберите тему
          </div>
        ) : !selectedSection ? (
          <div className="space-y-6">
            {filteredTheory.map(({ section, theories }) => (
              <div key={section} className="border-b border-slate-100 pb-6">
                <h3 className="text-xl font-black text-slate-800 mb-4">{section}</h3>
                <div className="grid gap-4">
                  {theories.map(theory => (
                    <div key={theory.id} className="p-6 bg-slate-50 rounded-2xl hover:shadow-lg transition-all">
                      <div className="flex justify-between items-start mb-4">
                        <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">ID: {theory.id}</span>
                        <div className="flex gap-2">
                          <button onClick={() => onEditTheory(theory)} className="p-2 bg-white rounded-xl text-slate-400 hover:text-blue-600 transition-all"><Edit3 size={16} /></button>
                          <button onClick={() => onDeleteTheory(theory.id)} className="p-2 bg-white rounded-xl text-slate-400 hover:text-red-500 transition-all"><Trash2 size={16} /></button>
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
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black text-slate-800 uppercase italic">{selectedSection}</h2>
              <button onClick={onAddNew}
                className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase hover:bg-blue-700 transition-all flex items-center gap-2">
                <PlusCircle size={16} /> Добавить теорию
              </button>
            </div>
            {filteredTheory.map(theory => (
              <div key={theory.id} className="p-8 bg-slate-50 rounded-[2rem] hover:shadow-xl transition-all">
                <div className="flex justify-between items-start mb-6">
                  <span className="text-[10px] font-black text-blue-600 bg-blue-100 px-3 py-1.5 rounded-full">Версия {theory.id}</span>
                  <div className="flex gap-2">
                    <button onClick={() => onEditTheory(theory)} className="p-3 bg-white rounded-xl text-slate-400 hover:text-blue-600 transition-all shadow-sm"><Edit3 size={18} /></button>
                    <button onClick={() => onDeleteTheory(theory.id)} className="p-3 bg-white rounded-xl text-slate-400 hover:text-red-500 transition-all shadow-sm"><Trash2 size={18} /></button>
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
    </div>
  );
}
