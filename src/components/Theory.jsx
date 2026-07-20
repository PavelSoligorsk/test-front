import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import { 
  ChevronDown, ChevronUp, CheckCircle2, Menu, X 
} from 'lucide-react';
import 'katex/dist/katex.min.css';

// ========== СЕКЦИИ И БЛОКИ ТЕОРИИ ==========

const SectionBlock = ({ id, title, children, isHard }) => {
  const [isOpen, setIsOpen] = useState(true);
  
  return (
    <section id={id} className="scroll-mt-20 border-b border-slate-100 dark:border-slate-700 pb-12 last:border-0">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6 group"
      >
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <h2 className="text-xl font-medium text-slate-950 dark:text-white tracking-tight">
            {title}
          </h2>
          {isHard && (
            <span className="self-start sm:self-auto px-2 py-0.5 text-[10px] font-medium tracking-wider uppercase rounded bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-300 border border-rose-100 dark:border-rose-800">
              Повышенная сложность
            </span>
          )}
        </div>
        {isOpen ? (
          <ChevronUp size={20} className="text-slate-400 dark:text-slate-500 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors" />
        ) : (
          <ChevronDown size={20} className="text-slate-400 dark:text-slate-500 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors" />
        )}
      </button>
      
      {isOpen && (
        <div className="space-y-6 text-slate-700 dark:text-slate-300 dark:text-slate-300 dynamic-markdown text-left">
          {children}
        </div>
      )}
    </section>
  );
};

const Def = ({ title = "Определение", children }) => (
  <div className="my-6 p-4 sm:p-5 rounded-r-xl border-l-4 border-indigo-500 bg-indigo-50/40 dark:bg-indigo-900/30 text-left">
    <div className="mb-2">
      <span className="text-xs font-semibold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">📖 {title}</span>
    </div>
    <div className="text-slate-800 dark:text-slate-200 text-sm sm:text-base leading-relaxed">
      {children}
    </div>
  </div>
);

const Ex = ({ title, children, isHard }) => {
  const resolvedTitle = title || (isHard ? "Сложный пример" : "Пример");
  return (
    <div className={`my-6 p-4 sm:p-5 rounded-r-xl border-l-4 text-left ${
      isHard ? 'border-rose-400 bg-rose-50/40 dark:bg-rose-900/30' : 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-900/30'
    }`}>
      <div className="mb-2">
        <span className={`text-xs font-semibold uppercase tracking-wider ${
          isHard ? 'text-rose-700 dark:text-rose-300' : 'text-emerald-700 dark:text-emerald-300'
        }`}>📝 {resolvedTitle}</span>
      </div>
      <div className="text-slate-800 dark:text-slate-200 text-sm sm:text-base leading-relaxed">
        {children}
      </div>
    </div>
  );
};

const Explanation = ({ children }) => (
  <div className="my-6 p-4 sm:p-5 rounded-r-xl border-l-4 border-amber-500 bg-amber-50/40 dark:bg-amber-900/30 text-left">
    <div className="mb-2">
      <span className="text-xs font-semibold uppercase tracking-wider text-amber-800 dark:text-amber-300">💡 Пояснение</span>
    </div>
    <div className="text-slate-800 dark:text-slate-200 text-sm sm:text-base leading-relaxed">
      {children}
    </div>
  </div>
);

// ========== ИНТЕРАКТИВНЫЙ БЛОК GEOGEBRA ==========

