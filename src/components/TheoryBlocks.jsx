import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

const noteBox =
  'my-6 p-4 sm:p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 text-left';
const noteTitle = 'mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100';
const noteBody = 'text-zinc-800 dark:text-zinc-200 text-sm sm:text-base leading-relaxed space-y-4';

export const SectionBlock = ({ id, title, children, isHard }) => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <section id={id} className="scroll-mt-20 border-b border-zinc-200 dark:border-zinc-800 pb-12 last:border-0">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6 group"
      >
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <h2 className="text-xl font-medium text-zinc-900 dark:text-zinc-100 tracking-tight">
            {title}
          </h2>
          {isHard && (
            <span className="self-start sm:self-auto px-2 py-0.5 text-xs font-medium rounded-md bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800">
              Повышенная сложность
            </span>
          )}
        </div>
        {isOpen ? (
          <ChevronUp size={20} className="text-zinc-400 group-hover:text-zinc-700 dark:group-hover:text-zinc-200" />
        ) : (
          <ChevronDown size={20} className="text-zinc-400 group-hover:text-zinc-700 dark:group-hover:text-zinc-200" />
        )}
      </button>

      {isOpen && (
        <div className="space-y-6 text-zinc-700 dark:text-zinc-300 dynamic-markdown text-left">
          {children}
        </div>
      )}
    </section>
  );
};

export const Def = ({ title = 'Определение', children }) => (
  <div className={noteBox}>
    <p className={noteTitle}>{title}</p>
    <div className={noteBody}>{children}</div>
  </div>
);

export const Ex = ({ title, children, isHard }) => {
  const resolvedTitle = title || (isHard ? 'Сложный пример' : 'Пример');
  return (
    <div className={noteBox}>
      <p className={noteTitle}>{resolvedTitle}</p>
      <div className={noteBody}>{children}</div>
    </div>
  );
};

export const Explanation = ({ children }) => (
  <div className={noteBox}>
    <p className={noteTitle}>Пояснение</p>
    <div className={noteBody}>{children}</div>
  </div>
);

export const Important = ({ title = 'Важно', children }) => (
  <div className={noteBox}>
    <p className={noteTitle}>{title}</p>
    <div className={noteBody}>{children}</div>
  </div>
);

export const Formula = ({ title = 'Формула', children }) => (
  <div className={`${noteBox} text-center`}>
    {title ? <p className={noteTitle}>{title}</p> : null}
    <div className="text-zinc-900 dark:text-zinc-100 text-lg sm:text-xl font-mono overflow-x-auto py-1">
      {children}
    </div>
  </div>
);

export const Collapsible = ({ title = 'Доказательство / Вывод', children }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="my-6 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 flex items-center justify-between text-left text-sm font-medium text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100/70 dark:hover:bg-zinc-800/50"
      >
        {title}
        {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>
      {isOpen && (
        <div className="p-4 sm:p-5 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#09090b] text-sm sm:text-base leading-relaxed text-zinc-800 dark:text-zinc-200 space-y-4">
          {children}
        </div>
      )}
    </div>
  );
};

export const Grid = ({ cols = 2, children }) => {
  const colClass = cols === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2';
  return (
    <div className={`grid grid-cols-1 ${colClass} gap-4 my-6 text-left`}>
      {children}
    </div>
  );
};

export const Card = ({ title, children }) => (
  <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40">
    {title && (
      <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
        {title}
      </h4>
    )}
    <div className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 space-y-2">
      {children}
    </div>
  </div>
);

export const Steps = ({ children }) => (
  <div className="my-6 space-y-4 text-left">
    {React.Children.map(children, (child, index) => (
      <div className="flex gap-4 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 font-semibold flex items-center justify-center text-sm tabular-nums">
          {index + 1}
        </div>
        <div className="text-zinc-800 dark:text-zinc-200 text-sm sm:text-base leading-relaxed pt-1 space-y-2 flex-1">
          {child}
        </div>
      </div>
    ))}
  </div>
);

function hexToRgb(hex) {
  hex = hex.replace('#', '');
  if (hex.length === 3) {
    hex = hex.split('').map((c) => c + c).join('');
  }
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return [r, g, b];
}

