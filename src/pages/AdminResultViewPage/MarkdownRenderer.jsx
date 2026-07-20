import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';

export const MarkdownRenderer = ({ children, className = '' }) => (
  <div className={`prose prose-slate max-w-none ${className}`}>
    <ReactMarkdown
      remarkPlugins={[remarkMath, remarkGfm]}
      rehypePlugins={[rehypeKatex]}
      components={{
        table: ({ node, ...props }) => (
          <div className="overflow-x-auto my-4"><table className="min-w-full border-collapse border border-slate-200 rounded-lg" {...props} /></div>
        ),
        th: ({ node, ...props }) => <th className="border border-slate-200 bg-slate-50 px-4 py-2 text-left font-bold" {...props} />,
        td: ({ node, ...props }) => <td className="border border-slate-200 px-4 py-2" {...props} />,
        code: ({ node, inline, className, children, ...props }) => {
          const match = /language-(\w+)/.exec(className || '');
          return !inline ? (
            <code className={`${className} block bg-slate-800 text-white p-4 rounded-xl overflow-x-auto text-sm`} {...props}>{children}</code>
          ) : (
            <code className="bg-slate-100 text-rose-600 px-1.5 py-0.5 rounded-md text-sm" {...props}>{children}</code>
          );
        },
        a: ({ node, ...props }) => <a className="text-blue-600 hover:text-blue-800 underline transition-colors" target="_blank" rel="noopener noreferrer" {...props} />,
        img: ({ node, src, alt, ...props }) => (
          <div className="my-6 overflow-hidden rounded-2xl bg-slate-100">
            <img src={src} alt={alt || 'Изображение'} className="w-full h-auto object-contain max-h-[400px] hover:scale-105 transition-transform duration-500" loading="lazy" {...props} />
          </div>
        ),
      }}
    >{children}</ReactMarkdown>
  </div>
);
