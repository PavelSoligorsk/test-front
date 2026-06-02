// components/TheoryAIChat.jsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import 'katex/dist/katex.min.css';
import { 
  X, 
  Send, 
  Bot, 
  User, 
  Sparkles,
  Loader2,
  Trash2,
  Copy,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  XCircle,
  CheckCircle2,
  GripHorizontal,
  PanelRightClose,
  PanelRightOpen,
  MessageSquare
} from 'lucide-react';

// ==================== Markdown Renderer (обновленный) ====================
const MarkdownBlock = ({ children }) => {
  if (!children) return null;
  
  // Функция для обработки текста перед рендерингом
  const processContent = (content) => {
    if (typeof content !== 'string') return content;
    
    let processed = content
      .replace(/\\\\\\$\\$/g, '$$')
      .replace(/\\\\\$/g, '$')
      .replace(/\\\$/g, '$')
      .replace(/\\\[/g, '$$')
      .replace(/\\\]/g, '$$')
      .replace(/\\\(/g, '$')
      .replace(/\\\)/g, '$');
    
    return processed;
  };

  const processedChildren = typeof children === 'string' 
    ? processContent(children) 
    : children;

  // Парсим GeoGebra блоки из текста
  const parseContent = (content) => {
    if (typeof content !== 'string') return content;
    
    // Ищем GeoGebra блоки: <GeoGebra setup={`...`} /> или <GeoGebra id="..." setup={`...`} height="..." />
    const geoRegex = /<GeoGebra\s+([^>]*?)\s*\/>/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = geoRegex.exec(content)) !== null) {
      // Текст до GeoGebra
      if (match.index > lastIndex) {
        parts.push({
          type: 'text',
          content: content.substring(lastIndex, match.index)
        });
      }

      // Парсим атрибуты GeoGebra
      const attrsStr = match[1];
      const idMatch = attrsStr.match(/id="([^"]+)"/);
      const heightMatch = attrsStr.match(/height="([^"]+)"/);
      const setupMatch = attrsStr.match(/setup=\{`([\s\S]*?)`\}/) || attrsStr.match(/setup="([^"]+)"/);

      parts.push({
        type: 'geogebra',
        id: idMatch ? idMatch[1] : null,
        height: heightMatch ? heightMatch[1] : "400",
        setup: setupMatch ? setupMatch[1] : null
      });

      lastIndex = match.index + match[0].length;
    }

    // Оставшийся текст
    if (lastIndex < content.length) {
      parts.push({
        type: 'text',
        content: content.substring(lastIndex)
      });
    }

    return parts.length > 0 ? parts : content;
  };

  const parsedParts = parseContent(processedChildren);

  // Если нет GeoGebra блоков — рендерим как обычно
  if (typeof parsedParts === 'string' || !Array.isArray(parsedParts)) {
    return (
      <ReactMarkdown
        remarkPlugins={[remarkMath, remarkGfm]}
        rehypePlugins={[rehypeKatex]}
        components={{
          p: ({ children, ...props }) => (
            <p className="mb-3 last:mb-0 text-left whitespace-normal break-words" {...props}>
              {children}
            </p>
          ),
          strong: ({ children, ...props }) => (
            <strong className="font-bold text-slate-900" {...props}>{children}</strong>
          ),
          em: ({ children, ...props }) => (
            <em className="italic" {...props}>{children}</em>
          ),
          img: ({ src, alt, ...props }) => (
            <div className="my-4 overflow-hidden rounded-2xl bg-slate-100">
              <img 
                src={src} 
                alt={alt || ''} 
                className="w-full h-auto object-contain max-h-[300px]" 
                loading="lazy" 
                {...props}
              />
            </div>
          ),
          code: ({ inline, className, children, ...props }) => {
            if (inline) {
              return (
                <code className="bg-slate-100 text-rose-600 px-1.5 py-0.5 rounded-md text-sm font-mono break-words" {...props}>
                  {children}
                </code>
              );
            }
            
            const isMath = className?.includes('language-math');
            
            return (
              <code 
                className={`${className || ''} ${isMath ? 'math-display' : ''} block bg-slate-800 text-white p-3 rounded-xl overflow-x-auto text-sm my-2 whitespace-pre-wrap break-words font-mono`}
                {...props}
              >
                {children}
              </code>
            );
          },
          a: ({ children, ...props }) => (
            <a className="text-blue-600 hover:text-blue-800 underline transition-colors break-all" target="_blank" rel="noopener noreferrer" {...props}>
              {children}
            </a>
          ),
          table: ({ children, ...props }) => (
            <div className="overflow-x-auto my-4">
              <table className="min-w-full border-collapse border border-slate-200 text-sm" {...props}>
                {children}
              </table>
            </div>
          ),
          th: ({ children, ...props }) => (
            <th className="border border-slate-200 bg-slate-50 px-4 py-2 text-left font-bold" {...props}>
              {children}
            </th>
          ),
          td: ({ children, ...props }) => (
            <td className="border border-slate-200 px-4 py-2" {...props}>
              {children}
            </td>
          ),
          math: ({ value }) => (
            <span className="math-inline">
              {value}
            </span>
          ),
        }}
      >
        {processedChildren}
      </ReactMarkdown>
    );
  }

  // Рендерим части с GeoGebra
  return (
    <div>
      {parsedParts.map((part, index) => {
        if (part.type === 'text' && part.content.trim()) {
          return (
            <ReactMarkdown
              key={index}
              remarkPlugins={[remarkMath, remarkGfm]}
              rehypePlugins={[rehypeKatex]}
              components={{
                // ... те же компоненты что и выше
                p: ({ children, ...props }) => (
                  <p className="mb-3 last:mb-0 text-left whitespace-normal break-words" {...props}>
                    {children}
                  </p>
                ),
                code: ({ inline, className, children, ...props }) => {
                  if (inline) {
                    return (
                      <code className="bg-slate-100 text-rose-600 px-1.5 py-0.5 rounded-md text-sm font-mono break-words" {...props}>
                        {children}
                      </code>
                    );
                  }
                  return (
                    <code 
                      className={`${className || ''} block bg-slate-800 text-white p-3 rounded-xl overflow-x-auto text-sm my-2 whitespace-pre-wrap break-words font-mono`}
                      {...props}
                    >
                      {children}
                    </code>
                  );
                },
              }}
            >
              {part.content}
            </ReactMarkdown>
          );
        }
        if (part.type === 'geogebra') {
          return (
            <div key={index} className="my-4">
              <GeoGebra
                id={part.id}
                setup={part.setup}
                height={part.height}
              />
            </div>
          );
        }
        return null;
      })}
    </div>
  );
};

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


