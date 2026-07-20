import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';

export const MarkdownPreview = ({ text, title, type }) => (
  <div className={`p-6 rounded-[2rem] border shadow-sm ${
    type === 'hint' ? 'bg-amber-50/40 border-amber-100' : 
    type === 'solution' ? 'bg-emerald-50/40 border-emerald-100' : 'bg-white border-slate-200'
  }`}>
    <h4 className={`text-[10px] font-black uppercase tracking-[0.2em] mb-3 ${
      type === 'hint' ? 'text-amber-500' : type === 'solution' ? 'text-emerald-500' : 'text-slate-400'
    }`}>{title}</h4>
    <div className="prose prose-slate max-w-none text-sm text-slate-800 text-left
      [&_img]:rounded-2xl [&_img]:shadow-xl [&_img]:my-6 [&_img]:block [&_img]:max-h-64
      [&_.katex-display]:my-6 [&_.katex-display]:text-center [&_.katex-display]:w-full
      [&_table]:w-full [&_table]:border-collapse [&_table]:my-4
      [&_th]:border [&_th]:border-slate-300 [&_th]:px-4 [&_th]:py-2 [&_th]:bg-slate-100 [&_th]:font-semibold
      [&_td]:border [&_td]:border-slate-300 [&_td]:px-4 [&_td]:py-2">
      <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]}>
        {text || '*Пусто...*'}
      </ReactMarkdown>
    </div>
  </div>
);
