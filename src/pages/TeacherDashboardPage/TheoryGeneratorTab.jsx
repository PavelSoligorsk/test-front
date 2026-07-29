import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  BookOpen, Eye, Edit3, Sparkles, FileText, Copy, Check,
  ListTree, Maximize2, Printer, Download, FileDown,
  Moon, Sun, Layout, Grid, PanelLeft, PanelRight,
  Type, Bold, Italic, Strikethrough, Heading1, Heading2
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

// ── Mermaid renderer через CDN (БЕЗ УСТАНОВКИ) ──
function MermaidBlock({ chart }) {
  const [svg, setSvg] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const mermaidRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    const renderWithLib = (mermaid) => {
      if (cancelled) return;
      mermaid.initialize({ 
        startOnLoad: false, 
        theme: 'base',
        themeVariables: {
          background: '#ffffff',
          primaryColor: '#7c3aed',
          primaryTextColor: '#1e293b',
          primaryBorderColor: '#7c3aed',
          lineColor: '#94a3b8',
          secondaryColor: '#f1f5f9',
          tertiaryColor: '#f8fafc',
          fontFamily: 'Arial, sans-serif',
          fontSize: '12px',
        },
        securityLevel: 'loose'
      });
      
      const id = `mermaid-${Math.random().toString(36).slice(2, 9)}`;
      mermaid.render(id, chart)
        .then(({ svg: rendered }) => { 
          if (!cancelled) {
            const cleanSvg = rendered
              .replace(/<style>.*?<\/style>/s, '')
              .replace(/data-processed="true"/g, '')
              .replace(/<defs>.*?<\/defs>/s, '');
            setSvg(cleanSvg);
            setLoading(false);
          }
        })
        .catch((e) => { 
          if (!cancelled) {
            setError(e.message || 'Ошибка рендеринга Mermaid');
            setLoading(false);
          }
        });
    };

    if (mermaidRef.current) {
      renderWithLib(mermaidRef.current);
      return () => { cancelled = true; };
    }

    // Загрузка с CDN
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js';
    script.onload = () => {
      mermaidRef.current = window.mermaid;
      if (!cancelled) renderWithLib(window.mermaid);
    };
    script.onerror = () => {
      if (!cancelled) {
        setError('Не удалось загрузить Mermaid с CDN');
        setLoading(false);
      }
    };
    document.head.appendChild(script);
    
    return () => {
      cancelled = true;
      if (script.parentNode) script.parentNode.removeChild(script);
    };
  }, [chart]);

  if (error) {
    return (
      <div className="my-4 p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-xs font-medium text-red-600">⚠️ {error}</p>
        <pre className="mt-2 text-xs text-red-500 bg-red-100/50 p-2 rounded overflow-x-auto">
          {chart.slice(0, 300)}
        </pre>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="my-4 p-8 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-400">Загрузка диаграммы...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="my-6 p-4 bg-white rounded-lg border border-slate-200 overflow-x-auto">
      <div 
        className="flex justify-center"
        dangerouslySetInnerHTML={{ __html: svg }} 
      />
    </div>
  );
}

