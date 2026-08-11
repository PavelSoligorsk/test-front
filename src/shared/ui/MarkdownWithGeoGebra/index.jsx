import React, { useRef, useEffect } from 'react';
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

// ==================== GeoGebra Embedded (экспортируемый) ====================
export const GeoGebraEmbed = ({ id, setup, height = "400" }) => {
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
        "errorDialogsActive": false,
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
    <div className="my-6 w-full rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-slate-50 relative">
      <div className="absolute top-0 left-0 w-full h-1 bg-blue-500/80 z-10"></div>
      <div ref={containerRef} className="w-full" style={{ minHeight: `${height}px` }}></div>
    </div>
  );
};

// ==================== Markdown Renderer с GeoGebra ====================
const MarkdownWithGeoGebra = ({ children, className = "", markdownComponents = {} }) => {
  if (!children) return null;

  const processContent = (content) => {
    if (typeof content !== 'string') return content;
    return content
      // Убираем ```jsx / ``` вокруг GeoGebra-тегов (сервер их оборачивает)
      .replace(/```(?:jsx)?\s*\n?(<GeoGebra[\s\S]*?\/>)\s*\n?```/g, '$1')
      // Убираем ``` вокруг GeoGebra-тегов
      .replace(/```\s*\n?(<GeoGebra[\s\S]*?\/>)\s*\n?```/g, '$1')
      .replace(/\\\\\\$\\$/g, '$$')
      .replace(/\\\\\$/g, '$')
      .replace(/\\\$/g, '$')
      .replace(/\\\[/g, '$$')
      .replace(/\\\]/g, '$$')
      .replace(/\\\(/g, '$')
      .replace(/\\\)/g, '$');
  };

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

  // Default markdown components
  const defaultComponents = {
    p: ({ children: pChildren, ...props }) => (
      <p className="mb-3 last:mb-0 text-left whitespace-normal break-words" {...props}>{pChildren}</p>
    ),
    strong: ({ children: sChildren, ...props }) => (
      <strong className="font-bold text-slate-900" {...props}>{sChildren}</strong>
    ),
    code: ({ inline, className: codeClass, children: codeChildren, ...props }) => {
      if (inline) {
        return <code className="bg-slate-100 text-rose-600 px-1.5 py-0.5 rounded-md text-sm font-mono break-words" {...props}>{codeChildren}</code>;
      }
      return <code className={`${codeClass || ''} block bg-slate-800 text-white p-3 rounded-xl overflow-x-auto text-sm my-2 whitespace-pre-wrap break-words font-mono`} {...props}>{codeChildren}</code>;
    },
    ...markdownComponents,
  };

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