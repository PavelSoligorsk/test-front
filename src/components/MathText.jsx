import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { normalizeDisplayMath } from './theoryMath';

const REMARK = [remarkMath];
const REHYPE = [rehypeKatex];
const INLINE = { p: ({ children }) => <>{children}</> };

/** Короткая подпись с $формулой$ без абзацев вокруг. */
export default function MathText({ text }) {
  if (text == null || text === '') return null;
  const value = String(text);
  if (!value.includes('$')) return value;
  return (
    <span className="theory-attr-math">
      <ReactMarkdown
        remarkPlugins={REMARK}
        rehypePlugins={REHYPE}
        components={INLINE}
      >
        {normalizeDisplayMath(value)}
      </ReactMarkdown>
    </span>
  );
}