// ── Table of Contents ──
function TableOfContents({ md }) {
  const headings = useMemo(() => {
    const re = /^(#{1,6})\s+(.+)$/gm;
    const items = [];
    let m;
    while ((m = re.exec(md)) !== null) {
      const level = m[1].length;
      const text = m[2].replace(/[`*_~\[\]()]/g, '').trim();
      const id = text.toLowerCase()
        .replace(/[^a-zа-яё0-9\s-]/g, '')
        .replace(/\s+/g, '-');
      items.push({ level, text, id });
    }
    return items;
  }, [md]);

  if (headings.length === 0) return null;

  return (
    <div className="mb-8 p-4 bg-slate-50 rounded-lg border border-slate-200 print:bg-white print:border print:border-slate-300">
      <div className="flex items-center gap-2 mb-3">
        <ListTree size={16} className="text-purple-500" />
        <span className="text-xs font-bold uppercase text-purple-600 tracking-wider">
          Содержание
        </span>
        <span className="text-[10px] text-slate-400 ml-auto">
          {headings.length} разделов
        </span>
      </div>
      <nav className="space-y-0.5">
        {headings.map((h, i) => (
          <a
            key={i}
            href={`#${h.id}`}
            className="block text-xs text-slate-600 hover:text-purple-600 transition-colors py-0.5"
            style={{ paddingLeft: `${(h.level - 1) * 16 + 4}px` }}
          >
            <span className="text-[10px] text-slate-400 mr-2">#{i + 1}</span>
            {h.text}
          </a>
        ))}
      </nav>
    </div>
  );
}

// ── Custom components ──
const CUSTOM_COMPONENTS = {
  quiz: ({ question, options, answer, explanation }) => {
    const opts = (options || '').split(';').map(o => o.trim()).filter(Boolean);
    
    return (
      <div className="my-6 p-6 bg-emerald-50 rounded-lg border border-emerald-200 print:border-2">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
            Q
          </div>
          <span className="text-xs font-bold uppercase text-emerald-600 tracking-wider">
            Проверь себя
          </span>
        </div>
        <p className="text-sm font-bold text-slate-800 mb-4">{question}</p>
        <div className="space-y-2">
          {opts.map((opt, i) => {
            const isCorrect = opt === answer;
            const letter = String.fromCharCode(65 + i);
            
            return (
              <div 
                key={i}
                className={`px-4 py-2 rounded-lg border text-sm ${
                  isCorrect 
                    ? 'bg-emerald-100 border-emerald-400 text-emerald-700' 
                    : 'bg-white border-slate-200 text-slate-700'
                }`}
              >
                <span className="font-mono text-xs text-slate-400 mr-2">{letter}.</span>
                {opt}
                {isCorrect && (
                  <span className="ml-2 text-emerald-500">✓</span>
                )}
              </div>
            );
          })}
        </div>
        {explanation && (
          <div className="mt-4 p-3 bg-white rounded-lg border border-slate-200 text-xs text-slate-600">
            <span className="font-bold">Пояснение:</span> {explanation}
          </div>
        )}
        <div className="mt-3 text-xs text-slate-400 border-t border-emerald-200 pt-2">
          ✓ Правильный ответ: {answer}
        </div>
      </div>
    );
  },

  info: ({ title, children }) => (
    <div className="my-4 p-4 bg-blue-50 border-l-4 border-blue-400 rounded-r-lg print:border-2">
      <p className="font-bold text-blue-700 text-xs flex items-center gap-1.5 mb-1">
        <span className="text-base">ℹ️</span> {title || 'Информация'}
      </p>
      <div className="text-sm text-blue-800">{children}</div>
    </div>
  ),
  
  warn: ({ title, children }) => (
    <div className="my-4 p-4 bg-amber-50 border-l-4 border-amber-400 rounded-r-lg print:border-2">
      <p className="font-bold text-amber-700 text-xs flex items-center gap-1.5 mb-1">
        <span className="text-base">⚠️</span> {title || 'Предупреждение'}
      </p>
      <div className="text-sm text-amber-800">{children}</div>
    </div>
  ),
  
  tip: ({ title, children }) => (
    <div className="my-4 p-4 bg-emerald-50 border-l-4 border-emerald-400 rounded-r-lg print:border-2">
      <p className="font-bold text-emerald-700 text-xs flex items-center gap-1.5 mb-1">
        <span className="text-base">💡</span> {title || 'Совет'}
      </p>
      <div className="text-sm text-emerald-800">{children}</div>
    </div>
  ),
};

// ── Markdown components ──
const MARKDOWN_COMPONENTS = {
  code({ node, inline, className, children, ...props }) {
    const lang = className?.replace('language-', '') || '';
    const codeStr = String(children).replace(/\n$/, '');

    if (!inline && lang === 'mermaid') {
      return <MermaidBlock chart={codeStr} />;
    }

    if (!inline) {
      return (
        <div className="my-4 rounded-lg overflow-hidden border border-slate-200 print:border-2">
          <div className="flex items-center justify-between px-4 py-2 bg-slate-800 print:bg-slate-900">
            <span className="text-[10px] font-mono text-slate-400 uppercase print:text-slate-300">
              {lang || 'Код'}
            </span>
          </div>
          <pre className="bg-slate-900 p-4 overflow-x-auto print:bg-black">
            <code className="text-sm text-slate-200 font-mono leading-relaxed print:text-white">
              {codeStr}
            </code>
          </pre>
        </div>
      );
    }

    return (
      <code className="bg-slate-100 text-rose-600 px-1.5 py-0.5 rounded text-sm font-mono print:bg-slate-200" {...props}>
        {children}
      </code>
    );
  },
  
  h1: ({ children, ...props }) => {
    const text = String(children);
    const id = text.toLowerCase().replace(/[^a-zа-яё0-9\s-]/g, '').replace(/\s+/g, '-');
    return (
      <h1 
        id={id} 
        className="text-3xl font-bold text-slate-900 mt-8 mb-4 tracking-tight print:text-2xl print:mt-6" 
        {...props}
      >
        {text}
      </h1>
    );
  },
  
  h2: ({ children, ...props }) => {
    const text = String(children);
    const id = text.toLowerCase().replace(/[^a-zа-яё0-9\s-]/g, '').replace(/\s+/g, '-');
    return (
      <h2 
        id={id} 
        className="text-2xl font-bold text-slate-800 mt-8 mb-3 border-b border-slate-200 pb-2 print:text-xl print:mt-6" 
        {...props}
      >
        {text}
      </h2>
    );
  },
  
  h3: ({ children, ...props }) => {
    const text = String(children);
    const id = text.toLowerCase().replace(/[^a-zа-яё0-9\s-]/g, '').replace(/\s+/g, '-');
    return (
      <h3 
        id={id} 
        className="text-xl font-bold text-slate-800 mt-6 mb-2 print:text-lg print:mt-4" 
        {...props}
      >
        {text}
      </h3>
    );
  },
  
  h4: ({ children, ...props }) => {
    const text = String(children);
    const id = text.toLowerCase().replace(/[^a-zа-яё0-9\s-]/g, '').replace(/\s+/g, '-');
    return (
      <h4 
        id={id} 
        className="text-lg font-bold text-slate-800 mt-4 mb-2 print:text-base print:mt-3" 
        {...props}
      >
        {text}
      </h4>
    );
  },
  
  p: ({ children, ...props }) => (
    <p className="text-sm text-slate-700 leading-relaxed mb-4 print:text-xs print:leading-relaxed" {...props}>
      {children}
    </p>
  ),
  
  ul: ({ children, ...props }) => (
    <ul className="space-y-1 mb-4 list-disc list-inside text-sm text-slate-700 print:space-y-0.5" {...props}>
      {children}
    </ul>
  ),
  
  ol: ({ children, ...props }) => (
    <ol className="space-y-1 mb-4 list-decimal list-inside text-sm text-slate-700 print:space-y-0.5" {...props}>
      {children}
    </ol>
  ),
  
  li: ({ children, ...props }) => (
    <li className="text-sm text-slate-700 leading-relaxed print:text-xs" {...props}>
      {children}
    </li>
  ),
  
  blockquote: ({ children, ...props }) => (
    <blockquote className="my-4 pl-4 border-l-4 border-purple-400 text-slate-600 italic print:border-l-2" {...props}>
      {children}
    </blockquote>
  ),
  
  img: ({ src, alt, ...props }) => (
    <div className="my-6 overflow-hidden rounded-lg bg-slate-100 print:bg-white print:border print:border-slate-200">
      <img
        src={src}
        alt={alt || 'Изображение'}
        className="w-full h-auto object-contain max-h-[500px]"
        loading="lazy"
        {...props}
      />
      {alt && (
        <p className="text-[10px] text-center text-slate-400 py-2 border-t border-slate-200 print:text-[8px]">
          {alt}
        </p>
      )}
    </div>
  ),
  
  table: ({ ...props }) => (
    <div className="overflow-x-auto my-6 rounded-lg border border-slate-200 print:border-2">
      <table className="min-w-full border-collapse" {...props} />
    </div>
  ),
  
  th: ({ children, ...props }) => (
    <th className="bg-slate-50 px-4 py-3 text-left text-xs font-bold uppercase text-slate-600 border-b border-slate-200 print:bg-slate-100" {...props}>
      {children}
    </th>
  ),
  
  td: ({ children, ...props }) => (
    <td className="px-4 py-3 text-sm text-slate-700 border-b border-slate-100 print:text-xs" {...props}>
      {children}
    </td>
  ),
  
  a: ({ href, children, ...props }) => (
    <a 
      href={href} 
      className="text-purple-600 hover:text-purple-800 underline underline-offset-2 transition-colors print:text-purple-800" 
      target="_blank" 
      rel="noopener noreferrer" 
      {...props}
    >
      {children}
    </a>
  ),
  
  hr: () => <hr className="my-8 border-0 border-t-2 border-slate-200 print:my-6" />,
  
  strong: ({ children }) => <strong className="font-bold text-slate-900 print:text-black">{children}</strong>,
  
  em: ({ children }) => <em className="italic text-slate-600 print:text-slate-700">{children}</em>,
  
  del: ({ children }) => <del className="text-slate-400 line-through print:text-slate-500">{children}</del>,
};

// ── Process custom tags ──
function processCustomTags(md) {
  let result = md;

  result = result.replace(
    /<Quiz\s+question="([^"]*)"\s+options="([^"]*)"\s+answer="([^"]*)"(?:\s+explanation="([^"]*)")?\s*\/>/g,
    '<quiz question="$1" options="$2" answer="$3" explanation="$4"></quiz>'
  );

  result = result.replace(
    /:::tip\[([^\]]*)\]\s*\n([\s\S]*?)(?=\n:::|$)/g,
    '<tip title="$1">$2</tip>'
  );
  result = result.replace(
    /:::warn\[([^\]]*)\]\s*\n([\s\S]*?)(?=\n:::|$)/g,
    '<warn title="$1">$2</warn>'
  );
  result = result.replace(
    /:::info\[([^\]]*)\]\s*\n([\s\S]*?)(?=\n:::|$)/g,
    '<info title="$1">$2</info>'
  );

  return result;
}

