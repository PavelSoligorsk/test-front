import React from 'react';
import { Send, PlusCircle } from 'lucide-react';
import ImageAwareTextarea from './ImageAwareTextarea';
import { MarkdownPreview } from './MarkdownPreview';
import { MAIN_TOPICS, SECTIONS_BY_TOPIC } from './constants';

export default function TaskForm({ taskData, setTaskData, onSubmit, onCancel }) {
  const handleTopicChange = (topicKey) => {
    setTaskData({ ...taskData, topic: topicKey, section: '' });
  };

  return (
    <div className="bg-white p-10 rounded-[3rem] shadow-xl border border-slate-100 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-black text-slate-800 uppercase italic">
          {taskData.id ? `Редактор #${taskData.id}` : 'Конструктор'}
        </h2>
        <div className="flex bg-slate-100 p-1 rounded-2xl gap-1 sm:gap-2">
          <button type="button" onClick={() => setTaskData({ ...taskData, is_open_answer: true })}
            className={`flex-1 sm:flex-none px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 rounded-xl text-[8px] sm:text-[10px] md:text-xs font-black transition-all whitespace-nowrap ${taskData.is_open_answer ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
            ОТКРЫТЫЙ
          </button>
          <button type="button" onClick={() => setTaskData({ ...taskData, is_open_answer: false })}
            className={`flex-1 sm:flex-none px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 rounded-xl text-[8px] sm:text-[10px] md:text-xs font-black transition-all whitespace-nowrap ${!taskData.is_open_answer ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
            ТЕСТ
          </button>
        </div>
      </div>
      <form onSubmit={onSubmit} className="space-y-5">
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-slate-400 uppercase ml-2">Сложность</span>
            <div className="flex gap-1 bg-slate-50 p-1 rounded-xl">
              {[1, 2, 3, 4, 5].map(n => (
                <button key={n} type="button" onClick={() => setTaskData({ ...taskData, difficulty: n })}
                  className={`flex-1 py-2 rounded-lg text-[10px] font-black transition-all ${taskData.difficulty === n ? 'bg-white text-blue-600 shadow-sm scale-110' : 'text-slate-400'}`}>
                  {n}
                </button>
              ))}
            </div>
          </div>
          <label className="block space-y-1">
            <span className="text-[10px] font-black text-slate-400 uppercase ml-2">Класс</span>
            <input type="text" className="w-full p-3 bg-slate-50 border-none rounded-xl font-bold"
              value={taskData.task_class} onChange={e => setTaskData({ ...taskData, task_class: e.target.value })} />
          </label>
          <label className="block space-y-1">
            <span className="text-[10px] font-black text-slate-400 uppercase ml-2">Тема №</span>
            <input type="text" className="w-full p-3 bg-slate-50 border-none rounded-xl font-bold"
              value={taskData.topic_number} onChange={e => setTaskData({ ...taskData, topic_number: e.target.value })} />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <label className="block space-y-1">
            <span className="text-[10px] font-black text-slate-400 uppercase ml-2">Основная тема</span>
            <select className="w-full p-3 bg-slate-50 border-none rounded-xl font-bold text-sm appearance-none cursor-pointer"
              value={taskData.topic} onChange={e => handleTopicChange(e.target.value)}
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', paddingRight: '36px' }}>
              <option value="">— Выберите тему —</option>
              {Object.entries(MAIN_TOPICS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </label>
          <label className="block space-y-1">
            <span className="text-[10px] font-black text-slate-400 uppercase ml-2">Раздел (подтема)</span>
            <select className="w-full p-3 bg-slate-50 border-none rounded-xl font-bold text-sm appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              value={taskData.section} onChange={e => setTaskData({ ...taskData, section: e.target.value })} disabled={!taskData.topic}
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', paddingRight: '36px' }}>
              <option value="">— Выберите раздел —</option>
              {taskData.topic && SECTIONS_BY_TOPIC[taskData.topic]?.map(section => (
                <option key={section} value={section}>{section}</option>
              ))}
            </select>
          </label>
        </div>
        <ImageAwareTextarea required value={taskData.content}
          onChange={(value) => setTaskData({ ...taskData, content: value })}
          placeholder="Текст задачи (можно вставить изображение)..."
          className="w-full p-6 bg-slate-50 border-none rounded-[2rem] min-h-[120px] font-mono text-sm resize-y" rows={4} />
        <ImageAwareTextarea value={taskData.solution}
          onChange={(value) => setTaskData({ ...taskData, solution: value })}
          placeholder="Решение (можно вставить изображение)..."
          className="w-full p-6 bg-emerald-50/30 border-none rounded-[2rem] min-h-[100px] font-mono text-sm resize-y" rows={3} />
        {!taskData.is_open_answer && (
          <ImageAwareTextarea value={taskData.options}
            onChange={(value) => setTaskData({ ...taskData, options: value })}
            placeholder="Вариант А; Вариант Б; Вариант В (можно вставить изображение)..."
            className="w-full p-4 bg-blue-50/50 border-2 border-dashed border-blue-100 rounded-2xl font-bold text-sm min-h-[80px] resize-y" rows={2} />
        )}
        <div className="grid grid-cols-2 gap-4">
          <input required className="w-full p-4 bg-emerald-50 text-emerald-700 border-none rounded-2xl font-black text-center"
            placeholder="Ответ" value={taskData.answer}
            onChange={e => setTaskData({ ...taskData, answer: e.target.value })} />
          <ImageAwareTextarea value={taskData.hint}
            onChange={(value) => setTaskData({ ...taskData, hint: value })}
            placeholder="Подсказка (можно вставить изображение)..."
            className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold text-sm resize-y" rows={2} />
        </div>
        <button type="submit" className="w-full bg-slate-900 text-white py-6 rounded-[2rem] font-black hover:bg-black transition-all shadow-2xl flex items-center justify-center gap-3">
          <Send size={20} /> {taskData.id ? 'ОБНОВИТЬ' : 'ОПУБЛИКОВАТЬ'}
        </button>
        {taskData.id && (
          <button type="button" onClick={onCancel}
            className="w-full text-slate-400 text-[10px] font-black uppercase tracking-widest hover:text-red-500 transition-colors">
            Отменить редактирование
          </button>
        )}
      </form>
    </div>
  );
}
