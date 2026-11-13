import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import { CheckCircle2, Menu, X } from 'lucide-react';
import 'katex/dist/katex.min.css';
import {
  SectionBlock,
  Def,
  Ex,
  Explanation,
  Important,
  Formula,
  Collapsible,
  Grid,
  Card,
  Steps,
  GeoGebra,
  Html,
  MathText,
} from '../../../components/TheoryBlocks';
import { continueOrderedListNumbers, normalizeDisplayMath } from '../../../components/theoryMath';
import { useMeasuredHeight } from '../../hooks/useMeasuredHeight';
import { parseBlocks, parseTheorySections, theoryCopyPayload } from '../../lib/theoryMarkup';

// ========== ЭЛЕМЕНТЫ MARKDOWN ==========

const markdownComponents = {
  img: ({ src, alt }) => (
    <img 
      src={src} 
      alt={alt} 
      className="max-w-full lg:w-1/2 h-auto my-6 block rounded-lg border border-zinc-200 dark:border-zinc-800 mx-auto shadow-sm" 
    />
  ),
  table: ({ children }) => (
    <div className="overflow-x-auto my-6 rounded-lg border border-zinc-200 dark:border-zinc-800">
      <table className="min-w-full text-left text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-zinc-50 dark:bg-zinc-900/60 border-b border-zinc-200 dark:border-zinc-800">
      {children}
    </thead>
  ),
  th: ({ children }) => (
    <th className="py-2.5 px-4 font-semibold text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border-b border-zinc-100 dark:border-zinc-800/50 py-2.5 px-4 text-zinc-600 dark:text-zinc-300 align-top">
      {children}
    </td>
  ),
  code: ({ children }) => (
    <code className="bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 px-1.5 py-0.5 rounded text-xs font-mono break-words">
      {children}
    </code>
  ),
  ul: ({ children }) => (
    <ul className="list-disc pl-6 my-4 space-y-2 text-zinc-700 dark:text-zinc-300">
      {children}
    </ul>
  ),
  ol: ({ children, start }) => (
    <ol start={start} className="list-decimal pl-6 my-4 space-y-2 text-zinc-700 dark:text-zinc-300">
      {children}
    </ol>
  ),
  li: ({ children }) => (
    <li className="pl-1 leading-relaxed">{children}</li>
  ),
  blockquote: ({ children }) => (
    <blockquote className="pl-4 py-2 my-4 border-l border-zinc-300 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-900/40 text-zinc-700 dark:text-zinc-300">
      {children}
    </blockquote>
  ),
  hr: () => (
    <hr className="my-8 border-zinc-200 dark:border-zinc-800" />
  ),
  a: ({ href, children }) => (
    <a 
      href={href} 
      className="text-zinc-900 dark:text-zinc-100 underline underline-offset-2 decoration-zinc-300 dark:decoration-zinc-600 hover:decoration-zinc-900 dark:hover:decoration-zinc-100"
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </a>
  ),
};

function boardBlocks(blocks) {
  return (blocks || []).map((block, index) => boardBlockNode(block, index));
}

function boardBlockNode(block, key) {
  if (!block || block.type === 'geogebra') return null;
  if (block.type === 'text') {
    return (
      <ReactMarkdown key={key} remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]} components={markdownComponents}>
        {continueOrderedListNumbers(normalizeDisplayMath(block.content))}
      </ReactMarkdown>
    );
  }
  if (block.type === 'def') return <Def key={key} title={block.title}>{boardBlocks(block.blocks)}</Def>;
  if (block.type === 'ex') return <Ex key={key} title={block.title} isHard={block.isHard}>{boardBlocks(block.blocks)}</Ex>;
  if (block.type === 'explanation') return <Explanation key={key}>{boardBlocks(block.blocks)}</Explanation>;
  if (block.type === 'important') return <Important key={key} title={block.title}>{boardBlocks(block.blocks)}</Important>;
  if (block.type === 'formula') return <Formula key={key} title={block.title}>{boardBlocks(block.blocks)}</Formula>;
  if (block.type === 'collapsible') return <Collapsible key={key} title={block.title}>{boardBlocks(block.blocks)}</Collapsible>;
  if (block.type === 'grid') return <Grid key={key} cols={block.cols}>{boardBlocks(block.blocks)}</Grid>;
  if (block.type === 'card') return <Card key={key} title={block.title}>{boardBlocks(block.blocks)}</Card>;
  if (block.type === 'steps') {
    return (
      <Steps key={key}>
        {(block.steps || []).map((step, index) => (
          <div key={index}>{boardBlocks(parseBlocks(step))}</div>
        ))}
      </Steps>
    );
  }
  if (block.type === 'html') return <Html key={key} html={block.html} />;
  return null;
}

