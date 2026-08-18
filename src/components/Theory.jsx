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
  GeoGebra
} from './TheoryBlocks';

// ========== ЭЛЕМЕНТЫ MARKDOWN ==========

const markdownComponents = {
  img: ({ src, alt }) => (
    <img 
      src={src} 
      alt={alt} 
      className="max-w-full lg:w-1/2 h-auto my-6 block rounded-lg border border-slate-200 dark:border-slate-700 mx-auto shadow-sm transition-colors" 
    />
  ),
  table: ({ children }) => (
    <div className="overflow-x-auto my-6 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors">
      <table className="min-w-full text-left text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 transition-colors">
      {children}
    </thead>
  ),
  th: ({ children }) => (
    <th className="py-2.5 px-4 font-semibold text-slate-900 dark:text-white whitespace-nowrap transition-colors">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border-b border-slate-100 dark:border-slate-700/50 py-2.5 px-4 text-slate-600 dark:text-slate-300 align-top transition-colors">
      {children}
    </td>
  ),
  code: ({ children }) => (
    <code className="bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 text-slate-800 dark:text-slate-200 px-1.5 py-0.5 rounded text-xs font-mono break-words transition-colors">
      {children}
    </code>
  ),
  ul: ({ children }) => (
    <ul className="list-disc pl-6 my-4 space-y-2 text-slate-700 dark:text-slate-300 transition-colors">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal pl-6 my-4 space-y-2 text-slate-700 dark:text-slate-300 transition-colors">
      {children}
    </ol>
  ),
  li: ({ children }) => (
    <li className="pl-1 leading-relaxed">{children}</li>
  ),
  blockquote: ({ children }) => (
    <blockquote className="pl-4 py-2 my-4 border-l-4 border-slate-300 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-800/30 text-slate-700 dark:text-slate-300 transition-colors">
      {children}
    </blockquote>
  ),
  hr: () => (
    <hr className="my-8 border-slate-200 dark:border-slate-700 transition-colors" />
  ),
  a: ({ href, children }) => (
    <a 
      href={href} 
      className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors"
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

// Функция для поиска следующего парного или самозакрывающегося тега с учетом вложенности
const findNextTag = (content, startIndex = 0) => {
  const tagRegex = /<(\/)?(Def|Ex|Explanation|Important|Formula|Collapsible|Grid|Card|Steps|GeoGebra)([\s\S]*?)(\/)?>/g;
  tagRegex.lastIndex = startIndex;
  
  let match = tagRegex.exec(content);
  if (!match) return null;

  const [fullMatch, isClosing, tagName, attrs, isSelfClosing] = match;
  const index = match.index;

  // Если это самозакрывающийся тег (например <GeoGebra ... />)
  if (isSelfClosing) {
    return {
      tagName,
      attrs,
      isSelfClosing: true,
      startIndex: index,
      endIndex: index + fullMatch.length,
      innerContent: ''
    };
  }

  // Если это закрывающий тег без пары
  if (isClosing) {
    return findNextTag(content, index + fullMatch.length);
  }

  // Поиск парного закрывающего тега с балансировкой вложенности
  let depth = 1;
  const searchRegex = new RegExp(`<(\/)?${tagName}(?:[\\s\\S]*?)(\/)?>`, 'g');
  searchRegex.lastIndex = index + fullMatch.length;

  let nestedMatch;
  while ((nestedMatch = searchRegex.exec(content)) !== null) {
    const [nFull, nClosing, nSelfClosing] = nestedMatch;
    if (nSelfClosing) continue; // Игнорируем самозакрывающиеся теги
    
    if (nClosing) {
      depth--;
    } else {
      depth++;
    }

    if (depth === 0) {
      return {
        tagName,
        attrs,
        isSelfClosing: false,
        startIndex: index,
        endIndex: nestedMatch.index + nFull.length,
        innerContent: content.substring(index + fullMatch.length, nestedMatch.index)
      };
    }
  }

  return null;
};

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
    } else if (tagName === 'Steps') {
      // Извлекаем отдельные шаги из <div>...</div> блоков
      const stepRegex = /<div[^>]*>([\s\S]*?)<\/div>/g;
      const stepContents = [];
      let stepMatch;
      while ((stepMatch = stepRegex.exec(innerContent)) !== null) {
        const stepText = stepMatch[1].trim();
        if (stepText) {
          stepContents.push(stepText);
        }
      }
      // Если <div> не найдены — используем весь контент как один шаг
      if (stepContents.length === 0) {
        const trimmed = innerContent.trim();
        if (trimmed) stepContents.push(trimmed);
      }
      blocks.push({
        type: 'steps',
        steps: stepContents
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
          {block.content}
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
    return null;
  });
};

// ========== ОСНОВНОЙ КОМПОНЕНТ ==========

export const TheoryViewer = ({ content, isFullWidth = false }) => {
  const [components, setComponents] = useState([]);
  const [activeId, setActiveId] = useState('');
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const parseContent = () => {
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
      if (sections.length > 0) setActiveId(sections[0].id);
    };

    parseContent();
  }, [content]);

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
    <div className={`relative bg-white dark:bg-slate-800 ${isFullWidth ? '' : 'min-h-screen'} transition-colors`}>
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
          background: #475569;
          border-radius: 4px;
        }
        .dark .dynamic-markdown ::-webkit-scrollbar-thumb {
          background: #64748b;
          border-radius: 4px;
        }
        .dark .dynamic-markdown ::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>

      <main>
        {isLoading && (
          <div className="fixed inset-0 bg-white/80 dark:bg-slate-700/90 backdrop-blur-sm z-50 flex items-center justify-center transition-colors">
            <div className="flex flex-col items-center gap-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 dark:border-white transition-colors"></div>
              <p className="text-slate-600 dark:text-slate-300 transition-colors">Загрузка...</p>
            </div>
          </div>
        )}
        
        <div className={`${isFullWidth ? 'w-full' : 'max-w-3xl mx-auto'} ${isFullWidth ? 'py-0' : 'py-12'} px-4 ${isLoading ? 'opacity-50 pointer-events-none' : ''}`}>
          {components.map((section, idx) => (
            <SectionBlock key={idx} id={section.id} title={section.title} isHard={section.isHard}>
              {renderBlocks(section.orderedBlocks)}  
            </SectionBlock>
          ))} 
          {components.length === 0 && (
            <div className="dynamic-markdown">
              <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]} components={markdownComponents}>
                {content}
              </ReactMarkdown>
            </div>
          )}
        </div>
      </main>

      {!isFullWidth && components.length > 0 && (
        <div className="fixed bottom-6 right-6 z-50">
          <button
            onClick={() => setIsNavOpen(!isNavOpen)}
            className="w-14 h-14 md:w-10 md:h-10 bg-slate-900 dark:bg-slate-600 text-white rounded-full shadow-lg md:shadow-md flex items-center justify-center hover:bg-slate-800 dark:hover:bg-slate-500 transition-all active:scale-95"
          >
            {isNavOpen ? <X size={18} className="md:w-4 md:h-4" /> : <Menu size={18} className="md:w-4 md:h-4" />}
          </button>

          {isNavOpen && (
            <>
              <div 
                className="fixed inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-sm transition-colors"
                onClick={() => setIsNavOpen(false)}
              />
              <div className="absolute bottom-16 right-0 md:bottom-14 w-80 md:w-64 bg-white dark:bg-slate-600 rounded-xl md:rounded-lg shadow-xl border border-slate-200 dark:border-slate-500 overflow-hidden transition-colors">
                <div className="p-3 md:p-2.5 bg-slate-50 dark:bg-slate-600 border-b border-slate-100 dark:border-slate-500 transition-colors">
                  <div className="text-[9px] md:text-[8px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-300 transition-colors">
                    Содержание урока
                  </div>
                  <div className="text-xs md:text-[10px] font-semibold text-slate-800 dark:text-white mt-0.5 transition-colors">
                    {components.length} разделов
                  </div>
                </div>
                <div className="max-h-80 md:max-h-64 overflow-y-auto">
                  {components.map((section, idx) => (
                    <button
                      key={section.id}
                      onClick={() => scrollToSection(section.id)}
                      className={`w-full text-left px-3 md:px-2.5 py-2.5 md:py-2 text-sm md:text-xs transition-all border-b last:border-0 ${
                        activeId === section.id
                          ? 'bg-slate-100 dark:bg-slate-500 text-slate-900 dark:text-white font-medium'
                          : 'text-slate-600 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-500/50'
                      } border-slate-50 dark:border-slate-500`}
                    >
                      <div className="flex items-start gap-2">
                        <span className={`text-[10px] md:text-[9px] font-mono transition-colors ${
                          activeId === section.id 
                            ? 'text-slate-900 dark:text-white' 
                            : 'text-slate-400 dark:text-slate-400'
                        }`}>
                          {String(idx + 1).padStart(2, '0')}
                        </span>
                        <span className="flex-1 leading-tight line-clamp-2">{section.title}</span>
                        {activeId === section.id && (
                          <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
                <div className="p-2 md:p-1.5 bg-slate-50 dark:bg-slate-600 border-t border-slate-100 dark:border-slate-500 transition-colors">
                  <button
                    onClick={() => setIsNavOpen(false)}
                    className="w-full py-1.5 text-[9px] md:text-[8px] font-medium text-slate-500 dark:text-slate-300 hover:text-slate-700 dark:hover:text-white transition-colors"
                  >
                    Закрыть
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};