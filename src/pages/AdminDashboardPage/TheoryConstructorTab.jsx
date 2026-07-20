import React from 'react';
import { Send } from 'lucide-react';
import ImageAwareTextarea from './ImageAwareTextarea';
import { TheoryViewer } from '../../components/Theory';
import { MAIN_TOPICS, SECTIONS_BY_TOPIC } from './constants';

export default function TheoryConstructorTab({ theoryData, setTheoryData, onSubmit }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
      <div className="bg-white p-10 rounded-[3rem] shadow-xl border border-slate-100 space-y-6">
        <h2 className="text-2xl font-black text-slate-800 uppercase italic">
          {theoryData.id ? `Редактор теории #${theoryData.id}` : 'Конструктор теории'}
        </h2>
        <form onSubmit={onSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <label className="block space-y-1">
              <span className="text-[10px] font-black text-slate-400 uppercase ml-2">Тема</span>
              <select className="w-full p-3 bg-slate-50 border-none rounded-xl font-bold text-sm"
                value={theoryData.topic} onChange={e => setTheoryData({ ...theoryData, topic: e.target.value, section: '' })} required>
                <option value="">— Выберите тему —</option>
                {Object.entries(MAIN_TOPICS).map(([key, label]) => (<option key={key} value={key}>{label}</option>))}
              </select>
            </label>
            <label className="block space-y-1">
              <span className="text-[10px] font-black text-slate-400 uppercase ml-2">Раздел</span>
              <select className="w-full p-3 bg-slate-50 border-none rounded-xl font-bold text-sm"
                value={theoryData.section} onChange={e => setTheoryData({ ...theoryData, section: e.target.value })} disabled={!theoryData.topic} required>
                <option value="">— Выберите раздел —</option>
                {theoryData.topic && SECTIONS_BY_TOPIC[theoryData.topic]?.map(section => (<option key={section} value={section}>{section}</option>))}
              </select>
            </label>
          </div>
          <label className="block space-y-1">
            <span className="text-[10px] font-black text-slate-400 uppercase ml-2">Содержание (Markdown + MDX компоненты)</span>
            <ImageAwareTextarea value={theoryData.content}
              onChange={(value) => setTheoryData({ ...theoryData, content: value })}
              placeholder={`# Заголовок\n\n<LessonSection title="Основные понятия">\n  <Definition>Здесь будет определение...</Definition>\n  <Example>Пример...</Example>\n  <Explanation>Пояснение...</Explanation>\n</LessonSection>`}
              className="w-full p-6 bg-slate-50 border-none rounded-[2rem] min-h-[400px] font-mono text-sm resize-y" rows={15} />
          </label>
          <button type="submit" className="w-full bg-slate-900 text-white py-6 rounded-[2rem] font-black hover:bg-black transition-all shadow-2xl flex items-center justify-center gap-3">
            <Send size={20} /> {theoryData.id ? 'ОБНОВИТЬ ТЕОРИЮ' : 'СОЗДАТЬ ТЕОРИЮ'}
          </button>
        </form>
      </div>
      <div className="space-y-6 sticky top-6 overflow-y-auto max-h-[calc(100vh-100px)]">
        <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">ПРЕДПРОСМОТР ТЕОРИИ</h3>
          <TheoryViewer content={theoryData.content} />
        </div>
      </div>
    </div>
  );
}
