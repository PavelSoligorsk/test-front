import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';

export const MarkdownPreview = ({ text, title, type }) => {
  if (!text) return null;
  const bgClass = type === 'hint' ? 'bg-amber-50/50 border-amber-100' : type === 'solution' ? 'bg-blue-50/50 border-blue-100' : 'bg-transparent';
  return (
    <div className={`my-3 p-4 rounded-xl ${bgClass}`}>
      {title && <span className="text-[9px] font-black uppercase text-slate-400 mb-2 block">{title}</span>}
      <ReactMarkdown
        remarkPlugins={[remarkMath, remarkGfm]}
        rehypePlugins={[rehypeKatex]}
        components={{
          p: ({ children }) => <p className="mb-2 last:mb-0 text-slate-700">{children}</p>,
          img: ({ src, alt }) => <img src={src} alt={alt} className="max-w-full h-auto my-2 rounded-lg" />,
          table: ({ children }) => <div className="overflow-x-auto my-2"><table className="min-w-full border">{children}</table></div>,
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
};