export function TheoryBoardBlock({ block, onMeasure }) {
  const ref = useMeasuredHeight(onMeasure);
  if (!block) return null;
  return (
    <div
      ref={ref}
      className="bg-white px-3 py-2 text-zinc-800 [&>*]:my-0 dark:bg-zinc-950 dark:text-zinc-200"
      onPointerDown={(event) => {
        if (event.target instanceof Element && event.target.closest('button')) event.stopPropagation();
      }}
    >
      {boardBlockNode(block, 'root')}
    </div>
  );
}

const renderBlocks = (blocks, onCopy) => {
  if (!blocks || !Array.isArray(blocks)) return null;

  return blocks.map((block, idx) => {
    const node = renderPlainBlock(block, idx, onCopy);
    const payload = onCopy ? theoryCopyPayload(block) : null;
    if (!payload) return node;
    return (
      <div key={idx} className="relative">
        <div className="mb-1 flex justify-end">
          <button
            type="button"
            onClick={() => onCopy(payload)}
            className="rounded-lg bg-zinc-900 px-2.5 py-1 text-[11px] font-semibold text-white"
          >
            На доску
          </button>
        </div>
        {node}
      </div>
    );
  });
};

const renderPlainBlock = (block, idx, onCopy) => {
    if (block.type === 'text') {
      return (
        <ReactMarkdown 
          key={idx}
          remarkPlugins={[remarkMath, remarkGfm]} 
          rehypePlugins={[rehypeKatex]} 
          components={markdownComponents}
        >
          {continueOrderedListNumbers(normalizeDisplayMath(block.content))}
        </ReactMarkdown>
      );
    }
    if (block.type === 'def') {
      return (
        <Def key={idx} title={block.title}>
          {renderBlocks(block.blocks, onCopy)}
        </Def>
      );
    }
    if (block.type === 'ex') {
      return (
        <Ex key={idx} title={block.title} isHard={block.isHard}>
          {renderBlocks(block.blocks, onCopy)}
        </Ex>
      );
    }
    if (block.type === 'explanation') {
      return (
        <Explanation key={idx}>
          {renderBlocks(block.blocks, onCopy)}
        </Explanation>
      );
    }
    if (block.type === 'important') {
      return (
        <Important key={idx} title={block.title}>
          {renderBlocks(block.blocks, onCopy)}
        </Important>
      );
    }
    if (block.type === 'formula') {
      return (
        <Formula key={idx} title={block.title}>
          {renderBlocks(block.blocks, onCopy)}
        </Formula>
      );
    }
    if (block.type === 'collapsible') {
      return (
        <Collapsible key={idx} title={block.title}>
          {renderBlocks(block.blocks, onCopy)}
        </Collapsible>
      );
    }
    if (block.type === 'grid') {
      return (
        <Grid key={idx} cols={block.cols}>
          {renderBlocks(block.blocks, onCopy)}
        </Grid>
      );
    }
    if (block.type === 'card') {
      return (
        <Card key={idx} title={block.title}>
          {renderBlocks(block.blocks, onCopy)}
        </Card>
      );
    }
    if (block.type === 'steps') {
      return (
        <Steps key={idx}>
          {(block.steps || []).map((step, i) => (
            <div key={i}>
              {renderBlocks(parseBlocks(step), onCopy)}
            </div>
          ))}
        </Steps>
      );
    }
    if (block.type === 'geogebra') {
      return (
        <GeoGebra
          key={idx}
          id={block.id}
          height={block.height}
          setup={block.setup}
          controls={block.controls}
          texts={block.texts}
        />
      );
    }
    if (block.type === 'html') {
      return <Html key={idx} html={block.html} />;
    }
    return null;
};

// ========== ОСНОВНОЙ КОМПОНЕНТ ==========

const dockBottom = 'fixed z-40 bottom-[calc(max(1rem,env(safe-area-inset-bottom))+4.25rem)] md:bottom-6';

