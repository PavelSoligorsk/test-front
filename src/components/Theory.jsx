import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import { 
  CheckCircle2, Menu, X 
} from 'lucide-react';
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
} from './TheoryBlocks';
import { normalizeDisplayMath } from './theoryMath';

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
  ol: ({ children }) => (
    <ol className="list-decimal pl-6 my-4 space-y-2 text-zinc-700 dark:text-zinc-300">
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

// ========== ПАРСЕР ВЛОЖЕННОГО MDX ==========

const convertMarkdownLists = (content) => {
  if (!content) return content;
  
  content = content.replace(
    /^([ \t]*)([-*])\s+(.+)$/gm,
    (match, indent, marker, text) => {
      const level = Math.floor(indent.length / 2);
      const prefix = '  '.repeat(level);
      return `${prefix}- ${text}`;
    }
  );
  
  content = content.replace(
    /^([ \t]*)(\d+)[.)]\s+(.+)$/gm,
    (match, indent, number, text) => {
      const level = Math.floor(indent.length / 2);
      const prefix = '  '.repeat(level);
      return `${prefix}${number}. ${text}`;
    }
  );
  
  return content;
};

const THEORY_TAG_NAMES = ['Explanation', 'Important', 'Formula', 'Collapsible', 'Algorithm', 'GeoGebra', 'Steps', 'Card', 'Grid', 'Html', 'Def', 'Ex'];

function scanTagClose(content, from) {
  let quote = null;
  let brace = 0;
  for (let i = from; i < content.length; i += 1) {
    const ch = content[i];
    if (quote) {
      if (ch === '\\') {
        i += 1;
        continue;
      }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      quote = ch;
      continue;
    }
    if (ch === '{') {
      brace += 1;
      continue;
    }
    if (ch === '}') {
      if (brace > 0) brace -= 1;
      continue;
    }
    if (ch === '>' && brace === 0) {
      return { end: i + 1, selfClosing: content[i - 1] === '/' };
    }
  }
  return null;
}

const findNextTag = (content, startIndex = 0) => {
  const startRe = new RegExp(`<(${THEORY_TAG_NAMES.join('|')})(?=[\\s/>])`, 'g');
  startRe.lastIndex = startIndex;
  const match = startRe.exec(content);
  if (!match) return null;

  const tagName = match[1];
  const index = match.index;
  const scanned = scanTagClose(content, index + match[0].length);
  if (!scanned) return null;

  const attrs = content.slice(index + match[0].length, scanned.selfClosing ? scanned.end - 2 : scanned.end - 1);

  if (scanned.selfClosing) {
    return {
      tagName,
      attrs,
      isSelfClosing: true,
      startIndex: index,
      endIndex: scanned.end,
      innerContent: '',
    };
  }

  let depth = 1;
  const nestedRe = new RegExp(`<(/)?${tagName}(?=[\\s/>])`, 'g');
  nestedRe.lastIndex = scanned.end;

  let nested;
  while ((nested = nestedRe.exec(content)) !== null) {
    const nestedStart = nested.index;
    const nestedScanned = scanTagClose(content, nestedStart + nested[0].length);
    if (!nestedScanned) return null;
    nestedRe.lastIndex = nestedScanned.end;

    if (nested[1]) {
      depth -= 1;
      if (depth === 0) {
        return {
          tagName,
          attrs,
          isSelfClosing: false,
          startIndex: index,
          endIndex: nestedScanned.end,
          innerContent: content.slice(scanned.end, nestedStart),
        };
      }
    } else if (!nestedScanned.selfClosing) {
      depth += 1;
    }
  }

  return null;
};

function extractDivSteps(innerContent) {
  const tagged = /<Step[^>]*>([\s\S]*?)<\/Step>/gi;
  const fromStep = [];
  let taggedMatch;
  while ((taggedMatch = tagged.exec(innerContent)) !== null) {
    const stepText = taggedMatch[1].trim();
    if (stepText) fromStep.push(stepText);
  }
  if (fromStep.length) return fromStep;

  const stepRegex = /<div[^>]*>([\s\S]*?)<\/div>/g;
  const stepContents = [];
  let stepMatch;
  while ((stepMatch = stepRegex.exec(innerContent)) !== null) {
    const stepText = stepMatch[1].trim();
    if (stepText) stepContents.push(stepText);
  }
  if (stepContents.length === 0) {
    const trimmed = innerContent.trim();
    if (trimmed) stepContents.push(trimmed);
  }
  return stepContents;
}

