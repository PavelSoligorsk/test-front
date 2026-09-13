import React from 'react';
import { Sparkles, X, AlertCircle, Zap, RefreshCw } from 'lucide-react';

export default function AiModal({
  showAiModal, setShowAiModal,
  aiPrompt, setAiPrompt,
  aiTaskCount, setAiTaskCount,
  aiDifficulty, setAiDifficulty,
  aiExcludeWeeks, setAiExcludeWeeks,
  aiUseStats, setAiUseStats,
  aiGenerating, handleGenerateAiTest,
}) {
  if (!showAiModal) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#09090b] rounded-3xl border border-zinc-200 dark:border-zinc-800/60 shadow-sm max-w-lg w-full overflow-hidden">
        <div className="p-6 border-b border-zinc-100 dark:border-zinc-800/60 flex justify-between items-start gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm">
              <Sparkles size={18} strokeWidth={2} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">AI-тест</h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">Соберите уникальный набор заданий</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowAiModal(false)}
            className="p-2 rounded-xl text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-2 block">Тема теста</label>
            <textarea
              value={aiPrompt}
              onChange={e => setAiPrompt(e.target.value)}
              placeholder="Например: квадратные уравнения для 8 класса, задачи на движение, тригонометрия..."
              className="w-full p-4 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800/80 rounded-xl font-medium text-sm h-32 text-zinc-900 dark:text-zinc-100 resize-none outline-none focus:ring-4 focus:ring-zinc-100 dark:focus:ring-zinc-800/50 focus:border-zinc-300 dark:focus:border-zinc-700 placeholder:text-zinc-400"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-2 block">Задач (1–50)</label>
              <input
                type="number"
                min="1"
                max="50"
                value={aiTaskCount}
                onChange={e => {
                  const val = e.target.value;
                  if (val === '') { setAiTaskCount(''); return; }
                  const num = Number(val);
                  if (isNaN(num)) return;
                  if (num < 1) setAiTaskCount(1);
                  else if (num > 50) setAiTaskCount(50);
                  else setAiTaskCount(num);
                }}
                onBlur={() => { if (aiTaskCount === '' || isNaN(aiTaskCount) || aiTaskCount < 1) setAiTaskCount(10); }}
                className="w-full p-3 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800/80 rounded-xl font-medium text-sm outline-none text-zinc-900 dark:text-zinc-100 focus:ring-4 focus:ring-zinc-100 dark:focus:ring-zinc-800/50"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-2 block">Сложность</label>
              <select
                value={aiDifficulty}
                onChange={e => setAiDifficulty(e.target.value)}
                className="w-full p-3 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800/80 rounded-xl font-medium text-sm outline-none text-zinc-900 dark:text-zinc-100"
              >
                <option value="easy">Лёгкий</option>
                <option value="medium">Средний</option>
                <option value="hard">Сложный</option>
                <option value="none">Любая</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-2 block">Исключить за недели</label>
              <input
                type="number"
                min="0"
                max="12"
                step="0.5"
                value={aiExcludeWeeks}
                onChange={e => setAiExcludeWeeks(e.target.value)}
                className="w-full p-3 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800/80 rounded-xl font-medium text-sm outline-none text-zinc-900 dark:text-zinc-100 focus:ring-4 focus:ring-zinc-100 dark:focus:ring-zinc-800/50"
              />
            </div>
            <div className="flex items-end pb-0.5">
              <label className="flex items-center gap-2 p-3 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800/80 rounded-xl cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800/50 transition-colors w-full">
                <input
                  type="checkbox"
                  checked={aiUseStats}
                  onChange={e => setAiUseStats(e.target.checked)}
                  className="w-4 h-4 accent-zinc-900 dark:accent-white cursor-pointer"
                />
                <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">Учитывать статистику</span>
              </label>
            </div>
          </div>
          <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800 p-4 rounded-xl flex items-start gap-3">
            <AlertCircle size={16} className="text-zinc-400 shrink-0 mt-0.5" />
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">ИИ может ошибаться. Проверяйте сгенерированные задания.</p>
          </div>
        </div>
        <div className="p-4 border-t border-zinc-100 dark:border-zinc-800/60 flex gap-3">
          <button
            type="button"
            onClick={() => setShowAiModal(false)}
            className="flex-1 py-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 rounded-xl text-sm font-medium hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={handleGenerateAiTest}
            disabled={!aiPrompt.trim() || aiGenerating}
            className="flex-1 py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 rounded-xl text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {aiGenerating ? (<><RefreshCw size={16} className="animate-spin" />Генерация...</>) : (<><Zap size={16} />Создать тест</>)}
          </button>
        </div>
      </div>
    </div>
  );
}
