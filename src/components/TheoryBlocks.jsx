import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

// ========== СЕКЦИИ И БЛОКИ ТЕОРИИ ==========

export const SectionBlock = ({ id, title, children, isHard }) => {
  const [isOpen, setIsOpen] = useState(true);
  
  return (
    <section id={id} className="scroll-mt-20 border-b border-slate-200/70 dark:border-slate-700/70 pb-12 last:border-0 transition-colors">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6 group"
      >
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <h2 className="text-xl font-medium text-slate-900 dark:text-white tracking-tight transition-colors">
            {title}
          </h2>
          {isHard && (
            <span className="self-start sm:self-auto px-2 py-0.5 text-[10px] font-medium tracking-wider uppercase rounded-md bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/50 transition-colors">
              Повышенная сложность
            </span>
          )}
        </div>
        {isOpen ? (
          <ChevronUp size={20} className="text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors" />
        ) : (
          <ChevronDown size={20} className="text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors" />
        )}
      </button>
      
      {isOpen && (
        <div className="space-y-6 text-slate-700 dark:text-slate-300 dynamic-markdown text-left">
          {children}
        </div>
      )}
    </section>
  );
};

export const Def = ({ title = "Определение", children }) => (
  <div className="my-6 p-4 sm:p-5 rounded-xl border-l-4 border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/40 text-left transition-colors">
    <div className="mb-2">
      <span className="text-xs font-semibold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">📖 {title}</span>
    </div>
    <div className="text-slate-800 dark:text-slate-200 text-sm sm:text-base leading-relaxed space-y-4">
      {children}
    </div>
  </div>
);

export const Ex = ({ title, children, isHard }) => {
  const resolvedTitle = title || (isHard ? "Сложный пример" : "Пример");
  return (
    <div className={`my-6 p-4 sm:p-5 rounded-xl border-l-4 text-left transition-colors ${
      isHard 
        ? 'border-rose-400 bg-rose-50/60 dark:bg-rose-950/40' 
        : 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/40'
    }`}>
      <div className="mb-2">
        <span className={`text-xs font-semibold uppercase tracking-wider transition-colors ${
          isHard ? 'text-rose-700 dark:text-rose-300' : 'text-emerald-700 dark:text-emerald-300'
        }`}>📝 {resolvedTitle}</span>
      </div>
      <div className="text-slate-800 dark:text-slate-200 text-sm sm:text-base leading-relaxed space-y-4">
        {children}
      </div>
    </div>
  );
};

export const Explanation = ({ children }) => (
  <div className="my-6 p-4 sm:p-5 rounded-xl border-l-4 border-amber-500 bg-amber-50/60 dark:bg-amber-950/40 text-left transition-colors">
    <div className="mb-2">
      <span className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-300">💡 Пояснение</span>
    </div>
    <div className="text-slate-800 dark:text-slate-200 text-sm sm:text-base leading-relaxed space-y-4">
      {children}
    </div>
  </div>
);

// ========== ВАЖНОЕ ПРИМЕЧАНИЕ / ПРЕДУПРЕЖДЕНИЕ ==========

export const Important = ({ title = "Важно", children }) => (
  <div className="my-6 p-4 sm:p-5 rounded-xl border-l-4 border-rose-500 bg-rose-50/60 dark:bg-rose-950/40 text-left transition-colors">
    <div className="mb-2 flex items-center gap-1.5">
      <span className="text-xs font-semibold uppercase tracking-wider text-rose-700 dark:text-rose-300">
        ⚠️ {title}
      </span>
    </div>
    <div className="text-slate-800 dark:text-slate-200 text-sm sm:text-base leading-relaxed space-y-4">
      {children}
    </div>
  </div>
);

// ========== ВЫДЕЛЕННЫЙ БЛОК ДЛЯ ФОРМУЛ ==========

export const Formula = ({ title = "Формула", children }) => (
  <div className="my-6 p-4 sm:p-5 rounded-xl border-l-4 border-violet-500 bg-violet-50/60 dark:bg-violet-950/40 text-center transition-colors">
    {title && (
      <div className="mb-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-violet-700 dark:text-violet-300">
          📐 {title}
        </span>
      </div>
    )}
    <div className="text-slate-800 dark:text-slate-100 text-lg sm:text-xl font-mono overflow-x-auto py-1">
      {children}
    </div>
  </div>
);

// ========== СВОРАЧИВАЕМЫЙ БЛОК / ДОКАЗАТЕЛЬСТВО ==========

export const Collapsible = ({ title = "Доказательство / Вывод", children }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="my-6 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/40 overflow-hidden transition-colors">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 flex items-center justify-between text-left text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100/60 dark:hover:bg-slate-700/50 transition-colors"
      >
        <span className="flex items-center gap-2">
          <span>🔍</span> {title}
        </span>
        {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>
      {isOpen && (
        <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800 text-sm sm:text-base leading-relaxed text-slate-800 dark:text-slate-200 space-y-4">
          {children}
        </div>
      )}
    </div>
  );
};

// ========== СЕТКА ИЗ 2–3 КОЛОНОК ==========

export const Grid = ({ cols = 2, children }) => {
  const colClass = cols === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2";
  return (
    <div className={`grid grid-cols-1 ${colClass} gap-4 my-6 text-left`}>
      {children}
    </div>
  );
};

export const Card = ({ title, children }) => (
  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 shadow-sm transition-colors">
    {title && (
      <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-2">
        {title}
      </h4>
    )}
    <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 space-y-2">
      {children}
    </div>
  </div>
);

// ========== ПОШАГОВЫЙ АЛГОРИТМ ==========

export const Steps = ({ children }) => (
  <div className="my-6 space-y-4 text-left">
    {React.Children.map(children, (child, index) => (
      <div className="flex gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800/60 transition-colors">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-bold flex items-center justify-center text-sm border border-indigo-200 dark:border-indigo-800">
          {index + 1}
        </div>
        <div className="text-slate-800 dark:text-slate-200 text-sm sm:text-base leading-relaxed pt-1 space-y-2 flex-1">
          {child}
        </div>
      </div>
    ))}
  </div>
);

// ========== ИНТЕРАКТИВНЫЙ БЛОК GEOGEBRA ==========

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

export const GeoGebra = ({ id, setup, height = "400" }) => {
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
          if (!id) {
            api.evalCommand('ShowAxes(true)');
            api.evalCommand('ShowGrid(true)');
          }

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
    <div className="my-6 w-full rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm bg-slate-50 dark:bg-slate-800/80 relative transition-colors">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500 z-10"></div>
      <div ref={containerRef} className="w-full" style={{ minHeight: `${height}px` }}></div>
    </div>
  );
};