const iconButtonClass =
  'flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-900 shadow-sm hover:bg-zinc-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:border-zinc-800 dark:bg-[#09090b] dark:text-zinc-100 dark:hover:bg-zinc-900 dark:focus-visible:ring-white';

export const TheoryViewer = React.memo(({ content, isFullWidth = false, embedded = false, onCopyBlock = null, aside = null }) => {
  const [components, setComponents] = useState([]);
  const [activeId, setActiveId] = useState('');
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const parseContent = () => {
      if (!content) {
        setComponents([]);
        setIsLoading(false);
        return;
      }
      const sections = parseTheorySections(content);
      setComponents(sections);

      if (embedded) {
        setIsLoading(false);
      } else {
        const triggerLoading = () => {
          const scrollY = window.scrollY;
          document.body.style.position = 'fixed';
          document.body.style.top = `-${scrollY}px`;
          document.body.style.width = '100%';

          setIsLoading(true);

          setTimeout(() => {
            const currentScrollY = document.body.style.top;
            document.body.style.position = '';
            document.body.style.top = '';
            document.body.style.width = '';
            if (currentScrollY) {
              window.scrollTo(0, parseInt(currentScrollY || '0', 10) * -1);
            }
            setIsLoading(false);
          }, 1500);
        };

        triggerLoading();
      }
      if (sections.length > 0) setActiveId(sections[0].id);
    };

    parseContent();
  }, [content, embedded]);

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 120;
      for (const section of components) {
        const el = document.getElementById(section.id);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPosition >= top && scrollPosition < top + height) {
            setActiveId(section.id);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [components]);

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveId(id);
      setIsNavOpen(false);
    }
  };

  const showNav = !isFullWidth && components.length > 0;

  return (
    <div className={`relative ${embedded ? 'bg-transparent' : 'bg-white dark:bg-[#09090b]'} ${isFullWidth || embedded ? '' : 'min-h-screen'}`}>
      <style>{`
        .dynamic-markdown {
          min-width: 0;
          max-width: 100%;
          font-size: 14px;
          line-height: 1.55;
        }
        .dynamic-markdown .katex {
          font-size: 1.15em;
        }
        .dynamic-markdown .katex-display,
        .theory-attr-math .katex-display {
          display: block;
          max-width: 100%;
          margin: 1em 0;
          padding: 0.75em 0;
          overflow-x: auto;
          overflow-y: hidden;
          text-align: center;
        }
        .dynamic-markdown .katex-display > .katex,
        .theory-attr-math .katex-display > .katex {
          display: inline-block;
          width: max-content;
          max-width: none;
          white-space: nowrap;
          text-align: initial;
        }
        .theory-attr-math {
          display: inline-block;
          max-width: 100%;
          vertical-align: middle;
          overflow-x: auto;
          padding: 0.15em 0;
        }
        .theory-attr-math:has(.katex-display) {
          display: block;
          overflow-x: visible;
          padding: 0;
        }
        .dynamic-markdown p {
          margin-bottom: 0.75em;
          line-height: 1.55;
        }
        .dynamic-markdown ul {
          list-style-type: disc;
          padding-left: 1.5rem;
          margin: 1rem 0;
        }
        .dynamic-markdown ol {
          list-style-type: decimal;
          padding-left: 1.5rem;
          margin: 1rem 0;
        }
        .dynamic-markdown li {
          margin-bottom: 0.2rem;
          line-height: 1.55;
        }
        .dynamic-markdown ul ul {
          list-style-type: circle;
        }
        .dynamic-markdown ul ul ul {
          list-style-type: square;
        }
        .dynamic-markdown ol ol {
          list-style-type: lower-alpha;
        }
        .dynamic-markdown ol ol ol {
          list-style-type: lower-roman;
        }
        .dark .dynamic-markdown ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .dark .dynamic-markdown ::-webkit-scrollbar-track {
          background: #18181b;
          border-radius: 4px;
        }
        .dark .dynamic-markdown ::-webkit-scrollbar-thumb {
          background: #3f3f46;
          border-radius: 4px;
        }
        .dark .dynamic-markdown ::-webkit-scrollbar-thumb:hover {
          background: #52525b;
        }
        .theory-html {
          font-size: 14px;
          line-height: 1.55;
        }
        .theory-html p {
          margin-bottom: 0.75em;
          line-height: 1.55;
        }
        .theory-html img,
        .theory-html video {
          display: block;
          max-width: 100%;
          height: auto;
          margin: 1rem auto;
          border-radius: 12px;
        }
        .theory-html iframe {
          display: block;
          max-width: 100%;
          margin: 1rem auto;
          border: 0;
        }
        .theory-html table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.875rem;
          text-align: left;
        }
        .theory-html th,
        .theory-html td {
          padding: 0.625rem 1rem;
          border-bottom: 1px solid rgb(228 228 231);
          vertical-align: top;
        }
        .dark .theory-html th,
        .dark .theory-html td {
          border-bottom-color: rgb(39 39 42 / 0.6);
        }
        .theory-html th {
          font-weight: 600;
          color: rgb(24 24 27);
        }
        .dark .theory-html th {
          color: rgb(244 244 245);
        }
      `}</style>

      <main className="min-w-0">
        {isLoading && !embedded && (
          <div className="fixed inset-0 bg-white/80 dark:bg-zinc-950/90 z-50 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-900 dark:border-zinc-800 dark:border-t-zinc-100"></div>
              <p className="text-zinc-600 dark:text-zinc-300">Загрузка...</p>
            </div>
          </div>
        )}
        
        <div className={`min-w-0 ${isFullWidth || embedded ? 'w-full' : 'max-w-3xl mx-auto'} ${isFullWidth || embedded ? 'py-0' : 'py-12'} px-0 ${isLoading && !embedded ? 'opacity-50 pointer-events-none' : ''}`}>
          {components.map((section, idx) => (
            <SectionBlock key={idx} id={section.id} title={section.title} isHard={section.isHard}>
              {renderBlocks(section.orderedBlocks, onCopyBlock)}  
            </SectionBlock>
          ))} 
          {components.length === 0 && (
            <div className="dynamic-markdown">
              <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]} components={markdownComponents}>
                {continueOrderedListNumbers(normalizeDisplayMath(content))}
              </ReactMarkdown>
            </div>
          )}
        </div>
      </main>

      {(showNav || aside) && typeof document !== 'undefined' ? createPortal(
        <>
          {showNav ? (
            <div className={`${dockBottom} left-3 md:left-[calc(var(--nav-inset,0px)+1.5rem)]`}>
              <button
                type="button"
                onClick={() => setIsNavOpen(!isNavOpen)}
                className={iconButtonClass}
                aria-expanded={isNavOpen}
                aria-label={isNavOpen ? 'Закрыть разделы' : 'Разделы материала'}
              >
                {isNavOpen ? <X size={18} strokeWidth={2} /> : <Menu size={18} strokeWidth={2} />}
              </button>
              {isNavOpen ? (
                <>
                  <button
                    type="button"
                    className="fixed inset-0 z-20 cursor-default"
                    aria-label="Закрыть разделы"
                    onClick={() => setIsNavOpen(false)}
                  />
                  <div className="absolute bottom-12 left-0 z-40 flex max-h-[min(24rem,70vh)] w-[min(18rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-[#09090b]">
                    <div className="shrink-0 border-b border-zinc-100 px-3 py-3 dark:border-zinc-800">
                      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Разделы</p>
                      <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                        {components.length} в этом материале
                      </p>
                    </div>
                    <div className="min-h-0 overflow-y-auto">
                      {components.map((section) => (
                        <button
                          key={section.id}
                          type="button"
                          onClick={() => scrollToSection(section.id)}
                          className={`flex min-h-11 w-full items-center gap-2 border-b border-zinc-100 px-3 py-3 text-left text-sm last:border-0 dark:border-zinc-800 ${
                            activeId === section.id
                              ? 'bg-zinc-100 font-medium text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100'
                              : 'text-zinc-600 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-900'
                          }`}
                        >
                          <span className="line-clamp-2 flex-1 leading-tight"><MathText text={section.title} /></span>
                          {activeId === section.id ? (
                            <CheckCircle2 size={14} className="shrink-0 text-zinc-900 dark:text-zinc-100" />
                          ) : null}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          ) : null}
          {aside ? (
            <div className={`${dockBottom} right-3 flex h-10 w-10 items-center justify-center`}>
              {aside}
            </div>
          ) : null}
        </>,
        document.body,
      ) : null}
    </div>
  );
});