const GeoGebra = ({ id, setup, height = "400" }) => {
  const containerRef = useRef(null);
  const appletId = useRef(`ggb-${Math.random().toString(36).substring(2, 9)}`);

  useEffect(() => {
    const initApplet = () => {
      if (!containerRef.current) return;

      const parameters = {
        "id": appletId.current,
        "width": containerRef.current.clientWidth || 600,
        "height": parseInt(height, 10),
        "showToolBar": false,
        "showMenuBar": false,
        "showAlgebraInput": false,
        "enableLabelDrags": false,
        "enableShiftDragZoom": true,
        "language": "ru",
        "useBrowserForJS": false,
        ...(id ? { "material_id": id } : {}),
        "appletOnLoad": (api) => {
          // Базовые настройки если нет готового материала
          if (!id) {
            api.evalCommand('ShowAxes(true)');
            api.evalCommand('ShowGrid(true)');
          }

          // Обработка setup команд
          if (setup) {
            const commands = setup
              .split('\n')
              .map(cmd => cmd.trim())
              .filter(cmd => cmd.length > 0 && !cmd.startsWith('//') && !cmd.startsWith('#'));

            let viewCommands = [];
            let perspectiveCommand = null;
            let evalCommands = [];
            let delayedCommands = [];

            commands.forEach(cmd => {
              if (!cmd) return;

              if (cmd.startsWith('view:')) {
                const parts = cmd.substring(5).split(',').map(s => s.trim());
                viewCommands.push(parts);
              }
              else if (cmd.startsWith('perspective:')) {
                perspectiveCommand = cmd.substring(12).trim();
              }
              else if (cmd.startsWith('color:')) {
                const match = cmd.match(/color:\s*(\w+)\s*,\s*([\w#]+)/);
                if (match) {
                  delayedCommands.push({
                    type: 'color',
                    obj: match[1],
                    color: match[2]
                  });
                }
              }
              else if (cmd.startsWith('size:')) {
                const match = cmd.match(/size:\s*(\w+)\s*,\s*(\d+)/);
                if (match) {
                  delayedCommands.push({
                    type: 'size',
                    obj: match[1],
                    size: match[2]
                  });
                }
              }
              else if (cmd.startsWith('label:')) {
                const match = cmd.match(/label:\s*(\w+)\s*,\s*"([^"]+)"/);
                if (match) {
                  delayedCommands.push({
                    type: 'label',
                    obj: match[1],
                    label: match[2]
                  });
                }
              }
              else if (cmd.startsWith('show:')) {
                const items = cmd.substring(5).split(',').map(s => s.trim());
                delayedCommands.push({
                  type: 'show',
                  items: items
                });
              }
              else if (cmd.startsWith('hide:')) {
                const items = cmd.substring(5).split(',').map(s => s.trim());
                delayedCommands.push({
                  type: 'hide',
                  items: items
                });
              }
              else if (cmd.startsWith('animate:')) {
                const match = cmd.match(/animate:\s*(\w+)\s*,\s*(\w+)\s*,?\s*(\d+)?/);
                if (match) {
                  delayedCommands.push({
                    type: 'animate',
                    obj: match[1],
                    animate: match[2] === 'true',
                    speed: match[3] || null
                  });
                }
              }
              else if (cmd.includes('=') || cmd.includes(':=')) {
                evalCommands.push(cmd);
              }
              else {
                evalCommands.push(cmd);
              }
            });

            viewCommands.forEach(parts => {
              if (parts.length >= 4) {
                const xMin = parseFloat(parts[0]) || -10;
                const xMax = parseFloat(parts[1]) || 10;
                const yMin = parseFloat(parts[2]) || -10;
                const yMax = parseFloat(parts[3]) || 10;
                
                if (parts.length >= 6) {
                  const zMin = parseFloat(parts[4]) || -10;
                  const zMax = parseFloat(parts[5]) || 10;
                  api.setCoordSystem(xMin, xMax, yMin, yMax, zMin, zMax);
                } else {
                  api.setCoordSystem(xMin, xMax, yMin, yMax);
                }
                
                if (parts.includes('grid')) {
                  api.setGridVisible(true);
                }
                if (parts.includes('axes')) {
                  api.setAxesVisible(true, true);
                }
              }
            });

            if (perspectiveCommand) {
              api.setPerspective(perspectiveCommand);
            }

            evalCommands.forEach(cmd => {
              try {
                api.evalCommand(cmd);
              } catch (err) {
                console.error(`Ошибка выполнения команды "${cmd}":`, err);
              }
            });

            if (delayedCommands.length > 0) {
              setTimeout(() => {
                delayedCommands.forEach(dCmd => {
                  try {
                    switch (dCmd.type) {
                      case 'color':
                        api.setColor(dCmd.obj, ...hexToRgb(dCmd.color));
                        break;
                      case 'size':
                        api.setPointSize(dCmd.obj, parseInt(dCmd.size));
                        break;
                      case 'label':
                        api.setCaption(dCmd.obj, dCmd.label);
                        break;
                      case 'show':
                        dCmd.items.forEach(item => {
                          if (item === 'grid') api.setGridVisible(true);
                          else if (item === 'axes') api.setAxesVisible(true, true);
                          else api.setVisible(item, true);
                        });
                        break;
                      case 'hide':
                        dCmd.items.forEach(item => {
                          if (item === 'grid') api.setGridVisible(false);
                          else if (item === 'axes') api.setAxesVisible(false, false);
                          else api.setVisible(item, false);
                        });
                        break;
                      case 'animate':
                        api.setAnimating(dCmd.obj, dCmd.animate);
                        if (dCmd.animate) {
                          api.startAnimation();
                        } else {
                          api.stopAnimation();
                        }
                        if (dCmd.speed) {
                          api.setAnimationSpeed(dCmd.obj, parseFloat(dCmd.speed));
                        }
                        break;
                    }
                  } catch (err) {
                    console.error(`Ошибка отложенной команды:`, dCmd, err);
                  }
                });
              }, 200);
            }
          }
        }
      };

      const applet = new window.GGBApplet(parameters, true);
      applet.inject(containerRef.current);
    };

    if (!window.GGBApplet) {
      const script = document.createElement('script');
      script.src = 'https://www.geogebra.org/apps/deployggb.js';
      script.id = 'ggb-api-script';
      script.onload = initApplet;
      document.head.appendChild(script);
    } else {
      initApplet();
    }

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [id, setup, height]);

  return (
    <div className="my-6 w-full rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 dark:border-slate-700 shadow-sm bg-slate-50 dark:bg-slate-800 relative">
      <div className="absolute top-0 left-0 w-full h-1 bg-blue-500/80 z-10"></div>
      <div ref={containerRef} className="w-full" style={{ minHeight: `${height}px` }}></div>
    </div>
  );
};

function hexToRgb(hex) {
  hex = hex.replace('#', '');
  
  if (hex.length === 3) {
    hex = hex.split('').map(c => c + c).join('');
  }
  
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  return [r, g, b];
}

// ========== ЭЛЕМЕНТЫ MARKDOWN ==========

const markdownComponents = {
  img: ({ src, alt }) => (
    <img 
      src={src} 
      alt={alt} 
      className="max-w-full lg:w-1/2 h-auto my-6 block rounded-lg border border-slate-100 dark:border-slate-700 mx-auto shadow-sm" 
    />
  ),
  table: ({ children }) => (
    <div className="overflow-x-auto my-6 rounded-lg border border-slate-200 dark:border-slate-700">
      <table className="min-w-full text-left text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">{children}</thead>,
  th: ({ children }) => <th className="py-2.5 px-4 font-semibold text-slate-900 dark:text-white whitespace-nowrap">{children}</th>,
  td: ({ children }) => <td className="border-b border-slate-100 py-2.5 px-4 text-slate-600 dark:text-slate-300 align-top">{children}</td>,
  code: ({ children }) => (
    <code className="bg-slate-100 border border-slate-200 dark:border-slate-700/60 text-slate-800 px-1.5 py-0.5 rounded text-xs font-mono break-words">
      {children}
    </code>
  ),
  // Поддержка списков
  ul: ({ children }) => (
    <ul className="list-disc pl-6 my-4 space-y-2 text-slate-700 dark:text-slate-300">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal pl-6 my-4 space-y-2 text-slate-700 dark:text-slate-300">{children}</ol>
  ),
  li: ({ children }) => (
    <li className="pl-1 leading-relaxed">{children}</li>
  ),
};

// ========== ПАРСЕР MDX ==========

// Функция для преобразования markdown списков в HTML для ReactMarkdown
const convertMarkdownLists = (content) => {
  if (!content) return content;
  
  // Обрабатываем ненумерованные списки (начинающиеся с - или *)
  content = content.replace(
    /^([ \t]*)([-*])\s+(.+)$/gm,
    (match, indent, marker, text) => {
      // Определяем уровень вложенности (каждые 2 пробела = 1 уровень)
      const level = Math.floor(indent.length / 2);
      const prefix = '  '.repeat(level);
      return `${prefix}- ${text}`;
    }
  );
  
  // Обрабатываем нумерованные списки
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

// Рекурсивная функция для парсинга вложенных блоков
const parseBlocks = (content) => {
  const allTags = [];
  
  // Регулярки для всех типов блоков
  const defRegex = /<Def(?:\s+title="([^"]+)")?>([\s\S]*?)<\/Def>/g;
  const exRegex = /<Ex(?:\s+title="([^"]+)")?(?:\s+isHard)?>([\s\S]*?)<\/Ex>/g;
  const expRegex = /<Explanation>([\s\S]*?)<\/Explanation>/g;
  const geoRegex = /<GeoGebra([\s\S]*?)\/>/g;
  
  let match;
  
  // Находим все Def
  while ((match = defRegex.exec(content)) !== null) {
    const innerContent = match[2];
    const innerBlocks = parseBlocks(innerContent);
    
    allTags.push({
      type: 'def',
      title: match[1] || 'Определение',
      content: innerContent,
      innerBlocks: innerBlocks,
      index: match.index,
      endIndex: match.index + match[0].length
    });
  }
  
  // Находим все Ex
  while ((match = exRegex.exec(content)) !== null) {
    const innerContent = match[2];
    const innerBlocks = parseBlocks(innerContent);
    
    allTags.push({
      type: 'ex',
      title: match[1] || 'Пример',
      content: innerContent,
      isHard: match[0].includes('isHard'),
      innerBlocks: innerBlocks,
      index: match.index,
      endIndex: match.index + match[0].length
    });
  }
  
  // Находим все Explanation
  while ((match = expRegex.exec(content)) !== null) {
    const innerContent = match[1];
    const innerBlocks = parseBlocks(innerContent);
    
    allTags.push({
      type: 'explanation',
      content: innerContent,
      innerBlocks: innerBlocks,
      index: match.index,
      endIndex: match.index + match[0].length
    });
  }
  
  // Находим все GeoGebra
  while ((match = geoRegex.exec(content)) !== null) {
    const attrsStr = match[1];
    const idMatch = attrsStr.match(/id="([^"]+)"/);
    const heightMatch = attrsStr.match(/height="([^"]+)"/);
    const setupMatch = attrsStr.match(/setup=\{`([\s\S]*?)`\}/) || attrsStr.match(/setup="([^"]+)"/);

    allTags.push({
      type: 'geogebra',
      id: idMatch ? idMatch[1] : null,
      height: heightMatch ? heightMatch[1] : "400",
      setup: setupMatch ? setupMatch[1] : null,
      index: match.index,
      endIndex: match.index + match[0].length
    });
  }
  
  // Сортируем по индексу
  allTags.sort((a, b) => a.index - b.index);
  
  // Собираем результат
  const blocks = [];
  let pointer = 0;
  
  for (const tag of allTags) {
    if (tag.index > pointer) {
      const betweenText = content.substring(pointer, tag.index).trim();
      if (betweenText) {
        // Конвертируем списки в тексте между блоками
        blocks.push({ type: 'text', content: convertMarkdownLists(betweenText) });
      }
    }
    
    // Для блоков с innerBlocks, добавляем их в блок
    if (tag.type === 'def' || tag.type === 'ex' || tag.type === 'explanation') {
      blocks.push({
        ...tag,
        blocks: tag.innerBlocks
      });
      delete tag.innerBlocks;
    } else {
      blocks.push(tag);
    }
    
    pointer = tag.endIndex;
  }
  
  if (pointer < content.length) {
    const afterText = content.substring(pointer).trim();
    if (afterText) {
      blocks.push({ type: 'text', content: convertMarkdownLists(afterText) });
    }
  }
  
  return blocks;
};

