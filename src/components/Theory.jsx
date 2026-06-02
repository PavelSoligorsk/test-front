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

// ========== ИНТЕРАКТИВНЫЙ БЛОК GEOGEBRA ==========

// ========== ИНТЕРАКТИВНЫЙ БЛОК GEOGEBRA (исправленный) ==========

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
            // Разбиваем на строки и обрабатываем каждую
            const commands = setup
              .split('\n')
              .map(cmd => cmd.trim())
              .filter(cmd => cmd.length > 0 && !cmd.startsWith('//') && !cmd.startsWith('#'));

            // Группируем команды по типу
            let viewCommands = [];
            let perspectiveCommand = null;
            let evalCommands = [];
            let delayedCommands = []; // Команды, зависящие от созданных объектов

            commands.forEach(cmd => {
              // Пропускаем пустые строки
              if (!cmd) return;

              if (cmd.startsWith('view:')) {
                // Настройки вида: view: -5,5,-5,5 или view: -5,5,-5,5,grid,axes
                const parts = cmd.substring(5).split(',').map(s => s.trim());
                viewCommands.push(parts);
              }
              else if (cmd.startsWith('perspective:')) {
                // Перспектива: perspective: 3D Graphics
                perspectiveCommand = cmd.substring(12).trim();
              }
              else if (cmd.startsWith('color:')) {
                // Цвет объекта: color: A, #ff0000
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
                // Размер точки: size: A, 5
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
                // Метка: label: A, "Точка A"
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
                // Показать объекты: show: A, B, grid
                const items = cmd.substring(5).split(',').map(s => s.trim());
                delayedCommands.push({
                  type: 'show',
                  items: items
                });
              }
              else if (cmd.startsWith('hide:')) {
                // Скрыть объекты: hide: A, B, grid
                const items = cmd.substring(5).split(',').map(s => s.trim());
                delayedCommands.push({
                  type: 'hide',
                  items: items
                });
              }
              else if (cmd.startsWith('animate:')) {
                // Анимация: animate: A, true, 5
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
                // Команды создания объектов
                evalCommands.push(cmd);
              }
              else {
                // Обычные команды
                evalCommands.push(cmd);
              }
            });

            // Выполняем настройки вида
            viewCommands.forEach(parts => {
              if (parts.length >= 4) {
                const xMin = parseFloat(parts[0]) || -10;
                const xMax = parseFloat(parts[1]) || 10;
                const yMin = parseFloat(parts[2]) || -10;
                const yMax = parseFloat(parts[3]) || 10;
                
                if (parts.length >= 6) {
                  // 3D вид
                  const zMin = parseFloat(parts[4]) || -10;
                  const zMax = parseFloat(parts[5]) || 10;
                  api.setCoordSystem(xMin, xMax, yMin, yMax, zMin, zMax);
                } else {
                  // 2D вид
                  api.setCoordSystem(xMin, xMax, yMin, yMax);
                }
                
                // Дополнительные флаги
                if (parts.includes('grid')) {
                  api.setGridVisible(true);
                }
                if (parts.includes('axes')) {
                  api.setAxesVisible(true, true);
                }
              }
            });

            // Устанавливаем перспективу
            if (perspectiveCommand) {
              api.setPerspective(perspectiveCommand);
            }

            // Выполняем команды создания объектов
            evalCommands.forEach(cmd => {
              try {
                api.evalCommand(cmd);
              } catch (err) {
                console.error(`Ошибка выполнения команды "${cmd}":`, err);
              }
            });

            // Выполняем отложенные команды с задержкой
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

    // Загрузка скрипта GeoGebra
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
    <div className="my-6 w-full rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-slate-50 relative">
      <div className="absolute top-0 left-0 w-full h-1 bg-blue-500/80 z-10"></div>
      <div ref={containerRef} className="w-full" style={{ minHeight: `${height}px` }}></div>
    </div>
  );
};


// Вспомогательная функция для конвертации HEX в RGB
function hexToRgb(hex) {
  // Убираем # если есть
  hex = hex.replace('#', '');
  
  // Поддерживаем короткий формат #RGB
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
      className="max-w-full lg:w-1/2 h-auto my-6 block rounded-lg border border-slate-100 mx-auto shadow-sm" 
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

// ========== ОСНОВНОЙ КОМПОНЕНТ ==========

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
        
        const allTags = [];
        const defRegex = /<Def(?:\s+title="([^"]+)")?>([\s\S]*?)<\/Def>/g;
        const exRegex = /<Ex(?:\s+title="([^"]+)")?(?:\s+isHard)?>([\s\S]*?)<\/Ex>/g;
        const expRegex = /<Explanation>([\s\S]*?)<\/Explanation>/g;
        const geoRegex = /<GeoGebra([\s\S]*?)\/>/g;
        
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

        let geoMatch;
        while ((geoMatch = geoRegex.exec(sectionContent)) !== null) {
          const attrsStr = geoMatch[1];
          const idMatch = attrsStr.match(/id="([^"]+)"/);
          const heightMatch = attrsStr.match(/height="([^"]+)"/);
          // Поддержка как setup={`...`} так и setup="..."
          const setupMatch = attrsStr.match(/setup=\{`([\s\S]*?)`\}/) || attrsStr.match(/setup="([^"]+)"/);

          allTags.push({
            type: 'geogebra',
            id: idMatch ? idMatch[1] : null,
            height: heightMatch ? heightMatch[1] : "400",
            setup: setupMatch ? setupMatch[1] : null,
            index: geoMatch.index,
            endIndex: geoMatch.index + geoMatch[0].length
          });
        }
        
        allTags.sort((a, b) => a.index - b.index);
        
        const orderedBlocks = [];
        let pointer = 0;
        
        for (const tag of allTags) {
          if (tag.index > pointer) {
            const betweenText = sectionContent.substring(pointer, tag.index).trim();
            if (betweenText) {
              orderedBlocks.push({ type: 'text', content: betweenText });
            }
          }
          orderedBlocks.push(tag);
          pointer = tag.endIndex;
        }
        
        if (pointer < sectionContent.length) {
          const afterText = sectionContent.substring(pointer).trim();
          if (afterText) {
            orderedBlocks.push({ type: 'text', content: afterText });
          }
        }
        
        sections.push({ 
          id, 
          title, 
          isHard, 
          orderedBlocks
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
        <div className={`${isFullWidth ? 'w-full' : 'max-w-3xl mx-auto'} ${isFullWidth ? 'py-0' : 'py-12'} px-4`}>
          {components.map((section, idx) => (
            <SectionBlock key={idx} id={section.id} title={section.title} isHard={section.isHard}>
              {section.orderedBlocks && section.orderedBlocks.map((block, bidx) => {
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
                if (block.type === 'geogebra') {
                  return (
                    <GeoGebra 
                      key={bidx} 
                      id={block.id} 
                      height={block.height} 
                      setup={block.setup} 
                    />
                  );
                }
                return null;
              })}
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
            className="w-14 h-14 md:w-10 md:h-10 bg-slate-900 text-white rounded-full shadow-lg md:shadow-md flex items-center justify-center hover:bg-slate-800 transition-all active:scale-95"
          >
            {isNavOpen ? <X size={18} className="md:w-4 md:h-4" /> : <Menu size={18} className="md:w-4 md:h-4" />}
          </button>

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