const parseBlocks = (content) => {
  if (!content) return [];
  
  const blocks = [];
  let pointer = 0;

  while (pointer < content.length) {
    const tagMatch = findNextTag(content, pointer);

    if (!tagMatch) {
      const remainingText = content.substring(pointer).trim();
      if (remainingText) {
        blocks.push({ type: 'text', content: convertMarkdownLists(remainingText) });
      }
      break;
    }

    if (tagMatch.startIndex > pointer) {
      const textBefore = content.substring(pointer, tagMatch.startIndex).trim();
      if (textBefore) {
        blocks.push({ type: 'text', content: convertMarkdownLists(textBefore) });
      }
    }

    const { tagName, attrs, innerContent } = tagMatch;

    if (tagName === 'Def') {
      const titleMatch = attrs.match(/title="([^"]+)"/);
      blocks.push({
        type: 'def',
        title: titleMatch ? titleMatch[1] : 'Определение',
        blocks: parseBlocks(innerContent) // Рекурсивный парсинг вложенных блоков
      });
    } else if (tagName === 'Ex') {
      const titleMatch = attrs.match(/title="([^"]+)"/);
      const isHard = attrs.includes('isHard');
      blocks.push({
        type: 'ex',
        title: titleMatch ? titleMatch[1] : null,
        isHard,
        blocks: parseBlocks(innerContent) // Рекурсивный парсинг вложенных блоков
      });
    } else if (tagName === 'Explanation') {
      blocks.push({
        type: 'explanation',
        blocks: parseBlocks(innerContent) // Рекурсивный парсинг вложенных блоков
      });
    } else if (tagName === 'Important') {
      const titleMatch = attrs.match(/title="([^"]+)"/);
      blocks.push({
        type: 'important',
        title: titleMatch ? titleMatch[1] : 'Важно',
        blocks: parseBlocks(innerContent)
      });
    } else if (tagName === 'Formula') {
      const titleMatch = attrs.match(/title="([^"]+)"/);
      blocks.push({
        type: 'formula',
        title: titleMatch ? titleMatch[1] : null,
        blocks: parseBlocks(innerContent)
      });
    } else if (tagName === 'Collapsible') {
      const titleMatch = attrs.match(/title="([^"]+)"/);
      blocks.push({
        type: 'collapsible',
        title: titleMatch ? titleMatch[1] : 'Доказательство',
        blocks: parseBlocks(innerContent)
      });
    } else if (tagName === 'Grid') {
      const colsMatch = attrs.match(/cols="?(\d+)"?/);
      blocks.push({
        type: 'grid',
        cols: colsMatch ? parseInt(colsMatch[1], 10) : 2,
        blocks: parseBlocks(innerContent)
      });
    } else if (tagName === 'Card') {
      const titleMatch = attrs.match(/title="([^"]+)"/);
      blocks.push({
        type: 'card',
        title: titleMatch ? titleMatch[1] : null,
        blocks: parseBlocks(innerContent)
      });
    } else if (tagName === 'Steps' || tagName === 'Algorithm') {
      blocks.push({
        type: 'steps',
        steps: extractDivSteps(innerContent)
      });
    } else if (tagName === 'GeoGebra') {
      const idMatch = attrs.match(/id="([^"]+)"/);
      const heightMatch = attrs.match(/height="([^"]+)"/);
      const setupMatch = attrs.match(/setup=\{`([\s\S]*?)`\}/) || attrs.match(/setup="([^"]+)"/);

      blocks.push({
        type: 'geogebra',
        id: idMatch ? idMatch[1] : null,
        height: heightMatch ? heightMatch[1] : "400",
        setup: setupMatch ? setupMatch[1] : null
      });
    } else if (tagName === 'Html') {
      const htmlMatch = attrs.match(/html="([^"]*)"/);
      blocks.push({
        type: 'html',
        html: htmlMatch ? htmlMatch[1] : innerContent,
      });
    }

    pointer = tagMatch.endIndex;
  }

  return blocks;
};

