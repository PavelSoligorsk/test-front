import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import { useNavigate } from 'react-router-dom';
import { 
  PlusCircle, Database, Users, LayoutDashboard, 
  Search, Send, Eye, UserX, Image as ImageIcon, 
  ChevronRight, Layers, Trash2, Edit3, CheckCircle2,
  ChevronDown, ChevronUp, MailCheck, ShieldCheck, XCircle,
  Upload, Loader2, MapPin, BookOpen, Library, Menu, X
} from 'lucide-react';
import 'katex/dist/katex.min.css';

// Модуль секции — теперь это плоский, открытый и чистый блок контента
const SectionBlock = ({ id, title, children, isHard }) => {
  const [isOpen, setIsOpen] = useState(true);
  
  return (
    <section id={id} className="scroll-mt-20 border-b border-slate-100 pb-12 last:border-0">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6 group"
      >
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <h2 className="text-xl font-medium text-slate-950 tracking-tight">
            {title}
          </h2>
          {isHard && (
            <span className="self-start sm:self-auto px-2 py-0.5 text-[10px] font-medium tracking-wider uppercase rounded bg-rose-50 text-rose-600 border border-rose-100">
              Повышенная сложность
            </span>
          )}
        </div>
        {isOpen ? (
          <ChevronUp size={20} className="text-slate-400 group-hover:text-slate-600 transition-colors" />
        ) : (
          <ChevronDown size={20} className="text-slate-400 group-hover:text-slate-600 transition-colors" />
        )}
      </button>
      
      {isOpen && (
        <div className="space-y-6 text-slate-700 dynamic-markdown text-left">
          {children}
        </div>
      )}
    </section>
  );
};

// Блоки теории (Кастомизированный контрастный минимализм)
const Def = ({ title = "Определение", children }) => (
  <div className="my-6 p-4 sm:p-5 rounded-r-xl border-l-4 border-indigo-500 bg-indigo-50/40 text-left">
    <div className="mb-2">
      <span className="text-xs font-semibold uppercase tracking-wider text-indigo-700">📖 {title}</span>
    </div>
    <div className="text-slate-800 text-sm sm:text-base leading-relaxed">
      {children}
    </div>
  </div>
);

const Ex = ({ title, children, isHard }) => {
  const resolvedTitle = title || (isHard ? "Сложный пример" : "Пример");
  return (
    <div className={`my-6 p-4 sm:p-5 rounded-r-xl border-l-4 text-left ${
      isHard ? 'border-rose-400 bg-rose-50/40' : 'border-emerald-500 bg-emerald-50/40'
    }`}>
      <div className="mb-2">
        <span className={`text-xs font-semibold uppercase tracking-wider ${
          isHard ? 'text-rose-700' : 'text-emerald-700'
        }`}>📝 {resolvedTitle}</span>
      </div>
      <div className="text-slate-800 text-sm sm:text-base leading-relaxed">
        {children}
      </div>
    </div>
  );
};

const Explanation = ({ children }) => (
  <div className="my-6 p-4 sm:p-5 rounded-r-xl border-l-4 border-amber-500 bg-amber-50/40 text-left">
    <div className="mb-2">
      <span className="text-xs font-semibold uppercase tracking-wider text-amber-800">💡 Пояснение</span>
    </div>
    <div className="text-slate-800 text-sm sm:text-base leading-relaxed">
      {children}
    </div>
  </div>
);

