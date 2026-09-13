// components/TheoryAIChat.jsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import axios from 'axios';
import 'katex/dist/katex.min.css';
import { API_URL } from '../shared/config';
import { ENDPOINTS } from '../shared/api/endpoints';
import MarkdownWithGeoGebra from '../shared/ui/MarkdownWithGeoGebra';
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
            : 'bg-zinc-900 dark:bg-white'
        }`}>
          {isError ? (
            <AlertCircle size={16} className="text-red-500" />
          ) : (
            <Bot size={16} className="text-white dark:text-zinc-950" />
          )}
        </div>
      )}

      <div className={`group relative max-w-[85%] ${
        isUser
          ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 p-3 rounded-2xl rounded-br-md [&_*]:text-inherit'
          : isError
            ? 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border border-red-100 dark:border-red-500/20 p-3 rounded-2xl rounded-bl-md'
            : 'bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200 p-3 rounded-2xl rounded-bl-md border border-zinc-100 dark:border-zinc-800'
      }`}>
        <div className={`text-sm leading-relaxed ${!isExpanded && isLongMessage ? 'max-h-32 overflow-hidden relative' : ''}`}>
          <div className="katex-wrapper">
            <MarkdownWithGeoGebra>{message.content}</MarkdownWithGeoGebra>
          </div>

          {!isExpanded && isLongMessage && (
            <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-zinc-100 dark:from-zinc-800 to-transparent pointer-events-none" />
          )}
        </div>

        {isLongMessage && (
          <>
            {!isExpanded && (
              <button 
                onClick={() => setIsExpanded(true)}
                className="mt-2 text-xs text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 font-medium flex items-center gap-1"
              >
                <ChevronDown size={14} /> Показать полностью
              </button>
            )}
            {isExpanded && (
              <button 
                onClick={() => setIsExpanded(false)}
                className="mt-2 text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 font-medium flex items-center gap-1"
              >
                <ChevronUp size={14} /> Свернуть
              </button>
            )}
          </>
        )}

        {message.timestamp && (
          <p className={`text-[9px] mt-2 opacity-50 ${isUser ? 'text-right text-white/70' : 'text-left text-zinc-400'}`}>
            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        )}

        {!isUser && !isError && (
          <button
            onClick={handleCopy}
            className="absolute -bottom-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 bg-white dark:bg-zinc-900 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800"
            title="Копировать"
          >
            {copied ? (
              <CheckCircle2 size={12} className="text-zinc-900 dark:text-zinc-100" />
            ) : (
              <Copy size={12} className="text-zinc-400" />
            )}
          </button>
        )}
      </div>

      {isUser && (
        <div className="w-8 h-8 bg-zinc-100 dark:bg-zinc-800 rounded-xl flex items-center justify-center shrink-0 mt-1">
          <User size={16} className="text-zinc-500 dark:text-zinc-400" />
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
      const session = JSON.parse(localStorage.getItem('edu_session') || '{}');
      const token = session?.token || session?.access_token;
      const res = await axios.post(
        `${API_URL}${ENDPOINTS.STUDENT_THEORY_ASK_AI}`,
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
        content: errorMsg,
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
    'Объясни проще',
    'Приведи пример',
    'Как это запомнить?',
    'Покажи пошагово',
    'Где это применяется?',
    'Основная формула',
  ];

  return (
    <>
      {/* ========== КНОПКА ОТКРЫТИЯ ========== */}
      {!isOpen && (
        <button
          onClick={toggleChat}
          className={`fixed bottom-6 right-6 z-40 group ${className}`}
          title="Спросить AI о теории"
        >
          <div className="relative w-12 h-12 md:w-14 md:h-14 bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 rounded-full shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-all border border-zinc-800 dark:border-zinc-200">
            <MessageSquare size={22} />
          </div>
        </button>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-40">
          <button
            type="button"
            className="absolute inset-0 bg-black/30 dark:bg-black/50"
            aria-label="Закрыть помощника"
            onClick={toggleChat}
          />
          <div
            ref={panelRef}
            className="absolute top-16 right-0 bottom-0 bg-white dark:bg-[#09090b] border-l border-zinc-200 dark:border-zinc-800 flex flex-col shadow-sm max-w-full"
            style={{ width: `${panelWidth}px` }}
          >
    {/* Ручка ресайза */}
    <div
      ref={resizeHandleRef}
      className="absolute top-0 -left-2 w-2 bottom-0 cursor-col-resize group z-10"
      onMouseDown={handleResizeStart}
    >
      <div className="absolute inset-y-0 left-1/2 w-0.5 bg-zinc-200/0 group-hover:bg-zinc-300 dark:group-hover:bg-zinc-600 transition-colors" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
        <GripHorizontal size={16} className="text-zinc-400 rotate-90" />
      </div>
    </div>

    {/* Заголовок */}
    <div className="flex items-center justify-between p-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/40 shrink-0">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-zinc-900 dark:bg-white rounded-xl flex items-center justify-center">
          <Bot size={20} className="text-white dark:text-zinc-950" />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">AI-помощник</h4>
          {(topic || section) && (
            <p className="text-xs text-zinc-500 font-medium truncate max-w-[180px]">
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
                  `${m.role === 'user' ? 'Вы' : 'AI'} [${new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}]:\n${m.content}`
                ).join('\n\n---\n\n');
                handleCopy(text);
              }}
              className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
              title="Копировать весь чат"
            >
              {copiedId ? <CheckCircle2 size={16} className="text-zinc-900 dark:text-zinc-100" /> : <Copy size={16} className="text-zinc-400" />}
            </button>
            <button onClick={handleClearChat} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors" title="Очистить чат">
              <Trash2 size={16} className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200" />
            </button>
          </>
        )}
        <button onClick={toggleChat} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors" title="Закрыть">
          <XCircle size={18} className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200" />
        </button>
      </div>
    </div>

    {/* Сообщения */}
    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-zinc-50/50 dark:bg-zinc-950/20">
      {messages.length === 0 && (
        <div className="text-center py-8 space-y-4">
          <div className="w-12 h-12 bg-zinc-100 dark:bg-zinc-800 rounded-2xl flex items-center justify-center mx-auto">
            <Sparkles size={22} className="text-zinc-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Задайте вопрос</p>
            <p className="text-xs text-zinc-500 mt-1">Я помогу разобраться в теории</p>
          </div>
          <div className="flex flex-wrap gap-2 justify-center">
            {quickQuestions.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => { setInput(q); setTimeout(() => inputRef.current?.focus(), 100); }}
                className="text-xs bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 px-3 py-1.5 rounded-xl font-medium border border-zinc-100 dark:border-zinc-800 shadow-sm"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {messages.map((msg, i) => <ChatMessage key={i} message={msg} onCopy={handleCopy} />)}

      {loading && (
        <div className="flex gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="w-8 h-8 bg-zinc-900 dark:bg-white rounded-xl flex items-center justify-center shrink-0 mt-1">
            <Bot size={16} className="text-white dark:text-zinc-950" />
          </div>
          <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl rounded-bl-md shadow-sm border border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center gap-3">
              <Loader2 size={16} className="animate-spin text-zinc-400" />
              <span className="text-sm text-zinc-500">Генерирую ответ...</span>
            </div>
          </div>
        </div>
      )}

      <div ref={chatEndRef} />
    </div>

    {/* Инпут */}
    <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 bg-white dark:bg-[#09090b] shrink-0">
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={loading ? 'Генерирую ответ...' : 'Напишите вопрос...'}
          disabled={loading}
          className="flex-1 px-4 py-3 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-medium outline-none focus:border-zinc-400 dark:focus:border-zinc-600 focus:bg-white dark:focus:bg-zinc-900 transition-all disabled:opacity-50 placeholder:text-zinc-400 text-zinc-900 dark:text-zinc-100"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || loading}
          className="w-11 h-11 bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 rounded-xl flex items-center justify-center hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0 active:scale-95"
        >
          {loading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
        </button>
      </div>
      <p className="text-[11px] text-zinc-400 text-center mt-2 font-medium">
        <kbd className="px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded text-[10px] font-medium">Enter</kbd> отправить •
        <kbd className="px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded text-[10px] font-medium ml-1">Esc</kbd> закрыть
      </p>
    </div>
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