import React, { useRef, useEffect, useId } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import 'katex/dist/katex.min.css';

// Вспомогательные функции
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : [0, 0, 0];
}

const APP_NAMES = new Set(['geometry', 'graphing', '3d']);

export function toGeoGebraAppName(app) {
  const name = String(app || 'geometry').toLowerCase();
  return APP_NAMES.has(name) ? name : 'geometry';
}

function loadGgbScript(onReady) {
  const tryStart = () => {
    if (typeof window.GGBApplet === 'function') {
      onReady();
      return true;
    }
    return false;
  };
  if (tryStart()) return;

  let tries = 0;
  const poll = setInterval(() => {
    if (tryStart() || ++tries > 200) clearInterval(poll);
  }, 50);

  const existing = document.getElementById('ggb-api-script');
  if (existing) {
    existing.addEventListener('load', tryStart, { once: true });
    return;
  }
  const script = document.createElement('script');
  script.src = 'https://www.geogebra.org/apps/deployggb.js';
  script.id = 'ggb-api-script';
  script.onload = tryStart;
  document.head.appendChild(script);
}

function runEvalCommands(api, commands) {
  (commands || []).forEach((cmd) => {
    const line = String(cmd || '').trim();
    if (!line) return;
    try {
      api.evalCommand(line);
    } catch (err) {
      console.error(`GeoGebra command error "${line}":`, err);
    }
  });
}

/** Апплет для AI hint/solve: одна фигура, команды только в appletOnLoad */
export function GeoGebraFigureApplet({ figure }) {
  const boxRef = useRef(null);
  const uid = useId().replace(/:/g, '');
  const height = Number(figure.height) || 400;
  const appName = toGeoGebraAppName(figure.app);
  const commands = (
    figure.commands?.length
      ? figure.commands
      : String(figure.setup || '').split('\n')
  ).filter((c) => String(c).trim());

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    let cancelled = false;

    const mount = () => {
      if (cancelled || !boxRef.current || typeof window.GGBApplet !== 'function') return;
      const box = boxRef.current;
      box.innerHTML = '';
      const applet = new window.GGBApplet(
        {
          appName,
          id: `ggb${uid}`,
          width: Math.max(box.clientWidth || 640, 320),
          height,
          language: 'ru',
          showMenuBar: false,
          showAlgebraInput: false,
          showToolBar: true,
          showResetIcon: true,
          enable3d: appName === '3d',
          appletOnLoad(api) {
            for (const cmd of commands) api.evalCommand(cmd);
          },
        },
        true
      );
      applet.inject(box);
    };

    if (typeof window.GGBApplet === 'function') mount();
    else loadGgbScript(mount);

    return () => {
      cancelled = true;
      el.innerHTML = '';
    };
  }, [figure.id, appName, height, commands.join('\n'), uid]);

  return (
    <div
      ref={boxRef}
      className="w-full overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800"
      style={{ width: '100%', height, margin: '12px 0' }}
    />
  );
}