// Элементы Markdown
const markdownComponents = {
  img: ({ src, alt }) => (
  <img 
    src={src} 
    alt={alt} 
    className="max-w-full lg:w-3/4 h-auto my-6 block rounded-lg border border-slate-100 mx-auto shadow-sm" 
  />
),
  table: ({ children }) => (
    <div className="overflow-x-auto my-6 rounded-lg border border-slate-200">
      <table className="min-w-full text-left text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-slate-50 border-b border-slate-200">{children}</thead>,
  th: ({ children }) => <th className="py-2.5 px-4 font-semibold text-slate-900 whitespace-nowrap">{children}</th>,
  td: ({ children }) => <td className="border-b border-slate-100 py-2.5 px-4 text-slate-600 align-top">{children}</td>,
  code: ({ children }) => (
    <code className="bg-slate-100 border border-slate-200/60 text-slate-800 px-1.5 py-0.5 rounded text-xs font-mono break-words">
      {children}
    </code>
  ),
};
export const TheoryViewer = ({ content, isFullWidth = false }) => {
  const [components, setComponents] = useState([]);
  const [activeId, setActiveId] = useState('');
  const [isNavOpen, setIsNavOpen] = useState(false);

 // Парсинг MDX структуры
useEffect(() => {
  const parseContent = () => {
    const sections = [];
    const sectionRegex = /<Section\s+id="([^"]+)"\s+title="([^"]+)"(?:\s+isHard)?>([\s\S]*?)<\/Section>/g;
    let match;
    
    while ((match = sectionRegex.exec(content)) !== null) {
      const [, id, title, sectionContent] = match;
      const isHard = match[0].includes('isHard');
      
      // Ищем все теги в порядке их появления
      const allTags = [];
      const defRegex = /<Def(?:\s+title="([^"]+)")?>([\s\S]*?)<\/Def>/g;
      const exRegex = /<Ex(?:\s+title="([^"]+)")?(?:\s+isHard)?>([\s\S]*?)<\/Ex>/g;
      const expRegex = /<Explanation>([\s\S]*?)<\/Explanation>/g;
      
      let defMatch;
      while ((defMatch = defRegex.exec(sectionContent)) !== null) {
        allTags.push({
          type: 'def',
          title: defMatch[1] || 'Определение',
          content: defMatch[2],
          index: defMatch.index,
          endIndex: defMatch.index + defMatch[0].length
        });
      }
      
      let exMatch;
      while ((exMatch = exRegex.exec(sectionContent)) !== null) {
        allTags.push({
          type: 'ex',
          title: exMatch[1] || 'Пример',
          content: exMatch[2],
          isHard: exMatch[0].includes('isHard'),
          index: exMatch.index,
          endIndex: exMatch.index + exMatch[0].length
        });
      }
      
      let expMatch;
      while ((expMatch = expRegex.exec(sectionContent)) !== null) {
        allTags.push({
          type: 'explanation',
          content: expMatch[1],
          index: expMatch.index,
          endIndex: expMatch.index + expMatch[0].length
        });
      }
      
      // Сортируем по индексу появления
      allTags.sort((a, b) => a.index - b.index);
      
      // Собираем текст между тегами и формируем orderedBlocks
      const orderedBlocks = [];
      let pointer = 0;
      
      for (const tag of allTags) {
        // Текст перед тегом
        if (tag.index > pointer) {
          const betweenText = sectionContent.substring(pointer, tag.index).trim();
          if (betweenText) {
            orderedBlocks.push({ type: 'text', content: betweenText });
          }
        }
        
        // Сам тег
        orderedBlocks.push(tag);
        
        pointer = tag.endIndex;
      }
      
      // Текст после последнего тега
      if (pointer < sectionContent.length) {
        const afterText = sectionContent.substring(pointer).trim();
        if (afterText) {
          orderedBlocks.push({ type: 'text', content: afterText });
        }
      }
      
      // Раскладываем по старым массивам для обратной совместимости
      const defs = [];
      const exs = [];
      const explanations = [];
      const rawTextParts = [];
      
      for (const block of orderedBlocks) {
        if (block.type === 'text') {
          rawTextParts.push(block.content);
        } else if (block.type === 'def') {
          defs.push({ title: block.title, content: block.content });
        } else if (block.type === 'ex') {
          exs.push({ title: block.title, content: block.content, isHard: block.isHard });
        } else if (block.type === 'explanation') {
          explanations.push(block.content);
        }
      }
      
      const rawContent = rawTextParts.join('\n\n');
      
      sections.push({ 
        id, 
        title, 
        isHard, 
        defs, 
        exs, 
        explanations, 
        rawContent,
        orderedBlocks  // ← новый ключ с правильным порядком
      });
    }
    setComponents(sections);
    if (sections.length > 0) setActiveId(sections[0].id);
  };
  
  parseContent();
}, [content]);

  // Подсветка активной секции при скролле
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
    <div className={`relative bg-white ${isFullWidth ? '' : 'min-h-screen'}`}>
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
      `}</style>

      {/* ========== ОСНОВНОЙ КОНТЕНТ ========== */}
      <main>
        {/* Если fullWidth - убираем max-w-3xl и py-12 */}
        <div className={`${isFullWidth ? 'w-full' : 'max-w-3xl mx-auto'} ${isFullWidth ? 'py-0' : 'py-12'} px-4`}>
         {components.map((section, idx) => (
  <SectionBlock key={idx} id={section.id} title={section.title} isHard={section.isHard}>
    
    {/* Если есть orderedBlocks — рендерим по порядку */}
    {section.orderedBlocks ? (
      section.orderedBlocks.map((block, bidx) => {
        if (block.type === 'text') {
          return (
            <ReactMarkdown 
              key={bidx}
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
            <Def key={bidx} title={block.title}>
              <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]} components={markdownComponents}>
                {block.content}
              </ReactMarkdown>
            </Def>
          );
        }
        if (block.type === 'ex') {
          return (
            <Ex key={bidx} title={block.title} isHard={block.isHard}>
              <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]} components={markdownComponents}>
                {block.content}
              </ReactMarkdown>
            </Ex>
          );
        }
        if (block.type === 'explanation') {
          return (
            <Explanation key={bidx}>
              <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]} components={markdownComponents}>
                {block.content}
              </ReactMarkdown>
            </Explanation>
          );
        }
        return null;
      })
    ) : (
      // Фолбэк — старый порядок
      <>
        {section.rawContent && (
          <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]} components={markdownComponents}>
            {section.rawContent}
          </ReactMarkdown>
        )}
        {section.defs.map((def, didx) => (
          <Def key={didx} title={def.title}>
            <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]} components={markdownComponents}>
              {def.content}
            </ReactMarkdown>
          </Def>
        ))}
        {section.exs.map((ex, eidx) => (
          <Ex key={eidx} title={ex.title} isHard={ex.isHard}>
            <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]} components={markdownComponents}>
              {ex.content}
            </ReactMarkdown>
          </Ex>
        ))}
        {section.explanations.map((exp, xidx) => (
          <Explanation key={xidx}>
            <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]} components={markdownComponents}>
              {exp}
            </ReactMarkdown>
          </Explanation>
        ))}
      </>
    )}
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

      {/* ========== ПЛАВАЮЩАЯ КНОПКА НАВИГАЦИИ (только если не fullWidth) ========== */}
      {!isFullWidth && components.length > 0 && (
        <div className="fixed bottom-6 right-6 z-50">
          {/* Кнопка-триггер */}
          <button
            onClick={() => setIsNavOpen(!isNavOpen)}
            className="w-14 h-14 md:w-10 md:h-10 bg-slate-900 text-white rounded-full shadow-lg md:shadow-md flex items-center justify-center hover:bg-slate-800 transition-all active:scale-95"
          >
            {isNavOpen ? <X size={18} className="md:w-4 md:h-4" /> : <Menu size={18} className="md:w-4 md:h-4" />}
          </button>

          {/* Выпадающий список */}
          {isNavOpen && (
            <>
              <div 
                className="fixed inset-0 bg-black/20 backdrop-blur-sm"
                onClick={() => setIsNavOpen(false)}
              />
              <div className="absolute bottom-16 right-0 md:bottom-14 w-80 md:w-64 bg-white rounded-xl md:rounded-lg shadow-xl border border-slate-200 overflow-hidden">
                <div className="p-3 md:p-2.5 bg-slate-50 border-b border-slate-100">
                  <div className="text-[9px] md:text-[8px] font-black uppercase tracking-wider text-slate-400">
                    Содержание урока
                  </div>
                  <div className="text-xs md:text-[10px] font-semibold text-slate-800 mt-0.5">
                    {components.length} разделов
                  </div>
                </div>
                <div className="max-h-80 md:max-h-64 overflow-y-auto">
                  {components.map((section, idx) => (
                    <button
                      key={section.id}
                      onClick={() => scrollToSection(section.id)}
                      className={`w-full text-left px-3 md:px-2.5 py-2.5 md:py-2 text-sm md:text-xs transition-all border-b border-slate-50 last:border-0 ${
                        activeId === section.id
                          ? 'bg-slate-100 text-slate-900 font-medium'
                          : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <span className={`text-[10px] md:text-[9px] font-mono ${activeId === section.id ? 'text-slate-900' : 'text-slate-400'}`}>
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
                <div className="p-2 md:p-1.5 bg-slate-50 border-t border-slate-100">
                  <button
                    onClick={() => setIsNavOpen(false)}
                    className="w-full py-1.5 text-[9px] md:text-[8px] font-medium text-slate-500 hover:text-slate-700 transition-colors"
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