// ==================== Компонент сообщения ====================
const ChatMessage = ({ message, onCopy }) => {
  const isUser = message.role === 'user';
  const isError = message.isError;
  const [isExpanded, setIsExpanded] = useState(true);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    onCopy(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isLongMessage = !isUser && !isError && message.content?.length > 800;

  return (
    <div className={`flex gap-2 ${isUser ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
      {!isUser && (
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-1 ${
          isError 
            ? 'bg-red-100' 
            : 'bg-gradient-to-br from-violet-600 to-purple-700'
        }`}>
          {isError ? (
            <AlertCircle size={16} className="text-red-500" />
          ) : (
            <Bot size={16} className="text-white" />
          )}
        </div>
      )}

      <div className={`group relative max-w-[85%] ${
        isUser
          ? 'bg-gradient-to-r from-violet-600 to-purple-700 text-white p-3 rounded-2xl rounded-br-md'
          : isError
            ? 'bg-red-50 text-red-700 border border-red-100 p-3 rounded-2xl rounded-bl-md'
            : 'bg-slate-100 text-slate-700 p-3 rounded-2xl rounded-bl-md'
      }`}>
        <div className={`text-sm leading-relaxed ${!isExpanded && isLongMessage ? 'max-h-32 overflow-hidden relative' : ''}`}>
          <div className="katex-wrapper">
            <MarkdownBlock>{message.content}</MarkdownBlock>
          </div>

          {!isExpanded && isLongMessage && (
            <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-slate-100 to-transparent pointer-events-none" />
          )}
        </div>

        {isLongMessage && (
          <>
            {!isExpanded && (
              <button 
                onClick={() => setIsExpanded(true)}
                className="mt-2 text-xs text-violet-600 hover:text-violet-700 font-medium flex items-center gap-1"
              >
                <ChevronDown size={14} /> Показать полностью
              </button>
            )}
            {isExpanded && (
              <button 
                onClick={() => setIsExpanded(false)}
                className="mt-2 text-xs text-slate-400 hover:text-slate-600 font-medium flex items-center gap-1"
              >
                <ChevronUp size={14} /> Свернуть
              </button>
            )}
          </>
        )}

        {message.timestamp && (
          <p className={`text-[9px] mt-2 opacity-50 ${isUser ? 'text-right text-white/70' : 'text-left text-slate-400'}`}>
            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        )}

        {!isUser && !isError && (
          <button
            onClick={handleCopy}
            className="absolute -bottom-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 bg-white rounded-lg shadow-sm border border-slate-200 hover:bg-slate-50"
            title="Копировать"
          >
            {copied ? (
              <CheckCircle2 size={12} className="text-emerald-500" />
            ) : (
              <Copy size={12} className="text-slate-400" />
            )}
          </button>
        )}
      </div>

      {isUser && (
        <div className="w-8 h-8 bg-slate-200 rounded-xl flex items-center justify-center shrink-0 mt-1">
          <User size={16} className="text-slate-500" />
        </div>
      )}
    </div>
  );
};

