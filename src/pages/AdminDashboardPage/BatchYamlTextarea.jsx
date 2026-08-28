import React, { useRef, useState } from 'react';
import { Upload, Loader2 } from 'lucide-react';
import { uploadImage } from './api';

// Проверка: находится ли позиция pos внутри двойных кавычек YAML-скаляра (с учётом экранирования \" и \\)
function isInsideDoubleQuoted(text, pos) {
  let inString = false;
  let escaped = false;
  for (let i = 0; i < pos; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
    } else if (ch === '"') {
      inString = true;
    }
  }
  return inString;
}

// Экранирование содержимого YAML-строки в двойных кавычках (без внешних кавычек)
function escapeYaml(str) {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n')
    .replace(/\t/g, '\\t');
}

export default function BatchYamlTextarea({ value, onChange, placeholder, className = '', rows = 6 }) {
  const textareaRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);

  // Применяет вставку text в диапазон [s, e) и ставит курсор после вставки
  const applyInsertion = (text, s, e) => {
    const newValue = value.substring(0, s) + text + value.substring(e);
    onChange(newValue);
    setTimeout(() => {
      textareaRef.current.focus();
      const pos = s + text.length;
      textareaRef.current.setSelectionRange(pos, pos);
    }, 0);
  };

  // Вставляет markdown-ссылку на картинку в позицию курсора (без лишних кавычек)
  const insertMarkdownAsYaml = (markdown) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      onChange(value + markdown);
      return;
    }
    const start = textarea.selectionStart ?? value.length;
    const end = textarea.selectionEnd ?? value.length;

    // Курсор внутри двойных кавычек — вставляем экранированное содержимое (без новых кавычек)
    if (isInsideDoubleQuoted(value, start)) {
      applyInsertion(escapeYaml(markdown), start, end);
      return;
    }

    // Разбираем текущую строку
    const lineStart = value.lastIndexOf('\n', start - 1) + 1;
    const nextNl = value.indexOf('\n', start);
    const lineEnd = nextNl === -1 ? value.length : nextNl;
    const beforeCursor = value.slice(lineStart, start);
    const afterCursor = value.slice(start, lineEnd);
    const colonIdx = beforeCursor.indexOf(':');
    // Колонка, с которой начинается ключ (с учётом "- " маркера списка)
    let keyStart = 0;
    while (keyStart < beforeCursor.length && /\s/.test(beforeCursor[keyStart])) keyStart++;
    if (beforeCursor[keyStart] === '-') {
      keyStart++;
      if (beforeCursor[keyStart] === ' ') keyStart++;
    }
    // Отступ содержимого блочного скаляра = колонка ключа + 2 (строго больше колонки ключа)
    const contentIndent = ' '.repeat(keyStart + 2);

    // Уже открыт блочный скаляр "content: |" — картинку кладём на следующую строку
    if (colonIdx !== -1) {
      const valueAfterColon = beforeCursor.slice(colonIdx + 1);
      if (/^\s*[|>][+-]?\s*$/.test(valueAfterColon)) {
        applyInsertion('\n' + contentIndent + markdown, start, end);
        return;
      }
      // Значение пустое (картинка была бы первой в plain-скаляре) — переводим строку в блочный скаляр
      if (valueAfterColon.trim() === '' && afterCursor.trim() === '') {
        const keyPart = beforeCursor.slice(0, colonIdx).replace(/\s+$/, '');
        const replacement = keyPart + ': |\n' + contentIndent + markdown;
        const newValue = value.substring(0, lineStart) + replacement + value.substring(lineEnd);
        onChange(newValue);
        setTimeout(() => {
          textarea.focus();
          const pos = lineStart + replacement.length;
          textarea.setSelectionRange(pos, pos);
        }, 0);
        return;
      }
    }

    // По умолчанию — вставляем markdown без кавычек (валидно, т.к. перед картинкой уже есть текст)
    applyInsertion(markdown, start, end);
  };

  const handleUpload = async (file) => {
    setIsUploading(true);
    setUploadProgress(0);
    try {
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      setUploadProgress(60);
      const imageUrl = await uploadImage(base64);
      setUploadProgress(100);
      const markdown = `![${file.name || 'image'}](${imageUrl})`;
      insertMarkdownAsYaml(markdown);
    } catch (error) {
      console.error('Upload error:', error);
      insertMarkdownAsYaml('❌ Ошибка загрузки изображения');
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadProgress(null), 500);
    }
  };

  const handlePaste = async (e) => {
    const items = e.clipboardData?.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        e.preventDefault();
        const file = items[i].getAsFile();
        if (file) await handleUpload(file);
        break;
      }
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) await handleUpload(file);
    e.target.value = '';
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) await handleUpload(file);
  };

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onPaste={handlePaste}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        placeholder={placeholder}
        className={className}
        rows={rows}
        spellCheck={false}
      />
      <div className="absolute bottom-2 right-2 flex gap-1">
        <label className="cursor-pointer bg-slate-100 hover:bg-slate-200 rounded-lg p-1.5 transition-colors">
          <Upload size={14} className="text-slate-500" />
          <input type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
        </label>
      </div>
      <div className="absolute bottom-2 left-2 text-[10px] text-slate-400 bg-white/80 px-2 py-0.5 rounded-md pointer-events-none">
        📋 Ctrl+V / 🖱️ Drag &amp; Drop
      </div>
      {isUploading && (
        <div className="absolute top-2 right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-md animate-pulse flex items-center gap-1">
          <Loader2 size={12} className="animate-spin" />
          {uploadProgress ? `${uploadProgress}%` : 'Загрузка...'}
        </div>
      )}
    </div>
  );
}
