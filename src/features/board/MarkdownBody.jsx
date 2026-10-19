import { useLayoutEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { continueOrderedListNumbers, normalizeDisplayMath } from '../../components/theoryMath';

export default function MarkdownBody({ text }) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const box = ref.current?.parentElement;
    const body = ref.current;
    if (!box || !body) return;
    const next = Math.max(80, body.scrollHeight);
    if (Math.abs(box.offsetHeight - next) > 2) box.style.height = `${next}px`;
  }, [text]);
  return (
    <div ref={ref} className="theory-html bg-white p-3 text-sm leading-relaxed text-zinc-800 dark:bg-zinc-950 dark:text-zinc-200">
      <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]}>
        {continueOrderedListNumbers(normalizeDisplayMath(text || ''))}
      </ReactMarkdown>
    </div>
  );
}
