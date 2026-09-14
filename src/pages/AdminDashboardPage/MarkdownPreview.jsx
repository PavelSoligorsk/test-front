import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';

export const MarkdownPreview = ({ text, title, type }) => (
  <div className={`p-5 md:p-6 rounded-3xl border shadow-sm ${
    type === 'hint'
      ? 'bg-zinc-50 dark:bg-zinc-900/40 border-zinc-200 dark:border-zinc-800'
      : type === 'solution'
        ? 'bg-white dark:bg-[#09090b] border-zinc-200 dark:border-zinc-800/60'
        : 'bg-white dark:bg-[#09090b] border-zinc-200 dark:border-zinc-800/60'
  }`}>
    {title ? (
      <h4 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-3">{title}</h4>
    ) : null}
    <div className="prose prose-zinc dark:prose-invert max-w-none text-sm text-zinc-800 dark:text-zinc-200 text-left
      [&_img]:rounded-xl [&_img]:shadow-sm [&_img]:my-4 [&_img]:block [&_img]:max-h-64
      [&_.katex-display]:my-4 [&_.katex-display]:text-center [&_.katex-display]:w-full
      [&_table]:w-full [&_table]:border-collapse [&_table]:my-4
      [&_th]:border [&_th]:border-zinc-200 dark:[&_th]:border-zinc-700 [&_th]:px-4 [&_th]:py-2 [&_th]:bg-zinc-50 dark:[&_th]:bg-zinc-900 [&_th]:font-semibold
      [&_td]:border [&_td]:border-zinc-200 dark:[&_td]:border-zinc-700 [&_td]:px-4 [&_td]:py-2">
      <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]}>
        {text || '*Пусто...*'}
      </ReactMarkdown>
    </div>
  </div>
);
