import { MarkdownRenderer } from '../../shared/ui';

function difficultyClass(level) {
  if (level >= 4) return 'text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border-red-100 dark:border-red-800';
  return 'text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-900/30 border-zinc-100 dark:border-zinc-800';
}

export default function PickerTaskCard({
  task,
  index,
  selected,
  hintOpen,
  solutionOpen,
  onToggleHint,
  onToggleSolution,
  onToggle,
}) {
  return (
    <div className={`rounded-3xl border transition-all ${selected ? 'bg-zinc-50 dark:bg-zinc-900/20 border-zinc-300 dark:border-zinc-500/50 shadow-lg dark:shadow-sm' : 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 shadow-sm hover:border-zinc-300 dark:hover:border-zinc-600'}`}>
      <div className="p-6 space-y-6">
        <div className="flex flex-wrap items-center gap-2">
          <h4 className="text-[10px] font-semibold tracking-tight text-zinc-900 dark:text-zinc-300">
            Задание №{index + 1}
          </h4>
          <div className="flex items-center gap-1.5 ml-auto">
            <span className="text-[9px] text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-700 px-2 py-0.5 rounded-lg">ID: {task.id}</span>
            <div className={`px-2 py-0.5 rounded-lg border text-xs font-medium ${difficultyClass(task.difficulty)}`}>LVL {task.difficulty || '?'}</div>
            <span className="text-[9px] text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-700 px-2 py-0.5 rounded-lg">{task.is_open_answer ? 'Открытый' : 'Тест'}</span>
          </div>
        </div>

        <div className="text-zinc-900 dark:text-zinc-200 text-base leading-relaxed">
          <MarkdownRenderer>{task.content}</MarkdownRenderer>
        </div>

        {!task.is_open_answer && task.options ? (
          <div className="space-y-2">
            {Array.isArray(task.options) ? task.options.map((opt, i) => (
              <div key={i} className="flex items-start gap-3 text-zinc-900 dark:text-zinc-200 font-bold">
                <span className="text-zinc-400 dark:text-zinc-500 shrink-0">{i + 1}.</span>
                <span><MarkdownRenderer>{opt}</MarkdownRenderer></span>
              </div>
            )) : (
              <MarkdownRenderer>{task.options}</MarkdownRenderer>
            )}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400">Ответ:</span>
          <span className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">{task.answer}</span>
          {task.hint ? (
            <button type="button" onClick={() => onToggleHint(task.id)} className="px-4 py-2 rounded-2xl bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-[10px] font-semibold hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-all">
              Подсказка
            </button>
          ) : null}
          {task.solution ? (
            <button type="button" onClick={() => onToggleSolution(task.id)} className="px-4 py-2 rounded-2xl bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-[10px] font-semibold hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-all">
              Решение
            </button>
          ) : null}
          <button type="button" onClick={() => onToggle(task)} className={`ml-auto px-5 py-2.5 rounded-2xl text-[10px] font-semibold transition-all active:scale-95 ${selected ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 shadow-sm' : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-700 dark:hover:text-white'}`}>
            {selected ? '✓ В тесте' : '+ В тест'}
          </button>
        </div>

        {hintOpen ? (
          <div className="p-5 rounded-3xl bg-zinc-50/50 dark:bg-zinc-900/20 border border-zinc-200/40 dark:border-zinc-800/40">
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400 tracking-tight block mb-3">Подсказка</span>
            <div className="text-zinc-900 dark:text-zinc-200"><MarkdownRenderer>{task.hint}</MarkdownRenderer></div>
          </div>
        ) : null}
        {solutionOpen ? (
          <div className="p-5 rounded-3xl bg-zinc-50/50 dark:bg-zinc-900/20 border border-zinc-200/40 dark:border-zinc-800/40">
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400 tracking-tight block mb-3">Решение</span>
            <div className="text-zinc-900 dark:text-zinc-200"><MarkdownRenderer>{task.solution}</MarkdownRenderer></div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