const renderBlocks = (blocks) => {
  if (!blocks || !Array.isArray(blocks)) return null;
  
  return blocks.map((block, idx) => {
    if (block.type === 'text') {
      return (
        <ReactMarkdown 
          key={idx}
          remarkPlugins={[remarkMath, remarkGfm]} 
          rehypePlugins={[rehypeKatex]} 
          components={markdownComponents}
        >
          {normalizeDisplayMath(block.content)}
        </ReactMarkdown>
      );
    }
    if (block.type === 'def') {
      return (
        <Def key={idx} title={block.title}>
          {renderBlocks(block.blocks)}
        </Def>
      );
    }
    if (block.type === 'ex') {
      return (
        <Ex key={idx} title={block.title} isHard={block.isHard}>
          {renderBlocks(block.blocks)}
        </Ex>
      );
    }
    if (block.type === 'explanation') {
      return (
        <Explanation key={idx}>
          {renderBlocks(block.blocks)}
        </Explanation>
      );
    }
    if (block.type === 'important') {
      return (
        <Important key={idx} title={block.title}>
          {renderBlocks(block.blocks)}
        </Important>
      );
    }
    if (block.type === 'formula') {
      return (
        <Formula key={idx} title={block.title}>
          {renderBlocks(block.blocks)}
        </Formula>
      );
    }
    if (block.type === 'collapsible') {
      return (
        <Collapsible key={idx} title={block.title}>
          {renderBlocks(block.blocks)}
        </Collapsible>
      );
    }
    if (block.type === 'grid') {
      return (
        <Grid key={idx} cols={block.cols}>
          {renderBlocks(block.blocks)}
        </Grid>
      );
    }
    if (block.type === 'card') {
      return (
        <Card key={idx} title={block.title}>
          {renderBlocks(block.blocks)}
        </Card>
      );
    }
    if (block.type === 'steps') {
      return (
        <Steps key={idx}>
          {(block.steps || []).map((step, i) => (
            <div key={i}>
              {renderBlocks(parseBlocks(step))}
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
        />
      );
    }
    if (block.type === 'html') {
      return <Html key={idx} html={block.html} />;
    }
    return null;
  });
};

// ========== ОСНОВНОЙ КОМПОНЕНТ ==========

export const TheoryViewer = React.memo(({ content, isFullWidth = false, embedded = false }) => {
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
      const sections = [];
      const sectionRegex = /<Section\s+id="([^"]+)"\s+title="([^"]+)"(?:\s+isHard)?>([\s\S]*?)<\/Section>/g;
      let match;
      
      while ((match = sectionRegex.exec(content)) !== null) {
        const [, id, title, sectionContent] = match;
        const isHard = match[0].includes('isHard');
        
        const orderedBlocks = parseBlocks(sectionContent);
        
        sections.push({ 
          id, 
          title, 
          isHard, 
          orderedBlocks
        });
      }
      
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

  return (
    <div className={`relative ${embedded ? 'bg-transparent' : 'bg-white dark:bg-[#09090b]'} ${isFullWidth || embedded ? '' : 'min-h-screen'}`}>
      <style>{`
        .dynamic-markdown .katex-display {
          overflow-x: auto;
          overflow-y: hidden;
          text-align: center;
          padding: 10px 0;
          margin: 1.2em 0;
        }
        .dynamic-markdown .katex-display > .katex {
          text-align: center !important;
          white-space: nowrap;
        }
        .theory-attr-math {
          display: inline;
        }
        .theory-attr-math:has(.katex-display) {
          display: block;
        }
        .theory-attr-math .katex-display {
          overflow-x: auto;
          overflow-y: hidden;
          text-align: center;
          margin: 0.35em 0;
          padding: 0;
        }
        .dynamic-markdown p {
          margin-bottom: 1em;
          line-height: 1.625;
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
          margin-bottom: 0.25rem;
          line-height: 1.625;
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
        .theory-html p {
          margin-bottom: 1em;
          line-height: 1.625;
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

      <main>
        {isLoading && !embedded && (
          <div className="fixed inset-0 bg-white/80 dark:bg-zinc-950/90 z-50 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-zinc-900 dark:border-zinc-100"></div>
              <p className="text-zinc-600 dark:text-zinc-300">Загрузка...</p>
            </div>
          </div>
        )}
        
        <div className={`${isFullWidth || embedded ? 'w-full' : 'max-w-3xl mx-auto'} ${isFullWidth || embedded ? 'py-0' : 'py-12'} px-0 ${isLoading && !embedded ? 'opacity-50 pointer-events-none' : ''}`}>
          {components.map((section, idx) => (
            <SectionBlock key={idx} id={section.id} title={section.title} isHard={section.isHard}>
              {renderBlocks(section.orderedBlocks)}  
            </SectionBlock>
          ))} 
          {components.length === 0 && (
            <div className="dynamic-markdown">
              <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]} components={markdownComponents}>
                {normalizeDisplayMath(content)}
              </ReactMarkdown>
            </div>
          )}
        </div>
      </main>

      {!isFullWidth && components.length > 0 && (
        <div className="fixed bottom-6 left-6 z-40">
          <button
            type="button"
            onClick={() => setIsNavOpen(!isNavOpen)}
            className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm flex items-center justify-center hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-white"
            aria-expanded={isNavOpen}
            aria-label={isNavOpen ? 'Закрыть разделы' : 'Разделы материала'}
          >
            {isNavOpen ? <X size={18} strokeWidth={2} /> : <Menu size={18} strokeWidth={2} />}
          </button>

          {isNavOpen && (
            <>
              <div
                className="fixed inset-0 bg-black/20 dark:bg-black/50"
                onClick={() => setIsNavOpen(false)}
              />
              <div className="fixed left-4 right-4 bottom-[4.75rem] md:absolute md:left-0 md:right-auto md:bottom-14 md:w-72 bg-white dark:bg-[#09090b] rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden max-h-[min(24rem,70vh)] flex flex-col">
                <div className="p-3 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
                  <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                    Разделы
                  </p>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                    {components.length} в этом материале
                  </p>
                </div>
                <div className="overflow-y-auto min-h-0">
                  {components.map((section) => (
                    <button
                      key={section.id}
                      type="button"
                      onClick={() => scrollToSection(section.id)}
                      className={`w-full text-left px-3 py-3 text-sm border-b last:border-0 min-h-11 ${
                        activeId === section.id
                          ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-medium'
                          : 'text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900'
                      } border-zinc-50 dark:border-zinc-800`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="flex-1 leading-tight line-clamp-2"><MathText text={section.title} /></span>
                        {activeId === section.id && (
                          <CheckCircle2 size={14} className="text-zinc-900 dark:text-zinc-100 shrink-0" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
});