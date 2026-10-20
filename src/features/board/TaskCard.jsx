import { useLayoutEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { continueOrderedListNumbers, normalizeDisplayMath } from '../../components/theoryMath';

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

export default function TaskCard({ obj, teacher, onMeasure }) {
  const cardRef = useRef(null);
  const onMeasureRef = useRef(onMeasure);
  const [solutionOpen, setSolutionOpen] = useState(false);
  const props = obj.props || {};
  const options = Array.isArray(props.options) ? props.options : [];
  const secret = teacher ? props.teacherOnly || null : null;
  const answer = secret ? answerLabel(secret.answer, options) : '';
  const solution = secret ? String(secret.solution || '').trim() : '';
  const fontSize = props.fontSize || 20;

  useLayoutEffect(() => {
    onMeasureRef.current = onMeasure;
  });

  useLayoutEffect(() => {
    const card = cardRef.current;
    if (!card) return undefined;
    const report = () => onMeasureRef.current?.(Math.ceil(card.offsetHeight));
    report();
    const observer = new ResizeObserver(report);
    observer.observe(card);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="absolute inset-x-0 top-0">
      <div
        ref={cardRef}
        className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-zinc-800 shadow-md dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200"
        style={{ fontSize }}
      >
        <div className="mb-2 flex items-baseline gap-2 text-[0.6em] font-semibold uppercase tracking-wide text-zinc-400">
          <span className="text-zinc-900 dark:text-zinc-100">Задание {props.number || ''}</span>
          {props.source && <span className="truncate font-medium normal-case tracking-normal">{props.source}</span>}
        </div>
        <div className="theory-html leading-relaxed [&_p]:my-1">
          <Markdown>{props.content}</Markdown>
        </div>
        {options.length > 0 && (
          <ol className="mt-3 space-y-1.5">
            {options.map((option, index) => (
              <li key={index} className="flex gap-2 leading-relaxed [&_p]:my-0">
                <span className="shrink-0 tabular-nums text-zinc-400">{index + 1}.</span>
                <div className="min-w-0 flex-1"><Markdown>{option}</Markdown></div>
              </li>
            ))}
          </ol>
        )}
        {props.openAnswer && (
          <div className="mt-3 h-[1.8em] rounded-md border border-dashed border-zinc-300 dark:border-zinc-700" />
        )}
      </div>

      {secret && (answer || solution) && (
        <div data-chrome="true" className="mt-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[14px] text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-100">
          <div className="flex items-center gap-2">
            {answer && (
              <span className="min-w-0 flex-1">
                <span className="text-emerald-700 dark:text-emerald-300">Ответ (видите только вы): </span>
                <span className="font-semibold">{answer}</span>
              </span>
            )}
            {solution && (
              <button
                type="button"
                data-chrome="true"
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.stopPropagation();
                  setSolutionOpen((open) => !open);
                }}
                className="ml-auto shrink-0 rounded-md bg-emerald-700 px-2 py-1 text-[12px] font-semibold text-white"
              >
                {solutionOpen ? 'Скрыть решение' : 'Решение'}
              </button>
            )}
          </div>
          {solutionOpen && solution && (
            <div className="theory-html mt-2 border-t border-emerald-200 pt-2 leading-relaxed text-zinc-800 dark:border-emerald-900 dark:text-zinc-200 [&_p]:my-1">
              <Markdown>{solution}</Markdown>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
