import { AlertTriangle, Edit3, Send, Trash2, Zap } from 'lucide-react';
import { primaryBtnClass, secondaryBtnClass } from '../../shared/ui';
import { MAIN_TOPICS, SECTIONS_BY_TOPIC } from './constants';
import { MarkdownPreview } from './MarkdownPreview';

function difficultyClass(level) {
  if (level >= 4) return 'text-red-600 bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900/40';
  if (level >= 3) return 'text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800';
  return 'text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800';
}

export default function BankTaskCard({
  task,
  index,
  failed,
  hintOpen,
  solutionOpen,
  onToggleHint,
  onToggleSolution,
  onTopicChange,
  onSectionChange,
  onDifficultyChange,
  onSend,
  onEdit,
  onDelete,
}) {
  return (
    <div
      data-task-id={task.id}
      className={`bg-white dark:bg-[#09090b] rounded-3xl border shadow-sm overflow-hidden transition-colors ${
        failed
          ? 'border-red-300 dark:border-red-900/50 ring-1 ring-red-100 dark:ring-red-900/30'
          : (!task.topic || !task.section)
            ? 'border-zinc-300 dark:border-zinc-700'
            : 'border-zinc-200 dark:border-zinc-800/60'
      }`}
    >
      <div className="p-6 space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 tabular-nums">Задание №{index + 1}</h4>
          <div className="flex items-center gap-1.5 ml-auto flex-wrap">
            {failed && (
              <span className="flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 dark:bg-red-950/30 px-2 py-0.5 rounded-lg" title="Ошибка классификации">
                <AlertTriangle size={10} /> Ошибка
              </span>
            )}
            {(!task.topic || !task.section) && !failed && (
              <span className="flex items-center gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-900 px-2 py-0.5 rounded-lg" title="Не классифицировано">
                <Zap size={10} /> Без темы
              </span>
            )}
            <span className="text-xs text-zinc-500 bg-zinc-100 dark:bg-zinc-900 px-2 py-0.5 rounded-lg tabular-nums">ID: {task.id}</span>
            <div className={`px-2 py-0.5 rounded-lg border text-xs font-semibold tabular-nums ${difficultyClass(task.difficulty)}`}>LVL {task.difficulty || '?'}</div>
            <span className="text-xs text-zinc-500 bg-zinc-100 dark:bg-zinc-900 px-2 py-0.5 rounded-lg">{task.is_open_answer ? 'Открытый' : 'Тест'}</span>
          </div>
        </div>

        <MarkdownPreview text={task.content} title="Условие задания" type="default" />
        {!task.is_open_answer && task.options && (
          <MarkdownPreview
            type="default"
            text={(Array.isArray(task.options) ? task.options : task.options.split(';')).map((opt) => opt.trim()).filter(Boolean).map((opt, i) => `**${i + 1}.** ${opt}`).join('\n\n')}
          />
        )}

        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-sm font-medium text-zinc-500">Ответ:</span>
          <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 tabular-nums">{task.answer}</span>
          {task.hint && <button type="button" onClick={onToggleHint} className={`${secondaryBtnClass} !py-1.5 text-xs`}>Подсказка</button>}
          {task.solution && <button type="button" onClick={onToggleSolution} className={`${secondaryBtnClass} !py-1.5 text-xs`}>Решение</button>}
        </div>

        {hintOpen && <MarkdownPreview text={task.hint} title="Подсказка" type="hint" />}
        {solutionOpen && <MarkdownPreview text={task.solution} title="Полное решение" type="solution" />}

        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/60">
          <select
            value={task.topic || ''}
            onChange={(event) => onTopicChange(event.target.value)}
            className="text-xs font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-900 px-2 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 cursor-pointer outline-none"
          >
            <option value="">Без темы</option>
            {Object.entries(MAIN_TOPICS).map(([key, label]) => (<option key={key} value={key}>{label}</option>))}
          </select>
          <select
            value={task.section || ''}
            onChange={(event) => onSectionChange(event.target.value)}
            disabled={!task.topic}
            className="text-xs font-medium text-zinc-500 bg-zinc-100 dark:bg-zinc-900 px-2 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 truncate max-w-[180px] cursor-pointer outline-none disabled:opacity-50"
          >
            <option value="">Без раздела</option>
            {task.topic && SECTIONS_BY_TOPIC[task.topic]?.map((section) => (<option key={section} value={section}>{section}</option>))}
          </select>
          <div className={`flex items-center gap-2 px-2 py-1 rounded-xl border ${difficultyClass(task.difficulty)}`}>
            <span className="text-xs font-medium">LVL</span>
            <select
              value={task.difficulty || 1}
              onChange={(event) => onDifficultyChange(event.target.value)}
              className="text-sm font-semibold leading-none bg-transparent border-none outline-none cursor-pointer tabular-nums"
            >
              {[1, 2, 3, 4, 5].map((n) => (<option key={n} value={n}>{n}</option>))}
            </select>
          </div>
          <div className="flex items-center gap-1 ml-auto">
            <button type="button" onClick={onSend} className={`${primaryBtnClass} !py-1.5 !px-3 text-xs`}>
              <Send size={12} /> ТГ
            </button>
            <button type="button" onClick={onEdit} className="p-2 bg-white dark:bg-zinc-950 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-xl border border-zinc-200 dark:border-zinc-800 transition-colors">
              <Edit3 size={14} />
            </button>
            <button type="button" onClick={onDelete} className="p-2 bg-white dark:bg-zinc-950 text-zinc-400 hover:text-red-600 rounded-xl border border-zinc-200 dark:border-zinc-800 transition-colors">
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
