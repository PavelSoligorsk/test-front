import { useLayoutEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { continueOrderedListNumbers, normalizeDisplayMath } from '../../components/theoryMath';

const markdownParts = {
  img: ({ src, alt }) => (
    <img src={src} alt={alt || 'РР·РѕР±СЂР°Р¶РµРЅРёРµ'} draggable={false} className="my-2 block max-h-[420px] max-w-full rounded-md object-contain" />
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

function twoColumns(options) {
  return options.length > 1 && options.every((option) => {
    const text = String(option);
    return text.length <= 28 && !text.includes('![') && !text.includes('$$') && !text.includes('\n');
  });
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
  const studentAnswers = secret && Array.isArray(secret.studentAnswers) ? secret.studentAnswers : [];
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
        className="rounded-[1.2em] border border-zinc-200 bg-white p-[1.2em] text-zinc-800 shadow-sm dark:border-zinc-800/60 dark:bg-[#09090b] dark:text-zinc-200"
        style={{ fontSize }}
      >
        <div className="mb-[0.8em] flex items-baseline leading-snug gap-[0.6em] text-[0.6em] font-medium text-zinc-500 dark:text-zinc-400">
          <span className="shrink-0 whitespace-nowrap">Р—Р°РґР°РЅРёРµ в„–{props.number || ''}</span>
          {props.source && <span className="min-w-0 truncate text-zinc-400 dark:text-zinc-500">{props.source}</span>}
        </div>
        <div className="theory-html leading-relaxed [&_.katex-display]:my-[0.6em] [&_img]:mx-auto [&_img]:rounded-[0.8em] [&_p]:my-[0.3em]">
          <Markdown>{props.content}</Markdown>
        </div>

        {(options.length > 0 || props.openAnswer) && (
          <div className="mb-[0.6em] ml-[0.2em] mt-[1.1em] leading-snug text-[0.6em] font-medium text-zinc-500 dark:text-zinc-400">
            {props.openAnswer ? 'РћС‚РІРµС‚' : 'Р’Р°СЂРёР°РЅС‚С‹ РѕС‚РІРµС‚Р°'}
          </div>
        )}
        {options.length > 0 && (
          <ol className={`grid gap-[0.5em] ${twoColumns(options) ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {options.map((option, index) => (
              <li
                key={index}
                className="flex items-center gap-[0.7em] rounded-[1em] border border-zinc-200 bg-white px-[0.9em] py-[0.7em] leading-snug dark:border-zinc-800 dark:bg-[#09090b] [&_p]:my-0"
              >
                <span className="shrink-0 text-[0.8em] font-medium tabular-nums text-zinc-400">{index + 1}.</span>
                <div className="min-w-0 flex-1 font-medium text-zinc-700 dark:text-zinc-300"><Markdown>{option}</Markdown></div>
                <span className="h-[1.1em] w-[1.1em] shrink-0 rounded-[0.3em] border border-zinc-200 dark:border-zinc-700" />
              </li>
            ))}
          </ol>
        )}
        {props.openAnswer && (
          <div className="flex h-[2.6em] items-center rounded-[1em] border border-zinc-200 px-[0.9em] text-[0.8em] text-zinc-400 dark:border-zinc-800">
            Р’РІРµРґРёС‚Рµ Р·РЅР°С‡РµРЅРёРµвЂ¦
          </div>
        )}
      </div>

      {studentAnswers.length > 0 && (
        <div data-chrome="true" className="mt-[0.5em] rounded-[0.9em] leading-snug border border-rose-200 bg-rose-50 px-[0.9em] py-[0.6em] text-rose-950 dark:border-rose-900/70 dark:bg-rose-950/50 dark:text-rose-100" style={{ fontSize: fontSize * 0.7 }}>
          <div className="text-[0.85em] font-medium text-rose-700 dark:text-rose-300">
            {studentAnswers.length === 1 ? 'РћС‚РІРµС‚ СѓС‡РµРЅРёРєР°' : 'РћС‚РІРµС‚С‹ СѓС‡РµРЅРёРєРѕРІ'} В· РІРёРґРёС‚Рµ С‚РѕР»СЊРєРѕ РІС‹
          </div>
          <ul className="m-0 mt-[0.2em] list-none space-y-[0.2em] p-0">
            {studentAnswers.map((item, index) => (
              <li key={index} className="flex gap-[0.5em]">
                {studentAnswers.length > 1 && <span className="min-w-0 truncate text-rose-700/80 dark:text-rose-300/80">{item.name}:</span>}
                <span className="font-semibold">{answerLabel(item.answer, options)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {secret && (answer || solution) && (
        <div data-chrome="true" className="mt-[0.5em] rounded-[0.9em] leading-snug border border-emerald-200 bg-emerald-50 px-[0.9em] py-[0.6em] text-emerald-950 dark:border-emerald-900/70 dark:bg-emerald-950/50 dark:text-emerald-100" style={{ fontSize: fontSize * 0.7 }}>
          <div className="flex items-center gap-[0.6em]">
            {answer && (
              <span className="min-w-0 flex-1">
                <span className="block text-[0.85em] font-medium text-emerald-700 dark:text-emerald-300">РџСЂР°РІРёР»СЊРЅС‹Р№ РѕС‚РІРµС‚ В· РІРёРґРёС‚Рµ С‚РѕР»СЊРєРѕ РІС‹</span>
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
                className="ml-auto shrink-0 rounded-[0.6em] bg-emerald-700 px-[0.8em] py-[0.4em] text-[0.85em] font-semibold text-white hover:bg-emerald-800"
              >
                {solutionOpen ? 'РЎРєСЂС‹С‚СЊ СЂРµС€РµРЅРёРµ' : 'Р РµС€РµРЅРёРµ'}
              </button>
            )}
          </div>
          {solutionOpen && solution && (
            <div className="theory-html mt-[0.6em] border-t border-emerald-200 pt-[0.6em] leading-relaxed text-zinc-800 dark:border-emerald-900 dark:text-zinc-200 [&_p]:my-[0.3em]">
              <Markdown>{solution}</Markdown>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
