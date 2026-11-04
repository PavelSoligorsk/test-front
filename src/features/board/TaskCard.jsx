import { useEffect, useRef, useState } from 'react';
import { useMeasuredHeight } from '../../shared/hooks/useMeasuredHeight';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { continueOrderedListNumbers, normalizeDisplayMath } from '../../components/theoryMath';
import { playPracticeSalute } from './practiceSalute';

const markdownParts = {
  img: ({ src, alt }) => (
    <img src={src} alt={alt || 'Изображение'} draggable={false} className="my-2 block max-h-[420px] max-w-full rounded-md object-contain" />
  ),
};

function Markdown({ children }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]} components={markdownParts}>
      {continueOrderedListNumbers(normalizeDisplayMath(String(children || '')))}
    </ReactMarkdown>
  );
}

function answerLabel(answer, options) {
  const raw = String(answer ?? '').trim();
  if (!raw || !options.length) return raw;
  const picks = raw.split(/[;,\s]+/).filter(Boolean);
  if (!picks.every((item) => /^\d+$/.test(item) && Number(item) >= 1 && Number(item) <= options.length)) return raw;
  return picks.join(', ');
}

const MARK = {
  right: { label: 'Верно', className: 'text-emerald-700 dark:text-emerald-300' },
  wrong: { label: 'Ошибка', className: 'text-rose-700 dark:text-rose-300' },
};

