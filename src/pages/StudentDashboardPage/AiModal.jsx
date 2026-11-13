import { RefreshCw } from 'lucide-react';
import { fieldClass, primaryBtnClass, secondaryBtnClass } from '../../shared/ui/Sheet';

const DIFFICULTIES = [
  { value: 'easy', label: 'Лёгкий' },
  { value: 'medium', label: 'Средний' },
  { value: 'hard', label: 'Сложный' },
  { value: 'none', label: 'Любая' },
];

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

  const close = () => setShowAiModal(false);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-test-title"
        className="flex max-h-[min(40rem,100dvh)] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800/60 dark:bg-[#09090b] sm:rounded-xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-zinc-100 px-5 py-5 dark:border-zinc-800/60 sm:px-6">
          <div className="min-w-0">
            <h3 id="ai-test-title" className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              AI-тест
            </h3>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Набор заданий по вашей теме
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            className="rounded-xl px-3 py-2 text-sm font-medium text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 dark:focus-visible:ring-white"
          >
            Закрыть
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto px-5 py-5 sm:px-6">
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Тема</span>
            <textarea
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="Квадратные уравнения, задачи на движение, тригонометрия"
              className={`${fieldClass} h-28 resize-none`}
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1.5">
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Задач</span>
              <input
                type="number"
                min="1"
                max="50"
                value={aiTaskCount}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '') { setAiTaskCount(''); return; }
                  const num = Number(val);
                  if (Number.isNaN(num)) return;
                  if (num < 1) setAiTaskCount(1);
                  else if (num > 50) setAiTaskCount(50);
                  else setAiTaskCount(num);
                }}
                onBlur={() => { if (aiTaskCount === '' || Number.isNaN(aiTaskCount) || aiTaskCount < 1) setAiTaskCount(10); }}
                className={fieldClass}
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Исключить, недели</span>
              <input
                type="number"
                min="0"
                max="12"
                step="0.5"
                value={aiExcludeWeeks}
                onChange={(e) => setAiExcludeWeeks(e.target.value)}
                className={fieldClass}
              />
            </label>
          </div>

          <div className="space-y-1.5">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Сложность</span>
            <div className="grid grid-cols-4 gap-1 rounded-xl border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-800/80 dark:bg-zinc-900/50">
              {DIFFICULTIES.map((item) => {
                const active = aiDifficulty === item.value;
                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setAiDifficulty(item.value)}
                    className={`rounded-lg px-1 py-1.5 text-xs font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-white ${
                      active
                        ? 'border border-zinc-200/80 bg-white text-zinc-900 shadow-sm dark:border-zinc-700/80 dark:bg-zinc-800 dark:text-zinc-100'
                        : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          <label className="flex cursor-pointer items-center gap-3 py-1">
            <input
              type="checkbox"
              checked={aiUseStats}
              onChange={(e) => setAiUseStats(e.target.checked)}
              className="h-4 w-4 cursor-pointer accent-zinc-900 dark:accent-white"
            />
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Учитывать статистику</span>
          </label>

          <p className="text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
            ИИ может ошибаться. Проверьте задания перед решением.
          </p>
        </div>

        <div className="flex gap-3 border-t border-zinc-100 px-5 py-4 dark:border-zinc-800/60 sm:px-6">
          <button type="button" onClick={close} className={`${secondaryBtnClass} flex-1`}>
            Отмена
          </button>
          <button
            type="button"
            onClick={handleGenerateAiTest}
            disabled={!aiPrompt.trim() || aiGenerating}
            className={`${primaryBtnClass} flex-1`}
          >
            {aiGenerating ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                Генерация...
              </>
            ) : (
              'Создать тест'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
