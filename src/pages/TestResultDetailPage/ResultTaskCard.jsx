import { useEffect, useRef, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { MathHintPreview, AISolutionPreview } from '../../shared/ui';
import { ResultTask } from '../../shared/ui/TaskView';

function AiChoice({ onHint, onSolution }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [open]);

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label="ИИ"
        title="ИИ"
        aria-expanded={open}
        aria-haspopup="menu"
        className="inline-flex text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
      >
        <Sparkles size={14} strokeWidth={1.75} />
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 bottom-full z-20 mb-1 w-32 overflow-hidden rounded-lg border border-zinc-200 bg-white py-1 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => { setOpen(false); onHint(); }}
            className="block w-full px-3 py-1.5 text-left text-xs text-zinc-600 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            Подсказка
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => { setOpen(false); onSolution(); }}
            className="block w-full px-3 py-1.5 text-left text-xs text-zinc-600 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            Решение
          </button>
        </div>
      ) : null}
    </div>
  );
}

export default function ResultTaskCard({
  item, idx, openSolutions, toggleSolution,
  hintData, loadingHint, hintError, fetchHint, closeHint,
  solutionData, loadingSolution, solutionError, fetchSolution, closeSolution,
}) {
  const hint = hintData[item.task_id];
  const solution = solutionData[item.task_id];
  const hintVisible = hint || loadingHint[item.task_id] || hintError[item.task_id];
  const solutionVisible = solution || loadingSolution[item.task_id] || solutionError[item.task_id];

  return (
    <ResultTask
      item={item}
      index={idx}
      match="index"
      showMarks
      skipMode="strict"
      userLabel="Ваш ответ"
      correctLabel="Правильный ответ"
      solutionOpen={!!openSolutions[item.task_id]}
      onToggleSolution={() => toggleSolution(item.task_id)}
      solutionShowLabel="Посмотреть решение"
      solutionHideLabel="Скрыть разбор"
      solutionCaption="Полный разбор задачи"
      answerCorner={(
        <AiChoice
          onHint={() => fetchHint(item.task_id)}
          onSolution={() => fetchSolution(item.task_id)}
        />
      )}
      beforeSolution={(
        <>
          {hintVisible ? (
            <div className="mb-3">
              <MathHintPreview
                text={typeof hint === 'object' ? hint?.hint : hint}
                geogebra={typeof hint === 'object' ? hint?.geogebra : null}
                isLoading={loadingHint[item.task_id]}
                error={hintError[item.task_id]}
                onClose={() => closeHint(item.task_id)}
              />
            </div>
          ) : null}
          {solutionVisible ? (
            <div className="mb-3">
              <AISolutionPreview
                data={solution}
                isLoading={loadingSolution[item.task_id]}
                error={solutionError[item.task_id]}
                onClose={() => closeSolution(item.task_id)}
              />
            </div>
          ) : null}
        </>
      )}
    />
  );
}