// ==================== ОСНОВНОЙ КОМПОНЕНТ ====================
const TheoryAIChat = ({ 
  theoryContent, 
  topic, 
  section, 
  theoryId,
  className = ""
}) => {
  // Состояния
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [panelWidth, setPanelWidth] = useState(400);
  const [isResizing, setIsResizing] = useState(false);
  
  // Рефы
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);
  const panelRef = useRef(null);
  const resizeHandleRef = useRef(null);

  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

  // Автопрокрутка
  useEffect(() => {
    if (isOpen && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Фокус на инпут
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  // Закрытие по Escape
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen]);

  // Ресайз панели
  const handleResizeStart = useCallback((e) => {
    e.preventDefault();
    setIsResizing(true);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e) => {
      const newWidth = window.innerWidth - e.clientX;
      const clampedWidth = Math.min(600, Math.max(320, newWidth));
      setPanelWidth(clampedWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  // Отправка сообщения
  const handleSend = async () => {
    const q = input.trim();
    if (!q || loading) return;

    const userMsg = { 
      role: 'user', 
      content: q,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    setError(null);

    try {
      const token = JSON.parse(localStorage.getItem('edu_session'))?.token;
      const res = await axios.post(
        'https://tests-production-46d5.up.railway.app/student/theory/ask-ai',
        {
          theory_id: theoryId || null,
          theory_content: theoryId ? null : theoryContent,
          question: q
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Проверяем и исправляем ответ от AI
      let answer = res.data.answer;
      if (answer) {
        // Убеждаемся, что формулы корректно отформатированы
        answer = answer
          .replace(/\\\\/g, '\\')
          .replace(/\\\$/g, '$');
      }

      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: answer,
        timestamp: new Date().toISOString()
      }]);
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Не удалось получить ответ. Попробуйте позже.';
      setError(errorMsg);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `⚠️ ${errorMsg}`,
        isError: true,
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCopy = async (text) => {
    try {
      // Копируем оригинальный текст с формулами
      const textToCopy = text
        .replace(/\$\$/g, '$$')
        .replace(/\\\$/g, '$');
      
      await navigator.clipboard.writeText(textToCopy);
      setCopiedId(Date.now());
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Ошибка копирования:', err);
    }
  };

  const handleClearChat = () => {
    if (messages.length > 0 && window.confirm('Очистить историю чата?')) {
      setMessages([]);
      setError(null);
    }
  };

  const quickQuestions = [
    { text: 'Объясни проще', icon: '💡' },
    { text: 'Приведи пример', icon: '📝' },
    { text: 'Как это запомнить?', icon: '🧠' },
    { text: 'Покажи пошагово', icon: '👣' },
    { text: 'Где это применяется?', icon: '🌍' },
    { text: 'Основная формула', icon: '📐' },
  ];

  return (
    <>
      {/* ========== КНОПКА ОТКРЫТИЯ ========== */}
      {!isOpen && (
        <button
          onClick={toggleChat}
          className={`fixed bottom-24 right-6 z-40 group transition-all duration-300 ${className}`}
          title="Спросить AI о теории"
        >
          <div className="relative w-14 h-14 bg-gradient-to-br from-violet-600 to-purple-700 text-white rounded-2xl shadow-2xl shadow-purple-200 flex items-center justify-center hover:scale-105 active:scale-95 transition-all">
            <MessageSquare size={22} className="group-hover:animate-pulse" />
          </div>
          
          <span className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full text-[9px] font-black flex items-center justify-center text-white shadow-lg">
            AI
          </span>
        </button>
      )}

      {/* ========== БОКОВАЯ ПАНЕЛЬ ========== */}
{isOpen && (
  <div 
    ref={panelRef}
    className="fixed top-0 right-0 bottom-0 bg-white shadow-2xl border-l border-slate-200 flex flex-col animate-in slide-in-from-right duration-300"
    style={{ 
      width: `${panelWidth}px`,
      zIndex: 99999
    }}
  >
    {/* Ручка ресайза */}
    <div
      ref={resizeHandleRef}
      className="absolute top-0 -left-2 w-2 bottom-0 cursor-col-resize group z-10"
      onMouseDown={handleResizeStart}
    >
      <div className="absolute inset-y-0 left-1/2 w-0.5 bg-violet-200/0 group-hover:bg-violet-300 transition-colors" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
        <GripHorizontal size={16} className="text-violet-400 rotate-90" />
      </div>
    </div>

    {/* Заголовок */}
    <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-gradient-to-r from-violet-50 to-purple-50 shrink-0">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-violet-600 to-purple-700 rounded-xl flex items-center justify-center shadow-lg">
          <Bot size={20} className="text-white" />
        </div>
        <div>
          <h4 className="text-sm font-black text-slate-800 uppercase">AI-помощник</h4>
          {(topic || section) && (
            <p className="text-[10px] text-slate-500 font-bold truncate max-w-[180px]">
              {topic && section ? `${topic} • ${section}` : topic || section}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1">
        {messages.length > 0 && (
          <>
            <button
              onClick={() => {
                const text = messages.map(m => 
                  `${m.role === 'user' ? '👤 Вы' : '🤖 AI'} [${new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}]:\n${m.content}`
                ).join('\n\n---\n\n');
                handleCopy(text);
              }}
              className="p-2 hover:bg-white rounded-lg transition-colors"
              title="Копировать весь чат"
            >
              {copiedId ? <CheckCircle2 size={16} className="text-emerald-500" /> : <Copy size={16} className="text-slate-400" />}
            </button>
            <button onClick={handleClearChat} className="p-2 hover:bg-white rounded-lg transition-colors" title="Очистить чат">
              <Trash2 size={16} className="text-slate-400 hover:text-red-500 transition-colors" />
            </button>
          </>
        )}
        <button onClick={toggleChat} className="p-2 hover:bg-white rounded-lg transition-colors" title="Закрыть">
          <XCircle size={18} className="text-slate-400 hover:text-red-500 transition-colors" />
        </button>
      </div>
    </div>

    {/* Сообщения */}
    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/30">
      {messages.length === 0 && (
        <div className="text-center py-8 space-y-4">
          <div className="w-16 h-16 bg-gradient-to-br from-violet-100 to-purple-100 rounded-2xl flex items-center justify-center mx-auto">
            <Sparkles size={28} className="text-violet-500" />
          </div>
          <div>
            <p className="text-sm font-black text-slate-700 uppercase">Задайте вопрос</p>
            <p className="text-xs text-slate-400 font-bold mt-1">Я помогу разобраться в теории</p>
          </div>
          <div className="flex flex-wrap gap-2 justify-center">
            {quickQuestions.map((q, i) => (
              <button
                key={i}
                onClick={() => { setInput(q.text); setTimeout(() => inputRef.current?.focus(), 100); }}
                className="text-[10px] bg-white hover:bg-violet-50 text-slate-600 hover:text-violet-600 px-3 py-1.5 rounded-xl font-bold transition-all hover:scale-105 border border-slate-100 hover:border-violet-200 shadow-sm"
              >
                {q.icon} {q.text}
              </button>
            ))}
          </div>
        </div>
      )}

      {messages.map((msg, i) => <ChatMessage key={i} message={msg} onCopy={handleCopy} />)}

      {loading && (
        <div className="flex gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="w-8 h-8 bg-gradient-to-br from-violet-600 to-purple-700 rounded-xl flex items-center justify-center shrink-0 mt-1">
            <Bot size={16} className="text-white" />
          </div>
          <div className="bg-white p-4 rounded-2xl rounded-bl-md shadow-sm border border-slate-100">
            <div className="flex items-center gap-3">
              <Loader2 size={16} className="animate-spin text-violet-500" />
              <span className="text-sm text-slate-500">Генерирую ответ...</span>
            </div>
          </div>
        </div>
      )}

      <div ref={chatEndRef} />
    </div>

    {/* Инпут */}
    <div className="p-4 border-t border-slate-100 bg-white shrink-0">
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={loading ? 'Генерирую ответ...' : 'Напишите вопрос...'}
          disabled={loading}
          className="flex-1 px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-medium outline-none focus:border-violet-300 focus:bg-white transition-all disabled:opacity-50 placeholder:text-slate-400"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || loading}
          className="w-11 h-11 bg-gradient-to-r from-violet-600 to-purple-700 text-white rounded-xl flex items-center justify-center hover:shadow-lg hover:shadow-violet-200 transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0 active:scale-95"
        >
          {loading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
        </button>
      </div>
      <p className="text-[9px] text-slate-400 text-center mt-2 font-medium">
        <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-[8px] font-bold">Enter</kbd> отправить • 
        <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-[8px] font-bold ml-1">Esc</kbd> закрыть
      </p>
    </div>
  </div>
)}
      {/* ========== СТИЛИ ДЛЯ KATEX ========== */}
      <style>{`
        .katex-wrapper .katex-display {
          overflow-x: auto;
          overflow-y: hidden;
          padding: 8px 0;
          margin: 12px 0;
        }
        .katex-wrapper .katex-display > .katex {
          white-space: nowrap;
          text-align: center;
        }
        .katex-wrapper .katex {
          font-size: 1.1em;
        }
        .katex-wrapper .katex-html {
          display: inline-block;
        }
        .katex-wrapper pre {
          white-space: pre-wrap;
          word-wrap: break-word;
        }
        
        /* Исправление для двойных долларов */
        .katex-wrapper .katex-display {
          display: block;
          text-align: center;
        }
        .katex-wrapper .katex-display > .katex {
          display: inline-block;
          white-space: nowrap;
          max-width: 100%;
          overflow-x: auto;
        }
      `}</style>
    </>
  );
};

export default TheoryAIChat;