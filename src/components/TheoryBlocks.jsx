import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { AlertCircle, Bookmark, ChevronDown, ChevronUp, Lightbulb, Pencil } from 'lucide-react';
import { normalizeDisplayMath } from './theoryMath';

export function MathText({ text }) {
  if (text == null || text === '') return null;
  const value = String(text);
  if (!value.includes('$')) return value;
  return (
    <span className="theory-attr-math">
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{ p: ({ children }) => <>{children}</> }}
      >
        {normalizeDisplayMath(value)}
      </ReactMarkdown>
    </span>
  );
}

function IconMark({ children, invert = false }) {
  return (
    <span
      className={`flex size-9 shrink-0 items-center justify-center rounded-xl border ${
        invert
          ? 'border-white/20 bg-white/10 text-white dark:border-zinc-950/15 dark:bg-zinc-950/10 dark:text-zinc-950'
          : 'border-zinc-200 bg-zinc-100 text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100'
      }`}
    >
      {children}
    </span>
  );
}

function Note({
  title,
  icon,
  children,
  invert = false,
  dashed = false,
  fill = false,
  center = false,
}) {
  return (
    <div
      className={`my-6 overflow-hidden rounded-2xl border text-left shadow-sm ${
        invert
          ? 'border-zinc-900 bg-zinc-900 text-zinc-50 dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-950'
          : dashed
            ? 'border-dashed border-zinc-300 bg-transparent dark:border-zinc-700'
            : fill
              ? 'border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900'
              : 'border-zinc-200 bg-white dark:border-zinc-800/60 dark:bg-[#09090b]'
      }`}
    >
      {title ? (
        <div className="flex items-center gap-3 px-4 pt-4 sm:px-5">
          {icon}
          <p className={`min-w-0 flex-1 text-sm font-semibold tracking-tight ${invert ? '' : 'text-zinc-900 dark:text-zinc-100'}`}>
            <MathText text={title} />
          </p>
        </div>
      ) : null}
      <div
        className={`px-4 py-4 sm:px-5 sm:py-5 text-sm sm:text-base leading-relaxed space-y-4 ${
          center ? 'text-center' : ''
        } ${
          invert
            ? 'text-zinc-200 dark:text-zinc-800'
            : 'text-zinc-800 dark:text-zinc-200'
        }`}
      >
        {children}
      </div>
    </div>
  );
}

export const SectionBlock = ({ id, title, children, isHard }) => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <section id={id} className="scroll-mt-20 border-b border-zinc-200 dark:border-zinc-800 pb-12 last:border-0">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="group mb-8 flex w-full flex-col justify-between gap-3 text-left sm:flex-row sm:items-center"
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <h2 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            <MathText text={title} />
          </h2>
          {isHard && (
            <span className="self-start rounded-md border border-zinc-200 bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 sm:self-auto">
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
        <div className="dynamic-markdown space-y-6 text-left text-zinc-700 dark:text-zinc-300">
          {children}
        </div>
      )}
    </section>
  );
};

export const Def = ({ title = 'Определение', children }) => (
  <Note
    fill
    title={title}
    icon={<IconMark><Bookmark size={16} strokeWidth={2} /></IconMark>}
  >
    {children}
  </Note>
);

export const Ex = ({ title, children, isHard }) => {
  const resolvedTitle = title || (isHard ? 'Сложный пример' : 'Пример');
  return (
    <Note
      title={resolvedTitle}
      icon={<IconMark><Pencil size={16} strokeWidth={2} /></IconMark>}
    >
      {children}
    </Note>
  );
};

export const Explanation = ({ children }) => (
  <Note
    dashed
    title="Пояснение"
    icon={<IconMark><Lightbulb size={16} strokeWidth={2} /></IconMark>}
  >
    {children}
  </Note>
);

export const Important = ({ title = 'Важно', children }) => (
  <Note
    title={title}
    icon={
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950">
        <AlertCircle size={16} strokeWidth={2} />
      </span>
    }
  >
    {children}
  </Note>
);

export const Formula = ({ title = 'Формула', children }) => (
  <div className="my-6 overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
    {title ? (
      <p className="px-5 pt-4 text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
        <MathText text={title} />
      </p>
    ) : null}
    <div className="overflow-x-auto px-5 py-6 text-lg font-medium text-zinc-900 sm:text-xl dark:text-zinc-100">
      {children}
    </div>
  </div>
);

export const Collapsible = ({ title = 'Доказательство / Вывод', children }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="my-6 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800/60 dark:bg-[#09090b]">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between px-4 py-3.5 text-left text-sm font-semibold tracking-tight text-zinc-900 hover:bg-zinc-50 dark:text-zinc-100 dark:hover:bg-zinc-900/60 sm:px-5"
      >
        <span className="min-w-0 flex-1 text-left"><MathText text={title} /></span>
        {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>
      {isOpen && (
        <div className="space-y-4 border-t border-zinc-200 bg-zinc-50 px-4 py-4 text-sm leading-relaxed text-zinc-800 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 sm:px-5 sm:py-5 sm:text-base">
          {children}
        </div>
      )}
    </div>
  );
};

export const Grid = ({ cols = 2, children }) => {
  const colClass = cols === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2';
  return (
    <div className={`my-6 grid grid-cols-1 ${colClass} gap-4 text-left`}>
      {children}
    </div>
  );
};

export const Card = ({ title, children }) => (
  <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800/60 dark:bg-[#09090b]">
    {title && (
      <h4 className="mb-3 text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
        <MathText text={title} />
      </h4>
    )}
    <div className="space-y-2 text-sm text-zinc-600 dark:text-zinc-300">
      {children}
    </div>
  </div>
);

export const Steps = ({ children }) => (
  <div className="my-6 space-y-3 text-left">
    {React.Children.map(children, (child, index) => (
      <div className="flex gap-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800/60 dark:bg-[#09090b] sm:p-5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-sm font-semibold tabular-nums text-white dark:bg-zinc-100 dark:text-zinc-950">
          {index + 1}
        </div>
        <div className="flex-1 space-y-2 pt-1 text-sm leading-relaxed text-zinc-800 dark:text-zinc-200 sm:text-base">
          {child}
        </div>
      </div>
    ))}
  </div>
);

function stripScripts(html) {
  return String(html || '').replace(/<script\b[\s\S]*?<\/script>/gi, '');
}

export const Html = ({ html, children }) => {
  const markup = html
    ?? (typeof children === 'string' ? children : Array.isArray(children) ? children.join('') : '');
  const cleaned = stripScripts(markup).trim();
  if (!cleaned) return null;

  return (
    <div
      className="theory-html my-6 overflow-x-auto text-zinc-800 dark:text-zinc-200"
      dangerouslySetInnerHTML={{ __html: cleaned }}
    />
  );
};

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
    <div className="theory-geogebra my-6 w-full overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800/60">
      <div ref={containerRef} className="w-full" style={{ minHeight: `${height}px` }} />
    </div>
  );
};