// ── DEMO CONTENT ──
const DEMO_MD = `# 📐 Математика: Квадратные уравнения

## Определение

**Квадратное уравнение** — это уравнение вида:

$$ax^2 + bx + c = 0, \\quad a \\neq 0$$

где $a$, $b$, $c$ — коэффициенты, $x$ — переменная.

---

## Дискриминант

Формула дискриминанта:

$$D = b^2 - 4ac$$

### Количество корней

| Значение $D$ | Корни |
|:---:|---|
| $D > 0$ | Два различных корня |
| $D = 0$ | Один корень (кратности 2) |
| $D < 0$ | Нет действительных корней |

---

## Формула корней

$$x_{1,2} = \\frac{-b \\pm \\sqrt{D}}{2a}$$

### Пример

Решим уравнение $2x^2 - 4x - 6 = 0$:

1. $a = 2$, $b = -4$, $c = -6$
2. $D = (-4)^2 - 4 \\cdot 2 \\cdot (-6) = 16 + 48 = 64$
3. $\\sqrt{D} = 8$
4. $x_1 = \\frac{4 + 8}{4} = 3$, $x_2 = \\frac{4 - 8}{4} = -1$

> **Ответ:** $x_1 = 3$, $x_2 = -1$

---

## Теорема Виета

Для приведённого квадратного уравнения $x^2 + px + q = 0$:

$$
\\begin{cases}
x_1 + x_2 = -p \\\\
x_1 \\cdot x_2 = q
\\end{cases}
$$

:::tip[Совет]
Теорема Виета позволяет **устно** подбирать корни, не вычисляя дискриминант!
:::

:::warn[Важно]
Теорема Виета работает только когда $a = 1$!
:::

---

## 🐍 Код на Python

\`\`\`python
import math

def solve_quadratic(a, b, c):
    """Возвращает корни квадратного уравнения."""
    if a == 0:
        raise ValueError("a не может быть 0")
    D = b**2 - 4*a*c
    if D < 0:
        return ()
    if D == 0:
        return (-b / (2*a),)
    sqrt_D = math.sqrt(D)
    return (
        (-b - sqrt_D) / (2*a),
        (-b + sqrt_D) / (2*a),
    )

# Пример
print(solve_quadratic(2, -4, -6))  # (-1.0, 3.0)
\`\`\`

---

## Диаграмма алгоритма решения

flowchart TD
    A[Начало] --> B{a = 0?}
    B -->|Да| C[Не квадратное уравнение]
    B -->|Нет| D["D = b² - 4ac"]
    D --> E{"D < 0?"}
    E -->|Да| F[Нет корней]
    E -->|Нет| G{"D = 0?"}
    G -->|Да| H["x = -b / 2a"]
    G -->|Нет| I["x₁,₂ = (-b ± √D) / 2a"]
    C --> Z[Конец]
    F --> Z
    H --> Z
    I --> Z

<Quiz 
  question="Сколько корней у уравнения x² - 5x + 6 = 0?" 
  options="0;1;2;3" 
  answer="2" 
  explanation="Дискриминант D = 25 - 24 = 1 > 0, значит два корня: 2 и 3."
/>

---

## 📋 Итоги

- [x] Определение квадратного уравнения
- [x] Формула дискриминанта
- [x] Формула корней
- [x] Теорема Виета
- [ ] Графическое решение *(в разработке)*
- [ ] Комплексные корни *(в разработке)*
`;

