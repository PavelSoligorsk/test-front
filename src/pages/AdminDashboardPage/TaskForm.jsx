import React from 'react';
import { Send, PlusCircle } from 'lucide-react';
import ImageAwareTextarea from './ImageAwareTextarea';
import { MAIN_TOPICS, SECTIONS_BY_TOPIC } from './constants';
import { Sheet, IconWell, fieldClass, labelClass, primaryBtnClass, secondaryBtnClass } from '../../shared/ui';

export default function TaskForm({ taskData, setTaskData, onSubmit, onCancel }) {
  const handleTopicChange = (topicKey) => {
    setTaskData({ ...taskData, topic: topicKey, section: '' });
  };

  const segBtn = (active) =>
    `flex-1 sm:flex-none px-3 md:px-4 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${
      active
        ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm'
        : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
    }`;

  return (
    <Sheet className="p-6 md:p-8 space-y-6 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <IconWell><PlusCircle size={18} strokeWidth={2} /></IconWell>
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
              {taskData.id ? `Редактор #${taskData.id}` : 'Конструктор'}
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
              {taskData.id ? 'Правка существующего задания' : 'Новое задание'}
            </p>
          </div>
        </div>
        <div className="flex bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl gap-1">
          <button type="button" onClick={() => setTaskData({ ...taskData, is_open_answer: true })}
            className={segBtn(taskData.is_open_answer)}>
            Открытый
          </button>
          <button type="button" onClick={() => setTaskData({ ...taskData, is_open_answer: false })}
            className={segBtn(!taskData.is_open_answer)}>
            Тест
          </button>
        </div>
      </div>
      <form onSubmit={onSubmit} className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <span className={labelClass}>Сложность</span>
            <div className="flex gap-1 bg-zinc-50 dark:bg-zinc-900/50 p-1 rounded-xl border border-zinc-200 dark:border-zinc-800">
              {[1, 2, 3, 4, 5].map(n => (
                <button key={n} type="button" onClick={() => setTaskData({ ...taskData, difficulty: n })}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium tabular-nums transition-colors ${
                    taskData.difficulty === n
                      ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-950'
                      : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                  }`}>
                  {n}
                </button>
              ))}
            </div>
          </div>
          <label className="block space-y-1.5">
            <span className={labelClass}>Класс</span>
            <input type="text" className={fieldClass}
              value={taskData.task_class} onChange={e => setTaskData({ ...taskData, task_class: e.target.value })} />
          </label>
          <label className="block space-y-1.5">
            <span className={labelClass}>Тема №</span>
            <input type="text" className={fieldClass}
              value={taskData.topic_number} onChange={e => setTaskData({ ...taskData, topic_number: e.target.value })} />
          </label>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="block space-y-1.5">
            <span className={labelClass}>Основная тема</span>
            <select className={fieldClass}
              value={taskData.topic} onChange={e => handleTopicChange(e.target.value)}>
              <option value="">— Выберите тему —</option>
              {Object.entries(MAIN_TOPICS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </label>
          <label className="block space-y-1.5">
            <span className={labelClass}>Раздел (подтема)</span>
            <select className={`${fieldClass} disabled:opacity-50 disabled:cursor-not-allowed`}
              value={taskData.section} onChange={e => setTaskData({ ...taskData, section: e.target.value })} disabled={!taskData.topic}>
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
          className={`${fieldClass} min-h-[120px] font-mono resize-y`} rows={4} />
        <ImageAwareTextarea value={taskData.solution}
          onChange={(value) => setTaskData({ ...taskData, solution: value })}
          placeholder="Решение (можно вставить изображение)..."
          className={`${fieldClass} min-h-[100px] font-mono resize-y`} rows={3} />
        {!taskData.is_open_answer && (
          <ImageAwareTextarea value={taskData.options}
            onChange={(value) => setTaskData({ ...taskData, options: value })}
            placeholder="Вариант А; Вариант Б; Вариант В (можно вставить изображение)..."
            className={`${fieldClass} min-h-[80px] resize-y border-dashed`} rows={2} />
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <input required className={`${fieldClass} text-center font-semibold`}
            placeholder="Ответ" value={taskData.answer}
            onChange={e => setTaskData({ ...taskData, answer: e.target.value })} />
          <ImageAwareTextarea value={taskData.hint}
            onChange={(value) => setTaskData({ ...taskData, hint: value })}
            placeholder="Подсказка (можно вставить изображение)..."
            className={`${fieldClass} resize-y`} rows={2} />
        </div>
        <button type="submit" className={`${primaryBtnClass} w-full py-3`}>
          <Send size={16} /> {taskData.id ? 'Обновить' : 'Опубликовать'}
        </button>
        {taskData.id && (
          <button type="button" onClick={onCancel} className={`${secondaryBtnClass} w-full`}>
            Отменить редактирование
          </button>
        )}
      </form>
    </Sheet>
  );
}
