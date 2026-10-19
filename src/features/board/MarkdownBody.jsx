import { useLayoutEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { continueOrderedListNumbers, normalizeDisplayMath } from '../../components/theoryMath';

export default function MarkdownBody({ text, fontSize = 22 }) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const box = ref.current?.parentElement;
    const body = ref.current;
    if (!box || !body) return;
    const next = Math.max(80, body.scrollHeight);
    if (Math.abs(box.offsetHeight - next) > 2) box.style.height = `${next}px`;
  }, [text, fontSize]);
  return (
    <div
      ref={ref}
      className="theory-html bg-white p-3 leading-relaxed text-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 [&_h1]:text-[1.4em] [&_h1]:font-semibold [&_h2]:text-[1.2em] [&_h2]:font-semibold [&_h3]:text-[1.05em] [&_h3]:font-semibold [&_strong]:font-semibold"
      style={{ fontSize }}
    >
      <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]}>
        {continueOrderedListNumbers(normalizeDisplayMath(text || ''))}
      </ReactMarkdown>
    </div>
  );
}
