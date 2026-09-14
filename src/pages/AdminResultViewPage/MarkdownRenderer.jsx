import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';

export const MarkdownRenderer = ({ children, className = '' }) => (
  <div className={`prose prose-zinc dark:prose-invert max-w-none ${className}`}>
    <ReactMarkdown
      remarkPlugins={[remarkMath, remarkGfm]}
      rehypePlugins={[rehypeKatex]}
      components={{
        table: ({ node, ...props }) => (
          <div className="overflow-x-auto my-4"><table className="min-w-full border-collapse border border-zinc-200 dark:border-zinc-800 rounded-lg" {...props} /></div>
        ),
        th: ({ node, ...props }) => <th className="border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-4 py-2 text-left font-semibold" {...props} />,
        td: ({ node, ...props }) => <td className="border border-zinc-200 dark:border-zinc-800 px-4 py-2" {...props} />,
        code: ({ node, inline, className, children, ...props }) => {
          return !inline ? (
            <code className={`${className} block bg-zinc-900 dark:bg-zinc-950 text-zinc-100 p-4 rounded-xl overflow-x-auto text-sm`} {...props}>{children}</code>
          ) : (
            <code className="bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 px-1.5 py-0.5 rounded-md text-sm" {...props}>{children}</code>
          );
        },
        a: ({ node, ...props }) => <a className="text-zinc-900 dark:text-zinc-100 underline underline-offset-2 hover:opacity-70 transition-opacity" target="_blank" rel="noopener noreferrer" {...props} />,
        img: ({ node, src, alt, ...props }) => (
          <div className="my-6 overflow-hidden rounded-2xl bg-zinc-100 dark:bg-zinc-900">
            <img src={src} alt={alt || 'Изображение'} className="w-full h-auto object-contain max-h-[400px] hover:scale-105 transition-transform duration-500" loading="lazy" {...props} />
          </div>
        ),
      }}
    >{children}</ReactMarkdown>
  </div>
);
