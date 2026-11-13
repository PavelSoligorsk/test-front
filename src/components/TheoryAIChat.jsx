// components/TheoryAIChat.jsx
import { useState, useRef, useEffect } from 'react';
import apiClient from '../shared/api';
import 'katex/dist/katex.min.css';
import { ENDPOINTS } from '../shared/api/endpoints';
import MarkdownWithGeoGebra from '../shared/ui/MarkdownWithGeoGebra';
import AiReply from '../shared/ui/AiReply';
import {
  Send,
  Loader2,
  Trash2,
  Copy,
  ChevronDown,
  ChevronUp,
  Check,
  MessageSquare,
} from 'lucide-react';
import { useConfirm } from '../shared/ui';


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
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[92%] rounded-xl px-3.5 py-3 text-sm leading-relaxed ${
        isUser
          ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 [&_*]:text-inherit'
          : isError
            ? 'border border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300'
            : 'border border-zinc-200 bg-zinc-50 text-zinc-800 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-200'
      }`}>
        <div className={isLongMessage && !isExpanded ? 'max-h-36 overflow-hidden' : ''}>
          <div className="katex-wrapper">
            {isUser || isError ? (
              <MarkdownWithGeoGebra>{message.content}</MarkdownWithGeoGebra>
            ) : (
              <AiReply text={message.content} framed={false} disclaimer={false} />
            )}
          </div>
        </div>

        <div className="mt-2 flex items-center gap-3">
          {isLongMessage ? (
            <button
              type="button"
              onClick={() => setIsExpanded((value) => !value)}
              className={`inline-flex items-center gap-1 text-xs font-medium ${isUser ? 'text-white/70' : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'}`}
            >
              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              {isExpanded ? 'Свернуть' : 'Показать полностью'}
            </button>
          ) : <span />}
          {message.timestamp ? (
            <span className={`ml-auto text-xs tabular-nums ${isUser ? 'text-white/60' : 'text-zinc-400'}`}>
              {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          ) : null}
          {!isUser && !isError ? (
            <button
              type="button"
              onClick={handleCopy}
              className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
              title="Копировать"
              aria-label="Копировать ответ"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
            </button>
          ) : null}
        </div>
      </div>
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
  const confirm = useConfirm();
  // Состояния
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  const chatEndRef = useRef(null);
  const inputRef = useRef(null);

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

    try {
      const res = await apiClient.post(ENDPOINTS.STUDENT_THEORY_ASK_AI,
        {
          theory_id: theoryId || null,
          theory_content: theoryId ? null : theoryContent,
          question: q
        }
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

  const handleClearChat = async () => {
    if (messages.length > 0 && (await confirm('Очистить историю чата?', { danger: true, confirmLabel: 'Очистить' }))) {
      setMessages([]);
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

  const launcherClass = `flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-900 shadow-sm hover:bg-zinc-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:border-zinc-800 dark:bg-[#09090b] dark:text-zinc-100 dark:hover:bg-zinc-900 dark:focus-visible:ring-white ${className}`;

  return (
    <>
      {!isOpen && (
        <button
          type="button"
          onClick={toggleChat}
          className={launcherClass}
          title="Спросить по этому материалу"
          aria-label="Спросить по этому материалу"
        >
          <MessageSquare size={18} strokeWidth={2} />
        </button>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-stretch sm:justify-end sm:p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Закрыть помощника"
            onClick={toggleChat}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="theory-ai-title"
            className="relative flex h-[min(40rem,100dvh)] w-full max-w-md flex-col overflow-hidden rounded-t-3xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800/60 dark:bg-[#09090b] sm:h-full sm:rounded-xl"
          >
            <div className="flex items-start justify-between gap-4 border-b border-zinc-100 px-5 py-4 dark:border-zinc-800/60">
              <div className="min-w-0">
                <h4 id="theory-ai-title" className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                  Помощник
                </h4>
                <p className="mt-1 truncate text-sm text-zinc-500">
                  {topic && section ? `${topic} · ${section}` : topic || section || 'Вопрос по этому материалу'}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {messages.length > 0 ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        const text = messages.map((m) =>
                          `${m.role === 'user' ? 'Вы' : 'Помощник'}:\n${m.content}`
                        ).join('\n\n');
                        handleCopy(text);
                      }}
                      className="rounded-xl p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-800 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                      title="Копировать весь разговор"
                      aria-label="Копировать весь разговор"
                    >
                      {copiedId ? <Check size={16} /> : <Copy size={16} />}
                    </button>
                    <button
                      type="button"
                      onClick={handleClearChat}
                      className="rounded-xl p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-800 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                      title="Очистить"
                      aria-label="Очистить разговор"
                    >
                      <Trash2 size={16} />
                    </button>
                  </>
                ) : null}
                <button
                  type="button"
                  onClick={toggleChat}
                  className="rounded-xl px-3 py-2 text-sm font-medium text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                >
                  Закрыть
                </button>
              </div>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto px-5 py-5">
              {messages.length === 0 ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Спросите по этому материалу</p>
                    <p className="mt-1 text-sm text-zinc-500">Ответ строится по открытой теории. Формулы можно перепроверить.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {quickQuestions.map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => { setInput(q); setTimeout(() => inputRef.current?.focus(), 100); }}
                        className="rounded-xl border border-zinc-200 px-3 py-2.5 text-left text-sm text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {messages.map((msg, i) => <ChatMessage key={i} message={msg} onCopy={handleCopy} />)}

              {loading ? (
                <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-3 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/60">
                  <Loader2 size={16} className="animate-spin" />
                  Собираю ответ
                </div>
              ) : null}

              <div ref={chatEndRef} />
            </div>

            <div className="border-t border-zinc-100 px-5 py-4 dark:border-zinc-800/60">
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={loading ? 'Собираю ответ...' : 'Вопрос по материалу'}
                  disabled={loading}
                  className="w-full flex-1 rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm font-medium text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-zinc-300 focus:ring-2 focus:ring-zinc-900/10 disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-100 dark:focus:border-zinc-700 dark:focus:ring-white/10"
                />
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={!input.trim() || loading}
                  aria-label="Отправить"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 disabled:opacity-40 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TheoryAIChat;