export default function TaskCard({ obj, teacher, selfId, onPractice, onGradePractice, onResetPractice, onMeasure }) {
  const cardRef = useMeasuredHeight(onMeasure);
  const [solutionOpen, setSolutionOpen] = useState(false);
  const [picks, setPicks] = useState(() => new Set());
  const [typed, setTyped] = useState('');
  const [flash, setFlash] = useState('');
  const [needPick, setNeedPick] = useState(false);
  const props = obj.props || {};
  const options = Array.isArray(props.options) ? props.options : [];
  const secret = props.teacherOnly || null;
  const hasKey = Boolean(String(secret?.answer ?? '').trim());
  const practiceAnswers = Array.isArray(props.practiceAnswers) ? props.practiceAnswers : [];
  const mine = practiceAnswers.find((item) => item.who === selfId);
  const hostRef = useRef(null);
  const played = useRef(new Set());
  const ready = useRef(false);
  useEffect(() => {
    const fresh = practiceAnswers.filter((item) => item.verdict === 'right' || item.verdict === 'wrong');
    if (!ready.current) {
      fresh.forEach((item) => played.current.add(`${item.who}:${item.at}`));
      ready.current = true;
      return;
    }
    fresh.forEach((item) => {
      const key = `${item.who}:${item.at}`;
      if (played.current.has(key)) return;
      played.current.add(key);
      playPracticeSalute(item.verdict, hostRef.current);
    });
  }, [practiceAnswers]);
  useEffect(() => {
    if (!teacher || !hasKey) return;
    if (practiceAnswers.some((item) => item.answer && item.verdict !== 'right' && item.verdict !== 'wrong')) {
      onGradePractice?.(obj.id);
    }
  }, [teacher, hasKey, practiceAnswers, obj.id, onGradePractice]);
  const shown = !teacher && Boolean(mine);
  const answer = (teacher || shown) && secret ? answerLabel(secret.answer, options) : '';
  const solution = teacher && secret ? String(secret.solution || '').trim() : '';
  const fontSize = props.fontSize || 20;
  const draft = props.openAnswer
    ? typed.trim()
    : [...picks].sort((a, b) => a - b).join(',');
  const stop = (event) => event.stopPropagation();

  const check = () => {
    if (!draft) {
      setNeedPick(true);
      return;
    }
    setNeedPick(false);
    const verdict = onPractice?.(obj.id, draft);
    if (!verdict) return;
    setFlash(verdict);
    window.setTimeout(() => setFlash(''), 700);
  };

  return (
    <div ref={hostRef} className="absolute inset-x-0 top-0 overflow-visible">
      <div
        ref={cardRef}
        className={`rounded-[1.2em] border bg-white p-[1.2em] text-zinc-800 shadow-sm dark:bg-[#09090b] dark:text-zinc-200 ${
          flash === 'right' || mine?.verdict === 'right'
            ? 'border-emerald-400 dark:border-emerald-700'
            : flash === 'wrong' || mine?.verdict === 'wrong'
              ? 'border-amber-700 dark:border-amber-600'
              : 'border-zinc-200 dark:border-zinc-800/60'
        }`}
        style={{ fontSize }}
      >
        <div className="mb-[0.8em] flex items-baseline leading-snug gap-[0.6em] text-[0.6em] font-medium text-zinc-500 dark:text-zinc-400">
          <span className="shrink-0 whitespace-nowrap">Задание №{props.number || ''}</span>
          {props.source && <span className="min-w-0 truncate text-zinc-400 dark:text-zinc-500">{props.source}</span>}
        </div>
        <div className="theory-html leading-relaxed [&_.katex-display]:my-[0.6em] [&_img]:mx-auto [&_img]:rounded-[0.8em] [&_p]:my-[0.3em]">
          <Markdown>{props.content}</Markdown>
        </div>

        {(options.length > 0 || props.openAnswer) && (
          <div className="mb-[0.6em] ml-[0.2em] mt-[1.1em] leading-snug text-[0.6em] font-medium text-zinc-500 dark:text-zinc-400">
            {props.openAnswer ? 'Ответ' : 'Варианты ответа'}
          </div>
        )}
        {options.length > 0 && (
          <div data-chrome="true" className={`grid gap-[0.5em] ${twoColumns(options) ? 'grid-cols-2' : 'grid-cols-1'}`} onPointerDown={stop}>
            {options.map((option, index) => {
              const number = index + 1;
              const on = picks.has(number);
              return (
                <button
                  key={index}
                  type="button"
                  data-chrome="true"
                  onClick={() => setPicks((prev) => {
                    const next = new Set(prev);
                    if (next.has(number)) next.delete(number);
                    else next.add(number);
                    return next;
                  })}
                  className={`pointer-events-auto relative z-10 flex items-center gap-[0.7em] rounded-[1em] border px-[0.9em] py-[0.7em] text-left leading-snug [&_p]:my-0 ${
                    on
                      ? 'border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-950'
                      : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-900 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-[#09090b] dark:text-zinc-300 dark:hover:border-white dark:hover:bg-zinc-900'
                  }`}
                >
                  <span className="shrink-0 text-[0.8em] font-medium tabular-nums opacity-70">{number}.</span>
                  <span className="min-w-0 flex-1 font-medium"><Markdown>{option}</Markdown></span>
                </button>
              );
            })}
          </div>
        )}
        {props.openAnswer && (
          <input
            data-chrome="true"
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            onPointerDown={stop}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                check();
              }
            }}
            placeholder="Введите значение…"
            className="flex h-[2.6em] w-full items-center rounded-[1em] border border-zinc-200 bg-transparent px-[0.9em] text-[0.8em] text-zinc-800 outline-none placeholder:text-zinc-400 dark:border-zinc-800 dark:text-zinc-100"
          />
        )}
        {(options.length > 0 || props.openAnswer) && (
          <div data-chrome="true" className="pointer-events-auto relative z-10 mt-[0.8em] flex flex-col items-start gap-[0.4em]" onPointerDown={stop}>
            <div className="flex gap-[0.5em]">
              <button
                type="button"
                data-chrome="true"
                onPointerDown={stop}
                onClick={check}
                className="cursor-pointer rounded-[0.7em] bg-zinc-900 px-[0.9em] py-[0.45em] text-[0.7em] font-semibold text-white hover:bg-zinc-700 active:scale-95 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
              >
                Проверить
              </button>
              {teacher && practiceAnswers.length > 0 && (
                <button
                  type="button"
                  data-chrome="true"
                  onPointerDown={stop}
                  onClick={() => onResetPractice?.(obj.id)}
                  className="cursor-pointer rounded-[0.7em] border border-zinc-300 px-[0.9em] py-[0.45em] text-[0.7em] font-semibold text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  Сбросить ответы
                </button>
              )}
            </div>
            {needPick && <span className="text-[0.65em] font-medium text-rose-600">Сначала выберите вариант</span>}
          </div>
        )}

        {teacher && answer && (
          <div className="mt-[0.8em] rounded-[0.9em] border border-emerald-200 bg-emerald-50 px-[0.9em] py-[0.6em] text-[0.75em] text-emerald-950 dark:border-emerald-900/70 dark:bg-emerald-950/50 dark:text-emerald-100">
            <span className="block text-[0.85em] font-medium text-emerald-700 dark:text-emerald-300">Правильный ответ · видите только вы</span>
            <span className="font-semibold [&_p]:my-0"><Markdown>{answer}</Markdown></span>
            {solution && (
              <button
                type="button"
                data-chrome="true"
                onPointerDown={stop}
                onClick={() => setSolutionOpen((open) => !open)}
                className="mt-[0.5em] rounded-[0.6em] bg-emerald-700 px-[0.8em] py-[0.35em] text-[0.85em] font-semibold text-white"
              >
                {solutionOpen ? 'Скрыть решение' : 'Решение'}
              </button>
            )}
            {solutionOpen && solution && (
              <div className="theory-html mt-[0.6em] border-t border-emerald-200 pt-[0.6em] text-zinc-800 dark:border-emerald-900 dark:text-zinc-200 [&_p]:my-[0.3em]">
                <Markdown>{solution}</Markdown>
              </div>
            )}
          </div>
        )}

        {shown && answer && (
          <div className="mt-[0.8em] rounded-[0.9em] border border-emerald-200 bg-emerald-50 px-[0.9em] py-[0.6em] text-[0.75em] text-emerald-950 dark:border-emerald-900/70 dark:bg-emerald-950/50 dark:text-emerald-100">
            <span className="block text-[0.85em] font-medium text-emerald-700 dark:text-emerald-300">Правильный ответ</span>
            <span className="font-semibold [&_p]:my-0"><Markdown>{answer}</Markdown></span>
          </div>
        )}

        {teacher && practiceAnswers.length > 0 && (
          <ul className="m-0 mt-[0.8em] list-none space-y-[0.3em] p-0 text-[0.75em]">
            {practiceAnswers.map((item) => {
              const mark = MARK[item.verdict];
              return (
                <li key={item.who} className="flex items-baseline gap-[0.5em]">
                  {mark && <span className={`shrink-0 font-semibold ${mark.className}`}>{mark.label}</span>}
                  <span className="min-w-0 truncate text-zinc-500">{item.name || 'Ученик'}</span>
                  <span className="min-w-0 font-semibold [&_p]:my-0"><Markdown>{answerLabel(item.answer, options)}</Markdown></span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function twoColumns(options) {
  return options.length > 1 && options.every((option) => {
    const text = String(option);
    return text.length <= 28 && !text.includes('![') && !text.includes('$$') && !text.includes('\n');
  });
}
