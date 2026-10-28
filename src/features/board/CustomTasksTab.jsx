import { useRef, useState } from 'react';
import { Loader2, Upload } from 'lucide-react';
import { uploadTeacherBoardImage } from './api';
import { boardImageSrc } from './images';
import { CUSTOM_TASK_EXAMPLE, parseCustomTasks } from './customTasks';

function isInsideDoubleQuoted(text, pos) {
  let inString = false;
  let escaped = false;
  for (let i = 0; i < pos; i += 1) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
    } else if (ch === '"') inString = true;
  }
  return inString;
}

function escapeYaml(str) {
  return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\r/g, '\\r').replace(/\n/g, '\\n').replace(/\t/g, '\\t');
}

export default function CustomTasksTab({ hidden, onPlace }) {
  const textareaRef = useRef(null);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);

  const applyInsertion = (base, chunk, start, end) => {
    const next = base.slice(0, start) + chunk + base.slice(end);
    setText(next);
    setError('');
    window.setTimeout(() => {
      const node = textareaRef.current;
      if (!node) return;
      node.focus();
      const pos = start + chunk.length;
      node.setSelectionRange(pos, pos);
    }, 0);
  };

  const insertMarkdown = (markdown) => {
    const textarea = textareaRef.current;
    const value = textarea?.value ?? text;
    const start = textarea?.selectionStart ?? value.length;
    const end = textarea?.selectionEnd ?? value.length;
    if (!textarea) {
      setText(value + markdown);
      return;
    }
    if (isInsideDoubleQuoted(value, start)) {
      applyInsertion(value, escapeYaml(markdown), start, end);
      return;
    }
    const lineStart = value.lastIndexOf('\n', start - 1) + 1;
    const nextNl = value.indexOf('\n', start);
    const lineEnd = nextNl === -1 ? value.length : nextNl;
    const beforeCursor = value.slice(lineStart, start);
    const afterCursor = value.slice(start, lineEnd);
    const colonIdx = beforeCursor.indexOf(':');
    let keyStart = 0;
    while (keyStart < beforeCursor.length && /\s/.test(beforeCursor[keyStart])) keyStart += 1;
    if (beforeCursor[keyStart] === '-') {
      keyStart += 1;
      if (beforeCursor[keyStart] === ' ') keyStart += 1;
    }
    const contentIndent = ' '.repeat(keyStart + 2);
    if (colonIdx !== -1) {
      const valueAfterColon = beforeCursor.slice(colonIdx + 1);
      if (/^\s*[|>][+-]?\s*$/.test(valueAfterColon)) {
        applyInsertion(value, `\n${contentIndent}${markdown}`, start, end);
        return;
      }
      if (valueAfterColon.trim() === '' && afterCursor.trim() === '') {
        const keyPart = beforeCursor.slice(0, colonIdx).replace(/\s+$/, '');
        const replacement = `${keyPart}: |\n${contentIndent}${markdown}`;
        const next = value.slice(0, lineStart) + replacement + value.slice(lineEnd);
        setText(next);
        setError('');
        window.setTimeout(() => {
          textarea.focus();
          const pos = lineStart + replacement.length;
          textarea.setSelectionRange(pos, pos);
        }, 0);
        return;
      }
    }
    applyInsertion(value, markdown, start, end);
  };

  const uploadFile = async (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    setUploading(true);
    try {
      const uploaded = await uploadTeacherBoardImage(file);
      const url = boardImageSrc(uploaded.fileId
        ? { fileId: uploaded.fileId }
        : { src: uploaded.src, name: uploaded.name || file.name });
      insertMarkdown(`![${file.name || 'image'}](${url})`);
    } catch {
      setError('Не удалось загрузить изображение');
    } finally {
      setUploading(false);
    }
  };

  const onPaste = async (event) => {
    const items = event.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i += 1) {
      if (items[i].type.startsWith('image/')) {
        event.preventDefault();
        const file = items[i].getAsFile();
        if (file) await uploadFile(file);
        break;
      }
    }
  };

  const place = () => {
    try {
      const tasks = parseCustomTasks(text);
      onPlace?.(
        tasks.map((task, index) => ({ task, number: index + 1 })),
        { title: 'Своё' },
      );
      setError('');
    } catch (err) {
      setError(err.message || 'Некорректный YAML');
    }
  };

  return (
    <div className={hidden ? 'hidden' : 'flex min-h-0 flex-1 flex-col'}>
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <p className="mb-2 text-xs leading-relaxed text-zinc-500">
          Список заданий в YAML, как в пакетном окне админки. На сервер заданий не пишется: карточки встают на эту доску.
          Картинку можно вставить через Ctrl+V или перетащить в текст.
        </p>
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(event) => { setText(event.target.value); setError(''); }}
            onPaste={onPaste}
            onDrop={(event) => {
              event.preventDefault();
              const file = event.dataTransfer.files?.[0];
              if (file) uploadFile(file);
            }}
            onDragOver={(event) => event.preventDefault()}
            spellCheck={false}
            placeholder={'Каждое задание начинается с «-»'}
            className="h-64 w-full resize-y rounded-xl border border-zinc-200 bg-white p-3 font-mono text-xs leading-relaxed outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950"
          />
          <label className="absolute bottom-2 right-2 cursor-pointer rounded-lg border border-zinc-200 bg-zinc-100 p-1.5 text-zinc-500 hover:bg-zinc-200 dark:border-zinc-800 dark:bg-zinc-900">
            <Upload size={14} />
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) uploadFile(file);
                event.target.value = '';
              }}
            />
          </label>
          {uploading && (
            <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-lg bg-zinc-900 px-2 py-1 text-[11px] font-medium text-white dark:bg-white dark:text-zinc-950">
              <Loader2 size={12} className="animate-spin" />
              Загрузка
            </span>
          )}
        </div>
        {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}
        <button
          type="button"
          onClick={() => { setText(CUSTOM_TASK_EXAMPLE); setError(''); }}
          className="mt-2 text-xs font-medium text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
        >
          Вставить пример
        </button>
      </div>
      <div className="border-t border-zinc-200 p-3 dark:border-zinc-800">
        <button
          type="button"
          disabled={uploading || !text.trim()}
          onClick={place}
          className="h-9 w-full rounded-xl bg-zinc-900 text-sm font-semibold text-white disabled:opacity-40 dark:bg-white dark:text-zinc-950"
        >
          На доску
        </button>
      </div>
    </div>
  );
}
