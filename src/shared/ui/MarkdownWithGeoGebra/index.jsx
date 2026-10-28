import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import 'katex/dist/katex.min.css';
import GeoGebraApplet from '../../geogebra/GeoGebraApplet';
import { materialIdOf, toGeoGebraAppName } from '../../geogebra/params';

/** Апплет для AI hint/solve: одна фигура, команды выполняются после загрузки. */
function GeoGebraFigureApplet({ figure }) {
  const commands = (
    figure.commands?.length
      ? figure.commands
      : String(figure.setup || '').split('\n')
  ).filter((c) => String(c).trim());
  return (
    <div className="my-3 w-full overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
      <GeoGebraApplet
        appName={toGeoGebraAppName(figure.app)}
        commands={commands}
        height={Number(figure.height) || 400}
        toolbar
      />
    </div>
  );
}

/** Старый формат ответа: тег <GeoGebra id setup height /> прямо в тексте. */
function GeoGebraEmbed({ id, setup, height = '400' }) {
  return (
    <div className="my-6 w-full overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40">
      <GeoGebraApplet
        materialId={materialIdOf(id)}
        setup={setup || ''}
        height={Number(height) || 400}
        toolbar
      />
    </div>
  );
}

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