export const GeoGebra = ({ id, setup, height = '400' }) => {
  const containerRef = useRef(null);
  const appletId = useRef(`ggb-${Math.random().toString(36).substring(2, 9)}`);

  useEffect(() => {
    const initApplet = () => {
      if (!containerRef.current) return;

      const parameters = {
        id: appletId.current,
        width: containerRef.current.clientWidth || 600,
        height: parseInt(height, 10),
        showToolBar: false,
        showMenuBar: false,
        showAlgebraInput: false,
        enableLabelDrags: false,
        enableShiftDragZoom: true,
        language: 'ru',
        useBrowserForJS: false,
        ...(id ? { material_id: id } : {}),
        appletOnLoad: (api) => {
          if (!id) {
            api.evalCommand('ShowAxes(true)');
            api.evalCommand('ShowGrid(true)');
          }

          if (setup) {
            const commands = setup
              .split('\n')
              .map((cmd) => cmd.trim())
              .filter((cmd) => cmd.length > 0 && !cmd.startsWith('//') && !cmd.startsWith('#'));

            const viewCommands = [];
            let perspectiveCommand = null;
            const evalCommands = [];
            const delayedCommands = [];

            commands.forEach((cmd) => {
              if (!cmd) return;

              if (cmd.startsWith('view:')) {
                const parts = cmd.substring(5).split(',').map((s) => s.trim());
                viewCommands.push(parts);
              } else if (cmd.startsWith('perspective:')) {
                perspectiveCommand = cmd.substring(12).trim();
              } else if (cmd.startsWith('color:')) {
                const match = cmd.match(/color:\s*(\w+)\s*,\s*([\w#]+)/);
                if (match) {
                  delayedCommands.push({ type: 'color', obj: match[1], color: match[2] });
                }
              } else if (cmd.startsWith('size:')) {
                const match = cmd.match(/size:\s*(\w+)\s*,\s*(\d+)/);
                if (match) {
                  delayedCommands.push({ type: 'size', obj: match[1], size: match[2] });
                }
              } else if (cmd.startsWith('label:')) {
                const match = cmd.match(/label:\s*(\w+)\s*,\s*"([^"]+)"/);
                if (match) {
                  delayedCommands.push({ type: 'label', obj: match[1], label: match[2] });
                }
              } else if (cmd.startsWith('show:')) {
                delayedCommands.push({ type: 'show', items: cmd.substring(5).split(',').map((s) => s.trim()) });
              } else if (cmd.startsWith('hide:')) {
                delayedCommands.push({ type: 'hide', items: cmd.substring(5).split(',').map((s) => s.trim()) });
              } else if (cmd.startsWith('animate:')) {
                const match = cmd.match(/animate:\s*(\w+)\s*,\s*(\w+)\s*,?\s*(\d+)?/);
                if (match) {
                  delayedCommands.push({
                    type: 'animate',
                    obj: match[1],
                    animate: match[2] === 'true',
                    speed: match[3] || null,
                  });
                }
              } else {
                evalCommands.push(cmd);
              }
            });

            viewCommands.forEach((parts) => {
              if (parts.length >= 4) {
                const xMin = parseFloat(parts[0]) || -10;
                const xMax = parseFloat(parts[1]) || 10;
                const yMin = parseFloat(parts[2]) || -10;
                const yMax = parseFloat(parts[3]) || 10;

                if (parts.length >= 6) {
                  api.setCoordSystem(xMin, xMax, yMin, yMax, parseFloat(parts[4]) || -10, parseFloat(parts[5]) || 10);
                } else {
                  api.setCoordSystem(xMin, xMax, yMin, yMax);
                }

                if (parts.includes('grid')) api.setGridVisible(true);
                if (parts.includes('axes')) api.setAxesVisible(true, true);
              }
            });

            if (perspectiveCommand) api.setPerspective(perspectiveCommand);

            evalCommands.forEach((cmd) => {
              try {
                api.evalCommand(cmd);
              } catch (err) {
                console.error(`Ошибка выполнения команды "${cmd}":`, err);
              }
            });

            if (delayedCommands.length > 0) {
              setTimeout(() => {
                delayedCommands.forEach((dCmd) => {
                  try {
                    switch (dCmd.type) {
                      case 'color':
                        api.setColor(dCmd.obj, ...hexToRgb(dCmd.color));
                        break;
                      case 'size':
                        api.setPointSize(dCmd.obj, parseInt(dCmd.size, 10));
                        break;
                      case 'label':
                        api.setCaption(dCmd.obj, dCmd.label);
                        break;
                      case 'show':
                        dCmd.items.forEach((item) => {
                          if (item === 'grid') api.setGridVisible(true);
                          else if (item === 'axes') api.setAxesVisible(true, true);
                          else api.setVisible(item, true);
                        });
                        break;
                      case 'hide':
                        dCmd.items.forEach((item) => {
                          if (item === 'grid') api.setGridVisible(false);
                          else if (item === 'axes') api.setAxesVisible(false, false);
                          else api.setVisible(item, false);
                        });
                        break;
                      case 'animate':
                        api.setAnimating(dCmd.obj, dCmd.animate);
                        if (dCmd.animate) api.startAnimation();
                        else api.stopAnimation();
                        if (dCmd.speed) api.setAnimationSpeed(dCmd.obj, parseFloat(dCmd.speed));
                        break;
                      default:
                        break;
                    }
                  } catch (err) {
                    console.error('Ошибка отложенной команды:', dCmd, err);
                  }
                });
              }, 200);
            }
          }
        },
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
    <div className="theory-geogebra my-6 w-full">
      <div ref={containerRef} className="w-full" style={{ minHeight: `${height}px` }} />
    </div>
  );
};