// ── MAIN COMPONENT ──
export default function TheoryGeneratorTab() {
  const [rawMd, setRawMd] = useState(() => {
    return localStorage.getItem('theory_generator_draft') || DEMO_MD;
  });
  const [viewMode, setViewMode] = useState('split');
  const [copied, setCopied] = useState(false);
  const [pdfMode, setPdfMode] = useState(false);
  const previewRef = useRef(null);

  const processedMd = useMemo(() => processCustomTags(rawMd), [rawMd]);

  useEffect(() => {
    const t = setTimeout(() => {
      localStorage.setItem('theory_generator_draft', rawMd);
    }, 500);
    return () => clearTimeout(t);
  }, [rawMd]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(rawMd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    if (confirm('Сбросить редактор? Все изменения будут потеряны.')) {
      setRawMd(DEMO_MD);
    }
  };

  const handleExportPDF = () => {
    setPdfMode(true);
    setTimeout(() => {
      window.print();
      setTimeout(() => setPdfMode(false), 1000);
    }, 300);
  };

  const charCount = rawMd.length;
  const wordCount = useMemo(() => {
    const words = rawMd.match(/[\wа-яё]+/gi);
    return words ? words.length : 0;
  }, [rawMd]);

  return (
    <div className={`animate-in fade-in slide-in-from-bottom-4 duration-500 ${pdfMode ? 'pdf-mode' : ''}`}>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          body { background: white; }
          .pdf-mode .preview-content {
            max-width: 210mm;
            margin: 0 auto;
            padding: 20mm 15mm;
          }
          .pdf-mode .preview-content h1 { font-size: 24pt !important; }
          .pdf-mode .preview-content h2 { font-size: 18pt !important; }
          .pdf-mode .preview-content h3 { font-size: 14pt !important; }
          .pdf-mode .preview-content p { font-size: 10pt !important; }
          .pdf-mode .preview-content code { font-size: 8pt !important; }
          .pdf-mode .preview-content table { font-size: 9pt !important; }
          .pdf-mode .preview-content .quiz-widget {
            break-inside: avoid;
            page-break-inside: avoid;
          }
          .pdf-mode .preview-content .mermaid-diagram {
            break-inside: avoid;
            page-break-inside: avoid;
            max-width: 100%;
          }
          .pdf-mode .preview-content img {
            max-width: 80%;
            page-break-inside: avoid;
          }
        }
        @page {
          size: A4;
          margin: 20mm 15mm;
        }
      `}</style>

      {/* Header */}
      <div className="bg-white dark:bg-slate-800/50 rounded-[2.5rem] p-5 md:p-6 shadow-sm border border-slate-100 dark:border-slate-700 mb-4 no-print">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center">
              <BookOpen size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg md:text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">
                Генератор теории
              </h2>
              <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">
                PDF-оптимизированный редактор
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 flex-wrap">
            <span className="px-2 py-1 bg-slate-100 rounded-lg">
              {charCount.toLocaleString()} симв.
            </span>
            <span className="px-2 py-1 bg-slate-100 rounded-lg">
              {wordCount.toLocaleString()} слов
            </span>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors text-slate-600"
            >
              {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
              {copied ? 'Скопировано' : 'Копировать'}
            </button>
            <button
              onClick={handleReset}
              className="px-3 py-1.5 bg-slate-100 hover:bg-red-50 hover:text-red-500 rounded-xl transition-colors text-slate-500"
            >
              Сброс
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1 mt-4 bg-slate-100 dark:bg-slate-700/50 p-1 rounded-xl w-fit flex-wrap">
          {[
            { id: 'edit', icon: Edit3, label: 'Редактор' },
            { id: 'split', icon: Maximize2, label: 'Раздельный' },
            { id: 'preview', icon: Eye, label: 'Превью' },
          ].map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setViewMode(id)}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${
                viewMode === id
                  ? 'bg-white dark:bg-slate-600 text-purple-600 shadow-sm'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Icon size={12} />
              {label}
            </button>
          ))}
          <div className="w-px h-6 bg-slate-200 mx-1" />
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[10px] font-black uppercase bg-purple-600 text-white hover:bg-purple-700 transition-colors"
          >
            <FileDown size={12} />
            Экспорт PDF
          </button>
        </div>
      </div>

      {/* Editor + Preview */}
      <div className={`grid ${viewMode === 'split' ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'} gap-4`}>
        {(viewMode === 'split' || viewMode === 'edit') && (
          <div className="bg-white dark:bg-slate-800 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden flex flex-col min-h-[70vh] no-print">
            <div className="px-5 py-3 bg-slate-50 dark:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
              <Edit3 size={14} className="text-purple-500" />
              <span className="text-[10px] font-black uppercase text-slate-500">Markdown</span>
              <span className="text-[9px] text-slate-400 ml-auto">Поддержка LaTeX, таблиц, mermaid</span>
            </div>
            <textarea
              value={rawMd}
              onChange={(e) => setRawMd(e.target.value)}
              className="flex-1 w-full p-5 bg-transparent text-sm text-slate-800 dark:text-slate-200 font-mono resize-none outline-none leading-relaxed"
              placeholder="Пишите свой Markdown здесь..."
              spellCheck={false}
            />
          </div>
        )}

        {(viewMode === 'split' || viewMode === 'preview') && (
          <div 
            ref={previewRef}
            className="bg-white dark:bg-slate-800 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden min-h-[70vh]"
          >
            <div className="px-5 py-3 bg-slate-50 dark:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2 no-print">
              <Eye size={14} className="text-purple-500" />
              <span className="text-[10px] font-black uppercase text-slate-500">Превью</span>
              <span className="text-[9px] text-slate-400 ml-auto">Оптимизировано для PDF</span>
            </div>
            <div className="p-5 overflow-y-auto preview-content">
              <TableOfContents md={processedMd} />
              <div className="prose prose-slate max-w-none">
                <ReactMarkdown
                  remarkPlugins={[remarkMath, remarkGfm]}
                  rehypePlugins={[rehypeKatex]}
                  components={{
                    ...MARKDOWN_COMPONENTS,
                    ...CUSTOM_COMPONENTS,
                  }}
                >
                  {processedMd}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 bg-white dark:bg-slate-800/50 rounded-[2.5rem] p-5 md:p-6 shadow-sm border border-slate-100 dark:border-slate-700 no-print">
        <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-3">Поддерживаемые возможности</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
          {[
            { label: 'Заголовки H1–H6', done: true },
            { label: 'Жирный / курсив', done: true },
            { label: 'Списки', done: true },
            { label: 'Таблицы (GFM)', done: true },
            { label: 'LaTeX формулы', done: true },
            { label: 'Блоки кода', done: true },
            { label: 'Mermaid диаграммы', done: true },
            { label: 'Цитаты', done: true },
            { label: 'Ссылки / картинки', done: true },
            { label: 'Авто-TOC', done: true },
            { label: 'Quiz виджеты', done: true },
            { label: 'Callout блоки', done: true },
          ].map(({ label, done }) => (
            <div key={label} className="flex items-center gap-1.5 text-[10px] font-bold">
              <span className={`w-4 h-4 rounded-full flex items-center justify-center ${done ? 'bg-emerald-100 text-emerald-500' : 'bg-slate-100 text-slate-300'}`}>
                {done ? <Check size={10} /> : '·'}
              </span>
              <span className={done ? 'text-slate-600' : 'text-slate-300'}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 text-center text-[10px] text-slate-400 no-print">
        💡 Нажмите <kbd className="px-2 py-0.5 bg-slate-100 rounded border">Ctrl+P</kbd> или <kbd className="px-2 py-0.5 bg-slate-100 rounded border">Cmd+P</kbd> для сохранения в PDF
      </div>
    </div>
  );
}