// Рендеринг блоков
const renderBlocks = (blocks) => {
  if (!blocks) return null;
  
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

  // Парсинг MDX структуры
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

      // Функция для запуска загрузки на 1500ms
      const triggerLoading = () => {
        // 1. Сохраняем текущую позицию скролла
        const scrollY = window.scrollY;
        
        // 2. Блокируем скролл
        document.body.style.position = 'fixed';
        document.body.style.top = `-${scrollY}px`;
        document.body.style.width = '100%';
        
        // 3. Показываем оверлей загрузки
        setIsLoading(true);
        
        // 4. Через 1500ms восстанавливаем скролл и скрываем оверлей
        setTimeout(() => {
          // Восстанавливаем скролл
          const currentScrollY = document.body.style.top;
          document.body.style.position = '';
          document.body.style.top = '';
          document.body.style.width = '';
          if (currentScrollY) {
            window.scrollTo(0, parseInt(currentScrollY || '0', 10) * -1);
          }
          
          // Скрываем оверлей
          setIsLoading(false);
        }, 1500);
      };

      triggerLoading();
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
        /* Стили для списков */
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
      `}</style>

      {/* ========== ОСНОВНОЙ КОНТЕНТ ========== */}
      <main>
        {/* Оверлей загрузки */}
        {isLoading && (
          <div className="fixed inset-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
              <p className="text-gray-600 dark:text-slate-300">Загрузка...</p>
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

      {/* ========== ПЛАВАЮЩАЯ КНОПКА НАВИГАЦИИ ========== */}
      {!isFullWidth && components.length > 0 && (
        <div className="fixed bottom-6 right-6 z-50">
          <button
            onClick={() => setIsNavOpen(!isNavOpen)}
            className="w-14 h-14 md:w-10 md:h-10 bg-slate-900 dark:bg-slate-700 text-white rounded-full shadow-lg md:shadow-md flex items-center justify-center hover:bg-slate-800 transition-all active:scale-95"
          >
            {isNavOpen ? <X size={18} className="md:w-4 md:h-4" /> : <Menu size={18} className="md:w-4 md:h-4" />}
          </button>

          {isNavOpen && (
            <>
              <div 
                className="fixed inset-0 bg-black/20 backdrop-blur-sm"
                onClick={() => setIsNavOpen(false)}
              />
              <div className="absolute bottom-16 right-0 md:bottom-14 w-80 md:w-64 bg-white dark:bg-slate-800 rounded-xl md:rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 dark:border-slate-700 overflow-hidden">
                <div className="p-3 md:p-2.5 bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700">
                  <div className="text-[9px] md:text-[8px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Содержание урока
                  </div>
                  <div className="text-xs md:text-[10px] font-semibold text-slate-800 dark:text-white mt-0.5">
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
                          ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white font-medium'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <span className={`text-[10px] md:text-[9px] font-mono ${activeId === section.id ? 'text-slate-900' : 'text-slate-400 dark:text-slate-500'}`}>
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
                <div className="p-2 md:p-1.5 bg-slate-50 dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700">
                  <button
                    onClick={() => setIsNavOpen(false)}
                    className="w-full py-1.5 text-[9px] md:text-[8px] font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 dark:text-slate-300 transition-colors"
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