// ==================== GeoGebra Embedded (экспортируемый) ====================
export const GeoGebraEmbed = ({
  figure,
  id,
  setup,
  height = '400',
  app,
  appName,
  commands,
}) => {
  const containerRef = useRef(null);
  const uid = useId().replace(/:/g, '');
  const resolvedApp = toGeoGebraAppName(figure?.app || appName || app);
  const pxHeight = Number(figure?.height ?? height) || 400;
  const commandList = (
    figure?.commands?.length
      ? figure.commands
      : (Array.isArray(commands) && commands.length
        ? commands
        : String(figure?.setup || setup || '').split('\n'))
  ).filter((c) => String(c || '').trim());
  const useRawCommands = Boolean(figure || (Array.isArray(commands) && commands.length));
  const materialId = typeof id === 'string' && id && !/^\d+$/.test(id) ? id : null;

  useEffect(() => {
    let cancelled = false;

    const initApplet = () => {
      if (cancelled || !containerRef.current || typeof window.GGBApplet !== 'function') return;
      const box = containerRef.current;
      box.innerHTML = '';

      const parameters = {
        id: `ggb${uid}`,
        appName: resolvedApp,
        width: Math.max(box.clientWidth || 640, 320),
        height: pxHeight,
        language: 'ru',
        showMenuBar: false,
        showAlgebraInput: false,
        showToolBar: true,
        showResetIcon: true,
        enableLabelDrags: false,
        enableShiftDragZoom: true,
        enable3d: resolvedApp === '3d',
        errorDialogsActive: false,
        ...(materialId ? { material_id: materialId } : {}),
        appletOnLoad: (api) => {
          if (useRawCommands) {
            runEvalCommands(api, commandList);
            return;
          }

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
                const items = cmd.substring(5).split(',').map(s => s.trim());
                delayedCommands.push({ type: 'show', items });
              } else if (cmd.startsWith('hide:')) {
                const items = cmd.substring(5).split(',').map(s => s.trim());
                delayedCommands.push({ type: 'hide', items });
              } else if (cmd.startsWith('animate:')) {
                const match = cmd.match(/animate:\s*(\w+)\s*,\s*(\w+)\s*,?\s*(\d+)?/);
                if (match) {
                  delayedCommands.push({ type: 'animate', obj: match[1], animate: match[2] === 'true', speed: match[3] || null });
                }
              } else if (cmd.includes('=') || cmd.includes(':=')) {
                evalCommands.push(cmd);
              } else {
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

                if (parts.includes('grid')) api.setGridVisible(true);
                if (parts.includes('axes')) api.setAxesVisible(true, true);
              }
            });

            if (perspectiveCommand) {
              api.setPerspective(perspectiveCommand);
            }

            evalCommands.forEach(cmd => {
              try { api.evalCommand(cmd); } catch (err) { console.error(`GeoGebra command error "${cmd}":`, err); }
            });

            if (delayedCommands.length > 0) {
              setTimeout(() => {
                delayedCommands.forEach(dCmd => {
                  try {
                    switch (dCmd.type) {
                      case 'color': api.setColor(dCmd.obj, ...hexToRgb(dCmd.color)); break;
                      case 'size': api.setPointSize(dCmd.obj, parseInt(dCmd.size)); break;
                      case 'label': api.setCaption(dCmd.obj, dCmd.label); break;
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
                        if (dCmd.animate) api.startAnimation(); else api.stopAnimation();
                        if (dCmd.speed) api.setAnimationSpeed(dCmd.obj, parseFloat(dCmd.speed));
                        break;
                    }
                  } catch (err) { console.error('GeoGebra delayed command error:', dCmd, err); }
                });
              }, 200);
            }
          }
        }
      };

      const applet = new window.GGBApplet(parameters, true);
      applet.inject(box);
    };

    loadGgbScript(initApplet);

    return () => {
      cancelled = true;
      if (containerRef.current) containerRef.current.innerHTML = '';
    };
  }, [uid, setup, resolvedApp, useRawCommands, pxHeight, commandList.join('\n'), materialId]);

  return (
    <div className="my-6 w-full rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-sm bg-zinc-50 dark:bg-zinc-900/40 relative">
      <div ref={containerRef} className="w-full" style={{ minHeight: `${pxHeight}px` }} />
    </div>
  );
};

// ==================== Markdown Renderer с GeoGebra ====================
const MarkdownWithGeoGebra = ({ children, className = "", markdownComponents = {}, figures = null }) => {
  if (!children && !(Array.isArray(figures) && figures.length)) return null;

  const processContent = (content) => {
    if (typeof content !== 'string') return content;
    return content
      .replace(/```(?:jsx)?\s*\n?(<GeoGebra[\s\S]*?\/>)\s*\n?```/g, '$1')
      .replace(/```\s*\n?(<GeoGebra[\s\S]*?\/>)\s*\n?```/g, '$1')
      .replace(/\\\\\\$\\$/g, '$$')
      .replace(/\\\\\$/g, '$')
      .replace(/\\\$/g, '$')
      .replace(/\\\[/g, '$$')
      .replace(/\\\]/g, '$$')
      .replace(/\\\(/g, '$')
      .replace(/\\\)/g, '$');
  };

  const figureList = Array.isArray(figures) ? figures : [];
  const rawText = typeof children === 'string' ? children : '';
  const hasPlaceholders = /\{\{geogebra:\d+\}\}/.test(rawText);

  const defaultComponents = {
    p: ({ children: pChildren, ...props }) => (
      <p className="mb-3 last:mb-0 text-left whitespace-normal break-words" {...props}>{pChildren}</p>
    ),
    strong: ({ children: sChildren, ...props }) => (
      <strong className="font-bold text-zinc-900 dark:text-zinc-100" {...props}>{sChildren}</strong>
    ),
    code: ({ inline, className: codeClass, children: codeChildren, ...props }) => {
      if (inline) {
        return <code className="bg-zinc-100 dark:bg-zinc-800 text-rose-600 dark:text-rose-400 px-1.5 py-0.5 rounded-md text-sm font-mono break-words" {...props}>{codeChildren}</code>;
      }
      return <code className={`${codeClass || ''} block bg-zinc-800 text-white p-3 rounded-xl overflow-x-auto text-sm my-2 whitespace-pre-wrap break-words font-mono`} {...props}>{codeChildren}</code>;
    },
    ...markdownComponents,
  };

  const renderMarkdown = (text, key) => {
    if (!text || !String(text).trim()) return null;
    return (
      <ReactMarkdown
        key={key}
        remarkPlugins={[remarkMath, remarkGfm]}
        rehypePlugins={[rehypeKatex]}
        components={defaultComponents}
      >
        {processContent(text)}
      </ReactMarkdown>
    );
  };

  if (hasPlaceholders) {
    const byId = new Map(figureList.map((f) => [Number(f.id), f]));
    const parts = rawText.split(/\{\{geogebra:(\d+)\}\}/);
    return (
      <div className={className}>
        {parts.map((part, i) => {
          if (i % 2 === 0) return renderMarkdown(part, i);
          const figure = byId.get(Number(part)) || figureList[Number(part)];
          if (!figure) return null;
          return <GeoGebraFigureApplet key={`ggb-${figure.id}-${i}`} figure={figure} />;
        })}
      </div>
    );
  }

  const processedChildren = typeof children === 'string' ? processContent(children) : children;

  // Парсим GeoGebra блоки из текста (без regex — надёжно через indexOf)
  const parseContent = (content) => {
    if (typeof content !== 'string') return content;

    const parts = [];
    let pos = 0;

    while (pos < content.length) {
      const tagStart = content.indexOf('<GeoGebra', pos);
      if (tagStart === -1) break;

      // Текст до тега
      if (tagStart > pos) {
        parts.push({ type: 'text', content: content.substring(pos, tagStart) });
      }

      // Ищем конец тега: />
      const tagClose = content.indexOf('/>', tagStart);
      if (tagClose === -1) {
        // Не можем найти закрытие — отдаём остаток как текст
        parts.push({ type: 'text', content: content.substring(pos) });
        pos = content.length;
        break;
      }

      const fullTag = content.substring(tagStart, tagClose + 2); // весь тег включая />
      pos = tagClose + 2;

      // Извлекаем атрибуты
      const idMatch = fullTag.match(/id="([^"]+)"/);
      const heightMatch = fullTag.match(/height="([^"]+)"/);

      // setup: может быть setup={`...`} или setup={{`...`}}
      let setupMatch = fullTag.match(/setup=\{\{`([\s\S]*?)`\}\}/);
      if (!setupMatch) {
        setupMatch = fullTag.match(/setup=\{`([\s\S]*?)`\}/);
      }

      parts.push({
        type: 'geogebra',
        id: idMatch ? idMatch[1] : null,
        height: heightMatch ? heightMatch[1] : "400",
        setup: setupMatch ? setupMatch[1] : null
      });
    }

    if (pos < content.length) {
      parts.push({ type: 'text', content: content.substring(pos) });
    }

    return parts.length > 0 ? parts : content;
  };

  const parsedParts = parseContent(processedChildren);

  // Если нет GeoGebra блоков — рендерим как обычно
  if (typeof parsedParts === 'string' || !Array.isArray(parsedParts)) {
    return (
      <div className={className}>
        <ReactMarkdown
          remarkPlugins={[remarkMath, remarkGfm]}
          rehypePlugins={[rehypeKatex]}
          components={defaultComponents}
        >
          {processedChildren}
        </ReactMarkdown>
      </div>
    );
  }

  // Рендерим части с GeoGebra
  return (
    <div className={className}>
      {parsedParts.map((part, index) => {
        if (part.type === 'text' && part.content.trim()) {
          return (
            <ReactMarkdown
              key={index}
              remarkPlugins={[remarkMath, remarkGfm]}
              rehypePlugins={[rehypeKatex]}
              components={defaultComponents}
            >
              {part.content}
            </ReactMarkdown>
          );
        }
        if (part.type === 'geogebra') {
          return (
            <GeoGebraEmbed
              key={index}
              id={part.id}
              setup={part.setup}
              height={part.height}
            />
          );
        }
        return null;
      })}
    </div>
  );
};

export default MarkdownWithGeoGebra;